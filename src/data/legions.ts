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
  battery: { name: '사선 포대', weight: { B: 4, Q: 2, P: 0.6 }, enchants: ['E02', 'E14', 'E18'], extra: 0, from: 2 },
  rampart: { name: '방벽 대열', weight: { R: 4, P: 1.2, N: 0.4, B: 0.4 }, enchants: ['E03', 'E08'], extra: 0, from: 4 },
};

/** 방벽 대열은 룩이 원래 나오기 전 층에서도 룩을 쓴다 (가중치 바닥값) */
export const RAMPART_ROOK_MIN = 6;

/** 영입 (GDD 13장 P3): 검문!·반장 대국 보상에 "쓰러뜨린 적 기물 하나 데려오기" 칸. 후보 수 */
export const RECRUIT_OPTIONS = 3;
