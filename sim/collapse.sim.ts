import { it } from 'vitest';
import { AGGRESSIVE } from '../src/ai/evaluate';
import { series } from '../src/sim/arena';
import type { Deck } from '../src/engine';

it('6x6 collapse timing', () => {
  const tier = { beamWidth: 4, mistakeRate: 0.1 };
  const decksA: [Deck, Deck] = [['K', 'P', 'P', 'P'], ['K', 'P', 'P']];
  const decksB: [Deck, Deck] = [['K', 'P', 'P', 'N'], ['K', 'P', 'P', 'B']];
  for (const start of [4, 6, 8]) {
    for (const [name, decks] of [['A', decksA], ['B', decksB]] as const) {
      const r = series({ width: 6, height: 6, decks, maxTurns: 80, rules: { strongholdRounds: [], collapseStart: start, collapseInterval: 3 } }, { weights: AGGRESSIVE, tier }, { weights: AGGRESSIVE, tier }, 30);
      const sum = (f: (g: (typeof r.all)[number]) => number) => r.all.reduce((a, g) => a + f(g), 0);
      const decided = r.all.filter((g) => g.winner !== null);
      console.log(`start ${start} ${name}: 결판 ${decided.length}/30, 결판까지 평균 턴 ${(decided.reduce((a, g) => a + g.turns, 0) / Math.max(1, decided.length)).toFixed(1)}, 승급/판 ${(sum((g) => g.promotions) / 30).toFixed(2)}, 일격/판 ${(sum((g) => g.strikes) / 30).toFixed(2)}`);
    }
  }
});
