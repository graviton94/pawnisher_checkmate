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
  spur: { name: '기병 박차', grade: 'common', desc: '처치한 기사가 숨을 고른다. (나이트 처치 시 태엽 +1, 턴당 1회)', lore: '편자에 가시.' },
  lens: { name: '사선 렌즈', grade: 'common', desc: '사선 끝까지 겨눈다. (비숍 공격 ×1.25)', lore: '닦으면 멀리 보인다.' },
  rivet: { name: '성벽 리벳', grade: 'common', desc: '성벽을 두르고 나선다. (룩 시작 방열판 +20)', lore: '박을수록 단단하다.' },
  drum: { name: '행진 북', grade: 'common', desc: '북소리에 맞춰 진격한다. (폰 공격 ×1.3)', lore: '박자를 맞추면 세진다.' },
  helmet: { name: '킹 철모', grade: 'common', desc: '왕관 아래를 지킨다. (킹 받는 피해 −25%)', lore: '종이 왕관 아래에.' },
  firstCog: { name: '선봉 톱니', grade: 'common', desc: '선봉이 먼저 벤다. (매 턴 첫 명령 공격 ×1.3)', lore: '먼저 도는 이가 세다.' },
  lastHammer: { name: '마무리 망치', grade: 'common', desc: '마지막 일격을 내리친다. (세 번째 명령부터 공격 ×1.3)', lore: '끝에 내리친다.' },
  magnet: { name: '나사 자석', grade: 'common', desc: '흩어진 나사를 끌어모은다. (대국 나사 ×1.2)', lore: '바닥의 나사가 따라온다.' },
  fakeTag: { name: '위조 가격표', grade: 'common', desc: '값을 속인다. (고물상 값 −15%)', lore: '녹슨 룩은 눈이 나쁘다.' },
  blade: { name: '처형 날', grade: 'common', desc: '금 간 곳을 끝장낸다. (HP 절반 이하인 적에게 피해 ×1.3)', lore: '금 간 곳을 노린다.' },

  capacitor: { name: '축전기', grade: 'rare', desc: '남은 힘을 모아 둔다. (매 턴 태엽 +1)', lore: '남은 전기를 모아 둔다.' },
  command: { name: '연쇄 지휘', grade: 'rare', desc: '승세를 이어 간다. (직전 명령이 처치했으면 공격 ×1.4)', lore: '한 번 터지면 이어 간다.' },
  bolt: { name: '번개 편자', grade: 'rare', desc: '도약 후 사방에 여진을 일으킨다. (나이트 공격 시 상하좌우 50%)', lore: '착지할 때 불꽃.' },
  guard: { name: '근위 결속', grade: 'rare', desc: '왕의 곁을 굳게 지킨다. (킹과 붙은 아군 받는 피해 −25%)', lore: '곁에 서면 버틴다.' },
  blood: { name: '기름 보급', grade: 'rare', desc: '쓰러뜨린 적의 기름을 마신다. (처치 시 최대 HP 25% 회복)', lore: '쓰러뜨린 쪽의 기름을 먹는다.' },
  counterCog: { name: '반격 톱니', grade: 'rare', desc: '물리면 되문다. (맞고 살아남으면 받은 피해 30% 반격)', lore: '물리면 문다.' },
  fuse: { name: '비상 퓨즈', grade: 'rare', desc: '한 번은 쓰러지지 않는다. (대국마다 첫 아군 1기 HP 1로 버팀, 킹 제외)', lore: '한 번은 탄다.' },
  hunter: { name: '킹 사냥꾼', grade: 'rare', desc: '왕관만을 노린다. (킹에게 주는 피해 ×1.3)', lore: '왕관만 본다.' },
  plate: { name: '겹 장갑', grade: 'rare', desc: '한 겹씩 덧댄다. (자기 턴 시작마다 모든 아군 방열판 +4)', lore: '한 겹씩 덧댄다.' },
  promo: { name: '견습 증서', grade: 'rare', desc: '첫 승리가 모습을 바꾼다. (폰 처치 시 나이트로 승격)', lore: '한 번 이기면 모양이 바뀐다.' },

  prism: { name: '프리즘 코어', grade: 'unique', desc: '빛이 끝까지 꿰뚫는다. (비숍 사선 관통)', lore: '빛은 멈추지 않는다.' },
  rail: { name: '레일 캐논', grade: 'unique', desc: '첫 적을 꿰뚫는다. (룩 공격 ×1.2 · 관통 1기)', lore: '곧은 것이 멀리 간다.' },
  tread: { name: '무한 궤도', grade: 'unique', desc: '멈추지 않고 짓밟는다. (나이트 처치 시 그 턴 한 번 더 이동)', lore: '바퀴는 쉬지 않는다.' },
  queenMold: { name: '여왕 거푸집', grade: 'unique', desc: '퀸이 퀸을 부른다. (퀸 처치 시 태엽 +1, 턴당 2회)', lore: '퀸이 퀸을 부른다.' },
  tyrant: { name: '폭군 왕관', grade: 'unique', desc: '왕이 직접 피를 묻힌다. (킹 공격 ×2 · 킹 처치 시 아군 전체 방열판 +15)', lore: '종이가 아니다.' },
  phalanx: { name: '양산 명령서', grade: 'unique', desc: '대열이 함께 찌른다. (폰 공격 시 그 적에 붙은 아군 폰도 50%로 공격)', lore: '하나는 아무것도 아니다. 그래서 여럿이다.' },

  domino: { name: '도미노 공장', grade: 'epic', desc: '쓰러진 자가 이웃을 덮친다. (처치 시 상하좌우 적에게 최대 HP의 30%)', lore: '하나가 넘어지면.' },
  solo: { name: '단독 출하', grade: 'epic', desc: '적은 수로, 세게 친다. (군단 5기 이하 시작 시 주는 피해 ×1.5 · 받는 피해 −20%)', lore: '적게, 세게.' },
  mint: { name: '조폐 프레스', grade: 'epic', desc: '나사를 찍어 낸다. (나사 ×1.6 · 고물상 값 −25%)', lore: '찍으면 나온다.' },
  mobilize: { name: '총동원령', grade: 'epic', desc: '전군을 내몬다. (매 턴 태엽 +2 · 킹 최대 HP −30%)', lore: '모두 나간다. 킹은 비어 있다.' },
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
