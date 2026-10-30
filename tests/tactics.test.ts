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
    const s = board([['K', 0, 'h1'], ['N', 0, 'b1'], ['P', 1, 'b5', tough], ['B', 1, 'e4', tough], ['K', 1, 'h8']]);
    const r = simulate(s, [{ pieceId: 2, to: sq('c3') }]);
    expect(r.ok).toBe(true);
    expect(tactics(r.events)).toContain('fork');
    // 폰만 둘은 포크가 아니다
    const pawns = board([['K', 0, 'h1'], ['N', 0, 'b1'], ['P', 1, 'b5', tough], ['P', 1, 'e4', tough], ['K', 1, 'h8']]);
    expect(tactics(simulate(pawns, [{ pieceId: 2, to: sq('c3') }]).events)).not.toContain('fork');
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

describe('키워드 연계 개조 (GDD 11장 B4, D-095)', () => {
  const ench = (s: BattleState, id: 'E17' | 'E18' | 'E19' | 'E20', n: number) => {
    s.loadouts[0].enchants[id] = n;
    return s;
  };
  const dmgTo = (events: BattleEvent[], id: number) =>
    events.flatMap((e) => (e.type === 'attack' ? e.hits.filter((h) => h.targetId === id && !h.splash).map((h) => h.damage) : []))[0] ?? 0;
  const fork = () => board([['K', 0, 'h1'], ['N', 0, 'b1'], ['P', 1, 'b5', tough], ['B', 1, 'e4', tough], ['K', 1, 'h8']]);

  it('갈래 톱날: 포크 피해가 늘고, 2단이면 태엽 +1, ★이면 한 번 더 친다', () => {
    const base = dmgTo(simulate(fork(), [{ pieceId: 2, to: sq('c3') }]).events, 3);
    const r1 = simulate(ench(fork(), 'E17', 1), [{ pieceId: 2, to: sq('c3') }]);
    expect(dmgTo(r1.events, 3)).toBeGreaterThan(base);
    const r2 = simulate(ench(fork(), 'E17', 2), [{ pieceId: 2, to: sq('c3') }]);
    expect(r2.events.some((e) => e.type === 'apGain')).toBe(true);
    const r3 = simulate(ench(fork(), 'E17', 3), [{ pieceId: 2, to: sq('c3') }]);
    const extra = r3.events.flatMap((e) => (e.type === 'attack' ? e.hits.filter((h) => h.splash) : []));
    expect(extra).toHaveLength(2);
  });

  it('천공 드릴: 룩 사선도 첫 적을 꿰뚫고(관통), 2단이면 뒤의 적 피해가 크다', () => {
    const rook = () => board([['K', 0, 'h1'], ['R', 0, 'a1'], ['P', 1, 'a5', tough], ['P', 1, 'a7', tough], ['K', 1, 'h8']]);
    expect(tactics(simulate(rook(), [{ pieceId: 2, to: sq('a2') }]).events)).not.toContain('pierce');
    const r1 = simulate(ench(rook(), 'E18', 1), [{ pieceId: 2, to: sq('a2') }]);
    expect(tactics(r1.events)).toContain('pierce');
    const r2 = simulate(ench(rook(), 'E18', 2), [{ pieceId: 2, to: sq('a2') }]);
    expect(dmgTo(r2.events, 4)).toBeGreaterThan(dmgTo(r1.events, 4));
  });

  it('돌파 쐐기: 돌파 피해가 늘고, ★이면 착지 칸 주변 적도 맞는다', () => {
    const land = () => board([['K', 0, 'h1'], ['R', 0, 'a1'], ['N', 0, 'c4'], ['P', 1, 'a5', { hp: 1, maxHp: 1 }], ['P', 1, 'b7', tough], ['P', 1, 'b6', tough], ['K', 1, 'h8']]);
    const plan = [{ pieceId: 2, to: sq('a2') }, { pieceId: 3, to: sq('a5') }];
    const base = dmgTo(simulate(land(), plan).events, 5);
    expect(dmgTo(simulate(ench(land(), 'E19', 1), plan).events, 5)).toBeGreaterThan(base);
    const r3 = simulate(ench(land(), 'E19', 3), plan);
    expect(r3.events.some((e) => e.type === 'attack' && e.hits.some((h) => h.targetId === 6 && h.splash))).toBe(true);
  });

  it('체크 경보기: 체크를 건 기물 방열판, 2단이면 킹 피해 +30%', () => {
    const chk = () => {
      const s = board([['K', 0, 'h1'], ['R', 0, 'a1'], ['K', 1, 'a6', { hp: 5, maxHp: 50 }]]);
      s.rules.checkmate = true;
      return s;
    };
    const r1 = simulate(ench(chk(), 'E20', 1), [{ pieceId: 2, to: sq('a2') }]);
    expect(tactics(r1.events)).toContain('check');
    expect(r1.state.pieces.find((p) => p.id === 2)!.shield).toBe(15);
    const plain = board([['K', 0, 'h1'], ['R', 0, 'a1'], ['K', 1, 'a6', { hp: 500, maxHp: 500 }]]);
    const hit = (s: BattleState) => dmgTo(simulate(s, [{ pieceId: 2, to: sq('a2') }]).events, 3);
    expect(hit(ench(board([['K', 0, 'h1'], ['R', 0, 'a1'], ['K', 1, 'a6', { hp: 500, maxHp: 500 }]]), 'E20', 2))).toBeGreaterThan(hit(plain));
  });
});
