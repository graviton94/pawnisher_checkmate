import { describe, expect, it } from 'vitest';
import { findPiece } from '../src/engine';
import { newSliceBattle, type SliceBattle } from '../src/slice/battle';
import { autoPick, bestMoveValue } from '../src/slice/autopick';
import type { CommandId } from '../src/slice/cards';

/** 피드백 #11 (D-503): 카드 없이 기물을 누르면 싸고 · 세고 · 전용인 카드를 먼저 잡는다 */
const setup = (hand: CommandId[], ap = 3): { b: SliceBattle; knight: number } => {
  const b = newSliceBattle([{ t: 'K' }, { t: 'N' }], ['K', 'P'], [], 11, { width: 6, height: 6 });
  const [king, knight] = b.squadIds;
  const foes = b.s.pieces.filter((p) => p.side === 1).sort((a, z) => Number(z.type === 'K') - Number(a.type === 'K'));
  Object.assign(findPiece(b.s, king)!, { x: 0, y: 0 });
  Object.assign(findPiece(b.s, knight)!, { x: 2, y: 2 });
  // 적 킹은 나이트가 닿지 않는 구석, 적 폰은 나이트가 내려앉을 수 있는 칸 (2,2 → 3,4)
  Object.assign(foes[0], { x: 5, y: 5 });
  Object.assign(foes[1], { x: 3, y: 4, hp: 300, maxHp: 300, shield: 0, def: 0 });
  b.intents = []; b.graze = []; b.grazeDanger = []; b.aimed = []; b.shocked = [];
  b.hand = hand;
  b.ap = ap;
  return { b, knight };
};

describe('카드 자동 고르기 (#11)', () => {
  it('비싼 공용(지휘 2태엽)보다 싼 나이트 전용(도약 1태엽)을 — 공용이 손패 앞에 있어도', () => {
    const { b, knight } = setup(['order', 'leap']);
    const pick = autoPick(b, knight)!;
    expect(b.hand[pick.i]).toBe('leap');
    expect(pick.own).toBe(true);
    expect(pick.ownBlocked).toBe(false);
  });

  it('피해가 더 큰 비싼 공용(분쇄 ×1.5 · 2태엽)도 태엽당 값으로는 싼 전용을 넘지 못한다', () => {
    const { b, knight } = setup(['smash', 'leap']);
    expect(bestMoveValue(b, 0, knight)).toBeGreaterThan(bestMoveValue(b, 1, knight));
    expect(b.hand[autoPick(b, knight)!.i]).toBe('leap');
  });

  it('같은 전용 카드끼리는 그 수의 값이 큰 쪽 — 같은 값이면 싼 쪽', () => {
    const { b, knight } = setup(['bladeRain', 'leap']);
    expect(b.hand[autoPick(b, knight)!.i]).toBe('leap');
  });

  it('전용 카드를 쥐었지만 태엽이 모자라면 공용으로 넘어가며 그렇다고 알린다', () => {
    const { b, knight } = setup(['bladeRain', 'stepAside'], 1);
    const pick = autoPick(b, knight)!;
    expect(b.hand[pick.i]).toBe('stepAside');
    expect(pick.ownBlocked).toBe(true);
  });

  it('전용 카드가 없으면 공용 중 태엽당 값이 큰 쪽 (지휘 ×1 < 분쇄 ×1.5, 같은 2태엽) — 공용만 쥐었으니 알리지 않는다', () => {
    const { b, knight } = setup(['order', 'smash']);
    const pick = autoPick(b, knight)!;
    expect(b.hand[pick.i]).toBe('smash');
    expect(pick.ownBlocked).toBe(false);
  });

  it('잡을 카드가 없으면 null (손패에 이동 카드 없음)', () => {
    const { b, knight } = setup(['plate']);
    expect(autoPick(b, knight)).toBeNull();
  });
});
