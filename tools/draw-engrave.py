"""
단추 음각 (D-292 4차, 사용자: 「버튼은 E 기준. 그림자를 넣을 거면 우리 체스말 정본을 확대해서 상반신만 실루엣처럼 음각 — 배경 우측에 칠한다는 느낌으로」).
기물 정본 도트(public/pieces/l-*0.png = tools/pixel/pieces64.txt를 maker가 찍은 72칸 그림)의 실루엣만 쓴다 — 새로 그리지 않는다.
음각: 빛이 왼위에서 오므로 파인 자리의 위 · 왼 벽은 그늘(1단), 아래 · 오른 턱은 빛(4단), 바닥은 판보다 한 단 어둡게(2단).
출력: build-res/ui-proposals4/eng-<색>-<기물>.png (72칸 폭, 상반신만 — 머리부터 실루엣 높이의 60%)
사용: python3 -I tools/draw-engrave.py
"""
import os

from PIL import Image

OUT = os.path.join('build-res', 'ui-proposals4')
R = {
    'iron': ['#14131a', '#1f1e27', '#2c2d38', '#41434f', '#5d606d', '#868a98', '#b9bdc8'],
    'brass': ['#2b1a06', '#5a3a0e', '#8a5a14', '#b98424', '#d9a838', '#f4d27a', '#fff1c0'],
    'crimson': ['#2a0608', '#5a0c12', '#9a141e', '#c81e28', '#e5262f', '#ff6b6b', '#ffc0c0'],
    'teal': ['#06222a', '#0e4650', '#1e6e78', '#2e969c', '#46c4c8', '#8ee8ea', '#d8fafa'],
}


def hx(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) + (255,)


def mask(t):
    """정본 그림 → 72칸 실루엣. 흑 기물 그림(l-*1)에서 흰 테(D-221, 흑백 공용 3칸)를 뺀 것 = 검은 외곽선까지의 모양.
    (깎아 내기로 벗기면 킹 십자 · 퀸 왕관 같은 가는 부분이 사라진다)"""
    im = Image.open(os.path.join('public', 'pieces', f'l-{t}1.png')).convert('RGBA')
    im = im.resize((72, 72), Image.NEAREST) if im.width != 72 else im
    def body(x, y):
        r, g, b, a = im.getpixel((x, y))
        return a > 0 and (r + g + b) / 3 < 170
    return [[body(x, y) for x in range(72)] for y in range(72)]


def engrave(t, tone, part=0.6):
    m = mask(t)
    ys = [y for y in range(72) if any(m[y])]
    y0, y1 = ys[0], ys[-1]
    h = int((y1 - y0 + 1) * part)
    r = R[tone]
    out = Image.new('RGBA', (72, h), (0, 0, 0, 0))
    on = lambda x, y: 0 <= x < 72 and 0 <= y < 72 and m[y][x]
    for yy in range(h):
        y = y0 + yy
        for x in range(72):
            if not on(x, y):
                continue
            if not on(x, y - 1) or not on(x - 1, y):
                c = r[1]          # 위 · 왼 벽 = 그늘
            elif not on(x, y + 1) or not on(x + 1, y):
                c = r[4]          # 아래 · 오른 턱 = 빛
            else:
                c = r[2]          # 바닥
            out.putpixel((x, yy), hx(c))
    return out


def main():
    os.makedirs(OUT, exist_ok=True)
    for tone in R:
        for t in 'PNBRQK':
            engrave(t, tone).save(os.path.join(OUT, f'eng-{tone}-{t}.png'))
    print(OUT)


if __name__ == '__main__':
    main()
