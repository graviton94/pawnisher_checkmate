import type Phaser from 'phaser';
import type { PieceType, Side } from '../engine';
import { PixelPen, easeOut, span } from './pixel';

/**
 * 기물별 공격 이펙트 (GDD 12장 §12.3, 사용자 피드백 "기물 중심에서 공격 범위로 뻗는 공격").
 * 지금은 코드로 찍는 도트 이펙트다. 발주한 이펙트 스프라이트(docs/asset-order.md 시트 E)가 오면 같은 박자에 갈아 끼운다.
 *
 * 폰 = 앞으로 칼 휘두르기 · 나이트 = 굴러 내려찍고 L자로 뻗는 발굽 · 비숍 = 빛을 응축했다 대각선으로 발사
 * 룩 = 쿵 내려찍고 십자로 한 칸씩 폭발 · 퀸 = 응축 후 8방향 발사 · 킹 = 주변 8칸 충격파
 */

/** 이펙트 박자 (ms, 1배속). 공격 1회 ≤ 0.6초 (CLAUDE.md UI/UX 원칙 6) */
export const FX_MS = {
  pawn: { total: 200, impact: 110 },
  knight: { total: 240, impact: 170 },
  bishop: { charge: 140, travel: 60, total: 300 },
  rook: { first: 40, step: 60, burst: 170 },
  queen: { charge: 100, travel: 60, total: 270 },
  king: { total: 200, impact: 90 },
  splash: { burst: 170 },
};

interface Palette {
  core: number;
  glow: number;
  edge: number;
}
const PAL: Record<Side, Palette> = {
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
  /** 시간 배율 (동작 줄이기 = 0.3) */
  speed: number;
}

/** 재생 계획: 전체 길이와 칸별 타격 시점 (ms) — 피격 연출을 이 시점에 맞춘다 */
export interface FxPlan {
  duration: number;
  impact: Map<string, number>;
}

type Draw = (pen: PixelPen, ms: number) => void;

interface Claimed {
  t: FxTile;
  dx: number;
  dy: number;
  dist: number;
}

const sgn = Math.sign;

/** 이펙트를 재생하고 계획을 돌려준다 (이펙트는 스스로 끝나고 지워진다) */
export const playAttackFx = (scene: Phaser.Scene, req: FxRequest): FxPlan => {
  const t = req.tile;
  const o = req.origin;
  const pal = PAL[req.side];
  const fwd = req.side === 0 ? -1 : 1; // 화면 좌표에서 전방
  const rel: Claimed[] = req.tiles.map((tt) => {
    const dx = Math.round((tt.x - o.x) / t);
    const dy = Math.round((tt.y - o.y) / t);
    return { t: tt, dx, dy, dist: Math.max(Math.abs(dx), Math.abs(dy)) };
  });
  const claimed = new Set<string>();
  const impact = new Map<string, number>();
  const draws: Draw[] = [];
  let duration = 0;
  const hit = (c: Claimed, ms: number) => {
    claimed.add(c.t.key);
    impact.set(c.t.key, Math.min(impact.get(c.t.key) ?? Infinity, ms));
  };

  const geo: Record<PieceType, (c: Claimed) => boolean> = {
    P: (c) => c.dy === fwd && Math.abs(c.dx) <= 1,
    N: (c) => (Math.abs(c.dx) === 1 && Math.abs(c.dy) === 2) || (Math.abs(c.dx) === 2 && Math.abs(c.dy) === 1),
    B: (c) => c.dist > 0 && Math.abs(c.dx) === Math.abs(c.dy),
    R: (c) => c.dist > 0 && (c.dx === 0) !== (c.dy === 0),
    Q: (c) => c.dist > 0 && (Math.abs(c.dx) === Math.abs(c.dy) || c.dx === 0 || c.dy === 0),
    K: (c) => c.dist === 1,
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
      mine.forEach((c) => hit(c, M.impact));
      draws.push((pen, ms) => hooves(pen, o, t, mine, ms, pal));
      duration = Math.max(duration, M.total);
    } else if (kind === 'B' || kind === 'Q') {
      const M = kind === 'B' ? FX_MS.bishop : FX_MS.queen;
      const rays = raysOf(mine);
      const far = Math.max(1, ...mine.map((c) => c.dist));
      mine.forEach((c) => hit(c, M.charge + (M.travel * c.dist) / far));
      draws.push((pen, ms) => beams(pen, o, t, rays, far, ms, M, pal, kind === 'Q'));
      duration = Math.max(duration, M.total);
    } else if (kind === 'R') {
      const M = FX_MS.rook;
      mine.forEach((c) => hit(c, M.first + M.step * (c.dist - 1) + 40));
      const last = Math.max(1, ...mine.map((c) => c.dist));
      draws.push((pen, ms) => slamChain(pen, o, t, mine, ms, pal));
      duration = Math.max(duration, M.first + M.step * (last - 1) + M.burst);
    } else if (kind === 'K') {
      const M = FX_MS.king;
      mine.forEach((c) => hit(c, M.impact));
      draws.push((pen, ms) => pound(pen, o, t, span(ms, 0, M.total), pal));
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

  const g = scene.add.graphics().setDepth(6.5);
  const pen = new PixelPen(g, t / 16);
  const total = duration / req.speed;
  scene.tweens.addCounter({
    from: 0,
    to: duration,
    duration: total,
    onUpdate: (tw) => {
      g.clear();
      const ms = tw.getValue() ?? 0;
      for (const d of draws) d(pen, ms);
    },
    onComplete: () => g.destroy(),
  });
  const scaled = new Map([...impact].map(([k, v]) => [k, v / req.speed]));
  return { duration: total, impact: scaled };
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

/** 나이트: 발밑 충격 고리 → L자 궤적을 따라 뻗는 발굽 → 착탄 별 */
const hooves = (pen: PixelPen, o: { x: number; y: number }, t: number, cs: Claimed[], ms: number, pal: Palette) => {
  const ringP = span(ms, 0, 70);
  if (ringP > 0 && ringP < 1) pen.ring(o.x, o.y + t * 0.25, t * (0.2 + 0.35 * ringP), pal.glow, 1 - ringP);
  const trailP = easeOut(span(ms, 50, 170));
  const fade = 1 - span(ms, 170, 240);
  for (const c of cs) {
    // 긴 다리 먼저, 짧은 다리 나중 (실제 L자 행마 모양)
    const longX = Math.abs(c.dx) === 2;
    const mid = { x: o.x + (longX ? c.dx * t : 0), y: o.y + (longX ? 0 : c.dy * t) };
    const end = { x: c.t.x, y: c.t.y };
    const seg1 = Math.min(1, trailP * 1.5);
    const seg2 = Math.max(0, trailP * 1.5 - 1) * 2;
    if (fade <= 0) continue;
    pen.line(o.x, o.y, o.x + (mid.x - o.x) * seg1, o.y + (mid.y - o.y) * seg1, pal.glow, 0.5 * fade, 1, true);
    if (seg2 > 0) pen.line(mid.x, mid.y, mid.x + (end.x - mid.x) * Math.min(1, seg2), mid.y + (end.y - mid.y) * Math.min(1, seg2), pal.edge, 0.9 * fade, 2);
    const b = span(ms, 160, 240);
    if (b > 0 && b < 1) star(pen, end.x, end.y, t, b, pal);
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
    const k = `${sgn(c.dx)},${sgn(c.dy)}`;
    const r = m.get(k);
    if (!r || r.len < c.dist) m.set(k, { dx: sgn(c.dx), dy: sgn(c.dy), len: c.dist });
  }
  return [...m.values()];
};

/** 비숍·퀸: 빛 알갱이가 몸 중심으로 모였다가 사선으로 발사, 잠깐 남아 깜빡이고 사라진다 */
const beams = (
  pen: PixelPen,
  o: { x: number; y: number },
  t: number,
  rays: Ray[],
  far: number,
  ms: number,
  M: { charge: number; travel: number; total: number },
  pal: Palette,
  queen: boolean,
) => {
  const ch = span(ms, 0, M.charge);
  if (ch < 1) {
    // 응축: 8알갱이가 원을 그리며 중심으로
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + ch * 2.4;
      const r = t * 0.85 * (1 - easeOut(ch));
      pen.px(o.x + Math.cos(a) * r, o.y + Math.sin(a) * r, i % 2 ? pal.edge : pal.core, 0.5 + 0.5 * ch);
    }
    pen.disc(o.x, o.y, pen.dot * (1 + 2.5 * ch), pal.glow, 0.85);
    pen.disc(o.x, o.y, pen.dot * (0.5 + 1.2 * ch), pal.core, 1);
    if (queen) pen.ring(o.x, o.y, t * 0.45 * (1 - ch) + pen.dot * 3, pal.glow, 0.6);
    return;
  }
  const go = easeOut(span(ms, M.charge, M.charge + M.travel));
  const hold = span(ms, M.charge + M.travel, M.total);
  const flicker = hold > 0 ? (Math.floor(ms / 30) % 2 ? 0.65 : 1) * (1 - hold) : 1;
  const thin = hold > 0.5 ? 1 : 0;
  for (const r of rays) {
    // 모든 광선이 같은 속도로 뻗고, 각자 첫 기물에서 멈춘다
    const len = Math.min(r.len, far * go) * t;
    const ex = o.x + r.dx * len;
    const ey = o.y + r.dy * len;
    pen.line(o.x, o.y, ex, ey, pal.glow, 0.75 * flicker, 3 - thin);
    pen.line(o.x, o.y, ex, ey, pal.core, flicker, 1);
    if (go >= 1) pen.disc(ex, ey, pen.dot * (2 - hold * 1.5), pal.edge, flicker);
  }
  pen.disc(o.x, o.y, pen.dot * 2 * (1 - hold), pal.core, 1 - hold);
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

/** 킹: 주변 8칸으로 퍼지는 사각 충격파 */
const pound = (pen: PixelPen, o: { x: number; y: number }, t: number, p: number, pal: Palette) => {
  if (p <= 0 || p >= 1) return;
  const r = t * (0.35 + 1.05 * easeOut(p));
  pen.square(o.x, o.y, r, pal.glow, 1 - p);
  pen.square(o.x, o.y, r - pen.dot * 2, pal.core, (1 - p) * 0.7);
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

/** 피격 스파크 (모든 기물 공통) */
export const playHitSpark = (scene: Phaser.Scene, x: number, y: number, tile: number, side: Side, speed: number): void => {
  const g = scene.add.graphics().setDepth(7.5);
  const pen = new PixelPen(g, tile / 16);
  const pal = PAL[side];
  scene.tweens.addCounter({ from: 0, to: 1, duration: 160 / speed, onUpdate: (tw) => (g.clear(), star(pen, x, y, tile, tw.getValue() ?? 0, pal)), onComplete: () => g.destroy() });
};

/** 처치: 기물이 톱니·스프링 파편으로 부서져 튄다 (docs/world.md §4 이펙트 문법) */
export const playShatter = (scene: Phaser.Scene, x: number, y: number, tile: number, pieceSide: Side, speed: number): Promise<void> => {
  const g = scene.add.graphics().setDepth(7);
  const pen = new PixelPen(g, tile / 16);
  const body = pieceSide === 0 ? 0xf4f1ea : 0x2a2830;
  const rim = pieceSide === 0 ? 0xc89b3c : 0xe5262f;
  // 결정적인 파편 궤적 (무작위 없음 — 같은 장면은 같게 보인다)
  const bits = Array.from({ length: 12 }, (_, i) => {
    const a = -Math.PI / 2 + ((i - 5.5) / 6) * 1.5 + (i % 3) * 0.13;
    const v = tile * (0.9 + (i % 4) * 0.25);
    return { vx: Math.cos(a) * v, vy: Math.sin(a) * v, size: i % 4 === 0 ? 2 : 1, gear: i % 3 === 0 };
  });
  return new Promise((done) =>
    scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 380 / speed,
      onUpdate: (tw) => {
        const q = tw.getValue() ?? 0;
        g.clear();
        for (const b of bits) {
          const px = x + b.vx * q;
          const py = y + b.vy * q + tile * 1.6 * q * q;
          pen.px(px, py, b.gear ? rim : body, 1 - q * q, b.size);
        }
        if (q < 0.3) pen.ring(x, y, tile * (0.2 + q), rim, 1 - q / 0.3);
      },
      onComplete: () => {
        g.destroy();
        done();
      },
    }),
  );
};
