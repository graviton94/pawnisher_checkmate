import { it } from 'vitest';
import { simulateRun } from '../src/sim/runbot';
import { ECON } from '../src/slice/cards';

/**
 * 부품 칸 점검 (D-384, 사용자: 「유물 슬롯이 얻을 수 있는 선택지에 비해 너무 적지 않나」):
 * 칸 제한 없이 돌린 출하에서 얻은 부품 수 분포 — 막마다 · 끝까지 간 판. SL_N · SL_ASC · SL_STYLE
 */
it('slots', () => {
  const N = Number(process.env.SL_N ?? 60), asc = Number(process.env.SL_ASC ?? 0);
  const style = (process.env.SL_STYLE ?? 'greedy') as never;
  const byAct: Record<number, number[]> = {};
  const all: number[] = [];
  for (let i = 0; i < N; i++) {
    const r = simulateRun(91000 + i, { asc, style });
    (byAct[r.act] ??= []).push(r.parts.length);
    if (r.cleared) all.push(r.parts.length);
  }
  const avg = (a: number[]) => (a.length ? (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) : '-');
  const over = (a: number[]) => a.filter((n) => n > ECON.partSlots).length;
  console.log(`SL ${style} asc${asc} n${N} slots${ECON.partSlots}`);
  for (const k of Object.keys(byAct).sort()) console.log(`  막${k}에서 끝: ${byAct[+k].length}판 · 부품 평균 ${avg(byAct[+k])} · 최대 ${Math.max(...byAct[+k])} · 칸 넘음 ${over(byAct[+k])}`);
  console.log(`  완주 ${all.length}판 · 부품 평균 ${avg(all)} · 분포 ${JSON.stringify(all.sort((a, b) => a - b))}`);
});
