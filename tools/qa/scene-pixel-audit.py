"""배경 원본을 실제 픽셀화해 현재 게임 파일과 대조한다. 게임 파일은 덮어쓰지 않는다.

python3 -I tools/qa/scene-pixel-audit.py --output-dir /tmp/scene-pixel-audit
"""
import argparse
from concurrent.futures import ProcessPoolExecutor
import hashlib
import json
from pathlib import Path
import re
import sys

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools' / 'pixel'))
import snap  # noqa: E402
import scene_recipe  # noqa: E402


def file_hash(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def pixel_hash(image):
    return hashlib.sha256(image.convert('RGBA').tobytes()).hexdigest()


def audit(args):
    src, current, target = map(Path, args)
    recipe = scene_recipe.options(current.stem)
    record = {'source': str(src.relative_to(ROOT)), 'game': str(current.relative_to(ROOT)),
              'recipe': recipe, 'source_sha256': file_hash(src),
              'game_sha256': file_hash(current)}
    try:
        result, pitch = snap.run(str(src), str(target), **recipe)
        with Image.open(src) as original, Image.open(current) as game:
            record.update(source_size=list(original.size), game_size=list(game.size),
                          reproduced_size=list(result.size), detected_pitch=list(pitch),
                          game_pixel_sha256=pixel_hash(game), reproduced_pixel_sha256=pixel_hash(result))
            record['status'] = 'match' if game.size == result.size and pixel_hash(game) == pixel_hash(result) else 'different'
    except Exception as error:
        record.update(status='error', error=str(error))
    return record


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-dir', type=Path, required=True)
    parser.add_argument('--workers', type=int, default=2)
    parser.add_argument('--scene', action='append', help='특정 장면만 검사(여러 번 지정 가능)')
    options = parser.parse_args()
    generated = options.output_dir.resolve() / 'generated'
    generated.mkdir(parents=True, exist_ok=True)
    pairs = []
    for source in sorted((ROOT / 'build-res' / 'order').glob('*-source.png')):
        match = re.match(r'^(?:A-\d+|BG-\d+|SC-\d+|S-\d+|UI-06[ab]|E-06|EN-0[12]|P-00)-(.+)-source\.png$', source.name)
        if not match:
            continue
        if options.scene and match[1] not in options.scene:
            continue
        current = ROOT / 'public' / 'scenes' / f'{match[1]}.png'
        if current.exists():
            pairs.append((str(source), str(current), str(generated / current.name)))
    with ProcessPoolExecutor(max_workers=max(1, options.workers)) as pool:
        records = list(pool.map(audit, pairs))
    summary = {status: sum(r['status'] == status for r in records) for status in ('match', 'different', 'error')}
    report = {'method': 'Regenerate from received originals; compare RGBA dimensions and pixels with live game assets.',
              'summary': summary, 'assets': records}
    (options.output_dir / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(summary, ensure_ascii=False), flush=True)
    return 1 if not records or summary['different'] or summary['error'] else 0


if __name__ == '__main__':
    raise SystemExit(main())
