import { describe, expect, it } from 'vitest';
import { PUZZLES } from '../src/data/puzzles';
import { simulate } from '../src/engine';
import { puzzleBattle, solvePuzzle } from '../src/run/puzzle';

describe('묘수풀이 (GDD 13장 P5, D-097)', () => {
  for (const def of PUZZLES) {
    it(`${def.id}: 한 수로는 안 되고, ${def.steps}수 조합으로 풀린다`, () => {
      const s = puzzleBattle(def);
      expect(solvePuzzle(s, def.steps - 1)).toBeNull();
      const sol = solvePuzzle(s, def.steps);
      expect(sol).not.toBeNull();
      expect(simulate(s, sol!).state.winner).toBe(0);
    });
  }
});

describe('묘수 노드 흐름', () => {
  it('풀면 나사 + 개조 3지선다, 못 풀면 빈 보상으로 출하가 이어진다', async () => {
    const { newRun, enterNode, finishPuzzle } = await import('../src/run/run');
    const { puzzleFor } = await import('../src/run/puzzle');
    const run = newRun(5);
    run.map[0] = [{ kind: 'puzzle' }];
    enterNode(run, 0);
    expect(run.stage.at).toBe('puzzle');
    if (run.stage.at !== 'puzzle') return;
    const def = puzzleFor(run.stage.id);
    const s = puzzleBattle(def);
    const gold = run.gold;
    finishPuzzle(run, simulate(s, solvePuzzle(s, def.steps)!).state);
    expect(run.gold).toBeGreaterThan(gold);
    const st = run.stage as unknown as { at: string; choices: { type: string }[] };
    expect(st.at === 'reward' && st.choices[0]?.type).toBe('enchant');

    const run2 = newRun(5);
    run2.map[0] = [{ kind: 'puzzle' }];
    enterNode(run2, 0);
    finishPuzzle(run2, puzzleBattle(def));
    expect(run2.stage.at === 'reward' && run2.stage.choices.length).toBe(0);
  });
});
