import { it } from 'vitest';
import { AI_TIERS, type AiTier } from '../src/ai/search';
import { TUNED } from '../src/data/aiWeights';
import { FULL_DECK } from '../src/engine';
import { score, series } from '../src/sim/arena';

/** AI 지능 단계가 실제로 실력 차이를 내는지 확인 (GDD 4장 §4.7) */
it('tiers', () => {
  const m = { width: 8, height: 8, decks: [FULL_DECK, FULL_DECK] as [typeof FULL_DECK, typeof FULL_DECK], maxTurns: 100 };
  const vs = (label: string, a: AiTier, b: AiTier, n = 60) => {
    const r = series(m, { weights: TUNED, tier: a }, { weights: TUNED, tier: b }, n, 3000);
    console.log(`${label}: ${(score(r) * 100).toFixed(0)}% (${r.wins}승 ${r.draws}무 ${r.losses}패)`);
  };
  vs('단계3 vs 단계1', AI_TIERS[2], AI_TIERS[0]);
  vs('탐색폭10 실수0 vs 탐색폭3 실수0', { beamWidth: 10, mistakeRate: 0 }, { beamWidth: 3, mistakeRate: 0 });
  vs('탐색폭3 실수0 vs 탐색폭3 실수40%', { beamWidth: 3, mistakeRate: 0 }, { beamWidth: 3, mistakeRate: 0.4 });
});
