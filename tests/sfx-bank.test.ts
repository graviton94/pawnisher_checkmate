import { describe, expect, it } from 'vitest';
import { SFX_BANK } from '../src/data/sfx';

/** 효과음 표와 파일이 어긋나지 않는다 (D-540) — 표의 소리마다 ogg · m4a가 있고, 표에 없는 파일이 남지 않는다 */
const FILES = Object.keys(import.meta.glob('../public/audio/sfx/*', { query: '?url', import: 'default' })).map((p) => p.split('/').pop()!);

describe('효과음 묶음', () => {
  const want = Object.entries(SFX_BANK).flatMap(([k, d]) => (d.n > 1 ? Array.from({ length: d.n }, (_, i) => `${k}${i + 1}`) : [k]));

  it('표의 소리마다 ogg · m4a가 있다', () => {
    for (const n of want) for (const e of ['ogg', 'm4a']) expect(FILES, `${n}.${e}`).toContain(`${n}.${e}`);
  });
  it('표에 없는 파일이 없다', () => {
    expect(FILES.filter((f) => !want.includes(f.replace(/\.(ogg|m4a)$/, '')))).toEqual([]);
  });
  it('섞는 크기는 0 초과 1 이하', () => {
    for (const d of Object.values(SFX_BANK)) {
      expect(d.gain).toBeGreaterThan(0);
      expect(d.gain).toBeLessThanOrEqual(1);
    }
  });
});
