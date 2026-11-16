#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""按真实「第7章 31 题」作业页结构生成测试页（6 填空 / 11 单选 / 11 判断 / 3 其它）"""

FILL = [
    ("（__）决定了项目在给定的金钱关系和资源条件下完成项目所需的最短时间。", 1),
    ("（__）是一种特殊的资源，以其单向性、不可重复性而有别于其他资源。", 1),
    ("在 ADM 网络图中，箭线表示（__）。", 1),
    ("（__）和（__）都是时间压缩法。", 2),
    ("工程评估评审技术采用加权平均的公式是（__）。", 1),
    ("任务之间的排序依据主要有（__）、（__）、（__）等。", 3),
]
SINGLE = [
    ("下面说法中不正确的是（ ）", ["EF=ES+duration", "LS=LF-duration", "TF=LS-ES=LF-EF", "EF=ES+lag"]),
    ("“软件编码完成之后，我才可以对它进行软件测试”，这说明了哪种依赖关系？", ["强制性依赖关系", "软逻辑关系", "外部依赖关系", "里程碑"]),
    ("（ ）可以显示任务的基本信息，能方便查看工期、开始结束时间以及资源信息", ["甘特图", "网络图", "里程碑图", "资源图"]),
    ("（ ）是项目冲突的主要原因，尤其在项目后期", ["优先级问题", "人力问题", "进度问题", "费用问题"]),
    ("以下哪一项是项目计划中灵活性最小的因素？", ["时间", "人工成本", "管理", "开发"]),
    ("以下哪一项不是任务之间的关系？", ["结束-开始", "开始-开始", "结束-结束", "结束-开始-结束"]),
    ("快速跟进是指什么？", ["采用并行执行任务，加速项目进展", "用一个任务取代另外的任务", "减少任务数量", "减轻项目风险"]),
    ("下面哪一项将延长项目的进度？", ["lag", "lead", "赶工", "快速跟进"]),
    ("下面哪一项可以决定进度的灵活性？", ["PERT", "总浮动", "ADM", "赶工"]),
    ("（ ）可以表示敏捷项目的进度，并且能表示剩余任务", ["燃起图", "燃尽图", "里程碑图", "网络图"]),
    ("以下哪一项不是编制进度的基本方法？", ["关键路径法", "时间压缩法", "系统图法", "资源平衡方法"]),
]
JUDGE = [
    "一个工作包可以通过多个活动完成。",
    "在项目进行过程中，关键路径是不变的。",
    "在 PDM 网络图中，箭线表示任务之间的逻辑关系，节点表示活动。",
    "项目各项活动之间不存在相互联系与相互依赖关系。",
    "在资源冲突问题中，过度分配也属于资源冲突。",
    "浮动是在不增加项目成本的条件下，一个活动可以延迟的时间量。",
    "在使用应急法压缩时间时，不一定要在关键路径上选择活动来进行压缩。",
    "时间是项目规划中灵活性最小的因素。",
    "外部依赖关系又称强制性依赖关系。",
    "当估算某活动时间存在很大不确定性时应采用 CPM 估计。",
    "敏捷项目一般采取远粗近细的计划模式。",
]
OTHER_IMG = "根据下面任务流程图和下表给出的项目历时估算值，采用PERT方法估算，求出项目在14.57天内完成的概率的近似值。<br><img src=\"diagram.png\" width=\"560\" height=\"190\">"

OTHER = [
    "对一个任务进行进度估算时，A 乐观估计 6 天，B 悲观估计 24 天，C 最有可能是 12 天，历时估算介于 10 到 16 天的概率是多少？",
    "请将下图所示的 PDM（优先图法）网络图改画为 ADM（箭线法）网络图。",
    "根据任务流程图和项目历时估算值，采用 PERT 方法求出项目在 14.57 天内完成的概率近似值。",
]

n = 1
parts = []


def wrap(inner, qid, typename, head):
    return f'''<div class="padBom50 questionLi fontLabel singleQuesId" typename="{typename}" id="question{qid}" role="option" aria-label="题目 {qid_idx}.">
  <h3 class="mark_name colorDeep"><i>{qid_idx}.</i><span>({typename})</span><p>{head}</p></h3>
  <input type="hidden" name="answertype{qid}" value="0">
  {inner}
</div>'''


parts.append('<h3 class="section">一. 填空题（共6题，19.2分）</h3>')
for stem, blanks in FILL:
    qid_idx = n
    inner = '<div class="stem_answer">'
    for b in range(blanks):
        inner += f'''<div class="Answer">
      <span class="tiankong fl">第{b+1}空</span>
      <div class="divText fl wid750"><div class="textDIV">
        <div class="edui-default"><div id="edui{qid_idx}_{b}" class="edui-editor">
          <iframe id="ueditor_{b}" src="ueditor_blank.html" frameborder="0" style="width:520px;height:46px"></iframe>
        </div></div>
      </div></div>
    </div>'''
    inner += '</div>'
    parts.append(f'''<div class="padBom50 questionLi fontLabel singleQuesId" typename="填空题" id="question9{n:05d}" role="option" aria-label="题目 {n}.">
  <h3 class="mark_name colorDeep"><i>{n}.</i><span>(填空题)</span><p>{stem}</p></h3>
  <input type="hidden" name="tiankongsize9{n:05d}" value="{blanks}">
  {inner}
</div>''')
    n += 1

parts.append('<h3 class="section">二. 单选题（共11题，35.2分）</h3>')
for stem, opts in SINGLE:
    pre_wrong = (n == 8)   # 预填 D → 错，应被更正为 A
    pre_right = (n == 9)   # 预填 A → 对，应保留
    o = "".join(
        f'''<div class="clearfix answerBg workTextWrap" onclick="addChoice(this)" role="radio" aria-label="{chr(65+j)} {t}选择" qtype="0"{" aria-checked=\"true\"" if ((pre_wrong and j == 3) or (pre_right and j == 0)) else ""}>
      <span data="{chr(65+j)}" class="num_option fl"> {chr(65+j)}</span>
      <div class="fl answer_p"><p></p><p>{t}</p><p></p></div></div>'''
        for j, t in enumerate(opts)
    )
    parts.append(f'''<div class="padBom50 questionLi fontLabel singleQuesId" typename="单选题" id="question8{n:05d}" role="option" aria-label="题目 {n}.">
  <h3 class="mark_name colorDeep"><i>{n}.</i><span>(单选题)</span><p>{stem}</p></h3>
  <div class="stem_answer qtDetail">{o}</div>
</div>''')
    n += 1

parts.append('<h3 class="section">三. 判断题（共11题，35.7分）</h3>')
for stem in JUDGE:
    o = "".join(
        f'''<div class="clearfix answerBg workTextWrap" onclick="addChoice(this)" role="radio" aria-label="{chr(65+j)} {t}选择" qtype="3">
      <span data="{chr(65+j)}" class="num_option fl"> {chr(65+j)}</span>
      <div class="fl answer_p"><p></p><p>{t}</p><p></p></div></div>'''
        for j, t in enumerate(["对", "错"])
    )
    parts.append(f'''<div class="padBom50 questionLi fontLabel singleQuesId" typename="判断题" id="question7{n:05d}" role="option" aria-label="题目 {n}.">
  <h3 class="mark_name colorDeep"><i>{n}.</i><span>(判断题)</span><p>{stem}</p></h3>
  <div class="stem_answer qtDetail">{o}</div>
</div>''')
    n += 1

parts.append('<h3 class="section">四. 其它（共4题，含1道带图题）</h3>')
for stem in OTHER + [OTHER_IMG]:
    parts.append(f'''<div class="padBom50 questionLi fontLabel singleQuesId" typename="其它" id="question6{n:05d}" role="option" aria-label="题目 {n}.">
  <h3 class="mark_name colorDeep"><i>{n}.</i><span>(其它)</span><p>{stem}</p></h3>
  <div class="stem_answer">
    <div class="edui-default"><div id="eduiEssay{n}" class="edui-editor">
      <iframe id="ueditor_{n}" src="ueditor_blank.html" frameborder="0" style="width:100%;height:120px"></iframe>
    </div></div>
  </div>
</div>''')
    n += 1

total = n - 1

page = f'''<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>作业作答（模拟第7章 31 题）</title>
<style>
body{{font:14px/1.8 "Microsoft YaHei",sans-serif;max-width:940px;margin:20px auto;padding:0 16px}}
h3.section{{font-size:15px;color:#666;margin:24px 0 10px}}
.questionLi{{padding:12px;border:1px solid #e6e6ea;border-radius:8px;margin-bottom:14px}}
.mark_name{{font-weight:600;font-size:14px;margin:0 0 8px}} .mark_name p{{font-weight:400;margin:4px 0 0}}
.answerBg{{display:inline-block;padding:6px 12px;margin:4px 10px 4px 0;border:1px solid #dcdfe6;border-radius:6px;cursor:pointer}}
.answerBg[aria-checked="true"]{{background:#e8f1ff;border-color:#2f6feb}}
.num_option{{display:inline-block;margin-right:6px;color:#666}}
.tiankong{{color:#2f6feb;margin-right:8px}}
.textDIV{{display:inline-block}} .answer_p p{{display:inline;margin:0}}
</style></head>
<body>
<h1 style="font-size:18px">第7章软件项目进度计划_课后作业（模拟 {total} 题）</h1>
<p>题量: {total}</p>
<form>
<div class="TiMu" id="outerWrapper">
{"".join(parts)}
<div class="questionLi" id="hiddenTemplate" style="display:none" typename="单选题">
  <h3 class="mark_name">模板</h3>
  <div class="stem_answer"><div class="answerBg" role="radio"><span data="A">A</span><div class="answer_p">x</div></div></div>
</div>
</div>
</form>
<script>
function addChoice(el) {{
  const box = el.closest('.stem_answer');
  if (el.getAttribute('role') !== 'checkbox') box.querySelectorAll('.answerBg').forEach(d => d.removeAttribute('aria-checked'));
  el.setAttribute('aria-checked', el.getAttribute('aria-checked') === 'true' ? 'false' : 'true');
}}
</script>
</body></html>'''

open("fixture_31.html", "w", encoding="utf-8").write(page)
print("fixture_31.html 生成，题数 =", total)
