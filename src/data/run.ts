import type { CardId } from './cards';
import type { EnchantId } from './enchants';
import type { PieceType } from '../engine/types';
import type { Deck } from '../engine/setup';

/** 등반 구조와 경제 초기값 (GDD 8장). 모두 🔧 — 런 시뮬레이션으로 조정한다. */

export const FLOORS_PER_ACT = 12;
export const ACTS = 3;
export const TOTAL_FLOORS = FLOORS_PER_ACT * ACTS;
/** 층(1~36)이 속한 Act (1~3)와 Act 안에서의 층 (1~12) */
export const actOf = (floor: number): number => Math.ceil(floor / FLOORS_PER_ACT);
export const inAct = (floor: number): number => ((floor - 1) % FLOORS_PER_ACT) + 1;
export const ACT_NAMES = ['서막', '격돌', '초월'];

/** 런 시작 덱 후보 (GDD 6장 §6.3) */
export const START_DECKS: Deck[] = [
  ['K', 'P', 'N'],
  ['K', 'P', 'B'],
  ['K', 'P', 'P', 'P'],
];
export const START_GOLD = 50;

export type NodeKind = 'battle' | 'elite' | 'boss' | 'shop' | 'forge' | 'altar' | 'event';

export const NODE_NAMES: Record<NodeKind, string> = {
  battle: '전투',
  elite: '엘리트',
  boss: '보스',
  shop: '상점',
  forge: '대장간',
  altar: '크랙 제단',
  event: '이벤트',
};

/** 노드 등장 가중치 (층마다 2~3개를 뽑는다). */
export const NODE_WEIGHTS: Record<Exclude<NodeKind, 'boss'>, number> = {
  battle: 46,
  elite: 12,
  shop: 13,
  forge: 11,
  altar: 8,
  event: 10,
};
/** 엘리트가 나오기 시작하는 Act 안 층 (Act 1은 5층, Act 2·3은 2층) */
export const eliteFrom = (floor: number): number => (actOf(floor) === 1 ? 5 : 2);

/**
 * 층별 보드 (GDD 8장 §8.3). coin(0~1)은 비대칭 보드 방향.
 * Act 1: 1~3층 6×6, 이후 8×8 · Act 2: 8×8, 엘리트 8×10/10×8 · Act 3: 8×10/10×8 · 36층 10×10
 */
export const boardFor = (floor: number, kind: NodeKind = 'battle', coin = 0): { width: number; height: number } => {
  const act = actOf(floor);
  const long = coin < 0.5 ? { width: 8, height: 10 } : { width: 10, height: 8 };
  if (floor === TOTAL_FLOORS) return { width: 10, height: 10 };
  if (kind === 'boss' && act < 3) return { width: 8, height: 8 };
  if (act === 1) return floor <= 3 ? { width: 6, height: 6 } : { width: 8, height: 8 };
  if (act === 2) return kind === 'elite' ? long : { width: 8, height: 8 };
  return kind === 'boss' ? { width: 10, height: 10 } : long;
};

// ---------- 보상 ----------
export const GOLD_REWARD = { battle: 25, elite: 55, boss: 100, perFloor: 3, perAct: 10 };
/** 전투 골드: 기본 + Act 안 층 × 3 + (Act − 1) × 10 (층 전체로 키우면 Act 3에서 골드가 넘쳐 강화가 4~5유형 완성된다) */
export const battleGold = (floor: number, kind: 'battle' | 'elite' | 'boss'): number =>
  GOLD_REWARD[kind] + inAct(floor) * GOLD_REWARD.perFloor + (actOf(floor) - 1) * GOLD_REWARD.perAct;
/** 3지선다 건너뛰기 보상 */
export const SKIP_GOLD = 10;
/** 랜덤 기물 보상: 첫 3전투 확정, 이후 2전투마다 (런 시뮬레이션으로 조정) */
export const PIECE_REWARD_FIRST = 3;
export const PIECE_REWARD_EVERY = 2;
export const PIECE_REWARD_WEIGHTS: Record<Exclude<PieceType, 'K'>, number> = { P: 38, N: 22, B: 22, R: 12, Q: 6 };

/** 희귀 인챈트 (나머지는 일반). 엘리트·보스는 희귀 가중, 보스는 희귀 1장 확정. */
export const RARE_ENCHANTS: EnchantId[] = ['E05', 'E06', 'E07', 'E09', 'E11'];
export const RARE_WEIGHT = { battle: 0.5, elite: 1.5, boss: 2 };
/** 이미 2장인 인챈트의 등장 가중치 배율 (3장째는 드물게, GDD 7장 §7.2) */
export const THIRD_STACK_WEIGHT = 0.3;

/** 카드 3지선다는 엘리트·보스에서만. 소멸형은 희소하게 (사용자 결정: "이걸로 고비를 넘긴다"는 한 방) */
export const CONSUME_CARD_WEIGHT = { elite: 0.35, boss: 0.6, shop: 0.4 };

// ---------- 상점 ----------
export const SHOP = {
  pieces: 3,
  cards: 2,
  enchants: 1,
  /** 기물 가격 = 가치 × 이 배율 */
  pieceMult: 1.6,
  /** 판매가 = 가치 × 이 배율 */
  sellMult: 0.6,
  cardPrice: { sustain: 55, consume: 85 },
  enchantPrice: { common: 70, rare: 110 },
  reroll: 15,
  rerollStep: 5,
};

// ---------- 대장간 ----------
/** 다음 단계(+1 ~ +5)로 올리는 비용. 가파르게 오른다 (GDD 6장 §6.5) */
export const FORGE_COST = [30, 45, 70, 105, 150];

// ---------- 크랙 제단 ----------
export const ALTAR = {
  cost: 40,
  /** 결과 확률: 희귀 인챈트 3지선다 / 상위 기물 / 꽝 */
  odds: { enchant: 0.45, piece: 0.25 },
  /** 꽝일 때 쌓이는 크랙 게이지. 가득 차면 다음 제단에서 원하는 인챈트 확정 */
  gaugeMax: 3,
};

// ---------- 적 군단 ----------
/**
 * 일반 전투 적 기물 수 (킹 포함). 플레이어 덱보다 조금 적게 시작해 따라 오른다.
 * 1층 2 · 2층 3 · 3층 4 · 4층 4 · 6층 5 · 8층 6 · 10층 7 (11층 7) (GDD 8장 §8.3의 3~5 / 6~10에서 조정, 런 시뮬레이션)
 */
export const enemyCount = (floor: number): number => {
  const act = actOf(floor);
  const f = inAct(floor);
  if (act === 1) return floor <= 3 ? 1 + floor : Math.min(10, 2 + Math.floor(floor / 2));
  if (act === 2) return Math.min(14, 8 + Math.floor(f / 2)); // 10~14 (GDD) 에서 Act 1 곡선에 이어 8~13
  return Math.min(16, 12 + Math.floor(f / 3)); // 12~15
};
/** 일반·엘리트 군단의 킹은 보스보다 약하다 — 1~3층 50%, 4~7층 70%, 8~11층 85%, Act 2 90%, Act 3·보스 100% (HP 기준).
 * 1~3층 적 킹은 특히 약하다 (도입 구간: 작은 덱으로 100 HP 킹을 끝내지 못해 킹 맞대결 동전 던지기가 되는 것을 막는다) */
export const enemyKingScale = (floor: number): { hp: number; atk: number } => {
  if (actOf(floor) === 2) return { hp: 0.9, atk: 1 };
  if (actOf(floor) === 3) return { hp: 1, atk: 1 };
  return floor <= 3 ? { hp: 0.5, atk: 0.7 } : floor <= 7 ? { hp: 0.7, atk: 0.85 } : floor <= 11 ? { hp: 0.85, atk: 1 } : { hp: 1, atk: 1 };
};
/** 엘리트는 기물 +1, 인챈트 1개(8층부터 2장 중첩). Act 3 엘리트는 인챈트 2개 + 카드 1장 */
export const ELITE_BONUS = { pieces: 1, enchants: 1, forge: 0 };
/** Act 3 일반 군단도 인챈트 1개를 가진다 (GDD 8장: "14~16기 + 카드·인챈트") */
export const actEnchants = (floor: number, kind: NodeKind): number => {
  const act = actOf(floor);
  if (kind === 'elite') return act === 3 ? 3 : act === 2 ? 2 : ELITE_BONUS.enchants;
  if (act === 3) return 2;
  return act === 2 && inAct(floor) >= 6 ? 1 : 0;
};
/** 적 인챈트 중첩: Act 1 1장(8층부터 2장), Act 2 2장, Act 3 엘리트 3장(★)·일반 2장 */
export const enemyEnchantStack = (floor: number, kind: NodeKind): number => {
  const act = actOf(floor);
  if (act === 3) return kind === 'elite' ? 3 : 2;
  if (act === 2) return 2;
  return floor >= 8 ? 2 : 1;
};
/** 적 AI 단계 (0~2): 1~3층 0, 4층부터 1, 8층 이상 엘리트·보스 2, Act 3 전부 2 */
export const enemyTier = (floor: number, kind: NodeKind): number => {
  if (actOf(floor) === 3 || kind === 'boss' || (kind === 'elite' && floor >= 8)) return 2;
  return floor <= 3 ? 0 : 1;
};
/** 적 대장간 강화: Act 1 없음, Act 2 +1~+3, Act 3 +3~+5 (플레이어 강화 곡선을 따라간다) */
export const enemyForge = (floor: number): number => {
  const act = actOf(floor);
  if (act === 1) return 0;
  return Math.min(5, (act === 2 ? 1 : 3) + Math.floor((inAct(floor) - 1) / 4));
};

/** 중간 보스 컨셉 (사용자 결정: 나이트·비숍·룩 컨셉 중 런마다 2개가 Act 1·2 보스) */
export type BossId = 'knight' | 'bishop' | 'rook';
export interface BossDef {
  name: string;
  title: string;
  deck: Deck;
  enchants: Partial<Record<EnchantId, number>>;
  cards: CardId[];
  forge: Partial<Record<PieceType, number>>;
}

export const BOSSES: Record<BossId, BossDef> = {
  knight: {
    name: '기병 군주',
    title: '나이트 4기 · 천둥기병',
    // 나이트 4 = 초과 2 × (25 + 세금 10) = 70 → 비숍 2(50) + 폰 2(20) 희생
    deck: ['K', 'Q', 'R', 'R', 'N', 'N', 'N', 'N', 'P', 'P', 'P', 'P'],
    enchants: { E01: 3 },
    cards: ['A01'],
    forge: { N: 2 },
  },
  bishop: {
    name: '사선의 대주교',
    title: '비숍 4기 · 프리즘 레이저',
    deck: ['K', 'Q', 'R', 'R', 'B', 'B', 'B', 'B', 'P', 'P', 'P', 'P'],
    enchants: { E02: 3 },
    cards: ['A03'],
    forge: { B: 2 },
  },
  rook: {
    name: '강철 성주',
    title: '룩 3기 · 폭주 기관차',
    // 룩 3 = 초과 1 × (40 + 세금 10) = 50 → 나이트 2(50) 희생
    deck: ['K', 'Q', 'R', 'R', 'R', 'B', 'B', 'P', 'P', 'P', 'P', 'P', 'P'],
    enchants: { E03: 3 },
    cards: ['A06'],
    forge: { R: 1 },
  },
};

/** 36층 최종 보스 (10×10 대성당 전면전). 퀸 2기 · 연쇄 지휘 ★ · 근위대 결속 */
export const FINAL_BOSS: BossDef = {
  name: '균열의 왕',
  title: '퀸 2기 · 그랜드 피날레 · 근위대 결속',
  // 퀸 2 = 초과 1 × (60 + 세금 10) = 70 → 나이트 1(25) + 비숍 1(25) + 폰 2(20) 희생
  deck: ['K', 'Q', 'Q', 'R', 'R', 'B', 'N', 'P', 'P', 'P', 'P', 'P', 'P'],
  enchants: { E05: 3, E08: 2, E06: 1 },
  cards: ['A06', 'C03'],
  forge: { Q: 3, R: 2, K: 2 },
};
