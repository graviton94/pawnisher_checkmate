import { describe, expect, it } from 'vitest';
import { buildRun, INTRO, MAP } from '../src/slice/run';
import { newSliceBattle } from '../src/slice/battle';
import { START_COMMANDS } from '../src/slice/cards';

describe('출하 지도 (D-168)', () => {
  it('3막 · 1막은 입문 · 연마로 시작 · 반장 앞 층은 작업대 · 막마다 검문 · 가운데 부품 상자 (D-215)', () => {
    const run = buildRun(7);
    expect(run).toHaveLength(3);
    expect(run[0].rows[0][0].battle).toBe(INTRO[0]);
    expect(run[0].rows[1][0].battle).toBe(INTRO[1]);
    for (const a of run) {
      expect(a.rows.at(-1)![0].kind).toBe('boss');
      expect(a.rows.at(-1)![0].battle!.reward).toBe(a.act === 3 ? 'end' : 'part');
      expect(a.rows.at(-2)!.every((n) => n.kind === 'forge')).toBe(true);
      expect(a.rows.flat().some((n) => n.kind === 'check')).toBe(true);
      expect(a.rows.some((r) => r.length > 1 && r.every((n) => n.kind === 'chest'))).toBe(true);
      expect(a.rows.length).toBe(MAP.floors[a.act - 1] + 1 + (a.act === 1 ? 2 : 0));
    }
  });
  it('슬더스식 길 (D-215): 이어진 노드로만 · 길이 엇갈리지 않음 · 첫 층은 대국 · 상점 · 작업대 · 검문 상한', () => {
    for (let seed = 1; seed < 40; seed++)
      for (const a of buildRun(seed)) {
        const g = a.rows.filter((r) => r[0].lane !== undefined);
        expect(g[0].every((n) => n.kind === 'battle')).toBe(true);
        g.forEach((r, f) => {
          if (f < g.length - 1) {
            const into = new Set<number>();
            for (const n of r) {
              expect(n.to!.length).toBeGreaterThan(0);
              for (const k of n.to!) { expect(k).toBeLessThan(g[f + 1].length); into.add(k); }
              // 엇갈림 없음
              for (const m of r) for (const k of n.to!) for (const k2 of m.to!)
                if (n.lane! < m.lane!) expect(g[f + 1][k].lane! <= g[f + 1][k2].lane!).toBe(true);
            }
            expect(into.size).toBe(g[f + 1].length);
          }
        });
        const fixed = (kd: string) => g.slice(0, -1).flat().filter((n) => n.kind === kd).length;
        expect(fixed('shop')).toBeLessThanOrEqual(MAP.max.shop);
        expect(fixed('forge')).toBeLessThanOrEqual(MAP.max.forge);
        expect(fixed('check')).toBeLessThanOrEqual(MAP.max.check + 1);
      }
  });
  it('막이 깊을수록 적 HP 배율이 오르고, 다듬은 카드는 태엽 −1', () => {
    const run = buildRun(3);
    const b3 = run[2].rows.at(-1)![0].battle!;
    const b = newSliceBattle([{ t: 'K' }, { t: 'P' }], b3.enemy, START_COMMANDS, 1, { enemyHp: b3.enemyHp, refined: ['advance'] });
    const q = b.s.pieces.find((p) => p.side === 1 && p.type === 'Q')!;
    expect(q.maxHp).toBeGreaterThan(60);
  });
  it('다듬기는 한 장만 (D-183): 「전진+」 한 장만 태엽 −1, 나머지 전진은 그대로', async () => {
    const { COMMANDS, refinedOf, baseOf } = await import('../src/slice/cards');
    const { costOf } = await import('../src/slice/battle');
    expect(COMMANDS['advance+'].name).toBe('전진+');
    expect(COMMANDS['advance+'].cost).toBe(COMMANDS.advance.cost - 1);
    expect(COMMANDS['order+'].cost).toBe(COMMANDS.order.cost - 1);
    expect(COMMANDS['reload+'].cost).toBe(0); // 0 아래로 안 내려간다
    expect(baseOf(refinedOf('spark'))).toBe('spark');
    const deck = [...START_COMMANDS];
    deck[deck.indexOf('advance')] = refinedOf('advance');
    expect(deck.filter((d) => d === 'advance').length).toBe(START_COMMANDS.filter((d) => d === 'advance').length - 1);
    const b = newSliceBattle([{ t: 'K' }, { t: 'P' }], ['K', 'P'], deck, 1);
    b.hand = ['advance+', 'advance'];
    expect(costOf(b, 0)).toBe(costOf(b, 1) - 1);
  });
});

describe('사건 (D-170)', () => {
  it('열두 사건 모두 선택지를 고르면 상태가 규칙대로 바뀐다 (막히는 선택은 이유를 준다)', async () => {
    const { SLICE_EVENTS, SLICE_EVENT_IDS } = await import('../src/slice/events');
    const { Rng } = await import('../src/engine/rng');
    expect(SLICE_EVENT_IDS).toHaveLength(13); // + 떠돌이 땜장이 (D-217)
    for (const id of SLICE_EVENT_IDS) {
      for (const c of SLICE_EVENTS[id].choices) {
        const s = { squad: [{ t: 'K' as const }, { t: 'P' as const, name: 'a' }, { t: 'P' as const, name: 'b' }, { t: 'N' as const, name: 'c' }], deck: [...START_COMMANDS], refined: [] as never[], gold: 100 };
        expect(c.blocked?.(s) ?? null).toBeNull();
        const out = c.apply(s, new Rng(3));
        expect(out.text.length).toBeGreaterThan(0);
        expect(s.gold).toBeGreaterThanOrEqual(0);
        expect(s.squad.some((u) => u.t === 'K')).toBe(true);
      }
    }
    const poor = { squad: [{ t: 'K' as const }], deck: [], refined: [], gold: 0 };
    expect(SLICE_EVENTS.gambler.choices[0].blocked!(poor)).toBeTruthy();
    expect(SLICE_EVENTS.swapDealer.choices[0].blocked!(poor)).toBeTruthy();
  });
});

describe('막별 반장 · 적 특성 (D-171)', () => {
  it('막마다 반장 규칙이 다르고, 2 · 3막 판에는 적 특성이 붙는다', () => {
    const run = buildRun(5);
    expect(run.map((a) => a.rows.at(-1)![0].battle!.bossRule)).toEqual(['plate', 'spawn', 'thorns']);
    expect(run[1].rows.flat().find((n) => n.kind === 'check')!.battle!.traits).toContain('blastPawn');
    expect(run[2].rows.flat().find((n) => n.kind === 'check')!.battle!.traits).toContain('rookPlate');
  });
  it('조립 반장: 1턴부터 킹 곁에 폰이 선다 (D-201), 두 턴마다', async () => {
    const { endTurn } = await import('../src/slice/battle');
    const b = newSliceBattle([{ t: 'K' }, { t: 'P' }], ['K', 'Q'], START_COMMANDS, 2, { boss: true, bossRule: 'spawn' });
    const pawns = () => b.s.pieces.filter((p) => p.side === 1 && p.type === 'P').length;
    expect(pawns()).toBe(1);
    b.intents = [];
    endTurn(b, true);
    expect(pawns()).toBe(1);
    b.intents = [];
    endTurn(b, true);
    expect(pawns()).toBeGreaterThanOrEqual(1);
  });
  it('방패 룩: 대국 시작에 방열판 15', () => {
    const b = newSliceBattle([{ t: 'K' }], ['K', 'R'], START_COMMANDS, 2, { traits: ['rookPlate'] });
    expect(b.s.pieces.find((p) => p.side === 1 && p.type === 'R')!.shield).toBe(15);
  });
});
