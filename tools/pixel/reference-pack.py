#!/usr/bin/env python3
"""현재 게임 기물을 다시 그리지 않고 아트팀 전달용 정본 묶음으로 낸다."""
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import zipfile

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'docs/art/reference'
spec = importlib.util.spec_from_file_location('maker', ROOT / 'tools/pixel/maker.py')
maker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(maker)
ITEMS = [
    ('paperking', 'K', 0, '종이왕 / K0', '주인공 정본'),
    ('pawn', 'P', 0, '폰 / P0', '동료 몸체 기준'),
    ('knight', 'N', 0, '나이트 / N0', '박차 · 나이트형 동료 기준'),
    ('bishop', 'B', 0, '비숍 / B0', '동료 몸체 기준'),
    ('rook', 'R', 0, '룩 / R0', '동료 몸체 기준'),
    ('queen', 'Q', 0, '퀸 / Q0', '동료 몸체 기준'),
    ('king-form-only', 'K', 1, '킹 형태 / K1', '형태만 참고 · 금빛 왕 정본 아님'),
]


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    """정본 대조 → 투명 PNG/비교표 → 재현 가능한 ZIP 순으로 생성한다."""
    (OUT / 'native').mkdir(parents=True, exist_ok=True)
    (OUT / 'preview').mkdir(exist_ok=True)
    sheet = Image.new('RGB', (1536, 1128), '#24232B')
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.truetype(str(ROOT / 'node_modules/galmuri/dist/Galmuri11.ttf'), 24)
    draw.text((32, 24), 'Pawnisher : Checkmate / 인물 정본 참고', font=font, fill='#F1EDE4')
    draw.text((32, 64), '형태와 비례를 참고합니다. 장면에는 흰 스티커 테를 옮기지 않습니다.', font=font, fill='#BFB9AD')
    manifest = {'source_commit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(), 'characters': []}
    for i, (slug, kind, side, title, note) in enumerate(ITEMS):
        native = maker.piece(kind, side, 1)
        runtime_path = ROOT / f'public/pieces/l-{kind}{side}.png'
        runtime = Image.open(runtime_path).convert('RGBA')
        assert native.size == (72, 72)
        assert native.resize((216, 216), Image.Resampling.NEAREST).tobytes() == runtime.tobytes(), slug
        assert set(native.getchannel('A').getdata()) <= {0, 255}, slug
        small_path = OUT / 'native' / f'{slug}-72.png'
        large_path = OUT / 'preview' / f'{slug}-864.png'
        native.save(small_path)
        native.resize((864, 864), Image.Resampling.NEAREST).save(large_path)
        with Image.open(large_path) as enlarged:
            assert enlarged.resize((72, 72), Image.Resampling.NEAREST).tobytes() == native.tobytes()
        x, y = (i % 4) * 384, 128 + (i // 4) * 456
        sheet.paste(native.resize((288, 288), Image.Resampling.NEAREST), (x + 48, y), native.resize((288, 288), Image.Resampling.NEAREST))
        draw.text((x + 24, y + 300), title, font=font, fill='#F1EDE4')
        # 긴 주석은 두 줄로 나눠 셀 안에 둔다.
        notes = ['형태만 참고', '금빛 왕 정본 아님'] if slug == 'king-form-only' else ['박차 · 나이트형', '동료 몸체 기준'] if slug == 'knight' else [note]
        for j, line in enumerate(notes):
            assert draw.textlength(line, font=font) <= 336, line
            draw.text((x + 24, y + 340 + j * 32), line, font=font, fill='#C89B3C')
        manifest['characters'].append({'id': slug, 'source': str(runtime_path.relative_to(ROOT)), 'source_sha256': digest(runtime_path), 'runtime_rgba_match': True, 'native': str(small_path.relative_to(OUT)), 'native_sha256': digest(small_path), 'preview': str(large_path.relative_to(OUT)), 'preview_sha256': digest(large_path)})
    for j, line in enumerate(['왕관의 청록 장식은', '원형입니다.', '저해상도 도트의', '각진 외곽을 사각형으로', '해석하지 않습니다.']):
        draw.text((1176, 656 + j * 36), line, font=font, fill='#BFB9AD')
    sheet.save(OUT / 'character-sheet.png')
    (OUT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    files = [OUT / 'README.md', OUT / 'manifest.json', OUT / 'character-sheet.png', *sorted((OUT / 'native').glob('*.png')), *sorted((OUT / 'preview').glob('*.png'))]
    archive = OUT / 'pawnisher-character-reference.zip'
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as z:
        for path in files:
            info = zipfile.ZipInfo('pawnisher-character-reference/' + str(path.relative_to(OUT)), (2026, 11, 12, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            z.writestr(info, path.read_bytes())
    with zipfile.ZipFile(archive) as z:
        assert z.testzip() is None
        for path in files:
            assert z.read('pawnisher-character-reference/' + str(path.relative_to(OUT))) == path.read_bytes()
    print(f'{len(ITEMS)}기물 정본 일치 · 알파/정수 확대/ZIP 무결성 확인: {archive}')


if __name__ == '__main__':
    main()
