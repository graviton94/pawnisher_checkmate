import { it } from 'vitest';
import { choosePlan } from '../src/ai/search';
import { TUNED } from '../src/data/aiWeights';
import { STRONGHOLD } from '../src/data/battle';
import { createBattle, findPiece, FULL_DECK, resolveTurn, standingOf, type BattleState, type Plan, type Side, type Standing } from '../src/engine';

/**
 * 요충지 점령 시도 추적 + 기여도 측정.
 * - 시도: 기물이 요충지에 올라선 순간부터 끝날 때까지 (전사 / 자진 이탈 / 점령 / 붕괴·종료)
 * - 기여도: 점령이 일어난 턴에서 판을 둘로 나눠, 보상을 준 쪽과 안 준 쪽을 같은 AI·같은 시드로 끝까지 두고 승률을 비교한다.
 */
const tier = { beamWidth: 4, mistakeRate: 0.1 };
const plan = (s: BattleState, seed: number): Plan => choosePlan(s, { tier, weights: TUNED, seed });

const REWARDS = JSON.parse(JSON.stringify({ t1: STRONGHOLD.tier1, t2: STRONGHOLD.tier2, t3: STRONGHOLD.tier3 }));
const setRewards = (on: boolean) => {
  Object.assign(STRONGHOLD.tier1, on ? REWARDS.t1 : { ap: 0, healPct: 0 });
  Object.assign(STRONGHOLD.tier2, on ? REWARDS.t2 : { ap: 0, atkPct: 0, def: 0 });
  Object.assign(STRONGHOLD.tier3, on ? REWARDS.t3 : { ap: 0, kingShield: 0 });
};

const finish = (s: BattleState, seed: number, from: number, maxTurns: number): Side | null => {
  for (let t = from; t < maxTurns && s.winner === null; t++) s = resolveTurn(s, plan(s, seed * 7919 + t)).state;
  return s.winner;
};

type Outcome = 'died' | 'left' | 'captured' | 'lost' | 'ended';
interface Attempt { side: Side; standing: Standing; outcome?: Outcome; captureWin?: boolean; withReward?: Side | null; noReward?: Side | null }

type Terms = typeof STRONGHOLD.terms;
const audit = (label: string, terms: Terms, games: number, width = 8, height = 8) => {
  STRONGHOLD.terms = terms;
  setRewards(true);
  const attempts: Attempt[] = [];
  const maxTurns = 100;
  for (let g = 0; g < games; g++) {
    const seed = 500 + g;
    let s = createBattle({ width, height, decks: [FULL_DECK, FULL_DECK], seed });
    let cur: Attempt | null = null;
    let holderId: number | null = null;
    for (let t = 0; t < maxTurns && s.winner === null; t++) {
      const p = plan(s, seed * 7919 + t);
      const r = resolveTurn(s, p);
      const capture = r.events.find((e) => e.type === 'strongholdCapture');
      if (capture && cur) {
        cur.outcome = 'captured';
        // 기여도: 같은 턴을 보상 없이 다시 실행해 끝까지 둔다
        cur.withReward = finish(r.state, seed, t + 1, maxTurns);
        setRewards(false);
        const alt = resolveTurn(s, p).state;
        cur.noReward = finish(alt, seed, t + 1, maxTurns);
        setRewards(true);
        cur = null;
        holderId = null;
      }
      const next = r.state;
      const h = next.stronghold?.holderId ?? null;
      if (cur && h !== holderId) {
        // 보유자가 바뀌었거나 사라졌다
        const prev = holderId !== null ? findPiece(next, holderId) : undefined;
        cur.outcome = !next.stronghold ? 'lost' : !prev ? 'died' : 'left';
        cur = null;
      }
      if (h !== null && h !== holderId) {
        const piece = findPiece(next, h)!;
        cur = { side: piece.side, standing: standingOf(next, piece.side) };
        attempts.push(cur);
      }
      holderId = h;
      s = next;
    }
    if (cur && !cur.outcome) cur.outcome = 'ended';
    for (const a of attempts) if (a.outcome === 'captured' && a.captureWin === undefined) a.captureWin = a.withReward === a.side;
  }

  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '-');
  const count = (o: Outcome, list = attempts) => list.filter((a) => a.outcome === o).length;
  console.log(`\n[${label}] ${games}판 · 점령 시도 ${attempts.length}회 (${(attempts.length / games).toFixed(2)}/판)`);
  const groups: [string, Attempt[]][] = [
    ['우세·동률', attempts.filter((a) => a.standing === 'leading')],
    ['조금 열세(T1)', attempts.filter((a) => a.standing === 'tier1')],
    ['크게 열세(T2·T3)', attempts.filter((a) => a.standing === 'tier2' || a.standing === 'tier3')],
  ];
  for (const [name, list] of groups) {
    const caps = list.filter((a) => a.outcome === 'captured');
    const won = caps.filter((a) => a.withReward === a.side).length;
    const wonNo = caps.filter((a) => a.noReward === a.side).length;
    console.log(
      `  ${name} 시도 ${list.length}: 버티다 전사 ${count('died', list)} · 자진 이탈 ${count('left', list)} · 점령 ${caps.length} · 붕괴/종료 ${count('lost', list) + count('ended', list)}` +
        ` | 점령 후 승리 ${won}/${caps.length} (${pct(won, caps.length)}) · 뒤집지 못함 ${caps.length - won}` +
        ` | 같은 판을 보상 없이 두면 승리 ${wonNo}/${caps.length} (${pct(wonNo, caps.length)}) → 보상 기여 ${caps.length ? Math.round(((won - wonNo) / caps.length) * 100) : 0}%p`,
    );
  }
};

const t = (cover: number, hold: number) => ({ cover, hold });
const OLD: Terms = { leading: t(0.3, 2), tier1: t(0.3, 2), tier2: t(0.3, 2), tier3: t(0.3, 2) };
const NEW: Terms = { leading: t(0.2, 3), tier1: t(0.3, 2), tier2: t(0.4, 2), tier3: t(0.5, 1) };
const GAMES = Number(process.env.SIM_GAMES ?? 80);

it('stronghold audit', () => {
  audit('이전: 모두 엄폐 30% · 2턴 (8×8)', OLD, GAMES);
  audit('형편별 (8×8)', NEW, GAMES);
  audit('형편별 (10×8 가로로 긴 맵)', NEW, Math.round(GAMES / 2), 10, 8);
  audit('형편별 (8×10 세로로 긴 맵)', NEW, Math.round(GAMES / 2), 8, 10);
});
