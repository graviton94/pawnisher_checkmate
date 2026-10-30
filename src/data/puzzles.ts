import type { PieceType, Side } from '../engine/types';

/**
 * 묘수풀이 문제 (D-097). tools 생성기로 뽑아 `solvePuzzle`로 검증한 판만 둔다 (tests/puzzles.test.ts가 매번 다시 푼다):
 * 한 수로는 안 되고, 명령 2~3개의 순서를 맞춰야 적 킹이 쓰러진다.
 * 기물: [유형, 진영, 칸, HP(생략 = 기본)]
 */
export interface PuzzleDef {
  id: string;
  width: number;
  height: number;
  pieces: [PieceType, Side, string, number?][];
  /** 해법 명령 수 (검증값) */
  steps: number;
}

export const PUZZLES: PuzzleDef[] = [
  { id: 'm1', width: 6, height: 6, steps: 3, pieces: [['K', 0, 'd1'], ['P', 0, 'c3'], ['N', 0, 'd3'], ['B', 0, 'f1'], ['P', 1, 'c5'], ['P', 1, 'f4'], ['B', 1, 'd5'], ['K', 1, 'b5', 18]] },
  { id: 'm2', width: 6, height: 6, steps: 2, pieces: [['K', 0, 'a1'], ['P', 0, 'f3'], ['Q', 0, 'e2'], ['P', 0, 'c2'], ['P', 1, 'b5'], ['P', 1, 'a5'], ['B', 1, 'e4'], ['K', 1, 'f6', 24]] },
  { id: 'm3', width: 6, height: 6, steps: 2, pieces: [['K', 0, 'b1'], ['P', 0, 'f1'], ['P', 0, 'a3'], ['R', 0, 'd2'], ['B', 1, 'f5'], ['B', 1, 'a5'], ['K', 1, 'b5', 24]] },
  { id: 'm4', width: 6, height: 6, steps: 2, pieces: [['K', 0, 'c1'], ['Q', 0, 'f2'], ['N', 0, 'a1'], ['P', 0, 'd2'], ['B', 1, 'e6'], ['P', 1, 'a5'], ['K', 1, 'e5', 30]] },
  { id: 'm5', width: 6, height: 6, steps: 2, pieces: [['K', 0, 'f1'], ['R', 0, 'a3'], ['B', 0, 'b2'], ['B', 0, 'b1'], ['N', 1, 'a4'], ['B', 1, 'b5'], ['K', 1, 'e6', 30]] },
  { id: 'm6', width: 6, height: 6, steps: 2, pieces: [['K', 0, 'f1'], ['P', 0, 'b1'], ['R', 0, 'c1'], ['N', 0, 'b2'], ['N', 1, 'b5'], ['P', 1, 'b4'], ['B', 1, 'a4'], ['K', 1, 'c5', 30]] },
  { id: 'm7', width: 6, height: 6, steps: 2, pieces: [['K', 0, 'e1'], ['R', 0, 'c2'], ['P', 0, 'f2'], ['B', 0, 'f3'], ['N', 1, 'e6'], ['P', 1, 'd4'], ['K', 1, 'b5', 30]] },
  { id: 'm8', width: 6, height: 6, steps: 2, pieces: [['K', 0, 'c1'], ['P', 0, 'e2'], ['P', 0, 'f1'], ['R', 0, 'd1'], ['N', 1, 'e5'], ['B', 1, 'd6'], ['P', 1, 'd4'], ['K', 1, 'a5', 18]] },
];

/** 묘수풀이 보상 (나사) 🔧 */
export const PUZZLE_GOLD = 40;
