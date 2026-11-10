import { it } from 'vitest';
import { simulateRun, type RunStyle } from '../src/sim/runbot';
/** 원인 찾기 A/B (D-358): AB_N판 · AB_ASC · AB_STYLE — 완주율 · 진행 · 반장 승률 */
it('ab', () => {
  const N = Number(process.env.AB_N ?? 40), asc = Number(process.env.AB_ASC ?? 0), style = (process.env.AB_STYLE ?? 'greedy') as RunStyle;
  const off = Number(process.env.AB_OFF ?? 0);
  const rs = Array.from({ length: N }, (_, k) => simulateRun(31000 + (k + off) * 7919, { asc, style }));
  const boss: Record<string, [number, number]> = {};
  for (const r of rs) for (const b of r.bosses) { boss[b.rule] ??= [0, 0]; boss[b.rule][0] += +b.won; boss[b.rule][1]++; }
  const clear = rs.filter((r) => r.cleared).length, prog = rs.reduce((a, r) => a + r.battles - (r.cleared ? 0 : 1), 0) / N;
  const ends: Record<string, number> = {}; for (const r of rs) if (!r.cleared) ends[r.ended] = (ends[r.ended] ?? 0) + 1;
  console.log(`AB ${process.env.AB_TAG ?? ''} asc${asc} ${style} n${N} clear ${clear} prog ${prog.toFixed(2)} boss ${Object.entries(boss).map(([k, [w, n]]) => `${k}:${w}/${n}`).join(' ')} END ${Object.entries(ends).map(([k, v]) => `${k}=${v}`).join(' ')}`);
}, 3_600_000);
