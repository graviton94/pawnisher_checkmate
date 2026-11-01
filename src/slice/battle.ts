import { PIECE_STATS } from '../data/pieces';
import { attackScan, buildGrid, chebyshev, cloneState, createBattle, damageOf, findPiece, kingOf, legalMoves, moveCost, samePos, simulate, type BattleEvent, type BattleState, type Piece, type PieceType, type Pos } from '../engine';
import { Rng } from '../engine/rng';
import { COMMANDS, SLICE, type CommandId } from './cards';

/**
 * 수직 조각 대국 (분대 + 명령 덱, D-142). 화면과 무관한 순수 로직.
 * 내 차례: 손패 5장 · 태엽 3. 카드를 내면 바로 움직이고 친다 (연쇄 배수는 턴 안에서 이어진다).
 * 적 차례: 내 차례가 시작될 때 예고한 수(갈 칸 · 칠 칸)만 그대로 실행한다 — 예고는 거짓말을 하지 않는다.
 *   예고한 적이 쓰러졌으면 취소, 갈 칸이 막혔으면 취소, 칠 칸에서 비킨 기물은 맞지 않는다.
 */

/** 분대의 기물 하나: 유형 + 남은 HP (대국 사이에 이어진다) */
export interface Squad {
  t: PieceType;
  hp?: number;
}

/** 적의 예고 한 건 */
export interface Intent {
  pieceId: number;
  to: Pos;
}

export interface SliceBattle {
  s: BattleState;
  draw: CommandId[];
  hand: CommandId[];
  discard: CommandId[];
  ap: number;
  /** 이번 턴 처치 수 (연쇄) */
  kills: number;
  turn: number;
  intents: Intent[];
  /** 나사 트랙 */
  coins: number;
  /** 되감기를 썼나 (대국마다 한 번) */
  rewound: boolean;
  /** 이번 턴 시작 모습 (되감기용) */
  snap: string;
  /** 분대 기물 id ↔ 분대 번호 */
  squadIds: number[];
  rng: number;
  /** 자살 수 경고를 이미 보였나 (이번 턴) */
  warned: boolean;
}

const shuffle = <T>(rng: Rng, a: T[]): T[] => {
  const out = [...a];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

const drawCards = (b: SliceBattle, n: number): void => {
  const rng = new Rng(b.rng);
  for (let i = 0; i < n; i++) {
    if (!b.draw.length) {
      b.draw = shuffle(rng, b.discard);
      b.discard = [];
    }
    const c = b.draw.shift();
    if (c) b.hand.push(c);
  }
  b.rng = rng.state;
};

/** 연쇄 배수 (이번 턴 처치 수 기준) */
export const chainMult = (kills: number): number => 1 + Math.min(kills, SLICE.chainCap) * SLICE.chainPerKill;

export const newSliceBattle = (squad: Squad[], enemy: PieceType[], deck: CommandId[], seed: number, opts: { width?: number; height?: number; enemyKingHp?: number } = {}): SliceBattle => {
  const s = createBattle({ width: opts.width ?? 6, height: opts.height ?? 6, decks: [squad.map((u) => u.t), enemy], seed, rules: { collapseStart: null, collapseInterval: 1, checkmate: true, foresight: 1 } });
  // 분대 HP 이어 붙이기: 같은 유형 안에서 순서대로
  const used = new Set<number>();
  const squadIds = squad.map((u) => {
    const p = s.pieces.find((q) => q.side === 0 && q.type === u.t && !used.has(q.id))!;
    used.add(p.id);
    if (u.hp !== undefined) p.hp = Math.max(1, Math.min(p.maxHp, u.hp));
    return p.id;
  });
  if (opts.enemyKingHp) {
    const k = kingOf(s, 1)!;
    k.maxHp = k.hp = Math.round(k.maxHp * opts.enemyKingHp);
  }
  const rng = new Rng(seed ^ 0x9e3779b9);
  const b: SliceBattle = { s, draw: shuffle(rng, deck), hand: [], discard: [], ap: SLICE.ap, kills: 0, turn: 1, intents: [], coins: SLICE.coins, rewound: false, snap: '', squadIds, rng: rng.state, warned: false };
  drawCards(b, SLICE.hand);
  b.intents = planEnemy(b.s);
  b.snap = JSON.stringify(b);
  return b;
};

// ---------- 적 예고 (단순한 AI — Into the Breach식: 수는 단순해도 다 보인다) ----------
const valueOf = (p: Piece) => (p.type === 'K' ? 300 : PIECE_STATS[p.type].value);

/** 적의 이번 수: 태엽 3 안에서, 내 기물을 가장 아프게 치는 칸부터. 칠 게 없으면 내 킹 쪽으로 */
export const planEnemy = (s0: BattleState): Intent[] => {
  const s = { ...s0, turnSide: 1 as const };
  const grid = buildGrid(s);
  const myKing = kingOf(s, 0);
  const options: { pieceId: number; to: Pos; score: number; cost: number }[] = [];
  for (const p of s.pieces.filter((q) => q.side === 1)) {
    let best: { to: Pos; score: number } | null = null;
    for (const to of legalMoves(s, p, grid)) {
      const ghost = { ...p, x: to.x, y: to.y };
      let score = 0;
      for (const t of attackScan(s, ghost, grid).targets) {
        const dmg = damageOf(s, ghost, t);
        score += dmg >= t.hp + t.shield ? valueOf(t) + dmg : (dmg / t.maxHp) * valueOf(t);
      }
      // 칠 게 없으면 내 킹에게 다가간다 (킹은 뒤에 남는다)
      if (score === 0 && myKing && p.type !== 'K') score = (chebyshev(p, myKing) - chebyshev(to, myKing)) * 2;
      if (!best || score > best.score) best = { to, score };
    }
    if (best && best.score > 0) options.push({ pieceId: p.id, to: best.to, score: best.score, cost: moveCost(s, p) });
  }
  options.sort((a, b) => b.score - a.score || a.pieceId - b.pieceId);
  const out: Intent[] = [];
  let ap = SLICE.enemyAp;
  const taken = new Set<string>();
  for (const o of options) {
    if (o.cost > ap || taken.has(`${o.to.x},${o.to.y}`)) continue;
    ap -= o.cost;
    taken.add(`${o.to.x},${o.to.y}`);
    out.push({ pieceId: o.pieceId, to: o.to });
  }
  return out;
};

/** 지금 보드에서 예고가 칠 칸 (내 수로 막히면 바뀐다 — 화면은 늘 지금 기준) */
export const dangerSquares = (b: SliceBattle): Pos[] => {
  const out = new Map<string, Pos>();
  for (const it of liveIntents(b)) {
    const p = findPiece(b.s, it.pieceId)!;
    const ghostState = { ...b.s, pieces: b.s.pieces.filter((q) => q.id !== p.id) };
    for (const a of attackScan(ghostState, { ...p, x: it.to.x, y: it.to.y }).area) out.set(`${a.x},${a.y}`, a);
  }
  return [...out.values()];
};

/** 아직 살아 있고 갈 칸이 열려 있는 예고 */
export const liveIntents = (b: SliceBattle): Intent[] =>
  b.intents.filter((it) => {
    const p = findPiece(b.s, it.pieceId);
    if (!p) return false;
    return legalMoves({ ...b.s, turnSide: 1 }, p).some((q) => samePos(q, it.to));
  });

/** 예고대로 두면 맞을 내 기물 (화면 HP 깜빡임용) */
export const intentHits = (b: SliceBattle): { pieceId: number; pos: Pos; damage: number; killed: boolean }[] => {
  const after = enemyPhase(cloneBattle(b)).events;
  const dmg = new Map<number, { damage: number; killed: boolean }>();
  for (const e of after) {
    if (e.type !== 'attack') continue;
    for (const h of e.hits) {
      const cur = dmg.get(h.targetId) ?? { damage: 0, killed: false };
      dmg.set(h.targetId, { damage: cur.damage + h.damage, killed: cur.killed || h.killed });
    }
  }
  return [...dmg.entries()].flatMap(([id, d]) => {
    const p = findPiece(b.s, id);
    return p && p.side === 0 ? [{ pieceId: id, pos: { x: p.x, y: p.y }, ...d }] : [];
  });
};

const cloneBattle = (b: SliceBattle): SliceBattle => JSON.parse(JSON.stringify(b)) as SliceBattle;

// ---------- 내 차례 ----------
/** 이 카드를 낼 수 있는 내 기물 */
export const cardPieces = (b: SliceBattle, i: number): Piece[] => {
  const c = COMMANDS[b.hand[i]];
  if (!c || c.cost > b.ap || b.s.winner !== null) return [];
  if (c.kind === 'draw') return [];
  return b.s.pieces.filter((p) => p.side === 0 && (c.who === 'any' || c.who === p.type) && (c.kind !== 'move' || legalMoves(b.s, p).length > 0));
};

/** 이 카드 · 이 기물로 갈 수 있는 칸 */
export const cardMoves = (b: SliceBattle, i: number, pieceId: number): Pos[] => {
  const c = COMMANDS[b.hand[i]];
  const p = findPiece(b.s, pieceId);
  if (!c || c.kind !== 'move' || !p) return [];
  return legalMoves(b.s, p);
};

/** 카드 한 장을 미리 실행해 본다 (화면 미리보기 · 실제 실행이 같은 식) */
export const previewPlay = (b: SliceBattle, i: number, pieceId: number, to?: Pos) => {
  const c = COMMANDS[b.hand[i]];
  const s = cloneState(b.s);
  const p = findPiece(s, pieceId);
  if (!c || !p) return null;
  if (c.kind === 'move' && to) {
    if (c.carve) p.carve = c.carve;
    const sim = simulate(s, [{ pieceId, to }], { freeAp: true, mult: (c.mult ?? 1) * chainMult(b.kills) });
    if (!sim.ok) return null;
    // 카드 각인은 이번 공격에만
    const after = findPiece(sim.state, pieceId);
    const orig = findPiece(b.s, pieceId);
    if (after) after.carve = orig?.carve;
    return sim;
  }
  return null;
};

/**
 * 카드를 낸다. 움직이는 카드는 pieceId · to, 방열판 · 땜질은 pieceId, 재장전은 없이.
 * 실행 사건을 돌려준다 (화면 연출용). 못 내면 이유 문자열.
 */
export const playCard = (b: SliceBattle, i: number, pieceId?: number, to?: Pos): { events: BattleEvent[]; before: BattleState } | string => {
  const id = b.hand[i];
  const c = COMMANDS[id];
  if (!c) return '없는 카드';
  if (c.cost > b.ap) return '태엽이 모자라다.';
  const before = cloneState(b.s);
  let events: BattleEvent[] = [];
  if (c.kind === 'move') {
    if (pieceId === undefined || !to) return '기물과 칸을 고른다.';
    const p = findPiece(b.s, pieceId);
    if (!p || p.side !== 0 || (c.who !== 'any' && c.who !== p.type)) return '이 카드로 움직일 수 없는 기물이다.';
    const sim = previewPlay(b, i, pieceId, to);
    if (!sim) return '갈 수 없는 칸이다.';
    b.s = sim.state;
    events = sim.events;
    b.kills += sim.removed.filter((q) => q.side === 1).length;
  } else if (c.kind === 'shield' || c.kind === 'repair') {
    const p = pieceId !== undefined ? findPiece(b.s, pieceId) : undefined;
    if (!p || p.side !== 0) return '내 기물을 고른다.';
    if (c.kind === 'shield') {
      p.shield += c.amount ?? 0;
      events = [{ type: 'shield', pieceId: p.id, amount: c.amount ?? 0 }];
    } else {
      const heal = Math.min(p.maxHp - p.hp, c.amount ?? 0);
      p.hp += heal;
      events = [{ type: 'heal', pieceId: p.id, amount: heal }];
    }
  } else if (c.kind === 'draw') {
    drawCards(b, c.amount ?? 0);
  }
  b.ap -= c.cost;
  b.hand.splice(i, 1);
  b.discard.push(id);
  return { events, before };
};

/** 내 킹이 예고된 칸에 서 있나 (자살 수 경고) */
export const kingInDanger = (b: SliceBattle): boolean => {
  const k = kingOf(b.s, 0);
  return !!k && intentHits(b).some((h) => h.pieceId === k.id);
};

// ---------- 적 차례 ----------
/** 예고를 그대로 실행한다. 다음 내 차례를 준비하지는 않는다 */
const enemyPhase = (b: SliceBattle): { events: BattleEvent[] } => {
  const events: BattleEvent[] = [];
  for (const it of b.intents) {
    if (b.s.winner !== null) break;
    const p = findPiece(b.s, it.pieceId);
    if (!p) continue;
    const s1 = { ...b.s, turnSide: 1 as const };
    const sim = simulate(s1, [it], { freeAp: true });
    if (!sim.ok) continue;
    b.s = { ...sim.state, turnSide: 0 };
    events.push(...sim.events);
  }
  return { events };
};

/**
 * 내 차례를 끝낸다: 남은 손패를 버리고 · 적이 예고대로 두고 · 나사 한 칸이 사라지고 · 새 손패와 새 예고.
 * 'warn' = 내 킹이 예고된 칸에 있다 (한 번 묻는다).
 */
export const endTurn = (b: SliceBattle, force = false): { events: BattleEvent[]; before: BattleState } | 'warn' => {
  if (!force && !b.warned && kingInDanger(b)) {
    b.warned = true;
    return 'warn';
  }
  const before = cloneState(b.s);
  b.discard.push(...b.hand);
  b.hand = [];
  const { events } = enemyPhase(b);
  b.coins = Math.max(0, b.coins - 1);
  if (b.s.winner === null) {
    b.turn += 1;
    b.s = { ...b.s, turnNumber: b.s.turnNumber + 2, turnSide: 0 };
    b.ap = SLICE.ap;
    b.kills = 0;
    b.warned = false;
    drawCards(b, SLICE.hand);
    b.intents = planEnemy(b.s);
    b.snap = JSON.stringify({ ...b, snap: '' });
  }
  return { events, before };
};

/** 되감기: 이번 턴 처음으로 (대국마다 한 번) */
export const rewind = (b: SliceBattle): SliceBattle | string => {
  if (b.rewound) return '되감기는 대국마다 한 번.';
  const back = JSON.parse(b.snap) as SliceBattle;
  back.rewound = true;
  back.snap = b.snap;
  return back;
};

/** 대국이 끝난 뒤 분대: 살아남은 기물만 남기고 HP를 이어 간다 */
export const squadAfter = (b: SliceBattle, squad: Squad[]): Squad[] =>
  squad.flatMap((_u, i) => {
    const p = findPiece(b.s, b.squadIds[i]);
    return p ? [{ t: p.type, hp: p.hp }] : [];
  });

/** 판 사이 회복 (사용자: 누적되면 너무 약해진다): 살아남은 분대는 최대 HP의 일부를 되찾는다 */
export const REST = { heal: 0.3, reviveHp: 0.5, overhaul: 0.25 };

/** 대국 사이 기본 회복 — 남은 기물 모두 최대 HP의 30% */
export const restSquad = (squad: Squad[]): Squad[] => squad.map((u) => ({ t: u.t, hp: Math.min(maxHpOf(u.t), (u.hp ?? maxHpOf(u.t)) + Math.round(maxHpOf(u.t) * REST.heal)) }));

/** 정비 (보상 대신 고를 수 있다): 쓰러진 기물 하나를 HP 50%로 되살리고, 모두 25% 더 */
export const overhaulSquad = (squad: Squad[], fallen: PieceType[]): { squad: Squad[]; revived?: PieceType } => {
  const revived = [...fallen].sort((a, b) => PIECE_STATS[b].value - PIECE_STATS[a].value)[0];
  const healed = squad.map((u) => ({ t: u.t, hp: Math.min(maxHpOf(u.t), (u.hp ?? maxHpOf(u.t)) + Math.round(maxHpOf(u.t) * REST.overhaul)) }));
  return revived ? { squad: [...healed, { t: revived, hp: Math.round(maxHpOf(revived) * REST.reviveHp) }], revived } : { squad: healed };
};

const maxHpOf = (t: PieceType) => PIECE_STATS[t].hp;
