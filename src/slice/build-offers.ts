import { BUILD_FAMILIES, SUPPORT_CARDS, BUILD_SUPPLY_WEIGHT, OFFER } from '../data/build-supply';
export { BUILD_FAMILIES } from '../data/build-supply';
import { COMMANDS, GRADE, gradeOf, KITS, rollGrade, SLICE, type Axis, type CommandId } from './cards';
import { Rng } from '../engine/rng';
import { SLICE_PARTS, PART_GRADE, type SlicePartId } from './parts';

/** 실제 화면과 경량 봇이 같은 세 갈래/한 축 상자를 공급한다. 선택 정책은 호출자가 정한다. */
export const kitOffers = (pool: typeof KITS, rng: Rng): { offers: typeof KITS; deep: string | null } => {
  const offers: typeof KITS = [];
  const axisOf = (k: (typeof KITS)[number]) => SLICE_PARTS[k.part].axis ?? 'none';
  const deepAxes = [...new Set(pool.map(axisOf))].filter(ax => ax !== 'none' && pool.filter(k => axisOf(k) === ax).length >= 3);
  const deep = deepAxes.length > 0 && rng.next() < SLICE.kitDeepChance ? deepAxes[rng.int(deepAxes.length)] : null;
  const src = deep ? pool.filter(k => axisOf(k) === deep) : [...pool];
  while (offers.length < 3 && src.length) {
    const fresh = deep ? src : src.filter(k => !offers.some(o => axisOf(o) === axisOf(k)));
    const from = fresh.length ? fresh : src;
    const k = from[rng.int(from.length)];
    src.splice(src.indexOf(k), 1); offers.push(k);
  }
  return { offers, deep };
};

/** 이미 고른 운영의 다른 역할을 보조한다. 무관한 후보도 남겨 전환을 막지 않는다. */
export const buildAffinity = (id: SlicePartId, owned: SlicePartId[]): boolean => {
  const family = Object.values(BUILD_FAMILIES).some((ids) => ids.includes(id) && ids.some((part) => owned.includes(part)));
  const axis = SLICE_PARTS[id].axis;
  return family || !!axis && owned.some((part) => SLICE_PARTS[part].axis === axis);
};

/** 일반/희귀/황금의 추첨 확률은 바꾸지 않고, 한 보상 한 칸만 상성 가중치를 준다. */
export const chooseBuildPart = (pool: SlicePartId[], owned: SlicePartId[], rng: Rng, affinity: boolean): SlicePartId => {
  const weights = pool.map((id) => affinity && buildAffinity(id, owned) ? BUILD_SUPPLY_WEIGHT : 1);
  let roll = rng.next() * weights.reduce((n, w) => n + w, 0);
  return pool.find((_, i) => (roll -= weights[i]) < 0) ?? pool[pool.length - 1];
};

/** 매 출하의 첫 상점에 일반 보조품을 한 개 공급한다. 완성품과 무료 지급은 보장하지 않는다. */
export const firstShopParts = (pool: SlicePartId[], owned: SlicePartId[], shopsSeen: number): SlicePartId[] => {
  if (shopsSeen !== 0) return pool;
  const support = pool.filter((id) => (PART_GRADE[id] ?? 'common') === 'common' && buildAffinity(id, owned));
  return support.length ? support : pool;
};

/** 카드 보상 첫 칸만 기능 상성을 가중한다. 후보는 호출자가 등급·해금·분대로 먼저 제한한다. */
export const chooseBuildCard = (pool: CommandId[], owned: SlicePartId[], rng: Rng): CommandId => {
  const fits = (id: CommandId) => Object.entries(SUPPORT_CARDS).some(([family, cards]) => cards.includes(id)
    && BUILD_FAMILIES[family].some((part) => owned.includes(part)));
  let roll = rng.next() * pool.reduce((n, id) => n + (fits(id) ? BUILD_SUPPLY_WEIGHT : 1), 0);
  return pool.find((id) => (roll -= fits(id) ? BUILD_SUPPLY_WEIGHT : 1) < 0) ?? pool[pool.length - 1];
};

/** 공용(아무 기물) 이동 카드인가 (#28 — 제시 무게 OFFER.commonMoveW) */
export const isCommonMove = (id: CommandId): boolean => COMMANDS[id]?.who === 'any' && COMMANDS[id]?.kind === 'move';

/**
 * 카드 보상 n장 (화면 · 등반 봇 공용, 2026-11-14): 칸마다 등급을 뽑고(GRADE — 확률 그대로) 그 등급의 열린 카드 전체에서 고르게.
 * 축이 겹치지 않는 카드를 먼저(없으면 아무 축) · 첫 칸은 가진 부품의 축(ownAxes) 하나 · 공용 이동 카드는 무게 OFFER.commonMoveW ·
 * 첫 칸만 기능 상성(chooseBuildCard 무게). pool = 호출자가 해금 · 분대 · 등급으로 먼저 거른 후보.
 */
export const cardOffers = (pool: CommandId[], n: number, o: { elite: boolean; ownAxes: Axis[]; parts: SlicePartId[]; rng: Rng }): CommandId[] => {
  const { rng } = o;
  const out: CommandId[] = [];
  const axesOf = (id: CommandId) => [COMMANDS[id].axis, COMMANDS[id].axis2].filter(Boolean) as Axis[];
  const used = new Set<Axis>();
  const fits = (id: CommandId) => Object.entries(SUPPORT_CARDS).some(([family, cards]) => cards.includes(id) && BUILD_FAMILIES[family].some((part) => o.parts.includes(part)));
  for (let slot = 0; out.length < n && slot < n + 4; slot++) {
    const g = rollGrade(rng.next(), o.elite ? GRADE.elite : GRADE.weights);
    let cand = pool.filter((id) => !out.includes(id));
    if (!cand.length) break;
    if (out.length === 0 && o.ownAxes.length) {
      const a = o.ownAxes[rng.int(o.ownAxes.length)];
      const c = cand.filter((id) => axesOf(id).includes(a));
      if (c.length) cand = c;
    } else {
      const fresh = cand.filter((id) => !axesOf(id).some((a) => used.has(a)));
      if (fresh.length) cand = fresh;
    }
    const same = cand.filter((id) => gradeOf(id) === g);
    const from = same.length ? same : cand;
    const w = from.map((id) => (isCommonMove(id) ? OFFER.commonMoveW : 1) * (out.length === 0 && same.length && fits(id) ? BUILD_SUPPLY_WEIGHT : 1));
    let roll = rng.next() * w.reduce((a, x) => a + x, 0);
    const id = from.find((_, i) => (roll -= w[i]) < 0) ?? from[from.length - 1];
    out.push(id);
    for (const a of axesOf(id)) used.add(a);
  }
  return out;
};
