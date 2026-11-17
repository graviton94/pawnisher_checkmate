"""
반입 · 도트 도구에 평균 리샘플이 들어오지 못하게 막는다 (D-423 · D-552).
도트 그림은 칸 가운데 최빈색 · 중앙값(snap.snap · gridmeasure.regrid)이나 정수배 계단 확대(NEAREST)만 쓴다.
Image.BOX · LANCZOS · BILINEAR · BICUBIC · HAMMING · ANTIALIAS, 그리고 resample을 주지 않은 .thumbnail()(기본이 평균)은
대조판 미리보기라도 쓰지 않는다 — 원본을 보여 줄 때는 1:1로 잘라 보이거나 NEAREST로 줄인다.

python3 -I tools/pixel/check_resample.py   → 걸린 줄을 찍고 1로 끝난다 (tests/pixel-resample.test.ts가 부른다)
"""
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
BAD = re.compile(r'\b(?:Image|Resampling)\.(?:BOX|LANCZOS|BILINEAR|BICUBIC|HAMMING|ANTIALIAS)\b')
THUMB = re.compile(r'\.thumbnail\(')


def scan(root=HERE):
    hits = []
    for dp, _, files in os.walk(root):
        if '__pycache__' in dp:
            continue
        for f in sorted(files):
            if not f.endswith('.py') or f == 'check_resample.py':
                continue
            p = os.path.join(dp, f)
            for n, line in enumerate(open(p, encoding='utf-8'), 1):
                code = line.split('#', 1)[0]
                # 문서 문자열 안 설명(예: 「옛 판은 Image.BOX로 …」)은 코드가 아니다 — 호출 꼴만 본다
                if BAD.search(code) and re.search(r'[,(=]\s*(?:Image|Resampling)\.', code):
                    hits.append((os.path.relpath(p, root), n, line.strip()))
                elif THUMB.search(code) and 'NEAREST' not in code:
                    hits.append((os.path.relpath(p, root), n, line.strip()))
    return hits


if __name__ == '__main__':
    h = scan()
    for f, n, line in h:
        print(f'{f}:{n}: {line}')
    print(f'평균 리샘플 {len(h)}곳')
    sys.exit(1 if h else 0)
