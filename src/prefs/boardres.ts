import type { BoardResPref } from '../data/settings';

/**
 * 판 선명도 (D-665 · 결정 2가): 설정 값(자동 · 선명 · 빠름)과 자동 판정 결과를 판 그리기(BoardRenderer)에 건넨다.
 * 자동 판정(느린 기기)은 기기마다 한 번 재서 저장한다 — 다음 대국부터는 처음부터 빠름으로 선다.
 * 설정을 자동으로 다시 고르면 판정을 지우고 다음 대국에서 다시 잰다.
 */
let pref: BoardResPref = 'auto';
const subs = new Set<() => void>();
/** 자동 판정을 적는 열쇠 (설정 · 진행과 따로 — 진행 초기화가 지우지 않는다) */
export const BOARD_AUTO_KEY = 'pawnisher.boardres.auto';

/** 지금 설정 */
export const boardResPref = (): BoardResPref => pref;

/** 설정을 입힌다 — 바뀌면 판에 알린다 */
export const setBoardResPref = (p: BoardResPref): void => {
  if (p === pref) return;
  const back = p === 'auto';
  pref = p;
  if (back) clearAutoSlow();
  subs.forEach((f) => f());
};

/** 설정이 바뀌거나 자동 판정이 나면 부른다 */
export const onBoardRes = (f: () => void): void => void subs.add(f);

/** 이 기기를 느리다고 잰 적이 있나 */
export const autoSlow = (): boolean => {
  try {
    return localStorage.getItem(BOARD_AUTO_KEY) === 'fast';
  } catch {
    return false;
  }
};

/** 느린 기기로 적는다 (자동일 때 판이 빠름으로 바뀐다) */
export const markAutoSlow = (): void => {
  try {
    localStorage.setItem(BOARD_AUTO_KEY, 'fast');
  } catch {
    /* 저장소를 못 쓰는 창 — 이번 실행에만 */
  }
  slowNow = true;
  subs.forEach((f) => f());
};
let slowNow = false;
const clearAutoSlow = (): void => {
  slowNow = false;
  try {
    localStorage.removeItem(BOARD_AUTO_KEY);
  } catch {
    /* 무시 */
  }
};

/** 판을 절반 해상도로 그리나 — 빠름이거나, 자동이면서 느린 기기로 잰 적이 있을 때 */
export const boardFast = (): boolean => pref === 'fast' || (pref === 'auto' && (slowNow || autoSlow()));
