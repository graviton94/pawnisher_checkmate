"""
주인공 「종이 왕관을 쓴 폰」 (2026-11-05, 사용자 스케치 + 오프닝 P-05의 마분지 왕관).
72칸 캔버스: 통일된 흰 폰 [P 0](64칸)을 아래 맞춤으로 놓고, 머리보다 큰 마분지 왕관을 비스듬히 씌운다.
다른 기물과 같은 철학: 검은 외곽선(왕관은 뾰족한 끝이 살게 2칸) + 흰 바깥 테 3칸 + 빛은 왼쪽 위 3단계(빛 · 바탕 · 그늘) + 짙은 그늘 한 칸.
왕관: 뾰족 다섯(양 끝 낮게 · 가운데 가장 높게), 오른쪽이 들린 기울기, 띠 오른쪽에 뚫린 구멍 하나(오프닝 그림처럼).
사용: python3 -I tools/pixel/paperking.py preview <out.png> | apply   (apply = pieces64.txt의 [K 0]을 바꾼다 → maker.py export)
"""
import math
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import maker  # noqa: E402

N = 72
RIM = 3
# 왕관 모양 (기울이기 전, 왼쪽 아래가 원점, 위가 −y)
W = 38           # 띠 폭 (머리보다 넓게)
BAND = 8         # 띠 높이
PEAKS = [7, 10, 13, 10, 7]  # 뾰족 높이 (띠 위로) — 가운데가 가장 높다
TILT = -8        # 도 (음수 = 오른쪽이 들린다)
CX, CY = 36.5, 31.0  # 띠 아랫변 가운데가 놓일 자리 (72칸 좌표) — 머리 윗부분을 덮는다
HOLE = (0.72, 0.5)   # 구멍: 띠 폭의 72% · 띠 높이 가운데


def crown_cells():
    """도트로 바로 찍는다: 기울기는 회전 대신 열 단위 밀기(열마다 정수 칸씩 위로) — 계단이 고르게 남는다.
    반환: {(x, y): (lx, ly)} — lx = 띠 왼끝에서의 칸, ly = 띠 아랫변 기준 높이(위가 음수)"""
    n = len(PEAKS)
    step = W / (n - 1)
    slope = math.tan(math.radians(TILT))
    x0 = round(CX - W / 2)
    cells = {}
    for lx in range(W + 1):
        k = lx / step
        i0 = int(k)
        f = k - i0
        # 뾰족 사이: 꼭대기 → 골(띠 윗변) → 다음 꼭대기 (직선)
        if f <= 0.5:
            h = PEAKS[min(i0, n - 1)] * (1 - f * 2)
        else:
            h = PEAKS[min(i0 + 1, n - 1)] * ((f - 0.5) * 2)
        top = -BAND - round(h)
        shift = round(lx * slope)
        for ly in range(top, 0):
            x, y = x0 + lx, round(CY) + ly + shift
            if 0 <= x < N and 0 <= y < N:
                cells[(x, y)] = (lx, ly)
    return cells


def shade(cells):
    """왕관 칠: 빛은 왼쪽 위 — 뾰족마다 왼쪽 절반 빛(F) · 오른쪽 바탕(Q), 띠는 오른쪽 30% 그늘(J), 띠 맨 아래 · 오른쪽 끝 한 칸 그늘, 구멍(I)"""
    out = {}
    n = len(PEAKS)
    step = W / (n - 1)
    hx, hy = HOLE[0] * W, -BAND * HOLE[1]
    for (x, y), (lx, ly) in cells.items():
        if ly < -BAND:  # 뾰족
            k = round(lx / step)
            ch = 'F' if lx < k * step else 'Q'
        else:  # 띠
            ch = 'F' if lx < W * 0.3 else 'J' if lx > W * 0.72 else 'Q'
            if ly > -1.5:
                ch = 'J'
        if (x + 1, y) not in cells or (x, y + 1) not in cells:
            ch = 'J'
        if (lx - hx) ** 2 + ((ly - hy) * 1.2) ** 2 < 2.6:
            ch = 'I'
        out[(x, y)] = ch
    return out


def build():
    pawn = maker.pad72(maker.load64()[('P', 0)])
    g = [list(r.replace('O', '.')) for r in pawn]
    cells = crown_cells()
    paint = shade(cells)
    # 왕관 외곽선 2칸 (머리 위로 덮는다)
    for (x, y) in cells:
        for dy in range(-2, 3):
            for dx in range(-2, 3):
                p = (x + dx, y + dy)
                if p not in cells and 0 <= p[0] < N and 0 <= p[1] < N:
                    g[p[1]][p[0]] = 'K'
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
    img = Image.new('RGBA', (N * 4 * 2 + 60 + 300, N * 4 + 40), (30, 29, 36, 255))
    img.alpha_composite(maker.render64(grid, 0, 4), (20, 20))
    others = [maker.render64(maker.pad72(maker.load64()[(t, s)]), s, 1) for t, s in (('P', 0), ('Q', 1), ('K', 1))]
    me = maker.render64(grid, 0, 1)
    tiles = [(0x56, 0x54, 0x5E), (0x2F, 0x2E, 0x36)]
    x0 = N * 4 + 60
    for k, spr in enumerate([others[0], me, others[1], others[2]]):
        tile = Image.new('RGBA', (110, 110), tiles[k % 2] + (255,))
        s = spr.resize((101, 101), Image.NEAREST)
        tile.alpha_composite(s, (5, -8))
        img.alpha_composite(tile, (x0 + (k % 2) * 120, 20 + (k // 2) * 120))
    img.alpha_composite(maker.render64(grid, 0, 2), (x0 + 250, 20))
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
                out.append('# 주인공 「종이 왕관을 쓴 폰」 72칸 (2026-11-05) — tools/pixel/paperking.py apply가 쓴다')
                out.extend(grid)
            continue
        if not skip or not ln.strip():
            out.append(ln)
    open(path, 'w', encoding='utf-8').write('\n'.join(out).rstrip('\n') + '\n')
    print('pieces64.txt: [K 0] 72칸')


if __name__ == '__main__':
    {'preview': lambda: preview(sys.argv[2]), 'apply': apply}[sys.argv[1]]()
