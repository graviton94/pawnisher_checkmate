"""
HUD 아이콘 리뉴얼 (2026-11-05, 사용자: "아이콘 전반 리뉴얼 — 16칸 아이콘 전체 + 태엽 + 차례 표시 + ? 태엽").
16칸 아이콘과 같은 그리개(tools/pixel/icons16.py의 render — 재질 소문자 → 왼쪽 위 빛 4단계 · 검정 바깥선 · 안쪽 선은 재질 그늘색)로
태엽 열쇠 · 도움말 톱니를 다시 그린다. 모든 아이콘이 한 가지 빛 규칙을 쓴다.
  key_full()  : 태엽 열쇠 — 나비 모양 손잡이(구멍 둘) · 가운데 청록 보석 · 굵은 축 · T자 끝
  key_spent() : 쓴 열쇠 — 같은 모양, 검은 쇠
  key_bonus() : 보너스 열쇠 — 같은 모양, 금
  cog_help()  : 도움말 — 황동 톱니(이 여덟) 속 검은 창에 흰 ?
사용: python3 -I tools/pixel/hud_icons.py  → public/ui/hud/key-*.png (draw-hud.py가 회전 띠로 묶는다) · 시안 그림
"""
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import icons16  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(HERE))

# 14×14 재질 그림 (u 황동 · y 금 · g 검은 쇠 · c 청록 · K 안쪽 선 → 재질 그늘색)
KEY = [
    '..uuu....uuu..',
    '.uuuuu..uuuuu.',
    'uuuKKuuuuKKuuu',
    'uuuKKuuuuKKuuu',
    '.uuuuuccuuuuu.',
    '..uuuuccuuuu..',
    '.....uuuu.....',
    '......uu......',
    '......uu......',
    '......uu......',
    '....uuuuuu....',
    '....uKuuKu....',
    '....uuuuuu....',
    '..............',
]


def recolor(rows, m):
    return [''.join(m.get(c, c) for c in r) for r in rows]


def key_full():
    return icons16.render(KEY)


def key_spent():
    return icons16.render(recolor(KEY, {'u': 'g', 'c': 'g'}))


def key_bonus():
    return icons16.render(recolor(KEY, {'u': 'y'}))


# 도움말 톱니: 예전 손그림 톱니(draw-hud.py COG, 이 여덟 · 좌우 대칭) 모양을 재질 그림으로 옮긴다
COG = [
    '..kk.kYYk.kk..',
    '.kYYkkYYkkYYk.',
    '.kYYYYYYYYYYk.',
    '..kYYyyyyYYk..',
    'kkYYykkkkyYYkk',
    'YYYykkwwkkyYYY',
    'YYYykkkwkkyYYY',
    'YYYykkwwkkyYYY',
    'YYYykkwkkkyYYY',
    'kkYYykkkkyYYkk',
    '..kYYywkyYYk..',
    '.kYYYyyyyYYYk.',
    '.kYYkkYYkkYYk.',
    '..kk.kYYk.kk..',
]


def cog_help():
    """톱니 몸 = 황동(u, 빛 4단계는 그리개가), 가운데 창 = 짙은 회흑(D), ? = 흰색(X). 이 사이 검은 칸은 바깥(외곽선은 그리개가)"""
    rows = [list(r) for r in COG]
    h, w = len(rows), len(rows[0])
    outside = set()
    stack = [(x, y) for y in range(h) for x in range(w) if (x in (0, w - 1) or y in (0, h - 1)) and rows[y][x] in '.k']
    while stack:
        x, y = stack.pop()
        if (x, y) in outside or not (0 <= x < w and 0 <= y < h) or rows[y][x] not in '.k':
            continue
        outside.add((x, y))
        stack += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
    out = []
    for y in range(h):
        r = ''
        for x in range(w):
            c = rows[y][x]
            r += '.' if (x, y) in outside else {'Y': 'u', 'y': 'u', 'w': 'X', 'k': 'D'}.get(c, c)
        out.append(r)
    return icons16.render(out)


def main():
    out = os.path.join(ROOT, 'public', 'ui', 'hud')
    key_full().save(os.path.join(out, 'key-full.png'))
    key_spent().save(os.path.join(out, 'key-spent.png'))
    key_bonus().save(os.path.join(out, 'key-bonus.png'))
    print('public/ui/hud/key-full · key-spent · key-bonus.png (16×16)')


if __name__ == '__main__':
    main()
