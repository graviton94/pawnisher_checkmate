"""
받은 로딩 · 안내서 그림 LD-01 · LD-02 반입 (D-423 · D-523).
  python3 -I tools/pixel/loading_import.py            (둘 다)
  python3 -I tools/pixel/loading_import.py LD-01 | LD-02
LD-01 틀 시트 → ① 시트 전체 균일 격자(scene_recipe.LOADING_GRID grid — 실측 간격 · 시작) 칸 가운데 최빈색 ② 마젠타 = 투명
  ③ 발주 팔레트 15색(ui_kit_import.PAL) ④ 덩어리를 받은 시트 줄 순서대로 잘라 이름을 붙인다:
     안내서 액자 guide-frame · 팁 쪽지 tip-slip (src/assets/ui/chrome/v2/) — 로딩 쪽지 · 안내서(loadtip.ts · opening.ts)
     로딩 톱니 8프레임 → 한 줄 띠 load-gear.png (프레임마다 같은 칸, 가운데 맞춤 — 늘리지 않음) · 진행 막대 load-bar · 채움 칸 load-bar-fill
     (public/ui/hud/ — 번들보다 먼저 뜨는 부팅 화면 index.html이 쓴다)
LD-02 작업대 바탕 → 균일 정사각 격자(MANUAL_PITCH['loading-bench']) → public/scenes/loading-bench.png (로딩 쪽지 바탕, cover)
대조판 build-res/order/<ID>-check.png
"""
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
import gridmeasure as gm  # noqa: E402
import opening_import  # noqa: E402
import snap  # noqa: E402
import scene_recipe  # noqa: E402
import ui_kit_import as kit  # noqa: E402

ORDER = os.path.join(ROOT, 'build-res', 'order')
CHROME = os.path.join(ROOT, 'src', 'assets', 'ui', 'chrome', 'v2')
HUD = os.path.join(ROOT, 'public', 'ui', 'hud')


def even_slip(im, left=24, right=9, top=5, bottom=5):
    """요령 띠 가운데 고르기 (D-524): 9-slice 가운데 칸(round로 되풀이)에 원본 얼룩 · 진한 낱점이 남으면 이음매마다 옅은 세로 줄이 선다.
    가운데 칸의 종이를 바탕 한 색으로, 위 · 아래 두 줄은 그늘 한 색으로 고르고, 위아래 찢긴 테 줄의 진한 낱점은 그늘 색으로 — 테 모양은 그대로."""
    a = np.array(im.convert('RGBA'))
    h, w = a.shape[:2]
    x0, x1 = left, w - right
    mid = a[top:h - bottom, x0:x1].reshape(-1, 4)
    cols, cnt = np.unique(mid[mid[:, 3] > 0], axis=0, return_counts=True)
    order = np.argsort(-cnt)
    paper, shade = cols[order[0]], cols[order[1]]  # 가장 많은 색 = 종이, 둘째 = 그늘
    lp = paper[:3].astype(int).sum()
    for y in range(top - 2, h - bottom + 2):
        for x in range(x0, x1):
            px = a[y, x]
            if px[3] == 0:
                continue
            if top + 2 <= y < h - bottom - 1:
                a[y, x] = paper
            elif top <= y < h - bottom:
                a[y, x] = shade
            elif px[:3].astype(int).sum() < lp - 200 and px[:3].astype(int).sum() > 120:  # 테 줄 속 진한 낱점(먹 외곽선은 그대로)
                a[y, x] = shade
    return Image.fromarray(a)


def part_regrid(img, o):
    """원본의 한 부품 상자를 그 상자에서 실측한 축별 격자(간격, 상자 기준 시작)로 칸 가운데 최빈색 → 마젠타 = 투명 → 발주 15색"""
    crop = img.crop(o['box'])
    cuts = (gm.cuts_from(crop.width, *o['x']), gm.cuts_from(crop.height, *o['y']))
    s = snap.snap(crop, 0, 0, 0, 0, colors=0, cuts=cuts).convert('RGBA')
    p = s.load()
    for y in range(s.height):
        for x in range(s.width):
            c = p[x, y]
            p[x, y] = (0, 0, 0, 0) if kit.is_key(c) or gm.is_key_fringe(c) else (*kit.near(c), 255)
    return s.crop(s.getbbox())


def sheet():
    g = scene_recipe.LOADING_GRID['LD-01']
    img = Image.open(os.path.join(ORDER, 'LD-01-source.png')).convert('RGB')
    small = kit.uniform_snap(img, *g['grid'])
    p = small.load()
    for y in range(small.height):
        for x in range(small.width):
            c = p[x, y]
            p[x, y] = (0, 0, 0, 0) if kit.is_key(c) else (*kit.near(c), 255)
    boxes = kit.order(kit.merge(kit.comps(np.asarray(small)[:, :, 3] > 0), 1))
    # 톱니 줄: 맞닿아 한 덩어리로 잡힌 이웃 톱니는 가운데에서 가른다 (톱니 폭 ≈ 다른 톱니)
    gy = boxes[2][1]
    gears = [b for b in boxes if abs(b[1] - gy) <= 2]
    one = min(b[2] - b[0] for b in gears)
    split = []
    for b in gears:
        n = max(1, round((b[2] - b[0]) / one))
        w = (b[2] - b[0]) / n
        split += [(round(b[0] + i * w), b[1], round(b[0] + (i + 1) * w), b[3]) for i in range(n)]
    rest = [b for b in boxes if b not in gears]
    frame, slip, bar, fill = rest
    assert len(split) == 8, split
    parts = {'guide-frame': small.crop(frame), 'tip-slip': small.crop(slip), 'load-bar': small.crop(bar), 'load-bar-fill': small.crop(fill)}
    parts['tip-slip'] = even_slip(parts['tip-slip'])
    # D-552: 부품마다 따로 잰 격자가 있으면(scene_recipe.LOADING_GRID parts) 그 상자를 그 격자로 다시 뽑는다
    for nm, o in g.get('parts', {}).items():
        parts[nm] = part_regrid(img, o)
    # 프레임마다 실제 그림 상자로 다시 좁히고(가른 칸의 빈 열 걷기) 같은 칸 가운데에
    crops = [small.crop(b) for b in split]
    crops = [c.crop(c.getbbox()) for c in crops]
    fw, fh = max(c.width for c in crops), max(c.height for c in crops)
    fw, fh = fw + fw % 2, fh + fh % 2
    strip = Image.new('RGBA', (fw * 8, fh), (0, 0, 0, 0))
    for i, c in enumerate(crops):
        strip.paste(c, (i * fw + (fw - c.width) // 2, (fh - c.height) // 2), c)
    parts['load-gear'] = strip
    os.makedirs(HUD, exist_ok=True)
    for nm, im in parts.items():
        dst = os.path.join(CHROME if nm in ('guide-frame', 'tip-slip') else HUD, f'{nm}.png')
        im.save(dst)
        print(f'  {nm}: {im.width}×{im.height} → {os.path.relpath(dst, ROOT)}')
    print(f'LD-01: 칸 {g["grid"][0]}px · 시트 {small.width}×{small.height}도트 · 톱니 프레임 {fw}×{fh}')
    # 대조판: 원본(축소) 위 | 부품 ×4 아래 (줄: 액자 · 쪽지 / 막대 · 채움 칸 / 톱니 띠)
    top = img.resize((img.width // 2, img.height // 2), Image.NEAREST)
    k = 4
    rows = [[parts['guide-frame'], parts['tip-slip']], [parts['load-bar'], parts['load-bar-fill']], [parts['load-gear']]]
    w = max([top.width] + [sum(im.width * k + 12 for im in r) + 12 for r in rows])
    h = top.height + sum(max(im.height for im in r) * k + 12 for r in rows) + 12
    chk = Image.new('RGBA', (w, h), (24, 23, 30, 255))
    chk.paste(top, (0, 0))
    y = top.height + 12
    for r in rows:
        x = 12
        for im in r:
            big = im.resize((im.width * k, im.height * k), Image.NEAREST)
            chk.paste(big, (x, y), big)
            x += big.width + 12
        y += max(im.height for im in r) * k + 12
    chk.save(os.path.join(ORDER, 'LD-01-check.png'))


if __name__ == '__main__':
    for sid in sys.argv[1:] or ['LD-01', 'LD-02']:
        if sid == 'LD-01':
            sheet()
        else:
            opening_import.one(sid, scene_recipe.LOADING_GRID)
