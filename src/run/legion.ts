import { ASC, ascOn } from '../data/ascension';
import { FORESIGHT_UNTIL_ASCENSION, defaultRules } from '../data/battle';
import { CARVE_IDS } from '../data/carves';
import { BOSSES, BOSS_SCALE, ELITE, ENEMY_SCALE, FINAL_BOSS, THREATS, TOTAL_FLOORS, TYPE_MAX, actOf, boardFor, earlyKingAtk, earlyKingHp, enemyCount, enemyTier, type BossId, type NodeKind, type ThreatId } from '../data/run';
import { BOSS_TWIST, type TwistId } from '../data/twists';
import { Rng } from '../engine/rng';
import { createBattle, toUnits, type Deck, type Scale, type Unit } from '../engine/setup';
import type { BattleState, Loadout, PieceType } from '../engine/types';

/**
 * 적 군단 (규격 2.0 §3.4 — Into the Breach 정적 디자인): 적은 수 · 수치 · AI 단계로만 강해진다.
 * 검문!은 기물 +1 · 정예 1기, 반장은 비틀기 하나. 원형(폰 행렬 · 기병 · 사선 포대 · 방벽)은 구성의 맛일 뿐 규칙이 없다.
 */
export type ArchetypeId = 'horde' | 'cavalry' | 'battery' | 'rampart';
export const ARCHETYPES: Record<ArchetypeId, { name: string; weight: Partial<Record<PieceType, number>>; from: number }> = {
  horde: { name: '폰 행렬', weight: { P: 3, N: 0.5, B: 0.5 }, from: 1 },
  cavalry: { name: '기병 기습대', weight: { N: 4, P: 0.6 }, from: 2 },
  battery: { name: '사선 포대', weight: { B: 4, Q: 1, P: 0.6 }, from: 3 },
  rampart: { name: '방벽 대열', weight: { R: 4, P: 1.2, N: 0.4, B: 0.4 }, from: 4 },
};

/** 한 대국의 적 군단 */
export interface Encounter {
  kind: NodeKind;
  name: string;
  width: number;
  height: number;
  deck: Unit[];
  /** 적 AI 단계 (0~2) */
  tier: number;
  boss?: BossId | 'final';
  twist?: TwistId;
  scale: Scale;
  seed: number;
  floor: number;
  ascension?: number;
  archetype?: ArchetypeId;
}

/** 층이 오를수록 폰 비중이 줄고 상위 기물이 섞인다 */
const pieceWeights = (floor: number): [PieceType, number][] => [
  ['P', Math.max(14, 50 - floor * 3)],
  ['N', floor <= 2 ? 6 : 10 + floor],
  ['B', floor <= 2 ? 6 : 10 + floor],
  ['R', floor >= 4 ? 2 + floor : 0],
  ['Q', floor >= 9 ? floor / 2 : 0],
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

/** 양날 쌍의 적 강화 → 유형별 배율 */
export const threatScale = (threats: ThreatId[] = []): Scale => {
  const s: Scale = { hp: 1, atk: 1, byType: {} };
  for (const id of threats) {
    const t = THREATS[id];
    if (t.type) {
      const cur = (s.byType![t.type] ??= {});
      if (t.hp) cur.hp = (cur.hp ?? 1) * t.hp;
      if (t.atk) cur.atk = (cur.atk ?? 1) * t.atk;
    } else {
      if (t.hp) s.hp *= t.hp;
      if (t.atk) s.atk *= t.atk;
    }
  }
  return s;
};

const mul = (a: Scale, hp: number, atk: number): Scale => ({ ...a, hp: a.hp * hp, atk: a.atk * atk });

export const generateEncounter = (floor: number, kind: NodeKind, rng: Rng, boss?: BossId, ascension = 0, threats: ThreatId[] = []): Encounter => {
  const seed = rng.int(1_000_000_000);
  const act = actOf(floor);
  const tier = ascOn(ascension, 'noForesight') && kind === 'elite' ? 2 : enemyTier(floor, kind);
  let scale = mul(threatScale(threats), ENEMY_SCALE[act - 1].hp, ENEMY_SCALE[act - 1].atk);
  if (ascOn(ascension, 'enemyHp')) scale = mul(scale, ASC.enemyHp.mult, 1);
  if (ascOn(ascension, 'enemyAtk')) scale = mul(scale, 1, ASC.enemyAtk.mult);

  if (kind === 'boss') {
    const final = floor === TOTAL_FLOORS;
    const id: BossId | 'final' = final ? 'final' : boss!;
    const def = final ? FINAL_BOSS : BOSSES[boss!];
    const bs = BOSS_SCALE[act - 1];
    scale = mul(scale, bs.hp * (ascOn(ascension, 'bossHp') ? ASC.bossHp.mult : 1) * (final && ascOn(ascension, 'final') ? ASC.final.hp : 1), bs.atk);
    const twist = BOSS_TWIST[id];
    // 거푸집 상인: 적 기물마다 각인 하나 (킹 제외)
    const deck = toUnits(def.deck).map((u) => (twist === 'molds' && u.t !== 'K' ? { ...u, carve: CARVE_IDS[rng.int(CARVE_IDS.length)] } : u));
    return { kind, name: `${def.name} — ${def.title}`, ...boardFor(floor, 'boss'), deck, tier, boss: id, twist, scale, seed, floor, ascension };
  }

  const { width, height } = boardFor(floor, kind);
  const archOptions = (Object.keys(ARCHETYPES) as ArchetypeId[]).filter((id) => ARCHETYPES[id].from <= floor);
  const archetype = archOptions[rng.int(archOptions.length)];
  const arch = ARCHETYPES[archetype];
  const weights = pieceWeights(floor).map(([t, w]): [PieceType, number] => [t, w * (arch.weight[t] ?? 1)]);
  const count = enemyCount(floor) + (kind === 'elite' ? ELITE.pieces : 0) + (ascOn(ascension, 'extraPiece') ? 1 : 0);
  const types: PieceType[] = ['K'];
  for (let guard = 0; types.length < count && guard < 200; guard++) {
    const options = weights.filter(([t]) => types.filter((x) => x === t).length < TYPE_MAX[t]);
    const t = pick(rng, options);
    if (!t) break;
    types.push(t);
  }
  const deck: Unit[] = types.map((t) => ({ t }));
  // 검문! 정예: 가장 비싼 일반 기물 한 기 (HP ×2, 표식 하나)
  if (kind === 'elite') {
    const order: PieceType[] = ['Q', 'R', 'B', 'N', 'P'];
    const best = order.map((t) => deck.find((u) => u.t === t)).find((u) => !!u);
    if (best) best.elite = true;
  }
  // 1공정 앞쪽 적 킹은 약하다
  const kingHp = earlyKingHp(floor);
  const kingAtk = earlyKingAtk(floor);
  if (kingHp < 1 || kingAtk < 1) scale = { ...scale, byType: { ...scale.byType, K: { ...scale.byType?.K, hp: (scale.byType?.K?.hp ?? 1) * kingHp, atk: (scale.byType?.K?.atk ?? 1) * kingAtk } } };
  return { kind, name: `${kind === 'elite' ? '정예 ' : ''}${arch.name}`, width, height, deck, tier, scale, seed, floor, ascension, archetype };
};

/** 군단(덱)과 부품으로 실제 대국 상태를 만든다 */
export const encounterBattle = (deck: Deck, loadout: Loadout, e: Encounter): BattleState => {
  const rules = defaultRules(e.width, e.height);
  const foresight = (e.ascension ?? 0) >= FORESIGHT_UNTIL_ASCENSION ? 0 : 1;
  return createBattle({
    width: e.width,
    height: e.height,
    decks: [deck, e.deck],
    seed: e.seed,
    loadouts: [{ parts: [...loadout.parts] }, { parts: [] }],
    rules: { ...rules, foresight },
    twist: e.twist,
    enemyScale: e.scale,
    myKingHp: ascOn(e.ascension, 'myKingHp') ? ASC.myKingHp.mult : undefined,
  });
};
