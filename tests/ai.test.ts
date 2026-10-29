import { describe, expect, it } from 'vitest';
import { AI_TIERS, choosePlan } from '../src/ai/search';
import { checkPlan, createBattle, FULL_DECK, resolveTurn, type BattleState } from '../src/engine';
import { board } from './helpers';

describe('적 AI (GDD 4장)', () => {
  it('즉시 승리할 수 있으면 그 계획을 고른다', () => {
    // 적(1) 차례. 적 룩이 a-파일로 내려와 a1 킹(HP 5)을 칠 수 있다.
    const s: BattleState = board(
      [['K', 0, 'a1', { hp: 5 }], ['R', 1, 'h7'], ['K', 1, 'h8']],
      8, 8, 1,
    );
    const plan = choosePlan(s, { tier: AI_TIERS[0] });
    expect(resolveTurn(s, plan).state.winner).toBe(1);
  });

  it('항상 유효한 계획을 낸다', () => {
    const s = createBattle({ width: 8, height: 8, decks: [FULL_DECK, FULL_DECK] });
    const plan = choosePlan(s);
    expect(checkPlan(s, plan).ok).toBe(true);
  });

  it('같은 상태·시드면 같은 계획 (결정론)', () => {
    const s = createBattle({ width: 8, height: 8, decks: [FULL_DECK, FULL_DECK] });
    expect(choosePlan(s, { seed: 3 })).toEqual(choosePlan(s, { seed: 3 }));
  });

  it('AI끼리 대전해도 규칙 위반 없이 진행된다', () => {
    let s = createBattle({ width: 6, height: 6, decks: [['K', 'P', 'P', 'N'], ['K', 'P', 'P', 'B']] });
    for (let i = 0; i < 40 && s.winner === null; i++) {
      s = resolveTurn(s, choosePlan(s, { tier: AI_TIERS[0] })).state;
    }
    expect(s.pieces.length).toBeGreaterThan(0);
  });
});
