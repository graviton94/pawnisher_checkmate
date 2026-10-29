import { STRONGHOLD } from '../data/battle';
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

/** 진영의 형편: 우세·동률이면 'leading', 아니면 열세 단계 (GDD 5장 §5.5 기준) */
export type Standing = 'leading' | 'tier1' | 'tier2' | 'tier3';

export const standingOf = (s: BattleState, side: Side): Standing => {
  const inf = inferiority(s, side);
  if (inf >= STRONGHOLD.tier3At || kingHpRatio(s, side) <= STRONGHOLD.tier3KingHp) return 'tier3';
  if (inf <= 0) return 'leading';
  return inf >= STRONGHOLD.tier2At ? 'tier2' : 'tier1';
};

export const strongholdTerms = (s: BattleState, side: Side) => STRONGHOLD.terms[standingOf(s, side)];
