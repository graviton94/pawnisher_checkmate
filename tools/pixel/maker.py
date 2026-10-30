"""
도트 메이커 (D-086): tools/pixel/pieces.txt 격자 → 배경 없는 PNG. 기물 그림은 전부 여기서 다시 찍을 수 있다.

  python3 -I tools/pixel/maker.py export              게임 그림 갱신 (public/pieces/s-*.png 5배 · l-*.png 8배)
  python3 -I tools/pixel/maker.py one N 1 8 out.png   기물 하나 (유형 · 진영 0흰/1흑 · 배율 · 파일), 배경 투명
  python3 -I tools/pixel/maker.py sheet out.png 6     전체 시트 (흰/흑 × 6종, 배율)
  유형에 이형을 붙이면 그 그림: N:hammer (pieces.txt에 [N:hammer] 블록이 있을 때)

규칙: 흰 바깥 테두리 1도트는 자동 (4방향), 캔버스는 18×18 도트, 가운데 정렬 · 받침 맨 아래 맞춤.
흑 진영은 같은 격자를 짙은 색으로 칠하고, 위·왼쪽이 외곽선에 닿은 몸 도트를 밝은 테로 (원본 흑 기물의 빛 테).
"""
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
CANVAS = 18

PALETTE = {
    0: {'K': (0x0B, 0x0B, 0x0E), 'W': (0xF1, 0xEE, 0xEC), 'S': (0xC5, 0xC3, 0xC3), 'G': (0x8A, 0x87, 0x94), 'E': (0x0B, 0x0B, 0x0E), 'O': (0xF4, 0xF1, 0xEA)},
    1: {'K': (0x0B, 0x0B, 0x0E), 'W': (0x32, 0x34, 0x3D), 'S': (0x26, 0x27, 0x2F), 'G': (0x1B, 0x1C, 0x22), 'E': (0x0B, 0x0B, 0x0E), 'O': (0xF4, 0xF1, 0xEA), 'H': (0x56, 0x58, 0x63)},
}


def load(path=os.path.join(HERE, 'pieces.txt')):
    """pieces.txt → {이름: [줄...]}"""
    out, cur = {}, None
    for raw in open(path, encoding='utf-8'):
        line = raw.rstrip('\n')
        if line.startswith('#') or not line.strip():
            continue
        if line.startswith('['):
            cur = line.strip()[1:-1]
            out[cur] = []
        elif cur:
            out[cur].append(line.strip())
    for k, rows in out.items():
        w = max(len(r) for r in rows)
        out[k] = [r.ljust(w, '.') for r in rows]
    return out


def render(grid, side, scale=1, outline=True, canvas=CANVAS, thin=True):
    """격자 하나를 그린다: 캔버스 가운데 · 바닥 맞춤, 흰 바깥 테두리, 배경 투명.
    thin: 배율 2 이상이면 흰 테두리를 도트 반 개 두께로 (원본 기물 그림의 가는 흰 테두리)"""
    if thin and scale >= 2:
        return render_thin(grid, side, scale, canvas)
    pal = PALETTE[side]
    h, w = len(grid), len(grid[0])
    ox = (canvas - w) // 2
    oy = canvas - 1 - h  # 맨 아래 1줄은 바깥 테두리 자리
    cells = {}
    for y, row in enumerate(grid):
        for x, ch in enumerate(row):
            if ch != '.':
                cells[(x + ox, y + oy)] = ch
    if side == 1:
        # 흑 진영의 빛 테: 위나 왼쪽이 외곽선/바깥인 몸 도트
        for (x, y), ch in list(cells.items()):
            if ch == 'W' and (cells.get((x, y - 1), '.') in 'K.' or cells.get((x - 1, y), '.') in 'K.'):
                cells[(x, y)] = 'H'
    img = Image.new('RGBA', (canvas, canvas), (0, 0, 0, 0))
    if outline:
        for (x, y) in list(cells):
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                p = (x + dx, y + dy)
                if p not in cells and 0 <= p[0] < canvas and 0 <= p[1] < canvas:
                    img.putpixel(p, pal['O'] + (255,))
    for (x, y), ch in cells.items():
        img.putpixel((x, y), pal[ch] + (255,))
    return img.resize((canvas * scale, canvas * scale), Image.NEAREST) if scale != 1 else img


def render_thin(grid, side, scale, canvas=CANVAS):
    """도트를 scale배로 찍고, 바깥에 scale/2 픽셀 두께 흰 테두리 (네모 팽창)"""
    base = render(grid, side, 1, outline=False, canvas=canvas, thin=False)
    big = base.resize((canvas * scale, canvas * scale), Image.NEAREST)
    r = max(1, round(scale * 0.5))
    a = big.getchannel('A')
    w, h = big.size
    src = a.load()
    mask = [[src[x, y] > 0 for x in range(w)] for y in range(h)]
    out = big.copy()
    o = out.load()
    white = PALETTE[side]['O'] + (255,)
    for y in range(h):
        for x in range(w):
            if mask[y][x]:
                continue
            near = False
            for dy in range(-r, r + 1):
                yy = y + dy
                if 0 <= yy < h:
                    row = mask[yy]
                    for dx in range(-r, r + 1):
                        xx = x + dx
                        if 0 <= xx < w and row[xx]:
                            near = True
                            break
                if near:
                    break
            if near:
                o[x, y] = white
    return out


def piece(name, side, scale=1):
    """유형(또는 유형:이형) · 진영 → 그림"""
    data = load()
    if name not in data:
        raise SystemExit(f'pieces.txt에 [{name}] 블록이 없습니다')
    return render(data[name], side, scale)


def export():
    """게임 그림을 다시 찍는다"""
    out = os.path.join(ROOT, 'public', 'pieces')
    for t in 'PNBRQK':
        for side in (0, 1):
            piece(t, side, 5).save(os.path.join(out, f's-{t}{side}.png'))
            piece(t, side, 8).save(os.path.join(out, f'l-{t}{side}.png'))
    print('public/pieces/s-*.png (90px) · l-*.png (144px) — 12종씩')


def sheet(path, scale=6):
    data = load()
    names = [n for n in data]
    im = Image.new('RGBA', (CANVAS * scale * len(names), CANVAS * scale * 2), (0, 0, 0, 0))
    for i, n in enumerate(names):
        for side in (0, 1):
            im.alpha_composite(render(data[n], side, scale), (i * CANVAS * scale, side * CANVAS * scale))
    im.save(path)
    print(path)


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'export'
    if cmd == 'export':
        export()
    elif cmd == 'one':
        _, _, name, side, scale, path = sys.argv
        piece(name, int(side), int(scale)).save(path)
        print(path)
    elif cmd == 'sheet':
        sheet(sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 6)
