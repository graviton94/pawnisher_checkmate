"""받은 스토어 그림 R-03 · R-04 · R-06 · R-07 반입 (D-423 · D-559) → 스팀 캡슐 정확한 크기 + 타이틀 로고.

  python3 -I tools/pixel/store_import.py [measure] [R-03 …]
    measure: gridmeasure.measure로 축마다 도트 간격 · 위상을 다시 재서 보여 준다(레시피와 견준다).
    없으면: 레시피(scene_recipe.STORE_GRID)대로
      ① 원본 build-res/order/R-0N-source.png → 축마다 실측한 간격 · 위상의 칸 경계(균일 / 같은 칸 수 dp_fixed ±10 · 20 · 30% 가운데
         복원 오차가 가장 낮은 것 — event_import.cuts_for와 같은 법, 다만 축마다 다른 간격)
      ② 칸 가운데 50%의 최빈 묶음 중앙값(평균 없음) → CIELAB 시그마 필터(면 그레인만) → k-평균 팔레트(발주 상한 32색) → 덩어리 · 외톨이 정리
      ③ 사내 손질(D-386 — 다시 칠하기 · 지우기만, 새 부품을 그리지 않는다): 종이 왕관 → K0 마분지 세 단(#E0A862 · #B57C3C · #7A4C22)으로
         밝기 순 다시 칠하기(청록 보석 · 먹선은 그대로), 기물 눈 · 입 낱점 → 둘레 몸 색으로 지우기
      ③' R-06 흰 나이트 → 정본 실루엣(톱니 갈기 · 눈 · 입 · 콧구멍 메움, D-560 사장님 지시 — fix_knight)
      ④ (--d559만 — D-560 사장님 반려, 합성 방식 폐기 → build-res/unused/store-d559/) 정수배 계단 확대(×k) → 초점 자리로 정확한 스팀 크기 자르기(늘이지 않는다) → 로고 자리(빈 쇠판)에 타이틀 로고를 정수배로 얹기
         (로고 꼴: full = 문장 + 글자 / word = 글자 두 줄만 / lockup = 문장 왼쪽 + 글자 오른쪽 — 모두 title-logo.png 자르기 · 배치만)
    → build-res/store/dots/<ID>.png(도트 1칸 = 1px, 손질 뒤) · 대조 build-res/order/<ID>-check.png
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
import event_import as ev  # noqa: E402
import gridmeasure  # noqa: E402
import snap  # noqa: E402
from scene_recipe import STORE_GRID, STORE_OUT  # noqa: E402

ORDER = os.path.join(ROOT, 'build-res', 'order')
STORE = os.path.join(ROOT, 'build-res', 'store')
LOGO = os.path.join(ROOT, 'public', 'ui', 'title-logo.png')
K0_CROWN = ['#E0A862', '#B57C3C', '#7A4C22']  # public/pieces/s-K0.png 왕관 세 단(밝음 → 어둠)


def hexrgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


def cuts(src, g):
    """축마다 실측 간격 · 위상: 균일과 같은 칸 수 dp_fixed 가운데 복원 오차가 가장 낮은 경계"""
    a = np.asarray(src, float)
    H, W = a.shape[:2]
    ux, uy = ev.phased(W, g['x'][0], g['x'][1]), ev.phased(H, g['y'][0], g['y'][1])
    best = (ev.rec_error(a, ux, uy), ux, uy, 'uniform')
    err_u = best[0]
    px_, py_ = snap._profile(a, 1), snap._profile(a, 0)
    for slack in (0.1, 0.2, 0.3):
        xe, ye = ev.dp_fixed(px_, W, len(ux) - 1, slack), ev.dp_fixed(py_, H, len(uy) - 1, slack)
        err = ev.rec_error(a, xe, ye)
        if err < best[0]:
            best = (err, xe, ye, f'dp±{slack}')
    return best[1], best[2], {'grid': best[3], 'errUniform': round(err_u, 3), 'err': round(best[0], 3)}


def restore(g):
    """원본 → 도트 1칸 = 1px RGB (팔레트 · 정리까지). 반환 (원본, 도트, 기록, 경계)"""
    src = Image.open(os.path.join(ORDER, g['source'])).convert('RGB')
    xe, ye, rec = cuts(src, g)
    raw = ev.sample(src, xe, ye)
    L = ev.lab(raw)
    L = ev.sigma_median(L, g.get('sigma', 6), 2)
    C, idx, err, K = ev.palette(L, 24, g.get('colors', 32), target=1.5)
    idx = ev.merge_small(idx, C, 12, g.get('merge_de', 8))
    idx = ev.mode_filter(idx, C, g.get('mode_de', 8))
    idx = ev.singles(idx, C, 16)
    pal = ev.unlab(C)
    out = pal[idx]
    rec.update({'cells': [len(xe) - 1, len(ye) - 1], 'colors': int(len(np.unique(idx))), 'meanDE': round(err, 2)})
    return src, Image.fromarray(out, 'RGB'), rec, (xe, ye)


def _flood(a, seed, box, ok):
    """box 안에서 seed부터 ok(색) 칸을 4-연결로 넓힌 마스크"""
    H, W = a.shape[:2]
    x0, y0, x1, y1 = box
    m = np.zeros((H, W), bool)
    st = [seed]
    while st:
        x, y = st.pop()
        if not (x0 <= x < x1 and y0 <= y < y1) or m[y, x] or not ok(a[y, x]):
            continue
        m[y, x] = True
        st += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
    return m


def is_card(c):
    """마분지 · 황동 · 주황 계열(청록 보석 · 먹 · 상아 · 쇠 회색이 아니다)"""
    r, g_, b = (int(v) for v in c)
    return r > 70 and r >= g_ + 18 and g_ >= b and r - b > 50


def fix_crown(img, fx):
    """왕관을 K0 마분지 세 단으로 다시 칠한다 — 받은 왕관 색을 밝기 순 셋으로 나눠 맞춘다(모양 · 보석 · 먹선 그대로)"""
    a = np.asarray(img).copy()
    x0, y0, x1, y1 = fx['box']
    # 씨앗 = 상자 가운데에서 가장 가까운 마분지 칸(왕관 띠) — 먹선 안쪽만 4-연결로 넓힌다(뒤 쇳물로 새지 않게 상자로 묶는다)
    _, sx, sy = min((abs(x - (x0 + x1) / 2) + abs(y - (y0 + y1) / 2), x, y)
                    for y in range(y0, y1) for x in range(x0, x1) if is_card(a[y, x]))
    m = _flood(a, (sx, sy), fx['box'], is_card)
    cols = np.unique(a[m].reshape(-1, 3), axis=0)
    lum = cols @ [0.299, 0.587, 0.114]
    ramp = [hexrgb(h) for h in K0_CROWN]
    t = fx.get('split', (0.88, 0.62))  # 가장 많은 색(왕관 앞면) 밝기에 견준 비: 이상 = 밝은 단, 그다음 = 가운데 단, 아래 = 어두운 단
    cnt = [int((a[m] == c).all(1).sum()) for c in cols]
    face = lum[int(np.argmax(cnt))]
    lut = {}
    for c, l in zip(cols, lum):
        r = l / face
        lut[tuple(c)] = ramp[0] if r >= t[0] else (ramp[1] if r >= t[1] else ramp[2])
    ys, xs = np.nonzero(m)
    for y, x in zip(ys, xs):
        a[y, x] = lut[tuple(a[y, x])]
    return Image.fromarray(a, 'RGB'), int(m.sum())


def dark_in(img, boxes):
    """상자 [x0, y0, x1, y1, 밝기 상한] 안의 어두운 칸(기물 눈 · 콧구멍 낱점) 좌표"""
    a = np.asarray(img)
    lum = a @ [0.299, 0.587, 0.114]
    return [(x, y) for x0, y0, x1, y1, t in boxes for y in range(y0, y1) for x in range(x0, x1) if lum[y, x] < t]


def erase(img, pts):
    """낱점 지우기: 각 칸을 지울 칸이 아닌 8이웃의 최다 색으로"""
    a = np.asarray(img).copy()
    S = {tuple(p) for p in pts}
    for x, y in pts:
        nb = [tuple(a[y + dy, x + dx]) for dy in (-1, 0, 1) for dx in (-1, 0, 1)
              if (dx or dy) and (x + dx, y + dy) not in S and 0 <= y + dy < a.shape[0] and 0 <= x + dx < a.shape[1]]
        a[y, x] = max(set(nb), key=nb.count)
    return Image.fromarray(a, 'RGB')


def fix_knight(img, fx):
    """흰 나이트를 게임 정본 실루엣처럼 (D-560, 사장님 지시 사내 수정 — 다시 칠하기 · 메우기만, 새 부품을 그리지 않는다).

    fx = {box: 나이트 머리 · 목 상자(도트), seed: 몸 안 한 칸, outline · ivory · shade · dark: 받은 그림 자신의 색,
          mane_rows: 갈기 결(dark)을 그늘로 펼 줄 범위, face: 눈 · 콧구멍 · 입 상자들(상아로 메움), lw: 외곽선 두께(도트)}
    ① 몸 마스크 = seed부터 기물 색(먹 · 상아 · 그늘 · 결)으로 4-연결 → 줄마다 왼쪽 끝 ~ 오른쪽 끝을 메운다(톱니 갈기 틈 · 벌린 입 · 콧구멍이 닫힌다)
    ② 외곽선을 새 실루엣에서 다시 두른다(바깥에서 lw칸 — 받은 판 기물이 배경의 절반 도트라 2칸 = 배경 1도트)
    ③ 안쪽: 받은 상아 · 밝은 상아 · 그늘은 그대로, 갈기 결(dark) → 그늘, 얼굴 상자 안 → 상아, 남은 틈은 이웃 다수 색
    """
    a = np.asarray(img).copy()
    H, W = a.shape[:2]
    x0, y0, x1, y1 = fx['box']
    col = {k: np.array(hexrgb(fx[k])) for k in ('outline', 'ivory', 'shade', 'dark', 'light')}
    body = [col[k] for k in ('outline', 'ivory', 'shade', 'dark', 'light')]

    def is_body(c):
        return any((c == b).all() for b in body)

    m0 = _flood(a, tuple(fx['seed']), fx['box'], is_body)
    m = np.zeros_like(m0)
    for y in range(y0, y1):
        xs = np.nonzero(m0[y])[0]
        if len(xs):
            m[y, xs[0]:xs[-1] + 1] = True
    # 바깥에서 lw칸 = 외곽선 (상자 아래 끝은 몸이 이어지므로 안쪽으로 친다)
    lw = fx.get('lw', 2)
    pad = np.pad(m, lw, constant_values=False)
    pad[y1 + lw:, :] = pad[y1 + lw - 1:y1 + lw, :]  # 아래로 몸이 이어진다
    inner = np.ones_like(m)
    for dy in range(-lw, lw + 1):
        for dx in range(-lw, lw + 1):
            inner &= pad[lw + dy:lw + dy + H, lw + dx:lw + dx + W]
    outline = m & ~inner
    keep = [col['ivory'], col['shade'], col['light']]
    face = np.zeros_like(m)
    for fx0, fy0, fx1, fy1 in fx.get('face', []):
        face[fy0:fy1, fx0:fx1] = True
    out = a.copy()
    todo = []
    for y, x in zip(*np.nonzero(m)):
        c = a[y, x]
        if outline[y, x]:
            out[y, x] = col['outline']
        elif face[y, x]:
            out[y, x] = col['ivory'] if not (c == col['light']).all() else c
        elif any((c == k).all() for k in keep):
            out[y, x] = c
        elif (c == col['dark']).all() and fx['mane_rows'][0] <= y < fx['mane_rows'][1]:
            out[y, x] = col['shade']
        elif (c == col['dark']).all():
            out[y, x] = c
        else:
            todo.append((x, y))
    # 남은 틈(옛 톱니 먹 · 배경 구멍): 이미 정한 이웃(외곽선 제외) 다수 색으로, 안쪽으로 번져 가며
    done = m.copy()
    for x, y in todo:
        done[y, x] = False
    while todo:
        rest = []
        for x, y in todo:
            nb = [tuple(out[y + dy, x + dx]) for dy in (-1, 0, 1) for dx in (-1, 0, 1)
                  if (dx or dy) and done[y + dy, x + dx] and not outline[y + dy, x + dx]]
            if nb:
                out[y, x] = max(set(nb), key=nb.count)
            else:
                rest.append((x, y))
        for x, y in todo:
            if (x, y) not in rest:
                done[y, x] = True
        if len(rest) == len(todo):
            for x, y in rest:
                out[y, x] = col['ivory']
            break
        todo = rest
    changed = int((out != a).any(2).sum())
    return Image.fromarray(out, 'RGB'), changed


def logo_parts():
    """title-logo.png를 문장 · 글자 두 덩이로 (줄 점유로 나눈다 — 그리지 않는다)"""
    lg = Image.open(LOGO).convert('RGBA')
    al = np.asarray(lg)[:, :, 3] > 0
    rows = np.nonzero(al.any(1))[0]
    gaps = [r for r in range(rows[0], rows[-1]) if not al[r].any()]
    split = gaps[0]  # 문장(위) | 글자(아래) 사이 첫 빈 줄
    em = lg.crop((0, 0, lg.width, split))
    word = lg.crop((0, split, lg.width, lg.height))
    return lg.crop(lg.getbbox()), em.crop(em.getbbox()), word.crop(word.getbbox())


def logo_variant(kind, gap=8):
    full, em, word = logo_parts()
    if kind == 'full':
        return full
    if kind == 'word':
        return word
    out = Image.new('RGBA', (em.width + gap + word.width, max(em.height, word.height)), (0, 0, 0, 0))
    out.alpha_composite(em, (0, (out.height - em.height) // 2))
    out.alpha_composite(word, (em.width + gap, (out.height - word.height) // 2))
    return out


def place_logo(canvas, plate, kind, margin):
    """plate(최종 px 상자) 안에 margin을 두고 들어가는 가장 큰 정수배로 로고를 가운데에 얹는다"""
    lg = logo_variant(kind)
    x0, y0, x1, y1 = plate
    s = max(1, min((x1 - x0 - 2 * margin) // lg.width, (y1 - y0 - 2 * margin) // lg.height))
    big = lg.resize((lg.width * s, lg.height * s), Image.NEAREST)
    pos = (x0 + (x1 - x0 - big.width) // 2, y0 + (y1 - y0 - big.height) // 2)
    canvas.alpha_composite(big, pos)
    return {'logo': kind, 'scale': s, 'size': list(big.size), 'at': list(pos)}


def final(dots, o):
    """×k 계단 확대 → 초점 자리 자르기(늘이지 않는다) → 로고. o = scene_recipe.STORE_OUT 한 줄(crop = 자를 왼쪽 위, 도트)"""
    k = o['k']
    W, H = o['size']
    up = dots.resize((dots.width * k, dots.height * k), Image.NEAREST).convert('RGBA')
    assert up.width >= W and up.height >= H, (o, up.size, '정수배가 스팀 크기보다 작다')
    cx, cy = round(o['crop'][0] * k), round(o['crop'][1] * k)
    cx, cy = max(0, min(up.width - W, cx)), max(0, min(up.height - H, cy))
    out = up.crop((cx, cy, cx + W, cy + H))
    info = {'src': o['src'], 'k': k, 'up': list(up.size), 'crop': [cx, cy], 'kept': [round(W / up.width, 3), round(H / up.height, 3)],
            'dots': [round(v, 2) for v in (cx / k, cy / k, (cx + W) / k, (cy + H) / k)]}
    if o.get('plate'):  # 도트 좌표 상자 → 최종 px
        px0, py0, px1, py1 = o['plate']
        plate = (max(0, px0 * k - cx), max(0, py0 * k - cy), min(W, px1 * k - cx), min(H, py1 * k - cy))
        info.update(place_logo(out, plate, o['logo'], o.get('margin', 8)))
        info['plate'] = list(plate)
    return out.convert('RGB'), info


def check_sheet(name, src, raw_dots, dots, fin, xe_ye, out):
    """대조판: 원본 축소 없이 1:1 자르기 | 복원 도트(같은 자리, 정수배) | 손질 뒤 | 최종(1:1)"""
    xe, ye = (np.asarray(v) for v in xe_ye)
    fx, fy = STORE_GRID[name].get('focus', (0.5, 0.6))
    W, H = src.size
    cw, ch = min(360, W), min(300, H)
    x0, y0 = int(max(0, min(W - cw, W * fx - cw / 2))), int(max(0, min(H - ch, H * fy - ch / 2)))
    i0, j0 = int(np.searchsorted(xe, x0)), int(np.searchsorted(ye, y0))
    i1, j1 = int(np.searchsorted(xe, x0 + cw)), int(np.searchsorted(ye, y0 + ch))
    tiles = [('source 1:1', src.crop((x0, y0, x0 + cw, y0 + ch)))]
    for lab_, im in (('restored dots', raw_dots), ('after fixes', dots)):
        c = im.crop((i0, j0, i1, j1))
        z = max(1, round(ch / c.height))
        tiles.append((f'{lab_} {im.width}x{im.height} x{z}', c.resize((c.width * z, c.height * z), Image.NEAREST)))
    gap = 10
    top_w = sum(t.width for _, t in tiles) + gap * (len(tiles) + 1)
    sw = max(top_w, fin.width + 2 * gap, 2 * gap + W // 2)
    sh = Image.new('RGB', (sw, 24 + max(t.height for _, t in tiles) + 34 + fin.height + 34 + H // 2 + gap), (20, 19, 24))
    d = ImageDraw.Draw(sh)
    x = gap
    for lab_, t in tiles:
        d.text((x, 6), lab_, fill=(250, 204, 21))
        sh.paste(t.convert('RGB'), (x, 24))
        x += t.width + gap
    y = 24 + max(t.height for _, t in tiles) + 10
    d.text((gap, y), f'final {fin.width}x{fin.height} 1:1', fill=(250, 204, 21))
    sh.paste(fin, (gap, y + 18))
    y += 18 + fin.height + 10
    d.text((gap, y), 'whole source (1/2, nearest)', fill=(250, 204, 21))
    sh.paste(src.resize((W // 2, H // 2), Image.NEAREST), (gap, y + 18))
    sh.save(out, optimize=True)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if args and args[0] == 'measure':
        for n in args[1:] or list(STORE_GRID):
            img = Image.open(os.path.join(ORDER, STORE_GRID[n]['source']))
            m = gridmeasure.measure(img, lo=6, hi=40)
            print(n, json.dumps(gridmeasure.short(m)), 'recipe', STORE_GRID[n]['x'], STORE_GRID[n]['y'])
        return
    os.makedirs(os.path.join(STORE, 'dots'), exist_ok=True)
    report, dots_of = {}, {}
    only = set(args)
    srcs = [n for n in STORE_GRID if not only or n in only] if '--outs' not in sys.argv else []
    for n in srcs:
        g = STORE_GRID[n]
        src, raw_dots, rec, xe_ye = restore(g)
        dots = raw_dots
        notes = []
        for fx in g.get('crown', []):
            dots, cnt = fix_crown(dots, fx)
            notes.append(f'crown→K0 {cnt} dots')
        if g.get('erase'):
            pts = dark_in(dots, g['erase'])
            dots = erase(dots, pts)
            notes.append(f'erased {len(pts)} dots {pts}')
        if g.get('knight'):
            dots, cnt = fix_knight(dots, g['knight'])
            notes.append(f'knight→canon silhouette {cnt} dots')
        dots.save(os.path.join(STORE, 'dots', f'{n}.png'))
        raw_dots.save(os.path.join(STORE, 'dots', f'{n}-raw.png'))
        rec['fixes'] = notes
        dots_of[n] = dots
        first = next((o for o in STORE_OUT.values() if o['src'] == n), None)
        fin = final(dots, first)[0] if first else dots
        check_sheet(n, src, raw_dots, dots, fin, xe_ye, os.path.join(ORDER, f'{n}-check.png'))
        report[n] = rec
        print(n, json.dumps(rec, ensure_ascii=False), flush=True)
    # 최종 스토어 크기: 받은 그림(손질 뒤 도트)에서 정수배 확대 + 자르기 — R-05 · R-08 · R-09는 받은 그림에서 잘라 쓴다(발주 취소)
    # D-560: 사장님 반려 — 합성 방식 폐기. 옛 합성 판은 --d559일 때만 build-res/unused/store-d559/로 다시 찍는다.
    outs = STORE_OUT.items() if '--d559' in sys.argv else []
    for name, o in outs:
        if only and name not in only and o['src'] not in only:
            continue
        if o['src'] not in dots_of:
            dots_of[o['src']] = Image.open(os.path.join(STORE, 'dots', f'{o["src"]}.png')).convert('RGB')
        fin, info = final(dots_of[o['src']], o)
        fin.save(os.path.join(ROOT, 'build-res', 'unused', 'store-d559', name), optimize=True)
        report[name] = info
        print(name, json.dumps(info, ensure_ascii=False), flush=True)
    path = os.path.join(ORDER, 'store-import-report.json')
    old = json.load(open(path)) if os.path.exists(path) else {}
    old.update(report)
    with open(path, 'w') as f:
        json.dump(old, f, ensure_ascii=False, indent=1)
        f.write('\n')


if __name__ == '__main__':
    main()
