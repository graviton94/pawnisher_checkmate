import { describe, expect, it } from 'vitest';
import { attackTargets, legalMoves } from '../src/engine/rules';
import type { BattleState, FormId, Piece, PieceType, Side } from '../src/engine/types';

/** 이형 기물 행마 · 공격 (D-481, GDD 21장 §1) — 착지는 빈 칸만, 공격은 착지 칸 기준 */
const mk = (id: number, type: PieceType, side: Side, x: number, y: number, form?: FormId): Piece => ({ id, type, side, x, y, hp: 10, maxHp: 10, atk: 5, def: 0, shield: 0, moved: true, ...(form ? { form } : {}) });
const board = (pieces: Piece[], w = 8, h = 8): BattleState => ({ width: w, height: h, pieces, rules: { collapseStart: null, collapseInterval: 0, checkmate: false, foresight: 0 } } as unknown as BattleState);
const has = (ps: { x: number; y: number }[], x: number, y: number) => ps.some((p) => p.x === x && p.y === y);

describe('이형 기물 (D-481)', () => {
  it('대포: 룩처럼 미끄러지고, 딱 한 기물을 넘어 그 뒤 첫 적만 친다', () => {
    const c = mk(1, 'R', 1, 0, 0, 'cannon');
    const screen = mk(2, 'P', 1, 0, 2); // 같은 편도 받침이 된다
    const foe = mk(3, 'P', 0, 0, 5);
    const near = mk(4, 'P', 0, 3, 0); // 받침 없이 바로 보이는 적은 못 친다
    const s = board([c, screen, foe, near]);
    expect(has(legalMoves(s, c), 0, 1)).toBe(true);
    expect(has(legalMoves(s, c), 0, 2)).toBe(false);
    const t = attackTargets(s, c).map((p) => p.id);
    expect(t).toContain(3);
    expect(t).not.toContain(4);
  });
  it('낙타: (3,1) 도약 — 가운데 기물을 무시하고, 그 칸들을 친다', () => {
    const m = mk(1, 'N', 1, 3, 3, 'camel');
    const block = mk(2, 'P', 0, 4, 3);
    const foe = mk(3, 'P', 0, 6, 4);
    const s = board([m, block, foe]);
    const mv = legalMoves(s, m);
    expect(has(mv, 4, 6)).toBe(true);
    expect(has(mv, 4, 5)).toBe(false); // 나이트 칸은 아니다
    expect(attackTargets(s, m).map((p) => p.id)).toEqual([3]);
  });
  it('메뚜기: 처음 만난 기물 바로 뒤 빈 칸으로만 뛰고, 둘레를 친다', () => {
    const g = mk(1, 'Q', 1, 0, 0, 'hopper');
    const hurdle = mk(2, 'P', 0, 0, 3);
    const s = board([g, hurdle]);
    const mv = legalMoves(s, g);
    expect(mv).toEqual([{ x: 0, y: 4 }]);
    const landed = board([{ ...g, x: 0, y: 4 }, hurdle]);
    expect(attackTargets(landed, { ...g, x: 0, y: 4 }).map((p) => p.id)).toEqual([2]);
  });
  it('대주교 = 비숍 + 나이트, 총독 = 룩 + 나이트', () => {
    const a = mk(1, 'B', 1, 3, 3, 'archbishop');
    const ch = mk(2, 'R', 1, 0, 7, 'chancellor');
    const s = board([a, ch]);
    const am = legalMoves(s, a);
    expect(has(am, 5, 5)).toBe(true); // 사선
    expect(has(am, 4, 5)).toBe(true); // 나이트
    expect(has(am, 3, 5)).toBe(false); // 곧은 줄은 아니다
    const cm = legalMoves(s, ch);
    expect(has(cm, 0, 3)).toBe(true); // 룩 줄
    expect(has(cm, 1, 5)).toBe(true); // 나이트
    expect(has(cm, 1, 6)).toBe(false); // 사선은 아니다
  });
  it('이형이 없으면 바탕 기물 그대로', () => {
    const r = mk(1, 'R', 1, 0, 0);
    const s = board([r, mk(2, 'P', 0, 0, 3)]);
    expect(attackTargets(s, r).map((p) => p.id)).toEqual([2]);
  });
});

describe('이형 기물 등장 · 해금 (D-481)', () => {
  it('첫째 왕관 1막 검문에 이 왕관의 이형이 적으로 나오고, 일반 대국에는 2막부터', async () => {
    const { battleFor } = await import('../src/slice/run');
    const { Rng } = await import('../src/engine/rng');
    const { FORMS } = await import('../src/data/forms');
    const check = battleFor(1, 'check', new Rng(3), 0);
    expect(check.forms?.length).toBe(1);
    expect(FORMS[check.forms![0]].chapter).toBe(0);
    expect(check.enemy).toContain(FORMS[check.forms![0]].base);
    expect(battleFor(1, 'battle', new Rng(3), 0).forms).toBeUndefined();
    // 둘째 왕관부터 메뚜기 — 첫째 왕관에는 안 나온다
    for (let s = 0; s < 30; s++) for (const k of ['battle', 'check', 'boss'] as const) expect(battleFor(3, k, new Rng(s), 0).forms ?? []).not.toContain('hopper');
  });
  it('새 대국에서 이형 적은 이형 행마를 쓰고, 왕관을 깨면 그 이형이 해금된다', async () => {
    const { newSliceBattle } = await import('../src/slice/battle');
    const { recordRun, emptyMeta } = await import('../src/slice/save');
    const b = newSliceBattle([{ t: 'K' }, { t: 'R', form: 'cannon' }] as never, ['K', 'N', 'P'], ['advance'], 9, { forms: ['camel'] });
    expect(b.s.pieces.find((p) => p.side === 1 && p.type === 'N')?.form).toBe('camel');
    expect(b.s.pieces.find((p) => p.side === 0 && p.type === 'R')?.form).toBe('cannon');
    const m = recordRun(emptyMeta(), { cleared: true, act: 4, won: 15, asc: 0, daily: null, mode: 'story', chapter: 0, ending: 'throne' } as never);
    expect(m.unlocked).toEqual(expect.arrayContaining(['form:cannon', 'form:camel']));
    expect(m.unlocked).not.toContain('form:hopper');
  });
});
