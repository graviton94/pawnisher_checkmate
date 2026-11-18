"""
로고 L1 「주물 명판」 반입 (LG-01a · b · c, D-423 · D-552 · D-568).

받은 그림 → build-res/order/LG-01{a,b,c}-source.png(바이트 그대로) → 축마다 실측한 격자(scene_recipe.LOGO_GRID)로
칸 가운데 최빈색 → 발주서 팔레트(15색 · 글자만은 9색)에 맞춤 → 바깥(흰 둘레 · 투명 둘레)을 알파 0으로 →
가장자리 1도트를 먹(#0B0B0E)으로 닫는다. 결과는 도트 1칸 = 1px.

  python3 -I tools/pixel/logo_import.py import <LG-01a 원본> <LG-01b 원본> <LG-01c 원본>   (원본을 build-res/order에 복사)
  python3 -I tools/pixel/logo_import.py build      → build-res/logo/LG-01{a,b,c}.png · public/ui/title-word.png(= LG-01b)
  python3 -I tools/pixel/logo_import.py measure    → 레시피 상자에서 다시 잰 값(기록과 3% 넘게 다르면 알린다)
"""
import os
import shutil
import sys
from collections import deque

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
import gridmeasure  # noqa: E402
import scene_recipe  # noqa: E402

ORDER = os.path.join(ROOT, 'build-res', 'order')
OUT = os.path.join(ROOT, 'build-res', 'logo')
NAMES = ('LG-01a', 'LG-01b', 'LG-01c')

INK = (0x0B, 0x0B, 0x0E)
STEEL = ['#17171E', '#24232B', '#33313B', '#56545E', '#8A8794']
BRASS = ['#4A3414', '#8A6416', '#C89B3C', '#F5C542', '#FFF3C4']
MOLTEN = ['#7A1218', '#B63735', '#E07A2A', '#F4D27A']


def _rgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


# 발주서 LG-01 팔레트: 명판 둘(a · c) = 15색, 글자만(b) = 9색
PAL15 = [INK] + [_rgb(c) for c in STEEL + BRASS + MOLTEN]
PAL9 = [INK] + [_rgb(c) for c in BRASS + MOLTEN[1:]]


def src_path(name):
    return os.path.join(ORDER, f'{name}-source.png')


def white_bg_alpha(img, thr=200):
    """흰 둘레를 바깥에서부터 메워 알파 0으로 (그림 안의 밝은 황동은 둘레와 이어지지 않아 남는다)"""
    a = np.asarray(img.convert('RGBA')).copy()
    H, W = a.shape[:2]
    light = (a[:, :, :3].min(2) >= thr)
    seen = np.zeros((H, W), bool)
    q = deque()
    for x in range(W):
        for y in (0, H - 1):
            if light[y, x] and not seen[y, x]:
                seen[y, x] = True
                q.append((y, x))
    for y in range(H):
        for x in (0, W - 1):
            if light[y, x] and not seen[y, x]:
                seen[y, x] = True
                q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            v, u = y + dy, x + dx
            if 0 <= v < H and 0 <= u < W and light[v, u] and not seen[v, u]:
                seen[v, u] = True
                q.append((v, u))
    a[seen, 3] = 0
    return Image.fromarray(a, 'RGBA')


def ink_edge(a):
    """불투명 칸 가운데 투명과 맞닿은 칸(4방향)을 먹으로 — 바깥 둘레를 1도트 먹선으로 닫는다. 바꾼 칸 수를 돌려준다"""
    op = a[:, :, 3] == 255
    pad = np.pad(op, 1, constant_values=False)
    edge = op & ~(pad[:-2, 1:-1] & pad[2:, 1:-1] & pad[1:-1, :-2] & pad[1:-1, 2:])
    dark = a[:, :, :3].astype(int).sum(2) <= sum(_rgb('#17171E'))
    fix = edge & ~dark
    a[fix, :3] = INK
    return int(fix.sum())


def drop_specks(a):
    """이웃 8칸이 다 투명인 외톨이 불투명 칸(바탕 잡티)을 지운다"""
    op = a[:, :, 3] == 255
    pad = np.pad(op, 1, constant_values=False)
    n = sum(pad[1 + dy:pad.shape[0] - 1 + dy, 1 + dx:pad.shape[1] - 1 + dx]
            for dy in (-1, 0, 1) for dx in (-1, 0, 1) if dy or dx)
    lone = op & (n == 0)
    a[lone, 3] = 0
    return int(lone.sum())


def molten_snap(small, pal, reach=2):
    """팔레트 맞춤. 쇳물 4색은 쇳물 금 둘레에서만 쓴다 — 받은 그림의 짙은 황동 그늘(주황 끼)이 쇳물 주황으로 붙지 않게.
    금 자리 = 붉은 칸(R − G ≥ 100 · R ≥ 140)에서 {reach}칸 안."""
    rgb = small[:, :, :3].astype(int)
    red = (rgb[:, :, 0] - rgb[:, :, 1] >= 100) & (rgb[:, :, 0] >= 140) & (small[:, :, 3] >= 128)
    near = red.copy()
    for _ in range(reach):
        p = np.pad(near, 1, constant_values=False)
        near = p[1:-1, 1:-1] | p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:] | p[:-2, :-2] | p[:-2, 2:] | p[2:, :-2] | p[2:, 2:]
    molten = {_rgb(c) for c in MOLTEN}
    base = [c for c in pal if c not in molten]
    img = Image.fromarray(small, 'RGBA')
    a = np.asarray(gridmeasure.map_palette(img, base)).copy()
    b = np.asarray(gridmeasure.map_palette(img, pal))
    a[near] = b[near]
    return a


def build_one(name, verbose=True):
    g = scene_recipe.LOGO_GRID[name]
    img = Image.open(src_path(name))
    src = white_bg_alpha(img) if g['bg'] == 'white' else img.convert('RGBA')
    m = {k: {'pitch': g[k][0], 'phase': g[k][1], 'drift': 0.0} for k in ('x', 'y')}
    small, _ = gridmeasure.regrid(src, m, uniform=True)
    small = small.convert('RGBA')
    if g.get('crop'):
        small = small.crop(g['crop'])
    pal = PAL15 if g['pal'] == 15 else PAL9
    a = molten_snap(np.asarray(small), pal)
    a[:, :, 3] = np.where(a[:, :, 3] >= 128, 255, 0)
    specks = drop_specks(a)
    inked = ink_edge(a)
    # 투명 칸 둘레를 잘라 내용 상자만 남긴다
    ys, xs = np.where(a[:, :, 3] == 255)
    a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    a[a[:, :, 3] == 0] = 0
    out = Image.fromarray(a, 'RGBA')
    os.makedirs(OUT, exist_ok=True)
    out.save(os.path.join(OUT, f'{name}.png'), optimize=True)
    out.resize((out.width * 8, out.height * 8), Image.NEAREST).save(os.path.join(OUT, f'{name}@8.png'), optimize=True)
    used = {tuple(c) for c in a[a[:, :, 3] == 255][:, :3]}
    rep = {'size': out.size, 'colors': len(used), 'specks': specks, 'inked_edge': inked, **gridmeasure.alpha_clean(out)}
    if verbose:
        print(f'{name}: 격자 x {g["x"][0]}/{g["x"][1]} y {g["y"][0]}/{g["y"][1]} → {out.width}×{out.height} 도트 · {rep}')
    if name == 'LG-01b':
        out.save(os.path.join(ROOT, 'public', 'ui', 'title-word.png'), optimize=True)
    return out, rep


def measure_all(tol=0.03):
    bad = []
    for name in NAMES:
        g = scene_recipe.LOGO_GRID[name]
        img = Image.open(src_path(name))
        m = gridmeasure.measure(img, g['box'], g['lo'], g['hi'])
        gridmeasure.record('logo_import', name, {'box': list(g['box']), 'measured': gridmeasure.short(m)})
        for k in ('x', 'y'):
            d = g[k][0] * g.get('sub', 1) / m[k]['pitch'] - 1
            print(f'{name} {k}: 기록 {g[k][0]} ×{g.get("sub", 1)} · 실측 {m[k]["pitch"]} (존재 {m[k]["presence"]}) {d * 100:+.1f}%')
            if abs(d) > tol:
                bad.append(f'{name} {k}')
    return bad


if __name__ == '__main__':
    cmd, args = sys.argv[1], sys.argv[2:]
    if cmd == 'import':
        os.makedirs(ORDER, exist_ok=True)
        for name, s in zip(NAMES, args):
            shutil.copyfile(s, src_path(name))
            print(f'{s} → {src_path(name)}')
    elif cmd == 'build':
        for n in args or NAMES:
            build_one(n)
    elif cmd == 'measure':
        bad = measure_all()
        sys.exit(1 if bad else 0)
