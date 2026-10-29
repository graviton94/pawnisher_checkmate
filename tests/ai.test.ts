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

  it('승급할 수 있으면 폰을 끝줄로 보낸다', () => {
    // 적(1) 폰이 b2에 있고 b1이 비어 있다. 끝줄(1줄)에 닿으면 퀸.
    const s = board([['K', 0, 'h1'], ['P', 1, 'b2', { moved: true }], ['K', 1, 'h8']], 8, 8, 1);
    const plan = choosePlan(s, { tier: AI_TIERS[2] });
    expect(plan.some((m) => m.pieceId === 2 && 'to' in m && m.to.y === 0)).toBe(true);
  });

  it('여러 턴 앞의 승급을 위해 막히지 않은 폰을 민다', () => {
    const s = board([['K', 0, 'a1'], ['P', 1, 'e4', { moved: true }], ['K', 1, 'h8']], 8, 8, 1);
    const plan = choosePlan(s, { tier: AI_TIERS[2] });
    expect(plan.some((m) => m.pieceId === 2)).toBe(true);
  });

  it('상대 폰의 승급을 막으려 한다: 끝줄 직전의 적 폰을 공격한다', () => {
    // 플레이어(0) 폰이 g7에서 승급 직전. 적 룩은 g4나 c7로 가서 칠 수 있다. 플레이어 킹은 아군 폰 뒤에 숨어 있다.
    const s = board(
      [['K', 0, 'e1'], ['P', 0, 'g7', { moved: true }], ['R', 1, 'c4'], ['K', 1, 'a8'], ['P', 0, 'e2', { moved: true }], ['P', 0, 'd1', { moved: true }]],
      8, 8, 1,
    );
    const after = resolveTurn(s, choosePlan(s, { tier: AI_TIERS[2] })).state;
    const pawn = after.pieces.find((p) => p.id === 2);
    const front = after.pieces.find((p) => p.x === 6 && p.y === 7);
    expect(!pawn || pawn.hp < 25 || front !== undefined).toBe(true);
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
