#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""按 mooc1 作业页的真实 DOM 结构生成测试页（22 题：10 单选 / 3 填空 / 8 判断 / 1 简答）"""
import html

SINGLE_STEMS = [
    "下列不属于软件项目管理需求过程的是？",
    "表示项目活动先后顺序与持续时间的工具是？",
    "需求变更中，哪种变更不需要走完整流程？",
    "描述系统数据流向与处理过程最常用的是？",
    "软件需求主要回答什么问题？",
    "下列哪项不是需求获取的常用手段？",
    "需求分析中最常用的方法是？",
    "项目范围说明书的核心组成部分不包括？",
    "结构化分析方法的核心工具是？",
    "WBS 的最底层通常称为什么？",
]
SINGLE_OPTS = ["需求获取", "需求分析", "需求规格编写", "需求更新"]
JUDGE_STEMS = [f"判断题 {i}：软件需求一旦确定就不应再变更。" for i in range(1, 9)]
BLANKS = [5, 1, 1]
FILL_STEMS = ["需求过程包括哪些环节？", "描述需求的常用句式载体是？", "需求分析最典型的方法是？"]


def single(i, stem):
    opts = "".join(
        f'''<div class="clearfix answerBg workTextWrap" onclick="addChoice(this)" role="radio" aria-label="{chr(65+j)} {o}选择" qid="q{i}" qtype="0">
      <span data="{chr(65+j)}" class="choice{i} num_option fl"> {chr(65+j)}</span>
      <div class="fl answer_p"><p></p><p>{o}</p><p></p></div></div>'''
        for j, o in enumerate(SINGLE_OPTS)
    )
    return f'''<div class="padBom50 questionLi fontLabel singleQuesId" typename="单选题" id="question{i}" role="option">
  <h3 class="mark_name colorDeep"><i>{i}.</i><span>(单选题)</span><p>{stem}</p></h3>
  <input type="hidden" name="answertype{i}" value="0">
  <input type="hidden" name="answer{i}" value="">
  <div class="stem_answer qtDetail">{opts}</div>
</div>'''


def judge(i, stem):
    opts = "".join(
        f'''<div class="clearfix answerBg workTextWrap" onclick="addChoice(this)" role="radio" aria-label="{chr(65+j)} {t}选择" qid="q{i}" qtype="3">
      <span data="{chr(65+j)}" class="choice{i} num_option fl"> {chr(65+j)}</span>
      <div class="fl answer_p"><p></p><p>{t}</p><p></p></div></div>'''
        for j, t in enumerate(["对", "错"])
    )
    return f'''<div class="padBom50 questionLi fontLabel singleQuesId" typename="判断题" id="question{i}" role="option">
  <h3 class="mark_name colorDeep"><i>{i}.</i><span>(判断题)</span><p>{stem}</p></h3>
  <div class="stem_answer qtDetail">{opts}</div>
</div>'''


def fill(i, stem, blanks):
    ifr = "".join(
        f'''<div style="margin:6px 0">第{b+1}空 <iframe name="ueditor_{i}_{b}" src="ueditor_blank.html" style="width:260px;height:38px;border:1px solid #ccc"></iframe></div>'''
        for b in range(blanks)
    )
    return f'''<div class="padBom50 questionLi fontLabel singleQuesId" typename="填空题" id="question{i}" role="option">
  <h3 class="mark_name colorDeep"><i>{i}.</i><span>(填空题)</span><p>{stem}</p></h3>
  <div class="stem_answer qtDetail">{ifr}</div>
</div>'''


def essay(i, stem):
    return f'''<div class="padBom50 questionLi fontLabel singleQuesId" typename="简答题" id="question{i}" role="option">
  <h3 class="mark_name colorDeep"><i>{i}.</i><span>(简答题)</span><p>{stem}</p></h3>
  <div class="stem_answer qtDetail">
    <iframe name="ueditor_{i}_0" src="ueditor_blank.html" style="width:100%;height:110px;border:1px solid #ccc"></iframe>
  </div>
</div>'''


parts = ['<h2>一. 单选题（共10题，45分）</h2>']
n = 1
for s in SINGLE_STEMS:
    parts.append(single(n, s)); n += 1
parts.append('<h2>二. 填空题（共3题，13.6分）</h2>')
for s, b in zip(FILL_STEMS, BLANKS):
    parts.append(fill(n, s, b)); n += 1
parts.append('<h2>三. 判断题（共8题，36.8分）</h2>')
for s in JUDGE_STEMS:
    parts.append(judge(n, s)); n += 1
parts.append('<h2>四. 简答题（共1题，4.6分）</h2>')
parts.append(essay(n, "简述提高需求评审有效性的做法。"))

page = f'''<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>作业作答（模拟 mooc1 结构）</title>
<style>
body{{font:14px/1.8 "Microsoft YaHei",sans-serif;max-width:900px;margin:20px auto;padding:0 16px;color:#222}}
h2{{font-size:15px;color:#666;margin:26px 0 10px}}
.questionLi{{padding:12px;border:1px solid #e6e6ea;border-radius:8px;margin-bottom:14px}}
.mark_name{{font-weight:600;font-size:14px;margin:0 0 8px}}
.mark_name p{{font-weight:400;margin:4px 0 0}}
.answerBg{{display:inline-block;padding:6px 12px;margin:4px 10px 4px 0;border:1px solid #dcdfe6;border-radius:6px;cursor:pointer}}
.answerBg[aria-checked="true"],.answerBg.checked{{background:#e8f1ff;border-color:#2f6feb}}
.num_option{{display:inline-block;margin-right:6px;color:#666}}
.answer_p p{{display:inline;margin:0}}
</style></head>
<body>
<h1 style="font-size:18px">第4章软件需求管理_课后作业（模拟 22 题）</h1>
<form>
<!-- 故意加的两个坑：外层包裹层 + 隐藏模板，复现"多一道题" -->
<div class="TiMu" id="tinmuWrapper">
{"".join(parts)}
<div class="questionLi" id="hiddenTemplate" style="display:none" typename="单选题"><h3 class="mark_name">模板</h3>
  <div class="stem_answer"><div class="answerBg" role="radio"><span data="A">A</span><div class="answer_p">x</div></div></div>
</div>
</div>
</form>
<script>
// 模拟超星的 addChoice：点击切换选中态
function addChoice(el) {{
  const box = el.closest('.stem_answer');
  const isCheckbox = el.getAttribute('role') === 'checkbox';
  if (!isCheckbox) box.querySelectorAll('.answerBg').forEach(d => d.removeAttribute('aria-checked'));
  const on = el.getAttribute('aria-checked') === 'true';
  el.setAttribute('aria-checked', on ? 'false' : 'true');
}}
</script>
</body></html>'''

open("fixture_chaoxing.html", "w", encoding="utf-8").write(page)
print("fixture_chaoxing.html 生成完毕，题数：", n - 1)
