"""사건 그림 16장 재반입 (D-555 — D-538 재양자화를 대신한다, D-423 반입 절차를 받은 원본부터 다시 실행).

python3 -I tools/pixel/event_import.py [--dry] [--out <대조판 폴더>] [이름 …]

받은 원본 build-res/order/V-xx-<이름>-source.png(1448×1086, 생성기 그림)에서 시작한다. D-538은 처음 반입(D-261 무렵)의 축마다 다른
자동 격자(가로 · 세로 칸 크기가 달라 그림이 4~5% 늘어나 있었다)를 그대로 쓰고 전체 32색 · 낱점만 걷어 생성기 그레인(2~3도트 얼룩
무늬)이 벽 · 바닥에 그대로 남았고, 작은 강조색(거울 속 보라 폰)이 흰색으로 묻혔다.

① 격자 실측 — 밝기 기울기 가운데 센 경계(|ΔL| > 30, 그레인 얼룩은 대비가 낮아 빠진다)만 모아 가로 · 세로 경계 곡선의 주기 스펙트럼을
   4~8px에서 잰다(축마다 봉우리 px · py). 정사각 칸 간격 = 두 축이 함께 받치는 봉우리(±0.08px 허용 기하 평균, 5~7px — 한 축만 센
   가짜 봉우리 · 2도트 얼룩 주기를 피한다). 위상(시작점 ox · oy)은 snap._score. 생성기 격자는 그림 안에서 조금씩 흔들리므로
   균일 격자(실측 간격 · 위상)와 같은 칸 수로 묶은 dp_fixed(칸 폭 ±10 · 20 · 30%) 가운데 복원 오차(칸 가운데 색으로 칠해 원본과
   견준 평균 차)가 가장 낮은 것을 쓴다. 칸 수가 같아 그림 비율 = 원본 비율(늘이지 않는다 — D-386). 처방에 pitch가 있으면 그 간격.
② 칸마다 한 색 — 칸 가운데 50% 픽셀의 최빈 묶음(채널 16단)의 중앙값(평균이 아니다 — 얼룩 두 색이 섞이지 않는다)
③ 그레인 걷기(면 단위) — CIELAB 시그마 필터: 5×5 이웃 가운데 ΔE < sigma인 칸들(같은 면)만의 평균으로, iters번.
   대비가 큰 경계 · 1도트 선(철망 · 리벳 · 먹선)은 이웃이 자기 선 칸뿐이라 그대로 남는다.
④ 팔레트 — CIELAB k-평균, 먼 점 먼저 씨앗(채도 높은 외톨이 색 — 보라 폰 · 청록 등 · 쇳물 주황이 제 씨앗을 받는다),
   씨앗에서 ΔE 12 넘게 떨어진 칸이 3칸 넘게 남으면 씨앗을 더한다. 색 수는 24 → 48에서 평균 ΔE ≤ 2.5인 가장 적은 수(상한 48). 디더 없음.
⑤ 면 정리 — 같은 색 8-연결 덩어리 < merge칸이고 둘레 최다 색과 ΔE < merge_de면 그 색으로 → 낮은 대비 최빈 필터(3×3에서 5칸 이상인
   색과 ΔE < mode_de, 1칸 폭 선 칸은 건드리지 않는다 — 얼룩 그물) → 덩어리 정리 한 번 더 → 외톨이 칸(ΔE < single_de)만 이웃 색으로.
   대각선은 8-연결로 한 덩어리라 철망이 끊기지 않는다.
⑥ 검사 — 색 수 · 외톨이 칸 비율 · 평균 면 크기(ΔE < 8이면 같은 색으로 보고 잰다 — 정본 장면은 색 수를 줄이지 않아 RGB가 칸마다 조금씩 달라서)
   · 1도트 선 보존율(②의 칸에서 양옆보다 밝기 40 넘게 튀고 8칸 넘게 이어진 선, 그레인이 빽빽한 면은 뺌 — 가운데 결과에서도 선인 비율).
   정본 장면(scene-import 이야기 컷 CANON)과 같은 잣대로 build-res/order/EV-import-report.json에.
대조판(원본 1:1 자르기 | 바꾸기 전 | 새로, 3배 계단 — 초점 자리 · 바꾸기 전 그림의 그레인이 가장 빽빽한 자리 · 전체): build-res/order/EV-import/<이름>.png
바꾸기 전(D-538) 게임 그림은 build-res/order/EV-import/old/에 남긴다. 처방 · 실측값: scene_recipe.EVENT_IMPORT(cells가 있으면 실측이 같은지 확인).
게임 그림은 원본 비율 그대로(정사각 칸) — EVENT_FOCUS는 그림 비율(0~1) 기준이라 그대로 맞는다.
"""
from pathlib import Path
import json
import sys

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(HERE))
import snap  # noqa: E402
import crown_unify  # noqa: E402  # D-573: 종이 왕관 색 통일 — 재반입이 되돌리지 않게
from scene_recipe import EVENT_IMPORT  # noqa: E402

ORDER = ROOT / 'build-res/order'
CANON = ['chained-door', 'old-spring', 'scarred-wall', 'casting-floor', 'companion-rest', 'crown-dais']  # 비교 잣대: scene-import 이야기 컷


def lab(a):
    """sRGB 0~255 → CIELAB"""
    c = np.asarray(a, float) / 255
    c = np.where(c > 0.04045, ((c + 0.055) / 1.055) ** 2.4, c / 12.92)
    xyz = c @ np.array([[0.4124, 0.2126, 0.0193], [0.3576, 0.7152, 0.1192], [0.1805, 0.0722, 0.9505]])
    xyz /= np.array([0.9505, 1.0, 1.089])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)


def unlab(L):
    """CIELAB → sRGB 0~255 (uint8)"""
    fy = (L[..., 0] + 16) / 116
    fx = fy + L[..., 1] / 500
    fz = fy - L[..., 2] / 200
    f = np.stack([fx, fy, fz], -1)
    xyz = np.where(f > 0.206893, f ** 3, (f - 16 / 116) / 7.787) * np.array([0.9505, 1.0, 1.089])
    c = xyz @ np.linalg.inv(np.array([[0.4124, 0.2126, 0.0193], [0.3576, 0.7152, 0.1192], [0.1805, 0.0722, 0.9505]]))
    c = np.clip(c, 0, 1)
    c = np.where(c > 0.0031308, 1.055 * c ** (1 / 2.4) - 0.055, 12.92 * c)
    return np.clip(np.round(c * 255), 0, 255).astype(np.uint8)


# ① 격자 실측 ------------------------------------------------------------------------------------------
def edge_profile(Lum, axis, thr=30):
    """센 경계만(|ΔL| > thr) 모은 경계 곡선 — 그레인 얼룩(낮은 대비)이 주기를 흐리지 않게"""
    d = np.abs(np.diff(Lum, axis=axis))
    d = np.where(d > thr, d, 0)
    p = d.sum(axis=0) if axis == 1 else d.sum(axis=1)
    return p - np.convolve(p, np.ones(41) / 41, 'same')


def spectrum(p, Ps):
    x = np.arange(len(p) - 40) + 20
    q = p[20:-20]
    a = np.array([abs((q * np.exp(-2j * np.pi * x / P)).sum()) / len(q) for P in Ps])
    return a / np.median(a)


def measure(src):
    """원본 → 실측 {px, py(축마다 스펙트럼 봉우리), pitch(정사각), ox, oy(위상), strength}"""
    a = np.asarray(src, float)
    Lum = a @ [0.299, 0.587, 0.114]
    Ps = np.arange(4.0, 8.0, 0.005)
    sx, sy = spectrum(edge_profile(Lum, 1), Ps), spectrum(edge_profile(Lum, 0), Ps)
    band = (Ps >= 5.0) & (Ps <= 7.0)
    # 두 축이 함께 받치는 간격: ±0.08px 안 최댓값(격자 흔들림 허용)의 기하 평균이 가장 큰 곳 → 그 둘레 ±0.08에서 날 스펙트럼 곱이 가장 큰 간격
    g = np.sqrt(ndi.maximum_filter1d(sx, 33) * ndi.maximum_filter1d(sy, 33))
    j0 = int(np.argmax(np.where(band, g, -1)))
    near = np.abs(Ps - Ps[j0]) <= 0.08
    j = int(np.argmax(np.where(near, sx * sy, -1)))
    P = float(Ps[j])
    prof_x, prof_y = snap._profile(a, 1), snap._profile(a, 0)
    ox, oy = snap._score(prof_x, a.shape[1], P)[1], snap._score(prof_y, a.shape[0], P)[1]
    return {'px': round(float(Ps[np.argmax(np.where(band, sx, -1))]), 3), 'py': round(float(Ps[np.argmax(np.where(band, sy, -1))]), 3),
            'pitch': round(P, 3), 'ox': round(float(ox), 2), 'oy': round(float(oy), 2), 'strength': round(float(g[j0]), 2)}


def phased(n, P, o):
    """간격 P · 시작점 o의 균일 경계 (가장자리 반 칸 미만 조각은 이웃 칸에 붙인다)"""
    e = list(np.arange(o, n, P))
    if not e or e[0] > P / 2:
        e = [0.0] + e
    else:
        e[0] = 0.0
    if n - e[-1] > P / 2:
        e.append(float(n))
    else:
        e[-1] = float(n)
    return e


def rec_error(a, xe, ye):
    """복원 오차: 칸 가운데 색(3×3 중앙값 원본)으로 칸을 칠해 원본과 견준 평균 RGB 차"""
    med = np.stack([ndi.median_filter(a[..., c], size=3) for c in range(3)], -1)
    xe, ye = np.asarray(xe), np.asarray(ye)
    cx = ((xe[:-1] + xe[1:]) / 2).astype(int)
    cy = ((ye[:-1] + ye[1:]) / 2).astype(int)
    small = med[cy][:, cx]
    ix = np.searchsorted(xe, np.arange(a.shape[1]) + 0.5) - 1
    iy = np.searchsorted(ye, np.arange(a.shape[0]) + 0.5) - 1
    return float(np.abs(small[np.clip(iy, 0, len(cy) - 1)][:, np.clip(ix, 0, len(cx) - 1)] - a).mean())


def dp_fixed(prof, n, N, slack):
    """칸 수를 N으로 고정한 경계 찾기(동적 계획): 칸 폭은 n/N의 ±slack 안, 경계 자리 경계 세기 합이 가장 크게.
    snap.dp_cuts는 칸 수가 자유라 그레인 경계를 따라 칸이 잘아지고(가로 · 세로 칸 수가 따로 늘어 그림이 2~3% 늘어난다) 복원 오차도
    칸이 많은 쪽이 늘 이겨 비교가 안 된다 — 칸 수를 균일 격자와 같게 묶어 흔들림만 따라간다."""
    P = n / N
    lo, hi = max(1, int(np.floor(P * (1 - slack)))), int(np.ceil(P * (1 + slack)))
    e = np.full(n + 1, 0.0)
    e[1:n] = prof[:n - 1]
    NEG = -1e18
    best = np.full(n + 1, NEG)
    best[0] = 0.0
    back = np.zeros((N + 1, n + 1), np.int32)
    for k in range(1, N + 1):
        cand = np.full(n + 1, NEG)
        arg = np.zeros(n + 1, np.int32)
        for d in range(lo, hi + 1):
            sh = np.full(n + 1, NEG)
            sh[d:] = best[:n + 1 - d]
            upd = sh > cand
            cand[upd] = sh[upd]
            arg[upd] = d
        best = cand + (e if k < N else 0)
        back[k] = arg
    assert best[n] > NEG / 2, 'dp_fixed: 경계를 못 찾았다'
    cuts = [n]
    x = n
    for k in range(N, 0, -1):
        x -= back[k][x]
        cuts.append(x)
    return [float(c) for c in cuts[::-1]]


def cuts_for(src, m):
    """격자 경계: 실측 간격 · 위상의 균일 정사각 격자와, 같은 칸 수로 묶은 dp_fixed(칸 폭 ±10 · 20 · 30%, 생성기 격자 흔들림 따라가기)
    가운데 복원 오차가 가장 낮은 것. 칸 수는 둘 다 같아(가로 = 원본 폭 / 간격, 세로 = 원본 높이 / 간격) 그림 비율이 원본과 같다(D-386)."""
    a = np.asarray(src, float)
    H, W = a.shape[:2]
    P = m['pitch']
    # D-570: 처방에 축마다 실측(gridmeasure) 간격이 있으면 그 간격 · 시작점 — 없으면 정사각 P
    ux, uy = phased(W, m.get('pitchX', P), m['ox']), phased(H, m.get('pitchY', P), m['oy'])
    best = (rec_error(a, ux, uy), ux, uy, 'uniform')
    m['errUniform'] = round(best[0], 3)
    px_, py_ = snap._profile(a, 1), snap._profile(a, 0)
    for slack in (0.1, 0.2, 0.3):
        xe, ye = dp_fixed(px_, W, len(ux) - 1, slack), dp_fixed(py_, H, len(uy) - 1, slack)
        err = rec_error(a, xe, ye)
        if err < best[0]:
            best = (err, xe, ye, f'dp±{slack}')
    m['err'] = round(best[0], 3)
    return best[1], best[2], best[3]


# ② 칸마다 한 색 -----------------------------------------------------------------------------------------
def sample(src, xe, ye, core=0.5):
    """칸 가운데 core 영역의 최빈 묶음(채널 16단) 중앙값 → (rows, cols, 3) uint8"""
    a = np.asarray(src)
    rows, cols = len(ye) - 1, len(xe) - 1
    out = np.zeros((rows, cols, 3), np.uint8)
    m = (1 - core) / 2
    for j in range(rows):
        y0, y1 = ye[j], ye[j + 1]
        cy0 = int(y0 + (y1 - y0) * m)
        cy1 = max(cy0 + 1, int(np.ceil(y1 - (y1 - y0) * m)))
        for i in range(cols):
            x0, x1 = xe[i], xe[i + 1]
            cx0 = int(x0 + (x1 - x0) * m)
            cx1 = max(cx0 + 1, int(np.ceil(x1 - (x1 - x0) * m)))
            blk = a[cy0:cy1, cx0:cx1].reshape(-1, 3)
            q = (blk >> 4).astype(np.int32)
            key = (q[:, 0] << 8) | (q[:, 1] << 4) | q[:, 2]
            vals, cnt = np.unique(key, return_counts=True)
            out[j, i] = np.median(blk[key == vals[cnt.argmax()]], axis=0)
    return out


# ③ 그레인 걷기 ------------------------------------------------------------------------------------------
def sigma_median(L, sigma, iters, r=2):
    """CIELAB 시그마 필터: (2r+1)² 이웃 가운데 ΔE < sigma인 칸들(같은 면)만의 평균 — 경계 · 1도트 선은 남는다"""
    H, W = L.shape[:2]
    for _ in range(iters):
        P = np.pad(L, ((r, r), (r, r), (0, 0)), mode='edge')
        stack = np.stack([P[dy:dy + H, dx:dx + W] for dy in range(2 * r + 1) for dx in range(2 * r + 1)], 0)  # (k, H, W, 3)
        d = np.sqrt(((stack - L[None]) ** 2).sum(-1))
        ok = d < sigma
        w = ok[..., None].astype(float)
        L = (stack * w).sum(0) / w.sum(0)  # 자기 자신은 늘 든다 (ΔE 0)
    return L


# ④ 팔레트 ---------------------------------------------------------------------------------------------
def kmeans(X, C, it=12):
    for _ in range(it):
        lab_ = ((X[:, None, :] - C[None]) ** 2).sum(-1).argmin(1)
        for k in range(len(C)):
            sel = X[lab_ == k]
            if len(sel):
                C[k] = sel.mean(0)
    d = np.sqrt(((X[:, None, :] - C[None]) ** 2).sum(-1))
    return C, d.argmin(1), d.min(1)


def palette(L, kmin=24, kmax=48, target=2.5):
    """CIELAB k-평균 · 먼 점 씨앗 · 남은 외톨이 색 씨앗 보강 → (팔레트 Lab, 칸별 번호, 평균 ΔE, 색 수)"""
    H, W = L.shape[:2]
    X = L.reshape(-1, 3)
    U, inv, cnt = np.unique(np.round(X, 1), axis=0, return_inverse=True, return_counts=True)
    inv = inv.ravel()
    rng = np.random.default_rng(7)
    best = None
    for K in range(kmin, kmax + 1, 4):
        # 먼 점 씨앗: 가장 흔한 색에서 시작해 지금 씨앗들과 가장 먼 색을 차례로 (채도 높은 작은 면이 제 씨앗을 받는다)
        C = [U[cnt.argmax()]]
        dmin = np.sqrt(((U - C[0]) ** 2).sum(-1))
        while len(C) < K // 2:
            k = int(np.argmax(dmin * (cnt >= 3)))
            C.append(U[k])
            dmin = np.minimum(dmin, np.sqrt(((U - U[k]) ** 2).sum(-1)))
        # 나머지 절반은 면적 비례(흔한 면의 명암 단을 나눈다)
        extra = rng.choice(len(X), K - len(C), replace=False)
        C = np.vstack([np.array(C), X[extra]])
        for _ in range(3):
            C, idx, err = kmeans(X, C.copy())
            far = err > 12
            if far.sum() <= 3 or len(C) >= kmax:
                break
            # 남은 먼 칸 덩어리에 씨앗 하나 더 (가장 먼 칸 주변 평균)
            c0 = X[far][err[far].argmax()]
            near = far & (np.sqrt(((X - c0) ** 2).sum(-1)) < 10)
            C = np.vstack([C, X[near].mean(0)])
        res = (C, idx.reshape(H, W), float(err.mean()), len(C))
        best = res
        if err.mean() <= target:
            break
    return best


# ⑤ 덩어리 정리 -----------------------------------------------------------------------------------------
def merge_small(idx, C, merge, merge_de, passes=3):
    """같은 색 8-연결 덩어리 < merge칸이고 둘레 최다 색과 ΔE < merge_de면 그 색으로 (면 속 얼룩만 — 대비 큰 점 · 선은 남는다)"""
    idx = idx.copy()
    st8 = np.ones((3, 3), bool)
    for _ in range(passes):
        changed = 0
        for k in range(len(C)):
            lb, n = ndi.label(idx == k, structure=st8)
            if not n:
                continue
            sizes = ndi.sum(np.ones_like(lb), lb, index=np.arange(1, n + 1))
            for c in np.nonzero(sizes < merge)[0] + 1:
                m = lb == c
                ring = ndi.binary_dilation(m, structure=st8) & ~m
                nb = idx[ring]
                if not len(nb):
                    continue
                v, ct = np.unique(nb, return_counts=True)
                t = int(v[ct.argmax()])
                if np.sqrt(((C[k] - C[t]) ** 2).sum()) < merge_de:
                    idx[m] = t
                    changed += 1
        if not changed:
            break
    return idx


def thin(idx):
    """1칸 폭 선 칸: 한 방향(가로 · 세로 · 두 대각)으로 양옆 칸이 자기 색이고 그 수직 방향 양옆은 둘 다 다른 색 —
    낮은 대비 먹선(거울 속 폰 테두리 같은)을 최빈 필터가 지우지 않게 지킨다"""
    P = np.pad(idx, 1, mode='edge')
    H, W = idx.shape

    def at(dy, dx):
        return P[1 + dy:1 + dy + H, 1 + dx:1 + dx + W]
    out = np.zeros(idx.shape, bool)
    for (dy, dx), (py, px) in (((0, 1), (1, 0)), ((1, 0), (0, 1)), ((1, 1), (1, -1)), ((1, -1), (1, 1))):
        along = (at(dy, dx) == idx) & (at(-dy, -dx) == idx)
        across = (at(py, px) != idx) & (at(-py, -px) != idx)
        out |= along & across
    return out


def mode_filter(idx, C, de, iters=3):
    """낮은 대비 면의 최빈 필터: 3×3에서 5칸 이상인 다른 색이 있고 그 색과 ΔE < de면 그 색으로 —
    그레인 얼룩 그물(이어져 있어 덩어리 정리로 안 걷히는 두 색 무늬)을 한 면으로. 대비 큰 경계 · 선은 그대로."""
    H, W = idx.shape
    D = np.sqrt(((C[:, None] - C[None]) ** 2).sum(-1))
    for _ in range(iters):
        P = np.pad(idx, 1, mode='edge')
        nb = np.stack([P[dy:dy + H, dx:dx + W] for dy in range(3) for dx in range(3)], 0)
        best, bestc = idx.copy(), np.zeros_like(idx)
        for k in np.unique(nb):
            c = (nb == k).sum(0)
            upd = c > bestc
            best[upd], bestc[upd] = k, c[upd]
        ch = (bestc >= 5) & (best != idx) & (D[idx, best] < de) & ~thin(idx)
        if not ch.any():
            break
        idx = np.where(ch, best, idx)
    return idx


def singles(idx, C, de):
    """외톨이 칸(8이웃이 모두 다른 색)을 이웃 최다 색으로 — 그 색과 ΔE < de일 때만(대비가 아주 큰 낱점 = 별빛 · 불티는 남긴다).
    1도트 선 칸은 선 이웃이 같은 색이라 외톨이가 아니다."""
    H, W = idx.shape
    D = np.sqrt(((C[:, None] - C[None]) ** 2).sum(-1))
    P = np.pad(idx, 1, mode='edge')
    nb = np.stack([P[dy:dy + H, dx:dx + W] for dy in range(3) for dx in range(3) if dy != 1 or dx != 1], 0)
    alone = (nb != idx[None]).all(0)
    best, bestc = idx.copy(), np.zeros_like(idx)
    for k in np.unique(nb):
        c = (nb == k).sum(0)
        upd = c > bestc
        best[upd], bestc[upd] = k, c[upd]
    ch = alone & (D[idx, best] < de)
    return np.where(ch, best, idx)


# ⑥ 검사 -----------------------------------------------------------------------------------------------
TOL = 8  # 잣대 허용 ΔE: 정본 장면은 색 수를 줄이지 않아 같은 면도 칸마다 RGB가 조금씩 달라서, 「같은 색」을 ΔE < TOL로 잰다


def same(a, b):
    return np.sqrt(((a - b) ** 2).sum(-1)) < TOL


def lonely(a):
    """외톨이 칸 비율: 8이웃이 모두 자기와 다른 색(ΔE ≥ TOL)인 칸 / 안쪽 칸 전체 — 대각 1도트 선(철망)은 외톨이가 아니다"""
    L = lab(a)
    c = L[1:-1, 1:-1]
    H, W = L.shape[:2]
    m = np.ones(c.shape[:2], dtype=bool)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if dy or dx:
                m &= ~same(c, L[1 + dy:H - 1 + dy, 1 + dx:W - 1 + dx])
    return float(m.mean())


def region_size(a):
    """평균 면 크기: 4-연결로 이웃끼리 ΔE < TOL인 덩어리의 평균 칸 수"""
    from scipy.sparse import coo_matrix
    from scipy.sparse.csgraph import connected_components
    L = lab(a)
    H, W = L.shape[:2]
    ids = np.arange(H * W).reshape(H, W)
    sx, sy = same(L[:, :-1], L[:, 1:]), same(L[:-1], L[1:])
    r = np.concatenate([ids[:, :-1][sx], ids[:-1][sy]])
    c = np.concatenate([ids[:, 1:][sx], ids[1:][sy]])
    n = connected_components(coo_matrix((np.ones(len(r)), (r, c)), shape=(H * W, H * W)), directed=False)[0]
    return float(H * W / n)


def ridges(a, thr=40):
    """1도트 선 칸: 가로 · 세로 · 두 대각 가운데 한 방향에서 양옆 두 칸보다 같은 쪽으로 thr 넘게 튀는 칸"""
    Lm = np.asarray(a, float) @ [0.299, 0.587, 0.114]
    c = Lm[1:-1, 1:-1]
    H, W = Lm.shape
    out = np.zeros_like(c, bool)
    for (dy, dx) in ((0, 1), (1, 0), (1, 1), (1, -1)):
        p = Lm[1 + dy:H - 1 + dy, 1 + dx:W - 1 + dx]
        q = Lm[1 - dy:H - 1 - dy, 1 - dx:W - 1 - dx]
        out |= ((c - p > thr) & (c - q > thr)) | ((p - c > thr) & (q - c > thr))
    return np.pad(out, 1)


def lines_of(a, thr=40):
    """1도트 선 칸: 능선 칸 가운데 8칸 넘게 이어지고 둘레(7×7) 능선 밀도가 20% 미만인 것 —
    그레인 얼룩이 빽빽한 면(흰 기물 몸의 거친 질감)의 능선은 선이 아니라 무늬라 뺀다. 철망 · 먹선 · 사슬 · 리벳 줄이 남는다."""
    r0 = ridges(a, thr)
    dens = ndi.uniform_filter(r0.astype(float), size=7)
    r0 &= dens < 0.2
    lb, n = ndi.label(r0, structure=np.ones((3, 3), bool))
    if not n:
        return r0
    sizes = ndi.sum(np.ones_like(lb), lb, index=np.arange(1, n + 1))
    return np.isin(lb, np.nonzero(sizes >= 8)[0] + 1)


def line_keep(before, after, thr=40):
    """1도트 선 보존율: before(② 칸 샘플)의 선 칸 가운데 after에서도 능선(대비 thr/2 초과)인 비율 · 선 칸 수"""
    keep = lines_of(before, thr)
    if not keep.sum():
        return 1.0, 0
    r1 = ridges(after, thr / 2)
    return float((r1 & keep).sum() / keep.sum()), int(keep.sum())


def metrics(a):
    return {'colors': int(len(np.unique(a.reshape(-1, 3), axis=0))), 'lonely': round(lonely(a), 4), 'region': round(region_size(a), 2)}


# 실행 ---------------------------------------------------------------------------------------------------
def build(name, r):
    src = Image.open(ORDER / r['source']).convert('RGB')
    m = measure(src)
    if r.get('x'):  # D-570: 축마다 실측(gridmeasure.measure) 간격 · 시작점 — 정사각 하나로 묶지 않는다
        m.update({'pitchMeasured': m['pitch'], 'pitch': round((r['x'][0] * r['y'][0]) ** 0.5, 3), 'pitchX': r['x'][0], 'pitchY': r['y'][0],
                  'ox': r['x'][1], 'oy': r['y'][1]})
    elif r.get('pitch'):  # 실측 봉우리가 둘 이상일 때 대조판을 보고 고른 간격 (scene_recipe 주석에 까닭)
        a = np.asarray(src, float)
        m['pitchMeasured'] = m['pitch']
        m['pitch'] = r['pitch']
        m['ox'] = round(float(snap._score(snap._profile(a, 1), a.shape[1], r['pitch'])[1]), 2)
        m['oy'] = round(float(snap._score(snap._profile(a, 0), a.shape[0], r['pitch'])[1]), 2)
    xe, ye, mode = cuts_for(src, m)
    raw = sample(src, xe, ye)
    L = lab(raw)
    L = sigma_median(L, r['sigma'], r['iters'])
    C, idx, err, K = palette(L, r.get('kmin', 24), r.get('kmax', 48))
    idx = merge_small(idx, C, r['merge'], r['merge_de'])
    idx = mode_filter(idx, C, r['mode_de'])
    idx = merge_small(idx, C, r['merge'], r['merge_de'])
    idx = singles(idx, C, r['single_de'])
    pal = unlab(C)
    out = pal[idx]
    used = np.unique(idx)
    if r.get('cells'):
        assert [len(xe) - 1, len(ye) - 1] == list(r['cells']), f'{name}: 격자 {len(xe) - 1}×{len(ye) - 1}가 기록 {r["cells"]}와 다르다'
    m.update({'grid': mode, 'cells': [len(xe) - 1, len(ye) - 1], 'cellW': round(src.width / (len(xe) - 1), 3),
              'cellH': round(src.height / (len(ye) - 1), 3), 'paletteK': int(K), 'meanDE': round(err, 2), 'used': int(len(used))})
    return src, raw, out, m, (xe, ye)


def grainiest(cur):
    """지금 게임 그림에서 외톨이 칸이 가장 빽빽한 자리(벽 · 바닥 그레인) — 대조판 둘째 자르기 중심 (0~1)"""
    L = lab(np.asarray(cur))
    c = L[1:-1, 1:-1]
    H, W = L.shape[:2]
    m = np.ones(c.shape[:2], bool)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if dy or dx:
                m &= ~same(c, L[1 + dy:H - 1 + dy, 1 + dx:W - 1 + dx])
    d = ndi.uniform_filter(m.astype(float), size=(31, 41))
    y, x = np.unravel_index(d.argmax(), d.shape)
    return (x + 1) / W, (y + 1) / H


def sheet_for(name, src, cur, out, rep, cuts):
    """대조판: 줄마다 원본 1:1 자르기(3배 계단) | 지금 게임 그림 | 새 그림 — 같은 자리. 1줄 = 초점(EVENT_FOCUS), 2줄 = 지금 그림의
    그레인이 가장 빽빽한 자리, 3줄 = 전체 세 장"""
    z = 3
    W, H = src.size
    cw, ch = 240, 180
    fw = cw * z
    pad = 8

    def crops(fx, fy):
        x0, y0 = max(0, min(W - cw, int(W * fx) - cw // 2)), max(0, min(H - ch, int(H * fy) - ch // 2))
        A = src.crop((x0, y0, x0 + cw, y0 + ch)).resize((fw, ch * z), Image.NEAREST)
        res = [A]
        xe, ye = np.asarray(cuts[0]), np.asarray(cuts[1])
        for img in (cur, out):
            if img is out:  # 새 그림은 실제 칸 경계로 (dp 격자는 고르지 않다)
                b = (int(np.searchsorted(xe, x0)), int(np.searchsorted(ye, y0)), int(np.searchsorted(xe, x0 + cw)), int(np.searchsorted(ye, y0 + ch)))
            else:
                b = (round(x0 / W * img.width), round(y0 / H * img.height), round((x0 + cw) / W * img.width), round((y0 + ch) / H * img.height))
            c = img.crop(b)
            k = fw / c.width
            res.append(c.resize((fw, round(c.height * k)), Image.NEAREST))
        return res, (x0, y0)
    r1, p1 = crops(rep['fx'], rep['fy'])
    gx, gy = grainiest(cur)
    r2, p2 = crops(gx, gy)
    full = [src.resize((fw, round(fw * H / W)), Image.NEAREST)] + [im.resize((fw, round(fw * im.height / im.width)), Image.NEAREST) for im in (cur, out)]
    rows = [r1, r2, full]
    hs = [max(i.height for i in r) for r in rows]
    sh = Image.new('RGB', (3 * fw + 4 * pad, sum(hs) + len(rows) * (22 + pad)), (20, 19, 24))
    d = ImageDraw.Draw(sh)
    labels = [f"{name}: source 1:1 crop @({p1[0]},{p1[1]}) x{z} | old {cur.width}x{cur.height} | new {out.width}x{out.height}  pitch {rep['pitch']}px ({rep['grid']})  "
              f"colors {rep['before']['colors']}->{rep['after']['colors']}  lonely {rep['before']['lonely']}->{rep['after']['lonely']}  "
              f"region {rep['before']['region']}->{rep['after']['region']}  lines {rep['lineKeep']}",
              f"grainiest area of old @({p2[0]},{p2[1]}): source | old | new", 'full: source | old | new']
    y = 0
    for lab_, r, h in zip(labels, rows, hs):
        d.text((pad, y + 5), lab_, fill=(250, 204, 21))
        for k, im in enumerate(r):
            sh.paste(im, (pad + k * (fw + pad), y + 22))
        y += 22 + h + pad
    return sh


def focus_of(name):
    """src/data/event-talk.ts EVENT_FOCUS에서 초점(대조판 자르기 자리)"""
    import re
    t = (ROOT / 'src/data/event-talk.ts').read_text()
    m = re.search(name + r': \[([\d.]+), ([\d.]+)\]', t)
    return (float(m.group(1)), float(m.group(2))) if m else (0.5, 0.5)


# ⑦ 사내 손질 (D-570 · D-572: 지우기 · 다시 칠하기 · 자르기만 — 그림에 게임 판 정본 스프라이트를 얹지 않는다) ---------------------------------------
def erase_boxes(out, boxes):
    """상자 [x0, y0, x1, y1](도트) 안을 지운다: 줄마다 상자 왼쪽 · 오른쪽 바깥 두 칸 가운데 상자에 가까운 쪽 색으로 —
    벽 띠 · 리벳 줄처럼 가로로 이어진 면이 그대로 이어진다(새 모양을 그리지 않는다)"""
    a = np.asarray(out).copy()
    for x0, y0, x1, y1 in boxes:
        for y in range(y0, y1):
            left, right = a[y, x0 - 1].copy(), a[y, x1].copy()
            mid = (x0 + x1) / 2
            for x in range(x0, x1):
                a[y, x] = left if x < mid else right
    return a


def main():
    args = sys.argv[1:]
    dry = '--dry' in args
    outdir = None
    if '--out' in args:
        outdir = Path(args[args.index('--out') + 1])
        args = [a for i, a in enumerate(args) if a != '--out' and (i == 0 or args[i - 1] != '--out')]
    names = [n for n in args if not n.startswith('--')] or list(EVENT_IMPORT)
    sheets = outdir or (ORDER / 'EV-import')
    sheets.mkdir(parents=True, exist_ok=True)
    rpath = ORDER / 'EV-import-report.json'
    report = json.loads(rpath.read_text()) if rpath.exists() else {}
    if 'canon' not in report:
        report['canon'] = {c: metrics(np.asarray(Image.open(ROOT / 'public/scenes' / f'{c}.png').convert('RGB'))) for c in CANON}
    for n in names:
        r = EVENT_IMPORT[n]
        dst = ROOT / 'public/scenes' / f'{n}.png'
        old_p = ORDER / 'EV-import' / 'old' / f'{n}.png'  # D-538 판(바꾸기 전 게임 그림)을 대조용으로 남긴다
        if not old_p.exists():
            old_p.parent.mkdir(parents=True, exist_ok=True)
            Image.open(dst).convert('RGB').save(old_p)
        cur = Image.open(old_p).convert('RGB')
        src, raw, out, m, cuts = build(n, r)
        lk, nl = line_keep(raw, out)
        if r.get('erase'):
            out = erase_boxes(out, r['erase'])
        o = Image.fromarray(out, 'RGB')
        fx, fy = focus_of(n)
        rep = dict(m, before=metrics(np.asarray(cur)), raw=metrics(raw), after=metrics(out), lineKeep=round(lk, 3), lineCells=nl, fx=fx, fy=fy)
        report[n] = rep
        print(n, json.dumps({k: rep[k] for k in ('px', 'py', 'pitch', 'grid', 'cells', 'used', 'meanDE', 'lineKeep')}), 'before', rep['before'], 'after', rep['after'], flush=True)
        sheet_for(n, src, cur, o, rep, cuts).save(sheets / f'{n}.png', optimize=True)
        if not dry:
            o.save(dst, optimize=True)
            crown_unify.after_save(dst)
    if not dry:
        rpath.write_text(json.dumps(report, ensure_ascii=False, indent=1) + '\n')


if __name__ == '__main__':
    main()
