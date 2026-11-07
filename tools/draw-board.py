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
    'CY': (0x38, 0xBD, 0xF8), 'CY2': (0x1E, 0x6E, 0x94), 'ST': (0xBF, 0xEF, 0xFF), 'CRL': (0xFF, 0x7B, 0x7B),
}
N = 20

# 막별 판 색 (2026-11-05, 체스 레퍼런스 판 110종 학습: 판마다 한 가지 색조 · 밝은 칸/어두운 칸 명도 차는 그대로).
# 명도는 기본 철판(L/D)과 같게 맞춰 기물 · 과녁 · 표식 대비가 막마다 같다. 색조만 바뀐다.
ACT_TILES = {
    1: {'b': (0x5E, 0x54, 0x4E), 'h': (0x86, 0x7A, 0x70), 'l': (0x35, 0x2E, 0x2B), 'd': (0x3A, 0x31, 0x2D), 'i': (0x1C, 0x16, 0x15), 'r': (0xB0, 0x82, 0x48)},  # 주조: 달군 쇠 · 녹 · 황동 리벳
    2: {'b': (0x50, 0x58, 0x66), 'h': (0x7A, 0x84, 0x94), 'l': (0x2E, 0x34, 0x3E), 'd': (0x2C, 0x32, 0x3C), 'i': (0x15, 0x19, 0x20), 'r': (0x9A, 0xA6, 0xB6)},  # 조립: 푸른 강철 · 강철 리벳
    3: {'b': (0x4C, 0x5C, 0x55), 'h': (0x74, 0x88, 0x7E), 'l': (0x2C, 0x37, 0x33), 'd': (0x2B, 0x36, 0x32), 'i': (0x14, 0x1C, 0x19), 'r': (0xC0, 0x7A, 0x4A)},  # 출하: 녹청 구리 · 구리 리벳
}


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


def last_move():
    """직전 수: 칸 네 모서리 꺾쇠 (검정 1도트 테 + 밝은 회색 — 파랑은 내 편 · 금은 처치 · 빨강은 위험이라 무채색) — 칸을 덮지 않아 판이 깨끗하다 (체스 레퍼런스 last_move 구성)"""
    im = canvas()
    L = 6
    for cx, cy, dx, dy in ((1, 1, 1, 1), (18, 1, -1, 1), (1, 18, 1, -1), (18, 18, -1, -1)):
        pts = [(cx + dx * i, cy) for i in range(L)] + [(cx, cy + dy * i) for i in range(L)]
        for x, y in pts:
            for ox in (-1, 0, 1):
                for oy in (-1, 0, 1):
                    if 0 <= x + ox < N and 0 <= y + oy < N and im.getpixel((x + ox, y + oy))[3] == 0:
                        put(im, x + ox, y + oy, 'K')
        for x, y in pts:
            put(im, x, y, 'LG')
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


def range_frame(ally=True):
    """공격 범위: 칸 가장자리 1도트 테두리 + 모서리 볼트 (내 공격 = 청록, 적 공격 = 진홍. 안쪽 옅은 채움은 코드가 알파로)"""
    main, dark = ('CY', 'CY2') if ally else ('CR', 'CR2')
    im = canvas()
    for i in range(N):
        for x, y in ((i, 1), (1, i), (i, N - 2), (N - 2, i)):
            if 1 <= x <= N - 2 and 1 <= y <= N - 2:
                put(im, x, y, main)
    for bx, by in ((1, 1), (N - 3, 1), (1, N - 3), (N - 3, N - 3)):
        put(im, bx, by, main)
        put(im, bx + 1, by, main)
        put(im, bx, by + 1, main)
        put(im, bx + 1, by + 1, dark)
    return im


def sprite(w, h):
    return Image.new('RGBA', (w, h), (0, 0, 0, 0))


def dot(im, x, y, c):
    if 0 <= x < im.size[0] and 0 <= y < im.size[1]:
        im.putpixel((x, y), P[c] + (255,))


def from_ascii(rows, colors):
    """글자 그림 → 도트 ('.' = 비움)"""
    im = sprite(len(rows[0]), len(rows))
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch != '.':
                dot(im, x, y, colors[ch])
    return im


def select():
    """선택: 칸 네 모서리의 청록 ㄱ자 (내 조작 = 청록, D-047) (2도트 굵기, 안쪽은 어두운 황동) — 기물을 가리지 않게 4×4"""
    im = sprite(N, N)
    for cx, cy, sx, sy in ((0, 0, 1, 1), (N - 1, 0, -1, 1), (0, N - 1, 1, -1), (N - 1, N - 1, -1, -1)):
        for i in range(5):
            dot(im, cx + sx * i, cy, 'CY' if i < 4 else 'CY2')
            dot(im, cx, cy + sy * i, 'CY' if i < 4 else 'CY2')
            dot(im, cx + sx * i, cy + sy, 'CY2' if i else 'CY')
            dot(im, cx + sx, cy + sy * i, 'CY2' if i else 'CY')
    return im


def move_dot():
    """갈 수 있는 칸: 작은 증기 방울 4×4"""
    return from_ascii(['.cc.', 'cwcc', 'cccc', '.cc.'], {'c': 'CY', 'w': 'W'})


def ring(size, r0, r1, color, teeth=0, tooth_r=0.0, gap=None, shade=None):
    """도트 고리 (선택적으로 톱니·틈·안쪽 그늘)"""
    import math
    im = sprite(size, size)
    c = (size - 1) / 2
    for y in range(size):
        for x in range(size):
            d = math.hypot(x - c, y - c)
            a = math.atan2(y - c, x - c)
            if gap and gap[0] <= a <= gap[1]:
                continue
            on = r0 <= d <= r1
            if teeth and r1 < d <= r1 + tooth_r:
                k = (a / (2 * math.pi) * teeth) % 1
                on = k < 0.28 or k > 0.72
            if on:
                dot(im, x, y, shade if shade and d < r0 + 0.7 else color)
    return mirror(im)


def mirror(im):
    """좌우 대칭: 왼쪽 절반을 오른쪽에 그대로 비춘다 (사용자 피드백 — 대칭이어야 할 그림은 정확히 대칭)"""
    w, h = im.size
    px = im.load()
    for y in range(h):
        for x in range(w // 2):
            px[w - 1 - x, y] = px[x, y]
    return im


def target(kill, ally=True):
    """치는 칸: 톱니 과녁 15×15 (홀수 — 가운데가 정확히 한 도트) — 내 공격 청록 / 적 공격 진홍, 처치면 금색 + 가운데 해골 (금색은 처치에만, D-047)"""
    main, dark = ('CY', 'CY2') if ally else ('CR', 'CR2')
    im = ring(15, 4.4, 6.2, 'GO' if kill else main, teeth=8, tooth_r=1.4, shade='BR2' if kill else dark)
    if kill:
        # 가운데 해골: 처치 숫자 옆과 같은 픽토그램 해골 (public/ui/hud/skull-small.png, tools/pixelize-icons.cjs)
        sk = mirror(Image.open('public/ui/hud/skull-small.png').convert('RGBA'))
        for y in range(sk.size[1]):
            for x in range(sk.size[0]):
                if sk.getpixel((x, y))[3]:
                    dot(im, 4 + x, 4 + y, 'GO')
    return im


DIGITS = {
    '0': ['###', '#.#', '#.#', '#.#', '###'],
    '1': ['.#.', '##.', '.#.', '.#.', '###'], '2': ['##.', '..#', '.#.', '#..', '###'], '3': ['##.', '..#', '.#.', '..#', '##.'],
    '4': ['#.#', '#.#', '###', '..#', '..#'], '5': ['###', '#..', '##.', '..#', '##.'], '6': ['.##', '#..', '###', '#.#', '###'],
    '7': ['###', '..#', '.#.', '.#.', '.#.'], '8': ['###', '#.#', '###', '#.#', '###'], '9': ['###', '#.#', '###', '..#', '##.'],
}


def badge(ally, n, cost=False):
    """순번 배지 11×11 (리뉴얼 2026-11-05 — 16칸 아이콘과 같은 빛 규칙): 검정 바깥선 + 톱니 고리(왼쪽 위 빛 · 오른쪽 아래 그늘)
    + 어두운 판 + 3×5 도트 숫자. 숫자는 내 편 · 적 모두 흰색 (진홍 바탕에 진홍 숫자는 안 읽혔다), 편은 고리 색으로.
    cost=True: 카드 태엽 비용 — 같은 톱니를 황동(UI 장치 색)으로 (D-162)"""
    import math
    hi, main, sh = ('GO', 'BR', 'BR2') if cost else (('ST', 'CY', 'CY2') if ally else ('CRL', 'CR', 'CR2'))
    size, c = 11, 5.0
    ring_cells, inner = set(), set()
    for y in range(size):
        for x in range(size):
            d = math.hypot(x - c, y - c)
            a = math.atan2(y - c, x - c)
            k = (a / (2 * math.pi) * 8 + 0.5) % 1
            if d <= 2.9:
                inner.add((x, y))
            elif d <= 3.9 or (d <= 4.9 and (k < 0.3 or k > 0.7)):
                ring_cells.add((x, y))
    im = sprite(size, size)
    body = ring_cells | inner
    for y in range(size):
        for x in range(size):
            if (x, y) in body:
                continue
            if any((x + dx, y + dy) in body for dx in (-1, 0, 1) for dy in (-1, 0, 1)):
                dot(im, x, y, 'K')
    for (x, y) in ring_cells:
        out = lambda dx, dy: (x + dx, y + dy) not in body
        dot(im, x, y, hi if (out(-1, 0) or out(0, -1)) and not (out(1, 0) or out(0, 1)) else sh if (out(1, 0) or out(0, 1)) else main)
    for (x, y) in inner:
        dot(im, x, y, 'INK')
    for y, row in enumerate(DIGITS[str(n)]):
        for x, ch in enumerate(row):
            if ch == '#':
                dot(im, 4 + x, 3 + y, 'W')
    return im


def kill_mark():
    """처치될 기물 표시: 검은 테두리의 붉은 X 7×7"""
    rows = ['KK...KK', 'KrK.KrK', '.KrKrK.', '..KrK..', '.KrKrK.', 'KrK.KrK', 'KK...KK']
    return from_ascii(rows, {'K': 'K', 'r': 'CR'})


VARIANT_GLYPHS = {
    'conveyor': ['#.#..', '.#.#.', '..#.#', '.#.#.', '#.#..'],
    'hammer': ['#####', '#####', '..#..', '..#..', '..#..'],
    'mirror': ['#...#', '#...#', '.#.#.', '.#.#.', '..#..'],
    'radiator': ['#####', '.....', '#####', '.....', '#####'],
    # 이형 2차 (D-106)
    'boiler': ['..#..', '.###.', '##.##', '#...#', '.###.'],
    'spring': ['#####', '...#.', '..#..', '.#...', '#####'],
    'scope': ['..#..', '.#.#.', '##.##', '.#.#.', '..#..'],
    'turret': ['#.#.#', '#####', '#...#', '#...#', '#####'],
    'command': ['#.#.#', '#####', '#####', '.....', '.###.'],
}


def variant_mark(kind):
    """이형 거푸집 표식 (D-084): 7×7 검정 바탕에 황동 5×5 문양 — 기물 오른쪽 위에 작게"""
    rows = ['K' * 7] + ['K' + ''.join('b' if ch == '#' else 'K' for ch in r) + 'K' for r in VARIANT_GLYPHS[kind]] + ['K' * 7]
    return from_ascii(rows, {'K': 'INK', 'b': 'BR'})


def check_ring():
    """체크: 킹 주위의 끊긴 붉은 톱니 고리 21×21 (정확히 위 가운데가 터져 있다, 좌우 대칭)"""
    import math
    return ring(N + 1, 7.8, 9.4, 'CR', teeth=10, tooth_r=0.9, gap=(-math.pi / 2 - 0.42, -math.pi / 2 + 0.42), shade='CR2')


def stronghold(kind, part):
    """요충지 칸 표시 (D-068): 칸 안쪽 한 도트 점선 테두리 + 왼쪽 위 깃발. 빈 요충지 = 흰색, 내가 점거 중 = 청록, 적 = 진홍.
    점거 진행 눈금은 코드가 칸 오른쪽 아래에 찍는다. part = 'frame'(기물 아래) / 'flag'(기물 위 레이어)"""
    main, dark = {'neutral': ('W', 'LG'), 'ally': ('CY', 'CY2'), 'enemy': ('CR', 'CR2')}[kind]
    im = canvas()
    # 점선 테두리: 안쪽 1도트, 두 칸 켜고 한 칸 끈다 (공격 범위의 실선 테두리와 구분)
    for i in range(1, N - 1) if part == 'frame' else ():
        on = (i % 3) != 0
        for x, y in ((i, 1), (1, i), (i, N - 2), (N - 2, i)):
            if on:
                put(im, x, y, main)
    # 깃발: 깃대 + 제비꼬리 깃발, 바깥 먹색 테두리 (어느 칸 색 위에서도 보이게)
    flag = [
        'pFFFFF',
        'pFFFFd',
        'pFFFd.',
        'pFFFFd',
        'pddddd',
        'p.....',
        'p.....',
        'b.....',
    ]
    ox, oy = 4, 3
    if part == 'frame':
        return im
    cells = {}
    for y, row in enumerate(flag):
        for x, ch in enumerate(row):
            if ch != '.':
                cells[(ox + x, oy + y)] = {'p': 'LG', 'F': main, 'd': dark, 'b': 'G'}[ch]
    for (x, y) in list(cells):
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            if (x + dx, y + dy) not in cells:
                put(im, x + dx, y + dy, 'INK')
    for (x, y), c in cells.items():
        put(im, x, y, c)
    return im


plate('L', 'G', 'D', 'G', 'D').save(f'{OUT}/tile-light.png')
plate('D', 'L', 'INK', 'L', 'INK').save(f'{OUT}/tile-dark.png')
for _a, _c in ACT_TILES.items():
    P.update({f'a{_a}b': _c['b'], f'a{_a}h': _c['h'], f'a{_a}l': _c['l'], f'a{_a}d': _c['d'], f'a{_a}i': _c['i'], f'a{_a}r': _c['r']})
    plate(f'a{_a}b', f'a{_a}h', f'a{_a}l', f'a{_a}r', f'a{_a}l').save(f'{OUT}/tile-light-a{_a}.png')
    plate(f'a{_a}d', f'a{_a}b', f'a{_a}i', f'a{_a}b', f'a{_a}i').save(f'{OUT}/tile-dark-a{_a}.png')

# 반장 판 (D-249, 사용자: 「반장 체스판이 기본 판보다 훨씬 구리다 — 반장 초상화에서 비롯된 라운드 특화 판」).
# 명도는 기본 판과 같게(기물 · 표식 대비 유지), 색조 · 무늬만 반장 것. 무늬는 칸 안쪽 1도트 선 · 점 몇 개뿐 (판이 시끄럽지 않게).
BOSS_TILES = {
    'plate': {'b': (0x5A, 0x4C, 0x46), 'h': (0x84, 0x70, 0x64), 'l': (0x32, 0x28, 0x25), 'd': (0x38, 0x2C, 0x28), 'i': (0x1A, 0x12, 0x10), 'r': (0xC8, 0x8A, 0x3C), 'm': (0xE0, 0x6A, 0x24), 'm2': (0x8C, 0x34, 0x18)},
    'spawn': {'b': (0x4A, 0x56, 0x62), 'h': (0x72, 0x84, 0x92), 'l': (0x2A, 0x32, 0x3C), 'd': (0x28, 0x30, 0x3A), 'i': (0x12, 0x18, 0x1E), 'r': (0x8A, 0xA0, 0xAE), 'm': (0x5F, 0xD4, 0xD8), 'm2': (0x2E, 0x8A, 0x90)},
    # 도금왕 (D-252): 검은 옻칠 판 · 금박 테 · 어두운 칸에 금 문장 점
    'gilded': {'b': (0x58, 0x4C, 0x3A), 'h': (0x86, 0x74, 0x52), 'l': (0x30, 0x28, 0x1C), 'd': (0x2E, 0x26, 0x1E), 'i': (0x14, 0x10, 0x0C), 'r': (0xF4, 0xC8, 0x4A), 'm': (0xF4, 0xC8, 0x4A), 'm2': (0x9A, 0x6A, 0x14)},
    'thorns': {'b': (0x52, 0x52, 0x5C), 'h': (0x7E, 0x7E, 0x8A), 'l': (0x2E, 0x2E, 0x36), 'd': (0x30, 0x2E, 0x36), 'i': (0x16, 0x14, 0x1A), 'r': (0xC8, 0xC4, 0xD0), 'm': (0xE8, 0xE4, 0xEC), 'm2': (0x7A, 0x12, 0x18)},
    # 새 반장 셋 (D-309 — 초상 색): 검수 = 찬 청강 · 검사등 / 자석 = 보라 쇠 · 자극 / 경보 = 붉은 쇠 · 경고등. 같은 막 짝과 색이 겹치지 않게 (철갑 주황 ↔ 검수 청록 · 조립 청록 ↔ 자석 보라 · 출하 은 ↔ 경보 빨강)
    'inspect': {'b': (0x4C, 0x58, 0x60), 'h': (0x74, 0x86, 0x90), 'l': (0x2A, 0x34, 0x3A), 'd': (0x2A, 0x32, 0x38), 'i': (0x12, 0x18, 0x1C), 'r': (0x9E, 0xE8, 0xF0), 'm': (0xC8, 0xF6, 0xFA), 'm2': (0xC8, 0x1E, 0x28)},
    'magnet': {'b': (0x54, 0x4C, 0x60), 'h': (0x7E, 0x72, 0x8E), 'l': (0x30, 0x2A, 0x3A), 'd': (0x30, 0x2A, 0x38), 'i': (0x16, 0x12, 0x1C), 'r': (0xB6, 0x5C, 0xD6), 'm': (0xD0, 0x8A, 0xF0), 'm2': (0xC8, 0x1E, 0x28)},
    'alarm': {'b': (0x5A, 0x46, 0x48), 'h': (0x86, 0x6A, 0x6C), 'l': (0x34, 0x24, 0x26), 'd': (0x38, 0x26, 0x28), 'i': (0x1A, 0x0E, 0x10), 'r': (0xC4, 0x24, 0x30), 'm': (0xFF, 0x6B, 0x6B), 'm2': (0x7A, 0x12, 0x18)},
}


def boss_tile(key, dark):
    c = BOSS_TILES[key]
    for k in c:
        P[f'{key}{k}'] = c[k]
    k = key
    im = plate(f'{k}d' if dark else f'{k}b', f'{k}b' if dark else f'{k}h', f'{k}i' if dark else f'{k}l', f'{k}r', f'{k}i' if dark else f'{k}l')
    if key == 'plate':
        # 달군 쇠: 어두운 칸에 쇳물이 스민 금 한 줄 (꺾인 1도트 선, 끝은 식은 색)
        if dark:
            for x, y in ((4, 13), (5, 12), (6, 12), (7, 11), (8, 11), (9, 10), (10, 10), (11, 9), (12, 9), (13, 8), (14, 8), (15, 7)):
                put(im, x, y, f'{k}m' if 6 <= x <= 13 else f'{k}m2')
        else:
            for x, y in ((5, 15), (6, 15), (14, 4)):
                put(im, x, y, f'{k}l')
    elif key == 'spawn':
        # 조립 라인: 밝은 칸엔 컨베이어 홈 두 줄, 어두운 칸엔 청록 표시등 하나
        if dark:
            put(im, 9, 9, f'{k}m'); put(im, 10, 9, f'{k}m'); put(im, 9, 10, f'{k}m2'); put(im, 10, 10, f'{k}m2')
        else:
            for x in range(5, 15):
                if x % 3 != 0:
                    put(im, x, 8, f'{k}l'); put(im, x, 12, f'{k}l')
    elif key == 'gilded':
        # 금박: 밝은 칸 안쪽 1도트 금 테(모서리 끊김), 어두운 칸 가운데 금 마름모
        if dark:
            for x, y in ((10, 8), (9, 9), (11, 9), (8, 10), (12, 10), (9, 11), (11, 11), (10, 12)):
                put(im, x, y, f'{k}m2')
            put(im, 10, 10, f'{k}m')
        else:
            for i in range(5, 15):
                if i not in (9, 10):
                    put(im, i, 4, f'{k}m2'); put(im, i, 15, f'{k}m2'); put(im, 4, i, f'{k}m2'); put(im, 15, i, f'{k}m2')
    elif key == 'inspect':
        # 검수대: 밝은 칸 안쪽 1도트 눈금 테 네 귀퉁이, 어두운 칸 가운데 검사등 점 (2×2)
        if dark:
            put(im, 9, 9, f'{k}m'); put(im, 10, 9, f'{k}r'); put(im, 9, 10, f'{k}r'); put(im, 10, 10, f'{k}l')
        else:
            for a, b in ((5, 5), (6, 5), (5, 6), (14, 5), (13, 5), (14, 6), (5, 14), (6, 14), (5, 13), (14, 14), (13, 14), (14, 13)):
                put(im, a, b, f'{k}l')
    elif key == 'magnet':
        # 자석: 어두운 칸에 작은 말굽(보라 몸 · 붉은 극), 밝은 칸엔 쇳가루 점 셋
        if dark:
            for x, y in ((8, 8), (8, 9), (8, 10), (9, 11), (10, 11), (11, 10), (11, 9), (11, 8)):
                put(im, x, y, f'{k}r')
            put(im, 8, 7, f'{k}m2'); put(im, 11, 7, f'{k}m2')
        else:
            for x, y in ((6, 9), (9, 6), (13, 12)):
                put(im, x, y, f'{k}l')
    elif key == 'alarm':
        # 경보: 어두운 칸 가운데 붉은 경고등(점 + 둘레 어두운 고리), 밝은 칸 아래 끝에 짧은 경고 줄무늬
        if dark:
            for x, y in ((10, 8), (9, 9), (11, 9), (10, 10)):
                put(im, x, y, f'{k}m2')
            put(im, 10, 9, f'{k}m')
        else:
            for x in range(5, 15):
                if (x // 2) % 2 == 0:
                    put(im, x, 14, f'{k}l')
    else:
        # 출하 문: 붉은 리벳(판 공통) + 어두운 칸에 가시 홈 하나
        if dark:
            for x, y in ((10, 6), (9, 7), (10, 7), (11, 7), (10, 8), (10, 9), (10, 10)):
                put(im, x, y, f'{k}i')
            put(im, 10, 6, f'{k}m2')
    return im


for _k in BOSS_TILES:
    boss_tile(_k, False).save(f'{OUT}/tile-light-b{_k}.png')
    boss_tile(_k, True).save(f'{OUT}/tile-dark-b{_k}.png')

last_move().save(f'{OUT}/last-move.png')
crack().save(f'{OUT}/crack.png')
range_frame(True).save(f'{OUT}/range.png')
range_frame(False).save(f'{OUT}/range-enemy.png')
select().save(f'{OUT}/select.png')
move_dot().save(f'{OUT}/move-dot.png')
target(False).save(f'{OUT}/target.png')
target(True).save(f'{OUT}/target-kill.png')
target(False, False).save(f'{OUT}/target-enemy.png')
for n in range(0, 10):
    badge(True, n, cost=True).save(f'{OUT}/badge-c{n}.png')
for n in range(1, 10):
    badge(True, n).save(f'{OUT}/badge-a{n}.png')
    badge(False, n).save(f'{OUT}/badge-e{n}.png')
kill_mark().save(f'{OUT}/kill.png')
for _k in VARIANT_GLYPHS:
    variant_mark(_k).save(f'{OUT}/variant-{_k}.png')
check_ring().save(f'{OUT}/check.png')
for kind, name in (('neutral', 'stronghold'), ('ally', 'stronghold-ally'), ('enemy', 'stronghold-enemy')):
    stronghold(kind, 'frame').save(f'{OUT}/{name}.png')  # 점선 테두리 — 기물 아래
    stronghold(kind, 'flag').save(f'{OUT}/{name}-flag.png')  # 깃발 — 기물 위
print('ok')
