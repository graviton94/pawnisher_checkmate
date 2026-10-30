import type { BattleRules } from '../engine/types';

/** 요충지 수치 (GDD 5장, 초기값) */
export const STRONGHOLD = {
  /**
   * 보유 진영의 형편별 조건: 엄폐(받는 피해 감소율)와 점령까지 버텨야 하는 상대 턴 수.
   * leading = 우세·동률, tier1~3 = 열세 단계 (보상 단계와 같은 기준).
   */
  terms: {
    leading: { cover: 0.2, hold: 3 },
    tier1: { cover: 0.3, hold: 2 },
    tier2: { cover: 0.4, hold: 2 },
    tier3: { cover: 0.5, hold: 1 },
  },
  /** 열세 단계 경계 (열세율) */
  tier2At: 0.15,
  tier3At: 0.35,
  /** Tier 3: 킹 HP 비율이 이 이하이면 열세율과 무관하게 Tier 3 */
  tier3KingHp: 0.3,
  tier1: { ap: 1, healPct: 0.3 },
  tier2: { ap: 2, atkPct: 0.2, def: 2, turns: 2 },
  tier3: { ap: 2, kingShield: 30 },
};

/** 붕괴하는 대성당 (D-014, 초기값) */
export const COLLAPSE = {
  /** 무너지는 칸 위의 기물이 받는 피해 (최대 HP 비율). 치명상은 주지 않는다 */
  damagePct: 0.15,
  /** 유효 보드의 짧은 변이 이 값보다 작아지면 더 무너지지 않는다 */
  minSize: 4,
  /** 한 번에 무너지는 칸 수: 마주 보는 칸 한 쌍 (양 진영에 공평하게, 사용자 피드백 "한 칸씩") */
  tilesPerEvent: 2,
  /** 더 무너질 곳이 없으면 매 라운드 킹이 받는 피해 (최대 HP 비율, 치명상 가능) — 끝나지 않는 판 방지 */
  suddenDeathPct: 0.1,
};

/**
 * 정체 압박 (GDD 12장 F1, D-072 — Gambonanza의 무너지는 판): 첫 grace 라운드(서로 다가가는 시간)가 지난 뒤
 * 양 진영 모두 피해를 주지 못한 라운드가 rounds번 이어지면, 그다음 라운드부터 대성당 붕괴를 앞당겨 시작한다.
 * 정체가 이어지면 붕괴도 빨라진다: 라운드마다 무너지는 칸 쌍이 1 → 2 → 3… (끝판 킹 숨바꼭질 방지).
 * 피해가 한 번이라도 나면 정체 카운트는 0으로.
 */
export const STALL = { grace: 3, rounds: 2 };

/** 적 다음 수 미리보기 (D-076, Into the Breach식 의도 공개): 이 승천 단계 미만이면 적의 첫 수를 기본으로 보여 준다 */
export const FORESIGHT_UNTIL_ASCENSION = 3;

/** 최후의 일격 ATK 배율 (D-015) */
export const LAST_STRIKE_MULT = 2;

/** 보드 크기별 기본 전투 규칙. 층·군단 데이터가 생기면 거기서 덮어쓴다. */
export const defaultRules = (width: number, height: number): BattleRules => {
  const small = Math.min(width, height) <= 6;
  return small
    ? { strongholdRounds: [], collapseStart: 4, collapseInterval: 1, checkmate: false, foresight: 1 }
    : { strongholdRounds: [3, 6, 9], collapseStart: 15, collapseInterval: 1, checkmate: true, foresight: 1 };
};
