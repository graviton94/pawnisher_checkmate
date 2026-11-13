import { describe, expect, it } from 'vitest';
import { findPiece, type BattleEvent } from '../src/engine';
import { heatAt, newSliceBattle, playCard, previewPlay, type SliceBattle } from '../src/slice/battle';
import { HEAT_DEFAULT, SLICE, type CommandId } from '../src/slice/cards';

/**
 * 공정 열기 · 적중 연쇄 (D-454). 다른 테스트는 공식 확인을 위해 열기를 끈다(tests/setup.ts) — 여기서는 실제 계단으로 본다.
 * ① 1턴 = 배치 턴(치기는 되지만 ×0.25) ② 턴마다 오른다 ③ 미리보기 = 실행 ④ 같은 적을 다시 치면 연쇄 +2.
 */
const setup = (heat: number) => {
  const b = newSliceBattle([{ t: 'K' }, { t: 'R' }, { t: 'N' }, { t: 'P' }], ['K', 'P', 'P', 'P', 'P'], [], 420, { width: 6, height: 6 });
  const coords = [[5, 0], [0, 0], [4, 0], [1, 1], [5, 5], [0, 3], [3, 4], [2, 5], [5, 3]];
  const ordered = [...b.squadIds.map((id) => findPiece(b.s, id)!), ...b.s.pieces.filter((p) => p.side === 1).sort((a, z) => Number(z.type === 'K') - Number(a.type === 'K') || a.id - z.id)];
  ordered.forEach((p, i) => { [p.x, p.y] = coords[i]; if (p.side === 1) { p.hp = p.maxHp = 300; p.def = 0; p.shield = 0; } });
  b.intents = []; b.graze = []; b.grazeDanger = []; b.aimed = []; b.shocked = [];
  b.ap = 9;
  b.s.heat = heat;
  const rook = b.squadIds[1];
  findPiece(b.s, rook)!.atk = 40;
  return { b, rook };
};
const play = (b: SliceBattle, id: CommandId, actor: number, to: { x: number; y: number }) => {
  b.hand = [id];
  const r = playCard(b, 0, actor, to);
  if (typeof r === 'string') throw new Error(`${id}: ${r}`);
  return r.events;
};
const dealt = (events: BattleEvent[]) => events.flatMap((e) => (e.type === 'attack' ? e.hits : [])).reduce((a, h) => a + h.damage, 0);

describe('공정 열기 (D-454)', () => {
  it('계단: 1턴 25% → 2턴 50% → 3턴 75% → 4턴부터 100%', () => {
    const keep = SLICE.heat;
    SLICE.heat = [...HEAT_DEFAULT];
    expect([1, 2, 3, 4, 9].map(heatAt)).toEqual([0.25, 0.5, 0.75, 1, 1]);
    const b = newSliceBattle([{ t: 'K' }, { t: 'P' }], ['K', 'P'], [], 7);
    expect(b.s.heat).toBe(0.25);
    SLICE.heat = keep;
  });
  it('배치 턴에도 치기는 된다 — 피해만 ×0.25, 미리보기와 실행이 같다', () => {
    const full = setup(1);
    const fullDmg = dealt(play(full.b, 'rookLine', full.rook, { x: 0, y: 2 }));
    expect(fullDmg).toBeGreaterThan(0);
    const cold = setup(0.25);
    cold.b.hand = ['rookLine'];
    const sim = previewPlay(cold.b, 0, cold.rook, { x: 0, y: 2 })!;
    const r = playCard(cold.b, 0, cold.rook, { x: 0, y: 2 });
    if (typeof r === 'string') throw new Error(r);
    expect(cold.b.s).toEqual(sim.state);
    expect(dealt(r.events)).toBe(Math.max(1, Math.round(fullDmg * 0.25)));
  });
  it('연쇄 = 이번 턴 적중: 처음 친 적 +1, 같은 적을 다시 치면 +2', () => {
    const { b, rook } = setup(1);
    play(b, 'rookLine', rook, { x: 0, y: 2 });
    expect(b.kills).toBe(1);
    play(b, 'rookLine', rook, { x: 0, y: 1 });
    expect(b.kills).toBe(1 + SLICE.chainRepeatHit);
  });
});
