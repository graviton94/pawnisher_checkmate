import { describe, expect, it } from 'vitest';
import { EVENT_OUTCOME } from '../src/data/event-outcome';
import { textWidth } from '../src/slice/desc';

/** 사건 결과 서술 (D-360): 문장마다 한 줄이라 두 문장 = 두 줄, 한 줄 ≈ 27.5칸 · 쉼표는 장면당 하나까지 · 결과마다 대사 */
describe('사건 결과 서술', () => {
  const all = Object.entries(EVENT_OUTCOME).flatMap(([ev, m]) => Object.entries(m).map(([k, o]) => ({ at: `${ev} ${k}`, ...o })));
  it('두 줄 · 한 줄 폭 · 쉼표 하나', () => {
    for (const o of all) {
      const sents = o.scene.split(/(?<=[.?!…])\s+/);
      expect(sents.length, o.at).toBeLessThanOrEqual(2);
      for (const t of sents) expect(textWidth(t), `${o.at}: ${t}`).toBeLessThanOrEqual(27.5);
      expect((o.scene.match(/,/g) ?? []).length, o.at).toBeLessThanOrEqual(1);
    }
  });
  it('결과마다 한마디', () => {
    for (const o of all) expect(o.line, o.at).toBeTruthy();
  });
});
