"""I-15 부품 아이콘(마지막 숨 · 장부 · 고참 · 죽음 표식)을 게임 격자(32×32)로 반입한다 (D-434 · D-552).

python3 -I tools/pixel/scenario_delivery_import.py
D-552: 칸 = 받은 그림 도트를 축마다 실측한 간격의 정수배(scene_recipe.ICON_GRID cell), 칸 경계는 실측 격자선 위 —
옛 판은 「투명 여백을 걷은 몸 ÷ 28」로 칸을 맞춰(23~40px, 실측과 무관) 칸 경계가 도트 가운데를 지나 얼룩이 생겼다.
칸 가운데 최빈색(불투명만) → 받은 그림 대표 24색(게임 색과 같은 색상 집안이면 붙임) · 이진 알파 · 외곽선 추가 없음.
UI-34 상태 딱지(part-state)는 원본이 약 53도트라 16칸 격자로 되돌릴 수 없다 → 재발주(UI-34R, asset-order-master 26위).
받기 전에는 지금 public/ui/part-state/*.png를 그대로 둔다 — 이 도구는 더 이상 그것을 쓰지 않는다.
장면 S-02~04는 tools/scene-import.py와 scene_recipe.py의 보존된 수동 격자를 사용한다.
작은 칸 @16은 icons16.py export가 icons32에서 만든다.
"""
from pathlib import Path
import hashlib
import json
import sys
import numpy as np
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(HERE))
import gridmeasure as gm  # noqa: E402
from icon_sheet_import import small  # noqa: E402
from scene_recipe import ICON_GRID  # noqa: E402

ORDER = ROOT / 'build-res/order'
ICONS = ['lastBreath', 'ledger', 'veteran', 'deathMark']


def main():
    records, previews = [], []
    for key in ICONS:
        g = ICON_GRID[key]
        source = ORDER / f'{g["src"]}-source.png'
        original = Image.open(source).convert('RGBA')
        im, rec = gm.icon_from_recipe(original, g, 32, margin=1)
        outputs = [HERE / f'icons32_ext/{key}.png', HERE / f'icons32/{key}.png', ROOT / f'public/ui/icons16/{key}.png']
        for dst in outputs:
            dst.parent.mkdir(parents=True, exist_ok=True)
            im.save(dst, optimize=True)
        records.append({'id': key, 'source': source.name, 'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
                        'sourceCrop': list(g['crop']) if g.get('crop') else None, **rec, 'size': list(im.size),
                        'rgbaSha256': hashlib.sha256(im.tobytes()).hexdigest(),
                        'outputs': [str(p.relative_to(ROOT)) for p in outputs],
                        'method': 'measured dot pitch; cell = integer multiple; mode per cell; palette 24 keep-hue; no added outline'})
        cell = original.crop(g['crop']) if g.get('crop') else original
        previews.append((key, cell, im))
        print(key, rec)
    (ORDER / 'I-15-import.json').write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n')
    check = Image.new('RGB', (700, len(previews) * 190), '#24232b')
    draw = ImageDraw.Draw(check)
    for i, (key, original, im) in enumerate(previews):
        y = i * 190
        draw.text((8, y + 4), key + ' | original / pixel grid x5 / game 32 / small 16', fill='white')
        o = original.copy()
        o.thumbnail((160, 160), Image.NEAREST)
        check.paste(o, (10, y + 24), o)
        large = im.resize((im.width * 5, im.height * 5), Image.NEAREST)
        check.paste(large, (220, y + 24), large)
        check.paste(im, (430, y + 60), im)
        tiny = small(im)
        check.paste(tiny, (490, y + 60), tiny)
    check.save(ORDER / 'I-15-check.png')


if __name__ == '__main__':
    main()
