"""
사건 소품 도트 (D-251, 사용자: 「상자 · 슬롯머신은 도트 에셋으로 찍고, 획득은 별도 오버레이로 · 코인은 회전 묘사(정면 → 비스듬히 테 두께 → 옆면 → 반대)」).
보낸 참고 그림의 문법: 굵은 어두운 테 · 판자 줄 · 금속 띠 · 왼위 빛 · 오른아래 그림자 · 단계 색(섞지 않음). 색은 우리 세계(황동 · 나무 · 강철).
출력: public/ui/props/*.png (1도트 = 1px, 게임에서 3배)
사용: python3 -I tools/pixel/props.py
"""
import math
import os

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'public', 'ui', 'props')

OL = (26, 16, 20)  # 어두운 갈색 테 (참고 그림처럼 검정보다 따뜻하게)
GOLD = [(90, 52, 18), (150, 92, 28), (204, 136, 40), (236, 178, 64), (252, 216, 112), (255, 244, 196)]
WOOD = [(52, 22, 18), (86, 36, 28), (122, 54, 38), (150, 72, 48), (176, 94, 62)]
STEEL = [(40, 44, 56), (70, 76, 92), (110, 118, 136), (160, 168, 184), (214, 220, 230)]
RED = [(92, 18, 24), (150, 30, 36), (210, 52, 52), (246, 106, 96)]
TEAL = [(16, 70, 76), (40, 138, 144), (95, 212, 216), (190, 246, 246)]
PAPER = [(196, 188, 170), (233, 226, 212), (252, 250, 244)]


class Img:
    def __init__(self, w, h):
        self.im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        self.w, self.h = w, h

    def px(self, x, y, c):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < self.w and 0 <= y < self.h and c is not None:
            self.im.putpixel((x, y), c + (255,) if len(c) == 3 else c)

    def get(self, x, y):
        return self.im.getpixel((x, y)) if 0 <= x < self.w and 0 <= y < self.h else (0, 0, 0, 0)

    def rect(self, x, y, w, h, c):
        for j in range(y, y + h):
            for i in range(x, x + w):
                self.px(i, j, c)

    def hline(self, x0, x1, y, c):
        for i in range(x0, x1 + 1):
            self.px(i, y, c)

    def vline(self, x, y0, y1, c):
        for j in range(y0, y1 + 1):
            self.px(x, j, c)

    def outline(self, c=OL):
        """채운 모양 바깥에 1칸 테"""
        src = self.im.copy()
        for y in range(self.h):
            for x in range(self.w):
                if src.getpixel((x, y))[3]:
                    continue
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < self.w and 0 <= ny < self.h and src.getpixel((nx, ny))[3] and src.getpixel((nx, ny))[:3] != c:
                        self.px(x, y, c)
                        break

    def save(self, name, scale=1):
        os.makedirs(OUT, exist_ok=True)
        im = self.im if scale == 1 else self.im.resize((self.w * scale, self.h * scale), Image.NEAREST)
        im.save(os.path.join(OUT, name))


# ── 동전 (18×18, 8장) ──
def coin_frame(phase):
    """phase 0..7: 0 정면(앞) · 1 비스듬 · 2 거의 옆 · 3 옆면(줄무늬) · 4 거의 옆(뒤) · 5 비스듬(뒤) · 6 정면(뒤) · 7 비스듬(뒤→앞)"""
    S = 18
    img = Img(S, S)
    cx, cy, R = 8.5, 8.5, 7.5
    widths = [1.0, 0.72, 0.38, 0.0, 0.38, 0.72, 1.0, 0.72]
    k = widths[phase]
    back = phase in (4, 5, 6)
    thick = 2 if 0 < k < 1 else 0  # 비스듬하면 테 두께(오른쪽)
    if k == 0:
        # 옆면: 세로 막대, 가로 줄무늬
        for y in range(1, 17):
            img.rect(7, y, 4, 1, GOLD[3] if y % 3 else GOLD[1])
            img.px(7, y, GOLD[4] if y % 3 else GOLD[2])
        img.outline()
        return img
    rx = max(1.0, R * k)
    # 테 두께: 면 오른쪽에 어두운 띠 (줄무늬)
    for y in range(S):
        for x in range(S):
            dx, dy = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / R
            d = dx * dx + dy * dy
            ex = (x + 0.5 - cx - thick) / rx
            de = ex * ex + dy * dy
            if de <= 1 and d > 1 and thick:
                img.px(x, y, GOLD[2] if y % 3 else GOLD[1])
            if d <= 1:
                # 면: 바깥 고리(밝음) · 안 면 · 왼위 빛 · 오른아래 그림자
                ring = d > 0.62
                face = GOLD[3] if not back else GOLD[2]
                c = GOLD[4] if ring else face
                if ring and dx + dy > 0.5:
                    c = GOLD[2]
                if not ring and dx + dy < -0.55:
                    c = GOLD[4]
                img.px(x, y, c)
    # 반짝: 왼위 흰 점 두 개 (참고 그림)
    img.px(cx - rx * 0.45, cy - R * 0.6, GOLD[5])
    if rx > 4:
        img.px(cx - rx * 0.45 + 1, cy - R * 0.6, GOLD[5])
        img.px(cx + rx * 0.55, cy + R * 0.35, GOLD[5])
    # 앞 = 민무늬 면(참고 그림) · 뒤 = 어두운 면에 톱니 고리 (앞뒤가 한눈에)
    if k >= 0.72 and back:
        for a in range(10):
            ang = a * math.pi / 5
            img.px(cx + math.cos(ang) * 3.4 * k - 0.5, cy + math.sin(ang) * 3.4 - 0.5, GOLD[1])
        img.rect(int(cx - 1.5), int(cy - 1.5), 2, 2, GOLD[1])
    img.outline()
    return img


# ── 상자 (32×26 닫힘 · 열림 3단) ──
def chest(open_k=0):
    W, H = 34, 30
    img = Img(W, H)
    bx, by, bw, bh = 2, 14, 30, 14  # 몸통
    # 몸통 판자 (가로 줄) — 참고 그림 1번
    for y in range(by, by + bh):
        for x in range(bx, bx + bw):
            band = (y - by) % 4
            c = WOOD[2] if band else WOOD[1]
            if x < bx + 2:
                c = WOOD[3]
            img.px(x, y, c)
    img.hline(bx, bx + bw - 1, by + bh - 1, WOOD[0])
    # 금속 띠: 모서리 · 아래 · 위 테
    for x0 in (bx, bx + bw - 3):
        img.rect(x0, by, 3, bh, GOLD[2])
        img.vline(x0, by, by + bh - 1, GOLD[3])
    img.rect(bx, by, bw, 2, GOLD[2])
    img.hline(bx, bx + bw - 1, by, GOLD[4])
    img.rect(bx, by + bh - 2, bw, 2, GOLD[1])
    # 자물쇠
    lx = bx + bw // 2 - 2
    img.rect(lx, by + 1, 5, 6, GOLD[3])
    img.rect(lx + 1, by + 2, 3, 3, GOLD[4])
    img.rect(lx + 2, by + 3, 1, 2, OL)
    if open_k == 0:
        # 닫힌 뚜껑 (반원통): 판자 줄 · 모서리 금속 띠 · 아래 경첩 테
        lh = 12
        ly = by - lh
        for y in range(ly, by):
            for x in range(bx, bx + bw):
                t = (y - ly) / lh
                c = WOOD[3] if t < 0.35 else WOOD[2]
                if (y - ly) % 4 == 3:
                    c = WOOD[1]
                img.px(x, y, c)
        for x0 in (bx, bx + bw - 3):
            img.rect(x0, ly, 3, lh, GOLD[2])
            img.vline(x0, ly, by - 1, GOLD[3])
        img.rect(bx, by - 2, bw, 2, GOLD[1])
        img.hline(bx + 1, bx + bw - 2, ly, GOLD[4])
    else:
        # 열림: 뚜껑이 뒤로 젖혀져 위에 얇게 서고(안쪽 판자가 보임), 몸통 입에서 금빛이 넘친다
        lh = 9 if open_k == 1 else 5
        ly = by - 2 - lh - (2 if open_k == 1 else 0)
        for y in range(ly, ly + lh):
            for x in range(bx + 1, bx + bw - 1):
                img.px(x, y, WOOD[1] if (y - ly) % 3 == 2 else WOOD[2])
        for x0 in (bx + 1, bx + bw - 4):
            img.rect(x0, ly, 3, lh, GOLD[1])
        img.hline(bx + 1, bx + bw - 2, ly, GOLD[3])
        # 입: 안쪽 어둠 · 금 더미 윗면 · 반짝
        img.rect(bx + 3, by - 2, bw - 6, 4, (30, 14, 12))
        for x in range(bx + 4, bx + bw - 4):
            img.px(x, by - 1 + (x % 3 == 0), GOLD[4] if x % 2 else GOLD[3])
        img.px(bx + 8, by - 2, GOLD[5]); img.px(bx + 20, by - 2, GOLD[5])
    img.outline()
    return img


# ── 뽑기 기계 (44×58) ──
def slot(lever_down=False):
    W, H = 48, 60
    img = Img(W, H)
    bx, by, bw, bh = 4, 14, 34, 40
    # 몸통 (황동) — 왼위 빛 · 오른쪽 그림자
    for y in range(by, by + bh):
        for x in range(bx, bx + bw):
            c = GOLD[3]
            if x < bx + 3:
                c = GOLD[4]
            elif x > bx + bw - 5:
                c = GOLD[2]
            img.px(x, y, c)
    img.hline(bx, bx + bw - 1, by, GOLD[5])
    # 간판 (위): 톱니 문장 + 붉은 띠
    img.rect(bx + 3, 3, bw - 6, 11, RED[1])
    img.rect(bx + 3, 3, bw - 6, 2, RED[2])
    img.hline(bx + 4, bx + bw - 5, 3, RED[3])
    gx, gy = bx + bw // 2, 8
    for a in range(8):
        ang = a * math.pi / 4
        img.px(gx + round(math.cos(ang) * 4) - 0.5, gy + round(math.sin(ang) * 4) - 0.5, GOLD[4])
    for y in range(gy - 3, gy + 3):
        for x in range(gx - 3, gx + 3):
            if (x + 0.5 - gx) ** 2 + (y + 0.5 - gy) ** 2 <= 8:
                img.px(x, y, GOLD[3])
    img.rect(gx - 1, gy - 1, 2, 2, RED[0])
    for i in range(6):
        img.px(bx + 5 + i * 5, 12, (255, 244, 196) if i % 2 == 0 else GOLD[2])
    # 바퀴 창 (흰 바탕 3칸 — 그림은 게임이 그린다)
    wy = by + 5
    img.rect(bx + 3, wy, bw - 6, 15, OL)
    for r in range(3):
        x0 = bx + 4 + r * 9
        img.rect(x0, wy + 1, 8, 13, PAPER[1])
        img.rect(x0, wy + 1, 8, 2, PAPER[0])
        img.rect(x0, wy + 12, 8, 2, PAPER[0])
    # 버튼 셋
    for r in range(3):
        x0 = bx + 6 + r * 9
        img.rect(x0, by + 23, 4, 3, RED[2])
        img.hline(x0, x0 + 3, by + 23, RED[3])
    # 배출구
    img.rect(bx + 9, by + 29, 16, 8, OL)
    img.rect(bx + 10, by + 30, 14, 6, (60, 26, 16))
    img.hline(bx + 10, bx + 23, by + 30, (90, 40, 24))
    # 다리
    img.rect(bx + 2, by + bh, 6, 4, GOLD[2])
    img.rect(bx + bw - 8, by + bh, 6, 4, GOLD[2])
    # 레버
    lx = bx + bw + 2
    if lever_down:
        img.rect(lx, by + 18, 2, 10, STEEL[3])
        img.rect(lx - 1, by + 27, 4, 4, RED[2])
        img.px(lx, by + 27, RED[3])
    else:
        img.rect(lx, by + 6, 2, 14, STEEL[3])
        img.vline(lx, by + 6, by + 19, STEEL[4])
        img.rect(lx - 1, by + 3, 4, 4, RED[2])
        img.px(lx, by + 3, RED[3])
    img.rect(lx - 2, by + 18, 2, 4, STEEL[2])
    img.outline()
    return img


# ── 바퀴 그림 (8×9): 부품 · 승급 · 꽝 ──
def symbol(kind):
    img = Img(8, 9)
    if kind == 'part':
        for y in range(9):
            for x in range(8):
                if (x + 0.5 - 4) ** 2 + (y + 0.5 - 4.5) ** 2 <= 10:
                    img.px(x, y, GOLD[3])
        for x, y in ((3, 0), (4, 0), (0, 4), (7, 4), (3, 8), (4, 8)):
            img.px(x, y, GOLD[3])
        img.rect(3, 4, 2, 2, OL)
        img.px(2, 2, GOLD[5])
    elif kind == 'up':
        for i in range(4):
            img.hline(3 - i, 4 + i, 1 + i, TEAL[2])
        img.rect(2, 5, 4, 4, TEAL[1])
        img.vline(2, 5, 8, TEAL[3])
        img.px(3, 1, TEAL[3])
    else:
        # 해골 대신 붉은 X 볼트 (공장)
        for i in range(7):
            img.px(i, i + 1, RED[2])
            img.px(i + 1, i + 1, RED[1])
            img.px(6 - i, i + 1, RED[2])
            img.px(7 - i, i + 1, RED[1])
    img.outline()
    return img


# ── 슬롯 바퀴 그림 (16×16, D-253): 7 · 부품 톱니 · 왕관 · 나사 · 부서진 톱니 ──
def reel_symbol(kind):
    img = Img(16, 16)
    if kind == 'seven':
        # 굵은 붉은 7 (가로획 4줄 · 사선 4칸 폭) + 왼위 빛 · 오른쪽 그림자
        img.rect(1, 1, 14, 4, RED[2])
        img.hline(1, 14, 1, RED[3])
        for i in range(10):
            x = 10 - int(i * 0.55)
            img.rect(x, 5 + i, 4, 1, RED[2])
            img.px(x, 5 + i, RED[3])
            img.px(x + 3, 5 + i, RED[1])
        img.rect(13, 1, 2, 4, RED[1])
    elif kind == 'gear':
        for y in range(16):
            for x in range(16):
                d = ((x + 0.5 - 8) ** 2 + (y + 0.5 - 8) ** 2) ** 0.5
                a = math.atan2(y + 0.5 - 8, x + 0.5 - 8)
                tooth = (math.cos(a * 8) > 0.3)
                if d <= 4.6 or (d <= 6.8 and tooth):
                    c = GOLD[3]
                    if x + y < 13:
                        c = GOLD[4]
                    if x + y > 19:
                        c = GOLD[2]
                    img.px(x, y, c)
        img.rect(7, 7, 2, 2, OL)
        img.px(5, 5, GOLD[5])
    elif kind == 'crown':
        base = [(2, 12), (13, 12)]
        img.rect(2, 10, 12, 4, GOLD[3])
        img.hline(2, 13, 10, GOLD[4])
        for cx in (2, 7, 12):
            for i in range(6):
                img.hline(cx + (1 if cx == 7 else 0) - i // 3, cx + (1 if cx == 7 else 0) + i // 3, 9 - i, GOLD[3])
        img.px(3, 4, GOLD[5]); img.px(8, 3, GOLD[5]); img.px(13, 4, GOLD[5])
        img.px(7, 12, RED[2]); img.px(8, 12, RED[2]); img.px(4, 12, TEAL[2]); img.px(11, 12, TEAL[2])
    elif kind == 'screw':
        # 나사 머리 + 몸통 (강철)
        img.rect(4, 2, 8, 4, STEEL[3])
        img.hline(4, 11, 2, STEEL[4])
        img.rect(7, 2, 2, 4, STEEL[1])
        for y in range(6, 14):
            img.rect(6, y, 4, 1, STEEL[2] if y % 2 else STEEL[3])
        img.px(7, 14, STEEL[2])
    else:  # broken: 금 간 회색 톱니 (꽝)
        for y in range(16):
            for x in range(16):
                d = ((x + 0.5 - 8) ** 2 + (y + 0.5 - 8) ** 2) ** 0.5
                a = math.atan2(y + 0.5 - 8, x + 0.5 - 8)
                if (d <= 4.6 or (d <= 6.8 and math.cos(a * 8) > 0.3)) and not (x > 8 and y < 7):
                    img.px(x, y, STEEL[2] if x + y > 16 else STEEL[3])
        for i in range(7):
            img.px(5 + i, 3 + i + (i % 2), OL)
    img.outline()
    return img


def main():
    for i in range(8):
        coin_frame(i).save(f'coin-{i}.png')
    for k in range(3):
        chest(k).save(f'chest-{k}.png')
    slot(False).save('slot.png')
    slot(True).save('slot-pull.png')
    for k in ('part', 'up', 'miss'):
        symbol(k).save(f'sym-{k}.png')
    for k in ('seven', 'gear', 'crown', 'screw', 'broken'):
        reel_symbol(k).save(f'reel-{k}.png')
    # 확인용 낱장 (배율 4, 투명 바탕 위)
    sheet = Image.new('RGBA', (18 * 8 * 4 + 34 * 3 * 4 + 48 * 4 * 2, 60 * 4), (240, 236, 232, 255))
    x = 0
    for i in range(8):
        im = Image.open(os.path.join(OUT, f'coin-{i}.png')).resize((72, 72), Image.NEAREST)
        sheet.alpha_composite(im, (x, 0)); x += 72
    for k in range(3):
        im = Image.open(os.path.join(OUT, f'chest-{k}.png')).resize((136, 120), Image.NEAREST)
        sheet.alpha_composite(im, (x, 0)); x += 136
    for n in ('slot', 'slot-pull'):
        im = Image.open(os.path.join(OUT, f'{n}.png')).resize((192, 240), Image.NEAREST)
        sheet.alpha_composite(im, (x, 0)); x += 192
    sheet.save(os.path.join(ROOT, 'build-res', 'props-sheet.png'))
    print('ok')


if __name__ == '__main__':
    main()
