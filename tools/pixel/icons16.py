"""
16칸 도트 아이콘 (D-182): 부품 24 · 지도 노드 6.
그리는 법 — 14×14 안에 소문자 '재질'로 평평하게 칠하면, 스크립트가
  ① 왼위 가장자리는 밝게 · 오른아래 가장자리는 어둡게 (빛은 왼위에서)
  ② 둘레에 검정 외곽선 1칸
을 똑같이 입힌다. 대문자는 고정색(눈 · 못 · 선 같은 세부). 나사 · 태엽 시안과 같은 규칙.
사용: python3 -I tools/pixel/icons16.py sheet <out.png>   |   export public/ui/icons16 (게임용 32px PNG, 정중앙)
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))

# 재질: (밝음, 바탕, 그늘)
RAMP = {
    'l': ('#ecebf2', '#a8a4b2', '#6b6876'),  # 쇠
    'g': ('#8a8794', '#56545e', '#33313b'),  # 검은 쇠
    'y': ('#fff3b0', '#facc15', '#b8860b'),  # 금
    'u': ('#f5c542', '#c89b3c', '#8a6416'),  # 황동
    'r': ('#ff7b7b', '#e5262f', '#7a1218'),  # 피 · 진홍
    'c': ('#e6fffb', '#5eead4', '#1f8a7a'),  # 청록 (유리 · 전기)
    'b': ('#c08552', '#8b5a2b', '#5a3a1c'),  # 나무
    'w': ('#ffffff', '#f1ede4', '#bfb9ad'),  # 종이 · 뼈
    'o': ('#fff3b0', '#f59e0b', '#c2410c'),  # 불
    'p': ('#e9a2ff', '#b65cd6', '#6b2a84'),  # 보라 (계약)
    'k': ('#f6b38a', '#c56a3a', '#7a3b1c'),  # 구리
    'v': ('#8b5cf6', '#4c1d95', '#24093f'),  # 불길한 보라
    'd': ('#b3242c', '#6e1016', '#33060a'),  # 검붉은 (적 훈장)
    'a': ('#f2fdff', '#a5ecf7', '#4fb3cf'),  # 소다
}
FIX = {'K': '#0b0b0e', 'S': '#bfb9ad', 'Q': '#7a3b1c', 'P': '#d9824a', 'H': '#f6b38a', 'X': '#ffffff', 'E': '#3b2412', 'D': '#2a2830', 'M': '#7a1218', 'R': '#e5262f', 'T': '#fff3b0', 'A': '#8a6416', 'N': '#1f8a7a', 'O': '#f59e0b', 'G': '#56545e', 'Y': '#facc15', 'L': '#a8a4b2', 'W': '#f1ede4', 'C': '#5eead4'}


def mir(rows):
    """왼쪽 7칸을 오른쪽에 뒤집어 붙인다 (좌우 대칭 아이콘)"""
    return [r + r[::-1] for r in rows]


ICONS = {}
NAMES = {}


def icon(key, name, rows):
    rows = [r.ljust(14, '.')[:14] for r in rows] + ['.' * 14] * (14 - len(rows))
    ICONS[key] = rows
    NAMES[key] = name


# ───────── 지도 노드 6 ─────────
icon('n.battle', '대국', [
    'll..........ll',
    'lll........lll',
    '.lll......lll.',
    '..lll....lll..',
    '...lll..lll...',
    '....llllll....',
    '.....llll.....',
    '....llllll....',
    '.u.lll..lll.u.',
    '.uulll..llluu.',
    '..uuu....uuu..',
    '.bbuu....uubb.',
    'bbb........bbb',
    'yy..........yy',
])
icon('n.shop', '고물상', [
    '...y.y........',
    '..yyyyy...l...',
    '.yyyKyyy.lll..',
    '..yKKKy...lg..',
    '.yyyKyyy..lg..',
    '..yyyyy...gg..',
    'bbbbbbbbbbbbbb',
    'bEEEEEEEEEEEEb',
    'bEbbbbbbbbbbEb',
    'bbEbbbbbbbbEbb',
    'bbbEbbbbbbEbbb',
    'bbbbEbbbbEbbbb',
    'bEEEEEEEEEEEEb',
    'bbbbbbbbbbbbbb',
])
# 공성 쇠뇌 (D-217 4, 룩 ×1.3): 쇠뇌 활 · 볼트
icon('rookBolt', '공성 쇠뇌', [
    'gg..........gg',
    '.gg........gg.',
    '..gg......gg..',
    '...gg....gg...',
    '....gggggg....',
    'wwwwwwwwwwwwwY',
    '....gggggg..Y.',
    '...gg.bb.gg...',
    '..gg..bb..gg..',
    '.gg...bb...gg.',
    'gg....bb....gg',
    '......bb......',
    '.....bbbb.....',
])
# 외눈 렌즈 (D-217 4, 비숍 ×1.3): 황동 테 외눈 렌즈 · 하늘색 유리 · 반사
icon('bishopLens', '외눈 렌즈', [
    '....yyyyyy....',
    '...ybbbbbby...',
    '..ybccccccby..',
    '.ybcwwcccccby.',
    '.ybcwcccccccby',
    '.ybccccccccby.',
    '.ybccccccccby.',
    '..ybccccccby..',
    '...ybbbbbby...',
    '....yyyyyyg...',
    '..........gg..',
    '...........gg.',
    '............g.',
])
# 개척자의 창 (D-217 4, 폰 +5): 짧은 창날 · 나무 자루
icon('pawnPike', '개척자의 창', [
    '...........ww.',
    '..........wwg.',
    '.........wwg..',
    '........wgg...',
    '.......bg.....',
    '......bb......',
    '.....bb.......',
    '....bb........',
    '...bb.........',
    '..bb..........',
    '.bb...........',
    'bb............',
])
# 작은 개척자의 맹세 (D-217, 폰 전용 황금 부품): 황동 방패 안 흰 폰
icon('oath', '작은 개척자의 맹세', [
    '.yyyyyyyyyyyy.',
    'ybbbbbbbbbbbby',
    'ybbbbbwwbbbbby',
    'ybbbbwwwwbbbby',
    'ybbbbbwwbbbbby',
    'ybbbbbwwbbbbby',
    'ybbbbwwwwbbbby',
    '.ybbwwwwwwbby.',
    '.ybbbbbbbbbby.',
    '..ybbbbbbbby..',
    '...ybbbbbby...',
    '....ybbbby....',
    '.....yyyy.....',
])
# 부품 상자 (D-215, 슬더스식 지도의 보물 노드): 황동 뚜껑 · 갈색 몸통 · 가운데 쇠 자물쇠
icon('n.chest', '부품 상자', [
    '..............',
    '...bbbbbbbb...',
    '..byyyyyyyyb..',
    '.byyyyyyyyyyb.',
    '.bbbbbbbbbbbb.',
    '.bEEEEggEEEEb.',
    '.bEEEgKKgEEEb.',
    '.bbbbgKKgbbbb.',
    '.bEEEEggEEEEb.',
    '.bEEEEEEEEEEb.',
    '.bEEEEEEEEEEb.',
    '.bbbbbbbbbbbb.',
])
icon('n.forge', '작업대', [
    '.........bb...',
    '........bbbb..',
    '..gggggggbbbb.',
    '..ggggggg.bb..',
    '.........bb...',
    '........bb....',
    '.lllllllllllll',
    'lllllllllllll.',
    '.llllllllllll.',
    '....llllll....',
    '.....llll.....',
    '.....llll.....',
    '...gggggggg...',
    '..gggggggggg..',
])

# ───────── 부품 24 ─────────
icon('horseshoe', '피 묻은 편자', [
    '...llllllll...',
    '..llllllllll..',
    '.lllKllllKlll.',
    '.lll......lll.',
    'llK........Kll',
    'lll........lll',
    'llK........Kll',
    'lll........lll',
    'lll........lll',
    'rll........llr',
    'rrl........lrr',
    '.rr........rr.',
    '.r..........r.',
    '.M..........M.',
])
icon('magnet', '약탈자의 집게', [
    'll........ll..',
    'lll......lll..',
    '.lll....lll...',
    '..lll..lll....',
    '...llllll.....',
    '....llll......',
    '....lKKl......',
    '....llll......',
    '.....gg.......',
    '.....gg.......',
    '.....gg.......',
    '....gggg......',
    '....uuuu......',
    '.....uu.......',
])
icon('lance', '기사의 창', [
    '............ll',
    '...........lll',
    '..........lll.',
    '.........lll..',
    '........lll...',
    '.......lll....',
    '......lll.....',
    '..rr.uuu......',
    '.rrrrrr.......',
    '.rruuurr......',
    '..ubbrr.......',
    '.ubb..........',
    'ubb...........',
    'bb............',
])
icon('tape', '되감는 테이프', [
    '..............',
    'gggggggggggggg',
    'glllllllllllg.',
    'glgggllllgggl.',
    'glgKglllglKgl.',
    'glgggllllgggl.',
    'glllllllllllg.',
    'gllbbbbbbbbllg',
    'glbbbbbbbbbblg',
    'gggggggggggggg',
    '..............',
    '..............',
    '..............',
    '..............',
])


# ───────── 도형으로 그리는 아이콘 (원 · 선 · 대칭을 계산으로 — 손으로 찍으면 대칭이 어긋난다) ─────────
class G:
    """w×14 격자. 13칸 너비는 가운데 열(6)이 있어 뾰족한 끝 · 보석이 한 칸으로 선다"""

    def __init__(self, w=13):
        self.w, self.h = w, 14
        self.c = [['.'] * w for _ in range(14)]

    def set(self, x, y, ch):
        x, y = int(x), int(y)
        if 0 <= x < self.w and 0 <= y < self.h:
            self.c[y][x] = ch
        return self

    def get(self, x, y):
        return self.c[y][x] if 0 <= x < self.w and 0 <= y < self.h else '.'

    def rect(self, x, y, w, h, ch):
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                self.set(xx, yy, ch)
        return self

    def pts(self, ch, *ps):
        for (x, y) in ps:
            self.set(x, y, ch)
        return self

    def line(self, x0, y0, x1, y1, ch, w=1):
        dx, dy = abs(x1 - x0), -abs(y1 - y0)
        sx, sy = (1 if x0 < x1 else -1), (1 if y0 < y1 else -1)
        err = dx + dy
        while True:
            for k in range(w):
                self.set(x0 + k, y0, ch)
            if x0 == x1 and y0 == y1:
                break
            e2 = 2 * err
            if e2 >= dy:
                err += dy
                x0 += sx
            if e2 <= dx:
                err += dx
                y0 += sy
        return self

    def disc(self, cx, cy, r, ch, inner=-1.0):
        for y in range(self.h):
            for x in range(self.w):
                d = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
                if inner < d <= r:
                    self.set(x, y, ch)
        return self

    def ell(self, cx, cy, rx, ry, ch, lo=-1.0, hi=1.0, keep=lambda x, y: True):
        for y in range(self.h):
            for x in range(self.w):
                d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
                if lo < d <= hi and keep(x, y):
                    self.set(x, y, ch)
        return self

    def mirror(self):
        """왼쪽을 오른쪽에 그대로 비춘다 (정확한 좌우 대칭)"""
        for y in range(self.h):
            for x in range(self.w // 2):
                self.c[y][self.w - 1 - x] = self.c[y][x]
        return self

    def done(self):
        return [''.join(r) for r in self.c]


def gear(g, cx, cy, r, ri, teeth, ch, phase=0.0):
    import math
    for y in range(g.h):
        for x in range(g.w):
            d = math.hypot(x - cx, y - cy)
            a = (math.atan2(y - cy, x - cx) / (2 * math.pi) * teeth + phase) % 1
            if d <= ri or (d <= r and a < 0.5):
                g.set(x, y, ch)


# 사건: 붉은 밀랍으로 봉한 편지
g = G()
g.rect(0, 3, 13, 9, 'w')
for i in range(7):
    g.set(i, 3 + i, 'S')
g.mirror()
g.disc(6, 9, 1.5, 'r').set(5, 8, 'T')
icon('n.event', '사건', g.done())

# 검문: 돋보기
g = G(14)
g.disc(5.5, 5.5, 5.2, 'l').disc(5.5, 5.5, 3.9, 'c').pts('X', (3, 3), (4, 3), (3, 4))
g.line(10, 10, 12, 12, 'b', w=2).pts('u', (9, 9), (10, 9), (9, 10))
icon('n.check', '검문', g.done())

# 심장 톱니 (D-219, 목숨 둘): 황동 톱니 속 붉은 심장 — 성한 것
g = G()
gear(g, 6, 6.5, 6.2, 4.5, 8, 'u', 0.25)
g.pts('r', (5, 5), (7, 5), (4, 6), (5, 6), (6, 6), (7, 6), (8, 6), (4, 7), (5, 7), (6, 7), (7, 7), (8, 7), (5, 8), (6, 8), (7, 8), (6, 9)).pts('X', (4, 6))
icon('life', '심장 톱니', g.done())
# 깨진 심장 톱니: 검은 쇠 · 이빨 하나 빠짐 · 가운데를 가르는 검은 금 · 꺼진 심장
g = G()
gear(g, 6, 6.5, 6.2, 4.5, 8, 'g', 0.25)
g.rect(9, 0, 4, 3, '.')
g.pts('d', (5, 5), (7, 5), (4, 6), (5, 6), (6, 6), (7, 6), (8, 6), (4, 7), (5, 7), (6, 7), (7, 7), (8, 7), (5, 8), (6, 8), (7, 8), (6, 9))
g.pts('K', (7, 1), (7, 2), (6, 3), (6, 4), (7, 5), (7, 6), (6, 7), (5, 8), (5, 9), (6, 10), (6, 11), (5, 12))
icon('life.crack', '깨진 심장 톱니', g.done())

# 반장: 검은 쇠 왕관 · 붉은 보석 (게임 왕관과 같은 꼴, 쇠로)
g = G()
g.rect(0, 4, 3, 3, 'g').rect(1, 3, 1, 1, 'g').rect(4, 2, 5, 5, 'g').rect(5, 1, 3, 1, 'g').rect(0, 6, 13, 5, 'g').mirror()
g.pts('r', (1, 2), (6, 0), (11, 2))
g.rect(5, 8, 3, 2, 'R').pts('T', (5, 8)).pts('R', (2, 8), (2, 9), (10, 8), (10, 9)).rect(1, 11, 11, 1, 'A')
icon('n.boss', '반장', g.done())

# 끝없는 생산선: 컨베이어 위 폰
g = G()
g.disc(6, 2, 2.3, 'w').rect(5, 4, 3, 1, 'w').rect(4, 5, 5, 1, 'w').rect(5, 6, 3, 1, 'w').rect(4, 7, 5, 1, 'w').rect(3, 8, 7, 1, 'w')
g.rect(1, 9, 11, 3, 'g').disc(1.2, 10, 1.5, 'g').disc(10.8, 10, 1.5, 'g')
g.pts('L', (2, 10), (6, 10), (10, 10)).pts('D', (4, 10), (8, 10))
g.pts('Y', (2, 13), (3, 12), (4, 13), (8, 13), (9, 12), (10, 13))
icon('assembly', '끝없는 생산선', g.done())

# 진군의 북
g = G()
g.line(0, 0, 4, 4, 'b').set(0, 0, 'w').mirror()
g.rect(1, 4, 11, 2, 'w').rect(0, 6, 13, 1, 'u').rect(0, 7, 13, 5, 'r').rect(0, 12, 13, 1, 'u')
for x0, y0, x1, y1 in [(0, 7, 2, 11), (2, 11, 4, 7), (4, 7, 6, 11), (6, 11, 8, 7), (8, 7, 10, 11), (10, 11, 12, 7)]:
    g.line(x0, y0, x1, y1, 'Y')
g.pts('T', (0, 6), (4, 6), (8, 6), (12, 6))
icon('drum', '진군의 북', g.done())

# 짓누르는 왕관: 금관에 깔린 폰
g = G()
g.rect(1, 1, 2, 3, 'y').rect(5, 0, 3, 4, 'y').rect(1, 4, 11, 3, 'y').mirror()
g.pts('R', (6, 5)).pts('C', (3, 5), (9, 5)).pts('T', (6, 1))
g.ell(6, 9, 5.5, 1.6, 'w').rect(2, 10, 9, 2, 'w').rect(1, 12, 11, 1, 'w')
g.pts('K', (4, 9), (8, 9)).pts('X', (0, 3), (0, 5), (12, 3), (12, 5))
icon('crown', '짓누르는 왕관', g.done())

# 걷는 옥좌: 붉은 등받이 · 쇠 다리
g = G()
g.rect(2, 1, 9, 7, 'y').rect(3, 2, 7, 5, 'r').pts('y', (2, 0), (6, 0)).set(6, 4, 'Y')
g.rect(1, 8, 11, 2, 'y').rect(2, 8, 9, 1, 'r')
g.pts('g', (3, 10), (2, 11), (1, 12), (5, 10), (5, 11)).pts('L', (1, 12)).pts('K', (0, 13), (1, 13), (5, 12))
g.mirror()
icon('throne', '걷는 옥좌', g.done())

# 폭주 코일: 달아오른 코일 · 위로 튀는 번개
g = G()
g.rect(2, 12, 9, 2, 'g').rect(5, 3, 3, 9, 'g')
for i in range(4):
    g.line(2, 5 + 2 * i, 10, 4 + 2 * i, 'O' if i % 2 else 'R')
g.disc(6, 1.5, 1.6, 'c').pts('X', (6, 1), (3, 1), (9, 1))
icon('coil', '폭주 코일', g.done())

# 메아리 톱니: 금 톱니 뒤에 청록 메아리 톱니
g = G(14)
gear(g, 8.8, 8.8, 4.6, 3.2, 8, 'c', 0.25)
gear(g, 5, 5, 4.9, 3.5, 8, 'y')
g.disc(5, 5, 1.3, 'K').disc(8.8, 8.8, 0.9, 'N')
icon('echo', '메아리 톱니', g.done())

# 공성 망치: 쇠머리 통나무 · 바퀴 둘
g = G(14)
g.rect(4, 4, 10, 4, 'b').rect(7, 4, 1, 4, 'g').rect(11, 4, 1, 4, 'g')
g.rect(1, 2, 4, 8, 'l').rect(0, 3, 1, 6, 'l').pts('K', (2, 4), (2, 7))
g.disc(6.5, 10.5, 2.1, 'b').disc(11.5, 10.5, 2.1, 'b').pts('K', (6, 10), (11, 10)).pts('E', (7, 10), (12, 10))
icon('hammer', '공성 망치', g.done())

# 녹슨 박차: 뒤꿈치 띠 · 별 톱니
g = G(14)
g.ell(5, 6.5, 5, 4.5, 'u', lo=0.38, keep=lambda x, y: x <= 6)
g.rect(6, 9, 4, 2, 'u')
cx, cy = 11, 9
for dx, dy in [(0, -3), (0, -2), (0, 2), (0, 3), (-2, 0), (2, 0), (-1, -1), (1, -1), (-1, 1), (1, 1), (0, -1), (0, 1), (-1, 0), (1, 0), (2, -2), (-2, 2), (2, 2), (-2, -2)]:
    g.set(cx + dx, cy + dy, 'l')
g.set(cx, cy, 'K').pts('b', (1, 5), (2, 9), (4, 2), (7, 10))
icon('spurs', '녹슨 박차', g.done())

# 막사의 종
g = G()
g.pts('g', (5, 0), (6, 0), (7, 0), (5, 1), (7, 1))
for y, hw in zip(range(2, 12), [1, 2, 3, 3, 3, 3, 4, 4, 5, 6]):
    g.rect(6 - hw, y, 2 * hw + 1, 1, 'u')
g.rect(0, 12, 13, 1, 'u').rect(1, 10, 11, 1, 'A')
for y in range(4, 9):
    g.set(4, y, 'T')
g.rect(5, 13, 3, 1, 'g')
icon('barracks', '막사의 종', g.done())

# 찢긴 군기
g = G(14)
g.rect(1, 1, 1, 13, 'b').pts('l', (1, 0)).pts('y', (0, 1), (2, 1))
for x in range(2, 13):
    top = 2 + (1 if 5 <= x <= 8 else 0)
    bot = [9, 9, 8, 9, 10, 10, 9, 10, 9, 8, 7][x - 2]
    g.rect(x, top, 1, bot - top + 1, 'r')
g.pts('.', (11, 5), (11, 6), (12, 4), (12, 5), (12, 6), (12, 7), (9, 7))
g.pts('Y', (5, 4), (4, 5), (5, 5), (6, 5), (4, 6), (5, 6), (6, 6), (3, 7), (4, 7), (5, 7), (6, 7), (7, 7))
icon('banner', '찢긴 군기', g.done())

# 녹슨 홀
g = G()
g.pts('y', (6, 0), (5, 1), (6, 1), (7, 1))
g.disc(6, 4.5, 2.6, 'y').pts('R', (6, 4), (6, 5))
g.rect(4, 7, 5, 1, 'u').rect(5, 8, 3, 4, 'u').rect(4, 12, 5, 1, 'u').rect(5, 13, 3, 1, 'y')
g.pts('b', (5, 9), (7, 10), (6, 11))
icon('scepter', '녹슨 홀', g.done())

# 도금 갑주: 가슴판 (가운데 능선 · 마디 · 리벳)
g = G()
rows = ['.yyy...', 'yyyyy..', 'yyyyyy.', 'yyyyyyA', '.yyyyyA', '.yyyyyA', '.yyyyyA', '..yyyyA', '..yyyyA', '..AAAAA', '..yyyyy', '..AAAAA', '...yyyy']
for y, r in enumerate(rows):
    for x, ch in enumerate(r):
        if ch != '.':
            g.set(x, y + 1, ch)
g.mirror().pts('T', (1, 2), (11, 2), (3, 11), (9, 11))
icon('gilded', '도금 갑주', g.done())

# 도화선: 폭탄
g = G(14)
g.disc(6, 8.5, 5, 'g').rect(5, 2, 3, 2, 'l')
g.pts('b', (7, 1), (8, 1)).pts('u', (9, 0))
g.pts('O', (11, 0), (10, 1), (12, 1), (11, 2)).set(11, 1, 'X')
g.pts('L', (3, 6), (3, 7), (4, 5))
icon('fuse', '도화선', g.done())

# 전도 코일: 쇠 막대에 감긴 구리 · 꿰뚫는 번개
g = G(14)
g.rect(0, 6, 2, 4, 'l').rect(12, 6, 2, 4, 'l').rect(2, 7, 10, 2, 'g')
for x in (3, 5, 7, 9):
    g.rect(x, 5, 1, 6, 'k')
g.pts('c', (6, 0), (5, 1), (6, 2), (7, 2), (6, 3), (7, 12), (6, 13), (8, 12)).pts('X', (5, 2), (7, 13))
icon('conductor', '전도 코일', g.done())

# 모루 장갑: 모루 문양 방패
g = G()
for y in range(14):
    hw = 6 if y < 7 else [6, 5, 5, 4, 3, 2, 1][y - 7]
    g.rect(6 - hw, y, 2 * hw + 1, 1, 'l')
g.rect(2, 3, 9, 1, 'D').rect(4, 4, 6, 1, 'D').rect(5, 5, 3, 2, 'D').rect(4, 7, 5, 1, 'D').set(1, 3, 'D')
g.pts('X', (1, 1), (11, 1))
icon('anvilPlate', '모루 장갑', g.done())

# 연쇄 사슬: 사슬로 이은 두 포탄
g = G(14)
g.disc(2.5, 2.5, 2.5, 'g').disc(11, 11, 2.5, 'g')
g.rect(4, 4, 3, 3, 'l').set(5, 5, '.').pts('l', (7, 7)).rect(8, 8, 3, 3, 'l').set(9, 9, '.')
g.pts('L', (1, 1), (10, 10))
icon('chainShot', '연쇄 사슬', g.done())

# 피의 계약: 두루마리 · 핏방울
g = G(14)
g.rect(2, 2, 10, 10, 'w').rect(1, 1, 12, 2, 'u').rect(1, 11, 12, 2, 'u')
g.rect(4, 4, 6, 1, 'S').rect(4, 6, 5, 1, 'S').pts('R', (4, 8), (5, 9), (6, 8), (7, 9), (8, 8))
g.pts('r', (11, 6), (11, 7), (10, 8), (11, 8), (12, 8)).disc(11, 9.6, 1.5, 'r')
icon('bloodPact', '피의 계약', g.done())

# 깨지는 유리 심장
g = G()
for y in range(14):
    for x in range(13):
        X, Y = (x - 6) / 5.0, (5.3 - y) / 4.6
        if (X * X + Y * Y - 1) ** 3 - X * X * Y ** 3 <= 0:
            g.set(x, y, 'c')
g.pts('X', (2, 2), (3, 2), (2, 3))
g.line(6, 3, 5, 5, 'K').line(5, 5, 7, 7, 'K').line(7, 7, 6, 9, 'K')
icon('brittle', '깨지는 유리 심장', g.done())

# 탐욕의 저울
g = G()
g.pts('y', (6, 0), (5, 1), (6, 1), (7, 1)).rect(6, 2, 1, 10, 'u').rect(1, 3, 11, 1, 'u')
g.pts('G', (1, 4), (1, 5), (0, 6), (2, 6), (3, 5) if False else (2, 5))
g.rect(0, 8, 5, 1, 'y').rect(1, 9, 3, 1, 'y').pts('y', (1, 7), (2, 7), (3, 7), (2, 6))
g.rect(4, 11, 5, 1, 'u').rect(3, 12, 7, 1, 'u').mirror()
icon('greed', '탐욕의 저울', g.done())

# 과부하 태엽: 달아오른 태엽 열쇠
g = G()
g.disc(3, 3.5, 3.1, 'u').rect(5, 2, 3, 4, 'u').pts('.', (3, 3), (3, 4))
g.rect(5, 6, 3, 3, 'u').rect(5, 9, 3, 3, 'o').rect(6, 12, 1, 2, 'o')
g.pts('O', (3, 9), (2, 10), (3, 11)).set(2, 10, 'X').mirror()
icon('spare', '과부하 태엽', g.done())


# ───────── 3판: 공개 아이콘(game-icons.net)을 참고해 손으로 다시 그린 21개 ─────────
import math as _m

# 사건: 밀랍 봉인 (참고 wax-seal) — 붉은 밀랍 · 둥글게 부푼 가장자리 · 왕관 문양
g = G()
g.disc(6, 6.5, 4.9, 'r')
for a in range(6):
    t = a / 6 * 2 * _m.pi + 0.5
    g.disc(6 + _m.cos(t) * 4.4, 6.5 + _m.sin(t) * 4.4, 1.6, 'r')
g.rect(4, 7, 5, 2, 'M').pts('M', (4, 6), (6, 5), (6, 6), (8, 6)).pts('R', (6, 8))
icon('n.event', '사건', g.done())

# 검문: 돋보기 (참고 magnifying-glass) — 오른위 렌즈 · 왼아래 손잡이
g = G(14)
g.disc(8.5, 5, 5, 'l').disc(8.5, 5, 3.6, 'c').pts('X', (6, 3), (7, 2), (6, 4))
g.line(4, 9, 1, 12, 'b', w=2).pts('g', (5, 8), (4, 8), (5, 9))
icon('n.check', '검문', g.done())

# 반장: 왕관 쓴 해골 (참고 crowned-skull)
g = G()
g.pts('r', (1, 0), (6, 0)).pts('g', (1, 1), (5, 1), (6, 1), (3, 2)).rect(1, 2, 6, 2, 'g')
g.disc(6, 7.6, 5.2, 'w', ).rect(0, 0, 13, 4, '.')  # 해골 머리 (왕관 자리 비움)
g.rect(1, 2, 6, 2, 'g').pts('g', (1, 1), (5, 1), (6, 1)).pts('r', (1, 0), (6, 0))
g.rect(3, 10, 4, 3, 'w').mirror()
g.rect(2, 6, 3, 2, 'K').rect(8, 6, 3, 2, 'K').pts('R', (3, 7), (9, 7)).pts('K', (6, 9), (4, 12), (6, 12), (8, 12)).pts('R', (6, 3))
g.pts('.', (0, 10), (12, 10), (1, 11), (11, 11))
icon('n.boss', '반장', g.done())

# 끝없는 생산선: 컨베이어 위에 줄지어 나오는 폰
g = G(14)
def pawn(cx, ch='w'):
    for j, r in enumerate(['.www.', 'wwwww', 'wwwww', '.www.', '..w..', '.www.', '.www.', 'wwwww', 'wwwww']):
        for i, c in enumerate(r):
            if c != '.':
                g.set(cx - 2 + i, j, ch)
pawn(9)
g.rect(1, 6, 3, 3, 'S').rect(2, 5, 1, 1, 'S')
g.rect(0, 9, 14, 3, 'g').pts('L', (1, 10), (5, 10), (9, 10), (13, 10)).pts('D', (3, 10), (7, 10), (11, 10))
g.pts('Y', (4, 13), (5, 12), (6, 13), (9, 13), (10, 12), (11, 13))
icon('assembly', '끝없는 생산선', g.done())

# 진군의 북 (참고 drum) — 타원 북면 · 지그재그 줄 · 엇갈린 북채
g = G()
g.rect(0, 5, 13, 6, 'r').ell(6, 10.6, 6.4, 1.9, 'r').ell(6, 10.6, 6.4, 1.9, 'u', lo=0.55, keep=lambda x, y: y >= 10)
g.ell(6, 4.6, 6.4, 1.9, 'w').ell(6, 4.6, 6.4, 1.9, 'u', lo=0.55, keep=lambda x, y: y >= 5)
for x0, y0, x1, y1 in [(0, 7, 2, 10), (2, 10, 4, 7), (4, 7, 6, 11), (6, 11, 8, 7), (8, 7, 10, 10), (10, 10, 12, 7)]:
    g.line(x0, y0, x1, y1, 'Y')
g.line(1, 0, 8, 4, 'b').line(11, 0, 4, 4, 'b').pts('w', (1, 0), (11, 0))
icon('drum', '진군의 북', g.done())

# 짓누르는 왕관: 금관이 폰을 짓누른다 (참고 weight-crush)
g = G()
g.rect(1, 1, 2, 3, 'y').rect(5, 0, 3, 4, 'y').rect(1, 4, 11, 3, 'y').mirror()
g.pts('R', (6, 5)).pts('C', (3, 5), (9, 5)).pts('T', (6, 1), (1, 1))
g.ell(6, 8.6, 5.6, 1.3, 'w').rect(2, 9, 9, 2, 'w').rect(1, 11, 11, 1, 'w')
g.pts('K', (4, 9), (8, 9)).pts('X', (0, 1), (0, 3), (12, 1), (12, 3)).rect(0, 12, 13, 2, 'g')
g.pts('X', (0, 10), (12, 10))
icon('crown', '짓누르는 왕관', g.done())

# 걷는 옥좌 (참고 throne-king) — 금 기둥 · 붉은 등받이 · 팔걸이 · 쇠 다리
g = G()
g.rect(2, 0, 1, 9, 'y').rect(3, 1, 4, 7, 'r').pts('y', (6, 0), (5, 1), (6, 1)).pts('T', (2, 0))
g.rect(0, 5, 2, 1, 'y').rect(0, 6, 1, 3, 'y')
g.rect(1, 8, 6, 2, 'y').rect(3, 8, 4, 1, 'r')
g.pts('g', (2, 10), (1, 11), (4, 10), (4, 11), (5, 12)).pts('L', (1, 11)).pts('K', (0, 12), (1, 12), (0, 13), (5, 13), (6, 13), (1, 13))
g.mirror().set(6, 3, 'Y')
icon('throne', '걷는 옥좌', g.done())

# 폭주 코일: 테슬라 코일 (참고 tesla-coil) — 쇠 고리관 · 구리 탑 · 양옆 번개
g = G()
g.ell(6, 2.5, 4.2, 1.5, 'l').rect(2, 12, 9, 2, 'g')
for y in range(4, 12):
    if y % 2 == 0:
        g.rect(4, y, 5, 1, 'k')
    else:
        g.rect(5, y, 3, 1, 'g')
g.pts('c', (1, 2), (0, 3), (1, 4), (0, 5), (1, 6)).pts('X', (0, 3), (1, 4)).mirror()
icon('coil', '폭주 코일', g.done())

# 메아리 톱니: 금 톱니 · 오른쪽으로 번지는 메아리 (참고 gears)
g = G(14)
gear(g, 5, 6.5, 5.2, 3.4, 6, 'y', 0.25)
g.disc(5, 6.5, 2.0, 'A').disc(5, 6.5, 1.2, 'K')
g.pts('c', (11, 2), (12, 3), (12, 4), (12, 5), (12, 6), (12, 7), (12, 8), (12, 9), (11, 10)).pts('c', (13, 4), (13, 5), (13, 6), (13, 7), (13, 8))
icon('echo', '메아리 톱니', g.done())

# 공성 망치 (참고 siege-ram) — 지붕 틀에 사슬로 매단 쇠머리 통나무 · 바퀴
g = G(14)
g.rect(2, 0, 11, 1, 'b').rect(2, 1, 1, 9, 'b').rect(12, 1, 1, 9, 'b').rect(1, 10, 13, 1, 'b')
g.pts('G', (5, 1), (5, 2), (5, 3), (9, 1), (9, 2), (9, 3))
g.rect(3, 4, 11, 3, 'b').rect(0, 3, 3, 5, 'l').pts('K', (1, 4), (1, 6)).rect(7, 4, 1, 3, 'g')
g.disc(4, 12, 1.6, 'g').disc(11, 12, 1.6, 'g').pts('K', (4, 12), (11, 12))
icon('hammer', '공성 망치', g.done())

# 녹슨 박차: 장화 뒤꿈치의 박차 (참고 cowboy-boot)
g = G(14)
g.rect(5, 0, 5, 8, 'b').rect(4, 0, 7, 1, 'b').rect(5, 7, 8, 3, 'b').pts('b', (13, 9)).rect(5, 10, 9, 1, 'E').rect(5, 11, 3, 1, 'E')
g.pts('u', (6, 2), (7, 3), (8, 2), (6, 5), (7, 4), (8, 5))
g.pts('u', (4, 9), (3, 9))
g.pts('l', (1, 7), (1, 8), (1, 10), (1, 11), (0, 9), (2, 9), (0, 8), (2, 8), (0, 10), (2, 10)).set(1, 9, 'K')
icon('spurs', '녹슨 박차', g.done())

# 막사의 종: 울리는 종 (참고 ringing-bell)
g = G()
g.pts('g', (5, 0), (6, 0), (7, 0))
for y, hw in zip(range(1, 10), [1, 2, 2, 2, 3, 3, 3, 3, 4]):
    g.rect(6 - hw, y, 2 * hw + 1, 1, 'u')
g.rect(1, 10, 11, 1, 'u').rect(2, 8, 9, 1, 'A').rect(5, 11, 3, 1, 'g')
for y in range(3, 8):
    g.set(5, y, 'T')
g.pts('T', (1, 3), (0, 4), (0, 5), (1, 6)).pts('T', (11, 3), (12, 4), (12, 5), (11, 6))
icon('barracks', '막사의 종', g.done())

# 찢긴 군기 (참고 tattered-banner) — 너덜너덜한 끝 · 구멍
g = G(14)
g.rect(1, 1, 1, 13, 'b').pts('l', (1, 0)).pts('y', (0, 1), (2, 1))
bots = [10, 9, 11, 8, 10, 9, 7, 10, 8, 6, 8]
for x in range(2, 13):
    top = 2 + (1 if 6 <= x <= 9 else 0)
    g.rect(x, top, 1, bots[x - 2] - top + 1, 'r')
g.pts('.', (12, 4), (12, 5), (11, 5), (8, 5), (5, 8))
g.pts('Y', (4, 4), (5, 4), (6, 5), (3, 5), (4, 5), (5, 5), (4, 6))
icon('banner', '찢긴 군기', g.done())

# 녹슨 홀: 날개 달린 홀 (참고 winged-scepter)
g = G()
g.disc(6, 2.4, 2.3, 'y').pts('R', (6, 2)).pts('T', (5, 1))
g.pts('w', (1, 3), (2, 3), (0, 4), (1, 4), (2, 4), (3, 4), (4, 4), (1, 5), (2, 5), (3, 5), (4, 5), (2, 6), (3, 6), (4, 6), (3, 7), (4, 7))
g.pts('S', (2, 4), (3, 5), (4, 6))
g.rect(4, 5, 5, 1, 'u').rect(5, 6, 3, 6, 'u').rect(4, 12, 5, 2, 'y').mirror()
g.pts('b', (5, 8), (7, 10), (6, 7))
icon('scepter', '녹슨 홀', g.done())

# 도금 갑주: 가슴판 + 둥근 어깨받이 (참고 breastplate)
g = G()
g.disc(1.6, 3.4, 1.9, 'u')
for y, hw in zip(range(2, 13), [4, 5, 5, 5, 4, 4, 4, 4, 3, 3, 3]):
    g.rect(6 - hw, y, hw + 1, 1, 'y')
g.pts('.', (5, 2), (6, 2), (6, 3)).mirror()
g.pts('.', (3, 6), (9, 6), (3, 7), (9, 7))
for y in range(4, 11):
    g.set(6, y, 'A')
g.rect(4, 9, 5, 1, 'A').rect(4, 11, 5, 1, 'A').pts('T', (1, 3), (11, 3), (4, 4), (8, 4))
icon('gilded', '도금 갑주', g.done())

# 도화선: 불꽃 튀는 폭탄 (참고 sparky-bomb)
g = G(14)
g.disc(5.5, 8.5, 4.9, 'g').rect(4, 3, 3, 2, 'l')
g.pts('b', (6, 2), (7, 1), (8, 1))
g.pts('O', (10, 0), (10, 4), (12, 2), (8, 2), (11, 1), (9, 1), (11, 3), (9, 3)).set(10, 2, 'X').pts('T', (10, 1), (10, 3), (9, 2), (11, 2))
g.pts('L', (2, 7), (2, 8), (3, 6), (4, 5))
icon('fuse', '도화선', g.done())

# 전도 코일: 구리선 실패 + 끝에 튀는 번개 (참고 wire-coil)
g = G(14)
g.rect(1, 1, 10, 2, 'b').rect(1, 11, 10, 2, 'b').rect(2, 3, 8, 8, 'k')
for y in (4, 6, 8):
    g.rect(2, y, 8, 1, 'Q')
g.pts('k', (10, 9), (11, 9), (12, 8), (12, 7), (12, 6)).pts('c', (13, 5), (12, 4), (13, 3)).set(12, 5, 'X')
icon('conductor', '전도 코일', g.done())

# 모루 장갑: 황동 테 방패 · 모루 문양 (참고 bordered-shield)
g = G()
for y, hw in zip(range(14), [6, 6, 6, 6, 6, 6, 6, 6, 5, 5, 4, 3, 2, 1]):
    g.rect(6 - hw, y, 2 * hw + 1, 1, 'u')
for y, hw in zip(range(1, 13), [5, 5, 5, 5, 5, 5, 5, 4, 4, 3, 2, 1]):
    g.rect(6 - hw, y, 2 * hw + 1, 1, 'l')
g.rect(2, 4, 8, 1, 'D').rect(4, 5, 6, 1, 'D').rect(5, 6, 3, 2, 'D').rect(4, 8, 5, 1, 'D').set(1, 4, 'D')
g.pts('T', (1, 1), (11, 1), (6, 12))
icon('anvilPlate', '모루 장갑', g.done())

# 연쇄 사슬: 대각선으로 엇갈린 고리 셋 (참고 breaking-chain)
g = G(14)
def hring(x, y):
    g.rect(x, y, 6, 4, 'l').rect(x + 1, y + 1, 4, 2, '.')
def vring(x, y):
    g.rect(x, y, 4, 6, 'l').rect(x + 1, y + 1, 2, 4, '.')
hring(0, 1); vring(4, 3); hring(7, 8)
g.rect(5, 4, 2, 1, 'l').rect(7, 8, 1, 1, 'l')
icon('chainShot', '연쇄 사슬', g.done())

# 피의 계약: 두루마리 + 깃펜 (참고 scroll-quill)
g = G(14)
g.rect(1, 3, 8, 9, 'w').rect(0, 2, 10, 2, 'u').rect(0, 11, 10, 2, 'u')
g.rect(2, 5, 5, 1, 'S').rect(2, 7, 4, 1, 'S').pts('R', (2, 9), (3, 10), (4, 9), (5, 10))
g.line(13, 0, 7, 9, 'l', w=2).pts('l', (12, 0), (13, 1), (11, 1), (12, 3), (10, 3), (11, 4)).pts('K', (7, 9), (6, 10)).pts('r', (6, 11), (6, 12))
icon('bloodPact', '피의 계약', g.done())

# 깨지는 유리 심장: 지그재그로 갈라진 하트 · 떨어지는 조각 (참고 broken-heart)
g = G()
for y in range(14):
    for x in range(13):
        X, Y = (x - 6) / 5.0, (5.3 - y) / 4.6
        if (X * X + Y * Y - 1) ** 3 - X * X * Y ** 3 <= 0:
            g.set(x, y, 'c')
for (x, y) in [(6, 1), (6, 2), (5, 3), (5, 4), (6, 5), (7, 6), (7, 7), (6, 8), (5, 9), (6, 10), (6, 11)]:
    g.set(x, y, '.')
g.pts('X', (2, 2), (3, 2), (2, 3), (9, 2))
icon('brittle', '깨지는 유리 심장', g.done())


# ───────── 4판: 불합격 14개 다시 (합격작처럼 — 정확한 대칭 · 화면을 꽉 채우는 실루엣 · 한 가지 생각) ─────────

def ascii_(g, x0, y0, rows):
    for j, r in enumerate(rows):
        for i, ch in enumerate(r):
            if ch != ' ':
                g.set(x0 + i, y0 + j, ch)

# 반장: 검은 쇠 왕관 · 붉은 구슬 끝 · 황동 테 · 가운데 마름모 보석
g = G()
ascii_(g, 0, 0, [
    '      r',
    '     rrr',
    '  r   r',
    ' rrr  g',
    '  g  ggg',
    ' ggg ggg',
    ' gggggggg',
    'uuuuuuu',
    'ggggggg',
    'ggggggg',
    'ggggggg',
    'uuuuuuu',
])
g.mirror()
g.pts('R', (6, 8), (5, 9), (6, 9), (7, 9), (6, 10)).pts('T', (6, 8)).pts('R', (2, 9), (10, 9))
g.pts('u', (0, 7), (12, 7), (0, 11), (12, 11))
icon('n.boss', '반장', g.done())

# 짓누르는 왕관: 불길한 보랏빛 가시 왕관 · 핏빛 보석 · 흘러내리는 피
g = G()
ascii_(g, 0, 0, [
    '      v',
    '   v  v',
    'v  v vvv',
    'vv vv vvv',
    'vvvvvvvvv',
    'vvvvvvvvv',
    'ggggggg',
    'vvvvvvv',
    'vvvvvvv',
    'ggggggg',
    ' M   M',
    ' M',
])
g.mirror()
g.pts('R', (2, 7), (6, 7), (10, 7), (6, 8)).pts('r', (2, 8), (10, 8)).pts('T', (6, 7))
g.pts('.', (0, 10), (12, 10)).pts('M', (5, 10), (9, 10), (9, 11), (9, 12)).pts('.', (7, 10), (7, 11))
icon('crown', '짓누르는 왕관', g.done())

# 검문: 돌 아치 안의 쇠살문 (참고 dungeon-gate)
g = G()
ascii_(g, 0, 0, [
    '   llll',
    ' llllll',
    'lll',
    'll',
    'll',
    'll',
    'll',
    'll',
    'll',
    'll',
    'll',
    'll',
    'll',
    'llll',
])
g.mirror()
for x in (3, 5, 7, 9):
    g.rect(x, 3, 1, 10, 'g').set(x, 12, 'G')
for y in (5, 9):
    g.rect(2, y, 9, 1, 'g')
g.pts('K', (4, 13), (6, 13), (8, 13)).pts('l', (3, 13), (5, 13), (7, 13), (9, 13))
icon('n.check', '검문', g.done())

# 끝없는 생산선: 폰을 감싸 도는 두 화살 (끝없이 다시 나온다)
g = G(14)
ascii_(g, 4, 3, [
    '  ww',
    ' wwww',
    '  ww',
    ' wwww',
    '  ww',
    ' wwww',
    'wwwwww',
])
for y in range(14):
    for x in range(14):
        d = _m.hypot(x - 6.5, y - 6.5)
        a = _m.degrees(_m.atan2(y - 6.5, x - 6.5))
        if 5.5 <= d <= 6.8 and not (-60 < a < -20 or 120 < a < 160):
            g.set(x, y, 'y')
ascii_(g, 9, 0, ['yyyy', ' yyy', '  yy'])
ascii_(g, 1, 11, ['yy', 'yyy', 'yyyy'])
icon('assembly', '끝없는 생산선', g.done())

# 메아리 톱니: 금 톱니 뒤로 청록 잔상 톱니 둘 (이동 잔상과 같은 생각)
g = G(14)
gear(g, 10.2, 6.5, 4.6, 3.0, 8, 'N', 0.25)
gear(g, 8.0, 6.5, 5.2, 3.5, 8, 'c', 0.25)
gear(g, 5.5, 6.5, 5.6, 3.9, 8, 'y', 0.25)
g.disc(5.5, 6.5, 2.0, 'A').disc(5.5, 6.5, 1.1, 'K')
icon('echo', '메아리 톱니', g.done())

# 공성 망치: 숫양 머리 쇠망치 + 통나무 + 매단 밧줄
g = G(14)
ascii_(g, 0, 0, [
    '        u   u',
    '  lll   u   u',
    ' l   l  u   u',
    ' l l l  u   u',
    ' l  ll  u   u',
    'llllllbbbbbbbb',
    'lKllllbgbbbbgb',
    'llllllbgbbbbgb',
    'llllllbbbbbbbb',
    ' llll',
])
icon('hammer', '공성 망치', g.done())

# 찢긴 군기: 가로대에 매단 세로 깃발 · 너덜한 꼬리 (참고 knight-banner)
g = G()
ascii_(g, 0, 0, [
    'y bbbbb',
    '  rrrrr',
    '  rrrrr',
    '  rrrrr',
    '  rrrrr',
    '  rrrrr',
    '  rrrrr',
    '  rrrrr',
    '  rrrrr',
    '  rrrrr',
    '  rr rr',
    '  r   r',
    '  r',
])
g.mirror().pts('b', (1, 0), (11, 0))
ascii_(g, 4, 2, ['  Y', ' YYY', 'YYYYY', ' YYY', '  Y'])
g.pts('.', (9, 7), (3, 4)).pts('.', (10, 10))
icon('banner', '찢긴 군기', g.done())

# 도금 갑주: 금 투구 (T자 눈 틈 · 숨구멍 · 붉은 깃털)
g = G()
ascii_(g, 0, 0, [
    '     rr',
    '    rrr',
    '   yyyy',
    '  yyyyy',
    ' yyyyyy',
    ' yyyyyy',
    ' yKKKKK',
    ' yyyyyK',
    ' yyyyyK',
    ' yKyyyK',
    ' yyyyyy',
    ' yKyyyy',
    '  uuuuu',
])
g.mirror().pts('T', (3, 3), (2, 4), (2, 5)).pts('.', (7, 0), (8, 0), (8, 1))
icon('gilded', '도금 갑주', g.done())

# 도화선: 다이너마이트 세 개 · 도화선 끝 불꽃
g = G(14)
for x0 in (2, 5, 8):
    g.rect(x0, 5, 3, 9, 'r')
g.rect(1, 9, 11, 2, 'u').pts('w', (3, 5), (6, 5), (9, 5))
g.pts('b', (6, 4), (6, 3), (7, 2), (8, 2), (9, 1))
g.pts('O', (11, 0), (11, 3), (12, 1), (10, 1), (12, 2), (10, 2)).pts('X', (11, 1), (11, 2)).pts('T', (13, 1), (11, 4) if False else (13, 2))
icon('fuse', '도화선', g.done())

# 전도 코일: 구리선을 감은 고리 (토로이드) · 둘레를 도는 전기
g = G()
g.disc(6, 6.5, 6.0, 'k', inner=2.6)
for a in range(12):
    t = a / 12 * 2 * _m.pi
    g.line(round(6 + _m.cos(t) * 3.2), round(6.5 + _m.sin(t) * 3.2), round(6 + _m.cos(t) * 5.6), round(6.5 + _m.sin(t) * 5.6), 'Q')
g.pts('c', (6, 4), (5, 5), (6, 6), (7, 7), (6, 8)).pts('X', (6, 6))
icon('conductor', '전도 코일', g.done())

# 모루 장갑: 황동 띠 · 리벳을 두른 묵직한 모루
g = G(14)
ascii_(g, 0, 1, [
    '   llllllllll',
    'lllllllllllll',
    ' llllllllllll',
    '   gggggggg',
    '    gggggg',
    '    uuuuuu',
    '    gggggg',
    '   gggggggg',
    '  gggggggggg',
    ' gggggggggggg',
    ' gggggggggggg',
])
g.pts('T', (4, 6), (9, 6)).pts('L', (4, 3), (8, 3))
icon('anvilPlate', '모루 장갑', g.done())

# 연쇄 사슬: 대각선으로 맞물린 굵은 고리 셋 (타원 고리를 45도로 눕혀 계산)
g = G(14)
def link(cx, cy, ch, ang, rx, ry, hole):
    c, s_ = _m.cos(ang), _m.sin(ang)
    for y in range(14):
        for x in range(14):
            u, v = (x - cx) * c + (y - cy) * s_, -(x - cx) * s_ + (y - cy) * c
            d = (u / rx) ** 2 + (v / ry) ** 2
            if hole < d <= 1.0:
                g.set(x, y, ch)
link(2.7, 2.7, 'l', _m.pi / 4, 3.9, 2.5, 0.28)
link(10.3, 10.3, 'l', _m.pi / 4, 3.9, 2.5, 0.28)
link(6.5, 6.5, 'g', _m.pi / 4, 3.0, 1.0, -1)
icon('chainShot', '연쇄 사슬', g.done())

# 피의 계약: 붉은 끈으로 묶은 두루마리 · 끈에서 떨어지는 피
g = G()
g.rect(1, 3, 11, 6, 'w').ell(0.8, 6, 1.2, 3, 'S').ell(11.2, 6, 1.2, 3, 'S').pts('K', (0, 6), (12, 6))
g.rect(5, 2, 3, 8, 'r').pts('r', (4, 10), (3, 11), (8, 10), (9, 11)).pts('M', (6, 10), (6, 11), (6, 12)).pts('r', (6, 13))
g.pts('T', (2, 4), (3, 4))
icon('bloodPact', '피의 계약', g.done())

# 깨지는 유리 심장: 소다빛 유리 하트 · 흰 반사 · 갈라지는 금 · 튀는 조각
g = G()
for y in range(14):
    for x in range(13):
        X, Y = (x - 6) / 5.0, (5.3 - y) / 4.6
        if (X * X + Y * Y - 1) ** 3 - X * X * Y ** 3 <= 0:
            g.set(x, y, 'a')
g.pts('X', (2, 2), (3, 2), (2, 3), (4, 4), (3, 5)).pts('c', (9, 9), (4, 9), (10, 4))
g.pts('N', (7, 2), (7, 3), (6, 4), (7, 5), (8, 5), (9, 6), (6, 6), (5, 7), (6, 8))
g.pts('.', (10, 8), (11, 7))
icon('brittle', '깨지는 유리 심장', g.done())


# ───────── 5판 ─────────

# 반장: 적군 훈장 — 검은 줄 검붉은 띠 · 검붉은 메달 · 금 왕관 문양
g = G()
ascii_(g, 0, 0, [
    '   dKdK',
    '   dKdK',
    '   dKdK',
    '    dKd',
    '     gg',
])
g.mirror()
g.disc(6, 9, 4.7, 'd').disc(6, 9, 3.3, 'r')
ascii_(g, 4, 7, ['Y Y Y', 'YYYYY', 'YYYYY'])
g.pts('T', (6, 6)).pts('A', (4, 10), (5, 10), (6, 10), (7, 10), (8, 10))
icon('n.boss', '반장', g.done())

# 메아리 톱니: 금 톱니 + 양옆 울림 호 (합격한 종과 같은 문법)
g = G()
gear(g, 6, 6.5, 5.0, 3.6, 8, 'y', 0.25)
g.pts('c', (1, 3), (0, 4), (0, 5), (0, 6), (0, 7), (0, 8), (1, 9)).mirror()
gear(g, 6, 6.5, 5.0, 3.6, 8, 'y', 0.25)
g.pts('K', (6, 6), (6, 7)).pts('A', (5, 6), (7, 6), (5, 7), (7, 7), (6, 5), (6, 8))
icon('echo', '메아리 톱니', g.done())

# 공성 망치: 쇠 대가리 큰 망치 (황동 띠 · 감은 손잡이)
g = G()
ascii_(g, 0, 1, [
    ' llllll',
    'lllllll',
    'lllllll',
    'lllllll',
    'lllllll',
    ' llllll',
    '     bb',
    '     bb',
    '     EE',
    '     bb',
    '     EE',
    '     bb',
    '     uu',
])
g.mirror()
g.rect(3, 1, 1, 6, 'u').rect(9, 1, 1, 6, 'u').pts('K', (1, 3), (11, 3), (1, 4), (11, 4))
icon('hammer', '공성 망치', g.done())

# 녹슨 박차: 장화 + 큰 별 박차 (금 · 녹)
g = G(14)
ascii_(g, 4, 0, [
    'bbbbbbb',
    ' bbbbb',
    ' bubub',
    ' bbubb',
    ' bubub',
    ' bbbbb',
    ' bbbbbbb',
    ' bbbbbbbbb',
    ' EEEEEEEEE',
    ' EE',
])
ascii_(g, 0, 7, [
    '  y',
    ' yyy  uu',
    'yyKyy',
    ' yyy',
    '  y',
])
g.pts('k', (1, 8), (3, 10))
icon('spurs', '녹슨 박차', g.done())

# 녹슨 홀: 작은 왕관 · 붉은 보주 · 녹 슨 자루
g = G()
ascii_(g, 0, 0, [
    '    y y',
    '    yyy',
    '     yy',
    '    rrr',
    '   rrrr',
    '   rrrr',
    '    rrr',
    '   uuuu',
    '     uu',
    '     uu',
    '    uuu',
    '     uu',
    '     uu',
    '    yyy',
])
g.mirror().pts('X', (5, 4)).pts('k', (5, 9), (7, 11), (6, 12)).pts('A', (4, 10), (8, 10))
icon('scepter', '녹슨 홀', g.done())

# 전도 코일: 두 구리 구슬 사이를 건너는 번개 (불꽃 틈)
g = G()
g.disc(2, 4.5, 2.1, 'k').rect(1, 7, 2, 5, 'g').rect(0, 12, 4, 2, 'g').mirror()
g.pts('c', (4, 4), (5, 3), (6, 4), (6, 5), (7, 6), (8, 5)).pts('X', (5, 4), (6, 4), (7, 5)).pts('T', (1, 3), (10, 3))
icon('conductor', '전도 코일', g.done())

# 도금 갑주: 금 흉갑 (목 · 팔 구멍 · 가슴 선 · 아래 마디)
g = G()
ascii_(g, 0, 0, [
    '  uu',
    ' yyyy',
    'yyyyyy',
    'yyyyyyy',
    ' yyyyyy',
    '  yyyyy',
    '  yyyyy',
    '  yyyyy',
    '  yyyyy',
    ' yyyyyy',
    ' AAAAAA',
    'yyyyyyy',
    ' AAAAAA',
    'yyyyyyy',
])
g.mirror().pts('.', (5, 1), (6, 1), (7, 1), (6, 2))
g.pts('A', (3, 6), (4, 7), (5, 7), (9, 6), (8, 7), (7, 7), (6, 3), (6, 4), (6, 5), (6, 6), (6, 8), (6, 9)).pts('T', (2, 3), (3, 2))
icon('gilded', '도금 갑주', g.done())

# 피의 계약: 아래로 향한 의식 단검 · 칼날의 피 · 떨어지는 핏방울
g = G()
ascii_(g, 0, 0, [
    '     yy',
    '    yRy',
    '     yy',
    ' yyyyyy',
    '  y  bb',
    '     ll',
    '     ll',
    '     ll',
    '     rl',
    '     rr',
    '      r',
    '',
    '      r',
])
g.mirror().pts('r', (6, 13)).pts('X', (5, 5))
icon('bloodPact', '피의 계약', g.done())


# ───────── 6판 ─────────

# 녹슨 박차: 장화 뒤축만 — 가죽 뒤꿈치 · 밑창 · 굽 · 감아 돈 녹슨 띠 · 뒤로 뻗은 별 톱니
g = G(14)
ascii_(g, 5, 0, [
    '  bbbbbbb',
    ' bbbbbbbb',
    ' bbbbbbbb',
    ' bbbbbbbb',
    ' bbbbbbbb',
    'bbbbbbbbb',
    'bbbbbbbbb',
    'bbbbbbbbb',
    'bbbbbbbbb',
    'EEEEEEEEE',
    'EEEEE',
    'EEEEE',
    'EEEEE',
])
g.rect(4, 6, 10, 2, 'u').pts('k', (7, 6), (11, 7), (13, 6)).rect(3, 6, 1, 2, 'u')
g.pts('S', (6, 1), (6, 3))
cx, cy = 1, 7
for dx, dy in [(0, -3), (0, -2), (0, 2), (0, 3), (-1, 0), (1, 0), (2, 0), (-1, -1), (1, -1), (-1, 1), (1, 1), (0, -1), (0, 1), (2, -2), (2, 2)]:
    g.set(cx + dx, cy + dy, 'l')
g.set(cx, cy, 'K')
icon('spurs', '녹슨 박차', g.done())

# 전도 코일: 상징 — 굵은 구리 고리 셋이 감은 금빛 번개
g = G()
ascii_(g, 0, 0, [
    '       yyyyy',
    '      yyyyy',
    '     yyyyy',
    '    yyyyy',
    '   yyyyy',
    '  yyyyyyyyyy',
    '       yyyy',
    '      yyyy',
    '     yyyy',
    '    yyy',
    '   yy',
    '  y',
])
for (y, x0, x1) in [(3, 3, 9), (7, 5, 10)]:
    g.rect(x0, y, x1 - x0 + 1, 1, 'P').rect(x0, y + 1, x1 - x0 + 1, 1, 'Q').set(x0, y, 'H')
icon('conductor', '전도 코일', g.done())

# 도금 갑주: 금빛 로마 투구 — 가로로 솟은 붉은 볏 · 눈썹 테 · 가는 눈 틈 · 코 가리개 · 한 줄 입 틈 · 볼 가리개
g = G()
ascii_(g, 0, 0, [
    '  rrrrr',
    ' rrrrrr',
    '   MMMM',
    '  yyyyy',
    ' yyyyyy',
    'yAAAAAy',
    'yKKKKyy',
    'yyyKKyy',
    'yyyyyyK',
    'yyyyyyK',
    'yyyyyyK',
    ' yyyyyK',
    ' yyyy K',
    '  yy',
])
g.mirror().pts('T', (2, 3), (1, 4), (1, 5))
icon('gilded', '도금 갑주', g.done())


# ───────── 7판: 아이템 교체 — 녹슨 박차 → 녹슨 등자, 도금 갑주 → 도금 방패 ─────────

# 녹슨 등자: 가죽 끈 · 둥근 쇠 아치 · 디딤판 (녹 점)
g = G()
ascii_(g, 0, 0, [
    '     bb',
    '     bb',
    '   llll',
    '  ll',
    ' ll',
    ' l',
    'll',
    'l',
    'l',
    'l',
    'ggggggg',
    'gLgLgLg',
    'ggggggg',
])
g.mirror().pts('k', (1, 6), (11, 4), (0, 8))
icon('spurs', '녹슨 등자', g.done())

# 도금 방패: 황동 테 금 방패 · 붉은 십자
g = G()
for y, hw in zip(range(14), [6, 6, 6, 6, 6, 6, 6, 6, 5, 5, 4, 3, 2, 1]):
    g.rect(6 - hw, y, 2 * hw + 1, 1, 'u')
for y, hw in zip(range(1, 13), [5, 5, 5, 5, 5, 5, 5, 4, 4, 3, 2, 1]):
    g.rect(6 - hw, y, 2 * hw + 1, 1, 'y')
g.rect(5, 2, 3, 9, 'R').rect(2, 4, 9, 3, 'R').pts('T', (5, 2), (2, 4))
icon('gilded', '도금 방패', g.done())


# ───────── 서비스 4 (고물상 · 작업대) ─────────

def card(g, x0=2, y0=1, w=9, h=12):
    g.rect(x0, y0, w, h, 'u').rect(x0 + 1, y0 + 1, w - 2, h - 2, 'w')
    ascii_(g, x0 + 3, y0 + 3, [' S', 'SSS', ' S', 'SSS'])

# 정비: 기름통 (쇠 몸통 · 황동 주둥이 · 떨어지는 기름 방울)
g = G(14)
g.rect(1, 6, 8, 7, 'l').rect(2, 5, 6, 1, 'l').rect(3, 3, 4, 2, 'u').rect(4, 2, 2, 1, 'g')
g.line(9, 7, 12, 4, 'u', w=1).pts('u', (9, 8), (10, 7), (11, 6))
g.pts('O', (13, 6), (13, 7)).pts('Y', (13, 8))
g.rect(2, 9, 6, 1, 'G').pts('T', (2, 7))
icon('s.heal', '정비', g.done())

# 수리: 엇갈린 렌치(벌린 턱 · 둥근 끝)와 붉은 손잡이 드라이버 — 굵게 2칸
g = G(14)
ascii_(g, 0, 0, ['l  l', 'l  l', 'llll', ' lll'])
g.line(3, 3, 11, 11, 'l', w=2).disc(12, 12, 1.5, 'l').set(12, 12, '.')
g.line(12, 0, 7, 5, 'l', w=2)
g.line(6, 7, 1, 12, 'r', w=2).pts('r', (0, 13), (1, 13), (0, 12))
icon('s.repair', '수리', g.done())

PAWN7 = ['  www', ' wwwww', ' wwwww', '  www', ' wwwww', '  www', '  www', ' wwwww', 'wwwwwww', 'wwwwwww']

# 카드 빼기: 흰 폰을 가로지르는 붉은 X
g = G()
ascii_(g, 3, 2, PAWN7)
g.line(0, 0, 12, 12, 'R').line(12, 0, 0, 12, 'R')
icon('s.remove', '카드 빼기', g.done())

# 다듬기: 흰 폰 + 반짝 (별빛 셋)
g = G(14)
ascii_(g, 2, 3, PAWN7)
g.pts('X', (11, 0), (11, 1), (11, 2), (11, 3), (11, 4), (9, 2), (10, 2), (12, 2), (13, 2)).pts('T', (10, 1), (12, 1), (10, 3), (12, 3))
g.pts('T', (1, 0), (0, 1), (1, 1), (2, 1), (1, 2)).pts('T', (12, 8), (11, 9), (12, 9), (13, 9), (12, 10))
icon('s.refine', '다듬기', g.done())


# ───────── 지휘 카드 13 (기물 없는 카드 — 예전 ★ · ✦ 기호를 대신) ─────────

# 지휘: 금별 훈장
g = G()
ascii_(g, 0, 0, [
    '      y',
    '      y',
    '     yyy',
    '     yyy',
    'yyyyyyyy',
    ' yyyyyyy',
    '  yyyyyy',
    '   yyyyy',
    '   yyyyy',
    '  yyyy y',
    '  yyy',
    ' yy',
])
g.mirror().pts('R', (6, 6), (6, 7)).pts('T', (6, 2), (5, 3))
icon('c.order', '지휘', g.done())

# 철벽: 리벳 박은 쇠 판
g = G()
g.rect(0, 1, 13, 12, 'l').rect(1, 2, 11, 10, 'g').rect(2, 3, 9, 8, 'l')
g.pts('K', (1, 2), (11, 2), (1, 11), (11, 11)).pts('X', (3, 4), (9, 4), (3, 9), (9, 9))
icon('c.plate', '철벽', g.done())

# 방벽: 돌벽 (엇갈린 벽돌 · 위 톱니)
g = G()
ascii_(g, 0, 0, ['lll lll lll', 'lllllllllllll'])
g.rect(0, 1, 13, 12, 'l')
for y in (4, 7, 10):
    g.rect(0, y, 13, 1, 'G')
for y0, xs in [(1, (4, 9)), (5, (2, 7, 11)), (8, (4, 9)), (11, (2, 7, 11))]:
    for x in xs:
        g.rect(x, y0, 1, 3 if y0 != 11 else 2, 'G')
g.pts('.', (3, 0), (7, 0), (11, 0), (12, 0))
icon('c.bulwark', '방벽', g.done())

# 응급 용접: 용접 토치 · 푸른 불꽃 · 튀는 불똥
g = G(14)
g.line(0, 12, 5, 7, 'l', w=3).rect(0, 11, 3, 3, 'r').rect(5, 6, 3, 2, 'u')
g.pts('c', (8, 5), (9, 4), (9, 5), (10, 3), (10, 4)).pts('X', (9, 4), (11, 2))
g.pts('O', (12, 0), (13, 3), (11, 6), (13, 6)).pts('T', (12, 4))
icon('c.repair', '응급 용접', g.done())

# 덧댐: 굵은 반창고 한 장 (가운데 거즈 · 숨구멍)
g = G(14)
for k in range(-2, 3):
    g.line(1 + max(0, k), 12 - max(0, -k) , 12 - max(0, -k), 1 + max(0, k), 'w') if False else None
for y in range(14):
    for x in range(14):
        if abs((x + y) - 13) <= 2.5 and 1 <= x <= 12 and 1 <= y <= 12:
            g.set(x, y, 'w')
for y in range(14):
    for x in range(14):
        if abs((x + y) - 13) <= 2.5 and abs(x - y) <= 3:
            g.set(x, y, 'S')
g.pts('G', (6, 5), (8, 7), (5, 8), (7, 6))
icon('c.quickFix', '덧댐', g.done())

# 태엽 감기: 태엽 열쇠 + 감기는 화살
g = G(14)
for y in range(14):
    for x in range(14):
        d = _m.hypot(x - 6.5, y - 6.5)
        a = _m.degrees(_m.atan2(y - 6.5, x - 6.5))
        if 5.6 <= d <= 6.8 and not (-80 < a < -30):
            g.set(x, y, 'c')
ascii_(g, 9, 0, ['cccc', ' ccc', '  cc'])
g.disc(5, 5.5, 2.1, 'u').disc(8, 5.5, 2.1, 'u').rect(6, 5, 2, 5, 'u').pts('K', (5, 5), (8, 5)).rect(6, 10, 2, 1, 'A')
icon('c.reload', '태엽 감기', g.done())

# 박자: 메트로놈 (나무 몸통 · 쇠 추)
g = G()
for y, hw in zip(range(2, 13), [1, 1, 2, 2, 2, 3, 3, 4, 4, 5, 6]):
    g.rect(6 - hw, y, 2 * hw + 1, 1, 'b')
g.rect(0, 12, 13, 2, 'E').rect(5, 8, 3, 3, 'w')
g.line(6, 10, 9, 1, 'l').rect(8, 3, 2, 2, 'u')
icon('c.tempo', '박자', g.done())

# 점화: 불꽃
g = G()
ascii_(g, 0, 0, [
    '      o',
    '     oo',
    '    ooo',
    '   oooo',
    '  ooooo  o',
    '  oooooo oo',
    ' ooooooooo',
    ' ooooooooo',
    'oooooooooo',
    'ooooooooooo',
    'ooooooooooo',
    ' ooooooooo',
    '  ooooooo',
])
ascii_(g, 4, 6, ['  y', ' yyy', ' yyyy', 'yyyyy', 'yyyyyy', ' yyyy'])
g.pts('X', (6, 9), (6, 10), (7, 10))
icon('c.spark', '점화', g.done())

# 분쇄: 충격 폭발 (도트 별 터짐 · 흰 심)
g = G()
ascii_(g, 0, 0, [
    'o     o',
    ' o   oo',
    ' oo ooo',
    '  ooooo',
    '  oyyyy',
    'ooyyyyy',
    ' oyyyXX',
])
for y in range(7):
    g.c[13 - y] = list(g.c[y])
g.mirror().pts('X', (5, 6), (6, 5), (6, 7), (7, 6))
icon('c.smash', '분쇄', g.done())

# 처형: 처형 도끼 (넓은 날 · 긴 자루)
g = G(14)
ascii_(g, 3, 0, [
    '      ll',
    '    lllll',
    '   llllll',
    '  lllllll',
    '  llllll',
    '   llll',
])
g.line(9, 1, 1, 12, 'b', w=2).pts('r', (2, 6), (3, 7), (4, 5)).pts('X', (6, 1), (5, 2))
g.pts('u', (0, 13), (1, 13))
icon('c.finisher', '처형', g.done())

# 몰아치기: 겹 화살 (오른쪽으로 밀어붙임)
g = G(14)
for ox, ch in [(0, 'w'), (5, 'y')]:
    for i in range(6):
        g.rect(ox + i, 1 + i, 3, 1, ch).rect(ox + i, 12 - i, 3, 1, ch)
    g.rect(ox + 6, 6, 3, 2, ch)
icon('c.shove', '몰아치기', g.done())

# 과부하: 압력계 — 쇠 테 · 붉은 눈금 칸 · 끝까지 넘어간 바늘
g = G()
g.disc(6, 6.5, 6, 'l').disc(6, 6.5, 4.8, 'w')
for y in range(14):
    for x in range(13):
        d = _m.hypot(x - 6, y - 6.5)
        a = _m.degrees(_m.atan2(y - 6.5, x - 6))
        if 3.4 <= d <= 4.8 and -60 <= a <= 20:
            g.set(x, y, 'R')
g.line(6, 7, 10, 4, 'K').pts('K', (5, 7), (6, 6), (6, 8)).pts('G', (2, 6), (3, 4), (5, 2))
icon('c.overload', '과부하', g.done())

# 땜질 보충병 (예전 강제 징집): 흰 폰 + 금 십자 (곁에 하나 더)
g = G(14)
ascii_(g, 0, 3, PAWN7)
g.rect(10, 1, 2, 6, 'y').rect(8, 3, 6, 2, 'y')
icon('c.draft', '땜질 보충병', g.done())


# ───────── 지휘 카드 2판: 처형 · 점화 · 분쇄 ─────────

# 처형: 단두대 — 나무 기둥 둘 · 비스듬한 칼날(붉은 날) · 목 틀
g = G()
g.rect(0, 0, 13, 1, 'b').rect(1, 1, 2, 12, 'b').rect(10, 1, 2, 12, 'b').rect(0, 12, 13, 2, 'E')
for x in range(3, 10):
    bot = 5 - (x - 3) // 3
    g.rect(x, 2, 1, bot - 2, 'l').set(x, bot, 'R')
g.pts('u', (6, 1))
g.rect(3, 9, 7, 2, 'b').pts('.', (5, 9), (6, 9), (7, 9), (6, 10)).rect(3, 8, 7, 1, 'E')
icon('c.finisher', '처형', g.done())

# 점화: 불붙은 성냥 — 나무 개비 · 붉은 머리 · 불꽃 · 튀는 불똥
g = G(14)
g.line(1, 13, 7, 7, 'b', w=2).disc(8.5, 6, 1.7, 'r')
ascii_(g, 7, 0, ['   o', '  ooo', ' ooooo', ' ooyoo', ' oyyyo', '  yyy'])
g.pts('X', (10, 4), (13, 1), (6, 2))
icon('c.spark', '점화', g.done())

# 분쇄: 두 쪽으로 갈라지는 바위 — 위에서 내리친 충격 별 · 튀는 돌 조각
g = G(14)
g.ell(7, 9.5, 6.4, 4.2, 'l').rect(3, 5, 8, 2, 'l')
g.pts('.', (5, 5), (6, 5), (7, 5), (8, 5), (9, 5), (6, 6), (7, 6), (8, 6), (6, 7), (7, 7), (6, 8), (7, 9), (8, 10), (7, 11), (7, 12), (7, 13))
g.pts('G', (3, 11), (4, 12), (11, 11), (10, 12))
g.pts('l', (1, 4), (2, 3), (12, 3), (13, 5), (0, 7))
g.pts('X', (7, 1), (7, 2), (6, 2), (8, 2), (7, 3)).pts('T', (5, 0), (9, 0), (4, 3), (10, 3))
icon('c.smash', '분쇄', g.done())


# ── 2차 리뉴얼 (2026-11-05, D-223): 레퍼런스 학습으로 새로 그린 손그림 14×14 (tools/pixel/icons16_v2/batch_*.py)
# 사용자 검토에서 전 버전이 낫다고 한 7장은 위의 예전 그림을 그대로 둔다.
KEEP_OLD = {'n.check', 'c.finisher', 'c.repair', 'banner', 'greed', 'bloodPact', 'n.chest'}


# ── 부품 확장 1 · 2차 전용 아이콘 (D-287): 빌려 쓰던 42장 → 새 키 (그림은 icons16_v2/batch_E~H.py)
PART_KEYS = {
    'whetstone': '닳은 숫돌', 'vise': '죔쇠', 'forkGear': '갈래 톱니', 'openGate': '열린 문', 'chainReel': '쇠사슬 감개', 'gameRecord': '낡은 기보',
    'gateHinge': '성문 경첩', 'queenCrown': '여왕의 관', 'lightCloak': '가벼운 망토', 'goldRank': '금박 끝 줄', 'thickWall': '두꺼운 성벽',
    'rosary': '사제의 묵주', 'stirrup': '기수의 등자', 'thickCast': '두꺼운 주물', 'scrapMagnet': '고철 자석', 'firstSpring': '선제 태엽',
    'lastAxle': '버팀 축', 'toolbox': '땜질 도구함', 'ventHole': '바람 구멍', 'afterheat': '잔열', 'bossBane': '반장 사냥꾼', 'lightMag': '가벼운 탄창',
    'mirror': '쌍거울', 'pinNeedle': '고정 바늘', 'whistle': '행군 호루라기', 'shieldWall': '방패벽', 'jumpSpring': '도약 용수철', 'saddle': '철 안장',
    'royalSeal': '옥새', 'queenFan': '여왕의 부채', 'rampart': '성가퀴', 'recoilSpring': '반동 용수철', 'mortar': '회반죽', 'tally': '셈 막대',
    'stainedGlass': '색유리', 'flywheel': '무거운 플라이휠', 'redLine': '붉은 눈금', 'coolant': '냉각수 통', 'piggyGear': '저금 톱니',
    'loupe': '확대경', 'stopwatch': '초시계', 'calipers': '측량 컴퍼스',
}
for _k, _n in PART_KEYS.items():
    if _k not in ICONS:
        icon(_k, _n, [])


def _load_v2():
    import runpy
    here = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'icons16_v2')
    for b in 'ABCDEFGH':
        f = os.path.join(here, f'batch_{b}.py')
        if not os.path.exists(f):
            continue
        for k, rows in runpy.run_path(f)['NEW'].items():
            if k in ICONS and k not in KEEP_OLD:
                ICONS[k] = rows


_load_v2()


def mix(a, b, t):
    """두 색 섞기 (t = b 쪽 비율) — 결과는 팔레트 한 칸, 그라데이션 아님"""
    return tuple(round(a[i] * (1 - t) + b[i] * t) for i in range(3)) + (255,)


def render(rows):
    """14×14 재질 그림 → 16×16 RGBA (명암 · 외곽선)"""
    n = 16
    grid = [['.'] * n for _ in range(n)]
    for j, r in enumerate(rows):
        for i, ch in enumerate(r[:14]):
            grid[j + 1][i + 1] = ch
    filled = lambda x, y: 0 <= x < n and 0 <= y < n and grid[y][x] != '.'
    out = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    px = out.load()
    hexc = lambda h: tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) + (255,)
    for y in range(n):
        for x in range(n):
            ch = grid[y][x]
            if ch == '.':
                if any(filled(x + dx, y + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1)):
                    px[x, y] = hexc(FIX['K'])
                continue
            if ch in RAMP:
                hi, base, sh = RAMP[ch]
                # 가장자리 = 빈칸이나 다른 재질과 닿은 곳 (대문자 세부색은 무시 — 세부 둘레가 지저분해지지 않게)
                same = lambda xx, yy: 0 <= xx < n and 0 <= yy < n and (grid[yy][xx] == ch or (grid[yy][xx] != '.' and grid[yy][xx] not in RAMP))
                top, left, bottom, right = not same(x, y - 1), not same(x - 1, y), not same(x, y + 1), not same(x + 1, y)
                # 리뉴얼 (2026-11-05, 참고 아이콘 1,243장 학습): 왼쪽 위 모서리 = 반짝 점, 오른쪽 아래 모서리 = 짙은 그늘 — 4단계 램프
                if top and left and not (bottom or right):
                    px[x, y] = mix(hexc(hi), (255, 255, 255, 255), 0.55)
                elif top or left:
                    px[x, y] = hexc(hi)
                elif bottom and right:
                    px[x, y] = mix(hexc(sh), (0, 0, 0, 255), 0.32)
                elif bottom or right:
                    px[x, y] = hexc(sh)
                else:
                    px[x, y] = hexc(base)
            elif ch == 'K':
                # 안쪽 선: 순검정 대신 둘레 재질의 그늘을 더 어둡게 (셀아웃 — 바깥 테두리는 검정 그대로, D-216)
                near = [grid[y + dy][x + dx] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)) if 0 <= x + dx < n and 0 <= y + dy < n and grid[y + dy][x + dx] in RAMP]
                if near:
                    m = max(set(near), key=near.count)
                    px[x, y] = mix(hexc(RAMP[m][2]), (0, 0, 0, 255), 0.55)
                else:
                    px[x, y] = hexc(FIX['K'])
            else:
                px[x, y] = hexc(FIX[ch])
    return out


def sheet(path):
    keys = [k for k in ICONS if k.startswith('n.')] + [k for k in ICONS if not k.startswith(('n.', 's.', 'c.'))] + [k for k in ICONS if k.startswith('s.')] + [k for k in ICONS if k.startswith('c.')]
    cols = 6
    S = 4
    cw, ch = 16 * S + 150, 16 * S + 70
    rows = (len(keys) + cols - 1) // cols
    W, H = cols * cw + 24, rows * ch + 90
    im = Image.new('RGB', (W, H), (14, 13, 18))
    d = ImageDraw.Draw(im)
    try:
        font = ImageFont.truetype(os.path.join(HERE, '..', '..', 'node_modules', 'galmuri', 'dist', 'Galmuri11-Bold.ttf'), 16)
        small = ImageFont.truetype(os.path.join(HERE, '..', '..', 'node_modules', 'galmuri', 'dist', 'Galmuri11.ttf'), 13)
    except OSError:
        font = small = ImageFont.load_default()
    d.text((16, 14), '16칸 도트 아이콘 시안 — 위 6개 지도 노드 · 아래 24개 부품 (큰 그림 4배 · 오른쪽 실제 크기 2배/1배)', fill=(250, 204, 21), font=font)
    for idx, k in enumerate(keys):
        x0 = 12 + (idx % cols) * cw
        y0 = 54 + (idx // cols) * ch
        icn = render(ICONS[k])
        d.rectangle([x0, y0, x0 + 16 * S + 8, y0 + 16 * S + 8], fill=(36, 35, 44))
        big = icn.resize((16 * S, 16 * S), Image.NEAREST)
        im.paste(big, (x0 + 4, y0 + 4), big)
        for t, sc in enumerate((2, 1)):
            tx = x0 + 16 * S + 18 + t * 44
            d.rectangle([tx - 2, y0 + 4, tx + 16 * sc + 2, y0 + 6 + 16 * sc], fill=(47, 46, 54))
            sm = icn.resize((16 * sc, 16 * sc), Image.NEAREST)
            im.paste(sm, (tx, y0 + 5), sm)
        d.text((x0 + 16 * S + 18, y0 + 44), NAMES[k], fill=(236, 232, 222), font=small)
        d.text((x0 + 16 * S + 18, y0 + 60), k, fill=(120, 117, 130), font=small)
    im.save(path)
    print(path, im.size)


def centered(rows, scale=2):
    """그린 그림(외곽선 포함)의 실제 범위를 찾아 16칸 × scale 캔버스 정중앙에 놓는다.
    scale 2면 반 칸까지 맞출 수 있어 좌우 · 위아래 여백이 정확히 같다 (칸 안에서 삐뚤어 보이지 않게)."""
    icn = render(rows)
    box = icn.getbbox()
    crop = icn.crop(box).resize(((box[2] - box[0]) * scale, (box[3] - box[1]) * scale), Image.NEAREST)
    n = 16 * scale
    out = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    out.paste(crop, ((n - crop.width) // 2, (n - crop.height) // 2), crop)
    return out


def export(out):
    """게임용: <키>.png 32×32 (한 칸 = 2px, 그림을 정중앙에) — 보통 public/ui/icons16.
    D-290: tools/pixel/icons32/<키>.png(받은 32도트 원본)가 있으면 손그림 대신 그것을 쓴다. 작은 칸용 <키>@16.png도 같이 쓴다."""
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from icon_sheet_import import small
    os.makedirs(out, exist_ok=True)
    m32 = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'icons32')
    for k, rows in ICONS.items():
        src = os.path.join(m32, f'{k}.png')
        if os.path.exists(src):
            big = Image.open(src).convert('RGBA')
            big.save(os.path.join(out, f'{k}.png'))
            small(big).save(os.path.join(out, f'{k}@16.png'))
            continue
        centered(rows).save(os.path.join(out, f'{k}.png'))
        centered(rows, 1).save(os.path.join(out, f'{k}@16.png'))
    print(out, len(ICONS))

if __name__ == '__main__':
    {'sheet': sheet, 'export': export}[sys.argv[1]](sys.argv[2])
