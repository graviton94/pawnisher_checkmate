import type { ArenaId } from './terrain';
import type { VariantId } from './variants';
import type { AffixId } from './legions';
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
export const ACT_NAMES = ['주조 공정', '조립 공정', '검수 공정'];

/** 런 시작 덱 후보 (GDD 6장 §6.3) */
export const START_DECKS: Deck[] = [
  ['K', 'P', 'N'],
  ['K', 'P', 'B'],
  ['K', 'P', 'P', 'P'],
];
export const START_GOLD = 50;

export type NodeKind = 'battle' | 'elite' | 'boss' | 'shop' | 'forge' | 'altar' | 'event' | 'puzzle';

export const NODE_NAMES: Record<NodeKind, string> = {
  battle: '대국',
  elite: '검문!',
  boss: '반장 대국',
  shop: '고물상',
  forge: '공방',
  altar: '뽑기 기계',
  event: '돌발',
  puzzle: '묘수',
};

/** 노드 등장 가중치 (층마다 2~3개를 뽑는다). */
export const NODE_WEIGHTS: Record<Exclude<NodeKind, 'boss'>, number> = {
  battle: 46,
  elite: 12,
  shop: 13,
  forge: 11,
  altar: 8,
  event: 10,
  /** 묘수풀이 (D-097): 한 번의 가동으로 킹을 쓰러뜨리는 고정 판 */
  puzzle: 7,
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
  // D-072 (GDD 12장 F2): 2막 일반 대국은 10×8 — 폭이 넓으면 측면이 열려 정체판이 사라진다 (8×8 풀 덱 1/3이 정체판).
  // 세로로 긴 8×10도 정체가 잦아 3막은 4판 중 1판만
  if (act === 2) return kind === 'elite' ? long : { width: 10, height: 8 };
  return kind === 'boss' ? { width: 10, height: 10 } : coin < 0.25 ? { width: 8, height: 10 } : { width: 10, height: 8 };
};

// ---------- 보상 ----------
/** D-099: perAct 10 → 0 — 주문서·나사 더미·나사 자루가 더해진 뒤 36층 도착 나사가 557로 남아돌았다 */
export const GOLD_REWARD = { battle: 25, elite: 55, boss: 100, perFloor: 3, perAct: 0 };
/** 전투 골드: 기본 + Act 안 층 × 3 + (Act − 1) × 10 (층 전체로 키우면 Act 3에서 골드가 넘쳐 강화가 4~5유형 완성된다) */
export const battleGold = (floor: number, kind: 'battle' | 'elite' | 'boss'): number =>
  GOLD_REWARD[kind] + inAct(floor) * GOLD_REWARD.perFloor + (actOf(floor) - 1) * GOLD_REWARD.perAct;
/** 3지선다 건너뛰기 보상 */
export const SKIP_GOLD = 10;
/** 기물 3지선다 보상: Act 1은 매 승리 (초반은 덱빌딩 고민이 중심), Act 2·3은 2승마다 */
export const pieceRewardDue = (floor: number, wins: number): boolean => actOf(floor) === 1 || wins % 2 === 0;
export const PIECE_REWARD_WEIGHTS: Record<Exclude<PieceType, 'K'>, number> = { P: 38, N: 22, B: 22, R: 12, Q: 6 };

/** 희귀 인챈트 (나머지는 일반). 엘리트·보스는 희귀 가중, 보스는 희귀 1장 확정. */
export const RARE_ENCHANTS: EnchantId[] = ['E05', 'E06', 'E07', 'E09', 'E11', 'E15', 'E26', 'E31', 'E44'];
export const RARE_WEIGHT = { battle: 0.5, elite: 1.5, boss: 2 };
/**
 * 인챈트 3지선다가 이미 가진 인챈트 쪽으로 모이게 한다 (중반 "파츠 모으기" → 후반 시너지).
 * 1장 보유 → 2장째 가중치, 2장 보유 → ★3장째 가중치. Act 1에서는 ★이 드물고 Act 3에서 흔해진다.
 */
export const STACK_WEIGHT = { second: [1.6, 2.2, 2.5], third: [0.3, 1.0, 1.5] };
/** 덱 주력 유형(3기 이상)의 유형 인챈트 가중치 */
export const TYPE_MATCH_WEIGHT = 1.5;

/** 카드 3지선다는 엘리트·보스에서만. 소멸형은 희소하게 (사용자 결정: "이걸로 고비를 넘긴다"는 한 방) */
export const CONSUME_CARD_WEIGHT = { elite: 0.35, boss: 0.6, shop: 0.4 };

// ---------- 상점 ----------
export const SHOP = {
  pieces: 3,
  cards: 2,
  enchants: 1,
  /** 기물 가격 = 가치 × 이 배율 */
  pieceMult: 1.6,
  /** 공정(Act)마다 고물상 값 +40% (D-099) */
  actPriceStep: 0.4,
  /** 판매가 = 가치 × 이 배율 */
  sellMult: 0.6,
  cardPrice: { sustain: 55, consume: 85 },
  enchantPrice: { common: 70, rare: 110 },
  reroll: 15,
  rerollStep: 5,
  /** 후반 나사 쓸 곳 (D-103): Act 2부터 「희귀 진열」 1칸 + 「개조 다듬기」(가진 개조 한 단 올리기) — 값 = 기본 + 단 × 가산, 공정 배율 적용 */
  lateFrom: 2,
  polish: { base: 80, perLevel: 40 },
  /** 도면 진열 값 (D-107) */
  blueprint: 110,
};

// ---------- 대장간 ----------
/** 다음 단계(+1 ~ +5)로 올리는 비용. 가파르게 오른다 (GDD 6장 §6.5) */
export const FORGE_COST = [30, 45, 70, 105, 150];

// ---------- 크랙 제단 ----------
export const ALTAR = {
  cost: 40,
  /** 결과 확률: 희귀 인챈트 3지선다 / 상위 기물 / 이형 거푸집 (대박, D-084) / 꽝 */
  odds: { enchant: 0.45, piece: 0.25, variant: 0.1 },
  /** 꽝일 때 쌓이는 크랙 게이지. 가득 차면 다음 제단에서 원하는 인챈트 확정 */
  gaugeMax: 3,
  /** 고급 레버 (D-103, Act 2부터): 꽝 없이 희귀 개조 3지선다 */
  premiumCost: 120,
  premiumFrom: 2,
};

// ---------- 적 군단 ----------
/**
 * 일반 전투 적 기물 수 (킹 포함). 플레이어 덱보다 조금 적게 시작해 따라 오른다.
 * 1층 2 · 2층 3 · 3층 4 · 4층 4 · 6층 5 · 8층 6 · 10층 7 (11층 7) (GDD 8장 §8.3의 3~5 / 6~10에서 조정, 런 시뮬레이션)
 */
/** 일반 군단 기물 상한 (D-072) */
export const LEGION_CAP = 12;
/**
 * 빠른 승리 보너스 (D-072, Into the Breach · 파이어 엠블렘의 기준 턴): 내 턴 기준 안에 이기면 전투 골드에 bonus만큼 더.
 * 기준 = GDD 12장 F7 판 길이 예산 (양측 합 턴 Act 1 ≤ 16 · Act 2 ≤ 20 · Act 3 ≤ 24 → 내 턴 8 · 10 · 12)
 */
export const PAR = { rounds: [8, 10, 12], bonus: 0.3 };
export const parRounds = (floor: number, kind: NodeKind): number => PAR.rounds[actOf(floor) - 1] + (kind === 'battle' ? 0 : 2);
export const enemyCount = (floor: number): number => {
  const act = actOf(floor);
  const f = inAct(floor);
  if (act === 1) return floor <= 3 ? 1 + floor : Math.min(10, 3 + Math.floor(floor / 2)); // 4층 5 → 11층 8
  // D-072 (GDD 12장 F3): 일반 군단 상한 12기 — 더 강하게는 수 대신 개량·접사로. 엘리트·군주만 13기 이상
  if (act === 2) return Math.min(LEGION_CAP, 9 + Math.floor(f / 2)); // 9~12
  return LEGION_CAP;
};
/** 일반·엘리트 군단의 킹은 보스보다 약하다 — 1~3층 50%, 4~7층 70%, 8~11층 85%, Act 2 90%, Act 3·보스 100% (HP 기준).
 * 1~3층 적 킹은 특히 약하다 (도입 구간: 작은 덱으로 100 HP 킹을 끝내지 못해 킹 맞대결 동전 던지기가 되는 것을 막는다) */
/** 킹 노출 완화 (D-077, Shotgun King류): 2·3막 일반·엘리트 군단 킹 HP 배율 — 노릴 만한 목표가 빨리 보이게. 군주(보스)는 그대로 */
export const KING_EXPOSE = 0.9;
export const enemyKingScale = (floor: number): { hp: number; atk: number } => {
  if (actOf(floor) === 2) return { hp: 1, atk: 1 };
  if (actOf(floor) === 3) return { hp: 1, atk: 1 };
  return floor <= 3 ? { hp: 0.5, atk: 0.7 } : floor <= 7 ? { hp: 0.8, atk: 0.9 } : { hp: 0.95, atk: 1 };
};
/** 엘리트는 기물 +1, 인챈트 1개(8층부터 2장 중첩). Act 3 엘리트는 인챈트 2개 + 카드 1장 */
/** D-099: 검문! 승률 88~92% → 목표 65~85%: 개량 +1. 단 Act 1에는 없다 (붙이니 46~49%로 떨어졌다) */
export const ELITE_BONUS = { pieces: 1, enchants: 1, forge: 1 };
export const eliteForge = (floor: number): number => (actOf(floor) === 1 ? 0 : ELITE_BONUS.forge);
/** 적 군단의 이형 거푸집 수 (GDD 13장 P2, D-084): 정예는 Act 1부터 1개 · Act 3 정예 2개, 일반은 Act 2부터 확률로 1개 (Act 3은 항상) */
export const enemyVariantCount = (floor: number, kind: NodeKind, roll: number): number => {
  const act = actOf(floor);
  if (kind === 'elite') return act === 3 ? 2 : 1;
  if (act === 3) return 1;
  return act === 2 && roll < 0.4 ? 1 : 0;
};
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
  // 중반부터는 실수하지 않는 AI: 머리를 써야 이긴다
  if (actOf(floor) >= 2 || kind === 'boss' || kind === 'elite' || floor >= 6) return 2;
  return floor <= 3 ? 0 : 1;
};
/** 적 대장간 강화: Act 1 없음, Act 2 +1~+3, Act 3 +4~+5 (후반에도 긴장이 남도록) */
export const enemyForge = (floor: number): number => {
  const act = actOf(floor);
  if (act === 1) return 0;
  return Math.min(5, (act === 2 ? 1 : 4) + Math.floor((inAct(floor) - 1) / 4));
};

/** 중간 보스 컨셉 (사용자 결정: 나이트·비숍·룩 컨셉 중 런마다 2개가 Act 1·2 보스) */
export type BossId = 'knight' | 'bishop' | 'rook' | 'pawn' | 'variant' | 'affix';
export interface BossDef {
  name: string;
  title: string;
  /** 세계관 (docs/story.md §2): 별칭 · 대사 한 줄 (D-091 — 짧게) */
  role: string;
  quote: string;
  deck: Deck;
  enchants: Partial<Record<EnchantId, number>>;
  cards: CardId[];
  forge: Partial<Record<PieceType, number>>;
  /** 전장 규칙 (D-097, data/terrain.ts ARENAS) */
  arena: ArenaId;
  /** 이형 거푸집 · 정예 접사 (D-106 이형 반장 · 검문 반장) */
  variants?: Partial<Record<PieceType, VariantId>>;
  affixes?: { type: PieceType; id: AffixId }[];
}

export const BOSSES: Record<BossId, BossDef> = {
  knight: {
    name: '나이트 반장',
    title: '나이트 4기 · 방전 기병',
    role: '주조 라인의 발굽',
    quote: '규격 밖은 밟고 간다.',
    // 나이트 4 = 초과 2 × (25 + 세금 10) = 70 → 비숍 2(50) + 폰 2(20) 희생
    deck: ['K', 'Q', 'R', 'R', 'N', 'N', 'N', 'N', 'P', 'P', 'P', 'P'],
    enchants: { E01: 3 },
    cards: ['A01'],
    forge: { N: 3 }, // D-099: 첫 반장 승률 86% → 목표 65~80%
    arena: 'hooves',
  },
  bishop: {
    name: '비숍 반장',
    title: '비숍 4기 · 집광 렌즈',
    role: '조립 라인의 렌즈',
    quote: '삐뚤어진 건 빛에 다 보여.',
    deck: ['K', 'Q', 'R', 'R', 'B', 'B', 'B', 'B', 'P', 'P', 'P', 'P'],
    enchants: { E02: 3 },
    cards: ['A03'],
    forge: { B: 2 }, // D-111: 첫 반장 55% → 한 단 낮춤
    arena: 'lens',
  },
  rook: {
    name: '룩 반장',
    title: '룩 3기 · 폭주 기관차',
    role: '검수 라인의 마지막 문',
    quote: '여기서 끝이다.',
    // 룩 3 = 초과 1 × (40 + 세금 10) = 50 → 나이트 2(50) 희생
    deck: ['K', 'Q', 'R', 'R', 'R', 'B', 'B', 'P', 'P', 'P', 'P', 'P', 'P'],
    enchants: { E03: 3 },
    cards: ['A06'],
    forge: { R: 3 }, // D-111: 첫 반장 85% → 한 단 올림
    arena: 'wall',
  },
  // ---- 볼륨 2 (D-106): 반장 셋 더 — 한 출하에 둘이 나오니 여섯 중 둘 ----
  pawn: {
    name: '폰 반장',
    title: '폰 10기 · 양산 라인',
    role: '물량 라인의 감독',
    quote: '하나 부서지면 둘 찍는다.',
    deck: ['K', 'Q', 'R', 'R', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
    enchants: { E12: 2, E04: 2 }, // D-111: 첫 반장 41% → 개조 한 단 · 개량 한 단 낮춤
    cards: ['A06'],
    forge: { P: 1 },
    arena: 'belt',
  },
  variant: {
    name: '이형 반장',
    title: '이형 거푸집 다섯',
    role: '규격 외 부품 감독',
    quote: '규격? 그건 네 사정이고.',
    deck: ['K', 'Q', 'R', 'R', 'B', 'B', 'N', 'N', 'P', 'P', 'P', 'P'],
    enchants: { E09: 2 },
    cards: ['A04'],
    forge: { N: 2, B: 2, R: 1 }, // D-111: 첫 반장 90% → 올림
    arena: 'scrapyard',
    variants: { P: 'boiler', N: 'spring', B: 'scope', R: 'turret', Q: 'command' },
  },
  affix: {
    name: '검문 반장',
    title: '정예 접사 넷',
    role: '검문소의 끝',
    quote: '서류는 네 장. 너는 한 장도 못 넘긴다.',
    deck: ['K', 'Q', 'R', 'R', 'B', 'B', 'N', 'N', 'P', 'P', 'P', 'P'],
    enchants: { E08: 2 },
    cards: ['A06'],
    forge: { K: 1 },
    arena: 'checkpoint',
    affixes: [
      { type: 'Q', id: 'lastRivet' },
      { type: 'R', id: 'plate' },
      { type: 'N', id: 'recoil' },
      { type: 'B', id: 'guardBolt' },
    ],
  },
};

/** 36층 최종 보스 (10×10 대성당 전면전). 퀸 2기 · 연쇄 지휘 ★ · 근위대 결속 */
export const FINAL_BOSS: BossDef = {
  name: '공장장',
  title: '퀸 2기 · 대단원 · 호위 리벳',
  role: '첫 번째 킹',
  quote: '그 왕관, 종이로군.',
  // 퀸 2 = 초과 1 × (60 + 세금 10) = 70 → 나이트 1(25) + 비숍 1(25) + 폰 2(20) 희생
  deck: ['K', 'Q', 'Q', 'R', 'R', 'B', 'N', 'P', 'P', 'P', 'P', 'P', 'P'],
  enchants: { E05: 3, E08: 3, E06: 2 },
  cards: ['A06', 'C03'],
  forge: { Q: 5, R: 4, K: 4 }, // D-099: 83% → 목표 55~80%
  arena: 'final',
};
