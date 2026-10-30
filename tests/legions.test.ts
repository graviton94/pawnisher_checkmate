import { describe, expect, it } from 'vitest';
import { AFFIX } from '../src/data/legions';
import { Rng, createBattle, moveCost, resolveTurn, simulate } from '../src/engine';
import { encounterBattle, generateEncounter } from '../src/run/legion';
import { enterNode, finishBattle, newRun, takeChoice } from '../src/run/run';
import { board, sq } from './helpers';

describe('검문! 정예 접사 (GDD 11장 A4, D-096)', () => {
  it('최후의 리벳: 다른 일반 기물이 남아 있으면 HP 1에서 버틴다', () => {
    const s = board([['K', 0, 'h1'], ['R', 0, 'a1'], ['P', 1, 'a5', { hp: 1, maxHp: 30, affix: 'lastRivet' }], ['P', 1, 'c7'], ['K', 1, 'h8']]);
    const r = simulate(s, [{ pieceId: 2, to: sq('a2') }]);
    expect(r.state.pieces.find((p) => p.id === 3)!.hp).toBe(1);
    const alone = board([['K', 0, 'h1'], ['R', 0, 'a1'], ['P', 1, 'a5', { hp: 1, maxHp: 30, affix: 'lastRivet' }], ['K', 1, 'h8']]);
    expect(simulate(alone, [{ pieceId: 2, to: sq('a2') }]).state.pieces.some((p) => p.id === 3)).toBe(false);
  });

  it('반동 스프링: 쓰러뜨린 기물이 ATK 50%를 되받는다', () => {
    const s = board([['K', 0, 'h1'], ['R', 0, 'a1'], ['P', 1, 'a5', { hp: 1, maxHp: 30, atk: 40, affix: 'recoil' }], ['K', 1, 'h8']]);
    const r = simulate(s, [{ pieceId: 2, to: sq('a2') }]);
    const rook = r.state.pieces.find((p) => p.id === 2)!;
    expect(rook.hp).toBe(rook.maxHp - 40 * AFFIX.recoilRatio);
    expect(r.events.some((e) => e.type === 'affix' && e.affix === 'recoil')).toBe(true);
  });

  it('덧댄 철판: 자기 턴 시작마다 방열판', () => {
    const s = board([['K', 0, 'h1'], ['P', 1, 'a6', { affix: 'plate' }], ['K', 1, 'h8']]);
    const after = resolveTurn(s, []).state;
    expect(after.pieces.find((p) => p.id === 2)!.shield).toBe(AFFIX.plateShield);
  });

  it('기름칠한 관절: 이동 태엽 −1', () => {
    const s = board([['K', 0, 'h1'], ['R', 1, 'a6'], ['R', 1, 'b6', { affix: 'oiled' }], ['K', 1, 'h8']]);
    expect(moveCost(s, s.pieces[2])).toBe(moveCost(s, s.pieces[1]) - 1);
  });

  it('같은 틀: 붙어 있던 아군이 쓰러지면 ATK 상승', () => {
    const s = board([['K', 0, 'h1'], ['R', 0, 'a1'], ['P', 1, 'a5', { hp: 1, maxHp: 1 }], ['P', 1, 'b6', { affix: 'mold', atk: 10 }], ['K', 1, 'h8']]);
    const r = simulate(s, [{ pieceId: 2, to: sq('a2') }]);
    expect(r.state.pieces.find((p) => p.id === 4)!.atk).toBe(Math.round(10 * AFFIX.moldAtk));
  });

  it('근위 볼트: 자기 킹과 붙어 있으면 받는 피해 감소', () => {
    const mk = (affix?: 'guardBolt') => board([['K', 0, 'h1'], ['R', 0, 'a1'], ['P', 1, 'a5', { hp: 500, maxHp: 500, ...(affix ? { affix } : {}) }], ['K', 1, 'b5']]);
    const dmg = (s: ReturnType<typeof mk>) => 500 - simulate(s, [{ pieceId: 2, to: sq('a2') }]).state.pieces.find((p) => p.id === 3)!.hp;
    expect(dmg(mk('guardBolt'))).toBeLessThan(dmg(mk()));
  });
});

describe('군단 원형 · 영입 (D-096)', () => {
  it('일반 군단에는 원형이, 검문! 정예에는 접사가 붙는다', () => {
    const rng = new Rng(7);
    const e = generateEncounter(6, 'battle', rng);
    expect(e.archetype).toBeDefined();
    const elite = generateEncounter(6, 'elite', rng);
    expect(elite.affixes?.length).toBe(1);
    const s = encounterBattle(['K', 'P', 'P'], { enchants: {}, cards: [], forge: {} }, elite);
    expect(s.pieces.filter((p) => p.side === 1 && p.affix)).toHaveLength(1);
    expect(generateEncounter(30, 'elite', rng).affixes?.length).toBe(2);
  });

  it('기병 기습대는 나이트가 많다', () => {
    let knights = 0;
    let total = 0;
    for (let seed = 1; seed < 300; seed++) {
      const e = generateEncounter(8, 'battle', new Rng(seed));
      if (e.archetype !== 'cavalry') continue;
      knights += e.deck.filter((t) => t === 'N').length;
      total += e.deck.length - 1;
    }
    expect(total).toBeGreaterThan(0);
    expect(knights / total).toBeGreaterThan(0.25);
  });

  it('영입: 검문! 보상에 쓰러뜨린 적 기물 칸, 이형이면 그 거푸집도 따라온다', () => {
    const run = newRun(11);
    run.map[0][0] = { kind: 'elite' };
    enterNode(run, 0);
    if (run.stage.at !== 'battle') throw new Error('대국이 아님');
    const e = run.stage.encounter;
    e.deck = ['K', 'N', 'N'];
    e.loadout.variants = { N: 'hammer' };
    const b = createBattle({ width: 6, height: 6, decks: [run.deck, ['K']] });
    b.winner = 0;
    finishBattle(run, b);
    const st = run.stage as unknown as { at: string; choices: { type: string; options: string[] }[] };
    const rec = st.choices.find((c) => c.type === 'recruit');
    expect(rec?.options).toEqual(['N']);
    while (st.choices[0].type !== 'recruit') st.choices.shift();
    const n = run.deck.filter((t) => t === 'N').length;
    expect(takeChoice(run, 'N')).toBeUndefined();
    expect(run.deck.filter((t) => t === 'N').length).toBe(n + 1);
    expect(run.loadout.variants?.N).toBe('hammer');
  });
});
