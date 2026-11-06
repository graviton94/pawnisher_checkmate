"""
기호 시트 → 우리 도트 (D-255, 사용자: 「받은 시트 기반으로 우리 세계관 디자인급으로 디더링해서」).
받은 그림(ICON-01, 6×4 칸 · 검정 바탕 · 도트 크기가 제각각이고 부드러운 음영)을 우리 문법으로 다시 찍는다:
  ① 칸마다 검정 바탕을 떼고 기호만 (바탕 = 아주 어두운 색, 가장자리와 이어진 것만)
  ② N×N 격자로 다시 도트화 — 칸마다 바탕이 아닌 픽셀의 중앙값 색 (안티에일리어싱 · 압축 얼룩 제거)
  ③ 우리 팔레트로 맞추기 — 두 이웃 색 사이 중간 톤은 4×4 베이어 디더 (부드러운 음영 → 도트 디더)
  ④ 1칸 어두운 테 (#16141C) — 기물 · 아이콘과 같은 문법
출력: public/ui/props/ic-<이름>.png (N도트) + build-res/ICON-01-preview.png (확인용, 4배)
사용: python3 -I tools/pixel/sheet-slice.py [N=24]
"""
import os
import sys
from collections import deque

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, 'build-res', 'order', 'ICON-01-event-symbols-source.jpg')
OUT = os.path.join(ROOT, 'public', 'ui', 'props')
COLS, ROWS = 6, 4
NAMES = [
    'gear', 'bolt', 'spring', 'key', 'lens', 'tower',
    'gear-gold', 'medal-knight', 'medal-pawn', 'crown-paper', 'crown-gold', 'valve',
    'gear-broken', 'rust', 'reject', 'chain-broken', 'screw-broken', 'stove',
    'coin-front', 'coin-tilt', 'coin-edge', 'coin-back', 'seal-slot', 'seal-corner',
]
OL = (22, 20, 28)
# 우리 세계 팔레트 (램프별 어두움 → 밝음). 받은 색은 가장 가까운 두 단계 사이에서 디더된다
RAMPS = {
    'gold': [(42, 26, 6), (90, 58, 12), (154, 106, 20), (212, 154, 34), (244, 200, 74), (255, 230, 138), (255, 248, 214)],
    'steel': [(27, 26, 34), (42, 44, 54), (61, 64, 76), (90, 94, 108), (134, 138, 152), (184, 188, 200), (232, 234, 240)],
    'ivory': [(154, 144, 122), (200, 188, 162), (233, 226, 212), (255, 250, 240)],
    'crimson': [(58, 10, 16), (122, 18, 24), (196, 36, 48), (229, 38, 47), (255, 107, 107)],
    'teal': [(6, 34, 38), (14, 70, 76), (30, 110, 120), (46, 150, 156), (95, 212, 216), (180, 244, 244)],
    'rust': [(40, 18, 12), (74, 32, 20), (116, 54, 26), (154, 76, 34), (192, 106, 48), (224, 144, 74)],
    'smoke': [(92, 86, 100), (163, 156, 171), (216, 212, 220)],
}
PAL = [c for r in RAMPS.values() for c in r] + [OL]
BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]


def d2(a, b):
    # 사람 눈 가중 거리 (초록에 민감)
    return 2 * (a[0] - b[0]) ** 2 + 4 * (a[1] - b[1]) ** 2 + 3 * (a[2] - b[2]) ** 2


def nearest2(c):
    """가장 가까운 팔레트 색 둘과 섞는 비율 (같은 램프 안의 이웃 단계끼리만 디더)"""
    best = None
    for ramp in RAMPS.values():
        for i in range(len(ramp) - 1):
            a, b = ramp[i], ramp[i + 1]
            # c를 a→b 선분에 투영
            ab = [b[k] - a[k] for k in range(3)]
            ac = [c[k] - a[k] for k in range(3)]
            L = sum(v * v for v in ab) or 1
            t = max(0.0, min(1.0, sum(ab[k] * ac[k] for k in range(3)) / L))
            p = tuple(a[k] + ab[k] * t for k in range(3))
            e = d2(c, p)
            if best is None or e < best[0]:
                best = (e, a, b, t)
    return best[1], best[2], best[3]


def is_bg(c):
    return max(c) < 26


def slice_cell(im, ci, n):
    W, H = im.size
    cw, ch = W / COLS, H / ROWS
    col, row = ci % COLS, ci // COLS
    box = (int(col * cw), int(row * ch), int((col + 1) * cw), int((row + 1) * ch))
    cell = im.crop(box)
    px = cell.load()
    w, h = cell.size
    # ① 가장자리와 이어진 어둠 = 바탕 (기호 안의 검은 선은 남는다)
    bg = [[False] * w for _ in range(h)]
    q = deque((x, y) for x in range(w) for y in (0, h - 1))
    q.extend((x, y) for y in range(h) for x in (0, w - 1))
    while q:
        x, y = q.popleft()
        if x < 0 or y < 0 or x >= w or y >= h or bg[y][x] or not is_bg(px[x, y]):
            continue
        bg[y][x] = True
        q.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    # 이웃 칸에서 넘어온 조각 버리기: 덩어리(8방 이음)를 나눠, 칸 가장자리에 닿고 가장 큰 덩어리의 1/6보다 작은 것은 바탕으로
    lab = [[-1] * w for _ in range(h)]
    comps = []
    for y in range(h):
        for x in range(w):
            if bg[y][x] or lab[y][x] >= 0:
                continue
            k = len(comps)
            pts = []
            dq = deque([(x, y)])
            lab[y][x] = k
            while dq:
                a, b = dq.popleft()
                pts.append((a, b))
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        na, nb = a + dx, b + dy
                        if 0 <= na < w and 0 <= nb < h and not bg[nb][na] and lab[nb][na] < 0:
                            lab[nb][na] = k
                            dq.append((na, nb))
            comps.append(pts)
    big = max(len(c) for c in comps)
    for c in comps:
        edge = any(a <= 1 or b <= 1 or a >= w - 2 or b >= h - 2 for a, b in c)
        # 아래 · 위 가장자리에 닿은 조각은 가장 큰 덩어리의 절반보다 작으면 이웃 칸 것으로 본다
        if (edge and len(c) < big / 2) or len(c) < 12:
            for a, b in c:
                bg[b][a] = True
    xs = [x for y in range(h) for x in range(w) if not bg[y][x]]
    ys = [y for y in range(h) for x in range(w) if not bg[y][x]]
    x0, x1, y0, y1 = min(xs), max(xs) + 1, min(ys), max(ys) + 1
    side = max(x1 - x0, y1 - y0)
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    inner = n - 2  # 테 자리 1칸씩
    step = side / inner
    out = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    o = out.load()
    for j in range(inner):
        for i in range(inner):
            sx0, sy0 = cx - side / 2 + i * step, cy - side / 2 + j * step
            cols = []
            tot = 0
            for yy in range(int(sy0), int(sy0 + step) + 1):
                for xx in range(int(sx0), int(sx0 + step) + 1):
                    if 0 <= xx < w and 0 <= yy < h:
                        tot += 1
                        if not bg[yy][xx]:
                            cols.append(px[xx, yy])
            if tot and len(cols) / tot >= 0.5:
                # ② 중앙값 색
                c = tuple(sorted(v[k] for v in cols)[len(cols) // 2] for k in range(3))
                # 기호 안의 아주 어두운 선은 우리 테 색으로
                if max(c) < 40:
                    o[i + 1, j + 1] = OL + (255,)
                    continue
                # ③ 팔레트 + 베이어 디더
                a, b, t = nearest2(c)
                # 한쪽에 가까우면 그 색, 가운데 톤만 디더 (넓은 면이 체크무늬로 시끄럽지 않게)
                if t < 0.3:
                    c2 = a
                elif t > 0.7:
                    c2 = b
                else:
                    c2 = b if (t - 0.3) / 0.4 > (BAYER[(j % 4) * 4 + (i % 4)] + 0.5) / 16 else a
                o[i + 1, j + 1] = c2 + (255,)
    # ④ 바깥 1칸 테
    src = out.copy().load()
    for y in range(n):
        for x in range(n):
            if src[x, y][3]:
                continue
            if any(0 <= x + dx < n and 0 <= y + dy < n and src[x + dx, y + dy][3] and src[x + dx, y + dy][:3] != OL for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                o[x, y] = OL + (255,)
    return out


def main():
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 24
    im = Image.open(SRC).convert('RGB')
    os.makedirs(OUT, exist_ok=True)
    tiles = []
    for ci, name in enumerate(NAMES):
        t = slice_cell(im, ci, n)
        t.save(os.path.join(OUT, f'ic{"" if n == 24 else n}-{name}.png'))
        tiles.append(t)
    k = 4
    sheet = Image.new('RGBA', (COLS * (n * k + 16) + 16, ROWS * (n * k + 16) + 16), (20, 18, 26, 255))
    for ci, t in enumerate(tiles):
        sheet.alpha_composite(t.resize((n * k, n * k), Image.NEAREST), (16 + (ci % COLS) * (n * k + 16), 16 + (ci // COLS) * (n * k + 16)))
    sheet.save(os.path.join(ROOT, 'build-res', f'ICON-01-preview-{n}.png'))
    print('ok', n)


if __name__ == '__main__':
    main()
