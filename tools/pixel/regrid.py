"""
장면 격자 실측 · 재도트화 (D-556 — 「941/180 관례」 · snap.py 자동 격자를 대신한다).

받은 생성기 그림의 숨은 도트 간격을 **축마다 따로 잰다** — 칸이 잘수록 오차가 줄어드는 기준(옛 관례의 근거)은 쓰지 않는다:
  ① 경계 세기 곡선(가로 · 세로 이웃 차이를 다른 축으로 더한 것)의 주기 성분(DFT)에서 봉우리 후보 + 그 2 · 3배 · 절반 · 삼분의 일
  ② 후보마다 1차원 복원 오차(각 픽셀을 제 칸 가운데 픽셀로 바꿨을 때의 차이, 가장 좋은 시작점)와
     **있음 점수**(간격을 ±6 · 10% 비틀었을 때 오차 ÷ 제 간격 오차 — 진짜 격자면 비틀면 크게 나빠진다, 1.05 이상 = 있음)
  ③ 있음 점수가 가장 높은 후보를 고르고, 그 절반 · 삼분의 일이 따로 있음이고 오차를 12% 넘게 더 줄일 때만 잘게 간다
     (잘게 가는 쪽을 기본으로 편들지 않는다 — 진짜 칸의 절반도 오차는 똑같이 작다)
  있음인 후보가 없는 축은 None (= 격자 없음, 칠한 그림) — 다른 축 값이나 정본 장면 간격(CANON_PITCH)으로 맞춘다.
재도트화: 칸 가운데 60% 영역의 최빈 묶음(채널마다 4비트) 안 중앙값(평균 금지) → 지각 색 공간(Lab) 가중 k-평균 ≤ 32색
  (채도가 높은 칸에 무게 — 보석 · 눈 · 불티 같은 강조색이 묻히지 않게) → 외톨이 칸 정리(같은 색 이웃이 하나도 없고
  이웃 최빈색과 가까운 칸만 이웃색으로 — 1도트 선 · 강조 낱점은 남는다).
사용:
  python3 -I tools/pixel/regrid.py measure <원본...>          (축마다 실측 표)
  python3 -I tools/pixel/regrid.py build <장면 이름...>       (scene_recipe.SCENE_GRID대로 public/scenes/<이름>.png)
  python3 -I tools/pixel/regrid.py check                      (기록된 격자가 실측과 3% 넘게 다르면 실패)
"""
import json
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
ORDER = os.path.join(ROOT, 'build-res', 'order')

PRESENT = 1.05  # 있음 점수 문턱 (감사 보고 2026-11-17: 진짜 격자 1.06 ~ 1.3, 칠한 그림 1.00 ~ 1.05)
FINER = 0.88  # 절반 · 삼분의 일이 오차를 이만큼 아래로 줄여야 잘게 간다
WEAK = 1.03  # 한 축이 있음일 때 다른 축은 그 간격 ±5% 안에서 이만큼만 넘어도 같은 격자로 본다
WEAK2 = 1.035  # 두 축 다 있음이 없을 때 두 축이 ±5% 안에서 함께 이만큼 넘으면 약한 격자로 본다


# ── 실측 ─────────────────────────────────────────────────────────

def _profile(a, axis):
    d = np.abs(np.diff(a, axis=axis))
    if d.ndim == 3:
        d = d.sum(axis=2)
    p = d.sum(axis=0) if axis == 1 else d.sum(axis=1)
    p = p.astype(float)
    return p - p.mean()


def _spectrum(p, periods):
    x = np.arange(len(p)) + 1.0
    out = np.empty(len(periods), complex)
    for i in range(0, len(periods), 128):
        P = periods[i:i + 128]
        out[i:i + 128] = (np.exp(-2j * np.pi * np.outer(1 / P, x)) * p).sum(1)
    return np.abs(out)


def _axis_err(g, axis, P, ph):
    n = g.shape[1] if axis == 1 else g.shape[0]
    x = np.arange(n)
    c = np.floor((x - ph) / P)
    ctr = np.clip(np.round(ph + (c + 0.5) * P - 0.5).astype(int), 0, n - 1)
    return float(np.abs((g[:, ctr] if axis == 1 else g[ctr]) - g).mean())


def _best_phase(g, axis, P, steps=12):
    return min((_axis_err(g, axis, P, ph), ph) for ph in np.linspace(0, P, steps, endpoint=False))


def _refine(g, axis, c, span=0.015, step=0.0025):
    (e, ph), q = min((_best_phase(g, axis, q), q) for q in np.arange(c * (1 - span), c * (1 + span) + 1e-9, c * step))
    det = np.mean([_best_phase(g, axis, q * f)[0] for f in (0.90, 0.94, 1.06, 1.10)])
    return dict(pitch=round(float(q), 3), phase=round(float(ph), 2), err=round(e, 3), presence=round(float(det / max(e, 1e-6)), 3))


def _peaks(rgb, axis, lo, hi, top=4):
    """경계 곡선의 주기 봉우리(이웃 ±0.15px 안 최댓값) 가운데 [lo, hi] 안 세기 상위 top개"""
    prof = _profile(rgb, axis)
    periods = np.arange(3.0, min(3 * hi, len(prof) / 6), 0.01)
    mag = _spectrum(prof, periods)
    w = 15
    pk = [i for i in range(len(mag)) if mag[i] == mag[max(0, i - w):i + w + 1].max() and lo <= periods[i] <= hi]
    return [round(float(periods[i]), 2) for i in sorted(pk, key=lambda i: -mag[i])[:top]]


def axis_cands(rgb, axis, seeds, hi=10.0):
    """한 축의 간격 후보(seeds — 0.8% 안 겹침은 하나로)마다 복원 오차 · 있음 점수. 절반 · 삼분의 일은 _finer가 고른 값에만 잰다"""
    g = rgb.mean(axis=2).astype(np.float32)
    sub = g[::6] if axis == 1 else g[:, ::6]
    cands = []
    for s in sorted(seeds):
        if any(abs(s / c['seed'] - 1) < 0.008 for c in cands):
            continue
        cands.append(dict(_refine(sub, axis, s), seed=s))
    return cands, sub


def _codec(c):
    """webp · jpeg 압축 덩어리(4 · 8px, 시작 0)는 도트 격자가 아니다"""
    return any(abs(c['pitch'] - b) < 0.02 * b for b in (4.0, 8.0, 16.0)) and min(c['phase'], c['pitch'] - c['phase']) < 0.3


def _finer(sub, axis, best, lo):
    """절반 · 삼분의 일을 재서 [lo 이상 · 압축 덩어리 아님 · 그 자체로 있음(≥ PRESENT) · 오차를 FINER배 아래로]일 때만 잘게 간다.
    칠한 그림은 칸이 잘수록 오차가 저절로 줄지만 절반 간격은 있음이 아니다(≈1.00) — 있음 조건이 잘게 기우는 것을 막는다.
    진짜 칸의 2배(색이 안 바뀌는 경계가 많아 있음 점수가 더 높게 나오기도 한다)를 잡았을 때 진짜 칸으로 내려온다. 반환 (고른 값, 까닭, 잰 값들)"""
    seen = []
    for d in (2, 3):
        if best['pitch'] / d < 3.0:
            continue
        f = _refine(sub, axis, best['pitch'] / d)
        seen.append(dict(f, div=d))
        if f['pitch'] >= lo and not _codec(f) and f['presence'] >= PRESENT and f['err'] < FINER * best['err']:
            return f, f'1/{d}: 있음 {f["presence"]:.3f} · 오차 {f["err"]:.2f} < {FINER}×{best["err"]:.2f}', seen
    return best, None, seen


def measure(src, lo=4.5, hi=9.0, box=None):
    """원본 그림의 가로 · 세로 도트 간격 실측 (축마다 따로). 반환 {'size', 'x': {pitch|None, phase, err, presence, why, cands}, 'y': …}
    ① 두 축 봉우리를 합친 후보를 두 축 모두에서 잰다 ② 있음(≥ PRESENT) 후보 짝 가운데 두 축 간격이 ±10% 안인 짝의 있음 합이
    가장 큰 것(생성기 도트는 거의 정사각 — 한 축만 엉뚱한 주기를 잡지 않게) ③ 짝이 없으면 축마다 있음 최고, 없는 축은
    ④ 다른 축 간격 ±5% 안의 약한 있음(≥ WEAK) 후보 → 그래도 없으면 None(격자 없음 — 칠한 그림).
    압축 덩어리(4 · 8px 시작 0)는 후보에서 뺀다. 잘게 가는 것은 _finer 조건일 때만.
    범위 기본 4.5 ~ 9px: 받은 장면 생성기 도트는 5 ~ 7px(감사 2026-11-17) — 2배 간격(11 ~ 13px)은 경계가 덜 바뀌어 있음 점수가 더 높게 나오기도 해 범위 밖에 둔다.
    그림마다 다르면 SCENE_GRID range로 넓힌다."""
    im = Image.open(src).convert('RGB')
    if box:
        im = im.crop(box)
    a = np.asarray(im, dtype=float)
    seeds = sorted(set(_peaks(a, 1, lo, hi, 3) + _peaks(a, 0, lo, hi, 3)))
    (cx, sx), (cy, sy) = axis_cands(a, 1, seeds, hi), axis_cands(a, 0, seeds, hi)
    cs, subs = {'x': cx, 'y': cy}, {'x': sx, 'y': sy}
    ok = {k: [c for c in v if lo <= c['pitch'] <= hi and not _codec(c)] for k, v in cs.items()}
    pres = {k: [c for c in v if c['presence'] >= PRESENT] for k, v in ok.items()}
    pairs = [(cx['presence'] + cy['presence'], cx, cy) for cx in pres['x'] for cy in pres['y'] if abs(cx['pitch'] / cy['pitch'] - 1) <= 0.10]
    pick = {}
    if pairs:
        _, pick['x'], pick['y'] = max(pairs, key=lambda t: t[0])
        why = {k: '두 축 짝 있음 최고' for k in 'xy'}
    else:
        why = {}
        for k in 'xy':
            if pres[k]:
                pick[k] = max(pres[k], key=lambda c: c['presence'])
                why[k] = '있음 최고(짝 없음)'
        for k, o in (('x', 'y'), ('y', 'x')):
            if k not in pick and o in pick:
                near = [c for c in ok[k] if c['presence'] >= WEAK and abs(c['pitch'] / pick[o]['pitch'] - 1) <= 0.05]
                if near:
                    pick[k] = max(near, key=lambda c: c['presence'])
                    why[k] = f'약한 있음 — 다른 축 {pick[o]["pitch"]:.2f} ±5%'
        if not pick:  # ⑤ 두 축 다 있음이 없으면: 두 축이 ±5% 안에서 함께 약한 있음(≥ WEAK2)인 짝
            weak = [(cx['presence'] + cy['presence'], cx, cy) for cx in ok['x'] for cy in ok['y']
                    if min(cx['presence'], cy['presence']) >= WEAK2 and abs(cx['pitch'] / cy['pitch'] - 1) <= 0.05]
            if weak:
                _, pick['x'], pick['y'] = max(weak, key=lambda t: t[0])
                why = {k: '두 축 약한 짝' for k in 'xy'}
    res = {'size': im.size}
    for k in 'xy':
        if k not in pick:
            weak = max(ok[k] or cs[k], key=lambda c: c['presence'])
            res[k] = dict(pitch=None, phase=None, err=None, presence=weak['presence'], weak=weak['pitch'], cands=cs[k], why='없음')
            continue
        best, w2, seen = _finer(subs[k], 1 if k == 'x' else 0, pick[k], lo)
        res[k] = dict(best, cands=cs[k] + seen, why=w2 or why[k])
    return res


# ── 재도트화 ──────────────────────────────────────────────────────

def edges(n, p, o):
    """시작 o · 간격 p의 칸 경계 — 끝에 남는 반 칸 미만 조각은 버린다(가장자리 칸은 번짐 · 잘림이 섞인다)"""
    o = o % p
    e = list(np.arange(o, n + 1e-6, p))
    if o > 0.5 * p:
        e = [max(0.0, o - p)] + e
    if n - e[-1] > 0.5 * p:
        e.append(float(n))
    return np.array(e)


def sample(rgb, xe, ye, core=0.6):
    """칸 가운데 core 영역: 채널마다 4비트로 묶은 최빈 묶음 안의 중앙값 (평균 금지 — 섞인 색을 만들지 않는다)"""
    H, W = rgb.shape[:2]
    m = (1 - core) / 2
    out = np.zeros((len(ye) - 1, len(xe) - 1, 3), np.uint8)
    for j in range(len(ye) - 1):
        y0, y1 = ye[j], ye[j + 1]
        a0 = int(y0 + (y1 - y0) * m)
        a1 = max(a0 + 1, int(np.ceil(y1 - (y1 - y0) * m)))
        for i in range(len(xe) - 1):
            x0, x1 = xe[i], xe[i + 1]
            b0 = int(x0 + (x1 - x0) * m)
            b1 = max(b0 + 1, int(np.ceil(x1 - (x1 - x0) * m)))
            blk = rgb[a0:min(a1, H), b0:min(b1, W)].reshape(-1, 3)
            q = blk >> 4
            key = (q[:, 0].astype(np.int32) << 8) | (q[:, 1].astype(np.int32) << 4) | q[:, 2]
            v, c = np.unique(key, return_counts=True)
            sel = blk[key == v[c.argmax()]]
            out[j, i] = np.median(sel, axis=0)
    return out


def to_lab(rgb):
    c = rgb.astype(float) / 255
    c = np.where(c > 0.04045, ((c + 0.055) / 1.055) ** 2.4, c / 12.92)
    M = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]])
    xyz = c @ M.T / np.array([0.9505, 1.0, 1.089])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)


def palette(small, k=32, accent=0.5, iters=30):
    """지각 색(Lab) 가중 k-평균. 무게 = 1 + accent × 채도/25 (채도 높은 작은 덩어리가 큰 면에 먹히지 않게).
    대표색은 묶음 안 실제 칸 색(중앙값에 가장 가까운 칸) — 새 섞인 색을 만들지 않는다. 반환 (색 번호 칸, 팔레트 RGB)"""
    H, W = small.shape[:2]
    px = small.reshape(-1, 3)
    uniq, inv, cnt = np.unique(px, axis=0, return_inverse=True, return_counts=True)
    inv = inv.reshape(-1)
    lab = to_lab(uniq)
    chroma = np.hypot(lab[:, 1], lab[:, 2])
    wt = cnt * (1 + accent * chroma / 25)
    k = min(k, len(uniq))
    # 결정적 초기값: 가중 최원점 고르기 (k-means++의 결정판)
    cen = [lab[int(np.argmax(wt))]]
    d2 = ((lab - cen[0]) ** 2).sum(1)
    for _ in range(k - 1):
        cen.append(lab[int(np.argmax(d2 * np.sqrt(wt)))])
        d2 = np.minimum(d2, ((lab - cen[-1]) ** 2).sum(1))
    cen = np.array(cen)
    for _ in range(iters):
        lbl = ((lab[:, None] - cen[None]) ** 2).sum(2).argmin(1)
        new = np.array([np.average(lab[lbl == c], axis=0, weights=wt[lbl == c]) if (lbl == c).any() else cen[c] for c in range(k)])
        if np.allclose(new, cen, atol=0.05):
            break
        cen = new
    lbl = ((lab[:, None] - cen[None]) ** 2).sum(2).argmin(1)
    # 대표색 = 묶음의 무게 중심에 가장 가까운 실제 색
    pal = np.zeros((k, 3), np.uint8)
    for c in range(k):
        s = np.flatnonzero(lbl == c)
        if len(s):
            pal[c] = uniq[s[((lab[s] - cen[c]) ** 2).sum(1).argmin()]]
    idx = lbl[inv].reshape(H, W)
    # 쓰이지 않은 번호를 걷어 낸다
    used = np.unique(idx)
    remap = np.full(k, -1)
    remap[used] = np.arange(len(used))
    return remap[idx], pal[used]


def clean(idx, pal, near=22.0, grain=14.0, passes=2):
    """잔티 정리 (면 단위):
    ① 외톨이 칸 — 8이웃에 같은 색이 하나도 없고 이웃 최빈색(3칸 이상)과 지각 차이 near 미만이면 그 색으로
    ② 면 속 잔티 — 같은 색 이웃이 1칸 이하(두 칸짜리 얼룩)이고 이웃 5칸 이상이 한 색이며 그 색과 차이 grain 미만이면 그 색으로
    1도트 선(같은 색 이웃 ≥ 2 — 선 끝 1칸 제외)과 이웃과 크게 다른 강조 낱점(눈 · 불티 · 보석)은 남는다"""
    lab = to_lab(pal)
    H, W = idx.shape
    changed = 0
    for _ in range(passes):
        p = np.pad(idx, 1, mode='edge')
        nb = np.stack([p[1 + dy:1 + dy + H, 1 + dx:1 + dx + W] for dy in (-1, 0, 1) for dx in (-1, 0, 1) if dy or dx], -1)
        same = (nb == idx[..., None]).sum(-1)
        new = idx.copy()
        for y, x in zip(*np.nonzero(same <= 1)):
            v, c = np.unique(nb[y, x], return_counts=True)
            m = v[c.argmax()]
            if m == idx[y, x]:
                continue
            d = np.linalg.norm(lab[m] - lab[idx[y, x]])
            if (same[y, x] == 0 and c.max() >= 3 and d < near) or (c.max() >= 5 and d < grain):
                new[y, x] = m
        changed += int((new != idx).sum())
        idx = new
    return idx, changed


def build_one(name, g, out_dir=None, verbose=True):
    """g = scene_recipe.SCENE_GRID[name]. 결과 RGB 칸 그림(PIL) 반환 + public/scenes/<name>.png 저장"""
    src = os.path.join(ORDER, g['src'])
    im = Image.open(src).convert('RGB')
    if g.get('crop'):
        im = im.crop(g['crop'])
    rgb = np.asarray(im)
    px, ox, py, oy = g['grid']
    xe, ye = edges(im.width, px, ox), edges(im.height, py, oy)
    small = sample(rgb, xe, ye)
    top = bot = 0
    if g.get('trim'):  # 생성기가 그려 넣은 레터박스 띠 (opening_import와 같은 규칙: 먹 칸 90% 넘는 줄 + 경계 줄)
        t = g['trim']
        dark = (small.max(axis=2) <= t[0]).mean(axis=1)

        def edge(d):
            k = int(np.argmax(d < 0.9))
            return k + 1 if d[k] > t[1] else k
        top, bot = edge(dark), edge(dark[::-1])
        small = small[top:small.shape[0] - bot]
    colors = g.get('colors', 32)
    idx, pal = palette(small, colors, g.get('accent', 0.5))
    idx, n = clean(idx, pal, g.get('near', 22.0))
    if g.get('recolor'):  # 색상만 돌리기 (D-347 조립 반장 청록 → 기계 초록: 색상 범위 · 채도 문턱 안의 팔레트 색, 밝기 · 채도 그대로)
        import colorsys
        rc = g['recolor']
        for i, c in enumerate(pal):
            h, s, v = colorsys.rgb_to_hsv(*(c / 255))
            if rc['hue'][0] <= h * 360 <= rc['hue'][1] and s >= rc['sat']:
                pal[i] = np.round(np.array(colorsys.hsv_to_rgb(rc['to'] / 360, s, v)) * 255).astype(np.uint8)
    out = Image.fromarray(pal[idx].astype(np.uint8), 'RGB')
    for e in g.get('erase', []):  # 지정 칸을 이웃 칸 색으로 (새 색 없음)
        a = np.asarray(out).copy()
        l, t_, r, b = e['box']
        fx, fy = e['from']
        a[t_:b, l:r] = a[fy, fx]
        out = Image.fromarray(a)
    dst = os.path.join(out_dir or os.path.join(ROOT, 'public', 'scenes'), f'{name}.png')
    out.save(dst, optimize=True)
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import crown_unify  # D-573: 종이 왕관 색 통일 — 재반입이 되돌리지 않게
    crown_unify.after_save(dst)
    if verbose:
        print(f'{name}: {g["src"]} {im.size} 칸 {px:.3f}×{py:.3f} (시작 {ox:.2f},{oy:.2f}) → {out.size} · {len(pal)}색 · 띠 걷음 위 {top} · 아래 {bot}줄 · 잔티 정리 {n}칸 → {dst}')
    return out


def check(tol=0.03, names=None, remeasure=False):
    """기록된 격자(SCENE_GRID grid)가 실측(measured)과 3% 넘게 다르면 실패 목록을 돌려준다.
    실측 None(격자 없음) 축: square='x'|'y'(그 축만 없음 → 다른 축 실측과 비교) 또는 canon(두 축 다 없음 → CANON_PITCH와 비교) 표시가 있어야 한다.
    remeasure=True면 원본을 다시 재서 기록된 실측과도 맞춘다(원본이 바뀌었거나 측정기가 바뀐 것을 잡는다 — 느리다)."""
    import scene_recipe
    bad = []
    for name, g in scene_recipe.SCENE_GRID.items():
        if names and name not in names:
            continue
        px, _, py, _ = g['grid']
        mx, my = g['measured']
        if remeasure:
            m = measure(os.path.join(ORDER, g['src']), *g.get('range', (4.5, 9.0)))
            for ax, rec in (('x', mx), ('y', my)):
                now = m[ax]['pitch']
                if (now is None) != (rec is None) or (now and abs(now / rec - 1) > tol):
                    bad.append(f'{name} {ax}: 기록 실측 {rec} vs 다시 잰 값 {now}')
        for ax, used, m, other in (('x', px, mx, my), ('y', py, my, mx)):
            if m is None:
                if g.get('square') == ax and other:
                    m = other
                elif g.get('canon') and mx is None and my is None:
                    m = scene_recipe.CANON_PITCH
                else:
                    bad.append(f'{name} {ax}: 실측 없음인데 square · canon 표시가 맞지 않다')
                    continue
            if abs(used / m - 1) > tol:
                bad.append(f'{name} {ax}: 격자 {used:.3f} vs 실측 {m:.3f} ({(used / m - 1) * 100:+.1f}%)')
    return bad


if __name__ == '__main__':
    sys.path.insert(0, HERE)
    cmd, args = sys.argv[1], sys.argv[2:]
    if cmd == 'measure':
        for s in args:
            r = measure(s)
            row = {ax: {k: r[ax][k] for k in ('pitch', 'phase', 'err', 'presence', 'why')} for ax in 'xy'}
            print(os.path.basename(s), r['size'], json.dumps(row, ensure_ascii=False))
    elif cmd == 'build':
        import scene_recipe
        for n in args or list(scene_recipe.SCENE_GRID):
            build_one(n, scene_recipe.SCENE_GRID[n])
    elif cmd == 'check':
        re_ = '--remeasure' in args
        names = [a for a in args if not a.startswith('--')] or None
        bad = check(names=names, remeasure=re_)
        import scene_recipe
        print('\n'.join(bad) or f'격자 = 실측 (±3%) — {len(names or scene_recipe.SCENE_GRID)}장' + (' · 다시 잼' if re_ else ''))
        sys.exit(1 if bad else 0)
