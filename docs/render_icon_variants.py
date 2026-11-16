#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""气泡图标 · 分尺寸优化对照（16px 专项）"""
from PIL import Image, ImageDraw, ImageFont

OUT = "docs/icons_bubble_variants.png"
F = "C:/Windows/Fonts/msyh.ttc"
FB = "C:/Windows/Fonts/msyhbd.ttc"
def font(s, b=False): return ImageFont.truetype(FB if b else F, s)

INK = (13, 13, 15)

def base(size, dark=False, r_ratio=0.26):
    im = Image.new("RGB", (size, size), (10,10,12) if dark else (255,255,255))
    d = ImageDraw.Draw(im)
    bg = (23, 25, 29) if dark else (255, 255, 255)
    fg = (242, 244, 247) if dark else INK
    d.rounded_rectangle([0, 0, size-1, size-1], int(size*r_ratio), fill=bg)
    return im, d, fg, bg

# A：原设计等比缩放（气泡 + 尾巴 + 外部点）
def vA(size, dark=False):
    im, d, fg, bg = base(size, dark)
    d.rounded_rectangle([size*.16, size*.24, size*.80, size*.58], int(size*.14), fill=fg)
    d.polygon([(size*.29, size*.57), (size*.29, size*.76), (size*.48, size*.57)], fill=fg)
    r = size*.085
    d.ellipse([size*.79-r, size*.73-r, size*.79+r, size*.73+r], fill=fg)
    return im

# B：小尺寸简化 —— 去尾巴，点放大并向内收
def vB(size, dark=False):
    im, d, fg, bg = base(size, dark)
    d.rounded_rectangle([size*.14, size*.26, size*.86, size*.62], int(size*.16), fill=fg)
    r = size*.11
    d.ellipse([size*.80-r, size*.76-r, size*.80+r, size*.76+r], fill=fg)
    return im

# C：点在气泡内部（挖空）——"正在作答"的三个点之一
def vC(size, dark=False):
    im, d, fg, bg = base(size, dark)
    d.rounded_rectangle([size*.13, size*.20, size*.87, size*.66], int(size*.18), fill=fg)
    d.polygon([(size*.27, size*.64), (size*.27, size*.84), (size*.50, size*.64)], fill=fg)
    r = size*.115
    d.ellipse([size*.63-r, size*.43-r, size*.63+r, size*.43+r], fill=bg)
    return im

# D：气泡右边切一个小缺口（负空间），无独立点
def vD(size, dark=False):
    im, d, fg, bg = base(size, dark)
    d.rounded_rectangle([size*.13, size*.22, size*.87, size*.66], int(size*.18), fill=fg)
    d.polygon([(size*.27, size*.64), (size*.27, size*.84), (size*.50, size*.64)], fill=fg)
    r = size*.16
    d.ellipse([size*.86-r, size*.64-r, size*.86+r, size*.64+r], fill=bg)
    return im

VARIANTS = [("A 原设计", vA), ("B 去尾巴·大点", vB), ("C 点在气泡内", vC), ("D 负空间缺口", vD)]

W, H = 1400, 760
img = Image.new("RGB", (W, H), (12,12,14))
d = ImageDraw.Draw(img)
txt = lambda xy, s, size=12, color=(255,255,255), bold=False: d.text(xy, s, font=font(size, bold), fill=color)

txt((46, 26), "气泡图标 · 分尺寸优化", 18, (255,255,255), True)
txt((46, 54), "上排浅色工具栏 / 下排深色工具栏；右侧是 16px 的 8× 放大（看轮廓是否还能认）", 12, (150,150,156))

for i, (name, fn) in enumerate(VARIANTS):
    x = 46 + i * 336
    txt((x, 92), name, 13, (255,255,255), True)
    # 浅底 128 / 48 / 16
    xx, yy = x, 118
    for s in (128, 48, 16):
        img.paste(fn(s), (xx, yy + (128 - s)//2))
        xx += s + 14
    # 16 放大
    big = fn(16).resize((128, 128), Image.NEAREST)
    img.paste(big, (x + 244, yy))
    txt((x + 244, yy + 132), "16px ×8", 9, (110,116,126))

    # 深底
    xx, yy = x, 300
    txt((x, yy - 18), "深色", 10, (110,116,126))
    for s in (128, 48, 16):
        img.paste(fn(s, dark=True), (xx, yy + (128 - s)//2))
        xx += s + 14
    big = fn(16, dark=True).resize((128, 128), Image.NEAREST)
    img.paste(big, (x + 244, yy))

# 48 与 128 的细节对比
txt((46, 470), "各尺寸单独看（A 与 C 并排，从左到右 128 / 48 / 16）", 12, (150,150,156))
for j, (name, fn) in enumerate([VARIANTS[0], VARIANTS[2]]):
    y = 500 + j * 120
    txt((46, y + 46), name, 11, (170,176,186))
    xx = 220
    for s in (96, 48, 16):
        img.paste(fn(s), (xx, y + (96 - s)//2))
        xx += s + 22

img.save(OUT)
print("saved", OUT, img.size)
