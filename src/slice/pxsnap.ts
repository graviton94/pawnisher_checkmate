import './facesnap';
import './costsnap';

/**
 * 도트 1개 = 기기 픽셀 정수 (D-392, 사용자: 「범용 기기 환경 — PC · 모바일에 맞춰 설계」).
 * --px(장치 층 도트 하나의 CSS 크기)를 round(2 × DPR) / DPR로 — DPR 1 · 2 → 2px, 1.25 → 2.4px, 2.625 → 1.905px, 3 → 2px.
 * 그러면 9-slice 테 · 단추 · 명패의 도트가 어느 기기에서나 같은 두께의 기기 픽셀로 찍힌다(5 · 6px 섞임이 없다).
 * PC(일렉트론)는 기본 모바일 읽기 크기에 맞춰 확대(electron/main.cjs)하므로 바뀐 DPR에서 다시 계산한다.
 */
/**
 * 웹판을 PC 브라우저(마우스)로 열었을 때의 UI 확대 (D-539 · 검수 H5): 일렉트론 setZoomFactor와 같은 기준(915×412 읽기 크기)을
 * 정수로 내려 루트에 CSS zoom — 1080p에서 ×2. 정수라 도트 = 기기 픽셀 정수가 그대로 지켜진다. 손가락 기기 · 일렉트론은 1.
 */
import { installDitherVars } from '../view/motion';
import { installZoomGeometry, rawInnerH, rawInnerW } from '../view/vz';

const webZoom = (): number => {
  if ((globalThis as { pawnisherNative?: unknown }).pawnisherNative || !window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) return 1;
  return Math.max(1, Math.floor(Math.min(rawInnerW() / 915, rawInnerH() / 412)));
};
const apply = (): void => {
  const z = webZoom();
  const root = document.documentElement;
  if (String(z) !== (root.dataset.zoom ?? '1')) {
    root.dataset.zoom = String(z);
    root.style.zoom = z > 1 ? String(z) : '';
  }
  // 확대가 걸린 동안 JS 화면 좌표(창 크기 · 상자 · 포인터)를 배치 px로 (D-563, view/vz.ts)
  installZoomGeometry();
  // CSS vh · vw는 루트 zoom에 한 번 더 곱해진다(16vh → 화면 32%) — 확대일 때만 배치 px 길이로 덮는다 (D-563, CSS는 var(--vh, 1vh))
  if (z > 1) {
    root.style.setProperty('--vh', `${rawInnerH() / z / 100}px`);
    root.style.setProperty('--vw', `${rawInnerW() / z / 100}px`);
  } else {
    root.style.removeProperty('--vh');
    root.style.removeProperty('--vw');
  }
  const dpr = window.devicePixelRatio || 1;
  const dev = Math.max(1, Math.round(2 * dpr));
  document.documentElement.style.setProperty('--px', `${dev / dpr}px`);
  // 아이콘 층 도트 하나 = 기기 픽셀 round(DPR)개 (16칸 아이콘 · 적 의도 아이콘을 레일 한 줄 32px 안에 — D-396)
  document.documentElement.style.setProperty('--px1', `${Math.max(1, Math.round(dpr)) / dpr}px`);
  // 컷신 화자 명패 도트 하나 = 기기 픽셀 round(1.5 × DPR)개 (D-504 — 초상 43칸이 장면 칸 위에서 읽히는 64px 안팎)
  document.documentElement.style.setProperty('--px-plate', `${Math.max(1, Math.round(1.5 * dpr)) / dpr}px`);
  // 수령 원화의 세부 격자. 원본 안 상징을 떼지 않고도 정수 기기 픽셀로 표시한다.
  document.documentElement.style.setProperty('--px-detail', `${Math.max(1, Math.round(dpr * 0.75)) / dpr}px`);
  // 타이틀 문장(문장 205×124 + 글자 LG-01b 275×77 = 높이 약 217, 원본 1배 — D-568) 확대 = 기기 픽셀 정수배 (D-399 — 예전 zoom 1.3 · 1.15 · 1.4 비정수): 높이 80% · 1.5배 상한
  // 웹 PC 확대면 기기 픽셀 = 배치 px × DPR × 확대 — 1080p에서 문장 도트 하나 = 기기 3px (D-563)
  const devK = dpr * z;
  const logo = Math.max(1, Math.floor(devK * Math.min(1.5, (rawInnerH() / z * 0.8) / 217)));
  document.documentElement.style.setProperty('--logo-k', String(logo / devK));
  document.documentElement.dataset.dpr = String(Math.round(dpr * 1000) / 1000);
  // 디더 가면 16단(--dq0~16) · 먹 막(--dk0~16) — 칸 = 장치 층 도트 (D-554)
  installDitherVars();
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
