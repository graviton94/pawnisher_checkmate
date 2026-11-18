/**
 * 판 위 글 갈래 하나로 (P-B · D-490, 후기 #6 · #3): 누가 말하느냐로 자리 · 꼴이 하나씩 정해진다.
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
import { calmMotion } from '../prefs/motion';
import { lay, layRect, viewH, viewW } from '../view/vz';
import { VOICE_TIMING } from '../data/battle-voice';
import { pxOut, replay, typeIn, typeSkip } from './fx3';

/** 이름표 달린 말에서 바깥 큰따옴표를 걷는다 */
const unquote = (t: string): string => t.replace(/^“([\s\S]*)”$/, '$1');
const calm = (): boolean => calmMotion();
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
/** 띠 1도트 (CSS --px1) — 이름표 · 꼬리가 띠 밖으로 나온 만큼 자리를 잰다 */
const dot1 = (): number => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--px1')) || 1;
const placeBark = (el: HTMLElement, at0: BarkAt): void => {
  // 자리 계산은 배치 px로 (웹 PC 확대에서 판 좌표는 확대 뒤 값 — D-563)
  const at = { x: lay(at0.x), y: lay(at0.y), half: lay(at0.half) };
  const innerWidth = viewW();
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  const d = dot1();
  const G = 8;
  const left = Math.round(Math.max(G, Math.min(innerWidth - w - G, at.x - w / 2)));
  // 꼬리(띠 아래로 10도트)가 머리 위에 닿게. 이름표(띠 위로 8도트)까지 화면 위로 넘치면 기물 아래로 뒤집는다(꼬리 위 · 이름표 아래)
  let top = Math.round(at.y - at.half - h - 10 * d + 2);
  const below = top - 8 * d < 4;
  if (below) top = Math.round(at.y + at.half + 4 * d);
  el.classList.toggle('below', below);
  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
  el.style.setProperty('--tail-x', `${Math.round(Math.max(16, Math.min(w - 16, at.x - left)))}px`);
};
/**
 * 바크 한 줄 (기물의 말). 자막 띠가 떠 있거나, 더 높은 바크가 떠 있거나, 간격(VOICE_TIMING.gap) 안이면 버린다.
 * prio: 적 킹 2 · 기물 1 (같으면 새 것이 바꾼다). 떴으면 true.
 */
export const bark = (o: { at: () => BarkAt | null; side: VoiceSide; name: string; text: string; face?: string; prio?: number; force?: boolean }): boolean => {
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
  el.className = `vbark dl-band dl-${o.side === 'ally' ? 'ally' : 'foe'} side-${o.side}`;
  el.setAttribute('role', 'status');
  // 받은 DL-01 띠 + DL-02 이름표 — 적 = 검은 쇠 · 진홍 등 · 오른쪽 홈, 우리 = 황동 · 종이 · 왼쪽 홈 (원칙 4: 재질 · 홈 자리 · 이름표 모양)
  el.innerHTML = bandHtml(o) + '<i class="vb-tail" aria-hidden="true"></i>';
  document.body.appendChild(el);
  const line = el.querySelector<HTMLElement>('.dl-line')!;
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
export const placeSub = (el: HTMLElement, top = false, minW = 0): void => {
  const r0 = subAnchor(), r = r0 && layRect(r0);
  const innerWidth = viewW(), innerHeight = viewH();
  // 판 열 안 (레일을 덮지 않는다) · 창 M 단계 592를 넘지 않는다.
  // minW (P-C D-502 부관 안내): 판 열이 좁은 화면(667)에서 띠가 네 줄로 접혀 판 절반을 덮었다 — 이 폭까지는 레일 위로 넓힌다(화면 안 16 여백)
  const w = Math.max(r ? Math.min(592, Math.round(r.width) - 8) : Math.min(592, innerWidth - 32), Math.min(minW, innerWidth - 32));
  el.style.width = `${w}px`;
  const cx = r ? r.left + r.width / 2 : innerWidth / 2;
  el.style.left = `${Math.round(Math.max(16, Math.min(innerWidth - w - 16, cx - w / 2)))}px`;
  const h = el.offsetHeight;
  const y = top ? (r ? r.top : 8) : r ? r.bottom - h : innerHeight - h - 8;
  el.style.top = `${Math.round(Math.max(4, Math.min(innerHeight - h - 4, y)))}px`;
};
/** 부관 띠 최소 폭 (px) — 판 열이 좁은 화면(667)에서도 두 줄 안에 들게 레일 위로 넓힌다 (P-C D-502). 456 = 667 폭에서 띠를 오른쪽 끝에 붙이면 왼쪽 손패 카드(레일 ~185px)를 비켜 서는 폭 (D-535) */
export const SUB_MIN_W = 456;
/** 띠 몸 · 그 밖으로 튀어나온 이름표 · 초상 홈 — 띠 왼쪽 위 기준 상대 사각형들 (겹침은 조각마다 잰다) */
const bandParts = (el: HTMLElement): DOMRect[] => {
  const o = layRect(el.getBoundingClientRect());
  return [el, ...el.querySelectorAll<HTMLElement>('.who, .dl-name, .talk-face, .dl-face')].map((e) => layRect(e.getBoundingClientRect())).filter((q) => q.width && q.height).map((q) => new DOMRect(q.left - o.left, q.top - o.top, q.width, q.height));
};
const overlap = (a: DOMRect, q: DOMRect): number => Math.max(0, Math.min(a.right, q.right) - Math.max(a.left, q.left)) * Math.max(0, Math.min(a.bottom, q.bottom) - Math.max(a.top, q.top));
/**
 * 띠 폭 맞춤 (D-535): 판 열 폭(좁으면 minW)에서 접힌 줄 수를 그대로 지키는 가장 좁은 폭 — 한 줄 말은 짧은 띠가 되어 비켜 설 자리가 넓어진다.
 * 다 찍힌 글이 들어 있을 때 부른다. 돌려준 폭을 placeSubAway의 w로 넘긴다.
 */
export const fitSubWidth = (el: HTMLElement, minW = 0): number => {
  placeSub(el, false, minW);
  const w0 = parseFloat(el.style.width);
  const h0 = el.offsetHeight;
  let lo = Math.min(w0, 200), hi = w0;
  while (hi - lo > 4) {
    const m = Math.round((lo + hi) / 2);
    el.style.width = `${m}px`;
    if (el.offsetHeight === h0) hi = m; else lo = m;
  }
  el.style.width = `${hi}px`;
  return hi;
};
/**
 * 부관 띠 자리 (D-535 — 전수 점검 D-534의 코치 띠 NEEDS REVISION): 짚은 곳(focus)이 판 열 아래 절반이면 판 열 위 끝, 위 절반이면 아래 끝.
 * 그 자리가 지킬 사각형(keep — 안내 막의 구멍 · 내 킹 칸 · 지금 고를 칸)과 겹치면 반대 끝, 그다음 두 끝 사이를 4px씩 훑어
 * 가장 가까운 빈 자리(가로는 판 열 가운데 → 화면 왼쪽 · 오른쪽 끝)에 선다. 빈 자리가 없으면 가장 덜 가리는 자리. 겹치지 않았으면 true.
 * w = fitSubWidth로 맞춘 폭 (없으면 placeSub 폭).
 */
export const placeSubAway = (el: HTMLElement, o: { focus: DOMRect | null; keep: DOMRect[]; minW?: number; w?: number }): boolean => {
  const r0 = subAnchor(), r = r0 && layRect(r0);
  const H = viewH();
  const W = viewW();
  o = { ...o, focus: o.focus && layRect(o.focus), keep: o.keep.map(layRect) };
  if (o.w) {
    el.style.width = `${o.w}px`;
    const cx = r ? r.left + r.width / 2 : W / 2;
    el.style.left = `${Math.round(Math.max(16, Math.min(W - o.w - 16, cx - o.w / 2)))}px`;
    el.style.top = '0px';
  } else placeSub(el, false, o.minW ?? 0);
  const left0 = parseFloat(el.style.left);
  const parts = bandParts(el);
  const bh = el.offsetHeight;
  // 이름표 · 초상 홈이 띠 몸 밖으로 튀어나온 만큼 — 화면 밖으로 잘리지 않게
  const up = -Math.min(0, ...parts.map((q) => q.top));
  const down = Math.max(bh, ...parts.map((q) => q.bottom)) - bh;
  const lx = -Math.min(0, ...parts.map((q) => q.left));
  const rx = Math.max(el.offsetWidth, ...parts.map((q) => q.right));
  const yMin = Math.max(0, Math.round((r ? r.top : 0) + up));
  const yMax = Math.max(yMin, Math.round(Math.min(H, r ? r.bottom : H) - down - bh));
  const mid = r ? r.top + r.height / 2 : H / 2;
  const f = o.focus;
  const pref = f && f.top + f.height / 2 > mid ? yMin : yMax;
  const xs = [...new Set([left0, 16 + lx, W - 16 - rx].map(Math.round))].filter((x) => x - lx >= 0 && x + rx <= W);
  const cost = (x: number, y: number): number => parts.reduce((a, p) => a + o.keep.reduce((s, k) => s + overlap(new DOMRect(x + p.x, y + p.y, p.width, p.height), k), 0), 0);
  const ys: number[] = [];
  for (let y = yMin; y < yMax; y += 4) ys.push(y);
  ys.push(yMax);
  let best = { x: left0, y: pref, c: Infinity, d: Infinity };
  for (const [xi, x] of xs.entries()) {
    for (const y of ys) {
      const c = cost(x, y);
      // 같은 겹침이면: 바라는 끝에 가깝게 · 가로는 판 열 가운데 먼저
      const d = Math.abs(y - pref) + xi * 40;
      if (c < best.c || (c === best.c && d < best.d)) best = { x, y, c, d };
    }
  }
  el.style.left = `${best.x}px`;
  el.style.top = `${best.y}px`;
  el.dataset.side = best.y + bh / 2 < mid ? 'top' : 'bottom';
  return best.c === 0;
};
/** 대사 띠 속 (이름표 · 초상 홈 · 줄) — 바크 · 자막 띠가 같은 틀 */
const bandHtml = (o: { face?: string; name: string; side: VoiceSide }): string =>
  `<b class="dl-name${o.side === 'foe' ? '' : ' n-ally'}">${o.name}</b><div class="dl-face">${o.face ?? ''}</div><p class="dl-line vs-line"></p>`;
/** 자막 띠 틀 — 부르는 쪽이 만든 요소에 넣는다 (코치 띠). 클래스는 subClass */
export const subHtml = (o: { face: string; who: string; side: VoiceSide }): string => bandHtml({ face: o.face, name: o.who, side: o.side });
export const subClass = (side: VoiceSide): string => `vsub dl-band dl-${side === 'ally' ? 'ally' : 'foe'}`;
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
  el.className = subClass(line.side);
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
  const innerWidth = viewW(), innerHeight = viewH();
  const pt = r && r.width ? { x: lay(r.left + r.width / 2), y: lay(r.top) } : lastPt ? { x: lay(lastPt.x), y: lay(lastPt.y) } : { x: innerWidth / 2, y: innerHeight / 2 };
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
