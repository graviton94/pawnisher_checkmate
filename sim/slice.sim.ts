import { it } from 'vitest';
import { canPlay, cardMoves, cardPieces, endTurn, isInstant, newSliceBattle, playCard, previewPlay, restSquad, squadAfter, type Squad } from '../src/slice/battle';
import { COMMANDS, REWARD_COMMANDS, START_COMMANDS, type CommandId } from '../src/slice/cards';
import { SLICE_PARTS, type SlicePartId } from '../src/slice/parts';
import { kingOf, type PieceType } from '../src/engine';
import { Rng } from '../src/engine/rng';

/** 수직 조각 봇 (D-144 구조 확인): 부품 하나로 시작 · 카드 보상 · 검문! 뒤 부품 하나 · 4판. 탐욕적으로 둔다 */
const BATTLES: { e: PieceType[]; k: number }[] = [
  { e: ['K', 'P', 'P', 'N'], k: 0.6 },
  { e: ['K', 'P', 'P', 'B', 'N'], k: 0.65 },
  { e: ['K', 'P', 'P', 'B', 'R'], k: 0.7 },
  { e: ['K', 'Q', 'P', 'P', 'N'], k: 0.75 },
];
it('slice', () => {
  const N = Number(process.env.SIM_GAMES ?? 100);
  const res = BATTLES.map(() => ({ win: 0, turns: 0, n: 0 }));
  const byPart: Record<string, { n: number; clear: number }> = {};
  const allParts = Object.keys(SLICE_PARTS) as SlicePartId[];
  for (let g = 0; g < N; g++) {
    const rng = new Rng(500 + g);
    let squad: Squad[] = [{ t: 'K' }, { t: 'P' }, { t: 'P' }, { t: 'N' }, { t: 'B' }];
    const parts: SlicePartId[] = [allParts[g % allParts.length]];
    const deck: CommandId[] = [...START_COMMANDS];
    const first = parts[0];
    let cleared = false;
    for (let bi = 0; bi < BATTLES.length; bi++) {
      const b = newSliceBattle(squad, BATTLES[bi].e, deck, 1000 + g * 7 + bi, { enemyKingHp: BATTLES[bi].k, parts });
      let guard = 0;
      while (b.s.winner === null && guard++ < 40) {
        for (let step = 0; step < 10; step++) {
          // 불씨 · 재장전은 먼저
          const inst = b.hand.findIndex((id, i) => (COMMANDS[id].kind === 'spark' || COMMANDS[id].kind === 'draw') && canPlay(b, i));
          if (inst >= 0) { playCard(b, inst); continue; }
          let best: { i: number; p?: number; to?: { x: number; y: number }; sc: number } | null = null;
          b.hand.forEach((id, i) => {
            if (COMMANDS[id].kind === 'march' && canPlay(b, i)) { if ((best?.sc ?? 0.5) < 8) best = { i, sc: 8 }; return; }
            if (COMMANDS[id].kind !== 'move') return;
            for (const p of cardPieces(b, i)) for (const to of cardMoves(b, i, p.id)) {
              const sim = previewPlay(b, i, p.id, to);
              if (!sim) continue;
              let sc = 0;
              for (const e of sim.events) if (e.type === 'attack') for (const h of e.hits) sc += h.killed ? 60 : h.damage;
              if (sim.state.winner === 0) sc += 1000;
              const ek = kingOf(b.s, 1);
              if (ek) sc += (Math.max(Math.abs(p.x - ek.x), Math.abs(p.y - ek.y)) - Math.max(Math.abs(to.x - ek.x), Math.abs(to.y - ek.y))) * 3;
              if (sc > (best?.sc ?? 0.5)) best = { i, p: p.id, to, sc };
            }
          });
          if (!best) {
            const d = b.hand.findIndex((id, i) => COMMANDS[id].kind === 'draft' && canPlay(b, i));
            if (d >= 0) { playCard(b, d); continue; }
            break;
          }
          const bb = best as { i: number; p?: number; to?: { x: number; y: number } };
          playCard(b, bb.i, bb.p, bb.to);
          if (b.s.winner !== null) break;
        }
        if (b.s.winner !== null) break;
        endTurn(b, true);
      }
      res[bi].n++;
      res[bi].turns += b.turn;
      if (b.s.winner !== 0) break;
      res[bi].win++;
      squad = restSquad(squadAfter(b, squad));
      if (bi === 2) {
        const pool = allParts.filter((p) => !parts.includes(p));
        parts.push(pool[rng.int(pool.length)]);
      } else if (bi < 3) {
        const pool = REWARD_COMMANDS.filter((id) => !isInstant(id) || COMMANDS[id].kind !== 'draw');
        deck.push(pool[rng.int(pool.length)]);
      } else cleared = true;
    }
    byPart[first] = byPart[first] ?? { n: 0, clear: 0 };
    byPart[first].n++;
    if (cleared) byPart[first].clear++;
  }
  for (let i = 0; i < BATTLES.length; i++) console.log(`판 ${i + 1}: ${res[i].n}판 승률 ${Math.round((res[i].win / Math.max(1, res[i].n)) * 100)}% 평균 ${(res[i].turns / Math.max(1, res[i].n)).toFixed(1)}턴`);
  console.log('시작 부품별 완주:', Object.entries(byPart).map(([k, v]) => `${SLICE_PARTS[k as SlicePartId].name} ${Math.round((v.clear / v.n) * 100)}%`).join(' · '));
}, 600000);
