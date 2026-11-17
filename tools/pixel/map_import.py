"""
받은 지도 에셋 MP-01 ~ MP-05 반입 (D-423 · 2026-11-14 §0-D 12위).
  python3 -I tools/pixel/map_import.py            (셋 다)
  python3 -I tools/pixel/map_import.py roster|nodes|bg
- MP-01 분대 현황판 크롬: ui_kit_import.py 파이프라인(격자 찾기 · 마젠타 투명 · 발주 15색) — 원본 가로 200도트(8.87px)
  → src/assets/ui/chrome/v2/roster-*.png. 판은 명패 · 몸(9-slice) · 다리로 자른다(새로 그리지 않는다, D-386).
- MP-02 지도 노드 9종: 덩어리마다 정사각 칸에 비율 그대로 놓고 icon_sheet_import 방식(칸 가운데 60% 중앙값 · 아이콘 팔레트 · 둘레 먹 2도트).
  → public/ui/icons16/n.<키>.png (+ @16) · tools/pixel/icons32(_ext)/n.<키>.png (icons16.py export가 되돌리지 않게)
- MP-03 ~ 05 지도 바탕: scene_recipe.MANUAL_PITCH(941/180) 균일 격자 → public/scenes/map-a<막>.png (320×180, 색 그대로)
격자값은 scene_recipe.py MAP_GRID에 둔다.
"""
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
import scene_recipe  # noqa: E402
import snap  # noqa: E402
import ui_kit_import as kit  # noqa: E402
import icon_sheet_import as isi  # noqa: E402
from icon_sheet_import import small  # noqa: E402

ORDER = os.path.join(ROOT, 'build-res', 'order')
G = scene_recipe.MAP_GRID
CHROME = os.path.join(ROOT, 'src', 'assets', 'ui', 'chrome', 'v2')


def roster():
    g = G['MP-01']
    kit.NAMES['MP-01'] = g['names']
    kit.RECOLOR.update(g['recolor'])
    kit.main(os.path.join(ORDER, 'MP-01-source.png'), 'MP-01', g['native_w'])
    split_board()


def split_board():
    """판 = 명패 · 몸 · 다리 (받은 판을 자를 뿐 — 명패를 늘리지 않으려고 9-slice 몸과 떼어 놓는다)"""
    g = G['MP-01']['board']
    board = Image.open(os.path.join(CHROME, 'roster-board.png')).convert('RGBA')
    plate = board.crop(g['plate'])
    b = np.asarray(board.crop(g['body'])).copy()
    H, W = b.shape[:2]
    t, r, bt, l = g['slice']
    # 9-slice 변 가운데 = 받은 판의 리벳 없는 한 열 · 한 줄을 그대로 옮긴다(새 색 없음). 명패가 덮던 위 테도 이것으로 메워진다
    for y0, y1, sx in g['flat_top']:
        b[y0:y1, l:W - r] = b[y0:y1, sx:sx + 1]
    b[H - bt:, l:W - r] = b[H - bt:, g['flat_bottom']:g['flat_bottom'] + 1]
    sy = g['flat_side'] - g['body'][1]
    b[t:H - bt, :l] = b[sy:sy + 1, :l]
    b[t:H - bt, W - r:] = b[sy:sy + 1, W - r:]
    Image.fromarray(b).save(os.path.join(CHROME, 'roster-body.png'))
    plate.save(os.path.join(CHROME, 'roster-plate.png'))
    os.remove(os.path.join(CHROME, 'roster-board.png'))  # 통짜 판은 쓰지 않는다 (명패 · 몸으로 나눠 씀)
    print(f'  roster-plate {plate.size} · roster-body {W}×{H} (9-slice {g["slice"]})')
    # 분대 칸 셋 = 같은 캔버스
    names = G['MP-01']['same_canvas']
    ims = [Image.open(os.path.join(CHROME, f'{n}.png')).convert('RGBA') for n in names]
    cw, ch = max(i.width for i in ims), max(i.height for i in ims)
    for n, im in zip(names, ims):
        can = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
        can.paste(im, ((cw - im.width + 1) // 2, ch - im.height))
        can.save(os.path.join(CHROME, f'{n}.png'))
    print(f'  분대 칸 셋 → {cw}×{ch}')


def grid(im, n):
    w, h = im.size
    return snap.snap(im, w / n, 0, h / n, 0, colors=0, cuts=(np.linspace(0, w, n + 1), np.linspace(0, h, n + 1)), opaque_colors=True)


def nodes():
    g = G['MP-02']
    src = os.path.join(ORDER, 'MP-02-source.png')
    rgba = Image.open(src).convert('RGBA')
    a = np.asarray(rgba).astype(int)
    key = (a[:, :, 0] > 150) & (a[:, :, 2] > 150) & (a[:, :, 1] < 120)
    s = 4  # 덩어리 찾기만 4px 축소로
    boxes = kit.order(kit.merge(kit.comps(~key[::s, ::s]), g['merge']))
    boxes = [(x0 * s, y0 * s, min(rgba.width, x1 * s + s), min(rgba.height, y1 * s + s)) for x0, y0, x1, y1 in boxes]
    print(f'MP-02: 덩어리 {len(boxes)} (이름 {len(g["names"])})')
    rgb = rgba.convert('RGB')
    # 발주 15색 + 받은 그림에 실제로 있는 재질(나무 자루 · 불 · 종이 꼬리표)만 — 보라 · 구리는 빼서 꼬리표 종이가 구리로 붙지 않게
    isi.PAL[:] = [tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for nm, cs in isi.icon_sheets.PALETTE if nm not in g['drop_pal'] for h in cs]
    outs = []
    n = 32
    for nm, b in zip(g['names'], boxes):
        cell = rgb.crop(b)
        # 정사각 마젠타 칸 가운데에 비율 그대로 (여백 margin칸 — 둘레 먹선 한 겹이 더해질 자리)
        side = int(np.ceil(max(cell.size) * n / (n - 2 * g['margin'])))
        pad = Image.new('RGB', (side, side), (255, 0, 255))
        pad.paste(cell, ((side - cell.width) // 2, (side - cell.height) // 2))
        # 칸 가운데 60% 중앙값 → 아이콘 팔레트(나무 · 불 · 종이가 있는 icon_sheets.PALETTE) → 둘레 먹 보정 (icon_sheet_import와 같다)
        im = isi.thicken(isi.centered(isi.cell16(pad)))
        k = f'n.{nm}'
        for dst in (os.path.join(HERE, 'icons32_ext', f'{k}.png'), os.path.join(HERE, 'icons32', f'{k}.png'), os.path.join(ROOT, 'public', 'ui', 'icons16', f'{k}.png')):
            im.save(dst)
        small(im).save(os.path.join(ROOT, 'public', 'ui', 'icons16', f'{k}@16.png'))
        outs.append((k, cell, im))
        print(f'  {k}: 원본 {b} → 32×32 (칸 {side / n:.2f}px)')
    sc = 6
    chk = Image.new('RGBA', (len(outs) * (32 * sc + 16) + 16, 32 * sc * 2 + 48), (24, 23, 30, 255))
    for i, (_, cell, im) in enumerate(outs):
        x = 16 + i * (32 * sc + 16)
        t = cell.convert("RGBA")
        t.thumbnail((32 * sc, 32 * sc), Image.NEAREST)
        chk.paste(t, (x, 16), t)
        big = im.resize((32 * sc, 32 * sc), Image.NEAREST)
        chk.paste(big, (x, 32 + 32 * sc), big)
    chk.save(os.path.join(ORDER, 'MP-02-check.png'))


def bg():
    for sid, (name, _) in G['bg'].items():
        if name in scene_recipe.SCENE_GRID:  # D-556: 축마다 실측한 격자 (regrid.py)
            import regrid
            regrid.build_one(name, scene_recipe.SCENE_GRID[name])
            continue
        snap.run(os.path.join(ORDER, f'{sid}-source.png'), os.path.join(ROOT, 'public', 'scenes', f'{name}.png'), **scene_recipe.options(name))


if __name__ == '__main__':
    for w in sys.argv[1:] or ['roster', 'nodes', 'bg']:
        {'roster': roster, 'nodes': nodes, 'bg': bg, 'split': split_board}[w]()
