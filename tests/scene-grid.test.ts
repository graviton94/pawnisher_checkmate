import { describe, expect, it } from 'vitest';

// D-556: 장면 격자(scene_recipe.SCENE_GRID)가 기록된 실측 간격과 3% 넘게 다르면 실패한다 (python3 -I tools/pixel/regrid.py check).
// 파이썬 · numpy가 없는 곳(일부 CI)에서는 건너뛴다 — 같은 검사를 python3 -I tools/pixel/test_regrid.py 로도 돌릴 수 있다.
// (tsconfig가 node 타입을 싣지 않으므로 child_process는 이름으로 불러온다)
type Run = { status: number | null; stdout: string; stderr: string };
const mod = 'node:child_process';
const { spawnSync } = (await import(/* @vite-ignore */ mod)) as { spawnSync: (cmd: string, args: string[], o: { encoding: 'utf8' }) => Run };
const hasPy = spawnSync('python3', ['-c', 'import numpy, PIL'], { encoding: 'utf8' }).status === 0;

describe('장면 도트 격자 = 실측', () => {
  it.skipIf(!hasPy)('SCENE_GRID 격자가 실측과 3% 안에 있다', () => {
    const r = spawnSync('python3', ['-I', 'tools/pixel/regrid.py', 'check'], { encoding: 'utf8' });
    expect(r.stdout + r.stderr).toMatch(/격자 = 실측/);
    expect(r.status).toBe(0);
  });
});
