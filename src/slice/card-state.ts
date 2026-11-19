import type { Pos } from '../engine';
import { PIECE_NAMES_KO } from '../data/pieces';
import { COND_TEXT } from '../data/hud';
import { cardCond, cardMoves, cardPieces, partCond, type CondWhy, type SliceBattle } from './battle';
import { COMMANDS } from './cards';

/**
 * 손패 · 판 조건 표시 (D-592 — docs/reports/2026-11-18-card-trigger-types.md 4장): 화면은 판정을 다시 짜지 않고 엔진 `cardCond` · `partCond`를 부른다(원칙 9).
 *  - 손패: 상태(포크 · 처치 기물) · 비례(연쇄 · 분노) 카드가 판 어디서든 맞으면 lit — 황동 테 + 램프 + 까닭 한 줄. 대가(연쇄 소모)는 램프 없이 줄만.
 *  - 판: 카드 · 기물을 고른 뒤 조건이 맞는 갈 칸(포크 · 죔쇠 · 측량 컴퍼스 · 갈래 톱니) — 황동 모서리 + 램프.
 *  - 기물 발치: 처치 기물 태엽 0 카드를 쥐었을 때 그 기물 · 마지막 숨 · 마지막 축이 켜진 기물.
 * 사건형 명령 카드(처치당 · 충돌 시)는 램프가 없다 — 판의 금색 처치 · 충돌 미리보기가 이미 보인다.
 */
export interface CardState { lit: boolean; why: CondWhy; line: string }

/** 손패 i번 카드의 표시 상태 (조건이 안 맞으면 null) */
export const cardState = (b: SliceBattle, i: number): CardState | null => {
  const c = cardCond(b, i);
  if (!c.on || !c.why) return null;
  const def = COMMANDS[b.hand[i]];
  const line = c.why === 'fork' ? COND_TEXT.fork(c.n ?? 1)
    : c.why === 'killer' ? COND_TEXT.killer(def.who === 'any' ? '' : PIECE_NAMES_KO[def.who])
      : c.why === 'chain' ? COND_TEXT.chain(c.n ?? 0, Math.round((c.mult ?? 1) * 10) / 10)
        : c.why === 'rage' ? COND_TEXT.rage(c.mult ?? 1)
          : COND_TEXT.spend(c.n ?? 0);
  return { lit: c.why !== 'spend', why: c.why, line };
};

/** 판 위 조건 칸: 고른 카드 i · 기물로 to에 내려앉으면 상태 조건(카드 포크 또는 부품 죔쇠 · 컴퍼스 · 갈래 톱니)이 맞나 */
export const condCell = (b: SliceBattle, i: number, pieceId: number, to: Pos): boolean =>
  (COMMANDS[b.hand[i]]?.fork ? cardCond(b, i, pieceId, to).on : false)
  || partCond(b, pieceId, to, i).some((id) => id === 'vise' || id === 'calipers' || id === 'forkGear');

/** 발치 램프를 켤 내 기물 id: 처치 기물 태엽 0 카드를 쥔 그 기물 · 마지막 숨 · 마지막 축 */
export const condPieces = (b: SliceBattle): number[] => {
  const out = new Set<number>();
  b.hand.forEach((id, i) => {
    if (!COMMANDS[id]?.freeIfKiller) return;
    for (const p of b.s.pieces) if (p.side === 0 && cardCond(b, i, p.id).on && (COMMANDS[id].who === 'any' || COMMANDS[id].who === p.type)) out.add(p.id);
  });
  for (const p of b.s.pieces) if (p.side === 0 && partCond(b, p.id).some((x) => x === 'lastAxle' || x === 'lastBreath')) out.add(p.id);
  return [...out];
};

/** 손패 어디서든 이 부품 조건이 켜지는 수가 있나 (부품 칸 표지 — 죔쇠 · 컴퍼스 · 갈래 톱니) */
export const partCondAnywhere = (b: SliceBattle, part: 'vise' | 'calipers' | 'forkGear'): boolean => {
  for (let i = 0; i < b.hand.length; i++) {
    if (COMMANDS[b.hand[i]]?.kind !== 'move') continue;
    for (const p of cardPieces(b, i)) for (const to of cardMoves(b, i, p.id)) if (partCond(b, p.id, to, i).includes(part)) return true;
  }
  return false;
};
