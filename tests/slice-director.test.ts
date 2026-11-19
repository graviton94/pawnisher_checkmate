import { describe, expect, it } from 'vitest';
import { addNemesis, betterHighlight, dir, DIRECTOR, isCloseCall, pickNemesis, type Nemesis } from '../src/slice/director';
import * as director from '../src/slice/director';
import * as battle from '../src/slice/battle';
import { newSliceBattle } from '../src/slice/battle';
import { START_COMMANDS } from '../src/slice/cards';
import { EASE, startRewind } from '../src/data/ease';

const squad = [{ t: 'K' as const }, { t: 'P' as const }, { t: 'P' as const }, { t: 'N' as const }, { t: 'B' as const }];

describe('심리 연출 감독 (D-178)', () => {
  it('큰 도움은 낮은 승급에서 크고, 승급이 오를수록 줄어 끝내 없어진다', () => {
    for (const key of ['closeCall', 'bounty'] as const) {
      const vals = [0, 1, 2, 3, 4, 5].map((a) => dir[key](a));
      for (let i = 1; i < vals.length; i++) expect(vals[i]).toBeLessThanOrEqual(vals[i - 1]);
    }
    expect(dir.closeCall(5)).toBe(0);
  });
  it('사선: 킹 HP 15% 이하 · 분대원 폐기(두 번째 쓰러짐) 중 하나', () => {
    expect(isCloseCall({ kingHp: 50, kingMax: 100, fell: 0 })).toBe(false);
    expect(isCloseCall({ kingHp: 15, kingMax: 100, fell: 0 })).toBe(true);
    expect(isCloseCall({ kingHp: 90, kingMax: 100, fell: 1 })).toBe(true);
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
  it('하이라이트: 처치 수가 먼저, 같으면 피해', () => {
    const a = { where: 'x', turn: 1, kills: 2, damage: 10 };
    expect(betterHighlight(null, a)).toBe(true);
    expect(betterHighlight(a, { ...a, kills: 1, damage: 999 })).toBe(false);
    expect(betterHighlight(a, { ...a, damage: 11 })).toBe(true);
  });
  it('원수는 HP가 오른 채로 선다', () => {
    const plain = newSliceBattle(squad, ['K', 'P', 'P', 'N'], START_COMMANDS, 3);
    const nem = newSliceBattle(squad, ['K', 'P', 'P', 'N'], START_COMMANDS, 3, { nemesis: { t: 'N', rank: 2 } });
    const n0 = plain.s.pieces.find((p) => p.side === 1 && p.type === 'N')!;
    const n1 = nem.s.pieces.find((p) => p.id === nem.nemesisId)!;
    expect(n1.type).toBe('N');
    expect(n1.maxHp).toBe(Math.round(n0.maxHp * (1 + 2 * DIRECTOR.nemesisHp)));
  });
  it('원수 (D-600): 첫째 · 둘째 왕관은 2막부터 · 편성에 있는 유형만 세게 하고 기물을 더하지 않는다', () => {
    const list: Nemesis[] = [{ t: 'Q', name: 'q', rank: 2, victims: [] }, { t: 'N', name: 'n', rank: 1, victims: [] }];
    expect(pickNemesis(list, ['K', 'P', 'N'], 0, 1)).toBeNull();
    expect(pickNemesis(list, ['K', 'P', 'N'], 1, 1)).toBeNull();
    expect(pickNemesis(list, ['K', 'P', 'N'], 0, 2)?.t).toBe('N');
    expect(pickNemesis(list, ['K', 'P', 'N'], 2, 1)?.t).toBe('N');
    // 편성에 없는 퀸 · 룩은 더하지 않는다 — 맞는 유형이 없으면 원수 없음
    expect(pickNemesis(list.slice(0, 1), ['K', 'P', 'N'], 3, 2)).toBeNull();
    // 편성 그대로 — 원수가 서도 적 수는 같다
    const nem = newSliceBattle(squad, ['K', 'P', 'P', 'N'], START_COMMANDS, 3, { nemesis: { t: 'Q', rank: 2 } });
    expect(nem.nemesisId).toBeUndefined();
    expect(nem.s.pieces.filter((p) => p.side === 1)).toHaveLength(4);
  });
  it('시작 되감기 (D-600): 첫째 · 둘째 왕관 2 · 셋째 · 넷째 1 · 도전도 1', () => {
    expect([0, 1, 2, 3, 4, 13].map(startRewind)).toEqual([2, 2, 1, 1, 1, 1]);
    expect(EASE.act1BossHp).toBeLessThan(1);
  });
  it('뺀 장치 (D-601): 보이지 않는 손 · 판돈 · 마지막 한 수 · 자원 희생이 엔진 · 감독에 남지 않는다', () => {
    for (const k of ['betOffer', 'settleBet', 'betProgress']) expect(k in director).toBe(false);
    for (const k of ['clutchBoost', 'sacrificeOffer', 'sacrificeSwap', 'kingDoomed']) expect(k in battle).toBe(false);
    for (const k of ['mercy', 'mercyAfter', 'clutch', 'sacrifice', 'betChance']) expect(k in DIRECTOR).toBe(false);
    const b = newSliceBattle(squad, ['K', 'P', 'P', 'N'], START_COMMANDS, 3);
    expect('mercy' in b).toBe(false);
  });
});

describe('막마다 새 용어 상한 (D-601)', () => {
  it('상한 안에서만 새 묶음을 열고, 빈 막 · 뺀 묶음은 늘 연다', async () => {
    const { TERM_CAP, termCapOk, gateSize, KEYWORDS } = await import('../src/data/hud');
    expect(termCapOk('part', 0)).toBe(true);
    expect(termCapOk('door', TERM_CAP.perAct)).toBe(false);
    expect(termCapOk('door', TERM_CAP.perAct - gateSize('door'))).toBe(true);
    expect(termCapOk('tactic', 99)).toBe(true);
    // 뺀 장치 · 겹친 표지의 용어는 사전에 없다
    const names = KEYWORDS.map(([k]) => k);
    for (const k of ['부적', '보충병', '청록 합 표지', '카드 표지 세 칸']) expect(names).not.toContain(k);
    for (const k of ['버팀', '심장 톱니', '되감기', '표지']) expect(names).toContain(k);
  });
});
