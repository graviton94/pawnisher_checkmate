"""
2×2 반장(GB) · 거대 주물(G) 판 위 어울림 후보 (D-526 검토 중 — 기본값은 바꾸지 않는다).

  python3 -I tools/pixel/gb_fit.py <출력 폴더> <안,안,...> [이름 ...]

pieces64.txt의 [K:boss-* 1] · [P|R|Q:giant 1] 블록을 읽어 후보 처리를 더한 그림을 public/pieces와 **같은 파일 이름**으로
<출력 폴더>에 찍는다(s- 2배 · l- 3배). public/pieces · pieces64.txt는 건드리지 않는다 — 판 위 비교는
`GBFIT_DIR=<출력 폴더> GBFIT_TAG=<안> node tools/slice-observe.cjs gbfit`(요청을 가로채 바꿔 끼움).
고른 안을 정본으로 삼으려면 같은 처리를 piece_import.py --boss에 옮기고 DECISIONS에 남긴다.

후보(받은 그림 다듬기 · 코드 처리만, D-386 범위 — 새로 그리지 않음):
  grid72  거대 주물 128칸(보통 도트)을 72칸 격자(2×2 다수결)로 — 반장 2×2와 같은 도트 크기 (반장은 이미 72칸)
  coarse  원본을 몸 키 56칸 격자로 다시 읽는다(반장만 — piece_import.build_boss, 몸이 작아지고 도트 수가 준다)
  tone    명암 3단: 빛 단 H → M · 가장 어두운 D → Z (보통 흑 기물 분포 M 40 · B 33 · Z 22 · D 3 · H 0~1%에 가깝게)
  relight 보통 기물 빛 문법: 줄마다 몸 왼쪽 → 오른쪽 M · B · Z · D 띠(왼쪽 위 빛), 원본이 어두운 칸은 한 단 더 어둡게(형태 유지)
  accent  강조색 면적 제한: 3칸 미만 강조 덩어리는 쇠로, 강조 합이 몸의 5%(격노 10%)를 넘으면 작은 덩어리부터 쇠로
  clean   잔무늬 정리 강화: 같은 색 4-이웃 덩어리 3칸 미만(속 먹 낱점 포함)을 이웃 다수 색으로
  open    실루엣 단순화: 1칸 폭 돌기 · 4칸 미만 떠 있는 조각을 걷고 먹선(2칸)을 다시 두른다
  mute    테마 강조색을 반장 몸 색(어두운 쇠) 쪽으로 30% 낮춘다(판 색과 덜 부딪게)
"""
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import maker  # noqa: E402
import piece_import as pi  # noqa: E402
from scene_recipe import BOSS_GRID  # noqa: E402

GREYS = 'HMBZD'  # 밝은 → 어두운
ORDER = {c: i for i, c in enumerate(GREYS)}
TARGET = {'H': 0.01, 'M': 0.40, 'B': 0.33, 'Z': 0.21, 'D': 0.05}  # 보통 흑 기물 P · R · K · Q 속 칠(먹 뺌) 실측 비율
ROOT = os.path.dirname(os.path.dirname(HERE))
SRC = os.path.join(ROOT, 'build-res', 'order')
SOURCE_OF = {'K:boss-plate': 'GB-01', 'K:boss-plate-p2': 'GB-01b', 'K:boss-inspect': 'GB-02', 'K:boss-inspect-p2': 'GB-02b',
             'K:boss-spawn': 'GB-03', 'K:boss-spawn-p2': 'GB-03b', 'K:boss-magnet': 'GB-04', 'K:boss-magnet-p2': 'GB-04b',
             'K:boss-thorns': 'GB-05', 'K:boss-thorns-p2': 'GB-05b'}


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
                    out[y, x] = max(set(f), key=f.count)
    return out


def outline(g, body):
    """먹선을 몸 안쪽 2칸으로 다시 두른다(반장 문법) — 속 먹(안쪽 선)은 그대로"""
    edge = pi.inner_edge(body, 2)
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


def nb_major(g, y, x, avoid):
    h, w = g.shape
    nb = [g[y + dy, x + dx] for dy in (-1, 0, 1) for dx in (-1, 0, 1) if (dy or dx) and 0 <= y + dy < h and 0 <= x + dx < w
          and g[y + dy, x + dx] not in avoid]
    return max(set(nb), key=nb.count) if nb else 'M'


def accent_keys(g):
    return {c for c in np.unique(g) if c not in '.OK' and c not in GREYS}


def f_tone(g, body, edge):
    """명암 3단: 빛 단 H → M, 가장 어두운 D → Z (보통 흑 기물은 H 0~1% · D 3%) — 소품 · 홈의 상대 명암(M 대 Z)은 남는다.
    (처음 시도한 분위 맞춤은 자석 몸이 B 한 덩어리가 되어 말굽이 묻혔다 — 고정 매핑으로)"""
    fill = body & ~edge
    g = g.copy()
    src = g.copy()
    g[fill & (src == 'H')] = 'M'
    g[fill & (src == 'D')] = 'Z'
    return g


def f_relight(g, body, edge):
    g = g.copy()
    fill = body & ~edge & np.isin(g, list(GREYS))
    for y in range(g.shape[0]):
        xs = np.nonzero(body[y])[0]
        if not len(xs):
            continue
        x0, x1 = xs.min(), xs.max()
        wdt = max(1, x1 - x0 + 1)
        for x in np.nonzero(fill[y])[0]:
            t = (x - x0) / wdt
            band = 1 if t < 0.45 else 2 if t < 0.72 else 3 if t < 0.9 else 4  # M B Z D — 보통 기물 띠 비율
            if ORDER[g[y, x]] >= 3:  # 원본이 어두운 칸(Z · D)은 한 단 더 — 홈 · 이음매 형태를 남긴다
                band = min(4, band + 1)
            g[y, x] = GREYS[band]
    return g


def f_accent(g, body, edge, cap=0.05):
    g = g.copy()
    acc = accent_keys(g)
    parts = []
    for c in acc:
        for comp in comps(g == c):
            parts.append(comp)
    parts.sort(key=len)
    total = sum(len(p) for p in parts)
    limit = cap * body.sum()
    for comp in parts:
        if len(comp) < 3 or total > limit:
            total -= len(comp)
            for y, x in comp:
                g[y, x] = nb_major(g, y, x, acc | {'K', '.', 'O'})
    return g


def f_clean(g, body, edge):
    g = g.copy()
    inner = body & ~edge
    for c in np.unique(g[inner]):
        for comp in comps(inner & (g == c)):
            if len(comp) < 3:
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


def render(g72, side, mute=False):
    """72칸 격자 → 144칸 캔버스(2×2 펴기 + 흰 테 3칸) → s(2배) · l(3배) PNG"""
    N = 144
    big = np.zeros((N, N), bool)
    rows = [['.'] * N for _ in range(N)]
    for y in range(72):
        for x in range(72):
            c = g72[y, x]
            if c not in '.O':
                for dy in (0, 1):
                    for dx in (0, 1):
                        big[2 * y + dy, 2 * x + dx] = True
                        rows[2 * y + dy][2 * x + dx] = c
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


def process(name, side, opts):
    giant = name.endswith(':giant')
    if 'coarse' in opts and not giant:
        cfg_backup = {k: dict(v) for k, v in BOSS_GRID.items()}
        for v in BOSS_GRID.values():
            v['body'] = 56
        try:
            blocks, _ = pi.build_boss(os.path.join(SRC, SOURCE_OF[name] + '-source.png'), name)
        finally:
            BOSS_GRID.clear()
            BOSS_GRID.update(cfg_backup)
        g144 = blocks[(name, 1)]
    else:
        g144 = maker.load64()[(name, side)]
        if giant:
            g144 = maker.pad72(g144)
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
    if 'clean' in opts:
        g = f_clean(g, body, edge)
    if 'accent' in opts:  # 격노는 금 · 번개가 정체성이라 상한을 두 배로
        g = f_accent(g, body, edge, 0.10 if name.endswith('-p2') else 0.05)
    if 'relight' in opts:
        g = f_relight(g, body, edge)
    if 'tone' in opts:
        g = f_tone(g, body, edge)
    return g


def stem(name):
    t, form = name.split(':')
    if form == 'giant':
        return f'giant{t}'
    return form + ('-' if form.endswith('-p2') else '')


if __name__ == '__main__':
    out, opts = sys.argv[1], set(sys.argv[2].split(','))
    names = sys.argv[3:] or [n for (n, s) in maker.load64() if n.startswith('K:boss-') or n.endswith(':giant')]
    os.makedirs(out, exist_ok=True)
    for name in names:
        g = process(name, 1, opts)
        if g is None:
            continue
        _, img = render(g, 1, 'mute' in opts)
        s = stem(name)
        img.resize((288, 288), Image.NEAREST).save(os.path.join(out, f's-{s}1.png'))
        img.resize((432, 432), Image.NEAREST).save(os.path.join(out, f'l-{s}1.png'))
        print(name, '→', f'{out}/s|l-{s}1.png')
