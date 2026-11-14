import type { CarveId } from '../data/carves';
import type { PieceType } from '../engine/types';
import type { SlicePartId } from './parts';

/**
 * 명령 카드 (수직 조각 — 분대 + 명령 덱, D-142). 카드를 태엽으로 내면 기물이 체스로 움직이고,
 * 내려앉은 자리에서 다음에 갈 수 있는 칸을 친다. 카드는 「누가 · 얼마에 · 무엇을 더」만 정한다.
 */
export type BaseCommandId =
  | 'advance' | 'leap' | 'diagonal' | 'kingStep' | 'order' | 'meltOath'
  | 'rookPierce' | 'phalanx' | 'bishopChain' | 'scrapToss' | 'pawnExecute' | 'kingCharge'
  | 'pierceDiag' | 'crossLeap' | 'charge' | 'plate' | 'repair' | 'reload' | 'kingBlow' | 'splashDiag' | 'smash' | 'rookLine'
  | 'rebound' | 'hoofKick' | 'march' | 'draft' | 'wrath' | 'royalGuard' | 'spark' | 'finisher'
  | 'cavCharge' | 'kingGuard' | 'doubleLeap' | 'gambit'
  | 'shove' | 'shieldBash' | 'ram'
  | 'pawnStorm' | 'knightRaid' | 'bishopRay' | 'rookCharge' | 'kingDecree' | 'overload' | 'quickFix' | 'tempo' | 'bulwark' | 'bladeRain'
  | 'vent' | 'burst' | 'recall'
  // 카드 확장 (D-281): 기물별 · 체스 수 · 공용 · 다리
  | 'castle' | 'regalGaze' | 'kingTax' | 'crownSlam' | 'enPassant' | 'anklePin' | 'pawnFork' | 'pawnShield' | 'lastRank' | 'knightFork' | 'hobble' | 'skewer' | 'bishopPin' | 'bishopFork' | 'consecrate' | 'bishopStep' | 'cathedral' | 'rookSkewer' | 'rookPin' | 'rookFork' | 'rookGuard' | 'rookDiscover' | 'siegeRam' | 'rookTax' | 'queenStride' | 'queenFork' | 'queenPin' | 'queenWrath' | 'queenSkewer' | 'queenDecree' | 'queenShield' | 'queenSweep' | 'stepAside' | 'checkCall' | 'oilCan' | 'forkAny' | 'fieldPlate' | 'rookRally' | 'bishopChase' | 'queenGuard' | 'heavyLance' | 'bishopRally' | 'knightKing';
/** 다듬은 카드는 한 장씩 「이름+」 변형이 된다 (작업대 다듬기 — 그 한 장만 태엽 −1, D-183) */
/** `+` = 다듬은 카드(태엽 −1) · `~` = 녹슨 카드(태엽 +1, D-247 저울추 사건) */
export type CommandId = BaseCommandId | `${BaseCommandId}+` | `${BaseCommandId}~`;

/**
 * 빌드 축 (D-144 — 덱빌딩의 "부서지는" 맛): 축마다 카드 몇 장 + 규칙을 깨는 부품 하나가 맞물린다.
 * 기병 = 처치한 나이트가 또 뛴다 · 보병 = 폰이 많고 싸다 · 왕관 = 킹이 직접 싸운다 · 연쇄 = 배수를 키운다.
 */
export type Axis = 'cav' | 'inf' | 'king' | 'chain' | 'push' | 'tactic';
/** tactic = 수읽기 (D-281): 체스 고유의 수 — 핀 · 포크 · 스큐어 · 디스커버드 · 캐슬링 */
export const AXIS_NAMES: Record<Axis, string> = { cav: '기병', inf: '보병', king: '왕관', chain: '연쇄', push: '밀치기', tactic: '수읽기' };

export interface CommandDef {
  name: string;
  /** 태엽 */
  cost: number;
  /** 움직일 수 있는 기물 (any = 아무나) */
  who: PieceType | 'any';
  /** move = 기물 하나를 움직여 친다 · march = 폰 모두 한 칸 전진 · draft = 킹 옆에 폰 · spark = 연쇄 +1 */
  kind: 'move' | 'shield' | 'repair' | 'draw' | 'march' | 'draft' | 'spark' | 'gambit' | 'spend' | 'swap' | 'melt';
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
  /** 묶기 — 핀 (D-281 체스 수): 친 적(쓰러지지 않은)은 다음 적 차례에 못 움직이고 방열판을 잃는다 */
  stun?: boolean;
  /** 포크 (D-281): 내려앉은 자리에서 칠 수 있는 적이 둘 이상이면 이번 공격 ×이만큼 */
  fork?: number;
  /** 디스커버드 어택 (D-281): 비켜서며 길을 연다 — 다음에 내는 공격 카드 한 장 ×이만큼 */
  nextMult?: number;
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
  advance: { name: '전진', cost: 1, who: 'P', kind: 'move', desc: '대각선 앞을 벤다. (공격력만큼 피해)', flavor: '작은 개척자', title: '작은 개척자' },
  leap: { name: '도약', cost: 1, who: 'N', kind: 'move', desc: '내려앉아 짓밟는다. (공격력만큼 피해)', flavor: '뛰어넘고, 짓밟는 자.', title: '짓밟는 자' },
  diagonal: { name: '사선', cost: 1, who: 'B', kind: 'move', desc: '첫 적을 심판한다. (공격력만큼 피해)', flavor: '성스러운 빛의 심판자', title: '빛의 심판자' },
  kingStep: { name: '왕의 걸음', cost: 1, who: 'K', kind: 'move', desc: '둘레를 짓누른다. (공격력만큼 피해)', flavor: '화려한 왕관, 잔혹한 무게', title: '잔혹한 왕관' },
  order: { name: '지휘', cost: 2, who: 'any', kind: 'move', desc: '누구든 하나를 부린다. (아무 기물로 · 공격력만큼 피해)' },
  pierceDiag: { axis: 'chain', name: '심판의 창', cost: 1, who: 'B', kind: 'move', carve: 'pierce', desc: '첫 적을 꿰뚫는다. (뒤의 적도 피해 — 첫 적을 치면)' },
  crossLeap: { axis: 'cav', name: '지축 강타', cost: 1, who: 'N', kind: 'move', carve: 'cross', desc: '발굽이 땅을 가른다. (상하좌우 적 · 절반 피해 — 내려앉으면)' },
  charge: { axis: 'inf', name: '쇄도', cost: 1, who: 'P', kind: 'move', add: 12, desc: '일격을 휘두른다. (피해 +12)' },
  // 빌드 다양성 묶음 (D-217 4): 축마다 「그 축으로 가고 싶게」 만드는 카드
  rookPierce: { axis: 'push', name: '관통 포격', cost: 2, who: 'R', kind: 'move', carve: 'pierce', mult: 1.2, desc: '요새가 줄을 꿰뚫는다. (피해 ×1.2 · 뒤의 적도 피해)' },
  scrapToss: { axis: 'push', name: '고철 투척', cost: 1, who: 'R', kind: 'move', add: 10, desc: '쇳덩이를 내던진다. (피해 +10)' },
  phalanx: { axis: 'inf', name: '방진', cost: 1, who: 'P', kind: 'move', rally: true, add: 8, desc: '어깨를 맞대고 나아간다. (피해 +8 · 곁의 폰도 공격)', flavor: '“한 발도 물러서지 마라.”' },
  pawnExecute: { axis: 'inf', axis2: 'chain', name: '개척자의 처단', cost: 1, who: 'P', kind: 'move', multPerKill: 1, desc: '작은 칼끝이 연쇄를 끝맺는다. (피해 ×1 추가 — 연쇄 1마다)' },
  bishopChain: { axis: 'chain', name: '축복의 고리', cost: 1, who: 'B', kind: 'move', chainPerKill: 2, desc: '심판받은 자는 둘로 센다. (연쇄 +2 — 처치하면)' },
  kingCharge: { axis: 'king', axis2: 'push', name: '왕의 돌진', cost: 2, who: 'K', kind: 'move', push: true, add: 6, desc: '왕이 몸소 밀고 들어간다. (피해 +6 · 맞은 적 뒤로 1칸)' },
  plate: { name: '철벽', cost: 1, who: 'any', kind: 'shield', amount: 15, desc: '굳게 걸어 잠근다. (방열판 +15)' },
  repair: { name: '응급 용접', cost: 1, who: 'any', kind: 'repair', amount: 12, desc: '기물 하나를 땜질한다. (HP +12)' },
  reload: { name: '태엽 감기', cost: 0, who: 'any', kind: 'draw', amount: 1, ap: 1, desc: '태엽을 감고 탄창을 채운다. (태엽 +1 · 카드 1장 뽑기)' },
  kingBlow: { axis: 'king', name: '왕의 철퇴', cost: 2, who: 'K', kind: 'move', mult: 2, desc: '왕이 직접 내려친다. (피해 ×2)' },
  splashDiag: { axis: 'chain', name: '파편 세례', cost: 1, who: 'B', kind: 'move', carve: 'diag', desc: '내려앉는 자리마다 유리가 깨진다. (대각선 적 · 절반 피해 — 내려앉으면)' },
  smash: { axis: 'chain', name: '분쇄', cost: 2, who: 'any', kind: 'move', mult: 1.5, desc: '온 힘을 실어 내려친다. (피해 ×1.5)' },
  rookLine: { name: '직진', cost: 2, who: 'R', kind: 'move', desc: '첫 적을 들이받는다. (공격력만큼 피해)', flavor: '살아 움직이는 요새', title: '걷는 요새' },
  // ---- 빌드 축 카드 (D-144) ----
  rebound: { axis: 'cav', name: '피의 질주', cost: 1, who: 'N', kind: 'move', freeIfKiller: true, desc: '피 냄새가 발굽을 재촉한다. (태엽 0 — 처치한 턴이면)' },
  hoofKick: { axis: 'cav', name: '짓밟기', cost: 1, who: 'N', kind: 'move', drawOnKill: 1, desc: '짓밟고 다음 명령을 받는다. (카드 1장 뽑기 — 처치하면)' },
  march: { axis: 'inf', name: '총진격', cost: 0, who: 'P', kind: 'march', desc: '줄을 맞춰, 앞으로. (모든 폰 전진 · 각자 공격)', flavor: '“전군, 진격하라!”' },
  draft: { axis: 'inf', name: '땜질 보충병', cost: 0, who: 'any', kind: 'draft', desc: '고철 더미에서 일으킨다. (킹 곁에 폰 하나 — 이번 대국만)', flavor: '“빈자리를 채워라.”' },
  wrath: { axis: 'king', name: '왕의 분노', cost: 1, who: 'K', kind: 'move', rage: true, desc: '상처 입은 만큼 분노한다. (피해 최대 ×3 — 잃은 HP만큼)' },
  royalGuard: { axis: 'king', name: '황금 흉갑', cost: 1, who: 'K', kind: 'shield', amount: 16, desc: '왕이 갑주를 두른다. (킹 방열판 +16)' },
  spark: { axis: 'chain', name: '점화', cost: 0, who: 'any', kind: 'spark', desc: '불씨를 지핀다. (연쇄 +1 · 카드 1장 뽑기)' },
  // 연쇄 소모 (D-203, 사용자: "배율은 턴 끝날 때 쌓이고 쓸 방법이 많지 않다") — 쌓인 연쇄를 모두 비우고 그만큼 효과. 연쇄 0이면 못 낸다
  // D-461: ×14 → ×6 — 연쇄가 적중 기준(D-454)이 된 뒤 한 턴 연쇄 5~6이라 0태엽에 킹 방열판 70~80. 실험실 짝 비교: 쥐여 주기만 해도 완주 24 → 94%
  // D-462 종막 전용 (사용자: 「도금왕은 깨면 끝 — 모든 걸 다 걸어도 된다」): 동료를 녹여 왕관을 친다. 보상으로 나오지 않는다
  meltOath: { name: '쇳물 서약', cost: 0, who: 'any', kind: 'melt', desc: '동료를 녹여 왕관을 친다. (도금왕 피해 최대 HP ×1.5 — 분대원 하나를 영영 녹여)', flavor: '“왕관은 늘 누군가를 녹여 빛났다.”' },
  vent: { axis: 'chain', axis2: 'king', name: '방출', cost: 1, who: 'any', kind: 'spend', spend: 'shield', amount: 6, desc: '열기를 갑옷으로 돌린다. (연쇄 ×6 · 최대 24 킹 방열판 — 연쇄를 모두 써서)', flavor: '“식기 전에 입어라.”' },
  burst: { axis: 'chain', name: '증기 폭발', cost: 1, who: 'any', kind: 'spend', spend: 'blast', amount: 14, desc: '보일러를 연다. (연쇄 ×14만큼 · 적 전체 피해 — 연쇄를 모두 써서)', flavor: '“압력을 놓아라.”' },
  recall: { axis: 'chain', name: '회수', cost: 0, who: 'any', kind: 'spend', spend: 'ap', amount: 0.5, desc: '흩어진 태엽을 거둔다. (연쇄 2마다 태엽 1 · 최대 2 — 연쇄를 모두 써서)' },
  finisher: { axis: 'chain', name: '처형', cost: 2, who: 'any', kind: 'move', multPerKill: 0.5, desc: '연쇄를 끝맺는 일격. (피해 ×0.5 추가 — 연쇄 1마다)' },
  // ---- 교차 브릿지 (D-145): 두 축에 걸친다 ----
  cavCharge: { axis: 'cav', axis2: 'inf', name: '선봉 돌파', cost: 1, who: 'N', kind: 'move', rally: true, desc: '기병이 앞장서고 보병이 뒤따른다. (곁의 폰도 공격)' },
  kingGuard: { axis: 'king', axis2: 'inf', name: '근위대 진군', cost: 1, who: 'K', kind: 'move', rally: true, desc: '왕이 나서자 근위대가 따른다. (곁의 폰도 공격)' },
  doubleLeap: { axis: 'cav', axis2: 'chain', name: '광란의 도약', cost: 1, who: 'N', kind: 'move', chainPerKill: 2, desc: '피를 볼수록 발이 빨라진다. (연쇄 +2 — 처치하면)' },
  // ---- 밀치기 (D-154): 친 적을 한 칸 민다, 막히면 충돌 ----
  shove: { axis: 'push', name: '몰아치기', cost: 2, who: 'any', kind: 'move', push: true, desc: '적을 밀어낸다. (맞은 적 뒤로 1칸 · 막히면 피해 30)' },
  shieldBash: { axis: 'push', axis2: 'inf', name: '방패 돌진', cost: 1, who: 'P', kind: 'move', push: true, desc: '방패로 밀쳐 낸다. (맞은 적 뒤로 1칸 · 막히면 피해 30)' },
  ram: { axis: 'push', axis2: 'cav', name: '파성추', cost: 1, who: 'N', kind: 'move', push: true, desc: '들이받아 밀어낸다. (맞은 적 뒤로 1칸 · 막히면 피해 30)' },
  // ---- 볼륨 (R5-5, D-172): 있는 장치(배율 · 각인 · 밀치기 · 뽑기 · 연쇄)만 조합 ----
  pawnStorm: { axis: 'inf', name: '선두 분쇄', cost: 1, who: 'P', kind: 'move', push: true, add: 5, desc: '앞으로 밀어붙인다. (피해 +5 · 맞은 적 뒤로 1칸)' },
  knightRaid: { axis: 'cav', name: '기습', cost: 1, who: 'N', kind: 'move', mult: 1.5, drawOnKill: 1, desc: '어둠 속에서 덮친다. (피해 ×1.5 · 처치 시 카드 1장)' },
  bishopRay: { axis: 'chain', name: '정죄의 빛', cost: 1, who: 'B', kind: 'move', carve: 'pierce', mult: 1.4, desc: '사선 끝까지 꿰뚫는다. (피해 ×1.4 · 뒤의 적도 피해)' },
  rookCharge: { axis: 'push', name: '성벽 돌진', cost: 2, who: 'R', kind: 'move', push: true, add: 8, desc: '요새가 통째로 밀고 들어간다. (피해 +8 · 맞은 적 뒤로 1칸)' },
  kingDecree: { axis: 'king', axis2: 'chain', name: '왕명', cost: 1, who: 'K', kind: 'move', chainPerKill: 2, desc: '왕의 손에 쓰러진 자는 둘로 센다. (연쇄 +2 — 처치하면)' },
  overload: { axis: 'chain', name: '과부하', cost: 3, who: 'any', kind: 'move', mult: 2.5, desc: '태엽을 끝까지 감는다. (피해 ×2.5)' },
  quickFix: { name: '덧댐', cost: 0, who: 'any', kind: 'repair', amount: 6, desc: '급한 대로 덧댄다. (HP +6)' },
  tempo: { axis: 'chain', name: '박자', cost: 0, who: 'any', kind: 'draw', amount: 3, desc: '숨을 고르고 다음 수를 본다. (카드 3장 뽑기)' },
  bulwark: { axis: 'king', axis2: 'push', name: '방벽', cost: 1, who: 'any', kind: 'shield', amount: 20, desc: '몸으로 막아선다. (방열판 +20)' },
  bladeRain: { axis: 'cav', axis2: 'chain', name: '칼날 세례', cost: 2, who: 'N', kind: 'move', carve: 'cross', chainPerKill: 2, desc: '뛰어내리며 사방을 벤다. (사방 절반 피해 · 처치 시 연쇄 +2)' },
  gambit: { axis: 'inf', axis2: 'chain', name: '제물', cost: 0, who: 'P', kind: 'gambit', desc: '작은 것을 바친다. (연쇄 +3 · 카드 2 · 태엽 +1 — 폰을 바쳐)', flavor: '“기꺼이.”' },

  // ---- 카드 확장 (D-281, 사용자: 「체스 룰을 너무 부수지 않으면서 각 말의 명령 카드로 쓰기 좋은 풀 90장」) — 이동은 기물 고유, 체스 수는 핀 · 포크 · 스큐어 · 디스커버드 · 캐슬링 · 앙파상 ----
  castle: { axis: 'tactic', axis2: 'king', name: '캐슬링', cost: 1, who: 'K', kind: 'swap', amount: 12, desc: '왕과 요새가 맞바꾼다. (둘 다 방열판 +12 — 룩과 자리를 바꿔)', flavor: '“성문을 바꿔 단다.”' },
  regalGaze: { axis: 'tactic', axis2: 'king', name: '왕의 시선', cost: 1, who: 'K', kind: 'move', stun: true, add: 4, desc: '노려본 자는 발이 묶인다. (피해 +4 · 다음 턴 행동 불가 — 맞은 적)' },
  kingTax: { axis: 'king', name: '왕의 세금', cost: 1, who: 'K', kind: 'move', drawOnKill: 2, desc: '쓰러뜨린 자에게서 거둔다. (카드 2장 뽑기 — 처치하면)' },
  crownSlam: { axis: 'king', axis2: 'chain', name: '왕관 내리찍기', cost: 2, who: 'K', kind: 'move', carve: 'cross', mult: 1.5, desc: '왕관째로 내리찍는다. (피해 ×1.5 · 사방 절반 피해)', flavor: '화려한 왕관, 잔혹한 무게' },
  enPassant: { axis: 'tactic', axis2: 'inf', name: '앙파상', cost: 1, who: 'P', kind: 'move', carve: 'cross', add: 8, desc: '곁을 지나치는 자까지 벤다. (피해 +8 · 사방 절반 피해)' },
  anklePin: { axis: 'tactic', axis2: 'inf', name: '발목 잡기', cost: 1, who: 'P', kind: 'move', stun: true, desc: '작은 손이 발목을 붙든다. (다음 턴 행동 불가 · 방열판 0 — 맞은 적)' },
  pawnFork: { axis: 'tactic', axis2: 'inf', name: '폰 포크', cost: 1, who: 'P', kind: 'move', fork: 2.2, desc: '두 적 사이에 파고든다. (피해 ×2.2 — 두 적을 칠 때)' },
  pawnShield: { axis: 'inf', name: '방패 세우기', cost: 1, who: 'P', kind: 'shield', amount: 24, desc: '작은 방패를 세운다. (폰 방열판 +24)' },
  lastRank: { axis: 'inf', name: '끝 줄의 꿈', cost: 1, who: 'P', kind: 'move', mult: 3, desc: '끝 줄을 꿈꾸며 내지른다. (피해 ×3)', flavor: '“언젠가는, 저 끝까지.”' },
  knightFork: { axis: 'tactic', axis2: 'cav', name: '나이트 포크', cost: 1, who: 'N', kind: 'move', fork: 1.8, desc: '두 적을 한 번에 노린다. (피해 ×1.8 — 두 적을 칠 때)', flavor: '체스에서 가장 오래된 함정' },
  hobble: { axis: 'tactic', axis2: 'cav', name: '말발굽 족쇄', cost: 1, who: 'N', kind: 'move', stun: true, drawOnKill: 1, desc: '짓밟아 묶는다. (다음 턴 행동 불가 · 처치 시 카드 1장 — 맞은 적)' },
  skewer: { axis: 'tactic', axis2: 'chain', name: '스큐어', cost: 1, who: 'B', kind: 'move', carve: 'pierce', add: 6, desc: '앞뒤의 둘을 함께 꿴다. (피해 +6 · 뒤의 적도 피해)' },
  bishopPin: { axis: 'tactic', name: '빛의 못', cost: 1, who: 'B', kind: 'move', stun: true, carve: 'pierce', desc: '빛이 둘을 꿰어 박는다. (다음 턴 행동 불가 · 방열판 0 — 맞은 적과 뒤의 적)' },
  bishopFork: { axis: 'tactic', name: '갈림길의 빛', cost: 1, who: 'B', kind: 'move', fork: 1.6, desc: '두 갈래 사선을 동시에 비춘다. (피해 ×1.6 — 두 적을 칠 때)' },
  consecrate: { axis: 'chain', name: '축성', cost: 1, who: 'B', kind: 'shield', amount: 20, desc: '빛을 두른다. (비숍 방열판 +20)' },
  bishopStep: { axis: 'tactic', axis2: 'chain', name: '비켜서는 사제', cost: 1, who: 'B', kind: 'move', nextMult: 2, desc: '비켜서며 길을 연다. (다음 공격 피해 ×2)' },
  cathedral: { axis: 'chain', name: '대성당의 빛', cost: 2, who: 'B', kind: 'move', carve: 'diag', mult: 1.6, chainPerKill: 2, desc: '빛이 쏟아진다. (피해 ×1.6 · 대각선 절반 피해 · 처치 시 연쇄 +2)', flavor: '성스러운 빛의 심판자' },
  rookSkewer: { axis: 'tactic', axis2: 'push', name: '성벽 꿰기', cost: 2, who: 'R', kind: 'move', carve: 'pierce', add: 8, desc: '줄을 따라 둘을 꿴다. (피해 +8 · 뒤의 적도 피해)' },
  rookPin: { axis: 'tactic', axis2: 'push', name: '쇠사슬', cost: 1, who: 'R', kind: 'move', stun: true, desc: '쇠사슬을 던져 묶는다. (다음 턴 행동 불가 · 방열판 0 — 맞은 적)' },
  rookFork: { axis: 'tactic', axis2: 'push', name: '십자 포격', cost: 2, who: 'R', kind: 'move', fork: 1.7, desc: '두 줄을 동시에 겨눈다. (피해 ×1.7 — 두 적을 칠 때)' },
  rookGuard: { axis: 'push', name: '성문 잠그기', cost: 1, who: 'R', kind: 'shield', amount: 24, desc: '성문을 내린다. (룩 방열판 +24)' },
  rookDiscover: { axis: 'tactic', axis2: 'push', name: '성문 열기', cost: 1, who: 'R', kind: 'move', nextMult: 2, desc: '비켜서며 길을 연다. (다음 공격 피해 ×2)' },
  siegeRam: { axis: 'push', name: '공성추', cost: 2, who: 'R', kind: 'move', push: true, mult: 1.8, desc: '요새가 성문을 부순다. (피해 ×1.8 · 맞은 적 뒤로 1칸)', flavor: '살아 움직이는 요새' },
  rookTax: { axis: 'push', name: '통행세', cost: 1, who: 'R', kind: 'move', add: 4, drawOnKill: 1, desc: '지나가려면 값을 치러라. (피해 +4 · 처치 시 카드 1장)' },
  queenStride: { name: '여왕의 행보', cost: 2, who: 'Q', kind: 'move', desc: '어느 길로든 나아간다. (공격력만큼 피해 — 어느 방향이든)', flavor: '모든 길의 주인', title: '모든 길' },
  queenFork: { axis: 'tactic', name: '여왕의 포크', cost: 2, who: 'Q', kind: 'move', fork: 1.8, desc: '여덟 갈래 중 둘을 고른다. (피해 ×1.8 — 두 적을 칠 때)' },
  queenPin: { axis: 'tactic', name: '여왕의 못', cost: 2, who: 'Q', kind: 'move', stun: true, carve: 'pierce', desc: '줄 위의 둘을 박는다. (다음 턴 행동 불가 · 방열판 0 — 맞은 적과 뒤의 적)' },
  queenWrath: { axis: 'chain', name: '여왕의 진노', cost: 3, who: 'Q', kind: 'move', mult: 2.7, desc: '모든 길이 한 점으로 모인다. (피해 ×2.7)' },
  queenSkewer: { axis: 'tactic', name: '여왕의 창', cost: 2, who: 'Q', kind: 'move', carve: 'pierce', add: 8, desc: '줄 끝까지 꿰뚫는다. (피해 +8 · 뒤의 적도 피해)' },
  queenDecree: { axis: 'chain', name: '여왕의 칙령', cost: 2, who: 'Q', kind: 'move', chainPerKill: 2, desc: '여왕 앞에 쓰러진 자는 둘로 센다. (연쇄 +2 — 처치하면)' },
  queenShield: { axis: 'king', name: '여왕의 망토', cost: 1, who: 'Q', kind: 'shield', amount: 25, desc: '망토를 두른다. (퀸 방열판 +25)' },
  queenSweep: { axis: 'chain', name: '여왕의 휩쓸기', cost: 2, who: 'Q', kind: 'move', carve: 'cross', mult: 1.3, desc: '내려앉으며 둘레를 쓴다. (피해 ×1.3 · 사방 절반 피해)' },
  stepAside: { axis: 'tactic', name: '비켜서기', cost: 1, who: 'any', kind: 'move', nextMult: 1.3, desc: '길을 내어 준다. (다음 공격 피해 ×1.3)' },
  checkCall: { axis: 'tactic', name: '체크!', cost: 2, who: 'any', kind: 'move', stun: true, desc: '외침과 함께 묶는다. (다음 턴 행동 불가 · 방열판 0 — 맞은 적)', flavor: '“체크!”' },
  oilCan: { name: '기름칠', cost: 1, who: 'any', kind: 'repair', amount: 16, desc: '삐걱이는 관절에 기름을 먹인다. (HP +16)' },
  forkAny: { axis: 'tactic', name: '양수겸장', cost: 2, who: 'any', kind: 'move', fork: 1.5, desc: '둘을 한꺼번에 겨눈다. (피해 ×1.5 — 두 적을 칠 때)' },
  fieldPlate: { name: '덧댄 판', cost: 0, who: 'any', kind: 'shield', amount: 10, desc: '쇳조각을 덧댄다. (방열판 +10)' },
  rookRally: { axis: 'push', axis2: 'inf', name: '성벽 뒤의 행렬', cost: 2, who: 'R', kind: 'move', rally: true, desc: '요새가 나아가면 폰들이 뒤따른다. (곁의 폰도 공격)' },
  bishopChase: { axis: 'chain', axis2: 'cav', name: '빛의 추격', cost: 1, who: 'B', kind: 'move', freeIfKiller: true, desc: '쓰러뜨린 빛이 다시 내리꽂힌다. (태엽 0 — 처치한 턴이면)' },
  queenGuard: { axis: 'king', axis2: 'inf', name: '여왕의 근위대', cost: 2, who: 'Q', kind: 'move', rally: true, desc: '여왕이 나서자 폰들이 따른다. (곁의 폰도 공격)' },
  heavyLance: { axis: 'push', axis2: 'cav', name: '무거운 창', cost: 2, who: 'R', kind: 'move', freeIfKiller: true, push: true, desc: '기세로 다시 밀고 간다. (맞은 적 뒤로 1칸 · 처치 턴 태엽 0)' },
  bishopRally: { axis: 'chain', axis2: 'inf', name: '순례 행렬', cost: 1, who: 'B', kind: 'move', rally: true, desc: '사제가 앞서면 폰들이 따른다. (곁의 폰도 공격)' },
  knightKing: { axis: 'cav', axis2: 'king', name: '왕의 기사', cost: 1, who: 'N', kind: 'move', add: 6, freeIfKiller: true, desc: '왕을 위해 다시 뛴다. (피해 +6 · 처치 턴 태엽 0)' },
};

/** 다듬은 변형: 이름 뒤에 +, 태엽 −1 (0 아래로는 안 내려간다). 나머지는 원본 그대로 */
export const refinedOf = (id: BaseCommandId): CommandId => `${id}+`;
/** 변형이면 원본 id */
export const baseOf = (id: CommandId): BaseCommandId => (id.endsWith('+') || id.endsWith('~') ? id.slice(0, -1) : id) as BaseCommandId;
export const isRefined = (id: CommandId): boolean => id.endsWith('+');
export const isRusted = (id: CommandId): boolean => id.endsWith('~');
/** 한 번 다듬기: 녹슨 카드는 녹을 벗고(원본), 원본은 「+」 */
export const refineOnce = (id: CommandId): CommandId => (isRusted(id) ? baseOf(id) : refinedOf(baseOf(id)));
/** 한 번 녹슬기 (D-247): 다듬은 카드는 「+」를 잃고(원본), 원본은 「−」(태엽 +1) */
export const rustOnce = (id: CommandId): CommandId => (isRefined(id) ? baseOf(id) : (`${baseOf(id)}~` as CommandId));
export const COMMANDS = Object.fromEntries(
  (Object.entries(BASE_COMMANDS) as [BaseCommandId, CommandDef][]).flatMap(([id, c]) => [
    [id, c],
    [refinedOf(id), { ...c, name: `${c.name}+`, cost: Math.max(0, c.cost - 1) }],
    [`${id}~`, { ...c, name: `${c.name}−`, cost: c.cost + 1 }],
  ]),
) as Record<CommandId, CommandDef>;

/** 시작 덱 (10장) — 2판 구조 시절 (테스트 · 봇 기준용으로 남긴다) */
export const START_COMMANDS: CommandId[] = ['advance', 'advance', 'advance', 'leap', 'leap', 'diagonal', 'diagonal', 'kingStep', 'order', 'order'];

/**
 * 첫 10분 (D-150 — 조사 B: 30초 첫 타격 · 2분 첫 승 · 5분 안 첫 "와!").
 * 분대는 작게 시작한다(킹 · 폰 · 비숍), 1판 뒤 기물 영입, 2판 뒤 부품 상자 = 부품 + 맞물리는 카드 둘(첫 사기 조합 확정).
 */
/** 시작 분대 (D-241: 비숍 → 나이트 — 부관 박차가 나이트라 첫 판부터 곁에서 싸운다, 착지 짓밟기로 1턴 3연쇄) */
export const START_SQUAD: PieceType[] = ['K', 'P', 'N'];
/**
 * 내는 기물 말고도 분대에 있어야 쓸모 있는 기물 (D-316): 캐슬링은 킹이 내지만 룩이 없으면 낼 수 없다 —
 * 룩 없는 분대에 보상으로 나와 손패만 막던 죽은 카드(힘 값 −0.95)를 막는다.
 */
export const CARD_NEEDS: Partial<Record<BaseCommandId, PieceType>> = { castle: 'R' };
/** 이 분대(기물 유형들)로 쓸 수 있는 카드인가 — 내는 기물 + CARD_NEEDS */
export const cardFits = (id: CommandId, types: readonly string[]): boolean => {
  const c = COMMANDS[id];
  const need = CARD_NEEDS[baseOf(id)];
  return (c.who === 'any' || types.includes(c.who)) && (!need || types.includes(need));
};
export const START_DECK: CommandId[] = ['advance', 'advance', 'advance', 'leap', 'leap', 'kingStep', 'order', 'order'];

/** 영입: 기물 하나 + 그 기물의 카드 */
/** 새 분대원 (D-218: 들고 오는 카드 2장 → 1장 — 분대원 8명이 카드 16장을 몰고 와 덱이 38장까지 불었다) */
export const RECRUITS: { t: PieceType; cards: CommandId[]; line: string }[] = [
  { t: 'N', cards: ['leap'], line: '뛰어넘고, 짓밟는 자.' },
  { t: 'P', cards: ['charge'], line: '작은 개척자' },
  { t: 'B', cards: ['pierceDiag'], line: '성스러운 빛의 심판자' },
  { t: 'R', cards: ['rookLine'], line: '살아 움직이는 요새' },
  { t: 'Q', cards: ['queenStride'], line: '모든 길의 주인' },
];
/**
 * 기물 등급 · 나올 무게 (D-319, 테스터: 「기물별 등장 확률이 같나? 레어리티 없나?」 — 예전엔 폰과 퀸이 똑같이 1/5).
 * 폰 일반 · 나이트 · 비숍 일반 · 룩 희귀 · 퀸 황금. 무게 합 100 = 퍼센트.
 */
export const RECRUIT_ODDS: Record<PieceType, { w: number; grade: Grade }> = {
  P: { w: 32, grade: 'common' },
  N: { w: 26, grade: 'common' },
  B: { w: 26, grade: 'common' },
  R: { w: 12, grade: 'rare' },
  Q: { w: 4, grade: 'gold' },
  K: { w: 0, grade: 'gold' },
};
/** 무게대로 영입 기물 하나 (pool에서 뽑아 낸다) */
export const rollRecruit = <T extends { t: PieceType }>(pool: T[], r: number): T => {
  let x = r * pool.reduce((n, o) => n + RECRUIT_ODDS[o.t].w, 0);
  for (const o of pool) if ((x -= RECRUIT_ODDS[o.t].w) < 0) return o;
  return pool[pool.length - 1];
};

/** 부품 상자 (첫 사기 조합 확정): 부품 + 맞물리는 카드 둘. needs = 분대에 있어야 하는 기물 */
export const KITS: { part: SlicePartId; cards: CommandId[]; needs?: PieceType }[] = [
  { part: 'relayGear', cards: ['advance', 'leap'] },
  { part: 'siegeLatch', cards: ['rookCharge', 'plate'], needs: 'R' },
  { part: 'drum', cards: ['march', 'march'] },
  { part: 'assembly', cards: ['gambit', 'draft'] },
  { part: 'crown', cards: ['wrath', 'kingBlow'] },
  { part: 'horseshoe', cards: ['knightRaid', 'rebound'], needs: 'N' },
  { part: 'echo', cards: ['doubleLeap', 'spark'], needs: 'N' },
  { part: 'magnet', cards: ['spark', 'spark'] },
  { part: 'anvilPlate', cards: ['shieldBash', 'shove'] },
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
  // 카드 확장 (D-281) — 설계 등급(측정 전): 체스 수는 희귀, 한 방 배율은 금
  castle: 'rare', crownSlam: 'gold', pawnFork: 'rare', lastRank: 'gold', knightFork: 'rare', bishopPin: 'rare', bishopStep: 'rare', cathedral: 'gold', rookFork: 'rare', rookDiscover: 'rare', siegeRam: 'gold', queenFork: 'rare', queenPin: 'rare', queenWrath: 'gold', queenSweep: 'rare', checkCall: 'rare', rookRally: 'rare', bishopChase: 'rare', queenGuard: 'rare', heavyLance: 'rare', knightKing: 'rare',
  // 측정 (D-217 2, sim/rarity.sim.ts — 모든 기물 분대 · 2 · 3막 판 200번 · 넣은 덱 vs 기본 카드 덱의 승률 차 + 턴 단축 × 5):
  // 황금 = 상위 약 10% (가치 34 이상), 희귀 = 다음 35% (가치 12 이상), 나머지 일반. 봇이 못 쓰는 연쇄 마무리(처형 · 칼날 세례)만 설계 판단으로 희귀.
  rookCharge: 'gold', shove: 'gold', overload: 'gold', wrath: 'gold', scrapToss: 'gold', rookPierce: 'rare',
  royalGuard: 'rare', bulwark: 'rare', smash: 'rare', quickFix: 'rare', spark: 'rare', repair: 'rare', plate: 'rare', ram: 'rare', kingDecree: 'rare',
  pawnStorm: 'rare', kingBlow: 'rare', shieldBash: 'rare', charge: 'rare', finisher: 'rare', bladeRain: 'rare',
  // 등반 감사 재측정 (D-227): 손본 뒤 가치 12 넘은 카드
  reload: 'rare', knightRaid: 'rare', draft: 'rare', kingGuard: 'rare', bishopRay: 'rare',
};
export const gradeOf = (id: string): Grade => CARD_GRADE[id.replace(/[+~]$/, '')] ?? 'common';
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

export const REWARD_COMMANDS: CommandId[] = ['pierceDiag', 'crossLeap', 'charge', 'plate', 'repair', 'reload', 'kingBlow', 'splashDiag', 'smash', 'rebound', 'hoofKick', 'march', 'draft', 'wrath', 'royalGuard', 'spark', 'finisher', 'cavCharge', 'kingGuard', 'doubleLeap', 'gambit', 'shove', 'shieldBash', 'ram', 'pawnStorm', 'knightRaid', 'bishopRay', 'rookCharge', 'kingDecree', 'overload', 'quickFix', 'tempo', 'bulwark', 'bladeRain', 'vent', 'burst', 'recall', 'rookPierce', 'scrapToss', 'phalanx', 'pawnExecute', 'bishopChain', 'kingCharge', 'castle', 'regalGaze', 'kingTax', 'crownSlam', 'enPassant', 'anklePin', 'pawnFork', 'pawnShield', 'lastRank', 'knightFork', 'hobble', 'skewer', 'bishopPin', 'bishopFork', 'consecrate', 'bishopStep', 'cathedral', 'rookSkewer', 'rookPin', 'rookFork', 'rookGuard', 'rookDiscover', 'siegeRam', 'rookTax', 'queenStride', 'queenFork', 'queenPin', 'queenWrath', 'queenSkewer', 'queenDecree', 'queenShield', 'queenSweep', 'stepAside', 'checkCall', 'oilCan', 'forkAny', 'fieldPlate', 'rookRally', 'bishopChase', 'queenGuard', 'heavyLance', 'bishopRally', 'knightKing'];

/**
 * 반장 규칙 (D-148 — 레퍼런스 5권 원리 5 「부서진 빌드는 너프하지 말고 보스가 질문한다」). 둘 다 미리 보인다.
 * 철갑: 반장 킹은 2턴마다 방열판을 다시 두른다 → 몰아칠 수 있나?
 * 줄 폭격: 2턴마다 한 줄을 예고하고 다음 적 차례에 그 줄을 친다 → 뭉쳐 있지 않나?
 */
// 철갑 20 · 2턴마다: 빔 탐색 봇 기준 시작 덱만 25% · 카드 2장 + 부품 1 빌드 88% — 빌드를 갖췄는지 묻는다 (30 · 매 턴은 벽이었다: 0~13%)
/** 고물상 · 작업대 (R5-2, D-168) — 값은 구조용, 조정은 R7 */
/** gradePrice · partGradePrice (D-217 3): 고물상 값은 등급으로 — 일반 · 희귀 · 황금 */
/** refinePrice (D-218): 고물상 다듬기 — 남는 나사를 강화로 */
export const SHOP = { refinePrice: 60, gradePrice: { common: 30, rare: 45, gold: 70 }, partGradePrice: { common: 70, rare: 95, gold: 130 }, cardPrice: [25, 35, 50] as const, partPrice: 90, healPrice: 40, healPct: 0.35, removePrice: 50, cards: 4, parts: 1 }; // 진열대 = 카드 4 + 부품 1 (부적이 나오면 카드 한 자리) + 서비스 둘 — 한 화면에 4 + 3, 넘김 없음 (D-394, 총괄 리뷰 2-3)
/** braceDoors = 작업대 「보강」 생명 수 (D-319) */
export const FORGE = { repairPct: 0.4, braceDoors: 1 };
/**
 * 경제 압박 (D-247, 사용자: 「수리 · 강화 · 빼기를 너무 자주 고를 수 있고 슬롯도 없어 돈을 펑펑 쓰면 된다 — 한정된 재화로 고민하는 게 아니라」):
 * 부품 칸 · 서비스 값 누적(슬더스식 빼기 값 오름) · 고물상 서비스는 셋 중 둘만 · 작업대도 셋 중 둘.
 */
/** 이 막의 부품 칸: 6 → 7 → 8 → 8. 이후에도 8칸 상한 (D-433). */
export const partSlotsAt = (actIndex: number): number => Math.min(ECON.partSlotsMax, ECON.partSlots + ECON.partSlotsPerAct * Math.max(0, actIndex));
export const ECON = {
  /** 초반 빌드 재료를 한 칸 더 보유한다. 가득 차면 교체/포기는 유지한다. */
  partSlots: 6,
  partSlotsMax: 8,
  partSlotsPerAct: 1,
  meltBack: 20,
  /** 고물상 다듬기 · 빼기는 출하 내내 쓸 때마다 값이 오른다 */
  svcStep: 25,
  /** 고물상 아래 줄 서비스(정비 · 다듬기 · 빼기) 중 진열되는 수 */
  shopSvc: 2,
  /** 작업대 선택지 (다듬기 · 빼기 · 수리) 중 나오는 수 */
  forgeOpts: 2,
};

/** 밀치기 충돌 피해 (밀린 적과 부딪힌 기물 둘 다) */
// 18: 조합 봇에서 쇠망치 + 밀치기 카드가 기준의 약 1.9배 (12일 땐 1.5배 — 축 단독 2배 목표, D-154)
// D-461: 18 → 30 — 밀치기 축 완주 25%로 바닥권(실험실). 충돌도 공정 열기를 받아 초반엔 약하다
export const PUSH = { collide: 30 };

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
  // D-229 (회피 반격 · 헛방 경직 · 기어 쇼크 뒤): 1.5 · 0.07 · 1.075 — 단순 25% · 보통 50% · 두뇌 85% (40판)
  // D-461: 1.2 → 1.25 — 약한 축(보병 · 밀치기)을 올린 만큼 전체가 쉬워져 보통 봇 53% → 43%
  // D-454 (공정 열기 · 적중 연쇄 뒤): 1.5 · 0.07 → 1.2 · 0.04 — 열기가 다 오른 뒤 3막에서 한 적 턴에 분대원 둘 이상을 잃는 판이
  // 두뇌 봇 36% → 15% (전체 19% → 10%), 이긴 대국 길이 2막 3.9 · 3막 5.1턴 (pace 24출하). HP를 올리면 판이 길어져 열기 최대 턴이 늘고 손실이 도로 는다
  atk: 1.3,
  /**
   * 층별 성장 곡선 (D-203, 사용자: "유저가 강해지는 만큼 적도 — 합연산은 지금 강하고 곱연산은 나중에 강하게"):
   * 적 HP는 대국마다 곱으로 (hpGrow^깊이 — 지수), 공격은 더하기로 (1 + atkGrow × 깊이 — 직선).
   * 합연산 빌드(고정 피해 · +% 연쇄)는 초반을 쉽게 넘지만 뒤로 갈수록 지수로 불어나는 HP를 못 따라가고 곱연산 빌드(코일 · ×배율)가 뒤에서 따라잡는다.
   */
  // 등반 봇 40판: 시작 0.72 · ×1.05 → 완주 28 (1막 대국 ≈0.8 · 1막 반장 ≈1.06 · 3막 끝 ≈1.5) — 곡선 없음(계단 1/1.15/1.3)은 31
  // D-454: 0.72 · 1.043 → 0.85 · 1.05 — 적 공격을 낮춘 만큼 HP로 버티게 (보통 봇 완주 83% → 58%, 두뇌 봇 손실 12%)
  // D-463: 0.85 · 1.05 → 0.9 · 1.035 — 실험실 「막별 성장」에서 3막 대국이 8턴을 넘었다(우리 턴당 피해가 2막 → 3막에 15~25%만 오르는데 적 HP는 대국마다 ×1.05)
  hpStart: 0.9,
  // D-298 (확장 뒤 밸런스 패치): 1.075 → 1.06 — D-243 판 구조 · D-252 종막 · 3막 깊이 20에서 HP가 4.25배로 불어 두뇌 봇도 50%였다
  hpGrow: 1.035,
  atkGrow: 0.04,
};

/**
 * 막별 반장 규칙 (R5-4, D-171): 반장마다 빌드에 던지는 질문 하나 + 레일 표시 문구.
 * plate = 철갑 · 줄 폭격(1막) · spawn = 2턴마다 킹 곁에 폰(2막 — 빨리 끝낼 수 있나) · thorns = 철갑 + 맞으면 되받아침(3막 — 한 방에 몰아칠 수 있나)
 */
export type BossRule = 'plate' | 'spawn' | 'thorns' | 'gilded' | 'inspect' | 'magnet' | 'alarm';
/** 막마다 반장 둘 중 하나 (D-274): 1막 철갑 · 검수 · 2막 조립 · 자석 · 3막 출하 · 경보 */
export const BOSS_PAIRS: [BossRule, BossRule][] = [['plate', 'inspect'], ['spawn', 'magnet'], ['thorns', 'alarm']];
/** 새 반장의 판 · 기물 색 · 등장 FX는 같은 막 반장의 것을 빌린다 (전용 그림이 오기 전까지) */
export const bossSkin = (r: BossRule): 'plate' | 'spawn' | 'thorns' | 'gilded' => (r === 'inspect' ? 'plate' : r === 'magnet' ? 'spawn' : r === 'alarm' ? 'thorns' : r);
/** 반장 규칙 수치 — 되받아침 6 → 4 (D-298) */
/** alarmFull (D-454 경보 개편): 우리가 적을 친 횟수로 눈금이 찬다 — 이만큼 차면 그 적 차례 공격 ×alarmMult */
export const BOSS_NUM = { spawnEvery: 2, spawnMax: 3, thorns: 4, stampEvery: 2, stampMult: 0.5, magnetEvery: 2, alarmFull: 8, alarmMult: 1.35 };
export const BOSS_RULES: Record<BossRule, { name: string; lines: string[]; tell: string }> = {
  plate: { name: '철갑 반장', lines: [`철갑 ${BOSS.plate} · 2턴마다 다시`, `줄 폭격 −${Math.round(BOSS.bombDamage * FOE.atk)} · 2턴마다`], tell: '2턴부터, 두 턴마다 한 줄이 불길에 잠깁니다. 바닥에 불꽃이 이는 줄에서 벗어나십시오.' },
  spawn: { name: '조립 반장', lines: ['2턴마다 킹 곁에 폰 하나', '폰이 셋 넘으면 멈춘다'], tell: '배치 턴부터, 두 턴마다 반장 곁에 폰이 찍혀 나옵니다. 찍힌 폰도 치면 연쇄가 쌓입니다.' },
  gilded: { name: '도금왕', lines: ['금칠 방열판 · 2턴마다 다시', '폰 찍어 내기 · 줄 폭격 · 되받아침'], tell: '앞의 세 반장이 쓰던 것을 모두 씁니다 — 홀수 턴엔 곁에 폰을 찍어 내고 짝수 턴엔 한 줄을 불태우고 못 쓰러뜨린 공격은 가시로 돌려줍니다.' },
  inspect: { name: '검수 반장', lines: [`철갑 ${BOSS.plate} · 2턴마다 다시`, '2턴마다 불량 도장 — 찍힌 기물의 공격 ×0.5'], tell: '두 턴마다 당신의 가장 센 기물에 불량 도장을 찍습니다. 도장 찍힌 기물은 공격이 절반이 됩니다 — 다른 기물로 치십시오.' },
  magnet: { name: '자석 반장', lines: ['2턴마다 가장 가까운 기물을 끌어당긴다', '끌려가는 기물에 자석 표시'], tell: '두 턴마다 반장에게 가장 가까운 기물 하나가 한 칸 끌려갑니다. 자석 표시가 붙은 기물을 미리 빼내십시오.' },
  alarm: { name: '경보 반장', lines: [`철갑 ${BOSS.plate} · 2턴마다 다시`, `적을 칠 때마다 경보 +1 · ${BOSS_NUM.alarmFull}이 차면 적 공격 ×${BOSS_NUM.alarmMult}`], tell: `적을 칠 때마다 경보 눈금이 오릅니다. ${BOSS_NUM.alarmFull}이 차면 그 적 차례의 공격이 ${BOSS_NUM.alarmMult}배 — 몰아칠지, 나눠 칠지 고르십시오.` },
  thorns: { name: '출하 반장', lines: [`철갑 ${BOSS.plate} · 2턴마다 다시`, `못 쓰러뜨리면 친 기물이 ${Math.round(BOSS_NUM.thorns * FOE.atk)} 되받는다`], tell: '가시 갑옷 — 반장을 치고 못 쓰러뜨리면 가시가 친 기물에게 되돌아갑니다. 한 번에 몰아치십시오.' },
};
/** 반장 규칙별 보정 (D-298): king = 킹 HP 배율 · atk = 그 판 적 공격 배율 — 기믹은 그대로 두고 벽이 된 반장만 덜어 낸다 */
export const BOSS_TUNE: Partial<Record<BossRule, { king?: number; atk?: number }>> = {
  // 2막 조립 반장 · 3막 출하 반장이 보통 봇 29% · 14%의 벽이었다 (측정 2026-11-07) — 폰 찍기 · 되받아침은 그대로
  spawn: { king: 0.8, atk: 0.7 },
  thorns: { king: 0.6, atk: 0.6 }, // D-358: 킹 0.7 → 0.6 · 공격 0.7 → 0.6 (확정 측정 58%)
  alarm: { king: 0.7, atk: 0.75 }, // D-457: 0.85 · 0.85 → 0.7 · 0.75 — 실험실에서 보통 봇 3막 반장 승률 45% (경보를 꺼도 50%: 철갑 재생 + 3막 구성이 무겁다). D-358: 확정 측정에서 보통 봇 50% — 반장 중 가장 낮았다
  // D-358: 1막 둘은 보통 봇 90 · 95%로 생명이 아니었다 → 킹 HP ×1.25 · 공격 ×1.1 (×1.5는 승급 6에서 벽이 됐다)
  plate: { king: 1.25, atk: 1.1 },
  inspect: { king: 1.25, atk: 1.1 },
  // D-316: 2막 자석 반장 42% (보통 봇, D-299) — 끌어당기기는 그대로
  magnet: { king: 0.85, atk: 0.8 },
};

/** 막별 적 특성 (R5-4): 2막 자폭 폰(쓰러지면 둘레 8) · 3막 방패 룩(대국 시작 방열판 15) */
export const TRAIT = { blast: 8, rookPlate: 15, knightShoe: 10, bishopLens: 1.3, queenCrown: 1.3, pawnDrill: 1.3 };
/** 적 특성 (D-171 막별 두 가지 + D-275 넷 더): 막마다 대국 · 검문 · 반장에 하나씩 무작위로 더 붙는다 — 수치 하나만 바꾼다 */
export type FoeTrait = 'blastPawn' | 'rookPlate' | 'knightShoe' | 'bishopLens' | 'queenCrown' | 'pawnDrill';
export const FOE_TRAITS: Record<Exclude<FoeTrait, 'blastPawn' | 'rookPlate'>, { name: string; tell: string; line: string }> = {
  knightShoe: { name: '쇠 편자', tell: '적 나이트는 방열판 10을 두르고 섭니다.', line: `쇠 편자 — 대국 시작 방열판 ${10}` },
  bishopLens: { name: '날 선 렌즈', tell: '적 비숍의 공격이 1.3배입니다.', line: '날 선 렌즈 — 공격 ×1.3' },
  queenCrown: { name: '무거운 관', tell: '적 퀸의 HP가 1.3배입니다.', line: '무거운 관 — HP ×1.3' },
  pawnDrill: { name: '송곳 폰', tell: '적 폰의 공격이 1.3배입니다.', line: '송곳 폰 — 공격 ×1.3' },
};
/** 막마다 더 붙을 수 있는 특성 — 그 막에 나오는 기물 기준 */
export const TRAIT_POOL: FoeTrait[][] = [['knightShoe', 'bishopLens'], ['knightShoe', 'bishopLens', 'pawnDrill'], ['knightShoe', 'bishopLens', 'pawnDrill', 'queenCrown']];

/** 수직 조각 수치 */
/**
 * 판 길이 제동 (D-449, 1.1.1 테스터 기보: 18판 중 1턴 승리 7판 · 반장도 1~2턴 — 「수싸움이 아니라 한 방 연쇄로 끝난다」).
 * 한 턴에 끝없이 이어지던 행동(0태엽 카드 + 처치 환급 + 뽑기)을 턴 단위 상한으로 묶는다. 0 = 제한 없음.
 * apGainPerTurn = 한 턴에 더 얻는 태엽 합계(처치 환급 · 편자 · 도화선 · 회수 … 모든 출처)
 * drawPerTurn = 한 턴에 더 뽑는 카드 합계(턴 시작 손패는 빼고)
 * discountOnce = 태엽 할인 부품(등자 · 행진 북 · 가벼운 망토)은 턴마다 그 종류 첫 장에만
 */
// D-457: discountOnce 켬 — 실험실 짝 비교에서 녹슨 등자가 부품 중 가장 셌다(이긴 대국 +2.7)
export const PACE = { apGainPerTurn: 0, drawPerTurn: 0, discountOnce: true };

/** 공정 열기 기본값 (D-454) — SLICE.heat의 처음 값. 테스트가 열기를 껐다 켤 때 되돌리는 기준 */
export const HEAT_DEFAULT = [0.25, 0.5, 0.75, 1] as const;

/** 쇳물 서약 (D-462): 녹인 분대원 최대 HP × 이만큼 도금왕에게 */
export const MELT = { mult: 1.5 };
export const SLICE = {
  /** 이형 적이 일반 대국에 끼는 확률 — 막별 (D-481: 1막은 검문 · 반장만) */
  formBattleOdds: [0, 0.5, 0.6] as number[],
  hand: 5,
  ap: 3,
  /** 적도 태엽 3으로 움직인다 (같은 규칙) */
  enemyAp: 3,
  /** 연쇄 (D-205 — 합 + · D-454 적중): 이번 턴 연쇄 하나마다 다음 공격 피해 +이만큼, 상한 chainCap 연쇄 */
  chainAddPerKill: 4,
  /**
   * 공정 열기 (D-454 · GDD 19장): 턴마다 양쪽이 주고받는 피해 배율. [1턴, 2턴, 3턴, 4턴부터] — 1턴은 자리 잡기 위주(큰 감쇄),
   * 판이 갈수록 한 수가 치명적이 된다. 나와 적에게 같은 배율.
   */
  heat: [...HEAT_DEFAULT] as number[],
  /** 연쇄 = 이번 턴 적중 (D-454): 적을 칠 때마다 +1, 이번 턴에 이미 친 적을 다시 치면 이만큼 */
  chainRepeatHit: 2,
  chainPerKill: 0.25,
  chainCap: 4,
  /** 나사 트랙 (Pawnbarian 루트 트랙): 턴마다 한 칸씩 사라진다 */
  coins: 11, // D-454: 배치 턴만큼 한 칸 늘렸다
  coinValue: 4, // D-218: 5 → 4 — 한 판에 나사 약 1000을 벌고 550만 써서 400이 남았다
  /** 교착 압박 (D-196): 적 킹은 원래 뒤에 남지만 혼자 남았거나 이 턴부터는 내 킹에게 다가온다 — 판이 끝나지 않는 교착을 막는다 */
  kingMarchTurn: 12,
  /**
   * 난이도 구조 (D-243, 사용자 시험판 1판: 「난이도가 계속 똑같다」 — 2막 끝부터 적이 움직이기 전에 1턴에 끝났다):
   * guardByAct = 막마다 일반 · 검문 적 킹 호위 방열판(킹 최대 HP 대비) · boardByAct = 막마다 판 크기(넓을수록 첫 턴에 닿기 어렵다)
   * bossPhase2Hp · bossPhase2Guards = 반장이 처음 쓰러지면 이 HP로 다시 일어서고 호위 폰이 선다
   * desperate = 적 킹 발악: 킹 아닌 적이 이만큼 이하로 남거나 킹 HP가 절반 아래면 킹도 앞장서 치고 맞을 칸을 겁내지 않는다
   */
  guardByAct: [0, 0.2, 0.35],
  boardByAct: [[6, 6], [6, 6], [6, 7]] as [number, number][],
  bossPhase2Hp: 0.3,
  bossPhase2Guards: 1,
  /** 격노 (D-467): 다시 선 반장의 공격 배율 */
  bossPhase2Atk: 1.5,
  desperate: 1,
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
  refundCap: 1, // D-454: 2 → 1 — 처치가 턴을 끝없이 이어 가지 않게 (게임성 패치)
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
  recallMax: 2, // D-461: 3 → 2 — 적중 연쇄라 회수가 거의 늘 태엽 3이었다
  /** 방출 상한 (D-461): 한 번에 킹 방열판 최대 */
  ventCap: 24,
  /** 회피 반격 (D-229): 예고 칸에서 빠져나오며 친 수의 배율 · 뽑는 카드 */
  /** 핵심 부품 고르기 (D-231): 「한 갈래의 세부 셋」으로 나올 확률 — 나머지는 「큰 세 갈래」 */
  kitDeepChance: 0.4,
  grazeMult: 1.5,
  grazeDraw: 1,
  /** 기어 쇼크 (D-229): 예고 공격을 맞은 기물의 다음 턴 공격 배율 */
  shockMult: 0.75,
  /** 기어 쇼크 손패 (D-230): 맞은 기물이 있으면 다음 턴 손패 −이만큼 (D-457: 1 → 0 — 열기로 거의 매 턴 걸려 너무 무거웠다) */
  shockDraw: 0,
  /** 순수 회피 (D-230): 예고 칸에서 빈 칸으로 빠지기만 한 기물의 다음 공격 배율 */
  evadeMult: 1.4,
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
