import { it } from 'vitest';
import { writeFileSync, readFileSync } from 'node:fs';
import type { PieceType } from '../src/engine';
import { Rng } from '../src/engine/rng';
import { COMMANDS, GRADE, gradeOf, isRefined, refinedOf, baseOf, RECRUITS, REWARD_COMMANDS, rollGrade, SHOP, FORGE, SLICE, START_DECK, START_SQUAD, KITS, type Axis, type CommandId, type Grade } from '../src/slice/cards';
import { PART_GRADE, PART_NUM, SLICE_PARTS, partFits, type SlicePartId } from '../src/slice/parts';
import { makeCrew } from '../src/slice/crew';
import { buildRun, battleFor, type MapNode } from '../src/slice/run';
import { SLICE_EVENTS, SLICE_EVENT_IDS, type EventState } from '../src/slice/events';
import { crewMaxHp, depthAt, fallenAfter, newSliceBattle, overhaulSquad, restSquad, squadAfter, type Squad } from '../src/slice/battle';
import { playOut } from '../src/slice/bot';

/**
 * 「분대 결속」 모델 시뮬레이션 (D-219 후보 — docs/reports/2026-11-03-growth-benchmark.md 3절).
 * 게임 코드는 건드리지 않고, 출하 규칙만 시뮬레이터 안에서 바꿔 지금 규칙(base)과 같은 시드로 비교한다.
 *   A 카드는 분대원이 들고 다닌다 (공용 4칸 + 분대원마다 3칸, 쓰러지면 그 카드가 빠지고 1장은 유품으로 공용 칸에)
 *   B 쓰러짐 두 단계 (처음 = 고장: HP 50%로 복귀, 작업대 · 막 끝에서 고친다 / 고장 중 다시 = 폐기)
 *   C 새 분대원은 정해진 자리에서만 (대국 보상 25% 영입 없앰, 고물상 신병 45 나사)
 *   D 부품 칸 = 분대 + 2 (넘치면 등급 낮은 것과 바꾸거나 넘긴다, 분대가 줄면 뒤 부품이 꺼진다)
 *   E 등급 보정 (황금 확률 −5%에서 시작, 일반이 나올 때마다 +1%, 황금이 나오면 처음으로)
 *   F 카드 빼기 값이 오른다 (50 + 25 × 횟수)
 * 실행: `BR=100 BOND=ABCDEF npx vitest run sim/bond.sim.ts --config vitest.sim.config.ts` — BOND에 넣은 글자만 켠다 (비우면 지금 규칙).
 */
const RUNS = Number(process.env.BR ?? 30);
const VALUE: Record<string, number> = Object.fromEntries((JSON.parse(readFileSync('sim/rarity-result.json', 'utf8')).rows as { id: string; value: number }[]).map((r) => [r.id, r.value]));
const val = (id: string) => VALUE[baseOf(id as CommandId)] ?? 5;
const BOND = { shared: 4, slots: Number(process.env.BOND_SLOTS ?? 3), recruitExtra: Number(process.env.BOND_RC ?? 0), fixPrice: Number(process.env.BOND_FIX ?? 0), shopRecruit: 45, partExtra: 2, pity: 5, removeStep: 25 };

type Tally = Record<string, number>;
const bump = (t: Tally, k: string, n = 1) => (t[k] = (t[k] ?? 0) + n);
type Entry = { id: CommandId; o: string };

const bench = (squad: Squad[], deck: CommandId[], parts: SlicePartId[]) => {
  let w = 0, turns = 0;
  for (let i = 0; i < 20; i++) {
    const def = battleFor(3, 'check', new Rng(4000 + i));
    const b = newSliceBattle(squad.map((u) => ({ ...u, hp: undefined })), def.enemy, deck, 9100 + i, { enemyKingHp: def.kingHp, enemyHp: def.enemyHp, traits: def.traits, parts, depth: 18 });
    const r = playOut(b, 30);
    w += +r.won; turns += r.won ? r.turns : 30;
  }
  return { win: (w / 20) * 100, turns: turns / 20 };
};

const one = (seed: number, on: string) => {
  const A = on.includes('A'), B = on.includes('B'), C = on.includes('C'), D = on.includes('D'), E = on.includes('E'), F = on.includes('F');
  const rng = new Rng(seed);
  const acts = buildRun(seed);
  let uid = 0;
  const mk = (t: PieceType) => { const c = makeCrew(t, rng, squad.map((u) => u.name ?? '')); return { ...c, serial: `${c.serial}.${uid++}` }; };
  let squad: Squad[] = [];
  for (const t of START_SQUAD) squad.push(mk(t));
  // 덱 = 카드 + 주인 (A가 꺼져 있으면 주인은 늘 공용 '')
  const ownerOf = (t: PieceType) => squad.find((u) => u.t === t)?.serial ?? '';
  let deck: Entry[] = (START_DECK as CommandId[]).map((id) => ({ id, o: A && COMMANDS[id].who !== 'any' ? ownerOf(COMMANDS[id].who as PieceType) : '' }));
  const parts: SlicePartId[] = [];
  const refined: CommandId[] = [];
  const broken = new Set<string>();
  let gold = 0, removes = 0, pity = -BOND.pity;
  const T: Tally = {};
  const curve: { act: number; floor: number; deck: number; dead: number; squad: number; parts: number; active: number; gold: number; avgVal: number; broken: number }[] = [];
  const checkpoints: { act: number; win: number; turns: number }[] = [];
  const alive = () => new Set(squad.map((u) => u.serial));
  const ids = () => { const a = alive(); return deck.filter((e) => !e.o || a.has(e.o)).map((e) => e.id); };
  const has = (t: PieceType) => squad.some((u) => u.t === t);
  const usable = (id: CommandId) => COMMANDS[id].who === 'any' || has(COMMANDS[id].who as PieceType);
  const partCap = () => (D ? squad.length + BOND.partExtra : 99);
  const activeParts = () => parts.slice(0, partCap());
  const hpRatio = () => squad.reduce((a, u) => a + (u.hp ?? crewMaxHp(u)) / crewMaxHp(u), 0) / Math.max(1, squad.length);
  const kitOf = (s: string) => deck.filter((e) => e.o === s);

  /** 카드 한 장을 덱에 넣는다 (A: 그 기물을 가진 분대원 중 빈칸이 많은 쪽에 새긴다, 칸이 차면 가장 약한 카드와 바꾸거나 넘긴다) */
  const assign = (id: CommandId, tag = 'card'): boolean => {
    if (!A) { deck.push({ id, o: '' }); return true; }
    const who = COMMANDS[id].who;
    if (who === 'any') {
      const sh = kitOf('');
      if (sh.length < BOND.shared) { deck.push({ id, o: '' }); return true; }
      const w = sh.sort((x, y) => val(x.id) - val(y.id))[0];
      if (val(w.id) < val(id)) { w.id = id; bump(T, `${tag}:swap`); return true; }
      bump(T, `${tag}:full`); return false;
    }
    const hosts = squad.filter((u) => u.t === who);
    if (!hosts.length) { bump(T, `${tag}:nohost`); return false; }
    const host = hosts.sort((x, y) => kitOf(x.serial!).length - kitOf(y.serial!).length)[0];
    if (kitOf(host.serial!).length < BOND.slots) { deck.push({ id, o: host.serial! }); return true; }
    const pool = hosts.flatMap((u) => kitOf(u.serial!)).sort((x, y) => val(x.id) - val(y.id));
    if (pool[0] && val(pool[0].id) < val(id)) { pool[0].id = id; bump(T, `${tag}:swap`); return true; }
    bump(T, `${tag}:full`); return false;
  };
  const recruit = () => { const r = RECRUITS[rng.int(RECRUITS.length)]; const c = mk(r.t); squad.push(c); for (const id of r.cards) A ? deck.push({ id, o: c.serial! }) : deck.push({ id, o: '' });
    for (let k = 0; k < BOND.recruitExtra; k++) { const own = REWARD_COMMANDS.filter((id) => COMMANDS[id].who === r.t && gradeOf(id) !== 'gold'); if (own.length) deck.push({ id: own[rng.int(own.length)], o: A ? c.serial! : '' }); }
    bump(T, 'recruit'); };
  /** 영구로 잃은 분대원 정리 (A: 카드가 빠지고, 가장 좋은 1장이 유품으로 공용 칸에) */
  const bury = (gone: Squad[]) => {
    for (const g of gone) {
      bump(T, 'lost');
      if (!A) continue;
      const kit = kitOf(g.serial!).sort((x, y) => val(y.id) - val(x.id));
      deck = deck.filter((e) => e.o !== g.serial);
      if (kit[0] && kitOf('').length < BOND.shared) { deck.push({ id: kit[0].id, o: '' }); bump(T, 'legacy'); }
      bump(T, 'cardsBuried', kit.length);
    }
  };
  const addPart = (id: SlicePartId) => {
    if (parts.length < partCap()) { parts.push(id); return true; }
    const rank = { gold: 3, rare: 2, common: 1 } as Record<string, number>;
    const act = activeParts();
    const worst = [...act].sort((a, b) => rank[PART_GRADE[a] ?? 'common'] - rank[PART_GRADE[b] ?? 'common'])[0];
    if (worst && rank[PART_GRADE[id] ?? 'common'] > rank[PART_GRADE[worst] ?? 'common']) { parts[parts.indexOf(worst)] = id; bump(T, 'part:swap'); return true; }
    bump(T, 'part:full'); return false;
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
    const rank = { gold: 3, rare: 2, common: 1 } as Record<string, number>;
    const pick = offers.sort((a, b) => rank[PART_GRADE[b] ?? 'common'] - rank[PART_GRADE[a] ?? 'common'])[0];
    if (addPart(pick)) bump(T, `part:${PART_GRADE[pick] ?? 'common'}`);
  };
  /** 등급 뽑기 (E: 황금 보정) */
  const grade = (elite: boolean): Grade => {
    const base = elite ? GRADE.elite : GRADE.weights;
    if (!E) return rollGrade(rng.next(), base);
    const w = { common: Math.max(0, base.common - pity), rare: base.rare, gold: Math.max(0, base.gold + pity) };
    const g = rollGrade(rng.next(), w);
    if (g === 'gold') pity = -BOND.pity; else if (g === 'common') pity += 1;
    return g;
  };
  const cardOffers = (elite: boolean): CommandId[] => {
    const axes: Axis[] = ['cav', 'inf', 'king', 'chain', 'push'];
    const out: CommandId[] = [];
    for (const a of axes.sort(() => rng.next() - 0.5)) {
      if (out.length >= 3) break;
      const pool = REWARD_COMMANDS.filter((id) => (COMMANDS[id].axis === a || COMMANDS[id].axis2 === a) && !out.includes(id) && usable(id));
      const g = grade(elite);
      const same = pool.filter((id) => gradeOf(id) === g);
      const from = same.length ? same : pool;
      if (from.length) out.push(from[rng.int(from.length)]);
    }
    return out;
  };
  const takeCard = (offers: CommandId[], recruitOffer: boolean) => {
    if (recruitOffer && squad.length < SLICE.squadMax && (squad.length < 6 || rng.next() < 0.5)) return recruit();
    const best = offers.sort((a, b) => val(b) - val(a))[0];
    if (best && val(best) > 0) { if (assign(best)) bump(T, `card:${gradeOf(best)}`); } else bump(T, 'skip');
  };
  const refineBest = (tag: string) => {
    const cand = ids().filter((id) => !isRefined(id) && COMMANDS[id].cost >= 1).sort((x, y) => val(y) - val(x));
    if (!cand[0]) return false;
    const a = alive();
    const e = deck.find((x) => x.id === cand[0] && (!x.o || a.has(x.o)))!;
    e.id = refinedOf(baseOf(cand[0])); refined.push(cand[0]); bump(T, tag); return true;
  };
  const repairAll = () => { if (broken.size) bump(T, 'repaired', broken.size); broken.clear(); };

  let ended = '';
  for (const [ai, a] of acts.entries()) {
    let prev: MapNode | null = null;
    for (const [ri, row] of a.rows.entries()) {
      const open = (prev?.to ?? row.map((_, i) => i)).map((i) => row[i]);
      const hp = hpRatio();
      const pref = (n: MapNode) => (hp < 0.5 && n.kind === 'forge' ? 9 : 0) + (B && broken.size >= 2 && n.kind === 'forge' ? 5 : 0) + (gold >= 90 && n.kind === 'shop' ? 6 : 0) + ({ battle: 3, check: hp > 0.7 ? 4 : 1, chest: 5, event: 2, forge: hp < 0.7 ? 3 : 1, shop: 1, boss: 9 } as Record<string, number>)[n.kind] + rng.next() * 2;
      const n = open.sort((x, y) => pref(y) - pref(x))[0];
      prev = n;
      bump(T, `node:${n.kind}`);
      const frac = ri / a.rows.length;
      if (n.kind === 'boss') checkpoints.push({ act: ai + 1, ...bench(squad, ids().filter(usable), activeParts()) });
      if (n.battle) {
        const def = n.battle;
        let ok = false;
        let fell: Squad[] = [];
        for (let tryN = 0; tryN < 4 && !ok; tryN++) {
          const b = newSliceBattle(squad, def.enemy, ids().filter(usable), seed * 7 + ri * 131 + tryN, { enemyKingHp: def.kingHp, enemyHp: def.enemyHp, depth: depthAt(ai, frac), parts: activeParts(), boss: def.boss, bossRule: def.bossRule, traits: def.traits, width: def.w, height: def.h, place: def.place });
          const r = playOut(b);
          if (r.won) {
            ok = true;
            fell = fallenAfter(b, squad).map((f) => f.crew);
            const g = (b.coins * SLICE.coinValue + Math.floor(b.overkill / 10));
            gold += g; bump(T, 'goldBattle', g);
            squad = squadAfter(b, squad);
            if (B) {
              // 처음 쓰러지면 고장 (HP 50%로 복귀), 고장 중에 또 쓰러지면 폐기
              const gone: Squad[] = [];
              for (const f of fell) {
                if (broken.has(f.serial!)) { broken.delete(f.serial!); gone.push(f); }
                else { broken.add(f.serial!); bump(T, 'broke'); squad.push({ ...f, hp: Math.round(crewMaxHp(f) * 0.5) }); }
              }
              bury(gone);
              fell = gone;
            } else bury(fell);
            squad = restSquad(squad);
          } else bump(T, 'retry');
        }
        if (!ok) { ended = `${ai + 1}막 ${def.title}`; return { cleared: false, ended, T, curve, checkpoints, deck: ids(), squad, parts }; }
        if (def.reward === 'recruit') recruit();
        else if (def.reward === 'kit') { const k = KITS[rng.int(KITS.length)]; addPart(k.part); for (const id of k.cards) assign(id, 'kit'); bump(T, 'kit'); }
        else if (def.reward === 'part') { partOf(true); if (squad.length < SLICE.squadMax) recruit(); takeCard(cardOffers(true), false); }
        else if (def.reward === 'card') {
          const offers = cardOffers(false);
          const best = Math.max(...offers.map(val), -99);
          if (fell.length && best < 25) {
            const r = overhaulSquad(squad, fell); squad = r.squad; bump(T, 'overhaul');
            // 되살린 분대원은 카드를 다시 들고 온다 (A: 기본 카드 1장)
            if (A && r.revived) { const rc = RECRUITS.find((x) => x.t === r.revived!.t); if (rc) deck.push({ id: rc.cards[0], o: r.revived.serial! }); }
          } else takeCard(offers, !C && rng.next() < SLICE.recruitChance);
        }
      } else if (n.kind === 'chest') {
        const g = SLICE.chestGold[0] + rng.int(SLICE.chestGold[1] - SLICE.chestGold[0] + 1);
        gold += g; bump(T, 'goldChest', g); partOf(false);
      } else if (n.kind === 'shop') {
        const pool = REWARD_COMMANDS.filter(usable);
        const offers: CommandId[] = [];
        while (offers.length < SHOP.cards && pool.length) offers.push(pool.splice(rng.int(pool.length), 1)[0]);
        const spend = (k: string, p: number) => { gold -= p; bump(T, k); bump(T, 'goldSpent', p); };
        if (hpRatio() < 0.55 && gold >= SHOP.healPrice) { spend('shop:heal', SHOP.healPrice); squad = restSquad(squad, SHOP.healPct); }
        if (B && BOND.fixPrice && broken.size && gold >= BOND.fixPrice * broken.size) { spend('shop:fix', BOND.fixPrice * broken.size); repairAll(); }
        if (C && squad.length < 7 && gold >= BOND.shopRecruit) { spend('shop:recruit', BOND.shopRecruit); recruit(); }
        for (const id of offers.sort((x, y) => val(y) - val(x))) {
          const p = SHOP.gradePrice[gradeOf(id) as Grade];
          if (val(id) >= 15 && gold >= p) { if (assign(id, 'shopcard')) { spend('shop:card', p); bump(T, `card:${gradeOf(id)}`); } break; }
        }
        const pp = (Object.keys(SLICE_PARTS) as SlicePartId[]).filter((id) => !parts.includes(id) && partFits(id, squad.map((u) => u.t), parts));
        const part = pp.length ? pp[rng.int(pp.length)] : null;
        if (part && (!D || parts.length < partCap())) { const p = SHOP.partGradePrice[(PART_GRADE[part] ?? 'common') as Grade]; if (gold >= p + 30) { spend('shop:part', p); parts.push(part); bump(T, `part:${PART_GRADE[part] ?? 'common'}`); } }
        if (gold >= SHOP.refinePrice + 40 && refineBest('shop:refine')) { gold -= SHOP.refinePrice; bump(T, 'goldSpent', SHOP.refinePrice); }
        const rp = SHOP.removePrice + (F ? BOND.removeStep * removes : 0);
        const cur = ids();
        if (cur.length > 14 && gold >= rp) {
          const a2 = alive();
          const w = deck.filter((e) => !e.o || a2.has(e.o)).sort((x, y) => val(x.id) - val(y.id))[0];
          deck.splice(deck.indexOf(w), 1); removes++; spend('shop:remove', rp);
        }
      } else if (n.kind === 'forge') {
        if (B && (!BOND.fixPrice || broken.size >= 2)) { repairAll(); bump(T, 'forge:fix'); }
        else if (hpRatio() < 0.6) { squad = restSquad(squad, FORGE.repairPct); bump(T, 'forge:repair'); }
        else refineBest('forge:refine');
      } else if (n.kind === 'event') {
        const id = SLICE_EVENT_IDS[rng.int(SLICE_EVENT_IDS.length)];
        const before = ids();
        const st: EventState = { squad, deck: [...before], refined, gold };
        const ch = SLICE_EVENTS[id].choices.filter((c) => c.desc && !c.blocked?.(st));
        if (ch.length) {
          const out = ch[rng.int(ch.length)].apply(st, rng);
          // 덱 변화는 차이로 옮긴다 (빠진 카드는 지우고, 새 카드는 새긴다)
          const left = [...st.deck];
          for (const b0 of before) { const i = left.indexOf(b0); if (i >= 0) left.splice(i, 1); else { const a2 = alive(); const e = deck.find((x) => x.id === b0 && (!x.o || a2.has(x.o))); if (e) deck.splice(deck.indexOf(e), 1); } }
          const lostBy = squad.filter((u) => !st.squad.some((v) => v.serial === u.serial));
          squad = st.squad.map((u) => (u.serial && squad.some((v) => v.serial === u.serial) ? u : { ...u, serial: `${u.serial ?? '#E'}.${uid++}` }));
          if (lostBy.length) bury(lostBy);
          for (const id2 of left) assign(id2, 'event');
          bump(T, 'goldEvent', st.gold - gold); gold = st.gold;
          if (out.partPick) partOf(false);
          if (out.recruit) { squad.push(mk(out.recruit)); bump(T, 'recruit'); }
          bump(T, 'event:taken');
        } else bump(T, 'event:none');
      }
      const dk = ids();
      curve.push({ act: ai + 1, floor: ri, deck: dk.length, dead: dk.filter((id) => !usable(id)).length, squad: squad.length, parts: parts.length, active: activeParts().length, gold, avgVal: dk.reduce((x, id) => x + val(id), 0) / Math.max(1, dk.length), broken: broken.size });
    }
    squad = restSquad(squad, 1);
    if (B) repairAll();
  }
  return { cleared: true, ended, T, curve, checkpoints, deck: ids(), squad, parts };
};

it('분대 결속 모델 비교', () => {
  const modes = (process.env.BOND_MODES ?? ',ABCDEF').split(',');
  const out: Record<string, unknown> = {};
  for (const m of modes) {
    const rs = Array.from({ length: RUNS }, (_, k) => one(2000 + k * 7919, m));
    const all: Tally = {};
    for (const r of rs) for (const [k, v] of Object.entries(r.T)) bump(all, k, v);
    const per = Object.fromEntries(Object.entries(all).map(([k, v]) => [k, +(v / RUNS).toFixed(2)]));
    const actEnd = [1, 2, 3].map((act) => {
      const L = rs.map((r) => r.curve.filter((c) => c.act === act).pop()).filter(Boolean) as (typeof rs)[number]['curve'];
      const avg = (f: (c: (typeof L)[number]) => number) => +(L.reduce((x, c) => x + f(c), 0) / Math.max(1, L.length)).toFixed(2);
      const cps = rs.flatMap((r) => r.checkpoints.filter((c) => c.act === act));
      const cavg = (f: (c: (typeof cps)[number]) => number) => +(cps.reduce((x, c) => x + f(c), 0) / Math.max(1, cps.length)).toFixed(1);
      return { act, n: L.length, deck: avg((c) => c.deck), dead: avg((c) => c.dead), squad: avg((c) => c.squad), parts: avg((c) => c.parts), active: avg((c) => c.active), gold: avg((c) => c.gold), avgVal: avg((c) => c.avgVal), broken: avg((c) => c.broken), benchWin: cavg((c) => c.win), benchTurns: cavg((c) => c.turns) };
    });
    const cleared = rs.filter((r) => r.cleared).length;
    out[m || 'base'] = { cleared, per, actEnd, ended: rs.filter((r) => !r.cleared).map((r) => r.ended) };
    console.log(`[${m || 'base'}] 완주 ${cleared}/${RUNS}`, JSON.stringify(actEnd));
  }
  writeFileSync('sim/bond-result.json', JSON.stringify({ runs: RUNS, out }, null, 1));
});
