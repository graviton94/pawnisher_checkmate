import { PROC, PROCESS, type ProcessId } from '../data/process';
import { PIECE_STATS } from '../data/pieces';
import { heatDmg, inBounds, type BattleEvent, type BattleState, type Piece, type Pos } from '../engine';
import { Rng } from '../engine/rng';

/**
 * 공정 판 (D-486, GDD 21장 §5) — 판 자체가 기계다. 피아를 가리지 않는다.
 * 모든 일은 적 차례 안(enemyPhase 앞 · 끝)에서 일어나 미리보기(intentHits · 적의 수 목록)와 실행이 같고,
 * 프레스 줄 예고만 내 차례 시작에 정한다(그다음 적의 수를 예고하듯).
 */
export interface ProcState {
  kind: ProcessId;
  /** 컨베이어 줄 · 흐르는 쪽 */
  row?: number;
  dir?: 1 | -1;
  /** 자석 레일 기둥 */
  col?: number;
  /** 용광로 · 금 간 바닥 칸 */
  cells?: Pos[];
  /** 금 간 바닥: 칸 → 밟힌 수 */
  cracks?: Record<string, number>;
  /** 프레스: 이번 적 차례에 내리찍을 줄 */
  pressRow?: number | null;
}
interface Holder { s: BattleState; turn: number; proc?: ProcState; atkK?: number }

const key = (p: Pos) => `${p.x},${p.y}`;
const value = (p: Piece): number => (p.type === 'K' ? 300 : PIECE_STATS[p.type].value);
const at = (s: BattleState, p: Pos) => s.pieces.find((q) => q.x === p.x && q.y === p.y);

/**
 * 금 간 바닥 칸 고르기 (긴 대국 보고 2026-11-14 제안 4): 한 줄에 PROC.crackRowMax칸까지, 그리고 모든 칸이 꺼져도
 * 남은 칸이 가로세로로 하나로 이어져야 한다(두 진영이 서로 닿는다) — 구멍 벽에 막혀 양쪽 다 둘 수 없는 판을 막는다.
 */
const pickCracks = (s: BattleState, mid: Pos[], r: Rng): Pos[] => {
  const pool = [...mid];
  const out: Pos[] = [];
  const linked = (holes: Pos[]): boolean => {
    const hole = new Set(holes.map(key));
    const open: Pos[] = [];
    for (let y = 0; y < s.height; y++) for (let x = 0; x < s.width; x++) if (!hole.has(key({ x, y }))) open.push({ x, y });
    const seen = new Set([key(open[0])]);
    const q = [open[0]];
    while (q.length) {
      const c = q.pop()!;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = { x: c.x + dx, y: c.y + dy };
        if (n.x < 0 || n.y < 0 || n.x >= s.width || n.y >= s.height || hole.has(key(n)) || seen.has(key(n))) continue;
        seen.add(key(n));
        q.push(n);
      }
    }
    return seen.size === open.length;
  };
  while (out.length < PROC.crackCells && pool.length) {
    const c = pool.splice(r.int(pool.length), 1)[0];
    if (out.filter((o) => o.y === c.y).length >= PROC.crackRowMax || !linked([...out, c])) continue;
    out.push(c);
  }
  return out;
};

/** 대국 시작: 공정 판의 자리를 정한다 — 두 진영 사이 가운데 줄들, 시드대로 */
export const setupProcess = (s: BattleState, kind: ProcessId, seed: number): ProcState => {
  const r = new Rng(seed ^ 0x9c55);
  const w = s.width, h = s.height;
  const mid: Pos[] = [];
  for (let y = 2; y <= h - 3; y++) for (let x = 0; x < w; x++) if (!at(s, { x, y })) mid.push({ x, y });
  const pickCells = (n: number): Pos[] => {
    const pool = [...mid];
    const out: Pos[] = [];
    while (out.length < n && pool.length) out.push(pool.splice(r.int(pool.length), 1)[0]);
    return out;
  };
  if (kind === 'conveyor') return { kind, row: Math.floor((h - 1) / 2), dir: r.next() < 0.5 ? 1 : -1 };
  if (kind === 'magnet') return { kind, col: Math.floor((w - 1) / 2) };
  if (kind === 'furnace') return { kind, cells: pickCells(PROC.furnaceCells) };
  if (kind === 'crack') return { kind, cells: pickCracks(s, mid, r), cracks: {} };
  return { kind, pressRow: null };
};

/** 내 차례 시작: 프레스가 내리찍을 줄을 예고한다 (pressEvery턴마다, 내 기물 값이 가장 많이 모인 줄 — 같으면 가운데 쪽) */
export const processTurn = (b: Holder): void => {
  const pr = b.proc;
  if (!pr || pr.kind !== 'press') return;
  pr.pressRow = null;
  if (b.turn % PROC.pressEvery !== 0) return;
  const rows = new Map<number, number>();
  for (const p of b.s.pieces) if (p.side === 0) rows.set(p.y, (rows.get(p.y) ?? 0) + value(p));
  const mid = (b.s.height - 1) / 2;
  const best = [...rows.entries()].sort((x, y) => y[1] - x[1] || Math.abs(x[0] - mid) - Math.abs(y[0] - mid) || x[0] - y[0])[0];
  pr.pressRow = best ? best[0] : null;
};

/** 피해 · 떨어짐을 적용하고 사건 하나로 — 쓰러진 기물 정리 · 승패는 부르는 쪽 */
const strike = (targets: Piece[], dmg: (p: Piece) => number, label: string, cells: Pos[], fx: 'slam' | 'burst' = 'slam'): BattleEvent | null => {
  if (!targets.length && !cells.length) return null;
  const hits = targets.map((p) => {
    const d = dmg(p);
    const absorbed = Math.min(p.shield, d);
    p.shield -= absorbed;
    p.hp = Math.max(0, p.hp - (d - absorbed));
    return { targetId: p.id, damage: d, shieldAbsorbed: absorbed, hpAfter: p.hp, killed: p.hp <= 0 };
  });
  return { type: 'blast', pos: cells[0] ?? { x: 0, y: 0 }, label, hits, fx, cells };
};

/** 금 간 바닥: 지금 그 칸에 선 기물마다 한 번 밟힘 — 다 밟히면 꺼지고 그 위 기물은 떨어진다(거대 주물은 무게를 나눠 밟지 않는다) */
const stepCracks = (b: Holder): BattleEvent | null => {
  const pr = b.proc!;
  const fell: Piece[] = [];
  const holes: Pos[] = [];
  for (const c of pr.cells ?? []) {
    const p = at(b.s, c);
    if (!p || p.giant) continue;
    const n = (pr.cracks![key(c)] ?? 0) + 1;
    pr.cracks![key(c)] = n;
    if (n >= PROC.crackSteps) { holes.push(c); fell.push(p); }
  }
  if (!holes.length) return null;
  pr.cells = (pr.cells ?? []).filter((c) => !holes.some((h) => h.x === c.x && h.y === c.y));
  b.s = { ...b.s, fallen: [...(b.s.fallen ?? []), ...holes.map((h) => h.y * b.s.width + h.x)] };
  return strike(fell, (p) => p.hp + p.shield, `${PROCESS.crack.name} — 꺼진다`, holes, 'burst');
};

/** 적 차례 앞: 내가 끝낸 자리에서 금 간 칸을 밟는다 */
export const processBefore = (b: Holder): BattleEvent[] => {
  if (b.proc?.kind !== 'crack') return [];
  const e = stepCracks(b);
  return e ? [e] : [];
};

/** 적 차례 끝: 프레스 · 용광로 · 금 간 바닥 · 컨베이어 · 자석 레일 */
export const processAfter = (b: Holder): BattleEvent[] => {
  const pr = b.proc;
  if (!pr || b.s.winner !== null) return [];
  const out: BattleEvent[] = [];
  const foe = (n: number) => heatDmg(b.s, Math.max(1, Math.round(n * (b.atkK ?? 1))));
  if (pr.kind === 'press' && pr.pressRow !== null && pr.pressRow !== undefined) {
    const row = pr.pressRow;
    const cells = Array.from({ length: b.s.width }, (_, x) => ({ x, y: row })).filter((c) => inBounds(b.s, c.x, c.y));
    const e = strike(b.s.pieces.filter((p) => p.y === row), () => foe(PROC.pressDmg), PROCESS.press.name, cells);
    if (e) out.push(e);
    pr.pressRow = null;
  }
  if (pr.kind === 'furnace') {
    const cells = pr.cells ?? [];
    const on = b.s.pieces.filter((p) => cells.some((c) => c.x === p.x && c.y === p.y));
    if (on.length) { const e = strike(on, () => foe(PROC.furnaceDmg), PROCESS.furnace.name, cells.filter((c) => on.some((p) => p.x === c.x && p.y === c.y)), 'burst'); if (e) out.push(e); }
  }
  if (pr.kind === 'crack') { const e = stepCracks(b); if (e) out.push(e); }
  const slide = (p: Piece, to: Pos) => {
    out.push({ type: 'move', order: 0, pieceId: p.id, from: { x: p.x, y: p.y }, to: { ...to } });
    p.x = to.x;
    p.y = to.y;
  };
  if (pr.kind === 'conveyor' && pr.row !== undefined && pr.dir) {
    const d = pr.dir;
    // 흐르는 쪽 맨 앞 기물부터 — 줄 전체가 한 칸씩
    for (const p of b.s.pieces.filter((q) => q.y === pr.row && !q.giant && q.hp > 0).sort((x, y) => (y.x - x.x) * d)) {
      const to = { x: p.x + d, y: p.y };
      if (inBounds(b.s, to.x, to.y) && !at(b.s, to)) slide(p, to);
    }
  }
  if (pr.kind === 'magnet' && pr.col !== undefined) {
    const col = pr.col;
    for (const p of b.s.pieces.filter((q) => (q.type === 'R' || q.type === 'K') && !q.giant && q.x !== col && q.hp > 0).sort((x, y) => Math.abs(x.x - col) - Math.abs(y.x - col) || x.id - y.id)) {
      const to = { x: p.x + Math.sign(col - p.x), y: p.y };
      if (inBounds(b.s, to.x, to.y) && !at(b.s, to)) slide(p, to);
    }
  }
  return out;
};

/** 화면 위험 칸: 프레스 예고 줄 · 용광로 칸 · 다음에 꺼질 금 간 칸 */
export const processDanger = (b: Holder): Pos[] => {
  const pr = b.proc;
  if (!pr) return [];
  if (pr.kind === 'press' && pr.pressRow !== null && pr.pressRow !== undefined) return Array.from({ length: b.s.width }, (_, x) => ({ x, y: pr.pressRow! })).filter((c) => inBounds(b.s, c.x, c.y));
  if (pr.kind === 'furnace') return pr.cells ?? [];
  if (pr.kind === 'crack') return (pr.cells ?? []).filter((c) => (pr.cracks?.[key(c)] ?? 0) >= PROC.crackSteps - 1);
  return [];
};

/** 칸 표시 (판 그리기): 칸 · 빌린 판 도트 · 좌우 뒤집기 · 테 색 */
export const processTiles = (b: Holder): { pos: Pos; icon: string; flipX?: boolean; frame: number }[] => {
  const pr = b.proc;
  if (!pr) return [];
  const s = b.s;
  if (pr.kind === 'conveyor' && pr.row !== undefined) return Array.from({ length: s.width }, (_, x) => ({ pos: { x, y: pr.row! }, icon: 'variant-conveyor', flipX: pr.dir === -1, frame: 0xc89b3c })).filter((t) => inBounds(s, t.pos.x, t.pos.y));
  if (pr.kind === 'magnet' && pr.col !== undefined) return Array.from({ length: s.height }, (_, y) => ({ pos: { x: pr.col!, y }, icon: 'chip-magnet', frame: 0xb91c1c })).filter((t) => inBounds(s, t.pos.x, t.pos.y));
  if (pr.kind === 'furnace') return (pr.cells ?? []).map((pos) => ({ pos, icon: 'variant-radiator', frame: 0xe8783c }));
  if (pr.kind === 'crack') return (pr.cells ?? []).map((pos) => ({ pos, icon: (pr.cracks?.[key(pos)] ?? 0) > 0 ? 'crack' : '', frame: 0x8a8070 }));
  if (pr.kind === 'press' && pr.pressRow !== null && pr.pressRow !== undefined) return Array.from({ length: s.width }, (_, x) => ({ pos: { x, y: pr.pressRow! }, icon: 'variant-hammer', frame: 0xc89b3c }));
  return [];
};
