/**
 * 등급 빛 띠 (D-595 — D-585 CD-11 8장 계단 띠를 대신). 사용자 실기기: 「희귀 이상 카드 빛이 지나가는 효과도 프레임이 너무 구림」.
 * 옛 띠는 84×126 여덟 장을 166ms씩 넘겼다(약 6fps, 띠가 24칸씩 뛰었다). 이제 이어 붙인 띠 하나(tools/pixel/card_sweep.py)를
 * 카드 쇠 테 가면(.cf-sheen, card-f.css) 안에서 곡선(inOut)으로 옮긴다 — 움직임은 120Hz로 구운 기기 픽셀 정수 위치의
 * Web Animations라 합성기에서 화면 프레임마다 돈다(주 스레드가 바빠도 끊기지 않는다). 금 카드는 띠가 지나간 뒤 볏 불꽃 6장을
 * 장당 40ms(25fps)로 넘긴다. 게임 상태는 건드리지 않는다. 움직임 줄이기면 띠를 걸지 않는다(카드 밖에 머문다).
 */
import { calmMotion } from '../prefs/motion';
import { CARD_SHEEN } from '../data/motion';
import { ease, snapDev } from '../view/motion';

const SEL = '.cf:is(.cmd, .part-card, .crew-card):is(.g-rare, .g-gold)';
const live = new Set<HTMLElement>();
const started = new WeakMap<HTMLElement, { w: number; anims: Animation[] }>();
const dpr = (): number => window.devicePixelRatio || 1;

/** 띠 움직임 키프레임: 카드 폭 w · 띠 폭 bw (CSS px) — 왼쪽 밖 → 오른쪽 밖, 그 뒤 주기 끝까지 오른쪽 밖에 머문다 */
export const sweepFrames = (w: number, bw: number, r = dpr()): Keyframe[] => {
  const { periodMs: P, passMs: T, bakeHz } = CARD_SHEEN;
  const n = Math.max(2, Math.ceil((T / 1000) * bakeHz));
  const out: Keyframe[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = snapDev(-bw + (w + bw) * ease.inOut(t), r);
    out.push({ offset: (T * t) / P, transform: `translate3d(${x}px,0,0)`, easing: 'steps(1, end)' });
  }
  out.push({ offset: 1, transform: `translate3d(${snapDev(w, r)}px,0,0)` });
  return out;
};

/** 금 볏 불꽃 (::after 6장 줄): 띠가 다 지나간 순간부터 장당 sparkFrameMs */
const sparkFrames = (): Keyframe[] => {
  const { periodMs: P, passMs: T, sparkFrameMs: F, sparkFrames: N } = CARD_SHEEN;
  const out: Keyframe[] = [{ offset: 0, visibility: 'hidden', backgroundPosition: '0% 0', easing: 'steps(1, end)' }];
  for (let k = 0; k < N; k++) out.push({ offset: (T + k * F) / P, visibility: 'visible', backgroundPosition: `${(k * 100) / (N - 1)}% 0`, easing: 'steps(1, end)' });
  out.push({ offset: (T + N * F) / P, visibility: 'hidden', backgroundPosition: '0% 0', easing: 'steps(1, end)' });
  out.push({ offset: 1, visibility: 'hidden', backgroundPosition: '0% 0' });
  return out;
};

/** 줄 안 차례 (옛 CSS nth-child 어긋남과 같은 셈 — 셋마다 한 바퀴) */
const phaseOf = (card: HTMLElement): number => {
  const host = card.closest('.pick-item, .card-bare, .card-slot, .deck-grid > *') ?? card;
  const i = host.parentElement ? Array.prototype.indexOf.call(host.parentElement.children, host) : 0;
  return ((i + 1) % 3) * CARD_SHEEN.staggerMs;
};

const start = (card: HTMLElement, force = false): void => {
  if (!card.isConnected) return;
  const prev = started.get(card);
  if (!force && prev && prev.anims.every((a) => a.playState === 'running')) return;
  const w = card.offsetWidth;
  if (!w) return void later(card);
  const band = card.querySelector<HTMLElement>(':scope > .cf-sheen > i');
  if (!band) return;
  if (prev && Math.abs(prev.w - w) < 0.5 && prev.anims.every((a) => a.playState === 'running')) return;
  prev?.anims.forEach((a) => a.cancel());
  const bw = band.offsetWidth || w;
  const delay = -phaseOf(card);
  const anims: Animation[] = [band.animate(sweepFrames(w, bw), { duration: CARD_SHEEN.periodMs, iterations: Infinity, delay })];
  if (card.classList.contains('g-gold')) {
    try {
      anims.push(card.animate(sparkFrames(), { duration: CARD_SHEEN.periodMs, iterations: Infinity, delay, pseudoElement: '::after' }));
    } catch { /* ::after Web Animations가 없는 옛 브라우저 — 불꽃만 빠진다 */ }
  }
  // 띠 · 불꽃이 같은 시각에 시작하게
  const t0 = anims[0].startTime ?? document.timeline.currentTime;
  if (t0 !== null) anims.forEach((a) => (a.startTime = t0));
  started.set(card, { w, anims });
  live.add(card);
  if (live.size > 64) for (const c of [...live]) if (!c.isConnected) live.delete(c);
};

/**
 * 폭 재기는 다음 화면 프레임에 한꺼번에 (D-595 측정: 카드마다 붙자마자 offsetWidth를 읽어 화면을 지을 때 강제 배치가 카드 수만큼 겹쳤다).
 * 폭이 아직 0(숨은 창)이면 몇 번 더 미룬다.
 */
const queue = new Map<HTMLElement, number>();
let queued = false;
const later = (card: HTMLElement): void => {
  queue.set(card, (queue.get(card) ?? 0) + 1);
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    const list = [...queue];
    queue.clear();
    for (const [c, n] of list) {
      if (n > 20 || !c.isConnected) continue;
      if (!c.offsetWidth) queue.set(c, n);
      else start(c);
    }
    if (queue.size) later([...queue.keys()][0]);
  });
};

/** 카드 하나에 띠 겹을 달고 움직임을 건다 (이미 있으면 폭만 확인) */
const attach = (card: HTMLElement): void => {
  if (!card.querySelector(':scope > .cf-sheen')) {
    const s = document.createElement('i');
    s.className = 'cf-sheen';
    s.setAttribute('aria-hidden', 'true');
    s.appendChild(document.createElement('i'));
    card.appendChild(s);
  }
  if (calmMotion() || started.has(card)) return;
  later(card);
};

const scan = (root: ParentNode): void => {
  if (root instanceof HTMLElement && root.matches(SEL)) attach(root);
  root.querySelectorAll?.<HTMLElement>(SEL).forEach(attach);
};

/**
 * 등급 띠 장치를 한 번 설치한다 (main): 화면에 새로 붙는 희귀 · 금 카드마다 띠 겹을 달고 움직임을 건다.
 * 카드를 그리는 곳(명령 · 부품 · 분대원 · 시작 세트 · 부적 · 복제 비행 조각)이 여럿이라 그리는 쪽을 고치지 않고 여기서 받는다.
 */
export const installSheen = (): void => {
  if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') return;
  const mo = new MutationObserver((list) => {
    for (const m of list) m.addedNodes.forEach((n) => { if (n.nodeType === 1) scan(n as HTMLElement); });
  });
  // 등급은 카드를 그릴 때 정해진다 — 클래스 바뀜까지 지켜보면 연출 클래스마다 불려 비쌌다 (붙는 것만 본다)
  mo.observe(document.body, { childList: true, subtree: true });
  scan(document.body);
  window.addEventListener('resize', () => {
    for (const c of [...live]) {
      if (!c.isConnected) { live.delete(c); continue; }
      start(c, true);
    }
  });
};
