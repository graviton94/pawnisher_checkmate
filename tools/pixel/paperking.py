"""
주인공 「종이 왕관을 쓴 폰」 (2026-11-05, 사용자 스케치 + 오프닝 P-05의 마분지 왕관).
72칸 캔버스: 통일된 흰 폰 [P 0](64칸)을 아래 맞춤으로 놓고, 머리보다 큰 마분지 왕관을 비스듬히 씌운다.
다른 기물과 같은 철학: 검은 외곽선(왕관은 뾰족한 끝이 살게 2칸) + 흰 바깥 테 3칸 + 빛은 왼쪽 위 3단계(빛 · 바탕 · 그늘) + 짙은 그늘 한 칸.
왕관: 뿔 넷, 머리 가운데까지 푹 눌러쓴 띠(아랫변 = 폰 머리 폭, 위가 넓은 사다리꼴), 살짝 오른쪽이 들린 기울기, 띠 오른쪽 뚫린 구멍(오프닝 그림처럼). 외곽선은 폰과 같은 4칸.
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
# 왕관 (사용자: "뿔 4개 · 푹 눌러쓴 · 아랫변은 폰 머리 폭 · 위가 넓은 사다리꼴 · 외곽선 두께를 폰과 맞춰")
# 72칸 좌표. 폰 머리: 외곽선 x 21~51 · 속 칠 x 26~46 (가운데 36), 머리 윗선 y 19, 가장 넓은 곳 y 30~37
CX = 36            # 폰 축
BAND_TOP, BAND_BOT = 23, 30   # 띠: 머리 윗부분을 푹 눌러 덮고, 머리 아래 절반은 보인다
HW_TOP, HW_BOT = 19.0, 11.0   # 띠 반폭 (위가 넓은 사다리꼴 — 아랫변 21칸 = 폰 머리 속 칠 폭)
PEAKS = [10, 13, 13, 10]      # 뿔 넷 (안쪽 둘이 높다)
TILT = -5          # 도 (음수 = 오른쪽이 들린다, 열 단위로 민다)
OUTLINE = 3        # 폰 외곽선(4~5)에 가깝게, 뿔 사이 골이 메워지지 않는 두께
HOLE = (0.68, 0.45)  # 구멍: 띠 오른쪽 (폭 비율 · 높이 비율)


def crown_cells():
    """도트로 바로 찍는다. 반환: {(x, y): (u, v, part)} — u = 띠 폭에서의 비율(0~1), v = 띠 안 높이 비율, part = 'peak' | 'band'"""
    slope = math.tan(math.radians(TILT))
    cells = {}
    left, right = CX - HW_TOP, CX + HW_TOP
    width = right - left
    for x in range(N):
        xc = x + 0.5
        shift = round((xc - CX) * slope)
        # 뿔: 띠 윗변 위 삼각형 넷
        if left <= xc <= right:
            k = min(len(PEAKS) - 1, int((xc - left) / (width / len(PEAKS))))
            f = (xc - left) / (width / len(PEAKS)) - k
            h = round(PEAKS[k] * (1 - abs(2 * f - 1)))
            for y in range(BAND_TOP - h, BAND_TOP):
                cells[(x, y + shift)] = ((xc - left) / width, 0.0, 'peak')
        # 띠: 줄마다 반폭이 위에서 아래로 줄어든다
        for y in range(BAND_TOP, BAND_BOT + 1):
            t = (y - BAND_TOP) / (BAND_BOT - BAND_TOP)
            hw = HW_TOP + (HW_BOT - HW_TOP) * t
            if CX - hw <= xc <= CX + hw:
                cells[(x, y + shift)] = ((xc - (CX - hw)) / (2 * hw), t, 'band')
    return {p: v for p, v in cells.items() if 0 <= p[0] < N and 0 <= p[1] < N}


def shade(cells):
    """왕관 칠 (빛은 왼쪽 위, 다른 기물과 같은 3단계 + 끝 짙은 그늘): 뿔은 왼쪽 반 빛(F) · 오른쪽 반 바탕(Q),
    띠는 왼쪽 30% 빛 · 가운데 바탕 · 오른쪽 30% 그늘(J), 띠 맨 아래 줄 · 오른쪽 끝 한 칸 그늘, 뚫린 구멍(I)"""
    out = {}
    n = len(PEAKS)
    for (x, y), (u, v, part) in cells.items():
        if part == 'peak':
            k = min(n - 1, int(u * n))
            ch = 'F' if (u * n - k) < 0.5 else 'Q'
        else:
            ch = 'F' if u < 0.3 else 'J' if u > 0.7 else 'Q'
            if (x, y + 1) not in cells:
                ch = 'J'
            if (u - HOLE[0]) ** 2 * 400 + (v - HOLE[1]) ** 2 * 14 < 1.0:
                ch = 'I'
        if (x + 1, y) not in cells:
            ch = 'J'
        out[(x, y)] = ch
    return out


def build():
    pawn = maker.pad72(maker.load64()[('P', 0)])
    g = [list(r.replace('O', '.')) for r in pawn]
    cells = crown_cells()
    paint = shade(cells)
    # 머리는 왕관 속에 들어가 있다: 띠 윗변보다 위의 폰 칸(머리 꼭대기 · 그 외곽선)은 지운다 — 뿔 사이 골로 비치지 않게
    band_top = {}
    for (x, y), (u, v, part) in cells.items():
        if part == 'band':
            band_top[x] = min(band_top.get(x, N), y)
    xs = sorted(band_top)
    for x in range(xs[0] - OUTLINE, xs[-1] + OUTLINE + 1):
        top = band_top.get(min(max(x, xs[0]), xs[-1]))
        for y in range(0, top):
            if 0 <= x < N:
                g[y][x] = '.'
    # 왕관 외곽선: 폰과 같은 굵기. 뿔 사이 골이 메워지지 않게 윗변을 넓혀(사다리꼴) 골 폭을 확보했다
    for (x, y), (u, v, part) in cells.items():
        r = OUTLINE
        for dy in range(-r, r + 1):
            for dx in range(-r, r + 1):
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
