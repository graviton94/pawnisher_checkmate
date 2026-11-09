import { describe, expect, it } from 'vitest';
import { endTurn, intentHits, intentRows, newSliceBattle } from '../src/slice/battle';
import { START_COMMANDS } from '../src/slice/cards';

// 오른쪽 레일 적 의도 목록 (패스 4 D-396): 판 위 예고(intentHits)와 같은 계산이어야 한다 — 화면 = 실행
const squad = [{ t: 'K' as const }, { t: 'P' as const }, { t: 'N' as const }];
const mk = (seed: number) => newSliceBattle(squad, ['K', 'P', 'P', 'N', 'B'], START_COMMANDS, seed, { enemyKingHp: 0.8 });

describe('intentRows', () => {
  it('맞을 피해 합이 판 위 예고와 같다', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const b = mk(seed);
      for (let turn = 0; turn < 3 && b.s.winner === null; turn++) {
        const rows = intentRows(b);
        const listed = rows.flatMap((r) => r.hits).reduce((a, h) => a + h.damage, 0);
        const board = intentHits(b).reduce((a, h) => a + h.damage, 0);
        expect(listed).toBe(board);
        // 한 적은 한 줄 (공격 · 다가옴은 합쳐진다)
        const ids = rows.filter((r) => r.kind === 'attack' || r.kind === 'approach').map((r) => r.pieceId);
        expect(new Set(ids).size).toBe(ids.length);
        const r = endTurn(b);
        if (r === 'warn') endTurn(b);
      }
    }
  });
  it('목록을 만들어도 대국 상태는 그대로다', () => {
    const b = mk(3);
    const before = JSON.stringify(b);
    intentRows(b);
    expect(JSON.stringify(b)).toBe(before);
  });
});
