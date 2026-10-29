import type { Weights } from '../ai/evaluate';
import { choosePlan, type AiTier } from '../ai/search';
import { createBattle, EMPTY_LOADOUT, resolveTurn, type BattleRules, type Deck, type Loadout, type Side } from '../engine';

/** AI 대 AI 대량 대전 도구 (D-018). 밸런스 검증과 가중치 튜닝에 쓴다. */

export interface Player {
  weights: Weights;
  tier: AiTier;
  /** 이 플레이어의 인챈트·카드·대장간 (없으면 빈 장비) */
  loadout?: Loadout;
  /** false면 카드·특수 행동을 쓰지 않는다 */
  cards?: boolean;
}

export interface Matchup {
  width: number;
  height: number;
  decks: [Deck, Deck];
  rules?: BattleRules;
  /** 이 턴 수를 넘기면 무승부로 본다 */
  maxTurns: number;
}

export interface GameStats {
  winner: Side | null;
  turns: number;
  promotions: number;
  captures: { side: Side; tier: number; behind: boolean }[];
  strikes: number;
  collapses: number;
  /** 체크메이트로 킹이 HP 1에서 버틴 횟수 */
  checks?: number;
}

export const playGame = (m: Matchup, players: [Player, Player], seed: number): GameStats => {
  let s = createBattle({
    width: m.width,
    height: m.height,
    decks: m.decks,
    rules: m.rules,
    seed,
    loadouts: [players[0].loadout ?? EMPTY_LOADOUT, players[1].loadout ?? EMPTY_LOADOUT],
  });
  const stats: GameStats = { winner: null, turns: 0, promotions: 0, captures: [], strikes: 0, collapses: 0, checks: 0 };
  for (; stats.turns < m.maxTurns && s.winner === null; stats.turns++) {
    const p = players[s.turnSide];
    const plan = choosePlan(s, { tier: p.tier, weights: p.weights, cards: p.cards, seed: seed * 7919 + stats.turns });
    const r = resolveTurn(s, plan);
    for (const e of r.events) {
      if (e.type === 'promote') stats.promotions++;
      else if (e.type === 'strongholdCapture') stats.captures.push({ side: e.side, tier: e.tier, behind: e.behind });
      else if (e.type === 'lastStrike') stats.strikes++;
      else if (e.type === 'collapse') stats.collapses++;
      else if (e.type === 'attack') stats.checks! += e.hits.filter((h) => h.checked).length;
    }
    s = r.state;
  }
  stats.winner = s.winner;
  return stats;
};

export interface SeriesResult {
  games: number;
  /** players[0]의 승·무·패 (진영을 번갈아 맡는다) */
  wins: number;
  draws: number;
  losses: number;
  avgTurns: number;
  all: GameStats[];
}

/** a와 b가 진영을 번갈아 맡으며 n판을 둔다. 결과는 a 기준. */
export const series = (m: Matchup, a: Player, b: Player, n: number, seedBase = 1): SeriesResult => {
  const res: SeriesResult = { games: n, wins: 0, draws: 0, losses: 0, avgTurns: 0, all: [] };
  let turnSum = 0;
  for (let i = 0; i < n; i++) {
    const aSide: Side = i % 2 === 0 ? 0 : 1;
    const players: [Player, Player] = aSide === 0 ? [a, b] : [b, a];
    const g = playGame(m, players, seedBase + i);
    res.all.push(g);
    turnSum += g.turns;
    if (g.winner === null) res.draws++;
    else if (g.winner === aSide) res.wins++;
    else res.losses++;
  }
  res.avgTurns = turnSum / n;
  return res;
};

export const score = (r: SeriesResult): number => (r.wins + r.draws * 0.5) / r.games;
