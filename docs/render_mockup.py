#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""渲染「静答 QuietAnswer」UI 设计效果图（纯 Pillow 绘制）"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUT = "docs/mockup.png"
W, H = 1500, 1020
BG = (22, 23, 27)
PANEL = (30, 32, 39)
STROKE = (42, 45, 54)
BLUE = (47, 111, 235)
GREEN = (47, 191, 113)
YELLOW = (245, 165, 36)
RED = (229, 72, 77)
TXT = (237, 238, 242)
SUB = (138, 143, 155)

F = "C:/Windows/Fonts/msyh.ttc"
FB = "C:/Windows/Fonts/msyhbd.ttc"
FM = "C:/Windows/Fonts/consola.ttf"


def font(size, bold=False, mono=False):
    if mono:
        try:
            return ImageFont.truetype(FM, size)
        except Exception:
            return ImageFont.truetype(F, size)
    return ImageFont.truetype(FB if bold else F, size)


img = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(img)


def rr(box, r=14, fill=PANEL, outline=STROKE, width=1, shadow=False):
    if shadow:
        sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        ImageDraw.Draw(sh).rounded_rectangle(box, r, fill=(0, 0, 0, 110))
        img.paste(Image.alpha_composite(img.convert("RGBA"), sh.filter(ImageFilter.GaussianBlur(14))).convert("RGB"), (0, 0))
        d2 = ImageDraw.Draw(img)
        d2.rounded_rectangle(box, r, fill=fill, outline=outline, width=width)
        return
    d.rounded_rectangle(box, r, fill=fill, outline=outline, width=width)


def txt(xy, s, size=13, color=TXT, bold=False, mono=False, anchor=None):
    d.text(xy, s, font=font(size, bold, mono), fill=color, anchor=anchor)


def dot(xy, color, r=4):
    d.ellipse([xy[0] - r, xy[1] - r, xy[0] + r, xy[1] + r], fill=color)


def btn(box, label, kind="ghost", size=13):
    if kind == "primary":
        rr(box, 10, BLUE, BLUE)
        txt(((box[0] + box[2]) // 2, (box[1] + box[3]) // 2), label, size, (255, 255, 255), True, anchor="mm")
    else:
        rr(box, 10, (38, 40, 47), STROKE)
        txt(((box[0] + box[2]) // 2, (box[1] + box[3]) // 2), label, size, TXT, False, anchor="mm")


def chip(x, y, label, active=False):
    w = 14 + len(label) * 13
    box = [x, y, x + w, y + 28]
    if active:
        rr(box, 14, (32, 62, 122), (47, 111, 235))
        txt((x + w // 2, y + 14), label, 12, (168, 200, 255), True, anchor="mm")
    else:
        rr(box, 14, (36, 38, 45), STROKE)
        txt((x + w // 2, y + 14), label, 12, SUB, False, anchor="mm")
    return x + w + 8


def logo(x, y, s=22):
    d.rounded_rectangle([x, y, x + s, y + s], int(s * 0.24), fill=BLUE)
    d.rounded_rectangle([x + s * 0.22, y + s * 0.30, x + s * 0.74, y + s * 0.66], int(s * 0.12), fill=(255, 255, 255))
    d.polygon([(x + s * 0.60, y + s * 0.68), (x + s * 0.86, y + s * 0.82), (x + s * 0.58, y + s * 0.84)], fill=(255, 255, 255))
    d.line([(x + s * 0.56, y + s * 0.50), (x + s * 0.66, y + s * 0.60), (x + s * 0.84, y + s * 0.38)],
           fill=GREEN, width=max(2, int(s * 0.12)), joint="curve")


# ───── 标题 ─────
logo(46, 34, 26)
txt((84, 40), "静答 QuietAnswer", 20, TXT, True)
txt((84, 68), "学习通 / 超星 · 判卷式答题助手", 13, SUB)
txt((W - 46, 46), "UI 设计方案 v1", 13, SUB, anchor="ra")

# ═══════ 左：折叠胶囊 + 展开面板 ═══════
txt((46, 116), "① 页面内 HUD", 14, (168, 200, 255), True)
txt((46, 140), "三态：折叠胶囊 / 展开面板 / 单题模式", 12, SUB)

# 折叠胶囊
rr([46, 172, 246, 220], 24, (30, 32, 39), STROKE, shadow=True)
dot((70, 196), GREEN, 5)
txt((84, 188), "静答", 13, TXT, True)
txt((150, 189), "3/31", 13, (168, 200, 255))
txt((226, 188), "^", 13, SUB)

# 展开面板
rr([46, 244, 470, 640], 14, (30, 32, 39), STROKE, shadow=True)
# 头部
d.rounded_rectangle([46, 244, 470, 288], 14, fill=(36, 38, 45))
d.rectangle([46, 276, 470, 288], fill=(36, 38, 45))
dot((68, 266), BLUE, 5)
txt((82, 258), "静答", 13, TXT, True)
txt((128, 259), "3/31", 12, (168, 200, 255))
txt((410, 258), "v", 12, SUB)
txt((438, 257), "x", 12, SUB)

# 主操作
btn([62, 302, 168, 338], "开始答题", "primary", 12)
btn([176, 302, 232, 338], "暂停", "ghost", 12)
btn([240, 302, 330, 338], "只扫描", "ghost", 12)

# 模式 chips
txt((62, 352), "模式", 12, SUB)
cx = 100
for label, act in (("判卷", True), ("跳过", False), ("覆盖", False)):
    cx = chip(cx, 344, label, act)

# 日志
rr([62, 388, 454, 566], 10, (18, 19, 23), STROKE)
logs = [
    ("#8  已有「D」→ 判卷中…", SUB),
    ("    ×  错误，已改为 A", RED),
    ("#9  已有「A」→ √ 正确，保留", GREEN),
    ("#10 [single] 选项匹配中…", SUB),
    ("    √  已填 A", GREEN),
    ("#11 [judge] 已有「对」→ 判卷中…", SUB),
]
yy = 400
for s, c in logs:
    txt((74, yy), s, 11, c, mono=False)
    yy += 26

# 状态条
d.line([(62, 580), (454, 580)], fill=STROKE)
dot((74, 602), GREEN, 4)
txt((86, 594), "deepseek-flash · 正常", 11, SUB)
txt((444, 594), "12s 前", 11, SUB, anchor="ra")

# 单题模式小提示
rr([46, 656, 470, 706], 12, (28, 30, 36), STROKE)
txt((62, 668), "单题模式：只答当前视口内的题", 12, (168, 200, 255))
txt((62, 688), "当前题 12/31 · 适合长卷子边看边答", 11, SUB)

# ═══════ 中：工具栏弹窗 ═══════
txt((520, 116), "② 工具栏弹窗", 14, (168, 200, 255), True)
txt((520, 140), "双状态卡 + 未注入时禁用主按钮", 12, SUB)

rr([520, 172, 860, 560], 16, (30, 32, 39), STROKE, shadow=True)
logo(542, 196, 24)
txt((576, 198), "静答", 15, TXT, True)
txt((836, 200), "v1.9.1", 11, SUB, anchor="ra")
d.line([(542, 236), (838, 236)], fill=STROKE)

# 状态卡 1
rr([540, 250, 840, 304], 10, (36, 38, 45), STROKE)
dot((558, 268), GREEN, 4)
txt((572, 260), "接口", 12, SUB)
txt((620, 259), "deepseek-flash", 12, TXT)
txt((560, 282), "● 连通 · 平均 1.2s", 11, GREEN)
txt((824, 268), "改", 11, (168, 200, 255), anchor="ra")

# 状态卡 2
rr([540, 312, 840, 366], 10, (36, 38, 45), STROKE)
dot((558, 330), GREEN, 4)
txt((572, 322), "页面", 12, SUB)
txt((620, 321), "已注入 · 31 题", 12, TXT)
txt((560, 344), "fill×6 · single×11 · judge×11 · essay×3", 10, SUB)

# 主按钮
btn([540, 384, 840, 428], "开始答题", "primary", 14)
btn([540, 438, 682, 476], "只扫描")
btn([694, 438, 840, 476], "设置", "ghost", 13)

d.line([(542, 500), (838, 500)], fill=STROKE)
txt((540, 512), "by YG · MIT · 关于", 11, SUB)
txt((540, 532), "提示：先「只扫描」确认题数，再开始答题", 11, (120, 125, 138))

# ═══════ 右：设置页结构 ═══════
txt((914, 116), "③ 设置页布局", 14, (168, 200, 255), True)
txt((914, 140), "左侧锚点导航 + 右侧分组卡片", 12, SUB)

rr([914, 172, 1454, 700], 16, (28, 30, 36), STROKE, shadow=True)
# 左侧导航
d.rounded_rectangle([914, 172, 1090, 700], 16, fill=(24, 25, 30))
d.rectangle([1082, 172, 1090, 700], fill=(24, 25, 30))
navs = [("接口", True), ("答题行为", False), ("已有答案", False), ("高级", False), ("关于", False)]
yy = 210
for label, act in navs:
    if act:
        d.rounded_rectangle([928, yy - 8, 1076, yy + 22], 8, fill=(40, 60, 105))
        txt((940, yy - 2), label, 12, (168, 200, 255), True)
    else:
        txt((940, yy - 2), label, 12, SUB)
    yy += 46

# 右侧卡片
txt((1112, 196), "接口", 14, TXT, True)
cx = 1112
for label, act in (("V4.1-Flash", True), ("V4-Pro", False), ("Ollama", False)):
    cx = chip(cx, 222, label, act)

for i, (label, value) in enumerate([
    ("Base URL", "https://api.deepseek.com/v1"),
    ("API Key", "sk-••••••••••••••••"),
    ("模型名", "deepseek-flash"),
]):
    y = 268 + i * 76
    txt((1112, y), label, 11, SUB)
    rr([1112, y + 18, 1434, y + 54], 8, (36, 38, 45), STROKE)
    txt((1124, y + 27), value, 12, TXT, mono=True)

btn([1112, 512, 1244, 548], "测试连接")
dot((1262, 530), GREEN, 4)
txt((1276, 522), "连接成功 · 2 个模型", 11, GREEN)

d.line([(1112, 574), (1434, 574)], fill=STROKE)
txt((1112, 588), "已有答案的题", 13, TXT, True)
cx = 1112
for label, act in (("先判卷", True), ("跳过", False), ("覆盖", False)):
    cx = chip(cx, 614, label, act)
txt((1112, 658), "判卷最小置信度  0.70", 11, SUB)
d.rounded_rectangle([1264, 660, 1434, 668], 4, fill=(48, 51, 60))
d.rounded_rectangle([1264, 660, 1264 + int(170 * 0.7), 668], 4, fill=BLUE)
d.ellipse([1264 + int(170 * 0.7) - 7, 657, 1264 + int(170 * 0.7) + 7, 671], fill=(255, 255, 255))

# 关于区
rr([1112, 690, 1434, 690 + 0], 8, (28, 30, 36), STROKE)

# ═══════ 底部：署名条 ═══════
d.line([(46, 760), (1454, 760)], fill=STROKE)
txt((46, 780), "署名规范", 14, (168, 200, 255), True)
rows = [
    ("视觉署名", "静答 QuietAnswer · by YG · v1.9.1  （弹窗底部 / 设置「关于」/ 扩展详情页）"),
    ("元数据", "manifest: name / short_name / author / homepage_url / description"),
    ("代码头", "/*! 静答 QuietAnswer v1.9.1 · (c) 2026 YG · MIT · build 2026-11-16T17:40+08:00 · sha 4f2a91c */"),
    ("仓库", "LICENSE (MIT) · NOTICE.md（第三方依赖） · CHANGELOG.md（每版一节）"),
    ("首次运行", "一次性提示：本工具仅辅助作答，提交前请自行核对"),
]
yy = 812
for k, v in rows:
    txt((46, yy), k, 12, SUB)
    txt((150, yy - 1), v, 12, TXT if k != "代码头" else (168, 200, 255), mono=False)
    yy += 34

img.save(OUT)
print("saved", OUT, img.size)
