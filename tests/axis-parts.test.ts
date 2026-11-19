import { describe, expect, it } from 'vitest';
import { cardCond, cardMoves, cardPieces, endTurn, loneFoeKing, newSliceBattle, planEnemy, playCard, previewPlay, type SliceBattle } from '../src/slice/battle';
import { kingOf } from '../src/engine';
import { FOE_AI } from '../src/data/battle';
import type { CommandId } from '../src/slice/cards';
import { PART_GRADE, PART_NUM, SLICE_PARTS, type SlicePartId } from '../src/slice/parts';
import { STARTER_PARTS } from '../src/data/unlocks';
import { partSummaryText } from '../src/data/ability-text';
import type { PieceType } from '../src/engine';

/**
 * 축 규칙 부품 (D-662, 결정 12가 — 출시 전 지배 전략 완화): 축마다 희귀 하나.
 * 글(desc)의 수치 = 엔진 수치(PART_NUM) · 같은 판에서 부품이 있을 때만 규칙이 바뀐다.
 */
const NEW: SlicePartId[] = ['leadSpur', 'pikeRow', 'shieldEdge', 'quench', 'ramRod', 'snareFork'];
type Place = { side: 0 | 1; t: PieceType; x: number; y: number };
const make = (squad: PieceType[], enemy: PieceType[], deck: CommandId[], place: Place[], parts: SlicePartId[] = []): SliceBattle => {
  const b = newSliceBattle(squad.map((t) => ({ t })), enemy, deck, 7, { width: 6, height: 6, parts, place, ordered: true, shock: false, guard: 0 });
  b.ap = 9;
  return b;
};
/** 손패 i번 카드로 그 기물이 낼 수 있는 수 중 적에게 준 피해가 가장 큰 수 (피해 · 칸) */
const best = (b: SliceBattle, i: number, t: PieceType): { dmg: number; to?: { x: number; y: number }; id: number } => {
  const p = cardPieces(b, i).find((q) => q.type === t)!;
  let out = { dmg: 0, to: undefined as { x: number; y: number } | undefined, id: p.id };
  for (const to of cardMoves(b, i, p.id)) {
    const sim = previewPlay(b, i, p.id, to);
    if (!sim) continue;
    const dmg = sim.events.reduce((a, e) => a + (e.type === 'attack' || e.type === 'blast' ? e.hits.filter((h) => b.s.pieces.find((q) => q.id === h.targetId)?.side === 1).reduce((x, h) => x + h.damage, 0) : 0), 0);
    if (dmg > out.dmg) out = { dmg, to, id: p.id };
  }
  return out;
};

describe('지배 조합 상한 (D-664)', () => {
  it('잔열은 연쇄 1/4를 넘기되 최대 2 · 폭주 코일 상한 ×3', () => {
    const place: Place[] = [{ side: 0, t: 'K', x: 0, y: 0 }, { side: 1, t: 'K', x: 5, y: 5 }];
    const b = make(['K'], ['K'], ['kingStep'], place, ['afterheat']);
    b.kills = 20;
    endTurn(b, true);
    if (b.s.winner === null) expect(b.kills).toBe(PART_NUM.afterheatCap);
    expect(PART_NUM.coilCap).toBe(3);
    expect(SLICE_PARTS.coil.desc).toContain(`최대 ×${PART_NUM.coilCap}`);
    expect(SLICE_PARTS.afterheat.desc).toContain(`최대 ${PART_NUM.afterheatCap}`);
  });
});

describe('홀로 남은 적 킹 (D-663)', () => {
  it('반장이 아닌 판에서 적 킹 하나만 남으면 한 차례에 한 번만 움직인다 — 예고 = 실행', () => {
    const place: Place[] = [{ side: 0, t: 'K', x: 2, y: 0 }, { side: 0, t: 'N', x: 3, y: 0 }, { side: 0, t: 'P', x: 1, y: 1 }, { side: 1, t: 'K', x: 2, y: 3 }];
    const b = make(['K', 'N', 'P'], ['K'], ['kingStep'], place);
    expect(loneFoeKing(b.s)).toBe(true);
    expect(loneFoeKing(b.s, true)).toBe(false);
    const plan = planEnemy(b.s, 5);
    expect(plan.filter((it) => it.pieceId === kingOf(b.s, 1)!.id).length).toBeLessThanOrEqual(FOE_AI.loneActs);
    // 반장 판이면 그대로 두 번까지
    expect(FOE_AI.loneActs).toBeLessThan(FOE_AI.perPiece);
  });
});

describe('축 규칙 부품 (D-662)', () => {
  it('축마다 하나씩 · 모두 희귀 · 처음 풀에 있다 · 글 문법(효과 — 조건)', () => {
    expect(new Set(NEW.map((id) => SLICE_PARTS[id].axis))).toEqual(new Set(['cav', 'inf', 'king', 'chain', 'push', 'tactic']));
    for (const id of NEW) {
      expect(PART_GRADE[id]).toBe('rare');
      expect(STARTER_PARTS).toContain(id);
      expect(partSummaryText(id).description).not.toBe('');
    }
    expect(SLICE_PARTS.leadSpur.desc).toContain(`×${PART_NUM.leadSpur}`);
    expect(SLICE_PARTS.pikeRow.desc).toContain(`+${PART_NUM.pikeRow}`);
    expect(SLICE_PARTS.shieldEdge.desc).toContain(`피해 ${PART_NUM.shieldEdge}`);
    expect(SLICE_PARTS.quench.desc).toContain(`+${PART_NUM.quench} · 최대 +${PART_NUM.quenchCap}`);
    expect(SLICE_PARTS.ramRod.desc).toContain(`×${PART_NUM.ramRod}`);
  });

  it('선두 박차: 턴의 첫 공격만 나이트 피해 ×2', () => {
    const place: Place[] = [{ side: 0, t: 'N', x: 2, y: 1 }, { side: 0, t: 'K', x: 0, y: 0 }, { side: 1, t: 'K', x: 5, y: 5 }, { side: 1, t: 'P', x: 2, y: 3 }];
    const a = best(make(['K', 'N'], ['K', 'P'], ['leap'], place), 0, 'N').dmg;
    const b = make(['K', 'N'], ['K', 'P'], ['leap'], place, ['leadSpur']);
    expect(a).toBeGreaterThan(0);
    expect(best(b, 0, 'N').dmg).toBeGreaterThanOrEqual(Math.floor(a * PART_NUM.leadSpur) - 1);
    b.hitIds = [999]; // 이번 턴 이미 친 뒤
    expect(best(b, 0, 'N').dmg).toBe(a);
  });

  it('창끝 대열: 내려앉을 칸 곁의 폰마다 폰 공격 +5', () => {
    const place: Place[] = [{ side: 0, t: 'P', x: 2, y: 1 }, { side: 0, t: 'K', x: 0, y: 0 }, { side: 1, t: 'K', x: 5, y: 5 }, { side: 1, t: 'P', x: 3, y: 3 }];
    const alone = make(['K', 'P'], ['K', 'P'], ['advance'], place);
    const a = best(alone, 0, 'P');
    const b = make(['K', 'P', 'P'], ['K', 'P'], ['advance'], [...place, { side: 0, t: 'P', x: 1, y: 1 }], ['pikeRow']);
    // 같은 폰(2,1)을 옮긴다 — 곁(1,1)에 폰이 있으면 그만큼 더 세다
    const p = b.s.pieces.find((q) => q.side === 0 && q.type === 'P' && q.x === 2 && q.y === 1)!;
    const sim = a.to && previewPlay(b, 0, p.id, a.to);
    const dmg = sim ? sim.events.reduce((s, e) => s + (e.type === 'attack' ? e.hits.reduce((x, h) => x + h.damage, 0) : 0), 0) : 0;
    expect(a.dmg).toBeGreaterThan(0);
    expect(dmg).toBeGreaterThan(a.dmg);
  });

  it('방패 모서리: 킹 공격이 방열판을 피해로 · 턴에 한 번', () => {
    const place: Place[] = [{ side: 0, t: 'K', x: 2, y: 2 }, { side: 1, t: 'K', x: 5, y: 5 }, { side: 1, t: 'P', x: 3, y: 3 }];
    const a = make(['K'], ['K', 'P'], ['kingStep', 'kingStep'], place);
    const b = make(['K'], ['K', 'P'], ['kingStep', 'kingStep'], place, ['shieldEdge']);
    for (const x of [a, b]) x.s.pieces.find((q) => q.side === 0 && q.type === 'K')!.shield = 30;
    const da = best(a, 0, 'K'), db = best(b, 0, 'K');
    expect(db.dmg).toBeGreaterThan(da.dmg);
    playCard(b, 0, db.id, db.to);
    expect(b.once).toContain('shieldEdge');
  });

  it('담금질 통: 턴을 끝낼 때 연쇄 1당 킹 방열판 +3 (최대 +12) — 적 차례 전에', () => {
    const place: Place[] = [{ side: 0, t: 'K', x: 0, y: 0 }, { side: 1, t: 'K', x: 5, y: 5 }];
    const b = make(['K'], ['K'], ['kingStep'], place, ['quench']);
    b.kills = 3;
    const r = endTurn(b, true);
    expect(r).not.toBe('warn');
    if (r !== 'warn') expect(r.events[0]).toMatchObject({ type: 'shield', amount: 3 * PART_NUM.quench });
    const c = make(['K'], ['K'], ['kingStep'], place, ['quench']);
    c.kills = 10;
    const r2 = endTurn(c, true);
    if (r2 !== 'warn') expect(r2.events[0]).toMatchObject({ type: 'shield', amount: PART_NUM.quenchCap });
  });

  it('쇠 밀대: 빈 칸으로 밀어내도 충돌 피해의 절반', () => {
    const place: Place[] = [{ side: 0, t: 'K', x: 2, y: 1 }, { side: 1, t: 'K', x: 5, y: 5 }, { side: 1, t: 'P', x: 2, y: 3 }];
    const a = make(['K'], ['K', 'P'], ['shove'], place);
    const b = make(['K'], ['K', 'P'], ['shove'], place, ['ramRod']);
    expect(best(b, 0, 'K').dmg).toBeGreaterThan(best(a, 0, 'K').dmg);
  });

  it('갈래 올가미: 포크 칸이면 친 적을 모두 묶는다 · 턴에 한 번', () => {
    const place: Place[] = [{ side: 0, t: 'N', x: 2, y: 0 }, { side: 0, t: 'K', x: 0, y: 0 }, { side: 1, t: 'K', x: 5, y: 5 }, { side: 1, t: 'P', x: 1, y: 3 }, { side: 1, t: 'B', x: 5, y: 3 }];
    const b = make(['K', 'N'], ['K', 'P', 'B'], ['knightFork'], place, ['snareFork']);
    for (const q of b.s.pieces) if (q.side === 1) q.hp = q.maxHp = 999; // 쓰러지지 않게 — 묶임은 산 적에게만
    const n = b.s.pieces.find((q) => q.side === 0 && q.type === 'N')!;
    const to = cardMoves(b, 0, n.id).find((q) => cardCond(b, 0, n.id, q).on);
    expect(to).toBeTruthy();
    const r = playCard(b, 0, n.id, to);
    expect(typeof r).not.toBe('string');
    expect((b.pinned ?? []).length).toBe(2);
    expect(b.once).toContain('snareFork');
  });
});
