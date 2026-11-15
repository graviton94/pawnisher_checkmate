import { describe, expect, it } from 'vitest';
import { dangerSquares, endTurn, intentHits, intentRows, newSliceBattle, playCard, previewPlay, type SliceBattle } from '../src/slice/battle';
import { bossAim, bossPatternCells, giantDanger, giantGroups } from '../src/slice/giant';
import { RAID, raidPattern } from '../src/data/giants';
import { damageOf, kingOf, type Piece } from '../src/engine';
import type { BossRule } from '../src/slice/cards';

/** 레이드 반장 (D-518, GDD 21장 §3-C) — 패턴 · 패링 · 헛방 · 경직 창 · 거대 주물 · 이형 파훼 */
const squad = [{ t: 'K' }, { t: 'R' }, { t: 'N' }, { t: 'P' }] as never;
const deck = ['advance', 'leap', 'kingStep', 'order', 'advance', 'leap'] as never;
const boss = (rule: BossRule = 'plate', seed = 3): SliceBattle => newSliceBattle(squad, ['K', 'R', 'P', 'P', 'N'], deck, seed, { boss: true, bossRule: rule });
const group = (b: SliceBattle): Piece[] => [...giantGroups(b.s).values()].find((g) => g[0].giant?.boss) ?? [];
const gid = (b: SliceBattle): number => group(b)[0].giant!.id;
const core = (b: SliceBattle): Piece => kingOf(b.s, 1)!;
const anchor = (b: SliceBattle) => ({ x: Math.min(...group(b).map((p) => p.x)), y: Math.min(...group(b).map((p) => p.y)) });
const mine = (b: SliceBattle, t: string): Piece => b.s.pieces.find((p) => p.side === 0 && p.type === t)!;
/** 판을 비우고 보스 · 내 기물만, 적의 수 없이 */
const bare = (b: SliceBattle): void => {
  b.s.pieces = b.s.pieces.filter((p) => p.side === 0 || p.giant?.boss);
  b.intents = [];
  b.bombRow = null;
};
/** 내 기물 자리를 정하고(킹은 멀리) 반장이 다시 겨누게 한다 */
const setup = (b: SliceBattle, at: Partial<Record<string, { x: number; y: number }>>): void => {
  for (const p of b.s.pieces.filter((q) => q.side === 0)) Object.assign(p, at[p.type] ?? { x: -9, y: -9 });
  b.s.pieces = b.s.pieces.filter((p) => p.x >= 0);
  bossAim(b);
};
/** 턴 시작 예고 기록을 다시 (giantAimedG) — endTurn 전 */
const telegraph = (b: SliceBattle): void => {
  const cells = giantDanger(b);
  b.giantAimedG = cells.some((c) => b.s.pieces.some((p) => p.side === 0 && p.x === c.x && p.y === c.y)) ? [gid(b)] : [];
};

describe('레이드 패턴 — 반장마다 번갈아, 예고 = 실행 (D-518)', () => {
  it('반장마다 내리찍기 + 색깔 패턴을 턴마다 번갈아 · 도금왕은 셋 · 격노는 꺾어 찍기', () => {
    expect([1, 2, 3].map((t) => raidPattern('plate', false, t))).toEqual(['slam', 'sweep', 'slam']);
    expect([1, 2].map((t) => raidPattern('thorns', false, t))).toEqual(['slam', 'charge']);
    expect([1, 2, 3, 4].map((t) => raidPattern('gilded', false, t))).toEqual(['slam', 'sweep', 'charge', 'slam']);
    expect([1, 2].map((t) => raidPattern('alarm', true, t))).toEqual(['corner', 'sweep']);
    for (const r of ['plate', 'inspect', 'spawn', 'magnet', 'thorns', 'alarm', 'gilded']) expect(new Set(RAID.patterns[r]).size).toBeGreaterThanOrEqual(2);
  });
  it('쓸기 = 그 변 바깥 한 줄 판 끝까지 · 돌진 = 몸 폭 두 줄, 줄마다 첫 기물까지', () => {
    const b = boss();
    bare(b);
    const a = anchor(b); // (2,4)
    const sweep = bossPatternCells(b.s, a, { x: 0, y: -1 }, 'sweep');
    expect(sweep.length).toBe(b.s.width);
    expect(sweep.every((c) => c.y === a.y - 1)).toBe(true);
    // 돌진: 앞 기물이 뒤를 막아 준다
    setup(b, { R: { x: 2, y: 2 }, K: { x: 5, y: 0 } });
    const charge = bossPatternCells(b.s, a, { x: 0, y: -1 }, 'charge');
    expect(charge.filter((c) => c.x === 2).map((c) => c.y)).toEqual([3, 2]); // 룩(2,2)에서 멈춘다
    expect(charge.filter((c) => c.x === 3).map((c) => c.y)).toEqual([3, 2, 1, 0]);
  });
  it('위험 칸 · 적의 수 · 실행이 같은 패턴 · 같은 칸 — 피해 = 반장 공격 × 패턴 배율', () => {
    const b = boss('plate');
    bare(b);
    b.turn = 2; // 철갑 반장 짝수 턴 = 쓸기
    setup(b, { R: { x: 0, y: 3 }, K: { x: 5, y: 0 } });
    expect(b.bossPat).toBe('sweep');
    expect(dangerSquares(b).some((c) => c.x === 0 && c.y === 3)).toBe(true);
    const pred = intentHits(b).find((h) => h.pieceId === mine(b, 'R').id)!;
    expect(pred).toBeTruthy();
    const row = intentRows(b).find((r) => r.kind === 'blast')!;
    expect(row.label).toContain(RAID.names.sweep);
    const hp0 = mine(b, 'R').hp + mine(b, 'R').shield;
    const r = endTurn(b, true);
    if (r === 'warn') throw new Error('warn');
    const after = b.s.pieces.find((p) => p.id === pred.pieceId);
    expect(hp0 - (after ? after.hp + after.shield : 0)).toBe(Math.min(hp0, pred.damage));
  });
});

describe('패링 · 헛방 · 경직 창 (D-518)', () => {
  it('패링: 방열판으로 다 받아내면 경직 — 다음 내 차례에 걷지도 겨누지도 않고 철갑을 잃고 받는 피해 ×parryWeak', () => {
    const b = boss('plate');
    bare(b);
    setup(b, { R: { x: 2, y: 3 }, K: { x: 5, y: 0 } });
    expect(b.bossPat).toBe('slam');
    const rook = mine(b, 'R');
    rook.shield = 999;
    telegraph(b);
    const pos0 = anchor(b);
    const hp0 = rook.hp;
    const r = endTurn(b, true);
    if (r === 'warn') throw new Error('warn');
    expect(mine(b, 'R').hp).toBe(hp0);
    expect(r.events.some((e) => e.type === 'mark' && e.tag === '경직!')).toBe(true);
    expect(b.giantStun).toEqual([gid(b)]);
    expect(anchor(b)).toEqual(pos0); // 걷지 않았다
    expect(b.giantAim?.[gid(b)]).toBeUndefined(); // 겨누지 않는다
    expect(giantDanger(b)).toEqual([]);
    expect(core(b).shield).toBe(0);
    expect(core(b).weak).toBe(RAID.parryWeak);
    // 경직 창: 같은 공격이 ×1.6 — 미리보기와 실행이 같은 damageOf(takenMult)
    const k = core(b);
    const w = damageOf(b.s, mine(b, 'R'), k);
    const plain = damageOf(b.s, mine(b, 'R'), { ...k, weak: undefined });
    expect(w).toBeGreaterThan(plain);
    // 경직이 풀리면 다시 걷고 겨눈다 · 다음 타격은 막아도 경직이 없다(경직 면역 — 약점만)
    endTurn(b, true);
    expect(b.giantStun).toEqual([]);
    expect(b.giantStunImmune).toEqual([gid(b)]);
    expect(core(b).weak).toBeUndefined();
    expect(giantDanger(b).length).toBeGreaterThan(0);
  });
  it('막지 못하면(방열판 < 피해) 크게 맞는다 — 경직 없음', () => {
    const b = boss('plate');
    bare(b);
    setup(b, { R: { x: 2, y: 3 }, K: { x: 5, y: 0 } });
    const rook = mine(b, 'R');
    rook.shield = 1;
    telegraph(b);
    const hp0 = rook.hp;
    endTurn(b, true);
    expect((b.giantStun ?? []).length).toBe(0);
    const after = b.s.pieces.find((p) => p.id === rook.id);
    expect(after ? after.hp : 0).toBeLessThan(hp0);
  });
  it('헛방: 예고 칸에 있던 기물이 모두 빠지면 빈 땅을 친다 → 철갑을 잃는다 (경직은 아니다 · whiffWeak > 1이면 약점)', () => {
    const b = boss('plate');
    bare(b);
    setup(b, { R: { x: 2, y: 3 }, K: { x: 5, y: 0 } });
    telegraph(b);
    expect(b.giantAimedG).toEqual([gid(b)]);
    Object.assign(mine(b, 'R'), { x: 0, y: 0 }); // 빠졌다
    core(b).shield = 15;
    const r = endTurn(b, true);
    if (r === 'warn') throw new Error('warn');
    expect(r.events.some((e) => e.type === 'mark' && e.tag === '헛방!')).toBe(true);
    expect((b.giantStun ?? []).length).toBe(0);
    expect(core(b).weak).toBe(RAID.whiffWeak > 1 ? RAID.whiffWeak : undefined);
    // 철갑 반장은 이 턴(3턴)에 철갑을 다시 두르지만 헛방이 벗긴다
    expect(core(b).shield).toBe(0);
  });
  it('처음부터 예고 칸에 아무도 없었으면 헛방이 아니다', () => {
    const b = boss('plate');
    bare(b);
    setup(b, { R: { x: 0, y: 0 }, K: { x: 5, y: 0 } });
    telegraph(b);
    endTurn(b, true);
    expect(core(b).weak).toBeUndefined();
  });
  it('결정론: 같은 판 · 같은 수면 같은 경직 · 같은 피해', () => {
    const run = () => {
      const b = boss('thorns', 9);
      for (let t = 0; t < 4 && b.s.winner === null; t++) {
        const k = mine(b, 'K');
        if (k) k.shield = 50;
        endTurn(b, true);
      }
      return JSON.stringify({ s: b.s, st: b.giantStun, im: b.giantStunImmune });
    };
    expect(run()).toBe(run());
  });
  it('반장 HP는 2×2 과녁만큼 RAID.hp배', () => {
    const one = newSliceBattle(squad, ['K', 'R', 'P', 'P', 'N'], deck, 3, { boss: true, bossRule: 'plate', lab: 'A' });
    const b = boss('plate');
    void one;
    const plain = newSliceBattle(squad, ['K', 'R', 'P', 'P', 'N'], deck, 3, {});
    expect(core(b).maxHp).toBe(Math.round(kingOf(plain.s, 1)!.maxHp * RAID.hp));
  });
});

describe('거대 주물 · 이형 파훼 (D-518)', () => {
  const giantBattle = (): SliceBattle => newSliceBattle(squad, ['K', 'P', 'P', 'P', 'N'], deck, 5, { giants: ['P'] });
  const giantParts = (b: SliceBattle): Piece[] => [...giantGroups(b.s).values()][0] ?? [];
  it('거대 주물 내리찍기도 방열판으로 다 받아내면 경직 — 네 부위가 약점 · 걷지 않는다', () => {
    const b = giantBattle();
    b.s.pieces = b.s.pieces.filter((p) => p.side === 0 || p.giant);
    b.intents = [];
    const cells = giantDanger(b);
    expect(cells.length).toBeGreaterThan(0);
    const rook = mine(b, 'R');
    for (const p of b.s.pieces.filter((q) => q.side === 0)) Object.assign(p, { x: p === rook ? cells[0].x : p.type === 'K' ? 0 : -9, y: p === rook ? cells[0].y : p.type === 'K' ? 0 : -9 });
    b.s.pieces = b.s.pieces.filter((p) => p.x >= 0);
    rook.shield = 999;
    const pos0 = giantParts(b).map((p) => `${p.x},${p.y}`).join();
    const r = endTurn(b, true);
    if (r === 'warn') throw new Error('warn');
    expect(b.giantStun?.length).toBe(1);
    expect(giantParts(b).every((p) => p.weak === RAID.parryWeak)).toBe(true);
    expect(giantParts(b).map((p) => `${p.x},${p.y}`).join()).toBe(pos0);
    expect(giantDanger(b)).toEqual([]);
  });
  it('거대 주물 부위를 부수면 카드 +breakDraw', () => {
    const b = giantBattle();
    b.s.pieces = b.s.pieces.filter((p) => p.side === 0 || p.giant);
    const part = giantParts(b)[0];
    part.hp = 1;
    // 그 부위를 칠 수 있는 내 킹 수를 찾는다
    const k = mine(b, 'K');
    b.hand = ['kingStep'] as never;
    b.ap = 3;
    const i = 0;
    Object.assign(k, { x: part.x - 1, y: part.y - 2 });
    const hand0 = b.hand.length;
    const r = playCard(b, i, k.id, { x: part.x - 1, y: part.y - 1 });
    if (typeof r === 'string') throw new Error(r);
    expect(r.events.some((e) => e.type === 'attack' && e.hits.some((h) => h.targetId === part.id && h.killed))).toBe(true);
    expect(b.hand.length).toBe(hand0 - 1 + RAID.breakDraw);
  });
  it('이형 기물이 헛치면 기절에 더해 약점 ×formWeak', () => {
    const b = newSliceBattle(squad, ['K', 'R', 'P'], deck, 7, { forms: ['cannon'] });
    const cannon = b.s.pieces.find((p) => p.form === 'cannon')!;
    expect(cannon).toBeTruthy();
    b.aimed = [cannon.id];
    b.intents = [];
    const r = endTurn(b, true);
    if (r === 'warn') throw new Error('warn');
    const c2 = b.s.pieces.find((p) => p.id === cannon.id)!;
    expect(b.staggered).toContain(cannon.id);
    expect(c2.weak).toBe(RAID.formWeak);
    // 다음 턴 시작에 약점이 풀린다
    b.aimed = [];
    endTurn(b, true);
    expect(b.s.pieces.find((p) => p.id === cannon.id)?.weak).toBeUndefined();
  });
  it('약점 배율은 미리보기(previewPlay)에도 그대로 — 화면 숫자 = 실행', () => {
    const b = boss('plate');
    bare(b);
    setup(b, { N: { x: 0, y: 2 }, K: { x: 5, y: 0 } });
    b.hand = ['leap'] as never;
    b.ap = 3;
    const i = 0;
    const n = mine(b, 'N');
    core(b).shield = 0;
    const a = previewPlay(b, i, n.id, { x: 1, y: 4 });
    core(b).weak = RAID.parryWeak;
    const w = previewPlay(b, i, n.id, { x: 1, y: 4 });
    const dealt = (sim: typeof a) => sim!.events.flatMap((e) => (e.type === 'attack' ? e.hits.filter((h) => h.targetId === core(b).id).map((h) => h.damage) : [])).reduce((x, y) => x + y, 0);
    expect(dealt(w)).toBeGreaterThan(dealt(a));
  });
});
