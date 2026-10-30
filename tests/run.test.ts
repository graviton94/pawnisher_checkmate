import { ORDERS } from '../src/data/tactics';
import { orderProgress, pickOrder } from '../src/run/orders';
import type { PieceType } from '../src/engine/types';
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
  it('주문서: 전투마다 하나, 완수하면 나사 · 못 하면 미완 줄 (D-094)', () => {
    const run = newRun(3);
    enterNode(run, 0);
    const st = run.stage.at === 'battle' ? run.stage.encounter : null;
    expect(st!.order).toBeDefined();
    st!.order = 'fork2';
    const b = createBattle({ width: st!.width, height: st!.height, decks: [run.deck, st!.deck], loadouts: [run.loadout, st!.loadout] });
    b.winner = 0;
    b.record = [{ tactics: { fork: 2 } }, { tactics: {} }];
    const gold = run.gold;
    finishBattle(run, b);
    if (run.stage.at !== 'reward') throw new Error('보상 단계가 아님');
    expect(run.stage.lines.some((l) => l.startsWith('주문서 완수') && l.endsWith(`+${ORDERS.fork2.gold}`))).toBe(true);
    expect(run.gold).toBeGreaterThanOrEqual(gold + ORDERS.fork2.gold);

    const run2 = newRun(3);
    enterNode(run2, 0);
    if (run2.stage.at !== 'battle') throw new Error('대국이 아님');
    run2.stage.encounter.order = 'fork2';
    const b2 = createBattle({ width: 6, height: 6, decks: [run2.deck, ['K']] });
    b2.winner = 0;
    b2.record = [{ tactics: { fork: 1 } }, { tactics: {} }];
    finishBattle(run2, b2);
    const after = run2.stage as unknown as { at: string; lines: string[] };
    if (after.at !== 'reward') throw new Error('보상 단계가 아님');
    expect(after.lines).toContain('주문서 미완');
  });

  it('주문서 판정: 무손실 · 킹 무상처 · 폰 결정타', () => {
    const deck: PieceType[] = ['K', 'P', 'N'];
    const b = createBattle({ width: 6, height: 6, decks: [deck, ['K']] });
    b.winner = 0;
    expect(orderProgress('flawless', b, deck).done).toBe(true);
    expect(orderProgress('ironKing', b, deck).done).toBe(true);
    b.pieces = b.pieces.filter((p) => !(p.side === 0 && p.type === 'N'));
    expect(orderProgress('flawless', b, deck).failed).toBe(true);
    b.pieces.find((p) => p.side === 0 && p.type === 'K')!.hp -= 1;
    expect(orderProgress('ironKing', b, deck).failed).toBe(true);
    expect(orderProgress('pawnMate', b, deck).done).toBe(false);
    b.record = [{ tactics: {}, finisher: 'P' }, { tactics: {} }];
    expect(orderProgress('pawnMate', b, deck).done).toBe(true);
  });

  it('주문서는 군단으로 할 수 있는 것만 (폰이 없으면 폰 결정타 없음)', () => {
    for (let seed = 1; seed < 200; seed++) { const o = pickOrder(['K', 'N', 'N'], new Rng(seed)); expect(o).not.toBe('pawnWork'); expect(o).not.toBe('pawnMate'); }
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
    expect(buyPiece(run, 0)).toBe('“그런 물건 없어.”');
    const before = run.gold;
    expect(sellPiece(run, 'K')).toBe('“킹은 안 받아.”');
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
    expect(forgeUp(run, 'K')).toBe('“완성품이다. 더 손댈 데 없어.”');
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

describe('시드 코드 (D-099)', () => {
  it('코드 ↔ 시드가 오가고, 같은 시드면 같은 지도', async () => {
    const { seedCode, parseSeed } = await import('../src/run/seed');
    for (const n of [1, 2, 42, 123456789, 2 ** 30 - 1]) expect(parseSeed(seedCode(n))).toBe(n);
    expect(seedCode(1)).toMatch(/^[0-9A-Z]{5}-[0-9A-Z]{5}$/);
    // 소문자·하이픈 없이도 읽힌다
    expect(parseSeed(seedCode(77).toLowerCase().replace('-', ''))).toBe(77);
    // 이웃 시드는 전혀 다른 코드 (앞 다섯 자리가 같지 않다)
    expect(seedCode(1).slice(0, 5)).not.toBe(seedCode(2).slice(0, 5));
    // 지어낸 코드는 거의 통과하지 못한다 (검증값 20비트)
    const { Rng } = await import('../src/engine');
    const rng = new Rng(9);
    const A = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
    let pass = 0;
    for (let i = 0; i < 20000; i++) if (parseSeed(Array.from({ length: 10 }, () => A[rng.int(32)]).join('')) !== null) pass++;
    expect(pass).toBeLessThanOrEqual(2);
    // 한 글자만 바꿔도 걸린다
    const c = seedCode(424242);
    expect(parseSeed((c[0] === 'A' ? 'B' : 'A') + c.slice(1))).toBeNull();
    expect(parseSeed('ab-12')).toBeNull();
    expect(JSON.stringify(newRun(777).map)).toBe(JSON.stringify(newRun(777).map));
  });
});
