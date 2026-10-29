import { CARDS, type CardUse } from '../data/cards';
import { buildGrid, chebyshev, inBounds } from './board';
import { actedInPlan, checkPlan, simulate } from './plan';
import { ench, legalMoves } from './rules';
import type { BattleState, PlannedMove, Plan, PlanStep, Pos, Side, SpecialStep } from './types';

/** 지금 쓸 수 있는 카드 슬롯 (계획에서 이미 쓴 카드 반영). use를 주면 그 방식만. */
export const usableCards = (v: BattleState, side: Side, use?: CardUse): number[] =>
  v.cards[side].flatMap((slot, i) => (!slot.spent && slot.cooldown <= 0 && (!use || CARDS[slot.id].use === use) ? [i] : []));

/** 차원 도약문 착지 후보: 자기 진영 절반의 빈칸 */
export const gateSquares = (v: BattleState, side: Side): Pos[] => {
  const grid = buildGrid(v);
  const out: Pos[] = [];
  for (let y = 0; y < v.height; y++) {
    if (side === 0 ? y >= v.height / 2 : y < v.height / 2) continue;
    for (let x = 0; x < v.width; x++) {
      if (!inBounds(v, x, y)) continue;
      if (grid[y * v.width + x] === undefined) out.push({ x, y });
    }
  }
  return out;
};

/**
 * 현재 계획에 이어 붙일 수 있는 특수 예약 전부 (카드·인챈트 행동).
 * 각 후보는 규칙 엔진으로 실행해 통과한 것만 돌려준다. gate는 착지 칸이 많아 maxGate개로 줄인다
 * (상대 진영 쪽으로 가까운 칸 우선).
 */
export const specialSteps = (s: BattleState, plan: Plan, maxGate = 6): SpecialStep[] => {
  const side0 = s.turnSide;
  if (!usableCards(s, side0).length && ench(s, side0, 'E04') < 2 && ench(s, side0, 'E11') < 1) return [];
  const check = checkPlan(s, plan);
  if (!check.ok || check.virtual.winner !== null) return [];
  const v = check.virtual;
  const side = s.turnSide;
  const mine = v.pieces.filter((p) => p.side === side);
  const free = mine.filter((p) => !actedInPlan(plan, p.id));
  const cands: SpecialStep[] = [];

  if (ench(v, side, 'E04') >= 2) for (const p of free) if (p.type === 'P') cands.push({ kind: 'stand', pieceId: p.id });
  for (const card of usableCards(v, side)) {
    switch (CARDS[v.cards[side][card].id].use) {
      case 'castle':
        for (const a of free)
          for (const b of free) if (a.id < b.id && (a.x === b.x || a.y === b.y)) cands.push({ kind: 'castle', pieceId: a.id, partnerId: b.id, card });
        break;
      case 'shield':
        for (const p of mine) cands.push({ kind: 'shield', pieceId: p.id, card });
        break;
      case 'gate': {
        const squares = gateSquares(v, side).sort((a, b) => (side === 0 ? b.y - a.y : a.y - b.y)).slice(0, maxGate);
        for (const p of free) if (p.type !== 'K') for (const to of squares) cands.push({ kind: 'gate', pieceId: p.id, to, card });
        break;
      }
      case 'promote':
        for (const p of free) if (p.type === 'P') cands.push({ kind: 'promote', pieceId: p.id, card });
        break;
      case 'fuse':
        for (const a of free) for (const b of free) if (a.id !== b.id && chebyshev(a, b) === 1) cands.push({ kind: 'fuse', pieceId: a.id, partnerId: b.id, card });
        break;
      case 'formShift':
        for (const n of mine) for (const b of mine) if (n.type === 'N' && b.type === 'B') cands.push({ kind: 'formShift', pieceId: n.id, partnerId: b.id, card });
        break;
    }
  }
  // 인챈트 합체 (E11): 카드 없이
  if (ench(v, side, 'E11') >= 1) for (const a of free) for (const b of free) if (a.id !== b.id && chebyshev(a, b) === 1) cands.push({ kind: 'fuse', pieceId: a.id, partnerId: b.id });

  return cands.filter((st) => simulate(s, [...plan, st]).ok);
};

/** 카드를 쓰지 않은 이동 예약에 붙일 수 있는 attach 카드 변형들 */
export const attachVariants = (s: BattleState, plan: Plan, index: number): Plan[] => {
  const step = plan[index];
  if (!step || (step.kind !== undefined && step.kind !== 'move') || step.card !== undefined) return [];
  const before = checkPlan(s, plan.slice(0, index));
  if (!before.ok) return [];
  const used = new Set(plan.flatMap((st: PlanStep) => ('card' in st && st.card !== undefined ? [st.card] : [])));
  const out: Plan[] = [];
  for (const card of usableCards(before.virtual, s.turnSide, 'attach')) {
    if (used.has(card)) continue;
    const next = plan.map((st, i) => (i === index ? { ...step, card } : st));
    if (simulate(s, next).ok) out.push(next);
  }
  return out;
};


/** 처형자의 진격(C06) 이동 후보: HP 30% 이하 적 칸으로 가는 이동 */
export const executeMoves = (s: BattleState, plan: Plan): PlannedMove[] => {
  if (!s.cards[s.turnSide].some((c) => c.id === 'C06' && !c.spent)) return [];
  const check = checkPlan(s, plan);
  if (!check.ok || check.virtual.winner !== null) return [];
  const v = check.virtual;
  const side = s.turnSide;
  const card = usableCards(v, side, 'attach').find((i) => v.cards[side][i].id === 'C06');
  if (card === undefined) return [];
  const out: PlannedMove[] = [];
  for (const victim of v.pieces) {
    if (victim.side === side || victim.type === 'K' || victim.hp > victim.maxHp * 0.3) continue;
    const without = { ...v, pieces: v.pieces.filter((p) => p !== victim) };
    for (const p of v.pieces) {
      if (p.side !== side || actedInPlan(plan, p.id)) continue;
      if (!legalMoves(without, p).some((m) => m.x === victim.x && m.y === victim.y)) continue;
      const step: PlannedMove = { pieceId: p.id, to: { x: victim.x, y: victim.y }, card };
      if (simulate(s, [...plan, step]).ok) out.push(step);
    }
  }
  return out;
};
