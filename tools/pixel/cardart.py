"""
카드 템플릿 2차 (D-367, 사용자: 「슬더스 · 발라트로 · 하스스톤 같은 유명 카드 디자인을 레퍼런스로 — 카드가 가장 매력적인 에셋이어야」).
레퍼런스 문법: 아치형 큰 그림 창(카드의 절반) · 그림과 설명 사이를 가로지르는 이름 리본(등급 색, 틀 밖으로 꼬리) ·
양 끝이 말린 두루마리 설명지 · 장식 모서리와 구슬 테 · 왼쪽 위 비용 깃발 · 종류 판 · 아래 보석 소켓.
우리 세계(주물 공장)로 옮김: 장식 = 황동 톱니 · 리벳, 그림 창 = 용광로 아치 문(명령) · 팔각 원판(부품) · 방패 초상(분대원).
  src/assets/ui/cards/{cmd,part,crew}-{common,rare,gold}.png   96×136 템플릿 (글 · 그림은 게임이 얹는다)
  src/assets/ui/cards/back.png                                 96×136 뒷면
레이아웃(도트)은 아래 LAYOUT — CSS가 같은 비율(%)로 글을 얹는다.
사용: python3 -I tools/pixel/cardart.py [미리보기.png]
"""
import math
import os
import sys

from PIL import Image

OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'assets', 'ui', 'cards')
W, H = 96, 142
# 틀 밖 여백 (리본 꼬리 · 비용 톱니 · 배지가 튀어나온다)
OX, OY = 8, 8
CW, CH = W + 2 * OX, H + 2 * OY
INK = '#0b0b0e'


def hx(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) + (255,)


# 틀 금속 (그늘2 그늘1 바탕 빛1 빛2 강조) — 등급
FRAME = {
    'common': ['#24232b', '#3a3942', '#55535f', '#757380', '#9a98a4', '#c6c4ce'],
    'rare': ['#3a2408', '#6a4612', '#9c6a26', '#c48c36', '#e8b452', '#fff0c0'],
    'gold': ['#5a3a06', '#9a6c0c', '#d4a024', '#f0c848', '#ffe27a', '#fffbe0'],
}
# 리본 색 (등급) — 일반 강철 · 희귀 청록 · 황금 진홍(금 테와 대비)
RIBBON = {
    'common': ['#2a2c36', '#3e4250', '#5a6072', '#7e869a', '#a8b0c2'],
    'rare': ['#0e3a44', '#16586a', '#227e92', '#36a6b8', '#7cd6e0'],
    'gold': ['#4a0c14', '#7a1622', '#a8222e', '#d23a3a', '#f07a6a'],
}
BRASS = ['#4a3008', '#7a5414', '#a8782a', '#d4a24a', '#f4d27a', '#fff2c0']
PLATE = ['#121116', '#1a1920', '#23222a', '#2e2d36']
PAPER = ['#8a7a5a', '#b8a882', '#d8ccae', '#e8e0cc', '#f4eedc']
MASKS = {}
LAYOUT = dict(art=(12, 12, 84, 54), ribbon=(4, 51, 92, 62), type=(30, 70, 66, 76), scroll=(10, 67, 86, 132), gem=(44, 132, 52, 140), cost=(2, 0, 18, 22))


class P:
    def __init__(self):
        self.im = Image.new('RGBA', (CW, CH), (0, 0, 0, 0))

    def p(self, x, y, c):
        x, y = x + OX, y + OY
        if 0 <= x < CW and 0 <= y < CH:
            self.im.putpixel((x, y), hx(c) if isinstance(c, str) else c)

    def r(self, x0, y0, x1, y1, c):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.p(x, y, c)

    def get(self, x, y):
        x, y = x + OX, y + OY
        return self.im.getpixel((x, y)) if 0 <= x < CW and 0 <= y < CH else (0, 0, 0, 0)


def frame(px, m):
    """바깥 틀: 검은 선 · 금속 띠 4(빛 왼쪽 위) · 검은 선 · 짙은 판 · 구슬 테(2도트마다 리벳)"""
    px.r(0, 0, W - 1, H - 1, INK)
    px.r(1, 1, W - 2, H - 2, m[2])
    for i in range(1, W - 1):
        px.p(i, 1, m[4]); px.p(i, 2, m[3]); px.p(i, H - 2, m[0]); px.p(i, H - 3, m[1])
    for j in range(1, H - 1):
        px.p(1, j, m[4]); px.p(2, j, m[3]); px.p(W - 2, j, m[0]); px.p(W - 3, j, m[1])
    px.p(1, 1, m[5])
    px.r(5, 5, W - 6, H - 6, INK)
    px.r(6, 6, W - 7, H - 7, PLATE[1])
    # 판 무늬: 아주 옅은 사선 도트
    for y in range(6, H - 6):
        for x in range(6, W - 6):
            if (x * 3 + y) % 7 == 0:
                px.p(x, y, PLATE[2])
    # 구슬 테 (판 가장자리 안쪽 1도트, 3도트마다)
    for x in range(8, W - 8, 3):
        px.p(x, 7, m[3]); px.p(x, H - 8, m[2])
    for y in range(8, H - 8, 3):
        px.p(7, y, m[3]); px.p(W - 8, y, m[2])


def gear_corner(px, cx, cy, sx, sy, m):
    """모서리 장식: 4분의 1 톱니 + 리벳 (sx, sy = 방향)"""
    for dy in range(0, 9):
        for dx in range(0, 9):
            d = math.hypot(dx, dy)
            a = math.atan2(dy, dx)
            tooth = 7.2 + (1.3 if math.cos(a * 8) > 0.2 else 0)
            x, y = cx + sx * dx, cy + sy * dy
            if 3.2 <= d <= tooth:
                px.p(x, y, m[4] if (dx + dy) < 6 else m[3] if d < 6 else m[2])
            elif d < 3.2:
                px.p(x, y, m[1])
    for dy in range(0, 10):
        for dx in range(0, 10):
            x, y = cx + sx * dx, cy + sy * dy
            if px.get(x, y)[3] and any(px.get(x + ax, y + ay) == hx(PLATE[1]) or px.get(x + ax, y + ay) == hx(PLATE[2]) for ax, ay in ((1, 0), (-1, 0), (0, 1), (0, -1)) if 0 <= x + ax < W and 0 <= y + ay < H):
                pass
    px.r(cx + sx * 1 - (1 if sx < 0 else 0), cy + sy * 1 - (1 if sy < 0 else 0), cx + sx * 1 + (0 if sx < 0 else 1), cy + sy * 1 + (0 if sy < 0 else 1), m[5])


def outline_shape(px, inside, col_edge, col_fill=None):
    """inside(x,y)인 칸을 채우고 바깥 1도트 검은 선"""
    for y in range(H):
        for x in range(W):
            if inside(x, y):
                if col_fill:
                    px.p(x, y, col_fill(x, y))
            elif any(inside(x + ax, y + ay) for ax, ay in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                px.p(x, y, col_edge)


def arch_window(px, m, kind):
    x0, y0, x1, y1 = LAYOUT['art']
    cx = (x0 + x1) / 2
    rx = (x1 - x0) / 2
    if kind == 'cmd':
        # 용광로 아치 문: 위가 반원
        top = y0 + rx * 0.62

        def ins(x, y):
            if not (x0 <= x <= x1 and y0 <= y <= y1):
                return False
            if y >= top:
                return True
            return ((x - cx) / rx) ** 2 + ((y - top) / (top - y0)) ** 2 <= 1
    elif kind == 'part':
        # 팔각 원판
        cy = (y0 + y1) / 2
        rr = min(rx, (y1 - y0) / 2) - 1

        def ins(x, y):
            dx, dy = abs(x - cx), abs(y - cy)
            return dx <= rr and dy <= rr and dx + dy <= rr * 1.42
    else:
        # 방패 초상: 위 평평 · 아래 뾰족
        def ins(x, y):
            if not (x0 <= x <= x1 and y0 <= y <= y1 + 4):
                return False
            if y <= y1 - 14:
                return True
            k = (y - (y1 - 14)) / 18
            return abs(x - cx) <= rx * (1 - k * k)
    # 바깥 금속 테 3도트 (빛 왼쪽 위)
    def ring(d):
        return lambda x, y: not ins(x, y) and any(ins(x + ax, y + ay) for ax in range(-d, d + 1) for ay in range(-d, d + 1))
    r3 = ring(3)
    for y in range(H):
        for x in range(W):
            if r3(x, y):
                px.p(x, y, m[4] if (x - cx) + (y - y0) * 0.6 < 0 else m[3] if x < cx else m[1])
    outline_shape(px, lambda x, y: ins(x, y) or r3(x, y), INK)
    # 창 모양 마스크 (CSS mask-image — 그림 창 칸이 아치 · 팔각 · 방패를 따른다, D-371)
    x0m, y0m, x1m, y1m = LAYOUT['art']
    mk = Image.new('L', (x1m - x0m + 1, y1m - y0m + 1), 0)
    for yy in range(y0m, y1m + 1):
        for xx in range(x0m, x1m + 1):
            if ins(xx, yy):
                mk.putpixel((xx - x0m, yy - y0m), 255)
    MASKS[kind] = mk
    # 창 안: 비운다(투명) + 안쪽 검은 선
    for y in range(H):
        for x in range(W):
            if ins(x, y):
                px.p(x, y, (0, 0, 0, 0))
    for y in range(H):
        for x in range(W):
            if ins(x, y) and any(not ins(x + ax, y + ay) for ax, ay in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                px.p(x, y, INK)
    # 아치 꼭대기 쐐기돌(명령) · 원판 리벳(부품)
    if kind == 'cmd':
        kx = int(cx)
        px.r(kx - 2, y0 - 4, kx + 1, y0 + 1, INK)
        px.r(kx - 1, y0 - 3, kx, y0, BRASS[4])
        px.p(kx - 1, y0 - 3, BRASS[5])
    if kind == 'part':
        cy = (y0 + y1) / 2
        for k in range(8):
            a = k * math.pi / 4 + math.pi / 8
            x, y = int(cx + math.cos(a) * (rx + 2)), int(cy + math.sin(a) * (min(rx, (y1 - y0) / 2) + 1))
            px.r(x - 1, y - 1, x, y, INK)
            px.p(x, y, BRASS[4])


def ribbon(px, rb):
    """이름 리본: 가운데 몸통이 틀 위를 가로지르고, 양 끝은 틀 밖에서 뒤로 접혀(짙은 색) 제비꼬리로 갈라진다"""
    x0, y0, x1, y1 = LAYOUT['ribbon']
    th = y1 - y0  # 두께
    mask = {}

    def put(x, y, c):
        mask[(x, y)] = c
    # 뒤로 접힌 꼬리 (아래로 3 내려감)
    for side in (-1, 1):
        base = x0 if side < 0 else x1
        for i in range(0, 9):
            x = base + side * (i - 1)
            for y in range(y0 + 3, y1 + 4):
                fork = i >= 6 and abs(y - (y0 + y1) / 2 - 3) < (i - 5) * 1.1
                if not fork:
                    put(x, y, rb[1] if y < y1 + 1 else rb[0])
        # 접힘 그늘 삼각
        for k in range(3):
            for j2 in range(3 - k):
                put(base - side * k + side * 0, y1 + 1 + j2, rb[0])
    # 몸통 (가운데가 1도트 솟는 활 모양)
    span = x1 - x0
    for x in range(x0, x1 + 1):
        t = (x - x0) / span
        lift = 0
        for y in range(y0 - lift, y1 - lift + 1):
            u = (y - (y0 - lift)) / th
            put(x, y, rb[3] if u < 0.5 else rb[2])
    for (x, y), c in mask.items():
        px.p(x, y, c)
    for (x, y) in list(mask):
        for ax, ay in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            if (x + ax, y + ay) not in mask:
                px.p(x + ax, y + ay, INK)


def type_plate(px):
    x0, y0, x1, y1 = LAYOUT['type']
    px.r(x0, y0, x1, y1, INK)
    px.r(x0 + 1, y0 + 1, x1 - 1, y1 - 1, PLATE[3])
    for x in range(x0 + 1, x1):
        px.p(x, y0 + 1, '#3c3b46')
    px.p(x0 + 2, (y0 + y1) // 2, BRASS[4]); px.p(x1 - 2, (y0 + y1) // 2, BRASS[4])


def scroll(px):
    x0, y0, x1, y1 = LAYOUT['scroll']
    # 종이
    px.r(x0 + 3, y0, x1 - 3, y1, INK)
    px.r(x0 + 4, y0 + 1, x1 - 4, y1 - 1, PAPER[3])
    for x in range(x0 + 4, x1 - 3):
        px.p(x, y0 + 1, PAPER[4]); px.p(x, y1 - 1, PAPER[2]); px.p(x, y1 - 2, PAPER[2] if x % 5 else PAPER[3])
    # 종이 결 (드문 점)
    for y in range(y0 + 3, y1 - 2):
        for x in range(x0 + 6, x1 - 5):
            if (x * 7 + y * 13) % 41 == 0:
                px.p(x, y, PAPER[2])
    # 양 끝 말림 (원통)
    for side in (0, 1):
        cxs = x0 + 2 if side == 0 else x1 - 2
        for y in range(y0 - 1, y1 + 2):
            for dx in range(-3, 4):
                x = cxs + dx
                if abs(dx) == 3:
                    px.p(x, y, INK)
                else:
                    shade = [PAPER[1], PAPER[2], PAPER[4], PAPER[3], PAPER[2]][dx + 2]
                    px.p(x, y, shade)
        px.r(cxs - 3, y0 - 2, cxs + 3, y0 - 2, INK)
        px.r(cxs - 3, y1 + 2, cxs + 3, y1 + 2, INK)
        # 말린 끝 소용돌이
        for dy in (y0, y1):
            px.p(cxs, dy, PAPER[0])


def gem_socket(px, m):
    x0, y0, x1, y1 = LAYOUT['gem']
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    for y in range(y0 - 1, y1 + 2):
        for x in range(x0 - 1, x1 + 2):
            d = abs(x - cx + 0.5) + abs(y - cy + 0.5)
            if d <= 5:
                px.p(x, y, INK if d > 4 else m[3] if d > 3 else '#141319')


def cost_flag(px):
    """비용 톱니 메달 (왼쪽 위 모서리에 걸쳐 틀 밖으로) — 숫자는 게임이 얹는다"""
    cx, cy = 3, 2
    for y in range(cy - 12, cy + 13):
        for x in range(cx - 12, cx + 13):
            d = math.hypot(x - cx, y - cy)
            a = math.atan2(y - cy, x - cx)
            tooth = 9.2 + (1.8 if math.cos(a * 8) > 0.25 else 0)
            if d <= tooth:
                px.p(x, y, BRASS[4] if (x - cx) + (y - cy) < -4 else BRASS[3] if d > 6.5 else '#3a1416')
                if 6 <= d <= 6.9:
                    px.p(x, y, BRASS[1])
            elif d <= tooth + 1.1:
                px.p(x, y, INK)


def badges(px, m):
    """분대원: 공격(왼쪽 아래 붉은 마름모) · HP(오른쪽 아래 초록 방패) — 리본 위 양 끝, 틀 밖으로 반쯤"""
    for cx, kind in ((2, 'atk'), (W - 3, 'hp')):
        cy = 45
        for y in range(cy - 11, cy + 12):
            for x in range(cx - 11, cx + 12):
                dx, dy = abs(x - cx), y - cy
                if kind == 'atk':
                    d = dx + abs(dy)
                    lim = 10
                else:
                    d = math.hypot(dx, dy) * 1.05  # 둥근 압력계 (HP)
                    lim = 9.5
                if d <= lim + 1.1:
                    inner = d <= lim - 2
                    if d > lim:
                        px.p(x, y, INK)
                    elif not inner:
                        px.p(x, y, BRASS[4] if x < cx and y < cy else BRASS[2])
                    else:
                        base = ('#a8222e', '#d23a3a', '#7a1622') if kind == 'atk' else ('#2e7a3a', '#4aa856', '#1e5a26')
                        px.p(x, y, base[1] if (x - cx) + (y - cy) < -3 else base[2] if (x - cx) + (y - cy) > 4 else base[0])


def card(kind, grade):
    px = P()
    m = FRAME[grade]
    frame(px, m)
    for (cx, cy, sx, sy) in ((6, 6, 1, 1), (W - 7, 6, -1, 1), (6, H - 7, 1, -1), (W - 7, H - 7, -1, -1)):
        gear_corner(px, cx, cy, sx, sy, BRASS if grade != 'common' else FRAME['common'])
    arch_window(px, m, kind)
    scroll(px)
    ribbon(px, RIBBON[grade])
    gem_socket(px, m)
    if kind == 'cmd':
        cost_flag(px)
    if kind == 'crew':
        badges(px, m)
    return px.im


def back():
    px = P()
    m = FRAME['common']
    frame(px, m)
    for (cx, cy, sx, sy) in ((6, 6, 1, 1), (W - 7, 6, -1, 1), (6, H - 7, 1, -1), (W - 7, H - 7, -1, -1)):
        gear_corner(px, cx, cy, sx, sy, BRASS)
    # 앱 아이콘의 문장(제목 글자 빼고)만 판 전체에 음영으로 (D-369): 판과 같은 색 계열 세 단 + 칼자국만 짙은 붉은 기
    src = Image.open(os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'icon-512.png')).convert('RGB').crop((198, 100, 314, 304))
    th = 112
    tw = round(src.width * th / src.height)
    src = src.resize((tw, th), Image.LANCZOS)
    x0, y0 = (W - tw) // 2, (H - th) // 2
    for y in range(th):
        for x in range(tw):
            r, g, b = src.getpixel((x, y))
            v = (r + g + b) / 3
            if r > 120 and r > g * 1.8:
                c = '#3a1a20' if r < 200 else '#4a2026'
            elif v > 200:
                c = '#3e3d48'
            elif v > 120:
                c = '#33323c'
            elif v > 60:
                c = '#2a2931'
            else:
                continue
            px.p(x0 + x, y0 + y, c)
    return px.im


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    ims = []
    for kind in ('cmd', 'part', 'crew'):
        for g in ('common', 'rare', 'gold'):
            im = card(kind, g)
            im.save(os.path.join(OUT, f'{kind}-{g}.png'))
            ims.append(im)
    for k, mk in MASKS.items():
        Image.merge('RGBA', (mk, mk, mk, mk)).save(os.path.join(OUT, f'mask-{k}.png'))
    b = back()
    b.save(os.path.join(OUT, 'back.png'))
    ims.append(b)
    if len(sys.argv) > 1:
        s = 4
        sheet = Image.new('RGBA', ((CW + 4) * 5 * s, (CH + 4) * 2 * s), (40, 32, 48, 255))
        for i, im in enumerate(ims):
            sheet.paste(im.resize((CW * s, CH * s), Image.NEAREST), ((i % 5) * (CW + 4) * s, (i // 5) * (CH + 4) * s), im.resize((CW * s, CH * s), Image.NEAREST))
        sheet.save(sys.argv[1])
    print('ok')
