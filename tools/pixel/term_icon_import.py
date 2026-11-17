"""
용어 아이콘 시트 TI-01 · TI-02 반입 (D-423 · D-507, 발주 asset-order-master §0-D 9위).

  python3 -I tools/pixel/term_icon_import.py [TI-01 TI-02] [--dry]

받은 시트는 발주 격자(168×88 도트 · 8배 · 칸 사이 8도트)가 아니라 약 1732×908에 아이콘 8개가 4×2로 놓였고
도트 간격도 아이콘마다 9~11px로 흔들린다 → 시트 격자를 믿지 않고 아이콘마다 따로:
  ① 칸 = 시트를 4×2로 나눈 영역, 그 안의 「마젠타가 아닌」 덩어리 상자(작은 티끌 제외)
  ② 상자의 긴 변을 FIT(30)칸으로 — 정사각 칸, 비율 그대로(늘리지 않는다, D-386). 칸 가운데 60% 중앙값 색, 마젠타가 반 넘으면 투명
  ③ 팔레트 = 발주 15색 + 우리 아이콘 팔레트(icon_sheets.PALETTE — 나무 · 불 · 보라 …)에서 가장 가까운 색
  ④ 둘레에 먹 #0B0B0E 한 겹 더 → 받은 1도트 선이 2도트 (D-291 · D-301) → 32×32 정중앙
  ⑤ tools/pixel/icons32/<키>.png · icons32_ext/<키>.png · public/ui/icons16/<키>.png(+@16) — icons16.py export · icons32.py build가 그대로 쓴다
상태 그림(다듬기 — 새 그림이 아니라 받은 그림의 색만 바꾼다):
  life.crack   = 버팀을 쓴 칸: 청록 유리를 먹 · 검은 쇠로 끄고 몸을 한 단 어둡게
  heartCog.crack = 금 간 심장 톱니: 불씨를 끄고(먹) 몸을 한 단 어둡게 + 가운데 세로 금 한 줄(먹, 계단)
  heart        = 옛 life(하트 + 톱니) 그대로 보존 — HP 표지(반장 등장 판 HP)에 쓴다. 버팀 · 심장 톱니와 겹치지 않게
비교판: production/qa/evidence/2026-11-14-imp-<시트>.png (원본 칸 | 지금 | 반입 4배 | 16칸 4배)
"""
import os
import shutil
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
import icon_sheets  # noqa: E402
from icon_sheet_import import small  # noqa: E402

KEYS = {
    'TI-01': ['key', 'life', 'heartCog', 'charm', 'vent', 'chain', 'signAdd', 'signMul'],
    'TI-02': ['reserve', 'partBelt', 'quirk', 'counter', 'gearShock', 'stun', 'promote', 'speed'],
}
SPEC15 = ['#0B0B0E', '#33313B', '#56545E', '#8A8794', '#8A6416', '#C89B3C', '#F5C542', '#8E877A', '#BFB9AD', '#F1EDE4',
          '#7A1218', '#E5262F', '#FF7B7B', '#1F8A7A', '#5EEAD4']
FIT = 30
N = 32
INK = (11, 11, 14)


def hexrgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


PAL = np.array(sorted({hexrgb(h) for h in SPEC15} | {hexrgb(h) for _, cs in icon_sheets.PALETTE for h in cs}), dtype=np.int32)


def keymask(a):
    r, g, b = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int)
    return (r > 150) & (b > 150) & (g < 130) & (np.abs(r - b) < 90)


def near(c):
    d = (((PAL - np.array(c)) ** 2) * np.array([3, 4, 2])).sum(-1)
    return tuple(int(v) for v in PAL[d.argmin()])


def icon_box(a, x0, y0, x1, y1):
    """칸 안 물건 상자 — 줄 · 열마다 물건 칸이 6px 넘는 곳만(티끌 제외)"""
    m = ~keymask(a[y0:y1, x0:x1])
    m[:, :8] = m[:, -8:] = False  # 칸 경계 8px 안은 이웃 아이콘 몫(경보 · 속전의 관이 경계에 닿는다)
    m[:8, :] = m[-8:, :] = False
    rows = np.nonzero(m.sum(1) > 6)[0]
    cols = np.nonzero(m.sum(0) > 6)[0]
    return x0 + cols.min(), y0 + rows.min(), x0 + cols.max() + 1, y0 + rows.max() + 1


def sample(a, box):
    bx0, by0, bx1, by1 = box
    side = max(bx1 - bx0, by1 - by0)
    p = side / FIT
    cols, rows = max(1, round((bx1 - bx0) / p)), max(1, round((by1 - by0) / p))
    out = Image.new('RGBA', (cols, rows), (0, 0, 0, 0))
    km = keymask(a)
    for j in range(rows):
        for i in range(cols):
            xa, xb = int(bx0 + (i + 0.2) * p), int(bx0 + (i + 0.8) * p) + 1
            ya, yb = int(by0 + (j + 0.2) * p), int(by0 + (j + 0.8) * p) + 1
            blk, kb = a[ya:yb, xa:xb].reshape(-1, 3), km[ya:yb, xa:xb].ravel()
            keep = blk[~kb]
            if len(keep) < len(blk) / 2:
                continue
            out.putpixel((i, j), near(np.median(keep, axis=0)) + (255,))
    return out, p


def ring(icn):
    """둘레 먹 한 겹 → N×N 정중앙"""
    w, h = icn.size
    big = Image.new('RGBA', (w + 2, h + 2), (0, 0, 0, 0))
    big.alpha_composite(icn, (1, 1))
    px = big.load()
    src = big.copy().load()
    for y in range(h + 2):
        for x in range(w + 2):
            if src[x, y][3]:
                continue
            if any(0 <= x + dx < w + 2 and 0 <= y + dy < h + 2 and src[x + dx, y + dy][3] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                px[x, y] = INK + (255,)
    crop = big.crop(big.getbbox())
    out = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    out.paste(crop, ((N - crop.width) // 2, (N - crop.height) // 2), crop)
    return out


def darker(c):
    """같은 재질 한 단 아래 (팔레트 안에서 같은 색상 계열의 더 어두운 색). 붉은 칠은 진홍 계단 안에서만"""
    r, g, b = c
    if r > g + 60 and r > b + 60:
        return (0x7A, 0x12, 0x18) if r > 0x90 else (0x33, 0x31, 0x3B)
    cand = [tuple(int(v) for v in p) for p in PAL if sum(p) < r + g + b - 30]
    if not cand:
        return INK
    return min(cand, key=lambda p: (p[0] - r * 0.7) ** 2 + (p[1] - g * 0.7) ** 2 + (p[2] - b * 0.7) ** 2)


def state(icn, kill, crack=False):
    """상태 그림: kill(rgb→bool) 색은 먹 · 검은 쇠로, 나머지 몸은 한 단 어둡게 (먹 · 바깥선 그대로)"""
    out = icn.copy()
    px = out.load()
    for y in range(N):
        for x in range(N):
            c = px[x, y]
            if not c[3] or c[:3] == INK:
                continue
            px[x, y] = ((0x33, 0x31, 0x3B) if kill(c[:3]) else darker(c[:3])) + (255,)
    if crack:
        box = out.getbbox()
        cx = (box[0] + box[2]) // 2
        x = cx
        for y in range(box[1] + 2, box[3] - 2):
            if (y - box[1]) % 4 == 0:
                x += 1 if ((y - box[1]) // 4) % 2 == 0 else -1
            for xx in (x, x + 1):  # 2도트 굵기 — 16칸으로 줄여도 금이 남는다
                if px[xx, y][3]:
                    px[xx, y] = INK + (255,)
    return out


def save(k, icn, dry):
    dst = os.path.join(ROOT, 'public', 'ui', 'icons16', f'{k}.png')
    if dry:
        return
    for d in (os.path.join(HERE, 'icons32'), os.path.join(HERE, 'icons32_ext')):
        icn.save(os.path.join(d, f'{k}.png'))
    icn.save(dst)
    small(icn).save(dst.replace('.png', '@16.png'))


def main(sid, dry):
    src = os.path.join(ROOT, 'build-res', 'order', f'{sid}-source.png')
    a = np.asarray(Image.open(src).convert('RGB'))
    H, W = a.shape[:2]
    keys = KEYS[sid]
    if sid == 'TI-01' and not dry and not os.path.exists(os.path.join(HERE, 'icons32', 'heart.png')):
        # 옛 life(하트 + 톱니)를 heart로 보존 — HP 표지
        for d in ('icons32', 'icons32_ext'):
            shutil.copy(os.path.join(HERE, d, 'life.png'), os.path.join(HERE, d, 'heart.png'))
        for suf in ('', '@16'):
            shutil.copy(os.path.join(ROOT, 'public/ui/icons16', f'life{suf}.png'), os.path.join(ROOT, 'public/ui/icons16', f'heart{suf}.png'))
    T = 128
    chk = Image.new('RGB', (4 * (T * 3 + 24) + 8, 2 * (T + 8) + 8), (24, 23, 30))
    made = {}
    for i, k in enumerate(keys):
        cx, cy = i % 4, i // 4
        box = icon_box(a, W * cx // 4, H * cy // 2, W * (cx + 1) // 4, H * (cy + 1) // 2)
        raw, p = sample(a, box)
        icn = ring(raw)
        made[k] = icn
        x = 8 + cx * (T * 3 + 24)
        y = 8 + cy * (T + 8)
        crop = Image.fromarray(a[box[1]:box[3], box[0]:box[2]])
        s = T / max(crop.size)
        chk.paste(crop.resize((max(1, round(crop.width * s)), max(1, round(crop.height * s))), Image.NEAREST), (x, y))
        now = os.path.join(ROOT, 'public', 'ui', 'icons16', f'{k}.png')
        big = icn.resize((T, T), Image.NEAREST)
        chk.paste(big, (x + T + 8, y), big)
        sm = small(icn).resize((T // 2, T // 2), Image.NEAREST)
        chk.paste(sm, (x + 2 * T + 16, y), sm)
        print(f'{k:10} box={box} pitch={p:.2f}px cells={raw.size} colors={len(icn.getcolors(4096))}{" (덮어씀)" if os.path.exists(now) else ""}')
        save(k, icn, dry)
    if sid == 'TI-01':
        teal = lambda c: c[1] > c[0] + 40 and c[2] > c[0] + 30  # noqa: E731
        fire = lambda c: c[0] > 200 and c[1] > 120  # noqa: E731
        save('life.crack', state(made['life'], teal), dry)
        save('heartCog.crack', state(made['heartCog'], fire, crack=True), dry)
    ev = os.path.join(ROOT, 'production', 'qa', 'evidence', f'2026-11-14-imp-{sid.lower()}.png')
    chk.save(ev)
    print(ev)


if __name__ == '__main__':
    ids = [x for x in sys.argv[1:] if not x.startswith('--')] or list(KEYS)
    for sid in ids:
        main(sid, '--dry' in sys.argv)
