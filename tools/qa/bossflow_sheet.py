"""반장전 대조 한 장 (D-690): bossflow 띠 그림에서 장면마다 한 칸씩 골라 반장 × (고치기 전 · 뒤) 격자로 붙인다.
사용: python3 -I tools/qa/bossflow_sheet.py <띠 폴더> <out.png>
"""
import os
import sys
from PIL import Image, ImageDraw

src, out = sys.argv[1], sys.argv[2]
BOSSES = ['plate', 'inspect', 'spawn', 'magnet', 'thorns', 'alarm', 'gilded']
NAMES = {'plate': '철갑', 'inspect': '검수', 'spawn': '조립', 'magnet': '자석', 'thorns': '출하', 'alarm': '경보', 'gilded': '도금왕'}
# (장면, 띠 안 칸 번호)
COLS = [('before', 'entry', 6), ('after', 'entry', 6), ('before', 'p2', 6), ('after', 'p2', 7), ('after', 'attack', 8), ('after', 'death', 8)]


def cell(path, i):
    if not os.path.exists(path):
        return None
    im = Image.open(path).convert('RGB')
    cols = 5
    w = (im.width - 4) // cols - 4
    h = (im.height - 4) // 2 - 18
    x, y = 4 + (i % cols) * (w + 4), 4 + (i // cols) * (h + 18) + 14
    return im.crop((x, y, x + w, y + h))


tiles = {}
tw = th = 0
for b in BOSSES:
    for tag, scene, i in COLS:
        c = cell(os.path.join(src, f'{tag}-{b}-{scene}.png'), i)
        tiles[(b, tag, scene)] = c
        if c:
            tw, th = max(tw, c.width), max(th, c.height)
LW, HH = 60, 18
sheet = Image.new('RGB', (LW + len(COLS) * (tw + 4), HH + len(BOSSES) * (th + 4)), (16, 16, 20))
d = ImageDraw.Draw(sheet)
for j, (tag, scene, _) in enumerate(COLS):
    d.text((LW + j * (tw + 4) + 4, 4), f'{tag} {scene}', fill=(250, 204, 21) if tag == 'after' else (160, 160, 170))
for r, b in enumerate(BOSSES):
    d.text((4, HH + r * (th + 4) + th // 2), b, fill=(240, 240, 240))
    for j, (tag, scene, _) in enumerate(COLS):
        c = tiles[(b, tag, scene)]
        if c:
            sheet.paste(c, (LW + j * (tw + 4), HH + r * (th + 4)))
sheet.save(out)
print(out, sheet.size)
