/**
 * 본편 플랫폼 기능 (D-531). PC(Electron)에서만 창 기능이 있고, 웹 · 안드로이드에서는 아무 일도 하지 않는다.
 * 설정 창 단추가 이것만 부른다 — window.pawnisherNative는 electron/preload.cjs가 넣는다.
 */
interface NativeApi {
  quit?: () => Promise<void>;
  toggleFullscreen?: () => Promise<boolean>;
  isFullscreen?: () => Promise<boolean>;
}

const native = (): NativeApi | undefined => (globalThis as { pawnisherNative?: NativeApi }).pawnisherNative;

/** 출시 빌드인가 (`vite build --mode release` — legacy.html · ?debug 치트가 빠진다) */
export const RELEASE: boolean = import.meta.env.MODE === 'release';

/** 개발 · 검수용 주소 꼬리(?debug · ?lab · ?builds)를 받아 주는가 — 출시 빌드에서는 늘 false */
export const devQuery = (key: 'debug' | 'lab' | 'builds' | 'opening'): boolean =>
  !RELEASE && typeof location !== 'undefined' && new URLSearchParams(location.search).has(key);

/** PC 앱인가 (끝내기 · 전체 화면 단추를 보일지) */
export const isDesktop = (): boolean => typeof native()?.quit === 'function';

/** 끝내기 직전에 할 일 (main.ts가 persistNow를 건다 — 대국 판 · 기록을 남긴다, 코드 리뷰 9) */
let beforeQuit: () => void = () => undefined;
export const onBeforeQuit = (fn: () => void): void => {
  beforeQuit = fn;
};

/** 게임 끝내기 (PC만 — 웹 · 안드로이드는 아무 일도 없다). 창이 닫히기 전에 먼저 저장한다 (pagehide에만 기대지 않게) */
export const quitGame = (): void => {
  const quit = native()?.quit;
  if (!quit) return;
  try {
    beforeQuit();
  } catch (err) {
    console.error(err);
  }
  void quit().catch(() => undefined);
};

/** 전체 화면 켜고 끄기 → 바뀐 상태 (PC만, 그 밖에는 false) */
export const toggleFullscreen = async (): Promise<boolean> => {
  const fn = native()?.toggleFullscreen;
  if (!fn) return false;
  return fn().catch(() => false);
};

/** 지금 전체 화면인가 (PC만, 그 밖에는 false) */
export const isFullscreen = async (): Promise<boolean> => {
  const fn = native()?.isFullscreen;
  if (!fn) return false;
  return fn().catch(() => false);
};
