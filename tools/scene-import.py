"""장면 그림 넣기 (D-172): 받은 그림을 16색 팔레트 · 도트 격자로 맞춰 public/scenes/<이름>.png로, 원본은 build-res/order에 보관.
사용: python3 -I tools/scene-import.py <받은 그림> <사건 이름(pact · dipping …)> <V-번호>"""
import shutil, sys
from PIL import Image

src, name, vid = sys.argv[1], sys.argv[2], sys.argv[3]
PAL = ['0B0B0E', '16141C', '2F2E36', '56545E', '8A8794', 'C8C8C8', 'F4F1EA', '8C6239', 'C89B3C', 'FACC15', '7A1218', 'E5262F', '38BDF8', 'BFEFFF', 'E8783C', '7A3A18']
im = Image.open(src).convert('RGB')
w, h = im.size
tw = 362  # 4:3 장면 칸 기준 도트 폭 (V-07과 같은 굵기)
small = im.resize((tw, round(tw * h / w)), Image.BOX)
p = Image.new('P', (1, 1))
flat = [int(c[i:i + 2], 16) for c in PAL for i in (0, 2, 4)]
p.putpalette(flat + [0] * (768 - len(flat)))
small.quantize(palette=p, dither=Image.Dither.NONE).convert('RGB').save(f'public/scenes/{name}.png')
shutil.copy(src, f'build-res/order/{vid}-{name}-source.png')
print(f'public/scenes/{name}.png', small.size)
