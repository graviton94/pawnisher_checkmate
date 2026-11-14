import { describe, expect, it } from 'vitest';
import { cardPieces, crackOrScrap, fallenAfter, newSliceBattle, playCard } from '../src/slice/battle';
import { COMMANDS, MELT, REWARD_COMMANDS, START_DECK } from '../src/slice/cards';
import { kingOf } from '../src/engine';

/** 쇳물 서약 (D-462): 종막에서만 · 킹이 아닌 분대원을 녹여 도금왕을 친다 · 녹인 분대원은 폐기 */
const squad = [{ t: 'K' as const }, { t: 'R' as const }, { t: 'P' as const }];
describe('쇳물 서약 (D-462)', () => {
  it('도금왕 판에만 덱에 들어오고 보상으로는 나오지 않는다', () => {
    const fin = newSliceBattle(squad, ['K', 'Q', 'R'], [...START_DECK], 5, { boss: true, bossRule: 'gilded' });
    const other = newSliceBattle(squad, ['K', 'R'], [...START_DECK], 5, { boss: true, bossRule: 'plate' });
    const all = (b: typeof fin) => [...b.draw, ...b.hand, ...b.discard];
    expect(all(fin).filter((c) => c === 'meltOath')).toHaveLength(1);
    expect(all(other)).not.toContain('meltOath');
    expect(REWARD_COMMANDS).not.toContain('meltOath');
  });
  it('킹은 고를 수 없고, 녹이면 도금왕이 최대 HP × MELT.mult만큼 맞고 그 분대원은 폐기된다 · 대국에 한 번', () => {
    const b = newSliceBattle(squad, ['K', 'Q', 'R'], [...START_DECK], 5, { boss: true, bossRule: 'gilded' });
    b.s.heat = 1;
    b.hand = ['meltOath'];
    expect(cardPieces(b, 0).some((p) => p.type === 'K')).toBe(false);
    const rook = b.s.pieces.find((p) => p.side === 0 && p.type === 'R')!;
    const k = kingOf(b.s, 1)!;
    k.shield = 0;
    const hp0 = k.hp;
    const r = playCard(b, 0, rook.id);
    expect(typeof r).toBe('object');
    // 도금왕은 쓰러지면 2단계로 다시 서므로 판의 HP가 아니라 맞은 피해로 본다
    const hit = typeof r === 'string' ? null : r.events.flatMap((e) => (e.type === 'attack' ? e.hits : []))[0];
    expect(hit?.damage).toBe(Math.round(rook.maxHp * MELT.mult));
    expect(hp0).toBeGreaterThan(0);
    // 대국에 한 번 (2026-11-14): 버림 더미로 돌지 않는다
    expect([...b.draw, ...b.hand, ...b.discard, ...(b.played ?? [])]).not.toContain('meltOath');
    const { scrapped } = crackOrScrap(fallenAfter(b, squad).map((f) => f.crew));
    expect(scrapped.map((u) => u.t)).toEqual(['R']);
    expect(COMMANDS.meltOath.cost).toBe(1);
  });
});

/** D-477 베타 점검: 킹 곁에 빈 칸이 없으면 징집(땜질 보충병)은 낼 수 없다 — 손패에서 꺼지고 봇도 고르지 않는다 */
describe('징집 카드 — 킹 곁이 막히면 못 낸다', () => {
  it('canPlay가 킹 곁 빈 칸을 본다', async () => {
    const { newSliceBattle, canPlay, spawnSpot } = await import('../src/slice/battle');
    const { START_SQUAD } = await import('../src/slice/cards');
    const b = newSliceBattle(START_SQUAD.map((t) => ({ t })) as never, ['P', 'K'], ['draft', 'draft', 'draft', 'draft', 'draft'], 5, { width: 6, height: 6 });
    b.ap = 5;
    const i = b.hand.indexOf('draft');
    expect(i).toBeGreaterThanOrEqual(0);
    expect(canPlay(b, i)).toBe(spawnSpot(b) !== null);
    // 킹 둘레를 모두 채운다
    const k = b.s.pieces.find((p) => p.side === 0 && p.type === 'K')!;
    let id = 900;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      const x = k.x + dx, y = k.y + dy;
      if ((dx || dy) && x >= 0 && y >= 0 && x < 6 && y < 6 && !b.s.pieces.some((p) => p.x === x && p.y === y)) b.s.pieces.push({ ...k, id: id++, type: 'P', x, y, hp: 10, maxHp: 10 } as never);
    }
    expect(spawnSpot(b)).toBeNull();
    expect(canPlay(b, i)).toBe(false);
  });
});
