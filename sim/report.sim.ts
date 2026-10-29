import { it } from 'vitest';
import { AGGRESSIVE, type Weights } from '../src/ai/evaluate';
import { AI_TIERS } from '../src/ai/search';
import { TUNED } from '../src/data/aiWeights';
import { FULL_DECK, type Deck } from '../src/engine';
import { score, series, type Matchup, type SeriesResult } from '../src/sim/arena';

/** M3 검증 리포트: 결판률·승급·일격·요충지·악용 전략 (D-014·D-015·D-017·D-018) */
const tier = { beamWidth: 4, mistakeRate: 0.1 };
const six = (decks: [Deck, Deck]): Matchup => ({ width: 6, height: 6, decks, maxTurns: 80 });
const eight: Matchup = { width: 8, height: 8, decks: [FULL_DECK, FULL_DECK], maxTurns: 100 };

const summary = (label: string, r: SeriesResult) => {
  const n = r.games;
  const decided = r.all.filter((g) => g.winner !== null);
  const sum = (f: (g: (typeof r.all)[number]) => number) => r.all.reduce((a, g) => a + f(g), 0);
  console.log(
    `${label} | 결판 ${decided.length}/${n} | 결판까지 평균 ${(decided.reduce((a, g) => a + g.turns, 0) / Math.max(1, decided.length)).toFixed(1)}턴 | 승급 ${(sum((g) => g.promotions) / n).toFixed(2)}/판 | 일격 ${(sum((g) => g.strikes) / n).toFixed(2)}/판 | 붕괴 ${(sum((g) => g.collapses) / n).toFixed(2)}/판 | 점령 ${(sum((g) => g.captures.length) / n).toFixed(2)}/판`,
  );
};

it('report', () => {
  const a = { weights: AGGRESSIVE, tier };
  summary('6×6 온보딩 A', series(six([['K', 'P', 'P', 'P'], ['K', 'P', 'P']]), a, a, 40));
  summary('6×6 온보딩 B', series(six([['K', 'P', 'P', 'N'], ['K', 'P', 'P', 'B']]), a, a, 40));

  const t = { weights: TUNED, tier };
  const full = series(eight, t, t, 40, 500);
  summary('8×8 풀 덱', full);
  const caps = full.all.flatMap((g) => g.captures.map((c) => ({ ...c, won: g.winner === c.side })));
  const byTier = [1, 2, 3].map((k) => caps.filter((c) => c.tier === k));
  console.log(
    `요충지 점령 ${caps.length}회 | Tier1 ${byTier[0].length} · Tier2 ${byTier[1].length} · Tier3 ${byTier[2].length} | 점령한 쪽 최종 승리 ${caps.filter((c) => c.won).length}/${caps.length}`,
  );

  // 악용 전략 1: 기물을 아끼지 않고 버리며 킹만 노린다 (최후의 일격 노림수)
  const sacrifice: Weights = { ...TUNED, material: -1, threat: 0, enemyKing: TUNED.enemyKing * 1.5 };
  const s8 = series(eight, { weights: sacrifice, tier }, t, 40, 700);
  console.log(`악용① 기물 버리기 vs 튜닝 AI (8×8): ${(score(s8) * 100).toFixed(0)}% (${s8.wins}승 ${s8.draws}무 ${s8.losses}패)`);
  const s6 = series(six([['K', 'P', 'P', 'N'], ['K', 'P', 'P', 'N']]), { weights: sacrifice, tier }, a, 40, 800);
  console.log(`악용① 기물 버리기 vs 공격형 (6×6): ${(score(s6) * 100).toFixed(0)}% (${s6.wins}승 ${s6.draws}무 ${s6.losses}패)`);

  // 악용 전략 2: 전력을 가볍게 보고 요충지만 노린다 (일부러 열세를 감수)
  const sandbag: Weights = { ...TUNED, material: TUNED.material * 0.3, stronghold: TUNED.stronghold * 4 };
  const sb = series(eight, { weights: sandbag, tier }, t, 40, 900);
  console.log(`악용② 열세 감수·요충지 집착 vs 튜닝 AI (8×8): ${(score(sb) * 100).toFixed(0)}% (${sb.wins}승 ${sb.draws}무 ${sb.losses}패)`);

  // AI 지능 단계: 높은 단계가 낮은 단계를 이기는가
  const low = { weights: TUNED, tier: AI_TIERS[0] };
  const high = { weights: TUNED, tier: AI_TIERS[2] };
  const tiers = series(eight, high, low, 20, 1100);
  console.log(`AI 단계 3 vs 단계 1 (8×8): ${(score(tiers) * 100).toFixed(0)}% (${tiers.wins}승 ${tiers.draws}무 ${tiers.losses}패)`);
});
