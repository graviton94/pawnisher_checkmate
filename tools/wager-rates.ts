/**
 * 판돈 조건 성공률 (피드백 #12 · D-503): 등반 봇 출하에서 보통 대국 · 검문(반장 · 입문 제외)마다
 * 「킹이 한 번도 맞지 않는다」 · 「한 턴에 둘 처치」가 이긴 대국 중 몇 %인지 잰다. 목표 ≈ 50%.
 * 사용: npx jiti tools/wager-rates.ts [출하 수=40] [봇=greedy] [승급=0]
 */
import { simulateRun, type RunStyle } from '../src/sim/runbot';

const n = Number(process.argv[2] ?? 40);
const style = (process.argv[3] ?? 'greedy') as RunStyle;
const asc = Number(process.argv[4] ?? 0);
const rows: { act: number; won: boolean; kingHit: boolean; best: number }[] = [];
for (let i = 0; i < n; i++) {
  const r = simulateRun(70000 + i, { style, asc });
  for (const l of r.log) if (l.kind !== 'boss' && l.act <= 3) rows.push({ act: l.act, won: l.won, kingHit: l.kingHit, best: l.bestTurnKills });
}
const pct = (a: number, b: number): string => `${Math.round((a / Math.max(1, b)) * 100)}%`;
console.log(`봇 ${style} · 승급 ${asc} · 출하 ${n} · 대국 ${rows.length}`);
for (const act of [1, 2, 3, 0]) {
  const rs = rows.filter((r) => act === 0 || r.act === act);
  const won = rs.filter((r) => r.won);
  console.log(`${act ? `${act}막` : '전체'} 대국 ${rs.length} · 승 ${pct(won.length, rs.length)} · 킹 무피격(승) ${pct(won.filter((r) => !r.kingHit).length, rs.length)} · 한 턴 둘 처치(승) ${pct(won.filter((r) => r.best >= 2).length, rs.length)} · 한 턴 셋 처치(승) ${pct(won.filter((r) => r.best >= 3).length, rs.length)}`);
}
