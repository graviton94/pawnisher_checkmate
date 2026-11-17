"""
적 왕 말풍선 얼굴 (2026-11-05, 사용자: 「적 왕 대사에 받아 두었던 왕 픽셀아트 3종이나 초상화 일부를 잘라 쓰면?」).
반장 초상화(public/scenes/boss-*.png, 도트 장면)의 왕관 · 상반신(D-308)을 60×60으로 잘라 쓴다.
D-552: 옛 판은 초상 폭 절반(105~199칸)을 Image.BOX(평균)로 60칸에 줄여 1.4~2.3천 색 · 반 톤 얼룩이 생겼다.
이제 평균을 쓰지 않는다 — 정수 k(= round(초상 폭 절반 / 60), 최소 1)를 골라 60k×60k 칸을 잘라 k×k 칸마다
「가장 많은 색」 하나(동률이면 그림 전체에서 더 드문 색 — 테 빛 · 외곽선이 배경에 묻히지 않게)를 고른다. k = 1이면 그대로 자르기.
그 뒤 32색(중앙값 자르기 · 디더 없음)으로 묶는다.
보통 대국의 적 왕은 기물 정본(검정 킹)을 같은 틀 안에 그린다 (main.ts taunt).
출력: public/ui/hud/avatar-{plate,spawn,thorns,inspect,magnet,alarm,gilded}.png
사용: python3 -I tools/pixel/boss_avatars.py
"""
import os
from collections import Counter

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
S = 60
PAL_N = 32
# 반장 규칙 → (초상화, 왕관 십자가 가운데 x(칸), 위 여백(칸)) — 상반신 (D-308, 사용자: 「대사창 얼굴은 각 초상의 상반신」)
CROPS = {
    'plate': ('boss-plate', 102, 0), 'spawn': ('boss-assembly', 83, 0), 'thorns': ('boss-thorns', 112, 0),
    'inspect': ('boss-inspector', 109, 0), 'magnet': ('boss-magnet', 147, 0), 'alarm': ('boss-alarm', 172, 0),
    'gilded': ('boss-gilded', 128, 0),
}


def mode_reduce(im, k):
    """k×k 칸마다 가장 많은 색(동률 → 그림 전체에서 더 드문 색). 평균 없음 — 결과 색은 모두 원래 있던 색."""
    if k == 1:
        return im.copy()
    a = np.asarray(im.convert('RGBA'))
    key = (a[:, :, 0].astype(np.int64) << 24) | (a[:, :, 1].astype(np.int64) << 16) | (a[:, :, 2].astype(np.int64) << 8) | a[:, :, 3]
    glob = Counter(key.ravel().tolist())
    h, w = a.shape[0] // k, a.shape[1] // k
    out = np.zeros((h, w, 4), np.uint8)
    for j in range(h):
        for i in range(w):
            blk = key[j * k:(j + 1) * k, i * k:(i + 1) * k].ravel().tolist()
            c = Counter(blk)
            top = max(c.values())
            best = min((v for v, n in c.items() if n == top), key=lambda v: glob[v])
            out[j, i] = [(best >> 24) & 255, (best >> 16) & 255, (best >> 8) & 255, best & 255]
    return Image.fromarray(out, 'RGBA')


def one(key):
    name, cx, top = CROPS[key]
    im = Image.open(os.path.join(ROOT, 'public', 'scenes', f'{name}.png')).convert('RGBA')
    k = max(1, round(im.width * 0.5 / S))
    s = S * k
    # 초상은 이미 격자를 맞춘 장면이라 칸 = 1px. 칸 단위로 자른다(정수 좌표).
    x = max(0, min(im.width - s, cx - s // 2))
    y = max(0, min(im.height - s, top))
    out = mode_reduce(im.crop((x, y, x + s, y + s)), k).convert('RGB')
    # 장면 초상은 색을 줄이지 않은 그림(D-312)이라 수천 색 — 얼굴 칸은 32색(중앙값 자르기, 디더 없음)으로 묶는다
    out = out.quantize(colors=PAL_N, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
    assert out.size == (S, S), (key, out.size)
    out.save(os.path.join(ROOT, 'public', 'ui', 'hud', f'avatar-{key}.png'), optimize=True)
    return key, name, im.size, k, (x, y), len(out.getcolors(1 << 16))


def main():
    for key in CROPS:
        print(*one(key))


if __name__ == '__main__':
    main()
