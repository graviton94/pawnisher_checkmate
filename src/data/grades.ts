import type { CardId } from './cards';
import type { EnchantId } from './enchants';

/**
 * 등급 (D-112 · D-113): 커먼 · 레어 · 유니크 · 에픽. 에픽 부품은 덱 컨셉을 통째로 바꾸는 한 장 (슬더스의 희귀 카드 · 유물 자리).
 * 3지선다는 칸마다 등급을 먼저 굴리고(출처 · 공정별 표 + 보정), 그 등급 안에서 고른다.
 */
export type Grade = 'common' | 'rare' | 'unique' | 'epic';
export const GRADE_ORDER: Grade[] = ['common', 'rare', 'unique', 'epic'];
export const GRADE_NAME: Record<Grade, string> = { common: '커먼', rare: '레어', unique: '유니크', epic: '에픽' };

/** 칸 하나가 각 등급일 가중치 (커먼 · 레어 · 유니크). 에픽은 따로 (LEGEND_CHANCE) */
export const GRADE_WEIGHT: Record<'battle' | 'elite' | 'boss' | 'shop', [number, number, number][]> = {
  //          Act 1          Act 2          Act 3
  battle: [[70, 26, 4], [60, 32, 8], [52, 36, 12]],
  elite: [[45, 40, 15], [38, 42, 20], [30, 44, 26]],
  boss: [[20, 45, 35], [15, 45, 40], [10, 45, 45]],
  shop: [[60, 32, 8], [52, 36, 12], [45, 38, 17]],
};

/**
 * 유니크 보정 (슬더스의 희귀 카드 보정과 같은 생각): 유니크가 안 나온 칸마다 유니크 가중치 +PITY.step (%p), 유니크가 나오면 처음으로.
 * 운 나쁜 출하가 끝까지 희귀를 못 보는 일을 막는다.
 */
export const PITY = { step: 1.5, max: 25 };

/**
 * 에픽 부품이 나오는 곳 (D-112) — "얻는 것 자체가 사건"이 되게 드물게.
 * - 반장 해체: 첫 반장 70% · 둘째 반장 100% (D-114: 40%로는 에픽을 본 출하가 22%뿐) (출하마다 적어도 한 번은 에픽 3지선다를 본다)
 * - 검문!: 5% + 못 본 검문마다 +2%p (최대 20%)
 * - 고물상 (공정 2부터): 에픽 진열 20%
 * 에픽 슬롯은 2칸. 다 차면 더 나오지 않는다.
 */
export const LEGEND_CHANCE = { boss: [0.7, 1, 0], elite: 0.05, elitePity: 0.02, eliteMax: 0.2, shop: 0.2, shopFrom: 2 };
export const LEGEND_SLOTS = 2;
export const LEGEND_PRICE = 240;

/** 개조 등급 (기존 45종). 유니크는 옛 RARE_ENCHANTS + 빌드를 여는 것들 */
export const ENCHANT_GRADE: Record<EnchantId, Grade> = {
  E01: 'common', E02: 'common', E03: 'common', E04: 'common',
  E05: 'unique', E06: 'unique', E07: 'unique', E08: 'rare', E09: 'unique', E10: 'rare',
  E11: 'unique', E12: 'rare', E13: 'rare', E14: 'rare', E15: 'unique', E16: 'rare',
  E17: 'rare', E18: 'rare', E19: 'rare', E20: 'rare',
  E21: 'common', E22: 'common', E23: 'common', E24: 'common', E25: 'common', E26: 'unique',
  E27: 'rare', E28: 'rare', E29: 'rare', E30: 'common', E31: 'unique',
  E32: 'common', E33: 'common', E34: 'common', E35: 'rare', E36: 'common', E37: 'common',
  E38: 'rare', E39: 'common', E40: 'common', E41: 'rare', E42: 'common', E43: 'common', E44: 'unique', E45: 'rare',
};

/** 천공 카드 등급 */
export const CARD_GRADE: Record<CardId, Grade> = {
  A01: 'common', A02: 'rare', A03: 'rare', A04: 'common', A05: 'rare', A06: 'common',
  A07: 'common', A08: 'rare', A09: 'common', A10: 'rare',
  C01: 'unique', C02: 'rare', C03: 'unique', C04: 'unique', C05: 'rare', C06: 'unique',
  C07: 'epic', C08: 'epic', C09: 'epic', C10: 'rare', C11: 'common',
};
