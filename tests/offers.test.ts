import { describe, expect, it } from 'vitest';
import { cardOffers, isCommonMove } from '../src/slice/build-offers';
import { cardFits, REWARD_COMMANDS, type CommandId } from '../src/slice/cards';
import { STARTER_CARDS } from '../src/data/unlocks';
import { Rng } from '../src/engine/rng';

/** 카드 보상 제시 (2026-11-14 · D-497): 등급 안에서 고르게 — 처음 풀의 왕의 돌진 몰림(제시 13.5%)이 풀린다 · 공용 이동 카드는 덜 */
describe('카드 보상 제시', () => {
  const pool = REWARD_COMMANDS.filter((id) => STARTER_CARDS.includes(id) && cardFits(id, ['K', 'P', 'N']));
  const tally = (ownAxes: ('king' | 'cav')[]) => {
    const rng = new Rng(11);
    const cnt = new Map<CommandId, number>();
    let n = 0;
    for (let k = 0; k < 3000; k++) for (const id of cardOffers(pool, 3, { elite: false, ownAxes, parts: [], rng })) { cnt.set(id, (cnt.get(id) ?? 0) + 1); n++; }
    return { share: (id: CommandId) => (cnt.get(id) ?? 0) / n, n, cnt };
  };
  it('한 장이 몰리지 않는다 (왕 축 부품을 쥐어도 왕의 돌진 10% 아래)', () => {
    expect(tally([]).share('kingCharge')).toBeLessThan(0.06);
    expect(tally(['king']).share('kingCharge')).toBeLessThan(0.1);
  });
  it('세 장은 서로 다르고, 공용 이동 카드는 전용 카드보다 덜 나온다', () => {
    const rng = new Rng(3);
    for (let k = 0; k < 200; k++) { const o = cardOffers(pool, 3, { elite: k % 2 === 0, ownAxes: [], parts: [], rng }); expect(new Set(o).size).toBe(o.length); }
    const t = tally([]);
    const common = pool.filter(isCommonMove), own = pool.filter((id) => !isCommonMove(id));
    const avg = (ids: CommandId[]) => ids.reduce((a, id) => a + t.share(id), 0) / Math.max(1, ids.length);
    if (common.length) expect(avg(common)).toBeLessThan(avg(own));
  });
});
