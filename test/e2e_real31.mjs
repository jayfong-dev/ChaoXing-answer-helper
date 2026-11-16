// test/e2e_real31.mjs —— 按真实「第7章 31题」结构验收：题数、题型、抓取与回填
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { chromium } from "playwright-core";

const EXT = path.resolve(process.cwd());
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PAGE = "http://127.0.0.1:8777/fixture_31.html";
const CFG = { baseUrl: "http://127.0.0.1:8765/v1", model: "mock-answerer", autoFill: true, delayMs: 100, maxQuestions: 300, existingMode: "check" };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = path.join(process.cwd(), "test", "shots");
fs.mkdirSync(out, { recursive: true });
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "cxai-31-"));

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
await page.waitForTimeout(1500);

await page.click("#cxai-scan");
await sleep(2500);
const scanLog = await page.$$eval("#cxai-log .cxai-line", (ns) => ns.map((n) => n.textContent));
console.log("—— 扫描 ——\n" + scanLog.join("\n"));

await page.click("#cxai-start");
await page.waitForFunction(() => /完成：/.test(document.querySelector("#cxai-log")?.innerText || ""), null, { timeout: 90000 }).catch(() => {});
await sleep(1000);
const runLog = await page.$$eval("#cxai-log .cxai-line", (ns) => ns.map((n) => n.textContent));
console.log("\n—— 答题（尾部 12 行）——\n" + runLog.slice(-12).join("\n"));
await page.screenshot({ path: path.join(out, "7_real31.png") });

const res = await page.evaluate(() => {
  const qs = [...document.querySelectorAll(".questionLi")].filter((q) => q.id !== "hiddenTemplate");
  let single = 0, judge = 0, fillBlanks = 0, fillSlots = 0, essay = 0;
  for (const q of qs) {
    const tn = (q.getAttribute("typename") || "").trim();
    const picked = q.querySelectorAll('.answerBg[aria-checked="true"]').length;
    const slots = q.querySelectorAll("span.tiankong").length;
    const frames = [...q.querySelectorAll("iframe")];
    const filledFrames = frames.filter((f) => {
      try { return (f.contentDocument?.body?.innerText || "").trim().length > 0; } catch { return false; }
    }).length;
    if (tn === "单选题" && picked === 1) single++;
    if (tn === "判断题" && picked === 1) judge++;
    if (tn === "填空题") { fillSlots += slots; fillBlanks += filledFrames; }
    if (tn === "其它" && filledFrames > 0) essay++;
  }
  return { total: qs.length, single, judge, fillBlanks, fillSlots, essay };
});
console.log("\n—— 页面实际结果 ——\n" + JSON.stringify(res, null, 2));

const s = scanLog.join("\n");
const checks = [
  ["扫出 32 题（含 1 道带图题）", /扫到 32 题/.test(s)],
  ["单选 11", /single×11/.test(s)],
  ["填空 6", /fill×6/.test(s)],
  ["判断 11", /judge×11/.test(s)],
  ["其它 4 判为简答", /essay×4/.test(s)],
  ["11 道单选全选中", res.single === 11],
  ["11 道判断全选中", res.judge === 11],
  ["9 个空全部写入", res.fillBlanks === 9 && res.fillSlots === 9],
  ["4 道其它题写入编辑器", res.essay === 4],
  ["判卷：正确的那道被保留", /答案正确，保留/.test(runLog.join("\n"))],
  ["判卷：错误的那道被更正", /答案错误 → 更正为/.test(runLog.join("\n"))],
  ["判卷日志带置信度", /置信度 0\.9/.test(runLog.join("\n"))],
];
let pass = 0;
console.log("\n—— 断言 ——");
for (const [n, ok] of checks) { console.log(`${ok ? "PASS" : "FAIL"}  ${n}`); if (ok) pass++; }
console.log(`\n${pass}/${checks.length} 通过`);
await sleep(500);
await ctx.close();
process.exit(pass === checks.length ? 0 : 1);
