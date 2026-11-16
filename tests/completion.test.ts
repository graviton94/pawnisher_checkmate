import { describe, expect, it } from 'vitest';
import { commitRunEnd, emptyMeta, readMeta, readSave, writeMeta, writeSave, SAVE_KEY, type RunSave, type Store } from '../src/slice/save';
import { eventBagFor, runNemeses, type Nemesis } from '../src/slice/director';
import { SLICE_EVENT_IDS } from '../src/slice/events';

/** 출시 완주 점검 (2026-11-16, docs/reports/2026-11-16-completion-check.md)에서 찾은 버그의 회귀 시험 */
const memStore = (): Store & { m: Map<string, string> } => {
  const m = new Map<string, string>();
  return { m, getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
};
const run = (o: Partial<RunSave> = {}): RunSave => ({
  v: 3, seed: 7, asc: 0, mode: 'story', chapter: 0, daily: null, runId: 'r-1', actI: 1, rowI: 2, picked: [[0], [1], [], []],
  squad: [{ t: 'K', name: '종이왕' }], deck: ['advance'], parts: [], gold: 40, won: 5, stage: 6, refined: [], eventBag: [], rng: 99, at: 'map', ...o,
} as RunSave);

describe('오늘의 도전은 기록과 상관없이 같은 출하', () => {
  const nem: Nemesis[] = [{ t: 'R', name: '녹슨 집행자', rank: 2, victims: ['먼지투성이'] }];
  it('원수는 오늘의 도전에 끼우지 않는다 (난수를 더 뽑지 않게)', () => {
    expect(runNemeses(nem, '2026-11-16')).toEqual([]);
    expect(runNemeses(nem, null)).toEqual(nem);
  });
  it('최근 사건을 빼는 가방은 본편 · 도전만 — 오늘의 도전은 늘 전부', () => {
    const recent = SLICE_EVENT_IDS.slice(0, 5);
    expect(eventBagFor(SLICE_EVENT_IDS, recent, '2026-11-16')).toEqual([...SLICE_EVENT_IDS]);
    expect(eventBagFor(SLICE_EVENT_IDS, [], '2026-11-16')).toEqual(eventBagFor(SLICE_EVENT_IDS, recent, '2026-11-16'));
    expect(eventBagFor(SLICE_EVENT_IDS, recent, null)).toEqual(SLICE_EVENT_IDS.filter((x) => !recent.includes(x)));
    expect(eventBagFor(['a', 'b', 'c'], ['a', 'b'], null)).toEqual(['a', 'b', 'c']);
  });
});

describe('이어하기가 출하를 잃지 않는다', () => {
  it('쇳물 서약으로 녹인 동료 이름이 저장 · 이어하기를 지나도 결말까지 남는다', () => {
    const st = memStore();
    writeSave(st, run({ melted: ['먼지투성이'] }));
    expect(readSave(st)?.melted).toEqual(['먼지투성이']);
  });
});

describe('출하 끝은 한 번만, 그리고 곧바로 기록된다', () => {
  const rec = { cleared: false, act: 2, won: 4, asc: 0, daily: null, mode: 'story' as const, chapter: 0 as const, ending: 'throne' as const };
  it('패배를 남기면 저장이 지워져 이어하기로 진 대국을 무를 수 없다', () => {
    const st = memStore();
    writeMeta(st, emptyMeta());
    writeSave(st, run({ at: 'battle' }));
    expect(readSave(st)).not.toBeNull();
    const r = commitRunEnd(st, 'r-1', rec);
    expect(r?.after.runs).toBe(1);
    expect(readSave(st)).toBeNull();
    expect(st.m.has(SAVE_KEY + '.bak')).toBe(false);
  });
  it('같은 출하를 두 번 남겨도 횟수 · 해금이 겹치지 않는다', () => {
    const st = memStore();
    writeMeta(st, emptyMeta());
    const first = commitRunEnd(st, 'r-1', { ...rec, cleared: true, act: 4, ending: 'throne' }, () => ['x']);
    expect(first?.after.storyCleared).toBe(1);
    expect(commitRunEnd(st, 'r-1', { ...rec, cleared: true, act: 4, ending: 'throne' }, () => ['y'])).toBeNull();
    const m = readMeta(st);
    expect([m.runs, m.clears, m.storyCleared, m.unlocked]).toEqual([1, 1, 1, [...(first!.after.unlocked ?? [])]]);
    expect(m.unlocked).toContain('x');
    expect(m.unlocked).not.toContain('y');
    // 다음 출하는 따로 센다
    expect(commitRunEnd(st, 'r-2', rec)?.after.runs).toBe(2);
  });
});
