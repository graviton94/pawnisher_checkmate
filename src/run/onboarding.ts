import type { Lesson } from '../data/onboarding';
import { PIECE_STATS } from '../data/pieces';
import { fromSquare } from '../engine/board';
import { createBattle } from '../engine/setup';
import type { BattleState } from '../engine/types';

/** 시험대 한 판 → 대국 상태 (요충지 · 바닥 꺼짐 없음, 체크 · 감청은 판마다) */
export const lessonBattle = (l: Lesson): BattleState => {
  const s = createBattle({ width: l.width, height: l.height, decks: [['K'], ['K']], rules: { strongholdRounds: [], collapseStart: null, collapseInterval: 1, checkmate: l.checkmate, foresight: l.foresight } });
  s.pieces = l.pieces.map(([type, side, sq, hp], i) => {
    const st = PIECE_STATS[type];
    const { x, y } = fromSquare(sq);
    const h = hp ?? st.hp;
    return { id: i + 1, type, side, x, y, hp: h, maxHp: Math.max(h, st.hp), atk: st.atk, def: st.def, shield: 0, moved: false, buffAtkPct: 0, buffDef: 0, buffTurns: 0 };
  });
  return s;
};
