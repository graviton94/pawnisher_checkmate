import { BASE_AP, PIECE_STATS } from '../data/pieces';
import { buildGrid, cloneState, findPiece, kingOf, lastRank, samePos } from './board';
import { attackArea, attackTargets, damageOf, legalMoves } from './rules';
import { otherSide, type BattleEvent, type BattleState, type HitResult, type Piece, type Plan, type PlannedMove, type Pos } from './types';

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

/** 착지한 기물의 공격 한 번 (GDD 3장 §3.1). 파괴된 기물은 즉시 제거하고 승패를 확인한다. */
const applyAttack = (s: BattleState, attacker: Piece, order: number, events: BattleEvent[], removed: Piece[]): void => {
  const grid = buildGrid(s);
  const area = attackArea(s, attacker, grid);
  const targets = attackTargets(s, attacker, grid);
  const hits: HitResult[] = targets.map((t) => {
    const damage = damageOf(attacker, t);
    const shieldAbsorbed = Math.min(t.shield, damage);
    t.shield -= shieldAbsorbed;
    t.hp = Math.max(0, t.hp - (damage - shieldAbsorbed));
    return { targetId: t.id, damage, shieldAbsorbed, hpAfter: t.hp, killed: t.hp <= 0 };
  });
  events.push({ type: 'attack', order, attackerId: attacker.id, area, hits });
  if (!hits.some((h) => h.killed)) return;
  for (const p of s.pieces) if (p.hp <= 0) removed.push({ ...p });
  s.pieces = s.pieces.filter((p) => p.hp > 0);
  const winner = !kingOf(s, otherSide(s.turnSide)) ? s.turnSide : !kingOf(s, s.turnSide) ? otherSide(s.turnSide) : null;
  if (winner !== null) {
    s.winner = winner;
    events.push({ type: 'gameOver', winner });
  }
};

export interface Simulation {
  ok: boolean;
  reason?: string;
  /** 계획을 끝까지 실행한 보드 (차례는 아직 넘기지 않음) */
  state: BattleState;
  events: BattleEvent[];
  apUsed: number;
  /** 이번 턴에 파괴된 기물 (파괴 시점의 위치) */
  removed: Piece[];
}

/**
 * 계획을 예약 순서대로 실행한다: #1 이동 → #1 공격 → #2 이동 → #2 공격 … (GDD 1장 §1.5).
 * 계획 검증, 미리보기, 실제 실행이 모두 이 함수 하나를 쓴다. 입력 상태는 바꾸지 않는다.
 */
export const simulate = (input: BattleState, plan: Plan): Simulation => {
  const s = cloneState(input);
  const events: BattleEvent[] = [];
  const removed: Piece[] = [];
  const used = new Set<number>();
  const budget = availableAp(input);
  let apUsed = 0;
  const fail = (reason: string): Simulation => ({ ok: false, reason, state: s, events, apUsed, removed });

  for (let order = 0; order < plan.length; order++) {
    const m = plan[order];
    if (s.winner !== null) return fail('전투 종료');
    const piece = findPiece(s, m.pieceId);
    if (!piece) return fail('없는 기물');
    if (piece.side !== input.turnSide) return fail('상대 기물');
    if (used.has(piece.id)) return fail('이미 이동한 기물');
    const cost = moveCost(piece);
    if (apUsed + cost > budget) return fail('AP 부족');
    if (!legalMoves(s, piece).some((p) => samePos(p, m.to))) return fail('갈 수 없는 칸');

    const from = { x: piece.x, y: piece.y };
    const before = piece.type;
    applyMove(s, piece, m.to);
    used.add(piece.id);
    apUsed += cost;
    events.push({ type: 'move', order, pieceId: piece.id, from, to: { ...m.to } });
    if (piece.type !== before) events.push({ type: 'promote', pieceId: piece.id, from: before, to: piece.type });

    applyAttack(s, piece, order, events, removed);
  }
  return { ok: true, state: s, events, apUsed, removed };
};

export interface PlanCheck {
  ok: boolean;
  reason?: string;
  /** 예약을 차례로(이동과 공격 모두) 반영한 가상 보드 (GDD 1장 §1.4) */
  virtual: BattleState;
  apUsed: number;
  removed: Piece[];
  events: BattleEvent[];
}

export const checkPlan = (s: BattleState, plan: Plan): PlanCheck => {
  const sim = simulate(s, plan);
  return { ok: sim.ok, reason: sim.reason, virtual: sim.state, apUsed: sim.apUsed, removed: sim.removed, events: sim.events };
};

/** 현재 계획에 이어 이 기물이 예약할 수 있는 칸. 이미 예약됐거나 AP가 모자라면 빈 배열. */
export const plannableMoves = (s: BattleState, plan: Plan, pieceId: number): Pos[] => {
  const check = checkPlan(s, plan);
  if (!check.ok || check.virtual.winner !== null || plan.some((m) => m.pieceId === pieceId)) return [];
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
