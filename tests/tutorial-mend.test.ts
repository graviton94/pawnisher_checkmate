import { describe, expect, it } from 'vitest';
import { crewMaxHp, tutorialMend, type Squad } from '../src/slice/battle';

describe('입문 시험대 피해는 출하로 이어지지 않는다 (D-597)', () => {
  it('시험대 C에서 다친 나이트도 첫 실전엔 HP 가득 · 깨진 톱니 없이', () => {
    const before: Squad[] = [{ t: 'K', serial: 'k1' }, { t: 'N', serial: 'n1' }, { t: 'P', serial: 'p1' }] as Squad[];
    const after: Squad[] = [{ t: 'K', serial: 'k1', hp: 20 }, { t: 'N', serial: 'n1', hp: 8, kills: 1 }, { t: 'P', serial: 'p1', hp: 1, cracked: true }] as Squad[];
    const out = tutorialMend(before, after);
    expect(out.map((u) => u.hp)).toEqual(before.map((u) => crewMaxHp(u)));
    expect(out[1].kills).toBe(1); // 기록은 남는다
    expect(out[2].cracked).toBeFalsy();
    expect(out.length).toBe(3);
  });
});
