import { chebyshev, findPiece, kingOf, samePos, type BattleState, type Piece } from '../engine';
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

/**
 * 자리 값 (2026-11-09d): 킹이 아닌 기물은 가장 가까운 적 · 적 킹에 붙을수록 높다 (무게는 src/data/bot.ts).
 * 다가가는 수가 「턴을 그냥 끝내기」보다 못하지 않게 — 킹은 0 (앞장서지 않는다).
 */
export const placeOf = (s: BattleState, p: Pick<Piece, 'type'>, at: { x: number; y: number }): number => {
  if (p.type === 'K') return 0;
  const foes = s.pieces.filter((q) => q.side === 1);
  if (!foes.length) return 0;
  const near = Math.min(BOT.posNearCap, ...foes.map((q) => chebyshev(q, at)));
  const ek = kingOf(s, 1);
  return -BOT.posNear * near - BOT.posKing * (ek ? chebyshev(ek, at) : 0);
};

/** 수 하나의 점수: 준 피해 + 처치 + 승리, 자리 값이 오르면 그만큼, 예고된 칸에 서면 감점 · 예고 칸에서 빠지면 가점 */
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
  const after = findPiece(sim.state, pieceId);
  const place = after ? placeOf(sim.state, me, after) - placeOf(b.s, me, me) : 0;
  const inDanger = (q: { x: number; y: number }) => danger.some((d) => samePos(d, q));
  const risk = inDanger(to) ? (me.type === 'K' ? 60 : 12) : 0;
  const escape = inDanger(me) && !inDanger(to) ? (me.type === 'K' ? BOT.escapeKing : BOT.escapeCrew) : 0;
  return dmg + kills * 30 - lost * 80 + place - risk + escape - COMMANDS[b.hand[i]].cost * BOT.costW;
};

/**
 * 방열판 · 땜질 점수 (2026-11-09d): 예전엔 킹에게만 냈다. 이제 예고 칸의 킹 > 예고 칸의 분대원 > 다친 기물 > 그 밖 —
 * 태엽이 남으면 쓴다. 다 찬 기물엔 땜질하지 않는다 (null). danger가 빈 배열이면(단순 봇) 예고를 모른다.
 */
const scoreGuard = (b: SliceBattle, i: number, p: Piece, danger: { x: number; y: number }[]): number | null => {
  const c = COMMANDS[b.hand[i]];
  const cost = c.cost * BOT.costW;
  // 쇳물 서약 (D-462)은 봇이 쓰지 않는다 — 사람의 선택으로 남긴다
  if (c.kind === 'melt') return null;
  if (c.kind === 'repair') {
    const heal = Math.min(p.maxHp - p.hp, c.amount ?? 0);
    return heal > 0 ? heal * BOT.healW - cost : null;
  }
  const threatened = danger.some((d) => samePos(d, p));
  return (threatened ? (p.type === 'K' ? BOT.shieldKing : BOT.shieldThreat) : BOT.shieldIdle) - cost;
};

/**
 * 봇 성향 (난이도 설계 D-228 — 「두뇌 플레이는 깨고 무뇌 플레이는 막힌다」를 재려고):
 * random = 무뇌(낼 수 있는 수 중 아무거나), naive = 단순(지금 가장 세게 치는 수 — 예고된 위험 무시), greedy = 보통(위험 피함 + 킹의 수는 적 차례를 미리 돌려 쓰러질 수를 피함, D-299), search = 두뇌(playOutSearch).
 */
export type BotStyle = 'random' | 'naive' | 'greedy';

/** 둘 만한 수인가 (2026-11-09d): 태엽 값(costW)은 수 사이 순서만 가르고, 두느냐는 태엽을 뺀 점수가 BOT.passBar를 넘느냐로 — 남긴 태엽은 어차피 버려진다 */
const worthIt = (b: SliceBattle, a: BotAction): boolean => a.score + (COMMANDS[b.hand[a.i]]?.cost ?? 0) * BOT.costW > BOT.passBar;

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
      // 방열판 · 땜질 (2026-11-09d): 킹만이 아니라 다친 · 겨눠진 기물에게도 — 낮은 우선
      for (const p of cardPieces(b, i)) {
        const sc = scoreGuard(b, i, p, danger);
        if (sc !== null && (!best || sc > best.score)) best = { i, pieceId: p.id, score: sc };
      }
      continue;
    }
    for (const p of cardPieces(b, i))
      for (const to of cardMoves(b, i, p.id)) {
        const sc = scoreMove(b, i, p.id, to, danger);
        if (sc !== null && (!best || sc > best.score)) best = { i, pieceId: p.id, to, score: sc };
      }
  }
  return best && worthIt(b, best) ? best : null;
};

/**
 * 지금 턴을 끝내면 받을 피해의 무게 (보통 봇, D-299) — 화면 예고와 같은 enemyPhase를 미리 돌린 실제 피해.
 * 킹이 쓰러지면 패배라 가장 무겁고 분대원이 쓰러지면 기물 값만큼 더 무겁다.
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
    if (c.kind === 'swap') {
      // 캐슬링 (D-316): 예전엔 다른 즉시 카드처럼 무조건 먼저 냈다(킹을 예고 칸으로 옮기기도). 이제 킹이 예고 칸에서 빠질 때만
      const nb = clone(b);
      if (typeof playCard(nb, i) === 'string') continue;
      const k1 = kingOf(nb.s, 0);
      const before = !!k0 && danger.some((d) => samePos(d, k0));
      const after = !!k1 && dangerSquares(nb).some((d) => samePos(d, k1));
      take({ i, score: (before && !after ? 15 : 0) + (now - threatOf(nb) > 0 ? 50 : 0) });
      continue;
    }
    if (isInstant(b.hand[i])) { take({ i, score: c.kind === 'draw' || c.kind === 'spark' ? 20 : 8 }); continue; }
    if (c.kind !== 'move') {
      // 방열판 · 땜질: 받을 피해가 줄어드는 만큼 — 킹이 쓰러질 수가 아니어도 예고 칸의 킹에겐 예전 보통 봇처럼 낮은 우선(15)으로 낸다
      // (2026-11-09d) 킹 말고도 겨눠진 분대원 · 다친 기물에게 — scoreGuard
      for (const p of cardPieces(b, i)) {
        const usual = scoreGuard(b, i, p, danger);
        if (usual === null) continue;
        const g = BOT.shieldLookahead ? gain(i, p.id) : 0;
        if (g === null) continue;
        take({ i, pieceId: p.id, score: BOT.shieldLookahead ? Math.max(g - c.cost * BOT.costW, usual) : usual });
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
  return pick && worthIt(b, pick) ? pick : null;
};

/** 무뇌: 낼 수 있는 수를 모두 모아 아무거나 (씨앗은 판 상태에서 — 결정론). 태엽이 남아도 BOT.randomPass 확률로 그냥 턴을 끝낸다 (2026-11-09d: 30% → 0) */
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
  if (!all.length || h < BOT.randomPass * 1000) return null;
  return all[h % all.length];
};

/**
 * 손 놓은 턴 측정 (2026-11-09d, 사용자: 「태엽이 남았는데 아무것도 안 하는 봇을 최소화」).
 * turns = 내 턴 수 · idle = 태엽이 남았고 낼 수 있는 카드도 있었는데 턴을 끝낸 수 · apLeft = 턴 끝에 남긴 태엽 합 · idleAp = 손 놓은 턴의 남긴 태엽 합.
 */
export interface IdleStats { turns: number; idle: number; apLeft: number; idleAp: number }
export const idleStats = (): IdleStats => ({ turns: 0, idle: 0, apLeft: 0, idleAp: 0 });
/** 낼 수 있는 카드가 하나라도 있나 */
export const anyPlay = (b: SliceBattle): boolean => b.hand.some((_, i) => canPlay(b, i));
/** 턴을 끝내기 직전에 부른다 */
const tally = (st: IdleStats, b: SliceBattle): void => {
  st.turns += 1;
  st.apLeft += Math.max(0, b.ap);
  if (b.ap > 0 && anyPlay(b)) { st.idle += 1; st.idleAp += b.ap; }
};
export type PlayResult = { won: boolean; turns: number; plays: number; idle: IdleStats };

/** 대국 하나를 끝까지 둔다. 내 턴 수 · 낸 카드 수 · 이겼는지 · 손 놓은 턴 */
export const playOut = (b: SliceBattle, maxTurns = 40, onPlay?: (card: string) => void, style: BotStyle = 'greedy'): PlayResult => {
  let plays = 0;
  const idle = idleStats();
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
    tally(idle, b);
    endTurn(b, true);
  }
  return { won: b.s.winner === 0, turns: b.turn, plays, idle };
};

// ---------- 수읽기 봇 (D-177): 한 턴 안의 순서를 탐색한다 ----------
const clone = (b: SliceBattle): SliceBattle => JSON.parse(JSON.stringify(b)) as SliceBattle;
const VALUE: Record<string, number> = { K: 50, Q: 9, R: 5, B: 3, N: 3, P: 1 };
/**
 * 판 평가: 기물 가치 차 (체력 비율 반영) + 승패.
 * (2026-11-09d) + 내 기물의 자리 값 · 남은 방열판 — 예전엔 기물 값만 봐서 「지금 턴 끝내기」가 다가가기 · 방열판보다 늘 같거나 나았다.
 */
const evalBoard = (b: SliceBattle): number => {
  if (b.s.winner === 0) return 1e6;
  if (b.s.winner === 1) return -1e6;
  let v = 0;
  for (const p of b.s.pieces) {
    const hpK = Math.max(1, p.maxHp);
    v += (p.side === 0 ? 1 : -1.1) * VALUE[p.type] * (0.4 + 0.6 * (p.hp / hpK));
    if (p.side !== 0) continue;
    v += VALUE[p.type] * 0.6 * BOT.evalShield * (Math.min(p.shield, hpK) / hpK) + BOT.evalPos * placeOf(b.s, p, p);
  }
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
    if (c.kind !== 'move') {
      // 방열판 · 땜질 (2026-11-09d): 예전엔 후보에서 뺐다 — 카드마다 가장 쓸 데 있는 기물 하나만
      let g: BotAction | null = null;
      for (const p of cardPieces(b, i)) {
        const sc = scoreGuard(b, i, p, danger);
        if (sc !== null && (!g || sc > g.score)) g = { i, pieceId: p.id, score: sc };
      }
      if (g) out.push(g);
      continue;
    }
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

/**
 * 사람다운 실수 (D-456 실험실): temp > 0이면 가장 좋은 순서만 고르지 않고 상위 3개 중 소프트맥스(판값 / temp)로 고른다.
 * 주사위는 대국 RNG를 건드리지 않게 판 상태(rng · 턴 · 태엽 · 손패 수)에서 만든 값 — 같은 입력이면 같은 선택(결정론).
 */
const humanPick = <T extends { v: number }>(b: SliceBattle, top: T[], temp: number): T => {
  if (temp <= 0 || top.length < 2) return top[0];
  let h = (b.rng ^ (b.turn * 2654435761) ^ (b.ap * 40503) ^ (b.hand.length * 97)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 2246822507) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0;
  const u = ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  const w = top.map((t) => Math.exp((t.v - top[0].v) / temp));
  let r = u * w.reduce((a, x) => a + x, 0);
  for (let i = 0; i < top.length; i++) { r -= w[i]; if (r <= 0) return top[i]; }
  return top[top.length - 1];
};

/** 수읽기: 이번 턴의 수 순서를 깊이 depth까지 탐색해, 적 차례까지 끝낸 판이 가장 좋은 순서를 고른다 (temp: 사람다운 실수, 0 = 늘 최선) */
export const searchTurn = (b: SliceBattle, depth = 4, k = 5, temp = 0): BotAction[] => {
  let best = { v: -Infinity, seq: [] as BotAction[] };
  const top: { v: number; seq: BotAction[] }[] = [];
  const rec = (cur: SliceBattle, seq: BotAction[], d: number) => {
    // 여기서 턴을 끝내 본다
    const end = clone(cur);
    if (end.s.winner === null) endTurn(end, true);
    // 둔 수마다 BOT.evalPlay (2026-11-09d): 판이 같으면 턴을 끝내기보다 두는 쪽 — 점화 · 뽑기처럼 판값이 안 바뀌는 수가 손 놓기에 지던 것
    const v = evalBoard(end) + BOT.evalPlay * seq.length;
    if (v > best.v) best = { v, seq };
    if (temp > 0 && seq.length) { top.push({ v, seq }); top.sort((x, y) => y.v - x.v); if (top.length > 3) top.pop(); }
    if (d === 0 || cur.s.winner !== null) return;
    for (const a of candidates(cur, k)) {
      const nb = clone(cur);
      const r = playCard(nb, a.i, a.pieceId, a.to);
      if (typeof r === 'string') continue;
      rec(nb, [...seq, a], d - 1);
    }
  };
  rec(b, [], depth);
  if (temp > 0 && top.length && top[0].v >= best.v) return humanPick(b, top, temp).seq;
  return best.seq;
};

/** 수읽기 봇으로 대국 하나 */
export const playOutSearch = (b: SliceBattle, maxTurns = 40, depth = 4, k = 5, temp = 0): PlayResult => {
  let plays = 0;
  const idle = idleStats();
  while (b.s.winner === null && b.turn < maxTurns) {
    // 찾은 순서를 다 두고도 낼 카드가 남으면 다시 수읽기 (2026-11-09d — 깊이 끝에서 남은 태엽을 버리던 것). 0태엽 카드가 있어 태엽 0이어도 본다
    for (let again = 0; again < BOT.researchMax && b.s.winner === null && anyPlay(b); again++) {
      const seq = searchTurn(b, depth, k, temp);
      if (!seq.length) break;
      let done = 0;
      // 탐색한 순서를 다시 확인하며 둔다 (손패 번호는 앞 수에 따라 바뀌므로 기물 · 칸으로 다시 찾는다)
      for (const a of seq) {
        if (b.s.winner !== null) break;
        let idx = a.i;
        if (a.pieceId !== undefined && a.to) {
          const want = COMMANDS[(b.hand[a.i] ?? '') as keyof typeof COMMANDS];
          if (!want || !cardMoves(b, a.i, a.pieceId).some((q) => q.x === a.to!.x && q.y === a.to!.y)) {
            idx = b.hand.findIndex((_, j) => canPlay(b, j) && cardMoves(b, j, a.pieceId!).some((q) => q.x === a.to!.x && q.y === a.to!.y));
            if (idx < 0) break;
          }
        }
        const r = playCard(b, idx, a.pieceId, a.to);
        if (typeof r === 'string') break;
        plays++;
        done++;
      }
      if (!done) break;
    }
    if (b.s.winner !== null) break;
    tally(idle, b);
    endTurn(b, true);
  }
  return { won: b.s.winner === 0, turns: b.turn, plays, idle };
};
