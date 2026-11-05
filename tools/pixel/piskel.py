"""
Piskel 왕복 (2026-11-05, 사용자: "도트 정본 내가 piskel에서 만들어서 체스말 모든 도트 다 새로 저장해 주려고").
  export : tools/pixel/pieces64.txt의 기물을 한 장씩 64×64 PNG(1칸 = 1px, 배경 투명)로 build-res/piskel/에 내보낸다.
           + Piskel에 불러올 팔레트 pawnisher-white.gpl · pawnisher-black.gpl + 한눈에 보는 sheet.png (×4)
  import : build-res/piskel/의 PNG를 다시 pieces64.txt 격자 글자로 옮긴다 (색 → 팔레트 글자, 정확히 같은 색이 아니면 가장 가까운 색 + 경고).
           그다음 `python3 -I tools/pixel/maker.py export`로 게임 그림을 찍는다.
사용: python3 -I tools/pixel/piskel.py export | import [파일이름...]
파일 이름: <유형>-<white|black>.png (예: P-white.png · K-black.png), 이형은 K_classic-white.png
"""
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import maker  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(ROOT, 'build-res', 'piskel')
PATH = os.path.join(HERE, 'pieces64.txt')
SIDE = {0: 'white', 1: 'black'}

# 진영마다 쓰는 글자 (pieces64.txt 머리 주석과 같다) — 색 → 글자를 진영별로 되돌린다
LETTERS = {
    0: 'OKWSGD' + 'YATRXUPC',
    1: 'OKBMHLD' + 'YATRXUPC',
}
NAMES = {
    'O': '흰 바깥 테', 'K': '검정 외곽선', 'W': '몸', 'S': '옅은 그늘', 'G': '그늘', 'D': '짙은 그늘',
    'B': '몸', 'M': '밝은 몸', 'H': '빛', 'L': '강한 빛',
    'Y': '왕관 금', 'A': '왕관 그늘', 'T': '왕관 연노랑', 'R': '보석 진홍', 'X': '보석 그늘', 'U': '황동 그늘', 'P': '보석 빛', 'C': '청록 보석',
}


def color(ch, side):
    return maker.DARK[side] if ch == 'D' else maker.PAL64[ch]


def fname(name, side):
    return f"{name.replace(':', '_')}-{SIDE[side]}.png"


def export():
    os.makedirs(OUT, exist_ok=True)
    hi = maker.load64()
    for (name, side), grid in hi.items():
        maker.render64(grid, side, 1).save(os.path.join(OUT, fname(name, side)))
    for side in (0, 1):
        with open(os.path.join(OUT, f'pawnisher-{SIDE[side]}.gpl'), 'w', encoding='utf-8') as f:
            f.write(f'GIMP Palette\nName: Pawnisher {SIDE[side]}\nColumns: 8\n#\n')
            for ch in LETTERS[side]:
                r, g, b = color(ch, side)
                f.write(f'{r:3d} {g:3d} {b:3d}\t{ch} {NAMES[ch]}\n')
    keys = list(hi)
    cols = (len(keys) + 1) // 2
    sheet = Image.new('RGBA', (cols * 64 * 4, 2 * 64 * 4), (47, 46, 54, 255))
    for k, key in enumerate(keys):
        im = maker.render64(hi[key], key[1], 4)
        sheet.alpha_composite(im, ((k % cols) * 256, (k // cols) * 256))
    sheet.save(os.path.join(OUT, 'sheet.png'))
    print(OUT, len(hi), '장 + 팔레트 2 + sheet.png')


def to_grid(path, side):
    im = Image.open(path).convert('RGBA')
    if im.size != (64, 64):
        raise SystemExit(f'{os.path.basename(path)}: 크기가 {im.size}입니다. 64×64(1칸 = 1px)로 내보내 주세요.')
    pal = {ch: color(ch, side) for ch in LETTERS[side]}
    rows, off = [], {}
    for y in range(64):
        row = ''
        for x in range(64):
            r, g, b, a = im.getpixel((x, y))
            if a < 128:
                row += '.'
                continue
            exact = [ch for ch, c in pal.items() if c == (r, g, b)]
            if exact:
                row += exact[0]
                continue
            ch = min(pal, key=lambda c: sum((p - q) ** 2 for p, q in zip(pal[c], (r, g, b))))
            off[(r, g, b)] = ch
            row += ch
        rows.append(row)
    return rows, off


def import_(files):
    files = files or sorted(f for f in os.listdir(OUT) if f.endswith('.png') and f != 'sheet.png')
    got = {}
    for f in files:
        base = os.path.basename(f)[:-4]
        name, side = base.rsplit('-', 1)
        side = {'white': 0, 'black': 1}[side]
        rows, off = to_grid(os.path.join(OUT, os.path.basename(f)), side)
        got[f"{name.replace('_', ':')} {side}"] = rows
        if off:
            print(f'  {base}: 팔레트 밖 색 {len(off)}개 → 가장 가까운 색으로 바꿈:', ', '.join(f'#{r:02X}{g:02X}{b:02X}→{c}' for (r, g, b), c in off.items()))
    # 같은 이름 블록만 바꿔 쓴다 (순서 유지)
    lines = open(PATH, encoding='utf-8').read().split('\n')
    out, skip, done, at = [], False, set(), 0
    for ln in lines:
        if ln.startswith('['):
            key = ln.strip()[1:-1]
            skip = key in got
            out.append(ln)
            if skip:
                at = len(out)  # 머리 바로 뒤 — 블록 안 주석은 여기에 남긴다
                out.extend(got[key])
                done.add(key)
            continue
        if skip and ln.startswith('#'):
            out.insert(at, ln)
            at += 1
        elif not skip or not ln.strip():
            out.append(ln)
    text = '\n'.join(out).rstrip('\n') + '\n'
    for key in got:
        if key not in done:
            text += f'[{key}]\n' + '\n'.join(got[key]) + '\n'
    open(PATH, 'w', encoding='utf-8').write(text)
    print('pieces64.txt:', ', '.join(got), '→ 이어서 python3 -I tools/pixel/maker.py export')


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'export'
    export() if cmd == 'export' else import_(sys.argv[2:])
