"""
전투 레일 HUD 도트를 직접 찍는다 (D-211, 사용자: "이펙트 · 버튼 · 카드 그라데이션이 우리 도트 철학과 안 맞는다").
규칙 (art-bible · D-044/047): 도트 1개 = 1px로 저장, 화면은 정수배(--px 2px)로 키운다. 단색 칸만 — 그라데이션 · 둥근 모서리 · 번짐 없음.
검은 바깥선 1도트 + 위/왼쪽 밝은 1도트 + 아래 단단한 그림자. 회전은 90도 단위만(도트가 깨지지 않는다).

출력 src/assets/ui/kit/ (Vite가 묶는다 — base './'라 public 절대 경로는 Electron에서 깨진다)
  mag-<P|N|B|R|Q|K|any>.png  탄창 한 발 머리판 9-slice (slice 5) (왼쪽 2도트 = 기물 색 띠, 네 귀퉁이 리벳)
  mag-body.png               펼친 몸 칸 9-slice (오목 홈 — 위 · 왼쪽 그늘)
  socket.png / socket-lit.png / socket-bonus.png   태엽 열쇠 구멍 (팔각)
  key-spin.png               열쇠 5칸 띠: 0° · 90° · 180° · 270° · 빈 열쇠 (쓰면 거꾸로 돌며 풀린다)
  tube.png                   (예전) 진공관 띠 — D-212에서 보일러관으로 바뀜
  pipe.png · cap-l/r.png · lava.png · tick.png   속전 보일러관: 관 틀 · 황동 마개 · 끓는 쇳물 무늬 · 칸 눈금
  cog-help.png               도움말 — 태엽 톱니 안에 ?
  ico-rewind.png             ◀◀
  frame-rare.png · frame-gold.png · twinkle.png   보상 등급 테두리 · 황금 반짝임 4칸 (D-216)
  gauge.png                  계기 창 9-slice (태엽 · 속전 창)

사용: python3 -I tools/draw-hud.py
"""
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'pixel'))
import hud_icons  # noqa: E402

OUT = 'src/assets/ui/kit'
K = (0x0B, 0x0B, 0x0E)
HEX = lambda s: tuple(int(s[i:i + 2], 16) for i in (1, 3, 5))
PAL = {
    'k': K, 'i': (0x16, 0x14, 0x1C), 'd': (0x2F, 0x2E, 0x36), 'm': (0x3D, 0x3B, 0x45), 'l': (0x56, 0x54, 0x5E),
    'g': (0x8A, 0x87, 0x94), 'h': (0xC8, 0xC8, 0xC8), 'w': (0xF4, 0xF1, 0xEA),
    'y': (0xC8, 0x9B, 0x3C), 'Y': (0xF4, 0xD2, 0x7A), 'b': (0x8C, 0x62, 0x39), 'o': (0xFA, 0xCC, 0x15),
    'O': (0xFF, 0x9A, 0x3C), 'e': (0xA8, 0x40, 0x1A), 'E': (0x5A, 0x20, 0x14), 'W': (0xFF, 0xF4, 0xD6),
    'c': (0x38, 0xBD, 0xF8), 'G': (0x5F, 0xE0, 0xA8), 'j': (0x1F, 0x6A, 0x4C),
}
TONES = {'P': '#9aa7b8', 'N': '#5fc28a', 'B': '#b07ae8', 'R': '#e88a4a', 'Q': '#e85a8a', 'K': '#f4d27a', 'any': '#4ec3d6'}


def art(rows, pal=PAL):
    w = max(len(r) for r in rows)
    im = Image.new('RGBA', (w, len(rows)), (0, 0, 0, 0))
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch != '.':
                im.putpixel((x, y), pal[ch] + (255,))
    return im


def save(im, name):
    os.makedirs(OUT, exist_ok=True)
    im.save(f'{OUT}/{name}')


def dark(c, f=0.55):
    return tuple(int(v * f) for v in c)


# ---------- 탄 머리판 (16×16, slice 4) ----------
def mag(tone):
    t = HEX(tone)
    p = dict(PAL, T=t, t=dark(t))
    rows = []
    for y in range(16):
        r = ''
        for x in range(16):
            edge = x in (0, 15) or y in (0, 15)
            if edge:
                r += '.' if (x in (0, 15) and y in (0, 15)) else 'k'
            elif x == 1:
                r += 'T'
            elif x == 2:
                r += 't'
            elif y == 1:
                r += 'l'
            elif y == 14:
                r += 'i'
            elif x == 14:
                r += 'i'
            else:
                r += 'd'
        rows.append(r)
    im = art(rows, p)
    for rx, ry in ((4, 3), (11, 3), (4, 11), (11, 11)):  # 리벳: 밝은 점 + 아래 그늘 (9-slice 귀퉁이 5도트 안 — 늘어나지 않는다)
        im.putpixel((rx, ry), PAL['g'] + (255,))
        im.putpixel((rx, ry + 1), PAL['i'] + (255,))
    return im


# ---------- 펼친 몸 칸 (8×8, slice 2): 위 · 왼쪽 그늘 2도트, 아래 · 오른쪽 밝은 1도트 ----------
BODY = [
    'kkkkkkkk',
    'kiiiiiil',
    'kiddddml',
    'kiddddml',
    'kiddddml',
    'kiddddml',
    'kimmmmml',
    'klllllll',
]

# ---------- 계기 창 (12×12, slice 4): 검은 틀 · 오목한 검은 창 · 리벳 ----------
GAUGE = [
    '.kkkkkkkkkk.',
    'kllllllllllk',
    'klgkkkkkkgdk',
    'klkiiiiiiidk',
    'klkiiiiiiidk',
    'klkiiiiiiidk',
    'klkiiiiiiidk',
    'klkiiiiiiidk',
    'klkiiiiiiidk',
    'klgdddddddgk',
    'kddddddddddk',
    '.kkkkkkkkkk.',
]

# ---------- 태엽 열쇠 구멍 (팔각 14×14) ----------
def socket(rim, glow):
    p = dict(PAL, R=rim, L=glow)
    # 16×16 (D-212: 5칸이 한 줄에 — 열쇠와 같은 크기): 바깥 테(R) 1도트 + 안쪽 빛 테(L) 1도트 + 검은 구멍 — 16도트 열쇠가 구멍 안에 들어간다
    n = 16
    cut = 4
    rows = []
    for y in range(n):
        r = ''
        for x in range(n):
            d = min(x, y, n - 1 - x, n - 1 - y)
            dd = min(x + y, (n - 1 - x) + y, x + (n - 1 - y), (n - 1 - x) + (n - 1 - y))
            if dd < cut:
                r += '.'
            elif d == 0 or dd == cut:
                r += 'k'
            elif d == 1 or dd == cut + 1:
                r += 'R'
            elif d == 2 or dd == cut + 2:
                r += 'L'
            else:
                r += 'k'
        rows.append(r)
    return art(rows, p)


# ---------- 진공관 (6×14 한 칸, 5칸 띠) ----------
def tube(fill, fil, glow=None):
    """fill = 유리 속 색, fil = 필라멘트 색, glow = 유리 테 바깥에 찍는 빛 점 (번짐 대신 점 두 개)"""
    p = dict(PAL, F=fill, f=fil, X=glow or K)
    rows = [
        '.kkkk.',
        'kFFFFk',
        'kFFFFk',
        'kFffFk',
        'kFffFk',
        'kFffFk',
        'kFffFk',
        'kFFFFk',
        'kFFFFk',
        'kkkkkk',
        'kybbyk',
        'kbyybk',
        'kkkkkk',
        '.k..k.',
    ]
    im = art(rows, p)
    if glow:
        for y in (2, 5):
            im.putpixel((0, y), glow + (255,))
            im.putpixel((5, y), glow + (255,))
    return im


def strip(frames):
    w, h = frames[0].size
    im = Image.new('RGBA', (w * len(frames), h), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        im.paste(f, (i * w, 0))
    return im


# ---------- 도움말 톱니 (16×16): 8개 이 · 황동 · 가운데 ? ----------
COG = [
    '......kkkk......',
    '...kk.kYYk.kk...',
    '..kYYkkYYkkYYk..',
    '..kYYYYYYYYYYk..',
    '...kYYyyyyYYk...',
    '.kkYYykkkkyYYkk.',
    'kYYYykkwwkkyYYYk',
    'kYYYykkkwkkyYYYk',
    'kYYYykkwwkkyYYYk',
    'kYYYykkwkkkyYYYk',
    '.kkYYykkkkyYYkk.',
    '...kYYywkyYYk...',
    '..kYYYyyyyYYYk..',
    '..kYYkkYYkkYYk..',
    '...kk.kYYk.kk...',
    '......kkkk......',
]

# ---------- 되감기 ◀◀ (11×7) ----------
REW = [
    '...kk...kk.',
    '..kwk..kwk.',
    '.kwwk.kwwk.',
    'kwwwkkwwwk.',
    '.kwwk.kwwk.',
    '..kwk..kwk.',
    '...kk...kk.',
]

# ---------- 속전 보일러관 (D-212, 사용자: 진공관도 별로 — 끓는 쇳물 게이지) ----------
# 관 틀 6×6 (slice 2): 검은 선 + 위 유리 반사 1도트 + 아래 그늘. 안은 비면 검은 유리.
PIPE = [
    'kkkkkk',
    'kmmmmk',
    'kiiiik',
    'kiiiik',
    'kddddk',
    'kkkkkk',
]
# 황동 마개 4×14 (왼쪽 · 오른쪽은 좌우 뒤집기): 볼트 머리 두 개
CAP = [
    '.kkk',
    'kyYk',
    'kybk',
    'kYyk',
    'kybk',
    'kyyk',
    'kbbk',
    'kyyk',
    'kYyk',
    'kybk',
    'kYyk',
    'kybk',
    'kbbk',
    '.kkk',
]
# 쇳물 한 장 14×10 (한 칸 = 7도트, 두 칸 무늬) — 위 표면은 끓어 오르는 거품 자리가 비고, 속엔 밝은 기포
LAVA = [
    'YY.YYYYYY.YYYY',
    'OYOOOOOYOOOOYO',
    'OOOOWOOOOOOOOO',
    'OOOOOOOOOYOOOO',
    'OOYOOOOOOOOOOO',
    'OOOOOOOWOOOOYO',
    'OOOOOOOOOOOOOO',
    'eOOOOeOOOOOeOO',
    'eeeeeeeeeeeeee',
    'EeeeEeeeeEeeee',
]
# 눈금 7×10: 칸 경계에 검은 선 (빈 유리에서도 칸이 보인다)
TICK = ['......E'] * 10

# ---------- 등급 테두리 (D-216): 16×16 slice 5 — 가운데가 비어 카드 위에 덧씌운다 ----------
def grade_frame(outer, inner, hi, studs):
    """outer = 바깥 2도트 띠, inner = 안쪽 1도트, hi = 위 · 왼쪽 하이라이트, studs = 귀퉁이 장식 색"""
    p = dict(PAL, A=outer, B=inner, H=hi, S=studs)
    rows = []
    for y in range(16):
        r = ''
        for x in range(16):
            d = min(x, y, 15 - x, 15 - y)
            if d == 0:
                r += '.' if (x in (0, 15) and y in (0, 15)) else 'k'
            elif d == 1:
                r += 'H' if (x == 1 or y == 1) and not (x == 15 - 1 or y == 15 - 1) else 'A'
            elif d == 2:
                r += 'A'
            elif d == 3:
                r += 'B'
            else:
                r += '.'
        rows.append(r)
    im = art(rows, p)
    for cx, cy in ((2, 2), (13, 2), (2, 13), (13, 13)):  # 귀퉁이 마름모 장식 (slice 5 안)
        for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)):
            im.putpixel((cx + dx, cy + dy), studs + (255,))
        im.putpixel((cx, cy), PAL['W'] + (255,))
    return im

# 반짝임 4칸 띠 (7×7): 점 → 십자 → 큰 십자 → 점 — 황금 카드 귀퉁이에서 돈다
TWINKLE = [
    ['.......', '.......', '.......', '...W...', '.......', '.......', '.......'],
    ['.......', '.......', '...Y...', '..YWY..', '...Y...', '.......', '.......'],
    ['...Y...', '...Y...', '...W...', 'YYWWWYY', '...W...', '...Y...', '...Y...'],
    ['.......', '...Y...', '.......', '.Y.W.Y.', '.......', '...Y...', '.......'],
]

# ---------- 도트 방사선 (D-216 6): 원뿔 그라데이션 빛줄기를 대신하는 112×112 도트 — 쐐기 경계에 번짐 없음 ----------
import math as _m
def rays(color, alpha, period, width, n=112):
    im = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    c = (n - 1) / 2
    for y in range(n):
        for x in range(n):
            dx, dy = x - c, y - c
            r = _m.hypot(dx, dy)
            if r > c or r < 3:
                continue
            a = (_m.degrees(_m.atan2(dy, dx)) + 360) % period
            if a < width:
                im.putpixel((x, y), color + (alpha,))
    return im

# ---------- 카드 얼굴 (D-217 3): 24×32 9-slice (위 9 · 양옆 4 · 아래 5) — 위는 이름 머리띠, 가운데는 비움 ----------
def card_frame(rim, hi, band, shade, lights=None, shimmer=None):
    """lights = 황금 테 위를 도는 불빛 위상(0~3), shimmer = 희귀 테 반짝임 위상(0~1)"""
    W, H = 24, 32
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    def put(x, y, c):
        im.putpixel((x, y), c + (255,))
    perim = []
    for y in range(H):
        for x in range(W):
            corner = (x in (0, W - 1)) and (y in (0, H - 1))
            if corner:
                continue
            if x in (0, W - 1) or y in (0, H - 1):
                put(x, y, K)
            elif x in (1, W - 2) or y in (1, H - 2) or y == 8:
                put(x, y, hi if (y == 1 or x == 1) and y != 8 else rim)
                if x in (1, W - 2) or y in (1, H - 2):
                    perim.append((x, y))
            elif y <= 7:
                put(x, y, band)
            elif x == 2 or y == 9:
                put(x, y, shade)
            elif x == W - 3 or y == H - 3:
                put(x, y, shade)
    if lights is not None:
        # 테를 시계 방향으로 돌며 4칸마다 불빛 — 띠를 넘기면 불빛이 달린다
        ring = sorted(set(perim), key=lambda p: (_m.atan2(p[1] - H / 2, p[0] - W / 2)))
        for k, (x, y) in enumerate(ring):
            if (k + lights) % 4 == 0:
                put(x, y, PAL['W'])
    if shimmer is not None:
        for x in range(3 + shimmer * 2, W - 3, 4):
            put(x, 1, PAL['W'])
    return im

# 등급 보석 9×9 마름모 (아래 테 가운데)
def gem(c1, c2):
    p = dict(PAL, A=c1, B=c2)
    return art(['....k....', '...kAk...', '..kAWAk..', '.kAAAABk.', 'kAAAAABBk', '.kAABBBk.', '..kBBBk..', '...kBk...', '....k....'], p)

# 고물상 가격표 12×12 (slice 4): 황동판 · 위 하이라이트 · 아래 그늘 · 왼쪽 끈 구멍
def tag_plate(face, hi, low):
    p = dict(PAL, F=face, H=hi, L=low)
    return art([
        '.kkkkkkkkkk.',
        'kHHHHHHHHHHk',
        'kHFFFFFFFFLk',
        'kFFFFFFFFFLk',
        'kFkFFFFFFFLk',
        'kFkFFFFFFFLk',
        'kFFFFFFFFFLk',
        'kFFFFFFFFFLk',
        'kFFFFFFFFFLk',
        'kLLLLLLLLLLk',
        '.kkkkkkkkkk.',
        '..kkkkkkkk..',
    ], p)

# 그림 창 바탕 4×4 체크무늬 (두 단계 어두운 철)
WIN = ['ddii', 'ddii', 'iidd', 'iidd']


if __name__ == '__main__':
    for t, tone in TONES.items():
        save(mag(tone), f'mag-{t}.png')
    save(art(BODY), 'mag-body.png')
    save(art(GAUGE), 'gauge.png')
    save(socket(PAL['l'], PAL['d']), 'socket.png')
    save(socket(PAL['b'], PAL['O']), 'socket-lit.png')
    save(socket(PAL['j'], PAL['G']), 'socket-bonus.png')
    # 열쇠: hud_icons가 찍은 태엽 열쇠를 90도씩 돌린다 — 도트가 그대로 남는 회전만
    hud_icons.main()
    full = Image.open('public/ui/hud/key-full.png').convert('RGBA')
    spent = Image.open('public/ui/hud/key-spent.png').convert('RGBA')
    save(strip([full, full.transpose(Image.Transpose.ROTATE_90), full.transpose(Image.Transpose.ROTATE_180), full.transpose(Image.Transpose.ROTATE_270), spent]), 'key-spin.png')
    bonus = Image.open('public/ui/hud/key-bonus.png').convert('RGBA')
    save(strip([bonus, bonus.transpose(Image.Transpose.ROTATE_90), bonus.transpose(Image.Transpose.ROTATE_180), bonus.transpose(Image.Transpose.ROTATE_270), spent]), 'key-spin-bonus.png')
    save(strip([
        tube(PAL['O'], PAL['W'], PAL['e']),   # 켜짐 A
        tube(PAL['e'], PAL['Y'], PAL['E']),   # 켜짐 B (떨림 — 잠깐 어두워짐)
        tube(PAL['W'], PAL['W'], PAL['O']),   # 번쩍
        tube(PAL['E'], PAL['e']),             # 불씨
        tube(PAL['d'], PAL['l']),             # 꺼짐
    ]), 'tube.png')
    save(art(PIPE), 'pipe.png')
    cap = art(CAP)
    save(cap, 'cap-l.png')
    save(cap.transpose(Image.Transpose.FLIP_LEFT_RIGHT), 'cap-r.png')
    save(art(LAVA), 'lava.png')
    save(art(TICK), 'tick.png')
    save(grade_frame(HEX('#3f7fb8'), HEX('#1e3a58'), HEX('#9ec7ef'), HEX('#6fb3e8')), 'frame-rare.png')
    save(grade_frame(HEX('#c89b3c'), HEX('#6b4a14'), HEX('#fff1b0'), HEX('#f4d27a')), 'frame-gold.png')
    save(strip([art(f) for f in TWINKLE]), 'twinkle.png')
    save(rays((255, 255, 255), 115, 11, 2), 'rays-white.png')
    save(rays((250, 204, 21), 82, 22, 8), 'rays-gold.png')
    save(rays((200, 155, 60), 40, 20, 7), 'rays-brass.png')
    save(rays((229, 38, 47), 52, 20, 7), 'rays-red.png')
    save(card_frame(PAL['l'], PAL['g'], (0x24, 0x22, 0x2A), PAL['i']), 'card-common.png')
    for ph in (0, 1):
        save(card_frame(HEX('#3f7fb8'), HEX('#9ec7ef'), HEX('#1e3a58'), HEX('#14243a'), shimmer=ph), f'card-rare-{ph}.png')
    for ph in range(4):
        save(card_frame(HEX('#c89b3c'), HEX('#fff1b0'), HEX('#6b4a14'), HEX('#3a2810'), lights=ph), f'card-gold-{ph}.png')
    save(gem(PAL['g'], PAL['l']), 'gem-common.png')
    save(gem(HEX('#9ec7ef'), HEX('#3f7fb8')), 'gem-rare.png')
    save(gem(HEX('#f4d27a'), HEX('#c89b3c')), 'gem-gold.png')
    save(tag_plate(HEX('#c89b3c'), HEX('#f4d27a'), HEX('#6b4a14')), 'price-tag.png')
    save(tag_plate(PAL['l'], PAL['g'], PAL['d']), 'price-tag-poor.png')
    save(art(WIN), 'win-pattern.png')
    # 도움말 톱니 · 태엽 열쇠는 16칸 아이콘과 같은 그리개로 (tools/pixel/hud_icons.py, 2026-11-05 리뉴얼)
    save(hud_icons.cog_help(), 'cog-help.png')
    save(art(REW), 'ico-rewind.png')
    print('ok')
