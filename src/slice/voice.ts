/**
 * 판 위 글 갈래 하나로 (P-B · D-489, 후기 #6 · #3): 누가 말하느냐로 자리 · 꼴이 하나씩 정해진다.
 *
 * | 갈래 | 누가 | 자리 | 꼴 |
 * |---|---|---|---|
 * | 바크 `bark` | 적 킹 · 적 기물 · 우리 분대원 | 말하는 기물 머리 위 | 철 토스트 판 + 진영 이름표(진홍 / 황동) + 꼬리(진홍 · 청록 · 황동 쐐기) |
 * | 자막 띠 `subtitle` | 이야기 순간 · 부관 박차 | 판 아래 가운데(짚은 곳이 아래면 위) | 철 토스트 띠 + 초상 액자 + 이름(편 색) |
 * | 상태 띠 (`uikit.stateBand`) | 시스템 · 경고 | 판 위 가운데 | 아이콘 + 한 줄(합니다체 · 표지) |
 * | 독백 `mono` | 종이왕 | 방금 누른 자리 곁 | 종이 테이프 한 줄 ‘ ’ |
 *
 * 갈래마다 동시에 하나. 우선순위: 자막 띠 > 상태 띠 > 바크 — 자막 띠가 떠 있으면 바크는 나오지 않는다(한 목소리).
 * 바크는 줄 서지 않는다(지난 수다는 버린다). 자막 띠는 줄 선다(이야기는 버리지 않는다). 시간은 글 길이로(VOICE_TIMING).
 * 줄인 움직임: 타자 · 계단 등장 · 디더 퇴장 없이 바로 보였다 바로 걷는다.
 * 그림 (D-386): 받기 전 빌린 부품 — 꼬리 = `chrome/tip-*`(90° 돌림), 이름표 = UI-24 강조 띠, 몸 = toast-iron. 「임시 — DL-01 · DL-02 대기」.
 */
import { VOICE_TIMING } from '../data/battle-voice';
import { pxOut, replay, typeIn, typeSkip } from './fx3';

/** 이름표 달린 말에서 바깥 큰따옴표를 걷는다 */
const unquote = (t: string): string => t.replace(/^“([\s\S]*)”$/, '$1');
const calm = (): boolean => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
/** 글 길이로 머무는 시간 (태그 · 따옴표 빼고 센다) */
export const holdMs = (kind: 'bark' | 'sub' | 'mono', text: string): number => {
  const n = text.replace(/<[^>]+>/g, '').length;
  return VOICE_TIMING[kind].base + VOICE_TIMING[kind].perChar * n;
};
export type VoiceSide = 'foe' | 'ally' | 'gilded';

// ---------- 바크: 기물 머리 위 ----------
/** 바크 자리: 말하는 기물의 화면 가운데 · 칸 반 높이 (판이 움직이면 다시 묻는다) */
export interface BarkAt { x: number; y: number; half: number }
let barkNow: { el: HTMLElement; prio: number; t: number } | null = null;
let barkAt = 0;
let subOn = false;
/** 바크를 걷는다 (화면이 바뀔 때 · 자막 띠가 뜰 때) */
export const clearBark = (): void => {
  if (!barkNow) return;
  window.clearTimeout(barkNow.t);
  barkNow.el.remove();
  barkNow = null;
};
const placeBark = (el: HTMLElement, at: BarkAt): void => {
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  const G = 8;
  const left = Math.round(Math.max(G, Math.min(innerWidth - w - G, at.x - w / 2)));
  // 꼬리 높이(쐐기 12도트 → 화면 약 12px)만큼 띄워 머리 위에. 화면 위로 넘치면 기물 아래로 뒤집는다
  const tail = 12;
  let top = Math.round(at.y - at.half - h - tail + 4);
  const below = top < 4;
  if (below) top = Math.round(at.y + at.half + tail - 4);
  el.classList.toggle('below', below);
  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
  el.style.setProperty('--tail-x', `${Math.round(Math.max(16, Math.min(w - 16, at.x - left)))}px`);
};
/**
 * 바크 한 줄 (기물의 말). 자막 띠가 떠 있거나, 더 높은 바크가 떠 있거나, 간격(VOICE_TIMING.gap) 안이면 버린다.
 * prio: 적 킹 2 · 기물 1 (같으면 새 것이 바꾼다). 떴으면 true.
 */
export const bark = (o: { at: () => BarkAt | null; side: VoiceSide; name: string; text: string; prio?: number; force?: boolean }): boolean => {
  const prio = o.prio ?? 1;
  if (subOn || document.body.classList.contains('between')) return false;
  // 이름표가 붙은 말은 그 자체가 따옴표다 (voice.md 말풍선) — 데이터의 “ ”를 걷는다
  o = { ...o, text: unquote(o.text) };
  if (barkNow && barkNow.prio > prio) return false;
  if (!o.force && !barkNow && performance.now() - barkAt < VOICE_TIMING.gap) return false;
  const at = o.at();
  if (!at) return false;
  clearBark();
  const el = document.createElement('div');
  el.className = `vbark kit side-${o.side}`;
  el.setAttribute('role', 'status');
  // 이름표 = 진영 재질 (적 진홍 띠 · 우리 · 도금왕 황동 띠) + 꼬리 색 — 색만이 아니라 띠 자리(적 = 오른쪽 · 우리 = 왼쪽)로도 가른다 (원칙 4)
  el.innerHTML = `<b class="ribbon vb-name${o.side === 'foe' ? ' r-crimson' : ''}">${o.name}</b><p class="vb-line"></p><i class="vb-tail" aria-hidden="true"></i>`;
  document.body.appendChild(el);
  const line = el.querySelector<HTMLElement>('.vb-line')!;
  // 자리는 다 찍힌 글로 먼저 잰다 (찍히는 동안 폭이 흔들리지 않게)
  line.innerHTML = o.text;
  el.style.width = `${Math.ceil(el.offsetWidth)}px`;
  placeBark(el, at);
  line.innerHTML = '';
  if (!calm()) replay(el, 'k-in');
  void typeIn(line, o.text, 28);
  const out = (): void => {
    if (barkNow?.el !== el) return;
    barkNow = null;
    pxOut(el, () => el.remove(), 160);
  };
  el.addEventListener('click', out);
  barkNow = { el, prio, t: window.setTimeout(out, holdMs('bark', o.text)) };
  barkAt = performance.now();
  return true;
};

// ---------- 자막 띠: 판 아래 가운데 ----------
/** 자막 띠 자리 (판 칸 격자의 사각형 — 부르는 쪽이 정한다). null이면 화면 아래 가운데 */
let subAnchor: () => DOMRect | null = () => null;
export const setSubAnchor = (fn: () => DOMRect | null): void => {
  subAnchor = fn;
};
export interface SubLine { face: string; who: string; side: VoiceSide; text: string; ms?: number; top?: boolean; tap?: boolean }
const subQ: { line: SubLine; done: () => void }[] = [];
let subEl: HTMLElement | null = null;
/** 자막 띠 자리: 판 격자 아래 빈 자리 가운데, top이면 판 위 (짚은 곳을 가리지 않게) */
export const placeSub = (el: HTMLElement, top = false): void => {
  const r = subAnchor();
  const w = r ? Math.min(592, Math.max(352, Math.round(r.width)), innerWidth - 32) : Math.min(592, innerWidth - 32);
  el.style.width = `${w}px`;
  const cx = r ? r.left + r.width / 2 : innerWidth / 2;
  el.style.left = `${Math.round(Math.max(16, Math.min(innerWidth - w - 16, cx - w / 2)))}px`;
  const h = el.offsetHeight;
  const y = top ? (r ? r.top : 8) : r ? r.bottom - h : innerHeight - h - 8;
  el.style.top = `${Math.round(Math.max(4, Math.min(innerHeight - h - 4, y)))}px`;
};
/** 자막 띠 틀 (초상 액자 + 이름 + 줄) — 튜토리얼도 같은 틀을 쓴다 */
export const subHtml = (o: { face: string; who: string; side: VoiceSide }): string =>
  `<div class="frame-portrait vs-face">${o.face}</div><div class="vs-body"><b class="vs-who side-${o.side}">${o.who}</b><p class="vs-line"></p></div>`;
const subNext = (): void => {
  const it = subQ.shift();
  if (!it) {
    subOn = false;
    subEl = null;
    return;
  }
  subOn = true;
  clearBark();
  const { line } = it;
  const el = document.createElement('div');
  el.className = 'vsub kit';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.innerHTML = subHtml(line);
  document.body.appendChild(el);
  subEl = el;
  const p = el.querySelector<HTMLElement>('.vs-line')!;
  p.innerHTML = line.text;
  placeSub(el, line.top);
  p.innerHTML = '';
  if (!calm()) replay(el, 'k-in');
  let over = false;
  const end = (): void => {
    if (over) return;
    over = true;
    window.clearTimeout(t);
    const fin = (): void => {
      el.remove();
      it.done();
      subNext();
    };
    pxOut(el, fin, 160);
  };
  // 누르면: 찍는 중이면 끝까지, 다 찍혔으면 넘김
  el.addEventListener('click', () => {
    if (!typeSkip(p)) end();
  });
  const t = line.tap ? 0 : window.setTimeout(end, line.ms ?? holdMs('sub', line.text));
  void typeIn(p, line.text, 30);
};
/** 자막 띠 한 줄 (이야기 · 부관). 줄 선다 — 끝나면(시간 또는 누름) 풀린다 */
export const subtitle = (line: SubLine): Promise<void> =>
  new Promise((done) => {
    subQ.push({ line: { ...line, text: unquote(line.text) }, done });
    if (!subOn) subNext();
  });
/** 자막 띠가 떠 있나 (바크 · 부관 안내가 서로 덮지 않게) */
export const subtitleOn = (): boolean => subOn;
/** 자막 띠 · 줄을 모두 걷는다 (화면이 바뀔 때) */
export const clearSubtitle = (): void => {
  const q = subQ.splice(0);
  subEl?.remove();
  subEl = null;
  subOn = false;
  q.forEach((x) => x.done());
};

// ---------- 독백: 누른 자리 곁 종이 테이프 ----------
let lastPt: { x: number; y: number } | null = null;
let monoNow: { el: HTMLElement; t: number } | null = null;
/** 마지막으로 누른 자리를 기억한다 (독백이 그 곁에 붙는다) */
export const installTouchMemory = (): void => {
  document.addEventListener('pointerdown', (e) => (lastPt = { x: e.clientX, y: e.clientY }), { capture: true, passive: true });
};
/** 독백 한 줄 (‘ ’) — 방금 누른 자리 위(모자라면 아래)에 종이 테이프. 하나만 (새 것이 옛 것을 바꾼다) */
export const mono = (text: string, near?: Element | null): void => {
  if (monoNow) {
    window.clearTimeout(monoNow.t);
    monoNow.el.remove();
    monoNow = null;
  }
  const r = near?.getBoundingClientRect();
  const pt = r && r.width ? { x: r.left + r.width / 2, y: r.top } : lastPt ?? { x: innerWidth / 2, y: innerHeight / 2 };
  const el = document.createElement('div');
  el.className = 'vmono kit';
  el.setAttribute('role', 'status');
  el.innerHTML = text;
  document.body.appendChild(el);
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  const left = Math.round(Math.max(8, Math.min(innerWidth - w - 8, pt.x - w / 2)));
  let top = Math.round(pt.y - h - 12);
  if (top < 4) top = Math.round(pt.y + 24);
  el.style.left = `${left}px`;
  el.style.top = `${Math.min(innerHeight - h - 4, top)}px`;
  if (!calm()) replay(el, 'k-in');
  const out = (): void => {
    if (monoNow?.el !== el) return;
    monoNow = null;
    pxOut(el, () => el.remove(), 160);
  };
  el.addEventListener('click', out);
  monoNow = { el, t: window.setTimeout(out, holdMs('mono', text)) };
};
/** 독백 글인가 (‘ ’로 시작) — 옛 toast 부름을 갈래로 나눌 때 */
export const isMono = (text: string): boolean => text.startsWith('‘');
/** 모든 갈래를 걷는다 (화면이 바뀔 때 — 상태 띠는 uikit.clearBand) */
export const clearVoices = (): void => {
  clearBark();
  clearSubtitle();
  if (monoNow) {
    window.clearTimeout(monoNow.t);
    monoNow.el.remove();
    monoNow = null;
  }
};
