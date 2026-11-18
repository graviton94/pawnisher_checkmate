import { describe, expect, it } from 'vitest';
import { findPiece } from '../src/engine';
import type { PieceType } from '../src/engine/types';
import { newSliceBattle, type SliceBattle } from '../src/slice/battle';
import { autoPick, bestMoveValue } from '../src/slice/autopick';
import type { CommandId } from '../src/slice/cards';

/**
 * 카드 자동 고르기 (피드백 #11 D-503 → D-591): 카드 없이 기물을 누르면
 * 전용 · 싼 태엽 · 값 · 기본 카드 · 마지막에 낸 카드 · 손패 순으로 잡는다.
 * 나이트 (2,2)는 (4,3)에 내려앉아 구석 (5,5)의 적 킹을 친다. 룩은 공격력을 키워(값이 커야 예전 점수가 공용을 골랐다) 같은 판에 둔다.
 */
const setup = (hand: CommandId[], ap = 3, t: PieceType = 'N'): { b: SliceBattle; me: number } => {
  const b = newSliceBattle([{ t: 'K' }, { t }], ['K', 'P'], [], 11, { width: 6, height: 6 });
  const [king, me] = b.squadIds;
  const foes = b.s.pieces.filter((p) => p.side === 1).sort((a, z) => Number(z.type === 'K') - Number(a.type === 'K'));
  Object.assign(findPiece(b.s, king)!, { x: 0, y: 0 });
  Object.assign(findPiece(b.s, me)!, t === 'R' ? { x: 3, y: 0, atk: 40 } : { x: 2, y: 2 });
  // 적 킹은 닿지 않는 구석, 적 폰은 칠 수 있는 칸
  Object.assign(foes[0], { x: 5, y: 5 });
  Object.assign(foes[1], { x: 3, y: 4, hp: 300, maxHp: 300, shield: 0, def: 0 });
  b.intents = []; b.graze = []; b.grazeDanger = []; b.aimed = []; b.shocked = [];
  b.hand = hand;
  b.ap = ap;
  return { b, me };
};
const picked = (b: SliceBattle, me: number, last?: CommandId): CommandId | null => {
  const p = autoPick(b, me, last);
  return p ? b.hand[p.i] : null;
};

describe('카드 자동 고르기 — 전용 · 싼 태엽 먼저 (D-591)', () => {
  it('버그 재현: 룩은 피해가 커서 비싼 공용(과부하 3태엽)이 전용(직진 2태엽)을 넘었다 — 이제 전용', () => {
    const { b, me } = setup(['overload', 'rookLine'], 3, 'R');
    // 과부하 쪽 값이 훨씬 크다 — 예전 점수(값 ÷ 태엽 + 8)로는 과부하가 이겼다
    expect(bestMoveValue(b, 0, me) / 3).toBeGreaterThan(bestMoveValue(b, 1, me) / 2 + 8);
    expect(picked(b, me)).toBe('rookLine');
  });

  it('같은 2태엽이라도 공용 분쇄 ×1.5보다 룩 전용 직진', () => {
    const { b, me } = setup(['smash', 'rookLine'], 3, 'R');
    expect(picked(b, me)).toBe('rookLine');
  });

  it('비싼 공용(지휘 2태엽)보다 싼 나이트 전용(도약 1태엽) — 공용이 손패 앞에 있어도', () => {
    const { b, me } = setup(['order', 'leap']);
    const pick = autoPick(b, me)!;
    expect(b.hand[pick.i]).toBe('leap');
    expect(pick.own).toBe(true);
    expect(pick.ownBlocked).toBe(false);
  });

  it('전용끼리는 싼 쪽 (칼날 세례 2 < 도약 1) · 녹슨 카드(+1태엽)보다 원본', () => {
    expect(((s) => picked(s.b, s.me))(setup(['bladeRain', 'leap']))).toBe('leap');
    expect(((s) => picked(s.b, s.me))(setup(['leap~', 'leap']))).toBe('leap');
  });

  it('처치 턴 0태엽(피의 질주)은 싸니 먼저 — 처치 전에는 같은 1태엽이라 효과 카드를 아끼고 기본 도약', () => {
    const a = setup(['leap', 'rebound']);
    expect(picked(a.b, a.me)).toBe('leap');
    a.b.killers = [a.me];
    expect(picked(a.b, a.me)).toBe('rebound');
  });

  it('같은 태엽 · 전용이면 더 세게 치는 카드 (기습 ×1.5 > 도약)', () => {
    const { b, me } = setup(['leap', 'knightRaid']);
    expect(bestMoveValue(b, 1, me)).toBeGreaterThan(bestMoveValue(b, 0, me));
    expect(picked(b, me)).toBe('knightRaid');
  });

  it('조건(IF)이 안 맞으면 값이 같다 — 나이트 포크 · 말발굽 족쇄(묶기)는 아끼고 기본 도약', () => {
    const { b, me } = setup(['knightFork', 'hobble', 'leap']);
    expect(bestMoveValue(b, 0, me)).toBe(bestMoveValue(b, 2, me));
    expect(picked(b, me)).toBe('leap');
  });

  it('모든 게 같으면 이 기물로 마지막에 낸 카드, 없으면 손패 앞쪽', () => {
    const { b, me } = setup(['hoofKick', 'doubleLeap']);
    expect(picked(b, me)).toBe('hoofKick');
    expect(picked(b, me, 'doubleLeap')).toBe('doubleLeap');
    // 마지막 카드도 싼 태엽 · 전용보다 앞서지 않는다
    expect(picked(setup(['order', 'leap']).b, setup(['order', 'leap']).me, 'order')).toBe('leap');
  });

  it('태엽이 모자란 카드는 절대 잡지 않는다', () => {
    const { b, me } = setup(['overload'], 2);
    expect(autoPick(b, me)).toBeNull();
  });

  it('전용 카드를 쥐었지만 태엽이 모자라면 공용으로 넘어가며 그렇다고 알린다', () => {
    const { b, me } = setup(['bladeRain', 'stepAside'], 1);
    const pick = autoPick(b, me)!;
    expect(b.hand[pick.i]).toBe('stepAside');
    expect(pick.ownBlocked).toBe(true);
  });

  it('전용 카드가 없으면 공용 중 싼 쪽 (비켜서기 1 < 지휘 2) — 공용만 쥐었으니 알리지 않는다', () => {
    const { b, me } = setup(['order', 'stepAside']);
    const pick = autoPick(b, me)!;
    expect(b.hand[pick.i]).toBe('stepAside');
    expect(pick.ownBlocked).toBe(false);
  });

  it('같은 태엽 공용끼리는 값 (지휘 ×1 < 분쇄 ×1.5)', () => {
    const { b, me } = setup(['order', 'smash']);
    expect(picked(b, me)).toBe('smash');
  });

  it('잡을 카드가 없으면 null (손패에 이동 카드 없음)', () => {
    const { b, me } = setup(['plate']);
    expect(autoPick(b, me)).toBeNull();
  });
});
