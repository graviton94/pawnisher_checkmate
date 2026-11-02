"""
가짜 왕 시안 (D-181): 주인공 흰 폰 머리에 반장 마무리 때 떨어진 그 도트 왕관을 씌운 시안 넷.
64×64 정본 [P 0]에 왕관 도트를 얹고, 왕관 둘레에 검정 외곽선 2칸 · 흰 테두리 2칸을 다시 두른다.
사용: python3 -I tools/pixel/fakeking.py <시안 그림.png>   (고른 안은 pieces64.txt에 [P:fakeking 0]으로 넣는다)
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import maker  # noqa: E402

# 왕관 색은 maker.PAL64에 (Y · A · T · R · X — 게임 연출의 금 · 진홍과 같다)

CROWNS = {
    # 가: 반장의 왕관 그대로 — 가운데 바로 얹음
    'a': (21, 10, [
        '.Y.........Y.........Y.',
        '.YY.......YTY.......YY.',
        '.YYY.....YTTTY.....YYY.',
        '.YYYY...YTTTTTY...YYYY.',
        '.YYYYY.YYYYYYYYY.YYYYY.',
        'YYYYYYYYYYYYYYYYYYYYYYY',
        'TTTTTTTTTTTTTTTTTTTTTTT',
        'YYYYYYYYYYRRRYYYYYYYYYY',
        'AAAAAAAAAARXRAAAAAAAAAA',
    ]),
    # 나: 주워 쓴 큰 왕관 — 머리보다 커서 한쪽으로 기울어 흘러내린다
    'b': (20, 5, [
        '..Y........Y........Y..',
        '..YY......YTY......YY..',
        '..YYY....YTTTY....YYY..',
        '..YYYY..YYYYYYY..YYYY..',
        '.YYYYYYYYYYYYYYYYYYYYY.',
        'YTTTTTTTTTTTTTTTTTTTTTY',
        'YYYYYYYYYYRRRYYYYYYYYYY',
        'AAAAAAAAAARXRAAAAAAAAAA',
    ]),
    # 다: 금 간 전리품 — 한쪽 뿔이 부러지고 보석이 빠졌다
    'c': (23, 6, [
        '.Y.......Y.........',
        '.YY.....YTY........',
        '.YYY...YTTTY...Y...',
        '.YYYY.YYYYYYY.YYY..',
        'YYYYYYYYYYYYYYYYYYY',
        'TTTTTTTTKTTTTTTTTTT',
        'YYYYYYYKAAKYYYYYYYY',
        'AAAAAAAAKKAAAAAAAAA',
    ]),
    # 라: 작은 왕관을 비스듬히 — 한쪽 귀에 걸친 멋
    'd': (28, 7, [
        'Y.....Y.....Y',
        'YY...YTY...YY',
        'YYY.YTTTY.YYY',
        'YYYYYYYYYYYYY',
        'TTTTTTTTTTTTT',
        'YYYYYRRRYYYYY',
        'AAAAARXRAAAAA',
    ]),
}
# 기울기(열마다 몇 칸 내려가나): 나 · 라는 기울인다
TILT = {'a': 0.0, 'b': 0.16, 'c': 0.0, 'd': -0.12}
NAMES = {'a': '가 · 반장의 왕관', 'b': '나 · 주워 쓴 큰 왕관', 'c': '다 · 금 간 전리품', 'd': '라 · 비스듬한 작은 왕관'}


def crowned(base, key):
    """폰 정본에 왕관을 얹고 외곽선 · 테두리를 다시 두른다"""
    x0, y0, art = CROWNS[key]
    g = [list(r) for r in base]
    n = len(g)
    fill = {}
    for j, row in enumerate(art):
        for i, ch in enumerate(row):
            if ch == '.':
                continue
            x = x0 + i
            y = y0 + j + round(i * TILT[key])
            if 0 <= x < n and 0 <= y < n:
                fill[(x, y)] = ch
    # 왕관 칸 (머리 외곽선 위로 덮는다)
    for (x, y), ch in fill.items():
        g[y][x] = ch
    # 왕관 아랫단과 머리 사이 경계: 왕관 바로 아래 몸통 칸에 검정 한 줄 (그림자 겸 경계선)
    for x in {x for (x, _) in fill}:
        yb = max(y for (xx, y) in fill if xx == x) + 1
        if 0 <= yb < n and g[yb][x] in 'WSGD':
            g[yb][x] = 'K'
        if 0 <= yb + 1 < n and g[yb + 1][x] in 'WSGD':
            g[yb + 1][x] = 'K'
    # 왕관 둘레 검정 외곽선 2칸 → 흰 테두리 2칸 (빈 칸 · 흰 테두리만 바꾼다)
    def ring(cells, depth, ch, over):
        out = set()
        for (x, y) in cells:
            for dy in range(-depth, depth + 1):
                for dx in range(-depth, depth + 1):
                    if dx * dx + dy * dy > depth * depth + 1:
                        continue  # 둥근 붓 — 모서리가 네모로 뭉치지 않게
                    xx, yy = x + dx, y + dy
                    if 0 <= xx < n and 0 <= yy < n and g[yy][xx] in over and (xx, yy) not in fill:
                        out.add((xx, yy))
        for (xx, yy) in out:
            g[yy][xx] = ch
        return out
    # 외곽선 두께는 폰 몸통과 같게 (몸통 검정 외곽선 4~5칸) — 왕관만 얇아 보이지 않게
    k = ring(set(fill), 3, 'K', '.O')
    ring(set(fill) | k, 2, 'O', '.')
    return [''.join(r) for r in g]


def main(path):
    hi = maker.load64()
    base = hi[('P', 0)]
    kings = [maker.render64(hi[('K', 0)], 0)]
    variants = {k: maker.render64(crowned(base, k), 0) for k in CROWNS}
    S = 4
    cell = 64 * S
    pad = 24
    cols = len(variants) + 2
    W = cols * (cell + pad) + pad
    H = cell + 260
    sheet = Image.new('RGB', (W, H), (14, 13, 18))
    d = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype(os.path.join(HERE, '..', '..', 'node_modules', 'galmuri', 'dist', 'Galmuri11-Bold.ttf'), 22)
        small = ImageFont.truetype(os.path.join(HERE, '..', '..', 'node_modules', 'galmuri', 'dist', 'Galmuri11.ttf'), 16)
    except OSError:
        font = small = ImageFont.load_default()
    items = [('지금 폰', maker.render64(base, 0)), ('킹 (비교)', kings[0])] + [(NAMES[k], im) for k, im in variants.items()]
    for i, (label, im) in enumerate(items):
        x = pad + i * (cell + pad)
        sheet.paste(im.resize((cell, cell), Image.NEAREST), (x, 40), im.resize((cell, cell), Image.NEAREST))
        d.text((x, 8), label, fill=(250, 204, 21) if i >= 2 else (168, 164, 178), font=font)
        # 게임 크기: 판 칸(60px) 위에 실제 크기로 (흰 · 어두운 칸)
        for t, col in enumerate([(58, 57, 68), (47, 46, 54)]):
            tx = x + t * 76
            ty = 40 + cell + 24
            d.rectangle([tx, ty, tx + 64, ty + 64], fill=col)
            small_im = im.resize((52, 52), Image.NEAREST)
            sheet.paste(small_im, (tx + 6, ty + 4), small_im)
        mini = maker.mini(crowned(base, list(CROWNS)[i - 2]) if i >= 2 else (base if i == 0 else hi[('K', 0)]), 0)
        m3 = mini.resize((66, 66), Image.NEAREST)
        sheet.paste(m3, (x + 160, 40 + cell + 22), m3)
    d.text((pad, H - 70), '위: 64격자 정본 4배 · 아래: 판 칸 위 실제 크기(밝은 칸 · 어두운 칸) · 작은 도트판(22격자, 인트로 · 지도용)', fill=(168, 164, 178), font=small)
    d.text((pad, H - 44), '왕관 = 반장 마무리에서 튀어 오른 그 도트 왕관 (금 FACC15 · 연노랑 FFF3B0 · 그늘 9A6F14 · 보석 E5262F)', fill=(168, 164, 178), font=small)
    sheet.save(path)
    print(path, sheet.size)


def apply(key='a'):
    """고른 안을 정본에 넣는다: 흰 킹(우리 대장 = 가짜 왕) 자리에. 옛 킹 그림은 [K:classic 0]으로 남긴다"""
    path = os.path.join(HERE, 'pieces64.txt')
    hi = maker.load64()
    grid = crowned(hi[('P', 0)], key)
    text = open(path, encoding='utf-8').read()
    lines = text.split('\n')
    out, skip = [], False
    for ln in lines:
        if ln.startswith('['):
            skip = ln.strip() in ('[K 0]', '[K:classic 0]')
            if ln.strip() == '[K 0]':
                if ('K:classic', 0) not in hi:
                    out += ['[K:classic 0]'] + hi[('K', 0)] + ['']
                out += ['[K 0]', f'# 가짜 왕 (D-181): 폰 머리에 반장의 도트 왕관 — tools/pixel/fakeking.py apply {key}'] + grid + ['']
                continue
            if ln.strip() == '[K:classic 0]':
                out += ['[K:classic 0]'] + hi[('K:classic', 0)] + ['']
                continue
        if not skip:
            out.append(ln)
    open(path, 'w', encoding='utf-8').write('\n'.join(out))
    print('pieces64.txt [K 0] = 가짜 왕', key)


if __name__ == '__main__':
    if sys.argv[1] == 'apply':
        apply(sys.argv[2] if len(sys.argv) > 2 else 'a')
    else:
        main(sys.argv[1])
