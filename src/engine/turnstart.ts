import { COLLAPSE, STRONGHOLD } from '../data/battle';
import { buildGrid, chebyshev, findPiece, inBounds, kingOf, roundOf } from './board';
import { Rng } from './rng';
import { attackArea, legalMoves } from './rules';
import { battleScore, inferiority, kingHpRatio } from './score';
import type { BattleEvent, BattleState, Pos, Side } from './types';

const rngFor = (s: BattleState) => new Rng((s.seed ^ Math.imul(s.turnNumber, 2654435761)) >>> 0);

const center = (s: BattleState): Pos => ({ x: (s.width - 1) / 2, y: (s.height - 1) / 2 });

// ---------- 붕괴하는 대성당 (D-014) ----------

const canCollapse = (s: BattleState): boolean => Math.min(s.width, s.height) - 2 * (s.ring + 1) >= COLLAPSE.minSize;

/** 테두리 한 줄을 무너뜨리고, 그 위의 기물을 안쪽 가장 가까운 빈칸으로 밀어낸다. 치명상은 주지 않는다. */
export const collapseRing = (s: BattleState, events: BattleEvent[]): void => {
  s.ring += 1;
  const pushes: { pieceId: number; from: Pos; to: Pos; damage: number }[] = [];
  const outside = s.pieces.filter((p) => !inBounds(s, p.x, p.y)).sort((a, b) => a.id - b.id);
  for (const p of outside) {
    const grid = buildGrid(s);
    const c = center(s);
    let best: Pos | null = null;
    let bestKey = Infinity;
    for (let y = s.ring; y < s.height - s.ring; y++) {
      for (let x = s.ring; x < s.width - s.ring; x++) {
        if (grid[y * s.width + x]) continue;
        const key = chebyshev(p, { x, y }) * 1000 + Math.abs(x - c.x) + Math.abs(y - c.y) + (y * s.width + x) / 1e4;
        if (key < bestKey) {
          bestKey = key;
          best = { x, y };
        }
      }
    }
    const from = { x: p.x, y: p.y };
    const damage = Math.min(p.hp - 1, Math.max(1, Math.ceil(p.maxHp * COLLAPSE.damagePct)));
    p.hp -= Math.max(0, damage);
    if (best) {
      p.x = best.x;
      p.y = best.y;
    }
    pushes.push({ pieceId: p.id, from, to: { x: p.x, y: p.y }, damage: Math.max(0, damage) });
  }
  events.push({ type: 'collapse', ring: s.ring, pushes });
  if (s.stronghold && !inBounds(s, s.stronghold.x, s.stronghold.y)) {
    s.stronghold = null;
    events.push({ type: 'strongholdLost' });
  }
};

// ---------- 요충지 (GDD 5장) ----------

/** 다음 턴에 `side`가 공격할 수 있는 칸 (이동 후 공격 범위의 합집합) */
const reachableAttacks = (s: BattleState, side: Side): Set<string> => {
  const grid = buildGrid(s);
  const out = new Set<string>();
  for (const p of s.pieces) {
    if (p.side !== side) continue;
    for (const to of legalMoves(s, p, grid)) {
      for (const a of attackArea(s, { ...p, x: to.x, y: to.y }, grid)) out.add(`${a.x},${a.y}`);
    }
  }
  return out;
};

/** 생성 위치 (GDD 5장 §5.2): 열세 진영에 더 가까운 빈칸 중, 1~2칸 거리 → 안전한 칸 → 가까운 순 */
export const strongholdSpot = (s: BattleState): Pos | null => {
  const sa = battleScore(s, 0);
  const sb = battleScore(s, 1);
  const losing: Side = sb < sa ? 1 : 0;
  const winning: Side = losing === 0 ? 1 : 0;
  const grid = buildGrid(s);
  const mine = s.pieces.filter((p) => p.side === losing);
  const theirs = s.pieces.filter((p) => p.side === winning);
  const danger = reachableAttacks(s, winning);
  const rng = rngFor(s);
  const dist = (pos: Pos, list: Pos[]) => list.reduce((m, q) => Math.min(m, chebyshev(pos, q)), Infinity);

  const cands: { pos: Pos; key: number[] }[] = [];
  for (let y = s.ring; y < s.height - s.ring; y++) {
    for (let x = s.ring; x < s.width - s.ring; x++) {
      if (grid[y * s.width + x]) continue;
      const pos = { x, y };
      const dl = dist(pos, mine);
      const dw = dist(pos, theirs);
      if (!(dl < dw)) continue;
      cands.push({ pos, key: [dl >= 1 && dl <= 2 ? 0 : 1, danger.has(`${x},${y}`) ? 1 : 0, dl, rng.next()] });
    }
  }
  if (!cands.length) {
    const mid = Math.floor((s.height - 1) / 2);
    for (let x = s.ring; x < s.width - s.ring; x++) if (!grid[mid * s.width + x]) cands.push({ pos: { x, y: mid }, key: [0, 0, 0, rng.next()] });
  }
  if (!cands.length) return null;
  cands.sort((a, b) => {
    for (let i = 0; i < a.key.length; i++) if (a.key[i] !== b.key[i]) return a.key[i] - b.key[i];
    return 0;
  });
  return cands[0].pos;
};

/** 점령 완료 → 열세 단계별 보상 (GDD 5장 §5.5). 긴급 전술 카드는 M4(카드 시스템)에서 지급한다. */
const capture = (s: BattleState, side: Side, holderId: number, events: BattleEvent[]): void => {
  const inf = inferiority(s, side);
  const tier: 1 | 2 | 3 =
    inf >= STRONGHOLD.tier3At || kingHpRatio(s, side) <= STRONGHOLD.tier3KingHp ? 3 : inf >= STRONGHOLD.tier2At ? 2 : 1;
  const holder = findPiece(s, holderId);
  if (tier === 1) {
    s.apBonus[side] += STRONGHOLD.tier1.ap;
    if (holder) holder.hp = Math.min(holder.maxHp, holder.hp + Math.round(holder.maxHp * STRONGHOLD.tier1.healPct));
  } else if (tier === 2) {
    s.apBonus[side] += STRONGHOLD.tier2.ap;
    for (const p of s.pieces) {
      if (p.side !== side) continue;
      p.buffAtkPct = STRONGHOLD.tier2.atkPct;
      p.buffDef = STRONGHOLD.tier2.def;
      p.buffTurns = STRONGHOLD.tier2.turns;
    }
  } else {
    s.apBonus[side] += STRONGHOLD.tier3.ap;
    const k = kingOf(s, side);
    if (k) k.shield += STRONGHOLD.tier3.kingShield;
  }
  s.stronghold = null;
  events.push({ type: 'strongholdCapture', side, pieceId: holderId, tier });
};

/**
 * 턴 시작 처리. 차례가 막 넘어온 진영(s.turnSide) 기준으로 실행한다.
 * 라운드 시작(플레이어 턴)에는 붕괴·요충지 생성을, 매 턴에는 요충지 유지·점령을 확인한다.
 */
export const beginTurn = (s: BattleState, events: BattleEvent[]): void => {
  if (s.turnSide === 0) {
    const round = roundOf(s);
    const { collapseStart, collapseInterval, strongholdRounds } = s.rules;
    if (collapseStart !== null && round >= collapseStart && (round - collapseStart) % collapseInterval === 0 && canCollapse(s)) {
      collapseRing(s, events);
    }
    if (!s.stronghold && strongholdRounds.includes(round)) {
      const pos = strongholdSpot(s);
      if (pos) {
        s.stronghold = { ...pos, holderId: null, hold: 0 };
        s.strongholdsSpawned += 1;
        events.push({ type: 'strongholdSpawn', pos });
      }
    }
  }

  const sh = s.stronghold;
  if (sh && sh.holderId !== null) {
    const holder = findPiece(s, sh.holderId);
    if (!holder || holder.x !== sh.x || holder.y !== sh.y) {
      sh.holderId = null;
      sh.hold = 0;
    } else if (holder.side === s.turnSide) {
      sh.hold += 1;
      if (sh.hold >= STRONGHOLD.holdTurns) capture(s, holder.side, holder.id, events);
    }
  }
};

/** 턴 종료 처리: 이 진영의 일시 버프 턴 수를 줄이고, 이번 턴 추가 AP를 비운다. */
export const endTurn = (s: BattleState): void => {
  const side = s.turnSide;
  for (const p of s.pieces) {
    if (p.side !== side || p.buffTurns <= 0) continue;
    p.buffTurns -= 1;
    if (p.buffTurns === 0) {
      p.buffAtkPct = 0;
      p.buffDef = 0;
    }
  }
  s.apBonus[side] = 0;
};
