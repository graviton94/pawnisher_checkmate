#!/usr/bin/env python3
"""실행용 장면의 크기·실제 색을 집계한다. 화풍 합격을 자동 판정하지 않는다."""
from collections import Counter
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
REPORT = ROOT / 'docs/reports/2026-11-12-illustration-baseline'
SAMPLES = ['smith', 'gambler', 'pact', 'boss-inspector', 'boss-assembly', 'boss-gilded', 'departure-dock', 'shipping-interior', 'epilogue-hands']


def main():
    """메타데이터 전수 집계와 대표9종 수치·6종 정수배 비교표를 저장한다."""
    inventory = []
    for path in sorted((ROOT / 'public/scenes').glob('*.png')):
        with Image.open(path) as im:
            inventory.append({'file': path.name, 'width': im.width, 'height': im.height})
    samples = []
    for name in SAMPLES:
        with Image.open(ROOT / f'public/scenes/{name}.png') as im:
            arr = np.asarray(im.convert('RGBA'))
            rgb = arr[:, :, :3][arr[:, :, 3] >= 128]
            colors = Counter(map(tuple, rgb.tolist()))
            code_y = rgb @ np.array([.2126, .7152, .0722])
            samples.append({'name': name, 'size': list(im.size), 'visible_exact_rgb_colors': len(colors), 'top32_coverage_pct': round(sum(v for _, v in colors.most_common(32)) / len(rgb) * 100, 2), 'srgb_code_luma_p10_p50_p90': np.percentile(code_y, [10, 50, 90]).round(2).tolist()})
    data = {'method': 'Opaque/visible pixels alpha>=128; RGB exact colors; top32 pixel coverage; Rec709-weighted sRGB code values, not linear luminance. No automated dithering or style verdict.', 'inventory_count': len(inventory), 'inventory': inventory, 'samples': samples}
    REPORT.with_suffix('.json').write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    sheet = Image.new('RGB', (1632, 1184), '#24232B')
    d = ImageDraw.Draw(sheet)
    font = ImageFont.truetype(str(ROOT / 'node_modules/galmuri/dist/Galmuri11.ttf'), 24)
    d.text((24, 16), '기존 사건 · 보스 / 실제 PNG를 모두 최근접 2배로 표시', font=font, fill='#F1EDE4')
    for i, sample in enumerate(samples[:6]):
        x, y = (i % 3) * 544, 72 + (i // 3) * 552
        im = Image.open(ROOT / f'public/scenes/{sample["name"]}.png').convert('RGBA')
        enlarged = im.resize((im.width * 2, im.height * 2), Image.Resampling.NEAREST)
        sheet.paste(enlarged, (x + (544 - enlarged.width) // 2, y), enlarged)
        d.text((x + 16, y + 504), f'{sample["name"]} / {im.width}x{im.height}', font=font, fill='#F1EDE4')
    sheet.save(REPORT.with_suffix('.png'))
    print('장면 메타데이터', len(inventory), '개 · 대표9종 색상 집계 · 사건/보스6종 정수배 비교표')
    for s in samples:
        print(s['name'], s['size'], s['visible_exact_rgb_colors'], s['top32_coverage_pct'])


if __name__ == '__main__':
    main()
