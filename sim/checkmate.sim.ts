import { it } from 'vitest';
import { AI_TIERS } from '../src/ai/search';
import { AGGRESSIVE } from '../src/ai/evaluate';
import { TUNED } from '../src/data/aiWeights';
import { defaultRules } from '../src/data/battle';
import { FULL_DECK, type Deck, type Loadout } from '../src/engine';
import { score, series, type Matchup } from '../src/sim/arena';

/** 체크메이트 규칙(D-022)과 처치 가산점(kill 가중치) 비교 */
it('checkmate', () => {
  const n = Number(process.env.SIM_GAMES ?? 30);
  const tier = AI_TIERS[1];
  const full: [Deck, Deck] = [FULL_DECK, FULL_DECK];
  const burst: Loadout = { enchants: {}, cards: ['C01', 'C03', 'C04', 'C06'], forge: {} };
  const line = (label: string, r: ReturnType<typeof series>) => {
    const decided = r.wins + r.losses;
    const checks = r.all.reduce((a, g) => a + (g.checks ?? 0), 0);
    console.log(`${label}: A ${(score(r) * 100).toFixed(0)}% · 결판 ${decided}/${r.games} · 평균 ${r.avgTurns.toFixed(1)}턴 · 체크 ${(checks / r.games).toFixed(2)}/판`);
  };
  for (const cm of [false, true]) {
    const tag = cm ? '체크메이트 ON ' : '체크메이트 OFF';
    const rules = (w: number, h: number) => ({ ...defaultRules(w, h), checkmate: cm });
    const m8: Matchup = { width: 8, height: 8, decks: full, rules: rules(8, 8), maxTurns: 120 };
    const mA: Matchup = { width: 6, height: 6, decks: [['K', 'P', 'P', 'P'], ['K', 'P', 'P']], rules: rules(6, 6), maxTurns: 80 };
    const mB: Matchup = { width: 6, height: 6, decks: [['K', 'P', 'P', 'N'], ['K', 'P', 'P', 'B']], rules: rules(6, 6), maxTurns: 80 };
    line(`${tag} · 6×6 A`, series(mA, { weights: AGGRESSIVE, tier }, { weights: AGGRESSIVE, tier }, n, 500));
    line(`${tag} · 6×6 B`, series(mB, { weights: AGGRESSIVE, tier }, { weights: AGGRESSIVE, tier }, n, 500));
    line(`${tag} · 8×8 기본`, series(m8, { weights: TUNED, tier }, { weights: TUNED, tier }, n, 600));
    line(
      `${tag} · 8×8 소멸 카드 쓰는 AI vs 안 쓰는 AI`,
      series(m8, { weights: TUNED, tier, loadout: burst }, { weights: TUNED, tier, loadout: burst, cards: false }, n, 700),
    );
  }
  const m8: Matchup = { width: 8, height: 8, decks: full, rules: defaultRules(8, 8), maxTurns: 120 };
  for (const k of [0, 0.3, 1]) {
    line(`처치 가산 kill 0.6 vs ${k} (8×8)`, series(m8, { weights: TUNED, tier }, { weights: { ...TUNED, kill: k }, tier }, n * 2, 800));
  }
}, 7_200_000);
