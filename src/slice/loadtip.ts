/**
 * 로딩 쪽지 (P-C D-502, 후기 #5): 대국에 들어갈 때 · 막을 넘길 때 철문이 닫힌 사이 안내서 한 쪽을 보인다.
 * 아직 안 본 쪽부터 안내서 순서대로, 다 봤으면 돌려 가며. 누르면 바로 넘어가고, 다 읽을 시간이 지나면 저절로.
 * 바탕 = 받은 LD-02 작업대(scenes/loading-bench.png, cover), 사진 액자 · 요령 쪽지 · 돌아가는 톱니 = 받은 LD-01 (D-523). 창은 키트 철판 M.
 * 게임 상태는 건드리지 않는다 (UI 원칙 9). 본 쪽 기록은 이 기기의 localStorage에만(없어도 돈다).
 */
import { calmMotion } from '../prefs/motion';
import { GUIDE_PAGES, OPENING_TEXT } from '../data/opening';
import { LOAD_TIP } from '../data/tutorial';
import { pxOut, replay } from './fx3';
import { guideMedia } from './opening';

const KEY = 'pc-loadtips';
const calm = (): boolean => calmMotion();

interface TipLog {
  /** 본 쪽 (안내서 번호) */
  seen: number[];
  /** 다 본 뒤 돌려 보는 자리 */
  at: number;
  /** 대국 들어가기 횟수 (다 본 뒤에는 LOAD_TIP.every번에 한 번) */
  n: number;
}
const read = (): TipLog => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null') as TipLog | null;
    if (v && Array.isArray(v.seen)) return { seen: v.seen, at: v.at ?? 0, n: v.n ?? 0 };
  } catch {
    /* 저장이 막힌 기기 — 처음부터 */
  }
  return { seen: [], at: 0, n: 0 };
};
const write = (v: TipLog): void => {
  try {
    localStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    /* 저장이 막힌 기기 — 기억하지 못할 뿐 */
  }
};

/** 이 쪽을 본 것으로 (입문 시험대 사이에서 안내서로 이미 본 쪽은 로딩 쪽지에 먼저 나오지 않는다) */
export const markTip = (i: number): void => {
  const log = read();
  if (!log.seen.includes(i)) write({ ...log, seen: [...log.seen, i] });
};

/** 다음에 보일 쪽 — 안 본 쪽이 먼저(안내서 순서), 다 봤으면 차례로 돌린다. 고르기만 하고 적지는 않는다 */
export const nextTip = (log: TipLog = read()): number => {
  const fresh = GUIDE_PAGES.findIndex((_, i) => !log.seen.includes(i));
  return fresh >= 0 ? fresh : log.at % GUIDE_PAGES.length;
};

/** 이번 들어가기에 쪽지를 보일까: 안 본 쪽이 남았으면 늘, 다 봤으면 LOAD_TIP.every번에 한 번 (같은 판을 거듭 들어가도 지루하지 않게) */
export const tipDue = (kind: 'battle' | 'act'): boolean => {
  const log = read();
  if (kind === 'act' || log.seen.length < GUIDE_PAGES.length) return true;
  return (log.n + 1) % LOAD_TIP.every === 0;
};

/** 쪽지 한 장 마크업 — 안내서 그림 + 제목 + 개념 한 줄 + 요령 한 줄 (안내서 쪽의 위 · 아래 끝만) */
export const tipHtml = (i: number): string => {
  const g = GUIDE_PAGES[i];
  return `<div class="plate">${OPENING_TEXT.guideTitle}</div><div class="gd3"><div class="inset">${guideMedia(g.media)}</div><div class="stack gd-text3"><p class="lead">${g.title}</p><p>${g.lines[0]}</p>${g.tip ? `<p class="up">“${g.tip}”</p>` : ''}</div></div><div class="ld-foot"><i class="ld-gear" style="background-image:url(ui/hud/load-gear.png)" aria-hidden="true"></i><p class="note ld-more">${LOAD_TIP.more}</p></div>`;
};

/**
 * 쪽지를 띄우고 읽을 시간만큼(또는 누를 때까지) 기다린다. 철문이 닫혀 있는 동안 부르면 문 위에 뜬다.
 * 쪽지 뒤에는 늘 작업대 바탕(LD-02)을 깐다 — 철문이 있든 없든(줄인 움직임) 같은 화면.
 */
export const showTip = (kind: 'battle' | 'act'): Promise<void> =>
  new Promise((done) => {
    const log = read();
    const i = nextTip(log);
    const g = GUIDE_PAGES[i];
    write({ seen: [...new Set([...log.seen, i])], at: log.seen.length >= GUIDE_PAGES.length ? log.at + 1 : log.at, n: log.n + (kind === 'battle' ? 1 : 0) });
    const wrap = document.createElement('div');
    wrap.className = 'ld-tip-wrap';
    wrap.style.backgroundImage = 'url(scenes/loading-bench.png)';
    wrap.setAttribute('role', 'status');
    wrap.innerHTML = `<div class="win ld-tip">${tipHtml(i)}</div>`;
    document.body.appendChild(wrap);
    const win = wrap.querySelector<HTMLElement>('.ld-tip')!;
    if (!calm()) replay(win, 'ld-in');
    // 읽을 시간: 글자당 LOAD_TIP.perChar, 최소 LOAD_TIP.min (컷신 띠 · 상태 띠와 같은 셈)
    const chars = g.title.length + g.lines[0].length + (g.tip?.length ?? 0);
    let left = false;
    const leave = (): void => {
      if (left) return;
      left = true;
      window.clearTimeout(t);
      pxOut(wrap, () => (wrap.remove(), done()), 160);
    };
    const t = window.setTimeout(leave, Math.max(LOAD_TIP.min, chars * LOAD_TIP.perChar));
    // 띄운 탭이 그대로 넘김으로 잡히지 않게 한 박자 뒤부터 받는다
    window.setTimeout(() => wrap.addEventListener('click', leave), LOAD_TIP.guard);
  });
