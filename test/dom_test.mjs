// test/dom_test.mjs —— 用 jsdom 离线验证 content.js 的扫题与回填逻辑
import fs from "node:fs";
import { JSDOM } from "jsdom";

const html = fs.readFileSync(new URL("./fixture.html", import.meta.url), "utf8");
const dom = new JSDOM(html, { runScripts: "outside-only", pretendToBeVisual: true });
const { window } = dom;

const CANNED = [
  [/首都/, ["A"]],
  [/H2O|水的化学式/, ["对"]],
  [/编程语言/, ["A", "C"]],
  [/个月/, ["12"]],
  [/牛顿|惯性/, ["物体在不受外力时保持静止或匀速直线运动"]],
];

function canned(payload) {
  const text = (payload.stem || "") + " " + (payload.options || []).map((o) => o.text).join(" ");
  for (const [re, ans] of CANNED) if (re.test(text)) return ans;
  return ["A"];
}

let asked = 0;
window.chrome = {
  storage: {
    sync: {
      get: async (defaults) => ({ ...defaults, delayMs: 0, maxQuestions: 50, autoFill: true }),
      set: async () => {},
    },
    local: {
      get: async (defaults) => ({ ...defaults }),
      set: async () => {},
    },
  },
  runtime: {
    getManifest: () => ({ version: "test" }),
    sendMessage: async (msg) => {
      if (msg?.type === "ASK") {
        asked++;
        return { ok: true, answer: canned(msg.payload) };
      }
      return { ok: true };
    },
  },
};

const code = fs.readFileSync(new URL("../content.js", import.meta.url), "utf8");
window.eval(code);

const $ = (s) => window.document.querySelector(s);

function hudText() {
  return [...window.document.querySelectorAll("#cxai-log .cxai-line")].map((n) => n.textContent).join("\n");
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

$("#cxai-scan").click();
await sleep(120);
console.log("—— 扫描阶段 HUD ——");
console.log(hudText());

$("#cxai-start").click();
await sleep(1500);

console.log("\n—— 答题阶段 HUD ——");
console.log(hudText());

// ── 断言 ──
const results = [];
const check = (name, cond, extra = "") => {
  results.push({ name, ok: !!cond, extra });
};

const q1 = [...window.document.querySelectorAll('input[name="q1"]')].find((i) => i.checked);
check("单选 q1 = A", q1 && q1.value === "A", q1 ? q1.value : "未选");

const q2 = [...window.document.querySelectorAll('input[name="q2"]')].find((i) => i.checked);
check("判断 q2 = 对(A)", q2 && q2.value === "A", q2 ? q2.value : "未选");

const q3 = [...window.document.querySelectorAll('input[name="q3"]')].filter((i) => i.checked).map((i) => i.value).sort();
check("多选 q3 = A,C", q3.join(",") === "A,C", q3.join(",") || "未选");

const q4 = window.document.querySelector('input[name="q4"]').value.trim();
check("填空 q4 = 12", q4 === "12", q4 || "空");

const q5 = window.document.querySelector('textarea[name="q5"]').value.trim();
check("简答 q5 已填", q5.length > 5, q5.slice(0, 30) || "空");

check("调用模型 5 次", asked === 5, String(asked));

console.log("\n—— 断言 ——");
let pass = 0;
for (const r of results) {
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}  ${r.ok ? "" : "→ " + r.extra}`);
  if (r.ok) pass++;
}
console.log(`\n${pass}/${results.length} 通过`);
process.exit(pass === results.length ? 0 : 1);
