import { describe, expect, it } from 'vitest';
import { addNemesis, betOffer, betProgress, betStake, betText, betterHighlight, dir, DIRECTOR, isCloseCall, settleBet } from '../src/slice/director';
import { clutchBoost, dangerSquares, endTurn, kingDoomed, newSliceBattle, planEnemy, sacrificeCandidates, sacrificeOffer, sacrificeSwap, type SliceBattle } from '../src/slice/battle';
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
  it('보이지 않는 손: 첫째 왕관에서 같은 대국을 두 번 진 뒤에만 켜진다 (D-542)', () => {
    expect(dir.mercy(0, 0)).toBe(0);
    expect(dir.mercy(0, 1)).toBe(0);
    expect(dir.mercy(0, 2)).toBeGreaterThan(0);
    expect(dir.mercy(1, 5)).toBe(0);
    expect(dir.mercy(3, 5)).toBe(0);
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
  it('판돈: 이기고 조건을 이루면 건 만큼 더, 아니면 건 만큼 잃는다 (#12 · D-503)', () => {
    const unhit = { kind: 'unhit' as const, stake: 30, need: 2 };
    const kills = { kind: 'kills' as const, stake: 30, need: 3 };
    expect(settleBet(unhit, { won: true, kingHit: false, bestTurnKills: 0 })).toBe(30);
    expect(settleBet(unhit, { won: true, kingHit: true, bestTurnKills: 5 })).toBe(-30);
    expect(settleBet(kills, { won: true, kingHit: true, bestTurnKills: 3 })).toBe(30);
    expect(settleBet(kills, { won: true, kingHit: false, bestTurnKills: 2 })).toBe(-30);
    expect(settleBet(kills, { won: false, kingHit: false, bestTurnKills: 4 })).toBe(-30);
    expect(betProgress(unhit, { kingHit: true, bestTurnKills: 0 })).toEqual({ broken: true, done: false });
    expect(betProgress(kills, { kingHit: false, bestTurnKills: 3 })).toEqual({ broken: false, done: true });
  });
  it('판돈 제안: 1막 둘째 싸움부터 · 25% · 반장 없음 · 판돈 = 나사 25% (20 ~ 60)', () => {
    const o = { act: 1, fight: 2, boss: false, gold: 100, roll: 0.1, pick: 0.2 };
    expect(betOffer({ ...o, fight: 1 })).toBeNull();
    expect(betOffer({ ...o, boss: true })).toBeNull();
    expect(betOffer({ ...o, roll: DIRECTOR.betChance })).toBeNull();
    expect(betOffer({ ...o, gold: 19 })).toBeNull();
    expect(betOffer(o)).toEqual({ kind: 'unhit', stake: 25, need: 2 });
    expect(betOffer({ ...o, act: 2, fight: 1, pick: 0.7 })).toEqual({ kind: 'kills', stake: 25, need: 3 });
    expect(betStake(40)).toBe(20);
    expect(betStake(400)).toBe(60);
    expect(betText({ kind: 'kills', need: 2 }).cond).toBe('한 턴에 2기 처치하고 승리');
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

describe('사선 제안 시점 (D-548 — 실기 「이미 다 맞은 뒤에 떴다」)', () => {
  /** 킹을 예고 칸에 세우고 HP 1 — 곁에 분대원 하나를 붙인다 (디버그 doom과 같은 판) */
  const doomed = (seed: number): SliceBattle | null => {
    const b = newSliceBattle(squad, ['K', 'P', 'P', 'N', 'R'], START_COMMANDS, seed);
    const k = kingOf(b.s, 0)!;
    for (const sq of dangerSquares(b)) {
      if (b.s.pieces.some((p) => p.x === sq.x && p.y === sq.y)) continue;
      const mate = b.s.pieces.find((p) => p.side === 0 && p.id !== k.id)!;
      const free = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].map(([dx, dy]) => ({ x: sq.x + dx, y: sq.y + dy }))
        .find((c) => c.x >= 0 && c.y >= 0 && c.x < b.s.width && c.y < b.s.height && !b.s.pieces.some((p) => p.x === c.x && p.y === c.y));
      if (!free) continue;
      Object.assign(k, { x: sq.x, y: sq.y, hp: 1, shield: 0 });
      Object.assign(mate, { x: free.x, y: free.y });
      if (kingDoomed(b) && sacrificeCandidates(b).length) return b;
    }
    return null;
  };
  it('첫 누름(경고 단계)에는 묻지 않고, 턴을 정말 끝내는 누름에서 적 공격 전에 묻는다', () => {
    let found = 0;
    for (let seed = 1; seed <= 40 && found < 3; seed++) {
      const b = doomed(seed);
      if (!b) continue;
      expect(sacrificeOffer(b, 1)).toBeNull();
      expect(endTurn(b)).toBe('warn');
      const pick = sacrificeOffer(b, 1);
      if (pick === null) continue; // 바꿔 서도 살 길이 없는 판 — 묻지 않는다
      found++;
      expect(sacrificeOffer(b, 0)).toBeNull();
      // 아직 아무도 맞지 않았다 — 제안은 피해 앞이다
      expect(kingOf(b.s, 0)!.hp).toBe(1);
      // 받아들이면 킹은 이번 적 차례를 넘긴다
      expect(sacrificeSwap(b, pick)).toBe(true);
      expect(kingDoomed(b)).toBe(false);
      const r = endTurn(b);
      expect(r).not.toBe('warn');
      expect(kingOf(b.s, 0)!.hp).toBeGreaterThan(0);
    }
    expect(found).toBeGreaterThan(0);
  });
  it('적 차례가 풀린 뒤(내 차례 시작 · 이어하기 판)에는 같은 판정이어도 묻지 않는다', () => {
    let found = 0;
    for (let seed = 1; seed <= 12 && found < 3; seed++) {
      const b = doomed(seed);
      if (!b) continue;
      expect(endTurn(b)).toBe('warn');
      // 거절하고 턴을 끝낸다 — 킹이 맞는다
      const r = endTurn(b);
      expect(r).not.toBe('warn');
      if (b.s.winner !== null) continue;
      found++;
      // 다음 내 차례 시작: 경고 전 상태 — 또 쓰러지게 생겼어도 지금은 묻지 않는다 (맞은 직후 창이 뜨던 버그)
      expect(b.warned).toBe(false);
      if (kingDoomed(b)) expect(sacrificeOffer(b, 1)).toBeNull();
      // 저장 → 이어하기(JSON 왕복)도 같다
      const back = JSON.parse(JSON.stringify(b)) as SliceBattle;
      expect(sacrificeOffer(back, 1)).toBeNull();
    }
  });
});
