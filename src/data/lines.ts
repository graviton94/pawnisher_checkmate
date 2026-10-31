import type { Deck } from '../engine/setup';
import type { PieceType } from '../engine/types';
import type { LegendId } from './legends';

/**
 * 라인 (D-125, 제안서 P1 2.8 가벼운 판): 시작 세트마다 공장 라인 하나 — 라인 특성 하나 + 그 라인 기물·에픽이 더 잘 나온다.
 * StS 클래스의 축소판. 전용 카드 풀은 명령 손패 개발 때.
 */
export type LineId = 'assault' | 'ray' | 'mass';

export const LINES: Record<LineId, { name: string; trait: string; types: PieceType[]; epics: LegendId[] }> = {
  assault: { name: '돌격 라인', trait: '대국 첫 턴 태엽 +2', types: ['N'], epics: ['L01', 'L04'] },
  ray: { name: '사선 라인', trait: '비숍 · 룩 · 퀸 공격 피해 +10%', types: ['B', 'R', 'Q'], epics: ['L02', 'L03'] },
  mass: { name: '물량 라인', trait: '폰 최대 HP +20%', types: ['P'], epics: ['L09', 'L06'] },
};

export const LINE_FX = { assaultAp: 2, rayMult: 1.1, massHp: 1.2, enchantWeight: 1.5, epicWeight: 3 };

/** 시작 세트의 라인: 나이트가 있으면 돌격, 비숍·룩·퀸이면 사선, 폰뿐이면 물량 */
export const lineOf = (deck: Deck): LineId => (deck.includes('N') ? 'assault' : deck.some((t) => t === 'B' || t === 'R' || t === 'Q') ? 'ray' : 'mass');
