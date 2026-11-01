import { describe, expect, it } from 'vitest';
import { actEnchants, eliteFrom, elitePieces, enemyTier, FLOORS_PER_ACT } from '../src/data/run';

describe('검문! 완화 (D-137)', () => {
  const a1 = 7;
  const a2 = FLOORS_PER_ACT + 5;
  const a3 = 2 * FLOORS_PER_ACT + 5;
  it('1공정 검문!은 6층부터 · 기물 +1 없음 · 개조 없음 · 단계 1', () => {
    expect(eliteFrom(1)).toBe(6);
    expect(elitePieces(a1)).toBe(0);
    expect(actEnchants(a1, 'elite')).toBe(0);
    expect(enemyTier(a1, 'elite')).toBe(1);
  });
  it('2 · 3공정은 개조 하나씩 줄었다', () => {
    expect(actEnchants(a2, 'elite')).toBe(1);
    expect(actEnchants(a3, 'elite')).toBe(2);
    expect(elitePieces(a2)).toBe(1);
    expect(enemyTier(a2, 'elite')).toBe(2);
  });
});
