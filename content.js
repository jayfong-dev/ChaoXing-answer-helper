// content.js — 超星/学习通 扫题 · 调 AI · 回填
// v1.6：按真实 mooc1/mooc2 作业页结构适配（div.answerBg + role=radio + typename + ueditor iframe）
(() => {
  if (window.__cxAIInjected) return;
  window.__cxAIInjected = true;

  const IS_TOP = (() => {
    try { return window.top === window.self; } catch (_) { return false; }
  })();

  // ── 选择器（按优先级，自定义的排最前） ──
  const SEL = {
    containers: [".questionLi", ".TiMu", ".singleQuesId", ".topic-item", ".questionItem"],
    stem: ["h3.mark_name", ".mark_name", ".Zy_TItle .clearfix", ".Zy_TItle", ".subject_describe"],
    options: [".stem_answer .answerBg", ".answerBg", ".Zy_ulTop li", ".answerList li", ".optionList li"],
  };

  const TYPE_MAP = {
    单选题: "single", 单选: "single",
    多选题: "multiple", 多选: "multiple", 不定项: "multiple",
    判断题: "judge", 判断: "judge",
    填空题: "fill", 填空: "fill",
    简答题: "essay", 简答: "essay", 论述题: "essay", 名词解释: "essay", 计算题: "essay",
    其它: "essay", 其他: "essay", 编程题: "essay", 分析题: "essay", 综合题: "essay",
  };

  const state = { running: false, stop: false, stats: { total: 0, done: 0, ok: 0, fail: 0 } };
  const SS = {
    get(k) { try { return sessionStorage.getItem(k); } catch (_) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch (_) {} },
  };
  const FRAME_TAG = IS_TOP ? "" : "[子框架] ";
  // 本次运行的用量累计
  const sessionCost = { questions: 0, inTok: 0, outTok: 0, cachedTok: 0, usd: 0 };

  // ───────── 日志 / HUD ─────────
  let hud = null, logBox = null;
  const postToTop = (kind, payload) => {
    if (IS_TOP) return;
    try { window.top.postMessage({ __cxai: kind, ...payload }, "*"); } catch (_) {}
  };
  function log(msg, cls = "") {
    if (!IS_TOP) return postToTop("log", { msg, cls });
    if (!logBox) return;
    const line = document.createElement("div");
    line.className = "cxai-line " + cls;
    line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    logBox.appendChild(line);
    logBox.scrollTop = logBox.scrollHeight;
    if (logBox.childElementCount > 300) logBox.firstElementChild.remove();
  }
  function setStat(t) { if (IS_TOP && hud) { const e = hud.querySelector("#cxai-stat"); if (e) e.textContent = t; } }

  // 底部「本次消耗」：题数 · tokens · 估算费用
  function updateCostFooter() {
    if (!IS_TOP || !hud) return;
    const el = hud.querySelector(".cxai-cost");
    if (!el) return;
    const tok = sessionCost.inTok + sessionCost.cachedTok + sessionCost.outTok;
    el.textContent = sessionCost.questions
      ? `${sessionCost.questions} 题 · ${fmtTok(tok)} tok · ≈$${sessionCost.usd.toFixed(6)}`
      : "—";
    el.title = `输入 ${sessionCost.inTok}（缓存 ${sessionCost.cachedTok}） / 输出 ${sessionCost.outTok}`;
  }

  function fmtTok(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
    if (n >= 1000) return (n / 1000).toFixed(1) + "k";
    return String(n);
  }

  function buildHud() {
    hud = document.createElement("div");
    hud.id = "cxai-hud";
    hud.innerHTML = `
      <div class="cxai-head" id="cxai-drag">
        <span class="cxai-title">Assistant</span>
        <span class="cxai-stat" id="cxai-stat">空闲</span>
        <button class="cxai-btn" id="cxai-fold" title="折叠">—</button>
        <button class="cxai-btn" id="cxai-close" title="关闭">×</button>
      </div>
      <div class="cxai-body" id="cxai-body">
        <div class="cxai-row">
          <button class="cxai-btn primary" id="cxai-start">开始答题</button>
          <button class="cxai-btn" id="cxai-stop">停止</button>
          <button class="cxai-btn" id="cxai-scan">只扫描</button>
        </div>
        <div class="cxai-log" id="cxai-log"></div>
      </div>`;
    document.documentElement.appendChild(hud);
    logBox = hud.querySelector("#cxai-log");

    try {
      const pos = JSON.parse(localStorage.getItem("cxai_pos") || "null");
      if (pos && Number.isFinite(pos.left) && Number.isFinite(pos.top)) {
        // 钳制到可视区，防止窗口变小后跑到屏幕外"看不见"
        const maxL = Math.max(0, innerWidth - 200);
        const maxT = Math.max(0, innerHeight - 60);
        const left = Math.min(Math.max(0, pos.left), maxL);
        const top = Math.min(Math.max(0, pos.top), maxT);
        hud.style.left = left + "px";
        hud.style.top = top + "px";
        hud.style.right = "auto";
        hud.style.bottom = "auto";
      }
    } catch (_) {}

    hud.querySelector("#cxai-fold").onclick = () => {
      const b = hud.querySelector("#cxai-body");
      b.style.display = b.style.display === "none" ? "" : "none";
    };
    // × = 最小化成一条窄栏（不会彻底消失，点标题回到完整面板）
    hud.querySelector("#cxai-close").onclick = (e) => {
      e.stopPropagation();
      hud.classList.add("cxai-mini");
      chrome.storage.local.set({ hudHidden: true });
    };
    hud.querySelector(".cxai-head").addEventListener("click", (e) => {
      if (!hud.classList.contains("cxai-mini")) return;
      if (e.target.closest("button")) return;
      hud.classList.remove("cxai-mini");
      chrome.storage.local.set({ hudHidden: false });
    });
    hud.querySelector("#cxai-start").onclick = () => runAll("answer");
    hud.querySelector("#cxai-stop").onclick = () => { state.stop = true; broadcast("stop"); };
    hud.querySelector("#cxai-scan").onclick = () => runAll("scan");

    const head = hud.querySelector("#cxai-drag");
    let dragging = false, ox = 0, oy = 0;
    head.addEventListener("mousedown", (e) => {
      if (e.target.closest("button")) return;
      dragging = true;
      const r = hud.getBoundingClientRect();
      ox = e.clientX - r.left; oy = e.clientY - r.top;
      hud.style.left = r.left + "px"; hud.style.top = r.top + "px";
      hud.style.right = "auto"; hud.style.bottom = "auto";
      e.preventDefault();
    });
    window.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      hud.style.left = Math.max(0, Math.min(innerWidth - hud.offsetWidth, e.clientX - ox)) + "px";
      hud.style.top = Math.max(0, Math.min(innerHeight - 40, e.clientY - oy)) + "px";
    });
    window.addEventListener("mouseup", () => {
      if (!dragging) return;
      dragging = false;
      try { localStorage.setItem("cxai_pos", JSON.stringify({ left: hud.offsetLeft, top: hud.offsetTop })); } catch (_) {}
    });

    // 主题（graphite / paper / ink）
    chrome.storage.sync.get({ theme: "graphite", model: "" }).then((c) => {
      hud.dataset.theme = c.theme || "graphite";
      const m = hud.querySelector(".cxai-model");
      if (m && c.model) m.textContent = c.model;
    });

    let ver = "?";
    try { ver = chrome.runtime.getManifest().version; } catch (_) {}
    // 底部状态条
    const foot = document.createElement("div");
    foot.className = "cxai-foot";
    foot.innerHTML =
      '<span class="cxai-dot"></span>' +
      '<span class="cxai-model">未配置接口</span>' +
      '<span class="cxai-cost" title="本次运行累计">—</span>' +
      `<span class="cxai-sign">v${ver} · by JF</span>`;
    hud.querySelector("#cxai-body").appendChild(foot);

    log(`已加载 v${ver}。点「只扫描」先看能不能认出题目。`);
  }

  // ───────── 配置 ─────────
  const cfg = async () => await chrome.storage.sync.get({
    autoFill: true, autoNext: false, skipAnswered: true,
    existingMode: "overwrite", minConfidence: 0.7, theme: "graphite",
    visionMode: "auto", visionDetail: "original", maxImagesPerQuestion: 2,
    delayMs: 800, maxQuestions: 300,
    customContainers: "", customStem: "", customOptions: "",
  });
  const selList = (key, custom) => {
    const extra = String(custom || "").split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
    return [...extra, ...SEL[key]];
  };
  const textOf = (el) => (el?.innerText || el?.textContent || "").replace(/\s+/g, " ").trim();

  // ───────── 提取 ─────────
  const USABLE = ".answerBg, [role=radio], [role=checkbox], input[type=radio], input[type=checkbox], textarea, input[type=text], iframe";

  function findContainers(c) {
    const out = [], seen = new Set();
    for (const sel of selList("containers", c.customContainers)) {
      let nodes = [];
      try { nodes = document.querySelectorAll(sel); } catch (_) { continue; }
      for (const n of nodes) {
        if (seen.has(n)) continue;
        const hasTypename = n.hasAttribute("typename");
        if (!hasTypename && !n.querySelector(USABLE)) continue;
        // 被已收录的外层包含 → 跳过
        if (out.some((p) => p.contains(n))) continue;
        seen.add(n);
        out.push(n);
      }
    }
    // 关键：剔除"包裹层"——如果某个容器内部还包含另一个容器，它就不是一道题
    const filtered = out.filter(
      (n) => !out.some((m) => m !== n && n.contains(m))
    );
    // 再剔除不可见/模板节点
    return filtered.filter((n) => {
      try {
        const cs = getComputedStyle(n);
        if (cs.display === "none" || cs.visibility === "hidden") return false;
      } catch (_) {}
      return true;
    });
  }

  function typeOf(box) {
    // 1) 页面自己标的 typename，最可靠
    const tn = (box.getAttribute("typename") || "").trim();
    for (const k in TYPE_MAP) if (tn.includes(k)) return TYPE_MAP[k];
    // 2) 题干里的括号标注，如 (单选题)
    const head = textOf(box.querySelector("h3.mark_name, .mark_name, .Zy_TItle") || box).slice(0, 120);
    for (const k in TYPE_MAP) if (head.includes(k)) return TYPE_MAP[k];
    // 3) 结构判断
    if (box.querySelector('input[type=checkbox], [role=checkbox]')) return "multiple";
    if (box.querySelector('input[type=radio], [role=radio], .answerBg')) return "single";
    // 有明确的空位标记才算填空
    if (box.querySelector("span.tiankong") || /第\s*\d+\s*空/.test(textOf(box))) return "fill";
    if (box.querySelector("iframe, textarea, [contenteditable=true]")) return "essay";
    if (box.querySelector('input[type=text]')) return "fill";
    return "unknown";
  }

  function stemOf(box) {
    // 逐个候选选择器取样，取"信息量最大"的那段，避免只拿到 (单选题) 这种标签
    const cands = [];
    for (const sel of SEL.stem) {
      let els = [];
      try { els = box.querySelectorAll(sel); } catch (_) { continue; }
      for (const el of els) {
        let t = textOf(el);
        if (!t) continue;
        t = t.replace(/^[\d\.、\s]+/, "")
             .replace(/[（(](单选题|多选题|判断题|填空题|简答题|论述题|名词解释|计算题|其它|其他|不定项选择题)[)）]/g, "")
             .trim();
        if (t) cands.push(t);
      }
    }
    if (!cands.length) {
      const t = textOf(box.querySelector(".Zy_TItle")) || "";
      if (t) cands.push(t);
    }
    cands.sort((a, b) => b.length - a.length);
    return (cands[0] || "").slice(0, 2000);
  }

  function optionsOf(box, c) {
    const list = [], seen = new Set();
    for (const sel of selList("options", c.customOptions)) {
      let nodes = [];
      try { nodes = box.querySelectorAll(sel); } catch (_) { continue; }
      for (const node of nodes) {
        let letter = "";
        const spanEl = node.querySelector("span[data]");
        if (spanEl) letter = (spanEl.getAttribute("data") || "").trim();
        if (!letter) {
          const al = node.getAttribute("aria-label") || "";
          letter = (al.match(/^([A-H])/i) || [])[1] || "";
        }
        let text = textOf(node.querySelector(".answer_p")) || textOf(node);
        if (letter) text = text.replace(new RegExp("^" + letter + "[\\s\\.、．:：]*", "i"), "");
        text = text.replace(/选择$/, "").trim();
        const key = (letter || "") + text.slice(0, 30);
        if (!text || seen.has(key)) continue;
        seen.add(key);
        list.push({ el: node, text, letter });
      }
      if (list.length >= 2) break;
    }
    list.forEach((o, i) => { if (!o.letter) o.letter = String.fromCharCode(65 + i); });
    return list.slice(0, 12);
  }

  // 填空题：数空位（每个空一个 ueditor iframe，或 [id^=ueditor]）
  function blankCount(box) {
    const marks = box.querySelectorAll("span.tiankong");
    if (marks.length) return marks.length;
    const ifr = box.querySelectorAll("iframe");
    if (ifr.length) return ifr.length;
    const m = textOf(box).match(/第\s*(\d+)\s*空/g);
    return m ? m.length : 1;
  }

  // 填空题的空位 → 对应的 ueditor iframe（按 DOM 顺序）
  function blankEditors(box) {
    const out = [];
    const slots = box.querySelectorAll("span.tiankong");
    if (slots.length) {
      slots.forEach((sp) => {
        const holder = sp.parentElement;
        const f = holder?.querySelector("iframe") || null;
        out.push(f);
      });
      if (out.some(Boolean)) return out;
    }
    return [...box.querySelectorAll("iframe")];
  }

  // 题干里的图片（流程图 / 网络图 / 表格截图等）
  function imagesOf(box) {
    const out = [];
    for (const img of box.querySelectorAll("img")) {
      const src = img.currentSrc || img.src;
      if (!src) continue;
      const w = img.naturalWidth || img.clientWidth || 0;
      const h = img.naturalHeight || img.clientHeight || 0;
      if (w && h && (w < 120 || h < 80)) continue;   // 跳过图标/装饰图
      if (out.includes(src)) continue;
      out.push(src);
    }
    // 背景图（部分题目用 background-image 放图）
    for (const el of box.querySelectorAll('[style*="background"]')) {
      const m = (el.getAttribute("style") || "").match(/url\(["']?([^"')]+)["']?\)/);
      if (m && m[1] && !out.includes(m[1])) out.push(m[1]);
    }
    return out.slice(0, 6);
  }

  function collect(c) {
    return findContainers(c).slice(0, c.maxQuestions).map((box, idx) => {
      const type = typeOf(box);
      const options = type === "fill" || type === "essay" ? [] : optionsOf(box, c);
      return {
        idx, box, type, options,
        stem: stemOf(box),
        blanks: type === "fill" ? blankCount(box) : 0,
        images: imagesOf(box),
      };
    });
  }

  // 读出页面上"已有的答案"，用于判卷
  function getExistingAnswer(q) {
    const parts = [];
    if (q.type === "single" || q.type === "multiple" || q.type === "judge") {
      for (const el of q.box.querySelectorAll('.answerBg[aria-checked="true"], .answerBg.checked')) {
        const sp = el.querySelector("span[data]");
        const letter = sp?.getAttribute("data") || (el.querySelector(".answer_p")?.innerText || "").slice(0, 12);
        if (letter) parts.push(String(letter).trim());
      }
      if (!parts.length) {
        for (const inp of q.box.querySelectorAll("input[type=radio], input[type=checkbox]")) {
          if (inp.checked && inp.value) parts.push(String(inp.value).trim());
        }
      }
      const hid = q.box.querySelector('input[type=hidden][name^="answer"]:not([name^="answertype"])');
      if (!parts.length && hid && (hid.value || "").trim()) parts.push(hid.value.trim());
      return parts.join(",");
    }

    const editors = q.type === "fill" ? blankEditors(q.box) : [...q.box.querySelectorAll("iframe")];
    for (const f of editors) {
      try {
        const t = (f?.contentDocument?.body?.innerText || "").trim();
        if (t && t !== "undefined") parts.push(t);
      } catch (_) {}
    }
    if (!parts.length) {
      const ta = q.box.querySelector("textarea") || q.box.querySelector('input[type=text]');
      if (ta && (ta.value || "").trim()) parts.push(ta.value.trim());
    }
    return parts.join(" | ");
  }

  // 已有答案判定（避免覆盖用户手填的内容）
  function hasAnswer(q) {
    if (q.type === "single" || q.type === "multiple" || q.type === "judge") {
      if (q.box.querySelector('.answerBg[aria-checked="true"], .answerBg.checked')) return true;
      for (const inp of q.box.querySelectorAll('input[type=radio], input[type=checkbox]')) {
        if (inp.checked) return true;
      }
      // 注意排除 answertypeXXX（题型字段，值永远非空，会误判成"已有答案"）
      const hid = q.box.querySelector('input[type=hidden][name^="answer"]:not([name^="answertype"])');
      if (hid && (hid.value || "").trim()) return true;
      return false;
    }
    // 填空 / 简答：编辑器里有字就算已有答案
    const frames = q.type === "fill" ? blankEditors(q.box) : [...q.box.querySelectorAll("iframe")];
    for (const f of frames) {
      try {
        const t = (f?.contentDocument?.body?.innerText || "").trim();
        if (t && t !== "undefined") return true;
      } catch (_) {}
    }
    return false;
  }

  // ───────── 回填 ─────────
  const fireClick = (el) => {
    for (const ev of ["pointerdown", "mousedown", "mouseup", "click"])
      el.dispatchEvent(new MouseEvent(ev, { bubbles: true, cancelable: true, view: window }));
  };

  function setNativeValue(el, v) {
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    setter ? setter.call(el, v) : (el.value = v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  // 写入 ueditor iframe（同源可直接操作 contentDocument）
  // 让页面的 ueditor 自己 sync 回隐藏域（$EDITORUI / UE 两套 API 都试）
  function syncUEditor(editorEl) {
    const id = editorEl?.id || "";
    if (!id) return;
    try {
      const sc = document.createElement("script");
      sc.textContent = `(function(){try{
        var id=${JSON.stringify(id)};
        var ui=window.$EDITORUI&&window.$EDITORUI[id];
        if(ui){ if(ui.sync) ui.sync(); else if(ui.syncAfterCmd) ui.syncAfterCmd(); }
        var ed=window.UE&&window.UE.getEditor&&window.UE.getEditor(id);
        if(ed&&ed.sync) ed.sync();
      }catch(e){}})();`;
      (document.head || document.documentElement).appendChild(sc);
      sc.remove();
    } catch (_) {}
  }

  function fillUeditor(frame, text) {
    let doc;
    try { doc = frame.contentDocument; } catch (_) { return false; }
    if (!doc || !doc.body) return false;
    const body = doc.body;
    let done = false;

    // 首选：用真实编辑命令写入，ueditor 自己会把内容同步进 textarea
    try {
      body.focus();
      const sel = doc.getSelection();
      const range = doc.createRange();
      range.selectNodeContents(body);
      sel.removeAllRanges();
      sel.addRange(range);
      done = doc.execCommand("insertText", false, text);
    } catch (_) {}

    // 兜底：直接改 DOM
    if (!done || !(body.innerText || "").trim()) {
      body.innerHTML = "";
      const p = doc.createElement("p");
      p.textContent = text;
      body.appendChild(p);
    }

    // 触发 ueditor 的监听，让它 sync 回隐藏域
    for (const type of ["input", "keyup", "change"]) {
      try { body.dispatchEvent(new Event(type, { bubbles: true })); } catch (_) {}
    }
    for (const type of ["blur", "keyup"]) {
      try { body.dispatchEvent(new KeyboardEvent(type, { bubbles: true })); } catch (_) {}
    }
    try { body.blur(); } catch (_) {}
    // 让编辑器把内容 sync 回隐藏域
    const editorEl = frame.closest?.(".edui-editor") || frame.parentElement?.closest?.(".edui-editor");
    if (editorEl) syncUEditor(editorEl);
    return true;
  }

  // 判断某个选项当前是否"已选中"
  function isSelected(el) {
    if (!el) return false;
    if (el.getAttribute && el.getAttribute("aria-checked") === "true") return true;
    if (el.classList && (el.classList.contains("checked") || el.classList.contains("cur"))) return true;
    const inp = el.querySelector ? el.querySelector("input[type=radio], input[type=checkbox]") : null;
    if (inp && inp.checked) return true;
    if (el.tagName === "INPUT" && el.checked) return true;
    return false;
  }

  // 统一点击逻辑：兼容超星 div.answerBg(onclick) 与普通 input[type=radio/checkbox]
  // 关键：超星的 addChoice 是"切换"语义，已选中的再点会取消 → 已选中就跳过，点完还要复核
  function clickOption(opt) {
    const el = opt.el;
    const inp = el.querySelector('input[type=radio], input[type=checkbox]');

    // ① 已经选中：不再点，避免被 toggle 掉
    if (isSelected(el)) {
      if (inp && !inp.checked) { inp.checked = true; inp.dispatchEvent(new Event("change", { bubbles: true })); }
      return { ok: true, already: true };
    }

    const roleEl = el.querySelector('[role=radio], [role=checkbox]');
    const selfRole = el.getAttribute && (el.getAttribute("role") || el.hasAttribute("onclick"));

    // ② 正常点击（超星走这条）
    if (selfRole) fireClick(el);
    if (roleEl && roleEl !== el) fireClick(roleEl);
    if (inp && !inp.checked) {
      fireClick(inp);
      if (!inp.checked) inp.click();
    }

    // ③ 复核：如果点完还是没选中（说明被 toggle 掉了或其他原因），补一次原生置位
    if (!isSelected(el)) {
      if (selfRole) fireClick(el);
      if (inp && !inp.checked) {
        inp.checked = true;
        inp.dispatchEvent(new Event("change", { bubbles: true }));
      }
      if (!isSelected(el)) {
        el.setAttribute("aria-checked", "true");
        el.classList.add("checked");
      }
    }
    return { ok: true };
  }

  function matchOption(options, ans) {
    const a = String(ans).trim(), up = a.toUpperCase();
    if (/^[A-H]$/.test(up)) {
      const hit = options.find((o) => (o.letter || "").toUpperCase() === up);
      if (hit) return hit;
    }
    const hit2 = options.find((o) => o.text === a) || options.find((o) => o.text.includes(a) || a.includes(o.text.slice(0, 8)));
    if (hit2) return hit2;
    if (/^(对|正确|true|T|√)$/i.test(a)) return options.find((o) => /对|正确|true|√/i.test(o.text));
    if (/^(错|错误|false|F|×)$/i.test(a)) return options.find((o) => /错|错误|false|×/i.test(o.text));
    return null;
  }

  function fillQuestion(q, answer) {
    const ans = (Array.isArray(answer) ? answer : [answer]).map((x) => String(x).trim()).filter(Boolean);
    if (!ans.length) return { ok: false, reason: "模型没给答案" };

    // 填空 / 简答
    if (q.type === "fill" || q.type === "essay") {
      if (q.type === "fill") {
        const editors = blankEditors(q.box);
        if (editors.length) {
          let filled = 0;
          editors.forEach((f, i) => {
            const t = ans[i] ?? (ans.length === 1 ? ans[0] : "");
            if (f && t && fillUeditor(f, t)) {
              let ok = false;
              try { ok = (f.contentDocument?.body?.innerText || "").trim().length > 0; } catch (_) {}
              if (ok) filled++;
            }
          });
          return filled ? { ok: true, applied: `${filled}/${editors.length} 空` } : { ok: false, reason: "写不进编辑器" };
        }
      }
      const frames = [...q.box.querySelectorAll("iframe")];
      if (frames.length) {
        let filled = 0;
        const t = ans.join("\n");
        if (fillUeditor(frames[0], t)) filled = 1;
        return filled ? { ok: true, applied: "已写入编辑器" } : { ok: false, reason: "写不进编辑器" };
      }
      const field = q.box.querySelector("textarea") || q.box.querySelector('input[type=text]');
      if (!field) return { ok: false, reason: "找不到输入框" };
      setNativeValue(field, ans.join(" "));
      return { ok: true, applied: ans.join(" ") };
    }

    // 选项类
    if (!q.options.length) return { ok: false, reason: "没解析出选项" };
    const picked = [];
    for (const a of ans.slice(0, q.type === "multiple" ? 12 : 1)) {
      const opt = matchOption(q.options, a);
      if (!opt) continue;
      clickOption(opt);
      picked.push(opt.letter);
    }
    return picked.length
      ? { ok: true, applied: picked.join(",") }
      : { ok: false, reason: "选项没匹配：" + ans.join(",") };
  }

  // ───────── 主流程 ─────────
  async function runLocal(mode) {
    const c = await cfg();
    const qs = collect(c);
    state.stats = { total: qs.length, done: 0, ok: 0, fail: 0 };
    if (!qs.length) {
      if (IS_TOP) log("这一层没扫到题目。", "warn"); // 子框架（如 ueditor）不刷屏
      return 0;
    }

    const byType = qs.reduce((m, q) => ((m[q.type] = (m[q.type] || 0) + 1), m), {});
    log(`${FRAME_TAG}扫到 ${qs.length} 题：` + Object.entries(byType).map(([k, v]) => `${k}×${v}`).join(" · "), "ok");
    if (mode === "scan") return qs.length;

    for (const q of qs) {
      if (state.stop) { log("已停止", "warn"); break; }

      // ── 已有答案的处理策略：跳过 / 先判卷再决定 / 直接覆盖 ──
      const existing = getExistingAnswer(q);
      const mode = c.existingMode || "skip";
      if (existing && mode !== "overwrite") {
        if (mode === "skip") {
          log(`${FRAME_TAG}#${q.idx + 1} 已有答案（${existing.slice(0, 20)}），跳过`, "warn");
          continue;
        }
        // check：交给模型判卷
        log(`${FRAME_TAG}#${q.idx + 1} [${q.type}] 已有答案「${existing.slice(0, 24)}」，判卷中…`, "warn");
        try {
          const v = await chrome.runtime.sendMessage({
            type: "VERIFY",
            payload: {
              stem: q.stem, type: q.type, existing,
              options: q.options.map(({ letter, text }) => ({ letter, text })),
            },
          });
          if (!v?.ok) throw new Error(v?.error || "判卷无响应");
          if (v.correct) {
            log(`${FRAME_TAG}    ✔ 答案正确，保留（置信度 ${(v.confidence ?? 0).toFixed(2)}）`, "ok");
            state.stats.kept = (state.stats.kept || 0) + 1;
            continue;
          }
          const minConf = Number(c.minConfidence);
          const conf = Number(v.confidence ?? 0);
          if (!v.answer?.length || (Number.isFinite(minConf) && conf < minConf)) {
            log(`${FRAME_TAG}    ✖ 判定有误但置信度仅 ${conf.toFixed(2)}，保守起见保留原答案`, "warn");
            continue;
          }
          log(`${FRAME_TAG}    ✖ 答案错误 → 更正为 ${JSON.stringify(v.answer)}（${v.reason || ""}）`, "warn");
          if (!c.autoFill) { log(`${FRAME_TAG}   （只显示不填）`, "warn"); continue; }
          const fix = fillQuestion(q, v.answer);
          fix.ok ? (state.stats.fixed = (state.stats.fixed || 0) + 1, log(`${FRAME_TAG}    已更正：${fix.applied}`, "ok"))
                 : (state.stats.fail++, log(`${FRAME_TAG}    更正失败：${fix.reason}`, "err"));
        } catch (e) {
          log(`${FRAME_TAG}    判卷出错（${e.message}），保留原答案`, "err");
        }
        state.stats.done++;
        const dd = Number(c.delayMs);
        await new Promise((r) => setTimeout(r, Number.isFinite(dd) && dd >= 0 ? dd : 800));
        continue;
      }

      log(`${FRAME_TAG}#${q.idx + 1} [${q.type}${q.blanks ? `/${q.blanks}空` : ""}] ${q.stem.slice(0, 36)}…`);
      try {
        const r = await chrome.runtime.sendMessage({
          type: "ASK",
          payload: {
            stem: q.stem, type: q.type, blanks: q.blanks,
            latex: q.latex || [], tables: q.tables || [],
            images: q.images || [],
            options: q.options.map(({ letter, text }) => ({ letter, text })),
          },
        });
        if (!r?.ok) throw new Error(r?.error || "接口无响应");
        log(`${FRAME_TAG}    AI：${JSON.stringify(r.answer)}`, "ai");
        if (r.imageCount) log(`${FRAME_TAG}    [vision] 附加 ${r.imageCount} 张图`, "ai");
        if (r?.usage) {
          const u = r.usage, c = r.cost || {};
          sessionCost.questions += 1;
          sessionCost.inTok += Math.max(0, (u.prompt_tokens || 0) - (c.cachedTok || 0));
          sessionCost.cachedTok += c.cachedTok || 0;
          sessionCost.outTok += u.completion_tokens || 0;
          sessionCost.usd += c.usd || 0;
          log(
            `${FRAME_TAG}    [usage] 入 ${u.prompt_tokens || 0}` +
              (c.cachedTok ? `(缓存 ${c.cachedTok})` : "") +
              ` / 出 ${u.completion_tokens || 0} · ≈$${(c.usd || 0).toFixed(6)}` +
              (c.peak ? " · 高峰价" : ""),
            "ai"
          );
          updateCostFooter();
        }
        if (!c.autoFill) log(`${FRAME_TAG}   （只显示不填）`, "warn");
        else {
          const res = fillQuestion(q, r.answer);
          res.ok ? (state.stats.ok++, log(`${FRAME_TAG}    已填：${res.applied}`, "ok"))
                 : (state.stats.fail++, log(`${FRAME_TAG}    未填：${res.reason}`, "err"));
        }
      } catch (e) {
        state.stats.fail++;
        log(`${FRAME_TAG}    出错：${e.message}`, "err");
      }
      state.stats.done++;
      const d = Number(c.delayMs);
      await new Promise((r) => setTimeout(r, Number.isFinite(d) && d >= 0 ? d : 800));
    }

    log(`${FRAME_TAG}完成：新答 ${state.stats.ok}，更正 ${state.stats.fixed || 0}，` +
        `判卷保留 ${state.stats.kept || 0}，失败 ${state.stats.fail}，共 ${state.stats.total}`, "ok");
    return qs.length;
  }

  function broadcast(cmd) {
    const msg = { __cxai: "cmd", cmd };
    for (let i = 0; i < window.frames.length; i++) {
      try { window.frames[i].postMessage(msg, "*"); } catch (_) {}
    }
  }

  // 首次运行的一次性提示
  async function maybeNotice() {
    try {
      const r = await chrome.storage.local.get({ noticeSeen: false });
      if (r.noticeSeen) return;
      await chrome.storage.local.set({ noticeSeen: true });
      log("提示：本工具仅辅助作答，答案由模型生成，提交前请自行核对。", "warn");
    } catch (_) {}
  }

  async function runAll(mode) {
    state.stop = false;
    if (mode !== "scan") await maybeNotice();
    const btn = hud?.querySelector("#cxai-start");
    if (btn) btn.disabled = true;
    setStat(mode === "scan" ? "扫描中" : "运行中");
    if (mode === "scan") SS.set("cxai_frame_total", "0");
    const n = await runLocal(mode);
    broadcast(mode === "scan" ? "scan" : "answer");
    if (mode === "scan") {
      setTimeout(() => {
        const extra = Number(SS.get("cxai_frame_total") || 0);
        setStat(extra ? `${n}+${extra} 题` : `${n} 题`);
      }, 1500);
    } else {
      setTimeout(() => setStat("完成"), 1500);
    }
    if (btn) btn.disabled = false;
  }

  // ───────── 通信 ─────────
  if (IS_TOP) {
    buildHud();
    chrome.storage.local.get({ hudHidden: false }).then((r) => {
      if (r.hudHidden && hud) hud.classList.add("cxai-mini");
    });
    window.addEventListener("message", (e) => {
      const d = e.data;
      if (!d || typeof d !== "object" || typeof d.__cxai !== "string") return;
      if (d.__cxai === "log") log(d.msg, d.cls || "");
      if (d.__cxai === "count") SS.set("cxai_frame_total", String(Number(SS.get("cxai_frame_total") || 0) + Number(d.n || 0)));
      if (d.__cxai === "stop") state.stop = true;
    });
  } else {
    window.addEventListener("message", (e) => {
      const d = e.data;
      if (!d || d.__cxai !== "cmd") return;
      if (d.cmd === "stop") { state.stop = true; return; }
      runLocal(d.cmd).then((n) => postToTop("count", { n })).catch(() => {});
    });
  }

  // 供工具栏弹窗探活（判断面板是否已注入本页）
  try {
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (msg?.type === "PING_CONTENT") {
        sendResponse({ ok: true, top: IS_TOP, version: (() => {
          try { return chrome.runtime.getManifest().version; } catch (_) { return "?"; }
        })() });
      }
    });
  } catch (_) {}

  window.__cxaiRun = (cmd) => {
    if (!IS_TOP || !hud) return;
    hud.classList.remove("cxai-mini");
    chrome.storage.local.set({ hudHidden: false });
    hud.querySelector(cmd === "scan" ? "#cxai-scan" : "#cxai-start")?.click();
  };
})();
