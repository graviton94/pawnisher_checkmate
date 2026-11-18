"""
받은 MM-02 시트 반입 (D-423 · D-559): 「쓸 수 없음」 선택지 판 · 손패 판 (꺼짐 2종).
  python3 -I tools/pixel/mm02_import.py measure   # 판마다 축별 도트 간격 · 시작점 재기 (scene_recipe.MM02_GRID에 옮겨 적는다)
  python3 -I tools/pixel/mm02_import.py [--dry]    # 반입

받은 시트(2172×724, 마젠타)는 발주 168×40 ×8(1344×320)이 아니다 — 판 하나가 약 1019×277px:
가로 14.3 ~ 14.4px · 세로 15.8px 도트(축마다 다르다) → 약 71×18도트(발주 72×24보다 낮다).
① 마젠타가 아닌 덩어리 둘(왼쪽 = 선택지 판, 오른쪽 = 손패 판) ② 판마다 scene_recipe.MM02_GRID 실측 격자로 칸 가운데 최빈색
③ 마젠타 = 투명, 발주 15색(ui_kit_import.PAL)에 가장 가까운 색(이 시트는 철 · 먹만 — 진홍 0칸 확인)
④ 9-slice 72×24로 다시 짠다(늘이지 않는다 — MM-01 꺼짐 단추와 같은 법): 받은 위 6줄 · 아래 6줄(리벳 · 빛 · 먹 테) · 왼쪽 탭 16칸 ·
   오른 6칸은 그대로, 가운데 12줄은 탭 무늬가 가장 흔한 몸 줄 하나를 되풀이(9-slice 가운데 줄은 세로로 늘어난다), 모자란 폭은
   가운데 몸 칸 한 줄 되풀이. 변 · 가운데는 받은 변 · 가운데의 가장 많은 색 한 색으로 평평하게(늘이면 반복되므로 — 발주 조항).
⑤ src/assets/ui/chrome/v2/choice-off.png · hand-choice-off.png (D-539 임시본 choice-off0 · hand-choice-off0을 대신한다)
대조판: build-res/order/MM-02-check.png (받은 원본 축소 | 복원 도트 ×8 | 9-slice 72×24 ×8 | 늘린 미리보기 200×24 ×4)
"""
import os
import sys
from collections import Counter

import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
import event_import as ev  # noqa: E402
import gridmeasure  # noqa: E402
import snap  # noqa: E402
import scene_recipe  # noqa: E402
import ui_kit_import as kit  # noqa: E402

SRC = os.path.join(ROOT, 'build-res', 'order', 'MM-02-source.png')
V2 = os.path.join(ROOT, 'src', 'assets', 'ui', 'chrome', 'v2')
SIZE = (72, 24)
TOP, RIGHT, BOT, LEFT = 6, 6, 6, 16  # kit.css --k-choice: 6 6 6 16
INK = (*kit.PAL[0], 255)


def boxes(img):
    """마젠타가 아닌 덩어리 둘의 상자 (원본 px), 왼쪽부터"""
    a = np.asarray(img).astype(int)
    m = ~((a[:, :, 0] > 150) & (a[:, :, 2] > 150) & (a[:, :, 1] < 120))
    bs = kit.merge(kit.comps(m[::2, ::2]), 2)
    bs = [tuple(v * 2 for v in b) for b in bs if (b[2] - b[0]) * (b[3] - b[1]) > 2000]
    return sorted(bs)


def measure():
    img = Image.open(SRC).convert('RGB')
    for b in boxes(img):
        m = gridmeasure.measure(img, b, 6, 30)
        mb = gridmeasure.measure(img, b, 6, 30, bg=(255, 0, 255))
        print(b, 'plain', gridmeasure.short(m), 'magenta-masked', gridmeasure.short(mb))


def near(c, pal=kit.PAL):
    return min(pal, key=lambda p: (p[0] - c[0]) ** 2 * 3 + (p[1] - c[1]) ** 2 * 4 + (p[2] - c[2]) ** 2 * 2)


def part(img, b, g):
    """판 하나 → 도트 그림 (투명 바탕 · 발주 팔레트 · 가장 큰 덩어리만).
    칸 수 = 상자(+ 둘레 6px) ÷ 실측 간격, 경계는 균일 격자와 같은 칸 수의 dp_fixed(±30%, 생성기 흔들림 따라가기) 가운데 복원 오차가 낮은 것
    (event_import.cuts_for와 같은 법), 칸 가운데 50%의 최빈 묶음 중앙값."""
    (px, ox), (py, oy) = g['x'], g['y']
    box = (b[0] - 6, b[1] - 6, b[2] + 6, b[3] + 6)
    crop = img.crop(box)
    a = np.asarray(crop, float)
    W, H = crop.size
    ux, uy = ev.phased(W, px, (ox - box[0]) % px), ev.phased(H, py, (oy - box[1]) % py)
    best = (ev.rec_error(a, ux, uy), ux, uy)
    for slack in (0.1, 0.2, 0.3):
        xe = ev.dp_fixed(snap._profile(a, 1), W, len(ux) - 1, slack)
        ye = ev.dp_fixed(snap._profile(a, 0), H, len(uy) - 1, slack)
        e = ev.rec_error(a, xe, ye)
        if e < best[0]:
            best = (e, xe, ye)
    s = ev.sample(crop, best[1], best[2])
    small = Image.new('RGBA', (s.shape[1], s.shape[0]), (0, 0, 0, 0))
    q = small.load()
    for y in range(small.height):
        for x in range(small.width):
            c = tuple(int(v) for v in s[y, x])
            q[x, y] = (0, 0, 0, 0) if kit.is_key(c) else (*near(c), 255)
    al = np.asarray(small)[:, :, 3] > 0
    bb = max(kit.comps(al), key=lambda r: (r[2] - r[0]) * (r[3] - r[1]))
    return small.crop(bb)


def tab_sep(s, w, h):
    """탭 | 몸 사이 먹 세로줄 칸 (왼쪽 30칸 안에서 먹이 가장 많은 칸)"""
    return max(range(4, min(30, w)), key=lambda x: sum(1 for y in range(h) if s[x, y] == INK))


def tab_fix(src, erase_rows=None):
    """탭을 9-slice 왼쪽 LEFT칸에 맞춘다: 탭 안에서 이웃 칸과 모든 줄이 같은 칸(평평한 칸)을 빼서 탭 | 몸 먹줄이 LEFT-1칸에 오게
    (평평한 칸 빼기 = 9-slice 되풀이의 거꾸로, 그리지 않는다). erase_rows = (r0, r1): 그 줄들의 탭 속(바깥 먹선 · 먹줄 사이)을 탭 바탕색으로
    — 손패 판의 태엽 열쇠 지우기(가운데 줄은 세로로 늘어나 열쇠가 줄무늬가 된다)."""
    w, h = src.size
    s = src.load()
    sep = tab_sep(s, w, h)
    if erase_rows:
        fill = mode([s[x, y] for y in range(h) for x in range(2, sep) if s[x, y][3] and s[x, y] != INK])
        r0, r1 = erase_rows
        for y in range(r0, r1):
            xs = [x for x in range(sep) if s[x, y][3]]
            for x in range(xs[0] + 2, sep):  # 바깥 먹선 · 빛 한 칸은 둔다
                s[x, y] = fill
    drop = sep - (LEFT - 1)
    cols = list(range(w))
    for _ in range(max(0, drop)):
        flat = [x for x in range(3, sep - 1) if x in cols and x + 1 in cols and all(s[x, y] == s[x + 1, y] for y in range(h))]
        assert flat, '탭에서 뺄 평평한 칸이 없다'
        cols.remove(flat[len(flat) // 2])
    out = Image.new('RGBA', (len(cols), h), (0, 0, 0, 0))
    o = out.load()
    for X, x in enumerate(cols):
        for y in range(h):
            o[X, y] = s[x, y]
    return out, sep, max(0, drop)


def mode(px):
    return Counter(px).most_common(1)[0][0]


def nine(src):
    """받은 판(약 71×18) → 72×24 9-slice. 위 TOP줄 · 아래 BOT줄(리벳 · 테 · 빛 줄)은 받은 그대로, 가운데 12줄은 받은 몸 줄 가운데
    왼쪽 탭(LEFT칸) 무늬가 가장 흔한 줄 하나를 되풀이(9-slice 가운데 줄은 세로로 늘어나므로 줄마다 같아야 한다 — 손패 판의 태엽 열쇠는
    여기서 빠진다: 게임에서는 탭 위에 태엽 비용 톱니가 얹혀 어차피 가려진다). 폭은 가운데 몸 칸 되풀이. 변 · 가운데는 한 색으로 평평하게."""
    w, h = src.size
    s = src.load()
    W, H = SIZE
    mids = list(range(TOP, h - BOT))
    pat = Counter(tuple(s[x, y] for x in range(min(LEFT, w))) for y in mids)
    best = pat.most_common(1)[0][0]
    r = min((y for y in mids if tuple(s[x, y] for x in range(min(LEFT, w))) == best), key=lambda y: abs(y - h / 2))
    rows = list(range(TOP)) + [r] * (H - TOP - BOT) + list(range(h - BOT, h))
    needw = W - w
    cmid = (LEFT + w - RIGHT) // 2
    cols = [x for x in range(w) for _ in range(1 + (needw if x == cmid else 0))] if needw >= 0 else \
        [x for x in range(w) if not (cmid <= x < cmid - needw)]
    out = Image.new('RGBA', SIZE, (0, 0, 0, 0))
    o = out.load()
    for Y, y in enumerate(rows):
        for X, x in enumerate(cols):
            o[X, Y] = s[x, y]
    for y in list(range(TOP)) + list(range(H - BOT, H)):
        c = mode([o[x, y] for x in range(LEFT, W - RIGHT)])
        for x in range(LEFT, W - RIGHT):
            o[x, y] = c
    for x in range(W - RIGHT, W):
        c = mode([o[x, y] for y in range(TOP, H - BOT)])
        for y in range(TOP, H - BOT):
            o[x, y] = c
    mid = mode([o[x, y] for y in range(TOP, H - BOT) for x in range(LEFT, W - RIGHT)])
    for y in range(TOP, H - BOT):
        for x in range(LEFT, W - RIGHT):
            o[x, y] = mid
    return out, r


def flat_check(im):
    """9-slice 검사: 위 · 아래 변은 줄마다 한 색, 오른 변은 칸마다 한 색, 가운데 한 색, 왼 탭 늘어나는 줄 구간은 줄마다 같은 모양"""
    W, H = im.size
    p = im.load()
    bad = []
    for y in list(range(TOP)) + list(range(H - BOT, H)):
        if len({p[x, y] for x in range(LEFT, W - RIGHT)}) != 1:
            bad.append(('edge-row', y))
    for x in range(W - RIGHT, W):
        if len({p[x, y] for y in range(TOP, H - BOT)}) != 1:
            bad.append(('edge-col', x))
    if len({p[x, y] for y in range(TOP, H - BOT) for x in range(LEFT, W - RIGHT)}) != 1:
        bad.append(('centre',))
    for x in range(LEFT):
        if len({p[x, y] for y in range(TOP, H - BOT)}) != 1:
            bad.append(('tab-col', x))
    return bad


def sheet(img, parts, outs, path):
    W = 1800
    tiles = [img.resize((img.width * 3 // 8, img.height * 3 // 8), Image.NEAREST)]
    for d in parts:
        tiles.append(d.resize((d.width * 8, d.height * 8), Image.NEAREST))
    for o in outs:
        tiles.append(o.resize((o.width * 8, o.height * 8), Image.NEAREST))
        # 9-slice 늘린 미리보기 200×24 (가운데 · 위아래 변 되풀이)
        st = Image.new('RGBA', (200, 24), (0, 0, 0, 0))
        st.paste(o.crop((0, 0, LEFT, 24)), (0, 0))
        st.paste(o.crop((72 - RIGHT, 0, 72, 24)), (200 - RIGHT, 0))
        mid = o.crop((LEFT, 0, 72 - RIGHT, 24))
        x = LEFT
        while x < 200 - RIGHT:
            st.paste(mid.crop((0, 0, min(mid.width, 200 - RIGHT - x), 24)), (x, 0))
            x += mid.width
        tiles.append(st.resize((800, 96), Image.NEAREST))
    H = sum(t.height + 30 for t in tiles) + 10
    sh = Image.new('RGBA', (W, H), (40, 38, 48, 255))
    d = ImageDraw.Draw(sh)
    labels = ['received (3/8)', 'restored choice-off', 'restored hand-off', 'choice-off 72x24 x8', 'choice-off stretched 200x24 x4',
              'hand-choice-off 72x24 x8', 'hand-choice-off stretched 200x24 x4']
    y = 10
    for lab, t in zip(labels, tiles):
        d.text((10, y), lab, fill=(250, 204, 21, 255))
        sh.alpha_composite(t.convert('RGBA'), (10, y + 16))
        y += t.height + 30
    sh.convert('RGB').save(path, optimize=True)


def main(dry=False):
    img = Image.open(SRC).convert('RGB')
    G = scene_recipe.MM02_GRID
    bs = boxes(img)
    assert len(bs) == 2, bs
    parts, outs = [], []
    for name, b, g in zip(G['parts'], bs, G['grid']):
        d = part(img, b, g)
        px = list(d.getdata())
        cr = sum(1 for c in px if c[3] and c[:3] in kit.PAL[10:13])
        t, sep, drop = tab_fix(d.copy(), g.get('erase_rows'))
        o, r = nine(t)
        bad = flat_check(o)
        print(f'  {name}: 상자 {b} → 복원 {d.size[0]}×{d.size[1]}도트 · 색 {len({c[:3] for c in px if c[3]})} · 진홍 {cr}칸 · 탭 먹줄 {sep}칸 → '
              f'평평한 탭 칸 {drop}개 뺌 · 지운 줄 {g.get("erase_rows")} → 72×24(가운데 줄 = {r}줄) · 9-slice 검사 {bad or "평평"}')
        assert not bad, (name, bad)
        parts.append(d)
        outs.append(o)
        if not dry:
            o.save(os.path.join(V2, f'{name}.png'))
    sheet(img, parts, outs, os.path.join(ROOT, 'build-res', 'order', 'MM-02-check.png'))


if __name__ == '__main__':
    if sys.argv[1:2] == ['measure']:
        measure()
    else:
        main('--dry' in sys.argv)
