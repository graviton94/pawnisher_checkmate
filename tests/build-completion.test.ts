import { describe, expect, it } from 'vitest';
import { findPiece, type BattleEvent } from '../src/engine';
import { Rng } from '../src/engine/rng';
import { endTurn, growCrew, newSliceBattle, playCard, previewPlay, rewind, type SliceBattle } from '../src/slice/battle';
import { KITS, type CommandId } from '../src/slice/cards';
import { PART_GRADE, partFits, type SlicePartId } from '../src/slice/parts';
import { buildAffinity, chooseBuildCard, chooseBuildPart, firstShopParts } from '../src/slice/build-offers';
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


describe('분대 인장 — 순서·직접 타격·수명주기', () => {
  it.each(['rookLine', 'rookPierce', 'rookCharge'] as const)('%s: 세 번째 유형의 첫 대상만 강화, 미리보기=실행', (card) => {
    const { b, pawn, knight, rook } = setup(['relayGear', 'relaySeal']);
    play(b, 'advance', pawn, { x: 1, y: 2 });
    play(b, 'leap', knight, { x: 3, y: 2 });
    b.ap = 5; b.hand = [card];
    const saved = JSON.stringify(b);
    const predicted = previewPlay(b, 0, rook, { x: 0, y: 1 })!;
    expect(JSON.stringify(b)).toBe(saved);
    const normal = JSON.parse(saved) as SliceBattle;
    normal.parts = normal.parts.filter((id) => id !== 'relaySeal');
    const regular = previewPlay(normal, 0, rook, { x: 0, y: 1 })!;
    // D-454: 앞의 두 수가 적을 맞힌 만큼 연쇄가 쌓여(처치가 아니라 적중) 피해에 더해진다 — 옛 값 39 · 47 · 54
    expect(attacks(predicted.events, rook)[0].damage).toBe(({ rookLine: 61, rookPierce: 73, rookCharge: 75 })[card]);
    expect(attacks(predicted.events, rook).slice(1)).toEqual(attacks(regular.events, rook).slice(1));
    const collision = (events: BattleEvent[]) => events.flatMap((e) => e.type === 'blast' ? e.hits.map((h) => ({ targetId: h.targetId, damage: h.damage })) : []);
    expect(collision(predicted.events)).toEqual(collision(regular.events));
    const result = playCard(b, 0, rook, { x: 0, y: 1 });
    expect(typeof result).toBe('object'); expect(b.s).toEqual(predicted.state);
    expect(b.once.filter((x) => x === 'relaySeal')).toHaveLength(1);
  });
  it('같은 유형·빈 이동·임시 기물은 인장을 소모하지 않는다', () => {
    const { b, rook, knight } = setup(['relaySeal']);
    b.once.push('relayType:R', 'relayType:P');
    play(b, 'rookLine', rook, { x: 0, y: 1 });
    expect(b.once).not.toContain('relaySeal');
    b.ap = 5; play(b, 'leap', knight, { x: 2, y: 1 });
    expect(b.once).not.toContain('relaySeal');
    b.squadIds = b.squadIds.filter((id) => id !== knight);
    b.ap = 5; play(b, 'leap', knight, { x: 3, y: 3 });
    expect(b.once).not.toContain('relaySeal');
  });
  it('인장 단독으로도 유형 이력을 쌓고 되감기로 소모를 복구한다', () => {
    const { b, pawn, knight, rook } = setup(['relaySeal']);
    play(b, 'advance', pawn, { x: 1, y: 2 }); play(b, 'leap', knight, { x: 3, y: 2 });
    b.ap = 5; b.snap = JSON.stringify({ ...b, snap: '' });
    play(b, 'rookLine', rook, { x: 0, y: 1 }); expect(b.once).toContain('relaySeal');
    const back = rewind(b) as SliceBattle; expect(back.once).not.toContain('relaySeal');
    expect(back.once).toContain('relayType:P');
  });
});

const sharing = () => {
  const { b, rook, pawn, knight } = setup(['sharedPlate']);
  b.squadWins![rook] = 3;
  Object.assign(findPiece(b.s, pawn)!, { x: 0, y: 1, hp: 100, maxHp: 200, shield: 2, def: 0 });
  Object.assign(findPiece(b.s, knight)!, { x: 1, y: 0, hp: 180, maxHp: 200 });
  const cast = () => { b.ap = 5; b.hand = ['plate']; return playCard(b, 0, rook); };
  return { b, rook, pawn, knight, cast };
};
describe('고참 보호 — 신병·실제 흡수·되감기', () => {
  it('낮은 체력 비율의 상하좌우 영구 동료에게만 +6, 턴에 한 번', () => {
    const { b, pawn, knight, cast } = sharing();
    cast(); expect(findPiece(b.s, pawn)!.shield).toBe(8); expect(findPiece(b.s, knight)!.shield).toBe(0);
    cast(); expect(findPiece(b.s, pawn)!.shield).toBe(8);
    expect(b.protection ?? {}).toEqual({});
  });
  it('3승 이전·임시 동료·대각선은 제외하고 유효 이웃이 생기면 발동한다', () => {
    const { b, rook, pawn, knight, cast } = sharing();
    b.squadWins![rook] = 2; cast(); expect(b.once).not.toContain('sharedPlate');
    b.squadWins![rook] = 3;
    b.squadIds = b.squadIds.filter((id) => id !== pawn);
    Object.assign(findPiece(b.s, knight)!, { x: 1, y: 1 }); cast(); expect(b.once).not.toContain('sharedPlate');
    Object.assign(findPiece(b.s, knight)!, { x: 1, y: 0 }); cast(); expect(b.once).toContain('sharedPlate');
  });
  it.each([[3, 1], [12, 6]])('적 피해 %i: 먼저 받은 판부터 소모하며 고참의 몫 %i만 기록한다', (damage, protectedAmount) => {
    const { b, rook, pawn, cast } = sharing(); cast();
    const foe = b.s.pieces.find((p) => p.side === 1 && p.type === 'P')!;
    foe.type = 'R';
    b.s.pieces = b.s.pieces.filter((p) => p.side === 0 || p.type === 'K' || p.id === foe.id);
    Object.assign(foe, { x: 0, y: 4, atk: damage });
    b.intents = [{ pieceId: foe.id, to: { x: 0, y: 3 } }];
    endTurn(b);
    expect(b.protection?.[rook]).toBe(protectedAmount);
    expect(findPiece(b.s, pawn)!.shield).toBe(Math.max(0, 8 - damage));
    const veteran = growCrew(b, { t: 'R', wins: 3, protectedDamage: 10 }, rook, 30);
    expect(veteran.protectedDamage).toBe(10 + protectedAmount);
    expect(veteran.wins).toBe(3);
  });
  it('공성에 소모한 판은 동료를 보호한 실적으로 세지 않는다', () => {
    const { b, rook, pawn } = setup(['sharedPlate', 'siegeLatch']);
    Object.assign(findPiece(b.s, pawn)!, { x: 1, y: 0 });
    findPiece(b.s, rook)!.shield = 0; b.squadWins![pawn] = 3;
    b.hand = ['plate']; playCard(b, 0, pawn);
    expect(findPiece(b.s, rook)!.shield).toBe(6);
    play(b, 'rookLine', rook, { x: 0, y: 1 });
    expect(findPiece(b.s, rook)!.shield).toBe(0);
    expect(b.protection?.[pawn] ?? 0).toBe(0);
  });
  it('내 밀치기가 동료에게 낸 충돌 피해는 보호 실적이 아니다', () => {
    const { b, rook, pawn, knight } = setup(['sharedPlate']);
    Object.assign(findPiece(b.s, pawn)!, { x: 0, y: 4, hp: 100, maxHp: 100, shield: 0 });
    Object.assign(findPiece(b.s, knight)!, { x: 1, y: 4 }); b.squadWins![knight] = 3;
    const other = b.s.pieces.find((p) => p.side === 1 && p.x === 0 && p.y === 4)!;
    other.x = 4; other.y = 5;
    b.hand = ['plate']; playCard(b, 0, knight);
    expect(findPiece(b.s, pawn)!.shield).toBe(6);
    play(b, 'rookCharge', rook, { x: 0, y: 1 });
    expect(findPiece(b.s, pawn)!.shield).toBe(0);
    expect(b.protection?.[knight] ?? 0).toBe(0);
  });
  it('복제·되감기는 방열판 출처와 공적을 같이 되돌린다', () => {
    const { b, pawn, cast } = sharing(); b.snap = JSON.stringify({ ...b, snap: '' }); cast();
    expect(b.shieldSources?.[pawn]?.some((entry) => entry.by !== null)).toBe(true);
    expect(JSON.parse(JSON.stringify(b)).shieldSources).toEqual(b.shieldSources);
    const back = rewind(b) as SliceBattle; expect(back.shieldSources).toBeUndefined(); expect(back.protection).toBeUndefined();
    expect(findPiece(back.s, pawn)!.shield).toBe(2);
  });
});

describe('획득 경로와 실제 피해 기록', () => {
  it('완성급 황금 부품은 시작 꾸러미로 우회 지급하지 않는다', () => {
    expect(KITS.every((kit) => PART_GRADE[kit.part] !== 'gold')).toBe(true);
    expect(KITS.some((kit) => kit.part === 'relayGear')).toBe(true);
    expect(KITS.some((kit) => kit.part === 'horseshoe')).toBe(true);
    expect(KITS.some((kit) => kit.part === 'siegeLatch')).toBe(true);
  });
  it('혼성의 null 축도 일반 보조품 공급에 연결하고 첫 상점 뒤에는 풀을 제한하지 않는다', () => {
    const pool: SlicePartId[] = ['magnet', 'sergeant', 'relaySeal'];
    expect(firstShopParts(pool, ['relayGear'], 0)).toEqual(['sergeant']);
    expect(firstShopParts(pool, ['relayGear'], 1)).toEqual(pool);
    expect(partFits('relaySeal', ['K', 'N'], [])).toBe(false);
    expect(partFits('sharedPlate', ['K', 'R'], [], [{ t: 'R', wins: 2 }])).toBe(false);
  });
  it('등급 밖의 물건을 만들지 않고 상성·전환 후보 모두를 남기며 같은 시드는 같은 제안을 낸다', () => {
    const pool: SlicePartId[] = ['sergeant', 'whistle'];
    expect(buildAffinity('sergeant', ['relayGear'])).toBe(true);
    const chosen = Array.from({ length: 200 }, (_, seed) => chooseBuildPart(pool, ['relayGear'], new Rng(seed), true));
    expect(new Set(chosen)).toEqual(new Set(pool));
    expect(chosen.filter((id) => id === 'sergeant').length).toBeGreaterThan(110);
    for (let seed = 0; seed < 20; seed++) expect(chooseBuildPart(pool, ['relayGear'], new Rng(seed), true)).toBe(chosen[seed]);
    const cards = Array.from({ length: 200 }, (_, seed) => chooseBuildCard(['knightRaid', 'kingBlow'], ['horseshoe'], new Rng(seed)));
    expect(new Set(cards)).toEqual(new Set(['knightRaid', 'kingBlow']));
  });
  it('피해 기록은 방열판·과잉 피해를 제외한 실제 HP 감소이며 신병은 승리 이력을 물려받지 않는다', () => {
    const { b, rook } = setup([]); findPiece(b.s, rook)!.atk = 100;
    const victim = b.s.pieces.find((p) => p.x === 0 && p.y === 3)!;
    victim.hp = 10; victim.shield = 7;
    play(b, 'rookLine', rook, { x: 0, y: 1 }); expect(b.pd?.[rook]).toBe(10);
    b.s.winner = 0;
    const veteran = growCrew(b, { t: 'R', serial: '#R-001', wins: 2 }, rook, 20);
    expect(veteran.wins).toBe(3); expect(veteran.dmg).toBe(10);
    const fresh = newSliceBattle([{ t: 'K' }, { t: 'R', serial: '#R-002' }], ['K'], [], 7);
    expect(fresh.squadWins?.[fresh.squadIds[1]]).toBe(0);
  });
});

describe('나이트 완성 조합 — 처치가 다음 행동을 연다', () => {
  it('기습→피의 질주: 실제 두 처치로 태엽·손패를 잇고 표적이 사라지면 재료만으로 공격하지 못한다', () => {
    const { b, knight } = setup(['horseshoe', 'magnet']);
    for (const p of b.s.pieces) if (p.side === 1 && p.type !== 'K') p.hp = 10;
    b.ap = 3; b.hand = ['knightRaid', 'rebound']; b.draw = ['hoofKick', 'leap', 'advance'];
    const first = playCard(b, 0, knight, { x: 3, y: 2 });
    expect(typeof first).toBe('object'); expect(b.ap).toBe(4); expect(b.hand.length).toBe(3);
    const next = b.hand.indexOf('rebound');
    expect(next).toBeGreaterThanOrEqual(0);
    const result = playCard(b, next, knight, { x: 2, y: 4 });
    // 편자는 턴에 한 번 (2026-11-14 #29) — 두 번째 처치는 태엽을 더 주지 않는다
    expect(typeof result).toBe('object'); expect(b.ap).toBe(4); expect(b.kills).toBe(2);
    expect(b.hand.length).toBe(3);
    expect(PART_GRADE.magnet).toBe('rare');
  });
});
