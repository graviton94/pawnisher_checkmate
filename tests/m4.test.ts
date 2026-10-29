import { describe, expect, it } from 'vitest';
import type { CardId } from '../src/data/cards';
import type { EnchantId } from '../src/data/enchants';
import {
  attackTargets,
  availableAp,
  checkPlan,
  createBattle,
  findPiece,
  legalMoves,
  plannableMoves,
  resolveTurn,
  toSquare,
  type BattleState,
  type Plan,
  type Side,
} from '../src/engine';
import { checkDeck } from '../src/run/deck';
import { board, sq } from './helpers';
import { AI_TIERS, choosePlan } from '../src/ai/search';

/** 장비를 붙인다 */
const equip = (s: BattleState, side: Side, enchants: Partial<Record<EnchantId, number>> = {}, cards: CardId[] = []) => {
  s.loadouts[side] = { enchants, cards, forge: {} };
  s.cards[side] = cards.map((id) => ({ id, cooldown: 0, spent: false }));
  return s;
};

const hp = (s: BattleState, id: number) => findPiece(s, id)?.hp;

describe('덱 한도와 희생 규칙 (GDD 6장 §6.2)', () => {
  it('정통 체스 16기는 유효', () => {
    expect(checkDeck(['K', 'Q', 'R', 'R', 'B', 'B', 'N', 'N', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P']).ok).toBe(true);
  });
  it('나이트 3기 = 비숍 1 + 폰 1을 비워야 유효', () => {
    const full = ['K', 'Q', 'R', 'R', 'B', 'N', 'N', 'N', 'P', 'P', 'P', 'P', 'P', 'P', 'P'] as const;
    expect(checkDeck([...full]).ok).toBe(true);
    expect(checkDeck([...full, 'P']).ok).toBe(false); // 폰 8기면 세금을 못 냄
  });
  it('작은 덱에서는 한도 초과도 자유롭다', () => {
    expect(checkDeck(['K', 'N', 'N', 'N']).ok).toBe(true);
  });
  it('킹이 없거나 16기를 넘으면 무효', () => {
    expect(checkDeck(['Q']).ok).toBe(false);
    expect(checkDeck(['K', ...Array(16).fill('P')]).ok).toBe(false);
  });
});

describe('대장간 (GDD 6장 §6.5)', () => {
  it('유형 단위 강화가 모든 같은 유형 기물에 적용되고, +5면 보호막', () => {
    const s = createBattle({
      width: 8,
      height: 8,
      decks: [['K', 'P', 'P'], ['K']],
      loadouts: [{ enchants: {}, cards: [], forge: { P: 2, K: 5 } }, { enchants: {}, cards: [], forge: {} }],
    });
    const pawns = s.pieces.filter((p) => p.side === 0 && p.type === 'P');
    expect(pawns.every((p) => p.maxHp === 25 + 16 && p.atk === 10 + 6 && p.def === 2 + 2)).toBe(true);
    const king = s.pieces.find((p) => p.side === 0 && p.type === 'K')!;
    expect(king.maxHp).toBe(100 + 125);
    expect(king.shield).toBe(Math.round(225 * 0.2));
  });
});

describe('인챈트 (GDD 7장 §7.2)', () => {
  it('E02 비숍: 1장 아군 통과 / 2장 관통 / ★ 끝까지 관통', () => {
    const mk = (lv: number) =>
      equip(board([['B', 0, 'a1'], ['P', 0, 'b2'], ['P', 1, 'c3'], ['P', 1, 'd4'], ['P', 1, 'e5'], ['K', 0, 'h1'], ['K', 1, 'a8']]), 0, { E02: lv });
    const ids = (s: BattleState) => attackTargets(s, findPiece(s, 1)!).map((p) => p.id).sort();
    expect(ids(mk(0))).toEqual([]);
    expect(ids(mk(1))).toEqual([3]);
    expect(ids(mk(2))).toEqual([3, 4]);
    expect(ids(mk(3))).toEqual([3, 4, 5]);
  });

  it('E04 폰: 1장 정면 공격 / 2장 제자리 공격 / ★ 이동 AP 0', () => {
    const s = equip(board([['P', 0, 'd4', { moved: true }], ['P', 1, 'd5'], ['P', 1, 'e5'], ['K', 0, 'h1'], ['K', 1, 'h8']]), 0, { E04: 3 });
    expect(attackTargets(s, findPiece(s, 1)!).map((p) => p.id).sort()).toEqual([2, 3]);
    const r = resolveTurn(s, [{ kind: 'stand', pieceId: 1 }]);
    expect(hp(r.state, 2)).toBeLessThan(25);
    expect(checkPlan(s, [{ kind: 'stand', pieceId: 1 }]).apUsed).toBe(0);
  });

  it('E06 축전기: 1장 AP +1, ★ AP +2', () => {
    const s = equip(board([['K', 0, 'a1'], ['K', 1, 'h8']]), 0, { E06: 3 });
    expect(availableAp(s)).toBe(7);
  });

  it('E06 2장: 남은 AP 1을 다음 턴으로 이월', () => {
    let s = equip(board([['K', 0, 'a1'], ['K', 1, 'h8']]), 0, { E06: 2 });
    s = resolveTurn(s, []).state; // 패스 → 이월
    s = resolveTurn(s, []).state; // 적 패스 → 내 턴 시작
    expect(availableAp(s)).toBe(5 + 1 + 1);
  });

  it('E07 ★: 처치한 폰이 나이트로 승급', () => {
    const s = equip(board([['P', 0, 'd3', { moved: true }], ['P', 1, 'e5', { hp: 3 }], ['K', 0, 'h1'], ['K', 1, 'h8'], ['P', 1, 'a7']]), 0, { E07: 3 });
    const r = resolveTurn(s, [{ pieceId: 1, to: sq('d4') }]);
    expect(findPiece(r.state, 1)!.type).toBe('N');
  });

  it('E08 ★: 킹이 받을 피해를 붙어 있는 아군이 대신 받는다', () => {
    const s = equip(board([['R', 0, 'a1'], ['K', 1, 'e8'], ['R', 1, 'd8'], ['K', 0, 'h1']], 8, 8, 0), 1, { E08: 3 });
    const r = resolveTurn(s, [{ pieceId: 1, to: sq('e1') }]); // 룩이 e-파일로 킹을 친다
    expect(hp(r.state, 2)).toBe(100);
    expect(hp(r.state, 3)).toBeLessThan(70);
  });

  it('E10 ★: 사선 공격이 좌우 끝을 넘어 반대편으로', () => {
    const s = equip(board([['R', 0, 'b4'], ['P', 1, 'h4'], ['K', 0, 'a1'], ['K', 1, 'e8']]), 0, { E10: 3 });
    s.pieces.push({ ...findPiece(s, 1)!, id: 9, type: 'P', x: 3, y: 3, side: 0, hp: 25, maxHp: 25, atk: 10, def: 2 }); // d4 아군이 오른쪽을 막음
    expect(attackTargets(s, findPiece(s, 1)!).map((p) => p.id)).toContain(2);
  });

  it('E03 2장: 룩이 아군을 뛰어넘어 이동', () => {
    const s = equip(board([['R', 0, 'a1'], ['P', 0, 'a2'], ['K', 0, 'h1'], ['K', 1, 'h8']]), 0, { E03: 2 });
    expect(legalMoves(s, findPiece(s, 1)!).map(toSquare)).toContain('a5');
  });

  it('E11: 나이트+비숍 합체 → 두 행마를 모두 가진다', () => {
    const s = equip(board([['N', 0, 'b1'], ['B', 0, 'c1'], ['K', 0, 'h1'], ['K', 1, 'h8']]), 0, { E11: 1 });
    const r = resolveTurn(s, [{ kind: 'fuse', pieceId: 1, partnerId: 2 }]);
    const f = findPiece(r.state, 1)!;
    expect(f.fused?.sort()).toEqual(['B', 'N']);
    expect(f.maxHp).toBe(45 + 35);
    expect(findPiece(r.state, 2)).toBeUndefined();
    expect(checkPlan(s, [{ kind: 'fuse', pieceId: 1, partnerId: 2 }]).apUsed).toBe(2);
  });

  it('E11 없이 카드도 없으면 합체 불가', () => {
    const s = board([['N', 0, 'b1'], ['B', 0, 'c1'], ['K', 0, 'h1'], ['K', 1, 'h8']]);
    expect(checkPlan(s, [{ kind: 'fuse', pieceId: 1, partnerId: 2 }]).ok).toBe(false);
  });
});

describe('액티브 카드 (GDD 7장 §7.3)', () => {
  it('A01 기동 지시: 이동 AP −1, 라운드당 1회', () => {
    const s = equip(board([['R', 0, 'a1'], ['R', 0, 'h2'], ['K', 0, 'e1'], ['K', 1, 'e8']]), 0, {}, ['A01']);
    const plan: Plan = [{ pieceId: 1, to: sq('a4'), card: 0 }];
    expect(checkPlan(s, plan).apUsed).toBe(2);
    expect(checkPlan(s, [...plan, { pieceId: 2, to: sq('h4'), card: 0 }]).ok).toBe(false);
  });

  it('A02 캐슬링: 같은 행의 두 기물이 자리를 바꾸고 둘 다 공격', () => {
    const s = equip(board([['R', 0, 'a1'], ['K', 0, 'e1'], ['P', 1, 'd2'], ['K', 1, 'h8']]), 0, {}, ['A02']);
    const r = resolveTurn(s, [{ kind: 'castle', pieceId: 1, partnerId: 2, card: 0 }]);
    expect(toSquare(findPiece(r.state, 1)!)).toBe('e1');
    expect(toSquare(findPiece(r.state, 2)!)).toBe('a1');
    expect(r.state.cards[0][0].cooldown).toBe(3); // 쿨타임 3턴 (턴 종료 시 1 감소)
  });

  it('A04 충격파: 맞은 적을 1칸 밀어낸다', () => {
    const s = equip(board([['R', 0, 'a1'], ['N', 1, 'a5'], ['K', 0, 'h1'], ['K', 1, 'h8']]), 0, {}, ['A04']);
    const r = resolveTurn(s, [{ pieceId: 1, to: sq('a2'), card: 0 }]);
    expect(toSquare(findPiece(r.state, 2)!)).toBe('a6');
  });

  it('A06 바리케이드: 보호막 +25, 행동으로 치지 않는다', () => {
    const s = equip(board([['K', 0, 'e1'], ['K', 1, 'e8']]), 0, {}, ['A06']);
    const r = resolveTurn(s, [{ kind: 'shield', pieceId: 1, card: 0 }, { pieceId: 1, to: sq('e2') }]);
    expect(findPiece(r.state, 1)!.shield).toBe(25);
  });

  it('C01 2단 박차: 공격 2회, 쓰면 소멸', () => {
    const s = equip(board([['R', 0, 'a1'], ['R', 1, 'a6'], ['K', 0, 'h1'], ['K', 1, 'h8']]), 0, {}, ['C01']);
    const r = resolveTurn(s, [{ pieceId: 1, to: sq('a2'), card: 0 }]);
    expect(hp(r.state, 2)).toBe(70 - 2 * (22 - 5));
    expect(r.state.cards[0][0].spent).toBe(true);
  });

  it('C04 대관식: 폰이 퀸이 되어 그 자리에서 공격', () => {
    const s = equip(board([['P', 0, 'd2'], ['R', 1, 'd7'], ['K', 0, 'h1'], ['K', 1, 'h8']]), 0, {}, ['C04']);
    const r = resolveTurn(s, [{ kind: 'promote', pieceId: 1, card: 0 }]);
    expect(findPiece(r.state, 1)!.type).toBe('Q');
    expect(hp(r.state, 2)).toBe(70 - (28 - 5));
  });

  it('C06 처형자: HP 30% 이하 적 칸으로 들어가 즉시 처치', () => {
    const s = equip(board([['R', 0, 'a1'], ['N', 1, 'a5', { hp: 10 }], ['K', 0, 'h1'], ['K', 1, 'h8']]), 0, {}, ['C06']);
    expect(plannableMoves(s, [], 1, 0).map(toSquare)).toContain('a5');
    const r = resolveTurn(s, [{ pieceId: 1, to: sq('a5'), card: 0 }]);
    expect(findPiece(r.state, 2)).toBeUndefined();
    expect(toSquare(findPiece(r.state, 1)!)).toBe('a5');
  });

  it('C02 도약문: 자기 진영 절반의 빈칸으로만', () => {
    const s = equip(board([['K', 0, 'e1'], ['N', 0, 'b1'], ['K', 1, 'e8']]), 0, {}, ['C02']);
    expect(checkPlan(s, [{ kind: 'gate', pieceId: 2, to: sq('g4'), card: 0 }]).ok).toBe(true);
    expect(checkPlan(s, [{ kind: 'gate', pieceId: 2, to: sq('g5'), card: 0 }]).ok).toBe(false);
  });

  it('A05 폼 시프트: 이번 턴 나이트는 비숍처럼 움직인다', () => {
    const s = equip(board([['N', 0, 'b1'], ['B', 0, 'c1'], ['K', 0, 'h1'], ['K', 1, 'h8']]), 0, {}, ['A05']);
    const plan: Plan = [{ kind: 'formShift', pieceId: 1, partnerId: 2, card: 0 }];
    expect(plannableMoves(s, plan, 1).map(toSquare)).toContain('e4'); // b1 → e4 대각선
    const r = resolveTurn(s, plan);
    expect(findPiece(r.state, 1)!.formAs).toBeNull(); // 턴이 끝나면 원래대로
  });

  it('쿨타임 중이거나 소멸한 카드는 쓸 수 없다', () => {
    const s = equip(board([['K', 0, 'e1'], ['K', 1, 'e8']]), 0, {}, ['A06']);
    s.cards[0][0].cooldown = 2;
    expect(checkPlan(s, [{ kind: 'shield', pieceId: 1, card: 0 }]).ok).toBe(false);
  });
});

describe('AI의 카드 사용 (GDD 4장 §4-B)', () => {
  it('끝줄 근처 폰을 대관식(C04)으로 승급해 킹을 친다', () => {
    const s = equip(board([['P', 0, 'd6', { moved: true }], ['K', 0, 'a1'], ['K', 1, 'e8', { hp: 20 }]]), 0, {}, ['C04']);
    const plan = choosePlan(s, { tier: AI_TIERS[2] });
    expect(plan.some((st) => st.kind === 'promote')).toBe(true);
  });
  it('처형 가능한 적이 있으면 처형자의 진격(C06)을 쓴다', () => {
    const s = equip(board([['N', 0, 'a1'], ['Q', 1, 'b3', { hp: 19 }], ['K', 0, 'h1'], ['K', 1, 'h8']]), 0, {}, ['C06']);
    const plan = choosePlan(s, { tier: AI_TIERS[2] });
    const r = resolveTurn(s, plan);
    expect(r.state.pieces.some((p) => p.type === 'Q')).toBe(false);
  });
  it('cards: false면 카드를 쓰지 않는다', () => {
    const s = equip(board([['P', 0, 'd6', { moved: true }], ['K', 0, 'a1'], ['K', 1, 'e8', { hp: 20 }]]), 0, {}, ['C04']);
    const plan = choosePlan(s, { tier: AI_TIERS[2], cards: false });
    expect(plan.every((st) => st.kind === undefined || st.kind === 'move')).toBe(true);
  });
});
