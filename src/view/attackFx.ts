import type Phaser from 'phaser';
import type { PieceType, Side } from '../engine/types';
import { FX_CHOICE, FX_MS } from '../data/fx';
import { PixelPen, easeOut, span } from './pixel';

/**
 * 기물별 공격 이펙트 (GDD 12장 §12.3, D-033·D-035).
 * 그리는 부분(buildAttackFx)은 렌더러와 무관하다 — 게임(Phaser)과 FX 랩 아티팩트(캔버스)가 같은 코드를 쓴다.
 *
 * 폰 = 앞으로 칼 휘두르기 · 나이트 = 11시 방향부터 시계 방향으로 L자 8칸에 번개
 * 비숍 = 응축 → 사거리 전체에 한 번에 굵은 광선 → 사그라듦 · 룩 = 쿵 + 십자로 한 칸씩 폭발
 * 퀸 = A 8방향 섬광 / B 십자 연쇄 + 대각 섬광 · 킹 = A 사각 충격파 / B 종소리 파동
 */

interface Palette {
  core: number;
  glow: number;
  edge: number;
}
export const PAL: Record<Side, Palette> = {
  // 아군: 흰 백자 + 황동 스파크 · 적: 붉은 과열광 (docs/world.md §4)
  0: { core: 0xf4f1ea, glow: 0xc89b3c, edge: 0xfacc15 },
  1: { core: 0xff8a8a, glow: 0xe5262f, edge: 0x7a1218 },
};

export interface FxTile {
  key: string;
  x: number;
  y: number;
}

export interface FxRequest {
  kinds: PieceType[];
  side: Side;
  /** 공격자 칸 중심 (월드 px) */
  origin: { x: number; y: number };
  tiles: FxTile[];
  tile: number;
  /** 퀸·킹 안 (없으면 data/fx.ts의 고른 안) */
  variant?: Partial<typeof FX_CHOICE>;
}

/** 그릴 준비가 된 이펙트: 전체 길이, 칸별 타격 시점(ms, 1배속), 시점 ms의 한 장면을 그리는 함수 */
export interface FxBuilt {
  duration: number;
  impact: Map<string, number>;
  draw: (pen: PixelPen, ms: number) => void;
}

interface Claimed {
  t: FxTile;
  dx: number;
  dy: number;
  dist: number;
}

/** 나이트 번개 순서: 화면 기준 11시 방향부터 시계 방향 */
const KNIGHT_CLOCK: [number, number][] = [[-1, -2], [1, -2], [2, -1], [2, 1], [1, 2], [-1, 2], [-2, 1], [-2, -1]];

/** 이펙트를 만든다 (그리지는 않는다) */
export const buildAttackFx = (req: FxRequest): FxBuilt => {
  const t = req.tile;
  const o = req.origin;
  const pal = PAL[req.side];
  const choice = { ...FX_CHOICE, ...req.variant };
  const fwd = req.side === 0 ? -1 : 1; // 화면 좌표에서 전방
  const rel: Claimed[] = req.tiles.map((tt) => {
    const dx = Math.round((tt.x - o.x) / t);
    const dy = Math.round((tt.y - o.y) / t);
    return { t: tt, dx, dy, dist: Math.max(Math.abs(dx), Math.abs(dy)) };
  });
  const claimed = new Set<string>();
  const impact = new Map<string, number>();
  const draws: ((pen: PixelPen, ms: number) => void)[] = [];
  let duration = 0;
  const hit = (c: Claimed, ms: number) => {
    claimed.add(c.t.key);
    impact.set(c.t.key, Math.min(impact.get(c.t.key) ?? Infinity, ms));
  };
  const diag = (c: Claimed) => c.dist > 0 && Math.abs(c.dx) === Math.abs(c.dy);
  const orth = (c: Claimed) => c.dist > 0 && (c.dx === 0) !== (c.dy === 0);
  const geo: Record<PieceType, (c: Claimed) => boolean> = {
    P: (c) => c.dy === fwd && Math.abs(c.dx) <= 1,
    N: (c) => (Math.abs(c.dx) === 1 && Math.abs(c.dy) === 2) || (Math.abs(c.dx) === 2 && Math.abs(c.dy) === 1),
    B: diag,
    R: orth,
    Q: (c) => diag(c) || orth(c),
    K: (c) => c.dist === 1,
  };

  /** 광선 섬광 (비숍·퀸): 응축 후 모든 광선이 한 번에 */
  const flash = (cs: Claimed[], M: { charge: number; fade: number }, queen: boolean) => {
    cs.forEach((c) => hit(c, M.charge + 10));
    const rays = raysOf(cs);
    draws.push((pen, ms) => beamFlash(pen, o, t, rays, ms, M, pal, queen));
    duration = Math.max(duration, M.charge + M.fade);
  };
  /** 십자 연쇄 폭발 (룩·퀸 B) */
  const chain = (cs: Claimed[]) => {
    const M = FX_MS.rook;
    cs.forEach((c) => hit(c, M.first + M.step * (c.dist - 1) + 40));
    const last = Math.max(1, ...cs.map((c) => c.dist));
    draws.push((pen, ms) => slamChain(pen, o, t, cs, ms, pal));
    duration = Math.max(duration, M.first + M.step * (last - 1) + M.burst);
  };

  for (const kind of new Set(req.kinds)) {
    const mine = rel.filter(geo[kind]);
    if (kind === 'P') {
      const M = FX_MS.pawn;
      mine.forEach((c) => hit(c, M.impact));
      draws.push((pen, ms) => slash(pen, o, t, fwd, span(ms, 0, M.total), pal));
      duration = Math.max(duration, M.total);
    } else if (kind === 'N') {
      const M = FX_MS.knight;
      const order = (c: Claimed) => KNIGHT_CLOCK.findIndex(([x, y]) => x === c.dx && y === c.dy);
      const bolts = mine.map((c) => ({ c, at: 40 + order(c) * M.gap, seed: order(c) + 1 }));
      bolts.forEach((b) => hit(b.c, b.at + 20));
      draws.push((pen, ms) => {
        // 피스톤이 방전을 모으는 짧은 불꽃
        const ch = span(ms, 0, 60);
        if (ch < 1) pen.ring(o.x, o.y, t * (0.45 - 0.3 * ch), pal.edge, 1 - ch);
        for (const b of bolts) bolt(pen, b.c.t.x, b.c.t.y, t, span(ms, b.at, b.at + M.strike), b.seed, pal);
      });
      duration = Math.max(duration, 40 + 7 * M.gap + M.strike);
    } else if (kind === 'B') {
      flash(mine, FX_MS.bishop, false);
    } else if (kind === 'R') {
      chain(mine);
    } else if (kind === 'Q') {
      if (choice.Q === 'B') {
        chain(mine.filter(orth));
        flash(mine.filter(diag), FX_MS.queen, true);
      } else flash(mine, FX_MS.queen, true);
    } else if (kind === 'K') {
      const M = FX_MS.king;
      mine.forEach((c) => hit(c, M.impact));
      draws.push(choice.K === 'B' ? (pen, ms) => bells(pen, o, t, mine, ms, pal) : (pen, ms) => pound(pen, o, t, span(ms, 0, M.total), pal));
      duration = Math.max(duration, M.total);
    }
  }
  // 어느 행마에도 속하지 않는 칸 (스플래시·연쇄 등): 주 타격 직후 작은 폭발
  const rest = rel.filter((c) => !claimed.has(c.t.key));
  if (rest.length) {
    const at = Math.max(60, ...[...impact.values()]) + 30;
    rest.forEach((c) => impact.set(c.t.key, at + 40));
    draws.push((pen, ms) => rest.forEach((c) => burst(pen, c.t.x, c.t.y, t, span(ms, at, at + FX_MS.splash.burst), pal)));
    duration = Math.max(duration, at + FX_MS.splash.burst);
  }
  return { duration, impact, draw: (pen, ms) => draws.forEach((d) => d(pen, ms)) };
};

/** 게임에서 재생 (Phaser). speed: 시간 배율 (동작 줄이기 = 약 3배 빠르게) */
export const playAttackFx = (scene: Phaser.Scene, req: FxRequest, speed: number): { duration: number; impact: Map<string, number> } => {
  const fx = buildAttackFx(req);
  const g = scene.add.graphics().setDepth(6.5);
  const pen = new PixelPen(g, req.tile / 16);
  scene.tweens.addCounter({
    from: 0,
    to: fx.duration,
    duration: fx.duration / speed,
    onUpdate: (tw) => {
      g.clear();
      fx.draw(pen, tw.getValue() ?? 0);
    },
    onComplete: () => g.destroy(),
  });
  return { duration: fx.duration / speed, impact: new Map([...fx.impact].map(([k, v]) => [k, v / speed])) };
};

// ---------------- 기물별 그림 ----------------

/** 폰: 전방 대각선 두 칸을 가르는 초승달 칼날 */
const slash = (pen: PixelPen, o: { x: number; y: number }, t: number, fwd: number, p: number, pal: Palette) => {
  if (p <= 0 || p >= 1) return;
  const base = fwd < 0 ? -Math.PI / 2 : Math.PI / 2;
  const a0 = base - Math.PI * 0.42;
  const sweep = Math.PI * 0.84;
  const head = easeOut(span(p, 0, 0.65)) * sweep;
  const fade = 1 - span(p, 0.6, 1);
  const r = t * 1.15;
  const n = 26;
  for (let i = 0; i <= n; i++) {
    const f = i / n; // 0 = 꼬리, 1 = 칼끝
    const a = a0 + head * f;
    const tail = Math.max(0, f - 0.15);
    const thick = 1 + Math.round(tail * 4);
    const col = f > 0.8 ? pal.core : f > 0.4 ? pal.edge : pal.glow;
    for (let k = 0; k < thick; k++) {
      const rr = r - k * pen.dot * 1.1;
      pen.px(o.x + Math.cos(a) * rr, o.y + Math.sin(a) * rr, col, fade * (0.35 + 0.65 * f));
    }
  }
};

/** 결정적인 지그재그 (같은 장면은 항상 같게 보인다) */
const jag = (seed: number, i: number) => {
  const v = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
  return (v - Math.floor(v)) * 2 - 1;
};

/** 나이트: 하늘에서 대상 칸으로 내리꽂히는 번개 한 줄기 */
const bolt = (pen: PixelPen, x: number, y: number, t: number, q: number, seed: number, pal: Palette) => {
  if (q <= 0 || q >= 1) return;
  const top = y - t * 2.2;
  const segs = 6;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= segs; i++) {
    const f = i / segs;
    const wob = i === 0 || i === segs ? 0 : jag(seed, i) * t * 0.22;
    pts.push({ x: x + wob, y: top + (y - top) * f });
  }
  // 번개는 한 번에 떨어진다: 0~0.15 내리꽂힘, 0.15~0.5 깜빡임, 이후 잔광
  const reach = Math.min(1, q / 0.15);
  const flick = q < 0.5 ? (Math.floor(q * 20) % 2 ? 0.55 : 1) : 1 - span(q, 0.5, 1);
  const shown = Math.ceil(segs * reach);
  for (let i = 0; i < shown; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    pen.line(a.x, a.y, b.x, b.y, pal.glow, 0.8 * flick, 3);
    pen.line(a.x, a.y, b.x, b.y, pal.core, flick, 1);
  }
  if (reach >= 1) {
    const s = span(q, 0.15, 0.7);
    if (s < 1) star(pen, x, y, t, s, pal);
    if (q < 0.35) pen.disc(x, y, t * 0.16, pal.core, 1 - q / 0.35);
  }
};

interface Ray {
  dx: number;
  dy: number;
  len: number;
}
const raysOf = (cs: Claimed[]): Ray[] => {
  const m = new Map<string, Ray>();
  for (const c of cs) {
    const k = `${Math.sign(c.dx)},${Math.sign(c.dy)}`;
    const r = m.get(k);
    if (!r || r.len < c.dist) m.set(k, { dx: Math.sign(c.dx), dy: Math.sign(c.dy), len: c.dist });
  }
  return [...m.values()];
};

/** 비숍·퀸: 빛을 몸 중심에 응축 → 사거리 전체에 한 번에 굵게 → 가늘어지며 사그라든다 (빛의 속도) */
const beamFlash = (
  pen: PixelPen,
  o: { x: number; y: number },
  t: number,
  rays: Ray[],
  ms: number,
  M: { charge: number; fade: number },
  pal: Palette,
  queen: boolean,
) => {
  const ch = span(ms, 0, M.charge);
  if (ch < 1) {
    const n = queen ? 12 : 8;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + ch * 3;
      const r = t * 0.9 * (1 - easeOut(ch));
      pen.px(o.x + Math.cos(a) * r, o.y + Math.sin(a) * r, i % 2 ? pal.edge : pal.core, 0.5 + 0.5 * ch);
    }
    pen.disc(o.x, o.y, pen.dot * (1 + 2.5 * ch), pal.glow, 0.85);
    pen.disc(o.x, o.y, pen.dot * (0.5 + 1.5 * ch), pal.core, 1);
    if (queen) {
      // 퀸: 응축하는 동안 톱니 고리가 돈다
      const teeth = 10;
      for (let i = 0; i < teeth; i++) {
        const a = (i / teeth) * Math.PI * 2 - ch * 4;
        pen.px(o.x + Math.cos(a) * t * 0.45, o.y + Math.sin(a) * t * 0.45, pal.edge, 0.9, 2);
      }
    }
    return;
  }
  const f = span(ms, M.charge, M.charge + M.fade);
  if (f >= 1) return;
  // 굵기: 첫 순간 가장 굵고(7도트) 빠르게 가늘어진다. 처음 몇 프레임은 흰 섬광
  const thick = Math.max(1, Math.round(7 * (1 - easeOut(f))));
  const alpha = 1 - f * f;
  const hot = f < 0.12;
  for (const r of rays) {
    const ex = o.x + r.dx * r.len * t;
    const ey = o.y + r.dy * r.len * t;
    pen.line(o.x, o.y, ex, ey, hot ? pal.core : pal.glow, alpha * 0.85, thick + 2);
    pen.line(o.x, o.y, ex, ey, pal.core, alpha, Math.max(1, thick - 2));
    pen.disc(ex, ey, pen.dot * (1 + thick * 0.6), pal.edge, alpha);
  }
  pen.disc(o.x, o.y, pen.dot * (2 + thick * 0.5), pal.core, alpha);
};

/** 룩: 쿵 — 발밑 충격, 그리고 십자 방향으로 한 칸씩 이어지는 폭발 */
const slamChain = (pen: PixelPen, o: { x: number; y: number }, t: number, cs: Claimed[], ms: number, pal: Palette) => {
  const M = FX_MS.rook;
  const sh = span(ms, 0, 90);
  if (sh > 0 && sh < 1) {
    pen.square(o.x, o.y + t * 0.1, t * (0.3 + 0.35 * sh), pal.glow, 1 - sh);
    for (let i = 0; i < 6; i++) {
      const a = Math.PI + (i / 5) * Math.PI; // 위로 튀는 먼지
      pen.px(o.x + Math.cos(a) * t * 0.5 * sh, o.y + t * 0.35 + Math.sin(a) * t * 0.3 * sh, pal.core, 1 - sh);
    }
  }
  for (const c of cs) {
    const at = M.first + M.step * (c.dist - 1);
    burst(pen, c.t.x, c.t.y, t, span(ms, at, at + M.burst), pal);
  }
};

/** 킹 A: 주변 8칸으로 퍼지는 사각 충격파 */
const pound = (pen: PixelPen, o: { x: number; y: number }, t: number, p: number, pal: Palette) => {
  if (p <= 0 || p >= 1) return;
  const r = t * (0.35 + 1.05 * easeOut(p));
  pen.square(o.x, o.y, r, pal.glow, 1 - p);
  pen.square(o.x, o.y, r - pen.dot * 2, pal.core, (1 - p) * 0.7);
};

/** 킹 B: 왕관이 번쩍 → 종소리 둥근 파동 두 겹 → 파동이 지나는 이웃 칸마다 땡 */
const bells = (pen: PixelPen, o: { x: number; y: number }, t: number, cs: Claimed[], ms: number, pal: Palette) => {
  const glint = span(ms, 0, 70);
  if (glint < 1) {
    const cy = o.y - t * 0.42;
    pen.line(o.x - t * 0.18 * glint, cy, o.x + t * 0.18 * glint, cy, pal.edge, 1 - glint);
    pen.line(o.x, cy - t * 0.18 * glint, o.x, cy + t * 0.18 * glint, pal.edge, 1 - glint);
  }
  for (const [start, col] of [[40, pal.core], [100, pal.glow]] as [number, number][]) {
    const p = span(ms, start, start + 140);
    if (p > 0 && p < 1) pen.ring(o.x, o.y, t * (0.3 + 1.3 * easeOut(p)), col, 1 - p);
  }
  for (const c of cs) {
    const p = span(ms, 90, 200);
    if (p > 0 && p < 1) star(pen, c.t.x, c.t.y, t * 0.7, p, pal);
  }
};

/** 칸 하나의 폭발: 흰 핵 → 고리 + 파편 */
const burst = (pen: PixelPen, x: number, y: number, t: number, q: number, pal: Palette) => {
  if (q <= 0 || q >= 1) return;
  if (q < 0.35) {
    const k = q / 0.35;
    pen.disc(x, y, t * (0.1 + 0.25 * k), pal.glow, 0.9);
    pen.disc(x, y, t * (0.06 + 0.14 * k), pal.core, 1);
    return;
  }
  const k = (q - 0.35) / 0.65;
  pen.ring(x, y, t * (0.35 + 0.15 * k), pal.edge, 1 - k);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.4;
    const r = t * (0.25 + 0.4 * k);
    pen.px(x + Math.cos(a) * r, y + Math.sin(a) * r + t * 0.2 * k * k, i % 2 ? pal.core : pal.glow, 1 - k);
  }
};

/** 착탄 별: 8방향 짧은 빛살 */
const star = (pen: PixelPen, x: number, y: number, t: number, q: number, pal: Palette) => {
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const r0 = t * 0.1 + t * 0.2 * q;
    const r1 = r0 + t * (i % 2 ? 0.1 : 0.2) * (1 - q);
    pen.line(x + Math.cos(a) * r0, y + Math.sin(a) * r0, x + Math.cos(a) * r1, y + Math.sin(a) * r1, i % 2 ? pal.glow : pal.core, 1 - q);
  }
};

/** 피격 스파크 한 장면 (q = 0~1, 160ms) */
export const drawHitSpark = (pen: PixelPen, x: number, y: number, t: number, side: Side, q: number): void => star(pen, x, y, t, q, PAL[side]);

/** 처치 파편 한 장면 (q = 0~1, 380ms): 기물이 톱니·스프링 파편으로 부서져 튄다 (docs/world.md §4) */
export const drawShatter = (pen: PixelPen, x: number, y: number, t: number, pieceSide: Side, q: number): void => {
  const body = pieceSide === 0 ? 0xf4f1ea : 0x2a2830;
  const rim = pieceSide === 0 ? 0xc89b3c : 0xe5262f;
  for (let i = 0; i < 12; i++) {
    const a = -Math.PI / 2 + ((i - 5.5) / 6) * 1.5 + (i % 3) * 0.13;
    const v = t * (0.9 + (i % 4) * 0.25);
    pen.px(x + Math.cos(a) * v * q, y + Math.sin(a) * v * q + t * 1.6 * q * q, i % 3 === 0 ? rim : body, 1 - q * q, i % 4 === 0 ? 2 : 1);
  }
  if (q < 0.3) pen.ring(x, y, t * (0.2 + q), rim, 1 - q / 0.3);
};

/** 피격 스파크 (게임) */
export const playHitSpark = (scene: Phaser.Scene, x: number, y: number, tile: number, side: Side, speed: number): void => {
  const g = scene.add.graphics().setDepth(7.5);
  const pen = new PixelPen(g, tile / 16);
  scene.tweens.addCounter({ from: 0, to: 1, duration: 160 / speed, onUpdate: (tw) => (g.clear(), drawHitSpark(pen, x, y, tile, side, tw.getValue() ?? 0)), onComplete: () => g.destroy() });
};

/** 처치 파편 (게임) */
export const playShatter = (scene: Phaser.Scene, x: number, y: number, tile: number, pieceSide: Side, speed: number): Promise<void> => {
  const g = scene.add.graphics().setDepth(7);
  const pen = new PixelPen(g, tile / 16);
  return new Promise((done) =>
    scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 380 / speed,
      onUpdate: (tw) => (g.clear(), drawShatter(pen, x, y, tile, pieceSide, tw.getValue() ?? 0)),
      onComplete: () => {
        g.destroy();
        done();
      },
    }),
  );
};
