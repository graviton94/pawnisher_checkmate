import { RENDER } from '../data/fx';

/**
 * 판을 그리는 배율 (D-240 상한 → D-525 정수 늘림 → D-665 판 선명도): 캔버스 한 픽셀이 기기 픽셀 정수 개로 늘어나야 도트 · 바 · 테 줄이 고르다.
 * 선명: 기기 배율이 상한(RENDER.dprCap)을 넘으면 기기 배율을 정수로 나눈 값 중 상한 이하 · 하한(RENDER.dprMin) 이상을 쓰고,
 * 그런 값이 없으면(2.625 같은 소수 배율) 기기 배율 그대로 그린다.
 * 빠름: 선명의 나눗수 m을 2m으로(안 되면 m보다 큰 가장 작은 정수로) 더 나눈다 — 배율이 RENDER.fastMin 아래로 가면 선명과 같다.
 * 그림은 늘 정수배로 늘어나고(캔버스 image-rendering: pixelated · 텍스처 NEAREST) 흐려지지 않는다.
 */
export const renderScale = (dpr: number, fast = false): number => {
  let m = 1;
  if (dpr > RENDER.dprCap) {
    for (let k = 2; dpr / k >= RENDER.dprMin; k++) if (dpr / k <= RENDER.dprCap) { m = k; break; }
  }
  if (!fast) return dpr / m;
  for (const k of [2 * m, ...Array.from({ length: 6 }, (_, i) => m + 1 + i)]) if (dpr / k >= RENDER.fastMin) return dpr / k;
  return dpr / m;
};
