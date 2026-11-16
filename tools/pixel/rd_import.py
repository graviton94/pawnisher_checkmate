"""RD-01 약점 딱지 반입 (D-527 · D-423 실제 실행): 생성기 원본(마젠타 바탕) → public/ui/board/chip-weak.png 16×16 이진 알파.

  python3 -I tools/pixel/rd_import.py [원본=build-res/order/RD-01-source.png]

- 상자 = 마젠타가 아닌 칸의 바깥 상자(철판 명패 16×16 가득 — 발주). 간격 = 상자 / 16, 칸마다 칸 전체의 가중 최빈색(W).
- 색 = 발주 팔레트(먹 · 쇠 셋 · 진홍 셋)에서 가장 가까운 색. 마젠타 칸은 투명.
- 대조판 build-res/order/RD-01-check.png: 원본(축소) | 결과 ×16.
"""
import os
import sys

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PAL = ['#0B0B0E', '#6E717E', '#484A55', '#26272E', '#7A1E1E', '#D0453A', '#F87171']
N = 16
# 받은 원본은 16도트가 아니라 약 32도트(간격 약 34px)로 그려져 16칸 한 칸에 원본 2×2가 든다 — 가는 방패 먹선 · 진홍 금이
# 최빈색에서 쇠에 지므로 먹 · 진홍을 무겁게 센다(쇠 1 · 먹 2.2 · 진홍 2.6)
W = np.array([2.2, 1, 1, 1, 2.6, 2.6, 2.6])


def rgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


def main(src):
    a = np.array(Image.open(src).convert('RGB')).astype(int)
    key = (a[..., 0] > 150) & (a[..., 2] > 150) & (a[..., 1] < 120)
    ys, xs = np.nonzero(~key)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    py, px = (y1 - y0) / N, (x1 - x0) / N
    pal = np.array([rgb(h) for h in PAL])
    out = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    for j in range(N):
        for i in range(N):
            ya, yb = int(y0 + j * py), int(y0 + (j + 1) * py)
            xa, xb = int(x0 + i * px), int(x0 + (i + 1) * px)
            blk = a[ya:yb, xa:xb].reshape(-1, 3)
            kb = key[ya:yb, xa:xb].ravel()
            if kb.mean() > 0.5:
                continue
            blk = blk[~kb]
            idx = ((blk[:, None, :] - pal[None]) ** 2).sum(-1).argmin(-1)
            c = pal[(np.bincount(idx, minlength=len(pal)) * W).argmax()]
            out.putpixel((i, j), tuple(int(v) for v in c) + (255,))
    dst = os.path.join(ROOT, 'public/ui/board/chip-weak.png')
    out.save(dst)
    big = out.resize((N * 16, N * 16), Image.NEAREST)
    o = Image.open(src).convert('RGB').resize((N * 16, N * 16), Image.LANCZOS)
    chk = Image.new('RGB', (N * 32 + 8, N * 16), (24, 23, 30))
    chk.paste(o, (0, 0))
    chk.paste(big, (N * 16 + 8, 0), big)
    chk.save(os.path.join(ROOT, 'build-res/order/RD-01-check.png'))
    cols = out.getcolors()
    print(dst, f'간격 {px:.1f}×{py:.1f}px · 상자 {x1 - x0}×{y1 - y0} · 색 {len(cols)}')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'build-res/order/RD-01-source.png'))
