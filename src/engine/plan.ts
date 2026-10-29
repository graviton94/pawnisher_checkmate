import { BASE_AP, PIECE_STATS } from '../data/pieces';
import { buildGrid, cloneState, findPiece, lastRank, samePos } from './board';
import { legalMoves } from './rules';
import type { BattleState, Piece, Plan, PlannedMove, Pos } from './types';

/** 이번 턴 가용 AP. 패시브·요충지 보너스는 이후 단계에서 더한다. */
export const availableAp = (_s: BattleState): number => BASE_AP;

export const moveCost = (piece: Piece): number => PIECE_STATS[piece.type].ap;

/** 정통 체스 승급: 폰이 상대 끝줄에 닿으면 퀸. HP 비율은 유지한다 (GDD 2장 §2.6). */
export const applyPromotion = (s: BattleState, piece: Piece): boolean => {
  if (piece.type !== 'P' || piece.y !== lastRank(s, piece.side)) return false;
  const q = PIECE_STATS.Q;
  const ratio = piece.hp / piece.maxHp;
  piece.type = 'Q';
  piece.maxHp = q.hp;
  piece.hp = Math.max(1, Math.round(q.hp * ratio));
  piece.atk = q.atk;
  piece.def = q.def;
  return true;
};

/** 기물 하나를 옮긴다 (승급 포함). 상태를 직접 바꾼다. */
export const applyMove = (s: BattleState, piece: Piece, to: Pos): void => {
  piece.x = to.x;
  piece.y = to.y;
  piece.moved = true;
  applyPromotion(s, piece);
};

export interface PlanCheck {
  ok: boolean;
  reason?: string;
  /** 예약을 차례로 반영한 가상 보드 (GDD 1장 §1.4) */
  virtual: BattleState;
  apUsed: number;
}

/** 계획을 순서대로 가상 보드에 반영하며 검증한다. */
export const checkPlan = (s: BattleState, plan: Plan): PlanCheck => {
  const virtual = cloneState(s);
  const used = new Set<number>();
  let apUsed = 0;
  const budget = availableAp(s);

  for (const m of plan) {
    const piece = findPiece(virtual, m.pieceId);
    if (!piece) return { ok: false, reason: '없는 기물', virtual, apUsed };
    if (piece.side !== s.turnSide) return { ok: false, reason: '상대 기물', virtual, apUsed };
    if (used.has(piece.id)) return { ok: false, reason: '이미 이동한 기물', virtual, apUsed };
    const cost = moveCost(piece);
    if (apUsed + cost > budget) return { ok: false, reason: 'AP 부족', virtual, apUsed };
    if (!legalMoves(virtual, piece).some((p) => samePos(p, m.to))) {
      return { ok: false, reason: '갈 수 없는 칸', virtual, apUsed };
    }
    applyMove(virtual, piece, m.to);
    used.add(piece.id);
    apUsed += cost;
  }
  return { ok: true, virtual, apUsed };
};

/** 현재 계획에 이어 이 기물이 예약할 수 있는 칸. 이미 예약됐거나 AP가 모자라면 빈 배열. */
export const plannableMoves = (s: BattleState, plan: Plan, pieceId: number): Pos[] => {
  const check = checkPlan(s, plan);
  if (!check.ok || plan.some((m) => m.pieceId === pieceId)) return [];
  const piece = findPiece(check.virtual, pieceId);
  if (!piece || piece.side !== s.turnSide) return [];
  if (check.apUsed + moveCost(piece) > availableAp(s)) return [];
  return legalMoves(check.virtual, piece, buildGrid(check.virtual));
};

export const addToPlan = (s: BattleState, plan: Plan, move: PlannedMove): Plan | null => {
  const next = [...plan, move];
  return checkPlan(s, next).ok ? next : null;
};

/** 마지막 예약 되돌리기 */
export const undoLast = (plan: Plan): Plan => plan.slice(0, -1);
