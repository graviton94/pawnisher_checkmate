import { ORDERS, type OrderId } from '../data/tactics';
import type { BattleState, PieceType } from '../engine/types';
import type { Rng } from '../engine/rng';

/**
 * 주문서 (GDD 13장 P1, D-094): 판마다 하나 붙는 보너스 목표. 판정은 끝난 보드(또는 진행 중 보드)와 군단만 본다.
 */

/** 군단으로 해낼 수 있는 주문 중 하나를 고른다 */
export const pickOrder = (deck: PieceType[], rng: Rng): OrderId => {
  const pool = (Object.keys(ORDERS) as OrderId[]).filter((id) => {
    const needs = ORDERS[id].needs;
    return !ORDERS[id].retired && (!needs || needs.some((t) => deck.includes(t)));
  });
  return pool[rng.int(pool.length)];
};

/** 군단에서 잃은 기물 수 (합체한 기물은 구성 수만큼 센다) */
const lostCount = (s: BattleState, deck: PieceType[]): number =>
  Math.max(0, deck.length - s.pieces.filter((p) => p.side === 0).reduce((a, p) => a + (p.fused?.length ?? 1), 0));

export interface OrderProgress {
  /** 완수 */
  done: boolean;
  /** 이번 대국에서는 더 이상 못 이룬다 */
  failed: boolean;
  /** 진행 표시 (예: "1/2"), 없으면 빈 문자열 */
  count: string;
}

/** 지금 보드 기준 주문 진행 상황. over = 대국이 끝났는가 (끝나야 판정되는 주문용) */
export const orderProgress = (id: OrderId, s: BattleState, deck: PieceType[], over = s.winner !== null): OrderProgress => {
  const def = ORDERS[id];
  const rec = s.record?.[0];
  if (def.tactic) {
    const n = rec?.tactics[def.tactic] ?? 0;
    const need = def.count ?? 1;
    return { done: n >= need, failed: over && n < need, count: need > 1 ? `${Math.min(n, need)}/${need}` : '' };
  }
  const won = s.winner === 0;
  switch (id) {
    case 'flawless': {
      const lost = lostCount(s, deck) > 0;
      return { done: over && won && !lost, failed: lost, count: '' };
    }
    case 'ironKing': {
      const k = s.pieces.find((p) => p.side === 0 && p.type === 'K');
      const hurt = !k || k.hp < k.maxHp;
      return { done: over && won && !hurt, failed: hurt, count: '' };
    }
    case 'pawnWork': {
      const n = rec?.pawnKills ?? 0;
      return { done: n >= 3, failed: false, count: `${Math.min(n, 3)}/3` };
    }
    case 'pawnMate':
      return { done: won && rec?.finisher === 'P', failed: over && rec?.finisher !== 'P', count: '' };
    default:
      return { done: false, failed: over, count: '' };
  }
};
