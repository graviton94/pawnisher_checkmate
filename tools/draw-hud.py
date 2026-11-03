"""
전투 레일 HUD 도트를 직접 찍는다 (D-211, 사용자: "이펙트 · 버튼 · 카드 그라데이션이 우리 도트 철학과 안 맞는다").
규칙 (art-bible · D-044/047): 도트 1개 = 1px로 저장, 화면은 정수배(--px 2px)로 키운다. 단색 칸만 — 그라데이션 · 둥근 모서리 · 번짐 없음.
검은 바깥선 1도트 + 위/왼쪽 밝은 1도트 + 아래 단단한 그림자. 회전은 90도 단위만(도트가 깨지지 않는다).

출력 src/assets/ui/kit/ (Vite가 묶는다 — base './'라 public 절대 경로는 Electron에서 깨진다)
  mag-<P|N|B|R|Q|K|any>.png  탄창 한 발 머리판 9-slice (slice 5) (왼쪽 2도트 = 기물 색 띠, 네 귀퉁이 리벳)
  mag-body.png               펼친 몸 칸 9-slice (오목 홈 — 위 · 왼쪽 그늘)
  socket.png / socket-lit.png / socket-bonus.png   태엽 열쇠 구멍 (팔각)
  key-spin.png               열쇠 5칸 띠: 0° · 90° · 180° · 270° · 빈 열쇠 (쓰면 거꾸로 돌며 풀린다)
  tube.png                   진공관 5칸 띠: 켜짐 A · 켜짐 B(떨림) · 번쩍 · 불씨 · 꺼짐
  cog-help.png               도움말 — 태엽 톱니 안에 ?
  ico-rewind.png             ◀◀
  gauge.png                  계기 창 9-slice (태엽 · 속전 창)

사용: python3 -I tools/draw-hud.py
"""
import os

from PIL import Image

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
    # 18×18: 바깥 테(R) 1도트 + 안쪽 빛 테(L) 1도트 + 검은 구멍 — 16도트 열쇠가 구멍 안에 들어간다
    n = 18
    cut = 5
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


if __name__ == '__main__':
    for t, tone in TONES.items():
        save(mag(tone), f'mag-{t}.png')
    save(art(BODY), 'mag-body.png')
    save(art(GAUGE), 'gauge.png')
    save(socket(PAL['l'], PAL['d']), 'socket.png')
    save(socket(PAL['b'], PAL['O']), 'socket-lit.png')
    save(socket(PAL['j'], PAL['G']), 'socket-bonus.png')
    # 열쇠: 기존 태엽 도트(tools/draw-assets.py)를 90도씩 돌린다 — 도트가 그대로 남는 회전만
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
    save(art(COG), 'cog-help.png')
    save(art(REW), 'ico-rewind.png')
    print('ok')
