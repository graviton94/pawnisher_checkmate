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
