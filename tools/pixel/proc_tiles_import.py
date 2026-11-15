"""
PB-01 공정 판 칸 — 두 판본 합치기 (D-521 · 공정 판 D-486). 격자 값 정본: tools/pixel/scene_recipe.py PB01_GRID
  python3 -I tools/pixel/proc_tiles_import.py [--dry]
받은 그림 (원본 보관):
  build-res/order/PB-01-a-source.png  a안 — 진짜 도트(148×124 ×8) · 밝은/어두운 칸 짝 테 · 낮은 대비. 무늬는 흐릿하다.
  build-res/order/PB-01-b-source.png  b안 — 무늬가 또렷하다(말굽 자석 · 화로 창살 · 번지는 금 · 롤러). 비정수 고해상도, 칸 짝 없음.
하는 일 (칸마다, 새로 그리지 않고 두 그림 조각을 자르고 겹치기만 — D-386):
  ① a안: 8×8 덩어리 → 1도트로 정확히 되돌린다. 칸 짝 테(바깥 2도트 · 3째 줄 띠)를 밝은 칸 · 어두운 칸 두 벌 떠 낸다.
  ② b안: 칸의 먹 테를 걷고 가운데 정사각만 잘라(비율 유지) 팔레트(a안 색 ∪ 발주서 15색)로 맞춘 뒤 16×16으로 다수결 축소 —
     먹 · 등불 색(청록 · 진홍 · 밝은 황동)은 가늘어도 남도록 가중. floor면 b안 바닥색(가장 많은 색)은 걷어 a안 칸 바닥이 비친다.
  ③ a안 테 안쪽(2도트부터 16×16)에 b안 무늬를 얹는다. 어두운 칸은 갈색을 한 단 내린다(같은 갈색 계단 안에서).
  ④ 가운데 12×12(기물이 서는 자리)는 밝은 색을 한 단 낮춰 차분하게 — 팔레트 안의 이웃 단으로만 바꾼다.
  ⑤ 팔레트 검사: 결과에 a안 · 발주서 밖의 색이 하나라도 있으면 멈춘다.
출력: public/ui/board/proc-<이름>.png (밝은 칸) · proc-<이름>-dark.png (어두운 칸), 20×20
대조판: build-res/order/PB-01-check.png (칸마다 a안 · b안 · 합친 밝은 칸 · 합친 어두운 칸, 6배)
"""
import os
import sys
from collections import Counter

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
from scene_recipe import PB01_GRID as G  # noqa: E402

ORDER = os.path.join(ROOT, 'build-res', 'order')
OUT = os.path.join(ROOT, 'public', 'ui', 'board')


def hx(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


# 발주서 PB-01 팔레트 15색 + 판 칸 네 색 (a안이 쓴 15색은 모두 이 안에 있다 — 아래 검사)
SPEC = [hx(h) for h in ('#0B0B0E', '#33313B', '#56545E', '#8A8794', '#8A6416', '#C89B3C', '#F5C542', '#8E877A', '#BFB9AD',
                        '#F1EDE4', '#7A1218', '#E5262F', '#FF7B7B', '#1F8A7A', '#5EEAD4', '#5C4030', '#80553A', '#2A2420', '#3A2D26')]
INK = hx('#0B0B0E')
# 갈색 계단 (어두운 → 밝은) — 어두운 칸에서 한 단 내린다
BROWN = [hx(h) for h in ('#2A2420', '#3A2D26', '#5C4030', '#80553A')]
# 가운데 차분하게: 밝은 단 → 한 단 아래 (같은 재질 계단 안)
CALM = {hx(a): hx(b) for a, b in (('#F5C542', '#C89B3C'), ('#C89B3C', '#8A6416'), ('#FF7B7B', '#E5262F'), ('#E5262F', '#7A1218'),
                                  ('#5EEAD4', '#1F8A7A'), ('#F1EDE4', '#BFB9AD'), ('#BFB9AD', '#8E877A'), ('#8A8794', '#56545E'))}
# 다수결 가중 — 가는 먹 선 · 등불 색이 축소에서 사라지지 않게
WEIGHT = {INK: 1.7, **{hx(h): 1.6 for h in ('#5EEAD4', '#1F8A7A', '#E5262F', '#FF7B7B', '#F5C542', '#C89B3C')}}
# 바닥을 걷을 칸 (나머지는 칸 전체가 기계 — 컨베이어 벨트 · 용광로 창살)
FLOOR = {'press-warn', 'press-hit', 'press-dent', 'magnet-rail', 'magnet-post', 'crack1', 'crack2', 'crack3'}


def near(c, pal=SPEC):
    return min(pal, key=lambda p: (p[0] - c[0]) ** 2 * 3 + (p[1] - c[1]) ** 2 * 4 + (p[2] - c[2]) ** 2 * 2)


def a_cell(a, r, c):
    """a안 칸 하나를 1도트 20×20으로 (8×8 덩어리 왼위 픽셀 — 덩어리가 모두 단색인지 먼저 검사)"""
    g = G['a']
    x0 = (g['origin'] + c * (g['cell'] + g['gap'])) * g['scale']
    y0 = (g['origin'] + r * (g['cell'] + g['gap'])) * g['scale']
    out = Image.new('RGB', (20, 20))
    for y in range(20):
        for x in range(20):
            blk = a.crop((x0 + x * 8, y0 + y * 8, x0 + x * 8 + 8, y0 + y * 8 + 8))
            cols = blk.getcolors(64)
            if len(cols) != 1:
                sys.exit(f'a안 ({r},{c}) 도트 ({x},{y})가 단색이 아니다 — 격자가 어긋났다')
            out.putpixel((x, y), cols[0][1])
    return out


def frame(a, light):
    """a안 칸 짝 테 — 바깥 2도트 · 3째 줄 띠는 a안 그대로, 안쪽은 칸 바닥색"""
    src = a_cell(a, 2, 0) if light else a_cell(a, 1, 2)  # 밝은 칸: 자석 레일 칸 / 어두운 칸: 찍힌 자국 칸 — 둘 다 테가 온전하다
    fill = BROWN[2] if light else BROWN[0]
    band = BROWN[3] if light else BROWN[1]
    out = src.copy()
    for y in range(2, 18):
        for x in range(2, 18):
            out.putpixel((x, y), band if y == 2 else fill)
    return out, fill


def b_pattern(b, r, c, n=16, iron=False):
    """b안 칸 → n×n 팔레트 도트 (먹 테 걷기 · 가운데 정사각 · 가중 다수결). iron이면 갈색 없이 맞춘다(벨트 화살 홈이 쇠로 고르게)"""
    pal = [p for p in SPEC if p not in BROWN] if iron else SPEC
    g = G['b']
    (y0, y1), (x0, x1) = g['rows'][r], g['cols'][c]
    t = g['trim']
    x0, x1, y0, y1 = x0 + t, x1 - t, y0 + t, y1 - t
    side = min(x1 - x0, y1 - y0)
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    box = (round(cx - side / 2), round(cy - side / 2), round(cx - side / 2) + side, round(cy - side / 2) + side)
    crop = b.crop(box).convert('RGB')
    q = {}
    px = crop.load()
    out = []
    for j in range(n):
        row = []
        for i in range(n):
            cnt = Counter()
            for y in range(int(j * side / n), int((j + 1) * side / n)):
                for x in range(int(i * side / n), int((i + 1) * side / n)):
                    p = px[x, y]
                    if p not in q:
                        q[p] = near(p, pal)
                    cnt[q[p]] += 1
            row.append(max(cnt, key=lambda k: cnt[k] * WEIGHT.get(k, 1.0)))
        out.append(row)
    return out


def rot(m, k):
    for _ in range(k % 4):
        m = [list(r) for r in zip(*m)][::-1]
    return m


def merge(a, b, name, spec, light):
    base, fill = frame(a, light)
    r, c = spec['rc']
    if spec['use'] == 'a':
        src = a_cell(a, r, c)
        pat = [[src.getpixel((x + 2, y + 2)) for x in range(16)] for y in range(16)]
        floor = Counter(p for row in pat for p in row).most_common(1)[0][0]
    else:
        pat = rot(b_pattern(b, r, c, iron=spec.get('iron', False)), spec.get('rot', 0))
        floor = Counter(p for row in pat for p in row).most_common(1)[0][0] if name in FLOOR else None
    o, n = G['inner']
    k0, kn = G['calm']
    for y in range(n):
        for x in range(n):
            p = pat[y][x]
            if p == floor:
                continue
            if not light and p in BROWN:
                # 어두운 칸: 갈색 한 단 아래 — 가장 어두운 갈색(그림자)은 바닥에 묻히지 않게 먹으로
                p = BROWN[BROWN.index(p) - 1] if BROWN.index(p) else INK
            if spec.get('calm', True) and k0 <= x + o < k0 + kn and k0 <= y + o < k0 + kn:
                p = CALM.get(p, p)
            base.putpixel((x + o, y + o), p)
    return base


def main(dry=False):
    a = Image.open(os.path.join(ORDER, 'PB-01-a-source.png')).convert('RGB')
    b = Image.open(os.path.join(ORDER, 'PB-01-b-source.png')).convert('RGB')
    allowed = set(SPEC)
    # a안 색이 모두 허용 팔레트 안인가 (마젠타 제외)
    a_cols = {c for _, c in a.getcolors(1 << 16)} - {(255, 0, 255)}
    if a_cols - allowed:
        sys.exit(f'a안에 발주서 밖 색: {sorted(a_cols - allowed)}')
    S = 6
    tiles = G['tiles']
    check = Image.new('RGB', (4 * 20 * S + 5 * 4 * S, len(tiles) * 24 * S + 4 * S), (255, 0, 255))
    for i, (name, spec) in enumerate(tiles.items()):
        r, c = spec['rc']
        lt = merge(a, b, name, spec, True)
        dk = merge(a, b, name, spec, False)
        for im in (lt, dk):
            extra = {cc for _, cc in im.getcolors(400)} - allowed
            if extra:
                sys.exit(f'{name}: 팔레트 밖 색 {extra}')
        # 대조판: a안 · b안(같은 정사각 잘라 20칸 크기로 보기만) · 합친 밝은 칸 · 합친 어두운 칸
        g = G['b']
        (y0, y1), (x0, x1) = g['rows'][r], g['cols'][c]
        bview = b.crop((x0, y0, x1, y1)).resize((20 * S, round(20 * S * (y1 - y0) / (x1 - x0))), Image.NEAREST)
        y = 4 * S + i * 24 * S
        for k, im in enumerate((a_cell(a, r, c), None, lt, dk)):
            x = 4 * S + k * 24 * S
            if im is None:
                check.paste(bview, (x, y))
            else:
                check.paste(im.resize((20 * S, 20 * S), Image.NEAREST), (x, y))
        if not dry:
            lt.convert('RGBA').save(os.path.join(OUT, f'proc-{name}.png'))
            dk.convert('RGBA').save(os.path.join(OUT, f'proc-{name}-dark.png'))
    check.save(os.path.join(ORDER, 'PB-01-check.png'))
    print(f'{len(tiles)}칸 × 2 (밝은 · 어두운) → public/ui/board/proc-*.png · 대조판 build-res/order/PB-01-check.png')


if __name__ == '__main__':
    main('--dry' in sys.argv)
