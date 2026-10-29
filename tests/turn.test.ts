import { describe, expect, it } from 'vitest';
import { addToPlan, checkPlan, findPiece, plannableMoves, resolveTurn, toSquare, undoLast, type Plan } from '../src/engine';
import { board, sq } from './helpers';

describe('계획 단계 (GDD 1장 §1.4)', () => {
  it('기물 하나는 한 턴에 한 번만 이동한다', () => {
    const s = board([['K', 0, 'e1'], ['K', 1, 'e8']]);
    const plan = addToPlan(s, [], { pieceId: 1, to: sq('e2') })!;
    expect(addToPlan(s, plan, { pieceId: 1, to: sq('e3') })).toBeNull();
    expect(plannableMoves(s, plan, 1)).toEqual([]);
  });

  it('AP를 넘는 예약은 할 수 없다 (기본 5 AP)', () => {
    const s = board([['Q', 0, 'd1'], ['R', 0, 'a1'], ['K', 0, 'e1'], ['K', 1, 'e8']]);
    const plan = addToPlan(s, [], { pieceId: 1, to: sq('d4') })!; // 퀸 4 AP
    expect(addToPlan(s, plan, { pieceId: 2, to: sq('a4') })).toBeNull(); // 룩 3 AP → 7 > 5
    expect(addToPlan(s, plan, { pieceId: 3, to: sq('f2') })).not.toBeNull(); // 킹 1 AP → 5
  });

  it('가상 보드: 앞 순번이 비켜 준 길로 뒤 순번이 지나갈 수 있다', () => {
    const s = board([['P', 0, 'a2'], ['R', 0, 'a1'], ['K', 0, 'h1'], ['K', 1, 'h8']]);
    expect(plannableMoves(s, [], 2).map(toSquare)).not.toContain('a2');
    // 폰이 a4로 가면 룩은 a2·a3까지 열린다
    const plan = addToPlan(s, [], { pieceId: 1, to: sq('a4') })!;
    const rook = plannableMoves(s, plan, 2).map(toSquare);
    expect(rook).toContain('a2');
    expect(rook).toContain('a3');
    expect(rook).not.toContain('a4');
  });

  it('되돌리기는 마지막 예약만 지운다', () => {
    const plan: Plan = [{ pieceId: 1, to: sq('a3') }, { pieceId: 2, to: sq('b3') }];
    expect(undoLast(plan)).toEqual([plan[0]]);
  });

  it('패스(빈 계획)도 제출할 수 있다', () => {
    const s = board([['K', 0, 'e1'], ['K', 1, 'e8']]);
    const r = resolveTurn(s, []);
    expect(r.state.turnSide).toBe(1);
    expect(r.events).toEqual([]);
  });
});

describe('실행 단계 (GDD 1장 §1.5, 3장)', () => {
  it('이동한 기물만 공격한다', () => {
    // 비숍은 제자리, 킹만 이동. 비숍 사선 위의 적은 맞지 않는다.
    const s = board([['B', 0, 'c1'], ['K', 0, 'h1'], ['P', 1, 'e3'], ['K', 1, 'h8']]);
    const r = resolveTurn(s, [{ pieceId: 2, to: sq('g1') }]);
    expect(findPiece(r.state, 3)!.hp).toBe(25);
  });

  it('피해량 = max(1, ATK − DEF)', () => {
    // 폰(ATK 10)이 룩(DEF 5)을 치면 5, 퀸(ATK 28)이 룩을 치면 23
    const s = board([['P', 0, 'd3'], ['R', 1, 'e5'], ['K', 0, 'a1'], ['K', 1, 'h8']]);
    const r = resolveTurn(s, [{ pieceId: 1, to: sq('d4') }]);
    expect(findPiece(r.state, 2)!.hp).toBe(70 - 5);
  });

  it('최소 피해는 1', () => {
    const s = board([['P', 0, 'd3', { atk: 1 }], ['R', 1, 'e5'], ['K', 0, 'a1'], ['K', 1, 'h8']]);
    const r = resolveTurn(s, [{ pieceId: 1, to: sq('d4') }]);
    expect(findPiece(r.state, 2)!.hp).toBe(69);
  });

  it('보호막이 먼저 피해를 흡수한다', () => {
    const s = board([['P', 0, 'd3'], ['P', 1, 'e5', { shield: 5 }], ['K', 0, 'a1'], ['K', 1, 'h8']]);
    const r = resolveTurn(s, [{ pieceId: 1, to: sq('d4') }]);
    const t = findPiece(r.state, 2)!;
    expect(t.shield).toBe(0);
    expect(t.hp).toBe(25 - 3); // 피해 8 중 5 흡수
  });

  it('순차 관통: #1이 막던 적을 파괴하면 #2의 사선이 열려 그 뒤를 친다', () => {
    // 비숍 f1 → c4 대각선 c4-d5-e6-f7-g8. d5의 적 폰(HP 8)을 #1 폰이 먼저 파괴한다.
    const s = board([
      ['P', 0, 'e3', { moved: true }], // 1
      ['B', 0, 'f1'], // 2
      ['K', 0, 'e1'], // 3
      ['P', 1, 'd5', { hp: 8 }], // 4
      ['K', 1, 'g8'], // 5
    ]);
    const plan = [{ pieceId: 1, to: sq('e4') }, { pieceId: 2, to: sq('c4') }];
    const r = resolveTurn(s, plan);
    expect(findPiece(r.state, 4)).toBeUndefined();
    expect(findPiece(r.state, 5)!.hp).toBe(100 - (18 - 4));

    // 순서를 바꾸면 비숍은 d5 폰에 막혀 킹을 치지 못한다
    const r2 = resolveTurn(s, [plan[1], plan[0]]);
    expect(findPiece(r2.state, 5)!.hp).toBe(100);
  });

  it('길 터주기: 앞을 막던 아군이 비키면 같은 턴에 사선이 열린다', () => {
    const s = board([
      ['N', 0, 'a3'], // 1 — 룩의 위쪽 사선을 막고 있다
      ['R', 0, 'a1'], // 2
      ['K', 0, 'h1'], // 3
      ['R', 1, 'a7'], // 4
      ['K', 1, 'h8'], // 5
    ]);
    // 룩만 움직이면 a3 나이트에 막혀 a7을 치지 못한다
    const blocked = resolveTurn(s, [{ pieceId: 2, to: sq('a2') }]);
    expect(findPiece(blocked.state, 4)!.hp).toBe(70);
    // 나이트가 b5로 비키고(#1) 룩이 a2로 가면(#2) 둘 다 a7을 친다
    const r = resolveTurn(s, [{ pieceId: 1, to: sq('b5') }, { pieceId: 2, to: sq('a2') }]);
    expect(findPiece(r.state, 4)!.hp).toBe(70 - (16 - 5) - (22 - 5));
  });

  it('킹이 파괴되면 남은 공격을 생략하고 즉시 끝난다', () => {
    const s = board([
      ['Q', 0, 'd1'], // 1
      ['K', 0, 'e1'], // 2
      ['K', 1, 'd8', { hp: 5 }], // 3
      ['P', 1, 'g3'], // 4 — 킹이 f2로 가면 칠 수 있는 위치
    ]);
    const r = resolveTurn(s, [{ pieceId: 1, to: sq('d2') }, { pieceId: 2, to: sq('f2') }]);
    expect(r.state.winner).toBe(0);
    expect(r.events.at(-1)).toEqual({ type: 'gameOver', winner: 0 });
    expect(findPiece(r.state, 4)!.hp).toBe(25); // #2 킹의 공격은 생략됨
  });

  it('승급: 끝줄에 닿은 폰은 퀸이 되고 HP 비율을 유지하며, 그 턴에 퀸으로 공격한다', () => {
    const s = board([['P', 0, 'b7', { moved: true, hp: 10 }], ['K', 0, 'e1'], ['R', 1, 'b5'], ['K', 1, 'h7']]);
    const r = resolveTurn(s, [{ pieceId: 1, to: sq('b8') }]);
    const q = findPiece(r.state, 1)!;
    expect(q.type).toBe('Q');
    expect(q.hp).toBe(Math.round(65 * (10 / 25)));
    // 퀸이 되어 아래 방향 사선으로 b5 룩을 친다 (폰이었다면 대각선만 쳤을 것)
    expect(findPiece(r.state, 3)!.hp).toBe(70 - (28 - 5));
  });

  it('입력 상태는 바뀌지 않는다 (미리보기 = 실행)', () => {
    const s = board([['P', 0, 'd3'], ['P', 1, 'e5'], ['K', 0, 'a1'], ['K', 1, 'h8']]);
    const snapshot = JSON.stringify(s);
    resolveTurn(s, [{ pieceId: 1, to: sq('d4') }]);
    expect(JSON.stringify(s)).toBe(snapshot);
  });

  it('잘못된 계획은 거부한다', () => {
    const s = board([['K', 0, 'e1'], ['K', 1, 'e8']]);
    expect(() => resolveTurn(s, [{ pieceId: 2, to: sq('e7') }])).toThrow();
    expect(checkPlan(s, [{ pieceId: 1, to: sq('e5') }]).ok).toBe(false);
  });
});
