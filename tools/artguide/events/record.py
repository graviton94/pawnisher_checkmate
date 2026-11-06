"""
사건 녹화 프레임(PNG + times.json) → 움직이는 webp (tools/artguide/shots/ev-<이름>.webp) · 실제 박자 그대로, 끝에 1초 머문다.
사용: python3 -I tools/artguide/events/record.py <프레임 폴더> [가로 폭=640]
"""
import json
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SHOTS = os.path.join(os.path.dirname(HERE), 'shots')


def main(src, width=640):
    for scene in sorted(os.listdir(src)):
        d = os.path.join(src, scene)
        if not os.path.isdir(d):
            continue
        names = sorted(f for f in os.listdir(d) if f.endswith('.png'))
        if not names:
            continue
        times = json.load(open(os.path.join(d, 'times.json')))
        frames = []
        for f in names:
            im = Image.open(os.path.join(d, f)).convert('RGB')
            k = width / im.width
            frames.append(im.resize((width, round(im.height * k)), Image.LANCZOS) if k < 1 else im)
        dur = [max(40, times[i + 1] - times[i]) for i in range(len(times) - 1)] + [1000]
        out = os.path.join(SHOTS, f'ev-{scene}.webp')
        frames[0].save(out, save_all=True, append_images=frames[1:], duration=dur[: len(frames)], loop=0, quality=70, method=4)
        print(out, len(frames), f'{os.path.getsize(out) / 1024:.0f} KB')


if __name__ == '__main__':
    main(sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 640)
