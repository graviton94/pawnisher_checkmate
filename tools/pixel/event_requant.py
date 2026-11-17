"""사건 그림 16장 재양자화 (D-538 · D-423 반입 절차, 리뷰 #6 — R-01 재발주를 받기 전 임시).

python3 -I tools/pixel/event_requant.py [--dry] [이름 …]

① 격자 복원 — 받은 원본(build-res/order/V-xx-<이름>-source.png)을 처음 반입(D-261 무렵, snap 자동 격자 · 경계 동적 계획)이
   복원한 격자 그대로 쓴다: 그 결과를 build-res/order/EV-grid/<이름>.png로 보존해 두고 여기서 시작한다(같은 칸 수 · 초점).
   균일 칸으로 다시 나눠 보니(1차 시도) 철망 · 사선 같은 1도트 선이 칸 경계에 걸려 끊어졌다 — 그래서 복원 격자를 바꾸지 않는다.
② 팔레트 축소 — 그림마다 colors색(≤ 32, 중앙 자르기 + k-평균 8회, 디더 없음 — 작은 면적 색(거울 속 보라 폰)도 남는다)
  ③ 외톨이 정리 — 8이웃이 모두 자기와 다른 칸 가운데 이웃 최빈색과 밝기 차 GRAIN 이하(그레인 낱점)만 그 색으로
   (대각 1도트 선 · 리벳 같은 대비 큰 낱점은 남긴다), despeckle번 되풀이
게임 그림 크기 · 비율이 그대로라 사건 NPC 얼굴 초점(EVENT_FOCUS)도 그대로다.
대조 시트(지금 | 재양자화, 2배): build-res/order/EV-requant-sheet.png · 수치: build-res/order/EV-requant-report.json
"""
from pathlib import Path
import json
import sys
import numpy as np
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(HERE))
from scene_recipe import EVENT_REQUANT  # noqa: E402

ORDER = ROOT / 'build-res/order'


def keys(a):
    return (a[:, :, 0].astype(np.int64) << 16) | (a[:, :, 1].astype(np.int64) << 8) | a[:, :, 2]


def lonely(a):
    """외톨이 칸 비율: 8이웃이 모두 자기 색과 다른 칸(그레인 낱점) / 안쪽 칸 전체 — 대각 1도트 선(철망)은 외톨이가 아니다"""
    k = keys(a)
    c = k[1:-1, 1:-1]
    H, W = k.shape
    m = np.ones_like(c, dtype=bool)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if dy or dx:
                m &= c != k[1 + dy:H - 1 + dy, 1 + dx:W - 1 + dx]
    return float(m.mean())


GRAIN = 40


def lum(c):
    return 0.299 * int(c[0]) + 0.587 * int(c[1]) + 0.114 * int(c[2])


def despeckle(a):
    """외톨이 칸(8이웃 모두 다른 색)을 8이웃 최빈색으로 (한 번)"""
    k = keys(a)
    out = a.copy()
    H, W = k.shape
    for y in range(1, H - 1):
        for x in range(1, W - 1):
            v = k[y, x]
            nb = k[y - 1:y + 2, x - 1:x + 2].ravel()
            if (nb == v).sum() > 1:
                continue
            nb = nb[nb != v]
            vals, cnt = np.unique(nb[nb != v], return_counts=True)
            t = int(vals[cnt.argmax()])
            c = [(t >> 16) & 255, (t >> 8) & 255, t & 255]
            # 그레인만 (밝기 차가 작은 낱점) — 대비가 큰 낱점(리벳 · 별빛 · 1도트 선 끝)은 남긴다
            if abs(lum(a[y, x]) - lum(c)) <= GRAIN:
                out[y, x] = c
    return out


def build(name, r):
    grid = Image.open(ORDER / 'EV-grid' / f'{name}.png').convert('RGB')
    assert grid.size == tuple(r['size']), f'{name}: 복원 격자 크기 {grid.size}'
    a = np.array(grid.quantize(r['colors'], method=Image.Quantize.MEDIANCUT, kmeans=8, dither=Image.Dither.NONE).convert('RGB'))
    for _ in range(r['despeckle']):
        a = despeckle(a)
    return Image.fromarray(a, 'RGB')


def main():
    dry = '--dry' in sys.argv
    names = [n for n in sys.argv[1:] if not n.startswith('--')] or list(EVENT_REQUANT)
    rows, report = [], {}
    for n in names:
        r = EVENT_REQUANT[n]
        dst = ROOT / 'public/scenes' / f'{n}.png'
        cur = Image.open(ORDER / 'EV-grid' / f'{n}.png').convert('RGB')  # 대조 기준 = 재양자화 전 (반입 격자 그대로)
        before = np.array(cur)
        out = build(n, r)
        assert out.size == cur.size, f'{n}: 크기가 바뀌었다 {out.size} != {cur.size}'
        a = np.array(out)
        rep = {'size': list(out.size), 'colorsBefore': int(len(np.unique(before.reshape(-1, 3), axis=0))), 'colorsAfter': int(len(np.unique(a.reshape(-1, 3), axis=0))),
               'lonelyBefore': round(lonely(before), 3), 'lonelyAfter': round(lonely(a), 3)}
        report[n] = rep
        print(n, rep, flush=True)
        if not dry:
            out.save(dst, optimize=True)
        rows.append((n, cur, out))
    sw = max(b.width for _, b, _ in rows) * 2
    sh = max(b.height for _, b, _ in rows) * 2 + 16
    sheet = Image.new('RGB', (sw * 2 + 8, sh * len(rows)), (24, 22, 28))
    d = ImageDraw.Draw(sheet)
    for i, (n, b, o) in enumerate(rows):
        y = i * sh
        sheet.paste(b.resize((b.width * 2, b.height * 2), Image.NEAREST), (0, y + 16))
        sheet.paste(o.resize((o.width * 2, o.height * 2), Image.NEAREST), (sw + 8, y + 16))
        rp = report[n]
        d.text((4, y + 2), f"{n}  before {rp['colorsBefore']} colors, lonely {rp['lonelyBefore']}  ->  after {rp['colorsAfter']} colors, lonely {rp['lonelyAfter']}", fill=(250, 204, 21))
    if dry:
        return
    sheet.save(ORDER / 'EV-requant-sheet.png', optimize=True)
    (ORDER / 'EV-requant-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=1) + '\n')


if __name__ == '__main__':
    main()
