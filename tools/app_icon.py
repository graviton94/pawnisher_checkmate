#!/usr/bin/env python3
"""앱 아이콘 (D-549 — 받은 R-02c B 「태엽 감긴 종이왕」. D-547 K0 + 리벳 쇠판 판은 build-res/unused/app-icon-k0/에 보관).

- 재료: `tools/pixel/r02c_icon_import.py`가 받은 B를 격자 복원한 도트 판 셋(도트 1칸 = 1px, 62×61도트)
    B-full.png 원본 그대로 · B-fg.png 전경(종이왕 · 왕관 · 태엽 열쇠, 바탕 투명) · B-bg.png 바탕(어두운 바탕 + 진홍 계단 후광)
  B 가장자리는 모두 바탕색 — 캔버스 밖은 바탕색으로 끝까지 잇는다(구워 넣은 원 · 검은 귀퉁이 없음, 꽉 찬 정사각).
- 배율: 1도트 = 정수 픽셀(최근접). 늘리거나 찌그러뜨리지 않는다(D-386). 크기마다 들어가는 가장 큰 정수배를 고른다.
  1배로도 안 드는 작은 크기는 정수 분의 1(d×d 도트 묶음마다 최빈색 — 섞지 않는다, 전경은 묶음 절반 이상이 그림일 때 그림)로 줄여 1배로 놓는다.
- 정사각(웹 · 일렉트론 · 옛 런처): 그림 + 후광(바탕색이 아닌 칸 전부)이 가장자리 여백(크기/32) 안에 들도록.
- 둥근 런처(API 25 이하): 계단 원 마스크(안티앨리어싱 없음), 전경의 모든 칸이 원 안(여백 크기/64 — 원 테두리에 닿지만 않게).
- 안드로이드 적응형: 전경 = 바탕 투명, 108dp 캔버스 가운데 지름 66dp 안전 원 안에 전경의 모든 칸이 든다(원 · 스쿼클 · 둥근 사각 마스크에 잘리지 않게).
  바탕 = 같은 배율 · 같은 자리의 바탕 층(진홍 계단 후광 + 어두운 바탕, 108dp 꽉 참) — ic_launcher_background.png.
- 파비콘(favicon*.png)은 이 도구가 찍지 않는다 (종이 왕관 문장 파비콘은 tools/pixel/r02b_crown_import.py — D-550).

실행: python3 -I tools/app_icon.py   (안드로이드 밀도별 파일은 tools/android-res.py가 이 모듈의 icon_android()를 부른다)
      python3 -I tools/app_icon.py sheet <out.png>   모든 크기 + 적응형 마스크(192 · 96 · 48 · 32) 미리보기 한 장
"""
import math
import sys
from collections import Counter
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'build-res' / 'icon-src'

FULL = Image.open(SRC / 'B-full.png').convert('RGBA')
FG = Image.open(SRC / 'B-fg.png').convert('RGBA')
BG = Image.open(SRC / 'B-bg.png').convert('RGBA')
BGC = FULL.getpixel((0, 0))  # 어두운 바탕 (#181420) — 캔버스 밖은 이 색으로 잇는다


def _reduce(d: int) -> tuple[Image.Image, Image.Image]:
    """정수 분의 1: d×d 도트 묶음마다 최빈색 (전경은 묶음 절반 이상이 그림이면 그림 — 가는 먹 선이 남게). 반환 (전경, 바탕)"""
    if d == 1:
        return FG, BG
    W, H = math.ceil(FG.width / d), math.ceil(FG.height / d)
    fg, bg = Image.new('RGBA', (W, H), (0, 0, 0, 0)), Image.new('RGBA', (W, H), BGC)
    f, b, fq, bq = fg.load(), bg.load(), FG.load(), BG.load()
    for y in range(H):
        for x in range(W):
            cells = [(x * d + i, y * d + j) for j in range(d) for i in range(d) if x * d + i < FG.width and y * d + j < FG.height]
            ink = [fq[c] for c in cells if fq[c][3]]
            if ink and len(ink) * 2 >= d * d:
                f[x, y] = Counter(ink).most_common(1)[0][0]
            b[x, y] = Counter(bq[c] for c in cells).most_common(1)[0][0]
    return fg, bg


def _opaque(im: Image.Image) -> list[tuple[int, int]]:
    a = im.getchannel('A').load()
    return [(x, y) for y in range(im.height) for x in range(im.width) if a[x, y]]


def _content(fg: Image.Image, bg: Image.Image) -> tuple[int, int, int, int]:
    """그림 + 후광 상자 (바탕색이 아닌 칸)"""
    full = bg.copy()
    full.alpha_composite(fg)
    q = full.load()
    pts = [(x, y) for y in range(full.height) for x in range(full.width) if q[x, y] != BGC]
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    return min(xs), min(ys), max(xs) + 1, max(ys) + 1


def _render(fg: Image.Image, bg: Image.Image, k: int, size: int, off: tuple[int, int], layer: str) -> Image.Image:
    """도트 판을 k배로 size×size 캔버스의 off 자리에 (캔버스 밖은 잘림). layer = 'full' | 'fg' | 'bg' (판 밖은 바탕색 · 전경은 투명).
    전경 알파는 0 / 255뿐이라 겹쳐도 색이 섞이지 않는다"""
    can = Image.new('RGBA', (size, size), (0, 0, 0, 0) if layer == 'fg' else BGC)
    if layer in ('full', 'bg'):
        can.paste(bg.resize((bg.width * k, bg.height * k), Image.NEAREST), off)
    if layer in ('full', 'fg'):
        big = fg.resize((fg.width * k, fg.height * k), Image.NEAREST)
        can.paste(big, off, big)
    return can


def _fit_square(size: int) -> tuple[int, int, tuple[int, int]]:
    """정사각: 그림 + 후광이 여백 안에 드는 가장 큰 (분의 1 d, 배율 k, 자리). 상자 가운데를 캔버스 가운데에"""
    m = size // 32
    for d in range(1, 8):
        fg, bg = _reduce(d)
        x0, y0, x1, y1 = _content(fg, bg)
        k = (size - 2 * m) // max(x1 - x0, y1 - y0)
        if k >= 1:
            return d, k, (size // 2 - round((x0 + x1) * k / 2), size // 2 - round((y0 + y1) * k / 2))
    raise SystemExit(f'{size}px: 아이콘이 들어갈 자리가 없다')


def _fit_circle(size: int, r: float) -> tuple[int, int, tuple[int, int]]:
    """원 안: 전경의 모든 칸(칸 네 귀퉁이)이 캔버스 가운데 반지름 r px 원 안에 드는 가장 큰 (d, k, 자리).
    자리는 정수 픽셀 — 전경 상자 가운데 둘레 ±k px를 훑어 가장 여유 있는 자리 (후광은 전경과 같이 움직인다)"""
    c = size / 2
    for d in range(1, 8):
        fg, bg = _reduce(d)
        pts = np.array(_opaque(fg), dtype=float)
        corners = np.concatenate([pts + (i, j) for i in (0, 1) for j in (0, 1)])
        x0, y0, x1, y1 = fg.getbbox()
        for k in range(int(2 * r) // max(x1 - x0, y1 - y0), 0, -1):
            best = None
            bx, by = round(c - (x0 + x1) * k / 2), round(c - (y0 + y1) * k / 2)
            for oy in range(by - k, by + k + 1):
                for ox in range(bx - k, bx + k + 1):
                    worst = np.hypot(ox + corners[:, 0] * k - c, oy + corners[:, 1] * k - c).max()
                    if worst <= r and (best is None or worst < best[0]):
                        best = (worst, (ox, oy))
            if best:
                return d, k, best[1]
    raise SystemExit(f'{size}px: 전경이 원에 들어갈 자리가 없다')


def _what(d: int, k: int) -> str:
    return f'1/{d}' if d > 1 else f'x{k}'


def compose(size: int, round_mask: bool = False) -> tuple[Image.Image, str]:
    """size px 정사각(꽉 찬 바탕) 또는 둥근(계단 원) 아이콘"""
    if round_mask:
        d, k, off = _fit_circle(size, size / 2 - max(1, size // 64))
    else:
        d, k, off = _fit_square(size)
    fg, bg = _reduce(d)
    im = _render(fg, bg, k, size, off, 'full')
    if round_mask:
        mask = Image.new('L', (size, size), 0)
        ImageDraw.Draw(mask).ellipse((0, 0, size - 1, size - 1), fill=255)
        im.putalpha(mask)
    return im, _what(d, k)


def adaptive(w: int, radius: float) -> tuple[Image.Image, Image.Image, str]:
    """적응형 w px 캔버스(108dp): 전경(투명 · 안전 원 반지름 radius 안) · 바탕(같은 배율 · 같은 자리, 꽉 참)"""
    d, k, off = _fit_circle(w, radius)
    fg, bg = _reduce(d)
    return _render(fg, bg, k, w, off, 'fg'), _render(fg, bg, k, w, off, 'bg'), _what(d, k)


WEB = {
    'build-res/icon.png': 1024,       # 일렉트론
    'public/icon-512.png': 512,
    'public/icon-192.png': 192,
    'public/apple-touch-icon.png': 180,
}


def icon_web() -> None:
    """웹 · 일렉트론 · 애플 터치 아이콘 (파비콘은 찍지 않는다)"""
    for rel, s in WEB.items():
        im, what = compose(s)
        im.convert('RGB').save(ROOT / rel, optimize=True)
        print(f'{rel}  {s}px  {what}')


DPI = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}


def android_set(k: float) -> dict[str, tuple[Image.Image, str]]:
    """밀도 배율 k의 런처 아이콘 넷: 옛 정사각 · 둥근 · 적응형 전경 · 바탕"""
    s = round(48 * k)
    sq, w1 = compose(s)
    rd, w2 = compose(s, round_mask=True)
    fg, bg, w3 = adaptive(round(108 * k), 33 * k)
    return {'ic_launcher.png': (sq.convert('RGB'), w1), 'ic_launcher_round.png': (rd, w2),
            'ic_launcher_foreground.png': (fg, w3), 'ic_launcher_background.png': (bg.convert('RGB'), w3)}


def icon_android(res: Path) -> None:
    """안드로이드 런처 아이콘: 옛 정사각 · 둥근(API 25 이하) + 적응형 전경(안전 원 지름 66dp 안) · 바탕(후광)"""
    for name, k in DPI.items():
        d = res / f'mipmap-{name}'
        files = android_set(k)
        for fn, (im, _) in files.items():
            im.save(d / fn, optimize=True)
        print(f'{d.name}: ' + ' · '.join(f'{fn[12:-4] or "launcher"} {w}' for fn, (_, w) in files.items()))


def _masks(w: int) -> dict[str, Image.Image]:
    """적응형 아이콘 미리보기 마스크 (가운데 72dp 보이는 칸, w = 72dp px) — 계단(안티앨리어싱 없음)"""
    out = {}
    c = Image.new('L', (w, w), 0)
    ImageDraw.Draw(c).ellipse((0, 0, w - 1, w - 1), fill=255)
    out['circle'] = c
    q = Image.new('L', (w, w), 0)
    for y in range(w):
        for x in range(w):
            u, v = (2 * x + 1) / w - 1, (2 * y + 1) / w - 1
            if abs(u) ** 4 + abs(v) ** 4 <= 1:
                q.putpixel((x, y), 255)
    out['squircle'] = q
    r = Image.new('L', (w, w), 0)
    ImageDraw.Draw(r).rounded_rectangle((0, 0, w - 1, w - 1), radius=round(w * 0.16), fill=255)
    out['rounded'] = r
    return out


def _masked(fg: Image.Image, bg: Image.Image, v: int) -> list[tuple[Image.Image, str]]:
    """적응형 두 층을 겹쳐 가운데 72dp(v px)를 세 마스크로"""
    w = fg.width
    full = bg.convert('RGBA')
    full.alpha_composite(fg)
    vis = full.crop(((w - v) // 2, (w - v) // 2, (w - v) // 2 + v, (w - v) // 2 + v))
    out = []
    for mn, m in _masks(v).items():
        t = Image.new('RGBA', (v, v), (0, 0, 0, 0))
        t.paste(vis, (0, 0), m)
        out.append((t, mn))
    return out


def sheet(path: str) -> None:
    """모든 크기 1:1 + 작은 것 확대본, 안드로이드 밀도별 파일, 화면 크기 192 · 96 · 48 · 32px 적응형 마스크 미리보기(1:1 + 확대)"""
    pad, bgc = 16, (0x3A, 0x36, 0x44, 255)
    rows: list[list[tuple[Image.Image, str]]] = []
    tiles = [(Image.open(ROOT / 'build-res' / 'order' / 'R-02c-icon-B-source.png').convert('RGBA').resize((256, 256), Image.LANCZOS), 'source (view)')]
    for rel, s in WEB.items():
        im = Image.open(ROOT / rel).convert('RGBA')
        tiles.append((im if s <= 512 else im.resize((512, 512), Image.NEAREST), f'{s}' + (' (half view)' if s > 512 else ' (1:1)')))
    rows.append(tiles)
    for name, k in DPI.items():
        files = android_set(k)
        row = [(files['ic_launcher.png'][0].convert('RGBA'), f'{name} {round(48 * k)} {files["ic_launcher.png"][1]}'),
               (files['ic_launcher_round.png'][0], f'round {files["ic_launcher_round.png"][1]}')]
        w, v = round(108 * k), round(72 * k)
        fg, bg = files['ic_launcher_foreground.png'][0], files['ic_launcher_background.png'][0]
        dbg = bg.convert('RGBA')
        dbg.alpha_composite(fg)
        ImageDraw.Draw(dbg).ellipse((w / 2 - 33 * k, w / 2 - 33 * k, w / 2 + 33 * k, w / 2 + 33 * k), outline=(64, 255, 64, 255))
        ImageDraw.Draw(dbg).rectangle(((w - v) // 2, (w - v) // 2, (w + v) // 2, (w + v) // 2), outline=(64, 200, 255, 255))
        row.append((dbg, f'108dp safe66 {files["ic_launcher_foreground.png"][1]}'))
        row += _masked(fg, bg, v)
        rows.append(row)
    for v in (192, 96, 48, 32):  # 화면에 보이는 크기 (72dp = v px)
        w = v * 3 // 2
        fg, bg, what = adaptive(w, v * 33 / 72)
        ms = _masked(fg, bg, v)
        row = [(t, f'{v}px {mn} {what}') for t, mn in ms]
        if v < 192:
            z = 192 // v
            row += [(t.resize((v * z, v * z), Image.NEAREST), f'{mn} x{z}') for t, mn in ms]
        sq, w1 = compose(v)
        row.append((sq, f'square {w1}'))
        if v < 192:
            row.append((sq.resize((v * (192 // v),) * 2, Image.NEAREST), f'square x{192 // v}'))
        rows.append(row)
    # 참고 (파일로 내지 않는다): 실제 런처는 밀도 파일(xxxhdpi 288px 보이는 칸)을 시스템이 줄여 48 · 32px로 그린다 — 그 모습
    files = android_set(4)
    ref = []
    for t, mn in _masked(files['ic_launcher_foreground.png'][0], files['ic_launcher_background.png'][0], 288):
        for v in (48, 32):
            s = t.resize((v, v), Image.LANCZOS)
            ref += [(s, f'sys {v} {mn}'), (s.resize((v * (192 // v),) * 2, Image.NEAREST), f'x{192 // v}')]
    rows.append(ref[:8])
    rows.append(ref[8:])
    W = max(sum(t.width + pad for t, _ in r) for r in rows) + pad
    H = sum(max(t.height for t, _ in r) + pad + 14 for r in rows) + pad
    out = Image.new('RGBA', (W, H), bgc)
    d = ImageDraw.Draw(out)
    y = pad
    for r in rows:
        x = pad
        for t, label in r:
            out.alpha_composite(t, (x, y))
            d.text((x, y + max(tt.height for tt, _ in r) + 2), label, fill=(230, 226, 220, 255))
            x += t.width + pad
        y += max(t.height for t, _ in r) + pad + 14
    out.save(path)
    print(path, out.size)


if __name__ == '__main__':
    if len(sys.argv) > 2 and sys.argv[1] == 'sheet':
        sheet(sys.argv[2])
    else:
        icon_web()
