"""원본에서 복원한 상징의 식별 요소를 검사한다. 재생성 해시와는 별개다."""
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / 'src/assets/ui/chrome/v2'


def pixels(name):
    """독립 16도트 상징과 이진 알파를 읽는다."""
    a = np.array(Image.open(ART / f'{name}.png').convert('RGBA'))
    assert a.shape == (16, 16, 4), name
    assert set(np.unique(a[:, :, 3])) <= {0, 255}, name
    return a


def connected(mask):
    """채워진 도형이 끊기지 않았는지 확인한다."""
    yy, xx = np.nonzero(mask)
    assert len(xx)
    im = Image.fromarray(np.uint8(mask) * 255).copy()
    ImageDraw.floodfill(im, (int(xx[0]), int(yy[0])), 128)
    return np.count_nonzero(np.asarray(im) == 128) == len(xx)


shield = pixels('unit-glyph-shield')
paint = (shield[:, :, 1] > 70) & (shield[:, :, 3] == 255)
rows = np.flatnonzero(paint.any(axis=1))
bands = np.split(rows, np.where(np.diff(rows) > 1)[0] + 1)
assert len(bands) == 3, '방열판은 떨어진 세 줄이어야 한다'
assert all(paint[band].sum() >= 10 for band in bands), '방열판 한 줄이 소실됨'

sword = pixels('unit-glyph-attack')
gold = (sword[:, :, 0] > 50) & (sword[:, :, 3] == 255)
assert connected(gold), '칼날·가드·손잡이가 끊김'
assert gold[:5, 10:].any(), '오른쪽 위 칼날 소실'
assert gold[6:11, :5].any(), '왼쪽 가드 소실'
assert gold[11:, :8].any(), '아래 손잡이 소실'

defense = pixels('unit-glyph-defense')
silver = (defense[:, :, 0] > 80) & (defense[:, :, 3] == 255)
assert connected(silver), '방패 몸체가 끊김'
occupied = np.flatnonzero(silver.any(axis=1))
widths = silver.sum(axis=1)
assert len(occupied) >= 11, '방패 끝 소실'
assert widths[occupied[-1]] < widths.max() / 2, '아래로 좁아지는 방패 끝 소실'

for side in ('left', 'right'):
    a = pixels(f'ledger-pin-{side}')
    opaque = a[:, :, 3] == 255
    assert connected(opaque), f'{side}: 핀 윤곽 단절'
    assert 48 <= opaque.sum() <= 196, f'{side}: 핀 소실 또는 종이 바탕 누출'
    colors = {tuple(c) for c in a[opaque, :3]}
    assert not colors & {(109, 41, 46), (201, 72, 80), (255, 122, 128)}, f'{side}: 황동에 붉은색 혼입'
    assert (245, 197, 66) in colors and (138, 100, 22) in colors, f'{side}: 황동 명암 소실'

print('PASS symbols: three shield bands, sword blade/guard/grip, shield tip, two intact brass pins')
