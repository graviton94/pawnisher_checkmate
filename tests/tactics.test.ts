import { describe, expect, it } from 'vitest';
import { simulate, type BattleEvent, type BattleState } from '../src/engine';
import { board, sq } from './helpers';

const tactics = (events: BattleEvent[]) => events.flatMap((e) => (e.type === 'tactic' ? [e.tactic] : []));
const tough = { hp: 500, maxHp: 500 };
const withEnchant = (s: BattleState, id: 'E02', n: number) => {
  s.loadouts[0].enchants[id] = n;
  return s;
};

describe('전술 키워드 (GDD 11장 A1, D-094)', () => {
  it('포크: 한 공격이 적 둘 이상을 친다', () => {
    const s = board([['K', 0, 'h1'], ['N', 0, 'b1'], ['P', 1, 'b5', tough], ['P', 1, 'e4', tough], ['K', 1, 'h8']]);
    const r = simulate(s, [{ pieceId: 2, to: sq('c3') }]);
    expect(r.ok).toBe(true);
    expect(tactics(r.events)).toContain('fork');
    expect(r.state.record?.[0].tactics.fork).toBe(1);
  });

  it('적 하나만 치면 포크가 아니다', () => {
    const s = board([['K', 0, 'h1'], ['N', 0, 'b1'], ['P', 1, 'b5', tough], ['K', 1, 'h8']]);
    expect(tactics(simulate(s, [{ pieceId: 2, to: sq('c3') }]).events)).not.toContain('fork');
  });

  it('관통: 사선이 첫 적을 꿰뚫고 뒤의 적까지 친다', () => {
    const s = withEnchant(board([['K', 0, 'h1'], ['B', 0, 'c1'], ['P', 1, 'f4', tough], ['P', 1, 'g5', tough], ['K', 1, 'h7']]), 'E02', 2);
    const r = simulate(s, [{ pieceId: 2, to: sq('d2') }]);
    expect(r.ok).toBe(true);
    expect(tactics(r.events)).toContain('pierce');
  });

  it('사선 개척: 앞 순번이 비켜 연 사선으로 친다', () => {
    const s = board([['K', 0, 'h1'], ['R', 0, 'a1'], ['N', 0, 'a3'], ['P', 1, 'a7', tough], ['K', 1, 'h8']]);
    const r = simulate(s, [{ pieceId: 3, to: sq('c4') }, { pieceId: 2, to: sq('a2') }]);
    expect(r.ok).toBe(true);
    expect(tactics(r.events)).toContain('discover');
    // 비켜 준 기물 없이 친 사선은 아니다
    const plain = board([['K', 0, 'h1'], ['R', 0, 'a1'], ['P', 1, 'a7', tough], ['K', 1, 'h8']]);
    expect(tactics(simulate(plain, [{ pieceId: 2, to: sq('a2') }]).events)).not.toContain('discover');
  });

  it('돌파: 앞 순번이 처치해 비운 칸에 내려앉아 친다', () => {
    const s = board([['K', 0, 'h1'], ['R', 0, 'a1'], ['N', 0, 'c4'], ['P', 1, 'a5', { hp: 1, maxHp: 1 }], ['P', 1, 'b7', tough], ['K', 1, 'h8']]);
    const r = simulate(s, [{ pieceId: 2, to: sq('a2') }, { pieceId: 3, to: sq('a5') }]);
    expect(r.ok).toBe(true);
    expect(tactics(r.events)).toContain('breach');
    // 빈 칸이 아닌 곳에 내려앉으면 아니다
    const r2 = simulate(s, [{ pieceId: 2, to: sq('a2') }, { pieceId: 3, to: sq('b6') }]);
    expect(r2.ok).toBe(true);
    expect(tactics(r2.events)).not.toContain('breach');
  });

  it('연쇄: 한 턴에 셋째 처치에서 한 번', () => {
    const weak = { hp: 1, maxHp: 1 };
    const s = board([['K', 0, 'h1'], ['N', 0, 'b1'], ['N', 0, 'g1'], ['P', 1, 'b5', weak], ['P', 1, 'e4', weak], ['P', 1, 'g5', weak], ['K', 1, 'a8']]);
    const r = simulate(s, [{ pieceId: 2, to: sq('c3') }, { pieceId: 3, to: sq('h3') }]);
    expect(r.ok).toBe(true);
    expect(tactics(r.events).filter((t) => t === 'chain')).toHaveLength(1);
  });

  it('결정타 기록: 적 킹을 쓰러뜨린 기물의 유형', () => {
    const s = board([['K', 0, 'h1'], ['P', 0, 'c2'], ['K', 1, 'd4', { hp: 1, maxHp: 1 }]]);
    const r = simulate(s, [{ pieceId: 2, to: sq('c3') }]);
    expect(r.state.winner).toBe(0);
    expect(r.state.record?.[0].finisher).toBe('P');
  });
});
