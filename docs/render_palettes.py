#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""6 套配色 · 同一 HUD 对照图"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUT = "docs/palettes.png"
W, H = 1520, 1080
F = "C:/Windows/Fonts/msyh.ttc"
FB = "C:/Windows/Fonts/msyhbd.ttc"
def font(s, b=False): return ImageFont.truetype(FB if b else F, s)

img = Image.new("RGB", (W, H), (0, 0, 0))
d = ImageDraw.Draw(img)

def txt(xy, s, size=12, color=(255,255,255), bold=False, anchor=None):
    d.text(xy, s, font=font(size, bold), fill=color, anchor=anchor)

txt((46, 28), "静答 QuietAnswer · 6 套配色方案", 18, (255,255,255), True)
txt((46, 56), "同一 HUD 结构，只换调色板；括号内是「这个配色的性格」", 12, (150,150,156))

# scheme: name, note, page_bg, panel, line, text, sub, accent, accent_fg, accent_is_light
S = [
    ("01 纯黑白", "极简到底，零色彩", (255,255,255), (13,13,15), (38,38,42), (255,255,255), (158,158,164), (255,255,255), (0,0,0), True),
    ("02 石墨", "冷灰金属感，比纯黑柔和", (255,255,255), (22,24,28), (42,45,51), (242,244,247), (152,160,171), (230,233,239), (10,12,16), True),
    ("03 墨蓝", "唯一的蓝，克制的专业感", (255,255,255), (16,23,36), (35,48,74), (234,240,255), (143,160,191), (76,125,255), (255,255,255), False),
    ("04 雾青", "低饱和青绿，冷静不刺眼", (255,255,255), (14,22,22), (33,50,50), (233,245,243), (143,168,164), (63,182,168), (6,20,18), True),
    ("05 纸白", "浅色方案，像纸一样安静", (246,244,238), (255,255,255), (231,228,220), (27,26,23), (110,106,98), (27,26,23), (255,255,255), False),
    ("06 陶土", "暖调深色，夜里看不刺眼", (255,255,255), (23,19,18), (51,42,38), (245,237,231), (167,154,146), (208,138,92), (24,14,8), True),
]

def draw_hud(x, y, w, h, s, idx):
    name, note, page_bg, panel, line, tx, sub, acc, acc_fg, acc_light = s
    # 白页背景（浅色方案用自身 page_bg）
    d.rectangle([x, y, x + w, y + h], fill=page_bg)
    # 页面示意内容
    d.rounded_rectangle([x + 16, y + 16, x + w - 16, y + 92], 10, outline=(230,230,234) if page_bg == (255,255,255) else (228,224,214), width=1)
    txt((x + 30, y + 30), "8. （ ）可以显示任务的基本信息", 10, (30,30,34) if page_bg == (255,255,255) else (27,26,23), True)
    txt((x + 30, y + 52), "○ A. 甘特图    ○ B. 网络图", 10, (90,90,96) if page_bg == (255,255,255) else (110,106,98))

    # HUD 面板
    hb = [x + w - 300, y + 108, x + w - 16, y + h - 12]
    lay = Image.new("RGBA", img.size, (0,0,0,0))
    ImageDraw.Draw(lay).rounded_rectangle([hb[0], hb[1] + 6, hb[2], hb[3] + 8], 16, fill=(0,0,0,120))
    img.paste(Image.alpha_composite(img.convert("RGBA"), lay.filter(ImageFilter.GaussianBlur(14))).convert("RGB"), (0,0))
    dd = ImageDraw.Draw(img)
    dd.rounded_rectangle(hb, 16, fill=panel, outline=line, width=1)

    X, Y = hb[0], hb[1]
    # 头部
    dd.ellipse([X + 16, Y + 15, X + 25, Y + 24], outline=tx, width=1)
    dd.arc([X + 14, Y + 13, X + 27, Y + 26], 295, 360, fill=tx, width=2)
    txt((X + 34, Y + 10), "静答", 11, tx, True)
    txt((X + 84, Y + 11), "3/31", 11, tx)
    dd.rounded_rectangle([X + 216, Y + 8, X + 242, Y + 30], 11, outline=line, width=1)
    txt((X + 229, Y + 19), "—", 10, sub, anchor="mm")
    dd.rounded_rectangle([X + 248, Y + 8, X + 274, Y + 30], 11, outline=line, width=1)
    txt((X + 261, Y + 18), "x", 9, sub, anchor="mm")
    dd.line([(X + 16, Y + 42), (X + 268, Y + 42)], fill=line, width=1)

    # 按钮
    dd.rounded_rectangle([X + 16, Y + 54, X + 116, Y + 88], 17, fill=acc)
    fg = acc_fg
    txt((X + 66, Y + 71), "开始答题", 11, fg, True, anchor="mm")
    dd.rounded_rectangle([X + 124, Y + 54, X + 176, Y + 88], 17, outline=line, width=1)
    txt((X + 150, Y + 71), "暂停", 11, sub, anchor="mm")
    dd.rounded_rectangle([X + 184, Y + 54, X + 268, Y + 88], 17, outline=line, width=1)
    txt((X + 226, Y + 71), "只扫描", 11, sub, anchor="mm")

    # 日志卡片
    dd.rounded_rectangle([X + 16, Y + 100, X + 268, Y + 176], 12, fill=(8,8,9) if panel != (255,255,255) else (246,246,242), outline=line, width=1)
    txt((X + 30, Y + 114), "#8  已有 D → 判卷…", 10, sub)
    dd.rounded_rectangle([X + 30, Y + 134, X + 33, Y + 146], 2, fill=tx)
    txt((X + 40, Y + 134), "×   错误，已改为 A", 10, tx)
    txt((X + 40, Y + 156), "#9  已有 A → √ 保留", 10, sub)

    # 状态条
    dd.line([(X + 16, Y + 190), (X + 268, Y + 190)], fill=line, width=1)
    dd.ellipse([X + 18, Y + 201, X + 25, Y + 208], fill=tx)
    txt((X + 32, Y + 197), "deepseek-flash", 9, sub)
    txt((X + 264, Y + 197), "12s", 9, sub, anchor="ra")

    # 标签 + 色板
    light_page = sum(page_bg) / 3 > 160
    lab = (27, 26, 23) if light_page else (255, 255, 255)
    lab2 = (110, 106, 98) if light_page else (150, 150, 156)
    txt((x + 16, y + h - 74), name, 12, lab, True)
    txt((x + 16, y + h - 52), note, 10, lab2)
    sw = [panel, line, tx, acc]
    for i, c in enumerate(sw):
        d.rounded_rectangle([x + 16 + i * 26, y + h - 34, x + 36 + i * 26, y + h - 18], 4, fill=c, outline=(200,200,205), width=1)


cw, ch = 486, 460
for i, s in enumerate(S):
    r, c = divmod(i, 3)
    x = 46 + c * (cw + 18)
    y = 88 + r * (ch + 18)
    draw_hud(x, y, cw, ch, s, i)

txt((46, H - 42), "建议：白页面上用 01/02/05；深色主题或夜间用 02/06；想留一点品牌感用 03/04（只给主按钮与进度环上色，其余保持灰阶）", 11, (140,140,146))

img.save(OUT)
print("saved", OUT, img.size)
