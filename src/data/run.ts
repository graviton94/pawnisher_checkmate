import type { CardId } from './cards';
import type { EnchantId } from './enchants';
import type { PieceType } from '../engine/types';
import type { Deck } from '../engine/setup';

/** 등반 구조와 경제 초기값 (GDD 8장). 모두 🔧 — 런 시뮬레이션으로 조정한다. */

export const FLOORS_PER_ACT = 12;

/** 런 시작 덱 후보 (GDD 6장 §6.3) */
export const START_DECKS: Deck[] = [
  ['K', 'P', 'N'],
  ['K', 'P', 'B'],
  ['K', 'P', 'P', 'P'],
];
export const START_GOLD = 40;

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

/** 노드 등장 가중치 (층마다 2~3개를 뽑는다). 엘리트는 5층부터. */
export const NODE_WEIGHTS: Record<Exclude<NodeKind, 'boss'>, number> = {
  battle: 46,
  elite: 12,
  shop: 13,
  forge: 11,
  altar: 8,
  event: 10,
};
export const ELITE_FROM_FLOOR = 5;

/** 층별 보드 (Act 1): 1~3층 6×6, 이후 8×8 */
export const boardFor = (floor: number): { width: number; height: number } =>
  floor <= 3 ? { width: 6, height: 6 } : { width: 8, height: 8 };

// ---------- 보상 ----------
export const GOLD_REWARD = { battle: 18, elite: 40, boss: 80, perFloor: 2 };
/** 3지선다 건너뛰기 보상 */
export const SKIP_GOLD = 10;
/** 랜덤 기물 보상: 첫·둘째 전투 확정, 이후 3전투마다 */
export const PIECE_REWARD_FIRST = 2;
export const PIECE_REWARD_EVERY = 3;
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
/** 일반 전투 적 기물 수 (킹 포함). 1~3층 3~5, 4~11층 6~10 (GDD 8장 §8.3) */
export const enemyCount = (floor: number): number => (floor <= 3 ? 2 + floor : Math.min(10, 2 + Math.ceil(floor * 0.75)));
/** 엘리트는 기물 +2, 인챈트 1~2개, 강화 +1 */
export const ELITE_BONUS = { pieces: 2, enchants: 2, forge: 1 };
/** 적 AI 단계 (0~2): 1~3층 0, 4층부터 1, 엘리트·보스 2 */
export const enemyTier = (floor: number, kind: NodeKind): number => (kind === 'elite' || kind === 'boss' ? 2 : floor <= 3 ? 0 : 1);
/** 적 대장간 강화: 8층부터 전 유형 +1 */
export const enemyForge = (floor: number): number => (floor >= 8 ? 1 : 0);

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
    deck: ['K', 'Q', 'R', 'R', 'N', 'N', 'N', 'N', 'P', 'P', 'P', 'P', 'P', 'P'],
    enchants: { E01: 3 },
    cards: ['A01'],
    forge: { N: 2 },
  },
  bishop: {
    name: '사선의 대주교',
    title: '비숍 4기 · 프리즘 레이저',
    deck: ['K', 'Q', 'R', 'R', 'B', 'B', 'B', 'B', 'P', 'P', 'P', 'P', 'P', 'P'],
    enchants: { E02: 3 },
    cards: ['A03'],
    forge: { B: 2 },
  },
  rook: {
    name: '강철 성주',
    title: '룩 3기 · 폭주 기관차',
    // 룩 3 = 초과 1 × (40 + 세금 10) = 50 → 나이트 2(50) 희생
    deck: ['K', 'Q', 'R', 'R', 'R', 'B', 'B', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
    enchants: { E03: 3 },
    cards: ['A06'],
    forge: { R: 2 },
  },
};
