// test/e2e_iframe.mjs —— 验证 iframe 页面里 HUD 只出现一次，且顶层点「开始答题」能把子框架里的题填掉
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { chromium } from "playwright-core";

const EXT = path.resolve(process.cwd());
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PAGE = "http://127.0.0.1:8777/fixture_iframe.html";
const CFG = { baseUrl: "http://127.0.0.1:8765/v1", model: "mock-answerer", autoFill: true, delayMs: 200 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = path.join(process.cwd(), "test", "shots");
fs.mkdirSync(out, { recursive: true });
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "cxai-if-"));

const ctx = await chromium.launchPersistentContext(profile, {
  executablePath: EDGE,
  headless: false,
  viewport: { width: 1320, height: 1000 },
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, "--no-first-run", "--no-default-browser-check"],
});

let sw = null;
for (let i = 0; i < 40 && !sw; i++) {
  sw = ctx.serviceWorkers()[0] || null;
  if (!sw) await sleep(250);
}
if (!sw) { console.error("FAIL: service worker 未加载"); await ctx.close(); process.exit(1); }
await sw.evaluate(async (cfg) => { await chrome.storage.sync.set(cfg); }, CFG);
console.log("PASS: service worker + 配置就绪");

const page = await ctx.newPage();
await page.goto(PAGE, { waitUntil: "load" });
await page.waitForSelector("iframe");
await sleep(2500); // 等子框架注入

// 统计整个浏览器上下文里有多少个 HUD
let hudTotal = 0;
const per = [];
for (const fr of page.frames()) {
  try {
    const n = await fr.evaluate(() => document.querySelectorAll("#cxai-hud").length).catch(() => 0);
    hudTotal += n;
    per.push(`${fr.url().slice(-28) || "(main)"} → ${n}`);
  } catch (_) {}
}
console.log("HUD 分布：\n  " + per.join("\n  "));
const hudVisible = await page.evaluate(() => document.querySelectorAll("#cxai-hud").length);
console.log(`顶层 HUD 数量：${hudVisible}｜全上下文合计：${hudTotal}`);
await page.screenshot({ path: path.join(out, "3_iframe_one_hud.png") });

// 在顶层点开始，应把子框架的题填掉
await page.evaluate(() => document.querySelector("#cxai-scan")?.click());
await sleep(1200);
await page.evaluate(() => document.querySelector("#cxai-start")?.click());
await sleep(6000);

const frame = page.frames().find((f) => f.url().includes("fixture.html"));
const inner = await frame.evaluate(() => {
  const pick = (n) => [...document.querySelectorAll(`input[name="${n}"]`)].filter((i) => i.checked).map((i) => i.value);
  return {
    q1: pick("q1"), q2: pick("q2"), q3: pick("q3"),
    q4: document.querySelector('input[name="q4"]')?.value.trim(),
    q5: document.querySelector('textarea[name="q5"]')?.value.trim().slice(0, 12),
  };
});
console.log("子框架内实际状态：", JSON.stringify(inner));
await page.screenshot({ path: path.join(out, "4_iframe_answered.png") });

const checks = [
  ["顶层只有 1 个 HUD", hudVisible === 1],
  ["全上下文只有 1 个 HUD（子框架没有面板）", hudTotal === 1],
  ["子框架 q1 = A", inner.q1.join(",") === "A"],
  ["子框架 q3 = A,C", inner.q3.sort().join(",") === "A,C"],
  ["子框架 q4 已写入", (inner.q4 || "").length > 0],
];
let pass = 0;
console.log("\n—— 断言 ——");
for (const [n, ok] of checks) { console.log(`${ok ? "PASS" : "FAIL"}  ${n}`); if (ok) pass++; }
console.log(`\n${pass}/${checks.length} 通过`);
await sleep(800);
await ctx.close();
process.exit(pass === checks.length ? 0 : 1);
