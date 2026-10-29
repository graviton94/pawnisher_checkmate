import { BASE_AP, PIECE_STATS } from '../data/pieces';
import { LAST_STRIKE_MULT } from '../data/battle';
import { buildGrid, chebyshev, findPiece, forward, kingOf } from '../engine/board';
import { attackTargets, damageOf, isStrikeMove, legalMoves } from '../engine/rules';
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
  /** 폰 승급 잠재력 — 끝줄에 가까운 폰일수록 크게 (내 폰은 밀고, 상대 폰은 막는다) */
  promotion: number;
  /** 요충지 점유·접근 (GDD 5장) */
  stronghold: number;
}

export const BALANCED: Weights = { enemyKing: 6, ownKing: 6, material: 2, threat: 1.2, advance: 0.6, promotion: 1.5, stronghold: 1 };
export const AGGRESSIVE: Weights = { enemyKing: 9, ownKing: 5, material: 2, threat: 0.7, advance: 1, promotion: 1.5, stronghold: 0.6 };
export const DEFENSIVE: Weights = { enemyKing: 5, ownKing: 8, material: 2.5, threat: 2, advance: 0.3, promotion: 1.5, stronghold: 1.4 };

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
      const mult = isStrikeMove(s, p, to) ? LAST_STRIKE_MULT : 1;
      for (const t of attackTargets(s, ghost, grid)) worth += hitWorth(t, damageOf(s, ghost, t, mult));
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

/**
 * 폰의 승급 잠재력. 끝줄에 가까울수록 제곱으로 커지고, 바로 앞이 막혀 있으면 절반, 다친 만큼 줄여 본다.
 * 한 턴만 내다보는 탐색이 여러 턴짜리 승급 계획을 세우고, 상대 폰의 승급을 막게 하기 위한 항이다.
 */
const promotionPotential = (s: BattleState, p: Piece, grid: ReturnType<typeof buildGrid>): number => {
  if (p.type !== 'P') return 0;
  const f = forward(p.side);
  const start = p.side === 0 ? 1 : s.height - 2;
  const goal = p.side === 0 ? s.height - 1 : 0;
  const total = Math.abs(goal - start) || 1;
  const progress = Math.min(1, Math.abs(p.y - start) / total);
  const blocked = grid[(p.y + f) * s.width + p.x] !== undefined;
  // 다친 폰일수록 끝줄에 닿기 전에 잡힐 가능성이 크므로 HP 비율을 곱한다
  return (PIECE_STATS.Q.value - PIECE_STATS.P.value) * progress * progress * (blocked ? 0.5 : 1) * (p.hp / p.maxHp);
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
  let promotion = 0;
  const grid = buildGrid(s);
  for (const p of s.pieces) {
    const pp = promotionPotential(s, p, grid);
    promotion += p.side === side ? pp : -pp;
    const v = valueOf(p) * (p.hp / p.maxHp);
    if (p.side === side) {
      material += v;
      if (p.type !== 'K') {
        const progress = forward(side) > 0 ? p.y : s.height - 1 - p.y;
        advance += progress;
      }
    } else material -= v;
  }

  // 요충지: 올라선 기물은 유지 카운트만큼, 그 외에는 가장 가까운 기물의 거리만큼
  let stronghold = 0;
  const sh = s.stronghold;
  if (sh) {
    const holder = sh.holderId !== null ? findPiece(s, sh.holderId) : undefined;
    if (holder) stronghold += (holder.side === side ? 1 : -1) * 25 * (sh.hold + 1);
    const near = (sd: Side) =>
      s.pieces.filter((p) => p.side === sd && p.type !== 'K').reduce((m, p) => Math.min(m, chebyshev(p, sh)), 99);
    stronghold += (near(enemy) - near(side)) * 2;
  }

  return (
    w.stronghold * stronghold +
    w.enemyKing * (1 - theirKing.hp / theirKing.maxHp) * 100 -
    w.ownKing * (1 - myKing.hp / myKing.maxHp) * 100 +
    w.material * material -
    w.threat * threatEstimate(s, enemy) +
    w.advance * advance +
    w.promotion * promotion
  );
};
