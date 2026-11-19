import { describe, expect, it } from 'vitest';
import { BEAT, PACE } from '../src/data/motion';
import { IMPACT, MOVE_MS } from '../src/data/fx';

/** 전투 박자 예산 (D-620, 사용자 결정 4나): 내 수 ≤ 1.2초 · 적 수 ≤ 0.8초 — 넘기기 없이 연출 길이로 지킨다 */
describe('전투 박자 예산 (D-620)', () => {
  // 공격 연출 상한 + 타격 정지(히트스톱) 최대 — 정지는 예산 밖에서 덧붙는다
  const stopMax = Math.max(IMPACT.stop.max * 2, IMPACT.stop.kill * IMPACT.chain.max);

  it('내 수 하나 = 이동 + 처치 공격 상한 + 정지 + 숨 ≤ 1.2초 (프레임 여유 10%)', () => {
    const worst = BEAT.mine.move + Math.max(BEAT.mine.attack, BEAT.mine.kill) + stopMax + PACE.hitGap + PACE.afterMine;
    expect(worst).toBeLessThanOrEqual(BEAT.target.mine * 1.1);
    expect(BEAT.target.mine).toBe(1200);
  });

  it('적 수 하나 = 겨눔 + 이동 + 공격 상한 + 숨 ≤ 0.8초', () => {
    const typical = PACE.enemyLead + BEAT.foe.move + BEAT.foe.attack + PACE.hitGap;
    expect(typical).toBeLessThanOrEqual(BEAT.target.foeMove);
    expect(BEAT.target.foeMove).toBe(800);
  });

  it('예비 → 터짐 → 출렁 모양은 그대로 — 예산은 이동 길이를 비율로 줄인다(원본보다 짧다)', () => {
    const total = MOVE_MS.lift + MOVE_MS.travel + MOVE_MS.land;
    expect(BEAT.mine.move).toBeLessThan(total);
    expect(BEAT.foe.move).toBeLessThanOrEqual(BEAT.mine.move);
    // 웅크림(예비)이 줄어든 길이에서도 여러 프레임(60fps에서 3장 이상) 남는다
    expect((BEAT.foe.move * MOVE_MS.lift) / total).toBeGreaterThanOrEqual(50);
  });
});
