"""
BT-01 덱 · 분대 · 버림 단추 반입 (D-640 · 30위). 받은 시트 2172×724(발주 152×48 ×6 = 912×288이 아니다), 바탕 마젠타.

  python3 -I tools/pixel/bt01_import.py measure   → 부품마다 gridmeasure 실측(마젠타 눌러 잼) → build-res/order/BT-01-parts/grid.json
  python3 -I tools/pixel/bt01_import.py build     → src/assets/ui/chrome/v2/pile-btn-{idle,down,new}.png · pile-{deck,crew,discard}.png
                                                    + build-res/order/BT-01-parts/compare.png (원본 | 복원 대조판)

격자: 부품마다 두 축 간격이 갈린다(가로 13.6 ~ 15.5 · 세로 15.6 ~ 17.4px, 같은 시트 자매끼리도 다름) — 생성기가 칠한 픽셀 그림이라
단일 격자가 없다(D-586과 같은 판정). D-586 규칙대로 **균일 배율 하나(정사각 칸 — 가로세로 비 원본 그대로)**:
간격 = PITCH(가로 표지 간격 — 평상 15.21 · 새 카드 14.78 · 덱 15.13 · 버림 15.15의 가운데 값), 부품마다 시작점만 2차원 복원 오차 최소로 고른다.
칸마다 가운데 60% 최빈색 → 발주 팔레트 PAL33(card_f_recipe)의 가장 가까운 색. 마젠타(와 그 번짐) = 투명.
누름 상태는 원본이 2도트 아래 · 그림자 없이 그려 와 몸이 짧다 — 평상과 같은 캔버스에 원본 위 끝 차이만큼 내려 놓는다.
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
from card_f_recipe import PAL33  # noqa: E402

SRC = os.path.join(ROOT, 'build-res', 'order', 'BT-01-source.png')
PARTS = os.path.join(ROOT, 'build-res', 'order', 'BT-01-parts')
OUT = os.path.join(ROOT, 'src', 'assets', 'ui', 'chrome', 'v2')
KEY = (255, 0, 255)

# 원본 상자 (x0, y0, x1, y1) — 마젠타가 아닌 덩어리 경계(끝 제외)에 반 칸 여유
BOX = {
    'pile-btn-idle': (40, 50, 724, 396),
    'pile-btn-down': (753, 76, 1419, 398),
    'pile-btn-new': (1448, 50, 2131, 396),
    'pile-deck': (40, 455, 283, 676),
    'pile-crew': (327, 455, 564, 676),
    'pile-discard': (603, 439, 835, 676),
}
PITCH = 7.57


def keyed(im):
    """마젠타와 그 번짐: 빨강 · 파랑이 둘 다 초록보다 크게 높다"""
    a = np.asarray(im.convert('RGB')).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    return (r - g > 90) & (b - g > 90)


def _err2d(a, P, ox, oy):
    H, W = a.shape[:2]
    xs, ys = np.arange(W), np.arange(H)
    cx = np.clip(np.round(ox + (np.floor((xs - ox) / P) + 0.5) * P - 0.5).astype(int), 0, W - 1)
    cy = np.clip(np.round(oy + (np.floor((ys - oy) / P) + 0.5) * P - 0.5).astype(int), 0, H - 1)
    return float(np.abs(a[cy][:, cx] - a).mean())


def phase(a, P, steps=15):
    """간격 P 정사각 격자의 가장 좋은 시작점 (2차원 복원 오차 최소). 반환 (오차, x 시작, y 시작)"""
    return min((_err2d(a, P, ox, oy), ox, oy) for ox in np.linspace(0, P, steps, endpoint=False)
               for oy in np.linspace(0, P, steps, endpoint=False))


def sample(im, mask, P, ox, oy, core=0.6):
    """칸마다 가운데 core 영역(마젠타 제외)의 최빈 묶음 중앙값 → PAL33 가장 가까운 색. 칸 절반 넘게 마젠타면 투명"""
    a = np.asarray(im.convert('RGB'))
    H, W = a.shape[:2]
    xe, ye = gm.cuts_from(W, P, ox), gm.cuts_from(H, P, oy)
    pal = np.array([[int(c[i:i + 2], 16) for i in (1, 3, 5)] for c in PAL33])
    out = np.zeros((len(ye) - 1, len(xe) - 1, 4), np.uint8)
    m = (1 - core) / 2
    for j in range(len(ye) - 1):
        y0, y1 = ye[j], ye[j + 1]
        a0, a1 = int(y0 + (y1 - y0) * m), int(np.ceil(y1 - (y1 - y0) * m))
        for i in range(len(xe) - 1):
            x0, x1 = xe[i], xe[i + 1]
            b0, b1 = int(x0 + (x1 - x0) * m), int(np.ceil(x1 - (x1 - x0) * m))
            k = mask[a0:a1, b0:b1].reshape(-1)
            if k.size == 0 or k.mean() >= 0.5:
                continue
            blk = a[a0:a1, b0:b1].reshape(-1, 3)[~k]
            q = blk >> 4
            key = (q[:, 0].astype(np.int32) << 8) | (q[:, 1].astype(np.int32) << 4) | q[:, 2]
            v, c = np.unique(key, return_counts=True)
            col = np.median(blk[key == v[c.argmax()]], axis=0)
            out[j, i, :3] = pal[((pal - col) ** 2).sum(1).argmin()]
            out[j, i, 3] = 255
    return Image.fromarray(out, 'RGBA')


def trim(im):
    return im.crop(im.getchannel('A').getbbox())


BRASS = {(0xD9, 0xA8, 0x38), (0xB9, 0x84, 0x24), (0xF4, 0xD2, 0x7A), (0x8A, 0x5A, 0x14), (0x5A, 0x3A, 0x0E)}


def nine(img):
    """복원한 단추 한 장 → 9-slice 판 (자르기만 — 늘리기 · 새 색 없음).
    왼 SL_L열(테 + 리벳) | 가운데 1열 | 오른 SL_R열(황동 소켓 + 리벳 + 테, 캔버스 오른 끝에서 잰다).
    가운데 1열 = 왼 조각 끝 ~ 소켓 앞 사이 줄마다 최빈색 — 받은 그림의 가운데 디더 띠가 복원 뒤 낱점 얼룩이라(발주: 「가운데는 늘려도
    깨지지 않는 단색 판」) 줄마다 한 색으로 고른다. 위아래는 자르지 않는다(높이 고정 44도트 — 세로로 늘이지 않는다).
    반환 (판, 기록 {left, right, socket: 오른 끝 기준 소켓 안 칸 (왼, 위, 폭, 높이)})"""
    a = np.asarray(img)
    W, H = img.width, img.height
    mid = H // 2
    b0 = next(x for x in range(W) if tuple(a[mid, x, :3]) in BRASS and a[mid, x, 3])
    b1 = max(x for x in range(W) if tuple(a[mid, x, :3]) in BRASS and a[mid, x, 3])
    rows = [y for y in range(H) if any(tuple(a[y, x, :3]) in BRASS and a[y, x, 3] for x in range(b0, b1 + 1))]
    r0 = W - SL_R
    col = np.zeros((H, 1, 4), np.uint8)
    for y in range(H):
        seg = a[y, SL_L:b0 - 2]
        v, c = np.unique(seg.reshape(-1, 4), axis=0, return_counts=True)
        col[y, 0] = v[c.argmax()]
    out = np.concatenate([a[:, :SL_L], col, a[:, r0:]], axis=1)
    sock = (b0 - r0, rows[0], b1 - b0 + 1, rows[-1] - rows[0] + 1)
    return Image.fromarray(out, 'RGBA'), {'left': SL_L, 'right': SL_R, 'socket_from_right': [SL_R - sock[0], sock[1], sock[2], sock[3]]}


SL_L, SL_R = 14, 35
MID_REP = 120  # 왼 조각 가운데 열 반복 — 단추 폭 169도트까지 덮는다


def measure():
    """부품마다 실측 기록 (간격 창 10 ~ 20px, 마젠타 눌러 잼)"""
    os.makedirs(PARTS, exist_ok=True)
    im = Image.open(SRC)
    rec = {}
    for k, b in BOX.items():
        m = gm.measure(im, b, lo=10, hi=20, bg=KEY)
        rec[k] = {ax: {kk: m[ax][kk] for kk in ('pitch', 'phase', 'presence', 'err', 'drift', 'grid', 'how')} for ax in 'xy'}
        print(k, gm.short(m))
    with open(os.path.join(PARTS, 'grid.json'), 'w') as f:
        json.dump(rec, f, ensure_ascii=False, indent=1)


def build():
    """균일 배율 PITCH로 여섯 부품 복원 · 저장 · 대조판"""
    os.makedirs(PARTS, exist_ok=True)
    im = Image.open(SRC).convert('RGB')
    mask = keyed(im)
    a = np.asarray(im).astype(float).mean(2)
    res, log = {}, {}
    for k, (x0, y0, x1, y1) in BOX.items():
        e, ox, oy = phase(a[y0:y1, x0:x1], PITCH)
        part = trim(sample(im.crop((x0, y0, x1, y1)), mask[y0:y1, x0:x1], PITCH, ox, oy))
        res[k] = part
        log[k] = {'pitch': PITCH, 'phase': [round(float(ox), 2), round(float(oy), 2)], 'err': round(e, 2), 'size': list(part.size)}
        print(k, log[k])
    btn = ('pile-btn-idle', 'pile-btn-down', 'pile-btn-new')
    W = max(res[k].width for k in btn)
    H = max(res['pile-btn-idle'].height, res['pile-btn-new'].height)
    for k in btn:
        c = Image.new('RGBA', (W, H))
        dy = round((BOX[k][1] - BOX['pile-btn-idle'][1]) / PITCH) if k == 'pile-btn-down' else 0
        c.paste(res[k], ((W - res[k].width) // 2, dy))
        res[k] = c
    full = dict(res)
    for k in btn:
        full[k].save(os.path.join(PARTS, k + '-full.png'))
        res[k], log[k]['slice'] = nine(full[k])
        # 게임용 두 조각(이음매 없는 겹 배경): 왼 = 왼 조각 + 가운데 열 MID_REP번(가로 끝까지 깔린다), 오른 = 오른 조각 — 오른 조각이 위에 얹힌다.
        # border-image는 소수 px 자리에서 조각 경계마다 1기기픽셀 밝은 선이 생겼다(915×412 실측) — 같은 그림을 겹쳐 그리면 틈이 없다.
        t = np.asarray(res[k])
        Image.fromarray(np.concatenate([t[:, :SL_L]] + [t[:, SL_L:SL_L + 1]] * MID_REP, axis=1), 'RGBA').save(os.path.join(OUT, k + '-l.png'), optimize=True)
        Image.fromarray(t[:, SL_L + 1:].copy(), 'RGBA').save(os.path.join(OUT, k + '-r.png'), optimize=True)
    for k, p in res.items():
        p.save(os.path.join(OUT, k + '.png'), optimize=True)
        log[k]['final'] = list(p.size)
        print(k, '→', p.size, gm.alpha_clean(p), log[k].get('slice', ''))
    res = full
    with open(os.path.join(PARTS, 'build.json'), 'w') as f:
        json.dump(log, f, ensure_ascii=False, indent=1)
    rows = []
    src = Image.open(SRC).convert('RGBA')
    for k, b in BOX.items():
        o = src.crop(b)
        z = max(1, round(o.height / res[k].height))
        rows.append((o, res[k].resize((res[k].width * z, res[k].height * z), Image.NEAREST)))
    Wt = max(o.width + r.width for o, r in rows) + 36
    Ht = sum(max(o.height, r.height) for o, r in rows) + 12 * (len(rows) + 1)
    sheet = Image.new('RGBA', (Wt, Ht), (40, 40, 48, 255))
    y = 12
    for o, r in rows:
        sheet.paste(o, (12, y))
        sheet.alpha_composite(r, (24 + o.width, y))
        y += max(o.height, r.height) + 12
    sheet.save(os.path.join(PARTS, 'compare.png'))


if __name__ == '__main__':
    {'measure': measure, 'build': build}[sys.argv[1]]()
