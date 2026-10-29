import { it } from 'vitest';
import { autoRun, type RunLog } from '../src/sim/runner';

/** M5 자동 등반: 층별 생존·경제·덱 성장 곡선 (GDD 8장) */
it('run', () => {
  const n = Number(process.env.SIM_GAMES ?? 40);
  const logs: RunLog[] = [];
  const t0 = Date.now();
  for (let i = 0; i < n; i++) logs.push(autoRun(1000 + i));
  const pct = (x: number) => `${Math.round((x / n) * 100)}%`;
  console.log(`런 ${n}회, 런당 ${((Date.now() - t0) / n / 1000).toFixed(1)}초`);
  console.log(`36층 완료: ${pct(logs.filter((l) => l.won).length)}`);
  const at = [4, 8, 12, 13, 18, 24, 25, 30, 36];
  console.log(`층 도달: ${at.map((f) => `${f}층 ${pct(logs.filter((l) => l.floor >= f && (f < 36 || l.won || l.floor === 36)).length)}`).join(' · ')}`);
  const died = new Map<string, number>();
  for (const l of logs) if (!l.won) died.set(`${l.floor}층 ${l.diedAt}`, (died.get(`${l.floor}층 ${l.diedAt}`) ?? 0) + 1);
  console.log(`사망 위치: ${[...died.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
  for (const [label, lo, hi] of [['1~3층', 1, 3], ['4~11층', 4, 11], ['12층', 12, 12], ['13~23층', 13, 23], ['24층', 24, 24], ['25~35층', 25, 35], ['36층', 36, 36]] as const) {
    for (const kind of ['battle', 'elite', 'boss']) {
      const bs = logs.flatMap((l) => l.battles).filter((b) => b.floor >= lo && b.floor <= hi && b.kind === kind);
      if (!bs.length) continue;
      const w = bs.filter((b) => b.won).length;
      console.log(`${label} ${kind}: ${bs.length}판 승률 ${Math.round((w / bs.length) * 100)}% 평균 ${(bs.reduce((a, b) => a + b.turns, 0) / bs.length).toFixed(1)}턴`);
    }
  }
  for (const f of [1, 4, 8, 12, 18, 24, 30, 36]) {
    const tr = logs.flatMap((l) => l.trace.filter((t) => t.floor === f));
    if (!tr.length) continue;
    const avg = (k: 'gold' | 'deck' | 'forge' | 'enchants' | 'cards') => (tr.reduce((a, t) => a + t[k], 0) / tr.length).toFixed(1);
    console.log(`${f}층 도착(${tr.length}): 골드 ${avg('gold')} · 덱 ${avg('deck')}기 · 강화 합 ${avg('forge')} · 인챈트 ${avg('enchants')}장 · 카드 ${avg('cards')}`);
  }
  const avgE = logs.reduce((a, l) => a + l.goldEarned, 0) / n;
  const avgS = logs.reduce((a, l) => a + l.goldSpent, 0) / n;
  console.log(`골드: 런당 획득 ${avgE.toFixed(0)} · 소비 ${avgS.toFixed(0)}`);
}, 7_200_000);
