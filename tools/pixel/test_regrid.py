"""격자 실측 검사 (D-556): python3 -I tools/pixel/test_regrid.py  — 하나라도 어긋나면 종료 코드 1.
① 합성 그림(알려진 간격 · 축마다 다른 간격 · 압축 흐림)을 regrid.measure가 3% 안으로 되찾는지, 절반 간격으로 잘게 기울지 않는지
② scene_recipe.SCENE_GRID의 격자가 기록된 실측과 3% 넘게 다르지 않은지 (regrid.check)
③ 반입된 장면 파일 크기가 기록된 격자로 뽑은 크기와 같은지 (격자를 바꾸고 다시 뽑지 않은 장면을 잡는다)"""
import os
import sys

import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import regrid  # noqa: E402
import scene_recipe  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(HERE))
TMP = os.path.join(ROOT, 'build-res', '.test-regrid.png')


def synth(px, py, w=900, h=520, seed=1, blur=0.8):
    """간격 px × py 칸의 도트 그림(면 · 1칸 선 · 낱점)을 비정수 확대 + 살짝 흐림"""
    rng = np.random.default_rng(seed)
    cw, ch = int(w / px) + 2, int(h / py) + 2
    small = np.zeros((ch, cw, 3), np.uint8)
    pal = rng.integers(0, 255, (12, 3))
    for _ in range(60):  # 면
        x, y, a, b = rng.integers(0, cw), rng.integers(0, ch), rng.integers(2, 14), rng.integers(2, 10)
        small[y:y + b, x:x + a] = pal[rng.integers(0, 12)]
    for _ in range(40):  # 1칸 선
        y = rng.integers(0, ch)
        small[y, rng.integers(0, cw // 2):rng.integers(cw // 2, cw)] = pal[rng.integers(0, 12)]
    m = rng.random((ch, cw)) < 0.04  # 낱점
    small[m] = pal[rng.integers(0, 12, m.sum())]
    ys = (np.arange(h) / py).astype(int)
    xs = (np.arange(w) / px).astype(int)
    im = Image.fromarray(small[ys][:, xs])
    return im.filter(ImageFilter.GaussianBlur(blur)) if blur else im


def main():
    bad = []
    for px, py in ((6.0, 6.0), (6.4, 6.4), (5.8, 6.1), (7.2, 6.9)):
        synth(px, py).save(TMP)
        m = regrid.measure(TMP)
        for ax, want in (('x', px), ('y', py)):
            got = m[ax]['pitch']
            ok = got is not None and abs(got / want - 1) <= 0.03
            print(f'합성 {px}×{py} {ax}: 잰 값 {got} (있음 {m[ax]["presence"]}) {"맞음" if ok else "틀림"}')
            if not ok:
                bad.append(f'합성 {px}×{py} {ax}: {got} ≠ {want}')
    os.remove(TMP)
    bad += regrid.check()
    for name, g in scene_recipe.SCENE_GRID.items():  # ③ 파일 크기 = 격자로 뽑은 크기(띠 걷기 · 끝 반 칸 규칙 포함 — 가로만 정확히, 세로는 띠 걷기로 줄 수 있다)
        src = Image.open(os.path.join(regrid.ORDER, g['src']))
        w0 = src.width if not g.get('crop') else g['crop'][2] - g['crop'][0]
        cols = len(regrid.edges(w0, g['grid'][0], g['grid'][1])) - 1
        have = Image.open(os.path.join(ROOT, 'public', 'scenes', f'{name}.png')).size
        if have[0] != cols:
            bad.append(f'{name}: 파일 가로 {have[0]}칸 ≠ 격자 {cols}칸 (다시 뽑지 않았다)')
    print('\n'.join(bad) or f'모두 맞음 — 합성 4장 · 장면 {len(scene_recipe.SCENE_GRID)}장')
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
