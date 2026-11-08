import type { Axis } from './cards';

/**
 * 부품 (수직 조각 — 규칙을 깨는 유물, D-144). Balatro 조커 · StS 유물처럼 카드와 맞물려 빌드를 "부순다".
 * 축마다 둘: 하나는 그 축 카드를 싸게/여러 번, 하나는 판을 바꾼다.
 */
export type SlicePartId = 'rookBolt' | 'bishopLens' | 'pawnPike' | 'oath' | 'horseshoe' | 'magnet' | 'assembly' | 'drum' | 'crown' | 'throne' | 'coil' | 'echo' | 'hammer' | 'spare' | 'tape'
  | 'lance' | 'spurs' | 'barracks' | 'banner' | 'scepter' | 'gilded' | 'fuse' | 'conductor' | 'anvilPlate' | 'chainShot' | 'bloodPact' | 'brittle' | 'greed' | 'whetstone'
  // 부품 확장 (D-282)
  | 'vise' | 'forkGear' | 'openGate' | 'chainReel' | 'gameRecord' | 'gateHinge' | 'queenCrown' | 'lightCloak' | 'goldRank' | 'thickWall' | 'rosary' | 'stirrup' | 'thickCast' | 'scrapMagnet' | 'firstSpring' | 'lastAxle' | 'toolbox' | 'ventHole' | 'afterheat' | 'bossBane' | 'lightMag'
  // 부품 확장 2차 (D-287)
  | 'mirror' | 'pinNeedle' | 'whistle' | 'shieldWall' | 'jumpSpring' | 'saddle' | 'royalSeal' | 'queenFan' | 'rampart' | 'recoilSpring' | 'mortar' | 'tally' | 'stainedGlass' | 'flywheel' | 'redLine' | 'coolant' | 'piggyGear' | 'loupe' | 'stopwatch' | 'calipers';

export interface SlicePartDef {
  name: string;
  axis: Axis | null;
  /** public/ui/icons16 도트 아이콘 키 (tools/pixel/icons16.py, D-182) — 부품마다 고유 */
  icon: string;
  /** 묘사 한 줄 (D-333) — 설명 문단 ①. desc는 「기능 — 조건」 */
  flavor: string;
  desc: string;
}

/** 부품 등급 (D-216): 규칙을 크게 바꾸는 것일수록 위. 표에 없으면 일반 */
export const PART_GRADE: Partial<Record<SlicePartId, 'common' | 'rare' | 'gold'>> = {
  // 측정 (D-217 2): 같은 축 카드 둘과 함께 넣은 덱 vs 그 카드만 넣은 덱. 황금 = 상위 4, 희귀 = 다음 10.
  // 설계 보정: 맹세(사용자 결정 — 폰 전용 고등급) 황금, 탐욕의 저울(나사 두 배 — 경제는 봇이 못 잰다) · 되감는 테이프(봇은 되감기를 안 쓴다) 희귀
  bloodPact: 'gold', hammer: 'gold', whetstone: 'gold', coil: 'gold',
  // 부품 확장 (D-282) — 설계 등급
  toolbox: 'rare', vise: 'rare', gameRecord: 'rare', queenCrown: 'rare', lightCloak: 'rare', lastAxle: 'rare', ventHole: 'rare', afterheat: 'gold', bossBane: 'rare', lightMag: 'rare',
  // 부품 확장 2차 (D-287)
  royalSeal: 'rare', tally: 'rare', flywheel: 'gold', redLine: 'rare', coolant: 'rare', loupe: 'rare', calipers: 'rare',
  bishopLens: 'rare', rookBolt: 'rare', crown: 'rare', lance: 'rare', anvilPlate: 'rare', spare: 'rare', drum: 'rare', assembly: 'rare', brittle: 'rare', gilded: 'rare', throne: 'rare', conductor: 'rare', greed: 'rare', tape: 'rare', oath: 'rare',
};
export const SLICE_PARTS: Record<SlicePartId, SlicePartDef> = {
  rookBolt: { name: '공성 쇠뇌', axis: 'push', icon: 'rookBolt', flavor: '성벽 위에서 쇠뇌를 당긴다.', desc: '룩의 공격 ×1.3' },
  bishopLens: { name: '외눈 렌즈', axis: 'chain', icon: 'bishopLens', flavor: '한쪽 눈으로 죄를 가려낸다.', desc: '비숍의 공격 ×1.3' },
  pawnPike: { name: '개척자의 창', axis: 'inf', icon: 'pawnPike', flavor: '작은 손에 긴 창을 쥐여 준다.', desc: '폰의 공격 +8' },
  oath: { name: '작은 개척자의 맹세', axis: 'inf', icon: 'oath', flavor: '물러서지 않겠다고 맹세했다.', desc: '폰의 공격 +4 — 폰마다 대국당 한 번 버틴다' },
  horseshoe: { name: '피 묻은 편자', axis: 'cav', icon: 'horseshoe', flavor: '짓밟은 자의 피가 아직 마르지 않았다.', desc: '태엽 +1 — 나이트가 적을 처치할 때마다' },
  magnet: { name: '약탈자의 집게', axis: 'cav', icon: 'magnet', flavor: '쓰러진 자의 주머니를 턴다.', desc: '카드 1장 뽑기 — 적을 처치할 때마다' },
  assembly: { name: '끝없는 생산선', axis: 'inf', icon: 'assembly', flavor: '비어 가는 줄을 쉬지 않고 채운다.', desc: '킹 곁에 폰 하나 — 턴 시작에 폰이 2기 이하면' },
  drum: { name: '진군의 북', axis: 'inf', icon: 'drum', flavor: '북소리에 맞춰 발을 맞춘다.', desc: '폰 카드 태엽 −1' },
  crown: { name: '짓누르는 왕관', axis: 'king', icon: 'crown', flavor: '무게가 곧 힘이다.', desc: '킹의 공격 ×2' },
  throne: { name: '걷는 옥좌', axis: 'king', icon: 'throne', flavor: '왕이 걸으면 옥좌도 따라 걷는다.', desc: '킹 방열판 +4 — 킹 카드를 쓸 때마다' },
  coil: { name: '폭주 코일', axis: 'chain', icon: 'coil', flavor: '멈출 줄 모르고 감겨 오른다.', desc: '연쇄 피해가 곱으로 — 처치마다 ×1.5 · 최대 ×16' },
  echo: { name: '메아리 톱니', axis: 'chain', icon: 'echo', flavor: '쓰러지는 소리가 두 번 울린다.', desc: '처치하면 연쇄 +2 — 보통은 처치 한 번에 연쇄 +1' },
  hammer: { name: '공성 망치', axis: 'push', icon: 'hammer', flavor: '부딪히는 소리가 곧 피해다.', desc: '충돌 피해 ×2 — 밀린 적이 막혀 부딪칠 때' },
  // ---- 볼륨 (R5-5, D-172) · 양날(대가가 붙은 강한 것)은 desc에 대가 ----
  lance: { name: '기사의 창', axis: 'cav', icon: 'lance', flavor: '달려온 무게를 창끝에 싣는다.', desc: '나이트의 공격 ×1.5' },
  spurs: { name: '녹슨 등자', axis: 'cav', icon: 'spurs', flavor: '녹슬어도 박차는 박차다.', desc: '나이트 카드 태엽 −1' },
  barracks: { name: '막사의 종', axis: 'inf', icon: 'barracks', flavor: '종이 울리면 막사가 빈다.', desc: '킹 곁에 폰 하나 — 대국 시작에' },
  banner: { name: '찢긴 군기', axis: 'inf', icon: 'banner', flavor: '찢겨도 깃발은 앞을 가리킨다.', desc: '폰의 공격 ×1.5' },
  scepter: { name: '녹슨 홀', axis: 'king', icon: 'scepter', flavor: '녹슬었어도 왕의 홀이다.', desc: '킹 방열판 +40 — 대국 시작에' },
  gilded: { name: '도금 방패', axis: 'king', icon: 'gilded', flavor: '맞을수록 금칠이 번쩍인다.', desc: '태엽 +1 — 킹이 맞으면 · 턴에 한 번' },
  fuse: { name: '도화선', axis: 'chain', icon: 'fuse', flavor: '불이 붙으면 끝까지 탄다.', desc: '카드 +1 · 태엽 +1 — 연쇄 3 이상 · 턴에 한 번' },
  conductor: { name: '전도 코일', axis: 'chain', icon: 'conductor', flavor: '열기가 줄을 타고 번진다.', desc: '처치당 연쇄 피해 +10 — 기본은 +4' },
  anvilPlate: { name: '모루 장갑', axis: 'push', icon: 'anvilPlate', flavor: '모루처럼 단단한 판을 댄다.', desc: '충돌 피해 +10 — 밀린 적이 막혀 부딪칠 때' },
  chainShot: { name: '연쇄 사슬', axis: 'push', icon: 'chainShot', flavor: '부딪힌 자가 다음을 부른다.', desc: '연쇄 +2 — 밀어 부딪쳐 처치하면' },
  bloodPact: { name: '피의 계약', axis: null, icon: 'bloodPact', flavor: '피로 쓴 계약은 지워지지 않는다.', desc: '모든 공격 ×1.3 — 대가: 턴 끝마다 킹 HP −4' },
  brittle: { name: '깨지는 유리 심장', axis: null, icon: 'brittle', flavor: '빨리 뛰는 만큼 쉽게 깨진다.', desc: '태엽 +1 — 대가: 분대 최대 HP −20%' },
  greed: { name: '탐욕의 저울', axis: null, icon: 'greed', flavor: '쥘수록 무겁고, 무거울수록 세다.', desc: '나사 150마다 공격 +2 — 대가: 고물상 값 +25%' },
  spare: { name: '과부하 태엽', axis: null, icon: 'spare', flavor: '감을 수 있는 데까지 감는다.', desc: '태엽 +1 — 대가: 손패 −1' },
  tape: { name: '되감는 테이프', axis: null, icon: 'tape', flavor: '한 수 전으로 돌아간다.', desc: '되감기 1회 — 대국마다 · 역회전 톱니를 쓰지 않는다' },
  // 합(+) 기본기 (D-205): 모든 공격 +3 — 약한 기물일수록 크게 느껴지고, 뒤로 갈수록 묻힌다
  whetstone: { name: '닳은 숫돌', axis: null, icon: 'whetstone', flavor: '닳도록 갈았다.', desc: '모든 공격 +3' },
  // ---- 부품 확장 (D-282, 대과제 3-3): 수읽기 축 받침 · 퀸 · 기물별 · 공용 — 전용 도트 아이콘 (D-287) ----
  vise: { name: '죔쇠', axis: 'tactic', icon: 'vise', flavor: '묶인 자는 피할 곳이 없다.', desc: '피해 ×1.5 — 묶인 적을 칠 때' },
  forkGear: { name: '갈래 톱니', axis: 'tactic', icon: 'forkGear', flavor: '갈래가 많을수록 잘 돈다.', desc: '태엽 +1 — 두 적을 노리는 카드로 둘 이상 칠 때' },
  openGate: { name: '열린 문', axis: 'tactic', icon: 'openGate', flavor: '비켜선 자리로 빛이 든다.', desc: '다음 공격 배율 +0.5 — 성문 열기 · 비켜서기류 카드' },
  chainReel: { name: '쇠사슬 감개', axis: 'tactic', icon: 'chainReel', flavor: '감을수록 사슬이 갑옷이 된다.', desc: '그 기물 방열판 +8 — 적을 묶을 때마다' },
  gameRecord: { name: '낡은 기보', axis: 'tactic', icon: 'gameRecord', flavor: '옛 기보에 답이 있다.', desc: '카드 1장 뽑기 — 수읽기 카드를 내면 · 턴에 한 번' },
  gateHinge: { name: '성문 경첩', axis: 'tactic', icon: 'gateHinge', flavor: '문짝이 가볍게 돌아간다.', desc: '캐슬링 방열판 두 배 · 태엽 0 — 킹과 룩이 자리를 바꾸는 카드' },
  queenCrown: { name: '여왕의 관', axis: 'king', icon: 'queenCrown', flavor: '관을 쓴 자는 고개를 숙이지 않는다.', desc: '퀸의 공격 ×1.4' },
  lightCloak: { name: '가벼운 망토', axis: 'king', icon: 'lightCloak', flavor: '가벼워진 만큼 빨리 움직인다.', desc: '퀸 카드 태엽 −1' },
  goldRank: { name: '금박 끝 줄', axis: 'inf', icon: 'goldRank', flavor: '끝 줄에 닿은 자에게 금박을.', desc: '카드 2장 · 태엽 +1 — 폰이 끝 줄에 닿아 승격하면' },
  thickWall: { name: '두꺼운 성벽', axis: 'push', icon: 'thickWall', flavor: '성벽은 두꺼울수록 좋다.', desc: '룩 방열판 +15 — 대국 시작에' },
  rosary: { name: '사제의 묵주', axis: 'chain', icon: 'rosary', flavor: '쓰러진 자를 위해 한 알을 넘긴다.', desc: '카드 1장 뽑기 — 비숍이 적을 처치하면' },
  stirrup: { name: '기수의 등자', axis: 'cav', icon: 'stirrup', flavor: '등자에 발을 걸고 출발한다.', desc: '나이트 방열판 +10 — 대국 시작에' },
  thickCast: { name: '두꺼운 주물', axis: 'inf', icon: 'thickCast', flavor: '쇳물을 아끼지 않고 부었다.', desc: '폰의 최대 HP +25%' },
  scrapMagnet: { name: '고철 자석', axis: null, icon: 'scrapMagnet', flavor: '흩어진 쇳조각을 끌어모은다.', desc: '넘친 피해 5마다 나사 +1 — 기본은 10마다' },
  firstSpring: { name: '선제 태엽', axis: null, icon: 'firstSpring', flavor: '먼저 감은 태엽이 먼저 돈다.', desc: '태엽 +2 — 대국 첫 턴' },
  lastAxle: { name: '버팀 축', axis: 'king', icon: 'lastAxle', flavor: '무너지기 직전에 가장 세게 버틴다.', desc: '킹의 공격 ×1.6 — 킹 HP 30% 아래면' },
  toolbox: { name: '땜질 도구함', axis: null, icon: 'toolbox', flavor: '가장 깊이 패인 둘부터 땜질한다.', desc: '다친 기물 둘 HP +6 — 턴 시작에 · 킹은 빼고' },
  ventHole: { name: '바람 구멍', axis: null, icon: 'ventHole', flavor: '숨을 고르고 되받아친다.', desc: '그 공격 피해 ×1.8 — 적이 노린 칸에서 빠져나와 칠 때 (기본 ×1.5)' },
  afterheat: { name: '잔열', axis: 'chain', icon: 'afterheat', flavor: '불은 꺼져도 쇠는 식지 않는다.', desc: '연쇄 절반 유지 — 턴이 끝나도' },
  bossBane: { name: '반장 사냥꾼', axis: null, icon: 'bossBane', flavor: '반장의 냄새를 안다.', desc: '모든 공격 ×1.2 — 반장 판에서' },
  lightMag: { name: '가벼운 탄창', axis: null, icon: 'lightMag', flavor: '가벼운 탄창은 빨리 갈린다.', desc: '손패 +1 — 덱이 12장 이하면' },
  // ---- 부품 확장 2차 (D-287): 축마다 둘 · 공용 일곱 — 아이콘은 전용 도트 (icons16_v2/batch_E~H) ----
  mirror: { name: '쌍거울', axis: 'tactic', icon: 'mirror', flavor: '한 수가 둘로 비친다.', desc: '두 적 노리기 배율 +0.5 — 둘 이상 칠 때 세지는 카드' },
  pinNeedle: { name: '고정 바늘', axis: 'tactic', icon: 'pinNeedle', flavor: '꽂힌 바늘이 태엽을 감는다.', desc: '태엽 +1 — 적을 묶으면 · 턴에 한 번' },
  whistle: { name: '행군 호루라기', axis: 'inf', icon: 'whistle', flavor: '호루라기가 울린다.', desc: '태엽 +1 — 폰이 적을 처치하면 · 턴에 한 번' },
  shieldWall: { name: '방패벽', axis: 'inf', icon: 'shieldWall', flavor: '작은 방패를 이어 붙인다.', desc: '폰 방열판 +6 — 대국 시작에' },
  jumpSpring: { name: '도약 용수철', axis: 'cav', icon: 'jumpSpring', flavor: '한 번 더 높이 뛴다.', desc: '나이트의 공격 +6' },
  saddle: { name: '철 안장', axis: 'cav', icon: 'saddle', flavor: '쇠 안장 위에서 버틴다.', desc: '그 나이트 방열판 +6 — 나이트가 적을 처치하면' },
  royalSeal: { name: '옥새', axis: 'king', icon: 'royalSeal', flavor: '왕이 찍은 도장은 명령이 된다.', desc: '카드 2장 뽑기 — 킹이 적을 처치하면' },
  queenFan: { name: '여왕의 부채', axis: 'king', icon: 'queenFan', flavor: '부채를 펴면 바람이 돈다.', desc: '태엽 +1 — 퀸이 적을 처치하면 · 턴에 한 번' },
  rampart: { name: '성가퀴', axis: 'push', icon: 'rampart', flavor: '쓰러뜨린 자리에 돌을 쌓는다.', desc: '그 룩 방열판 +8 — 룩이 적을 처치하면' },
  recoilSpring: { name: '반동 용수철', axis: 'push', icon: 'recoilSpring', flavor: '부딪친 힘이 되돌아온다.', desc: '태엽 +1 — 밀어 부딪쳐 처치하면 · 턴에 한 번' },
  mortar: { name: '회반죽', axis: 'push', icon: 'mortar', flavor: '틈마다 회반죽을 채운다.', desc: '룩의 최대 HP +25%' },
  tally: { name: '셈 막대', axis: 'chain', icon: 'tally', flavor: '넷을 세면 손이 바빠진다.', desc: '카드 2장 뽑기 — 연쇄가 4에 닿으면 · 턴에 한 번' },
  stainedGlass: { name: '색유리', axis: 'chain', icon: 'stainedGlass', flavor: '빛이 색을 입고 날카로워진다.', desc: '비숍의 공격 +6' },
  flywheel: { name: '무거운 플라이휠', axis: null, icon: 'flywheel', flavor: '무거운 바퀴는 쉽게 서지 않는다.', desc: '남은 태엽을 넘긴다 — 다음 턴으로 · 최대 2' },
  redLine: { name: '붉은 눈금', axis: null, icon: 'redLine', flavor: '바늘이 붉은 칸을 넘었다.', desc: '모든 공격 +6 — 대가: 대국마다 킹 HP −15%' },
  coolant: { name: '냉각수 통', axis: null, icon: 'coolant', flavor: '찬물을 붓는다.', desc: '기어 쇼크 면역 — 예고 공격을 맞아도 공격이 약해지지 않는다' },
  piggyGear: { name: '저금 톱니', axis: null, icon: 'piggyGear', flavor: '이길 때마다 한 닢씩 모은다.', desc: '나사 +12 — 대국을 이기면' },
  loupe: { name: '확대경', axis: null, icon: 'loupe', flavor: '한 장 더 들여다본다.', desc: '카드 보상 선택지 +1' },
  stopwatch: { name: '초시계', axis: null, icon: 'stopwatch', flavor: '먼저 누른 자가 먼저 움직인다.', desc: '대국 첫 손패 +1장' },
  calipers: { name: '측량 컴퍼스', axis: null, icon: 'calipers', flavor: '왕까지의 거리를 잰다.', desc: '피해 +4 — 적 킹을 칠 수 있는 공격' },
};

/** 부품 수치 — D-298 밸런스 패치: 초시계 2→1 · 측량 컴퍼스 10→4 · 땜질 도구함 4→3 · 피의 계약 ×1.4→×1.3 · 탐욕의 저울 나사 100마다 +3 → 150마다 +2 · 도화선 연쇄 2→3 · 걷는 옥좌 10→4 */
export const PART_NUM = { mirror: 0.5, whistle: 1, shieldWall: 6, jumpSpring: 6, saddle: 6, royalSeal: 2, queenFan: 1, rampart: 8, mortar: 1.25, tallyAt: 4, tallyDraw: 2, stainedGlass: 6, flywheel: 2, redLine: 6, redLineCost: 0.15, piggy: 12, stopwatch: 1, calipers: 4, vise: 1.5, forkGearAp: 1, openGate: 0.5, chainReel: 8, queenCrown: 1.4, thickWall: 15, stirrup: 10, thickCast: 1.25, scrapPer: 5, firstSpring: 2, lastAxleAt: 0.3, lastAxle: 1.6, toolbox: 6, toolboxN: 2, ventGraze: 1.8, bossBane: 1.2, lightMagAt: 12, rookBoltMult: 1.3, lensMult: 1.3, pikeAdd: 8, oathAdd: 4, lanceMult: 1.5, bannerMult: 1.5, scepterShield: 40, conductorPerKill: 0.35, conductorAdd: 10, anvilPlate: 10, bloodMult: 1.3, bloodCost: 4, brittleHp: 0.8, greedPer: 150, greedAdd: 2, greedShop: 1.25, chainShotGain: 2, fuseAt: 3, hammerMult: 2, coilPerKill: 1.5, coilCap: 16, crownMult: 2, throneShield: 4, assemblyBelow: 2, whetAdd: 3 };

/**
 * 그 기물이 분대에 있어야 쓸모 있는 부품 (페르소나 테스트 m10: 나이트 없는 분대에 「피 묻은 편자」가 나왔다).
 * 폰 부품은 폰을 만들어 내는 부품(생산선 · 막사)이 있으면 괜찮다.
 */
export const PART_NEEDS: Partial<Record<SlicePartId, 'N' | 'P' | 'R' | 'B' | 'Q'>> = { whistle: 'P', shieldWall: 'P', jumpSpring: 'N', saddle: 'N', queenFan: 'Q', rampart: 'R', mortar: 'R', stainedGlass: 'B', queenCrown: 'Q', lightCloak: 'Q', thickWall: 'R', rosary: 'B', stirrup: 'N', thickCast: 'P', goldRank: 'P', gateHinge: 'R', rookBolt: 'R', bishopLens: 'B', pawnPike: 'P', oath: 'P', horseshoe: 'N', lance: 'N', spurs: 'N', drum: 'P', banner: 'P' };

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
export const PART_OP: Partial<Record<SlicePartId, '+' | '×'>> = { mirror: '×', jumpSpring: '+', stainedGlass: '+', redLine: '+', calipers: '+', vise: '×', openGate: '×', queenCrown: '×', lastAxle: '×', toolbox: '+', ventHole: '×', bossBane: '×', rookBolt: '×', bishopLens: '×', pawnPike: '+', conductor: '+', anvilPlate: '+', coil: '×', lance: '×', banner: '×', crown: '×', hammer: '×', bloodPact: '×', echo: '+', whetstone: '+' };

/**
 * 부적 (D-228, 사용자: "1패는 즉시 사망, 희귀한 1회 부활 아이템을 풀에 · 저승급은 기본으로 · 슬롯을 차지하지 않는 부적 · 되감기도 아이템화").
 * 부품 칸을 차지하지 않고 출하 내내 개수로 쌓인다. 쓰면 하나 깨진다.
 *   revive: 여벌 심장 톱니 — 킹이 쓰러져도 출하가 끝나지 않고 그 대국을 처음부터 (하나 깨진다)
 *   rewind: 역회전 톱니 — 되감기 1회 (이번 턴 처음으로)
 */
export type CharmId = 'revive' | 'rewind';
export const CHARMS: Record<CharmId, { name: string; icon: string; desc: string }> = {
  revive: { name: '여벌 심장 톱니', icon: 'life', desc: '킹 대신 깨진다. (그 대국을 처음부터)' },
  rewind: { name: '역회전 톱니', icon: 'rewind', desc: '이번 턴을 처음으로 되감는다. (되감기 1회)' },
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
