import type { OrderId } from '../data/tactics';
import { ARENAS, SCREWS_CHANCE, terrainPairs, type TerrainId } from '../data/terrain';
import { AFFIXES, ARCHETYPES, ARCHETYPE_EXTRA_FROM, LUCK, type LuckId, RAMPART_ROOK_MIN, affixCount, type AffixId, type ArchetypeId } from '../data/legions';
import type { EnchantId } from '../data/enchants';
import { BOSSES, ELITE_BONUS, eliteForge, enemyVariantCount, FINAL_BOSS, KING_EXPOSE, TOTAL_FLOORS, actEnchants, actOf, enemyEnchantStack, boardFor, enemyCount, enemyForge, enemyKingScale, enemyTier, type BossId, type NodeKind } from '../data/run';
import { FORESIGHT_UNTIL_ASCENSION } from '../data/battle';
import { CARDS, type CardId } from '../data/cards';
import { createBattle } from '../engine/setup';
import type { BattleState } from '../engine/types';
import { Rng } from '../engine/rng';
import type { Deck } from '../engine/setup';
import type { Loadout, PieceType } from '../engine/types';
import { canAdd } from './deck';
import { VARIANTS, variantsFor, type VariantId } from '../data/variants';

/** 한 라운드(전투)의 적 군단 (GDD 8장 §8.3) */
export interface Encounter {
  kind: NodeKind;
  name: string;
  width: number;
  height: number;
  deck: Deck;
  loadout: Loadout;
  /** 적 AI 단계 (0~2) */
  tier: number;
  boss?: BossId;
  seed: number;
  floor: number;
  /** 승천 단계 (적 킹 보정 축소에 쓴다) */
  ascension?: number;
  /** 이 대국의 주문서 (D-094). 옛 저장에는 없다 */
  order?: OrderId;
  /** 군단 원형 (D-096) */
  archetype?: ArchetypeId;
  /** 억까·억빠 (D-099) */
  luck?: LuckId;
  /** 검문! 정예 접사: 그 유형의 적 기물 한 기씩 (D-096) */
  affixes?: { type: PieceType; id: AffixId }[];
}

/** 층이 오를수록 폰 비중이 줄고 상위 기물이 섞인다 */
const pieceWeights = (floor: number): [PieceType, number][] => [
  ['P', Math.max(14, 50 - floor * 3)],
  ['N', floor <= 3 ? 6 : 10 + floor],
  ['B', floor <= 3 ? 6 : 10 + floor],
  ['R', floor >= 5 ? 2 + floor : 0],
  ['Q', floor >= 8 ? floor / 2 : 0],
];

const pick = <T>(rng: Rng, items: [T, number][]): T | undefined => {
  const total = items.reduce((a, [, w]) => a + w, 0);
  if (total <= 0) return undefined;
  let r = rng.next() * total;
  for (const [it, w] of items) {
    r -= w;
    if (r < 0) return it;
  }
  return items[items.length - 1][0];
};

/** 군단 기물 유형에 맞는 인챈트 후보 (유형 인챈트 + 전체·시스템 인챈트) */
const TYPE_ENCHANT: Partial<Record<PieceType, EnchantId>> = { N: 'E01', B: 'E02', R: 'E03', P: 'E04' };
const GENERAL: EnchantId[] = ['E05', 'E07', 'E08', 'E09'];

export const generateEncounter = (floor: number, kind: NodeKind, rng: Rng, boss?: BossId, ascension = 0, blueprint?: VariantId): Encounter => {
  const seed = rng.int(1_000_000_000);
  const tier = ascension >= 3 && kind === 'elite' ? 2 : enemyTier(floor, kind);
  const baseForge = enemyForge(floor);

  if (kind === 'boss' && (boss || floor === TOTAL_FLOORS)) {
    const def = floor === TOTAL_FLOORS ? FINAL_BOSS : BOSSES[boss!];
    const forge: Partial<Record<PieceType, number>> = {};
    const actBonus = actOf(floor) === 2 ? 1 : 0; // Act 2 보스는 강화 +1 더
    for (const t of new Set(def.deck)) forge[t] = Math.min(5, (def.forge[t] ?? 0) + baseForge + actBonus + (ascension >= 5 ? 1 : 0));
    return {
      kind,
      name: `${def.name} — ${def.title}`,
      ...boardFor(floor, 'boss'),
      // Act 2 보스는 같은 컨셉 군단에 폰 2기가 더 붙는다
      deck: actOf(floor) === 2 ? [...def.deck, 'P', 'P'] : [...def.deck],
      loadout: { enchants: { ...def.enchants }, cards: actOf(floor) === 2 ? [...def.cards, 'C03'] : [...def.cards], forge, ...(def.variants ? { variants: { ...def.variants } } : {}) },
      ...(def.affixes ? { affixes: def.affixes.map((a) => ({ ...a })) } : {}),
      tier,
      boss,
      seed,
      floor,
      ascension,
    };
  }

  const { width, height } = boardFor(floor, kind, rng.next());
  // 군단 원형 (D-096): 판마다 다른 문제
  const archOptions = (Object.keys(ARCHETYPES) as ArchetypeId[]).filter((id) => ARCHETYPES[id].from <= floor);
  const archetype = archOptions[rng.int(archOptions.length)];
  const arch = ARCHETYPES[archetype];
  const weights = pieceWeights(floor).map(([t, w]): [PieceType, number] => [t, (t === 'R' && archetype === 'rampart' ? Math.max(w, RAMPART_ROOK_MIN) : w) * (arch.weight[t] ?? 1)]);
  // 억까·억빠 (D-099): 4층부터 가끔. 과적 = 1기 더 + 개량 +1, 불량 군단 = 적 일반 기물 HP 60%로 시작
  const roll = rng.next();
  const act = actOf(floor) - 1;
  const luck: LuckId | undefined = floor <= ARCHETYPE_EXTRA_FROM ? undefined : roll < LUCK.overload[act] ? 'overload' : roll < LUCK.overload[act] + LUCK.defective[act] ? 'defective' : undefined;
  const count = enemyCount(floor) + (kind === 'elite' ? ELITE_BONUS.pieces : 0) + (ascension >= 1 ? 1 : 0) + (floor > ARCHETYPE_EXTRA_FROM ? arch.extra : 0) + (luck === 'overload' ? 1 : 0);
  const deck: Deck = ['K'];
  let guard = 0;
  while (deck.length < count && guard++ < 200) {
    const options = weights.filter(([t]) => canAdd(deck, t));
    const t = pick(rng, options);
    if (!t) break;
    deck.push(t);
  }

  const forge: Partial<Record<PieceType, number>> = {};
  const lv = baseForge + (kind === 'elite' ? eliteForge(floor) : 0) + (luck === 'overload' ? 1 : 0);
  if (lv > 0) for (const t of new Set(deck)) forge[t] = lv;

  const enchants: Partial<Record<EnchantId, number>> = {};
  const pool = [...new Set(deck.map((t) => TYPE_ENCHANT[t]).filter((e): e is EnchantId => !!e)), ...GENERAL];
  const own = arch.enchants.filter((e) => !pool.includes(e));
  for (let i = 0; i < actEnchants(floor, kind) + (ascension >= 3 && kind === 'elite' ? 1 : 0) && (pool.length || own.length); i++) {
    // 첫 개조는 원형의 개조 (기병 기습대 = 기병 개조 …)
    const fromArch = i === 0 && (own.length || arch.enchants.some((e) => pool.includes(e)));
    const src = fromArch ? [...own, ...arch.enchants.filter((e) => pool.includes(e))] : pool.length ? pool : own;
    const id = src[rng.int(src.length)];
    for (const list of [pool, own]) if (list.includes(id)) list.splice(list.indexOf(id), 1);
    enchants[id] = enemyEnchantStack(floor, kind);
  }
  // Act 3 엘리트는 지속형 카드 1장
  const cards: CardId[] = [];
  if (kind === 'elite' && actOf(floor) === 3) {
    const sustain = (Object.keys(CARDS) as CardId[]).filter((c) => CARDS[c].limit.type !== 'consume');
    cards.push(sustain[rng.int(sustain.length)]);
  }
  // 이형 거푸집: 군단에 있는 유형 중에서 (같은 규칙 — 플레이어도 얻을 수 있는 것만)
  const variants: Partial<Record<PieceType, VariantId>> = {};
  const vPool = [...new Set(deck)].flatMap((t) => variantsFor(t));
  for (let i = enemyVariantCount(floor, kind, rng.next()); i > 0 && vPool.length; i--) {
    const id = vPool.splice(rng.int(vPool.length), 1)[0];
    variants[VARIANTS[id].base] = id;
  }
  // 도면 (D-107): 지도에 미리 보인 이형은 이 군단이 꼭 단다 (그 유형이 없으면 폰 하나를 바꿔 넣는다)
  if (blueprint) {
    const base = VARIANTS[blueprint].base;
    if (!deck.includes(base)) {
      const p = deck.lastIndexOf('P');
      if (p > 0) deck[p] = base;
      else deck.push(base);
    }
    variants[base] = blueprint;
  }
  // 검문! 정예 접사 (D-096): 일반 기물 중 무작위 유형에 하나씩
  const affixes: { type: PieceType; id: AffixId }[] = [];
  if (kind === 'elite') {
    const ids = Object.keys(AFFIXES) as AffixId[];
    const bodies = deck.filter((t) => t !== 'K');
    for (let i = affixCount(actOf(floor)); i > 0 && bodies.length && ids.length; i--) {
      const type = bodies.splice(rng.int(bodies.length), 1)[0];
      affixes.push({ type, id: ids.splice(rng.int(ids.length), 1)[0] });
    }
  }
  const names = [...affixes.map((a) => AFFIXES[a.id].name), ...Object.values(variants).map((id) => VARIANTS[id].name)];
  return {
    kind,
    archetype,
    ...(luck ? { luck } : {}),
    ...(affixes.length ? { affixes } : {}),
    name: `${kind === 'elite' ? `정예 ${arch.name}` : arch.name}${names.length ? ` — ${names.join(' · ')}` : ''}`,
    width,
    height,
    deck,
    loadout: { enchants, cards, forge, variants },
    tier,
    seed,
    floor,
    ascension,
  };
};

/**
 * 지형 깔기 (D-097): 점대칭 쌍(양 진영 공평) · 진영 끝 두 줄 제외 · 나사 더미는 대칭 없이 한 칸.
 * 반장 판은 전장 규칙(BossDef.arena)이 깐다.
 */
export const layTerrain = (s: BattleState, e: Encounter): void => {
  const act = actOf(e.floor);
  if (e.kind === 'boss') {
    const def = e.floor === TOTAL_FLOORS ? FINAL_BOSS : e.boss ? BOSSES[e.boss] : null;
    if (!def) return;
    const arena = ARENAS[def.arena];
    const tiles = arena.terrain(s.width, s.height);
    if (tiles.length) s.terrain = tiles;
    const ruins = arena.ruins?.(s.width, s.height) ?? [];
    if (ruins.length) s.fallen = [...(s.fallen ?? []), ...ruins.map((r) => r.y * s.width + r.x)];
    if (arena.collapseDelay && s.rules.collapseStart !== null) s.rules = { ...s.rules, collapseStart: s.rules.collapseStart + arena.collapseDelay };
    return;
  }
  const rng = new Rng((e.seed ^ 0x7e11a) >>> 0);
  const tiles: NonNullable<BattleState['terrain']> = [];
  const free = (x: number, y: number) => y >= 2 && y <= s.height - 3 && !tiles.some((t) => t.x === x && t.y === y);
  const kinds: TerrainId[] = ['platform', 'shelter', 'magnet'];
  for (let n = terrainPairs(act, e.kind as 'battle' | 'elite'), guard = 0; n > 0 && guard < 50; guard++) {
    const x = rng.int(s.width);
    const y = 2 + rng.int(Math.max(1, s.height - 4));
    const mx = s.width - 1 - x;
    const my = s.height - 1 - y;
    if (!free(x, y) || !free(mx, my) || (x === mx && y === my)) continue;
    const kind = kinds[rng.int(kinds.length)];
    tiles.push({ x, y, kind }, { x: mx, y: my, kind });
    n--;
  }
  if (act >= 2 && rng.next() < SCREWS_CHANCE) {
    for (let guard = 0; guard < 30; guard++) {
      const x = rng.int(s.width);
      const y = Math.floor(s.height / 2) + rng.int(Math.max(1, Math.floor(s.height / 2) - 2));
      if (free(x, y)) {
        tiles.push({ x, y, kind: 'screws' });
        break;
      }
    }
  }
  if (tiles.length) s.terrain = tiles;
};

/** 런 전투를 만든다: 플레이어 덱·장비 대 군단 (+ 층별 적 킹 보정) */
export const encounterBattle = (deck: Deck, loadout: Loadout, e: Encounter): BattleState => {
  const s = createBattle({ width: e.width, height: e.height, decks: [deck, e.deck], loadouts: [loadout, e.loadout], seed: e.seed });
  layTerrain(s, e);
  if (e.luck === 'defective') for (const p of s.pieces) if (p.side === 1 && p.type !== 'K') p.hp = Math.max(1, Math.round(p.maxHp * LUCK.defectiveHp));
  // 정예 접사: 그 유형의 적 기물 한 기씩
  for (const a of e.affixes ?? []) {
    const p = s.pieces.find((q) => q.side === 1 && q.type === a.type && !q.affix);
    if (p) p.affix = a.id;
  }
  // 적 다음 수 미리보기: 낮은 승천에서만 기본 제공 (D-076)
  s.rules = { ...s.rules, foresight: (e.ascension ?? 0) < FORESIGHT_UNTIL_ASCENSION ? 1 : 0 };
  const scale = enemyKingScale(e.floor);
  const expose = actOf(e.floor) >= 2 && e.kind !== 'boss' ? KING_EXPOSE : 1; // D-077
  const hpScale = Math.min(1, scale.hp + ((e.ascension ?? 0) >= 4 ? 0.1 : 0)) * expose;
  for (const p of s.pieces) {
    if (p.side !== 1 || p.type !== 'K') continue;
    p.maxHp = p.hp = Math.round(p.maxHp * hpScale);
    p.atk = Math.round(p.atk * scale.atk);
  }
  return s;
};
