"""
메인 화면 문장 (D-188): **실제 타이틀 로고의 왕관 쓴 폰 문장**(title-logo 윗부분)을 크고 붉은 대각선 칼자국이 가른다 — 아이콘과 같은 도트 규칙.
  · 문장의 가는 붉은 칼자국은 지우고, 같은 각도로 굵은 도트 칼자국을 새로 긋는다
  · 80칸 캔버스 가운데 폰(64칸) · 칼자국은 오른위 → 왼아래로 캔버스를 넘나드는 길이
  · 칼자국: 가운데 굵고 양끝 가늘어지는 칼날 꼴(사인), 흰 심 → 진홍 → 검붉은 가장자리 → 검정 외곽선 1칸
  · 폰과 칼자국은 따로 내보낸다 (연출에서 칼자국이 그어지고 폰이 두 동강으로 어긋난다)
사용: python3 -I tools/pixel/title-slash.py   →  public/ui/title-pawn.png(문장) · public/ui/title-slash.png (같은 크기) + build-res/title-emblem-preview.png
"""
import math
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import maker  # noqa: E402

PAD = 14
LOGO = 'public/ui/title-logo.png'
CREST_H = 96            # 로고에서 문장(왕관 · 폰) 부분 높이
_lg = Image.open(LOGO)
W, H = _lg.width + PAD * 2, CREST_H + PAD * 2
N = max(W, H)
# 원래 가는 칼자국: y = -0.943x + 135.68 (로고 좌표) — 같은 각도로 문장 밖까지 길게
def _ly(x):
    return -0.943 * x + 135.68
A = (138.0 + PAD, _ly(138.0) + PAD)   # 오른위 (문장 밖)
B = (36.0 + PAD, _ly(36.0) + PAD)     # 왼아래 (문장 밖)
MAXW = 5.6        # 가운데 반폭 (칸)
COL = {'core': (255, 255, 255, 255), 'hot': (255, 214, 214, 255), 'red': (229, 38, 47, 255), 'deep': (122, 18, 24, 255), 'out': (11, 11, 14, 255)}


def slash():
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    px = im.load()
    ax, ay = A
    bx, by = B
    L = math.hypot(bx - ax, by - ay)
    ux, uy = (bx - ax) / L, (by - ay) / L
    for y in range(H):
        for x in range(W):
            cx, cy = x + 0.5 - ax, y + 0.5 - ay
            t = (cx * ux + cy * uy) / L          # 0 ~ 1 길이 방향
            if t < 0 or t > 1:
                continue
            d = abs(cx * -uy + cy * ux)          # 선에서의 거리
            # 칼날 꼴 + 들쭉날쭉한 베인 가장자리 (길이 방향 2칸마다 ±0.9칸)
            jag = ((int(t * L / 2) * 7919) % 13) / 13 - 0.5
            w = MAXW * math.sin(math.pi * t) ** 0.6 + jag * 1.8 * math.sin(math.pi * t)
            if w < 0.5:
                continue
            if d <= w * 0.16:
                c = 'core'
            elif d <= w * 0.34:
                c = 'hot'
            elif d <= w * 0.85:
                c = 'red'
            elif d <= w:
                c = 'deep'
            elif d <= w + 1.0:
                c = 'out'
            else:
                continue
            px[x, y] = COL[c]
    # 튄 핏방울 도트 (칼자국 둘레 몇 칸 떨어져, 외곽선 포함 2×2)
    import random
    rnd = random.Random(7)
    for k in range(9):
        t = rnd.uniform(0.15, 0.85)
        side = rnd.choice((-1, 1))
        off = MAXW * math.sin(math.pi * t) + rnd.uniform(3, 7)
        x = int(ax + (bx - ax) * t + -uy * side * off)
        y = int(ay + (by - ay) * t + ux * side * off)
        sz = rnd.choice((1, 2, 2))
        for dy in range(-1, sz + 1):
            for dx in range(-1, sz + 1):
                if 0 <= x + dx < W and 0 <= y + dy < H and px[x + dx, y + dy][3] == 0:
                    px[x + dx, y + dy] = COL['out']
        for dy in range(sz):
            for dx in range(sz):
                if 0 <= x + dx < W and 0 <= y + dy < H:
                    px[x + dx, y + dy] = COL['red']
    return im


def pawn():
    """실제 타이틀 로고의 문장 — 가는 붉은 칼자국(진홍 · 검붉은 도트)은 지운다"""
    crest = _lg.convert('RGBA').crop((0, 0, _lg.width, CREST_H))
    px = crest.load()
    for y in range(crest.height):
        for x in range(crest.width):
            r, g, b, a = px[x, y]
            if a and r > 100 and g < 90:
                px[x, y] = (0, 0, 0, 0)
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    im.alpha_composite(crest, (PAD, PAD))
    return im


if __name__ == '__main__':
    pw, sl = pawn(), slash()
    pw.save('public/ui/title-pawn.png')
    sl.save('public/ui/title-slash.png')
    prev = Image.new('RGBA', (W, H), (36, 35, 44, 255))
    prev.alpha_composite(pw)
    prev.alpha_composite(sl)
    prev.resize((W * 3, H * 3), Image.NEAREST).save('build-res/title-emblem-preview.png')
    print('public/ui/title-pawn.png · title-slash.png', pw.size)
