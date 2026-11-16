"""2×2 반장 · 거대 주물 어울림 비교 시트 (D-526 검토 중) — tools/qa/gbfit.cjs 스크린샷(+ .json)으로
판 단위 전/후 나란히 + 반장(거대는 왼아래 부위) 2×2와 같은 줄 보통 기물을 4배(기기 픽셀 최근접) 확대한 크롭.

사용: python3 -I tools/qa/gbfit_sheet.py <스크린샷 폴더> <out.png> <판,판,...> <안,안,...> [--crop-only]
  판 = plate · plate-rage · … · giant-P, 안 = base(현재) · tone · relight · …  (파일: 2026-11-16-gbfit-<안>-<판>.png)
"""
import json
import os
import sys

from PIL import Image, ImageDraw

BOARD = (780, 150, 1620, 930)  # 915×412 DPR 2.625 판 영역(기기 픽셀)


def boss_crop(png, k=4):
    im = Image.open(png).convert('RGB')
    info = json.load(open(png[:-4] + '.json'))
    t, dpr = info['tile'], info['dpr']
    ps = info['pieces']
    b = next((p for p in ps if p['boss']), None) or next((p for p in ps if p['giant'] and p['giant']['dx'] == 0 and p['giant']['dy'] == 0), None)
    if not b:
        return None
    # 2×2 + 왼쪽 한 칸(보통 기물이 있으면 함께) · 위는 머리 위 반 칸, 아래는 체력바까지
    x0, x1 = b['c']['x'] - t * 1.5, b['c']['x'] + t * 1.5
    y0, y1 = b['c']['y'] - t * 1.62, b['c']['y'] + t * 0.52
    c = im.crop(tuple(round(v * dpr) for v in (x0, y0, x1, y1)))
    return c.resize((c.width * k, c.height * k), Image.NEAREST)


def main():
    d, dst, boards, vars_ = sys.argv[1], sys.argv[2], sys.argv[3].split(','), sys.argv[4].split(',')
    crop_only = '--crop-only' in sys.argv
    tiles = []
    for bd in boards:
        row = []
        for v in vars_:
            png = os.path.join(d, f'2026-11-16-gbfit-{v}-{bd}.png')
            parts = []
            if not crop_only:
                parts.append(Image.open(png).convert('RGB').crop(BOARD))
            c = boss_crop(png)
            if c:
                parts.append(c)
            row.append((f'{v} · {bd}', parts))
        tiles.append(row)
    gap, head = 12, 26
    colw = [max(sum(p.width for p in parts) + gap * (len(parts) - 1) for _, parts in [r[i] for r in tiles]) for i in range(len(vars_))]
    rowh = [max(max(p.height for p in parts) for _, parts in r) + head for r in tiles]
    sheet = Image.new('RGB', (sum(colw) + gap * (len(vars_) + 1), sum(rowh) + gap * (len(boards) + 1)), (11, 11, 14))
    dr = ImageDraw.Draw(sheet)
    y = gap
    for r, h in zip(tiles, rowh):
        x = gap
        for (label, parts), w in zip(r, colw):
            dr.text((x, y + 6), label, fill=(244, 241, 234))
            px = x
            for p in parts:
                sheet.paste(p, (px, y + head))
                px += p.width + gap
            x += w + gap
        y += h + gap
    sheet.save(dst)
    print(dst, sheet.size)


if __name__ == '__main__':
    main()
