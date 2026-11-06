"""
버튼 · 판 2차 시안 (D-292 2차, 사용자: 「너무 단색 · 밋밋 · 정사각형에 고정 — 게임 버튼치고 재미없다. 큰 버튼에서 특히」).
1차(A · B · C)는 단색 판에 테두리만 바꿨다. 2차는 세 가지를 더한다:
  ① 넓은 면에 재질 결 — 긁힌 금속 줄결 · 리벳 줄을 9-slice 가운데 · 가장자리에 **타일**로(border-image-repeat: repeat) — 늘여도 결이 뭉개지지 않는다
  ② 사각형을 벗어난 실루엣 — 깎은 모서리 · 양끝 마개(톱니 · 볼트 · 리본 꼬리)가 몸통 밖으로 튀어나온다 (CSS ::before/::after 그림)
  ③ 장치 — 왼쪽 램프(누를 수 있으면 켜짐), 위험 단추의 경고 줄무늬, 주 단추의 화살 끝(→ 나아간다)
세 갈래:
  D 톱니 마개   — 깎은 8각 판 + 줄결, 큰 단추는 왼쪽 반 톱니 마개 · 오른쪽 볼트 마개가 튀어나온다
  E 레버 판     — 두꺼운 쇠틀 안 황동 판, 오른끝이 화살처럼 뾰족(나아가기), 아래 경고 줄무늬(위험) · 위 리벳 줄
  F 명판 리본   — 황동 명판 + 양끝 리본 꼬리(큰 단추), 작은 것은 꼬리표(구멍 뚫린 태그)
출력: build-res/ui-proposals2/*.png  ·  사용: python3 -I tools/draw-chrome3.py
"""
import os

from PIL import Image

OUT = os.path.join('build-res', 'ui-proposals2')
R = {
    'iron': ['#14131a', '#1f1e27', '#2c2d38', '#41434f', '#5d606d', '#868a98', '#b9bdc8'],
    'brass': ['#2b1a06', '#5a3a0e', '#8a5a14', '#b98424', '#d9a838', '#f4d27a', '#fff1c0'],
    'crimson': ['#2a0608', '#5a0c12', '#9a141e', '#c81e28', '#e5262f', '#ff6b6b', '#ffc0c0'],
    'teal': ['#06222a', '#0e4650', '#1e6e78', '#2e969c', '#46c4c8', '#8ee8ea', '#d8fafa'],
    'paper': ['#3a3328', '#6e6452', '#a39a84', '#cfc6ae', '#e8e0cc', '#f4f1ea', '#ffffff'],
    'hazard': ['#0b0b0e', '#1f1e27', '#8a6a06', '#d9a40e', '#facc15', '#ffe680', '#fffbe0'],
}
INK = '#0b0b0e'


def hx(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) + (255,)


class Pix:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.im = Image.new('RGBA', (w, h), (0, 0, 0, 0))

    def p(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.im.putpixel((x, y), hx(c) if isinstance(c, str) else c)

    def r(self, x0, y0, x1, y1, c):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.p(x, y, c)

    def clear(self, x, y):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.im.putpixel((x, y), (0, 0, 0, 0))


def grain(px, x0, y0, x1, y1, r):
    """볼록한 금속 막대 명암 (줄결 대신 — 줄결은 벽돌처럼 보였다): 위 반짝 띠 → 밝은 띠 → 바탕 → 아래 그늘 띠.
    9-slice에서 위 · 아래 띠는 모서리 칸 안에, 가운데(늘어나는 칸)는 바탕 한 단만 오게 높이를 맞춘다.
    왼위에 짧은 광택 줄 하나 — 게임 단추의 「반짝」."""
    h = max(1, y1 - y0)
    for y in range(y0, y1 + 1):
        k = (y - y0) / h
        c = r[5] if k < 0.12 else r[4] if k < 0.34 else r[3] if k < 0.78 else r[2]
        px.r(x0, y, x1, y, c)
    gy = y0 + 1 if h > 6 else y0
    px.r(x0 + 2, gy, x0 + 4, gy, r[6])
    px.p(x0 + 6, gy, r[6])


def rivet(px, x, y, r):
    px.p(x, y, r[6]); px.p(x + 1, y, r[4]); px.p(x, y + 1, r[4]); px.p(x + 1, y + 1, r[1])


# ───────── D 톱니 마개: 깎은 8각 판 (24×22, slice 8 8 10 8) ─────────
def frame_d(t, down=False):
    """가운데 8×4는 줄결 주기와 같다 → repeat로 타일. 위 가장자리에 8칸마다 리벳(가장자리도 주기 8)."""
    r = R[t]
    W, H = 24, 22
    px = Pix(W, H)
    off = 2 if down else 0
    top, fb = 1 + off, 15 + off   # 앞면
    th = 1 if down else 3
    cut = 3
    bot = fb + th + 1
    px.r(0, top - 1, W - 1, bot, INK)
    grain(px, 1, top, W - 2, fb, r)
    # 깎은 모서리: 모서리 삼각을 지우고 빗변에 먹
    for i in range(cut):
        for y, x in ((top - 1 + i, None), (bot - i, None)):
            for xx in list(range(0, cut - i)) + list(range(W - cut + i, W)):
                px.clear(xx, y)
            px.p(cut - i, y, INK); px.p(W - 1 - cut + i, y, INK)
    # 테: 왼 빛 · 오른 그늘, 바닥 짙은 줄
    px.r(1, top + cut - 1, 1, fb - 1, r[5]); px.r(W - 2, top + cut - 1, W - 2, fb, r[2])
    px.r(cut, fb, W - cut - 1, fb, r[1])
    # 리벳 줄 (위 가장자리, 8칸마다 — 가장자리 타일과 맞물림)
    # 옆면 두께
    for y in range(fb + 1, fb + th + 1):
        c = max(0, cut - ((fb + th + 1) - y)) + 1
        px.r(c, y, W - 1 - c, y, r[1])
        px.p(c, y, r[2])
    return px.im


def cap_gear(t):
    """큰 단추 왼쪽에 튀어나오는 반 톱니 마개 14×30 (2배 = 28×60)"""
    r = R['brass'] if t != 'brass' else R['iron']
    W, H = 14, 30
    px = Pix(W, H)
    cx, cy, ro, ri = 13, 14, 12, 8
    import math
    for y in range(H):
        for x in range(W):
            dx, dy = x - cx, y - cy
            d = math.hypot(dx, dy)
            a = math.atan2(dy, dx)
            tooth = (math.cos(a * 10) > 0.2)
            rr = ro if tooth else ro - 3
            if d <= rr + 1:
                px.p(x, y, INK)
    for y in range(H):
        for x in range(W):
            dx, dy = x - cx, y - cy
            d = math.hypot(dx, dy)
            a = math.atan2(dy, dx)
            tooth = (math.cos(a * 10) > 0.2)
            rr = ro if tooth else ro - 3
            if d <= rr:
                lit = (dx + dy) < -4
                shade = (dx + dy) > 6
                px.p(x, y, r[5] if lit else (r[2] if shade else r[4]))
            if d <= ri:
                px.p(x, y, r[3] if (dx + dy) < 0 else r[2])
            if d <= 3:
                px.p(x, y, INK if d <= 2 else r[1])
    return px.im


def cap_bolt(t):
    """오른쪽 볼트 마개 8×22 — 육각 볼트 머리가 판 끝을 물고 있다"""
    r = R['iron'] if t == 'brass' else R['brass']
    W, H = 8, 22
    px = Pix(W, H)
    px.r(0, 3, 6, 18, INK)
    px.r(0, 4, 5, 17, r[3]); px.r(0, 4, 5, 4, r[5]); px.r(0, 4, 0, 17, r[5]); px.r(5, 5, 5, 17, r[1]); px.r(1, 17, 5, 17, r[1])
    px.r(1, 9, 4, 12, r[2]); px.p(1, 9, r[4])
    return px.im


def lamp(on=True):
    """왼쪽 램프 8×8"""
    px = Pix(8, 8)
    px.r(1, 0, 6, 7, INK); px.r(0, 1, 7, 6, INK)
    rr = R['teal'] if on else R['iron']
    px.r(1, 1, 6, 6, rr[3]); px.r(2, 2, 5, 5, rr[5] if on else rr[2]); px.p(2, 2, rr[6]); px.p(3, 2, rr[6] if on else rr[4])
    px.r(5, 5, 6, 6, rr[2])
    return px.im


# ───────── E 레버 판: 쇠틀 + 황동 판 + 오른끝 화살 (몸통 24×24 slice 9 · 화살 끝은 별도 그림) ─────────
def frame_e(t, down=False, hazard=False):
    r = R[t]
    fr = R['iron']
    W, H = 24, 24
    px = Pix(W, H)
    off = 2 if down else 0
    px.r(0, off, W - 1, H - 1, INK)
    # 쇠틀 (2도트)
    px.r(1, 1 + off, W - 2, H - 2, fr[3])
    px.r(1, 1 + off, W - 2, 1 + off, fr[5]); px.r(1, 1 + off, 1, H - 2, fr[4])
    px.r(1, H - 2, W - 2, H - 2, fr[1]); px.r(W - 2, 2 + off, W - 2, H - 2, fr[2])
    # 안쪽 판
    top, fb = 4 + off, H - 5 - (0 if down else 2)
    px.r(3, top - 1, W - 4, fb + 1, INK)
    grain(px, 4, top, W - 5, fb, r)
    px.r(4, top, W - 5, top, r[6]); px.r(4, top, 4, fb, r[5]); px.r(4, fb, W - 5, fb, r[2]); px.r(W - 5, top + 1, W - 5, fb, r[2])
    # 위 리벳 줄 (쇠틀 위, 8칸마다)
    for x in (3, 11, 19):
        px.p(x, 2 + off, fr[6]); px.p(x + 1, 2 + off, fr[2])
    # 아래 두께
    if not down:
        px.r(1, H - 4, W - 2, H - 3, fr[1])
    if hazard:
        for x in range(1, W - 1):
            for y in (H - 4, H - 3):
                px.p(x, y, R['hazard'][4] if ((x + y) // 2) % 2 == 0 else INK)
    return px.im


def tip_e(t, down=False, H=24):
    """오른끝 화살 (H/2)×H — 판이 뾰족하게 앞으로 (나아가기). 큰 단추 64px면 H=32"""
    r = R[t]
    fr = R['iron']
    W = H // 2
    px = Pix(W, H)
    off = 2 if down else 0
    mid = (H + off) // 2
    for y in range(off, H):
        reach = W - 1 - abs(y - mid)
        if reach > 0:
            px.r(0, y, reach, y, INK)
    for y in range(1 + off, H - 1):
        reach = W - 2 - abs(y - mid)
        if reach > 0:
            px.r(0, y, reach - 1, y, fr[3])
            px.p(reach - 1, y, fr[5] if y < mid else fr[1])
    y0, y1 = 4 + off, H - 6
    for y in range(y0, y1 + 1):
        reach = W - 5 - abs(y - mid)
        if reach > 0:
            k = (y - y0) / max(1, y1 - y0)
            c = r[5] if k < 0.12 else r[4] if k < 0.34 else r[3] if k < 0.78 else r[2]
            px.r(0, y, reach - 1, y, c)
            px.p(reach - 1, y, r[6] if y < mid else r[1])
    return px.im


# ───────── F 명판 리본: 황동 명판 (24×20 slice 8) + 리본 꼬리 / 꼬리표 ─────────
def frame_f(t, down=False):
    r = R[t]
    W, H = 24, 20
    px = Pix(W, H)
    off = 1 if down else 0
    px.r(1, off, W - 2, H - 1, INK); px.r(0, 1 + off, W - 1, H - 2, INK)
    grain(px, 1, 1 + off, W - 2, H - 3, r)
    # 이중 테: 바깥 빛 · 안쪽 새긴 선
    px.r(2, 1 + off, W - 3, 1 + off, r[6]); px.r(1, 2 + off, 1, H - 4, r[5])
    px.r(1, H - 3, W - 2, H - 3, r[2]); px.r(W - 2, 2 + off, W - 2, H - 3, r[2])
    px.r(3, 3 + off, W - 4, 3 + off, r[2]); px.r(3, 3 + off, 3, H - 6, r[2])
    px.r(4, H - 5, W - 4, H - 5, r[5]); px.r(W - 4, 4 + off, W - 4, H - 5, r[5])
    if not down:
        px.r(1, H - 2, W - 2, H - 2, r[1])
    # 모서리 장식 점
    for x, y in ((5, 5 + off), (W - 7, 5 + off)):
        px.p(x, y, r[6]); px.p(x + 1, y, r[4])
    return px.im


def ribbon(t, left=True):
    """리본 꼬리 12×20 — 명판 뒤로 접혀 나온 천 (진홍)"""
    r = R['crimson'] if t != 'crimson' else R['brass']
    W, H = 12, 20
    px = Pix(W, H)
    rows = []
    for y in range(4, 18):
        notch = 4 - abs(y - 11) if abs(y - 11) < 4 else 0
        rows.append((y, notch))
    for y, notch in rows:
        px.r(notch, y, W - 1, y, INK)
    for y, notch in rows[1:-1]:
        px.r(notch + 1, y, W - 1, y, r[3] if y < 11 else r[2])
        px.p(notch + 1, y, r[5] if y < 11 else r[1])
    px.r(W - 3, 5, W - 1, 16, r[1])  # 접혀 들어간 그늘
    im = px.im
    return im if left else im.transpose(Image.FLIP_LEFT_RIGHT)


# ───────── 판 2차 ─────────
def panel_cab():
    """P1 쇠 함 (32×32, slice 12): 줄결 철판 + 두꺼운 틀 + 모서리 삼각 덧판 · 볼트"""
    r, b = R['iron'], R['brass']
    W = 32
    px = Pix(W, W)
    px.r(0, 0, W - 1, W - 1, INK)
    grain(px, 1, 1, W - 2, W - 2, [r[0], r[1], r[1], r[2], r[3], r[4], r[5]])
    px.r(1, 1, W - 2, 3, r[3]); px.r(1, 1, W - 2, 1, r[5]); px.r(1, 1, 3, W - 2, r[3]); px.r(1, 1, 1, W - 2, r[5])
    px.r(1, W - 4, W - 2, W - 2, r[1]); px.r(W - 4, 1, W - 2, W - 2, r[1])
    px.r(4, 4, W - 5, 4, INK); px.r(4, 4, 4, W - 5, INK); px.r(4, W - 5, W - 5, W - 5, r[3]); px.r(W - 5, 4, W - 5, W - 5, r[3])
    # 모서리 덧판 (황동 삼각) + 볼트
    for sx, sy, x0, y0 in ((1, 1, 1, 1), (-1, 1, W - 2, 1), (1, -1, 1, W - 2), (-1, -1, W - 2, W - 2)):
        for i in range(9):
            for j in range(9 - i):
                px.p(x0 + sx * i, y0 + sy * j, b[4] if i + j < 7 else b[2])
        for i in range(10):
            px.p(x0 + sx * i, y0 + sy * (9 - i), INK)
        px.p(x0 + sx * 3, y0 + sy * 3, b[6]); px.p(x0 + sx * 4, y0 + sy * 3, b[1]); px.p(x0 + sx * 3, y0 + sy * 4, b[1])
    return px.im


def panel_paper():
    """P2 설계 도면 (32×32, slice 12): 누런 종이 + 네 귀퉁이 압정 · 아래 그림자"""
    r, b = R['paper'], R['crimson']
    W = 32
    px = Pix(W, W)
    px.r(0, 0, W - 2, W - 2, INK)
    px.r(1, 1, W - 3, W - 3, r[4])
    for y in range(1, W - 2):
        if y % 6 == 3:
            px.r(2, y, W - 4, y, r[3])
    px.r(1, 1, W - 3, 1, r[5]); px.r(W - 3, 2, W - 3, W - 3, r[2]); px.r(2, W - 3, W - 3, W - 3, r[2])
    px.r(2, W - 1, W - 1, W - 1, INK); px.r(W - 1, 2, W - 1, W - 1, INK)
    for x, y in ((4, 4), (W - 7, 4), (4, W - 7), (W - 7, W - 7)):
        px.r(x, y, x + 2, y + 2, INK); px.p(x + 1, y + 1, b[4]); px.p(x, y, b[6]) if False else None
        px.p(x + 1, y, b[3]); px.p(x, y + 1, b[3]); px.p(x + 1, y + 1, b[5])
    return px.im


def hang_plate():
    """창 위에 걸리는 제목판 (40×18, slice 10 6 8 10): 황동 판 + 위로 짧은 사슬 고리 두 개"""
    b, r = R['brass'], R['iron']
    W, H = 40, 18
    px = Pix(W, H)
    for x in (8, W - 10):
        px.r(x, 0, x + 1, 4, INK); px.p(x, 1, r[5]); px.p(x, 3, r[4])
    px.r(2, 4, W - 3, H - 1, INK); px.r(1, 5, W - 2, H - 2, INK)
    grain(px, 2, 5, W - 3, H - 3, b)
    px.r(3, 5, W - 4, 5, b[6]); px.r(2, 6, 2, H - 4, b[5]); px.r(2, H - 3, W - 3, H - 3, b[1]); px.r(W - 3, 6, W - 3, H - 3, b[2])
    return px.im


def main():
    os.makedirs(OUT, exist_ok=True)
    for t in ('iron', 'brass', 'crimson', 'teal'):
        frame_d(t).save(f'{OUT}/D-{t}.png'); frame_d(t, True).save(f'{OUT}/D-{t}-down.png')
        cap_gear(t).save(f'{OUT}/D-gear-{t}.png'); cap_bolt(t).save(f'{OUT}/D-bolt-{t}.png')
        frame_e(t).save(f'{OUT}/E-{t}.png'); frame_e(t, True).save(f'{OUT}/E-{t}-down.png')
        frame_e(t, hazard=True).save(f'{OUT}/E-{t}-hz.png'); frame_e(t, True, True).save(f'{OUT}/E-{t}-hz-down.png')
        tip_e(t).save(f'{OUT}/E-tip-{t}.png'); tip_e(t, True).save(f'{OUT}/E-tip-{t}-down.png')
        tip_e(t, H=32).save(f'{OUT}/E-tip32-{t}.png'); tip_e(t, True, H=32).save(f'{OUT}/E-tip32-{t}-down.png')
        frame_f(t).save(f'{OUT}/F-{t}.png'); frame_f(t, True).save(f'{OUT}/F-{t}-down.png')
        ribbon(t).save(f'{OUT}/F-rib-{t}-l.png'); ribbon(t, False).save(f'{OUT}/F-rib-{t}-r.png')
    lamp().save(f'{OUT}/lamp-on.png'); lamp(False).save(f'{OUT}/lamp-off.png')
    panel_cab().save(f'{OUT}/P1.png'); panel_paper().save(f'{OUT}/P2.png'); hang_plate().save(f'{OUT}/hang.png')
    print(OUT)


if __name__ == '__main__':
    main()
