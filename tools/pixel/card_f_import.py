"""
카드 F 가족 반입 (D-585 · 발주 29위 CD-01f · CD-06 ~ CD-11, D-583 · D-584).

  python3 -I tools/pixel/card_f_import.py measure   → 시트마다 부품 상자 · 몸 상자 · 복원 오차 곡선(레시피 확인용)
  python3 -I tools/pixel/card_f_import.py build     → src/assets/ui/cards/* · chrome/v2/* 를 찍고 src/slice/card-f.css를 쓴다
  python3 -I tools/pixel/card_f_import.py sheet <out.png>  → 원본 · 결과 · 시안 대조판

원본 → 도트(D-423): 레시피(card_f_recipe.py)의 px 상자를 발주 도트 상자에 맞춘 칸 간격으로 나눠 칸마다 가운데 최빈색(snap.snap).
평균 · 리샘플 없음. 마젠타 키(번짐 포함)는 투명, 나머지는 발주 33색으로 붙인다(map_palette).
사내 손질(art-assets §7 — 지우기 · 다시 칠하기 · 자르기만): 그림 창 구멍 속에 그려 온 등급 빛 디더는 지운다(창 장면 겹이 같은 빛을 갖는다).
"""
import json
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
import gridmeasure as gm  # noqa: E402
import snap  # noqa: E402
import card_f_recipe as R  # noqa: E402

ORDER = os.path.join(ROOT, 'build-res', 'order')
CARDS = os.path.join(ROOT, 'src', 'assets', 'ui', 'cards')
CHROME = os.path.join(ROOT, 'src', 'assets', 'ui', 'chrome', 'v2')
PARTS = os.path.join(ORDER, 'CD-F-parts')
PAL = [tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for h in R.PAL33]
INK = PAL[0]
KEY = (255, 0, 255)


def src(sheet):
    return Image.open(os.path.join(ORDER, f'{sheet}-source.png')).convert('RGB')


def restore(img, box, dst, canvas):
    """px 상자 box를 도트 상자 dst(캔버스 기준, 끝 제외)에 맞춘 칸 간격으로 나눠 칸마다 최빈색. 캔버스 밖 원본은 마젠타로 채워 읽는다."""
    x0, y0, x1, y1 = box
    dx0, dy0, dx1, dy1 = dst
    px, py = (x1 - x0) / (dx1 - dx0), (y1 - y0) / (dy1 - dy0)
    ox, oy = x0 - dx0 * px, y0 - dy0 * py
    W, H = canvas
    pad = int(max(px, py) * 12) + 2
    big = Image.new('RGB', (img.width + 2 * pad, img.height + 2 * pad), KEY)
    big.paste(img, (pad, pad))
    xs = [ox + pad + i * px for i in range(W + 1)]
    ys = [oy + pad + j * py for j in range(H + 1)]
    small = snap.snap(big.convert('RGBA'), px, 0, py, 0, colors=0, core=0.6, cuts=(xs, ys))
    return small, (round(px, 3), round(py, 3))


def key_and_palette(small):
    """마젠타(번짐 포함) → 투명, 나머지 → 33색. 반환 RGBA"""
    a = np.asarray(small.convert('RGBA')).copy()
    H, W = a.shape[:2]
    for y in range(H):
        for x in range(W):
            c = tuple(int(v) for v in a[y, x, :3])
            if gm.is_key_fringe(c):
                a[y, x] = (0, 0, 0, 0)
            else:
                a[y, x, 3] = 255
    out = gm.map_palette(Image.fromarray(a, 'RGBA'), PAL)
    b = np.asarray(out).copy()
    b[b[:, :, 3] == 0] = (0, 0, 0, 0)
    return Image.fromarray(b, 'RGBA')


def measure():
    """레시피 상자마다 칸 간격 · 가로세로 비 · 그 간격의 복원 오차와 이웃 간격 오차(격자가 있는지)"""
    rep = {}
    for sheet, parts in R.SHEETS.items():
        img = src(sheet)
        for p in parts:
            name, kind, box = p[0], p[1], p[2]
            dst = _dst(p)
            px, py = (box[2] - box[0]) / (dst[2] - dst[0]), (box[3] - box[1]) / (dst[3] - dst[1])
            a = np.asarray(img.crop(box), float)
            a[(np.abs(a - np.array(KEY, float)).sum(2) < 120)] = 0
            g = a.mean(2)
            row = {}
            for k, axis, P in (('x', 1, px), ('y', 0, py)):
                sub = g[::3] if axis == 1 else g[:, ::3]
                errs = {round(f, 2): round(gm._best_phase(sub, axis, P * f, 16)[0], 2) for f in (0.9, 0.95, 1.0, 1.05, 1.1)}
                row[k] = {'pitch': round(P, 3), 'err': errs}
            row['aspect'] = round(px / py, 3)
            rep[f'{sheet}/{name}'] = row
            print(sheet, name, json.dumps(row, ensure_ascii=False))
    return rep


def _dst(p):
    kind = p[1]
    if kind == 'card':
        return R.BODY
    if kind == 'slot':
        return R.SLOT_BODY
    if kind == 'strip':
        return R.STRIP_BODY
    if kind == 'fx':
        return (0, 0) + p[3]
    # 창 장면: 카드와 같은 시트 간격(같은 시트 일반 카드)으로 — 크기는 상자에서
    return None


def sheet_pitch(sheet):
    """시트의 카드 칸 간격(첫 카드 몸) — 창 장면 겹을 같은 간격으로 뽑는다"""
    for p in R.SHEETS[sheet]:
        if p[1] == 'card':
            b = p[2]
            return (b[2] - b[0]) / (R.BODY[2] - R.BODY[0]), (b[3] - b[1]) / (R.BODY[3] - R.BODY[1])
    raise KeyError(sheet)




# ---------------------------------------------------------------- 카드 앞면

FAMILY = {'cmd': 'CD-01f', 'part': 'CD-06', 'svc': 'CD-07', 'crew': 'CD-08', 'set': 'CD-09'}


def _pal_index(a):
    """RGBA → 팔레트 번호(투명 = -1)"""
    rgb = a[:, :, :3].astype(int)
    out = np.full(a.shape[:2], -1, int)
    for i, c in enumerate(PAL):
        out[(np.abs(rgb - np.array(c)).sum(-1) == 0) & (a[:, :, 3] > 0)] = i
    return out


def _cc(mask, conn=4):
    """연결 덩어리 [(칸 목록 ys, xs)]"""
    from scipy import ndimage as nd
    st = None if conn == 4 else np.ones((3, 3), int)
    lab, n = nd.label(mask, structure=st)
    return [np.nonzero(lab == i) for i in range(1, n + 1)]


def hole_of(a):
    """그림 창 = 바깥과 이어지지 않은 투명 덩어리 가운데 가장 큰 것 → (마스크, 상자 x0, y0, x1, y1 끝 제외)"""
    from scipy import ndimage as nd
    clear = a[:, :, 3] == 0
    lab, n = nd.label(clear)
    edge = set(np.unique(np.r_[lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    best = max((i for i in range(1, n + 1) if i not in edge), key=lambda i: (lab == i).sum())
    m = lab == best
    ys, xs = np.nonzero(m)
    return m, (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)


def flatten(a, box, passes=3):
    """사내 손질(다시 칠하기): 종이 글 칸 안의 외톨이 얼룩 칸 → 칸의 바탕 종이색. 이웃 넷 가운데 셋 이상이 바탕색인 칸만(핀 · 테는 그대로)"""
    x0, y0, x1, y1 = box
    sub = a[y0:y1, x0:x1, :3].reshape(-1, 3)
    vals, cnt = np.unique(sub, axis=0, return_counts=True)
    base = vals[cnt.argmax()]
    n = 0
    for _ in range(passes):
        for y in range(y0 + 1, y1 - 1):
            for x in range(x0 + 1, x1 - 1):
                if (a[y, x, :3] == base).all():
                    continue
                k = sum((a[y + dy, x + dx, :3] == base).all() for dy, dx in ((0, 1), (1, 0), (0, -1), (-1, 0)))
                if k >= 3:
                    a[y, x, :3] = base
                    a[y, x, 3] = 255
                    n += 1
    return n


def paper_boxes(a, hole_box):
    """종이 칸들: 밝은 종이색(#E8E0CC 이상 · 무채) 덩어리 가운데 큰 것 — (이름 글 칸, 설명지) 상자"""
    idx = _pal_index(a)
    light = np.isin(idx, [R.PAL33.index(h) for h in ('#E8E0CC', '#F4F1EA', '#FFFFFF', '#CFC6AE')])
    comps = []
    for ys, xs in _cc(light):
        if len(xs) >= 60:
            comps.append(((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1), len(xs)))
    comps.sort(key=lambda c: -c[1])
    desc = comps[0][0]
    above = [c for c in comps[1:] if c[0][3] <= desc[1] + 1]
    name = max(above, key=lambda c: c[1])[0] if above else None
    return name, desc


def card(sheet, entry, fixes):
    """카드 한 장: 복원 → 키 · 팔레트 → 사내 손질. 반환 (RGBA, 기록)"""
    name, _, box = entry[:3]
    small, pitch = restore(src(sheet), box, R.BODY, R.CARD)
    img = key_and_palette(small)
    a = np.asarray(img).copy()
    rec = {'pitch': pitch, 'aspect': round(pitch[0] / pitch[1], 3), 'fix': []}
    f = fixes.get(name, {})
    # ① 명령 카드: 창 구멍 속 등급 빛 · 불티 지우기(창 장면 겹이 같은 빛을 갖는다) — 등불 상자(keep)는 남기고, 구멍 둘레 한 칸의 빈 칸은 먹으로
    if 'window' in f:
        wx0, wy0, wx1, wy1 = f['window']
        keep = np.zeros(a.shape[:2], bool)
        for kx0, ky0, kx1, ky1 in f.get('keep', []):
            keep[ky0:ky1, kx0:kx1] = True
        zone = np.zeros(a.shape[:2], bool)
        zone[wy0:wy1, wx0:wx1] = True
        kill = zone & ~keep & (a[:, :, 3] > 0)
        a[kill] = 0
        ring = np.zeros(a.shape[:2], bool)
        ring[wy0 - 1:wy1 + 1, wx0 - 1:wx1 + 1] = True
        ring &= ~zone
        fill = ring & (a[:, :, 3] == 0)
        a[fill] = INK + (255,)
        rec['fix'].append(f'창 속 빛 · 불티 지움 {int(kill.sum())}칸 · 창 둘레 빈 칸 먹 {int(fill.sum())}칸')
    # ② 다시 칠하기: 레시피의 (상자, 색) — 명판 볼트 → 종이 등
    for (x0, y0, x1, y1), col, why in f.get('paint', []):
        c = tuple(int(col[i:i + 2], 16) for i in (1, 3, 5))
        reg = a[y0:y1, x0:x1]
        m = reg[:, :, 3] > 0
        reg[m, :3] = c
        rec['fix'].append(f'{why} ({x0},{y0})–({x1},{y1}) → {col}')
    # ③ 금 인장 내리기(자르기 · 배치): 받은 그림은 인장이 설명지 오른쪽 아래를 덮어 마지막 효과 행이 인장 위로 지나간다 —
    #    발주 자리(종이 아래 끝 밖)로 dy줄 내리고, 비운 종이 칸은 종이색 · 종이 밖 칸은 먹으로 다시 칠한다
    if 'move' in f:
        cx, cy, r, dy, pend, pright = f['move']
        idx = _pal_index(a)
        paperish = np.isin(idx, [R.PAL33.index(h) for h in ('#CFC6AE', '#E8E0CC', '#F4F1EA', '#FFFFFF', '#A39A84')])
        yy, xx = np.mgrid[0:a.shape[0], 0:a.shape[1]]
        seal = ((xx + 0.5 - cx) ** 2 + (yy + 0.5 - cy) ** 2 <= r * r) & (a[:, :, 3] > 0) & ~paperish
        px = a[seal].copy()
        ys, xs = np.nonzero(seal)
        pc_ = tuple(int(R.PAPER[i:i + 2], 16) for i in (1, 3, 5)) + (255,)
        for y, x in zip(ys, xs):
            if x > pright + 1:
                continue
            a[y, x] = pc_ if (y < pend and x <= pright) else (INK + (255,))
        for (y, x), p in zip(zip(ys, xs), px):
            if y + dy < a.shape[0]:
                a[y + dy, x] = p
        rec['fix'].append(f'금 인장 {dy}줄 내림(설명지 밖으로) · 비운 칸 종이/먹 {len(xs)}칸')
    # ③ 설명지 얼룩: 이웃 셋 이상이 바탕 종이색인 외톨이 칸만 바탕색으로
    _, hb = hole_of(a)
    _, db = paper_boxes(a, hb)
    n2 = flatten(a, db)
    if n2:
        rec['fix'].append(f'설명지 얼룩 다시 칠함 {n2}칸')
    return Image.fromarray(a, 'RGBA'), rec


def _save(img, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, optimize=True)


def scene(sheet, entry, win):
    """창 장면 겹: 같은 시트 카드 간격으로 복원 → 창 상자(w × h)에 맞게 자른다(가로 가운데 · 세로 아래 맞춤, 늘리지 않는다 — D-386)"""
    px, py = sheet_pitch(sheet)
    box = entry[2]
    W, H = round((box[2] - box[0]) / px), round((box[3] - box[1]) / py)
    small, _ = restore(src(sheet), box, (0, 0, W, H), (W, H))
    img = key_and_palette(small)
    ww, wh = win[2] - win[0], win[3] - win[1]
    cx = max(0, (W - ww) // 2)
    cy = max(0, H - wh)
    out = Image.new('RGBA', (ww, wh), (0, 0, 0, 0))
    out.paste(img.crop((cx, cy, cx + min(ww, W), cy + min(wh, H))), ((ww - min(ww, W)) // 2, 0))
    return out, {'restored': (W, H), 'window': (ww, wh), 'crop': (cx, cy)}


def masks(a, win):
    """창 가리개(구멍 모양, 창 상자 크기) · 쇠 가리개(틀의 쇠 · 황동 칸 — 종이 · 창 제외, 카드 크기)"""
    hm, _ = hole_of(a)
    x0, y0, x1, y1 = win
    m = np.zeros((y1 - y0, x1 - x0, 4), np.uint8)
    m[hm[y0:y1, x0:x1]] = (255, 255, 255, 255)
    idx = _pal_index(a)
    paper = np.isin(idx, [R.PAL33.index(h) for h in ('#6E6452', '#A39A84', '#CFC6AE', '#E8E0CC', '#F4F1EA', '#FFFFFF')])
    metal = (a[:, :, 3] > 0) & ~paper
    mm = np.zeros(a.shape, np.uint8)
    mm[metal] = (255, 255, 255, 255)
    return Image.fromarray(m, 'RGBA'), Image.fromarray(mm, 'RGBA')


def cost_gear():
    """비용 톱니(D-574 지금 그림 그대로): 옛 명령 틀(56×84, build-res/order/CD-F-parts/old/cmd-common.png)의 황동 고리를 오려 낸다.
    구멍 가운데(11, 13)에서 반지름 9.6 안 · 황동 · 종이 칸 + 황동에 붙은 먹 칸만 — 18×18(구멍 가운데가 정가운데)"""
    import colorsys
    a = np.asarray(Image.open(os.path.join(PARTS, 'old', 'cmd-common.png')).convert('RGBA'))
    cx, cy, S = 11, 13, 18
    out = np.zeros((S, S, 4), np.uint8)

    def kind(p):
        if p[3] == 0:
            return 0
        h, s, v = colorsys.rgb_to_hsv(*[q / 255 for q in p[:3]])
        if v < 0.12:
            return 3
        if s > 0.35 and 25 <= h * 360 <= 60:
            return 1
        if v > 0.8 and s < 0.15:
            return 2
        return 0
    K = {}
    for y in range(cy - S // 2, cy + S // 2):
        for x in range(cx - S // 2, cx + S // 2):
            K[y, x] = kind(a[y, x]) if 0 <= y < a.shape[0] and 0 <= x < a.shape[1] else 0
    for (y, x), k in K.items():
        if (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 > 9.6 ** 2:
            continue
        ok = k in (1, 2) or (k == 3 and any(K.get((y + dy, x + dx)) == 1 for dy, dx in ((0, 1), (1, 0), (0, -1), (-1, 0))))
        if ok:
            out[y - (cy - S // 2), x - (cx - S // 2)] = a[y, x]
    # 구멍 안 빈 칸(옛 틀의 청록 잡점을 뺀 자리)은 종이로
    from scipy import ndimage as nd
    clear = out[:, :, 3] == 0
    lab, n = nd.label(clear)
    edge = set(np.unique(np.r_[lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    paper = tuple(int(v) for v in a[cy, cx])
    for i in range(1, n + 1):
        if i not in edge:
            out[lab == i] = paper
    return Image.fromarray(out, 'RGBA'), {'from': 'old/cmd-common.png 56×84', 'box': (cx - S // 2, cy - S // 2, cx + S // 2, cy + S // 2)}


def fx_sheet():
    """CD-11 → 희귀 · 금 띠 8장 줄(84×126 × 8) · 볏 불꽃 6장(13×13) · 창 불티 6장(70×36). 띠는 조각마다 겹이 가장 많은 칸(장)에 붙인다
    (받은 시트는 칸 왼끝이 0 ~ 6도트 어긋나 있다 — 칸 밖으로 나간 조각은 그 장의 칸 기준 자리 그대로, 카드 밖은 잘린다)."""
    small, pitch = restore(src('CD-11'), (0, 0, 1910, 823), (0, 0, 744, 320), (744, 320))
    sh = key_and_palette(small)
    a = np.asarray(sh)
    out, rec = {}, {'pitch': pitch}
    for key, y0 in (('rare', 8), ('gold', 142)):
        strip = np.zeros((126, 84 * 8, 4), np.uint8)
        band = np.zeros(a.shape[:2], bool)
        band[y0:y0 + 126] = a[y0:y0 + 126, :, 3] > 0
        pieces = []
        for ys, xs in _cc(band, 8):
            cnt = [int(((xs >= 8 + 92 * n) & (xs < 8 + 92 * n + 84)).sum()) for n in range(8)]
            n = int(np.argmax(cnt))
            pieces.append(n)
            for y, x in zip(ys, xs):
                fx, fy = x - (8 + 92 * n), y - y0
                if 0 <= fx < 84 and 0 <= fy < 126:
                    strip[fy, 84 * n + fx] = a[y, x]
        out[f'fx-{key}-band'] = Image.fromarray(strip, 'RGBA')
        rec[key] = {'pieces': len(pieces), 'frames': sorted(set(pieces))}
    sp = np.zeros((13, 13 * 6, 4), np.uint8)
    for n in range(6):
        sp[:, 13 * n:13 * n + 13] = a[276:289, 8 + 21 * n:8 + 21 * n + 13]
    out['fx-spark'] = Image.fromarray(sp, 'RGBA')
    # 불티: 칸마다 참고용 먹 테 상자를 찾아 그 안쪽 70×36만, 먹 · 쇠 칸은 지운다(쇳물 칸만)
    em = np.zeros((36, 70 * 6, 4), np.uint8)
    idx = _pal_index(a)
    molten = np.isin(idx, [R.PAL33.index(h) for h in ('#3A0C06', '#7A1C08', '#C23A0C', '#EC6A1A', '#F8A03A', '#FFD27A', '#FFF6D8')])
    inkm = idx == 0
    # 칸 자리 = (140 + 78n, 276) 발주 그대로 — 그 둘레 ±4도트에서 먹 테 왼쪽 위 모서리(먹이 가장 긴 가로 · 세로 줄)를 찾아 안쪽 70×36
    rects = []
    for n in range(6):
        ex, ey = 140 + 78 * n, 276
        best = None
        for dy in range(-4, 5):
            for dx in range(-4, 5):
                x0, y0 = ex + dx, ey + dy
                sc = int(inkm[y0, x0:x0 + 70].sum()) + int(inkm[y0:y0 + 36, x0].sum())
                if best is None or sc > best[0]:
                    best = (sc, x0, y0)
        rects.append((best[1], best[2]))
    rec['ember_frames'] = rects
    for n, (x0, y0) in enumerate(rects):
        for y in range(36):
            for x in range(70):
                sy, sx = y0 + 1 + y, x0 + 1 + x
                if sy < 320 and sx < 744 and molten[sy, sx]:
                    em[y, 70 * n + x] = a[sy, sx]
    out['fx-ember'] = Image.fromarray(em, 'RGBA')
    # 금 불꽃 줄: 볏 가운데 + 몸 네 귀에 같은 불꽃 6장을 얹은 카드 크기 6장(배치만 — 그림은 받은 그대로)
    gs = np.zeros((126, 84 * 6, 4), np.uint8)
    spa = np.asarray(out['fx-spark'])
    for n in range(6):
        for cx, cy in R.SPARK_AT:
            for y in range(13):
                for x in range(13):
                    p = spa[y, 13 * n + x]
                    tx, ty = cx - 6 + x, cy - 6 + y
                    if p[3] and 0 <= tx < 84 and 0 <= ty < 126:
                        gs[ty, 84 * n + tx] = p
    out['fx-gold-spark'] = Image.fromarray(gs, 'RGBA')
    return out, rec, sh


def chrome():
    """CD-10 → 받침 2장(102×138) · 손패 줄 6장(72×24)"""
    img = src('CD-10')
    out, rec = {}, {}
    for e in R.SHEETS['CD-10']:
        name, kind, box = e[:3]
        if kind == 'slot':
            s, pit = restore(img, box, R.SLOT_BODY, R.SLOT)
        else:
            s, pit = restore(img, box, R.STRIP_BODY, R.STRIP)
        out[name] = key_and_palette(s)
        rec[name] = {'pitch': pit, 'aspect': round(pit[0] / pit[1], 3)}
    return out, rec


# ---------------------------------------------------------------- 발주 좌표 대조 (±1도트)
ORDERED = {
    'cmd': {'win': (6, 32, 76, 68), 'name': (28, 19, 70, 30), 'desc': (13, 73, 71, 112)},
    'part': {'win': (16, 11, 72, 44), 'name': (14, 46, 70, 55), 'desc': (16, 67, 69, 113)},
    'svc': {'win': (9, 11, 75, 44), 'name': (14, 46, 70, 55), 'desc': (16, 67, 69, 113)},
    'crew': {'win': (22, 10, 62, 44), 'name': (14, 46, 70, 55), 'desc': (16, 67, 69, 113), 'atk': (3, 27, 20, 44), 'hp': (62, 27, 79, 44)},
    'set': {'win': (7, 14, 77, 44), 'name': (14, 46, 70, 55), 'desc': (16, 67, 69, 113)},
}


def check(fam, got):
    """발주 칸과 받은 칸 차이(도트) — 네 변 가운데 가장 큰 차이 · ±1 안이면 ok"""
    out = {}
    for k, o in ORDERED[fam].items():
        g = got.get(k)
        if not g:
            continue
        d = max(abs(a - b) for a, b in zip(o, g))
        out[k] = {'ordered': o, 'got': tuple(int(v) for v in g), 'max_off': int(d), 'ok': d <= 1}
    return out


# ---------------------------------------------------------------- 쓰기 · CSS

def pc(v, n):
    return f'{v / n * 100:.3f}%'


def rect(b):
    x0, y0, x1, y1 = b
    return f'left: {pc(x0, 84)}; top: {pc(y0, 126)}; width: {pc(x1 - x0, 84)}; height: {pc(y1 - y0, 126)}; right: auto; bottom: auto;'


SEL = {
    'cmd': lambda t: f'body.slice .cf.cf.cf.cf.cf.cmd.g-{t}',
    'part': lambda t: f'body.slice .cf.cf.cf.cf.cf.part-card.g-{t}:not(.start-set)',
    'svc': lambda t: 'body.slice .cf.cf.cf.cf.cf.svc-card',
    'crew': lambda t: f'body.slice .cf.cf.cf.cf.cf.crew-card.g-{t}',
    'set': lambda t: f'body.slice .cf.cf.cf.cf.cf.start-set.g-{t}',
}
TIERS = {'cmd': ('common', 'rare', 'gold'), 'part': ('common', 'rare', 'gold'), 'svc': ('common',), 'crew': ('common', 'rare', 'gold'), 'set': ('common', 'rare')}
FILE = {'svc': lambda t: 'svc'}


def fname(fam, t):
    return FILE[fam](t) if fam in FILE else f'{fam}-{t}'


def build():
    rep = {'cards': {}, 'scenes': {}}
    css = ['/* 자동 생성 — tools/pixel/card_f_import.py (D-585 카드 F 가족 반입: CD-01f · CD-06 ~ CD-11). 손으로 고치지 않는다.',
           '   틀 84×126 도트 = 카드 상자(2 : 3) · 칸 자리는 받은 틀을 잰 비율(card_f_recipe.LAYOUT) · 겹: 창 장면 < 틀 < 마름모 < 숫자 (D-584) */']
    frac = {}
    url = lambda f: f"url('../assets/ui/cards/{f}.png')"
    for fam, sheet in FAMILY.items():
        L = R.LAYOUT[fam]
        entries = {e[0]: e for e in R.SHEETS[sheet]}
        fr = {'name': 1, 'tag': 1, 'row': 1, 'descH': 1}
        for t in TIERS[fam]:
            key = fname(fam, t)
            img, rec = card(sheet, entries[key], R.FIXES)
            a = np.asarray(img)
            _, win = hole_of(a)
            wmask, metal = masks(a, win)
            _save(img, os.path.join(CARDS, f'{key}.png'))
            _save(wmask, os.path.join(CARDS, f'mask-{key}.png'))
            if t != 'common':
                _save(metal, os.path.join(CARDS, f'metal-{key}.png'))
            sc_key = 'win-' + key
            sc, srec = scene(sheet, entries[sc_key], win)
            _save(sc, os.path.join(CARDS, f'{sc_key}.png'))
            rep['scenes'][sc_key] = srec
            got = {'win': win, 'name': L['name'], 'desc': L['desc']}
            if fam == 'crew':
                got.update(atk=L['atk'], hp=L['hp'])
            rec['layout'] = check(fam, got)
            rep['cards'][key] = rec
            S = SEL[fam](t)
            css.append(f"{S} {{ background-image: {url(key)}; background-size: 100% 100%; aspect-ratio: 84 / 126; --ci-l: {pc(2, 84)}; --ci-r: {pc(4, 84)}; --ci-t: {pc(6, 126)}; --ci-b: {pc(4, 126)}; }}")
            wbg = f"{url(sc_key)} 0 0 / 100% 100% no-repeat" + (', var(--wpat) 0 0 / 4px 4px repeat' if fam == 'cmd' else '')
            css.append(f"{S} > .cf-win {{ {rect(win)} -webkit-mask: {url('mask-' + key)} 0 0 / 100% 100% no-repeat; mask: {url('mask-' + key)} 0 0 / 100% 100% no-repeat; background: {wbg}; background-color: transparent; box-shadow: none; image-rendering: pixelated; }}")
            css.append(f"{S} > .cf-name {{ {rect(L['name'])} color: #16141c; text-shadow: none; }}")
            css.append(f"{S} > .cf-desc {{ {rect(L['desc'])} }}")
            if fam == 'cmd':
                tag = (win[0], win[3] - 7, win[2], win[3])
            else:
                tag = L.get('tag')
            if tag:
                css.append(f"{S} > .cf-type {{ {rect(tag)} }}")
            gx, gy = L['gem']
            css.append(f"{S} > .cf-gem {{ left: {pc(gx, 84)}; top: {pc(gy, 126)}; }}")
            if fam == 'crew':
                css.append(f"{S} > .cb-atk {{ {rect(L['atk'])} }}")
                css.append(f"{S} > .cb-hp {{ {rect(L['hp'])} }}")
                css.append(f"{S} > .cb-bar {{ {rect(L['bar'])} }}")
                # 버팀 하트: 창 오른쪽 위 안쪽 2도트
                css.append(f"{S} > .cb-lives {{ right: {pc(84 - win[2] + 3, 84)}; top: {pc(win[1] + 2, 126)}; left: auto; }}")
            if t == 'gold':
                ww, wh = win[2] - win[0], win[3] - win[1]
                css.append(f"{S} > .cf-win::after {{ left: {(ww - 70) / 2 / ww * 100:.3f}%; width: {70 / ww * 100:.3f}%; bottom: 0; top: auto; height: {36 / wh * 100:.3f}%; }}")
            if t != 'common':
                css.append(f"{S}::before {{ -webkit-mask: {url('metal-' + key)} 0 0 / 100% 100% no-repeat; mask: {url('metal-' + key)} 0 0 / 100% 100% no-repeat; }}")
            hh = (L['desc'][3] - L['desc'][1]) / 126
            fr = {'name': min(fr['name'], (L['name'][2] - L['name'][0]) / 84),
                  'tag': min(fr['tag'], ((tag[2] - tag[0]) / 84) if tag else 1),
                  'row': min(fr['row'], (L['desc'][2] - L['desc'][0]) / 84),
                  'descH': min(fr['descH'], hh)}
        frac[fam] = fr
    # 명령 카드 비용 톱니: 옛 틀(56×84)의 같은 자리 · 같은 크기(옛 도트 1개 = 새 도트 1.5개)
    gear, grec = cost_gear()
    _save(gear, os.path.join(CARDS, 'cost-gear.png'))
    gx0, gy0, gx1, gy1 = grec['box']
    css.append(f"body.slice .cf.cf.cf.cf.cf.cmd > .cf-cost {{ left: {pc(gx0, 56)}; top: {pc(gy0, 84)}; width: {pc(gx1 - gx0, 56)}; height: {pc(gy1 - gy0, 84)}; right: auto; background: {url('cost-gear')} 0 0 / 100% 100% no-repeat; image-rendering: pixelated; color: #16141c; text-shadow: none; z-index: 6; }}")
    rep['cost_gear'] = grec
    # 분대원 초상: 창 높이에 맞춤(창이 낮고 넓다 — 머리가 잘리지 않게)
    css.append('body.slice .cf.cf.cf.cf.cf.crew-card > .cf-win .er-pc { width: auto; height: 100%; aspect-ratio: 1; }')
    # 옛 RF-01 쉬는 꺾쇠 · 부품 창 테(틀이 품는다) 끄기
    css.append('body.slice .cf.cf.cf.cf.cf:is(.cmd, .part-card, .svc-card, .crew-card, .start-set)::after { content: none; }')
    css.append('body.slice .cf.cf.cf.cf.cf:is(.cmd, .part-card, .crew-card)::before { content: none; border: 0; border-image: none; clip-path: none; }')
    css += motion_css()
    open(os.path.join(ROOT, 'src', 'slice', 'card-f.css'), 'w').write('\n'.join(css) + '\n')
    # 움직임 겹
    fx, frec, fsheet = fx_sheet()
    for k, im in fx.items():
        _save(im, os.path.join(CARDS, f'{k}.png'))
    rep['fx'] = frec
    _save(fsheet, os.path.join(PARTS, 'CD-11-restored.png'))
    # 받침 · 손패 줄
    ch, crec = chrome()
    for k, im in ch.items():
        _save(im, os.path.join(CHROME, f'{k}.png'))
    rep['chrome'] = crec
    write_frac(frac)
    os.makedirs(PARTS, exist_ok=True)
    json.dump(rep, open(os.path.join(PARTS, 'report.json'), 'w'), ensure_ascii=False, indent=1, default=str)
    return rep


def motion_css():
    """CD-11 움직임 (D-585): 희귀 = 청록 띠 · 금 = 황동 띠 → 볏 · 귀 불꽃 · 창 불티. 모두 프레임 줄 + steps — 투명도 보간 없음(D-216 · D-554).
    움직임 줄이기면 멈춘다(띠 0장 = 빈 장 · 불꽃 숨김 · 불티 첫 장)."""
    M = R.MOTION
    P = M['period_ms']
    band_ms = M['band_frames'] * M['band_ticks'] * M['tick_ms']
    spark_ms = M['spark_frames'] * M['spark_ticks'] * M['tick_ms']
    cards = 'body.slice .cf.cf.cf.cf.cf:is(.cmd, .part-card, .crew-card)'
    out = []
    out.append(f"{cards}:is(.g-rare, .g-gold)::before {{ content: ''; position: absolute; inset: 0; z-index: 2; pointer-events: none; border: 0; border-image: none; clip-path: none; visibility: visible;"
               f" background: url('../assets/ui/cards/fx-rare-band.png') 0 0 / 800% 100% no-repeat; image-rendering: pixelated; animation: cfband {P}ms steps(1, end) infinite; animation-delay: var(--cf-fx-delay, 0ms); }}")
    out.append(f"{cards}.g-gold::before {{ background-image: url('../assets/ui/cards/fx-gold-band.png'); }}")
    out.append(f"{cards}.g-gold::after {{ content: ''; position: absolute; inset: 0; z-index: 7; pointer-events: none; visibility: hidden;"
               f" background: url('../assets/ui/cards/fx-gold-spark.png') 0 0 / 600% 100% no-repeat; image-rendering: pixelated; animation: cfspark {P}ms steps(1, end) infinite; animation-delay: var(--cf-fx-delay, 0ms); }}")
    out.append(f"body.slice .cf.cf.cf.cf.cf:is(.cmd, .part-card, .crew-card).g-gold > .cf-win::after {{ content: ''; position: absolute; z-index: 2; pointer-events: none;"
               f" background: url('../assets/ui/cards/fx-ember.png') 0 0 / 600% 100% no-repeat; image-rendering: pixelated; animation: cfember {M['ember_ms']}ms steps(6, end) infinite; }}")
    # 띠 8장 × 2틱 → 쉼(빈 첫 장)
    kf = []
    for k in range(M['band_frames']):
        kf.append(f"{k * M['band_ticks'] * M['tick_ms'] / P * 100:.3f}% {{ background-position: {k * 100 / 7:.4f}% 0; }}")
    kf.append(f"{band_ms / P * 100:.3f}% {{ background-position: 0 0; }}")
    out.append('@keyframes cfband { ' + ' '.join(kf) + ' }')
    kf = [f"0% {{ visibility: hidden; background-position: 0 0; }}"]
    for k in range(M['spark_frames']):
        kf.append(f"{(band_ms + k * M['spark_ticks'] * M['tick_ms']) / P * 100:.3f}% {{ visibility: visible; background-position: {k * 100 / 5:.4f}% 0; }}")
    kf.append(f"{(band_ms + spark_ms) / P * 100:.3f}% {{ visibility: hidden; }}")
    out.append('@keyframes cfspark { ' + ' '.join(kf) + ' }')
    out.append('@keyframes cfember { from { background-position: 0 0; } to { background-position: 120% 0; } }')
    # 줄 안에서 어긋나게
    st = M['stagger_ms']
    out.append(f"body.slice :is(.pick-item, .card-bare, .card-slot, .deck-grid > *):nth-child(3n + 2) .cf, body.slice .cf:nth-child(3n + 2) {{ --cf-fx-delay: -{st}ms; }}")
    out.append(f"body.slice :is(.pick-item, .card-bare, .card-slot, .deck-grid > *):nth-child(3n) .cf, body.slice .cf:nth-child(3n) {{ --cf-fx-delay: -{2 * st}ms; }}")
    out.append(f"@media (prefers-reduced-motion: reduce) {{ {cards}:is(.g-rare, .g-gold)::before, {cards}.g-gold::after, body.slice .cf.cf.cf.cf.cf.g-gold > .cf-win::after {{ animation: none; }} }}")
    return out


def write_frac(frac):
    """카드 글 칸 비율 → src/data/card-frames.ts (card-spec.ts CARD_FRAC가 읽는다 — D-515 줄 규격의 칸 폭 · 두루마리 높이)"""
    lines = ['/**', ' * 카드 F 가족 글 칸 비율 (D-585 — tools/pixel/card_f_import.py가 받은 틀을 재어 쓴다. 손으로 고치지 않는다).',
             ' * name = 이름 글 칸 폭 · tag = 꼬리표 칸 폭 · row = 설명 한 행 폭 (카드 폭 비율) · descH = 설명 칸 높이 (카드 높이 비율) — 등급 가운데 가장 작은 값.', ' */',
             'export const CARD_FRAME_FRAC = {']
    for fam, f in frac.items():
        lines.append(f"  {fam}: {{ name: {f['name']:.5f}, tag: {f['tag']:.5f}, row: {f['row']:.5f}, descH: {f['descH']:.5f} }},")
    lines.append('} as const;')
    open(os.path.join(ROOT, 'src', 'data', 'card-frames.ts'), 'w').write('\n'.join(lines) + '\n')


def contact(out):
    """대조판: 갈래마다 [원본 (보기용 근사 축소) | 발주 시안 | 반입 결과 + 창 장면] — 결과는 정수 3배 계단 확대"""
    from PIL import ImageDraw
    Z = 3
    rows = []
    for fam, sheet in FAMILY.items():
        img = src(sheet)
        mock = Image.open(os.path.join(ORDER, f'{sheet}-mock.png')).convert('RGBA')
        cards = [e for e in R.SHEETS[sheet] if e[1] == 'card']
        cells = []
        for i, e in enumerate(cards):
            key = e[0]
            b = e[2]
            px, py = (b[2] - b[0]) / 80, (b[3] - b[1]) / 118
            crop = img.crop((int(b[0] - 2 * px), int(b[1] - 6 * py), int(b[0] + 82 * px), int(b[1] + 120 * py)))
            o = crop.resize((84 * Z, 126 * Z), Image.NEAREST)
            m = mock.crop((8 + 92 * i, 8, 8 + 92 * i + 84, 134)).resize((84 * Z, 126 * Z), Image.NEAREST)
            r = Image.open(os.path.join(CARDS, f'{key}.png')).convert('RGBA')
            bg = Image.new('RGBA', r.size, (40, 38, 48, 255))
            sc = Image.open(os.path.join(CARDS, f'win-{key}.png')).convert('RGBA')
            _, win = hole_of(np.asarray(r))
            bg.alpha_composite(sc, (win[0], win[1]))
            bg.alpha_composite(r)
            cells.append((o.convert('RGBA'), m, bg.resize((84 * Z, 126 * Z), Image.NEAREST)))
        rows.append((fam, cells))
    W = max(len(c) for _, c in rows) * (84 * Z * 3 + 40) + 20
    H = len(rows) * (126 * Z + 30) + 20
    sheet = Image.new('RGBA', (W, H), (24, 23, 30, 255))
    d = ImageDraw.Draw(sheet)
    y = 10
    for fam, cells in rows:
        x = 10
        for o, m, r in cells:
            for k, im in enumerate((o, m, r)):
                sheet.alpha_composite(im, (x + k * (84 * Z + 6), y + 16))
            x += 84 * Z * 3 + 40
        d.text((10, y), f'{fam}: source (view only) | order mock | imported (+window scene) x{Z}', fill=(230, 220, 200, 255))
        y += 126 * Z + 30
    sheet.save(out)


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'build'
    if cmd == 'sheet':
        contact(sys.argv[2])
    if cmd == 'measure':
        measure()
    elif cmd == 'build':
        r = build()
        for k, v in r['cards'].items():
            print(k, v['pitch'], v['aspect'], v['fix'])
            for kk, vv in v['layout'].items():
                print('   ', kk, vv)
        print('scenes', json.dumps(r['scenes'], ensure_ascii=False))
        print('fx', json.dumps(r['fx'], ensure_ascii=False))
        print('chrome', json.dumps(r['chrome'], ensure_ascii=False))
