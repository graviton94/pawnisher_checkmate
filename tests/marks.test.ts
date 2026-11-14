import { describe, expect, it } from 'vitest';
import { endTurn, newSliceBattle, type SliceBattle } from '../src/slice/battle';
import { battleFor } from '../src/slice/run';
import { Rng } from '../src/engine/rng';
import { MARK } from '../src/slice/cards';

/** 적 편성의 행동 특성 (D-483, GDD 21장 §2) — 내 차례가 시작될 때 판 위에서 일어나고, 예고는 그 뒤에 짠다 */
const squad = [{ t: 'K' }, { t: 'R' }, { t: 'N' }] as never;
const deck = ['advance', 'leap', 'kingStep', 'order', 'advance', 'leap'] as never;
const foes = (b: SliceBattle) => b.s.pieces.filter((p) => p.side === 1);

describe('적 편성 특성 (D-483)', () => {
  it('수리공: 내 차례가 오면 가장 다친 적 하나가 고친다', () => {
    const b = newSliceBattle(squad, ['K', 'P', 'N'], deck, 5, { marks: ['mend'] });
    const n = foes(b).find((p) => p.type === 'N')!;
    n.hp = 5;
    const r = endTurn(b, true);
    expect(r).not.toBe('warn');
    const after = b.s.pieces.find((p) => p.id === n.id);
    if (after) expect(after.hp).toBeGreaterThan(5);
    if (r !== 'warn') expect(r.events.some((e) => e.type === 'heal' && e.pieceId === n.id)).toBe(true);
  });
  it('복수의 맹세: 쓰러진 적마다 남은 적 공격이 오르고, 상한에서 멈춘다', () => {
    const b = newSliceBattle(squad, ['K', 'P', 'P', 'P', 'P', 'N'], deck, 7, { marks: ['vengeance'] });
    const n = foes(b).find((p) => p.type === 'N')!;
    const atk0 = n.atk;
    b.s.pieces = b.s.pieces.filter((p) => !(p.side === 1 && p.type === 'P'));
    endTurn(b, true);
    const after = b.s.pieces.find((p) => p.id === n.id);
    if (after) expect(after.atk).toBe(Math.round(atk0 * (1 + MARK.vengeance) ** MARK.vengeanceCap));
    expect(b.vengeance).toBe(MARK.vengeanceCap);
  });
  it('방진: 가로세로로 맞붙은 적만 방열판을 두른다', () => {
    const b = newSliceBattle(squad, ['K', 'P', 'P'], deck, 9, {
      marks: ['phalanx'],
      place: [{ side: 1, t: 'P', x: 2, y: 5 }, { side: 1, t: 'K', x: 3, y: 5 }],
    });
    const [p1, p2] = foes(b).filter((p) => p.type === 'P');
    // 둘째 폰은 첫째 폰 · 킹과 떨어져 있으면 방열판이 없다
    const lone = [p1, p2].find((p) => !foes(b).some((q) => q !== p && Math.abs(q.x - p.x) + Math.abs(q.y - p.y) === 1));
    const pair = foes(b).find((p) => p.x === 2 && p.y === 5)!;
    expect(pair.shield).toBeGreaterThanOrEqual(Math.round(pair.maxHp * MARK.phalanx));
    if (lone) expect(lone.shield).toBe(0);
  });
  it('증원 대기열: 정한 턴마다 적 킹 곁에 폰, 상한까지', () => {
    const b = newSliceBattle(squad, ['K', 'R'], deck, 11, { marks: ['reinforce'] });
    const count = () => foes(b).filter((p) => p.type === 'P').length;
    const c0 = count();
    for (let t = 0; t < MARK.reinforceEvery * (MARK.reinforceMax + 1) && b.s.winner === null; t++) endTurn(b, true);
    if (b.s.winner === null) {
      expect(b.reinforced).toBe(MARK.reinforceMax);
      expect(count()).toBeLessThanOrEqual(c0 + MARK.reinforceMax);
    }
  });
  it('일반 대국 편성 · 검문에 특성이 붙고, 반장에는 없다 — 안내에 들어간다', () => {
    const check = battleFor(2, 'check', new Rng(1), 0);
    expect(check.marks?.length).toBe(1);
    expect(check.tell).toContain('—');
    expect(battleFor(2, 'boss', new Rng(1), 0).marks).toBeUndefined();
    // 넷째 왕관부터 하나 더, 겹치지 않는다
    const hi = battleFor(2, 'check', new Rng(1), 3);
    expect(hi.marks?.length).toBe(2);
    expect(new Set(hi.marks).size).toBe(2);
    // 2 · 3막 일반 대국은 모든 편성에 특성
    for (let s = 0; s < 20; s++) expect(battleFor(3, 'battle', new Rng(s), 0).marks?.length).toBe(1);
  });
});
