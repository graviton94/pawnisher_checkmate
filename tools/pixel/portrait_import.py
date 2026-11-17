"""
대사 초상 시트 반입 (D-423 · 2026-11-14 PT-04~07): 받은 초상 시트 → 칸마다 64×64 도트 PNG.
  ① 마젠타 바탕 → 투명, 세로 마젠타 띠로 시트를 초상 하나씩 나눈다
  ② 초상마다 숨은 격자 복원 — 칸 크기는 scene_recipe.PORTRAIT_GRID(실측 수동값), 칸 경계는 snap.dp_cuts가 흔들림을 따라간다
  ③ 칸마다 가운데 영역을 발주 팔레트 24색으로 맞춘 뒤 최빈색(먹은 30% 넘으면 먹 — 2도트 외곽선이 끊기지 않게)
  ④ 64×64로 자른다(늘이지 않는다, D-386): 위는 실루엣 꼭대기 + 여백 1칸, 가로는 위쪽 64줄 실루엣의 가운데. 아래는 칸 밑변에 잘린다(바스트)
  ⑤ 원본 vs 결과 4배 대조판 → production/qa/evidence/2026-11-14-pt-<번호>.png
사용: python3 -I tools/pixel/portrait_import.py [PT-04 ...]      (인자 없으면 PORTRAIT_GRID 전부)
      python3 -I tools/pixel/portrait_import.py measure PT-05     (초상마다 격자 후보만 출력)
"""
import os
import sys
from collections import Counter

import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
from scene_recipe import PORTRAIT_GRID  # noqa: E402
from snap import _profile, detect_pitch, dp_cuts  # noqa: E402

N = 64
# §0-D 「도트 강제」 고정 팔레트 24색 (발주서 PT-04~07 그대로)
PAL = [tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for h in (
    '#0B0B0E #17171E #24232B #33313B #56545E #8A8794 #F1EDE4 #BFB9AD #8E877A #201C1A #3A2D26 #5C4030 '
    '#80553A #A4774B #4A3414 #8A6416 #C89B3C #F5C542 #7A1218 #B63735 #1F3544 #3F5968 #7E929B #38BFC7').split()]
INK = PAL[0]


def lab(a):
    """sRGB 0~255 배열 → CIELAB (팔레트 맞춤 거리용 — 보라 끼 도는 쇠 회색이 갈색으로 빠지지 않게)"""
    c = a.astype(float) / 255
    c = np.where(c > 0.04045, ((c + 0.055) / 1.055) ** 2.4, c / 12.92)
    xyz = c @ np.array([[0.4124, 0.2126, 0.0193], [0.3576, 0.7152, 0.1192], [0.1805, 0.0722, 0.9505]])
    xyz /= np.array([0.9505, 1.0, 1.089])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)


PAL_LAB = lab(np.array(PAL))


def is_bg(a):
    """마젠타(번진 자주 포함) 바탕 판정 — 배열 RGB → bool"""
    r, g, b = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int)
    return (r > 150) & (b > 150) & (g < 110) & (np.abs(r - b) < 90)


def snap_pal(a, allow=None):
    """RGB 배열 → 팔레트 번호 배열 (CIELAB 거리). allow = 쓸 수 있는 번호(시트마다 재질에 맞게 — scene_recipe 'drop')"""
    d = ((lab(a)[..., None, :] - PAL_LAB) ** 2).sum(-1)
    if allow is not None:
        d[..., [k for k in range(len(PAL)) if k not in allow]] = 1e9
    return d.argmin(-1)


def blobs(a):
    """세로 마젠타 띠로 나뉜 초상 덩어리들의 (x0, x1, y0, y1)"""
    bg = is_bg(a)
    cols = (~bg).sum(0) > 3
    runs, s = [], None
    for x, v in enumerate(list(cols) + [False]):
        if v and s is None:
            s = x
        elif not v and s is not None:
            if x - s > 40:
                runs.append((s, x))
            s = None
    out = []
    for x0, x1 in runs:
        rows = np.where((~bg[:, x0:x1]).sum(1) > 2)[0]
        out.append((x0, x1, int(rows.min()), int(rows.max()) + 1))
    return out


def restore(a, box, pitch, allow=None):
    """덩어리 하나를 원래 도트 격자로 — 반환 RGBA 배열(칸 하나 = 1px)"""
    x0, x1, y0, y1 = box
    m = 12  # 경계 칸을 놓치지 않게 바탕 여백을 붙여 자른다
    x0, y0 = max(0, x0 - m), max(0, y0 - m)
    x1, y1 = min(a.shape[1], x1 + m), min(a.shape[0], y1 + m)
    c = a[y0:y1, x0:x1]
    xs = dp_cuts(_profile(c.astype(float), 1), c.shape[1], pitch)
    ys = dp_cuts(_profile(c.astype(float), 0), c.shape[0], pitch)
    out = np.zeros((len(ys) - 1, len(xs) - 1, 4), dtype=np.uint8)
    for j in range(len(ys) - 1):
        for i in range(len(xs) - 1):
            ax, bx, ay, by = xs[i], xs[i + 1], ys[j], ys[j + 1]
            ix, iy = max(1, int((bx - ax) * 0.2)), max(1, int((by - ay) * 0.2))
            cell = c[ay + iy:max(ay + iy + 1, by - iy), ax + ix:max(ax + ix + 1, bx - ix)].reshape(-1, 3)
            bgm = is_bg(cell)
            if bgm.mean() > 0.5:
                continue
            idx = snap_pal(cell[~bgm], allow)
            cnt = Counter(idx.tolist())
            k = 0 if cnt.get(0, 0) >= 0.3 * len(idx) else cnt.most_common(1)[0][0]
            out[j, i] = (*PAL[k], 255)
    return out


def frame64(g):
    """복원 격자 → 64×64 (늘이지 않고 자른다). 위 여백 1칸 · 가로는 위쪽 64줄 실루엣 가운데"""
    op = g[..., 3] > 0
    rows = np.where(op.any(1))[0]
    top = max(0, rows.min() - 1)
    if rows.max() + 1 - top < N:  # 64칸보다 작은 초상(적 폰 52칸)은 밑변에 붙인다 — 몸은 시트 밑변에서 잘려 왔다
        top = rows.max() + 1 - N
    part = op[top:top + N]
    cols = np.where(part.any(0))[0]
    cx = (cols.min() + cols.max() + 1) / 2
    left = int(round(cx - N / 2))
    out = np.zeros((N, N, 4), dtype=np.uint8)
    for j in range(N):
        for i in range(N):
            y, x = top + j, left + i
            if 0 <= y < g.shape[0] and 0 <= x < g.shape[1]:
                out[j, i] = g[y, x]
    return out


def clean(o):
    """외톨이 칸(이웃 8칸에 같은 색이 없고 불투명 이웃이 2칸 이하) 지우기 — 바탕 번짐 찌꺼기"""
    h, w = o.shape[:2]
    res = o.copy()
    for y in range(h):
        for x in range(w):
            if o[y, x, 3] == 0:
                continue
            nb = [(y + dy, x + dx) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if (dy or dx) and 0 <= y + dy < h and 0 <= x + dx < w]
            if sum(o[p][3] > 0 for p in nb) <= 2:
                res[y, x] = 0
    return res


def compare(sheet, srcs, outs, names, dst):
    """원본(덩어리를 64칸 높이에 맞춰 축소) vs 결과 4배 — 위아래 두 줄"""
    S = N * 4
    W = len(outs) * (S + 16) + 16
    pad = 22
    board = Image.new('RGB', (W, S * 2 + pad * 2 + 24), (22, 20, 28))
    d = ImageDraw.Draw(board)
    for k, (src, o, nm) in enumerate(zip(srcs, outs, names)):
        x = 16 + k * (S + 16)
        s = src.copy()
        s.thumbnail((S, S), Image.NEAREST)
        board.paste(s, (x + (S - s.width) // 2, pad))
        im = Image.fromarray(o, 'RGBA').resize((S, S), Image.NEAREST)
        chk = Image.new('RGB', (S, S), (60, 56, 70))
        cd = ImageDraw.Draw(chk)
        for yy in range(0, S, 16):
            for xx in range(0, S, 16):
                if (xx // 16 + yy // 16) % 2:
                    cd.rectangle((xx, yy, xx + 15, yy + 15), fill=(44, 40, 52))
        chk.paste(im, (0, 0), im)
        board.paste(chk, (x, pad * 2 + S))
        d.text((x, 4), f'{sheet} source - {nm}', fill=(230, 226, 214))
        d.text((x, pad * 2 + S * 2 + 4), 'result 64x64 x4', fill=(230, 226, 214))
    board.save(dst)


def run(sheet):
    spec = PORTRAIT_GRID[sheet]
    src = os.path.join(ROOT, 'build-res', 'order', f'{sheet}-source.png')
    im = Image.open(src).convert('RGB')
    a = np.asarray(im)
    bx = blobs(a)
    assert len(bx) == len(spec['names']), f'{sheet}: 덩어리 {len(bx)}개 ≠ 이름 {len(spec["names"])}개'
    outs, srcs = [], []
    os.makedirs(os.path.join(ROOT, 'public', 'ui', 'portraits'), exist_ok=True)
    drops = spec.get('drop', [[]] * len(bx))
    for box, name, pitch, drop in zip(bx, spec['names'], spec['pitch'], drops):
        allow = [k for k in range(len(PAL)) if '#%02X%02X%02X' % PAL[k] not in drop]
        g = restore(a, box, pitch, allow)
        o = clean(frame64(g))
        outs.append(o)
        srcs.append(im.crop((box[0], box[2], box[1], box[3])))
        dst = os.path.join(ROOT, 'public', 'ui', 'portraits', f'{name}.png')
        Image.fromarray(o, 'RGBA').save(dst)
        cols = len({tuple(p) for p in o.reshape(-1, 4) if p[3]})
        print(f'{dst}  격자 {g.shape[1]}×{g.shape[0]} (간격 {pitch}px) → 64×64 · {cols}색')
    ev = os.path.join(ROOT, 'production', 'qa', 'evidence', f'2026-11-14-pt-{sheet[3:]}.png')
    compare(sheet, srcs, outs, spec['names'], ev)
    print(ev)


def measure(sheet):
    a = np.asarray(Image.open(os.path.join(ROOT, 'build-res', 'order', f'{sheet}-source.png')).convert('RGB'))
    for box in blobs(a):
        c = Image.fromarray(a[box[2]:box[3], box[0]:box[1]])
        print(box, [round(float(v), 2) for v in detect_pitch(c, lo=4.0, hi=13.0, fine=True)])


if __name__ == '__main__':
    args = sys.argv[1:]
    if args[:1] == ['measure']:
        for s in args[1:]:
            measure(s)
    else:
        for s in args or list(PORTRAIT_GRID):
            run(s)
