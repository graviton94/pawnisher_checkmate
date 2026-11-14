import { describe, expect, it } from 'vitest';
import { cardTags, fitCount } from '../src/slice/tags';
import type { CommandId } from '../src/slice/cards';

/** 피드백 #13 (D-503): 「나이트 4」는 덱 카드 수였다 — 분대 기물 수를 따로 센다 */
describe('받침 아래 맞물림 줄 (#13)', () => {
  const deck = (ids: CommandId[]) => ids.map((id) => cardTags(id));

  it('나이트 카드 4장 · 분대 나이트 1 — 둘을 따로 센다', () => {
    const f = fitCount(cardTags('leap'), deck(['leap', 'leap', 'hoofKick', 'rebound', 'advance', 'order']), ['K', 'N', 'P', 'P']);
    expect(f.squad).toBe(1);
    expect(f.cards).toBe(4);
  });

  it('분대에 그 기물이 없으면 카드가 많아도 나쁨', () => {
    const f = fitCount(cardTags('leap'), deck(['leap', 'leap', 'hoofKick', 'rebound']), ['K', 'P', 'P']);
    expect(f.squad).toBe(0);
    expect(f.tone).toBe('bad');
  });

  it('공용 카드는 분대 수를 세지 않는다 · 킹 카드는 분대 킹 1', () => {
    expect(fitCount(cardTags('order'), deck(['leap']), ['K', 'N']).squad).toBeNull();
    expect(fitCount({ who: 'K', style: 'guard' }, [], ['K']).squad).toBe(1);
  });
});
