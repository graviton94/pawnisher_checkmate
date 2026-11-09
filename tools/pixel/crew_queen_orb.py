"""퀸 얼굴(crew-Q) 관 꼭대기 십자가 → 구슬 (D-350: 십자가는 킹의 표지라 퀸이 킹처럼 읽혔다). crew_faces.py 다음에 돌린다."""
import math
import os

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
P = os.path.join(ROOT, 'public', 'ui', 'hud', 'crew-Q.png')
im = Image.open(P).convert('RGBA')
px = im.load()
WHITE, INK = (244, 241, 234, 255), (11, 11, 14, 255)
GOLD = [(184, 134, 11, 255), (250, 204, 21, 255), (255, 243, 176, 255)]
cx, cy, r = 28.5, 6.5, 2.4
for y in range(1, 10):
    for x in range(23, 35):
        d = math.hypot(x + 0.5 - cx, y + 0.5 - cy)
        if d <= r:
            k = 2 if (x + 0.5 - cx) + (y + 0.5 - cy) < -1.6 else 1 if (x + 0.5 - cx) + (y + 0.5 - cy) < 1.2 else 0
            px[x, y] = GOLD[k]
        elif d <= r + 1.1:
            px[x, y] = INK
        elif d <= r + 3.0 and y < 8:
            px[x, y] = WHITE
        elif y < 8:
            px[x, y] = (0, 0, 0, 0)
# 구슬과 관을 잇는 목 (검은 선 안 금 한 칸)
for y in (9, 10):
    px[28, y] = GOLD[1]; px[29, y] = GOLD[0]; px[27, y] = INK; px[30, y] = INK
im.save(P)
print(P)
