"""
판 위 기하 도트를 직접 찍는다 (D-044: 반듯한 도형은 생성 AI보다 격자에 직접 찍는 게 정확하다).
칸 = 20×20 도트, 발주서 v2 팔레트 14색만 쓴다. 출력: public/ui/board/*.png (1도트 = 1px, 화면에서 정수배 확대)

사용: python3 -I tools/draw-board.py
"""
from PIL import Image

OUT = 'public/ui/board'
P = {
    'K': (0x0B, 0x0B, 0x0E), 'INK': (0x16, 0x14, 0x1C), 'D': (0x2F, 0x2E, 0x36), 'L': (0x56, 0x54, 0x5E),
    'G': (0x8A, 0x87, 0x94), 'LG': (0xC8, 0xC8, 0xC8), 'W': (0xF4, 0xF1, 0xEA), 'BR2': (0x8C, 0x62, 0x39),
    'BR': (0xC8, 0x9B, 0x3C), 'GO': (0xFA, 0xCC, 0x15), 'CR2': (0x7A, 0x12, 0x18), 'CR': (0xE5, 0x26, 0x2F),
}
N = 20


def canvas():
    return Image.new('RGBA', (N, N), (0, 0, 0, 0))


def put(im, x, y, c):
    if 0 <= x < N and 0 <= y < N:
        im.putpixel((x, y), P[c] + (255,))


def plate(base, hi, lo, rivet, rivet_lo, scratch):
    """철판 칸: 위·왼쪽 1도트 빛, 아래·오른쪽 1도트 그늘, 모서리 리벳 4개, 잔 긁힘 몇 개"""
    im = canvas()
    for y in range(N):
        for x in range(N):
            put(im, x, y, base)
    for i in range(N):
        put(im, i, 0, hi)
        put(im, 0, i, hi)
        put(im, i, N - 1, lo)
        put(im, N - 1, i, lo)
    for rx, ry in ((2, 2), (16, 2), (2, 16), (16, 16)):
        put(im, rx, ry, rivet)
        put(im, rx + 1, ry, rivet)
        put(im, rx, ry + 1, rivet)
        put(im, rx + 1, ry + 1, rivet_lo)
    # 긁힘: 칸마다 같은 자리 — 판 전체에 규칙적인 무늬가 생기지 않게 짧게
    for x, y in ((6, 7), (7, 7), (12, 12), (13, 13)):
        put(im, x, y, scratch)
    return im


def crack():
    """붕락 예고: 가운데서 갈라지는 붉은 금 (그늘 1도트)"""
    im = canvas()
    pts = [(10, 10), (9, 9), (8, 9), (7, 8), (6, 8), (5, 7), (4, 7), (3, 6), (2, 6),
           (11, 9), (12, 8), (12, 7), (13, 6), (14, 6), (15, 5), (16, 4),
           (11, 11), (12, 12), (12, 13), (13, 14), (13, 15), (14, 16), (15, 17),
           (9, 11), (8, 12), (8, 13), (7, 14), (6, 15), (6, 16), (5, 17),
           (7, 7), (7, 6), (14, 13), (15, 13)]
    for x, y in pts:
        put(im, x, y + 1, 'CR2')
    for x, y in pts:
        put(im, x, y, 'CR')
    return im


def range_frame():
    """공격 범위: 칸 가장자리 1도트 붉은 테두리 + 모서리 볼트 (안쪽은 비움 — 옅은 채움은 코드가 알파로)"""
    im = canvas()
    for i in range(N):
        for x, y in ((i, 1), (1, i), (i, N - 2), (N - 2, i)):
            if 1 <= x <= N - 2 and 1 <= y <= N - 2:
                put(im, x, y, 'CR')
    for bx, by in ((1, 1), (N - 3, 1), (1, N - 3), (N - 3, N - 3)):
        put(im, bx, by, 'CR')
        put(im, bx + 1, by, 'CR')
        put(im, bx, by + 1, 'CR')
        put(im, bx + 1, by + 1, 'CR2')
    return im


def hatch():
    """위협: 4도트 간격의 정확한 대각 빗금 (칸끼리 이어 붙여도 선이 이어진다)"""
    im = canvas()
    for y in range(N):
        for x in range(N):
            if (x + y) % 4 == 0:
                put(im, x, y, 'CR')
    return im


plate('L', 'G', 'D', 'G', 'D', 'D').save(f'{OUT}/tile-light.png')
plate('D', 'L', 'INK', 'L', 'INK', 'INK').save(f'{OUT}/tile-dark.png')
crack().save(f'{OUT}/crack.png')
range_frame().save(f'{OUT}/range.png')
hatch().save(f'{OUT}/hatch.png')
print('ok')
