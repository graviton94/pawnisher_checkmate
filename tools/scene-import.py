"""장면 그림 넣기 (D-172 → D-185): 받은 그림의 숨은 도트 격자를 찾아(tools/pixel/snap.py) 칸 하나 = 1px 진짜 도트로 되돌리고
기록된 수동 격자값(scene_recipe.py)은 재사용한다.
팔레트는 줄이지 않고(컷신 = 그림 역할) public/scenes/<이름>.png로, 원본은 build-res/order에 보관.
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
import scene_recipe  # noqa: E402


def one(src, name):
    # 컷신 그림은 '그림' 역할 (사용자 결정): 격자만 맞추고 팔레트는 줄이지 않는다 (칸마다 대표색 그대로)
    snap.run(src, f'public/scenes/{name}.png', **scene_recipe.options(name))


if sys.argv[1] == '--redo':
    for f in sorted(glob.glob('build-res/order/V-*-source.png')):
        m = re.match(r'V-\d+-(.+)-source\.png', os.path.basename(f))
        if m and os.path.exists(f'public/scenes/{m.group(1)}.png'):
            one(f, m.group(1))
else:
    src, name, vid = sys.argv[1], sys.argv[2], sys.argv[3]
    stored = f'build-res/order/{vid}-{name}-source.png'
    if os.path.realpath(src) != os.path.realpath(stored):
        shutil.copy(src, stored)
    one(src, name)
