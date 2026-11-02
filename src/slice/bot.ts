import { chebyshev, findPiece, kingOf, samePos } from '../engine';
import { COMMANDS } from './cards';
import { canPlay, cardMoves, cardPieces, dangerSquares, endTurn, isInstant, playCard, previewPlay, type SliceBattle } from './battle';

/**
 * 자동 플레이 봇 (R5 끝 조건 · R7 밸런스용, D-173): 사람처럼 "지금 가장 많이 치는 수"를 고르는 탐욕 봇.
 * 화면과 같은 previewPlay · playCard만 쓴다 (엔진 결정론 그대로). 재미는 모른다 — 길이 · 막힘 측정용.
 */
export interface BotAction {
  i: number;
  pieceId?: number;
  to?: { x: number; y: number };
  score: number;
}

/** 수 하나의 점수: 준 피해 + 처치 + 승리, 적 킹 쪽으로 다가가면 조금, 예고된 칸에 서면 감점 */
const scoreMove = (b: SliceBattle, i: number, pieceId: number, to: { x: number; y: number }, danger: { x: number; y: number }[]): number | null => {
  const sim = previewPlay(b, i, pieceId, to);
  if (!sim) return null;
  if (sim.state.winner === 0) return 100000;
  if (sim.state.winner === 1) return -100000;
  let dmg = 0;
  for (const e of sim.events) {
    if (e.type !== 'attack' && e.type !== 'blast') continue;
    for (const h of e.hits) {
      const t = b.s.pieces.find((q) => q.id === h.targetId);
      if (t) dmg += t.side === 1 ? h.damage : -h.damage;
    }
  }
  const kills = sim.removed.filter((q) => q.side === 1).length;
  const lost = sim.removed.filter((q) => q.side === 0).length;
  const me = findPiece(b.s, pieceId)!;
  const ek = kingOf(b.s, 1);
  const closer = ek ? chebyshev(me, ek) - chebyshev(to, ek) : 0;
  const risk = danger.some((d) => samePos(d, to)) ? (me.type === 'K' ? 60 : 12) : 0;
  return dmg + kills * 30 - lost * 80 + closer * 3 - risk - COMMANDS[b.hand[i]].cost * 2;
};

/** 지금 둘 가장 좋은 수 (없으면 null = 턴을 끝낸다) */
export const bestAction = (b: SliceBattle): BotAction | null => {
  if (b.s.winner !== null) return null;
  const danger = dangerSquares(b);
  let best: BotAction | null = null;
  for (let i = 0; i < b.hand.length; i++) {
    if (!canPlay(b, i)) continue;
    const c = COMMANDS[b.hand[i]];
    if (isInstant(b.hand[i])) {
      // 뽑기 · 불씨 · 행진 · 징집: 먼저 낸다 (손패가 늘어나면 고를 수가 많아진다)
      const sc = c.kind === 'draw' || c.kind === 'spark' ? 20 : 8;
      if (!best || sc > best.score) best = { i, score: sc };
      continue;
    }
    if (c.kind !== 'move') {
      // 방열판 · 땜질: 위험한 킹(또는 다친 기물)에게, 낮은 우선
      const k = kingOf(b.s, 0);
      if (k && cardPieces(b, i).some((p) => p.id === k.id)) {
        const sc = danger.some((d) => samePos(d, k)) ? 15 : 1;
        if (!best || sc > best.score) best = { i, pieceId: k.id, score: sc };
      }
      continue;
    }
    for (const p of cardPieces(b, i))
      for (const to of cardMoves(b, i, p.id)) {
        const sc = scoreMove(b, i, p.id, to, danger);
        if (sc !== null && (!best || sc > best.score)) best = { i, pieceId: p.id, to, score: sc };
      }
  }
  return best && best.score > 0 ? best : null;
};

/** 대국 하나를 끝까지 둔다. 내 턴 수 · 낸 카드 수 · 이겼는지 */
export const playOut = (b: SliceBattle, maxTurns = 40): { won: boolean; turns: number; plays: number } => {
  let plays = 0;
  while (b.s.winner === null && b.turn < maxTurns) {
    for (let guard = 0; guard < 20; guard++) {
      const a = bestAction(b);
      if (!a) break;
      const r = playCard(b, a.i, a.pieceId, a.to);
      if (typeof r === 'string') break;
      plays++;
      if (b.s.winner !== null) break;
    }
    if (b.s.winner !== null) break;
    endTurn(b, true);
  }
  return { won: b.s.winner === 0, turns: b.turn, plays };
};
