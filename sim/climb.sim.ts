import { it } from 'vitest';
import { simulateRun, type RunStyle } from '../src/sim/runbot';

/**
 * 퀵 등반 머신 조각 (D-385, 사용자: 「밸런스 모니터링용 · 토큰과 세션을 아끼는 데이터 수집용 퀵 등반 머신과 화면 리뷰용은 따로」).
 * 직접 부르지 말고 `npm run climb`(tools/climb.mjs)이 여러 조각을 나눠 돌린다. 판마다 결과를 한 줄 JSON(CLIMB …)으로만 낸다.
 * CL_STYLE · CL_ASC · CL_N · CL_OFF
 */
it('climb', () => {
  const style = (process.env.CL_STYLE ?? 'greedy') as RunStyle;
  const asc = Number(process.env.CL_ASC ?? 0), n = Number(process.env.CL_N ?? 25), off = Number(process.env.CL_OFF ?? 0);
  for (let i = 0; i < n; i++) {
    const r = simulateRun(70000 + off + i, { asc, style });
    process.stdout.write(`CLIMB ${JSON.stringify({ s: style, a: asc, c: r.cleared ? 1 : 0, act: r.act, end: r.ended, p: r.parts.length, sq: r.squad.length, d: r.deck, t: r.turns, b: r.battles, it: r.idle?.turns ?? 0, ii: r.idle?.idle ?? 0, ia: r.idle?.idleAp ?? 0 })}\n`);
  }
});
