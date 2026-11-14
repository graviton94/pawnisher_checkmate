import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { costOf, cardMoves, endTurn, liveIntents, newSliceBattle, playCard, previewPlay, rewindCost } from '../src/slice/battle';
import { HEAT_DEFAULT, SLICE } from '../src/slice/cards';
import { DRILLS, INTRO, type BattleDef } from '../src/slice/run';
import { GUIDE_PAGES } from '../src/data/opening';
import { TUT } from '../src/data/tutorial';

/** 입문 시험대 셋 (P-C D-502): 대본의 수마다 판이 약속한 대로 반응하는가 — 실제 열기 값으로 본다(시험대는 열기 없이 100%) */
const make = (d: BattleDef) => newSliceBattle([{ t: 'K' }, { t: 'P' }, { t: 'N' }], d.enemy, d.order!, 5, { width: d.w, height: d.h, enemyKingHp: d.kingHp, enemyHp: d.enemyHp, place: d.place, ordered: true, flatHeat: d.flat, calm: d.calm, script: d.script });
const id = (b: ReturnType<typeof make>, t: string) => b.s.pieces.find((p) => p.side === 0 && p.type === t)!.id;
const at = (b: ReturnType<typeof make>, x: number, y: number) => b.s.pieces.find((p) => p.x === x && p.y === y);

describe('입문 시험대 (P-C D-502)', () => {
  let saved: number[];
  beforeAll(() => { saved = SLICE.heat; SLICE.heat = [...HEAT_DEFAULT]; });
  afterAll(() => { SLICE.heat = saved; });

  it('자리를 짠 대로 선다 — 옮길 기물끼리 서로의 기본 자리를 막지 않는다', () => {
    for (const d of [...DRILLS, ...INTRO]) {
      const b = make(d);
      for (const q of d.place!) expect(at(b, q.x, q.y)?.type, `${d.title} ${q.t}@${q.x},${q.y}`).toBe(q.t);
      expect(b.s.heat).toBe(1);
    }
  });

  it('A 치는 칸: 적은 예고하지 않고, 폰 · 나이트 두 수가 모두 처치다 (두 칸 걸음은 점 — 승격 · 처치가 아니다)', () => {
    const b = make(DRILLS[0]);
    expect(b.intents).toEqual([]);
    expect(liveIntents(b)).toEqual([]);
    const two = previewPlay(b, 0, id(b, 'P'), { x: 1, y: 3 });
    expect(two?.events.some((e) => e.type === 'attack' && e.hits.length)).toBe(false);
    expect(typeof playCard(b, 0, id(b, 'P'), { x: 1, y: 2 })).toBe('object');
    expect(b.kills).toBe(1);
    const li = b.hand.indexOf('leap');
    expect(cardMoves(b, li, id(b, 'N'))).toContainEqual({ x: 2, y: 2 });
    expect(typeof playCard(b, li, id(b, 'N'), { x: 2, y: 2 })).toBe('object');
    expect(b.kills).toBe(2);
    expect(b.s.winner).toBeNull();
  });

  it('B 예고와 막기: 붉은 칸 위의 폰 · 킹 → 빠지며 치기(쓰러지지 않음) · 막기 → 태엽 1 남아 지휘 불가 → 두 공격 다 헛방', () => {
    const b = make(DRILLS[1]);
    const pawn = id(b, 'P');
    const king = id(b, 'K');
    expect(b.graze).toEqual(expect.arrayContaining([pawn, king]));
    const hp0 = b.s.pieces.filter((p) => p.side === 0).map((p) => p.hp);
    expect(typeof playCard(b, 0, pawn, { x: 1, y: 2 })).toBe('object');
    const foe = at(b, 2, 3)!;
    expect(foe.hp).toBeGreaterThan(0);
    expect(foe.hp).toBeLessThan(foe.maxHp);
    expect(typeof playCard(b, b.hand.indexOf('leap'), id(b, 'N'), { x: 4, y: 1 })).toBe('object');
    expect(b.ap).toBe(1);
    expect(costOf(b, b.hand.indexOf('order'))).toBe(2);
    endTurn(b, true);
    expect(b.turn).toBe(2);
    expect(b.s.pieces.filter((p) => p.side === 0).map((p) => p.hp)).toEqual(hp0);
  });

  it('C 킹 잡기: 체크 → 한 대 더 · 되감기 실습 환급은 정산에서 톱니를 깎지 않는다', () => {
    const b = make(INTRO[0]);
    expect(typeof playCard(b, 0, id(b, 'N'), { x: 4, y: 2 })).toBe('object');
    expect(b.s.pieces.find((p) => p.side === 1 && p.type === 'K')!.hp).toBe(1);
    // main.ts drillC: 되감기 한 번(b.rewinds −1) → 실습 환급(b.rewinds +1) — 시작 수는 그대로
    const start = 2;
    expect(rewindCost(start, start - 1 + 1, 0)).toBe(0);
  });

  it('안내서: 시험대 사이에 쓰는 쪽이 있고 과녁 색 이름이 화면과 같다', () => {
    for (const t of ['목표', '카드 → 기물 → 칸', '적의 예고', '체크']) expect(GUIDE_PAGES.some((g) => g.title === t), t).toBe(true);
    const all = JSON.stringify([GUIDE_PAGES, TUT]);
    expect(all).not.toMatch(/노란 과녁|붉은 과녁/);
  });
});
