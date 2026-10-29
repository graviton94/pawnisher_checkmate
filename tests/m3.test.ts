import { describe, expect, it } from 'vitest';
import {
  availableAp,
  chebyshev,
  damageOf,
  findPiece,
  inBounds,
  legalMoves,
  resolveTurn,
  strongholdSpot,
  toSquare,
  type BattleState,
} from '../src/engine';
import { board, sq } from './helpers';

/** 두 진영 모두 패스하며 n번 턴을 넘긴다 */
const passTurns = (s: BattleState, n: number) => {
  const events = [];
  for (let i = 0; i < n; i++) {
    const r = resolveTurn(s, []);
    s = r.state;
    events.push(...r.events);
  }
  return { s, events };
};

describe('요충지 (GDD 5장)', () => {
  it('지정 라운드의 플레이어 턴 직전에 생성된다', () => {
    const s0 = board([['K', 0, 'e1'], ['P', 0, 'd2'], ['K', 1, 'e8'], ['Q', 1, 'd8']]);
    s0.rules = { strongholdRounds: [3], collapseStart: null, collapseInterval: 3 };
    // 턴 1(P),2(E),3(P),4(E) 패스 → 턴 5 = 라운드 3 플레이어 차례
    const { s, events } = passTurns(s0, 4);
    expect(s.turnSide).toBe(0);
    expect(events.some((e) => e.type === 'strongholdSpawn')).toBe(true);
    expect(s.stronghold).not.toBeNull();
  });

  it('열세 진영 쪽(그 진영 기물에 더 가까운 칸)에 생긴다', () => {
    // 플레이어는 킹뿐, 적은 퀸까지 있으니 플레이어가 열세
    const s = board([['K', 0, 'e1'], ['K', 1, 'e8'], ['Q', 1, 'd8']]);
    const pos = strongholdSpot(s)!;
    const toMine = chebyshev(pos, sq('e1'));
    const toTheirs = Math.min(chebyshev(pos, sq('e8')), chebyshev(pos, sq('d8')));
    expect(toMine).toBeLessThan(toTheirs);
  });

  it('엄폐: 요충지 위 기물은 받는 피해가 줄어든다 (조금 열세 30%)', () => {
    const s = board([['R', 0, 'a1'], ['N', 1, 'a5'], ['K', 0, 'h1'], ['K', 1, 'h8']]);
    const rook = findPiece(s, 1)!;
    const knight = findPiece(s, 2)!;
    const plain = damageOf(s, rook, knight);
    s.stronghold = { x: 0, y: 4, holderId: 2, hold: 0 };
    expect(damageOf(s, rook, knight)).toBe(Math.floor(plain * 0.7));
  });

  it('2턴 유지하면 점령되고, 그 턴에 보상이 적용된다 (Tier 1: AP +1, 점령 기물 회복)', () => {
    let s = board([['N', 0, 'b1', { hp: 20 }], ['K', 0, 'h1'], ['K', 1, 'h8'], ['Q', 1, 'a8']]);
    s.stronghold = { x: 2, y: 2, holderId: null, hold: 0 }; // c3
    s = resolveTurn(s, [{ pieceId: 1, to: sq('c3') }]).state; // 착지 → 보유자
    expect(s.stronghold!.holderId).toBe(1);
    s = resolveTurn(s, []).state; // 적 패스 → 내 턴 시작: 유지 1
    expect(s.stronghold!.hold).toBe(1);
    s = resolveTurn(s, []).state; // 내 패스
    const r = resolveTurn(s, []); // 적 패스 → 내 턴 시작: 유지 2 → 점령
    const cap = r.events.find((e) => e.type === 'strongholdCapture');
    expect(cap).toBeDefined();
    expect(r.state.stronghold).toBeNull();
    // 열세(적 퀸 보유)이므로 Tier가 1보다 클 수 있다 — 단계와 무관하게 이번 턴 AP가 늘어난다
    expect(availableAp(r.state)).toBeGreaterThan(5);
  });

  it('보유 기물이 떠나면 유지 카운트가 초기화된다', () => {
    let s = board([['K', 0, 'e1'], ['K', 1, 'e8']]);
    s.stronghold = { x: 4, y: 1, holderId: null, hold: 0 }; // e2
    s = resolveTurn(s, [{ pieceId: 1, to: sq('e2') }]).state;
    s = resolveTurn(s, []).state;
    expect(s.stronghold!.hold).toBe(1);
    s = resolveTurn(s, [{ pieceId: 1, to: sq('e3') }]).state;
    expect(s.stronghold!.holderId).toBeNull();
    expect(s.stronghold!.hold).toBe(0);
  });

  it('Tier 3 (킹 HP 30% 이하): 킹 보호막 +30, AP +2', () => {
    let s = board([['N', 0, 'b1'], ['K', 0, 'h1', { hp: 20 }], ['K', 1, 'h8']]);
    s.stronghold = { x: 2, y: 2, holderId: null, hold: 0 };
    s = resolveTurn(s, [{ pieceId: 1, to: sq('c3') }]).state;
    // 크게 열세(T3)는 상대 턴 1번만 버티면 점령: 나(착지) → 상대 → 나(시작 시 점령)
    const r = resolveTurn(s, []);
    expect(r.events.some((e) => e.type === 'strongholdCapture')).toBe(true);
    expect(findPiece(r.state, 2)!.shield).toBe(30);
    expect(availableAp(r.state)).toBe(7);
  });

  it('우세·동률이면 상대 턴 3번을 버텨야 점령한다', () => {
    // 플레이어 N+K vs 적 K → 플레이어 우세
    let s = board([['N', 0, 'b1'], ['K', 0, 'h1'], ['K', 1, 'h8']]);
    s.stronghold = { x: 2, y: 2, holderId: null, hold: 0 };
    s = resolveTurn(s, [{ pieceId: 1, to: sq('c3') }]).state;
    s = passTurns(s, 4).s; // 상대 턴 2번 경과
    expect(s.stronghold).not.toBeNull();
    expect(s.stronghold!.hold).toBe(2);
    const r = passTurns(s, 2); // 상대 턴 3번째 → 점령
    expect(r.events.some((e) => e.type === 'strongholdCapture')).toBe(true);
  });

  it('엄폐는 보유 진영의 형편에 따라 다르다 (우세 20% · 크게 열세 50%)', () => {
    const s = board([['R', 0, 'a1'], ['N', 1, 'a5'], ['K', 0, 'h1'], ['K', 1, 'h8']]);
    const rook = findPiece(s, 1)!;
    const knight = findPiece(s, 2)!;
    s.stronghold = { x: 0, y: 4, holderId: 2, hold: 0 };
    const plain = 22 - 3;
    // 적(나이트 쪽)은 열세: 플레이어 R(40)+K(100) vs 적 N(25)+K(100) → 열세율 약 11% → T1 30%
    expect(damageOf(s, rook, knight)).toBe(Math.floor(plain * 0.7));
    findPiece(s, 4)!.hp = 20; // 적 킹 HP 20% → T3 50%
    expect(damageOf(s, rook, knight)).toBe(Math.floor(plain * 0.5));
  });

  it('Tier 2 버프는 자기 턴 2번이 지나면 끝난다', () => {
    // 플레이어 열세 15~35%: 플레이어 N+K vs 적 N+R+K
    // 플레이어 S = 25 + 100 = 125, 적 S = 25 + 40 + 100 = 165 → 열세율 약 24%
    let s = board([['N', 0, 'b1'], ['K', 0, 'h1'], ['K', 1, 'h8'], ['N', 1, 'a8'], ['R', 1, 'd8']]);
    s.stronghold = { x: 2, y: 2, holderId: null, hold: 0 };
    s = resolveTurn(s, [{ pieceId: 1, to: sq('c3') }]).state;
    const r = passTurns(s, 3);
    const cap = r.events.find((e) => e.type === 'strongholdCapture') as { tier: number } | undefined;
    expect(cap?.tier).toBe(2);
    const k = findPiece(r.s, 2)!;
    expect(k.buffAtkPct).toBeCloseTo(0.2);
    const after = passTurns(r.s, 4).s; // 내 턴 2번 경과
    expect(findPiece(after, 2)!.buffAtkPct).toBe(0);
  });
});

describe('붕괴하는 대성당 (D-014)', () => {
  it('지정 라운드에 테두리가 무너지고, 그 위 기물은 피해를 입고 안쪽으로 밀린다', () => {
    let s = board([['K', 0, 'a1'], ['P', 0, 'c3'], ['K', 1, 'f6']], 6, 6);
    s.rules = { strongholdRounds: [], collapseStart: 2, collapseInterval: 3 };
    const r = passTurns(s, 2); // 턴 3 = 라운드 2 플레이어 차례
    s = r.s;
    expect(s.ring).toBe(1);
    const col = r.events.find((e) => e.type === 'collapse');
    expect(col).toBeDefined();
    const king = findPiece(s, 1)!;
    expect(inBounds(s, king.x, king.y)).toBe(true);
    expect(king.hp).toBe(100 - 15);
    expect(inBounds(s, 0, 0)).toBe(false);
  });

  it('붕괴 피해로는 죽지 않는다', () => {
    let s = board([['K', 0, 'a1', { hp: 3 }], ['K', 1, 'f6']], 6, 6);
    s.rules = { strongholdRounds: [], collapseStart: 2, collapseInterval: 3 };
    s = passTurns(s, 2).s;
    expect(findPiece(s, 1)!.hp).toBe(1);
  });

  it('유효 보드가 4보다 작아지면 더 무너지지 않는다', () => {
    let s = board([['K', 0, 'c3'], ['K', 1, 'd4']], 6, 6);
    s.rules = { strongholdRounds: [], collapseStart: 1, collapseInterval: 1 };
    s = passTurns(s, 10).s;
    expect(s.ring).toBe(1);
  });
});

describe('최후의 일격 (D-015)', () => {
  it('마지막 일반 기물을 잃으면 킹이 각성하고, 퀸처럼 멀리 이동할 수 있다', () => {
    // 플레이어 폰이 적의 마지막 폰(HP 1)을 친다
    const s = board([['P', 0, 'd3', { moved: true }], ['K', 0, 'a1'], ['P', 1, 'e5', { hp: 1 }], ['K', 1, 'h8']]);
    const r = resolveTurn(s, [{ pieceId: 1, to: sq('d4') }]);
    expect(r.events.some((e) => e.type === 'awaken' && e.side === 1)).toBe(true);
    expect(r.state.lastStrike[1]).toBe('ready');
    const enemyKing = findPiece(r.state, 4)!;
    expect(legalMoves(r.state, enemyKing).map(toSquare)).toContain('a8');
  });

  it('일격은 ATK ×2로 한 번만 쓰고, 그 뒤 평범한 킹이 된다', () => {
    const s = board([['K', 0, 'a1'], ['Q', 0, 'b1'], ['K', 1, 'h8']], 8, 8, 1);
    s.lastStrike = ['none', 'ready'];
    // 적 킹이 h8 → b8? 대신 a-파일 근처로: h8 → b2는 대각선 h8-g7-…-b2
    const r = resolveTurn(s, [{ pieceId: 3, to: sq('b2') }]);
    expect(r.events.some((e) => e.type === 'lastStrike')).toBe(true);
    expect(r.state.lastStrike[1]).toBe('used');
    // 킹 ATK 15 × 2 = 30 − 내 킹 DEF 4 = 26
    expect(findPiece(r.state, 1)!.hp).toBe(100 - 26);
    const k = findPiece(r.state, 3)!;
    const after = { ...r.state, turnSide: 1 as const };
    expect(legalMoves(after, k).every((p) => chebyshev(p, k) === 1)).toBe(true);
  });
});
