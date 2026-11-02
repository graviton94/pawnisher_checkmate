"""
16칸 도트 아이콘 (D-182): 부품 24 · 지도 노드 6.
그리는 법 — 14×14 안에 소문자 '재질'로 평평하게 칠하면, 스크립트가
  ① 왼위 가장자리는 밝게 · 오른아래 가장자리는 어둡게 (빛은 왼위에서)
  ② 둘레에 검정 외곽선 1칸
을 똑같이 입힌다. 대문자는 고정색(눈 · 못 · 선 같은 세부). 나사 · 태엽 시안과 같은 규칙.
사용: python3 -I tools/pixel/icons16.py sheet <out.png>   |   export <dir> (16px · 32px · 48px PNG)
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
}
FIX = {'K': '#0b0b0e', 'S': '#bfb9ad', 'X': '#ffffff', 'E': '#3b2412', 'D': '#2a2830', 'M': '#7a1218', 'R': '#e5262f', 'T': '#fff3b0', 'A': '#8a6416', 'N': '#1f8a7a', 'O': '#f59e0b', 'G': '#56545e', 'Y': '#facc15', 'L': '#a8a4b2', 'W': '#f1ede4', 'C': '#5eead4'}


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
                if not same(x, y - 1) or not same(x - 1, y):
                    c = hi
                elif not same(x, y + 1) or not same(x + 1, y):
                    c = sh
                else:
                    c = base
                px[x, y] = hexc(c)
            else:
                px[x, y] = hexc(FIX[ch])
    return out


def sheet(path):
    keys = [k for k in ICONS if k.startswith('n.')] + [k for k in ICONS if not k.startswith('n.')]
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


def export(out):
    os.makedirs(out, exist_ok=True)
    for k, rows in ICONS.items():
        icn = render(rows)
        for sc in (1, 2, 3):
            icn.resize((16 * sc, 16 * sc), Image.NEAREST).save(os.path.join(out, f'{k}@{sc}x.png'))
    print(out, len(ICONS))


if __name__ == '__main__':
    {'sheet': sheet, 'export': export}[sys.argv[1]](sys.argv[2])
