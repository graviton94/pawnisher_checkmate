import { it } from 'vitest';
import { cardMoves, cardPieces, canPlay, endTurn, isInstant, newSliceBattle, playCard, type SliceBattle } from '../src/slice/battle';
import { START_COMMANDS, type CommandId } from '../src/slice/cards';
import type { SlicePartId } from '../src/slice/parts';
import type { BattleEvent, PieceType } from '../src/engine';

/**
 * 조합 봇 (D-145): 의도한 조합이 실제로 "부서지는지" 잰다 — 턴 안에서 카드 순서를 빔 탐색해 그 턴 피해를 최대로.
 * 지표: 1~3턴 평균 턴 피해 · 한 턴 최대 피해 · 한 턴 최대 처치. 비교 기준 = 부품 없는 시작 덱.
 */
type Step = { i: number; p?: number; to?: { x: number; y: number } };
const clone = (b: SliceBattle): SliceBattle => JSON.parse(JSON.stringify(b)) as SliceBattle;
const enemyDmg = (b: SliceBattle, ev: BattleEvent[]) => {
  let d = 0;
  for (const e of ev) if (e.type === 'attack' || e.type === 'blast') for (const h of e.hits) if (!b.s.pieces.some((p) => p.id === h.targetId && p.side === 0)) d += h.damage;
  return d;
};
const steps = (b: SliceBattle): Step[] => {
  const out: Step[] = [];
  b.hand.forEach((id, i) => {
    if (!canPlay(b, i)) return;
    if (isInstant(id)) return void out.push({ i });
    for (const p of cardPieces(b, i)) {
      const tos = cardMoves(b, i, p.id);
      if (!tos.length) out.push({ i, p: p.id });
      for (const to of tos) out.push({ i, p: p.id, to });
    }
  });
  return out;
};
/** 한 턴 빔 탐색: 피해 합이 큰 순서로 */
const bestTurn = (b0: SliceBattle, width = 24): { b: SliceBattle; dmg: number; kills: number } => {
  let beam = [{ b: b0, dmg: 0 }];
  let best = { b: b0, dmg: 0, kills: 0 };
  for (let depth = 0; depth < 9; depth++) {
    const next: { b: SliceBattle; dmg: number }[] = [];
    for (const node of beam) {
      for (const st of steps(node.b)) {
        const c = clone(node.b);
        const r = playCard(c, st.i, st.p, st.to);
        if (typeof r === 'string') continue;
        const d = node.dmg + enemyDmg(c, r.events) + (c.s.winner === 0 ? 5000 : 0);
        next.push({ b: c, dmg: d });
      }
    }
    if (!next.length) break;
    next.sort((x, y) => y.dmg - x.dmg);
    beam = next.slice(0, width);
    if (beam[0].dmg > best.dmg) best = { b: beam[0].b, dmg: beam[0].dmg, kills: beam[0].b.kills };
    if (beam[0].b.s.winner !== null) break;
  }
  return best;
};

const CASES: { name: string; parts: SlicePartId[]; add: CommandId[] }[] = [
  { name: '기준 (부품 없음)', parts: [], add: [] },
  { name: '편자 + 재도약×3', parts: ['horseshoe'], add: ['rebound', 'rebound', 'rebound'] },
  { name: '자석 손 + 불씨×2 + 말발굽', parts: ['magnet'], add: ['spark', 'spark', 'hoofKick'] },
  { name: '증폭 코일 + 불씨×2 + 마무리', parts: ['coil'], add: ['spark', 'spark', 'finisher'] },
  { name: '이중 톱니 + 코일 + 연속 도약×2', parts: ['echo', 'coil'], add: ['doubleLeap', 'doubleLeap', 'spark'] },
  { name: '조립 라인 + 희생 수×2 + 마무리', parts: ['assembly'], add: ['gambit', 'gambit', 'finisher'] },
  { name: '편자 + 기마 돌격×2 + 행진', parts: ['horseshoe'], add: ['cavCharge', 'cavCharge', 'march'] },
  { name: '쇠망치 + 밀어치기 + 방패×2', parts: ['hammer'], add: ['shove', 'shieldBash', 'shieldBash'] },
  { name: '밀치기 카드만 (부품 없음)', parts: [], add: ['shove', 'shieldBash', 'ram'] },
  { name: '행진 북 + 행진×2 + 징집', parts: ['drum'], add: ['march', 'march', 'draft'] },
  { name: '무거운 왕관 + 분노한 왕×2 + 왕의 일격', parts: ['crown'], add: ['wrath', 'wrath', 'kingBlow'] },
];

it('slice combos', () => {
  const N = Number(process.env.SIM_GAMES ?? 30);
  // 맞을 대상이 넉넉한 판: 적이 많고 튼튼하다 (턴 피해의 상한을 보려고)
  const enemy: PieceType[] = ['K', 'P', 'P', 'P', 'N', 'B', 'R'];
  for (const cs of CASES) {
    let sum = 0, cnt = 0, maxD = 0, maxK = 0;
    for (let g = 0; g < N; g++) {
      const b = newSliceBattle([{ t: 'K' }, { t: 'P' }, { t: 'P' }, { t: 'N' }, { t: 'B' }], enemy, [...START_COMMANDS, ...cs.add], 300 + g * 13, { parts: cs.parts, enemyKingHp: 3 });
      let cur = b;
      for (let t = 0; t < 3 && cur.s.winner === null; t++) {
        const r = bestTurn(cur);
        const d = Math.min(r.dmg, 4999);
        sum += d; cnt++;
        maxD = Math.max(maxD, d);
        maxK = Math.max(maxK, r.kills);
        cur = r.b;
        if (cur.s.winner !== null) break;
        endTurn(cur, true);
      }
    }
    console.log(`${cs.name.padEnd(28)} 턴 피해 평균 ${(sum / cnt).toFixed(0).padStart(4)} · 최대 ${String(maxD).padStart(4)} · 한 턴 최대 연쇄 ${maxK}`);
  }
}, 1200000);
