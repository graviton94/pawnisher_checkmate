"""수령 UI 원본 전체를 픽셀화한다. 상징·핀을 따로 떼거나 재조립하지 않는다.

python3 -I tools/pixel/ui_delivery_import.py
UI-32 시트의 네 칸만 분리한다. 원본 색·윤곽·장식의 상대 위치를 유지한다.
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
import snap  # noqa: E402

OUT = ROOT / 'src/assets/ui/chrome/v2'
ORDER = ROOT / 'build-res/order'


def body(im):
    """원본 본체 바깥의 투명 여백만 제거한다."""
    im = im.convert('RGBA')
    mask = im.getchannel('A').point(lambda a: 255 if a >= 128 else 0)
    ImageDraw.floodfill(mask, (im.width // 2, im.height // 2), 128)
    mask = mask.point(lambda a: 255 if a == 128 else 0)
    box = mask.getbbox()
    if not box:
        raise ValueError('원본 본체를 찾지 못했습니다')
    im.putalpha(mask)
    return im.crop(box), box


def pixelize(im, width, square=False):
    """칸 중앙 대표색으로만 픽셀화한다. 색 변환·모서리 복제·장식 합성 없음."""
    if square:
        side = max(im.size)
        canvas = Image.new('RGBA', (side, side))
        canvas.paste(im, ((side - im.width) // 2, (side - im.height) // 2))
        im = canvas
    pitch = im.width / width
    height = round(im.height / pitch)
    cuts = (list(np.linspace(0, im.width, width + 1)),
            [min(im.height, y * pitch) for y in range(height)] + [im.height])
    result = snap.snap(im, pitch, 0, pitch, 0, colors=0, cuts=cuts, opaque_colors=True)
    a = np.asarray(result).copy()
    a[a[:, :, 3] == 0] = 0
    return Image.fromarray(a), pitch


def main():
    records, previews = [], []

    def save(name, im, source, crop, pitch, edge):
        dst = OUT / f'{name}.png'
        im.save(dst, optimize=True)
        a = np.asarray(im)
        records.append({'file': str(dst.relative_to(ROOT)), 'size': list(im.size),
                        'method': 'whole source frame; original colors; no detached ornaments',
                        'colors': len(np.unique(a[a[:, :, 3] == 255, :3], axis=0)),
                        'alpha': [int(v) for v in np.unique(a[:, :, 3])],
                        'source': source.name, 'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
                        'sourceCrop': list(crop), 'samplePitch': pitch, 'sliceXY': edge,
                        'rgbaSha256': hashlib.sha256(im.tobytes()).hexdigest()})
        previews.append((name, im))
        print(f'{source.name} → {name}: {im.size}, original colors')

    src = ORDER / 'UI-31-source.png'
    im, crop = body(Image.open(src))
    im, pitch = pixelize(im, 64, square=True)
    save('unit-inspect-panel', im, src, crop, pitch, [18, 18])

    src = ORDER / 'UI-32-source.png'
    sheet = Image.open(src)
    for i, kind in enumerate(('hp', 'shield', 'attack', 'defense')):
        left, right = sheet.width * i // 4, sheet.width * (i + 1) // 4
        im, crop = body(sheet.crop((left, 0, right, sheet.height)))
        im, pitch = pixelize(im, 64, square=True)
        save(f'unit-stat-{kind}', im, src, (crop[0] + left, crop[1], crop[2] + left, crop[3]), pitch, [18, 18])

    src = ORDER / 'UI-33-source.png'
    im, crop = body(Image.open(src))
    im, pitch = pixelize(im, 128)
    save('ledger-slip', im, src, crop, pitch, [20, 16])

    for old in ['unit-shield-symbol', 'ledger-pin-left', 'ledger-pin-right',
                *[f'unit-glyph-{k}' for k in ('hp', 'shield', 'attack', 'defense')]]:
        (OUT / f'{old}.png').unlink(missing_ok=True)
    (ORDER / 'UI-31-33-import.json').write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n')
    preview = Image.new('RGBA', (1200, 580), '#16141c')
    draw = ImageDraw.Draw(preview)
    x, y = 8, 8
    for name, im in previews:
        if x + im.width * 4 > 1200:
            x, y = 8, y + 280
        draw.text((x, y), name, fill='white')
        preview.alpha_composite(im.resize((im.width * 4, im.height * 4), Image.Resampling.NEAREST), (x, y + 20))
        x += im.width * 4 + 12
    preview.save(ORDER / 'UI-31-33-check.png')


if __name__ == '__main__':
    main()
