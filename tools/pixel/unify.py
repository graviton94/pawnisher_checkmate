"""
흑백 기물 통일 (2026-11-05, 사용자: "외곽선 + 흰 테를 기물별로 공용으로 지정해 놓고 백 · 흑 별로 채색 — 내부 색칠만 달라진다.
퀸의 성곽 + 십자가, 룩의 성곽을 명확한 형체로. 그림자 단계는 흑백 둘 다 유지, 완전히 통일. 킹 테두리는 내가 준 new 기준").

기물마다 틀 하나:
  틀 = 몸 칸(검은 외곽선 K / 속 칠 자리) + 흰 바깥 테 3칸(몸에서 체비쇼프 3, 사용자 K new와 같은 두께) + 그림자 역할 지도
  그림자 역할 5단계: hi2(강한 빛) · hi1(빛) · base(바탕) · sh1(그늘) · sh2(짙은 그늘) — 흑백이 같은 자리 · 같은 단계를 쓰고 색만 바꾼다.
    흰 진영: hi2 V #FFFFFF · hi1 W · base E #E2DED6 · sh1 S · sh2 G   (흰 바탕을 한 단계 낮춰야 빛이 보인다)
    검은 진영: hi2 H · hi1 M · base B · sh1 Z #26272E · sh2 D
  외곽선 모양: 검은 기물 정본을 따른다 (킹은 사용자 K new). 폰 · 룩 · 퀸 · 킹은 좌우 대칭으로 맞춘다.
  역할 지도: 검은 정본의 강한 빛(L · H) → hi2, 빛(M) → hi1, 흰 정본의 그늘(S) → sh1, 짙은 그늘(G · 흑백 D) → sh2, 나머지 base.
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
KING_NEW = os.path.join(ROOT, 'build-res', 'piskel', 'K-black-new.png')
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
    if t in 'PRQ':
        kind = mirror(kind, axis_of(set(kind)))
    return kind, src


def roles(t, kind, hi, ksrc):
    """그림자 역할 지도 (흑백 공용)"""
    blk = ksrc if t == 'K' else hi[(t, 1)]
    wht = hi[(t, 0)] if t != 'K' else hi[('K:classic', 0)]
    redrawn = (lambda y: 14 <= y <= 26) if t == 'R' else (lambda y: 4 <= y <= 26) if t == 'Q' else (lambda y: False)
    out = {}
    inner = {p for p, v in kind.items() if v == '#'}
    for (x, y) in inner:
        if redrawn(y):
            continue
        r = 'base'
        b, w = blk[y][x], wht[y][x]
        if b == 'M':
            r = 'hi1'
        if b in 'LH':
            r = 'hi2'
        if w == 'S' and RANK['sh1'] > RANK[r]:
            r = 'sh1'
        if w in 'GD' or b == 'D':
            r = 'sh2'
        out[(x, y)] = r
    # 새로 그린 성곽: 빛은 왼쪽 · 위, 그늘은 오른쪽 · 아래 (칸 덩어리마다 같은 규칙)
    for (x, y) in inner:
        if not redrawn(y):
            continue
        left = (x - 1, y) not in inner
        top = (x, y - 1) not in inner
        right1 = (x + 1, y) not in inner
        right2 = (x + 2, y) not in inner
        bottom = (x, y + 1) not in inner
        r = 'base'
        if (x - 2, y) not in inner:
            r = 'hi1'
        if left or top:
            r = 'hi2'
        if right2:
            r = 'sh1'
        if right1 or bottom:
            r = 'sh2'
        out[(x, y)] = r
    return out


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
