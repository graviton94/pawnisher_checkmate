"""
받은 R-02 앱 아이콘 두 장 반입 (D-423 · D-544): 전경(종이왕 · 검은 바탕) · 바탕(리벳 쇠판).
  python3 -I tools/pixel/r02_icon_import.py   → build-res/icon-src/fg.png · bg.png (도트 1칸 = 1px) + 대조판 build-res/order/R-02-icon-check.png
그다음 python3 -I tools/app_icon.py · python3 -I tools/android-res.py 가 정수배로 아이콘을 찍는다.

받은 원본은 1254×1254 생성기 출력 — 발주한 32×32 ×32(1024)가 아니다. 격자는 scene_recipe.R02_GRID(실측):
  ① 칸 가운데 최빈색(snap.snap, 균일 격자) ② 발주 팔레트 16색으로 맞춤
  ③ 전경: 바깥 검은 바탕 = 투명 — 테두리에서 시작해 어두운 칸(먹 · 검정)만 따라 번지는 채우기(흰 테가 막는다 — 안쪽 먹 외곽선은 남는다)
  ④ 바탕: 불투명 그대로
사용자 결정(2026-11-17): 발주의 붉은 사선 베기는 빼고 받는다.
"""
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
import scene_recipe  # noqa: E402
import snap  # noqa: E402

ORDER = os.path.join(ROOT, 'build-res', 'order')
OUT = os.path.join(ROOT, 'build-res', 'icon-src')
PAL = [tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for h in scene_recipe.R02_GRID['palette']]


def near(c):
    return min(PAL, key=lambda p: (p[0] - c[0]) ** 2 * 3 + (p[1] - c[1]) ** 2 * 4 + (p[2] - c[2]) ** 2 * 2)


def lum(c):
    return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]


def restore(name):
    g = scene_recipe.R02_GRID[name]
    img = Image.open(os.path.join(ORDER, g['source'])).convert('RGB')
    p, ox, oy = g['grid']
    n = g['dots']
    xe = [max(0, min(img.width, ox + p * i)) for i in range(n + 1)]
    ye = [max(0, min(img.height, oy + p * i)) for i in range(n + 1)]
    small = snap.snap(img, p, ox, p, oy, 0, cuts=(xe, ye)).convert('RGBA')
    q = small.load()
    for y in range(small.height):
        for x in range(small.width):
            q[x, y] = (*near(q[x, y][:3]), 255)
    return img, small


def clear_outside(im, dark=40):
    """테두리에서 어두운 칸만 따라 번져 투명으로 (흰 테 바깥 검은 바탕)"""
    W, H = im.size
    q = im.load()
    seen = set()
    st = [(x, y) for x in range(W) for y in (0, H - 1)] + [(x, y) for y in range(H) for x in (0, W - 1)]
    while st:
        x, y = st.pop()
        if (x, y) in seen or not (0 <= x < W and 0 <= y < H) or lum(q[x, y]) > dark:
            continue
        seen.add((x, y))
        q[x, y] = (0, 0, 0, 0)
        st += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
    return len(seen)


def clean_plate(im):
    """바탕 쇠판 다듬기: 받은 판은 테가 1.3칸(25px) · 리벳 넷이 번짐으로 조금씩 달랐다 → 테 먹 1칸 사방 같게,
    속은 완전한 한 색(9-slice로 늘리는 면 — 생성기 얼룩 먹 낱점 제거), 리벳은 왼위 리벳(먹 테 5×5 · 속 2×2 빛)을 네 귀퉁이에 그대로 옮겨 찍는다."""
    from collections import Counter
    W, H = im.size
    q = im.load()
    ink = (*PAL[0], 255)
    body = Counter(q[x, y] for y in range(8, H - 8) for x in range(8, W - 8)).most_common(1)[0][0]
    rv = [[q[3 + i, 3 + j] for i in range(5)] for j in range(5)]  # 왼위 리벳 창 (테에서 3칸 안 · 원본 53px ≈ 2.8칸)
    before = im.copy()
    for y in range(H):
        for x in range(W):
            q[x, y] = ink if x in (0, W - 1) or y in (0, H - 1) else body
    for ox in (3, W - 8):
        for oy in (3, H - 8):
            for j in range(5):
                for i in range(5):
                    q[ox + i, oy + j] = rv[j][i]
    return sum(a != b for a, b in zip(before.getdata(), im.getdata()))


def main():
    os.makedirs(OUT, exist_ok=True)
    src_fg, fg = restore('fg')
    cleared = clear_outside(fg)
    src_bg, bg = restore('bg')
    print(f'R-02 bg: 쇠판 다듬기 {clean_plate(bg)}칸 바뀜 (테 · 얼룩 · 리벳 맞춤)')
    fg.save(os.path.join(OUT, 'fg.png'))
    bg.save(os.path.join(OUT, 'bg.png'))
    for nm, im in (('fg', fg), ('bg', bg)):
        cs = sorted({c[:3] for c in im.getdata() if c[3]})
        print(f'R-02 {nm}: {im.size[0]}×{im.size[1]}도트 · 색 {len(cs)} (16색 안: {set(cs) <= set(PAL)})' + (f' · 투명 칸 {cleared} · 그림 상자 {fg.getbbox()}' if nm == 'fg' else ''))
    # 대조판: 받은 원본(축소) | 반입 도트 ×(같은 크기) — 전경 · 바탕 · 겹친 것
    k = 8
    S = fg.width * k
    chk = Image.new('RGB', (S * 3 + 40, S * 2 + 30), (60, 60, 70))
    chk.paste(src_fg.resize((S, S), Image.LANCZOS), (10, 10))
    chk.paste(src_bg.resize((S, S), Image.LANCZOS), (S + 20, 10))
    chk.paste(fg.resize((S, S), Image.NEAREST), (10, S + 20), fg.resize((S, S), Image.NEAREST))
    chk.paste(bg.resize((S, S), Image.NEAREST), (S + 20, S + 20))
    comp = bg.copy()
    comp.alpha_composite(fg)
    chk.paste(comp.resize((S, S), Image.NEAREST), (2 * S + 30, S + 20))
    chk.save(os.path.join(ORDER, 'R-02-icon-check.png'))


if __name__ == '__main__':
    main()
