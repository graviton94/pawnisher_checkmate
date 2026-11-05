"""
이형 기물 4종 (PC-01 · 02 · 03 · 05, 2026-11-05 사용자: "ㅇㅇ ㄱ") — 기본 흑 킹 · 룩 64칸 격자(사용자 원본, D-086) 위에
받은 그림(build-res/order/PC-*)의 알아보는 특징 하나씩만 단색 도트로 얹는다. 실루엣 · 흰 테 두께(2칸)는 기본 기물과 같다.
  [K:plate 1]    철갑 반장  — 이음매 셋 + 리벳 + 쇳물 금 (F · Q)
  [K:assembly 1] 조립 반장  — 양옆 황동 집게 팔 + 가슴 톱니 + 바퀴 받침
  [K:thorns 1]   출하 반장  — 외곽을 따라 붉은 가시
  [R:shield 1]   방패 룩    — 가운데 리벳 철판 + 가로 홈 셋
사용: python3 -I tools/pixel/boss_variants.py  → tools/pixel/pieces64.txt의 해당 블록을 새로 쓴다 (다시 돌려도 같은 결과)
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import maker  # noqa: E402

PATH = os.path.join(HERE, 'pieces64.txt')
INNER = set('BMHLD')


def grid_of(rows):
    return [list(r) for r in rows]


def body(g, x, y):
    return 0 <= y < len(g) and 0 <= x < len(g[0]) and g[y][x] not in '.O'


def put(g, x, y, ch):
    if 0 <= y < len(g) and 0 <= x < len(g[0]):
        g[y][x] = ch


def inner_put(g, x, y, ch):
    """몸 안쪽(외곽선 K 제외)에만 칠한다"""
    if 0 <= y < len(g) and 0 <= x < len(g[0]) and g[y][x] in INNER:
        g[y][x] = ch


def rim(g):
    """흰 바깥 테를 다시 두른다: 몸에서 체비쇼프 거리 2 이내 (기본 흑 기물과 똑같이 나온다 — 검증함)"""
    n, w = len(g), len(g[0])
    cells = {(x, y) for y in range(n) for x in range(w) if g[y][x] not in '.O'}
    for y in range(n):
        for x in range(w):
            if (x, y) in cells:
                continue
            near = any((x + dx, y + dy) in cells for dy in range(-2, 3) for dx in range(-2, 3))
            g[y][x] = 'O' if near else '.'
    return g


def crack(g, pts):
    """쇳물 금: 금 F, 오른쪽 · 아래 한 칸은 식은 주황 Q"""
    for x, y in pts:
        inner_put(g, x, y, 'F')
    for x, y in pts:
        if g[y][x] == 'F':
            inner_put(g, x + 1, y, 'Q')


def plate(base):
    g = grid_of(base)
    w = len(g[0])
    for sy in (27, 41, 52):
        for x in range(w):
            if g[sy][x] in INNER:
                g[sy][x] = 'K'
                inner_put(g, x, sy - 1, 'H')
    for ry, xs in ((29, (22, 28, 37, 43)), (43, (26, 32, 38)), (54, (22, 28, 37, 43))):
        for x in xs:
            inner_put(g, x, ry, 'L')
            inner_put(g, x + 1, ry, 'H')
            inner_put(g, x, ry + 1, 'H')
            inner_put(g, x + 1, ry + 1, 'K')
    crack(g, [(21, 23), (22, 24), (22, 25), (23, 26), (23, 28), (24, 29)])
    crack(g, [(41, 22), (40, 23), (40, 24), (41, 25), (41, 26)])
    crack(g, [(33, 37), (34, 38), (34, 39), (33, 40)])
    crack(g, [(30, 48), (31, 49), (31, 50), (30, 51), (31, 53), (32, 54)])
    return rim(g)


def assembly(base):
    g = grid_of(base)

    def arm(mx):
        # mx(x): 왼쪽 팔 좌표를 오른쪽으로 비춘다
        X = lambda x: mx(x)
        # 어깨 → 바깥으로 뻗는 팔 (y 25..28), 바깥 끝에서 아래로 (x 5..8, y 25..37)
        for y in range(24, 30):
            for x in range(9, 15):
                put(g, X(x), y, 'K' if y in (24, 29) else ('A' if y == 28 else 'U'))
        for y in range(24, 37):
            for x in range(4, 10):
                put(g, X(x), y, 'K' if x in (4, 9) or y in (24, 36) else ('A' if x == 8 else 'U'))
        # 관절 리벳
        # 집게: 아래로 벌린 두 날 (y 38..44)
        # 집게 두 날: 바깥으로 벌어졌다가 안으로 오므린 C자 (검은 테 + 황동)
        prong = ['KKKK.KKKK', 'KUUK.KUUK', 'KUK...KUK', 'KUK...KUK', 'KUUK.KUUK', '.KKK.KKK.']
        for j, row in enumerate(prong):
            for i, ch in enumerate(row):
                if ch != '.':
                    put(g, X(3 + i), 37 + j, ch)
        put(g, X(6), 31, 'Y')

    arm(lambda x: x)
    arm(lambda x: 64 - x)
    # 가슴 톱니
    gear = ['.U.U.', 'UUUUU', 'UUKUU', 'UUUUU', '.U.U.']
    for j, row in enumerate(gear):
        for i, ch in enumerate(row):
            if ch != '.':
                inner_put(g, 30 + i, 29 + j, ch if ch == 'K' else ('Y' if (i, j) == (1, 1) else 'U'))
    # 바퀴 받침 (받침 몸 줄에 바퀴 넷)
    for x in (21, 27, 34, 40):
        for dx, dy, ch in ((0, 0, 'K'), (1, 0, 'K'), (0, 1, 'K'), (1, 1, 'K'), (-1, 0, 'H'), (2, 0, 'H'), (-1, 1, 'H'), (2, 1, 'H'), (0, -1, 'H'), (1, -1, 'H'), (0, 2, 'H'), (1, 2, 'H')):
            inner_put(g, x + dx, 51 + dy, ch)
    return rim(g)


def thorns(base):
    g = grid_of(base)
    w = len(g[0])

    def edge(y, left):
        xs = [x for x in range(w) if body(g, x, y)]
        return (min(xs), -1) if left else (max(xs), 1)

    def spike(y, left, n=6):
        """쇠 가시: 검은 테 + 쇠 몸, 끝 두 칸은 진홍 (받은 그림처럼 끝만 붉다)"""
        x0, s = edge(y, left)
        half = [2, 2, 2, 1, 1, 0][:n]
        for k, h in enumerate(half, start=1):
            tip = k >= n - 1
            for dy in range(-h, h + 1):
                border = abs(dy) == h
                ch = ('X' if dy > 0 else 'R') if tip else ('K' if border else 'M')
                put(g, x0 + s * k, y + dy, ch)

    for y in (23, 31, 42, 52):
        spike(y, True)
        spike(y, False)
    # 왕관 어깨에서 위로 솟는 가시 둘
    for x in (25, 39):
        top = min(y for y in range(len(g)) if body(g, x, y))
        for k, h in enumerate([2, 1, 1, 0], start=1):
            for dx in range(-h, h + 1):
                tip = k >= 3
                put(g, x + dx, top - k, ('X' if dx > 0 else 'R') if tip else ('K' if abs(dx) == h else 'M'))
    # 가운데 세로 홈 (받은 그림의 갑옷 홈)
    for y in range(37, 45):
        inner_put(g, 32, y, 'K')
        inner_put(g, 33, y, 'H')
    return rim(g)


def shield(base):
    g = grid_of(base)
    x0, x1, y0, y1 = 20, 45, 31, 45
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if y in (y0, y1) or x in (x0, x1):
                put(g, x, y, 'K')
            elif y == y0 + 1 or x == x0 + 1:
                put(g, x, y, 'L')
            elif y == y1 - 1 or x == x1 - 1:
                put(g, x, y, 'M')
            else:
                put(g, x, y, 'H')
    for rx, ry in ((x0 + 3, y0 + 3), (x1 - 4, y0 + 3), (x0 + 3, y1 - 4), (x1 - 4, y1 - 4)):
        put(g, rx, ry, 'L')
        put(g, rx + 1, ry, 'H')
        put(g, rx, ry + 1, 'H')
        put(g, rx + 1, ry + 1, 'K')
    for sy in (35, 38, 41):
        for x in range(x0 + 6, x1 - 5):
            put(g, x, sy, 'K')
            put(g, x, sy + 1, 'B')
    return rim(g)


def main():
    hi = maker.load64()
    out = {
        'K:plate 1': plate(hi[('K', 1)]),
        'K:assembly 1': assembly(hi[('K', 1)]),
        'K:thorns 1': thorns(hi[('K', 1)]),
        'R:shield 1': shield(hi[('R', 1)]),
    }
    # 기존 같은 이름 블록은 지우고 끝에 새로 쓴다
    lines = open(PATH, encoding='utf-8').read().split('\n')
    keep, skip = [], False
    for ln in lines:
        if ln.startswith('['):
            skip = ln.strip()[1:-1] in out
        if not skip:
            keep.append(ln)
    text = '\n'.join(keep).rstrip('\n') + '\n'
    for name, g in out.items():
        text += f'[{name}]\n' + '\n'.join(''.join(r) for r in g) + '\n'
    open(PATH, 'w', encoding='utf-8').write(text)
    print('pieces64.txt:', ', '.join(out))


if __name__ == '__main__':
    main()
