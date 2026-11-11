import { describe, expect, it } from 'vitest';
import { buildRun, ASC_MAX } from '../src/slice/run';
import { clearSave, dailySeed, emptyMeta, readMeta, readSave, recordRun, todayKey, writeMeta, writeSave, type RunSave, type Store } from '../src/slice/save';

const memStore = (): Store => {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
};
const sample = (): RunSave => ({ v: 2, seed: 7, asc: 2, daily: null, runId: 'r', actI: 1, rowI: 3, picked: [[0, 0, 1], [2], []], squad: [{ t: 'K', name: '대장', wins: 3, protectedDamage: 12 }], deck: ['advance'], parts: ['coil'], gold: 40, won: 6, stage: 9, refined: [], eventBag: ['smith'], rng: 12345, at: 'map', shopsSeen: 1 });

describe('저장 · 승급 · 오늘의 출하 (D-174)', () => {
  it('저장 → 읽기 → 지우기', () => {
    const st = memStore();
    expect(readSave(st)).toBeNull();
    writeSave(st, sample());
    expect(readSave(st)).toEqual(sample());
    clearSave(st);
    expect(readSave(st)).toBeNull();
  });
  it('깨진 저장은 무시한다', () => {
    const st = memStore();
    st.setItem('pawnisher.slice.save', '{oops');
    expect(readSave(st)).toBeNull();
    expect(readMeta(st)).toEqual(emptyMeta());
  });
  it('승급 n을 끝내면 n+1이 열린다 (상한 · 오늘의 출하는 열지 않는다)', () => {
    let m = emptyMeta();
    m = recordRun(m, { cleared: false, act: 2, won: 5, asc: 0, daily: null });
    expect(m.ascOpen).toBe(0);
    expect(m.bestAct).toBe(2);
    m = recordRun(m, { cleared: true, act: 3, won: 15, asc: 0, daily: null });
    expect(m.ascOpen).toBe(1);
    m = recordRun(m, { cleared: true, act: 3, won: 15, asc: 0, daily: null });
    expect(m.ascOpen).toBe(1);
    m = recordRun(m, { cleared: true, act: 3, won: 15, asc: 0, daily: '2026-11-02' });
    expect(m.ascOpen).toBe(1);
    expect(m.daily['2026-11-02'].cleared).toBe(true);
    for (let i = 1; i <= ASC_MAX + 2; i++) m = recordRun(m, { cleared: true, act: 3, won: 15, asc: Math.min(i, ASC_MAX), daily: null });
    expect(m.ascOpen).toBe(ASC_MAX);
    expect(m.runs).toBe(4 + ASC_MAX + 2);
    const st = memStore();
    writeMeta(st, m);
    expect(readMeta(st)).toEqual(m);
  });
  it('오늘의 출하: 같은 날 = 같은 지도, 다른 날 = 다른 지도', () => {
    expect(todayKey(new Date(2026, 10, 2))).toBe('2026-11-02');
    const a = JSON.stringify(buildRun(dailySeed('2026-11-02')));
    expect(JSON.stringify(buildRun(dailySeed('2026-11-02')))).toBe(a);
    expect(JSON.stringify(buildRun(dailySeed('2026-11-03')))).not.toBe(a);
  });
  it('승급이 대국을 단단하게 한다 (적 HP · 검문 킹 · 폰 하나 더)', () => {
    const r0 = buildRun(5, 0), r5 = buildRun(5, 5);
    const b0 = r0[1].rows[0].find((n) => n.battle)!.battle!;
    const b5 = r5[1].rows[0].find((n) => n.battle)!.battle!;
    expect(b5.enemyHp!).toBeGreaterThan(b0.enemyHp!);
    expect(b5.enemy.length).toBe(b0.enemy.length + 1);
    const chk = (r: typeof r0) => r[0].rows.at(-1)![0].battle!.kingHp;
    expect(chk(r5)).toBeGreaterThan(chk(r0));
  });
});
