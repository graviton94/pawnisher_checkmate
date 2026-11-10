"""상아 서비스 카드 틀 (D-399): 부품 카드 틀(part-common.png)을 발주 15색 팔레트로 색만 갈아 끼운다.

새로 그리는 도트 없음 — 같은 격자 · 같은 모양, 색 대응표 하나(D-386 「다듬기」).
철 몸통 → 상아 램프(#F1EDE4 · #BFB9AD · #8E877A), 이름 리본 → 황동, 두루마리 · 먹 테는 그대로.
실행: python3 -I tools/pixel/card_ivory.py  (몇 번 돌려도 같은 결과)
"""
import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
SRC = os.path.join(ROOT, 'src/assets/ui/cards/part-common.png')
OUT = os.path.join(ROOT, 'src/assets/ui/cards/svc-ivory.png')

# 원본 색 → 팔레트 색 (팔레트: tools/pixel/ui_kit_import.py PAL)
MAP = {
    '0b0b0e': '0B0B0E',  # 먹 테
    '1a1920': 'BFB9AD',  # 몸통 → 상아
    '23222a': '8E877A', '24232b': '8E877A', '2e2d36': '8E877A', '2a2c36': '8E877A',  # 몸통 결 · 그림 창 둘레
    '121116': '33313B', '141319': '0B0B0E',  # 종류 띠 홈 (글이 밝은 색이라 어둡게 둔다)
    '9a98a4': 'F1EDE4', '757380': 'BFB9AD', '55535f': '8E877A', '3a3942': '56545E', 'c6c4ce': 'F1EDE4',  # 테 (빛 왼쪽 위)
    '7e869a': 'C89B3C', '5a6072': '8A6416', '3e4250': '8A6416',  # 이름 리본 → 황동
    'e8e0cc': 'F1EDE4', 'f4eedc': 'F1EDE4', 'd8ccae': 'BFB9AD', 'b8a882': '8E877A', '8a7a5a': '8E877A',  # 두루마리
    'f4d27a': 'F5C542', 'd4a24a': 'C89B3C', '7a5414': '8A6416', 'fff2c0': 'F1EDE4',  # 리벳 · 장식
}


def main() -> None:
    im = Image.open(SRC).convert('RGBA')
    px = im.load()
    miss = set()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            k = '%02x%02x%02x' % (r, g, b)
            if k not in MAP:
                miss.add(k)
                continue
            h = MAP[k]
            px[x, y] = (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 255)
    if miss:
        raise SystemExit(f'대응표에 없는 색: {sorted(miss)}')
    im.save(OUT, optimize=True)
    print('→', os.path.relpath(OUT, ROOT), im.size)


if __name__ == '__main__':
    main()
