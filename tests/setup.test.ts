import { describe, expect, it } from 'vitest';
import { createBattle, FULL_DECK, toSquare, type BattleState } from '../src/engine';

const layout = (s: BattleState, side: 0 | 1) =>
  s.pieces
    .filter((p) => p.side === side)
    .map((p) => `${p.type}${toSquare(p)}`)
    .sort();

describe('배치 (GDD 6장 §6.4)', () => {
  it('8×8 풀 덱은 정통 체스 배치와 같다', () => {
    const s = createBattle({ width: 8, height: 8, decks: [FULL_DECK, FULL_DECK] });
    expect(layout(s, 0)).toEqual(
      ['Ra1', 'Nb1', 'Bc1', 'Qd1', 'Ke1', 'Bf1', 'Ng1', 'Rh1', 'Pa2', 'Pb2', 'Pc2', 'Pd2', 'Pe2', 'Pf2', 'Pg2', 'Ph2'].sort(),
    );
    expect(layout(s, 1)).toContain('Ke8');
    expect(layout(s, 1)).toContain('Pa7');
  });

  it('작은 덱: 폰은 킹 앞 열부터 채운다', () => {
    const s = createBattle({ width: 6, height: 6, decks: [['K', 'P', 'P', 'P'], ['K', 'P', 'P']] });
    // 폭 6 후열 R N Q K B R → 킹은 d열
    expect(layout(s, 0)).toEqual(['Kd1', 'Pc2', 'Pd2', 'Pe2'].sort());
    expect(layout(s, 1)).toEqual(['Kd6', 'Pc5', 'Pd5'].sort());
  });

  it('한도 초과 기물은 가까운 빈 후열 슬롯에 놓인다', () => {
    const s = createBattle({ width: 8, height: 8, decks: [['K', 'N', 'N', 'N'], ['K']] });
    const knights = s.pieces.filter((p) => p.side === 0 && p.type === 'N').map(toSquare).sort();
    expect(knights).toHaveLength(3);
    expect(knights).toContain('b1');
    expect(knights).toContain('g1');
  });

  it('킹이 없는 덱은 거부한다', () => {
    expect(() => createBattle({ width: 8, height: 8, decks: [['Q'], ['K']] })).toThrow();
  });
});
