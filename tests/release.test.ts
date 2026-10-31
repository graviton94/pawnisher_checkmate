import { describe, expect, it } from 'vitest';
import { FORGE_EXTRA } from '../src/data/run';
import { ENCHANT_GRADE } from '../src/data/grades';
import { dismantleEnchant, newRun, reforgeEnchant, scrapCard, type RunState } from '../src/run/run';

const atForge = (): RunState => {
  const run = newRun(9);
  run.stage = { at: 'forge' };
  run.gold = 500;
  run.loadout.enchants = { E01: 2, E05: 1 };
  run.loadout.cards = ['A01', 'C03'];
  return run;
};

describe('공방 덜어내기 (D-118)', () => {
  it('분해: 개조를 떼고 단마다 나사', () => {
    const run = atForge();
    expect(dismantleEnchant(run, 'E01')).toBeUndefined();
    expect(run.loadout.enchants.E01).toBeUndefined();
    expect(run.gold).toBe(500 + 2 * FORGE_EXTRA.salvagePerLevel);
  });
  it('재주조: 같은 등급 다른 개조로, 단 그대로, 방문마다 한 번', () => {
    const run = atForge();
    expect(reforgeEnchant(run, 'E01')).toBeUndefined();
    const ids = Object.keys(run.loadout.enchants);
    expect(ids).not.toContain('E01');
    const to = ids.find((x) => x !== 'E05')!;
    expect(ENCHANT_GRADE[to as 'E01']).toBe(ENCHANT_GRADE.E01);
    expect(run.loadout.enchants[to as 'E01']).toBe(2);
    expect(reforgeEnchant(run, 'E05')).toBeTruthy();
  });
  it('카드 파쇄', () => {
    const run = atForge();
    expect(scrapCard(run, 1)).toBeUndefined();
    expect(run.loadout.cards).toEqual(['A01']);
  });
});

describe('보관 이자 (D-119)', () => {
  it('들고 있던 나사 50마다 5, 최대 25', async () => {
    const { INTEREST } = await import('../src/data/run');
    const { enterNode, finishBattle } = await import('../src/run/run');
    const run = newRun(4);
    enterNode(run, 0);
    if (run.stage.at !== 'battle') throw new Error('대국 아님');
    run.gold = 180;
    const s = { ...(await import('../src/run/legion')).encounterBattle(run.deck, run.loadout, run.stage.encounter), winner: 0 as const };
    finishBattle(run, s);
    const st = run.stage as unknown as { at: string; lines: string[] };
    expect(st.at).toBe('reward');
    expect(st.lines).toContain(`보관 이자 +${Math.min(INTEREST.cap, 3 * INTEREST.gain)}`);
  });
});

describe('계약 부품 (D-120)', () => {
  it('반장 해체 상자에 둘 · 서명하면 이득과 대가', async () => {
    const { enterNode, finishBattle, forgeUp, enchantSlots } = await import('../src/run/run');
    const { encounterBattle } = await import('../src/run/legion');
    const run = newRun(4);
    run.floor = 12;
    run.map[11] = [{ kind: 'boss' }];
    enterNode(run, 0);
    const st = run.stage as unknown as { at: string; encounter: Parameters<typeof encounterBattle>[2] };
    finishBattle(run, { ...encounterBattle(run.deck, run.loadout, st.encounter), winner: 0 });
    const r = run.stage as unknown as { choices: { type: string; options: string[] }[] };
    const c = r.choices.find((x) => x.type === 'contract')!;
    expect(c.options).toHaveLength(2);
    run.loadout.contracts = ['K1', 'K2'];
    run.stage = { at: 'forge' };
    run.gold = 999;
    expect(forgeUp(run, 'K')).toBeTruthy();
    expect(enchantSlots(run)).toBe(7);
  });
  it('과급기: 턴마다 태엽 +1 · 날림 공정: ATK +20%', async () => {
    const { availableAp, createBattle } = await import('../src/engine');
    const lo = (contracts: ('K1' | 'K4')[]) => ({ enchants: {}, cards: [], forge: {}, contracts });
    const a = createBattle({ width: 8, height: 8, decks: [['K', 'R'], ['K']], loadouts: [lo([]), lo([])] });
    const b = createBattle({ width: 8, height: 8, decks: [['K', 'R'], ['K']], loadouts: [lo(['K1', 'K4']), lo([])] });
    expect(availableAp(b)).toBe(availableAp(a) + 1);
    expect(b.pieces.find((p) => p.type === 'R')!.atk).toBe(Math.round(a.pieces.find((p) => p.type === 'R')!.atk * 1.2));
  });
});
