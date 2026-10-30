import { describe, expect, it } from 'vitest';
import { RADIATOR_SHIELD } from '../src/data/variants';
import { attackScan, createBattle, legalMoves, resolveTurn, simulate } from '../src/engine';
import { board, sq } from './helpers';

describe('이형 거푸집 (GDD 13장 P2, D-084)', () => {
  it('컨베이어 폰: 바로 앞 명령이 폰 이동이면 태엽 0, 대신 첫 이동 2칸이 없다', () => {
    const s = board([['K', 0, 'e1'], ['P', 0, 'c2', { variant: 'conveyor' }], ['P', 0, 'd2', { variant: 'conveyor' }], ['K', 1, 'e8']]);
    const r = simulate(s, [{ pieceId: 2, to: sq('c3') }, { pieceId: 3, to: sq('d3') }]);
    expect(r.ok).toBe(true);
    expect(r.apUsed).toBe(1);
    expect(legalMoves(s, s.pieces[1]).some((p) => p.y === 3)).toBe(false);
    const plain = board([['K', 0, 'e1'], ['P', 0, 'c2'], ['P', 0, 'd2'], ['K', 1, 'e8']]);
    expect(simulate(plain, [{ pieceId: 2, to: sq('c3') }, { pieceId: 3, to: sq('d3') }]).apUsed).toBe(2);
  });

  it('쇠망치 나이트: 착지 공격에 맞은 적을 1칸 튕겨 낸다', () => {
    const s = board([['K', 0, 'a1'], ['N', 0, 'b1', { variant: 'hammer' }], ['P', 1, 'e4', { hp: 200, maxHp: 200 }], ['K', 1, 'h8']]);
    const r = simulate(s, [{ pieceId: 2, to: sq('c3') }]);
    expect(r.ok).toBe(true);
    const pawn = r.state.pieces.find((p) => p.id === 3)!;
    expect([pawn.x, pawn.y]).toEqual([sq('f5').x, sq('f5').y]);
  });

  it('반사경 비숍: 대각 사선이 판 가장자리에서 한 번 꺾인다', () => {
    const specs = (variant?: 'mirror') => board([['K', 0, 'h1'], ['B', 0, 'c1', variant ? { variant } : {}], ['P', 1, 'c5'], ['K', 1, 'h8']]);
    const hit = (s: ReturnType<typeof board>) => attackScan(s, s.pieces[1]).targets.some((t) => t.id === 3);
    expect(hit(specs())).toBe(false);
    expect(hit(specs('mirror'))).toBe(true);
  });

  it('방열 룩: 지난 자기 턴에 움직이지 않았으면 턴 시작에 상하좌우 아군에 방열판', () => {
    const s0 = board([['K', 0, 'a1'], ['R', 0, 'd4', { variant: 'radiator' }], ['P', 0, 'd5'], ['K', 1, 'h8']]);
    const after = resolveTurn(resolveTurn(s0, []).state, []).state;
    expect(after.pieces.find((p) => p.id === 3)!.shield).toBe(RADIATOR_SHIELD);
    // 움직인 턴 다음에는 주지 않는다
    const moved = resolveTurn(resolveTurn(s0, [{ pieceId: 2, to: sq('e4') }]).state, []).state;
    expect(moved.pieces.find((p) => p.id === 3)!.shield).toBe(0);
  });

  it('장비의 이형은 그 유형 전체에 입혀진다', () => {
    const s = createBattle({ width: 8, height: 8, decks: [['K', 'N', 'N', 'P'], ['K']], loadouts: [{ enchants: {}, cards: [], forge: {}, variants: { N: 'hammer' } }, { enchants: {}, cards: [], forge: {} }] });
    const knights = s.pieces.filter((p) => p.side === 0 && p.type === 'N');
    expect(knights.every((p) => p.variant === 'hammer')).toBe(true);
    expect(s.pieces.find((p) => p.type === 'P')!.variant).toBeUndefined();
  });
});
