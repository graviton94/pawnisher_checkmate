import { describe, expect, it } from 'vitest';
import { COACH_LINES, GUIDE_PAGES } from '../src/data/opening';
import { BATTLE_HELP } from '../src/data/hud';
import { SLICE } from '../src/slice/cards';

/** 처치 환급 안내 = 엔진 (D-592 글 = 엔진 · D-597): 환급은 턴에 refundCap번까지 — 「처치하면 태엽」을 말하는 안내는 상한도 말한다 */
describe('처치 환급 안내는 엔진 상한과 같다', () => {
  const lines = [
    ...GUIDE_PAGES.flatMap((p) => [...p.lines, p.tip ?? '']),
    ...BATTLE_HELP,
    ...Object.values(COACH_LINES as Record<string, unknown>).flatMap((v) => (typeof v === 'string' ? [v] : Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])),
  ].filter((l) => /처치하면 태엽|처치하면.{0,6}태엽/.test(l));
  it('안내 줄을 찾았다', () => expect(lines.length).toBeGreaterThan(0));
  it('상한 1이면 「한 번」을 말한다', () => {
    expect(SLICE.refundCap).toBe(1);
    for (const l of lines) expect(l, l).toMatch(/한 번/);
  });
});
