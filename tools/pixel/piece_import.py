"""
발주 기물 반입 (D-423 절차 · D-086/D-221 기물 문법): 생성기 원본(흐릿한 가짜 도트) → pieces64.txt 격자 블록.

  python3 -I tools/pixel/piece_import.py <원본.png> <유형:이형> [--giant] [--write] [--preview out.png]

이형(흰 · 검 한 장, 왼쪽 흰 · 오른쪽 검):
  ① 실루엣 = 검은 진영 쪽에서 「흰 테보다 어두운」 칸 (알파 > 230 · 밝기 < 185) → 열고 닫기(7px)로 가장자리 번짐을 걷고 구멍을 메운다
  ② 격자 = 실루엣 높이를 정한 칸 수(scene_recipe.PIECE_GRID의 body)로 나눈 간격 — 칸마다 가운데 절반만 읽는다(번진 경계를 피한다)
  ③ 외곽선 = 실루엣 안쪽 테두리 `outline`칸 + 원본의 먹선(흰 진영 쪽 밝기 < 70) · 흰 테 = 실루엣 밖 체비쇼프 3칸 — 흑백 공용(D-221)
  ④ 속 칠 = 흰 진영 밝기를 흰 팔레트 5단계(V W E S G)로 가까운 값에 맞추고 3×3 다수결로 낱점을 지운다.
     검은 진영은 같은 자리 · 같은 단계(H M B Z D) — 흑백이 칸 하나까지 같다(unify.py 규칙)
  ⑤ mirror = 실루엣(+ 'all'이면 먹선까지) 왼쪽 절반을 오른쪽에 비춘다 — 룩 · 퀸 바탕은 좌우 대칭(D-092)
거대(검 한 장, 128칸): 외곽선 2칸 · 흰 테 4칸, 속 칠은 검은 팔레트 5단계 + 녹 두 색(N #8A6416 · n #4A3414, 발주서 허용색)
  그대로 가장 가까운 색. 128칸 그림의 한가운데(64줄 · 64칸)가 네 부위 경계다.
격자값(간격 · 칸 수)은 tools/pixel/scene_recipe.py PIECE_GRID에 보존한다.
"""
import os
import sys

import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from scene_recipe import PIECE_GRID  # noqa: E402

PIECES = os.path.join(HERE, 'pieces64.txt')

WHITE = {'V': (255, 255, 255), 'W': (0xF1, 0xEE, 0xEC), 'E': (0xE2, 0xDE, 0xD6), 'S': (0xC5, 0xC3, 0xC3), 'G': (0x85, 0x84, 0x88)}
TO_BLACK = {'V': 'H', 'W': 'M', 'E': 'B', 'S': 'Z', 'G': 'D'}
GIANT = {'H': (0x6E, 0x71, 0x7E), 'M': (0x48, 0x4A, 0x55), 'B': (0x32, 0x34, 0x3D), 'Z': (0x26, 0x27, 0x2E), 'D': (0x1C, 0x1D, 0x22),
         'N': (0x8A, 0x64, 0x16), 'n': (0x4A, 0x34, 0x14)}


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
    args = [x for x in sys.argv[1:] if not x.startswith('--')]
    src, name = args[0], args[1]
    giant = '--giant' in sys.argv
    blocks, info = build(src, name, giant)
    print(name, info)
    if '--write' in sys.argv:
        write(blocks)
        print('pieces64.txt 갱신:', ', '.join(f'[{n} {s}]' for n, s in blocks))
