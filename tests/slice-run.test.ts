import { describe, expect, it } from 'vitest';
import { buildRun, INTRO } from '../src/slice/run';
import { newSliceBattle } from '../src/slice/battle';
import { START_COMMANDS } from '../src/slice/cards';

describe('출하 지도 (D-168)', () => {
  it('3막 · 1막은 입문 · 연마로 시작 · 막마다 검문 → 반장으로 끝', () => {
    const run = buildRun(7);
    expect(run).toHaveLength(3);
    expect(run[0].rows[0][0].battle).toBe(INTRO[0]);
    expect(run[0].rows[1][0].battle).toBe(INTRO[1]);
    for (const a of run) {
      expect(a.rows.at(-2)![0].kind).toBe('check');
      expect(a.rows.at(-1)![0].kind).toBe('boss');
      expect(a.rows.at(-1)![0].battle!.reward).toBe(a.act === 3 ? 'end' : 'part');
    }
  });
  it('갈림길은 2~3개, 대국 하나는 반드시 · 고물상 · 작업대는 막마다 둘까지', () => {
    for (let seed = 1; seed < 40; seed++)
      for (const a of buildRun(seed)) {
        const forks = a.rows.filter((r) => r.length > 1);
        expect(forks.length).toBe(a.act === 1 ? 3 : 4);
        for (const r of forks) {
          expect(r.length).toBeGreaterThanOrEqual(2);
          expect(r.length).toBeLessThanOrEqual(3);
          expect(r.some((n) => n.kind === 'battle')).toBe(true);
        }
        expect(a.rows.flat().filter((n) => n.kind === 'shop').length).toBeLessThanOrEqual(2);
        expect(a.rows.flat().filter((n) => n.kind === 'forge').length).toBeLessThanOrEqual(2);
      }
  });
  it('막이 깊을수록 적 HP 배율이 오르고, 다듬은 카드는 태엽 −1', () => {
    const run = buildRun(3);
    const b3 = run[2].rows.at(-1)![0].battle!;
    const b = newSliceBattle([{ t: 'K' }, { t: 'P' }], b3.enemy, START_COMMANDS, 1, { enemyHp: b3.enemyHp, refined: ['advance'] });
    const q = b.s.pieces.find((p) => p.side === 1 && p.type === 'Q')!;
    expect(q.maxHp).toBeGreaterThan(60);
    b.hand = ['advance'];
    expect(b.refined).toContain('advance');
  });
});
