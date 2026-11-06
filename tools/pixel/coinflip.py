"""
동전 회전 프레임 (D-257, 사용자: 「4장이 제대로 회전이 아닌데」).
ICON-01의 앞면 · 옆면 · 뒷면(32칸)으로 세로축 한 바퀴를 12장(30°마다)으로 다시 찍는다:
  면 = 앞/뒷면을 가로로 cos θ만큼 좁힌 것(최근접 표본), 테 = 면 실루엣을 sin θ만큼 옆으로 밀어낸 자리(색은 옆면 그림의 열),
  90° · 270° = 옆면 그림 그대로. 테는 면이 돌아 나가는 쪽에 보이고, 옆면을 지나면 반대쪽으로 옮긴다. 마지막에 1칸 테두리.
출력: public/ui/props/flip-0..11.png (34×32), 확인용 build-res/coinflip-preview.png
사용: python3 -I tools/pixel/coinflip.py
"""
import math
import os

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
P = os.path.join(ROOT, 'public', 'ui', 'props')
OL = (22, 20, 28, 255)
N, W, H = 12, 40, 32
RIM = 8  # 옆으로 가장 많이 보일 때 테 두께(칸)


def load(n):
    return Image.open(os.path.join(P, f'ic32-coin-{n}.png')).convert('RGBA')


def is_ol(c):
    return c[3] and c[:3] == OL[:3]


def frame(k, front, back, edge):
    deg = k * 360 / N
    out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    o = out.load()
    if deg % 180 == 90:
        e = edge if deg == 90 else edge.transpose(Image.FLIP_LEFT_RIGHT)
        out.alpha_composite(e, ((W - 32) // 2, 0))
        return out
    th = math.radians(deg)
    face = front if math.cos(th) > 0 else back
    fw = max(4, round(30 * abs(math.cos(th))) // 2 * 2)  # 테두리 빼고 30칸 몸통을 좁힌다
    r = round(RIM * abs(math.sin(th)))
    side = 1 if (deg % 180) < 90 else -1  # 테가 보이는 쪽: 오른쪽(1) · 왼쪽(-1)
    fp, ep = face.load(), edge.load()
    # 앞/뒷면 몸통(바깥 1칸 테두리 뺀 1..30)을 fw칸으로
    body = [[None] * fw for _ in range(H)]
    for y in range(H):
        for x in range(fw):
            sx = 1 + int((x + 0.5) * 30 / fw)
            c = fp[sx, y]
            body[y][x] = c if c[3] else None
    x0 = (W - fw - r) // 2 + (r if side < 0 else 0)
    # 테: 몸통 실루엣을 side 쪽으로 1..r칸 밀어낸 자리, 색은 옆면 그림 가운데 띠의 열
    ecols = [c for c in range(32) if any(ep[c, y][3] and not is_ol(ep[c, y]) for y in range(H))]
    for d in range(r, 0, -1):
        ec = ecols[min(len(ecols) - 1, int((d - 0.5) / max(1, r) * len(ecols)))] if ecols else 16
        for y in range(H):
            for x in range(fw):
                if body[y][x] is None:
                    continue
                tx = x0 + x + side * d
                if 0 <= tx < W:
                    c = ep[ec, y]
                    o[tx, y] = c if c[3] and not is_ol(c) else (154, 106, 20, 255)
    for y in range(H):
        for x in range(fw):
            if body[y][x] is not None:
                o[x0 + x, y] = body[y][x]
    # 바깥 1칸 테두리
    src = out.copy().load()
    for y in range(H):
        for x in range(W):
            if src[x, y][3]:
                continue
            if any(0 <= x + dx < W and 0 <= y + dy < H and src[x + dx, y + dy][3] and not is_ol(src[x + dx, y + dy]) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                o[x, y] = OL
    return out


def main():
    front, back, edge = load('front'), load('back'), load('edge')
    sheet = Image.new('RGBA', (N * (W * 4 + 8) + 8, H * 4 + 16), (40, 40, 50, 255))
    for k in range(N):
        f = frame(k, front, back, edge)
        f.save(os.path.join(P, f'flip-{k}.png'))
        sheet.alpha_composite(f.resize((W * 4, H * 4), Image.NEAREST), (8 + k * (W * 4 + 8), 8))
    sheet.save(os.path.join(ROOT, 'build-res', 'coinflip-preview.png'))
    print('ok')


if __name__ == '__main__':
    main()
