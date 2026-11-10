"""
판 위 기물 딱지 (2026-11-05, 사용자: "킹이나 폰 우상단에 있는 칩(불꽃 모양 등)도 개선해야 하지 않나?").
예전: 코드로 그린 네모 + 색만 입힌 공개 픽토그램을 비정수로 줄여 얹음 → 16칸 아이콘과 같은 그리개(tools/pixel/icons16.py render)로
도트 명패를 새로 찍는다: 둥근 모서리 명패(재질 명암 · 검정 바깥선) + 고정색 무늬.
  chip-flame : 자폭 폰 (불꽃) — 검붉은 명패 · 주황 불꽃 · 노란 속불
  chip-claw  : 되받아치는 반장 킹 (발톱 자국 셋) — 검붉은 명패 · 흰 자국
  chip-crown : 정예 (왕관) — 검붉은 명패 · 금관
  chip-skull : 원수 (해골) — 진홍 명패 · 미색 해골 · 검은 눈
  chip-stun  : 경직 (헛방, D-229) — 검은 쇠 명패 · 노란 별 셋
  chip-shock : 기어 쇼크 (D-229) — 내 기물, 검은 쇠 명패 · 주황 번개
  chip-stamp : 불량 도장 (검수 반장, D-274) — 내 기물, 미색 종이 명패 대신 쇠 명패 · 붉은 X 도장
  chip-magnet: 자석이 끌어당길 기물 (자석 반장, D-274) — 내 기물, 쇠 명패 · 붉은/회색 말굽 자석
출력: public/ui/board/chip-*.png (16×16, 화면에서 정수배는 판 크기에 따라 다르므로 렌더러가 칸의 36%로)
사용: python3 -I tools/pixel/board_chips.py
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import icons16  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(HERE))

PLATE = [
    '..pppppppppp..',
    '.pppppppppppp.',
    'pppppppppppppp',
    'pppppppppppppp',
    'pppppppppppppp',
    'pppppppppppppp',
    'pppppppppppppp',
    'pppppppppppppp',
    'pppppppppppppp',
    'pppppppppppppp',
    'pppppppppppppp',
    'pppppppppppppp',
    '.pppppppppppp.',
    '..pppppppppp..',
]

# 무늬 10×10 (명패 가운데 2~11칸에 얹는다, '.'은 명패 그대로)
GLYPH = {
    'flame': [
        '....O.....',
        '....OO....',
        '...OOO..O.',
        '...OYOO.O.',
        '..OOYYOOO.',
        '..OYYTYOO.',
        '.OOYTTTYO.',
        '.OYTTXTYO.',
        '.OOYTTYOO.',
        '..OOOOOO..',
    ],
    'claw': [
        '.....X..X.',
        '....X..X..',
        '..X.X.X...',
        '..XX.XX...',
        '.XX.XX..X.',
        '.X..X..X..',
        'X..X..XX..',
        '..X..XX...',
        '.X..XX....',
        '....X.....',
    ],
    'crown': [
        '..........',
        'T...T....T',
        'YY.YYY..YY',
        'YYYYYYYYYY',
        'YYYTYYTYYY',
        'YYRYYYYRYY',
        'YYYYYYYYYY',
        'AAAAAAAAAA',
        '..........',
        '..........',
    ],
    'stun': [
        '..........',
        '.T.....Y..',
        'TYT...YTY.',
        '.T.....Y..',
        '....Y.....',
        '...YTY....',
        '..YTTTY...',
        '...YTY....',
        '....Y.....',
        '..........',
    ],
    'shock': [
        '.....OO...',
        '....OO....',
        '...OO.....',
        '..OOOOOO..',
        '.....OO...',
        '....OO....',
        '...OO.....',
        '..OO......',
        '..O.......',
        '..........',
    ],
    'skull': [
        '..WWWWWW..',
        '.WWWWWWWW.',
        'WWWWWWWWWW',
        'WKKWWWKKWW',
        'WKKWWWKKWW',
        'WWWWKWWWWW',
        '.WWWWWWWW.',
        '..WKWKWW..',
        '..WWWWWW..',
        '..........',
    ],
    'stamp': [
        '.RRRRRRRR.',
        'R........R',
        'R.RR..RR.R',
        'R..RRRR..R',
        'R...RR...R',
        'R..RRRR..R',
        'R.RR..RR.R',
        'R........R',
        '.RRRRRRRR.',
        '..........',
    ],
    'magnet': [
        '..........',
        '.RRR..WWW.',
        '.RRR..WWW.',
        '.RR....WW.',
        '.RR....WW.',
        '.RRR..WWW.',
        '..RRRWWW..',
        '...RRWW...',
        '..........',
        '..........',
    ],
}
GLYPH['claw'] = [r.replace('X', 'W') for r in GLYPH['claw']]
MAT = {'flame': 'd', 'claw': 'd', 'crown': 'd', 'skull': 'r', 'stun': 'g', 'shock': 'g', 'stamp': 'g', 'magnet': 'g'}


def chip(name):
    rows = [list(r.replace('p', MAT[name])) for r in PLATE]
    for y, r in enumerate(GLYPH[name]):
        for x, c in enumerate(r):
            if c != '.':
                rows[y + 2][x + 2] = c
    return icons16.render([''.join(r) for r in rows])


def main():
    out = os.path.join(ROOT, 'public', 'ui', 'board')
    for n in GLYPH:
        chip(n).save(os.path.join(out, f'chip-{n}.png'))
    print('public/ui/board/chip-*.png', list(GLYPH))


if __name__ == '__main__':
    main()
