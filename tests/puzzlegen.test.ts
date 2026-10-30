// @ts-nocheck — 생성기 전용 (node 타입 없이 fs·process를 쓴다)
import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { Rng, toSquare } from '../src/engine';
import { puzzleBattle, solvePuzzle } from '../src/run/puzzle';
import type { PuzzleDef } from '../src/data/puzzles';
import type { PieceType, Side } from '../src/engine/types';

/** 묘수풀이 생성기 (D-097): PUZZLEGEN=1 npx vitest run tests/puzzlegen.test.ts → scratch JSON. 평소 테스트에서는 건너뛴다 */
it.runIf(process.env.PUZZLEGEN)('묘수풀이 생성', () => {
  const out: PuzzleDef[] = [];
  for (let seed = 1; seed < 400 && out.length < 10; seed++) {
    const rng = new Rng(seed * 7919);
    const W = 6, H = 6;
    const taken = new Set<string>();
    const place = (y0: number, y1: number) => {
      for (;;) {
        const x = rng.int(W), y = y0 + rng.int(y1 - y0 + 1);
        const k = `${x},${y}`;
        if (!taken.has(k)) { taken.add(k); return toSquare({ x, y }); }
      }
    };
    const pieces: [PieceType, Side, string, number?][] = [['K', 0, place(0, 0)]];
    const own: PieceType[] = ['N', 'B', 'R', 'Q', 'P'];
    for (let i = 0; i < 3; i++) pieces.push([own[rng.int(own.length)], 0, place(0, 2)]);
    const kingSq = place(4, 5);
    const foes: PieceType[] = ['P', 'P', 'N', 'B'];
    const n = 2 + rng.int(2);
    for (let i = 0; i < n; i++) pieces.push([foes[rng.int(foes.length)], 1, place(3, 5)]);
    let best: PuzzleDef | null = null;
    for (const hp of [12, 18, 24, 30, 36, 42, 50, 60]) {
      const def: PuzzleDef = { id: `p${seed}`, width: W, height: H, pieces: [...pieces, ['K', 1, kingSq, hp]], steps: 0 };
      const s = puzzleBattle(def);
      const sol = solvePuzzle(s, 3);
      if (!sol) break;
      def.steps = sol.length;
      if (sol.length >= 2) best = def;
    }
    if (best && best.steps >= 2) out.push(best);
  }
  writeFileSync(process.env.PUZZLEGEN_OUT ?? 'puzzles.gen.json', JSON.stringify(out, null, 0));
}, 600000);
