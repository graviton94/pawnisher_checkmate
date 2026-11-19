import { describe, expect, it } from 'vitest';
import { BEAT, PACE, moveBeat } from '../src/data/motion';
import { IMPACT, MOVE_MS } from '../src/data/fx';
import { buildAttackFx, moveWarp, warpPlan } from '../src/view/attackFx';

/**
 * 전투 박자 예산 (D-620 → D-680): 넘기기 없이(사용자 결정 4나) 내 수 1.2 ~ 1.4초 · 적 수 0.8 ~ 0.9초.
 * D-680: 길(이동 · 날아감)만 빠르게, 보상(웅크림 · 정지 · 터짐 · 출렁)은 제 길이 — 처치는 제 박자(1초)로 목표 밖.
 */
describe('전투 박자 예산 (D-680)', () => {
  const foeHitGap = PACE.hitGap / PACE.enemyTempo;

  it('내 수 하나(처치 없음) = 이동 + 공격 상한 + 정지 최대 + 숨 — 1.2 ~ 1.4초 띠 안', () => {
    const worst = moveBeat('mine') + BEAT.mine.attack + IMPACT.stop.max + PACE.hitGap + PACE.afterMine;
    expect(worst).toBeLessThanOrEqual(BEAT.target.mine[1]);
    expect(worst).toBeGreaterThanOrEqual(BEAT.target.mine[0]);
  });

  it('처치는 제 박자 — 처치 상한이 D-538 옛 1초보다 짧지 않고, 무너짐이 처치 창 안에 대부분 든다', () => {
    expect(BEAT.mine.kill).toBeGreaterThanOrEqual(1000);
    expect(BEAT.mine.killFx * 0.6 + BEAT.mine.crumble).toBeLessThanOrEqual(BEAT.mine.kill);
  });

  it('적 수 하나 = 겨눔 + 이동 + 공격 상한 + 정지 + 숨 — 0.8 ~ 0.9초 띠 안', () => {
    const typical = PACE.enemyLead + moveBeat('foe') + BEAT.foe.attack + IMPACT.stop.min + foeHitGap;
    expect(typical).toBeLessThanOrEqual(BEAT.target.foeMove[1]);
    expect(typical).toBeGreaterThanOrEqual(BEAT.target.foeMove[0]);
  });

  it('이동: 길(travel)만 크게 줄고 웅크림 · 착지 출렁은 D-180 길이에 가깝다', () => {
    const speed = PACE.fx; // 내 수 배율
    for (const side of ['mine', 'foe'] as const) {
      const m = BEAT[side].move;
      const keepCrouch = m.crouch / (MOVE_MS.lift / speed);
      const keepTravel = m.travel / (MOVE_MS.travel / speed);
      const keepLand = m.land / (MOVE_MS.land / speed);
      expect(keepTravel).toBeLessThan(keepCrouch);
      expect(keepTravel).toBeLessThan(keepLand);
      // 웅크림(예비)은 60fps에서 5장 이상
      expect(m.crouch).toBeGreaterThanOrEqual(5 * (1000 / 60));
    }
    // 내 이동은 구간마다 그 몫을 그대로 쓴다
    const w = moveWarp(BEAT.mine.move, PACE.fx);
    expect(w.wall).toBe(moveBeat('mine'));
    expect(w.at(0)).toBe(0);
    expect(w.at(BEAT.mine.move.crouch)).toBeCloseTo(MOVE_MS.lift);
    expect(w.at(w.wall)).toBeCloseTo(MOVE_MS.lift + MOVE_MS.travel + MOVE_MS.land);
  });

  it('동작 줄이기(빠른 배율)면 이동은 비율 그대로 짧아진다', () => {
    const calm = moveWarp(BEAT.mine.move, 1 / 0.3);
    expect(calm.wall).toBeCloseTo((MOVE_MS.lift + MOVE_MS.travel + MOVE_MS.land) * 0.3);
  });

  it('공격: 넘치면 첫 타격 앞만 줄고 첫 타격 뒤(터짐 · 출렁)는 D-180 길이(1배속) 그대로', () => {
    const t = 48;
    const o = { x: 120, y: 120 };
    const fx = buildAttackFx({ kinds: ['N'], side: 0, origin: o, tiles: [{ key: 'a', x: o.x + t, y: o.y + 2 * t }], tile: t, power: 1 });
    const first = Math.min(...fx.impact.values());
    const plan = warpPlan(fx.duration, first, PACE.fx, BEAT.mine.killFx, BEAT.preMin);
    expect(plan.wall).toBeLessThanOrEqual(BEAT.mine.killFx + 1e-6);
    const post = plan.wall - plan.wallOf(first);
    expect(post).toBeCloseTo(fx.duration - first);
    expect(plan.wallOf(first)).toBeGreaterThanOrEqual(BEAT.preMin);
    // 시간 축은 앞으로만 흐르고 끝이 맞는다
    let prev = -1;
    for (let w = 0; w <= plan.wall; w += 5) { const ms = plan.at(w); expect(ms).toBeGreaterThanOrEqual(prev); prev = ms; }
    expect(plan.at(plan.wall)).toBeCloseTo(fx.duration);
    expect(plan.at(plan.wallOf(first))).toBeCloseTo(first);
  });

  it('예산 안이면 그대로, 모으기 바닥 아래로는 줄지 않는다', () => {
    expect(warpPlan(500, 300, 1, 800).wall).toBe(500);
    const tight = warpPlan(1000, 700, 1, 300, 170);
    expect(tight.wallOf(700)).toBeCloseTo(170);
    expect(tight.wall).toBeCloseTo(300);
  });
});
