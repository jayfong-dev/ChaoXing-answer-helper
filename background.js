// background.js — service worker：配置管理 + 调用本地 OpenAI 兼容接口
const DEFAULTS = {
  baseUrl: "https://api.deepseek.com/v1", // DeepSeek 官方；本地 Ollama 改成 http://127.0.0.1:11434/v1
  apiKey: "",
  model: "deepseek-flash",                // = DeepSeek-V4.1-Flash-1017；或 deepseek-v4-pro
  jsonMode: true,                         // 让接口直接返回 JSON 对象
  existingMode: "overwrite", // overwrite（默认，忽略原答案重答）| check（先判卷）| skip（跳过）
  minConfidence: 0.7,        // 低于此置信度时，保留原答案不动
  thinking: false,                        // 思考模式（关=快且省；开=更准但更贵）
  reasoningEffort: "high",                // 开启时：low / high / max
  temperature: 0,
  autoFill: true,       // 自动填充
  autoNext: false,      // 自动点"下一题"
  autoSubmit: false,    // 自动交卷（默认关，危险）
  delayMs: 800,         // 每题之间的间隔
  maxQuestions: 200,
  extraPrompt: "",      // 追加人设/约束
  visionMode: "auto",             // off | auto（有图才发）| always
  visionDetail: "original",       // low | original
  maxImagesPerQuestion: 2,        // 每题最多几张（控制成本）
};

// ── 计费（DeepSeek 官方定价，USD / 1M tokens）──
const PRICES = {
  "deepseek-flash": { cacheHit: 0.003, inMiss: 0.15, out: 0.6 },
  "deepseek-v4-pro": { cacheHit: 0.022, inMiss: 0.66, out: 1.98 },
};

// 高峰时段：UTC 01:00–04:00、06:00–10:00，周一至周五；高峰价为标准价 2 倍
function isPeakNow(d = new Date()) {
  const day = d.getUTCDay();            // 0=周日, 6=周六
  if (day === 0 || day === 6) return false;
  const h = d.getUTCHours() + d.getUTCMinutes() / 60;
  return (h >= 1 && h < 4) || (h >= 6 && h < 10);
}

function priceFor(model) {
  const key = Object.keys(PRICES).find((k) => model && model.includes(k)) || "deepseek-flash";
  return { key, ...PRICES[key] };
}

// 用 usage 估算花费（USD）
function costOf(model, usage) {
  if (!usage) return { usd: 0, inTok: 0, outTok: 0, cachedTok: 0 };
  const p = priceFor(model);
  const mult = isPeakNow() ? 2 : 1;
  const cached = Number(usage.prompt_cache_hit_tokens ?? usage.cached_tokens ?? 0);
  const inAll = Number(usage.prompt_tokens ?? 0);
  const inMiss = Math.max(0, inAll - cached);
  const outTok = Number(usage.completion_tokens ?? 0);
  const usd =
    ((cached / 1e6) * p.cacheHit + (inMiss / 1e6) * p.inMiss + (outTok / 1e6) * p.out) * mult;
  return { usd, inTok: inAll, outTok, cachedTok: cached, peak: mult > 1, model: p.key };
}

// 累计统计（按天）
function todayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

async function addUsage(cost, questions = 1) {
  try {
    const { usageStats } = await chrome.storage.local.get({ usageStats: null });
    const day = todayKey();
    const st = usageStats && usageStats.day === day
      ? usageStats
      : { day, questions: 0, inTok: 0, outTok: 0, cachedTok: 0, usd: 0 };
    st.questions += questions;
    st.inTok += cost.inTok || 0;
    st.outTok += cost.outTok || 0;
    st.cachedTok += cost.cachedTok || 0;
    st.usd += cost.usd || 0;
    await chrome.storage.local.set({ usageStats: st });
    return st;
  } catch (_) {
    return null;
  }
}

async function getConfig() {
  const cfg = await chrome.storage.sync.get(DEFAULTS);
  return { ...DEFAULTS, ...cfg };
}

function buildPrompt(q, cfg, images) {
  const typeHint = {
    single: "单选题，只有一个正确答案",
    multiple: "多选题，可能有多个正确答案",
    judge: "判断题，答案只能是 对 或 错",
    fill: "填空题",
    essay: "简答题，给出一段简洁的答案",
    unknown: "类型未知，请自行判断",
  }[q.type] || "类型未知";

  const opts = q.options.map((o, i) => `${o.letter || String.fromCharCode(65 + i)}. ${o.text}`).join("\n");

  const textPart =
    `题型：${typeHint}` +
    (q.type === "fill" && q.blanks ? `，共 ${q.blanks} 空` : "") +
    `\n题目：${q.stem}` +
    (q.latex && q.latex.length ? `\n公式（LaTeX）：${q.latex.join(" ; ")}` : "") +
    (q.tables && q.tables.length ? `\n表格：\n${q.tables.join("\n\n")}` : "") +
    (opts ? `\n选项：\n${opts}` : "") +
    (images && images.length
      ? `\n（本题另附 ${images.length} 张图片，可能含流程图 / 网络图 / 表格。` +
        `请先从图中读出关键数据（节点、工期、依赖关系等），再按题目要求计算。）`
      : "") +
    (q.type === "fill" && q.blanks
      ? `\n请按顺序给出 ${q.blanks} 个空的答案，answer 数组长度必须是 ${q.blanks}。`
      : "");

  const userContent =
    images && images.length
      ? [
          { type: "text", text: textPart },
          ...images.map((im) => ({
            type: "image_url",
            image_url: {
              url: `data:${im.mime};base64,${im.base64}`,
              detail: cfg.visionDetail || "original",
            },
          })),
        ]
      : textPart;

  return [
    {
      role: "system",
      content:
        "你是一个严谨的答题器。只输出 JSON，不要解释、不要 markdown 代码块。\n" +
        'JSON 结构：{"answer":["A"]} 单选/判断给一个；多选给多个；填空/简答给文字本身。\n' +
        "判断题用 对 或 错；选项类用大写字母。不确定时给最可能的答案。" +
        (cfg.extraPrompt ? "\n补充要求：" + cfg.extraPrompt : ""),
    },
    { role: "user", content: userContent },
  ];
}

function parseAnswer(text) {
  if (!text) return null;
  let s = String(text).trim();
  s = s.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      const obj = JSON.parse(s.slice(start, end + 1));
      if (Array.isArray(obj.answer)) return obj.answer.map((x) => String(x).trim());
      if (typeof obj.answer === "string") return [obj.answer.trim()];
    } catch (_) {}
  }
  // 兜底：纯文本里抓 A/B/C/D 或 对/错
  const letters = s.match(/[A-H]/g);
  if (letters && letters.length && s.length <= 12) return [...new Set(letters)];
  if (/对|正确|true/i.test(s)) return ["对"];
  if (/错|错误|false/i.test(s)) return ["错"];
  return [s.slice(0, 300)];
}

// 取题干图片 → base64（在 Service Worker 里做：有 host_permissions，可跨域并带 cookie）
async function fetchImageAsBase64(url) {
  try {
    const r = await fetch(url, { credentials: "include" });
    if (!r.ok) return null;
    const buf = await r.arrayBuffer();
    if (buf.byteLength > 8 * 1024 * 1024) return null;      // > 8MB 跳过
    const type = (r.headers.get("content-type") || "").split(";")[0].trim();
    if (!/^image\//i.test(type) && !/\.(png|jpe?g|webp|gif)(\?|$)/i.test(url)) return null;

    const bytes = new Uint8Array(buf);
    let bin = "";
    const CHUNK = 0x8000;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
    }
    const mime = /^image\//i.test(type) ? type : "image/png";
    return { mime, base64: btoa(bin) };
  } catch (_) {
    return null;
  }
}

// 通用：一次 chat/completions 调用（带 JSON 模式，失败自动降级）
async function postChat(cfg, messages, withJson) {
  const url = cfg.baseUrl.replace(/\/+$/, "") + "/chat/completions";
  const headers = { "Content-Type": "application/json" };
  if (cfg.apiKey) headers.Authorization = "Bearer " + cfg.apiKey;

  const body = {
    model: cfg.model,
    temperature: Number(cfg.temperature) || 0,
    messages,
    stream: false,
  };
  if (withJson) body.response_format = { type: "json_object" };
  if (cfg.thinking) {
    body.thinking = { type: "enabled" };
    body.reasoning_effort = cfg.reasoningEffort || "high";
  }

  const resp = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    const e = new Error(`HTTP ${resp.status} ${t.slice(0, 240)}`);
    e.status = resp.status;
    throw e;
  }
  return resp.json();
}

function textOfChoice(data) {
  const m = data?.choices?.[0]?.message || {};
  return m.content || m.reasoning_content || data?.message?.content || "";
}

// 判断题/选择题的"现有答案"是否正确的裁判
function buildVerifyMessages(q, existing, cfg) {
  const typeHint = {
    single: "单选题", multiple: "多选题", judge: "判断题",
    fill: "填空题", essay: "简答题", unknown: "未知题型",
  }[q.type] || "未知题型";
  const opts = (q.options || [])
    .map((o, i) => `${o.letter || String.fromCharCode(65 + i)}. ${o.text}`)
    .join("\n");

  return [
    {
      role: "system",
      content:
        "你是严格的阅卷老师。判断学生答案是否正确，只输出 JSON，不要解释、不要 markdown。" +
        '结构：{"correct":true|false,"answer":["正确答案"],"confidence":0.0-1.0,"reason":"一句话理由"}' +
        "选择题/判断题 answer 用大写字母；填空/简答给文字；置信度表示你对判断的确信程度。" +
        (cfg.extraPrompt ? " 补充要求：" + cfg.extraPrompt : ""),
    },
    {
      role: "user",
      content:
        `题型：${typeHint}` +
        `
题目：${q.stem}` +
        (opts ? `
选项：
${opts}` : "") +
        `
学生答案：${existing}` +
        `
请判断学生答案是否正确，若不正确请给出正确答案。`,
    },
  ];
}

function parseVerify(text) {
  let s = String(text || "").trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a >= 0 && b > a) {
    try {
      const o = JSON.parse(s.slice(a, b + 1));
      return {
        correct: o.correct === true || String(o.correct).toLowerCase() === "true",
        answer: Array.isArray(o.answer) ? o.answer.map(String) : o.answer ? [String(o.answer)] : [],
        confidence: Number(o.confidence ?? 0.5),
        reason: String(o.reason || "").slice(0, 120),
      };
    } catch (_) {}
  }
  return null;
}

async function verifyAnswer(q) {
  const cfg = await getConfig();
  let data;
  try {
    data = await postChat(cfg, buildVerifyMessages(q, q.existing, cfg), cfg.jsonMode !== false);
  } catch (e) {
    if (cfg.jsonMode !== false && (e.status === 400 || e.status === 422)) {
      data = await postChat(cfg, buildVerifyMessages(q, q.existing, cfg), false);
    } else throw e;
  }
  const v = parseVerify(textOfChoice(data));
  if (!v) throw new Error("判卷返回无法解析");
  const cost = costOf(cfg.model, data?.usage);
  v.cost = cost;
  v.stats = await addUsage(cost, 0);
  return v;
}

async function askLLM(q) {
  const cfg = await getConfig();

  // 题干里的图片：auto 模式只在有图时抓取
  let images = [];
  if (cfg.visionMode !== "off" && Array.isArray(q.images) && q.images.length) {
    const limit = Math.max(0, Math.min(6, Number(cfg.maxImagesPerQuestion ?? 2)));
    const urls = q.images.slice(0, limit);
    const got = await Promise.all(urls.map((u) => fetchImageAsBase64(u.url || u)));
    images = got.filter(Boolean);
  }

  const messages = buildPrompt(q, cfg, images);
  let data;
  try {
    data = await postChat(cfg, messages, cfg.jsonMode !== false);
  } catch (e) {
    if (cfg.jsonMode !== false && (e.status === 400 || e.status === 422)) {
      data = await postChat(cfg, messages, false);
    } else throw e;
  }
  const content = textOfChoice(data);
  const cost = costOf(cfg.model, data?.usage);
  const stats = await addUsage(cost, 1);
  return {
    answer: parseAnswer(content),
    raw: content,
    imageCount: images.length,
    usage: data?.usage || null,
    cost,
    stats,
  };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "ASK") {
    askLLM(msg.payload)
      .then((r) => sendResponse({ ok: true, ...r }))
      .catch((e) => sendResponse({ ok: false, error: String(e?.message || e) }));
    return true; // 异步
  }
  if (msg?.type === "VERIFY") {
    verifyAnswer(msg.payload)
      .then((v) => sendResponse({ ok: true, ...v }))
      .catch((e) => sendResponse({ ok: false, error: String(e?.message || e) }));
    return true;
  }
  if (msg?.type === "GET_BALANCE") {
    (async () => {
      const cfg = await getConfig();
      try {
        const origin = new URL(cfg.baseUrl).origin;
        const r = await fetch(origin + "/user/balance", {
          headers: cfg.apiKey ? { Authorization: "Bearer " + cfg.apiKey } : {},
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        sendResponse({ ok: true, balance: await r.json(), origin });
      } catch (e) {
        sendResponse({ ok: false, error: String(e?.message || e) });
      }
    })();
    return true;
  }
  if (msg?.type === "GET_STATS") {
    chrome.storage.local.get({ usageStats: null }).then((r) => sendResponse({ ok: true, stats: r.usageStats }));
    return true;
  }
  if (msg?.type === "PING") {
    getConfig()
      .then(async (cfg) => {
        try {
          const r = await fetch(cfg.baseUrl.replace(/\/+$/, "") + "/models", {
            headers: cfg.apiKey ? { Authorization: "Bearer " + cfg.apiKey } : {},
          });
          sendResponse({ ok: true, config: cfg, apiOk: r.ok, apiStatus: r.status });
        } catch (e) {
          sendResponse({ ok: true, config: cfg, apiOk: false, apiStatus: String(e?.message || e) });
        }
      });
    return true;
  }
});
