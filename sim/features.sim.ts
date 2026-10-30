import { it } from 'vitest';
import { autoRun, type RunLog } from '../src/sim/runner';

/** D-094~097 요소 점검: 주문서 완수율 · 전술 키워드 빈도 · 군단 원형별/접사별 승률 · 지형 · 묘수 */
it('features', () => {
  const n = Number(process.env.SIM_GAMES ?? 40);
  const logs: RunLog[] = [];
  for (let i = 0; i < n; i++) logs.push(autoRun(1000 + i));
  const bs = logs.flatMap((l) => l.battles);
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '-');
  console.log(`대국 ${bs.length}판 (런 ${n})`);
  const byOrder = new Map<string, [number, number]>();
  for (const b of bs) if (b.order && b.won) { const v = byOrder.get(b.order) ?? [0, 0]; v[1]++; if (b.orderDone) v[0]++; byOrder.set(b.order, v); }
  console.log(`주문서 완수(이긴 판 기준): ${[...byOrder.entries()].map(([k, [d, t]]) => `${k} ${pct(d, t)}(${t})`).join(' · ')}`);
  const tac = new Map<string, number>();
  for (const b of bs) for (const [k, v] of Object.entries(b.tactics ?? {})) tac.set(k, (tac.get(k) ?? 0) + (v ?? 0));
  console.log(`전술 키워드 대국당: ${[...tac.entries()].map(([k, v]) => `${k} ${(v / bs.length).toFixed(2)}`).join(' · ')}`);
  for (const kind of ['battle', 'elite']) {
    const byArch = new Map<string, [number, number]>();
    for (const b of bs.filter((x) => x.kind === kind && x.archetype)) { const v = byArch.get(b.archetype!) ?? [0, 0]; v[1]++; if (b.won) v[0]++; byArch.set(b.archetype!, v); }
    console.log(`원형별 승률(${kind}): ${[...byArch.entries()].map(([k, [w, t]]) => `${k} ${pct(w, t)}(${t})`).join(' · ')}`);
  }
  const byAffix = new Map<string, [number, number]>();
  for (const b of bs.filter((x) => x.kind === 'elite')) for (const a of b.affixes ?? []) { const v = byAffix.get(a) ?? [0, 0]; v[1]++; if (b.won) v[0]++; byAffix.set(a, v); }
  console.log(`접사별 검문! 승률: ${[...byAffix.entries()].map(([k, [w, t]]) => `${k} ${pct(w, t)}(${t})`).join(' · ')}`);
  const withT = bs.filter((b) => (b.terrain ?? 0) > 0);
  const noT = bs.filter((b) => !b.terrain && b.floor >= 13 && b.kind !== 'boss');
  console.log(`지형 있는 판 ${withT.length} 승률 ${pct(withT.filter((b) => b.won).length, withT.length)} 평균 ${(withT.reduce((a, b) => a + b.turns, 0) / Math.max(1, withT.length)).toFixed(1)}턴 · (참고) 13층+ 맨바닥 ${noT.length}판`);
  const pz = logs.flatMap((l) => l.puzzles);
  console.log(`묘수 ${pz.length}회 · 해법 ${pct(pz.filter(Boolean).length, pz.length)}`);
}, 7_200_000);
