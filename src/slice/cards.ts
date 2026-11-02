import type { CarveId } from '../data/carves';
import type { PieceType } from '../engine/types';
import type { SlicePartId } from './parts';

/**
 * 명령 카드 (수직 조각 — 분대 + 명령 덱, D-142). 카드를 태엽으로 내면 기물이 체스로 움직이고,
 * 내려앉은 자리에서 다음에 갈 수 있는 칸을 친다. 카드는 「누가 · 얼마에 · 무엇을 더」만 정한다.
 */
export type CommandId =
  | 'advance' | 'leap' | 'diagonal' | 'kingStep' | 'order'
  | 'pierceDiag' | 'crossLeap' | 'charge' | 'plate' | 'repair' | 'reload' | 'kingBlow' | 'splashDiag' | 'smash' | 'rookLine'
  | 'rebound' | 'hoofKick' | 'march' | 'draft' | 'wrath' | 'royalGuard' | 'spark' | 'finisher'
  | 'cavCharge' | 'kingGuard' | 'doubleLeap' | 'gambit'
  | 'shove' | 'shieldBash' | 'ram';

/**
 * 빌드 축 (D-144 — 덱빌딩의 "부서지는" 맛): 축마다 카드 몇 장 + 규칙을 깨는 부품 하나가 맞물린다.
 * 기병 = 처치한 나이트가 또 뛴다 · 보병 = 폰이 많고 싸다 · 왕관 = 킹이 직접 싸운다 · 연쇄 = 배수를 키운다.
 */
export type Axis = 'cav' | 'inf' | 'king' | 'chain' | 'push';
export const AXIS_NAMES: Record<Axis, string> = { cav: '기병', inf: '보병', king: '왕관', chain: '연쇄', push: '밀치기' };

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
  /** 친 적을 한 칸 밀어낸다. 막히면 둘 다 충돌 피해 (D-154, Into the Breach) */
  push?: boolean;
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
  /** 효과 한 문장 (기본 이동 카드는 비운다 — 행마 그림과 판 위 표시가 가르친다, D-159) */
  desc: string;
  /** 각주 (칭호 · 짧은 대사 — 비장하게, D-158) */
  flavor?: string;
}

export const COMMANDS: Record<CommandId, CommandDef> = {
  advance: { name: '전진', cost: 1, who: 'P', kind: 'move', desc: '', flavor: '작은 개척자' },
  leap: { name: '도약', cost: 1, who: 'N', kind: 'move', desc: '', flavor: '뛰어넘고, 짓밟는 자.' },
  diagonal: { name: '사선', cost: 1, who: 'B', kind: 'move', desc: '', flavor: '성스러운 빛의 심판자' },
  kingStep: { name: '왕의 걸음', cost: 1, who: 'K', kind: 'move', desc: '', flavor: '화려한 왕관, 잔혹한 무게' },
  order: { name: '지휘', cost: 2, who: 'any', kind: 'move', desc: '원하는 기물에게 명령한다.' },
  pierceDiag: { axis: 'chain', name: '심판의 창', cost: 1, who: 'B', kind: 'move', carve: 'pierce', desc: '첫 적을 꿰뚫는다. (뒤의 1기까지)' },
  crossLeap: { axis: 'cav', name: '지축 강타', cost: 2, who: 'N', kind: 'move', carve: 'cross', desc: '도약 후 사방에 여진을 일으킨다. (상하좌우 50%)' },
  charge: { axis: 'inf', name: '쇄도', cost: 1, who: 'P', kind: 'move', mult: 1.6, desc: '일격을 휘두른다. (×1.6)' },
  plate: { name: '철벽', cost: 1, who: 'any', kind: 'shield', amount: 15, desc: '굳게 걸어 잠근다. (방열판 +15)' },
  repair: { name: '응급 용접', cost: 1, who: 'any', kind: 'repair', amount: 15, desc: '기물 하나를 땜질한다. (HP +15)' },
  reload: { name: '태엽 감기', cost: 0, who: 'any', kind: 'draw', amount: 2, desc: '탄창을 다시 채운다. (카드 +2)' },
  kingBlow: { axis: 'king', name: '왕의 철퇴', cost: 2, who: 'K', kind: 'move', mult: 2, desc: '왕이 직접 내려친다. (×2)' },
  splashDiag: { axis: 'chain', name: '파편 세례', cost: 2, who: 'B', kind: 'move', carve: 'diag', desc: '착지한 자리에서 사선으로 파편이 튄다. (대각 50%)' },
  smash: { axis: 'chain', name: '분쇄', cost: 2, who: 'any', kind: 'move', mult: 1.5, desc: '온 힘을 실어 내려친다. (×1.5)' },
  rookLine: { name: '직진', cost: 2, who: 'R', kind: 'move', desc: '', flavor: '살아 움직이는 요새' },
  // ---- 빌드 축 카드 (D-144) ----
  rebound: { axis: 'cav', name: '피의 질주', cost: 1, who: 'N', kind: 'move', freeIfKiller: true, desc: '처치 후 한 번 더 도약한다. (이번 턴 처치했으면 태엽 0)' },
  hoofKick: { axis: 'cav', name: '짓밟기', cost: 1, who: 'N', kind: 'move', drawOnKill: 1, desc: '짓밟고 다음 명령을 받는다. (처치 시 카드 +1)' },
  march: { axis: 'inf', name: '총진격', cost: 1, who: 'P', kind: 'march', desc: '폰 전원이 한 칸 전진해 친다.', flavor: '“전군, 진격하라!”' },
  draft: { axis: 'inf', name: '강제 징집', cost: 1, who: 'any', kind: 'draft', desc: '킹 곁에 폰 하나를 세운다. (이번 대국만)', flavor: '“빈자리를 채워라.”' },
  wrath: { axis: 'king', name: '왕의 분노', cost: 1, who: 'K', kind: 'move', rage: true, desc: '상처 입은 만큼 분노한다. (잃은 HP 비율만큼, 최대 ×3)' },
  royalGuard: { axis: 'king', name: '황금 흉갑', cost: 1, who: 'K', kind: 'shield', amount: 30, desc: '왕이 갑주를 두른다. (방열판 +30)' },
  spark: { axis: 'chain', name: '점화', cost: 0, who: 'any', kind: 'spark', desc: '불씨를 지핀다. (연쇄 +1, 카드 +1)' },
  finisher: { axis: 'chain', name: '처형', cost: 2, who: 'any', kind: 'move', multPerKill: 0.5, desc: '연쇄를 끝맺는 일격. (연쇄 1마다 ×0.5 추가)' },
  // ---- 교차 브릿지 (D-145): 두 축에 걸친다 ----
  cavCharge: { axis: 'cav', axis2: 'inf', name: '선봉 돌파', cost: 2, who: 'N', kind: 'move', rally: true, desc: '기병이 앞장서고 보병이 뒤따른다. (착지 둘레 폰 전진 공격)' },
  kingGuard: { axis: 'king', axis2: 'inf', name: '근위대 진군', cost: 2, who: 'K', kind: 'move', rally: true, desc: '왕이 나서자 근위대가 따른다. (둘레 폰 전진 공격)' },
  doubleLeap: { axis: 'cav', axis2: 'chain', name: '광란의 도약', cost: 1, who: 'N', kind: 'move', chainPerKill: 2, desc: '처치할 때마다 연쇄가 거세진다. (처치 1회 = 연쇄 2칸)' },
  // ---- 밀치기 (D-154): 친 적을 한 칸 민다, 막히면 충돌 ----
  shove: { axis: 'push', name: '몰아치기', cost: 2, who: 'any', kind: 'move', push: true, desc: '적을 밀어낸다. 막히면 부딪친다. (충돌 18)' },
  shieldBash: { axis: 'push', axis2: 'inf', name: '방패 돌진', cost: 1, who: 'P', kind: 'move', push: true, desc: '방패로 밀쳐 낸다. 막히면 부딪친다. (충돌 18)' },
  ram: { axis: 'push', axis2: 'cav', name: '파성추', cost: 1, who: 'N', kind: 'move', push: true, desc: '들이받아 밀어낸다. 막히면 부딪친다. (충돌 18)' },
  gambit: { axis: 'inf', axis2: 'chain', name: '제물', cost: 0, who: 'P', kind: 'gambit', desc: '폰 하나를 제물로 바친다. (연쇄 +2, 카드 +1)', flavor: '“기꺼이.”' },
};

/** 시작 덱 (10장) — 2판 구조 시절 (테스트 · 봇 기준용으로 남긴다) */
export const START_COMMANDS: CommandId[] = ['advance', 'advance', 'advance', 'leap', 'leap', 'diagonal', 'diagonal', 'kingStep', 'order', 'order'];

/**
 * 첫 10분 (D-150 — 조사 B: 30초 첫 타격 · 2분 첫 승 · 5분 안 첫 "와!").
 * 분대는 작게 시작한다(킹 · 폰 · 비숍), 1판 뒤 기물 영입, 2판 뒤 부품 상자 = 부품 + 맞물리는 카드 둘(첫 사기 조합 확정).
 */
export const START_SQUAD: PieceType[] = ['K', 'P', 'B'];
export const START_DECK: CommandId[] = ['advance', 'advance', 'advance', 'diagonal', 'diagonal', 'kingStep', 'order', 'order'];

/** 영입: 기물 하나 + 그 기물의 카드 */
export const RECRUITS: { t: PieceType; cards: CommandId[]; line: string }[] = [
  { t: 'N', cards: ['leap', 'leap'], line: '뛰어넘고, 짓밟는 자.' },
  { t: 'P', cards: ['advance', 'charge'], line: '작은 개척자' },
  { t: 'B', cards: ['diagonal', 'pierceDiag'], line: '성스러운 빛의 심판자' },
  { t: 'R', cards: ['rookLine'], line: '살아 움직이는 요새' },
];

/** 부품 상자 (첫 사기 조합 확정): 부품 + 맞물리는 카드 둘. needs = 분대에 있어야 하는 기물 */
export const KITS: { part: SlicePartId; cards: CommandId[]; needs?: PieceType }[] = [
  { part: 'coil', cards: ['spark', 'finisher'] },
  { part: 'drum', cards: ['march', 'march'] },
  { part: 'assembly', cards: ['gambit', 'draft'] },
  { part: 'crown', cards: ['wrath', 'kingBlow'] },
  { part: 'horseshoe', cards: ['rebound', 'rebound'], needs: 'N' },
  { part: 'echo', cards: ['doubleLeap', 'spark'], needs: 'N' },
  { part: 'magnet', cards: ['spark', 'spark'] },
  { part: 'hammer', cards: ['shieldBash', 'shove'] },
];
/** 보상 후보 */
export const REWARD_COMMANDS: CommandId[] = ['pierceDiag', 'crossLeap', 'charge', 'plate', 'repair', 'reload', 'kingBlow', 'splashDiag', 'smash', 'rebound', 'hoofKick', 'march', 'draft', 'wrath', 'royalGuard', 'spark', 'finisher', 'cavCharge', 'kingGuard', 'doubleLeap', 'gambit', 'shove', 'shieldBash', 'ram'];

/**
 * 반장 규칙 (D-148 — 레퍼런스 5권 원리 5 「부서진 빌드는 너프하지 말고 보스가 질문한다」). 둘 다 미리 보인다.
 * 철갑: 반장 킹은 2턴마다 방열판을 다시 두른다 → 몰아칠 수 있나?
 * 줄 폭격: 2턴마다 한 줄을 예고하고 다음 적 차례에 그 줄을 친다 → 뭉쳐 있지 않나?
 */
// 철갑 20 · 2턴마다: 빔 탐색 봇 기준 시작 덱만 25% · 카드 2장 + 부품 1 빌드 88% — 빌드를 갖췄는지 묻는다 (30 · 매 턴은 벽이었다: 0~13%)
/** 고물상 · 작업대 (R5-2, D-168) — 값은 구조용, 조정은 R7 */
export const SHOP = { cardPrice: [25, 35, 50] as const, partPrice: 90, healPrice: 40, healPct: 0.35, removePrice: 50, cards: 4, parts: 1 };
export const FORGE = { repairPct: 0.4 };

/** 밀치기 충돌 피해 (밀린 적과 부딪힌 기물 둘 다) */
// 18: 조합 봇에서 쇠망치 + 밀치기 카드가 기준의 약 1.9배 (12일 땐 1.5배 — 축 단독 2배 목표, D-154)
export const PUSH = { collide: 18 };

export const BOSS = { plate: 20, plateEvery: 2, bombEvery: 2, bombDamage: 18 };

/**
 * 막별 반장 규칙 (R5-4, D-171): 반장마다 빌드에 던지는 질문 하나 + 레일 표시 문구.
 * plate = 철갑 · 줄 폭격(1막) · spawn = 2턴마다 킹 곁에 폰(2막 — 빨리 끝낼 수 있나) · thorns = 철갑 + 맞으면 되받아침(3막 — 한 방에 몰아칠 수 있나)
 */
export type BossRule = 'plate' | 'spawn' | 'thorns';
export const BOSS_RULES: Record<BossRule, { name: string; lines: string[]; tell: string }> = {
  plate: { name: '철갑 반장', lines: ['철갑 20 · 2턴마다 다시', '줄 폭격 −18 · 2턴마다'], tell: '두 턴마다 한 줄이 불길에 잠깁니다. 붉은 줄에서 벗어나십시오.' },
  spawn: { name: '조립 반장', lines: ['2턴마다 킹 곁에 폰 하나', '폰이 셋 넘으면 멈춘다'], tell: '두 턴마다 반장 곁에 폰이 찍혀 나옵니다. 빨리 끝내십시오.' },
  thorns: { name: '출하 반장', lines: ['철갑 20 · 2턴마다 다시', '반장을 친 기물은 6 되받는다'], tell: '반장을 치면 되받아칩니다. 한 번에 몰아치십시오.' },
};
export const BOSS_NUM = { spawnEvery: 2, spawnMax: 3, thorns: 6 };

/** 막별 적 특성 (R5-4): 2막 자폭 폰(쓰러지면 둘레 8) · 3막 방패 룩(대국 시작 방열판 15) */
export const TRAIT = { blast: 8, rookPlate: 15 };

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
