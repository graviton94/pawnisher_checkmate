import type { PieceType } from '../engine/types';

/**
 * 대사 초상 (D-506 · 받은 PT-04~07, `tools/pixel/portrait_import.py` → `public/ui/portraits/<이름>.png` 64×64).
 * 초상 홈은 그림 비율 그대로 cover로 자른다(D-386) — `at` = 자를 때 남길 초점(object-position).
 */
export interface Portrait { file: string; at: string }
const p = (file: string, at = '50% 30%'): Portrait => ({ file, at });

/** 종이왕 표정 (PT-04): 담담 · 결의(앞으로 기울임) · 두려움(왕관이 눈을 덮음) · 고통(금이 번짐) · 금빛 유혹(타락의 예고) */
export type PaperMood = 'calm' | 'resolve' | 'fear' | 'pain' | 'gilt';
export const PAPER_FACE: Record<PaperMood, Portrait> = {
  calm: p('paperking-calm', '50% 35%'), resolve: p('paperking-resolve', '45% 35%'), fear: p('paperking-fear', '45% 35%'),
  pain: p('paperking-pain', '50% 35%'), gilt: p('paperking-gilt', '55% 35%'),
};

/** 보통 대국 적 킹 (PT-05): 공정(막)마다 — 1 매끈한 홈 · 2 쇳물 자국 · 3 쇠사슬. 검문 적 킹은 렌즈 + 불량 X (PT-06) */
export const FOE_KING_FACE: Record<1 | 2 | 3, Portrait> = { 1: p('king-a1'), 2: p('king-a2', '55% 30%'), 3: p('king-a3', '55% 40%') };
export const CHECK_KING_FACE: Portrait = p('king-check', '30% 40%');

/** 적 기물 (PT-06 · PT-07): 바탕 기물만 — 이형(form)은 판 위 그림을 그대로 쓴다(초상과 모양이 어긋나지 않게) */
export const FOE_PIECE_FACE: Partial<Record<PieceType, Portrait>> = {
  P: p('foe-P', '45% 30%'), N: p('foe-N', '35% 30%'), B: p('foe-B'), R: p('foe-R'), Q: p('foe-Q'),
};

/** 말 없는 사건의 망설임 독백 (#16) — 그 장면에 맞는 종이왕 표정. 없으면 담담 */
export const EVENT_PONDER_MOOD: Record<string, PaperMood> = {
  nightShift: 'resolve', dipping: 'fear', safe: 'fear', castMold: 'pain', crownAltar: 'gilt',
  sleepingKing: 'resolve', echoWell: 'pain', mirrorHall: 'gilt',
};

/** 초상 img 태그 (없으면 대체 그림 `fb`로 바뀐다) */
export const portraitImg = (f: Portrait, fb = '', cls = ''): string =>
  `<img${cls ? ` class="${cls}"` : ''} src="ui/portraits/${f.file}.png" alt="" style="object-position:${f.at}"${fb ? ` onerror="this.outerHTML=this.dataset.fb" data-fb='${fb.replace(/'/g, '&#39;')}'` : ''}>`;
