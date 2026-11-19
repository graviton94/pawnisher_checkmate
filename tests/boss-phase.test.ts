/**
 * 반장 1단계 · 2단계 끝 연출 회귀 (D-690, 사용자: 「반장 죽으면 엔딩 이펙트 중복으로 터지고」).
 * 원인: 반장이 처음 쓰러질 때 엔진이 넣은 승패 사건(gameOver)이 2단계로 다시 서도 남아 있어, 판이 1단계에서 승리 소리 · 킹 마무리
 * (레터박스 · 왕관)를 한 번, 진짜 격파에서 또 한 번 틀었다. 이제 1단계 쓰러짐에는 승패 사건이 없고 판은 무릎 꿇음만 보인다.
 */
import { describe, expect, it } from 'vitest';
import { cardMoves, cardPieces, newSliceBattle, playCard, previewPlay, type SliceBattle } from '../src/slice/battle';
import { START_COMMANDS } from '../src/slice/cards';
import { gameOvers, risenIds } from '../src/view/bossphase';
import type { BattleEvent } from '../src/engine';

const king = (b: SliceBattle) => b.s.pieces.find((p) => p.side === 1 && p.type === 'K' && p.body === undefined)!;
/** 반장 킹을 치는 수 하나를 찾아 둔다 (내 기물 공격을 크게 해 한 대에 쓰러지게) */
const killKing = (b: SliceBattle): { events: BattleEvent[] } | null => {
  const k = king(b);
  k.hp = 1;
  k.shield = 0;
  for (const p of b.s.pieces) if (p.side === 0) p.atk = 999;
  for (let i = 0; i < b.hand.length; i++)
    for (const p of cardPieces(b, i))
      for (const to of cardMoves(b, i, p.id))
        if (previewPlay(b, i, p.id, to)?.events.some((e) => e.type === 'attack' && e.hits.some((h) => h.targetId === k.id && h.killed))) {
          const r = playCard(b, i, p.id, to);
          return typeof r === 'string' ? null : r;
        }
  return null;
};

describe('반장 2단계 끝 연출은 한 번 (D-690)', () => {
  for (const rule of ['plate', 'thorns', 'inspect'] as const) {
    it(`${rule}: 1단계 쓰러짐에는 승패 사건이 없고 같은 킹이 다시 선다 · 진짜 격파에 승패 사건 하나`, () => {
      let hit = false;
      for (let seed = 1; seed <= 12 && !hit; seed++) {
        const b = newSliceBattle([{ t: 'K' }, { t: 'R' }, { t: 'B' }, { t: 'N' }], ['K', 'P'], [...START_COMMANDS, 'rookLine', 'rookLine'], seed, { boss: true, bossRule: rule });
        b.ap = 99;
        const id = king(b).id;
        const r1 = killKing(b);
        if (!r1) continue;
        hit = true;
        expect(b.phase2).toBe(true);
        expect(b.s.winner).toBeNull();
        expect(gameOvers(r1.events)).toBe(0);
        expect(risenIds(r1.events).has(id)).toBe(true);
        // 2단계 반장을 다시 쓰러뜨린다 — 이번에는 끝
        b.ap = 99;
        const r2 = killKing(b);
        if (!r2) continue;
        expect(b.s.winner).toBe(0);
        expect(gameOvers(r2.events)).toBe(1);
        expect(risenIds(r2.events).size).toBe(0);
      }
      expect(hit).toBe(true);
    });
  }
});
