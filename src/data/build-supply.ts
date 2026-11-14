import type { CommandId } from '../slice/cards';
import type { SlicePartId } from '../slice/parts';

/** 축 하나에 묶이지 않는 세 운영의 입문·보조·완성 재료. 공급은 부품 등급 추첨 뒤 적용한다. */
export const BUILD_FAMILIES: Record<string, SlicePartId[]> = {
  mixed: ['relayGear', 'relaySeal', 'sharedPlate', 'openGate', 'gameRecord', 'sergeant', 'cleanSheet'],
  knight: ['horseshoe', 'magnet', 'spurs', 'jumpSpring', 'saddle', 'lance', 'stirrup', 'veteran'],
  rook: ['siegeLatch', 'rookBolt', 'anvilPlate', 'thickWall', 'rampart', 'hammer', 'sharedPlate', 'chainShot'],
};

export const SUPPORT_CARDS: Record<keyof typeof BUILD_FAMILIES, CommandId[]> = {
  mixed: ['bishopStep', 'rookDiscover', 'stepAside', 'plate', 'scrapToss', 'order'],
  knight: ['knightRaid', 'hoofKick', 'rebound', 'knightFork', 'hobble', 'repair'],
  rook: ['rookCharge', 'rookPierce', 'rookGuard', 'plate', 'shove', 'bishopStep'],
};

/** D-431: 보상 첫 칸의 상성 후보 가중치. 다른 후보는1이다. */
export const BUILD_SUPPLY_WEIGHT = 3;

/**
 * 카드 보상 제시 (2026-11-14 사용자 결정 · 피드백 #26 · #28):
 * 칸마다 등급을 먼저 뽑는 것(일반 64 · 희귀 31 · 황금 5)은 그대로 두고, 그 등급 안에서는 **열린 카드 전체에서 고르게** 고른다 —
 * 예전엔 축을 먼저 정하고 그 축 · 등급 안에서 골라, 처음 풀의 왕 · 밀치기 축 일반 카드(왕의 돌진)가 제시의 13.5%였다.
 * 축은 겹치지 않게(이미 나온 축은 무게 sameAxisW) 하고, 첫 칸은 가진 부품의 축 하나를 먼저(그 축 안에서는 카드마다 등급 무게).
 * commonMoveW = 공용(아무 기물) 이동 카드의 제시 무게 — 공용 카드가 기물 전용 카드보다 덜 나온다.
 * sameAxisW = 이번 보상에 이미 나온 축 카드의 무게(축이 고루 나오게 — 거르지 않고 무게로만).
 */
export const OFFER = { commonMoveW: 0.5, sameAxisW: 0.35 };
