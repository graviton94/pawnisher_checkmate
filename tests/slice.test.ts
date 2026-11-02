import { describe, expect, it } from 'vitest';
import { cardMoves, cardPieces, chainMult, dangerSquares, endTurn, liveIntents, newSliceBattle, planEnemy, playCard, rewind, squadAfter } from '../src/slice/battle';
import { START_COMMANDS, SLICE } from '../src/slice/cards';
import { findPiece } from '../src/engine';

const squad = [{ t: 'K' as const }, { t: 'P' as const }, { t: 'P' as const }, { t: 'N' as const }, { t: 'B' as const }];

describe('수직 조각: 분대 + 명령 덱 (D-142)', () => {
  it('손패 5 · 태엽 3 · 적은 예고를 갖고 시작한다', () => {
    const b = newSliceBattle(squad, ['K', 'P', 'P', 'N'], START_COMMANDS, 7);
    expect(b.hand).toHaveLength(SLICE.hand);
    expect(b.ap).toBe(SLICE.ap);
    expect(b.intents.length).toBeGreaterThan(0);
    expect(dangerSquares(b).length).toBeGreaterThan(0);
  });
  it('카드를 내면 태엽이 줄고, 기물이 움직여 친다', () => {
    const b = newSliceBattle(squad, ['K', 'P', 'P', 'N'], START_COMMANDS, 7);
    const i = b.hand.findIndex((_c, k) => cardPieces(b, k).length > 0);
    const p = cardPieces(b, i)[0];
    const to = cardMoves(b, i, p.id)[0];
    const r = playCard(b, i, p.id, to);
    expect(typeof r).toBe('object');
    expect(b.ap).toBeLessThan(SLICE.ap);
    expect(findPiece(b.s, p.id)).toMatchObject({ x: to.x, y: to.y });
  });
  it('연쇄 배수는 처치마다 오른다', () => {
    expect(chainMult(0)).toBe(1);
    expect(chainMult(2)).toBeCloseTo(1 + 2 * SLICE.chainPerKill);
  });
  it('턴을 끝내면 예고대로 두고 · 나사가 한 칸 사라지고 · 새 손패', () => {
    const b = newSliceBattle(squad, ['K', 'P', 'P', 'N'], START_COMMANDS, 7);
    const r = endTurn(b, true);
    expect(typeof r).toBe('object');
    expect(b.coins).toBe(SLICE.coins - 1);
    if (b.s.winner === null) expect(b.hand).toHaveLength(SLICE.hand);
  });
  it('예고한 적이 쓰러지면 그 예고는 사라진다', () => {
    const b = newSliceBattle(squad, ['K', 'P', 'P', 'N'], START_COMMANDS, 7);
    const it0 = b.intents[0];
    b.s.pieces = b.s.pieces.filter((p) => p.id !== it0.pieceId);
    expect(liveIntents(b).some((x) => x.pieceId === it0.pieceId)).toBe(false);
  });
  it('되감기는 대국마다 한 번 · 분대 HP는 이어진다', () => {
    const b = newSliceBattle(squad, ['K', 'P', 'P', 'N'], START_COMMANDS, 7);
    const back = rewind(b);
    expect(typeof back).toBe('object');
    if (typeof back === 'object') expect(typeof rewind(back)).toBe('string');
    const pawn = findPiece(b.s, b.squadIds[1])!;
    pawn.hp = 9;
    expect(squadAfter(b, squad)[1]).toMatchObject({ t: 'P', hp: 9, battles: 1 });
    const next = newSliceBattle(squadAfter(b, squad), ['K'], START_COMMANDS, 8);
    expect(findPiece(next.s, next.squadIds[1])!.hp).toBe(9);
  });
});

describe('판 사이 회복', () => {
  it('남은 분대는 30% 회복 · 정비는 쓰러진 기물 하나를 되살린다', async () => {
    const { restSquad, overhaulSquad } = await import('../src/slice/battle');
    const { PIECE_STATS } = await import('../src/data/pieces');
    const r = restSquad([{ t: 'N', hp: 10 }]);
    expect(r[0].hp).toBe(10 + Math.round(PIECE_STATS.N.hp * 0.3));
    const o = overhaulSquad([{ t: 'K', hp: 50 }], [{ t: 'P', name: '못난이' }, { t: 'N', name: '고철이' }]);
    expect(o.revived?.name).toBe('고철이');
    expect(o.squad).toHaveLength(2);
  });
});

describe('교착 압박 (D-196)', () => {
  it('적 킹이 혼자 남으면 내 킹에게 다가온다', () => {
    const b = newSliceBattle(squad, ['K'], START_COMMANDS, 7);
    const plan = planEnemy(b.s, false, 1);
    expect(plan.some((it) => b.s.pieces.find((p) => p.id === it.pieceId)?.type === 'K')).toBe(true);
  });
  it('다른 적이 있으면 킹은 뒤에 남는다 — 단 정해진 턴부터는 나선다', () => {
    const b = newSliceBattle(squad, ['K', 'P'], START_COMMANDS, 7);
    const kingMoves = (turn: number) => planEnemy(b.s, false, turn).some((it) => b.s.pieces.find((p) => p.id === it.pieceId)?.type === 'K');
    expect(kingMoves(1)).toBe(false);
    expect(kingMoves(SLICE.kingMarchTurn)).toBe(true);
  });
});
