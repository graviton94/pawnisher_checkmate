import { describe, expect, it } from 'vitest';
import { newSliceBattle, growCrew, type Squad } from '../src/slice/battle';
import { PART_NUM } from '../src/slice/parts';
import { START_DECK } from '../src/slice/cards';

/** 기록 유물 (D-363): 누적 피해 · 처치 · 죽음 넘김이 대국 시작 때 힘이 된다 */
describe('기록 유물', () => {
  const vet: Squad = { t: 'N', kills: 9, dmg: 300, defied: 2, battles: 5 };
  const atkOf = (parts: string[], u: Squad = vet) => {
    const b = newSliceBattle([{ t: 'K' }, u], ['K', 'P'], START_DECK, 3, { parts: parts as never });
    const p = b.s.pieces.find((q) => q.id === b.squadIds[1])!;
    return { atk: p.atk, max: p.maxHp };
  };
  it('피의 장부 · 표식 · 훈장', () => {
    const base = atkOf([]);
    expect(atkOf(['ledger']).atk).toBe(base.atk + Math.floor(300 / PART_NUM.ledgerPer));
    expect(atkOf(['deathMark']).atk).toBe(base.atk + PART_NUM.deathMarkAdd * 2);
    const v = atkOf(['veteran']);
    expect(v.atk).toBe(base.atk + PART_NUM.veteranAtk);
    expect(v.max).toBe(Math.round(base.max * PART_NUM.veteranHp));
    expect(atkOf(['veteran'], { ...vet, kills: 3 }).atk).toBe(base.atk);
  });
  it('대국 뒤 누적 피해 · 죽음 넘김이 쌓인다', () => {
    const b = newSliceBattle([{ t: 'K' }, { t: 'N' }], ['K', 'P'], START_DECK, 3);
    const id = b.squadIds[1];
    b.pd = { [id]: 42 };
    b.doorUsed.push(id, id);
    const c = growCrew(b, { t: 'N', dmg: 10, defied: 1 }, id, 20);
    expect(c.dmg).toBe(52);
    expect(c.defied).toBe(3);
  });
});
