import { describe, expect, it } from 'vitest';
import { cardMoves, cardPieces, newSliceBattle, playCard, previewPlay, type SliceBattle } from '../src/slice/battle';
import { START_DECK } from '../src/slice/cards';
import type { BattleEvent } from '../src/engine/types';

/** 적에게 가는 피해 합 · 맞은 뒤 HP (화면 model()의 과녁 꼬리표와 같은 셈 — D-623) */
const foeDamage = (b: SliceBattle, events: readonly BattleEvent[], attacker: number): { dmg: number; after: Map<number, number> } => {
  const hits = events.flatMap((e) => ((e.type === 'attack' && e.attackerId === attacker) || e.type === 'blast' ? e.hits : []))
    .filter((h) => b.s.pieces.find((p) => p.id === h.targetId)?.side === 1);
  return { dmg: hits.reduce((s, h) => s + h.damage, 0), after: new Map(hits.map((h) => [h.targetId, h.hpAfter])) };
};

/**
 * 과녁 옆 예상 피해 「−12」 · HP 바 잃을 몫 (D-623, 사용자 결정 5가 ②): 미리보기는 실행과 같은 simulate를 쓴다(UI 원칙 1) —
 * 친 뒤 실제로 깎인 피해 · HP가 누르기 전 보인 숫자와 같아야 한다.
 */
describe('과녁 예상 피해 = 실행 결과 (D-623)', () => {
  it('여러 시드 · 모든 친 수에서 미리보기 피해와 실제 피해가 같다', () => {
    let checked = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const base = newSliceBattle([{ t: 'K' }, { t: 'N' }, { t: 'P' }, { t: 'B' }], ['K', 'P', 'P', 'N', 'B'], START_DECK, seed);
      base.hand.forEach((_, i) => {
        for (const p of cardPieces(base, i)) for (const to of cardMoves(base, i, p.id)) {
          const sim = previewPlay(base, i, p.id, to);
          if (!sim) continue;
          const want = foeDamage(base, sim.events, p.id);
          if (!want.dmg) continue;
          // 같은 판을 복제해 실제로 둔다
          const b = structuredClone(base) as SliceBattle;
          const r = playCard(b, i, p.id, to);
          if (typeof r === 'string') continue;
          const got = foeDamage(base, r.events, p.id);
          expect(got.dmg).toBe(want.dmg);
          for (const [id, hp] of want.after) expect(got.after.get(id)).toBe(hp);
          checked++;
        }
      });
    }
    expect(checked).toBeGreaterThan(5);
  });
});
