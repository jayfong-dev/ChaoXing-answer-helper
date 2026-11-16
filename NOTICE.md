# NOTICE

**完整的免责声明、数据与隐私说明、使用条款见 [README.md](README.md#声明)。**
本文件只记录第三方依赖与商标信息，避免同一套声明维护两份而彼此矛盾。

## 运行时依赖

本扩展是纯前端代码，**不包含**任何第三方运行时依赖。所有逻辑为原生
JavaScript + CSS，直接运行在浏览器扩展沙箱内。

## 仅开发 / 测试使用（不随扩展分发）

| 依赖 | 用途 | 许可 |
|---|---|---|
| `jsdom` | `test/dom_test.mjs` 模拟 DOM | MIT |
| `playwright-core` | `test/e2e_*.mjs` 驱动真实浏览器 | Apache-2.0 |

打包脚本已排除 `node_modules/` 与 `__pycache__`，这两项不会进入发布包。

## 字体与图形

| 资源 | 说明 |
|---|---|
| 界面字体 | 系统字体栈（`-apple-system` / `Segoe UI` / `Microsoft YaHei`），不分发字体文件 |
| 图标 | 由 `icons/generate_icons.py` 以 Pillow 绘制生成，无第三方素材 |

## 商标

本扩展与超星、学习通、DeepSeek 等平台或公司
均无隶属、代理或背书关系，未获其授权。文档中出现的平台名称仅用于说明适用范围。
