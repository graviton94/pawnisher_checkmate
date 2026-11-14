import { describe, expect, it } from 'vitest';
import { endTurn, intentRows, newSliceBattle, stallInfo, STALL_LABEL } from '../src/slice/battle';
import { STALL_PRESS } from '../src/data/battle';

/** 교착 압박 (2026-11-14): from턴부터 피해 없는 턴이 quiet번 이어지면 적 킹 방열판이 벗겨지고 턴마다 최대 HP의 10%가 녹는다 */
const setup = () => {
  const b = newSliceBattle([{ t: 'K' }, { t: 'B' }] as never, ['K', 'R'], ['kingStep', 'kingStep', 'kingStep', 'kingStep', 'kingStep', 'kingStep'] as never, 3, { guard: 0.3 });
  b.turn = STALL_PRESS.from;
  return b;
};
const foeKing = (b: ReturnType<typeof setup>) => b.s.pieces.find((p) => p.side === 1 && p.type === 'K')!;

describe('교착 압박', () => {
  it('피해 없는 턴이 quiet번째가 되는 턴 끝에 녹는다 — 미리보기(적의 수 줄) = 실행', () => {
    const b = setup();
    expect(stallInfo(b).state).toBe('warn');
    const hp0 = foeKing(b).hp;
    endTurn(b, true);
    expect(b.s.winner).toBe(null);
    expect(b.rust).toBeFalsy();
    expect(foeKing(b).hp).toBe(hp0);
    // 다음 턴: 지금 끝내면 녹는다
    const st = stallInfo(b);
    expect(st.state).toBe('on');
    expect(st.dmg).toBe(Math.ceil(foeKing(b).maxHp * STALL_PRESS.rustPct));
    const row = intentRows(b).find((r) => r.label === STALL_LABEL);
    expect(row?.hits[0]).toMatchObject({ t: 'K', side: 1, damage: st.dmg + foeKing(b).shield });
    const before = foeKing(b).hp;
    endTurn(b, true);
    expect(b.s.winner).toBe(null);
    expect(b.rust).toBe(true);
    expect(foeKing(b).hp).toBe(before - st.dmg);
    // 호위가 있어도 방열판은 다시 두르지 않는다
    expect(foeKing(b).shield).toBe(0);
    // 한 번 시작되면 피해를 주어도 계속 녹는다
    (b.dealt ??= [])[b.turn - 1] = 5;
    expect(stallInfo(b).state).toBe('on');
  });
  it('from턴 전이나 피해를 준 턴은 세지 않는다', () => {
    const b = setup();
    b.turn = STALL_PRESS.from - 3;
    endTurn(b, true);
    endTurn(b, true);
    expect(b.quiet ?? 0).toBe(0);
    const c = setup();
    (c.dealt ??= [])[c.turn - 1] = 3;
    endTurn(c, true);
    expect(c.quiet).toBe(0);
    expect(stallInfo(c).state).toBe('off');
  });
  it('녹이 킹을 쓰러뜨리면 이긴다', () => {
    const b = setup();
    b.quiet = STALL_PRESS.quiet - 1;
    foeKing(b).hp = 1;
    endTurn(b, true);
    expect(b.s.winner).toBe(0);
  });
});
