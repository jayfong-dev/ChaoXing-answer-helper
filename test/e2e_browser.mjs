// test/e2e_browser.mjs —— 真浏览器端到端测试：加载扩展 → 打开模拟作业 → 扫题 → 答题
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { chromium } from "playwright-core";

const EXT = path.resolve(process.cwd());
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PAGE = "http://127.0.0.1:8777/fixture.html";
const CFG = { baseUrl: "http://127.0.0.1:8765/v1", model: "mock-answerer", apiKey: "", autoFill: true, delayMs: 300, autoSubmit: false, autoNext: false, maxQuestions: 50 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = path.join(process.cwd(), "test", "shots");
fs.mkdirSync(out, { recursive: true });

const profile = fs.mkdtempSync(path.join(os.tmpdir(), "cxai-pw-"));

const ctx = await chromium.launchPersistentContext(profile, {
  executablePath: EDGE,
  headless: false,
  viewport: { width: 1320, height: 940 },
  args: [
    `--disable-extensions-except=${EXT}`,
    `--load-extension=${EXT}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-features=msEdgeSidebarV2",
  ],
});

// 等 service worker 起来并写入配置
let sw = null;
for (let i = 0; i < 40 && !sw; i++) {
  const workers = ctx.serviceWorkers();
  if (workers.length) sw = workers[0];
  else await sleep(250);
}
if (!sw) {
  console.error("FAIL: 扩展的 service worker 没起来（浏览器可能没加载扩展）");
  await ctx.close();
  process.exit(1);
}
console.log("PASS: service worker 已加载 →", sw.url());
await sw.evaluate(async (cfg) => { await chrome.storage.sync.set(cfg); }, CFG);
console.log("PASS: 已写入配置", JSON.stringify({ baseUrl: CFG.baseUrl, model: CFG.model }));

const page = await ctx.newPage();
await page.goto(PAGE, { waitUntil: "load" });
await page.waitForSelector("#cxai-hud", { timeout: 15000 });
console.log("PASS: 页面注入成功，#cxai-hud 出现");
await page.screenshot({ path: path.join(out, "1_injected.png") });

// 只扫描
await page.click("#cxai-scan");
await sleep(800);
const scanLog = await page.$$eval("#cxai-log .cxai-line", (ns) => ns.map((n) => n.textContent));
console.log("—— 扫描日志 ——\n" + scanLog.join("\n"));

// 开始答题
await page.click("#cxai-start");
await page
  .waitForFunction(() => /完成：/.test(document.querySelector("#cxai-log")?.innerText || ""), null, { timeout: 30000 })
  .catch(() => {});
await sleep(2200); // 等 HUD 状态从"运行中"切到"完成"
const runLog = await page.$$eval("#cxai-log .cxai-line", (ns) => ns.map((n) => n.textContent));
console.log("\n—— 答题日志 ——\n" + runLog.slice(scanLog.length).join("\n"));
await page.screenshot({ path: path.join(out, "2_answered.png") });

// 断言
const state = await page.evaluate(() => {
  const pick = (n) => [...document.querySelectorAll(`input[name="${n}"]`)].filter((i) => i.checked).map((i) => i.value);
  return {
    q1: pick("q1"),
    q2: pick("q2"),
    q3: pick("q3"),
    q4: document.querySelector('input[name="q4"]').value.trim(),
    q5: document.querySelector('textarea[name="q5"]').value.trim(),
    hud: document.querySelector("#cxai-stat")?.textContent,
  };
});
console.log("\n—— 页面实际状态 ——\n", JSON.stringify(state, null, 2));

const checks = [
  ["单选 q1 = A", state.q1.join(",") === "A"],
  ["判断 q2 = A(对)", state.q2.join(",") === "A"],
  ["多选 q3 = A,C", state.q3.sort().join(",") === "A,C"],
  ["填空 q4 已写入", (state.q4 || "").length > 0],
  ["简答 q5 已填", state.q5.length > 5],
  ["HUD 显示完成", /完成|5\/5/.test(state.hud || "")],
];
let pass = 0;
console.log("\n—— 断言 ——");
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (ok) pass++;
}
console.log(`\n${pass}/${checks.length} 通过`);
console.log("截图：", out);

await sleep(1200);
await ctx.close();
process.exit(pass === checks.length ? 0 : 1);
