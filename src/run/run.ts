import { ORDERS, ORDER_GOLD_MULT } from '../data/tactics';
import { orderProgress, pickOrder } from './orders';
import { TEXT } from '../data/text';
import { LUCK, RECRUIT_OPTIONS } from '../data/legions';
import { DEFECT } from '../data/defects';
import { DEFAULT_FORMATION } from '../data/formations';
import { PUZZLE_GOLD } from '../data/puzzles';
import { ASC, ascOn } from '../data/ascension';
import { CARD_GRADE, ENCHANT_GRADE, GRADE_WEIGHT, LEGEND_CHANCE, LEGEND_PRICE, LEGEND_SLOTS, PITY, type Grade } from '../data/grades';
import { LEGENDS, LEGEND_FX, type LegendId } from '../data/legends';
import { CARDS, CARD_SLOTS, type CardId } from '../data/cards';
import { ENCHANTS, ENCHANT_MAX_STACK, ENCHANT_SLOTS, MORE, tier, type EnchantId } from '../data/enchants';
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
  /** 검문!이 다는 이형 — 지도에 도면으로 미리 보인다 (D-107) */
  blueprint?: VariantId;
}

/** 3지선다 (인챈트·카드). 건너뛰면 골드 소량 */
export type Choice =
  | { type: 'enchant'; options: EnchantId[] }
  | { type: 'card'; options: CardId[] }
  | { type: 'piece'; options: PieceType[] }
  /** 영입 (D-096): 쓰러뜨린 적 기물 하나. 적의 이형이면 그 도면도 따라온다 (D-107) */
  | { type: 'recruit'; options: PieceType[]; variants: Partial<Record<PieceType, VariantId>> }
  /** 도면 (D-107): 쓰러뜨린 군단이 단 이형 중 하나 */
  | { type: 'blueprint'; options: VariantId[] }
  /** 에픽 부품 (D-112): 에픽 개조(L..) 또는 에픽 카드(C07~C09) */
  | { type: 'legend'; options: GoldId[] };

/** 에픽 3지선다 칸: 에픽 부품 또는 에픽 천공 카드 */
export type GoldId = LegendId | 'C07' | 'C08' | 'C09';
const GOLD_CARDS: GoldId[] = ['C07', 'C08', 'C09'];

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
  /** 개조 다듬기 (D-103): 가진 개조 한 단 올리기 */
  polish?: ShopItem<EnchantId>;
  /** 도면 진열 (D-107, Act 2부터): 군단에 있는 유형의 아직 없는 도면 하나 */
  blueprint?: ShopItem<VariantId>;
  /** 에픽 진열 (D-112, 공정 2부터 가끔) */
  legend?: ShopItem<GoldId>;
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
  /** 묘수풀이 (D-097): 문제 번호 */
  | { at: 'puzzle'; id: number }
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
  /** 결함 · 봉인: 남은 대국 수 (D-101) */
  sealed?: number;
  /** 모은 이형 도면 (D-107): 공방은 이것으로만 이형을 부어 준다. 옛 저장은 지금 단 이형만 */
  blueprints?: VariantId[];
  /** 이 출하에서 푼 묘수 (도감 기록, D-108) */
  solved?: number;
  /** 유니크 보정 (D-112): 유니크가 안 나온 칸마다 쌓이는 %p · 검문! 에픽 보정 */
  pity?: number;
  goldPity?: number;
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
      // 검문!은 어떤 이형을 다는지 지도에 미리 보인다 → 갖고 싶은 도면이 있으면 그 검문을 고른다 (D-107)
      const ALL_VARIANTS = Object.keys(VARIANTS) as VariantId[];
      map.push(
        kinds.map((kind) =>
          kind === 'event' ? { kind, event: EVENT_IDS[rng.int(EVENT_IDS.length)] } : kind === 'elite' ? { kind, blueprint: ALL_VARIANTS[rng.int(ALL_VARIANTS.length)] } : { kind },
        ),
      );
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
  // 반장 여섯 중 둘 (D-106)
  const bossPool = Object.keys(BOSSES) as BossId[];
  const bosses = [bossPool.splice(rng.int(bossPool.length), 1)[0], bossPool.splice(rng.int(bossPool.length), 1)[0]];
  const map = generateMap(rng);
  return {
    version: 1,
    seed,
    rng: rng.state,
    floor: 1,
    map,
    path: [],
    gold: ascOn(opts.ascension, 'finalForge') ? ASC.finalForge.startGold : START_GOLD,
    deck,
    loadout: { enchants: {}, cards: [], forge: {}, variants: {}, formation: DEFAULT_FORMATION },
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
      const encounter = withRng(run, (rng) => generateEncounter(run.floor, node.kind, rng, run.bosses[actOf(run.floor) - 1], run.ascension ?? 0, node.blueprint));
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
    case 'puzzle':
      run.stage = { at: 'puzzle', id: withRng(run, (rng) => rng.int(1_000_000)) };
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

// ---------- 볼륨 1 돌발 (D-105) ----------
const MORE_EVENTS: EventId[] = ['nightShift', 'moldBin', 'recheck', 'dipping', 'screwRain', 'stampForge', 'swapDealer', 'oilLeak', 'brokenGacha', 'apprentice', 'lostBox', 'welding', 'scout', 'auction', 'napping'];
/** 한 단계 위 유형 (쇳물 담금질) */
const UPGRADE: Partial<Record<PieceType, PieceType[]>> = { P: ['N', 'B'], N: ['R'], B: ['R'], R: ['Q'] };

/** 볼륨 1 돌발의 선택 결과. 보상 단계로 넘기면 null */
const moreEvent = (run: RunState, id: EventId, i: number): string | null => {
  const roll = () => withRng(run, (rng) => rng.next());
  const pick = <T>(list: T[]): T => list[withRng(run, (rng) => rng.int(list.length))];
  const types = () => [...new Set(run.deck)].filter((t) => t !== 'K');
  const rareChoice = (title: string, lines: string[]): null => {
    const options = withRng(run, (rng) => rollEnchants(run, rng, 'altar', true));
    run.stage = { at: 'reward', title, lines, choices: options.length ? [{ type: 'enchant', options }] : [] };
    return null;
  };
  if (i !== 0) {
    switch (id) {
      case 'moldBin':
        run.gold += 30;
        return '고철값을 받았다. 나사 +30.';
      case 'oilLeak':
        return `미끄러졌다. ${damageRandom(run)}`;
      case 'brokenGacha':
        run.gold += 30;
        run.crackGauge = 0;
        return '톱니를 뜯어 팔았다. 나사 +30. 행운 톱니가 멈췄다.';
      case 'lostBox':
        run.gold += 30;
        return '상자째 팔았다. 나사 +30.';
      case 'screwRain':
        return '* 나사가 다 지나갈 때까지 기다렸다. 머리는 무사하다.';
      default:
        return '지나갔다.';
    }
  }
  switch (id) {
    case 'nightShift': {
      const t = pick([...new Set(run.deck)].filter((x) => (run.loadout.forge[x] ?? 0) < FORGE_MAX));
      run.loadout.forge[t] = (run.loadout.forge[t] ?? 0) + 1;
      run.sealed = (run.sealed ?? 0) + 1;
      return `${PIECE_NAMES_KO[t]} 개량 +${run.loadout.forge[t]}. 장인이 깼다 — 봉인 1대국.`;
    }
    case 'moldBin': {
      if (roll() < 0.6) {
        const v = withRng(run, (rng) => grantVariant(run, rng));
        if (v) return `이형 거푸집! ${VARIANTS[v].name}.`;
      }
      return `거푸집이 터졌다. ${damageRandom(run)}`;
    }
    case 'recheck': {
      run.gold -= 50;
      for (const t of Object.keys(run.loadout.damage ?? {}) as PieceType[]) run.loadout.damage![t] = Math.max(0, (run.loadout.damage![t] ?? 0) - 1);
      return '재검사 통과. 손상이 한 단씩 지워졌다. 나사 −50.';
    }
    case 'dipping': {
      const idx = run.deck.map((t, k) => [t, k] as const).filter(([t]) => t !== 'K');
      const [t, k] = pick(idx);
      if (roll() < 0.5) {
        const up = UPGRADE[t];
        if (up) {
          const to = pick(up);
          run.deck[k] = to;
          return `${PIECE_NAMES_KO[t]}가 ${PIECE_NAMES_KO[to]}로 굳었다.`;
        }
        run.loadout.forge[t] = Math.min(FORGE_MAX, (run.loadout.forge[t] ?? 0) + 1);
        return `${PIECE_NAMES_KO[t]}가 더 단단해졌다. 개량 +1.`;
      }
      run.deck.splice(k, 1);
      return `${PIECE_NAMES_KO[t]}가 녹아 사라졌다.`;
    }
    case 'screwRain':
      run.gold += 25;
      return '나사 +25. 혹이 하나 생겼다.';
    case 'stampForge': {
      const owned = (Object.entries(run.loadout.enchants) as [EnchantId, number][]).filter(([, n]) => n > 0 && n < ENCHANT_MAX_STACK);
      const [e, n] = pick(owned);
      run.loadout.enchants[e] = n + 1;
      run.sealed = (run.sealed ?? 0) + DEFECT.sealBattles;
      return `${ENCHANTS[e].name} ${n + 1}단. 서류가 꼬였다 — 봉인 ${DEFECT.sealBattles}대국.`;
    }
    case 'swapDealer': {
      for (let n = 0; n < 2; n++) run.deck.splice(run.deck.indexOf('P'), 1);
      if (canAdd(run.deck, 'N')) {
        run.deck.push('N');
        return '폰 둘을 건네고 나이트 하나를 받았다.';
      }
      run.gold += 25;
      return '나이트를 들일 자리가 없다. 나사 +25로 받았다.';
    }
    case 'oilLeak':
      run.gold -= 20;
      return '틈을 막았다. 나사 −20.';
    case 'brokenGacha':
      run.crackGauge = Math.min(ALTAR.gaugeMax, run.crackGauge + 2);
      return `행운 톱니가 두 칸 돌았다 (${run.crackGauge}/${ALTAR.gaugeMax}).`;
    case 'apprentice': {
      const t = pick<PieceType>(types().length ? types() : ['K']);
      if (roll() < 0.5 && (run.loadout.forge[t] ?? 0) < FORGE_MAX) {
        run.loadout.forge[t] = (run.loadout.forge[t] ?? 0) + 1;
        return `운이 좋았다. ${PIECE_NAMES_KO[t]} 개량 +${run.loadout.forge[t]}.`;
      }
      const forged = (Object.entries(run.loadout.forge) as [PieceType, number][]).filter(([, n]) => n > 0 && n < FORGE_MAX);
      if (forged.length) {
        const [ft] = pick(forged);
        run.loadout.forge[ft] = run.loadout.forge[ft]! - 1;
        return `망치가 거꾸로였다. ${PIECE_NAMES_KO[ft]} 개량 −1.`;
      }
      return `망치가 거꾸로였다. ${damageRandom(run)}`;
    }
    case 'lostBox': {
      const pool = (Object.keys(CARDS) as CardId[]).filter((c) => !run.loadout.cards.includes(c));
      if (run.loadout.cards.length >= CARD_SLOTS || !pool.length) {
        run.gold += 30;
        return '천공 카드 칸이 차 있다. 상자째 팔았다. 나사 +30.';
      }
      const c = pick(pool);
      run.loadout.cards.push(c);
      return `카드 획득: ${CARDS[c].name}`;
    }
    case 'welding': {
      const t = types().length ? pick(types()) : null;
      if (t) damageType(run, t);
      return rareChoice('꺼지지 않은 용접기', t ? [damageType(run, t)] : []);
    }
    case 'scout': {
      const best = types().sort((a, b) => PIECE_STATS[b].value - PIECE_STATS[a].value)[0];
      run.deck.splice(run.deck.indexOf(best), 1);
      const g = sellPrice(best) * 2;
      run.gold += g;
      return `${PIECE_NAMES_KO[best]}를 넘겼다. 나사 +${g}.`;
    }
    case 'auction':
      run.gold -= 60;
      if (roll() < 0.5) return rareChoice('고철 경매 — 낙찰', ['나사 −60']);
      return '빈 상자였다. 나사 −60.';
    case 'napping': {
      if (roll() < 0.5) return withRng(run, (rng) => grantRandomPiece(run, rng, { P: 0, N: 30, B: 30, R: 25, Q: 15 }));
      run.sealed = (run.sealed ?? 0) + DEFECT.sealBattles;
      run.gold = Math.max(0, run.gold - 20);
      return `들켰다. 봉인 ${DEFECT.sealBattles}대국 · 나사 −20.`;
    }
    default:
      return null;
  }
};

// ---------- 결함 (D-101) ----------
/** 그 유형 손상 1단 (최대 3단) — 결과 한 줄 */
const damageType = (run: RunState, t: PieceType): string => {
  const dmg = (run.loadout.damage ??= {});
  dmg[t] = Math.min(DEFECT.damageMax, (dmg[t] ?? 0) + 1);
  return `${PIECE_NAMES_KO[t]} 손상 ${dmg[t]}단 (최대 HP −${Math.round(DEFECT.damageCut * dmg[t]! * 100)}%)`;
};
/** 군단의 무작위 유형(킹 제외) 손상 */
const damageRandom = (run: RunState): string => {
  const types = [...new Set(run.deck)].filter((t) => t !== 'K');
  if (!types.length) return '';
  return damageType(run, types[withRng(run, (rng) => rng.int(types.length))]);
};

/** 공방 손상 수리: 1단 */
export const repairDamage = (run: RunState, t: PieceType): string | void => {
  const n = run.loadout.damage?.[t] ?? 0;
  if (!n) return '“멀쩡한데.”';
  if (run.gold < DEFECT.repairCost) return '“나사가 부족해.”';
  run.gold -= DEFECT.repairCost;
  run.loadout.damage![t] = n - 1;
};

/** 이번 대국에 나갈 군단: 봉인 중이면 킹 말고 한 기가 상자에 남는다 (대국 시드로 정해져 이어하기에도 같다) */
export const battleDeck = (run: RunState): { deck: PieceType[]; sealed?: PieceType } => {
  if (!run.sealed || run.stage.at !== 'battle') return { deck: run.deck };
  const idx = run.deck.map((t, k) => [t, k] as const).filter(([t]) => t !== 'K');
  if (!idx.length) return { deck: run.deck };
  const [t, k] = idx[new Rng((run.stage.encounter.seed ^ 0x5ea1ed) >>> 0).int(idx.length)];
  return { deck: run.deck.filter((_, j) => j !== k), sealed: t };
};

/** 묘수풀이가 끝났다 (D-097): 풀면 나사 + 개조 3지선다, 못 풀어도 출하는 이어진다 */
export const finishPuzzle = (run: RunState, final: BattleState): void => {
  if (run.stage.at !== 'puzzle') return;
  if (final.winner === 0) {
    run.gold += PUZZLE_GOLD;
    run.solved = (run.solved ?? 0) + 1;
    run.stage = { at: 'reward', title: '묘수 풀이', lines: [`나사 +${PUZZLE_GOLD}`], choices: [{ type: 'enchant', options: withRng(run, (rng) => rollEnchants(run, rng, 'battle')) }] };
  } else run.stage = { at: 'reward', title: '묘수 실패', lines: ['* 킹이 버틴다. 판이 조용히 치워진다.'], choices: [] };
};

/** 전투가 끝났다. 패배면 런 종료, 승리면 보상 단계로. */
export const finishBattle = (run: RunState, final: BattleState): void => {
  if (run.stage.at !== 'battle') return;
  const kind = run.stage.encounter.kind;
  if (run.sealed) run.sealed -= 1;
  if (final.winner !== 0) {
    run.stage = { at: 'over', won: false };
    return;
  }

  // 소멸형 카드는 쓰면 사라진다. 쓰지 않았으면 다음 라운드로 이월 (GDD 7장 §7.3)
  const used = new Set(final.cards[0].flatMap((slot, i) => (slot.spent && CARDS[slot.id].limit.type === 'consume' ? [i] : [])));
  run.loadout.cards = run.loadout.cards.filter((_, i) => !used.has(i));

  run.wins += 1;
  const lines: string[] = [];
  // 나사 자루 (억빠, D-099): 가끔 대국 나사가 세 배
  const jackpot = withRng(run, (rng) => rng.next()) < LUCK.jackpot;
  const magnet = (run.loadout.enchants.E32 ? tier(MORE.E32, run.loadout.enchants.E32) : 1) * (run.loadout.legends?.includes('L08') ? LEGEND_FX.goldMult : 1); // 나사 자석 (D-105) · 조폐 프레스 (D-112)
  const gold = Math.round(battleGold(run.floor, kind as 'battle' | 'elite' | 'boss') * ((run.ascension ?? 0) >= 2 ? 0.85 : 1) * (jackpot ? LUCK.jackpotMult : 1) * magnet);
  run.gold += gold;
  lines.push(jackpot ? `${TEXT.luck.jackpot} 나사 +${gold}` : `나사 +${gold}`);
  // 빠른 승리 보너스 (D-072): 기준 턴 안에 이기면 골드를 더 준다
  const rounds = Math.ceil(final.turnNumber / 2);
  const par = parRounds(run.floor, kind as NodeKind);
  if (rounds <= par) {
    const extra = Math.round(gold * PAR.bonus);
    run.gold += extra;
    lines.push(`빠른 승리 (${rounds}/${par}턴) 나사 +${extra}`);
  }
  // 처치 수당 (D-105)
  const bounty = run.loadout.enchants.E34 ? (final.record?.[0].kills ?? 0) * tier(MORE.E34, run.loadout.enchants.E34) : 0;
  if (bounty) {
    run.gold += bounty;
    lines.push(`처치 수당 나사 +${bounty}`);
  }
  // 수리 키트 (D-105): n승마다 손상 1단 수리
  const kit = run.loadout.enchants.E35;
  if (kit && run.wins % tier(MORE.E35, kit) === 0) {
    const hurt = (Object.entries(run.loadout.damage ?? {}) as [PieceType, number][]).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1])[0];
    if (hurt) {
      run.loadout.damage![hurt[0]] = hurt[1] - 1;
      lines.push(`수리 키트 — ${PIECE_NAMES_KO[hurt[0]]} 손상 1단 수리`);
    }
  }
  // 나사 더미 (지형, D-097): 대국 중 주운 나사
  const picked = final.record?.[0].gold ?? 0;
  if (picked) {
    run.gold += picked;
    lines.push(`주운 나사 +${picked}`);
  }
  // 주문서 (D-094): 완수하면 나사
  const order = run.stage.encounter.order;
  if (order) {
    const def = ORDERS[order];
    if (orderProgress(order, final, run.deck, true).done) {
      const ledger = run.loadout.enchants.E36 ? tier(MORE.E36, run.loadout.enchants.E36) : 1; // 주문 장부 (D-105)
      const g = Math.round(def.gold * ORDER_GOLD_MULT[kind as 'battle' | 'elite' | 'boss'] * ledger * (ascOn(run.ascension, 'orderGold') ? ASC.orderGold.mult : 1));
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
      if (v && !ownedBlueprints(run).includes(v)) variants[t] = v;
    }
    if (options.length) choices.push({ type: 'recruit', options, variants });
    // 도면 (D-107): 그 군단이 단 이형 중 아직 없는 것
    const bps = (Object.values(e.loadout.variants ?? {}) as VariantId[]).filter((id) => !ownedBlueprints(run).includes(id));
    if (bps.length) choices.unshift({ type: 'blueprint', options: bps.slice(0, 3) });
  }
  choices.push({ type: 'enchant', options: withRng(run, (rng) => rollEnchants(run, rng, source)) });
  if (source !== 'battle') choices.push({ type: 'card', options: withRng(run, (rng) => rollCards(run, rng, source)) });
  // 에픽 3지선다 (D-112): 반장 해체는 공정마다 확률(둘째 반장은 확정), 검문!은 드물게 + 보정
  const goldRoll = withRng(run, (rng) => rng.next());
  const act = actOf(run.floor) - 1;
  const goldChance = source === 'boss' ? (LEGEND_CHANCE.boss[act] ?? 0) : source === 'elite' ? Math.min(LEGEND_CHANCE.eliteMax, LEGEND_CHANCE.elite + (run.goldPity ?? 0)) : 0;
  if (source === 'elite') run.goldPity = goldRoll < goldChance ? 0 : (run.goldPity ?? 0) + LEGEND_CHANCE.elitePity;
  if (goldRoll < goldChance) {
    const options = withRng(run, (rng) => rollGold(run, rng));
    if (options.length) {
      choices.unshift({ type: 'legend', options });
      lines.push(TEXT.legend.found);
    }
  }
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
export const ENCHANT_TYPE: Partial<Record<EnchantId, PieceType>> = { E01: 'N', E02: 'B', E03: 'R', E04: 'P', E08: 'K', E12: 'P', E13: 'N', E14: 'B', E22: 'P', E38: 'Q', E39: 'K', E40: 'P', E41: 'N', E42: 'B', E43: 'R' };

/**
 * 칸 하나의 등급을 굴린다 (D-112): 출처 · 공정별 표 + 희귀 보정. 희귀가 나오면 보정은 처음으로.
 */
const rollGrade = (run: RunState, rng: Rng, source: 'battle' | 'elite' | 'boss' | 'shop'): Grade => {
  const act = Math.min(3, actOf(Math.min(run.floor, TOTAL_FLOORS))) - 1;
  const [c, u, r0] = GRADE_WEIGHT[source][act];
  const r = Math.min(r0 + (run.pity ?? 0), r0 + PITY.max);
  const roll = rng.next() * (c + u + r);
  const g: Grade = roll < r ? 'unique' : roll < r + u ? 'rare' : 'common';
  run.pity = g === 'unique' ? 0 : (run.pity ?? 0) + PITY.step;
  return g;
};

/** 같은 등급에서 못 고르면 가까운 등급으로 (희귀 → 고급 → 일반, 일반 → 고급 → 희귀) */
const gradeFallback = (g: Grade): Grade[] => (g === 'unique' ? ['unique', 'rare', 'common'] : g === 'rare' ? ['rare', 'common', 'unique'] : ['common', 'rare', 'unique']);

const rollEnchants = (run: RunState, rng: Rng, source: 'battle' | 'elite' | 'boss' | 'altar', rareOnly = false): EnchantId[] => {
  const act = Math.min(3, actOf(Math.min(run.floor, TOTAL_FLOORS))) - 1;
  const table = (Object.keys(ENCHANTS) as EnchantId[]).flatMap((id): [EnchantId, number][] => {
    const n = run.loadout.enchants[id] ?? 0;
    if (n >= ENCHANT_MAX_STACK) return [];
    if (rareOnly && ENCHANT_GRADE[id] !== 'unique') return [];
    let w = 1;
    if (n === 1) w *= STACK_WEIGHT.second[act];
    if (n === 2) w *= STACK_WEIGHT.third[act];
    const t = ENCHANT_TYPE[id];
    if (t && t !== 'K' && run.deck.filter((x) => x === t).length >= 3) w *= TYPE_MATCH_WEIGHT;
    return [[id, w]];
  });
  const out: EnchantId[] = [];
  for (let k = 0; k < 3; k++) {
    const g = rareOnly ? 'unique' : rollGrade(run, rng, source === 'altar' ? 'boss' : source);
    for (const gg of gradeFallback(g)) {
      const pool = table.filter(([id]) => ENCHANT_GRADE[id] === gg && !out.includes(id));
      const id = weighted(rng, pool);
      if (id) {
        out.push(id);
        break;
      }
    }
  }
  // 보스는 희귀 1장 확정
  if (source === 'boss' && out.length && !out.some((id) => ENCHANT_GRADE[id] === 'unique')) {
    const rare = table.filter(([id]) => ENCHANT_GRADE[id] === 'unique' && !out.includes(id));
    if (rare.length) out[out.length - 1] = weighted(rng, rare)!;
  }
  return out;
};

/** 천공 카드 3지선다 (에픽 카드는 에픽 3지선다에서만) */
const rollCards = (run: RunState, rng: Rng, source: 'elite' | 'boss' | 'shop', n = 3): CardId[] => {
  const table = (Object.keys(CARDS) as CardId[])
    .filter((id) => !run.loadout.cards.includes(id) && CARD_GRADE[id] !== 'epic')
    .map((id): [CardId, number] => [id, CARDS[id].limit.type === 'consume' ? CONSUME_CARD_WEIGHT[source] : 1]);
  const out: CardId[] = [];
  for (let k = 0; k < n; k++) {
    const g = rollGrade(run, rng, source);
    for (const gg of gradeFallback(g)) {
      const id = weighted(rng, table.filter(([id]) => CARD_GRADE[id] === gg && !out.includes(id)));
      if (id) {
        out.push(id);
        break;
      }
    }
  }
  return out;
};

/** 가진 에픽 부품 수 (에픽 카드는 카드 칸) */
export const legendCount = (run: RunState): number => run.loadout.legends?.length ?? 0;

/** 에픽 3지선다 (D-112): 아직 없는 것 중, 군단 주력 유형을 밀어 주는 부품은 두 배로 */
const rollGold = (run: RunState, rng: Rng, n = 3): GoldId[] => {
  const owned = new Set<string>([...(run.loadout.legends ?? []), ...run.loadout.cards]);
  const slotsFull = legendCount(run) >= LEGEND_SLOTS;
  const table: [GoldId, number][] = [
    ...(slotsFull ? [] : (Object.keys(LEGENDS) as LegendId[]).filter((id) => !owned.has(id)).map((id): [GoldId, number] => {
      const t = LEGENDS[id].type;
      return [id, t && t !== 'K' && run.deck.filter((x) => x === t).length >= 3 ? 2 : 1];
    })),
    ...GOLD_CARDS.filter((id) => !owned.has(id)).map((id): [GoldId, number] => [id, 0.8]),
  ];
  return pickDistinct(rng, table, n);
};

/** 에픽 부품을 단다 */
export const addGold = (run: RunState, id: GoldId, discard?: number): string | void => {
  if (id.startsWith('C')) return addCard(run, id as CardId, discard);
  const list = (run.loadout.legends ??= []);
  if (list.includes(id as LegendId)) return '“이미 있다.”';
  if (list.length >= LEGEND_SLOTS) return TEXT.legend.full;
  list.push(id as LegendId);
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
  if (ch.type === 'blueprint') {
    addBlueprint(run, option as VariantId);
    run.stage.choices.shift();
    return;
  }
  if (ch.type === 'piece' || ch.type === 'recruit') {
    const t = option as PieceType;
    if (!canAdd(run.deck, t)) return '“규격 초과.”';
    run.deck.push(t);
    // 영입한 적이 이형이었으면 그 도면도 따라온다 (D-107: 공방에서 부어 쓴다)
    const v = ch.type === 'recruit' ? ch.variants[t] : undefined;
    if (v) addBlueprint(run, v);
    run.stage.choices.shift();
    return;
  }
  if (ch.type === 'legend') {
    const e = addGold(run, option as GoldId, discard as number | undefined);
    if (e) return e;
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
const enchantPrice = (id: EnchantId) => SHOP.enchantPrice[ENCHANT_GRADE[id] === 'epic' ? 'unique' : ENCHANT_GRADE[id]];
const cardPrice = (id: CardId) => (CARDS[id].limit.type === 'consume' ? SHOP.cardPrice.consume : SHOP.cardPrice.sustain);

const makeStock = (run: RunState, rng: Rng, rerollPrice: number = SHOP.reroll): ShopStock => {
  const pieces = Array.from({ length: SHOP.pieces }, () => weighted(rng, Object.entries(PIECE_REWARD_WEIGHTS) as [PieceType, number][])!);
  const cards = rollCards(run, rng, 'shop', SHOP.cards);
  const late = actOf(Math.min(run.floor, TOTAL_FLOORS)) >= SHOP.lateFrom;
  const enchants = rollEnchants(run, rng, 'battle').slice(0, SHOP.enchants);
  // 후반 나사 쓸 곳 (D-103): 희귀 진열 1칸 + 개조 다듬기
  if (late) {
    const rare = rollEnchants(run, rng, 'boss', true).find((id) => !enchants.includes(id));
    if (rare) enchants.push(rare);
  }
  const owned = (Object.entries(run.loadout.enchants) as [EnchantId, number][]).filter(([, n]) => n < ENCHANT_MAX_STACK);
  const polishId = late && owned.length ? owned[rng.int(owned.length)][0] : undefined;
  const bpPool = late ? [...new Set(run.deck)].flatMap((t) => variantsFor(t)).filter((id) => !ownedBlueprints(run).includes(id)) : [];
  const bpId = bpPool.length ? bpPool[rng.int(bpPool.length)] : undefined;
  // 공정이 오를수록 고물상 값도 오른다 (D-099: 후반 나사가 남아돌았다)
  const appraisal = run.loadout.enchants.E33 ? tier(MORE.E33, run.loadout.enchants.E33) : 1; // 고물 감정서 (D-105)
  const k = (1 + (actOf(Math.min(run.floor, TOTAL_FLOORS)) - 1) * SHOP.actPriceStep) * appraisal * (ascOn(run.ascension, 'shopPrice') ? ASC.shopPrice.mult : 1) * (run.loadout.legends?.includes('L08') ? LEGEND_FX.goldShop : 1);
  // 에픽 진열 (D-112): 공정 2부터 가끔
  const goldId = actOf(Math.min(run.floor, TOTAL_FLOORS)) >= LEGEND_CHANCE.shopFrom && rng.next() < LEGEND_CHANCE.shop ? rollGold(run, rng, 1)[0] : undefined;
  const at = (n: number) => Math.round(n * k);
  return {
    pieces: pieces.map((item) => ({ item, price: at(piecePrice(item)), sold: false })),
    cards: cards.map((item) => ({ item, price: at(cardPrice(item)), sold: false })),
    enchants: enchants.map((item) => ({ item, price: at(enchantPrice(item)), sold: false })),
    ...(bpId ? { blueprint: { item: bpId, price: at(SHOP.blueprint), sold: false } } : {}),
    ...(goldId ? { legend: { item: goldId, price: at(LEGEND_PRICE), sold: false } } : {}),
    ...(polishId ? { polish: { item: polishId, price: at(SHOP.polish.base + SHOP.polish.perLevel * (run.loadout.enchants[polishId] ?? 0)), sold: false } } : {}),
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
  run.deck.includes(t) && (run.loadout.forge[t] ?? 0) >= VARIANT_FORGE_LEVEL && !run.loadout.variants?.[t] ? variantsFor(t).filter((id) => ownedBlueprints(run).includes(id)) : [];

// ---------- 도면 (D-107) ----------
/** 가진 도면 (지금 단 이형 포함) */
export const ownedBlueprints = (run: RunState): VariantId[] => [...new Set([...(run.blueprints ?? []), ...(Object.values(run.loadout.variants ?? {}) as VariantId[])])];
/** 도면을 얻는다. 새 도면이면 true */
export const addBlueprint = (run: RunState, id: VariantId): boolean => {
  if (ownedBlueprints(run).includes(id)) return false;
  run.blueprints = [...(run.blueprints ?? []), id];
  return true;
};
/** 공방에서 이형을 부을 수 있는 단계인데 그 유형 도면이 없는가 (화면 안내용) */
export const lacksBlueprint = (run: RunState, t: PieceType): boolean =>
  run.deck.includes(t) && (run.loadout.forge[t] ?? 0) >= VARIANT_FORGE_LEVEL && !run.loadout.variants?.[t] && variantsFor(t).length > 0 && !forgeVariantOptions(run, t).length;

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
  addBlueprint(run, id);
  return id;
};

// ---------- 크랙 제단 ----------
/** 게이지가 가득 찼으면 원하는 인챈트를 확정으로 고를 수 있다 (GDD 8장 §8.5) */
export const altarCanPick = (run: RunState): boolean => run.crackGauge >= ALTAR.gaugeMax;

/** 도면 진열 (D-107) */
/** 에픽 진열 사기 (D-112) */
export const buyLegend = (run: RunState, discard?: number): string | void => {
  const it = shopOf(run)?.legend;
  if (!it || it.sold) return '“그런 물건 없어.”';
  if (run.gold < it.price) return '“나사가 부족해.”';
  const err = addGold(run, it.item, discard);
  if (err) return err;
  run.gold -= it.price;
  it.sold = true;
};

export const buyBlueprint = (run: RunState): string | void => {
  const it = shopOf(run)?.blueprint;
  if (!it || it.sold) return '“그런 물건 없어.”';
  if (run.gold < it.price) return '“나사가 부족해.”';
  run.gold -= it.price;
  addBlueprint(run, it.item);
  it.sold = true;
};

/** 개조 다듬기 (D-103): 가진 개조 한 단 올리기 */
export const buyPolish = (run: RunState): string | void => {
  const it = shopOf(run)?.polish;
  if (!it || it.sold) return '“그런 물건 없어.”';
  if (run.gold < it.price) return '“나사가 부족해.”';
  const n = run.loadout.enchants[it.item] ?? 0;
  if (!n || n >= ENCHANT_MAX_STACK) return '“이미 걸작이다.”';
  run.gold -= it.price;
  run.loadout.enchants[it.item] = n + 1;
  it.sold = true;
};

/** 고급 레버 (D-103, Act 2부터): 꽝 없이 희귀 개조 3지선다 */
export const altarPremiumOpen = (run: RunState): boolean => actOf(Math.min(run.floor, TOTAL_FLOORS)) >= ALTAR.premiumFrom;
export const altarPremium = (run: RunState): string | void => {
  if (run.stage.at !== 'altar' || run.stage.result) return;
  if (!altarPremiumOpen(run)) return '“아직 안 열려.”';
  if (run.gold < ALTAR.premiumCost) return '“나사가 부족해.”';
  const options = withRng(run, (rng) => rollEnchants(run, rng, 'altar', true));
  if (!options.length) return '“꺼낼 게 없다.”';
  run.gold -= ALTAR.premiumCost;
  run.stage = { at: 'reward', title: '뽑기 기계 — 고급 레버', lines: [], choices: [{ type: 'enchant', options }] };
};

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
  if (id === 'press' && i === 0) return run.deck.length > 1;
  if (id === 'jam' && i === 1) return run.gold >= 40;
  // 볼륨 1 돌발 (D-105)
  const damaged = Object.values(run.loadout.damage ?? {}).some((n) => (n ?? 0) > 0);
  if (id === 'recheck' && i === 0) return damaged && run.gold >= 50;
  if (id === 'dipping' && i === 0) return run.deck.some((t) => t !== 'K');
  if (id === 'stampForge' && i === 0) return Object.values(run.loadout.enchants).some((n) => (n ?? 0) > 0 && (n ?? 0) < ENCHANT_MAX_STACK);
  if (id === 'swapDealer' && i === 0) return run.deck.filter((t) => t === 'P').length >= 2;
  if (id === 'oilLeak' && i === 0) return run.gold >= 20;
  if (id === 'auction' && i === 0) return run.gold >= 60;
  if (id === 'scout' && i === 0) return run.deck.some((t) => t !== 'K');
  if (id === 'nightShift' && i === 0) return [...new Set(run.deck)].some((t) => (run.loadout.forge[t] ?? 0) < FORGE_MAX);
  return true;
};

export const eventChoose = (run: RunState, i: number): string | void => {
  if (run.stage.at !== 'event' || run.stage.result) return;
  const id = run.stage.id;
  if (!EVENTS[id].choices[i]) return '없는 선택지';
  if (!eventChoiceAvailable(run, id, i)) return '그건 안 돼.';
  // 볼륨 1 돌발 (D-105): 따로 처리 (결과 한 줄 또는 보상 단계)
  if (MORE_EVENTS.includes(id)) {
    const r = moreEvent(run, id, i);
    if (r !== null && run.stage.at === 'event') run.stage.result = r;
    return;
  }
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
      case 'safe': {
        run.gold += 70;
        result = `나사 +70. ${damageRandom(run)}`;
        break;
      }
      case 'press': {
        const types = [...new Set(run.deck)].filter((t) => t !== 'K');
        const t = types[withRng(run, (rng) => rng.int(types.length))];
        if (withRng(run, (rng) => rng.next()) < 0.6 && (run.loadout.forge[t] ?? 0) < FORGE_MAX) {
          run.loadout.forge[t] = (run.loadout.forge[t] ?? 0) + 1;
          result = `쿵. 제대로 찍혔다. ${PIECE_NAMES_KO[t]} 개량 +${run.loadout.forge[t]}`;
        } else result = `쿵. 찌그러졌다. ${damageType(run, t)}`;
        break;
      }
      case 'forgery': {
        run.sealed = (run.sealed ?? 0) + DEFECT.sealBattles;
        const options = withRng(run, (rng) => rollEnchants(run, rng, 'altar', true));
        run.stage = { at: 'reward', title: '검수 누락', lines: [`봉인 — 다음 ${DEFECT.sealBattles}대국 기물 하나가 상자에 남는다`], choices: options.length ? [{ type: 'enchant', options }] : [] };
        return;
      }
      case 'jam':
        result = damageRandom(run);
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
  } else if (id === 'jam' && i === 1) {
    run.gold -= 40;
    result = '기계가 멈췄다. 나사 −40.';
  } else if (id === 'jam' && i === 2) {
    const victims = run.deck.map((t, k) => [t, k] as const).filter(([t]) => t !== 'K');
    if (victims.length) {
      const [t, k] = victims[withRng(run, (rng) => rng.int(victims.length))];
      run.deck.splice(k, 1);
      result = `상자가 용광로 쪽으로 사라졌다. ${PIECE_NAMES_KO[t]} 1기를 잃었다.`;
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
