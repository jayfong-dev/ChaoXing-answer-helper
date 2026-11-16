// test/diag_options.mjs —— 诊断：取消「不覆盖答案」勾选后，设置页与页面面板是否还正常
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { chromium } from "playwright-core";

const EXT = path.resolve(process.cwd());
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = path.join(process.cwd(), "test", "shots");
fs.mkdirSync(out, { recursive: true });
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "cxai-diag-"));

const ctx = await chromium.launchPersistentContext(profile, {
  executablePath: EDGE, headless: false, viewport: { width: 1200, height: 900 },
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, "--no-first-run", "--no-default-browser-check"],
});

let sw = null;
for (let i = 0; i < 40 && !sw; i++) { sw = ctx.serviceWorkers()[0] || null; if (!sw) await sleep(250); }
const extId = new URL(sw.url()).host;
console.log("扩展 ID:", extId);

// 1) 打开设置页
const optPage = await ctx.newPage();
const errors = [];
optPage.on("pageerror", (e) => errors.push("pageerror: " + e.message));
optPage.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
await optPage.goto(`chrome-extension://${extId}/options.html`, { waitUntil: "load" });
await sleep(800);
const hasSkip = await optPage.$("#skipAnswered");
const presets = await optPage.$$eval("button.preset", (b) => b.length);
console.log("设置页：#skipAnswered 存在 =", !!hasSkip, "| 预设按钮 =", presets);
await optPage.screenshot({ path: path.join(out, "8_options_before.png"), fullPage: true });

// 2) 取消勾选并保存
if (hasSkip) {
  const checked = await optPage.isChecked("#skipAnswered");
  console.log("当前 skipAnswered 勾选状态 =", checked);
  await optPage.uncheck("#skipAnswered");
  await optPage.click("#save");
  await sleep(500);
  const stored = await sw.evaluate(async () => await chrome.storage.sync.get(null));
  console.log("保存后 storage.skipAnswered =", stored.skipAnswered, "| autoFill =", stored.autoFill);
}
await optPage.screenshot({ path: path.join(out, "9_options_after.png"), fullPage: true });

// 3) 打开测试页看面板
const page = await ctx.newPage();
await page.goto("http://127.0.0.1:8777/fixture_31.html", { waitUntil: "load" });
await sleep(1500);
const hud = await page.evaluate(() => {
  const el = document.querySelector("#cxai-hud");
  if (!el) return { exists: false };
  const cs = getComputedStyle(el);
  return {
    exists: true,
    display: cs.display,
    visibility: cs.visibility,
    opacity: cs.opacity,
    rect: el.getBoundingClientRect().toJSON(),
    zIndex: cs.zIndex,
  };
});
console.log("页面 #cxai-hud =", JSON.stringify(hud));
const local = await sw.evaluate(async () => await chrome.storage.local.get(null));
console.log("storage.local =", JSON.stringify(local));
await page.screenshot({ path: path.join(out, "10_page_with_hud.png") });

// 4) 模拟"最小化"后再进页面：面板应仍可见（窄栏），而不是消失
await page.evaluate(() => document.querySelector("#cxai-close")?.click());
await sleep(300);
const mini = await page.evaluate(() => {
  const el = document.querySelector("#cxai-hud");
  const cs = getComputedStyle(el);
  return { cls: el.className, display: cs.display, visible: el.getBoundingClientRect().height > 0,
           bodyHidden: getComputedStyle(el.querySelector("#cxai-body")).display };
});
console.log("点击 × 之后 =", JSON.stringify(mini));
await page.screenshot({ path: path.join(out, "11_page_minimized.png") });

await page.reload({ waitUntil: "load" });
await sleep(1500);
const afterReload = await page.evaluate(() => {
  const el = document.querySelector("#cxai-hud");
  if (!el) return { exists: false };
  return { exists: true, cls: el.className, height: Math.round(el.getBoundingClientRect().height) };
});
console.log("刷新后（应保持最小化且仍可见）= ", JSON.stringify(afterReload));

console.log("\n设置页错误:", errors.length ? errors : "无");
await sleep(400);
await ctx.close();
