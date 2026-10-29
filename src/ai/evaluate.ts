import { BASE_AP, PIECE_STATS } from '../data/pieces';
import { buildGrid, forward, kingOf } from '../engine/board';
import { attackTargets, damageOf, legalMoves } from '../engine/rules';
import { otherSide, type BattleState, type Piece, type Side } from '../engine/types';

/** 평가 가중치 묶음 = 군단 성향 (GDD 4장 §4.4) */
export interface Weights {
  /** 상대 킹에게 준 피해 */
  enemyKing: number;
  /** 내 킹의 잃은 HP */
  ownKing: number;
  /** 양측 전력 차 */
  material: number;
  /** 다음 상대 턴 위협 추정치 */
  threat: number;
  /** 전진 정도 (교착 방지) */
  advance: number;
}

export const BALANCED: Weights = { enemyKing: 6, ownKing: 6, material: 2, threat: 1.2, advance: 0.6 };
export const AGGRESSIVE: Weights = { enemyKing: 9, ownKing: 5, material: 2, threat: 0.7, advance: 1 };
export const DEFENSIVE: Weights = { enemyKing: 5, ownKing: 8, material: 2.5, threat: 2, advance: 0.3 };

export const WIN_SCORE = 1_000_000;

const valueOf = (p: Piece): number => (p.type === 'K' ? 0 : PIECE_STATS[p.type].value);

/** 피격 가치: 킹 피해는 HP 비율로, 나머지는 가치 × 잃는 HP 비율 + 처치 보너스 */
const hitWorth = (target: Piece, damage: number): number => {
  const dealt = Math.min(target.hp + target.shield, damage);
  if (target.type === 'K') return (dealt / target.maxHp) * 100 * 4;
  const kill = dealt >= target.hp + target.shield ? valueOf(target) * 0.5 : 0;
  return valueOf(target) * (dealt / target.maxHp) + kill;
};

/**
 * 다음 턴에 `side`가 줄 수 있는 피해의 근사치 (GDD 4장 §4.3).
 * 기물마다 "도달 가능한 착지 칸에서 줄 수 있는 최대 피해"를 독립적으로 구하고, AP 안에서 탐욕적으로 합산한다.
 */
export const threatEstimate = (s: BattleState, side: Side): number => {
  const grid = buildGrid(s);
  const options: { worth: number; ap: number }[] = [];
  for (const p of s.pieces) {
    if (p.side !== side) continue;
    let best = 0;
    for (const to of legalMoves(s, p, grid)) {
      const ghost = { ...p, x: to.x, y: to.y };
      let worth = 0;
      for (const t of attackTargets(s, ghost, grid)) worth += hitWorth(t, damageOf(ghost, t));
      if (worth > best) best = worth;
    }
    if (best > 0) options.push({ worth: best, ap: PIECE_STATS[p.type].ap });
  }
  options.sort((a, b) => b.worth / b.ap - a.worth / a.ap);
  let ap = BASE_AP;
  let total = 0;
  for (const o of options) {
    if (o.ap > ap) continue;
    ap -= o.ap;
    total += o.worth;
  }
  return total;
};

/** `side` 관점의 보드 점수. 높을수록 좋다. */
export const evaluate = (s: BattleState, side: Side, w: Weights): number => {
  if (s.winner === side) return WIN_SCORE;
  if (s.winner === otherSide(side)) return -WIN_SCORE;
  const enemy = otherSide(side);
  const myKing = kingOf(s, side)!;
  const theirKing = kingOf(s, enemy)!;

  let material = 0;
  let advance = 0;
  for (const p of s.pieces) {
    const v = valueOf(p) * (p.hp / p.maxHp);
    if (p.side === side) {
      material += v;
      if (p.type !== 'K') {
        const progress = forward(side) > 0 ? p.y : s.height - 1 - p.y;
        advance += progress;
      }
    } else material -= v;
  }

  return (
    w.enemyKing * (1 - theirKing.hp / theirKing.maxHp) * 100 -
    w.ownKing * (1 - myKing.hp / myKing.maxHp) * 100 +
    w.material * material -
    w.threat * threatEstimate(s, enemy) +
    w.advance * advance
  );
};
