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

import { legalMoves } from '../src/engine';

describe('승급 13 최종장 — 폰이 된 아홉째 (D-277)', () => {
  it('종이 왕관을 벗은 킹은 폰처럼 앞으로만 간다 (뒤 · 옆 없음)', () => {
    const b = newSliceBattle([{ t: 'K' }, { t: 'P' }], ['K', 'P'], START_COMMANDS, 3, { width: 6, height: 6 });
    const k = b.s.pieces.find((p) => p.side === 0 && p.type === 'K')!;
    const before = legalMoves(b.s, k);
    k.asPawn = true;
    const after = legalMoves(b.s, k);
    expect(before.length).toBeGreaterThan(after.length);
    const f = k.side === 0 ? 1 : -1;
    for (const m of after) expect(m.y - k.y === f || m.y - k.y === 2 * f).toBe(true);
  });
});

import { endTurn as endT2, playCard, liveIntents, cardMoves } from '../src/slice/battle';

describe('수읽기 카드 — 핀 · 포크 · 디스커버드 · 캐슬링 (D-281)', () => {
  const crewKR = [{ t: 'K' as const }, { t: 'R' as const }, { t: 'B' as const }, { t: 'P' as const }];
  it('캐슬링: 킹과 가장 가까운 룩이 자리를 바꾸고 둘 다 방열판', () => {
    const b = newSliceBattle(crewKR, ['K', 'P'], ['castle'], 3);
    const k = b.s.pieces.find((p) => p.side === 0 && p.type === 'K')!;
    const r = b.s.pieces.find((p) => p.side === 0 && p.type === 'R')!;
    const [kp, rp, ks] = [{ x: k.x, y: k.y }, { x: r.x, y: r.y }, k.shield];
    const i = b.hand.indexOf('castle');
    expect(typeof playCard(b, i)).not.toBe('string');
    expect({ x: k.x, y: k.y }).toEqual(rp);
    expect({ x: r.x, y: r.y }).toEqual(kp);
    expect(k.shield).toBeGreaterThan(ks);
  });
  it('디스커버드: 다음 공격 배율을 남긴다', () => {
    const b = newSliceBattle(crewKR, ['K', 'P'], ['bishopStep', 'bishopStep', 'bishopStep', 'bishopStep', 'bishopStep'], 3);
    const bi = b.s.pieces.find((p) => p.side === 0 && p.type === 'B')!;
    const i = b.hand.indexOf('bishopStep');
    const to = cardMoves(b, i, bi.id)[0];
    expect(to).toBeTruthy();
    playCard(b, i, bi.id, to);
    expect(b.nextMult).toBe(2);
  });
  it('핀: 친 적(킹 제외)은 이번 적 차례 예고에서 빠진다', () => {
    const b = newSliceBattle(crewKR, ['K', 'P'], START_COMMANDS, 3);
    const foe = b.s.pieces.find((p) => p.side === 1 && p.type !== 'K')!;
    b.pinned = [foe.id];
    expect(liveIntents(b).some((it) => it.pieceId === foe.id)).toBe(false);
    endT2(b, true);
    expect(b.pinned).toEqual([]);
  });
});

describe('부품 확장 (D-282)', () => {
  it('기물별 시작 부품: 두꺼운 성벽 · 기수의 등자 · 두꺼운 주물 · 선제 태엽', () => {
    const sq = [{ t: 'K' as const }, { t: 'R' as const }, { t: 'N' as const }, { t: 'P' as const }];
    const a = newSliceBattle(sq, ['K', 'P'], START_COMMANDS, 3);
    const b = newSliceBattle(sq, ['K', 'P'], START_COMMANDS, 3, { parts: ['thickWall', 'stirrup', 'thickCast', 'firstSpring'] });
    const f = (x: typeof a, t: string) => x.s.pieces.find((p) => p.side === 0 && p.type === t)!;
    expect(f(b, 'R').shield).toBeGreaterThan(f(a, 'R').shield);
    expect(f(b, 'N').shield).toBeGreaterThan(f(a, 'N').shield);
    expect(f(b, 'P').maxHp).toBeGreaterThan(f(a, 'P').maxHp);
    expect(b.ap).toBe(a.ap + 2);
  });
  it('잔열: 턴이 끝나도 연쇄 절반이 남는다', () => {
    const b = newSliceBattle(crewKR(), ['K', 'P'], START_COMMANDS, 3, { parts: ['afterheat'] });
    b.kills = 4;
    endT2(b, true);
    if (b.s.winner === null) expect(b.kills).toBe(2);
  });
});
describe('부품 확장 2차 (D-287)', () => {
  it('시작 부품: 방패벽 · 회반죽 · 붉은 눈금 · 냉각수 통 · 초시계', () => {
    const sq = [{ t: 'K' as const }, { t: 'R' as const }, { t: 'P' as const }];
    const a = newSliceBattle(sq, ['K', 'P'], START_COMMANDS, 3);
    const b = newSliceBattle(sq, ['K', 'P'], START_COMMANDS, 3, { parts: ['shieldWall', 'mortar', 'redLine', 'coolant', 'stopwatch'] });
    const f = (x: typeof a, t: string) => x.s.pieces.find((p) => p.side === 0 && p.type === t)!;
    expect(f(b, 'P').shield).toBeGreaterThan(f(a, 'P').shield);
    expect(f(b, 'R').maxHp).toBeGreaterThan(f(a, 'R').maxHp);
    expect(f(b, 'K').hp).toBeLessThan(f(a, 'K').hp);
    expect(b.noShock).toBe(true);
    expect(b.hand.length).toBe(a.hand.length + PART_NUM.stopwatch);
  });
  it('무거운 플라이휠: 남은 태엽 최대 2가 넘어간다', () => {
    const a = newSliceBattle(crewKR(), ['K', 'P'], START_COMMANDS, 3);
    const b = newSliceBattle(crewKR(), ['K', 'P'], START_COMMANDS, 3, { parts: ['flywheel'] });
    a.ap = 3; b.ap = 3;
    endT2(a, true);
    endT2(b, true);
    if (a.s.winner === null && b.s.winner === null) expect(b.ap).toBe(a.ap + 2);
  });
});
function crewKR() { return [{ t: 'K' as const }, { t: 'R' as const }, { t: 'B' as const }, { t: 'P' as const }]; }

import { STARTER_CARDS, STARTER_PARTS, UNLOCK_ORDER, nextUnlocks, unlockCount } from '../src/data/unlocks';
import { REWARD_COMMANDS as RC } from '../src/slice/cards';
import { PART_NUM, SLICE_PARTS as SP } from '../src/slice/parts';

describe('해금 (D-284)', () => {
  it('처음 풀 + 해금 순서 = 전체 풀, 겹침 없음', () => {
    const all = new Set([...STARTER_CARDS, ...STARTER_PARTS, ...UNLOCK_ORDER]);
    expect(all.size).toBe(RC.length + Object.keys(SP).length);
    for (const id of RC) expect(all.has(id)).toBe(true);
  });
  it('출하마다 2 ~ 6개, 순서대로', () => {
    expect(unlockCount(1, false)).toBe(2);
    expect(unlockCount(4, true)).toBe(6);
    expect(nextUnlocks([UNLOCK_ORDER[0]], 2)).toEqual(UNLOCK_ORDER.slice(1, 3));
  });
});

import { endTurn } from '../src/slice/battle';
describe('땜질 도구함 (D-299)', () => {
  it('턴 시작에 킹을 뺀 가장 다친 기물 둘만 고친다', () => {
    const b = newSliceBattle(crewKR(), ['K', 'P'], START_COMMANDS, 3, { parts: ['toolbox'] });
    b.intents = [];
    const mine = b.s.pieces.filter((p) => p.side === 0);
    const k = mine.find((p) => p.type === 'K')!;
    const [r, bi, p] = (['R', 'B', 'P'] as const).map((t) => mine.find((q) => q.type === t)!);
    k.hp = k.maxHp - 50; r.hp = r.maxHp - 20; bi.hp = bi.maxHp - 15; p.hp = p.maxHp - 3;
    const before = { k: k.hp, r: r.hp, bi: bi.hp, p: p.hp };
    endTurn(b, true);
    const hp = (id: number) => b.s.pieces.find((q) => q.id === id)!.hp;
    expect(hp(k.id)).toBe(before.k);
    expect(hp(r.id)).toBe(before.r + PART_NUM.toolbox);
    expect(hp(bi.id)).toBe(before.bi + PART_NUM.toolbox);
    expect(hp(p.id)).toBe(before.p);
  });
});
