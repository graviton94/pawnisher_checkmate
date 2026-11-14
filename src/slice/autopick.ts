import { findPiece } from '../engine';
import { AUTO_PICK } from '../data/bot';
import { COMMANDS } from './cards';
import { cardMoves, cardPieces, costOf, previewPlay, type SliceBattle } from './battle';

/** 자동 고르기 결과: 손패 번호 · 점수 · 태엽 · 전용 카드인가 · 전용 카드를 쥐었는데 못 써서 공용으로 넘어갔나 */
export interface AutoPick { i: number; score: number; cost: number; own: boolean; ownBlocked: boolean }

/** 이 카드로 이 기물이 둘 수 있는 가장 좋은 수의 값 (적에게 준 HP 피해 + 처치 가산) — 화면 미리보기와 같은 previewPlay */
export const bestMoveValue = (b: SliceBattle, i: number, pieceId: number): number => {
  const before = b.s.pieces.filter((p) => p.side === 1);
  let best = 0;
  for (const to of cardMoves(b, i, pieceId)) {
    const sim = previewPlay(b, i, pieceId, to);
    if (!sim) continue;
    let v = 0;
    for (const p of before) {
      const after = findPiece(sim.state, p.id);
      const hp = after && after.hp > 0 ? after.hp : 0;
      v += Math.max(0, p.hp - hp);
      if (!hp) v += p.type === 'K' ? AUTO_PICK.kingKill : AUTO_PICK.kill;
    }
    if (v > best) best = v;
  }
  return best;
};

/**
 * 카드 없이 기물을 눌렀을 때 잡을 이동 카드 (피드백 #11, D-503).
 * 점수 = 전용 가산 + 가장 좋은 수의 값 ÷ max(1, 태엽) — 싸고 · 세고 · 그 기물 전용인 카드를 비싼 공용 카드보다 먼저.
 */
export const autoPick = (b: SliceBattle, pieceId: number): AutoPick | null => {
  const p = findPiece(b.s, pieceId);
  if (!p) return null;
  const cand = b.hand
    .map((id, i) => ({ c: COMMANDS[id], i }))
    .filter(({ c, i }) => c?.kind === 'move' && cardPieces(b, i).some((q) => q.id === pieceId))
    .map(({ c, i }) => {
      const own = c.who === p.type;
      const cost = costOf(b, i, pieceId);
      return { i, cost, own, score: (own ? AUTO_PICK.ownBonus : 0) + bestMoveValue(b, i, pieceId) / Math.max(1, cost) };
    })
    .sort((x, y) => y.score - x.score || x.cost - y.cost || Number(y.own) - Number(x.own) || x.i - y.i);
  const top = cand[0];
  if (!top) return null;
  const holdsOwn = b.hand.some((id) => COMMANDS[id]?.kind === 'move' && COMMANDS[id].who === p.type);
  return { ...top, ownBlocked: !top.own && holdsOwn && !cand.some((x) => x.own) };
};
