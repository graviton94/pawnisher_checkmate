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

describe('이형 2차 (D-106)', () => {
  it('보일러 폰: 쓰러지면 주변 8칸 적에게 터진다', () => {
    const s = board([['K', 0, 'h1'], ['R', 0, 'a1'], ['P', 1, 'a6', { hp: 1, maxHp: 1, variant: 'boiler', atk: 30 }], ['P', 1, 'b7', { hp: 500, maxHp: 500 }], ['K', 1, 'h8']]);
    // 터짐은 보일러 폰의 적(여기선 내 기물)만 친다 — 옆의 같은 편 b7은 안 맞는다
    const r = simulate(s, [{ pieceId: 2, to: sq('a2') }]);
    expect(r.events.some((e) => e.type === 'blast')).toBe(false);
    const s2 = board([['K', 0, 'h1'], ['R', 0, 'a1'], ['P', 1, 'a6', { hp: 1, maxHp: 1, variant: 'boiler', atk: 30 }], ['N', 0, 'b7', { hp: 500, maxHp: 500 }], ['K', 1, 'h8']]);
    const r2 = simulate(s2, [{ pieceId: 2, to: sq('a2') }]);
    expect(r2.events.some((e) => e.type === 'blast' && e.hits.some((h) => h.targetId === 4))).toBe(true);
  });
  it('용수철 나이트: 한 턴에 두 번, 두 번째는 태엽 +1', () => {
    const s = board([['K', 0, 'h1'], ['N', 0, 'b1', { variant: 'spring' }], ['K', 1, 'h8']]);
    const r = simulate(s, [{ pieceId: 2, to: sq('c3') }, { pieceId: 2, to: sq('d5') }]);
    expect(r.ok).toBe(true);
    const one = simulate(s, [{ pieceId: 2, to: sq('c3') }]).apUsed;
    expect(r.apUsed).toBe(one * 2 + 1);
    expect(simulate(s, [{ pieceId: 2, to: sq('c3') }, { pieceId: 2, to: sq('d5') }, { pieceId: 2, to: sq('e7') }]).ok).toBe(false);
    const plain = board([['K', 0, 'h1'], ['N', 0, 'b1'], ['K', 1, 'h8']]);
    expect(simulate(plain, [{ pieceId: 2, to: sq('c3') }, { pieceId: 2, to: sq('d5') }]).ok).toBe(false);
  });
  it('조준경 비숍: 맞힌 적에게 뒤 순번 공격이 더 아프다', () => {
    const mk = (variant?: 'scope') => {
      const st = board([['K', 0, 'h1'], ['B', 0, 'c1', variant ? { variant } : {}], ['R', 0, 'a1'], ['P', 1, 'a5', { hp: 900, maxHp: 900 }], ['K', 1, 'h8']]);
      st.apBonus[0] = 5;
      return st;
    };
    // 비숍 c1 → d2 (사선 c3·b4·a5로 조준) → 룩 a1 → a2 (같은 a5를 친다)
    const plan2 = [{ pieceId: 2, to: sq('d2') }, { pieceId: 3, to: sq('a2') }];
    const rookDmg = (st: ReturnType<typeof mk>) => simulate(st, plan2).events.filter((e) => e.type === 'attack' && e.attackerId === 3).flatMap((e) => (e.type === 'attack' ? e.hits.map((h) => h.damage) : [])).reduce((a, b) => a + b, 0);
    expect(rookDmg(mk('scope'))).toBeGreaterThan(rookDmg(mk()));
  });
  it('포탑 룩: 움직이지 않고 태엽 2로 친다', () => {
    const s = board([['K', 0, 'h1'], ['R', 0, 'a1', { variant: 'turret' }], ['P', 1, 'a6', { hp: 500, maxHp: 500 }], ['K', 1, 'h8']]);
    const r = simulate(s, [{ kind: 'stand', pieceId: 2 }]);
    expect(r.ok).toBe(true);
    expect(r.apUsed).toBe(2);
    expect(r.events.some((e) => e.type === 'attack' && e.hits.some((h) => h.targetId === 3))).toBe(true);
    const plain = board([['K', 0, 'h1'], ['R', 0, 'a1'], ['P', 1, 'a6'], ['K', 1, 'h8']]);
    expect(simulate(plain, [{ kind: 'stand', pieceId: 2 }]).ok).toBe(false);
  });
  it('지휘 퀸: 이동해 치면 다음 명령 태엽 0', () => {
    const s = board([['K', 0, 'h1'], ['Q', 0, 'd1', { variant: 'command' }], ['R', 0, 'a1'], ['K', 1, 'h8']]);
    const q = simulate(s, [{ pieceId: 2, to: sq('d3') }]).apUsed;
    const r = simulate(s, [{ pieceId: 2, to: sq('d3') }, { pieceId: 3, to: sq('a4') }]);
    expect(r.ok).toBe(true);
    expect(r.apUsed).toBe(q);
  });
});
