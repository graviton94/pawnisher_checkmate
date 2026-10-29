import { COLLAPSE, STRONGHOLD } from '../data/battle';
import { buildGrid, chebyshev, findPiece, inBounds, kingOf, roundOf } from './board';
import { Rng } from './rng';
import { applyPromotion, availableAp } from './plan';
import { attackArea, ench, legalMoves } from './rules';
import { battleScore, inferiority, kingHpRatio, standingOf, strongholdTerms } from './score';
import { otherSide, type BattleEvent, type BattleState, type Pos, type Side } from './types';

const rngFor = (s: BattleState) => new Rng((s.seed ^ Math.imul(s.turnNumber, 2654435761)) >>> 0);

const center = (s: BattleState): Pos => ({ x: (s.width - 1) / 2, y: (s.height - 1) / 2 });

// ---------- 붕괴하는 대성당 (D-014) ----------

/**
 * 다음에 무너질 칸 한 쌍: 바깥 테두리부터, 각 테두리 안에서는 모서리에 가까운 칸부터.
 * 180° 회전한 맞은편 칸과 한 쌍으로 무너져 양 진영에 공평하다. 짧은 변이 minSize보다 작아지는 줄은 무너뜨리지 않는다.
 */
const nextCollapse = (s: BattleState): Pos[] => {
  const fallen = new Set(s.fallen ?? []);
  for (let k = 0; Math.min(s.width, s.height) - 2 * (k + 1) >= COLLAPSE.minSize; k++) {
    const x0 = k;
    const y0 = k;
    const x1 = s.width - 1 - k;
    const y1 = s.height - 1 - k;
    const tiles: Pos[] = [];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if ((x === x0 || x === x1 || y === y0 || y === y1) && !fallen.has(y * s.width + x)) tiles.push({ x, y });
    if (!tiles.length) continue;
    const cornerDist = (p: Pos) => Math.min(Math.abs(p.x - x0), Math.abs(p.x - x1)) + Math.min(Math.abs(p.y - y0), Math.abs(p.y - y1));
    tiles.sort((a, b) => cornerDist(a) - cornerDist(b) || a.y * s.width + a.x - (b.y * s.width + b.x));
    const first = tiles[0];
    const twin = { x: s.width - 1 - first.x, y: s.height - 1 - first.y };
    const out = [first];
    if (!fallen.has(twin.y * s.width + twin.x) && (twin.x !== first.x || twin.y !== first.y)) out.push(twin);
    return out.slice(0, COLLAPSE.tilesPerEvent);
  }
  return [];
};

/** 다음 라운드 시작에 무너질 칸 (화면 예고용). 붕괴가 아직 멀었으면 빈 배열 */
export const upcomingCollapse = (s: BattleState): Pos[] => {
  const start = s.rules.collapseStart;
  if (start === null || roundOf(s) + 1 < start) return [];
  return nextCollapse(s);
};

/** 완전히 무너진 테두리 줄 수 */
const fullRings = (s: BattleState): number => {
  let k = 0;
  for (; k < Math.min(s.width, s.height) / 2; k++) {
    for (let y = k; y < s.height - k; y++)
      for (let x = k; x < s.width - k; x++) if ((x === k || x === s.width - 1 - k || y === k || y === s.height - 1 - k) && inBounds(s, x, y)) return k;
  }
  return k;
};

/** 칸 한 쌍을 무너뜨리고, 그 위의 기물을 가장 가까운 빈칸으로 밀어낸다. 치명상은 주지 않는다. 무너질 곳이 없으면 false */
export const collapseStep = (s: BattleState, events: BattleEvent[]): boolean => {
  const tiles = nextCollapse(s);
  if (!tiles.length) return false;
  s.fallen = [...(s.fallen ?? []), ...tiles.map((p) => p.y * s.width + p.x)];
  s.ring = fullRings(s);
  const pushes: { pieceId: number; from: Pos; to: Pos; damage: number }[] = [];
  const outside = s.pieces.filter((p) => !inBounds(s, p.x, p.y)).sort((a, b) => a.id - b.id);
  for (const p of outside) {
    const grid = buildGrid(s);
    const c = center(s);
    let best: Pos | null = null;
    let bestKey = Infinity;
    for (let y = 0; y < s.height; y++) {
      for (let x = 0; x < s.width; x++) {
        if (!inBounds(s, x, y) || grid[y * s.width + x]) continue;
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
  events.push({ type: 'collapse', ring: s.ring, tiles, pushes });
  // 끝줄이 무너져 더 나아갈 수 없게 된 폰은 그 자리에서 승급한다
  for (const p of s.pieces) {
    const before = p.type;
    if (applyPromotion(s, p)) events.push({ type: 'promote', pieceId: p.id, from: before, to: p.type });
  }
  if (s.stronghold && !inBounds(s, s.stronghold.x, s.stronghold.y)) {
    s.stronghold = null;
    events.push({ type: 'strongholdLost' });
  }
  return true;
};

/** 더 무너질 곳이 없으면 대성당이 킹을 짓누른다: HP 비율이 낮은 킹부터 최대 HP의 10% (치명상 가능) */
const suddenDeath = (s: BattleState, events: BattleEvent[]): void => {
  const kings = s.pieces.filter((p) => p.type === 'K').sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp || a.side - b.side);
  const hits: { pieceId: number; damage: number; hpAfter: number }[] = [];
  for (const k of kings) {
    const damage = Math.max(1, Math.ceil(k.maxHp * COLLAPSE.suddenDeathPct));
    k.hp = Math.max(0, k.hp - damage);
    hits.push({ pieceId: k.id, damage, hpAfter: k.hp });
    if (k.hp <= 0) {
      s.pieces = s.pieces.filter((p) => p !== k);
      s.winner = otherSide(k.side);
      events.push({ type: 'suddenDeath', hits });
      events.push({ type: 'gameOver', winner: s.winner });
      return;
    }
  }
  events.push({ type: 'suddenDeath', hits });
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
  for (let y = 0; y < s.height; y++) {
    for (let x = 0; x < s.width; x++) {
      if (!inBounds(s, x, y) || grid[y * s.width + x]) continue;
      const pos = { x, y };
      const dl = dist(pos, mine);
      const dw = dist(pos, theirs);
      if (!(dl < dw)) continue;
      cands.push({ pos, key: [dl >= 1 && dl <= 2 ? 0 : 1, danger.has(`${x},${y}`) ? 1 : 0, dl, rng.next()] });
    }
  }
  if (!cands.length) {
    const mid = Math.floor((s.height - 1) / 2);
    for (let x = 0; x < s.width; x++) if (inBounds(s, x, mid) && !grid[mid * s.width + x]) cands.push({ pos: { x, y: mid }, key: [0, 0, 0, rng.next()] });
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
  events.push({ type: 'strongholdCapture', side, pieceId: holderId, tier, behind: inf > 0 });
};

/**
 * 턴 시작 처리. 차례가 막 넘어온 진영(s.turnSide) 기준으로 실행한다.
 * 라운드 시작(플레이어 턴)에는 붕괴·요충지 생성을, 매 턴에는 요충지 유지·점령을 확인한다.
 */
export const beginTurn = (s: BattleState, events: BattleEvent[]): void => {
  // 이월된 AP (마공학 축전기 2장 · 연쇄 지휘 체계 2장)
  const side = s.turnSide;
  if (s.apCarry[side] > 0) {
    s.apBonus[side] += s.apCarry[side];
    events.push({ type: 'apGain', side, amount: s.apCarry[side] });
    s.apCarry[side] = 0;
  }
  // 근위대 결속 2장: 킹과 붙어 있는 아군에 보호막 +10
  if (ench(s, side, 'E08') >= 2) {
    const k = kingOf(s, side);
    if (k) {
      for (const p of s.pieces) {
        if (p.side === side && p.id !== k.id && chebyshev(p, k) === 1) {
          p.shield += 10;
          events.push({ type: 'shield', pieceId: p.id, amount: 10 });
        }
      }
    }
  }

  if (s.turnSide === 0) {
    const round = roundOf(s);
    const { collapseStart, collapseInterval, strongholdRounds } = s.rules;
    if (collapseStart !== null && round >= collapseStart && (round - collapseStart) % collapseInterval === 0) {
      if (!collapseStep(s, events)) suddenDeath(s, events);
      if (s.winner !== null) return;
    }
    if (!s.stronghold && strongholdRounds.includes(round)) {
      const pos = strongholdSpot(s);
      if (pos) {
        s.stronghold = { ...pos, holderId: null, hold: 0 };
        s.strongholdsSpawned += 1;
        events.push({ type: 'strongholdSpawn', pos, standings: [standingOf(s, 0), standingOf(s, 1)] });
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
      if (sh.hold >= strongholdTerms(s, holder.side).hold) capture(s, holder.side, holder.id, events);
    }
  }
};

/** 턴 종료 처리: 버프·카드 쿨타임·폼 시프트를 정리하고, 이번 턴 추가 AP를 비운다 (축전기 2장이면 1까지 이월). */
export const endTurn = (s: BattleState, apUsed = 0): void => {
  const side = s.turnSide;
  if (ench(s, side, 'E06') >= 2) {
    const left = availableAp(s) - apUsed;
    if (left > 0) s.apCarry[side] += 1;
  }
  for (const c of s.cards[side]) if (c.cooldown > 0) c.cooldown -= 1;
  for (const p of s.pieces) if (p.side === side) p.formAs = null;
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
