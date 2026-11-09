"""
받은 UI 키트 부품(D-390, src/assets/ui/chrome/v2/) 다듬기 — 패스 0 (D-391, 보고서 2026-11-09f 3.3 · 3.4 · 3.6).
  python3 -I tools/pixel/ui_kit_normalize.py          # 고쳐 쓰기 (몇 번 돌려도 같은 결과)
  python3 -I tools/pixel/ui_kit_normalize.py --check  # 바꾸지 않고 크기만 확인

하는 일 (그림을 새로 그리지 않는다 — 정렬 · 자르기 · 빈칸 채우기 · 9-slice 가운데 줄 늘이기/줄이기만):
① 단추 12장(4재질 × up/down/off): 외곽이 장마다 29~32 × 17~20 → 면을 30×19로 맞춰 32×20 한 캔버스에.
   보통 · 꺼짐 = (1, 0), 눌림 = 면이 1도트 아래 (1, 1). 늘이기/줄이기는 「같은 줄이 이어진 곳」에서 한 줄씩
   — 9-slice가 화면에서 하는 일과 같다(가운데 변 · 면만 바뀌고 모서리는 그대로).
② 선택지 판 4장: 69~72 × 23 → 72×23 면, 72×24 캔버스. 눌림 = 1도트 아래.
③ 장면 액자: 위 가운데 황동 명패를 scene-frame-plate.png로 떼어 내고, 그 자리 위 테는 바로 옆 민 테 열로 채운다
   → 9-slice 변이 고르게 이어진다.
④ 정보 단추 · 카드 받침: 상태끼리 같은 캔버스(21×21 · 51×69)로 빈칸 채움(가운데 정렬).
확인용: build-res/order/UI-norm-check.png (×4)
"""
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
V2 = os.path.join(ROOT, 'src', 'assets', 'ui', 'chrome', 'v2')
CHECK = '--check' in sys.argv


def load(name):
    return Image.open(os.path.join(V2, f'{name}.png')).convert('RGBA')


def face(im):
    """투명 여백을 뺀 그림 (bbox)"""
    return im.crop(im.getbbox())


def col(im, x):
    return [im.getpixel((x, y)) for y in range(im.height)]


def row(im, y):
    return [im.getpixel((x, y)) for x in range(im.width)]


def best_run(im, axis):
    """가운데에 가장 가까운, 바로 옆과 똑같은 줄(열)의 번호 — 여기서 늘이고 줄인다"""
    n = im.width if axis == 0 else im.height
    get = (lambda i: col(im, i)) if axis == 0 else (lambda i: row(im, i))
    mid = n // 2
    for d in range(n):
        for i in (mid - d, mid + d):
            if 1 <= i < n - 1 and get(i) == get(i - 1):
                return i
    return mid


def fit(im, w, h):
    """9-slice 가운데 줄을 하나씩 겹치거나 빼서 w×h로 (모서리 · 테 모양은 그대로)"""
    while im.width != w:
        x = best_run(im, 0)
        if im.width < w:
            out = Image.new('RGBA', (im.width + 1, im.height))
            out.paste(im.crop((0, 0, x + 1, im.height)), (0, 0))
            out.paste(im.crop((x, 0, im.width, im.height)), (x + 1, 0))
        else:
            out = Image.new('RGBA', (im.width - 1, im.height))
            out.paste(im.crop((0, 0, x, im.height)), (0, 0))
            out.paste(im.crop((x + 1, 0, im.width, im.height)), (x, 0))
        im = out
    while im.height != h:
        y = best_run(im, 1)
        if im.height < h:
            out = Image.new('RGBA', (im.width, im.height + 1))
            out.paste(im.crop((0, 0, im.width, y + 1)), (0, 0))
            out.paste(im.crop((0, y, im.width, im.height)), (0, y + 1))
        else:
            out = Image.new('RGBA', (im.width, im.height - 1))
            out.paste(im.crop((0, 0, im.width, y)), (0, 0))
            out.paste(im.crop((0, y + 1, im.width, im.height)), (0, y))
        im = out
    return im


def place(im, cw, ch, x, y):
    out = Image.new('RGBA', (cw, ch))
    out.paste(im, (x, y))
    return out


done = []


def save(name, im):
    path = os.path.join(V2, f'{name}.png')
    if not CHECK:
        im.save(path)
    done.append((name, im))


# ① 단추 — 32×20 캔버스, 면 30×19
for m in ('brass', 'iron', 'crimson', 'teal'):
    for s in ('up', 'down', 'off'):
        f = fit(face(load(f'btn-{m}-{s}')), 30, 19)
        save(f'btn-{m}-{s}', place(f, 32, 20, 1, 1 if s == 'down' else 0))

# ② 선택지 판 — 72×24 캔버스, 면 72×23
for s in ('up', 'down', 'sel', 'off'):
    f = fit(face(load(f'choice-{s}')), 72, 23)
    save(f'choice-{s}', place(f, 72, 24, 0, 1 if s == 'down' else 0))

# ③ 장면 액자 — 위 가운데 명패 떼기 (이미 뗐으면 그대로)
sf = face(load('scene-frame'))
if os.path.exists(os.path.join(V2, 'scene-frame-plate.png')) and sf.size == (52, 31):
    done.append(('scene-frame', sf))
    done.append(('scene-frame-plate', load('scene-frame-plate')))
else:
    BRASS = {(0xF5, 0xC5, 0x42), (0xC8, 0x9B, 0x3C), (0x8A, 0x64, 0x16)}
    W, H = sf.size
    px = sf.load()
    # 명패 = 위 8줄 안, 가운데 쪽 황동 색이 이어진 열들 (+ 양옆 먹 테 1열)
    cols = [x for x in range(W) if any(px[x, y][3] and px[x, y][:3] in BRASS for y in range(0, 8)) and 12 <= x < W - 12]
    x0, x1 = min(cols) - 1, max(cols) + 1
    plate = face(sf.crop((x0, 0, x1 + 1, 8)))
    # 명패 자리: 바로 왼쪽 민 테 열(x0 - 2)을 그대로 이어 붙인다
    src = x0 - 2
    for x in range(x0, x1 + 1):
        for y in range(0, 8):
            px[x, y] = px[src, y]
    sf = face(sf)
    save('scene-frame', sf)
    save('scene-frame-plate', plate)

# ④ 정보 단추 · 카드 받침 — 상태끼리 같은 캔버스
for names, (cw, ch) in ((('info-up', 'info-down'), (21, 21)), (('card-slot', 'card-slot-sel'), (51, 69))):
    for n in names:
        f = face(load(n))
        save(n, place(f, cw, ch, (cw - f.width) // 2, ch - f.height))

for n, im in done:
    print(f'  {n}: {im.width}×{im.height}')

if not CHECK:
    sc = 4
    cw = 16 + sum(im.width * sc + 16 for _, im in done[:16])
    rows = [done[i:i + 16] for i in range(0, len(done), 16)]
    ch = 16 + sum(max(im.height for _, im in r) * sc + 16 for r in rows)
    chk = Image.new('RGBA', (cw, ch), (200, 0, 200, 255))
    y = 16
    for r in rows:
        x = 16
        for _, im in r:
            big = im.resize((im.width * sc, im.height * sc), Image.NEAREST)
            chk.paste(big, (x, y), big)
            x += big.width + 16
        y += max(im.height for _, im in r) * sc + 16
    os.makedirs(os.path.join(ROOT, 'build-res', 'order'), exist_ok=True)
    chk.save(os.path.join(ROOT, 'build-res', 'order', 'UI-norm-check.png'))
