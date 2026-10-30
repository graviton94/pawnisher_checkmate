import { it } from 'vitest';
import { AI_TIERS, choosePlan } from '../src/ai/search';
import { TUNED } from '../src/data/aiWeights';
import { defaultRules } from '../src/data/battle';
import { createBattle, EMPTY_LOADOUT, FULL_DECK, resolveTurn, type Deck } from '../src/engine';

/** 한 판 피로도 측정: 내 턴 수, 턴당 예약 수, 적 턴 연출 시간 추정, 판 중반의 정체 구간 */
it('fatigue', () => {
  const n = Number(process.env.SIM_GAMES ?? 20);
  const mid: Deck = ['K', 'Q', 'R', 'B', 'N', 'N', 'P', 'P', 'P', 'P', 'P'];
  const cases: [string, number, number, [Deck, Deck]][] = [
    ['8×8 11v11', 8, 8, [mid, mid]],
    ['8×8 16v16', 8, 8, [FULL_DECK, FULL_DECK]],
    ['10×8 16v16', 10, 8, [FULL_DECK, FULL_DECK]],
    ['8×10 16v16', 8, 10, [FULL_DECK, FULL_DECK]],
  ];
  for (const [label, w, h, decks] of cases) {
    const per: string[] = []; let turns = 0, moves = [0, 0], tturns = [0, 0], quiet = 0, quietRun = 0, maxQuiet = 0, decided = 0, hitsPerTurn = 0;
    for (let g = 0; g < n; g++) {
      let s = createBattle({ width: w, height: h, decks, rules: defaultRules(w, h), seed: 900 + g, loadouts: [EMPTY_LOADOUT, EMPTY_LOADOUT] });
      let t = 0, run = 0, maxRunG = 0;
      for (; t < 140 && s.winner === null; t++) {
        const side = s.turnSide;
        const plan = choosePlan(s, { tier: AI_TIERS[2], weights: TUNED, seed: g * 31 + t });
        const r = resolveTurn(s, plan);
        moves[side] += plan.length; tturns[side]++;
        const dmg = r.events.filter((e) => e.type === 'attack').reduce((a, e: any) => a + e.hits.length, 0);
        hitsPerTurn += dmg;
        if (dmg === 0) { quiet++; run++; maxQuiet = Math.max(maxQuiet, run); maxRunG = Math.max(maxRunG, run); } else run = 0;
        s = r.state;
      }
      per.push(`${t}/${maxRunG}`); turns += t; if (s.winner !== null) decided++;
    }
    console.log(`${label}: 결판 ${decided}/${n} · 양측 합 ${(turns / n).toFixed(1)}턴 (내 턴 ${(tturns[0] / n).toFixed(1)}) · 턴당 예약 ${(moves[0] / tturns[0]).toFixed(2)} / 적 ${(moves[1] / tturns[1]).toFixed(2)} · 무타격 턴 ${(100 * quiet / turns).toFixed(0)}% · 최장 무타격 연속 ${maxQuiet} · 턴당 타격 ${(hitsPerTurn / turns).toFixed(2)}`); console.log(`  판별 턴/최장무타격: ${per.join(' ')}`);
  }
}, 3_600_000);
