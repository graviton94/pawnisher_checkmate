import { describe, expect, it } from 'vitest';
import { START_SET_IDS, START_SETS, SET_UNLOCK_AT, setOpen } from '../src/data/start-sets';
import { COMMANDS, cardFits } from '../src/slice/cards';
import { newSliceBattle } from '../src/slice/battle';
import { recordRun, emptyMeta } from '../src/slice/save';
import { simulateRun } from '../src/sim/runbot';

/** 시작 세트 (D-485, GDD 21장 §4) — 셋은 기본, 셋은 왕관 해금 */
describe('시작 세트 (D-485)', () => {
  it('세트마다 킹이 있고, 덱의 카드는 모두 있는 카드이며 그 분대가 낼 수 있다', () => {
    for (const id of START_SET_IDS) {
      const st = START_SETS[id];
      expect(st.squad).toContain('K');
      for (const c of st.deck) {
        expect(COMMANDS[c]).toBeDefined();
        expect(cardFits(c, st.squad)).toBe(true);
      }
      expect(st.rows.length).toBe(3);
    }
  });
  it('기본 셋은 처음부터 열리고, 나머지는 왕관을 깨야 열린다', () => {
    expect(START_SET_IDS.filter((id) => setOpen(id, []))).toEqual(['standard', 'cavalry', 'infantry']);
    let m = emptyMeta();
    m = recordRun(m, { cleared: true, act: 4, won: 15, asc: 0, daily: null, mode: 'story', chapter: 0, ending: 'throne' } as never);
    expect(setOpen('hybrid', m.unlocked ?? [])).toBe(true);
    expect(setOpen('scrap', m.unlocked ?? [])).toBe(false);
    expect(Object.keys(SET_UNLOCK_AT).length).toBe(3);
  });
  it('무작위 배치: 내 기물은 내 앞 두 줄 안에서 시드대로 섞이고, 같은 시드면 같다', () => {
    const squad = [{ t: 'K' }, { t: 'P' }, { t: 'N' }] as never;
    const deck = ['advance', 'leap', 'kingStep'] as never;
    const a = newSliceBattle(squad, ['K', 'P'], deck, 9, { scatter: 77 });
    const b = newSliceBattle(squad, ['K', 'P'], deck, 9, { scatter: 77 });
    const pos = (s: typeof a) => s.s.pieces.filter((p) => p.side === 0).map((p) => `${p.x},${p.y}`);
    expect(pos(a)).toEqual(pos(b));
    for (const p of a.s.pieces.filter((q) => q.side === 0)) expect(p.y).toBeLessThan(2);
    expect(new Set(pos(a)).size).toBe(3);
  });
  it('등반 봇이 세트마다 출하를 끝까지 돈다', () => {
    for (const set of START_SET_IDS) {
      const r = simulateRun(4242, { asc: 0, style: 'greedy', set });
      expect(r.battles).toBeGreaterThan(0);
    }
  });
});
