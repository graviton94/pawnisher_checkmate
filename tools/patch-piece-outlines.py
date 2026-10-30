"""
기물 외곽선 패치 (D-051): 사용자 기물 그림의 속(몸통 색·무늬)은 그대로 두고 테두리만 고르게 다시 두른다.
원본은 검정 테두리가 1~3도트로 제각각, 흰 테두리도 얇았다 두꺼웠다 했다.
실루엣(원래 도트 계단 그대로)은 두고, 검정이 얇은 곳만 안쪽으로 일정 굵기까지 채우고, 흰 테두리는 실루엣 바깥으로 일정한 굵기로 다시 두른다 (네모 거리 — 모서리가 각지게).
원본은 build-res/pieces-original/에 두고 거기서 읽으므로 몇 번 돌려도 같은 결과다.

사용: python3 -I tools/patch-piece-outlines.py
"""
import glob
import os
from collections import deque

import numpy as np
from PIL import Image

SRC, OUT = 'build-res/pieces-original', 'public/pieces'
INK = (0x0B, 0x0B, 0x0E)
RIM = (0xF4, 0xF1, 0xEA)
NB4 = ((1, 0), (-1, 0), (0, 1), (0, -1))
# 테두리 굵기 (px, 검정 최소 · 흰): 원래 그림들의 테두리 굵기 중앙값 근처 — 세트 안 12장이 모두 같다
THICK = {'s': (4, 4), 'l': (8, 5)}


def grow(m, n=1):
    for _ in range(n):
        g = m.copy()
        g[1:] |= m[:-1]; g[:-1] |= m[1:]; g[:, 1:] |= m[:, :-1]; g[:, :-1] |= m[:, 1:]
        m = g
    return m


def dist_from(src, reach):
    """src에서 네모 거리 (체비셰프 — 도트 그림처럼 모서리가 각지게 남는다). reach px 안쪽만 잰다"""
    edge = src & ~(np.roll(src, 1, 0) & np.roll(src, -1, 0) & np.roll(src, 1, 1) & np.roll(src, -1, 1))
    ys, xs = np.nonzero(edge)
    d = np.where(src, 0.0, np.inf)
    cy, cx = np.nonzero(grow(src, int(np.ceil(reach)) + 1) & ~src)
    best = np.full(len(cy), np.inf)
    for k in range(0, len(ys), 256):
        dy = cy[:, None] - ys[None, k:k + 256]
        dx = cx[:, None] - xs[None, k:k + 256]
        best = np.minimum(best, np.maximum(np.abs(dy), np.abs(dx)).min(1))
    d[cy, cx] = best
    return d


def patch(path):
    a = np.asarray(Image.open(path).convert('RGBA')).copy()
    h, w = a.shape[:2]
    lum = a[..., :3].astype(int).mean(-1)
    solid = a[..., 3] > 128
    ink = solid & (lum < 30)
    # 바깥: 검정을 2px 부풀려 막고 가장자리에서 채운 뒤, 막느라 남긴 틈만 되돌린다 (비숍 틈으로 새지 않게)
    wall = grow(ink, 2)
    outer = np.zeros((h, w), bool)
    q = deque((y, x) for y in range(h) for x in range(w) if (y in (0, h - 1) or x in (0, w - 1)) and not wall[y, x])
    for y, x in q:
        outer[y, x] = True
    while q:
        y, x = q.popleft()
        for dy, dx in NB4:
            Y, X = y + dy, x + dx
            if 0 <= Y < h and 0 <= X < w and not outer[Y, X] and not wall[Y, X]:
                outer[Y, X] = True
                q.append((Y, X))
    for _ in range(3):
        outer = grow(outer) & ~ink
    inside = ~outer & (solid | ink)  # 원래 실루엣 (도트 계단이 깔끔하다 — 그대로 쓴다)
    tb, tw = THICK[os.path.basename(path)[0]]
    din = dist_from(outer, tb + 1)  # 실루엣 가장자리에서 안쪽으로 잰 거리
    dout = dist_from(inside, tw + 1)  # 실루엣에서 바깥으로 잰 거리
    out = np.zeros_like(a)
    out[inside] = a[inside]
    out[inside, 3] = 255
    # 검정: 얇은 곳만 안쪽으로 tb까지 채운다 (두꺼운 곳·속 무늬는 원래대로)
    out[inside & (din <= tb)] = (*INK, 255)
    # 흰 테두리: 실루엣 바깥으로 정확히 tw (반 도트로 흐리던 원래 흰 테두리는 버린다)
    out[~inside & (dout <= tw)] = (*RIM, 255)
    clipped = int(((~inside & (dout <= tw)) & ((np.arange(h)[:, None] == 0) | (np.arange(h)[:, None] == h - 1) | (np.arange(w)[None] == 0) | (np.arange(w)[None] == w - 1))).sum())
    return Image.fromarray(out, 'RGBA'), clipped


for src in sorted(glob.glob(f'{SRC}/*.png')):
    im, clipped = patch(src)
    im.save(os.path.join(OUT, os.path.basename(src)))
    if clipped:
        print(os.path.basename(src), '가장자리에 닿은 테두리 도트', clipped)
print('ok')
