"""
받은 아이콘 시트 → 게임 32도트 아이콘 (D-289 · D-290). 시트 정본: tools/pixel/icon_sheets.py
  python3 -I tools/pixel/icon_sheet_import.py <받은 그림> I-0N [--dry]
하는 일 (칸마다):
  ① 시트를 5×2로 나누고, 칸을 32×32 격자로 다시 도트화 — 격자 한 칸 가운데 60% 영역의 중앙값 색 (안티앨리어싱 · 압축 얼룩 제거)
  ② 마젠타(#FF00FF 근처) = 투명
  ③ 우리 팔레트(icon_sheets.PALETTE)에서 가장 가까운 색으로 맞춘다
  ④ 둘레 바깥선 보정: 물건 가장자리에 붙은 투명 칸 중 바깥선이 빠진 곳을 먹(#0B0B0E)으로 + 한 겹 더 둘러 2도트 (D-301)
  ⑤ tools/pixel/icons32_ext/<키>.png 에 보관 (icons32.py build가 손그림 위에 덮는다) · 원본 tools/pixel/icons32/<키>.png (32×32, 정중앙) — icons16.py export가 16칸 손그림 대신 이것을 쓴다 → public/ui/icons16/<키>.png
     작은 칸(16px)용 <키>@16.png도 함께 (2×2 → 많은 색, 바깥선 우선)
확인용: build-res/order/<시트>-check.png (지금 → 받은 것, 8배)
--dry 면 게임 그림은 쓰지 않고 확인용만.
"""
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
import icon_sheets  # noqa: E402

INK = (11, 11, 14)
PAL = [tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for _, cs in icon_sheets.PALETTE for h in cs]


def near(c):
    return min(PAL, key=lambda p: (p[0] - c[0]) ** 2 * 3 + (p[1] - c[1]) ** 2 * 4 + (p[2] - c[2]) ** 2 * 2)


def is_key(c):
    r, g, b = c[:3]
    return r > 170 and b > 170 and g < 110


N = 32


def cell16(im):
    """한 칸(아무 크기) → N×N RGBA (이름은 옛 16칸 시절 그대로)"""
    w, h = im.size
    out = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    for y in range(N):
        for x in range(N):
            x0, x1 = w * (x + 0.2) / N, w * (x + 0.8) / N
            y0, y1 = h * (y + 0.2) / N, h * (y + 0.8) / N
            px = [im.getpixel((int(xx), int(yy))) for yy in range(int(y0), max(int(y0) + 1, int(y1))) for xx in range(int(x0), max(int(x0) + 1, int(x1)))]
            keep = [p for p in px if not is_key(p)]
            if len(keep) < len(px) / 2:
                continue
            med = tuple(sorted(p[i] for p in keep)[len(keep) // 2] for i in range(3))
            out.putpixel((x, y), near(med) + (255,))
    # 바깥선 보정: 물건과 맞닿은 투명 칸 → 먹 (물건 가장자리가 먹이 아닐 때만)
    a = out.copy()
    for y in range(N):
        for x in range(N):
            if a.getpixel((x, y))[3]:
                continue
            nb = [a.getpixel((x + dx, y + dy)) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)) if 0 <= x + dx < N and 0 <= y + dy < N]
            if any(p[3] and p[:3] != INK for p in nb):
                out.putpixel((x, y), INK + (255,))
    return out


def small(icn):
    """32 → 16: 2×2 칸마다 — 먹이 하나라도 있으면 먹(바깥선이 끊기지 않게), 아니면 가장 많은 색, 빈 칸이 셋 이상이면 투명"""
    out = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    for y in range(16):
        for x in range(16):
            px = [icn.getpixel((2 * x + dx, 2 * y + dy)) for dx in (0, 1) for dy in (0, 1)]
            op = [p for p in px if p[3]]
            if len(op) < 2:
                continue
            if any(p[:3] == INK for p in op) and len(op) < 4:
                out.putpixel((x, y), INK + (255,))
                continue
            out.putpixel((x, y), max(op, key=op.count))
    return out


def centered(icn, scale=1):
    box = icn.getbbox()
    n = N * scale
    res = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    if not box:
        return res
    crop = icn.crop(box).resize(((box[2] - box[0]) * scale, (box[3] - box[1]) * scale), Image.NEAREST)
    res.paste(crop, ((n - crop.width) // 2, (n - crop.height) // 2), crop)
    return res


def thicken(icn):
    """바깥 먹선 한 겹 더 (받은 그림 1도트 → 2도트, D-291 · D-301). 32칸을 넘으면 줄이지 않고 가운데에서 자른다"""
    n = icn.width
    px = icn.load()
    filled = {(x, y) for y in range(n) for x in range(n) if px[x, y][3] > 0}
    ring = {(x + dx, y + dy) for x, y in filled for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))} - filled
    big = Image.new('RGBA', (n + 2, n + 2), (0, 0, 0, 0))
    big.alpha_composite(icn, (1, 1))
    bp = big.load()
    for x, y in ring:
        bp[x + 1, y + 1] = INK + (255,)
    box = big.getbbox()
    crop = big.crop(box)
    if crop.width > n or crop.height > n:
        l, tp = max(0, (crop.width - n) // 2), max(0, (crop.height - n) // 2)
        crop = crop.crop((l, tp, l + min(n, crop.width), tp + min(n, crop.height)))
    out = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    out.paste(crop, ((n - crop.width) // 2, (n - crop.height) // 2), crop)
    return out


def main(src, sid, dry=False):
    title, items = icon_sheets.SHEETS[sid]
    sheet = Image.open(src).convert('RGB')
    W, H = sheet.size
    chk = Image.new('RGB', (5 * 2 * 136, 2 * 136), (24, 23, 30))
    for i, (k, name, _) in enumerate(items):
        cx, cy = i % 5, i // 5
        rows = (len(items) + 4) // 5  # 5장짜리 시트는 한 줄 (I-11)
        # 칸은 늘 정사각 — 받은 시트 높이가 칸 수와 안 맞아도(한 줄 시트가 2000×667로 오는 등) 세로로 찌그러뜨리지 않는다 (D-306)
        cw = W / 5
        top = (H - cw * rows) / 2
        cell = sheet.crop((round(cw * cx), round(top + cw * cy), round(cw * (cx + 1)), round(top + cw * (cy + 1))))
        icn = cell16(cell)
        game = thicken(centered(icn))
        f = os.path.join(ROOT, 'public', 'ui', 'icons16', f'{k}.png')
        master = os.path.join(HERE, 'icons32', f'{k}.png')
        if os.path.exists(f):
            old = Image.open(f).convert('RGBA').resize((128, 128), Image.NEAREST)
            chk.paste(old, (cx * 272 + 4, cy * 136 + 4), old)
        new = game.resize((128, 128), Image.NEAREST)  # 32 → 4배
        chk.paste(new, (cx * 272 + 140, cy * 136 + 4), new)
        if not dry:
            os.makedirs(os.path.dirname(master), exist_ok=True)
            game.save(master)
            os.makedirs(os.path.join(HERE, 'icons32_ext'), exist_ok=True)
            game.save(os.path.join(HERE, 'icons32_ext', f'{k}.png'))  # icons32.py build가 손그림 위에 덮는다 (D-301)
            game.save(f)
            small(game).save(f.replace('.png', '@16.png'))
        print(f'{k:14} {name}')
    out = os.path.join(ROOT, 'build-res', 'order', f'{sid}-check.png')
    chk.save(out)
    print(out)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], '--dry' in sys.argv)
