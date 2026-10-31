import { describe, expect, it } from 'vitest';
import type { EnchantId } from '../src/data/enchants';
import { simulate, resolveTurn, type BattleEvent, type BattleState, type Plan } from '../src/engine';
import { board, sq } from './helpers';

/** 볼륨 1 개조 (D-105): 개조가 있을 때와 없을 때를 같은 수로 비교한다 */
const tough = { hp: 900, maxHp: 900 };
const withE = (s: BattleState, id: EnchantId, n: number, side: 0 | 1 = 0) => {
  s.loadouts[side].enchants[id] = n;
  return s;
};
const dmgTo = (events: BattleEvent[], id: number) => events.flatMap((e) => (e.type === 'attack' ? e.hits.filter((h) => h.targetId === id && !h.splash).map((h) => h.damage) : [])).reduce((a, b) => a + b, 0);
const more = (mk: () => BattleState, plan: Plan, id: EnchantId, target: number, lv = 1) => [dmgTo(simulate(mk(), plan).events, target), dmgTo(simulate(withE(mk(), id, lv), plan).events, target)];

describe('볼륨 1 개조 — 공격 (D-105)', () => {
  const rook = () => board([['K', 0, 'h1'], ['R', 0, 'a1'], ['P', 1, 'a6', tough], ['K', 1, 'h8']]);
  it('발판 징: 지형 위에서 치면 피해가 크다', () => {
    const mk = () => {
      const s = rook();
      s.terrain = [{ ...sq('a2'), kind: 'shelter' }];
      return s;
    };
    const [a, b] = more(mk, [{ pieceId: 2, to: sq('a2') }], 'E21', 3);
    expect(b).toBeGreaterThan(a);
  });
  it('받침 스프링: 받아치기 피해 +, 2단이면 태엽 0', () => {
    const mk = () => board([['K', 0, 'h1'], ['P', 0, 'd4'], ['P', 1, 'e5', tough], ['K', 1, 'h8']]);
    const plan: Plan = [{ kind: 'stand', pieceId: 2 }];
    const [a, b] = more(mk, plan, 'E22', 3);
    expect(b).toBeGreaterThan(a);
    expect(simulate(withE(mk(), 'E22', 2), plan).apUsed).toBe(0);
  });
  it('선봉 리벳 · 후속 피스톤: #1과 #3 이후', () => {
    const mk = () => {
      const s = board([['K', 0, 'h1'], ['R', 0, 'a1'], ['R', 0, 'b1'], ['R', 0, 'c1'], ['P', 1, 'a6', tough], ['P', 1, 'b6', tough], ['P', 1, 'c6', tough], ['K', 1, 'h8']]);
      s.apBonus[0] = 10;
      return s;
    };
    const plan: Plan = [{ pieceId: 2, to: sq('a2') }, { pieceId: 3, to: sq('b2') }, { pieceId: 4, to: sq('c2') }];
    const base = simulate(mk(), plan).events;
    const first = simulate(withE(mk(), 'E23', 1), plan).events;
    const late = simulate(withE(mk(), 'E24', 1), plan).events;
    expect(dmgTo(first, 5)).toBeGreaterThan(dmgTo(base, 5));
    expect(dmgTo(first, 6)).toBe(dmgTo(base, 6));
    expect(dmgTo(late, 7)).toBeGreaterThan(dmgTo(base, 7));
  });
  it('킹 사냥 조준기 · 처형 날', () => {
    const king = () => board([['K', 0, 'h1'], ['R', 0, 'a1'], ['K', 1, 'a6', tough]]);
    const [a, b] = more(king, [{ pieceId: 2, to: sq('a2') }], 'E25', 3);
    expect(b).toBeGreaterThan(a);
    const hurt = () => board([['K', 0, 'h1'], ['R', 0, 'a1'], ['P', 1, 'a6', { hp: 200, maxHp: 900 }], ['K', 1, 'h8']]);
    const [c, d] = more(hurt, [{ pieceId: 2, to: sq('a2') }], 'E26', 3);
    expect(d).toBeGreaterThan(c);
    const near = board([['K', 0, 'h1'], ['R', 0, 'a1'], ['P', 1, 'a6', { hp: 200, maxHp: 900 }], ['K', 1, 'h8']]);
    expect(simulate(withE(near, 'E26', 3), [{ pieceId: 2, to: sq('a2') }]).state.pieces.some((p) => p.id === 3)).toBe(false);
  });
  it('가속 레일 · 관성 장갑: 멀리 와서 치면 세다', () => {
    const far = () => board([['K', 0, 'h1'], ['R', 0, 'a1'], ['P', 1, 'b7', tough], ['K', 1, 'h8']]);
    const plan: Plan = [{ pieceId: 2, to: sq('a7') }];
    for (const id of ['E27', 'E43'] as const) {
      const [a, b] = more(far, plan, id, 3);
      expect(b).toBeGreaterThan(a);
    }
  });
  it('정밀 렌즈 · 퀸 왕관 톱니 · 결합 안정기', () => {
    const bishop = () => board([['K', 0, 'h1'], ['B', 0, 'c1'], ['P', 1, 'g5', tough], ['K', 1, 'a8']]);
    const [a, b] = more(bishop, [{ pieceId: 2, to: sq('d2') }], 'E42', 3);
    expect(b).toBeGreaterThan(a);
    const queen = () => board([['K', 0, 'h1'], ['Q', 0, 'a1'], ['P', 1, 'a6', tough], ['K', 1, 'h8']]);
    const [c, d] = more(queen, [{ pieceId: 2, to: sq('a2') }], 'E38', 3);
    expect(d).toBeGreaterThan(c);
    const twice = simulate(withE(queen(), 'E38', 3), [{ pieceId: 2, to: sq('a2') }]).events.filter((e) => e.type === 'attack' && e.attackerId === 2);
    expect(twice).toHaveLength(2);
    const fused = () => board([['K', 0, 'h1'], ['R', 0, 'a1', { fused: ['R', 'N'] }], ['P', 1, 'a6', tough], ['K', 1, 'h8']]);
    const [e, f] = more(fused, [{ pieceId: 2, to: sq('a2') }], 'E45', 3);
    expect(f).toBeGreaterThan(e);
  });
  it('착지 충격판: 나이트가 내려앉은 칸 주변 적도 맞는다', () => {
    const mk = () => board([['K', 0, 'h1'], ['N', 0, 'b1'], ['P', 1, 'd4', tough], ['K', 1, 'h8']]);
    const r = simulate(withE(mk(), 'E41', 1), [{ pieceId: 2, to: sq('c3') }]);
    expect(r.events.some((e) => e.type === 'attack' && e.hits.some((h) => h.targetId === 3 && h.splash))).toBe(true);
  });
});

describe('볼륨 1 개조 — 수비 (D-105)', () => {
  const hit = (defense: [EnchantId, number] | null, target: [string, string] = ['P', 'a6']) => {
    const s = board([['K', 0, 'h1'], ['R', 1, 'a1'], [target[0] as 'P', 0, target[1], tough], ['P', 0, 'b6', tough], ['K', 1, 'h8']], 8, 8, 1);
    if (defense) s.loadouts[0].enchants[defense[0]] = defense[1];
    return dmgTo(simulate(s, [{ pieceId: 2, to: sq('a2') }]).events, 3);
  };
  it('충격 흡수 스프링 · 폰 방패 대열 · 반격 톱니', () => {
    const base = hit(null);
    const s = board([['K', 0, 'h1'], ['R', 1, 'a1'], ['P', 0, 'a6', { hp: 40, maxHp: 40 }], ['K', 1, 'h8']], 8, 8, 1);
    s.loadouts[0].enchants.E29 = 1;
    expect(dmgTo(simulate(s, [{ pieceId: 2, to: sq('a2') }]).events, 3)).toBeLessThanOrEqual(12);
    expect(hit(['E40', 1])).toBeLessThan(base);
    const s2 = board([['K', 0, 'h1'], ['R', 1, 'a1', tough], ['P', 0, 'a6', tough], ['K', 1, 'h8']], 8, 8, 1);
    s2.loadouts[0].enchants.E30 = 2;
    expect(dmgTo(simulate(s2, [{ pieceId: 2, to: sq('a2') }]).events.map((e) => (e.type === 'attack' ? { ...e, hits: e.hits.map((h) => ({ ...h, splash: false })) } : e)), 2)).toBeGreaterThan(0);
  });
  it('킹 철모 · 비상 퓨즈 · 겹 장갑 · 자석 장화', () => {
    expect(hit(['E39', 1], ['K', 'a6'])).toBeLessThan(hit(null, ['K', 'a6']));
    const s = board([['K', 0, 'h1'], ['R', 1, 'a1'], ['P', 0, 'a6', { hp: 1, maxHp: 40 }], ['K', 1, 'h8']], 8, 8, 1);
    s.loadouts[0].enchants.E31 = 1;
    const r = simulate(s, [{ pieceId: 2, to: sq('a2') }]);
    expect(r.state.pieces.find((p) => p.id === 3)?.hp).toBe(1);
    const plated = board([['K', 0, 'h1'], ['P', 0, 'a2'], ['K', 1, 'h8']]);
    plated.loadouts[0].enchants.E28 = 3;
    const after = resolveTurn(resolveTurn(plated, []).state, []).state;
    expect(after.pieces.find((p) => p.type === 'K' && p.side === 0)!.shield).toBeGreaterThanOrEqual(15);
    const mag = board([['K', 0, 'h1'], ['R', 0, 'a1'], ['K', 1, 'h8']]);
    mag.terrain = [{ ...sq('a3'), kind: 'magnet' }];
    mag.loadouts[0].enchants.E37 = 1;
    const m = simulate(mag, [{ pieceId: 2, to: sq('a3') }]);
    expect(m.state.pieces.find((p) => p.id === 2)!.stuckTurn).toBeUndefined();
  });
});

describe('볼륨 1 개조 — 출하 (D-105)', () => {
  it('나사 자석 · 처치 수당 · 수리 키트 · 주문 장부', async () => {
    const { newRun, enterNode, finishBattle } = await import('../src/run/run');
    const { createBattle } = await import('../src/engine');
    const play = (enchants: Partial<Record<EnchantId, number>>) => {
      const run = newRun(21);
      run.loadout.enchants = enchants;
      run.loadout.damage = { P: 1 };
      run.wins = 0;
      enterNode(run, 0);
      if (run.stage.at !== 'battle') throw new Error('대국 아님');
      run.stage.encounter.order = 'flawless';
      const b = createBattle({ width: 6, height: 6, decks: [run.deck, ['K']] });
      b.winner = 0;
      b.record = [{ tactics: {}, kills: 4 }, { tactics: {} }];
      const g0 = run.gold;
      finishBattle(run, b);
      return { run, gain: run.gold - g0 };
    };
    const base = play({});
    expect(play({ E32: 3 }).gain).toBeGreaterThan(base.gain);
    expect(play({ E34: 2 }).gain).toBe(base.gain + 8);
    expect(play({ E36: 1 }).gain).toBeGreaterThan(base.gain);
    expect(play({ E35: 3 }).run.loadout.damage?.P).toBe(0);
  });
  it('고물 감정서: 고물상 값이 내려간다', async () => {
    const { newRun, enterNode } = await import('../src/run/run');
    const price = (e: Partial<Record<EnchantId, number>>) => {
      const run = newRun(8);
      run.loadout.enchants = e;
      run.map[0] = [{ kind: 'shop' }];
      enterNode(run, 0);
      if (run.stage.at !== 'shop') throw new Error('고물상 아님');
      return run.stage.stock.pieces[0].price;
    };
    expect(price({ E33: 3 })).toBeLessThan(price({}));
  });
});
