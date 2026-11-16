# 怎么测这个扩展

三种测法，从"完全不花钱、不碰真作业"到"真页面真模型"。

---

## 测法一：离线假接口（推荐先做，零成本）

**目的**：验证扩展能加载、能注入、能扫题、能回填。不联网、不调用真实模型、不花钱。

```powershell
cd "C:\Users\17939\Documents\deepseek-harness\default-workspace\ext\chaoxing-ai"

# 窗口 1：假 OpenAI 接口（8765）
python test/mock_api.py

# 窗口 2：测试页（8777）
python -m http.server 8777 -d test
```

浏览器打开 <http://127.0.0.1:8777/fixture.html>

扩展设置里改成：
- Base URL：`http://127.0.0.1:8765/v1`
- 模型名：`mock-answerer`
- API Key：留空

**预期**：右下角出现「AI 答题」面板 → 点「只扫描」→ 日志 `扫到 5 题：single, judge, multiple, fill, essay` → 点「开始答题」→ 5 题全填 → 状态胶囊变「完成」。

---

## 测法二：真模型 + 测试页（验证 key 和答案质量）

同一张测试页，把设置改回：
- Base URL：`https://api.deepseek.com/v1`
- 模型名：`deepseek-flash`
- API Key：你的 `sk-...`

先点「测试连接」，显示「连接成功，可用模型 N 个」。

再点「只扫描」「开始答题」，看日志里 AI 给的答案合不合理。这一步花几分钱，但能验证：key 有效、模型 id 正确、JSON 解析正常。

---

## 测法三：真学习通页面（最终验证）

1. 打开一份**练习/作业**（不建议一上来拿正式考试试）
2. **先点「只扫描」**，确认题数对不对 —— 这一步不改页面任何东西
3. 题数对了再点「开始答题」
4. 填完自己检查一遍，**手动**提交
5. 确认设置里「自动交卷」是**关**的

---

## 自动化（我这边会用的）

```powershell
npm i -D playwright-core     # 只第一次
node test/e2e_browser.mjs    # 自动开 Edge、加载扩展、跑 5 题、断言 6 项
```
它会用临时 Edge 配置 + `--load-extension` 启动，不碰你日常配置文件；截图落在 `test/shots/`。

```powershell
node test/dom_test.mjs       # 纯 jsdom，断言扫题/回填逻辑        → 6/6
node test/e2e_browser.mjs    # 真 Edge，5 题                     → 6/6
node test/e2e_iframe.mjs     # iframe 页面，面板唯一性            → 5/5
node test/e2e_chaoxing.mjs   # 22 题 + 包裹层 + 隐藏模板          → 6/6
node test/e2e_real31.mjs     # 31 题（照真实结构）               → 10/10
```

---

## 验收清单

| 检查项 | 通过标准 |
|---|---|
| 面板出现 | 右下角深色「AI 答题」面板，可折叠 |
| 扫题 | 「只扫描」打印的题数 = 页面实际题数 |
| 题型 | 日志里每题标 `single/judge/multiple/fill/essay` 正确 |
| 接口 | 「测试连接」返回模型数量 |
| 回填 | 单选取中、多选多选中、填空/简答有字 |
| 不改页面 | 「只扫描」后页面无任何变化 |
| 不提交 | 跑完不会自动点交卷（除非你开 `autoSubmit`） |

---

## 常见问题

| 现象 | 原因 | 处理 |
|---|---|---|
| 右下角没面板 | 装扩展前就开着页面 | F5 刷新 |
| 面板在但 0 题 | 该页面 DOM 不同 | F12 找 class，填设置页「自定义选择器」 |
| `HTTP 401` | key 错/没充值 | 终端验 key：`curl.exe -s https://api.deepseek.com/v1/models -H "Authorization: Bearer sk-xxx"` |
| `model_not_found` | 模型 id 写错 | 官方只认 `deepseek-flash` / `deepseek-v4-pro` |
| 连不上 127.0.0.1 | Ollama 未设跨域 | `setx OLLAMA_ORIGINS "*"` 后重启 Ollama |
| 改了代码没反应 | 没点刷新 | 扩展页 ↻ + 页面 F5 |
