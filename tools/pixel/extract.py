"""
사용자 기물 원본 → 64×64 격자 도트 (D-087). 결과는 tools/pixel/pieces64.txt (도트 메이커의 정본).

원본(build-res/pieces-small-source.png)은 도트 크기가 일정하지 않은 "픽셀풍" 그림이라, 원본 해상도에 가깝게(1.5px = 1칸)
옮기고 색을 팔레트로 정리한다. 흰 바깥 테두리는 원본의 들쭉날쭉한 띠 대신 검정 외곽선 바깥 2칸으로 다시 그린다.

  python3 -I tools/pixel/extract.py && python3 -I tools/pixel/symmetry.py
      (원본이 바뀌었을 때만. 평소에는 pieces64.txt를 직접 고친다. 대칭 다듬기는 D-092)
"""
import os
from collections import deque

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
SRC = os.path.join(ROOT, 'build-res', 'pieces-small-source.png')
N = 64          # 격자 칸 수
CROP = 96       # 원본에서 기물 하나를 자르는 정사각형 (px) → 1칸 = 1.5px
BASE_Y = 156    # 원본에서 받침 아래(흰 테두리 바깥) 기준선
OUTLINE = 2     # 흰 바깥 테두리 칸 수

BOXES = {
    ('P', 0): (112, 176), ('P', 1): (235, 299), ('N', 0): (363, 435), ('N', 1): (479, 551),
    ('B', 0): (614, 679), ('B', 1): (728, 793), ('R', 0): (850, 914), ('R', 1): (955, 1018),
    ('Q', 0): (1072, 1141), ('Q', 1): (1173, 1245), ('K', 0): (1288, 1350), ('K', 1): (1387, 1449),
}

# 진영별 팔레트 (글자 → 색). 원본에서 잰 값 (D-086)
PAL = {
    0: {'K': (0x0B, 0x0B, 0x0E), 'D': (0x3A, 0x39, 0x3E), 'G': (0x85, 0x84, 0x88), 'S': (0xC5, 0xC3, 0xC3), 'W': (0xF1, 0xEE, 0xEC)},
    1: {'K': (0x0B, 0x0B, 0x0E), 'D': (0x1C, 0x1D, 0x22), 'B': (0x32, 0x34, 0x3D), 'M': (0x48, 0x4A, 0x55), 'H': (0x6E, 0x71, 0x7E), 'L': (0xA8, 0xAB, 0xB8)},
}


def lum(c):
    return (c[0] + c[1] + c[2]) / 3


def nearest(c, pal):
    return min(pal, key=lambda k: sum((a - b) ** 2 for a, b in zip(c, pal[k])))


def body_mask(px, w, h):
    """흰 테두리 안쪽(검정 외곽선 포함) = 기물. 흰 띠의 틈은 1px 닫아서 막는다"""
    white = [[lum(px[x, y]) > 110 for x in range(w)] for y in range(h)]
    sealed = [[any(white[yy][xx] for yy in range(max(0, y - 1), min(h, y + 2)) for xx in range(max(0, x - 1), min(w, x + 2))) for x in range(w)] for y in range(h)]
    out = [[False] * w for _ in range(h)]
    q = deque((y, x) for y in range(h) for x in range(w) if (x in (0, w - 1) or y in (0, h - 1)) and not sealed[y][x])
    while q:
        y, x = q.popleft()
        if out[y][x] or sealed[y][x]:
            continue
        out[y][x] = True
        for yy, xx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
            if 0 <= yy < h and 0 <= xx < w:
                q.append((yy, xx))
    # 막을 때 1px 넓힌 만큼 흰 띠 바로 바깥의 어두운 고리가 남는다 → 흰색이 아닌 이웃으로 2번 넓혀 바깥에 넣는다
    for _ in range(2):
        grow = [(y, x) for y in range(h) for x in range(w) if not out[y][x] and not white[y][x] and any(0 <= y + dy < h and 0 <= x + dx < w and out[y + dy][x + dx] for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)))]
        for y, x in grow:
            out[y][x] = True
    # 바깥에서 4px 안에 있는 흰 픽셀 = 흰 테두리 띠 (몸이 아님)
    dist = [[99] * w for _ in range(h)]
    q = deque()
    for y in range(h):
        for x in range(w):
            if out[y][x]:
                dist[y][x] = 0
                q.append((y, x))
    while q:
        y, x = q.popleft()
        for yy, xx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
            if 0 <= yy < h and 0 <= xx < w and dist[yy][xx] > dist[y][x] + 1:
                dist[yy][xx] = dist[y][x] + 1
                q.append((yy, xx))
    return [[not out[y][x] and not (white[y][x] and dist[y][x] <= 4) for x in range(w)] for y in range(h)]


def clean(grid):
    """원본 잡티 정리: ① 실루엣의 한 칸짜리 혹·구멍 메움 ② 이웃과 하나도 같지 않은 외톨이 점은 이웃의 다수 색으로"""
    n = len(grid)
    nb = lambda j, i: [grid[j + dy][i + dx] for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)) if 0 <= j + dy < n and 0 <= i + dx < n]
    for _ in range(2):
        for j in range(n):
            for i in range(n):
                around = nb(j, i)
                solid = sum(c != '.' for c in around)
                if grid[j][i] == '.' and solid >= 3:
                    grid[j][i] = max(set(c for c in around if c != '.'), key=[c for c in around if c != '.'].count)
                elif grid[j][i] != '.' and solid <= 1:
                    grid[j][i] = '.'
    for j in range(n):
        for i in range(n):
            c = grid[j][i]
            if c == '.':
                continue
            around = [x for x in nb(j, i) if x != '.']
            if around and c not in around:
                grid[j][i] = max(set(around), key=around.count)


K_RING = 3  # 검정 외곽선 두께 (칸) — 원본의 검정 띠 평균


def tidy_outline(grid):
    """외곽선 영역 다듬기 (D-088, 사용자: 검정 + 흰 외곽선 영역의 불필요한 대각선 · 회색 정리):
    ① 실루엣에서 대각선으로만 붙은 칸 · 한 칸짜리 혹을 깎고 오목한 한 칸은 메워 계단을 고르게
    ② 실루엣 가장자리에서 K_RING칸 안쪽까지는 검정으로 (두께 고르게)
    ③ 그 바로 안쪽에서 검정에 둘러싸인 회색 잡티(D·G)는 검정으로"""
    n = len(grid)
    sil = [[grid[j][i] != '.' for i in range(n)] for j in range(n)]
    o4 = ((1, 0), (-1, 0), (0, 1), (0, -1))
    for _ in range(4):
        changed = False
        for j in range(n):
            for i in range(n):
                k = sum(1 for dy, dx in o4 if 0 <= j + dy < n and 0 <= i + dx < n and sil[j + dy][i + dx])
                if sil[j][i] and k <= 1:
                    sil[j][i] = False
                    changed = True
                elif not sil[j][i] and k >= 3:
                    sil[j][i] = True
                    changed = True
        if not changed:
            break
    # 바깥에서의 거리 (8방향 → 대각선 쪽도 같은 두께)
    dist = [[0 if not sil[j][i] else 99 for i in range(n)] for j in range(n)]
    q = deque((j, i) for j in range(n) for i in range(n) if not sil[j][i])
    for j in range(n):
        for i in range(n):
            if sil[j][i] and (j in (0, n - 1) or i in (0, n - 1)):
                dist[j][i] = 1
                q.append((j, i))
    while q:
        j, i = q.popleft()
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                jj, ii = j + dy, i + dx
                if 0 <= jj < n and 0 <= ii < n and dist[jj][ii] > dist[j][i] + 1:
                    dist[jj][ii] = dist[j][i] + 1
                    q.append((jj, ii))
    for j in range(n):
        for i in range(n):
            if not sil[j][i]:
                grid[j][i] = '.'
            elif dist[j][i] <= K_RING:
                grid[j][i] = 'K'
            elif grid[j][i] == '.':
                grid[j][i] = 'K'
    for j in range(n):
        for i in range(n):
            if sil[j][i] and dist[j][i] <= K_RING + 3 and grid[j][i] in 'DG':
                ks = sum(1 for dy, dx in o4 if grid[j + dy][i + dx] == 'K')
                if ks >= 2:
                    grid[j][i] = 'K'


def extract(t, side):
    a, b = BOXES[(t, side)]
    cx = (a + b) / 2
    src = Image.open(SRC).convert('RGB')
    crop = src.crop((round(cx - CROP / 2), BASE_Y - CROP, round(cx + CROP / 2), BASE_Y))
    px = crop.load()
    mask = body_mask(px, CROP, CROP)
    s = CROP / N
    pal = PAL[side]
    grid = [['.'] * N for _ in range(N)]
    for j in range(N):
        for i in range(N):
            x0, x1 = int(i * s), max(int(i * s) + 1, int((i + 1) * s))
            y0, y1 = int(j * s), max(int(j * s) + 1, int((j + 1) * s))
            cells = [(x, y) for y in range(y0, y1) for x in range(x0, x1)]
            inside = [c for c in cells if mask[c[1]][c[0]]]
            if len(inside) * 2 < len(cells):
                continue
            col = tuple(sum(px[c][k] for c in inside) / len(inside) for k in range(3))
            grid[j][i] = nearest(col, pal)
    clean(grid)
    tidy_outline(grid)
    # 흰 바깥 테두리 OUTLINE칸 (네모 팽창)
    body = [[grid[j][i] != '.' for i in range(N)] for j in range(N)]
    for j in range(N):
        for i in range(N):
            if body[j][i]:
                continue
            if any(0 <= j + dy < N and 0 <= i + dx < N and body[j + dy][i + dx] for dy in range(-OUTLINE, OUTLINE + 1) for dx in range(-OUTLINE, OUTLINE + 1)):
                grid[j][i] = 'O'
    return [''.join(r) for r in grid]


def main():
    lines = [
        '# 기물 도트 정본 64×64 (D-087) — tools/pixel/extract.py가 사용자 원본에서 뽑고, 손으로 다듬은 것.',
        '# 도트 메이커(tools/pixel/maker.py)가 이 격자로 배경 없는 PNG를 찍는다. public/pieces/는 손으로 고치지 않는다.',
        '# 글자: . 투명 · O 흰 바깥 테두리 · K 검정 외곽선',
        '#   흰 진영  W 몸 · S 옅은 그늘 · G 그늘 · D 짙은 그늘',
        '#   흑 진영  B 몸 · M 밝은 몸 · H 빛 · L 강한 빛 · D 짙은 그늘',
        '# 블록: [유형 진영] (예: [N 1]) · 이형 전용 그림은 [N:hammer 0] 처럼',
        '',
    ]
    for (t, side) in BOXES:
        lines.append(f'[{t} {side}]')
        lines.extend(extract(t, side))
        lines.append('')
    open(os.path.join(HERE, 'pieces64.txt'), 'w', encoding='utf-8').write('\n'.join(lines))
    print('tools/pixel/pieces64.txt')


if __name__ == '__main__':
    main()
