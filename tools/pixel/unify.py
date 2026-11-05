"""
흑백 기물 통일 (2026-11-05, 사용자: "외곽선 + 흰 테를 기물별로 공용으로 지정해 놓고 백 · 흑 별로 채색 — 내부 색칠만 달라진다.
퀸의 성곽 + 십자가, 룩의 성곽을 명확한 형체로. 그림자 단계는 흑백 둘 다 유지, 완전히 통일. 킹 테두리는 내가 준 new 기준").

기물마다 틀 하나:
  틀 = 몸 칸(검은 외곽선 K / 속 칠 자리) + 흰 바깥 테 3칸(몸에서 체비쇼프 3, 사용자 K new와 같은 두께) + 그림자 역할 지도
  그림자 역할 5단계: hi2(강한 빛) · hi1(빛) · base(바탕) · sh1(그늘) · sh2(짙은 그늘) — 흑백이 같은 자리 · 같은 단계를 쓰고 색만 바꾼다.
    흰 진영: hi2 V #FFFFFF · hi1 W · base E #E2DED6 · sh1 S · sh2 G   (흰 바탕을 한 단계 낮춰야 빛이 보인다)
    검은 진영: hi2 H · hi1 M · base B · sh1 Z #26272E · sh2 D
  외곽선 모양: 검은 기물 정본을 따른다 (킹은 사용자 K new). 폰 · 룩 · 퀸 · 킹은 좌우 대칭으로 맞춘다.
  역할 지도: 정본 그림자를 쓰지 않고 형태만 보고 새로 칠한다 (사용자: "색칠은 기존 방식 아니더라도 다시"). 빛은 왼쪽 위.
    심플하게 (사용자: "너무 세밀묘사"): 빛 · 바탕 · 그늘 세 덩어리 + 오른쪽 · 아래 끝 한 칸 짙은 그늘.
    폰 · 비숍 · 룩 · 퀸 · 킹 = 줄마다 원통(왼쪽 36% 빛 · 가운데 바탕 · 72%부터 그늘) + 단 경계 한 줄(넓어지면 윗면 빛, 좁아지면 처마 그림자),
    나이트 = 대각선 빛(머리라 원통이 맞지 않는다). 흑백이 칸 하나까지 같은 자리에 같은 단계.
  외곽선 대칭: 킹 · 퀸 · 룩 · 폰은 좌우 대칭(왼쪽 절반을 비춘다), 비숍 · 나이트는 생김새 그대로.
  룩 성곽(14~26줄) · 퀸 십자가와 성곽(6~26줄)은 새로 그린다 — 칸 폭을 정수로 맞춰 좌우 대칭.
가짜 왕 [K 0](주인공)은 모양이 달라 흰 테만 3칸으로 맞춘다. 흰 킹 통일안은 [K:classic 0]에 넣는다.

사용: python3 -I tools/pixel/unify.py preview <out.png>   |   apply  (pieces64.txt를 바꾼다 → maker.py export)
"""
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import maker  # noqa: E402
import piskel  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(HERE))
KING_NEW = os.path.join(ROOT, 'build-res', 'order', 'K-black-new-source.png')
N = 64
RIM = 3
PAL = {0: {'hi2': 'V', 'hi1': 'W', 'base': 'E', 'sh1': 'S', 'sh2': 'G'}, 1: {'hi2': 'H', 'hi1': 'M', 'base': 'B', 'sh1': 'Z', 'sh2': 'D'}}
RANK = {'base': 0, 'hi1': 1, 'hi2': 2, 'sh1': 3, 'sh2': 4}


def cells(grid, test):
    return {(x, y) for y in range(N) for x in range(N) if test(grid[y][x])}


def axis_of(body):
    """좌우 축: 줄마다 (왼끝 + 오른끝)의 가장 흔한 값 (x ↔ a - x)"""
    rows = {}
    for x, y in body:
        lo, hi = rows.get(y, (99, -1))
        rows[y] = (min(lo, x), max(hi, x))
    sums = [lo + hi for lo, hi in rows.values()]
    return max(set(sums), key=sums.count)


def mirror(kind, a):
    """왼쪽 절반을 오른쪽에 비춘다 (kind: {(x,y): 'K' | '#'})"""
    out = {}
    for (x, y), v in kind.items():
        if 2 * x <= a:
            out[(x, y)] = v
            out[(a - x, y)] = v
    return out


def redraw_rook(kind):
    """룩 성곽: 14~17줄 외곽선 띠, 18~21줄 성가퀴 셋(폭 6 · 틈 5), 22~26줄 속 칠 — 축 32.5"""
    for y in range(14, 27):
        for x in range(N):
            kind.pop((x, y), None)
    for y in range(14, 27):
        for x in range(15, 51):
            inner = 19 <= x <= 46 and (y >= 22 or (18 <= y <= 21 and (x <= 24 or 30 <= x <= 35 or x >= 41)))
            kind[(x, y)] = '#' if inner else 'K'


def redraw_queen(kind):
    """퀸: 십자가(세로 4칸 · 가로 10칸) + 성가퀴 다섯(폭 4, 가운데 6) + 25~26줄 띠 — 축 31.5"""
    for y in range(4, 27):
        for x in range(N):
            kind.pop((x, y), None)
    inner = set()
    for y in range(10, 21):
        for x in range(30, 34):
            inner.add((x, y))
    for y in range(12, 15):
        for x in range(27, 37):
            inner.add((x, y))
    for x0, x1 in ((15, 18), (22, 25), (29, 34), (38, 41), (45, 48)):
        for y in range(21, 25):
            for x in range(x0, x1 + 1):
                inner.add((x, y))
    for y in range(25, 27):
        for x in range(17, 47):
            inner.add((x, y))
    for (x, y) in inner:
        kind[(x, y)] = '#'
    for (x, y) in inner:
        for dy in range(-3, 4):
            for dx in range(-3, 4):
                p = (x + dx, y + dy)
                if p not in kind and p[1] < 17:
                    kind[p] = 'K'
    for y in range(17, 27):
        for x in range(11, 53):
            if (x, y) not in kind:
                kind[(x, y)] = 'K'


def template(t, hi):
    """기물 틀: {(x,y): 'K' | '#'} (흰 테 제외)"""
    if t == 'K':
        src, _ = piskel.to_grid(KING_NEW, 1)
    else:
        src = hi[(t, 1)]
    kind = {(x, y): ('K' if src[y][x] == 'K' else '#') for y in range(N) for x in range(N) if src[y][x] not in '.O'}
    if t == 'R':
        redraw_rook(kind)
    if t == 'Q':
        redraw_queen(kind)
    if t in 'PRQK':
        kind = mirror(kind, axis_of(set(kind)))
    return kind, src


LADDER = ['hi2', 'hi1', 'base', 'sh1', 'sh2']


def roles(t, kind, hi, ksrc):
    """그림자 역할 지도 (흑백 공용) — 정본 그림자를 쓰지 않고 형태만 보고 새로 칠한다. 빛은 왼쪽 위.
    ① 원통 음영: 줄마다 속 칠 덩어리(이어진 칸) 하나를 원통으로 보고, 왼끝에서의 위치로 단계를 정한다 —
       왼끝 1칸 빛(hi1) · 15~38% 강한 빛 띠(hi2) · 가운데 바탕 · 64~84% 그늘(sh1) · 오른쪽 끝 짙은 그늘(sh2). 폭 4칸 이하는 왼쪽 빛 · 오른쪽 그늘만.
    ② 위 · 아래: 위가 하늘이면(위로 6칸 안에 다른 속 칠 없음) 맨 윗줄 한 단계 밝게, 위에 튀어나온 단이 있으면 윗 두 줄에 그림자(한 단계 · 두 단계 어둡게).
       맨 아랫줄은 한 단계 어둡게.
    ③ 칸 하나짜리 튀는 점은 이웃 다수 단계로 고른다 (도트 잡티 정리)."""
    inner = {p for p, v in kind.items() if v == '#'}
    if t == 'N':
        return knight_roles(inner)
    lvl = {}
    for (x, y) in inner:
        lo = x
        while (lo - 1, y) in inner:
            lo -= 1
        hi_ = x
        while (hi_ + 1, y) in inner:
            hi_ += 1
        w = hi_ - lo + 1
        p = (x - lo) / max(1, w - 1)
        # 심플하게 (사용자: "너무 세밀묘사"): 빛 · 바탕 · 그늘 세 덩어리 + 오른쪽 끝 한 칸만 짙은 그늘
        if w <= 4:
            v = 1 if x == lo else 3 if x == hi_ else 2
        elif x == hi_:
            v = 4
        elif p < 0.36:
            v = 1
        elif p >= 0.72:
            v = 3
        else:
            v = 2
        # 단의 경계: 윗줄 덩어리 폭과 비교 — 넓어지면 단의 윗면(빛), 좁아지면 위 단의 처마 밑(그림자)
        def span(yy):
            if (x, yy) not in inner:
                return None
            l = x
            while (l - 1, yy) in inner:
                l -= 1
            r = x
            while (r + 1, yy) in inner:
                r += 1
            return r - l + 1
        w1, w2 = span(y - 1), span(y - 2)
        # 비스듬한 외곽(계단)은 단이 아니다 — 폭이 4칸 이상 바뀔 때만 단으로 본다
        if w1 is not None and w1 <= w - 4:
            v -= 1
        elif w1 is not None and w1 >= w + 4:
            v += 1
        lvl[(x, y)] = max(0, min(4, v))
    # 잡티 정리: 상하좌우 넷 중 셋 이상이 같은 단계면 그 단계로
    for (x, y), v in list(lvl.items()):
        nb = [lvl.get(q) for q in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)) if q in lvl]
        for c in set(nb):
            if c != v and nb.count(c) >= 3:
                lvl[(x, y)] = c
    return {p: LADDER[v] for p, v in lvl.items()}


def knight_roles(inner):
    """나이트는 기둥이 아니라 머리라 원통 대신 대각선 빛: 왼쪽 위 → 오른쪽 아래로 바탕이 어두워지고,
    왼쪽 · 위 가장자리는 강한 빛, 오른쪽 · 아래 가장자리는 짙은 그늘."""
    xs = [x for x, _ in inner]
    ys = [y for _, y in inner]
    x0, y0 = min(xs), min(ys)
    span = (max(xs) - x0) + (max(ys) - y0)
    lvl = {}
    for (x, y) in inner:
        d = ((x - x0) + (y - y0)) / span
        v = 1 if d < 0.38 else 3 if d > 0.66 else 2
        gone = lambda dx, dy: (x + dx, y + dy) not in inner
        if gone(1, 0) or gone(0, 1):
            v = 4
        lvl[(x, y)] = v
    for (x, y), v in list(lvl.items()):
        nb = [lvl.get(q) for q in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)) if q in lvl]
        for c in set(nb):
            if c != v and nb.count(c) >= 3:
                lvl[(x, y)] = c
    return {p: LADDER[v] for p, v in lvl.items()}


def paint(kind, role, side):
    grid = [['.'] * N for _ in range(N)]
    for (x, y), v in kind.items():
        if 0 <= x < N and 0 <= y < N:
            grid[y][x] = 'K' if v == 'K' else PAL[side][role.get((x, y), 'base')]
    body = set(kind)
    for y in range(N):
        for x in range(N):
            if grid[y][x] == '.' and any((x + dx, y + dy) in body for dy in range(-RIM, RIM + 1) for dx in range(-RIM, RIM + 1)):
                grid[y][x] = 'O'
    return [''.join(r) for r in grid]


def rerim(grid):
    """모양은 그대로, 흰 테만 3칸으로 (가짜 왕)"""
    g = [list(r.replace('O', '.')) for r in grid]
    body = cells(g, lambda c: c != '.')
    for y in range(N):
        for x in range(N):
            if g[y][x] == '.' and any((x + dx, y + dy) in body for dy in range(-RIM, RIM + 1) for dx in range(-RIM, RIM + 1)):
                g[y][x] = 'O'
    return [''.join(r) for r in g]


def build():
    hi = maker.load64()
    out = {}
    for t in 'PNBRQK':
        kind, src = template(t, hi)
        role = roles(t, kind, hi, src)
        out[f'{t} 1'] = paint(kind, role, 1)
        out[f'{"K:classic" if t == "K" else t} 0'] = paint(kind, role, 0)
    out['K 0'] = rerim(hi[('K', 0)])
    return out


def render(grid, side, scale):
    img = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    for y, row in enumerate(grid):
        for x, ch in enumerate(row):
            if ch != '.':
                img.putpixel((x, y), (maker.DARK[side] if ch == 'D' else maker.PAL64[ch]) + (255,))
    return img.resize((N * scale, N * scale), Image.NEAREST)


def preview(path):
    hi = maker.load64()
    new = build()
    order = [f'{t} {s}' for s in (1, 0) for t in 'PNBRQK'] + ['K:classic 0', 'K 0']
    order = [k for k in order if not (k == 'K 0' and False)]
    cols = 6
    keys = [f'{t} 1' for t in 'PNBRQK'] + [f'{t} 0' for t in 'PNBRQ'] + ['K:classic 0']
    W = cols * 200 + 20
    img = Image.new('RGBA', (W, 4 * 200 + 2 * 140 + 40), (30, 29, 36, 255))
    tiles = [(0x56, 0x54, 0x5E), (0x2F, 0x2E, 0x36)]
    for r, src in enumerate(('old', 'new')):
        for k, key in enumerate(keys):
            name, side = key.split()
            side = int(side)
            grid = hi[(name, side)] if src == 'old' else new[key]
            x = 10 + (k % cols) * 200
            y = 10 + (r * 2 + k // cols) * 200
            img.alpha_composite(render(grid, side, 3), (x, y))
    # 판 위 크기 (칸 116px에 82%)
    y0 = 10 + 4 * 200
    for r, src in enumerate(('old', 'new')):
        for k, key in enumerate(keys):
            name, side = key.split()
            side = int(side)
            grid = hi[(name, side)] if src == 'old' else new[key]
            x = 10 + k * 98
            tile = Image.new('RGBA', (96, 96), tiles[(k + r) % 2] + (255,))
            spr = render(grid, side, 1).resize((78, 78), Image.NEAREST)
            tile.alpha_composite(spr, (9, 2))
            img.alpha_composite(tile, (x, y0 + r * 110))
    img.save(path)
    print(path)


def apply():
    new = build()
    path = os.path.join(HERE, 'pieces64.txt')
    lines = open(path, encoding='utf-8').read().split('\n')
    out, skip, at = [], False, 0
    for ln in lines:
        if ln.startswith('['):
            key = ln.strip()[1:-1]
            skip = key in new
            out.append(ln)
            if skip:
                at = len(out)
                out.extend(new[key])
            continue
        if skip and ln.startswith('#'):
            out.insert(at, ln)
            at += 1
        elif not skip or not ln.strip():
            out.append(ln)
    open(path, 'w', encoding='utf-8').write('\n'.join(out).rstrip('\n') + '\n')
    print('pieces64.txt:', ', '.join(new))


if __name__ == '__main__':
    {'preview': lambda: preview(sys.argv[2]), 'apply': apply}[sys.argv[1]]()
