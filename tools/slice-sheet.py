"""
발주 시트 자르기 (docs/asset-order.md): 나노바나나가 만든 마젠타 배경 시트를 원래 도트 해상도의 투명 PNG로 바꾼다.

1. 마젠타 배경, 가장자리 분홍 번짐, 오른쪽 아래 제미나이 워터마크(반투명 흰 별)를 지운다.
2. 시트를 열×행 칸으로 나누고 칸마다 그림이 있는 영역만 잘라 낸다.
3. 도트 한 칸의 크기를 자동으로 찾아, 도트마다 가운데 색 하나로 줄인다 (흐린 확대본 → 원래 도트).

사용: python3 -I tools/slice-sheet.py <시트.png> <열> <행> <출력 폴더> <이름1> <이름2> ... [--dot N]
나노바나나는 테두리를 반 도트 굵기로 그리는 일이 많다 — 테두리가 점선처럼 끊기면 --dot에 자동값의 절반을 준다.
이름을 '-'로 주면 그 칸은 건너뛴다. --palette: 14색으로 맞춤. 출력 폴더에 _preview.png(8배 확대 미리보기)도 남긴다.
"""
import sys
from collections import Counter

from PIL import Image


# 발주서 v2 팔레트 14색 (docs/asset-order.md §1)
PALETTE = [tuple(int(h[i : i + 2], 16) for i in (1, 3, 5)) for h in '#0B0B0E #16141C #2F2E36 #56545E #8A8794 #C8C8C8 #F4F1EA #8C6239 #C89B3C #FACC15 #7A1218 #E5262F #38BDF8 #BFEFFF'.split()]


def is_bg(r, g, b, x, y, w, h):
    # 마젠타와 마젠타가 섞인 번짐: 빨강·파랑이 초록보다 크게 높다 (어두운 빨강은 파랑이 낮아 제외된다)
    if r > 150 and b > 150 and min(r, b) - g > 30:
        return True
    # 워터마크: 오른쪽 아래 구석의 분홍빛 흰색 (순수한 흰 테두리 255,255,255는 남긴다)
    if x > w * 0.9 and y > h * 0.85 and r > 200 and b > 200 and g < 245 and r - g > 15:
        return True
    return False


def dot_size(im):
    """가로줄의 같은 색 구간 길이 중 가장 흔한 값 (8px 이상) = 도트 크기"""
    px = im.load()
    w, h = im.size
    runs = Counter()
    for y in range(h // 20, h, max(1, h // 40)):
        c = 1
        for x in range(1, w):
            a, b = px[x, y], px[x - 1, y]
            if sum(abs(i - j) for i, j in zip(a[:3], b[:3])) < 40:
                c += 1
            else:
                if c >= 8:
                    runs[c] += 1
                c = 1
    best = runs.most_common(1)[0][0]
    # 이웃 길이와 가중 평균 (22·23이 섞여 나오는 경우)
    near = [(k, v) for k, v in runs.items() if abs(k - best) <= 1]
    return sum(k * v for k, v in near) / sum(v for _, v in near)


def main():
    argv = sys.argv[1:]
    dot_arg = None
    snap = '--palette' in argv
    if snap:
        argv.remove('--palette')
    if '--dot' in argv:
        i = argv.index('--dot')
        dot_arg = float(argv[i + 1])
        argv = argv[:i] + argv[i + 2 :]
    args = argv
    src, cols, rows, out, names = args[0], int(args[1]), int(args[2]), args[3], args[4:]
    im = Image.open(src).convert('RGBA')
    w, h = im.size
    px = im.load()
    for y in range(h):
        for x in range(w):
            r, g, b, _ = px[x, y]
            if is_bg(r, g, b, x, y, w, h):
                px[x, y] = (0, 0, 0, 0)
    dot = dot_arg or dot_size(im)
    print(f'{src}: {w}x{h}, 도트 {dot:.2f}px')
    cw, ch = w / cols, h / rows
    outs = []
    for i, name in enumerate(names):
        if name == '-':
            continue
        cx, cy = i % cols, i // cols
        cell = im.crop((int(cx * cw), int(cy * ch), int((cx + 1) * cw), int((cy + 1) * ch)))
        bbox = cell.getbbox()
        if not bbox:
            print(f'  {name}: 빈 칸')
            continue
        x0, y0, x1, y1 = bbox
        # 색 잡음 줄이기: 그림마다 12색으로 줄인 뒤 도트를 읽는다
        q = cell.convert('RGB').quantize(colors=12, method=Image.Quantize.MEDIANCUT).convert('RGB')
        qp, ap = q.load(), cell.load()
        # 격자 위상 맞추기: 시작점을 도트 안에서 옮겨 보며, 도트 안 색이 가장 고른 위치를 고른다
        def score(ox, oy):
            bad = 0
            for j in range(int((y1 - y0 - oy) / dot)):
                for k in range(int((x1 - x0 - ox) / dot)):
                    bx, by = x0 + ox + k * dot, y0 + oy + j * dot
                    c = qp[int(bx + dot * 0.5), int(by + dot * 0.5)]
                    for fx, fy in ((0.2, 0.2), (0.8, 0.2), (0.2, 0.8), (0.8, 0.8)):
                        if qp[int(bx + dot * fx), int(by + dot * fy)] != c:
                            bad += 1
            return bad
        steps = [i * dot / 6 for i in range(6)]
        ox, oy = min(((a, b) for a in steps for b in steps), key=lambda o: score(*o))
        ow, oh = max(1, round((x1 - x0 - ox) / dot)), max(1, round((y1 - y0 - oy) / dot))
        res = Image.new('RGBA', (ow, oh))
        rp = res.load()
        for j in range(oh):
            for k in range(ow):
                cxp, cyp = x0 + ox + (k + 0.5) * dot, y0 + oy + (j + 0.5) * dot
                votes = Counter()
                for dy in (-dot / 4, 0, dot / 4):
                    for dx in (-dot / 4, 0, dot / 4):
                        X, Y = min(cell.size[0] - 1, int(cxp + dx)), min(cell.size[1] - 1, int(cyp + dy))
                        votes[qp[X, Y] + (ap[X, Y][3],)] += 1
                rp[k, j] = votes.most_common(1)[0][0]
        if snap:
            # 발주서 14색으로 맞춘다 (나노바나나가 섞는 미세한 색 잡음 제거)
            for j in range(oh):
                for k in range(ow):
                    r, g, b, a = rp[k, j]
                    if a:
                        rp[k, j] = min(PALETTE, key=lambda c: (c[0] - r) ** 2 + (c[1] - g) ** 2 + (c[2] - b) ** 2) + (255,)
        res.save(f'{out}/{name}.png')
        outs.append((name, res))
        print(f'  {name}: {ow}x{oh}')
    # 미리보기: 8배 확대, 회색 바탕
    if outs:
        s = 8
        pw = sum(r.size[0] * s + 16 for _, r in outs)
        ph = max(r.size[1] for _, r in outs) * s + 16
        pv = Image.new('RGBA', (pw, ph), (60, 58, 66, 255))
        x = 8
        for _, r in outs:
            big = r.resize((r.size[0] * s, r.size[1] * s), Image.NEAREST)
            pv.alpha_composite(big, (x, 8))
            x += big.size[0] + 16
        pv.save(f'{out}/_preview.png')


main()
