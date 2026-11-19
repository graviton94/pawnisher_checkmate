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
} as const;

const at = <T>(list: readonly T[], asc: number): T => list[Math.max(0, Math.min(list.length - 1, asc))];
/** 이 승급의 출하 시작 되감기 수 */
export const startRewind = (asc: number): number => at(EASE.startRewind, asc);
/** 이 승급 · 막(1 ~ 3, 종막 4)에 원수가 설 수 있나 */
export const nemesisAllowed = (asc: number, act: number): boolean => act >= at(EASE.nemesisFromAct, asc);
