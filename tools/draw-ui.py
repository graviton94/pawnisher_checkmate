"""
화면 UI 부품 도트를 직접 찍는다 (D-085, D-044 코드로 직접 찍기). 1도트 = 1px, 화면에서 정수배 확대 (CSS border-image 9-slice).
판 밖 화면(메뉴·지도·고물상·전투 레일)이 같은 재질 언어를 쓰게 한다: 리벳 박은 철판 · 황동 레버 · 붉은 경고판.

출력: src/assets/ui/chrome/*.png  (CSS에서 상대 경로로 쓰므로 src/assets — APK·Electron에서도 깨지지 않는다)
  btn-{iron,brass,crimson,cyan}.png · btn-*-down.png   12×12, 9-slice 4 — 버튼 (위 빛 · 아래 두꺼운 그늘 = 눌리는 깊이)
  panel.png  16×16, 9-slice 5 — 리벳 4개 철판 패널
  plate.png  16×16, 9-slice 5 — 황동 이름판 (제목 띠)
  tape.png   12×12, 9-slice 4 — 명령 테이프 (구멍 뚫린 종이 띠)
  inset.png  8×8, 9-slice 3  — 움푹 들어간 칸 (목록·슬롯)
사용: python3 -I tools/draw-ui.py
"""
import os

from PIL import Image

OUT = 'src/assets/ui/chrome'
P = {
    'K': (0x0B, 0x0B, 0x0E), 'I': (0x16, 0x14, 0x1C), 'D': (0x2F, 0x2E, 0x36), 'M': (0x3D, 0x3A, 0x46), 'L': (0x56, 0x54, 0x5E),
    'G': (0x8A, 0x87, 0x94), 'H': (0xC8, 0xC8, 0xC8), 'W': (0xF4, 0xF1, 0xEA),
    'b': (0x6B, 0x4C, 0x12), 'B': (0x8C, 0x62, 0x39), 'y': (0xC8, 0x9B, 0x3C), 'Y': (0xE8, 0xC0, 0x60), 'O': (0xFA, 0xCC, 0x15),
    'r': (0x4A, 0x0C, 0x10), 'R2': (0x7A, 0x12, 0x18), 'R': (0xB8, 0x1E, 0x26), 'Rh': (0xE5, 0x26, 0x2F),
    'c': (0x10, 0x3A, 0x50), 'C2': (0x1E, 0x6E, 0x94), 'C': (0x38, 0xBD, 0xF8), 'Ch': (0xBF, 0xEF, 0xFF),
    'p': (0xC9, 0xB8, 0x92), 'P': (0xE6, 0xD6, 0xB4), 'q': (0x9A, 0x86, 0x5E),
}


def new(w, h):
    return Image.new('RGBA', (w, h), (0, 0, 0, 0))


def px(im, x, y, c):
    if 0 <= x < im.width and 0 <= y < im.height:
        im.putpixel((x, y), P[c] + (255,))


def rect(im, x0, y0, x1, y1, c):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            px(im, x, y, c)


def button(face, hi, lo, deep, down=False):
    """12×12 버튼: 검정 외곽 1 · 위 빛 1 · 면 · 아래 그늘 1 + 깊이 2 (눌리면 깊이 0, 면이 2 내려간다)"""
    im = new(12, 12)
    top = 2 if down else 0
    rect(im, 0, top, 11, 11, 'K')
    bottom = 11 if down else 9
    rect(im, 1, top + 1, 10, bottom - 1, face)
    rect(im, 1, top + 1, 10, top + 1, hi)  # 위 빛
    rect(im, 1, top + 1, 1, bottom - 1, hi)  # 왼쪽 빛
    rect(im, 1, bottom - 1, 10, bottom - 1, lo)  # 아래 그늘
    rect(im, 10, top + 2, 10, bottom - 1, lo)  # 오른쪽 그늘
    if not down:
        rect(im, 1, 10, 10, 10, deep)  # 깊이
    # 모서리 따기 (도트 둥근 맛)
    for (x, y) in [(0, top), (11, top), (0, 11), (11, 11)]:
        im.putpixel((x, y), (0, 0, 0, 0))
    return im


def panel():
    """16×16 철판: 검정 외곽 · 위왼 빛 · 아래오른 그늘 · 리벳 4"""
    im = new(16, 16)
    rect(im, 0, 0, 15, 15, 'K')
    rect(im, 1, 1, 14, 14, 'D')
    rect(im, 1, 1, 14, 1, 'L')
    rect(im, 1, 1, 1, 14, 'L')
    rect(im, 1, 14, 14, 14, 'I')
    rect(im, 14, 2, 14, 14, 'I')
    for (x, y) in [(3, 3), (12, 3), (3, 12), (12, 12)]:
        px(im, x, y, 'G')
        px(im, x + 1, y + 1, 'I')
    return im


def plate():
    """16×16 황동 이름판: 검정 외곽 · 밝은 황동 위 · 어두운 아래 · 리벳 2 (좌우 가운데)"""
    im = new(16, 16)
    rect(im, 0, 0, 15, 15, 'K')
    rect(im, 1, 1, 14, 14, 'y')
    rect(im, 1, 1, 14, 1, 'Y')
    rect(im, 1, 1, 1, 14, 'Y')
    rect(im, 1, 14, 14, 14, 'B')
    rect(im, 14, 2, 14, 14, 'B')
    for x in (3, 12):
        px(im, x, 7, 'b')
        px(im, x, 8, 'B')
    return im


def tape():
    """12×12 명령 테이프: 누런 종이 띠, 왼쪽에 펀치 구멍 줄"""
    im = new(12, 12)
    rect(im, 0, 0, 11, 11, 'K')
    rect(im, 1, 1, 10, 10, 'P')
    rect(im, 1, 10, 10, 10, 'p')
    rect(im, 10, 1, 10, 10, 'p')
    for y in (3, 7):
        px(im, 2, y, 'q')
    return im


def inset():
    """8×8 움푹한 칸: 위왼 그늘 · 아래오른 빛 (패널 안 목록 칸)"""
    im = new(8, 8)
    rect(im, 0, 0, 7, 7, 'I')
    rect(im, 1, 1, 6, 6, 'M')
    rect(im, 0, 0, 7, 0, 'K')
    rect(im, 0, 0, 0, 7, 'K')
    rect(im, 1, 7, 7, 7, 'L')
    rect(im, 7, 1, 7, 7, 'L')
    return im


os.makedirs(OUT, exist_ok=True)
TINTS = {
    'iron': ('M', 'L', 'D', 'I'),
    'brass': ('y', 'Y', 'B', 'b'),
    'crimson': ('R', 'Rh', 'R2', 'r'),
    'cyan': ('C2', 'C', 'c', 'K'),
}
for name, (face, hi, lo, deep) in TINTS.items():
    button(face, hi, lo, deep).save(f'{OUT}/btn-{name}.png')
    button(face, hi, lo, deep, down=True).save(f'{OUT}/btn-{name}-down.png')
panel().save(f'{OUT}/panel.png')
plate().save(f'{OUT}/plate.png')
tape().save(f'{OUT}/tape.png')
inset().save(f'{OUT}/inset.png')
print('ok')
