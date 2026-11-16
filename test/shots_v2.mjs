// test/shots_v2.mjs —— 2.0.0 视觉验收：三套主题的 HUD + 弹窗 + 设置页
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { chromium } from "playwright-core";

const EXT = path.resolve(process.cwd());
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = path.join(process.cwd(), "test", "shots");
fs.mkdirSync(out, { recursive: true });
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "cxai-v2-"));

const ctx = await chromium.launchPersistentContext(profile, {
  executablePath: EDGE, headless: false, viewport: { width: 1320, height: 900 },
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, "--no-first-run", "--no-default-browser-check"],
});
let sw = null;
for (let i = 0; i < 40 && !sw; i++) { sw = ctx.serviceWorkers()[0] || null; if (!sw) await sleep(250); }
const extId = new URL(sw.url()).host;

await sw.evaluate(async () => {
  await chrome.storage.sync.set({
    baseUrl: "http://127.0.0.1:8765/v1", model: "mock-answerer", apiKey: "",
    autoFill: true, delayMs: 100, theme: "graphite",
  });
});

const page = await ctx.newPage();
await page.goto("http://127.0.0.1:8777/fixture_31.html", { waitUntil: "load" });
await page.waitForSelector("#cxai-hud", { timeout: 15000 });
await page.waitForTimeout(1200);
await page.click("#cxai-scan");
await sleep(1600);

for (const theme of ["graphite", "paper", "ink"]) {
  await sw.evaluate(async (t) => { await chrome.storage.sync.set({ theme: t }); }, theme);
  await page.evaluate((t) => { document.querySelector("#cxai-hud").dataset.theme = t; }, theme);
  await sleep(400);
  await page.screenshot({ path: path.join(out, `v2_hud_${theme}.png`), clip: { x: 860, y: 420, width: 460, height: 470 } });
  console.log("shot", theme);
}

// 弹窗
const pop = await ctx.newPage();
await pop.setViewportSize({ width: 360, height: 420 });
await pop.goto(`chrome-extension://${extId}/popup.html`, { waitUntil: "load" });
await sleep(900);
await pop.screenshot({ path: path.join(out, "v2_popup.png"), fullPage: true });
console.log("shot popup");

// 设置页
const opt = await ctx.newPage();
await opt.setViewportSize({ width: 1180, height: 1000 });
await opt.goto(`chrome-extension://${extId}/options.html`, { waitUntil: "load" });
await sleep(900);
await opt.screenshot({ path: path.join(out, "v2_options.png"), fullPage: false });
console.log("shot options");

await sleep(400);
await ctx.close();
