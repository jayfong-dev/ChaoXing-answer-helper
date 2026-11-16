# 配色方案（6 套）

> 全部保持极简、低饱和。效果图：`docs/palettes.png`

## 快速选择

| 场景 | 推荐 |
|---|---|
| 白页面上长期使用（超星默认） | **01 纯黑白** 或 **02 石墨** |
| 想要浅色界面、像纸一样安静 | **05 纸白** |
| 夜间 / 深色主题 | **02 石墨** 或 **06 陶土** |
| 想留一点品牌识别度 | **03 墨蓝** 或 **04 雾青**（只给主按钮 + 进度环上色，其余灰阶） |

---

## 01 纯黑白（当前方案）

```css
--pg-bg:      #FFFFFF   /* 页面底（不参与） */
--panel:      #0D0D0F
--line:       #262629   /* rgba(255,255,255,.10) */
--text:       #FFFFFF
--sub:        #9E9EA4
--accent:     #FFFFFF   /* 主按钮：白底黑字 */
--accent-fg:  #000000
```
性格：极简到底。零色彩，全凭形状与字重。
风险：对比度高，长时间盯着右下角会略扎眼。

## 02 石墨

```css
--panel:      #16181C
--line:       #2A2D33
--text:       #F2F4F7
--sub:        #98A0AB
--accent:     #E6E9EF   /* 主按钮：近白，非纯白 */
--accent-fg:  #0A0C10
```
性格：冷灰金属感，比纯黑柔一档，是"黑白"到"有色彩"之间最稳的过渡。
适合：桌面端默认值。

## 03 墨蓝

```css
--panel:      #101724
--line:       #23304A
--text:       #EAF0FF
--sub:        #8FA0BF
--accent:     #4C7DFF   /* 主按钮：蓝底白字 */
--accent-fg:  #FFFFFF
```
性格：唯一的一抹蓝，克制的专业感。
注意：**除主按钮与进度环外不要再用蓝色**，否则"极简"立刻变成"办公软件"。

## 04 雾青

```css
--panel:      #0E1616
--line:       #213232
--text:       #E9F5F3
--sub:        #8FA8A4
--accent:     #3FB6A8
--accent-fg:  #061412
```
性格：低饱和青绿，冷静、不刺眼，比蓝色更"工具"也更少见。
适合：想要辨识度但不想太张扬。

## 05 纸白（浅色）

```css
--pg-bg:      #F6F4EE   /* 页面底（暖白纸） */
--panel:      #FFFFFF
--line:       #E7E4DC
--text:       #1B1A17
--sub:        #6E6A62
--accent:     #1B1A17   /* 主按钮：墨黑底白字 */
--accent-fg:  #FFFFFF
```
性格：像纸一样安静，最贴"极简"本意。
注意：HUD 浮在白页上必须靠 1px 描边 + 双层阴影托住，否则会糊进页面（详见 `DESIGN-MONO.md` 10.3）。

## 06 陶土

```css
--panel:      #171312
--line:       #332A26
--text:       #F5EDE7
--sub:        #A79A92
--accent:     #D08A5C
--accent-fg:  #180E08
```
性格：暖调深色，夜里看最舒服，有"手工感"。
适合：长时间晚自习场景。

---

## 通用规则（任何配色都成立）

1. **主按钮只有一个**，其余按钮透明 + 1px 描边
2. **强调色只出现在两处**：主按钮填充、进度环弧线
3. 状态不靠颜色，靠 `○ / ● / ⊘` 与 `√ / ×` 符号（见 `DESIGN-MONO.md` 第二节）
4. 描边永远很淡：深色 `rgba(255,255,255,.10)`，浅色 `rgba(0,0,0,.12)`
5. 分割线内缩 16px，不通栏
6. 阴影双层：环境 `0 18px 48px`，接触 `0 2px 8px`
7. 日志区永远比面板**更深一档**（凹陷感）

## 实现方式（做主题切换）

`content.css` 里把颜色抽成 CSS 变量，挂在 `#cxai-hud` 上：

```css
#cxai-hud {
  --cxai-panel: #0D0D0F;
  --cxai-line: #262629;
  --cxai-text: #FFFFFF;
  --cxai-sub: #9E9EA4;
  --cxai-accent: #FFFFFF;
  --cxai-accent-fg: #000000;
  border-radius: 18px;
  background: var(--cxai-panel);
  color: var(--cxai-text);
}
#cxai-hud[data-theme="graphite"] { --cxai-panel:#16181C; /* … */ }
#cxai-hud[data-theme="paper"]    { --cxai-panel:#FFFFFF; /* … */ }
```

设置页给一个 6 选 1 的主题选择器，写进 `chrome.storage.sync.theme`，content script 启动时套到 `data-theme` 上。**主题只换变量，不改结构**，切换零成本。
