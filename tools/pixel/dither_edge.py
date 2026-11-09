"""장면 그림 가장자리 디더 퇴장 가면 (D-398) — 그림이 끝나는 변을 먹 #0B0B0E 점으로 계단 없이 녹인다.

python3 -I tools/pixel/dither_edge.py  →  src/assets/ui/fx/dither-edge-{t,b,l,r}.png

Bayer 4×4 순서 디더: 변에서 안쪽으로 DEPTH 줄 동안 먹 점 밀도가 1 → 0으로 줄어든다(반투명 없음, 점은 먹 아니면 투명).
CSS가 1도트 = 장치 층 도트(--px)로 정수배 반복한다 (kit.css .ev-ov-bg::after).
"""
import os

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'src', 'assets', 'ui', 'fx')
DEPTH = 24
SOLID = 2  # 변에 바로 붙은 줄은 다 먹 (그림 끝 선이 보이지 않게)
BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
INK = (11, 11, 14, 255)
CLEAR = (0, 0, 0, 0)


def ramp():
    """위 변용 4×DEPTH: 0줄 = 변(먹), DEPTH−1줄 = 안쪽(거의 투명)"""
    im = Image.new('RGBA', (4, DEPTH), CLEAR)
    for y in range(DEPTH):
        cover = 1.0 if y < SOLID else 1 - (y - SOLID + 0.5) / (DEPTH - SOLID)
        for x in range(4):
            if (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16 < cover:
                im.putpixel((x, y), INK)
    return im


def main():
    os.makedirs(OUT, exist_ok=True)
    t = ramp()
    outs = {'t': t, 'b': t.transpose(Image.FLIP_TOP_BOTTOM), 'l': t.transpose(Image.TRANSPOSE), 'r': t.transpose(Image.TRANSPOSE).transpose(Image.FLIP_LEFT_RIGHT)}
    for k, im in outs.items():
        im.save(os.path.join(OUT, f'dither-edge-{k}.png'))
        print(k, im.size)


if __name__ == '__main__':
    main()
