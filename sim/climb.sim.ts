import { it } from 'vitest';
import type { RunStyle, RunBuild } from '../src/sim/runbot';
import { climbSample } from '../src/sim/climb-sample';

/**
 * 퀵 등반 머신 조각 (D-385, 사용자: 「밸런스 모니터링용 · 토큰과 세션을 아끼는 데이터 수집용 퀵 등반 머신과 화면 리뷰용은 따로」).
 * 직접 부르지 말고 `npm run climb`(tools/climb.mjs)이 여러 조각을 나눠 돌린다. 판마다 결과를 한 줄 JSON(CLIMB …)으로만 낸다.
 * CL_STYLE · CL_ASC · CL_N · CL_OFF
 */
it('climb', () => {
  const style = (process.env.CL_STYLE ?? 'greedy') as RunStyle;
  const build = (process.env.CL_BUILD ?? 'neutral') as RunBuild;
  const pool = (process.env.CL_POOL ?? 'all') as 'all' | 'starter';
  const asc = Number(process.env.CL_ASC ?? 0), n = Number(process.env.CL_N ?? 25), off = Number(process.env.CL_OFF ?? 0);
  for (let i = 0; i < n; i++) {
    const seed = 70000 + off + i;
    process.stdout.write(`CLIMB ${JSON.stringify(climbSample(seed, asc, style, build, pool, (process.env.CL_PERSONA ?? 'standard') as 'standard' | 'risky' | 'hoarder', Number(process.env.CL_TEMP ?? 0)))}\n`);
  }
});
