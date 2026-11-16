"""
발주 기물 반입 (D-423 절차 · D-086/D-221 기물 문법): 생성기 원본(흐릿한 가짜 도트) → pieces64.txt 격자 블록.

  python3 -I tools/pixel/piece_import.py <원본.png> <유형:이형> [--giant | --boss] [--write] [--preview out.png]

이형(흰 · 검 한 장, 왼쪽 흰 · 오른쪽 검):
  ① 실루엣 = 검은 진영 쪽에서 「흰 테보다 어두운」 칸 (알파 > 230 · 밝기 < 185) → 열고 닫기(7px)로 가장자리 번짐을 걷고 구멍을 메운다
  ② 격자 = 실루엣 높이를 정한 칸 수(scene_recipe.PIECE_GRID의 body)로 나눈 간격 — 칸마다 가운데 절반만 읽는다(번진 경계를 피한다)
  ③ 외곽선 = 실루엣 안쪽 테두리 `outline`칸 + 원본의 먹선(흰 진영 쪽 밝기 < 70) · 흰 테 = 실루엣 밖 체비쇼프 3칸 — 흑백 공용(D-221)
  ④ 속 칠 = 흰 진영 밝기를 흰 팔레트 5단계(V W E S G)로 가까운 값에 맞추고 3×3 다수결로 낱점을 지운다.
     검은 진영은 같은 자리 · 같은 단계(H M B Z D) — 흑백이 칸 하나까지 같다(unify.py 규칙)
  ⑤ mirror = 실루엣(+ 'all'이면 먹선까지) 왼쪽 절반을 오른쪽에 비춘다 — 룩 · 퀸 바탕은 좌우 대칭(D-092)
거대(검 한 장, 128칸): 외곽선 2칸 · 흰 테 4칸, 속 칠은 검은 팔레트 5단계 + 녹 두 색(N #8A6416 · n #4A3414, 발주서 허용색)
  그대로 가장 가까운 색. 128칸 그림의 한가운데(64줄 · 64칸)가 네 부위 경계다.
2×2 보스(--boss, 검 한 장, 144칸 캔버스 그대로 — D-513 · 발주 GB-01~07 · b, D-523 첫 반입 GB-01):
  ① 마젠타 바탕(#FF00FF 근처)을 걷고 실루엣 = 그 밖 칸 → 열고 닫기 · 구멍 메우기 (이형 · 거대와 같다)
  ② 간격 = 실루엣 높이 / body(발주 키 128~132칸) — 1단계와 격노(b)는 같은 간격(scene_recipe.BOSS_GRID pitch_of)으로 읽어
     같은 크기 · 같은 받침 자리가 되게 한다. 가로 자리 = 꼭대기 십자의 가운데(받침 위 장식이 달라도 몸 축이 같다)
  ③ 받침 바닥 = 캔버스 맨 아래에서 bottom칸 위(발주 6칸), 흰 테 4칸 · 먹선 2칸(흑 기물 문법 D-221 — 흰 테는 도구가 붙인다)
  ④ 속 칠 = 검은 진영 다섯 색 + 반장 테마 색(cfg theme) + 황동 셋 중 가장 가까운 색 — 발주 팔레트 그대로, 원본 먹(밝기 < ink)은 외곽선
격자값(간격 · 칸 수)은 tools/pixel/scene_recipe.py PIECE_GRID · BOSS_GRID에 보존한다.
"""
import os
import sys

import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from scene_recipe import BOSS_GRID, GIANT_GRID, PIECE_GRID  # noqa: E402

PIECES = os.path.join(HERE, 'pieces64.txt')

WHITE = {'V': (255, 255, 255), 'W': (0xF1, 0xEE, 0xEC), 'E': (0xE2, 0xDE, 0xD6), 'S': (0xC5, 0xC3, 0xC3), 'G': (0x85, 0x84, 0x88)}
TO_BLACK = {'V': 'H', 'W': 'M', 'E': 'B', 'S': 'Z', 'G': 'D'}
GIANT = {'H': (0x6E, 0x71, 0x7E), 'M': (0x48, 0x4A, 0x55), 'B': (0x32, 0x34, 0x3D), 'Z': (0x26, 0x27, 0x2E), 'D': (0x1C, 0x1D, 0x22),
         'N': (0x8A, 0x64, 0x16), 'n': (0x4A, 0x34, 0x14)}
# 2×2 보스 (발주 GB 팔레트): 검은 진영 다섯 + 황동 셋(N U u) — 테마 색은 BOSS_GRID theme(maker.PAL64 글자)으로 더한다
BOSS_BASE = {'H': (0x6E, 0x71, 0x7E), 'M': (0x48, 0x4A, 0x55), 'B': (0x32, 0x34, 0x3D), 'Z': (0x26, 0x27, 0x2E), 'D': (0x1C, 0x1D, 0x22),
             'N': (0x8A, 0x64, 0x16), 'U': (0xC8, 0x9B, 0x3C), 'u': (0xF5, 0xC5, 0x42)}


def lum(rgb):
    return rgb[..., 0] * 0.299 + rgb[..., 1] * 0.587 + rgb[..., 2] * 0.114


def silhouette(a, L):
    """실루엣 마스크: 흰 테보다 어두운 칸 → 열기 · 닫기 → 구멍 메우기"""
    m = ((a > 230) & (L < 185)).astype(np.uint8) * 255  # 바깥 번짐(알파 130~200 · 6px 띠)은 뺀다
    im = Image.fromarray(m).filter(ImageFilter.MinFilter(7)).filter(ImageFilter.MaxFilter(7))
    im = im.filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.MinFilter(7))
    s = np.array(im) > 0
    # 구멍 메우기: 바깥에서 닿지 않는 빈칸은 안쪽
    out = np.zeros_like(s)
    h, w = s.shape
    stack = [(0, 0)]
    out[0, 0] = True
    while stack:
        y, x = stack.pop()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            yy, xx = y + dy, x + dx
            if 0 <= yy < h and 0 <= xx < w and not out[yy, xx] and not s[yy, xx]:
                out[yy, xx] = True
                stack.append((yy, xx))
    return ~out


def sample(mask_or_val, x0, y0, p, cols, rows, how):
    """격자 칸마다 가운데 절반을 읽는다 (how: 'mean' | 'median' | 'mode-rgb')"""
    res = np.zeros((rows, cols) + (mask_or_val.shape[2:] if mask_or_val.ndim == 3 else ()), dtype=float)
    for j in range(rows):
        for i in range(cols):
            ya, yb = int(y0 + (j + 0.25) * p), int(y0 + (j + 0.75) * p) + 1
            xa, xb = int(x0 + (i + 0.25) * p), int(x0 + (i + 0.75) * p) + 1
            blk = mask_or_val[ya:yb, xa:xb]
            if how == 'mean':
                res[j, i] = blk.mean()
            else:
                res[j, i] = np.median(blk.reshape(-1, blk.shape[-1]) if blk.ndim == 3 else blk.ravel(), axis=0)
    return res


def largest(mask):
    """가장 큰 4-이웃 덩어리만 남긴다 — 원본 스티커 테 바깥의 가는 먹줄(생성기 버릇)을 걷는다"""
    h, w = mask.shape
    seen = np.zeros_like(mask)
    best = []
    for y0 in range(h):
        for x0 in range(w):
            if mask[y0, x0] and not seen[y0, x0]:
                comp, stack = [], [(y0, x0)]
                seen[y0, x0] = True
                while stack:
                    y, x = stack.pop()
                    comp.append((y, x))
                    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        yy, xx = y + dy, x + dx
                        if 0 <= yy < h and 0 <= xx < w and mask[yy, xx] and not seen[yy, xx]:
                            seen[yy, xx] = True
                            stack.append((yy, xx))
                if len(comp) > len(best):
                    best = comp
    out = np.zeros_like(mask)
    for y, x in best:
        out[y, x] = True
    return out


def keep_parts(mask, n):
    """4-이웃 덩어리 중 n칸 이상만 남긴다(가장 큰 덩어리는 늘)"""
    h, w = mask.shape
    seen = np.zeros_like(mask)
    out = np.zeros_like(mask)
    comps = []
    for y0 in range(h):
        for x0 in range(w):
            if mask[y0, x0] and not seen[y0, x0]:
                comp, stack = [], [(y0, x0)]
                seen[y0, x0] = True
                while stack:
                    y, x = stack.pop()
                    comp.append((y, x))
                    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        yy, xx = y + dy, x + dx
                        if 0 <= yy < h and 0 <= xx < w and mask[yy, xx] and not seen[yy, xx]:
                            seen[yy, xx] = True
                            stack.append((yy, xx))
                comps.append(comp)
    big = max(len(c) for c in comps)
    for c in comps:
        if len(c) >= n or len(c) == big:
            for y, x in c:
                out[y, x] = True
    return out


def cheb(mask, r):
    """마스크를 체비쇼프 r칸 넓힌다"""
    out = mask.copy()
    h, w = mask.shape
    ys, xs = np.nonzero(mask)
    for y, x in zip(ys, xs):
        out[max(0, y - r):min(h, y + r + 1), max(0, x - r):min(w, x + r + 1)] = True
    return out


def inner_edge(mask, t):
    """실루엣 안쪽 테두리 t칸 (바깥과 체비쇼프 t칸 안)"""
    return mask & cheb(~mask, t)


def majority(grid, body, keys):
    """몸 칸의 낱점을 3×3 다수결로 (가운데 포함, 같은 수면 그대로)"""
    out = grid.copy()
    h, w = grid.shape
    for y in range(h):
        for x in range(w):
            if not body[y, x]:
                continue
            cnt = {}
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < h and 0 <= xx < w and body[yy, xx]:
                        cnt[grid[yy, xx]] = cnt.get(grid[yy, xx], 0) + 1
            best = max(cnt, key=cnt.get)
            if cnt.get(grid[y, x], 0) <= 1 and cnt[best] >= 3:
                out[y, x] = best
    return out


def nearest(rgb, pal):
    keys = list(pal)
    arr = np.array([pal[k] for k in keys], dtype=float)
    d = ((rgb[..., None, :] - arr) ** 2).sum(-1)
    return np.array(keys, dtype=object)[d.argmin(-1)]


def build(src, name, giant=False):
    """원본 → {(이름, 진영): 줄 목록}, 보고용 수치"""
    cfg = PIECE_GRID[name]
    im = np.array(Image.open(src).convert('RGBA')).astype(float)
    h, w = im.shape[:2]
    a, L = im[..., 3], lum(im[..., :3])
    N = 128 if giant else 64
    rim = 4 if giant else 3
    if giant:
        halves = [(0, w)]
    else:
        halves = [(0, w // 2), (w // 2, w)]
    # 실루엣은 검은 쪽(거대는 한 장)에서 — 흰 테와 몸이 밝기로 갈린다
    blo, bhi = halves[-1]
    S = silhouette(a[:, blo:bhi], L[:, blo:bhi])
    ys, xs = np.nonzero(S)
    by0, by1, bx0, bx1 = ys.min(), ys.max(), xs.min(), xs.max()
    p = (by1 - by0 + 1) / cfg['body']
    rows = cfg['body']
    cols = int(round((bx1 - bx0 + 1) / p))
    body = largest(sample(S.astype(float), bx0, by0, p, cols, rows, 'mean') > 0.5)
    # 두 번째 읽기: 먹줄을 걷은 실루엣 상자로 간격을 다시 잡는다
    jj, ii = np.nonzero(body)
    by0, by1 = by0 + jj.min() * p, by0 + (jj.max() + 1) * p - 1
    bx0, bx1 = bx0 + ii.min() * p, bx0 + (ii.max() + 1) * p - 1
    p = (by1 - by0 + 1) / cfg['body']
    cols = int(round((bx1 - bx0 + 1) / p))
    body = largest(sample(S.astype(float), bx0, by0, p, cols, rows, 'mean') > 0.5)
    if giant:
        rgb = sample(im[:, blo:bhi, :3], bx0, by0, p, cols, rows, 'median')
        Kc = sample((L[:, blo:bhi] < 22).astype(float), bx0, by0, p, cols, rows, 'mean') > 0.5
        fill = nearest(rgb, GIANT)
    else:
        # 흰 쪽은 같은 크기 · 같은 자리 (테두리 상자 맞춤)
        wlo, whi = halves[0]
        wa = (a[:, wlo:whi] > 128)
        wys, wxs = np.nonzero(wa)
        bys, bxs = np.nonzero(a[:, blo:bhi] > 128)
        ox, oy = wxs.min() - bxs.min(), wys.min() - bys.min()
        Lw = L[:, wlo:whi]
        Kc = sample((Lw < 70).astype(float), bx0 + ox, by0 + oy, p, cols, rows, 'mean') > 0.5
        lw = sample(Lw, bx0 + ox, by0 + oy, p, cols, rows, 'median')
        wl = {k: lum(np.array(v, dtype=float)) for k, v in WHITE.items()}
        keys = list(wl)
        fill = np.array([[keys[int(np.argmin([abs(v - wl[k]) for k in keys]))] for v in row] for row in lw], dtype=object)
    mir = cfg.get('mirror')
    if mir:
        c = cols
        for x in range(c // 2):
            body[:, c - 1 - x] = body[:, x]
            if mir == 'all':
                Kc[:, c - 1 - x] = Kc[:, x]
    t = cfg['outline']
    K = (inner_edge(body, t) | Kc) & body
    fill = majority(fill, body & ~K, None)
    # 72칸 캔버스 규칙: 아래 맞춤(흰 테 rim칸 아래), 가운데 정렬
    top = N - rim - rows
    left = (N - cols) // 2 + cfg.get('dx', 0)
    assert top >= rim and left >= rim and left + cols + rim <= N, (name, rows, cols)
    canvas_body = np.zeros((N, N), bool)
    canvas_body[top:top + rows, left:left + cols] = body
    ring = cheb(canvas_body, rim) & ~canvas_body
    out = {}
    sides = (1,) if giant else (0, 1)
    for side in sides:
        g = [['.'] * N for _ in range(N)]
        for y in range(N):
            for x in range(N):
                if ring[y, x]:
                    g[y][x] = 'O'
        for j in range(rows):
            for i in range(cols):
                if not body[j, i]:
                    continue
                if K[j, i]:
                    ch = 'K'
                else:
                    ch = fill[j, i]
                    if side == 1 and not giant:
                        ch = TO_BLACK[ch]
                g[top + j][left + i] = ch
        out[(name, side)] = [''.join(r) for r in g]
    info = {'pitch': round(float(p), 2), 'cols': cols, 'rows': rows, 'top': top, 'left': left}
    return out, info


def is_key(rgb, strict=False):
    """마젠타 바탕(오려 내는 색)인가 — strict(D-526 자석 반장): 보라 자기장 · 번개(G 60~120 · B > R)를 바탕으로 걷지 않게
    초록이 거의 없고 빨강 ≈ 파랑인 칸만"""
    if strict:
        return (rgb[..., 0] > 140) & (rgb[..., 2] > 140) & (rgb[..., 1] < 48) & (np.abs(rgb[..., 0] - rgb[..., 2]) < 28)
    return (rgb[..., 0] > 150) & (rgb[..., 2] > 150) & (rgb[..., 1] < 120)


def boss_box(src, strict=False):
    """원본 실루엣 · 상자 (y0, y1, x0, x1) · 꼭대기 장식 가운데 x"""
    rgb = np.array(Image.open(src).convert('RGB')).astype(float)
    a = np.where(is_key(rgb, strict), 0, 255).astype(float)
    S = silhouette(a, np.zeros_like(a))
    ys, xs = np.nonzero(S)
    y0, y1 = ys.min(), ys.max()
    top = np.nonzero(S[y0:y0 + max(8, (y1 - y0) // 12)])[1]
    return rgb, S, (y0, y1, xs.min(), xs.max()), (top.min() + top.max() + 1) / 2


def clean_dots(grid, body, keep, passes=2):
    """1칸 잔무늬 정리 (D-524): 몸 칸 중 네 이웃(위아래좌우) 가운데 같은 색이 하나도 없는 칸(리벳 · 낱점)을
    이웃 다수 색으로 — keep(외곽선) 칸은 건드리지 않는다. 두 칸 이상 이어진 덩어리(렌즈 · 집게 · 철판 선)는 남는다."""
    h, w = grid.shape
    for _ in range(passes):
        out = grid.copy()
        for y in range(h):
            for x in range(w):
                if not body[y, x] or keep[y, x]:
                    continue
                nb = [grid[y + dy, x + dx] for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1))
                      if 0 <= y + dy < h and 0 <= x + dx < w and body[y + dy, x + dx]]
                if nb and grid[y, x] not in nb:
                    out[y, x] = max(sorted(set(nb)), key=nb.count)
        grid = out
    return grid


def build_boss(src, name, res=None):
    """2×2 보스 원본 → {(이름, 1): 144줄}, 보고용 수치 (D-524 기물 문법 맞춤).
    몸은 72칸 캔버스 격자(몸 키 cfg body ≈ 64칸)로 복원 → 칸마다 2×2로 펴서 144칸 캔버스에 — 판 2×2 위에서 보스 그림 한 장의
    도트 수가 일반 기물 한 장(72칸 캔버스)과 같다. 먹선 = 72칸 격자 outline칸(기본 2 = 판 위 일반 흑 기물 먹 테 4~5칸과 같은 굵기),
    흰 테 = 144칸 격자 3칸(일반 기물과 같은 두께 · 같은 흰색).
    res=144(D-527 판 해상도 시안, tools/pixel/gb_fit.py `fine`): 펴지 않고 144칸 격자로 바로 읽는다 — 보스 도트 한 칸 = 보통 기물 도트 한 칸.
    몸 키 · 받침 · 먹선 · 떠 있는 조각 하한 · patch는 같은 판 위 크기가 되게 배수로 늘린다(기본 res=72는 그대로).
    거대 주물(D-527, scene_recipe.GIANT_GRID — 재발주본 G-01~03): canvas = res = 108칸(보통 기물 72칸의 1.5배, 판에서 1.5칸 폭 · 펴지 않음 —
    도트 한 칸 = 보통 기물 도트 한 칸), 몸 키는 72칸 단위(바탕 기물 키)에 1.5배, 먹선 outline_px칸(보통 흑 기물 먹 테 4칸)."""
    import maker
    cfg = BOSS_GRID[name] if name in BOSS_GRID else GIANT_GRID[name]
    N, C, rim = cfg.get('canvas', 144), res or cfg.get('res', 72), 3
    f = N // C  # 격자 한 칸 = 캔버스 f×f
    strict = cfg.get('key') == 'strict'
    rgb, S, (y0, y1, x0, x1), cx = boss_box(src, strict)
    if cfg.get('pitch_of'):  # 격노는 1단계 원본과 같은 간격
        _, _, (py0, py1, _, _), _ = boss_box(os.path.join(os.path.dirname(src), cfg['pitch_of']), strict)
        p = (py1 - py0 + 1) / (BOSS_GRID[cfg['pitch_name']]['body'] * C / 72)
    else:
        p = (y1 - y0 + 1) / (cfg['body'] * C / 72)
    rows = int(round((y1 - y0 + 1) / p))
    bottom = C - cfg.get('bottom', 3) * C // 72  # 받침 바닥 줄 다음 (72칸 격자)
    top = bottom - rows
    # 가로: 십자 가운데가 캔버스 가운데(36칸)에 — 칸 c의 원본 x = cx + (c + 0.5 - 36) * p
    c0 = int(np.floor(C / 2 - (cx - x0) / p))
    c1 = int(np.ceil(C / 2 + (x1 + 1 - cx) / p))
    ox = cx - C / 2 * p
    cols = c1 - c0
    oy = y1 + 1 - rows * p
    raw = sample(S.astype(float), ox + c0 * p, oy, p, cols, rows, 'mean') > 0.5
    body = largest(raw)
    if cfg.get('float'):  # 떠다니는 조각(D-526 자석 격노): 몸에서 떨어진 덩어리도 float칸 이상이면 남긴다
        body = keep_parts(raw, cfg['float'] * (C // 72) ** 2)
    # 팔레트: 검은 진영 다섯 단(D-221) + 반장 테마 강조색 2~3단(cfg theme) — 그 밖의 명암 · 황동은 가까운 단으로.
    # 원본 화소마다 먼저 글자로 가른다: 먹(밝기 < ink) / 강조(채도 ≥ sat → 가장 가까운 테마 색) / 그 밖 = 밝기로 가장 가까운 검은 단.
    #   테마 밖 채색은 cfg alias로 검은 단에 돌린다(예: 검수 ✕ 계기의 황동 테 → 쇠).
    # 그다음 칸마다 칸 전체에서 가장 많은 글자(강조는 accent 배 가중 — 가는 금 · 렌즈 테가 살아남게)
    grey = {k: BOSS_BASE[k] for k in 'HMBZD'}
    accent = {k: maker.PAL64[k] for k in cfg['theme']}
    pale = {k: maker.PAL64[k] for k in cfg.get('pale', (0, ''))[1]}
    accent.update(pale)  # 흰 단도 강조 칸처럼 센다(가중은 강조와 같음)
    keys = ['K'] + list(grey) + list(accent)
    L = lum(rgb)
    sat = rgb.max(-1) - rgb.min(-1)
    gl = np.array([lum(np.array(v, dtype=float)) for v in grey.values()])
    lab = 1 + np.abs(L[..., None] - gl).argmin(-1)
    # 빛 단 H는 일반 흑 기물처럼 드물게(가장 밝은 모서리만) — 밝기 hi 미만은 M으로. 반장 색(FOE_TONE)에서 H가 가장 밝은 색이 되므로 남발하면 판 위가 시끄럽다
    lab = np.where((lab == 1) & (L < cfg.get('hi', 150)), 2, lab)
    # alias: 테마 밖 채색(황동 테 · 짙은 빨강 등)을 검은 단으로 돌린다 — {'#RRGGBB': 글자}
    cand = [(v, keys.index(k)) for k, v in accent.items() if k not in pale]
    cand += [(tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)), keys.index(k)) for h, k in cfg.get('alias', {}).items()]
    av = np.array([c for c, _ in cand], dtype=float)
    acc_i = np.array([i for _, i in cand])[((rgb[..., None, :] - av) ** 2).sum(-1).argmin(-1)]
    lab = np.where(sat >= cfg.get('sat', 48), acc_i, lab)
    if cfg.get('bright'):  # 무채색 밝은 칸을 테마 색으로(D-526 출하 반장 은빛 가시 끝) — (밝기 하한, 글자)
        thr, ch = cfg['bright']
        lab = np.where((sat < cfg.get('sat', 48)) & (L >= thr), keys.index(ch), lab)
    if cfg.get('pale'):  # 무채색 밝은 칸을 흰 진영 단으로(D-527 도금왕 격노 — 금박 밑 흰 폰 몸) — (밝기 하한, 흰 글자들)
        thr, ws = cfg['pale']
        wl = np.array([lum(np.array(maker.PAL64[k], dtype=float)) for k in ws])
        wi = np.array([keys.index(k) for k in ws])[np.abs(L[..., None] - wl).argmin(-1)]
        lab = np.where((sat < cfg.get('sat', 48)) & (L >= thr), wi, lab)
    lab = np.where(L < cfg.get('ink', 12), 0, lab)
    lab = np.where(is_key(rgb, strict), len(keys), lab)  # 마젠타 바탕은 세지 않는다
    wgt = np.array([1.0] + [1.0] * len(grey) + [cfg.get('accent', 1.6)] * len(accent))
    fill = np.empty((rows, cols), dtype=object)
    for j in range(rows):
        for i in range(cols):
            ya, yb = int(oy + j * p), int(oy + (j + 1) * p)
            xa, xb = int(ox + (c0 + i) * p), int(ox + (c0 + i + 1) * p)
            cnt = np.bincount(lab[ya:yb, xa:xb].ravel(), minlength=len(keys) + 1)[:len(keys)] * wgt
            fill[j, i] = keys[int(cnt.argmax())]
    edge = inner_edge(body, cfg['outline_px'] if 'outline_px' in cfg else cfg.get('outline', 2) * C // 72)
    if cfg.get('float_edge'):  # D-527: 떠 있는 작은 조각(불티 · 금박 파편)은 먹선 1칸 — 2칸이면 속이 다 먹으로 덮인다
        main = largest(body)
        edge = (edge & main) | (inner_edge(body, C // 72) & ~main)
    if cfg.get('accent_edge'):  # D-526: 가는 가시 · 조각 끝의 테마 색(진홍 가시 끝 · 보라 조각)은 먹선 안쪽 줄에서 살린다 — 바깥 1칸만 먹
        keep = edge & ~inner_edge(body, C // 72) & np.isin(fill, list(accent))
        edge = edge & ~keep
    fill[edge] = 'K'
    for _ in range(cfg.get('smooth', 3)):  # 3×3 다수결 여러 번 — 원본의 잔 명암을 넓은 면으로
        fill = majority(fill, body & ~edge, None)
    fill = clean_dots(fill, body, edge)
    for (px, py, pw, ph) in [tuple(v * C // 72 for v in b) for b in cfg.get('patch', ())]:  # 받은 그림 다듬기(D-527): 72칸 격자 상자 안 먹 · 어두운 칸을 이웃 다수 색으로(얼굴처럼 읽히는 구멍 메우기)
        for j in range(py - top, py - top + ph):
            for i in range(px - c0, px - c0 + pw):
                if 0 <= j < rows and 0 <= i < cols and body[j, i] and not edge[j, i]:
                    nb = [fill[j + dy, i + dx] for dy in (-2, -1, 0, 1, 2) for dx in (-2, -1, 0, 1, 2)
                          if 0 <= j + dy < rows and 0 <= i + dx < cols and body[j + dy, i + dx] and fill[j + dy, i + dx] not in 'KDZ']
                    if nb and fill[j, i] in 'KDZ':
                        fill[j, i] = max(sorted(set(nb)), key=nb.count)
    assert top >= 2 * C // 72 and c0 >= 2 * C // 72 and c1 + 2 * C // 72 <= C, (name, top, c0, c1)
    # 144칸으로 펴기 (칸마다 2×2) + 흰 테 3칸
    big = np.zeros((N, N), bool)
    g = [['.'] * N for _ in range(N)]
    for j in range(rows):
        for i in range(cols):
            if body[j, i]:
                for dy in range(f):
                    for dx in range(f):
                        y, x = f * (top + j) + dy, f * (c0 + i) + dx
                        big[y, x] = True
                        g[y][x] = fill[j, i]
    ring = cheb(big, rim) & ~big
    for y, x in zip(*np.nonzero(ring)):
        g[y][x] = 'O'
    used = {}
    for j in range(rows):
        for i in range(cols):
            if body[j, i]:
                used[fill[j, i]] = used.get(fill[j, i], 0) + 1
    info = {'pitch': round(float(p), 2), 'rows': rows, 'cols': cols, 'top': top, 'left': c0, 'colors': used}
    return {(name, 1): [''.join(r) for r in g]}, info


def write(blocks):
    """pieces64.txt에서 같은 이름 블록을 갈거나 끝에 붙인다"""
    text = open(PIECES, encoding='utf-8').read().split('\n')
    for (name, side), rows in blocks.items():
        head = f'[{name} {side}]'
        if head in text:
            i = text.index(head)
            j = i + 1
            while j < len(text) and text[j] and not text[j].startswith('['):
                j += 1
            text[i + 1:j] = rows
        else:
            while text and text[-1] == '':
                text.pop()
            text += ['', head] + rows
    open(PIECES, 'w', encoding='utf-8').write('\n'.join(text).rstrip('\n') + '\n')


if __name__ == '__main__':
    argv = sys.argv[1:]
    if '--preview' in argv:
        i = argv.index('--preview')
        argv = argv[:i] + argv[i + 2:]
    args = [x for x in argv if not x.startswith('--')]
    src, name = args[0], args[1]
    giant = '--giant' in sys.argv
    blocks, info = build_boss(src, name) if '--boss' in sys.argv or (giant and name in GIANT_GRID) else build(src, name, giant)
    print(name, info)
    if '--preview' in sys.argv:  # 확인용 확대 (흰 테까지 · 배경 투명)
        import maker
        (key, side), grid = next(iter(blocks.items()))
        maker.render64(grid, side, 4).save(sys.argv[sys.argv.index('--preview') + 1])
    if '--write' in sys.argv:
        write(blocks)
        if ('--boss' in sys.argv or giant) and src.endswith('-source.png'):  # 대조판 <ID>-check.png: 원본(축소) | 결과(흰 테까지 계단 확대) — 같은 높이
            import maker
            (key, side), grid = next(iter(blocks.items()))
            out = maker.render64(grid, side, 4)
            o = Image.open(src).convert('RGB').resize((out.height, out.height), Image.LANCZOS)
            chk = Image.new('RGB', (o.width + out.width + 8, out.height), (24, 23, 30))
            chk.paste(o, (0, 0))
            chk.paste(out, (o.width + 8, 0), out)
            chk.save(src.replace('-source.png', '-check.png'))
        print('pieces64.txt 갱신:', ', '.join(f'[{n} {s}]' for n, s in blocks))
