import type { PieceType } from '../engine/types';

/** 기물 기본 스탯 (GDD 2장 §2.5, 초기값). */
export interface PieceStats {
  hp: number;
  atk: number;
  def: number;
  /** 이동 AP 코스트 */
  ap: number;
  /** 가치 — 요충지 스코어·덱 희생 규칙에 쓰인다 (GDD 5장 §5.3, 6장 §6.2) */
  value: number;
}

export const PIECE_STATS: Record<PieceType, PieceStats> = {
  P: { hp: 25, atk: 10, def: 2, ap: 1, value: 10 },
  N: { hp: 45, atk: 16, def: 3, ap: 2, value: 25 },
  B: { hp: 35, atk: 18, def: 1, ap: 2, value: 25 },
  R: { hp: 70, atk: 22, def: 5, ap: 3, value: 40 },
  Q: { hp: 65, atk: 28, def: 4, ap: 4, value: 60 },
  K: { hp: 100, atk: 15, def: 4, ap: 1, value: 0 },
};

/** 턴당 기본 AP (GDD 1장 §1.4). */
export const BASE_AP = 5;

export const PIECE_NAMES_KO: Record<PieceType, string> = {
  P: '폰',
  N: '나이트',
  B: '비숍',
  R: '룩',
  Q: '퀸',
  K: '킹',
};
