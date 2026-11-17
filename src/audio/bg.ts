/** 앱을 내리면(백그라운드) 소리를 끄나 (D-538 설정 · 기본 켬) — 효과음 · 음악이 같이 묻는다 */
let on = true;
export const bgMuted = (): boolean => on;
export const setBgMute = (v: boolean): void => {
  on = v;
};
