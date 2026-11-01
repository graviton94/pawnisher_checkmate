import { COLLAPSE, RESIGN, STALL } from '../data/battle';
import { PART_FX } from '../data/parts';
import { buildGrid, chebyshev, inBounds, roundOf } from './board';
import { applyPromotion } from './plan';
import { part } from './rules';
import { otherSide, type BattleEvent, type BattleState, type Pos } from './types';

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

/**
 * 정체 압박 (GDD 12장 F1, D-072): 새 라운드가 시작될 때 지난 라운드를 판정한다.
 * 서로 다가가는 첫 STALL.grace 라운드는 세지 않는다. 피해 없는 라운드가 STALL.rounds번 이어지면 이번 라운드부터 붕괴를 시작한다.
 */
const stallCheck = (s: BattleState, round: number, events: BattleEvent[]): void => {
  const st = { count: 0, dealt: false, ...s.stall }; // 새 객체 — 입력 상태를 바꾸지 않는다 (결정론)
  if (round - 1 > STALL.grace) {
    st.count = st.dealt ? 0 : st.count + 1;
    if (st.count > 0) events.push({ type: 'stall', count: Math.min(st.count, STALL.rounds), need: STALL.rounds });
    const start = s.rules.collapseStart;
    if (st.count >= STALL.rounds && start !== null && start > round) s.rules = { ...s.rules, collapseStart: round };
  }
  st.dealt = false;
  s.stall = st;
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

/**
 * 턴 시작 처리. 차례가 막 넘어온 진영(s.turnSide) 기준으로 실행한다.
 * 라운드 시작(플레이어 턴)에는 정체 판정과 무너지는 판을, 매 턴에는 겹 장갑을 처리한다.
 */
export const beginTurn = (s: BattleState, events: BattleEvent[]): void => {
  // 명예로운 항복 (D-077): 적 차례 시작에 적에게 킹만 남았고 내 기물이 넉넉하면 끝낸다 (죽은 턴 없애기)
  if (s.turnSide === 1) {
    const theirs = s.pieces.filter((p) => p.side === 1);
    const mine = s.pieces.filter((p) => p.side === 0 && p.type !== 'K').length;
    if (theirs.length === 1 && theirs[0].type === 'K' && mine >= RESIGN.minMine) {
      events.push({ type: 'resign', side: 1, pieceId: theirs[0].id });
      s.winner = 0;
      events.push({ type: 'gameOver', winner: 0 });
      return;
    }
  }
  const side = s.turnSide;
  // 겹 장갑 (부품): 자기 턴 시작마다 모든 아군 방열판
  if (part(s, side, 'plate')) {
    for (const p of s.pieces) {
      if (p.side !== side) continue;
      p.shield += PART_FX.plateShield;
      events.push({ type: 'shield', pieceId: p.id, amount: PART_FX.plateShield });
    }
  }
  if (s.turnSide === 0) {
    const round = roundOf(s);
    stallCheck(s, round, events);
    const { collapseStart, collapseInterval } = s.rules;
    if (collapseStart !== null && round >= collapseStart && (round - collapseStart) % collapseInterval === 0) {
      // 정체가 이어지면 더 빨리 무너진다 (끝판 킹 숨바꼭질 방지)
      const steps = 1 + Math.max(0, (s.stall?.count ?? 0) - STALL.rounds + 1);
      for (let i = 0; i < steps && s.winner === null; i++) if (!collapseStep(s, events)) suddenDeath(s, events);
    }
  }
};

/** 턴 종료 처리: 이번 턴 추가 태엽을 비운다 */
export const endTurn = (s: BattleState): void => {
  s.apBonus[s.turnSide] = 0;
};
