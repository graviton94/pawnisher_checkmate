import { it } from 'vitest';
import { LAB } from '../src/slice/cards';
import { newSliceBattle } from '../src/slice/battle';
import { playOut, playOutSearch } from '../src/slice/bot';

/**
 * 근간 시험장 A · B 비교 (D-177). `npm run sim -- lab`
 * 욕심 봇(한 수 앞) vs 수읽기 봇(한 턴 순서 탐색). 둘의 차이 = 생각할 거리의 양.
 * 기준: 지금 규칙(태엽 3 · 환급 없음)도 같이 잰다.
 */
const N = 30;
const run = (label: string, mk: (seed: number) => ReturnType<typeof newSliceBattle>) => {
  const res = { greedy: { w: 0, t: 0 }, search: { w: 0, t: 0 } };
  for (let k = 0; k < N; k++) {
    const g = playOut(mk(300 + k * 31));
    res.greedy.w += g.won ? 1 : 0;
    res.greedy.t += g.turns;
    const sr = playOutSearch(mk(300 + k * 31), 40, 3, 4);
    res.search.w += sr.won ? 1 : 0;
    res.search.t += sr.turns;
  }
  console.log(`${label}: 욕심 봇 ${Math.round((100 * res.greedy.w) / N)}% (${(res.greedy.t / N).toFixed(1)}턴) · 수읽기 봇 ${Math.round((100 * res.search.w) / N)}% (${(res.search.t / N).toFixed(1)}턴) · 차이 ${Math.round((100 * (res.search.w - res.greedy.w)) / N)}%p`);
};

it('시험장 비교', () => {
  run('지금 규칙', (seed) => newSliceBattle(LAB.squad.map((t) => ({ t })), LAB.enemy, LAB.deck, seed, { enemyKingHp: LAB.kingHpA }));
  run('시험장 A', (seed) => newSliceBattle(LAB.squad.map((t) => ({ t })), LAB.enemy, LAB.deck, seed, { enemyKingHp: LAB.kingHpA, lab: 'A' }));
  run('시험장 B', (seed) => newSliceBattle(LAB.squad.map((t) => ({ t })), LAB.enemy, LAB.deck, seed, { lab: 'B' }));
});
