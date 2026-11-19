/**
 * 매끈한 도트 움직임 (D-554 — D-216 · D-538을 고친다). 소유자: 「인트로 · 그림 바뀜 · 모든 전환이 뚝뚝 끊긴다」.
 * 부드러움은 섞기(투명도 · 그라데이션)가 아니라 **프레임 수와 곡선**에서 온다:
 *  - 움직임: 화면 프레임마다 돌리고 위치는 기기 픽셀 정수로 맞춘다(`snapDev`) — 도트가 번지지 않으면서 60fps.
 *  - 나타남 · 사라짐: 8×8 베이어 디더를 프레임마다 한 단씩(64단) 곡선으로 넘긴다(`ditherTo`) — 칸 = 게임 도트(--px).
 *  - CSS 키프레임 움직임은 시작할 때 120Hz로 구워 기기 픽셀 정수 행렬로 다시 돌린다(`installSmoothMotion`) —
 *    계단(steps)으로 짠 옛 키프레임도 매끈해진다. 일부러 정지 동작(도장 · 톱니 · 흔들림)은 이름으로 빼 둔다(SMOOTH.hold).
 * 게임 상태는 건드리지 않는다 (UI 원칙 9). 움직임 줄이기면 모두 바로 끝 상태로.
 */
import { calmMotion } from '../prefs/motion';
import { SMOOTH } from '../data/motion';

const dprNow = (): number => (typeof window !== 'undefined' && window.devicePixelRatio) || 1;

// ---------- 곡선 ----------
/** 곡선 (0 → 1). 선형 등속은 쓰지 않는다 */
export const ease = {
  /** 터짐 → 감속 (빠르게 → 느리게) */
  out: (t: number): number => 1 - Math.pow(1 - t, 3),
  /** 모으기 → 터짐 (느리게 → 빠르게) */
  in: (t: number): number => t * t * t,
  /** 모으기 → 터짐 → 감속 */
  inOut: (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  /** 지수 감속 (철문 · 카드가 「쾅」 하고 선다) */
  outExpo: (t: number): number => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  /** 넘쳤다가 출렁 (착지) */
  outBack: (t: number, s = 1.4): number => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
  /**
   * 예비 → 터짐 → 출렁 (D-180 박자): 처음 a만큼 반대로 물러섰다가, 빠르게 대부분을 가고, o만큼 넘쳤다 선다.
   * 연속 곡선이라 어느 프레임 수에서도 계단이 생기지 않는다.
   */
  abs: (t: number, a = 0.08, o = 0.05): number => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    const p1 = 0.18, p3 = 0.72;
    if (t < p1) return -a * Math.sin((Math.PI / 2) * (t / p1));
    if (t < p3) {
      const u = (t - p1) / (p3 - p1);
      // -a → 1 + o (터짐: 처음 빠르게, 끝 느리게)
      return -a + (1 + o + a) * (1 - Math.pow(1 - u, 3));
    }
    const u = (t - p3) / (1 - p3);
    // 1 + o → 1 감쇠 출렁 (한 번 아래로 살짝)
    return 1 + o * Math.pow(1 - u, 2) * Math.cos(1.5 * Math.PI * u);
  },
} as const;
export type Ease = (t: number) => number;

// ---------- 정수 기기 픽셀 ----------
/** CSS px 값을 기기 픽셀 정수 위치로 */
export const snapDev = (v: number, r = dprNow()): number => Math.round(v * r) / r;

// ---------- 프레임 시계 ----------
/**
 * 프레임마다 frame(e, t)를 부른다 (t = 0~1 시간, e = 곡선 값). ms 동안, 화면 프레임 수 그대로(60fps면 60번/초).
 * alive()가 false가 되면 그 자리에서 멈춘다. 움직임 줄이기면 끝 프레임 하나만.
 */
export const tween = (ms: number, frame: (e: number, t: number) => void, curve: Ease = ease.inOut, alive: () => boolean = () => true): Promise<void> =>
  new Promise((done) => {
    if (calmMotion() || ms <= 0 || typeof requestAnimationFrame === 'undefined') {
      frame(curve(1), 1);
      return done();
    }
    let t0 = -1;
    const step = (now: number): void => {
      if (!alive()) return done();
      if (t0 < 0) t0 = now;
      const t = Math.min(1, (now - t0) / ms);
      frame(curve(t), t);
      if (t < 1) requestAnimationFrame(step);
      else done();
    };
    requestAnimationFrame(step);
  });

/**
 * 합성기에서 도는 곡선 움직임 (D-595): frame(t)가 돌려준 transform을 120Hz로 표본 내(steps(1)로 붙들어 소수 위치를 지나지 않게)
 * Web Animations 한 개로 건다 — 주 스레드가 새 화면을 짓느라 바빠도(전투 시작 · 판 캔버스 준비) 화면 프레임마다 움직인다.
 * frame은 정수 기기 픽셀 위치(snapDev)로 transform 글을 돌려준다. 움직임 줄이기면 끝 모습만. fill forwards — 끝나면 부른 쪽이 정리.
 */
export const compTween = (el: HTMLElement, ms: number, frame: (t: number) => string): Promise<void> => {
  if (calmMotion() || ms <= 0 || typeof el.animate !== 'function') {
    el.style.transform = frame(1);
    return Promise.resolve();
  }
  const n = Math.max(2, Math.ceil(ms / SMOOTH.bakeStep));
  const kf: Keyframe[] = [];
  for (let i = 0; i <= n; i++) kf.push({ offset: i / n, transform: frame(i / n), easing: 'steps(1, end)' });
  el.style.transform = frame(1);
  baking = true;
  let a: Animation;
  try {
    a = el.animate(kf, { duration: ms, fill: 'backwards' });
  } finally {
    baking = false;
  }
  return a.finished.then(() => undefined, () => undefined);
};

// ---------- 8×8 베이어 디더 ----------
/** 8×8 베이어 순서 (0 ~ 63) */
const B8: number[] = (() => {
  const m: number[] = new Array(64);
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++) {
      // 비트 뒤섞기 (표준 재귀 베이어)
      let v = 0;
      for (let bit = 2, xs = x, ys = y; bit >= 0; bit--) {
        const xb = (xs >> bit) & 1, yb = (ys >> bit) & 1;
        v = (v << 2) | ((xb ^ yb) << 1) | yb;
      }
      m[y * 8 + x] = v;
    }
  return m;
})();
/** 8×8 베이어 문턱 (0 ~ 63) */
export const bayer8 = (x: number, y: number): number => B8[(y & 7) * 8 + (x & 7)];
/** 보이는 정도 v(0~1) → 64단 중 몇 칸 (반올림) */
export const ditherLevel = (v: number, levels: number = SMOOTH.levels): number => Math.max(0, Math.min(levels, Math.round(v * levels)));

/** 디더 가면 SVG (보이는 칸 = 불투명). level = 0 ~ 64 보이는 칸 수, dot = 칸 하나의 CSS px */
export const ditherSvg = (level: number, dot: number): string => {
  const w = +(dot * 8).toFixed(4);
  let rects = '';
  if (level >= 64) rects = `<rect width='8' height='8'/>`;
  else for (let i = 0; i < 64; i++) if (B8[i] < level) rects += `<rect x='${i % 8}' y='${i >> 3}' width='1' height='1'/>`;
  return `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${w}' viewBox='0 0 8 8' shape-rendering='crispEdges'>${rects}</svg>`;
};
const svgUrl = (svg: string): string => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
/** 디더 칸 하나 = 장치 층 도트 (pxsnap.ts의 --px와 같은 셈: round(2·DPR) 기기 픽셀) */
export const dotCss = (r = dprNow()): number => Math.max(1, Math.round(2 * r)) / r;

let maskDot = 0;
let masks: string[] = [];
/** 64단 디더 가면 url 목록 (DPR이 바뀌면 다시 굽는다) */
export const ditherMasks = (): string[] => {
  const d = dotCss();
  if (d !== maskDot) {
    maskDot = d;
    masks = Array.from({ length: SMOOTH.levels + 1 }, (_, k) => svgUrl(ditherSvg(k, d)));
  }
  return masks;
};
/**
 * CSS 변수 --dq0 ~ --dq16 (16단 디더 가면, 칸 = 게임 도트) · --dk0 ~ --dk16 (먹 막 디더 배경) 을 <html>에 건다.
 * CSS 키프레임 디더(tools/dither-css.cjs가 펼친 것)와 ditherKeyframes가 이 변수를 쓴다. pxsnap.ts가 DPR이 바뀔 때마다 부른다.
 */
export const installDitherVars = (): void => {
  if (typeof document === 'undefined') return;
  const d = dotCss();
  const root = document.documentElement.style;
  const n = SMOOTH.cssLevels;
  for (let k = 0; k <= n; k++) {
    root.setProperty(`--dq${k}`, svgUrl(ditherSvg(Math.round((k * 64) / n), d)));
    // 먹 막: 보이는 칸에 먹 (#060509) — 모달 뒤 막 · 장면 막
    const svg = ditherSvg(Math.round((k * 64) / n), d).replace('<svg ', "<svg fill='%23060509' ").replace(/%23/g, '#');
    root.setProperty(`--dk${k}`, svgUrl(svg));
  }
};

const setMask = (el: HTMLElement, url: string | null): void => {
  if (url === null) {
    el.style.removeProperty('-webkit-mask-image');
    el.style.removeProperty('mask-image');
    el.style.removeProperty('-webkit-mask-size');
    el.style.removeProperty('mask-size');
    el.style.removeProperty('-webkit-mask-repeat');
    el.style.removeProperty('mask-repeat');
    return;
  }
  el.style.setProperty('-webkit-mask-image', url);
  el.style.setProperty('mask-image', url);
  el.style.setProperty('-webkit-mask-size', 'auto');
  el.style.setProperty('mask-size', 'auto');
  el.style.setProperty('-webkit-mask-repeat', 'repeat');
  el.style.setProperty('mask-repeat', 'repeat');
};

const fades = new WeakMap<HTMLElement, number>();
/**
 * 디더로 나타나기 · 사라지기 (64단, 프레임마다 한 단씩 곡선으로). from · to = 보이는 정도 0~1.
 * 끝나면 to가 1이면 가면을 지우고, 0이면 다 지운 가면을 남긴다(부른 쪽이 지우거나 숨긴다 — keep=false면 가면도 지움).
 * 같은 요소에 다시 걸면 앞의 것은 멈춘다.
 */
export const ditherTo = (el: HTMLElement, from: number, to: number, ms: number, curve: Ease = ease.inOut, keep = true): Promise<void> => {
  const my = (fades.get(el) ?? 0) + 1;
  fades.set(el, my);
  const list = ditherMasks();
  let last = -1;
  return tween(ms, (e) => {
    const lv = ditherLevel(from + (to - from) * e);
    if (lv === last) return;
    last = lv;
    setMask(el, lv >= SMOOTH.levels ? null : list[lv]);
  }, curve, () => fades.get(el) === my && el.isConnected).then(() => {
    if (fades.get(el) !== my) return;
    if (to >= 1 || !keep) setMask(el, null);
  });
};
/** 디더 가면을 지운다 (멈춘 퇴장을 되돌릴 때) */
export const clearDither = (el: HTMLElement): void => {
  fades.set(el, (fades.get(el) ?? 0) + 1);
  setMask(el, null);
};

// ---------- 정수 위치로 굽기 ----------
/** 움직임 속성만 (구워서 정수 행렬로 바꾼다) */
const MOTION_PROPS = ['transform', 'translate', 'scale', 'rotate'] as const;
const isMotion = (k: string): boolean => (MOTION_PROPS as readonly string[]).includes(k);

/** 계산된 움직임 네 속성을 행렬 하나로 (CSS 순서: translate → rotate → scale → transform) */
const composed = (el: HTMLElement): DOMMatrix => {
  const cs = getComputedStyle(el);
  const m = new DOMMatrix();
  const tr = cs.translate;
  if (tr && tr !== 'none') {
    const [x = '0px', y = '0px'] = tr.split(/\s+/);
    const px = (v: string, size: number) => (v.endsWith('%') ? (parseFloat(v) / 100) * size : parseFloat(v) || 0);
    m.translateSelf(px(x, el.offsetWidth), px(y, el.offsetHeight));
  }
  const ro = cs.rotate;
  if (ro && ro !== 'none') {
    const deg = /deg$/.test(ro) ? parseFloat(ro) : /turn$/.test(ro) ? parseFloat(ro) * 360 : /rad$/.test(ro) ? (parseFloat(ro) * 180) / Math.PI : parseFloat(ro);
    if (Number.isFinite(deg)) m.rotateSelf(deg);
  }
  const sc = cs.scale;
  if (sc && sc !== 'none') {
    const [sx, sy = sx] = sc.split(/\s+/).map(Number);
    if (Number.isFinite(sx)) m.scaleSelf(sx, Number.isFinite(sy) ? sy : sx);
  }
  const t = cs.transform;
  if (t && t !== 'none') m.multiplySelf(new DOMMatrix(t));
  return m;
};
/** 행렬의 옮김만 기기 픽셀 정수로 */
const snapMatrix = (m: DOMMatrix, r: number): string => {
  if (m.is2D) return `matrix(${+m.a.toFixed(5)},${+m.b.toFixed(5)},${+m.c.toFixed(5)},${+m.d.toFixed(5)},${snapDev(m.e, r)},${snapDev(m.f, r)})`;
  const a = m.toFloat64Array();
  a[12] = snapDev(a[12], r);
  a[13] = snapDev(a[13], r);
  return `matrix3d(${Array.from(a, (v) => +v.toFixed(5)).join(',')})`;
};
/** 계단 곡선(steps)은 표본 사이를 잇는다 — 옛 계단 키프레임은 곡선 위 표본이었다 */
const unstep = (e: string | undefined): string => (!e || /steps|step-/.test(e) ? 'linear' : e);

const bakeCache = new Map<string, Keyframe[]>();
/** 굽는 중 (fx3의 animate 장치가 표본용 임시 애니메이션을 다시 굽지 않게) */
export let baking = false;
/**
 * 키프레임(움직임 속성)을 120Hz로 표본 내 기기 픽셀 정수 행렬 키프레임으로 굽는다. 표본 사이는 붙든다(steps(1)) — 그래서 어느 화면 프레임도
 * 소수 위치를 지나지 않는다. 표본은 보이지 않는 임시 애니메이션으로 계산한다(같은 작업 안에서 지우므로 그려지지 않는다).
 */
export const bakeMotion = (el: HTMLElement, kf: Keyframe[], dur: number, direction: PlaybackDirection = 'normal', key?: string, easing = 'linear'): Keyframe[] | null => {
  if (!(dur > 0) || dur > 4000 || !el.isConnected) return null;
  const r = dprNow();
  const ck = key ? `${key}|${easing}|${dur}|${el.offsetWidth}x${el.offsetHeight}|${r}|${direction}` : '';
  if (ck && bakeCache.has(ck)) return bakeCache.get(ck)!;
  const motion = kf.map((f) => {
    const o: Keyframe = { offset: f.offset, easing: unstep(f.easing as string | undefined) };
    for (const k of Object.keys(f)) if (isMotion(k)) (o as Record<string, unknown>)[k] = (f as Record<string, unknown>)[k];
    return o;
  }).filter((f) => Object.keys(f).some(isMotion));
  if (motion.length < 1) return null;
  let tmp: Animation;
  baking = true;
  try {
    tmp = el.animate(motion, { duration: dur, direction, easing: unstep(easing), fill: 'both' });
  } catch {
    return null;
  } finally {
    baking = false;
  }
  tmp.pause();
  const out: Keyframe[] = [];
  const n = Math.max(2, Math.ceil(dur / SMOOTH.bakeStep));
  for (let i = 0; i <= n; i++) {
    tmp.currentTime = (dur * i) / n;
    out.push({ offset: i / n, transform: snapMatrix(composed(el), r), translate: 'none', rotate: 'none', scale: 'none', easing: 'steps(1, end)' } as Keyframe);
  }
  tmp.cancel();
  if (ck) {
    if (bakeCache.size > 300) bakeCache.clear();
    bakeCache.set(ck, out);
  }
  return out;
};

const baked = new WeakMap<Element, Map<string, Animation>>();
/**
 * CSS 키프레임 움직임을 시작 순간에 정수 기기 픽셀 120Hz로 다시 굽는다 (D-554). 원래 CSS 애니메이션은 그대로 돌아
 * 가면 · 색 · 수명(클래스를 떼면 끝)을 맡고, 구운 애니메이션이 그 위에서 움직임만 덮는다(같은 시작 시각 · 같은 길이).
 * 일부러 정지 동작(SMOOTH.hold 이름) · 무한 반복 · 4초 넘는 것은 그대로 둔다. main에서 한 번 부른다.
 */
export const installSmoothMotion = (): void => {
  if (typeof document === 'undefined' || typeof CSSAnimation === 'undefined') return;
  const start = (ev: AnimationEvent): void => {
    if (calmMotion()) return;
    const name = ev.animationName;
    if (SMOOTH.hold.test(name) || ev.pseudoElement) return;
    const el = ev.target as HTMLElement;
    if (!(el instanceof HTMLElement)) return;
    const css = el.getAnimations().find((a) => a instanceof CSSAnimation && a.animationName === name) as CSSAnimation | undefined;
    if (!css) return;
    const eff = css.effect as KeyframeEffect | null;
    const tm = eff?.getTiming();
    if (!eff || !tm || tm.iterations !== 1 || typeof tm.duration !== 'number') return;
    const kf = eff.getKeyframes();
    const t0 = Number(css.startTime ?? document.timeline.currentTime ?? 0) + (Number(tm.delay) || 0);
    const mine = baked.get(el) ?? new Map<string, Animation>();
    baked.set(el, mine);
    const play = (key: string, frames: Keyframe[], o: KeyframeAnimationOptions): void => {
      mine.get(key)?.cancel();
      baking = true;
      try {
        const a = el.animate(frames, { ...o, duration: tm.duration, fill: 'none' });
        a.startTime = t0;
        if (css.playbackRate !== 1) a.playbackRate = css.playbackRate;
        mine.set(key, a);
        a.onfinish = () => mine.get(key) === a && mine.delete(key);
      } finally {
        baking = false;
      }
    };
    if (kf.some((f) => Object.keys(f).some(isMotion))) {
      const frames = bakeMotion(el, kf as Keyframe[], tm.duration, tm.direction, name);
      if (frames) play(name, frames, {});
    }
    // 자르기(clip-path) 계단도 곡선으로 잇는다 — 움직임과 함께 매끈하게
    const clip = kf.filter((f) => (f as Record<string, unknown>).clipPath !== undefined).map((f) => ({ offset: f.offset, clipPath: (f as Record<string, unknown>).clipPath as string, easing: unstep(f.easing as string | undefined) }));
    if (clip.length > 1) play(`${name}::clip`, clip as Keyframe[], { direction: tm.direction });
  };
  const stop = (ev: AnimationEvent): void => {
    const m = baked.get(ev.target as Element);
    const b = m?.get(ev.animationName);
    if (b) (b.cancel(), m!.delete(ev.animationName));
    const c = m?.get(`${ev.animationName}::clip`);
    if (c) (c.cancel(), m!.delete(`${ev.animationName}::clip`));
  };
  document.addEventListener('animationstart', start, true);
  document.addEventListener('animationcancel', stop, true);
};

/**
 * 코드로 거는 Web Animations의 움직임(transform 등)을 정수 기기 픽셀로 굽는다 (D-554). fx3.installPixelAnimate가 부른다.
 * 원래 애니메이션 A(움직임을 뺀 키프레임 — 가면 · 색, 그리고 시간 · 끝남 알림)를 돌려주고, 구운 B가 그 위에서 움직임만 맡는다.
 * A가 취소 · 끝나면 B도 따른다. 굽지 못하면 null (부른 쪽이 원래대로 건다).
 */
export const bakeWaapi = (el: Element, kf: Keyframe[], opts: KeyframeAnimationOptions, orig: (kf: Keyframe[], o?: KeyframeAnimationOptions) => Animation): Animation | null => {
  if (baking || calmMotion() || !(el instanceof HTMLElement)) return null;
  if (!kf.some((f) => Object.keys(f).some(isMotion))) return null;
  const it = opts.iterations ?? 1;
  const dur = typeof opts.duration === 'number' ? opts.duration : NaN;
  if (it !== 1 || !(dur > 0)) return null;
  const frames = bakeMotion(el, kf, dur, opts.direction ?? 'normal', undefined, opts.easing ?? 'linear');
  if (!frames) return null;
  const rest = kf.map((f) => {
    const o: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(f)) if (!isMotion(k)) o[k] = v;
    return o as Keyframe;
  });
  const a = orig(rest, opts);
  const b = orig(frames, { duration: dur, delay: opts.delay, endDelay: opts.endDelay, fill: opts.fill, easing: 'linear' });
  a.addEventListener('cancel', () => b.cancel());
  a.addEventListener('finish', () => b.playState !== 'finished' && b.finish());
  return a;
};
