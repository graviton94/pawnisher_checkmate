"""
도트 격자 맞추기 (D-185, Sprite Fusion "Pixel Snapper"와 같은 생각).
'도트 같지만 도트가 아닌' 그림(생성 이미지 · 확대 · 흐림 · 압축 얼룩)을 진짜 도트로 되돌린다:
  ① 숨은 격자 찾기 — 색이 바뀌는 자리(가로 · 세로 경계 세기)를 모아, 그 자리들이 가장 잘 맞는 칸 크기(소수점 허용)와 시작점을 고른다
  ② 칸마다 한 색 — 칸 가장자리(번짐)는 버리고 가운데 영역의 가장 흔한 색(최빈값)을 그 칸의 색으로
  ③ 색 수 줄이기 — 중앙값 자르기, 디더 없음 (투명은 문턱값으로 0/255)
결과: 칸 하나 = 1px 진짜 도트 그림 (+ 확인용 확대 그림).

사용:
  python3 -I tools/pixel/snap.py <입력> <출력.png> [--colors 24] [--pitch 자동|숫자] [--preview 확대.png] [--scale 4]
  python3 -I tools/pixel/snap.py sheet <출력 비교판.png> <입력...>   (전 · 후 나란히)
"""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))


def _profile(a, axis):
    """한 방향의 경계 세기: 이웃 픽셀 색 차이를 다른 축으로 더한 1차원 곡선"""
    d = np.abs(np.diff(a, axis=axis)).sum(axis=2)
    p = d.sum(axis=1 - axis) if axis == 1 else d.sum(axis=1)
    p = p.astype(float)
    return (p - p.mean()) / (p.std() + 1e-9)


def _score(prof, n, p):
    """칸 크기 p의 가장 좋은 시작점과 점수 (격자 자리 평균 경계 세기 × √자리 수)"""
    best = (-1e9, 0.0)
    k = np.arange(0, n / p + 1)
    for o in np.arange(0, p, max(0.1, p / 40)):
        idx = np.round(o + k * p).astype(int) - 1
        idx = idx[(idx >= 0) & (idx < len(prof))]
        if len(idx) < 4:
            continue
        sc = prof[idx].mean() * np.sqrt(len(idx))
        if sc > best[0]:
            best = (sc, o)
    return best


def detect_pitch(img, lo=2.0, hi=None):
    """숨은 격자의 칸 크기와 시작점 (x · y 따로, 소수점 칸 허용). 반환 (px, ox, py, oy, 점수)
    진짜 칸의 2 · 3배도 높은 점수가 나오므로(색이 안 바뀌는 칸 경계가 많다), 가장 좋은 크기의 1/2 · 1/3이
    점수의 keep 이상이면 더 작은 쪽을 고른다 — 세부(나사산 같은 한 칸짜리)가 살아남게."""
    a = np.asarray(img.convert('RGB'), dtype=float)
    H, W = a.shape[:2]
    hi = hi or min(40.0, max(4.0, min(W, H) / 12))
    keep = 0.45
    res = []
    for axis, n in ((1, W), (0, H)):
        prof = _profile(a, axis)
        best = (-1e9, 2.0, 0.0)
        for p in np.arange(lo, hi, 0.02):
            sc, o = _score(prof, n, p)
            if sc > best[0]:
                best = (sc, p, o)
        sc0, p0, o0 = best
        changed = True
        while changed:
            changed = False
            for div in (2, 3):
                q = p0 / div
                if q < lo:
                    continue
                # 나눈 크기 주변을 촘촘히 다시 찾는다 (소수점 오차)
                cand = max(((*_score(prof, n, qq), qq) for qq in np.arange(q - 0.1, q + 0.1, 0.01)), key=lambda t: t[0])
                if cand[0] >= keep * sc0:
                    sc0, o0, p0 = cand[0], cand[1], cand[2]
                    changed = True
                    break
        res.append((p0, o0, sc0))
    (px, ox, sx), (py, oy, sy) = res
    # 정사각 칸으로 맞추기: 두 축의 후보(각자 찾은 크기와 그 2 · 3 · 4배 · 절반)를 두 축 점수 합으로 다시 재고,
    # 가장 좋은 점수의 keep 이상인 것 가운데 가장 작은 칸을 고른다 (두 축이 서로 다른 배수로 헷갈린 경우를 바로잡는다)
    profs = [(_profile(a, 1), W), (_profile(a, 0), H)]
    cands = set()
    for base in (px, py):
        for m in (0.5, 1, 2, 3, 4, 1 / 3, 0.25):
            q = base * m
            if lo <= q <= hi * 1.01:
                cands.add(round(q, 2))
    scored = []
    for q in sorted(cands):
        best = max(((sum(_score(pr, n, qq)[0] for pr, n in profs), qq) for qq in np.arange(q - 0.08, q + 0.09, 0.02)), key=lambda t: t[0])
        scored.append(best)
    top = max(t[0] for t in scored)
    tot, pp = min((t for t in scored if t[0] >= keep * top), key=lambda t: t[1])
    px = py = pp
    ox = _score(profs[0][0], W, pp)[1]
    oy = _score(profs[1][0], H, pp)[1]
    sx = sy = tot / 2
    return px, ox, py, oy, (sx + sy) / 2


def dp_cuts(prof, n, p, slack=0.25):
    """칸 경계 줄을 하나씩 고른다 (동적 계획): 간격은 p의 ±slack 안에서, 경계 세기 합이 가장 크게.
    생성 그림은 칸 크기가 조금씩 흔들리므로 고정 간격 격자보다 잘 맞는다. 반환: 0 ~ n 경계 좌표 목록"""
    m = len(prof)
    lo_, hi_ = max(1, int(np.floor(p * (1 - slack)))), int(np.ceil(p * (1 + slack)))
    best = np.full(m, -1e18)
    back = np.full(m, -1, dtype=int)
    for i in range(m):
        if i + 1 <= hi_:
            best[i] = prof[i]  # 첫 줄: 왼쪽 끝에서 한 칸 안
        j0, j1 = max(0, i - hi_), i - lo_
        if j1 >= j0:
            seg = best[j0:j1 + 1]
            k = int(seg.argmax())
            if seg[k] + prof[i] > best[i]:
                best[i] = seg[k] + prof[i]
                back[i] = j0 + k
    # 끝: 오른쪽 끝에서 한 칸 안의 가장 좋은 줄
    tail = max(range(max(0, m - hi_), m), key=lambda i: best[i])
    cuts = []
    i = tail
    while i >= 0:
        cuts.append(i + 1)  # prof[i]는 i와 i+1 사이 → 경계 좌표 i+1
        i = back[i]
    cuts = sorted(cuts)
    if cuts[0] > p * 0.5:
        cuts = [0] + cuts
    else:
        cuts[0] = 0
    if n - cuts[-1] > p * 0.5:
        cuts.append(n)
    else:
        cuts[-1] = n
    return cuts


def snap(img, px, ox, py, oy, colors=24, core=0.6, cuts=None):
    """칸마다 가운데 영역의 최빈색 → 칸 하나 = 1px. 그 뒤 색 수를 줄인다"""
    rgba = np.asarray(img.convert('RGBA'))
    H, W = rgba.shape[:2]
    if cuts:
        xe, ye = cuts
    else:
        xe = list(np.arange(ox if ox > 0.5 else 0, W, px)) + [W]
        ye = list(np.arange(oy if oy > 0.5 else 0, H, py)) + [H]
    cols, rows = len(xe) - 1, len(ye) - 1
    out = np.zeros((rows, cols, 4), dtype=np.uint8)
    m = (1 - core) / 2
    for j in range(rows):
        y0, y1 = ye[j], ye[j + 1]
        cy0, cy1 = int(y0 + (y1 - y0) * m), max(int(y0 + (y1 - y0) * m) + 1, int(np.ceil(y1 - (y1 - y0) * m)))
        for i in range(cols):
            x0, x1 = xe[i], xe[i + 1]
            cx0, cx1 = int(x0 + (x1 - x0) * m), max(int(x0 + (x1 - x0) * m) + 1, int(np.ceil(x1 - (x1 - x0) * m)))
            blk = rgba[cy0:cy1, cx0:cx1].reshape(-1, 4)
            if len(blk) == 0:
                continue
            # 최빈값: 색을 5비트로 묶어 세고, 그 묶음의 평균색
            q = (blk[:, :3] >> 3).astype(np.int32)
            key = (q[:, 0] << 10) | (q[:, 1] << 5) | q[:, 2]
            vals, cnt = np.unique(key, return_counts=True)
            top = vals[cnt.argmax()]
            sel = blk[key == top]
            out[j, i, :3] = sel[:, :3].mean(axis=0)
            out[j, i, 3] = 255 if np.median(blk[:, 3]) >= 128 else 0
    small = Image.fromarray(out, 'RGBA')
    if colors:
        alpha = small.getchannel('A')
        q = small.convert('RGB').quantize(colors=colors, method=Image.Quantize.MEDIANCUT, kmeans=4, dither=Image.Dither.NONE).convert('RGB')
        small = q.convert('RGBA')
        small.putalpha(alpha)
    return small


def run(src, dst, colors=24, pitch=None, preview=None, scale=4, uniform=False):
    img = Image.open(src)
    if pitch:
        px = py = float(pitch)
        ox = oy = 0.0
        score = 0.0
    else:
        px, ox, py, oy, score = detect_pitch(img)
    a = np.asarray(img.convert('RGB'), dtype=float)
    cuts = None if uniform else (dp_cuts(_profile(a, 1), img.width, px), dp_cuts(_profile(a, 0), img.height, py))
    small = snap(img, px, ox, py, oy, colors, cuts=cuts)
    small.save(dst)
    if preview:
        small.resize((small.width * scale, small.height * scale), Image.NEAREST).save(preview)
    print(f'{src}: 칸 {px:.2f}×{py:.2f}px (시작 {ox:.1f},{oy:.1f} · 맞음 {score:.2f}) → {small.size} {f"{colors}색" if colors else "색 그대로"} → {dst}')
    return small, (px, py)


def sheet(out, srcs, colors=32):
    """전 · 후 비교판: 원본(일부 확대) | 격자 맞춘 결과(같은 크기로 계단 확대)"""
    try:
        font = ImageFont.truetype(os.path.join(HERE, '..', '..', 'node_modules', 'galmuri', 'dist', 'Galmuri11-Bold.ttf'), 16)
    except OSError:
        font = ImageFont.load_default()
    tiles = []
    for s in srcs:
        img = Image.open(s).convert('RGBA')
        px, ox, py, oy, score = detect_pitch(img)
        a0 = np.asarray(img.convert('RGB'), dtype=float)
        small = snap(img, px, ox, py, oy, colors, cuts=(dp_cuts(_profile(a0, 1), img.width, px), dp_cuts(_profile(a0, 0), img.height, py)))
        # 비교: 가운데 일부를 크게 (원본 그대로 vs 맞춘 도트를 원본 크기로 되돌림)
        back = small.resize(img.size, Image.NEAREST)
        W, H = img.size
        cw, ch = min(W, 160), min(H, 120)
        box = ((W - cw) // 2, (H - ch) // 2, (W - cw) // 2 + cw, (H - ch) // 2 + ch)
        z = 3
        a = img.crop(box).resize((cw * z, ch * z), Image.NEAREST)
        b = back.crop(box).resize((cw * z, ch * z), Image.NEAREST)
        full_a = img.copy()
        full_a.thumbnail((cw * z, ch * z))
        full_b = back.copy()
        full_b.thumbnail((cw * z, ch * z))
        tiles.append((os.path.basename(s), (px, py, small.size), full_a, full_b, a, b))
    tw = max(t[4].width for t in tiles)
    th = max(t[4].height for t in tiles)
    Wt = 24 + 4 * (tw + 16)
    Ht = 20 + len(tiles) * (th + 44)
    im = Image.new('RGB', (Wt, Ht), (14, 13, 18))
    d = ImageDraw.Draw(im)
    for n, (name, (px, py, sz), fa, fb, a, b) in enumerate(tiles):
        y = 20 + n * (th + 44)
        d.text((12, y), f'{name} — 숨은 칸 {px:.2f}px → 진짜 도트 {sz[0]}×{sz[1]} · {colors}색   [원본 | 맞춤 | 원본 확대 | 맞춤 확대]', fill=(250, 204, 21), font=font)
        for k, t in enumerate((fa, fb, a, b)):
            x = 12 + k * (tw + 16)
            bg = Image.new('RGBA', t.size, (36, 35, 44, 255))
            bg.alpha_composite(t.convert('RGBA'))
            im.paste(bg.convert('RGB'), (x, y + 24))
    im.save(out)
    print(out, im.size)


if __name__ == '__main__':
    args = sys.argv[1:]
    if args and args[0] == 'sheet':
        sheet(args[1], args[2:])
    else:
        opt = {'--colors': '24', '--pitch': None, '--preview': None, '--scale': '4'}
        pos = []
        i = 0
        while i < len(args):
            if args[i] in opt:
                opt[args[i]] = args[i + 1]
                i += 2
            else:
                pos.append(args[i])
                i += 1
        run(pos[0], pos[1], int(opt['--colors']), opt['--pitch'], opt['--preview'], int(opt['--scale']))
