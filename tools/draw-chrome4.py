"""
버튼 · 판 3차 = E2 (D-292 3차, 사용자: 「E가 가장 마음에 든다 — 조금만 더 우리 세계관(스팀펑크 체스 공장)에 어울리게」).
E(쇠틀 + 끼운 판 + 화살 끝 + 경고 줄무늬)에 공장 · 체스를 더한다:
  · 쇠틀 위 띠 = 흑백 체스판 무늬 (컨베이어 · 출하 판)
  · 모서리 = 십자 나사 머리
  · 큰 단추 왼쪽 = 판에 찍힌 폰 각인 (출하 도장)
  · 화살 끝 = 증기 빼는 구멍 두 줄
  · 누르면 화살 끝 구멍에서 도트 증기 3장(steps)
  · 램프 = 황동 테 계기 램프
  · 판(창) = 쇠 함 + 체스판 띠 + 십자 나사 · 걸린 제목판
출력: build-res/ui-proposals3/*.png  ·  사용: python3 -I tools/draw-chrome4.py
"""
import os
import runpy

C3 = runpy.run_path(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'draw-chrome3.py'))
R, INK, Pix = C3['R'], C3['INK'], C3['Pix']
OUT = os.path.join('build-res', 'ui-proposals3')


def bands(px, x0, y0, x1, y1, r):
    """판 명암 — 단 두께를 도트 수로 고정 (9-slice 가운데 칸에 늘 같은 단이 오게): 반짝 1 · 밝음 2 · 바탕 · 그늘 2"""
    for y in range(y0, y1 + 1):
        d0, d1 = y - y0, y1 - y
        c = r[5] if d0 == 0 else r[4] if d0 <= 2 else r[2] if d1 <= 1 else r[3]
        px.r(x0, y, x1, y, c)
    px.r(x0 + 2, y0 + 1, x0 + 4, y0 + 1, r[6])   # 왼위 광택 (모서리 칸 안)


def screw(px, x, y, fr):
    """십자 나사 머리 3×3"""
    px.r(x, y, x + 2, y + 2, fr[5]); px.p(x + 2, y + 2, fr[2]); px.p(x + 1, y, fr[2]); px.p(x, y + 1, fr[2]); px.p(x + 1, y + 1, fr[1]); px.p(x + 2, y + 1, fr[2]); px.p(x + 1, y + 2, fr[2])


def checker(px, x0, y0, x1, y1):
    """흑백 체스판 띠 (2×2 칸, 주기 4)"""
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            px.p(x, y, R['paper'][5] if ((x // 2) + (y // 2)) % 2 == 0 else R['iron'][1])


# 26×30, slice 13 9 13 9 — 가운데 칸 8×4: 체스판 띠(2칸 높이) 주기 4 · 판 바탕 한 단
def frame(t, down=False, hazard=False):
    r, fr = R[t], R['iron']
    W, H = 26, 30
    px = Pix(W, H)
    o = 2 if down else 0
    th = 1 if down else 3
    bot = H - 2 - (0 if not down else 0)
    px.r(0, o, W - 1, bot, INK)
    px.r(1, 1 + o, W - 2, bot - 1, fr[3])
    px.r(1, 1 + o, W - 2, 1 + o, fr[5]); px.r(1, 1 + o, 1, bot - 1, fr[4]); px.r(W - 2, 2 + o, W - 2, bot - 1, fr[2])
    checker(px, 5, 2 + o, W - 6, 5 + o)
    px.r(5, 6 + o, W - 6, 6 + o, fr[2])
    for x, y in ((1, 1 + o), (W - 4, 1 + o)):
        screw(px, x, y, fr)
    # 끼운 판
    pt, pb = 8 + o, bot - 3 - th
    px.r(3, pt - 1, W - 4, pb + 1, INK)
    bands(px, 4, pt, W - 5, pb, r)
    px.r(4, pt, 4, pb - 2, r[5]); px.r(W - 5, pt + 1, W - 5, pb, r[2])
    # 아래 틀 · 두께
    px.r(1, pb + 2, W - 2, pb + 2, fr[3])
    px.r(1, pb + 3, W - 2, bot - 1, fr[1])
    for x, y in ((1, pb + 2 - 3 + 1), (W - 4, pb + 2 - 3 + 1)):
        pass
    if hazard:
        for x in range(2, W - 2):
            for y in range(pb + 3, bot):
                px.p(x, y, R['hazard'][4] if ((x + y) // 2) % 2 == 0 else INK)
    return px.im


def tip(t, down=False):
    """화살 끝 15×32 (큰 단추 64px = 2배) — 증기 구멍 두 줄"""
    r, fr = R[t], R['iron']
    W, H = 15, 32
    px = Pix(W, H)
    o = 2 if down else 0
    top, bot = o, H - 2
    mid = (top + bot) // 2
    for y in range(top, bot + 1):
        reach = W - 1 - abs(y - mid)
        if reach > 0:
            px.r(0, y, reach, y, INK)
    for y in range(top + 1, bot):
        reach = W - 2 - abs(y - mid)
        if reach > 0:
            px.r(0, y, reach - 1, y, fr[3])
            px.p(reach - 1, y, fr[5] if y < mid else fr[1])
    for y in range(top + 8, bot - 6):
        reach = W - 6 - abs(y - mid)
        if reach > 0:
            d0, d1 = y - (top + 8), (bot - 7) - y
            c = r[5] if d0 == 0 else r[4] if d0 <= 2 else r[2] if d1 <= 1 else r[3]
            px.r(0, y, reach - 1, y, c)
    # 증기 구멍 (틀 위, 화살 빗변 쪽)
    for k in range(2):
        px.p(5 + k * 2, mid - 6 + k, INK); px.p(5 + k * 2, mid + 6 - k, INK)
    return px.im


def stamp():
    """폰 각인 10×14 — 판에 눌러 찍은 자국 (속 = 판 그늘, 위왼 테두리 = 그늘, 아래오른 = 빛)"""
    b = R['brass']
    rows = [
        '...xxxx...',
        '..xxxxxx..',
        '..xxxxxx..',
        '...xxxx...',
        '..xxxxxx..',
        '...xxxx...',
        '...xxxx...',
        '..xxxxxx..',
        '..xxxxxx..',
        '.xxxxxxxx.',
        'xxxxxxxxxx',
        'xxxxxxxxxx',
        '..........',
        '..........',
    ]
    px = Pix(10, 14)
    on = lambda x, y: 0 <= y < 14 and 0 <= x < 10 and rows[y][x] == 'x'
    for y in range(14):
        for x in range(10):
            if on(x, y):
                px.p(x, y, b[2] if (on(x - 1, y) and on(x, y - 1)) else b[1])
            elif on(x - 1, y) or on(x, y - 1) or on(x - 1, y - 1):
                px.p(x, y, b[5])
    return px.im


def lamp_bezel(on=True):
    """황동 테 계기 램프 10×10"""
    b = R['brass']
    g = R['teal'] if on else R['iron']
    px = Pix(10, 10)
    px.r(2, 0, 7, 9, INK); px.r(0, 2, 9, 7, INK); px.r(1, 1, 8, 8, INK)
    px.r(2, 1, 7, 8, b[4]); px.r(1, 2, 8, 7, b[4]); px.p(2, 1, b[6]); px.r(8, 3, 8, 7, b[2]); px.r(3, 8, 7, 8, b[2])
    px.r(3, 3, 6, 6, g[3]); px.r(3, 3, 5, 4, g[5] if on else g[2]); px.p(3, 3, g[6] if on else g[4]); px.r(6, 5, 6, 6, g[2])
    return px.im


def puff():
    """누를 때 화살 끝에서 뿜는 증기 3장 (가로 띠 36×12, 한 장 12×12)"""
    p = R['paper']
    px = Pix(36, 12)
    frames = [
        [(3, 7, 2)],
        [(3, 6, 3), (8, 4, 2)],
        [(2, 5, 3), (7, 3, 3), (9, 8, 2)],
    ]
    for f, blobs in enumerate(frames):
        for cx, cy, rad in blobs:
            for y in range(cy - rad, cy + rad + 1):
                for x in range(cx - rad, cx + rad + 1):
                    if (x - cx) ** 2 + (y - cy) ** 2 <= rad * rad + 1:
                        px.p(f * 12 + x, y, p[6] if (x < cx and y < cy) else p[4] if f < 2 else p[3])
    return px.im


def panel():
    """창 32×32, slice 12 — 쇠 함 + 위 체스판 띠 + 네 귀퉁이 십자 나사"""
    fr = R['iron']
    W = 32
    px = Pix(W, W)
    px.r(0, 0, W - 1, W - 1, INK)
    px.r(1, 1, W - 2, W - 2, fr[1])
    px.r(1, 1, W - 2, 4, fr[3]); px.r(1, 1, W - 2, 1, fr[5]); px.r(1, 1, 4, W - 2, fr[3]); px.r(1, 1, 1, W - 2, fr[4])
    px.r(1, W - 5, W - 2, W - 2, fr[2]); px.r(W - 5, 1, W - 2, W - 2, fr[2])
    checker(px, 6, 1, W - 7, 4)
    px.r(5, 5, W - 6, 5, INK); px.r(5, 5, 5, W - 6, INK); px.r(5, W - 6, W - 6, W - 6, fr[3]); px.r(W - 6, 5, W - 6, W - 6, fr[3])
    px.r(6, 6, W - 7, 6, fr[0]); px.r(6, 6, 6, W - 7, fr[0])
    for x, y in ((1, 1), (W - 4, 1), (1, W - 4), (W - 4, W - 4)):
        screw(px, x, y, fr)
    return px.im


def main():
    os.makedirs(OUT, exist_ok=True)
    for t in ('iron', 'brass', 'crimson', 'teal'):
        hz = t == 'crimson'
        frame(t, False, hz).save(f'{OUT}/E2-{t}.png'); frame(t, True, hz).save(f'{OUT}/E2-{t}-down.png')
        tip(t).save(f'{OUT}/E2-tip-{t}.png'); tip(t, True).save(f'{OUT}/E2-tip-{t}-down.png')
    stamp().save(f'{OUT}/stamp.png')
    lamp_bezel().save(f'{OUT}/lamp-on.png'); lamp_bezel(False).save(f'{OUT}/lamp-off.png')
    puff().save(f'{OUT}/puff.png')
    panel().save(f'{OUT}/panel.png')
    C3['hang_plate']().save(f'{OUT}/hang.png')
    print(OUT)


if __name__ == '__main__':
    main()
