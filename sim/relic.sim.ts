import { it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { simulateRun, type RunStyle } from '../src/sim/runbot';
import type { SlicePartId } from '../src/slice/parts';
/**
 * 기록 유물 측정 (2026-11-09c): 같은 씨앗으로 「안 넣음」 vs 부품 하나 넣음 — 판마다 결과를 남겨 짝지은 비교를 한다.
 * RL_ITEMS=base,lastBreath,... · RL_N · RL_OFF · RL_ASC · RL_STYLE · RL_BASE(씨앗 시작) · RL_TAG (결과 sim/relic-<tag>.json)
 */
it('relic', () => {
  const N = Number(process.env.RL_N ?? 40), off = Number(process.env.RL_OFF ?? 0), asc = Number(process.env.RL_ASC ?? 0);
  const style = (process.env.RL_STYLE ?? 'greedy') as RunStyle, sb = Number(process.env.RL_BASE ?? 52000);
  const items = (process.env.RL_ITEMS ?? 'base').split(',');
  const out: Record<string, { s: number; c: number; p: number; a: number; e: string; b: string }[]> = {};
  for (const id of items) {
    out[id] = [];
    for (let k = 0; k < N; k++) {
      const seed = sb + (k + off) * 7919;
      const r = simulateRun(seed, { asc, style, forceParts: id === 'base' ? [] : [id as SlicePartId] });
      out[id].push({ s: seed, c: +r.cleared, p: r.battles - (r.cleared ? 0 : 1), a: r.act, e: r.ended, b: r.bosses.map((x) => `${x.act}${x.rule}:${+x.won}`).join(',') });
    }
    const rs = out[id];
    console.log(`RL ${id} asc${asc} ${style} n${N} clear ${rs.filter((r) => r.c).length} prog ${(rs.reduce((a, r) => a + r.p, 0) / N).toFixed(2)}`);
  }
  writeFileSync(`sim/relic-${process.env.RL_TAG ?? 'x'}.json`, JSON.stringify({ asc, style, N, off, sb, out }));
}, 3_600_000);
