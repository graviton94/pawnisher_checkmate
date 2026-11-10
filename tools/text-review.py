"""수직 조각 텍스트 점검 아티팩트를 만든다 (D-157).
사용: python3 -I tools/text-review.py <출력.html>  (먼저 sim/text-export.sim.ts로 docs/text/slice-text.json 생성)
항목마다 '댓글' 버튼 → claude.ai 댓글 작성기가 그 줄에 열린다 (comments composer_only)."""
import json, re, sys, html, datetime

items = json.load(open('docs/text/slice-text.json', encoding='utf8'))
code = re.compile(r'\$\{|=>|innerHTML|\.join\(|\?\s*`|\)\s*\{|^[,;)}\s]')
items = [x for x in items if not (x['group'] == '화면 문구' and code.search(x['text']))]
groups = []
for x in items:
    if x['group'] not in groups: groups.append(x['group'])

def row(x):
    fx = f'<span class="fx">{html.escape(x["fx"])}</span>' if x.get('fx') else ''
    return (f'<li class="item" id="{html.escape(x["id"])}" data-comment-target data-q="{html.escape((x["name"]+" "+x["text"]+" "+(x.get("fx") or "")).lower())}">'
            f'<div class="name">{html.escape(x["name"])}</div><div class="txt">{html.escape(x["text"])}{fx}</div>'
            f'<button type="button" class="cbtn" aria-label="{html.escape(x["name"])}에 댓글">댓글</button></li>')

sections = ''.join(
    f'<section id="g{i}"><h2>{html.escape(g)} <span class="n">{sum(1 for x in items if x["group"]==g)}</span></h2><ul>' + ''.join(row(x) for x in items if x['group']==g) + '</ul></section>'
    for i, g in enumerate(groups))
nav = ''.join(f'<a href="#g{i}">{html.escape(g)}</a>' for i, g in enumerate(groups))
today = datetime.date.today().isoformat()

page = f'''<title>수직 조각 문구 점검</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;600&family=IBM+Plex+Mono:wght@500&display=swap">
<style>
/* 레이아웃: 위에 규칙 카드 + 검색 · 갈래 이동, 아래는 갈래별 한 줄 목록 (이름 | 문구 · 효과 | 댓글) */
:root {{
  --bg: #f5f3ef; --panel: #ffffff; --fg: #1d1b20; --muted: #6b6570; --line: #e2ddd5; --brass: #9a6b16; --brass-bg: #f3e6c8; --hl: #fff4cf;
  --sans: "IBM Plex Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif; --mono: "IBM Plex Mono", ui-monospace, monospace;
}}
@media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) {{ --bg: #141217; --panel: #1d1a21; --fg: #ece8e1; --muted: #a39ca8; --line: #332e38; --brass: #e2b85a; --brass-bg: #3a2f17; --hl: #3a3218; color-scheme: dark; }} }}
:root[data-theme="dark"] {{ --bg: #141217; --panel: #1d1a21; --fg: #ece8e1; --muted: #a39ca8; --line: #332e38; --brass: #e2b85a; --brass-bg: #3a2f17; --hl: #3a3218; color-scheme: dark; }}
body {{ background: var(--bg); color: var(--fg); font: 15px/1.55 var(--sans); padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); padding-block: 20px 48px; }}
.wrap {{ max-width: 920px; margin: 0 auto; display: grid; gap: 18px; }}
h1 {{ margin: 0; font-size: 24px; font-weight: 600; text-wrap: balance; }}
.sub {{ margin: 4px 0 0; color: var(--muted); font-size: 13px; }}
.rules {{ background: var(--panel); border: 1px solid var(--line); border-radius: 6px; padding: 12px 16px; font-size: 14px; }}
.rules h2 {{ margin: 0 0 6px; font-size: 14px; color: var(--brass); letter-spacing: .04em; }}
.rules ul {{ margin: 0; padding-left: 18px; display: grid; gap: 2px; }}
.bar {{ position: sticky; top: env(safe-area-inset-top, 0px); z-index: 5; background: var(--bg); padding: 8px 0; display: grid; gap: 8px; border-bottom: 1px solid var(--line); }}
body::before {{ content: ""; position: fixed; inset: 0 0 auto; height: env(safe-area-inset-top, 0px); z-index: 10; background: var(--bg); }}
#q {{ width: 100%; box-sizing: border-box; min-height: 44px; padding: 8px 12px; font: 15px var(--sans); color: var(--fg); background: var(--panel); border: 1px solid var(--line); border-radius: 6px; }}
#q:focus {{ outline: 2px solid var(--brass); outline-offset: 1px; }}
nav {{ display: flex; flex-wrap: wrap; gap: 6px; }}
nav a {{ font-size: 13px; color: var(--fg); text-decoration: none; padding: 4px 10px; border: 1px solid var(--line); border-radius: 999px; background: var(--panel); }}
nav a:hover, nav a:focus-visible {{ border-color: var(--brass); }}
section h2 {{ font-size: 16px; margin: 6px 0 8px; }}
section h2 .n {{ font: 500 12px var(--mono); color: var(--muted); }}
ul {{ list-style: none; margin: 0; padding: 0; }}
.item {{ display: grid; grid-template-columns: minmax(120px, 220px) 1fr auto; gap: 12px; align-items: start; padding: 10px 12px; border-bottom: 1px solid var(--line); background: var(--panel); }}
section ul .item:first-child {{ border-top-left-radius: 6px; border-top-right-radius: 6px; }}
section ul .item:last-child {{ border-bottom: 0; border-bottom-left-radius: 6px; border-bottom-right-radius: 6px; }}
section ul {{ border: 1px solid var(--line); border-radius: 6px; }}
.item:target {{ background: var(--hl); }}
.name {{ font-weight: 600; font-size: 14px; min-width: 0; }}
.txt {{ min-width: 0; display: grid; gap: 2px; }}
.fx {{ font: 500 12px/1.5 var(--mono); color: var(--muted); }}
.cbtn {{ min-height: 36px; min-width: 56px; padding: 4px 10px; font: 600 13px var(--sans); color: var(--brass); background: var(--brass-bg); border: 1px solid transparent; border-radius: 6px; cursor: pointer; }}
.cbtn:hover, .cbtn:focus-visible {{ border-color: var(--brass); outline: none; }}
.cbtn[hidden] {{ display: none; }}
.empty {{ color: var(--muted); padding: 12px; }}
@media (max-width: 560px) {{ .item {{ grid-template-columns: 1fr auto; }} .txt {{ grid-column: 1 / -1; grid-row: 2; }} }}
@media (prefers-reduced-motion: reduce) {{ html {{ scroll-behavior: auto; }} }}
</style>
<div class="wrap">
  <header>
    <h1>수직 조각 문구 점검</h1>
    <p class="sub">{len(items)}줄 · {today} 기준 · 줄마다 「댓글」을 누르면 그 줄에 댓글이 붙는다. Claude가 댓글을 읽고 원본 데이터에 반영한다.</p>
  </header>
  <div class="rules">
    <h2>서술 스타일 규칙</h2>
    <ul>
      <li>존댓말 안내 금지. 모두 짧고 차갑게. 정겨운 말투 · 농담 · 애칭 · 말꼬리 금지.</li>
      <li>서술: 줄 앞 「* 」, ~다 체, 담담한 두 박자 + 엉뚱한 작은 디테일 하나 (“* 나사를 먹는 기계. 배가 고파 보인다.”)</li>
      <li>인물 대사: 반말, 큰따옴표 “ ”. 주인공 독백: 작은따옴표 ‘ ’, 결정적 순간에만.</li>
      <li>버튼은 동사 하나. 느낌표는 치명적인 순간에만, 물음표는 무작위 선택에만.</li>
    </ul>
  </div>
  <div class="bar">
    <input id="q" type="search" placeholder="찾기 — 이름 · 문구 · 효과" aria-label="찾기">
    <nav>{nav}</nav>
  </div>
  {sections}
  <p class="empty" id="none" hidden>찾는 줄이 없다.</p>
</div>
<script>
(() => {{
  const q = document.getElementById('q');
  const items = [...document.querySelectorAll('.item')];
  q.addEventListener('input', () => {{
    const v = q.value.trim().toLowerCase();
    let shown = 0;
    for (const el of items) {{ const on = !v || el.dataset.q.includes(v); el.hidden = !on; if (on) shown++; }}
    for (const s of document.querySelectorAll('section')) s.hidden = ![...s.querySelectorAll('.item')].some((el) => !el.hidden);
    document.getElementById('none').hidden = shown > 0;
  }});
  // 댓글: claude.ai의 댓글 작성기를 그 줄에 연다 (없는 화면이면 버튼을 숨긴다 — 댓글 모드로 줄을 눌러도 된다)
  let comments = null;
  const btns = [...document.querySelectorAll('.cbtn')];
  const hide = () => btns.forEach((b) => (b.hidden = true));
  if (!window.claude || !window.claude.use) hide();
  else window.claude.use('comments').then((c) => {{ comments = c; if (!c) hide(); }}).catch(hide);
  document.addEventListener('click', async (e) => {{
    const b = e.target.closest('.cbtn');
    if (!b || !comments) return;
    try {{ await comments.openComposer({{ element: b.closest('.item') }}); }}
    catch (err) {{ if (err && err.code === 'unavailable') hide(); }}
  }});
}})();
</script>
'''
open(sys.argv[1], 'w', encoding='utf8').write(page)
print(len(items), 'items')
