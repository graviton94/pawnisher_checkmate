import { it } from 'vitest';
import type { PieceType } from '../src/engine';
import { Rng } from '../src/engine/rng';
import { COMMANDS, KITS, RECRUITS, REWARD_COMMANDS, SLICE, START_DECK, START_SQUAD, type CommandId } from '../src/slice/cards';
import { SLICE_PARTS, type SlicePartId } from '../src/slice/parts';
import { makeCrew } from '../src/slice/crew';
import { buildRun } from '../src/slice/run';
import { newSliceBattle, restSquad, squadAfter, type Squad } from '../src/slice/battle';
import { playOut } from '../src/slice/bot';

/**
 * 한 판 길이 측정 (R5 끝 조건 「한 판 40~60분」, D-173). `npm run sim -- slice-length`
 * 탐욕 봇이 3막을 끝까지 둔다. 갈림길은 무작위(실제 사람처럼 섞어 고른다), 지면 같은 판을 다시 (3번까지).
 * 시간 = 실화면 연출 기준 가정값 (아래 T) × 횟수.
 */
const T = { play: 5, endTurn: 5, battleIntro: 5, reward: 12, node: 45, map: 6, actIntro: 5 };

const one = (seed: number) => {
  const rng = new Rng(seed);
  const acts = buildRun(seed);
  let squad: Squad[] = [];
  for (const t of START_SQUAD) squad.push(makeCrew(t, rng, squad.map((u) => u.name ?? '')));
  let deck: CommandId[] = [...START_DECK];
  const parts: SlicePartId[] = [];
  const has = (t: PieceType) => squad.some((u) => u.t === t);
  const usable = (id: CommandId) => COMMANDS[id].who === 'any' || has(COMMANDS[id].who as PieceType);
  let sec = 0, battles = 0, turns = 0, plays = 0, retries = 0, stage = 0;
  let reached = '';
  for (const a of acts) {
    sec += T.actIntro;
    for (const row of a.rows) {
      const n = row[rng.int(row.length)];
      sec += row.length > 1 ? T.map : 0;
      if (!n.battle) { sec += T.node; continue; }
      const def = n.battle;
      let ok = false;
      for (let tryN = 0; tryN < 4 && !ok; tryN++) {
        stage++;
        const b = newSliceBattle(squad, def.enemy, deck.filter(usable), 100 + stage * 17, { enemyKingHp: def.kingHp, enemyHp: def.enemyHp, depth: stage, parts, boss: def.boss, bossRule: def.bossRule, traits: def.traits, width: def.w, height: def.h, place: def.place });
        const r = playOut(b);
        battles++; turns += r.turns; plays += r.plays;
        sec += T.battleIntro + r.plays * T.play + r.turns * T.endTurn;
        if (r.won) { ok = true; squad = restSquad(squadAfter(b, squad)); } else retries++;
      }
      reached = `${a.act}막 ${def.title}`;
      if (!ok) return { cleared: false, reached, sec, battles, turns, plays, retries };
      sec += T.reward;
      if (def.reward === 'recruit') { const r = RECRUITS[rng.int(RECRUITS.length)]; squad.push(makeCrew(r.t, rng, squad.map((u) => u.name ?? ''))); deck.push(...r.cards); }
      else if (def.reward === 'kit') { const k = KITS[rng.int(KITS.length)]; parts.push(k.part); deck.push(...k.cards); }
      else if (def.reward === 'part') { const ids = (Object.keys(SLICE_PARTS) as SlicePartId[]).filter((p) => !parts.includes(p)); parts.push(ids[rng.int(ids.length)]); }
      else if (def.reward === 'card') { const pool = REWARD_COMMANDS.filter(usable); deck.push(pool[rng.int(pool.length)]); }
    }
  }
  return { cleared: true, reached, sec, battles, turns, plays, retries };
};

// 난이도 비율 시험 (D-202): FOE_HP · FOE_ATK 환경 변수로 SLICE.foeHp · foeAtk를 바꿔 같은 40판을 다시 잰다
if (process.env.FOE_HP) (SLICE as { foeHp: number }).foeHp = Number(process.env.FOE_HP);
if (process.env.FOE_ATK) (SLICE as { foeAtk: number }).foeAtk = Number(process.env.FOE_ATK);
if (process.env.FOE_GROW) (SLICE as { foeHpGrow: number }).foeHpGrow = Number(process.env.FOE_GROW);
if (process.env.FOE_START) (SLICE as { foeHpStart: number }).foeHpStart = Number(process.env.FOE_START);

it('한 판 길이', () => {
  const rs = Array.from({ length: 40 }, (_, k) => one(1000 + k * 7919));
  const avg = (f: (r: (typeof rs)[number]) => number, list = rs) => list.reduce((a, r) => a + f(r), 0) / Math.max(1, list.length);
  const done = rs.filter((r) => r.cleared);
  console.log(`완주 ${done.length}/${rs.length}`);
  console.log(`완주한 판: 평균 ${(avg((r) => r.sec, done) / 60).toFixed(1)}분 · 대국 ${avg((r) => r.battles, done).toFixed(1)} · 내 턴 ${avg((r) => r.turns, done).toFixed(0)} (대국당 ${(avg((r) => r.turns, done) / avg((r) => r.battles, done)).toFixed(1)}) · 카드 ${avg((r) => r.plays, done).toFixed(0)} · 다시 하기 ${avg((r) => r.retries, done).toFixed(1)}`);
  const stuck = new Map<string, number>();
  for (const r of rs.filter((x) => !x.cleared)) stuck.set(r.reached, (stuck.get(r.reached) ?? 0) + 1);
  console.log('막힌 곳', [...stuck].sort((a, b) => b[1] - a[1]));
  console.log(`전체 평균 ${(avg((r) => r.sec) / 60).toFixed(1)}분`);
});
