"""
16칸 아이콘 리뉴얼 미리보기: 배치 파일의 NEW = {키: [14줄]}를 지금 그림과 나란히 찍는다.
사용: python3 -I tools/pixel/icons16_v2/preview.py <batch.py> <out.png>
배치 파일 형식: NEW = {'n.battle': ['..............', ...14줄], ...} — 줄마다 14칸, 글자는 tools/pixel/icons16.py의 RAMP(소문자 재질) · FIX(대문자 고정색)
"""
import os
import runpy
import sys

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
import icons16  # noqa: E402


def check(new):
    bad = []
    for k, rows in new.items():
        if k not in icons16.ICONS:
            bad.append(f'{k}: 없는 키')
        if len(rows) != 14 or any(len(r) != 14 for r in rows):
            bad.append(f'{k}: 14×14가 아님 ({len(rows)}줄, 폭 {sorted(set(len(r) for r in rows))})')
        for r in rows:
            for ch in r:
                if ch != '.' and ch not in icons16.RAMP and ch not in icons16.FIX:
                    bad.append(f'{k}: 모르는 글자 {ch!r}')
                    break
    return bad


def main(batch, out):
    new = runpy.run_path(batch)['NEW']
    bad = check(new)
    for b in bad:
        print('오류', b)
    if bad:
        sys.exit(1)
    font = ImageFont.truetype(os.path.join(HERE, '..', '..', '..', 'node_modules', 'galmuri', 'dist', 'Galmuri11.ttf'), 13)
    keys = list(new)
    cw, chh = 330, 100
    cols = 3
    rows = (len(keys) + cols - 1) // cols
    im = Image.new('RGB', (cols * cw + 20, rows * chh + 20), (24, 23, 30))
    d = ImageDraw.Draw(im)
    tile = (47, 46, 54)
    for i, k in enumerate(keys):
        x0, y0 = 10 + (i % cols) * cw, 10 + (i // cols) * chh
        old = icons16.render(icons16.ICONS[k])
        nw = icons16.render(new[k])
        for j, (img, sc) in enumerate(((old, 4), (nw, 4), (nw, 2), (nw, 1))):
            x = x0 + [0, 72, 144, 184][j]
            d.rectangle([x, y0, x + 16 * sc + 3, y0 + 16 * sc + 3], fill=tile)
            big = img.resize((16 * sc, 16 * sc), Image.NEAREST)
            im.paste(big, (x + 2, y0 + 2), big)
        d.text((x0 + 210, y0 + 6), icons16.NAMES[k], fill=(236, 232, 222), font=font)
        d.text((x0 + 210, y0 + 24), k, fill=(130, 127, 140), font=font)
        d.text((x0 + 4, y0 + 70), '지금 →  새 그림 (4배 · 2배 · 1배)', fill=(110, 108, 120), font=font)
    im.save(out)
    print(out, len(keys), '장')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
