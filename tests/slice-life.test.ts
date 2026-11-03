import { describe, expect, it } from 'vitest';
import { crackOrScrap, crewMaxHp, mendSquad, overhaulSquad, REST } from '../src/slice/battle';

/** 목숨 둘 · 심장 톱니 (D-219) */
describe('심장 톱니', () => {
  const p = { t: 'P' as const, serial: '#P-1', name: '먼지투성이', hp: 0 };
  it('처음 쓰러지면 톱니 하나가 깨진 채 HP 50%로 돌아온다', () => {
    const r = crackOrScrap([p]);
    expect(r.scrapped).toHaveLength(0);
    expect(r.back[0].cracked).toBe(true);
    expect(r.back[0].hp).toBe(Math.round(crewMaxHp(p) * REST.reviveHp));
  });
  it('깨진 채 또 쓰러지면 폐기된다', () => {
    const r = crackOrScrap([{ ...p, cracked: true }]);
    expect(r.back).toHaveLength(0);
    expect(r.scrapped).toHaveLength(1);
  });
  it('킹은 목숨이 없다 (쓰러지면 대국이 끝난다)', () => {
    expect(crackOrScrap([{ t: 'K', serial: '#K-1', hp: 0 }]).scrapped).toHaveLength(1);
  });
  it('작업대 · 막이 바뀌면 깨진 톱니를 모두 새로 끼운다', () => {
    const m = mendSquad([{ ...p, hp: 5, cracked: true }, { t: 'B', serial: '#B-1', hp: 5 }]);
    expect(m.mended.map((u) => u.serial)).toEqual(['#P-1']);
    expect(m.squad.every((u) => !u.cracked)).toBe(true);
  });
  it('정비로 되살린 분대원은 톱니 하나만 가진 채 돌아온다', () => {
    const o = overhaulSquad([], [{ ...p, cracked: true }]);
    expect(o.revived && o.squad[0].cracked).toBe(true);
  });
});
