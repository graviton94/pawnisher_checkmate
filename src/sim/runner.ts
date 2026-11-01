import { choosePlan, AI_TIERS } from '../ai/search';
import { TUNED } from '../data/aiWeights';
import { CARVES, type CarveId } from '../data/carves';
import { GRADE_ORDER } from '../data/grades';
import { PARTS, PART_SLOTS, type PartId } from '../data/parts';
import { PIECE_STATS } from '../data/pieces';
import { resolveTurn, type BattleState, type PieceType } from '../engine';
import { encounterBattle } from '../run/legion';
import { EVENTS } from '../run/events';
import {
  buyCarve,
  buyPart,
  buyPiece,
  canAdd,
  enterNode,
  eventChoiceAvailable,
  eventChoose,
  finishBattle,
  finishReward,
  forgeCarve,
  forgeUpgrade,
  leaveNode,
  newRun,
  skipChoice,
  takeChoice,
  UPGRADE,
  type RunState,
} from '../run/run';

/**
 * 자동 등반 (규격 2.0): 단순한 규칙으로 출하를 끝까지 둔다. 플레이어 쪽 대국은 AI(단계 1)가 대신 둔다.
 * 사람보다 약하거나 강할 수 있으므로 절대값보다 곡선을 본다.
 */
export interface RunLog {
  won: boolean;
  floor: number;
  diedAt?: string;
  boss: string;
  battles: { floor: number; kind: string; turns: number; won: boolean; boss?: string; archetype?: string }[];
  trace: { floor: number; gold: number; deck: number; carves: number; parts: number; threats: number }[];
  goldEarned: number;
  goldSpent: number;
  parts: string[];
}

const MAX_TURNS = 120;

export const playBattle = (run: RunState, seed: number): { state: BattleState; turns: number } => {
  if (run.stage.at !== 'battle') throw new Error('not in battle');
  const e = run.stage.encounter;
  let s = encounterBattle(run.deck, { parts: run.parts }, e);
  let turns = 0;
  for (; turns < MAX_TURNS && s.winner === null; turns++) {
    const tier = s.turnSide === 0 ? AI_TIERS[1] : AI_TIERS[e.tier];
    s = resolveTurn(s, choosePlan(s, { tier, weights: TUNED, seed: seed * 31 + turns })).state;
  }
  if (s.winner === null) s = { ...s, winner: 1 };
  return { state: s, turns };
};

/** 각인을 새길 기물: 각인 없는 가장 비싼 기물 (킹 제외) */
const carveTarget = (run: RunState, id: CarveId): number => {
  const ok = (t: PieceType) => t !== 'K' && (id !== 'pierce' || ['B', 'R', 'Q'].includes(t));
  const cands = run.deck.map((u, i) => [u, i] as const).filter(([u]) => !u.carve && ok(u.t));
  cands.sort((a, b) => PIECE_STATS[b[0].t].value - PIECE_STATS[a[0].t].value);
  return cands[0]?.[1] ?? -1;
};
const partScore = (id: PartId) => GRADE_ORDER.indexOf(PARTS[id].grade);
const weakestPart = (run: RunState): number => run.parts.map((p, i) => [i, partScore(p)] as const).sort((a, b) => a[1] - b[1])[0][0];

export const autoRun = (seed: number, ascension = 0): RunLog => {
  const run = newRun(seed, { ascension });
  const log: RunLog = { won: false, floor: 1, boss: run.bosses[0], battles: [], trace: [], goldEarned: 0, goldSpent: 0, parts: [] };
  let lastGold = run.gold;
  const track = () => {
    const d = run.gold - lastGold;
    if (d > 0) log.goldEarned += d;
    else log.goldSpent -= d;
    lastGold = run.gold;
  };
  for (let guard = 0; guard < 400 && run.stage.at !== 'over'; guard++) {
    const st = run.stage;
    switch (st.at) {
      case 'map': {
        log.trace.push({ floor: run.floor, gold: run.gold, deck: run.deck.length, carves: run.deck.filter((u) => u.carve).length, parts: run.parts.length, threats: run.threats.length });
        const nodes = run.map[run.floor - 1];
        const pref = (k: string) => {
          if (k === 'shop') return run.gold >= 60 ? 5 : 1;
          if (k === 'forge') return 4;
          if (k === 'elite') return run.deck.length >= 6 ? 3.5 : 0.8;
          if (k === 'event') return 2;
          return 2.5;
        };
        enterNode(run, nodes.map((n, i) => [i, pref(n.kind)] as const).sort((a, b) => b[1] - a[1])[0][0]);
        break;
      }
      case 'battle': {
        const e = st.encounter;
        const { state, turns } = playBattle(run, seed * 1000 + run.floor);
        log.battles.push({ floor: run.floor, kind: e.kind, turns, won: state.winner === 0, boss: e.boss, archetype: e.archetype });
        if (state.winner !== 0) log.diedAt = e.kind;
        log.floor = run.floor;
        finishBattle(run, state);
        track();
        break;
      }
      case 'reward': {
        const ch = st.choices[0];
        if (!ch) {
          finishReward(run);
          break;
        }
        let opt: string | undefined;
        let extra: number | undefined;
        if (ch.type === 'mixed') {
          const pieces = ch.options.filter((o) => o.startsWith('piece:'));
          const carve = ch.options.find((o) => o.startsWith('carve:'));
          // 군단이 5기 이하면 기물, 그 뒤로는 각인 · 기물을 번갈아
          if (carve && (run.deck.length >= 6 || !pieces.length) && carveTarget(run, carve.split(':')[1] as CarveId) >= 0) {
            opt = carve;
            extra = carveTarget(run, carve.split(':')[1] as CarveId);
          } else opt = [...pieces].sort((a, b) => PIECE_STATS[b.split(':')[1] as PieceType].value - PIECE_STATS[a.split(':')[1] as PieceType].value)[0];
        } else if (ch.type === 'piece' || ch.type === 'recruit') opt = [...ch.options].sort((a, b) => PIECE_STATS[b].value - PIECE_STATS[a].value)[0];
        else if (ch.type === 'part') {
          opt = [...ch.options].sort((a, b) => partScore(b) - partScore(a))[0];
          if (run.parts.length >= PART_SLOTS) extra = weakestPart(run);
        } else if (ch.type === 'pair') {
          opt = String(ch.options.map((p, i) => [i, partScore(p.part)] as const).sort((a, b) => b[1] - a[1])[0][0]);
          if (run.parts.length >= PART_SLOTS) extra = weakestPart(run);
        } else if (ch.type === 'carve') {
          opt = ch.options[0];
          extra = carveTarget(run, ch.options[0]);
        }
        const err = opt !== undefined && (extra === undefined || extra >= 0) ? takeChoice(run, opt, extra) : 'skip';
        if (err) skipChoice(run);
        track();
        break;
      }
      case 'shop': {
        const s = st.stock;
        // 부품 > 각인 > 기물 순 (사람처럼 — 축을 먼저 세운다)
        s.parts.forEach((it, i) => {
          if (!it.sold && run.gold >= it.price + 20 && (run.parts.length < PART_SLOTS || partScore(it.item) > partScore(run.parts[weakestPart(run)]))) buyPart(run, i, run.parts.length >= PART_SLOTS ? weakestPart(run) : undefined);
        });
        s.carves.forEach((it, i) => {
          const u = carveTarget(run, it.item);
          if (!it.sold && u >= 0 && run.gold >= it.price + 10) buyCarve(run, i, u);
        });
        s.pieces.forEach((it, i) => {
          if (!it.sold && run.gold >= it.price + 10 && canAdd(run, it.item)) buyPiece(run, i);
        });
        track();
        leaveNode(run);
        break;
      }
      case 'forge': {
        const c = st.carves.find((id) => carveTarget(run, id) >= 0);
        if (c && run.deck.length >= 5) forgeCarve(run, st.carves.indexOf(c), carveTarget(run, c));
        else {
          const k = run.deck.findIndex((u) => u.t === 'P' || u.t === 'N' || u.t === 'B');
          const to = k >= 0 ? UPGRADE[run.deck[k].t]?.find((t) => run.deck.filter((x) => x.t === t).length < 3) : undefined;
          if (k >= 0 && to) forgeUpgrade(run, k, to);
          else if (c) forgeCarve(run, st.carves.indexOf(c), carveTarget(run, c));
        }
        leaveNode(run);
        break;
      }
      case 'event': {
        if (st.result) {
          leaveNode(run);
          break;
        }
        const safe = !['dipping', 'pact', 'scout'].includes(st.id);
        eventChoose(run, safe && eventChoiceAvailable(run, st.id, 0) ? 0 : EVENTS[st.id].choices.length - 1);
        track();
        break;
      }
    }
  }
  log.won = run.stage.at === 'over' && run.stage.won;
  log.parts = [...run.parts];
  return log;
};

export { CARVES };
