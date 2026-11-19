import { describe, expect, it } from 'vitest';
import { findPiece } from '../src/engine';
import type { PieceType } from '../src/engine/types';
import { cardCond, cardMoves, costOf, newSliceBattle, partCond, playCard, previewPlay, type SliceBattle } from '../src/slice/battle';
import { autoPick } from '../src/slice/autopick';
import { COMMANDS, PUSH, START_DECK, type CommandDef, type CommandId } from '../src/slice/cards';
import { PART_NUM, SLICE_PARTS } from '../src/slice/parts';
import { allCardTexts } from '../src/slice/card-spec';
import { partSummaryText } from '../src/data/ability-text';

/**
 * 발동 유형 문법 (사용자 결정 D-592 — docs/reports/2026-11-18-card-trigger-types.md):
 * 조건 칸 끝말이 유형을 말한다 — 사건 「~ 시」 · 상태 「~면」 · 지속 「~인 동안」 · 비례 「~당」 · 기록 「~ 기록 …」 · 대가 = 빈 조건 + 첫 효과 「소모 · 바침 · 녹임」 · 상시 「장착 중」.
 * 글은 엔진이 실제로 하는 일과 같아야 한다 — 수치는 같은 데이터 상수에서 읽어 맞춘다.
 */
const base = (Object.entries(COMMANDS) as [CommandId, CommandDef][]).filter(([id]) => !/[+~]$/.test(id));
const fx = (id: CommandId): string => COMMANDS[id].desc.match(/\((.*)\)\s*$/)?.[1] ?? '';

describe('카드 글 = 엔진 (D-592 어긋남 고침)', () => {
  it('처치 연쇄 카드: 처치한 적을 적중 1 + (chainPerKill − 1)로 센다 → 「처치당 연쇄 +(n − 1)」', () => {
    const ids = base.filter(([, c]) => c.chainPerKill).map(([id]) => id);
    expect(ids.length).toBe(6);
    for (const id of ids) expect(fx(id), id).toContain(`처치당 연쇄 +${COMMANDS[id].chainPerKill! - 1}`);
  });
  it('처치 뽑기 카드: drawOnKill × 처치 수 → 「처치당 카드 +n」', () => {
    const ids = base.filter(([, c]) => c.drawOnKill).map(([id]) => id);
    expect(ids.length).toBe(5);
    for (const id of ids) expect(fx(id), id).toContain(`처치당 카드 +${COMMANDS[id].drawOnKill}`);
  });
  it('밀치기 카드는 모두 충돌 피해를 적는다 (PUSH.collide)', () => {
    const ids = base.filter(([, c]) => c.push).map(([id]) => id);
    expect(ids.length).toBeGreaterThanOrEqual(8);
    for (const id of ids) expect(fx(id), id).toContain(`충돌 시 피해 ${PUSH.collide}`);
  });
  it('처치 기물 태엽 0: 「이번 턴 처치했으면」(조건) 또는 「처치했으면 태엽 0」(부분 조건) — 「처치 턴」 · 「처치한 턴」 없음', () => {
    for (const [id, c] of base.filter(([, c]) => c.freeIfKiller)) {
      expect(fx(id), id).toMatch(/처치했으면/);
      expect(c.desc).not.toMatch(/처치 턴|처치한 턴/);
    }
  });
  it('포크 카드: 「피해 ×배율 — 두 적 이상 치면」 (배율 = fork)', () => {
    for (const [id, c] of base.filter(([, c]) => c.fork)) expect(fx(id), id).toBe(`피해 ×${c.fork} — 두 적 이상 치면`);
  });
  it('튐 카드에 「내려앉으면」이 없다 — 튐은 직접 적중이 있어야 난다(plan.ts landDmg > 0), 판 미리보기가 보인다', () => {
    for (const [id, c] of base.filter(([, c]) => c.carve === 'cross' || c.carve === 'diag')) expect(c.desc, id).not.toContain('내려앉으면');
  });
  it('도금 방패: 태엽은 다음 내 턴 시작에 든다', () => {
    expect(partSummaryText('gilded').effect).toBe('다음 턴 태엽 +1');
  });
  it('무사고 명판: 버팀을 안 쓰고 대국 cleanAt번 이상 — 대국 시작 때 최대 HP ×cleanHp', () => {
    expect(SLICE_PARTS.cleanSheet.desc).toBe(`HP +${Math.round((PART_NUM.cleanHp - 1) * 100)}% — 무사고 기록 ${PART_NUM.cleanAt}전↑면`);
    const max = (u: { defied?: number; battles?: number }, parts: string[] = ['cleanSheet']) => {
      const b = newSliceBattle([{ t: 'K' }, { t: 'N', ...u }], ['K', 'P'], START_DECK, 3, { parts: parts as never });
      return b.s.pieces.find((q) => q.id === b.squadIds[1])!.maxHp;
    };
    const plain = max({ battles: PART_NUM.cleanAt }, []);
    expect(max({ defied: 0, battles: PART_NUM.cleanAt })).toBe(Math.round(plain * PART_NUM.cleanHp));
    expect(max({ defied: 0, battles: PART_NUM.cleanAt - 1 })).toBe(plain);
    expect(max({ defied: 1, battles: PART_NUM.cleanAt + 3 })).toBe(plain);
  });
  it('기록 부품: 대국 시작 때 기록으로 정한다 — 칼자루 눈금은 회복이 아니라 최대 HP (처치 기록 1당)', () => {
    expect(SLICE_PARTS.notches.desc).toBe(`HP +${PART_NUM.notchHp} · 최대 +${PART_NUM.notchCap} — 처치 기록 1당`);
    const b = newSliceBattle([{ t: 'K' }, { t: 'N', kills: 4 }], ['K', 'P'], START_DECK, 3, { parts: ['notches'] });
    const b0 = newSliceBattle([{ t: 'K' }, { t: 'N', kills: 4 }], ['K', 'P'], START_DECK, 3, { parts: [] });
    const m = (x: SliceBattle) => x.s.pieces.find((q) => q.id === x.squadIds[1])!.maxHp;
    expect(m(b) - m(b0)).toBe(4 * PART_NUM.notchHp);
    for (const id of ['ledger', 'veteran', 'deathMark', 'notches', 'aceBadge', 'heavyHand', 'scarPlate', 'cleanSheet', 'sergeant'] as const)
      expect(partSummaryText(id).description, id).toMatch(/기록/);
  });
  it('대가 카드: 조건 칸은 비고 첫 효과가 대가(소모 · 바침 · 녹임)', () => {
    const t = Object.fromEntries(allCardTexts().filter((c) => c.nature === 'cmd').map((c) => [c.id, c.slots]));
    for (const id of ['vent', 'burst', 'recall', 'gambit', 'meltOath']) {
      expect(t[id].cond, id).toEqual([]);
      expect(t[id].effect[0], id).toMatch(/(소모|바침|녹임)$/);
    }
  });
  it('조건 칸 끝말 = 유형 — 「마다」는 턴 · 대국 되풀이에만, 「때 · 칠 때」 없음', () => {
    const bad = allCardTexts().flatMap((c) => c.slots.cond.filter((k) => /때$/.test(k) || (/마다$/.test(k) && !/^(턴|대국)마다$/.test(k))).map((k) => `${c.nature}:${c.id} ${k}`));
    expect(bad).toEqual([]);
  });
});

/** 판정 하나 (D-592): 나이트 (2,2) · 적 폰 둘을 포크 칸에 둔다 */
const setup = (hand: CommandId[], t: PieceType = 'N'): { b: SliceBattle; me: number } => {
  const b = newSliceBattle([{ t: 'K' }, { t }], ['K', 'P', 'P'], START_DECK, 11, { width: 6, height: 6 });
  const [king, me] = b.squadIds;
  const foes = b.s.pieces.filter((p) => p.side === 1).sort((a, z) => Number(z.type === 'K') - Number(a.type === 'K'));
  Object.assign(findPiece(b.s, king)!, { x: 0, y: 0 });
  Object.assign(findPiece(b.s, me)!, { x: 2, y: 2 });
  Object.assign(foes[0], { x: 5, y: 5 });
  for (const f of foes.slice(1)) Object.assign(f, { x: 9, y: 9 });
  b.intents = []; b.graze = []; b.grazeDanger = []; b.aimed = []; b.shocked = [];
  b.hand = hand;
  b.ap = 3;
  return { b, me };
};

describe('cardCond — 미리보기 · 비용 · 자동 고르기 · 표시가 같은 판정 (D-592)', () => {
  it('포크: 두 적 이상 치는 칸이 없으면 꺼짐, 있으면 켜짐 · 그 칸에서만 미리보기 배율', () => {
    const { b, me } = setup(['knightFork', 'leap']);
    const foes = b.s.pieces.filter((p) => p.side === 1 && p.type !== 'K');
    expect(cardCond(b, 0).on).toBe(false);
    // 적 폰 둘을 판 위 빈 칸 쌍에 놓아 보며 포크 칸이 생기는 자리를 찾는다 (행마 규칙을 테스트가 다시 짜지 않는다)
    const free = Array.from({ length: 36 }, (_, k) => ({ x: k % 6, y: Math.floor(k / 6) })).filter((q) => !b.s.pieces.some((p) => p.x === q.x && p.y === q.y));
    let lit = 0;
    search: for (const a of free) for (const z of free) {
      if (a === z) continue;
      Object.assign(foes[0], a); Object.assign(foes[1], z);
      if (cardCond(b, 0).on) { lit = 1; break search; }
    }
    expect(lit).toBe(1);
    const c = cardCond(b, 0);
    expect(c).toMatchObject({ on: true, why: 'fork' });
    expect(c.n).toBeGreaterThanOrEqual(1);
    expect(c.mult).toBe(COMMANDS.knightFork.fork);
    // 같은 칸의 미리보기 피해 = 도약 × fork (판정이 같다)
    const to = cardMoves(b, 0, me).find((q) => cardCond(b, 0, me, q).on)!;
    const dmg = (i: number) => previewPlay(b, i, me, to)!.events.flatMap((e) => (e.type === 'attack' && e.attackerId === me ? e.hits.map((h) => h.damage) : []));
    expect(dmg(0)[0]).toBeGreaterThan(dmg(1)[0]);
  });
  it('처치 기물: 이번 턴 처치한 그 기물이면 켜짐 — costOf 0 · 자동 고르기가 그 판정으로 잡는다', () => {
    const { b, me } = setup(['leap', 'rebound']);
    expect(cardCond(b, 1)).toMatchObject({ on: false });
    expect(costOf(b, 1, me)).toBe(1);
    b.killers = [me];
    expect(cardCond(b, 1)).toMatchObject({ on: true, why: 'killer' });
    expect(cardCond(b, 1, me).on).toBe(true);
    expect(cardCond(b, 1, b.squadIds[0]).on).toBe(false);
    expect(costOf(b, 1, me)).toBe(0);
    expect(b.hand[autoPick(b, me)!.i]).toBe('rebound');
  });
  it('연쇄 비례 · 대가: 연쇄 0이면 꺼짐, 3이면 켜짐 · 지금 배율', () => {
    const { b } = setup(['finisher', 'vent']);
    expect(cardCond(b, 0).on).toBe(false);
    expect(cardCond(b, 1).on).toBe(false);
    b.kills = 3;
    expect(cardCond(b, 0)).toMatchObject({ on: true, why: 'chain', n: 3, mult: 1 + 3 * COMMANDS.finisher.multPerKill! });
    expect(cardCond(b, 1)).toMatchObject({ on: true, why: 'spend', n: 3 });
  });
  it('사건 · 즉발 카드는 램프가 없다 (판이 금색 처치 · 충돌 미리보기로 이미 보인다)', () => {
    const { b } = setup(['hoofKick', 'shove', 'leap']);
    b.kills = 5; b.killers = b.squadIds;
    for (let i = 0; i < 3; i++) expect(cardCond(b, i).on).toBe(false);
  });
  it('부품 상태: 마지막 축은 킹 HP 30% 미만인 동안 · 반장 사냥꾼은 반장 대국인 동안', () => {
    const { b } = setup(['leap']);
    b.parts = ['lastAxle', 'bossBane'];
    const k = findPiece(b.s, b.squadIds[0])!;
    expect(partCond(b, k.id)).toEqual([]);
    k.hp = Math.floor(k.maxHp * PART_NUM.lastAxleAt) - 1;
    b.boss = true;
    expect(partCond(b, k.id)).toEqual(['lastAxle', 'bossBane']);
  });
  it('결정론: 판정은 상태를 바꾸지 않는다', () => {
    const { b, me } = setup(['knightFork', 'rebound']);
    const snap = JSON.stringify(b);
    cardCond(b, 0); cardCond(b, 1, me); partCond(b, me, { x: 3, y: 4 }, 0);
    expect(JSON.stringify(b)).toBe(snap);
    expect(typeof playCard).toBe('function');
  });
});
