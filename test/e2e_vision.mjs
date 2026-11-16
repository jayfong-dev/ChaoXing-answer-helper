// test/e2e_vision.mjs —— 验证图片题：题干 <img> 被取到并作为 image_url 发出
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { chromium } from "playwright-core";

const EXT = path.resolve(process.cwd());
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PAGE = "http://127.0.0.1:8777/fixture_31.html";
const CFG = {
  baseUrl: "http://127.0.0.1:8765/v1", model: "deepseek-flash", autoFill: true,
  existingMode: "overwrite", visionMode: "auto", visionDetail: "original",
  maxImagesPerQuestion: 2, delayMs: 60, maxQuestions: 300,
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = path.join(process.cwd(), "test", "shots");
fs.mkdirSync(out, { recursive: true });
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "cxai-vis-"));

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

await page.click("#cxai-start");
await page.waitForFunction(() => /完成：/.test(document.querySelector("#cxai-log")?.innerText || ""), null, { timeout: 120000 }).catch(() => {});
await sleep(600);

const log = await page.$$eval("#cxai-log .cxai-line", (ns) => ns.map((n) => n.textContent));
console.log("—— 含 vision 的日志行 ——");
log.filter((l) => /vision|vision_seen|VISION/.test(l)).forEach((l) => console.log(l));
console.log("\n—— 尾部 8 行 ——\n" + log.slice(-8).join("\n"));

// mock 侧记录的最近一次请求
const last = await fetch("http://127.0.0.1:8765/last").then((r) => r.json()).catch(() => ({}));
console.log("\nmock /last =", JSON.stringify(last));

// 页面里那道带图题的目标输入框
const filled = await page.evaluate(() => {
  const qs = [...document.querySelectorAll(".questionLi")];
  const q = qs.find((x) => x.querySelector('img[src*="diagram"]'));
  if (!q) return { found: false };
  const f = q.querySelector("iframe");
  let text = "";
  try { text = (f.contentDocument?.body?.innerText || "").trim(); } catch (_) {}
  return { found: true, text: text.slice(0, 40) };
});
console.log("带图题填写结果 =", JSON.stringify(filled));
await page.screenshot({ path: path.join(out, "13_vision.png") });

const checks = [
  ["页面里存在带图题", filled.found === true],
  ["回答里带回 VISION_SEEN 标记（证明模型收到图片）", /VISION_SEEN_\d+/.test(log.join("\n"))],
  ["日志出现 [vision] 附加 N 张图", /\[vision\] 附加 \d+ 张图/.test(log.join("\n"))],
  ["mock 收到 image_url", Number(last.images) >= 1],
  ["带图题已被填写", filled.found && filled.text.length > 0],
];
let pass = 0;
console.log("\n—— 断言 ——");
for (const [n, ok] of checks) { console.log(`${ok ? "PASS" : "FAIL"}  ${n}`); if (ok) pass++; }
console.log(`\n${pass}/${checks.length} 通过`);
await sleep(500);
await ctx.close();
process.exit(pass === checks.length ? 0 : 1);
