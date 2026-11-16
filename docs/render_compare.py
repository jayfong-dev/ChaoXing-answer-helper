#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""对比：同一张白色作业页上，深色 HUD vs 浅色 HUD"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUT = "docs/hud_light_vs_dark.png"
W, H = 1500, 820
F = "C:/Windows/Fonts/msyh.ttc"
FB = "C:/Windows/Fonts/msyhbd.ttc"
def font(s, b=False): return ImageFont.truetype(FB if b else F, s)

img = Image.new("RGB", (W, H), (10, 10, 11))
d = ImageDraw.Draw(img)

def txt(xy, s, size=12, color=(255,255,255), bold=False, anchor=None):
    d.text(xy, s, font=font(size, bold), fill=color, anchor=anchor)

# 标题
txt((46, 30), "页面内 HUD：深色 vs 浅色", 17, (255,255,255), True)
txt((46, 58), "场景：白色作业页（超星默认浅色主题），HUD 悬浮在内容之上", 12, (150,150,155))

def draw_page(box, dark_hud):
    """画一张仿作业页，box 为区域"""
    x0, y0, x1, y1 = box
    page = (255, 255, 255)
    d.rectangle(box, fill=page)
    # 顶栏
    d.rectangle([x0, y0, x1, y0 + 34], fill=(246, 246, 248))
    txt((x0 + 16, y0 + 9), "作业作答 · 第7章", 11, (90, 90, 96))
    # 题目卡
    cy = y0 + 52
    for i, (stem, opts) in enumerate([
        ("（ ）可以显示任务的基本信息，能查看工期与资源", ["甘特图", "网络图", "里程碑图", "资源图"]),
        ("在项目进行过程中，关键路径是不变的。", ["对", "错"]),
    ]):
        d.rounded_rectangle([x0 + 16, cy, x1 - 16, cy + 168], 8, outline=(228, 228, 234), width=1)
        txt((x0 + 32, cy + 12), f"{i*4+8}. {stem}", 11, (26, 26, 30), True)
        yy = cy + 44
        for j, o in enumerate(opts):
            sel = (i == 0 and j == 0)
            if sel:
                d.ellipse([x0 + 34, yy + 1, x0 + 44, yy + 11], outline=(47, 111, 235), width=2)
                d.ellipse([x0 + 37, yy + 4, x0 + 41, yy + 8], fill=(47, 111, 235))
            else:
                d.ellipse([x0 + 34, yy + 1, x0 + 44, yy + 11], outline=(190, 190, 198), width=1)
            txt((x0 + 54, yy - 2), f"{chr(65+j)}. {o}", 11, (40, 40, 46))
            yy += 28
        cy += 184
    return x0, y0, x1, y1

def draw_hud(box, dark=True):
    x0, y0, x1, y1 = box
    if dark:
        bg, line, t1, t2, btn_bg, btn_fg = (12,12,14), (255,255,255,41), (255,255,255), (154,154,159), (255,255,255), (0,0,0)
        shadow = (0, 0, 0, 90)
    else:
        bg, line, t1, t2, btn_bg, btn_fg = (255,255,255), (0,0,0,36), (0,0,0), (110,110,118), (0,0,0), (255,255,255)
        shadow = (0, 0, 0, 45)
    # 阴影：单独一层模糊
    lay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(lay).rounded_rectangle([x0 - 2, y0 + 4, x1 + 2, y1 + 10], 12, fill=shadow)
    img.paste(Image.alpha_composite(img.convert("RGBA"), lay.filter(ImageFilter.GaussianBlur(10))).convert("RGB"), (0, 0))
    globals()["d"] = ImageDraw.Draw(img)
    d.rounded_rectangle(box, 10, fill=bg, outline=line, width=1)
    # 头部
    d.ellipse([x0 + 16, y0 + 15, x0 + 24, y0 + 23], outline=t1, width=1)
    d.arc([x0 + 14, y0 + 13, x0 + 26, y0 + 25], 290, 360, fill=t1, width=2)
    txt((x0 + 32, y0 + 10), "静答", 12, t1, True)
    txt((x0 + 92, y0 + 10), "3/31", 12, t1)
    txt((x1 - 26, y0 + 8), "x", 11, t2, anchor="ra")
    d.line([(x0 + 16, y0 + 36), (x1 - 16, y0 + 36)], fill=line, width=1)
    # 主按钮 + 次按钮
    d.rounded_rectangle([x0 + 16, y0 + 48, x0 + 120, y0 + 82], 6, fill=btn_bg)
    txt((x0 + 68, y0 + 65), "开始答题", 12, btn_fg, True, anchor="mm")
    txt((x0 + 140, y0 + 58), "暂停", 12, t2)
    txt((x0 + 186, y0 + 58), "只扫描", 12, t2)
    # tab
    txt((x0 + 16, y0 + 100), "判卷", 11, t1, True)
    d.line([(x0 + 16, y0 + 118), (x0 + 44, y0 + 118)], fill=t1, width=1)
    txt((x0 + 60, y0 + 100), "跳过", 11, t2)
    txt((x0 + 104, y0 + 100), "覆盖", 11, t2)
    d.line([(x0 + 16, y0 + 130), (x1 - 16, y0 + 130)], fill=line, width=1)
    # 日志
    rows = [("#8", "已有 D → 判卷…", t2), ("×", "错误，已改为 A", t1), ("#9", "已有 A → √ 保留", t2)]
    yy = y0 + 138
    for a, b, c in rows:
        if a == "×":
            d.rectangle([x0 + 16, yy - 1, x0 + 17, yy + 13], fill=t1)
            txt((x0 + 26, yy), a, 11, t1, True); txt((x0 + 46, yy), b, 11, t1)
        else:
            txt((x0 + 26, yy), a, 11, c); txt((x0 + 46, yy), b, 11, c)
        yy += 19
    # 状态条
    d.line([(x0 + 16, y1 - 34), (x1 - 16, y1 - 34)], fill=line, width=1)
    d.ellipse([x0 + 18, y1 - 22, x0 + 24, y1 - 16], fill=t1)
    txt((x0 + 30, y1 - 27), "deepseek-flash", 10, t2)
    txt((x1 - 18, y1 - 27), "12s", 10, t2, anchor="ra")

# 左：深色 HUD
txt((46, 96), "A · 深色 HUD（推荐）", 13, (255,255,255), True)
draw_page((46, 120, 726, 780), True)
draw_hud((476, 548, 706, 768), dark=True)
txt((46, 786), "白色页面上对比 21:1，边界清楚，像「工具层」压在内容之上", 10, (130,130,136))

# 右：浅色 HUD
txt((780, 96), "B · 浅色 HUD", 13, (255,255,255), True)
draw_page((780, 120, 1460, 780), False)
draw_hud((1210, 548, 1440, 768), dark=False)
txt((780, 786), "白底叠白页，只能靠 1px 描边+阴影区分，容易和页面糊在一起", 10, (130,130,136))

img.save(OUT)
print("saved", OUT, img.size)
