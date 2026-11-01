/**
 * 압력 (승천, 규격 2.0 §3.3): 출하를 끝낼 때마다 한 단계씩 열린다. 효과는 누적, 모두 수치 또는 양날 쌍의 적 쪽만.
 * 최고 단계에서만 「내려놓는다」가 눌린다 (D-131 승급의 고리).
 */
export const ASCENSIONS = [
  '기본 압력',
  '흑 세트 +1기',
  '대국 나사 −15%',
  '적 다음 수 감청 없음 · 검문 솜씨 최고',
  '적 HP +10%',
  '반장 HP +15%',
  '고물상 값 +15%',
  '내 킹 최대 HP −10%',
  '적 공격 +10%',
  '양날 쌍의 적 쪽이 하나 더',
  '도금왕 HP +20% · 시작 나사 0',
];
export const MAX_ASCENSION = ASCENSIONS.length - 1;

export const ASC = {
  extraPiece: { from: 1 },
  goldCut: { from: 2, mult: 0.85 },
  noForesight: { from: 3 },
  enemyHp: { from: 4, mult: 1.1 },
  bossHp: { from: 5, mult: 1.15 },
  shopPrice: { from: 6, mult: 1.15 },
  myKingHp: { from: 7, mult: 0.9 },
  enemyAtk: { from: 8, mult: 1.1 },
  doubleThreat: { from: 9 },
  final: { from: 10, hp: 1.2, startGold: 0 },
} as const;

/** 이 압력에서 그 효과가 켜졌나 */
export const ascOn = (ascension: number | undefined, key: keyof typeof ASC): boolean => (ascension ?? 0) >= ASC[key].from;
