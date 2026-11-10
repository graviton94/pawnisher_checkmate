"""
죽음 되감기 「초월」 도트 부품 (2026-11-05, 사용자: 「다시 살아나는 빛이 구리다」).
흰 막대 · 사각 테 대신 우리 문법대로 코드로 찍은 도트 스프라이트 — 단색 칸 · 검은 바깥선 · 디더로 꺼짐 · steps 프레임.
  revive-beam.png  빛기둥 단면 8장 (가로 24도트 × 세로 2도트, 세로로 반복해 깐다): 가는 섬광 → 굵은 흰 심지 + 금 테 → 금빛으로 식으며 체크 디더로 흩어짐
  revive-burst.png 착지 폭발 8장 (48×48도트): 여덟 갈래 빛살 + 톱니 고리가 퍼졌다가 디더로 꺼짐
  revive-cog.png   작은 황동 톱니 파편 2장 (7×7도트, 회전 두 자세)
출력: src/assets/ui/kit/  ·  사용: python3 -I tools/pixel/revive_fx.py
"""
import math
import os

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'src', 'assets', 'ui', 'kit')

INK = (11, 11, 14, 255)
WHITE = (244, 241, 234, 255)
CREAM = (255, 236, 176, 255)
GOLD = (244, 210, 122, 255)
BRASS = (200, 155, 60, 255)
DARK_BRASS = (122, 84, 28, 255)
CLEAR = (0, 0, 0, 0)


def beam():
    """빛기둥 단면: 프레임마다 (심지 반폭, 테 두께, 디더 단계, 심지 색)"""
    W, H, N = 24, 2, 8
    frames = [(1, 0, 0, WHITE), (5, 2, 0, WHITE), (8, 3, 0, WHITE), (9, 3, 0, CREAM), (8, 3, 1, GOLD), (6, 3, 1, GOLD), (4, 2, 2, BRASS), (2, 1, 3, BRASS)]
    im = Image.new('RGBA', (W * N, H), CLEAR)
    cx = W // 2
    for f, (core, rim, dither, col) in enumerate(frames):
        for y in range(H):
            for x in range(W):
                d = abs(x + 0.5 - cx)
                c = CLEAR
                if d <= core:
                    c = col
                elif d <= core + rim:
                    c = GOLD if col in (WHITE, CREAM) else BRASS
                elif d <= core + rim + 1 and rim:
                    c = INK
                # 디더: 1단계 = 테만 체크, 2단계 = 전체 체크, 3단계 = 4칸에 하나
                if c != CLEAR and dither:
                    chk = (x + y) % 2 == 0
                    if dither == 1 and d > core and not chk:
                        c = CLEAR
                    elif dither == 2 and not chk:
                        c = CLEAR
                    elif dither == 3 and not (x % 2 == 0 and y % 2 == 0):
                        c = CLEAR
                im.putpixel((f * W + x, y), c)
    im.save(os.path.join(OUT, 'revive-beam.png'))


def burst():
    """착지 폭발: 여덟 갈래 빛살(길어졌다 짧아짐) + 퍼지는 톱니 고리"""
    S, N = 48, 8
    im = Image.new('RGBA', (S * N, S), CLEAR)
    c = S / 2
    ray_len = [6, 14, 20, 22, 21, 18, 14, 10]
    ring_r = [4, 7, 10, 13, 15, 17, 19, 21]
    dither = [0, 0, 0, 0, 1, 1, 2, 3]
    for f in range(N):
        layer = Image.new('RGBA', (S, S), CLEAR)
        px = layer.load()

        def put(x, y, col):
            if 0 <= x < S and 0 <= y < S:
                px[x, y] = col
        # 빛살: 가로세로 넷은 굵게(3), 대각 넷은 가늘게(1)
        for k in range(8):
            a = k * math.pi / 4
            thick = 1 if k % 2 == 0 else 0
            L = ray_len[f] * (1 if k % 2 == 0 else 0.7)
            for t in range(2, int(L)):
                x = c + math.cos(a) * t
                y = c + math.sin(a) * t
                col = WHITE if t < L * 0.55 else GOLD
                for o in range(-thick, thick + 1):
                    ox, oy = (-math.sin(a) * o, math.cos(a) * o)
                    put(int(x + ox), int(y + oy), col)
        # 톱니 고리: 원 위에 이 12개
        r = ring_r[f]
        for i in range(360):
            a = math.radians(i)
            tooth = (i // 15) % 2 == 0
            rr = r + (1 if tooth else 0)
            put(int(c + math.cos(a) * rr), int(c + math.sin(a) * rr), BRASS if f > 3 else GOLD)
        # 가운데 섬광 (처음 세 장)
        if f < 3:
            for y in range(S):
                for x in range(S):
                    if (x - c + 0.5) ** 2 + (y - c + 0.5) ** 2 <= (3 + f * 2) ** 2:
                        px[x, y] = WHITE
        # 디더로 꺼짐
        if dither[f]:
            for y in range(S):
                for x in range(S):
                    keep = (x + y) % 2 == 0 if dither[f] == 1 else ((x + y) % 2 == 0 and y % 2 == 0) if dither[f] == 2 else (x % 3 == 0 and y % 3 == 0)
                    if not keep:
                        px[x, y] = CLEAR
        # 검은 바깥선
        out = layer.copy()
        op = out.load()
        for y in range(S):
            for x in range(S):
                if px[x, y][3] == 0 and any(0 <= x + dx < S and 0 <= y + dy < S and px[x + dx, y + dy][3] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                    op[x, y] = INK
        im.paste(out, (f * S, 0))
    im.save(os.path.join(OUT, 'revive-burst.png'))


def cog():
    """작은 황동 톱니 7×7 — 두 자세(이 위치가 반 칸 돌았다)"""
    A = [
        '..#.#..',
        '.#ooo#.',
        '#oo.oo#',
        '.o...o.',
        '#oo.oo#',
        '.#ooo#.',
        '..#.#..',
    ]
    B = [
        '.#...#.',
        '#oo#oo#',
        '.o...o.',
        '.#...#.',
        '.o...o.',
        '#oo#oo#',
        '.#...#.',
    ]
    im = Image.new('RGBA', (14, 7), CLEAR)
    for f, g in enumerate((A, B)):
        for y, row in enumerate(g):
            for x, ch in enumerate(row):
                col = {'#': INK, 'o': GOLD}.get(ch)
                if col:
                    im.putpixel((f * 7 + x, y), col)
        # 빛: 왼쪽 위는 밝게, 오른쪽 아래는 어둡게
        for y in range(7):
            for x in range(7):
                if im.getpixel((f * 7 + x, y)) == GOLD and x + y >= 8:
                    im.putpixel((f * 7 + x, y), BRASS)
                if im.getpixel((f * 7 + x, y)) == BRASS and x + y >= 10:
                    im.putpixel((f * 7 + x, y), DARK_BRASS)
    im.save(os.path.join(OUT, 'revive-cog.png'))


if __name__ == '__main__':
    beam()
    burst()
    cog()
    print('src/assets/ui/kit/revive-{beam,burst,cog}.png')
