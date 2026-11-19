/**
 * 반장 2단계 예고 · 돌입 (후기 #21 · P-B D-490) — 받은 CI-01 크롬 (경보 띠 3프레임 · 사선 베기 · 레터박스).
 * 예고 = 판 위를 경보 띠가 가로지른다(줄무늬가 3프레임으로 흐름) + 시스템 한 줄.
 * 돌입 = 경고 띠 → 레터박스 · 2단계 초상 띠 · 사선 액자 컷인 → 명패 「2단계」 → 띠가 접히며 판이 2단계 색으로 (D-690, p2Rise 주석).
 * 모양은 phase2.css (D-690: D-601 정리 때 voice.css에서 판돈 칸과 함께 지워져 컷인 · 예고 띠가 화면에 안 보였다 — 이 모듈이 직접 불러 다시 잃지 않는다).
 * 그림 (D-386 · D-505): 받은 2단계 초상(CI-02~08, `boss-<이름>-p2`)을 cover로 자른다. 경보(CI-07)도 D-507에 받아 일곱 모두 받은 그림.
 * 사선 액자(cutin-frame)는 재발주본 CI-01b(D-512) — 173×44도트, 안쪽 평행사변형 홈 137×29도트(위 변 x 24~160 · 아래 변 x 12~148, y 8~36).
 *   홈에 같은 2단계 초상을 얼굴 쪽으로 더 붙여 cover로 넣고(clip-path = 실측 홈), 액자가 그 위에 덮인다 — 띠(넓게) + 액자(얼굴) 두 겹 컷인.
 * 게임 상태는 건드리지 않는다 (UI 원칙 9).
 */
import { calmMotion, reduceFlash } from '../prefs/motion';
import { pxOut, shake } from './fx3';
import './phase2.css';
import { sfxFor } from '../audio/sfx';
import { sparksAt } from './uifx';
import { devPerCss, layRect, viewH, viewW } from '../view/vz';

const calm = (): boolean => calmMotion();
const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

/** 2단계 예고: 판 칸 격자 위쪽을 경보 띠가 가로지른다 (글 = 시스템 투 한 줄) */
export const p2Warn = (text: string, grid: DOMRect | null): void => {
  document.querySelector('.p2-warn')?.remove();
  const el = document.createElement('div');
  el.className = 'p2-band p2-warn';
  el.setAttribute('role', 'status');
  el.innerHTML = `<span>${text}</span>`;
  document.body.appendChild(el);
  // 판 격자 상자는 보이는 px — 배치 px로 (웹 PC 확대, D-563)
  const r = grid ? layRect(grid) : new DOMRect(0, viewH() / 3, viewW(), 1);
  el.style.left = `${Math.round(r.left)}px`;
  el.style.width = `${Math.round(r.width)}px`;
  el.style.top = `${Math.round(r.top + r.height * 0.25 - el.offsetHeight / 2)}px`;
  window.setTimeout(() => pxOut(el, () => el.remove(), 200), calm() ? 2600 : 2400);
};

/**
 * 2단계 돌입 컷인 (D-690 — 경고 → 사선 컷인 → 판 바뀜). art = 2단계 초상(scenes/<art>.png), name = 반장 이름, word = 한 줄 표지(⑨),
 * face = 사선 액자 홈 안 초상 초점(얼굴).
 *  ① 경고 (0 ~ 360ms): 위아래 경보 띠가 5계단으로 가로지른다 — 「경고」
 *  ② 컷인 (360 ~ 1700ms): 레터박스가 3계단으로 닫히고 2단계 초상 띠가 열린다 → 진홍 단색 번쩍 2프레임(번쩍임 줄이기면 없음)
 *     → 사선 액자(CI-01b)가 예비 → 터짐 → 출렁으로 꽂히며 흔들림 · 불똥 → 명패(「2단계」 꼬리표 + 반장 이름 + 표지)가 계단으로
 *  ③ 판 바뀜 (1700ms ~): 띠가 가운데로 4계단 접히고 레터박스가 걷힌다 — 부르는 쪽이 이때 판을 2단계 색으로 다시 깐다.
 * 디더 · 투명도 보간 없음(D-675) — 나타남 · 사라짐은 clip-path 계단.
 * 끝나면 풀린다 (부르는 쪽이 다음에 자막 띠로 2단계 한마디).
 */
export const p2Rise = async (o: { art: string; word: string; name?: string; tag?: string; face?: string }): Promise<void> => {
  document.querySelector('.p2cut')?.remove();
  const root = document.createElement('div');
  root.className = `p2cut${calm() ? ' calm' : ''}`;
  root.setAttribute('role', 'alert');
  root.innerHTML = `<div class="p2-lb top"></div><div class="p2-lb bot"></div><div class="p2-strip"><img src="scenes/${o.art}.png" alt=""></div>`
    + `<div class="p2-band p2-alert top"><span>${o.tag ?? '경고'}</span></div><div class="p2-band p2-alert bot"><span>${o.tag ?? '경고'}</span></div>`
    + `<i class="p2-slash" aria-hidden="true"><img src="scenes/${o.art}.png" alt="" style="object-position:${o.face ?? '50% 22%'}"></i>`
    + `<div class="p2-name"><span class="ribbon r-crimson">2단계</span>${o.name ? `<b>${o.name}</b>` : ''}<p>${o.word}</p></div>`;
  document.body.appendChild(root);
  // 띠 안 초상: 띠 높이에 드는 가장 큰 기기 픽셀 정수배 · 띠 오른쪽 62% 자리에 가운데 (자르지 않는다 — D-386 비율)
  const strip = root.querySelector<HTMLElement>('.p2-strip')!, pic = strip.querySelector<HTMLImageElement>('img')!;
  const fit = (): void => {
    const dev = devPerCss(), sh = strip.offsetHeight, sw = strip.offsetWidth;
    const kd = Math.max(1, Math.floor((sh * dev) / pic.naturalHeight));
    const w = (pic.naturalWidth * kd) / dev, h = (pic.naturalHeight * kd) / dev;
    Object.assign(pic.style, { width: `${w}px`, height: `${h}px`, left: `${Math.round((sw * 0.62 - w / 2) * dev) / dev}px`, top: `${Math.round(((sh - h) / 2) * dev) / dev}px` });
  };
  if (pic.complete && pic.naturalWidth) fit(); else pic.onload = fit;
  if (calm()) {
    await wait(1100);
    root.remove();
    document.body.classList.add('p2-rage');
    return;
  }
  // ① 경고
  root.classList.add('warn');
  await wait(360);
  // ② 컷인 — 레터박스 닫힘 · 띠 열림 · 번쩍(단색 진홍 2프레임, 한 번 — D-538)
  root.classList.add('go');
  sfxFor('cutIn');
  if (!reduceFlash()) {
    const flash = document.createElement('div');
    flash.className = 'p2-flash';
    document.body.appendChild(flash);
    window.setTimeout(() => flash.remove(), 70);
  }
  await wait(260);
  shake(document.getElementById('app'), 3);
  const s = root.querySelector('.p2-slash')!.getBoundingClientRect();
  sparksAt(s.left + s.width / 2, s.top + s.height / 2, 18, 60);
  await wait(140);
  root.classList.add('word');
  await wait(1000);
  // ③ 판 바뀜 — 띠가 가운데로 접히고 레터박스가 걷힌다. 판은 이때부터 2단계 색
  document.body.classList.add('p2-rage');
  root.classList.add('out');
  await wait(300);
  root.remove();
};
/** 2단계가 끝나면(대국이 끝나면) 판 테두리 쇳물빛을 걷는다 */
export const p2Clear = (): void => {
  document.body.classList.remove('p2-rage');
  document.querySelectorAll('.p2cut, .p2-warn').forEach((e) => e.remove());
};
