import { describe, expect, it } from 'vitest';
import { HEAT_DEFAULT, SLICE } from '../src/slice/cards';
import { simulateRun } from '../src/sim/runbot';

/** 시뮬레이션 실험실 (D-456): 지표가 모이고, 페르소나 · 온도를 넣어도 같은 시드 = 같은 결과 */
describe('실험실 지표 (D-456)', () => {
  it('제시 · 선택 · 대국 지표가 모이고 범위가 맞다', () => {
    const keep = SLICE.heat;
    SLICE.heat = [...HEAT_DEFAULT];
    const r = simulateRun(70003, { style: 'greedy' });
    SLICE.heat = keep;
    expect(r.offers.length).toBeGreaterThan(0);
    expect(r.offers.some((o) => o.taken)).toBe(true);
    for (const l of r.log) {
      expect(l.hpAfter).toBeGreaterThanOrEqual(0);
      expect(l.hpAfter).toBeLessThanOrEqual(1);
      expect(l.swing).toBeLessThanOrEqual(1);
      if (l.won) expect(l.dpt).toBeGreaterThan(0);
    }
    expect(r.starterLeft).toBeGreaterThanOrEqual(0);
  });
  it('hoarder는 카드 보상을 거르지 않는다 · 같은 시드는 같은 결과', () => {
    const a = simulateRun(70011, { style: 'greedy', persona: 'hoarder' });
    const b = simulateRun(70011, { style: 'greedy', persona: 'hoarder' });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    const cardOffers = a.offers.filter((o) => !o.part);
    expect(cardOffers.filter((o) => o.taken).length).toBeGreaterThan(0);
  });
});

/** 다시 볼 판 (D-468): 실험실이 뽑은 극단 대국 코드가 같은 판을 다시 세운다 */
describe('다시 볼 판 (D-468)', () => {
  it('극단 대국 코드를 풀면 출하 상태 · 시드가 그대로 있고, 같은 판이 두 번 똑같이 선다', async () => {
    const { newSliceBattle } = await import('../src/slice/battle');
    const keep = SLICE.heat;
    SLICE.heat = [...HEAT_DEFAULT];
    const r = simulateRun(70007, { style: 'greedy' });
    expect(r.extremes.length).toBeGreaterThan(0);
    const e = r.extremes[0];
    expect(e.why).not.toBe('');
    const s = JSON.parse(decodeURIComponent(escape(atob(e.code))));
    expect(s.def.title).toBe(e.title);
    expect(typeof s.def.seed).toBe('number');
    expect(s.squad.length).toBeGreaterThan(0);
    const mk = () => newSliceBattle(s.squad, s.def.enemy, s.deck, s.def.seed, { enemyKingHp: s.def.kingHp, enemyHp: s.def.enemyHp, depth: s.def.depth, parts: s.parts, refined: s.refined, boss: s.def.boss, bossRule: s.def.bossRule, traits: s.def.traits, width: s.def.w, height: s.def.h, place: s.def.place, gold: s.gold, shock: s.asc >= 2, guard: s.def.guard, eliteOne: s.def.eliteOne });
    expect(JSON.stringify(mk())).toBe(JSON.stringify(mk()));
    SLICE.heat = keep;
  });
});
