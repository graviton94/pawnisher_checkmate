import { ORDERS, ORDER_GOLD_MULT } from '../data/tactics';
import { orderProgress, pickOrder } from './orders';
import { RECRUIT_OPTIONS } from '../data/legions';
import { CARDS, CARD_SLOTS, type CardId } from '../data/cards';
import { ENCHANTS, ENCHANT_MAX_STACK, ENCHANT_SLOTS, type EnchantId } from '../data/enchants';
import { FORGE_MAX } from '../data/forge';
import { PIECE_NAMES_KO, PIECE_STATS } from '../data/pieces';
import { VARIANTS, VARIANT_FORGE_LEVEL, variantsFor, type VariantId } from '../data/variants';
import {
  ALTAR,
  BOSSES,
  CONSUME_CARD_WEIGHT,
  ACT_NAMES,
  FINAL_BOSS,
  FLOORS_PER_ACT,
  TOTAL_FLOORS,
  actOf,
  eliteFrom,
  inAct,
  FORGE_COST,
  battleGold,
  NODE_WEIGHTS,
  pieceRewardDue,
  STACK_WEIGHT,
  TYPE_MATCH_WEIGHT,
  PIECE_REWARD_WEIGHTS,
  RARE_ENCHANTS,
  RARE_WEIGHT,
  SHOP,
  SKIP_GOLD,
  PAR,
  parRounds,
  START_DECKS,
  START_GOLD,
  type BossId,
  type NodeKind,
} from '../data/run';
import { Rng } from '../engine/rng';
import type { Deck } from '../engine/setup';
import type { BattleState, Loadout, PieceType } from '../engine/types';
import { canAdd } from './deck';
import { EVENTS, EVENT_IDS, PACT_VICTIMS, type EventId } from './events';
import { generateEncounter, type Encounter } from './legion';

/**
 * 런(등반 한 번)의 상태와 진행 규칙 (GDD 8장). 화면과 무관한 순수 로직이며 JSON으로 그대로 저장된다.
 * 조작 함수는 run을 직접 바꾸고, 실패하면 이유 문자열을 돌려준다.
 */

export interface MapNode {
  kind: NodeKind;
  event?: EventId;
}

/** 3지선다 (인챈트·카드). 건너뛰면 골드 소량 */
export type Choice =
  | { type: 'enchant'; options: EnchantId[] }
  | { type: 'card'; options: CardId[] }
  | { type: 'piece'; options: PieceType[] }
  /** 영입 (D-096): 쓰러뜨린 적 기물 하나. 적의 이형이면 그 이형 거푸집도 따라온다 */
  | { type: 'recruit'; options: PieceType[]; variants: Partial<Record<PieceType, VariantId>> };

export interface ShopItem<T> {
  item: T;
  price: number;
  sold: boolean;
}

export interface ShopStock {
  pieces: ShopItem<PieceType>[];
  cards: ShopItem<CardId>[];
  enchants: ShopItem<EnchantId>[];
  rerollPrice: number;
}

export type AltarResult = { kind: 'piece'; piece: PieceType | null } | { kind: 'variant'; variant: VariantId } | { kind: 'miss' } | { kind: 'enchant' } | { kind: 'pick' };

export type Stage =
  | { at: 'map' }
  | { at: 'battle'; encounter: Encounter; battle?: BattleState }
  | { at: 'reward'; title: string; lines: string[]; choices: Choice[] }
  | { at: 'shop'; stock: ShopStock }
  | { at: 'forge' }
  | { at: 'altar'; result?: AltarResult }
  | { at: 'event'; id: EventId; result?: string }
  | { at: 'over'; won: boolean };

export interface RunState {
  version: 1;
  seed: number;
  /** 저장 가능한 난수 상태 */
  rng: number;
  /** 지금 고르거나 진행 중인 층 (1부터) */
  floor: number;
  map: MapNode[][];
  /** 층마다 고른 노드 번호 */
  path: number[];
  gold: number;
  deck: Deck;
  loadout: Loadout;
  /** 이긴 전투 수 (랜덤 기물 보상 주기) */
  wins: number;
  crackGauge: number;
  /** 이번 런의 Act 1·2 보스 (나이트·비숍·룩 컨셉 중 2개) */
  bosses: BossId[];
  /** 승천 단계 (0 = 기본, 메타 진행) */
  ascension: number;
  stage: Stage;
}

export interface RunOptions {
  ascension?: number;
  /** 메타 해금으로 늘어난 시작 덱 후보 */
  extraDecks?: Deck[];
  /** 플레이어가 고른 시작 덱 (없으면 후보 중 무작위) */
  deck?: Deck;
}

/** 시작 덱 3지선다 후보 (기본 3종 + 해금 덱 중 3개) */
export const startDeckOptions = (seed: number, extra: Deck[] = []): Deck[] => {
  const rng = new Rng(seed ^ 0x5bd1e995);
  const pool = [...START_DECKS, ...extra];
  const out: Deck[] = [];
  while (out.length < 3 && pool.length) out.push(pool.splice(rng.int(pool.length), 1)[0]);
  return out;
};

// ---------- 난수 ----------
const rngOf = (run: RunState) => new Rng(run.rng);
const withRng = <T>(run: RunState, fn: (rng: Rng) => T): T => {
  const rng = rngOf(run);
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

/** 가중치 표에서 서로 다른 n개 */
const pickDistinct = <T>(rng: Rng, items: [T, number][], n: number): T[] => {
  const pool = items.filter(([, w]) => w > 0);
  const out: T[] = [];
  while (out.length < n && pool.length) {
    const it = weighted(rng, pool)!;
    out.push(it);
    pool.splice(
      pool.findIndex(([x]) => x === it),
      1,
    );
  }
  return out;
};

// ---------- 시작 ----------
const generateMap = (rng: Rng): MapNode[][] => {
  const map: MapNode[][] = [];
  for (let floor = 1; floor <= TOTAL_FLOORS; floor++) {
    const f = inAct(floor);
    if (f === 1) map.push([{ kind: 'battle' }]);
    else if (f === FLOORS_PER_ACT) map.push([{ kind: 'boss' }]);
    else {
      const n = 2 + rng.int(2);
      const table = (Object.entries(NODE_WEIGHTS) as [Exclude<NodeKind, 'boss'>, number][]).filter(([k]) => k !== 'elite' || f >= eliteFrom(floor));
      // 전투는 층마다 최소 1개
      const kinds: NodeKind[] = ['battle', ...pickDistinct(rng, table.filter(([k]) => k !== 'battle'), n - 1)];
      for (let i = kinds.length - 1; i > 0; i--) {
        const j = rng.int(i + 1);
        [kinds[i], kinds[j]] = [kinds[j], kinds[i]];
      }
      map.push(kinds.map((kind) => (kind === 'event' ? { kind, event: EVENT_IDS[rng.int(EVENT_IDS.length)] } : { kind })));
    }
  }
  return map;
};

/** 이 층 보스의 이름 */
export const bossName = (run: RunState, floor: number): string => bossOf(run, floor).name;
/** 그 공정의 반장 (36층 = 공장장) */
export const bossOf = (run: RunState, floor: number) => (floor === TOTAL_FLOORS ? FINAL_BOSS : BOSSES[run.bosses[actOf(floor) - 1]]);

export const newRun = (seed: number, opts: RunOptions = {}): RunState => {
  const rng = new Rng(seed);
  const candidates = [...START_DECKS, ...(opts.extraDecks ?? [])];
  const randomDeck = candidates[rng.int(candidates.length)];
  const deck = [...(opts.deck ?? randomDeck)];
  const bossPool: BossId[] = ['knight', 'bishop', 'rook'];
  const bosses = [bossPool.splice(rng.int(3), 1)[0], bossPool.splice(rng.int(2), 1)[0]];
  const map = generateMap(rng);
  return {
    version: 1,
    seed,
    rng: rng.state,
    floor: 1,
    map,
    path: [],
    gold: START_GOLD,
    deck,
    loadout: { enchants: {}, cards: [], forge: {}, variants: {} },
    wins: 0,
    crackGauge: 0,
    bosses,
    ascension: opts.ascension ?? 0,
    stage: { at: 'map' },
  };
};

export const currentNodes = (run: RunState): MapNode[] => run.map[run.floor - 1] ?? [];

/** 다음 층으로 (36층 최종 보스를 넘기면 등반 완료) */
const advance = (run: RunState): void => {
  run.floor += 1;
  run.stage = run.floor > TOTAL_FLOORS ? { at: 'over', won: true } : { at: 'map' };
};

// ---------- 노드 진입 ----------
export const enterNode = (run: RunState, index: number): string | void => {
  if (run.stage.at !== 'map') return '지금은 못 가.';
  const node = currentNodes(run)[index];
  if (!node) return '없는 노드';
  run.path[run.floor - 1] = index;
  switch (node.kind) {
    case 'battle':
    case 'elite':
    case 'boss': {
      const encounter = withRng(run, (rng) => generateEncounter(run.floor, node.kind, rng, run.bosses[actOf(run.floor) - 1], run.ascension ?? 0));
      encounter.order = withRng(run, (rng) => pickOrder(run.deck, rng));
      run.stage = { at: 'battle', encounter };
      return;
    }
    case 'shop':
      run.stage = { at: 'shop', stock: withRng(run, (rng) => makeStock(run, rng)) };
      return;
    case 'forge':
      run.stage = { at: 'forge' };
      return;
    case 'altar':
      run.stage = { at: 'altar' };
      return;
    case 'event':
      run.stage = { at: 'event', id: node.event ?? 'gambler' };
      return;
  }
};

/** 노드를 떠난다 (상점·대장간·제단·이벤트 결과 확인 후) */
export const leaveNode = (run: RunState): void => {
  if (run.stage.at === 'battle' || run.stage.at === 'over') return;
  advance(run);
};

// ---------- 전투 ----------
/** 진행 중인 전투 상태를 런에 기록한다 (자동 저장용, GDD 8장 §8.1) */
export const recordBattle = (run: RunState, battle: BattleState): void => {
  if (run.stage.at === 'battle') run.stage.battle = battle;
};

/** 전투가 끝났다. 패배면 런 종료, 승리면 보상 단계로. */
export const finishBattle = (run: RunState, final: BattleState): void => {
  if (run.stage.at !== 'battle') return;
  const kind = run.stage.encounter.kind;
  if (final.winner !== 0) {
    run.stage = { at: 'over', won: false };
    return;
  }

  // 소멸형 카드는 쓰면 사라진다. 쓰지 않았으면 다음 라운드로 이월 (GDD 7장 §7.3)
  const used = new Set(final.cards[0].flatMap((slot, i) => (slot.spent && CARDS[slot.id].limit.type === 'consume' ? [i] : [])));
  run.loadout.cards = run.loadout.cards.filter((_, i) => !used.has(i));

  run.wins += 1;
  const lines: string[] = [];
  const gold = Math.round(battleGold(run.floor, kind as 'battle' | 'elite' | 'boss') * ((run.ascension ?? 0) >= 2 ? 0.85 : 1));
  run.gold += gold;
  lines.push(`나사 +${gold}`);
  // 빠른 승리 보너스 (D-072): 기준 턴 안에 이기면 골드를 더 준다
  const rounds = Math.ceil(final.turnNumber / 2);
  const par = parRounds(run.floor, kind as NodeKind);
  if (rounds <= par) {
    const extra = Math.round(gold * PAR.bonus);
    run.gold += extra;
    lines.push(`빠른 승리 (${rounds}/${par}턴) 나사 +${extra}`);
  }
  // 주문서 (D-094): 완수하면 나사
  const order = run.stage.encounter.order;
  if (order) {
    const def = ORDERS[order];
    if (orderProgress(order, final, run.deck, true).done) {
      const g = Math.round(def.gold * ORDER_GOLD_MULT[kind as 'battle' | 'elite' | 'boss']);
      run.gold += g;
      lines.push(`주문서 완수 · 나사 +${g}`);
    } else lines.push('주문서 미완');
  }

  // 랜덤 기물 보상: 첫·둘째 승리 확정, 이후 3승마다 (GDD 6장 §6.6)
  const choices: Choice[] = [];
  // 기물 3지선다 (GDD 6장 §6.6 개정: 무작위 지급 → 고르는 덱빌딩)
  if (pieceRewardDue(run.floor, run.wins)) {
    const options = withRng(run, (rng) => rollPieces(run, rng));
    if (options.length) choices.push({ type: 'piece', options });
    else lines.push('군단에 더 들일 자리가 없다.');
  }
  const source = kind === 'boss' ? 'boss' : kind === 'elite' ? 'elite' : 'battle';
  // 영입 (GDD 13장 P3, D-096): 검문!·반장 대국은 쓰러뜨린 적 기물 하나를 데려올 수 있다
  if (source !== 'battle') {
    const e = run.stage.encounter;
    const types = [...new Set(e.deck.filter((t) => t !== 'K' && canAdd(run.deck, t)))];
    const options = withRng(run, (rng) => {
      const out: PieceType[] = [];
      while (out.length < RECRUIT_OPTIONS && types.length) out.push(types.splice(rng.int(types.length), 1)[0]);
      return out;
    });
    const variants: Partial<Record<PieceType, VariantId>> = {};
    for (const t of options) {
      const v = e.loadout.variants?.[t];
      if (v && !run.loadout.variants?.[t]) variants[t] = v;
    }
    if (options.length) choices.push({ type: 'recruit', options, variants });
  }
  choices.push({ type: 'enchant', options: withRng(run, (rng) => rollEnchants(run, rng, source)) });
  if (source !== 'battle') choices.push({ type: 'card', options: withRng(run, (rng) => rollCards(run, rng, source)) });
  run.stage = {
    at: 'reward',
    title: kind === 'boss' ? `${bossName(run, run.floor)} 격파 — ${ACT_NAMES[actOf(run.floor) - 1]} 끝` : kind === 'elite' ? '검문 통과!' : `${inAct(run.floor)}층 통과`,
    lines,
    choices: choices.filter((c) => c.options.length),
  };
};

/** 무작위 기물 1기. 덱에 못 들이면 판매가만큼 골드로 바꾼다. */
const grantRandomPiece = (run: RunState, rng: Rng, weights = PIECE_REWARD_WEIGHTS): string => {
  const t = weighted(rng, Object.entries(weights) as [PieceType, number][]);
  if (!t) return '';
  if (canAdd(run.deck, t)) {
    run.deck.push(t);
    return `기물 획득: ${PIECE_NAMES_KO[t]}`;
  }
  const g = Math.round(PIECE_STATS[t].value * SHOP.sellMult);
  run.gold += g;
  return `${PIECE_NAMES_KO[t]}를 얻었지만 군단에 자리가 없어 나사 +${g}`;
};

// ---------- 3지선다 ----------
/** 기물 3지선다: 덱에 들일 수 있는 유형 중 서로 다른 3개 */
const rollPieces = (run: RunState, rng: Rng): PieceType[] =>
  pickDistinct(
    rng,
    (Object.entries(PIECE_REWARD_WEIGHTS) as [PieceType, number][]).filter(([t]) => canAdd(run.deck, t)),
    3,
  );

/** 인챈트가 대상으로 삼는 기물 유형 */
export const ENCHANT_TYPE: Partial<Record<EnchantId, PieceType>> = { E01: 'N', E02: 'B', E03: 'R', E04: 'P', E08: 'K', E12: 'P', E13: 'N', E14: 'B' };

const rollEnchants = (run: RunState, rng: Rng, source: 'battle' | 'elite' | 'boss' | 'altar', rareOnly = false): EnchantId[] => {
  const act = Math.min(3, actOf(Math.min(run.floor, TOTAL_FLOORS))) - 1;
  const table = (Object.keys(ENCHANTS) as EnchantId[]).flatMap((id): [EnchantId, number][] => {
    const n = run.loadout.enchants[id] ?? 0;
    if (n >= ENCHANT_MAX_STACK) return [];
    const rare = RARE_ENCHANTS.includes(id);
    if (rareOnly && !rare) return [];
    let w = rare ? RARE_WEIGHT[source === 'altar' ? 'boss' : source] : 1;
    if (n === 1) w *= STACK_WEIGHT.second[act];
    if (n === 2) w *= STACK_WEIGHT.third[act];
    const t = ENCHANT_TYPE[id];
    if (t && t !== 'K' && run.deck.filter((x) => x === t).length >= 3) w *= TYPE_MATCH_WEIGHT;
    return [[id, w]];
  });
  const out = pickDistinct(rng, table, 3);
  // 보스는 희귀 인챈트 1장 확정
  if (source === 'boss' && !out.some((id) => RARE_ENCHANTS.includes(id))) {
    const rare = table.filter(([id]) => RARE_ENCHANTS.includes(id));
    if (rare.length) out[out.length - 1] = weighted(rng, rare)!;
  }
  return out;
};

const rollCards = (run: RunState, rng: Rng, source: 'elite' | 'boss'): CardId[] => {
  const table = (Object.keys(CARDS) as CardId[])
    .filter((id) => !run.loadout.cards.includes(id))
    .map((id): [CardId, number] => [id, CARDS[id].limit.type === 'consume' ? CONSUME_CARD_WEIGHT[source] : 1]);
  return pickDistinct(rng, table, 3);
};

/** 인챈트를 얻는다. 이미 있으면 중첩, 6칸이 차 있으면 discard를 버려야 한다. */
export const addEnchant = (run: RunState, id: EnchantId, discard?: EnchantId): string | void => {
  const e = run.loadout.enchants;
  const n = e[id] ?? 0;
  if (n >= ENCHANT_MAX_STACK) return '“이미 걸작이다.”';
  if (!n && Object.keys(e).length >= ENCHANT_SLOTS) {
    if (!discard || !e[discard]) return 'full';
    delete e[discard];
  }
  e[id] = n + 1;
};

/** 카드를 얻는다. 4칸이 차 있으면 discard번째 카드를 버려야 한다. */
export const addCard = (run: RunState, id: CardId, discard?: number): string | void => {
  const c = run.loadout.cards;
  if (c.length >= CARD_SLOTS) {
    if (discard === undefined || !c[discard]) return 'full';
    c.splice(discard, 1);
  }
  c.push(id);
};

/** 보상 단계의 첫 선택지를 고른다 (discard: 슬롯이 찼을 때 버릴 것) */
export const takeChoice = (run: RunState, option: string, discard?: EnchantId | number): string | void => {
  if (run.stage.at !== 'reward' || !run.stage.choices.length) return '고를 게 없는데.';
  const ch = run.stage.choices[0];
  if (!(ch.options as string[]).includes(option)) return '없는 선택지';
  if (ch.type === 'piece' || ch.type === 'recruit') {
    const t = option as PieceType;
    if (!canAdd(run.deck, t)) return '“규격 초과.”';
    run.deck.push(t);
    // 영입한 적이 이형이었으면 그 이형 거푸집도 (아직 이형이 없는 유형만)
    const v = ch.type === 'recruit' ? ch.variants[t] : undefined;
    if (v && !run.loadout.variants?.[t]) (run.loadout.variants ??= {})[t] = v;
    run.stage.choices.shift();
    return;
  }
  const err =
    ch.type === 'enchant'
      ? addEnchant(run, option as EnchantId, discard as EnchantId | undefined)
      : addCard(run, option as CardId, discard as number | undefined);
  if (err) return err;
  run.stage.choices.shift();
};

export const skipChoice = (run: RunState): void => {
  if (run.stage.at !== 'reward' || !run.stage.choices.length) return;
  run.stage.choices.shift();
  run.gold += SKIP_GOLD;
  run.stage.lines.push(`건너뛰기 나사 +${SKIP_GOLD}`);
};

/** 보상 단계를 마친다 (선택지를 다 처리한 뒤) */
export const finishReward = (run: RunState): string | void => {
  if (run.stage.at !== 'reward') return;
  if (run.stage.choices.length) return '“아직 고를 게 남았다.”';
  advance(run);
};

// ---------- 상점 ----------
const piecePrice = (t: PieceType) => Math.round(PIECE_STATS[t].value * SHOP.pieceMult);
export const sellPrice = (t: PieceType) => (t === 'K' ? 0 : Math.round(PIECE_STATS[t].value * SHOP.sellMult));
const enchantPrice = (id: EnchantId) => (RARE_ENCHANTS.includes(id) ? SHOP.enchantPrice.rare : SHOP.enchantPrice.common);
const cardPrice = (id: CardId) => (CARDS[id].limit.type === 'consume' ? SHOP.cardPrice.consume : SHOP.cardPrice.sustain);

const makeStock = (run: RunState, rng: Rng, rerollPrice: number = SHOP.reroll): ShopStock => {
  const pieces = Array.from({ length: SHOP.pieces }, () => weighted(rng, Object.entries(PIECE_REWARD_WEIGHTS) as [PieceType, number][])!);
  const cards = pickDistinct(
    rng,
    (Object.keys(CARDS) as CardId[]).filter((id) => !run.loadout.cards.includes(id)).map((id): [CardId, number] => [id, CARDS[id].limit.type === 'consume' ? CONSUME_CARD_WEIGHT.shop : 1]),
    SHOP.cards,
  );
  const enchants = rollEnchants(run, rng, 'battle').slice(0, SHOP.enchants);
  return {
    pieces: pieces.map((item) => ({ item, price: piecePrice(item), sold: false })),
    cards: cards.map((item) => ({ item, price: cardPrice(item), sold: false })),
    enchants: enchants.map((item) => ({ item, price: enchantPrice(item), sold: false })),
    rerollPrice,
  };
};

const shopOf = (run: RunState): ShopStock | null => (run.stage.at === 'shop' ? run.stage.stock : null);

export const buyPiece = (run: RunState, i: number): string | void => {
  const it = shopOf(run)?.pieces[i];
  if (!it || it.sold) return '“그런 물건 없어.”';
  if (run.gold < it.price) return '“나사가 부족해.”';
  if (!canAdd(run.deck, it.item)) return '“규격 초과. 하나 빼고 와.”';
  run.gold -= it.price;
  run.deck.push(it.item);
  it.sold = true;
};

export const buyCard = (run: RunState, i: number, discard?: number): string | void => {
  const it = shopOf(run)?.cards[i];
  if (!it || it.sold) return '“그런 물건 없어.”';
  if (run.gold < it.price) return '“나사가 부족해.”';
  const err = addCard(run, it.item, discard);
  if (err) return err;
  run.gold -= it.price;
  it.sold = true;
};

export const buyEnchant = (run: RunState, i: number, discard?: EnchantId): string | void => {
  const it = shopOf(run)?.enchants[i];
  if (!it || it.sold) return '“그런 물건 없어.”';
  if (run.gold < it.price) return '“나사가 부족해.”';
  const err = addEnchant(run, it.item, discard);
  if (err) return err;
  run.gold -= it.price;
  it.sold = true;
};

/** 기물 판매 (킹 제외). 상점에서만. */
export const sellPiece = (run: RunState, t: PieceType): string | void => {
  if (!shopOf(run)) return '여긴 고물상이 아니야.';
  if (t === 'K') return '“킹은 안 받아.”';
  const i = run.deck.indexOf(t);
  if (i < 0) return '없는 기물';
  run.deck.splice(i, 1);
  run.gold += sellPrice(t);
};

export const reroll = (run: RunState): string | void => {
  const shop = shopOf(run);
  if (!shop) return;
  if (run.gold < shop.rerollPrice) return '“나사가 부족해.”';
  run.gold -= shop.rerollPrice;
  run.stage = { at: 'shop', stock: withRng(run, (rng) => makeStock(run, rng, shop.rerollPrice + SHOP.rerollStep)) };
};

// ---------- 대장간 ----------
export const forgeCost = (run: RunState, t: PieceType): number | null => {
  const lv = run.loadout.forge[t] ?? 0;
  return lv >= FORGE_MAX ? null : FORGE_COST[lv];
};

export const forgeUp = (run: RunState, t: PieceType): string | void => {
  if (run.stage.at !== 'forge') return '공방에 가서 해.';
  if (!run.deck.includes(t)) return '군단에 없는 유형';
  const cost = forgeCost(run, t);
  if (cost === null) return '“완성품이다. 더 손댈 데 없어.”';
  if (run.gold < cost) return '“나사가 부족해.”';
  run.gold -= cost;
  run.loadout.forge[t] = (run.loadout.forge[t] ?? 0) + 1;
};

/** 이형 거푸집으로 바꿀 수 있는 이형들 (공방, 개량 +3 이상, 아직 이형이 없는 유형 — GDD 13장 P2) */
export const forgeVariantOptions = (run: RunState, t: PieceType): VariantId[] =>
  run.deck.includes(t) && (run.loadout.forge[t] ?? 0) >= VARIANT_FORGE_LEVEL && !run.loadout.variants?.[t] ? variantsFor(t) : [];

/** 공방: 그 유형의 거푸집을 이형으로 바꾼다 (무료, 되돌릴 수 없음) */
export const forgeVariant = (run: RunState, t: PieceType, id: VariantId): string | void => {
  if (run.stage.at !== 'forge') return '공방에 가서 해.';
  if (!forgeVariantOptions(run, t).includes(id)) return `“+${VARIANT_FORGE_LEVEL}부터다.”`;
  run.loadout.variants = { ...run.loadout.variants, [t]: id };
};

/** 뽑기 기계 대박: 덱에 있고 아직 이형이 없는 유형 하나에 이형 거푸집 (없으면 null) */
const grantVariant = (run: RunState, rng: Rng): VariantId | null => {
  const pool = [...new Set(run.deck)].filter((t) => !run.loadout.variants?.[t]).flatMap((t) => variantsFor(t));
  if (!pool.length) return null;
  const id = pool[rng.int(pool.length)];
  run.loadout.variants = { ...run.loadout.variants, [VARIANTS[id].base]: id };
  return id;
};

// ---------- 크랙 제단 ----------
/** 게이지가 가득 찼으면 원하는 인챈트를 확정으로 고를 수 있다 (GDD 8장 §8.5) */
export const altarCanPick = (run: RunState): boolean => run.crackGauge >= ALTAR.gaugeMax;

export const altarGamble = (run: RunState): string | void => {
  if (run.stage.at !== 'altar' || run.stage.result) return;
  if (altarCanPick(run)) {
    run.crackGauge = 0;
    run.stage.result = { kind: 'pick' };
    return;
  }
  if (run.gold < ALTAR.cost) return '“나사가 부족해.”';
  run.gold -= ALTAR.cost;
  const r = withRng(run, (rng) => rng.next());
  if (r < ALTAR.odds.enchant) {
    const options = withRng(run, (rng) => rollEnchants(run, rng, 'altar', true));
    run.stage.result = { kind: 'enchant' };
    if (options.length) {
      run.stage = { at: 'reward', title: '뽑기 기계 — 희귀 개조', lines: [], choices: [{ type: 'enchant', options }] };
      return;
    }
  }
  if (r < ALTAR.odds.enchant + ALTAR.odds.piece) {
    const before = run.deck.length;
    withRng(run, (rng) => grantRandomPiece(run, rng, { P: 0, N: 30, B: 30, R: 25, Q: 15 }));
    if (run.stage.at === 'altar') run.stage.result = { kind: 'piece', piece: run.deck.length > before ? run.deck[run.deck.length - 1] : null };
    return;
  }
  if (r < ALTAR.odds.enchant + ALTAR.odds.piece + ALTAR.odds.variant) {
    const v = withRng(run, (rng) => grantVariant(run, rng));
    if (v) {
      if (run.stage.at === 'altar') run.stage.result = { kind: 'variant', variant: v };
      return;
    }
  }
  run.crackGauge += 1;
  if (run.stage.at === 'altar') run.stage.result = { kind: 'miss' };
};

/** 게이지 확정 선택: 원하는 인챈트 1장 (3장째 포함) */
export const altarPick = (run: RunState, id: EnchantId, discard?: EnchantId): string | void => {
  if (run.stage.at !== 'altar' || run.stage.result?.kind !== 'pick') return;
  const err = addEnchant(run, id, discard);
  if (err) return err;
  advance(run);
};

// ---------- 이벤트 ----------
export const eventChoiceAvailable = (run: RunState, id: EventId, i: number): boolean => {
  if (id === 'smith' && i === 0) return run.gold >= 25 && [...new Set(run.deck)].some((t) => (run.loadout.forge[t] ?? 0) < FORGE_MAX);
  if (id === 'gambler' && i === 0) return run.gold >= 30;
  if (id === 'pilgrim' && i === 0) return run.deck.includes('P');
  if (id === 'pact' && i === 0) return run.deck.some((t) => PACT_VICTIMS.includes(t));
  return true;
};

export const eventChoose = (run: RunState, i: number): string | void => {
  if (run.stage.at !== 'event' || run.stage.result) return;
  const id = run.stage.id;
  if (!EVENTS[id].choices[i]) return '없는 선택지';
  if (!eventChoiceAvailable(run, id, i)) return '그건 안 돼.';
  let result = '아무 일도 없었다.';
  if (i === 0) {
    switch (id) {
      case 'smith': {
        const types = [...new Set(run.deck)].filter((t) => (run.loadout.forge[t] ?? 0) < FORGE_MAX);
        const t = types[withRng(run, (rng) => rng.int(types.length))];
        run.gold -= 25;
        run.loadout.forge[t] = (run.loadout.forge[t] ?? 0) + 1;
        result = `${PIECE_NAMES_KO[t]} 개량 +${run.loadout.forge[t]}`;
        break;
      }
      case 'armory':
        result = withRng(run, (rng) => grantRandomPiece(run, rng, { P: 0, N: 1, B: 1, R: 0, Q: 0 }));
        break;
      case 'gambler': {
        const win = withRng(run, (rng) => rng.next() < 0.5);
        run.gold += win ? 30 : -30;
        result = win ? '앞면! 나사 +30' : '뒷면… 나사 −30';
        break;
      }
      case 'pilgrim':
        run.deck.splice(run.deck.indexOf('P'), 1);
        run.gold += 35;
        result = '폰 1기가 길을 떠났다. 나사 +35';
        break;
      case 'pact': {
        const victims = run.deck.map((t, k) => [t, k] as const).filter(([t]) => PACT_VICTIMS.includes(t));
        const [t, k] = victims[withRng(run, (rng) => rng.int(victims.length))];
        run.deck.splice(k, 1);
        const options = withRng(run, (rng) => rollEnchants(run, rng, 'altar', true));
        run.stage = { at: 'reward', title: '쇳물 앞의 거래', lines: [`${PIECE_NAMES_KO[t]} 1기를 잃었다`], choices: options.length ? [{ type: 'enchant', options }] : [] };
        return;
      }
    }
  } else if (id === 'armory') {
    const pool = (Object.keys(CARDS) as CardId[]).filter((c) => CARDS[c].limit.type !== 'consume' && !run.loadout.cards.includes(c));
    if (run.loadout.cards.length >= CARD_SLOTS || !pool.length) result = '천공 카드 칸이 가득 차 있다.';
    else {
      const c = pool[withRng(run, (rng) => rng.int(pool.length))];
      run.loadout.cards.push(c);
      result = `카드 획득: ${CARDS[c].name}`;
    }
  } else result = '지나갔다.';
  if (run.stage.at === 'event') run.stage.result = result;
};

// ---------- 저장 ----------
const SAVE_KEY = 'pawnisher.run.v1';

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
    if (run.version !== 1) return null;
    // 예전 저장(테두리 줄 단위 붕괴)을 칸 단위로 옮긴다
    const b = run.stage.at === 'battle' ? run.stage.battle : undefined;
    if (b && b.ring > 0 && !b.fallen?.length) {
      b.fallen = [];
      for (let y = 0; y < b.height; y++)
        for (let x = 0; x < b.width; x++) if (x < b.ring || y < b.ring || x >= b.width - b.ring || y >= b.height - b.ring) b.fallen.push(y * b.width + x);
    }
    return run;
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
