import { simulateRun, type RunBuild, type RunStyle } from './runbot';

/** Vitest 검증 경로와 경량 Node 작업자가 같은 입력·측정 행을 사용한다. */
export const climbSample = (seed: number, asc: number, style: RunStyle, build: RunBuild, pool: 'all' | 'starter') => {
  const r = simulateRun(seed, { asc, style, build, pool });
  return { seed, s: style, f: build, pool, fp: r.familyParts, parts: r.parts, bosses: r.bosses,
    a: asc, c: r.cleared ? 1 : 0, act: r.act, end: r.ended, p: r.parts.length, sq: r.squad.length,
    d: r.deck, t: r.turns, b: r.battles, it: r.idle.turns, ii: r.idle.idle, ia: r.idle.idleAp };
};
