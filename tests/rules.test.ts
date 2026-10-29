import { describe, expect, it } from 'vitest';
import { attackTargets, findPiece, legalMoves, toSquare } from '../src/engine';
import { board } from './helpers';

const movesOf = (s: ReturnType<typeof board>, id: number) =>
  legalMoves(s, findPiece(s, id)!).map(toSquare).sort();

const targetsOf = (s: ReturnType<typeof board>, id: number) =>
  attackTargets(s, findPiece(s, id)!).map((p) => p.id).sort();

describe('행마 (GDD 2장)', () => {
  it('폰: 전방 1칸, 첫 이동은 2칸', () => {
    const s = board([['P', 0, 'e2'], ['K', 0, 'a1'], ['K', 1, 'a8']]);
    expect(movesOf(s, 1)).toEqual(['e3', 'e4']);
  });

  it('폰: 이미 이동했으면 1칸만', () => {
    const s = board([['P', 0, 'e3', { moved: true }], ['K', 0, 'a1'], ['K', 1, 'a8']]);
    expect(movesOf(s, 1)).toEqual(['e4']);
  });

  it('폰: 정면이 막히면 이동 불가 (2칸 이동도 불가)', () => {
    const s = board([['P', 0, 'e2'], ['P', 1, 'e3'], ['K', 0, 'a1'], ['K', 1, 'a8']]);
    expect(movesOf(s, 1)).toEqual([]);
  });

  it('폰: 적 폰은 아래로 전진한다', () => {
    const s = board([['P', 1, 'd7'], ['K', 0, 'a1'], ['K', 1, 'a8']]);
    expect(movesOf(s, 1)).toEqual(['d5', 'd6']);
  });

  it('나이트: 경로 무시 도약, 빈 칸에만 착지', () => {
    const s = board([['N', 0, 'b1'], ['P', 0, 'b2'], ['P', 0, 'c2'], ['P', 1, 'c3'], ['K', 0, 'h1'], ['K', 1, 'h8']]);
    expect(movesOf(s, 1)).toEqual(['a3', 'd2']);
  });

  it('룩: 아군·적군 모두에 막히고 그 칸에는 착지하지 않는다', () => {
    const s = board([['R', 0, 'a1'], ['P', 0, 'a3'], ['P', 1, 'c1'], ['K', 0, 'h1'], ['K', 1, 'h8']]);
    expect(movesOf(s, 1)).toEqual(['a2', 'b1']);
  });

  it('킹: 주변 8칸', () => {
    const s = board([['K', 0, 'e4'], ['K', 1, 'a8']]);
    expect(movesOf(s, 1)).toHaveLength(8);
  });
});

describe('공격 범위 (GDD 2장 §2.3)', () => {
  it('폰: 대각선 전방 2칸만, 정면은 치지 않는다', () => {
    const s = board([['P', 0, 'e4'], ['P', 1, 'd5'], ['P', 1, 'e5'], ['P', 1, 'f5'], ['K', 0, 'a1'], ['K', 1, 'a8']]);
    expect(targetsOf(s, 1)).toEqual([2, 4]);
  });

  it('사선: 방향마다 첫 적만, 그 뒤 적은 맞지 않는다', () => {
    const s = board([['R', 0, 'a1'], ['P', 1, 'a4'], ['P', 1, 'a6'], ['K', 0, 'h2'], ['K', 1, 'h8']]);
    expect(targetsOf(s, 1)).toEqual([2]);
  });

  it('사선: 앞에 아군이 있으면 막힌다', () => {
    const s = board([['B', 0, 'c1'], ['P', 0, 'd2'], ['K', 1, 'f4'], ['K', 0, 'h1']]);
    expect(targetsOf(s, 1)).toEqual([]);
  });

  it('나이트: L자 8칸의 모든 적', () => {
    const s = board([['N', 0, 'd4'], ['P', 1, 'c6'], ['P', 1, 'e6'], ['P', 1, 'f3'], ['P', 1, 'd5'], ['K', 0, 'a1'], ['K', 1, 'a8']]);
    expect(targetsOf(s, 1)).toEqual([2, 3, 4]);
  });

  it('아군은 공격 대상이 아니다', () => {
    const s = board([['K', 0, 'e4'], ['P', 0, 'e5'], ['K', 1, 'a8']]);
    expect(targetsOf(s, 1)).toEqual([]);
  });
});
