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
    'CY': (0x38, 0xBD, 0xF8), 'CY2': (0x1E, 0x6E, 0x94), 'ST': (0xBF, 0xEF, 0xFF),
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
    '1': ['.#.', '##.', '.#.', '.#.', '###'], '2': ['##.', '..#', '.#.', '#..', '###'], '3': ['##.', '..#', '.#.', '..#', '##.'],
    '4': ['#.#', '#.#', '###', '..#', '..#'], '5': ['###', '#..', '##.', '..#', '##.'], '6': ['.##', '#..', '###', '#.#', '###'],
    '7': ['###', '..#', '.#.', '.#.', '.#.'], '8': ['###', '#.#', '###', '#.#', '###'], '9': ['###', '#.#', '###', '..#', '##.'],
}


def badge(ally, n):
    """순번 배지 11×11: 톱니 토큰 + 어두운 판 + 3×5 도트 숫자 (글꼴 대신 도트로 — 판과 같은 격자)"""
    im = ring(11, 3.3, 4.7, 'CY' if ally else 'CR', teeth=8, tooth_r=1.0, shade='CY2' if ally else 'CR2')
    for y in range(2, 9):
        for x in range(2, 9):
            if (x - 5) ** 2 + (y - 5) ** 2 <= 11:
                dot(im, x, y, 'INK')
    for y, row in enumerate(DIGITS[str(n)]):
        for x, ch in enumerate(row):
            if ch == '#':
                dot(im, 4 + x, 3 + y, 'W' if ally else 'CR')
    return im


def kill_mark():
    """처치될 기물 표시: 검은 테두리의 붉은 X 7×7"""
    rows = ['KK...KK', 'KrK.KrK', '.KrKrK.', '..KrK..', '.KrKrK.', 'KrK.KrK', 'KK...KK']
    return from_ascii(rows, {'K': 'K', 'r': 'CR'})


def check_ring():
    """체크: 킹 주위의 끊긴 붉은 톱니 고리 21×21 (정확히 위 가운데가 터져 있다, 좌우 대칭)"""
    import math
    return ring(N + 1, 7.8, 9.4, 'CR', teeth=10, tooth_r=0.9, gap=(-math.pi / 2 - 0.42, -math.pi / 2 + 0.42), shade='CR2')


def wreck():
    """처치된 자리의 잔해 9×5: 부서진 톱니와 스프링 (먹색 테두리)"""
    rows = ['.kggk....', 'kg..gk.s.', 'kg..gks.s', '.kggk..s.', 'kkkkkkkkk']
    return from_ascii(rows, {'g': 'G', 's': 'LG', 'k': 'INK'})


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
crack().save(f'{OUT}/crack.png')
range_frame(True).save(f'{OUT}/range.png')
range_frame(False).save(f'{OUT}/range-enemy.png')
select().save(f'{OUT}/select.png')
move_dot().save(f'{OUT}/move-dot.png')
target(False).save(f'{OUT}/target.png')
target(True).save(f'{OUT}/target-kill.png')
target(False, False).save(f'{OUT}/target-enemy.png')
for n in range(1, 10):
    badge(True, n).save(f'{OUT}/badge-a{n}.png')
    badge(False, n).save(f'{OUT}/badge-e{n}.png')
kill_mark().save(f'{OUT}/kill.png')
check_ring().save(f'{OUT}/check.png')
wreck().save(f'{OUT}/wreck.png')
for kind, name in (('neutral', 'stronghold'), ('ally', 'stronghold-ally'), ('enemy', 'stronghold-enemy')):
    stronghold(kind, 'frame').save(f'{OUT}/{name}.png')  # 점선 테두리 — 기물 아래
    stronghold(kind, 'flag').save(f'{OUT}/{name}-flag.png')  # 깃발 — 기물 위
print('ok')
