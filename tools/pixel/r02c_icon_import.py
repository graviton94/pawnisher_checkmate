"""
받은 R-02c 두 장 반입 (D-423 · D-549): B 「태엽 감긴 종이왕」 = 앱 아이콘 · A 「그림자 왕」 = 스토어 키아트(보관만).
  python3 -I tools/pixel/r02c_icon_import.py
    → build-res/icon-src/B-full.png (62×61도트, 도트 1칸 = 1px, 불투명 원본 그대로)
      build-res/icon-src/B-fg.png   (전경: 종이왕 · 왕관 · 태엽 열쇠, 바탕 투명)
      build-res/icon-src/B-bg.png   (바탕: 어두운 바탕 + 진홍 계단 후광 — 가려진 후광 칸을 채운 판)
      build-res/store/keyart-A.png  (104×104도트 — 게임에서 쓰지 않는다, 스토어 캡슐 · 피처 그래픽 바탕 재료)
      build-res/order/R-02c-check.png (대조판: 원본 | 복원 도트 확대 | 전경 · 바탕 나눔)
그다음 python3 -I tools/app_icon.py · python3 -I tools/android-res.py 가 정수배로 아이콘을 찍는다.

격자는 scene_recipe.R02C_GRID(축마다 실측):
  ① 칸 가운데 최빈색(snap.snap, 축마다 다른 균일 격자 — 반 칸이 안 되는 끝 자투리는 버린다)
  ② 실측 팔레트로 맞춤(가장 가까운 색 — 섞지 않는다)
  ③ B 나눔: 바탕색 · 진홍 두 단이 아닌 칸 = 전경. 바탕 층의 가려진 칸은 보이는 진홍 경계(바깥 · 안)에 맞춘 원으로 채운다.
"""
import math
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
import scene_recipe  # noqa: E402
import snap  # noqa: E402

ORDER = os.path.join(ROOT, 'build-res', 'order')
ICON = os.path.join(ROOT, 'build-res', 'icon-src')
STORE = os.path.join(ROOT, 'build-res', 'store')


def hexrgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


def cuts(n, p, o):
    """한 축 칸 경계: 위상 o부터 간격 p. 앞뒤 자투리는 반 칸 이상일 때만 칸으로 친다"""
    o = o % p
    e = [o - p if o >= p / 2 else o]
    while e[-1] + p <= n + 1e-6:
        e.append(e[-1] + p)
    if n - e[-1] >= p / 2:
        e.append(e[-1] + p)
    return [max(0.0, min(float(n), v)) for v in e]


def restore(name):
    """원본 → 도트 1칸 = 1px (팔레트 맞춤까지). 반환 (원본, 도트)"""
    g = scene_recipe.R02C_GRID[name]
    img = Image.open(os.path.join(ORDER, g['source'])).convert('RGB')
    px, ox, py, oy = g['grid']
    small = snap.snap(img, px, ox, py, oy, 0, cuts=(cuts(img.width, px, ox), cuts(img.height, py, oy))).convert('RGB')
    pal = np.array([hexrgb(h) for h in g['palette']], dtype=float)
    a = np.asarray(small, dtype=float)
    idx = np.argmin((((a[:, :, None, :] - pal[None, None]) ** 2) * (3, 4, 2)).sum(3), 2)
    return img, Image.fromarray(pal[idx].astype(np.uint8), 'RGB')


def _fit_circle(pts):
    """최소제곱 원 (cx, cy, r)"""
    p = np.array(pts, dtype=float)
    A = np.c_[2 * p[:, 0], 2 * p[:, 1], np.ones(len(p))]
    b = (p ** 2).sum(1)
    cx, cy, c = np.linalg.lstsq(A, b, rcond=None)[0]
    return cx, cy, math.sqrt(c + cx * cx + cy * cy)


def split_b(full):
    """B를 전경(투명 바탕) · 바탕(바탕색 + 진홍 계단 후광, 가려진 칸 채움)으로 나눈다"""
    g = scene_recipe.R02C_GRID['B']
    bg, (h_out, h_in) = hexrgb(g['bg']), [hexrgb(h) for h in g['halo']]
    W, H = full.size
    q = full.load()
    lay = {bg: 0, h_out: 1, h_in: 2}  # 바탕 층 단계: 0 바탕 · 1 바깥 진홍 · 2 안 진홍
    level = [[lay.get(q[x, y], -1) for x in range(W)] for y in range(H)]  # -1 = 전경
    # 계단 경계 칸: 바깥 진홍 ↔ 바탕, 안 진홍 ↔ 바깥 진홍 (보이는 칸끼리만) — 칸 가운데를 이은 경계점
    outer, inner = [], []
    for y in range(H):
        for x in range(W):
            for dx, dy in ((1, 0), (0, 1)):
                x2, y2 = x + dx, y + dy
                if x2 >= W or y2 >= H:
                    continue
                a, b = level[y][x], level[y2][x2]
                pt = (x + 0.5 + dx / 2, y + 0.5 + dy / 2)
                if {a, b} == {0, 1}:
                    outer.append(pt)
                elif {a, b} == {1, 2}:
                    inner.append(pt)
    co, ci = _fit_circle(outer), _fit_circle(inner)

    def model(x, y):
        """맞춘 두 원으로 본 바탕 층 단계와, 두 계단 경계(바탕|바깥 · 바깥|안)까지 거리(도트)"""
        do = math.hypot(x + 0.5 - co[0], y + 0.5 - co[1]) - co[2]
        di = math.hypot(x + 0.5 - ci[0], y + 0.5 - ci[1]) - ci[2]
        return (2 if di <= 0 else (1 if do <= 0 else 0)), (abs(do), abs(di))

    # 생성기 낱점 걷기 (원본 full도 같이 고쳐 전경 + 바탕 = full):
    #  · 바탕 층 칸이 원 모형과 단계가 다르면 모형 단계로 (후광 속 바탕색 낱점 등) — 단, 이웃 단계이고 그 둘 사이 계단 경계에서
    #    1.5도트 안이면 받은 계단 모양 그대로 둔다
    #  · 전경 칸이 여덟 이웃에 전경이 없으면(외딴 낱점) 모형 단계로
    inv = {v: k for k, v in lay.items()}
    specks = 0
    for y in range(H):
        for x in range(W):
            v = level[y][x]
            m, (do, di) = model(x, y)
            if v >= 0:
                if v == m or ({v, m} == {0, 1} and do <= 1.5) or ({v, m} == {1, 2} and di <= 1.5):
                    continue
            else:
                n8 = [level[y + dy][x + dx] for dx in (-1, 0, 1) for dy in (-1, 0, 1)
                      if (dx or dy) and 0 <= x + dx < W and 0 <= y + dy < H]
                if -1 in n8:
                    continue
            level[y][x] = m
            q[x, y] = inv[m]
            specks += 1
    fg = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    back = full.copy()
    f, bq = fg.load(), back.load()
    filled = 0
    for y in range(H):
        for x in range(W):
            if level[y][x] >= 0:
                continue
            f[x, y] = (*q[x, y], 255)
            bq[x, y] = inv[model(x, y)[0]]
            filled += 1
    return fg, back.convert('RGBA'), co, ci, filled, specks


def main():
    os.makedirs(ICON, exist_ok=True)
    os.makedirs(STORE, exist_ok=True)
    src_b, b = restore('B')
    src_a, a = restore('A')
    # 가장자리 한 줄이 바탕색이 아니면(생성기 얼룩) 바탕색으로 — 정사각 캔버스로 바탕을 이어 붙일 때 이음매가 없게
    bgc = hexrgb(scene_recipe.R02C_GRID['B']['bg'])
    q = b.load()
    edge = 0
    for y in range(b.height):
        for x in range(b.width):
            if (x in (0, b.width - 1) or y in (0, b.height - 1)) and q[x, y] != bgc:
                q[x, y] = bgc
                edge += 1
    fg, back, co, ci, filled, specks = split_b(b)
    b.save(os.path.join(ICON, 'B-full.png'))
    fg.save(os.path.join(ICON, 'B-fg.png'))
    back.save(os.path.join(ICON, 'B-bg.png'))
    a.save(os.path.join(STORE, 'keyart-A.png'))
    print(f'R-02c B: {b.size[0]}×{b.size[1]}도트 · 색 {len(b.getcolors())} · 가장자리 바탕색 맞춤 {edge}칸 · 전경 상자 {fg.getbbox()}')
    print(f'  후광 바깥 원 중심 ({co[0]:.2f}, {co[1]:.2f}) r {co[2]:.2f} · 안 원 ({ci[0]:.2f}, {ci[1]:.2f}) r {ci[2]:.2f} · 가려진 칸 채움 {filled} · 낱점 걷음 {specks}')
    print(f'R-02c A: {a.size[0]}×{a.size[1]}도트 · 색 {len(a.getcolors())}')
    # 대조판
    rows = []
    for src, dots in ((src_b, b), (src_a, a)):
        k = max(1, 600 // dots.width)
        rows.append((src.resize((600, 600), Image.LANCZOS), dots.resize((dots.width * k, dots.height * k), Image.NEAREST)))
    k = 8
    split = Image.new('RGB', (b.width * k * 2 + 10, b.height * k), (60, 60, 70))
    chk_fg = Image.new('RGBA', (b.width * k, b.height * k), (255, 0, 255, 255))
    chk_fg.alpha_composite(fg.resize((b.width * k, b.height * k), Image.NEAREST))
    split.paste(chk_fg.convert('RGB'), (0, 0))
    split.paste(back.convert('RGB').resize((b.width * k, b.height * k), Image.NEAREST), (b.width * k + 10, 0))
    W = 10 + max(r[0].width + r[1].width + 30 for r in rows)
    W = max(W, split.width + 20)
    Ht = sum(max(r[0].height, r[1].height) + 10 for r in rows) + split.height + 20
    chk = Image.new('RGB', (W, Ht), (60, 60, 70))
    y = 10
    for o, d in rows:
        chk.paste(o, (10, y))
        chk.paste(d, (o.width + 30, y))
        y += max(o.height, d.height) + 10
    chk.paste(split, (10, y))
    d = ImageDraw.Draw(chk)
    d.text((14, 14), 'source (Lanczos view)', fill=(255, 255, 255))
    chk.save(os.path.join(ORDER, 'R-02c-check.png'))
    print('대조판 build-res/order/R-02c-check.png', chk.size)


if __name__ == '__main__':
    main()
