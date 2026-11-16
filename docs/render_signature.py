#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""署名落点效果图：XCT Assistant · by JayFong"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUT = "docs/signature.png"
W, H = 1460, 880
F = "C:/Windows/Fonts/msyh.ttc"
FB = "C:/Windows/Fonts/msyhbd.ttc"
def font(s, b=False): return ImageFont.truetype(FB if b else F, s)

img = Image.new("RGB", (W, H), (14, 14, 16))
d = ImageDraw.Draw(img)

def txt(xy, s, size=12, color=(255,255,255), bold=False, anchor=None):
    d.text(xy, s, font=font(size, bold), fill=color, anchor=anchor)

def shadow(box, r, alpha=140, blur=14, dy=6):
    lay = Image.new("RGBA", img.size, (0,0,0,0))
    ImageDraw.Draw(lay).rounded_rectangle([box[0], box[1]+dy, box[2], box[3]+dy], r, fill=(0,0,0,alpha))
    img.paste(Image.alpha_composite(img.convert("RGBA"), lay.filter(ImageFilter.GaussianBlur(blur))).convert("RGB"), (0,0))

txt((46, 30), "署名规范 · XCT Assistant", 18, (255,255,255), True)
txt((46, 58), "作者：JayFong　｜　三套主题：石墨（默认）· 纸白 · 墨蓝", 12, (150,150,156))

def mark(x, y, s=24, bg=(255,255,255), fg=(0,0,0)):
    d.rounded_rectangle([x, y, x+s, y+s], int(s*0.34), fill=bg)
    d.rounded_rectangle([x+s*0.20, y+s*0.30, x+s*0.72, y+s*0.64], int(s*0.20), fill=fg)
    d.polygon([(x+s*0.56, y+s*0.62), (x+s*0.84, y+s*0.78), (x+s*0.54, y+s*0.80)], fill=fg)
    d.ellipse([x+s*0.60, y+s*0.62, x+s*0.82, y+s*0.84], fill=bg)

# ── ① 弹窗（石墨） ──
txt((46, 100), "① 工具栏弹窗底部", 12, (160,190,255), True)
pop = [46, 128, 420, 470]
shadow(pop, 18, 150)
d.rounded_rectangle(pop, 18, fill=(22,24,28), outline=(42,45,51), width=1)
mark(66, 148, 24, bg=(230,233,239))
txt((100, 150), "XCT", 13, (242,244,247), True)
txt((140, 152), "Assistant", 11, (152,160,171))
txt((398, 152), "v2.0.0", 10, (120,126,136), anchor="ra")
d.line([(66, 186), (398, 186)], fill=(42,45,51), width=1)
d.rounded_rectangle([66, 200, 398, 236], 18, fill=(230,233,239))
txt((232, 218), "开始答题", 12, (10,12,16), True, anchor="mm")
d.rounded_rectangle([66, 246, 222, 280], 17, outline=(42,45,51), width=1)
txt((144, 263), "只扫描", 11, (152,160,171), anchor="mm")
d.rounded_rectangle([234, 246, 398, 280], 17, outline=(42,45,51), width=1)
txt((316, 263), "设置", 11, (152,160,171), anchor="mm")
d.line([(66, 306), (398, 306)], fill=(42,45,51), width=1)
txt((66, 320), "XCT Assistant · by JayFong", 10, (152,160,171))
txt((66, 342), "MIT License · 关于", 10, (120,126,136))
txt((66, 380), "提示：先「只扫描」确认题数，再开始答题", 10, (110,116,126))

# ── ② HUD 底部状态条 ──
txt((452, 100), "② 页面内 HUD 状态条", 12, (160,190,255), True)
hud = [452, 128, 900, 340]
shadow(hud, 18, 150)
d.rounded_rectangle(hud, 18, fill=(22,24,28), outline=(42,45,51), width=1)
d.ellipse([470, 146, 480, 156], outline=(242,244,247), width=1)
d.arc([467, 143, 483, 159], 295, 360, fill=(242,244,247), width=2)
txt((490, 141), "XCT", 12, (242,244,247), True)
txt((522, 143), "Assistant", 10, (152,160,171))
txt((546, 143), "3/31", 11, (242,244,247))
d.rounded_rectangle([808, 138, 838, 164], 13, outline=(42,45,51), width=1)
txt((823, 151), "—", 10, (152,160,171), anchor="mm")
d.rounded_rectangle([846, 138, 876, 164], 13, outline=(42,45,51), width=1)
txt((861, 150), "x", 9, (152,160,171), anchor="mm")
d.line([(470, 178), (882, 178)], fill=(42,45,51), width=1)
d.rounded_rectangle([470, 190, 882, 268], 14, fill=(9,9,11), outline=(30,30,34), width=1)
txt((484, 202), "#8  已有 D → 判卷…", 10, (152,160,171))
d.rounded_rectangle([484, 222, 487, 234], 2, fill=(242,244,247))
txt((494, 222), "×   错误，已改为 A", 10, (242,244,247))
txt((494, 244), "#9  已有 A → √ 保留", 10, (152,160,171))
d.line([(470, 286), (882, 286)], fill=(42,45,51), width=1)
d.ellipse([472, 298, 480, 306], fill=(242,244,247))
txt((488, 294), "deepseek-flash", 9, (152,160,171))
txt((878, 294), "by JayFong", 9, (110,116,126), anchor="ra")

# ── ③ 设置页「关于」 ──
txt((936, 100), "③ 设置页 · 关于", 12, (160,190,255), True)
about = [936, 128, 1414, 476]
shadow(about, 18, 110)
d.rounded_rectangle(about, 18, fill=(255,255,255), outline=(226,226,231), width=1)
mark(960, 152, 34, bg=(20,20,24), fg=(255,255,255))
txt((1006, 154), "XCT Assistant", 15, (18,18,22), True)
txt((1006, 178), "学习通 / 超星 · 判卷式答题助手", 11, (130,130,140))
d.line([(960, 208), (1390, 208)], fill=(234,234,238), width=1)

rows = [
    ("作者", "JayFong"),
    ("版本", "2.0.0 (build 2026-11-16)"),
    ("许可", "MIT License"),
    ("仓库", "github.com/JayFong/xct-assistant"),
    ("主题", "石墨 / 纸白 / 墨蓝"),
]
yy = 224
for k, v in rows:
    txt((960, yy), k, 11, (140,140,148))
    txt((1010, yy - 1), v, 11, (26,26,30))
    yy += 34
d.line([(960, 400), (1390, 400)], fill=(234,234,238), width=1)
txt((960, 414), "本工具仅辅助作答，提交前请自行核对。", 10, (150,150,158))

# ── ④ 代码头 / LICENSE ──
txt((46, 500), "④ 代码头与 LICENSE", 12, (160,190,255), True)
code = [46, 528, 900, 660]
d.rounded_rectangle(code, 12, fill=(9,9,11), outline=(32,32,36), width=1)
lines = [
    "/*!",
    " * XCT Assistant · 学习通答题助手  v2.0.0",
    " * 学习通/超星 · 判卷式答题（先判对错，错的才改）",
    " * (c) 2026 JayFong · MIT License",
    " * build 2026-11-16T17:50:00+08:00 · sha 4f2a91c",
    " */",
]
yy = 546
for ln in lines:
    txt((64, yy), ln, 11, (190,196,206))
    yy += 18

lic = [936, 528, 1414, 660]
d.rounded_rectangle(lic, 12, fill=(9,9,11), outline=(32,32,36), width=1)
ll = [
    "MIT License",
    "",
    "Copyright (c) 2026 JayFong",
    "",
    "Permission is hereby granted, free of charge, ...",
]
yy = 546
for ln in ll:
    txt((954, yy), ln, 11, (190,196,206))
    yy += 18

# ── ⑤ 图标 ──
txt((46, 690), "⑤ 图标署名（128 / 48 / 16）", 12, (160,190,255), True)
for i, s in enumerate((96, 48, 24)):
    x = 46 + i * 120
    y = 720
    d.rounded_rectangle([x, y, x+s, y+s], int(s*0.34), fill=(255,255,255))
    d.rounded_rectangle([x+s*0.20, y+s*0.30, x+s*0.72, y+s*0.64], int(s*0.20), fill=(10,10,12))
    d.polygon([(x+s*0.56, y+s*0.62), (x+s*0.84, y+s*0.78), (x+s*0.54, y+s*0.80)], fill=(10,10,12))
    d.ellipse([x+s*0.60, y+s*0.62, x+s*0.82, y+s*0.84], fill=(255,255,255))
    txt((x, y + s + 10), f"{s}px", 10, (120,126,136))

txt((452, 700), "命名落点总表", 12, (160,190,255), True)
tbl = [
    ("manifest.name", "XCT Assistant · 学习通答题助手"),
    ("short_name", "XCT"),
    ("author", "JayFong"),
    ("homepage_url", "github.com/JayFong/xct-assistant"),
    ("弹窗/HUD", "XCT Assistant · by JayFong"),
    ("代码头", "(c) 2026 JayFong · MIT"),
]
yy = 728
for k, v in tbl:
    txt((452, yy), k, 11, (120,126,136))
    txt((580, yy - 1), v, 11, (226,230,238))
    yy += 26

img.save(OUT)
print("saved", OUT, img.size)
