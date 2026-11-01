/**
 * 등급 (D-112 · D-113, 규격 2.0에서는 부품에만): 커먼 · 레어 · 유니크 · 에픽.
 * 등급 이름은 영어 음차 금지의 예외 (world.md).
 */
export type Grade = 'common' | 'rare' | 'unique' | 'epic';
export const GRADE_ORDER: Grade[] = ['common', 'rare', 'unique', 'epic'];
export const GRADE_NAME: Record<Grade, string> = { common: '커먼', rare: '레어', unique: '유니크', epic: '에픽' };

/** 유니크 보정 (슬더스식): 유니크 이상이 안 나온 칸마다 유니크 가중치 +step (%p), 나오면 처음으로 */
export const PITY = { step: 1.5, max: 25 };
