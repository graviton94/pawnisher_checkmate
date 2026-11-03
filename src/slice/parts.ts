import type { Axis } from './cards';

/**
 * 부품 (수직 조각 — 규칙을 깨는 유물, D-144). Balatro 조커 · StS 유물처럼 카드와 맞물려 빌드를 "부순다".
 * 축마다 둘: 하나는 그 축 카드를 싸게/여러 번, 하나는 판을 바꾼다.
 */
export type SlicePartId = 'horseshoe' | 'magnet' | 'assembly' | 'drum' | 'crown' | 'throne' | 'coil' | 'echo' | 'hammer' | 'spare' | 'tape'
  | 'lance' | 'spurs' | 'barracks' | 'banner' | 'scepter' | 'gilded' | 'fuse' | 'conductor' | 'anvilPlate' | 'chainShot' | 'bloodPact' | 'brittle' | 'greed' | 'whetstone';

export interface SlicePartDef {
  name: string;
  axis: Axis | null;
  /** public/ui/icons16 도트 아이콘 키 (tools/pixel/icons16.py, D-182) — 부품마다 고유 */
  icon: string;
  desc: string;
}

export const SLICE_PARTS: Record<SlicePartId, SlicePartDef> = {
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
  scepter: { name: '녹슨 홀', axis: 'king', icon: 'scepter', desc: '대국 시작에 킹 방열판 +25' },
  gilded: { name: '도금 방패', axis: 'king', icon: 'gilded', desc: '킹이 맞을 때마다 태엽 +1 (턴에 한 번)' },
  fuse: { name: '도화선', axis: 'chain', icon: 'fuse', desc: '연쇄 3 이상이면 손패 +1' },
  conductor: { name: '전도 코일', axis: 'chain', icon: 'conductor', desc: '연쇄 피해가 처치마다 +4 → +7 (합)' },
  anvilPlate: { name: '모루 장갑', axis: 'push', icon: 'anvilPlate', desc: '충돌 피해 +10' },
  chainShot: { name: '연쇄 사슬', axis: 'push', icon: 'chainShot', desc: '충돌로 쓰러뜨리면 연쇄 +1' },
  bloodPact: { name: '피의 계약', axis: null, icon: 'bloodPact', desc: '모든 공격 ×1.4. 대가: 턴 끝마다 킹 HP −4' },
  brittle: { name: '깨지는 유리 심장', axis: null, icon: 'brittle', desc: '태엽 +1. 대가: 분대 최대 HP −20%' },
  greed: { name: '탐욕의 저울', axis: null, icon: 'greed', desc: '이기면 나사 ×2. 대가: 적 HP +20%' },
  spare: { name: '과부하 태엽', axis: null, icon: 'spare', desc: '태엽 +1, 손패 −1' },
  tape: { name: '되감는 테이프', axis: null, icon: 'tape', desc: '되감기 2회' },
  // 합(+) 기본기 (D-205): 모든 공격 +3 — 약한 기물일수록 크게 느껴지고, 뒤로 갈수록 묻힌다
  whetstone: { name: '닳은 숫돌', axis: null, icon: 'anvilPlate', desc: '모든 공격 +3 (합)' },
};

/** 부품 수치 */
export const PART_NUM = { lanceMult: 1.5, bannerMult: 1.5, scepterShield: 25, conductorPerKill: 0.35, conductorAdd: 7, anvilPlate: 10, bloodMult: 1.4, bloodCost: 4, brittleHp: 0.8, greedGold: 2, greedHp: 1.2, fuseAt: 3, hammerMult: 2, coilPerKill: 1.5, coilCap: 16, crownMult: 2, throneShield: 10, assemblyBelow: 2, whetAdd: 3 };

/**
 * 그 기물이 분대에 있어야 쓸모 있는 부품 (페르소나 테스트 m10: 나이트 없는 분대에 「피 묻은 편자」가 나왔다).
 * 폰 부품은 폰을 만들어 내는 부품(생산선 · 막사)이 있으면 괜찮다.
 */
export const PART_NEEDS: Partial<Record<SlicePartId, 'N' | 'P'>> = { horseshoe: 'N', lance: 'N', spurs: 'N', drum: 'P', banner: 'P' };

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
export const PART_OP: Partial<Record<SlicePartId, '+' | '×'>> = { conductor: '+', anvilPlate: '+', coil: '×', lance: '×', banner: '×', crown: '×', hammer: '×', bloodPact: '×', echo: '+', whetstone: '+' };
