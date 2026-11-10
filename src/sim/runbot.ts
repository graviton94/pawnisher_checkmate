/**
 * 화면 없는 출하 한 판 (측정 도구, 대과제 3 · D-280). sim/economy.sim.ts의 「평균 플레이어」 정책을 재사용 가능한 모듈로 옮겼다.
 * 실제 규칙 그대로 지도 → 대국(봇) → 보상 → 고물상 · 작업대 · 사건을 돌고, 승급(asc) 조항과 「억지로 넣은 아이템」을 받는다.
 * 쓰는 곳: sim/measure.sim.ts (승급 곡선 · 반장 비교 · 아이템 힘 값). 화면 · 저장과는 무관하다.
 */
import type { PieceType } from '../engine';
import { Rng } from '../engine/rng';
import { cardFits, COMMANDS, ECON, GRADE, partSlotsAt, gradeOf, isRefined, refinedOf, baseOf, rustOnce, RECRUITS, REWARD_COMMANDS, rollGrade, SHOP, FORGE, SLICE, START_DECK, START_SQUAD, KITS, type Axis, type BossRule, type CommandId, type Grade } from '../slice/cards';
import { CHARM_NUM, PART_GRADE, PART_NUM, SLICE_PARTS, partFits, type SlicePartId } from '../slice/parts';
import { makeCrew } from '../slice/crew';
import { ASC_NUM, buildRun, type MapNode } from '../slice/run';
import { SLICE_EVENTS, SLICE_EVENT_IDS, type EventState } from '../slice/events';
import { crackOrScrap, mendSquad, crewMaxHp, depthAt, fallenAfter, newSliceBattle, overhaulSquad, restSquad, squadAfter, type Squad } from '../slice/battle';
import { idleStats, playOut, playOutSearch, type BotStyle, type IdleStats } from '../slice/bot';

export type RunStyle = BotStyle | 'search';
export interface RunOpts {
  asc?: number;
  style?: RunStyle;
  /** 시작 덱에 억지로 넣는 카드 (아이템 힘 값 측정) */
  forceCards?: CommandId[];
  /** 시작부터 끼우는 부품 */
  forceParts?: SlicePartId[];
  /** 카드 가치표 (정책이 고를 때) — 없으면 등급 순 */
  value?: (id: CommandId) => number;
  /** 여벌 심장 톱니 (1패 대신) */
  revive?: number;
}
export interface BossLog { rule: BossRule; act: number; won: boolean; turns: number }
export interface RunResult {
  cleared: boolean;
  /** 마지막으로 도달한 막 (1 ~ 4, 4 = 종막) */
  act: number;
  ended: string;
  bosses: BossLog[];
  battles: number;
  turns: number;
  deck: number;
  parts: SlicePartId[];
  squad: PieceType[];
  /** 손 놓은 턴 (2026-11-09d) — 이 출하의 모든 대국 합 */
  idle: IdleStats;
}

const GRADE_RANK: Record<string, number> = { gold: 30, rare: 20, common: 10 };

/** 출하 한 판을 봇으로 돌린다 — 같은 seed · opts = 같은 결과 */
export const simulateRun = (seed: number, o: RunOpts = {}): RunResult => {
  const asc = o.asc ?? 0;
  const style = o.style ?? 'greedy';
  const val = o.value ?? ((id: CommandId) => GRADE_RANK[gradeOf(id)] ?? 10);
  const rng = new Rng(seed);
  const acts = buildRun(seed, asc);
  let squad: Squad[] = [];
  for (const t of START_SQUAD) squad.push(makeCrew(t, rng, squad.map((u) => u.name ?? '')));
  if (asc >= 10) { const i = squad.findIndex((u) => u.t !== 'K'); if (i >= 0) squad[i] = { ...squad[i], cracked: true }; }
  let deck: CommandId[] = [...(START_DECK as CommandId[]), ...(o.forceCards ?? [])];
  if (asc >= 7) deck[START_DECK.length - 1] = rustOnce(deck[START_DECK.length - 1]);
  const parts: SlicePartId[] = [...(o.forceParts ?? [])];
  const refined: CommandId[] = [];
  let gold = 0;
  let revive = o.revive ?? (asc > CHARM_NUM.startReviveUpTo ? 0 : 1);
  const bosses: BossLog[] = [];
  let battles = 0;
  let turnsAll = 0;
  const idle = idleStats();
  const usable = (id: CommandId) => cardFits(id, squad.map((u) => u.t));
  const hpRatio = () => squad.reduce((a, u) => a + (u.hp ?? crewMaxHp(u)) / crewMaxHp(u), 0) / Math.max(1, squad.length);
  const recruit = () => { const r = RECRUITS[rng.int(RECRUITS.length)]; squad.push(makeCrew(r.t, rng, squad.map((u) => u.name ?? ''))); deck.push(...r.cards); };
  const shopMul = (asc >= 4 ? ASC_NUM.shopMul : 1) * (parts.includes('greed') ? PART_NUM.greedShop : 1);
  // 부품 칸 (D-384 · 실제 게임과 같게, 2026-11-09d): 막마다 partSlotsAt 칸. 넘치면 가장 낮은 등급(같으면 오래된 것)을 녹여 나사 meltBack —
  // 새 부품이 가진 것 모두보다 낮으면 새 것을 녹인다. 억지로 넣은 부품(forceParts — 힘 값 측정)은 녹이지 않는다.
  let actNow = 0;
  const rankOf = (id: SlicePartId) => GRADE_RANK[PART_GRADE[id] ?? 'common'] ?? 0;
  const meltable = () => parts.map((id, i) => ({ id, i })).filter((x) => !(o.forceParts ?? []).includes(x.id));
  /** 이 부품을 사면 남나 (칸이 남거나 녹일 것보다 낮지 않다) */
  const keeps = (id: SlicePartId) => parts.length < partSlotsAt(actNow) || meltable().some((x) => rankOf(x.id) <= rankOf(id));
  const addPart = (id: SlicePartId) => {
    if (parts.length < partSlotsAt(actNow)) { parts.push(id); return; }
    gold += ECON.meltBack;
    const low = meltable().sort((x, y) => rankOf(x.id) - rankOf(y.id) || x.i - y.i)[0];
    if (!low || rankOf(id) < rankOf(low.id)) return;
    parts.splice(low.i, 1);
    parts.push(id);
  };
  const partOf = (elite: boolean) => {
    const pool = (Object.keys(SLICE_PARTS) as SlicePartId[]).filter((id) => !parts.includes(id) && partFits(id, squad.map((u) => u.t), parts));
    if (!pool.length) return;
    const offers: SlicePartId[] = [];
    while (offers.length < 3 && pool.length) {
      const g = rollGrade(rng.next(), elite ? GRADE.elite : GRADE.weights);
      const same = pool.filter((id) => (PART_GRADE[id] ?? 'common') === g);
      const from = same.length ? same : pool;
      const id = from[rng.int(from.length)];
      pool.splice(pool.indexOf(id), 1);
      offers.push(id);
    }
    addPart(offers.sort((a, b) => rankOf(b) - rankOf(a))[0]);
  };
  const cardOffers = (elite: boolean): CommandId[] => {
    const axes: Axis[] = ['cav', 'inf', 'king', 'chain', 'push', 'tactic'];
    const out: CommandId[] = [];
    const n = 3 - (asc >= 11 ? 3 - ASC_NUM.rewardChoices : 0);
    for (const a of axes.sort(() => rng.next() - 0.5)) {
      if (out.length >= n) break;
      const pool = REWARD_COMMANDS.filter((id) => (COMMANDS[id].axis === a || COMMANDS[id].axis2 === a) && !out.includes(id) && usable(id));
      const g = rollGrade(rng.next(), elite ? GRADE.elite : GRADE.weights);
      const same = pool.filter((id) => gradeOf(id) === g);
      const from = same.length ? same : pool;
      if (from.length) out.push(from[rng.int(from.length)]);
    }
    return out;
  };
  const takeCard = (offers: CommandId[], recruitOffer: boolean) => {
    if (recruitOffer && squad.length < SLICE.squadMax && (squad.length < 6 || rng.next() < 0.5)) return recruit();
    const best = offers.sort((a, b) => val(b) - val(a))[0];
    if (best && val(best) > 0) deck.push(best);
  };
  const out = (cleared: boolean, act: number, ended: string): RunResult => ({ cleared, act, ended, bosses, battles, turns: turnsAll, deck: deck.length, parts: [...parts], squad: squad.map((u) => u.t), idle });
  for (const [ai, a] of acts.entries()) {
    actNow = ai;
    let prev: MapNode | null = null;
    for (const [ri, row] of a.rows.entries()) {
      const open: MapNode[] = (prev?.to ?? row.map((_, i) => i)).map((i: number) => row[i]);
      const hp = hpRatio();
      const pref = (n: MapNode) => (hp < 0.5 && n.kind === 'forge' ? 9 : 0) + (gold >= 90 && n.kind === 'shop' ? 6 : 0) + ({ battle: 3, check: hp > 0.7 ? 4 : 1, chest: 5, event: 2, forge: hp < 0.7 ? 3 : 1, shop: 1, boss: 9 } as Record<string, number>)[n.kind] + rng.next() * 2;
      const n: MapNode = open.sort((x: MapNode, y: MapNode) => pref(y) - pref(x))[0];
      prev = n;
      const frac = ri / a.rows.length;
      if (n.battle) {
        const def = n.battle;
        let ok = false;
        let fell: Squad[] = [];
        for (let tryN = 0; !ok && (tryN === 0 || (revive > 0 && (revive--, true))); tryN++) {
          const b = newSliceBattle(squad, def.enemy, deck.filter(usable), seed * 7 + ri * 131 + tryN, { enemyKingHp: def.kingHp, enemyHp: def.enemyHp, depth: depthAt(ai, frac), parts, boss: def.boss, bossRule: def.bossRule, traits: def.traits, width: def.w, height: def.h, place: def.place, gold, shock: asc >= 2, guard: def.guard, atkMul: (asc >= 9 ? ASC_NUM.enemyAtk : 1) * (def.atk ?? 1), eliteOne: def.eliteOne });
          const r = style === 'search' ? playOutSearch(b, 40, 3, 4) : playOut(b, 40, undefined, style);
          battles += 1;
          turnsAll += r.turns;
          idle.turns += r.idle.turns; idle.idle += r.idle.idle; idle.apLeft += r.idle.apLeft; idle.idleAp += r.idle.idleAp;
          if (def.boss && def.bossRule) bosses.push({ rule: def.bossRule, act: ai + 1, won: r.won, turns: r.turns });
          if (r.won) {
            ok = true;
            const cs = crackOrScrap(fallenAfter(b, squad).map((f) => f.crew));
            fell = cs.scrapped;
            gold += Math.round(b.coins * SLICE.coinValue * (asc >= 8 ? ASC_NUM.coinMul : 1)) + Math.floor(b.overkill / (parts.includes('scrapMagnet') ? PART_NUM.scrapPer : 10)) + (parts.includes('piggyGear') ? PART_NUM.piggy : 0);
            squad = [...restSquad(squadAfter(b, squad)), ...cs.back];
          }
        }
        if (!ok) return out(false, ai + 1, `${ai + 1}막 ${def.title}`);
        if (def.reward === 'end') return out(true, 4, '');
        if (def.reward === 'recruit') recruit();
        else if (def.reward === 'kit') { const k = KITS[rng.int(KITS.length)]; addPart(k.part); deck.push(...k.cards); }
        else if (def.reward === 'part') { partOf(true); if (squad.length < SLICE.squadMax) recruit(); takeCard(cardOffers(true), false); }
        else if (def.reward === 'card') {
          const offers = cardOffers(false);
          const best = Math.max(...offers.map(val), -99);
          if (fell.length && best < 25) squad = overhaulSquad(squad, fell).squad;
          else takeCard(offers, rng.next() < SLICE.recruitChance);
        }
      } else if (n.kind === 'chest') {
        gold += SLICE.chestGold[0] + rng.int(SLICE.chestGold[1] - SLICE.chestGold[0] + 1);
        partOf(false);
      } else if (n.kind === 'shop') {
        const pool = REWARD_COMMANDS.filter(usable);
        const offers: CommandId[] = [];
        while (offers.length < SHOP.cards && pool.length) offers.push(pool.splice(rng.int(pool.length), 1)[0]);
        if (hpRatio() < 0.55 && gold >= SHOP.healPrice * shopMul) { gold -= Math.round(SHOP.healPrice * shopMul); squad = restSquad(squad, SHOP.healPct); }
        for (const id of offers.sort((x, y) => val(y) - val(x))) {
          const p = Math.round(SHOP.gradePrice[gradeOf(id) as Grade] * shopMul);
          if (val(id) >= 15 && gold >= p) { gold -= p; deck.push(id); break; }
        }
        const pp = (Object.keys(SLICE_PARTS) as SlicePartId[]).filter((id) => !parts.includes(id) && partFits(id, squad.map((u) => u.t), parts));
        const part = pp.length ? pp[rng.int(pp.length)] : null;
        if (part) { const p = Math.round(SHOP.partGradePrice[(PART_GRADE[part] ?? 'common') as Grade] * shopMul); if (gold >= p + 30 && keeps(part)) { gold -= p; addPart(part); } }
        if (deck.length > 14 && gold >= SHOP.removePrice * shopMul) { const w = [...deck].sort((x, y) => val(x) - val(y))[0]; deck.splice(deck.indexOf(w), 1); gold -= Math.round(SHOP.removePrice * shopMul); }
      } else if (n.kind === 'forge') {
        squad = mendSquad(squad).squad;
        if (hpRatio() < 0.6) squad = restSquad(squad, FORGE.repairPct * (asc >= 3 ? ASC_NUM.restMul : 1));
        else {
          const cand = [...new Set(deck)].filter((id) => !isRefined(id) && COMMANDS[id].cost >= 1).sort((x, y) => val(y) - val(x));
          if (cand[0]) { deck[deck.indexOf(cand[0])] = refinedOf(baseOf(cand[0])); refined.push(cand[0]); }
        }
      } else if (n.kind === 'event') {
        const id = SLICE_EVENT_IDS[rng.int(SLICE_EVENT_IDS.length)];
        const st: EventState = { squad, deck, refined, gold };
        const ch = SLICE_EVENTS[id].choices.filter((c) => c.desc && !c.blocked?.(st));
        if (ch.length) {
          const c = ch[rng.int(ch.length)];
          const res = c.apply(st, rng);
          squad = st.squad; deck = st.deck; gold = st.gold;
          if (res.partPick) partOf(false);
          if (res.recruit) squad.push(makeCrew(res.recruit, rng, squad.map((u) => u.name ?? '')));
        }
      }
    }
    squad = mendSquad(restSquad(squad, asc >= 3 ? ASC_NUM.restMul : 1)).squad;
  }
  return out(true, 4, '');
};
