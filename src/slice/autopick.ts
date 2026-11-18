import { findPiece } from '../engine';
import { AUTO_PICK, AUTO_PICK_ORDER, type AutoPickKey } from '../data/bot';
import { COMMANDS, type CommandDef, type CommandId } from './cards';
import { cardMoves, cardPieces, costOf, previewPlay, type SliceBattle } from './battle';

/** 자동 고르기 결과: 손패 번호 · 점수 · 태엽 · 전용 카드인가 · 전용 카드를 쥐었는데 못 써서 공용으로 넘어갔나 */
export interface AutoPick { i: number; cost: number; own: boolean; ownBlocked: boolean }

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

/** 덧붙는 효과가 없는 기본 이동 카드인가 (전진 · 도약 · 지휘 같은 — 효과 카드는 자동으로 쓰지 않고 아낀다) */
export const isPlainMove = (c: CommandDef): boolean =>
  c.kind === 'move' && !c.mult && !c.add && !c.carve && !c.push && !c.rally && !c.stun && !c.fork && !c.nextMult
  && !c.chainPerKill && !c.multPerKill && !c.rage && !c.drawOnKill && !c.freeIfKiller;

interface Cand { i: number; cost: number; own: boolean; value: number; plain: boolean; last: boolean }
/** AUTO_PICK_ORDER 기준 하나로 견준다 (음수 = x가 앞) */
const CMP: Record<AutoPickKey, (x: Cand, y: Cand) => number> = {
  own: (x, y) => Number(y.own) - Number(x.own),
  cheap: (x, y) => x.cost - y.cost,
  value: (x, y) => y.value - x.value,
  plain: (x, y) => Number(y.plain) - Number(x.plain),
  last: (x, y) => Number(y.last) - Number(x.last),
  hand: (x, y) => x.i - y.i,
};

/**
 * 카드 없이 기물을 눌렀을 때 잡을 이동 카드 (피드백 #11 D-503 → D-591).
 * 지금 낼 수 있는 이동 카드만 후보로, AUTO_PICK_ORDER(전용 · 싼 태엽 · 값 · 기본 카드 · 마지막에 낸 카드 · 손패 순)로 고른다.
 * last = 이 기물 유형으로 마지막에 낸 카드 id (화면이 기억해 넘긴다).
 */
export const autoPick = (b: SliceBattle, pieceId: number, last?: CommandId): AutoPick | null => {
  const p = findPiece(b.s, pieceId);
  if (!p) return null;
  const cand: Cand[] = b.hand
    .map((id, i) => ({ id, c: COMMANDS[id], i }))
    .filter(({ c, i }) => c?.kind === 'move' && cardPieces(b, i).some((q) => q.id === pieceId))
    .map(({ id, c, i }) => ({ i, cost: costOf(b, i, pieceId), own: c.who === p.type, plain: isPlainMove(c), last: id === last, value: bestMoveValue(b, i, pieceId) }));
  cand.sort((x, y) => {
    for (const k of AUTO_PICK_ORDER) {
      const d = CMP[k](x, y);
      if (d) return d;
    }
    return 0;
  });
  const top = cand[0];
  if (!top) return null;
  const holdsOwn = b.hand.some((id) => COMMANDS[id]?.kind === 'move' && COMMANDS[id].who === p.type);
  return { i: top.i, cost: top.cost, own: top.own, ownBlocked: !top.own && holdsOwn && !cand.some((x) => x.own) };
};
