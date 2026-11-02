"""
기물 디테일 손질 시안 (D-186): 64칸 정본은 그대로 두고, 그 위에 빛 규칙을 한 번 더 얹은 변형을 만든다.
  · 검은 기물: 몸 안쪽 왼위 가장자리(검정 외곽선 바로 안) 한 칸을 한 단계 밝게 — 테두리 빛(림 라이트). 지금은 몸이 한 덩어리로 뭉친다
  · 흰 기물: 몸 안쪽 오른아래 가장자리 한 칸을 한 단계 어둡게 — 안쪽 그늘(입체감)
  · 왕관 · 보석 · 외곽선 · 흰 테두리는 건드리지 않는다
사용: python3 -I tools/pixel/detail.py sheet <out.png>
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import maker  # noqa: E402

LIGHTER = {'B': 'M', 'M': 'H', 'H': 'L', 'L': 'L', 'G': 'S', 'S': 'W', 'W': 'W'}
DARKER = {'W': 'S', 'S': 'G', 'G': 'G', 'L': 'H', 'H': 'M', 'M': 'B', 'B': 'B'}
BODY_W = set('WSG')
BODY_B = set('BMHL')


def detail(rows, side):
    g = [list(r) for r in rows]
    n = len(g)
    at = lambda x, y: g[y][x] if 0 <= y < n and 0 <= x < len(g[y]) else '.'
    out = [r[:] for r in g]
    body = BODY_B if side == 1 else BODY_W
    for y in range(n):
        for x in range(len(g[y])):
            c = g[y][x]
            if c not in body:
                continue
            if side == 1:
                # 왼위가 외곽선이면 림 라이트 (두 칸 깊이: 바깥 칸은 두 단계, 안 칸은 한 단계)
                if at(x - 1, y) == 'K' or at(x, y - 1) == 'K':
                    out[y][x] = LIGHTER[LIGHTER[c]]
                elif at(x - 2, y) == 'K' or at(x, y - 2) == 'K':
                    out[y][x] = LIGHTER[c]
            else:
                if at(x + 1, y) == 'K' or at(x, y + 1) == 'K':
                    out[y][x] = DARKER[c]
    return [''.join(r) for r in out]


def sheet(path):
    hi = maker.load64()
    keys = [('P', 0), ('N', 0), ('B', 0), ('R', 0), ('Q', 0), ('K', 0), ('P', 1), ('N', 1), ('B', 1), ('R', 1), ('Q', 1), ('K', 1)]
    font = ImageFont.truetype(os.path.join(HERE, '..', '..', 'node_modules', 'galmuri', 'dist', 'Galmuri11-Bold.ttf'), 16)
    TILE, P, Z = 120, 98, 4
    W = 200 + len(keys) * (TILE + 6)
    H = 40 + 2 * (TILE + 10) + 2 * (64 * Z // 2 + 30)
    im = Image.new('RGB', (W, H), (14, 13, 18))
    d = ImageDraw.Draw(im)
    d.text((10, 8), '기물 디테일 시안 — 위 두 줄: 실제 화면 크기(판 칸 120px) · 아래: 2배 확대 (지금 | 손질)', fill=(250, 204, 21), font=font)
    for r, lab in enumerate(('지금', '손질')):
        y = 36 + r * (TILE + 10)
        d.text((10, y + TILE // 2 - 8), lab, fill=(236, 232, 222), font=font)
        for i, k in enumerate(keys):
            rows = hi[k] if r == 0 else detail(hi[k], k[1])
            pc = maker.render64(rows, k[1]).convert('RGBA')
            tile = Image.new('RGBA', (TILE, TILE), (58, 57, 68, 255) if i % 2 == 0 else (47, 46, 54, 255))
            tile.alpha_composite(pc.resize((P, P), Image.NEAREST), ((TILE - P) // 2, 5))
            im.paste(tile.convert('RGB'), (200 + i * (TILE + 6), y))
    y0 = 36 + 2 * (TILE + 10) + 10
    zs = 64 * Z // 2
    for r, lab in enumerate(('지금 (2배)', '손질 (2배)')):
        y = y0 + r * (zs + 30)
        d.text((10, y + zs // 2 - 8), lab, fill=(236, 232, 222), font=font)
        for i, k in enumerate(keys[6:]):
            rows = hi[k] if r == 0 else detail(hi[k], k[1])
            pc = maker.render64(rows, k[1]).convert('RGBA').resize((zs, zs), Image.NEAREST)
            bg = Image.new('RGBA', (zs, zs), (58, 57, 68, 255))
            bg.alpha_composite(pc)
            im.paste(bg.convert('RGB'), (200 + i * (zs + 8), y))
    im.save(path)
    print(path, im.size)


if __name__ == '__main__':
    sheet(sys.argv[2])
