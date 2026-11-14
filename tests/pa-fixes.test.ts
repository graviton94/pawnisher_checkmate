import { describe, expect, it } from 'vitest';
import { Rng } from '../src/engine/rng';
import { livesOf, newSliceBattle, rewind, rewindCost } from '../src/slice/battle';
import { START_COMMANDS, isRefined } from '../src/slice/cards';
import { SLICE_EVENTS, type EventState } from '../src/slice/events';
import { claimOnce } from '../src/slice/once';
import { readSave, restoreDeck, resumeAt, writeSave, type RunSave, type Store } from '../src/slice/save';

/** 2026-11-14 플레이 후기 P-A 버그 묶음 (D-488) 회귀 테스트 */
const memStore = (): Store => {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
};
const base = (): RunSave => ({ v: 2, seed: 7, asc: 0, daily: null, runId: 'r', actI: 2, rowI: 5, picked: [[0], [0], [0, 0, 0, 0, 0, 1], []], squad: [{ t: 'K' }, { t: 'N', name: '박차' }], deck: ['advance', 'leap'], parts: [], gold: 90, won: 9, stage: 12, refined: [], eventBag: [], rng: 4242, at: 'map' });

describe('기록-1 보상 두 번 고르기', () => {
  it('같은 화면의 확정은 한 번만 — 두 번 눌러도 덱 +1', () => {
    const claim = claimOnce();
    const screen = {};
    const deck: string[] = [];
    const pick = (): void => { if (claim(screen)) deck.push('vent'); };
    pick();
    pick();
    expect(deck).toEqual(['vent']);
    // 새로 그린 화면(다른 뿌리)은 다시 받는다
    const next = {};
    if (claim(next)) deck.push('bulwark');
    expect(deck).toEqual(['vent', 'bulwark']);
  });
});

describe('P0-2 이긴 대국 저장 — 보상 화면부터 이어하기', () => {
  it('남은 보상이 저장 · 복원되고 이어하기 자리는 보상', () => {
    const st = memStore();
    const s: RunSave = { ...base(), at: 'reward', node: 1, pending: { earned: 44, overGold: 3, fallen: [{ t: 'P', name: '먼지투성이', cracked: true }], closeTier: 2 } };
    writeSave(st, s);
    const r = readSave(st)!;
    expect(r.pending).toEqual(s.pending);
    expect(resumeAt(r)).toBe('reward');
  });
  it('옛 저장은 그대로 — 지도 · 대국 처음부터, 남은 보상이 없는 reward는 대국부터', () => {
    expect(resumeAt(base())).toBe('map');
    expect(resumeAt({ ...base(), at: 'battle' })).toBe('battle');
    expect(resumeAt({ ...base(), at: 'reward' })).toBe('battle');
  });
});

describe('#4 입문 되감기 실습 환급', () => {
  it('실습으로 쓴 톱니를 돌려주면 대국 끝 정산에서 깎이지 않는다', () => {
    const b = newSliceBattle([{ t: 'K' }, { t: 'P' }], ['K', 'P'], START_COMMANDS, 3, { rewindCharms: 1 });
    const atStart = b.rewinds;
    b.snap = JSON.stringify({ ...b, snap: '' });
    const back = rewind(b);
    if (typeof back === 'string') throw new Error(back);
    back.rewinds += 1; // 부관: 「이번 한 번은 돌려 드리겠습니다」 (시작 수는 그대로)
    expect(rewindCost(atStart, back.rewinds, back.rewindFree ?? 0)).toBe(0);
    // 실습 아닌 되감기는 그대로 하나를 깎는다
    expect(rewindCost(atStart, atStart - 1, 0)).toBe(1);
  });
});

describe('#27 킹 생명 · #24 생명 표시', () => {
  it('「왕관을 써 본다」의 킹 생명 +1이 대국에 실제로 들어간다', () => {
    const s: EventState = { squad: [{ t: 'K' }, { t: 'P', name: '먼지투성이' }], deck: [...START_COMMANDS], refined: [], gold: 0 };
    const c = SLICE_EVENTS.crownAltar.choices.find((x) => x.label === '왕관을 써 본다')!;
    c.apply(s, new Rng(1));
    const b = newSliceBattle(s.squad, ['K', 'P'], START_COMMANDS, 3);
    const kingId = b.squadIds[0];
    expect(b.s.doorIds?.filter((x) => x === kingId)).toHaveLength(1);
  });
  it('분대 카드의 생명 수 = 대국의 생명 수 (맹세 포함)', () => {
    const squad = [{ t: 'K' as const, doors: 1 }, { t: 'P' as const }, { t: 'N' as const, quirk: 'stubborn' as const }, { t: 'B' as const }];
    const b = newSliceBattle(squad, ['K', 'P'], START_COMMANDS, 3, { parts: ['oath'] });
    squad.forEach((u, i) => expect(livesOf(u, ['oath']), u.t).toBe((b.s.doorIds ?? []).filter((x) => x === b.squadIds[i]).length));
    expect(livesOf({ t: 'B' }, [])).toBe(0);
  });
});

describe('#20 다듬기 → 녹 · 빼기 → 저장 → 불러오기', () => {
  it('다듬은 카드가 사라진 뒤 다시 열어도 남은 같은 카드는 다듬어지지 않은 채 다듬기 목록에 남는다', () => {
    const st = memStore();
    // 도약 두 장 중 한 장을 다듬었고(refined 기록), 그 「+」 한 장이 나중에 빠졌다
    writeSave(st, { ...base(), deck: ['advance', 'leap'], refined: ['leap'] });
    const deck = restoreDeck(readSave(st)!);
    expect(deck).toEqual(['advance', 'leap']);
    expect(deck.some(isRefined)).toBe(false);
  });
});
