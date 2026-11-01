import type { PieceType } from '../engine/types';

/**
 * 각인 (규격 2.0, GDD 14장 §3.2 — Pawnbarian 토큰식): 기물 하나에 한 칸, 여섯 종뿐.
 * 1.0의 유형 개량 · 이형 거푸집 · 도면 · 기물 강화 개조를 대신한다.
 */
export type CarveId = 'haste' | 'cross' | 'diag' | 'plate' | 'pierce' | 'forged';

export interface CarveDef {
  name: string;
  /** 판 위 표식 글자 (기물 머리 위) */
  mark: string;
  desc: string;
  /** 고물상 · 공방 값 */
  price: number;
}

export const CARVES: Record<CarveId, CarveDef> = {
  haste: { name: '태엽 각인', mark: '⚡', desc: '이 기물의 이동 태엽 −1.', price: 45 },
  cross: { name: '십자 튐 각인', mark: '✚', desc: '착지해 친 피해의 50%가 착지 칸 상하좌우 적에게 튄다.', price: 50 },
  diag: { name: '대각 튐 각인', mark: '✖', desc: '착지해 친 피해의 50%가 착지 칸 대각선 네 칸 적에게 튄다.', price: 50 },
  plate: { name: '철갑 각인', mark: '◆', desc: '받는 피해 −30%.', price: 45 },
  pierce: { name: '관통 각인', mark: '➤', desc: '공격이 첫 적을 지나 한 기 더 맞힌다 (비숍 · 룩 · 퀸).', price: 50 },
  forged: { name: '단조 각인', mark: '★', desc: '공격 +30% · 최대 HP +30%.', price: 55 },
};

export const CARVE_IDS = Object.keys(CARVES) as CarveId[];

/** 수치 */
export const CARVE_FX = { haste: 1, splash: 0.5, plateCut: 0.7, pierce: 1, forgedAtk: 1.3, forgedHp: 1.3 };

/** 관통 각인이 의미 있는 유형 */
export const PIERCE_TYPES: PieceType[] = ['B', 'R', 'Q'];
