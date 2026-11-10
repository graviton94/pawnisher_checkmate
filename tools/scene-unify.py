"""사건 장면 해상도 통일 (D-312): 받은 원본(build-res/order/V-*-source.png)을 모두 같은 도트 수(가로 256칸)로 다시 도트화한다.
격자 자동 찾기는 그림마다 반 칸 · 두 칸으로 잡혀 134 ~ 888칸까지 벌어졌다 → 칸 크기를 원본 폭 ÷ 256으로 정해 세밀함을 맞춘다.
python3 -I tools/scene-unify.py [가로칸=256]
"""
import glob
import os
import re
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'pixel'))
import snap  # noqa: E402
from PIL import Image  # noqa: E402

W = int(sys.argv[1]) if len(sys.argv) > 1 else 256
for f in sorted(glob.glob('build-res/order/V-*-source.png')):
    m = re.match(r'V-\d+-(.+)-source\.png', os.path.basename(f))
    if not m:
        continue
    w = Image.open(f).width
    snap.run(f, f'public/scenes/{m.group(1)}.png', colors=0, pitch=w / W)
