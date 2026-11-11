"""UI-31~33 수령 원본을 격자·팔레트·알파·9-slice에 맞춘다.

사용: python3 -I tools/pixel/ui_delivery_import.py
원본: build-res/order/UI-{31,32,33}-source.png (수령 PNG 그대로 보관).
모서리는 보존하고, 늘어나는 민 테는 중앙의 한 열/행으로 정리한다.
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
PALETTE = ['0B0B0E', '25242B', '33313B', '56545E', '8A8794', 'A8A4B2', 'ECEBF2',
           '8A6416', 'C89B3C', 'F5C542', '6D292E', 'C94850', 'FF7A80', 'F1EDE4',
           '1F8A7A', '5EEAD4', 'E6FFFB']
COLORS = np.array([tuple(bytes.fromhex(c)) for c in PALETTE], dtype=np.int32)
INK = (37, 36, 43, 255)
PAPER = (241, 237, 228, 255)
records = []
previews = []


def face(im):
    """중앙 불투명 면과 연결된 본체만 남겨 반투명 테와 외부 먼지를 제거한다."""
    im = im.convert('RGBA')
    mask = im.getchannel('A').point(lambda a: 255 if a >= 128 else 0)
    ImageDraw.floodfill(mask, (im.width // 2, im.height // 2), 128)
    mask = mask.point(lambda a: 255 if a == 128 else 0)
    im.putalpha(mask)
    box = mask.getbbox()
    if not box:
        raise ValueError('불투명 중앙 면이 없습니다')
    return im.crop(box), box


def grid(im, width, square=False):
    """비율을 유지해 칸 중앙 대표색으로 논리 격자를 복원한다(디더·보간 없음)."""
    if square:
        side = max(im.size)
        pad = Image.new('RGBA', (side, side))
        pad.paste(im, ((side - im.width) // 2, (side - im.height) // 2))
        im = pad
    pitch = im.width / width
    height = round(im.height / pitch)
    # 원본 도트 크기를 같게 유지한다. 마지막 한 칸만 캔버스 끝에서 잘린다.
    cuts = (list(np.linspace(0, im.width, width + 1)),
            [min(im.height, y * pitch) for y in range(height)] + [im.height])
    result = snap.snap(im, pitch, 0, pitch, 0, colors=0, cuts=cuts)
    a = np.asarray(result).copy()
    rgb = a[:, :, :3].astype(np.int32)
    distance = ((rgb[:, :, None, :] - COLORS) ** 2 * [3, 4, 2]).sum(axis=3)
    a[:, :, :3] = COLORS[distance.argmin(axis=2)]
    a[:, :, 3] = np.where(a[:, :, 3] >= 128, 255, 0)
    a[a[:, :, 3] == 0] = 0
    return Image.fromarray(a), pitch


def slices(im, x, y, fill):
    """모서리 밖의 민 테와 빈 면만 평평하게 한다. 장식은 고정 영역에 남긴다."""
    a = np.asarray(im).copy()
    h, w = a.shape[:2]
    a[:y, x:w-x] = a[:y, w//2:w//2+1]
    a[h-y:, x:w-x] = a[h-y:, w//2:w//2+1]
    a[y:h-y, :x] = a[h//2:h//2+1, :x]
    a[y:h-y, w-x:] = a[h//2:h//2+1, w-x:]
    a[y:h-y, x:w-x] = fill
    return Image.fromarray(a)


def save(name, im, source, crop, pitch, edge=None):
    dst = OUT / f'{name}.png'
    im.save(dst, optimize=True)
    a = np.asarray(im)
    records.append({'file': str(dst.relative_to(ROOT)), 'size': list(im.size),
                    'colors': len(np.unique(a[a[:, :, 3] == 255, :3], axis=0)),
                    'alpha': [int(v) for v in np.unique(a[:, :, 3])],
                    'source': source.name, 'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
                    'sourceCrop': crop, 'samplePitch': pitch, 'sliceXY': edge,
                    'rgbaSha256': hashlib.sha256(im.tobytes()).hexdigest()})
    previews.append((name, im))
    print(f'{source.name} → {name}: {im.width}×{im.height}, slice={edge}')


def main():
    src = ORDER / 'UI-31-source.png'
    im, box = face(Image.open(src))
    im, pitch = grid(im, 64, square=True)
    save('unit-inspect-panel', slices(im, 18, 18, INK), src, box, pitch, [18, 18])

    src = ORDER / 'UI-32-source.png'
    sheet = Image.open(src)
    for i, kind in enumerate(('hp', 'shield', 'attack', 'defense')):
        part = sheet.crop((sheet.width * i // 4, 0, sheet.width * (i+1) // 4, sheet.height))
        im, box = face(part)
        im, pitch = grid(im, 32, square=True)
        im = slices(im, 9, 9, INK)
        save(f'unit-stat-{kind}', im, src, box, pitch, [9, 9])
        # 방열판은 HP 막대 옆에서 공간을 더 차지하지 않는 상징으로도 쓴다.
        if kind == 'shield':
            glyph = im.crop((1, 1, 9, 9))
            save('unit-shield-symbol', glyph, src, box, pitch)

    src = ORDER / 'UI-33-source.png'
    im, box = face(Image.open(src))
    im, pitch = grid(im, 64)
    save('ledger-slip', slices(im, 10, 8, PAPER), src, box, pitch, [10, 8])
    # 실제 변환값·원본 해시를 남겨 다음 반입도 같은 결과로 재생성한다.
    (ORDER / 'UI-31-33-import.json').write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n')
    preview = Image.new('RGBA', (640, 440), '#16141c')
    draw = ImageDraw.Draw(preview)
    x, y = 8, 8
    for name, im in previews:
        if x + im.width * 4 > 640:
            x, y = 8, 280
        draw.text((x, y), name, fill='white')
        preview.alpha_composite(im.resize((im.width * 4, im.height * 4), Image.Resampling.NEAREST), (x, y+20))
        x += im.width * 4 + 12
    preview.save(ORDER / 'UI-31-33-check.png')


if __name__ == '__main__':
    main()
