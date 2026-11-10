import { it } from 'vitest';
import { writeFileSync, readFileSync } from 'node:fs';
import type { PieceType } from '../src/engine';
import { Rng } from '../src/engine/rng';
import { cardFits, COMMANDS, GRADE, gradeOf, isRefined, refinedOf, baseOf, RECRUITS, REWARD_COMMANDS, rollGrade, SHOP, FORGE, SLICE, START_DECK, START_SQUAD, KITS, type Axis, type CommandId, type Grade } from '../src/slice/cards';
import { CHARM_NUM, PART_GRADE, PART_NUM, SLICE_PARTS, partFits, type SlicePartId } from '../src/slice/parts';
import { makeCrew } from '../src/slice/crew';
import { buildRun, battleFor, MAP, type MapNode } from '../src/slice/run';
import { SLICE_EVENTS, SLICE_EVENT_IDS, type EventState } from '../src/slice/events';
import { crackOrScrap, mendSquad, crewMaxHp, depthAt, fallenAfter, newSliceBattle, overhaulSquad, restSquad, squadAfter, type Squad } from '../src/slice/battle';
import { playOut, playOutSearch, type BotStyle } from '../src/slice/bot';

/**
 * 성장 설계 시뮬레이션 (D-218, 사용자: "선택지별 획득 수량 · 기대 효과 · 덱을 어디까지 빌드할 수 있는지 — 기물 + 강화 + 덱 + 보상 아이템,
 * 모든 선택지의 기대 횟수와 성장 곡선을 면밀하게"). `npm run sim -- economy`
 *
 * 「평균 플레이어」 정책 (실제 화면 규칙 그대로, 고르는 쪽만 정책):
 * - 지도: 이어진 노드 중 — HP 50% 아래면 작업대 > 사건 > 대국, 나사 90 이상이면 고물상, 그 밖엔 가중 무작위(대국 · 검문 · 상자 선호).
 * - 대국 보상: 카드 셋(등급을 먼저 뽑는다) + 25% 새 분대원 — 측정 가치(sim/rarity-result.json)가 가장 큰 것, 분대 6 아래면 분대원 우선.
 * - 검문 · 반장: 부품(높은 등급 가중) → 분대원(상한 아래) → 카드. 상자: 나사 20~35 + 부품.
 * - 고물상: 가치 15 이상 카드 중 가장 좋은 것(값이 되면) · 부품(나사 여유 30) · 덱 14장 넘으면 카드 빼기 · HP 낮으면 정비.
 * - 작업대: HP 60% 아래면 수리, 아니면 가장 좋은 카드 다듬기(태엽 −1).
 * - 사건: 막히지 않은 선택지 중 무작위(지나가기 제외).
 * 전투력 = 고정 시험대(2막 대국 20판, 깊이 고정)에서 지금 분대 · 덱 · 부품의 승률과 평균 턴 — 막마다 반장 직전에 잰다.
 */
const RUNS = Number(process.env.ER ?? 30);
// 난이도 설계 (D-228): EB = random | naive | greedy | search (대국을 두는 봇 성향), ERT = 대국당 도전 횟수 (1 = 지면 출하 끝), ETAG = 결과 파일 꼬리표
const STYLE = (process.env.EB ?? 'greedy') as BotStyle | 'search';
// ERT 없으면 지금 규칙 (D-228): 1패 = 출하 끝, 여벌 심장 톱니(시작 EREV개 · 상자에서 드물게)가 있으면 하나 깨고 다시
const TRIES = process.env.ERT ? Number(process.env.ERT) : 0;
const START_REVIVE = Number(process.env.EREV ?? 1);
const TAG = process.env.ETAG ?? '';
// 적 수치 덮어쓰기 (난이도 탐색): EFA = 적 공격 배율, EFG = 공격 성장, EHS = HP 시작, EHG = HP 성장
if (process.env.EFA) SLICE.foeAtk = Number(process.env.EFA);
if (process.env.EFG) SLICE.foeAtkGrow = Number(process.env.EFG);
if (process.env.EHS) SLICE.foeHpStart = Number(process.env.EHS);
if (process.env.EHG) SLICE.foeHpGrow = Number(process.env.EHG);
const VALUE: Record<string, number> = Object.fromEntries((JSON.parse(readFileSync('sim/rarity-result.json', 'utf8')).rows as { id: string; value: number }[]).map((r) => [r.id, r.value]));
/** 사건 진단 (D-261): 사건마다 분대 크기 · HP 앞뒤 · 다음 대국 쓰러짐 · 나사 */
const EVLOG: { id: string; choice: string; act: number; squad: number; hp0: number; hp1: number; gold0: number; gold1: number; nextCrack?: number; nextLost?: number; nextWon?: boolean }[] = [];
const val = (id: string) => VALUE[baseOf(id as CommandId)] ?? 5;

type Tally = Record<string, number>;
const bump = (t: Tally, k: string, n = 1) => (t[k] = (t[k] ?? 0) + n);

const bench = (squad: Squad[], deck: CommandId[], parts: SlicePartId[]) => {
  let w = 0, turns = 0;
  for (let i = 0; i < 20; i++) {
    // 고정 시험대: 3막 검문 · 깊이 18 — 막마다 같은 판으로 전투력을 잰다 (2막 대국은 1막부터 100%라 성장이 안 보였다)
    const def = battleFor(3, 'check', new Rng(4000 + i));
    const b = newSliceBattle(squad.map((u) => ({ ...u, hp: undefined })), def.enemy, deck, 9100 + i, { enemyKingHp: def.kingHp, enemyHp: def.enemyHp, traits: def.traits, parts, depth: 18 });
    const r = playOut(b, 30);
    w += +r.won; turns += r.won ? r.turns : 30;
  }
  return { win: (w / 20) * 100, turns: turns / 20 };
};

const one = (seed: number) => {
  const rng = new Rng(seed);
  const acts = buildRun(seed);
  let squad: Squad[] = [];
  for (const t of START_SQUAD) squad.push(makeCrew(t, rng, squad.map((u) => u.name ?? '')));
  let deck: CommandId[] = [...(START_DECK as CommandId[])];
  const parts: SlicePartId[] = [];
  const refined: CommandId[] = [];
  let gold = 0;
  let revive = START_REVIVE;
  const T: Tally = {};
  const curve: { act: number; floor: number; deck: number; dead: number; types: number; squad: number; parts: number; gold: number; avgVal: number; hpK: number; atkK: number }[] = [];
  const checkpoints: { act: number; win: number; turns: number }[] = [];
  const has = (t: PieceType) => squad.some((u) => u.t === t);
  const usable = (id: CommandId) => cardFits(id, squad.map((u) => u.t));
  const hpRatio = () => squad.reduce((a, u) => a + (u.hp ?? crewMaxHp(u)) / crewMaxHp(u), 0) / Math.max(1, squad.length);
  const recruit = () => { const r = RECRUITS[rng.int(RECRUITS.length)]; squad.push(makeCrew(r.t, rng, squad.map((u) => u.name ?? ''))); deck.push(...r.cards); bump(T, 'recruit'); };
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
    const rank = { gold: 3, rare: 2, common: 1 } as Record<string, number>;
    const pick = offers.sort((a, b) => rank[PART_GRADE[b] ?? 'common'] - rank[PART_GRADE[a] ?? 'common'])[0];
    for (const o of offers) bump(T, `offer:${o}`);
    bump(T, `pick:${pick}`);
    parts.push(pick);
    bump(T, `part:${PART_GRADE[pick] ?? 'common'}`);
  };
  const cardOffers = (elite: boolean): CommandId[] => {
    const axes: Axis[] = ['cav', 'inf', 'king', 'chain', 'push'];
    const out: CommandId[] = [];
    for (const a of axes.sort(() => rng.next() - 0.5)) {
      if (out.length >= 3) break;
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
    for (const o of offers) bump(T, `offer:${o}`);
    if (best && val(best) > 0) { deck.push(best); bump(T, `pick:${best}`); bump(T, `card:${gradeOf(best)}`); } else bump(T, 'skip');
  };
  let ended = '';
  let pendEv: (typeof EVLOG)[number] | null = null;
  for (const [ai, a] of acts.entries()) {
    let prev: MapNode | null = null;
    for (const [ri, row] of a.rows.entries()) {
      const open = (prev?.to ?? row.map((_, i) => i)).map((i) => row[i]);
      // 지도 정책
      const hp = hpRatio();
      const pref = (n: MapNode) => (hp < 0.5 && n.kind === 'forge' ? 9 : 0) + (gold >= 90 && n.kind === 'shop' ? 6 : 0) + ({ battle: 3, check: hp > 0.7 ? 4 : 1, chest: 5, event: 2, forge: hp < 0.7 ? 3 : 1, shop: 1, boss: 9 } as Record<string, number>)[n.kind] + rng.next() * 2;
      const n = open.sort((x, y) => pref(y) - pref(x))[0];
      prev = n;
      bump(T, `node:${n.kind}`);
      const frac = ri / a.rows.length;
      if (n.kind === 'boss') checkpoints.push({ act: ai + 1, ...bench(squad, deck.filter(usable), parts) });
      if (n.battle) {
        const def = n.battle;
        let ok = false;
        let fell: Squad[] = [];
        for (let tryN = 0; !ok && (TRIES ? tryN < TRIES : tryN === 0 || (revive > 0 && (revive--, bump(T, 'revive'), true))); tryN++) {
          const b = newSliceBattle(squad, def.enemy, deck.filter(usable), seed * 7 + ri * 131 + tryN, { enemyKingHp: def.kingHp, enemyHp: def.enemyHp, depth: depthAt(ai, frac), parts, boss: def.boss, bossRule: def.bossRule, traits: def.traits, width: def.w, height: def.h, place: def.place, gold, shock: process.env.ESHOCK !== '0', guard: def.guard });
          const r = STYLE === 'search' ? playOutSearch(b, 40, 3, 4) : playOut(b, 40, (c) => bump(T, `play:${baseOf(c as CommandId)}`), STYLE);
          bump(T, `battles${ai + 1}`); bump(T, `turns${ai + 1}`, r.turns); if (def.boss) { bump(T, `bossN${ai + 1}`); bump(T, `bossT${ai + 1}`, r.turns); }
          if (r.won) {
            ok = true;
            // 목숨 둘 (D-219): 처음 쓰러지면 톱니가 깨진 채 HP 50%로 돌아오고, 깨진 채 쓰러지면 폐기
            const cs = crackOrScrap(fallenAfter(b, squad).map((f) => f.crew));
            fell = cs.scrapped;
            bump(T, 'cracked', cs.back.length);
            const g = (b.coins * SLICE.coinValue + Math.floor(b.overkill / 10));
            gold += g; bump(T, 'goldBattle', g);
            squad = [...restSquad(squadAfter(b, squad)), ...cs.back];
            bump(T, 'lost', cs.scrapped.length);
            if (pendEv) { pendEv.nextCrack = cs.back.length + cs.scrapped.length; pendEv.nextLost = cs.scrapped.length; pendEv.nextWon = true; pendEv = null; }
          } else { bump(T, 'retry'); if (pendEv) { pendEv.nextWon = false; pendEv = null; } }
        }
        if (!ok) { ended = `${ai + 1}막 ${def.title}`; return { cleared: false, ended, T, curve, checkpoints, deck, squad, parts }; }
        if (def.reward === 'recruit') recruit();
        else if (def.reward === 'kit') { const k = KITS[rng.int(KITS.length)]; parts.push(k.part); deck.push(...k.cards); bump(T, 'kit'); }
        else if (def.reward === 'part') { partOf(true); if (squad.length < SLICE.squadMax) recruit(); takeCard(cardOffers(true), false); }
        else if (def.reward === 'card') {
          // 쓰러진 분대원이 있고 카드가 별로면 사람처럼 정비(복귀)를 고른다
          const offers = cardOffers(false);
          const best = Math.max(...offers.map(val), -99);
          if (fell.length && best < 25) { squad = overhaulSquad(squad, fell).squad; bump(T, 'overhaul'); }
          else takeCard(offers, rng.next() < SLICE.recruitChance);
        }
      } else if (n.kind === 'chest') {
        const g = SLICE.chestGold[0] + rng.int(SLICE.chestGold[1] - SLICE.chestGold[0] + 1);
        gold += g; bump(T, 'goldChest', g); partOf(false);
        if (rng.next() < CHARM_NUM.chestRevive) { revive++; bump(T, 'charm:revive'); }
      } else if (n.kind === 'shop') {
        const pool = REWARD_COMMANDS.filter(usable);
        const offers: CommandId[] = [];
        while (offers.length < SHOP.cards && pool.length) offers.push(pool.splice(rng.int(pool.length), 1)[0]);
        if (hpRatio() < 0.55 && gold >= SHOP.healPrice) { gold -= SHOP.healPrice; squad = restSquad(squad, SHOP.healPct); bump(T, 'shop:heal'); bump(T, 'goldSpent', SHOP.healPrice); }
        for (const id of offers.sort((x, y) => val(y) - val(x))) {
          const p = Math.round(SHOP.gradePrice[gradeOf(id) as Grade] * (parts.includes('greed') ? PART_NUM.greedShop : 1));
          if (val(id) >= 15 && gold >= p) { gold -= p; deck.push(id); bump(T, `pick:${id}`); bump(T, 'shop:card'); bump(T, `card:${gradeOf(id)}`); bump(T, 'goldSpent', p); break; }
        }
        const pp = (Object.keys(SLICE_PARTS) as SlicePartId[]).filter((id) => !parts.includes(id) && partFits(id, squad.map((u) => u.t), parts));
        const part = pp.length ? pp[rng.int(pp.length)] : null;
        if (part) { const p = Math.round(SHOP.partGradePrice[(PART_GRADE[part] ?? 'common') as Grade] * (parts.includes('greed') ? PART_NUM.greedShop : 1)); if (gold >= p + 30) { gold -= p; parts.push(part); bump(T, `pick:${part}`); bump(T, 'shop:part'); bump(T, `part:${PART_GRADE[part] ?? 'common'}`); bump(T, 'goldSpent', p); } }
        { const cand = [...new Set(deck)].filter((id) => !isRefined(id) && COMMANDS[id].cost >= 1).sort((x, y) => val(y) - val(x)); if (cand[0] && gold >= SHOP.refinePrice + 40) { gold -= SHOP.refinePrice; deck[deck.indexOf(cand[0])] = refinedOf(baseOf(cand[0])); refined.push(cand[0]); bump(T, 'shop:refine'); bump(T, 'goldSpent', SHOP.refinePrice); } }
        if (deck.length > 14 && gold >= SHOP.removePrice) { const w = [...deck].sort((x, y) => val(x) - val(y))[0]; deck.splice(deck.indexOf(w), 1); gold -= SHOP.removePrice; bump(T, 'shop:remove'); bump(T, 'goldSpent', SHOP.removePrice); }
      } else if (n.kind === 'forge') {
        { const m = mendSquad(squad); squad = m.squad; bump(T, 'mended', m.mended.length); }
        if (hpRatio() < 0.6) { squad = restSquad(squad, FORGE.repairPct); bump(T, 'forge:repair'); }
        else {
          const cand = [...new Set(deck)].filter((id) => !isRefined(id) && COMMANDS[id].cost >= 1).sort((x, y) => val(y) - val(x));
          if (cand[0]) { deck[deck.indexOf(cand[0])] = refinedOf(baseOf(cand[0])); refined.push(cand[0]); bump(T, 'forge:refine'); }
        }
      } else if (n.kind === 'event') {
        const id = SLICE_EVENT_IDS[rng.int(SLICE_EVENT_IDS.length)];
        const st: EventState = { squad, deck, refined, gold };
        const ch = SLICE_EVENTS[id].choices.filter((c) => c.desc && !c.blocked?.(st));
        if (ch.length) {
          const c = ch[rng.int(ch.length)];
          const h0 = hpRatio(), g0 = gold, n0 = squad.length;
          const out = c.apply(st, rng);
          squad = st.squad; deck = st.deck; bump(T, 'goldEvent', st.gold - gold); gold = st.gold;
          pendEv = { id, choice: c.label, act: ai + 1, squad: n0, hp0: h0, hp1: hpRatio(), gold0: g0, gold1: gold };
          EVLOG.push(pendEv);
          if (out.partPick) partOf(false);
          if (out.recruit) { squad.push(makeCrew(out.recruit, rng, squad.map((u) => u.name ?? ''))); bump(T, 'recruit'); }
          bump(T, 'event:taken');
        } else bump(T, 'event:none');
      }
      const avgVal = deck.reduce((x, id) => x + val(id), 0) / deck.length;
      const d = depthAt(ai, frac);
      curve.push({ act: ai + 1, floor: ri, deck: deck.length, dead: deck.filter((id) => !usable(id)).length, types: new Set(squad.map((u) => u.t)).size, squad: squad.length, parts: parts.length, gold, avgVal, hpK: SLICE.foeHp * (d ? SLICE.foeHpStart * Math.pow(SLICE.foeHpGrow, d) : 1), atkK: SLICE.foeAtk * (1 + SLICE.foeAtkGrow * d) });
    }
    squad = mendSquad(restSquad(squad, 1)).squad;
  }
  return { cleared: true, ended, T, curve, checkpoints, deck, squad, parts };
};

it('성장 설계 시뮬레이션', () => {
  const rs = Array.from({ length: RUNS }, (_, k) => one(2000 + k * 7919));
  const all: Tally = {};
  for (const r of rs) for (const [k, v] of Object.entries(r.T)) bump(all, k, v);
  const per = Object.fromEntries(Object.entries(all).map(([k, v]) => [k, +(v / RUNS).toFixed(2)]));
  console.log('완주', rs.filter((r) => r.cleared).length, '/', RUNS);
  for (const a of [1, 2, 3]) console.log(`${a}막 대국 평균 ${((all[`turns${a}`] ?? 0) / Math.max(1, all[`battles${a}`] ?? 0)).toFixed(2)}턴 · 반장 ${((all[`bossT${a}`] ?? 0) / Math.max(1, all[`bossN${a}`] ?? 0)).toFixed(2)}턴`);
  console.log('출하 한 판 평균', JSON.stringify(per));
  writeFileSync(`sim/event-diag${TAG}.json`, JSON.stringify(EVLOG));
  writeFileSync(`sim/economy-result${TAG}.json`, JSON.stringify({ runs: RUNS, map: MAP, per, results: rs.map((r) => ({ cleared: r.cleared, ended: r.ended, T: r.T, curve: r.curve, checkpoints: r.checkpoints, final: { deck: r.deck.length, squad: r.squad.length, parts: r.parts.length, deckIds: r.deck.map((id) => baseOf(id)), partIds: r.parts, squadT: r.squad.map((u) => u.t) } })) }, null, 0));
});
