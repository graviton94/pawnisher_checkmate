import { describe, expect, it } from 'vitest';
import { buildRun, FTUE, INTRO, MAP } from '../src/slice/run';
import { endTurn, newSliceBattle, playCard } from '../src/slice/battle';
import { START_COMMANDS } from '../src/slice/cards';

describe('출하 지도 (D-168)', () => {
  it('3막 · 1막은 입문 한 판으로 시작(D-232) · 첫 줄 대국 = 핵심 부품 · 반장 앞 층은 작업대 · 막마다 검문 · 가운데 부품 상자 (D-215)', () => {
    const run = buildRun(7);
    // 3막 + 종막 (D-252): 종막은 최종 정비 → 고물상 → 도금왕
    expect(run).toHaveLength(4);
    expect(run[3].rows.map((r) => r[0].kind)).toEqual(['forge', 'shop', 'boss']);
    expect(run[3].rows[0][0].final).toBe(true);
    expect(run[3].rows[2][0].battle!.bossRule).toBe('gilded');
    expect(run[2].rows.at(-1)![0].battle!.reward).toBe('part');
    expect(run[3].rows[2][0].battle!.reward).toBe('end');
    expect(INTRO).toHaveLength(1);
    expect(run[0].rows[0][0].battle).toBe(INTRO[0]);
    expect(run[0].rows[1].every((n) => n.battle?.reward === 'kit')).toBe(true);
    for (const a of run.slice(0, 3)) {
      expect(a.rows.at(-1)![0].kind).toBe('boss');
      expect(a.rows.at(-1)![0].battle!.reward).toBe('part');
      expect(a.rows.at(-2)!.every((n) => n.kind === 'forge')).toBe(true);
      expect(a.rows.flat().some((n) => n.kind === 'check')).toBe(true);
      expect(a.rows.some((r) => r.length > 1 && r.every((n) => n.kind === 'chest'))).toBe(true);
      expect(a.rows.length).toBe(MAP.floors[a.act - 1] + 1 + (a.act === 1 ? 1 : 0));
    }
  });
  it('슬더스식 길 (D-215): 이어진 노드로만 · 길이 엇갈리지 않음 · 첫 층은 대국 · 상점 · 작업대 · 검문 상한', () => {
    for (let seed = 1; seed < 40; seed++)
      for (const a of buildRun(seed).slice(0, 3)) {
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
    expect(SLICE_EVENT_IDS).toHaveLength(35); // + 떠돌이 땜장이 (D-217) · 저울추 · 컨베이어 (D-247) · 확정 거래 셋 (D-283) · 2차 17 (D-287)
    for (const id of SLICE_EVENT_IDS) {
      for (const c of SLICE_EVENTS[id].choices) {
        const s = { squad: [{ t: 'K' as const }, { t: 'P' as const, name: 'a' }, { t: 'P' as const, name: 'b', cracked: true }, { t: 'N' as const, name: 'c' }], deck: [...START_COMMANDS, 'order~' as never], refined: [] as never[], gold: 200 };
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

describe('저울추 · 녹슨 카드 (D-247)', () => {
  it('고른 카드는 태엽 −1, 다른 카드 한 장은 녹슬어 태엽 +1 · 녹슨 카드를 다듬으면 원래대로', async () => {
    const { counterweight } = await import('../src/slice/events');
    const { COMMANDS, refineOnce, rustOnce } = await import('../src/slice/cards');
    const { Rng } = await import('../src/engine/rng');
    const s = { squad: [{ t: 'K' as const }], deck: ['leap', 'advance', 'order'] as never[], refined: [] as never[], gold: 0 };
    const before = s.deck.reduce((a: number, id: string) => a + COMMANDS[id as keyof typeof COMMANDS].cost, 0);
    const text = counterweight(s, 'leap' as never, new Rng(1));
    expect(text).toContain('녹슨다');
    expect(s.deck[0]).toBe('leap+');
    expect(s.deck.filter((id: string) => id.endsWith('~'))).toHaveLength(1);
    expect(s.deck.reduce((a: number, id: string) => a + COMMANDS[id as keyof typeof COMMANDS].cost, 0)).toBe(before);
    expect(refineOnce(rustOnce('leap' as never))).toBe('leap');
    expect(rustOnce('leap+' as never)).toBe('leap');
    expect(COMMANDS['order~' as keyof typeof COMMANDS].cost).toBe(COMMANDS['order' as keyof typeof COMMANDS].cost + 1);
  });
});

describe('막별 반장 · 적 특성 (D-171)', () => {
  it('막마다 반장 규칙이 다르고 (처음 출하 기준, D-274), 2 · 3막 판에는 적 특성이 붙는다', () => {
    const run = buildRun(5, 0, true);
    expect(run.map((a) => a.rows.at(-1)![0].battle!.bossRule)).toEqual(['plate', 'spawn', 'thorns', 'gilded']);
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
  it('첫 출하 안전망 (D-232): 처음 출하면 1막 반장 HP만 −35%, 지도는 같다', () => {
    const a = buildRun(9, 0, false);
    const b = buildRun(9, 0, true);
    const boss = (r: typeof a, k: number) => r[k].rows.at(-1)![0].battle!;
    expect(boss(b, 0).kingHp).toBeCloseTo(boss(a, 0).kingHp * FTUE.firstBossHp);
    expect(boss(b, 1).kingHp).toBe(boss(a, 1).kingHp);
    expect(b[0].rows.map((r) => r.map((n) => n.kind).join()).join('|')).toBe(a[0].rows.map((r) => r.map((n) => n.kind).join()).join('|'));
  });
  it('입문 한 판 (D-232 · D-241): 짜 둔 손패로 1턴에 폰 → 나이트 짓밟기 3연쇄, 적 차례 뒤 붉은 칸 위의 내 기물이 빠지며 칠 수 있다', () => {
    const d = INTRO[0];
    const b = newSliceBattle([{ t: 'K' }, { t: 'P' }, { t: 'N' }], d.enemy, d.order!, 5, { width: d.w, height: d.h, enemyKingHp: d.kingHp, enemyHp: d.enemyHp, place: d.place, ordered: true });
    expect(b.hand.slice(0, 2)).toEqual(['advance', 'leap']);
    const id = (t: string) => b.s.pieces.find((p) => p.side === 0 && p.type === t)!.id;
    expect(typeof playCard(b, 0, id('P'), { x: 1, y: 2 })).toBe('object');
    expect(b.kills).toBe(1);
    expect(typeof playCard(b, b.hand.indexOf('leap'), id('N'), { x: 2, y: 2 })).toBe('object');
    expect(b.kills).toBeGreaterThanOrEqual(3);
    endTurn(b, true);
    expect(b.s.winner).toBeNull();
    expect((b.graze ?? []).length).toBeGreaterThan(0);
  });
});
