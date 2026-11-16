#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""图标：黑底 + 白色气泡 + 白点（与弹窗里的 CSS logo 完全一致）
   黑托盘提供深色背景下的对比，白色气泡在 16px 仍是一个清楚的形状
"""
BLACK = (16, 16, 18)
WHITE = (255, 255, 255)

# 比例（相对尺寸），与 popup.html 里的 .logo 一致
GEO = dict(
    tile_r=0.26,
    bubble=(0.19, 0.29, 0.75, 0.61),   # x0,y0,x1,y1
    bubble_r=0.15,
    dot=(0.70, 0.71, 0.135),           # cx,cy,r
)


def draw_icon(size):
    from PIL import Image, ImageDraw
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    g = GEO
    S = float(size - 1)

    # 黑托盘
    d.rounded_rectangle([0, 0, size - 1, size - 1], int(round(size * g["tile_r"])), fill=BLACK + (255,))

    # 白色气泡
    x0, y0, x1, y1 = [round(v * S) for v in g["bubble"]]
    d.rounded_rectangle([x0, y0, x1, y1], max(1, round(size * g["bubble_r"])), fill=WHITE + (255,))

    # 白点
    cx, cy, r = round(g["dot"][0] * S), round(g["dot"][1] * S), max(1, round(size * g["dot"][2]))
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=WHITE + (255,))
    return im


if __name__ == "__main__":
    # 必须与 manifest.icons 的键完全一致
    for size in (16, 32, 48, 128):
        draw_icon(size).save(f"icons/{size}.png")
        print(f"icons/{size}.png ok")
