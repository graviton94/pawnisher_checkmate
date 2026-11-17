"""「쓸 수 없음」 단추 임시 그림 (D-539 · 검수 H3, MM-01 받기 전까지).

받은 btn-*-off.png(32×20)는 진홍 녹 얼룩이 찍혀 있어 9-slice로 늘리면 얼룩이 줄줄이 반복되고,
진홍은 디자인 문법에서 「적 · 위험」이라 「쓸 수 없음」과 뜻이 겹친다. 새로 그리지 않고(D-386)
받은 보통 그림 btn-*-up.png의 모양(바깥선 · 모서리 · 면)을 그대로 두고 색만 MM-01 발주서의 팔레트로 바꿔 칠한다:
  - 먹 바깥선은 그대로
  - 면에서 가장 많은 색(몸) → 꺼진 몸 색 한 색
  - 몸보다 밝은 색(위 · 왼 변 빛) → 꺼진 빛 한 줄 색
  - 몸보다 어두운 색(아래 · 오른 변 그늘) → 몸 색 (볼록함이 사라져 판에 눌어붙은 느낌)
필터 · 그라데이션 없음, 원본 캔버스 그대로(정수 도트). 받은 off 그림은 지우지 않는다(MM-01이 오면 교체).

실행: python3 -I tools/pixel/btn_off_interim.py  → src/assets/ui/chrome/v2/choice-off0.png · hand-choice-off0.png
(D-544: 단추 넷 btn-*-off는 받은 MM-01로 바뀌었다 — tools/pixel/mm01_import.py. 여기서는 MM-01에 없는 선택지 · 손패 판만 찍는다.
 btn-*-off0을 다시 보려면 --buttons)
"""
from __future__ import annotations

import sys
from collections import Counter
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
DIR = ROOT / 'src/assets/ui/chrome/v2'
INK = (11, 11, 14)

# MM-01 발주서의 꺼짐 색: (몸, 빛 한 줄)
OFF = {
    'iron': ((0x33, 0x31, 0x3B), (0x56, 0x54, 0x5E)),
    'brass': ((0x8A, 0x64, 0x16), (0xC8, 0x9B, 0x3C)),
    'crimson': ((0x7A, 0x12, 0x18), (0x33, 0x31, 0x3B)),
    'teal': ((0x33, 0x31, 0x3B), (0x1F, 0x8A, 0x7A)),
}


def lum(c: tuple[int, int, int]) -> float:
    return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]


def recolor(kind: str, name: str) -> Image.Image:
    src = Image.open(DIR / name).convert('RGBA')
    w, h = src.size
    px = [src.getpixel((x, y)) for y in range(h) for x in range(w)]
    face = Counter(p[:3] for p in px if p[3] and lum(p[:3]) > lum(INK) + 12)
    body = face.most_common(1)[0][0]
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    dark, light = OFF[kind]
    for y in range(h):
        for x in range(w):
            r, g, b, a = src.getpixel((x, y))
            if not a:
                continue
            c = (r, g, b)
            if lum(c) <= lum(INK) + 12:
                out.putpixel((x, y), (*INK, 255))
            elif lum(c) > lum(body) + 4:
                out.putpixel((x, y), (*light, 255))
            else:
                out.putpixel((x, y), (*dark, 255))
    return out


RUST = {(0x7A, 0x12, 0x18), (0xE5, 0x26, 0x2F)}


def despeck(name: str) -> Image.Image:
    """손패 꺼짐 판(hand-choice-off)은 모양 · 색이 이미 꺼짐이다 — 진홍 녹 얼룩 칸만 이웃의 가장 많은 색으로 메운다"""
    src = Image.open(DIR / name).convert('RGBA')
    out = src.copy()
    w, h = src.size
    for y in range(h):
        for x in range(w):
            p = src.getpixel((x, y))
            if p[3] and p[:3] in RUST:
                near = Counter(src.getpixel((x + dx, y + dy)) for dx in (-1, 0, 1) for dy in (-1, 0, 1) if 0 <= x + dx < w and 0 <= y + dy < h and src.getpixel((x + dx, y + dy))[:3] not in RUST and src.getpixel((x + dx, y + dy))[3])
                if not near:
                    near = Counter(q for q in (src.getpixel((xx, y)) for xx in range(w)) if q[3] and q[:3] not in RUST)
                out.putpixel((x, y), near.most_common(1)[0][0])
    return out


def main() -> int:
    jobs = [(f'btn-{k}-up.png', f'btn-{k}-off0.png', k) for k in OFF] if '--buttons' in sys.argv else []
    # 선택지 판(choice-off)도 같은 얼룩 — 보통 판(choice-up)을 철 꺼짐 색으로 (황동 고리도 철로: 「쓸 수 없음」)
    jobs.append(('choice-up.png', 'choice-off0.png', 'iron'))
    jobs.append(('hand-choice-off.png', 'hand-choice-off0.png', ''))
    for src, out, kind in jobs:
        img = recolor(kind, src) if kind else despeck(src)
        dst = DIR / out
        img.save(dst)
        colors = sorted({img.getpixel((x, y))[:3] for x in range(img.width) for y in range(img.height) if img.getpixel((x, y))[3]})
        print(f'{dst.relative_to(ROOT)} {img.size} 색 {len(colors)}: {colors}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
