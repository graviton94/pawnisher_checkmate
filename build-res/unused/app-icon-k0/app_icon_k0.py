#!/usr/bin/env python3
"""앱 아이콘 (D-547 — 종이왕은 게임 정본 K0 하나로 통일. D-544는 받은 R-02 전경 · 작은 크기만 m-K0이라 두 종이왕이 섞였다).

- 종이왕: 게임 정본 K0(`tools/pixel/pieces64.txt` [K 0] — paperking.py가 만든 72칸, 게임의 흰 킹 그림 s-K0 · l-K0과 같은 격자)을
  maker.py로 그대로 찍어 보이는 부분(55×69도트)만 잘라 쓴다. 받은 R-02 전경 `build-res/icon-src/fg.png`는 기록으로만 둔다 — 쓰지 않는다.
- 바탕: 받은 R-02 리벳 쇠판 `build-res/icon-src/bg.png`(67×67도트, 1도트 = 1px로 이미 격자 복원됨)를 9-slice
  (귀퉁이 8도트 = 테 1 + 리벳 창)로 아이콘 크기만큼 짠다. 쇠판 도트 배율 = 종이왕 도트 배율.
- 배율: 1도트 = 정수 픽셀(최근접). 늘리거나 찌그러뜨리지 않는다(D-386). 크기마다 쇠판 테(2도트) · 리벳 칸(8도트 귀퉁이)에
  닿지 않는 가장 큰 정수배를 고른다 — 아이콘을 꽉 채운다.
- 작은 크기(K0 69도트가 1배로도 안 드는 64 · 32 · 16px 파비콘 · 48 · 72px 런처 · mdpi 적응형): 섞거나 줄이지 않고
  기물의 작은 판 길(maker.mini — 64칸 정본을 n칸으로 다수결 표본 + 외곽선 · 흰 테 다시 두름, m-K0 = mini(K0, 25)와 같은 길)로
  그 크기에 드는 가장 큰 K0 작은 판을 1배로 찍는다. 40도트보다 작은 쇠판은 리벳 없이 테만.
- 둥근 런처(API 25 이하): 계단 원 마스크 · 리벳 없는 쇠판, 그림의 모든 칸이 원 안(테 2도트 안쪽).
- 안드로이드 적응형: 전경 = 바탕 투명, 108dp 캔버스 가운데 지름 66dp 안전 원 안에 그림의 모든 칸이 든다(원 · 스쿼클 · 둥근 사각 마스크에 왕관이 잘리지 않게).
  적응형 바탕 = 같은 쇠판 9-slice 그림(ic_launcher_background.png).

실행: python3 -I tools/app_icon.py   (안드로이드 밀도별 파일은 tools/android-res.py가 이 모듈의 icon_android()를 부른다)
      python3 -I tools/app_icon.py sheet <out.png>   모든 크기 + 적응형 마스크 미리보기 한 장
"""
import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'build-res' / 'icon-src'
sys.path.insert(0, str(ROOT / 'tools' / 'pixel'))
import maker  # noqa: E402  게임 기물 정본 (pieces64.txt)

CORNER = 8   # 바탕 9-slice 귀퉁이 (테 1 + 리벳 창 3 ~ 7)
EDGE = 2     # 그림이 비켜야 하는 테 두께 (테 1 + 틈 1)
RIVETS_MIN = 40  # 이보다 작은 쇠판(도트)은 리벳 없이 테만 — 16 · 32px 파비콘에서 리벳이 그림을 다 덮는다

PLATE = Image.open(SRC / 'bg.png').convert('RGBA')  # 67×67도트


def _crop(im: Image.Image) -> Image.Image:
    return im.crop(im.getbbox())


K0_GRID = maker.pad72(maker.load64()[('K', 0)])
K0 = _crop(maker.piece('K', 0, 1))  # 55×69도트 — 게임 흰 킹(s-K0 = 이것 ×2)과 같은 그림
_MINI: dict[int, Image.Image] = {}


def mini(n: int) -> Image.Image:
    """K0 작은 판 n칸 (maker.mini, 보이는 부분만) — n = 25가 public/pieces/m-K0.png와 같다"""
    if n not in _MINI:
        _MINI[n] = _crop(maker.mini(K0_GRID, 0, n))
    return _MINI[n]


def plate(n: int, rivets: bool = True) -> Image.Image:
    """n×n도트 쇠판: 받은 바탕의 귀퉁이 칸은 그대로, 변 · 가운데는 받은 판의 한 줄을 이어 붙인다 (단색 면이라 반복해도 같다).
    rivets=False면 귀퉁이를 테 1칸만 가져온다(리벳 없음)"""
    c, s = (CORNER if rivets else 1), PLATE.width
    out = Image.new('RGBA', (n, n))
    mid = s // 2
    for y in range(n):
        sy = y if y < c else (s - (n - y) if y >= n - c else mid)
        for x in range(n):
            sx = x if x < c else (s - (n - x) if x >= n - c else mid)
            out.putpixel((x, y), PLATE.getpixel((sx, sy)))
    return out


def _zone(n: int, rivets: bool) -> Image.Image:
    """그림이 덮으면 안 되는 쇠판 칸 (테 EDGE도트 · 리벳 귀퉁이 CORNER도트) — 255 = 금지"""
    z = Image.new('L', (n, n), 0)
    d = ImageDraw.Draw(z)
    for i in range(EDGE if rivets else 1):  # 리벳 없는 작은 쇠판은 테 1칸만 비킨다 (16 · 32px에 한 칸이라도 더)
        d.rectangle((i, i, n - 1 - i, n - 1 - i), outline=255)
    if rivets:
        for x0 in (0, n - CORNER):
            for y0 in (0, n - CORNER):
                d.rectangle((x0, y0, x0 + CORNER - 1, y0 + CORNER - 1), fill=255)
    return z


def _scaled(im: Image.Image, k: int, size: int) -> Image.Image:
    """도트 그림 n×n을 k배 → 가운데 size×size로 자름"""
    big = im.resize((im.width * k, im.height * k), Image.NEAREST)
    off = (big.width - size) // 2
    return big.crop((off, off, off + size, off + size))


def _hits(art: Image.Image, pos: tuple[int, int], forbid: Image.Image) -> bool:
    """그림의 불투명 칸이 금지 칸에 닿는가 (캔버스 밖도 금지)"""
    x0, y0 = pos
    if x0 < 0 or y0 < 0 or x0 + art.width > forbid.width or y0 + art.height > forbid.height:
        return True
    a = art.getchannel('A').point(lambda v: 255 if v else 0)
    f = forbid.crop((x0, y0, x0 + art.width, y0 + art.height))
    return bool(Image.composite(f, Image.new('L', f.size, 0), a).getbbox())


def _place(size: int, forbid_for) -> tuple[Image.Image, int, str]:
    """금지 칸을 피하는 가장 큰 종이왕: K0 ×k(큰 것부터) → 안 들면 K0 작은 판 1배(큰 n부터).
    forbid_for(k) = 도트 배율 k일 때의 size×size 금지 마스크. 반환 (그림, 도트 배율, 설명)"""
    for k in range(size // K0.height, 0, -1):
        art = K0.resize((K0.width * k, K0.height * k), Image.NEAREST)
        if not _hits(art, ((size - art.width) // 2, (size - art.height) // 2), forbid_for(k)):
            return art, k, f'K0 ×{k}'
    for n in range(71, 7, -1):
        art = mini(n)
        if art.height <= size and not _hits(art, ((size - art.width) // 2, (size - art.height) // 2), forbid_for(1)):
            return art, 1, f'K0 작은 판 {n}칸({art.width}×{art.height})'
    raise SystemExit(f'{size}px: 종이왕이 들어갈 자리가 없다')


def compose(size: int, round_mask: bool = False) -> tuple[Image.Image, str]:
    """size px 정사각(또는 둥근) 아이콘: 쇠판 + 가운데 종이왕 (같은 도트 배율)"""
    def plate_at(k: int) -> tuple[int, bool]:
        n = math.ceil(size / k)
        return n, (n >= RIVETS_MIN and not round_mask)

    def forbid_for(k: int) -> Image.Image:
        n, rv = plate_at(k)
        z = _scaled(_zone(n, rv), k, size)
        if round_mask:  # 원 밖 + 원 테 EDGE도트
            r = size / 2 - EDGE * k
            c = Image.new('L', (size, size), 255)
            ImageDraw.Draw(c).ellipse((size / 2 - r, size / 2 - r, size / 2 + r - 1, size / 2 + r - 1), fill=0)
            z = Image.composite(c, z, c)
        return z

    art, k, what = _place(size, forbid_for)
    n, rv = plate_at(k)
    canvas = _scaled(plate(n, rv), k, size)
    if round_mask:  # 계단 원 (안티앨리어싱 없음)
        mask = Image.new('L', (size, size), 0)
        ImageDraw.Draw(mask).ellipse((0, 0, size - 1, size - 1), fill=255)
        canvas.putalpha(mask)
    canvas.alpha_composite(art, ((size - art.width) // 2, (size - art.height) // 2))
    return canvas, what


def safe_fg(w: int, radius: float) -> tuple[Image.Image, int, str]:
    """적응형 전경 w px: 그림의 모든 불투명 칸이 가운데 반지름 radius px 원 안에 드는 가장 큰 종이왕. 반환 (그림, 바탕 쇠판 도트 배율, 설명)"""
    def forbid_for(_k: int) -> Image.Image:
        z = Image.new('L', (w, w), 255)
        ImageDraw.Draw(z).ellipse((w / 2 - radius, w / 2 - radius, w / 2 + radius - 1, w / 2 + radius - 1), fill=0)
        return z

    art, k, what = _place(w, forbid_for)
    can = Image.new('RGBA', (w, w), (0, 0, 0, 0))
    can.alpha_composite(art, ((w - art.width) // 2, (w - art.height) // 2))
    return can, k, what


WEB = {
    'build-res/icon.png': 1024,       # 일렉트론
    'public/icon-512.png': 512,
    'public/icon-192.png': 192,
    'public/apple-touch-icon.png': 180,
    'public/favicon.png': 64,
    'public/favicon-32.png': 32,
    'public/favicon-16.png': 16,
}


def icon_web() -> None:
    """웹 · 일렉트론 · 애플 터치 아이콘 · 파비콘"""
    for rel, s in WEB.items():
        im, what = compose(s)
        im.convert('RGB').save(ROOT / rel, optimize=True)
        print(f'{rel}  {s}px  {what}')


DPI = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}


def android_set(k: float) -> dict[str, tuple[Image.Image, str]]:
    """밀도 배율 k의 런처 아이콘 넷: 옛 정사각 · 둥근 · 적응형 전경 · 바탕"""
    s = round(48 * k)
    sq, w1 = compose(s)
    rd, w2 = compose(s, round_mask=True)
    w = round(108 * k)
    fg, fk, w3 = safe_fg(w, 33 * k)
    n = math.ceil(w / fk)
    bg = _scaled(plate(n), fk, w)
    return {'ic_launcher.png': (sq.convert('RGB'), w1), 'ic_launcher_round.png': (rd, w2),
            'ic_launcher_foreground.png': (fg, w3), 'ic_launcher_background.png': (bg.convert('RGB'), f'쇠판 ×{fk}')}


def icon_android(res: Path) -> None:
    """안드로이드 런처 아이콘: 옛 정사각 · 둥근(API 25 이하) + 적응형 전경(안전 원 지름 66dp 안) · 바탕(쇠판)"""
    for name, k in DPI.items():
        d = res / f'mipmap-{name}'
        files = android_set(k)
        for fn, (im, _) in files.items():
            im.save(d / fn, optimize=True)
        print(f'{d.name}: ' + ' · '.join(f'{fn[12:-4] or "launcher"} {w}' for fn, (_, w) in files.items()))


def _masks(w: int) -> dict[str, Image.Image]:
    """적응형 아이콘 미리보기 마스크 (가운데 72dp 보이는 칸, w = 72dp px)"""
    out = {}
    c = Image.new('L', (w, w), 0)
    ImageDraw.Draw(c).ellipse((0, 0, w - 1, w - 1), fill=255)
    out['circle'] = c
    q = Image.new('L', (w, w), 0)
    for y in range(w):
        for x in range(w):
            u, v = (2 * x + 1) / w - 1, (2 * y + 1) / w - 1
            if abs(u) ** 4 + abs(v) ** 4 <= 1:
                q.putpixel((x, y), 255)
    out['squircle'] = q
    r = Image.new('L', (w, w), 0)
    ImageDraw.Draw(r).rounded_rectangle((0, 0, w - 1, w - 1), radius=round(w * 0.16), fill=255)
    out['rounded'] = r
    return out


def sheet(path: str) -> None:
    """모든 크기를 실제 픽셀 그대로(1:1) 나란히 + 작은 것은 확대본, 안드로이드 적응형 마스크 미리보기 + 게임 흰 킹(s-K0) 대조"""
    pad, bgc = 16, (0x3A, 0x36, 0x44, 255)
    tiles: list[tuple[Image.Image, str]] = []
    game = Image.open(ROOT / 'public' / 'pieces' / 's-K0.png').convert('RGBA')
    tiles.append((game, 'game s-K0 (1:1)'))
    for rel, s in WEB.items():
        im = Image.open(ROOT / rel).convert('RGBA')
        tiles.append((im, f'{s}' if s >= 180 else f'{s} (1:1)'))
        if s < 180:
            tiles.append((im.resize((s * (192 // s), s * (192 // s)), Image.NEAREST), f'{s} x{192 // s}'))
    rows = [tiles]
    for name, k in DPI.items():
        files = android_set(k)
        row = [(files['ic_launcher.png'][0].convert('RGBA'), f'{name} {round(48 * k)}'),
               (files['ic_launcher_round.png'][0], 'round')]
        w, v = round(108 * k), round(72 * k)
        full = files['ic_launcher_background.png'][0].convert('RGBA')
        full.alpha_composite(files['ic_launcher_foreground.png'][0])
        dbg = full.copy()
        ImageDraw.Draw(dbg).ellipse((w / 2 - 33 * k, w / 2 - 33 * k, w / 2 + 33 * k, w / 2 + 33 * k), outline=(255, 64, 64, 255))
        ImageDraw.Draw(dbg).rectangle(((w - v) // 2, (w - v) // 2, (w + v) // 2, (w + v) // 2), outline=(64, 200, 255, 255))
        row.append((dbg, f'108dp safe66'))
        vis = full.crop(((w - v) // 2, (w - v) // 2, (w - v) // 2 + v, (w - v) // 2 + v))
        for mn, m in _masks(v).items():
            t = Image.new('RGBA', (v, v), (0, 0, 0, 0))
            t.paste(vis, (0, 0), m)
            row.append((t, mn))
        rows.append(row)
    W = max(sum(t.width + pad for t, _ in r) for r in rows) + pad
    H = sum(max(t.height for t, _ in r) + pad + 14 for r in rows) + pad
    out = Image.new('RGBA', (W, H), bgc)
    d = ImageDraw.Draw(out)
    y = pad
    for r in rows:
        x = pad
        for t, label in r:
            out.alpha_composite(t, (x, y))
            d.text((x, y + max(tt.height for tt, _ in r) + 2), label, fill=(230, 226, 220, 255))
            x += t.width + pad
        y += max(t.height for t, _ in r) + pad + 14
    out.save(path)
    print(path, out.size)


if __name__ == '__main__':
    if len(sys.argv) > 2 and sys.argv[1] == 'sheet':
        sheet(sys.argv[2])
    else:
        icon_web()
