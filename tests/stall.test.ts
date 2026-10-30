import { describe, expect, it } from 'vitest';
import { STALL } from '../src/data/battle';
import { resolveTurn, type BattleEvent, type BattleState } from '../src/engine';
import { board } from './helpers';

/** 아무것도 하지 않는 턴을 n번 (양 진영 번갈아) */
const idle = (s: BattleState, turns: number): { s: BattleState; events: BattleEvent[] } => {
  const events: BattleEvent[] = [];
  for (let i = 0; i < turns; i++) {
    const r = resolveTurn(s, []);
    s = r.state;
    events.push(...r.events);
  }
  return { s, events };
};

describe('정체 압박 (GDD 12장 F1, D-072)', () => {
  it('첫 grace 라운드가 지난 뒤 피해 없는 라운드가 이어지면 붕괴가 앞당겨 시작된다', () => {
    const s0 = board([['K', 0, 'a1'], ['K', 1, 'h8']]);
    s0.rules = { ...s0.rules, collapseStart: 15 };
    const { s, events } = idle(s0, 2 * (STALL.grace + STALL.rounds + 1));
    expect(events.some((e) => e.type === 'stall' && e.count === STALL.rounds)).toBe(true);
    expect(s.rules.collapseStart).toBeLessThan(15);
    expect(events.some((e) => e.type === 'collapse')).toBe(true);
  });

  it('서로 다가가는 첫 grace 라운드에는 세지 않는다', () => {
    const s0 = board([['K', 0, 'a1'], ['K', 1, 'h8']]);
    s0.rules = { ...s0.rules, collapseStart: 15 };
    const { s, events } = idle(s0, 2 * STALL.grace);
    expect(events.some((e) => e.type === 'stall')).toBe(false);
    expect(s.rules.collapseStart).toBe(15);
  });

  it('입력 상태는 바꾸지 않는다 (결정론)', () => {
    const s0 = board([['K', 0, 'a1'], ['K', 1, 'h8']]);
    s0.rules = { ...s0.rules, collapseStart: 15 };
    const { s } = idle(s0, 2 * (STALL.grace + 1));
    const snap = JSON.stringify(s);
    resolveTurn(s, []);
    expect(JSON.stringify(s)).toBe(snap);
  });
});

describe('명예로운 항복 (D-077)', () => {
  it('적에게 킹만 남고 폭주를 썼고 내 일반 기물이 3기 이상이면, 적 차례가 시작될 때 항복한다', () => {
    const s0 = board([['K', 0, 'a1'], ['R', 0, 'a2'], ['N', 0, 'b1'], ['P', 0, 'c2'], ['K', 1, 'h8']]);
    s0.lastStrike = ['none', 'used'];
    const r = resolveTurn(s0, []);
    expect(r.state.winner).toBe(0);
    expect(r.events.some((e) => e.type === 'resign')).toBe(true);
  });

  it('폭주를 아직 안 썼으면 항복하지 않는다 (역전수)', () => {
    const s0 = board([['K', 0, 'a1'], ['R', 0, 'a2'], ['N', 0, 'b1'], ['P', 0, 'c2'], ['K', 1, 'h8']]);
    s0.lastStrike = ['none', 'ready'];
    expect(resolveTurn(s0, []).state.winner).toBeNull();
  });
});
