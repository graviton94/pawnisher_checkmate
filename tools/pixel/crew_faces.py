"""
분대원 얼굴 5장 (N-02 ~ 06, D-350) 받은 그림 → 56×56 도트 — 부관 박차 얼굴(adjutant.py)과 같은 규격.
마젠타 바탕을 빼고, 받은 그림의 도트 격자를 축마다 실측해(D-552 · scene_recipe.CREW_GRID, 약 6.7~8.8px) 그 격자 2칸 × 2칸을
한 칸으로 묶어(간격 = 실측 × 2, 시작점 = 실측 격자 경계 중 경계가 더 센 쪽) 칸 가운데 최빈색 → 56칸 창을 칸 단위로 자른다.
옛 판은 기물 상자 ÷ 56으로 칸 크기를 「맞춰」(13.6~14.9px, 실측 2배와 1~7% 어긋남) 체크 디더 · 눈이 반 칸씩 깨졌다.
색은 받은 그림 대표 32색(게임 마스터 색과 같은 색상 집안이면 붙임). 옛 흰 테를 벗기고 검은 외곽선만 남긴다(D-353 · D-354).
사용: python3 -I tools/pixel/crew_faces.py [--measure] [K P ...]
     (원본 build-res/order/N-crew-{K,P,N,B,R,Q}-source.png → public/ui/hud/crew-*.png)
"""
import os
import sys
from collections import Counter

import json

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gridmeasure as gm  # noqa: E402
import scene_recipe  # noqa: E402
import snap  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
N, RING = 56, 0
PAL_N = 32  # D-353: 흰 테 없이 — 액자 바탕이 종이(흰색)라 검은 외곽선만으로 선다
CROP = {'K': 0.7, 'P': 0.74, 'N': 0.66, 'B': 0.8, 'R': 0.64, 'Q': 0.62}  # 기물 키 중 초상에 담을 위쪽 몫 (비숍은 십자가, 룩은 도장까지)
WHITE, INK = (244, 241, 234), (11, 11, 14)
N4 = [(1, 0), (-1, 0), (0, 1), (0, -1)]
N8 = N4 + [(1, 1), (1, -1), (-1, 1), (-1, -1)]
is_bg = lambda c: c[0] > 200 and c[1] < 80 and c[2] > 200  # 마젠타


MERGE = 2  # 실측 도트 2×2 → 한 칸 (기물 위쪽 몫이 56칸에 들도록; 1이면 머리만 보인다)
MAGENTA = (253, 3, 253)


def _merge_phase(prof, n, pitch, phase):
    """2칸 묶음의 시작: 실측 격자 경계 phase와 phase + pitch 가운데 묶음 경계 세기 합이 큰 쪽"""
    best = None
    for o in (phase, phase + pitch):
        idx = np.round(np.arange(o % (2 * pitch), n, 2 * pitch)).astype(int) - 1
        idx = idx[(idx >= 0) & (idx < len(prof))]
        sc = prof[idx].mean()
        if best is None or sc > best[0]:
            best = (sc, o % (2 * pitch))
    return best[1]


def one(t, measure=False):
    src = os.path.join(ROOT, 'build-res', 'order', f'N-crew-{t}-source.png')
    im = Image.open(src).convert('RGB')
    if measure:
        m = gm.measure(im, lo=5.5, hi=9.5, bg=MAGENTA)
        print(t, json.dumps(gm.recipe_of(m, im)), json.dumps(gm.short(m)))
        return
    g = scene_recipe.CREW_GRID[t]
    a = np.asarray(im)
    bg = (a[:, :, 0] > 200) & (a[:, :, 1] < 80) & (a[:, :, 2] > 200)
    rgba = np.dstack([a, np.where(bg, 0, 255).astype(np.uint8)])
    img = Image.fromarray(rgba, 'RGBA')
    af = a.astype(float)
    cuts = []
    for k, axis, n in (('x', 1, im.width), ('y', 0, im.height)):
        pitch, phase = g[k][0], g[k][1]
        ph2 = _merge_phase(snap._profile(af, axis), n, pitch, phase)
        cuts.append(gm.cuts_from(n, pitch * MERGE, ph2))
    small = snap.snap(img, 0, 0, 0, 0, colors=0, cuts=tuple(cuts), opaque_colors=True)
    sa = np.asarray(small)
    ys, xs = np.nonzero(sa[:, :, 3])
    y0, y1 = ys.min(), ys.max()
    # 초상 (D-352): 기물 위쪽(머리 + 알아보는 표식)만 — 아래는 액자 밑변에 잘린다. 창 = 56칸, 위 여백 1칸, 위쪽 몫의 가운데에 맞춤
    yc = y0 + (y1 - y0) * CROP[t]
    top = xs[ys <= yc]
    xl, xr = top.min(), top.max()
    wx = int(round((xl + xr + 1) / 2 - N / 2))
    wy = int(y0) - 1
    win = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    win.alpha_composite(small.crop((max(0, wx), max(0, wy), wx + N, wy + N)), (max(0, -wx), max(0, -wy)))
    op = np.asarray(win)
    pal, _ = gm.keep_hue_palette(op[op[:, :, 3] > 0][:, :3], n=PAL_N)
    win = gm.map_palette(win, pal)
    wp = win.load()
    grid = {(i, j): wp[i, j][:3] for j in range(N) for i in range(N) if wp[i, j][3]}
    dark = lambda c: sum(c) < 150
    light = lambda c: sum(c) > 600
    shape = set(grid)
    col = {p: (INK if dark(grid[p]) else grid[p]) for p in shape}
    for _ in range(4):
        old = {p for p in shape if light(col[p]) and any((p[0] + dx, p[1] + dy) not in shape for dx, dy in N4) and any(col.get((p[0] + dx, p[1] + dy)) == INK for dx, dy in N8)}
        if not old:
            break
        shape -= old
    inside = lambda p: 0 <= p[0] < N and 0 <= p[1] < N
    # D-354: 검은 외곽선 바깥에 남은 옛 흰 테 · 번진 칸을 모두 깎는다 — 바깥(빈 칸)에 닿은 검정 아닌 칸은 테다
    #        (캔버스 밖은 바깥으로 치지 않는다 — 액자 밑변에 잘린 몸 속은 남긴다)
    # 테는 1~2칸 두께라 두 겹만 깎는다 (첫 겹: 빈 칸에 8방향으로 닿음, 둘째 겹: 깎인 칸에 4방향으로 닿음)
    empty = {(i, j) for i in range(N) for j in range(N)} - shape
    gone = {p for p in shape if col[p] != INK and any((p[0] + dx, p[1] + dy) in empty for dx, dy in N8)}
    gone |= {p for p in shape - gone if col[p] != INK and sum(col[p]) > 450 and any((p[0] + dx, p[1] + dy) in gone for dx, dy in N4)}
    shape -= gone
    # 깎다 생긴 외곽선 틈은 검정 1칸으로 메운다
    for a in {(p[0] + dx, p[1] + dy) for p in shape if col[p] != INK for dx, dy in N4}:
        if a not in shape and inside(a):
            col[a] = INK
            shape.add(a)
    for _ in range(RING):
        for a in {(p[0] + dx, p[1] + dy) for p in shape for dx, dy in N8}:
            if a not in shape and inside(a):
                col[a] = WHITE
                shape.add(a)
    out = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    for p in shape:
        out.putpixel(p, (*col[p], 255))
    dst = os.path.join(ROOT, 'public', 'ui', 'hud', f'crew-{t}.png')
    out.save(dst)
    print(dst, '칸', [round(g['x'][0] * MERGE, 3), round(g['y'][0] * MERGE, 3)], '창', (wx, wy), '색', len(out.getcolors(1 << 16)) - 1,
          '위쪽 몫 폭', int(xr - xl + 1), '칸')


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    for t in (args or 'KPNBRQ'):
        one(t, '--measure' in sys.argv)
