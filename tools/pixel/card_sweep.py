"""
등급 빛 띠 한 줄기 (D-595): 받은 CD-11 띠 8장 줄(fx-rare-band.png · fx-gold-band.png, 84×126 × 8)을 이어 붙여
끊김 없는 대각 띠 하나(fx-rare-sweep.png · fx-gold-sweep.png)를 만든다. 게임은 이 띠 하나를 카드 쇠 테 가면 안에서
화면 프레임마다 정수 기기 픽셀로 옮긴다(src/slice/sheen.ts) — 8장 계단(약 6fps)으로 뛰던 띠를 대신한다.

손질은 D-386 · art-assets §7 범위(자르기 · 옮기기 · 지우기)만: 새로 그리지 않는다.
  1) 장마다 띠 조각의 x 어긋남을 이웃 장과 겹침이 가장 큰 값으로 재어(±40px) 한 캔버스에 겹쳐 놓는다.
  2) 줄마다 띠 가운데를 직선(최소제곱, 어긋난 30% 제외)에 맞춰 옮긴다 — 조각마다 기울기가 조금씩 달라 생긴 꺾임을 편다.
  3) 비었거나 쇠 테 잔여(회색)가 섞인 줄은 가장 가까운 성한 줄의 단면을 그 자리에 옮겨 쓴다.
사용: python3 -I tools/pixel/card_sweep.py
"""
import os
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CARDS = os.path.join(ROOT, 'src', 'assets', 'ui', 'cards')
W, H, N = 84, 126, 8
REF = 4


def _overlap(a, b, dx):
    A, B = a[:, :, 3] > 0, b[:, :, 3] > 0
    s = 0
    for x in range(W):
        xb = x + dx
        if 0 <= xb < W:
            s += int((A[:, x] & B[:, xb]).sum())
    return s


def stitch(sheet):
    fr = [sheet[:, k * W:(k + 1) * W] for k in range(N)]
    off = {REF: 0}
    for k in [3, 5, 2, 6, 1, 7]:
        near = k + 1 if k < REF else k - 1
        best = max(range(-40, 41), key=lambda d: _overlap(fr[k], fr[near], d))
        off[k] = off[near] + best
    lo, hi = min(off.values()), max(off.values())
    out = np.zeros((H, W + hi - lo, 4), np.uint8)
    for k in [1, 7, 2, 6, 3, 5, 4]:  # 가운데 장이 마지막(위)에
        f = fr[k]
        for x in range(W):
            m = f[:, x, 3] > 0
            out[m, x + off[k] - lo] = f[m, x]
    return out, off


def straighten(a):
    cen = {}
    for y in range(H):
        xs = np.nonzero(a[y, :, 3])[0]
        if len(xs) >= 6:
            cen[y] = (xs.min() + xs.max()) / 2
    ys = np.array(list(cen))
    cs = np.array([cen[y] for y in ys])
    k, b = np.polyfit(ys, cs, 1)
    r = np.abs(cs - (k * ys + b))
    m = r < np.percentile(r, 70)
    k, b = np.polyfit(ys[m], cs[m], 1)
    wid = {y: int(np.ptp(np.nonzero(a[y, :, 3])[0])) + 1 for y in cen}
    med = float(np.median(list(wid.values())))

    def clean(y):
        row = a[y][a[y, :, 3] > 0][:, :3].astype(int)
        sat = row.max(1) - row.min(1)
        return ((sat < 25) & (row.max(1) < 215)).mean() < 0.1

    # 조각 이음매(48~64줄)는 두 장이 엇갈려 단면이 깨진다 — 성한 줄로 갈음
    good = [y for y in cen if med - 2 <= wid[y] <= med + 3 and clean(y) and not (48 <= y <= 64)]
    OW = int(abs(k) * H + 40)
    out = np.zeros((H, OW, 4), np.uint8)
    x0 = OW / 2 - (k * H / 2 + b)
    for y in range(H):
        src = y if y in good else min(good, key=lambda g: abs(g - y))
        xs = np.nonzero(a[src, :, 3])[0]
        prof = a[src, xs.min():xs.max() + 1]
        c = (xs.min() + xs.max()) / 2 - xs.min()
        X = int(round(k * y + b + x0 - c))
        out[y, X:X + prof.shape[0]] = prof
    _, xs2 = np.nonzero(out[:, :, 3])
    return out[:, xs2.min():xs2.max() + 1], {'slope': round(float(k), 4), 'width': med, 'good_rows': len(good)}


if __name__ == '__main__':
    for g in ('rare', 'gold'):
        sheet = np.array(Image.open(os.path.join(CARDS, f'fx-{g}-band.png')).convert('RGBA'))
        st, off = stitch(sheet)
        band, rec = straighten(st)
        Image.fromarray(band).save(os.path.join(CARDS, f'fx-{g}-sweep.png'))
        print(g, 'offsets', off, rec, 'size', band.shape[1], 'x', band.shape[0])
