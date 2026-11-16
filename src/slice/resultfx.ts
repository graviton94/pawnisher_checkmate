/**
 * 결과 도트 연출 (D-508 — EF-01 · EF-02 · WG-02 발주 취소, 사용자 결정 「받은 시트를 못 쓴다 → 코드로」).
 * 48×48칸 도트 캔버스 하나를 대상(실제 카드 · 기물 · 지갑 · 상자 · 판돈 칩) 위에 겹쳐 8프레임을 계단으로 찍는다.
 * 박자 = D-180: 0~1 예비(모임 · 떨림, 느리게) → 2~3 터짐(가장 크고 밝게, 빠르게) → 4~7 출렁 · 흩어짐 · 디더 퇴장(베이어 구멍이 늘어남).
 * 색은 발주 15색만(먹 · 철 · 황동 · 종이 · 진홍 · 청록) — 그라데이션 · 반투명 · 페이드 · 선형 미끄럼 없음(D-216).
 * 줄인 움직임이면 터짐 한 장만 잠깐 보이고 걷힌다. 결과는 엔진이 이미 정했다 — 보여 주기만 한다(UI 원칙 9).
 */
import { calmMotion } from '../prefs/motion';
import { bayer, Rng } from '../view/pxfx';

export type ResultFxKind = 'quench' | 'molten' | 'rust' | 'weld' | 'upgrade' | 'shatter' | 'screws' | 'screwsUp' | 'crate' | 'betWin' | 'betLose';

/** 발주 15색 (docs/asset-order-master.md §0-D 공용 팔레트) */
const C = {
  ink: '#0B0B0E', i1: '#33313B', i2: '#56545E', i3: '#8A8794',
  b1: '#8A6416', b2: '#C89B3C', b3: '#F5C542',
  p1: '#8E877A', p2: '#BFB9AD', p3: '#F1EDE4',
  r1: '#7A1218', r2: '#E5262F', r3: '#FF7B7B',
  t1: '#1F8A7A', t2: '#5EEAD4',
} as const;

const N = 48;
/** 프레임 길이(ms): 예비는 느리게 · 터짐은 빠르게 · 꼬리는 출렁 */
const BEAT = [110, 100, 60, 70, 80, 90, 90, 100];

interface Ctx { g: CanvasRenderingContext2D; f: number; R: Rng; cx: number; cy: number }
type Draw = (c: Ctx) => void;

const dot = (g: CanvasRenderingContext2D, x: number, y: number, col: string, w = 1, h = 1): void => {
  g.fillStyle = col;
  g.fillRect(Math.round(x), Math.round(y), w, h);
};
/** 디더 퇴장: 프레임 f(4~7)에 베이어 문턱을 올려 그 칸을 비운다 — 투명도 보간이 아니다 */
const keep = (x: number, y: number, f: number, from = 4): boolean => f < from || bayer(Math.round(x), Math.round(y)) > (f - from + 1) / (8 - from + 1);
/** 단색 덩어리(1~3칸) */
const blob = (c: Ctx, x: number, y: number, col: string, s = 2): void => { for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) if (keep(x + i, y + j, c.f)) dot(c.g, x + i, y + j, col); };
/** 계단 원(채움) — 반지름 r, 가장자리 한 겹은 2×2 체크 디더 */
const disc = (c: Ctx, x0: number, y0: number, r: number, col: string, edge?: string): void => {
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
    const d = x * x + y * y;
    if (d > r * r) continue;
    const X = x0 + x, Y = y0 + y;
    if (!keep(X, Y, c.f)) continue;
    if (edge && d > (r - 1) * (r - 1)) { if (((X >> 0) + (Y >> 0)) & 1) dot(c.g, X, Y, edge); } else dot(c.g, X, Y, col);
  }
};
/** 계단 고리(타원 둘레) */
const ring = (c: Ctx, x0: number, y0: number, rx: number, ry: number, col: string, gap = 0): void => {
  const n = Math.max(12, Math.round((rx + ry) * 3.2));
  for (let k = 0; k < n; k++) {
    if (gap && k % gap === 0) continue;
    const a = (k / n) * Math.PI * 2;
    const X = x0 + Math.cos(a) * rx, Y = y0 + Math.sin(a) * ry;
    if (keep(X, Y, c.f)) dot(c.g, X, Y, col);
  }
};
/** 십자 번쩍: 팔 길이 len, 가운데 3칸 종이 흰색 · 팔 황동 */
const cross = (c: Ctx, x0: number, y0: number, len: number, core: string = C.p3, arm: string = C.b3): void => {
  for (let i = -len; i <= len; i++) {
    const col = Math.abs(i) < 2 ? core : Math.abs(i) < len * 0.6 ? arm : C.b2;
    dot(c.g, x0 + i, y0, col); dot(c.g, x0, y0 + i, col);
  }
  dot(c.g, x0 - 1, y0 - 1, core, 3, 3);
};
/** 방사 불똥 n개: 터짐 뒤 t만큼 날아가고 중력으로 떨어진다(프레임 계단) */
const sparks = (c: Ctx, n: number, speed: number, cols: string[], grav = 0.6, from = 2, up = 0): void => {
  const R = new Rng(c.R.s);
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + R.range(-0.2, 0.2);
    const v = speed * R.range(0.6, 1.1);
    const t = c.f - from + 1;
    if (t <= 0) continue;
    const x = c.cx + Math.cos(a) * v * t, y = c.cy + Math.sin(a) * v * t * 0.8 - up * t + grav * t * t;
    const col = cols[Math.min(cols.length - 1, Math.max(0, t - 1))];
    blob(c, x, y, col, t < 3 ? 2 : 1);
  }
};
/** 동전 하나(옆에서 본 납작한 타원 9×3) */
const coin = (c: Ctx, x: number, y: number, tilt = 0): void => {
  const w = tilt ? 5 : 9;
  for (let i = 0; i < w; i++) {
    const X = x - (w >> 1) + i;
    if (!keep(X, y, c.f)) continue;
    dot(c.g, X, y - 1, i === 0 || i === w - 1 ? C.ink : C.b3);
    dot(c.g, X, y, i === 0 || i === w - 1 ? C.ink : C.b2);
    dot(c.g, X, y + 1, C.ink);
  }
};

const DRAW: Record<ResultFxKind, Draw> = {
  /** 담금질: 위에서 물(종이 · 철 밝은 단)이 쏟아짐 → 흰 증기 기둥이 솟구침 → 위로 흩어지며 디더 퇴장, 아래는 검게 식은 빛 */
  quench: (c) => {
    const { f, cx, cy } = c;
    if (f <= 1) {
      for (let k = 0; k < 9; k++) { const x = cx - 8 + k * 2, y = 4 + ((k * 5 + f * 9) % 14) + f * 8; dot(c.g, x, y, k % 2 ? C.p2 : C.i3, 1, 3); }
      for (let k = -6; k <= 6; k += 3) dot(c.g, cx + k, cy + 6, C.r2, 2, 1);
      return;
    }
    const h = f === 2 ? 20 : f === 3 ? 30 : 30 + (f - 3) * 3;
    const w = f === 2 ? 6 : f === 3 ? 9 : 10 + (f - 3);
    for (let y = 0; y < h; y++) {
      const ww = Math.round(w * (0.55 + 0.45 * (y / h)) + ((y + f) % 4 < 2 ? 1 : 0));
      const Y = cy + 4 - y - (f > 3 ? (f - 3) * 3 : 0);
      for (let x = -ww; x <= ww; x++) {
        const X = cx + x;
        if (!keep(X, Y, f)) continue;
        const edge = Math.abs(x) >= ww - 1;
        if (edge && ((X + Y) & 1)) continue;
        dot(c.g, X, Y, edge ? C.p2 : y > h * 0.7 ? C.p2 : C.p3);
      }
    }
    for (let k = -6; k <= 6; k += 3) if (keep(cx + k, cy + 6, f)) dot(c.g, cx + k, cy + 6, f >= 4 ? C.i1 : C.r1, 2, 1);
  },
  /** 쇳물 튐: 아래에서 방울이 부풂 → 왕관처럼 튄 고리(황동 · 진홍) → 떨어지며 식어 검은 알갱이 */
  molten: (c) => {
    const { f, cx, cy } = c;
    if (f <= 1) { disc(c, cx, cy + 6, 3 + f * 2, f ? C.r2 : C.r1, C.b2); dot(c.g, cx - 1, cy + 4 - f, C.b3, 2, 2); return; }
    if (f <= 3) {
      const r = f === 2 ? 9 : 13;
      for (let k = 0; k < 14; k++) {
        const a = Math.PI + (k / 13) * Math.PI;
        const x = cx + Math.cos(a) * r, y = cy + 6 + Math.sin(a) * r * (f === 2 ? 1.2 : 1.5);
        blob(c, x, y, k % 3 === 0 ? C.b3 : k % 3 === 1 ? C.r2 : C.b2, f === 2 ? 2 : 3);
      }
      ring(c, cx, cy + 7, r, 2, C.r2);
      disc(c, cx, cy + 7, 3, C.b3);
      return;
    }
    const t = f - 3;
    for (let k = 0; k < 14; k++) {
      const a = Math.PI + (k / 13) * Math.PI;
      const x = cx + Math.cos(a) * (13 + t * 2), y = cy + 6 + Math.sin(a) * 19 + t * t * 2.2;
      blob(c, x, y, t < 2 ? C.r1 : t < 3 ? C.i2 : C.ink, 2);
    }
    ring(c, cx, cy + 7, 13 + t, 2, t < 2 ? C.r1 : C.i1, 2);
  },
  /** 녹 번짐: 한 점에서 반점이 계단으로 번짐(진홍 어두운 단 · 종이 어두운 단 · 황동 어두운 단) → 부스러기가 떨어짐 → 디더 퇴장 */
  rust: (c) => {
    const { f, cx, cy } = c;
    const r = [3, 6, 11, 15, 16, 16, 16, 16][f];
    const R = new Rng(7);
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      const n = R.next();
      if (x * x + y * y > r * r || n < 0.35) continue;
      const X = cx + x, Y = cy - 6 + y;
      if (!keep(X, Y, f, 5)) continue;
      dot(c.g, X, Y, n > 0.85 ? C.b1 : n > 0.6 ? C.r1 : C.p1);
    }
    if (f >= 3) for (let k = 0; k < 7; k++) blob(c, cx - 10 + k * 3, cy - 2 + ((k * 7) % 5) + (f - 3) * 4, k % 2 ? C.r1 : C.p1, 2);
  },
  /** 수리 불꽃: 한 점으로 불똥이 모임 → 용접 십자 · 불똥 방사 → 떨어지며 꺼짐(황동 → 어두운 황동) */
  weld: (c) => {
    const { f, cx, cy } = c;
    if (f <= 1) { for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2, d = f ? 4 : 9; dot(c.g, cx + Math.cos(a) * d, cy + Math.sin(a) * d, C.b3, 1, 1); } dot(c.g, cx, cy, C.p3, 1, 1); return; }
    if (f <= 3) cross(c, cx, cy, f === 2 ? 8 : 12, C.p3, C.t2);
    sparks(c, 12, 3.4, [C.p3, C.b3, C.b2, C.b1, C.b1, C.b1], 0.9);
  },
  /** 강화: 황동 고리 3겹이 계단으로 좁혀 올라옴 → 흰 십자 번쩍 → 청록 불꽃이 위로 떠오르며 디더 퇴장 */
  upgrade: (c) => {
    const { f, cx, cy } = c;
    if (f <= 1) { for (let k = 0; k < 3; k++) ring(c, cx, cy + 10 - k * 5 - f * 3, 16 - k * 4 - f * 2, 3, k === 2 ? C.b3 : C.b2); return; }
    if (f <= 3) { cross(c, cx, cy - 2, f === 2 ? 11 : 15); ring(c, cx, cy - 2, f === 2 ? 7 : 11, f === 2 ? 7 : 11, C.b3, 3); }
    const R = new Rng(11);
    for (let k = 0; k < 9; k++) {
      const x = cx + R.range(-14, 14), y = cy + 6 - (f - 2) * R.range(3, 6);
      blob(c, x, y, k % 3 ? C.t2 : C.t1, f < 5 ? 2 : 1);
    }
  },
  /** 파괴: 가운데 금이 감(먹 + 종이 가장자리) → 쇳조각 8개로 터짐 → 떨어지며 디더 퇴장 */
  shatter: (c) => {
    const { f, cx, cy } = c;
    if (f <= 1) {
      const path = [[0, 0], [2, -3], [1, -6], [4, -9], [-2, 2], [-4, 5], [-3, 8], [3, 2], [6, 4]];
      path.slice(0, f ? 9 : 5).forEach(([x, y]) => { dot(c.g, cx + x, cy - 4 + y, C.ink, 1, 1); dot(c.g, cx + x + 1, cy - 4 + y, C.p3, 1, 1); });
      return;
    }
    const R = new Rng(5);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + R.range(-0.3, 0.3), v = R.range(3, 5), t = f - 1;
      const x = cx + Math.cos(a) * v * t, y = cy - 4 + Math.sin(a) * v * t * 0.7 + 0.7 * t * t;
      const s = t < 3 ? 3 : 2;
      for (let j = 0; j < s; j++) for (let i = 0; i < s - (j === 0 ? 1 : 0); i++) if (keep(x + i, y + j, f)) dot(c.g, x + i, y + j, j === 0 ? C.i3 : (i + k) & 1 ? C.i2 : C.i1);
    }
    if (f <= 3) disc(c, cx, cy - 4, f === 2 ? 4 : 2, C.p3);
  },
  /** 나사 쏟아짐(잃음): 기울며 떨림 → 동전이 아래로 쏟아짐 → 바닥에서 튀고 멈춤 → 디더 퇴장 */
  screws: (c) => {
    const { f, cx, cy } = c;
    const floor = cy + 12;
    for (let k = 0; k < 7; k++) {
      const x0 = cx - 9 + k * 3;
      let y: number;
      if (f <= 1) y = cy - 10 + (k % 2) - f;
      else { const t = f - 1 - (k % 3) * 0.4; y = Math.min(floor, cy - 10 + 3.2 * t * t); if (y >= floor && f >= 4 + (k % 2)) y = floor - (f === 4 + (k % 2) ? 2 : 0); }
      coin(c, x0 + (f >= 2 ? (k - 3) * (f - 1) : f ? 1 : -1), y, f >= 2 && f <= 3 && k % 2 ? 1 : 0);
    }
  },
  /** 나사 얻음: 아래에서 동전이 분수처럼 튀어 올라 십자 반짝 → 가운데로 모여 쌓임 */
  screwsUp: (c) => {
    const { f, cx, cy } = c;
    const R = new Rng(3);
    for (let k = 0; k < 7; k++) {
      const dx = R.range(-14, 14);
      const x = f <= 3 ? cx + dx * (f / 3) : cx + dx * Math.max(0, (7 - f) / 4) * 0.6;
      const y = f <= 1 ? cy + 12 - f * 3 : f <= 3 ? cy + 4 - (f - 1) * 7 + Math.abs(dx) * 0.3 : cy + 10 - k * 2 + (f === 5 ? 1 : 0);
      coin(c, x, y, f === 3 && k % 2 ? 1 : 0);
    }
    if (f === 2 || f === 3) { cross(c, cx - 8, cy - 8, 3); cross(c, cx + 9, cy - 4, f === 3 ? 4 : 2); }
  },
  /** 부품 상자: 덜컹 먼지 → 황동 빛 기둥(가운데 밝게 · 양옆 체크 디더) → 기둥이 좁아지며 반짝이 떠오름 */
  crate: (c) => {
    const { f, cx, cy } = c;
    if (f <= 1) { for (let k = 0; k < 5; k++) dot(c.g, cx - 10 + k * 5 + (f ? 1 : -1), cy + 12, C.i3, 2, 1); return; }
    const w = [0, 0, 5, 8, 6, 4, 3, 2][f];
    for (let y = 0; y < cy + 6; y++) for (let x = -w; x <= w; x++) {
      const X = cx + x, Y = y;
      if (!keep(X, Y, f, 5)) continue;
      const edge = Math.abs(x) >= w - 1;
      if (edge && ((X + Y) & 1)) continue;
      dot(c.g, X, Y, Math.abs(x) < w * 0.4 ? C.p3 : edge ? C.b2 : C.b3);
    }
    const R = new Rng(9);
    if (f >= 3) for (let k = 0; k < 6; k++) blob(c, cx + R.range(-12, 12), cy - (f - 2) * R.range(3, 6), C.b3, 1);
  },
  /** 판돈 적중: 동전 탑이 덜컹 → 튀어 오르며 두 배로(금빛 십자) → 출렁이며 두 탑으로 쌓임 */
  betWin: (c) => {
    const { f, cx, cy } = c;
    const base = cy + 12;
    if (f <= 1) { for (let k = 0; k < 4; k++) coin(c, cx + (f ? (k % 2 ? 1 : -1) : 0), base - k * 3, 0); return; }
    if (f <= 3) {
      const R = new Rng(13);
      for (let k = 0; k < 8; k++) coin(c, cx + R.range(-15, 15) * (f - 1) / 2, base - 6 - R.range(4, 18) * (f - 1) / 2, k % 2);
      cross(c, cx - 10, cy - 10, f === 2 ? 3 : 5);
      cross(c, cx + 11, cy - 6, f === 2 ? 2 : 4);
      return;
    }
    const wob = f === 4 ? -2 : f === 5 ? 1 : 0;
    for (let k = 0; k < 4; k++) { coin(c, cx - 7, base - k * 3 + (k === 3 ? wob : 0), 0); coin(c, cx + 7, base - k * 3 + (k === 3 ? -wob : 0), 0); }
  },
  /** 판돈 실패: 동전 탑에 금이 감 → 녹아 진홍 쇳물 방울로 흘러내림 → 녹빛 얼룩만 남고 디더 퇴장 */
  betLose: (c) => {
    const { f, cx, cy } = c;
    const base = cy + 12;
    if (f <= 1) {
      for (let k = 0; k < 4; k++) coin(c, cx, base - k * 3, 0);
      if (f) for (let k = 0; k < 4; k++) dot(c.g, cx - 1 + (k % 2), base - 10 + k * 3, C.ink, 1, 2);
      return;
    }
    const melt = Math.min(4, f - 1);
    for (let k = 0; k < 4 - Math.min(3, melt); k++) coin(c, cx, base - k * 3 + melt, 0);
    for (let k = 0; k < 6; k++) {
      const x = cx - 6 + k * 2.4, y = base - 8 + (f - 1) * (2 + (k % 3)) ;
      blob(c, x, Math.min(base + 2, y), f < 4 ? C.r2 : f < 6 ? C.r1 : C.p1, 2);
    }
    for (let x = -4 - melt * 2; x <= 4 + melt * 2; x++) if (keep(cx + x, base + 2, f, 5)) dot(c.g, cx + x, base + 2, f < 5 ? C.r1 : C.p1, 1, 2);
  },
};

const calm = (): boolean => calmMotion();
/** 장면 층 도트(3·DPR 반올림) — evstage dotPx와 같다 */
export const sceneDot = (): number => { const r = window.devicePixelRatio || 1; return Math.round(3 * r) / r; };
/** 장치 층 도트(2·DPR 반올림) — 판돈 칩 같은 HUD 위 */
export const deviceDot = (): number => { const r = window.devicePixelRatio || 1; return Math.max(1, Math.round(2 * r)) / r; };

/**
 * 대상 위에서 결과 도트 연출 한 번 (기다릴 수 있다). dot = 도트 하나의 CSS 크기(기기 픽셀 정수), 기본 장면 층.
 * 효과의 중심은 대상 가운데 — 캔버스는 그 둘레 48칸(대상이 작으면 넘쳐 보인다 · 클릭은 통과).
 */
export const resultFx = (target: Element | { left: number; top: number; width: number; height: number }, kind: ResultFxKind, dot: number = sceneDot(), seed = 1): Promise<void> => {
  const r = target instanceof Element ? target.getBoundingClientRect() : target;
  const cv = document.createElement('canvas');
  cv.width = cv.height = N;
  const D = dot;
  cv.className = 'rfx';
  const left = Math.round((r.left + r.width / 2 - (N / 2) * D) * (window.devicePixelRatio || 1)) / (window.devicePixelRatio || 1);
  const top = Math.round((r.top + r.height / 2 - N * 0.62 * D) * (window.devicePixelRatio || 1)) / (window.devicePixelRatio || 1);
  Object.assign(cv.style, { position: 'fixed', left: `${left}px`, top: `${top}px`, width: `${N * D}px`, height: `${N * D}px`, zIndex: '9500', pointerEvents: 'none', imageRendering: 'pixelated' });
  document.body.appendChild(cv);
  const g = cv.getContext('2d')!;
  const R = new Rng(seed * 31 + kind.length);
  const ctx: Ctx = { g, f: 0, R, cx: N / 2, cy: Math.round(N * 0.62) };
  const paint = (f: number) => { g.clearRect(0, 0, N, N); ctx.f = f; DRAW[kind](ctx); };
  return new Promise((done) => {
    if (calm()) { paint(3); window.setTimeout(() => { cv.remove(); done(); }, 220); return; }
    let f = 0;
    const step = () => {
      if (f >= BEAT.length || !cv.isConnected) { cv.remove(); return done(); }
      paint(f);
      // 검수용 느린 재생(?debug에서 window.__fxSlow = n) — 증거 프레임을 한 장씩 찍으려고. 게임은 1배
      window.setTimeout(step, BEAT[f++] * ((window as unknown as { __fxSlow?: number }).__fxSlow ?? 1));
    };
    step();
  });
};
/** 테스트용: 프레임 하나를 그린 칸 수(빈 프레임이 없는지) */
export const fxFramePixels = (kind: ResultFxKind, f: number, mk: () => CanvasRenderingContext2D): number => {
  const g = mk();
  let n = 0;
  const orig = g.fillRect.bind(g);
  g.fillRect = (x: number, y: number, w: number, h: number) => { n += w * h; orig(x, y, w, h); };
  DRAW[kind]({ g, f, R: new Rng(1), cx: N / 2, cy: Math.round(N * 0.62) });
  return n;
};
export const RESULT_FX_KINDS = Object.keys(DRAW) as ResultFxKind[];
