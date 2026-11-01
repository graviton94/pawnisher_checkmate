import { PIECE_STATS } from '../data/pieces';
import { attackScan, buildGrid, chebyshev, cloneState, createBattle, damageOf, findPiece, forward, inBounds, kingOf, legalMoves, makePiece, moveCost, samePos, simulate, type BattleEvent, type BattleState, type Piece, type PieceType, type Pos } from '../engine';
import { PART_NUM, type SlicePartId } from './parts';
import { CREW, QUIRKS, type Crew, type QuirkId } from './crew';
import { Rng } from '../engine/rng';
import { BOSS, COMMANDS, PUSH, SLICE, type CommandId } from './cards';

/**
 * 수직 조각 대국 (분대 + 명령 덱, D-142). 화면과 무관한 순수 로직.
 * 내 차례: 손패 5장 · 태엽 3. 카드를 내면 바로 움직이고 친다 (연쇄 배수는 턴 안에서 이어진다).
 * 적 차례: 내 차례가 시작될 때 예고한 수(갈 칸 · 칠 칸)만 그대로 실행한다 — 예고는 거짓말을 하지 않는다.
 *   예고한 적이 쓰러졌으면 취소, 갈 칸이 막혔으면 취소, 칠 칸에서 비킨 기물은 맞지 않는다.
 */

/** 분대의 기물 하나: 유형 + 남은 HP (대국 사이에 이어진다) */
export type Squad = Crew;

/** 기벽을 반영한 최대 HP */
export const crewMaxHp = (u: { t: PieceType; quirk?: QuirkId }): number => Math.round(PIECE_STATS[u.t].hp * (u.quirk ? QUIRKS[u.quirk].hp ?? 1 : 1));

/** 이 대국에서 쓰러진 분대원 기록 (사망 의식 · 원부) */
export interface Fall {
  pieceId: number;
  by: string;
  turn: number;
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
  /** 남은 되감기 (대국마다 한 번, 이중 테이프면 두 번) */
  rewinds: number;
  /** 부품 (규칙을 깨는 유물, D-144) */
  parts: SlicePartId[];
  /** 이번 턴에 처치한 내 기물 (재도약) */
  killers: number[];
  /** 이 대국에서 넘친 피해 합 (이기면 나사로) */
  overkill: number;
  /** 반장 판 (철갑 · 줄 폭격) */
  boss: boolean;
  /** 다음 적 차례에 폭격할 줄 (y) — 예고 */
  bombRow: number | null;
  /** 턴마다 태엽 · 손패 (여분 태엽이면 +1 · −1) */
  apMax: number;
  handSize: number;
  /** 이번 턴 시작 모습 (되감기용) */
  snap: string;
  /** 분대 기물 id ↔ 분대 번호 */
  squadIds: number[];
  /** 분대원 기벽 (기물 id → 기벽) */
  quirks: Record<number, QuirkId>;
  /** 이 대국 처치 수 (기물 id → 적 유형별) */
  pk: Record<number, Partial<Record<PieceType, number>>>;
  /** 반장 킹을 쓰러뜨린 기물 */
  bossKiller: number | null;
  /** 이 대국에서 쓰러진 분대원 */
  falls: Fall[];
  /** 문턱을 넘은 분대원 */
  doorUsed: number[];
  /** 턴에 한 번 효과 (풀린 브레이크) */
  once: string[];
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
export const chainMult = (kills: number, parts: SlicePartId[] = []): number =>
  // 덧셈(기본: +25%씩, 상한 4) → 곱셈(증폭 코일: ×1.5씩, 상한 없음) — 3단 성장의 둘째 단 (D-145)
  parts.includes('coil') ? Math.pow(PART_NUM.coilPerKill, kills) : 1 + Math.min(kills, SLICE.chainCap) * SLICE.chainPerKill;

/** 처치 k개가 올리는 연쇄 칸 (이중 톱니 · 연속 도약은 재발동 — 3단 성장의 셋째 단) */
const chainGain = (b: SliceBattle, k: number, perKill = 1): number => k * perKill * (has(b, 'echo') ? 2 : 1);

/** 넘친 피해 (적 HP를 넘어선 만큼) — 나사로 바꾼다 (Inscryption 오버킬) */
export const overkillOf = (before: BattleState, events: BattleEvent[]): number => {
  const hp = new Map(before.pieces.filter((p) => p.side === 1).map((p) => [p.id, p.hp]));
  let over = 0;
  for (const e of events) {
    if (e.type !== 'attack') continue;
    for (const h of e.hits) {
      const cur = hp.get(h.targetId);
      if (cur === undefined) continue;
      const through = h.damage - h.shieldAbsorbed;
      if (through > cur) over += through - cur;
      hp.set(h.targetId, Math.max(0, cur - through));
    }
  }
  return over;
};

const has = (b: SliceBattle, id: SlicePartId) => b.parts.includes(id);

/** 카드의 실제 태엽 (행진 북 · 재도약). pieceId를 주면 그 기물로 낼 때 */
export const costOf = (b: SliceBattle, i: number, pieceId?: number): number => {
  const c = COMMANDS[b.hand[i]];
  if (!c) return 99;
  if (c.freeIfKiller && pieceId !== undefined && b.killers.includes(pieceId)) return 0;
  const pawnCard = c.who === 'P' || c.kind === 'march';
  return Math.max(0, c.cost - (pawnCard && has(b, 'drum') ? 1 : 0));
};

/** 킹 옆 빈 칸 (앞쪽부터) — 징집 · 조립 라인 */
const spawnPawn = (b: SliceBattle, label: string): BattleEvent | null => {
  const k = kingOf(b.s, 0);
  if (!k) return null;
  const f = forward(0);
  const cand: Pos[] = [];
  for (const dy of [f, 0, -f]) for (const dx of [0, -1, 1]) if (dx || dy) cand.push({ x: k.x + dx, y: k.y + dy });
  const spot = cand.find((q) => inBounds(b.s, q.x, q.y) && !b.s.pieces.some((p) => p.x === q.x && p.y === q.y));
  if (!spot) return null;
  const id = Math.max(...b.s.pieces.map((p) => p.id), ...b.squadIds, 0) + 1;
  b.s.pieces.push(makePiece(id, 'P', 0, spot.x, spot.y));
  return { type: 'respawn', pieceId: id, pos: spot, label };
};

export const newSliceBattle = (squad: Squad[], enemy: PieceType[], deck: CommandId[], seed: number, opts: { width?: number; height?: number; enemyKingHp?: number; parts?: SlicePartId[]; boss?: boolean; /** 손으로 만든 판: 기물을 이 칸으로 옮긴다 (유형 · 진영의 첫 기물) */ place?: { side: 0 | 1; t: PieceType; x: number; y: number }[] } = {}): SliceBattle => {
  const s = createBattle({ width: opts.width ?? 6, height: opts.height ?? 6, decks: [squad.map((u) => u.t), enemy], seed, rules: { collapseStart: null, collapseInterval: 1, checkmate: true, foresight: 1 } });
  // 분대 HP 이어 붙이기: 같은 유형 안에서 순서대로
  const used = new Set<number>();
  const squadIds = squad.map((u) => {
    const p = s.pieces.find((q) => q.side === 0 && q.type === u.t && !used.has(q.id))!;
    used.add(p.id);
    // 기벽: 최대 HP · 방열판 · 공격 · 문턱
    const q = u.quirk ? QUIRKS[u.quirk] : null;
    p.maxHp = crewMaxHp(u);
    p.hp = p.maxHp;
    if (q?.shield) p.shield += q.shield;
    if (q?.atk) p.atk = Math.round(p.atk * q.atk);
    if (u.hp !== undefined) p.hp = Math.max(1, Math.min(p.maxHp, u.hp));
    const doors = q ? (q.doors ?? 1) : 1;
    if (p.type !== 'K') for (let k = 0; k < doors; k++) (s.doorIds ??= []).push(p.id);
    return p.id;
  });
  const quirks: Record<number, QuirkId> = {};
  squad.forEach((u, i) => u.quirk && (quirks[squadIds[i]] = u.quirk));
  for (const q of opts.place ?? []) {
    const p = s.pieces.find((r) => r.side === q.side && r.type === q.t);
    if (p && !s.pieces.some((r) => r.x === q.x && r.y === q.y)) Object.assign(p, { x: q.x, y: q.y });
  }
  if (opts.enemyKingHp) {
    const k = kingOf(s, 1)!;
    k.maxHp = k.hp = Math.round(k.maxHp * opts.enemyKingHp);
  }
  const rng = new Rng(seed ^ 0x9e3779b9);
  const parts = opts.parts ?? [];
  const spare = parts.includes('spare') ? 1 : 0;
  const b: SliceBattle = { s, draw: shuffle(rng, deck), hand: [], discard: [], ap: SLICE.ap + spare, kills: 0, turn: 1, intents: [], coins: SLICE.coins, rewinds: parts.includes('tape') ? 2 : 1, parts, killers: [], overkill: 0, boss: !!opts.boss, bombRow: null, apMax: SLICE.ap + spare, handSize: SLICE.hand - spare, snap: '', squadIds, quirks, pk: {}, bossKiller: null, falls: [], doorUsed: [], once: [], rng: rng.state, warned: false };
  drawCards(b, b.handSize);
  bossTurnStart(b);
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
  if (b.bombRow !== null) for (let x = 0; x < b.s.width; x++) out.set(`${x},${b.bombRow}`, { x, y: b.bombRow });
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
    if (e.type !== 'attack' && e.type !== 'blast') continue;
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
  if (!c || b.s.winner !== null) return [];
  if (isInstant(b.hand[i])) return [];
  return b.s.pieces.filter((p) => p.side === 0 && (c.who === 'any' || c.who === p.type) && costOf(b, i, p.id) <= b.ap && (c.kind !== 'move' || legalMoves(b.s, p).length > 0));
};

/** 기물을 고르지 않고 바로 내는 카드 (재장전 · 불씨 · 행진 · 징집) */
export const isInstant = (id: CommandId): boolean => ['draw', 'spark', 'march', 'draft', 'gambit'].includes(COMMANDS[id].kind);

/** 이 카드를 지금 낼 수 있나 */
export const canPlay = (b: SliceBattle, i: number): boolean => {
  const c = COMMANDS[b.hand[i]];
  if (!c || b.s.winner !== null) return false;
  if (isInstant(b.hand[i])) return costOf(b, i) <= b.ap && (c.kind !== 'march' || marchPlan(b).length > 0) && (c.kind !== 'draft' || !!kingOf(b.s, 0)) && (c.kind !== 'gambit' || b.s.pieces.some((p) => p.side === 0 && p.type === 'P'));
  return cardPieces(b, i).length > 0;
};

/** 행진: 폰마다 곧장 한 칸 앞 (앞의 폰부터, 막혔으면 제자리) */
const marchPlan = (b: SliceBattle, near?: Pos): { pieceId: number; to: Pos }[] => {
  const f = forward(0);
  const pawns = b.s.pieces.filter((p) => p.side === 0 && p.type === 'P' && (!near || chebyshev(p, near) === 1)).sort((x, y) => (x.y - y.y) * f * -1);
  return pawns.flatMap((p) => {
    const to = { x: p.x, y: p.y + f };
    return legalMoves(b.s, p).some((q) => samePos(q, to)) ? [{ pieceId: p.id, to }] : [];
  });
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
    const rage = c.rage ? Math.min(3, 1 + (2 * (p.maxHp - p.hp)) / p.maxHp) : 1;
    const crown = p.type === 'K' && has(b, 'crown') ? PART_NUM.crownMult : 1;
    const perKill = c.multPerKill ? 1 + b.kills * c.multPerKill : 1;
    const sim = simulate(s, [{ pieceId, to }], { freeAp: true, mult: (c.mult ?? 1) * chainMult(b.kills, b.parts) * rage * crown * perKill });
    if (!sim.ok) return null;
    if (c.push) applyPush(b, sim, pieceId);
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
  if (!c) return '없는 카드입니다.';
  const cost = costOf(b, i, pieceId);
  if (cost > b.ap) return '‘태엽이 모자라.’';
  const before = cloneState(b.s);
  let events: BattleEvent[] = [];
  let gained = 0;
  if (c.kind === 'move') {
    if (pieceId === undefined || !to) return '기물과 칸을 선택하십시오.';
    const p = findPiece(b.s, pieceId);
    if (!p || p.side !== 0 || (c.who !== 'any' && c.who !== p.type)) return '이 카드로 움직일 수 없는 기물입니다.';
    const sim = previewPlay(b, i, pieceId, to);
    if (!sim) return '갈 수 없는 칸입니다.';
    b.s = sim.state;
    events = sim.events;
    b.overkill += overkillOf(before, sim.events);
    let k = sim.removed.filter((q) => q.side === 1).length;
    b.kills += chainGain(b, k, c.chainPerKill);
    // 둘레의 폰이 따라 전진한다 (기마 돌격 · 근위대)
    const landed = findPiece(b.s, pieceId);
    if (c.rally && landed && b.s.winner === null) {
      const plan = marchPlan(b, landed);
      const mid = cloneState(b.s);
      const s2 = plan.length ? simulate(b.s, plan, { freeAp: true, mult: chainMult(b.kills, b.parts) }) : null;
      if (s2 && s2.ok) {
        b.s = s2.state;
        events = [...events, ...s2.events];
        b.overkill += overkillOf(mid, s2.events);
        const k2 = s2.removed.filter((q) => q.side === 1).length;
        b.kills += chainGain(b, k2);
        k += k2;
      }
    }
    if (k > 0) {
      if (!b.killers.includes(pieceId)) b.killers.push(pieceId);
      // 편자: 나이트가 처치하면 태엽 +1 (처치마다)
      if (p.type === 'N' && has(b, 'horseshoe')) {
        gained += k;
        events.push({ type: 'apGain', side: 0, amount: k });
      }
      drawCards(b, (has(b, 'magnet') ? k : 0) + (c.drawOnKill ? c.drawOnKill * k : 0));
    }
    // 이동식 옥좌: 킹 카드를 내면 킹 방열판
    const pk = findPiece(b.s, pieceId);
    if (pk && pk.type === 'K' && has(b, 'throne')) {
      pk.shield += PART_NUM.throneShield;
      events.push({ type: 'shield', pieceId: pk.id, amount: PART_NUM.throneShield });
    }
  } else if (c.kind === 'march') {
    const plan = marchPlan(b);
    if (!plan.length) return '‘앞으로 갈 폰이 없어.’';
    const sim = simulate(b.s, plan, { freeAp: true, mult: (c.mult ?? 1) * chainMult(b.kills, b.parts) });
    if (!sim.ok) return '‘앞으로 갈 폰이 없어.’';
    b.s = sim.state;
    events = sim.events;
    b.overkill += overkillOf(before, sim.events);
    b.kills += chainGain(b, sim.removed.filter((q) => q.side === 1).length);
    if (has(b, 'magnet')) drawCards(b, sim.removed.filter((q) => q.side === 1).length);
  } else if (c.kind === 'draft') {
    const e = spawnPawn(b, '징집 — 폰이 선다');
    if (!e) return '킹 곁에 빈 칸이 없습니다.';
    events = [e];
  } else if (c.kind === 'gambit') {
    // 희생 수: 이번 대국만 선 폰(징집 · 조립 라인)부터, 그다음 HP가 낮은 폰
    const pawns = b.s.pieces.filter((p) => p.side === 0 && p.type === 'P').sort((x, y) => Number(b.squadIds.includes(x.id)) - Number(b.squadIds.includes(y.id)) || x.hp - y.hp);
    const v = pawns[0];
    if (!v) return '바칠 폰이 없습니다.';
    b.s.pieces = b.s.pieces.filter((p) => p.id !== v.id);
    events = [{ type: 'attack', order: 0, attackerId: v.id, area: [{ x: v.x, y: v.y }], hits: [{ targetId: v.id, damage: v.hp, shieldAbsorbed: 0, hpAfter: 0, killed: true }] }];
    b.kills += 2;
    drawCards(b, 1);
  } else if (c.kind === 'spark') {
    b.kills += 1;
    drawCards(b, 1);
  } else if (c.kind === 'shield' || c.kind === 'repair') {
    const p = pieceId !== undefined ? findPiece(b.s, pieceId) : undefined;
    if (!p || p.side !== 0) return '내 기물을 선택하십시오.';
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
  creditKills(b, before, events, c.kind === 'move' ? pieceId : undefined);
  b.ap = b.ap - cost + gained;
  // 뽑기로 손패가 늘었을 수 있다: 낸 카드는 그 자리에서 뺀다
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
/**
 * 밀치기 (D-154): 이 기물이 친 적(살아남은)을 친 방향으로 한 칸 민다.
 * 빈 칸이면 밀려난다(예고가 어긋날 수 있다). 벽 · 기물에 막히면 밀린 적과 부딪힌 기물이 둘 다 충돌 피해(적끼리면 오사).
 * 미리보기 · 실행이 같은 함수 (결과가 누르기 전에 보인다).
 */
const applyPush = (b: SliceBattle, sim: { state: BattleState; events: BattleEvent[]; removed: Piece[] }, pieceId: number): void => {
  const s = sim.state;
  const me = findPiece(s, pieceId);
  if (!me) return;
  const dmg = PUSH.collide * (b.parts.includes('hammer') ? PART_NUM.hammerMult : 1);
  const targets = sim.events.flatMap((e) => (e.type === 'attack' && e.attackerId === pieceId ? e.hits.filter((h) => !h.killed) : []));
  for (const h of targets) {
    const t = findPiece(s, h.targetId);
    if (!t || t.side === 0) continue;
    const dx = Math.sign(t.x - me.x), dy = Math.sign(t.y - me.y);
    const to = { x: t.x + dx, y: t.y + dy };
    const blocker = s.pieces.find((p) => p.x === to.x && p.y === to.y);
    if (inBounds(s, to.x, to.y) && !blocker) {
      sim.events.push({ type: 'move', order: 0, pieceId: t.id, from: { x: t.x, y: t.y }, to });
      t.x = to.x;
      t.y = to.y;
      continue;
    }
    // 충돌: 밀린 적 + 부딪힌 기물
    const hits = [t, ...(blocker ? [blocker] : [])].map((p) => {
      const absorbed = Math.min(p.shield, dmg);
      p.shield -= absorbed;
      p.hp = Math.max(0, p.hp - (dmg - absorbed));
      return { targetId: p.id, damage: dmg, shieldAbsorbed: absorbed, hpAfter: p.hp, killed: p.hp <= 0 };
    });
    sim.events.push({ type: 'blast', pos: { x: t.x, y: t.y }, label: blocker ? '충돌!' : '벽 충돌!', hits });
    for (const x of hits.filter((x) => x.killed)) {
      const dead = findPiece(s, x.targetId)!;
      sim.removed.push(dead);
      if (dead.type === 'K') s.winner = dead.side === 1 ? 0 : 1;
    }
    s.pieces = s.pieces.filter((p) => p.hp > 0);
  }
};

/** 처치 기록 (분대원 처치 수 · 반장 처치) */
const creditKills = (b: SliceBattle, before: BattleState, events: BattleEvent[], mover?: number): void => {
  for (const e of events) {
    // 충돌 처치(밀치기)는 민 기물의 처치로 센다
    if (e.type !== 'attack' && !(e.type === 'blast' && mover !== undefined)) continue;
    const by = e.type === 'attack' ? e.attackerId : mover!;
    for (const h of e.hits) {
      if (!h.killed) continue;
      const t = before.pieces.find((p) => p.id === h.targetId);
      if (!t || t.side !== 1) continue;
      const rec = (b.pk[by] ??= {});
      rec[t.type] = (rec[t.type] ?? 0) + 1;
      if (t.type === 'K' && b.boss) b.bossKiller = by;
    }
  }
};

/** 적 차례 뒤처리: 맞은 원한의 톱니 · 문턱 · 쓰러진 분대원 기록 · 새는 보일러 터짐 */
const afterEnemyHits = (b: SliceBattle, before: BattleState, events: BattleEvent[], by: string): BattleEvent[] => {
  const extra: BattleEvent[] = [];
  for (const e of events) {
    if (e.type !== 'attack' && e.type !== 'blast') continue;
    const attacker = e.type === 'attack' ? before.pieces.find((p) => p.id === e.attackerId) : null;
    for (const h of e.hits) {
      if (!b.squadIds.includes(h.targetId)) continue;
      if (h.door) b.doorUsed.push(h.targetId);
      if (h.killed && !b.falls.some((f) => f.pieceId === h.targetId)) {
        b.falls.push({ pieceId: h.targetId, by: attacker ? `적 ${PIECE_LABEL[attacker.type]}` : by, turn: b.turn });
        const dead = before.pieces.find((p) => p.id === h.targetId);
        if (dead && b.quirks[h.targetId] === 'boiler') {
          const hits = b.s.pieces.filter((p) => p.side === 1 && chebyshev(p, dead) === 1).map((p) => {
            const absorbed = Math.min(p.shield, CREW.boilerBlast);
            p.shield -= absorbed;
            p.hp = Math.max(0, p.hp - (CREW.boilerBlast - absorbed));
            return { targetId: p.id, damage: CREW.boilerBlast, shieldAbsorbed: absorbed, hpAfter: p.hp, killed: p.hp <= 0 };
          });
          const kingDead = hits.some((x) => x.killed && findPiece(b.s, x.targetId)?.type === 'K');
          b.s.pieces = b.s.pieces.filter((p) => p.hp > 0);
          if (kingDead) b.s = { ...b.s, winner: 0 };
          extra.push({ type: 'blast', pos: { x: dead.x, y: dead.y }, label: '보일러 폭발!', hits });
        }
      }
    }
  }
  return extra;
};

const PIECE_LABEL: Record<PieceType, string> = { K: '킹', Q: '퀸', R: '룩', B: '비숍', N: '나이트', P: '폰' };

/** 반장 턴 시작: 철갑을 다시 두르고, 폭격 줄을 예고한다 (내 기물 값이 가장 많이 모인 줄) */
const bossTurnStart = (b: SliceBattle): void => {
  if (!b.boss) return;
  const k = kingOf(b.s, 1);
  if (k && (b.turn - 1) % BOSS.plateEvery === 0) k.shield = Math.max(k.shield, BOSS.plate);
  b.bombRow = null;
  if (b.turn % BOSS.bombEvery !== 0) return;
  const rows = new Map<number, number>();
  for (const p of b.s.pieces) if (p.side === 0) rows.set(p.y, (rows.get(p.y) ?? 0) + valueOf(p));
  const best = [...rows.entries()].sort((x, y) => y[1] - x[1] || x[0] - y[0])[0];
  if (best) b.bombRow = best[0];
};

/** 줄 폭격 실행 */
const bombard = (b: SliceBattle): BattleEvent | null => {
  if (b.bombRow === null) return null;
  const row = b.bombRow;
  const hits = b.s.pieces.filter((p) => p.side === 0 && p.y === row).map((p) => {
    const absorbed = Math.min(p.shield, BOSS.bombDamage);
    p.shield -= absorbed;
    p.hp = Math.max(0, p.hp - (BOSS.bombDamage - absorbed));
    return { targetId: p.id, damage: BOSS.bombDamage, shieldAbsorbed: absorbed, hpAfter: p.hp, killed: p.hp <= 0 };
  });
  const kingDead = hits.some((h) => h.killed && findPiece(b.s, h.targetId)?.type === 'K');
  b.s.pieces = b.s.pieces.filter((p) => p.hp > 0);
  if (kingDead) b.s = { ...b.s, winner: 1 };
  return { type: 'blast', pos: { x: Math.floor(b.s.width / 2), y: row }, label: '줄 폭격!', hits };
};

const enemyPhase = (b: SliceBattle): { events: BattleEvent[] } => {
  const events: BattleEvent[] = [];
  for (const it of b.intents) {
    if (b.s.winner !== null) break;
    const p = findPiece(b.s, it.pieceId);
    if (!p) continue;
    const s1 = { ...b.s, turnSide: 1 as const };
    const sim = simulate(s1, [it], { freeAp: true });
    if (!sim.ok) continue;
    const mid = b.s;
    b.s = { ...sim.state, turnSide: 0 };
    events.push(...sim.events);
    const extra = afterEnemyHits(b, mid, sim.events, '적');
    if (extra.length) {
      events.push(...extra);
      if (b.s.winner !== null) events.push({ type: 'gameOver', winner: b.s.winner });
    }
  }
  if (b.s.winner === null) {
    const pre = cloneState(b.s);
    const bomb = bombard(b);
    if (bomb) {
      events.push(bomb);
      events.push(...afterEnemyHits(b, pre, [bomb], '줄 폭격'));
      if (b.s.winner !== null) events.push({ type: 'gameOver', winner: b.s.winner });
    }
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
    b.ap = b.apMax;
    b.kills = 0;
    b.killers = [];
    b.once = [];
    b.warned = false;
    // 조립 라인: 폰이 적으면 킹 옆에 하나
    if (has(b, 'assembly') && b.s.pieces.filter((p) => p.side === 0 && p.type === 'P').length <= PART_NUM.assemblyBelow) {
      const e = spawnPawn(b, '조립 라인 — 폰이 나온다');
      if (e) events.push(e);
    }
    drawCards(b, b.handSize);
    bossTurnStart(b);
    b.intents = planEnemy(b.s);
    b.snap = JSON.stringify({ ...b, snap: '' });
  }
  return { events, before };
};

/** 되감기: 이번 턴 처음으로 (대국마다 한 번) */
export const rewind = (b: SliceBattle): SliceBattle | string => {
  if (b.rewinds <= 0) return '되감기를 모두 사용했습니다.';
  const back = JSON.parse(b.snap) as SliceBattle;
  back.rewinds = b.rewinds - 1;
  back.snap = b.snap;
  return back;
};

/** 대국이 끝난 뒤 분대: 살아남은 기물만 남기고 HP를 이어 간다 */
export const squadAfter = (b: SliceBattle, squad: Squad[]): Squad[] =>
  squad.flatMap((u, i) => {
    const p = findPiece(b.s, b.squadIds[i]);
    return p ? [growCrew(b, u, b.squadIds[i], p.hp, p.type)] : [];
  });

/** 대국 뒤 성장: 처치 · 대국 수 · 흉터 · 별명 (자동으로 붙는다 — 레퍼런스 6권 원리 3 · 5) */
export const growCrew = (b: SliceBattle, u: Squad, id: number, hp: number, t: PieceType = u.t): Squad => {
  const kills = Object.values(b.pk[id] ?? {}).reduce((a, n) => a + (n ?? 0), 0);
  const c: Squad = { ...u, t, hp, kills: (u.kills ?? 0) + kills, battles: (u.battles ?? 0) + 1, scars: [...(u.scars ?? [])] };
  if (b.doorUsed.includes(id) && !c.scars!.includes('납땜 자국')) c.scars!.push('납땜 자국');
  if ((c.battles ?? 0) >= CREW.scarAfterBattles && !c.scars!.includes('용접 흉터')) c.scars!.push('용접 흉터');
  if (b.bossKiller === id) c.nick = '반장 사냥꾼';
  else if (!c.nick && (c.kills ?? 0) >= CREW.nickAfterKills) {
    const top = Object.entries(b.pk[id] ?? {}).sort((x, y) => (y[1] ?? 0) - (x[1] ?? 0))[0];
    c.nick = `${PIECE_LABEL[(top?.[0] as PieceType) ?? 'P']} 분쇄기`;
  }
  return c;
};

/** 이 대국에서 쓰러진 분대원 (원부 · 유품용) */
export const fallenAfter = (b: SliceBattle, squad: Squad[]): { crew: Squad; fall: Fall }[] =>
  squad.flatMap((u, i) => {
    const id = b.squadIds[i];
    if (findPiece(b.s, id)) return [];
    const fall = b.falls.find((f) => f.pieceId === id) ?? { pieceId: id, by: '알 수 없음', turn: b.turn };
    return [{ crew: growCrew(b, u, id, 0), fall }];
  });

/** 판 사이 회복 (사용자: 누적되면 너무 약해진다): 살아남은 분대는 최대 HP의 일부를 되찾는다 */
export const REST = { heal: 0.3, reviveHp: 0.5, overhaul: 0.25 };

/** 대국 사이 기본 회복 — 남은 기물 모두 최대 HP의 30% */
export const restSquad = (squad: Squad[]): Squad[] => squad.map((u) => ({ ...u, hp: Math.min(crewMaxHp(u), (u.hp ?? crewMaxHp(u)) + Math.round(crewMaxHp(u) * REST.heal)) }));

/** 정비 (보상 대신 고를 수 있다): 쓰러진 기물 하나를 HP 50%로 되살리고, 모두 25% 더 */
export const overhaulSquad = (squad: Squad[], fallen: Squad[]): { squad: Squad[]; revived?: Squad } => {
  const revived = [...fallen].sort((a, b) => PIECE_STATS[b.t].value - PIECE_STATS[a.t].value)[0];
  const healed = squad.map((u) => ({ ...u, hp: Math.min(crewMaxHp(u), (u.hp ?? crewMaxHp(u)) + Math.round(crewMaxHp(u) * REST.overhaul)) }));
  return revived ? { squad: [...healed, { ...revived, hp: Math.round(crewMaxHp(revived) * REST.reviveHp) }], revived } : { squad: healed };
};
