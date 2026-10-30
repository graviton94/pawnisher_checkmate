import type Phaser from 'phaser';
import type { PieceType, Side } from '../engine/types';
import { FX_CHOICE, FX_MS, MOVE_MS, type KingFx, type QueenFx } from '../data/fx';
import { BOARD_DOTS, PixelPen, easeInCubic, easeInExpo, easeInOutExpo, easeOutBack, easeOutCubic, easeOutExpo, span } from './pixel';

/**
 * 기물별 이동·공격 연출 (GDD 12장 §12.3, D-033·D-035·D-036).
 * 렌더러와 무관하다 — 게임(Phaser)과 FX 랩 아티팩트(캔버스)가 같은 코드를 쓴다.
 * 한 공격 = 예비 동작(모으기, ease-in) → 터짐(ease-out expo) → 여운. 이펙트가 칸에 닿는 순간 그 칸이 맞는다.
 *
 * 폰 = 뒤로 당겼다 칼날 · 나이트 = 앞발 들고 방전 → 11시부터 시계 방향 번개(계단식 선도 → 귀환 섬광 → 깜빡임)
 * 비숍 = 떠올라 응축 → 사거리 전체 한 번에 굵게 → 사그라듦 · 룩 = 높이 들어 멈칫 → 내리꽂고 십자 연쇄
 * 퀸 = C 회전 광선 / D 톱날 부메랑 / A 8방향 섬광 · 킹 = B 종소리 파동 / A 사각 충격파
 */

interface Palette {
  core: number;
  glow: number;
  edge: number;
}
export const PAL: Record<Side, Palette> = {
  // 색 규칙 (D-047): 아군 = 흰 + 청록 + 증기빛, 적 = 붉은 과열광. 금색은 처치에만
  0: { core: 0xf4f1ea, glow: 0x38bdf8, edge: 0xbfefff },
  1: { core: 0xff8a8a, glow: 0xe5262f, edge: 0x7a1218 },
};

/** 기물 자세: 칸 단위 오프셋(dy < 0 = 위) + 가로·세로 배율 (받침 아래 중심 기준) */
export interface Pose {
  dx: number;
  dy: number;
  sx: number;
  sy: number;
}
const REST: Pose = { dx: 0, dy: 0, sx: 1, sy: 1 };

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
  variant?: { Q?: QueenFx; K?: KingFx };
}

/** 재생 준비가 된 공격: 전체 길이, 칸별 타격 시점(ms, 1배속), 공격자 자세, 한 장면 그리기 */
export interface FxBuilt {
  duration: number;
  impact: Map<string, number>;
  actor: (ms: number) => Pose;
  draw: (pen: PixelPen, ms: number) => void;
}

interface Claimed {
  t: FxTile;
  dx: number;
  dy: number;
  dist: number;
}

// ---------------- 이동 ----------------

/** 이동 전체 길이 (ms) */
export const MOVE_TOTAL = MOVE_MS.lift + MOVE_MS.travel + MOVE_MS.land;

/** 이동 중 자세: 진행도(0~1, 지수형)와 높이·출렁임. 착지 먼지는 landQ(0~1) */
export const moveMotion = (ms: number, jump: boolean): { p: number; pose: Pose; landQ: number } => {
  const M = MOVE_MS;
  const lift = 0.14;
  if (ms < M.lift) {
    const e = easeOutCubic(ms / M.lift);
    return { p: 0, pose: { dx: 0, dy: -lift * e, sx: 1 - 0.06 * e, sy: 1 + 0.08 * e }, landQ: -1 };
  }
  if (ms < M.lift + M.travel) {
    const q = (ms - M.lift) / M.travel;
    const arc = Math.sin(Math.PI * q) * (jump ? 0.5 : 0.1);
    return { p: easeInOutExpo(q), pose: { dx: 0, dy: -lift - arc, sx: 0.94, sy: 1.08 }, landQ: -1 };
  }
  const q = Math.min(1, (ms - M.lift - M.travel) / M.land);
  if (q < 0.25) return { p: 1, pose: { dx: 0, dy: -lift * (1 - easeInCubic(q / 0.25)), sx: 0.94, sy: 1.08 }, landQ: -1 };
  const a = 1 - easeOutBack((q - 0.25) / 0.75);
  return { p: 1, pose: { dx: 0, dy: 0, sx: 1 + 0.2 * a, sy: 1 - 0.2 * a }, landQ: (q - 0.25) / 0.75 };
};

/** 착지 증기 먼지 (q = 0~1) */
export const drawLandPuff = (pen: PixelPen, x: number, y: number, t: number, q: number): void => {
  if (q < 0 || q >= 1) return;
  const e = easeOutExpo(q);
  for (let i = 0; i < 6; i++) {
    const side = i % 2 ? 1 : -1;
    const k = 0.18 + 0.12 * Math.floor(i / 2);
    pen.disc(x + side * t * k * (0.6 + e), y + t * 0.32 - t * 0.08 * e, pen.dot * (1.6 - q), 0xf4f1ea, 0.7 * (1 - q));
  }
};

// ---------------- 공격 ----------------

/** 나이트 번개 순서: 화면 기준 11시 방향부터 시계 방향 */
const KNIGHT_CLOCK: [number, number][] = [[-1, -2], [1, -2], [2, -1], [2, 1], [1, 2], [-1, 2], [-2, 1], [-2, -1]];
/** 퀸의 8방향 (12시부터 시계 방향, 화면 각도) */
const DIRS: [number, number][] = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];

/** 공격을 만든다 (그리지는 않는다) */
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
  let actor: ((ms: number) => Pose) | null = null;
  let duration = 0;
  const hit = (c: Claimed, ms: number) => {
    claimed.add(c.t.key);
    impact.set(c.t.key, Math.min(impact.get(c.t.key) ?? Infinity, ms));
  };
  const setActor = (f: (ms: number) => Pose) => (actor ??= f);
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

  for (const kind of new Set(req.kinds)) {
    const mine = rel.filter(geo[kind]);
    if (kind === 'P') {
      const M = FX_MS.pawn;
      mine.forEach((c) => hit(c, M.wind + M.impact));
      setActor((ms) => pawnPose(ms, fwd));
      draws.push((pen, ms) => slash(pen, o, t, fwd, span(ms, M.wind, M.wind + M.slash), pal));
      duration = Math.max(duration, M.wind + M.slash + 120);
    } else if (kind === 'N') {
      const M = FX_MS.knight;
      const start = M.wind + M.slam;
      const order = (c: Claimed) => KNIGHT_CLOCK.findIndex(([x, y]) => x === c.dx && y === c.dy);
      const bolts = mine
        .slice()
        .sort((a, b) => order(a) - order(b))
        .map((c, i) => ({ c, at: start + i * M.gap, seed: order(c) + 1 }));
      bolts.forEach((b) => hit(b.c, b.at + M.leader + 4));
      setActor(knightPose);
      draws.push((pen, ms) => {
        // 앞발을 드는 동안 방전 불꽃이 몸으로 모인다 (느리게 → 빠르게)
        const g = span(ms, 0, M.wind);
        if (g > 0 && g < 1) {
          const e = easeInExpo(g);
          for (let i = 0; i < 10; i++) {
            const a = (i / 10) * Math.PI * 2 + e * 5;
            const r = t * (1.2 - 1.0 * e);
            pen.px(o.x + Math.cos(a) * r, o.y - t * 0.2 + Math.sin(a) * r, i % 2 ? pal.edge : pal.core, 0.4 + 0.6 * e);
          }
        }
        const s = span(ms, M.wind + M.slam, M.wind + M.slam + 120);
        if (s > 0 && s < 1) pen.ring(o.x, o.y + t * 0.3, t * (0.2 + 0.5 * easeOutExpo(s)), pal.edge, 1 - s);
        for (const b of bolts) bolt(pen, b.c.t.x, b.c.t.y, t, ms - b.at, b.seed, pal);
      });
      duration = Math.max(duration, start + Math.max(0, bolts.length - 1) * M.gap + M.leader + M.stroke + M.tail);
    } else if (kind === 'B') {
      const M = FX_MS.bishop;
      mine.forEach((c) => hit(c, M.charge + 8));
      setActor((ms) => floatPose(ms, M.charge, M.fade));
      const rays = raysOf(mine);
      draws.push((pen, ms) => beamFlash(pen, o, t, rays, ms, M, pal, false));
      duration = Math.max(duration, M.charge + M.fade);
    } else if (kind === 'R') {
      const M = FX_MS.rook;
      const start = M.lift + M.hang + M.slam;
      mine.forEach((c) => hit(c, start + M.first + M.step * (c.dist - 1) + 40));
      setActor(rookPose);
      const last = Math.max(1, ...mine.map((c) => c.dist));
      draws.push((pen, ms) => slamChain(pen, o, t, mine, ms - start, pal));
      duration = Math.max(duration, start + M.first + M.step * (last - 1) + M.burst);
    } else if (kind === 'Q') {
      const lens = DIRS.map(([x, y]) => Math.max(0, ...mine.filter((c) => Math.sign(c.dx) === x && Math.sign(c.dy) === y).map((c) => c.dist)));
      if (choice.Q === 'C') {
        const M = FX_MS.queenSweep;
        const sweep = queenSweep(lens, t);
        mine.forEach((c) => hit(c, M.wind + sweep.hitAt(dirIndex(c)) * M.sweep));
        setActor((ms) => floatPose(ms, M.wind, M.sweep + M.fade));
        draws.push((pen, ms) => sweep.draw(pen, o, ms, pal));
        duration = Math.max(duration, M.wind + M.sweep + M.fade);
      } else if (choice.Q === 'D') {
        const M = FX_MS.queenSaw;
        mine.forEach((c) => {
          const f = Math.min(0.97, c.dist / Math.max(1, lens[dirIndex(c)]));
          hit(c, M.wind + (-Math.log2(1 - f) / 10) * M.out);
        });
        setActor((ms) => floatPose(ms, M.wind, M.out + M.spin + M.back));
        draws.push((pen, ms) => saws(pen, o, t, lens, ms, pal));
        duration = Math.max(duration, M.wind + M.out + M.spin + M.back);
      } else {
        const M = FX_MS.queen;
        mine.forEach((c) => hit(c, M.charge + 8));
        setActor((ms) => floatPose(ms, M.charge, M.fade));
        const rays = raysOf(mine);
        draws.push((pen, ms) => beamFlash(pen, o, t, rays, ms, M, pal, true));
        duration = Math.max(duration, M.charge + M.fade);
      }
    } else if (kind === 'K') {
      const M = FX_MS.king;
      const start = M.wind + M.slam;
      mine.forEach((c) => hit(c, start + 70));
      setActor(kingPose);
      draws.push(choice.K === 'B' ? (pen, ms) => bells(pen, o, t, mine, ms, pal) : (pen, ms) => pound(pen, o, t, ms, pal));
      duration = Math.max(duration, start + M.wave);
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
  const act = actor ?? (() => REST);
  return { duration, impact, actor: act, draw: (pen, ms) => draws.forEach((d) => d(pen, ms)) };
};

const dirIndex = (c: Claimed) => DIRS.findIndex(([x, y]) => x === Math.sign(c.dx) && y === Math.sign(c.dy));

/** 게임에서 재생 (Phaser). speed: 시간 배율. onPose로 공격자 자세를 받는다 */
export const playAttackFx = (scene: Phaser.Scene, req: FxRequest, speed: number, onPose: (p: Pose) => void): { duration: number; impact: Map<string, number> } => {
  const fx = buildAttackFx(req);
  const g = scene.add.graphics().setDepth(6.5);
  const pen = new PixelPen(g, req.tile / BOARD_DOTS);
  scene.tweens.addCounter({
    from: 0,
    to: fx.duration,
    duration: fx.duration / speed,
    onUpdate: (tw) => {
      const ms = tw.getValue() ?? 0;
      g.clear();
      fx.draw(pen, ms);
      onPose(fx.actor(ms));
    },
    onComplete: () => {
      g.destroy();
      onPose(REST);
    },
  });
  return { duration: fx.duration / speed, impact: new Map([...fx.impact].map(([k, v]) => [k, v / speed])) };
};

// ---------------- 공격자 자세 ----------------

/** 착지 직후 출렁임: a = 1 → 0 (살짝 넘침) */
const squash = (q: number, k = 0.22): Pose => {
  const a = 1 - easeOutBack(Math.min(1, Math.max(0, q)));
  return { dx: 0, dy: 0, sx: 1 + k * a, sy: 1 - k * a };
};

/** 폰: 뒤로 당겨 웅크림 → 앞으로 찌르듯 → 제자리 */
const pawnPose = (ms: number, fwd: number): Pose => {
  const M = FX_MS.pawn;
  if (ms < M.wind) {
    const e = easeOutCubic(ms / M.wind);
    return { dx: 0, dy: -fwd * 0.12 * e, sx: 1 + 0.08 * e, sy: 1 - 0.1 * e };
  }
  const u = ms - M.wind;
  if (u < 90) {
    const e = easeOutExpo(u / 90);
    return { dx: 0, dy: -fwd * 0.12 + fwd * 0.26 * e, sx: 1 - 0.06 * e, sy: 1 + 0.1 * e };
  }
  const e = easeOutCubic(Math.min(1, (u - 90) / 200));
  return { dx: 0, dy: fwd * 0.14 * (1 - e), sx: 1, sy: 1 };
};

/** 나이트: 앞발 들기(늘어남) → 내리찍기(지수) → 출렁임 */
const knightPose = (ms: number): Pose => {
  const M = FX_MS.knight;
  if (ms < M.wind) {
    const e = easeOutCubic(ms / M.wind);
    const tremble = ms > M.wind * 0.6 ? (Math.floor(ms / 25) % 2 ? 0.015 : -0.015) : 0;
    return { dx: tremble, dy: -0.22 * e, sx: 1 - 0.08 * e, sy: 1 + 0.12 * e };
  }
  if (ms < M.wind + M.slam) {
    const e = easeInExpo((ms - M.wind) / M.slam);
    return { dx: 0, dy: -0.22 * (1 - e), sx: 0.92, sy: 1.12 };
  }
  return squash((ms - M.wind - M.slam) / 160);
};

/** 비숍·퀸: 응축하며 떠오르고 끝에서 떨림 → 터진 뒤 천천히 내려앉음 */
const floatPose = (ms: number, wind: number, after: number): Pose => {
  if (ms < wind) {
    const p = ms / wind;
    const tremble = p > 0.7 ? (Math.floor(ms / 28) % 2 ? 0.02 : -0.02) : 0;
    return { dx: tremble, dy: -0.12 * easeOutCubic(p), sx: 1, sy: 1 + 0.04 * easeInExpo(p) };
  }
  const q = Math.min(1, (ms - wind) / after);
  return { dx: 0, dy: -0.12 * (1 - easeOutCubic(q)), sx: 1, sy: 1 };
};

/** 룩: 높이 들어 올림 → 멈칫 → 지수형 내리꽂기 → 크게 출렁 */
const rookPose = (ms: number): Pose => {
  const M = FX_MS.rook;
  if (ms < M.lift) {
    const e = easeOutCubic(ms / M.lift);
    return { dx: 0, dy: -0.38 * e, sx: 1 - 0.08 * e, sy: 1 + 0.1 * e };
  }
  if (ms < M.lift + M.hang) return { dx: 0, dy: -0.38 - 0.02 * Math.sin(((ms - M.lift) / M.hang) * Math.PI), sx: 0.92, sy: 1.1 };
  if (ms < M.lift + M.hang + M.slam) {
    const e = easeInExpo((ms - M.lift - M.hang) / M.slam);
    return { dx: 0, dy: -0.38 * (1 - e), sx: 0.92, sy: 1.12 };
  }
  return squash((ms - M.lift - M.hang - M.slam) / 180, 0.28);
};

/** 킹: 홀을 치켜들 듯 늘어남 → 내려침 → 출렁임 */
const kingPose = (ms: number): Pose => {
  const M = FX_MS.king;
  if (ms < M.wind) {
    const e = easeOutCubic(ms / M.wind);
    return { dx: 0, dy: -0.16 * e, sx: 1 - 0.05 * e, sy: 1 + 0.1 * e };
  }
  if (ms < M.wind + M.slam) return { dx: 0, dy: -0.16 * (1 - easeInExpo((ms - M.wind) / M.slam)), sx: 0.95, sy: 1.1 };
  return squash((ms - M.wind - M.slam) / 160, 0.18);
};

// ---------------- 기물별 그림 ----------------

/** 폰: 전방 대각선 두 칸을 가르는 초승달 칼날 (칼끝이 지수형으로 빠르게 지나간다) */
const slash = (pen: PixelPen, o: { x: number; y: number }, t: number, fwd: number, p: number, pal: Palette) => {
  if (p <= 0 || p >= 1) return;
  const base = fwd < 0 ? -Math.PI / 2 : Math.PI / 2;
  const a0 = base - Math.PI * 0.45;
  const sweep = Math.PI * 0.9;
  const head = easeOutExpo(span(p, 0, 0.5)) * sweep;
  const fade = 1 - easeInCubic(span(p, 0.45, 1));
  const r = t * 1.15;
  const n = 30;
  for (let i = 0; i <= n; i++) {
    const f = i / n; // 0 = 꼬리, 1 = 칼끝
    const a = a0 + head * f;
    const thick = 1 + Math.round(Math.max(0, f - 0.15) * 5);
    const col = f > 0.8 ? pal.core : f > 0.4 ? pal.edge : pal.glow;
    for (let k = 0; k < thick; k++) {
      const rr = r - k * pen.dot * 1.1;
      pen.px(o.x + Math.cos(a) * rr, o.y + Math.sin(a) * rr, col, fade * (0.35 + 0.65 * f));
    }
  }
};

/** 결정적인 난수 (같은 장면은 항상 같게 보인다) */
const jag = (seed: number, i: number) => {
  const v = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
  return (v - Math.floor(v)) * 2 - 1;
};

/** 번개 경로: 굽은 본줄기 + 가지 2개 */
const boltPath = (x: number, y: number, t: number, seed: number) => {
  const segs = 10;
  const top = y - t * 3.2;
  const main: { x: number; y: number }[] = [];
  let wx = jag(seed, 99) * t * 0.3;
  for (let i = 0; i <= segs; i++) {
    if (i > 0 && i < segs) wx = Math.max(-t * 0.45, Math.min(t * 0.45, wx + jag(seed, i) * t * 0.2));
    main.push({ x: x + (i === segs ? 0 : wx * (1 - i / segs) + wx * 0.3), y: top + ((y - top) * i) / segs });
  }
  const branches = [3, 6].map((at, b) => {
    const dir = jag(seed, 50 + b) > 0 ? 1 : -1;
    const pts = [main[at]];
    for (let k = 1; k <= 3; k++) pts.push({ x: pts[k - 1].x + dir * t * (0.12 + 0.08 * Math.abs(jag(seed, 60 + k + b))), y: pts[k - 1].y + t * 0.22 });
    return { at, pts };
  });
  return { main, branches };
};

/**
 * 나이트 번개 한 줄기 (u = 이 번개가 시작한 뒤 ms).
 * 계단식 선도(어둡고 가늘게 툭툭 내려옴) → 귀환 섬광(본줄기 전체가 하얗게 번쩍) → 두 번 깜빡이고 꺼짐.
 */
const bolt = (pen: PixelPen, x: number, y: number, t: number, u: number, seed: number, pal: Palette) => {
  const M = FX_MS.knight;
  if (u < 0 || u > M.leader + M.stroke + M.tail) return;
  const { main, branches } = boltPath(x, y, t, seed);
  const segs = main.length - 1;
  const seg = (pts: { x: number; y: number }[], n: number, col: number, a: number, w: number) => {
    for (let i = 0; i < n; i++) pen.line(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y, col, a, w);
  };
  if (u < M.leader) {
    // 12ms마다 툭툭 — 가속하며 내려온다
    const step = Math.floor(u / 12) * 12;
    const n = Math.max(1, Math.ceil(segs * easeInCubic(Math.min(1, (step + 12) / M.leader))));
    seg(main, n, pal.glow, 0.6, 1);
    for (const b of branches) if (n > b.at) seg(b.pts, Math.min(3, n - b.at), pal.glow, 0.4, 1);
    return;
  }
  const v = u - M.leader;
  if (v < M.stroke) {
    // 귀환 섬광: 가장 굵고 하얗다 + 칸이 번쩍
    pen.disc(x, y, t * 0.5, pal.core, 0.35);
    seg(main, segs, pal.glow, 1, 5);
    seg(main, segs, pal.core, 1, 2);
    for (const b of branches) seg(b.pts, 3, pal.core, 0.9, 1);
    pen.disc(x, y, t * 0.2, pal.core, 1);
    return;
  }
  const w = (v - M.stroke) / M.tail;
  // 깜빡임: 꺼짐 → 켜짐(굵게) → 꺼짐 → 켜짐(가늘게) → 사라짐
  const on = w < 0.12 ? 0.12 : w < 0.3 ? 0.85 : w < 0.45 ? 0.1 : w < 0.6 ? 0.55 : 0.55 * (1 - span(w, 0.6, 1));
  const wide = w < 0.3 ? 3 : 1;
  seg(main, segs, pal.glow, on * 0.8, wide + 1);
  seg(main, segs, pal.core, on, 1);
  if (w < 0.7) star(pen, x, y, t, w / 0.7, pal);
  pen.ring(x, y + t * 0.25, t * (0.25 + 0.2 * easeOutExpo(w)), pal.edge, 0.6 * (1 - w));
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

/** 응축: 알갱이가 느리게 → 빠르게 빨려 들고 핵이 지수형으로 커진다 */
const charge = (pen: PixelPen, o: { x: number; y: number }, t: number, ch: number, pal: Palette, n: number) => {
  const e = easeInExpo(ch);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + e * 5;
    const r = t * 1.3 * (1 - e) + t * 0.1;
    pen.px(o.x + Math.cos(a) * r, o.y + Math.sin(a) * r, i % 2 ? pal.edge : pal.core, 0.4 + 0.6 * ch);
  }
  pen.disc(o.x, o.y, pen.dot * (1 + 3.5 * e), pal.glow, 0.85);
  pen.disc(o.x, o.y, pen.dot * (0.6 + 2 * e), pal.core, 1);
};

/** 비숍·퀸 A: 응축 → 사거리 전체에 한 번에 굵게 → 가늘어지며 사그라든다 (빛의 속도) */
const beamFlash = (pen: PixelPen, o: { x: number; y: number }, t: number, rays: Ray[], ms: number, M: { charge: number; fade: number }, pal: Palette, queen: boolean) => {
  const ch = span(ms, 0, M.charge);
  if (ch < 1) {
    charge(pen, o, t, ch, pal, queen ? 12 : 10);
    return;
  }
  const f = span(ms, M.charge, M.charge + M.fade);
  if (f >= 1) return;
  const thick = Math.max(1, Math.round(9 * (1 - easeOutExpo(f))));
  const alpha = 1 - easeInCubic(f);
  const hot = f < 0.1;
  for (const r of rays) {
    const ex = o.x + r.dx * r.len * t;
    const ey = o.y + r.dy * r.len * t;
    pen.line(o.x, o.y, ex, ey, hot ? pal.core : pal.glow, alpha * 0.85, thick + 2);
    pen.line(o.x, o.y, ex, ey, pal.core, alpha, Math.max(1, thick - 2));
    pen.disc(ex, ey, pen.dot * (1 + thick * 0.6), pal.edge, alpha);
  }
  pen.disc(o.x, o.y, pen.dot * (2 + thick * 0.5), pal.core, alpha);
};

/** 퀸 C: 등대처럼 한 바퀴 휩쓰는 광선. 느리게 시작해 채찍처럼 빨라졌다가 멈춘다 (지수형) */
const queenSweep = (lens: number[], t: number) => {
  const M = FX_MS.queenSweep;
  const A0 = -Math.PI / 2; // 12시
  const start = A0 - Math.PI / 6; // 11시에서 출발
  const total = Math.PI * 2 + Math.PI / 3;
  const ang = (p: number) => start + total * easeInOutExpo(p);
  // 방향별 광선 길이(px): 대각선은 칸당 √2
  const px = lens.map((l, k) => l * t * (k % 2 ? Math.SQRT2 : 1));
  const lenAt = (a: number) => {
    let phi = (a - A0) % (Math.PI * 2);
    if (phi < 0) phi += Math.PI * 2;
    const k = Math.floor(phi / (Math.PI / 4)) % 8;
    const f = (phi - k * (Math.PI / 4)) / (Math.PI / 4);
    const s = (1 - Math.cos(f * Math.PI)) / 2;
    return px[k] * (1 - s) + px[(k + 1) % 8] * s;
  };
  /** 방향 k를 지나는 진행도 (0~1) */
  const hitAt = (k: number) => {
    const target = A0 + k * (Math.PI / 4);
    for (let i = 0; i <= 400; i++) if (ang(i / 400) >= target) return i / 400;
    return 1;
  };
  const draw = (pen: PixelPen, o: { x: number; y: number }, ms: number, pal: Palette) => {
    const w = span(ms, 0, M.wind);
    if (w < 1) {
      // 떠오르며 톱니 고리가 점점 빨리 돈다
      const e = easeInExpo(w);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + e * 9;
        pen.px(o.x + Math.cos(a) * t * 0.5, o.y + Math.sin(a) * t * 0.5, i % 3 ? pal.edge : pal.core, 0.5 + 0.5 * w, 2);
      }
      pen.disc(o.x, o.y, pen.dot * (1 + 2.5 * e), pal.glow, 0.9);
      return;
    }
    const p = span(ms, M.wind, M.wind + M.sweep);
    const fade = 1 - span(ms, M.wind + M.sweep, M.wind + M.sweep + M.fade);
    const a = ang(Math.min(1, p));
    // 잔상: 지나온 각도로 옅은 광선 6줄
    const speedish = Math.min(0.5, Math.abs(ang(Math.min(1, p)) - ang(Math.max(0, p - 0.04))));
    for (let i = 6; i >= 1; i--) {
      const b = a - (speedish * i) / 6;
      const L = lenAt(b);
      if (L > 0) pen.line(o.x, o.y, o.x + Math.cos(b) * L, o.y + Math.sin(b) * L, pal.glow, fade * 0.45 * (1 - i / 7), 1);
    }
    const L = lenAt(a);
    if (L > 0) {
      pen.line(o.x, o.y, o.x + Math.cos(a) * L, o.y + Math.sin(a) * L, pal.glow, fade, 4);
      pen.line(o.x, o.y, o.x + Math.cos(a) * L, o.y + Math.sin(a) * L, pal.core, fade, 2);
      pen.disc(o.x + Math.cos(a) * L, o.y + Math.sin(a) * L, pen.dot * 2, pal.edge, fade);
    }
    pen.disc(o.x, o.y, pen.dot * 3, pal.core, fade);
    // 지나간 방향 끝에서 작은 폭발
    lens.forEach((l, k) => {
      if (!l) return;
      const at = M.wind + hitAt(k) * M.sweep;
      const q = span(ms, at, at + 160);
      if (q > 0 && q < 1) {
        const [dx, dy] = DIRS[k];
        burst(pen, o.x + dx * l * t, o.y + dy * l * t, t, q, pal);
      }
    });
  };
  return { hitAt, draw };
};

/** 퀸 D: 톱날 부메랑 — 돌리며 띄움 → 8방향으로 던짐(지수 감속) → 끝에서 돌다가 → 되돌아옴(지수 가속) */
const saws = (pen: PixelPen, o: { x: number; y: number }, t: number, lens: number[], ms: number, pal: Palette) => {
  const M = FX_MS.queenSaw;
  const spinA = ms * 0.06;
  const saw = (x: number, y: number, r: number, a: number) => {
    for (let i = 0; i < 8; i++) {
      const b = (i / 8) * Math.PI * 2 + spinA;
      pen.px(x + Math.cos(b) * r, y + Math.sin(b) * r, i % 2 ? pal.edge : pal.core, a, 2);
    }
    pen.disc(x, y, r * 0.55, pal.glow, a);
    pen.disc(x, y, pen.dot, pal.core, a);
  };
  if (ms < M.wind) {
    const e = easeInExpo(ms / M.wind);
    lens.forEach((l, k) => {
      if (!l) return;
      const b = (k / 8) * Math.PI * 2 + e * 6;
      saw(o.x + Math.cos(b) * t * 0.45, o.y + Math.sin(b) * t * 0.45, t * 0.12, 0.5 + 0.5 * e);
    });
    return;
  }
  const u = ms - M.wind;
  let d = 0;
  if (u < M.out) d = easeOutExpo(u / M.out);
  else if (u < M.out + M.spin) d = 1;
  else d = 1 - easeInExpo(Math.min(1, (u - M.out - M.spin) / M.back));
  const done = u >= M.out + M.spin + M.back;
  lens.forEach((l, k) => {
    if (!l || done) return;
    const [dx, dy] = DIRS[k];
    const x = o.x + dx * l * t * d;
    const y = o.y + dy * l * t * d;
    // 지나간 길에 불꽃 자국
    if (u < M.out) pen.line(o.x + dx * l * t * d * 0.6, o.y + dy * l * t * d * 0.6, x, y, pal.glow, 0.5, 1, true);
    saw(x, y, t * 0.2, 1);
  });
  if (done) {
    const q = span(ms, M.wind + M.out + M.spin + M.back, M.wind + M.out + M.spin + M.back + 120);
    if (q < 1) pen.ring(o.x, o.y, t * (0.2 + 0.3 * easeOutExpo(q)), pal.edge, 1 - q);
  }
};

/** 룩: 쿵 — 발밑 충격, 그리고 십자 방향으로 한 칸씩 이어지는 폭발 (ms = 내리꽂은 뒤) */
const slamChain = (pen: PixelPen, o: { x: number; y: number }, t: number, cs: Claimed[], ms: number, pal: Palette) => {
  const M = FX_MS.rook;
  const sh = span(ms, 0, 110);
  if (sh > 0 && sh < 1) {
    const e = easeOutExpo(sh);
    pen.square(o.x, o.y + t * 0.1, t * (0.3 + 0.45 * e), pal.glow, 1 - sh);
    for (let i = 0; i < 8; i++) {
      const a = Math.PI + (i / 7) * Math.PI; // 위로 튀는 먼지
      pen.px(o.x + Math.cos(a) * t * 0.6 * e, o.y + t * 0.35 + Math.sin(a) * t * 0.35 * e, pal.core, 1 - sh);
    }
  }
  for (const c of cs) {
    const at = M.first + M.step * (c.dist - 1);
    burst(pen, c.t.x, c.t.y, t, span(ms, at, at + M.burst), pal);
  }
};

/** 킹 A: 내려친 뒤 주변 8칸으로 퍼지는 사각 충격파 */
const pound = (pen: PixelPen, o: { x: number; y: number }, t: number, ms: number, pal: Palette) => {
  const M = FX_MS.king;
  const w = span(ms, 0, M.wind);
  if (w > 0 && w < 1) pen.square(o.x, o.y, t * (0.6 - 0.25 * easeInExpo(w)), pal.glow, 0.3 + 0.5 * w);
  const p = span(ms, M.wind + M.slam, M.wind + M.slam + M.wave);
  if (p <= 0 || p >= 1) return;
  const r = t * (0.35 + 1.1 * easeOutExpo(p));
  pen.square(o.x, o.y, r, pal.glow, 1 - p);
  pen.square(o.x, o.y, r - pen.dot * 2, pal.core, (1 - p) * 0.7);
};

/** 킹 B: 왕관이 점점 밝아짐 → 내려치면 종소리 파동 두 겹 → 이웃 칸마다 땡 */
const bells = (pen: PixelPen, o: { x: number; y: number }, t: number, cs: Claimed[], ms: number, pal: Palette) => {
  const M = FX_MS.king;
  const g = span(ms, 0, M.wind + M.slam);
  if (g > 0 && g < 1) {
    const e = easeInExpo(g);
    const cy = o.y - t * 0.55;
    pen.line(o.x - t * 0.25 * e, cy, o.x + t * 0.25 * e, cy, pal.edge, 0.4 + 0.6 * e);
    pen.line(o.x, cy - t * 0.25 * e, o.x, cy + t * 0.25 * e, pal.edge, 0.4 + 0.6 * e);
    pen.disc(o.x, cy, pen.dot * (0.5 + 1.5 * e), pal.core, 1);
  }
  const s = M.wind + M.slam;
  for (const [start, col] of [[s, pal.core], [s + 70, pal.glow]] as [number, number][]) {
    const p = span(ms, start, start + 200);
    if (p > 0 && p < 1) pen.ring(o.x, o.y, t * (0.3 + 1.4 * easeOutExpo(p)), col, 1 - p);
  }
  for (const c of cs) {
    const p = span(ms, s + 70, s + 220);
    if (p > 0 && p < 1) star(pen, c.t.x, c.t.y, t * 0.8, p, pal);
  }
};

/** 칸 하나의 폭발: 흰 핵(지수형으로 부풂) → 고리 + 파편 */
const burst = (pen: PixelPen, x: number, y: number, t: number, q: number, pal: Palette) => {
  if (q <= 0 || q >= 1) return;
  if (q < 0.3) {
    const k = easeOutExpo(q / 0.3);
    pen.disc(x, y, t * (0.1 + 0.3 * k), pal.glow, 0.9);
    pen.disc(x, y, t * (0.06 + 0.18 * k), pal.core, 1);
    return;
  }
  const k = (q - 0.3) / 0.7;
  const e = easeOutExpo(k);
  pen.ring(x, y, t * (0.38 + 0.15 * e), pal.edge, 1 - k);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.4;
    const r = t * (0.25 + 0.45 * e);
    pen.px(x + Math.cos(a) * r, y + Math.sin(a) * r + t * 0.25 * k * k, i % 2 ? pal.core : pal.glow, 1 - k);
  }
};

/** 착탄 별: 8방향 짧은 빛살 */
const star = (pen: PixelPen, x: number, y: number, t: number, q: number, pal: Palette) => {
  const e = easeOutExpo(q);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const r0 = t * 0.1 + t * 0.22 * e;
    const r1 = r0 + t * (i % 2 ? 0.1 : 0.22) * (1 - q);
    pen.line(x + Math.cos(a) * r0, y + Math.sin(a) * r0, x + Math.cos(a) * r1, y + Math.sin(a) * r1, i % 2 ? pal.glow : pal.core, 1 - q);
  }
};

/** 피격 스파크 한 장면 (q = 0~1, 160ms) */
export const drawHitSpark = (pen: PixelPen, x: number, y: number, t: number, side: Side, q: number): void => star(pen, x, y, t, q, PAL[side]);

/** 처치 파편 한 장면 (q = 0~1, 380ms): 기물이 톱니·스프링 파편으로 부서져 튄다 (docs/world.md §4) */
export const drawShatter = (pen: PixelPen, x: number, y: number, t: number, pieceSide: Side, q: number): void => {
  const body = pieceSide === 0 ? 0xf4f1ea : 0x2a2830;
  const rim = pieceSide === 0 ? 0x38bdf8 : 0xe5262f;
  const e = easeOutExpo(q);
  for (let i = 0; i < 12; i++) {
    const a = -Math.PI / 2 + ((i - 5.5) / 6) * 1.5 + (i % 3) * 0.13;
    const v = t * (0.9 + (i % 4) * 0.25);
    pen.px(x + Math.cos(a) * v * e, y + Math.sin(a) * v * e + t * 1.6 * q * q, i % 3 === 0 ? rim : body, 1 - q * q, i % 4 === 0 ? 2 : 1);
  }
  if (q < 0.3) pen.ring(x, y, t * (0.2 + q), rim, 1 - q / 0.3);
};

/** 바스라짐에 쓰는 기물 도트 한 칸 (월드 px 왼쪽 위, 색) — 렌더러가 기물 그림에서 뽑아 준다 */
export interface CrumbleCell {
  x: number;
  y: number;
  c: number;
}
/** 바스라짐 길이 (ms): 잘리는 선이 위에서 아래로 내려가는 시간 + 마지막 조각이 사라지는 시간 */
export const CRUMBLE_MS = { cut: 420, life: 300 };

/**
 * 처치: 기물이 위에서부터 한 줄씩 도트로 바스라진다 (D-048).
 * 잘리는 선이 지수형으로 빨라지며 내려가고, 선 바로 아래 한두 줄은 체크무늬로 듬성듬성,
 * 선을 지난 도트는 살짝 튀었다가 떨어지며 깜빡이고 사라진다.
 */
export const drawCrumble = (pen: PixelPen, cells: CrumbleCell[], ms: number): void => {
  if (!cells.length || ms < 0) return;
  const d = pen.dot;
  let top = Infinity;
  let bottom = -Infinity;
  for (const c of cells) {
    top = Math.min(top, c.y);
    bottom = Math.max(bottom, c.y + d);
  }
  const H = bottom - top;
  const cut = top + H * easeInCubic(Math.min(1, ms / CRUMBLE_MS.cut));
  cells.forEach((c, i) => {
    const r = Math.round((c.x + c.y) / d);
    if (c.y >= cut) {
      if (c.y < cut + d * 2 && r % 2 === 0) return; // 갈라지는 가장자리: 체크무늬로 듬성듬성
      pen.px(c.x + d / 2, c.y + d / 2, c.c, 1);
      return;
    }
    // 이 줄을 선이 지난 시각 (easeInCubic의 역함수)
    const born = Math.cbrt((c.y - top) / H) * CRUMBLE_MS.cut;
    const t = ms - born;
    if (t < 0 || t > CRUMBLE_MS.life) return;
    const q = t / CRUMBLE_MS.life;
    if (q > 0.45 && Math.floor(t / 40) % 2) return; // 도트처럼 깜빡이며 사라짐
    const h = ((i * 7919) % 13) / 13 - 0.5; // 칸마다 다른 흩어짐 (결정적)
    const u = t / 100;
    pen.px(c.x + d / 2 + h * d * 3 * u, c.y + d / 2 + d * (-1.4 * u + 2.2 * u * u), c.c, 1, q > 0.7 ? 1 : 1);
  });
};

/** 피격 스파크 (게임) */
export const playHitSpark = (scene: Phaser.Scene, x: number, y: number, tile: number, side: Side, speed: number): void => {
  const g = scene.add.graphics().setDepth(7.5);
  const pen = new PixelPen(g, tile / BOARD_DOTS);
  scene.tweens.addCounter({ from: 0, to: 1, duration: 160 / speed, onUpdate: (tw) => (g.clear(), drawHitSpark(pen, x, y, tile, side, tw.getValue() ?? 0)), onComplete: () => g.destroy() });
};

/** 처치 파편 (게임) */
export const playShatter = (scene: Phaser.Scene, x: number, y: number, tile: number, pieceSide: Side, speed: number): Promise<void> => {
  const g = scene.add.graphics().setDepth(7);
  const pen = new PixelPen(g, tile / BOARD_DOTS);
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
