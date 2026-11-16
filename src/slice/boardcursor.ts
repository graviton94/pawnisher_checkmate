/**
 * 판 커서 (D-533): 키보드 · 게임패드로 판 칸을 고른다 — DOM 없이 시험하는 부분. 화면 연결은 keys.ts, 그림은 BoardRenderer.
 * 커서는 칸 하나를 가리키고, 확인 = 그 칸을 한 번 탭한 것과 같다 (main.ts의 같은 onTap 길). 게임 상태는 건드리지 않는다.
 *
 * 2×2 반장(몸 칸 넷이 킹 하나)은 한 기물이라 커서가 몸 전체에 붙는다: 들어서면 2×2 테, 한 번 더 누르면 몸을 건너 나간다.
 * 거대 주물(부위마다 HP가 따로인 네 기물)은 부위가 따로 노리는 칸이라 커서가 부위 칸마다 서되, 테는 몸 전체에 두른다.
 */
import type { Dir } from './keymap';

export interface Cell {
  x: number;
  y: number;
}
/** 칸 묶음 (왼아래 칸 + 폭 · 높이, 엔진 좌표 — y가 클수록 화면 위) */
export interface Rect extends Cell {
  w: number;
  h: number;
}

/** 커서가 판을 읽는 곳 */
export interface CursorBoard {
  w: number;
  h: number;
  /** 이 칸에 선 2×2 묶음 (반장 몸 · 거대 주물) — 없으면 null. snap = 한 기물(반장)이라 몸째 움직인다 */
  body(c: Cell): (Rect & { snap: boolean }) | null;
}

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

/** 판 크기 안으로 (판이 바뀌어 커서가 밖에 남았을 때) */
export const clampCell = (c: Cell, w: number, h: number): Cell => ({ x: clamp(c.x, 0, w - 1), y: clamp(c.y, 0, h - 1) });

const STEP: Record<Dir, Cell> = { up: { x: 0, y: 1 }, down: { x: 0, y: -1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };

/**
 * 방향으로 한 칸 (판 끝에서 멈춘다). 반장 몸 위면 몸 가장자리 너머로 나가고,
 * 반장 몸에 들어서면 몸의 왼아래 칸(본체)으로 붙는다 — 몸 어느 칸을 눌러도 같은 기물이라 한 자리로 모은다.
 */
export const moveCursor = (c: Cell, dir: Dir, b: CursorBoard): Cell => {
  const s = STEP[dir];
  const here = b.body(c);
  let x = c.x, y = c.y;
  if (here?.snap) {
    // 몸 가장자리에서 한 칸 밖 — 들어온 줄/열은 그대로
    if (s.x > 0) x = here.x + here.w;
    else if (s.x < 0) x = here.x - 1;
    if (s.y > 0) y = here.y + here.h;
    else if (s.y < 0) y = here.y - 1;
  } else {
    x += s.x;
    y += s.y;
  }
  if (x < 0 || y < 0 || x >= b.w || y >= b.h) return clampCell(c, b.w, b.h);
  const there = b.body({ x, y });
  return there?.snap ? { x: there.x, y: there.y } : { x, y };
};

/** 커서 테를 두를 칸 묶음 (2×2 위면 몸 전체) */
export const cursorRect = (c: Cell, b: CursorBoard): Rect => {
  const body = b.body(c);
  return body ? { x: body.x, y: body.y, w: body.w, h: body.h } : { x: c.x, y: c.y, w: 1, h: 1 };
};

/**
 * 확인을 누르면 탭할 칸. 반장 몸이면 몸 칸 중 지금 갈 수 있는(치는) 칸을 먼저 — 몸 어디든 탭 한 번과 같지만,
 * 카드를 쥔 뒤엔 몸의 어느 칸이 목적지인지가 달라질 수 있어 목적지 칸을 고른다 (없으면 커서 칸).
 */
export const tapCell = (c: Cell, b: CursorBoard, dests: Cell[]): Cell => {
  const body = b.body(c);
  if (!body?.snap) return c;
  const inBody = (d: Cell) => d.x >= body.x && d.x < body.x + body.w && d.y >= body.y && d.y < body.y + body.h;
  return dests.find((d) => d.x === c.x && d.y === c.y) ?? dests.find(inBody) ?? c;
};

/** 판 기물에서 읽는 부분만 (엔진 Piece와 같은 모양) */
export interface BodyPiece extends Cell {
  id: number;
  body?: number;
  giant?: { id: number; boss?: boolean };
}

/**
 * 칸에 선 2×2 묶음: 반장 몸(본체 + body 칸 셋 — 한 기물, snap) · 거대 주물(같은 giant.id 부위 넷 — 부위마다 따로 노린다).
 * 한 칸짜리 기물이나 빈 칸이면 null. 부서진 부위가 빠져도 남은 칸들을 감싼다.
 */
export const bodyRect = (pieces: readonly BodyPiece[], c: Cell): (Rect & { snap: boolean }) | null => {
  const p = pieces.find((q) => q.x === c.x && q.y === c.y);
  if (!p) return null;
  let cells: BodyPiece[];
  let snap: boolean;
  if (p.body !== undefined || p.giant?.boss) {
    const core = p.body !== undefined ? p.body : p.id;
    cells = pieces.filter((q) => q.id === core || q.body === core);
    snap = true;
  } else if (p.giant) {
    const g = p.giant.id;
    cells = pieces.filter((q) => q.giant?.id === g && !q.giant.boss);
    snap = false;
  } else return null;
  if (cells.length < 2) return null;
  const xs = cells.map((q) => q.x), ys = cells.map((q) => q.y);
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x + 1, h: Math.max(...ys) - y + 1, snap };
};
