"""
주인공 「종이 왕관을 쓴 폰」 (2026-11-05). 사용자 초안(72칸) build-res/order/K-paperking-sketch.png의 왕관을 칸 그대로 쓴다
(사용자: "내 초안 활용하라고"). 왕관 모양 · 뿔 넷 · 기울기 · 크기 · 보석 자리는 초안 그대로, 칠만 다른 기물과 같은 규칙으로 맞춘다.
  - 초안 주황 = 왕관 속 칠, 청록 = 보석 — 모양 그대로, 2칸 더 아래로(푹 눌러쓴). 초안의 검은 테두리는 두께가 들쭉날쭉해 버리고, 폰 외곽선과 같은 4칸으로 고르게 다시 두른다
  - 몸통은 통일된 흰 폰 [P 0] (72칸 캔버스에 아래 맞춤 — 초안의 폰 자리와 같다), 왕관이 덮는 칸은 왕관이 이긴다
  - 왕관 칠: 마분지 3단계, 빛은 왼쪽 위 — 줄마다 왼쪽 36% 빛(F) · 가운데 바탕(Q) · 오른쪽 28% 그늘(J), 오른쪽 끝 · 맨 아래 한 칸 그늘
  - 보석: 청록(C) + 왼쪽 위 한 칸 흰 빛(V)
  - 흰 바깥 테 3칸을 전체에 다시 두른다
사용: python3 -I tools/pixel/paperking.py preview <out.png> | apply   (apply = pieces64.txt의 [K 0]을 바꾼다 → maker.py export)
"""
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import maker  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(HERE))
SKETCH = os.path.join(ROOT, 'build-res', 'order', 'K-paperking-sketch.png')
N = 72
RIM = 3
LINE = 4      # 왕관 검은 테두리 두께 — 폰 외곽선(4~5칸)에 맞춘다 (초안의 들쭉날쭉한 테두리 대신)
DROP = 2      # 초안보다 2칸 더 푹 눌러쓴다


def crown_from_sketch():
    """초안에서 왕관만: {(x,y): 'line' | 'fill' | 'gem'}"""
    im = Image.open(SKETCH).convert('RGBA')
    out = {}
    for y in range(N):
        for x in range(N):
            r, g, b, a = im.getpixel((x, y))
            if a < 128:
                continue
            if (r, g, b) == (0, 0, 0):
                out[(x, y)] = 'line'
            elif r > 200 and 100 < g < 200 and b < 60:
                out[(x, y)] = 'fill'
            elif r < 60 and g > 180 and b > 200:
                out[(x, y)] = 'gem'
    return out


def shade(crown):
    """왕관 속 칠 (보석 칸도 속 칠 덩어리로 본다)"""
    inner = {p for p, v in crown.items() if v != 'line'}
    out = {}
    for (x, y) in inner:
        lo = x
        while (lo - 1, y) in inner:
            lo -= 1
        hi = x
        while (hi + 1, y) in inner:
            hi += 1
        w = hi - lo + 1
        p = (x - lo) / max(1, w - 1)
        if w <= 4:
            ch = 'F' if x == lo else 'J' if x == hi else 'Q'
        elif x == hi or p >= 0.72:
            ch = 'J'
        elif p < 0.36:
            ch = 'F'
        else:
            ch = 'Q'
        if (x, y + 1) not in inner:
            ch = 'J'
        out[(x, y)] = ch
    gem = [p for p, v in crown.items() if v == 'gem']
    if gem:
        gx, gy = min(x for x, _ in gem), min(y for _, y in gem)
        for p in gem:
            out[p] = 'C'
        out[(gx, gy)] = 'V'
    return out


def build():
    g = [list(r.replace('O', '.')) for r in maker.pad72(maker.load64()[('P', 0)])]
    sk = crown_from_sketch()
    # 초안의 속 칠(주황 · 보석) 모양은 그대로, DROP칸 아래로. 검은 테두리는 초안 것을 버리고 LINE칸으로 고르게 다시 두른다
    crown = {(x, y + DROP): v for (x, y), v in sk.items() if v != 'line'}
    paint = shade(crown)
    # 머리는 왕관 속에 들어간다: 왕관이 있는 열에서 왕관 맨 아랫줄보다 위의 폰 칸은 지운다 (뿔 사이 골로 머리가 비치지 않게)
    bottom = {}
    for (x, y) in crown:
        bottom[x] = max(bottom.get(x, -1), y)
    for x, yb in bottom.items():
        for y in range(0, yb + 1):
            g[y][x] = '.'
    for (x, y) in crown:
        for dy in range(-LINE, LINE + 1):
            for dx in range(-LINE, LINE + 1):
                q = (x + dx, y + dy)
                if q not in crown and 0 <= q[0] < N and 0 <= q[1] < N:
                    g[q[1]][q[0]] = 'K'
    for (x, y), ch in paint.items():
        g[y][x] = ch
    body = {(x, y) for y in range(N) for x in range(N) if g[y][x] != '.'}
    for y in range(N):
        for x in range(N):
            if g[y][x] == '.' and any((x + dx, y + dy) in body for dy in range(-RIM, RIM + 1) for dx in range(-RIM, RIM + 1)):
                g[y][x] = 'O'
    return [''.join(r) for r in g]


def preview(path):
    grid = build()
    img = Image.new('RGBA', (N * 8 + 200, N * 4 + 40), (30, 29, 36, 255))
    sk = Image.open(SKETCH).convert('RGBA').resize((N * 4, N * 4), Image.NEAREST)
    img.alpha_composite(sk, (20, 20))
    img.alpha_composite(maker.render64(grid, 0, 4), (40 + N * 4, 20))
    tiles = [(0x56, 0x54, 0x5E), (0x2F, 0x2E, 0x36)]
    x0 = N * 8 + 70
    others = [maker.render64(maker.pad72(maker.load64()[(t, s)]), s, 1) for t, s in (('P', 0), ('Q', 1))]
    for k, spr in enumerate([others[0], maker.render64(grid, 0, 1), others[1]]):
        tile = Image.new('RGBA', (96, 96), tiles[k % 2] + (255,))
        tile.alpha_composite(spr.resize((88, 88), Image.NEAREST), (4, -6))
        img.alpha_composite(tile, (x0, 20 + k * 100) if k < 2 else (x0 + 100, 20))
    img.save(path)
    print(path)


def apply():
    path = os.path.join(HERE, 'pieces64.txt')
    grid = build()
    lines = open(path, encoding='utf-8').read().split('\n')
    out, skip = [], False
    for ln in lines:
        if ln.startswith('['):
            skip = ln.strip() == '[K 0]'
            out.append(ln)
            if skip:
                out.append('# 주인공 「종이 왕관을 쓴 폰」 72칸 — 사용자 초안 왕관 그대로 (tools/pixel/paperking.py apply)')
                out.extend(grid)
            continue
        if not skip or not ln.strip():
            out.append(ln)
    open(path, 'w', encoding='utf-8').write('\n'.join(out).rstrip('\n') + '\n')
    print('pieces64.txt: [K 0] 72칸')


if __name__ == '__main__':
    {'preview': lambda: preview(sys.argv[2]), 'apply': apply}[sys.argv[1]]()
