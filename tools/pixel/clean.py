"""
기물 속 정리 (D-186): 64칸 정본의 외곽선(K) · 흰 테두리(O) · 왕관 · 안쪽 검정 선은 그대로 두고, 몸 속 명암만 다듬는다.
원본을 옮기며 남은 번짐 때문에 명암이 얼룩덜룩하고(작은 점 · 들쭉날쭉한 덩어리) 대칭 기물의 속이 비대칭이었다.
  ① 작은 섬 지우기 — 같은 색으로 이어진 덩어리가 min_island칸 미만이면 둘레에서 가장 많은 몸 색으로
  ② 다수결 다듬기 — 몸 칸마다 3×3 이웃의 몸 색 다수결 (두 번), 경계가 매끈해진다
  ③ 대칭 — P · R · Q · K는 왼쪽 반의 몸 명암을 오른쪽에 비춘다 (외곽은 이미 대칭, D-092)
사용: python3 -I tools/pixel/clean.py sheet <out.png>   |   apply   (pieces64.txt에 쓰기 — 허락 뒤)
"""
import os
import sys
from collections import Counter

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import maker  # noqa: E402

BODY = set('WSGBMHL')
SYM = {'P', 'R', 'Q', 'K'}


def islands(g, min_island):
    n, w = len(g), len(g[0])
    seen = [[False] * w for _ in range(n)]
    for y in range(n):
        for x in range(w):
            if seen[y][x] or g[y][x] not in BODY:
                continue
            c = g[y][x]
            stack, comp = [(x, y)], []
            seen[y][x] = True
            while stack:
                cx, cy = stack.pop()
                comp.append((cx, cy))
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = cx + dx, cy + dy
                    if 0 <= nx < w and 0 <= ny < n and not seen[ny][nx] and g[ny][nx] == c:
                        seen[ny][nx] = True
                        stack.append((nx, ny))
            if len(comp) < min_island:
                ring = Counter()
                for cx, cy in comp:
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        nx, ny = cx + dx, cy + dy
                        if 0 <= nx < w and 0 <= ny < n and g[ny][nx] in BODY and g[ny][nx] != c:
                            ring[g[ny][nx]] += 1
                if ring:
                    nc = ring.most_common(1)[0][0]
                    for cx, cy in comp:
                        g[cy][cx] = nc


def majority(g):
    n, w = len(g), len(g[0])
    out = [r[:] for r in g]
    for y in range(n):
        for x in range(w):
            if g[y][x] not in BODY:
                continue
            cnt = Counter()
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < n and g[ny][nx] in BODY:
                        cnt[g[ny][nx]] += 1
            c, k = cnt.most_common(1)[0]
            if k >= 5 and c != g[y][x]:
                out[y][x] = c
    return out


# 검은 기물의 오른쪽 반은 한 단계 어둡게 비춘다 — 그대로 비추면 빛이 양쪽에 생겨 얼굴처럼 보인다 (빛은 왼쪽 위에서)
SHADE_R = {'L': 'M', 'H': 'M', 'M': 'B', 'B': 'B'}


def mirror_body(g, side):
    """몸 칸끼리만 왼쪽 → 오른쪽으로 비춘다 (외곽 · 선 · 왕관은 손대지 않음). 대칭축은 몸이 차지한 열의 가운데.
    흰 기물은 그대로(명암 띠), 검은 기물은 오른쪽을 한 단계 어둡게"""
    xs = [x for r in g for x, c in enumerate(r) if c in BODY or c == 'K']
    lo, hi = min(xs), max(xs)
    for r in g:
        for x in range(len(r)):
            mx = lo + hi - x
            if x < mx and 0 <= mx < len(r) and r[x] in BODY and r[mx] in BODY:
                r[mx] = SHADE_R.get(r[x], r[x]) if side == 1 else r[x]


def clean(rows, name, side=0, min_island=5):
    g = [list(r) for r in rows]
    islands(g, min_island)
    g = majority(g)
    g = majority(g)
    islands(g, min_island)
    if name in SYM:
        mirror_body(g, side)
    return [''.join(r) for r in g]


KEYS = [('P', 0), ('N', 0), ('B', 0), ('R', 0), ('Q', 0), ('K', 0), ('P', 1), ('N', 1), ('B', 1), ('R', 1), ('Q', 1), ('K', 1)]


def sheet(path):
    hi = maker.load64()
    font = ImageFont.truetype(os.path.join(HERE, '..', '..', 'node_modules', 'galmuri', 'dist', 'Galmuri11-Bold.ttf'), 18)
    Z = 4
    cs = 64 * Z
    W = 120 + 6 * (cs + 10)
    H = 40 + 4 * (cs + 14)
    im = Image.new('RGB', (W, H), (14, 13, 18))
    d = ImageDraw.Draw(im)
    d.text((10, 8), '기물 속 정리 — 위: 지금 · 아래: 정리(작은 점 · 얼룩 다듬기 · 대칭 기물은 속도 대칭)  4배', fill=(250, 204, 21), font=font)
    for half in (0, 1):
        for r, lab in enumerate(('지금', '정리')):
            y = 40 + (half * 2 + r) * (cs + 14)
            d.text((10, y + cs // 2 - 9), lab, fill=(236, 232, 222), font=font)
            for i, k in enumerate(KEYS[half * 6:half * 6 + 6]):
                rows = hi[k] if r == 0 else clean(hi[k], k[0], k[1])
                pc = maker.render64(rows, k[1]).convert('RGBA').resize((cs, cs), Image.NEAREST)
                bg = Image.new('RGBA', (cs, cs), (58, 57, 68, 255))
                bg.alpha_composite(pc)
                im.paste(bg.convert('RGB'), (120 + i * (cs + 10), y))
    im.save(path)
    print(path, im.size)


def apply():
    """정리한 몸 명암을 pieces64.txt 정본에 쓴다 (사용자 허락 뒤). 이형 · 옛 그림([X:...])은 건드리지 않는다"""
    path = os.path.join(HERE, 'pieces64.txt')
    hi = maker.load64()
    lines = open(path, encoding='utf-8').read().split('\n')
    out, skip = [], False
    for ln in lines:
        if ln.startswith('['):
            name, side = ln.strip()[1:-1].split()
            key = (name, int(side))
            skip = key in KEYS
            out.append(ln)
            if skip:
                out += clean(hi[key], name, key[1])
            continue
        if skip and ln and not ln.startswith('#'):
            continue
        out.append(ln)
    open(path, 'w', encoding='utf-8').write('\n'.join(out))
    print('pieces64.txt 몸 명암 정리 — 다음: python3 -I tools/pixel/maker.py export')


if __name__ == '__main__':
    apply() if sys.argv[1] == 'apply' else sheet(sys.argv[2])
