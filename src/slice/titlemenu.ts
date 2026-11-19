/**
 * 타이틀 → 메뉴 펼침의 움직임 (D-676 — 사용자 실기기: 「로딩 완료 후 로고가 왼쪽으로 가면서 버튼 등장할 때 프레임 구림」).
 * 원인: 로고가 `right` 길이를 5계단(steps(5), 104ms에 한 번)으로 옮겨 계단마다 배치 · 칠하기를 다시 했고, 단추는 가면(mask) 계단으로
 * 나타나 주 스레드에서 돌았으며, 그 사이 뒤에서 그림 미리 받기 · 불씨 · 반짝 띠가 같이 돌았다.
 * 고침: 로고는 배치를 바꾸지 않고 transform 하나만 — 120Hz로 구운 정수 기기 픽셀 Web Animations(합성기, compTween)로 예비 → 터짐 → 출렁.
 * 단추는 transform만 쓰는 CSS 키프레임(menuin). 펼치기 전에 단추 그림을 풀어(decode) 두고, 펼침 + 500ms 동안은 조용한 구간(quiet.ts).
 */
import btnBrassUp from '../assets/ui/chrome/v2/btn-brass-up.png';
import btnIronUp from '../assets/ui/chrome/v2/btn-iron-up.png';
import crownEmblem from '../assets/ui/chrome/v2/crown-emblem-1.png';
import { compTween, ease, snapDev } from '../view/motion';
import { viewW } from '../view/vz';
import { quietFor } from './quiet';

/** 로고 슬라이드 시간 (ms) · 단추 펼침이 끝나는 때 (마지막 단추 지연 250 + 360) · 그 뒤 쉼 */
export const TITLE_MENU = { logoMs: 560, menuMs: 610, rest: 500 } as const;

let art: Promise<unknown> | null = null;
/** 메뉴 단추 · 아이콘 그림을 미리 받아 풀어 둔다 (타이틀이 뜰 때 한 번 — 펼치는 프레임에 디코딩이 끼지 않게) */
export const menuArtReady = (): Promise<unknown> => {
  art ??= Promise.all(
    [btnBrassUp, btnIronUp, crownEmblem, 'ui/icons16/menu.ledger.png', 'ui/icons16/menu.settings.png', 'ui/icons16/menu.quit.png'].map((src) => {
      const im = new Image();
      im.src = src;
      return im.decode().catch(() => undefined);
    }),
  );
  return art;
};

/** 메뉴 자리의 로고 위치 (옛 `right: 46%; bottom: 0` 상자 가운데와 같은 곳 — 상자 폭 46%의 절반 왼쪽 · 아래 여백 34의 절반 아래) — 기기 픽셀 정수 */
const target = (logo: HTMLElement): { x: number; y: number } => ({ x: snapDev(-(logo.parentElement?.clientWidth ?? viewW()) * 0.23), y: snapDev(17) });

/**
 * 로고를 메뉴 자리로 (배치는 그대로, transform만). animate=false면 바로 그 자리.
 * 화면 크기가 바뀌면 자리를 다시 잰다.
 */
export const slideLogo = (logo: HTMLElement, animate: boolean): Promise<void> => {
  logo.style.willChange = 'transform';
  const fit = (): void => {
    if (!logo.isConnected) return void window.removeEventListener('resize', fit);
    const p = target(logo);
    logo.style.transform = `translate3d(${p.x}px,${p.y}px,0)`;
  };
  window.addEventListener('resize', fit);
  if (!animate) return Promise.resolve(fit());
  quietFor(Math.max(TITLE_MENU.logoMs, TITLE_MENU.menuMs) + TITLE_MENU.rest);
  const p = target(logo);
  return compTween(logo, TITLE_MENU.logoMs, (t) => {
    const e = ease.abs(t, 0.05, 0.04);
    return `translate3d(${snapDev(p.x * e)}px,${snapDev(p.y * e)}px,0)`;
  });
};

/** 구간 사이 보간 */
const mix = (a: number, b: number, k: number): number => a + (b - a) * k;
/**
 * 단추 한 개의 모습 (t = 0~1): 납작하게 숨어 있다가 펴지며(예비, 0~14%) 오른쪽에서 밀려와 넘치고(터짐, ~60%) 출렁(~82%) 선다.
 * 위치는 기기 픽셀 정수.
 */
const btnFrame = (t: number): string => {
  if (t >= 1) return 'none';
  let x: number, sk: number, sy: number;
  if (t < 0.14) { const k = ease.out(t / 0.14); x = mix(64, 56, k); sk = -10; sy = mix(0, 1.06, k); }
  else if (t < 0.6) { const k = ease.out((t - 0.14) / 0.46); x = mix(56, -6, k); sk = mix(-10, 3, k); sy = mix(1.06, 1, k); }
  else if (t < 0.82) { const k = ease.inOut((t - 0.6) / 0.22); x = mix(-6, 2, k); sk = mix(3, -1, k); sy = 1; }
  else { const k = ease.inOut((t - 0.82) / 0.18); x = mix(2, 0, k); sk = mix(-1, 0, k); sy = 1; }
  return `translate3d(${snapDev(x)}px,0,0) skewX(${+sk.toFixed(2)}deg) scale(1,${+sy.toFixed(3)})`;
};

/** 메뉴 단추를 차례로(50ms 어긋남) 펼친다 — 합성기에서 도는 구운 transform만. 끝나면 풀린다 */
export const revealMenu = (nav: HTMLElement): Promise<void> => {
  const kids = [...nav.children] as HTMLElement[];
  kids.forEach((k) => (k.style.willChange = 'transform'));
  return Promise.all(kids.map((k, i) => compTween(k, 360, btnFrame, i * 50))).then(() =>
    kids.forEach((k) => {
      k.style.removeProperty('transform');
      k.style.removeProperty('will-change');
    }),
  );
};
