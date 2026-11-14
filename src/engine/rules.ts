import { CARVE_FX, PIERCE_TYPES } from '../data/carves';
import { PART_FX, type PartId } from '../data/parts';
import { TWIST_FX } from '../data/twists';
import { at, buildGrid, chebyshev, forward, inBounds, type Grid } from './board';
import type { BattleState, Piece, PieceType, Pos, Side } from './types';

const KNIGHT: Pos[] = [
  { x: 1, y: 2 }, { x: 2, y: 1 }, { x: 2, y: -1 }, { x: 1, y: -2 },
  { x: -1, y: -2 }, { x: -2, y: -1 }, { x: -2, y: 1 }, { x: -1, y: 2 },
];
const ALL8: Pos[] = [
  { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
  { x: 1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: -1, y: -1 },
];
const CAMEL: Pos[] = [
  { x: 1, y: 3 }, { x: 3, y: 1 }, { x: 3, y: -1 }, { x: 1, y: -3 },
  { x: -1, y: -3 }, { x: -3, y: -1 }, { x: -3, y: 1 }, { x: -1, y: 3 },
];
const ORTHO4: Pos[] = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
const DIAG4: Pos[] = [{ x: 1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: -1, y: -1 }];
/**
 * 이형 기물의 행마 · 공격 (D-481, GDD 21장 §1) — 착지는 빈 칸만, 공격은 착지 칸 기준.
 *  대포: 룩처럼 미끄러지고, 줄에서 딱 한 기물을 넘어 그 뒤 첫 적을 친다 · 낙타: (3,1) 도약
 *  메뚜기: 여덟 줄에서 처음 만난 기물 바로 뒤 빈 칸으로 뛰고, 둘레 여덟 칸을 친다
 *  대주교: 비숍 + 나이트 · 총독: 룩 + 나이트
 */
const formMoves = (s: BattleState, piece: Piece, grid: Grid, stepTo: (x: number, y: number) => void, empty: (x: number, y: number) => boolean): void => {
  const slide = (dirs: Pos[]) => {
    for (const d of dirs) {
      let x = piece.x + d.x, y = piece.y + d.y;
      while (empty(x, y)) { stepTo(x, y); x += d.x; y += d.y; }
    }
  };
  switch (piece.form) {
    case 'cannon': slide(ORTHO4); break;
    case 'camel': for (const d of CAMEL) if (empty(piece.x + d.x, piece.y + d.y)) stepTo(piece.x + d.x, piece.y + d.y); break;
    case 'hopper':
      for (const d of ALL8) {
        let x = piece.x + d.x, y = piece.y + d.y;
        while (inBounds(s, x, y) && !at(s, grid, x, y)) { x += d.x; y += d.y; }
        if (inBounds(s, x, y) && empty(x + d.x, y + d.y)) stepTo(x + d.x, y + d.y);
      }
      break;
    case 'archbishop': slide(DIAG4); for (const d of KNIGHT) if (empty(piece.x + d.x, piece.y + d.y)) stepTo(piece.x + d.x, piece.y + d.y); break;
    case 'chancellor': slide(ORTHO4); for (const d of KNIGHT) if (empty(piece.x + d.x, piece.y + d.y)) stepTo(piece.x + d.x, piece.y + d.y); break;
  }
};
const formAttack = (s: BattleState, piece: Piece, grid: Grid, point: (x: number, y: number) => void, line: (dirs: Pos[]) => void, area: Pos[], targets: Piece[]): void => {
  switch (piece.form) {
    case 'cannon':
      for (const d of ORTHO4) {
        let x = piece.x + d.x, y = piece.y + d.y, screened = false;
        while (inBounds(s, x, y)) {
          const p = at(s, grid, x, y);
          if (screened) { area.push({ x, y }); if (p) { if (p.side !== piece.side) targets.push(p); break; } }
          else if (p) screened = true;
          x += d.x; y += d.y;
        }
      }
      break;
    case 'camel': for (const d of CAMEL) point(piece.x + d.x, piece.y + d.y); break;
    case 'hopper': for (const d of ALL8) point(piece.x + d.x, piece.y + d.y); break;
    case 'archbishop': line(DIAG4); for (const d of KNIGHT) point(piece.x + d.x, piece.y + d.y); break;
    case 'chancellor': line(ORTHO4); for (const d of KNIGHT) point(piece.x + d.x, piece.y + d.y); break;
  }
};

const SLIDE_DIRS: Partial<Record<PieceType, Pos[]>> = {
  B: [{ x: 1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: -1, y: -1 }],
  R: [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }],
  Q: ALL8,
};

/** 그 진영이 이 부품을 가졌나 */
export const part = (s: BattleState, side: Side, id: PartId): boolean => !!s.loadouts?.[side]?.parts.includes(id);

/** 적 진영(1)에 걸린 반장 비틀기인가 */
export const twistOn = (s: BattleState, p: Piece, id: BattleState['twist']): boolean => p.side === 1 && s.twist === id;

const otherSideOf = (side: number) => (side === 0 ? 1 : 0);

/**
 * 기물이 갈 수 있는 빈 칸 (GDD 2장): 정통 체스 행마. 착지는 빈 칸만, 슬라이딩은 모든 기물에 막히고, 나이트는 도약한다.
 */
export const legalMoves = (s: BattleState, piece: Piece, grid: Grid = buildGrid(s)): Pos[] => {
  const out: Pos[] = [];
  // 거대 주물 부위 (D-484): 혼자 움직이지 않는다 — 묶음 전체가 턴 시작에 걷는다(src/slice/giant.ts)
  if (piece.giant) return out;
  const empty = (x: number, y: number) => inBounds(s, x, y) && !at(s, grid, x, y);
  // 잡기 규칙(시험장 B): 적이 선 칸에도 들어갈 수 있다 (폰은 대각 앞으로만 잡는다)
  const cap = !!s.rules.capture;
  const foe = (x: number, y: number) => cap && inBounds(s, x, y) && at(s, grid, x, y)?.side === otherSideOf(piece.side);
  const stepTo = (x: number, y: number) => (empty(x, y) || foe(x, y)) && out.push({ x, y });
  if (piece.form && !piece.asPawn) {
    formMoves(s, piece, grid, (x, y) => { if (!out.some((q) => q.x === x && q.y === y)) out.push({ x, y }); }, empty);
    return out;
  }
  switch (piece.asPawn ? 'P' : piece.type) {
    case 'P': {
      const f = forward(piece.side);
      if (empty(piece.x, piece.y + f)) {
        out.push({ x: piece.x, y: piece.y + f });
        if (!piece.moved && empty(piece.x, piece.y + 2 * f)) out.push({ x: piece.x, y: piece.y + 2 * f });
      }
      for (const dx of [-1, 1]) if (foe(piece.x + dx, piece.y + f)) out.push({ x: piece.x + dx, y: piece.y + f });
      break;
    }
    case 'N':
      for (const d of KNIGHT) stepTo(piece.x + d.x, piece.y + d.y);
      break;
    case 'K':
      for (const d of ALL8) stepTo(piece.x + d.x, piece.y + d.y);
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
        if (foe(x, y)) out.push({ x, y });
      }
  }
  return out;
};

/** 사선에서 첫 적을 지나 더 맞힐 수 (관통 각인 · 레일 캐논 · 프리즘 코어) */
const pierceOf = (s: BattleState, piece: Piece): number => {
  let n = 0;
  if (piece.carve === 'pierce' && PIERCE_TYPES.includes(piece.type)) n += CARVE_FX.pierce;
  if (piece.type === 'R' && part(s, piece.side, 'rail')) n += 1;
  if (piece.type === 'B' && part(s, piece.side, 'prism')) n = Infinity;
  return n;
};

/**
 * 착지 칸 기준 공격 대상과 범위 (GDD 2장 §2.3): 지점 공격(폰·나이트·킹)은 지정 칸의 적을 모두,
 * 사선 공격(비숍·룩·퀸)은 방향마다 처음 만난 기물이 적일 때만 친다 (관통이면 더).
 */
export const attackScan = (s: BattleState, piece: Piece, grid: Grid = buildGrid(s)) => {
  const targets: Piece[] = [];
  const area: Pos[] = [];
  const point = (x: number, y: number) => {
    if (!inBounds(s, x, y)) return;
    area.push({ x, y });
    const p = at(s, grid, x, y);
    if (p && p.side !== piece.side) targets.push(p);
  };
  if (piece.form && !piece.asPawn) {
    // 사선 공격(대주교 · 총독의 비숍 · 룩 줄): 방향마다 처음 만난 기물이 적일 때만
    const line = (dirs: Pos[]) => {
      for (const d of dirs) {
        let x = piece.x + d.x, y = piece.y + d.y;
        while (inBounds(s, x, y)) {
          area.push({ x, y });
          const p = at(s, grid, x, y);
          if (p) { if (p.side !== piece.side) targets.push(p); break; }
          x += d.x; y += d.y;
        }
      }
    };
    formAttack(s, piece, grid, point, line, area, targets);
    return { targets: [...new Set(targets)], area };
  }
  switch (piece.asPawn ? 'P' : piece.type) {
    case 'P': {
      const f = forward(piece.side);
      point(piece.x - 1, piece.y + f);
      point(piece.x + 1, piece.y + f);
      break;
    }
    case 'N':
      for (const d of KNIGHT) point(piece.x + d.x, piece.y + d.y);
      break;
    case 'K':
      for (const d of ALL8) point(piece.x + d.x, piece.y + d.y);
      break;
    default: {
      const extra = pierceOf(s, piece);
      for (const d of SLIDE_DIRS[piece.type]!) {
        let x = piece.x + d.x;
        let y = piece.y + d.y;
        let pierce = extra;
        while (inBounds(s, x, y)) {
          area.push({ x, y });
          const p = at(s, grid, x, y);
          if (p) {
            if (p.side === piece.side) break;
            targets.push(p);
            if (pierce <= 0) break;
            pierce -= 1;
          }
          x += d.x;
          y += d.y;
        }
      }
    }
  }
  return { targets, area };
};

export const attackTargets = (s: BattleState, piece: Piece, grid: Grid = buildGrid(s)): Piece[] => attackScan(s, piece, grid).targets;

/** 공격 범위로 표시할 칸 (미리보기용) */
export const attackArea = (s: BattleState, piece: Piece, grid: Grid = buildGrid(s)): Pos[] => attackScan(s, piece, grid).area;

/** 공격하는 쪽 배율: 유형 부품 (렌즈 · 북 · 레일 · 폭군 · 단독) */
export const attackMult = (s: BattleState, a: Piece): number => {
  let m = 1;
  const side = a.side;
  if (a.type === 'B' && part(s, side, 'lens')) m *= PART_FX.lens;
  if (a.type === 'P' && part(s, side, 'drum')) m *= PART_FX.drum;
  if (a.type === 'R' && part(s, side, 'rail')) m *= PART_FX.rail;
  if (s.solo?.[side]) m *= PART_FX.soloDeal;
  return m;
};

/** 맞는 쪽 배율: 철갑 각인 · 킹 철모 · 근위 결속 · 단독 출하 · 반장 비틀기 */
export const takenMult = (s: BattleState, attacker: Piece | null, t: Piece): number => {
  let m = 1;
  if (t.carve === 'plate') m *= CARVE_FX.plateCut;
  if (t.type === 'K' && part(s, t.side, 'helmet')) m *= PART_FX.helmetCut;
  if (t.type !== 'K' && part(s, t.side, 'guard')) {
    const k = s.pieces.find((p) => p.side === t.side && p.type === 'K' && p.hp > 0);
    if (k && chebyshev(k, t) === 1) m *= PART_FX.guardCut;
  }
  if (s.solo?.[t.side]) m *= PART_FX.soloTake;
  if (attacker) {
    if (t.type === 'B' && twistOn(s, t, 'lens') && chebyshev(attacker, t) >= 2) m *= TWIST_FX.lensCut;
    const diagonal = attacker.x !== t.x && attacker.y !== t.y;
    if (t.type === 'R' && twistOn(s, t, 'wall') && !diagonal) m *= TWIST_FX.wallCut;
  }
  if (t.type === 'K' && twistOn(s, t, 'gild') && s.pieces.some((p) => p.side === t.side && p.id !== t.id && p.hp > 0 && chebyshev(p, t) === 1)) m *= TWIST_FX.gildCut;
  return m;
};

/**
 * 최종 피해량 (GDD 3장 §3.2): max(1, floor(ATK × 배율) − DEF) × 맞는 쪽 배율.
 * 미리보기 · AI · 실행이 모두 이 식 하나를 쓴다.
 */
/** 피해 = (공격력 + 합) × 곱 − 방어 (D-205: 합연산 · 곱연산을 정본으로) */
export const damageOf = (s: BattleState, attacker: Piece, target: Piece, multiplier = 1, add = 0): number => {
  const atk = Math.floor((attacker.atk + add) * attackMult(s, attacker) * multiplier);
  const raw = Math.max(1, atk - Math.max(0, target.def));
  return Math.max(1, Math.round(raw * takenMult(s, attacker, target) * (s.heat ?? 1)));
};
/** 고정 피해(충돌 · 폭격 · 증기 폭발 …)에 공정 열기를 건다 (D-454) — 양쪽 같은 배율 */
export const heatDmg = (s: BattleState, n: number): number => (n > 0 ? Math.max(1, Math.round(n * (s.heat ?? 1))) : 0);
