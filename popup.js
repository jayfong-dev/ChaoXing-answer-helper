// popup.js —— Assistant · 答题助手
const $ = (id) => document.getElementById(id);

async function loadStats() {
  const el = $("stats");
  try {
    const r = await chrome.runtime.sendMessage({ type: "GET_STATS" });
    const st = r?.stats;
    if (!st || !st.questions) { el.textContent = "今日还没有请求"; return; }
    const tok = (st.inTok || 0) + (st.cachedTok || 0) + (st.outTok || 0);
    el.innerHTML = `${st.questions} 题 · ${tok >= 1000 ? (tok / 1000).toFixed(1) + "k" : tok} tok<small>≈$${(st.usd || 0).toFixed(6)} · ${st.day}</small>`;
  } catch (_) { el.textContent = "—"; }
}

async function showBalance() {
  const line = $("balLine");
  line.textContent = "查询中…";
  const r = await chrome.runtime.sendMessage({ type: "GET_BALANCE" });
  if (!r?.ok) { line.textContent = `查询失败：${r?.error || "无响应"}`; return; }
  const infos = r.balance?.balance_infos || [];
  if (!infos.length) { line.textContent = "未返回余额信息"; return; }
  line.textContent = infos
    .map((i) => `${i.currency} ${Number(i.total_balance).toFixed(2)}（赠送 ${Number(i.granted_balance).toFixed(2)}）`)
    .join("　");
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function checkApi() {
  try {
    const r = await chrome.runtime.sendMessage({ type: "PING" });
    if (!r?.ok) throw new Error("no-bg");
    const c = r.config;
    $("api").innerHTML = r.apiOk
      ? `已连通<small>${c.model} · ${new URL(c.baseUrl).host}</small>`
      : `连不上<small>${c.baseUrl}</small>`;
    $("apiDot").className = "dot" + (r.apiOk ? " on" : "");
    $("ver").textContent = "v" + chrome.runtime.getManifest().version;
  } catch (_) {
    $("api").textContent = "后台无响应";
  }
}

async function checkPage() {
  const tab = await activeTab();
  const v = $("page"),
    dot = $("pageDot");
  if (!tab?.id) {
    v.textContent = "—";
    return;
  }
  try {
    const r = await chrome.tabs.sendMessage(tab.id, { type: "PING_CONTENT" });
    if (r?.ok) {
      v.innerHTML = `已注入<small>${r.top ? "顶层页面" : "子框架"} · v${r.version}</small>`;
      dot.className = "dot on";
      $("run").disabled = false;
    } else throw new Error("x");
  } catch (_) {
    v.innerHTML = "未注入<small>按 F5 刷新页面后再点</small>";
    dot.className = "dot";
    $("run").disabled = true;
  }
}

async function sendToPage(cmd) {
  const tab = await activeTab();
  if (!tab?.id) return;
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: (k) => {
        const b = document.querySelector(k === "scan" ? "#cxai-scan" : "#cxai-start");
        b?.click();
      },
      args: [cmd],
    });
    window.close();
  } catch (_) {
    alert("这个页面注入不了：请确认是作业/测验页，并先按 F5 刷新。");
  }
}

$("run").onclick = () => sendToPage("run");
$("scan").onclick = () => sendToPage("scan");
$("opts").onclick = () => chrome.runtime.openOptionsPage();
$("balance").onclick = showBalance;

checkApi();
checkPage();
loadStats();
