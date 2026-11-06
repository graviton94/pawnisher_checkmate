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
