import { simulateRun, type RunBuild, type RunOpts, type RunStyle } from './runbot';

/** Vitest 검증 경로와 경량 Node 작업자가 같은 입력·측정 행을 사용한다. */
export const climbSample = (seed: number, asc: number, style: RunStyle, build: RunBuild, pool: 'all' | 'starter', persona: NonNullable<RunOpts['persona']> = 'standard', temp = 0) => {
  const r = simulateRun(seed, { asc, style, build, pool, persona, temp });
  return { seed, s: style, f: build, pool, pe: persona, tp: temp, fp: r.familyParts, parts: r.parts, bosses: r.bosses,
    a: asc, c: r.cleared ? 1 : 0, act: r.act, end: r.ended, p: r.parts.length, sq: r.squad.length,
    d: r.deck, t: r.turns, b: r.battles, it: r.idle.turns, ii: r.idle.idle, ia: r.idle.idleAp,
    // 실험실 지표 (D-456 — tools/simlab-report.mjs): 제시 · 선택 [id, 부품?, 골랐나] · 종막 직전 나사 · 남은 시작 카드 · 대국마다 [막, 종류(n 일반 · c 검문 · o 반장), 승, 턴, 남은 체력, 스윙, 한 방, 턴당 피해, 쓰러짐, 한 턴 최다 쓰러짐]
    ex: r.extremes, of: r.offers.map((o) => [o.id, o.part ? 1 : 0, o.taken ? 1 : 0] as const), gf: r.goldAtFinal, sl: r.starterLeft,
    lg: r.log.map((l) => [l.act, ({ battle: 'n', check: 'c', boss: 'o' } as const)[l.kind], l.won ? 1 : 0, l.turns, +l.hpAfter.toFixed(3), +l.swing.toFixed(3), l.peak, Math.round(l.dpt), l.fell, l.maxFellInTurn] as const) };
};
