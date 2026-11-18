"""
종이 왕관 색 통일 (사용자 결정 D-573): 게임 어디에 나오든 종이왕의 종이 왕관은 판 그림 K0과 같은 마분지 세 단 + 청록 보석 하나.

정본 색은 판 그림이 정한다 — `tools/pixel/maker.py` PAL64의 F · Q · J(마분지 빛 · 바탕 · 그늘)와 C(청록 보석).
`docs/asset-order-master.md` 「정본 · 종이 왕관」 문단의 #E0A862 · #B57C3C · #7A4C22 · #38BDF8과 같다(이 도구가 `check`로 대조).

하는 일 (D-561 ④ 사내 손질 = 다시 칠하기만 — 모양은 그리지 않는다):
  ① 그림마다 아래 TABLE의 상자(box) 안에서 왕관 칸을 고른다 — 씨앗(seeds)이 있으면 씨앗에서 4-연결로 번지는 마분지 칸만,
     없으면 상자 안 마분지 칸 전부. 먹 외곽선(밝기 < ink)은 막이 되고 손대지 않는다(그림마다 제 외곽선 색 그대로).
     `not` 상자는 빼고(기물 머리 · 뒤 배경), `jewel_box`가 있으면 보석은 그 안에서만.
  ② 왕관 칸의 밝기를 그 왕관 안에서 정규화(아래 3% ~ 위 97%)해 `cut`(밝음, 가운데)으로 세 단에 나눠 F · Q · J로 칠한다.
     이미 정본 세 색인 칸은 그대로 — 여러 번 돌려도 같다(반입 도구가 저장 뒤 다시 불러도 안전).
  ③ 상자 안 청록 칸(보석)은 #38BDF8로. 빛 점과 어두운 테(그 보석 밝기 중앙값에서 크게 벗어난 칸)는 그대로 둔다.
  모양이 정본(끝 넷 · 앞 가운데 보석 하나)과 다른 그림은 `shape`에 적는다 — 참고 기록일 뿐 재발주하지 않는다(D-577: 색 · 앞 보석만 같으면 끝 개수 · 모양 차이는 종이 왕관의 구겨짐).

실행:
  python3 -I tools/pixel/crown_unify.py apply [이름 …]     TABLE의 그림을 제자리에서 다시 칠한다(이름 없으면 전부)
  python3 -I tools/pixel/crown_unify.py sheet <out.png>    왕관마다 잘라 ×배율로 붙인 대조판(지금 파일 기준 — 칠하기 전에 뽑으면 before)
  python3 -I tools/pixel/crown_unify.py mask <out.png> [이름 …]  고른 칸을 마젠타로 덮은 점검판(상자 맞출 때)
  python3 -I tools/pixel/crown_unify.py list               모양 차이 (참고 — 재발주 안 함, D-577) 목록
  python3 -I tools/pixel/crown_unify.py check              정본 문단의 색이 PAL64와 같은지
반입 도구는 저장 뒤 `crown_unify.after_save(경로)`를 부른다 — TABLE에 있는 그림이면 그 자리에서 다시 칠한다(재반입이 통일을 되돌리지 않게).
"""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
import maker  # noqa: E402

RAMP = [maker.PAL64['F'], maker.PAL64['Q'], maker.PAL64['J']]  # 마분지 빛 · 바탕 · 그늘 (판 그림 K0 정본)
JEWEL = maker.PAL64['C']                                       # 청록 보석
CANON = {tuple(c) for c in RAMP}
DOC = os.path.join(ROOT, 'docs', 'asset-order-master.md')

# 그림마다 왕관 자리. box = (x0, y0, x1, y1) 도트 좌표(x1 · y1 제외).
#   seeds: 번지기 시작 칸(왕관 앞면 · 뿔) — 없으면 상자 안 마분지 칸 전부
#   not: 뺄 상자 목록 · cut: (밝음 하한, 가운데 하한) 정규화 밝기 · ink: 먹 밝기 상한 · sat: 마분지 채도 하한
#   any: True면 채도와 상관없이(흰 · 회색 종이 왕관 아이콘) 먹 아닌 칸 전부 · paper: 채도 낮은 종이 칸만(금 부분은 둔다)
#   shape: 정본과 다른 모양 — 모양 차이 (참고 — 재발주 안 함, D-577)
S = 'public/scenes/'
P = 'public/ui/portraits/'
C2 = 'src/assets/ui/chrome/v2/'
TABLE = {
    # 막 카드 (act-N) — 판 위 줄 맨 앞 종이왕
    S + 'act-1.png': {'crowns': [{'box': (139, 50, 183, 82), 'seeds': [(165, 62), (150, 70), (178, 62)], 'sat': 0.3}]},
    S + 'act-2.png': {'crowns': [{'box': (130, 70, 165, 96), 'seeds': [(150, 80), (140, 88)], 'sat': 0.3}]},
    S + 'act-4.png': {'crowns': [{'box': (82, 86, 135, 122), 'seeds': [(110, 100), (95, 105)], 'sat': 0.3,
                                  'not': [(104, 108, 135, 124)]}]},
    # 프롤로그 · 서사 컷
    # D-578 VA-04 · VA-05 재발주본(끝 넷 · 청록 보석 하나 — 모양 정본). 씨앗 = 왕관 앞면 · 뿔(찢긴 포장지 조각은 같은 마분지라 상자 밖)
    S + 'prologue-05.png': {'crowns': [{'box': (95, 22, 168, 76), 'seeds': [(120, 60), (135, 45), (150, 55)], 'sat': 0.3}]},
    S + 'prologue-06.png': {'crowns': [{'box': (62, 28, 118, 66), 'seeds': [(80, 55), (100, 55), (90, 45)], 'sat': 0.3}]},
    S + 'prologue-07.png': {'crowns': [{'box': (60, 44, 102, 74), 'seeds': [(80, 62), (96, 55), (70, 58)], 'sat': 0.4,
                                        'not': [(85, 66, 102, 78)]}]},
    S + 'companion-crossroad.png': {'crowns': [{'box': (35, 38, 85, 77), 'sat': 0.35}]},
    S + 'companion-rest.png': {'crowns': [{'box': (190, 8, 246, 46), 'sat': 0.35}]},
    S + 'scarred-wall.png': {'crowns': [{'box': (28, 98, 104, 140), 'seeds': [(60, 125), (85, 115), (40, 130)], 'sat': 0.35}]},
    S + 'credits-bg.png': {'crowns': [{'box': (12, 80, 74, 116), 'seeds': [(40, 105), (25, 105), (60, 100)], 'sat': 0.3}]},
    S + 'loading-bench.png': {'crowns': [{'box': (188, 86, 248, 124), 'seeds': [(215, 108), (200, 110), (235, 105)], 'sat': 0.4}]},
    S + 'promote.png': {'crowns': [{'box': (50, 28, 94, 64), 'sat': 0.18}], 'shape': '옛 승급 컷: 보석 없음 · 흰 종이 왕관(지금 본편 흐름 밖)'},
    S + 'promote-rule.png': {'crowns': [{'box': (100, 122, 134, 144), 'sat': 0.18}], 'shape': '발치에 버린 작은 관 — 보석 없음'},
    # 왕관 · 결말
    S + 'crown-1-throne.png': {'crowns': [{'box': (45, 118, 108, 150), 'seeds': [(65, 140), (85, 135), (100, 140)], 'sat': 0.4}]},
    S + 'crown-dais.png': {'crowns': [{'box': (203, 88, 240, 107), 'seeds': [(215, 95), (228, 98)], 'sat': 0.4}]},
    # D-581 VA-06 재발주본: 단상 위 폰은 금왕관 — 종이 왕관은 단상 발치(폰 오른쪽)에 구겨져 걸린 것 하나. 씨앗 = 왕관 앞면 · 뿔(아래 단상 황동 띠는 상자 밖)
    S + 'casting-floor.png': {'crowns': [{'box': (278, 66, 309, 86), 'seeds': [(283, 80), (291, 80), (300, 80)], 'sat': 0.3}]},
    S + 'gilded-fallen.png': {'crowns': [{'box': (18, 84, 47, 108), 'seeds': [(30, 95), (22, 102)], 'sat': 0.4}]},
    S + 'end-fail.png': {'crowns': [{'box': (158, 86, 236, 136), 'seeds': [(200, 120), (175, 125), (220, 110)], 'sat': 0.4,
                                     'not': [(150, 80, 186, 107), (150, 80, 192, 97)]}]},
    S + 'end-t-throw.png': {'crowns': [{'box': (55, 44, 108, 74), 'seeds': [(80, 58), (65, 70), (95, 60)], 'sat': 0.4}]},
    S + 'end-t-step.png': {'crowns': [{'box': (92, 0, 212, 62), 'seeds': [(150, 10), (110, 40), (195, 25)], 'sat': 0.35}]},
    S + 'end-clear.png': {'crowns': [{'box': (72, 54, 92, 67), 'sat': 0.3, 'jewel': False}], 'shape': '작은 관 — 보석 없음'},
    S + 'departure-decision.png': {'crowns': [{'box': (88, 0, 176, 28), 'seeds': [(110, 10), (160, 10), (125, 20)], 'sat': 0.35}]},
    # PT-04 종이왕 독백 초상 — 왼쪽 청록 테두리 빛은 보석이 아니다(jewel_box로 보석만)
    P + 'paperking-calm.png': {'crowns': [{'box': (0, 0, 64, 34), 'seeds': [(30, 15)], 'sat': 0.3, 'jewel_box': (41, 12, 53, 24)}]},
    P + 'paperking-fear.png': {'crowns': [{'box': (0, 0, 64, 40), 'seeds': [(25, 20)], 'sat': 0.3, 'jewel_box': (32, 20, 44, 32)}]},
    P + 'paperking-gilt.png': {'crowns': [{'box': (0, 0, 64, 36), 'seeds': [(22, 22)], 'sat': 0.3, 'jewel_box': (37, 16, 49, 28),
                                           'gold': True}]},
    P + 'paperking-pain.png': {'crowns': [{'box': (0, 0, 64, 32), 'seeds': [(30, 15)], 'sat': 0.3, 'jewel_box': (44, 19, 56, 31)}]},
    P + 'paperking-resolve.png': {'crowns': [{'box': (0, 0, 64, 34), 'seeds': [(25, 20)], 'sat': 0.3, 'jewel_box': (41, 16, 53, 28)}]},
    # 작은 그림 · 문장 · 아이콘
    'public/ui/hud/crew-K.png': {'crowns': [{'box': (5, 2, 50, 36), 'seeds': [(28, 20)], 'sat': 0.3}], 'shape': '분대 얼굴 K: 끝 다섯 · 보석 없음'},
    'public/ui/props/ic32-crown-paper.png': {'crowns': [{'box': (0, 0, 32, 32), 'any': True}], 'shape': '흰 종이 관 아이콘 — 보석 없음 · 끝 다섯'},
    # ED-01 장 제목 문장(종이 → 금띠 → 반금 → 금 깨짐, D-510): 종이 부분만 마분지로. 4(다 금)는 종이가 없다
    C2 + 'crown-emblem-1.png': {'crowns': [{'box': (0, 0, 26, 23), 'paper': True}], 'shape': '장 제목 문장 1: 보석 없음 · 끝 다섯'},
    C2 + 'crown-emblem-2.png': {'crowns': [{'box': (0, 0, 26, 23), 'paper': True}], 'shape': '장 제목 문장 2: 보석 없음 · 끝 다섯'},
    C2 + 'crown-emblem-3.png': {'crowns': [{'box': (0, 0, 26, 23), 'paper': True}], 'shape': '장 제목 문장 3: 보석 없음 · 끝 다섯'},
    'public/ui/crown-emblem.png': {'crowns': [{'box': (0, 0, 49, 32), 'sat': 0.3}]},
    'build-res/icon-src/crown.png': {'crowns': [{'box': (0, 0, 49, 32), 'sat': 0.3}]},
    'build-res/icon-src/crown-dark.png': {'crowns': [{'box': (0, 0, 53, 36), 'sat': 0.3}]},
    'build-res/icon-src/B-full.png': {'crowns': [{'box': (6, 2, 44, 28), 'seeds': [(20, 14), (35, 12)], 'sat': 0.35}]},
    'build-res/icon-src/B-fg.png': {'crowns': [{'box': (6, 2, 44, 28), 'seeds': [(20, 14), (35, 12)], 'sat': 0.35}]},
}

# 대조판에만 싣는 왕관(다시 칠하지 않는다): 정본 · 이미 통일된 것 · 다른 도구가 찍는 것 · 일부러 둔 것
SHOW = {
    'public/pieces/s-K0.png': ((0, 0, 144, 80), '정본 K0 (판 그림)', 'canon'),
    'build-res/store/dots/R-04.png': ((46, 2, 119, 63), 'store_import fix_crown (D-570)', 'store'),
    'build-res/store/dots/R-07.png': ((73, 176, 134, 224), 'store_import fix_crown (D-570)', 'store'),
    'public/favicon-48.png': ((0, 0, 48, 48), 'r02b가 crown-emblem에서 찍는다', 'derived'),
    'public/icon-192.png': ((0, 0, 192, 192), 'app_icon.py가 B-*에서 찍는다', 'derived'),
    S + 'crown-3-open.png': ((118, 82, 160, 112), '그대로: 푸른 역광 실루엣 — 마분지 색이 보이지 않는 조명', 'kept'),
    S + 'end-f-unwind.png': ((132, 54, 190, 92), '그대로: 장면 전체가 잿빛으로 빠진 컷(태엽이 풀린다)', 'kept'),
}


def lum(a):
    return a[..., 0] * 0.299 + a[..., 1] * 0.587 + a[..., 2] * 0.114


def _ok(a, spec):
    """왕관 칸이 될 수 있는 칸: 마분지(따뜻한 색 · 채도) 또는 정본 세 색, 먹보다 밝다"""
    r, g, b = (a[..., i].astype(int) for i in range(3))
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    sat = (mx - mn) / np.maximum(mx, 1)
    L = lum(a.astype(float))
    if spec.get('any'):
        warm = np.ones(r.shape, bool)
    elif spec.get('paper'):  # 흰 · 회색 종이 쪽만(금띠 · 금칠은 그대로) — 장 제목 문장 crown-emblem-2 · 3
        warm = sat < 0.22
    else:
        # 마분지: 빨강보다 g가 높다(g ≥ 0.42r — 쇳물 · 붉은 융단은 빠진다)
        warm = (r >= g - 4) & (g >= b - 10) & (r - b >= 30) & (g >= 0.42 * r) & (sat >= spec.get('sat', 0.28))
        if spec.get('gold'):  # 금칠한 쪽(밝은 노랑)은 이야기 그대로 둔다 — 마분지 쪽만
            warm &= ~((r > 200) & (g >= 0.72 * r) & (sat > 0.55))
    return warm & (L > spec.get('ink', 42))


def _teal(a):
    r, g, b = (a[..., i].astype(int) for i in range(3))
    return (b >= r + 30) & (g >= r + 30)


def masks(img, spec):
    """(왕관 칸, 보석 칸) 불리언 판"""
    a = np.asarray(img.convert('RGBA'))
    H, W = a.shape[:2]
    x0, y0, x1, y1 = spec['box']
    inbox = np.zeros((H, W), bool)
    inbox[y0:y1, x0:x1] = True
    for nx0, ny0, nx1, ny1 in spec.get('not', []):
        inbox[ny0:ny1, nx0:nx1] = False
    vis = a[..., 3] > 0
    ok = _ok(a[..., :3], spec) & inbox & vis
    tealbox = inbox.copy()
    if 'jewel_box' in spec:
        tealbox[:] = False
        jx0, jy0, jx1, jy1 = spec['jewel_box']
        tealbox[jy0:jy1, jx0:jx1] = True
    teal = _teal(a[..., :3]) & tealbox & vis & (spec.get('jewel', True))
    seeds = spec.get('seeds')
    if seeds:
        m = np.zeros((H, W), bool)
        pas = ok | teal
        st = [tuple(s) for s in seeds]
        while st:
            x, y = st.pop()
            if not (0 <= x < W and 0 <= y < H) or m[y, x] or not pas[y, x]:
                continue
            m[y, x] = True
            st += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
        crown = m & ok & ~teal
        jewel = teal  # 보석은 먹 테에 둘러싸여 번지기로 닿지 않는다 — 상자(또는 jewel_box) 안 청록 전부
    else:
        crown = ok & ~teal
        jewel = teal
    return crown, jewel


def recolour(img, spec):
    """한 왕관을 정본 세 단 + 청록 보석으로. 반환 (그림, 왕관 칸 수, 보석 칸 수)"""
    mode = img.mode
    im = img.convert('RGBA')
    a = np.asarray(im).copy()
    crown, jewel = masks(im, spec)
    rgb = a[..., :3]
    is_canon = np.zeros(crown.shape, bool)
    for c in RAMP:
        is_canon |= (rgb == c).all(-1)
    todo = crown & ~is_canon
    if todo.any():
        L = lum(rgb.astype(float))
        lo, hi = np.percentile(L[crown], 3), np.percentile(L[crown], 97)
        t = (L - lo) / max(1.0, hi - lo)
        c0, c1 = spec.get('cut', (0.62, 0.3))
        band = np.where(t >= c0, 0, np.where(t >= c1, 1, 2))
        for k in range(3):
            sel = todo & (band == k)
            rgb[sel] = RAMP[k]
    if jewel.any():
        # 보석: 가운데 밝기 칸만 #38BDF8로. 빛 점(밝기 ≥ 175이고 보석 중앙값 + 25 위)과 어두운 테(< 60이고 중앙값 − 25 아래)는 그대로
        L = lum(rgb.astype(float))
        med = float(np.median(L[jewel]))
        keep = jewel & (((L >= 175) & (L > med + 25)) | ((L < 60) & (L < med - 25)))
        rgb[jewel & ~keep] = JEWEL
    a[..., :3] = rgb
    out = Image.fromarray(a, 'RGBA')
    return (out if mode == 'RGBA' else out.convert(mode)), int(crown.sum()), int(jewel.sum())


def apply_one(rel, save=True):
    p = os.path.join(ROOT, rel)
    im = Image.open(p)
    im.load()
    notes = []
    for spec in TABLE[rel]['crowns']:
        im, n, j = recolour(im, spec)
        notes.append(f'{n}+{j}')
    if save:
        im.save(p, optimize=True)
    return im, notes


def unify_image(rel, img):
    """메모리의 그림을 TABLE[rel] 왕관 자리대로 다시 칠해 돌려준다 (저장 전에 쓰는 반입 도구용 — r02b 파비콘은 이 판에서 찍힌다)"""
    for spec in TABLE[rel]['crowns']:
        img, _, _ = recolour(img, spec)
    return img


def after_save(path):
    """반입 도구가 저장한 뒤 부른다: TABLE에 있는 그림이면 제자리에서 정본 왕관 색으로 다시 칠한다"""
    rel = os.path.relpath(os.path.abspath(path), ROOT).replace(os.sep, '/')
    if rel in TABLE:
        _, notes = apply_one(rel)
        print(f'crown_unify: {rel} 왕관 {" · ".join(notes)}칸 → 정본 K0 색')


def crops(rel, scale_to=150):
    """(이름, 잘라 키운 그림) — 왕관 상자 둘레 여백 3칸"""
    out = []
    im = Image.open(os.path.join(ROOT, rel)).convert('RGBA')
    for i, spec in enumerate(TABLE[rel]['crowns']):
        x0, y0, x1, y1 = spec['box']
        x0, y0 = max(0, x0 - 3), max(0, y0 - 3)
        x1, y1 = min(im.width, x1 + 3), min(im.height, y1 + 3)
        c = im.crop((x0, y0, x1, y1))
        k = max(1, scale_to // max(c.width, c.height))
        bg = Image.new('RGBA', c.size, (40, 38, 46, 255))
        bg.alpha_composite(c)
        out.append((f'{rel.split("/")[-1]}#{i}', bg.resize((c.width * k, c.height * k), Image.NEAREST)))
    return out


def sheet(path, names=None, mask=False, big=False):
    items = []
    if not mask and not names:
        for rel, (box, note, tag) in SHOW.items():
            im = Image.open(os.path.join(ROOT, rel)).convert('RGBA')
            c = im.crop(box)
            k = max(1, 150 // max(c.width, c.height))
            bg = Image.new('RGBA', c.size, (40, 38, 46, 255))
            bg.alpha_composite(c)
            c = bg.resize((c.width * k, c.height * k), Image.NEAREST) if k > 1 else bg.resize(
                (max(1, c.width * 150 // max(c.width, c.height)), max(1, c.height * 150 // max(c.width, c.height))), Image.NEAREST)
            items.append((f'[{tag}] {rel.split("/")[-1]}', c))
    for rel in TABLE:
        if names and not any(n in rel for n in names):
            continue
        if mask:
            im = Image.open(os.path.join(ROOT, rel)).convert('RGBA')
            a = np.asarray(im).copy()
            for spec in TABLE[rel]['crowns']:
                c, j = masks(im, spec)
                a[c] = (255, 0, 255, 255)
                a[j] = (0, 255, 0, 255)
            tmp = Image.fromarray(a, 'RGBA')
            for i, spec in enumerate(TABLE[rel]['crowns']):
                x0, y0, x1, y1 = spec['box']
                c = tmp.crop((max(0, x0 - 3), max(0, y0 - 3), x1 + 3, y1 + 3))
                k = max(1, (300 if big else 150) // max(c.width, c.height))
                items.append((f'{rel.split("/")[-1]}#{i}', c.resize((c.width * k, c.height * k), Image.NEAREST)))
        else:
            items += crops(rel)
    cols = 3 if big else 6
    cw, ch = (320, 340) if big else (170, 190)
    rows = (len(items) + cols - 1) // cols
    page = Image.new('RGB', (cols * cw, rows * ch), (24, 22, 28))
    d = ImageDraw.Draw(page)
    for i, (name, c) in enumerate(items):
        x, y = (i % cols) * cw, (i // cols) * ch
        page.paste(c.convert('RGB'), (x + 10, y + 26))
        d.text((x + 10, y + 8), name[:26], fill=(240, 230, 140))
    page.save(path)
    print(path, len(items), '칸')


def check():
    txt = open(DOC, encoding='utf-8').read()
    want = ['#%02X%02X%02X' % tuple(c) for c in RAMP + [JEWEL]]
    miss = [w for w in want if w not in txt]
    print('정본 문단 색:', ' · '.join(want), '— 문서와 같음' if not miss else f'— 문서에 없음 {miss}')
    return not miss


def main():
    args = sys.argv[1:]
    cmd = args[0] if args else 'apply'
    if cmd == 'apply':
        names = args[1:]
        for rel in TABLE:
            if names and not any(n in rel for n in names):
                continue
            _, notes = apply_one(rel)
            print(f'{rel}: 왕관 {" · ".join(notes)}칸(마분지+보석)')
    elif cmd == 'sheet':
        sheet(args[1], args[2:])
    elif cmd == 'mask':
        sheet(args[1], args[2:], mask=True, big=True)
    elif cmd == 'list':
        print('모양 차이 (참고 — 재발주 안 함, D-577)')
        for rel, v in TABLE.items():
            if v.get('shape'):
                print(f'{rel}: {v["shape"]}')
    elif cmd == 'check':
        sys.exit(0 if check() else 1)
    else:
        raise SystemExit(__doc__)


if __name__ == '__main__':
    main()
