import { describe, expect, it } from 'vitest';
import { findPiece, makePiece, type BattleEvent } from '../src/engine';
import { endTurn, newSliceBattle, playCard, previewPlay, rewind, type SliceBattle } from '../src/slice/battle';
import { createBuildAct, createBuildTrial } from '../src/slice/build-trial';
import { BUILD_TRIAL } from '../src/data/build-trial';
import { KITS } from '../src/slice/cards';
import { STARTER_PARTS } from '../src/data/unlocks';
import { PART_GRADE, partFits } from '../src/slice/parts';
import type { CommandId } from '../src/slice/cards';
import type { SlicePartId } from '../src/slice/parts';
import { partStatuses } from '../src/slice/part-state';

const setup = (parts: SlicePartId[] = ['siegeLatch']) => {
  const b = newSliceBattle([{ t: 'K' }, { t: 'R' }, { t: 'N' }, { t: 'P' }], ['K', 'P', 'P', 'P', 'P'], [], 420, { parts, width: 6, height: 6, rewindCharms: 1 });
  const coords = [[5, 0], [0, 0], [4, 0], [1, 1], [5, 5], [0, 3], [0, 4], [2, 3], [5, 3]];
  const ordered = [...b.squadIds.map((id) => findPiece(b.s, id)!), ...b.s.pieces.filter((p) => p.side === 1).sort((a, z) => Number(z.type === 'K') - Number(a.type === 'K') || a.id - z.id)];
  ordered.forEach((p, i) => { [p.x, p.y] = coords[i]; if (p.side === 1) { p.hp = p.maxHp = 300; p.def = 0; p.shield = 0; } });
  b.intents = []; b.graze = []; b.grazeDanger = []; b.aimed = []; b.shocked = [];
  b.ap = 5;
  const [king, rook, knight, pawn] = b.squadIds;
  findPiece(b.s, rook)!.shield = 15;
  return { b, king, rook, knight, pawn };
};
const play = (b: SliceBattle, id: CommandId, actor: number, to: { x: number; y: number }) => {
  b.hand = [id];
  const r = playCard(b, 0, actor, to);
  if (typeof r === 'string') throw new Error(`${id}: ${r}`);
  return r.events;
};
const attacks = (events: BattleEvent[], id: number) => events.flatMap((e) => e.type === 'attack' && e.attackerId === id ? e.hits : []);

describe('공성 걸쇠 — 직접 공격의 방어 비용', () => {
  it.each([0, 5, 15])('방열판 %i: 미리보기·실행 일치, 배수 전에 더한다', (shield) => {
    const { b, rook } = setup();
    findPiece(b.s, rook)!.shield = shield;
    findPiece(b.s, rook)!.atk = 20;
    b.nextMult = 2;
    b.hand = ['rookCharge'];
    const original = JSON.stringify(b);
    const sim = previewPlay(b, 0, rook, { x: 0, y: 1 })!;
    expect(JSON.stringify(b)).toBe(original);
    const result = playCard(b, 0, rook, { x: 0, y: 1 });
    expect(typeof result).toBe('object');
    expect(b.s).toEqual(sim.state);
    expect(attacks(sim.events, rook)[0].damage).toBe((20 + 8 + Math.min(shield, 12)) * 2);
    expect(findPiece(b.s, rook)!.shield).toBe(Math.max(0, shield - 12));
    expect(b.once.includes(`siegeLatch:${rook}`)).toBe(shield > 0);
  });
  it.each(['rookLine+', 'rookLine~'] as CommandId[])('기본 비용이 기준: %s', (id) => {
    const { b, rook } = setup();
    play(b, id, rook, { x: 0, y: 1 });
    expect(findPiece(b.s, rook)!.shield).toBe(3);
  });
  it('1태엽 명령과 빈 이동은 보존, 뒤의 유효 공격에 소모', () => {
    const { b, rook } = setup();
    play(b, 'scrapToss', rook, { x: 0, y: 2 });
    expect(findPiece(b.s, rook)!.shield).toBe(15);
    play(b, 'rookLine', rook, { x: 3, y: 2 });
    expect(findPiece(b.s, rook)!.shield).toBe(15);
    b.ap = 5;
    play(b, 'rookLine', rook, { x: 3, y: 3 });
    expect(findPiece(b.s, rook)!.shield).toBe(3);
    b.ap = 5;
    play(b, 'rookLine', rook, { x: 3, y: 4 });
    expect(findPiece(b.s, rook)!.shield).toBe(3);
  });
  it('관통의 첫 대상만 강화하고 충돌은 중복 강화하지 않는다', () => {
    for (const card of ['rookPierce', 'rookCharge'] as const) {
      const base = setup([]), test = setup();
      const a = play(base.b, card, base.rook, { x: 0, y: 1 });
      const z = play(test.b, card, test.rook, { x: 0, y: 1 });
      expect(attacks(z, test.rook)[0].damage).toBeGreaterThan(attacks(a, base.rook)[0].damage);
      expect(attacks(z, test.rook).slice(1)).toEqual(attacks(a, base.rook).slice(1));
      const bumps = (ev: BattleEvent[]) => ev.flatMap((e) => e.type === 'blast' ? e.hits.map((h) => ({ id: h.targetId, damage: h.damage })) : []);
      expect(bumps(z)).toEqual(bumps(a));
    }
  });
  it('튐 각인에는 강화 피해가 전파되지 않는다', () => {
    const base = setup([]), test = setup();
    for (const { b, rook } of [base, test]) {
      findPiece(b.s, rook)!.carve = 'diag';
      b.s.pieces.push(makePiece(99, 'P', 1, 1, 2));
    }
    const a = attacks(play(base.b, 'rookLine', base.rook, { x: 0, y: 1 }), base.rook);
    const z = attacks(play(test.b, 'rookLine', test.rook, { x: 0, y: 1 }), test.rook);
    expect(z.find((h) => h.targetId === 99)).toEqual(a.find((h) => h.targetId === 99));
    expect(z.find((h) => h.targetId === 99)?.splash).toBe(true);
  });
  it('룩 둘은 각각 발동한다', () => {
    const { b, rook, knight } = setup();
    const second = findPiece(b.s, knight)!;
    second.type = 'R'; second.shield = 15;
    play(b, 'rookLine', rook, { x: 0, y: 1 });
    play(b, 'rookLine', knight, { x: 4, y: 3 });
    expect(findPiece(b.s, rook)!.shield).toBe(3);
    expect(findPiece(b.s, knight)!.shield).toBe(3);
  });
  it('반사는 소모 후 방열판에 맞으며 자동 재발동하지 않는다', () => {
    const { b, rook } = setup();
    b.boss = true; b.bossRule = 'thorns';
    const king = b.s.pieces.find((p) => p.side === 1 && p.type === 'K')!;
    const front = b.s.pieces.find((p) => p.x === 0 && p.y === 3)!;
    Object.assign(front, { x: king.x, y: king.y });
    Object.assign(king, { x: 0, y: 3 });
    const events = play(b, 'rookLine', rook, { x: 0, y: 1 });
    expect(events.some((e) => e.type === 'blast' && e.fx === 'thorns')).toBe(true);
    expect(events.filter((e) => e.type === 'attack' && e.shieldSpent)).toHaveLength(1);
    expect(findPiece(b.s, rook)!.shield).toBeLessThanOrEqual(3);
  });
});

describe('맞물린 톱니 — 영구 동료의 서로 다른 입장 유형', () => {
  it('처치 없이 두 유형의 피해로 +1, 이후 같은 턴은 발동하지 않는다', () => {
    const { b, pawn, knight, rook } = setup(['relayGear']);
    play(b, 'advance', pawn, { x: 1, y: 2 });
    expect(b.ap).toBe(4);
    const ev = play(b, 'leap', knight, { x: 3, y: 2 });
    expect(b.kills).toBe(0);
    expect(b.ap).toBe(4);
    expect(ev).toContainEqual({ type: 'apGain', side: 0, amount: 1, source: 'relayGear' });
    play(b, 'rookLine', rook, { x: 0, y: 1 });
    expect(b.ap).toBe(2);
  });
  it('같은 기물 재행동·같은 유형 둘·광역 다중 명중은 한 유형이다', () => {
    const { b, pawn, knight } = setup(['relayGear']);
    const p = findPiece(b.s, knight)!; p.type = 'P'; p.x = 3; p.y = 1;
    b.squadTypes![knight] = 'P';
    play(b, 'advance', pawn, { x: 1, y: 2 });
    play(b, 'advance', knight, { x: 3, y: 2 });
    expect(b.ap).toBe(3);
    expect(b.once).not.toContain('relayGear');
  });
  it('임시 폰의 피해는 조건에 들어가지 않는다', () => {
    const { b, pawn, knight } = setup(['relayGear']);
    b.squadIds = b.squadIds.filter((id) => id !== pawn);
    play(b, 'advance', pawn, { x: 1, y: 2 });
    play(b, 'leap', knight, { x: 3, y: 2 });
    expect(b.once).not.toContain('relayGear');
    expect(b.ap).toBe(3);
  });
  it('승격한 폰도 입장 유형 P로만 센다', () => {
    const { b, pawn } = setup(['relayGear']);
    play(b, 'advance', pawn, { x: 1, y: 2 });
    Object.assign(findPiece(b.s, pawn)!, { x: 1, y: 4 });
    const ev = play(b, 'advance', pawn, { x: 1, y: 5 });
    expect(ev.some((e) => e.type === 'promote')).toBe(true);
    expect(b.once.filter((key) => key.startsWith('relayType:'))).toEqual(['relayType:P']);
    expect(b.once).not.toContain('relayGear');
  });
  it('빈 이동과 방열판 부여는 조건이 아니다. 적 방열판 피해는 센다', () => {
    const { b, pawn, knight } = setup(['relayGear']);
    play(b, 'leap', knight, { x: 2, y: 1 });
    expect(b.once).toEqual([]);
    b.hand = ['plate']; playCard(b, 0, pawn);
    expect(b.once).toEqual([]);
    b.ap = 5;
    for (const p of b.s.pieces) if (p.side === 1) p.shield = 100;
    play(b, 'advance', pawn, { x: 1, y: 2 });
    expect(b.once).toContain('relayType:P');
    expect(b.s.pieces.filter((p) => p.side === 1).every((p) => p.hp === p.maxHp)).toBe(true);
  });
  it('상한에서 초과분은 표시·이월하지 않는다', () => {
    const { b, pawn, knight } = setup(['relayGear']);
    play(b, 'advance', pawn, { x: 1, y: 2 });
    b.ap = 5;
    const ev = play(b, 'leap+', knight, { x: 3, y: 2 });
    expect(b.ap).toBe(5);
    expect(ev).toContainEqual({ type: 'apGain', side: 0, amount: 0, source: 'relayGear' });
    expect(b.once).toContain('relayGear');
  });
  it('처치·편자와 동시 발동한 실제 환급량만 표시한다', () => {
    const { b, pawn, knight } = setup(['relayGear', 'horseshoe']);
    play(b, 'advance', pawn, { x: 1, y: 2 });
    b.s.pieces.find((p) => p.side === 1 && p.x === 5 && p.y === 3)!.hp = 1;
    const before = b.ap;
    const events = play(b, 'leap', knight, { x: 3, y: 2 });
    expect(b.ap).toBe(5);
    expect(events.reduce((n, e) => n + (e.type === 'apGain' ? e.amount : 0), 0)).toBe(b.ap - before + 1);
    expect(b.once).toContain('relayGear');
  });
});

describe('수명주기와 비교 조건', () => {
  it('저장 복제·되감기는 소모와 발동 이력을 복구한다', () => {
    const { b, rook, pawn } = setup(['relayGear', 'siegeLatch']);
    b.snap = JSON.stringify({ ...b, snap: '' });
    play(b, 'advance', pawn, { x: 1, y: 2 });
    play(b, 'rookLine', rook, { x: 0, y: 1 });
    expect(b.once).toContain('relayGear');
    const back = rewind(JSON.parse(JSON.stringify(b))) as SliceBattle;
    expect(back.once).toEqual([]);
    expect(findPiece(back.s, rook)!.shield).toBe(15);
    expect(back.squadTypes).toEqual(b.squadTypes);
    play(back, 'advance', pawn, { x: 1, y: 2 });
    play(back, 'rookLine', rook, { x: 0, y: 1 });
    expect(back.s).toEqual(b.s);
    expect(back.ap).toBe(b.ap);
  });
  it('다음 턴에는 다시 발동할 수 있고 입장 유형은 유지한다', () => {
    const { b, rook, pawn } = setup(['relayGear', 'siegeLatch']);
    play(b, 'advance', pawn, { x: 1, y: 2 });
    play(b, 'rookLine', rook, { x: 0, y: 1 });
    endTurn(b);
    expect(b.once).toEqual([]);
    b.ap = 5;
    play(b, 'rookLine', rook, { x: 0, y: 2 });
    expect(findPiece(b.s, rook)!.shield).toBe(0);
    expect(b.once).toContain(`siegeLatch:${rook}`);
  });
  it('불법 지휘는 턴당 기회를 소비하지 않는다', () => {
    const { b, rook } = setup(); b.hand = ['order'];
    const snapshot = JSON.stringify(b);
    expect(typeof playCard(b, 0, rook, { x: -1, y: 1 })).toBe('string');
    expect(JSON.stringify(b)).toBe(snapshot);
  });
  it('세 운영 모두 같은 분대·전장·덱으로 시작하고 네 실패 조건을 제공한다', () => {
    const trials = (['mixed', 'knight', 'rook'] as const).map((id) => createBuildTrial(id));
    for (const t of trials) { expect(t.b.s.pieces).toEqual(trials[0].b.s.pieces); expect(t.deck).toEqual(trials[0].deck); }
    for (const id of ['mixed', 'knight', 'rook'] as const) {
      for (const c of ['ready', 'missing', 'blocked', 'loss'] as const) {
        const { b } = createBuildTrial(id, c);
        expect(new Set(b.s.pieces.map((p) => `${p.x},${p.y}`)).size).toBe(b.s.pieces.length);
        expect(b.s.pieces.filter((p) => p.side === 0)).toHaveLength(c === 'loss' ? 3 : 4);
      }
    }
  });
  it('고정판에서 같은 룩 공격은 보호를 소모하는 운영에서만 방열판을 잃는다', () => {
    for (const id of ['mixed', 'knight', 'rook'] as const) {
      const { b } = createBuildTrial(id);
      const rook = b.squadIds[3];
      play(b, 'rookLine', rook, { x: 5, y: 2 });
      expect(findPiece(b.s, rook)!.shield).toBe(id === 'rook' ? 3 : 15);
    }
  });
  it('부족한 방열판·막힌 사선·잃은 주력은 같은 공격을 유지하지 못한다', () => {
    const missing = createBuildTrial('rook', 'missing').b;
    const blocked = createBuildTrial('rook', 'blocked').b;
    const lost = createBuildTrial('rook', 'loss').b;
    const ev = play(missing, 'rookLine', missing.squadIds[3], { x: 5, y: 2 });
    expect(ev.some((e) => e.type === 'attack' && e.shieldSpent)).toBe(false);
    blocked.hand = ['rookLine']; lost.hand = ['rookLine'];
    expect(previewPlay(blocked, 0, blocked.squadIds[3], { x: 5, y: 2 })).toBeNull();
    expect(previewPlay(lost, 0, lost.squadIds[3], { x: 5, y: 2 })).toBeNull();
  });
  it('첫막은 같은 적으로 시작하고 생존·HP를 이어 받으며 마지막 반장은 2단계 규칙이다', () => {
    const mixed = createBuildAct('mixed', 0), rook = createBuildAct('rook', 0);
    expect(mixed.b.s.pieces).toEqual(rook.b.s.pieces);
    expect(mixed.b.intents).toEqual(rook.b.intents);
    const injured = mixed.squad.slice(0, 3).map((u) => ({ ...u, hp: 7 }));
    const next = createBuildAct('mixed', 1, injured);
    expect(next.b.squadIds).toHaveLength(3);
    for (const id of next.b.squadIds) expect(findPiece(next.b.s, id)!.hp).toBe(7);
    const last = createBuildAct('rook', 2);
    expect(last.b.boss).toBe(true);
    expect(last.b.phase2).not.toBe(true);
  });
  it('본편 시작 풀·꾸러미에 입문 두 종을 연결하되 룩 없는 분대는 걸쇠를 받지 않는다', () => {
    for (const id of ['relayGear', 'siegeLatch'] as const) {
      expect(STARTER_PARTS).toContain(id);
      expect(KITS.some((kit) => kit.part === id)).toBe(true);
    }
    expect(partFits('siegeLatch', ['K', 'P', 'N'], [])).toBe(false);
    expect(partFits('siegeLatch', ['K', 'R'], [])).toBe(true);
    expect(PART_GRADE.siegeLatch).toBe('rare');
    expect(BUILD_TRIAL.knight.part).toBe('horseshoe');
  });
});


describe('실제 조건에 따른 UI-34 상태', () => {
  it('공성 걸쇠는 실제 타격 가능/룩별 소진/되감기를 구분한다', () => {
    const { b, rook } = setup();
    b.hand = ['rookLine'];
    const original = JSON.stringify(b);
    expect(partStatuses(b).siegeLatch?.state).toBe('ready');
    expect(JSON.stringify(b)).toBe(original);
    b.snap = JSON.stringify(b);
    expect(typeof playCard(b, 0, rook, { x: 0, y: 1 })).not.toBe('string');
    expect(partStatuses(b).siegeLatch?.state).toBe('spent');
    const back = rewind(b) as SliceBattle;
    expect(partStatuses(back).siegeLatch?.state).toBe('ready');
    back.ap = 0;
    expect(partStatuses(back).siegeLatch?.state).toBe('waiting');
    const other = makePiece(1000, 'R', 0, 3, 0); other.shield = 10;
    b.s.pieces.push(other); b.hand = [];
    expect(partStatuses(b).siegeLatch?.state).toBe('waiting');
    expect(partStatuses(b).siegeLatch?.detail).toContain('1/2');
  });
  it('맞댄 철판은 3승/인접 동료/실제 낼 수 있는 방열판 카드를 모두 요구한다', () => {
    const { b, rook, pawn } = setup(['sharedPlate']);
    Object.assign(findPiece(b.s, pawn)!, { x: 1, y: 0 });
    b.squadWins![rook] = 2; b.hand = ['plate'];
    expect(partStatuses(b).sharedPlate?.state).toBe('waiting');
    b.squadWins![rook] = 3;
    expect(partStatuses(b).sharedPlate?.state).toBe('ready');
    b.ap = 0; expect(partStatuses(b).sharedPlate?.state).toBe('waiting'); b.ap = 5;
    playCard(b, 0, rook);
    expect(partStatuses(b).sharedPlate?.state).toBe('spent');
    endTurn(b);
    expect(partStatuses(b).sharedPlate?.state).not.toBe('spent');
  });
  it('연쇄·처치 조건은 실행 복제로 확인하고 실제 판과 RNG는 보존한다', () => {
    const { b, pawn } = setup(['fuse', 'tally', 'whistle']);
    b.hand = ['advance']; b.kills = 2;
    for (const p of b.s.pieces) if (p.side === 1 && p.type !== 'K') p.hp = 1;
    const before = JSON.stringify(b);
    const states = partStatuses(b);
    expect(states.fuse?.state).toBe('ready');
    expect(states.tally?.state).toBe('ready');
    expect(states.whistle?.state).toBe('ready');
    expect(JSON.stringify(b)).toBe(before);
    playCard(b, 0, pawn, { x: 1, y: 2 });
    expect(partStatuses(b).fuse?.state).toBe('spent');
    expect(partStatuses(b).tally?.state).toBe('spent');
    expect(partStatuses(b).whistle?.state).toBe('spent');
  });
  it('공격 유형과 소진은 실제 기록을 사용하고 상시 효과에는 배지를 만들지 않는다', () => {
    const { b } = setup(['relayGear', 'relaySeal', 'ledger']);
    b.hand = [];
    expect(partStatuses(b).relayGear?.state).toBe('waiting');
    b.once.push('relayType:P', 'relayType:N', 'relayGear');
    expect(partStatuses(b).relayGear?.state).toBe('spent');
    expect(partStatuses(b).relaySeal?.detail).toContain('2/3');
    expect(partStatuses(b).ledger).toBeUndefined();
    b.s.winner = 0; expect(partStatuses(b)).toEqual({});
  });
});
