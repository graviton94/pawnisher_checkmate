// 적 한 방 계측 (D-557): 적 기물 유형별 한 방 피해 · 대상 최대 HP 대비 · 편성별 대국 손실 (두뇌 봇, 막마다 고정 분대 · 깨끗한 몸).
// 사용: KH_N=40 KH_ASC=0,1,2,3 npx vitest run --config vitest.sim.config.ts sim/kinghit.sim.ts
import { it } from 'vitest';
import { Rng } from '../src/engine/rng';
import type { PieceType } from '../src/engine';
import { buildRun } from '../src/slice/run';
import { makeCrew } from '../src/slice/crew';
import { canPlay, cardMoves, depthAt, endTurn, newSliceBattle, playCard, type Squad, type SliceBattle } from '../src/slice/battle';
import { COMMANDS, type CommandId } from '../src/slice/cards';
import { START_SETS } from '../src/data/start-sets';
import { BOT } from '../src/data/bot';
import { anyPlay, searchTurn } from '../src/slice/bot';

type Agg = { hits: number; dmg: number; pct: number; kills: number };
const agg = (): Agg => ({ hits: 0, dmg: 0, pct: 0, kills: 0 });

it('적 한 방 계측', () => {
  const N = Number(process.env.KH_N ?? 40);
  const ascs = (process.env.KH_ASC ?? '0,1,2,3').split(',').map(Number);
  for (const asc of ascs) {
    const byAct: Record<string, Record<string, Agg>> = {};
    const comp: Record<string, { n: number; turns: number; lost: number; fell: number; won: number; kingDmg: number }> = {};
    for (let seed = 1; seed <= N; seed++) {
      const acts = buildRun(seed, asc, false);
      for (let ai = 0; ai < 3; ai++) {
        const a = acts[ai];
        a.rows.forEach((row, ri) => row.forEach((n) => {
          if (!n.battle || n.battle.boss) return;
          const def = n.battle;
          const rng = new Rng(seed * 31 + ri);
          const kinds: PieceType[] = ai === 0 ? ['K', 'P', 'N', 'B'] : ai === 1 ? ['K', 'P', 'N', 'B', 'R'] : ['K', 'P', 'N', 'B', 'R', 'P'];
          const squad: Squad[] = [];
          for (const t of kinds) squad.push(makeCrew(t, rng, squad.map((u) => u.name ?? '')));
          const deck = ([...START_SETS.standard.deck, 'diagonal', 'diagonal', ...(ai ? ['rookLine', 'rookLine'] : [])] as CommandId[]).filter((id) => id in COMMANDS);
          const b = newSliceBattle(squad, def.enemy, deck, seed * 7 + ri, { enemyKingHp: def.kingHp, enemyHp: def.enemyHp, depth: depthAt(ai, ri / a.rows.length), boss: def.boss, bossRule: def.bossRule, traits: def.traits, width: def.w, height: def.h, place: def.place, shock: asc >= 2, guard: def.guard, atkMul: def.atk ?? 1, eliteOne: def.eliteOne, forms: def.forms, marks: def.marks, giants: def.giants, process: def.process });
          const hp0 = b.s.pieces.filter((p) => p.side === 0).reduce((s, p) => s + p.hp, 0);
          const key = `${ai + 1}막 ${n.kind === 'check' ? '검문' : def.title}`;
          const c = (comp[key] ??= { n: 0, turns: 0, lost: 0, fell: 0, won: 0, kingDmg: 0 });
          while (b.s.winner === null && b.turn < 30) {
            for (let again = 0; again < BOT.researchMax && b.s.winner === null && anyPlay(b); again++) {
              const seq = searchTurn(b, 3, 4, 0);
              if (!seq.length) break;
              let done = 0;
              for (const x of seq) {
                if (b.s.winner !== null) break;
                let idx = x.i;
                if (x.pieceId !== undefined && x.to) {
                  const want = COMMANDS[(b.hand[x.i] ?? '') as keyof typeof COMMANDS];
                  if (!want || !cardMoves(b, x.i, x.pieceId).some((q) => q.x === x.to!.x && q.y === x.to!.y)) {
                    idx = b.hand.findIndex((_, j) => canPlay(b, j) && cardMoves(b, j, x.pieceId!).some((q) => q.x === x.to!.x && q.y === x.to!.y));
                    if (idx < 0) break;
                  }
                }
                if (typeof playCard(b, idx, x.pieceId, x.to) === 'string') break;
                done++;
              }
              if (!done) break;
            }
            if (b.s.winner !== null) break;
            const r = endTurn(b, true) as { events: { type: string; attackerId?: number; hits?: { targetId: number; damage: number; shieldAbsorbed: number; killed: boolean }[] }[]; before: SliceBattle['s'] };
            for (const e of r.events) {
              if (e.type !== 'attack' || !e.hits) continue;
              const atk = r.before.pieces.find((p) => p.id === e.attackerId);
              if (!atk || atk.side !== 1) continue;
              for (const h of e.hits) {
                const tg = r.before.pieces.find((p) => p.id === h.targetId);
                if (!tg || tg.side !== 0) continue;
                const t = atk.type + (atk.giant ? 'g' : '');
                const d = h.damage + h.shieldAbsorbed;
                const g = ((byAct[ai + 1] ??= {})[t] ??= agg());
                g.hits++; g.dmg += d; g.pct += d / tg.maxHp; g.kills += h.killed ? 1 : 0;
                if (atk.type === 'K') c.kingDmg += h.damage;
              }
            }
          }
          const hp1 = b.s.pieces.filter((p) => p.side === 0 && p.hp > 0).reduce((s, p) => s + p.hp, 0);
          c.n++; c.turns += b.turn; c.lost += hp0 - hp1; c.fell += b.falls.length; c.won += b.s.winner === 0 ? 1 : 0;
        }));
      }
    }
    const f = (g: Agg) => `${g.hits}회 평균 ${(g.dmg / g.hits).toFixed(1)} (대상 최대HP ${(100 * g.pct / g.hits).toFixed(0)}%) 처치 ${(100 * g.kills / g.hits).toFixed(0)}%`;
    const lines = [`\n=== 승급 ${asc} (왕관 ${asc + 1}) ===`];
    for (const act of Object.keys(byAct)) for (const [t, g] of Object.entries(byAct[act]).sort()) lines.push(`${act}막 적 ${t}: ${f(g)}`);
    for (const [k, c] of Object.entries(comp).sort()) lines.push(`${k}: ${c.n}판 턴 ${(c.turns / c.n).toFixed(1)} · 잃은HP ${(c.lost / c.n).toFixed(0)} · 쓰러짐 ${(c.fell / c.n).toFixed(2)} · 킹 몫 ${(100 * c.kingDmg / Math.max(1, c.lost)).toFixed(0)}% · 승 ${(100 * c.won / c.n).toFixed(0)}%`);
    console.log(lines.join('\n'));
  }
}, 1800000);
