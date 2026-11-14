import { describe, expect, it } from 'vitest';
import { emptyMeta, readMeta, readSave, recordRun, type Meta, type Store } from '../src/slice/save';
import { CHALLENGE_START, chapterLabel } from '../src/data/campaign';
import { UNLOCK_ORDER } from '../src/data/unlocks';
import { companionScene } from '../src/data/companion-scenes';
import { trueEndingCuts, promotionCuts, DEFEAT, TESTIMONY } from '../src/data/script';
const win = (m: Meta, chapter: 0 | 1 | 2 | 3, ending: 'throne' | 'depart' = 'throne') => recordRun(m, { cleared: true, act: 4, won: 17, asc: chapter, daily: null, mode: 'story', chapter, ending, crown: { chapter, runId: `pawn-${chapter}`, law: `law-${chapter}`, companions: ['alive'] } });
const storage = (value: unknown): Store => ({ getItem: () => JSON.stringify(value), setItem: () => {}, removeItem: () => {} });
const complete = () => win(win(win(win(emptyMeta(), 0), 1), 2), 3, 'depart');
describe('본편 1~4승천과 선택 도전 (D-451)', () => {
  it('새 폰 네 명의 완주로 진엔딩과 기본 콘텐츠가 열린다', () => {
    const first = win(emptyMeta(), 0), second = win(first, 1), third = win(second, 2), final = win(third, 3, 'depart');
    expect([first.storyCleared, second.storyCleared, third.storyCleared, final.storyCleared]).toEqual([1, 2, 3, 4]);
    expect(final.trueEnd).toBe(true);
    expect(final.challengeOpen).toBe(CHALLENGE_START);
    expect(UNLOCK_ORDER.every((id) => final.unlocked?.includes(id))).toBe(true);
    expect(final.crownedKings?.map((k) => k.runId)).toEqual(['pawn-0', 'pawn-1', 'pawn-2']);
  });
  it('앞 장 재관람과 미래 장 호출은 장 진행을 건너뛰지 않는다', () => {
    expect(win(emptyMeta(), 3, 'depart').storyCleared).toBe(0);
    expect(win(emptyMeta(), 3, 'depart').trueEnd).toBe(false);
    expect(win(win(win(emptyMeta(), 0), 1), 2, 'depart').storyCleared).toBe(2);
    expect(win(win(emptyMeta(), 0), 0).storyCleared).toBe(1);
    expect(win(emptyMeta(), 0, 'depart').storyCleared).toBe(0);
  });
  it('마지막에 왕이 되어도 본편 완주는 남고, 진엔딩은 다시 선택할 수 있다', () => {
    const bad = win(win(win(win(emptyMeta(), 0), 1), 2), 3);
    expect(bad.storyCleared).toBe(4); expect(bad.trueEnd).toBe(false);
    const good = win(bad, 3, 'depart');
    expect(good.trueEnd).toBe(true); expect(good.crownedKings).toEqual(bad.crownedKings);
  });
  it('도전은 도전 단계만 열며 본편이나 왕의 이력을 바꾸지 않는다', () => {
    const m = complete();
    const next = recordRun(m, { cleared: true, act: 4, won: 17, asc: CHALLENGE_START, mode: 'challenge', daily: null });
    expect(next.challengeOpen).toBe(CHALLENGE_START + 1);
    expect(next.challengeRecords?.[CHALLENGE_START]).toEqual({ attempts: 1, clears: 1 });
    expect(next.storyAttempts).toEqual(m.storyAttempts);
    expect([next.storyCleared, next.trueEnd, next.crownedKings]).toEqual([m.storyCleared, m.trueEnd, m.crownedKings]);
    const locked = recordRun(emptyMeta(), { cleared: true, act: 4, won: 17, asc: 13, mode: 'challenge', daily: null });
    expect(locked.storyCleared).toBe(0); expect(locked.challengeOpen).toBe(CHALLENGE_START);
  });
  it('오늘의 도전과 패배는 본편을 진행시키지 않는다', () => {
    const lost = recordRun(emptyMeta(), { cleared: false, act: 2, won: 3, asc: 0, mode: 'story', chapter: 0, ending: 'throne', daily: null });
    const day = recordRun(lost, { cleared: true, act: 4, won: 17, asc: 0, mode: 'daily', daily: '2026-11-11' });
    expect(day.storyCleared).toBe(0); expect(day.clears).toBe(1); expect(day.daily['2026-11-11'].cleared).toBe(true);
  });
  it('옛 13단/진엔딩은 보관하며 새 이야기를 보았다고 간주하지 않는다', () => {
    const m = readMeta(storage({ runs: 44, clears: 15, ascOpen: 13, trueEnd: true, unlocked: ['castle'], nemeses: [] }));
    expect(m.runs).toBe(44); expect(m.storyCleared).toBe(0); expect(m.trueEnd).toBe(false);
    expect(m.legacyStory).toEqual({ ascOpen: 13, trueEnd: true }); expect(m.unlocked).toEqual(['castle']); expect(m.challengeOpen).toBe(13);
  });
  it('이어하기가 다른 장의 전투 난도로 위장되지 않는다', () => {
    expect(readSave(storage({ v: 2, asc: 13, mode: 'story', chapter: 2, squad: [{ t: 'K' }] }))).toBeNull();
    expect(readSave(storage({ v: 2, asc: 13, squad: [{ t: 'K' }] }))).not.toBeNull();
  });
  it('약속은 실제 시리얼에 묶이고 죽은 동료는 결말에서 말하지 않는다', () => {
    const first = companionScene(0, [{ serial: 'P-1', name: '먼지투성이', t: 'P' }]);
    expect(first.promise?.serial).toBe('P-1');
    const company = { alive: [{ name: '구부러진 못', t: 'R' as const }], promised: { name: '먼지투성이', alive: false } };
    for (const cuts of [trueEndingCuts([], company), promotionCuts(0, '', '규정', '', company)]) {
      const who = cuts.flatMap((c) => c.lines).filter((l) => l.k === 's').map((l) => l.who);
      expect(who).not.toContain('먼지투성이');
      expect(who).toContain('구부러진 못');
    }
    // 부관 박차가 살아 있으면 결말에서 소리치는 이는 박차
    expect(promotionCuts(0, '', '규정', '', { alive: [{ name: '먼지투성이', t: 'P' }, { name: '박차', t: 'N' }] }).flatMap((c) => c.lines).some((l) => l.who === '박차')).toBe(true);
    expect(promotionCuts(0, '', '경비를 강화한다', '', { alive: [] }).flatMap((c) => c.lines).some((l) => l.k === 's' && l.who !== '용해 주조기')).toBe(false); // D-504: 기계음은 「용해 주조기」 명패 — 동료 대사만 빠진다
  });
  it('왕위 결정 증언은 네 승천이며 왕이 된 결말은 승천마다 속마음이 다르다', () => {
    expect(TESTIMONY).toHaveLength(4); expect(chapterLabel(3)).toContain('넷째 왕관');
    const mono = (ch: number) => promotionCuts(ch, '', '규정', '', { alive: [] })[2].lines.find((l) => l.k === 'm')?.t;
    expect(new Set([0, 1, 2].map(mono)).size).toBe(3);
    expect(JSON.stringify([DEFEAT, trueEndingCuts([]), promotionCuts(0, '', '경비 강화', '')])).not.toMatch(/열세|경고등이 꺼|공장이.*침묵|또 아홉째|부모|아이/);
  });
});

describe('원수의 유품 회수', () => {
  it('동료 인물을 반환하지 않고 기존 나사 가치만 반환한다', async () => {
    const { recoverHeirloom } = await import('../src/slice/director');
    const { CREW } = await import('../src/slice/crew');
    const n = { t: 'R' as const, name: '집행자', rank: 1, victims: ['먼지투성이'], heir: { t: 'P' as const, name: '먼지투성이', serial: 'old-P' } };
    expect(recoverHeirloom(n, 0)).toBe(CREW.heirloomScrews);
    expect(recoverHeirloom(n, 3)).toBe(0);
    expect(n.heir.serial).toBe('old-P');
  });
});

describe('서사 전달의 순서', () => {
  it('진엔딩: 욕망을 인정한 뒤 왕관을 톱니에 던지고, 하얀 땅으로 걸어 나간다', () => {
    const lines = trueEndingCuts([], { alive: [{ name: '박차', t: 'N' }] }).flatMap((c) => c.lines);
    const own = lines.findIndex((l) => l.who === '종이왕' && l.t.includes('원했다'));
    const throwIt = lines.findIndex((l) => l.k === 'n' && l.t.includes('톱니바퀴 틈새'));
    const land = lines.findIndex((l) => l.t.includes('하얀 땅'));
    expect(own).toBeGreaterThanOrEqual(0); expect(throwIt).toBeGreaterThan(own); expect(land).toBeGreaterThan(throwIt);
  });
  it('왕이 된 결말: 왕관을 쓴 뒤에 용해 주조가 켜지고, 규정을 새긴다', () => {
    const lines = promotionCuts(0, '', '흑 기물의 쇠는 더 두껍게 붓는다', '그는 닮아 갔다.', { alive: [{ name: '박차', t: 'N' }] }).flatMap((c) => c.lines);
    const crown = lines.findIndex((l) => l.t.includes('자신의 머리에 얹었다'));
    const melt = lines.findIndex((l) => l.t.includes('용해 주조'));
    const law = lines.findIndex((l) => l.t === '「흑 기물의 쇠는 더 두껍게 붓는다」');
    expect(crown).toBeGreaterThanOrEqual(0); expect(melt).toBeGreaterThan(crown); expect(law).toBeGreaterThan(melt);
  });
  it('일곱 욕망과 선대 왕의 실제 규정이 데이터에 남는다', async () => {
    const { BOSS_SINS, shadowCut } = await import('../src/data/script');
    expect(new Set(Object.values(BOSS_SINS)).size).toBe(7);
    expect(shadowCut(1, '흑 기물의 쇠를 두껍게 붓는다').lines.some((l) => l.t.includes('흑 기물의 쇠를 두껍게 붓는다'))).toBe(true);
  });
});

describe('새 분대의 기록 경계', () => {
  it('같은 분에 다시 시작해도 원부의 출하 ID가 겹치지 않는다', async () => {
    const { runIdentity } = await import('../src/data/campaign');
    expect(runIdentity('story', 0, 7, new Date('2026-11-11T00:00:00.001Z'))).not.toBe(runIdentity('story', 0, 7, new Date('2026-11-11T00:00:00.002Z')));
  });
});
