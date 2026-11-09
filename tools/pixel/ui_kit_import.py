"""
받은 UI 키트 시트(발주 19위 UI-01 ~ UI-04, D-386 · D-388) → 부품마다 진짜 도트 PNG.
  python3 -I tools/pixel/ui_kit_import.py <받은 그림> UI-0N
하는 일: ① 시트 전체의 숨은 도트 격자를 찾아 칸 하나 = 1px로(snap.py) ② 마젠타 = 투명
③ 발주 팔레트 15색으로 맞춤 ④ 붙어 있는 덩어리마다 잘라 이름을 붙여 src/assets/ui/chrome/v2/<이름>.png
확인용: build-res/order/UI-0N-check.png (부품 ×4 + 이름)
"""
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
import snap  # noqa: E402

PAL = ['#0B0B0E', '#33313B', '#56545E', '#8A8794', '#8A6416', '#C89B3C', '#F5C542', '#8E877A', '#BFB9AD', '#F1EDE4',
       '#7A1218', '#E5262F', '#FF7B7B', '#1F8A7A', '#5EEAD4']
PAL = [tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for h in PAL]

NAMES = {
    'UI-01': ['panel-iron', 'panel-paper', 'plate-brass', 'inset-well', 'toast-iron', 'divider'],
    'UI-02': [f'btn-{m}-{s}' for m in ('brass', 'iron', 'crimson', 'teal') for s in ('up', 'down', 'off')],
    'UI-03': ['choice-up', 'choice-down', 'choice-sel', 'choice-off', 'tag-brass', 'tag-crimson', 'info-up', 'info-down', 'wallet'],
    'UI-04': ['scene-frame', 'portrait-frame', 'card-slot', 'card-slot-sel'],  # 받은 시트의 줄 순서대로 (D-390 확인)
}


def near(c):
    return min(PAL, key=lambda p: (p[0] - c[0]) ** 2 * 3 + (p[1] - c[1]) ** 2 * 4 + (p[2] - c[2]) ** 2 * 2)


def is_key(c):
    r, g, b = c[:3]
    return r > 150 and b > 150 and g < 120


def comps(mask):
    """붙어 있는 덩어리 (8방향) → [(x0, y0, x1, y1)]"""
    H, W = mask.shape
    seen = np.zeros_like(mask)
    out = []
    for y in range(H):
        for x in range(W):
            if not mask[y, x] or seen[y, x]:
                continue
            st = [(y, x)]
            seen[y, x] = 1
            x0 = x1 = x
            y0 = y1 = y
            n = 0
            while st:
                cy, cx = st.pop()
                n += 1
                x0, x1, y0, y1 = min(x0, cx), max(x1, cx), min(y0, cy), max(y1, cy)
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        ny, nx = cy + dy, cx + dx
                        if 0 <= ny < H and 0 <= nx < W and mask[ny, nx] and not seen[ny, nx]:
                            seen[ny, nx] = 1
                            st.append((ny, nx))
            if n >= 12:
                out.append((x0, y0, x1 + 1, y1 + 1))
    return out


def order(boxes):
    """줄(위 → 아래), 줄 안에서 왼 → 오른"""
    boxes = sorted(boxes, key=lambda b: b[1])
    rows, cur = [], []
    for b in boxes:
        if cur and b[1] > max(c[3] for c in cur) - 2:
            rows.append(sorted(cur, key=lambda c: c[0]))
            cur = []
        cur.append(b)
    if cur:
        rows.append(sorted(cur, key=lambda c: c[0]))
    return [b for r in rows for b in r]


def main(src, sid):
    img = Image.open(src).convert('RGB')
    px, ox, py, oy, score = snap.detect_pitch(img, lo=7.0)  # 받은 시트의 도트는 ~10px — 그 절반(5px)을 잘못 잡지 않게
    a = np.asarray(img, dtype=float)
    cuts = (snap.dp_cuts(snap._profile(a, 1), img.width, px), snap.dp_cuts(snap._profile(a, 0), img.height, py))
    small = snap.snap(img, px, ox, py, oy, 0, cuts=cuts).convert('RGBA')
    p = small.load()
    W, H = small.size
    for y in range(H):
        for x in range(W):
            c = p[x, y]
            p[x, y] = (0, 0, 0, 0) if is_key(c) else (*near(c), 255)
    mask = np.asarray(small)[:, :, 3] > 0
    boxes = order(comps(mask))
    names = NAMES[sid]
    print(f'{sid}: 칸 {px:.2f}×{py:.2f}px · 시트 {W}×{H}도트 · 덩어리 {len(boxes)} (이름 {len(names)})')
    outdir = os.path.join(ROOT, 'src', 'assets', 'ui', 'chrome', 'v2')
    os.makedirs(outdir, exist_ok=True)
    parts = []
    for i, b in enumerate(boxes):
        nm = names[i] if i < len(names) else f'{sid}-extra{i}'
        part = small.crop(b)
        part.save(os.path.join(outdir, f'{nm}.png'))
        parts.append((nm, part))
        print(f'  {nm}: {part.size[0]}×{part.size[1]}')
    sc = 4
    cw = sum(pt.width * sc + 16 for _, pt in parts) + 16
    ch = max(pt.height * sc for _, pt in parts) + 32
    chk = Image.new('RGBA', (cw, ch), (24, 23, 30, 255))
    x = 16
    for nm, pt in parts:
        big = pt.resize((pt.width * sc, pt.height * sc), Image.NEAREST)
        chk.paste(big, (x, 16), big)
        x += big.width + 16
    chk.save(os.path.join(ROOT, 'build-res', 'order', f'{sid}-check.png'))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
