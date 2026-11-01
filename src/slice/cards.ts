import type { CarveId } from '../data/carves';
import type { PieceType } from '../engine/types';

/**
 * 명령 카드 (수직 조각 — 분대 + 명령 덱, D-142). 카드를 태엽으로 내면 기물이 체스로 움직이고,
 * 내려앉은 자리에서 다음에 갈 수 있는 칸을 친다. 카드는 「누가 · 얼마에 · 무엇을 더」만 정한다.
 */
export type CommandId =
  | 'advance' | 'leap' | 'diagonal' | 'kingStep' | 'order'
  | 'pierceDiag' | 'crossLeap' | 'charge' | 'plate' | 'repair' | 'reload' | 'kingBlow' | 'splashDiag' | 'smash' | 'rookLine'
  | 'rebound' | 'hoofKick' | 'march' | 'draft' | 'wrath' | 'royalGuard' | 'spark' | 'finisher'
  | 'cavCharge' | 'kingGuard' | 'doubleLeap' | 'gambit';

/**
 * 빌드 축 (D-144 — 덱빌딩의 "부서지는" 맛): 축마다 카드 몇 장 + 규칙을 깨는 부품 하나가 맞물린다.
 * 기병 = 처치한 나이트가 또 뛴다 · 보병 = 폰이 많고 싸다 · 왕관 = 킹이 직접 싸운다 · 연쇄 = 배수를 키운다.
 */
export type Axis = 'cav' | 'inf' | 'king' | 'chain';
export const AXIS_NAMES: Record<Axis, string> = { cav: '기병', inf: '보병', king: '왕관', chain: '연쇄' };

export interface CommandDef {
  name: string;
  /** 태엽 */
  cost: number;
  /** 움직일 수 있는 기물 (any = 아무나) */
  who: PieceType | 'any';
  /** move = 기물 하나를 움직여 친다 · march = 폰 모두 한 칸 전진 · draft = 킹 옆에 폰 · spark = 연쇄 +1 */
  kind: 'move' | 'shield' | 'repair' | 'draw' | 'march' | 'draft' | 'spark' | 'gambit';
  /** 빌드 축 (보상에서 축이 고루 나오게, 카드에 띠로 표시) */
  axis?: Axis;
  /** 둘째 축 (교차 브릿지 카드 — 한 축의 행동이 다른 축을 돕는다, D-145) */
  axis2?: Axis;
  /** 움직인 뒤, 내려앉은 칸 둘레의 폰이 모두 한 칸 전진해 친다 */
  rally?: boolean;
  /** 이 카드로 처치하면 연쇄가 이만큼씩 오른다 (기본 1) */
  chainPerKill?: number;
  /** 이번 턴에 처치한 기물로 내면 태엽 0 */
  freeIfKiller?: boolean;
  /** 연쇄 하나마다 배율 +이만큼 */
  multPerKill?: number;
  /** 잃은 HP 비율만큼 세진다 (최대 ×3) */
  rage?: boolean;
  /** 처치하면 카드를 이만큼 뽑는다 */
  drawOnKill?: number;
  /** 이번 공격 배율 */
  mult?: number;
  /** 이번 공격에만 붙는 각인 효과 */
  carve?: CarveId;
  amount?: number;
  desc: string;
}

export const COMMANDS: Record<CommandId, CommandDef> = {
  advance: { name: '전진', cost: 1, who: 'P', kind: 'move', desc: '폰 하나가 움직여 친다.' },
  leap: { name: '도약', cost: 1, who: 'N', kind: 'move', desc: '나이트 하나가 뛰어 친다.' },
  diagonal: { name: '사선', cost: 1, who: 'B', kind: 'move', desc: '비숍 하나가 사선으로 움직여 친다.' },
  kingStep: { name: '왕의 걸음', cost: 1, who: 'K', kind: 'move', desc: '킹이 한 칸 움직여 둘레를 친다.' },
  order: { name: '지휘', cost: 2, who: 'any', kind: 'move', desc: '아무 기물 하나가 움직여 친다.' },
  pierceDiag: { axis: 'chain', name: '관통 사선', cost: 1, who: 'B', kind: 'move', carve: 'pierce', desc: '비숍 · 첫 적을 지나 한 기 더 맞힌다.' },
  crossLeap: { axis: 'cav', name: '십자 도약', cost: 2, who: 'N', kind: 'move', carve: 'cross', desc: '나이트 · 내려앉은 칸 상하좌우로 50% 튄다.' },
  charge: { axis: 'inf', name: '돌격', cost: 1, who: 'P', kind: 'move', mult: 1.6, desc: '폰 · 이번 공격 ×1.6.' },
  plate: { name: '방열판', cost: 1, who: 'any', kind: 'shield', amount: 15, desc: '기물 하나에 방열판 15. 움직이지 않는다.' },
  repair: { name: '땜질', cost: 1, who: 'any', kind: 'repair', amount: 15, desc: '기물 하나의 HP 15를 되찾는다.' },
  reload: { name: '재장전', cost: 0, who: 'any', kind: 'draw', amount: 2, desc: '카드 두 장을 뽑는다.' },
  kingBlow: { axis: 'king', name: '왕의 일격', cost: 2, who: 'K', kind: 'move', mult: 2, desc: '킹 · 이번 공격 ×2.' },
  splashDiag: { axis: 'chain', name: '대각 튐', cost: 2, who: 'B', kind: 'move', carve: 'diag', desc: '비숍 · 내려앉은 칸 대각선으로 50% 튄다.' },
  smash: { axis: 'chain', name: '강타', cost: 2, who: 'any', kind: 'move', mult: 1.5, desc: '아무 기물 · 이번 공격 ×1.5.' },
  rookLine: { name: '직진', cost: 2, who: 'R', kind: 'move', desc: '룩 하나가 곧게 움직여 친다.' },
  // ---- 빌드 축 카드 (D-144) ----
  rebound: { axis: 'cav', name: '재도약', cost: 1, who: 'N', kind: 'move', freeIfKiller: true, desc: '나이트 · 이번 턴 처치했으면 태엽 0.' },
  hoofKick: { axis: 'cav', name: '말발굽', cost: 1, who: 'N', kind: 'move', drawOnKill: 1, desc: '나이트 · 처치하면 카드 한 장.' },
  march: { axis: 'inf', name: '행진', cost: 1, who: 'P', kind: 'march', desc: '폰 모두 한 칸 앞으로 가서 친다.' },
  draft: { axis: 'inf', name: '징집', cost: 1, who: 'any', kind: 'draft', desc: '킹 옆에 폰 하나를 세운다. 이번 대국만.' },
  wrath: { axis: 'king', name: '분노한 왕', cost: 1, who: 'K', kind: 'move', rage: true, desc: '킹 · 잃은 HP만큼 세진다 (최대 ×3).' },
  royalGuard: { axis: 'king', name: '왕의 갑주', cost: 1, who: 'K', kind: 'shield', amount: 30, desc: '킹에게 방열판 30.' },
  spark: { axis: 'chain', name: '불씨', cost: 0, who: 'any', kind: 'spark', desc: '처치 없이 연쇄 +1. 카드 한 장.' },
  finisher: { axis: 'chain', name: '마무리', cost: 2, who: 'any', kind: 'move', multPerKill: 0.5, desc: '아무 기물 · 연쇄 하나마다 ×0.5 더.' },
  // ---- 교차 브릿지 (D-145): 두 축에 걸친다 ----
  cavCharge: { axis: 'cav', axis2: 'inf', name: '기마 돌격', cost: 2, who: 'N', kind: 'move', rally: true, desc: '나이트 · 착지 둘레의 폰도 전진해 친다.' },
  kingGuard: { axis: 'king', axis2: 'inf', name: '근위대', cost: 2, who: 'K', kind: 'move', rally: true, desc: '킹 · 둘레의 폰도 전진해 친다.' },
  doubleLeap: { axis: 'cav', axis2: 'chain', name: '연속 도약', cost: 1, who: 'N', kind: 'move', chainPerKill: 2, desc: '나이트 · 처치하면 연쇄가 두 칸 오른다.' },
  gambit: { axis: 'inf', axis2: 'chain', name: '희생 수', cost: 0, who: 'P', kind: 'gambit', desc: '내 폰 하나를 부순다. 연쇄 +2, 한 장.' },
};

/** 시작 덱 (10장) */
export const START_COMMANDS: CommandId[] = ['advance', 'advance', 'advance', 'leap', 'leap', 'diagonal', 'diagonal', 'kingStep', 'order', 'order'];
/** 보상 후보 */
export const REWARD_COMMANDS: CommandId[] = ['pierceDiag', 'crossLeap', 'charge', 'plate', 'repair', 'reload', 'kingBlow', 'splashDiag', 'smash', 'rebound', 'hoofKick', 'march', 'draft', 'wrath', 'royalGuard', 'spark', 'finisher', 'cavCharge', 'kingGuard', 'doubleLeap', 'gambit'];

/**
 * 반장 규칙 (D-148 — 레퍼런스 5권 원리 5 「부서진 빌드는 너프하지 말고 보스가 질문한다」). 둘 다 미리 보인다.
 * 철갑: 반장 킹은 2턴마다 방열판을 다시 두른다 → 몰아칠 수 있나?
 * 줄 폭격: 2턴마다 한 줄을 예고하고 다음 적 차례에 그 줄을 친다 → 뭉쳐 있지 않나?
 */
// 철갑 20 · 2턴마다: 빔 탐색 봇 기준 시작 덱만 25% · 카드 2장 + 부품 1 빌드 88% — 빌드를 갖췄는지 묻는다 (30 · 매 턴은 벽이었다: 0~13%)
export const BOSS = { plate: 20, plateEvery: 2, bombEvery: 2, bombDamage: 18 };

/** 수직 조각 수치 */
export const SLICE = {
  hand: 5,
  ap: 3,
  /** 적도 태엽 3으로 움직인다 (같은 규칙) */
  enemyAp: 3,
  /** 연쇄: 이번 턴 처치마다 +25% (Balatro 정산 — 순서가 곧 화력) */
  chainPerKill: 0.25,
  chainCap: 4,
  /** 나사 트랙 (Pawnbarian 루트 트랙): 턴마다 한 칸씩 사라진다 */
  coins: 10,
  coinValue: 5,
};
