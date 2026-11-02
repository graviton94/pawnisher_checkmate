import type { Axis } from './cards';

/**
 * 부품 (수직 조각 — 규칙을 깨는 유물, D-144). Balatro 조커 · StS 유물처럼 카드와 맞물려 빌드를 "부순다".
 * 축마다 둘: 하나는 그 축 카드를 싸게/여러 번, 하나는 판을 바꾼다.
 */
export type SlicePartId = 'horseshoe' | 'magnet' | 'assembly' | 'drum' | 'crown' | 'throne' | 'coil' | 'echo' | 'hammer' | 'spare' | 'tape';

export interface SlicePartDef {
  name: string;
  axis: Axis | null;
  /** public/ui/icons 아이콘 */
  icon: string;
  desc: string;
}

export const SLICE_PARTS: Record<SlicePartId, SlicePartDef> = {
  horseshoe: { name: '피 묻은 편자', axis: 'cav', icon: 'horseshoe', desc: '나이트가 처치하면 태엽 +1' },
  magnet: { name: '약탈자의 집게', axis: 'cav', icon: 'claw', desc: '처치할 때마다 카드 +1' },
  assembly: { name: '끝없는 생산선', axis: 'inf', icon: 'crate', desc: '턴 시작에 폰이 2기 이하면 킹 곁에 폰 +1' },
  drum: { name: '진군의 북', axis: 'inf', icon: 'bell', desc: '폰 카드 태엽 −1' },
  crown: { name: '짓누르는 왕관', axis: 'king', icon: 'crown', desc: '킹의 공격 ×2' },
  throne: { name: '걷는 옥좌', axis: 'king', icon: 'anvil', desc: '킹 카드를 쓰면 킹 방열판 +10' },
  coil: { name: '폭주 코일', axis: 'chain', icon: 'chain', desc: '연쇄 배율이 곱해진다 (처치마다 ×1.5, 상한 없음)' },
  echo: { name: '메아리 톱니', axis: 'chain', icon: 'swap', desc: '처치 1회가 연쇄 2칸' },
  hammer: { name: '공성 망치', axis: 'push', icon: 'wrench', desc: '충돌 피해 ×2' },
  spare: { name: '과부하 태엽', axis: null, icon: 'windkey', desc: '태엽 +1, 손패 −1' },
  tape: { name: '되감는 테이프', axis: null, icon: 'watch', desc: '되감기 2회' },
};

/** 부품 수치 */
export const PART_NUM = { hammerMult: 2, coilPerKill: 1.5, crownMult: 2, throneShield: 10, assemblyBelow: 2 };
