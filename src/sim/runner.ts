import { choosePlan, AI_TIERS } from '../ai/search';
import { TUNED } from '../data/aiWeights';
import { CARD_SLOTS } from '../data/cards';
import { ENCHANT_SLOTS, type EnchantId } from '../data/enchants';
import { ALTAR } from '../data/run';
import { PIECE_STATS } from '../data/pieces';
import { resolveTurn, type BattleState, type PieceType } from '../engine';
import { canAdd } from '../run/deck';
import { EVENTS } from '../run/events';
import { encounterBattle } from '../run/legion';
import { puzzleBattle, puzzleFor, solvePuzzle } from '../run/puzzle';
import { orderProgress } from '../run/orders';
import {
  altarGamble,
  altarPick,
  buyCard,
  buyPiece,
  enterNode,
  eventChoiceAvailable,
  eventChoose,
  finishBattle,
  finishPuzzle,
  finishReward,
  forgeCost,
  forgeUp,
  leaveNode,
  newRun,
  skipChoice,
  takeChoice,
  type RunState,
} from '../run/run';

/**
 * 자동 등반: 단순한 규칙으로 런을 끝까지 둔다 (M5 경제·난이도 곡선 검증용).
 * 플레이어 쪽 전투는 AI(단계 2, 튜닝 가중치)가 대신 둔다. 사람보다 약하거나 강할 수 있으므로 절대값보다 곡선을 본다.
 */

export interface RunLog {
  won: boolean;
  /** 마지막으로 도달한 층 */
  floor: number;
  /** 진 층의 노드 종류 */
  diedAt?: string;
  boss: string;
  battles: {
    floor: number;
    kind: string;
    turns: number;
    won: boolean;
    /** D-094~097 요소: 군단 원형 · 접사 · 주문서와 완수 · 내 전술 키워드 횟수 · 지형 칸 수 */
    archetype?: string;
    affixes?: string[];
    order?: string;
    orderDone?: boolean;
    tactics?: Partial<Record<string, number>>;
    terrain?: number;
  }[];
  /** 묘수: 문제 번호별 풀었는가 */
  puzzles: boolean[];
  /** 층별 (도착 시) 골드·덱 크기 */
  trace: { floor: number; gold: number; deck: number; forge: number; enchants: number; cards: number }[];
  goldEarned: number;
  goldSpent: number;
}

const MAX_TURNS = 160;

const TYPE_ENCHANT: Partial<Record<PieceType, EnchantId>> = { N: 'E01', B: 'E02', R: 'E03', P: 'E04', K: 'E08' };

const playBattle = (run: RunState, seed: number): { state: BattleState; turns: number } => {
  if (run.stage.at !== 'battle') throw new Error('not in battle');
  const e = run.stage.encounter;
  let s = encounterBattle(run.deck, run.loadout, e);
  let turns = 0;
  for (; turns < MAX_TURNS && s.winner === null; turns++) {
    const tier = s.turnSide === 0 ? AI_TIERS[1] : AI_TIERS[e.tier];
    const plan = choosePlan(s, { tier, weights: TUNED, seed: seed * 31 + turns });
    s = resolveTurn(s, plan).state;
  }
  // 턴 제한에 걸리면 패배로 본다 (실제 게임에는 턴 제한이 없다)
  if (s.winner === null) s = { ...s, winner: 1 };
  return { state: s, turns };
};

/** 인챈트 3지선다 선택: 덱 주력 유형 인챈트 > 이미 가진 것 중첩 > 첫 번째 */
const pickEnchant = (run: RunState, options: EnchantId[]): EnchantId => {
  const counts = new Map<PieceType, number>();
  for (const t of run.deck) counts.set(t, (counts.get(t) ?? 0) + 1);
  const score = (id: EnchantId) => {
    const t = (Object.entries(TYPE_ENCHANT) as [PieceType, EnchantId][]).find(([, e]) => e === id)?.[0];
    return (t ? (counts.get(t) ?? 0) : 2) + (run.loadout.enchants[id] ?? 0) * 2;
  };
  return [...options].sort((a, b) => score(b) - score(a))[0];
};

export const autoRun = (seed: number): RunLog => {
  const run = newRun(seed);
  const log: RunLog = { won: false, floor: 1, boss: run.bosses[0], battles: [], puzzles: [], trace: [], goldEarned: 0, goldSpent: 0 };
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
        log.trace.push({
          floor: run.floor,
          gold: run.gold,
          deck: run.deck.length,
          forge: Object.values(run.loadout.forge).reduce((a, b) => a + (b ?? 0), 0),
          enchants: Object.values(run.loadout.enchants).reduce((a, b) => a + (b ?? 0), 0),
          cards: run.loadout.cards.length,
        });
        const nodes = run.map[run.floor - 1];
        const pref = (k: string) => {
          if (k === 'shop') return run.gold >= 50 && run.deck.length < 12 ? 5 : 1;
          if (k === 'forge') return run.gold >= 45 ? (run.deck.length >= 9 ? 6 : 4) : 0;
          if (k === 'altar') return run.gold >= 60 || run.crackGauge >= ALTAR.gaugeMax ? 3 : 0;
          if (k === 'elite') return run.deck.length >= 11 ? 3.5 : 0.5;
          if (k === 'event') return 2;
          return 2.5;
        };
        const best = nodes.map((n, i) => [i, pref(n.kind)] as const).sort((a, b) => b[1] - a[1])[0][0];
        enterNode(run, best);
        break;
      }
      case 'battle': {
        const { state, turns } = playBattle(run, seed * 1000 + run.floor);
        const e = st.encounter;
        log.battles.push({
          floor: run.floor,
          kind: e.kind,
          turns,
          won: state.winner === 0,
          archetype: e.archetype,
          affixes: e.affixes?.map((a) => a.id),
          order: e.order,
          orderDone: e.order ? state.winner === 0 && orderProgress(e.order, state, run.deck, true).done : undefined,
          tactics: state.record?.[0].tactics,
          terrain: encounterBattle(run.deck, run.loadout, e).terrain?.length ?? 0,
        });
        if (state.winner !== 0) log.diedAt = st.encounter.kind;
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
        if (ch.type === 'piece' || ch.type === 'recruit') {
          // 덱 주력 유형을 늘린다 (같은 유형이 많을수록 대장간·인챈트 효율이 오른다), 없으면 가치 높은 것
          const count = (t: PieceType) => run.deck.filter((x) => x === t).length;
          const best = [...ch.options].sort((a, b) => count(b) * 20 + PIECE_STATS[b].value - (count(a) * 20 + PIECE_STATS[a].value))[0];
          if (takeChoice(run, best)) skipChoice(run); // 군단이 꽉 찼으면 넘긴다
        } else if (ch.type === 'enchant') {
          const id = pickEnchant(run, ch.options);
          const full = !run.loadout.enchants[id] && Object.keys(run.loadout.enchants).length >= ENCHANT_SLOTS;
          if (full) skipChoice(run);
          else takeChoice(run, id);
        } else {
          if (run.loadout.cards.length >= CARD_SLOTS) skipChoice(run);
          else takeChoice(run, ch.options[0]);
        }
        track();
        break;
      }
      case 'shop': {
        // 살 수 있는 가장 비싼 기물부터, 남으면 카드
        let bought = true;
        while (bought) {
          bought = false;
          const order = st.stock.pieces.map((p, i) => [p, i] as const).filter(([p]) => !p.sold && p.price <= run.gold && canAdd(run.deck, p.item));
          order.sort((a, b) => PIECE_STATS[b[0].item].value - PIECE_STATS[a[0].item].value);
          if (order.length) {
            buyPiece(run, order[0][1]);
            bought = true;
          }
        }
        st.stock.cards.forEach((c, i) => {
          if (!c.sold && run.gold - c.price >= 40 && run.loadout.cards.length < CARD_SLOTS) buyCard(run, i);
        });
        track();
        leaveNode(run);
        break;
      }
      case 'forge': {
        // 가장 많이 가진 유형 (킹 제외)부터
        const counts = [...new Set(run.deck)].filter((t) => t !== 'K').map((t) => [t, run.deck.filter((x) => x === t).length] as const);
        counts.sort((a, b) => b[1] - a[1]);
        for (let more = true; more; ) {
          more = false;
          for (const [t] of counts) {
            const c = forgeCost(run, t);
            if (c !== null && c <= run.gold) {
              forgeUp(run, t);
              more = true;
              break;
            }
          }
        }
        track();
        leaveNode(run);
        break;
      }
      case 'altar': {
        if (!st.result && (run.gold >= ALTAR.cost || run.crackGauge >= ALTAR.gaugeMax)) {
          altarGamble(run);
          track();
          const now = run.stage;
          if (now.at === 'altar' && now.result?.kind === 'pick') {
            const types = [...new Set(run.deck)];
            const id = types.map((t) => TYPE_ENCHANT[t]).find((e) => e && (run.loadout.enchants[e] ?? 0) < 3) ?? 'E05';
            if (altarPick(run, id)) leaveNode(run);
          } else if (now.at === 'altar') leaveNode(run);
        } else leaveNode(run);
        break;
      }
      case 'puzzle': {
        // 묘수풀이 (D-097): 자동 등반은 검증된 해법 길이까지 찾아 둔다 (잘 두는 사람 기준)
        const def = puzzleFor(st.id);
        const s = puzzleBattle(def);
        const sol = solvePuzzle(s, def.steps);
        log.puzzles.push(!!sol);
        finishPuzzle(run, sol ? resolveTurn(s, sol).state : s);
        break;
      }
      case 'event': {
        if (!st.result) {
          const i = EVENTS[st.id].choices.findIndex((_, k) => eventChoiceAvailable(run, st.id, k) && !(st.id === 'pact' && run.deck.length < 9));
          eventChoose(run, i < 0 ? EVENTS[st.id].choices.length - 1 : i);
          track();
        } else leaveNode(run);
        break;
      }
    }
    log.floor = Math.min(run.floor, 36);
  }
  log.won = run.stage.at === 'over' && run.stage.won;
  return log;
};
