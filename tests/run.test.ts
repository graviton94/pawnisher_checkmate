import { describe, expect, it } from 'vitest';
import { BOSSES, FINAL_BOSS, FORGE_COST, TOTAL_FLOORS, type BossId } from '../src/data/run';
import { createBattle, Rng } from '../src/engine';
import { checkDeck } from '../src/run/deck';
import { generateEncounter } from '../src/run/legion';
import {
  addCard,
  addEnchant,
  altarGamble,
  buyPiece,
  enterNode,
  finishBattle,
  forgeUp,
  leaveNode,
  newRun,
  sellPiece,
  skipChoice,
  takeChoice,
  finishReward,
  type RunState,
} from '../src/run/run';

const toNode = (run: RunState, kind: string) => {
  const i = run.map[run.floor - 1].findIndex((n) => n.kind === kind);
  run.map[run.floor - 1][i === -1 ? 0 : i] = { kind: kind as never };
  return enterNode(run, i === -1 ? 0 : i);
};

describe('런 구조 (GDD 8장)', () => {
  it('보스 덱은 덱 규칙을 지킨다', () => {
    for (const id of Object.keys(BOSSES) as BossId[]) expect(checkDeck(BOSSES[id].deck).ok, id).toBe(true);
    expect(checkDeck(FINAL_BOSS.deck).ok).toBe(true);
  });
  it('같은 시드면 같은 런', () => {
    expect(JSON.stringify(newRun(42))).toBe(JSON.stringify(newRun(42)));
  });
  it('맵: Act마다 첫 층 전투 · 12층 보스 · 층마다 전투 1개 이상 · Act 1 엘리트는 5층부터', () => {
    for (let seed = 1; seed < 30; seed++) {
      const run = newRun(seed);
      expect(run.map).toHaveLength(TOTAL_FLOORS);
      for (const a of [0, 12, 24]) {
        expect(run.map[a]).toEqual([{ kind: 'battle' }]);
        expect(run.map[a + 11]).toEqual([{ kind: 'boss' }]);
      }
      run.map.slice(1, 11).forEach((floor, i) => {
        expect(floor.length).toBeGreaterThanOrEqual(2);
        expect(floor.some((n) => n.kind === 'battle')).toBe(true);
        if (i + 2 < 5) expect(floor.some((n) => n.kind === 'elite')).toBe(false);
      });
      expect(new Set(run.bosses).size).toBe(2);
    }
  });
  it('모든 층·종류의 적 군단이 보드에 배치된다', () => {
    const rng = new Rng(7);
    for (let f = 1; f <= TOTAL_FLOORS; f++)
      for (const kind of ['battle', 'elite', 'boss'] as const) {
        for (const boss of ['knight', 'bishop', 'rook'] as BossId[]) {
          const e = generateEncounter(f, kind, rng, boss);
          expect(checkDeck(e.deck).ok).toBe(true);
          expect(() => createBattle({ width: e.width, height: e.height, decks: [(['K', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'N', 'N', 'B', 'B', 'R', 'R', 'Q'] as const).slice(0, e.width * 2), e.deck] })).not.toThrow();
        }
      }
  });
});

describe('보상과 노드', () => {
  it('전투 승리 → 골드·기물·인챈트 3지선다, 소멸 카드는 쓰면 사라진다', () => {
    const run = newRun(3);
    run.loadout.cards = ['C01', 'A01'];
    enterNode(run, 0);
    const st = run.stage.at === 'battle' ? run.stage.encounter : null;
    const b = createBattle({ width: st!.width, height: st!.height, decks: [run.deck, st!.deck], loadouts: [run.loadout, st!.loadout] });
    b.winner = 0;
    b.cards[0][0].spent = true;
    b.cards[0][1].spent = true; // 라운드 1회 카드는 남는다
    const gold = run.gold;
    const deck = run.deck.length;
    finishBattle(run, b);
    expect(run.loadout.cards).toEqual(['A01']);
    expect(run.gold).toBeGreaterThan(gold);
    expect(run.stage.at).toBe('reward');
    if (run.stage.at !== 'reward') return;
    // Act 1은 매 승리마다 기물 3지선다 → 인챈트 3지선다
    expect(run.stage.choices.map((c) => c.type)).toEqual(['piece', 'enchant']);
    expect(run.stage.choices[0].options).toHaveLength(3);
    expect(takeChoice(run, run.stage.choices[0].options[0])).toBeUndefined();
    expect(run.deck.length).toBe(deck + 1);
    const pick = run.stage.choices[0].options[0];
    expect(takeChoice(run, pick)).toBeUndefined();
    expect(finishReward(run)).toBeUndefined();
    expect(run.floor).toBe(2);
  });
  it('패배하면 런 종료', () => {
    const run = newRun(4);
    enterNode(run, 0);
    const b = createBattle({ width: 6, height: 6, decks: [run.deck, ['K']] });
    b.winner = 1;
    finishBattle(run, b);
    expect(run.stage).toEqual({ at: 'over', won: false });
  });
  it('인챈트 중첩 · 6칸 가득 차면 버려야 함 · 카드 4칸', () => {
    const run = newRun(5);
    addEnchant(run, 'E01');
    addEnchant(run, 'E01');
    expect(run.loadout.enchants.E01).toBe(2);
    for (const id of ['E02', 'E03', 'E04', 'E05', 'E06'] as const) addEnchant(run, id);
    expect(addEnchant(run, 'E07')).toBe('full');
    expect(addEnchant(run, 'E07', 'E02')).toBeUndefined();
    expect(run.loadout.enchants.E02).toBeUndefined();
    for (const id of ['A01', 'A02', 'A03', 'A04'] as const) addCard(run, id);
    expect(addCard(run, 'C01')).toBe('full');
    expect(addCard(run, 'C01', 0)).toBeUndefined();
    expect(run.loadout.cards).toEqual(['A02', 'A03', 'A04', 'C01']);
  });
  it('건너뛰기는 골드 소량', () => {
    const run = newRun(6);
    run.stage = { at: 'reward', title: '', lines: [], choices: [{ type: 'enchant', options: ['E01', 'E02', 'E03'] }] };
    const g = run.gold;
    skipChoice(run);
    expect(run.gold).toBeGreaterThan(g);
  });
  it('상점: 구매 · 판매 · 덱 한도', () => {
    const run = newRun(8);
    run.floor = 2;
    toNode(run, 'shop');
    expect(run.stage.at).toBe('shop');
    run.gold = 1000;
    expect(buyPiece(run, 0)).toBeUndefined();
    expect(buyPiece(run, 0)).toBe('없는 상품');
    const before = run.gold;
    expect(sellPiece(run, 'K')).toBe('킹은 팔 수 없습니다');
    expect(sellPiece(run, run.deck.find((t) => t !== 'K')!)).toBeUndefined();
    expect(run.gold).toBeGreaterThan(before);
    leaveNode(run);
    expect(run.floor).toBe(3);
  });
  it('대장간: 비용이 단계마다 오르고 +5가 상한', () => {
    const run = newRun(9);
    run.floor = 2;
    toNode(run, 'forge');
    run.gold = 10000;
    for (let i = 0; i < 5; i++) expect(forgeUp(run, 'K')).toBeUndefined();
    expect(forgeUp(run, 'K')).toBe('이미 완전 강화(+5)');
    expect(run.gold).toBe(10000 - FORGE_COST.reduce((a, b) => a + b, 0));
  });
  it('크랙 제단: 꽝이 쌓이면 다음 제단에서 원하는 인챈트 확정', () => {
    const run = newRun(10);
    run.crackGauge = 3;
    run.floor = 2;
    toNode(run, 'altar');
    altarGamble(run);
    expect(run.stage.at === 'altar' && run.stage.result?.kind).toBe('pick');
    expect(run.crackGauge).toBe(0);
  });
});
