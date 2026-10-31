import { describe, expect, it } from 'vitest';
import { ASC, ASCENSIONS, MAX_ASCENSION } from '../src/data/ascension';
import { BOSSES, FLOORS_PER_ACT, START_GOLD } from '../src/data/run';
import { Rng } from '../src/engine';
import { checkDeck } from '../src/run/deck';
import { encounterBattle, generateEncounter } from '../src/run/legion';
import { UNLOCK_DECKS, absorbRun, bossKillsOf, recordRunEnd, unlockedDecks, type MetaState } from '../src/run/meta';
import { newRun } from '../src/run/run';

const meta = (o: Partial<MetaState> = {}): MetaState => ({ version: 1, runs: 0, clears: 0, bestFloor: 0, ascension: 0, ...o });

describe('압력 6~13 (D-108)', () => {
  it('14단계, 최고 13', () => {
    expect(ASCENSIONS).toHaveLength(14);
    expect(MAX_ASCENSION).toBe(13);
    expect(recordRunEnd(meta({ ascension: 13 }), 36, true, 13).ascension).toBe(13);
  });

  it('6: 검문 접사 +1', () => {
    const n = (a: number) => generateEncounter(6, 'elite', new Rng(7), undefined, a).affixes?.length ?? 0;
    expect(n(6)).toBe(n(5) + ASC.eliteAffix.add);
  });

  it('8: 내 킹 최대 HP −10%', () => {
    const e = generateEncounter(6, 'battle', new Rng(3), undefined, 8);
    const king = (a: number) => encounterBattle(['K', 'P'], { enchants: {}, cards: [], forge: {} }, { ...e, ascension: a }).pieces.find((p) => p.side === 0 && p.type === 'K')!.maxHp;
    expect(king(8)).toBe(Math.round(king(7) * ASC.myKingHp.mult));
  });

  it('9: 일반 대국 개량 +1 (검문!은 그대로)', () => {
    const lv = (a: number, kind: 'battle' | 'elite') => Math.max(0, ...Object.values(generateEncounter(10, kind, new Rng(11), undefined, a).loadout.forge as Record<string, number>));
    expect(lv(9, 'battle')).toBe(lv(8, 'battle') + 1);
    expect(lv(9, 'elite')).toBe(lv(8, 'elite'));
  });

  it('12: 반장 개조 +1단 (최대 3) · 13: 공장장 거푸집 +1 · 시작 나사 0', () => {
    const boss = (a: number) => generateEncounter(FLOORS_PER_ACT, 'boss', new Rng(5), 'knight', a).loadout.enchants;
    for (const [id, n] of Object.entries(BOSSES.knight.enchants)) expect(boss(12)[id as keyof typeof BOSSES.knight.enchants]).toBe(Math.min(3, (n ?? 0) + 1));
    const final = (a: number) => generateEncounter(36, 'boss', new Rng(5), undefined, a).loadout.forge.K ?? 0;
    expect(final(13)).toBe(Math.min(5, final(12) + 1));
    expect(newRun(1, { ascension: 13 }).gold).toBe(0);
    expect(newRun(1, { ascension: 12 }).gold).toBe(START_GOLD);
  });
});

describe('시작 세트 +3 · 도감 (D-108)', () => {
  it('새 세트는 군단 규격 안', () => {
    for (const u of UNLOCK_DECKS) expect(checkDeck(u.deck).ok, u.name).toBe(true);
  });

  it('해금 조건: 폰 반장 해체 · 검문! 15번 · 압력 6', () => {
    const ids = (m: MetaState) => UNLOCK_DECKS.filter((u) => u.ok(m)).map((u) => u.id);
    expect(ids(meta())).toEqual([]);
    expect(ids(meta({ bossKills: ['pawn'] }))).toContain('battalion');
    expect(ids(meta({ elites: 15 }))).toContain('elite');
    expect(ids(meta({ ascension: 6 }))).toContain('command');
    expect(unlockedDecks(meta({ ascension: 6 }))).toContainEqual(['K', 'Q']);
  });

  it('도감: 지나온 층의 돌발·얻은 개조·해체한 반장을 모은다 (여러 번 불러도 같다)', () => {
    const run = newRun(42);
    run.loadout.enchants = { E05: 1 };
    run.blueprints = ['hammer' as never];
    // 2층 돌발 노드를 지나 3층에 있다고 치자
    run.map[1] = [{ kind: 'event', event: 'smith' }];
    run.path = [0, 0];
    run.floor = 3;
    run.bosses = ['pawn', 'knight'];
    const once = absorbRun(meta(), run);
    expect(once.seen).toEqual({ enchants: ['E05'], variants: ['hammer'], events: ['smith'] });
    expect(absorbRun(once, run)).toEqual(once);
    expect(bossKillsOf(run)).toEqual([]);
    run.floor = FLOORS_PER_ACT + 1;
    expect(bossKillsOf(run)).toEqual(['pawn']);
    run.floor = 37;
    expect(bossKillsOf(run)).toEqual(['pawn', 'knight', 'final']);
  });

  it('출하가 끝나면 검문! 통과·푼 묘수 누계', () => {
    const run = newRun(42);
    run.map[3] = [{ kind: 'elite' }];
    run.map[4] = [{ kind: 'elite' }];
    run.path = [0, 0, 0, 0, 0];
    run.floor = 5; // 5층 검문!에서 짐 → 4층 하나만
    run.solved = 2;
    const m = recordRunEnd(meta({ elites: 3 }), 5, false, 0, run);
    expect(m.elites).toBe(4);
    expect(m.puzzles).toBe(2);
    expect(m.runs).toBe(1);
  });
});
