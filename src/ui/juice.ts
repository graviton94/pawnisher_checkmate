import { sfx } from '../audio/sfx';

/**
 * 쾌감 · 아픔 연출 (D-104): 좋은 일은 금빛으로 튀고 오르고, 나쁜 일은 붉게 흔들리고 떨어진다.
 * 원칙 (CLAUDE.md UI 6): 예비 동작 → 터짐 → 출렁임, 한 번 1초 이내, prefers-reduced-motion이면 흔들림·파편을 빼고 색만 짧게.
 * 화면은 게임 상태를 바꾸지 않는다 — 바뀐 상태를 보고 연출만 한다.
 */
export type Tone = 'good' | 'rare' | 'bad';

const calm = (): boolean => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

const COLOR: Record<Tone, string> = { good: '#FACC15', rare: '#C4B5FD', bad: '#F87171' };

/** 화면 가장자리가 번쩍 (금 = 대박, 붉음 = 아픔). strength 0~1 */
export const vignette = (tone: Tone, strength = 0.6): void => {
  const v = document.createElement('div');
  v.className = `juice-vignette ${tone}`;
  v.style.setProperty('--s', String(Math.max(0.15, Math.min(1, strength))));
  document.body.appendChild(v);
  window.setTimeout(() => v.remove(), 700);
};

/** 요소를 흔든다 (아픔) */
export const shake = (el: Element | null, power = 1): void => {
  if (!el || calm()) return;
  el.classList.remove('juice-shake');
  void (el as HTMLElement).offsetWidth;
  (el as HTMLElement).style.setProperty('--p', `${4 * power}px`);
  el.classList.add('juice-shake');
  window.setTimeout(() => el.classList.remove('juice-shake'), 450);
};

/** 요소가 통통 튄다 (쾌감) */
export const pop = (el: Element | null, tone: Tone = 'good'): void => {
  if (!el) return;
  el.classList.remove('juice-pop', 'good', 'rare', 'bad');
  void (el as HTMLElement).offsetWidth;
  el.classList.add('juice-pop', tone);
  window.setTimeout(() => el.classList.remove('juice-pop', tone), 650);
};

/** 요소 위로 글자가 떠오른다 (+30 · −40 · 걸작!) */
export const floatText = (el: Element | null, text: string, tone: Tone): void => {
  if (!el) return;
  const r = el.getBoundingClientRect();
  const f = document.createElement('div');
  f.className = `juice-float ${tone}`;
  f.textContent = text;
  f.style.left = `${r.left + r.width / 2}px`;
  f.style.top = `${r.top}px`;
  document.body.appendChild(f);
  window.setTimeout(() => f.remove(), 1000);
};

/** 도트 파편이 튄다 (좋은 일 = 위로 흩어짐, 나쁜 일 = 아래로 떨어짐) */
export const burst = (el: Element | null, tone: Tone, n = 14): void => {
  if (!el || calm()) return;
  const r = el.getBoundingClientRect();
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i');
    p.className = `juice-bit ${tone}`;
    const ang = tone === 'bad' ? Math.PI / 2 + (Math.random() - 0.5) * 1.6 : -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
    const dist = 30 + Math.random() * 50;
    p.style.left = `${r.left + r.width / 2}px`;
    p.style.top = `${r.top + r.height / 2}px`;
    p.style.setProperty('--dx', `${Math.cos(ang) * dist}px`);
    p.style.setProperty('--dy', `${Math.sin(ang) * dist}px`);
    p.style.background = COLOR[tone];
    document.body.appendChild(p);
    window.setTimeout(() => p.remove(), 800);
  }
};

/** 숫자가 굴러간다 (나사 count-up / down) */
export const countTo = (el: Element | null, from: number, to: number): void => {
  if (!el || from === to) return;
  if (calm()) {
    el.textContent = String(to);
    return;
  }
  const t0 = performance.now();
  const dur = Math.min(700, 200 + Math.abs(to - from) * 6);
  const step = (now: number) => {
    const k = Math.min(1, (now - t0) / dur);
    const e = 1 - (1 - k) ** 3; // 빠르게 → 느리게
    el.textContent = String(Math.round(from + (to - from) * e));
    if (k < 1) requestAnimationFrame(step);
  };
  el.textContent = String(from);
  requestAnimationFrame(step);
};

/** 도장이 쾅 찍힌다 (완수 · 걸작! · 손상!) */
export const stamp = (text: string, tone: Tone): void => {
  const s = document.createElement('div');
  s.className = `juice-stamp ${tone}`;
  s.textContent = text;
  document.body.appendChild(s);
  sfx('stamp');
  window.setTimeout(() => s.remove(), 1100);
};

/** 출하 상태의 변화 — runUi가 행동 전후를 비교해 넘긴다 */
export interface RunDelta {
  gold: number;
  deck: number;
  /** 새로 ★걸작이 된 개조 수 */
  awakened: number;
  /** 손상 단 증가 · 봉인 증가 */
  damaged: number;
  sealed: number;
  /** 새로 얻은 황금 부품 (D-112) */
  legend?: number;
}

/**
 * 출하 화면 연출: 나사 · 군단 · 개조 · 결함의 변화를 보고 쾌감/아픔을 준다. 큰 것 하나만 크게.
 */
export const runFeedback = (root: ParentNode, d: RunDelta, goldBefore: number): void => {
  const goldEl = root.querySelector('.bar .stat.screw');
  const goldNum = goldEl?.querySelector('b') ?? null;
  if (d.gold !== 0 && goldNum) countTo(goldNum, goldBefore, goldBefore + d.gold);
  if (d.damaged > 0 || d.sealed > 0 || d.deck < 0) {
    // 아픔: 붉은 가장자리 + 결함 표시 흔들림 + 도장
    sfx('hurt');
    vignette('bad', 0.5 + 0.2 * (d.damaged + d.sealed + (d.deck < 0 ? 1 : 0)));
    const bad = root.querySelector('.bar .stat.bad');
    shake(bad ?? goldEl, 1.4);
    burst(bad ?? goldEl, 'bad', 10);
    stamp(d.deck < 0 ? '손실!' : d.damaged > 0 ? '손상!' : '봉인!', 'bad');
    return;
  }
  if (d.legend) {
    // 황금 부품: 가장 큰 쾌감 — 금빛 가장자리 끝까지 + 파편 + 도장
    sfx('jackpot');
    vignette('good', 1);
    burst(root.querySelector('.bar .btn.army'), 'good', 24);
    stamp('황금!', 'good');
    return;
  }
  if (d.awakened > 0) {
    sfx('awaken');
    vignette('good', 0.8);
    stamp('걸작!', 'good');
    return;
  }
  if (d.gold < 0) {
    sfx(d.gold <= -30 ? 'loss' : 'spend');
    if (d.gold <= -30 && !d.deck) {
      floatText(goldEl, `${d.gold}`, 'bad');
      shake(goldEl, 0.8);
    }
    return;
  }
  if (d.gold >= 60) {
    sfx('jackpot');
    vignette('good', Math.min(1, d.gold / 120));
    burst(goldEl, 'good', 18);
    floatText(goldEl, `+${d.gold}`, 'good');
    pop(goldEl, 'good');
    return;
  }
  if (d.gold > 0) {
    sfx('coin');
    floatText(goldEl, `+${d.gold}`, 'good');
    pop(goldEl, 'good');
  }
  if (d.deck > 0) pop(root.querySelector('.bar .btn.army'), 'good');
};
