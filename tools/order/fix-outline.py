"""
잘라 온 소품의 테두리 다듬기 (D-057): 자를 때 빠지거나 끊긴 검정·흰 테두리를 다시 두른다.
흰 테두리를 떼고 → 몸통 안 구멍·한 칸 틈을 메우고 → (대칭 소품은 왼쪽 절반을 비추고) → 몸통 가장자리 = 검정, 그 바깥 1도트 = 흰색.
사용: python3 -I tools/order/fix-outline.py <파일.png> [--sym] [--hole RRGGBB]
"""
import sys
from collections import deque

from PIL import Image

INK, RIM = (0x0B, 0x0B, 0x0E, 255), (0xF4, 0xF1, 0xEA, 255)
NB4 = ((1, 0), (-1, 0), (0, 1), (0, -1))

path = sys.argv[1]
sym = '--sym' in sys.argv
hole = tuple(int(sys.argv[sys.argv.index('--hole') + 1][i:i + 2], 16) for i in (0, 2, 4)) + (255,) if '--hole' in sys.argv else None
src = Image.open(path).convert('RGBA')
w, h = src.size[0] + 4, src.size[1] + 4
im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
im.paste(src, (2, 2))
p = im.load()
is_body = lambda c: c[3] > 0 and min(c[:3]) <= 200  # 흰 테두리는 몸통이 아니다


def outside():
    out = [[False] * w for _ in range(h)]
    q = deque([(0, 0)])
    out[0][0] = True
    while q:
        x, y = q.popleft()
        for dx, dy in NB4:
            X, Y = x + dx, y + dy
            if 0 <= X < w and 0 <= Y < h and not out[Y][X] and not is_body(p[X, Y]):
                out[Y][X] = True
                q.append((X, Y))
    return out


# 1) 몸통 안 구멍 메우기
out = outside()
for y in range(h):
    for x in range(w):
        if not out[y][x] and not is_body(p[x, y]):
            p[x, y] = hole or next(p[x + dx, y + dy] for dx, dy in NB4 if is_body(p[x + dx, y + dy]))
# 2) 한 칸 틈 메우기: 위·아래 또는 좌·우가 모두 몸통인 빈칸
for y in range(1, h - 1):
    for x in range(1, w - 1):
        if not is_body(p[x, y]):
            if is_body(p[x, y - 1]) and is_body(p[x, y + 1]):
                p[x, y] = p[x, y - 1]
            elif is_body(p[x - 1, y]) and is_body(p[x + 1, y]):
                p[x, y] = p[x - 1, y]
# 3) 흰 테두리 떼기 + 대칭
for y in range(h):
    for x in range(w):
        if not is_body(p[x, y]):
            p[x, y] = (0, 0, 0, 0)
# 떨어져 나온 부스러기(워터마크·번짐)는 버린다: 가장 큰 덩어리만 남김
seen, best = set(), []
for y in range(h):
    for x in range(w):
        if is_body(p[x, y]) and (x, y) not in seen:
            comp, q = [], deque([(x, y)])
            seen.add((x, y))
            while q:
                cx, cy = q.popleft()
                comp.append((cx, cy))
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        X, Y = cx + dx, cy + dy
                        if 0 <= X < w and 0 <= Y < h and (X, Y) not in seen and is_body(p[X, Y]):
                            seen.add((X, Y))
                            q.append((X, Y))
            if len(comp) > len(best):
                best = comp
keep = set(best)
for y in range(h):
    for x in range(w):
        if (x, y) not in keep:
            p[x, y] = (0, 0, 0, 0)
if sym:
    bb = im.getbbox()
    cx2 = bb[0] + bb[2] - 1  # 가운데의 두 배
    for y in range(h):
        for x in range(bb[0], (cx2 + 1) // 2):
            p[cx2 - x, y] = p[x, y]
# 4) 몸통 가장자리 = 검정, 바깥 1도트 = 흰색
out = outside()
edge = [(x, y) for y in range(h) for x in range(w) if is_body(p[x, y]) and any(out[y + dy][x + dx] for dx, dy in NB4)]
for x, y in edge:
    p[x, y] = INK
rim = [(x, y) for y in range(h) for x in range(w) if out[y][x] and any(0 <= x + dx < w and 0 <= y + dy < h and is_body(p[x + dx, y + dy]) for dx, dy in NB4)]
for x, y in rim:
    p[x, y] = RIM
im.crop(im.getbbox()).save(path)
print(path, im.getbbox())
