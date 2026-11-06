import type { Axis } from './cards';

/**
 * 부품 (수직 조각 — 규칙을 깨는 유물, D-144). Balatro 조커 · StS 유물처럼 카드와 맞물려 빌드를 "부순다".
 * 축마다 둘: 하나는 그 축 카드를 싸게/여러 번, 하나는 판을 바꾼다.
 */
export type SlicePartId = 'rookBolt' | 'bishopLens' | 'pawnPike' | 'oath' | 'horseshoe' | 'magnet' | 'assembly' | 'drum' | 'crown' | 'throne' | 'coil' | 'echo' | 'hammer' | 'spare' | 'tape'
  | 'lance' | 'spurs' | 'barracks' | 'banner' | 'scepter' | 'gilded' | 'fuse' | 'conductor' | 'anvilPlate' | 'chainShot' | 'bloodPact' | 'brittle' | 'greed' | 'whetstone'
  // 부품 확장 (D-282)
  | 'vise' | 'forkGear' | 'openGate' | 'chainReel' | 'gameRecord' | 'gateHinge' | 'queenCrown' | 'lightCloak' | 'goldRank' | 'thickWall' | 'rosary' | 'stirrup' | 'thickCast' | 'scrapMagnet' | 'firstSpring' | 'lastAxle' | 'toolbox' | 'ventHole' | 'afterheat' | 'bossBane' | 'lightMag';

export interface SlicePartDef {
  name: string;
  axis: Axis | null;
  /** public/ui/icons16 도트 아이콘 키 (tools/pixel/icons16.py, D-182) — 부품마다 고유 */
  icon: string;
  desc: string;
}

/** 부품 등급 (D-216): 규칙을 크게 바꾸는 것일수록 위. 표에 없으면 일반 */
export const PART_GRADE: Partial<Record<SlicePartId, 'common' | 'rare' | 'gold'>> = {
  // 측정 (D-217 2): 같은 축 카드 둘과 함께 넣은 덱 vs 그 카드만 넣은 덱. 황금 = 상위 4, 희귀 = 다음 10.
  // 설계 보정: 맹세(사용자 결정 — 폰 전용 고등급) 황금, 탐욕의 저울(나사 두 배 — 경제는 봇이 못 잰다) · 되감는 테이프(봇은 되감기를 안 쓴다) 희귀
  bloodPact: 'gold', hammer: 'gold', whetstone: 'gold', coil: 'gold',
  // 부품 확장 (D-282) — 설계 등급
  vise: 'rare', gameRecord: 'rare', queenCrown: 'rare', lightCloak: 'rare', lastAxle: 'rare', ventHole: 'rare', afterheat: 'gold', bossBane: 'rare', lightMag: 'rare',
  bishopLens: 'rare', rookBolt: 'rare', crown: 'rare', lance: 'rare', anvilPlate: 'rare', spare: 'rare', drum: 'rare', assembly: 'rare', brittle: 'rare', gilded: 'rare', throne: 'rare', conductor: 'rare', greed: 'rare', tape: 'rare', oath: 'rare',
};
export const SLICE_PARTS: Record<SlicePartId, SlicePartDef> = {
  rookBolt: { name: '공성 쇠뇌', axis: 'push', icon: 'rookBolt', desc: '룩의 공격 ×1.3.' },
  bishopLens: { name: '외눈 렌즈', axis: 'chain', icon: 'bishopLens', desc: '비숍의 공격 ×1.3.' },
  pawnPike: { name: '개척자의 창', axis: 'inf', icon: 'pawnPike', desc: '폰의 공격 +8.' },
  oath: { name: '작은 개척자의 맹세', axis: 'inf', icon: 'oath', desc: '폰의 공격 +4. (폰마다 대국마다 문턱 한 번)' },
  horseshoe: { name: '피 묻은 편자', axis: 'cav', icon: 'horseshoe', desc: '나이트가 처치하면 태엽 +1' },
  magnet: { name: '약탈자의 집게', axis: 'cav', icon: 'magnet', desc: '처치할 때마다 카드 +1' },
  assembly: { name: '끝없는 생산선', axis: 'inf', icon: 'assembly', desc: '턴 시작에 폰이 2기 이하면 킹 곁에 폰 +1' },
  drum: { name: '진군의 북', axis: 'inf', icon: 'drum', desc: '폰 카드 태엽 −1' },
  crown: { name: '짓누르는 왕관', axis: 'king', icon: 'crown', desc: '킹의 공격 ×2' },
  throne: { name: '걷는 옥좌', axis: 'king', icon: 'throne', desc: '킹 카드를 쓰면 킹 방열판 +10' },
  coil: { name: '폭주 코일', axis: 'chain', icon: 'coil', desc: '연쇄가 곱으로 — 처치마다 ×1.5 (최대 ×16)' },
  echo: { name: '메아리 톱니', axis: 'chain', icon: 'echo', desc: '처치 1회가 연쇄 2칸' },
  hammer: { name: '공성 망치', axis: 'push', icon: 'hammer', desc: '충돌 피해 ×2' },
  // ---- 볼륨 (R5-5, D-172) · 양날(대가가 붙은 강한 것)은 desc에 대가 ----
  lance: { name: '기사의 창', axis: 'cav', icon: 'lance', desc: '나이트의 공격 ×1.5' },
  spurs: { name: '녹슨 등자', axis: 'cav', icon: 'spurs', desc: '나이트 카드 태엽 −1' },
  barracks: { name: '막사의 종', axis: 'inf', icon: 'barracks', desc: '대국 시작에 킹 곁에 폰 +1' },
  banner: { name: '찢긴 군기', axis: 'inf', icon: 'banner', desc: '폰의 공격 ×1.5' },
  scepter: { name: '녹슨 홀', axis: 'king', icon: 'scepter', desc: '대국 시작에 킹 방열판 +40' },
  gilded: { name: '도금 방패', axis: 'king', icon: 'gilded', desc: '킹이 맞을 때마다 태엽 +1 (턴에 한 번)' },
  fuse: { name: '도화선', axis: 'chain', icon: 'fuse', desc: '연쇄 2 이상이면 카드 +1 · 태엽 +1 (턴에 한 번)' },
  conductor: { name: '전도 코일', axis: 'chain', icon: 'conductor', desc: '연쇄 피해가 처치마다 +4 → +10' },
  anvilPlate: { name: '모루 장갑', axis: 'push', icon: 'anvilPlate', desc: '충돌 피해 +10' },
  chainShot: { name: '연쇄 사슬', axis: 'push', icon: 'chainShot', desc: '충돌로 쓰러뜨리면 연쇄 +2' },
  bloodPact: { name: '피의 계약', axis: null, icon: 'bloodPact', desc: '모든 공격 ×1.4. 대가: 턴 끝마다 킹 HP −4' },
  brittle: { name: '깨지는 유리 심장', axis: null, icon: 'brittle', desc: '태엽 +1. 대가: 분대 최대 HP −20%' },
  greed: { name: '탐욕의 저울', axis: null, icon: 'greed', desc: '쥔 나사 100마다 모든 공격 +3. 대가: 고물상 값 +25%' },
  spare: { name: '과부하 태엽', axis: null, icon: 'spare', desc: '태엽 +1, 손패 −1' },
  tape: { name: '되감는 테이프', axis: null, icon: 'tape', desc: '대국마다 되감기 1회 (역회전 톱니를 쓰지 않는다)' },
  // 합(+) 기본기 (D-205): 모든 공격 +3 — 약한 기물일수록 크게 느껴지고, 뒤로 갈수록 묻힌다
  whetstone: { name: '닳은 숫돌', axis: null, icon: 'anvilPlate', desc: '모든 공격 +3' },
  // ---- 부품 확장 (D-282, 대과제 3-3): 수읽기 축 받침 · 퀸 · 기물별 · 공용 — 아이콘은 비슷한 것을 빌린다(전용 도트 대기) ----
  vise: { name: '죔쇠', axis: 'tactic', icon: 'magnet', desc: '묶인(핀) 적을 치면 공격 ×1.5.' },
  forkGear: { name: '갈래 톱니', axis: 'tactic', icon: 'echo', desc: '포크 배율이 붙으면 태엽 +1.' },
  openGate: { name: '열린 문', axis: 'tactic', icon: 'spare', desc: '디스커버드 배율 +0.5.' },
  chainReel: { name: '쇠사슬 감개', axis: 'tactic', icon: 'chainShot', desc: '핀을 걸 때마다 그 기물 방열판 +8.' },
  gameRecord: { name: '낡은 기보', axis: 'tactic', icon: 'tape', desc: '수읽기 카드를 내면 카드 +1. (턴에 한 번)' },
  gateHinge: { name: '성문 경첩', axis: 'tactic', icon: 'scepter', desc: '캐슬링 방열판 두 배 · 캐슬링 태엽 0.' },
  queenCrown: { name: '여왕의 관', axis: 'king', icon: 'crown', desc: '퀸의 공격 ×1.4.' },
  lightCloak: { name: '가벼운 망토', axis: 'king', icon: 'gilded', desc: '퀸 카드 태엽 −1.' },
  goldRank: { name: '금박 끝 줄', axis: 'inf', icon: 'banner', desc: '폰이 승격하면 카드 +2 · 태엽 +1.' },
  thickWall: { name: '두꺼운 성벽', axis: 'push', icon: 'anvilPlate', desc: '룩은 방열판 15를 두르고 대국을 시작한다.' },
  rosary: { name: '사제의 묵주', axis: 'chain', icon: 'bishopLens', desc: '비숍이 처치하면 카드 +1.' },
  stirrup: { name: '기수의 등자', axis: 'cav', icon: 'spurs', desc: '나이트는 방열판 10을 두르고 대국을 시작한다.' },
  thickCast: { name: '두꺼운 주물', axis: 'inf', icon: 'oath', desc: '폰의 최대 HP +25%.' },
  scrapMagnet: { name: '고철 자석', axis: null, icon: 'greed', desc: '넘친 피해 5마다 나사 1개. (기본 10마다)' },
  firstSpring: { name: '선제 태엽', axis: null, icon: 'conductor', desc: '대국 첫 턴 태엽 +2.' },
  lastAxle: { name: '버팀 축', axis: 'king', icon: 'throne', desc: '킹 HP 30% 아래면 킹의 공격 ×1.6.' },
  toolbox: { name: '땜질 도구함', axis: null, icon: 'anvilPlate', desc: '턴 시작에 가장 다친 내 기물 HP +4.' },
  ventHole: { name: '바람 구멍', axis: null, icon: 'fuse', desc: '회피 반격 배율 ×1.5 → ×1.8.' },
  afterheat: { name: '잔열', axis: 'chain', icon: 'coil', desc: '턴이 끝나도 연쇄 절반이 남는다.' },
  bossBane: { name: '반장 사냥꾼', axis: null, icon: 'hammer', desc: '반장 판에서 모든 공격 ×1.2.' },
  lightMag: { name: '가벼운 탄창', axis: null, icon: 'drum', desc: '덱이 12장 이하면 손패 +1.' },
};

/** 부품 수치 */
export const PART_NUM = { vise: 1.5, forkGearAp: 1, openGate: 0.5, chainReel: 8, queenCrown: 1.4, thickWall: 15, stirrup: 10, thickCast: 1.25, scrapPer: 5, firstSpring: 2, lastAxleAt: 0.3, lastAxle: 1.6, toolbox: 4, ventGraze: 1.8, bossBane: 1.2, lightMagAt: 12, rookBoltMult: 1.3, lensMult: 1.3, pikeAdd: 8, oathAdd: 4, lanceMult: 1.5, bannerMult: 1.5, scepterShield: 40, conductorPerKill: 0.35, conductorAdd: 10, anvilPlate: 10, bloodMult: 1.4, bloodCost: 4, brittleHp: 0.8, greedPer: 100, greedAdd: 3, greedShop: 1.25, chainShotGain: 2, fuseAt: 2, hammerMult: 2, coilPerKill: 1.5, coilCap: 16, crownMult: 2, throneShield: 10, assemblyBelow: 2, whetAdd: 3 };

/**
 * 그 기물이 분대에 있어야 쓸모 있는 부품 (페르소나 테스트 m10: 나이트 없는 분대에 「피 묻은 편자」가 나왔다).
 * 폰 부품은 폰을 만들어 내는 부품(생산선 · 막사)이 있으면 괜찮다.
 */
export const PART_NEEDS: Partial<Record<SlicePartId, 'N' | 'P' | 'R' | 'B' | 'Q'>> = { queenCrown: 'Q', lightCloak: 'Q', thickWall: 'R', rosary: 'B', stirrup: 'N', thickCast: 'P', goldRank: 'P', gateHinge: 'R', rookBolt: 'R', bishopLens: 'B', pawnPike: 'P', oath: 'P', horseshoe: 'N', lance: 'N', spurs: 'N', drum: 'P', banner: 'P' };

/** 지금 분대 · 부품으로 이 부품이 쓸모 있는가 */
export const partFits = (id: SlicePartId, squadTypes: string[], owned: SlicePartId[]): boolean => {
  const need = PART_NEEDS[id];
  if (!need || squadTypes.includes(need)) return true;
  return need === 'P' && (owned.includes('assembly') || owned.includes('barracks'));
};

/**
 * 합(+) · 곱(×) 표지 (D-205, 사용자: "+, × 연산을 정본 시스템으로"): 최종 피해 = (공격 + 합) × 곱.
 * 합은 지금 세고(작은 수에 크게 붙는다), 곱은 나중에 세다(큰 수에 곱해진다 — 층별 성장 D-203이 지수로 커지는 HP를 받친다).
 */
export const PART_OP: Partial<Record<SlicePartId, '+' | '×'>> = { vise: '×', openGate: '×', queenCrown: '×', lastAxle: '×', toolbox: '+', ventHole: '×', bossBane: '×', rookBolt: '×', bishopLens: '×', pawnPike: '+', conductor: '+', anvilPlate: '+', coil: '×', lance: '×', banner: '×', crown: '×', hammer: '×', bloodPact: '×', echo: '+', whetstone: '+' };

/**
 * 부적 (D-228, 사용자: "1패는 즉시 사망, 희귀한 1회 부활 아이템을 풀에 · 저승급은 기본으로 · 슬롯을 차지하지 않는 부적 · 되감기도 아이템화").
 * 부품 칸을 차지하지 않고 출하 내내 개수로 쌓인다. 쓰면 하나 깨진다.
 *   revive: 여벌 심장 톱니 — 킹이 쓰러져도 출하가 끝나지 않고 그 대국을 처음부터 (하나 깨진다)
 *   rewind: 역회전 톱니 — 되감기 1회 (이번 턴 처음으로)
 */
export type CharmId = 'revive' | 'rewind';
export const CHARMS: Record<CharmId, { name: string; icon: string; desc: string }> = {
  revive: { name: '여벌 심장 톱니', icon: 'life', desc: '킹 대신 깨진다. (그 대국을 처음부터)' },
  rewind: { name: '역회전 톱니', icon: 'tape', desc: '이번 턴을 처음으로 되감는다. (되감기 1회)' },
};
export const CHARM_NUM = {
  /** 출하 시작: 되감기 2 · 승급 0~1은 여벌 심장 1 */
  startRewind: 2,
  startReviveUpTo: 1,
  /** 부품 상자에서 부적이 나올 확률 (여벌 심장은 드물게) */
  chestRewind: 0.3,
  chestRevive: 0.08,
  /** 반장을 쓰러뜨리면 역회전 톱니 +1 */
  bossRewind: 1,
  /** 고물상: 카드처럼 진열대 한 칸에 가끔 (역회전 25% · 여벌 심장 10%) */
  shopRewindPrice: 45,
  shopRevivePrice: 140,
  shopRewindChance: 0.25,
  shopReviveChance: 0.1,
};
