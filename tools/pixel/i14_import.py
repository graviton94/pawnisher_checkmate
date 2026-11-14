"""I-14A~D 부품 아이콘 원본을 게임 격자(32×32)로 반입한다 (D-423 · D-480). I-15와 같은 방법:
투명 여백만 걷고 정사각 칸에 비율 그대로 놓은 뒤, 칸마다 대표색을 한 번만 샘플링한다(원본 색 · 이진 알파 · 외곽선 추가 없음).

python3 -I tools/pixel/i14_import.py
원본은 build-res/order/I-14{A,B,C,D}-source.png 에 바이트 그대로 둔다.
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
import snap
from icon_sheet_import import small

ORDER = ROOT / 'build-res/order'
# 발주서 순서: I-14A 맞물린 톱니 · B 공성 걸쇠 · C 맞댄 철판 · D 분대 인장 — 부품 id = 아이콘 키
TARGETS = [('A', 'relayGear'), ('B', 'siegeLatch'), ('C', 'sharedPlate'), ('D', 'relaySeal')]
N = 32
MARGIN = 2


def grid(im, n):
    w, h = im.size
    return snap.snap(im, w/n, 0, h/n, 0, colors=0,
                     cuts=(np.linspace(0, w, n+1), np.linspace(0, h, n+1)), opaque_colors=True)


def main():
    records, previews = [], []
    for letter, key in TARGETS:
        source = ORDER / f'I-14{letter}-source.png'
        original = Image.open(source).convert('RGBA')
        visible = original.getchannel('A').point(lambda v: 255 if v >= 128 else 0).getbbox()
        if not visible:
            raise ValueError(f'{key}: visible body missing')
        body = original.crop(visible)
        side = int(np.ceil(max(body.size) * N / (N - 2 * MARGIN)))
        padded = Image.new('RGBA', (side, side))
        padded.alpha_composite(body, ((side - body.width) // 2, (side - body.height) // 2))
        im = grid(padded, N)
        a = np.array(im); a[a[:, :, 3] == 0] = 0; im = Image.fromarray(a)
        outputs = [HERE / f'icons32_ext/{key}.png', HERE / f'icons32/{key}.png', ROOT / f'public/ui/icons16/{key}.png']
        for dst in outputs:
            dst.parent.mkdir(parents=True, exist_ok=True); im.save(dst, optimize=True)
        small(im).save(ROOT / f'public/ui/icons16/{key}@16.png', optimize=True)
        records.append({'id': key, 'order': f'I-14{letter}', 'source': source.name,
            'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
            'transparentTrim': list(visible), 'paddedSide': side, 'samplePitch': [side / N, side / N],
            'size': list(im.size), 'alpha': np.unique(a[:, :, 3]).tolist(),
            'colors': len(np.unique(a[a[:, :, 3] == 255, :3], axis=0)),
            'rgbaSha256': hashlib.sha256(im.tobytes()).hexdigest(),
            'outputs': [str(p.relative_to(ROOT)) for p in outputs],
            'method': 'whole image; original colors; one pass; no added outline'})
        previews.append((key, original, im))
        print(key, im.size, 'alpha', records[-1]['alpha'], 'colors', records[-1]['colors'])
    (ORDER / 'I-14-import.json').write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n')
    check = Image.new('RGB', (700, len(previews) * 190), '#24232b'); draw = ImageDraw.Draw(check)
    for i, (key, original, im) in enumerate(previews):
        y = i * 190; draw.text((8, y + 4), key + ' | original / pixel grid x5 / game 32 / small 16', fill='white')
        o = original.copy(); o.thumbnail((160, 160), Image.Resampling.LANCZOS); check.paste(o, (10, y + 24), o)
        large = im.resize((im.width * 5, im.height * 5), Image.Resampling.NEAREST)
        check.paste(large, (200, y + 24), large); check.paste(im, (380, y + 60), im)
        tiny = small(im); check.paste(tiny, (430, y + 60), tiny)
    check.save(ORDER / 'I-14-check.png')


if __name__ == '__main__':
    main()
