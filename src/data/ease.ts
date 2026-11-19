/**
 * 낮은 왕관의 최소 레버 (D-600, 출시 전 결정 보고 1가 — 사용자 승인 2026-11-19).
 * 측정: 보통 봇 첫째 왕관 첫 출하 9% (띠 12~22) · 둘째 1% (띠 5~12), 사람 2회차 1막 스파이크 = 원수 이월.
 * 승급 값은 배열 칸(승급 0 = 첫째 왕관), 배열보다 높은 승급은 마지막 칸.
 */
export const EASE = {
  /** 출하 시작 되감기 (첫째 · 둘째 · 셋째 · 넷째 왕관, 도전은 마지막 값) — 옛 CHARM_NUM.startRewind 1 */
  startRewind: [2, 2, 1, 1],
  /** 1막 반장 HP 배율 (반장 킹 · 호위 모두) — 이 승급 이하에서만 (첫째 · 둘째 왕관) */
  act1BossHp: 0.85,
  act1BossUpTo: 1,
  /** 원수가 서기 시작하는 막 (승급별) — 첫째 · 둘째 왕관은 2막부터, 그 위는 1막부터 */
  nemesisFromAct: [2, 2, 1],
  /**
   * 2막 일반 대국 덜어 내기 (D-660, 결정 2차 1가 — D-656): 첫째 · 둘째 왕관(승급 ≤ act2LightUpTo)의 2막 일반 대국(검문 · 반장 제외)은
   * 적 폰을 act2Pawns기 덜 세운다(FOE.extraPawns 몫 + 편성 폰 하나). 보통 봇 2막에서 끝난 출하의 절반이 2막 일반 대국의 상처를 안고 반장에서 졌다.
   * 측정(보통 봇 400출하): 폰 −1 = 2막 일반 대국 패배 15 → 15% · 남은 체력 0.30 → 0.31(효과 없음) / 폰 −2 = 15 → 10% · 0.30 → 0.41 / 지도 대국 칸 무게 ×0.5 = 15 → 12%.
   */
  act2LightUpTo: 1,
  act2Pawns: 2,
} as const;

const at = <T>(list: readonly T[], asc: number): T => list[Math.max(0, Math.min(list.length - 1, asc))];
/** 이 승급의 출하 시작 되감기 수 */
export const startRewind = (asc: number): number => at(EASE.startRewind, asc);
/** 이 승급 · 막(1 ~ 3, 종막 4)에 원수가 설 수 있나 */
export const nemesisAllowed = (asc: number, act: number): boolean => act >= at(EASE.nemesisFromAct, asc);
