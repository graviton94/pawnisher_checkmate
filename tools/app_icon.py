#!/usr/bin/env python3
"""앱 아이콘 (D-544 — 받은 R-02 전경 · 바탕. D-538 임시본은 종이왕 기물 도트였다).

- 그림: `build-res/icon-src/fg.png`(종이왕 전경, 67×67도트 · 바탕 투명) · `bg.png`(리벳 쇠판 67×67도트) —
  받은 원본을 `python3 -I tools/pixel/r02_icon_import.py`가 실측 격자로 되돌린 도트 1칸 = 1px 그림.
- 배율: 1도트 = 정수 픽셀(최근접). 늘리거나 찌그러뜨리지 않는다(D-386). 전경은 보이는 부분(44×61도트)만 가운데에.
- 바탕 쇠판은 9-slice(귀퉁이 8도트 = 테 + 리벳, 변 · 가운데 = 단색)로 아이콘 크기만큼 짠다 — 전경과 같은 도트 배율.
- 작은 아이콘(전경 61도트가 1배로도 안 들어가는 64px 파비콘 · 48px 런처 등): 받은 그림을 줄이면 뭉개지므로
  종이왕 기물의 작은 판 `public/pieces/m-K0.png`(19×24도트)를 단색 쇠판(#16141C) 위에 정수배로 (D-538 그대로).
- 안드로이드 적응형: 전경 = 바탕 투명, 108dp 캔버스 가운데 지름 66dp 안전 원 안에 그림의 모든 칸이 든다(원 · 둥근 사각 마스크에 왕관이 잘리지 않게).
  적응형 바탕 = 같은 쇠판 9-slice 그림(ic_launcher_background.png).

실행: python3 -I tools/app_icon.py   (안드로이드 밀도별 파일은 tools/android-res.py가 이 모듈의 icon_android()를 부른다)
"""
import math
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'build-res' / 'icon-src'
BG = (0x16, 0x14, 0x1C, 255)
CORNER = 8  # 바탕 9-slice 귀퉁이 (테 1 + 리벳 창 3 ~ 7)

_fg = Image.open(SRC / 'fg.png').convert('RGBA')
FG = _fg.crop(_fg.getbbox())                       # 44×61도트
PLATE = Image.open(SRC / 'bg.png').convert('RGBA')  # 67×67도트
SMALL = Image.open(ROOT / 'public' / 'pieces' / 'm-K0.png').convert('RGBA')
SMALL = SMALL.crop(SMALL.getbbox())                # 19×24도트


def plate(n: int) -> Image.Image:
    """n×n도트 쇠판: 받은 바탕의 귀퉁이 CORNER칸은 그대로, 변 · 가운데는 받은 판의 한 줄을 이어 붙인다 (단색 면이라 반복해도 같다)"""
    c, s = CORNER, PLATE.width
    out = Image.new('RGBA', (n, n))
    mid = s // 2
    for y in range(n):
        sy = y if y < c else (s - (n - y) if y >= n - c else mid)
        for x in range(n):
            sx = x if x < c else (s - (n - x) if x >= n - c else mid)
            out.putpixel((x, y), PLATE.getpixel((sx, sy)))
    return out


def scale_for(limit: int) -> int:
    """한 변 limit px 상자에 드는 전경의 가장 큰 정수배 (0 = 안 든다)"""
    return min(limit // FG.width, limit // FG.height)


def compose(size: int, frac: float, bg: bool = True, round_mask: bool = False) -> Image.Image:
    """size px 정사각 아이콘: 쇠판 + 가운데 종이왕(정수배, 한 변 size × frac 안)"""
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    k = scale_for(int(size * frac))
    if k >= 1:
        art = FG.resize((FG.width * k, FG.height * k), Image.NEAREST)
        if bg:
            n = math.ceil(size / k)
            pl = plate(n).resize((n * k, n * k), Image.NEAREST)
            off = (pl.width - size) // 2
            canvas.paste(pl.crop((off, off, off + size, off + size)), (0, 0))
    else:  # 작은 아이콘: 기물 작은 판 + 단색 쇠판
        m = max(1, min(int(size * frac) // SMALL.width, int(size * frac) // SMALL.height))
        art = SMALL.resize((SMALL.width * m, SMALL.height * m), Image.NEAREST)
        if bg:
            canvas.paste(BG, (0, 0, size, size))
    if bg and round_mask:  # 계단 원 (안티앨리어싱 없음) — 둥근 런처 아이콘
        mask = Image.new('L', (size, size), 0)
        ImageDraw.Draw(mask).ellipse((0, 0, size - 1, size - 1), fill=255)
        canvas.putalpha(mask)
    x = (size - art.width) // 2
    y = (size - art.height) // 2
    canvas.alpha_composite(art, (x, y))
    return canvas


def safe_fg(w: int, radius: float) -> tuple[Image.Image, int, str]:
    """적응형 전경 w px: 그림의 모든 불투명 칸이 가운데 반지름 radius px 원 안에 드는 가장 큰 정수배
    (mdpi 108px처럼 받은 그림이 1배로도 안 들면 작은 판 m-K0). 반환 (그림, 바탕 쇠판 도트 배율)"""
    for art in (FG, SMALL):
        pts = [(x, y) for y in range(art.height) for x in range(art.width) if art.getpixel((x, y))[3]]
        for k in range(w // art.height, 0, -1):
            x0, y0 = (w - art.width * k) // 2, (w - art.height * k) // 2
            far = max(math.hypot(x0 + (x + dx) * k - w / 2, y0 + (y + dy) * k - w / 2) for x, y in pts for dx in (0, 1) for dy in (0, 1))
            if far <= radius:
                can = Image.new('RGBA', (w, w), (0, 0, 0, 0))
                can.alpha_composite(art.resize((art.width * k, art.height * k), Image.NEAREST), (x0, y0))
                return can, (k if art is FG else 1), ('받은 종이왕' if art is FG else '작은 판 m-K0')
    raise SystemExit(f'적응형 전경 {w}px: 1배도 안전 원 안에 안 든다')


def icon_web() -> None:
    """웹 · 일렉트론 · 애플 터치 아이콘"""
    out = {
        ROOT / 'build-res' / 'icon.png': (1024, 0.84),
        ROOT / 'public' / 'icon-512.png': (512, 0.84),
        ROOT / 'public' / 'icon-192.png': (192, 0.84),
        ROOT / 'public' / 'apple-touch-icon.png': (180, 0.84),
        ROOT / 'public' / 'favicon.png': (64, 0.9),
    }
    for p, (s, f) in out.items():
        im = compose(s, f)
        im.convert('RGB').save(p, optimize=True)
        k = scale_for(int(s * f))
        print(f'{p.relative_to(ROOT)}  {s}px  ' + (f'받은 종이왕 ×{k}' if k else '작은 판 m-K0'))


DPI = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}


def icon_android(res: Path) -> None:
    """안드로이드 런처 아이콘: 옛 정사각 · 둥근(API 25 이하) + 적응형 전경(안전 원 지름 66dp 안) · 바탕(쇠판)"""
    for name, k in DPI.items():
        d = res / f'mipmap-{name}'
        s = round(48 * k)
        compose(s, 0.84).convert('RGB').save(d / 'ic_launcher.png', optimize=True)
        compose(s, 0.72, round_mask=True).save(d / 'ic_launcher_round.png', optimize=True)
        w = round(108 * k)
        fg, fk, what = safe_fg(w, 33 * k)
        fg.save(d / 'ic_launcher_foreground.png', optimize=True)
        n = math.ceil(w / fk)
        plate(n).resize((n * fk, n * fk), Image.NEAREST).crop((0, 0, w, w)).convert('RGB').save(d / 'ic_launcher_background.png', optimize=True)
        print(f'{d.name}: launcher {s}px ({"×" + str(scale_for(int(s * 0.84))) if scale_for(int(s * 0.84)) else "m-K0"}) · 적응형 {w}px 전경 {what} · 바탕 쇠판 ×{fk}')


if __name__ == '__main__':
    icon_web()
