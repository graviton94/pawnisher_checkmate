"""장면 그림 넣기 (D-172 → D-185): 받은 그림의 숨은 도트 격자를 찾아(tools/pixel/snap.py) 칸 하나 = 1px 진짜 도트로 되돌리고
그 그림의 32색으로 맞춰 public/scenes/<이름>.png로, 원본은 build-res/order에 보관.
(예전엔 폭 362로 상자 평균 축소 — 격자가 어긋나 번졌다)
사용: python3 -I tools/scene-import.py <받은 그림> <사건 이름(pact · dipping …)> <V-번호>
     python3 -I tools/scene-import.py --redo   (build-res/order의 원본 전부 다시)"""
import glob
import os
import re
import shutil
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'pixel'))
import snap  # noqa: E402


def one(src, name):
    snap.run(src, f'public/scenes/{name}.png', colors=32)


if sys.argv[1] == '--redo':
    for f in sorted(glob.glob('build-res/order/V-*-source.png')):
        m = re.match(r'V-\d+-(.+)-source\.png', os.path.basename(f))
        if m and os.path.exists(f'public/scenes/{m.group(1)}.png'):
            one(f, m.group(1))
else:
    src, name, vid = sys.argv[1], sys.argv[2], sys.argv[3]
    shutil.copy(src, f'build-res/order/{vid}-{name}-source.png')
    one(src, name)
