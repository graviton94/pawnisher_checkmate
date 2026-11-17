import { describe, expect, it } from 'vitest';
import { endTurn, liveIntents, newSliceBattle } from '../src/slice/battle';
import { battleFor } from '../src/slice/run';
import { SLICE, START_DECK } from '../src/slice/cards';
import { FOE_AI } from '../src/data/battle';
import { Rng } from '../src/engine/rng';

/** 적 AI 태엽 쓰기 (피드백 #10 · 2026-11-14): 수를 하나씩 이어 짜 태엽 3을 쓰고, 한 기물이 두 번 움직일 수 있다 — 예고 = 실행 */
const battles = function* (cornered = false) {
  for (let seed = 1; seed <= 40; seed++) {
    const d = battleFor(((seed % 3) + 1) as 1 | 2 | 3, 'battle', new Rng(seed), 0);
    // 몰린 적: 두 번째 행동은 킹 말고 FOE_AI.repeatFoes기 이하가 남았을 때만 — 그 편성을 바로 세운다 (D-542 적 폰 +1 뒤로 4턴 안에 그 수까지 줄지 않는다)
    const enemy = cornered ? ['K', ...d.enemy.filter((t) => t !== 'K').slice(0, FOE_AI.repeatFoes)] as typeof d.enemy : d.enemy;
    yield newSliceBattle([{ t: 'K' }, { t: 'P' }, { t: 'N' }, { t: 'R' }] as never, enemy, START_DECK, seed, { enemyKingHp: d.kingHp, width: d.w, height: d.h, guard: d.guard });
  }
};

describe('적 AI 태엽 쓰기', () => {
  it('적 차례마다 태엽을 거의 다 쓰고, 통째로 쉬는 차례가 없다', () => {
    let ap = 0, n = 0, idle = 0;
    for (const b of battles()) for (let t = 0; t < 4 && b.s.winner === null; t++) {
      const li = liveIntents(b);
      ap += li.reduce((a, it) => a + SLICE.moveCost[b.s.pieces.find((p) => p.id === it.pieceId)!.type], 0);
      n++;
      if (!li.length) idle++;
      endTurn(b, true);
    }
    expect(ap / n).toBeGreaterThan(2.5);
    expect(idle).toBe(0);
  });
  it('한 기물이 두 번째 행동을 하기도 하고, 실제로 움직인 순서가 예고 순서와 같다', () => {
    let twice = 0;
    for (const b of [...battles(), ...battles(true)]) for (let t = 0; t < 4 && b.s.winner === null; t++) {
      const li = liveIntents(b);
      if (new Set(li.map((it) => it.pieceId)).size < li.length) twice++;
      const { events } = endTurn(b, true) as { events: { type: string; pieceId?: number; to?: { x: number; y: number } }[] };
      const moved = events.filter((e) => e.type === 'move' && li.some((it) => it.pieceId === e.pieceId)).map((e) => `${e.pieceId}@${e.to!.x},${e.to!.y}`);
      expect(moved).toEqual(li.map((it) => `${it.pieceId}@${it.to.x},${it.to.y}`));
    }
    expect(twice).toBeGreaterThan(0);
  });
});
