/**
 * 판 열 위(상태 띠) · 아래(부관 안내 띠) 자리 (CSS px) — 이만큼 비우고 판을 그 사이 가운데에 (총괄 리뷰 3.9 · D-396 · 1.1.1 테스터).
 * BoardRenderer(Phaser)와 떨어진 작은 모듈: 본편은 판(Phaser)을 처음 쓸 때 늦게 불러오므로 HUD가 먼저 자리를 정해 둔다. 2.0 화면은 0.
 */
export const boardInset = { top: 0, bottom: 0 };

/** 판 열 위(상태 띠) · 아래(부관 안내) 자리를 비운다 (본편 전투 HUD가 부른다) */
export const setBoardTopInset = (px: number, bottom = 0): void => {
  boardInset.top = px;
  boardInset.bottom = bottom;
};
