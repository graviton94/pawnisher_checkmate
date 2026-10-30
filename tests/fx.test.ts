import { describe, expect, it } from 'vitest';
import { FX_POWER, FX_SHAKE } from '../src/data/fx';
import { buildAttackFx, fxPower, impactFeedback } from '../src/view/attackFx';

const T = 100;
const req = (power: number, kinds: ('P' | 'Q')[] = ['P']) => ({
  kinds,
  side: 0 as const,
  origin: { x: 350, y: 350 },
  tiles: [{ key: '3,4', x: 350, y: 250 }],
  tile: T,
  power,
});

describe('공격 세기 연출 (D-064)', () => {
  it('세기는 피해 합과 처치 수로 커지고 1을 넘지 않는다', () => {
    expect(fxPower([{ damage: 2 }])).toBeCloseTo(2 * FX_POWER.perDamage);
    expect(fxPower([{ damage: 2, killed: true }])).toBeGreaterThan(fxPower([{ damage: 2 }]));
    expect(fxPower([{ damage: 99, killed: true }, { damage: 99, killed: true }])).toBe(1);
  });

  it('세기가 크면 모으는 시간만큼 길어지고 타격도 그만큼 늦어진다', () => {
    const calm = buildAttackFx(req(0));
    const big = buildAttackFx(req(1));
    const pre = big.duration - calm.duration;
    expect(pre).toBeGreaterThan(0);
    expect(big.impact.get('3,4')).toBe((calm.impact.get('3,4') ?? 0) + pre);
  });

  it('모으는 동안 기물이 뛰어오른다 (dy < 0)', () => {
    const big = buildAttackFx(req(1));
    expect(big.actor(150).dy).toBeLessThan(-0.1);
  });

  it('공격 1회는 상한(1초)을 넘기지 않는다 — 원래 긴 공격은 덜 모은다', () => {
    const q = buildAttackFx(req(1, ['Q']));
    expect(q.duration).toBeLessThanOrEqual(Math.max(FX_POWER.maxTotal, buildAttackFx(req(0, ['Q'])).duration));
  });

  it('흔들림·진동은 큰 피해나 처치일 때만', () => {
    expect(impactFeedback(FX_SHAKE.damage - 1, false)).toBeNull();
    expect(impactFeedback(FX_SHAKE.damage, false)?.intensity).toBe(FX_SHAKE.intensity);
    expect(impactFeedback(1, true)?.vibrate).toBe(FX_SHAKE.vibrateKill);
  });
});
