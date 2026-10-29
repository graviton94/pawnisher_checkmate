import { simulate } from './plan';
import { beginTurn, endTurn } from './turnstart';
import { otherSide, type BattleEvent, type BattleState, type Plan } from './types';

export interface TurnResult {
  state: BattleState;
  events: BattleEvent[];
}

/**
 * 한 진영의 턴을 실행한다 (GDD 1장 §1.5, 3장 §3.1).
 * 예약 순서대로 "이동 → 공격"을 반복한다. 입력 상태는 바꾸지 않으며, 미리보기도 같은 시뮬레이션을 쓴다 (GDD 3장 §3.6).
 */
export const resolveTurn = (input: BattleState, plan: Plan): TurnResult => {
  if (input.winner !== null) throw new Error('이미 끝난 전투');
  const sim = simulate(input, plan);
  if (!sim.ok) throw new Error(`잘못된 계획: ${sim.reason}`);
  const s = sim.state;
  const events = sim.events;
  if (s.winner === null) {
    endTurn(s, sim.apUsed);
    s.turnSide = otherSide(s.turnSide);
    s.turnNumber += 1;
    beginTurn(s, events);
  }
  return { state: s, events };
};
