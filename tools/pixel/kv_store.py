"""받은 컨셉아트 KV-01 · KV-02h · KV-03 → 스팀 스토어 그림 (D-570 · D-564 27위 · D-423 · D-386 · D-561 ④).

  python3 -I tools/pixel/kv_store.py [--sheets <대조판 폴더>]

앞 단계: python3 -I tools/pixel/store_import.py KV-01 KV-02h KV-03
  (scene_recipe.STORE_GRID 축마다 실측 격자 → 칸 가운데 최빈 묶음 중앙값 → 팔레트 → build-res/store/dots/KV-0N.png, 도트 1칸 = 1px)
이 도구 (scene_recipe.KV_FIX · KV_OUT):
  ① 사내 손질 — 지우기 · 다시 칠하기 · 정본 기물 얹기만(새 모양을 그리지 않는다):
     KV-01: 받은 폰(층층 원뿔 몸 — 정본과 다름)을 지우고(열마다 폰 위 칸 색을 아래로 이어 — 벽 · 쇳물 줄기가 그대로 이어진다)
            정본 흰 폰 maker.piece('P', 0, 1)을 같은 자리 · 같은 바닥에 얹고, 머리 줄(목 위)만 상아 → 쇳물 단으로 다시 칠한다.
            쇳물 줄기는 정본 폰 먹선 · 흰 테를 지나 머리까지 이어 칠한다(받은 그림처럼 줄기가 머리에 닿는다).
     KV-02h: 빈 길 위에 정본 흰 폰을 ×1로 얹는다(D-561 ①).
  ② ×k 계단 확대(NEAREST) → 스토어 크기로 자르기(늘이지 않는다) → 로고 LG-01a(build-res/logo, 도트 1칸 = 1px)를 정수배로 얹기.
→ build-res/store/K1-dots.png · K2-hero-dots.png · K3-dots.png (손질 뒤 도트) · build-res/store/<스토어 파일>.png
"""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
import maker  # noqa: E402
from scene_recipe import KV_FIX, KV_OUT, STORE_GRID  # noqa: E402

STORE = os.path.join(ROOT, 'build-res', 'store')
ORDER = os.path.join(ROOT, 'build-res', 'order')
LOGO = os.path.join(ROOT, 'build-res', 'logo')
DOTS_OUT = {'KV-01': 'K1-dots.png', 'KV-02h': 'K2-hero-dots.png', 'KV-03': 'K3-dots.png'}


def hexrgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


def canon_pawn():
    """정본 흰 폰 72칸 ×1, 빈 둘레를 잘라 낸 RGBA"""
    p = maker.piece('P', 0, 1)
    return p.crop(p.getbbox())


def fix_kv01(img, fx):
    """받은 폰 지우기 → 정본 폰 얹기 → 머리 쇳물 다시 칠하기 → 쇳물 줄기를 머리까지. 반환 (그림, 기록)"""
    a = np.asarray(img.convert('RGB')).copy()
    x0, y0, x1, y1 = fx['box']
    lum = a @ [0.299, 0.587, 0.114]
    ivory = (lum > 200) & (np.abs(a[..., 0].astype(int) - a[..., 2]) < 30)
    # 폰 자리 = 상자 안 줄마다 흰 테 왼쪽 끝 ~ 오른쪽 끝(열쇠 구멍 꼴은 줄마다 볼록하다)
    mask = np.zeros(a.shape[:2], bool)
    for y in range(y0, y1):
        xs = np.nonzero(ivory[y, x0:x1])[0]
        if len(xs):
            mask[y, x0 + xs[0]:x0 + xs[-1] + 1] = True
    # 받은 테 바깥의 흐린 둘레 칸(회색 · 먹 낱점)까지 지우도록 2칸 넓힌다
    from scipy import ndimage as ndi
    mask = ndi.binary_dilation(mask, iterations=2)
    # 지우기: 쇳물 줄기 열(폰 위 칸이 쇳물 주황 · 노랑)은 그 색을 아래로 잇고, 나머지는 줄마다 폰 자리 왼쪽 · 오른쪽 바깥 칸 가운데
    #   가까운 쪽 색으로(벽 · 주물틀 뒤 테가 가로로 이어진다)
    stream = {}
    for x in range(x0, x1):
        ys = np.nonzero(mask[:, x])[0]
        if len(ys):
            c = a[ys[0] - 1, x]
            r, g, b = (int(v) for v in c)
            if r > 150 and r - b > 80:
                stream[x] = c.copy()
    for y in range(y0, y1):
        xs = np.nonzero(mask[y])[0]
        if not len(xs):
            continue
        l, r_ = xs[0], xs[-1]
        def mode(px):
            t = [tuple(v) for v in px]
            return np.array(max(set(t), key=t.count), np.uint8)
        left, right = mode(a[y, l - 8:l]), mode(a[y, r_ + 1:r_ + 9])
        for x in xs:
            a[y, x] = stream[x] if x in stream else (left if x - l <= r_ - x else right)
    out = Image.fromarray(a, 'RGB').convert('RGBA')
    pawn = canon_pawn()
    pa = np.asarray(pawn).copy()
    lut = {hexrgb(k): hexrgb(v) for k, v in fx['molten'].items()}
    recol = 0
    for y in range(min(fx['head_rows'], pa.shape[0])):
        for x in range(pa.shape[1]):
            c = tuple(int(v) for v in pa[y, x, :3])
            if pa[y, x, 3] and c in lut:
                pa[y, x, :3] = lut[c]
                recol += 1
    pawn = Image.fromarray(pa, 'RGBA')
    cx, by = fx['pawn_at']
    px, py = cx - pawn.width // 2, by - pawn.height
    out.alpha_composite(pawn, (px, py))
    o = np.asarray(out.convert('RGB')).copy()
    # 줄기 열: 정본 폰 위 끝부터 머리 속(쇳물 단)에 닿을 때까지 먹선 · 흰 테를 줄기 색으로 다시 칠한다
    molten = {hexrgb(v) for v in fx['molten'].values()}
    painted = 0
    for x, c in stream.items():
        if not (px <= x < px + pawn.width):
            continue
        for y in range(py, by):
            if tuple(int(v) for v in o[y, x]) in molten:
                break
            o[y, x] = c
            painted += 1
    return Image.fromarray(o, 'RGB'), {'erased': int(mask.sum()), 'pawn': [int(px), int(py), pawn.width, pawn.height],
                                       'headRecolor': recol, 'streamPaint': painted}


def put_pawn(img, at):
    out = img.convert('RGBA')
    pawn = canon_pawn()
    cx, by = at
    out.alpha_composite(pawn, (cx - pawn.width // 2, by - pawn.height))
    return out.convert('RGB'), {'pawn': [cx - pawn.width // 2, by - pawn.height, pawn.width, pawn.height]}


def assemble(dots, o):
    W, H = o['size']
    if o['src'] is None:
        out = Image.new('RGBA', (W, H), hexrgb(o['fill']) + (255,))
        info = {'fill': o['fill']}
    else:
        k = o['k']
        up = dots[o['src']].resize((dots[o['src']].width * k, dots[o['src']].height * k), Image.NEAREST).convert('RGBA')
        cx, cy = o['crop']
        assert up.width >= cx + W and up.height >= cy + H, (o, up.size, '정수배가 스토어 크기를 못 덮는다')
        out = up.crop((cx, cy, cx + W, cy + H))
        info = {'k': k, 'up': list(up.size), 'crop': [cx, cy], 'kept': [round(W / up.width, 3), round(H / up.height, 3)]}
    if o.get('logo'):
        name, s, (lx, ly) = o['logo']
        lg = Image.open(os.path.join(LOGO, f'{name}.png')).convert('RGBA')
        lg = lg.resize((lg.width * s, lg.height * s), Image.NEAREST)
        assert lx >= 0 and ly >= 0 and lx + lg.width <= W and ly + lg.height <= H, (o, '로고가 밖으로 나간다')
        out.alpha_composite(lg, (lx, ly))
        info['logo'] = [name, s, lx, ly, lg.width, lg.height]
    return out.convert('RGB'), info


def label(d, xy, t):
    d.text(xy, t, fill=(250, 204, 21))


def source_sheet(name, dots_raw, dots_fix, out):
    """대조판: 받은 원본 | 복원 도트를 원본 크기로 계단 확대(같은 크기) | 손질 뒤(같은 크기) — 위 전체, 아래 초점 1:1 자르기"""
    src = Image.open(os.path.join(ORDER, STORE_GRID[name]['source'])).convert('RGB')
    W, H = src.size
    tiles = [('source', src), (f'restored {dots_raw.width}x{dots_raw.height} (nearest to source size)', dots_raw.resize((W, H), Image.NEAREST))]
    if dots_fix is not None:
        tiles.append((f'after in-house fix {dots_fix.width}x{dots_fix.height}', dots_fix.resize((W, H), Image.NEAREST)))
    z = 0.5 if W * len(tiles) > 3000 else 1.0
    tw, th = int(W * z), int(H * z)
    fx, fy = STORE_GRID[name].get('focus', (0.5, 0.5))
    cw, ch = min(400, W // 2), min(300, H // 2)
    x0, y0 = int(max(0, min(W - cw, W * fx - cw / 2))), int(max(0, min(H - ch, H * fy - ch / 2)))
    gap = 10
    sw = gap + len(tiles) * (max(tw, cw) + gap)
    sh = Image.new('RGB', (sw, 22 + th + 30 + ch + gap), (20, 19, 24))
    d = ImageDraw.Draw(sh)
    for i, (lab_, im) in enumerate(tiles):
        x = gap + i * (max(tw, cw) + gap)
        label(d, (x, 5), lab_)
        sh.paste(im.resize((tw, th), Image.NEAREST), (x, 22))
        label(d, (x, 22 + th + 8), f'1:1 crop @({x0},{y0})')
        sh.paste(im.crop((x0, y0, x0 + cw, y0 + ch)), (x, 22 + th + 26))
    sh.save(out, optimize=True)


def store_sheet(finals, out):
    gap = 12
    z = {n: (0.25 if im.width > 2000 else 0.5) for n, im in finals.items()}
    w = max(int(im.width * z[n]) for n, im in finals.items()) + 2 * gap
    rows = [(n, im.resize((int(im.width * z[n]), int(im.height * z[n])), Image.NEAREST)) for n, im in finals.items()]
    # 두 줄로: 가로형 왼쪽 단, 세로형 오른쪽 단
    left = [r for r in rows if r[1].width >= r[1].height]
    right = [r for r in rows if r[1].width < r[1].height]
    lw = max(r[1].width for r in left) + 2 * gap
    rw = sum(r[1].width + gap for r in right) + gap
    lh = sum(r[1].height + 22 + gap for r in left) + gap
    rh = max(r[1].height for r in right) + 22 + 2 * gap
    sh = Image.new('RGB', (max(lw + rw, w), max(lh, rh)), (20, 19, 24))
    d = ImageDraw.Draw(sh)
    y = gap
    for n, im in left:
        label(d, (gap, y), f'{n} {finals[n].width}x{finals[n].height} (shown x{z[n]})')
        sh.paste(im, (gap, y + 18))
        y += im.height + 22 + gap
    x = lw
    for n, im in right:
        label(d, (x, gap), f'{n} {finals[n].width}x{finals[n].height} (x{z[n]})')
        sh.paste(im, (x, gap + 18))
        x += im.width + gap
    sh.save(out, optimize=True)


def main():
    sheets = sys.argv[sys.argv.index('--sheets') + 1] if '--sheets' in sys.argv else None
    raw = {n: Image.open(os.path.join(STORE, 'dots', f'{n}.png')).convert('RGB') for n in DOTS_OUT}
    dots, fixed = dict(raw), {}
    if 'KV-01' in KV_FIX:
        dots['KV-01'], info = fix_kv01(raw['KV-01'], KV_FIX['KV-01'])
        fixed['KV-01'] = dots['KV-01']
        print('KV-01 fix', info)
    if 'KV-02h' in KV_FIX:
        dots['KV-02h'], info = put_pawn(raw['KV-02h'], KV_FIX['KV-02h']['pawn_at'])
        fixed['KV-02h'] = dots['KV-02h']
        print('KV-02h pawn', info)
    for n, f in DOTS_OUT.items():
        dots[n].save(os.path.join(STORE, f), optimize=True)
    finals = {}
    for name, o in KV_OUT.items():
        fin, info = assemble(dots, o)
        fin.save(os.path.join(STORE, name), optimize=True)
        finals[name] = fin
        print(name, fin.size, info)
    if sheets:
        os.makedirs(sheets, exist_ok=True)
        for n in DOTS_OUT:
            source_sheet(n, raw[n], fixed.get(n), os.path.join(sheets, f'{n}-compare.png'))
        store_sheet(finals, os.path.join(sheets, 'KV-store-crops.png'))


if __name__ == '__main__':
    main()
