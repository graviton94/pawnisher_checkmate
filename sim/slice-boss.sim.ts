import { it } from 'vitest';
import { cardMoves, cardPieces, canPlay, endTurn, isInstant, newSliceBattle, playCard, type SliceBattle } from '../src/slice/battle';
import { BOSS, START_COMMANDS, type CommandId } from '../src/slice/cards';
import type { SlicePartId } from '../src/slice/parts';
import { kingOf, type BattleEvent } from '../src/engine';

/** 반장 판 확인 (D-148): 한 턴을 빔 탐색으로 짜는 봇이 반장을 이기나 — 킹 피해에 가중, 폭격 줄은 피한다 */
const clone = (b: SliceBattle): SliceBattle => JSON.parse(JSON.stringify(b)) as SliceBattle;
const score = (b: SliceBattle, ev: BattleEvent[]) => {
  const ek = kingOf(b.s, 1);
  let d = 0;
  for (const e of ev) if (e.type === 'attack') for (const h of e.hits) {
    if (b.s.pieces.some((p) => p.id === h.targetId && p.side === 0)) continue;
    d += h.damage * (ek && h.targetId === ek.id ? 2 : 1) + (h.killed ? 30 : 0);
  }
  return d;
};
const bestTurn = (b0: SliceBattle): SliceBattle => {
  let beam = [{ b: b0, sc: 0 }];
  let best = beam[0];
  for (let depth = 0; depth < 8; depth++) {
    const next: { b: SliceBattle; sc: number }[] = [];
    for (const n of beam) n.b.hand.forEach((id, i) => {
      if (!canPlay(n.b, i)) return;
      const opts = isInstant(id) ? [{}] : cardPieces(n.b, i).flatMap((p) => cardMoves(n.b, i, p.id).map((to) => ({ p: p.id, to })));
      for (const o of opts as { p?: number; to?: { x: number; y: number } }[]) {
        const c = clone(n.b);
        const r = playCard(c, i, o.p, o.to);
        if (typeof r === 'string') continue;
        // 폭격 줄에 남은 내 기물은 감점
        const row = c.bombRow;
        const bombed = row === null ? 0 : c.s.pieces.filter((p) => p.side === 0 && p.y === row).length * 15;
        next.push({ b: c, sc: n.sc + score(c, r.events) + (c.s.winner === 0 ? 9999 : 0) - bombed + (n.b.bombRow === null ? 0 : n.b.s.pieces.filter((p) => p.side === 0 && p.y === row).length * 15) });
      }
    });
    if (!next.length) break;
    next.sort((x, y) => y.sc - x.sc);
    beam = next.slice(0, 16);
    if (beam[0].sc > best.sc) best = beam[0];
    if (beam[0].b.s.winner !== null) break;
  }
  return best.b;
};
it('slice boss', () => {
  const N = Number(process.env.SIM_GAMES ?? 20);
  if (process.env.PLATE) BOSS.plate = Number(process.env.PLATE);
  if (process.env.PLATE_EVERY) BOSS.plateEvery = Number(process.env.PLATE_EVERY);
  console.log(`철갑 ${BOSS.plate} / ${BOSS.plateEvery}턴마다`);
  const cases: { name: string; parts: SlicePartId[]; add: CommandId[] }[] = [
    { name: '시작 덱', parts: [], add: [] },
    { name: '시작 덱 + 카드 2 (중간 빌드)', parts: ['horseshoe'], add: ['rebound', 'smash'] },
      ];
  for (const cs of cases) {
    let win = 0, turns = 0;
    for (let g = 0; g < N; g++) {
      let b = newSliceBattle([{ t: 'K', hp: 80 }, { t: 'P' }, { t: 'P', hp: 18 }, { t: 'N', hp: 40 }, { t: 'B', hp: 30 }], ['K', 'Q', 'P', 'P', 'N'], [...START_COMMANDS, ...cs.add], 900 + g * 11, { enemyKingHp: 0.75, parts: cs.parts, boss: true });
      let guard = 0;
      while (b.s.winner === null && guard++ < 25) {
        b = bestTurn(b);
        if (b.s.winner !== null) break;
        endTurn(b, true);
      }
      if (b.s.winner === 0) win++;
      turns += b.turn;
    }
    console.log(`${cs.name.padEnd(24)} 반장 승률 ${Math.round((win / N) * 100)}% · 평균 ${(turns / N).toFixed(1)}턴`);
  }
}, 1200000);
