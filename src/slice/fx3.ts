/**
 * 화면 연출 3부 (D-189 · 타격감 연구소 21~24판에서 승인): 창 · 알림 · 적 생각 중 · 턴 배너 · 손패 뽑기/버리기 · 승패 K.O. ·
 * 도장 · 결과 집계 · 쓰러짐 막 · 도발 타자 · 연쇄 팝 · 구매/회복 · 카드 크게 보기 도트 쓸기.
 * 움직임은 예비 → 충격 → 넘침 → 출렁 곡선, 효과는 레트로 FX(색 갈림 · 속도선 · 섬광 · 빛줄기 · 반짝 띠). 게임 상태는 건드리지 않는다.
 */
import { sfx } from '../audio/sfx';
import { sparksAt } from './uifx';

const calm = (): boolean => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));
/** 클래스를 다시 걸어 CSS 애니메이션을 처음부터 */
export const replay = (el: Element, cls: string): void => {
  el.classList.remove(cls);
  void (el as HTMLElement).offsetWidth;
  el.classList.add(cls);
};
const centerOf = (el: Element) => {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
};
/** 화면 전체 흰 섬광 한 번 */
export const flashScreen = (a = 0.85): void => {
  if (calm()) return;
  const f = document.createElement('div');
  f.className = 'fx3-flash';
  f.style.setProperty('--a', String(a));
  document.body.appendChild(f);
  window.setTimeout(() => f.remove(), 260);
};
/**
 * 도트 퇴장 (D-193): 사라지는 것은 모두 4×4 체크무늬가 다섯 단계로 지워진다 — 투명 페이드 대신.
 * 끝나면 then (요소를 지우거나 숨기는 건 부른 쪽).
 */
export const pxOut = (el: HTMLElement | null, then?: () => void, ms = 240): void => {
  if (!el) return then?.();
  if (calm()) return then?.();
  el.style.setProperty('--pxms', `${ms}ms`);
  el.classList.remove('pxout');
  void el.offsetWidth;
  el.classList.add('pxout');
  window.setTimeout(() => {
    el.classList.remove('pxout');
    then?.();
  }, ms);
};
/** 흔들림 세 단계 (D-193): 약 4px/260ms · 중 7px/360ms · 강 12px/480ms — 판 밖은 모두 이것만 */
/** 판 밖 흔들림 (D-214: 절반으로) — 픽셀 진폭 · ms */
/** 화면 요소 흔들림 [px, ms] (2026-11-06: 세기를 줄였다 — 글 · 도장 · 전환이 다 떨려서 정신없었다) */
export const SHAKE = { 1: [1, 140], 2: [2, 180], 3: [4, 260] } as const;
export const shake = (el: HTMLElement | null, lv: 1 | 2 | 3 = 2): void => shakeEl(el, SHAKE[lv][0], SHAKE[lv][1]);
/**
 * 획득 비행 하나 (D-193): 위로 가속 → 착지 감속 → 도착점 눌림 + 불똥 셋. 카드 · 나사 · 구매가 모두 이 호를 탄다.
 * el은 fixed로 띄운 조각(불러 준 쪽이 만든다), spin = 나사처럼 돌기, tilt = 카드처럼 기울기.
 */
export const arcFly = (el: HTMLElement, from: { x: number; y: number }, to: { x: number; y: number }, opt: { spin?: boolean; delay?: number; ms?: number; end?: number; target?: Element | null; done?: () => void } = {}): void => {
  if (calm()) return void (el.remove(), opt.done?.());
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const r1 = opt.spin ? 'rotate(200deg) scale(1.15)' : 'rotate(12deg) scale(1.08)';
  const r2 = opt.spin ? `rotate(400deg) scale(${opt.end ?? 0.5})` : `rotate(18deg) scale(${opt.end ?? 0.2})`;
  const a = el.animate(
    [{ transform: 'translate(0,0)' }, { transform: `translate(${dx * 0.45}px,${dy * 0.45 - 56}px) ${r1}`, offset: 0.45, easing: 'cubic-bezier(.6,0,.9,.4)' }, { transform: `translate(${dx}px,${dy}px) ${r2}` }],
    { duration: opt.ms ?? 460, delay: opt.delay ?? 0, easing: 'cubic-bezier(.1,.9,.2,1)', fill: 'forwards' },
  );
  a.onfinish = () => {
    el.remove();
    sparksAt(to.x, to.y, 3, 16);
    if (opt.target) (opt.target as HTMLElement).animate?.([{ transform: 'scale(1.25,.8)' }, { transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.2,1.6,.35,1)' });
    opt.done?.();
  };
};

/** 감쇠 흔들림 (요소 하나) */
export const shakeEl = (el: HTMLElement | null, amp = 7, ms = 360): void => {
  if (!el || calm()) return;
  el.animate([{ transform: `translate(${-amp}px,${amp * 0.6}px)` }, { transform: `translate(${amp * 0.85}px,${-amp * 0.6}px)` }, { transform: `translate(${-amp * 0.55}px,${amp * 0.3}px)` }, { transform: `translate(${amp * 0.4}px,${-amp * 0.15}px)` }, { transform: 'none' }], { duration: ms, easing: 'cubic-bezier(.1,.9,.2,1)' });
};

// ---------- 1 창 ----------
/** 창이 위에서 떨어져 박히며 출렁 → 네 귀퉁이 리벳이 차례로 박힌다. 그늘은 체크무늬로 세 단계 */
export const modalIn = (overlay: HTMLElement, panel: HTMLElement): void => {
  overlay.querySelectorAll('.fx3-rv').forEach((x) => x.remove());
  overlay.classList.remove('m3off');
  panel.classList.remove('m3out', 'pop');
  if (calm()) return;
  replay(overlay, 'm3on');
  replay(panel, 'm3in');
  window.setTimeout(() => {
    if (!panel.classList.contains('m3in')) return;
    const r = panel.getBoundingClientRect();
    sparksAt(r.left + r.width / 2, r.bottom - 4, 6, 30);
  }, 190);
  const L = panel.offsetLeft, T = panel.offsetTop, W = panel.offsetWidth, H = panel.offsetHeight;
  // 리벳은 창 테두리 선 위에 (D-375 리뷰: 안쪽 4px에 박으면 받침 · 단추 위에 찍혔다)
  [[L - 2, T - 2], [L + W - 2, T - 2], [L - 2, T + H - 2], [L + W - 2, T + H - 2]].forEach(([x, y], i) => {
    const rv = document.createElement('i');
    rv.className = 'fx3-rv';
    rv.style.left = `${x}px`;
    rv.style.top = `${y}px`;
    rv.style.animationDelay = `${300 + i * 50}ms`;
    overlay.appendChild(rv);
  });
};
/** 창 닫기: 가로로 접혀 사라지고 그늘이 걷힘. 끝나면 done (다시 열리면 취소 — 열 때 m3out이 지워진다) */
export const modalOut = (overlay: HTMLElement, panel: HTMLElement, done: () => void): void => {
  overlay.querySelectorAll('.fx3-rv').forEach((x) => x.remove());
  if (calm()) return done();
  panel.classList.remove('m3in', 'pop');
  // 도트 퇴장 (D-193): 창은 체크무늬로 지워지고 그늘은 세 단계로 걷힌다. 사이에 다시 열리면 m3out이 지워져 취소된다
  panel.classList.add('m3out');
  overlay.classList.remove('m3on');
  replay(overlay, 'm3off');
  pxOut(panel, () => {
    if (!panel.classList.contains('m3out')) return;
    panel.classList.remove('m3out');
    overlay.classList.remove('m3off');
    done();
  }, 220);
};

// ---------- 2 알림 ----------
/** 알림: 위에서 떨어져 한 번 튀고 → 머문 뒤 → 아래부터 접혀 올라가며 사라짐 */
export const toastIn = (t: HTMLElement): void => {
  t.hidden = false;
  t.classList.remove('t3out', 'tin', 'pxout');
  if (!calm()) replay(t, 't3in');
};
export const toastOut = (t: HTMLElement): void => {
  if (calm() || t.hidden) return void (t.hidden = true);
  t.classList.remove('t3in');
  t.classList.add('t3out');
  pxOut(t, () => {
    if (t.classList.contains('t3out')) {
      t.hidden = true;
      t.classList.remove('t3out');
    }
  }, 200);
};

// ---------- 3 적이 생각 중 ----------
let lastTurnLabel = '';
/** 차례 표시: 적 차례면 경고등 · 철컥 도는 톱니 · 차례로 켜지는 점 셋. 글이 바뀔 때만 튀어 오른다 */
export const turnLabel = (el: HTMLElement, text: string, enemy: boolean): void => {
  const key = `${text}|${enemy}`;
  if (key === lastTurnLabel) return;
  lastTurnLabel = key;
  el.classList.toggle('enemy', enemy);
  el.innerHTML = enemy ? `<span class="th-lamp"></span><span class="th-cog"></span>${text}<span class="th-dots"><i></i><i></i><i></i></span>` : text;
  replay(el, 'th-pop');
};

// ---------- 4 턴 배너 ----------
/** 아케이드 「ROUND」식: 속도선 띠가 비스듬히 날아들어 출렁 멈추고 글자는 색이 갈라졌다 모이며 꽝 · 반짝 띠 → 반대쪽으로 비틀며 빠짐 */
export const turnBanner = (over: HTMLElement, text: string, foe: boolean, small = false): void => {
  if (calm()) return;
  document.querySelectorAll('.tb4').forEach((x) => x.remove());
  const r = over.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = `tb4${foe ? ' foe' : ''}${small ? ' sm' : ''}`;
  el.style.left = `${r.left}px`;
  el.style.top = `${r.top}px`;
  el.style.width = `${r.width}px`;
  el.style.height = `${r.height}px`;
  el.innerHTML = `<div class="band"></div><div class="glint"></div><div class="txt">${text}</div>`;
  document.body.appendChild(el);
  replay(el, 'run');
  window.setTimeout(() => {
    sfx(foe ? 'threat' : 'tap');
    shake(over, 1);
  }, 170);
  window.setTimeout(() => el.remove(), 1250);
};

// ---------- 5 손패 ----------
/** 남은 손패가 기울며 호를 그려 버림 더미로 빨려 든다 */
export const discardHand = async (hand: HTMLElement): Promise<void> => {
  const cards = [...hand.querySelectorAll<HTMLElement>('.hc')];
  if (!cards.length || calm()) return;
  const head = hand.querySelector('.hand-head') ?? hand;
  const to = head.getBoundingClientRect();
  cards.forEach((c, i) => {
    const r = c.getBoundingClientRect();
    const dx = to.right - 40 - (r.left + r.width / 2);
    const dy = to.top + to.height / 2 - (r.top + r.height / 2);
    c.animate([{ transform: 'none', opacity: 1 }, { transform: `translate(${dx / 2 + 30}px,${dy / 2 - 20}px) rotate(14deg)`, offset: 0.5 }, { transform: `translate(${dx}px,${dy}px) rotate(24deg) scale(0.3)`, opacity: 0 }], { duration: 320, delay: i * 55, easing: 'cubic-bezier(.6,0,.9,.4)', fill: 'forwards' });
  });
  await wait(320 + cards.length * 55);
  // 적 차례 동안 새 손패는 덮어 둔다 (내 차례에 한 장씩 들어온다)
  hand.classList.add('dealing');
};
/** 덱에서 뒷면 카드가 한 장씩 튀어나와 날아오며 뒤집혀 앞면 */
export const dealHand = (hand: HTMLElement): void => {
  hand.classList.remove('dealing');
  if (calm()) return;
  const deck = hand.querySelector('[data-deck]') ?? hand;
  const from = deck.getBoundingClientRect();
  hand.querySelectorAll<HTMLElement>('.hc').forEach((c, i) => {
    const r = c.getBoundingClientRect();
    const dx = from.left + from.width / 2 - (r.left + r.width / 2);
    const dy = from.top + from.height / 2 - (r.top + r.height / 2);
    c.animate([{ transform: `translate(${dx}px,${dy}px) rotate(-12deg) scale(0.4,0.5)`, filter: 'sepia(1) brightness(0.55)', opacity: 0 }, { opacity: 1, offset: 0.2 }, { transform: `translate(${dx / 2 + 40}px,${dy / 2}px) rotate(-5deg) scaleX(0.05)`, filter: 'sepia(1) brightness(0.55)', offset: 0.5 }, { transform: 'translateX(6px) scale(1.04,0.96)', filter: 'brightness(1.4)', offset: 0.82 }, { transform: 'none', filter: 'none' }], { duration: 400, delay: i * 90, easing: 'cubic-bezier(.2,.9,.3,1.15)', fill: 'backwards' });
    window.setTimeout(() => {
      const p = centerOf(c);
      sparksAt(p.x - p.w / 2 + 8, p.y, 3, 14);
    }, i * 90 + 330);
  });
};

// ---------- 7 승패 ----------
/** 격투게임 「K.O.」식 — 승리: 섬광 · 금빛 빛줄기 · 글자가 4배에서 색 갈린 채 내리꽂힘 · 반짝 띠 / 패배: 붉은 맥박 · 글자가 무겁게 떨어져 튐 */
export const koBanner = (text: string, good: boolean): Promise<void> =>
  new Promise((resolve) => {
    const el = document.createElement('div');
    el.className = `ko3 ${good ? 'win' : 'lose'}`;
    el.innerHTML = `<div class="rays"></div><div class="tint"></div><div class="koband"></div><div class="word">${text}</div>`;
    document.body.appendChild(el);
    sfx(good ? 'win' : 'lose');
    if (!calm()) replay(el, 'run');
    window.setTimeout(() => {
      if (good) flashScreen(0.85);
      shake(document.getElementById('app'), good ? 3 : 2);
      sparksAt(window.innerWidth / 2, window.innerHeight / 2 + (good ? 0 : 16), good ? 14 : 8, good ? 80 : 44);
    }, good ? 200 : 320);
    window.setTimeout(() => pxOut(el, () => {
      el.remove();
      resolve();
    }), calm() ? 900 : 1260);
  });

// ---------- 8 도장 ----------
/** 도장: 비틀린 채 크게 떠 있다 내리꽂혀 눌리고 → 섬광 · 흔들림 · 잉크 도트가 바깥에서 날아와 박힘 */
export const stampFx = (s: HTMLElement): void => {
  if (calm()) return;
  s.classList.add('st3');
  window.setTimeout(() => {
    flashScreen(0.5);
    shake(s.closest<HTMLElement>('.panel'), 2);
    sfx('stamp');
    const p = centerOf(s);
    for (let i = 0; i < 14; i++) {
      const d = document.createElement('i');
      d.className = 'fx3-ink';
      const a = Math.random() * Math.PI * 2;
      const r = p.w * 0.45 + Math.random() * 26;
      d.style.left = `${p.x + Math.cos(a) * r}px`;
      d.style.top = `${p.y + Math.sin(a) * r * 0.45}px`;
      d.style.setProperty('--ix', `${-Math.cos(a) * 40}px`);
      d.style.setProperty('--iy', `${-Math.sin(a) * 20}px`);
      document.body.appendChild(d);
      d.animate([{ opacity: 1 }, { opacity: 1, offset: 0.6 }, { opacity: 0 }], { duration: 900, fill: 'forwards' });
      window.setTimeout(() => d.remove(), 900);
    }
  }, 150);
};

// ---------- 9 결과 집계 ----------
/**
 * 숫자 굴려 내리기 (D-402 — 사건 창 나사 꼬리표, 알고 치른 값): 예비(꼬리표가 움찔 눌림) → 숫자가 계단으로 굴러감
 * (처음 크게 · 끝에서 잘게 — 지수형, 칸마다 째깍) → 터짐(마지막 숫자 번쩍 · 꼬리표 튐) → 출렁. 투명도 보간 · 선형 미끄럼 없음.
 * num = 숫자 칸(b), host = 흔들 물건(꼬리표). 줄인 움직임이면 바로 마지막 값.
 */
export const rollNumber = async (num: HTMLElement, from: number, to: number, host: HTMLElement = num): Promise<void> => {
  const nap = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));
  if (calm() || from === to) { num.textContent = String(to); return; }
  replay(host, 'roll-pre');
  sfx('lift', 6);
  await nap(170);
  const n = Math.min(9, Math.abs(from - to));
  for (let k = 1; k <= n; k++) {
    // 지수형: 앞 칸은 크게 · 뒤 칸은 잘게, 사이는 점점 길게 (빠르게 → 느리게)
    num.textContent = String(Math.round(from + (to - from) * (1 - Math.pow(1 - k / n, 3))));
    replay(num, 'tick');
    if (k % 2) sfx('coin', 3 + k);
    await nap(34 + k * 9);
  }
  num.textContent = String(to);
  host.classList.remove('roll-pre');
  replay(host, 'roll-hit');
  sfx('stamp', 4);
  await nap(380);
};
/** 줄이 하나씩 밀려 들어오고 숫자가 째깍째깍 올라간 뒤 → 등급 도장 */
export const tally = (box: HTMLElement, stamp?: HTMLElement | null): void => {
  const rows = [...box.querySelectorAll<HTMLElement>('div')];
  if (calm()) return void rows.forEach((r) => r.classList.add('in'));
  stamp?.classList.add('st3-wait');
  let t = 200;
  for (const r of rows) {
    const b = r.querySelector('b');
    const v = Number(b?.dataset.v ?? 0);
    if (b) b.textContent = '0';
    window.setTimeout(() => replay(r, 'in'), t);
    const steps = Math.min(10, v);
    for (let k = 1; k <= steps; k++)
      window.setTimeout(() => {
        if (!b) return;
        b.textContent = String(Math.round((v * k) / steps));
        replay(b, 'tick');
        if (k % 2) sfx('coin', 4 + k);
      }, t + 120 + k * 50);
    t += 120 + steps * 50 + 90;
  }
  if (stamp)
    window.setTimeout(() => {
      stamp.classList.remove('st3-wait');
      stampFx(stamp);
    }, t + 80);
};

// ---------- 10 쓰러짐 막 · 11 도발 ----------
/** 찍는 중인 줄 — 같은 자리에 새 줄이 오면 옛 줄은 멈추고, 누르면(typeSkip) 바로 끝까지 */
const typing = new WeakMap<HTMLElement, () => void>();
/** 문장 부호 뒤 쉼 (D-403 타자기): 끝 부호 ×6 · 쉼표 · 가운뎃점 ×3 */
const typePause = (ch: string): number => (/[.!?…]/.test(ch) ? 6 : /[,·]/.test(ch) ? 3 : 1);
/** 찍는 중인 줄을 한 번에 끝낸다 (탭) — 찍는 중이었으면 true */
export const typeSkip = (el: HTMLElement): boolean => {
  const f = typing.get(el);
  if (!f) return false;
  f();
  return true;
};
/** 한 자씩 찍는다 (문장 부호에서 쉰다). <em>낱말</em>은 한 번에 찍히며 떨린다. 같은 자리에 다시 부르면 앞 줄은 그 자리에서 끝난다 */
export const typeIn = (el: HTMLElement, html: string, speed = 32, onWord?: () => void, alive?: () => boolean): Promise<void> =>
  new Promise((done) => {
    typing.get(el)?.();
    if (calm()) {
      el.innerHTML = html;
      return done();
    }
    const parts = html.split(/(<em>.*?<\/em>)/);
    el.innerHTML = '';
    let i = 0;
    let j = 0;
    let t = 0;
    let over = false;
    const end = (full: boolean): void => {
      if (over) return;
      over = true;
      window.clearTimeout(t);
      if (typing.get(el) === stop) typing.delete(el);
      if (full) el.innerHTML = html;
      done();
    };
    // 누름 = 끝까지 한 번에 · 새 줄이 덮음 = 거기서 멈춤 (새 줄이 innerHTML을 갈아 쓴다)
    const stop = (): void => end(true);
    typing.set(el, stop);
    const tick = (): void => {
      if (over) return;
      // 찍던 화면이 바뀌면(탭으로 건너뜀 등) 거기서 멈춘다
      if (i >= parts.length || (alive && !alive())) return end(false);
      const p = parts[i];
      if (p.startsWith('<em>')) {
        const em = document.createElement('em');
        em.textContent = p.slice(4, -5);
        el.appendChild(em);
        replay(em, 'wshake');
        onWord?.();
        i++;
        j = 0;
        t = window.setTimeout(tick, speed * 3);
        return;
      }
      if (j < p.length) {
        const ch = p[j++];
        el.appendChild(document.createTextNode(ch));
        t = window.setTimeout(tick, speed * (j < p.length || i < parts.length - 1 ? typePause(ch) : 1));
        return;
      }
      i++;
      j = 0;
      tick();
    };
    tick();
  });
/** 검은 막이 위에서 한 줄씩 계단으로 내려온다 (8줄) */
export const curtainRows = (host: HTMLElement): void => {
  host.insertAdjacentHTML('afterbegin', Array.from({ length: 8 }, (_, i) => `<span class="dc-row" style="top:${i * 12.5}%;animation-delay:${i * 22}ms;--r:${7 - i}"></span>`).join(''));
};

// ---------- 15 구매 · 회복 ----------
const ring = (x: number, y: number, size: number, green = false): void => {
  const r = document.createElement('i');
  r.className = `fx3-ring${green ? ' g' : ''}`;
  r.style.left = `${x}px`;
  r.style.top = `${y}px`;
  r.style.width = r.style.height = `${size}px`;
  document.body.appendChild(r);
  window.setTimeout(() => r.remove(), 560);
};
const badge = (x: number, y: number, text: string, green = false): void => {
  const b = document.createElement('span');
  b.className = `fx3-badge${green ? ' g' : ''}`;
  b.textContent = text;
  b.style.left = `${x}px`;
  b.style.top = `${y}px`;
  document.body.appendChild(b);
  window.setTimeout(() => b.remove(), 950);
};
/** 구매: 나사들이 잔상을 끌며 호를 그려 물건에 꽂히고 → 물건이 눌렸다 튀어 오르며 반짝 띠 · 금빛 고리 · 「구입」 딱지 */
export const buyFx = (item: HTMLElement | null, from: Element | null): void => {
  if (!item || calm()) return;
  const b = centerOf(item);
  const a = from ? centerOf(from) : { x: b.x, y: b.y - 80 };
  const screw = getComputedStyle(document.documentElement).getPropertyValue('--screw');
  for (let i = 0; i < 5; i++) {
    const c = document.createElement('i');
    c.className = 'fx3-coin';
    c.style.backgroundImage = screw;
    c.style.left = `${a.x}px`;
    c.style.top = `${a.y}px`;
    document.body.appendChild(c);
    arcFly(c, a, b, { spin: true, delay: i * 60, target: i === 4 ? item : null });
  }
  window.setTimeout(() => {
    replay(item, 'got3');
    ring(b.x, b.y, Math.min(b.w, 120));
    badge(b.x, b.y - b.h / 2 - 6, '구입');
    sparksAt(b.x, b.y, 10, 40);
    sfx('coin', 7);
  }, 520);
};
/** 회복: 대상이 밝게 번쩍 · 초록 고리 둘 · 십자 반짝이가 떠오름 · 「+N」 딱지 */
export const healFx = (el: HTMLElement | null, text: string): void => {
  if (!el || calm()) return;
  const c = centerOf(el);
  replay(el, 'heal3');
  [0, 160].forEach((d) => window.setTimeout(() => ring(c.x, c.y, Math.min(c.w, 110), true), d));
  for (let i = 0; i < 7; i++)
    window.setTimeout(() => {
      const pl = document.createElement('i');
      pl.className = 'fx3-plus';
      pl.style.left = `${c.x - 24 + Math.random() * 48}px`;
      pl.style.top = `${c.y + 6}px`;
      document.body.appendChild(pl);
      pl.animate([{ transform: 'translateY(0) scale(.4)', opacity: 1 }, { transform: 'translateY(-26px) scale(1.3)', opacity: 1, offset: 0.4 }, { transform: 'translateY(-44px) scale(.6)', opacity: 0 }], { duration: 700, easing: 'cubic-bezier(.1,.9,.2,1)', fill: 'forwards' });
      window.setTimeout(() => pl.remove(), 700);
    }, i * 70);
  badge(c.x, c.y - c.h / 2 - 6, text, true);
  sfx('rare');
};

// ---------- 16 카드 크게 보기 ----------
/** 도트 쓸기: show면 아래 → 위로 칸이 생기며 드러남(앞줄 불똥), 아니면 위 → 아래로 지워진 뒤 then */
export const sweep = (el: HTMLElement, show: boolean, then?: () => void, ms = 300): void => {
  if (calm()) {
    el.style.visibility = show ? 'visible' : 'hidden';
    return then?.();
  }
  const cols = 10;
  const rows = 14;
  const r = el.getBoundingClientRect();
  const bw = r.width / cols;
  const bh = r.height / rows;
  const th: number[] = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) th.push(((show ? rows - 1 - j : j) / rows) * 0.82 + Math.random() * 0.18);
  const mask = document.createElement('canvas');
  mask.width = cols;
  mask.height = rows;
  const mc = mask.getContext('2d')!;
  const fired = new Set<number>();
  const t0 = performance.now();
  el.style.visibility = 'visible';
  el.style.setProperty('mask-size', '100% 100%');
  el.style.setProperty('-webkit-mask-size', '100% 100%');
  const step = (now: number): void => {
    const k = Math.min(1, (now - t0) / ms);
    const e = 1 - (1 - k) ** 2;
    mc.clearRect(0, 0, cols, rows);
    mc.fillStyle = '#000';
    th.forEach((v, idx) => {
      if (show ? e >= v : e < v) mc.fillRect(idx % cols, (idx / cols) | 0, 1, 1);
      if (e >= v && !fired.has(idx)) {
        fired.add(idx);
        if (idx % 4 === 0) {
          const s = document.createElement('i');
          s.className = 'spk';
          s.style.background = show ? '#fff3b0' : '#8a8794';
          s.style.left = `${r.left + (idx % cols) * bw + bw / 2}px`;
          s.style.top = `${r.top + ((idx / cols) | 0) * bh + bh / 2}px`;
          s.style.setProperty('--x', `${(Math.random() - 0.5) * 12}px`);
          s.style.setProperty('--y', `${show ? -14 : 14}px`);
          s.style.setProperty('--d', '360ms');
          document.body.appendChild(s);
          window.setTimeout(() => s.remove(), 380);
        }
      }
    });
    const url = `url(${mask.toDataURL()})`;
    el.style.setProperty('mask-image', url);
    el.style.setProperty('-webkit-mask-image', url);
    if (k < 1) return void requestAnimationFrame(step);
    if (show) {
      el.style.removeProperty('mask-image');
      el.style.removeProperty('-webkit-mask-image');
    } else el.style.visibility = 'hidden';
    then?.();
  };
  requestAnimationFrame(step);
};

/**
 * 보상 등급 드러내기 (D-216): 카드가 깔린 뒤 차례로 — 희귀는 청강 불똥 · 딸깍, 황금은 화면 전체 금빛 디더 번쩍(체크무늬 다섯 단계로 들어왔다 빠짐) ·
 * 큰 불똥 · 카드 들썩(예비 눌림 → 튀어 오름 → 출렁) · RF-02 귀퉁이 반짝임 한 번(그 뒤 RF-01 꺾쇠가 쉰다). 페이드 · 그라데이션 없이 도트 단계로만.
 */
/** 등급 반짝임 (RF-02): 8프레임 띠를 카드 네 귀퉁이 조각으로 한 번 돌리고 지운다 — 도는 동안은 쉬는 꺾쇠를 숨긴다 */
const glint = (c: HTMLElement, g: string): void => {
  c.querySelector(':scope > .glint')?.remove();
  const el = document.createElement('i');
  el.className = `glint glint-${g}`;
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = '<i></i><i></i><i></i><i></i>';
  c.classList.add('glinting');
  c.appendChild(el);
  const done = (): void => { el.remove(); c.classList.remove('glinting'); };
  el.firstElementChild!.addEventListener('animationend', done, { once: true });
  window.setTimeout(done, 1200); // 화면 밖 · 탭 숨김으로 animationend가 안 올 때
};

export const gradeReveal = (cards: HTMLElement[]): void => {
  cards.forEach((c, i) => {
    const g = c.dataset.grade;
    if (!g || g === 'common') return;
    // 쉬는 동안은 받은 꺾쇠(RF-01)만 네 귀퉁이에 — CSS ::before. 움직임 줄이기면 반짝임 없이 그 한 프레임
    if (calm()) return;
    window.setTimeout(() => {
      if (!c.isConnected) return;
      const r = centerOf(c);
      replay(c, 'g-pop');
      glint(c, g);
      if (g === 'gold') {
        const f = document.createElement('div');
        f.className = 'fx3-gold';
        document.body.appendChild(f);
        window.setTimeout(() => f.remove(), 420);
        sparksAt(r.x, r.y, 16, 80, ['#fff4d6', '#f4d27a', '#c89b3c', '#ffffff']);
        sfx('rare');
      } else {
        sparksAt(r.x, r.y, 8, 44, ['#ffffff', '#9ec7ef', '#3f7fb8']);
        sfx('coin', 8);
      }
    }, 320 + i * 160);
  });
};

/**
 * 도트 애니메이션 장치 (D-216 6): 코드로 거는 Web Animations의 투명도 보간을 디더 마스크 단계로 바꾼다 — 단순 페이드 금지.
 * 이미 마스크로 모양을 내는 요소(아이콘 · 로고)는 그대로 둔다. main에서 한 번 부른다.
 */
export const installPixelAnimate = (): void => {
  const lv = (v: number) => `var(--px${v >= 0.9 ? 0 : v >= 0.65 ? 1 : v >= 0.4 ? 2 : v >= 0.12 ? 3 : 4})`;
  const orig = Element.prototype.animate;
  Element.prototype.animate = function (this: Element, kf: Keyframe[] | PropertyIndexedKeyframes | null, opts?: number | KeyframeAnimationOptions) {
    if (Array.isArray(kf) && kf.some((f) => f.opacity !== undefined) && getComputedStyle(this).maskImage === 'none') {
      let last = 1;
      kf = kf.map((f) => {
        if (f.opacity === undefined) return { ...f, maskImage: lv(last), webkitMaskImage: lv(last) } as Keyframe;
        last = Number(f.opacity);
        const { opacity: _o, ...rest } = f;
        return { ...rest, maskImage: lv(last), webkitMaskImage: lv(last) } as Keyframe;
      });
    }
    return orig.call(this, kf, opts);
  } as typeof Element.prototype.animate;
};
