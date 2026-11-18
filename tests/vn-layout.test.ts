import { describe, expect, it } from 'vitest';
import { fitSlots } from '../src/slice/vn';

// 회귀 (D-554 VN 층): 우리 편 셋이 서면 셋째(왼쪽 바깥 자리)가 띠 위 화자 명패 뒤에 섰다 —
// 배우 몸 가운데는 명패를 비킨 [lo, hi] 안에만 서야 한다
describe('비주얼 노벨 배우 자리 (fitSlots)', () => {
  it('넉넉하면 바라는 자리 그대로', () => {
    expect(fitSlots([300, 600], 100, 800, 90)).toEqual([300, 600]);
  });

  it('바깥 자리가 명패 쪽으로 넘으면 범위 안으로 밀고, 몸끼리 d만큼 띄운다', () => {
    // 915 폭: 우리 편 0.38 · 0.21 (안쪽 · 바깥쪽), 적 0.62 — 왼쪽 명패 끝 304
    const x = fitSlots([348, 192, 567], 350, 865, 94);
    expect(Math.min(...x)).toBeGreaterThanOrEqual(350);
    const s = [...x].sort((a, b) => a - b);
    for (let i = 1; i < s.length; i++) expect(s[i] - s[i - 1]).toBeGreaterThanOrEqual(94 - 1e-9);
    // 편 순서는 그대로 (바깥 배우가 여전히 가장 왼쪽)
    expect(x[1]).toBeLessThan(x[0]);
    expect(x[0]).toBeLessThan(x[2]);
  });

  it('범위가 좁으면 몸 사이를 줄여서라도 명패 범위를 지킨다', () => {
    const x = fitSlots([200, 400, 600], 350, 560, 129);
    for (const v of x) {
      expect(v).toBeGreaterThanOrEqual(350);
      expect(v).toBeLessThanOrEqual(560);
    }
  });

  it('배우가 없으면 빈 목록', () => {
    expect(fitSlots([], 0, 100, 10)).toEqual([]);
  });
});
