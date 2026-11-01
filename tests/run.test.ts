import { describe, expect, it } from 'vitest';
import { ACTS, FLOORS_PER_ACT, TOTAL_FLOORS, eliteFrom, inAct, actOf, type NodeKind } from '../src/data/run';
import { PART_SLOTS } from '../src/data/parts';
import { MAX_ASCENSION } from '../src/data/ascension';
import { Rng, type BattleState } from '../src/engine';
import { generateEncounter, encounterBattle } from '../src/run/legion';
import { addPart, buyPiece, enterNode, eventChoose, finishBattle, finishReward, forgeCarve, forgeUpgrade, newRun, sellPiece, skipChoice, takeChoice, type RunState } from '../src/run/run';

const won = (run: RunState): BattleState => {
  if (run.stage.at !== 'battle') throw new Error('not battle');
  const s = encounterBattle(run.deck, { parts: run.parts }, run.stage.encounter);
  return { ...s, winner: 0 };
};

describe('출하 구조 (규격 2.0)', () => {
  it('3공정 × 7층 = 21층 · 압력 10단계', () => {
    expect(FLOORS_PER_ACT * ACTS).toBe(TOTAL_FLOORS);
    expect(TOTAL_FLOORS).toBe(21);
    expect(MAX_ASCENSION).toBe(10);
  });
  it('지도: 공정 첫 층은 대국 · 끝은 반장 · 층마다 대국 하나 이상 · 노드 6종 · 검문!은 정해진 층부터', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const run = newRun(seed);
      run.map.forEach((nodes, i) => {
        const f = i + 1;
        if (inAct(f) === 1) expect(nodes.map((n) => n.kind)).toEqual(['battle']);
        else if (inAct(f) === FLOORS_PER_ACT) expect(nodes.map((n) => n.kind)).toEqual(['boss']);
        else {
          expect(nodes.some((n) => n.kind === 'battle')).toBe(true);
          for (const n of nodes) expect(['battle', 'elite', 'shop', 'forge', 'event']).toContain(n.kind);
          if (nodes.some((n) => n.kind === 'elite')) expect(inAct(f)).toBeGreaterThanOrEqual(eliteFrom(f));
        }
      });
    }
  });
  it('같은 시드면 같은 출하', () => {
    expect(JSON.stringify(newRun(5))).toBe(JSON.stringify(newRun(5)));
  });
  it('모든 층 · 종류의 적 군단이 판에 놓인다 (정예는 검문!에만)', () => {
    const rng = new Rng(3);
    for (let f = 1; f <= TOTAL_FLOORS; f++) {
      const kinds: NodeKind[] = inAct(f) === FLOORS_PER_ACT ? ['boss'] : ['battle', 'elite'];
      for (const k of kinds) {
        const e = generateEncounter(f, k, rng, 'pawn', 0);
        const s = encounterBattle(['K', 'P', 'N'], { parts: [] }, e);
        expect(s.pieces.filter((p) => p.side === 1 && p.type === 'K')).toHaveLength(1);
        expect(s.pieces.some((p) => p.side === 1 && p.elite)).toBe(k === 'elite');
        if (k === 'boss') expect(e.twist).toBeDefined();
      }
    }
  });
});

describe('보상과 노드', () => {
  it('일반 대국: 나사 + 기물 둘 · 각인 하나 — 각인은 기물을 골라 새긴다', () => {
    const run = newRun(11);
    enterNode(run, 0);
    const gold = run.gold;
    finishBattle(run, won(run));
    expect(run.gold).toBeGreaterThan(gold);
    if (run.stage.at !== 'reward') throw new Error('reward');
    const ch = run.stage.choices[0];
    expect(ch.type).toBe('mixed');
    if (ch.type !== 'mixed') return;
    expect(ch.options.filter((o) => o.startsWith('carve:'))).toHaveLength(1);
    const carve = ch.options.find((o) => o.startsWith('carve:'))!;
    expect(takeChoice(run, carve)).toBe('unit');
    expect(takeChoice(run, carve, 1)).toBeUndefined();
    expect(run.deck[1].carve).toBe(carve.split(':')[1]);
    expect(finishReward(run)).toBeUndefined();
    expect(run.floor).toBe(2);
  });
  it('검문!: 양날 한 쌍 — 부품을 받고 적 강화가 남는다', () => {
    const run = newRun(12);
    run.map[2] = [{ kind: 'elite' }];
    run.floor = 3;
    enterNode(run, 0);
    finishBattle(run, won(run));
    if (run.stage.at !== 'reward') throw new Error('reward');
    expect(run.stage.choices[0].type).toBe('pair');
    expect(takeChoice(run, '0')).toBeUndefined();
    expect(run.parts).toHaveLength(1);
    expect(run.threats.length).toBeGreaterThanOrEqual(1);
  });
  it('부품 칸이 차면 버릴 것을 골라야 한다', () => {
    const run = newRun(1);
    run.parts = ['lens', 'drum', 'spur', 'helmet', 'blade'];
    expect(run.parts).toHaveLength(PART_SLOTS);
    expect(addPart(run, 'prism')).toBe('full');
    expect(addPart(run, 'prism', 0)).toBeUndefined();
    expect(run.parts).toContain('prism');
    expect(run.parts).not.toContain('lens');
  });
  it('패배하면 출하 끝 · 건너뛰기는 나사', () => {
    const run = newRun(3);
    enterNode(run, 0);
    const st = won(run);
    finishBattle(run, { ...st, winner: 1 });
    expect(run.stage).toEqual({ at: 'over', won: false });
    const r2 = newRun(4);
    enterNode(r2, 0);
    finishBattle(r2, won(r2));
    const g = r2.gold;
    skipChoice(r2);
    expect(r2.gold).toBeGreaterThan(g);
  });
  it('고물상: 사고 팔기 · 공방: 각인 또는 다듬기 하나만', () => {
    const run = newRun(5);
    run.gold = 999;
    run.map[1] = [{ kind: 'shop' }];
    run.floor = 2;
    enterNode(run, 0);
    const n = run.deck.length;
    expect(buyPiece(run, 0)).toBeUndefined();
    expect(run.deck.length).toBe(n + 1);
    expect(sellPiece(run, run.deck.length - 1)).toBeUndefined();
    expect(sellPiece(run, 0)).toBeDefined(); // 킹은 못 판다
    const f = newRun(6);
    f.map[1] = [{ kind: 'forge' }];
    f.floor = 2;
    f.deck = [{ t: 'K' }, { t: 'P' }, { t: 'N' }];
    enterNode(f, 0);
    expect(forgeUpgrade(f, 1, 'N')).toBeUndefined();
    expect(f.deck[1].t).toBe('N');
    expect(forgeCarve(f, 0, 2)).toBeDefined(); // 이미 한 번 했다
  });
  it('돌발은 열둘, 결과가 남는다', () => {
    const run = newRun(8);
    run.map[1] = [{ kind: 'event', event: 'gambler' }];
    run.floor = 2;
    enterNode(run, 0);
    eventChoose(run, 1);
    expect(run.stage.at === 'event' && run.stage.result).toBeTruthy();
    expect(actOf(run.floor)).toBe(1);
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
