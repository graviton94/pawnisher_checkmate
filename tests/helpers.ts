import { PIECE_STATS } from '../src/data/pieces';
import { fromSquare, type BattleState, type Piece, type PieceType, type Side } from '../src/engine';

export type Spec = [PieceType, Side, string, Partial<Piece>?];

/** 테스트용 보드: [유형, 진영, 칸, 덮어쓸 값] 목록으로 상태를 만든다. id는 목록 순서대로 1부터. */
export const board = (specs: Spec[], width = 8, height = 8, turnSide: Side = 0): BattleState => ({
  width,
  height,
  turnSide,
  turnNumber: 1,
  winner: null,
  pieces: specs.map(([type, side, sq, over], i) => {
    const st = PIECE_STATS[type];
    const { x, y } = fromSquare(sq);
    return { id: i + 1, type, side, x, y, hp: st.hp, maxHp: st.hp, atk: st.atk, def: st.def, shield: 0, moved: false, ...over };
  }),
});

export const sq = fromSquare;
