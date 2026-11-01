import { describe, expect, it } from 'vitest';
import { ASC, ASCENSIONS, MAX_ASCENSION } from '../src/data/ascension';
import { FLOORS_PER_ACT, START_GOLD, TOTAL_FLOORS, TYPE_MAX, DECK_MAX } from '../src/data/run';
import { Rng } from '../src/engine';
import { encounterBattle, generateEncounter } from '../src/run/legion';
import { UNLOCK_DECKS, absorbRun, bossKillsOf, recordRunEnd, unlockedDecks, type MetaState } from '../src/run/meta';
import { newRun } from '../src/run/run';

const meta = (o: Partial<MetaState> = {}): MetaState => ({ version: 1, runs: 0, clears: 0, bestFloor: 0, ascension: 0, ...o });

describe('압력 (규격 2.0, 10단계)', () => {
  it('11칸 (0~10), 최고에서 멈춘다', () => {
    expect(ASCENSIONS).toHaveLength(11);
    expect(recordRunEnd(meta({ ascension: MAX_ASCENSION }), TOTAL_FLOORS, true, MAX_ASCENSION).ascension).toBe(MAX_ASCENSION);
  });
  it('7: 내 킹 최대 HP −10% · 4: 적 HP +10%', () => {
    const e = (a: number) => generateEncounter(5, 'battle', new Rng(3), undefined, a);
    const king = (a: number) => encounterBattle(['K', 'P'], { parts: [] }, e(a)).pieces.find((p) => p.side === 0 && p.type === 'K')!.maxHp;
    expect(king(7)).toBe(Math.round(king(0) * ASC.myKingHp.mult));
    const foeHp = (a: number) => encounterBattle(['K'], { parts: [] }, e(a)).pieces.filter((p) => p.side === 1 && p.type !== 'K').reduce((s, p) => s + p.maxHp, 0);
    expect(foeHp(4)).toBeGreaterThan(foeHp(3));
  });
  it('10: 시작 나사 0', () => {
    expect(newRun(1, { ascension: 10 }).gold).toBe(0);
    expect(newRun(1).gold).toBe(START_GOLD);
  });
});

describe('시작 세트 · 도감', () => {
  it('해금 세트는 군단 규격 안', () => {
    for (const u of UNLOCK_DECKS) {
      expect(u.deck.length).toBeLessThanOrEqual(DECK_MAX);
      for (const t of new Set(u.deck)) expect(u.deck.filter((x) => x === t).length).toBeLessThanOrEqual(TYPE_MAX[t as keyof typeof TYPE_MAX]);
    }
    const ids = (m: MetaState) => UNLOCK_DECKS.filter((u) => u.ok(m)).map((u) => u.id);
    expect(ids(meta({ ascension: 5 }))).toContain('command');
    expect(unlockedDecks(meta({ ascension: 5 }))).toContainEqual(['K', 'Q']);
  });
  it('도감: 지나온 돌발 · 부품 · 각인 · 해체한 반장 (여러 번 불러도 같다)', () => {
    const run = newRun(42);
    run.parts = ['lens'];
    run.deck[1].carve = 'cross';
    run.map[1] = [{ kind: 'event', event: 'smith' }];
    run.path = [0, 0];
    run.floor = 3;
    run.bosses = ['pawn', 'knight'];
    const once = absorbRun(meta(), run);
    expect(once.seen).toEqual({ events: ['smith'], parts: ['lens'], carves: ['cross'] });
    expect(absorbRun(once, run)).toEqual(once);
    expect(bossKillsOf(run)).toEqual([]);
    run.floor = FLOORS_PER_ACT + 1;
    expect(bossKillsOf(run)).toEqual(['pawn']);
    run.floor = TOTAL_FLOORS + 1;
    expect(bossKillsOf(run)).toEqual(['pawn', 'knight', 'final']);
  });
});
