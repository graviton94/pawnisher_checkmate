"""
받은 킹 카드 아이콘 시트 KC-01 반입 (D-423 · D-523).
  python3 -I tools/pixel/kc_import.py [--dry] [--measure]
① 시트 전체 격자(scene_recipe.KC_GRID grid — 축마다 실측 간격 · 시작, D-552: x 13.17 / y 12.46 — 정사각 13.2는 68줄 동안 약 4칸 밀렸다)
   칸 가운데 최빈색 ② 마젠타 = 투명 ③ 색(D-552): 받은 그림 대표 20색을 게임 마스터 색(UI 15 · SPEC24 · PAL64)에 거리 22 안이면 붙이고
   먼 색(크림 · 보라 갈색 바닥 · 주황 금)은 그대로 둔다 — 15색 가장 가까운 색으로 붙이면 크림이 회색, 바닥이 회색 · 빨간 점이 됐다
④ 덩어리를 4×2 칸에 상자 가운데로 나눠(떨어지는 왕관의 속도선 · 먼지처럼 떨어진 조각도 제 칸으로) 칸마다 32×32 가운데 — 늘리지 않음
⑤ public/ui/icons16/c.<카드>.png + 작은 칸 c.<카드>@16.png · 원본 tools/pixel/icons32/c.<카드>.png (icons16.py export가 이것을 쓴다)
칸 → 카드는 KC_GRID names (발주서 KC-01 순서 — 왼쪽 위부터 줄 순서). 대조판 build-res/order/KC-01-check.png (지금 → 받은 것, ×4)
"""
import os
import sys

import json

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
import gridmeasure as gm  # noqa: E402
import scene_recipe  # noqa: E402
import ui_kit_import as kit  # noqa: E402

N = 32


def main(dry=False, measure=False):
    g = scene_recipe.KC_GRID['KC-01']
    img = Image.open(os.path.join(ROOT, 'build-res', 'order', 'KC-01-source.png')).convert('RGB')
    if measure:
        m = gm.measure(img, lo=5, hi=20, bg=(245, 6, 249))
        print(json.dumps(gm.recipe_of(m, img)), json.dumps(gm.short(m)))
        return
    small, _ = gm.regrid(img, gm.from_recipe(g['grid'], img.size))
    small = small.convert('RGBA')
    p = small.load()
    for y in range(small.height):
        for x in range(small.width):
            if kit.is_key(p[x, y]):
                p[x, y] = (0, 0, 0, 0)
    op = np.asarray(small)
    pal, rep = gm.keep_hue_palette(op[op[:, :, 3] > 0][:, :3], n=g.get('colors', 20))
    for r in rep:
        print('  색', *r)
    small = gm.map_palette(small, pal)
    a = np.asarray(small)[:, :, 3] > 0
    W, H = small.size
    cells = [Image.new('RGBA', small.size, (0, 0, 0, 0)) for _ in range(8)]
    for b in kit.comps(a):  # 덩어리(12칸 이상)마다 상자 가운데가 든 칸으로 — 12칸 미만 낱점은 생성기 얼룩으로 버린다
        cx, cy = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2
        k = min(3, int(cx / (W / 4))) + 4 * min(1, int(cy / (H / 2)))
        cells[k].alpha_composite(small.crop(b), (b[0], b[1]))
    names = g['names']
    chk = Image.new('RGB', (8 * 2 * 136, 136), (24, 23, 30))
    for i, (cell, key) in enumerate(zip(cells, names)):
        box = cell.getbbox()
        # 세로 실측(12.47px)으로 줄이 늘어 33~34칸인 아이콘은 아래(바닥 그늘)부터 잘라 32칸에 맞춘다 — 줄이지 않는다(D-386)
        if box[3] - box[1] > N:
            box = (box[0], box[1], box[2], box[1] + N)
        crop = cell.crop(box)
        assert crop.width <= N and crop.height <= N, (key, crop.size)
        icn = Image.new('RGBA', (N, N), (0, 0, 0, 0))
        icn.paste(crop, ((N - crop.width) // 2, (N - crop.height) // 2), crop)
        f = os.path.join(ROOT, 'public', 'ui', 'icons16', f'{key}.png')
        if os.path.exists(f):
            old = Image.open(f).convert('RGBA').resize((128, 128), Image.NEAREST)
            chk.paste(old, (i * 272 + 4, 4), old)
        new = icn.resize((128, 128), Image.NEAREST)
        chk.paste(new, (i * 272 + 140, 4), new)
        if not dry:
            icn.save(f)
            icn.save(os.path.join(HERE, 'icons32', f'{key}.png'))
        print(f'  {key}: {crop.width}×{crop.height}')
    chk.save(os.path.join(ROOT, 'build-res', 'order', 'KC-01-check.png'))
    print(f'KC-01: 칸 {g["grid"]} · 시트 {W}×{H}도트 · {len(pal)}색 · 알파', gm.alpha_clean(small))
    print('작은 칸 @16은 python3 -I tools/pixel/icons16.py export public/ui/icons16 가 tools/pixel/icons32에서 다시 만든다')


if __name__ == '__main__':
    main('--dry' in sys.argv, '--measure' in sys.argv)
