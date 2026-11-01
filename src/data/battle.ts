import type { BattleRules } from '../engine/types';

/** 무너지는 판 (D-014): 정체 압박의 결과 — 2.0에서 유일한 판 길이 장치 */
export const COLLAPSE = {
  /** 무너지는 칸 위의 기물이 받는 피해 (최대 HP 비율). 치명상은 주지 않는다 */
  damagePct: 0.15,
  /** 유효 보드의 짧은 변이 이 값보다 작아지면 더 무너지지 않는다 */
  minSize: 4,
  /** 한 번에 무너지는 칸 수: 마주 보는 칸 한 쌍 */
  tilesPerEvent: 2,
  /** 더 무너질 곳이 없으면 매 라운드 킹이 받는 피해 (최대 HP 비율) */
  suddenDeathPct: 0.1,
};

/**
 * 정체 압박 (D-072): 첫 grace 라운드가 지난 뒤 양 진영 모두 피해를 주지 못한 라운드가 rounds번 이어지면
 * 그다음 라운드부터 판이 무너지기 시작한다. 피해가 한 번이라도 나면 0으로.
 */
export const STALL = { grace: 2, rounds: 2 };

/** 적 다음 수 미리보기 (D-076): 이 압력 단계 미만이면 적의 첫 수를 기본으로 보여 준다 */
export const FORESIGHT_UNTIL_ASCENSION = 3;

/**
 * 연쇄 보너스 (D-077, 규격 2.0 §2 원칙 5 — 순서가 곧 화력): 한 턴 안에서 앞 순번이 처치할 때마다
 * 뒤 순번 공격 피해 +perKill (최대 cap번). 양 진영 같은 규칙.
 */
export const CHAIN = { perKill: 0.1, cap: 4 };

/** 명예로운 항복 (D-077): 적에게 킹만 남았고 내 기물이 minMine기 이상이면, 적 차례 시작에 끝낸다 (죽은 턴 없애기) */
export const RESIGN = { minMine: 3 };

/** 보드 크기별 기본 규칙 (규격 2.0: 체크 버팀은 모든 판에서) */
export const defaultRules = (width: number, height: number): BattleRules => {
  const small = Math.min(width, height) <= 6;
  return { collapseStart: small ? 6 : 9, collapseInterval: 1, checkmate: true, foresight: 1 };
};
