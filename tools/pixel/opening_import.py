"""
받은 오프닝 장면 OP-01 ~ OP-04 반입 (D-423 · D-509 · D-514).
  python3 -I tools/pixel/opening_import.py            (넷 다)
  python3 -I tools/pixel/opening_import.py OP-01 …
- 원본 build-res/order/<ID>-source.png (재발주 중 1차본은 <ID>-v1-source.png — OPENING_GRID src) → 균일 정사각 격자(간격 = scene_recipe.MANUAL_PITCH[장면 이름], 칸 가운데 최빈색 · 색 그대로)
  → 그려 넣은 레터박스 검은 띠 줄을 위 · 아래에서 걷는다(scene_recipe.OPENING_GRID trim_max · trim_dark) → public/scenes/<장면 이름>.png
- 대조판 build-res/order/<ID>-check.png: 원본(축소) | 결과(같은 크기로 계단 확대)
"""
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
import scene_recipe  # noqa: E402
import snap  # noqa: E402

ORDER = os.path.join(ROOT, 'build-res', 'order')


def one(sid, table=None):
    """table = 격자표(기본 OPENING_GRID — 엔딩 ED-02~05는 ending_import.py가 ENDING_GRID를 넘긴다)"""
    g = (table or scene_recipe.OPENING_GRID)[sid]
    name = g['name']
    if name in scene_recipe.SCENE_GRID:  # D-556: 축마다 실측한 격자 · 최빈 표본 · 32색 (regrid.py) — 옛 941/180 균일 관례를 쓰지 않는다
        import regrid
        regrid.build_one(name, scene_recipe.SCENE_GRID[name])
        return
    stem = g.get('src', sid)
    src = Image.open(os.path.join(ORDER, f'{stem}-source.png')).convert('RGB')
    W, H = src.size
    p = scene_recipe.MANUAL_PITCH[name]
    rows, cols = round(H / p), round(W / p)
    small = snap.snap(src, W / cols, 0, p, 0, colors=0, cuts=(np.linspace(0, W, cols + 1), np.linspace(0, H, rows + 1)))
    a = np.asarray(small.convert('RGB')).astype(int)
    # 띠 줄 = 먹(가장 밝은 값 ≤ trim_max) 칸이 90% 넘는 줄. 띠가 끝난 첫 줄이 띠 경계에 걸쳐 먹이 trim_dark 넘게 남았으면 그 줄도 걷는다
    dark = (a.max(axis=2) <= g['trim_max']).mean(axis=1)

    def edge(d):
        k = int(np.argmax(d < 0.9))
        return k + 1 if d[k] > g['trim_dark'] else k
    top, bot = edge(dark), edge(dark[::-1])
    out = small.crop((0, top, cols, rows - bot))
    dst = os.path.join(ROOT, 'public', 'scenes', f'{name}.png')
    out.save(dst)
    print(f'{sid}: {W}×{H} 칸 {p:.2f}px → {cols}×{rows} · 띠 걷음 위 {top} / 아래 {bot}줄 → {out.size} → {dst}')
    # 대조판: 원본(띠 걷은 부분) | 결과 확대 — 같은 높이
    s0 = src.crop((0, round(top * p), W, round((rows - bot) * p)))
    h = 480
    left = s0.resize((round(s0.width * h / s0.height), h), Image.NEAREST)
    k = max(1, h // out.height)
    right = out.resize((out.width * k, out.height * k), Image.NEAREST)
    chk = Image.new('RGB', (left.width + right.width + 8, max(h, right.height)), (11, 11, 14))
    chk.paste(left, (0, 0))
    chk.paste(right, (left.width + 8, 0))
    chk.save(os.path.join(ORDER, f'{stem}-check.png'))


if __name__ == '__main__':
    for sid in sys.argv[1:] or list(scene_recipe.OPENING_GRID):
        one(sid)
