"""전투 화면 자원 (D-303): 받은 시트 I-12(32칸, tools/pixel/icons32_ext/hud.*.png) → 게임이 읽는 kit 그림.

python3 -I tools/pixel/hud_from_icons.py

- key-spin.png / key-spin-bonus.png: 태엽 열쇠 5프레임 띠 160×32 — 감긴 열쇠 → 반쯤 돈 것 → 옆면 → 반쯤 돈 빈 열쇠 → 빈 열쇠
  (쓰면 0 → 4로, 감으면 4 → 0으로 steps 재생 — 너비만 계단으로 줄였다 늘린다, 1도트 = 1px)
- socket.png · socket-lit.png: 그대로 · socket-bonus.png: 불 켜진 소켓의 쇳물빛을 청록으로 바꾼다
- cog-help.png · ico-rewind.png · op-add.png · op-mul.png · screw.png: 그대로 32×32 · screw16.png: 16칸판
"""
import colorsys
import os

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
EXT = os.path.join(HERE, 'icons32_ext')
KIT = os.path.join(ROOT, 'src', 'assets', 'ui', 'kit')


def load(k):
    return Image.open(os.path.join(EXT, f'{k}.png')).convert('RGBA')


def squash(im, w):
    """가운데 기준으로 너비만 w로 (최근접 — 도트 유지)"""
    out = Image.new('RGBA', im.size, (0, 0, 0, 0))
    box = im.getbbox()
    if not box or w <= 0:
        return out
    crop = im.crop(box)
    nw = max(2, round(crop.width * w / 32))
    s = crop.resize((nw, crop.height), Image.NEAREST)
    out.paste(s, ((32 - nw) // 2, box[1]), s)
    return out


def strip(full, spent):
    frames = [full, squash(full, 16), squash(spent, 4), squash(spent, 16), spent]
    im = Image.new('RGBA', (160, 32), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        im.alpha_composite(f, (i * 32, 0))
    return im


def teal(im):
    """주황 · 노랑(쇳물) 계열 색을 청록으로 — 보너스 소켓"""
    px = im.load()
    out = im.copy()
    op = out.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if not a:
                continue
            h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
            if s > 0.45 and 0.02 < h < 0.17:
                r2, g2, b2 = colorsys.hls_to_rgb(0.47, l, s)
                op[x, y] = (round(r2 * 255), round(g2 * 255), round(b2 * 255), a)
    return out


def main():
    full, spent, bonus = load('hud.key.full'), load('hud.key.spent'), load('hud.key.bonus')
    strip(full, spent).save(os.path.join(KIT, 'key-spin.png'))
    strip(bonus, spent).save(os.path.join(KIT, 'key-spin-bonus.png'))
    load('hud.socket').save(os.path.join(KIT, 'socket.png'))
    lit = load('hud.socket.lit')
    lit.save(os.path.join(KIT, 'socket-lit.png'))
    teal(lit).save(os.path.join(KIT, 'socket-bonus.png'))
    for k, f in (('hud.help', 'cog-help'), ('hud.rewind', 'ico-rewind'), ('hud.add', 'op-add'), ('hud.mul', 'op-mul')):
        load(k).save(os.path.join(KIT, f'{f}.png'))
    load('hud.screw').save(os.path.join(KIT, 'screw.png'))  # 화폐 나사 32칸 (.scr.big)
    Image.open(os.path.join(ROOT, 'public', 'ui', 'icons16', 'hud.screw@16.png')).save(os.path.join(KIT, 'screw16.png'))  # 16칸 (가격표 · 계기)
    print('kit ok')


if __name__ == '__main__':
    main()
