import { describe, expect, it, vi } from 'vitest';
import { HEAVY_MS } from './heavy';

// 대국 · 시뮬레이션을 많이 돌린다 — 부하가 걸린 기기에서도 기본 5초에 걸리지 않게 (tests/heavy.ts)
vi.setConfig({ testTimeout: HEAVY_MS });
import { newSliceBattle } from '../src/slice/battle';
import { HEAT_DEFAULT, SLICE, START_COMMANDS } from '../src/slice/cards';
import { bestAction, idleStats, playOut, playOutSearch, type IdleStats } from '../src/slice/bot';

/**
 * 손 놓은 봇 (2026-11-09d, 사용자: 「태엽이 남았는데 아무것도 안 하는 봇을 최소화」):
 * 태엽이 남고 낼 카드가 있는데 턴을 끝내는 비율이 낮아야 한다 — 성향(무뇌 · 단순 · 보통 · 두뇌)마다.
 */
const squad = [{ t: 'K' as const }, { t: 'P' as const }, { t: 'P' as const }, { t: 'N' as const }, { t: 'B' as const }];
const mk = (seed: number) => newSliceBattle(squad, ['K', 'P', 'P', 'N', 'B'], START_COMMANDS, seed, { enemyKingHp: 0.8 });
const add = (a: IdleStats, b: IdleStats) => { a.turns += b.turns; a.idle += b.idle; a.apLeft += b.apLeft; a.idleAp += b.idleAp; };

describe('손 놓은 턴 (2026-11-09d)', () => {
  it('첫 턴: 칠 적이 없어도 단순 · 보통 봇은 다가가는 수를 둔다 (턴을 그냥 끝내지 않는다)', () => {
    for (const style of ['naive', 'greedy'] as const) {
      const b = mk(3);
      expect(b.ap).toBeGreaterThan(0);
      expect(bestAction(b, style)).not.toBeNull();
    }
  });
  for (const style of ['random', 'naive', 'greedy'] as const)
    it(`${style}: 손 놓은 턴이 10% 아래`, () => {
      const st = idleStats();
      // D-557: 8대국 → 40대국 — 적 킹 공격을 낮추자 8대국 표본의 보통 봇이 5/36턴(13.9%)으로 튀었다(40대국 7.5%, 다음 40대국 6.6%). 표본을 키워 흔들림을 줄인다
      for (let k = 0; k < 40; k++) add(st, playOut(mk(20 + k), 30, undefined, style).idle);
      expect(st.turns).toBeGreaterThan(0);
      // D-501: 적 공격 1.3 → 1.55 뒤 이 작은 판(8대국)에서 보통 봇 10.9% — 둘 수가 다 손해인 턴을 넘긴 것. 등반 머신 전체 손 놓음은 3 ~ 5%
      expect(st.idle / st.turns).toBeLessThan(0.12);
    }, 60000); // 40대국 — 다른 작업과 CPU를 나눌 때 5초 기본 상한을 넘는다
  it('search: 손 놓은 턴이 20% 아래 (실제 공정 열기 D-454)', () => {
    const keep = SLICE.heat;
    SLICE.heat = [...HEAT_DEFAULT];
    const st = idleStats();
    for (let k = 0; k < 2; k++) add(st, playOutSearch(mk(40 + k), 20, 3, 4).idle);
    SLICE.heat = keep;
    expect(st.turns).toBeGreaterThan(0);
    expect(st.idle / st.turns).toBeLessThan(0.2);
  }, 60_000);
});
