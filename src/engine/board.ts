import type { BattleState, Piece, Pos, Side } from './types';

/** 유효 보드 안인가. 붕괴로 무너진 테두리(ring)는 보드 밖으로 본다 (D-014). */
export const inBounds = (s: BattleState, x: number, y: number): boolean =>
  x >= s.ring && y >= s.ring && x < s.width - s.ring && y < s.height - s.ring;

/** 칸 → 기물 조회표. 상태가 바뀔 때마다 새로 만든다 (보드가 작아 비용이 무시할 만하다). */
export type Grid = (Piece | undefined)[];

export const buildGrid = (s: BattleState): Grid => {
  const grid: Grid = new Array(s.width * s.height);
  for (const p of s.pieces) grid[p.y * s.width + p.x] = p;
  return grid;
};

export const at = (s: BattleState, grid: Grid, x: number, y: number): Piece | undefined =>
  inBounds(s, x, y) ? grid[y * s.width + x] : undefined;

export const cloneState = (s: BattleState): BattleState => ({
  ...s,
  stronghold: s.stronghold ? { ...s.stronghold } : null,
  apBonus: [...s.apBonus] as [number, number],
  lastStrike: [...s.lastStrike] as BattleState['lastStrike'],
  pieces: s.pieces.map((p) => ({ ...p })),
});

export const findPiece = (s: BattleState, id: number): Piece | undefined =>
  s.pieces.find((p) => p.id === id);

export const kingOf = (s: BattleState, side: Side): Piece | undefined =>
  s.pieces.find((p) => p.side === side && p.type === 'K');

/** 진영의 전방 방향 (+1 = 위, −1 = 아래) */
export const forward = (side: Side): number => (side === 0 ? 1 : -1);

/** 진영 기준 상대 끝줄 */
export const lastRank = (s: BattleState, side: Side): number => (side === 0 ? s.height - 1 : 0);

export const samePos = (a: Pos, b: Pos): boolean => a.x === b.x && a.y === b.y;

/** 체스 표기 (a1 = 왼쪽 아래) */
export const toSquare = (p: Pos): string => String.fromCharCode(97 + p.x) + (p.y + 1);

export const fromSquare = (sq: string): Pos => ({
  x: sq.charCodeAt(0) - 97,
  y: parseInt(sq.slice(1), 10) - 1,
});

export const chebyshev = (a: Pos, b: Pos): number => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

export const roundOf = (s: BattleState): number => Math.ceil(s.turnNumber / 2);

export const onStronghold = (s: BattleState, p: Pos): boolean =>
  !!s.stronghold && s.stronghold.x === p.x && s.stronghold.y === p.y;
