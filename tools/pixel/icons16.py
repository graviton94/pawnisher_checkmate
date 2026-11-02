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
}
FIX = {'K': '#0b0b0e', 'X': '#ffffff', 'E': '#3b2412', 'D': '#2a2830', 'M': '#7a1218', 'R': '#e5262f', 'T': '#fff3b0', 'A': '#8a6416', 'N': '#1f8a7a', 'O': '#f59e0b', 'G': '#56545e', 'Y': '#facc15', 'L': '#a8a4b2', 'W': '#f1ede4', 'C': '#5eead4'}


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
icon('n.event', '사건', [
    '..wwwwwwwwww..',
    '.wwwwwwwwwwww.',
    'wwwwwKKKKwwww.',
    'wwwwKKwwKKwww.',
    'wwwwwwwwKKwww.',
    'wwwwwwwKKwwww.',
    'wwwwwwKKwwwww.',
    'wwwwwwKKwwwww.',
    'wwwwwwwwwwwww.',
    'wwwwwwKKwwwww.',
    'wwwwwwKKwwwww.',
    '.wwwwwwwwwww..',
    '..uuuuuuuuuu..',
    '..uuuuuuuuuu..',
])
icon('n.check', '검문', [
    'rr............',
    'rrrr..........',
    'rrwwrr........',
    '.rrwwwrr......',
    '...rrwwwrr....',
    '.l...rrwwwrr..',
    'lll....rrwwwrr',
    'lll......rrwwr',
    '.l.........rr.',
    '.l............',
    '.l............',
    '.l............',
    'ggg...........',
    'ggggg.........',
])
icon('n.boss', '반장', mir([
    'y..y..y',
    'yy.yy.y',
    'yyyyyyy',
    'yRyyyyy',
    'yyyyyyy',
    '.wwwwww',
    'wwwwwww',
    'wKKwwww',
    'wKKKwww',
    'wwwwwwK',
    '.wwwwww',
    '..wKwKw',
    '..wwwww',
    '.......',
]))

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
icon('assembly', '끝없는 생산선', [
    '.....ww.......',
    '....wwww......',
    '.....ww.......',
    '....wwww......',
    '...wwwwww.....',
    '...wwwwww.....',
    'gggggggggggggg',
    'gKgKgKgKgKgKgg',
    'gggggggggggggg',
    '.l...l...l..l.',
    'lll.lll.lll.l.',
    '.l...l...l..l.',
    '..............',
    '..............',
])
icon('drum', '진군의 북', [
    'b..........b..',
    '.b........b...',
    '..b......b....',
    '...b....b.....',
    '.wwwwwwwwwww..',
    'wwwwwwwwwwwww.',
    'rrrrrrrrrrrrr.',
    'rYrrrYrrrYrrr.',
    'rrYrYrrrYrYrr.',
    'rrrYrrrrrYrrr.',
    'rrrrrrrrrrrrr.',
    'uuuuuuuuuuuuu.',
    '.rrrrrrrrrrr..',
    '..............',
])
icon('crown', '짓누르는 왕관', mir([
    '.......',
    'y..y..y',
    'yy.yy.y',
    'yyyyyyy',
    'yyyyyyy',
    'yyyyyyy',
    'uuuuuuu',
    'uRuuuuC',
    'uuuuuuu',
    'uuuuuuu',
    '.......',
    'g.g..g.',
    'gggggg.',
    'ggggggg',
]))
icon('throne', '걷는 옥좌', [
    '...rrrrrr.....',
    '..rrrrrrrr....',
    '..rryyyyrr....',
    '..rrrrrrrr....',
    '..rrrrrrrr....',
    '..rrrrrrrr....',
    '.yyyyyyyyyy...',
    '.yrrrrrrrry...',
    '.yyyyyyyyyy...',
    '..g......g....',
    '..gg....gg....',
    '.g.g...g.g....',
    'g...g.g...g...',
    'K...K.K...K...',
])
icon('coil', '폭주 코일', [
    '...X.....X....',
    '..XcX...XcX...',
    '...X.uu..X....',
    '....uuuu......',
    '...u....u.....',
    '...uuuuuu.....',
    '...u....u.....',
    '...uuuuuu.....',
    '...u....u.....',
    '...uuuuuu.....',
    '...u....u.....',
    '...uuuuuu.....',
    '..gggggggg....',
    '..gggggggg....',
])
icon('echo', '메아리 톱니', [
    '..u.u.........',
    '.uuuuu........',
    'uuuKuuu.......',
    '.uKKKu..l.l...',
    'uuuKuuu.lllll.',
    '.uuuuu.lllKlll',
    '..u.u...lKKKl.',
    '.......lllKlll',
    '........lllll.',
    '........l.l...',
    '..............',
    '..............',
    '..............',
    '..............',
])
icon('hammer', '공성 망치', [
    '..............',
    '..............',
    'llll..........',
    'lllll.........',
    'lllllbbbbbbbbb',
    'lllllbbbbbbbbb',
    'lllll.........',
    'llll..........',
    '......g...g...',
    '.....g...g....',
    '....g...g.....',
    '..............',
    '..............',
    '..............',
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
icon('spurs', '녹슨 박차', [
    '..........u...',
    '.........uuu..',
    '........uuKuu.',
    '.........uuu..',
    '..........u...',
    '.....bbbbbu...',
    '...bbb...bb...',
    '..bb......b...',
    '.bb.......b...',
    '.b.......bb...',
    '.bb.....bb....',
    '..bbbbbbb.....',
    '..............',
    '..............',
])
icon('barracks', '막사의 종', mir([
    '......b',
    '.....uu',
    '....uuu',
    '...uuuu',
    '...uuuu',
    '...uuuu',
    '..uuuuu',
    '..uuuuu',
    '..uuuuu',
    '.uuuuuu',
    'uuuuuuu',
    'uuuuuuu',
    '......g',
    '.....gg',
]))
icon('banner', '찢긴 군기', [
    'u.............',
    'bbrrrrrrrrr...',
    'b.rrrrrrrrrr..',
    'b.rrYrrrrrrr..',
    'b.rYYYrrrrr...',
    'b.rrYrrrrrr...',
    'b.rrrrrrrrrr..',
    'b.rrrr.rrrrr..',
    'b.rrr...rrr...',
    'b.rr.....r....',
    'b.r...........',
    'b.............',
    'b.............',
    'bb............',
])
icon('scepter', '녹슨 홀', [
    '...........yy.',
    '..........yRRy',
    '..........yRRy',
    '.........y.yy.',
    '........yy....',
    '.......yy.....',
    '......uu......',
    '.....uu.......',
    '....uu........',
    '...uu.........',
    '..uu..........',
    '.uu...........',
    'yy............',
    'y.............',
])
icon('gilded', '도금 갑주', mir([
    '.yy....',
    'yyyy..y',
    'yyyyyyy',
    'yyyyyyy',
    'yyyyyyA',
    '.yyyyyA',
    '.yyyyyy',
    '.yyyyyA',
    '.yyyyyA',
    '..yyyyy',
    '..yyyyA',
    '...yyyy',
    '....yyy',
    '......y',
]))
icon('fuse', '도화선', [
    '..........X...',
    '.........XOX..',
    '..........X...',
    '.........b....',
    '........b.....',
    '.......b......',
    '.....ggg......',
    '...gggggggg...',
    '..gggggggggg..',
    '.gggggggggggg.',
    '.gggggggggggg.',
    '.gggggggggggg.',
    '..gggggggggg..',
    '...gggggggg...',
])
icon('conductor', '전도 코일', [
    '.....oooo.....',
    '....o....o....',
    '.....oooo.....',
    '....o....o....',
    '.....oooo.....',
    '....o....o....',
    '.....oooo.....',
    '....o....o....',
    '.....oooo.....',
    '.....g..g.....',
    '..XcX.gg.XcX..',
    '.Xc...gg...cX.',
    '..X..gggg..X..',
    '....gggggg....',
])
icon('anvilPlate', '모루 장갑', [
    '..............',
    'llllllllllll..',
    '.llllllllllllll',
    '..llllllllllll.',
    '....llllllll...',
    '.....llllll...',
    '.....llllll...',
    '....llllllll...',
    '...gggggggggg..',
    '..gggggggggggg.',
    '..............',
    '..............',
    '..............',
    '..............',
])
icon('chainShot', '연쇄 사슬', [
    'llll..........',
    'l..l..........',
    'l..llll.......',
    'llll..l.......',
    '...l..llll....',
    '...llll..l....',
    '......l..llll.',
    '......llll..l.',
    '.........l..l.',
    '.........llll.',
    '..............',
    '..............',
    '..............',
    '..............',
])
icon('bloodPact', '피의 계약', [
    '.wwwwwwwwww...',
    'wwwwwwwwwwww..',
    '.wKKKKKKKw.w..',
    '.wwwwwwwww....',
    '.wKKKKKKww....',
    '.wwwwwwwww....',
    '.wKKKKwwww....',
    '.wwwwwwwrr....',
    '.wwwwwwrrrr...',
    '.wwwwwwrrrr...',
    '.wwwwwwwrr....',
    'wwwwwwwwww.w..',
    '.wwwwwwwwwww..',
    '..............',
])
icon('brittle', '깨지는 유리 심장', mir([
    '.......',
    '.ccc...',
    'ccccc.c',
    'cXcccc.',
    'cXcccc.',
    'ccccccK',
    'cccccK.',
    '.ccccK.',
    '..cccK.',
    '...ccKc',
    '....ccK',
    '.....cK',
    '......c',
    '.......',
]))
icon('greed', '탐욕의 저울', mir([
    '......u',
    '.....uu',
    'uuuuuuu',
    '.u....u',
    '.u....u',
    'u.u...u',
    'u.u...u',
    'yyyy..u',
    '.yy...u',
    '......u',
    '......u',
    '....uuu',
    '...uuuu',
    '.......',
]))
icon('spare', '과부하 태엽', [
    '.uuu....uuu..X',
    'uuuuu..uuuuuXO',
    'uuKuu..uuKuu.X',
    'uuuuuuuuuuuu..',
    '.uuuuuuuuuu...',
    '.....uu.......',
    '.....uu.......',
    '.....uu.......',
    '....uuuu......',
    '.....uu.......',
    '....uuuu......',
    '.....uu.......',
    '.....uu.......',
    '......X.......',
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
                same = lambda xx, yy: 0 <= xx < n and 0 <= yy < n and grid[yy][xx] == ch
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
    keys = list(ICONS)
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
