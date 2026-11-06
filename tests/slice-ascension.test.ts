import { describe, expect, it } from 'vitest';
import { ASC_NUM, ASCENSION, battleFor, FINAL_BOSS } from '../src/slice/run';
import { newSliceBattle } from '../src/slice/battle';
import { START_COMMANDS } from '../src/slice/cards';
import { Rng } from '../src/engine/rng';

const squad = [{ t: 'K' as const }, { t: 'P' as const }, { t: 'N' as const }];

describe('승급 13단 — 규격판 조항 (D-273)', () => {
  it('조항은 열세 개 · 저마다 이름 · 새긴 글 · 효과가 있다', () => {
    expect(ASCENSION).toHaveLength(13);
    for (const a of ASCENSION) expect(a.name && a.law && a.desc).toBeTruthy();
  });
  it('조항 6: 반장 · 도금왕이 두꺼워지고, 조항 13: 도금왕이 한 겹 더', () => {
    const b5 = battleFor(1, 'boss', new Rng(3), 5);
    const b6 = battleFor(1, 'boss', new Rng(3), 6);
    expect(b6.kingHp).toBeCloseTo(b5.kingHp * ASC_NUM.bossHp);
    expect(FINAL_BOSS(13).kingHp).toBeGreaterThan(FINAL_BOSS(12).kingHp);
  });
  it('조항 12: 검문 적 하나가 정예 (HP ×2)', () => {
    const d = battleFor(2, 'check', new Rng(4), 12);
    expect(d.eliteOne).toBe(true);
    const plain = newSliceBattle(squad, d.enemy, START_COMMANDS, 9);
    const b = newSliceBattle(squad, d.enemy, START_COMMANDS, 9, { eliteOne: true });
    const e = b.s.pieces.find((p) => p.elite)!;
    expect(e.side).toBe(1);
    expect(e.type).not.toBe('K');
    expect(e.maxHp).toBe(plain.s.pieces.find((p) => p.id === e.id)!.maxHp * 2);
  });
  it('조항 9: 적 공격 배율', () => {
    const a = newSliceBattle(squad, ['K', 'R'], START_COMMANDS, 9);
    const b = newSliceBattle(squad, ['K', 'R'], START_COMMANDS, 9, { atkMul: ASC_NUM.enemyAtk });
    expect(b.atkK).toBeCloseTo(a.atkK! * ASC_NUM.enemyAtk);
  });
});

import { endTurn as endT } from '../src/slice/battle';
import { BOSS_NUM, BOSS_PAIRS } from '../src/slice/cards';
import { buildRun } from '../src/slice/run';

const crew = [{ t: 'K' as const }, { t: 'R' as const }, { t: 'N' as const }, { t: 'P' as const }];

describe('새 반장 셋 (D-274)', () => {
  it('막마다 반장은 둘 중 하나 · 처음 출하는 처음 반장', () => {
    const seen = new Set<string>();
    for (let s = 1; s <= 40; s++) for (const [i, a] of buildRun(s).slice(0, 3).entries()) {
      const r = a.rows.at(-1)![0].battle!.bossRule!;
      expect(BOSS_PAIRS[i]).toContain(r);
      seen.add(r);
    }
    expect(seen.size).toBe(6);
    expect(buildRun(5, 0, true).slice(0, 3).map((a) => a.rows.at(-1)![0].battle!.bossRule)).toEqual(['plate', 'spawn', 'thorns']);
  });
  it('검수: 첫 턴부터 가장 센 내 기물에 도장', () => {
    const b = newSliceBattle(crew, ['K', 'P', 'P'], START_COMMANDS, 3, { boss: true, bossRule: 'inspect' });
    const strongest = b.s.pieces.filter((p) => p.side === 0 && p.type !== 'K').sort((x, y) => y.atk - x.atk || x.id - y.id)[0];
    expect(b.stampId).toBe(strongest.id);
  });
  it('자석: 끌려갈 기물을 예고하고, 적 차례 끝에 한 칸 끌려간다', () => {
    const b = newSliceBattle(crew, ['K', 'P'], START_COMMANDS, 3, { boss: true, bossRule: 'magnet', width: 6, height: 6 });
    expect(b.pull).toBeTruthy();
    const { id, to } = b.pull!;
    const r = endT(b, true);
    if (r === 'warn') throw new Error('warn');
    const p = b.s.pieces.find((q) => q.id === id);
    const moved = r.events.some((e) => e.type === 'move' && e.pieceId === id && e.to.x === to.x && e.to.y === to.y);
    // 끌려갈 칸을 적이 먼저 차지했으면 끌려가지 않는다
    const blocked = b.s.pieces.some((q) => q.id !== id && q.x === to.x && q.y === to.y);
    if (p && b.s.winner === null) expect(moved || blocked).toBe(true);
    if (moved) expect([p!.x, p!.y]).toEqual([to.x, to.y]);
  });
  it('경보: 눈금이 차면 그 차례 적 공격이 오르고, 끝나면 되돌아간다', () => {
    const b = newSliceBattle(crew, ['K', 'R'], START_COMMANDS, 3, { boss: true, bossRule: 'alarm' });
    const rook = b.s.pieces.find((p) => p.side === 1 && p.type === 'R')!;
    const base = rook.atk;
    for (let i = 0; i < BOSS_NUM.alarmFull - 1 && b.s.winner === null; i++) { const r = endT(b, true); if (r === 'warn') break; }
    if (b.s.winner === null) {
      expect(b.alarmAtk).toBeTruthy();
      expect(b.s.pieces.find((p) => p.id === rook.id)?.atk).toBe(Math.round(base * BOSS_NUM.alarmMult));
      endT(b, true);
      const r2 = b.s.pieces.find((p) => p.id === rook.id);
      if (r2 && b.s.winner === null) expect(r2.atk).toBe(base);
    }
  });
});

import { QUIRKS } from '../src/slice/crew';
import { TRAIT } from '../src/slice/cards';

describe('적 특성 넷 · 기벽 넷 (D-275)', () => {
  it('기벽은 여덟 — 저마다 맞바꾸는 수치가 있다', () => {
    expect(Object.keys(QUIRKS)).toHaveLength(8);
    const b = newSliceBattle([{ t: 'K' }, { t: 'R', quirk: 'heavy' }, { t: 'R' }], ['K', 'P'], START_COMMANDS, 3);
    const [heavy, plain] = b.s.pieces.filter((p) => p.side === 0 && p.type === 'R');
    expect(heavy.maxHp).toBeGreaterThan(plain.maxHp);
    expect(heavy.atk).toBeLessThan(plain.atk);
  });
  it('특성은 그 유형의 적에게만 수치 하나', () => {
    const a = newSliceBattle(squad, ['K', 'N', 'B', 'Q', 'P'], START_COMMANDS, 5);
    const b = newSliceBattle(squad, ['K', 'N', 'B', 'Q', 'P'], START_COMMANDS, 5, { traits: ['knightShoe', 'bishopLens', 'queenCrown', 'pawnDrill'] });
    const f = (x: typeof a, t: string) => x.s.pieces.find((p) => p.side === 1 && p.type === t)!;
    expect(f(b, 'N').shield).toBe(f(a, 'N').shield + TRAIT.knightShoe);
    expect(f(b, 'B').atk).toBeGreaterThan(f(a, 'B').atk);
    expect(f(b, 'Q').maxHp).toBeGreaterThan(f(a, 'Q').maxHp);
    expect(f(b, 'P').atk).toBeGreaterThan(f(a, 'P').atk);
  });
  it('2 · 3막 판에는 기물에 맞는 특성이 하나 더 붙는다', () => {
    const d = battleFor(3, 'check', new Rng(2));
    expect((d.traits ?? []).length).toBeGreaterThan(2);
  });
});
