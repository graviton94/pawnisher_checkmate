import type { Weights } from '../ai/evaluate';

/** 자체 대전 튜닝 결과 (sim/tune.sim.ts, D-018). 기본 가중치 대비 64% (8×8 풀 덱 40판). */
export const TUNED: Weights = {
  enemyKing: 4.514,
  ownKing: 4.9,
  material: 2.107,
  threat: 0.363,
  advance: 0.532,
  promotion: 0.744,
  stronghold: 0.564,
  kill: 0.6
};
