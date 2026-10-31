/**
 * 압력 (승천, GDD 8장 §8.7): 출하를 끝낼 때마다 한 단계씩 열린다. 효과는 누적.
 * 0~5 = D-076 · 6~13 = 볼륨 3 (D-108). 수치를 바꾸면 DECISIONS에 남긴다.
 */
export const ASCENSIONS = [
  '기본 압력',
  '시험용 흑 세트 +1기',
  '대국 보상 나사 −15%',
  '검문 개조 +1 · 검문 솜씨 최고 · 테이프 감청(적 다음 수) 없음',
  '적 킹 약화 보정 축소 (+10%p)',
  '반장 거푸집 전 유형 +1',
  '검문 접사 +1',
  '고물상 값 +15%',
  '내 킹 최대 HP −10%',
  '일반 대국 군단 개량 +1',
  '과적! 확률 두 배',
  '주문서 보상 −50%',
  '반장 개조 +1단',
  '도금왕 거푸집 전 유형 +1 · 시작 나사 0',
];
export const MAX_ASCENSION = ASCENSIONS.length - 1;

/** 6단계부터의 효과 수치 (D-108) */
export const ASC = {
  /** 6: 검문! 접사 개수 + */
  eliteAffix: { from: 6, add: 1 },
  /** 7: 고물상 값 배율 */
  shopPrice: { from: 7, mult: 1.15 },
  /** 8: 내 킹 최대 HP 배율 */
  myKingHp: { from: 8, mult: 0.9 },
  /** 9: 일반 대국 군단 개량 + */
  battleForge: { from: 9, add: 1 },
  /** 10: 과적! 확률 배율 */
  overload: { from: 10, mult: 2 },
  /** 11: 주문서 나사 배율 */
  orderGold: { from: 11, mult: 0.5 },
  /** 12: 반장 개조 단 + (최대 3단) */
  bossEnchant: { from: 12, add: 1 },
  /** 13: 도금왕 거푸집 + · 시작 나사 */
  finalForge: { from: 13, add: 1, startGold: 0 },
} as const;

/** 이 압력에서 그 효과가 켜졌나 */
export const ascOn = (ascension: number | undefined, key: keyof typeof ASC): boolean => (ascension ?? 0) >= ASC[key].from;
