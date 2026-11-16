#!/usr/bin/env python3
"""안드로이드 시작 화면 · 적응형 아이콘 (D-531). 새 그림 없이 있는 그림을 조합만 한다.

- 시작 화면: 어두운 바탕(#16141C, 웹 · 캡커시터 배경과 같은 색) 가운데에 `public/ui/title-logo.png`를
  밀도마다 정수배 최근접 확대로 놓는다 → `drawable-<dpi>/splash_logo.png`. 바탕 · 가운데 맞춤은
  `drawable/splash.xml`(layer-list, filter=false)이 한다 — 그림을 창 크기로 늘리지 않는다 (D-386).
- 적응형 아이콘 전경: `build-res/icon.png`를 108dp 캔버스의 78dp로 줄여 놓는다 (예전 84dp는
  워드마크 끝이 66dp 안전 원 밖 34.6dp까지 나가 원형 마스크에서 잘렸다 → 32.2dp).

실행: python3 -I tools/android-res.py
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
RES = ROOT / 'android' / 'app' / 'src' / 'main' / 'res'
BG = (0x16, 0x14, 0x1C)
# 밀도 배율 (mdpi = 1) → 로고 정수배 = 내림 (hdpi 1.5 → 1)
DPI = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}
ICON_DP = 78  # 108dp 캔버스 안 아이콘 정사각형 한 변


def splash() -> None:
    logo = Image.open(ROOT / 'public' / 'ui' / 'title-logo.png').convert('RGBA')
    for name, k in DPI.items():
        s = max(1, int(k))
        out = logo.resize((logo.width * s, logo.height * s), Image.NEAREST)
        d = RES / f'drawable-{name}'
        d.mkdir(exist_ok=True)
        out.save(d / 'splash_logo.png', optimize=True)
        print(f'{d.name}/splash_logo.png  ×{s}  {out.size}')


def icon() -> None:
    src = Image.open(ROOT / 'build-res' / 'icon.png').convert('RGB')
    for name, k in DPI.items():
        w = round(108 * k)
        side = round(ICON_DP * k)
        canvas = Image.new('RGB', (w, w), (0, 0, 0))
        canvas.paste(src.resize((side, side), Image.LANCZOS), ((w - side) // 2, (w - side) // 2))
        p = RES / f'mipmap-{name}' / 'ic_launcher_foreground.png'
        canvas.save(p, optimize=True)
        print(f'{p.parent.name}/{p.name}  {w}px  mark {side}px')


if __name__ == '__main__':
    splash()
    icon()
