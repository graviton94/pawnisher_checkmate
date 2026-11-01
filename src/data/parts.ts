import type { Grade } from './grades';

/**
 * 부품 (규격 2.0, GDD 14장 §3.2 — 유물): 진영당 다섯 칸, 규칙을 비트는 패시브.
 * 1.0의 개조 45 · 에픽 10 · 공명 · 계약 6 · 라인 3에서 규칙을 바꾸는 것만 골라 옮겼다 (수치만 올리던 것은 각인 ★으로 합쳤다).
 */
export type PartId =
  // 커먼
  | 'spur' | 'lens' | 'rivet' | 'drum' | 'helmet' | 'firstCog' | 'lastHammer' | 'magnet' | 'fakeTag' | 'blade'
  // 레어
  | 'capacitor' | 'command' | 'bolt' | 'guard' | 'blood' | 'counterCog' | 'fuse' | 'hunter' | 'plate' | 'promo'
  // 유니크
  | 'prism' | 'rail' | 'tread' | 'queenMold' | 'tyrant' | 'phalanx'
  // 에픽
  | 'domino' | 'solo' | 'mint' | 'mobilize';

export interface PartDef {
  name: string;
  grade: Grade;
  desc: string;
  /** 짧은 성격 (도감 · 고르기 화면 꼬리) */
  lore: string;
}

export const PARTS: Record<PartId, PartDef> = {
  spur: { name: '기병 박차', grade: 'common', desc: '나이트가 처치하면 그 턴 태엽 +1 (턴당 한 번).', lore: '편자에 가시.' },
  lens: { name: '사선 렌즈', grade: 'common', desc: '비숍 공격 +25%.', lore: '닦으면 멀리 보인다.' },
  rivet: { name: '성벽 리벳', grade: 'common', desc: '룩은 방열판 20을 두르고 시작한다.', lore: '박을수록 단단하다.' },
  drum: { name: '행진 북', grade: 'common', desc: '폰 공격 +30%.', lore: '박자를 맞추면 세진다.' },
  helmet: { name: '킹 철모', grade: 'common', desc: '킹이 받는 피해 −25%.', lore: '종이 왕관 아래에.' },
  firstCog: { name: '선봉 톱니', grade: 'common', desc: '매 턴 첫 명령의 공격 +30%.', lore: '먼저 도는 이가 세다.' },
  lastHammer: { name: '마무리 망치', grade: 'common', desc: '세 번째 명령부터 공격 +30%.', lore: '끝에 내리친다.' },
  magnet: { name: '나사 자석', grade: 'common', desc: '대국 나사 +20%.', lore: '바닥의 나사가 따라온다.' },
  fakeTag: { name: '위조 가격표', grade: 'common', desc: '고물상 값 −15%.', lore: '녹슨 룩은 눈이 나쁘다.' },
  blade: { name: '처형 날', grade: 'common', desc: 'HP가 절반 이하인 적에게 피해 +30%.', lore: '금 간 곳을 노린다.' },

  capacitor: { name: '축전기', grade: 'rare', desc: '매 턴 태엽 +1.', lore: '남은 전기를 모아 둔다.' },
  command: { name: '연쇄 지휘', grade: 'rare', desc: '바로 앞 명령이 처치했으면 이번 공격 +40%.', lore: '한 번 터지면 이어 간다.' },
  bolt: { name: '번개 편자', grade: 'rare', desc: '나이트의 공격이 맞은 적의 상하좌우로 50% 튄다.', lore: '착지할 때 불꽃.' },
  guard: { name: '근위 결속', grade: 'rare', desc: '킹과 붙어 있는 아군은 받는 피해 −25%.', lore: '곁에 서면 버틴다.' },
  blood: { name: '기름 보급', grade: 'rare', desc: '처치한 기물은 최대 HP의 25%를 되찾는다.', lore: '쓰러뜨린 쪽의 기름을 먹는다.' },
  counterCog: { name: '반격 톱니', grade: 'rare', desc: '맞고 살아남으면 받은 피해의 30%를 되돌린다.', lore: '물리면 문다.' },
  fuse: { name: '비상 퓨즈', grade: 'rare', desc: '대국마다 처음 쓰러지는 아군 한 기는 HP 1로 버틴다 (킹 제외).', lore: '한 번은 탄다.' },
  hunter: { name: '킹 사냥꾼', grade: 'rare', desc: '킹에게 주는 피해 +30%.', lore: '왕관만 본다.' },
  plate: { name: '겹 장갑', grade: 'rare', desc: '자기 턴이 시작될 때마다 모든 아군에 방열판 4.', lore: '한 겹씩 덧댄다.' },
  promo: { name: '견습 증서', grade: 'rare', desc: '폰이 처치하면 나이트가 된다.', lore: '한 번 이기면 모양이 바뀐다.' },

  prism: { name: '프리즘 코어', grade: 'unique', desc: '비숍의 사선이 끝까지 꿰뚫는다.', lore: '빛은 멈추지 않는다.' },
  rail: { name: '레일 캐논', grade: 'unique', desc: '룩 공격 +20% · 첫 적을 지나 한 기 더.', lore: '곧은 것이 멀리 간다.' },
  tread: { name: '무한 궤도', grade: 'unique', desc: '나이트가 처치하면 그 턴에 한 번 더 움직일 수 있다.', lore: '바퀴는 쉬지 않는다.' },
  queenMold: { name: '여왕 거푸집', grade: 'unique', desc: '퀸이 처치할 때마다 태엽 +1 (턴당 두 번).', lore: '퀸이 퀸을 부른다.' },
  tyrant: { name: '폭군 왕관', grade: 'unique', desc: '킹 공격 ×2. 킹이 처치하면 아군 전체 방열판 15.', lore: '종이가 아니다.' },
  phalanx: { name: '양산 명령서', grade: 'unique', desc: '폰이 치면 그 적에 붙어 있는 다른 아군 폰도 50%로 함께 친다.', lore: '하나는 아무것도 아니다 — 그래서 여럿이다.' },

  domino: { name: '도미노 공장', grade: 'epic', desc: '적이 쓰러지면 그 상하좌우 적에게 쓰러진 적 최대 HP의 30%.', lore: '하나가 넘어지면.' },
  solo: { name: '단독 출하', grade: 'epic', desc: '군단 5기 이하로 시작하면 주는 피해 +50% · 받는 피해 −20%.', lore: '적게, 세게.' },
  mint: { name: '조폐 프레스', grade: 'epic', desc: '나사 ×1.6 · 고물상 값 −25%.', lore: '찍으면 나온다.' },
  mobilize: { name: '총동원령', grade: 'epic', desc: '매 턴 태엽 +2. 대신 킹 최대 HP −30%.', lore: '모두 나간다. 킹은 비어 있다.' },
};

export const PART_IDS = Object.keys(PARTS) as PartId[];
/** 부품 칸 */
export const PART_SLOTS = 5;

/** 부품 수치 (근거: 1.0 개조 · 에픽 수치를 옮김) */
export const PART_FX = {
  lens: 1.25,
  rivetShield: 20,
  drum: 1.3,
  helmetCut: 0.75,
  firstCog: 1.3,
  lastHammer: 1.3,
  lastFrom: 2,
  magnetGold: 1.2,
  fakeTag: 0.85,
  bladeAt: 0.5,
  blade: 1.3,
  command: 1.4,
  bolt: 0.5,
  guardCut: 0.75,
  blood: 0.25,
  counter: 0.3,
  hunter: 1.3,
  plateShield: 4,
  rail: 1.2,
  queenApCap: 2,
  tyrantAtk: 2,
  tyrantShield: 15,
  phalanx: 0.5,
  domino: 0.3,
  soloMax: 5,
  soloDeal: 1.5,
  soloTake: 0.8,
  mintGold: 1.6,
  mintShop: 0.75,
  mobilizeAp: 2,
  mobilizeKingHp: 0.7,
};
