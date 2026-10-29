import type { BattleRules } from '../engine/types';

/** 요충지 수치 (GDD 5장, 초기값) */
export const STRONGHOLD = {
  /** 엄폐: 받는 피해 감소율 */
  coverReduction: 0.3,
  /** 점령까지 버텨야 하는 자기 턴 수 */
  holdTurns: 2,
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
};

/** 최후의 일격 ATK 배율 (D-015) */
export const LAST_STRIKE_MULT = 2;

/** 보드 크기별 기본 전투 규칙. 층·군단 데이터가 생기면 거기서 덮어쓴다. */
export const defaultRules = (width: number, height: number): BattleRules => {
  const small = Math.min(width, height) <= 6;
  return small
    ? { strongholdRounds: [], collapseStart: 4, collapseInterval: 3 }
    : { strongholdRounds: [3, 6, 9], collapseStart: 15, collapseInterval: 3 };
};
