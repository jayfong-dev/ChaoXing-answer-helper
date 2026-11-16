// test/e2e_overwrite.mjs —— 验证"忽略原答案/重复运行"不会把已选中的选项点掉（toggle 问题）
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { chromium } from "playwright-core";

const EXT = path.resolve(process.cwd());
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PAGE = "http://127.0.0.1:8777/fixture_31.html";
const CFG = {
  baseUrl: "http://127.0.0.1:8765/v1", model: "mock-answerer", autoFill: true,
  /* 故意不设 existingMode：验证"默认就是覆盖重答" */
  delayMs: 80, maxQuestions: 300,
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = path.join(process.cwd(), "test", "shots");
fs.mkdirSync(out, { recursive: true });
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "cxai-ow-"));

const ctx = await chromium.launchPersistentContext(profile, {
  executablePath: EDGE, headless: false, viewport: { width: 1340, height: 1000 },
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, "--no-first-run", "--no-default-browser-check"],
});
let sw = null;
for (let i = 0; i < 40 && !sw; i++) { sw = ctx.serviceWorkers()[0] || null; if (!sw) await sleep(250); }
await sw.evaluate(async (c) => { await chrome.storage.sync.set(c); }, CFG);

const page = await ctx.newPage();
await page.goto(PAGE, { waitUntil: "load" });
await page.waitForSelector("#cxai-hud", { timeout: 15000 });
await page.waitForTimeout(1200);

const countSelected = () => page.evaluate(() => {
  const qs = [...document.querySelectorAll(".questionLi")].filter((q) => q.id !== "hiddenTemplate");
  let single = 0, judge = 0, none = 0;
  for (const q of qs) {
    const tn = (q.getAttribute("typename") || "").trim();
    const n = q.querySelectorAll('.answerBg[aria-checked="true"]').length;
    if (tn === "单选题") { n === 1 ? single++ : none++; }
    if (tn === "判断题") { n === 1 ? judge++ : none++; }
  }
  return { single, judge, none };
});

// 第 1 轮
await page.click("#cxai-start");
await page.waitForFunction(() => /完成：/.test(document.querySelector("#cxai-log")?.innerText || ""), null, { timeout: 90000 }).catch(() => {});
await sleep(800);
const r1 = await countSelected();
console.log("第 1 轮后：", JSON.stringify(r1));

// 第 2 轮（重复运行，最容易暴露 toggle 掉的问题）
await page.click("#cxai-start");
await page.waitForFunction(() => (document.querySelector("#cxai-log")?.innerText.match(/完成：/g) || []).length >= 2, null, { timeout: 90000 }).catch(() => {});
await sleep(800);
const r2 = await countSelected();
console.log("第 2 轮后：", JSON.stringify(r2));
await page.screenshot({ path: path.join(out, "12_overwrite_twice.png") });

const log = await page.$$eval("#cxai-log .cxai-line", (ns) => ns.map((n) => n.textContent));
console.log("\n—— 第 2 轮日志尾部 ——\n" + log.slice(-10).join("\n"));

const checks = [
  ["第1轮：11 单选全选中", r1.single === 11],
  ["第1轮：11 判断全选中", r1.judge === 11],
  ["第2轮重复运行后：单选仍 11", r2.single === 11],
  ["第2轮重复运行后：判断仍 11", r2.judge === 11],
  ["没有出现「点了等于取消」的题（none=0）", r1.none === 0 && r2.none === 0],
];
let pass = 0;
console.log("\n—— 断言 ——");
for (const [n, ok] of checks) { console.log(`${ok ? "PASS" : "FAIL"}  ${n}`); if (ok) pass++; }
console.log(`\n${pass}/${checks.length} 通过`);
await sleep(500);
await ctx.close();
process.exit(pass === checks.length ? 0 : 1);
