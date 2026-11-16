"""기물 바닥 · 체력바 확대 크롭 (D-525) — tools/qa/anchor.cjs가 남긴 스크린샷 + 기물 위치 JSON으로
반장 본체 칸과 같은 줄 일반 기물의 아래쪽(받침 · 체력바)을 4배(최근접) 확대해 전/후를 나란히 붙인다.

사용: python3 -I tools/qa/anchor_crop.py <before.png> <after.png> <out.png> [scale=4]
  (각 png 옆의 같은 이름 .json을 읽는다)
"""
import json
import sys
from PIL import Image, ImageDraw


def crops(png):
    im = Image.open(png).convert('RGB')
    info = json.load(open(png[:-4] + '.json'))
    t, dpr = info['tile'], info['dpr']
    ps = info['pieces']
    boss = next((p for p in ps if p['boss']), None)
    # 거대 주물: 왼아래 부위를 본체처럼 — 2×2와 같은 줄 기물을 함께
    boss = boss or next((p for p in ps if p['giant'] and p['giant']['dx'] == 0 and p['giant']['dy'] == 0), None)
    out = []
    if boss:
        row = [p for p in ps if p['y'] == boss['y'] and p is not boss]
        # 반장 본체 칸 왼쪽 이웃부터 2×2 오른쪽 이웃까지 한 줄
        x0 = min([boss['c']['x']] + [p['c']['x'] for p in row]) - t / 2
        x1 = max([boss['c']['x'] + t] + [p['c']['x'] for p in row]) + t / 2
        y0, y1 = boss['c']['y'] - t * 1.6, boss['c']['y'] + t * 0.55
    else:
        # 일반 · 거대 판: 가장 기물이 많은 줄
        rows = {}
        for p in ps:
            rows.setdefault(p['y'], []).append(p)
        row = max(rows.values(), key=len)
        x0 = min(p['c']['x'] for p in row) - t / 2
        x1 = max(p['c']['x'] for p in row) + t / 2
        cy = row[0]['c']['y']
        y0, y1 = cy - t * 0.6, cy + t * 0.55
    box = tuple(round(v * dpr) for v in (x0, y0, x1, y1))
    out.append(im.crop(box))
    return out


def main():
    a, b, dst = sys.argv[1:4]
    k = int(sys.argv[4]) if len(sys.argv) > 4 else 4
    ca, cb = crops(a)[0], crops(b)[0]
    ca = ca.resize((ca.width * k, ca.height * k), Image.NEAREST)
    cb = cb.resize((cb.width * k, cb.height * k), Image.NEAREST)
    gap, head = 16, 28
    w = ca.width + cb.width + gap * 3
    h = max(ca.height, cb.height) + head + gap
    sheet = Image.new('RGB', (w, h), (11, 11, 14))
    d = ImageDraw.Draw(sheet)
    d.text((gap, 8), 'before', fill=(244, 241, 234))
    d.text((gap * 2 + ca.width, 8), 'after', fill=(244, 241, 234))
    sheet.paste(ca, (gap, head))
    sheet.paste(cb, (gap * 2 + ca.width, head))
    sheet.save(dst)


if __name__ == '__main__':
    main()
