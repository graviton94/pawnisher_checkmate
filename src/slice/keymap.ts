/**
 * PC 키보드 · 게임패드 행동표 (D-531) — DOM 없이 시험하는 부분. 화면 연결은 keys.ts.
 * 키와 패드 단추를 같은 「행동」으로 바꾸고, 행동은 탭과 같은 길(단추 click ·
 * dismissWin)로만 흘린다 — 화면이 게임 상태를 직접 바꾸지 않는다 (UI/UX 원칙 9). 탭 흐름은 그대로.
 *
 * 키: 확인 Enter · Space / 뒤로 Esc · Backspace / 턴 끝 E / 선택 취소 Z · Ctrl+Z / 되감기 R / 카드 1~9 / 방향키 = 초점 이동
 * 패드(표준 배치): A 확인 · B 뒤로 · X 턴 끝 · Y 선택 취소 · Start 메뉴(도움말) · 십자키 · 왼쪽 스틱 = 초점 이동
 */

export type Dir = 'up' | 'down' | 'left' | 'right';
export type Action =
  | { t: 'confirm' }
  | { t: 'back' }
  | { t: 'endTurn' }
  | { t: 'undo' }
  | { t: 'reset' }
  | { t: 'menu' }
  | { t: 'card'; i: number }
  | { t: 'focus'; dir: Dir };

/** 키 이벤트에서 쓰는 부분만 */
export interface KeyLike {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
}

const ARROWS: Record<string, Dir> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };

/** 키 하나 → 행동 (없으면 null). Alt 조합은 창 기능(Alt+Enter 전체 화면)이라 넘긴다 */
export const keyAction = (e: KeyLike): Action | null => {
  if (e.altKey) return null;
  const mod = !!(e.ctrlKey || e.metaKey);
  const k = e.key;
  if (mod) return k.toLowerCase() === 'z' ? { t: 'undo' } : null;
  if (k === 'Enter' || k === ' ') return { t: 'confirm' };
  if (k === 'Escape' || k === 'Backspace') return { t: 'back' };
  if (ARROWS[k]) return { t: 'focus', dir: ARROWS[k] };
  if (/^[1-9]$/.test(k)) return { t: 'card', i: Number(k) - 1 };
  switch (k.toLowerCase()) {
    case 'e': return { t: 'endTurn' };
    case 'z': return { t: 'undo' };
    case 'r': return { t: 'reset' };
    default: return null;
  }
};

/** 표준 게임패드 단추 번호 → 행동 */
export const PAD_MAP: Record<number, Action> = {
  0: { t: 'confirm' },
  1: { t: 'back' },
  2: { t: 'endTurn' },
  3: { t: 'undo' },
  9: { t: 'menu' },
  12: { t: 'focus', dir: 'up' },
  13: { t: 'focus', dir: 'down' },
  14: { t: 'focus', dir: 'left' },
  15: { t: 'focus', dir: 'right' },
};

/** 왼쪽 스틱 기울기 → 방향 (0.6 넘게 기울였을 때만) */
export const stickDir = (x: number, y: number, dead = 0.6): Dir | null => {
  if (Math.max(Math.abs(x), Math.abs(y)) < dead) return null;
  return Math.abs(x) > Math.abs(y) ? (x > 0 ? 'right' : 'left') : y > 0 ? 'down' : 'up';
};

/** 행동이 닿는 곳 (DOM 없이 시험할 수 있게 나눈다) */
export interface InputEnv {
  /** 열린 창 · 장면을 닫는다 (닫았으면 true) */
  dismiss(): boolean;
  /** 맨 위가 대국 판인가 (카드 · 턴 끝 · 되감기 키는 이때만) */
  inBattle(): boolean;
  /** 대국 선택(카드 · 기물)을 내려놓는다 (내려놓았으면 true) */
  cancel(): boolean;
  /** 맨 위 층의 초점 단추를 누른다 (초점이 없으면 첫 단추에 초점만 → true, 누를 게 없으면 false) */
  press(): boolean;
  /** 맨 위 층에서 방향으로 초점을 옮긴다 */
  move(dir: Dir): void;
  /** 대국 단추 누르기 (#btn-end · #btn-rewind · #btn-help · 손패 n번째) */
  click(target: 'end' | 'rewind' | 'help' | { card: number }): boolean;
}

/** 행동 하나를 흘린다 → 처리했으면 true (키 기본 동작을 막는다) */
export const dispatch = (a: Action, env: InputEnv): boolean => {
  switch (a.t) {
    case 'confirm': return env.press();
    case 'back': return env.dismiss() || (env.inBattle() && env.cancel());
    case 'focus': env.move(a.dir); return true;
    case 'menu': return env.inBattle() && env.click('help');
    case 'endTurn': return env.inBattle() && env.click('end');
    case 'reset': return env.inBattle() && env.click('rewind');
    case 'undo': return env.inBattle() && env.cancel();
    case 'card': return env.inBattle() && env.click({ card: a.i });
  }
};

/** 방향 초점: 그쪽에 있는 단추 중 가까운 것 (옆으로 벗어난 거리는 두 배로 친다) */
export const nearest = <T>(from: { x: number; y: number }, items: { item: T; x: number; y: number }[], dir: Dir): T | null => {
  let best: T | null = null;
  let score = Infinity;
  for (const it of items) {
    const dx = it.x - from.x, dy = it.y - from.y;
    const along = dir === 'left' ? -dx : dir === 'right' ? dx : dir === 'up' ? -dy : dy;
    const side = dir === 'left' || dir === 'right' ? Math.abs(dy) : Math.abs(dx);
    if (along <= 1) continue;
    const s = along + side * 2;
    if (s < score) (score = s), (best = it.item);
  }
  return best;
};
