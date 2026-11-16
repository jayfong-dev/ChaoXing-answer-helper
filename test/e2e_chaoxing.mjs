// test/e2e_chaoxing.mjs —— 按真实 mooc1 结构（22 题）验证：22 题全认出、按题型作答、填空写进 ueditor
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { chromium } from "playwright-core";

const EXT = path.resolve(process.cwd());
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PAGE = "http://127.0.0.1:8777/fixture_chaoxing.html";
const CFG = { baseUrl: "http://127.0.0.1:8765/v1", model: "mock-answerer", autoFill: true, delayMs: 120, maxQuestions: 300 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = path.join(process.cwd(), "test", "shots");
fs.mkdirSync(out, { recursive: true });
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "cxai-cx-"));

const ctx = await chromium.launchPersistentContext(profile, {
  executablePath: EDGE, headless: false, viewport: { width: 1340, height: 1000 },
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, "--no-first-run", "--no-default-browser-check"],
});
let sw = null;
for (let i = 0; i < 40 && !sw; i++) { sw = ctx.serviceWorkers()[0] || null; if (!sw) await sleep(250); }
if (!sw) { console.error("FAIL: service worker 未加载"); await ctx.close(); process.exit(1); }
await sw.evaluate(async (c) => { await chrome.storage.sync.set(c); }, CFG);

const page = await ctx.newPage();
await page.goto(PAGE, { waitUntil: "load" });
await page.waitForSelector("#cxai-hud", { timeout: 15000 });
await page.waitForTimeout(1200);

// 扫描
await page.click("#cxai-scan");
await sleep(2000);
const scanLog = await page.$$eval("#cxai-log .cxai-line", (ns) => ns.map((n) => n.textContent));
console.log("—— 扫描日志 ——\n" + scanLog.join("\n"));
await page.screenshot({ path: path.join(out, "5_cx_scan.png") });

// 答题
await page.click("#cxai-start");
await page.waitForFunction(() => /完成：/.test(document.querySelector("#cxai-log")?.innerText || ""), null, { timeout: 60000 }).catch(() => {});
await sleep(800);
const runLog = await page.$$eval("#cxai-log .cxai-line", (ns) => ns.map((n) => n.textContent));
console.log("\n—— 答题日志（尾部）——\n" + runLog.slice(-14).join("\n"));
await page.screenshot({ path: path.join(out, "6_cx_answered.png"), fullPage: false });

// 统计页面结果
const res = await page.evaluate(() => {
  const qs = [...document.querySelectorAll(".questionLi")];
  let single = 0, judge = 0, fillBlanks = 0, essay = 0;
  const detail = [];
  for (const q of qs) {
    const tn = q.getAttribute("typename") || "";
    const picked = [...q.querySelectorAll('.answerBg[aria-checked="true"]')].map((d) => d.querySelector("span[data]")?.dataset.data);
    const frames = [...q.querySelectorAll("iframe")];
    const texts = frames.map((f) => {
      try { return (f.contentDocument?.body?.innerText || "").trim(); } catch { return ""; }
    });
    const filled = texts.filter(Boolean).length;
    if (tn === "单选题") { if (picked.length === 1) single++; detail.push(`${tn}:${picked.join("") || "-"}`); }
    if (tn === "判断题") { if (picked.length === 1) judge++; }
    if (tn === "填空题") { fillBlanks += filled; detail.push(`${tn}:${filled}/${frames.length}空`); }
    if (tn === "简答题") { if (filled) essay++; detail.push(`${tn}:${filled ? "已填" : "空"}`); }
  }
  return { total: qs.length, single, judge, fillBlanks, essay, detail };
});
console.log("\n—— 页面实际结果 ——");
console.log(JSON.stringify(res, null, 2));

const checks = [
  ["扫出 22 题", /扫到 22 题/.test(scanLog.join("\n"))],
  ["题型分布正确（single×10 · fill×3 · judge×8 · essay×1）", /single×10/.test(scanLog.join("\n")) && /fill×3/.test(scanLog.join("\n")) && /judge×8/.test(scanLog.join("\n")) && /essay×1/.test(scanLog.join("\n"))],
  ["10 道单选全部选中", res.single === 10],
  ["8 道判断全部选中", res.judge === 8],
  ["7 个填空全写入", res.fillBlanks === 7],
  ["1 道简答写入", res.essay === 1],
];
let pass = 0;
console.log("\n—— 断言 ——");
for (const [n, ok] of checks) { console.log(`${ok ? "PASS" : "FAIL"}  ${n}`); if (ok) pass++; }
console.log(`\n${pass}/${checks.length} 通过`);
await sleep(600);
await ctx.close();
process.exit(pass === checks.length ? 0 : 1);
