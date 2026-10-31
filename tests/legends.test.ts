import { describe, expect, it } from 'vitest';
import { CARD_FX } from '../src/data/cards';
import { CARD_GRADE, ENCHANT_GRADE } from '../src/data/grades';
import { LEGENDS, LEGEND_FX, type LegendId } from '../src/data/legends';
import { CARDS, type CardId } from '../src/data/cards';
import { ENCHANTS } from '../src/data/enchants';
import { createBattle, plannableMoves, simulate, specialSteps, type BattleEvent, type BattleState } from '../src/engine';
import { addGold, newRun, type RunState } from '../src/run/run';
import { board, sq } from './helpers';

const tough = { hp: 500, maxHp: 500 };
const weak = { hp: 1, maxHp: 1 };
const gild = (s: BattleState, ...ids: LegendId[]) => {
  s.loadouts[0].legends = ids;
  return s;
};
const withCard = (s: BattleState, id: CardId) => {
  s.cards[0] = [{ id, cooldown: 0, spent: false }];
  return s;
};
const dmgTo = (events: BattleEvent[], id: number) => events.flatMap((e) => (e.type === 'attack' || e.type === 'blast' ? e.hits.filter((h) => h.targetId === id).map((h) => h.damage) : [])).reduce((a, b) => a + b, 0);

describe('등급 (D-112)', () => {
  it('모든 개조·카드에 등급이 있다', () => {
    for (const id of Object.keys(ENCHANTS)) expect(ENCHANT_GRADE[id as keyof typeof ENCHANT_GRADE], id).toBeDefined();
    for (const id of Object.keys(CARDS)) expect(CARD_GRADE[id as CardId], id).toBeDefined();
    expect(Object.keys(LEGENDS)).toHaveLength(10);
  });
});

describe('황금 부품 (D-112)', () => {
  it('무한 궤도: 나이트가 처치하면 같은 나이트가 한 번 더 움직인다', () => {
    const s = () => board([['K', 0, 'h1'], ['N', 0, 'b1'], ['P', 1, 'b5', weak], ['P', 1, 'e7', tough], ['K', 1, 'a8']]);
    const plan = [{ pieceId: 2, to: sq('c3') }];
    expect(plannableMoves(s(), plan, 2)).toHaveLength(0);
    const moves = plannableMoves(gild(s(), 'L01'), plan, 2);
    expect(moves.length).toBeGreaterThan(0);
    expect(simulate(gild(s(), 'L01'), [...plan, { pieceId: 2, to: moves[0] }]).ok).toBe(true);
  });

  it('프리즘 코어: 비숍이 사선 위 적을 끝까지 꿰뚫는다', () => {
    const s = () => board([['K', 0, 'h1'], ['B', 0, 'c1'], ['P', 1, 'e3', tough], ['P', 1, 'f4', tough], ['P', 1, 'g5', tough], ['K', 1, 'a8']]);
    const plan = [{ pieceId: 2, to: sq('d2') }];
    expect(dmgTo(simulate(s(), plan).events, 5)).toBe(0);
    const r = simulate(gild(s(), 'L02'), plan);
    expect(dmgTo(r.events, 4)).toBeGreaterThan(0);
    expect(dmgTo(r.events, 5)).toBeGreaterThan(0);
  });

  it('레일 캐논: 룩이 제자리에서 직선 끝까지 친다 (태엽 1)', () => {
    const s = () => board([['K', 0, 'h1'], ['R', 0, 'a1'], ['P', 1, 'a5', tough], ['P', 1, 'a7', tough], ['K', 1, 'h8']]);
    expect(simulate(s(), [{ kind: 'stand', pieceId: 2 }]).ok).toBe(false);
    const r = simulate(gild(s(), 'L03'), [{ kind: 'stand', pieceId: 2 }]);
    expect(r.ok).toBe(true);
    expect(r.apUsed).toBe(LEGEND_FX.railStandAp);
    expect(dmgTo(r.events, 4)).toBeGreaterThan(0);
  });

  it('여왕 거푸집: 퀸이 쓰러뜨리면 태엽 +1', () => {
    const s = gild(board([['K', 0, 'h1'], ['Q', 0, 'd1'], ['P', 1, 'd5', weak], ['K', 1, 'a8']]), 'L04');
    const r = simulate(s, [{ pieceId: 2, to: sq('d4') }]);
    expect(r.events.some((e) => e.type === 'apGain')).toBe(true);
  });

  it('폭군 왕관: 킹 ATK 두 배 (대국 시작 때)', () => {
    const plain = createBattle({ width: 8, height: 8, decks: [['K'], ['K']] });
    const gold = createBattle({ width: 8, height: 8, decks: [['K'], ['K']], loadouts: [{ enchants: {}, cards: [], forge: {}, legends: ['L05'] }, { enchants: {}, cards: [], forge: {} }] });
    expect(gold.pieces[0].atk).toBe(plain.pieces[0].atk * 2);
  });

  it('도미노 공장: 쓰러진 적의 상하좌우 적이 터진다', () => {
    const s = () => board([['K', 0, 'h1'], ['R', 0, 'a1'], ['P', 1, 'a5', weak], ['P', 1, 'b5', tough], ['K', 1, 'h8']]);
    const plan = [{ pieceId: 2, to: sq('a2') }];
    expect(dmgTo(simulate(s(), plan).events, 4)).toBe(0);
    expect(dmgTo(simulate(gild(s(), 'L06'), plan).events, 4)).toBeGreaterThan(0);
  });

  it('단독 출하: 6기 이하면 주는 피해가 늘고 받는 피해가 준다', () => {
    const lo = { enchants: {}, cards: [], forge: {}, legends: ['L07' as LegendId] };
    expect(createBattle({ width: 8, height: 8, decks: [['K', 'R'], ['K']], loadouts: [lo, { enchants: {}, cards: [], forge: {} }] }).solo?.[0]).toBe(true);
    expect(createBattle({ width: 8, height: 8, decks: [['K', 'P', 'P', 'P', 'P', 'P', 'P'], ['K']], loadouts: [lo, { enchants: {}, cards: [], forge: {} }] }).solo).toBeUndefined();
  });

  it('양산 명령서: 폰이 치면 그 적과 붙은 다른 폰도 친다', () => {
    const s = () => board([['K', 0, 'h1'], ['P', 0, 'd3'], ['P', 0, 'f4'], ['P', 1, 'e5', tough], ['K', 1, 'a8']]);
    const plan = [{ pieceId: 2, to: sq('d4') }];
    const base = dmgTo(simulate(s(), plan).events, 4);
    expect(dmgTo(simulate(gild(s(), 'L09'), plan).events, 4)).toBeGreaterThan(base);
  });

  it('합체 공정: 카드 없이 결합 (태엽 0)', () => {
    const s = () => board([['K', 0, 'h1'], ['N', 0, 'c3'], ['R', 0, 'd3'], ['K', 1, 'a8']]);
    expect(specialSteps(s(), []).some((st) => st.kind === 'fuse')).toBe(false);
    const st = specialSteps(gild(s(), 'L10'), []).find((x) => x.kind === 'fuse')!;
    expect(st).toBeDefined();
    expect(simulate(gild(s(), 'L10'), [st]).apUsed).toBe(0);
  });

  it('황금 슬롯은 둘', () => {
    const run: RunState = newRun(3);
    expect(addGold(run, 'L01')).toBeUndefined();
    expect(addGold(run, 'L02')).toBeUndefined();
    expect(addGold(run, 'L03')).toBeTruthy();
  });
});

describe('천공 카드 +9 (D-112)', () => {
  it('조준 렌즈: 피해 +30%', () => {
    const s = () => board([['K', 0, 'h1'], ['R', 0, 'a1'], ['P', 1, 'a5', tough], ['K', 1, 'h8']]);
    const base = dmgTo(simulate(s(), [{ pieceId: 2, to: sq('a2') }]).events, 3);
    const aimed = dmgTo(simulate(withCard(s(), 'A07'), [{ pieceId: 2, to: sq('a2'), card: 0 }]).events, 3);
    expect(aimed).toBeGreaterThan(base);
  });

  it('갈고리 와이어: 맞은 적을 끌어당긴다 · 자석 족쇄: 다음 턴 못 움직임', () => {
    const s = () => board([['K', 0, 'h1'], ['R', 0, 'a1'], ['P', 1, 'a6', tough], ['K', 1, 'h8']]);
    const pulled = simulate(withCard(s(), 'A08'), [{ pieceId: 2, to: sq('a2'), card: 0 }]);
    expect(pulled.state.pieces.find((p) => p.id === 3)!.y).toBe(sq('a5').y);
    const bound = simulate(withCard(s(), 'A10'), [{ pieceId: 2, to: sq('a2'), card: 0 }]);
    expect(bound.state.pieces.find((p) => p.id === 3)!.stuckTurn).toBe(2);
  });

  it('보조 카드: 냉각수 · 태엽 충전 · 폐품 장갑 · 총동원령 · 긴급 재조립', () => {
    const hurt = () => board([['K', 0, 'h1'], ['R', 0, 'a1', { hp: 10, maxHp: 100 }], ['K', 1, 'h8']]);
    const heal = simulate(withCard(hurt(), 'A09'), [{ kind: 'shield', pieceId: 2, card: 0 }]);
    expect(heal.state.pieces.find((p) => p.id === 2)!.hp).toBe(10 + 100 * CARD_FX.coolantHeal);
    expect(simulate(withCard(hurt(), 'C10'), [{ kind: 'shield', pieceId: 1, card: 0 }]).state.apBonus[0]).toBe(CARD_FX.overclockAp);
    expect(simulate(withCard(hurt(), 'C07'), [{ kind: 'shield', pieceId: 1, card: 0 }]).state.apBonus[0]).toBe(CARD_FX.mobilizeAp);
    const armor = simulate(withCard(hurt(), 'C11'), [{ kind: 'shield', pieceId: 1, card: 0 }]);
    expect(armor.state.pieces.filter((p) => p.side === 0).every((p) => p.shield === CARD_FX.scrapShield)).toBe(true);
    const rebuilt = simulate(withCard(hurt(), 'C08'), [{ kind: 'shield', pieceId: 1, card: 0 }]);
    expect(rebuilt.state.pieces.find((p) => p.id === 2)!.hp).toBe(10 + 100 * CARD_FX.rebuildHeal);
  });

  it('일제 사격: 행동하지 않은 아군 전부가 제자리에서 친다', () => {
    const s = withCard(board([['K', 0, 'h1'], ['R', 0, 'a1'], ['B', 0, 'c1'], ['P', 1, 'a5', tough], ['P', 1, 'f4', tough], ['K', 1, 'h8']]), 'C09');
    const r = simulate(s, [{ kind: 'shield', pieceId: 1, card: 0 }]);
    expect(r.ok).toBe(true);
    expect(dmgTo(r.events, 4)).toBeGreaterThan(0);
    expect(dmgTo(r.events, 5)).toBeGreaterThan(0);
    // 쏜 기물은 그 턴 다시 못 움직인다
    expect(simulate(s, [{ kind: 'shield', pieceId: 1, card: 0 }, { pieceId: 2, to: sq('a2') }]).ok).toBe(false);
  });
});
