"""
E 계열 사각형 일괄 (D-294, 사용자: 「버튼 말고 배경 사각형들 — 태엽 · 카드 · 상점 카드 · 고물상 타이틀 · 보병 같은 태그 — 카드 리뉴얼 + 글자 배경 에셋 full 리뉴얼」).
단추 E(쇠틀 2도트 · 끼운 판 · 볼록 명암 · 아래 두께 · 귀퉁이 리벳)와 같은 문법으로 글자 바탕을 모두 다시 찍는다.
파일 이름 · 크기 · 9-slice 칸은 예전과 같다 — CSS는 그대로 두고 그림만 갈린다.
  카드 얼굴   kit/card-common · card-rare-0..1 · card-gold-0..3   24×35 (위 12 · 옆 4 · 아래 5, round)
  가격표      kit/price-tag · price-tag-poor                     12×12 (4)
  계기 상자   kit/gauge (태엽 · 턴 머리)                           12×12 (4, fill)
  창          chrome/panel                                       16×16 (5, fill)
  이름판      chrome/plate (고물상 · 부품 하나 같은 제목)            16×16 (5, fill)
  우물        chrome/inset                                        8×8 (3, fill)
  성질 태그   kit/tag-<축>.png                                    10×10 (3, fill) — 보병 · 기병 · 왕관 · 연쇄 · 밀치기 · 수읽기 · 합(add) · 곱(mul)
사용: python3 -I tools/draw-chrome-e.py
"""
import os

from PIL import Image

KIT = os.path.join('src', 'assets', 'ui', 'kit')
CHROME = os.path.join('src', 'assets', 'ui', 'chrome')
R = {
    'iron': ['#14131a', '#1f1e27', '#2c2d38', '#41434f', '#5d606d', '#868a98', '#b9bdc8'],
    'brass': ['#2b1a06', '#5a3a0e', '#8a5a14', '#b98424', '#d9a838', '#f4d27a', '#fff1c0'],
    'teal': ['#06222a', '#0e4650', '#1e6e78', '#2e969c', '#46c4c8', '#8ee8ea', '#d8fafa'],
    'sky': ['#0c1c30', '#14304e', '#1e4a78', '#3f7fb8', '#6fb3e8', '#9ec7ef', '#e6f4ff'],
}
INK = '#0b0b0e'
WHITE = '#fff8e0'


def hx(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) + (255,)


def ramp_from(base):
    """한 색 → 7단 (어두움 → 밝음) — 태그 색"""
    r, g, b = (int(base[i:i + 2], 16) for i in (1, 3, 5))
    out = []
    for f in (0.22, 0.38, 0.58, 0.8, 1.0, 1.18, 1.38):
        c = [max(0, min(255, round(v * f + (255 - v) * max(0, f - 1) * 0.6))) for v in (r, g, b)]
        out.append('#%02x%02x%02x' % tuple(c))
    return out


class Pix:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.im = Image.new('RGBA', (w, h), (0, 0, 0, 0))

    def p(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.im.putpixel((x, y), hx(c))

    def r(self, x0, y0, x1, y1, c):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.p(x, y, c)


def bevel(px, x0, y0, x1, y1, r, face=3):
    """판 하나: 위 · 왼 빛(5, 모서리 6) · 오른 · 아래 그늘(2) · 속(face)"""
    px.r(x0, y0, x1, y1, r[face])
    px.r(x0, y0, x1, y0, r[5]); px.r(x0, y0, x0, y1, r[5]); px.p(x0, y0, r[6])
    px.r(x0 + 1, y1, x1, y1, r[2]); px.r(x1, y0 + 1, x1, y1, r[2])


def rivet(px, x, y, r):
    px.p(x, y, r[6]); px.p(x + 1, y, r[4]); px.p(x, y + 1, r[4]); px.p(x + 1, y + 1, r[1])


# ───────── 카드 얼굴 24×35 (위 12 · 옆 4 · 아래 5) ─────────
def card(metal, band_r, lights=None, shimmer=None):
    """쇠틀(2) + 머리띠 판(이름 자리, 끼운 판처럼) + 속은 비움(카드 바탕색) + 아래 두께. 귀퉁이 리벳."""
    fr = R[metal]
    W, H = 24, 35
    px = Pix(W, H)
    # 바깥 먹 (모서리 한 칸 깎음)
    px.r(1, 0, W - 2, H - 1, INK); px.r(0, 1, W - 1, H - 2, INK)
    # 쇠틀 2도트
    px.r(1, 1, W - 2, H - 2, fr[3])
    px.r(1, 1, W - 2, 1, fr[5]); px.r(1, 1, 1, H - 3, fr[4]); px.p(1, 1, fr[6])
    px.r(W - 2, 2, W - 2, H - 2, fr[2]); px.r(2, H - 2, W - 2, H - 2, fr[1]); px.r(2, H - 3, W - 3, H - 3, fr[2])
    # 머리띠: 끼운 판 (먹 테 + 볼록 띠)
    px.r(2, 2, W - 3, 11, INK)
    b = band_r                                                   # 이름 띠: 3 ~ 10줄(16px) — 12px 글자가 숨 쉰다
    px.r(3, 3, W - 4, 10, b[3]); px.r(3, 3, W - 4, 3, b[5]); px.r(3, 4, W - 4, 4, b[4]); px.r(3, 10, W - 4, 10, b[2])
    px.r(3, 3, 3, 10, b[4])
    # 몸: 속은 비운다(카드 바탕) — 안쪽 테 먹 한 줄 + 그늘 한 줄
    px.r(3, 12, 3, H - 4, INK); px.r(W - 4, 12, W - 4, H - 4, INK); px.r(3, H - 4, W - 4, H - 4, INK)
    for y in range(12, H - 4):
        for x in range(4, W - 4):
            px.im.putpixel((x, y), (0, 0, 0, 0))
    # 리벳 (위 · 아래 귀퉁이 칸 안)
    rivet(px, 1, 12, fr) if False else None
    for x, y in ((1, 2), (W - 3, 2)):
        px.p(x, y, fr[6]) if x == 1 else px.p(x, y, fr[5])
    if lights is not None:
        ring = [(x, 1) for x in range(2, W - 2)] + [(W - 2, y) for y in range(2, H - 2)] + [(x, H - 2) for x in range(W - 3, 1, -1)] + [(1, y) for y in range(H - 3, 1, -1)]
        for k, (x, y) in enumerate(ring):
            if (k + lights) % 4 == 0:
                px.p(x, y, WHITE)
    if shimmer is not None:
        for x in range(3 + shimmer * 2, W - 3, 4):
            px.p(x, 1, WHITE)
    return px.im


# ───────── 가격표 12×12 (4) — 황동 미니 판 + 끈 구멍 ─────────
def price(tone):
    r = R[tone]
    px = Pix(12, 12)
    px.r(1, 0, 10, 10, INK); px.r(0, 1, 11, 9, INK)
    bevel(px, 1, 1, 10, 8, r, face=4)
    px.r(1, 9, 10, 9, r[1])
    px.p(2, 4, INK); px.p(2, 5, INK)
    return px.im


# ───────── 계기 상자 12×12 (4, fill) — 쇠틀 + 어두운 속 ─────────
def gauge():
    fr = R['iron']
    px = Pix(12, 12)
    px.r(0, 0, 11, 11, INK)
    px.r(1, 1, 10, 10, fr[3]); px.r(1, 1, 10, 1, fr[5]); px.r(1, 1, 1, 10, fr[4]); px.p(1, 1, fr[6])
    px.r(2, 10, 10, 10, fr[1]); px.r(10, 2, 10, 10, fr[2])
    px.r(3, 3, 8, 8, INK); px.r(4, 4, 7, 7, fr[1])
    return px.im


# ───────── 창 16×16 (5, fill) — 쇠 함 + 귀퉁이 리벳 ─────────
def panel():
    fr = R['iron']
    px = Pix(16, 16)
    px.r(0, 0, 15, 15, INK)
    px.r(1, 1, 14, 14, fr[3]); px.r(1, 1, 14, 1, fr[5]); px.r(1, 1, 1, 14, fr[4]); px.p(1, 1, fr[6])
    px.r(2, 14, 14, 14, fr[1]); px.r(14, 2, 14, 14, fr[2])
    px.r(4, 4, 11, 11, INK); px.r(5, 5, 10, 10, fr[1])
    for x, y in ((2, 2), (12, 2), (2, 12), (12, 12)):
        px.p(x, y, fr[6]); px.p(x + 1, y + 1, fr[1])
    return px.im


# ───────── 이름판 16×16 (5, fill) — 황동 끼운 판 + 귀퉁이 나사 ─────────
def plate():
    b, fr = R['brass'], R['iron']
    px = Pix(16, 16)
    px.r(1, 0, 14, 15, INK); px.r(0, 1, 15, 14, INK)
    px.r(1, 1, 14, 13, b[3])
    px.r(1, 1, 14, 1, b[6]); px.r(1, 2, 14, 2, b[5]); px.r(1, 3, 14, 3, b[4]); px.r(1, 1, 1, 12, b[5])
    px.r(1, 12, 14, 12, b[2]); px.r(14, 2, 14, 12, b[2]); px.r(1, 13, 14, 13, b[1]); px.r(1, 14, 14, 14, b[0])
    for x, y in ((2, 5), (12, 5)):
        px.p(x, y, b[6]); px.p(x + 1, y, b[2]); px.p(x, y + 1, b[2]); px.p(x + 1, y + 1, b[1])
    return px.im


# ───────── 우물 8×8 (3, fill) ─────────
def inset():
    fr = R['iron']
    px = Pix(8, 8)
    px.r(0, 0, 7, 7, fr[1])
    px.r(0, 0, 7, 0, INK); px.r(0, 0, 0, 7, INK); px.r(1, 1, 7, 1, fr[0]); px.r(1, 1, 1, 7, fr[0])
    px.r(1, 7, 7, 7, fr[4]); px.r(7, 1, 7, 7, fr[4])
    return px.im


# ───────── 성질 태그 10×10 (3, fill) — 색 미니 판 ─────────
OPS = {'add': '#2e969c', 'mul': '#ec6a1a'}
AXES = {'inf': '#9aa7b8', 'cav': '#5fc28a', 'king': '#f4d27a', 'chain': '#ff8a5a', 'push': '#7ab8ff', 'tactic': '#c9a0ff'}


def tag(base):
    r = ramp_from(base)
    px = Pix(10, 10)
    px.r(1, 0, 8, 9, INK); px.r(0, 1, 9, 8, INK)
    px.r(1, 1, 8, 7, r[4])
    px.r(1, 1, 8, 1, r[6]); px.r(1, 1, 1, 6, r[5]); px.r(2, 7, 8, 7, r[2]); px.r(8, 2, 8, 7, r[2])
    px.r(1, 8, 8, 8, r[1])
    return px.im


# ───────── 손패 카드 머리판 16×16 (4, fill) — E 쇠틀 + 왼쪽 기물 색 띠 (kit/mag-<기물>) ─────────
def mag(tone):
    fr = R['iron']
    tr = ramp_from(tone)
    px = Pix(16, 16)
    px.r(1, 0, 14, 15, INK); px.r(0, 1, 15, 14, INK)
    px.r(1, 1, 14, 14, fr[3])
    px.r(1, 1, 14, 1, fr[5]); px.p(1, 1, fr[6])
    px.r(1, 1, 1, 14, tr[5]); px.r(2, 2, 2, 14, tr[3])          # 기물 색 띠 (빛 · 그늘)
    px.r(14, 2, 14, 14, fr[2]); px.r(3, 14, 14, 14, fr[1])
    px.r(3, 3, 12, 12, INK)                                      # 끼운 판 테
    px.r(4, 4, 11, 11, fr[2]); px.r(4, 4, 11, 4, fr[4]); px.r(4, 4, 4, 11, fr[3]); px.r(5, 11, 11, 11, fr[1])
    px.p(13, 2, fr[6]); px.p(13, 3, fr[1])                       # 오른위 리벳
    return px.im


def main():
    card('iron', R['iron']).save(f'{KIT}/card-common.png')
    for ph in range(2):
        card('sky', R['sky'], shimmer=ph).save(f'{KIT}/card-rare-{ph}.png')
    for ph in range(4):
        card('brass', R['brass'], lights=ph).save(f'{KIT}/card-gold-{ph}.png')
    price('brass').save(f'{KIT}/price-tag.png'); price('iron').save(f'{KIT}/price-tag-poor.png')
    gauge().save(f'{KIT}/gauge.png')
    panel().save(f'{CHROME}/panel.png')
    plate().save(f'{CHROME}/plate.png')
    inset().save(f'{CHROME}/inset.png')
    import runpy as _rp
    tones = _rp.run_path(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'draw-hud.py'), run_name='lib')['TONES']
    for k, c in tones.items():
        mag(c).save(f'{KIT}/mag-{k}.png')
    for k, c in AXES.items():
        tag(c).save(f'{KIT}/tag-{k}.png')
    for k, c in OPS.items():  # 합 · 곱 표지도 성질 태그와 같은 판 (D-304 — 사용자: 「가격표 · 보병 기병 태그와 크기 · 디자인을 맞춰라」)
        tag(c).save(f'{KIT}/tag-{k}.png')
    print('ok')


if __name__ == '__main__':
    main()
