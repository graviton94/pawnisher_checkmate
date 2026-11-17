// 갈무리 줄이기 점검: src/에서 쓰는 글자 중 원본 글꼴에 있는 것은 줄인 글꼴에도 모두 있어야 한다 (tools/subset-fonts.mjs)
import { describe, expect, it } from 'vitest';
// @ts-expect-error — 빌드 도구(.mjs)를 그대로 불러 같은 함수로 점검한다
import { FACES, usedCodepoints, subsetFace, coarseRange } from '../tools/subset-fonts.mjs';

type Face = { family: string; weight: number; file: string };
type Result = { woff2: Uint8Array; covered: number[]; missing: number[]; absent: number[] };

describe('갈무리 줄이기', () => {
  const cps = usedCodepoints() as number[];
  it('쓰는 글자를 모은다 (한글 · ASCII 포함)', () => {
    expect(cps).toContain('턴'.codePointAt(0));
    expect(cps).toContain('A'.codePointAt(0));
    expect(cps.length).toBeGreaterThan(1000);
  });
  for (const f of FACES as Face[]) {
    it(`${f.file}: 쓰는 글자가 줄인 글꼴에 빠지지 않는다`, async () => {
      const r = (await subsetFace(f, cps)) as Result;
      expect(r.missing.map((c) => String.fromCodePoint(c)).join('')).toBe('');
      expect(r.woff2.length).toBeLessThan(64 * 1024);
    }, 30000);
  }
  it('원본 얼굴 범위는 원본에도 없는 글자를 뺀다', () => {
    expect(coarseRange(new Set([0x41, 0x42, 0x43, 0x45]), [0x44])).toBe('U+41-43,U+45');
  });
});
