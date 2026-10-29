import { it } from 'vitest';
import { TUNED } from '../src/data/aiWeights';
import { STRONGHOLD } from '../src/data/battle';
import { FULL_DECK } from '../src/engine';
import { series } from '../src/sim/arena';

/** 요충지 차등 조건 비교: 우세 쪽도 점령할 수 있되 열세 쪽이 더 유리하게 (8×8, 튜닝 AI 대 튜닝 AI) */
it('stronghold variants', () => {
  const tier = { beamWidth: 4, mistakeRate: 0.1 };
  const p = { weights: TUNED, tier };
  const variants: [string, number, number, number, number][] = [
    ['현재 (엄폐 30/30%, 유지 2/2턴)', 0.3, 0.3, 2, 2],
    ['엄폐 차등 (우세 10% / 열세 50%)', 0.1, 0.5, 2, 2],
    ['유지 차등 (우세 3턴 / 열세 2턴)', 0.3, 0.3, 3, 2],
    ['둘 다 (엄폐 10/50%, 유지 3/2턴)', 0.1, 0.5, 3, 2],
    ['둘 다 + 열세 1턴 (엄폐 10/50%, 유지 3/1턴)', 0.1, 0.5, 3, 1],
  ];
  for (const [label, cl, ct, hl, ht] of variants) {
    Object.assign(STRONGHOLD, { coverLeading: cl, coverTrailing: ct, holdLeading: hl, holdTrailing: ht });
    const r = series({ width: 8, height: 8, decks: [FULL_DECK, FULL_DECK], maxTurns: 100 }, p, p, 60, 500);
    const caps = r.all.flatMap((g) => g.captures.map((c) => ({ ...c, won: g.winner === c.side })));
    const behind = caps.filter((c) => c.behind);
    const ahead = caps.filter((c) => !c.behind);
    const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '-');
    console.log(
      `${label} | 점령 ${(caps.length / r.games).toFixed(2)}/판 | 열세 쪽 점령 ${behind.length}/${caps.length} (${pct(behind.length, caps.length)}) | 열세 점령 후 역전승 ${behind.filter((c) => c.won).length}/${behind.length} (${pct(behind.filter((c) => c.won).length, behind.length)}) | 우세 점령 후 승 ${pct(ahead.filter((c) => c.won).length, ahead.length)} | 평균 ${r.avgTurns.toFixed(1)}턴`,
    );
  }
});
