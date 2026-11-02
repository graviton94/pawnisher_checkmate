"""
메인 화면 문장 (D-188): 우리 흰 폰(64칸 정본 그대로)을 크고 붉은 대각선 칼자국이 가른다 — 아이콘과 같은 도트 규칙.
  · 80칸 캔버스 가운데 폰(64칸) · 칼자국은 오른위 → 왼아래로 캔버스를 넘나드는 길이
  · 칼자국: 가운데 굵고 양끝 가늘어지는 칼날 꼴(사인), 흰 심 → 진홍 → 검붉은 가장자리 → 검정 외곽선 1칸
  · 폰과 칼자국은 따로 내보낸다 (연출에서 칼자국이 그어지고 폰이 두 동강으로 어긋난다)
사용: python3 -I tools/pixel/title-slash.py   →  public/ui/title-pawn.png · public/ui/title-slash.png (80×80) + build-res/title-emblem-preview.png
"""
import math
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import maker  # noqa: E402

N = 80
A = (77.0, 3.0)   # 칼자국 시작 (오른위)
B = (3.0, 77.0)   # 끝 (왼아래)
MAXW = 5.4        # 가운데 반폭 (칸)
COL = {'core': (255, 255, 255, 255), 'hot': (255, 214, 214, 255), 'red': (229, 38, 47, 255), 'deep': (122, 18, 24, 255), 'out': (11, 11, 14, 255)}


def slash():
    im = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    px = im.load()
    ax, ay = A
    bx, by = B
    L = math.hypot(bx - ax, by - ay)
    ux, uy = (bx - ax) / L, (by - ay) / L
    for y in range(N):
        for x in range(N):
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
                if 0 <= x + dx < N and 0 <= y + dy < N and px[x + dx, y + dy][3] == 0:
                    px[x + dx, y + dy] = COL['out']
        for dy in range(sz):
            for dx in range(sz):
                if 0 <= x + dx < N and 0 <= y + dy < N:
                    px[x + dx, y + dy] = COL['red']
    return im


def pawn():
    hi = maker.load64()
    p = maker.render64(hi[('P', 0)], 0).convert('RGBA')
    if p.size != (64, 64):
        p = p.resize((64, 64), Image.NEAREST)
    im = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    im.alpha_composite(p, (8, 8))
    return im


if __name__ == '__main__':
    pw, sl = pawn(), slash()
    pw.save('public/ui/title-pawn.png')
    sl.save('public/ui/title-slash.png')
    prev = Image.new('RGBA', (N, N), (36, 35, 44, 255))
    prev.alpha_composite(pw)
    prev.alpha_composite(sl)
    prev.resize((N * 4, N * 4), Image.NEAREST).save('build-res/title-emblem-preview.png')
    print('public/ui/title-pawn.png · title-slash.png', pw.size)
