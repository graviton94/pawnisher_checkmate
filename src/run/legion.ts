import { ENCHANTS, type EnchantId } from '../data/enchants';
import { BOSSES, ELITE_BONUS, FINAL_BOSS, TOTAL_FLOORS, actEnchants, actOf, boardFor, enemyCount, enemyForge, enemyKingScale, enemyTier, type BossId, type NodeKind } from '../data/run';
import { CARDS, type CardId } from '../data/cards';
import { createBattle } from '../engine/setup';
import type { BattleState } from '../engine/types';
import type { Rng } from '../engine/rng';
import type { Deck } from '../engine/setup';
import type { Loadout, PieceType } from '../engine/types';
import { canAdd } from './deck';

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

export const generateEncounter = (floor: number, kind: NodeKind, rng: Rng, boss?: BossId, ascension = 0): Encounter => {
  const seed = rng.int(1_000_000_000);
  const tier = ascension >= 3 && kind === 'elite' ? 2 : enemyTier(floor, kind);
  const baseForge = enemyForge(floor);

  if (kind === 'boss' && (boss || floor === TOTAL_FLOORS)) {
    const def = floor === TOTAL_FLOORS ? FINAL_BOSS : BOSSES[boss!];
    const forge: Partial<Record<PieceType, number>> = {};
    for (const t of new Set(def.deck)) forge[t] = Math.min(5, (def.forge[t] ?? 0) + baseForge + (ascension >= 5 ? 1 : 0));
    return {
      kind,
      name: `${def.name} — ${def.title}`,
      ...boardFor(floor, 'boss'),
      deck: [...def.deck],
      loadout: { enchants: { ...def.enchants }, cards: [...def.cards], forge },
      tier,
      boss,
      seed,
      floor,
      ascension,
    };
  }

  const { width, height } = boardFor(floor, kind, rng.next());
  const count = enemyCount(floor) + (kind === 'elite' ? ELITE_BONUS.pieces : 0) + (ascension >= 1 ? 1 : 0);
  const deck: Deck = ['K'];
  let guard = 0;
  while (deck.length < count && guard++ < 200) {
    const options = pieceWeights(floor).filter(([t]) => canAdd(deck, t));
    const t = pick(rng, options);
    if (!t) break;
    deck.push(t);
  }

  const forge: Partial<Record<PieceType, number>> = {};
  const lv = baseForge + (kind === 'elite' ? ELITE_BONUS.forge : 0);
  if (lv > 0) for (const t of new Set(deck)) forge[t] = lv;

  const enchants: Partial<Record<EnchantId, number>> = {};
  const pool = [...new Set(deck.map((t) => TYPE_ENCHANT[t]).filter((e): e is EnchantId => !!e)), ...GENERAL];
  for (let i = 0; i < actEnchants(floor, kind) + (ascension >= 3 && kind === 'elite' ? 1 : 0) && pool.length; i++) {
    const id = pool.splice(rng.int(pool.length), 1)[0];
    enchants[id] = actOf(floor) === 3 && kind === 'elite' ? 3 : floor >= 8 ? 2 : 1;
  }
  // Act 3 엘리트는 지속형 카드 1장
  const cards: CardId[] = [];
  if (kind === 'elite' && actOf(floor) === 3) {
    const sustain = (Object.keys(CARDS) as CardId[]).filter((c) => CARDS[c].limit.type !== 'consume');
    cards.push(sustain[rng.int(sustain.length)]);
  }
  const names = Object.keys(enchants).map((id) => ENCHANTS[id as EnchantId].name);
  return {
    kind,
    name: `${kind === 'elite' ? '정예 군단' : `${floor}층 군단`}${names.length ? ` — ${names.join(' · ')}` : ''}`,
    width,
    height,
    deck,
    loadout: { enchants, cards, forge },
    tier,
    seed,
    floor,
    ascension,
  };
};

/** 런 전투를 만든다: 플레이어 덱·장비 대 군단 (+ 층별 적 킹 보정) */
export const encounterBattle = (deck: Deck, loadout: Loadout, e: Encounter): BattleState => {
  const s = createBattle({ width: e.width, height: e.height, decks: [deck, e.deck], loadouts: [loadout, e.loadout], seed: e.seed });
  const scale = enemyKingScale(e.floor);
  const hpScale = Math.min(1, scale.hp + ((e.ascension ?? 0) >= 4 ? 0.1 : 0));
  for (const p of s.pieces) {
    if (p.side !== 1 || p.type !== 'K') continue;
    p.maxHp = p.hp = Math.round(p.maxHp * hpScale);
    p.atk = Math.round(p.atk * scale.atk);
  }
  return s;
};
