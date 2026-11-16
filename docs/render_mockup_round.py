#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""静答 QuietAnswer · 黑白 + 圆滑版 UI 效果图"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUT = "docs/mockup_round.png"
W, H = 1500, 1010

BLACK = (0, 0, 0)
PANEL = (13, 13, 15)
CARD = (20, 20, 23)
SUNK = (9, 9, 10)
LINE = (38, 38, 42)
LINE_H = (62, 62, 68)
WHITE = (255, 255, 255)
T2 = (158, 158, 164)
T3 = (98, 98, 104)

F = "C:/Windows/Fonts/msyh.ttc"
FB = "C:/Windows/Fonts/msyhbd.ttc"

def font(s, b=False): return ImageFont.truetype(FB if b else F, s)

img = Image.new("RGB", (W, H), BLACK)
d = ImageDraw.Draw(img)

def txt(xy, s, size=12, color=WHITE, bold=False, anchor=None):
    d.text(xy, s, font=font(size, bold), fill=color, anchor=anchor)

def soft_shadow(box, r, blur=18, alpha=150, dy=6):
    lay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(lay).rounded_rectangle([box[0], box[1] + dy, box[2], box[3] + dy], r, fill=(0, 0, 0, alpha))
    img.paste(Image.alpha_composite(img.convert("RGBA"), lay.filter(ImageFilter.GaussianBlur(blur))).convert("RGB"), (0, 0))

def panel(box, r=18, fill=PANEL, outline=LINE, shadow=True):
    if shadow: soft_shadow(box, r)
    dd = ImageDraw.Draw(img)
    dd.rounded_rectangle(box, r, fill=fill, outline=outline, width=1)

def pill(box, label, kind="ghost", size=12):
    r = (box[3] - box[1]) // 2
    if kind == "primary":
        d.rounded_rectangle(box, r, fill=WHITE)
        txt(((box[0]+box[2])/2, (box[1]+box[3])/2), label, size, BLACK, True, anchor="mm")
    elif kind == "soft":
        d.rounded_rectangle(box, r, fill=(33,33,37), outline=LINE, width=1)
        txt(((box[0]+box[2])/2, (box[1]+box[3])/2), label, size, WHITE, False, anchor="mm")
    else:
        txt(((box[0]+box[2])/2, (box[1]+box[3])/2), label, size, T2, False, anchor="mm")

def inset_line(x0, x1, y, inset=16, color=LINE):
    d.line([(x0 + inset, y), (x1 - inset, y)], fill=color, width=1)

def status(x, y, kind="idle", r=5):
    if kind == "idle": d.ellipse([x-r,y-r,x+r,y+r], outline=T3, width=1)
    elif kind == "run":
        d.ellipse([x-r,y-r,x+r,y+r], outline=WHITE, width=1)
        d.arc([x-r-2,y-r-2,x+r+2,y+r+2], 300, 360, fill=WHITE, width=2)
    elif kind == "done": d.ellipse([x-r,y-r,x+r,y+r], fill=WHITE)
    elif kind == "err":
        d.ellipse([x-r,y-r,x+r,y+r], outline=WHITE, width=1)
        d.line([(x-r+1,y+r-1),(x+r-1,y-r+1)], fill=WHITE, width=1)

def logo(x, y, s=24):
    d.rounded_rectangle([x, y, x+s, y+s], int(s*0.34), fill=WHITE)
    d.rounded_rectangle([x+s*0.20, y+s*0.30, x+s*0.72, y+s*0.64], int(s*0.20), fill=BLACK)
    d.polygon([(x+s*0.56, y+s*0.62), (x+s*0.84, y+s*0.78), (x+s*0.54, y+s*0.80)], fill=BLACK)
    d.ellipse([x+s*0.60, y+s*0.62, x+s*0.82, y+s*0.84], fill=WHITE)

# ── 页头 ──
logo(46, 32, 26)
txt((82, 34), "静答 QuietAnswer", 17, WHITE, True)
txt((82, 58), "黑白 · 圆滑版（radius 12–18 · pill 控件）", 12, T2)
txt((W-46, 40), "v2 视觉稿", 12, T3, anchor="ra")

# ══════════ ① HUD ══════════
txt((46, 104), "① 页面内 HUD（黑底 · 圆滑）", 12, T2, True)

# 胶囊态
cap = [46, 132, 244, 176]
soft_shadow(cap, 22, blur=14, alpha=120, dy=4)
d.rounded_rectangle(cap, 22, fill=(15,15,17), outline=LINE, width=1)
status(70, 154, "run", 4)
txt((84, 146), "静答", 12, WHITE, True)
txt((132, 147), "3/31", 12, WHITE)
d.ellipse([214, 148, 226, 160], outline=T2, width=1)
txt((220, 154), "3", 7, T2, anchor="mm")

# 展开面板
box = [46, 196, 496, 640]
panel(box, 18)
status(72, 222, "run", 4)
txt((88, 214), "静答", 13, WHITE, True)
txt((140, 215), "3/31", 12, WHITE)
d.rounded_rectangle([404, 210, 436, 236], 13, fill=None, outline=LINE, width=1)
txt((420, 223), "—", 11, T2, anchor="mm")
d.rounded_rectangle([444, 210, 476, 236], 13, outline=LINE, width=1)
txt((460, 222), "x", 10, T2, anchor="mm")
inset_line(46, 496, 250)

# 按钮（pill）
pill([62, 264, 170, 302], "开始答题", "primary", 12)
pill([178, 264, 232, 302], "暂停", "soft", 12)
pill([240, 264, 322, 302], "只扫描", "soft", 12)

# 模式：pill chips
txt((62, 318), "模式", 11, T3)
x = 100
for label, act in (("判卷", True), ("跳过", False), ("覆盖", False)):
    w = len(label)*13 + 22
    r = 13
    if act:
        d.rounded_rectangle([x, 312, x+w, 338], r, fill=WHITE)
        txt((x+w/2, 325), label, 11, BLACK, True, anchor="mm")
    else:
        d.rounded_rectangle([x, 312, x+w, 338], r, outline=LINE, width=1)
        txt((x+w/2, 325), label, 11, T2, anchor="mm")
    x += w + 8

# 日志（凹陷圆角卡片）
d.rounded_rectangle([62, 352, 480, 540], 14, fill=SUNK, outline=(30,30,34), width=1)
rows = [
    ("#8", "已有 D → 判卷…", T2, False),
    ("×", "错误，已改为 A", WHITE, True),
    ("#9", "已有 A → √ 正确，保留", T2, False),
    ("#10", "[single] 匹配中…", T3, False),
    ("#11", "已有「对」→ √ 保留", T2, False),
]
yy = 368
for a, b, c, mark in rows:
    if mark:
        d.rounded_rectangle([74, yy, 77, yy+13], 2, fill=WHITE)
        txt((84, yy), a, 11, WHITE, True); txt((104, yy), b, 11, WHITE)
    else:
        txt((84, yy), a, 11, c); txt((104, yy), b, 11, c)
    yy += 26

inset_line(46, 496, 560)
status(68, 582, "done", 4)
txt((82, 574), "deepseek-flash", 10, T2)
txt((480, 574), "12s 前", 10, T3, anchor="ra")

# ══════════ ② 弹窗 ══════════
txt((536, 104), "② 工具栏弹窗（白底 · 圆滑）", 12, T2, True)
pop = [536, 132, 900, 560]
soft_shadow(pop, 18, alpha=120)
d.rounded_rectangle(pop, 18, fill=(255,255,255), outline=(224,224,229), width=1)
logo(558, 154, 24)
d.rounded_rectangle([558, 154, 582, 178], 8, fill=(0,0,0))
d.rounded_rectangle([563, 161, 577, 169], 4, fill=(255,255,255))
d.polygon([(573, 168), (581, 173), (573, 174)], fill=(255,255,255))
d.ellipse([574, 168, 580, 174], fill=(0,0,0))
txt((592, 156), "静答", 14, (10,10,12), True)
txt((878, 158), "v2.0.0", 11, (140,140,148), anchor="ra")
inset_line(536, 900, 196, 16, (228,228,233))

# 状态行（表格化，圆角行）
d.rounded_rectangle([552, 208, 884, 250], 12, fill=(246,246,248))
txt((566, 218), "接口", 10, (150,150,158))
txt((614, 217), "deepseek-flash", 12, (16,16,20))
status(868, 229, "done", 4)
d.ellipse([866,227,872,233], fill=(10,10,12))
txt((566, 234), "已连通 · 1.2s", 10, (150,150,158))

d.rounded_rectangle([552, 258, 884, 300], 12, fill=(246,246,248))
txt((566, 268), "页面", 10, (150,150,158))
txt((614, 267), "已注入 · 31 题", 12, (16,16,20))
d.ellipse([869,280,875,286], fill=(10,10,12))
txt((566, 284), "fill×6 · single×11 · judge×11 · essay×3", 9, (150,150,158))

# 按钮
d.rounded_rectangle([552, 318, 884, 362], 22, fill=(12,12,14))
txt((718, 340), "开始答题", 13, WHITE, True, anchor="mm")
d.rounded_rectangle([552, 372, 708, 410], 19, outline=(206,206,212), width=1)
txt((630, 391), "只扫描", 12, (40,40,46), anchor="mm")
d.rounded_rectangle([720, 372, 884, 410], 19, outline=(206,206,212), width=1)
txt((802, 391), "设置", 12, (40,40,46), anchor="mm")

inset_line(536, 900, 448, 16, (228,228,233))
txt((552, 462), "by YG · MIT · 关于", 10, (150,150,158))
txt((552, 486), "先「只扫描」确认题数，再开始答题", 10, (176,176,184))

# ══════════ ③ 半径规范 ══════════
txt((940, 104), "③ 半径与圆滑规则", 12, T2, True)
panel([940, 132, 1454, 560], 18)

specs = [("面板", "18", 18), ("卡片 / 日志区", "14", 14), ("控件 / 输入框", "12", 12), ("按钮 / 胶囊", "pill", 999)]
yy = 156
for name, val, r in specs:
    txt((964, yy + 6), name, 11, T2)
    w, h = (110, 40)
    box2 = [1150, yy, 1150 + w, yy + h]
    rr = min(h // 2, r if r < 100 else h // 2)
    d.rounded_rectangle(box2, rr, fill=(26,26,30), outline=LINE_H, width=1)
    txt((1150 + w + 16, yy + 12), val, 11, WHITE)
    yy += 56

d.line([(964, 392), (1430, 392)], fill=LINE, width=1)

txt((964, 408), "圆滑四件事", 11, WHITE, True)
notes = [
    ("分割线", "不通栏：两端内缩 16，或用 12 圆角卡片分组"),
    ("阴影", "0 18px 48px rgba(0,0,0,.55) + 0 2px 8px rgba(0,0,0,.3)"),
    ("描边", "1px rgba(255,255,255,.10)，只压边不切割"),
    ("间距", "贴边 16；组内 8；组间 16"),
]
yy = 434
for k, v in notes:
    txt((964, yy), k, 10, T3)
    txt((1010, yy - 1), v, 10, T2)
    yy += 30

# ══════════ ④ 圆角对照 ══════════
txt((46, 668), "④ 同一面板：方（radius 6） vs 圆滑（radius 18）", 12, T2, True)

# 方
sq = [46, 696, 500, 950]
d.rounded_rectangle(sq, 6, fill=PANEL, outline=LINE, width=1)
txt((66, 712), "静答", 12, WHITE, True)
d.line([(46, 740), (500, 740)], fill=LINE, width=1)   # 通栏分割
d.rounded_rectangle([66, 754, 176, 790], 6, fill=WHITE)
txt((121, 772), "开始答题", 12, BLACK, True, anchor="mm")
d.rounded_rectangle([186, 754, 240, 790], 6, outline=LINE, width=1)
txt((213, 772), "暂停", 12, T2, anchor="mm")
d.rounded_rectangle([250, 754, 332, 790], 6, outline=LINE, width=1)
txt((291, 772), "只扫描", 12, T2, anchor="mm")
d.rounded_rectangle([66, 806, 480, 932], 0, fill=SUNK)
txt((82, 820), "#8  已有 D → 判卷…", 11, T2)
txt((82, 844), "×   错误，已改为 A", 11, WHITE)
txt((82, 868), "#9  已有 A → √ 保留", 11, T2)
txt((46, 962), "棱角分明，边界硬，信息块之间靠线切割", 10, T3)

# 圆滑
rd = [716, 696, 1170, 950]
soft_shadow(rd, 18, alpha=130)
d.rounded_rectangle(rd, 18, fill=PANEL, outline=LINE, width=1)
status(742, 722, "run", 4)
txt((758, 714), "静答", 12, WHITE, True)
txt((806, 715), "3/31", 11, WHITE)
inset_line(716, 1170, 742)
d.rounded_rectangle([736, 756, 846, 794], 19, fill=WHITE)
txt((791, 775), "开始答题", 12, BLACK, True, anchor="mm")
d.rounded_rectangle([856, 756, 910, 794], 19, outline=LINE, width=1)
txt((883, 775), "暂停", 12, T2, anchor="mm")
d.rounded_rectangle([920, 756, 1002, 794], 19, outline=LINE, width=1)
txt((961, 775), "只扫描", 12, T2, anchor="mm")
d.rounded_rectangle([736, 810, 1150, 914], 14, fill=SUNK, outline=(30,30,34), width=1)
txt((754, 826), "#8  已有 D → 判卷…", 11, T2)
d.rounded_rectangle([754, 848, 757, 861], 2, fill=WHITE)
txt((764, 848), "×   错误，已改为 A", 11, WHITE)
txt((764, 872), "#9  已有 A → √ 保留", 11, T2)
txt((716, 962), "同信息量，视觉更轻、更像「浮在上面的工具」", 10, T3)

img.save(OUT)
print("saved", OUT, img.size)
