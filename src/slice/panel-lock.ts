/**
 * 창 잠금 (D-597): `#overlay-panel`은 모든 창이 돌려 쓰는 한 장이라, 한 화면이 건 잠금(`locked` → pointer-events: none)이
 * 다음 화면까지 남으면 그 뒤 모든 고르기 화면이 눌리지 않는다 (사건 「무시하고 떠난다」 소프트락).
 * 그래서 잠금은 화면 하나의 것이다 — 새 창을 열 때(freshPanel) 반드시 풀고, 잠그는 곳은 이 함수들만 쓴다.
 */
export const PANEL_LOCK = 'locked';

/** classList만 있으면 된다 (테스트는 가짜 요소로 본다) */
export interface Lockable { classList: { add: (c: string) => void; remove: (c: string) => void; contains: (c: string) => boolean } }

/** 이 화면을 잠근다 (확정 연출 · 대사 중 두 번 누름 막기) */
export const lockPanel = (el: Lockable): void => el.classList.add(PANEL_LOCK);
/** 잠금을 푼다 */
export const unlockPanel = (el: Lockable): void => el.classList.remove(PANEL_LOCK);
/** 잠겨 있나 */
export const panelLocked = (el: Lockable): boolean => el.classList.contains(PANEL_LOCK);
/** 새 화면을 그릴 때 — 앞 화면이 건 잠금을 물려받지 않는다 (어느 길로 떠났든: 떠나기 · 고르기 · 취소 · 오류 · 뒤로 가기) */
export const freshPanel = (el: Lockable): void => unlockPanel(el);
/** 잠근 채 일을 하고, 끝나면(오류가 나도) 반드시 푼다 */
export const withPanelLock = async <T>(el: Lockable, fn: () => T | Promise<T>): Promise<T> => {
  lockPanel(el);
  try {
    return await fn();
  } finally {
    unlockPanel(el);
  }
};
