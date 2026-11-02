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
export const SHAKE = { 1: [4, 260], 2: [7, 360], 3: [12, 480] } as const;
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
  [[L + 5, T + 5], [L + W - 9, T + 5], [L + 5, T + H - 10], [L + W - 9, T + H - 10]].forEach(([x, y], i) => {
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
/** 아케이드 「ROUND」식: 속도선 띠가 비스듬히 날아들어 출렁 멈추고, 글자는 색이 갈라졌다 모이며 꽝 · 반짝 띠 → 반대쪽으로 비틀며 빠짐 */
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
  const cards = [...hand.querySelectorAll<HTMLElement>('.cmd')];
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
  hand.querySelectorAll<HTMLElement>('.cmd').forEach((c, i) => {
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
/** 한 자씩 찍는다. <em>낱말</em>은 한 번에 찍히며 떨린다 */
export const typeIn = (el: HTMLElement, html: string, speed = 32, onWord?: () => void, alive?: () => boolean): Promise<void> =>
  new Promise((done) => {
    if (calm()) {
      el.innerHTML = html;
      return done();
    }
    const parts = html.split(/(<em>.*?<\/em>)/);
    el.innerHTML = '';
    let i = 0;
    let j = 0;
    const tick = (): void => {
      // 찍던 화면이 바뀌면(탭으로 건너뜀 등) 거기서 멈춘다
      if (i >= parts.length || (alive && !alive())) return done();
      const p = parts[i];
      if (p.startsWith('<em>')) {
        const em = document.createElement('em');
        em.textContent = p.slice(4, -5);
        el.appendChild(em);
        replay(em, 'wshake');
        onWord?.();
        i++;
        j = 0;
        return void window.setTimeout(tick, speed * 3);
      }
      if (j < p.length) {
        el.appendChild(document.createTextNode(p[j++]));
        return void window.setTimeout(tick, speed);
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
