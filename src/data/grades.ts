import type { CardId } from './cards';
import type { EnchantId } from './enchants';

/**
 * 등급 (D-112): 일반 · 고급 · 희귀 · 황금. 황금 부품은 덱 컨셉을 통째로 바꾸는 한 장 (슬더스의 희귀 카드 · 유물 자리).
 * 3지선다는 칸마다 등급을 먼저 굴리고(출처 · 공정별 표 + 보정), 그 등급 안에서 고른다.
 */
export type Grade = 'common' | 'uncommon' | 'rare' | 'legend';
export const GRADE_ORDER: Grade[] = ['common', 'uncommon', 'rare', 'legend'];
export const GRADE_NAME: Record<Grade, string> = { common: '일반', uncommon: '고급', rare: '희귀', legend: '황금' };

/** 칸 하나가 각 등급일 가중치 (일반 · 고급 · 희귀). 황금은 따로 (LEGEND_CHANCE) */
export const GRADE_WEIGHT: Record<'battle' | 'elite' | 'boss' | 'shop', [number, number, number][]> = {
  //          Act 1          Act 2          Act 3
  battle: [[70, 26, 4], [60, 32, 8], [52, 36, 12]],
  elite: [[45, 40, 15], [38, 42, 20], [30, 44, 26]],
  boss: [[20, 45, 35], [15, 45, 40], [10, 45, 45]],
  shop: [[60, 32, 8], [52, 36, 12], [45, 38, 17]],
};

/**
 * 희귀 보정 (슬더스의 희귀 카드 보정과 같은 생각): 희귀가 안 나온 칸마다 희귀 가중치 +PITY.step (%p), 희귀가 나오면 처음으로.
 * 운 나쁜 출하가 끝까지 희귀를 못 보는 일을 막는다.
 */
export const PITY = { step: 1.5, max: 25 };

/**
 * 황금 부품이 나오는 곳 (D-112) — "얻는 것 자체가 사건"이 되게 드물게.
 * - 반장 해체: 첫 반장 40% · 둘째 반장 100% (출하마다 적어도 한 번은 황금 3지선다를 본다)
 * - 검문!: 4% + 못 본 검문마다 +2%p (최대 20%)
 * - 고물상 (공정 2부터): 황금 진열 20%
 * - 돌발 「황금 상자」
 * 황금 슬롯은 2칸. 다 차면 더 나오지 않는다.
 */
export const LEGEND_CHANCE = { boss: [0.4, 1, 0], elite: 0.04, elitePity: 0.02, eliteMax: 0.2, shop: 0.2, shopFrom: 2 };
export const LEGEND_SLOTS = 2;
export const LEGEND_PRICE = 240;

/** 개조 등급 (기존 45종). 희귀는 옛 RARE_ENCHANTS + 빌드를 여는 것들 */
export const ENCHANT_GRADE: Record<EnchantId, Grade> = {
  E01: 'common', E02: 'common', E03: 'common', E04: 'common',
  E05: 'rare', E06: 'rare', E07: 'rare', E08: 'uncommon', E09: 'rare', E10: 'uncommon',
  E11: 'rare', E12: 'uncommon', E13: 'uncommon', E14: 'uncommon', E15: 'rare', E16: 'uncommon',
  E17: 'uncommon', E18: 'uncommon', E19: 'uncommon', E20: 'uncommon',
  E21: 'common', E22: 'common', E23: 'common', E24: 'common', E25: 'common', E26: 'rare',
  E27: 'uncommon', E28: 'uncommon', E29: 'uncommon', E30: 'common', E31: 'rare',
  E32: 'common', E33: 'common', E34: 'common', E35: 'uncommon', E36: 'common', E37: 'common',
  E38: 'uncommon', E39: 'common', E40: 'common', E41: 'uncommon', E42: 'common', E43: 'common', E44: 'rare', E45: 'uncommon',
};

/** 천공 카드 등급 */
export const CARD_GRADE: Record<CardId, Grade> = {
  A01: 'common', A02: 'uncommon', A03: 'uncommon', A04: 'common', A05: 'uncommon', A06: 'common',
  A07: 'common', A08: 'uncommon', A09: 'common', A10: 'uncommon',
  C01: 'rare', C02: 'uncommon', C03: 'rare', C04: 'rare', C05: 'uncommon', C06: 'rare',
  C07: 'legend', C08: 'legend', C09: 'legend', C10: 'uncommon', C11: 'common',
};
