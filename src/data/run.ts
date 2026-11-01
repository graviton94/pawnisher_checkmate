import type { PieceType } from '../engine/types';
import type { Deck } from '../engine/setup';
import type { Grade } from './grades';

/** 등반 구조와 경제 (규격 2.0, GDD 14장 §3.5). 모두 🔧 — 자동 등반으로 조정한다. */

/** 3공정 × 7층 = 21층 (일반 · 노드 6층 + 반장 1). 목표 한 출하 30~45분 */
export const FLOORS_PER_ACT = 7;
export const ACTS = 3;
export const TOTAL_FLOORS = FLOORS_PER_ACT * ACTS;
/** 층이 속한 공정 (1~3)과 공정 안의 층 (1~7) */
export const actOf = (floor: number): number => Math.ceil(floor / FLOORS_PER_ACT);
export const inAct = (floor: number): number => ((floor - 1) % FLOORS_PER_ACT) + 1;
export const ACT_NAMES = ['주조 공정', '조립 공정', '검수 공정'];

/** 시작 세트 후보 (작은 시작 = 이야기의 「따르는 건 몇뿐」) */
export const START_DECKS: Deck[] = [
  ['K', 'P', 'N'],
  ['K', 'P', 'B'],
  ['K', 'P', 'P', 'P'],
];
export const START_GOLD = 50;

/** 노드 6종 (규격 2.0) */
export type NodeKind = 'battle' | 'elite' | 'boss' | 'shop' | 'forge' | 'event';

export const NODE_NAMES: Record<NodeKind, string> = {
  battle: '대국',
  elite: '검문!',
  boss: '반장 대국',
  shop: '고물상',
  forge: '공방',
  event: '돌발',
};

/** 노드 등장 가중치 (층마다 2~3개) */
export const NODE_WEIGHTS: Record<Exclude<NodeKind, 'boss'>, number> = { battle: 46, elite: 13, shop: 14, forge: 12, event: 15 };
/** 검문!이 나오기 시작하는 공정 안 층 (1공정은 3층, 2·3공정은 2층) */
export const eliteFrom = (floor: number): number => (actOf(floor) === 1 ? 3 : 2);

/** 판 크기: 일반 6×6 · 검문! 1공정 6×6, 이후 8×6 · 반장 · 도금왕 8×8 */
export const boardFor = (floor: number, kind: NodeKind = 'battle'): { width: number; height: number } => {
  if (kind === 'boss') return { width: 8, height: 8 };
  if (kind === 'elite' && actOf(floor) >= 2) return { width: 8, height: 6 };
  return { width: 6, height: 6 };
};

// ---------- 보상 ----------
export const GOLD_REWARD = { battle: 30, elite: 60, boss: 100, perFloor: 3 };
export const battleGold = (floor: number, kind: 'battle' | 'elite' | 'boss'): number => GOLD_REWARD[kind] + inAct(floor) * GOLD_REWARD.perFloor;
/** 3지선다 건너뛰기 보상 */
export const SKIP_GOLD = 10;
/** 기물 보상 가중치 */
export const PIECE_REWARD_WEIGHTS: Record<Exclude<PieceType, 'K'>, number> = { P: 34, N: 24, B: 24, R: 12, Q: 6 };
/** 군단 상한 · 유형별 상한 (체스 세트 규격) */
export const DECK_MAX = 10;
export const TYPE_MAX: Record<PieceType, number> = { K: 1, Q: 2, R: 3, B: 3, N: 3, P: 8 };

/** 부품 등급 가중치 (커먼 · 레어 · 유니크 · 에픽) — 출처 · 공정별 */
export const PART_GRADE_WEIGHT: Record<'shop' | 'elite' | 'boss' | 'event', [number, number, number, number][]> = {
  shop: [[62, 30, 8, 0], [50, 36, 12, 2], [40, 40, 16, 4]],
  elite: [[40, 45, 13, 2], [30, 48, 18, 4], [22, 48, 24, 6]],
  boss: [[0, 30, 55, 15], [0, 20, 55, 25], [0, 10, 55, 35]],
  event: [[30, 50, 18, 2], [25, 50, 20, 5], [20, 50, 24, 6]],
};

/**
 * 양날 한 쌍 (Shotgun King 흑백 카드, 규격 2.0 §3.3): 검문! · 반장 보상은 「내 부품 하나 + 적 강화 하나」 묶음 셋 중 하나.
 * 적 강화는 출하 끝까지 남는다. 계약 부품(1.0)이 여기로 녹았다.
 */
export type ThreatId = 'pawnHp' | 'knightAtk' | 'bishopHp' | 'rookAtk' | 'queenHp' | 'kingHp' | 'allAtk' | 'allHp';
export const THREATS: Record<ThreatId, { name: string; type?: PieceType; hp?: number; atk?: number }> = {
  pawnHp: { name: '적 폰 HP +25%', type: 'P', hp: 1.25 },
  knightAtk: { name: '적 나이트 공격 +20%', type: 'N', atk: 1.2 },
  bishopHp: { name: '적 비숍 HP +25%', type: 'B', hp: 1.25 },
  rookAtk: { name: '적 룩 공격 +20%', type: 'R', atk: 1.2 },
  queenHp: { name: '적 퀸 HP +30%', type: 'Q', hp: 1.3 },
  kingHp: { name: '적 킹 HP +20%', type: 'K', hp: 1.2 },
  allAtk: { name: '적 전체 공격 +8%', atk: 1.08 },
  allHp: { name: '적 전체 HP +8%', hp: 1.08 },
};
export const PAIR_OPTIONS = 3;

// ---------- 고물상 ----------
export const SHOP = {
  pieces: 3,
  carves: 2,
  parts: 2,
  /** 기물 값 = 가치 × 이 배율 */
  pieceMult: 1.6,
  /** 공정마다 값 +25% */
  actPriceStep: 0.25,
  /** 판매가 = 가치 × 이 배율 */
  sellMult: 0.5,
  partPrice: { common: 60, rare: 90, unique: 130, epic: 200 } as Record<Grade, number>,
  reroll: 15,
  rerollStep: 5,
};

// ---------- 적 군단 ----------
/** 일반 대국 적 기물 수 (킹 포함) — 공정 안 층별 */
export const ENEMY_COUNT: number[][] = [
  [2, 3, 3, 4, 4, 5],
  [5, 5, 6, 6, 7, 7],
  [6, 6, 7, 7, 8, 8],
];
export const enemyCount = (floor: number): number => ENEMY_COUNT[actOf(floor) - 1][Math.min(5, inAct(floor) - 1)];
/** 적 수치 배율 (정적 디자인 — 적은 수치로만 강해진다) */
export const ENEMY_SCALE = [
  { hp: 1, atk: 1 },
  { hp: 1.15, atk: 1.08 },
  { hp: 1.28, atk: 1.14 },
];
/** 1공정 앞쪽 적 킹은 약하다 (작은 군단으로 100 HP 킹을 끝내지 못하는 동전 던지기 방지) */
export const earlyKingHp = (floor: number): number => (floor <= 2 ? 0.5 : floor <= 4 ? 0.75 : 1);
export const earlyKingAtk = (floor: number): number => (floor <= 2 ? 0.7 : 1);
/** 적 AI 단계 (0~2) */
export const enemyTier = (floor: number, kind: NodeKind): number => {
  if (actOf(floor) >= 2 || kind === 'boss') return 2;
  if (floor <= 2) return 0;
  return 1;
};
/** 검문!: 기물 수 +1 · 정예 1기 (HP ×2) */
export const ELITE = { pieces: 1 };

/** 반장 6 (런마다 둘) + 도금왕 */
export type BossId = 'knight' | 'bishop' | 'rook' | 'pawn' | 'variant' | 'affix';
export interface BossDef {
  name: string;
  title: string;
  /** 세계관 별칭 · 대사 한 줄 (D-091) */
  role: string;
  quote: string;
  deck: Deck;
}

export const BOSSES: Record<BossId, BossDef> = {
  knight: { name: '나이트 반장', title: '나이트 넷', role: '주조 라인의 발굽', quote: '규격 밖은 밟고 간다.', deck: ['K', 'N', 'N', 'N', 'N', 'P', 'P', 'P', 'R'] },
  bishop: { name: '비숍 반장', title: '비숍 넷', role: '조립 라인의 렌즈', quote: '삐뚤어진 건 빛에 다 보여.', deck: ['K', 'B', 'B', 'B', 'B', 'P', 'P', 'P', 'R'] },
  rook: { name: '룩 반장', title: '룩 셋', role: '검수 라인의 마지막 문', quote: '여기서 끝이다.', deck: ['K', 'R', 'R', 'R', 'P', 'P', 'P', 'P', 'B'] },
  pawn: { name: '폰 반장', title: '폰 여덟', role: '물량 라인의 감독', quote: '하나 부서지면 둘 찍는다.', deck: ['K', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'R'] },
  variant: { name: '이형 반장', title: '각인 셋', role: '규격 외 부품 감독', quote: '규격? 그건 네 사정이고.', deck: ['K', 'B', 'N', 'P', 'P', 'P', 'R', 'Q', 'P'] },
  affix: { name: '검문 반장', title: '서류 셋', role: '검문소의 끝', quote: '서류는 셋. 너는 셋까지만 둔다.', deck: ['K', 'N', 'N', 'B', 'P', 'P', 'R', 'Q', 'P'] },
};

/** 도금왕 (D-132) */
export const FINAL_BOSS: BossDef = {
  name: '도금왕',
  title: '퀸 · 금칠 근위대',
  role: '금을 칠한 첫 번째 킹',
  quote: '그 왕관, 종이로군.',
  deck: ['K', 'Q', 'R', 'R', 'B', 'N', 'P', 'P', 'P', 'P'],
};
/** 반장 수치: 공정 배율 위에 더 (2공정 반장은 조금 더 세다) */
export const BOSS_SCALE = [
  { hp: 0.9, atk: 0.9 },
  { hp: 1.05, atk: 1.0 },
  { hp: 1.05, atk: 1.0 },
];
/** 1공정 반장은 군단 앞쪽 7기만 데려온다 (B1: 9~10기 반장에 첫 반장 36%) */
export const BOSS_ACT1_SIZE = 7;
/** 거푸집 상인: 각인을 받는 적 기물 수 (B1: 전부 → 이형 반장 6%) */
export const MOLDS_COUNT = 3;

/** 오늘의 출하 (D-122): 압력 고정 */
export const DAILY = { ascension: 1 };
