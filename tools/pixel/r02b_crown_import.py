"""
받은 R-02b 종이 왕관 문장 반입 (D-423 · D-550): 파비콘 · 게임 안 작은 문장.

  python3 -I tools/pixel/r02b_crown_import.py measure   축마다 격자 실측(경계 히스토그램 + 복원 오차) — 결과를 scene_recipe.R02B_GRID에 적는다
  python3 -I tools/pixel/r02b_crown_import.py           반입 → build-res/icon-src/crown.png(투명) · crown-dark.png(어두운 바탕)
                                                         · public/ui/crown-emblem.png · 파비콘(public/favicon*.png 16 · 32 · 48 · 64)
                                                         + 대조판 build-res/order/R-02b-crown-check.png
  python3 -I tools/pixel/r02b_crown_import.py sheet <dir>  원본 · 복원 2× · 파비콘 1× / 8× · 브라우저 탭 모형

받은 원본 1254×1254는 생성기 출력 — 정사각 도트가 아니다(가로 19.60px · 세로 18.60px, 실측). 순서:
  ① 축마다 실측 격자로 칸을 나눠 칸 가운데(가장자리 1/4 버림) 최빈색 ② 문장 팔레트(≤ 12색, 청록 장식 포함)로 맞춤
  ③ 바깥 바탕 = 투명: 테두리에서 바탕색 칸만 따라 번지는 채우기(먹 외곽선이 막는다)
  ④ 외곽선 연속 검사: 그림 칸(먹 아닌 불투명)의 네 이웃 중 투명이 하나도 없어야 한다(먹이 끊긴 곳 0)
작은 크기(16 · 32 · 48px 등 원본 격자가 1배로 안 드는 곳)는 섞지 않는다: 복원 격자를 정수 블록으로 내려 블록마다 최빈색
  (먹 외곽선 · 청록 장식 · 뿔 끝은 우선 — 뿔 넷과 장식이 사라지지 않게) — `down()`.
앱 아이콘(안드로이드 런처 · 일렉트론 · 애플 터치 180 · 웹 192 · 512)은 따로 — R-02c 전용 앱 아이콘(tools/app_icon.py, D-549).
"""
import os
import sys
from collections import Counter

import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
import scene_recipe  # noqa: E402

ORDER = os.path.join(ROOT, 'build-res', 'order')
OUT = os.path.join(ROOT, 'build-res', 'icon-src')
G = scene_recipe.R02B_GRID
SRC = os.path.join(ORDER, G['source'])


def hexrgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


PAL = [hexrgb(h) for h in G['palette']]
BG = hexrgb(G['bg'])
INK = hexrgb(G['ink'])
JEWEL = hexrgb(G['jewel'])


# ---------- 실측 ----------
def _axis_err(arr, p, o):
    """한 축만 칸으로 묶고(다른 축은 1px) 칸 평균과의 RMS — 복원 오차"""
    L, n, _ = arr.shape
    idx = np.floor((np.arange(n) - o) / p).astype(int)
    idx -= idx.min()
    k = idx.max() + 1
    s = np.zeros((L, k, 3))
    s2 = np.zeros((L, k, 3))
    c = np.bincount(idx, minlength=k).astype(float)
    for j in range(k):
        m = idx == j
        s[:, j] = arr[:, m].sum(axis=1)
        s2[:, j] = (arr[:, m] ** 2).sum(axis=1)
    return float(np.sqrt((s2 - s ** 2 / np.maximum(c, 1)[None, :, None]).sum() / arr.size))


def _edge_R(a, axis, p):
    """경계 히스토그램 집중도: 강한 경계 자리 좌표를 칸 크기 p로 감은 원형 평균 길이(0 ~ 1)와 위상"""
    d = np.abs(np.diff(a, axis=axis)).sum(axis=2)
    pos = np.nonzero(d > 60)
    co = (pos[1] if axis == 1 else pos[0]) + 1
    w = d[pos]
    ang = 2 * np.pi * co / p
    C, S = (w * np.cos(ang)).sum(), (w * np.sin(ang)).sum()
    return float(np.hypot(C, S) / w.sum()), float((np.arctan2(S, C) / (2 * np.pi) * p) % p)


def measure():
    a = np.asarray(Image.open(SRC).convert('RGB'), dtype=float)
    x0, y0, x1, y1 = G['measure_box']
    box = a[y0:y1, x0:x1]
    for name, axis, arr, off in (('x', 1, box, x0), ('y', 0, box.transpose(1, 0, 2), y0)):
        print(f'[{name}] 경계 히스토그램 집중도(전체 그림)')
        for p in (18.6, 18.72, 19.0, 19.6, 39.2):
            R, ph = _edge_R(a, axis, p)
            print(f'   {p:6.2f}px  R {R:.3f}  위상 {ph:5.2f}')
        rows = []
        for p in np.arange(18.3, 19.95, 0.05):
            e, o = min((_axis_err(arr, p, o), o) for o in np.arange(0, p, 0.25))
            rows.append((e, p, (o + off) % p))
        rows.sort()
        print(f'[{name}] 복원 오차 상위: ' + ' · '.join(f'{p:.2f}px {e:.2f} (o {o:.2f})' for e, p, o in rows[:5]))
        e, p0, _ = rows[0]
        fine = []
        for p in np.arange(p0 - 0.06, p0 + 0.061, 0.01):
            e, o = min((_axis_err(arr, p, o), o) for o in np.arange(0, p, 0.25))
            fine.append((e, p, (o + off) % p))
        fine.sort()
        e, p, o = fine[0]
        print(f'[{name}] 정밀: {p:.2f}px · 위상 {o:.2f} · 오차 {e:.3f} · 칸 수 {1254 / p:.2f}')


# ---------- 반입 ----------
def near(c):
    return min(PAL, key=lambda q: (q[0] - c[0]) ** 2 * 3 + (q[1] - c[1]) ** 2 * 4 + (q[2] - c[2]) ** 2 * 2)


def restore():
    """원본 → 도트 1칸 = 1px (불투명, 팔레트 맞춤 전 최빈색 · 후 팔레트색)"""
    img = Image.open(SRC).convert('RGB')
    a = np.asarray(img)
    px, ox, nx = G['x']
    py, oy, ny = G['y']
    raw = Image.new('RGB', (nx, ny))
    out = Image.new('RGBA', (nx, ny))
    for j in range(ny):
        for i in range(nx):
            xa, xb = ox + px * i, ox + px * (i + 1)
            ya, yb = oy + py * j, oy + py * (j + 1)
            m = 0.25
            cx0, cx1 = int(round(xa + px * m)), int(round(xb - px * m))
            cy0, cy1 = int(round(ya + py * m)), int(round(yb - py * m))
            cx0, cy0 = max(cx0, 0), max(cy0, 0)
            cx1, cy1 = min(cx1, img.width), min(cy1, img.height)
            if cx1 <= cx0 or cy1 <= cy0:
                col = BG
            else:
                blk = a[cy0:cy1, cx0:cx1].reshape(-1, 3)
                q = Counter(tuple(int(v) >> 2 for v in c) for c in blk).most_common(1)[0][0]  # 6비트로 묶어 최빈
                sel = blk[np.all((blk >> 2) == q, axis=1)]
                col = tuple(int(v) for v in np.median(sel, axis=0))
            raw.putpixel((i, j), col)
            out.putpixel((i, j), (*near(col), 255))
    return img, raw, out


def clear_outside(im):
    """테두리에서 바탕색 칸만 따라 번져 투명으로 — 먹 외곽선이 막는다"""
    W, H = im.size
    q = im.load()
    seen = set()
    st = [(x, y) for x in range(W) for y in (0, H - 1)] + [(x, y) for y in range(H) for x in (0, W - 1)]
    while st:
        x, y = st.pop()
        if (x, y) in seen or not (0 <= x < W and 0 <= y < H) or q[x, y][:3] != BG:
            continue
        seen.add((x, y))
        q[x, y] = (0, 0, 0, 0)
        st += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
    return len(seen)


def outline_breaks(im):
    """먹 외곽선이 끊긴 곳: 먹이 아닌 불투명 칸이 투명 칸과 네 방향으로 맞닿은 수"""
    W, H = im.size
    q = im.load()
    bad = []
    for y in range(H):
        for x in range(W):
            c = q[x, y]
            if not c[3] or c[:3] == INK:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                u, v = x + dx, y + dy
                if not (0 <= u < W and 0 <= v < H) or not q[u, v][3]:
                    bad.append((x, y))
                    break
    return bad


def mend_outline(dots, src):
    """외곽선 끊김 메우기: 몸 칸과 네 방향으로 맞닿은 투명 칸 중, 원본의 그 칸 전체(가장자리 포함)에 먹 픽셀이
    INK_EVIDENCE 이상인 칸만 먹으로 — 생성기 격자가 국소적으로 반 칸 어긋나 먹 선이 칸 가장자리에 걸친 자리.
    근거 없는 칸은 건드리지 않는다(검사가 실패로 남는다). 반환 [(x, y, 먹 비율)]"""
    a = np.asarray(src)
    px, ox, _ = G['x']
    py, oy, _ = G['y']
    q = dots.load()
    W, H = dots.size
    fixed = []
    for x, y in outline_breaks(dots):
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            u, v = x + dx, y + dy
            if not (0 <= u < W and 0 <= v < H) or q[u, v][3]:
                continue
            x0, x1 = max(0, int(ox + px * u)), min(src.width, int(ox + px * (u + 1)))
            y0, y1 = max(0, int(oy + py * v)), min(src.height, int(oy + py * (v + 1)))
            blk = a[y0:y1, x0:x1].reshape(-1, 3).astype(int)
            frac = float((blk.sum(axis=1) < 45).mean())
            if frac >= G['ink_evidence']:
                q[u, v] = (*INK, 255)
                fixed.append((u, v, round(frac, 2)))
    return fixed


def crop(im):
    return im.crop(im.getbbox())


def tips(im, win=3):
    """뿔 끝: 열마다 맨 위 몸 칸(먹 · 투명 아닌) 높이가 좌우 win칸 안에서 가장 높은 자리 — 몸 칸 좌표 목록"""
    W, H = im.size
    q = im.load()
    top = []
    for x in range(W):
        ys = [y for y in range(H) if q[x, y][3] and q[x, y][:3] != INK]
        top.append(ys[0] if ys else H)
    out = []
    for x in range(W):
        if top[x] >= H:
            continue
        nb = [top[u] for u in range(max(0, x - win), min(W, x + win + 1)) if u != x]
        if all(top[x] <= t for t in nb) and (not out or x - out[-1][0] > win):
            out.append((x, top[x]))
    return out


def down(im, k):
    """작은 판(정수 블록 k×k, 섞지 않는다): 먹 외곽선을 떼고 몸 칸만 블록마다 최빈색 → reoutline으로 먹 1칸을 다시 두른다.
    블록에 청록 장식이 있으면 장식색, 뿔 끝 칸이 있으면 그 블록은 반드시 몸(끝 칸 색) — 뿔 넷과 장식이 사라지지 않게.
    그 밖에는 블록 절반 이상이 몸일 때만 몸."""
    W, H = im.size
    w, h = -(-W // k), -(-H // k)
    q = im.load()
    tp = {(x // k, y // k): q[x, y][:3] for x, y in tips(im)}
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    for j in range(h):
        for i in range(w):
            cols = [q[x, y][:3] for y in range(j * k, min(H, j * k + k)) for x in range(i * k, min(W, i * k + k))
                    if q[x, y][3] and q[x, y][:3] != INK]
            if JEWEL in cols:
                pick = JEWEL
            elif (i, j) in tp:
                pick = tp[(i, j)]
            elif len(cols) * 2 >= k * k:
                pick = Counter(cols).most_common(1)[0][0]
            else:
                continue
            out.putpixel((i, j), (*pick, 255))
    _connect(out, im, k)
    return out


def _connect(out, im, k):
    """떨어져 나간 몸 덩어리(뿔 끝 블록 등)를 가장 큰 덩어리에 잇는다: 원본 몸 칸이 하나라도 있는 블록만 지나는
    가장 짧은 길을 그 블록의 최빈 몸색으로 채운다 — 뿔이 떠 있는 점이 되지 않게"""
    w, h = out.size
    o = out.load()
    q = im.load()

    def body(i, j):
        return [q[x, y][:3] for y in range(j * k, min(im.height, j * k + k)) for x in range(i * k, min(im.width, i * k + k))
                if q[x, y][3] and q[x, y][:3] != INK]

    def comps():
        seen, cs = set(), []
        for j in range(h):
            for i in range(w):
                if o[i, j][3] and (i, j) not in seen:
                    st, c = [(i, j)], []
                    seen.add((i, j))
                    while st:
                        a, b = st.pop()
                        c.append((a, b))
                        for u, v in ((a + 1, b), (a - 1, b), (a, b + 1), (a, b - 1)):
                            if 0 <= u < w and 0 <= v < h and o[u, v][3] and (u, v) not in seen:
                                seen.add((u, v))
                                st.append((u, v))
                    cs.append(c)
        return sorted(cs, key=len, reverse=True)

    cs = comps()
    while len(cs) > 1:
        main_c = set(cs[0])
        start = cs[1]
        prev = {p: None for p in start}
        fr = list(start)
        hit = None
        while fr and hit is None:
            nx = []
            for a, b in fr:
                for u, v in ((a + 1, b), (a - 1, b), (a, b + 1), (a, b - 1)):
                    if not (0 <= u < w and 0 <= v < h) or (u, v) in prev or not body(u, v):
                        continue
                    prev[(u, v)] = (a, b)
                    if (u, v) in main_c:
                        hit = (u, v)
                        break
                    nx.append((u, v))
                if hit:
                    break
            fr = nx
        if hit is None:
            raise SystemExit(f'작은 판 {k}: 떨어진 덩어리를 이을 길이 없다 {start}')
        p = prev[hit]
        while p is not None and p not in start:
            o[p] = (*Counter(body(*p)).most_common(1)[0][0], 255)
            p = prev[p]
        cs = comps()


def reoutline(im):
    """작은 판: 몸 칸이 투명과 맞닿으면 그 투명 칸에 먹을 두른다(외곽선 1칸 연속) — 다시 두르기만, 섞지 않음"""
    W, H = im.size
    big = Image.new('RGBA', (W + 2, H + 2), (0, 0, 0, 0))
    big.paste(im, (1, 1))
    q = big.load()
    add = []
    for y in range(H + 2):
        for x in range(W + 2):
            if q[x, y][3]:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                u, v = x + dx, y + dy
                if 0 <= u < W + 2 and 0 <= v < H + 2 and q[u, v][3] and q[u, v][:3] != INK:
                    add.append((x, y))
                    break
    for x, y in add:
        q[x, y] = (*INK, 255)
    return crop(big)


def on_bg(art, size, k, bg=BG):
    """size×size 어두운 바탕 가운데에 art ×k (정수배, 최근접)"""
    can = Image.new('RGBA', (size, size), (*bg, 255))
    a = art.resize((art.width * k, art.height * k), Image.NEAREST)
    can.alpha_composite(a, ((size - a.width) // 2, (size - a.height) // 2))
    return can


# 파비콘: 크기 → 쓰는 판. 'full' = 복원 격자 ×k(가장 큰 정수배, 바탕 여백 ≥ 1칸), ('down', d) = d블록으로 내린 작은 판 ×1
WEB = {
    'public/favicon-16.png': 16,
    'public/favicon-32.png': 32,
    'public/favicon-48.png': 48,
    'public/favicon.png': 64,
}
# 애플 터치 180 · 웹 192 · 512 · 일렉트론 · 안드로이드 런처는 앱 아이콘(R-02c, tools/app_icon.py — D-549)


def small_for(full, size, margin):
    """size px에 바탕 여백 margin px을 두고 드는 판: 원본 격자 ×k(k ≥ 1)가 들면 그것, 아니면 가장 작은 블록 d로 내린 판 ×1"""
    k = min((size - 2 * margin) // full.width, (size - 2 * margin) // full.height)
    if k >= 1:
        return full, k, f'복원 격자 ×{k}'
    for d in range(2, 12):
        s = reoutline(down(full, d))
        if s.width <= size - 2 * margin and s.height <= size - 2 * margin:
            k = min((size - 2 * margin) // s.width, (size - 2 * margin) // s.height)
            return s, k, f'{d}칸 블록 작은 판 {s.width}×{s.height} ×{k}'
    raise SystemExit(size)


def web_icons(full):
    res = {}
    for rel, s in WEB.items():
        margin = 1 if s <= 32 else max(2, s // 16)
        art, k, what = small_for(full, s, margin)
        im = on_bg(art, s, k)
        im.convert('RGB').save(os.path.join(ROOT, rel), optimize=True)
        res[rel] = (s, what)
        print(f'{rel}  {s}px  {what}')
    return res


def main():
    os.makedirs(OUT, exist_ok=True)
    src, raw, dots = restore()
    cleared = clear_outside(dots)
    mended = mend_outline(dots, src)
    print(f'R-02b: 외곽선 메움 {len(mended)}칸 (칸, 원본 먹 비율): {mended}')
    full = crop(dots)
    breaks = outline_breaks(full)
    cols = Counter(c[:3] for c in full.getdata() if c[3])
    print(f'R-02b: 격자 {G["x"][2]}×{G["y"][2]}도트 → 왕관 {full.width}×{full.height}도트 · 색 {len(cols)}(바탕 포함 팔레트 {len(PAL)}) · '
          f'바탕 → 투명 {cleared}칸 · 외곽선 끊김 {len(breaks)}')
    for c, n in cols.most_common():
        print('   #%02X%02X%02X %d' % (*c, n))
    if breaks:
        raise SystemExit(f'외곽선 끊김: {breaks[:10]}')
    full.save(os.path.join(OUT, 'crown.png'))
    dark = Image.new('RGBA', (full.width + 4, full.height + 4), (*BG, 255))
    dark.alpha_composite(full, (2, 2))
    dark.save(os.path.join(OUT, 'crown-dark.png'))
    full.save(os.path.join(ROOT, 'public', 'ui', 'crown-emblem.png'), optimize=True)
    web_icons(full)
    # 대조판: 원본 축소 | 복원(같은 크기, 최근접) | 복원 칸 경계를 원본 위에
    S = 600
    chk = Image.new('RGB', (S * 2 + 30, S + 20), (60, 60, 70))
    chk.paste(src.resize((S, S), Image.LANCZOS), (10, 10))
    rec = dots.copy()
    base = Image.new('RGBA', rec.size, (*BG, 255))
    base.alpha_composite(rec)
    chk.paste(base.resize((S, S), Image.NEAREST), (S + 20, 10))
    chk.save(os.path.join(ORDER, 'R-02b-crown-check.png'))


def sheet(outdir):
    """원본 vs 복원 2× · 파비콘 1× / 8× · 브라우저 탭 모형"""
    os.makedirs(outdir, exist_ok=True)
    full = Image.open(os.path.join(OUT, 'crown.png')).convert('RGBA')
    src = Image.open(SRC).convert('RGB')
    pane = (0x3A, 0x36, 0x44)
    # 1) 원본 | 복원 ×2 (같은 비율 비교를 위해 원본은 복원 전체 캔버스 크기 ×10 으로)
    px, ox, nx = G['x']
    py, oy, ny = G['y']
    rec = Image.open(os.path.join(OUT, 'crown-dark.png')).convert('RGBA')
    a = src.resize((627, 627), Image.LANCZOS)
    b2 = full.resize((full.width * 2, full.height * 2), Image.NEAREST)
    b10 = rec.resize((rec.width * 10, rec.height * 10), Image.NEAREST)
    W = 627 + b10.width + b2.width + 80
    H = max(627, b10.height) + 40
    s1 = Image.new('RGBA', (W, H), (*pane, 255))
    d = ImageDraw.Draw(s1)
    s1.paste(a, (20, 20))
    d.text((20, 4), 'original 1254 (1/2)', fill=(230, 226, 220))
    s1.alpha_composite(b10, (667, 20))
    d.text((667, 4), f'restored {full.width}x{full.height} dots x10 (on bg)', fill=(230, 226, 220))
    s1.alpha_composite(b2, (687 + b10.width, 20))
    d.text((687 + b10.width, 4), 'x2 alpha', fill=(230, 226, 220))
    s1.save(os.path.join(outdir, '1-original-vs-restored.png'))
    # 2) 파비콘 1× / 8×
    sizes = [(rel, s) for rel, s in WEB.items()]
    ims = [(Image.open(os.path.join(ROOT, rel)).convert('RGBA'), s) for rel, s in sizes]
    W = sum(max(s * (8 if s <= 64 else 1), 40) + 24 for _, s in sizes) + 24
    s2 = Image.new('RGBA', (W, 192 + 512 + 80), (*pane, 255))
    d = ImageDraw.Draw(s2)
    x = 20
    for im, s in ims:
        s2.alpha_composite(im, (x, 24))
        d.text((x, 6), f'{s} 1x', fill=(230, 226, 220))
        if s <= 64:
            z = im.resize((s * 8, s * 8), Image.NEAREST)
            s2.alpha_composite(z, (x, 240))
            d.text((x, 222), f'{s} x8', fill=(230, 226, 220))
        x += max(s * (8 if s <= 64 else 1), 40) + 24
    s2 = s2.crop((0, 0, x, 240 + 512 + 20))
    s2.save(os.path.join(outdir, '2-favicons-1x-8x.png'))
    # 3) 브라우저 탭 모형 (실제 크기 + ×3 확대본) — 밝은 탭 · 어두운 탭
    def tab(light):
        bar = (222, 225, 230) if light else (32, 33, 36)
        act = (255, 255, 255) if light else (53, 54, 58)
        txt = (32, 33, 36) if light else (232, 234, 237)
        t = Image.new('RGBA', (420, 44), (*bar, 255))
        dd = ImageDraw.Draw(t)
        dd.rectangle((8, 8, 228, 43), fill=(*act, 255))
        fav = Image.open(os.path.join(ROOT, 'public', 'favicon-16.png')).convert('RGBA')
        t.alpha_composite(fav, (18, 18))
        dd.text((42, 19), 'Pawnisher : Checkmate', fill=txt)
        dd.rectangle((236, 8, 412, 43), fill=(*bar, 255))
        dd.text((262, 19), 'New Tab', fill=txt)
        return t
    tl, td = tab(True), tab(False)
    s3 = Image.new('RGBA', (420 * 3 + 40, 44 * 2 + 44 * 3 * 2 + 70), (*pane, 255))
    s3.alpha_composite(tl, (20, 10))
    s3.alpha_composite(td, (20, 60))
    s3.alpha_composite(tl.resize((1260, 132), Image.NEAREST), (20, 115))
    s3.alpha_composite(td.resize((1260, 132), Image.NEAREST), (20, 255))
    s3.save(os.path.join(outdir, '3-browser-tab.png'))
    print('sheet ->', outdir)


if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == 'measure':
        measure()
    elif len(sys.argv) > 2 and sys.argv[1] == 'sheet':
        sheet(sys.argv[2])
    else:
        main()
