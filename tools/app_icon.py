#!/usr/bin/env python3
"""임시 앱 아이콘 (D-538, 리뷰 #7 — R-02 발주본을 받기 전). 새 그림 없이 종이왕 기물 도트만 조합한다.

- 그림: 종이왕 K0 정본(`public/pieces/s-K0.png`, maker.py export — 72도트 그림을 텍스처 2배로 낸 것)을 2:1로 되돌려
  72도트 격자로 읽고, 보이는 부분(55×69도트)만 쓴다. 작은 아이콘(48 · 64px처럼 72도트가 1배로도 안 들어가는 곳)은
  같은 기물의 작은 판 `public/pieces/m-K0.png`(25도트, 19×24 보임)을 쓴다.
- 배율: 1도트 = 정수 픽셀(최근접). 그림을 늘리거나 찌그러뜨리지 않는다(D-386) — 정수배가 안 맞으면 여백이 남는다.
- 바탕: 단색 쇠판 #16141C (웹 · 캡커시터 배경과 같은 색). 글자 · 워드마크 없음.
- 안드로이드 적응형 전경은 바탕 투명, 108dp 캔버스 가운데 지름 60dp 안(66dp 안전 원 안)에 든다. 적응형 바탕은 values/ic_launcher_background.xml 색.

실행: python3 -I tools/app_icon.py   (안드로이드 밀도별 파일은 tools/android-res.py가 이 모듈의 icon_android()를 부른다)
"""
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
BG = (0x16, 0x14, 0x1C, 255)


def _art(name: str, down: int) -> Image.Image:
    im = Image.open(ROOT / 'public' / 'pieces' / name).convert('RGBA')
    if down > 1:
        im = im.resize((im.width // down, im.height // down), Image.NEAREST)
    return im.crop(im.getbbox())


BIG = _art('s-K0.png', 2)    # 55×69도트
SMALL = _art('m-K0.png', 1)  # 19×24도트


def mark(limit: int) -> Image.Image:
    """한 변 limit px 상자에 드는 가장 큰 정수배 종이왕 (큰 그림이 1배도 안 들어가면 작은 판)"""
    for art in (BIG, SMALL):
        m = min(limit // art.width, limit // art.height)
        if m >= 1:
            return art.resize((art.width * m, art.height * m), Image.NEAREST)
    return SMALL


def compose(size: int, frac: float, bg: bool = True, round_mask: bool = False) -> Image.Image:
    """size px 정사각 아이콘: 바탕(단색 · 둥근 판이면 계단 원) + 가운데 종이왕(정수배, 한 변 size × frac 안)"""
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    if bg:
        if round_mask:
            # 계단 원 (안티앨리어싱 없음) — 둥근 런처 아이콘
            ImageDraw.Draw(canvas).ellipse((0, 0, size - 1, size - 1), fill=BG)
        else:
            canvas.paste(BG, (0, 0, size, size))
    mk = mark(int(size * frac))
    # 무게 중심을 살짝 아래로 (왕관이 위로 솟아 시각 가운데가 위로 뜬다) — 정수 픽셀
    x = (size - mk.width) // 2
    y = (size - mk.height) // 2 + size // 64
    canvas.alpha_composite(mk, (x, y))
    return canvas


def icon_web() -> None:
    """웹 · 일렉트론 · 애플 터치 아이콘"""
    out = {
        ROOT / 'build-res' / 'icon.png': (1024, 0.8),
        ROOT / 'public' / 'icon-512.png': (512, 0.8),
        ROOT / 'public' / 'icon-192.png': (192, 0.8),
        ROOT / 'public' / 'apple-touch-icon.png': (180, 0.8),
        ROOT / 'public' / 'favicon.png': (64, 0.9),
    }
    for p, (s, f) in out.items():
        im = compose(s, f)
        im.convert('RGB').save(p, optimize=True)
        print(f'{p.relative_to(ROOT)}  {s}px')


DPI = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}


def icon_android(res: Path) -> None:
    """안드로이드 런처 아이콘: 옛 정사각 · 둥근(API 25 이하) + 적응형 전경(바탕 투명, 지름 60dp 안)"""
    for name, k in DPI.items():
        d = res / f'mipmap-{name}'
        s = round(48 * k)
        compose(s, 0.8).convert('RGB').save(d / 'ic_launcher.png', optimize=True)
        compose(s, 0.72, round_mask=True).save(d / 'ic_launcher_round.png', optimize=True)
        w = round(108 * k)
        fg = compose(w, 60 / 108, bg=False)
        fg.save(d / 'ic_launcher_foreground.png', optimize=True)
        print(f'{d.name}: launcher {s}px · foreground {w}px (종이왕 {mark(int(w * 60 / 108)).size})')


if __name__ == '__main__':
    icon_web()
