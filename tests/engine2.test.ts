import { describe, expect, it } from 'vitest';
import { checkPlan, createBattle, damageOf, moveCost, simulate, resolveTurn, sq } from './engine2-helpers';
import { board } from './helpers';
import { PIECE_STATS } from '../src/data/pieces';

describe('규격 2.0 엔진 (D-138)', () => {
  it('각인: 태엽 −1 · 단조는 공격과 HP +30% · 철갑은 받는 피해 −30%', () => {
    const s = board([['K', 0, 'a1'], ['N', 0, 'b1', { carve: 'haste' }], ['K', 1, 'h8']]);
    expect(moveCost(s, s.pieces[1])).toBe(PIECE_STATS.N.ap - 1);
    const b = createBattle({ width: 6, height: 6, decks: [['K', { t: 'R', carve: 'forged' }], ['K']] });
    const rook = b.pieces.find((p) => p.type === 'R')!;
    expect(rook.maxHp).toBe(Math.round(PIECE_STATS.R.hp * 1.3));
    expect(rook.atk).toBe(Math.round(PIECE_STATS.R.atk * 1.3));
    const t = board([['K', 0, 'a1'], ['R', 0, 'a4'], ['P', 1, 'a6', { carve: 'plate' }], ['K', 1, 'h8']]);
    const plain = board([['K', 0, 'a1'], ['R', 0, 'a4'], ['P', 1, 'a6'], ['K', 1, 'h8']]);
    expect(damageOf(t, t.pieces[1], t.pieces[2])).toBeLessThan(damageOf(plain, plain.pieces[1], plain.pieces[2]));
  });

  it('십자 튐: 착지 칸 상하좌우 적에게 50%', () => {
    // 나이트가 c3로 뛰어 b5를 친다 — c3 옆(c4)의 적이 튐을 맞는다
    const s = board([['K', 0, 'a1'], ['N', 0, 'b1', { carve: 'cross' }], ['P', 1, 'b5'], ['P', 1, 'c4'], ['K', 1, 'h8']]);
    const sim = simulate(s, [{ pieceId: 2, to: sq('c3') }]);
    expect(sim.ok).toBe(true);
    const splash = sim.events.flatMap((e) => (e.type === 'attack' ? e.hits : [])).filter((h) => h.splash);
    expect(splash.some((h) => h.targetId === 4)).toBe(true);
  });

  it('관통 각인: 룩이 첫 적을 지나 한 기 더', () => {
    const s = board([['K', 0, 'h1'], ['R', 0, 'a1', { carve: 'pierce' }], ['P', 1, 'b4'], ['P', 1, 'b6'], ['K', 1, 'h8']]);
    const sim = simulate(s, [{ pieceId: 2, to: sq('b1') }]);
    const hit = sim.events.flatMap((e) => (e.type === 'attack' ? e.hits : [])).map((h) => h.targetId);
    expect(hit).toEqual(expect.arrayContaining([3, 4]));
  });

  it('부품: 축전기 태엽 +1 · 서류 검문은 명령 셋까지', () => {
    const s = board([['K', 0, 'a1'], ['K', 1, 'h8']]);
    s.loadouts[0].parts = ['capacitor'];
    expect(checkPlan(s, []).ok).toBe(true);
    const many = board([['K', 0, 'a1'], ['P', 0, 'b2'], ['P', 0, 'c2'], ['P', 0, 'd2'], ['P', 0, 'e2'], ['K', 1, 'h8']]);
    many.twist = 'papers';
    const plan = ['b3', 'c3', 'd3', 'e3'].map((t, i) => ({ pieceId: i + 2, to: sq(t) }));
    expect(simulate(many, plan.slice(0, 3)).ok).toBe(true);
    expect(simulate(many, plan).ok).toBe(false);
  });

  it('비틀기: 성벽 룩은 곧은 선에서 덜 맞고 대각선에선 그대로', () => {
    const s = board([['K', 0, 'h1'], ['B', 0, 'a1'], ['R', 0, 'd1'], ['R', 1, 'd5'], ['K', 1, 'h8']]);
    const plainStraight = damageOf(s, s.pieces[2], s.pieces[3]);
    s.twist = 'wall';
    expect(damageOf(s, s.pieces[2], s.pieces[3])).toBeLessThan(plainStraight);
    const diag = { ...s.pieces[1], x: 1, y: 2 };
    const before = damageOf({ ...s, twist: undefined }, diag, s.pieces[3]);
    expect(damageOf(s, diag, s.pieces[3])).toBe(before);
  });

  it('양산 라인: 쓰러진 적 폰이 뒷줄에 다시 선다', () => {
    const s = board([['K', 0, 'a1'], ['R', 0, 'c1'], ['P', 1, 'c5', { hp: 1 }], ['K', 1, 'h8']], 8, 8);
    s.twist = 'line';
    const r = resolveTurn(s, [{ pieceId: 2, to: sq('c2') }]);
    expect(r.events.some((e) => e.type === 'respawn')).toBe(true);
    expect(r.state.pieces.some((p) => p.side === 1 && p.type === 'P' && p.y === 7)).toBe(true);
  });

  it('정예: HP 두 배', () => {
    const b = createBattle({ width: 6, height: 6, decks: [['K'], ['K', { t: 'R', elite: true }]] });
    expect(b.pieces.find((p) => p.side === 1 && p.type === 'R')!.maxHp).toBe(PIECE_STATS.R.hp * 2);
  });
});
