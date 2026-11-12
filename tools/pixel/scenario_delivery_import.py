"""I-15·UI-34 원본 전체를 게임 격자로 반입한다. 시트의 물건 칸만 분리하고 내부 형상은 재조립하지 않는다.

python3 -I tools/pixel/scenario_delivery_import.py
장면 S-02~04는 tools/scene-import.py와 scene_recipe.py의 보존된 수동 격자를 사용한다.
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
ICON_TARGETS = [('lastBreath', 0), ('ledger', 1), ('veteran', 2)]


def grid(im, n):
    """전체 정사각 칸의 대표색을 한 번만 샘플링한다. 원본 색, 이진 알파, 외곽선 추가 없음."""
    w, h = im.size
    return snap.snap(im, w/n, 0, h/n, 0, colors=0,
                     cuts=(np.linspace(0, w, n+1), np.linspace(0, h, n+1)), opaque_colors=True)


def main():
    records, previews = [], []

    def save(source, key, crop, n, outputs):
        original = Image.open(source).convert('RGBA')
        cell = original.crop(crop)
        # 빈 바깥 여백만 걷고 정사각 칸에 비율 그대로 놓는다. 상태 원판은 원본 칸의 2/3라 그대로 줄이면 내부가 깨진다.
        visible = cell.getchannel('A').point(lambda v: 255 if v >= 128 else 0).getbbox()
        if not visible:
            raise ValueError(f'{key}: visible source body missing')
        body = cell.crop(visible)
        margin = 1 if n == 16 else 2
        side = int(np.ceil(max(body.size) * n / (n - 2 * margin)))
        padded = Image.new('RGBA', (side, side))
        padded.alpha_composite(body, ((side-body.width)//2, (side-body.height)//2))
        im = grid(padded, n)
        a = np.array(im); a[a[:, :, 3] == 0] = 0; im = Image.fromarray(a)
        for dst in outputs:
            dst.parent.mkdir(parents=True, exist_ok=True); im.save(dst, optimize=True)
        if n == 32:
            small(im).save(ROOT / f'public/ui/icons16/{key}@16.png', optimize=True)
        records.append({'id': key, 'source': source.name,
            'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
            'sourceCrop': list(crop), 'transparentTrim': list(visible), 'paddedSide': side, 'samplePitch': [side/n, side/n],
            'size': list(im.size), 'alpha': np.unique(a[:, :, 3]).tolist(),
            'colors': len(np.unique(a[a[:, :, 3] == 255, :3], axis=0)),
            'rgbaSha256': hashlib.sha256(im.tobytes()).hexdigest(),
            'outputs': [str(p.relative_to(ROOT)) for p in outputs],
            'method': 'whole cell; original colors; one pass; no added outline; no detached details'})
        previews.append((key, cell, im))
        print(key, im.size, 'alpha', records[-1]['alpha'])

    source = ORDER / 'I-15ABC-source.png'
    with Image.open(source) as sheet:
        for key, i in ICON_TARGETS:
            save(source, key, (i*sheet.width//3, 0, (i+1)*sheet.width//3, sheet.height), 32,
                 [HERE/f'icons32_ext/{key}.png', HERE/f'icons32/{key}.png', ROOT/f'public/ui/icons16/{key}.png'])
    source = ORDER / 'I-15D-source.png'
    with Image.open(source) as im:
        save(source, 'deathMark', (0, 0, *im.size), 32,
             [HERE/'icons32_ext/deathMark.png', HERE/'icons32/deathMark.png', ROOT/'public/ui/icons16/deathMark.png'])
    source = ORDER / 'UI-34-source.png'
    with Image.open(source) as sheet:
        for i, key in enumerate(('waiting', 'ready', 'spent')):
            save(source, key, (i*sheet.width//3, 0, (i+1)*sheet.width//3, sheet.height), 16,
                 [ROOT/f'public/ui/part-state/{key}.png'])
    (ORDER/'I-15-UI-34-import.json').write_text(json.dumps(records, ensure_ascii=False, indent=2)+'\n')
    check = Image.new('RGB', (1000, len(previews)*190), '#24232b'); draw = ImageDraw.Draw(check)
    for i, (key, original, im) in enumerate(previews):
        y = i*190; draw.text((8, y+4), key+' | original / pixel grid / game 32 / small 16', fill='white')
        original.thumbnail((160,160),Image.Resampling.NEAREST); check.paste(original, (10,y+24), original)
        large=im.resize((im.width*5,im.height*5),Image.Resampling.NEAREST)
        check.paste(large,(220,y+24),large);check.paste(im,(430,y+60),im)
        if im.width==32:
            tiny=small(im);check.paste(tiny,(490,y+60),tiny)
    check.save(ORDER/'I-15-UI-34-check.png')


if __name__=='__main__':
    main()
