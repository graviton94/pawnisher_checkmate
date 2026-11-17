import { describe, expect, it } from 'vitest';
import { buildRun, ASC_MAX } from '../src/slice/run';
import { KEYWORDS } from '../src/data/hud';
import { SAVE_VERSION, clearSave, dailySeed, emptyMeta, ftueMark, readMeta, readSave, recordRun, todayKey, writeMeta, writeSave, type RunSave, type Store } from '../src/slice/save';

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
    expect(readSave(st)).toEqual({ ...sample(), v: SAVE_VERSION });
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
    // 폰 하나 더: 이형 · 거대 주물이 편성을 바꾸지 않은 판끼리 견준다 (이형은 왕관마다 풀이 달라 폰 둘을 빼기도 한다)
    const plain = (d: typeof b0) => !d.forms?.length && !d.giants?.length;
    let pair: [typeof b0, typeof b0] | null = null;
    for (let seed = 1; seed <= 60 && !pair; seed++) {
      const first = (asc: number) => buildRun(seed, asc)[0].rows[1].find((n) => n.battle)!.battle!; // 1막 첫 층 (입문 다음)
      const a = first(0), z = first(5);
      if (plain(a) && plain(z) && a.title === z.title) pair = [a, z];
    }
    expect(pair).not.toBeNull();
    expect(pair![1].enemy.length).toBe(pair![0].enemy.length + 1);
    expect(pair![1].enemy.filter((t) => t === 'P').length).toBe(pair![0].enemy.filter((t) => t === 'P').length + 1);
    const chk = (r: typeof r0) => r[0].rows.at(-1)![0].battle!.kingHp;
    expect(chk(r5)).toBeGreaterThan(chk(r0));
  });
});

describe('첫 10분 단계는 기록 판에 한 번 (D-548 — 출하 중 앱을 다시 켜자 first_pick이 또 남았다)', () => {
  it('처음 밟은 단계만 새 기록 판을 돌려주고, 다시 읽은 뒤(앱 재시작)에도 같은 단계는 null', () => {
    const st = memStore();
    const a = ftueMark(readMeta(st), 'first_pick');
    expect(a?.ftue).toEqual(['first_pick']);
    writeMeta(st, a!);
    // 앱을 다시 켠다 — 세션 상태 없이 기록 판만 읽는다
    expect(ftueMark(readMeta(st), 'first_pick')).toBeNull();
    const b = ftueMark(readMeta(st), 'kit_pick');
    expect(b?.ftue).toEqual(['first_pick', 'kit_pick']);
  });
});

describe('바뀐 용어 이름 (D-548 — D-536 「되받아침」 → 「가시 반격」)', () => {
  it('옛 이름으로 연 용어는 지금 이름으로 읽혀 다시 열리지 않는다', () => {
    const st = memStore();
    writeMeta(st, { ...emptyMeta(), terms: ['태엽', '되받아침'], termsNew: ['되받아침'] });
    const m = readMeta(st);
    expect(m.terms).toEqual(['태엽', '가시 반격']);
    expect(m.termsNew).toEqual(['가시 반격']);
    expect(KEYWORDS.some(([k, , g]) => g === 'thorns' && k === '가시 반격')).toBe(true);
    expect(KEYWORDS.some(([k]) => k === '되받아침')).toBe(false);
  });
});
