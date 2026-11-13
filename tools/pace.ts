/**
 * 판 길이 점검 (D-449): 봇 출하를 돌려 대국마다 몇 턴에 끝났는지 · 적이 한 번도 못 움직이고 끝난 비율(1턴 승리) ·
 * 한 적 턴에 분대원 둘 이상이 쓰러진 비율을 막 · 종류별 표 한 장으로 찍는다.
 * 실행: `npx jiti tools/pace.ts [n=40] [styles=greedy,search] [asc=0]`
 */
import { simulateRun, type BattleLog, type RunBuild, type RunStyle } from '../src/sim/runbot';
import type { SlicePartId } from '../src/slice/parts';
import { PACE, SLICE } from '../src/slice/cards';

const n = Number(process.argv[2] ?? 40);
const styles = (process.argv[3] ?? 'greedy,search').split(',') as RunStyle[];
const asc = Number(process.argv[4] ?? 0);
/** 다섯째 = 빌드(neutral · knight …), 여섯째 = 처음부터 쥐여 줄 부품(쉼표) — 사람이 쓴 조합을 재현할 때 */
const build = (process.argv[5] ?? 'neutral') as RunBuild;
const forceParts = (process.argv[6] ? process.argv[6].split(',') : []) as SlicePartId[];
/** 일곱째 = 실험값 `키=값,키=값` — ap · draw · once(제동 PACE) · refund · atk · atkGrow · hp · hpGrow(SLICE). 주지 않으면 게임 기본값 */
for (const kv of (process.argv[7] ?? '').split(',').filter(Boolean)) {
  const [k, v] = kv.split('=');
  const x = Number(v);
  if (k === 'ap') PACE.apGainPerTurn = x;
  else if (k === 'draw') PACE.drawPerTurn = x;
  else if (k === 'once') PACE.discountOnce = !!x;
  else if (k === 'refund') (SLICE as { refundCap: number }).refundCap = x;
  else if (k === 'atk') (SLICE as { foeAtk: number }).foeAtk = x;
  else if (k === 'atkGrow') (SLICE as { foeAtkGrow: number }).foeAtkGrow = x;
  else if (k === 'hp') (SLICE as { foeHpStart: number }).foeHpStart = x;
  else if (k === 'hpGrow') (SLICE as { foeHpGrow: number }).foeHpGrow = x;
  else throw new Error(`모르는 실험 키: ${k}`);
}
console.log(`제동: 태엽 +${PACE.apGainPerTurn || '∞'}/턴 · 뽑기 +${PACE.drawPerTurn || '∞'}/턴 · 할인 ${PACE.discountOnce ? '턴당 첫 장' : '모든 장'} · 처치 환급 ${SLICE.refundCap} | 적 공격 ×${SLICE.foeAtk} (+${SLICE.foeAtkGrow}/깊이) · 적 HP ×${SLICE.foeHpStart} (×${SLICE.foeHpGrow}/깊이)`);
const pct = (a: number, b: number): string => (b ? `${Math.round((a / b) * 100)}%` : '—').padStart(4);
for (const style of styles) {
  const all: BattleLog[] = [];
  let cleared = 0;
  for (let i = 0; i < n; i++) {
    const r = simulateRun(91000 + i, { asc, style, build, forceParts });
    all.push(...r.log);
    if (r.cleared) cleared++;
  }
  console.log(`\n[${style} · ${build}${forceParts.length ? ` · ${forceParts.join('+')}` : ''}] 승급 ${asc} · ${n}출하 · 완주 ${pct(cleared, n)} · 대국 ${all.length}`);
  console.log('구간            대국   평균턴  1턴승  ≤2턴승  3턴+승   패배   한턴에2기↓');
  const groups: [string, (b: BattleLog) => boolean][] = [
    ['1막 일반', (b) => b.act === 1 && b.kind === 'battle'], ['1막 검문', (b) => b.act === 1 && b.kind === 'check'], ['1막 반장', (b) => b.act === 1 && b.kind === 'boss'],
    ['2막 일반', (b) => b.act === 2 && b.kind === 'battle'], ['2막 검문', (b) => b.act === 2 && b.kind === 'check'], ['2막 반장', (b) => b.act === 2 && b.kind === 'boss'],
    ['3막 일반', (b) => b.act === 3 && b.kind === 'battle'], ['3막 검문', (b) => b.act === 3 && b.kind === 'check'], ['3막 반장', (b) => b.act === 3 && b.kind === 'boss'],
    ['종막 도금왕', (b) => b.act === 4], ['전체', () => true],
  ];
  for (const [name, f] of groups) {
    const g = all.filter(f);
    if (!g.length) continue;
    const w = g.filter((b) => b.won);
    console.log(`${name.padEnd(10, '　')} ${String(g.length).padStart(5)}  ${(w.reduce((a, b) => a + b.turns, 0) / Math.max(1, w.length)).toFixed(1).padStart(6)}  ${pct(w.filter((b) => b.turns <= 1).length, g.length)}   ${pct(w.filter((b) => b.turns <= 2).length, g.length)}    ${pct(w.filter((b) => b.turns >= 3).length, g.length)}   ${pct(g.length - w.length, g.length)}   ${pct(g.filter((b) => b.maxFellInTurn >= 2).length, g.length)}`);
  }
  // 덧붙임: 1턴 승리는 킹만 잡은 것인가 · 누가 우리 기물을 쓰러뜨리나
  const one = all.filter((b) => b.won && b.turns <= 1);
  const two = all.filter((b) => b.won && b.turns === 2);
  const left = (g: BattleLog[]): string => (g.length ? (g.reduce((a, b) => a + b.enemiesLeft, 0) / g.length).toFixed(1) : '—');
  console.log(`1턴 승리 ${one.length}판: 끝났을 때 남은 적 평균 ${left(one)} (처음 ${one.length ? (one.reduce((a, b) => a + b.enemies, 0) / one.length).toFixed(1) : '—'}) · 2턴 승리 ${two.length}판: 남은 적 ${left(two)}`);
  const by: Record<string, number> = {};
  for (const b of all) for (const t of b.killers) by[t] = (by[t] ?? 0) + 1;
  console.log(`분대원을 쓰러뜨린 적: ${Object.entries(by).sort((a, b) => b[1] - a[1]).map(([t, c]) => `${t} ${c}`).join(' · ')} · 쓰러진 분대원 대국당 ${(all.reduce((a, b) => a + b.fell, 0) / all.length).toFixed(2)}`);
}
