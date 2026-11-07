import { chebyshev, findPiece, kingOf, samePos } from '../engine';
import { COMMANDS } from './cards';
import { canPlay, cardMoves, cardPieces, dangerSquares, endTurn, intentHits, isInstant, playCard, previewPlay, type SliceBattle } from './battle';
import { BOT } from '../data/bot';

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
export const scoreMove = (b: SliceBattle, i: number, pieceId: number, to: { x: number; y: number }, danger: { x: number; y: number }[]): number | null => {
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

/**
 * 봇 성향 (난이도 설계 D-228 — 「두뇌 플레이는 깨고, 무뇌 플레이는 막힌다」를 재려고):
 * random = 무뇌(낼 수 있는 수 중 아무거나), naive = 단순(지금 가장 세게 치는 수 — 예고된 위험 무시), greedy = 보통(위험 피함 + 킹의 수는 적 차례를 미리 돌려 쓰러질 수를 피함, D-299), search = 두뇌(playOutSearch).
 */
export type BotStyle = 'random' | 'naive' | 'greedy';

/** 지금 둘 가장 좋은 수 (없으면 null = 턴을 끝낸다) */
export const bestAction = (b: SliceBattle, style: BotStyle = 'greedy'): BotAction | null => {
  if (b.s.winner !== null) return null;
  if (style === 'random') return randomAction(b);
  if (style === 'greedy') return carefulAction(b);
  const danger = style === 'naive' ? [] : dangerSquares(b);
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

/**
 * 지금 턴을 끝내면 받을 피해의 무게 (보통 봇, D-299) — 화면 예고와 같은 enemyPhase를 미리 돌린 실제 피해.
 * 킹이 쓰러지면 패배라 가장 무겁고, 분대원이 쓰러지면 기물 값만큼 더 무겁다.
 */
export const threatOf = (b: SliceBattle): number => {
  if (b.s.winner === 0) return 0;
  if (b.s.winner === 1) return BOT.kingLost;
  let v = 0;
  for (const h of intentHits(b)) {
    const p = findPiece(b.s, h.pieceId);
    if (!p) continue;
    if (p.type === 'K') v += h.killed ? BOT.kingLost : h.damage * BOT.kingHurt;
    else v += h.damage * BOT.crewHurt + (h.killed ? BOT.crewLost * VALUE[p.type] : 0);
  }
  return v;
};

/**
 * 보통 봇 (D-299, 사용자: 「보통봇 올리고」 — 규칙은 그대로, 봇만 똑똑하게): 한 수 앞 + 적 차례 미리 보기 (어디까지 보는지는 src/data/bot.ts).
 * 수마다 「지금 치는 값(scoreMove, 예고 칸 감점 그대로) + 이 수로 줄어드는 받을 피해(BOT 무게)」를 매긴다.
 * 지금 무게: 킹의 수만 미리 봐서 킹이 쓰러질 자리를 피한다 · 방열판은 예전처럼 예고 칸의 킹에게. 무게를 다 켜면 두뇌 봇과 붙는다(src/data/bot.ts).
 * 수의 순서(두 수 이상 앞)는 보지 않는다 — 그건 두뇌 봇(playOutSearch)의 몫.
 */
const carefulAction = (b: SliceBattle): BotAction | null => {
  const danger = dangerSquares(b);
  const now = threatOf(b);
  // 미리 보기는 킹이 지금 예고 칸에 있을 때만 (BOT.lookOnlyThreatened) — 수가 킹을 새로 드러내는 것은 못 본다
  const k0 = kingOf(b.s, 0);
  const look = !BOT.lookOnlyThreatened || (!!k0 && danger.some((d) => samePos(d, k0)));
  const gain = (i: number, pieceId?: number, to?: { x: number; y: number }): number | null => {
    if (!look) return 0;
    const nb = clone(b);
    const r = playCard(nb, i, pieceId, to);
    if (typeof r === 'string') return null;
    return now - threatOf(nb);
  };
  let best: BotAction | null = null;
  const take = (a: BotAction) => { if (!best || a.score > best.score) best = a; };
  for (let i = 0; i < b.hand.length; i++) {
    if (!canPlay(b, i)) continue;
    const c = COMMANDS[b.hand[i]];
    if (isInstant(b.hand[i])) { take({ i, score: c.kind === 'draw' || c.kind === 'spark' ? 20 : 8 }); continue; }
    if (c.kind !== 'move') {
      // 방열판 · 땜질: 받을 피해가 줄어드는 만큼 — 킹이 쓰러질 수가 아니어도 예고 칸의 킹에겐 예전 보통 봇처럼 낮은 우선(15)으로 낸다
      const k = kingOf(b.s, 0);
      for (const p of cardPieces(b, i)) {
        const g = gain(i, p.id);
        if (g === null) continue;
        const usual = k && p.id === k.id ? (danger.some((d) => samePos(d, k)) ? 15 : 1) : 0;
        take({ i, pieceId: p.id, score: BOT.shieldLookahead ? Math.max(g - c.cost * 2, usual) : usual });
      }
      continue;
    }
    for (const p of cardPieces(b, i))
      for (const to of cardMoves(b, i, p.id)) {
        const sc = scoreMove(b, i, p.id, to, danger);
        if (sc === null) continue;
        if (sc >= 50000) return { i, pieceId: p.id, to, score: sc };
        const g = BOT.lookKingOnly && p.type !== 'K' ? 0 : gain(i, p.id, to);
        if (g !== null) take({ i, pieceId: p.id, to, score: sc + g });
      }
  }
  const pick = best as BotAction | null;
  return pick && pick.score > 0 ? pick : null;
};

/** 무뇌: 낼 수 있는 수를 모두 모아 아무거나 (씨앗은 판 상태에서 — 결정론). 태엽이 남아도 30% 확률로 그냥 턴을 끝낸다 */
const randomAction = (b: SliceBattle): BotAction | null => {
  const all: BotAction[] = [];
  for (let i = 0; i < b.hand.length; i++) {
    if (!canPlay(b, i)) continue;
    const c = COMMANDS[b.hand[i]];
    if (isInstant(b.hand[i])) { all.push({ i, score: 1 }); continue; }
    for (const p of cardPieces(b, i)) {
      if (c.kind !== 'move') { all.push({ i, pieceId: p.id, score: 1 }); continue; }
      for (const to of cardMoves(b, i, p.id)) all.push({ i, pieceId: p.id, to, score: 1 });
    }
  }
  const h = (b.turn * 7919 + b.hand.length * 104729 + b.ap * 1299709 + b.s.pieces.reduce((a, p) => a + p.hp * (p.x + 1) * (p.y + 3), 0)) % 1000;
  if (!all.length || h < 300) return null;
  return all[h % all.length];
};

/** 대국 하나를 끝까지 둔다. 내 턴 수 · 낸 카드 수 · 이겼는지 */
export const playOut = (b: SliceBattle, maxTurns = 40, onPlay?: (card: string) => void, style: BotStyle = 'greedy'): { won: boolean; turns: number; plays: number } => {
  let plays = 0;
  while (b.s.winner === null && b.turn < maxTurns) {
    for (let guard = 0; guard < 20; guard++) {
      const a = bestAction(b, style);
      if (!a) break;
      const card = b.hand[a.i];
      const r = playCard(b, a.i, a.pieceId, a.to);
      if (typeof r !== 'string' && onPlay && card) onPlay(card);
      if (typeof r === 'string') break;
      plays++;
      if (b.s.winner !== null) break;
    }
    if (b.s.winner !== null) break;
    endTurn(b, true);
  }
  return { won: b.s.winner === 0, turns: b.turn, plays };
};

// ---------- 수읽기 봇 (D-177): 한 턴 안의 순서를 탐색한다 ----------
const clone = (b: SliceBattle): SliceBattle => JSON.parse(JSON.stringify(b)) as SliceBattle;
const VALUE: Record<string, number> = { K: 50, Q: 9, R: 5, B: 3, N: 3, P: 1 };
/** 판 평가: 기물 가치 차 (체력 비율 반영) + 승패 */
const evalBoard = (b: SliceBattle): number => {
  if (b.s.winner === 0) return 1e6;
  if (b.s.winner === 1) return -1e6;
  let v = 0;
  for (const p of b.s.pieces) v += (p.side === 0 ? 1 : -1.1) * VALUE[p.type] * (0.4 + 0.6 * (p.hp / Math.max(1, p.maxHp)));
  return v;
};

/** 이 판에서 둘 수 있는 후보 (욕심 점수 상위 k개) */
const candidates = (b: SliceBattle, k: number): BotAction[] => {
  const danger = dangerSquares(b);
  const out: BotAction[] = [];
  for (let i = 0; i < b.hand.length; i++) {
    if (!canPlay(b, i)) continue;
    const c = COMMANDS[b.hand[i]];
    if (isInstant(b.hand[i])) { out.push({ i, score: 5 }); continue; }
    if (c.kind !== 'move') continue;
    for (const p of cardPieces(b, i))
      for (const to of cardMoves(b, i, p.id)) {
        const sc = scoreMove(b, i, p.id, to, danger);
        if (sc !== null) out.push({ i, pieceId: p.id, to, score: sc });
      }
  }
  // 같은 기물 · 같은 칸은 하나만 (카드만 다른 중복 제거)
  const seen = new Set<string>();
  return out.sort((a, c) => c.score - a.score).filter((a) => { const key = `${a.pieceId}:${a.to?.x},${a.to?.y}:${a.pieceId === undefined ? a.i : ''}`; if (seen.has(key)) return false; seen.add(key); return true; }).slice(0, k);
};

/** 수읽기: 이번 턴의 수 순서를 깊이 depth까지 탐색해, 적 차례까지 끝낸 판이 가장 좋은 순서를 고른다 */
export const searchTurn = (b: SliceBattle, depth = 4, k = 5): BotAction[] => {
  let best = { v: -Infinity, seq: [] as BotAction[] };
  const rec = (cur: SliceBattle, seq: BotAction[], d: number) => {
    // 여기서 턴을 끝내 본다
    const end = clone(cur);
    if (end.s.winner === null) endTurn(end, true);
    const v = evalBoard(end);
    if (v > best.v) best = { v, seq };
    if (d === 0 || cur.s.winner !== null) return;
    for (const a of candidates(cur, k)) {
      const nb = clone(cur);
      const r = playCard(nb, a.i, a.pieceId, a.to);
      if (typeof r === 'string') continue;
      rec(nb, [...seq, a], d - 1);
    }
  };
  rec(b, [], depth);
  return best.seq;
};

/** 수읽기 봇으로 대국 하나 */
export const playOutSearch = (b: SliceBattle, maxTurns = 40, depth = 4, k = 5): { won: boolean; turns: number; plays: number } => {
  let plays = 0;
  while (b.s.winner === null && b.turn < maxTurns) {
    const seq = searchTurn(b, depth, k);
    // 탐색한 순서를 다시 확인하며 둔다 (손패 번호는 앞 수에 따라 바뀌므로 기물 · 칸으로 다시 찾는다)
    for (const a of seq) {
      if (b.s.winner !== null) break;
      let idx = a.i;
      if (a.pieceId !== undefined) {
        const want = COMMANDS[(b.hand[a.i] ?? '') as keyof typeof COMMANDS];
        if (!want || !cardMoves(b, a.i, a.pieceId).some((q) => q.x === a.to!.x && q.y === a.to!.y)) {
          idx = b.hand.findIndex((_, j) => canPlay(b, j) && cardMoves(b, j, a.pieceId!).some((q) => q.x === a.to!.x && q.y === a.to!.y));
          if (idx < 0) break;
        }
      }
      const r = playCard(b, idx, a.pieceId, a.to);
      if (typeof r === 'string') break;
      plays++;
    }
    if (b.s.winner !== null) break;
    endTurn(b, true);
  }
  return { won: b.s.winner === 0, turns: b.turn, plays };
};
