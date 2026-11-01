import type { Axis } from './cards';

/**
 * 부품 (수직 조각 — 규칙을 깨는 유물, D-144). Balatro 조커 · StS 유물처럼 카드와 맞물려 빌드를 "부순다".
 * 축마다 둘: 하나는 그 축 카드를 싸게/여러 번, 하나는 판을 바꾼다.
 */
export type SlicePartId = 'horseshoe' | 'magnet' | 'assembly' | 'drum' | 'crown' | 'throne' | 'coil' | 'spare' | 'tape';

export interface SlicePartDef {
  name: string;
  axis: Axis | null;
  /** public/ui/icons 아이콘 */
  icon: string;
  desc: string;
}

export const SLICE_PARTS: Record<SlicePartId, SlicePartDef> = {
  horseshoe: { name: '편자', axis: 'cav', icon: 'horseshoe', desc: '나이트가 처치하면 태엽 +1.' },
  magnet: { name: '자석 손', axis: 'cav', icon: 'claw', desc: '처치할 때마다 카드 한 장.' },
  assembly: { name: '조립 라인', axis: 'inf', icon: 'crate', desc: '내 턴 시작에 폰이 둘 이하면 킹 옆에 폰 하나.' },
  drum: { name: '행진 북', axis: 'inf', icon: 'bell', desc: '폰 카드 태엽 −1.' },
  crown: { name: '무거운 왕관', axis: 'king', icon: 'crown', desc: '킹의 공격 ×2.' },
  throne: { name: '이동식 옥좌', axis: 'king', icon: 'anvil', desc: '킹 카드를 내면 킹 방열판 +10.' },
  coil: { name: '증폭 코일', axis: 'chain', icon: 'chain', desc: '연쇄가 처치마다 +50%. 상한 없음.' },
  spare: { name: '여분 태엽', axis: null, icon: 'windkey', desc: '태엽 +1. 대신 손패 −1.' },
  tape: { name: '이중 테이프', axis: null, icon: 'watch', desc: '되감기 두 번.' },
};

/** 부품 수치 */
export const PART_NUM = { coilPerKill: 0.5, crownMult: 2, throneShield: 10, assemblyBelow: 2 };
