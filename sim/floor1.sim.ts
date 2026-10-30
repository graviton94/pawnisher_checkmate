import { it } from 'vitest';
import { enterNode, newRun } from '../src/run/run';
import { playBattle } from '../src/sim/runner';

/** 1층 첫 대국만: 군단 원형 · 적 구성별 승률 (D-099 진단) */
it('floor1', () => {
  const n = Number(process.env.SIM_GAMES ?? 200);
  const by = new Map<string, [number, number]>();
  for (let i = 0; i < n; i++) {
    const run = newRun(1000 + i);
    enterNode(run, 0);
    if (run.stage.at !== 'battle') continue;
    const e = run.stage.encounter;
    const { state } = playBattle(run, (1000 + i) * 1000 + 1);
    const key = `${e.archetype} ${[...e.deck].sort().join('')} vs ${[...run.deck].sort().join('')}`;
    const k2 = `${e.archetype}`;
    for (const k of [k2, `덱 ${[...e.deck].sort().join('')}`]) {
      const v = by.get(k) ?? [0, 0];
      v[1]++;
      if (state.winner === 0) v[0]++;
      by.set(k, v);
    }
    void key;
  }
  console.log([...by.entries()].sort((a, b) => b[1][1] - a[1][1]).map(([k, [w, t]]) => `${k}: ${Math.round((w / t) * 100)}% (${t})`).join('\n'));
}, 3_600_000);
