"""
부관 박차 초상 (N-01) 받은 그림 → 56×56 도트 (2026-11-06).
받은 그림은 도트 크기가 섞여 있어 scene-import(격자 찾기)가 맞지 않는다 → 칸마다 가장 많은 색으로 줄인다.
외곽 (사용자: 「내부는 유지하고 최외곽 흰 선만 새로 — 더 두껍게, 코 부분 등 빠진 데 없이」):
  ① 가장자리와 이어진 어둠만 투명 ② 옛 흰 테만 벗긴다 ③ 남은 모양 둘레에 흰 테 RING칸을 새로 두른다. 몸 안 칸은 받은 그림 그대로.
사용: python3 -I tools/pixel/adjutant.py   (원본 build-res/order/N-01-adjutant-src-source.png → public/ui/hud/adjutant.png)
"""
import os
from collections import Counter, deque

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, 'build-res', 'order', 'N-01-adjutant-src-source.png')
OUT = os.path.join(ROOT, 'public', 'ui', 'hud', 'adjutant.png')
BOX = (53, 130, 1139, 1216)  # 받은 그림에서 기물이 든 정사각
N = 56
RING = 2  # 흰 테 굵기 (칸)
WHITE, INK = (244, 241, 234), (11, 11, 14)
N4 = [(1, 0), (-1, 0), (0, 1), (0, -1)]
N8 = N4 + [(1, 1), (1, -1), (-1, 1), (-1, -1)]


def main():
    crop = Image.open(SRC).convert('RGB').crop(BOX)
    cs = crop.size[0] / N
    cp = crop.load()
    # 바탕 = 남빛 도는 짙은 색 (11,10,15) — 검은 선(0~4)과 색으로 가른다 (어둡다고 바탕으로 보면 흰 테가 빠진 자리의 검은 선까지 지워졌다)
    is_bg = lambda c: 8 <= c[0] <= 13 and 7 <= c[1] <= 12 and 12 <= c[2] <= 18
    grid, bgcell = {}, set()
    for j in range(N):
        for i in range(N):
            pix = [cp[xx, yy] for yy in range(int(j * cs), int((j + 1) * cs)) for xx in range(int(i * cs), int((i + 1) * cs))]
            if sum(map(is_bg, pix)) > len(pix) * 0.5:
                bgcell.add((i, j))
                continue
            grid[(i, j)] = Counter(tuple(v // 8 * 8 for v in c) for c in pix if not is_bg(c)).most_common(1)[0][0]
    dark = lambda c: sum(c) < 120
    inside = lambda p: 0 <= p[0] < N and 0 <= p[1] < N
    shape = set(grid)
    col = {p: (INK if dark(grid[p]) else grid[p]) for p in shape}
    light = lambda c: sum(c) > 600
    # ② 옛 흰 테만 벗긴다: 바깥과 닿고 검은 선 위에 얹힌 밝은 칸 (몸 안 색은 그대로)
    for _ in range(3):
        old = {p for p in shape if light(col[p]) and any((p[0] + dx, p[1] + dy) not in shape for dx, dy in N4) and any(col.get((p[0] + dx, p[1] + dy)) == INK for dx, dy in N8)}
        if not old:
            break
        shape -= old
    # ③ 새 흰 테: 남은 모양을 8방으로 RING칸 넓힌 띠 — 코끝 · 귀 · 받침까지 빠짐없이 같은 굵기
    for _ in range(RING):
        for a in {(p[0] + dx, p[1] + dy) for p in shape for dx, dy in N8}:
            if a not in shape and inside(a):
                col[a] = WHITE
                shape.add(a)
    out = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    for p in shape:
        out.putpixel(p, (*col[p], 255))
    out.save(OUT)
    print(OUT)


if __name__ == '__main__':
    main()
