"""반장 2단계 초상 CI-02~08 반입 (D-423 · D-505).

python3 -I tools/pixel/boss_p2_import.py [CI-02 ...]
- 격자: scene_recipe.BOSS_P2의 원본 도트 간격(px)으로 균일 정사각 격자(칸 수 = round(1254/간격))를 깔고 칸 가운데 최빈색 → 칸 하나 = 1px.
  생성기 원본(1254×1254)은 6배가 아니라 약 6px 간격이라 결과는 약 205~210칸 정사각이다 — 늘리지 않는다(D-386, 화면은 cover로 자른다).
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
import snap  # noqa: E402
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


def one(key):
    r = BOSS_P2[key]
    src = ROOT / f'build-res/order/{key}-source.png'
    im = Image.open(src).convert('RGB')
    if 'recolor' in r:
        im = recolor(im, r['recolor'])
    p = r['pitch']
    # 균일 격자: 가로 · 세로 같은 칸 수(원본이 정사각) — 동적 경계는 축마다 칸 수가 달라져(217×229) 비율이 깨졌다(D-386).
    n = round(im.width / p), round(im.height / p)
    cuts = (np.linspace(0, im.width, n[0] + 1), np.linspace(0, im.height, n[1] + 1))
    small = snap.snap(im, p, 0, p, 0, colors=0, cuts=cuts).convert('RGB')
    pal = palette_for(small) + [hexrgb(h) for h in r.get('extra', [])]
    out = to_palette(small, pal)
    dst = ROOT / f'public/scenes/{r["dst"]}.png'
    out.save(dst, optimize=True)
    # 비교판 4배: 원본(같은 높이로 줄임) | 1단계 | 결과
    H = out.height * 4
    o = Image.open(src).convert('RGB').resize((H, H), Image.LANCZOS)
    p1 = Image.open(ROOT / f'public/scenes/{r["phase1"]}.png').convert('RGB')
    p1 = p1.resize((p1.width * H // p1.height, H), Image.NEAREST)
    res = out.resize((out.width * 4, H), Image.NEAREST)
    sheet = Image.new('RGB', (o.width + p1.width + res.width + 32, H), (11, 11, 14))
    x = 0
    for part in (o, p1, res):
        sheet.paste(part, (x, 0))
        x += part.width + 16
    ev = ROOT / f'production/qa/evidence/2026-11-14-ci-{key[3:]}.png'
    sheet.save(ev, optimize=True)
    rec = {'id': key, 'dst': str(dst.relative_to(ROOT)), 'size': list(out.size),
           'pitch': p, 'cells': [len(cuts[0]) - 1, len(cuts[1]) - 1],
           'colors': len(out.getcolors(1 << 16)), 'palette': len(set(pal)),
           'sourceSha256': hashlib.sha256(src.read_bytes()).hexdigest()[:16]}
    print(json.dumps(rec, ensure_ascii=False))


if __name__ == '__main__':
    for k in (sys.argv[1:] or sorted(BOSS_P2)):
        one(k)
