import { it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { simulateRun, type RunStyle } from '../src/sim/runbot';
import { SLICE_PARTS, type SlicePartId } from '../src/slice/parts';
import { REWARD_COMMANDS, type CommandId } from '../src/slice/cards';
import { ASC_NUM } from '../src/slice/run';
/**
 * 기록 유물 측정 (2026-11-09c): 같은 씨앗으로 「안 넣음」 vs 부품 하나 넣음 — 판마다 결과를 남겨 짝지은 비교를 한다.
 * RL_ITEMS=base,lastBreath,... · RL_N · RL_OFF · RL_ASC · RL_STYLE · RL_BASE(씨앗 시작) · RL_TAG (결과 sim/relic-<tag>.json)
 */
it('relic', () => {
  // RL_NOPOOL=1: 기록 유물 넷을 보상 풀에서 뺀 세상 (D-363 이전과 같은 풀) — 런타임에만 지운다
  // RL_ASCNUM='{"finalHp":1.2}': 승급 수치를 이 프로세스에서만 바꿔 본다 (제안 효과 미리 재기 — src는 그대로)
  if (process.env.RL_ASCNUM) Object.assign(ASC_NUM, JSON.parse(process.env.RL_ASCNUM));
  if (process.env.RL_NOPOOL) for (const id of ['lastBreath', 'ledger', 'veteran', 'deathMark']) delete (SLICE_PARTS as Record<string, unknown>)[id];
  const N = Number(process.env.RL_N ?? 40), off = Number(process.env.RL_OFF ?? 0), asc = Number(process.env.RL_ASC ?? 0);
  const style = (process.env.RL_STYLE ?? 'greedy') as RunStyle, sb = Number(process.env.RL_BASE ?? 52000);
  let items = (process.env.RL_ITEMS ?? 'base').split(',');
  // RL_ITEMS=ALL: 힘 값 표 전체 (카드는 card:<id> 두 장) — RL_SHARD=k/n 으로 나눈다
  if (items[0] === 'ALL') { const [k, n] = (process.env.RL_SHARD ?? '0/1').split('/').map(Number); items = ['base', ...REWARD_COMMANDS.map((c) => `card:${c}`), ...Object.keys(SLICE_PARTS)].filter((_, i) => i % n === k || i === 0); }
  const brief = !!process.env.RL_BRIEF;
  const out: Record<string, { s: number; c: number; p: number; a: number; e: string; b: string }[]> = {};
  for (const id of items) {
    out[id] = [];
    // 손 놓은 턴 (2026-11-09d): 태엽이 남고 낼 카드가 있었는데 끝낸 턴 비율 · 턴 끝 평균 남긴 태엽
    const it = { turns: 0, idle: 0, apLeft: 0, idleAp: 0 };
    for (let k = 0; k < N; k++) {
      const seed = sb + (k + off) * 7919;
      const r = simulateRun(seed, { asc, style, ...(id.startsWith('card:') ? { forceCards: [id.slice(5), id.slice(5)] as CommandId[] } : { forceParts: id === 'base' ? [] : [id as SlicePartId] }) });
      it.turns += r.idle.turns; it.idle += r.idle.idle; it.apLeft += r.idle.apLeft; it.idleAp += r.idle.idleAp;
      out[id].push({ s: seed, c: +r.cleared, p: r.battles - (r.cleared ? 0 : 1), a: r.act, e: r.ended, b: r.bosses.map((x) => `${x.act}${x.rule}:${+x.won}`).join(',') });
    }
    const rs = out[id];
    console.log(`RL ${id} asc${asc} ${style} n${N} clear ${rs.filter((r) => r.c).length} prog ${(rs.reduce((a, r) => a + r.p, 0) / N).toFixed(2)} idle ${((100 * it.idle) / Math.max(1, it.turns)).toFixed(1)}% apLeft ${(it.apLeft / Math.max(1, it.turns)).toFixed(2)} idleAp ${(it.idleAp / Math.max(1, it.idle)).toFixed(2)} turns ${it.turns}`);
  }
  writeFileSync(`sim/relic-${process.env.RL_TAG ?? 'x'}.json`, JSON.stringify(brief ? { asc, style, N, rows: Object.entries(out).map(([id, rs]) => ({ id, c: rs.filter((r) => r.c).length, p: rs.reduce((a, r) => a + r.p, 0) / N })) } : { asc, style, N, off, sb, out }));
}, 3_600_000);
