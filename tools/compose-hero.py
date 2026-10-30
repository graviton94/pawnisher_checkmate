"""
주인공 킹 그림 (D-078): 흰 폰 그림 + 사용자 시안 왕관을 한 장으로 굽는다 (판 위·아이콘 모두 같은 그림).
왕관 폭 = 폰 머리 가장 넓은 폭의 0.8, 왕관 아랫단이 머리 꼭대기 둥근 부분을 덮도록 얹는다 (반듯이).
폰 부분은 원래 그림과 같은 자리·크기 그대로, 왕관만큼 위로 키가 커진다.
출력: public/pieces/hero-{s,l}.png  ·  사용: python3 -I tools/compose-hero.py
"""
from PIL import Image

CROWN = Image.open('build-res/order/crown-concept-clean.png').convert('RGBA')
WIDTH_OF_HEAD = 0.8   # 왕관 폭 / 머리 최대 폭 (사용자: 조금 작게)
SEAT = 0.25            # 왕관 아랫단 높이 = 그림 높이의 이만큼 (머리 꼭대기 둥근 부분이 왕관 띠 안으로 들어간다)


def compose(size):
    pawn = Image.open(f'public/pieces/{size}-P0.png').convert('RGBA')
    w, h = pawn.size
    px = pawn.load()
    head = max(sum(1 for x in range(w) if px[x, y][3] > 128) for y in range(int(h * 0.3)))
    cw = round(head * WIDTH_OF_HEAD)
    ch = round(CROWN.size[1] * cw / CROWN.size[0])
    crown = CROWN.resize((cw, ch), Image.LANCZOS)
    cp = crown.load()
    for y in range(ch):
        for x in range(cw):
            r, g, b, a = cp[x, y]
            cp[x, y] = (r, g, b, 255 if a > 128 else 0)
    bottom = round(h * SEAT)
    extra = max(0, ch - bottom)
    out = Image.new('RGBA', (w, h + extra), (0, 0, 0, 0))
    out.alpha_composite(pawn, (0, extra))
    out.alpha_composite(crown, ((w - cw) // 2, extra + bottom - ch))
    out.save(f'public/pieces/hero-{size}.png')
    print(size, out.size, 'extra', extra)
    return extra / h


for s in ('s', 'l'):
    compose(s)
