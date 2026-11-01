import { describe, expect, it } from 'vitest';
import { canPlay, cardMoves, cardPieces, chainMult, costOf, endTurn, newSliceBattle, playCard, previewPlay, rewind, type SliceBattle } from '../src/slice/battle';
import { SLICE, START_COMMANDS, type CommandId } from '../src/slice/cards';
import type { SlicePartId } from '../src/slice/parts';

const squad = [{ t: 'K' as const }, { t: 'P' as const }, { t: 'P' as const }, { t: 'N' as const }, { t: 'B' as const }];
const mk = (parts: SlicePartId[] = [], hand?: CommandId[]): SliceBattle => {
  const b = newSliceBattle(squad, ['K', 'P', 'P', 'N'], START_COMMANDS, 11, { parts });
  if (hand) b.hand = [...hand];
  return b;
};
/** 처치가 나는 수 하나 (적 HP를 1로 낮춰서 찾는다) */
const killMove = (b: SliceBattle, i: number) => {
  for (const p of b.s.pieces) if (p.side === 1 && p.type !== 'K') p.hp = 1;
  for (const p of cardPieces(b, i)) for (const to of cardMoves(b, i, p.id)) {
    const sim = previewPlay(b, i, p.id, to);
    if (sim && sim.removed.some((q) => q.side === 1) && sim.state.winner === null) return { p, to };
  }
  return null;
};

describe('빌드 축 · 부품 (D-144)', () => {
  it('여분 태엽: 태엽 +1 · 손패 −1', () => {
    const b = mk(['spare']);
    expect(b.ap).toBe(SLICE.ap + 1);
    expect(b.hand).toHaveLength(SLICE.hand - 1);
  });
  it('이중 테이프: 되감기 두 번', () => {
    const b = mk(['tape']);
    const r1 = rewind(b);
    expect(typeof r1).toBe('object');
    const r2 = rewind(r1 as SliceBattle);
    expect(typeof r2).toBe('object');
    expect(typeof rewind(r2 as SliceBattle)).toBe('string');
  });
  it('증폭 코일: 처치마다 +50%, 상한 없음', () => {
    expect(chainMult(6, ['coil'])).toBeCloseTo(4);
    expect(chainMult(6)).toBeCloseTo(1 + SLICE.chainCap * SLICE.chainPerKill);
  });
  it('행진 북: 폰 카드 태엽 −1', () => {
    const b = mk(['drum'], ['advance', 'march', 'leap']);
    expect(costOf(b, 0)).toBe(0);
    expect(costOf(b, 1)).toBe(0);
    expect(costOf(b, 2)).toBe(1);
  });
  it('편자: 나이트가 처치하면 태엽 +1 · 재도약은 처치한 나이트면 0', () => {
    const b = mk(['horseshoe'], ['leap', 'rebound', 'rebound']);
    const m = killMove(b, 0);
    expect(m).not.toBeNull();
    const ap0 = b.ap;
    const r = playCard(b, 0, m!.p.id, m!.to);
    expect(typeof r).toBe('object');
    expect(b.ap).toBe(ap0 - 1 + 1);
    expect(costOf(b, 0, m!.p.id)).toBe(0);
  });
  it('자석 손: 처치하면 카드 한 장', () => {
    const b = mk(['magnet'], ['leap', 'advance', 'advance']);
    const m = killMove(b, 0);
    expect(m).not.toBeNull();
    playCard(b, 0, m!.p.id, m!.to);
    expect(b.hand).toHaveLength(3); // 3 − 1 + 1
  });
  it('행진: 폰 모두 한 칸 앞으로', () => {
    const b = mk([], ['march']);
    const pawns = b.s.pieces.filter((p) => p.side === 0 && p.type === 'P').map((p) => ({ id: p.id, y: p.y }));
    expect(canPlay(b, 0)).toBe(true);
    playCard(b, 0);
    for (const q of pawns) expect(b.s.pieces.find((p) => p.id === q.id)!.y).toBe(q.y + 1);
  });
  it('징집: 킹 옆에 폰 · 조립 라인: 폰이 둘 이하면 턴 시작에 하나', () => {
    const b = mk(['assembly'], ['draft']);
    const n0 = b.s.pieces.filter((p) => p.side === 0).length;
    playCard(b, 0);
    expect(b.s.pieces.filter((p) => p.side === 0).length).toBe(n0 + 1);
    // 폰을 다 치우면 다음 턴 시작에 하나 나온다
    b.s.pieces = b.s.pieces.filter((p) => !(p.side === 0 && p.type === 'P'));
    b.intents = [];
    endTurn(b, true);
    expect(b.s.pieces.filter((p) => p.side === 0 && p.type === 'P')).toHaveLength(1);
  });
  it('불씨: 처치 없이 연쇄 +1', () => {
    const b = mk([], ['spark', 'advance']);
    playCard(b, 0);
    expect(b.kills).toBe(1);
    expect(b.ap).toBe(SLICE.ap);
  });
  it('무거운 왕관 · 분노한 왕: 킹 공격이 세진다', () => {
    const plain = mk([], ['kingStep']);
    const crown = mk(['crown'], ['kingStep']);
    const k = plain.s.pieces.find((p) => p.side === 0 && p.type === 'K')!;
    const tos = cardMoves(plain, 0, k.id);
    expect(tos.length).toBeGreaterThan(0);
    // 같은 칸에 적 폰을 붙여 두고 피해를 비교한다
    for (const b of [plain, crown]) {
      const e = b.s.pieces.find((p) => p.side === 1 && p.type === 'P')!;
      const to = tos[0];
      e.x = to.x;
      e.y = to.y + 1;
      e.hp = e.maxHp = 999;
    }
    const dmg = (b: SliceBattle) => previewPlay(b, 0, k.id, tos[0])!.events.flatMap((e) => (e.type === 'attack' ? e.hits : [])).reduce((a, h) => a + h.damage, 0);
    expect(dmg(crown)).toBeGreaterThan(dmg(plain) * 1.8);
  });
});
