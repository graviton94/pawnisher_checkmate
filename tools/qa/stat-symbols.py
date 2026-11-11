"""원본 프레임 안의 상징·핀을 검사한다. 별도 상징/핀 파일은 사용하지 않는다."""
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / 'src/assets/ui/chrome/v2'
for kind in ('hp', 'shield', 'attack', 'defense'):
    im = Image.open(ART / f'unit-stat-{kind}.png')
    assert im.size == (64, 64), kind
    assert not (ART / f'unit-glyph-{kind}.png').exists(), '분리 상징 사용 금지'

s = np.array(Image.open(ART / 'unit-stat-shield.png'))[:18, :18]
r, g, b = s[:, :, :3].astype(float).transpose(2, 0, 1)
paint = (((g > r + 15) & (b > r + 15)) | ((r > 205) & (g > 205) & (b > 205))) & (s[:, :, 3] > 127)
rows = np.flatnonzero(paint.any(axis=1))
assert len(np.split(rows, np.where(np.diff(rows) > 1)[0] + 1)) == 3, '원본 방열판 세 줄 소실'

ledger = np.array(Image.open(ART / 'ledger-slip.png'))
assert ledger.shape[:2] == (49, 128)
for name, corner in [('left', ledger[:16, :20]), ('right', ledger[:16, -20:])]:
    assert not (ART / f'ledger-pin-{name}.png').exists(), '분리 핀 사용 금지'
    r, g, b = corner[:, :, :3].astype(float).transpose(2, 0, 1)
    gold = (r > 60) & (r > g) & (g > b * 1.3) & (corner[:, :, 3] > 127)
    assert gold.sum() >= 12, f'{name} 원본 핀 소실'
print('PASS: whole original frames, three shield bands, both embedded original pins, no detached ornaments')
