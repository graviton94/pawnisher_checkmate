import { ENCHANTS, type EnchantId } from '../data/enchants';
import { BOSSES, ELITE_BONUS, boardFor, enemyCount, enemyForge, enemyTier, type BossId, type NodeKind } from '../data/run';
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
}

/** 층이 오를수록 폰 비중이 줄고 상위 기물이 섞인다 */
const pieceWeights = (floor: number): [PieceType, number][] => [
  ['P', Math.max(14, 50 - floor * 3)],
  ['N', 14 + floor],
  ['B', 14 + floor],
  ['R', floor >= 4 ? 4 + floor : 0],
  ['Q', floor >= 6 ? 2 + floor / 2 : 0],
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

export const generateEncounter = (floor: number, kind: NodeKind, rng: Rng, boss?: BossId): Encounter => {
  const seed = rng.int(1_000_000_000);
  const tier = enemyTier(floor, kind);
  const baseForge = enemyForge(floor);

  if (kind === 'boss' && boss) {
    const def = BOSSES[boss];
    const forge: Partial<Record<PieceType, number>> = {};
    for (const t of new Set(def.deck)) forge[t] = (def.forge[t] ?? 0) + baseForge;
    return {
      kind,
      name: `${def.name} — ${def.title}`,
      width: 8,
      height: 8,
      deck: [...def.deck],
      loadout: { enchants: { ...def.enchants }, cards: [...def.cards], forge },
      tier,
      boss,
      seed,
    };
  }

  const { width, height } = boardFor(floor);
  const count = enemyCount(floor) + (kind === 'elite' ? ELITE_BONUS.pieces : 0);
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
  if (kind === 'elite') {
    const pool = [...new Set(deck.map((t) => TYPE_ENCHANT[t]).filter((e): e is EnchantId => !!e)), ...GENERAL];
    for (let i = 0; i < ELITE_BONUS.enchants && pool.length; i++) {
      const id = pool.splice(rng.int(pool.length), 1)[0];
      enchants[id] = floor >= 8 ? 2 : 1;
    }
  }
  const names = Object.keys(enchants).map((id) => ENCHANTS[id as EnchantId].name);
  return {
    kind,
    name: kind === 'elite' ? `정예 군단${names.length ? ` — ${names.join(' · ')}` : ''}` : `${floor}층 군단`,
    width,
    height,
    deck,
    loadout: { enchants, cards: [], forge },
    tier,
    seed,
  };
};
