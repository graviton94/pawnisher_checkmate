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
    # D-440: 사용자는 참고를 프로젝트 소스에 한 번 등록하고 채팅에는 프롬프트만 쓴다.
    project = ROOT / 'docs/art/chatgpt-project'
    # D-441: 최근 서사 배경뿐 아니라 기존 사건·보스의 화풍을 실제 소스로 제공한다.
    style_sources = []
    style_manifest = []
    for name, scene in [('style-event-smith', 'smith'), ('style-event-gambler', 'gambler'), ('style-boss-inspector', 'boss-inspector'), ('style-boss-gilded', 'boss-gilded')]:
        source = ROOT / f'public/scenes/{scene}.png'
        target = project / f'{name}.png'
        with Image.open(source) as im:
            im.resize((im.width * 4, im.height * 4), Image.Resampling.NEAREST).save(target)
            with Image.open(target) as enlarged:
                assert enlarged.resize(im.size, Image.Resampling.NEAREST).tobytes() == im.tobytes()
            style_manifest.append({'file': target.name, 'source': str(source.relative_to(ROOT)), 'native_size': list(im.size), 'transform': 'nearest-neighbor 4x', 'source_sha256': hashlib.sha256(source.read_bytes()).hexdigest(), 'sha256': hashlib.sha256(target.read_bytes()).hexdigest()})
        style_sources.append(target)
    (project / 'style-source-manifest.json').write_text(json.dumps(style_manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    sources = [ROOT / f'docs/art/reference/preview/{name}-864.png' for name in ('paperking', 'pawn', 'knight', 'bishop', 'rook', 'queen', 'king-form-only')]
    sources += [OUT / 'style-shipping-1920.png', OUT / 'style-departure-1920.png', *style_sources, project / 'ART-SOURCE-GUIDE.md', project / 'ASSET-PROFILES.md']
    assert len(sources) == 15 and len({p.name for p in sources}) == 15
    with zipfile.ZipFile(project / 'project-sources.zip', 'w', zipfile.ZIP_DEFLATED) as z:
        for path in sources:
            info = zipfile.ZipInfo(path.name, (2026, 11, 12, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            z.writestr(info, path.read_bytes())
    with zipfile.ZipFile(project / 'project-sources.zip') as z:
        assert z.testzip() is None
        for path in sources:
            assert z.read(path.name) == path.read_bytes()
    print('프로젝트 소스: PNG13개 + 공통 프로필/개별 설정 문서2개, 지침/채팅 예시와 분리')


if __name__ == '__main__':
    main()
