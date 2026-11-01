import { it } from 'vitest';
import { cardMoves, cardPieces, endTurn, intentHits, newSliceBattle, playCard, previewPlay, squadAfter, type Squad } from '../src/slice/battle';
import { COMMANDS, START_COMMANDS } from '../src/slice/cards';
import { kingOf } from '../src/engine';

/** 수직 조각 봇: 손패에서 처치 > 피해 > 위험 칸 벗어나기 순으로 탐욕적으로 둔다 */
it('slice', () => {
  const N = Number(process.env.SIM_GAMES ?? 100);
  const res = [0, 0].map(() => ({ win: 0, turns: 0, n: 0 }));
  for (let g = 0; g < N; g++) {
    let squad: Squad[] = [{ t: 'K' }, { t: 'P' }, { t: 'P' }, { t: 'N' }, { t: 'B' }];
    const battles = [{ e: ['K', 'P', 'P', 'N'] as const, k: 0.6 }, { e: ['K', 'P', 'P', 'B', 'R'] as const, k: 0.65 }];
    for (let bi = 0; bi < 2; bi++) {
      const b = newSliceBattle(squad, [...battles[bi].e], START_COMMANDS, 1000 + g * 7 + bi, { enemyKingHp: battles[bi].k });
      let guard = 0;
      while (b.s.winner === null && guard++ < 40) {
        for (let step = 0; step < 6; step++) {
          let best: { i: number; p: number; to: { x: number; y: number }; sc: number } | null = null;
          b.hand.forEach((id, i) => {
            if (COMMANDS[id].kind !== 'move') return;
            for (const p of cardPieces(b, i)) for (const to of cardMoves(b, i, p.id)) {
              const sim = previewPlay(b, i, p.id, to);
              if (!sim) continue;
              let sc = 0;
              for (const e of sim.events) if (e.type === 'attack') for (const h of e.hits) sc += h.killed ? 60 : h.damage;
              if (sim.state.winner === 0) sc += 1000;
              // 칠 게 없으면 적 킹 쪽으로 (다가가기), 예고된 칸은 피한다
              const ek = kingOf(b.s, 1);
              if (ek) sc += (Math.max(Math.abs(p.x - ek.x), Math.abs(p.y - ek.y)) - Math.max(Math.abs(to.x - ek.x), Math.abs(to.y - ek.y))) * 3;
              if (sc > (best?.sc ?? 0.5)) best = { i, p: p.id, to, sc };
            }
          });
          if (!best) break;
          const bb = best as { i: number; p: number; to: { x: number; y: number } };
          playCard(b, bb.i, bb.p, bb.to);
          if (b.s.winner !== null) break;
        }
        if (b.s.winner !== null) break;
        endTurn(b, true);
      }
      res[bi].n++;
      res[bi].turns += b.turn;
      if (b.s.winner === 0) {
        res[bi].win++;
        squad = squadAfter(b, squad);
      } else break;
      void kingOf;
      void intentHits;
    }
  }
  for (let i = 0; i < 2; i++) console.log(`판 ${i + 1}: ${res[i].n}판 승률 ${Math.round((res[i].win / res[i].n) * 100)}% 평균 ${(res[i].turns / res[i].n).toFixed(1)}턴`);
}, 600000);
