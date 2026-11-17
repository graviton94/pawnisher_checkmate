/** 워밍업 로딩이 미리 부르는 묶음 안 큰 그림 (4 KB 이상 — tools/gen-preload.cjs가 만든다, 손으로 고치지 않는다) */
export const PRELOAD_BUNDLED: string[] = [
  new URL('../assets/ui/ap-empty.png', import.meta.url).href,
  new URL('../assets/ui/ap-full.png', import.meta.url).href,
  new URL('../assets/ui/chrome/v2/ledger-slip.png', import.meta.url).href,
  new URL('../assets/ui/chrome/v2/unit-stat-attack.png', import.meta.url).href,
  new URL('../assets/ui/chrome/v2/unit-stat-defense.png', import.meta.url).href,
  new URL('../assets/ui/chrome/v2/unit-stat-hp.png', import.meta.url).href,
  new URL('../assets/ui/chrome/v2/unit-stat-shield.png', import.meta.url).href,
];
