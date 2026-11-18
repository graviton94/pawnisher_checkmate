"""발주서 아티팩트 (D-300 → D-510 간소판): docs/asset-order-master.md → 붙여 넣을 프롬프트만 남긴 한 장 (받음 · 취소는 뺀다).

python3 -I tools/order/order_page.py <out.html>

md가 정본이다 — 상자를 고치면 md를 고치고 이 스크립트로 다시 만든다.
「## 디자인 토의」로 시작하는 절(D-560)은 발주가 아니다 — 프롬프트로 세지 않고 맨 위 토의 칸으로 그린다.
첨부 (D-561): 절 안의 `첨부: <경로> [설명]` 줄(`첨부 <번호>: …`면 그 프롬프트만)은 그 상자 안에 그림을 정수배로 크게 그리고
「이미지 복사」 단추를 단다 — 경로만 적어 보내지 않는다. 같은 그림은 data: URI 하나를 같이 쓴다.
「## 발주 규칙」 · 「## 정본 참고」 · 「## 정본 문단」 절은 맨 위 칸으로 그린다. 열린 프롬프트 속 `[정본 · 이름]` 문단은
「정본 문단」 절과 한 글자씩 대조해 다르면 멈춘다(글자 그대로 다시 쓰기, D-561).
python3 -I tools/order/order_page.py <out.html> [--md <다른 발주 md>]   (--md는 시험용)
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


ATTACH_RE = re.compile(r'^(?:-\s*)?첨부(?:\s+([A-Z]{1,3}-\d+(?:-\d+)?[a-z]?))?\s*:\s*`?([^`\s]+)`?\s*(.*)$')


class Images:
    """첨부 그림 모음 (D-561): 경로마다 data: URI 하나 — 쪽 안에서 여러 번 보여도 한 번만 싣는다."""

    def __init__(self):
        self.keys, self.uris, self.meta = {}, [], []

    def add(self, path):
        if path not in self.keys:
            full = os.path.join(ROOT, path)
            if not os.path.exists(full):
                sys.exit(f'첨부 그림이 없습니다: {path}')
            im = native(Image.open(full).convert('RGBA'))
            k = max(1, min(8, 288 // max(im.width, im.height)))  # 정수배 · 4 ~ 8배 (72칸 기물 = 4배 288px)
            if k > 1:
                im = im.resize((im.width * k, im.height * k), Image.NEAREST)
            buf = io.BytesIO()
            im.save(buf, 'PNG', optimize=True)
            self.keys[path] = f'i{len(self.uris)}'
            self.uris.append('data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode())
            self.meta.append((im.width, im.height, k))
        return self.keys[path]

    def figure(self, path, cap, fid):
        """상자 안 그림 한 장: 정수배 그림 + 짧은 설명 + 「이미지 복사」 (경로는 작은 글씨 파일 이름만)."""
        key = self.add(path)
        w, h, k = self.meta[int(key[1:])]
        c = html.escape(cap) if cap else ''
        base = html.escape(os.path.basename(path))
        return (f'<figure class="att"><div class="imgbox"><img id="{fid}" data-k="{key}" width="{w}" height="{h}" alt="{c or base}"></div>'
                f'<figcaption>{c}<small>{base} · {k}배</small></figcaption>'
                f'<button type="button" class="imgcopy" data-img="{fid}">이미지 복사</button><p class="cmsg" hidden></p></figure>')

    def script(self):
        return 'const IMG = {' + ','.join(f'{k}:"{self.uris[int(k[1:])]}"' for k in self.keys.values()) + '};'


def native(im):
    """블록으로 키운 그림(s-* 기물 = 72칸 ×2)을 원래 도트로 되돌린다 — 다시 정수배로 키우기 위해."""
    px = im.load()
    for b in (4, 3, 2):
        if im.width % b or im.height % b:
            continue
        if all(px[x, y] == px[x - x % b, y - y % b] for y in range(im.height) for x in range(im.width)):
            return im.resize((im.width // b, im.height // b), Image.NEAREST)
    return im


def attachments(lines):
    """절의 글 줄에서 첨부 (프롬프트 번호 또는 None, 경로, 설명)를 뽑는다."""
    out = []
    for ln in lines:
        m = ATTACH_RE.match(ln.strip())
        if m:
            out.append((m.group(1), m.group(2), m.group(3).strip()))
    return out


def split_canon(body):
    """글 안의 `[정본 · 이름]` 문단들 (머리 줄부터 빈 줄 · 다음 [머리] 앞까지)."""
    ls, out, i = body.split('\n'), [], 0
    while i < len(ls):
        m = re.match(r'^\[정본 · ([^\]]+)\]$', ls[i].strip())
        if not m:
            i += 1
            continue
        j = i + 1
        while j < len(ls) and ls[j].strip() and not ls[j].startswith('['):
            j += 1
        out.append((m.group(1), '\n'.join(ls[i:j])))
        i = j
    return out


def canon_blocks(secs):
    """「정본 문단」 절의 코드 묶음 → {이름: 문단 글} (D-561)."""
    out = {}
    for s in secs:
        if s['head'].startswith('정본 문단'):
            for k, body in s['blocks']:
                if k == 'code':
                    out.update(split_canon(body))
    return out


def inline(s):
    s = html.escape(s)
    s = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', s)
    s = re.sub(r'`([^`]+)`', r'<code>\1</code>', s)
    s = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', s)
    return s


def parse(md=None):
    lines = open(md or MD, encoding='utf-8').read().split('\n')
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
    mx = re.match(r'([A-Z]{1,3}-\d+(?:-\d+)?) ·', head)
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
        if ATTACH_RE.match(s):  # 첨부 줄은 그림으로 그린다 (D-561)
            continue
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
    """프롬프트 하나의 상태 (D-510): 취소 · 재발주(열림) · 받음 · 새로(열림). 번호는 R-01-07처럼 두 마디도 된다 (D-564)."""
    sid = re.match(r'([A-Z]{1,3}-\d+(?:-\d+)?)', head).group(1)
    if '취소' in head:
        return 'cancel'
    if '토의 후 발주' in head:  # 사장님 확인 전 (D-571): 프롬프트는 보이되 「토의 후 발주」 딱지 · 붙여 넣을 수에 들지 않는다
        return 'hold'
    if pid != sid and f'{pid} 받음' in head:  # 상자 안 부분 재발주(CI-01b 등)를 받으면 상자 머리에 「<ID> 받음」 (D-512)
        return 'done'
    if pid != sid and f'{pid} 새로' in head:  # 받은 상자 안의 새 짝 그림(KV-02 키아트 받음 · KV-02h 히어로 새로, D-564)
        return 'new'
    if head.rstrip().endswith('재발주'):
        return 'redo'
    if pid != sid:  # 상자 안 두 번째 그림: 받은 상자의 부분 재발주(CI-01b)면 재발주, 새 상자의 짝 그림(GB-01b 격노, D-513)이면 새로
        return 'redo' if re.search(r'받음|수령', head) else 'new'
    if re.search(r'받음|수령', head) or pid in src:
        return 'done'
    return 'new'


def main(out_path, md=None):
    """붙여 넣을 프롬프트만 남긴 한 장 (D-510, 사용자: 「끝난 거 · 안 읽어도 되는 건 다 정리」) · 첨부 그림은 상자 안에 (D-561)."""
    secs = parse(md)
    imgs = Images()
    canon = canon_blocks(secs)
    bad = []
    od = os.path.join(ROOT, 'build-res', 'order')
    src = {m.group(1) for f in os.listdir(od) for m in [re.match(r'([A-Z]{1,3}-\d+(?:-\d+)?[a-z]?)-(?:source|received)\.(?:png|webp)$', f)] if m}
    cards, n_done, n_cancel = [], 0, 0
    talk = []  # 디자인 토의 (D-560): 확정 전 · 발주 아님 — 맨 위 토의 칸, 프롬프트 수에 들지 않는다
    top = []  # 발주 규칙 · 정본 참고 · 정본 문단 (D-561): 맨 위, 토의 칸 앞
    for s in secs:
        h = s['head']
        if h.startswith(('발주 규칙', '정본 참고', '정본 문단')):
            body = [b for k, b in s['blocks'] if k == 'text']
            figs = ''.join(imgs.figure(p, cap, f'r{len(top)}-{j}') for j, (_, p, cap) in enumerate(attachments(body)))
            codes = ''
            for j, (k, b) in enumerate(x for x in s['blocks'] if x[0] == 'code'):
                nm = re.match(r'\[정본 · [^\]]+\]', b.strip())
                cid = f'c{len(top)}-{j}'
                codes += (f'<div class="bar"><span><b>{html.escape(nm.group(0) if nm else "문단")}</b></span><button type="button" class="copy" data-for="{cid}">문단 복사</button></div>'
                          f'<pre id="{cid}">{html.escape(b)}</pre>')
            kind, tag, sid = (('rule', '규칙', 'rules') if h.startswith('발주 규칙') else
                              ('ref', '정본', 'canon-ref') if h.startswith('정본 참고') else ('ref', '정본', 'canon-text'))
            inner = render_text(body) + (f'<div class="atts">{figs}</div>' if figs else '')
            top.append(f'<section class="talk {kind}" id="{sid}"><header><span class="tag">{tag}</span><h2>{inline(h)}</h2></header>'
                       f'<div class="tb">{inner}</div>{codes}</section>')
            continue
        if h.startswith('디자인 토의'):
            body = [b for k, b in s['blocks'] if k == 'text']
            talk.append(f'<section class="talk"><header><span class="tag">토의</span><h2>{inline(h)}</h2></header>'
                        f'<div class="tb">{render_text(body)}</div></section>')
            continue
        if not re.match(r'[A-Z]{1,3}-\d+(?:-\d+)? ', h):
            continue
        txt = [b for k, b in s['blocks'] if k == 'text']
        atts = attachments(txt)
        name = next((re.search(r'`([A-Za-z0-9-]+\.png)`', t).group(1) for t in txt if '받은 그림 이름' in t and re.search(r'`([A-Za-z0-9-]+\.png)`', t)), None)
        for k, body in s['blocks']:
            if k != 'code':
                continue
            first = body.split('\n')[0]
            m = re.search(r'/ ([A-Z]{1,3}-\d+(?:-\d+)?[a-z]?) / ([^/\]]+)', first)
            pid = m.group(1) if m else re.match(r'([A-Z]{1,3}-\d+(?:-\d+)?)', h).group(1)
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
            send = f'{pid}.png' if pid != (name or '')[:-4] and pid.endswith(('a', 'b', 'c')) else (name or f'{pid}.png')
            for nm, text in split_canon(body):  # 정본 문단은 글자 그대로 (D-561)
                if canon.get(nm) != text:
                    bad.append(f'{pid} [정본 · {nm}]' + (' — 정본 문단 절에 없음' if nm not in canon else ' — 글자가 다름'))
            mine = [(p, cap) for who, p, cap in atts if who in (None, pid)]
            cards.append((pid, title, st, send, scene, body, mine))
    if bad:
        sys.exit('정본 문단이 어긋났습니다 (docs/asset-order-master.md 「정본 문단」 글을 그대로 붙이세요):\n  ' + '\n  '.join(bad))
    out = []
    for i, (pid, title, st, send, scene, body, mine) in enumerate(cards, 1):
        tag = '<em class="redo">재발주</em>' if st == 'redo' else '<em class="hold">토의 후 발주</em>' if st == 'hold' else '<em>새로</em>'
        sc = f'<p class="scene">{html.escape(scene)}</p>' if scene else ''
        att = ''
        if mine:
            figs = ''.join(imgs.figure(p, cap, f'a{i}-{j}') for j, (p, cap) in enumerate(mine))
            att = f'<p class="attbar">첨부 {len(mine)}장 — 프롬프트와 함께 붙여 넣으세요</p><div class="atts">{figs}</div>'
        out.append(f'<section class="card" id="{pid}"><header><span class="no">{i}</span><h2><b>{pid}</b> {html.escape(title)}</h2>{tag}</header>{sc}'
                   f'<div class="bar"><span>보낼 이름 <code>{html.escape(send)}</code></span><button type="button" class="copy" data-for="p{i}">프롬프트 복사</button></div>'
                   f'<pre id="p{i}">{html.escape(body)}</pre>{att}</section>')
    toc = ' '.join(f'<a href="#{c[0]}" class="{"r" if c[2] == "redo" else "h" if c[2] == "hold" else ""}">{c[0]}</a>' for c in cards)
    n_redo = sum(1 for c in cards if c[2] == 'redo')
    n_hold = sum(1 for c in cards if c[2] == 'hold')
    page = TEMPLATE.replace('%N%', str(len(cards) - n_hold)).replace('%HOLD%', str(n_hold)).replace('%REDO%', str(n_redo)).replace('%DONE%', str(n_done)).replace('%CANCEL%', str(n_cancel)).replace('%TOC%', toc).replace('%TALK%', '\n'.join(top + talk)).replace('%IMGJS%', imgs.script()).replace('%BODY%', '\n'.join(out))
    open(out_path, 'w', encoding='utf-8').write(page)
    print(out_path, f'토의 {len(talk)} · 남은 프롬프트 {len(cards) - n_hold}개 (재발주 {n_redo}) · 토의 후 발주 {n_hold} · 받음 {n_done} · 취소 {n_cancel} · 첨부 그림 {len(imgs.uris)}장 · {os.path.getsize(out_path) // 1024}KB')
    if os.path.getsize(out_path) > 15 * 1024 * 1024:
        sys.exit('쪽이 15MB를 넘습니다 (D-561 상한)')


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
em.hold, .toc a.h { border-color:var(--brass); color:var(--brass); border-style:dashed; }
.scene { margin:10px 14px 0; color:var(--dim); font-size:14px; }
.bar { display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:10px; padding:10px 14px; }
code { font:13px var(--mono); background:var(--iron); padding:2px 6px; color:#d9c79a; }
button.copy { font:700 14px/1 var(--body); min-height:44px; padding:0 18px; color:#1a1206; background:var(--brass); border:2px solid #0b0b0e; box-shadow:0 3px 0 var(--brass-dk); cursor:pointer; }
button.copy:active { transform:translateY(2px); box-shadow:0 1px 0 var(--brass-dk); }
button.copy.ok { background:var(--ok); box-shadow:0 3px 0 #2c6b43; }
details { margin:0 14px 12px; } summary { cursor:pointer; color:var(--dim); font-size:13px; }
pre { margin:0 14px 14px; padding:10px 12px; background:var(--iron); border:2px solid var(--line); font:12.5px/1.55 var(--mono); white-space:pre-wrap; overflow-wrap:anywhere; max-height:180px; overflow:auto; }
.talk { background:var(--plate); border:2px solid var(--brass); box-shadow:4px 4px 0 #0b0b0e; margin:0 0 24px; }
.talk header { display:flex; gap:12px; align-items:center; padding:10px 14px; border-bottom:2px solid var(--line); }
.talk h2 { font:700 16px/1.4 var(--body); margin:0; text-wrap:balance; }
.talk .tag { font:500 12px/1 var(--mono); padding:5px 7px; border:2px solid var(--brass); color:var(--brass); white-space:nowrap; }
.tb { padding:4px 14px 12px; } .tb h4 { font:700 15px/1.4 var(--body); color:var(--brass); margin:14px 0 4px; }
.tb p { margin:6px 0; } .tb p.li { padding-left:14px; text-indent:-14px; } .tb p.li::before { content:"· "; color:var(--brass); }
.tw { overflow-x:auto; } table { border-collapse:collapse; width:100%; font-size:14px; } th, td { border:2px solid var(--line); padding:6px 8px; text-align:left; vertical-align:top; } th { color:var(--brass); }
.atts { display:flex; flex-wrap:wrap; gap:12px; padding:4px 14px 14px; }
.tb .atts { padding:8px 0 4px; }
.attbar { margin:0 14px 8px; font:700 14px/1.4 var(--body); color:var(--brass); }
.att { margin:0; padding:8px; background:var(--iron); border:2px solid var(--line); max-width:100%; display:flex; flex-direction:column; gap:6px; }
.imgbox { max-width:100%; overflow:auto; background:#2a2933; }
.att img { display:block; image-rendering:pixelated; max-width:none; }
.att figcaption { font-size:13px; line-height:1.4; } .att figcaption small { display:block; font:11px var(--mono); color:var(--dim); }
button.imgcopy { font:700 14px/1 var(--body); min-height:44px; padding:0 14px; color:var(--paper); background:var(--plate); border:2px solid var(--brass); box-shadow:0 3px 0 #0b0b0e; cursor:pointer; }
button.imgcopy.ok { border-color:var(--ok); color:var(--ok); }
.cmsg { margin:0; font-size:13px; color:var(--red); max-width:288px; }
.talk.ref { border-color:var(--ok); } .talk.ref .tag { border-color:var(--ok); color:var(--ok); } .talk.rule { border-color:var(--line); }
.talk .bar + pre { max-height:none; }
@media (prefers-reduced-motion: reduce) { button.copy:active { transform:none; } }
</style>
<div class="wrap">
<h1>그림 발주서</h1>
<p class="lede">붙여 넣을 프롬프트 %N%개만 남겼습니다 (빨강 = 재발주 %REDO%개). 칸마다 「프롬프트 복사」 → 새 생성 작업에 통째로 붙여 넣기(첨부 그림이 있으면 그림마다 「이미지 복사」로 함께) → 결과를 「보낼 이름」으로 보내 주세요. 받은 %DONE%개 · 취소 %CANCEL%개는 뺐습니다. 점선 황동 「토의 후 발주」 %HOLD%개는 맨 위 토의에서 사장님이 정한 뒤에만 복사합니다.</p>
%TALK%
<nav class="toc">%TOC%</nav>
%BODY%
</div>
<script>
%IMGJS%
document.querySelectorAll('img[data-k]').forEach((im) => { im.src = IMG[im.dataset.k]; });
document.addEventListener('click', async (e) => {
  const b = e.target.closest('button.imgcopy'); if (!b) return;
  const im = document.getElementById(b.dataset.img); const msg = b.nextElementSibling;
  try {
    if (!navigator.clipboard || !navigator.clipboard.write || typeof ClipboardItem === 'undefined') throw new Error('no clipboard');
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': fetch(im.src).then((r) => r.blob()) })]);
    msg.hidden = true; b.textContent = '복사됨'; b.classList.add('ok');
    setTimeout(() => { b.textContent = '이미지 복사'; b.classList.remove('ok'); }, 1600);
  } catch {
    msg.hidden = false; msg.textContent = '복사가 막혔습니다. 위 그림을 길게 누르거나(휴대폰) 오른쪽 클릭해(PC) 이미지 복사 · 저장을 고르세요.';
  }
});
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
    a = sys.argv[1:]
    main(a[0], a[a.index('--md') + 1] if '--md' in a else None)
