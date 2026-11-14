"""
받은 UI 키트 시트(발주 19위 UI-01 ~ UI-04, D-386 · D-388) → 부품마다 진짜 도트 PNG.
  python3 -I tools/pixel/ui_kit_import.py <받은 그림> UI-0N [발주 원본 가로 도트 수]
  (UI-26 도장은 발주 72가 아니라 받은 그림 도트가 ~14.7px — 114로 준다, D-403)
하는 일: ① 시트 전체의 숨은 도트 격자를 찾아 칸 하나 = 1px로(snap.py) ② 마젠타 = 투명
③ 발주 팔레트 15색으로 맞춤 ④ 붙어 있는 덩어리마다 잘라 이름을 붙여 src/assets/ui/chrome/v2/<이름>.png
확인용: build-res/order/UI-0N-check.png (부품 ×4 + 이름)
"""
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
import snap  # noqa: E402

PAL = ['#0B0B0E', '#33313B', '#56545E', '#8A8794', '#8A6416', '#C89B3C', '#F5C542', '#8E877A', '#BFB9AD', '#F1EDE4',
       '#7A1218', '#E5262F', '#FF7B7B', '#1F8A7A', '#5EEAD4']
PAL = [tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for h in PAL]

NAMES = {
    'UI-01': ['panel-iron', 'panel-paper', 'plate-brass', 'inset-well', 'toast-iron', 'divider'],
    'UI-02': [f'btn-{m}-{s}' for m in ('brass', 'iron', 'crimson', 'teal') for s in ('up', 'down', 'off')],
    'UI-03': ['choice-up', 'choice-down', 'choice-sel', 'choice-off', 'tag-brass', 'tag-crimson', 'info-up', 'info-down', 'wallet'],
    'UI-04': ['scene-frame', 'portrait-frame', 'card-slot', 'card-slot-sel'],  # 받은 시트의 줄 순서대로 (D-390 확인)
    'UI-05': ['tab-iron-up', 'tab-brass-sel'],
    'UI-07': ['intent-attack', 'intent-approach', 'intent-guard', 'intent-blast', 'intent-shield', 'intent-rest'],
    'UI-08': ['sub-cap-l', 'sub-cap-r'],
    # 21위 (D-398 → D-400): 꼬리표 말고 다른 바탕 5종
    'UI-21': ['boss-plate', 'boss-plate-2', 'boss-stat'],
    'UI-22': ['stat-plate', 'stat-sep'],
    'UI-23': ['badge-num-brass', 'badge-num-crimson'],
    'UI-24': ['ribbon-brass', 'ribbon-crimson'],
    'UI-25': ['slip-paper'],
    # 22위 (D-402 → D-403): 도장 자국 — 왼쪽 정품 판정 · 오른쪽 반장 격파
    'UI-26': ['stamp-pass', 'stamp-fall'],
    # 2026-11-14 발주 (P-B D-490): 전장 대사 띠 · 이름표 · 초상 액자 · 반장 2단계 컷인 크롬 — 받은 시트의 줄 순서대로
    'DL-01': ['talk-foe', 'talk-ally', 'talk-sys-warn', 'talk-sys'],
    'DL-02': ['name-foe', 'name-ally', 'name-npc', 'portrait-foe', 'portrait-ally', 'portrait-npc'],
    'CI-01': ['p2-band-1', 'p2-band-2', 'cutin-frame', 'p2-band-3', 'letterbox'],
    # §0-D 4위 · 5위 (2026-11-14): 전투 HUD · 등급 테. 'kit/'로 시작하면 src/assets/ui/kit/에 둔다.
    'HB-01': ['btn-end-up', 'btn-end-down', 'btn-end-lock', 'btn-end-warn0', 'btn-end-warn1', 'btn-end-warn2'],
    'HB-02': ['speed-housing', 'kit/tube-lit', 'kit/tube-dim', 'kit/tube-flick', 'kit/tube-dead', 'coin-key'],
    'RF-03': ['kit/gem-common', 'kit/gem-rare', 'kit/gem-gold', 'kit/rank-tag-rare', 'kit/rank-tag-gold'],
    'RF-04': ['cards/cmd-common', 'cards/cmd-rare', 'cards/cmd-gold'],
    'RF-02': ['fx/glint-rare', 'fx/glint-gold'],
    'RF-01': ['kit/frame-common', 'kit/frame-rare', 'kit/frame-gold', 'kit/corner-rare', 'kit/corner-gold', 'kit/corner-gold-lit'],
}

# 같은 줄 부품을 같은 캔버스에 맞출 시트 (상태가 바뀌어도 단추 자리가 흔들리지 않게 — HB-01 경고 띠는 몸 바깥 2도트)
SAME_CANVAS = {'HB-01'}
# 프레임 시트 (칸 선으로 나뉜 애니메이션 — 덩어리가 아니라 상자로 자른다)
FRAME_SHEETS = {'RF-02'}
HOLD = {'RF-04': ('build-res', 'order', 'RF-04-parts')}
PAD_TO = {'kit/gem-common': (12, 12), 'kit/gem-rare': (12, 12), 'kit/gem-gold': (12, 12)}
DROP = {(0x7A, 0x12, 0x18), (0xE5, 0x26, 0x2F), (0xFF, 0x7B, 0x7B)}

# 받은 뒤 팔레트 바꿔 칠하기 (D-403, 사용자: 「정품 판정은 빨강이 아니어야」 — 승인 · 상은 황동 잉크, 격파는 진홍 그대로)
RECOLOR = {
    'stamp-pass': {'#E5262F': '#C89B3C', '#7A1218': '#8A6416', '#FF7B7B': '#F5C542', '#BFB9AD': '#F5C542'},
    # 잉크 빈 도트가 마젠타와 섞여 회색 종이로 잡힌 것 → 같은 재질의 밝은 단
    'stamp-fall': {'#BFB9AD': '#FF7B7B'},
}


def near(c):
    return min(PAL, key=lambda p: (p[0] - c[0]) ** 2 * 3 + (p[1] - c[1]) ** 2 * 4 + (p[2] - c[2]) ** 2 * 2)


def is_key(c):
    r, g, b = c[:3]
    return r > 150 and b > 150 and g < 120


def comps(mask):
    """붙어 있는 덩어리 (8방향) → [(x0, y0, x1, y1)]"""
    H, W = mask.shape
    seen = np.zeros_like(mask)
    out = []
    for y in range(H):
        for x in range(W):
            if not mask[y, x] or seen[y, x]:
                continue
            st = [(y, x)]
            seen[y, x] = 1
            x0 = x1 = x
            y0 = y1 = y
            n = 0
            while st:
                cy, cx = st.pop()
                n += 1
                x0, x1, y0, y1 = min(x0, cx), max(x1, cx), min(y0, cy), max(y1, cy)
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        ny, nx = cy + dy, cx + dx
                        if 0 <= ny < H and 0 <= nx < W and mask[ny, nx] and not seen[ny, nx]:
                            seen[ny, nx] = 1
                            st.append((ny, nx))
            if n >= 12:
                out.append((x0, y0, x1 + 1, y1 + 1))
    return out


def order(boxes):
    """줄(위 → 아래), 줄 안에서 왼 → 오른"""
    boxes = sorted(boxes, key=lambda b: b[1])
    rows, cur = [], []
    for b in boxes:
        if cur and b[1] > max(c[3] for c in cur) - 2:
            rows.append(sorted(cur, key=lambda c: c[0]))
            cur = []
        cur.append(b)
    if cur:
        rows.append(sorted(cur, key=lambda c: c[0]))
    return [b for r in rows for b in r]


def merge(boxes, gap=3):
    """가까운 덩어리를 하나로 (발자국 두 개처럼 한 아이콘이 둘로 갈린 것)"""
    out = list(boxes)
    changed = True
    while changed:
        changed = False
        for i in range(len(out)):
            for j in range(i + 1, len(out)):
                a, b = out[i], out[j]
                if a[0] - gap <= b[2] and b[0] - gap <= a[2] and a[1] - gap <= b[3] and b[1] - gap <= a[3]:
                    out[i] = (min(a[0], b[0]), min(a[1], b[1]), max(a[2], b[2]), max(a[3], b[3]))
                    out.pop(j)
                    changed = True
                    break
            if changed:
                break
    return out


def main(src, sid, native_w=None):
    img = Image.open(src).convert('RGB')
    a0 = np.asarray(img, dtype=int)
    k = img.width // int(native_w) if native_w and img.width % int(native_w) == 0 else 0
    exact = False
    if k > 1 and img.height % k == 0:  # 정수배로 깨끗이 키운 시트(HB-01 ×4 · HB-02 · RF-01 · RF-03 ×8)는 칸 가운데를 그대로 읽는다
        b = a0.reshape(img.height // k, k, img.width // k, k, 3)
        exact = (np.abs(b - b[:, k // 2, :, k // 2, :][:, None, :, None, :]).sum(-1) > 24).mean() < 0.002
    if exact:
        small = Image.fromarray(b[:, k // 2, :, k // 2, :].astype('uint8'), 'RGB').convert('RGBA')
        px = py = float(k)
    elif native_w:  # 발주한 원본 캔버스 가로 도트 수를 알면 칸 크기를 그것으로 (자동 찾기가 반 칸 · 다른 배수를 잡을 때)
        lo = img.width / native_w * 0.9
        px, ox, py, oy, score = snap.detect_pitch(img, lo=lo, hi=img.width / native_w * 1.1)
    else:
        px, ox, py, oy, score = snap.detect_pitch(img, lo=float(os.environ.get('UIKIT_LO', '7.0')))  # 받은 시트의 도트는 ~10px — 그 절반(5px)을 잘못 잡지 않게
    if not exact:
        a = np.asarray(img, dtype=float)
        cuts = (snap.dp_cuts(snap._profile(a, 1), img.width, px), snap.dp_cuts(snap._profile(a, 0), img.height, py))
        small = snap.snap(img, px, ox, py, oy, 0, cuts=cuts).convert('RGBA')
    p = small.load()
    W, H = small.size
    for y in range(H):
        for x in range(W):
            c = p[x, y]
            p[x, y] = (0, 0, 0, 0) if is_key(c) else (*near(c), 255)
    mask = np.asarray(small)[:, :, 3] > 0
    boxes = order(merge(comps(mask), int(os.environ.get("UIKIT_GAP", "1"))))
    names = NAMES[sid]
    print(f'{sid}: 칸 {px:.2f}×{py:.2f}px · 시트 {W}×{H}도트 · 덩어리 {len(boxes)} (이름 {len(names)})')
    # 적 의도 아이콘(UI-07)은 다른 아이콘과 같은 곳, 나머지는 UI 크롬
    outdir = os.path.join(ROOT, 'public', 'ui', 'icons16') if sid == 'UI-07' else os.path.join(ROOT, 'src', 'assets', 'ui', 'fx') if sid == 'UI-26' else os.path.join(ROOT, 'src', 'assets', 'ui', 'chrome', 'v2')
    os.makedirs(outdir, exist_ok=True)
    if sid in SAME_CANVAS:  # 모든 부품을 가장 큰 덩어리 크기로, 몸(가운데) 기준 정렬
        bw = max(b[2] - b[0] for b in boxes)
        bh = max(b[3] - b[1] for b in boxes)
        boxes = [((b[0] + b[2] - bw) // 2, (b[1] + b[3] - bh) // 2, (b[0] + b[2] - bw) // 2 + bw, (b[1] + b[3] - bh) // 2 + bh) for b in boxes]
    parts = []
    for i, b in enumerate(boxes):
        nm = names[i] if i < len(names) else f'{sid}-extra{i}'
        part = small.crop(b)
        if nm in PAD_TO and part.size != PAD_TO[nm]:  # 같은 줄 부품과 같은 칸 크기로 (아래 · 가운데 맞춤, 늘리지 않음)
            pw, ph = PAD_TO[nm]
            can = Image.new('RGBA', (pw, ph), (0, 0, 0, 0))
            can.paste(part, ((pw - part.width) // 2, ph - part.height))
            part = can
        if nm in RECOLOR:
            sw = {tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)): tuple(int(v[i:i + 2], 16) for i in (1, 3, 5)) for h, v in RECOLOR[nm].items()}
            q = part.load()
            for y in range(part.height):
                for x in range(part.width):
                    c = q[x, y]
                    if c[3] and c[:3] in sw:
                        q[x, y] = (*sw[c[:3]], 255)
        dst = os.path.join(ROOT, 'src', 'assets', 'ui', nm.split('/')[0]) if '/' in nm else outdir
        if sid in HOLD:  # 재발주 대기 — 게임에 넣지 않고 검수용 자리에만 (RF-04: 설명지가 작아 D-422 세 줄이 안 들어간다)
            dst = os.path.join(ROOT, *HOLD[sid])
            os.makedirs(dst, exist_ok=True)
        nm = nm.split('/')[-1]
        part.save(os.path.join(dst, f'{nm}.png'))
        parts.append((nm, part))
        print(f'  {nm}: {part.size[0]}×{part.size[1]}')
    if sid == 'RF-01':  # 모서리 장식 네 귀퉁이 한 장(9-slice 10도트 · 가운데 비움) — 받은 조각을 뒤집어 붙일 뿐 새로 그리지 않는다
        for g in ('rare', 'gold'):
            c = Image.open(os.path.join(ROOT, 'src', 'assets', 'ui', 'kit', f'corner-{g}.png')).convert('RGBA')
            n = c.width
            four = Image.new('RGBA', (n * 2 + 4, n * 2 + 4), (0, 0, 0, 0))
            four.paste(c, (0, 0))
            four.paste(c.transpose(Image.FLIP_LEFT_RIGHT), (n + 4, 0))
            four.paste(c.transpose(Image.FLIP_TOP_BOTTOM), (0, n + 4))
            four.paste(c.transpose(Image.ROTATE_180), (n + 4, n + 4))
            four.save(os.path.join(ROOT, 'src', 'assets', 'ui', 'kit', f'corners-{g}.png'))
    if sid == 'RF-04':  # 명령 카드 앞면: 56×84 캔버스로 맞추고 글 · 그림 자리를 재서 card-cmd.css를 쓴다
        import cmd_frames
        cmd_frames.run()
    sc = 4
    cw = sum(pt.width * sc + 16 for _, pt in parts) + 16
    ch = max(pt.height * sc for _, pt in parts) + 32
    chk = Image.new('RGBA', (cw, ch), (24, 23, 30, 255))
    x = 16
    for nm, pt in parts:
        big = pt.resize((pt.width * sc, pt.height * sc), Image.NEAREST)
        chk.paste(big, (x, 16), big)
        x += big.width + 16
    chk.save(os.path.join(ROOT, 'build-res', 'order', f'{sid}-check.png'))


def frames_main(src, sid, cell=48):
    """효과 프레임 시트(RF-02): 생성기가 그린 옅은 칸 선(마젠타보다 녹색이 조금 있는 분홍)으로 프레임 상자를 찾고,
    상자마다 cell×cell 격자로 칸 가운데 최빈색을 읽는다 → 줄마다 가로 띠 PNG. 칸 선 · 마젠타는 투명으로 지운다."""
    a = np.asarray(Image.open(src).convert('RGB')).astype(int)
    H, W, _ = a.shape
    line = (a[:, :, 0] > 200) & (a[:, :, 2] > 200) & (a[:, :, 1] > 30)
    def runs(prof, n, frac):
        idx = [i for i in range(n) if prof[i] > frac]
        out, cur = [], []
        for i in idx:
            if cur and i > cur[-1] + 2:
                out.append(cur)
                cur = []
            cur.append(i)
        if cur:
            out.append(cur)
        return [(r[0], r[-1]) for r in out]
    cl = runs(line.sum(0), W, H * 0.25)
    rl = runs(line.sum(1), H, W * 0.25)
    # 선 묶음 사이 = 상자 안쪽. 짧은 틈(프레임 사이 여백)은 버린다
    xs = [(cl[i][1] + 1, cl[i + 1][0]) for i in range(len(cl) - 1) if cl[i + 1][0] - cl[i][1] > 100]
    ys = [(rl[i][1] + 1, rl[i + 1][0]) for i in range(len(rl) - 1) if rl[i + 1][0] - rl[i][1] > 100]
    names = NAMES[sid]
    print(f'{sid}: 프레임 {len(xs)}×{len(ys)} · 칸 {cell}도트 · 상자 x{xs[:2]}… y{ys}')
    outdir = os.path.join(ROOT, 'src', 'assets', 'ui', 'fx')
    strips = []
    for r, (y0, y1) in enumerate(ys):
        strip = Image.new('RGBA', (cell * len(xs), cell), (0, 0, 0, 0))
        q = strip.load()
        for f, (x0, x1) in enumerate(xs):
            pw, ph = (x1 - x0) / cell, (y1 - y0) / cell
            for gy in range(cell):
                for gx in range(cell):
                    cx0, cx1 = int(x0 + (gx + 0.25) * pw), int(x0 + (gx + 0.75) * pw) + 1
                    cy0, cy1 = int(y0 + (gy + 0.25) * ph), int(y0 + (gy + 0.75) * ph) + 1
                    blk = a[cy0:cy1, cx0:cx1].reshape(-1, 3)
                    keys = [tuple(c) for c in blk]
                    c = max(set(keys), key=keys.count)
                    if is_key(c):
                        continue
                    n = near(c)
                    if n in DROP:  # 마젠타와 섞인 가장자리 번짐이 진홍 · 분홍으로 잡힌 것 — 반짝임에는 진홍이 없다
                        continue
                    q[f * cell + gx, gy] = (*n, 255)
        nm = names[r].split('/')[-1]
        strip.save(os.path.join(outdir, f'{nm}.png'))
        strips.append(strip)
        print(f'  {nm}: {strip.width}×{strip.height}')
    sc = 4
    chk = Image.new('RGBA', (strips[0].width * sc + 32, sum(s.height * sc + 16 for s in strips) + 16), (24, 23, 30, 255))
    y = 16
    for st in strips:
        big = st.resize((st.width * sc, st.height * sc), Image.NEAREST)
        chk.paste(big, (16, y), big)
        y += big.height + 16
    chk.save(os.path.join(ROOT, 'build-res', 'order', f'{sid}-check.png'))


if __name__ == '__main__':
    if sys.argv[2] in FRAME_SHEETS:
        frames_main(sys.argv[1], sys.argv[2])
        sys.exit(0)
    main(sys.argv[1], sys.argv[2], float(sys.argv[3]) if len(sys.argv) > 3 else None)
