"""발주서 아티팩트 (D-300): docs/asset-order-master.md → 한 장짜리 HTML (순위별 · 첨부 그림 · 프롬프트 복사 단추).

python3 -I tools/order/order_page.py <out.html>

md가 정본이다 — 상자를 고치면 md를 고치고 이 스크립트로 다시 만든다.
12위(아이콘 시트)는 D-291로 Claude가 직접 그려 끝났으니 페이지에서 뺀다. 받은 그림(public/scenes/<이름>.png가 있는 것)은 「받음」으로 표시한다.
"""
import base64
import html
import io
import os
import re
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MD = os.path.join(ROOT, 'docs', 'asset-order-master.md')
SCENES = os.path.join(ROOT, 'public', 'scenes')
ATTACH = [
    ('①', '기물 도트', 'build-res/pieces-small-source.png', 900),
    ('②', '화풍 기준 — 쇳물 위 그림자 킹', 'build-res/order/V-07-pact-source.png', 720),
    ('③', '게임 속 검은 킹 도트 (반장 · 도금왕만)', 'build-res/order/K-black-new-source.png', 0),
]


def data_uri(path, width):
    im = Image.open(os.path.join(ROOT, path)).convert('RGBA')
    if width and im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.NEAREST)
    elif im.width < 120:
        k = max(1, 160 // im.width)
        im = im.resize((im.width * k, im.height * k), Image.NEAREST)
    buf = io.BytesIO()
    im.save(buf, 'PNG', optimize=True)
    return 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()


def inline(s):
    s = html.escape(s)
    s = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', s)
    s = re.sub(r'`([^`]+)`', r'<code>\1</code>', s)
    return s


def parse():
    lines = open(MD, encoding='utf-8').read().split('\n')
    secs, cur, code = [], None, None
    for ln in lines:
        if code is not None:
            if ln.startswith('```'):
                cur['blocks'].append(('code', '\n'.join(code)))
                code = None
            else:
                code.append(ln)
            continue
        if ln.startswith('```'):
            code = []
            continue
        if ln.startswith('## '):
            cur = {'head': ln[3:].strip(), 'blocks': []}
            secs.append(cur)
            continue
        if cur is not None:
            cur['blocks'].append(('text', ln))
    return secs


def files_of(head):
    fs = re.findall(r'`(?:public/scenes/)?([A-Za-z0-9-]+)\.png`', head)
    m = re.search(r'`([A-Za-z-]+)-(\d+)\.png` ~ `\1-(\d+)\.png`', head)  # boss-gilded-1 ~ 4 같은 범위
    if m:
        fs = [f for f in fs if not f.startswith(m.group(1) + '-')] + [f'{m.group(1)}-{i}' for i in range(int(m.group(2)), int(m.group(3)) + 1)]
    return fs


def render_text(lines):
    out, para, table = [], [], []

    def flush():
        if para:
            out.append('<p>' + '<br>'.join(inline(x) for x in para) + '</p>')
            para.clear()

    def flush_table():
        if table:
            rows = [r for r in table if not re.match(r'^\|\s*:?-', r)]
            cells = [[c.strip() for c in r.strip('|').split('|')] for r in rows]
            h = ''.join(f'<th>{inline(c)}</th>' for c in cells[0])
            b = ''.join('<tr>' + ''.join(f'<td>{inline(c)}</td>' for c in r) + '</tr>' for r in cells[1:])
            out.append(f'<div class="tw"><table><thead><tr>{h}</tr></thead><tbody>{b}</tbody></table></div>')
            table.clear()

    for ln in lines:
        s = ln.strip()
        if s.startswith('|'):
            flush()
            table.append(s)
            continue
        flush_table()
        if not s or s == '---':
            flush()
            continue
        if s.startswith('### '):
            flush()
            out.append(f'<h4>{inline(s[4:])}</h4>')
        elif s.startswith('- '):
            flush()
            out.append(f'<p class="li">{inline(s[2:])}</p>')
        elif s.startswith('> '):
            flush()
            out.append(f'<p class="note">{inline(s[2:])}</p>')
        else:
            para.append(s)
    flush()
    flush_table()
    return '\n'.join(out)


def render_blocks(blocks, start_id):
    out, txt, n = [], [], start_id
    for kind, body in blocks:
        if kind == 'text':
            txt.append(body)
            continue
        out.append(render_text(txt))
        txt = []
        n += 1
        out.append(f'<div class="prompt"><div class="pbar"><span>프롬프트 {n - start_id}</span><button type="button" class="copy" data-for="p{n}">복사</button></div><pre id="p{n}">{html.escape(body)}</pre></div>')
    out.append(render_text(txt))
    return '\n'.join(out), n


def main(out_path):
    secs = parse()
    have = {f[:-4] for f in os.listdir(SCENES) if f.endswith('.png')}
    intro = next(s for s in secs if s['head'].startswith('0.'))
    groups, g = [], None
    for s in secs:
        m = re.match(r'(\d+)위 · (.*)', s['head'])
        if m:
            if int(m.group(1)) >= 12:
                break
            g = {'rank': int(m.group(1)), 'head': m.group(2), 'sec': s, 'items': []}
            groups.append(g)
        elif g and re.match(r'[A-Z]-\d', s['head']):
            g['items'].append(s)

    # 한눈에 표: 12위 줄은 끝났다고 고쳐 적는다
    rows = []
    for ln in intro['blocks']:
        if ln[0] == 'text' and ln[1].startswith('| 12 '):
            continue
        rows.append(ln)
    intro_html = render_text([b for k, b in rows if k == 'text'])
    intro_html = intro_html.replace('합계 47장 + 아이콘 시트 10장.', '합계 47장.')

    pid = 0
    nav, body = [], []
    total, got = 0, 0
    for g in groups:
        units = g['items'] or [g['sec']]
        fs = [f for u in units for f in files_of(u['head'])] or files_of(g['sec']['head'])
        n_have = sum(1 for f in fs if f in have)
        total += len(fs)
        got += n_have
        status = '받음' if fs and n_have == len(fs) else (f'{n_have}/{len(fs)} 받음' if n_have else '대기')
        cls = 'done' if status == '받음' else ''
        nav.append(f'<a href="#r{g["rank"]}" class="{cls}"><span>{g["rank"]}</span>{inline(g["head"].split("→")[0].split(" (")[0].strip())}</a>')
        head_html, pid = render_blocks(g['sec']['blocks'], pid)
        items_html = []
        for it in g['items']:
            ih, pid = render_blocks(it['blocks'], pid)
            f = files_of(it['head'])
            mark = '<em class="got">받음</em>' if f and all(x in have for x in f) else ''
            items_html.append(f'<section class="item"><h3>{inline(it["head"])}{mark}</h3>{ih}</section>')
        body.append(
            f'<article class="rank {cls}" id="r{g["rank"]}"><header><div class="num">{g["rank"]}<small>위</small></div>'
            f'<h2>{inline(g["head"])}</h2><span class="st">{status}</span></header>{head_html}{"".join(items_html)}</article>'
        )

    att = ''.join(f'<figure><img src="{data_uri(p, w)}" alt="{html.escape(name)}"><figcaption><b>{k}</b> {html.escape(name)}<br><code>{p}</code></figcaption></figure>' for k, name, p, w in ATTACH)
    page = TEMPLATE.replace('%NAV%', '\n'.join(nav)).replace('%BODY%', '\n'.join(body)).replace('%INTRO%', intro_html).replace('%ATT%', att).replace('%GOT%', str(got)).replace('%TOTAL%', str(total))
    open(out_path, 'w', encoding='utf-8').write(page)
    print(out_path, f'{len(groups)}개 순위 · 그림 {total}장 (받음 {got}) · 프롬프트 {pid}개 · {os.path.getsize(out_path) // 1024}KB')


TEMPLATE = r'''<title>Pawnisher 그림 발주서</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=Noto+Sans+KR:wght@400;700&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
/* 작업대 위 발주 장부: 왼쪽 순위 목록(넓을 때 고정) · 오른쪽 순위 카드. 철판 바탕 · 황동 강조 · 종이색 글 */
:root {
  --iron: #16151b; --plate: #201f27; --rivet: #2f2e38; --line: #3d3c48;
  --paper: #ece6d8; --dim: #a39d90; --brass: #e2b04a; --brass-dk: #8a5a14; --ok: #6fc28e;
  --display: "Black Han Sans", "Noto Sans KR", system-ui, sans-serif;
  --body: "Noto Sans KR", system-ui, -apple-system, "Apple SD Gothic Neo", sans-serif;
  --mono: "IBM Plex Mono", ui-monospace, Menlo, monospace;
  color-scheme: dark;
}
* { box-sizing: border-box; }
body { background: var(--iron); color: var(--paper); font: 15px/1.65 var(--body); }
.wrap { max-width: 1180px; margin: 0 auto; padding-block: 28px 64px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); display: grid; grid-template-columns: 240px minmax(0, 1fr); gap: 32px; }
@media (max-width: 860px) { .wrap { grid-template-columns: minmax(0, 1fr); } nav.side { position: static !important; max-height: none !important; } }
h1 { font: 400 34px/1.15 var(--display); margin: 0 0 6px; letter-spacing: .01em; text-wrap: balance; }
.lede { color: var(--dim); margin: 0 0 20px; max-width: 64ch; }
.how { background: var(--plate); border: 2px solid var(--line); padding: 14px 16px; margin-bottom: 22px; }
.how ol { margin: 6px 0 0; padding-left: 20px; }
.meter { display: flex; align-items: center; gap: 10px; font-family: var(--mono); font-size: 13px; color: var(--dim); margin: 0 0 22px; }
.meter i { flex: 1; height: 10px; background: var(--rivet); position: relative; max-width: 260px; }
.meter i::after { content: ""; position: absolute; inset: 0 auto 0 0; width: var(--w); background: var(--brass); }
nav.side { position: sticky; top: calc(16px + env(safe-area-inset-top, 0px)); align-self: start; max-height: calc(100vh - 32px); overflow: auto; display: grid; gap: 2px; }
nav.side .cap { font: 700 12px/1 var(--body); letter-spacing: .12em; color: var(--dim); margin: 0 0 8px; }
nav.side a { display: grid; grid-template-columns: 28px minmax(0, 1fr); gap: 8px; align-items: baseline; color: var(--paper); text-decoration: none; padding: 7px 8px; border-left: 3px solid transparent; font-size: 13.5px; line-height: 1.35; }
nav.side a span { font: 400 18px/1 var(--display); color: var(--brass); text-align: right; }
nav.side a:hover, nav.side a:focus-visible { background: var(--plate); border-left-color: var(--brass); outline: none; }
nav.side a.done { color: var(--dim); } nav.side a.done span { color: var(--ok); }
section.att h2, .intro h2 { font: 400 22px/1.2 var(--display); margin: 0 0 12px; }
.att .figs { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 30px; }
figure { margin: 0; background: var(--plate); border: 2px solid var(--line); padding: 10px; }
figure img { display: block; width: 100%; height: 180px; object-fit: contain; image-rendering: pixelated; background: #0b0b0e; }
figcaption { font-size: 13px; color: var(--dim); margin-top: 8px; } figcaption b { color: var(--brass); }
.intro { margin-bottom: 34px; }
.tw { overflow-x: auto; margin: 10px 0 14px; }
table { border-collapse: collapse; width: 100%; font-size: 13.5px; min-width: 640px; }
th, td { text-align: left; padding: 7px 10px; border-bottom: 1px solid var(--line); vertical-align: top; }
th { color: var(--dim); font-weight: 700; font-size: 12.5px; }
article.rank { background: var(--plate); border: 2px solid var(--line); box-shadow: 4px 4px 0 #0b0b0e; padding: 0 20px 18px; margin-bottom: 26px; scroll-margin-top: 16px; }
article.rank > header { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 14px; align-items: center; margin: 0 -20px 14px; padding: 12px 20px; background: var(--rivet); border-bottom: 2px solid var(--line); }
.num { font: 400 34px/1 var(--display); color: var(--brass); } .num small { font-size: 15px; margin-left: 2px; color: var(--dim); }
article.rank h2 { font: 700 17px/1.4 var(--body); margin: 0; text-wrap: balance; }
.st { font: 500 12px/1 var(--mono); padding: 6px 8px; border: 2px solid var(--brass-dk); color: var(--brass); white-space: nowrap; }
article.rank.done .st { border-color: var(--ok); color: var(--ok); }
.item { border-top: 2px dashed var(--line); padding-top: 12px; margin-top: 16px; }
.item h3 { font: 700 15.5px/1.4 var(--body); margin: 0 0 6px; color: var(--paper); }
em.got { font-style: normal; font: 500 11px/1 var(--mono); color: var(--ok); border: 1px solid var(--ok); padding: 3px 5px; margin-left: 8px; vertical-align: 2px; }
p { margin: 6px 0; max-width: 72ch; } p.li { padding-left: 14px; text-indent: -10px; } p.li::before { content: "· "; color: var(--brass); }
p.note { color: var(--dim); font-size: 13.5px; border-left: 3px solid var(--line); padding-left: 10px; }
h4 { font: 700 14px/1.4 var(--body); margin: 14px 0 4px; color: var(--brass); }
code { font: 13px var(--mono); background: var(--iron); padding: 1px 5px; color: #d9c79a; overflow-wrap: anywhere; }
.prompt { margin: 10px 0 12px; border: 2px solid var(--line); background: var(--iron); }
.pbar { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 6px 8px 6px 12px; border-bottom: 2px solid var(--line); font: 500 12px/1 var(--mono); color: var(--dim); }
button.copy { font: 700 13px/1 var(--body); min-height: 36px; min-width: 76px; padding: 0 14px; color: #1a1206; background: var(--brass); border: 2px solid #0b0b0e; box-shadow: 0 3px 0 var(--brass-dk); cursor: pointer; }
button.copy:active { transform: translateY(2px); box-shadow: 0 1px 0 var(--brass-dk); }
button.copy:focus-visible { outline: 2px solid var(--paper); outline-offset: 2px; }
button.copy.ok { background: var(--ok); box-shadow: 0 3px 0 #2c6b43; }
pre { margin: 0; padding: 12px 14px; font: 13px/1.6 var(--mono); white-space: pre-wrap; overflow-wrap: anywhere; max-height: 360px; overflow: auto; color: var(--paper); }
@media (prefers-reduced-motion: reduce) { button.copy:active { transform: none; } }
</style>
<div class="wrap">
<nav class="side" aria-label="순위"><p class="cap">우선순위</p>
<a href="#att"><span>첨</span>첨부 그림 (모든 상자 공통)</a>
%NAV%
</nav>
<main>
<h1>그림 발주서</h1>
<p class="lede">남은 장면 그림 전부를 우선순위 순으로 모았습니다. 위에서부터 받으면 각본(프롤로그 → 승급 → 진 엔딩)이 화면에 차례로 올라갑니다. 아이콘은 Claude가 32도트로 직접 그려 끝났으므로 여기서 뺐습니다.</p>
<div class="meter">받은 그림 %GOT% / %TOTAL%<i style="--w: calc(%GOT% / %TOTAL% * 100%)"></i></div>
<div class="how"><b>받는 법</b><ol><li>새 채팅을 엽니다. (채팅 한 번에 한 장 — 2위 도금왕 겹 단계만 한 채팅에서 이어서)</li><li>상자 위에 적힌 첨부 그림(①②③④)을 붙입니다.</li><li>프롬프트를 <b>복사</b>해 통째로 붙여 넣습니다.</li><li>받은 그림을 저에게 주면 게임에 붙입니다.</li></ol></div>
<section class="att" id="att"><h2>첨부 그림</h2><div class="figs">%ATT%</div></section>
<section class="intro"><h2>한눈에</h2>%INTRO%</section>
%BODY%
</main>
</div>
<script>
document.addEventListener('click', async (e) => {
  const b = e.target.closest('button.copy'); if (!b) return;
  const pre = document.getElementById(b.dataset.for); const t = pre.textContent;
  const done = (m) => { b.textContent = m; b.classList.add('ok'); setTimeout(() => { b.textContent = '복사'; b.classList.remove('ok'); }, 1600); };
  try { await navigator.clipboard.writeText(t); done('복사됨'); }
  catch { const r = document.createRange(); r.selectNodeContents(pre); const s = getSelection(); s.removeAllRanges(); s.addRange(r); done('선택됨 — 직접 복사'); }
});
</script>
'''

if __name__ == '__main__':
    main(sys.argv[1])
