"""
32도트 아이콘 그리개 (D-291, 사용자: 「생성 모델 수준이 답이 없다 — 레퍼런스 픽셀아트에 영감 받아 Claude가 직접 32×32로」).

그리는 법 (tools/pixel/icons32_src/I-0N.py):
    NEW = {
      '키': {
        'pal': {'a': 'iron2', 'b': 'iron4', 'h': 'paper6', ...},   # 글자 → 견본 이름 (아래 SWATCH)
        'rows': [32줄 × 32글자],                                    # '.' = 빈칸, 맨 바깥 1칸은 비워 둔다
      },
    }
- 명암은 그리는 사람이 직접 칠한다 (32칸은 자동 명암이 밋밋하다): 재질마다 견본 0(가장 어둠) ~ 6(가장 밝음) 중 4 ~ 5단계.
- 바깥선은 그리개가 두른다: 그림 둘레에 먹 #0B0B0E 두 겹(OUTLINE = 2, D-291). 그림은 가운데 28칸 안쪽에 두면 먹선이 잘리지 않는다. 직접 'ink'를 칠해도 된다(안쪽 선 · 구멍).
- 색은 SWATCH에서만 — 우리 재질 램프(pxkit M) + 나무 · 보라 · 금 · 구리 · 하늘.
사용:
    python3 -I tools/pixel/icons32.py preview I-01 <out.png>   지금 → 새 그림 (4배 · 2배 · 1배 · 16px 축소)
    python3 -I tools/pixel/icons32.py build                     icons32_src 전부 → tools/pixel/icons32/<키>.png (게임 export가 이것을 쓴다)
"""
import os
import runpy
import sys

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
SRC = os.path.join(HERE, 'icons32_src')
OUT = os.path.join(HERE, 'icons32')
N = 32

RAMPS = {
    # src/view/pxkit.ts M와 같다 (어두움 → 밝음 7단)
    'iron': ['#14131a', '#1f1e27', '#2c2d38', '#41434f', '#5d606d', '#868a98', '#b9bdc8'],
    'brass': ['#2b1a06', '#5a3a0e', '#8a5a14', '#b98424', '#d9a838', '#f4d27a', '#fff1c0'],
    'molten': ['#3a0c06', '#7a1c08', '#c23a0c', '#ec6a1a', '#f8a03a', '#ffd27a', '#fff6d8'],
    'paper': ['#3a3328', '#6e6452', '#a39a84', '#cfc6ae', '#e8e0cc', '#f4f1ea', '#ffffff'],
    'rust': ['#24110b', '#4a2112', '#74361a', '#9a4c22', '#c06a30', '#e0904a', '#f4b47a'],
    'crimson': ['#2a0608', '#5a0c12', '#9a141e', '#c81e28', '#e5262f', '#ff6b6b', '#ffc0c0'],
    'teal': ['#06222a', '#0e4650', '#1e6e78', '#2e969c', '#46c4c8', '#8ee8ea', '#d8fafa'],
    # 아이콘용 더함
    'wood': ['#1e120a', '#3b2414', '#5a3a1c', '#7a4e26', '#9a6634', '#c08552', '#e0b07a'],
    'purple': ['#1f0a2a', '#3a1450', '#5a2276', '#7e34a0', '#a650c8', '#d08af0', '#f2d4ff'],
    'gold': ['#2b1a06', '#6b4a08', '#a87a0a', '#d9a40e', '#facc15', '#ffe680', '#fffbe0'],
    'copper': ['#24100a', '#4a2412', '#7a3b1c', '#a4532a', '#c56a3a', '#f6b38a', '#ffe0c8'],
    'sky': ['#0e2a3a', '#1e4a60', '#2e7a96', '#4fb3cf', '#86d8ee', '#c4f0fa', '#f2fdff'],
}
INK = '#0b0b0e'
SWATCH = {'ink': INK, **{f'{m}{i}': c for m, r in RAMPS.items() for i, c in enumerate(r)}}


def hexc(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) + (255,)


def check(key, icon):
    bad = []
    rows, pal = icon.get('rows', []), icon.get('pal', {})
    if len(rows) != N or any(len(r) != N for r in rows):
        bad.append(f'{key}: 32×32가 아님 ({len(rows)}줄, 폭 {sorted(set(len(r) for r in rows))})')
        return bad
    for ch, sw in pal.items():
        if sw not in SWATCH:
            bad.append(f'{key}: 모르는 견본 {ch}={sw}')
    used = {c for r in rows for c in r if c != '.'}
    for c in used - set(pal):
        bad.append(f'{key}: 견본 없는 글자 {c!r}')
    if any(c != '.' for c in rows[0] + rows[-1] + ''.join(r[0] + r[-1] for r in rows)):
        bad.append(f'{key}: 맨 바깥 1칸은 비워 둔다 (바깥선 자리)')
    return bad


OUTLINE = 2  # 바깥 먹선 두께 (D-291: 사용자 「지금보다 두 배 — 1도트는 너무 고해상도 스타일」)


def render(icon):
    """32×32 RGBA — 칠한 그대로 + 바깥 먹선 OUTLINE도트(상하좌우로 한 겹씩).
    먹선이 32칸 밖으로 넘치지 않게 넓은 판에 그린 뒤 실제 범위를 잘라 정중앙에 다시 놓는다
    (그림이 30칸을 넘으면 바깥 먹선이 가장자리에서 조금 잘린다 — 그리는 쪽에서 28칸 안쪽 권장)."""
    rows, pal = icon['rows'], icon['pal']
    M = N + 2 * OUTLINE
    big = Image.new('RGBA', (M, M), (0, 0, 0, 0))
    px = big.load()
    filled = set()
    for y in range(N):
        for x in range(N):
            c = rows[y][x]
            if c != '.':
                px[x + OUTLINE, y + OUTLINE] = hexc(SWATCH[pal[c]])
                filled.add((x + OUTLINE, y + OUTLINE))
    for _ in range(OUTLINE):
        ring = {(x + dx, y + dy) for x, y in filled for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))} - filled
        for x, y in ring:
            if 0 <= x < M and 0 <= y < M:
                px[x, y] = hexc(INK)
        filled |= ring
    box = big.getbbox()
    out = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    if not box:
        return out
    crop = big.crop(box)
    if crop.width > N or crop.height > N:
        l = max(0, (crop.width - N) // 2)
        tp = max(0, (crop.height - N) // 2)
        crop = crop.crop((l, tp, l + min(N, crop.width), tp + min(N, crop.height)))
    out.paste(crop, ((N - crop.width) // 2, (N - crop.height) // 2), crop)
    return out


def load(sid):
    f = os.path.join(SRC, f'{sid}.py')
    return runpy.run_path(f)['NEW'] if os.path.exists(f) else {}


def small(icn):
    sys.path.insert(0, HERE)
    from icon_sheet_import import small as s
    return s(icn)


def preview(sid, out):
    sys.path.insert(0, HERE)
    import icon_sheets
    new = load(sid)
    bad = [b for k, v in new.items() for b in check(k, v)]
    for b in bad:
        print('오류', b)
    if bad:
        sys.exit(1)
    items = icon_sheets.SHEETS[sid][1]
    try:
        font = ImageFont.truetype(os.path.join(ROOT, 'node_modules', 'galmuri', 'dist', 'Galmuri11.ttf'), 13)
    except OSError:
        font = ImageFont.load_default()
    cw, chh = 420, 150
    im = Image.new('RGB', (2 * cw + 20, ((len(items) + 1) // 2) * chh + 20), (24, 23, 30))
    d = ImageDraw.Draw(im)
    for i, (k, name, what) in enumerate(items):
        x0, y0 = 10 + (i % 2) * cw, 10 + (i // 2) * chh
        cur = os.path.join(ROOT, 'public', 'ui', 'icons16', f'{k}.png')
        tiles = []
        if os.path.exists(cur):
            tiles.append((Image.open(cur).convert('RGBA'), 4))
        if k in new:
            icn = render(new[k])
            tiles += [(icn, 4), (icn, 2), (icn, 1), (small(icn), 1)]
        x = x0
        for img, sc in tiles:
            w = img.width * sc
            d.rectangle([x, y0, x + w + 3, y0 + w + 3], fill=(47, 46, 54))
            big = img.resize((w, w), Image.NEAREST)
            im.paste(big, (x + 2, y0 + 2), big)
            x += w + 10
        d.text((x0, y0 + 134), f'{name} · {k}' + ('' if k in new else ' (아직)'), fill=(236, 232, 222), font=font)
    im.save(out)
    print(out, len(new), '/', len(items))


def build():
    os.makedirs(OUT, exist_ok=True)
    n = 0
    for f in sorted(os.listdir(SRC)) if os.path.isdir(SRC) else []:
        if not f.endswith('.py'):
            continue
        for k, v in runpy.run_path(os.path.join(SRC, f))['NEW'].items():
            bad = check(k, v)
            if bad:
                print('건너뜀', bad)
                continue
            render(v).save(os.path.join(OUT, f'{k}.png'))
            n += 1
    # 받은 시트에서 들여온 그림이 손그림을 덮는다 (D-301 — tools/pixel/icons32_ext/<키>.png, icon_sheet_import + 2도트 먹선)
    ext = os.path.join(HERE, 'icons32_ext')
    for f in sorted(os.listdir(ext)) if os.path.isdir(ext) else []:
        if f.endswith('.png'):
            Image.open(os.path.join(ext, f)).save(os.path.join(OUT, f))
            n += 1
    print(OUT, n)


if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'preview':
        preview(sys.argv[2], sys.argv[3])
    elif cmd == 'build':
        build()
