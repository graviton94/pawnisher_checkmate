#!/usr/bin/env python3
"""기존 기물·장면의 픽셀을 보존해 서사 발주 참고 묶음을 만든다."""
import hashlib
import json
from pathlib import Path
import shutil
import zipfile
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'docs/art/cinematic-reference'


def main():
    """인물2·화풍2의 실제 파일과 최근접 확대본을 검증해 묶는다."""
    OUT.mkdir(parents=True, exist_ok=True)
    entries = []
    for name in ('paperking', 'king-form-only'):
        source = ROOT / f'docs/art/reference/preview/{name}-864.png'
        dest = OUT / source.name
        shutil.copyfile(source, dest)
        entries.append({'file': dest.name, 'source': str(source.relative_to(ROOT)), 'sha256': hashlib.sha256(dest.read_bytes()).hexdigest(), 'transform': 'byte-identical copy'})
    for slug, scene in [('shipping', 'shipping-interior'), ('departure', 'departure-dock')]:
        source = ROOT / f'public/scenes/{scene}.png'
        native = OUT / f'style-{slug}-320.png'
        preview = OUT / f'style-{slug}-1920.png'
        shutil.copyfile(source, native)
        with Image.open(source) as im:
            assert im.size == (320, 180)
            im.resize((1920, 1080), Image.Resampling.NEAREST).save(preview)
            with Image.open(preview) as enlarged:
                assert enlarged.resize(im.size, Image.Resampling.NEAREST).tobytes() == im.tobytes()
        for path, transform in [(native, 'byte-identical copy'), (preview, 'nearest-neighbor 6x')]:
            entries.append({'file': path.name, 'source': str(source.relative_to(ROOT)), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'transform': transform})
    shutil.copyfile(ROOT / 'docs/asset-order-story-cinematics.md', OUT / 'revision-prompts.md')
    (OUT / 'manifest.json').write_text(json.dumps(entries, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    files = [OUT / x['file'] for x in entries] + [OUT / 'README.md', OUT / 'revision-prompts.md', OUT / 'manifest.json']
    archive = OUT / 'pawnisher-cinematic-reference.zip'
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as z:
        for path in files:
            info = zipfile.ZipInfo('pawnisher-cinematic-reference/' + path.name, (2026, 11, 12, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            z.writestr(info, path.read_bytes())
    with zipfile.ZipFile(archive) as z:
        assert z.testzip() is None
        for path in files:
            assert z.read('pawnisher-cinematic-reference/' + path.name) == path.read_bytes()
    print(f'인물2종·장면2종 native/최근접 확대·ZIP 검증 완료: {archive}')


if __name__ == '__main__':
    main()
