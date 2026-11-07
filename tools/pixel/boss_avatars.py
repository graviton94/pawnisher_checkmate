"""
적 왕 말풍선 얼굴 (2026-11-05, 사용자: 「적 왕 대사에 받아 두었던 왕 픽셀아트 3종이나 초상화 일부를 잘라 쓰면?」).
반장 킹 픽셀 그림(PC-01~03, 1254px)은 격자가 고르지 않아 줄이면 뭉개졌다 → 반장 초상화(public/scenes/boss-*.png, 도트 장면)의
왕관 · 머리 부분을 원래 도트 크기 그대로(다시 늘이거나 줄이지 않고) 60×60으로 잘라 쓴다. 테 빛(주황 · 청록 · 흰 역광)이 살아 있어 작아도 읽힌다.
보통 대국의 적 왕은 기물 정본(검정 킹)을 같은 틀 안에 그린다 (main.ts taunt).
출력: public/ui/hud/avatar-{plate,spawn,thorns}.png
사용: python3 -I tools/pixel/boss_avatars.py
"""
import os

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
S = 60
# 반장 규칙 → (초상화, 왼쪽 위 x, y) — 왕관 십자가 가운데 오게 손으로 맞춘 칸
CROPS = {
    'plate': ('public/scenes/boss-plate.png', 72, 2),
    'spawn': ('public/scenes/boss-assembly.png', 53, 4),
    'thorns': ('public/scenes/boss-thorns.png', 82, 4),
}


def main():
    out = os.path.join(ROOT, 'public', 'ui', 'hud')
    for key, (rel, x, y) in CROPS.items():
        im = Image.open(os.path.join(ROOT, rel)).convert('RGB')
        im.crop((x, y, x + S, y + S)).save(os.path.join(out, f'avatar-{key}.png'))
    print('public/ui/hud/avatar-*.png', list(CROPS))


if __name__ == '__main__':
    main()
