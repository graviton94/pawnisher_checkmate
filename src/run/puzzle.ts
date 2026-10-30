import { PUZZLES, type PuzzleDef } from '../data/puzzles';
import { PIECE_STATS } from '../data/pieces';
import { fromSquare } from '../engine/board';
import { legalMoves } from '../engine/rules';
import { simulate } from '../engine/plan';
import { createBattle } from '../engine/setup';
import type { BattleState, Plan } from '../engine/types';

/**
 * 묘수풀이 (GDD 13장 P5, D-097): 고정 배치 · 한 번의 가동으로 적 킹을 쓰러뜨리는 문제.
 * 실패해도 출하는 이어진다 (보상만 없다). 문제는 생성기로 만들고 `solvePuzzle`로 해법을 검증해 데이터로 고정한다.
 */

/** 문제 → 대국 상태 (체크 보호·바닥 꺼짐·요충지 없음) */
export const puzzleBattle = (def: PuzzleDef): BattleState => {
  const s = createBattle({ width: def.width, height: def.height, decks: [['K'], ['K']], rules: { strongholdRounds: [], collapseStart: null, collapseInterval: 1, checkmate: false, foresight: 0 } });
  s.pieces = def.pieces.map(([type, side, sq, hp], i) => {
    const st = PIECE_STATS[type];
    const { x, y } = fromSquare(sq);
    const h = hp ?? st.hp;
    return { id: i + 1, type, side, x, y, hp: h, maxHp: Math.max(h, st.hp), atk: st.atk, def: st.def, shield: 0, moved: false, buffAtkPct: 0, buffDef: 0, buffTurns: 0 };
  });
  return s;
};

/** 가장 짧은 해법 (명령 maxSteps개까지). 없으면 null */
export const solvePuzzle = (s: BattleState, maxSteps = 3): Plan | null => {
  for (let depth = 1; depth <= maxSteps; depth++) {
    const found = search(s, [], depth);
    if (found) return found;
  }
  return null;
};

const search = (s: BattleState, plan: Plan, depth: number): Plan | null => {
  if (plan.length === depth) return null;
  const sim = simulate(s, plan);
  if (!sim.ok || sim.state.winner !== null) return null;
  const acted = new Set(plan.map((p) => p.pieceId));
  for (const p of sim.state.pieces) {
    if (p.side !== s.turnSide || acted.has(p.id)) continue;
    for (const to of legalMoves(sim.state, p)) {
      const next: Plan = [...plan, { pieceId: p.id, to }];
      const r = simulate(s, next);
      if (!r.ok) continue;
      if (r.state.winner === s.turnSide) return next;
      const deeper = search(s, next, depth);
      if (deeper) return deeper;
    }
  }
  return null;
};

/** 런 시드로 문제 하나 */
export const puzzleFor = (n: number): PuzzleDef => PUZZLES[((n % PUZZLES.length) + PUZZLES.length) % PUZZLES.length];
