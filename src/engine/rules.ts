import { STRONGHOLD } from '../data/battle';
import { at, buildGrid, forward, inBounds, onStronghold, type Grid } from './board';
import type { BattleState, Piece, PieceType, Pos } from './types';

const ORTHO: Pos[] = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
const DIAG: Pos[] = [{ x: 1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: -1, y: -1 }];
const ALL8: Pos[] = [...ORTHO, ...DIAG];
const KNIGHT: Pos[] = [
  { x: 1, y: 2 }, { x: 2, y: 1 }, { x: 2, y: -1 }, { x: 1, y: -2 },
  { x: -1, y: -2 }, { x: -2, y: -1 }, { x: -2, y: 1 }, { x: -1, y: 2 },
];

const SLIDE_DIRS: Partial<Record<PieceType, Pos[]>> = { B: DIAG, R: ORTHO, Q: ALL8 };

/**
 * 기물이 갈 수 있는 빈 칸 (GDD 2장 §2.2, §2.4).
 * 정통 체스 행마. 착지는 빈 칸만, 슬라이딩은 모든 기물에 막히고, 나이트는 도약한다.
 */
export const legalMoves = (s: BattleState, piece: Piece, grid: Grid = buildGrid(s)): Pos[] => {
  const out: Pos[] = [];
  const empty = (x: number, y: number) => inBounds(s, x, y) && !at(s, grid, x, y);

  switch (piece.type) {
    case 'P': {
      const f = forward(piece.side);
      if (empty(piece.x, piece.y + f)) {
        out.push({ x: piece.x, y: piece.y + f });
        if (!piece.moved && empty(piece.x, piece.y + 2 * f)) out.push({ x: piece.x, y: piece.y + 2 * f });
      }
      break;
    }
    case 'N':
      for (const d of KNIGHT) if (empty(piece.x + d.x, piece.y + d.y)) out.push({ x: piece.x + d.x, y: piece.y + d.y });
      break;
    case 'K':
      if (strikeReady(s, piece)) {
        // 최후의 일격: 퀸처럼 끝까지 미끄러져 이동할 수 있다 (D-015)
        for (const d of ALL8) {
          let x = piece.x + d.x;
          let y = piece.y + d.y;
          while (empty(x, y)) {
            out.push({ x, y });
            x += d.x;
            y += d.y;
          }
        }
      } else {
        for (const d of ALL8) if (empty(piece.x + d.x, piece.y + d.y)) out.push({ x: piece.x + d.x, y: piece.y + d.y });
      }
      break;
    default:
      for (const d of SLIDE_DIRS[piece.type]!) {
        let x = piece.x + d.x;
        let y = piece.y + d.y;
        while (empty(x, y)) {
          out.push({ x, y });
          x += d.x;
          y += d.y;
        }
      }
  }
  return out;
};

/**
 * 착지 칸 기준 공격 대상 (GDD 2장 §2.3, §2.4).
 * 지점 공격(폰·나이트·킹)은 지정 칸의 적을 모두, 사선 공격(비숍·룩·퀸)은 방향마다 처음 만난 기물이 적일 때만 친다.
 */
export const attackTargets = (s: BattleState, piece: Piece, grid: Grid = buildGrid(s)): Piece[] => {
  const out: Piece[] = [];
  const enemyAt = (x: number, y: number) => {
    const p = at(s, grid, x, y);
    if (p && p.side !== piece.side) out.push(p);
  };

  switch (piece.type) {
    case 'P': {
      const f = forward(piece.side);
      enemyAt(piece.x - 1, piece.y + f);
      enemyAt(piece.x + 1, piece.y + f);
      break;
    }
    case 'N':
      for (const d of KNIGHT) enemyAt(piece.x + d.x, piece.y + d.y);
      break;
    case 'K':
      for (const d of ALL8) enemyAt(piece.x + d.x, piece.y + d.y);
      break;
    default:
      for (const d of SLIDE_DIRS[piece.type]!) {
        let x = piece.x + d.x;
        let y = piece.y + d.y;
        while (inBounds(s, x, y)) {
          const p = at(s, grid, x, y);
          if (p) {
            if (p.side !== piece.side) out.push(p);
            break;
          }
          x += d.x;
          y += d.y;
        }
      }
  }
  return out;
};

/** 공격 범위로 표시할 칸 (미리보기용). 사선은 처음 만난 기물 칸까지 포함한다. */
export const attackArea = (s: BattleState, piece: Piece, grid: Grid = buildGrid(s)): Pos[] => {
  const out: Pos[] = [];
  const add = (x: number, y: number) => {
    if (inBounds(s, x, y)) out.push({ x, y });
  };
  switch (piece.type) {
    case 'P': {
      const f = forward(piece.side);
      add(piece.x - 1, piece.y + f);
      add(piece.x + 1, piece.y + f);
      break;
    }
    case 'N':
      for (const d of KNIGHT) add(piece.x + d.x, piece.y + d.y);
      break;
    case 'K':
      for (const d of ALL8) add(piece.x + d.x, piece.y + d.y);
      break;
    default:
      for (const d of SLIDE_DIRS[piece.type]!) {
        let x = piece.x + d.x;
        let y = piece.y + d.y;
        while (inBounds(s, x, y)) {
          out.push({ x, y });
          if (at(s, grid, x, y)) break;
          x += d.x;
          y += d.y;
        }
      }
  }
  return out;
};

/** 이 킹이 최후의 일격을 쓸 수 있는가 */
export const strikeReady = (s: BattleState, piece: Piece): boolean =>
  piece.type === 'K' && s.lastStrike[piece.side] === 'ready';

/** 이 이동이 최후의 일격인가 (킹 보통 이동 범위를 넘는 이동) */
export const isStrikeMove = (s: BattleState, piece: Piece, to: Pos): boolean =>
  strikeReady(s, piece) && Math.max(Math.abs(to.x - piece.x), Math.abs(to.y - piece.y)) > 1;

/**
 * 최종 피해량 (GDD 3장 §3.2).
 * max(1, floor(ATK × (1 + 버프) × 배율) − (DEF + 버프)), 요충지 위의 대상은 그 뒤 엄폐 감소를 적용한다.
 */
export const damageOf = (s: BattleState, attacker: Piece, target: Piece, multiplier = 1): number => {
  const atk = Math.floor(attacker.atk * (1 + attacker.buffAtkPct) * multiplier);
  let dmg = Math.max(1, atk - (target.def + target.buffDef));
  if (onStronghold(s, target)) dmg = Math.max(1, Math.floor(dmg * (1 - STRONGHOLD.coverReduction)));
  return dmg;
};
