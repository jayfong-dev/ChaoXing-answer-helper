#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""渲染「静答 QuietAnswer」极简黑白 UI 效果图"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUT = "docs/mockup_mono.png"
W, H = 1500, 1000

BLACK = (0, 0, 0)
PANEL = (12, 12, 14)
LAYER = (20, 20, 23)
HOVER = (28, 28, 32)
LINE_S = (255, 255, 255, 20)   # 弱描边
LINE_H = (255, 255, 255, 41)   # 强描边
WHITE = (255, 255, 255)
T2 = (154, 154, 159)
T3 = (94, 94, 100)

F = "C:/Windows/Fonts/msyh.ttc"
FB = "C:/Windows/Fonts/msyhbd.ttc"

def font(size, bold=False):
    return ImageFont.truetype(FB if bold else F, size)

img = Image.new("RGB", (W, H), BLACK)
d = ImageDraw.Draw(img)

def line(box, fill=LINE_S, w=1):
    d.line(box, fill=fill, width=w)

def rr(box, r=6, fill=None, outline=None, w=1):
    d.rounded_rectangle(box, r, fill=fill, outline=outline, width=w)

def txt(xy, s, size=12, color=WHITE, bold=False, anchor=None, spacing=None):
    d.text(xy, s, font=font(size, bold), fill=color, anchor=anchor)

def status(x, y, kind="idle", r=4):
    if kind == "idle":
        d.ellipse([x - r, y - r, x + r, y + r], outline=T3, width=1)
    elif kind == "run":
        d.ellipse([x - r, y - r, x + r, y + r], outline=WHITE, width=1)
        d.arc([x - r - 2, y - r - 2, x + r + 2, y + r + 2], 300, 360, fill=WHITE, width=2)
    elif kind == "done":
        d.ellipse([x - r, y - r, x + r, y + r], fill=WHITE)
    elif kind == "err":
        d.ellipse([x - r, y - r, x + r, y + r], outline=WHITE, width=1)
        d.line([(x - r + 1, y + r - 1), (x + r - 1, y - r + 1)], fill=WHITE, width=1)

def btn(box, label, primary=False, size=12):
    if primary:
        rr(box, 6, WHITE)
        txt(((box[0] + box[2]) / 2, (box[1] + box[3]) / 2), label, size, BLACK, True, anchor="mm")
    else:
        txt(((box[0] + box[2]) / 2, (box[1] + box[3]) / 2), label, size, T2, False, anchor="mm")

def mark(x, y, s=22):
    d.rounded_rectangle([x, y, x + s, y + s], 4, fill=WHITE)
    d.rounded_rectangle([x + 4, y + 6, x + s - 6, y + s - 10], 3, fill=BLACK)
    d.polygon([(x + s - 9, y + s - 9), (x + s - 3, y + s - 5), (x + s - 9, y + s - 3)], fill=BLACK)
    d.ellipse([x + s - 9, y + s - 9, x + s - 5, y + s - 5], fill=WHITE)

# ───── 页头 ─────
mark(46, 34, 23)
txt((80, 36), "静答 QuietAnswer", 17, WHITE, True)
txt((80, 60), "学习通 / 超星 · 判卷式答题助手", 12, T2)
txt((W - 46, 42), "黑白方案 · v1", 12, T3, anchor="ra")
line([(46, 96), (W - 46, 96)])

# ───── ② 工具栏弹窗（左） ─────
txt((46, 118), "工具栏弹窗", 12, T2, True)
rr([46, 146, 356, 520], 10, PANEL, LINE_S)
mark(64, 166, 20)
txt((94, 168), "静答", 13, WHITE, True)
txt((338, 170), "v1.9.1", 11, T3, anchor="ra")
line([(64, 200), (338, 200)])

# 状态行（表格式）
txt((64, 216), "接口", 11, T3)
txt((116, 215), "deepseek-flash", 12, WHITE)
status(332, 221, "done", 3)
txt((64, 240), "1.2s · 已连通", 10, T3)

line([(64, 264), (338, 264)])

txt((64, 278), "页面", 11, T3)
txt((116, 277), "已注入 · 31 题", 12, WHITE)
status(332, 283, "done", 3)
txt((64, 302), "fill×6 · single×11 · judge×11 · essay×3", 10, T3)

# 主按钮
btn([64, 336, 338, 376], "开始答题", True, 13)
btn([64, 388, 196, 412], "只扫描")
btn([206, 388, 338, 412], "设置")

line([(64, 440), (338, 440)])
txt((64, 454), "by YG · MIT · 关于", 10, T3)
txt((64, 474), "先「只扫描」确认题数，再开始", 10, (70, 70, 76))

# ───── ① 页面内 HUD（中） ─────
txt((420, 118), "页面内 HUD", 12, T2, True)

# 胶囊
rr([420, 146, 640, 186], 20, (0, 0, 0, 180), LINE_S)
status(442, 166, "run", 4)
txt((456, 160), "静答", 12, WHITE, True)
txt((524, 160), "3/31", 12, WHITE)
txt((614, 159), "·", 12, T3)

# 展开面板
rr([420, 206, 820, 590], 10, PANEL, LINE_S)
status(442, 228, "run", 4)
txt((456, 222), "静答", 12, WHITE, True)
txt((520, 222), "3/31", 12, WHITE)
txt((788, 220), "—", 12, T3)
txt((806, 219), "x", 11, T3)
line([(420, 248), (820, 248)])

btn([436, 264, 550, 300], "开始答题", True, 12)
btn([566, 264, 620, 300], "暂停")
btn([636, 264, 700, 300], "只扫描")

# 下划线 tab
tabs = [("判卷", True), ("跳过", False), ("覆盖", False)]
x = 436
for label, act in tabs:
    w = len(label) * 13 + 10
    txt((x, 320), label, 12, WHITE if act else T3, act)
    if act:
        line([(x, 342), (x + w - 10, 342)], WHITE, 1)
    x += w + 18
line([(436, 356), (804, 356)], (255, 255, 255, 14))

# 日志
logs = [
    ("#8", "已有 D → 判卷…", None),
    ("×", "错误，已改为 A", "mark"),
    ("#9", "已有 A → √ 正确，保留", None),
    ("#10", "[single] 匹配中…", "muted"),
    ("#11", "已有「对」→ √ 保留", None),
    ("#12", "[judge] 选项匹配…", "muted"),
]
yy = 372
for a, b, kind in logs:
    if kind == "mark":
        d.rectangle([436, yy - 1, 437, yy + 13], fill=WHITE)   # 左侧 1px 竖线
        txt((448, yy), a, 11, WHITE, True)
        txt((470, yy), b, 11, WHITE)
    else:
        col = (94, 94, 100) if kind == "muted" else T2
        txt((448, yy), a, 11, col)
        txt((470, yy), b, 11, col)
    yy += 26

# 状态条
line([(436, 538), (804, 538)], (255, 255, 255, 14))
status(444, 560, "done", 3)
txt((456, 553), "deepseek-flash", 10, T2)
txt((796, 553), "12s", 10, T3, anchor="ra")

# ───── ③ 设置页（右） ─────
txt((880, 118), "设置页", 12, T2, True)
rr([880, 146, 1454, 590], 10, PANEL, LINE_S)

# 左侧导航
line([(1000, 146), (1000, 590)])
navs = [("接口", True), ("答题行为", False), ("已有答案", False), ("高级", False), ("关于", False)]
yy = 178
for label, act in navs:
    if act:
        d.rectangle([896, yy - 3, 897, yy + 13], fill=WHITE)
        txt((910, yy), label, 12, WHITE, True)
    else:
        txt((910, yy), label, 12, T3)
    yy += 42

# 右侧表单
txt((1024, 172), "接口", 14, WHITE, True)

# 预设（下划线 tab 风格）
x = 1024
for label, act in (("V4.1-Flash", True), ("V4-Pro", False), ("Ollama", False)):
    w = len(label) * 11 + 8
    txt((x, 202), label, 11, WHITE if act else T3, act)
    if act:
        line([(x, 220), (x + w - 8, 220)], WHITE, 1)
    x += w + 20

for i, (label, value) in enumerate([
    ("Base URL", "https://api.deepseek.com/v1"),
    ("API Key", "sk-••••••••••••••••"),
    ("模型名", "deepseek-flash"),
]):
    y = 244 + i * 72
    txt((1024, y), label, 10, T3)
    rr([1024, y + 16, 1420, y + 50], 6, None, LINE_H)
    txt((1036, y + 25), value, 11, WHITE)

btn([1024, 470, 1124, 500], "测试连接")
status(1140, 485, "done", 3)
txt((1152, 478), "已连通 · 2 个模型", 10, T2)

line([(1024, 524), (1420, 524)])
txt((1024, 538), "已有答案的题", 12, WHITE, True)
x = 1024
for label, act in (("先判卷", True), ("跳过", False), ("覆盖", False)):
    w = len(label) * 13 + 10
    txt((x, 562), label, 11, WHITE if act else T3, act)
    if act:
        line([(x, 580), (x + w - 10, 580)], WHITE, 1)
    x += w + 18

# ───── 底部：状态对照 + 署名 ─────
line([(46, 626), (W - 46, 626)])
txt((46, 646), "黑白风格的状态语汇", 12, T2, True)

states = [("idle", "空闲", "空心圆 + 低对比"), ("run", "运行中", "圆环呼吸"),
          ("done", "完成", "实心圆"), ("err", "出错", "圆环加斜杠 + 下划线")]
x = 46
for kind, label, desc in states:
    rr([x, 674, x + 320, 742], 8, LAYER, LINE_S)
    status(x + 22, 700, kind, 5)
    txt((x + 38, 690), label, 12, WHITE, True)
    txt((x + 38, 712), desc, 10, T3)
    x += 340

txt((46, 768), "署名", 12, T2, True)
rows = [
    ("视觉", "静答 QuietAnswer · by YG · v1.9.1"),
    ("图标", "白底黑气泡 + 右下实心点（16px 只留轮廓）"),
    ("代码头", "/*! 静答 QuietAnswer v1.9.1 · (c) 2026 YG · MIT */"),
    ("规范", "无彩色 · 控件圆角 6 · 面板 10 · 内边距 16 · 仅浮层有阴影"),
]
yy = 794
for k, v in rows:
    txt((46, yy), k, 11, T3)
    txt((116, yy - 1), v, 11, WHITE)
    yy += 30

img.save(OUT)
print("saved", OUT, img.size)
