/**
 * 반장 2단계 예고 · 돌입 (후기 #21 · P-B D-490) — 받은 CI-01 크롬 (경보 띠 3프레임 · 사선 베기 · 레터박스).
 * 예고 = 판 위를 경보 띠가 가로지른다(줄무늬가 3프레임으로 흐름) + 시스템 한 줄.
 * 돌입 = 판 정지 → 레터박스가 계단으로 닫힘 → 진홍 디더 번쩍 한 번(D-538) → 반장 그림 띠 + 사선 베기가 예비 → 터짐 → 출렁으로 내리꽂힘 + 화면 흔들림
 *        → 경보 띠 「격노」 → 열림(디더 퇴장). 1.4초 안. 줄인 움직임이면 정지 컷 0.9초.
 * 그림 (D-386 · D-505): 받은 2단계 초상(CI-02~08, `boss-<이름>-p2`)을 cover로 자른다. 경보(CI-07)도 D-507에 받아 일곱 모두 받은 그림.
 * 사선 액자(cutin-frame)는 재발주본 CI-01b(D-512) — 173×44도트, 안쪽 평행사변형 홈 137×29도트(위 변 x 24~160 · 아래 변 x 12~148, y 8~36).
 *   홈에 같은 2단계 초상을 얼굴 쪽으로 더 붙여 cover로 넣고(clip-path = 실측 홈), 액자가 그 위에 덮인다 — 띠(넓게) + 액자(얼굴) 두 겹 컷인.
 * 게임 상태는 건드리지 않는다 (UI 원칙 9).
 */
import { calmMotion, reduceFlash } from '../prefs/motion';
import { pxOut, shake } from './fx3';
import { sparksAt } from './uifx';
import { layRect, viewH, viewW } from '../view/vz';

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
 * 2단계 돌입 컷인. art = 장면 그림 이름(scenes/<art>.png), word = 띠 표지(⑨ — 「반장이 격노해 일어선다」),
 * focus = 띠 그림 초점, face = 사선 액자 홈 안 초상 초점(얼굴).
 * 끝나면 풀린다 (부르는 쪽이 다음에 자막 띠로 2단계 한마디).
 */
export const p2Rise = async (o: { art: string; word: string; focus?: string; face?: string }): Promise<void> => {
  document.querySelector('.p2cut')?.remove();
  const root = document.createElement('div');
  root.className = `p2cut${calm() ? ' calm' : ''}`;
  root.setAttribute('role', 'alert');
  root.innerHTML = `<div class="p2-lb top"></div><div class="p2-lb bot"></div><div class="p2-strip"><img src="scenes/${o.art}.png" alt="" style="object-position:${o.focus ?? '50% 28%'}"></div><i class="p2-slash" aria-hidden="true"><img src="scenes/${o.art}.png" alt="" style="object-position:${o.face ?? '50% 22%'}"></i><div class="p2-band p2-word"><span>${o.word}</span></div>`;
  document.body.appendChild(root);
  document.body.classList.add('p2-rage');
  if (calm()) {
    await wait(900);
    root.remove();
    return;
  }
  // 1 · 레터박스 닫힘 (3계단) → 2 · 진홍 번쩍 → 3 · 그림 띠 · 베기 내리꽂힘 + 흔들림 + 불똥 → 4 · 「격노」 띠
  await wait(200);
  // 번쩍임은 한 번 (D-538): 그림 띠 자리만 진홍 50% 디더 한 장. 번쩍임 줄이기면 없다
  if (!reduceFlash()) {
    const flash = document.createElement('div');
    flash.className = 'p2-flash';
    document.body.appendChild(flash);
    window.setTimeout(() => flash.remove(), 380);
  }
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
