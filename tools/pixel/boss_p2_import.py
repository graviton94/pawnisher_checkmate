"""반장 2단계 초상 CI-02~08 반입 (D-423 · D-505).

python3 -I tools/pixel/boss_p2_import.py [--measure] [CI-02 ...]
- 격자(D-552): scene_recipe.BOSS_P2[..]['grid'] = 축마다 실측한 도트 간격 · 시작점(gridmeasure.measure, 4~16px) — 'dp'가 붙은 축은
  세 토막 간격이 흔들려 반 칸 넘게 어긋나므로 간격은 고정하고 창마다 시작점만 따라간다(gridmeasure.tracked_cuts). 칸 가운데 최빈색 → 칸 하나 = 1px.
  옛 값(정사각 한 간격, 칸 수 = round(1254/간격))은 1.5~3% 어긋나 리벳 · 체크 디더가 1/2칸으로 깨졌다.
  --measure: 원본을 다시 재서 레시피에 넣을 값과 존재 점수를 찍는다(반입은 하지 않는다).
  가로 · 세로 간격이 달라 결과는 정사각이 아닐 수 있다(약 201~210칸) — 늘리지 않는다(D-386, 화면은 cover로 자른다).
- 색: 발주 고정 24색 + 「받은 그림 자신의 대표 24색」(반장 테마 색 계단 확장, D-309 · D-505) 안으로 붙인다(최대 48색).
  1단계 초상 색으로 붙이면 자석의 보라가 회색으로 죽고 파란 극이 청록이 됐다 — 반장 색은 받은 그대로 둔다(사용자 결정).
- recolor: 받은 테마 색이 그 반장 색과 다르면(조립 = 초록인데 청록으로 옴) 색상만 돌린 뒤 붙인다.
- 비교판: production/qa/evidence/2026-11-14-ci-<번호>.png (원본 축소 | 1단계 초상 | 반입 결과, 모두 4배 계단 확대 기준).
"""
from pathlib import Path
import colorsys
import hashlib
import json
import sys
import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(HERE))
import gridmeasure as gm  # noqa: E402
from scene_recipe import BOSS_P2, SPEC24  # noqa: E402


def hexrgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


def recolor(img, rule):
    """색상 hue를 from(도) 근처 → to(도)로 돌린다. 채도 낮은 쇠 · 먹은 그대로."""
    a = np.asarray(img.convert('RGB'), dtype=np.float32) / 255
    out = a.copy()
    lo, hi, to, smin = rule['from'][0], rule['from'][1], rule['to'], rule.get('smin', 0.25)
    flat = a.reshape(-1, 3)
    res = out.reshape(-1, 3)
    for k, (r, g, b) in enumerate(flat):
        h, s, v = colorsys.rgb_to_hsv(r, g, b)
        if s >= smin and lo <= h * 360 <= hi:
            res[k] = colorsys.hsv_to_rgb(to / 360, min(1, s * rule.get('sat', 1)), v)
    return Image.fromarray((out * 255).astype(np.uint8))


def palette_for(small):
    """발주 24색 + 받은 그림 자신의 대표 24색(그 반장 테마 색 계단, D-309 · D-505)"""
    q = small.quantize(colors=24, method=Image.Quantize.MEDIANCUT, kmeans=4, dither=Image.Dither.NONE)
    pal = q.getpalette()[:72]
    ext = [tuple(pal[i:i + 3]) for i in range(0, 72, 3)]
    return [hexrgb(h) for h in SPEC24] + ext


def to_palette(img, pal):
    a = np.asarray(img.convert('RGB'), dtype=np.int32)
    p = np.array(pal, dtype=np.int32)
    # 밝기 가중 거리 (초록을 더 무겁게 — 명도 계단이 덜 무너진다)
    w = np.array([2, 4, 3])
    d = (((a[:, :, None, :] - p[None, None, :, :]) ** 2) * w).sum(-1)
    return Image.fromarray(p[d.argmin(-1)].astype(np.uint8), 'RGB')


def one(key, measure=False):
    r = BOSS_P2[key]
    src = ROOT / f'build-res/order/{key}-source.png'
    im = Image.open(src).convert('RGB')
    if measure:
        m = gm.measure(im, lo=4, hi=16)
        print(key, json.dumps(gm.recipe_of(m, im)), json.dumps(gm.short(m)))
        return
    if 'recolor' in r:
        im = recolor(im, r['recolor'])
    small, cuts = gm.regrid(im, gm.from_recipe(r['grid'], im.size))
    small = small.convert('RGB')
    pal = palette_for(small) + [hexrgb(h) for h in r.get('extra', [])]
    out = to_palette(small, pal)
    dst = ROOT / f'public/scenes/{r["dst"]}.png'
    old = Image.open(dst).convert('RGB') if dst.exists() else None
    out.save(dst, optimize=True)
    # 대조판: 원본 1:1 가운데 창 | 옛 결과 | 새 결과 (정수배 계단 확대)
    W, H = im.size
    win = (W // 2 - 160, H // 2 - 200, W // 2 + 160, H // 2 + 120)
    parts = ([('old', old)] if old is not None else []) + [('new', out)]
    ev = ROOT / f'production/qa/evidence/2026-11-17-ci-{key[3:]}-regrid.png'
    gm.compare_sheet(Image.open(src), parts, win, ev, zoom=6)
    rec = {'id': key, 'dst': str(dst.relative_to(ROOT)), 'size': list(out.size), 'grid': r['grid'],
           'cells': [len(cuts[0]) - 1, len(cuts[1]) - 1],
           'colors': len(out.getcolors(1 << 16)), 'palette': len(set(pal)),
           'sourceSha256': hashlib.sha256(src.read_bytes()).hexdigest()[:16]}
    print(json.dumps(rec, ensure_ascii=False))


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    for k in (args or sorted(BOSS_P2)):
        one(k, '--measure' in sys.argv)
