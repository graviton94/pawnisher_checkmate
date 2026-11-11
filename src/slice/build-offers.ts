import { BUILD_FAMILIES, SUPPORT_CARDS, BUILD_SUPPLY_WEIGHT } from '../data/build-supply';
export { BUILD_FAMILIES } from '../data/build-supply';
import type { CommandId } from './cards';
import { Rng } from '../engine/rng';
import { SLICE_PARTS, PART_GRADE, type SlicePartId } from './parts';

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
