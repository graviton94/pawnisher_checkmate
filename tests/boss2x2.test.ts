import { describe, expect, it } from 'vitest';
import { dangerSquares, endTurn, intentHits, newSliceBattle, playCard, type SliceBattle } from '../src/slice/battle';
import { bossAim, bossSlamCells, giantGroups } from '../src/slice/giant';
import { processBefore } from '../src/slice/process';
import { bestAction } from '../src/slice/bot';
import { battleFor, FINAL_BOSS } from '../src/slice/run';
import { BOSS_PAIRS, SLICE, type BossRule } from '../src/slice/cards';
import { GIANT_AT } from '../src/data/giants';
import { Rng } from '../src/engine/rng';
import { kingOf, legalMoves, simulate, type Piece } from '../src/engine';

/** 2×2 특별 보스 (D-513, GDD 21장 §3-B) — 한 몸 · HP 하나 · 거대 주물 걸음 · 격노 재기립 */
const squad = [{ t: 'K' }, { t: 'R' }, { t: 'N' }, { t: 'P' }] as never;
const deck = ['advance', 'leap', 'kingStep', 'order', 'advance', 'leap'] as never;
const boss = (rule: BossRule = 'plate', seed = 3): SliceBattle => newSliceBattle(squad, ['K', 'R', 'P', 'P', 'N'], deck, seed, { boss: true, bossRule: rule });
const group = (b: SliceBattle): Piece[] => [...giantGroups(b.s).values()].find((g) => g[0].giant?.boss) ?? [];
const core = (b: SliceBattle): Piece => kingOf(b.s, 1)!;
const anchor = (b: SliceBattle) => ({ x: Math.min(...group(b).map((p) => p.x)), y: Math.min(...group(b).map((p) => p.y)) });
/** 판을 비우고 보스 · 내 기물만 남긴다 (내 기물 자리는 직접) */
const clearFoes = (b: SliceBattle): void => {
  b.s.pieces = b.s.pieces.filter((p) => p.side === 0 || p.giant?.boss);
};
const mine = (b: SliceBattle, t: string): Piece => b.s.pieces.find((p) => p.side === 0 && p.type === t)!;

describe('2×2 특별 보스 — 몸 · 배치 (D-513)', () => {
  it('적 진영 맨 뒤 두 줄 가운데에 2×2로 선다 — 왼아래가 본체, 나머지 셋은 몸 칸', () => {
    const b = boss();
    const g = group(b);
    expect(g.length).toBe(4);
    expect(anchor(b)).toEqual({ x: 2, y: 4 });
    const k = core(b);
    expect(k.x).toBe(2);
    expect(k.y).toBe(4);
    expect(k.body).toBeUndefined();
    for (const p of g.filter((q) => q !== k)) expect(p.body).toBe(k.id);
    for (const p of g) expect(legalMoves(b.s, p)).toEqual([]);
    // 칸이 겹치지 않고 호위가 모두 판 위에 남는다 (킹 밖 4기 + 몸 칸 3)
    expect(new Set(b.s.pieces.map((p) => `${p.x},${p.y}`)).size).toBe(b.s.pieces.length);
    expect(b.s.pieces.filter((p) => p.side === 1).length).toBe(4 + 4);
    // 본체가 몸 칸보다 목록 앞 (킹을 찾는 옛 코드가 본체를 먼저 만난다)
    expect(b.s.pieces.indexOf(k)).toBeLessThan(Math.min(...g.filter((q) => q !== k).map((q) => b.s.pieces.indexOf(q))));
  });
  it('반장 여섯 · 도금왕 모두 2×2 하나 — 반장 판엔 거대 주물이 서지 않는다 (8폭은 x 3~4)', () => {
    const rules = BOSS_PAIRS.flatMap(([a, c], i) => [[a, i + 1], [c, i + 1]] as [BossRule, 1 | 2 | 3][]);
    for (const asc of [0, 3, 5]) {
      for (const [rule, act] of rules) {
        const def = battleFor(act, 'boss', new Rng(7), asc, rule);
        expect(def.giants).toBeUndefined();
        const b = newSliceBattle(squad, def.enemy, deck, 11, { boss: true, bossRule: rule, width: def.w, height: def.h, giants: def.giants, process: def.process });
        expect([...giantGroups(b.s).values()].length).toBe(1);
        expect(group(b).length).toBe(4);
        // 조립 반장은 1턴 시작에 폰 하나를 찍는다 (폰이 셋 미만일 때)
        const pawns = def.enemy.filter((t) => t === 'P').length;
        expect(b.s.pieces.filter((p) => p.side === 1 && !p.giant).length).toBe(def.enemy.length - 1 + (rule === 'spawn' && pawns < 3 ? 1 : 0));
      }
      const fin = FINAL_BOSS(asc);
      const b = newSliceBattle(squad, fin.enemy, deck, 11, { boss: true, bossRule: 'gilded', width: fin.w, height: fin.h });
      expect(anchor(b)).toEqual({ x: 3, y: 5 });
      expect(b.s.pieces.filter((p) => p.side === 1 && !p.giant).length).toBe(fin.enemy.length - 1 + 1); // 도금왕도 1턴에 폰을 찍는다
      expect(new Set(b.s.pieces.map((p) => `${p.x},${p.y}`)).size).toBe(b.s.pieces.length);
    }
  });
  it('거대 주물 3종은 검문 정예로만 — 반장 · 일반 대국(도전 포함)에는 없다', () => {
    for (let act = 1; act <= 3; act++) for (const lv of [0, 3, 4, 8]) expect(GIANT_AT.boss(act, lv)).toBeNull();
    expect(GIANT_AT.battleOdds).toBe(0);
    for (let s = 0; s < 20; s++) for (const act of [2, 3] as const) expect(battleFor(act, 'battle', new Rng(s), 6).giants).toBeUndefined();
    expect(battleFor(2, 'check', new Rng(1), 0).giants).toEqual(['P']);
  });
});

describe('2×2 특별 보스 — 피해 한 번 · 체크 (D-513)', () => {
  it('한 공격이 몸 두 칸에 닿아도 킹 HP에서 한 번만 깎는다', () => {
    const b = boss();
    clearFoes(b);
    const k = mine(b, 'K');
    Object.assign(k, { x: 1, y: 3 });
    const s0 = { ...b.s, turnSide: 0 as const };
    const hp0 = core(b).hp + core(b).shield;
    // (1,4)에 내려앉은 킹의 둘레 여덟 칸에 본체(2,4)와 몸 칸(2,5)이 함께 든다
    const sim = simulate(s0, [{ pieceId: k.id, to: { x: 1, y: 4 } }], { freeAp: true });
    expect(sim.ok).toBe(true);
    const atk = sim.events.find((e) => e.type === 'attack')!;
    if (atk.type !== 'attack') throw new Error();
    expect(atk.hits.length).toBe(1);
    expect(atk.hits[0].targetId).toBe(core(b).id);
    const after = sim.state.pieces.find((p) => p.id === core(b).id)!;
    expect(hp0 - (after.hp + after.shield)).toBe(atk.hits[0].damage);
  });
  it('몸 칸만 맞혀도 킹 HP가 깎이고, 직선 공격은 몸 첫 칸에서 멈춘다', () => {
    const b = boss();
    clearFoes(b);
    const r = mine(b, 'R');
    Object.assign(r, { x: 3, y: 1 });
    b.s.pieces = b.s.pieces.filter((p) => p.side === 1 || p === r || p.type === 'K');
    mine(b, 'K').x = 0;
    mine(b, 'K').y = 0;
    const sim = simulate({ ...b.s, turnSide: 0 }, [{ pieceId: r.id, to: { x: 3, y: 2 } }], { freeAp: true });
    const atk = sim.events.find((e) => e.type === 'attack');
    if (!atk || atk.type !== 'attack') throw new Error('공격 없음');
    // 룩 줄 (3,3) → 몸 칸 (3,4)에서 멈춘다 — (3,5)는 범위 밖
    expect(atk.area.some((a) => a.x === 3 && a.y === 4)).toBe(true);
    expect(atk.area.some((a) => a.x === 3 && a.y === 5)).toBe(false);
    expect(atk.hits.map((h) => h.targetId)).toEqual([core(b).id]);
  });
  it('체크: 턴 시작 HP 2 이상이면 한 번은 HP 1로 버티고, 다음에 쓰러지면 몸 칸도 함께 사라진다 (처치 수는 하나)', () => {
    const b = boss();
    clearFoes(b);
    const k = mine(b, 'K');
    Object.assign(k, { x: 1, y: 3, atk: 9999 });
    const s0 = { ...b.s, turnSide: 0 as const };
    const sim = simulate(s0, [{ pieceId: k.id, to: { x: 1, y: 4 } }], { freeAp: true });
    const after = sim.state.pieces.find((p) => p.id === core(b).id)!;
    expect(after.hp).toBe(1);
    expect(sim.state.winner).toBeNull();
    // 다음 턴 (HP 1에서 시작 — 체크 보호 없음)
    const s1 = { ...sim.state, turnSide: 0 as const };
    const sim2 = simulate(s1, [{ pieceId: k.id, to: { x: 1, y: 3 } }], { freeAp: true });
    expect(sim2.state.winner).toBe(0);
    expect(sim2.state.pieces.some((p) => p.giant?.boss)).toBe(false);
    expect(sim2.removed.filter((p) => p.side === 1).length).toBe(1);
  });
});

describe('2×2 특별 보스 — 걷기 · 예고 · 내리찍기 (D-513)', () => {
  it('1턴엔 서서 한 변 네 칸을 예고하고, 2턴부터 묶음째 내 킹 쪽으로 한 칸 걷는다', () => {
    const b = boss();
    const gid = core(b).giant!.id;
    const dir = b.giantAim![gid];
    expect(Math.abs(dir.x) + Math.abs(dir.y)).toBe(1);
    const a0 = anchor(b);
    const cells = bossSlamCells(b.s, a0, dir);
    expect(cells.length).toBeLessThanOrEqual(4);
    const danger = new Set(dangerSquares(b).map((q) => `${q.x},${q.y}`));
    for (const c of cells) expect(danger.has(`${c.x},${c.y}`)).toBe(true);
    const r = endTurn(b, true);
    if (r === 'warn') throw new Error();
    const a1 = anchor(b);
    expect(Math.max(Math.abs(a1.x - a0.x), Math.abs(a1.y - a0.y))).toBe(1);
    expect(a1.y).toBeLessThan(a0.y);
    // 네 칸이 같이 움직였다
    const k = core(b);
    for (const p of group(b)) expect([p.x - k.x, p.y - k.y]).toEqual([p.giant!.dx, p.giant!.dy]);
  });
  it('예고한 변을 적 차례 끝에 반장 킹 공격으로 내리찍는다 — 미리보기 피해 = 실제 피해', () => {
    const b = boss();
    clearFoes(b);
    const r = mine(b, 'R');
    Object.assign(r, { x: 2, y: 3, hp: 400, maxHp: 400 }); // 본체 바로 앞 (아래 변)
    bossAim(b);
    b.intents = [];
    const want = intentHits(b).find((h) => h.pieceId === r.id);
    expect(want).toBeDefined();
    const res = endTurn(b, true);
    if (res === 'warn') throw new Error();
    const slam = res.events.find((e) => e.type === 'blast' && e.fx === 'slam');
    expect(slam && slam.type === 'blast' && slam.label).toContain('내리찍기');
    expect(400 - mine(b, 'R').hp).toBe(want!.damage);
  });
  it('여러 시드에서 예고 = 실행 (위험 칸 · 맞을 피해)', () => {
    for (let seed = 1; seed < 16; seed++) {
      for (const rule of ['plate', 'spawn', 'magnet', 'alarm', 'thorns', 'inspect'] as BossRule[]) {
        const b = boss(rule, seed);
        for (let t = 0; t < 4 && b.s.winner === null; t++) {
          const want = intentHits(b);
          const before = new Map(b.s.pieces.filter((p) => p.side === 0).map((p) => [p.id, p.hp + p.shield]));
          const r = endTurn(b, true);
          if (r === 'warn') break;
          for (const h of want) {
            if (h.killed) continue;
            const now = b.s.pieces.find((p) => p.id === h.pieceId);
            if (now) expect((before.get(h.pieceId) ?? 0) - (now.hp + now.shield)).toBe(h.damage);
          }
        }
      }
    }
  });
});

describe('2×2 특별 보스 — 2단계 · 면역 · 공정 판 (D-513)', () => {
  it('처음 쓰러지면 제자리에서 묶음째 격노로 다시 서고, 꺾인 두 변 일곱 칸을 겨눈다 · 호위 폰은 몸 둘레', () => {
    const b = boss();
    clearFoes(b);
    const k = mine(b, 'K');
    Object.assign(k, { x: 1, y: 3, atk: 9999 });
    const c0 = core(b);
    Object.assign(c0, { hp: 1, shield: 0 });
    const cells0 = group(b).map((p) => `${p.x},${p.y}`).sort();
    b.hand = ['kingStep'];
    b.ap = 9;
    const r = playCard(b, 0, k.id, { x: 1, y: 4 });
    if (typeof r === 'string') throw new Error(r);
    expect(b.phase2).toBe(true);
    expect(b.s.winner).toBeNull();
    const c1 = core(b);
    expect(c1.id).toBe(c0.id);
    expect(c1.hp).toBe(Math.max(1, Math.round(c1.maxHp * SLICE.bossPhase2Hp)));
    expect(group(b).map((p) => `${p.x},${p.y}`).sort()).toEqual(cells0);
    for (const p of group(b)) expect(p.giant!.rage).toBe(true);
    const dir = b.giantAim![c1.giant!.id];
    expect(Math.abs(dir.x) + Math.abs(dir.y)).toBe(2);
    // 판 안쪽이면 꺾인 두 변 = 일곱 칸 (판 끝에 걸리면 그만큼 빠진다)
    expect(bossSlamCells(b.s, { x: 2, y: 2 }, { x: -1, y: -1 }).length).toBe(7);
    expect(bossSlamCells(b.s, { x: 2, y: 2 }, { x: 0, y: -1 }).length).toBe(4);
    const guard = b.s.pieces.find((p) => p.side === 1 && p.type === 'P');
    expect(guard).toBeDefined();
    const a = anchor(b);
    expect(guard!.x >= a.x - 1 && guard!.x <= a.x + 2 && guard!.y >= a.y - 1 && guard!.y <= a.y + 2).toBe(true);
    expect(r.events.some((e) => e.type === 'respawn' && e.label?.includes('격노'))).toBe(true);
  });
  it('밀치기에 밀리지 않는다 — 제 몸 칸은 벽이라 본체만 충돌 피해 한 번', () => {
    const b = boss();
    clearFoes(b);
    const r = mine(b, 'R');
    Object.assign(r, { x: 0, y: 2 });
    b.hand = ['shove'];
    b.ap = 9;
    const cells0 = group(b).map((p) => `${p.x},${p.y}`).sort();
    const res = playCard(b, 0, r.id, { x: 2, y: 2 });
    if (typeof res === 'string') throw new Error(res);
    expect(group(b).map((p) => `${p.x},${p.y}`).sort()).toEqual(cells0);
    const bump = res.events.find((e) => e.type === 'blast' && /충돌/.test(e.label));
    expect(bump && bump.type === 'blast' && bump.hits.map((h) => h.targetId)).toEqual([core(b).id]);
  });
  it('컨베이어 · 자석 레일은 2×2를 옮기지 않는다', () => {
    for (const kind of ['conveyor', 'magnet'] as const) {
      const b = newSliceBattle(squad, ['K', 'R', 'P', 'P', 'N'], deck, 5, { boss: true, bossRule: kind === 'magnet' ? 'magnet' : 'spawn', process: kind });
      if (b.proc && kind === 'conveyor') b.proc.row = anchor(b).y;
      if (b.proc && kind === 'magnet') b.proc.col = 0;
      b.intents = [];
      const before = group(b).map((p) => `${p.id}:${p.x},${p.y}`);
      const turn0 = b.turn;
      // 적 차례 하나 (내 차례 시작 걷기 전의 자리로 비교)
      const r = endTurn(b, true);
      if (r === 'warn') throw new Error();
      const moved = r.events.filter((e) => e.type === 'move' && group(b).some((p) => p.id === e.pieceId));
      // 걷기(내 차례 시작)는 네 칸 모두 같은 걸음 — 공정이 한 칸만 옮긴 흔적은 없다
      const ids = new Set(moved.map((e) => (e.type === 'move' ? e.pieceId : 0)));
      expect(ids.size === 0 || ids.size === 4).toBe(true);
      expect(b.turn).toBe(turn0 + 1);
      void before;
    }
  });
  it('금 간 바닥: 몸 밑이 꺼져도 떨어지지 않고 피해만 한 번', () => {
    const b = boss('inspect');
    const g = group(b);
    const under = [g[1], g[3]].map((p) => ({ x: p.x, y: p.y }));
    b.proc = { kind: 'crack', cells: under, cracks: Object.fromEntries(under.map((c) => [`${c.x},${c.y}`, 1])) };
    const hp0 = core(b).hp + core(b).shield;
    const evs = processBefore(b);
    expect(evs.length).toBe(1);
    const e = evs[0];
    if (e.type !== 'blast') throw new Error();
    expect(e.hits.length).toBe(1);
    expect(e.hits[0].targetId).toBe(core(b).id);
    expect(e.hits[0].killed).toBe(false);
    expect(hp0 - (core(b).hp + core(b).shield)).toBe(e.hits[0].damage);
    expect(group(b).length).toBe(4);
    expect(b.s.fallen!.length).toBe(2);
  });
  it('조립 반장의 폰은 몸 둘레 열두 칸에, 자석은 가장 가까운 몸 칸 쪽으로 당긴다', () => {
    const b = boss('spawn');
    const a = anchor(b);
    const spawned = b.s.pieces.filter((p) => p.side === 1 && p.type === 'P' && p.id > core(b).giant!.id);
    for (const p of spawned) expect(p.x >= a.x - 1 && p.x <= a.x + 2 && p.y >= a.y - 1 && p.y <= a.y + 2).toBe(true);
    const m = boss('magnet');
    if (m.pull) {
      const to = m.pull.to;
      const from = m.s.pieces.find((p) => p.id === m.pull!.id)!;
      const body = group(m);
      const d = (q: { x: number; y: number }) => Math.min(...body.map((c) => Math.max(Math.abs(c.x - q.x), Math.abs(c.y - q.y))));
      expect(d(to)).toBeLessThan(d(from));
    }
  });
});

describe('2×2 특별 보스 — 결정론 (D-513)', () => {
  it('같은 시드 · 같은 수 = 같은 판 (봇이 끝까지 둔다)', () => {
    const play = (): string => {
      const b = newSliceBattle(squad, ['K', 'Q', 'R', 'P', 'P', 'N'], [...deck, ...deck] as never, 21, { boss: true, bossRule: 'spawn', process: 'conveyor' });
      for (let n = 0; n < 60 && b.s.winner === null; n++) {
        const a = bestAction(b, 'greedy');
        if (!a) { endTurn(b, true); continue; }
        const r = playCard(b, a.i, a.pieceId, a.to);
        if (typeof r === 'string') endTurn(b, true);
      }
      return JSON.stringify({ s: b.s, turn: b.turn, aim: b.giantAim, phase2: b.phase2 });
    };
    expect(play()).toBe(play());
  });
});
