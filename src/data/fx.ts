/**
 * 공격 연출 박자와 고른 안 (GDD 12장 §12.3, D-035).
 * 그래픽 결정은 FX 랩 아티팩트(tools/fxlab)에서 사용자가 보고 고른다. 고른 안을 여기 적으면 게임에 그대로 쓰인다.
 */

/** 박자 (ms, 1배속). 공격 1회 ≤ 0.6초 (CLAUDE.md UI/UX 원칙 6) */
export const FX_MS = {
  pawn: { total: 200, impact: 110 },
  /** 나이트: 11시 방향부터 시계 방향으로 8번 번개, 번개 사이 간격 */
  knight: { gap: 38, strike: 150 },
  /** 비숍: 응축 → 전체 사거리에 한 번에 굵게 → 사그라듦 */
  bishop: { charge: 160, fade: 190 },
  rook: { first: 40, step: 60, burst: 170 },
  queen: { charge: 130, fade: 200 },
  king: { total: 220, impact: 90 },
  splash: { burst: 170 },
};

/** 퀸·킹은 안이 둘 — 사용자 결정 전까지 기본값 */
export const FX_CHOICE: { Q: 'A' | 'B'; K: 'A' | 'B' } = { Q: 'A', K: 'B' };

/** 안 이름 (FX 랩 표시용) */
export const FX_VARIANT_NAMES = {
  Q: { A: '8방향 섬광', B: '십자 연쇄 폭발 + 대각 섬광' },
  K: { A: '사각 충격파', B: '종소리 파동' },
};
