"""
받은 MM-01 시트 반입 (D-423 · D-544): 「쓸 수 없음」 단추 4종 · 메뉴 단추 3상태 · 메뉴 아이콘 5종.
  python3 -I tools/pixel/mm01_import.py measure   # 부품마다 도트 간격 · 시작점 재기 (scene_recipe.MM01_GRID에 옮겨 적는다)
  python3 -I tools/pixel/mm01_import.py [--dry]    # 반입

받은 시트(1958×803, 마젠타 바탕)는 발주한 176×72 ×8 한 격자가 아니다 — 생성기가 줄마다 다른 크기로 그렸다
(단추 줄 ≈ 10.2px · 메뉴 단추 ≈ 12.2px · 아이콘 ≈ 12.3px). 그래서 시트 전체를 한 격자로 자르지 않고
① 마젠타가 아닌 덩어리 12개를 상자로 찾고 ② 상자마다 scene_recipe.MM01_GRID의 실측 균일 격자(간격 · 시작)로 칸 가운데 최빈색
③ 마젠타 = 투명, 발주 팔레트 15색(ui_kit_import.PAL — MM-01 발주 팔레트와 같다)으로 맞춘다.
④ 꺼짐 단추: 받은 꼴은 42×18도트(발주 32×20과 비가 다르다) — 늘이지 않고 9-slice 그대로 다시 짠다:
   네 귀퉁이 6×6도트(리벳 포함)는 받은 그림 그대로, 변 · 가운데는 받은 변 · 가운데의 가장 많은 색 한 색(완전한 단색 — 늘이면 반복되므로)
   → 32×20 (kit.css --k-btn-y 6 · --k-btn-x 6과 같은 테) → src/assets/ui/chrome/v2/btn-{iron,brass,crimson,teal}-off.png
⑤ 메뉴 단추: 세 상태를 같은 24×24 캔버스에 아래 맞춤(눌림은 판이 내려앉아 위가 낮다) → btn-menu-{up,down,off}.png
⑥ 아이콘: 같은 캔버스(가장 큰 아이콘 크기)에 가운데 · 아래 맞춤 → public/ui/icons16/{lock,menu.run,menu.ledger,menu.settings,menu.quit}.png
대조판: build-res/order/MM-01-check.png (받은 원본 축소 ↔ 반입 도트 ×4)
"""
import os
import sys
from collections import Counter

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
import scene_recipe  # noqa: E402
import snap  # noqa: E402
import ui_kit_import as kit  # noqa: E402

SRC = os.path.join(ROOT, 'build-res', 'order', 'MM-01-source.png')
V2 = os.path.join(ROOT, 'src', 'assets', 'ui', 'chrome', 'v2')
ICO = os.path.join(ROOT, 'public', 'ui', 'icons16')
EDGE = 6  # 9-slice 테 (kit.css --k-btn-y · --k-btn-x)
BTN = (32, 20)
MENU = (24, 24)


def boxes(img):
    """마젠타가 아닌 덩어리 상자 (원본 px) — 시트 순서(줄 → 왼쪽부터)"""
    a = np.asarray(img).astype(int)
    m = ~((a[:, :, 0] > 150) & (a[:, :, 2] > 150) & (a[:, :, 1] < 120))
    bs = kit.order(kit.merge(kit.comps(m[::2, ::2]), 2))
    return [tuple(v * 2 for v in b) for b in bs]


def measure():
    img = Image.open(SRC).convert('RGB')
    A = np.asarray(img, dtype=float)
    for i, b in enumerate(boxes(img)):
        pad = 8
        x0, y0 = max(0, b[0] - pad), max(0, b[1] - pad)
        a = A[y0:b[3] + pad, x0:b[2] + pad]
        H, W = a.shape[:2]
        px, py = snap._profile(a, 1), snap._profile(a, 0)
        best = max(((snap._score(px, W, p)[0] + snap._score(py, H, p)[0], p) for p in np.arange(9.0, 14.0, 0.02)))
        p = best[1]
        ox, oy = snap._score(px, W, p)[1] + x0, snap._score(py, H, p)[1] + y0
        print(f'  {i:2d} {b}  간격 {p:.2f}  시작 ({ox:.2f}, {oy:.2f})  → {(b[2] - b[0]) / p:.1f}×{(b[3] - b[1]) / p:.1f}도트  점수 {best[0]:.2f}')


def hexes(hs):
    return [tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for h in hs]


# 아이콘 팔레트: 발주 15색에서 진홍을 빼고(「쓸 수 없음」 · 메뉴는 위험이 아니다) 나무 계단 셋을 더한다 — 받은 출하 상자 · 원부 끈이
# 나무 갈색으로 와서 15색에 붙이면 진홍 · 황동 얼룩이 됐다. 갈색은 초상 · 사건 그림에서 이미 쓰는 게임 색(scene_recipe._BROWN).
ICON_PAL = [c for c in kit.PAL if c not in hexes(['#7A1218', '#E5262F', '#FF7B7B'])] + hexes(['#5C4030', '#80553A', '#A4774B'])


def near(c, pal):
    return min(pal, key=lambda p: (p[0] - c[0]) ** 2 * 3 + (p[1] - c[1]) ** 2 * 4 + (p[2] - c[2]) ** 2 * 2)


def part(img, b, g, pal=kit.PAL):
    """상자 하나 → 도트 그림 (투명 바탕 · 팔레트 pal · 불투명 칸 상자로 자름)"""
    p, ox, oy = g
    # 상자를 격자 칸 경계로 넓힌다 (시작점은 원본 좌표 — 같은 격자를 그대로)
    x0 = ox + p * np.floor((b[0] - p - ox) / p)
    y0 = oy + p * np.floor((b[1] - p - oy) / p)
    x1, y1 = b[2] + p, b[3] + p
    crop = img.crop((int(round(x0)), int(round(y0)), int(round(x1)), int(round(y1))))
    small = kit.uniform_snap(crop, p, x0 - round(x0), p, y0 - round(y0))
    q = small.load()
    for y in range(small.height):
        for x in range(small.width):
            c = q[x, y]
            q[x, y] = (0, 0, 0, 0) if (not c[3] or kit.is_key(c)) else (*near(c, pal), 255)
    # 마젠타 번짐이 남긴 낱점(덩어리 밖 1~2칸)은 버린다 — 가장 큰 덩어리만
    a = np.asarray(small)[:, :, 3] > 0
    bb = max(kit.comps(a), key=lambda r: (r[2] - r[0]) * (r[3] - r[1]))
    return small.crop(bb)


def mode(px):
    return Counter(px).most_common(1)[0][0]


def despeck(im, rare=6):
    """생성기 번짐 낱점(그림 전체에 rare칸 이하인 색 — 황동 단추 테의 진홍 점 같은 것)을 이웃 4칸의 가장 많은 색으로"""
    out = im.copy()
    s, o = im.load(), out.load()
    cnt = Counter(c for c in im.getdata() if c[3])
    for y in range(im.height):
        for x in range(im.width):
            c = s[x, y]
            if c[3] and cnt[c] <= rare:
                nb = [s[x + dx, y + dy] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)) if 0 <= x + dx < im.width and 0 <= y + dy < im.height]
                nb = [q for q in nb if q[3] and cnt[q] > rare]
                if nb:
                    o[x, y] = mode(nb)
    return out


def lone(im):
    """외톨이 칸 (먹이 아니고, 이웃 4칸 중 3칸 이상이 같은 다른 색) → 그 색. 받은 쇠판의 얼룩 질감이 칸 가운데 색으로 남은 것을 지운다"""
    out = im.copy()
    s, o = im.load(), out.load()
    ink = (*kit.PAL[0], 255)
    for y in range(1, im.height - 1):
        for x in range(1, im.width - 1):
            c = s[x, y]
            if not c[3] or c == ink:
                continue
            nb = [s[x + 1, y], s[x - 1, y], s[x, y + 1], s[x, y - 1]]
            if c in nb:
                continue
            top, n = Counter(nb).most_common(1)[0]
            if n >= 3 and top[3] and top != ink:
                o[x, y] = top
    return out


RIVET = 3 # 받은 단추의 리벳(먹 테 포함 4×4)은 바깥 테에서 3칸 안쪽 — 6칸 귀퉁이에 들도록 한 칸 바깥(2칸)으로 옮긴다


def nine(src, size=BTN, e=EDGE):
    """받은 꺼짐 단추 → size 9-slice: 귀퉁이 e×e는 받은 그림(테 · 빛), 변 · 가운데는 한 색씩 (가장 많은 색).
    리벳 넷은 왼위 리벳 하나(빛 왼위)를 그대로 옮겨 찍는다 — 받은 넷이 번짐으로 서로 달랐고, 4×4가 6칸 귀퉁이를 넘었다"""
    src = despeck(src)
    w, h = src.size
    W, H = size
    s = src.load()
    ink = (*kit.PAL[0], 255)
    mid0 = mode([s[x, y] for y in range(e, h - e) for x in range(e, w - e)])
    # 리벳 속 색: 네 귀퉁이 리벳 자리(바깥 테에서 3 ~ 6칸)의 먹 · 몸이 아닌 칸 — 가장 밝은 것 = 왼위 빛 한 칸, 가장 많은 것 = 나머지 셋
    core = Counter(s[x, y] for y in range(h) for x in range(w)
                   if 3 <= min(x, w - 1 - x) <= 6 and 3 <= min(y, h - 1 - y) <= 6 and s[x, y] not in (ink, mid0) and s[x, y][3])
    shade = core.most_common(1)[0][0]
    light = max(core, key=lambda c: 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2])
    # 받은 리벳은 번짐으로 넷이 다 달랐다 — 받은 꼴(먹 테 4×4 · 귀 둥글림 · 속 2×2)을 한 벌로 맞춘다
    rv = [[mid0, ink, ink, mid0], [ink, light, shade, ink], [ink, shade, shade, ink], [mid0, ink, ink, mid0]]
    out = Image.new('RGBA', size, (0, 0, 0, 0))
    o = out.load()
    # 변 한 줄(위 · 아래 e줄의 줄마다, 왼 · 오른 e칸의 칸마다) = 받은 변 가운데 부분의 가장 많은 색
    top = [mode([s[x, y] for x in range(e, w - e)]) for y in range(e)]
    bot = [mode([s[x, y] for x in range(e, w - e)]) for y in range(h - e, h)]
    left = [mode([s[x, y] for y in range(e, h - e)]) for x in range(e)]
    right = [mode([s[x, y] for y in range(e, h - e)]) for x in range(w - e, w)]
    mid = mode([s[x, y] for y in range(e, h - e) for x in range(e, w - e)])
    for y in range(H):
        for x in range(W):
            cx = x if x < e else (w - (W - x) if x >= W - e else None)
            cy = y if y < e else (h - (H - y) if y >= H - e else None)
            if cx is not None and cy is not None:
                dx, dy = min(x, W - 1 - x), min(y, H - 1 - y)  # 바깥 테에서 떨어진 칸 수
                if 2 <= dx <= 5 and 2 <= dy <= 5:
                    rx = x - 2 if x < e else x - (W - 6)
                    ry = y - 2 if y < e else y - (H - 6)
                    o[x, y] = rv[ry][rx]
                elif dx >= 2 and dy >= 2:
                    o[x, y] = mid
                else:
                    o[x, y] = s[cx, cy]
            elif cy is not None:
                o[x, y] = top[cy] if y < e else bot[cy - (h - e)]
            elif cx is not None:
                o[x, y] = left[cx] if x < e else right[cx - (w - e)]
            else:
                o[x, y] = mid
    return out


def place(im, size, align='bottom'):
    can = Image.new('RGBA', size, (0, 0, 0, 0))
    assert im.width <= size[0] and im.height <= size[1], (im.size, size)
    x = (size[0] - im.width) // 2
    y = size[1] - im.height if align == 'bottom' else (size[1] - im.height) // 2
    can.paste(im, (x, y), im)
    return can


def colors(im):
    return sorted({c[:3] for c in im.getdata() if c[3]})


def main(dry=False):
    img = Image.open(SRC).convert('RGB')
    G = scene_recipe.MM01_GRID
    bs = boxes(img)
    assert len(bs) == len(G['parts']), f'덩어리 {len(bs)}개 — 발주 부품 {len(G["parts"])}개가 아니다'
    is_icon = [not n.startswith('btn-') for n in G['parts']]
    raw = [part(img, b, G['grid'][i], ICON_PAL if is_icon[i] else kit.PAL) for i, b in enumerate(bs)]
    out = []
    for i, (name, im) in enumerate(zip(G['parts'], raw)):
        if name.startswith('btn-menu'):
            fin, dst = lone(despeck(im)), os.path.join(V2, f'{name}.png')
        elif name.startswith('btn-'):
            fin, dst = nine(im), os.path.join(V2, f'{name}.png')
        else:
            fin, dst = lone(despeck(im, 2)), os.path.join(ICO, f'{name}.png')
        out.append([name, im, fin, dst])
    # 메뉴 단추 · 아이콘: 같은 줄은 같은 캔버스 (상태가 바뀌어도 자리가 흔들리지 않게)
    # 메뉴 아이콘 넷(menu.*)은 메인 메뉴 단추에 같은 자리로 놓이므로 같은 캔버스, 자물쇠는 제 크기 그대로
    icon_can = (max(r[2].width for r in out if r[0].startswith('menu.')), max(r[2].height for r in out if r[0].startswith('menu.')))
    for r in out:
        if r[0].startswith('btn-menu'):
            r[2] = place(r[2], MENU)
        elif r[0].startswith('menu.'):
            r[2] = place(r[2], icon_can)
    for name, im, fin, dst in out:
        cs = colors(fin)
        print(f'  {name}: 받은 꼴 {im.width}×{im.height} → {fin.width}×{fin.height} · 색 {len(cs)}')
        if not dry:
            fin.save(dst)
    btn_c, ico_c = set(), set()
    for r, ic in zip(out, is_icon):
        (ico_c if ic else btn_c).update(colors(r[2]))
    print(f'MM-01: 부품 {len(out)} · 단추 색 {len(btn_c)} (발주 15색 안: {btn_c <= set(kit.PAL)}) · '
          f'아이콘 색 {len(ico_c)} (아이콘 팔레트 안: {ico_c <= set(ICON_PAL)}) · 아이콘 캔버스 {icon_can[0]}×{icon_can[1]}')
    # 대조판: 위 = 받은 원본(축소), 아래 = 반입 도트 ×4 (부품마다 같은 자리)
    sc = 4
    small_src = img.resize((img.width // 2, img.height // 2), Image.NEAREST)
    cw = max(small_src.width, sum(r[2].width * sc + 12 for r in out) + 12)
    rowh = max(r[2].height for r in out) * sc + 24
    chk = Image.new('RGB', (cw, small_src.height + rowh + 16), (24, 23, 30))
    chk.paste(small_src, (0, 0))
    x = 12
    for _, _, fin, _ in out:
        big = fin.resize((fin.width * sc, fin.height * sc), Image.NEAREST)
        chk.paste(big, (x, small_src.height + 16), big)
        x += big.width + 12
    chk.save(os.path.join(ROOT, 'build-res', 'order', 'MM-01-check.png'))
    return out


if __name__ == '__main__':
    if sys.argv[1:2] == ['measure']:
        measure()
    else:
        main('--dry' in sys.argv)
