"""발주서 아티팩트 (D-300 → D-510 간소판): docs/asset-order-master.md → 붙여 넣을 프롬프트만 남긴 한 장 (받음 · 취소는 뺀다).

python3 -I tools/order/order_page.py <out.html>

md가 정본이다 — 상자를 고치면 md를 고치고 이 스크립트로 다시 만든다.
받은 그림(public/scenes/<이름>.png가 있는 것)은 「받음」으로 표시한다. 12위 아이콘 시트는 D-301로 다시 발주 — 시트의 10장이 모두 tools/pixel/icons32_ext에 있으면 「받음」.
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
ATTACH = []  # 현재 새 제작 요청 없음. 완료 프롬프트는 보관 문서에 있다.
REDO: set[str] = set()



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
    s = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', s)
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


EXT = os.path.join(ROOT, 'tools', 'pixel', 'icons32_ext')


def sheet_files(head):
    """I-0N 상자 → 그 시트 10장 키 (받음 = icons32_ext에 있음, D-301)"""
    m = re.match(r'(I-\d+)', head)
    if not m:
        return []
    sys.path.insert(0, os.path.join(ROOT, 'tools', 'pixel'))
    import icon_sheets
    return ['ext:' + k for k, *_ in icon_sheets.SHEETS.get(m.group(1), ('', []))[1]]


def where(f):
    """받은 그림이 게임 안 어디에 있나"""
    if f.startswith('recv:'):
        suffix = 'source' if os.path.exists(os.path.join(ROOT, 'build-res/order', f'{f[5:]}-source.png')) else 'received'
        return f'build-res/order/{f[5:]}-{suffix}.png → src/assets/ui/chrome/v2/'
    return f'tools/pixel/icons32_ext/{f[4:]}.png → public/ui/icons16/' if f.startswith('ext:') else f'public/scenes/{f}.png'


def where_all(fs):
    if fs and all(f.startswith('ext:') for f in fs):
        return f'<code>tools/pixel/icons32_ext/</code> → <code>public/ui/icons16/</code> ({len(fs)}장: ' + ' · '.join(f[4:] for f in fs) + ')'
    return ' · '.join(f'<code>{where(f)}</code>' for f in fs)


def files_of(head):
    head = re.sub(r'^\d+위 ·\s*', '', head)
    if re.match(r'I-\d+', head):
        return sheet_files(head)
    if head.startswith('S-01'):
        return ['epilogue-hands']
    mu = re.match(r'(UI-\d+)', head)
    if mu:  # UI 키트 시트 (D-390 · D-391): 받은 시트 원본이 build-res/order에 있으면 받음
        return ['recv:' + mu.group(1)]
    fs = re.findall(r'`(?:public/scenes/|public/ui/hud/)?([A-Za-z0-9-]+)\.png`', head)
    mx = re.match(r'([A-Z]{1,3}-\d+) ·', head)
    if not fs and mx:  # §0-D (2026-11-14): 머리에 파일이 없는 상자는 받은 원본 build-res/order/<번호>-source.*로 받음 판정
        return ['recv:' + mx.group(1)]
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


def status_of(head, pid, src):
    """프롬프트 하나의 상태 (D-510): 취소 · 재발주(열림) · 받음 · 새로(열림)"""
    sid = re.match(r'([A-Z]{1,3}-\d+)', head).group(1)
    if '취소' in head:
        return 'cancel'
    if pid != sid and f'{pid} 받음' in head:  # 상자 안 부분 재발주(CI-01b 등)를 받으면 상자 머리에 「<ID> 받음」 (D-512)
        return 'done'
    if head.rstrip().endswith('재발주') or pid != sid:
        return 'redo'
    if re.search(r'받음|수령', head) or pid in src:
        return 'done'
    return 'new'


def main(out_path):
    """붙여 넣을 프롬프트만 남긴 한 장 (D-510, 사용자: 「끝난 거 · 안 읽어도 되는 건 다 정리」)."""
    secs = parse()
    od = os.path.join(ROOT, 'build-res', 'order')
    src = {m.group(1) for f in os.listdir(od) for m in [re.match(r'([A-Z]{1,3}-\d+[a-z]?)-(?:source|received)\.(?:png|webp)$', f)] if m}
    cards, n_done, n_cancel = [], 0, 0
    for s in secs:
        h = s['head']
        if not re.match(r'[A-Z]{1,3}-\d+ ', h):
            continue
        txt = [b for k, b in s['blocks'] if k == 'text']
        name = next((re.search(r'`([A-Za-z0-9-]+\.png)`', t).group(1) for t in txt if '받은 그림 이름' in t and re.search(r'`([A-Za-z0-9-]+\.png)`', t)), None)
        for k, body in s['blocks']:
            if k != 'code':
                continue
            first = body.split('\n')[0]
            m = re.search(r'/ ([A-Z]{1,3}-\d+[a-z]?) / ([^/\]]+)', first)
            pid = m.group(1) if m else re.match(r'([A-Z]{1,3}-\d+)', h).group(1)
            title = (m.group(2).strip() if m else h.split('·', 1)[-1].strip())
            st = status_of(h, pid, src)
            if st == 'done':
                n_done += 1
                continue
            if st == 'cancel':
                n_cancel += 1
                continue
            scene = ''
            ls = body.split('\n')
            if '[장면]' in ls:
                scene = ls[ls.index('[장면]') + 1].strip()
            if len(scene) > 90:
                scene = scene[:88].rsplit(' ', 1)[0] + ' …'
            send = f'{pid}.png' if pid != (name or '')[:-4] and st == 'redo' and pid.endswith(('a', 'b', 'c')) else (name or f'{pid}.png')
            cards.append((pid, title, st, send, scene, body))
    out = []
    for i, (pid, title, st, send, scene, body) in enumerate(cards, 1):
        tag = '<em class="redo">재발주</em>' if st == 'redo' else '<em>새로</em>'
        sc = f'<p class="scene">{html.escape(scene)}</p>' if scene else ''
        out.append(f'<section class="card" id="{pid}"><header><span class="no">{i}</span><h2><b>{pid}</b> {html.escape(title)}</h2>{tag}</header>{sc}'
                   f'<div class="bar"><span>보낼 이름 <code>{html.escape(send)}</code></span><button type="button" class="copy" data-for="p{i}">프롬프트 복사</button></div>'
                   f'<pre id="p{i}">{html.escape(body)}</pre></section>')
    toc = ' '.join(f'<a href="#{c[0]}" class="{"r" if c[2] == "redo" else ""}">{c[0]}</a>' for c in cards)
    n_redo = sum(1 for c in cards if c[2] == 'redo')
    page = TEMPLATE.replace('%N%', str(len(cards))).replace('%REDO%', str(n_redo)).replace('%DONE%', str(n_done)).replace('%CANCEL%', str(n_cancel)).replace('%TOC%', toc).replace('%BODY%', '\n'.join(out))
    open(out_path, 'w', encoding='utf-8').write(page)
    print(out_path, f'남은 프롬프트 {len(cards)}개 (재발주 {n_redo}) · 받음 {n_done} · 취소 {n_cancel} · {os.path.getsize(out_path) // 1024}KB')


TEMPLATE = r'''<title>Pawnisher 그림 발주서</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=Noto+Sans+KR:wght@400;700&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
:root { --iron:#16151b; --plate:#201f27; --line:#3d3c48; --paper:#ece6d8; --dim:#a39d90; --brass:#e2b04a; --brass-dk:#8a5a14; --red:#e0685f; --ok:#6fc28e;
  --display:"Black Han Sans","Noto Sans KR",system-ui,sans-serif; --body:"Noto Sans KR",system-ui,sans-serif; --mono:"IBM Plex Mono",ui-monospace,Menlo,monospace; color-scheme:dark; }
* { box-sizing:border-box; }
body { background:var(--iron); color:var(--paper); font:15px/1.6 var(--body); }
.wrap { max-width:900px; margin:0 auto; padding-block:24px 64px; padding-left:max(16px,env(safe-area-inset-left,0px)); padding-right:max(16px,env(safe-area-inset-right,0px)); }
h1 { font:400 32px/1.15 var(--display); margin:0 0 6px; }
.lede { color:var(--dim); margin:0 0 14px; }
.toc { display:flex; flex-wrap:wrap; gap:6px; margin:0 0 24px; }
.toc a { font:500 12.5px/1 var(--mono); color:var(--paper); text-decoration:none; border:2px solid var(--line); padding:7px 8px; background:var(--plate); }
.toc a.r { border-color:var(--red); color:var(--red); }
.card { background:var(--plate); border:2px solid var(--line); box-shadow:4px 4px 0 #0b0b0e; margin-bottom:20px; scroll-margin-top:12px; }
.card header { display:grid; grid-template-columns:auto minmax(0,1fr) auto; gap:12px; align-items:center; padding:10px 14px; border-bottom:2px solid var(--line); }
.no { font:400 24px/1 var(--display); color:var(--brass); min-width:1.6em; }
.card h2 { font:700 16px/1.4 var(--body); margin:0; text-wrap:balance; } .card h2 b { font-family:var(--mono); color:var(--brass); margin-right:4px; }
em { font:500 12px/1 var(--mono); font-style:normal; padding:5px 7px; border:2px solid var(--line); color:var(--dim); white-space:nowrap; }
em.redo { border-color:var(--red); color:var(--red); }
.scene { margin:10px 14px 0; color:var(--dim); font-size:14px; }
.bar { display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:10px; padding:10px 14px; }
code { font:13px var(--mono); background:var(--iron); padding:2px 6px; color:#d9c79a; }
button.copy { font:700 14px/1 var(--body); min-height:44px; padding:0 18px; color:#1a1206; background:var(--brass); border:2px solid #0b0b0e; box-shadow:0 3px 0 var(--brass-dk); cursor:pointer; }
button.copy:active { transform:translateY(2px); box-shadow:0 1px 0 var(--brass-dk); }
button.copy.ok { background:var(--ok); box-shadow:0 3px 0 #2c6b43; }
details { margin:0 14px 12px; } summary { cursor:pointer; color:var(--dim); font-size:13px; }
pre { margin:0 14px 14px; padding:10px 12px; background:var(--iron); border:2px solid var(--line); font:12.5px/1.55 var(--mono); white-space:pre-wrap; overflow-wrap:anywhere; max-height:180px; overflow:auto; }
@media (prefers-reduced-motion: reduce) { button.copy:active { transform:none; } }
</style>
<div class="wrap">
<h1>그림 발주서</h1>
<p class="lede">붙여 넣을 프롬프트 %N%개만 남겼습니다 (빨강 = 재발주 %REDO%개). 칸마다 「프롬프트 복사」 → 새 생성 작업에 통째로 붙여 넣기 → 결과를 「보낼 이름」으로 보내 주세요. 받은 %DONE%개 · 취소 %CANCEL%개는 뺐습니다.</p>
<nav class="toc">%TOC%</nav>
%BODY%
</div>
<script>
document.addEventListener('click', async (e) => {
  const b = e.target.closest('button.copy'); if (!b) return;
  const pre = document.getElementById(b.dataset.for); const t = pre.textContent;
  const done = (m) => { b.textContent = m; b.classList.add('ok'); setTimeout(() => { b.textContent = '프롬프트 복사'; b.classList.remove('ok'); }, 1600); };
  try { await navigator.clipboard.writeText(t); done('복사됨'); }
  catch { const r = document.createRange(); r.selectNodeContents(pre); const s = getSelection(); s.removeAllRanges(); s.addRange(r); done('선택됨 — 직접 복사'); }
});
</script>
'''

if __name__ == '__main__':
    main(sys.argv[1])
