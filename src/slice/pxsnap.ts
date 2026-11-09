/**
 * 도트 1개 = 기기 픽셀 정수 (D-392, 사용자: 「범용 기기 환경 — PC · 모바일에 맞춰 설계」).
 * --px(장치 층 도트 하나의 CSS 크기)를 round(2 × DPR) / DPR로 — DPR 1 · 2 → 2px, 1.25 → 2.4px, 2.625 → 1.905px, 3 → 2px.
 * 그러면 9-slice 테 · 단추 · 명패의 도트가 어느 기기에서나 같은 두께의 기기 픽셀로 찍힌다(5 · 6px 섞임이 없다).
 * PC(일렉트론)는 창 크기에 맞춰 정수 배율 확대(electron/main.cjs)를 해서 DPR이 바뀌므로 여기서 다시 계산한다.
 */
const apply = (): void => {
  const dpr = window.devicePixelRatio || 1;
  const dev = Math.max(1, Math.round(2 * dpr));
  document.documentElement.style.setProperty('--px', `${dev / dpr}px`);
  // 아이콘 층 도트 하나 = 기기 픽셀 round(DPR)개 (16칸 아이콘 · 적 의도 아이콘을 레일 한 줄 32px 안에 — D-396)
  document.documentElement.style.setProperty('--px1', `${Math.max(1, Math.round(dpr)) / dpr}px`);
  // 타이틀 문장(205×194 원본 1배) 확대 = 기기 픽셀 정수배 (D-398 — 예전 zoom 1.3 · 1.15 · 1.4 비정수): 높이 80% · 1.5배 상한
  const logo = Math.max(1, Math.floor(dpr * Math.min(1.5, (window.innerHeight * 0.8) / 194)));
  document.documentElement.style.setProperty('--logo-k', String(logo / dpr));
  document.documentElement.dataset.dpr = String(Math.round(dpr * 1000) / 1000);
};
let mq: MediaQueryList | null = null;
const watch = (): void => {
  apply();
  mq?.removeEventListener('change', watch);
  mq = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
  mq.addEventListener('change', watch);
};
watch();
window.addEventListener('resize', apply);
