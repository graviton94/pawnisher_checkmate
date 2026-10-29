import type { PieceType } from '../engine/types';

/** 대장간 유형 강화 1강당 상승치 (GDD 6장 §6.5, 초기값) */
export const FORGE_GAIN: Record<PieceType, { hp: number; atk: number; def: number }> = {
  P: { hp: 8, atk: 3, def: 1 },
  N: { hp: 12, atk: 5, def: 1 },
  B: { hp: 10, atk: 6, def: 1 },
  R: { hp: 20, atk: 7, def: 2 },
  Q: { hp: 18, atk: 9, def: 2 },
  K: { hp: 25, atk: 4, def: 2 },
};

export const FORGE_MAX = 5;

/** 완전 강화(+5) 보너스: 전투 시작 시 최대 HP 비율만큼 보호막 🔧 */
export const FORGE_MASTERY_SHIELD = 0.2;

/** 기본 덱 구성 한도 (GDD 6장 §6.2) */
export const DECK_LIMITS: Record<PieceType, number> = { P: 8, N: 2, B: 2, R: 2, Q: 1, K: 1 };
export const DECK_MAX = 16;
