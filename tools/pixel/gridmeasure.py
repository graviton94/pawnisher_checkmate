"""
원본 도트 격자 실측 — 반입 도구 공용 (D-423 · D-552).

캔버스 크기에서 칸 크기를 「맞추지」 않는다(예: 상자 폭 ÷ 32). 받은 원본의 도트 간격을 축마다 따로 잰다:
  ① 경계 세기 곡선(가로 · 세로) → 임의 주기 DFT로 후보(가장 센 주기와 그 2 · 3 · 4배)
  ② 후보마다 1차원 복원 오차(각 픽셀을 제 칸 가운데 픽셀로 바꿨을 때의 차이, 가장 좋은 시작점)로 가린다
  ③ 존재 점수 = 어긋난 간격(×0.90 · 0.94 · 1.06 · 1.10)의 오차 ÷ 그 간격의 오차 — 1.06 이상이어야 진짜 격자
  ④ P/2 · P/3도 같은 방식으로 재서 더 잘게 찍힌 도트(존재 ≥ 1.06이고 오차가 12% 넘게 낮다)면 그쪽을 고른다
  ⑤ 셋으로 나눠 다시 재 흔들림(drift)을 기록한다 — 흔들리면 실측 간격은 고정하고 창마다 시작점만 따라간다(tracked_cuts)
표본은 칸 가운데 영역의 최빈색(snap.snap) — 평균 · 상자 · 란초스 리샘플은 쓰지 않는다(tools/pixel/check_resample.py가 막는다).

사용:
  python3 -I tools/pixel/gridmeasure.py <원본> [--box x0,y0,x1,y1] [--lo 3] [--hi 40]   → 축별 간격 · 시작점 · 존재 · 흔들림(JSON)
"""
import json
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import snap  # noqa: E402

PRESENCE_MIN = 1.06
DESCEND_MIN = 1.05


def _profile(a, axis):
    d = np.abs(np.diff(a, axis=axis))
    if d.ndim == 3:
        d = d.sum(axis=2)
    p = (d.sum(0) if axis == 1 else d.sum(1)).astype(float)
    return p - p.mean()


def _spectrum(p, periods):
    x = np.arange(len(p)) + 1.0
    out = np.empty(len(periods), complex)
    for i in range(0, len(periods), 256):
        P = periods[i:i + 256]
        out[i:i + 256] = (np.exp(-2j * np.pi * np.outer(1 / P, x)) * p).sum(1)
    return out


def _axis_err(g, axis, P, ph):
    """1차원 복원 오차: 각 픽셀을 간격 P · 시작 ph 격자의 제 칸 가운데 픽셀로 바꿨을 때 평균 차이"""
    n = g.shape[1] if axis == 1 else g.shape[0]
    x = np.arange(n)
    c = np.floor((x - ph) / P)
    ctr = np.clip(np.round(ph + (c + 0.5) * P - 0.5).astype(int), 0, n - 1)
    return float(np.abs((g[:, ctr] if axis == 1 else g[ctr]) - g).mean())


def _best_phase(g, axis, P, steps=16):
    return min((_axis_err(g, axis, P, ph), ph) for ph in np.linspace(0, P, steps, endpoint=False))


def _refine(g, axis, c, span=0.015, step=0.0025, steps=12):
    return min((_best_phase(g, axis, q, steps), q) for q in np.arange(c * (1 - span), c * (1 + span), c * step))


def _presence(g, axis, P, e):
    det = np.mean([_best_phase(g, axis, P * f, 12)[0] for f in (0.9, 0.94, 1.06, 1.1)])
    return float(det / max(e, 1e-6))


def _finish(sub, axis, n, P, pres, subs, P0, how):
    (e, ph), P = _refine(sub, axis, P, span=0.01, step=0.001, steps=16)
    e, ph = min((_axis_err(sub, axis, P, t), t) for t in np.linspace(0, P, 48, endpoint=False))
    thirds = []
    for t in range(3):
        s, e2 = int(n * t / 3), int(n * (t + 1) / 3)
        seg = sub[:, s:e2] if axis == 1 else sub[s:e2]
        thirds.append(round(float(_refine(seg, axis, P, span=0.03, step=0.003)[1]), 3))
    drift = (max(thirds) - min(thirds)) / P
    return {'pitch': round(float(P), 3), 'phase': round(float(ph), 2), 'err': round(e, 2), 'presence': round(pres, 3),
            'spectral_top': round(P0, 2), 'cands': subs, 'thirds': thirds, 'drift': round(float(drift), 4),
            'grid': bool(pres >= PRESENCE_MIN or (how.startswith('presence-max/') and pres >= DESCEND_MIN)), 'how': how}


def measure_axis(rgb, gray, axis, lo=3.0, hi=40.0, prefer=None):
    """한 축의 도트 간격 · 시작점 · 존재 점수 · 세 토막 흔들림.
    후보 = 스펙트럼 최고 주기 P0의 1/4 · 1/3 · 1/2 · 1 · 2 · 3 · 4배(+ 설계값 근처 봉우리). 각 후보를 복원 오차로 다듬고,
    존재 점수(어긋난 간격 오차 ÷ 제 간격 오차)가 가장 높은 것을 고른다 — 잘게 쪼갠 가짜 격자(P/2 · P/3)는 오차는 낮아도
    어긋나도 오차가 그대로라 존재가 1.0 근처로 떨어지고, 굵은 배수(2P)는 칸 안 변화 때문에 오차가 커져 존재가 낮다."""
    n = gray.shape[1] if axis == 1 else gray.shape[0]
    hi = min(hi, n / 4)
    sub = gray[::3] if axis == 1 else gray[:, ::3]
    prof = _profile(rgb, axis)
    periods = np.arange(lo, hi, 0.01)
    mag = np.abs(_spectrum(prof, periods))
    P0 = float(periods[int(mag.argmax())])
    cands = {round(P0 * m, 3) for m in (0.25, 1 / 3, 0.5, 1, 2, 3, 4) if lo <= P0 * m < hi}
    if prefer and lo <= prefer < hi:
        sel = np.abs(periods - prefer) < prefer * 0.08
        if sel.any():
            cands.add(round(float(periods[sel][mag[sel].argmax()]), 3))
    res = {}
    for c in sorted(cands):
        (e, _), q = _refine(sub, axis, c)
        res[round(float(q), 3)] = {'err': round(e, 2), 'presence': round(_presence(sub, axis, q, e), 3)}
    P = max(res, key=lambda q: (res[q]['presence'], -res[q]['err']))
    how = 'presence-max'
    coarse = P
    # P/2 · P/3 점검: 생성기는 2×2 덩어리 디더를 많이 그려 2P의 존재가 가장 높게 나오기 쉽다.
    # 더 잘게 나눈 간격도 격자로 존재하고(≥ DESCEND_MIN) 복원 오차가 25% 넘게 낮으면 그쪽이 진짜 한 도트다.
    descended = True
    while descended:
        descended = False
        for k in (2, 3):
            q = P / k
            if q < lo:
                continue
            (ek, _), qk = _refine(sub, axis, q)
            pk = _presence(sub, axis, qk, ek)
            res[round(float(qk), 3)] = {'err': round(ek, 2), 'presence': round(pk, 3)}
            if pk >= DESCEND_MIN and ek < res[P]['err'] * 0.75:
                P, how, descended = round(float(qk), 3), f'presence-max/{k}', True
                break
    r = _finish(sub, axis, n, P, res[P]['presence'], res, P0, how)
    r['coarse'] = coarse
    r['_ctx'] = (sub, axis, n, res, P0)
    return r


def measure(img, box=None, lo=3.0, hi=40.0, prefer=None, bg=None):
    """원본(또는 상자)의 x · y 도트 간격 실측. bg=(r,g,b)면 그 키색 배경을 검게 눌러 경계가 배경에 끌리지 않게 한다.
    한 축만 격자가 보이면(존재 < 1.06) 다른 축 간격 ±4% 안에서 그 축을 다시 잰다(도트는 거의 정사각) — how='from-other'."""
    im = img.convert('RGBA')
    if box:
        im = im.crop(box)
    a = np.asarray(im, dtype=float)
    rgb = a[:, :, :3] * (a[:, :, 3:4] / 255.0)
    if bg is not None:
        key = (np.abs(a[:, :, :3] - np.array(bg, float)).sum(2) < 60)
        rgb[key] = 0
    gray = rgb.mean(2)
    pr = prefer if isinstance(prefer, (tuple, list)) else (prefer, prefer)
    out = {'size': list(im.size), 'box': list(box) if box else None,
           'x': measure_axis(rgb, gray, 1, lo, hi, pr[0]), 'y': measure_axis(rgb, gray, 0, lo, hi, pr[1])}
    # 두 축이 2배로 갈리면(한 축만 P/2로 내려감) 내려가기 전 굵은 간격으로 되돌린다 — 도트는 거의 정사각이다
    for k, o in (('x', 'y'), ('y', 'x')):
        r, q = out[k], out[o]
        if r['how'].startswith('presence-max/') and 1.7 < q['pitch'] / r['pitch'] < 2.3 and not q['how'].startswith('presence-max/'):
            sub, axis, n, res, P0 = r['_ctx']
            out[k] = _finish(sub, axis, n, r['coarse'], res[r['coarse']]['presence'], res, P0, 'square-guard')
            out[k]['_ctx'] = r['_ctx']
    for k in ('x', 'y'):
        out[k].pop('_ctx', None)
        out[k].pop('coarse', None)
    for k, o, axis in (('x', 'y', 1), ('y', 'x', 0)):
        if not out[k]['grid'] and out[o]['grid']:
            sub = gray[::3] if axis == 1 else gray[:, ::3]
            n = gray.shape[1] if axis == 1 else gray.shape[0]
            (e, _), q = _refine(sub, axis, out[o]['pitch'], span=0.04, step=0.002)
            r = _finish(sub, axis, n, q, _presence(sub, axis, q, e), out[k]['cands'], out[k]['spectral_top'], 'from-other')
            out[k] = r
    return out


def cuts_from(n, pitch, phase):
    """시작점 phase · 간격 pitch 균일 격자의 칸 경계(0 ~ n). 가장자리 반 칸 미만 조각은 이웃 칸에 붙인다."""
    first = phase % pitch
    xs = list(np.arange(first, n, pitch))
    if not xs or xs[0] > pitch * 0.5:
        xs = [0.0] + xs
    else:
        xs[0] = 0.0
    if n - xs[-1] < pitch * 0.5 and len(xs) > 1:
        xs[-1] = float(n)
    else:
        xs.append(float(n))
    return xs


def accumulated(r, n):
    """세 토막 간격 차이가 한 토막 동안 쌓이는 어긋남(칸 단위)"""
    return r['drift'] * n / r['pitch'] / 3


def tracked_cuts(prof, n, pitch, phase, win=14, step=4, reach=0.3):
    """흔들리는 격자 따라가기: 실측 간격은 그대로 두고, 칸 {win}개 창마다 시작점 어긋남(±reach·P 안, 앞 창에서 이어서)을
    경계 세기 합이 가장 크게 찾아 칸마다 이어 붙인다. 칸 수는 실측 간격 그대로(n/P) — dp_cuts처럼 경계가 많을수록 점수가
    오르는 쪽(칸이 작아지는 쪽)으로 끌리지 않는다."""
    first = phase % pitch
    K = int(np.ceil((n - first) / pitch)) + 1
    base = first + np.arange(-1, K) * pitch  # -1칸부터
    m = len(prof)

    def at(pos):
        i = np.round(pos).astype(int) - 1
        ok = (i >= 0) & (i < m)
        return np.where(ok, prof[np.clip(i, 0, m - 1)], 0.0)

    centers, offs = [], []
    prev = 0.0
    for c in range(0, len(base), step):
        ks = base[max(0, c - win // 2):min(len(base), c + win // 2 + 1)]
        grid = np.arange(prev - reach * pitch, prev + reach * pitch + 1e-9, 0.1)
        sc = [at(ks + o).sum() for o in grid]
        prev = float(grid[int(np.argmax(sc))])
        centers.append(c)
        offs.append(prev)
    offs = np.array(offs)
    if len(offs) >= 3:  # 튀는 창 하나는 이웃 중앙값으로
        med = offs.copy()
        for i in range(1, len(offs) - 1):
            med[i] = np.median(offs[i - 1:i + 2])
        offs = med
    pos = base + np.interp(np.arange(len(base)), centers, offs)
    xs = [float(v) for v in pos if 0 < v < n]
    if not xs or xs[0] > pitch * 0.5:
        xs = [0.0] + xs
    else:
        xs[0] = 0.0
    if n - xs[-1] < pitch * 0.5 and len(xs) > 1:
        xs[-1] = float(n)
    else:
        xs.append(float(n))
    return xs


def axis_cuts(img, m, axis_key, drift_max=0.5):
    """실측값으로 칸 경계: 쌓이는 어긋남이 반 칸 이하면 균일 격자, 넘으면 tracked_cuts(실측 간격 고정 · 창마다 시작점만 따라감)"""
    r = m[axis_key]
    n = img.width if axis_key == 'x' else img.height
    if r['drift'] < 1.0 and accumulated(r, n) <= drift_max:
        return cuts_from(n, r['pitch'], r['phase'])
    a = np.asarray(img.convert('RGB'), dtype=float)
    return tracked_cuts(snap._profile(a, 1 if axis_key == 'x' else 0), n, r['pitch'], r['phase'])


def regrid(img, m, core=0.6, uniform=False, opaque_colors=False):
    """실측 격자로 칸마다 가운데 최빈색 → 칸 하나 = 1px (평균 없음). 반환 (작은 그림, (x 경계, y 경계))"""
    if uniform:
        xc = cuts_from(img.width, m['x']['pitch'], m['x']['phase'])
        yc = cuts_from(img.height, m['y']['pitch'], m['y']['phase'])
    else:
        xc, yc = axis_cuts(img, m, 'x'), axis_cuts(img, m, 'y')
    small = snap.snap(img, m['x']['pitch'], 0, m['y']['pitch'], 0, colors=0, core=core, cuts=(xc, yc),
                      opaque_colors=opaque_colors)
    return small, (xc, yc)


def from_recipe(g, size):
    """레시피에 남긴 값 {'x': (간격, 시작[, 'dp']), 'y': (...)} → regrid가 받는 실측 꼴"""
    m = {}
    for k in ('x', 'y'):
        v = g[k]
        m[k] = {'pitch': v[0], 'phase': v[1], 'drift': 1.0 if len(v) > 2 and v[2] == 'dp' else 0.0}
    return m


def recipe_of(m, img):
    """실측 → 레시피 값(쌓이는 어긋남이 반 칸을 넘는 축은 'dp')"""
    out = {}
    for k in ('x', 'y'):
        n = img.width if k == 'x' else img.height
        r = m[k]
        out[k] = (r['pitch'], r['phase']) + (('dp',) if accumulated(r, n) > 0.5 else ())
    return out


def short(m):
    """기록용 한 줄: x 간격/시작/존재 · y 간격/시작/존재"""
    return {k: {'pitch': m[k]['pitch'], 'phase': m[k]['phase'], 'presence': m[k]['presence'], 'drift': m[k]['drift']}
            for k in ('x', 'y')}


def compare_sheet(original, parts, window, out, zoom=4, gap=12):
    """대조판: 원본 1:1 창 | 결과들(같은 자리, 정수배 계단 확대 — 원본 창과 같은 높이에 가장 가까운 정수배).
    parts = [(이름, 그림)] — 그림은 원본 전체를 덮는 작은 그림(크기 비로 창을 옮긴다). 평균 리샘플 없음."""
    from PIL import ImageDraw
    x0, y0, x1, y1 = window
    W, H = original.size
    tiles = [('original 1:1', original.convert('RGBA').crop(window))]
    for name, im in parts:
        sx, sy = im.width / W, im.height / H
        b = (int(x0 * sx), int(y0 * sy), max(int(x0 * sx) + 1, round(x1 * sx)), max(int(y0 * sy) + 1, round(y1 * sy)))
        c = im.convert('RGBA').crop(b)
        k = max(1, round((y1 - y0) / max(1, c.height)), zoom if c.height * zoom <= (y1 - y0) * 1.5 else 1)
        tiles.append((f'{name} {im.width}x{im.height} x{k}', c.resize((c.width * k, c.height * k), Image.NEAREST)))
    Wt = sum(t.width for _, t in tiles) + gap * (len(tiles) + 1)
    Ht = max(t.height for _, t in tiles) + 30
    sheet = Image.new('RGBA', (Wt, Ht), (20, 19, 26, 255))
    d = ImageDraw.Draw(sheet)
    x = gap
    for name, t in tiles:
        bg = Image.new('RGBA', t.size, (60, 58, 70, 255))
        bg.alpha_composite(t)
        sheet.paste(bg, (x, 24))
        d.text((x, 6), name, fill=(250, 204, 21, 255))
        x += t.width + gap
    sheet.convert('RGB').save(out)
    return sheet


def merge_cell(m, body, n_max, k_max=16, tol=0.06):
    """정수 묶음 칸: 원본 몸(body = (w, h) px)을 n_max칸 안에 넣는 가장 작은 정수 k로, 칸 = k × 가로 실측 간격.
    세로도 같은 칸(비율 그대로 — 늘리지 않는다)이되, 칸 ÷ 세로 간격이 정수에서 tol 넘게 벗어나면 다음 k.
    반환 (칸 px, k, 세로 몫)"""
    px, py = m['x']['pitch'], m['y']['pitch']
    best = None
    for k in range(1, k_max + 1):
        c = k * px
        if body[0] / c > n_max or body[1] / c > n_max:
            continue
        ky = c / py
        off = abs(ky - round(ky)) / max(1, round(ky))
        if best is None:
            best = (c, k, round(ky, 3))
        if off <= tol:
            return c, k, round(ky, 3)
    return best


def fit_icon(img, m, n=32, margin=2, core=0.6, cell=None):
    """받은 아이콘 한 칸(RGBA, 투명 바탕) → n×n: 실측 도트의 정수 묶음 칸(merge_cell)으로, 칸 경계를 실측 격자선에 맞춰
    몸 상자를 덮게 깔고 칸 가운데 최빈색(snap, 불투명만) — 캔버스 ÷ n으로 칸을 맞추지 않는다. 반환 (n×n 그림, 기록)"""
    img = img.convert('RGBA')
    box = img.getchannel('A').point(lambda v: 255 if v >= 128 else 0).getbbox()
    bw, bh = box[2] - box[0], box[3] - box[1]
    if cell:
        c, k, ky = cell, round(cell / m['x']['pitch'], 3), round(cell / m['y']['pitch'], 3)
    else:
        c, k, ky = merge_cell(m, (bw, bh), n - 2 * margin)
    cuts = []
    for key, lo_, hi_, nn in (('x', box[0], box[2], img.width), ('y', box[1], box[3], img.height)):
        ph = m[key]['phase'] % m[key]['pitch']
        span = hi_ - lo_
        cells = int(np.ceil(span / c))
        # 몸 가운데에 칸 묶음 가운데를 두되 시작은 실측 격자선(ph + i·간격) 위로
        start = (lo_ + hi_) / 2 - cells * c / 2
        start = ph + round((start - ph) / m[key]['pitch']) * m[key]['pitch']
        while start > lo_:
            start -= m[key]['pitch']
        while start + cells * c < hi_:
            cells += 1
        cuts.append([float(start + i * c) for i in range(cells + 1)])
    # 캔버스 밖 칸은 투명으로 읽히게 넉넉히 덧댄다
    pad = int(np.ceil(c)) + 2
    big = Image.new('RGBA', (img.width + 2 * pad, img.height + 2 * pad), (0, 0, 0, 0))
    big.alpha_composite(img, (pad, pad))
    small = snap.snap(big, c, 0, c, 0, colors=0, core=core,
                      cuts=([v + pad for v in cuts[0]], [v + pad for v in cuts[1]]), opaque_colors=True)
    a = np.asarray(small).copy()
    a[a[:, :, 3] == 0] = 0
    small = Image.fromarray(a, 'RGBA')
    bb = small.getbbox()
    small = small.crop(bb)
    out = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    out.alpha_composite(small, ((n - small.width) // 2, (n - small.height) // 2))
    assert small.width <= n and small.height <= n, ('칸에 안 들어간다', small.size)
    return out, {'cell': round(c, 3), 'cell_over_x_pitch': k, 'cell_over_y_pitch': ky, 'body_cells': list(small.size)}


def icon_from_recipe(src_img, g, n=32, margin=2, colors=24):
    """scene_recipe.ICON_GRID 한 줄 → n×n 아이콘(원본 색 → 대표 colors색, 게임 색과 같은 집안이면 붙임). 반환 (그림, 기록)"""
    crop = g.get('crop') or (0, 0, src_img.width, src_img.height)
    cellimg = src_img.convert('RGBA').crop(crop)
    m = {'x': {'pitch': g['x'][0], 'phase': g['x'][1] - crop[0]}, 'y': {'pitch': g['y'][0], 'phase': g['y'][1] - crop[1]}}
    out, rec = fit_icon(cellimg, m, n, margin, cell=g['cell'])
    a = np.asarray(out)
    pal, _ = keep_hue_palette(a[a[:, :, 3] > 0][:, :3], n=colors)
    out = map_palette(out, pal)
    rec.update({'grid': {'x': g['x'], 'y': g['y']}, 'colors': len(pal), 'alpha': alpha_clean(out)})
    return out, rec


RECORD = os.path.join(os.path.dirname(os.path.dirname(HERE)), 'build-res', 'order', 'grid-measure.json')


def check_fit(img, box, used, lo=3.0, hi=40.0, bg=None, tol=0.03):
    """반입 도구가 쓰려는 칸(used = (가로 px, 세로 px))이 원본 실측 도트의 정수배인지 판정한다.
    판정: 'ok'(정수배와 tol 안) · 'off N%'(정수배에서 어긋남 — 캔버스 ÷ 칸 수로 맞춘 칸) · 'no-grid'(존재 < 1.06 — 되돌릴 격자 없음, 재발주 감)"""
    m = measure(img, box, lo, hi, bg=bg)
    ver = {}
    for k, u in zip(('x', 'y'), used):
        r = m[k]
        if not r['grid']:
            ver[k] = 'no-grid'
            continue
        q = u / r['pitch']
        n = max(1, round(q))
        off = abs(q - n) / n
        ver[k] = 'ok' if off <= tol else f'off {off * 100:.1f}%'
    return {'box': list(box) if box else None, 'used': [round(float(u), 3) for u in used], 'measured': short(m), 'verdict': ver}


def record(tool, key, rec, path=RECORD):
    """실측 기록을 build-res/order/grid-measure.json에 남긴다 ({도구: {키: 기록}})"""
    try:
        data = json.load(open(path, encoding='utf-8'))
    except (OSError, ValueError):
        data = {}
    data.setdefault(tool, {})[key] = rec
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=1, sort_keys=True)
        f.write('\n')


def guard(tool, key, img, box, used, lo=3.0, hi=40.0, bg=None, enforce=True):
    """반입 전 실측 → 기록 → 판정이 'ok'가 아니면 멈춘다(--accept-fit을 주면 기록만 하고 지나간다).
    캔버스 크기에 칸을 맞추는(상자 ÷ N) 반입이 실측 없이 다시 돌지 않게 하는 문지기 (D-552).
    enforce=False: 칸 크기가 설계 결정인 도구(piece_import — 기물 격자로 다시 그리기)는 기록만."""
    rec = check_fit(img, box, used, lo, hi, bg)
    record(tool, key, rec)
    bad = {k: v for k, v in rec['verdict'].items() if v != 'ok'}
    print(f'  [실측] {tool} {key}: 칸 {rec["used"]} · 실측 x {rec["measured"]["x"]["pitch"]}/{rec["measured"]["x"]["presence"]} '
          f'y {rec["measured"]["y"]["pitch"]}/{rec["measured"]["y"]["presence"]} → {rec["verdict"]}')
    if bad and enforce and '--accept-fit' not in sys.argv:
        raise SystemExit(f'{tool} {key}: 칸이 실측 도트의 정수배가 아니다 {bad} — 레시피에 실측 격자를 넣거나(gridmeasure.measure), '
                         f'되돌릴 격자가 없으면 재발주(D-388). 옛 판을 그대로 다시 뽑을 때만 --accept-fit.')
    return rec


def master_palette():
    """게임이 이미 쓰는 색 전부: UI 15색(ui_kit_import.PAL) · 반장 발주 24색(SPEC24) · 기물 PAL64"""
    import maker
    import scene_recipe
    import ui_kit_import as kit
    out = list(kit.PAL)
    out += [tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for h in scene_recipe.SPEC24]
    out += [v for v in maker.PAL64.values() if v]
    seen, res = set(), []
    for c in out:
        if c not in seen:
            seen.add(c)
            res.append(c)
    return res


def _dist(a, b):
    return (3 * (a[0] - b[0]) ** 2 + 4 * (a[1] - b[1]) ** 2 + 2 * (a[2] - b[2]) ** 2) ** 0.5 / 3 ** 0.5


def _same_hue(a, b, tol=24.0, grey=0.18):
    """두 색이 같은 색상 집안인지: 둘 다 먹 근처(명도 < 0.16)거나 둘 다 무채색(채도 < grey)이거나 색상 차가 tol도 안"""
    import colorsys
    ha, sa, va = colorsys.rgb_to_hsv(*[v / 255 for v in a])
    hb, sb, vb = colorsys.rgb_to_hsv(*[v / 255 for v in b])
    if va < 0.16 and vb < 0.16:  # 먹 근처는 색상이 의미 없다
        return True
    if sa < grey and sb < grey:
        return True
    if (sa < grey) != (sb < grey):
        return False
    d = abs(ha - hb) * 360
    return min(d, 360 - d) <= tol


def reduce_colors(pixels, n):
    """대표 n색: 5비트 묶음(묶음마다 평균)에서 시작해 가장 가까운 두 색을 칸 수 가중으로 합치기를 n색이 될 때까지.
    중앙값 자르기는 칸 수가 많은 쪽(흰 몸 · 먹)을 잘게 나누느라 면적이 작은 색상(금 목걸이 · 청록 고리)을 회색에 묻었다 —
    거리로만 합치면 면적이 작아도 색상이 다른 덩어리가 끝까지 남는다. 반환 [(색, 칸 수)]"""
    a = np.asarray(pixels, np.int64).reshape(-1, 3)
    key = ((a[:, 0] >> 3) << 10) | ((a[:, 1] >> 3) << 5) | (a[:, 2] >> 3)
    vals, inv, cnt = np.unique(key, return_inverse=True, return_counts=True)
    cols = np.zeros((len(vals), 3))
    np.add.at(cols, inv, a)
    cols /= cnt[:, None]
    w = cnt.astype(float)
    cols = list(cols)
    w = list(w)
    wt = np.array([3.0, 4.0, 2.0])
    while len(cols) > n:
        C = np.array(cols)
        d = (((C[:, None, :] - C[None, :, :]) ** 2) * wt).sum(-1)
        np.fill_diagonal(d, np.inf)
        i, j = np.unravel_index(int(d.argmin()), d.shape)
        if i > j:
            i, j = j, i
        tot = w[i] + w[j]
        cols[i] = (cols[i] * w[i] + cols[j] * w[j]) / tot
        w[i] = tot
        del cols[j], w[j]
    return [(tuple(int(round(v)) for v in c), int(k)) for c, k in zip(cols, w)]


def keep_hue_palette(pixels, n=20, snap_dist=22.0, master=None):
    """받은 그림 자신의 대표 n색(reduce_colors — 거리 합치기)을 만들고, 게임 마스터 색과 snap_dist 안이고 색상 집안이 같으면(_same_hue) 그 색으로 붙인다.
    먼 색(크림 · 보라 갈색 바닥처럼 마스터에 없는 색상)은 그대로 둔다 — 가장 가까운 회색 · 빨강으로 바뀌어 색상이 뒤집히지 않게.
    pixels: (N, 3) 불투명 칸 색. 반환 (팔레트, [(대표색, 붙은 색, 거리, 칸 수)])"""
    master = master or master_palette()
    res, rep = [], []
    for c, k in reduce_colors(pixels, n):
        m = min(master, key=lambda v: _dist(c, v))
        d = _dist(c, m)
        t = m if d <= snap_dist and _same_hue(c, m) else c
        rep.append(('#%02X%02X%02X' % c, '#%02X%02X%02X' % t, round(d, 1), k))
        if t not in res:
            res.append(t)
    return res, rep


def map_palette(img, pal):
    """RGBA 그림의 불투명 칸을 팔레트의 가장 가까운 색으로(밝기 가중 거리). 투명은 그대로."""
    a = np.asarray(img.convert('RGBA')).copy()
    p = np.array(pal, np.int32)
    rgb = a[:, :, :3].astype(np.int32)
    w = np.array([3, 4, 2])
    d = (((rgb[:, :, None, :] - p[None, None, :, :]) ** 2) * w).sum(-1)
    a[:, :, :3] = p[d.argmin(-1)].astype(np.uint8)
    return Image.fromarray(a, 'RGBA')


def is_key_fringe(c):
    """마젠타 바탕과 그 번짐(분홍 · 자주 끼, 색상 280~325도 · 채도 ≥ 0.35 · 명도 ≥ 0.45) — 투명으로 칠 칸"""
    import colorsys
    h, s, v = colorsys.rgb_to_hsv(*[x / 255 for x in c[:3]])
    return 280 <= h * 360 <= 325 and s >= 0.35 and v >= 0.45


def alpha_clean(img):
    """알파가 0 · 255뿐인지, 투명 칸 둘레에 마젠타 끼가 남았는지"""
    a = np.asarray(img.convert('RGBA'))
    partial = int(((a[:, :, 3] > 0) & (a[:, :, 3] < 255)).sum())
    op = a[:, :, 3] == 255
    r, g, b = a[:, :, 0].astype(int), a[:, :, 1].astype(int), a[:, :, 2].astype(int)
    magenta = int((op & (r > 150) & (b > 150) & (g < 120)).sum())
    return {'partial_alpha': partial, 'magenta': magenta}


def nearest_up(img, k):
    """정수배 계단 확대(비교판용)"""
    return img.resize((img.width * k, img.height * k), Image.NEAREST)


if __name__ == '__main__':
    args = sys.argv[1:]
    opt = {'--box': None, '--lo': '3', '--hi': '40'}
    pos = []
    i = 0
    while i < len(args):
        if args[i] in opt:
            opt[args[i]] = args[i + 1]
            i += 2
        else:
            pos.append(args[i])
            i += 1
    for s in pos:
        box = tuple(int(v) for v in opt['--box'].split(',')) if opt['--box'] else None
        print(s, json.dumps(measure(Image.open(s), box, float(opt['--lo']), float(opt['--hi'])), ensure_ascii=False))
