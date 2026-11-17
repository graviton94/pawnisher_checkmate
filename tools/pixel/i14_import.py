"""I-14A~D 부품 아이콘 원본을 게임 격자(32×32)로 반입한다 (D-423 · D-480 · D-552).

python3 -I tools/pixel/i14_import.py
D-552: 칸 = 받은 그림 도트를 축마다 실측한 간격의 정수배(scene_recipe.ICON_GRID cell), 칸 경계는 실측 격자선 위 —
옛 판은 「투명 여백을 걷은 몸 ÷ 28」로 칸을 맞춰(실측과 무관) 칸 경계가 도트 가운데를 지나 얼룩이 생겼다.
칸 가운데 최빈색(불투명만) → 받은 그림 대표 24색(게임 색과 같은 색상 집안이면 붙임) · 이진 알파 · 외곽선 추가 없음.
원본은 build-res/order/I-14{A,B,C,D}-source.png 에 바이트 그대로 둔다. 작은 칸 @16은 icons16.py export가 icons32에서 만든다.
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
# 발주서 순서: I-14A 맞물린 톱니 · B 공성 걸쇠 · C 맞댄 철판 · D 분대 인장 — 부품 id = 아이콘 키
TARGETS = [('A', 'relayGear'), ('B', 'siegeLatch'), ('C', 'sharedPlate'), ('D', 'relaySeal')]
N = 32


def main():
    records, previews = [], []
    for letter, key in TARGETS:
        source = ORDER / f'I-14{letter}-source.png'
        original = Image.open(source).convert('RGBA')
        im, rec = gm.icon_from_recipe(original, ICON_GRID[key], N, margin=1)
        outputs = [HERE / f'icons32_ext/{key}.png', HERE / f'icons32/{key}.png', ROOT / f'public/ui/icons16/{key}.png']
        for dst in outputs:
            dst.parent.mkdir(parents=True, exist_ok=True)
            im.save(dst, optimize=True)
        a = np.asarray(im)
        records.append({'id': key, 'order': f'I-14{letter}', 'source': source.name,
                        'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(), **rec,
                        'size': list(im.size), 'rgbaSha256': hashlib.sha256(im.tobytes()).hexdigest(),
                        'outputs': [str(p.relative_to(ROOT)) for p in outputs],
                        'method': 'measured dot pitch; cell = integer multiple; mode per cell; palette 24 keep-hue; no added outline'})
        previews.append((key, original, im))
        print(key, rec)
    (ORDER / 'I-14-import.json').write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n')
    check = Image.new('RGB', (700, len(previews) * 190), '#24232b')
    draw = ImageDraw.Draw(check)
    for i, (key, original, im) in enumerate(previews):
        y = i * 190
        draw.text((8, y + 4), key + ' | original / pixel grid x5 / game 32 / small 16', fill='white')
        o = original.copy()
        o.thumbnail((160, 160), Image.NEAREST)
        check.paste(o, (10, y + 24), o)
        large = im.resize((im.width * 5, im.height * 5), Image.NEAREST)
        check.paste(large, (200, y + 24), large)
        check.paste(im, (380, y + 60), im)
        tiny = small(im)
        check.paste(tiny, (430, y + 60), tiny)
    check.save(ORDER / 'I-14-check.png')


if __name__ == '__main__':
    main()
