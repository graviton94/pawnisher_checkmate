"""띠 그림 (D-690): 프레임 JPG 여러 장을 반 크기로 2줄 격자에 이어 붙이고 장마다 ms 꼬리표를 단다.
사용: python3 -I tools/qa/bossflow_strip.py <out.png> <frame.jpg@ms> ...
"""
import sys
from PIL import Image, ImageDraw

out, items = sys.argv[1], sys.argv[2:]
frames = []
for it in items:
    f, _, ms = it.rpartition('@')
    im = Image.open(f).convert('RGB')
    im = im.resize((im.width // 2, im.height // 2), Image.NEAREST)
    frames.append((im, ms))
cols = min(5, len(frames))
rows = (len(frames) + cols - 1) // cols
w, h = frames[0][0].size
sheet = Image.new('RGB', (cols * (w + 4) + 4, rows * (h + 18) + 4), (16, 16, 20))
d = ImageDraw.Draw(sheet)
for i, (im, ms) in enumerate(frames):
    x, y = 4 + (i % cols) * (w + 4), 4 + (i // cols) * (h + 18)
    sheet.paste(im, (x, y + 14))
    d.text((x + 2, y + 1), f'{ms}ms', fill=(250, 204, 21))
sheet.save(out)
