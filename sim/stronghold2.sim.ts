import { it } from 'vitest';
import { TUNED } from '../src/data/aiWeights';
import { STRONGHOLD } from '../src/data/battle';
import { FULL_DECK } from '../src/engine';
import { series } from '../src/sim/arena';

/** 점령한 쪽이 이기는 것이 보상 때문인지(인과) 원래 이기던 쪽이라서인지(상관) 확인: 보상을 0으로 */
it('stronghold no reward', () => {
  const p = { weights: TUNED, tier: { beamWidth: 4, mistakeRate: 0.1 } };
  Object.assign(STRONGHOLD.tier1, { ap: 0, healPct: 0 });
  Object.assign(STRONGHOLD.tier2, { ap: 0, atkPct: 0, def: 0 });
  Object.assign(STRONGHOLD.tier3, { ap: 0, kingShield: 0 });
  const r = series({ width: 8, height: 8, decks: [FULL_DECK, FULL_DECK], maxTurns: 100 }, p, p, 60, 500);
  const caps = r.all.flatMap((g) => g.captures.map((c) => ({ ...c, won: g.winner === c.side })));
  const behind = caps.filter((c) => c.behind);
  console.log(`보상 없음 | 점령 ${(caps.length / 60).toFixed(2)}/판 | 열세 쪽 점령 ${behind.length}/${caps.length} | 점령한 쪽 승 ${caps.filter((c) => c.won).length}/${caps.length} | 열세 점령 후 승 ${behind.filter((c) => c.won).length}/${behind.length}`);
});
