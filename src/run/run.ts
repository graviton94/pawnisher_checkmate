import { ASC, ascOn } from '../data/ascension';
import { CARVES, CARVE_IDS, type CarveId } from '../data/carves';
import { GRADE_ORDER, PITY, type Grade } from '../data/grades';
import { PARTS, PART_FX, PART_IDS, PART_SLOTS, type PartId } from '../data/parts';
import { PIECE_NAMES_KO, PIECE_STATS } from '../data/pieces';
import {
  BOSSES,
  DECK_MAX,
  FINAL_BOSS,
  FLOORS_PER_ACT,
  NODE_WEIGHTS,
  PAIR_OPTIONS,
  PART_GRADE_WEIGHT,
  PIECE_REWARD_WEIGHTS,
  SHOP,
  SKIP_GOLD,
  START_DECKS,
  START_GOLD,
  THREATS,
  TOTAL_FLOORS,
  TYPE_MAX,
  actOf,
  battleGold,
  eliteFrom,
  inAct,
  type BossId,
  type NodeKind,
  type ThreatId,
} from '../data/run';
import { Rng } from '../engine/rng';
import { toUnits, type Deck, type Unit } from '../engine/setup';
import type { BattleState, PieceType } from '../engine/types';
import { EVENTS, EVENT_IDS, PACT_VICTIMS, type EventId } from './events';
import { generateEncounter, type Encounter } from './legion';

/**
 * 출하(등반 한 번)의 상태와 진행 규칙 (규격 2.0). 화면과 무관한 순수 로직이며 JSON으로 그대로 저장된다.
 * 성장 축은 셋: 군단(deck) · 각인(기물마다 하나) · 부품(parts 다섯 칸). 조작 함수는 run을 직접 바꾸고, 실패하면 이유를 돌려준다.
 */

export interface MapNode {
  kind: NodeKind;
  event?: EventId;
}

/** 양날 한 쌍: 내 부품 + 적 강화 */
export interface Pair {
  part: PartId;
  threats: ThreatId[];
}

/** 보상 고르기 */
export type Choice =
  /** 일반 대국: 기물 둘 + 각인 하나 (`piece:N` · `carve:cross`) */
  | { type: 'mixed'; options: string[] }
  | { type: 'piece'; options: PieceType[] }
  | { type: 'carve'; options: CarveId[] }
  | { type: 'part'; options: PartId[] }
  /** 검문! · 반장: 양날 쌍 셋 */
  | { type: 'pair'; options: Pair[] }
  /** 반장: 쓰러뜨린 흑 기물 하나 */
  | { type: 'recruit'; options: PieceType[] };

export interface ShopItem<T> {
  item: T;
  price: number;
  sold: boolean;
}

export interface ShopStock {
  pieces: ShopItem<PieceType>[];
  carves: ShopItem<CarveId>[];
  parts: ShopItem<PartId>[];
  rerollPrice: number;
}

export type Stage =
  | { at: 'map' }
  | { at: 'battle'; encounter: Encounter; battle?: BattleState }
  | { at: 'reward'; title: string; lines: string[]; choices: Choice[] }
  | { at: 'shop'; stock: ShopStock }
  /** 공방: 각인 새기기(셋 중 하나) 또는 기물 다듬기(한 단계 위) — 둘 중 하나만 */
  | { at: 'forge'; carves: CarveId[]; done?: boolean }
  | { at: 'event'; id: EventId; result?: string }
  | { at: 'over'; won: boolean };

export interface RunState {
  version: 2;
  seed: number;
  /** 저장 가능한 난수 상태 */
  rng: number;
  /** 지금 고르거나 진행 중인 층 (1부터) */
  floor: number;
  map: MapNode[][];
  /** 층마다 고른 노드 번호 */
  path: number[];
  gold: number;
  /** 군단: 기물 + 각인 */
  deck: Unit[];
  /** 부품 (다섯 칸) */
  parts: PartId[];
  /** 양날 쌍으로 받은 적 강화 (출하 끝까지) */
  threats: ThreatId[];
  wins: number;
  /** 이번 출하의 1 · 2공정 반장 */
  bosses: BossId[];
  ascension: number;
  /** 유니크 보정 (%p) */
  pity?: number;
  /** 출하를 시작한 시각 (화면이 넣는다) */
  startedAt?: number;
  /** 오늘의 출하 날짜 (D-122) */
  daily?: string;
  /** 이야기 (D-135) */
  story?: { acts?: number[]; intro?: number[]; ending?: 'free' | 'promote' };
  stage: Stage;
}

export interface RunOptions {
  ascension?: number;
  extraDecks?: Deck[];
  deck?: Deck;
}

/** 시작 세트 3지선다 후보 */
export const startDeckOptions = (seed: number, extra: Deck[] = []): Deck[] => {
  const rng = new Rng(seed ^ 0x5bd1e995);
  const pool = [...START_DECKS, ...extra];
  const out: Deck[] = [];
  while (out.length < 3 && pool.length) out.push(pool.splice(rng.int(pool.length), 1)[0]);
  return out;
};

// ---------- 난수 ----------
const withRng = <T>(run: RunState, fn: (rng: Rng) => T): T => {
  const rng = new Rng(run.rng);
  const out = fn(rng);
  run.rng = rng.state;
  return out;
};
const weighted = <T>(rng: Rng, items: [T, number][]): T | undefined => {
  const total = items.reduce((a, [, w]) => a + w, 0);
  if (total <= 0) return undefined;
  let r = rng.next() * total;
  for (const [it, w] of items) {
    r -= w;
    if (r < 0) return it;
  }
  return items[items.length - 1][0];
};
const pickDistinct = <T>(rng: Rng, items: [T, number][], n: number): T[] => {
  const pool = items.filter(([, w]) => w > 0);
  const out: T[] = [];
  while (out.length < n && pool.length) {
    const it = weighted(rng, pool)!;
    out.push(it);
    pool.splice(pool.findIndex(([x]) => x === it), 1);
  }
  return out;
};

// ---------- 군단 ----------
/** 군단 유형 목록 */
export const deckTypes = (run: RunState): PieceType[] => run.deck.map((u) => u.t);
/** 이 유형을 더 들일 수 있나 (군단 10기 · 유형 상한) */
export const canAdd = (run: RunState, t: PieceType): boolean => run.deck.length < DECK_MAX && run.deck.filter((u) => u.t === t).length < TYPE_MAX[t];
export const sellPrice = (t: PieceType): number => (t === 'K' ? 0 : Math.round(PIECE_STATS[t].value * SHOP.sellMult));
/** 한 단계 위 유형 (공방 다듬기 · 쇳물 담금질) */
export const UPGRADE: Partial<Record<PieceType, PieceType[]>> = { P: ['N', 'B'], N: ['R'], B: ['R'], R: ['Q'] };

// ---------- 시작 ----------
const generateMap = (rng: Rng): MapNode[][] => {
  const map: MapNode[][] = [];
  const kindsList = Object.entries(NODE_WEIGHTS) as [Exclude<NodeKind, 'boss'>, number][];
  for (let floor = 1; floor <= TOTAL_FLOORS; floor++) {
    const f = inAct(floor);
    if (f === 1) map.push([{ kind: 'battle' }]);
    else if (f === FLOORS_PER_ACT) map.push([{ kind: 'boss' }]);
    else {
      const n = 2 + rng.int(2);
      const table = kindsList.filter(([k]) => k !== 'battle' && (k !== 'elite' || f >= eliteFrom(floor)));
      const kinds: NodeKind[] = ['battle', ...pickDistinct(rng, table, n - 1)];
      for (let i = kinds.length - 1; i > 0; i--) {
        const j = rng.int(i + 1);
        [kinds[i], kinds[j]] = [kinds[j], kinds[i]];
      }
      map.push(kinds.map((kind) => (kind === 'event' ? { kind, event: EVENT_IDS[rng.int(EVENT_IDS.length)] } : { kind })));
    }
  }
  return map;
};

/** 그 공정의 반장 (마지막 층 = 도금왕) */
export const bossOf = (run: RunState, floor: number) => (floor === TOTAL_FLOORS ? FINAL_BOSS : BOSSES[run.bosses[actOf(floor) - 1]]);
export const bossName = (run: RunState, floor: number): string => bossOf(run, floor).name;
/** 그 층 반장의 id ('final' = 도금왕) */
export const bossIdOf = (run: RunState, floor: number): BossId | 'final' => (floor === TOTAL_FLOORS ? 'final' : run.bosses[actOf(floor) - 1]);

export const newRun = (seed: number, opts: RunOptions = {}): RunState => {
  const rng = new Rng(seed);
  const candidates = [...START_DECKS, ...(opts.extraDecks ?? [])];
  const deck = toUnits(opts.deck ?? candidates[rng.int(candidates.length)]);
  const bossPool = Object.keys(BOSSES) as BossId[];
  const bosses = [bossPool.splice(rng.int(bossPool.length), 1)[0], bossPool.splice(rng.int(bossPool.length), 1)[0]];
  const map = generateMap(rng);
  return {
    version: 2,
    seed,
    rng: rng.state,
    floor: 1,
    map,
    path: [],
    gold: ascOn(opts.ascension, 'final') ? ASC.final.startGold : START_GOLD,
    deck,
    parts: [],
    threats: [],
    wins: 0,
    bosses,
    ascension: opts.ascension ?? 0,
    stage: { at: 'map' },
  };
};

export const currentNodes = (run: RunState): MapNode[] => run.map[run.floor - 1] ?? [];

const advance = (run: RunState): void => {
  run.floor += 1;
  run.stage = run.floor > TOTAL_FLOORS ? { at: 'over', won: true } : { at: 'map' };
};

// ---------- 부품 · 각인 고르기 재료 ----------
const actIdx = (run: RunState) => actOf(Math.min(run.floor, TOTAL_FLOORS)) - 1;
/** 등급 하나 굴리기 (유니크 보정 포함) */
const rollGrade = (run: RunState, rng: Rng, from: keyof typeof PART_GRADE_WEIGHT): Grade => {
  const w = [...PART_GRADE_WEIGHT[from][actIdx(run)]];
  w[2] += Math.min(PITY.max, run.pity ?? 0);
  const g = weighted(rng, GRADE_ORDER.map((gr, i) => [gr, w[i]] as [Grade, number]))!;
  run.pity = g === 'unique' || g === 'epic' ? 0 : (run.pity ?? 0) + PITY.step;
  return g;
};
/** 아직 없는 부품 n개 (칸마다 등급을 먼저 굴린다) */
const rollParts = (run: RunState, rng: Rng, n: number, from: keyof typeof PART_GRADE_WEIGHT, minGrade: Grade = 'common'): PartId[] => {
  const out: PartId[] = [];
  for (let i = 0; i < n * 4 && out.length < n; i++) {
    let g = rollGrade(run, rng, from);
    if (GRADE_ORDER.indexOf(g) < GRADE_ORDER.indexOf(minGrade)) g = minGrade;
    const pool = PART_IDS.filter((id) => PARTS[id].grade === g && !run.parts.includes(id) && !out.includes(id));
    if (pool.length) out.push(pool[rng.int(pool.length)]);
  }
  return out;
};
const rollCarves = (rng: Rng, n: number): CarveId[] => pickDistinct(rng, CARVE_IDS.map((id) => [id, 1] as [CarveId, number]), n);
const rollPieces = (run: RunState, rng: Rng, n: number): PieceType[] =>
  pickDistinct(rng, (Object.entries(PIECE_REWARD_WEIGHTS) as [PieceType, number][]).filter(([t]) => canAdd(run, t)), n);
const rollThreat = (rng: Rng, n: number): ThreatId[] => pickDistinct(rng, (Object.keys(THREATS) as ThreatId[]).map((id) => [id, 1] as [ThreatId, number]), n);
/** 양날 쌍 셋 */
const rollPairs = (run: RunState, rng: Rng, from: 'elite' | 'boss'): Pair[] => {
  const parts = rollParts(run, rng, PAIR_OPTIONS, from, from === 'boss' ? 'rare' : 'common');
  const n = ascOn(run.ascension, 'doubleThreat') ? 2 : 1;
  return parts.map((part) => ({ part, threats: rollThreat(rng, n) }));
};

// ---------- 노드 진입 ----------
export const enterNode = (run: RunState, index: number): string | void => {
  if (run.stage.at !== 'map') return '지금은 갈 수 없습니다.';
  const node = currentNodes(run)[index];
  if (!node) return '없는 칸입니다.';
  run.path[run.floor - 1] = index;
  switch (node.kind) {
    case 'battle':
    case 'elite':
    case 'boss': {
      const encounter = withRng(run, (rng) => generateEncounter(run.floor, node.kind, rng, run.bosses[actOf(run.floor) - 1], run.ascension, run.threats));
      run.stage = { at: 'battle', encounter };
      return;
    }
    case 'shop':
      run.stage = { at: 'shop', stock: withRng(run, (rng) => makeStock(run, rng)) };
      return;
    case 'forge':
      run.stage = { at: 'forge', carves: withRng(run, (rng) => rollCarves(rng, 3)) };
      return;
    case 'event':
      run.stage = { at: 'event', id: node.event ?? 'gambler' };
      return;
  }
};

/** 노드를 떠난다 (고물상 · 공방 · 돌발 결과 확인 후) */
export const leaveNode = (run: RunState): void => {
  if (run.stage.at === 'battle' || run.stage.at === 'over') return;
  advance(run);
};

// ---------- 대국 ----------
/** 진행 중인 대국 상태를 기록한다 (자동 저장용) */
export const recordBattle = (run: RunState, battle: BattleState): void => {
  if (run.stage.at === 'battle') run.stage.battle = battle;
};

/** 나사 배율: 압력 · 나사 자석 · 조폐 프레스 */
const goldMult = (run: RunState): number =>
  (ascOn(run.ascension, 'goldCut') ? ASC.goldCut.mult : 1) * (run.parts.includes('magnet') ? PART_FX.magnetGold : 1) * (run.parts.includes('mint') ? PART_FX.mintGold : 1);

export const finishBattle = (run: RunState, final: BattleState): void => {
  if (run.stage.at !== 'battle') return;
  const e = run.stage.encounter;
  if (final.winner !== 0) {
    run.stage = { at: 'over', won: false };
    return;
  }
  run.wins += 1;
  if (e.kind === 'boss' && run.floor === TOTAL_FLOORS) return advance(run);
  const gold = Math.round(battleGold(run.floor, e.kind as 'battle' | 'elite' | 'boss') * goldMult(run));
  run.gold += gold;
  const lines = [`나사 +${gold}`];
  const choices: Choice[] = withRng(run, (rng): Choice[] => {
    if (e.kind === 'battle') {
      const pieces = rollPieces(run, rng, 2).map((t) => `piece:${t}`);
      const carve = rollCarves(rng, 1).map((c) => `carve:${c}`);
      return [{ type: 'mixed', options: [...pieces, ...carve] }];
    }
    const pairs: Choice = { type: 'pair', options: rollPairs(run, rng, e.kind === 'boss' ? 'boss' : 'elite') };
    if (e.kind === 'elite') return [pairs];
    const bossTypes = [...new Set(toUnits(BOSSES[run.bosses[actOf(run.floor) - 1]].deck).map((u) => u.t))].filter((t) => t !== 'K' && canAdd(run, t));
    const recruit: Choice = { type: 'recruit', options: pickDistinct(rng, bossTypes.map((t) => [t, 1] as [PieceType, number]), 3) };
    return recruit.options.length ? [pairs, recruit] : [pairs];
  });
  const title = e.kind === 'boss' ? `${bossName(run, run.floor)} 해체 — ${['주조', '조립', '검수'][actOf(run.floor) - 1]} 공정 끝` : e.kind === 'elite' ? `검문! 통과 — ${inAct(run.floor)}층` : `${inAct(run.floor)}층 통과`;
  run.stage = { at: 'reward', title, lines, choices: choices.filter((c) => c.options.length) };
};

// ---------- 보상 받기 ----------
/** 부품 넣기. 칸이 차면 discard(부품 칸 번호)가 필요하다 */
export const addPart = (run: RunState, id: PartId, discard?: number): string | void => {
  if (run.parts.includes(id)) return '이미 가진 부품입니다.';
  if (run.parts.length >= PART_SLOTS) {
    if (discard === undefined) return 'full';
    run.parts.splice(discard, 1);
  }
  run.parts.push(id);
};
/** 군단 기물 하나에 각인 (있던 각인은 사라진다) */
export const setCarve = (run: RunState, unit: number, id: CarveId | undefined): string | void => {
  const u = run.deck[unit];
  if (!u) return '없는 기물입니다.';
  if (id) u.carve = id;
  else delete u.carve;
};
export const addPiece = (run: RunState, t: PieceType): string | void => {
  if (!canAdd(run, t)) return run.deck.length >= DECK_MAX ? `군단은 ${DECK_MAX}기까지입니다.` : `${PIECE_NAMES_KO[t]}은(는) ${TYPE_MAX[t]}기까지입니다.`;
  run.deck.push({ t });
};

const nextChoice = (run: RunState): void => {
  if (run.stage.at !== 'reward') return;
  run.stage.choices.shift();
};

/**
 * 지금 고르기의 한 항목을 받는다. 각인은 extra = 군단 기물 번호, 부품이 칸을 넘으면 extra = 버릴 부품 번호.
 * 'unit' = 각인을 새길 기물을 골라야 한다 · 'full' = 버릴 부품을 골라야 한다.
 */
export const takeChoice = (run: RunState, option: string, extra?: number): string | void => {
  if (run.stage.at !== 'reward') return;
  const ch = run.stage.choices[0];
  if (!ch) return;
  let err: string | void = undefined;
  const kind = ch.type === 'mixed' ? option.split(':')[0] : ch.type;
  const value = ch.type === 'mixed' ? option.split(':')[1] : option;
  if (kind === 'piece' || kind === 'recruit') err = addPiece(run, value as PieceType);
  else if (kind === 'carve') {
    if (extra === undefined) return 'unit';
    err = setCarve(run, extra, value as CarveId);
  } else if (kind === 'part') err = addPart(run, value as PartId, extra);
  else if (kind === 'pair' && ch.type === 'pair') {
    const pair = ch.options[Number(value)];
    if (!pair) return '없는 쌍입니다.';
    err = addPart(run, pair.part, extra);
    if (!err) run.threats.push(...pair.threats);
  }
  if (err) return err;
  nextChoice(run);
};

export const skipChoice = (run: RunState): void => {
  if (run.stage.at !== 'reward') return;
  run.gold += SKIP_GOLD;
  nextChoice(run);
};

export const finishReward = (run: RunState): string | void => {
  if (run.stage.at !== 'reward') return;
  if (run.stage.choices.length) return '아직 고를 것이 남았습니다.';
  advance(run);
};

// ---------- 고물상 ----------
/** 고물상 값 배율: 공정 · 압력 · 위조 가격표 · 조폐 프레스 */
const priceMult = (run: RunState): number =>
  (1 + actIdx(run) * SHOP.actPriceStep) * (ascOn(run.ascension, 'shopPrice') ? ASC.shopPrice.mult : 1) * (run.parts.includes('fakeTag') ? PART_FX.fakeTag : 1) * (run.parts.includes('mint') ? PART_FX.mintShop : 1);
const priced = <T>(run: RunState, item: T, base: number): ShopItem<T> => ({ item, price: Math.round(base * priceMult(run)), sold: false });

const makeStock = (run: RunState, rng: Rng): ShopStock => ({
  pieces: rollPieces(run, rng, SHOP.pieces).map((t) => priced(run, t, PIECE_STATS[t].value * SHOP.pieceMult)),
  carves: rollCarves(rng, SHOP.carves).map((c) => priced(run, c, CARVES[c].price)),
  parts: rollParts(run, rng, SHOP.parts, 'shop').map((p) => priced(run, p, SHOP.partPrice[PARTS[p].grade])),
  rerollPrice: Math.round(SHOP.reroll * priceMult(run)),
});

const stockOf = (run: RunState): ShopStock | null => (run.stage.at === 'shop' ? run.stage.stock : null);
const pay = (run: RunState, price: number): string | void => {
  if (run.gold < price) return '나사가 부족합니다.';
  run.gold -= price;
};

export const buyPiece = (run: RunState, i: number): string | void => {
  const it = stockOf(run)?.pieces[i];
  if (!it || it.sold) return '없는 물건입니다.';
  if (!canAdd(run, it.item)) return addPiece(run, it.item);
  const err = pay(run, it.price);
  if (err) return err;
  run.deck.push({ t: it.item });
  it.sold = true;
};
export const buyCarve = (run: RunState, i: number, unit?: number): string | void => {
  const it = stockOf(run)?.carves[i];
  if (!it || it.sold) return '없는 물건입니다.';
  if (unit === undefined) return 'unit';
  if (run.gold < it.price) return '나사가 부족합니다.';
  const err = setCarve(run, unit, it.item);
  if (err) return err;
  run.gold -= it.price;
  it.sold = true;
};
export const buyPart = (run: RunState, i: number, discard?: number): string | void => {
  const it = stockOf(run)?.parts[i];
  if (!it || it.sold) return '없는 물건입니다.';
  if (run.gold < it.price) return '나사가 부족합니다.';
  const err = addPart(run, it.item, discard);
  if (err) return err;
  run.gold -= it.price;
  it.sold = true;
};
export const sellPiece = (run: RunState, unit: number): string | void => {
  const u = run.deck[unit];
  if (!u || u.t === 'K') return '킹은 팔 수 없습니다.';
  if (run.deck.length <= 2) return '군단이 너무 적습니다. (최소 2기)';
  run.deck.splice(unit, 1);
  run.gold += sellPrice(u.t);
};
export const reroll = (run: RunState): string | void => {
  if (run.stage.at !== 'shop') return;
  const price = run.stage.stock.rerollPrice;
  const err = pay(run, price);
  if (err) return err;
  const stock = withRng(run, (rng) => makeStock(run, rng));
  stock.rerollPrice = price + SHOP.rerollStep;
  run.stage.stock = stock;
};

// ---------- 공방 ----------
/** 각인 새기기: 공방의 각인 셋 중 하나를 기물 하나에 (무료, 방문마다 한 번) */
export const forgeCarve = (run: RunState, carve: number, unit: number): string | void => {
  if (run.stage.at !== 'forge' || run.stage.done) return '이번 방문의 작업은 끝났습니다.';
  const id = run.stage.carves[carve];
  if (!id) return '없는 각인입니다.';
  const err = setCarve(run, unit, id);
  if (err) return err;
  run.stage.done = true;
};
/** 기물 다듬기: 기물 하나를 한 단계 위 유형으로 (무료, 방문마다 한 번) */
export const forgeUpgrade = (run: RunState, unit: number, to: PieceType): string | void => {
  if (run.stage.at !== 'forge' || run.stage.done) return '이번 방문의 작업은 끝났습니다.';
  const u = run.deck[unit];
  if (!u || !UPGRADE[u.t]?.includes(to)) return '다듬을 수 없습니다.';
  if (run.deck.filter((x) => x.t === to).length >= TYPE_MAX[to]) return `${PIECE_NAMES_KO[to]}은(는) ${TYPE_MAX[to]}기까지입니다.`;
  u.t = to;
  run.stage.done = true;
};

// ---------- 돌발 ----------
export const eventChoiceAvailable = (run: RunState, id: EventId, i: number): boolean => {
  const costs: Partial<Record<EventId, number>> = { smith: 25, gambler: 30, auction: 60, brokenGacha: 40 };
  if (i !== 0) return true;
  if ((costs[id] ?? 0) > run.gold) return false;
  if (id === 'smith') return run.deck.some((u) => !u.carve);
  if (id === 'pact') return run.deck.some((u) => PACT_VICTIMS.includes(u.t));
  if (id === 'dipping' || id === 'scout') return run.deck.some((u) => u.t !== 'K');
  if (id === 'swapDealer') return run.deck.filter((u) => u.t === 'P').length >= 2 && run.deck.filter((u) => u.t === 'N').length < TYPE_MAX.N;
  return true;
};

/** 부품 3지선다로 넘긴다 */
const partReward = (run: RunState, title: string, lines: string[], from: 'event', minGrade: Grade = 'common'): void => {
  const options = withRng(run, (rng) => rollParts(run, rng, 3, from, minGrade));
  run.stage = { at: 'reward', title, lines, choices: options.length ? [{ type: 'part', options }] : [] };
};

export const eventChoose = (run: RunState, i: number): string | void => {
  if (run.stage.at !== 'event' || run.stage.result) return;
  const id = run.stage.id;
  if (!eventChoiceAvailable(run, id, i)) return '지금은 고를 수 없습니다.';
  const title = EVENTS[id].title;
  if (i !== 0) {
    run.stage.result = '당신은 등을 돌린다. 아무 일도 일어나지 않았다.';
    return;
  }
  const roll = () => withRng(run, (rng) => rng.next());
  const pickIdx = (list: number[]): number => list[withRng(run, (rng) => rng.int(list.length))];
  const idx = (f: (u: Unit) => boolean) => run.deck.flatMap((u, k) => (f(u) ? [k] : []));
  const randomCarve = () => CARVE_IDS[withRng(run, (rng) => rng.int(CARVE_IDS.length))];
  let result = '';
  switch (id) {
    case 'smith': {
      run.gold -= 25;
      const k = pickIdx(idx((u) => !u.carve));
      const c = randomCarve();
      setCarve(run, k, c);
      result = `렌치가 쇠를 파고든다. (${PIECE_NAMES_KO[run.deck[k].t]} · ${CARVES[c].name})`;
      break;
    }
    case 'gambler':
      if (roll() < 0.5) {
        run.gold += 30;
        result = '앞면. 운이 당신 편에 섰다. (나사 +30)';
      } else {
        run.gold -= 30;
        result = '뒷면. 당신의 나사가 발굽 아래로 사라진다. (나사 −30)';
      }
      break;
    case 'apprentice': {
      const k = pickIdx(idx((u) => u.t !== 'K'));
      if (k === undefined) {
        result = '망치가 허공을 가른다. 맡길 기물이 없었다.';
      } else if (roll() < 0.5) {
        const c = randomCarve();
        setCarve(run, k, c);
        result = `떨리던 망치가 정확히 내려앉는다. (${PIECE_NAMES_KO[run.deck[k].t]} · ${CARVES[c].name})`;
      } else {
        const had = run.deck[k].carve;
        setCarve(run, k, undefined);
        result = had ? `망치가 미끄러진다. 새겨 둔 것이 긁혀 나간다. (${PIECE_NAMES_KO[run.deck[k].t]} · ${CARVES[had].name} 삭제)` : '망치가 미끄러진다. 잃을 것은 없었다.';
      }
      break;
    }
    case 'scout': {
      const k = idx((u) => u.t !== 'K').sort((a, b) => PIECE_STATS[run.deck[b].t].value - PIECE_STATS[run.deck[a].t].value)[0];
      const u = run.deck[k];
      run.deck.splice(k, 1);
      const g = sellPrice(u.t) * 2;
      run.gold += g;
      result = `당신의 ${PIECE_NAMES_KO[u.t]}이 낯선 상자에 실려 간다. (나사 +${g})`;
      break;
    }
    case 'napping':
      if (roll() < 0.5) {
        const t = (['N', 'B', 'R'] as PieceType[]).filter((x) => canAdd(run, x))[0];
        if (t) {
          run.deck.push({ t });
          result = `도장이 찍힌다. 새 기물이 대열에 선다. (${PIECE_NAMES_KO[t]} +1)`;
        } else result = '서류는 바꿨으나, 대열에 빈자리가 없다.';
      } else {
        run.gold = Math.max(0, run.gold - 40);
        result = '저울의 바늘이 번쩍 든다. 당신은 대가를 치른다. (나사 −40)';
      }
      break;
    case 'nightShift': {
      const k = pickIdx(idx((u) => u.t !== 'K'));
      if (k === undefined) result = '모루 위에 올릴 기물이 없다.';
      else {
        setCarve(run, k, 'forged');
        result = `어둠 속에서 망치가 울린다. 쇠가 단단해진다. (${PIECE_NAMES_KO[run.deck[k].t]} · 단조 각인)`;
      }
      break;
    }
    case 'pact': {
      const k = pickIdx(idx((u) => PACT_VICTIMS.includes(u.t)));
      const u = run.deck.splice(k, 1)[0];
      return partReward(run, title, [`당신의 ${PIECE_NAMES_KO[u.t]}이 쇳물 속으로 가라앉는다.`], 'event', 'rare');
    }
    case 'dipping': {
      const k = pickIdx(idx((u) => u.t !== 'K'));
      const u = run.deck[k];
      const ups = (UPGRADE[u.t] ?? []).filter((t) => run.deck.filter((x) => x.t === t).length < TYPE_MAX[t]);
      if (roll() < 0.5 && ups.length) {
        const to = ups[withRng(run, (rng) => rng.int(ups.length))];
        result = `쇳물이 식는다. 더 단단한 모습이 떠오른다. (${PIECE_NAMES_KO[u.t]} → ${PIECE_NAMES_KO[to]})`;
        u.t = to;
      } else {
        run.deck.splice(k, 1);
        result = `쇳물이 삼켰다. 떠오르는 것은 없다. (${PIECE_NAMES_KO[u.t]} 소실)`;
      }
      break;
    }
    case 'swapDealer': {
      for (let n = 0; n < 2; n++) run.deck.splice(run.deck.findIndex((u) => u.t === 'P'), 1);
      run.deck.push({ t: 'N' });
      result = '폰 둘이 손수레에 오르고, 나이트가 대열에 선다. (폰 −2 · 나이트 +1)';
      break;
    }
    case 'auction':
      run.gold -= 60;
      if (roll() < 0.5) return partReward(run, title, ['봉인이 뜯긴다. 상자 속에서 부품이 빛난다.'], 'event');
      result = '상자는 비어 있다. 당신의 나사만 사라졌다.';
      break;
    case 'brokenGacha': {
      run.gold -= 40;
      const r = roll();
      if (r < 0.45) return partReward(run, title, ['레버가 내려간다. 부품이 굴러 나온다.'], 'event');
      if (r < 0.7) {
        const t = (['R', 'B', 'N'] as PieceType[]).find((x) => canAdd(run, x));
        if (t) run.deck.push({ t });
        result = t ? `기계가 기물 하나를 토해 낸다. (${PIECE_NAMES_KO[t]} +1)` : '기물이 굴러 나왔으나, 대열에 빈자리가 없다.';
      } else result = '기계가 침묵한다. 나사는 돌아오지 않는다.';
      break;
    }
    case 'safe': {
      run.gold += 70;
      const k = pickIdx(idx((u) => !!u.carve));
      if (k !== undefined) {
        const had = run.deck[k].carve!;
        setCarve(run, k, undefined);
        result = `금고가 열린다. 손잡이의 날이 새겨 둔 것을 앗아 간다. (나사 +70 · ${PIECE_NAMES_KO[run.deck[k].t]} · ${CARVES[had].name} 삭제)`;
      } else result = '금고가 열린다. 손이 베였으나, 나사는 당신 것이다. (나사 +70)';
      break;
    }
  }
  if (run.stage.at === 'event') run.stage.result = result;
};

// ---------- 저장 ----------
const SAVE_KEY = 'pawnisher.run.v2';

export const saveRun = (run: RunState): void => {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(run));
  } catch {
    /* 저장 실패는 무시 (사생활 보호 모드 등) */
  }
};

export const loadRun = (): RunState | null => {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const run = JSON.parse(raw) as RunState;
    return run.version === 2 ? run : null;
  } catch {
    return null;
  }
};

export const clearRun = (): void => {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* 무시 */
  }
};
