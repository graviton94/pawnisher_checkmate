import { BOSS_BODY, GIANTS, type GiantType } from '../data/giants';
import { PIECE_STATS } from '../data/pieces';
import { chebyshev, damageOf, forward, inBounds, kingOf, makePiece, type BattleEvent, type BattleState, type Piece, type Pos } from '../engine';

/**
 * 거대 주물 (D-484, GDD 21장 §3) — 네 부위(적 기물 넷, HP 따로)가 2×2로 묶인다.
 * 부위는 혼자 움직이지 않는다(엔진 legalMoves가 빈 목록). 대신 내 차례가 시작될 때 묶음째 걷고 칠 쪽을 골라 예고하며,
 * 적 차례 끝에 예고한 칸을 내리찍는다. 칠 칸은 지금 판 기준(부위가 부서지면 그 몫이 빠지고, 기물로 줄을 막으면 거기서 멈춘다) —
 * 미리보기(dangerSquares · intentHits)와 실행이 같은 함수를 쓴다.
 */
export interface GiantHolder { s: BattleState; turn: number; giantAim?: Record<number, Pos>; /** 2×2 보스가 2단계(격노)인가 — 두 변을 친다 (D-513) */ phase2?: boolean; /** 내리찍기 사건 이름 (2×2 보스) */ bossName?: string }

const value = (p: Piece): number => (p.type === 'K' ? 300 : PIECE_STATS[p.type].value);
const ORTHO: Pos[] = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }];
const DIAG: Pos[] = [{ x: 1, y: -1 }, { x: -1, y: -1 }, { x: 1, y: 1 }, { x: -1, y: 1 }];
const ALL8: Pos[] = [...ORTHO, ...DIAG];
/** 2×2 보스 묶음인가 (D-513) */
const isBoss = (parts: Piece[]): boolean => !!parts[0]?.giant?.boss;

/** 살아 있는 거대 주물 묶음 (묶음 id → 부위들) */
export const giantGroups = (s: BattleState): Map<number, Piece[]> => {
  const out = new Map<number, Piece[]>();
  for (const p of s.pieces) if (p.giant) out.set(p.giant.id, [...(out.get(p.giant.id) ?? []), p]);
  return out;
};
/** 묶음의 왼아래 칸 (부서진 부위가 있어도 남은 부위로 계산) */
const anchorOf = (parts: Piece[]): Pos => ({ x: parts[0].x - parts[0].giant!.dx, y: parts[0].y - parts[0].giant!.dy });

/**
 * 대국 시작: 거대 주물을 적 진영 앞줄 쪽 2×2에 세운다. 그 칸에 서 있던 적은 가까운 빈 칸으로 비킨다.
 * hp · atk는 바탕 기물 × GIANTS 배율 (막 · 깊이 배율은 newSliceBattle이 다른 적과 같이 곱한다).
 */
export const placeGiants = (s: BattleState, types: GiantType[], reserved: number[] = []): void => {
  const w = s.width, h = s.height;
  for (const t of types) {
    const blockAt = (a: Pos): Pos[] => [{ x: a.x, y: a.y }, { x: a.x + 1, y: a.y }, { x: a.x, y: a.y + 1 }, { x: a.x + 1, y: a.y + 1 }];
    const ys = [h - 3, h - 4, h - 2].filter((y) => y >= Math.floor(h / 2) - 1 && y + 1 < h);
    const xs = Array.from({ length: w - 1 }, (_, x) => x).sort((a, b) => Math.abs(a - (w - 2) / 2) - Math.abs(b - (w - 2) / 2) || a - b);
    let anchor: Pos | null = null;
    for (const y of ys) {
      for (const x of xs) {
        const cells = blockAt({ x, y });
        if (cells.some((c) => s.pieces.some((p) => p.x === c.x && p.y === c.y && (p.type === 'K' || p.giant || p.side === 0)))) continue;
        anchor = { x, y };
        break;
      }
      if (anchor) break;
    }
    if (!anchor) continue;
    const cells = blockAt(anchor);
    const inBlock = (q: Pos) => cells.some((c) => c.x === q.x && c.y === q.y);
    // 비키기: 가까운 빈 칸(적 진영 쪽 먼저)
    for (const p of s.pieces.filter((q) => inBlock(q))) {
      const free: Pos[] = [];
      for (let y = h - 1; y >= 0; y--) for (let x = 0; x < w; x++) if (!inBlock({ x, y }) && !s.pieces.some((q) => q.x === x && q.y === y)) free.push({ x, y });
      const to = free.sort((a, b) => chebyshev(a, p) - chebyshev(b, p) || b.y - a.y || a.x - b.x)[0];
      if (to) Object.assign(p, { x: to.x, y: to.y });
      else s.pieces = s.pieces.filter((q) => q !== p);
    }
    const gid = Math.max(0, ...s.pieces.map((p) => p.id), ...reserved) + 1;
    cells.forEach((c, i) => {
      const p = makePiece(gid + i, t, 1, c.x, c.y);
      p.maxHp = p.hp = Math.max(1, Math.round(p.maxHp * GIANTS[t].hp));
      p.atk = Math.max(1, Math.round(p.atk * GIANTS[t].atk));
      p.moved = true;
      p.giant = { id: gid, dx: (c.x - anchor!.x) as 0 | 1, dy: (c.y - anchor!.y) as 0 | 1 };
      s.pieces.push(p);
    });
  }
};

/** 칸들 위의 기물(keep 제외)을 가까운 빈 칸으로 비킨다 — 적 진영 쪽(위) 먼저. 빈 칸이 없으면 판에서 뺀다 */
const clearCells = (s: BattleState, cells: Pos[], keep: (p: Piece) => boolean): void => {
  const inBlock = (q: Pos) => cells.some((c) => c.x === q.x && c.y === q.y);
  for (const p of s.pieces.filter((q) => inBlock(q) && !keep(q))) {
    const free: Pos[] = [];
    for (let y = s.height - 1; y >= 0; y--) for (let x = 0; x < s.width; x++) if (inBounds(s, x, y) && !inBlock({ x, y }) && !s.pieces.some((q) => q.x === x && q.y === y)) free.push({ x, y });
    const to = free.sort((a, b) => chebyshev(a, p) - chebyshev(b, p) || b.y - a.y || a.x - b.x)[0];
    if (to) Object.assign(p, { x: to.x, y: to.y });
    else s.pieces = s.pieces.filter((q) => q !== p);
  }
};

/** 2×2 칸 (왼아래 a부터: 왼아래 · 오른아래 · 왼위 · 오른위) */
const blockOf = (a: Pos): Pos[] => [{ x: a.x, y: a.y }, { x: a.x + 1, y: a.y }, { x: a.x, y: a.y + 1 }, { x: a.x + 1, y: a.y + 1 }];

/**
 * 2×2 특별 보스 세우기 (D-513, GDD 21장 §3-B): 적 킹(반장 · 도금왕)을 적 진영 **맨 뒤 두 줄 가운데**(6폭 x 2~3 · 8폭 x 3~4)로 옮기고
 * 나머지 세 칸에 몸 칸(HP 없음 — 피해는 본체로)을 둔다. 그 칸에 서 있던 호위는 가까운 빈 칸으로 비킨다. 본체 = 왼아래 칸.
 * 본체는 기물 목록에서 몸 칸보다 앞에 둔다(킹을 찾는 옛 코드가 늘 본체를 먼저 만나게).
 */
export const placeBoss = (s: BattleState, reserved: number[] = []): Piece | null => {
  const k = kingOf(s, 1);
  if (!k || s.width < 2 || s.height < 2) return null;
  const a = { x: Math.floor((s.width - 2) / 2), y: s.height - 2 };
  const cells = blockOf(a);
  clearCells(s, cells, (p) => p === k);
  Object.assign(k, { x: a.x, y: a.y, moved: true });
  const gid = Math.max(0, ...s.pieces.map((p) => p.id), ...reserved) + 1;
  k.giant = { id: gid, dx: 0, dy: 0, boss: true };
  cells.slice(1).forEach((c, i) => {
    const p = makePiece(gid + 1 + i, 'K', 1, c.x, c.y);
    p.maxHp = p.hp = 1;
    p.atk = 0;
    p.moved = true;
    p.body = k.id;
    p.giant = { id: gid, dx: (c.x - a.x) as 0 | 1, dy: (c.y - a.y) as 0 | 1, boss: true };
    s.pieces.push(p);
  });
  return k;
};

/** 2×2 보스 묶음의 모든 칸 (몸 칸 + 본체) — 없으면 빈 목록 */
export const bossCells = (s: BattleState): Pos[] => s.pieces.filter((p) => p.giant?.boss).map((p) => ({ x: p.x, y: p.y }));

/**
 * 2×2 보스 둘레 열두 칸 (D-513: 「반장 곁」 = 몸 둘레) — 앞(우리 쪽) 줄 가운데부터 · 옆 · 뒤 순. 판 안 빈 칸만.
 * 2×2가 아니면 null (부르는 쪽이 옛 1칸 둘레를 쓴다).
 */
export const bossRing = (s: BattleState): Pos[] | null => {
  const core = s.pieces.find((p) => p.giant?.boss && p.body === undefined);
  if (!core) return null;
  const a = { x: core.x - core.giant!.dx, y: core.y - core.giant!.dy };
  const ring: Pos[] = [
    { x: a.x, y: a.y - 1 }, { x: a.x + 1, y: a.y - 1 }, { x: a.x - 1, y: a.y - 1 }, { x: a.x + 2, y: a.y - 1 },
    { x: a.x - 1, y: a.y }, { x: a.x + 2, y: a.y }, { x: a.x - 1, y: a.y + 1 }, { x: a.x + 2, y: a.y + 1 },
    { x: a.x, y: a.y + 2 }, { x: a.x + 1, y: a.y + 2 }, { x: a.x - 1, y: a.y + 2 }, { x: a.x + 2, y: a.y + 2 },
  ];
  return ring.filter((q) => inBounds(s, q.x, q.y) && !s.pieces.some((p) => p.x === q.x && p.y === q.y));
};

/**
 * 2×2 보스가 칠 칸 (D-513): dir가 가로세로면 그 한 변(붙은 두 칸 + 양 모서리 대각 = 네 칸), 대각이면 꺾인 두 변(ㄱ자 일곱 칸).
 * 줄이 기물에 막히지 않는다 — 몸이 그 둘레를 내리찍는다. 판 밖 · 꺼진 칸은 뺀다.
 */
export const bossSlamCells = (s: BattleState, a: Pos, dir: Pos): Pos[] => {
  const side = (d: Pos): Pos[] => {
    if (d.y === 1) return [-1, 0, 1, 2].map((i) => ({ x: a.x + i, y: a.y + 2 }));
    if (d.y === -1) return [-1, 0, 1, 2].map((i) => ({ x: a.x + i, y: a.y - 1 }));
    if (d.x === 1) return [-1, 0, 1, 2].map((i) => ({ x: a.x + 2, y: a.y + i }));
    return [-1, 0, 1, 2].map((i) => ({ x: a.x - 1, y: a.y + i }));
  };
  const all = dir.x && dir.y ? [...side({ x: dir.x, y: 0 }), ...side({ x: 0, y: dir.y })] : side(dir);
  const out = new Map<string, Pos>();
  for (const q of all) if (inBounds(s, q.x, q.y)) out.set(`${q.x},${q.y}`, q);
  return [...out.values()];
};

/**
 * 2×2 보스 겨누기 (D-513): 1단계 = 네 변 중 하나, 2단계(격노) = 꺾인 두 변 넷 중 하나. 내 기물 값이 가장 많이 걸리는 쪽(같으면 내 킹 쪽).
 * 2단계로 다시 설 때(bossRise)도 이것으로 바로 다시 겨눈다 — 화면 위험 칸 · 적의 수 · 실행이 같은 값.
 */
export const bossAim = (b: GiantHolder): void => {
  for (const [gid, parts] of giantGroups(b.s)) {
    if (!isBoss(parts)) continue;
    const a = anchorOf(parts);
    const king = kingOf(b.s, 0);
    const dirs = b.phase2 ? DIAG : ORTHO;
    const score = (d: Pos) => bossSlamCells(b.s, a, d).reduce((n, q) => {
      const o = b.s.pieces.find((r) => r.x === q.x && r.y === q.y && r.side === 0);
      return n + (o ? value(o) : 0);
    }, 0);
    const toward = (d: Pos) => (king ? -Math.max(Math.abs(a.x + 0.5 + d.x * 2 - king.x), Math.abs(a.y + 0.5 + d.y * 2 - king.y)) : 0);
    (b.giantAim ??= {})[gid] = [...dirs].sort((d1, d2) => score(d2) - score(d1) || toward(d2) - toward(d1))[0];
  }
};

/** 부위 하나가 이 방향으로 칠 칸 — 지금 판 기준. 제 몸(같은 묶음)에 막히면 없음, 다른 기물에 닿으면 그 칸까지 */
const partCells = (s: BattleState, p: Piece, dir: Pos): Pos[] => {
  if (p.type === 'P') {
    // 거대 폰: 앞쪽 부위 둘이 바로 앞 줄 네 칸을 둘씩 맡는다 (뒤 부위는 무게)
    const f = forward(p.side);
    const front = f < 0 ? p.giant!.dy === 0 : p.giant!.dy === 1;
    if (!front) return [];
    const xs = p.giant!.dx === 0 ? [p.x - 1, p.x] : [p.x, p.x + 1];
    return xs.map((x) => ({ x, y: p.y + f })).filter((q) => inBounds(s, q.x, q.y));
  }
  const out: Pos[] = [];
  for (let k = 1; ; k++) {
    const q = { x: p.x + dir.x * k, y: p.y + dir.y * k };
    if (!inBounds(s, q.x, q.y)) break;
    const o = s.pieces.find((r) => r.x === q.x && r.y === q.y);
    if (o?.giant && o.giant.id === p.giant!.id) break; // 제 몸에 막힌 쪽
    out.push(q);
    if (o) break;
  }
  return out;
};

/** 지금 예고된 내리찍기: 부위마다 칠 칸 */
export const giantStrikes = (b: GiantHolder): { part: Piece; cells: Pos[] }[] => {
  const out: { part: Piece; cells: Pos[] }[] = [];
  for (const [gid, parts] of giantGroups(b.s)) {
    const dir = b.giantAim?.[gid];
    if (!dir) continue;
    // 2×2 보스 (D-513): 몸 하나 — 본체가 한 번에 친다
    if (isBoss(parts)) {
      const core = parts.find((p) => p.body === undefined);
      const cells = bossSlamCells(b.s, anchorOf(parts), dir);
      if (core && cells.length) out.push({ part: core, cells });
      continue;
    }
    for (const p of parts) {
      const cells = partCells(b.s, p, dir);
      if (cells.length) out.push({ part: p, cells });
    }
  }
  return out;
};

/** 예고 칸 (화면 붉은 칸) */
export const giantDanger = (b: GiantHolder): Pos[] => giantStrikes(b).flatMap((g) => g.cells);

/**
 * 내 차례 시작: 묶음째 한 칸 걷고(stepEvery턴마다) 칠 쪽을 고른다 — 내 기물 값이 가장 많이 걸리는 쪽(같으면 내 킹 쪽).
 * 걷는 자리는 네 칸이 모두 비어 있거나 제 몸일 때만.
 */
export const giantTurn = (b: GiantHolder): BattleEvent[] => {
  const events: BattleEvent[] = [];
  const king = kingOf(b.s, 0);
  for (const [gid, parts] of giantGroups(b.s)) {
    // 2×2 보스 (D-513): 거대 퀸처럼 여덟 방향 한 칸(BOSS_BODY.stepEvery턴마다, 2턴부터) → 겨누기는 bossAim
    if (isBoss(parts)) {
      if (b.turn > 1 && (b.turn - 1) % BOSS_BODY.stepEvery === 0 && king) {
        const a = anchorOf(parts);
        const center = { x: a.x + 0.5, y: a.y + 0.5 };
        const dist = (c: Pos) => Math.max(Math.abs(c.x - king.x), Math.abs(c.y - king.y));
        const steps = ALL8.filter((d) => dist({ x: center.x + d.x, y: center.y + d.y }) < dist(center)).sort((d1, d2) => dist({ x: center.x + d1.x, y: center.y + d1.y }) - dist({ x: center.x + d2.x, y: center.y + d2.y }) || Math.abs(d2.y) - Math.abs(d1.y) || Math.abs(d1.x) - Math.abs(d2.x));
        for (const d of steps) {
          const ok = parts.every((p) => {
            const q = { x: p.x + d.x, y: p.y + d.y };
            const o = b.s.pieces.find((r) => r.x === q.x && r.y === q.y);
            return inBounds(b.s, q.x, q.y) && (!o || o.giant?.id === gid);
          });
          if (!ok) continue;
          for (const p of parts) {
            events.push({ type: 'move', order: 0, pieceId: p.id, from: { x: p.x, y: p.y }, to: { x: p.x + d.x, y: p.y + d.y } });
            p.x += d.x;
            p.y += d.y;
          }
          break;
        }
      }
      continue;
    }
    const t = parts[0].type as GiantType;
    const def = GIANTS[t];
    const a = anchorOf(parts);
    const center = { x: a.x + 0.5, y: a.y + 0.5 };
    const dist = (c: Pos) => (king ? Math.max(Math.abs(c.x - king.x), Math.abs(c.y - king.y)) : 0);
    if (b.turn > 1 && (b.turn - 1) % def.stepEvery === 0) {
      const f = forward(parts[0].side);
      const steps = t === 'P' ? [{ x: 0, y: f }] : (t === 'R' ? ORTHO : ALL8).filter((d) => dist({ x: center.x + d.x, y: center.y + d.y }) < dist(center)).sort((d1, d2) => dist({ x: center.x + d1.x, y: center.y + d1.y }) - dist({ x: center.x + d2.x, y: center.y + d2.y }) || Math.abs(d2.y) - Math.abs(d1.y));
      for (const d of steps) {
        const ok = parts.every((p) => {
          const q = { x: p.x + d.x, y: p.y + d.y };
          const o = b.s.pieces.find((r) => r.x === q.x && r.y === q.y);
          return inBounds(b.s, q.x, q.y) && (!o || o.giant?.id === gid);
        });
        if (!ok) continue;
        for (const p of parts) {
          events.push({ type: 'move', order: 0, pieceId: p.id, from: { x: p.x, y: p.y }, to: { x: p.x + d.x, y: p.y + d.y } });
          p.x += d.x;
          p.y += d.y;
        }
        break;
      }
    }
    const dirs = t === 'P' ? [{ x: 0, y: forward(parts[0].side) }] : t === 'R' ? ORTHO : ALL8;
    const score = (d: Pos) => parts.flatMap((p) => partCells(b.s, p, d)).reduce((n, q) => {
      const o = b.s.pieces.find((r) => r.x === q.x && r.y === q.y && r.side === 0);
      return n + (o ? value(o) : 0);
    }, 0);
    const a2 = anchorOf(parts);
    const toward = (d: Pos) => (king ? -dist({ x: a2.x + 0.5 + d.x * 2, y: a2.y + 0.5 + d.y * 2 }) : 0);
    const best = [...dirs].sort((d1, d2) => score(d2) - score(d1) || toward(d2) - toward(d1))[0];
    (b.giantAim ??= {})[gid] = best;
  }
  bossAim(b);
  for (const id of Object.keys(b.giantAim ?? {}).map(Number)) if (!giantGroups(b.s).has(id)) delete b.giantAim![id];
  return events;
};

/** 적 차례 끝: 예고한 칸을 내리찍는다 — 묶음마다 사건 하나. 쓰러진 기물 정리 · 생명 처리는 부르는 쪽(enemyPhase)이 한다 */
export const giantStrike = (b: GiantHolder): BattleEvent[] => {
  const out: BattleEvent[] = [];
  const by = new Map<number, { part: Piece; cells: Pos[] }[]>();
  for (const g of giantStrikes(b)) by.set(g.part.giant!.id, [...(by.get(g.part.giant!.id) ?? []), g]);
  for (const [, list] of by) {
    const hits = list.flatMap(({ part, cells }) => b.s.pieces.filter((p) => p.side === 0 && p.hp > 0 && cells.some((c) => c.x === p.x && c.y === p.y)).map((p) => {
      const dmg = damageOf(b.s, part, p);
      const absorbed = Math.min(p.shield, dmg);
      p.shield -= absorbed;
      p.hp = Math.max(0, p.hp - (dmg - absorbed));
      return { targetId: p.id, damage: dmg, shieldAbsorbed: absorbed, hpAfter: p.hp, killed: p.hp <= 0 };
    }));
    const p0 = list[0].part;
    const label = p0.giant?.boss ? BOSS_BODY.slam(b.bossName ?? '반장') : GIANTS[p0.type as GiantType].name;
    out.push({ type: 'blast', pos: anchorOf([p0]), label, hits, fx: 'slam', cells: list.flatMap((g) => g.cells) });
  }
  return out;
};

/** 이 기물이 거대 주물 부위면 그 이름 (길게 누르기) */
export const giantName = (p: Piece): string | null => (p.giant && !p.giant.boss ? GIANTS[p.type as GiantType]?.name ?? null : null);
