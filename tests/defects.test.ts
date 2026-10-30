import { describe, expect, it } from 'vitest';
import { DEFECT } from '../src/data/defects';
import { createBattle } from '../src/engine';
import { battleDeck, enterNode, eventChoose, finishBattle, newRun, repairDamage } from '../src/run/run';

describe('결함: 손상 · 봉인 (D-101)', () => {
  it('손상: 그 유형 최대 HP가 단마다 15% 깎이고, 공방에서 고친다', () => {
    const plain = createBattle({ width: 6, height: 6, decks: [['K', 'N'], ['K']] });
    const hurt = createBattle({ width: 6, height: 6, decks: [['K', 'N'], ['K']], loadouts: [{ enchants: {}, cards: [], forge: {}, damage: { N: 2 } }, { enchants: {}, cards: [], forge: {} }] });
    const n0 = plain.pieces.find((p) => p.type === 'N')!.maxHp;
    expect(hurt.pieces.find((p) => p.type === 'N')!.maxHp).toBe(Math.round(n0 * (1 - DEFECT.damageCut * 2)));
    const run = newRun(1);
    run.loadout.damage = { N: 2 };
    run.gold = 100;
    expect(repairDamage(run, 'N')).toBeUndefined();
    expect(run.loadout.damage.N).toBe(1);
    expect(run.gold).toBe(100 - DEFECT.repairCost);
  });

  it('봉인: 대국마다 킹 말고 한 기가 빠지고, 정해진 대국 수가 지나면 풀린다', () => {
    const run = newRun(2);
    run.deck = ['K', 'P', 'N', 'B'];
    run.sealed = 2;
    enterNode(run, 0);
    const bd = battleDeck(run);
    expect(bd.deck).toHaveLength(3);
    expect(bd.deck).toContain('K');
    expect(bd.sealed).toBeDefined();
    expect(battleDeck(run)).toEqual(bd); // 이어하기에도 같은 기물
    const b = createBattle({ width: 6, height: 6, decks: [bd.deck, ['K']] });
    b.winner = 0;
    finishBattle(run, b);
    expect(run.sealed).toBe(1);
  });

  it('돌발: 녹슨 금고는 나사를 주고 손상을 남긴다 · 끼인 컨베이어는 셋 다 대가', () => {
    const run = newRun(3);
    run.map[0] = [{ kind: 'event', event: 'safe' }];
    enterNode(run, 0);
    const gold = run.gold;
    eventChoose(run, 0);
    expect(run.gold).toBe(gold + 70);
    expect(Object.values(run.loadout.damage ?? {}).reduce((a, n) => a + (n ?? 0), 0)).toBe(1);

    const run2 = newRun(3);
    run2.map[0] = [{ kind: 'event', event: 'jam' }];
    enterNode(run2, 0);
    const size = run2.deck.length;
    eventChoose(run2, 2);
    expect(run2.deck.length).toBe(size - 1);
    expect(run2.deck).toContain('K');
  });
});
