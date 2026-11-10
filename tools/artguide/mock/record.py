"""
D-246 시안 프레임(PNG) → 움직이는 webp (tools/artguide/shots/d246-<장면>.webp). 12fps, 끝나면 처음부터.
사용: python3 -I tools/artguide/mock/record.py <프레임 폴더>
"""
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SHOTS = os.path.join(os.path.dirname(HERE), 'shots')


def main(src):
    for scene in sorted(os.listdir(src)):
        d = os.path.join(src, scene)
        if not os.path.isdir(d):
            continue
        frames = [Image.open(os.path.join(d, f)).convert('RGB') for f in sorted(os.listdir(d)) if f.endswith('.png')]
        out = os.path.join(SHOTS, f'd246-{scene}.' + ('png' if len(frames) == 1 else 'webp'))
        if len(frames) == 1:
            frames[0].save(out, optimize=True)
        else:
            # 마지막 장은 0.8초 머문다
            dur = [83] * (len(frames) - 1) + [800]
            frames[0].save(out, save_all=True, append_images=frames[1:], duration=dur, loop=0, quality=72, method=6)
        print(out, f'{os.path.getsize(out) / 1024:.0f} KB')


if __name__ == '__main__':
    main(sys.argv[1])
