#!/usr/bin/env python3
"""안드로이드 시작 화면 · 적응형 아이콘 (D-531). 새 그림 없이 있는 그림을 조합만 한다.

- 시작 화면: 어두운 바탕(#16141C, 웹 · 캡커시터 배경과 같은 색) 가운데에 `public/ui/title-logo.png`를
  밀도마다 정수배 최근접 확대로 놓는다 → `drawable-<dpi>/splash_logo.png`. 바탕 · 가운데 맞춤은
  `drawable/splash.xml`(layer-list, filter=false)이 한다 — 그림을 창 크기로 늘리지 않는다 (D-386).
- 런처 아이콘 · 적응형 전경 (D-538): 매끈한 워드마크 로고(build-res/icon.png 옛 판)를 LANCZOS로 줄이던 것을 버리고,
  종이왕 기물 도트를 밀도마다 정수배로 놓는다(tools/app_icon.py). D-544부터 받은 R-02 전경 · 바탕(build-res/icon-src) —
  전경은 바탕 투명 · 66dp 안전 원 안, 적응형 바탕은 리벳 쇠판 그림(ic_launcher_background.png).

실행: python3 -I tools/android-res.py
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
RES = ROOT / 'android' / 'app' / 'src' / 'main' / 'res'
BG = (0x16, 0x14, 0x1C)
# 밀도 배율 (mdpi = 1) → 로고 정수배 = 반올림 (hdpi 1.5 → 2, D-538)
DPI = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}
ICON_DP = 78  # 108dp 캔버스 안 아이콘 정사각형 한 변


def splash() -> None:
    logo = Image.open(ROOT / 'public' / 'ui' / 'title-logo.png').convert('RGBA')
    for name, k in DPI.items():
        # D-538 (리뷰 #18): hdpi 1.5는 예전 내림(×1 = 118dp)이라 다른 밀도(177dp)보다 작았다 — 정수배 1 · 2가 177dp에서 똑같이 멀어
        # (118 · 236dp) 작아 보이지 않게 올림(×2). 다른 밀도는 그대로 정확히 177dp
        s = max(1, int(k + 0.5))
        out = logo.resize((logo.width * s, logo.height * s), Image.NEAREST)
        d = RES / f'drawable-{name}'
        d.mkdir(exist_ok=True)
        out.save(d / 'splash_logo.png', optimize=True)
        print(f'{d.name}/splash_logo.png  ×{s}  {out.size}')


ADAPTIVE = ('<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
            '    <background android:drawable="@mipmap/ic_launcher_background"/>\n'
            '    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n</adaptive-icon>\n')


def icon() -> None:
    """런처 아이콘 · 적응형 전경 · 바탕 (D-544): 받은 R-02 종이왕 · 리벳 쇠판을 밀도마다 정수배로 — tools/app_icon.py가 조합한다"""
    import sys
    sys.path.insert(0, str(ROOT / 'tools'))
    from app_icon import icon_android
    icon_android(RES)
    # 색 자원은 남겨 둔다(옛 참조 · 시작 화면) — 적응형 바탕은 이제 쇠판 그림
    (RES / 'values' / 'ic_launcher_background.xml').write_text(
        '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#16141C</color>\n</resources>\n')
    for nm in ('ic_launcher.xml', 'ic_launcher_round.xml'):
        (RES / 'mipmap-anydpi-v26' / nm).write_text(ADAPTIVE)


if __name__ == '__main__':
    splash()
    icon()
