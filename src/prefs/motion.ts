/**
 * 움직임 줄이기 (D-530): 기기 설정(prefers-reduced-motion)을 따르거나, 설정 창에서 끄고 켠다.
 * 모든 연출 코드는 이 `calmMotion()` 하나를 묻는다. CSS의 `@media (prefers-reduced-motion: …)` 규칙도
 * 같은 값을 따르도록 미디어 조건을 바꿔 끼운다 (규칙을 두 벌 쓰지 않는다).
 */
export type MotionPref = 'os' | 'off' | 'on';

let pref: MotionPref = 'os';

/**
 * 기기 설정은 MediaQueryList 하나를 잡아 두고 바뀔 때만 다시 읽는다 — 연출 코드가 프레임마다 묻는다
 * (반장 판 FX는 한 프레임에 몇 번씩), matchMedia를 매번 새로 만들지 않는다 (D-533).
 */
let osMq: MediaQueryList | null | undefined;
let osVal = false;
const osCalm = (): boolean => {
  if (osMq === undefined) {
    osMq = (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')) || null;
    osVal = osMq?.matches ?? false;
    osMq?.addEventListener?.('change', (e) => (osVal = e.matches));
  }
  return osVal;
};

/** 지금 연출을 줄여야 하나 (설정 → 없으면 기기 설정) */
export const calmMotion = (): boolean => (pref === 'on' ? true : pref === 'off' ? false : osCalm());

/**
 * 번쩍임 줄이기 (D-536, WCAG 2.3.1): 화면을 밝게 번쩍이는 연출(반장 등장 흰 장 · 2단계 진홍 번쩍)을 끈다.
 * 움직임 줄이기가 켜져 있으면 함께 꺼진다. 설정 창 토글은 `setFlashPref`를 부른다.
 */
let flashPref = false;
/** 번쩍임을 빼야 하나 (번쩍임 줄이기 설정 또는 움직임 줄이기) */
export const reduceFlash = (): boolean => flashPref || calmMotion();
/** 번쩍임 줄이기 설정을 바꾼다 — CSS는 `:root[data-noflash="1"]`로 따른다 */
export const setFlashPref = (v: boolean): void => {
  flashPref = v;
  if (typeof document !== 'undefined') document.documentElement.dataset.noflash = reduceFlash() ? '1' : '0';
};

/** 지금 고른 움직임 설정 */
export const motionPref = (): MotionPref => pref;

const REDUCE = /\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/g;
const NOPREF = /\(\s*prefers-reduced-motion\s*:\s*no-preference\s*\)/g;
const TRUE = '(min-width: 0px)';
const FALSE = '(max-width: -1px)';

/** 미디어 조건 하나를 설정에 맞게 바꾼다 (os면 원래대로) */
export const motionMedia = (orig: string, p: MotionPref): string => {
  if (p === 'os') return orig;
  const on = p === 'on';
  return orig.replace(REDUCE, on ? TRUE : FALSE).replace(NOPREF, on ? FALSE : TRUE);
};

const original = new WeakMap<CSSMediaRule, string>();
const walk = (rules: CSSRuleList): void => {
  for (const r of Array.from(rules)) {
    if (r instanceof CSSMediaRule) {
      const o = original.get(r) ?? r.media.mediaText;
      if (/prefers-reduced-motion/.test(o)) {
        original.set(r, o);
        const want = motionMedia(o, pref);
        if (r.media.mediaText !== want) r.media.mediaText = want;
      }
      walk(r.cssRules);
    } else if (r instanceof CSSGroupingRule) walk(r.cssRules);
  }
};
/** 문서의 모든 스타일시트에 지금 설정을 입힌다 */
const applyCss = (): void => {
  if (typeof document === 'undefined' || typeof CSSMediaRule === 'undefined') return;
  for (const s of Array.from(document.styleSheets)) {
    try {
      walk(s.cssRules);
    } catch {
      /* 다른 출처 스타일시트는 읽을 수 없다 — 움직임 규칙도 없다 */
    }
  }
  document.documentElement.dataset.calm = calmMotion() ? '1' : '0';
  document.documentElement.dataset.noflash = reduceFlash() ? '1' : '0';
};

let watching = false;
/** 설정을 바꾼다 — CSS · JS 연출이 바로 따른다 */
export const setMotionPref = (p: MotionPref): void => {
  pref = p;
  applyCss();
  if (watching || typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;
  watching = true;
  // 나중에 붙는 스타일시트(지연 로딩 · 개발 서버 주입)도 같은 설정을 받는다
  new MutationObserver(() => applyCss()).observe(document.head, { childList: true });
  document.addEventListener('load', (e) => (e.target instanceof HTMLLinkElement ? applyCss() : undefined), true);
};
