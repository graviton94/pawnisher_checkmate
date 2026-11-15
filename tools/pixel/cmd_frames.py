"""
명령 카드 앞면 틀 RF-04 후처리 (2026-11-14, D-423 반입 · D-386 비율 유지).
ui_kit_import.py RF-04가 부른다 — 따로 돌려도 된다: python3 -I tools/pixel/cmd_frames.py
하는 일:
 ① 받은 그림 잡티 정리: 금 틀의 검은 선에 섞인 철 어두운 단 → 먹, 진홍 잡점 → 황동 그늘, 이름판 밖 종이색(철 밝은 단이 잡힌 것) → 철 밝은 단
 ② 세 등급을 같은 56×84 캔버스로(카드 몸 가운데 · 위 5도트) — 늘리지 않는다
 ③ 그림 창(투명 구멍) · 이름판(종이 #BFB9AD) · 설명지(종이 #F1EDE4) · 비용 원판을 재서 src/slice/card-cmd.css를 쓴다(손으로 고치지 않는다)
"""
import os

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
# D-512 재발주본: 게임 틀(src/assets/ui/cards/cmd-*.png, 옛 cardart.py 출력을 대신)과 자리 CSS(src/slice/card-cmd.css)를 쓴다.
# (1차본 결과는 build-res/order/RF-04-v1-parts에 보관)
CARDS = os.path.join(ROOT, 'src', 'assets', 'ui', 'cards')
CSS_OUT = os.path.join(ROOT, 'src', 'slice', 'card-cmd.css')
CW, CH, TOP = 56, 84, 5

INK, IRON1, IRON3 = (11, 11, 14), (51, 49, 59), (138, 135, 148)
B_DARK = (138, 100, 22)
PAPER_T, PAPER_D = (191, 185, 173), (241, 237, 228)
CRIMSON = {(122, 18, 24), (229, 38, 47), (255, 123, 123)}


def _bbox(m):
    ys, xs = np.nonzero(m)
    return (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)


def _dense(m, n=8):
    """잡점을 빼고 판의 몸만: 같은 색이 n칸 넘게 이어진 줄 · 칸"""
    rows = [y for y in range(m.shape[0]) if m[y].sum() >= n]
    cols = [x for x in range(m.shape[1]) if m[rows[0]:rows[-1] + 1, x].sum() >= min(n, len(rows) // 2 + 1)]
    return (cols[0], rows[0], cols[-1] + 1, rows[-1] + 1)


def _hole(a):
    """바깥과 이어지지 않은 투명 구멍 = 그림 창"""
    H, W = a.shape[:2]
    clear = a[:, :, 3] == 0
    seen = np.zeros_like(clear)
    st = [(y, x) for y in range(H) for x in (0, W - 1) if clear[y, x]] + [(y, x) for x in range(W) for y in (0, H - 1) if clear[y, x]]
    for y, x in st:
        seen[y, x] = True
    while st:
        y, x = st.pop()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < H and 0 <= nx < W and clear[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True
                st.append((ny, nx))
    return _bbox(clear & ~seen)


def clean(img, tier):
    a = np.array(img)
    rgb = [tuple(int(v) for v in p) for p in a[:, :, :3].reshape(-1, 3)]
    H, W = a.shape[:2]
    hx0, hy0, hx1, hy1 = _hole(a)
    plate = _plate(a, hy0)
    for i, c in enumerate(rgb):
        y, x = divmod(i, W)
        if not a[y, x, 3]:
            continue
        if c in CRIMSON:
            a[y, x, :3] = B_DARK if tier == 'gold' else IRON1
        elif tier == 'gold' and c == IRON1 and not (x < 16 and y < 17):  # 비용 원판 그늘만 철색을 남긴다
            a[y, x, :3] = INK
        elif c == PAPER_T and not plate[y, x]:  # 이름판 밖 종이색 = 철 밝은 단이 종이로 잡힌 것(테 윗줄 · 그림 창 테) → 철 밝은 단
            a[y, x, :3] = IRON3
    return Image.fromarray(a, 'RGBA')


def _plate(a, hy0):
    """이름판 = 그림 창 위에서 종이색(#BFB9AD) 칸이 가장 넓게 붙은 덩어리 (4방향)"""
    H, W = a.shape[:2]
    m = (np.abs(a[:, :, :3].astype(int) - np.array(PAPER_T)).sum(-1) == 0) & (a[:, :, 3] > 0)
    m[hy0:] = False
    seen = np.zeros_like(m)
    best = np.zeros_like(m)
    for y0 in range(H):
        for x0 in range(W):
            if not m[y0, x0] or seen[y0, x0]:
                continue
            comp, st = [], [(y0, x0)]
            seen[y0, x0] = True
            while st:
                y, x = st.pop()
                comp.append((y, x))
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < H and 0 <= nx < W and m[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        st.append((ny, nx))
            if len(comp) > best.sum():
                best[:] = False
                for y, x in comp:
                    best[y, x] = True
    return best


def run():
    css = ['/* 자동 생성 — tools/pixel/cmd_frames.py (RF-04 명령 카드 앞면 · 재발주본 D-512). 손으로 고치지 않는다. */',
           '/* 56×84 캔버스 — 글 · 그림 자리는 받은 틀의 실제 칸을 잰 비율(%) */',
           # 이름판(#BFB9AD) · 비용 원판(#F1EDE4)이 밝은 종이 칸이다 — 옛 cardart 틀(어두운 리본 · 톱니)의 밝은 글 + 먹 그림자를 먹 글로
           'body.slice .cf.cf.cf.cf.cmd > .cf-name, body.slice .cf.cf.cf.cf.cmd.g-rare > .cf-name, body.slice .cf.cf.cf.cf.cmd.g-gold > .cf-name { color: #16141c; text-shadow: none; }',
           'body.slice .cf.cf.cf.cf.cmd > .cf-cost { color: #16141c; text-shadow: none; }',
           # 등급 꺾쇠는 틀에 그려져 왔다(희귀 청록 · 금 황동) — RF-01 쉬는 꺾쇠를 겹쳐 달지 않는다. 반짝임(RF-02)은 그대로 한 번 돈다
           'body.slice .cf.cf.cf.cf.cmd:is(.g-rare, .g-gold)::before { content: none; }']
    for tier in ('common', 'rare', 'gold'):
        path = os.path.join(CARDS, f'cmd-{tier}.png')
        img = Image.open(path).convert('RGBA')
        if img.size != (CW, CH):
            img = clean(img, tier)
            a = np.asarray(img)
            hx0, hy0, hx1, hy1 = _hole(a)
            body = a[:, :, 3] > 0
            # 카드 몸의 가운데 = 그림 창 가운데 (금 틀 장식이 오른쪽으로 튀어나와도 몸이 가운데에 오게)
            dx = int(round(CW / 2 - (hx0 + hx1) / 2))
            dx = max(0, min(CW - img.width, dx))
            can = Image.new('RGBA', (CW, CH), (0, 0, 0, 0))
            can.paste(img, (dx, TOP), img)
            img = can
            img.save(path)
        a = np.asarray(img)
        rgb = a[:, :, :3].astype(int)
        hx0, hy0, hx1, hy1 = _hole(a)
        is_c = lambda c: (np.abs(rgb - np.array(c)).sum(-1) == 0) & (a[:, :, 3] > 0)
        title = _dense(is_c(PAPER_T) & (np.arange(CH)[:, None] < hy0) & (np.arange(CW)[None, :] >= 12))
        paper = is_c(PAPER_D)
        # 비용 원판 = 이름판 아랫줄 위의 종이 칸만 (틀 귀퉁이 꺾쇠의 밝은 점이 원판에 섞이지 않게)
        cost = _bbox(paper & (np.arange(CH)[:, None] < title[3]) & (np.arange(CW)[None, :] < 18))
        text = _dense(paper & (np.arange(CH)[:, None] > hy1))
        pc = lambda v, n: f'{v / n * 100:.3f}%'
        sel = f'body.slice .cf.cf.cf.cf.cmd.g-{tier}'
        rect = lambda r, pad=0: f'left: {pc(r[0] + pad, CW)}; top: {pc(r[1] + pad, CH)}; width: {pc(r[2] - r[0] - 2 * pad, CW)}; height: {pc(r[3] - r[1] - 2 * pad, CH)};'
        # 카드 몸 모서리(등급 꺾쇠 · 반짝임 자리): 그림 창 높이 줄의 좌우 끝 · 30칸 넘게 찬 첫 줄 · 마지막 줄
        op = a[:, :, 3] > 0
        xs = np.nonzero(op[hy0])[0]
        top = next(y for y in range(CH) if op[y].sum() >= 30)
        bot = max(y for y in range(CH) if op[y].any()) + 1
        css.append(f'{sel} {{ background-image: url(\'../assets/ui/cards/cmd-{tier}.png\'); --ci-l: {pc(int(xs.min()), CW)}; --ci-r: {pc(CW - int(xs.max()) - 1, CW)}; --ci-t: {pc(top, CH)}; --ci-b: {pc(CH - bot, CH)}; }}')
        css.append(f'{sel} > .cf-win {{ {rect((hx0, hy0, hx1, hy1))} }}')
        css.append(f'{sel} > .cf-name {{ {rect(title)} }}')
        css.append(f'{sel} > .cf-cost {{ {rect(cost)} }}')
        # 설명지: 좌우만 1도트 안쪽, 위아래는 종이 칸 전부(25도트 — 2 : 3 다섯 행 × 15px가 161px 카드에서 줄 간격 안에 든다, D-512)
        css.append(f'{sel} > .cf-desc {{ {rect((text[0] + 1, text[1], text[2] - 1, text[3]))} }}')
        # 꼬리표: 그림 창 아래 띠(4도트)에 — 창 바닥에 겹쳐 앉는다
        css.append(f'{sel} > .cf-type {{ left: {pc(hx0, CW)}; top: {pc(hy1 - 4, CH)}; width: {pc(hx1 - hx0, CW)}; height: {pc(4, CH)}; }}')
        # 보석 = 설명지 아래 테의 소켓 가운데(설명지 끝 ~ 카드 몸 끝의 가운데)
        css.append(f'{sel} > .cf-gem {{ left: 50%; top: {pc((text[3] + bot) / 2, CH)}; }}')
        print(f'  cmd-{tier}: 창 {hx0},{hy0}–{hx1},{hy1} · 이름 {title} · 비용 {cost} · 설명 {text}')
    open(CSS_OUT, 'w').write('\n'.join(css) + '\n')


if __name__ == '__main__':
    run()
