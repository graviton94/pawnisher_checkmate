import { PixelPen } from './pixel';

/**
 * 타격감 연구실 확정안의 게임판 (D-180). 모든 FX는 PixelPen(칸당 16도트)으로만 찍는다 — 매끈한 선 · 원 금지.
 * 순수 그리기 함수: (pen, 위치, 진행률 k 0~1) → 그 순간 그림. 시간 관리는 BoardRenderer가 한다.
 */

/** 불씨 색 단계: 흰 → 연노랑 → 금 → 주황 → 진홍 → 검붉음 */
export const RAMP = [0xffffff, 0xfff3b0, 0xfacc15, 0xf59e0b, 0xe5262f, 0x7a1218, 0x2a0a0d];
export const ramp = (k: number): number => RAMP[Math.min(RAMP.length - 1, Math.max(0, Math.floor(k * RAMP.length)))];

/** 결정론 잡음 */
export const hash = (n: number): number => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const cl = (v: number) => Math.max(0, Math.min(1, v));

/**
 * 타격 불꽃 (도트 별): 0~0.3 흰 십자 + 금 가시(가장 크다) · 0.3~0.65 팔이 떨어져 바깥으로 · 0.65~ 불똥.
 * r = 반지름(월드 px)
 */
export const drawSpark = (pen: PixelPen, x: number, y: number, r: number, k: number): void => {
  if (k < 0 || k >= 1) return;
  const d = pen.dot;
  const L = Math.max(3, Math.round(r / d));
  const AX: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const DG: [number, number][] = [[1, 1], [-1, 1], [1, -1], [-1, -1]];
  if (k < 0.3) {
    const len = Math.round(L * (1 - (k / 0.3) * 0.35));
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) pen.px(x + i * d, y + j * d, 0xffffff);
    for (let s = 2; s <= len; s++) {
      const c = s < len * 0.5 ? 0xffffff : s < len * 0.8 ? 0xfff3b0 : 0xfacc15;
      for (const [ax, ay] of AX) {
        pen.px(x + ax * s * d, y + ay * s * d, c);
        if (s < len * 0.45) pen.px(x + ax * s * d + ay * d, y + ay * s * d + ax * d, c);
      }
    }
    for (let s = 2; s <= Math.round(len * 0.55); s++) for (const [ax, ay] of DG) pen.px(x + ax * s * d, y + ay * s * d, s < len * 0.3 ? 0xfff3b0 : 0xfacc15);
  } else if (k < 0.65) {
    const q = (k - 0.3) / 0.35;
    const a0 = Math.round(L * (0.4 + 0.7 * q));
    const a1 = Math.round(L * (0.75 + 0.6 * q));
    for (let s = a0; s <= a1; s++) for (const [ax, ay] of AX) pen.px(x + ax * s * d, y + ay * s * d, ramp(0.25 + q * 0.4));
    for (const [ax, ay] of DG) pen.px(x + ax * a0 * 0.7 * d, y + ay * a0 * 0.7 * d, ramp(0.3 + q * 0.4));
  } else {
    const q = (k - 0.65) / 0.35;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.4;
      const dist = L * (1.1 + 0.8 * q) * d;
      pen.px(x + Math.cos(a) * dist, y + Math.sin(a) * dist + 8 * q * q, ramp(0.4 + q * 0.5), 1 - q);
    }
  }
};

/** 불씨 파편: 색이 식어 가며 끌림 · 중력 (n개, power 배) */
export const drawEmbers = (pen: PixelPen, x: number, y: number, k: number, seed: number, n = 20, power = 1): void => {
  if (k <= 0 || k >= 1) return;
  for (let i = 0; i < n; i++) {
    const a = hash(seed + i) * Math.PI * 2;
    const v = (40 + hash(seed + i * 3) * 100) * power;
    const life = 0.55 + hash(seed + i * 5) * 0.45;
    const q = k / life;
    if (q >= 1) continue;
    const e = 1 - (1 - q) ** 2;
    pen.px(x + Math.cos(a) * v * e, y + Math.sin(a) * v * e * 0.7 + 60 * q * q * power, ramp(q * 0.95), 1, hash(seed + i * 7) > 0.7 ? 2 : 1);
  }
};

/** 도트 고리: 흐려질수록 체크무늬로 성기게 */
export const drawRing = (pen: PixelPen, x: number, y: number, r: number, color: number, alpha: number): void => {
  if (alpha <= 0 || r <= 0) return;
  const d = pen.dot;
  const n = Math.max(12, Math.round((2 * Math.PI * r) / d));
  const seen = new Set<string>();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const cx = Math.floor((x + Math.cos(a) * r) / d);
    const cy = Math.floor((y + Math.sin(a) * r * 0.75) / d);
    const key = `${cx},${cy}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (alpha < 0.55 && (cx + cy) % 2) continue;
    pen.px(cx * d + d / 2, cy * d + d / 2, color, Math.min(1, alpha * 1.6));
  }
};

/**
 * 빛이 새는 금 (기물 도트 위에서만): 칸당 16도트 그림 칸 집합 위를 무작위로 걷는 갈래 다섯.
 * 검붉은 테두리 · 주황 → 연노랑 → 흰 심, 지금 자라는 끝이 가장 밝다.
 */
export const crackPath = (cells: { i: number; j: number }[], seed: number): { i: number; j: number; ord: number }[] => {
  const has = new Set(cells.map((c) => `${c.i},${c.j}`));
  const ci = cells.reduce((s, c) => s + c.i, 0) / Math.max(1, cells.length);
  const cj = cells.reduce((s, c) => s + c.j, 0) / Math.max(1, cells.length);
  const out: { i: number; j: number; ord: number }[] = [{ i: Math.round(ci), j: Math.round(cj), ord: 0 }];
  const D8: [number, number][] = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  for (let b = 0; b < 5; b++) {
    let i = Math.round(ci);
    let j = Math.round(cj);
    let ang = (b / 5) * Math.PI * 2 + hash(seed + b) * 0.8;
    const len = 3 + Math.floor(hash(seed + b * 5) * 3);
    for (let s = 0; s < len; s++) {
      ang += (hash(seed + b * 13 + s) - 0.5) * 1.2;
      const dd = D8[((Math.round((ang / (Math.PI * 2)) * 8) % 8) + 8) % 8];
      if (!has.has(`${i + dd[0]},${j + dd[1]}`)) break;
      i += dd[0];
      j += dd[1];
      out.push({ i, j, ord: b * 0.08 + (s / len) * 0.6 });
    }
  }
  return out;
};
export const drawCrack = (pen: PixelPen, ox: number, oy: number, path: { i: number; j: number; ord: number }[], k: number): void => {
  const d = pen.dot;
  const shown = path.filter((p) => p.ord <= k * 1.05);
  for (const p of shown) pen.px(ox + p.i * d + d / 2, oy + p.j * d + d / 2, 0x2a0608, 1);
  for (const p of shown) pen.px(ox + p.i * d + d / 2, oy + p.j * d + d / 2, k - p.ord < 0.12 ? 0xffffff : k > 0.7 ? 0xfff3b0 : 0xf59e0b);
};

/** 왕관 (도트): 위치 · 회전 없이 (도트라 기울이지 않는다 — 튈 때 위아래로만) */
export const drawCrown = (pen: PixelPen, x: number, y: number): void => {
  const d = pen.dot;
  const P = (i: number, j: number, c: number) => pen.px(x + i * d, y + j * d, c);
  for (let i = -2; i <= 2; i++) P(i, 0, 0xfacc15);
  for (let i = -2; i <= 2; i++) P(i, 1, 0x7a5a12);
  for (const i of [-2, 0, 2]) P(i, -1, 0xfacc15);
  P(0, -2, 0xfff3b0);
  P(0, 0, 0xe5262f);
};

/** 출발 먼지: 떠난 자리에서 회색 도트가 퍼지며 걷힌다 */
export const drawTakeoffDust = (pen: PixelPen, x: number, y: number, k: number): void => {
  if (k <= 0 || k >= 1) return;
  for (let i = 0; i < 7; i++) {
    const ang = Math.PI + (hash(i + 70) - 0.5) * 1.6;
    const r = (5 + 20 * (1 - (1 - k) ** 3)) * (0.6 + hash(i + 71) * 0.6);
    pen.px(x + Math.cos(ang) * r * (i % 2 ? 1 : -1), y + Math.sin(ang) * r * 0.35 - 5 * k, k < 0.3 ? 0xd6d3dc : 0x8a8794, 1 - k, k < 0.5 ? 2 : 1);
  }
};

/** 착지 먼지 고리 (원수 낙하) */
export const drawSlamDust = (pen: PixelPen, x: number, y: number, k: number): void => {
  if (k <= 0 || k >= 1) return;
  for (let i = 0; i < 16; i++) {
    const side = i % 2 ? 1 : -1;
    const r = (8 + 46 * (1 - (1 - k) ** 3)) * (0.5 + hash(i + 5) * 0.7);
    const lift = 14 * (1 - (1 - k) ** 3) * hash(i + 9);
    pen.px(x + side * r, y - lift - hash(i) * 6, k < 0.25 ? 0xe2dfe8 : k < 0.6 ? 0xa8a4b2 : 0x6b6876, 1 - k * k * k, k < 0.35 ? 3 : k < 0.7 ? 2 : 1);
  }
};

/** 판 물결: 충격점에서 거리 dist인 칸의 세로 흔들림(월드 px, 위가 −) */
export const rippleOffset = (dist: number, ms: number, tile: number): number => {
  const front = ms * 0.009;
  const local = front - dist;
  const decay = cl(1 - ms / 900);
  if (dist === 0) return tile * 0.06 * decay;
  if (local > 0 && local < 1.2) return (-tile * 0.12 * Math.sin((Math.PI * local) / 1.2) * decay) / (0.6 + dist * 0.4);
  return 0;
};
