import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { BALANCED, type Weights } from '../src/ai/evaluate';
import { FULL_DECK, Rng } from '../src/engine';
import { score, series, type Matchup } from '../src/sim/arena';

/** 자체 대전 가중치 튜닝 (D-018): (1+1) 진화 전략. 후보가 현 최강을 60% 이상 이기면 교체한다. */
const KEYS: (keyof Weights)[] = ['enemyKing', 'ownKing', 'material', 'threat', 'advance', 'promotion', 'stronghold', 'kill'];
const tier = { beamWidth: 4, mistakeRate: 0.1 };
const m: Matchup = { width: 8, height: 8, decks: [FULL_DECK, FULL_DECK], maxTurns: 80 };

it('tune', () => {
  const rng = new Rng(20261029);
  const gauss = () => Math.sqrt(-2 * Math.log(rng.next() + 1e-12)) * Math.cos(2 * Math.PI * rng.next());
  let best: Weights = { ...BALANCED };
  const GENS = 14;
  const GAMES = 16;
  for (let g = 0; g < GENS; g++) {
    const cand = { ...best };
    for (const k of KEYS) cand[k] = Math.max(0.05, +(best[k] * Math.exp(0.35 * gauss())).toFixed(3));
    const r = series(m, { weights: cand, tier }, { weights: best, tier }, GAMES, 1000 + g * 100);
    const sc = score(r);
    const accepted = sc >= 0.6;
    console.log(`gen ${g}: 후보 점수 ${(sc * 100).toFixed(0)}% (${r.wins}승 ${r.draws}무 ${r.losses}패) ${accepted ? '채택' : ''}`);
    if (accepted) best = cand;
  }
  const check = series(m, { weights: best, tier }, { weights: BALANCED, tier }, 40, 90000);
  console.log('최종 vs 기본:', `${(score(check) * 100).toFixed(0)}%`, `${check.wins}승 ${check.draws}무 ${check.losses}패`);
  console.log('TUNED', JSON.stringify(best));
  writeFileSync(
    'src/data/aiWeights.ts',
    `import type { Weights } from '../ai/evaluate';\n\n/** 자체 대전 튜닝 결과 (sim/tune.sim.ts, D-018). 기본 가중치 대비 ${(score(check) * 100).toFixed(0)}% (8×8 풀 덱 40판). */\nexport const TUNED: Weights = ${JSON.stringify(best, null, 2).replace(/"(\w+)":/g, '$1:')};\n`,
  );
});
