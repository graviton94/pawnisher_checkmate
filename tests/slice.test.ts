import { describe, expect, it } from 'vitest';
import { burnFallen, promotedIn, cardMoves, cardPieces, chainMult, dangerSquares, endTurn, liveIntents, newSliceBattle, planEnemy, playCard, rewind, squadAfter } from '../src/slice/battle';
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
  it('연쇄는 처치마다 다음 공격 피해를 더한다 (합, D-205)', async () => {
    const { chainAdd } = await import('../src/slice/battle');
    expect(chainMult(2)).toBe(1);
    expect(chainAdd(0)).toBe(0);
    expect(chainAdd(2)).toBe(2 * SLICE.chainAddPerKill);
  });
  it('피해 = (공격 + 합) × 곱 (D-205)', async () => {
    const { damageOf } = await import('../src/engine');
    const b = newSliceBattle(squad, ['K', 'P'], START_COMMANDS, 7);
    const me = b.s.pieces.find((p) => p.side === 0 && p.type === 'N')!;
    const foe = b.s.pieces.find((p) => p.side === 1 && p.type === 'P')!;
    const plain = damageOf(b.s, me, foe, 1, 0);
    const added = damageOf(b.s, me, foe, 1, 8);
    const both = damageOf(b.s, me, foe, 2, 8);
    expect(added - plain).toBe(8);
    expect(both).toBe(Math.floor((me.atk + 8) * 2) - foe.def);
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

describe('페르소나 테스트 버그 수정 (D-197)', () => {
  it('이번 턴에 낸 카드는 같은 턴에 다시 뽑히지 않는다 (점화 무한 반복 차단)', () => {
    const b = newSliceBattle([{ t: 'K' }, { t: 'P' }], ['K', 'P'], START_COMMANDS, 3);
    b.hand = ['spark', 'spark'];
    b.draw = [];
    b.discard = [];
    let plays = 0;
    while (b.hand.includes('spark') && plays < 20) {
      const r = playCard(b, b.hand.indexOf('spark'));
      expect(typeof r).not.toBe('string');
      plays++;
    }
    expect(plays).toBe(2);
    expect(b.played).toEqual(['spark', 'spark']);
    endTurn(b, true);
    expect(b.played).toEqual([]);
    expect([...b.hand, ...b.draw, ...b.discard].filter((c) => c === 'spark').length).toBe(2);
  });
  it('조사: 받침에 따라 을/를 · 이/가', async () => {
    const { josa } = await import('../src/data/josa');
    expect(josa('헐거운 나사', '을')).toBe('헐거운 나사를');
    expect(josa('총진격', '을')).toBe('총진격을');
    expect(josa('굽은 지렛대', '이')).toBe('굽은 지렛대가');
    expect(josa('왕의 철퇴', '은')).toBe('왕의 철퇴는');
  });
  it('분대에 없는 기물의 부품은 내놓지 않는다', async () => {
    const { partFits } = await import('../src/slice/parts');
    expect(partFits('horseshoe', ['K', 'P', 'B'], [])).toBe(false);
    expect(partFits('horseshoe', ['K', 'N'], [])).toBe(true);
    expect(partFits('banner', ['K', 'B'], ['barracks'])).toBe(true);
    expect(partFits('coil', ['K'], [])).toBe(true);
  });
});

describe('카드 태우기 · 승격은 대국에서만 (D-198)', () => {
  it('폰이 모두 쓰러지면 폰 카드만 이번 대국에서 탄다 — 지휘 · 다른 기물 카드는 남는다', () => {
    const b = newSliceBattle([{ t: 'K' }, { t: 'P' }, { t: 'B' }], ['K', 'P'], START_COMMANDS, 4);
    const pawnId = b.squadIds[1];
    b.s.pieces = b.s.pieces.filter((p) => p.id !== pawnId);
    b.falls.push({ pieceId: pawnId, by: '적 폰', turn: 1, t: 'P' });
    const all0 = [...b.hand, ...b.draw, ...b.discard];
    const out = burnFallen(b);
    const all1 = [...b.hand, ...b.draw, ...b.discard];
    expect(out[0]?.t).toBe('P');
    expect(all1.some((id) => id.startsWith('advance'))).toBe(false);
    expect(all1.length).toBe(all0.length - out[0].ids.length);
    expect(all1.some((id) => id.startsWith('order'))).toBe(all0.some((id) => id.startsWith('order')));
    // 두 번 태우지 않는다
    expect(burnFallen(b)).toEqual([]);
  });
  it('같은 유형이 아직 살아 있으면 태우지 않는다', () => {
    const b = newSliceBattle([{ t: 'K' }, { t: 'P' }, { t: 'P' }], ['K', 'P'], START_COMMANDS, 4);
    const pawnId = b.squadIds[1];
    b.s.pieces = b.s.pieces.filter((p) => p.id !== pawnId);
    b.falls.push({ pieceId: pawnId, by: '적 폰', turn: 1, t: 'P' });
    expect(burnFallen(b)).toEqual([]);
  });
  it('승격한 폰은 대국이 끝나면 폰으로 돌아온다', () => {
    const squad0 = [{ t: 'K' as const }, { t: 'P' as const, hp: 9 }];
    const b = newSliceBattle(squad0, ['K'], START_COMMANDS, 4);
    const p = b.s.pieces.find((x) => x.id === b.squadIds[1])!;
    p.type = 'Q';
    p.hp = 30;
    expect(promotedIn(b, squad0)).toBe(1);
    const after = squadAfter(b, squad0);
    expect(after[1].t).toBe('P');
    expect(after[1].hp).toBe(9);
  });
});
