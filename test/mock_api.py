#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""本地假 OpenAI 兼容接口（测试用，不联网、不调真实模型）

启动：python test/mock_api.py           # 127.0.0.1:8765
端点：
  GET  /v1/models            模型列表
  GET  /last                 最近一次请求的元信息（含收到的图片数量）
  POST /v1/chat/completions  作答 / 判卷
"""
import json
import re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

# 最近一次请求（供 e2e 断言用）
LAST = {"images": 0, "model": "", "prompt": ""}

# 按题型作答
TYPE_RULES = [
    (r"判断题", ["对"]),
    (r"多选题", ["A", "C"]),
    (r"单选题", ["A"]),
    (r"简答题", ["1.让用户参与评审。 2.明确评审清单。 3.评审后闭环跟踪。"]),
]

# 按题干关键词兜底
RULES = [
    (r"首都", ["A"]),
    (r"H2O|水的化学式", ["对"]),
    (r"编程语言", ["A", "C"]),
    (r"个月", ["12"]),
    (r"牛顿第一定律|惯性", ["物体在不受外力作用时，保持静止状态或匀速直线运动状态不变"]),
]

BLANK_RE = re.compile(r"共\s*(\d+)\s*空")
STU_RE = re.compile(r"学生答案：(.+)")


def answer_for(text: str) -> list:
    for pat, ans in TYPE_RULES:
        if re.search(pat, text):
            return ans
    if "填空题" in text:
        m = BLANK_RE.search(text)
        n = int(m.group(1)) if m else 1
        base = ["需求获取", "需求分析", "需求规格说明", "需求验证", "需求管理"]
        return [(base[i] if i < len(base) else f"第{i+1}空答案") for i in range(n)]
    for pat, ans in RULES:
        if re.search(pat, text):
            return ans
    return ["A"]


def verify_for(text: str) -> dict:
    """判卷：把学生答案与 answer_for 的结论比对"""
    head = text.split("学生答案：")[0]
    exp = answer_for(head)
    m = STU_RE.search(text)
    stu = (m.group(1) if m else "").strip()
    stu_items = [x.strip() for x in re.split(r"[,，|;；\s]+", stu) if x.strip()]
    ok = len(stu_items) == len(exp) and all(e in stu_items for e in exp)
    return {
        "correct": ok,
        "answer": exp,
        "confidence": 0.92 if ok else 0.85,
        "reason": "与标准答案一致" if ok else "与标准答案不符",
    }


class Handler(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")

    def _json(self, obj, code=200):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self._cors()
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self):
        path = self.path.rstrip("/")
        if path.endswith("/last"):
            self._json(LAST)
        elif path.endswith("/models"):
            self._json({"object": "list", "data": [{"id": "mock-answerer", "object": "model"}]})
        else:
            self._json({"ok": True, "hint": "POST /v1/chat/completions"})

    def do_POST(self):
        n = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(n).decode("utf-8", "ignore")
        try:
            payload = json.loads(raw or "{}")
        except Exception:
            payload = {}

        msgs = payload.get("messages") or []
        user_msg = next((m for m in reversed(msgs) if m.get("role") == "user"), {})
        raw_content = user_msg.get("content", "")

        images = 0
        if isinstance(raw_content, list):
            images = sum(1 for p in raw_content if isinstance(p, dict) and p.get("type") == "image_url")
            text = " ".join(p.get("text", "") for p in raw_content if isinstance(p, dict) and p.get("type") == "text")
        else:
            text = raw_content

        LAST.update({"images": images, "model": payload.get("model", ""), "prompt": text[:400]})

        if images:
            content = json.dumps({"answer": [f"VISION_SEEN_{images}"]}, ensure_ascii=False)
        elif "学生答案：" in text:
            content = json.dumps(verify_for(text), ensure_ascii=False)
        else:
            content = json.dumps({"answer": answer_for(text)}, ensure_ascii=False)

        self._json({
            "id": "chatcmpl-mock",
            "object": "chat.completion",
            "model": payload.get("model", "mock-answerer"),
            "choices": [{"index": 0, "message": {"role": "assistant", "content": content}, "finish_reason": "stop"}],
            "usage": {
                "prompt_tokens": 320,
                "completion_tokens": 18,
                "total_tokens": 338,
                "prompt_cache_hit_tokens": 128,
                "prompt_cache_miss_tokens": 192,
            },
        })

    def log_message(self, fmt, *args):
        print(f"[mock] {self.address_string()} {fmt % args}", flush=True)


if __name__ == "__main__":
    host, port = "127.0.0.1", 8765
    print(f"mock OpenAI API on http://{host}:{port}/v1", flush=True)
    ThreadingHTTPServer((host, port), Handler).serve_forever()
