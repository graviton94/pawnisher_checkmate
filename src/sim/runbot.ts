/**
 * 화면 없는 출하 한 판 (측정 도구, 대과제 3 · D-280). sim/economy.sim.ts의 「평균 플레이어」 정책을 재사용 가능한 모듈로 옮겼다.
 * 실제 규칙 그대로 지도 → 대국(봇) → 보상 → 고물상 · 작업대 · 사건을 돌고, 승급(asc) 조항과 「억지로 넣은 아이템」을 받는다.
 * 쓰는 곳: sim/measure.sim.ts (승급 곡선 · 반장 비교 · 아이템 힘 값). 화면 · 저장과는 무관하다.
 */
import type { PieceType } from '../engine';
import { Rng } from '../engine/rng';
import { cardFits, COMMANDS, ECON, GRADE, partSlotsAt, gradeOf, isRefined, refinedOf, baseOf, rustOnce, RECRUITS, REWARD_COMMANDS, rollGrade, rollRecruit, SHOP, FORGE, SLICE, START_DECK, START_SQUAD, KITS, type Axis, type BossRule, type CommandId, type Grade } from '../slice/cards';
import { CHARM_NUM, PART_GRADE, PART_NUM, SLICE_PARTS, partFits, type SlicePartId } from '../slice/parts';
import { makeCrew } from '../slice/crew';
import { ASC_NUM, buildRun, type MapNode } from '../slice/run';
import { SLICE_EVENTS, SLICE_EVENT_IDS, type EventState } from '../slice/events';
import { crackOrScrap, mendSquad, crewMaxHp, depthAt, fallenAfter, newSliceBattle, overhaulSquad, restSquad, squadAfter, type Squad } from '../slice/battle';
import { STARTER_CARDS, STARTER_PARTS } from '../data/unlocks';
import { BUILD_FAMILIES, SUPPORT_CARDS } from '../data/build-supply';
import { chooseBuildCard, chooseBuildPart, firstShopParts, kitOffers } from '../slice/build-offers';
import { idleStats, playOut, playOutSearch, type BotStyle, type IdleStats } from '../slice/bot';

export type RunStyle = BotStyle | 'search';
export type RunBuild = 'neutral' | 'mixed' | 'knight' | 'rook' | AxisBuild;
/** 빌드 축 집착형 (D-461 실험실): 그 축의 부품 · 카드를 우선 고른다 */
export type AxisBuild = 'ax-cav' | 'ax-inf' | 'ax-king' | 'ax-chain' | 'ax-push' | 'ax-tactic';
const axisOf = (b: RunBuild): Axis | null => (b.startsWith('ax-') ? (b.slice(3) as Axis) : null);
export interface RunOpts {
  asc?: number;
  build?: RunBuild;
  pool?: 'all' | 'starter';
  style?: RunStyle;
  /** 시작 덱에 억지로 넣는 카드 (아이템 힘 값 측정) */
  forceCards?: CommandId[];
  /** 시작부터 끼우는 부품 */
  forceParts?: SlicePartId[];
  /** 카드 가치표 (정책이 고를 때) — 없으면 등급 순 */
  value?: (id: CommandId) => number;
  /** 여벌 심장 톱니 (1패 대신) */
  revive?: number;
  /**
   * 메타 페르소나 (D-456 실험실): standard = 지금 봇 · risky = 체력이 낮아도 검문을 고르고 수리 대신 다듬기, 상점 치료 안 함 ·
   * hoarder = 카드 보상을 거르지 않고 다 집으며 카드를 지우지 않는다. (아키타입 집착형은 build knight · rook)
   */
  persona?: 'standard' | 'risky' | 'hoarder';
  /** 두뇌 봇의 사람다운 실수 (D-456): 상위 3순서 소프트맥스 온도 — 0 = 늘 최선 */
  temp?: number;
}
export interface BossLog { rule: BossRule; act: number; won: boolean; turns: number }
export interface RunResult {
  cleared: boolean;
  familyParts: number;
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
  /** 대국마다 (D-449 판 길이 점검): 막 · 종류 · 턴 수 · 승패 · 쓰러진 분대원 · 한 적 턴에 가장 많이 쓰러진 수 */
  log: BattleLog[];
  /** 실험실 (D-456): 제시된 카드 · 부품과 고른 것 (픽률 · 보유 시 승률) */
  offers: { id: string; part: boolean; taken: boolean }[];
  /** 종막 직전 쥔 나사 · 끝에 덱에 남은 시작 카드 수 (경제 · 압축) */
  goldAtFinal: number;
  starterLeft: number;
}
export interface BattleLog { act: number; kind: 'battle' | 'check' | 'boss'; title: string; turns: number; won: boolean; fell: number; maxFellInTurn: number; kingHpLost: number; /** 이겼을 때 살아 있던 적 수 (킹만 잡고 끝냈나) · 처음 적 수 */ enemiesLeft: number; enemies: number; /** 분대원을 쓰러뜨린 적 유형 */ killers: string; /** 실험실 (D-456): 이긴 뒤 분대 체력 비율 · 우리 피해 중 가장 센 한 턴의 몫 · 가장 큰 한 방 · 턴당 준 피해 */ hpAfter: number; swing: number; peak: number; dpt: number }

const GRADE_RANK: Record<string, number> = { gold: 30, rare: 20, common: 10 };

/** 출하 한 판을 봇으로 돌린다 — 같은 seed · opts = 같은 결과 */
export const simulateRun = (seed: number, o: RunOpts = {}): RunResult => {
  const asc = o.asc ?? 0;
  const style = o.style ?? 'greedy';
  const persona = o.persona ?? 'standard';
  const offersLog: RunResult['offers'] = [];
  let goldAtFinal = -1;
  const build = o.build ?? 'neutral';
  const ax = axisOf(build);
  const family = ax ? (Object.keys(SLICE_PARTS) as SlicePartId[]).filter((id) => SLICE_PARTS[id].axis === ax) : BUILD_FAMILIES[build] ?? [];
  const open = new Set([...STARTER_CARDS, ...STARTER_PARTS]);
  const isOpen = (id: string) => o.pool !== 'starter' || open.has(id);
  const val = o.value ?? ((id: CommandId) => (GRADE_RANK[gradeOf(id)] ?? 10) + (SUPPORT_CARDS[build]?.includes(id) || (ax && (COMMANDS[id].axis === ax || COMMANDS[id].axis2 === ax)) ? 18 : 0) + (build === 'knight' && COMMANDS[id].who === 'N' || build === 'rook' && COMMANDS[id].who === 'R' ? 10 : 0));
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
  const log: BattleLog[] = [];
  const usable = (id: CommandId) => cardFits(id, squad.map((u) => u.t));
  const hpRatio = () => squad.reduce((a, u) => a + (u.hp ?? crewMaxHp(u)) / crewMaxHp(u), 0) / Math.max(1, squad.length);
  const recruit = (single = false) => {
    const pool = [...RECRUITS], offered: typeof RECRUITS = [];
    while (pool.length && offered.length < (single ? 1 : 3)) { const r = rollRecruit(pool, rng.next()); offered.push(r); pool.splice(pool.indexOf(r), 1); }
    // 축 집착형은 그 축의 기물을 데려온다 (D-462 — 보병 봇이 「안 가진 기물 우선」으로 폰을 더 받지 않아 폰 카드가 죽은 카드가 됐다)
    const want: PieceType | null = build === 'rook' || ax === 'push' ? 'R' : build === 'knight' || ax === 'cav' ? 'N' : ax === 'inf' ? 'P' : null;
    const pref = (x: { t: PieceType }) => Number(want ? x.t === want : !squad.some((u) => u.t === x.t));
    const r = offered.sort((a, z) => pref(z) - pref(a))[0];
    if (r) { squad.push(makeCrew(r.t, rng, squad.map(u => u.name ?? ''))); deck.push(...r.cards); }
  };
  let shopsSeen = 0;
  const svcUsed = { refine: 0, remove: 0 };
  const shopMul = () => (asc >= 4 ? ASC_NUM.shopMul : 1) * (parts.includes('greed') ? PART_NUM.greedShop : 1);
  // 부품 칸 (D-384 · 실제 게임과 같게, 2026-11-09d): 막마다 partSlotsAt 칸. 넘치면 가장 낮은 등급(같으면 오래된 것)을 녹여 나사 meltBack —
  // 새 부품이 가진 것 모두보다 낮으면 새 것을 녹인다. 억지로 넣은 부품(forceParts — 힘 값 측정)은 녹이지 않는다.
  let actNow = 0;
  const rankOf = (id: SlicePartId) => (GRADE_RANK[PART_GRADE[id] ?? 'common'] ?? 0) + (family.includes(id) ? 18 : 0);
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
    const pool = (Object.keys(SLICE_PARTS) as SlicePartId[]).filter((id) => !parts.includes(id) && isOpen(id) && partFits(id, squad.map((u) => u.t), parts, squad));
    if (!pool.length) return;
    const offers: SlicePartId[] = [];
    while (offers.length < 3 && pool.length) {
      const g = rollGrade(rng.next(), elite ? GRADE.elite : GRADE.weights);
      const same = pool.filter((id) => (PART_GRADE[id] ?? 'common') === g);
      const from = same.length ? same : pool;
      const id = chooseBuildPart(from, parts, rng, offers.length === 0 && same.length > 0);
      pool.splice(pool.indexOf(id), 1);
      offers.push(id);
    }
    const pick = offers.sort((a, b) => rankOf(b) - rankOf(a))[0];
    for (const id of offers) offersLog.push({ id, part: true, taken: id === pick });
    addPart(pick);
  };
  const cardOffers = (elite: boolean): CommandId[] => {
    const axes: Axis[] = ['cav', 'inf', 'king', 'chain', 'push', 'tactic'];
    const out: CommandId[] = [];
    const n = 3 - (asc >= 11 ? 3 - ASC_NUM.rewardChoices : 0);
    for (const a of axes.sort(() => rng.next() - 0.5)) {
      if (out.length >= n) break;
      const pool = REWARD_COMMANDS.filter((id) => (COMMANDS[id].axis === a || COMMANDS[id].axis2 === a) && !out.includes(id) && usable(id) && isOpen(id));
      const g = rollGrade(rng.next(), elite ? GRADE.elite : GRADE.weights);
      const same = pool.filter((id) => gradeOf(id) === g);
      const from = same.length ? same : pool;
      if (from.length) out.push(out.length === 0 ? chooseBuildCard(from, parts, rng) : from[rng.int(from.length)]);
    }
    return out;
  };
  const takeCard = (offers: CommandId[], recruitOffer: boolean) => {
    if (recruitOffer && squad.length < SLICE.squadMax && (squad.length < 6 || rng.next() < 0.5)) return recruit(true);
    const best = offers.sort((a, b) => val(b) - val(a))[0];
    const take = best && (val(best) > 0 || persona === 'hoarder');
    for (const id of offers) offersLog.push({ id, part: false, taken: !!take && id === best });
    if (take) deck.push(best);
  };
  const out = (cleared: boolean, act: number, ended: string): RunResult => ({ cleared, act, ended, familyParts: parts.filter(id => family.includes(id)).length, bosses, battles, turns: turnsAll, deck: deck.length, parts: [...parts], squad: squad.map((u) => u.t), idle, log, offers: offersLog, goldAtFinal, starterLeft: deck.filter((id) => (START_DECK as string[]).includes(id)).length });
  for (const [ai, a] of acts.entries()) {
    actNow = ai;
    let prev: MapNode | null = null;
    for (const [ri, row] of a.rows.entries()) {
      const open: MapNode[] = (prev?.to ?? row.map((_, i) => i)).map((i: number) => row[i]);
      const hp = hpRatio();
      const pref = persona === 'risky'
        ? (n: MapNode) => ({ battle: 3, check: 6, chest: 5, event: 2, forge: 1, shop: 1, boss: 9 } as Record<string, number>)[n.kind] + rng.next() * 2
        : (n: MapNode) => (hp < 0.5 && n.kind === 'forge' ? 9 : 0) + (gold >= 90 && n.kind === 'shop' ? 6 : 0) + ({ battle: 3, check: hp > 0.7 ? 4 : 1, chest: 5, event: 2, forge: hp < 0.7 ? 3 : 1, shop: 1, boss: 9 } as Record<string, number>)[n.kind] + rng.next() * 2;
      const n: MapNode = open.sort((x: MapNode, y: MapNode) => pref(y) - pref(x))[0];
      prev = n;
      const frac = ri / a.rows.length;
      if (n.battle) {
        const def = n.battle;
        if (ai === acts.length - 1 && def.reward === 'end' && goldAtFinal < 0) goldAtFinal = gold;
        let ok = false;
        let fell: Squad[] = [];
        for (let tryN = 0; !ok && (tryN === 0 || (revive > 0 && (revive--, true))); tryN++) {
          const b = newSliceBattle(squad, def.enemy, deck.filter(usable), seed * 7 + ri * 131 + tryN, { enemyKingHp: def.kingHp, enemyHp: def.enemyHp, depth: depthAt(ai, frac), parts, boss: def.boss, bossRule: def.bossRule, traits: def.traits, width: def.w, height: def.h, place: def.place, gold, shock: asc >= 2, guard: def.guard, atkMul: (asc >= 9 ? ASC_NUM.enemyAtk : 1) * (def.atk ?? 1), eliteOne: def.eliteOne });
          const r = style === 'search' ? playOutSearch(b, 40, 3, 4, o.temp ?? 0) : playOut(b, 40, undefined, style);
          battles += 1;
          turnsAll += r.turns;
          idle.turns += r.idle.turns; idle.idle += r.idle.idle; idle.apLeft += r.idle.apLeft; idle.idleAp += r.idle.idleAp;
          if (def.boss && def.bossRule) bosses.push({ rule: def.bossRule, act: ai + 1, won: r.won, turns: r.turns });
          {
            const byTurn = new Map<number, number>();
            for (const f of b.falls) byTurn.set(f.turn, (byTurn.get(f.turn) ?? 0) + 1);
            const k = b.s.pieces.find((p) => p.side === 0 && p.type === 'K');
            log.push({ act: ai + 1, kind: def.boss ? 'boss' : n.kind === 'check' ? 'check' : 'battle', title: def.title, turns: r.turns, won: r.won, fell: b.falls.length, maxFellInTurn: Math.max(0, ...byTurn.values()), kingHpLost: k ? k.maxHp - Math.max(0, k.hp) : 999, enemiesLeft: b.s.pieces.filter((p) => p.side === 1 && p.hp > 0).length, enemies: def.enemy.length, killers: b.falls.map((f) => f.byType ?? '?').join(''), hpAfter: r.won ? (() => { const sq = squadAfter(b, squad); return sq.reduce((a, u) => a + Math.min(crewMaxHp(u), Math.max(0, u.hp ?? crewMaxHp(u))), 0) / Math.max(1, sq.reduce((a, u) => a + crewMaxHp(u), 0)); })() : 0, swing: (() => { const d = Array.from(b.dealt ?? [], (x) => x ?? 0); const sum = d.reduce((a, x) => a + x, 0); return sum ? Math.max(...d) / sum : 0; })(), peak: b.peakHit ?? 0, dpt: Array.from(b.dealt ?? [], (x) => x ?? 0).reduce((a, x) => a + x, 0) / Math.max(1, r.turns) });
          }
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
        else if (def.reward === 'kit') {
          const pool = KITS.filter(k => (PART_GRADE[k.part] ?? 'common') !== 'gold' && !parts.includes(k.part) && (!k.needs || squad.some(u => u.t === k.needs)) && k.cards.every(usable));
          const { offers } = kitOffers(pool, rng); const k = offers.sort((a, z) => rankOf(z.part) - rankOf(a.part))[0];
          if (k) { addPart(k.part); deck.push(...k.cards); }
        }
        else if (def.reward === 'part') { partOf(true); if (squad.length < SLICE.squadMax) recruit(); takeCard(cardOffers(true), false); }
        else if (def.reward === 'card') {
          const offers = cardOffers(false);
          const best = Math.max(...offers.map(val), -99);
          if (persona !== 'hoarder' && fell.length && best < 25) squad = overhaulSquad(squad, fell).squad;
          else takeCard(offers, rng.next() < SLICE.recruitChance);
        }
      } else if (n.kind === 'chest') {
        gold += SLICE.chestGold[0] + rng.int(SLICE.chestGold[1] - SLICE.chestGold[0] + 1);
        partOf(false);
      } else if (n.kind === 'shop') {
        const pool = REWARD_COMMANDS.filter(id => usable(id) && isOpen(id));
        const offers: CommandId[] = [];
        while (offers.length < SHOP.cards && pool.length) offers.push(pool.splice(rng.int(pool.length), 1)[0]);
        // 실제 고물상과 같게 (D-457): 서비스는 셋 중 둘 · 다듬기/빼기 값은 쓸 때마다 오른다 · 살 만한 카드는 둘까지
        const svc = new Set<string>();
        while (svc.size < ECON.shopSvc) svc.add((['heal', 'refine', 'remove'] as const)[rng.int(3)]);
        if (svc.has('heal') && persona !== 'risky' && hpRatio() < 0.55 && gold >= SHOP.healPrice * shopMul()) { gold -= Math.round(SHOP.healPrice * shopMul()); squad = restSquad(squad, SHOP.healPct); }
        let bought = 0;
        for (const id of offers.sort((x, y) => val(y) - val(x))) {
          const p = Math.round(SHOP.gradePrice[gradeOf(id) as Grade] * shopMul());
          if (bought < 2 && val(id) >= 15 && gold >= p) { gold -= p; deck.push(id); bought++; }
        }
        const pp = (Object.keys(SLICE_PARTS) as SlicePartId[]).filter((id) => !parts.includes(id) && isOpen(id) && partFits(id, squad.map((u) => u.t), parts, squad));
        const from = firstShopParts(pp, parts, shopsSeen++);
        const part = from.length ? from[rng.int(from.length)] : null;
        if (part) { const p = Math.round(SHOP.partGradePrice[(PART_GRADE[part] ?? 'common') as Grade] * shopMul()); if (gold >= p + 30 && keeps(part)) { gold -= p; addPart(part); } }
        const removeCost = Math.round((SHOP.removePrice + ECON.svcStep * svcUsed.remove) * shopMul());
        if (svc.has('remove') && persona !== 'hoarder' && deck.length > 10 && gold >= removeCost) { const w = [...deck].sort((x, y) => val(x) - val(y))[0]; deck.splice(deck.indexOf(w), 1); gold -= removeCost; svcUsed.remove++; }
        const refineCost = Math.round((SHOP.refinePrice + ECON.svcStep * svcUsed.refine) * shopMul());
        if (svc.has('refine') && gold >= refineCost + 60) {
          const cand = [...new Set(deck)].filter((id) => !isRefined(id) && COMMANDS[id].cost >= 1).sort((x, y) => val(y) - val(x));
          if (cand[0]) { deck[deck.indexOf(cand[0])] = refinedOf(baseOf(cand[0])); refined.push(cand[0]); gold -= refineCost; svcUsed.refine++; }
        }
      } else if (n.kind === 'forge') {
        squad = mendSquad(squad).squad;
        if (persona !== 'risky' && hpRatio() < 0.6) squad = restSquad(squad, FORGE.repairPct * (asc >= 3 ? ASC_NUM.restMul : 1));
        // 작업대 카드 빼기 (D-457 — 실제 작업대엔 있는데 봇이 쓰지 않았다): 시작 카드가 셋 이상 남으면 하나 뺀다
        else if (persona !== 'hoarder' && deck.length > 10 && deck.filter((id) => (START_DECK as string[]).includes(id)).length >= 3) { const w = [...deck].sort((x, y) => val(x) - val(y))[0]; deck.splice(deck.indexOf(w), 1); }
        else {
          const cand = [...new Set(deck)].filter((id) => !isRefined(id) && COMMANDS[id].cost >= 1).sort((x, y) => val(y) - val(x));
          if (cand[0]) { deck[deck.indexOf(cand[0])] = refinedOf(baseOf(cand[0])); refined.push(cand[0]); }
        }
      } else if (n.kind === 'event') {
        const id = SLICE_EVENT_IDS[rng.int(SLICE_EVENT_IDS.length)];
        const st: EventState = { squad, deck, refined, gold, parts, charms: { revive, rewind: 0 } };
        const ch = SLICE_EVENTS[id].choices.filter((c) => c.desc && !c.blocked?.(st));
        if (ch.length) {
          const c = ch[rng.int(ch.length)];
          const res = c.apply(st, rng);
          squad = st.squad; deck = st.deck; gold = st.gold; revive = st.charms?.revive ?? revive;
          if (res.partPick) partOf(false);
          if (res.givePart && !parts.includes(res.givePart)) addPart(res.givePart);
          if (res.recruit) squad.push({ ...makeCrew(res.recruit, rng, squad.map((u) => u.name ?? '')), ...(res.recruitQuirk ? { quirk: res.recruitQuirk } : {}) });
        }
      }
    }
    squad = mendSquad(restSquad(squad, asc >= 3 ? ASC_NUM.restMul : 1)).squad;
  }
  return out(true, 4, '');
};
