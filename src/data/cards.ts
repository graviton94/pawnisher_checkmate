/** 액티브 카드 카탈로그 (GDD 7장 §7.3, 초안 수치) */
export type CardId = 'A01' | 'A02' | 'A03' | 'A04' | 'A05' | 'A06' | 'C01' | 'C02' | 'C03' | 'C04' | 'C05' | 'C06';

/**
 * 사용 방식
 * - attach: 이동 예약 하나에 붙인다
 * - castle / shield / gate / promote / fuse / formShift: 독립된 예약 한 건
 */
export type CardUse = 'attach' | 'castle' | 'shield' | 'gate' | 'promote' | 'fuse' | 'formShift';

/** 사용 제한: 라운드당 1회 / 사용 후 N턴 쿨타임 / 1회 사용 시 소멸 */
export type CardLimit = { type: 'round' } | { type: 'cooldown'; turns: number } | { type: 'consume' };

export interface CardDef {
  name: string;
  use: CardUse;
  limit: CardLimit;
  /** 카드 자체의 AP 비용 (attach 카드는 이동 비용에 더하지 않는다) */
  ap: number;
  desc: string;
}

export const CARDS: Record<CardId, CardDef> = {
  A01: { name: '전술 기동 지시', use: 'attach', limit: { type: 'round' }, ap: 0, desc: '붙인 이동의 AP −1' },
  A02: { name: '캐슬링 스왑', use: 'castle', limit: { type: 'cooldown', turns: 3 }, ap: 1, desc: '같은 행/열의 아군 2기 위치를 맞바꾸고 둘 다 공격' },
  A03: { name: '관통 마법탄', use: 'attach', limit: { type: 'round' }, ap: 0, desc: '비숍·룩·퀸의 공격이 첫 적을 관통해 두 번째 적까지' },
  A04: { name: '증기 충격파', use: 'attach', limit: { type: 'cooldown', turns: 3 }, ap: 0, desc: '맞은 적을 공격 방향으로 1칸 밀어냄' },
  A05: { name: '기어 폼 시프트', use: 'formShift', limit: { type: 'round' }, ap: 0, desc: '이번 턴 나이트 1기와 비숍 1기의 행마·공격을 맞바꿈' },
  A06: { name: '강철 바리케이드', use: 'shield', limit: { type: 'cooldown', turns: 2 }, ap: 0, desc: '아군 1기에 보호막 +25' },
  C01: { name: '질풍의 2단 박차', use: 'attach', limit: { type: 'consume' }, ap: 0, desc: '붙인 기물의 공격이 2회' },
  C02: { name: '차원 도약문', use: 'gate', limit: { type: 'consume' }, ap: 0, desc: '아군 1기를 자기 진영 절반의 빈칸으로 순간이동 (이동 판정)' },
  C03: { name: '과충전 연쇄 뇌격', use: 'attach', limit: { type: 'consume' }, ap: 0, desc: '붙인 기물 ATK ×1.8, 맞은 적의 상하좌우에 50% 연쇄 피해' },
  C04: { name: '비상의 대관식', use: 'promote', limit: { type: 'consume' }, ap: 0, desc: '아군 폰 1기를 퀸으로 승급하고 그 자리에서 공격' },
  C05: { name: '키메라 융합', use: 'fuse', limit: { type: 'consume' }, ap: 2, desc: '붙어 있는 아군 2기를 이번 라운드 동안 합체' },
  C06: { name: '처형자의 진격', use: 'attach', limit: { type: 'consume' }, ap: 0, desc: 'HP 30% 이하 적 일반 기물의 칸으로 이동해 즉시 처치' },
};

export const CARD_SLOTS = 4;
