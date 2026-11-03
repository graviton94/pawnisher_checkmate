import { it } from 'vitest';
import { Rng } from '../src/engine/rng';
import { COMMANDS, START_DECK, START_SQUAD, type CommandId } from '../src/slice/cards';
import { makeCrew } from '../src/slice/crew';
import { battleFor, INTRO } from '../src/slice/run';
import { endTurn, newSliceBattle, playCard, type Squad } from '../src/slice/battle';
import { bestAction } from '../src/slice/bot';
import type { PieceType } from '../src/engine';

/** 1막 탐침 (D-214): 시작 분대 · 시작 덱으로 1막 대국 · 반장 — 적이 가만히 있는 턴 비율, 승률, 반장 폭격 피해 */
const run = (def: ReturnType<typeof battleFor>, seed: number) => {
  const rng = new Rng(seed);
  const squad: Squad[] = [];
  for (const t of START_SQUAD) squad.push(makeCrew(t, rng, squad.map((u) => u.name ?? '')));
  const deck = (START_DECK as CommandId[]).filter((id) => COMMANDS[id].who === 'any' || squad.some((u) => u.t === (COMMANDS[id].who as PieceType)));
  const b = newSliceBattle(squad, def.enemy, deck, seed, { enemyKingHp: def.kingHp, enemyHp: def.enemyHp, boss: def.boss, bossRule: def.bossRule, traits: def.traits, width: def.w, height: def.h, place: def.place, depth: 2 });
  let idle = 0, eturns = 0, bomb = 0;
  while (b.s.winner === null && b.turn < 30) {
    for (let g = 0; g < 20; g++) { const a = bestAction(b); if (!a) break; if (typeof playCard(b, a.i, a.pieceId, a.to) === 'string') break; if (b.s.winner !== null) break; }
    if (b.s.winner !== null) break;
    const r = endTurn(b, true);
    if (r === 'warn') continue;
    eturns++;
    const ev = (r as { events: { type: string; label?: string; hits?: { damage: number }[]; pieceId?: number }[] }).events;
    if (!ev.some((e) => e.type === 'move')) idle++;
    for (const e of ev) if (e.type === 'blast' && e.label === '줄 폭격!') bomb += (e.hits ?? []).reduce((x, h) => x + h.damage, 0);
  }
  return { won: b.s.winner === 0, turns: b.turn, idle, eturns, bomb };
};
it('act1 probe', () => {
  for (const kind of ['battle', 'boss'] as const) {
    let w = 0, idle = 0, et = 0, turns = 0, bomb = 0;
    const N = 30;
    for (let i = 0; i < N; i++) { const r = run(battleFor(1, kind, new Rng(i * 13 + 5)), 900 + i); w += +r.won; idle += r.idle; et += r.eturns; turns += r.turns; bomb += r.bomb; }
    console.log(kind, `win ${w}/${N}`, `idle ${(idle / Math.max(1, et) * 100).toFixed(0)}%`, `avgTurns ${(turns / N).toFixed(1)}`, `bombDmg/battle ${(bomb / N).toFixed(0)}`);
  }
  for (const d of INTRO) { const r = run(d as never, 77); console.log('intro', d.title, r); }
});
