import { it } from 'vitest';
import { AI_TIERS, choosePlan } from '../src/ai/search';
import { TUNED } from '../src/data/aiWeights';
import { defaultRules } from '../src/data/battle';
import { PIECE_STATS } from '../src/data/pieces';
import { createBattle, EMPTY_LOADOUT, FULL_DECK, resolveTurn, type BattleState, type Deck, type Side } from '../src/engine';

/**
 * 가호 붕괴(F4) 대신 "기관 기권" 검증: 기권 조건이 걸린 쪽이 실제로 역전한 적이 있는가 (= 역전수를 빼앗는가),
 * 그리고 기권으로 줄어드는 턴 수.
 */
const army = (s: BattleState, side: Side) => s.pieces.filter((p) => p.side === side && p.type !== 'K');
const material = (s: BattleState, side: Side) => army(s, side).reduce((a, p) => a + PIECE_STATS[p.type].value * (p.hp / p.maxHp), 0);
const opp = (side: Side) => (1 - side) as Side;
const kingHp = (s: BattleState, side: Side) => {
  const k = s.pieces.find((p) => p.side === side && p.type === 'K');
  return k ? k.hp / k.maxHp : 0;
};
const alone = (s: BattleState, side: Side) => army(s, side).length === 0 && s.lastStrike[side] === 'used';
const conds: Record<string, (s: BattleState, side: Side) => boolean> = {
  '킹만 남음 + 폭주 사용함': alone,
  'A: + 상대 3기 이상': (s, side) => alone(s, side) && army(s, opp(side)).length >= 3,
  'B: A + 내 킹 HP 50% 이하': (s, side) => alone(s, side) && army(s, opp(side)).length >= 3 && kingHp(s, side) <= 0.5,
  'C: + 상대 전력 60 이상 + 상대 킹 HP 30% 초과': (s, side) => alone(s, side) && material(s, opp(side)) >= 60 && kingHp(s, opp(side)) > 0.3,
  '전력 20% 미만 · 상대 3기 이상': (s, side) => material(s, side) < 0.2 * material(s, opp(side)) && army(s, opp(side)).length >= 3,
};

it('resign', () => {
  const n = Number(process.env.SIM_GAMES ?? 30);
  const mid: Deck = ['K', 'Q', 'R', 'B', 'N', 'N', 'P', 'P', 'P', 'P', 'P'];
  const cases: [string, number, number, [Deck, Deck], number, number][] = [
    ['8×8 16v16 단계1v1', 8, 8, [FULL_DECK, FULL_DECK], 1, 1],
    ['8×8 11v11 단계0v2', 8, 8, [mid, mid], 0, 2],
    ['10×8 16v16 단계1v1', 10, 8, [FULL_DECK, FULL_DECK], 1, 1],
  ];
  const tally: Record<string, { trig: number; comeback: number; saved: number }> = {};
  for (const k of Object.keys(conds)) tally[k] = { trig: 0, comeback: 0, saved: 0 };
  let games = 0;
  for (const [, w, h, decks, t0, t1] of cases) {
    for (let g = 0; g < n; g++) {
      let s = createBattle({ width: w, height: h, decks, rules: defaultRules(w, h), seed: 3000 + g, loadouts: [EMPTY_LOADOUT, EMPTY_LOADOUT] });
      const first: Record<string, { side: Side; turn: number } | undefined> = {};
      let turn = 0;
      for (; turn < 140 && s.winner === null; turn++) {
        for (const [k, c] of Object.entries(conds)) if (!first[k] && c(s, s.turnSide)) first[k] = { side: s.turnSide, turn };
        const tier = s.turnSide === 0 ? t0 : t1;
        s = resolveTurn(s, choosePlan(s, { tier: AI_TIERS[tier], weights: TUNED, seed: g * 977 + turn })).state;
      }
      games++;
      for (const [k, f] of Object.entries(first)) {
        if (!f) continue;
        tally[k].trig++;
        if (s.winner === f.side) tally[k].comeback++;
        tally[k].saved += turn - f.turn;
      }
    }
  }
  for (const [k, v] of Object.entries(tally))
    console.log(`${k}: 발동 ${v.trig}/${games}판 · 그 쪽이 역전승 ${v.comeback}판 · 줄어드는 턴 평균 ${v.trig ? (v.saved / v.trig).toFixed(1) : '-'}`);
}, 3_600_000);
