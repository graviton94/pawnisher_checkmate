import { DECK_LIMITS, DECK_MAX, FORGE_MAX } from '../data/forge';
import { PIECE_STATS } from '../data/pieces';
import type { Deck } from '../engine/setup';
import type { Loadout, PieceType } from '../engine/types';
import { ENCHANT_MAX_STACK, ENCHANT_SLOTS, type EnchantId } from '../data/enchants';
import { CARD_SLOTS, type CardId } from '../data/cards';

const TYPES: PieceType[] = ['P', 'N', 'B', 'R', 'Q', 'K'];
const valueOf = (t: PieceType) => (t === 'K' ? 0 : PIECE_STATS[t].value);

export interface DeckCheck {
  ok: boolean;
  reason?: string;
  /** 기본 구성 대비 비워 둔 슬롯의 가치 합 */
  freeValue: number;
  /** 한도 초과 기물의 가치 합 + 세금 */
  overValue: number;
}

/**
 * 덱 구성 판정 (GDD 6장 §6.2, §6.8).
 * 총 16기 이하, 킹 정확히 1기, 그리고 "비워 둔 기본 슬롯의 가치 ≥ 초과 기물 가치 + 세금(초과한 비폰 기물 1기당 폰 가치 10)".
 */
export const checkDeck = (deck: Deck): DeckCheck => {
  const count = (t: PieceType) => deck.filter((x) => x === t).length;
  let freeValue = 0;
  let overValue = 0;
  for (const t of TYPES) {
    const n = count(t);
    const lim = DECK_LIMITS[t];
    if (n < lim) freeValue += (lim - n) * valueOf(t);
    else if (n > lim) overValue += (n - lim) * (valueOf(t) + (t === 'P' ? 0 : PIECE_STATS.P.value));
  }
  const fail = (reason: string): DeckCheck => ({ ok: false, reason, freeValue, overValue });
  if (count('K') !== 1) return fail('킹은 정확히 1기');
  if (deck.length > DECK_MAX) return fail(`덱은 최대 ${DECK_MAX}기`);
  if (overValue > freeValue) return fail('한도 초과 기물의 희생이 부족합니다');
  return { ok: true, freeValue, overValue };
};

/** 이 기물을 더 들일 수 있는가 */
export const canAdd = (deck: Deck, t: PieceType): boolean => checkDeck([...deck, t]).ok;

/** 장비 판정: 인챈트 6칸·중첩 3, 카드 4칸, 대장간 +5 (GDD 6·7장) */
export const checkLoadout = (lo: Loadout): { ok: boolean; reason?: string } => {
  const ench = Object.entries(lo.enchants) as [EnchantId, number][];
  if (ench.filter(([, n]) => n > 0).length > ENCHANT_SLOTS) return { ok: false, reason: `인챈트는 ${ENCHANT_SLOTS}칸` };
  if (ench.some(([, n]) => n > ENCHANT_MAX_STACK)) return { ok: false, reason: `인챈트 중첩은 최대 ${ENCHANT_MAX_STACK}` };
  if (lo.cards.length > CARD_SLOTS) return { ok: false, reason: `카드는 ${CARD_SLOTS}칸` };
  if (Object.values(lo.forge).some((n) => (n ?? 0) > FORGE_MAX)) return { ok: false, reason: `강화는 최대 +${FORGE_MAX}` };
  return { ok: true };
};

export type { CardId, EnchantId };
