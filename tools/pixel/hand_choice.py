"""손패 전용 경첩 재색칠. 원본 격자·알파·다른 재질은 그대로 보존한다."""
from pathlib import Path
from PIL import Image

ART = Path(__file__).resolve().parents[2] / 'src/assets/ui/chrome/v2'
COLORS = {(245, 197, 66): (86, 84, 94), (200, 155, 60): (51, 49, 59),
          (138, 100, 22): (36, 35, 43)}
for state in ('up', 'down', 'sel', 'off'):
    im = Image.open(ART / f'choice-{state}.png').convert('RGBA')
    im.putdata([(*COLORS.get(c[:3], c[:3]), c[3]) for c in im.getdata()])
    im.save(ART / f'hand-choice-{state}.png', optimize=True)
    print(f'hand-choice-{state}: {im.size}, hinge brass → charcoal')
