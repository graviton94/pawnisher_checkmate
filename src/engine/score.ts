import { PIECE_STATS } from '../data/pieces';
import { kingOf } from './board';
import { otherSide, type BattleState, type Side } from './types';

/** 전황 스코어 S (GDD 5장 §5.3) */
export const battleScore = (s: BattleState, side: Side): number => {
  let score = 0;
  for (const p of s.pieces) {
    if (p.side !== side) continue;
    if (p.type === 'K') score += (p.hp / p.maxHp) * 100;
    else score += PIECE_STATS[p.type].value * (p.hp / p.maxHp);
  }
  return score;
};

/** 열세율 = (S_상대 − S_나) / S_상대, 우세하면 0 */
export const inferiority = (s: BattleState, side: Side): number => {
  const me = battleScore(s, side);
  const them = battleScore(s, otherSide(side));
  return them > 0 && me < them ? (them - me) / them : 0;
};

export const kingHpRatio = (s: BattleState, side: Side): number => {
  const k = kingOf(s, side);
  return k ? k.hp / k.maxHp : 0;
};
