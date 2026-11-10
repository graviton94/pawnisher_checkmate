import type { BattleState, Piece, Pos, Side } from './types';

/** 무너진 칸인가 (D-014) */
export const isFallen = (s: BattleState, x: number, y: number): boolean => !!s.fallen?.length && s.fallen.includes(y * s.width + x);

/** 유효 보드 안인가. 붕괴로 무너진 칸은 보드 밖으로 본다 (D-014). */
export const inBounds = (s: BattleState, x: number, y: number): boolean =>
  x >= 0 && y >= 0 && x < s.width && y < s.height && !isFallen(s, x, y);

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
  apBonus: [...s.apBonus] as [number, number],
  loadouts: [{ parts: [...s.loadouts[0].parts] }, { parts: [...s.loadouts[1].parts] }],
  pieces: s.pieces.map((p) => ({ ...p })),
  fallen: s.fallen ? [...s.fallen] : [],
  fuseUsed: s.fuseUsed ? ([...s.fuseUsed] as [boolean, boolean]) : undefined,
  doorIds: s.doorIds ? [...s.doorIds] : undefined,
  relaunch: s.relaunch ? [...s.relaunch] : undefined,
  record: s.record ? [{ ...s.record[0] }, { ...s.record[1] }] : undefined,
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
