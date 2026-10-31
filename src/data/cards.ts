/** 액티브 카드 카탈로그 (GDD 7장 §7.3, 초안 수치) */
export type CardId = 'A01' | 'A02' | 'A03' | 'A04' | 'A05' | 'A06' | 'A07' | 'A08' | 'A09' | 'A10' | 'C01' | 'C02' | 'C03' | 'C04' | 'C05' | 'C06' | 'C07' | 'C08' | 'C09' | 'C10' | 'C11';

/**
 * 사용 방식
 * - attach: 이동 예약 하나에 붙인다
 * - castle / shield / gate / promote / fuse / formShift: 독립된 예약 한 건
 *   (shield = 행동하지 않는 보조 예약: 방열판 · 수리 · 태엽 · 일제 사격. 고른 아군 1기가 대상 — 전체 효과면 아무나)
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
  A01: { name: '급행 명령', use: 'attach', limit: { type: 'round' }, ap: 0, desc: '붙인 이동의 태엽 −1' },
  A02: { name: '캐슬링', use: 'castle', limit: { type: 'cooldown', turns: 3 }, ap: 1, desc: '같은 행/열의 아군 2기 위치를 맞바꾸고 둘 다 공격' },
  A03: { name: '관통 철갑탄', use: 'attach', limit: { type: 'round' }, ap: 0, desc: '비숍·룩·퀸의 공격이 첫 적을 관통해 두 번째 적까지' },
  A04: { name: '증기 충격파', use: 'attach', limit: { type: 'cooldown', turns: 3 }, ap: 0, desc: '맞은 적을 공격 방향으로 1칸 밀어냄' },
  A05: { name: '거푸집 교환', use: 'formShift', limit: { type: 'round' }, ap: 0, desc: '이번 턴 나이트 1기와 비숍 1기의 행마·공격을 맞바꿈' },
  A06: { name: '방열판 덧대기', use: 'shield', limit: { type: 'cooldown', turns: 2 }, ap: 0, desc: '아군 1기에 방열판 +25' },
  C01: { name: '이중 타격 태엽', use: 'attach', limit: { type: 'consume' }, ap: 0, desc: '붙인 기물의 공격이 2회' },
  C02: { name: '컨베이어 급송', use: 'gate', limit: { type: 'consume' }, ap: 0, desc: '아군 1기를 자기 진영 절반의 빈칸으로 컨베이어로 보냄 (이동 판정)' },
  C03: { name: '과충전 방전', use: 'attach', limit: { type: 'consume' }, ap: 0, desc: '붙인 기물 ATK ×1.8, 맞은 적의 상하좌우에 50% 연쇄 피해' },
  C04: { name: '긴급 승급', use: 'promote', limit: { type: 'consume' }, ap: 0, desc: '아군 폰 1기를 퀸으로 승급하고 그 자리에서 공격' },
  C05: { name: '임시 결합', use: 'fuse', limit: { type: 'consume' }, ap: 2, desc: '붙어 있는 아군 2기를 이번 대국 동안 결합' },
  C06: { name: '폐기 판정', use: 'attach', limit: { type: 'consume' }, ap: 0, desc: 'HP 30% 이하 적 일반 기물의 칸으로 이동해 즉시 처치' },
  // ---- 볼륨 4 (D-112): 등급 체계와 함께 ----
  A07: { name: '조준 렌즈', use: 'attach', limit: { type: 'round' }, ap: 0, desc: '붙인 공격 피해 +30%' },
  A08: { name: '갈고리 와이어', use: 'attach', limit: { type: 'cooldown', turns: 3 }, ap: 0, desc: '맞은 적을 내 쪽으로 1칸 끌어당김' },
  A09: { name: '냉각수 분사', use: 'shield', limit: { type: 'cooldown', turns: 3 }, ap: 0, desc: '아군 1기 HP를 최대 HP 30%만큼 수리' },
  A10: { name: '자석 족쇄', use: 'attach', limit: { type: 'cooldown', turns: 3 }, ap: 0, desc: '맞은 적은 다음 자기 턴에 움직이지 못함' },
  C10: { name: '태엽 충전', use: 'shield', limit: { type: 'consume' }, ap: 0, desc: '이번 턴 태엽 +2' },
  C11: { name: '폐품 장갑', use: 'shield', limit: { type: 'consume' }, ap: 0, desc: '아군 전체 방열판 +12' },
  // 황금 카드 (대국마다 한 번)
  C07: { name: '총동원령', use: 'shield', limit: { type: 'round' }, ap: 0, desc: '이번 턴 태엽 +3' },
  C08: { name: '긴급 재조립', use: 'shield', limit: { type: 'round' }, ap: 0, desc: '아군 전체 HP를 최대 HP 35%만큼 수리하고 방열판 +10' },
  C09: { name: '일제 사격', use: 'shield', limit: { type: 'round' }, ap: 2, desc: '아직 행동하지 않은 아군 전부가 제자리에서 공격 (피해 80%)' },
};

/** 볼륨 4 카드 수치 (D-112) */
export const CARD_FX = { aimMult: 1.3, coolantHeal: 0.3, overclockAp: 2, scrapShield: 12, mobilizeAp: 3, rebuildHeal: 0.35, rebuildShield: 10, volleyMult: 0.8 };

export const CARD_SLOTS = 4;
