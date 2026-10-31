import type { PieceType, Side } from '../engine/types';

/**
 * 말하는 기물 · 기계 (D-134, docs/story.md · world.md D-133): 기물 몸 + 큰 눈 + 소품 하나.
 * 지금은 기물 도트 위에 코드로 눈 · 소품을 얹은 임시 초상화 (src/ui/portrait.ts). 사용자 그림이 오면 같은 id로 바꿔 끼운다.
 */
export type NpcId = 'scale' | 'rustRook' | 'monoBishop' | 'tinkerPawn' | 'coinKnight' | 'apprentice' | 'blackBishop' | 'ninth';
/** 눈 연기: 그대로 · 옆을 봄 · 가늘게 · 크게 · 졸림 · 흘김 */
export type Mood = 'calm' | 'look' | 'narrow' | 'wide' | 'sleepy' | 'glare';
export type Prop = 'rust' | 'tag' | 'monocle' | 'wrench' | 'coin' | 'hammer' | 'stamp' | 'paperCrown';

export interface NpcDef {
  name: string;
  /** 몸: 기물 도트 (진영 · 크기 배율) — 검수 저울은 코드로 그린다 */
  body: { piece: PieceType; side: Side; scale?: number } | 'scale';
  props: Prop[];
  /** 기본 눈 연기 */
  mood: Mood;
}

export const NPCS: Record<NpcId, NpcDef> = {
  scale: { name: '검수 저울', body: 'scale', props: [], mood: 'narrow' },
  rustRook: { name: '녹슨 룩', body: { piece: 'R', side: 0 }, props: ['rust', 'tag'], mood: 'narrow' },
  monoBishop: { name: '외눈 비숍', body: { piece: 'B', side: 0 }, props: ['monocle'], mood: 'look' },
  tinkerPawn: { name: '떠돌이 정비 폰', body: { piece: 'P', side: 0 }, props: ['wrench'], mood: 'calm' },
  coinKnight: { name: '동전 나이트', body: { piece: 'N', side: 1 }, props: ['monocle', 'coin'], mood: 'glare' },
  apprentice: { name: '견습 폰', body: { piece: 'P', side: 0, scale: 0.8 }, props: ['hammer'], mood: 'wide' },
  blackBishop: { name: '다른 공장의 흑 비숍', body: { piece: 'B', side: 1 }, props: ['stamp'], mood: 'narrow' },
  ninth: { name: '아홉째 폰', body: { piece: 'P', side: 0 }, props: ['paperCrown'], mood: 'calm' },
};

/** 기물 유형별 눈 자리 (64칸 격자: 왼눈 x, 오른눈 x, y, 반지름) — 몸 밖으로 조금 튀어나오는 큰 눈 */
export const EYES: Record<PieceType, { lx: number; rx: number; y: number; r: number }> = {
  P: { lx: 25, rx: 39, y: 22, r: 6 },
  N: { lx: 27, rx: 40, y: 17, r: 6 },
  B: { lx: 25, rx: 39, y: 27, r: 6 },
  R: { lx: 24, rx: 40, y: 26, r: 6 },
  Q: { lx: 24, rx: 40, y: 26, r: 6 },
  K: { lx: 24, rx: 40, y: 28, r: 6 },
};
