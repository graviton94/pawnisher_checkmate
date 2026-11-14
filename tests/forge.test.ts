import { describe, expect, it } from 'vitest';
import { braceLeft, braceMax, crewMaxHp, mostHurt, repairOne, type Squad } from '../src/slice/battle';
import { FORGE } from '../src/slice/cards';
import { SERVICE_CARDS } from '../src/data/hud';
import { splitDesc } from '../src/slice/desc';

/** 작업대 수리 · 보강 (피드백 #17 · #19, D-503) */
describe('작업대 수리 — 하나를 골라 가득 (#17)', () => {
  const squad = (): Squad[] => [{ t: 'K', hp: 60 }, { t: 'N', hp: 10 }, { t: 'P', hp: 20 }];

  it('고른 분대원만 HP 가득, 나머지는 그대로', () => {
    const s = repairOne(squad(), 2, FORGE.repairOne);
    expect(s[2].hp).toBe(crewMaxHp(s[2]));
    expect(s[0].hp).toBe(60);
    expect(s[1].hp).toBe(10);
  });

  it('봇 · 시뮬은 잃은 HP가 가장 큰 분대원을 고친다', () => {
    const s = squad();
    const lost = s.map((u) => crewMaxHp(u) - (u.hp ?? 0));
    expect(mostHurt(s)).toBe(lost.indexOf(Math.max(...lost)));
    expect(mostHurt(s.map((u) => ({ ...u, hp: crewMaxHp(u) })))).toBe(-1);
  });

  it('카드 글이 실제 효과와 같다 (HP 가득 — 분대원 하나)', () => {
    const d = splitDesc(SERVICE_CARDS.repair.desc(Math.round(FORGE.repairOne * 100)));
    expect(d.fx).toBe('HP 가득');
    expect(d.cond).toBe('분대원 하나');
  });
});

describe('작업대 보강 — 버팀 (#19)', () => {
  it('보강 = 버팀 최대 · 남은 수 둘 다 +1 (출하 내내) — 카드 글 수치와 같다', () => {
    const u: Squad = { t: 'N', quirk: 'stubborn', doorsSpent: 2 };
    const after: Squad = { ...u, doors: (u.doors ?? 0) + FORGE.braceDoors };
    expect(braceMax(after)).toBe(braceMax(u) + FORGE.braceDoors);
    expect(braceLeft(after)).toBe(braceLeft(u) + FORGE.braceDoors);
    const d = splitDesc(SERVICE_CARDS.brace.desc(FORGE.braceDoors));
    expect(d.fx).toBe(`버팀 +${FORGE.braceDoors} · 출하 내내`);
    expect(d.cond).toBe('분대원 하나');
    expect(d.say).toMatch(/쓰러질 피해/);
  });
});
