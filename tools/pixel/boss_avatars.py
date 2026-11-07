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
# 반장 규칙 → (초상화, 왕관 십자가 가운데 x) — 위에서부터 초상 폭 절반 정사각(상반신)을 60칸으로 (D-308, 사용자: 「대사창 얼굴은 각 초상의 상반신」)
CROPS = {
    'plate': ('boss-plate', 102), 'spawn': ('boss-assembly', 83), 'thorns': ('boss-thorns', 112),
    'inspect': ('boss-inspector', 109), 'magnet': ('boss-magnet', 147), 'alarm': ('boss-alarm', 172), 'gilded': ('boss-gilded', 128),
}


def main():
    out = os.path.join(ROOT, 'public', 'ui', 'hud')
    for key, (name, cx) in CROPS.items():
        im = Image.open(os.path.join(ROOT, 'public', 'scenes', f'{name}.png')).convert('RGB')
        s = round(im.width * 0.5)
        x = max(0, min(im.width - s, cx - s // 2))
        im.crop((x, 0, x + s, s)).resize((S, S), Image.BOX).save(os.path.join(out, f'avatar-{key}.png'))
    print('public/ui/hud/avatar-*.png', list(CROPS))


if __name__ == '__main__':
    main()
