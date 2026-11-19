/**
 * 조용한 구간 (D-676 — 사용자 실기기: 「로딩 완료 후 로고가 왼쪽으로 가면서 버튼 등장할 때 프레임 구림」).
 * 타이틀 베기 · 메뉴 펼침처럼 눈에 띄는 움직임이 도는 동안에는 급하지 않은 일(그림 미리 받기 · 불씨 · 반짝 띠 · 기록 쓰기)을 미룬다.
 * quietFor(ms)로 「지금부터 ms 동안 조용히」를 걸고(겹치면 긴 쪽), afterQuiet()은 그 구간이 끝나고 쉬는 틈(requestIdleCallback)에 풀린다.
 * 게임 상태는 건드리지 않는다 — 화면 일의 순서만 바꾼다 (UI 원칙 9).
 */
let until = 0;

const now = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/** 지금부터 ms 동안 조용한 구간 (이미 더 길게 걸려 있으면 그대로) */
export const quietFor = (ms: number): void => {
  until = Math.max(until, now() + ms);
};

/** 지금 조용한 구간인가 (대기 연출이 이번 차례를 건너뛸 때) */
export const isQuiet = (): boolean => now() < until;

/** 쉬는 틈 한 번 (requestIdleCallback이 없으면 짧은 타이머) */
const idle = (): Promise<void> =>
  new Promise((r) => {
    const ric = (globalThis as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    if (ric) ric(() => r(), { timeout: 1000 });
    else setTimeout(r, 50);
  });

/** 조용한 구간이 끝난 뒤 쉬는 틈에 풀린다 (구간이 늘어나면 더 기다린다). 조용한 구간이 아니면 바로 */
export const afterQuiet = async (): Promise<void> => {
  if (now() >= until) return;
  for (;;) {
    const left = until - now();
    if (left > 0) await new Promise((r) => setTimeout(r, left));
    await idle();
    if (now() >= until) return;
  }
};
