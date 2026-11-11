"""UI-31~33 수령 원본을 격자·팔레트·알파·9-slice에 맞춘다.

사용: python3 -I tools/pixel/ui_delivery_import.py
원본: build-res/order/UI-{31,32,33}-source.png (수령 PNG 그대로 보관).
민 테는 중앙의 한 열/행으로 정리하고, 작은 상징·핀은 원본에서 별도 추출한다.
"""
from pathlib import Path
import hashlib
import json
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

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
MATERIALS = {
    'hp': ['0B0B0E', '6D292E', 'C94850', 'FF7A80'],
    'shield': ['0B0B0E', '1F8A7A', '5EEAD4', 'E6FFFB'],
    'attack': ['0B0B0E', '4A3414', '8A6416', 'C89B3C', 'F5C542'],
    'defense': ['0B0B0E', '56545E', '8A8794', 'A8A4B2', 'ECEBF2'],
    'pin': ['0B0B0E', '4A3414', '8A6416', 'C89B3C', 'F5C542', 'F1EDE4'],
    'paper': ['0B0B0E', '33313B', '56545E', '8A8794', '9B9589', 'BFB9AD', 'F1EDE4'],
}
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


def grid(im, width, square=False, material=None):
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
    result = snap.snap(im, pitch, 0, pitch, 0, colors=0, cuts=cuts,
                       opaque_colors=material not in (None, 'paper'))
    a = np.asarray(result).copy()
    rgb = a[:, :, :3].astype(np.int32)
    palette = np.array([tuple(bytes.fromhex(c)) for c in MATERIALS[material]], dtype=np.int32) if material else COLORS
    distance = ((rgb[:, :, None, :] - palette) ** 2 * [3, 4, 2]).sum(axis=3)
    a[:, :, :3] = palette[distance.argmin(axis=2)]
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


def symbol(raw, box, kind, rim=7):
    """원본 상징의 색 면과 실제 검은 외곽만 추출한다. 장치 전체 축소와 분리한다."""
    im = raw.crop(box).convert('RGBA')
    a = np.asarray(im)
    r, g, b = a[:, :, :3].astype(float).transpose(2, 0, 1)
    if kind == 'hp':
        core = (r > 100) & (r > g * 1.3) & (r > b * 1.3)
    elif kind == 'shield':
        core = ((g > r + 15) & (b > r + 15)) | ((r > 210) & (g > 210) & (b > 210))
    elif kind in ('attack', 'pin'):
        core = (r > 60) & (r > g * 0.98) & (g > b * 1.2)
    else:
        # 방패와 바깥 철 테 사이에는 원본의 검은 선이 있다. 안쪽 몸체만 선택한다.
        core = (r > 75) & (g > 75) & (b > 75)
    core &= a[:, :, 3] >= 128
    if kind != 'shield':
        # fromarray의 공유 읽기 전용 버퍼에는 floodfill이 반영되지 않으므로 복사한다.
        mask = Image.fromarray(np.uint8(core) * 255).copy()
        yy, xx = np.nonzero(core)
        if not len(xx):
            raise ValueError(f'{kind}: 원본 상징이 없습니다')
        near = np.argmin((xx - im.width / 2) ** 2 + (yy - im.height / 2) ** 2)
        ImageDraw.floodfill(mask, (int(xx[near]), int(yy[near])), 128)
        core = np.asarray(mask) == 128
    grown = np.asarray(Image.fromarray(np.uint8(core) * 255).filter(ImageFilter.MaxFilter(rim * 2 + 1))) > 0
    # 새 외곽선을 그리지 않고 원본에 이미 있던 검은 픽셀만 보존한다.
    mask = core | (grown & (np.maximum.reduce([r, g, b]) < 80) & (a[:, :, 3] >= 128))
    if kind == 'pin':
        # 종이 바탕은 제외하고 원본 핀의 닫힌 외곽 안 반사광은 그대로 보존한다.
        region = Image.fromarray(np.uint8(mask) * 255).copy()
        ImageDraw.floodfill(region, (int(xx[near]), int(yy[near])), 128)
        mask = np.asarray(region) == 128
        outside = Image.fromarray(np.uint8(~mask) * 255).copy()
        ImageDraw.floodfill(outside, (0, 0), 128)
        mask |= (np.asarray(outside) == 255) & (a[:, :, 3] >= 128)
    im.putalpha(Image.fromarray(np.uint8(mask) * 255))
    return im


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
        left = sheet.width * i // 4
        part = sheet.crop((left, 0, sheet.width * (i+1) // 4, sheet.height))
        im, box = face(part)
        im, pitch = grid(im, 32, square=True)
        im = slices(im, 9, 9, INK)
        # 상징을 5~6도트로 뭉개던 칸을 비우고 같은 원본의 우상단 철 모서리를 쓴다.
        a = np.asarray(im).copy()
        a[:9, :9] = np.fliplr(a[:9, -9:])
        im = Image.fromarray(a)
        save(f'unit-stat-{kind}', im, src, [box[0] + left, box[1], box[2] + left, box[3]], pitch, [9, 9])
        icon_box = (28, 110, 140, 222)
        glyph, icon_pitch = grid(symbol(part, icon_box, kind), 16, material=kind)
        if kind in ('hp', 'attack'):
            # 축소 뒤 본체와 분리된 색 먼지만 제거한다. 실제 검은 선은 보존한다.
            a = np.asarray(glyph).copy()
            colored = (a[:, :, 0] > 50) & (a[:, :, 3] == 255)
            keep = Image.fromarray(np.uint8(colored) * 255).copy()
            ImageDraw.floodfill(keep, (8, 8), 128)
            body = np.asarray(keep) == 128
            a[colored & ~body] = 0
            nearby = np.asarray(Image.fromarray(np.uint8(body) * 255).filter(ImageFilter.MaxFilter(5))) > 0
            a[~nearby] = 0
            glyph = Image.fromarray(a)
        save(f'unit-glyph-{kind}', glyph, src,
             [icon_box[0] + left, icon_box[1], icon_box[2] + left, icon_box[3]], icon_pitch)

    src = ORDER / 'UI-33-source.png'
    im, box = face(Image.open(src))
    im, pitch = grid(im, 64, material='paper')
    im = slices(im, 10, 8, PAPER)
    a = np.asarray(im).copy()
    # 작은 핀은 종이판에 굽지 않는다. 같은 종이의 빈 모서리로 받침만 정리한다.
    corner = a[-8:, :10].copy()
    a[:8, :10] = np.flipud(corner)
    a[:8, -10:] = np.flip(corner, axis=(0, 1))
    save('ledger-slip', Image.fromarray(a), src, box, pitch, [10, 8])
    raw = Image.open(src)
    for name, pin_box in [('left', (82, 135, 256, 309)), ('right', (1535, 135, 1709, 309))]:
        # 약 21.7px 윤곽 격자에 맞춘 영역을 반 칸 단위로 읽어 반사광까지 보존한다.
        pin, pin_pitch = grid(symbol(raw, pin_box, 'pin', rim=21), 16, material='pin')
        pin = pin.crop(pin.getbbox())
        canvas = Image.new('RGBA', (16, 16))
        canvas.paste(pin, ((16 - pin.width) // 2, (16 - pin.height) // 2))
        pin = canvas
        save(f'ledger-pin-{name}', pin, src, pin_box, pin_pitch)
        records[-1].update({'detailGrid': [16, 16], 'contourPitch': 21.75})
    # D-426에서 뭉개진 8×8 조각은 새 원본 추출 상징으로 교체한다.
    (OUT / 'unit-shield-symbol.png').unlink(missing_ok=True)
    # 실제 변환값·원본 해시를 남겨 다음 반입도 같은 결과로 재생성한다.
    (ORDER / 'UI-31-33-import.json').write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n')
    preview = Image.new('RGBA', (960, 660), '#16141c')
    draw = ImageDraw.Draw(preview)
    x, y = 8, 8
    for name, im in previews:
        if x + im.width * 4 > 960:
            x, y = 8, y + 280
        draw.text((x, y), name, fill='white')
        preview.alpha_composite(im.resize((im.width * 4, im.height * 4), Image.Resampling.NEAREST), (x, y+20))
        x += im.width * 4 + 12
    preview.save(ORDER / 'UI-31-33-check.png')


if __name__ == '__main__':
    main()
