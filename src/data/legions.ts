/**
 * 적의 성격 (GDD 13장 P4 · 11장 A4, D-096): 검문! 정예의 접사 + 일반 군단의 원형 + 영입.
 * 이름은 docs/world.md 이름 규칙 (공장 부품 말). 수치는 🔧 — 밸런스는 3단계가 끝난 뒤 한 번에 (D-080).
 */
import type { EnchantId } from './enchants';
import type { PieceType } from '../engine/types';

export type AffixId = 'lastRivet' | 'recoil' | 'plate' | 'oiled' | 'mold' | 'guardBolt';

export interface AffixDef {
  name: string;
  /** public/ui/icons 이름 */
  icon: string;
  color: string;
  desc: string;
}

/** 정예 접사: 적 기물 한 기에 붙는 한 장짜리 개조. 판 위에 아이콘이 늘 보이고, 길게 누르면 설명 */
export const AFFIXES: Record<AffixId, AffixDef> = {
  lastRivet: { name: '최후의 리벳', icon: 'shield', color: '#E2E8F0', desc: '다른 적 기물이 남아 있는 동안 HP 1에서 버틴다.' },
  recoil: { name: '반동 스프링', icon: 'wave', color: '#FCA5A5', desc: '쓰러뜨린 기물이 이 기물 ATK의 50%를 되받는다.' },
  plate: { name: '덧댄 철판', icon: 'bricks', color: '#CBD5E1', desc: '자기 턴 시작마다 방열판 +10.' },
  oiled: { name: '기름칠한 관절', icon: 'oil', color: '#FDE68A', desc: '이동 태엽 −1.' },
  mold: { name: '같은 틀', icon: 'chain', color: '#C4B5FD', desc: '붙어 있던 아군이 쓰러지면 ATK +30% (그 대국 내내).' },
  guardBolt: { name: '근위 볼트', icon: 'crown', color: '#FACC15', desc: '자기 킹과 붙어 있으면 받는 피해 −30%.' },
};
export const ELITE_AFFIXES: AffixId[] = ['lastRivet', 'recoil', 'plate', 'oiled', 'mold', 'guardBolt'];

/**
 * 반장 약점 (D-113): 반장마다 하나. 지도에서 공정 시작부터 보이고, 준비하면 승률이 확 달라진다.
 * on = 약점이 붙는 기물 (유형 목록 · 'variant' 이형 단 기물 · 'affix' 접사 단 기물).
 */
export type WeakId = 'brittle' | 'blunt' | 'glass' | 'square' | 'weld' | 'paper';
export interface WeakDef {
  name: string;
  desc: string;
  on: PieceType[] | 'variant' | 'affix';
}
export const WEAKS: Record<WeakId, WeakDef> = {
  brittle: { name: '얇은 양산 철판', on: ['P'], desc: '관통 · 부가 피해(방전 · 연쇄 · 폭발 · 충격)를 두 배로 받는다.' },
  blunt: { name: '무딘 편자', on: ['N'], desc: '방열판이 남은 기물을 치면 피해가 40%만 들어간다.' },
  glass: { name: '깨지는 렌즈', on: ['B'], desc: '바로 옆 칸에서 맞으면 피해 두 배.' },
  square: { name: '네모난 차체', on: ['R'], desc: '사선(대각선 방향)에서 맞으면 피해 두 배.' },
  weld: { name: '급조 용접', on: 'variant', desc: '그 턴에 앞서 쓰러진 적 하나마다 받는 피해 +40%.' },
  paper: { name: '서류 대조', on: 'affix', desc: '한 턴에 두 번째로 맞는 순간부터 피해 두 배.' },
};
export const WEAK = { brittleMult: 2, bluntMult: 0.4, glassMult: 2, squareMult: 2, weldPerKill: 0.4, paperMult: 2 };

export const AFFIX = {
  recoilRatio: 0.5,
  plateShield: 10,
  moldAtk: 1.3,
  guardCut: 0.7,
} as const;

/** 정예 접사 수: Act 1·2는 1기, Act 3은 2기 */
export const affixCount = (act: number): number => (act >= 3 ? 2 : 1);

export type ArchetypeId = 'horde' | 'cavalry' | 'battery' | 'rampart';

export interface ArchetypeDef {
  name: string;
  /** 기물 뽑기 가중치 배율 */
  weight: Partial<Record<PieceType, number>>;
  /** 이 원형이 먼저 고르는 개조 */
  enchants: EnchantId[];
  /** 군단 기물 수 가감 */
  extra: number;
  /** 이 층부터 나온다 */
  from: number;
}

/** 일반·정예 군단의 원형: 판마다 다른 문제 (군단 이름이 대국 시작에 뜬다) */
export const ARCHETYPES: Record<ArchetypeId, ArchetypeDef> = {
  horde: { name: '폰 행렬', weight: { P: 3, N: 0.5, B: 0.5 }, enchants: ['E04', 'E12'], extra: 1, from: 1 },
  cavalry: { name: '기병 기습대', weight: { N: 4, P: 0.6 }, enchants: ['E01', 'E13', 'E17'], extra: 0, from: 2 },
  battery: { name: '사선 포대', weight: { B: 4, Q: 1, P: 0.6 }, enchants: ['E02', 'E14', 'E18'], extra: 0, from: 2 },
  rampart: { name: '방벽 대열', weight: { R: 4, P: 1.2, N: 0.4, B: 0.4 }, enchants: ['E03', 'E08'], extra: 0, from: 4 },
};

/** 원형의 기물 가감(폰 행렬 +1)은 이 층 다음부터 — 1~3층 작은 판에 적 1기 추가는 1층 승률을 99% → 74%로 떨어뜨렸다 (D-099) */
export const ARCHETYPE_EXTRA_FROM = 3;

/** 방벽 대열은 룩이 원래 나오기 전 층에서도 룩을 쓴다 (가중치 바닥값) */
export const RAMPART_ROOK_MIN = 6;

/** 영입 (GDD 13장 P3): 검문!·반장 대국 보상에 "쓰러뜨린 적 기물 하나 데려오기" 칸. 후보 수 */
export const RECRUIT_OPTIONS = 3;

/**
 * 억까·억빠 (D-099, 사용자: 너무 쉬워도 안 되고 억까·억빠도 가끔 나와야 할 맛) — 시드로 정해지고, 대국 시작에 보인다.
 * 과적(억까): 군단 1기 더 + 개량 +1 · 불량 군단(억빠): 적 일반 기물이 HP 60%로 시작 · 나사 자루(억빠): 대국 나사 ×3.
 */
export type LuckId = 'overload' | 'defective';
export const LUCK = {
  /** Act별 확률 (4층부터, 반장 제외) 🔧 */
  overload: [0.05, 0.07, 0.09],
  defective: [0.06, 0.06, 0.06],
  defectiveHp: 0.6,
  /** 대국 나사 보상이 세 배가 될 확률 */
  jackpot: 0.04,
  jackpotMult: 3,
} as const;
