import { buildGrid, cloneState, findPiece, kingOf } from './board';
import { applyMove, checkPlan } from './plan';
import { attackArea, attackTargets, damageOf } from './rules';
import { otherSide, type BattleEvent, type BattleState, type HitResult, type Plan } from './types';

export interface TurnResult {
  state: BattleState;
  events: BattleEvent[];
}

/**
 * 한 진영의 턴을 실행한다 (GDD 1장 §1.5, 3장 §3.1).
 * Phase 1: 예약된 모든 기물 일괄 이동 → Phase 2: 예약 순번대로 순차 공격.
 * 입력 상태는 바꾸지 않는다. 미리보기도 이 함수를 그대로 쓴다 (GDD 3장 §3.6).
 */
export const resolveTurn = (input: BattleState, plan: Plan): TurnResult => {
  if (input.winner !== null) throw new Error('이미 끝난 전투');
  const check = checkPlan(input, plan);
  if (!check.ok) throw new Error(`잘못된 계획: ${check.reason}`);

  const s = cloneState(input);
  const events: BattleEvent[] = [];

  // Phase 1 — 일괄 이동. 검증과 같은 순서로 반영해야 가상 보드와 결과가 같아진다.
  plan.forEach((m, order) => {
    const piece = findPiece(s, m.pieceId)!;
    const from = { x: piece.x, y: piece.y };
    const before = piece.type;
    applyMove(s, piece, m.to);
    events.push({ type: 'move', order, pieceId: piece.id, from, to: { ...m.to } });
    if (piece.type !== before) events.push({ type: 'promote', pieceId: piece.id, from: before, to: piece.type });
  });

  // Phase 2 — 순차 공격. 이동한 기물만, 예약 순번대로.
  for (let order = 0; order < plan.length; order++) {
    const attacker = findPiece(s, plan[order].pieceId);
    if (!attacker) continue; // 자기 턴에 자기 기물은 파괴되지 않지만, 방어적으로 둔다
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
    if (hits.some((h) => h.killed)) {
      s.pieces = s.pieces.filter((p) => p.hp > 0);
      const winner = !kingOf(s, otherSide(s.turnSide)) ? s.turnSide : !kingOf(s, s.turnSide) ? otherSide(s.turnSide) : null;
      if (winner !== null) {
        s.winner = winner;
        events.push({ type: 'gameOver', winner });
        return { state: s, events };
      }
    }
  }

  s.turnSide = otherSide(s.turnSide);
  s.turnNumber += 1;
  return { state: s, events };
};
