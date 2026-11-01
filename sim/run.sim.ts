import { it } from 'vitest';
import { autoRun, type RunLog } from '../src/sim/runner';
import { seedCode } from '../src/run/seed';
import { FLOORS_PER_ACT as P, TOTAL_FLOORS as T } from '../src/data/run';

/** M5 자동 등반: 층별 생존·경제·덱 성장 곡선 (GDD 8장) */
it('run', () => {
  const n = Number(process.env.SIM_GAMES ?? 40);
  const logs: RunLog[] = [];
  const t0 = Date.now();
  for (let i = 0; i < n; i++) logs.push(autoRun(1000 + i));
  const pct = (x: number) => `${Math.round((x / n) * 100)}%`;
  console.log(`런 ${n}회, 런당 ${((Date.now() - t0) / n / 1000).toFixed(1)}초`);
  console.log(`${T}층 완료: ${pct(logs.filter((l) => l.won).length)}`);
  const at = [3, 5, P, P + 1, 2 * P, 2 * P + 1, T];
  console.log(`층 도달: ${at.map((f) => `${f}층 ${pct(logs.filter((l) => l.floor >= f && (f < T || l.won || l.floor === T)).length)}`).join(' · ')}`);
  const died = new Map<string, number>();
  for (const l of logs) if (!l.won) died.set(`${l.floor}층 ${l.diedAt}`, (died.get(`${l.floor}층 ${l.diedAt}`) ?? 0) + 1);
  console.log(`사망 위치: ${[...died.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
  for (const [label, lo, hi] of [['1~2층', 1, 2], [`3~${P - 1}층`, 3, P - 1], [`${P}층`, P, P], [`${P + 1}~${2 * P - 1}층`, P + 1, 2 * P - 1], [`${2 * P}층`, 2 * P, 2 * P], [`${2 * P + 1}~${T - 1}층`, 2 * P + 1, T - 1], [`${T}층`, T, T]] as const) {
    for (const kind of ['battle', 'elite', 'boss']) {
      const bs = logs.flatMap((l) => l.battles).filter((b) => b.floor >= lo && b.floor <= hi && b.kind === kind);
      if (!bs.length) continue;
      const w = bs.filter((b) => b.won).length;
      console.log(`${label} ${kind}: ${bs.length}판 승률 ${Math.round((w / bs.length) * 100)}% 평균 ${(bs.reduce((a, b) => a + b.turns, 0) / bs.length).toFixed(1)}턴`);
    }
  }
  for (const f of [1, 4, P, P + 1, 2 * P, 2 * P + 1, T]) {
    const tr = logs.flatMap((l) => l.trace.filter((t) => t.floor === f));
    if (!tr.length) continue;
    const avg = (k: 'gold' | 'deck' | 'carves' | 'parts' | 'threats') => (tr.reduce((a, t) => a + t[k], 0) / tr.length).toFixed(1);
    console.log(`${f}층 도착(${tr.length}): 나사 ${avg('gold')} · 군단 ${avg('deck')}기 · 각인 ${avg('carves')} · 부품 ${avg('parts')} · 적 강화 ${avg('threats')}`);
  }
  // 반장별
  const byBoss = new Map<string, [number, number]>();
  for (const b of logs.flatMap((l) => l.battles).filter((b) => b.kind === 'boss')) {
    const k = String(b.boss);
    const [w, t] = byBoss.get(k) ?? [0, 0];
    byBoss.set(k, [w + (b.won ? 1 : 0), t + 1]);
  }
  console.log(`반장별: ${[...byBoss.entries()].map(([k, [w, t]]) => `${k} ${Math.round((w / t) * 100)}%(${t})`).join(' · ')}`);
  // 리뷰용 시드 (D-099): 같은 시드로 직접 해 보면 그 판을 다시 볼 수 있다
  const code = (i: number) => seedCode(1000 + i);
  const pick = (f: (l: RunLog) => boolean, k = 4) => logs.map((l, i) => [l, i] as const).filter(([l]) => f(l)).slice(0, k).map(([l, i]) => `${code(i)}(${l.floor}층)`).join(' ');
  console.log(`리뷰 시드 — 완주: ${pick((l) => l.won)} · 일찍 죽음(≤4층): ${pick((l) => !l.won && l.floor <= 4)}`);
  const avgE = logs.reduce((a, l) => a + l.goldEarned, 0) / n;
  const avgS = logs.reduce((a, l) => a + l.goldSpent, 0) / n;
  console.log(`골드: 런당 획득 ${avgE.toFixed(0)} · 소비 ${avgS.toFixed(0)}`);
}, 7_200_000);
