import { WEAKS, type WeakId } from '../data/legions';
import type { LegendId } from '../data/legends';
import { at, buildGrid, forward, inBounds, onStronghold, type Grid } from './board';
import { strongholdTerms } from './score';
import type { EnchantId } from '../data/enchants';
import { VARIANTS, type VariantId } from '../data/variants';
import type { BattleState, Piece, PieceType, Pos, Side } from './types';

const ORTHO: Pos[] = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
const DIAG: Pos[] = [{ x: 1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: -1, y: -1 }];
const ALL8: Pos[] = [...ORTHO, ...DIAG];
const KNIGHT: Pos[] = [
  { x: 1, y: 2 }, { x: 2, y: 1 }, { x: 2, y: -1 }, { x: 1, y: -2 },
  { x: -1, y: -2 }, { x: -2, y: -1 }, { x: -2, y: 1 }, { x: -1, y: 2 },
];

const SLIDE_DIRS: Partial<Record<PieceType, Pos[]>> = { B: DIAG, R: ORTHO, Q: ALL8 };

/** 진영이 보유한 인챈트 중첩 수 (없으면 0) */
export const ench = (s: BattleState, side: Side, id: EnchantId): number => s.loadouts?.[side]?.enchants[id] ?? 0;

/** 이 기물이 반장 약점 id를 가졌나 (D-113) */
export const weakOn = (s: BattleState, p: Piece, id: WeakId): boolean => {
  if (!s.weak || s.weak.id !== id || p.side !== s.weak.side) return false;
  const on = WEAKS[id].on;
  return on === 'variant' ? !!p.variant : on === 'affix' ? !!p.affix : on.includes(p.type);
};

/** 에픽 부품을 가졌나 (D-112) */
export const legend = (s: BattleState, side: Side, id: LegendId): boolean => !!s.loadouts?.[side]?.legends?.includes(id);

/** 이번 턴 이 기물의 행마·공격 유형들: 폼 시프트 > 합체 구성 > 자기 유형 */
export const moveTypes = (piece: Piece): PieceType[] => (piece.formAs ? [piece.formAs] : (piece.fused ?? [piece.type]));

/** 이 기물에 이형 거푸집이 살아 있는가: 원래 유형 그대로일 때만 (승급·합체·폼 시프트 중엔 꺼짐) */
export const variantOn = (piece: Piece, id: VariantId): boolean =>
  piece.variant === id && piece.type === VARIANTS[id].base && !piece.fused && !piece.formAs;

/** 유효 보드 가장자리 칸인가 (E10) */
export const onEdge = (s: BattleState, p: Pos): boolean =>
  !inBounds(s, p.x - 1, p.y) || !inBounds(s, p.x + 1, p.y) || !inBounds(s, p.x, p.y - 1) || !inBounds(s, p.x, p.y + 1);

/** 그 줄에서 남아 있는 가장 왼쪽·오른쪽 칸 (E10 ★ 좌우 연결용) */
const rowEnds = (s: BattleState, y: number): [number, number] => {
  let lo = 0;
  let hi = s.width - 1;
  while (lo < s.width && !inBounds(s, lo, y)) lo++;
  while (hi >= 0 && !inBounds(s, hi, y)) hi--;
  return [lo, hi];
};

/**
 * 기물이 갈 수 있는 빈 칸 (GDD 2장 §2.2, §2.4).
 * 정통 체스 행마. 착지는 빈 칸만, 슬라이딩은 모든 기물에 막히고, 나이트는 도약한다.
 * 합체 기물은 구성 유형의 행마를 모두 가진다. 증기 기관 장갑 2장이면 룩 행마가 아군을 뛰어넘는다.
 */
export const legalMoves = (s: BattleState, piece: Piece, grid: Grid = buildGrid(s)): Pos[] => {
  const out: Pos[] = [];
  // 자석판에 붙잡힌 턴에는 못 움직인다 (D-097)
  if (piece.stuckTurn === s.turnNumber) return out;
  const seen = new Set<string>();
  const push = (x: number, y: number) => {
    const k = `${x},${y}`;
    if (!seen.has(k)) {
      seen.add(k);
      out.push({ x, y });
    }
  };
  const empty = (x: number, y: number) => inBounds(s, x, y) && !at(s, grid, x, y);
  const slide = (dirs: Pos[], jumpAllies: boolean) => {
    for (const d of dirs) {
      let x = piece.x + d.x;
      let y = piece.y + d.y;
      while (inBounds(s, x, y)) {
        const o = at(s, grid, x, y);
        if (!o) push(x, y);
        else if (!(jumpAllies && o.side === piece.side)) break;
        x += d.x;
        y += d.y;
      }
    }
  };

  for (const type of moveTypes(piece)) {
    switch (type) {
      case 'P': {
        const f = forward(piece.side);
        if (empty(piece.x, piece.y + f)) {
          push(piece.x, piece.y + f);
          if (!piece.moved && !variantOn(piece, 'conveyor') && empty(piece.x, piece.y + 2 * f)) push(piece.x, piece.y + 2 * f);
        }
        break;
      }
      case 'N':
        for (const d of KNIGHT) if (empty(piece.x + d.x, piece.y + d.y)) push(piece.x + d.x, piece.y + d.y);
        break;
      case 'K':
        // 최후의 일격: 퀸처럼 끝까지 미끄러져 이동할 수 있다 (D-015)
        if (strikeReady(s, piece)) slide(ALL8, false);
        else for (const d of ALL8) if (empty(piece.x + d.x, piece.y + d.y)) push(piece.x + d.x, piece.y + d.y);
        break;
      default:
        slide(SLIDE_DIRS[type]!, type === 'R' && ench(s, piece.side, 'E03') >= 2);
    }
  }
  return out;
};

export interface AttackOptions {
  /** 사선에서 첫 적을 지나 더 칠 적의 수 (관통 마법탄 등) */
  pierce?: number;
}

/**
 * 착지 칸 기준 공격 대상과 공격 범위 (GDD 2장 §2.3, §2.4).
 * 지점 공격(폰·나이트·킹)은 지정 칸의 적을 모두, 사선 공격(비숍·룩·퀸)은 방향마다 처음 만난 기물이 적일 때만 친다.
 * 인챈트: 폰 부채꼴(E04), 비숍 아군 통과·관통(E02), 좌우 연결(E10 ★).
 */
export const attackScan = (s: BattleState, piece: Piece, grid: Grid = buildGrid(s), opts: AttackOptions = {}) => {
  const targets: Piece[] = [];
  const area: Pos[] = [];
  /** 사선이 앞의 적을 꿰뚫고 맞힌 대상 (관통 키워드) */
  const pierced = new Set<number>();
  const tSeen = new Set<number>();
  const aSeen = new Set<string>();
  const addArea = (x: number, y: number) => {
    const k = `${x},${y}`;
    if (!aSeen.has(k)) {
      aSeen.add(k);
      area.push({ x, y });
    }
  };
  const addTarget = (p: Piece) => {
    if (!tSeen.has(p.id)) {
      tSeen.add(p.id);
      targets.push(p);
    }
  };
  const point = (x: number, y: number) => {
    if (!inBounds(s, x, y)) return;
    addArea(x, y);
    const p = at(s, grid, x, y);
    if (p && p.side !== piece.side) addTarget(p);
  };
  const wrap = ench(s, piece.side, 'E10') >= 3;

  for (const type of moveTypes(piece)) {
    switch (type) {
      case 'P': {
        const f = forward(piece.side);
        point(piece.x - 1, piece.y + f);
        point(piece.x + 1, piece.y + f);
        if (ench(s, piece.side, 'E04') >= 1) point(piece.x, piece.y + f);
        break;
      }
      case 'N':
        for (const d of KNIGHT) point(piece.x + d.x, piece.y + d.y);
        break;
      case 'K':
        for (const d of ALL8) point(piece.x + d.x, piece.y + d.y);
        break;
      default: {
        const bishopLevel = type === 'B' ? ench(s, piece.side, 'E02') : 0;
        // 천공 드릴 (E18): 사선 기물 모두 관통 1 · ★ 끝까지
        const drill = ench(s, piece.side, 'E18');
        const basePierce = (opts.pierce ?? 0) + (bishopLevel >= 3 ? Infinity : bishopLevel >= 2 ? 1 : 0) + (drill >= 3 ? Infinity : drill >= 1 ? 1 : 0);
        // 반사경 비숍 (이형): 대각 사선이 판 가장자리에 닿으면 한 번 꺾인다
        const mirror = type === 'B' && variantOn(piece, 'mirror');
        for (const d of SLIDE_DIRS[type]!) {
          let dx = d.x;
          let dy = d.y;
          let x = piece.x + dx;
          let y = piece.y + dy;
          let pierce = basePierce;
          let allyPass = bishopLevel >= 1 ? 1 : 0;
          let bounce = mirror ? 1 : 0;
          let steps = 0;
          let passed = false;
          while (steps++ < s.width * s.height) {
            if (wrap && dx !== 0 && y >= 0 && y < s.height && !inBounds(s, x, y)) {
              const [minX, maxX] = rowEnds(s, y);
              if (x < minX || x > maxX) x = x < minX ? maxX : minX;
            }
            if (!inBounds(s, x, y) && bounce > 0) {
              bounce -= 1;
              const px = x - dx;
              const py = y - dy;
              if (!inBounds(s, px + dx, py)) dx = -dx;
              if (!inBounds(s, px, py + dy)) dy = -dy;
              x = px + dx;
              y = py + dy;
            }
            if (!inBounds(s, x, y) || (x === piece.x && y === piece.y)) break;
            addArea(x, y);
            const p = at(s, grid, x, y);
            if (p) {
              if (p.side !== piece.side) {
                addTarget(p);
                if (passed) pierced.add(p.id);
                passed = true;
                if (pierce <= 0) break;
                pierce -= 1;
              } else {
                if (allyPass <= 0) break;
                allyPass -= 1;
              }
            }
            x += dx;
            y += dy;
          }
        }
      }
    }
  }
  return { targets, area, pierced };
};

export const attackTargets = (s: BattleState, piece: Piece, grid: Grid = buildGrid(s), opts: AttackOptions = {}): Piece[] =>
  attackScan(s, piece, grid, opts).targets;

/** 공격 범위로 표시할 칸 (미리보기용). 사선은 처음 만난 기물 칸까지 포함한다. */
export const attackArea = (s: BattleState, piece: Piece, grid: Grid = buildGrid(s), opts: AttackOptions = {}): Pos[] =>
  attackScan(s, piece, grid, opts).area;

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
  let mult = multiplier;
  // 공간 왜곡 기어 1장: 가장자리 칸에서 공격하면 ATK +30%
  if (ench(s, attacker.side, 'E10') >= 1 && onEdge(s, attacker)) mult *= 1.3;
  const atk = Math.floor(attacker.atk * (1 + attacker.buffAtkPct) * mult);
  // 과부하 원자로(E06 ★): DEF 5 무시
  const ignore = ench(s, attacker.side, 'E06') >= 3 ? 5 : 0;
  let dmg = Math.max(1, atk - Math.max(0, target.def + target.buffDef - ignore));
  if (onStronghold(s, target)) {
    dmg = Math.max(1, Math.floor(dmg * (1 - strongholdTerms(s, target.side).cover)));
  }
  // 근위대 결속 1장: 킹과 붙어 있는 아군은 받는 피해 −20%
  if (target.type !== 'K' && ench(s, target.side, 'E08') >= 1) {
    const k = s.pieces.find((p) => p.side === target.side && p.type === 'K');
    if (k && Math.max(Math.abs(k.x - target.x), Math.abs(k.y - target.y)) === 1) dmg = Math.max(1, Math.floor(dmg * 0.8));
  }
  return dmg;
};
