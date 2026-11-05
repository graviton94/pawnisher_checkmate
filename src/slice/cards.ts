import type { CarveId } from '../data/carves';
import type { PieceType } from '../engine/types';
import type { SlicePartId } from './parts';

/**
 * 명령 카드 (수직 조각 — 분대 + 명령 덱, D-142). 카드를 태엽으로 내면 기물이 체스로 움직이고,
 * 내려앉은 자리에서 다음에 갈 수 있는 칸을 친다. 카드는 「누가 · 얼마에 · 무엇을 더」만 정한다.
 */
export type BaseCommandId =
  | 'advance' | 'leap' | 'diagonal' | 'kingStep' | 'order'
  | 'rookPierce' | 'phalanx' | 'bishopChain' | 'scrapToss' | 'pawnExecute' | 'kingCharge'
  | 'pierceDiag' | 'crossLeap' | 'charge' | 'plate' | 'repair' | 'reload' | 'kingBlow' | 'splashDiag' | 'smash' | 'rookLine'
  | 'rebound' | 'hoofKick' | 'march' | 'draft' | 'wrath' | 'royalGuard' | 'spark' | 'finisher'
  | 'cavCharge' | 'kingGuard' | 'doubleLeap' | 'gambit'
  | 'shove' | 'shieldBash' | 'ram'
  | 'pawnStorm' | 'knightRaid' | 'bishopRay' | 'rookCharge' | 'kingDecree' | 'overload' | 'quickFix' | 'tempo' | 'bulwark' | 'bladeRain'
  | 'vent' | 'burst' | 'recall';
/** 다듬은 카드는 한 장씩 「이름+」 변형이 된다 (작업대 다듬기 — 그 한 장만 태엽 −1, D-183) */
export type CommandId = BaseCommandId | `${BaseCommandId}+`;

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
  kind: 'move' | 'shield' | 'repair' | 'draw' | 'march' | 'draft' | 'spark' | 'gambit' | 'spend';
  /** spend: 쌓인 연쇄를 모두 써서 — 킹 방열판 · 적 전체 피해 · 카드 뽑기 (D-203). amount = 연쇄 하나마다 */
  spend?: 'shield' | 'blast' | 'draw' | 'ap';
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
  /** 이번 공격 배율 (곱 ×, D-205) */
  mult?: number;
  /** 이번 공격에 더하는 피해 (합 +, D-205) — 최종 = (공격 + 합) × 곱 */
  add?: number;
  /** 이번 공격에만 붙는 각인 효과 */
  carve?: CarveId;
  amount?: number;
  /** draw 카드: 태엽도 이만큼 (태엽 감기) */
  ap?: number;
  /** 효과 한 문장 (기본 이동 카드는 비운다 — 행마 그림과 판 위 표시가 가르친다, D-159) */
  desc: string;
  /** 탄창 머리에 쓰는 짧은 칭호 (한글 5자 이내, D-212) — 기본 행마 카드만 */
  title?: string;
  /** 각주 (칭호 · 짧은 대사 — 비장하게, D-158) */
  flavor?: string;
}

const BASE_COMMANDS: Record<BaseCommandId, CommandDef> = {
  advance: { name: '전진', cost: 1, who: 'P', kind: 'move', desc: '대각선 앞을 벤다.', flavor: '작은 개척자', title: '작은 개척자' },
  leap: { name: '도약', cost: 1, who: 'N', kind: 'move', desc: '내려앉아 짓밟는다.', flavor: '뛰어넘고, 짓밟는 자.', title: '짓밟는 자' },
  diagonal: { name: '사선', cost: 1, who: 'B', kind: 'move', desc: '첫 적을 심판한다.', flavor: '성스러운 빛의 심판자', title: '빛의 심판자' },
  kingStep: { name: '왕의 걸음', cost: 1, who: 'K', kind: 'move', desc: '둘레를 짓누른다.', flavor: '화려한 왕관, 잔혹한 무게', title: '잔혹한 왕관' },
  order: { name: '지휘', cost: 2, who: 'any', kind: 'move', desc: '누구든 하나를 부린다.' },
  pierceDiag: { axis: 'chain', name: '심판의 창', cost: 1, who: 'B', kind: 'move', carve: 'pierce', desc: '첫 적을 꿰뚫는다. (뒤의 1기까지)' },
  crossLeap: { axis: 'cav', name: '지축 강타', cost: 1, who: 'N', kind: 'move', carve: 'cross', desc: '도약 후 사방에 여진을 일으킨다. (상하좌우 50%)' },
  charge: { axis: 'inf', name: '쇄도', cost: 1, who: 'P', kind: 'move', add: 8, desc: '일격을 휘두른다. (+8)' },
  // 빌드 다양성 묶음 (D-217 4): 축마다 「그 축으로 가고 싶게」 만드는 카드
  rookPierce: { axis: 'push', name: '관통 포격', cost: 2, who: 'R', kind: 'move', carve: 'pierce', mult: 1.2, desc: '요새가 줄을 꿰뚫는다. (×1.2, 뒤의 1기까지)' },
  scrapToss: { axis: 'push', name: '고철 투척', cost: 1, who: 'R', kind: 'move', add: 10, desc: '쇳덩이를 내던진다. (+10)' },
  phalanx: { axis: 'inf', name: '방진', cost: 1, who: 'P', kind: 'move', rally: true, add: 5, desc: '어깨를 맞대고 나아간다. (+5, 둘레 폰 전진 공격)', flavor: '“한 발도 물러서지 마라.”' },
  pawnExecute: { axis: 'inf', axis2: 'chain', name: '개척자의 처단', cost: 1, who: 'P', kind: 'move', multPerKill: 1, desc: '작은 칼끝이 연쇄를 끝맺는다. (연쇄 1마다 ×1 추가)' },
  bishopChain: { axis: 'chain', name: '축복의 고리', cost: 1, who: 'B', kind: 'move', chainPerKill: 2, desc: '심판받은 자는 둘로 센다. (처치 1회 = 연쇄 2칸)' },
  kingCharge: { axis: 'king', axis2: 'push', name: '왕의 돌진', cost: 2, who: 'K', kind: 'move', push: true, add: 6, desc: '왕이 몸소 밀고 들어간다. (+6, 밀치기)' },
  plate: { name: '철벽', cost: 1, who: 'any', kind: 'shield', amount: 15, desc: '굳게 걸어 잠근다. (방열판 +15)' },
  repair: { name: '응급 용접', cost: 1, who: 'any', kind: 'repair', amount: 15, desc: '기물 하나를 땜질한다. (HP +15)' },
  reload: { name: '태엽 감기', cost: 0, who: 'any', kind: 'draw', amount: 1, ap: 1, desc: '태엽을 감고 탄창을 채운다. (태엽 +1, 카드 +1)' },
  kingBlow: { axis: 'king', name: '왕의 철퇴', cost: 2, who: 'K', kind: 'move', mult: 2, desc: '왕이 직접 내려친다. (×2)' },
  splashDiag: { axis: 'chain', name: '파편 세례', cost: 1, who: 'B', kind: 'move', carve: 'diag', desc: '착지한 자리에서 사선으로 파편이 튄다. (대각 50%)' },
  smash: { axis: 'chain', name: '분쇄', cost: 2, who: 'any', kind: 'move', mult: 1.5, desc: '온 힘을 실어 내려친다. (×1.5)' },
  rookLine: { name: '직진', cost: 2, who: 'R', kind: 'move', desc: '첫 적을 들이받는다.', flavor: '살아 움직이는 요새', title: '걷는 요새' },
  // ---- 빌드 축 카드 (D-144) ----
  rebound: { axis: 'cav', name: '피의 질주', cost: 1, who: 'N', kind: 'move', freeIfKiller: true, desc: '처치 후 한 번 더 도약한다. (이번 턴 처치했으면 태엽 0)' },
  hoofKick: { axis: 'cav', name: '짓밟기', cost: 1, who: 'N', kind: 'move', drawOnKill: 1, desc: '짓밟고 다음 명령을 받는다. (처치 시 카드 +1)' },
  march: { axis: 'inf', name: '총진격', cost: 0, who: 'P', kind: 'march', desc: '폰 전원이 한 칸 전진해 친다.', flavor: '“전군, 진격하라!”' },
  draft: { axis: 'inf', name: '땜질 보충병', cost: 0, who: 'any', kind: 'draft', desc: '고철로 땜질한 폰 하나가 킹 곁에 선다. (이번 대국만)', flavor: '“빈자리를 채워라.”' },
  wrath: { axis: 'king', name: '왕의 분노', cost: 1, who: 'K', kind: 'move', rage: true, desc: '상처 입은 만큼 분노한다. (잃은 HP 비율만큼, 최대 ×3)' },
  royalGuard: { axis: 'king', name: '황금 흉갑', cost: 1, who: 'K', kind: 'shield', amount: 30, desc: '왕이 갑주를 두른다. (방열판 +30)' },
  spark: { axis: 'chain', name: '점화', cost: 0, who: 'any', kind: 'spark', desc: '불씨를 지핀다. (연쇄 +1, 카드 +1)' },
  // 연쇄 소모 (D-203, 사용자: "배율은 턴 끝날 때 쌓이고 쓸 방법이 많지 않다") — 쌓인 연쇄를 모두 비우고 그만큼 효과. 연쇄 0이면 못 낸다
  vent: { axis: 'chain', axis2: 'king', name: '방출', cost: 0, who: 'any', kind: 'spend', spend: 'shield', amount: 14, desc: '쌓인 열기를 갑옷으로 돌린다. (연쇄를 모두 써서 킹 방열판 +연쇄×14)', flavor: '“식기 전에 입어라.”' },
  burst: { axis: 'chain', name: '증기 폭발', cost: 1, who: 'any', kind: 'spend', spend: 'blast', amount: 14, desc: '보일러를 연다. (연쇄를 모두 써서 적 전체에 연쇄×14 피해)', flavor: '“압력을 놓아라.”' },
  recall: { axis: 'chain', name: '회수', cost: 0, who: 'any', kind: 'spend', spend: 'ap', amount: 1, desc: '흩어진 태엽을 거둔다. (연쇄를 모두 써서 태엽 +연쇄, 최대 3)' },
  finisher: { axis: 'chain', name: '처형', cost: 2, who: 'any', kind: 'move', multPerKill: 0.5, desc: '연쇄를 끝맺는 일격. (연쇄 1마다 ×0.5 추가)' },
  // ---- 교차 브릿지 (D-145): 두 축에 걸친다 ----
  cavCharge: { axis: 'cav', axis2: 'inf', name: '선봉 돌파', cost: 1, who: 'N', kind: 'move', rally: true, desc: '기병이 앞장서고 보병이 뒤따른다. (착지 둘레 폰 전진 공격)' },
  kingGuard: { axis: 'king', axis2: 'inf', name: '근위대 진군', cost: 1, who: 'K', kind: 'move', rally: true, desc: '왕이 나서자 근위대가 따른다. (둘레 폰 전진 공격)' },
  doubleLeap: { axis: 'cav', axis2: 'chain', name: '광란의 도약', cost: 1, who: 'N', kind: 'move', chainPerKill: 2, desc: '처치할 때마다 연쇄가 거세진다. (처치 1회 = 연쇄 2칸)' },
  // ---- 밀치기 (D-154): 친 적을 한 칸 민다, 막히면 충돌 ----
  shove: { axis: 'push', name: '몰아치기', cost: 2, who: 'any', kind: 'move', push: true, desc: '적을 밀어낸다. 막히면 부딪친다. (충돌 18)' },
  shieldBash: { axis: 'push', axis2: 'inf', name: '방패 돌진', cost: 1, who: 'P', kind: 'move', push: true, desc: '방패로 밀쳐 낸다. 막히면 부딪친다. (충돌 18)' },
  ram: { axis: 'push', axis2: 'cav', name: '파성추', cost: 1, who: 'N', kind: 'move', push: true, desc: '들이받아 밀어낸다. 막히면 부딪친다. (충돌 18)' },
  // ---- 볼륨 (R5-5, D-172): 있는 장치(배율 · 각인 · 밀치기 · 뽑기 · 연쇄)만 조합 ----
  pawnStorm: { axis: 'inf', name: '선두 분쇄', cost: 1, who: 'P', kind: 'move', push: true, add: 5, desc: '앞으로 밀어붙인다. (+5, 밀치기)' },
  knightRaid: { axis: 'cav', name: '기습', cost: 1, who: 'N', kind: 'move', mult: 1.5, drawOnKill: 1, desc: '어둠 속에서 덮친다. (×1.5, 처치 시 카드 +1)' },
  bishopRay: { axis: 'chain', name: '정죄의 빛', cost: 1, who: 'B', kind: 'move', carve: 'pierce', mult: 1.4, desc: '사선 끝까지 꿰뚫는다. (×1.4, 뒤의 1기까지)' },
  rookCharge: { axis: 'push', name: '성벽 돌진', cost: 2, who: 'R', kind: 'move', push: true, add: 8, desc: '요새가 통째로 밀고 들어간다. (+8, 밀치기)' },
  kingDecree: { axis: 'king', axis2: 'chain', name: '왕명', cost: 1, who: 'K', kind: 'move', chainPerKill: 2, desc: '왕의 손에 쓰러진 자는 둘로 센다. (처치 1회 = 연쇄 2칸)' },
  overload: { axis: 'chain', name: '과부하', cost: 3, who: 'any', kind: 'move', mult: 2.5, desc: '태엽을 끝까지 감는다. (×2.5)' },
  quickFix: { name: '덧댐', cost: 0, who: 'any', kind: 'repair', amount: 8, desc: '급한 대로 덧댄다. (HP +8)' },
  tempo: { axis: 'chain', name: '박자', cost: 0, who: 'any', kind: 'draw', amount: 3, desc: '숨을 고르고 다음 수를 본다. (카드 +3)' },
  bulwark: { axis: 'king', axis2: 'push', name: '방벽', cost: 1, who: 'any', kind: 'shield', amount: 25, desc: '몸으로 막아선다. (방열판 +25)' },
  bladeRain: { axis: 'cav', axis2: 'chain', name: '칼날 세례', cost: 2, who: 'N', kind: 'move', carve: 'cross', chainPerKill: 2, desc: '뛰어내리며 사방을 벤다. (상하좌우 50%, 처치 1회 = 연쇄 2칸)' },
  gambit: { axis: 'inf', axis2: 'chain', name: '제물', cost: 0, who: 'P', kind: 'gambit', desc: '폰 하나를 제물로 바친다. (연쇄 +3, 카드 +2, 태엽 +1)', flavor: '“기꺼이.”' },
};

/** 다듬은 변형: 이름 뒤에 +, 태엽 −1 (0 아래로는 안 내려간다). 나머지는 원본 그대로 */
export const refinedOf = (id: BaseCommandId): CommandId => `${id}+`;
/** 변형이면 원본 id */
export const baseOf = (id: CommandId): BaseCommandId => (id.endsWith('+') ? id.slice(0, -1) : id) as BaseCommandId;
export const isRefined = (id: CommandId): boolean => id.endsWith('+');
export const COMMANDS = Object.fromEntries(
  (Object.entries(BASE_COMMANDS) as [BaseCommandId, CommandDef][]).flatMap(([id, c]) => [
    [id, c],
    [refinedOf(id), { ...c, name: `${c.name}+`, cost: Math.max(0, c.cost - 1) }],
  ]),
) as Record<CommandId, CommandDef>;

/** 시작 덱 (10장) — 2판 구조 시절 (테스트 · 봇 기준용으로 남긴다) */
export const START_COMMANDS: CommandId[] = ['advance', 'advance', 'advance', 'leap', 'leap', 'diagonal', 'diagonal', 'kingStep', 'order', 'order'];

/**
 * 첫 10분 (D-150 — 조사 B: 30초 첫 타격 · 2분 첫 승 · 5분 안 첫 "와!").
 * 분대는 작게 시작한다(킹 · 폰 · 비숍), 1판 뒤 기물 영입, 2판 뒤 부품 상자 = 부품 + 맞물리는 카드 둘(첫 사기 조합 확정).
 */
export const START_SQUAD: PieceType[] = ['K', 'P', 'B'];
export const START_DECK: CommandId[] = ['advance', 'advance', 'advance', 'diagonal', 'diagonal', 'kingStep', 'order', 'order'];

/** 영입: 기물 하나 + 그 기물의 카드 */
/** 새 분대원 (D-218: 들고 오는 카드 2장 → 1장 — 분대원 8명이 카드 16장을 몰고 와 덱이 38장까지 불었다) */
export const RECRUITS: { t: PieceType; cards: CommandId[]; line: string }[] = [
  { t: 'N', cards: ['leap'], line: '뛰어넘고, 짓밟는 자.' },
  { t: 'P', cards: ['charge'], line: '작은 개척자' },
  { t: 'B', cards: ['pierceDiag'], line: '성스러운 빛의 심판자' },
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
  { part: 'lance', cards: ['knightRaid', 'leap'], needs: 'N' },
  { part: 'banner', cards: ['pawnStorm', 'charge'] },
  { part: 'conductor', cards: ['tempo', 'finisher'] },
  { part: 'scepter', cards: ['kingDecree', 'royalGuard'] },
];
/** 보상 후보 */
/**
 * 카드 등급 (D-216, 게이머 크리틱 「받는 순간이 조용하다」): 일반 · 희귀 · 황금. 표에 없으면 일반.
 * 희귀 = 두 축에 걸치거나 한 판을 바꾸는 카드, 황금 = 빌드의 끝을 정하는 카드.
 */
export type Grade = 'common' | 'rare' | 'gold';
export const CARD_GRADE: Partial<Record<string, Grade>> = {
  // 측정 (D-217 2, sim/rarity.sim.ts — 모든 기물 분대 · 2 · 3막 판 200번 · 넣은 덱 vs 기본 카드 덱의 승률 차 + 턴 단축 × 5):
  // 황금 = 상위 약 10% (가치 34 이상), 희귀 = 다음 35% (가치 12 이상), 나머지 일반. 봇이 못 쓰는 연쇄 마무리(처형 · 칼날 세례)만 설계 판단으로 희귀.
  rookCharge: 'gold', shove: 'gold', overload: 'gold', wrath: 'gold', scrapToss: 'gold', rookPierce: 'rare',
  royalGuard: 'rare', bulwark: 'rare', smash: 'rare', quickFix: 'rare', spark: 'rare', repair: 'rare', plate: 'rare', ram: 'rare', kingDecree: 'rare',
  pawnStorm: 'rare', kingBlow: 'rare', shieldBash: 'rare', charge: 'rare', finisher: 'rare', bladeRain: 'rare',
  // 등반 감사 재측정 (D-227): 손본 뒤 가치 12 넘은 카드
  reload: 'rare', knightRaid: 'rare', draft: 'rare', kingGuard: 'rare', bishopRay: 'rare',
};
export const gradeOf = (id: string): Grade => CARD_GRADE[id.replace(/\+$/, '')] ?? 'common';
/** 보상 한 칸이 어느 등급으로 나오나 (가중치) — 검문 · 반장은 elite */
export const GRADE = {
  // D-217 2: 카드 한 장 기준 빈도가 일반 > 희귀 > 황금이 되게 (카드 일반 18 · 희귀 15 · 황금 4장 → 대국 보상 한 칸에서 한 장이 나올 확률 3.6% · 2.1% · 1.3%)
  weights: { common: 64, rare: 31, gold: 5 } as Record<Grade, number>,
  elite: { common: 35, rare: 50, gold: 15 } as Record<Grade, number>,
  names: { common: '일반', rare: '희귀', gold: '황금' } as Record<Grade, string>,
};
/** 가중치로 등급 하나 뽑기 */
export const rollGrade = (r: number, w: Record<Grade, number>): Grade => {
  let x = r * (w.common + w.rare + w.gold);
  for (const g of ['gold', 'rare', 'common'] as Grade[]) if ((x -= w[g]) < 0) return g;
  return 'common';
};

export const REWARD_COMMANDS: CommandId[] = ['pierceDiag', 'crossLeap', 'charge', 'plate', 'repair', 'reload', 'kingBlow', 'splashDiag', 'smash', 'rebound', 'hoofKick', 'march', 'draft', 'wrath', 'royalGuard', 'spark', 'finisher', 'cavCharge', 'kingGuard', 'doubleLeap', 'gambit', 'shove', 'shieldBash', 'ram', 'pawnStorm', 'knightRaid', 'bishopRay', 'rookCharge', 'kingDecree', 'overload', 'quickFix', 'tempo', 'bulwark', 'bladeRain', 'vent', 'burst', 'recall', 'rookPierce', 'scrapToss', 'phalanx', 'pawnExecute', 'bishopChain', 'kingCharge'];

/**
 * 반장 규칙 (D-148 — 레퍼런스 5권 원리 5 「부서진 빌드는 너프하지 말고 보스가 질문한다」). 둘 다 미리 보인다.
 * 철갑: 반장 킹은 2턴마다 방열판을 다시 두른다 → 몰아칠 수 있나?
 * 줄 폭격: 2턴마다 한 줄을 예고하고 다음 적 차례에 그 줄을 친다 → 뭉쳐 있지 않나?
 */
// 철갑 20 · 2턴마다: 빔 탐색 봇 기준 시작 덱만 25% · 카드 2장 + 부품 1 빌드 88% — 빌드를 갖췄는지 묻는다 (30 · 매 턴은 벽이었다: 0~13%)
/** 고물상 · 작업대 (R5-2, D-168) — 값은 구조용, 조정은 R7 */
/** gradePrice · partGradePrice (D-217 3): 고물상 값은 등급으로 — 일반 · 희귀 · 황금 */
/** refinePrice (D-218): 고물상 다듬기 — 남는 나사를 강화로 */
export const SHOP = { refinePrice: 60, gradePrice: { common: 30, rare: 45, gold: 70 }, partGradePrice: { common: 70, rare: 95, gold: 130 }, cardPrice: [25, 35, 50] as const, partPrice: 90, healPrice: 40, healPct: 0.35, removePrice: 50, cards: 5, parts: 1 }; // 진열대 = 카드 5 + 부품 1 (부적이 나오면 카드 한 자리), 아래 줄 정비 · 다듬기 · 빼기 고정 (2026-11-05 3×3)
export const FORGE = { repairPct: 0.4 };

/** 밀치기 충돌 피해 (밀린 적과 부딪힌 기물 둘 다) */
// 18: 조합 봇에서 쇠망치 + 밀치기 카드가 기준의 약 1.9배 (12일 땐 1.5배 — 축 단독 2배 목표, D-154)
export const PUSH = { collide: 18 };

/** 철갑 반장 (D-214 완화): 철갑 20 → 15, 폭격 18 → 12, 첫 폭격은 2턴 끝 */
export const BOSS = { plate: 15, plateEvery: 2, bombEvery: 2, bombFirst: 2, bombDamage: 12 };
/**
 * 난이도 비율 (D-202, 사용자: "체력이든 공격력이든 비율 조정으로 난이도"): 모든 적 기물의 HP · 공격 배율 (막 배율 위에 곱한다).
 * 값표 통일로 적이 더 자주 움직이게 된 만큼 공격을 낮췄다 (등반 봇 40판: 1.0 → 완주 18 · 0.75 → 31, HP는 거의 영향 없음)
 */
export const FOE = {
  hp: 1,
  // 난이도 설계 (D-228, 1패 = 출하 끝 + 여벌 심장 1): 봇 성향별 완주 60판 — 무뇌 0% · 단순(예고 무시) 27% · 보통 30% · 두뇌(수읽기) 85%.
  // 예전 0.75 · 0.015 · 1.05는 단순 봇도 100% 완주(실력 차 없음)
  atk: 1.25,
  /**
   * 층별 성장 곡선 (D-203, 사용자: "유저가 강해지는 만큼 적도 — 합연산은 지금 강하고 곱연산은 나중에 강하게"):
   * 적 HP는 대국마다 곱으로 (hpGrow^깊이 — 지수), 공격은 더하기로 (1 + atkGrow × 깊이 — 직선).
   * 합연산 빌드(고정 피해 · +% 연쇄)는 초반을 쉽게 넘지만 뒤로 갈수록 지수로 불어나는 HP를 못 따라가고, 곱연산 빌드(코일 · ×배율)가 뒤에서 따라잡는다.
   */
  // 등반 봇 40판: 시작 0.72 · ×1.05 → 완주 28 (1막 대국 ≈0.8 · 1막 반장 ≈1.06 · 3막 끝 ≈1.5) — 곡선 없음(계단 1/1.15/1.3)은 31
  hpStart: 0.72,
  hpGrow: 1.065,
  atkGrow: 0.055,
};

/**
 * 막별 반장 규칙 (R5-4, D-171): 반장마다 빌드에 던지는 질문 하나 + 레일 표시 문구.
 * plate = 철갑 · 줄 폭격(1막) · spawn = 2턴마다 킹 곁에 폰(2막 — 빨리 끝낼 수 있나) · thorns = 철갑 + 맞으면 되받아침(3막 — 한 방에 몰아칠 수 있나)
 */
export type BossRule = 'plate' | 'spawn' | 'thorns';
export const BOSS_RULES: Record<BossRule, { name: string; lines: string[]; tell: string }> = {
  plate: { name: '철갑 반장', lines: ['철갑 20 · 2턴마다 다시', `줄 폭격 −${Math.round(BOSS.bombDamage * FOE.atk)} · 2턴마다`], tell: '첫 턴부터, 두 턴마다 한 줄이 불길에 잠깁니다. 바닥에 불꽃이 이는 줄에서 벗어나십시오.' },
  spawn: { name: '조립 반장', lines: ['2턴마다 킹 곁에 폰 하나', '폰이 셋 넘으면 멈춘다'], tell: '첫 턴부터, 두 턴마다 반장 곁에 폰이 찍혀 나옵니다. 빨리 끝내십시오.' },
  thorns: { name: '출하 반장', lines: ['철갑 20 · 2턴마다 다시', `못 쓰러뜨리면 친 기물이 ${Math.round(6 * FOE.atk)} 되받는다`], tell: '가시 갑옷 — 반장을 치고 못 쓰러뜨리면 가시가 친 기물에게 되돌아갑니다. 한 번에 몰아치십시오.' },
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
  /** 연쇄 (D-205 — 합 +): 이번 턴 처치마다 다음 공격 피해 +이만큼, 상한 chainCap 처치 */
  chainAddPerKill: 4,
  chainPerKill: 0.25,
  chainCap: 4,
  /** 나사 트랙 (Pawnbarian 루트 트랙): 턴마다 한 칸씩 사라진다 */
  coins: 10,
  coinValue: 4, // D-218: 5 → 4 — 한 판에 나사 약 1000을 벌고 550만 써서 400이 남았다
  /** 교착 압박 (D-196): 적 킹은 원래 뒤에 남지만, 혼자 남았거나 이 턴부터는 내 킹에게 다가온다 — 판이 끝나지 않는 교착을 막는다 */
  kingMarchTurn: 12,
  /** 보충병 (D-198): 이긴 뒤 킹 말고 분대원이 이만큼 안 되면 폰이 보충된다 — 다 잃고 겨우 이긴 다음 판이 원천 봉쇄되지 않게 */
  reinforceMin: 2,
  /** 보충할 때 덱에 폰 카드(전진)가 이보다 적으면 채워 준다 */
  reinforceCards: 2,
  /** 승격은 그 대국에서만 (D-198) — 대신 승격 도장 나사 */
  promoteBonus: 30,
  /** 적 AI (D-201): 남은 HP 대비 피해 가중 · 맞을 칸 감점 (다가가기 · 공격 값 비율 · 킹 추가) */
  aiFinishWeight: 1,
  aiRiskStep: 1,
  aiRiskAttack: 0.3,
  aiRiskKing: 30,
  /** 반장 킹 수의 우선순위 (D-201): 점수 ×배 + 더하기 — 졸개보다 먼저 태엽을 쓴다(추가 행동은 없다) */
  bossPriority: 1.5,
  bossPriorityFlat: 8,
  /** 처치 환급 (D-203): 처치마다 태엽 +1, 턴당 최대 */
  refundCap: 2,
  /** 적 AI 다가가기: 거리가 안 줄어도 내 진영 쪽으로 한 줄 나아가면 더하는 점수 (D-214) */
  aiAdvance: 1,
  /** 적 성장 깊이: 막 하나에 이만큼 (D-215 — 지도가 길어져도 성장 곡선은 그대로) */
  depthPerAct: 5,
  /** 막별 성장 [시작 깊이, 그 막에서 늘어나는 깊이] (D-216 3: 「1막 여유 → 3막 빡빡」 — 뒤 막일수록 가파르게) */
  depthActs: [[0, 5], [6, 9], [15, 5]] as [number, number][],
  /** 부품 상자 나사 [최소, 최대] (D-215) */
  chestGold: [20, 35] as [number, number],
  /** 제물 (D-217 4: 측정 가치 −24 → 올림) — 연쇄 · 카드 */
  gambitChain: 3,
  gambitDraw: 2,
  /** 기물 수집 (D-216): 분대 상한 · 대국 보상에 새 분대원이 섞일 확률 (검문 · 반장 뒤는 확정) */
  squadMax: 10,
  recruitChance: 0.25,
  /** 태엽 칸 (D-212, 사용자: "최대 5개를 깔아 두고 3개만 켠다") — 한 턴에 가질 수 있는 태엽 상한 */
  apCap: 5,
  /** 회수(연쇄 소모 → 뽑기) 최대 장수 */
  recallMax: 3,
  /**
   * 한 수의 값표 (D-202, 사용자: "값표 통일") — 플레이어 기본 이동 카드 비용과 같다.
   * 전진 · 도약 · 사선 · 왕의 걸음 1, 직진 2, 퀸은 지휘 값 2. 적도 이 값으로 태엽을 쓴다.
   */
  moveCost: { P: 1, N: 1, B: 1, R: 2, Q: 2, K: 1 } as Record<PieceType, number>,
  /** 난이도 비율 — 값은 위 FOE (반장 규칙 문구가 먼저 쓰므로 거기 둔다) */
  foeHp: FOE.hp,
  foeAtk: FOE.atk,
  foeHpStart: FOE.hpStart,
  foeHpGrow: FOE.hpGrow,
  foeAtkGrow: FOE.atkGrow,
};

/**
 * 근간 시험장 (D-177): A = 지금 규칙 + 처치 환급, B = 체력 없는 진짜 잡기 + 잡기 환급.
 * 둘 다 기본 태엽 2, 처치(잡기)마다 태엽 +1 (턴당 refundCap까지) — 폰바리안 캔트립: 턴은 벌어서 늘린다.
 */
export const LAB = {
  ap: 2,
  refundCap: 3,
  squad: ['K', 'P', 'P', 'P', 'P', 'N', 'B', 'R'] as PieceType[],
  enemy: ['K', 'P', 'P', 'P', 'P', 'P', 'N', 'B', 'R'] as PieceType[],
  /** 손으로 둔 판 (6×6): 폰 벽 뒤에 기물 — 첫 수에 열린 줄로 공짜 잡기가 나지 않게. [진영, 유형, x, y] (같은 유형은 순서대로) */
  layout: [
    [0, 'R', 0, 0], [0, 'N', 1, 0], [0, 'B', 2, 0], [0, 'K', 3, 0],
    [0, 'P', 0, 1], [0, 'P', 1, 1], [0, 'P', 2, 1], [0, 'P', 3, 1],
    [1, 'R', 0, 5], [1, 'N', 1, 5], [1, 'B', 2, 5], [1, 'K', 3, 5],
    [1, 'P', 0, 4], [1, 'P', 1, 4], [1, 'P', 2, 4], [1, 'P', 3, 4], [1, 'P', 4, 4],
  ] as [0 | 1, PieceType, number, number][],
  deck: ['advance', 'advance', 'advance', 'leap', 'leap', 'diagonal', 'diagonal', 'rookLine', 'rookLine', 'kingStep', 'order', 'order'] as CommandId[],
  /** A의 적 킹 HP 배율 (1막 대국과 같게) */
  kingHpA: 0.6,
};
