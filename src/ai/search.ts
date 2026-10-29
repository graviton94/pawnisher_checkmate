import { buildGrid, findPiece } from '../engine/board';
import { availableAp, checkPlan, moveCost } from '../engine/plan';
import { resolveTurn } from '../engine/resolve';
import { legalMoves } from '../engine/rules';
import { Rng } from '../engine/rng';
import type { BattleState, Plan } from '../engine/types';
import { BALANCED, evaluate, WIN_SCORE, type Weights } from './evaluate';

/** AI 지능 단계 (GDD 4장 §4.7). 높을수록 넓게 보고 실수가 적다. */
export interface AiTier {
  beamWidth: number;
  /** 최선이 아닌 차선책을 고를 확률 */
  mistakeRate: number;
}

export const AI_TIERS: AiTier[] = [
  { beamWidth: 3, mistakeRate: 0.25 },
  { beamWidth: 6, mistakeRate: 0.1 },
  { beamWidth: 10, mistakeRate: 0 },
];

export interface AiOptions {
  tier?: AiTier;
  weights?: Weights;
  seed?: number;
}

interface Scored {
  plan: Plan;
  score: number;
  key: string;
}

const planKey = (plan: Plan): string => plan.map((m) => `${m.pieceId}:${m.to.x},${m.to.y}`).join('|');

/**
 * 빔 서치로 이번 턴 계획을 고른다 (GDD 4장 §4.2).
 * 계획 끝에 이동을 하나씩 덧붙이며, 각 후보를 규칙 엔진으로 끝까지 실행해 평가한다.
 */
export const choosePlan = (s: BattleState, opts: AiOptions = {}): Plan => {
  const tier = opts.tier ?? AI_TIERS[1];
  const weights = opts.weights ?? BALANCED;
  const rng = new Rng(opts.seed ?? s.turnNumber * 7919);
  const side = s.turnSide;
  const budget = availableAp(s);

  const score = (plan: Plan): number => evaluate(resolveTurn(s, plan).state, side, weights);

  const pass: Scored = { plan: [], score: score([]), key: '' };
  const all: Scored[] = [pass];
  let beam: Scored[] = [pass];

  while (beam.length) {
    const next = new Map<string, Scored>();
    for (const cur of beam) {
      const check = checkPlan(s, cur.plan);
      const grid = buildGrid(check.virtual);
      const used = new Set(cur.plan.map((m) => m.pieceId));
      for (const p of check.virtual.pieces) {
        if (p.side !== side || used.has(p.id)) continue;
        if (check.apUsed + moveCost(p) > budget) continue;
        for (const to of legalMoves(check.virtual, p, grid)) {
          const plan = [...cur.plan, { pieceId: p.id, to }];
          const key = planKey(plan);
          if (next.has(key)) continue;
          const sc = score(plan);
          const cand = { plan, score: sc, key };
          next.set(key, cand);
          // 즉시 승리하는 계획은 바로 고른다
          if (sc >= WIN_SCORE) return plan;
        }
      }
    }
    const ranked = [...next.values()].sort((a, b) => b.score - a.score || (a.key < b.key ? -1 : 1));
    all.push(...ranked.slice(0, tier.beamWidth * 2));
    beam = ranked.slice(0, tier.beamWidth);
  }

  all.sort((a, b) => b.score - a.score || (a.key < b.key ? -1 : 1));
  const pick = all.length > 1 && rng.next() < tier.mistakeRate ? all[1] : all[0];
  return pick.plan.filter((m) => findPiece(s, m.pieceId));
};
