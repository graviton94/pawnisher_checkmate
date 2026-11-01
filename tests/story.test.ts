import { describe, expect, it } from 'vitest';
import { ACT_ENTRY, BOSS_STORY, JOIN, PROLOGUE, PROMOTION, RECORDS, TAUNTS, TRUE_ENDING, promotionFor } from '../src/data/story';
import { BOSSES } from '../src/data/run';
import { NPCS } from '../src/data/npcs';
import { MAX_ASCENSION } from '../src/data/ascension';

describe('이야기 데이터 (D-135)', () => {
  it('압력 0~최대 모두 승급 장면이 있고, 13에서만 내려놓는 장면', () => {
    for (let p = 0; p <= MAX_ASCENSION; p++) expect(promotionFor(p)).toBeDefined();
    expect(promotionFor(MAX_ASCENSION).mono).toContain('내려놓는다');
    expect(promotionFor(MAX_ASCENSION - 1).mono).not.toContain('내려놓는다');
    expect(PROMOTION.map((g) => g.from)).toEqual([0, 2, 5, 8, 10]);
  });
  it('반장마다 신념 · 해체 · 대답 · 초상화', () => {
    for (const id of Object.keys(BOSSES) as (keyof typeof BOSSES)[]) {
      const b = BOSS_STORY[id];
      expect(b.belief && b.fall && b.reply).toBeTruthy();
      expect(NPCS[b.npc]).toBeDefined();
    }
  });
  it('컷 수 · 기록지 12장 · 공정 진입 3 · 합류 5종', () => {
    expect(PROLOGUE.length).toBe(7);
    expect(TRUE_ENDING.length).toBe(7);
    expect(ACT_ENTRY.length).toBe(3);
    expect(RECORDS.length).toBe(12);
    expect(Object.keys(JOIN).sort()).toEqual(['B', 'N', 'P', 'Q', 'R']);
    expect(TAUNTS.length).toBeGreaterThan(3);
  });
  it('말투: 존댓말 · 말꼬리 없음, 컷 배우는 아는 초상화', () => {
    const all = [...PROLOGUE, ...TRUE_ENDING, ...ACT_ENTRY].flatMap((c) => [...c.lines.map((l) => l.text), ...c.actors.flatMap((a) => (a.npc ? [NPCS[a.npc].name] : []))]);
    for (const t of [...all, ...RECORDS.map((r) => r.text), ...PROMOTION.map((p) => p.taunt + p.mono)]) {
      expect(t).not.toMatch(/세요|해요|습니다|잖/);
    }
  });
});
