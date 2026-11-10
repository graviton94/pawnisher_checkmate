import { describe, expect, it } from 'vitest';
import { addNemesis, betterHighlight, dir, DIRECTOR, isCloseCall, settleBet } from '../src/slice/director';
import { clutchBoost, newSliceBattle, planEnemy, sacrificeCandidates, sacrificeSwap } from '../src/slice/battle';
import { START_COMMANDS } from '../src/slice/cards';
import { kingOf } from '../src/engine';

const squad = [{ t: 'K' as const }, { t: 'P' as const }, { t: 'P' as const }, { t: 'N' as const }, { t: 'B' as const }];

describe('심리 연출 감독 (D-178)', () => {
  it('큰 도움은 낮은 승급에서 크고, 승급이 오를수록 줄어 끝내 없어진다', () => {
    for (const key of ['clutch', 'sacrifice', 'closeCall', 'bounty'] as const) {
      const vals = [0, 1, 2, 3, 4, 5].map((a) => dir[key](a));
      for (let i = 1; i < vals.length; i++) expect(vals[i]).toBeLessThanOrEqual(vals[i - 1]);
    }
    expect(dir.clutch(5)).toBe(0);
    expect(dir.closeCall(5)).toBe(0);
    expect(dir.mercy(5, 99)).toBe(0);
  });
  it('보이지 않는 손: 같은 대국을 지기 전에는 꺼져 있다', () => {
    expect(dir.mercy(0, 0)).toBe(0);
    expect(dir.mercy(0, 1)).toBeGreaterThan(0);
    expect(dir.mercy(3, 1)).toBe(0);
    expect(dir.mercy(3, 2)).toBeGreaterThan(0);
  });
  it('사선: 킹 HP 15% 이하 · 분대원 폐기(두 번째 쓰러짐) · 마지막 한 수 중 하나', () => {
    expect(isCloseCall({ kingHp: 50, kingMax: 100, fell: 0, clutched: false })).toBe(false);
    expect(isCloseCall({ kingHp: 15, kingMax: 100, fell: 0, clutched: false })).toBe(true);
    expect(isCloseCall({ kingHp: 90, kingMax: 100, fell: 1, clutched: false })).toBe(true);
    expect(isCloseCall({ kingHp: 90, kingMax: 100, fell: 0, clutched: true })).toBe(true);
  });
  it('원수: 쓰러뜨린 적이 이름을 얻고, 같은 유형이 또 죽이면 단계가 오른다 (상한 있음)', () => {
    let list = addNemesis([], 'N', { t: 'P', name: '구부러진 못' }, 1);
    expect(list).toHaveLength(1);
    expect(list[0].name).toContain('구부러진 못');
    list = addNemesis(list, 'N', { t: 'B', name: '먼지투성이' }, 2);
    expect(list).toHaveLength(1);
    expect(list[0].rank).toBe(2);
    expect(list[0].heir?.name).toBe('먼지투성이');
    for (let i = 0; i < 5; i++) list = addNemesis(list, 'N', { t: 'P', name: `x${i}` }, i);
    expect(list[0].rank).toBe(DIRECTOR.nemesisMax);
  });
  it('판돈: 이루면 건 만큼 더, 못 이루면 건 만큼 잃는다', () => {
    expect(settleBet('fast', 30, { won: true, turns: DIRECTOR.betTurns, fell: 2 })).toBe(30);
    expect(settleBet('fast', 30, { won: true, turns: DIRECTOR.betTurns + 1, fell: 0 })).toBe(-30);
    expect(settleBet('clean', 30, { won: true, turns: 9, fell: 0 })).toBe(30);
    expect(settleBet('clean', 30, { won: false, turns: 2, fell: 0 })).toBe(-30);
  });
  it('하이라이트: 처치 수가 먼저, 같으면 피해', () => {
    const a = { where: 'x', turn: 1, kills: 2, damage: 10 };
    expect(betterHighlight(null, a)).toBe(true);
    expect(betterHighlight(a, { ...a, kills: 1, damage: 999 })).toBe(false);
    expect(betterHighlight(a, { ...a, damage: 11 })).toBe(true);
  });
  it('보이지 않는 손이 켜지면 가장 아픈 예고 하나를 건너뛴다', () => {
    const b = newSliceBattle(squad, ['K', 'P', 'P', 'N'], START_COMMANDS, 3);
    const full = planEnemy(b.s);
    const soft = planEnemy(b.s, true);
    if (full.length > 1) expect(soft[0]).not.toEqual(full[0]);
  });
  it('원수는 HP가 오른 채로 선다', () => {
    const plain = newSliceBattle(squad, ['K', 'P', 'P', 'N'], START_COMMANDS, 3);
    const nem = newSliceBattle(squad, ['K', 'P', 'P', 'N'], START_COMMANDS, 3, { nemesis: { t: 'N', rank: 2 } });
    const n0 = plain.s.pieces.find((p) => p.side === 1 && p.type === 'N')!;
    const n1 = nem.s.pieces.find((p) => p.id === nem.nemesisId)!;
    expect(n1.type).toBe('N');
    expect(n1.maxHp).toBe(Math.round(n0.maxHp * (1 + 2 * DIRECTOR.nemesisHp)));
  });
  it('자원 희생: 곁의 분대원과 킹이 자리를 바꾼다 · 마지막 한 수: 태엽과 철벽', () => {
    const b = newSliceBattle(squad, ['K', 'P', 'P', 'N'], START_COMMANDS, 3);
    const k = kingOf(b.s, 0)!;
    const c = sacrificeCandidates(b);
    if (c.length) {
      const mate = b.s.pieces.find((p) => p.id === c[0])!;
      const [kx, ky, mx, my] = [k.x, k.y, mate.x, mate.y];
      expect(sacrificeSwap(b, c[0])).toBe(true);
      expect([k.x, k.y, mate.x, mate.y]).toEqual([mx, my, kx, ky]);
    }
    const ap = b.ap, n = b.hand.length;
    clutchBoost(b, 2);
    expect(b.ap).toBe(ap + 2);
    expect(b.hand).toHaveLength(n + 1);
    expect(b.hand.at(-1)).toBe('plate');
  });
});
