import { describe, expect, it } from 'vitest';
import { dangerSquares, endTurn, intentHits, newSliceBattle } from '../src/slice/battle';
import { battleFor } from '../src/slice/run';
import { Rng } from '../src/engine/rng';
import { PROC } from '../src/data/process';

/** 공정 판 (D-486, GDD 21장 §5) — 피아 무관, 적 차례 안에서 (예고 = 실행) */
const squad = [{ t: 'K' }, { t: 'R' }, { t: 'N' }, { t: 'P' }] as never;
const deck = ['advance', 'leap', 'kingStep', 'order', 'rookLine', 'leap'] as never;

describe('공정 판 (D-486)', () => {
  it('컨베이어: 적 차례 끝에 그 줄 기물이 한 칸 흐른다', () => {
    const b = newSliceBattle(squad, ['K', 'P'], deck, 4, { process: 'conveyor' });
    const row = b.proc!.row!, d = b.proc!.dir!;
    const p = b.s.pieces.find((q) => q.side === 0 && q.type === 'R')!;
    const x0 = d === 1 ? 0 : b.s.width - 1;
    b.s.pieces = b.s.pieces.filter((q) => !(q.y === row && q.id !== p.id));
    Object.assign(p, { x: x0, y: row });
    b.intents = [];
    endTurn(b, true);
    const now = b.s.pieces.find((q) => q.id === p.id);
    if (now && now.y === row) expect(now.x).toBe(x0 + d);
  });
  it('프레스: 예고 줄을 피아 가리지 않고 치고, 미리보기 피해 = 실제 피해', () => {
    const b = newSliceBattle(squad, ['K', 'P', 'N'], deck, 6, { process: 'press' });
    endTurn(b, true); // 2턴: 예고
    expect(b.proc!.pressRow).not.toBeNull();
    const row = b.proc!.pressRow!;
    expect(dangerSquares(b).filter((q) => q.y === row).length).toBe(b.s.width);
    const want = intentHits(b);
    const before = new Map(b.s.pieces.map((p) => [p.id, p.hp + p.shield]));
    endTurn(b, true);
    for (const h of want) {
      const now = b.s.pieces.find((p) => p.id === h.pieceId);
      if (now && !h.killed) expect((before.get(h.pieceId) ?? 0) - (now.hp + now.shield)).toBe(h.damage);
    }
  });
  it('자석 레일: 룩 · 킹이 기둥 쪽으로 한 칸', () => {
    const b = newSliceBattle(squad, ['K', 'P'], deck, 8, { process: 'magnet' });
    const col = b.proc!.col!;
    const r = b.s.pieces.find((q) => q.side === 0 && q.type === 'R')!;
    b.s.pieces = b.s.pieces.filter((q) => !(q.y === 1 && q.id !== r.id));
    Object.assign(r, { x: 0, y: 1 });
    b.intents = [];
    endTurn(b, true);
    const now = b.s.pieces.find((q) => q.id === r.id);
    if (now && now.y === 1 && col > 0) expect(now.x).toBe(1);
  });
  it('금 간 바닥: 두 번 밟히면 꺼지고 그 위 기물은 떨어진다', () => {
    const b = newSliceBattle(squad, ['K', 'P'], deck, 9, { process: 'crack' });
    const c = b.proc!.cells![0];
    const p = b.s.pieces.find((q) => q.side === 0 && q.type === 'N')!;
    b.s.pieces = b.s.pieces.filter((q) => !(q.x === c.x && q.y === c.y) || q.id === p.id);
    Object.assign(p, { x: c.x, y: c.y });
    b.intents = [];
    endTurn(b, true);
    expect(PROC.crackSteps).toBe(2);
    expect(b.s.pieces.some((q) => q.id === p.id)).toBe(false);
    expect(b.s.fallen).toContain(c.y * b.s.width + c.x);
  });
  it('금 간 바닥 칸 고르기 (2026-11-14): 한 줄에 둘까지 · 다 꺼져도 남은 칸이 하나로 이어진다', () => {
    for (let seed = 1; seed <= 200; seed++) for (const [w, h] of [[6, 6], [8, 6], [8, 7]]) {
      const b = newSliceBattle(squad, ['K', 'P', 'P', 'R'], deck, seed, { process: 'crack', width: w, height: h });
      const cells = b.proc!.cells!;
      const rows = new Map<number, number>();
      for (const c of cells) rows.set(c.y, (rows.get(c.y) ?? 0) + 1);
      expect(Math.max(...rows.values())).toBeLessThanOrEqual(PROC.crackRowMax);
      const hole = new Set(cells.map((c) => `${c.x},${c.y}`));
      const open: string[] = [];
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!hole.has(`${x},${y}`)) open.push(`${x},${y}`);
      const seen = new Set([open[0]]);
      const q = [open[0]];
      while (q.length) {
        const [x, y] = q.pop()!.split(',').map(Number);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const k = `${x + dx},${y + dy}`;
          if (x + dx < 0 || y + dy < 0 || x + dx >= w || y + dy >= h || hole.has(k) || seen.has(k)) continue;
          seen.add(k);
          q.push(k);
        }
      }
      expect(seen.size).toBe(open.length);
    }
  });
  it('반장 판은 짝 공정, 첫째 왕관 일반 대국 · 철갑 반장은 깨끗하다', () => {
    expect(battleFor(2, 'boss', new Rng(1), 0, 'magnet').process).toBe('magnet');
    expect(battleFor(1, 'boss', new Rng(1), 0, 'plate').process).toBeUndefined();
    expect(battleFor(1, 'check', new Rng(1), 0).process).toBeUndefined();
    expect(battleFor(1, 'check', new Rng(1), 1).process).toBe('crack');
    for (let s = 0; s < 20; s++) expect(battleFor(2, 'battle', new Rng(s), 1).process).toBeUndefined();
  });
});
