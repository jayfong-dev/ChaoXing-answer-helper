// options.js —— Assistant · 答题助手
const DEFAULTS = {
  baseUrl: "https://api.deepseek.com/v1",
  apiKey: "",
  model: "deepseek-flash",
  temperature: 0,
  jsonMode: true,
  thinking: false,
  reasoningEffort: "high",
  theme: "graphite",
  autoFill: true,
  autoNext: false,
  autoSubmit: false,
  existingMode: "overwrite",
  visionMode: "auto",
  visionDetail: "original",
  maxImagesPerQuestion: 2,
  minConfidence: 0.7,
  delayMs: 800,
  maxQuestions: 300,
  extraPrompt: "",
  customContainers: "",
  customStem: "",
  customOptions: "",
};

const FIELDS = Object.keys(DEFAULTS);
const $ = (id) => document.getElementById(id);

let theme = DEFAULTS.theme;

function fillForm(cfg) {
  for (const k of FIELDS) {
    const el = $(k);
    if (!el) continue;
    const v = cfg[k] ?? DEFAULTS[k];
    if (el.type === "checkbox") el.checked = !!v;
    else if (el.tagName === "SELECT") el.value = String(v);
    else el.value = v;
  }
  theme = cfg.theme || DEFAULTS.theme;
  paintTheme();
}

function paintTheme() {
  document.querySelectorAll("button.theme").forEach((b) => {
    b.classList.toggle("on", b.dataset.theme === theme);
  });
}

function readForm() {
  const out = {};
  for (const k of FIELDS) {
    if (k === "theme") continue;
    const el = $(k);
    if (!el) continue;
    if (el.type === "checkbox") out[k] = el.checked;
    else if (el.tagName === "SELECT") {
      if (el.id === "jsonMode") out[k] = el.value !== "false";
      else if (el.id === "thinking") out[k] = el.value === "true";
      else out[k] = el.value;
    } else if (el.type === "number") out[k] = Number(el.value);
    else out[k] = el.value.trim();
  }
  out.theme = theme;
  return out;
}

function checkVisionModel() {
  const warn = $("visionWarn");
  if (!warn) return;
  const model = ($("model").value || "").trim();
  const mode = $("visionMode").value;
  const ok = /flash/i.test(model);   // DeepSeek 里支持视觉的是 deepseek-flash
  warn.style.display = mode !== "off" && !ok ? "block" : "none";
}

(async () => {
  const cfg = await chrome.storage.sync.get(DEFAULTS);
  fillForm({ ...DEFAULTS, ...cfg });
  const v = chrome.runtime.getManifest().version;
  if ($("aboutVer")) $("aboutVer").textContent = v;
  if ($("ver")) $("ver").textContent = "v" + v;
  checkVisionModel();
  ["visionMode", "model"].forEach((id) => $(id)?.addEventListener("input", checkVisionModel));
})();

// 主题选择（即时预览 + 保存）
document.querySelectorAll("button.theme").forEach((b) => {
  b.addEventListener("click", async () => {
    theme = b.dataset.theme;
    paintTheme();
    await chrome.storage.sync.set({ theme });
    const m = $("msg");
    m.className = "msg ok";
    m.textContent = `主题已切换：${{ graphite: "石墨", paper: "纸白", ink: "墨蓝" }[theme]}`;
    setTimeout(() => (m.textContent = ""), 1800);
  });
});

// 接口预设
document.querySelectorAll("button.preset").forEach((b) => {
  b.addEventListener("click", () => {
    $("baseUrl").value = b.dataset.base || "";
    $("model").value = b.dataset.model || "";
    document.querySelectorAll("button.preset").forEach((x) => x.classList.remove("on"));
    b.classList.add("on");
    const m = $("msg");
    m.className = "msg";
    m.textContent = "已填入地址与模型，补 Key 后保存";
    setTimeout(() => (m.textContent = ""), 2000);
  });
});

$("save").onclick = async () => {
  const cfg = readForm();
  await chrome.storage.sync.set(cfg);
  const m = $("msg");
  m.className = "msg ok";
  m.textContent = "已保存";
  setTimeout(() => (m.textContent = ""), 1600);
};

$("reset").onclick = async () => {
  await chrome.storage.sync.set(DEFAULTS);
  fillForm(DEFAULTS);
  $("msg").className = "msg";
  $("msg").textContent = "已恢复默认（石墨主题 · 忽略原答案重答）";
};

$("test").onclick = async () => {
  const cfg = readForm();
  const m = $("testMsg");
  m.className = "msg";
  m.textContent = "测试中…";
  const base = cfg.baseUrl.replace(/\/+$/, "");
  try {
    const r = await fetch(base + "/models", {
      headers: cfg.apiKey ? { Authorization: "Bearer " + cfg.apiKey } : {},
    });
    if (!r.ok) {
      m.className = "msg bad";
      m.textContent = `HTTP ${r.status}（地址对了但接口报错，或 Key 无效）`;
      return;
    }
    const d = await r.json();
    const names = (d?.data || d?.models || []).map((x) => x.id || x.name).filter(Boolean);
    m.className = "msg ok";
    m.textContent = `连接成功，可用模型 ${names.length} 个` + (names.length ? `：${names.slice(0, 4).join(", ")}` : "");
  } catch (e) {
    m.className = "msg bad";
    m.textContent = `连不上：${e.message}`;
  }
};

// 侧栏高亮
const links = [...document.querySelectorAll("nav a")];
const sections = links.map((a) => document.querySelector(a.getAttribute("href")));
window.addEventListener("scroll", () => {
  const y = window.scrollY + 120;
  let idx = 0;
  sections.forEach((s, i) => { if (s && s.offsetTop <= y) idx = i; });
  links.forEach((a, i) => a.classList.toggle("on", i === idx));
}, { passive: true });
