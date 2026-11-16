// test/e2e_usage.mjs —— 验证 token / 费用统计：日志、底部汇总、按天累计
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { chromium } from "playwright-core";

const EXT = path.resolve(process.cwd());
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PAGE = "http://127.0.0.1:8777/fixture.html";
const CFG = {
  baseUrl: "http://127.0.0.1:8765/v1", model: "deepseek-flash", apiKey: "",
  autoFill: true, existingMode: "overwrite", delayMs: 60, maxQuestions: 50,
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "cxai-cost-"));
const ctx = await chromium.launchPersistentContext(profile, {
  executablePath: EDGE, headless: false, viewport: { width: 1320, height: 900 },
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, "--no-first-run", "--no-default-browser-check"],
});
let sw = null;
for (let i = 0; i < 40 && !sw; i++) { sw = ctx.serviceWorkers()[0] || null; if (!sw) await sleep(250); }
await sw.evaluate(async (c) => {
  await chrome.storage.sync.set(c);
  await chrome.storage.local.remove("usageStats");
}, CFG);

const page = await ctx.newPage();
await page.goto(PAGE, { waitUntil: "load" });
await page.waitForSelector("#cxai-hud", { timeout: 15000 });
await page.waitForTimeout(1000);

await page.click("#cxai-start");
await page.waitForFunction(() => /完成：/.test(document.querySelector("#cxai-log")?.innerText || ""), null, { timeout: 90000 }).catch(() => {});
await sleep(700);

const log = await page.$$eval("#cxai-log .cxai-line", (ns) => ns.map((n) => n.textContent));
const usageLines = log.filter((l) => l.includes("[usage]"));
console.log("—— usage 日志（前 3 条）——\n" + usageLines.slice(0, 3).join("\n"));

const footer = await page.$eval("#cxai-hud .cxai-cost", (el) => el.textContent.trim()).catch(() => "");
console.log("\n底部汇总：", footer);

const stats = await sw.evaluate(async () => (await chrome.storage.local.get({ usageStats: null })).usageStats);
console.log("storage.usageStats =", JSON.stringify(stats));

const checks = [
  ["每题都有 [usage] 行", usageLines.length === 5],
  ["日志含输入/输出 token", /入 \d+.*出 \d+/.test(usageLines[0] || "")],
  ["日志含估算费用", /≈\$0\.\d{4,}/.test(usageLines[0] || "")],
  ["缓存命中被单独标出", /缓存 128/.test(usageLines[0] || "")],
  ["底部汇总显示题数·tok·$", /\d+ 题 · .+ tok · ≈\$/.test(footer)],
  ["按天累计：题数 5", Number(stats?.questions) === 5],
  ["按天累计：token 已累加", Number(stats?.inTok) > 0 && Number(stats?.outTok) > 0],
  ["按天累计：费用 > 0", Number(stats?.usd) > 0],
];
let pass = 0;
console.log("\n—— 断言 ——");
for (const [n, ok] of checks) { console.log(`${ok ? "PASS" : "FAIL"}  ${n}`); if (ok) pass++; }
console.log(`\n${pass}/${checks.length} 通过`);
await sleep(400);
await ctx.close();
process.exit(pass === checks.length ? 0 : 1);
