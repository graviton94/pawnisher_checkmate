import { it } from 'vitest';
import { AI_TIERS } from '../src/ai/search';
import { TUNED } from '../src/data/aiWeights';
import { FULL_DECK, type Loadout } from '../src/engine';
import { score, series } from '../src/sim/arena';

/** AI가 카드·인챈트 행동을 쓰면 실제로 강해지는가 (GDD 4장 §4-B) */
it('cards', () => {
  const n = Number(process.env.SIM_GAMES ?? 30);
  const m = { width: 8, height: 8, decks: [FULL_DECK, FULL_DECK] as [typeof FULL_DECK, typeof FULL_DECK], maxTurns: 100 };
  const kits: Record<string, Loadout> = {
    '유지 카드 (A01 A03 A04 A06)': { enchants: {}, cards: ['A01', 'A03', 'A04', 'A06'], forge: {} },
    '소멸 카드 (C01 C03 C04 C06)': { enchants: {}, cards: ['C01', 'C03', 'C04', 'C06'], forge: {} },
    '합체 (E11 2장 + C05)': { enchants: { E11: 2 }, cards: ['C05', 'A02', 'A05', 'C02'], forge: {} },
  };
  for (const [label, loadout] of Object.entries(kits)) {
    const t0 = Date.now();
    const r = series(m, { weights: TUNED, tier: AI_TIERS[1], loadout }, { weights: TUNED, tier: AI_TIERS[1], loadout, cards: false }, n, 4000);
    const ms = (Date.now() - t0) / n;
    console.log(`${label}: 카드 쓰는 AI ${(score(r) * 100).toFixed(0)}% (${r.wins}승 ${r.draws}무 ${r.losses}패), 평균 ${r.avgTurns.toFixed(0)}턴, 판당 ${(ms / 1000).toFixed(1)}초`);
  }
}, 3_600_000);
