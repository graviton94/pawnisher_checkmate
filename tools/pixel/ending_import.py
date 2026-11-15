"""
받은 엔딩 발주 ED-01 ~ ED-08 반입 (D-423 · D-510 · D-514).
  python3 -I tools/pixel/ending_import.py            (받은 것 모두)
  python3 -I tools/pixel/ending_import.py ED-01 ED-03 …
- ED-01 영화 자막 판 · 제목 카드 크롬 시트: ui_kit_import 파이프라인(격자 찾기 · 마젠타 투명 · 발주 15색)
  → src/assets/ui/chrome/v2/{subtitle-plate,title-card,crown-emblem-1..4,speaker-narr|mono|line}.png
  9-slice로 늘리는 판은 변 가운데를 받은 판의 깨끗한 한 열 · 한 줄로 고른다(새로 그리지 않는다, D-386) — scene_recipe.ENDING_GRID flat
- ED-02 ~ 08 장면: opening_import.one과 같은 균일 격자 · 그려 넣은 레터박스 띠 걷기 → public/scenes/<이름>.png, 대조판 build-res/order/<ID>-check.png
"""
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
import scene_recipe  # noqa: E402
import opening_import  # noqa: E402
import ui_kit_import as kit  # noqa: E402

ORDER = os.path.join(ROOT, 'build-res', 'order')
CHROME = os.path.join(ROOT, 'src', 'assets', 'ui', 'chrome', 'v2')
G = scene_recipe.ENDING_GRID


def chrome():
    g = G['ED-01']
    kit.NAMES['ED-01'] = g['names']
    kit.main(os.path.join(ORDER, 'ED-01-source.png'), 'ED-01', g['native_w'])
    for name, f in g['flat'].items():
        p = os.path.join(CHROME, f'{name}.png')
        a = np.asarray(Image.open(p).convert('RGBA')).copy()
        H, W = a.shape[:2]
        t, r, b, l = f['slice']
        c = f['col']
        a[:, l:W - r] = a[:, c:c + 1]  # 위 · 가운데 · 아래 변을 한 열로 (얼룩 · 칸막이 걷힘)
        if f['row'] is not None:
            y = f['row']
            a[t:H - b, :l] = a[y:y + 1, :l]
            a[t:H - b, W - r:] = a[y:y + 1, W - r:]
        Image.fromarray(a).save(p)
        print(f'  {name}: 9-slice {f["slice"]} · 변 가운데 = 열 {c}' + (f' · 옆 변 = 줄 {f["row"]}' if f['row'] is not None else ''))
    # 대조판: 원본 시트(축소) 위 | 아래 다듬은 부품 ×4 (ui_kit_import가 쓴 부품만 판을 덮어쓴다)
    src = Image.open(os.path.join(ORDER, 'ED-01-source.png')).convert('RGB')
    top = src.resize((src.width // 2, src.height // 2), Image.LANCZOS)
    parts = [Image.open(os.path.join(CHROME, f'{n}.png')).convert('RGBA') for n in g['names']]
    k = 4
    pw = sum(pt.width * k + 12 for pt in parts) + 12
    w = max(top.width, min(pw, 2400))
    rows, x, y, rh = [], 12, 0, 0
    for pt in parts:  # 넓으면 줄을 바꾼다
        if x + pt.width * k > w:
            x, y = 12, y + rh + 12
            rh = 0
        rows.append((pt, x, y))
        x += pt.width * k + 12
        rh = max(rh, pt.height * k)
    chk = Image.new('RGBA', (w, top.height + 24 + y + rh + 12), (24, 23, 30, 255))
    chk.paste(top, (0, 0))
    for pt, x, yy in rows:
        big = pt.resize((pt.width * k, pt.height * k), Image.NEAREST)
        chk.paste(big, (x, top.height + 24 + yy), big)
    chk.save(os.path.join(ORDER, 'ED-01-check.png'))


if __name__ == '__main__':
    for sid in sys.argv[1:] or list(G):
        if sid == 'ED-01':
            chrome()
        else:
            opening_import.one(sid, G)
