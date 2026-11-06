"""
버튼 · 판 시안 (D-292, 사용자: 「버튼이나 사각형 디자인 — 웹사이트 버튼보다 못하다. 게임 UI로써 버튼 디자인도 중요하다. 시안 가져와」).
지금 버튼(src/assets/ui/chrome/btn-*.png, 12×12)은 단색 판 + 위 빛 한 줄 + 아래 그늘 — 두께 · 재질 · 손에 쥐는 맛이 없다.
세 갈래 시안을 1도트 = 1px로 직접 찍는다 (9-slice, CSS border-image로 정수배 확대):
  A 리벳 명판  — 두꺼운 금속 판, 네 모서리 리벳, 위 2단 빛, 아래 3도트 두께(옆면) — 누르면 두께가 1로 꺼진다
  B 주물 키캡  — 모서리를 깎은 주물 단추, 앞면 안쪽에 새긴 홈 테두리, 아래 4도트 두께 — 기계 건반처럼 눌린다
  C 쇠틀 모서리 — 판 둘레에 다른 금속의 L자 모서리 쇠붙이 + 나사 (황동 판엔 쇠, 쇠 판엔 황동)
판(사각형): PA 리벳 철판 · PB 황동 테 + 움푹한 우물 · PC 움푹한 칸(목록용) · 이름판(제목 띠)
출력: build-res/ui-proposals/<시안>-<색>[-down].png · panel-*.png  (게임에는 아직 넣지 않는다 — 고르면 src/assets/ui/chrome로)
사용: python3 -I tools/draw-chrome2.py
"""
import os

from PIL import Image

OUT = os.path.join('build-res', 'ui-proposals')
R = {
    'iron': ['#14131a', '#1f1e27', '#2c2d38', '#41434f', '#5d606d', '#868a98', '#b9bdc8'],
    'brass': ['#2b1a06', '#5a3a0e', '#8a5a14', '#b98424', '#d9a838', '#f4d27a', '#fff1c0'],
    'crimson': ['#2a0608', '#5a0c12', '#9a141e', '#c81e28', '#e5262f', '#ff6b6b', '#ffc0c0'],
    'teal': ['#06222a', '#0e4650', '#1e6e78', '#2e969c', '#46c4c8', '#8ee8ea', '#d8fafa'],
}
INK = '#0b0b0e'


def hx(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) + (255,)


class Pix:
    def __init__(self, w, h):
        self.im = Image.new('RGBA', (w, h), (0, 0, 0, 0))

    def p(self, x, y, c):
        if 0 <= x < self.im.width and 0 <= y < self.im.height:
            self.im.putpixel((x, y), hx(c) if isinstance(c, str) else c)

    def r(self, x0, y0, x1, y1, c):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.p(x, y, c)


def rivet(px, x, y, r):
    """2×2 리벳 + 아래오른 그림자 한 도트"""
    px.p(x, y, r[6]); px.p(x + 1, y, r[5]); px.p(x, y + 1, r[5]); px.p(x + 1, y + 1, r[2]); px.p(x + 2, y + 1, r[1]); px.p(x + 1, y + 2, r[1])


# ───────── A 리벳 명판 (18×18, 9-slice 8 7 8 7 — 리벳 · 홈 · 쇠붙이는 모서리 칸 안에만) ─────────
def btn_a(t, down=False):
    r = R[t]
    W = 18
    px = Pix(W, W)
    px.r(0, 0, W - 1, W - 1, INK)
    off = 2 if down else 0          # 누르면 앞면이 2도트 내려앉고 두께가 준다
    top, face_b = 1 + off, 12 + off  # 앞면 세로 범위
    if down:
        px.r(1, 1, W - 2, 2, r[0])   # 꺼진 자리의 그늘
    px.r(1, top, W - 2, face_b, r[3])
    # 빛: 위 1줄 5단 + 둘째 줄 4단, 왼 1줄 5단 + 둘째 4단 (왼위 모서리 6단 반짝)
    px.r(2, top, W - 3, top, r[5]); px.r(2, top + 1, W - 4, top + 1, r[4])
    px.r(1, top + 1, 1, face_b - 1, r[5]); px.r(2, top + 2, 2, face_b - 2, r[4])
    px.p(1, top, r[6]); px.p(2, top, r[6])
    # 그늘: 오른 1줄 2단 · 아래 1줄 2단
    px.r(W - 2, top + 1, W - 2, face_b, r[2]); px.r(2, face_b, W - 2, face_b, r[2])
    # 리벳 네 개
    rivet(px, 3, top + 2, r); rivet(px, W - 6, top + 2, r); rivet(px, 3, face_b - 2, r); rivet(px, W - 6, face_b - 2, r)
    # 두께(옆면): 아래 3도트(눌리면 1도트)
    th = 1 if down else 3
    px.r(1, face_b + 1, W - 2, face_b + th, r[1])
    px.r(1, face_b + 1, 1, face_b + th, r[2])
    if th > 1:
        px.r(2, face_b + 1, W - 3, face_b + 1, r[2])
    return px.im


# ───────── B 주물 키캡 (18×18, 9-slice 8 7 8 7 — 리벳 · 홈 · 쇠붙이는 모서리 칸 안에만) — 깎은 모서리 · 새긴 홈 ─────────
def btn_b(t, down=False):
    r = R[t]
    W = 18
    px = Pix(W, W)
    th = 1 if down else 4
    off = 3 if down else 0
    top, fb = 1 + off, 12 + off
    # 바깥 모양: 모서리 2도트 깎기 (먹 테 포함)
    def shape(y0, y1, c):
        for y in range(y0, y1 + 1):
            cut = 2 if y in (y0, y1) else (1 if y in (y0 + 1, y1 - 1) else 0)
            px.r(cut, y, W - 1 - cut, y, c)
    shape(top - 1, fb + th + 1, INK)
    # 옆면(두께)
    for y in range(fb + 1, fb + th + 1):
        cut = 2 if y == fb + th else (1 if y == fb + th - 1 else 1)
        px.r(cut, y, W - 1 - cut, y, r[1])
        px.p(cut, y, r[2])
    # 앞면
    for y in range(top, fb + 1):
        cut = 2 if y == top else (1 if y in (top + 1,) else 1)
        cut = 2 if y in (top, fb) else 1
        px.r(cut, y, W - 1 - cut, y, r[4])
    # 앞면 빛 · 그늘 테
    px.r(2, top, W - 3, top, r[5]); px.r(1, top + 1, 1, fb - 1, r[5]); px.p(2, top, r[6]); px.p(1, top + 1, r[6])
    px.r(W - 2, top + 1, W - 2, fb - 1, r[3]); px.r(2, fb, W - 3, fb, r[3])
    # 새긴 홈 (안쪽 3도트): 위 · 왼 = 그늘(2단), 아래 · 오른 = 빛(5단) → 움푹 파인 선
    px.r(4, top + 3, W - 5, top + 3, r[2]); px.r(4, top + 3, 4, fb - 2, r[2])
    px.r(5, fb - 2, W - 5, fb - 2, r[5]); px.r(W - 5, top + 4, W - 5, fb - 2, r[5])
    return px.im


# ───────── C 쇠틀 모서리 (18×18, 9-slice 8 7 8 7 — 리벳 · 홈 · 쇠붙이는 모서리 칸 안에만) — 다른 금속의 L자 쇠붙이 + 나사 ─────────
def btn_c(t, down=False):
    r = R[t]
    m = R['iron'] if t == 'brass' else R['brass']
    W = 18
    px = Pix(W, W)
    px.r(0, 0, W - 1, W - 1, INK)
    off = 2 if down else 0
    top, fb = 1 + off, 13 + off
    if down:
        px.r(1, 1, W - 2, 2, r[0])
    px.r(1, top, W - 2, fb, r[3])
    px.r(1, top, W - 2, top, r[5]); px.r(1, top, 1, fb, r[4])
    px.r(W - 2, top + 1, W - 2, fb, r[2]); px.r(2, fb, W - 2, fb, r[2])
    th = 1 if down else 2
    px.r(1, fb + 1, W - 2, fb + th, r[1])
    # L자 모서리 쇠붙이 (폭 2, 길이 5) + 나사 — 네 귀퉁이
    def corner(x, y, sx, sy):
        for i in range(4):
            for j in range(2):
                px.p(x + sx * i, y + sy * j, m[4] if j == 0 else m[3])
                px.p(x + sx * j, y + sy * i, m[4] if j == 0 else m[3])
        px.p(x, y, m[6])
        px.p(x + sx * 3, y + sy * 0, m[5])
        px.p(x + sx * 1, y + sy * 1, INK)   # 나사 구멍
    corner(1, top, 1, 1); corner(W - 2, top, -1, 1); corner(1, fb, 1, -1); corner(W - 2, fb, -1, -1)
    return px.im


# ───────── 판 ─────────
def panel_a():
    """PA 리벳 철판 24×24, slice 9"""
    r = R['iron']
    W = 24
    px = Pix(W, W)
    px.r(0, 0, W - 1, W - 1, INK)
    px.r(1, 1, W - 2, W - 2, r[2])
    px.r(1, 1, W - 2, 1, r[4]); px.r(1, 1, 1, W - 2, r[4]); px.p(1, 1, r[5])
    px.r(2, W - 2, W - 2, W - 2, r[1]); px.r(W - 2, 2, W - 2, W - 2, r[1])
    # 안쪽 홈 (5도트 안): 그늘 + 빛 한 줄 → 판을 이은 자국
    px.r(5, 5, W - 6, 5, r[1]); px.r(5, 5, 5, W - 6, r[1]); px.r(6, W - 6, W - 6, W - 6, r[3]); px.r(W - 6, 6, W - 6, W - 6, r[3])
    for x, y in ((2, 2), (W - 5, 2), (2, W - 5), (W - 5, W - 5)):
        rivet(px, x, y, r)
    return px.im


def panel_b():
    """PB 황동 테 + 움푹한 우물 24×24, slice 9"""
    b, r = R['brass'], R['iron']
    W = 24
    px = Pix(W, W)
    px.r(0, 0, W - 1, W - 1, INK)
    px.r(1, 1, W - 2, W - 2, b[3])
    px.r(1, 1, W - 2, 1, b[5]); px.r(1, 1, 1, W - 2, b[5]); px.p(1, 1, b[6])
    px.r(2, 2, W - 3, 2, b[4]); px.r(2, 2, 2, W - 3, b[4])
    px.r(2, W - 2, W - 2, W - 2, b[1]); px.r(W - 2, 2, W - 2, W - 2, b[1])
    px.r(3, W - 3, W - 3, W - 3, b[2]); px.r(W - 3, 3, W - 3, W - 3, b[2])
    # 우물 (4도트 안): 위왼 깊은 그늘 2줄
    px.r(4, 4, W - 5, W - 5, r[1])
    px.r(4, 4, W - 5, 4, INK); px.r(4, 4, 4, W - 5, INK)
    px.r(5, 5, W - 5, 5, r[0]); px.r(5, 5, 5, W - 5, r[0])
    for x, y in ((2, 2), (W - 4, 2), (2, W - 4), (W - 4, W - 4)):
        px.p(x, y, b[6]); px.p(x + 1, y + 1 if False else y, b[2])
    return px.im


def panel_c():
    """PC 움푹한 칸 12×12, slice 4"""
    r = R['iron']
    W = 12
    px = Pix(W, W)
    px.r(0, 0, W - 1, W - 1, r[1])
    px.r(0, 0, W - 1, 0, INK); px.r(0, 0, 0, W - 1, INK)
    px.r(1, 1, W - 1, 1, r[0]); px.r(1, 1, 1, W - 1, r[0])
    px.r(1, W - 1, W - 1, W - 1, r[4]); px.r(W - 1, 1, W - 1, W - 1, r[4])
    return px.im


def plate():
    """이름판 24×18, slice 6 6 8 6 — 황동 띠 · 위 두 단 빛 · 아래 옆면 · 양끝 위쪽 나사 (나사는 위 모서리 칸 안)"""
    b = R['brass']
    px = Pix(24, 18)
    px.r(0, 0, 23, 17, INK)
    px.r(1, 1, 22, 14, b[4])
    px.r(1, 1, 22, 1, b[6]); px.r(1, 2, 22, 2, b[5]); px.r(1, 1, 1, 14, b[5])
    px.r(2, 14, 22, 14, b[2]); px.r(22, 2, 22, 14, b[2])
    px.r(1, 15, 22, 16, b[1])
    for x in (3, 19):
        px.p(x, 3, b[6]); px.p(x + 1, 3, b[3]); px.p(x, 4, b[3]); px.p(x + 1, 4, b[1])
    return px.im


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, fn in (('A', btn_a), ('B', btn_b), ('C', btn_c)):
        for t in R:
            fn(t).save(os.path.join(OUT, f'{name}-{t}.png'))
            fn(t, True).save(os.path.join(OUT, f'{name}-{t}-down.png'))
    panel_a().save(os.path.join(OUT, 'panel-A.png'))
    panel_b().save(os.path.join(OUT, 'panel-B.png'))
    panel_c().save(os.path.join(OUT, 'panel-C.png'))
    plate().save(os.path.join(OUT, 'plate.png'))
    print(OUT)


if __name__ == '__main__':
    main()
