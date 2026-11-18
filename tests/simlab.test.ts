import { describe, expect, it, vi } from 'vitest';
import { HEAVY_MS } from './heavy';

// 대국 · 시뮬레이션을 많이 돌린다 — 부하가 걸린 기기에서도 기본 5초에 걸리지 않게 (tests/heavy.ts)
vi.setConfig({ testTimeout: HEAVY_MS });
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
  }, 30000);
  it('hoarder는 카드 보상을 거르지 않는다 · 같은 시드는 같은 결과', () => {
    // 카드 보상을 한 번이라도 받은 출하에서 본다 (D-542 난이도 패스 뒤 보통 봇은 1막에서 끝나는 출하가 많아 보상이 다 영입일 수 있다)
    let seed = 70011;
    let a = simulateRun(seed, { style: 'greedy', persona: 'hoarder' });
    while (!a.offers.some((o) => !o.part) && seed < 70030) a = simulateRun(++seed, { style: 'greedy', persona: 'hoarder' });
    const b = simulateRun(seed, { style: 'greedy', persona: 'hoarder' });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    const cardOffers = a.offers.filter((o) => !o.part);
    expect(cardOffers.filter((o) => o.taken).length).toBeGreaterThan(0);
  }, 30000);
});

/** 다시 볼 판 (D-468): 실험실이 뽑은 극단 대국 코드가 같은 판을 다시 세운다 */
describe('다시 볼 판 (D-468)', () => {
  it('극단 대국 코드를 풀면 출하 상태 · 시드가 그대로 있고, 같은 판이 두 번 똑같이 선다', async () => {
    const { newSliceBattle } = await import('../src/slice/battle');
    const keep = SLICE.heat;
    SLICE.heat = [...HEAT_DEFAULT];
    let r = simulateRun(70007, { style: 'greedy' });
    for (let seed = 70008; !r.extremes.length && seed < 70040; seed++) r = simulateRun(seed, { style: 'greedy' });
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
  }, 60000);
});
