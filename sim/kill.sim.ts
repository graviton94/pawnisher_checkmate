import { it } from 'vitest';
import { AI_TIERS } from '../src/ai/search';
import { TUNED } from '../src/data/aiWeights';
import { defaultRules } from '../src/data/battle';
import { FULL_DECK, type Deck } from '../src/engine';
import { score, series, type Matchup } from '../src/sim/arena';

/** 처치 가산점(kill) 크기 비교 — 큰 표본 */
it('kill', () => {
  const n = Number(process.env.SIM_GAMES ?? 100);
  const m8: Matchup = { width: 8, height: 8, decks: [FULL_DECK, FULL_DECK] as [Deck, Deck], rules: defaultRules(8, 8), maxTurns: 120 };
  const tier = AI_TIERS[1];
  for (const k of [0.3, 1, 2]) {
    const r = series(m8, { weights: { ...TUNED, kill: k }, tier }, { weights: { ...TUNED, kill: 0 }, tier }, n, 9000);
    console.log(`kill ${k} vs 0: ${(score(r) * 100).toFixed(0)}% (${r.wins}승 ${r.draws}무 ${r.losses}패) 평균 ${r.avgTurns.toFixed(1)}턴`);
  }
}, 7_200_000);
