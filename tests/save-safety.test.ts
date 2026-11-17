import { describe, expect, it } from 'vitest';
import { BAK, CORRUPT, META_KEY, SAVE_KEY, SAVE_VERSION, clearSave, commitRunEnd, emptyMeta, fightPending, newerSaveFound, settledEnd, migrateMeta, migrateSave, readMeta, readSave, setSaveGuard, writeMeta, writeSave, type RunSave, type Store } from '../src/slice/save';
import { TELEMETRY_KEY, telemetryAll, telemetryShed, telemetryStore, track } from '../src/slice/telemetry';
import { endTurn, newSliceBattle, playCard, type SliceBattle } from '../src/slice/battle';
import { bestAction } from '../src/slice/bot';

const memStore = (): Store & { m: Map<string, string> } => {
  const m = new Map<string, string>();
  return { m, getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
};
const sample = (over: Partial<RunSave> = {}): RunSave => ({ v: SAVE_VERSION, seed: 7, asc: 2, daily: null, runId: 'r', actI: 1, rowI: 3, picked: [[0, 0, 1], [2], []], squad: [{ t: 'K' }], deck: ['advance'], parts: [], gold: 40, won: 6, stage: 9, refined: [], eventBag: [], rng: 12345, at: 'map', ...over });

/** 저장 안전망 (D-529): 사본 · 깨진 원본 보관 · 판 번호 이관 · 쓰기 실패 */
describe('저장 안전망 (D-529)', () => {
  it('본 키가 깨지면 원본을 .corrupt에 남기고 마지막 좋은 사본으로 되돌린다', () => {
    const st = memStore();
    writeSave(st, sample({ gold: 10 }));
    writeSave(st, sample({ gold: 20 })); // 앞 것이 사본이 된다
    expect(JSON.parse(st.m.get(SAVE_KEY + BAK)!).gold).toBe(10);
    st.m.set(SAVE_KEY, '{"v":3,"seed":'); // 쓰다 끊긴 저장
    expect(readSave(st)?.gold).toBe(10);
    expect(st.m.get(SAVE_KEY + CORRUPT)).toBe('{"v":3,"seed":');
    expect(JSON.parse(st.m.get(SAVE_KEY)!).gold).toBe(10); // 본 키도 되돌려 둔다
  });
  it('기록(진행)이 깨져도 빈 기록으로 덮어쓰지 않는다 — 사본이 없으면 원본을 남기고 나서야 쓴다', () => {
    const st = memStore();
    const m = { ...emptyMeta(), runs: 9, storyCleared: 2 };
    writeMeta(st, m);
    writeMeta(st, { ...m, runs: 10 });
    st.m.set(META_KEY, '{깨진');
    expect(readMeta(st).runs).toBe(9);
    expect(st.m.get(META_KEY + CORRUPT)).toBe('{깨진');
    // 사본도 없는 경우: 읽기는 빈 기록이지만 덮어쓰기 전에 원본이 남는다
    const st2 = memStore();
    st2.m.set(META_KEY, '{"runs":44,');
    expect(readMeta(st2).runs).toBe(0);
    writeMeta(st2, emptyMeta());
    expect(st2.m.get(META_KEY + CORRUPT)).toBe('{"runs":44,');
  });
  it('깨진 원본을 남기지 못하면 덮어쓰지 않고 알린다', () => {
    const st = memStore();
    st.m.set(SAVE_KEY, '{oops');
    const warned: string[] = [];
    setSaveGuard({ warn: () => warned.push('w') });
    const full: Store = { ...st, setItem: (k, v) => { if (k.endsWith(CORRUPT)) throw new Error('full'); st.setItem(k, v); } };
    expect(writeSave(full, sample())).toBe(false);
    expect(st.m.get(SAVE_KEY)).toBe('{oops');
    expect(warned).toEqual(['w']);
    setSaveGuard({});
  });
  it('이관 사슬: 판 2 → 3, 판 1 · 판 번호 없음 · 더 새 판은 버린다 · 기록 판 0 → 1', () => {
    const v2 = { ...sample(), v: 2 };
    expect(migrateSave(v2)).toEqual({ ...v2, v: 3 });
    expect(migrateSave({ ...sample(), v: 1 })).toBeNull();
    expect(migrateSave({ ...sample(), v: undefined })).toBeNull();
    expect(migrateSave({ ...sample(), v: SAVE_VERSION + 1 })).toBeNull();
    const st = memStore();
    st.m.set(SAVE_KEY, JSON.stringify(v2));
    expect(readSave(st)?.v).toBe(SAVE_VERSION);
    expect(migrateMeta({ runs: 3 })).toEqual({ runs: 3, mv: 1 });
    expect(migrateMeta({ runs: 3, mv: 99 })).toBeNull();
    const st2 = memStore();
    st2.m.set(META_KEY, JSON.stringify({ ...emptyMeta(), mv: undefined, runs: 5 }));
    expect(readMeta(st2).runs).toBe(5);
  });
  it('더 새 판의 저장 · 기록은 고치지도 덮어쓰지도 지우지도 않는다 (코드 리뷰 10)', () => {
    const st = memStore();
    writeSave(st, sample({ gold: 10 }));
    writeSave(st, sample({ gold: 20 })); // 사본 = 10
    const newer = JSON.stringify({ ...sample({ gold: 99 }), v: SAVE_VERSION + 1 });
    st.m.set(SAVE_KEY, newer);
    expect(readSave(st)).toBeNull();
    expect(newerSaveFound()).toBe(true);
    expect(st.m.get(SAVE_KEY)).toBe(newer); // 사본으로 되돌리지 않는다
    expect(st.m.has(SAVE_KEY + CORRUPT)).toBe(false);
    expect(writeSave(st, sample({ gold: 30 }))).toBe(false);
    expect(st.m.get(SAVE_KEY)).toBe(newer);
    expect(JSON.parse(st.m.get(SAVE_KEY + BAK)!).gold).toBe(10); // 사본도 그대로
    clearSave(st);
    expect(st.m.get(SAVE_KEY)).toBe(newer);
    // 기록도 같다
    const m = JSON.stringify({ ...emptyMeta(), runs: 77, mv: 99 });
    writeMeta(st, { ...emptyMeta(), runs: 3 });
    writeMeta(st, { ...emptyMeta(), runs: 4 });
    st.m.set(META_KEY, m);
    expect(readMeta(st).runs).toBe(0);
    writeMeta(st, { ...emptyMeta(), runs: 5 });
    expect(st.m.get(META_KEY)).toBe(m);
    expect(JSON.parse(st.m.get(META_KEY + BAK)!).runs).toBe(3);
    expect(st.m.has(META_KEY + CORRUPT)).toBe(false);
  });
  it('가득 차면 기록(텔레메트리)부터 비우고 한 번 더 — 그래도 안 되면 한 번 알린다', () => {
    const st = memStore();
    let room = true;
    const quota: Store = { ...st, setItem: (k, v) => { if (!room && k === SAVE_KEY) throw new DOMException('full', 'QuotaExceededError'); st.setItem(k, v); } };
    telemetryStore(st);
    for (let i = 0; i < 60; i++) track('x', { i });
    st.m.set(TELEMETRY_KEY, '[1]');
    let warned = 0;
    // 기록을 비우면 자리가 생긴다
    setSaveGuard({ evict: () => { telemetryShed(); room = true; }, warn: () => warned++ });
    room = false;
    expect(writeSave(quota, sample())).toBe(true);
    expect(st.m.has(TELEMETRY_KEY)).toBe(false);
    expect(telemetryAll().length).toBeLessThan(60);
    // 비워도 자리가 없으면 false + 알림 한 번, 앞 저장은 그대로
    setSaveGuard({ evict: () => telemetryShed(), warn: () => warned++ });
    room = false;
    expect(writeSave(quota, sample({ gold: 99 }))).toBe(false);
    expect(warned).toBe(1);
    expect(readSave(st)?.gold).toBe(40);
    setSaveGuard({});
    telemetryStore(null);
  });
});

/** 대국 중 저장 (D-529): 엔진 상태만 남기면 같은 수를 두었을 때 같은 판이 된다 */
describe('대국 중 저장 · 이어하기 결정론 (D-529)', () => {
  const squad = [{ t: 'K' }, { t: 'R' }, { t: 'N' }, { t: 'P' }, { t: 'P' }] as never;
  const deck = ['advance', 'leap', 'kingStep', 'order', 'advance', 'leap', 'advance', 'order'] as never;
  /** 보통 봇으로 n턴 (같은 판이면 같은 수) */
  const turns = (b: SliceBattle, n: number): void => {
    for (let t = 0; t < n && b.s.winner === null; t++) {
      for (let g = 0; g < 20; g++) {
        const a = bestAction(b, 'greedy');
        if (!a || typeof playCard(b, a.i, a.pieceId, a.to) === 'string' || b.s.winner !== null) break;
      }
      if (b.s.winner === null) endTurn(b, true);
    }
  };
  it('턴 끝 저장 → 읽기 → 이어 두면 저장하지 않은 판과 끝까지 같다', () => {
    const live = newSliceBattle(squad, ['K', 'P', 'P', 'N', 'B'], deck, 4242, { depth: 3 });
    turns(live, 2);
    expect(live.s.winner).toBeNull();
    const st = memStore();
    writeSave(st, sample({ at: 'battle', node: 0, fight: { b: live, rng: 777, stage: 10, bet: null, clutched: false } }));
    const back = readSave(st)!.fight!;
    expect(back.rng).toBe(777);
    expect(JSON.stringify(back.b)).toBe(JSON.stringify(live));
    turns(live, 6);
    turns(back.b, 6);
    expect(back.b.turn).toBeGreaterThan(2);
    expect(JSON.stringify(back.b)).toBe(JSON.stringify(live));
  });
  it('턴 중간(카드를 낸 뒤) 저장도 되감기 사진(snap)까지 같이 돌아온다', () => {
    const live = newSliceBattle(squad, ['K', 'P', 'N'], deck, 99, {});
    const a = bestAction(live, 'greedy');
    if (a) playCard(live, a.i, a.pieceId, a.to);
    const st = memStore();
    writeSave(st, sample({ at: 'battle', node: 0, fight: { b: live, rng: 1, stage: 1 } }));
    const back = readSave(st)!.fight!.b;
    expect(back.snap).toBe(live.snap);
    expect(back.ap).toBe(live.ap);
    expect(back.hand).toEqual(live.hand);
  });
  it('턴 끝을 연출 전에 저장하면 이어 갈 때 그 턴을 다시 두지 못한다 (코드 리뷰 4 — 공짜 되감기 막기)', () => {
    const live = newSliceBattle(squad, ['K', 'P', 'P', 'N', 'B', 'R'], deck, 5150, { depth: 3 });
    turns(live, 1);
    const a = bestAction(live, 'greedy');
    if (a) playCard(live, a.i, a.pieceId, a.to);
    const turn0 = live.turn;
    const hand0 = JSON.stringify(live.hand);
    const rites0 = live.falls.length; // 연출(폐기 의식)은 아직 — main.ts가 ritesDone을 담는다
    const r = endTurn(live, true);
    expect(r).not.toBe('warn');
    expect(live.s.winner).toBeNull();
    // main.ts onEndInner: endTurn 바로 뒤 · 연출 전 saveFight({ stand: true })
    const st = memStore();
    writeSave(st, sample({ at: 'battle', node: 0, fight: { b: live, rng: 3, stage: 4, rites: rites0, stand: true } }));
    // 연출 중 앱이 죽었다 → 다시 켜서 이어 간다
    const back = readSave(st)!.fight!;
    expect(back.b.turn).toBe(turn0 + 1);
    expect(JSON.stringify(back.b.hand)).not.toBe(hand0);
    expect(JSON.stringify(back.b)).toBe(JSON.stringify(live));
    expect(fightPending(back)).toEqual({ rites: rites0, stand: true });
    // 이어 둔 판은 저장하지 않은 판과 끝까지 같다 (결정론)
    turns(live, 4);
    turns(back.b, 4);
    expect(JSON.stringify(back.b)).toBe(JSON.stringify(live));
    // 옛 저장(rites · stand 없음)은 의식을 다시 틀지 않는다
    expect(fightPending({ b: live, rng: 1, stage: 1 })).toEqual({ rites: live.falls.length, stand: false });
  });
  it('엔진이 대국을 끝낸 판은 연출 앞에서 바로 정산한다 (D-537 — 이긴 · 진 판을 연출 중 앱 죽이기로 물리지 못하게)', () => {
    // 고르기 규칙: 이긴 판 = 끝난 판 그대로 · 진 판 + 판 되감기 = 끝난 판 그대로(이어 가면 되감기 장면) · 여벌 = 대국 처음부터 · 없으면 기록
    expect(settledEnd({ winner: 0, rewinds: 0, revive: 0, inRun: true })).toBe('fight');
    expect(settledEnd({ winner: 1, rewinds: 1, revive: 0, inRun: true })).toBe('fight');
    expect(settledEnd({ winner: 1, rewinds: 0, revive: 2, inRun: true })).toBe('spare');
    expect(settledEnd({ winner: 1, rewinds: 0, revive: 0, inRun: true })).toBe('record');
    expect(settledEnd({ winner: 1, rewinds: 0, revive: 0, inRun: false })).toBe('none');
    // 이긴 판: 끝난 판이 그대로 돌아온다 (이어 가면 판이 선 뒤 보상 정산)
    const won = newSliceBattle(squad, ['K', 'P', 'N'], deck, 31, {});
    won.s.winner = 0;
    const st = memStore();
    writeSave(st, sample({ at: 'battle', node: 0, fight: { b: won, rng: 1, stage: 1, rites: 0 } }));
    expect(readSave(st)!.fight!.b.s.winner).toBe(0);
    // 진 판 · 여벌 있음: 대국 처음부터 · 여벌 하나 적게 (판 저장 없음)
    writeSave(st, sample({ at: 'battle', node: 0, charms: { revive: 0, rewind: 1 } }));
    const spare = readSave(st)!;
    expect(spare.fight).toBeUndefined();
    expect(spare.charms?.revive).toBe(0);
    // 진 판 · 여벌 없음: 출하 끝을 기록하고 저장을 지운다 — 다시 켜도 이어 갈 판이 없다
    writeMeta(st, emptyMeta());
    writeSave(st, sample({ at: 'battle', node: 0, fight: { b: won, rng: 1, stage: 1 } }));
    const r = commitRunEnd(st, 'run-loss', { cleared: false, act: 1, won: 0, asc: 0, daily: null, mode: 'story', chapter: 0 });
    expect(r?.after.runs).toBe(1);
    expect(readSave(st)).toBeNull();
    expect(commitRunEnd(st, 'run-loss', { cleared: false, act: 1, won: 0, asc: 0, daily: null, mode: 'story', chapter: 0 })).toBeNull();
  });
  it('대국 중 저장이 모자라면 그 칸만 버리고 대국 처음부터 (출하는 살린다)', () => {
    const st = memStore();
    st.m.set(SAVE_KEY, JSON.stringify(sample({ at: 'battle', node: 1, fight: { b: { s: {} }, rng: 1, stage: 1 } as never })));
    const sv = readSave(st)!;
    expect(sv.at).toBe('battle');
    expect(sv.fight).toBeUndefined();
  });
});
