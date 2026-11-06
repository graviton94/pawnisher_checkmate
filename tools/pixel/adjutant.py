"""
부관 박차 초상 (N-01) 받은 그림 → 56×56 도트 (2026-11-06).
받은 그림은 도트 크기가 섞여 있어 scene-import(격자 찾기)가 맞지 않는다 → 칸마다 가장 많은 색으로 줄인다.
외곽 (사용자: 「검은 외곽선 위 흰 선 최외곽선이 빠진 데 없이 — 얼룩덜룩하다」):
  ① 가장자리와 이어진 어둠만 투명 ② 검은 칸이 바깥과 닿으면 그 바깥 칸을 흰 테로 ③ 흰 테와 바로 닿은 몸 칸은 검은 선으로 → 검정 1 + 흰 1이 끊김 없이 두른다.
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
WHITE, INK = (244, 241, 234), (11, 11, 14)
N4 = [(1, 0), (-1, 0), (0, 1), (0, -1)]
N8 = N4 + [(1, 1), (1, -1), (-1, 1), (-1, -1)]


def main():
    crop = Image.open(SRC).convert('RGB').crop(BOX)
    cs = crop.size[0] / N
    cp = crop.load()
    grid = {}
    for j in range(N):
        for i in range(N):
            c = Counter(tuple(v // 8 * 8 for v in cp[xx, yy]) for yy in range(int(j * cs), int((j + 1) * cs)) for xx in range(int(i * cs), int((i + 1) * cs)))
            grid[(i, j)] = c.most_common(1)[0][0]
    dark = lambda c: sum(c) < 120
    inside = lambda p: 0 <= p[0] < N and 0 <= p[1] < N
    # ① 가장자리와 이어진 어둠 = 바탕
    seen, q = set(), deque([(i, j) for i in range(N) for j in (0, N - 1)] + [(i, j) for j in range(N) for i in (0, N - 1)])
    while q:
        p = q.popleft()
        if p in seen or not inside(p) or not dark(grid[p]):
            continue
        seen.add(p)
        q.extend((p[0] + dx, p[1] + dy) for dx, dy in N4)
    shape = {(i, j) for i in range(N) for j in range(N) if (i, j) not in seen}
    col = {p: (INK if dark(grid[p]) else grid[p]) for p in shape}
    # ② 바깥과 닿은 검은 칸 → 그 바깥에 흰 테
    for a in {(p[0] + dx, p[1] + dy) for p in shape if col[p] == INK for dx, dy in N8}:
        if a not in shape and inside(a):
            col[a] = WHITE
            shape.add(a)
    # 검은 칸과 닿지 않은 바깥 외톨이 흰 칸은 지운다
    shape -= {p for p in shape if col[p] == WHITE and not any((p[0] + dx, p[1] + dy) in shape and col[(p[0] + dx, p[1] + dy)] != WHITE for dx, dy in N8)}
    # ③ 바깥 흰 테와 바로 닿은 몸 칸 → 검은 선
    ring = {p for p in shape if col[p] == WHITE and any((p[0] + dx, p[1] + dy) not in shape for dx, dy in N8)}
    for p in ring:
        for dx, dy in N4:
            b = (p[0] + dx, p[1] + dy)
            if b in shape and b not in ring and col[b] != INK:
                col[b] = INK
    out = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    for p in shape:
        out.putpixel(p, (*col[p], 255))
    out.save(OUT)
    print(OUT)


if __name__ == '__main__':
    main()
