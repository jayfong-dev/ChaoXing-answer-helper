#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""图标方案对比：6 个概念 × 128/48/16，浅底与深底各一份"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUT = "docs/icons_compare.png"
F = "C:/Windows/Fonts/msyh.ttc"
FB = "C:/Windows/Fonts/msyhbd.ttc"
def font(s, b=False): return ImageFont.truetype(FB if b else F, s)

INK = (14, 14, 16)

def tile(size, dark_bg=False, radius_ratio=0.28):
    """返回 (img, draw, 前景色, 底色)"""
    im = Image.new("RGB", (size, size), (10, 10, 12) if dark_bg else (255, 255, 255))
    d = ImageDraw.Draw(im)
    bg = (24, 26, 30) if dark_bg else (255, 255, 255)
    fg = (240, 242, 246) if dark_bg else INK
    r = int(size * radius_ratio)
    d.rounded_rectangle([0, 0, size - 1, size - 1], r, fill=bg)
    return im, d, fg, bg

def stroke(size): return max(1, int(round(size * 0.085)))

# ── 概念 1：对话气泡 + 点 ──
def c1(size, dark=False):
    im, d, fg, bg = tile(size, dark)
    d.rounded_rectangle([size*.18, size*.26, size*.78, size*.60], int(size*.13), fill=fg)
    d.polygon([(size*.30, size*.59), (size*.30, size*.75), (size*.47, size*.59)], fill=fg)
    r = size*.085
    d.ellipse([size*.76-r, size*.74-r, size*.76+r, size*.74+r], fill=fg)
    return im

# ── 概念 2：气泡 + 勾 ──
def c2(size, dark=False):
    im, d, fg, bg = tile(size, dark)
    d.rounded_rectangle([size*.12, size*.14, size*.88, size*.74], int(size*.16), outline=fg, width=stroke(size))
    w = stroke(size)
    d.line([(size*.32, size*.44), (size*.45, size*.57), (size*.70, size*.30)], fill=fg, width=w, joint="curve")
    d.polygon([(size*.30, size*.73), (size*.30, size*.90), (size*.50, size*.73)], fill=fg)
    return im

# ── 概念 3：字母 X（双斜杠，圆角端点） ──
def c3(size, dark=False):
    im, d, fg, bg = tile(size, dark)
    w = max(2, int(round(size * 0.14)))
    pad = size * 0.26
    d.line([(pad, pad), (size-pad, size-pad)], fill=fg, width=w)
    d.line([(size-pad, pad), (pad, size-pad)], fill=fg, width=w)
    # 圆头
    r = w / 2
    for (x, y) in [(pad, pad), (size-pad, size-pad), (size-pad, pad), (pad, size-pad)]:
        d.ellipse([x-r, y-r, x+r, y+r], fill=fg)
    return im

# ── 概念 4：答题卡（2×2 田字，右下填黑） ──
def c4(size, dark=False):
    im, d, fg, bg = tile(size, dark, 0.24)
    gap = size * 0.06
    m = size * 0.20
    cell = (size - 2*m - gap) / 2
    for i in range(2):
        for j in range(2):
            x0 = m + i * (cell + gap)
            y0 = m + j * (cell + gap)
            box = [x0, y0, x0 + cell, y0 + cell]
            if i == 1 and j == 1:
                d.rounded_rectangle(box, int(cell*0.22), fill=fg)
            else:
                d.rounded_rectangle(box, int(cell*0.22), outline=fg, width=max(1, stroke(size)//2))
    return im

# ── 概念 5：书页 + X 缺口 ──
def c5(size, dark=False):
    im, d, fg, bg = tile(size, dark, 0.24)
    w = max(2, stroke(size))
    # 左书页 + 右书页（书脊中缝）
    d.line([(size*.50, size*.22), (size*.50, size*.80)], fill=fg, width=max(1, w-1))
    d.line([(size*.16, size*.26), (size*.48, size*.32), (size*.48, size*.80), (size*.18, size*.74), (size*.16, size*.26)], fill=fg, width=max(1, w-1), joint="curve")
    d.line([(size*.84, size*.26), (size*.52, size*.32), (size*.52, size*.80), (size*.82, size*.74), (size*.84, size*.26)], fill=fg, width=max(1, w-1), joint="curve")
    # 右上 X
    s = size * 0.20
    x0, y0 = size*0.62, size*0.16
    d.line([(x0, y0), (x0+s, y0+s)], fill=bg, width=max(2, w+1))
    d.line([(x0+s, y0), (x0, y0+s)], fill=bg, width=max(2, w+1))
    return im

# ── 概念 6：进度环 + 中心点 ──
def c6(size, dark=False):
    im, d, fg, bg = tile(size, dark, 0.30)
    m = size * 0.22
    d.arc([m, m, size-m, size-m], 0, 359.9, fill=fg, width=max(2, stroke(size)))
    d.arc([m, m, size-m, size-m], 180, 320, fill=(120, 124, 132) if not dark else (86, 92, 104), width=max(2, stroke(size)))
    r = size * 0.10
    c = size/2
    d.ellipse([c-r, c-r, c+r, c+r], fill=fg)
    return im

CONCEPTS = [
    ("1 气泡 + 点", c1),
    ("2 气泡 + 勾", c2),
    ("3 字母 X", c3),
    ("4 答题卡", c4),
    ("5 书页 + X", c5),
    ("6 进度环", c6),
]

W, H = 1500, 1000
img = Image.new("RGB", (W, H), (12, 12, 14))
d = ImageDraw.Draw(img)
txt = lambda xy, s, size=12, color=(255,255,255), bold=False, anchor=None: d.text(xy, s, font=font(size, bold), fill=color, anchor=anchor)

txt((46, 28), "X Assistant · 图标方案对比", 18, (255,255,255), True)
txt((46, 56), "每个方案：128 / 48 / 16 三个尺寸，浅底与深底各一份；16px 看不清的直接淘汰", 12, (150,150,156))

col_w = 236
start_x = 46
for i, (name, fn) in enumerate(CONCEPTS):
    x = start_x + (i % 3) * (col_w * 2 + 40)
    y = 96 + (i // 3) * 400
    txt((x, y), name, 13, (255,255,255), True)

    # 浅底
    yy = y + 28
    xx = x
    for s in (128, 48, 16):
        im = fn(s)
        img.paste(im, (xx, yy + (128 - s) // 2))
        xx += s + 16
    txt((x, yy + 140), "浅色工具栏", 10, (120,126,136))

    # 深底
    yy2 = y + 176
    txt((x, yy2 - 16), "深色工具栏", 10, (120,126,136))
    xx = x
    for s in (128, 48, 16):
        im = fn(s, dark=True)
        img.paste(im, (xx, yy2 + (128 - s) // 2))
        xx += s + 16

# 放大 16px 展示
txt((46, 880), "16px 实际大小（左）与 4× 放大（右）——只看这一行就能淘汰一半", 12, (150,150,156))
xx = 46
for name, fn in CONCEPTS:
    im16 = fn(16)
    img.paste(im16, (xx, 906))
    big = im16.resize((64, 64), Image.NEAREST)
    img.paste(big, (xx + 22, 906))
    txt((xx, 978), name.split(" ")[0], 10, (130,136,146))
    xx += 232

img.save(OUT)
print("saved", OUT, img.size)
