import { describe, expect, it } from 'vitest';
import { revealScroll } from '../src/slice/handfit';

// D-596: 자동 고르기 · 키보드로 고른 카드가 「▼ N장 더」 아래에 숨으면 레일을 내려 통째로 보인다
describe('revealScroll — 고른 카드를 손패 레일 안에 보이기', () => {
  // 레일 높이 234 · 띠 28 → 보이는 칸 206. 카드 57 + 간격 4
  const card = (i: number) => ({ top: i * 61, height: 57 });

  it('이미 다 보이는 카드는 레일을 움직이지 않는다 (PC · 위쪽 카드)', () => {
    expect(revealScroll(card(0), 0, 234, 28)).toBe(0);
    expect(revealScroll(card(2), 0, 234, 28)).toBe(0);
    expect(revealScroll(card(1), 40, 1000, 0)).toBe(40);
  });

  it('띠 아래 숨은 카드는 아래 끝이 띠 위에 닿게 내린다', () => {
    const s = revealScroll(card(6), 0, 234, 28);
    expect(s).toBe(6 * 61 + 57 - 206);
    // 내린 뒤에는 카드 전체가 [s, s + 206] 안
    expect(card(6).top).toBeGreaterThanOrEqual(s);
    expect(card(6).top + 57).toBeLessThanOrEqual(s + 206);
  });

  it('띠에 반쯤 걸린 카드도 통째로 보이게 한다', () => {
    expect(revealScroll(card(3), 0, 234, 28)).toBe(3 * 61 + 57 - 206);
  });

  it('위로 지나간 카드는 윗머리를 레일 위 끝에 맞춘다', () => {
    expect(revealScroll(card(1), 200, 234, 28)).toBe(61);
  });

  it('보이는 칸보다 큰(펼친) 카드는 이름 줄이 보이게 위를 맞춘다', () => {
    expect(revealScroll({ top: 300, height: 260 }, 0, 234, 28)).toBe(300);
  });

  it('스크롤 한도와 0 밑으로는 넘지 않는다', () => {
    expect(revealScroll(card(6), 0, 234, 28, 100)).toBe(100);
    expect(revealScroll({ top: -3, height: 57 }, 10, 234, 28)).toBe(0);
  });
});
