"""
판 밖·소품 도트를 직접 찍는다 (아이콘은 tools/pixelize-icons.cjs — 공개 픽토그램 도트화) (D-047: 정말 못 그리겠는 것만 제미나이에 맡긴다).
도트 1개 = 1px로 저장하고 화면에서 정수배로 키운다. 색은 발주서 팔레트 + 청록 그늘.

출력:
  public/ui/board/  vent-*.png (증기 분출구)
  public/ui/props/  지형 소품 5종 (기물처럼 검정 + 흰 테두리 자동)
  public/ui/hud/    종이 왕관 · 태엽 3종 · 점령 눈금 (D-050: 단순한 덩어리 + 납작한 색 + 강조 1개)
  public/ui/frames/ UI 9-slice 프레임 6종 (회색 4단계 — 색은 코드가)

사용: python3 -I tools/draw-assets.py
"""
import math
import os

from PIL import Image

C = {
    'k': (0x0B, 0x0B, 0x0E), 'i': (0x16, 0x14, 0x1C), 'd': (0x2F, 0x2E, 0x36), 'l': (0x56, 0x54, 0x5E),
    'g': (0x8A, 0x87, 0x94), 'h': (0xC8, 0xC8, 0xC8), 'w': (0xF4, 0xF1, 0xEA), 'b': (0x8C, 0x62, 0x39),
    'y': (0xC8, 0x9B, 0x3C), 'o': (0xFA, 0xCC, 0x15), 'r': (0x7A, 0x12, 0x18), 'R': (0xE5, 0x26, 0x2F),
    'c': (0x38, 0xBD, 0xF8), 'C': (0x1E, 0x6E, 0x94), 's': (0xBF, 0xEF, 0xFF), '#': (0xFF, 0xFF, 0xFF),
    '1': (0x1A, 0x1A, 0x1A), '2': (0x4A, 0x4A, 0x4A), '3': (0x8A, 0x8A, 0x8A), '4': (0xD0, 0xD0, 0xD0),
}


def art(rows):
    """글자 그림 → 도트. 줄 길이가 달라도 오른쪽을 비워 맞춘다"""
    w = max(len(r) for r in rows)
    im = Image.new('RGBA', (w, len(rows)), (0, 0, 0, 0))
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch != '.':
                im.putpixel((x, y), C[ch] + (255,))
    return im


def outline(im, inner='k', outer='w'):
    """기물과 같은 테두리: 그림 바로 바깥 1도트 검정, 그 바깥 1도트 흰색 (4방향 이웃)"""
    def grow(src, color):
        w, h = src.size
        out = Image.new('RGBA', (w + 2, h + 2), (0, 0, 0, 0))
        out.paste(src, (1, 1))
        px = out.load()
        add = []
        for y in range(h + 2):
            for x in range(w + 2):
                if px[x, y][3]:
                    continue
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    X, Y = x + dx, y + dy
                    if 0 <= X < w + 2 and 0 <= Y < h + 2 and px[X, Y][3]:
                        add.append((x, y))
                        break
        for x, y in add:
            px[x, y] = C[color] + (255,)
        return out

    return grow(grow(im, inner), outer)


def mirror(im):
    """좌우 대칭: 왼쪽 절반을 오른쪽에 비춘다"""
    w, h = im.size
    px = im.load()
    for y in range(h):
        for x in range(w // 2):
            px[w - 1 - x, y] = px[x, y]
    return im


def save(im, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path)


# ---------------- 증기 분출구 (요충지) 20×20, 칸 위에 덧그림 ----------------

def vent(state):
    im = Image.new('RGBA', (20, 20), (0, 0, 0, 0))
    px = im.load()
    c = 9.5
    for y in range(20):
        for x in range(20):
            dx = x - c + (2 if state == 'opening' and x < 10 else -2 if state == 'opening' else 0)
            d = math.hypot(dx, y - c)
            if state == 'opening' and 9 <= x <= 10:
                if math.hypot(x - c, y - c) <= 6.5:
                    px[x, y] = C['k'] + (255,)
                continue
            if 5.4 <= d <= 7.0:
                px[x, y] = C['b' if (dx + (y - c)) > 2 else 'y'] + (255,)
            elif d < 5.4:
                if state == 'open':
                    px[x, y] = C['k'] + (255,)
                elif abs(dx) < 0.6 or abs(y - c) < 0.6:
                    px[x, y] = C['l'] + (255,)
                else:
                    px[x, y] = C['i'] + (255,)
    # 압력계: 오른쪽 위 3×3
    for x, y, ch in ((15, 2, 'h'), (16, 2, 'h'), (17, 2, 'h'), (15, 3, 'h'), (16, 3, 'R'), (17, 3, 'h'), (15, 4, 'h'), (16, 4, 'h'), (17, 4, 'h')):
        px[x, y] = C[ch] + (255,)
    if state == 'opening':
        for x, y in ((9, 2), (10, 1), (9, 0)):
            px[x, y] = C['s'] + (255,)
    return im


STEAM = art([
    '....ss....',
    '..sswws...',
    '.swwwwws..',
    '..swwss...',
    '...ss.ss..',
    '..swws.s..',
    '.swwwws...',
    '..swws....',
    '...sss....',
    '....s.....',
])

# ---------------- 지형 소품 (기물처럼 테두리 자동) ----------------
# D-050: 단순한 덩어리 + 납작한 색 1~2개 + 강조 1개. 검정 테두리·흰 테두리는 outline()이 두른다. 모두 좌우 대칭.

PROPS = {
    # 고철 더미: 회색 더미 위에 톱니 하나 (가운데 구멍)
    'scrap': [
        '.....g.g.....',
        '....ggggg....',
        '...gggdggg...',
        '....ggggg....',
        '..llllgllll..',
        '.lllllllllll.',
        'lllllllllllll',
    ],
    # 승강판: 밝은 철판 + 기둥 + 받침
    'lift': [
        'hhhhhhhhhhhhh',
        'hhhhhhhhhhhhh',
        '.....lll.....',
        '.....lll.....',
        '.....lll.....',
        '...lllllll...',
        '..lllllllll..',
    ],
    # 방패벽: 철판 방패 + 가운데 이음줄 하나
    'shield': [
        'lllllllllll',
        'lllllglllll',
        'lllllglllll',
        'lllllglllll',
        '.llllgllll.',
        '..lllglll..',
        '...llgll...',
        '....lgl....',
        '.....g.....',
    ],
    # 덫: 가시 넷 + 붉은 띠 (위험 = 붉은색)
    'trap': [
        '.h...h...h...h.',
        'hhh.hhh.hhh.hhh',
        'RRRRRRRRRRRRRRR',
        'lllllllllllllll',
    ],
    # 나사 상자: 판지 상자 + 앞면 나사 하나
    'screwbox': [
        'yyyyyyyyyyy',
        'bbbbbbbbbbb',
        'bbbbhhhbbbb',
        'bbbbbhbbbbb',
        'bbbbbhbbbbb',
        'bbbbbbbbbbb',
    ],
}

# ---------------- 주인공·HUD ----------------

# 종이 왕관 (D-060·D-061): 아주 단순한 왕관 아이콘 화풍 — 뾰족 셋 + 몸통 + 한 줄 틈(테두리가 검정 선으로 메운다) + 띠.
# 킹은 다른 기물보다 커도 된다 (사용자) → 몸통 9도트. 폰에 씌울 땐 그림 자체를 기울인 판을 쓴다.
CROWN = [
    'y...y...y',
    'yy.yyy.yy',
    'yyyyyyyyy',
    'yyyyyyyyb',
    'yyyyyyyyb',
    '.........',
    'yyyyyyyyb',
]


def crown_tilted(deg, k=1.0):
    """기운 왕관: 왕관 모양(다각형)을 돌린 뒤 도트 칸 가운데로 다시 찍는다 — 그림을 돌리면 뾰족·틈이 깨진다.
    몸통(뾰족 셋 + 몸통) · 띠 두 조각, 오른쪽 끝 한 도트는 그늘"""
    body = [(0, -2), (1, -2), (3.5, 1), (5, -2.6), (6, -2.6), (7.5, 1), (10, -2), (11, -2), (11, 3), (0, 3)]
    band = [(0, 4), (11, 4), (11, 5.6), (0, 5.6)]
    body = [(x * k, y * k) for x, y in body]
    band = [(x * k, y * k) for x, y in band]
    cx, cy = 5.5 * k, 1.5 * k
    t = math.radians(deg)
    ct, st = math.cos(t), math.sin(t)

    def inside(poly, x, y):
        hit = False
        for (x1, y1), (x2, y2) in zip(poly, poly[1:] + poly[:1]):
            if (y1 > y) != (y2 > y) and x < x1 + (y - y1) * (x2 - x1) / (y2 - y1):
                hit = not hit
        return hit

    n = 30
    im = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    for Y in range(n):
        for X in range(n):
            # 화면 칸 가운데 → 왕관 좌표 (거꾸로 돌림)
            dx, dy = X + 0.5 - n / 2, Y + 0.5 - n / 2
            lx, ly = cx + dx * ct + dy * st, cy - dx * st + dy * ct
            if inside(body, lx, ly) or inside(band, lx, ly):
                im.putpixel((X, Y), C['b' if lx > 10.2 * k else 'y'] + (255,))
    return im.crop(im.getbbox())


# 태엽 감개 (D-058·D-059): 제미나이 I 시트의 디자인(큰 구멍 뚫린 고리 날개 둘 — 구멍이 작으면 하트처럼 보였다 + 가운데 청록 축 + 이 달린 막대)을
# 우리 격자에 옮겨 찍음 (날개는 대칭, 막대는 곧고 길게 · 이는 한쪽만 — 진짜 열쇠처럼). 제미나이 원본은 두 배 해상도·막대 치우침이라 그대로 못 씀 (build-res/order/I.png).
KEY = [
    '.yyy....yyy.',
    'yykky..ykkyy',
    'ykkkyooykkky',
    'yykkyooykkyy',
    'yyyyyyyyyyyb',
    '.....yb.....',
    '.....yb.....',
    '.....yb.....',
    '....yyb.....',
    '.....yb.....',
    '....yyb.....',
    '.....yb.....',
]

PIP = art(['.h.', 'hhh', '.h.'])

# ---------------- UI 프레임 (회색 4단계, 9-slice) ----------------

def frame(kind):
    w, h = (18, 24) if kind in ('card-iron', 'card-paper') else (24, 24)
    if kind == 'button':
        h = 24
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    px = im.load()
    body_h = h - 3 if kind == 'button' else h
    top = 2 if kind == 'button-pressed' else 0
    for y in range(h):
        for x in range(w):
            yy = y - top
            if kind == 'button' and y >= body_h:
                px[x, y] = C['1'] + (255,)  # 아래 단단한 그림자
                continue
            if yy < 0 or yy >= body_h - (2 if kind == 'button-pressed' else 0):
                continue
            edge = min(x, yy, w - 1 - x, body_h - 1 - yy)
            if kind == 'slot':
                col = '1' if edge == 0 else ('1' if (x == 1 or yy == 1) and edge == 1 else '3' if edge == 1 else '2')
            elif edge == 0:
                col = '1'
            elif edge == 1:
                col = '4' if (x == 1 or yy == 1) else '1'
            elif edge == 2:
                col = '3'
            else:
                col = '2'
            if kind == 'card-paper' and yy >= body_h - 2 and (x % 3 == 0):
                continue  # 찢어진 아랫단
            px[x, y] = C[col] + (255,)
    if kind in ('panel', 'card-iron'):
        for rx, ry in ((3, 3), (w - 5, 3), (3, h - 5), (w - 5, h - 5)):
            for dx, dy in ((0, 0), (1, 0), (0, 1)):
                px[rx + dx, ry + dy] = C['4'] + (255,)
            px[rx + 1, ry + 1] = C['1'] + (255,)
    if kind in ('card-iron', 'card-paper'):
        for hx in (5, 8, 11):
            px[hx, 3] = C['1'] + (255,)
            px[hx + 1, 3] = C['1'] + (255,)
    return im


def recolor(rows, table):
    return [''.join(table.get(ch, ch) for ch in r) for r in rows]


for st in ('closed', 'opening', 'open'):
    save(vent(st), f'public/ui/board/vent-{st}.png')
save(STEAM, 'public/ui/board/vent-steam.png')
for name, rows in PROPS.items():
    continue  # D-056·D-057: 지형 소품 5종은 모두 제미나이 그림을 잘라 쓴다 (tools/order/) — 아래 코드 그림은 쓰지 않음
    save(outline(mirror(art(rows))), f'public/ui/props/{name}.png')


save(outline(art(CROWN)), 'public/ui/hud/paper-crown.png')
save(outline(crown_tilted(15)), 'public/ui/hud/paper-crown-tilt.png')  # 시계 방향 15도
full = recolor(KEY, {'o': 'c'})  # 가득 찬 태엽: 축이 청록 (내 것 = 청록)
save(outline(art(full)), 'public/ui/hud/key-full.png')
save(outline(art(recolor(KEY, {'y': 'l', 'b': 'd', 'o': 'd'}))), 'public/ui/hud/key-spent.png')
save(outline(art(full), 'k', 'o'), 'public/ui/hud/key-bonus.png')
save(PIP, 'public/ui/hud/pip.png')
for kind in ('panel', 'button', 'button-pressed', 'card-iron', 'card-paper', 'slot'):
    save(frame(kind), f'public/ui/frames/{kind}.png')
print('ok')
