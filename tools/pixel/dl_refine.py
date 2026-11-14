"""
받은 DL-01 · DL-02 · CI-01 (P-B D-490) 다듬기 — ui_kit_import.py 다음에 돌린다.
  python3 -I tools/pixel/ui_kit_import.py build-res/order/DL-01-source.png DL-01 200
  UIKIT_GAP=0 python3 -I tools/pixel/ui_kit_import.py build-res/order/DL-02-source.png DL-02 160
  python3 -I tools/pixel/ui_kit_import.py build-res/order/CI-01-source.png CI-01 240
  python3 -I tools/pixel/dl_refine.py
하는 일 (D-423 격자 맞춤 · D-386 비율 유지 — 그리지 않고 받은 도트만 옮긴다):
 ① 9-slice로 늘어날 띠(가로 · 세로)를 받은 그림의 한 열 · 한 행으로 고르게 — 반쯤 찍힌 먹 점이 늘어나 긴 구멍이 되지 않게.
    등 · 보석 · 쐐기 · 액자 홈은 늘지 않는 모서리 칸 안에 있다(아래 SLICE 수치가 그 경계).
 ② 경보 띠 3프레임 · 레터박스는 무늬 주기(8 · 7도트)의 정수배로 잘라 이음매 없이 되풀이되는 타일로.
결과는 같은 파일을 덮는다(src/assets/ui/chrome/v2/). 확인: build-res/order/DL-refine-check.png (×4, 원본 → 결과).
"""
import os

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
V2 = os.path.join(ROOT, 'src', 'assets', 'ui', 'chrome', 'v2')

# 이름: (가로 늘이기 열 [x0, x1) · 본 열, 세로 늘이기 행 [y0, y1) · 본 행 또는 None) — CSS 9-slice는 voice.css의 --k-* 와 같다
UNIFY = {
    # 적 띠 83×37: 왼 21(쐐기 · 등) · 오른 27(초상 홈 · 등) · 위 21 · 아래 14 (쐐기 코 21 ~ 22행만 세로로 는다)
    'talk-foe': ((21, 56, 40), (21, 23, 21)),
    # 우리 띠 84×32: 왼 36(초상 홈 · 청록 등) · 오른 13(말린 종이) · 위 9 · 아래 18 (9 ~ 13행이 같은 행)
    'talk-ally': ((36, 71, 45), (9, 14, 11)),
    # 시스템 띠 115×26: 왼 · 오른 21(사슬 · 줄무늬) · 높이 고정
    'talk-sys': ((21, 94, 50), None),
    'talk-sys-warn': ((21, 94, 50), None),
    # 이름표 48×15 / 51×15: 높이 고정
    'name-foe': ((8, 42, 20), None),
    'name-ally': ((7, 38, 20), None),
    'name-npc': ((14, 46, 30), None),
}
# 타일: (원본, 결과, 열 [x0, x1)) — 무늬 주기의 정수배
TILES = [('p2-band-1', 'p2-tile-1', (1, 57)), ('p2-band-2', 'p2-tile-2', (1, 57)), ('p2-band-3', 'p2-tile-3', (1, 57)), ('letterbox', 'letterbox-tile', (1, 29))]


def unify(im, h, v):
    im = im.copy()
    px = im.load()
    W, H = im.size
    x0, x1, tx = h
    for y in range(H):
        c = px[tx, y]
        for x in range(x0, x1):
            px[x, y] = c
    if v:
        y0, y1, ty = v
        row = [px[x, ty] for x in range(W)]
        for y in range(y0, y1):
            for x in range(W):
                px[x, y] = row[x]
    return im


def main():
    pairs = []
    for nm, (h, v) in UNIFY.items():
        p = os.path.join(V2, f'{nm}.png')
        src = Image.open(p).convert('RGBA')
        out = unify(src, h, v)
        out.save(p)
        pairs.append((nm, src, out))
        print(f'{nm}: {src.size[0]}×{src.size[1]} 고르게 (열 {h[0]}–{h[1] - 1} ← {h[2]}{f" · 행 {v[0]}–{v[1] - 1} ← {v[2]}" if v else ""})')
    for nm, out_nm, (x0, x1) in TILES:
        src = Image.open(os.path.join(V2, f'{nm}.png')).convert('RGBA')
        H = 16 if nm.startswith('p2') else src.size[1]
        tile = Image.new('RGBA', (x1 - x0, H), (0, 0, 0, 0))
        tile.paste(src.crop((x0, 0, x1, min(H, src.size[1]))), (0, 0))
        # 셋째 프레임은 받은 그림이 15행 — 아래 먹 줄 한 행을 위 프레임과 같게 채운다(높이 16 맞춤)
        if src.size[1] < H:
            last = src.crop((x0, src.size[1] - 1, x1, src.size[1]))
            tile.paste(last, (0, H - 1))
        tile.save(os.path.join(V2, f'{out_nm}.png'))
        pairs.append((out_nm, src, tile))
        print(f'{out_nm}: {tile.size[0]}×{tile.size[1]} (열 {x0}–{x1 - 1})')
    # 확인 그림: 원본(왼) → 결과(오른) ×4
    sc = 4
    W = max(s.size[0] + o.size[0] for _, s, o in pairs) * sc + 48
    Hh = sum(max(s.size[1], o.size[1]) * sc + 12 for _, s, o in pairs) + 12
    chk = Image.new('RGBA', (W, Hh), (24, 23, 30, 255))
    y = 12
    for _, s, o in pairs:
        a = s.resize((s.size[0] * sc, s.size[1] * sc), Image.NEAREST)
        b = o.resize((o.size[0] * sc, o.size[1] * sc), Image.NEAREST)
        chk.paste(a, (12, y), a)
        chk.paste(b, (24 + a.size[0], y), b)
        y += max(a.size[1], b.size[1]) + 12
    chk.save(os.path.join(ROOT, 'build-res', 'order', 'DL-refine-check.png'))


if __name__ == '__main__':
    main()
