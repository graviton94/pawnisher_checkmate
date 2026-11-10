"""
받은 21위 부품(UI-21 ~ UI-25, D-398 발주 → D-400 받음) 다듬기 — ui_kit_import.py 다음에 한 번.
  python3 -I tools/pixel/ui_kit_import.py build-res/order/UI-21-received.png UI-21 160   (22 = 80 · 23 = 56 · 24 = 96 · 25 = 48)
  python3 -I tools/pixel/ui_kit_refine21.py      # 몇 번 돌려도 같은 결과

그림을 새로 그리지 않는다 — 받은 도트를 옮기기 · 지우기 · 같은 줄로 채우기 · 떼어 내기만 (D-386 「발주하고 다듬기만」):
① boss-stat(수치 칸): 왼쪽 먹 아이콘 칸 바닥이 아래 테 빛 줄(#8E877A)까지 먹어 들어가 테가 끊겼다(사용자 지적)
   → 아래 안쪽 빛 줄을 오른쪽 빛 줄처럼 끝까지 잇는다(먹 칸은 테 안에서 멈춘다).
   아이콘 칸 6 → 10도트: 발주 「8도트 아이콘 자리」보다 좁게 와서 16칸 아이콘(아이콘 층 --px1)이 DPR 2.625에서
   넘친다 → 아이콘 칸 가운데 열을 그대로 4열 되풀이(9-slice가 하는 일과 같은 늘이기).
② boss-plate · boss-plate-2(수배판): 위 테 가운데 머리 띠(먹)와 2단계 경고등을 boss-head(-2).png로 떼고, 그 자리 · 변 가운데
   칠 벗겨진 자국은 바로 옆 민 테 열/줄로 채운다 → 9-slice 변이 늘어나도 무늬가 깨지지 않는다. 모서리 안 자국은 둔다.
   머리 띠는 게임이 위 테 가운데에 정수배 그대로 얹는다.
③ badge-num-brass: 아래 그늘 두 줄이 진홍 #7A1218로 맞춰졌다(받은 갈색이 팔레트 밖) → 황동 그늘 #8A6416.
④ slip-paper(결과 쪽지): 위 가운데 황동 클립을 slip-clip.png로 떼고, 그 자리 종이 윗변은 옆 열로 채운다.
확인용: build-res/order/UI-21-25-refine-check.png (×6)
"""
import os

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
V2 = os.path.join(ROOT, 'src', 'assets', 'ui', 'chrome', 'v2')

INK = (11, 11, 14, 255)


def load(n):
    return Image.open(os.path.join(V2, f'{n}.png')).convert('RGBA')


def save(n, im):
    im.save(os.path.join(V2, f'{n}.png'))


def copy_col(im, src_x, dst_x, y0=0, y1=None):
    for y in range(y0, im.height if y1 is None else y1):
        im.putpixel((dst_x, y), im.getpixel((src_x, y)))


def copy_row(im, src_y, dst_y, x0, x1):
    for x in range(x0, x1):
        im.putpixel((x, dst_y), im.getpixel((x, src_y)))


def boss_stat():
    im = load('boss-stat')
    if im.width == 26:
        # 아래 안쪽 빛 줄(13줄)을 왼쪽 먹 칸 밑까지 잇는다 — 오른쪽 빛 줄(22열)과 같은 색
        lit = im.getpixel((22, 8))
        for x in range(3, 23):
            im.putpixel((x, 13), lit)
        # 아이콘 칸(3 ~ 8열)을 10열로: 가운데 열(5)을 4번 더 끼운다
        out = Image.new('RGBA', (30, im.height))
        out.paste(im.crop((0, 0, 6, im.height)), (0, 0))
        for k in range(4):
            out.paste(im.crop((5, 0, 6, im.height)), (6 + k, 0))
        out.paste(im.crop((6, 0, 26, im.height)), (10, 0))
        im = out
    save('boss-stat', im)


def boss_plate(n, head):
    im = load(n)
    W = im.width
    if im.getpixel((20, 4)) == INK:  # 아직 머리 띠가 붙어 있다
        # 머리 띠(먹 덩어리) + 경고등을 떼어 낸다: 3 ~ 7줄, 띠 양옆 경고등까지
        xs = [x for x in range(W) if im.getpixel((x, 4)) == INK and 8 <= x <= W - 9]
        x0, x1 = min(xs), max(xs) + 1
        lights = [x for x in range(8, W - 8) for y in (5, 6) if im.getpixel((x, y))[:3] == (255, 123, 123)]
        hx0, hx1 = (min(lights + [x0]), max(lights + [x1 - 1]) + 1)
        im.crop((hx0, 3, hx1, 8)).save(os.path.join(V2, f'{head}.png'))
        # 위 테 가운데(8 ~ W-11열, 2 ~ 9줄)를 민 테 열(7열)로 채운다 — 머리 띠 · 경고등 · 벗겨진 자국이 사라진다
        for x in range(8, W - 10):
            copy_col(im, 7, x, 2, 10)
        # 아래 테 가운데 자국: 민 테 열(7열)로
        for x in range(8, W - 8):
            copy_col(im, 7, x, 37, im.height - 1)
        # 왼쪽 변 가운데 자국(12 ~ 35줄): 민 테 줄(13줄)로
        for y in range(12, 36):
            copy_row(im, 13, y, 0, 5)
    save(n, im)


def badge():
    im = load('badge-num-brass')
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            if px[x, y][:3] in ((122, 18, 24), (51, 49, 59)) and y >= 9:
                px[x, y] = (138, 100, 22, 255)
    save('badge-num-brass', im)


def slip():
    im = load('slip-paper')
    if im.height == 34:
        # 클립 = 11 ~ 25열 · 0 ~ 8줄 (먹 테 안, 맨 아래 줄은 12 ~ 24열 — 양 끝은 종이)
        clip = Image.new('RGBA', (15, 9))
        for y in range(9):
            for x in range(1 if y == 8 else 0, 14 if y == 8 else 15):
                c = im.getpixel((11 + x, y))
                if c[3]:
                    clip.putpixel((x, y), c)
        save('slip-clip', clip)
        # 종이 몸 = 4줄부터. 클립 자리 윗변은 옆 민 열(30열)로 채운다
        for x in range(11, 26):
            copy_col(im, 30, x, 4, 9)
        im = im.crop((0, 4, im.width, im.height))
    save('slip-paper', im)


def check():
    names = ['boss-plate', 'boss-plate-2', 'boss-head', 'boss-head-2', 'boss-stat', 'stat-plate', 'stat-sep',
             'badge-num-brass', 'badge-num-crimson', 'ribbon-brass', 'ribbon-crimson', 'slip-paper', 'slip-clip']
    parts = [load(n) for n in names]
    sc = 6
    cw = sum(p.width * sc + 12 for p in parts) + 12
    ch = max(p.height * sc for p in parts) + 24
    out = Image.new('RGBA', (cw, ch), (0, 150, 0, 255))
    x = 12
    for p in parts:
        big = p.resize((p.width * sc, p.height * sc), Image.NEAREST)
        out.paste(big, (x, 12), big)
        x += big.width + 12
    out.save(os.path.join(ROOT, 'build-res', 'order', 'UI-21-25-refine-check.png'))


if __name__ == '__main__':
    boss_stat()
    boss_plate('boss-plate', 'boss-head')
    boss_plate('boss-plate-2', 'boss-head-2')
    badge()
    slip()
    check()
    print('21위 부품 다듬기 끝')
