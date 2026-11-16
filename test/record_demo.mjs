// test/record_demo.mjs —— 录一段 README 用的演示：加载扩展 → 只扫描 → 开始答题 → 显示消耗
// 产物：test/demo_frames/*.jpg（截图序列）+ test/demo_frames/timeline.json
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { chromium } from "playwright-core";

const EXT = path.resolve(process.cwd());
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PAGE = "http://127.0.0.1:8777/fixture_31.html";
const CFG = {
  baseUrl: "http://127.0.0.1:8765/v1", model: "deepseek-flash", apiKey: "",
  autoFill: true, existingMode: "overwrite", theme: "graphite",
  visionMode: "auto", delayMs: 260, maxQuestions: 60,
};

const FPS = 5;                      // 采样频率
const framesDir = path.join(process.cwd(), "test", "demo_frames");
fs.rmSync(framesDir, { recursive: true, force: true });
fs.mkdirSync(framesDir, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "cxai-demo-"));

const ctx = await chromium.launchPersistentContext(profile, {
  executablePath: EDGE, headless: false,
  viewport: { width: 1120, height: 760 },
  deviceScaleFactor: 1,
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, "--no-first-run", "--no-default-browser-check"],
});

let sw = null;
for (let i = 0; i < 40 && !sw; i++) { sw = ctx.serviceWorkers()[0] || null; if (!sw) await sleep(250); }
await sw.evaluate(async (c) => {
  await chrome.storage.sync.set(c);
  await chrome.storage.local.remove(["usageStats", "noticeSeen"]);
}, CFG);

const page = await ctx.newPage();
await page.goto(PAGE, { waitUntil: "load" });
await page.waitForSelector("#cxai-hud", { timeout: 15000 });
await page.waitForTimeout(600);

// 采样循环
let n = 0;
const t0 = Date.now();
const timeline = [];
let stop = false;

async function loop() {
  while (!stop) {
    const ts = Date.now() - t0;
    try {
      await page.screenshot({
        path: path.join(framesDir, `${String(n).padStart(4, "0")}.jpg`),
        type: "jpeg", quality: 72,
      });
      timeline.push(ts);
      n++;
    } catch (_) {}
    await sleep(1000 / FPS);
  }
}
const loopP = loop();

// ── 演示动作 ──
await page.waitForTimeout(1800);                 // 让观众看清题目
await page.evaluate(() => document.querySelector("#cxai-hud")?.classList.remove("cxai-mini"));
await page.click("#cxai-scan");                  // 只扫描
await page.waitForTimeout(3000);                 // 停在"扫到 32 题"

// 答题时让页面跟着往下滚，观众能看到题目被逐个填上
await page.click("#cxai-start");
const scroller = (async () => {
  for (let i = 0; i < 40; i++) {
    await page.evaluate(() => window.scrollBy(0, 260)).catch(() => {});
    await sleep(230);
  }
})();
await page.waitForFunction(
  () => /完成：/.test(document.querySelector("#cxai-log")?.innerText || ""),
  null, { timeout: 120000 }
).catch(() => {});

await scroller;
await page.waitForTimeout(1600);                  // 停在结果页，展示消耗

// 顺便演示三套主题
for (const t of ["paper", "ink", "graphite"]) {
  await page.evaluate((theme) => {
    const h = document.querySelector("#cxai-hud");
    if (h) h.dataset.theme = theme;
  }, t);
  await page.waitForTimeout(900);
}
stop = true;
await loopP;

fs.writeFileSync(
  path.join(framesDir, "timeline.json"),
  JSON.stringify({ fps: FPS, frames: n, durationMs: Date.now() - t0 }, null, 2)
);
console.log(`采到 ${n} 帧，时长 ${((Date.now() - t0) / 1000).toFixed(1)}s`);

const log = await page.$$eval("#cxai-log .cxai-line", (ns) => ns.map((x) => x.textContent));
console.log("尾部日志:\n" + log.slice(-5).join("\n"));
const foot = await page.$eval("#cxai-hud .cxai-cost", (el) => el.textContent.trim()).catch(() => "");
console.log("底部消耗:", foot);

await ctx.close();
