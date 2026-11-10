"""조합 컷 (D-313): 발주하지 않은 컷을 받은 그림으로 만든다 — 2 : 1로 자르고(필요하면 어둡게) public/scenes/<이름>.png.
python3 -I tools/scene-compose.py
"""
from PIL import Image, ImageEnhance

S = 'public/scenes/'


def cut21(src, cx=0.5, cy=0.5, zoom=1.0):
    im = Image.open(S + src + '.png').convert('RGB')
    w = min(im.width, im.height * 2) / zoom
    h = w / 2
    x = max(0, min(im.width - w, im.width * cx - w / 2))
    y = max(0, min(im.height - h, im.height * cy - h / 2))
    return im.crop((round(x), round(y), round(x + w), round(y + h)))


def portrait21(src, bg=(11, 11, 14)):
    """정사각 초상을 2 : 1 검은 바탕 가운데에"""
    im = Image.open(S + src + '.png').convert('RGB')
    out = Image.new('RGB', (im.height * 2, im.height), bg)
    out.paste(im, ((out.width - im.width) // 2, 0))
    return out


def dark(im, k):
    return ImageEnhance.Brightness(im).enhance(k)


# S7-2 금칠이 받침에서 차오른다 → 도금왕 초상(첫 겹)
portrait21('boss-gilded').save(S + 'promote-gild.png')
# S7-3 분대가 올려다보며 말린다 → 종이 왕관 폰 · 긁힌 나이트 · 폰 둘 (P-06)
# (받음: C-05 promote-crew — D-314) cut21('prologue-06', cy=0.55).save(S + 'promote-crew.png')
# S7-4 어둠 속 독백 → 상자 속 홀로 남은 폰 (P-04), 어둡게
dark(cut21('prologue-04', cy=0.5), 0.55).save(S + 'promote-dark.png')
# S10 금칠이 벗겨진 도금왕 → 반쪽이 흰 폰으로 드러난 겹 (B-04c)
portrait21('boss-gilded-3').save(S + 'ending-peel.png')
# S10 분대와 퀸 · 룩 · 비숍이 다시 모인다 → 킹 자리가 빈 흰 세트 상자 (P-02)
# (받음: E-03e ending-crew — D-314) cut21('prologue-02', cy=0.6).save(S + 'ending-crew.png')
print('compose ok')
