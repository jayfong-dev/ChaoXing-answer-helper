#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""少见图标概念：6 个非标准motif，128/48/16 + 16px 8× 放大"""
from PIL import Image, ImageDraw, ImageFont

OUT = "docs/icons_uncommon.png"
F = "C:/Windows/Fonts/msyh.ttc"
FB = "C:/Windows/Fonts/msyhbd.ttc"
def font(s, b=False): return ImageFont.truetype(FB if b else F, s)

INK = (13, 13, 15)

def frame(size, dark):
    bg = (23, 25, 29) if dark else (255, 255, 255)
    fg = (242, 244, 247) if dark else INK
    im = Image.new("RGB", (size, size), bg)
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 0, size - 1, size - 1], int(size * 0.26), fill=bg)
    return im, d, fg

def W(size, ratio):            # 线宽
    return max(2, int(round(size * ratio)))

# A 断勾：手写批改的对勾，一笔断成两段
def A(size, dark=False):
    im, d, fg = frame(size, dark)
    w = W(size, .13)
    d.line([(size*.16, size*.54), (size*.40, size*.78)], fill=fg, width=w)
    d.line([(size*.50, size*.68), (size*.86, size*.20)], fill=fg, width=w)
    return im

# B 空位：断口圆环 + 缺口处一个小方块（待填的空）
def B(size, dark=False):
    im, d, fg = frame(size, dark)
    w = W(size, .11)
    d.arc([size*.14, size*.14, size*.86, size*.86], 25, 300, fill=fg, width=w)
    s = size * .17
    d.rounded_rectangle([size*.70, size*.68, size*.70+s, size*.68+s], max(1,int(size*.03)), fill=fg)
    return im

# C 涂卡：小椭圆被一道斜线划过（模拟涂黑答题卡）
def C(size, dark=False):
    im, d, fg = frame(size, dark)
    d.ellipse([size*.18, size*.30, size*.82, size*.70], outline=fg, width=W(size, .10))
    d.line([(size*.22, size*.74), (size*.78, size*.20)], fill=fg, width=W(size, .10))
    return im

# D 格缺一角：2×2 去左上（缺口 = 待答）
def D(size, dark=False):
    im, d, fg = frame(size, dark)
    m, gap = size*.16, size*.07
    cell = (size - 2*m - gap) / 2
    for i in range(2):
        for j in range(2):
            x0 = m + i*(cell+gap); y0 = m + j*(cell+gap)
            box = [x0, y0, x0+cell, y0+cell]
            if i == 0 and j == 0:
                continue                      # 左上缺
            if i == 1 and j == 1:
                d.rounded_rectangle(box, int(cell*.2), fill=fg)
            else:
                d.rounded_rectangle(box, int(cell*.2), outline=fg, width=W(size, .075))
    return im

# E 刻度盘：半圆 + 指针（像判分/计时）
def E(size, dark=False):
    im, d, fg = frame(size, dark)
    w = W(size, .10)
    d.arc([size*.14, size*.22, size*.86, size*.94], 180, 360, fill=fg, width=w)
    d.line([(size*.50, size*.58), (size*.68, size*.30)], fill=fg, width=W(size, .11))
    r = size*.055
    d.ellipse([size*.50-r, size*.58-r, size*.50+r, size*.58+r], fill=fg)
    return im

# F 顿号：两短横 + 一点（像题号与选项标记，极简抽象）
def Fv(size, dark=False):
    im, d, fg = frame(size, dark)
    w = W(size, .11)
    d.line([(size*.18, size*.34), (size*.58, size*.34)], fill=fg, width=w)
    d.line([(size*.18, size*.56), (size*.46, size*.56)], fill=fg, width=w)
    r = size*.10
    d.ellipse([size*.72-r, size*.72-r, size*.72+r, size*.72+r], fill=fg)
    return im

CONCEPTS = [("A 断勾", A), ("B 空位", B), ("C 涂卡", C), ("D 格缺一角", D), ("E 刻度盘", E), ("F 顿号", Fv)]

W_, H_ = 1460, 820
img = Image.new("RGB", (W_, H_), (11, 11, 13))
d = ImageDraw.Draw(img)
txt = lambda xy, s, size=12, color=(255,255,255), bold=False: d.text(xy, s, font=font(size, bold), fill=color)

txt((40, 24), "少见度优先 · 6 个非标准形状", 18, (255,255,255), True)
txt((40, 52), "每个：128 / 48 / 16（浅底）＋ 16px 的 8× 放大；下排深底看反色", 12, (150,150,156))

for i, (name, fn) in enumerate(CONCEPTS):
    col = i % 3
    row = i // 3
    x = 40 + col * 478
    y = 92 + row * 356
    txt((x, y), name, 13, (255,255,255), True)
    xx, yy = x, y + 26
    for s in (128, 48, 16):
        img.paste(fn(s), (xx, yy + (128 - s)//2))
        xx += s + 16
    z = fn(16).resize((96, 96), Image.NEAREST)
    img.paste(z, (x + 232, yy + 16))
    txt((x + 232, yy + 118), "16px ×8", 9, (110,116,126))
    # 深色一行
    xx, yy = x, y + 176
    for s in (64, 32):
        img.paste(fn(s, dark=True), (xx, yy + (64 - s)//2))
        xx += s + 14
    img.paste(fn(16, dark=True).resize((64, 64), Image.NEAREST), (x + 130, yy))

img.save(OUT)
print("saved", OUT, img.size)
