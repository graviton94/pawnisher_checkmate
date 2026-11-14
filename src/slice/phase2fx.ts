/**
 * 반장 2단계 예고 · 돌입 (후기 #21 · P-B D-490) — 받은 CI-01 크롬 (경보 띠 3프레임 · 사선 베기 · 레터박스).
 * 예고 = 판 위를 경보 띠가 가로지른다(줄무늬가 3프레임으로 흐름) + 시스템 한 줄.
 * 돌입 = 판 정지 → 레터박스가 계단으로 닫힘 → 진홍 번쩍(계단) → 반장 그림 띠 + 사선 베기가 예비 → 터짐 → 출렁으로 내리꽂힘 + 화면 흔들림
 *        → 경보 띠 「격노」 → 열림(디더 퇴장). 1.4초 안. 줄인 움직임이면 정지 컷 0.9초.
 * 그림 (D-386): 반장 그림은 1단계 장면 그림을 cover로 자른다 — 「임시 — CI-02 ~ CI-08(2단계 초상) 대기」.
 * 사선 액자(cutin-frame)는 받은 안쪽 홈이 너무 얇아(약 10도트) 초상 액자로는 못 쓰고 베기 선 장식으로만 쓴다 — 재발주(asset-order-master CI-01).
 * 게임 상태는 건드리지 않는다 (UI 원칙 9).
 */
import { pxOut, shake } from './fx3';
import { sparksAt } from './uifx';

const calm = (): boolean => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

/** 2단계 예고: 판 칸 격자 위쪽을 경보 띠가 가로지른다 (글 = 시스템 투 한 줄) */
export const p2Warn = (text: string, grid: DOMRect | null): void => {
  document.querySelector('.p2-warn')?.remove();
  const el = document.createElement('div');
  el.className = 'p2-band p2-warn';
  el.setAttribute('role', 'status');
  el.innerHTML = `<span>${text}</span>`;
  document.body.appendChild(el);
  const r = grid ?? new DOMRect(0, innerHeight / 3, innerWidth, 1);
  el.style.left = `${Math.round(r.left)}px`;
  el.style.width = `${Math.round(r.width)}px`;
  el.style.top = `${Math.round(r.top + r.height * 0.25 - el.offsetHeight / 2)}px`;
  window.setTimeout(() => pxOut(el, () => el.remove(), 200), calm() ? 2600 : 2400);
};

/**
 * 2단계 돌입 컷인. art = 장면 그림 이름(scenes/<art>.png), word = 띠 표지(⑨ — 「반장이 격노해 일어선다」).
 * 끝나면 풀린다 (부르는 쪽이 다음에 자막 띠로 2단계 한마디).
 */
export const p2Rise = async (o: { art: string; word: string; focus?: string }): Promise<void> => {
  document.querySelector('.p2cut')?.remove();
  const root = document.createElement('div');
  root.className = `p2cut${calm() ? ' calm' : ''}`;
  root.setAttribute('role', 'alert');
  root.innerHTML = `<div class="p2-lb top"></div><div class="p2-lb bot"></div><div class="p2-strip"><img src="scenes/${o.art}.png" alt="" style="object-position:${o.focus ?? '50% 28%'}"></div><i class="p2-slash" aria-hidden="true"></i><div class="p2-band p2-word"><span>${o.word}</span></div>`;
  document.body.appendChild(root);
  document.body.classList.add('p2-rage');
  if (calm()) {
    await wait(900);
    root.remove();
    return;
  }
  // 1 · 레터박스 닫힘 (3계단) → 2 · 진홍 번쩍 → 3 · 그림 띠 · 베기 내리꽂힘 + 흔들림 + 불똥 → 4 · 「격노」 띠
  await wait(200);
  const flash = document.createElement('div');
  flash.className = 'p2-flash';
  document.body.appendChild(flash);
  window.setTimeout(() => flash.remove(), 440);
  root.classList.add('go');
  await wait(260);
  shake(document.getElementById('app'), 3);
  const s = root.querySelector('.p2-slash')!.getBoundingClientRect();
  sparksAt(s.left + s.width / 2, s.top + s.height / 2, 18, 60);
  root.classList.add('word');
  await wait(900);
  pxOut(root, () => root.remove(), 220);
  await wait(220);
};
/** 2단계가 끝나면(대국이 끝나면) 판 테두리 쇳물빛을 걷는다 */
export const p2Clear = (): void => {
  document.body.classList.remove('p2-rage');
  document.querySelectorAll('.p2cut, .p2-warn').forEach((e) => e.remove());
};
