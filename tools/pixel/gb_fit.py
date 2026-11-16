"""
2×2 반장(GB) · 거대 주물(G) · 이형(P) 판 위 어울림 후보 (D-526 · D-527). **D-528: 묶음 M이 기본값으로 확정** —
piece_import.py가 반입 끝에 이 파일의 apply(clean → accent → soft2n → tone)를 부른다. 이 도구는 다른 안과 비교할 때만 쓴다(원본을 안 M 없이 다시 읽는다).

  python3 -I tools/pixel/gb_fit.py <출력 폴더> <안,안,...> [이름 ...]
  python3 -I tools/pixel/gb_fit.py <출력 폴더> A|B|M72|M     (D-527 묶음 이름 — 아래)

pieces64.txt의 [K:boss-* 1] · [P|R|Q:giant 1] · [*:cannon 0|1] … 블록(또는 받은 원본)을 읽어 후보 처리를 더한 그림을 public/pieces와
**같은 파일 이름**으로 <출력 폴더>에 찍는다(s- 2배 · l- 3배). public/pieces · pieces64.txt는 건드리지 않는다 — 판 위 비교는
`GBFIT_DIR=<출력 폴더> GBFIT_TAG=<안> node tools/slice-observe.cjs gbfit`(요청을 가로채 바꿔 끼움).
고른 안을 정본으로 삼으려면 같은 처리를 piece_import.py에 옮기고 DECISIONS에 남긴다.

후보(받은 그림 다듬기 · 코드 처리만, D-386 범위 — 새로 그리지 않음):
  grid72  거대 주물 128칸(보통 도트)을 72칸 격자(2×2 다수결)로 — 반장 2×2와 같은 도트 크기 (반장은 이미 72칸)
  coarse  원본을 몸 키 56칸 격자로 다시 읽는다(반장만 — piece_import.build_boss, 몸이 작아지고 도트 수가 준다)
  tone    명암 3단: 빛 단 H → M · 가장 어두운 D → Z (보통 흑 기물 분포 M 40 · B 33 · Z 22 · D 3 · H 0~1%에 가깝게). 금 몸(도금왕)은 I → n
  relight 보통 기물 빛 문법: 줄마다 몸 왼쪽 → 오른쪽 M · B · Z · D 띠(왼쪽 위 빛), 원본이 어두운 칸은 한 단 더 어둡게(형태 유지)
  soft1~3 (D-527 안 M) 약한 빛: 원본 단에서 **한 단만** 옮긴다(덮어쓰지 않음 — 소품 · 홈의 상대 명암이 남는다).
          큰 몸 덩어리(둘레 창이 모두 몸 재질 단 · 먹 · 강조 없음)에만. soft1 = 왼쪽 띠(몸 폭 33%) 한 단 밝게,
          soft2 = soft1 + 오른쪽 띠(25%) 한 단 어둡게, soft2n = soft2를 좁은 창(3×3)으로, soft3 = soft2를 덩어리 창 없이 몸 재질 칸 전체에
  accent  강조색 면적 제한: 3칸 미만 강조 덩어리는 쇠로, 강조 합이 몸의 5%(격노 10%)를 넘으면 작은 덩어리부터 쇠로 (몸 재질 단은 빼고)
  clean   잔무늬 정리 강화: 같은 색 4-이웃 덩어리 3칸 미만(속 먹 낱점 포함)을 이웃 다수 색으로
  open    실루엣 단순화: 1칸 폭 돌기 · 4칸 미만 떠 있는 조각을 걷고 먹선(2칸)을 다시 두른다
  mute    테마 강조색을 반장 몸 색(어두운 쇠) 쪽으로 30% 낮춘다(판 색과 덜 부딪게)
  fine    (D-527 판 해상도) 2×2를 144칸 격자 그대로 — 도트 한 칸 = 보통 기물 도트 한 칸. 반장은 받은 원본을 res=144로 다시 읽고
          (piece_import.build_boss), 거대는 128칸 그대로, 먹선 4칸(보통 흑 기물 먹 테와 같은 칸 수) · 흰 테 3칸. 덩어리 하한은 칸 수를 늘려 같은 판 위 크기로
  form    (D-527 이형) 받은 원본을 FORM_BODY 몸 키 · 먹선 FORM_OUTLINE칸으로 다시 읽는다(piece_import.build) — 흑백 같은 자리 · 같은 단(D-221)

묶음 (D-527): A = grid72,clean,accent,tone · B = A + relight · M72 = A + soft2n · M = fine + clean,accent,soft2n,tone (이형은 form + 같은 처리)
"""
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import maker  # noqa: E402
import piece_import as pi  # noqa: E402
from scene_recipe import BOSS_GRID, PIECE_GRID  # noqa: E402

GREYS = 'HMBZD'  # 밝은 → 어두운
ORDER = {c: i for i, c in enumerate(GREYS)}
TARGET = {'H': 0.01, 'M': 0.40, 'B': 0.33, 'Z': 0.21, 'D': 0.05}  # 보통 흑 기물 P · R · K · Q 속 칠(먹 뺌) 실측 비율
ROOT = os.path.dirname(os.path.dirname(HERE))
SRC = os.path.join(ROOT, 'build-res', 'order')
SOURCE_OF = {'K:boss-plate': 'GB-01', 'K:boss-plate-p2': 'GB-01b', 'K:boss-inspect': 'GB-02', 'K:boss-inspect-p2': 'GB-02b',
             'K:boss-spawn': 'GB-03', 'K:boss-spawn-p2': 'GB-03b', 'K:boss-magnet': 'GB-04', 'K:boss-magnet-p2': 'GB-04b',
             'K:boss-thorns': 'GB-05', 'K:boss-thorns-p2': 'GB-05b', 'K:boss-alarm': 'GB-06', 'K:boss-alarm-p2': 'GB-06b',
             'K:boss-gilded': 'GB-07', 'K:boss-gilded-p2': 'GB-07b',
             'P:giant': 'G-01', 'R:giant': 'G-02', 'Q:giant': 'G-03',
             'R:cannon': 'P-01', 'N:camel': 'P-02', 'Q:hopper': 'P-03', 'B:archbishop': 'P-04', 'R:chancellor': 'P-05'}
# 몸 재질 단(명암 계단, 밝은 → 어두운): 강조색 상한 · 잔무늬 · 빛은 이 계단 안에서만. 도금왕은 몸 전체가 금(GB-07), 격노는 흰 폰 몸까지.
RAMPS = {'K:boss-gilded': ('HMBZD', 'uUAnI'), 'K:boss-gilded-p2': ('HMBZD', 'uUAnI', 'WES')}
RAMP_BASE = {'HMBZD': 1, 'uUAnI': 0, 'WES': 0}  # relight 띠가 시작하는 단 (쇠는 M부터 — H는 드문 빛 단)
TONE = {'HMBZD': {'H': 'M', 'D': 'Z'}, 'uUAnI': {'I': 'n'}, 'WES': {}}
# 이형 다시 읽기 (D-527 → D-528 정본은 scene_recipe.PIECE_GRID): 몸 키 실측 — 보통 흑 기물 몸 키 P 49 · R 46 · N 54 · B 54 · Q 53 · K 54, 넓이(칸) R 1574 · N 1863 · Q 1725 · B 1590.
# 이형이 바탕 기물보다 넓이가 큰 것은 대포(54칸에서 1742 = R의 111%)뿐 → 50칸(1514 = 96%). 나머지는 이미 바탕 기물보다 작다
# (낙타 83% · 메뚜기 46% · 대주교 83% · 총독 76%) — 더 줄이면 가는 몸이 판 위에서 안 읽혀 몸 키 그대로.
FORM_BODY = {'R:cannon': 50, 'N:camel': 54, 'Q:hopper': 53, 'B:archbishop': 52, 'R:chancellor': 54}
FORM_OUTLINE = 3  # 보통 흑 기물 먹 테는 4칸(가로 한가운데 줄 실측)이나 이형은 가늘어(메뚜기 폭 28) 4칸이면 용수철 · 낙타 머리가 먹에 묻힌다 → 3 (받은 이형은 2칸이라 판 위 선이 가늘고 도트가 잘아 보였다)
FROM_BLACK = {v: k for k, v in pi.TO_BLACK.items()}
BUNDLES = {'A': 'grid72,clean,accent,tone', 'B': 'grid72,clean,accent,relight,tone', 'M72': 'grid72,clean,accent,soft2n,tone',
           'M': 'fine,clean,accent,soft2n,tone'}


def ramps_of(name):
    return RAMPS.get(name, ('HMBZD',))


def body_keys(name):
    return set(''.join(ramps_of(name)))


def to72(g144, giant):
    """144칸 블록 → 72칸 격자 (반장: 2×2 펴기를 되돌림 · 거대: 2×2 다수결, 먹은 둘 이상이면 먹)"""
    a = np.array([list(r) for r in g144], dtype=object)
    out = np.full((72, 72), '.', dtype=object)
    for y in range(72):
        for x in range(72):
            blk = [c for c in a[2 * y:2 * y + 2, 2 * x:2 * x + 2].ravel() if c not in '.O']
            if not giant:
                c = a[2 * y, 2 * x]
                out[y, x] = '.' if c in '.O' else c
            elif len(blk) >= 2:
                if blk.count('K') >= 2:
                    out[y, x] = 'K'
                else:
                    f = [c for c in blk if c != 'K'] or blk
                    out[y, x] = max(sorted(set(f)), key=f.count)
    return out


def outline(g, body, t=2):
    """먹선을 몸 안쪽 t칸으로 다시 두른다(반장 문법) — 속 먹(안쪽 선)은 그대로"""
    edge = pi.inner_edge(body, t)
    g = g.copy()
    g[~body] = '.'
    lost = body & (g == '.')
    g[lost] = 'M'
    g[edge] = 'K'
    return g, edge


def comps(mask):
    """4-이웃 덩어리 목록"""
    h, w = mask.shape
    seen = np.zeros_like(mask)
    res = []
    for y0, x0 in zip(*np.nonzero(mask)):
        if seen[y0, x0]:
            continue
        comp, st = [], [(y0, x0)]
        seen[y0, x0] = True
        while st:
            y, x = st.pop()
            comp.append((y, x))
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                yy, xx = y + dy, x + dx
                if 0 <= yy < h and 0 <= xx < w and mask[yy, xx] and not seen[yy, xx]:
                    seen[yy, xx] = True
                    st.append((yy, xx))
        res.append(comp)
    return res


def nb_major(g, y, x, avoid, r=1):
    h, w = g.shape
    nb = [g[y + dy, x + dx] for dy in range(-r, r + 1) for dx in range(-r, r + 1) if (dy or dx) and 0 <= y + dy < h and 0 <= x + dx < w
          and g[y + dy, x + dx] not in avoid]
    return max(sorted(set(nb)), key=nb.count) if nb else 'M'


def accent_keys(g, name=''):
    return {c for c in np.unique(g) if c not in '.OK' and c not in body_keys(name)}


def f_tone(g, body, edge, name=''):
    """명암 3단: 빛 단 H → M, 가장 어두운 D → Z (보통 흑 기물은 H 0~1% · D 3%) — 소품 · 홈의 상대 명암(M 대 Z)은 남는다.
    (처음 시도한 분위 맞춤은 자석 몸이 B 한 덩어리가 되어 말굽이 묻혔다 — 고정 매핑으로)"""
    fill = body & ~edge
    g = g.copy()
    src = g.copy()
    for ramp in ramps_of(name):
        for a, b in TONE[ramp].items():
            g[fill & (src == a)] = b
    return g


def ramp_of_cell(c, name):
    for ramp in ramps_of(name):
        if c in ramp:
            return ramp
    return None


def f_relight(g, body, edge, name=''):
    g = g.copy()
    keys = body_keys(name)
    fill = body & ~edge & np.isin(g, list(keys))
    for y in range(g.shape[0]):
        xs = np.nonzero(body[y])[0]
        if not len(xs):
            continue
        x0, x1 = xs.min(), xs.max()
        wdt = max(1, x1 - x0 + 1)
        for x in np.nonzero(fill[y])[0]:
            ramp = ramp_of_cell(g[y, x], name)
            o = ramp.index(g[y, x])
            t = (x - x0) / wdt
            band = 0 if t < 0.45 else 1 if t < 0.72 else 2 if t < 0.9 else 3  # M B Z D — 보통 기물 띠 비율
            band += RAMP_BASE[ramp]
            if o >= 3:  # 원본이 어두운 칸(Z · D)은 한 단 더 — 홈 · 이음매 형태를 남긴다
                band += 1
            g[y, x] = ramp[min(len(ramp) - 1, band)]
    return g


def f_soft(g, body, edge, name='', level=2, f=1, r=2):
    """안 M (D-527): 왼쪽 빛 띠를 한 단만 — 원본 단에서 ±1 (덮어쓰지 않는다). level 1 = 왼쪽 밝게 · 2 = + 오른쪽 어둡게 · 3 = 덩어리 창 없이.
    큰 몸 덩어리 = 둘레 (2r+1)² 창(r = 2칸 × f)이 모두 같은 재질 단(먹 · 강조 · 다른 재질 없음) — 소품 · 강조 · 속 먹선 둘레는 그대로."""
    g = g.copy()
    src = g.copy()
    h, w = g.shape
    keys = body_keys(name)
    fill = body & ~edge & np.isin(src, list(keys))
    r = r * f
    if level >= 3:
        mass = fill
    else:
        # 창 안이 모두 같은 재질(같은 계단) 칸인가 — 누적합으로
        mass = np.zeros_like(fill)
        for ramp in ramps_of(name):
            m = (body & ~edge & np.isin(src, list(ramp))).astype(int)
            pad = np.pad(m, r)
            cs = pad.cumsum(0).cumsum(1)
            cs = np.pad(cs, ((1, 0), (1, 0)))
            n = 2 * r + 1
            tot = cs[n:, n:] - cs[:-n, n:] - cs[n:, :-n] + cs[:-n, :-n]
            mass |= (tot == n * n) & (m > 0)
    for y in range(h):
        xs = np.nonzero(body[y])[0]
        if not len(xs):
            continue
        x0, x1 = xs.min(), xs.max()
        wdt = max(1, x1 - x0 + 1)
        for x in np.nonzero(mass[y])[0]:
            ramp = ramp_of_cell(src[y, x], name)
            o = ramp.index(src[y, x])
            lo = RAMP_BASE[ramp]  # 빛 단 H 위로는 올리지 않는다(tone이 어차피 M으로)
            t = (x - x0) / wdt
            if t < 0.33:
                o = max(lo, o - 1)
            elif t > 0.75 and level >= 2:
                o = min(len(ramp) - 1, o + 1)
            g[y, x] = ramp[o]
    return g


def f_accent(g, body, edge, cap=0.05, name='', minsz=3):
    g = g.copy()
    acc = accent_keys(g, name)
    parts = []
    for c in acc:
        for comp in comps(g == c):
            parts.append(comp)
    parts.sort(key=len)
    total = sum(len(p) for p in parts)
    limit = cap * body.sum()
    for comp in parts:
        if len(comp) < minsz or total > limit:
            total -= len(comp)
            for y, x in comp:
                g[y, x] = nb_major(g, y, x, acc | {'K', '.', 'O'})
    return g


def f_clean(g, body, edge, minsz=3):
    g = g.copy()
    inner = body & ~edge
    for c in np.unique(g[inner]):
        for comp in comps(inner & (g == c)):
            if len(comp) < minsz:
                for y, x in comp:
                    g[y, x] = nb_major(g, y, x, {c, '.', 'O'})
    return g


def f_open(g, body):
    b = body.copy()
    h, w = b.shape
    # 1칸 폭 돌기: 가로 또는 세로로 양옆이 비어 있는 몸 칸을 걷는다 (2번)
    for _ in range(2):
        nb = b.copy()
        for y in range(h):
            for x in range(w):
                if not b[y, x]:
                    continue
                l = x > 0 and b[y, x - 1]
                r = x < w - 1 and b[y, x + 1]
                u = y > 0 and b[y - 1, x]
                d = y < h - 1 and b[y + 1, x]
                if (not l and not r) or (not u and not d):
                    nb[y, x] = False
        b = nb
    b = pi.keep_parts(b, 4)
    return b


MUTE_TO = np.array([0x32, 0x34, 0x3D], dtype=float)


def render(g, side, mute=False):
    """72칸 격자(칸마다 2×2로 폄) 또는 144칸 격자(fine, 그대로) → 144칸 캔버스 + 흰 테 3칸 → PNG"""
    N = 144 if g.shape[0] in (72, 144) else g.shape[0]  # 거대 재발주본(D-527 · D-528)은 122칸 캔버스 그대로
    f = N // g.shape[0]
    big = np.zeros((N, N), bool)
    rows = [['.'] * N for _ in range(N)]
    for y in range(g.shape[0]):
        for x in range(g.shape[1]):
            c = g[y, x]
            if c not in '.O':
                for dy in range(f):
                    for dx in range(f):
                        big[f * y + dy, f * x + dx] = True
                        rows[f * y + dy][f * x + dx] = c
    ring = pi.cheb(big, 3) & ~big
    for y, x in zip(*np.nonzero(ring)):
        rows[y][x] = 'O'
    grid = [''.join(r) for r in rows]
    img = maker.render64(grid, side)
    if mute:
        a = np.array(img).astype(float)
        for c in set(''.join(grid)) - set('.OKHMBZD'):
            col = maker.PAL64[c]
            m = (a[..., 0] == col[0]) & (a[..., 1] == col[1]) & (a[..., 2] == col[2]) & (a[..., 3] > 0)
            a[m, :3] = np.round(np.array(col) * 0.7 + MUTE_TO * 0.3)
        img = Image.fromarray(a.astype(np.uint8))
    return grid, img


def grid_of(rows):
    return np.array([list(r) for r in rows], dtype=object)


def apply(g, body, edge, name, opts, f=1):
    """공통 후처리(clean · accent · relight · soft · tone) — f = 격자 배수(72칸 1 · 144칸 2): 덩어리 하한을 같은 판 위 넓이로"""
    if 'clean' in opts:
        g = f_clean(g, body, edge, 3 if f == 1 else 6)
    if 'accent' in opts:  # 격노는 금 · 번개가 정체성이라 상한을 두 배로
        g = f_accent(g, body, edge, 0.10 if name.endswith('-p2') or name.endswith(':giant') else 0.05, name, 3 if f == 1 else 6)  # 거대 금 균열은 정체성(D-527)
    if 'relight' in opts:
        g = f_relight(g, body, edge, name)
    for lv in (1, 2, 3):
        if f'soft{lv}' in opts:
            g = f_soft(g, body, edge, name, lv, f)
    if 'soft2n' in opts:  # soft2를 좁은 창(r = 1칸)으로 — 덩어리 판정이 느슨해 빛이 더 넓게 든다
        g = f_soft(g, body, edge, name, 2, f, 1)
    if 'tone' in opts:
        g = f_tone(g, body, edge, name)
    return g


def process(name, side, opts):
    giant = name.endswith(':giant')
    if 'fine' in opts:
        # 원본을 안 M 없이 다시 읽는다(D-528: 반장 144칸 · 거대 GIANT_GRID 캔버스) — 보통 도트, 흰 테는 render가 3칸으로 다시
        blocks, _ = pi.build_boss(os.path.join(SRC, SOURCE_OF[name] + '-source.png'), name, None if giant else 144, plan=False)
        g = grid_of(blocks[(name, 1)])
        g[g == 'O'] = '.'
        body = g != '.'
        edge = pi.inner_edge(body, 3 if giant else 4) & (g == 'K')
        return apply(g, body, edge, name, opts, 2)
    if 'coarse' in opts and not giant:
        cfg_backup = {k: dict(v) for k, v in BOSS_GRID.items()}
        for v in BOSS_GRID.values():
            v['body'] = 56
        try:
            blocks, _ = pi.build_boss(os.path.join(SRC, SOURCE_OF[name] + '-source.png'), name, 72, plan=False)
        finally:
            BOSS_GRID.clear()
            BOSS_GRID.update(cfg_backup)
        g144 = blocks[(name, 1)]
    else:
        g144 = maker.load64()[(name, side)]
        if giant:
            g144 = maker.pad72(g144)
            if len(g144) != 144:
                return None  # 108 · 122칸 거대(D-527 · D-528)는 이미 보통 도트 — grid72(2배 도트) 후보는 쓰지 않는다
    g = to72(g144, giant)
    if giant and 'grid72' not in opts:
        return None  # 거대 주물은 72칸 격자 안에서만 다른 후보를 쓴다 — grid72 없이는 원래 그림
    body = g != '.'
    if 'open' in opts:
        body = f_open(g, body)
    if giant or 'open' in opts:
        g, edge = outline(g, body)
    else:
        edge = pi.inner_edge(body, 2) & (g == 'K')
    return apply(g, body, edge, name, opts)


def process_form(name, opts):
    """이형 (D-527): 받은 원본을 FORM_BODY · FORM_OUTLINE으로 다시 읽고(form) 검은 격자에 같은 처리 → 흰 격자는 같은 자리 같은 단(D-221).
    반환 {진영: 64칸 줄 목록}"""
    if 'form' in opts or 'fine' in opts:
        cfg = PIECE_GRID[name]
        keep = dict(cfg)
        cfg['body'], cfg['outline'] = FORM_BODY[name], FORM_OUTLINE
        try:
            blocks, _ = pi.build(os.path.join(SRC, SOURCE_OF[name] + '-source.png'), name, plan=False)
        finally:
            cfg.clear()
            cfg.update(keep)
    else:
        blocks = {(name, s): maker.load64()[(name, s)] for s in (0, 1)}
    g = grid_of(blocks[(name, 1)])
    body = ~np.isin(g, ['.', 'O'])
    edge = pi.inner_edge(body, FORM_OUTLINE if ('form' in opts or 'fine' in opts) else 2) & (g == 'K')
    g = apply(g, body, edge, name, opts - {'accent', 'clean'})  # clean은 메뚜기 용수철(2칸 줄무늬)을 지워 뺀다
    out = {}
    for side in (0, 1):
        rows = []
        for y in range(g.shape[0]):
            r = ''
            for x in range(g.shape[1]):
                c = g[y, x]
                if not body[y, x]:
                    c = blocks[(name, 1)][y][x]  # 흰 테 · 빈칸은 원래 그대로
                elif side == 0 and c in FROM_BLACK:
                    c = FROM_BLACK[c]
                r += c
            rows.append(r)
        out[side] = rows
    return out


def stem(name):
    t, form = name.split(':')
    if form == 'giant':
        return f'giant{t}'
    return form + ('-' if form.endswith('-p2') else '')


def forms():
    return [n for (n, s) in maker.load64() if s == 1 and n.split(':')[-1] in ('cannon', 'camel', 'hopper', 'archbishop', 'chancellor')]


if __name__ == '__main__':
    out, opts = sys.argv[1], sys.argv[2]
    opts = set(BUNDLES.get(opts, opts).split(','))
    names = sys.argv[3:] or [n for (n, s) in maker.load64() if n.startswith('K:boss-') or n.endswith(':giant')] + forms()
    os.makedirs(out, exist_ok=True)
    for name in names:
        if name in FORM_BODY:
            if not opts & {'form', 'fine', 'tone', 'clean', 'relight', 'soft1', 'soft2', 'soft3'}:
                continue
            for side, rows in process_form(name, opts | ({'form'} if opts & {'grid72', 'fine'} else set())).items():
                img = maker.render64(maker.pad72(rows), side)
                s = stem(name)
                img.resize((144, 144), Image.NEAREST).save(os.path.join(out, f's-{s}{side}.png'))
                img.resize((216, 216), Image.NEAREST).save(os.path.join(out, f'l-{s}{side}.png'))
            print(name, '→', f'{out}/s|l-{stem(name)}0|1.png')
            continue
        g = process(name, 1, opts)
        if g is None:
            continue
        _, img = render(g, 1, 'mute' in opts)
        s = stem(name)
        img.resize((img.width * 2, img.height * 2), Image.NEAREST).save(os.path.join(out, f's-{s}1.png'))
        img.resize((img.width * 3, img.height * 3), Image.NEAREST).save(os.path.join(out, f'l-{s}1.png'))
        print(name, '→', f'{out}/s|l-{s}1.png')
