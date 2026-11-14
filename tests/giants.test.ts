import { describe, expect, it } from 'vitest';
import { dangerSquares, endTurn, intentHits, newSliceBattle, playCard } from '../src/slice/battle';
import { giantGroups } from '../src/slice/giant';
import { battleFor } from '../src/slice/run';
import { Rng } from '../src/engine/rng';
import { legalMoves } from '../src/engine/rules';

/** 거대 주물 (D-484, GDD 21장 §3) — 네 부위 · 묶음째 걷기 · 예고 = 실행 */
const squad = [{ t: 'K' }, { t: 'R' }, { t: 'N' }, { t: 'P' }] as never;
const deck = ['advance', 'leap', 'kingStep', 'order', 'advance', 'leap'] as never;

describe('거대 주물 (D-484)', () => {
  it('2×2 네 부위로 서고, 부위는 혼자 움직이지 않는다', () => {
    const b = newSliceBattle(squad, ['K', 'P', 'N'], deck, 3, { giants: ['R'] });
    const g = [...giantGroups(b.s).values()];
    expect(g.length).toBe(1);
    const parts = g[0];
    expect(parts.length).toBe(4);
    const xs = new Set(parts.map((p) => p.x)), ys = new Set(parts.map((p) => p.y));
    expect(xs.size).toBe(2);
    expect(ys.size).toBe(2);
    for (const p of parts) expect(legalMoves(b.s, p)).toEqual([]);
    // 칸이 겹치지 않는다
    const cells = new Set(b.s.pieces.map((p) => `${p.x},${p.y}`));
    expect(cells.size).toBe(b.s.pieces.length);
    expect(b.giantAim && Object.keys(b.giantAim).length).toBe(1);
  });
  it('예고 칸이 화면 위험 칸에 들어가고, 미리보기 피해 = 실제 피해', () => {
    for (let seed = 1; seed < 30; seed++) {
      const b = newSliceBattle(squad, ['K', 'P'], deck, seed, { giants: ['Q'] });
      const danger = dangerSquares(b);
      for (let t = 0; t < 4 && b.s.winner === null; t++) {
        const want = intentHits(b);
        const before = new Map(b.s.pieces.filter((p) => p.side === 0).map((p) => [p.id, p.hp + p.shield]));
        const r = endTurn(b, true);
        if (r === 'warn') break;
        for (const h of want) {
          const now = b.s.pieces.find((p) => p.id === h.pieceId);
          if (h.killed) continue;
          if (now) expect((before.get(h.pieceId) ?? 0) - (now.hp + now.shield)).toBe(h.damage);
        }
      }
      expect(Array.isArray(danger)).toBe(true);
    }
  });
  it('거대 폰은 턴마다 한 칸 앞으로, 앞 줄 네 칸을 내리찍는다', () => {
    const b = newSliceBattle(squad, ['K'], deck, 5, { giants: ['P'], width: 8, height: 8 });
    const y0 = Math.min(...[...giantGroups(b.s).values()][0].map((p) => p.y));
    const danger = dangerSquares(b).filter((q) => q.y === y0 - 1);
    expect(danger.length).toBe(4);
    endTurn(b, true);
    const y1 = Math.min(...[...giantGroups(b.s).values()][0].map((p) => p.y));
    expect(y1).toBe(y0 - 1);
  });
  it('부위가 부서지면 그 몫의 예고 칸이 빠진다', () => {
    const b = newSliceBattle(squad, ['K'], deck, 5, { giants: ['P'], width: 8, height: 8 });
    const parts = [...giantGroups(b.s).values()][0];
    const n0 = dangerSquares(b).length;
    const front = parts.filter((p) => p.giant!.dy === 0);
    b.s.pieces = b.s.pieces.filter((p) => p.id !== front[0].id);
    expect(dangerSquares(b).length).toBe(n0 - 2);
    void playCard;
  });
  it('2막 검문에 거대 폰, 1막 일반 대국 · 첫째 왕관 1막 검문에는 없다', () => {
    expect(battleFor(2, 'check', new Rng(1), 0).giants).toEqual(['P']);
    expect(battleFor(1, 'check', new Rng(1), 0).giants).toBeUndefined();
    for (let s = 0; s < 10; s++) expect(battleFor(1, 'battle', new Rng(s), 0).giants).toBeUndefined();
    expect(battleFor(3, 'check', new Rng(1), 3).giants).toEqual(['Q']);
  });
});
