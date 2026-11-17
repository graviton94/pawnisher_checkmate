import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// D-423 · D-552: 도트 반입 도구는 평균 리샘플(BOX · LANCZOS · BILINEAR · BICUBIC · HAMMING · ANTIALIAS, resample 없는 thumbnail)을 쓰지 않는다.
// 같은 검사를 python3 -I tools/pixel/check_resample.py 로도 돌릴 수 있다 — 여기서는 파이썬 없이 같은 규칙으로 본다.
const ROOT = join(__dirname, '..', 'tools', 'pixel');
const BAD = /[,(=]\s*(?:Image|Resampling)\.(?:BOX|LANCZOS|BILINEAR|BICUBIC|HAMMING|ANTIALIAS)\b|Image\.Resampling\.(?:BOX|LANCZOS|BILINEAR|BICUBIC|HAMMING)\b/;

function pyFiles(dir: string): string[] {
  const out: string[] = [];
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (f === '__pycache__') continue;
    if (statSync(p).isDirectory()) out.push(...pyFiles(p));
    else if (f.endsWith('.py') && f !== 'check_resample.py') out.push(p);
  }
  return out;
}

describe('도트 반입 도구 — 평균 리샘플 금지', () => {
  it('tools/pixel 어디에도 평균 리샘플 호출이 없다', () => {
    const hits: string[] = [];
    for (const p of pyFiles(ROOT)) {
      readFileSync(p, 'utf8').split('\n').forEach((line, i) => {
        const code = line.split('#')[0];
        if (BAD.test(code) || (/\.thumbnail\(/.test(code) && !code.includes('NEAREST'))) hits.push(`${p}:${i + 1}: ${line.trim()}`);
      });
    }
    expect(hits).toEqual([]);
  });

  it('공용 실측 도구가 있다 (gridmeasure.measure · regrid)', () => {
    const src = readFileSync(join(ROOT, 'gridmeasure.py'), 'utf8');
    expect(src).toMatch(/def measure\(/);
    expect(src).toMatch(/def regrid\(/);
    expect(src).toMatch(/PRESENCE_MIN/);
  });
});
