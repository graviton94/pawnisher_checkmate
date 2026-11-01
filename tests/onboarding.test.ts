import { describe, expect, it } from 'vitest';
import { LESSONS } from '../src/data/onboarding';
import { lessonBattle } from '../src/run/onboarding';
import { resolveTurn } from '../src/engine';
import { AI_TIERS, choosePlan } from '../src/ai/search';

describe('온보딩 시험대 (D-116)', () => {
  for (const [i, l] of LESSONS.entries()) {
    it(`${i + 1}판: 잘 두면 이긴다 (최고 AI 대 무른 AI)`, () => {
      let s = lessonBattle(l);
      for (let t = 0; t < 40 && s.winner === null; t++) s = resolveTurn(s, choosePlan(s, { tier: s.turnSide === 0 ? AI_TIERS[2] : AI_TIERS[l.tier] })).state;
      expect(s.winner).toBe(0);
    });
  }
});
