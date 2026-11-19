import { describe, expect, it } from 'vitest';
import { renderScale } from '../src/view/renderscale';
import { placeCardWin } from '../src/slice/winplace';

describe('판 선명도 배율 (D-665)', () => {
  it('선명은 예전 그대로 (D-240 · D-525)', () => {
    expect(renderScale(1)).toBe(1);
    expect(renderScale(2)).toBe(2);
    expect(renderScale(2.625)).toBe(2.625);
    expect(renderScale(3)).toBe(1.5);
    expect(renderScale(4)).toBe(2);
  });
  it('빠름은 선명을 정수로 한 번 더 나눈다 — 캔버스 한 픽셀이 기기 픽셀 정수 개, 배율 1 아래로는 내려가지 않는다', () => {
    for (const d of [2, 2.625, 3, 3.5, 4]) {
      const f = renderScale(d, true);
      expect(f).toBeLessThan(renderScale(d));
      expect(f).toBeGreaterThanOrEqual(1);
      expect(Math.abs(d / f - Math.round(d / f))).toBeLessThan(1e-9);
    }
    expect(renderScale(2.625, true)).toBe(1.3125);
    expect(renderScale(1, true)).toBe(1);
    expect(renderScale(1.5, true)).toBe(1.5);
  });
});

describe('펼친 카드 창 자리 (D-667)', () => {
  const col = { left: 100, top: 40, right: 500, bottom: 400 };
  const half = 24;
  it('겨누는 칸 · 고른 기물 · 내 기물 줄을 피할 자리가 있으면 덮지 않는다', () => {
    // 내 기물 줄 = 아래(y 360) · 갈 칸 = 가운데(y 220) · 적 = 위(y 80)
    const mine = [150, 250, 350, 450].map((x) => ({ x, y: 360 }));
    const s = placeCardWin(col, 352, 120, 330, { hard: [{ x: 250, y: 220 }, { x: 250, y: 360 }], mine, other: [{ x: 450, y: 80 }], half });
    expect(s.cost).toBeLessThan(1000);
    const covers = (p: { x: number; y: number }) => p.x + half - 1 > s.left && p.x - half + 1 < s.left + 352 && p.y + half - 1 > s.top && p.y - half + 1 < s.top + 120;
    expect(covers({ x: 250, y: 220 })).toBe(false);
    expect(mine.some(covers)).toBe(false);
  });
  it('세로로 비킬 수 없으면 오른끝으로 · 그래도 덮으면 가장 적게 덮는 곳', () => {
    const wide = { left: 100, top: 40, right: 700, bottom: 400 };
    const s = placeCardWin(wide, 352, 330, 60, { hard: [{ x: 150, y: 80 }, { x: 250, y: 80 }], mine: [{ x: 650, y: 80 }], other: [], half });
    expect(s.left).toBe(340);
    expect(s.cost).toBe(30);
    const t = placeCardWin(wide, 352, 330, 60, { hard: [150, 250, 650].map((x) => ({ x, y: 80 })), mine: [], other: [], half });
    expect(t.cost).toBe(1000);
  });
  it('아무것도 덮지 않으면 카드 줄 옆 그대로', () => {
    const s = placeCardWin(col, 352, 120, 150, { hard: [], mine: [], other: [], half });
    expect(s).toEqual({ left: 108, top: 150, cost: 0 });
  });
});
