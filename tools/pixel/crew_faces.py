"""
분대원 얼굴 5장 (N-02 ~ 06, D-350) 받은 그림 → 56×56 도트 — 부관 박차 얼굴(adjutant.py)과 같은 규격.
마젠타 바탕을 빼고 기물을 정사각에 앉힌 뒤, 칸마다 가장 많은 색으로 줄이고, 옛 흰 테를 벗겨 흰 테 2칸을 새로 두른다.
사용: python3 -I tools/pixel/crew_faces.py   (원본 build-res/order/N-crew-{P,N,B,R,Q}-source.png → public/ui/hud/crew-*.png)
"""
import os
from collections import Counter

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
N, RING = 56, 0  # D-353: 흰 테 없이 — 액자 바탕이 종이(흰색)라 검은 외곽선만으로 선다
CROP = {'P': 0.74, 'N': 0.66, 'B': 0.8, 'R': 0.64, 'Q': 0.62}  # 기물 키 중 초상에 담을 위쪽 몫 (비숍은 십자가, 룩은 도장까지)
WHITE, INK = (244, 241, 234), (11, 11, 14)
N4 = [(1, 0), (-1, 0), (0, 1), (0, -1)]
N8 = N4 + [(1, 1), (1, -1), (-1, 1), (-1, -1)]
is_bg = lambda c: c[0] > 200 and c[1] < 80 and c[2] > 200  # 마젠타


def one(t):
    src = os.path.join(ROOT, 'build-res', 'order', f'N-crew-{t}-source.png')
    im = Image.open(src).convert('RGB')
    px = im.load()
    xs, ys = [], []
    for y in range(0, im.height, 2):
        for x in range(0, im.width, 2):
            if not is_bg(px[x, y]):
                xs.append(x); ys.append(y)
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    # 초상 (D-352): 기물 위쪽(머리 + 알아보는 표식)만 잘라 크게 — 아래는 액자 밑변에 잘린다
    yc = y0 + (y1 - y0) * CROP[t]
    top = [x for x, y in zip(xs, ys) if y <= yc]
    xl, xr = min(top), max(top)
    cs = max((xr - xl) / (N - 2 * RING - 2), (yc - y0) / (N - RING - 1))
    box = ((xl + xr) / 2 - (N / 2) * cs, y0 - (RING + 1) * cs)
    grid = {}
    for j in range(N):
        for i in range(N):
            fx, fy = box[0] + i * cs, box[1] + j * cs
            pix = [px[int(xx), int(yy)] for yy in range(int(fy), int(fy + cs)) for xx in range(int(fx), int(fx + cs)) if 0 <= xx < im.width and 0 <= yy < im.height]
            if not pix or sum(map(is_bg, pix)) > len(pix) * 0.5:
                continue
            grid[(i, j)] = Counter(tuple(v // 8 * 8 for v in c) for c in pix if not is_bg(c)).most_common(1)[0][0]
    dark = lambda c: sum(c) < 150
    light = lambda c: sum(c) > 600
    shape = set(grid)
    col = {p: (INK if dark(grid[p]) else grid[p]) for p in shape}
    for _ in range(4):
        old = {p for p in shape if light(col[p]) and any((p[0] + dx, p[1] + dy) not in shape for dx, dy in N4) and any(col.get((p[0] + dx, p[1] + dy)) == INK for dx, dy in N8)}
        if not old:
            break
        shape -= old
    inside = lambda p: 0 <= p[0] < N and 0 <= p[1] < N
    for _ in range(RING):
        for a in {(p[0] + dx, p[1] + dy) for p in shape for dx, dy in N8}:
            if a not in shape and inside(a):
                col[a] = WHITE
                shape.add(a)
    out = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    for p in shape:
        out.putpixel(p, (*col[p], 255))
    dst = os.path.join(ROOT, 'public', 'ui', 'hud', f'crew-{t}.png')
    out.save(dst)
    print(dst)


if __name__ == '__main__':
    for t in 'PNBRQ':
        one(t)
