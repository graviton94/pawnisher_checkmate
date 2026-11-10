"""
맞물려 도는 톱니 한 쌍 (2026-11-05, 사용자: "나머지들 진행하자" — 움직이는 톱니 · animated-gears 레퍼런스 학습, 도트 복제 아님).
큰 톱니(이 10 · 홈 고리)와 작은 톱니(이 6)가 서로 반대로 돈다. 큰 톱니가 이 두 칸(72°) 도는 동안
작은 톱니는 이 두 칸(120°) — 이 수 비율과 같아 맞물림이 어긋나지 않고, 16장이 끝나면 첫 장과 같은 모양이라 끊김 없이 돈다.
빛은 회전과 상관없이 늘 왼쪽 위(칸 위치로 계산) — 도는 동안에도 명암이 제자리. 검정 바깥선 1도트, 황동 4단계.
출력: src/assets/ui/kit/gears-spin.png (16장 가로 띠, 한 장 44×30) · gears-mini.png (한 장 16×16) — CSS steps(16)으로 돌린다.
사용: python3 -I tools/pixel/gears_anim.py
"""
import math
import os

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
W, H, FRAMES = 44, 30, 16
K = (0x0B, 0x0B, 0x0E)
BRASS = {'hi': (0xF4, 0xD2, 0x7A), 'mid': (0xC8, 0x9B, 0x3C), 'lo': (0x8C, 0x62, 0x39), 'deep': (0x5A, 0x3C, 0x1E)}
IRON = {'hi': (0xC8, 0xC8, 0xC8), 'mid': (0x8A, 0x87, 0x94), 'lo': (0x56, 0x54, 0x5E), 'deep': (0x2F, 0x2E, 0x36)}


def gear_mask(cx, cy, r_root, r_tip, teeth, holes, r_hole_ring, r_hole, r_hub, ang):
    """칸마다 톱니 몸인지 (구멍 · 축 구멍은 비움)"""
    m = set()
    pitch = 2 * math.pi / teeth
    for y in range(H):
        for x in range(W):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            r = math.hypot(dx, dy)
            if r > r_tip:
                continue
            th = (math.atan2(dy, dx) - ang) % (2 * math.pi)
            ph = (th % pitch) / pitch
            if r > r_root and not (0.18 < ph < 0.62):
                continue
            if r < r_hub:
                continue
            ok = True
            for i in range(holes):
                ha = ang + (i + 0.5) * 2 * math.pi / holes
                hx, hy = cx + math.cos(ha) * r_hole_ring, cy + math.sin(ha) * r_hole_ring
                if math.hypot(x + 0.5 - hx, y + 0.5 - hy) < r_hole:
                    ok = False
                    break
            if ok:
                m.add((x, y))
    return m


def paint(im, mask, pal, owner, gid):
    for (x, y) in mask:
        if owner.get((x, y)) not in (None, gid):
            continue
        owner[(x, y)] = gid
        # 빛: 왼쪽 위가 비어 있으면 밝게, 오른쪽 아래가 비어 있으면 어둡게 (칸 기준 — 돌아도 빛은 제자리)
        tl = (x - 1, y) not in mask or (x, y - 1) not in mask
        br = (x + 1, y) not in mask or (x, y + 1) not in mask
        corner = (x - 1, y - 1) not in mask and tl
        c = pal['hi'] if (tl and not br) or corner else pal['lo'] if br and not tl else pal['mid']
        if br and (x + 1, y + 1) not in mask and not tl:
            c = pal['deep']
        im.putpixel((x, y), c + (255,))


# 크기 두 벌: big = 메뉴 장식(44×30), mini = 적 차례 표시(16×16 톱니 하나) — 둘 다 화면에서 1도트 = 2px
SIZES = {
    'big': dict(w=44, h=30, b=(14.5, 15, 10.0, 13.2, 10, 2.6), s=(33.0, 15.5, 5.6, 8.4, 6, 1.6), groove=(6.2, 7.3)),
    'mini': dict(w=16, h=16, b=(8, 8, 5.0, 7.4, 8, 1.7), s=None, groove=None),  # 작은 자리엔 톱니 하나 — 맞물린 쌍은 뭉개진다
}


def frame(f, size='big'):
    global W, H
    z = SIZES[size]
    W, H = z['w'], z['h']
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    t = f / FRAMES
    bx, by, br0, br1, bn, bh = z['b']
    big = gear_mask(bx, by, br0, br1, bn, 0, 0, 0, bh, t * 2 * 2 * math.pi / bn)
    # 작은 톱니: 반대로, 반 칸 어긋나게 시작해 이가 서로 사이에 낀다 (축 구멍만 — 작은 그림은 단순하게)
    small = set()
    if z['s']:
        sx, sy, sr0, sr1, sn, sh = z['s']
        small = gear_mask(sx, sy, sr0, sr1, sn, 0, 0, 0, sh, -t * 2 * 2 * math.pi / sn + math.pi / sn)
    owner = {}
    paint(im, small, IRON, owner, 's')
    paint(im, big, BRASS, owner, 'b')
    # 큰 톱니 몸의 홈 고리 (돌아도 모양이 같다 — 회전은 이가 말한다): 위 반은 그늘, 아래 반은 빛 (오목한 홈)
    for (x, y) in (big if z['groove'] else ()):
        r = math.hypot(x + 0.5 - bx, y + 0.5 - by)
        if z['groove'][0] <= r < z['groove'][1]:
            im.putpixel((x, y), (BRASS['lo'] if y + 0.5 < by else BRASS['hi']) + (255,))
    # 바깥선: 빈 칸 중 몸에 닿은 칸 (구멍 속도 검정)
    body = set(owner)
    for y in range(H):
        for x in range(W):
            if (x, y) in body:
                continue
            if any((x + dx, y + dy) in body for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                im.putpixel((x, y), K + (255,))
    # 두 톱니가 맞닿는 곳에도 검은 선 (작은 톱니 칸 중 큰 톱니에 닿은 곳)
    for (x, y), g in owner.items():
        if g == 's' and any(owner.get((x + dx, y + dy)) == 'b' for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
            im.putpixel((x, y), K + (255,))
    return im


def main():
    for size, name in (('big', 'gears-spin.png'), ('mini', 'gears-mini.png')):
        z = SIZES[size]
        strip = Image.new('RGBA', (z['w'] * FRAMES, z['h']), (0, 0, 0, 0))
        for f in range(FRAMES):
            strip.paste(frame(f, size), (f * z['w'], 0))
        out = os.path.join(ROOT, 'src', 'assets', 'ui', 'kit', name)
        strip.save(out)
        print(out, strip.size)


if __name__ == '__main__':
    main()
