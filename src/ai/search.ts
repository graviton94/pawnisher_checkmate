import { buildGrid, findPiece } from '../engine/board';
import { actedInPlan, availableAp, checkPlan, moveCost } from '../engine/plan';
import { attachVariants, executeMoves, specialSteps } from '../engine/options';
import { CARDS } from '../data/cards';
import { resolveTurn } from '../engine/resolve';
import { legalMoves } from '../engine/rules';
import { Rng } from '../engine/rng';
import type { BattleState, Plan, PlanStep } from '../engine/types';
import { TUNED } from '../data/aiWeights';
import { evaluate, WIN_SCORE, type Weights } from './evaluate';

/** AI 지능 단계 (GDD 4장 §4.7). 높을수록 넓게 보고 실수가 적다. */
export interface AiTier {
  beamWidth: number;
  /** 최선이 아닌 차선책을 고를 확률 */
  mistakeRate: number;
}

/**
 * 시뮬레이션 결과(8×8, 60판): 실력 차이는 탐색 폭보다 실수율에서 크게 난다.
 * 단계 3 vs 단계 1 = 65%. 상대 응수까지 보는 2수 탐색은 오히려 약해져(38%) 넣지 않았다 — D-018 참고.
 */
export const AI_TIERS: AiTier[] = [
  { beamWidth: 3, mistakeRate: 0.3 },
  { beamWidth: 6, mistakeRate: 0.12 },
  { beamWidth: 10, mistakeRate: 0 },
];

export interface AiOptions {
  tier?: AiTier;
  weights?: Weights;
  seed?: number;
  /** false면 카드·특수 행동을 쓰지 않는다 (기본 true) */
  cards?: boolean;
}

interface Scored {
  plan: Plan;
  score: number;
  key: string;
}

const planKey = (plan: Plan): string => JSON.stringify(plan);

/**
 * 빔 서치로 이번 턴 계획을 고른다 (GDD 4장 §4.2).
 * 계획 끝에 이동을 하나씩 덧붙이며, 각 후보를 규칙 엔진으로 끝까지 실행해 평가한다.
 */
export const choosePlan = (s: BattleState, opts: AiOptions = {}): Plan => {
  const tier = opts.tier ?? AI_TIERS[1];
  const weights = opts.weights ?? TUNED;
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
      const steps: PlanStep[] = [];
      for (const p of check.virtual.pieces) {
        if (p.side !== side || actedInPlan(cur.plan, p.id, s)) continue;
        if (check.apUsed + moveCost(check.virtual, p) > budget) continue;
        for (const to of legalMoves(check.virtual, p, grid)) steps.push({ pieceId: p.id, to });
      }
      // 카드·인챈트 특수 행동 (GDD 7장)
      if (opts.cards !== false) steps.push(...specialSteps(s, cur.plan), ...executeMoves(s, cur.plan));
      for (const step of steps) {
        const plan = [...cur.plan, step];
        const key = planKey(plan);
        if (next.has(key)) continue;
        const sim = checkPlan(s, plan);
        if (!sim.ok) continue;
        const sc = score(plan);
        next.set(key, { plan, score: sc, key });
        // 즉시 승리하는 계획은 바로 고른다
        if (sc >= WIN_SCORE) return plan;
      }
    }
    const ranked = [...next.values()].sort((a, b) => b.score - a.score || (a.key < b.key ? -1 : 1));
    all.push(...ranked.slice(0, tier.beamWidth * 2));
    beam = ranked.slice(0, tier.beamWidth);
  }

  all.sort((a, b) => b.score - a.score || (a.key < b.key ? -1 : 1));
  const pick = all.length > 1 && rng.next() < tier.mistakeRate ? all[1] : all[0];
  let plan = pick.plan.filter((m) => findPiece(s, m.pieceId) || m.kind === 'fuse');
  if (opts.cards !== false) plan = attachCards(s, plan, score);
  return plan;
};

/** 소멸 카드는 아껴 쓴다: 이만큼 점수가 오를 때만 붙인다 */
const CONSUME_MARGIN = 15;

/**
 * 고른 계획의 이동 예약마다 붙일 수 있는 카드(attach)를 시험해, 점수가 오르면 붙인다 (탐욕적 후처리).
 * 빔 서치 단계에서 카드 조합까지 펼치면 후보가 카드 수만큼 곱절로 늘어나므로 여기서 처리한다.
 */
const attachCards = (s: BattleState, plan: Plan, score: (p: Plan) => number): Plan => {
  let best = plan;
  let bestScore = score(plan);
  for (let i = 0; i < best.length; i++) {
    let choice: Plan | null = null;
    let choiceScore = bestScore;
    for (const cand of attachVariants(s, best, i)) {
      const st = cand[i];
      const card = 'card' in st && st.card !== undefined ? s.cards[s.turnSide][st.card] : undefined;
      const margin = card && CARDS[card.id].limit.type === 'consume' ? CONSUME_MARGIN : 1;
      const sc = score(cand);
      if (sc >= WIN_SCORE) return cand;
      if (sc > choiceScore + margin) {
        choice = cand;
        choiceScore = sc;
      }
    }
    if (choice) {
      best = choice;
      bestScore = choiceScore;
    }
  }
  return best;
};
