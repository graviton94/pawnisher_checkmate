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


def plate(base, hi, lo, rivet, rivet_lo):
    """철판 칸: 위·왼쪽 1도트 빛, 아래·오른쪽 1도트 그늘, 모서리 리벳 4개 (얼룩 없음)"""
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
    return im


def crack():
    """붕락 예고: 철판에 간 가는 금 (1도트 검정 선이 지그재그로 갈라지고, 틈 사이로 붉은 쇳물 빛이 드문드문)"""
    im = canvas()
    # 본줄기: 왼쪽 위 → 오른쪽 아래로 한 칸씩 꺾이며 내려간다 (손으로 정한 경로 — 매번 같은 모양)
    main = [(3, 4), (4, 5), (5, 5), (6, 6), (7, 7), (7, 8), (8, 9), (9, 9), (10, 10), (11, 11), (11, 12), (12, 13), (13, 13), (14, 14), (15, 15), (16, 16)]
    # 가지: 본줄기에서 짧게 갈라져 가늘게 끝난다
    branches = [[(9, 9), (10, 8), (11, 7), (12, 7), (13, 6)], [(11, 12), (10, 13), (9, 14), (9, 15)], [(6, 6), (6, 5), (5, 3)], [(14, 14), (15, 13), (16, 13)]]
    for x, y in main:
        put(im, x, y, 'K')
    for br in branches:
        for x, y in br:
            put(im, x, y, 'K')
    # 틈 속 붉은 빛: 본줄기 가운데 몇 도트만
    for x, y in ((7, 7), (9, 9), (10, 10), (11, 11), (13, 13)):
        put(im, x, y, 'CR')
    for x, y in ((8, 9), (12, 13)):
        put(im, x, y, 'CR2')
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


plate('L', 'G', 'D', 'G', 'D').save(f'{OUT}/tile-light.png')
plate('D', 'L', 'INK', 'L', 'INK').save(f'{OUT}/tile-dark.png')
crack().save(f'{OUT}/crack.png')
range_frame().save(f'{OUT}/range.png')
print('ok')
