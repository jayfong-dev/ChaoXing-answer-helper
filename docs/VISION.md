# 图片题支持方案

> 结论：**能支持，而且不需要 OCR 服务**。`deepseek-flash` 原生支持图片输入，
> 把题目区域或题干里的图片随请求发过去即可。每张图最多计 1024 token。

---

## 一、先分清"图片题"的三种情况

| 类型 | 例子 | 取图方式 | 难度 |
|---|---|---|---|
| A. 题干内嵌 `<img>` | 网络图、流程图、电路图 | 直接取 `img.src` → base64 | 低 |
| B. 题干内嵌公式/表格（DOM 渲染） | MathJax 公式、HTML 表格 | **转成文本**（LaTeX / Markdown），不需要图 | 低 |
| C. 整块题目带混排（图 + 文字 + 公式） | PERT 计算题 | 区域**截图** | 中 |

优先级：**B（文本化）> A（原图）> C（截图兜底）**。
B 最省 token 也最准；A 保留原始清晰度；C 兼容一切但依赖元素在视口内。

---

## 二、三种取图方式对比

| 方式 | 优点 | 缺点 | 用在哪 |
|---|---|---|---|
| **① 取 `img.src`** | 原图清晰、无坐标换算 | 需带 cookie 请求（超星图片走登录态）；跨域可能失败 | A 类 |
| **② 区域截图** | 兼容任意渲染（公式/表格/Canvas） | 元素必须在视口内；需处理 `devicePixelRatio`；iframe 坐标复杂 | C 类兜底 |
| **③ 公式/表格文本化** | 零 token、模型理解更准 | 只对结构化内容有效 | B 类 |

---

## 三、推荐架构

```
content.js
  ├─ collect(): 识别题目
  ├─ extractMath(box)   → LaTeX 文本（script[type="math/tex"] / MathML annotation / KaTeX .katex-html）
  ├─ extractTables(box) → Markdown 表格
  ├─ extractImages(box) → [{mime, base64}]（img.src → fetch(credentials:'include') → blob）
  └─ 若仍无图且题型是 essay/fill/unknown：
        scrollIntoView → 让 background 截图 → 裁剪 → [{mime, base64}]
          ↓ chrome.runtime.sendMessage({type:"CROP", rect, dpr})
background.js
  ├─ chrome.tabs.captureVisibleTab(windowId, {format:"png"})
  └─ 返回 dataURL（裁剪在 content 的 canvas 里做，SW 没有 DOM）
          ↓
background.js askLLM(): content 数组
  [ {type:"text", text: prompt},
    {type:"image_url", image_url:{url:"data:image/jpeg;base64,…", detail:"original"}} ]
```

**为什么裁剪放在 content 而不是 background**：Service Worker 没有 DOM/Canvas，`OffscreenCanvas` 虽有但拿不到元素坐标；content 有 `getBoundingClientRect` 和 canvas，天然合适。

---

## 四、关键代码骨架

### 4.1 取题干里的图片（A 类）

```js
async function extractImages(box) {
  const out = [];
  for (const img of box.querySelectorAll("img")) {
    const src = img.currentSrc || img.src;
    if (!src || src.startsWith("data:")) {
      if (src?.startsWith("data:")) out.push(splitDataUrl(src));
      continue;
    }
    try {
      // 带凭据，超星图片需要登录态
      const r = await fetch(src, { credentials: "include" });
      if (!r.ok) continue;
      const blob = await r.blob();
      if (!/^image\//.test(blob.type)) continue;
      if (blob.size > 8 * 1024 * 1024) continue;     // 超过 8MB 跳过
      out.push({ mime: blob.type, base64: await toBase64(blob) });
    } catch (_) { /* 跨域失败 → 交给截图兜底 */ }
  }
  return out.slice(0, 4);   // 每题最多 4 张，控制成本
}
```

### 4.2 区域截图（C 类）

```js
// content.js
async function shootQuestion(box) {
  box.scrollIntoView({ block: "center" });
  await new Promise((r) => setTimeout(r, 260));      // 等滚动完成

  const r = box.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const resp = await chrome.runtime.sendMessage({ type: "CAPTURE" });
  if (!resp?.ok) return null;

  const img = await loadImage(resp.dataUrl);         // 整屏截图
  const canvas = document.createElement("canvas");
  const maxEdge = 1280;
  const scale = Math.min(1, maxEdge / Math.max(r.width * dpr, r.height * dpr));
  canvas.width = Math.round(r.width * dpr * scale);
  canvas.height = Math.round(r.height * dpr * scale);

  const ctx = canvas.getContext("2d");
  ctx.drawImage(
    img,
    r.left * dpr, r.top * dpr, r.width * dpr, r.height * dpr,
    0, 0, canvas.width, canvas.height
  );
  return { mime: "image/jpeg", base64: canvas.toDataURL("image/jpeg", 0.82).split(",")[1] };
}

// background.js
if (msg.type === "CAPTURE") {
  chrome.tabs.captureVisibleTab(msg.windowId ?? null, { format: "png" })
    .then((dataUrl) => sendResponse({ ok: true, dataUrl }))
    .catch((e) => sendResponse({ ok: false, error: String(e) }));
  return true;
}
```

### 4.3 公式与表格文本化（B 类，先做这个）

```js
function extractMath(box) {
  const tex = [];
  // MathJax 2/3 都会把 TeX 源码留在脚本或 annotation 里
  box.querySelectorAll('script[type^="math/tex"]').forEach((s) => tex.push(s.textContent.trim()));
  box.querySelectorAll('annotation[encoding="application/x-tex"]').forEach((a) => tex.push(a.textContent.trim()));
  return tex;
}

function extractTables(box) {
  return [...box.querySelectorAll("table")].map((t) => {
    const rows = [...t.rows].map((row) =>
      [...row.cells].map((c) => c.innerText.replace(/\s+/g, " ").trim()).join(" | ")
    );
    return rows.join("\n");
  });
}
```

### 4.4 请求侧（background）

```js
function buildPrompt(q, cfg) {
  const text =
    `题型：${typeHint}\n题目：${q.stem}` +
    (q.latex?.length ? `\n公式（LaTeX）：${q.latex.join("\n")}` : "") +
    (q.tables?.length ? `\n表格：\n${q.tables.join("\n\n")}` : "") +
    (q.options.length ? `\n选项：\n${opts}` : "") +
    (q.images?.length ? `\n（另附 ${q.images.length} 张题目图片，若含图请结合图形计算，先写出关键数据再作答）` : "");

  const content = [{ type: "text", text }];
  for (const im of q.images || []) {
    content.push({
      type: "image_url",
      image_url: { url: `data:${im.mime};base64,${im.base64}`, detail: cfg.visionDetail || "original" },
    });
  }
  return [{ role: "system", content: SYSTEM }, { role: "user", content }];
}
```

---

## 五、设置项（新增 4 个）

| 键 | 默认 | 说明 |
|---|---|---|
| `visionMode` | `auto` | `off` 不发图 / `auto` 有图或公式才发 / `always` 每题都截图 |
| `visionDetail` | `original` | `low`（512×512，便宜）/ `original`（保真） |
| `maxImageEdge` | 1280 | 截图压缩后的最长边 |
| `maxImagesPerQuestion` | 2 | 每题最多几张，控制成本 |

**模型校验**：开启 vision 但模型不是 `deepseek-flash` 时，设置页给黄字提示
「当前模型不支持图片输入，请切换到 deepseek-flash」。

---

## 六、成本

| 场景 | 估值 |
|---|---|
| 一张图 | ≤ 1024 token（约 1300×1300 后计费，再大也不涨） |
| 30 题全带图 | ≈ 30k 视觉 token ≈ **几分钱** |
| 只对 essay/fill 类开 auto | 通常 5–10 张，几乎可忽略 |

对比：本地跑 OCR/视觉模型要几百 MB 模型 + 数秒/张，接口方案反而更快更省。

---

## 七、已知坑（按踩到概率排序）

1. **元素不在视口内 → 截不到**：先 `scrollIntoView` 并等 250ms；
   高于一屏的题需分段截图（v1 先截可见部分 + 在 prompt 里注明"仅上半部分"）。
2. **`devicePixelRatio`**：Windows 125% 缩放下 rect 与像素差 1.25 倍，忘了乘就会裁错位置。
3. **iframe 内的题**：坐标相对子框架，需要叠加 `frameElement` 的偏移；
   v1 只保证顶层（超星作业页题目基本在顶层），子框架降级为"不发图"。
4. **图片带登录态**：`fetch(..., {credentials:'include'})` 才拿得到；跨域 CDN 可能失败 → 自动降级截图。
5. **`deepseek-v4-pro` 不支持 Vision**：必须提示用户换模型。
6. **图片也属于"发送到模型的内容"**：README 声明里要补一句。

---

## 八、实施顺序（每步可独立验收）

| 步 | 内容 | 验收 |
|---|---|---|
| **V1** | 公式/表格文本化（不涉及图片） | 公式题答案正确率提升，日志显示 `[math] 提取 N 条公式` |
| **V2** | 题干 `<img>` 取原图 → base64 发送 | mock 服务器能收到 `image_url`，日志 `[vision] 附加 1 张图` |
| **V3** | 截图兜底（`captureVisibleTab` + 裁剪） | 无 `<img>` 的图文混排题也能答对 |
| **V4** | 设置项 + 模型不匹配提示 + 声明补充 | 关掉 vision 后请求体不含图片 |

测试计划：fixture 里加一道带本地 PNG 的计算题 + 一道 MathML 公式题，
`mock_api.py` 记录收到的 content 块类型，e2e 断言 `image_url` 出现次数。
