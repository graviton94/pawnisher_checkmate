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

/**
 * 교착 압박 (2026-11-14 사용자 결정 — 리뉴얼판의 정체 압박 되살리기, 체크메이트 처형은 기각):
 * from턴부터 내가 적에게 피해를 주지 못한 턴이 quiet번 이어지면, 그 턴 끝(적 차례 끝)부터 대국이 끝날 때까지
 * 적 킹의 방열판이 벗겨지고 턴마다 최대 HP의 rustPct만큼 녹슨다. 한 번 시작되면 멈추지 않는다.
 */
export const STALL_PRESS = { from: 12, quiet: 2, rustPct: 0.1 };

/**
 * 적 AI 태엽 쓰기 (피드백 #10 · 2026-11-14 사용자 결정): 적도 태엽 3을 다 쓰려 한다.
 * 수를 하나씩 정하고 그 수를 둔 판에서 다음 수를 다시 고른다(미리보기 = 실행, 같은 simulate).
 * actMax = 한 적 차례의 최대 행동 수 · perPiece = 한 기물이 한 차례에 움직이는 최대 횟수(두 번째 행동) ·
 * again = 같은 기물의 두 번째 행동 점수 배율(다른 기물이 먼저) · unspent = 태엽 1을 남길 때의 감점(이만큼 손해인 수까지는 둔다) ·
 * losingKill = 패색(호위가 desperate 이하 또는 킹 HP 절반 아래)일 때 킹이 아닌 분대원을 쓰러뜨리는 수의 점수 배율(「하나는 데려간다」)
 */
export const FOE_AI = { actMax: 4, perPiece: 2, again: 0.8, unspent: 1.5, losingKill: 1.5 };
