/**
 * 움직임 키프레임을 계산으로 굽는다 (D-593). D-554의 bakeMotion은 120Hz 표본마다 임시 애니메이션 시각을 옮기고
 * getComputedStyle을 읽었다 — 표본마다 스타일 재계산이 강제되어, 타이틀 베기의 핏방울 22개만으로 ×4 감속에서 0.6초를 막았다.
 * 흔한 꼴(transform만, translate · rotate · scale · skew 목록이 키프레임끼리 같은 꼴, 곡선이 cubic-bezier 계열)은
 * 브라우저의 보간 규칙(CSS Transforms 2 · Web Animations)을 그대로 따라 여기서 셈한다. 다른 꼴은 null — 부른 쪽이 표본으로 굽는다.
 * 화면 요소를 읽지 않는 순수 함수 (요소 크기는 부른 쪽이 준다).
 */

/** 2D 행렬 [a, b, c, d, e, f] (CSS matrix() 순서) */
export type Mat = [number, number, number, number, number, number];

/** 변환 함수 하나 (같은 꼴끼리만 보간한다) */
type Fn = { k: 't'; x: number; xp: boolean; y: number; yp: boolean } | { k: 'r'; deg: number } | { k: 's'; x: number; y: number } | { k: 'k'; x: number; y: number };

const NUM = String.raw`[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?`;
const LEN = new RegExp(`^(${NUM})(px|%)?$`, 'i');
const ANG = new RegExp(`^(${NUM})(deg|turn|rad|grad)?$`, 'i');

const len = (v: string): { n: number; p: boolean } | null => {
  const m = LEN.exec(v.trim());
  if (!m) return null;
  const n = parseFloat(m[1]);
  // 단위 없는 길이는 0만 허용 (CSS 규칙)
  if (!m[2] && n !== 0) return null;
  return { n, p: m[2] === '%' };
};
const ang = (v: string): number | null => {
  const m = ANG.exec(v.trim());
  if (!m) return null;
  const n = parseFloat(m[1]);
  const u = (m[2] ?? '').toLowerCase();
  if (!u && n !== 0) return null;
  return u === 'turn' ? n * 360 : u === 'rad' ? (n * 180) / Math.PI : u === 'grad' ? n * 0.9 : n;
};

/** transform 글 → 함수 목록 ('none' = 빈 목록). 모르는 꼴이면 null */
export const parseTransform = (src: string | undefined | null): Fn[] | null => {
  const s = (src ?? 'none').trim();
  if (s === '' || s === 'none') return [];
  const out: Fn[] = [];
  const re = /([a-zA-Z]+)\(([^()]*)\)\s*/gy;
  let m: RegExpExecArray | null;
  let at = 0;
  while ((m = re.exec(s))) {
    at = re.lastIndex;
    const name = m[1].toLowerCase();
    const a = m[2].split(',').map((x) => x.trim());
    if (name === 'translate' || name === 'translatex' || name === 'translatey') {
      if (a.length > (name === 'translate' ? 2 : 1)) return null;
      const x = name === 'translatey' ? { n: 0, p: false } : len(a[0]);
      const y = name === 'translatex' ? { n: 0, p: false } : name === 'translatey' ? len(a[0]) : a[1] !== undefined ? len(a[1]) : { n: 0, p: false };
      if (!x || !y) return null;
      out.push({ k: 't', x: x.n, xp: x.p, y: y.n, yp: y.p });
    } else if (name === 'rotate' || name === 'rotatez') {
      if (a.length !== 1) return null;
      const d = ang(a[0]);
      if (d === null) return null;
      out.push({ k: 'r', deg: d });
    } else if (name === 'scale' || name === 'scalex' || name === 'scaley') {
      const v = a.map(Number);
      if (v.some((n) => !Number.isFinite(n)) || a.some((x) => x === '') || v.length > (name === 'scale' ? 2 : 1)) return null;
      out.push(name === 'scalex' ? { k: 's', x: v[0], y: 1 } : name === 'scaley' ? { k: 's', x: 1, y: v[0] } : { k: 's', x: v[0], y: v[1] ?? v[0] });
    } else if (name === 'skew' || name === 'skewx' || name === 'skewy') {
      if (a.length > (name === 'skew' ? 2 : 1)) return null;
      const x = name === 'skewy' ? 0 : ang(a[0]);
      const y = name === 'skewx' ? 0 : name === 'skewy' ? ang(a[0]) : a[1] !== undefined ? ang(a[1]) : 0;
      if (x === null || y === null) return null;
      out.push({ k: 'k', x, y });
    } else return null;
  }
  return at === s.length ? out : null;
};

const ident = (f: Fn): Fn => (f.k === 't' ? { k: 't', x: 0, xp: f.xp, y: 0, yp: f.yp } : f.k === 'r' ? { k: 'r', deg: 0 } : f.k === 'k' ? { k: 'k', x: 0, y: 0 } : { k: 's', x: 1, y: 1 });
/** 두 목록이 같은 꼴인가 (한쪽이 빈 목록이면 다른 쪽의 항등으로 채운다). 다르면 null — 행렬 분해 보간은 하지 않는다 */
const pair = (a: Fn[], b: Fn[]): [Fn[], Fn[]] | null => {
  if (!a.length) a = b.map(ident);
  if (!b.length) b = a.map(ident);
  if (a.length !== b.length) return null;
  for (let i = 0; i < a.length; i++) {
    const x = a[i], y = b[i];
    if (x.k !== y.k) return null;
    // 퍼센트와 px가 섞인 이동은 calc가 되어 여기서는 다루지 않는다 (0은 어느 쪽이든 같다)
    if (x.k === 't' && y.k === 't' && ((x.xp !== y.xp && x.x !== 0 && y.x !== 0) || (x.yp !== y.yp && x.y !== 0 && y.y !== 0))) return null;
  }
  return [a, b];
};

const mul = (m: Mat, n: Mat): Mat => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
];
/** 함수 목록 → 행렬 (w · h = 요소 테두리 상자, 퍼센트 이동의 기준) */
export const toMatrix = (fs: Fn[], w: number, h: number): Mat => {
  let m: Mat = [1, 0, 0, 1, 0, 0];
  for (const f of fs) {
    if (f.k === 't') m = mul(m, [1, 0, 0, 1, f.xp ? (f.x / 100) * w : f.x, f.yp ? (f.y / 100) * h : f.y]);
    else if (f.k === 'r') {
      const r = (f.deg * Math.PI) / 180;
      const c = Math.cos(r), s = Math.sin(r);
      m = mul(m, [c, s, -s, c, 0, 0]);
    } else if (f.k === 'k') m = mul(m, [1, Math.tan((f.y * Math.PI) / 180), Math.tan((f.x * Math.PI) / 180), 1, 0, 0]);
    else m = mul(m, [f.x, 0, 0, f.y, 0, 0]);
  }
  return m;
};
const lerpFn = (a: Fn, b: Fn, t: number): Fn => {
  const L = (x: number, y: number) => x + (y - x) * t;
  if (a.k === 't' && b.k === 't') return { k: 't', x: L(a.x, b.x), xp: a.x !== 0 ? a.xp : b.xp, y: L(a.y, b.y), yp: a.y !== 0 ? a.yp : b.yp };
  if (a.k === 'r' && b.k === 'r') return { k: 'r', deg: L(a.deg, b.deg) };
  if (a.k === 's' && b.k === 's') return { k: 's', x: L(a.x, b.x), y: L(a.y, b.y) };
  if (a.k === 'k' && b.k === 'k') return { k: 'k', x: L(a.x, b.x), y: L(a.y, b.y) };
  return a;
};

// ---------- 곡선 ----------
/** cubic-bezier(x1, y1, x2, y2) — 브라우저와 같은 방식(뉴턴 + 이분)으로 x에서 t를 푼다 */
export const bezier = (x1: number, y1: number, x2: number, y2: number): ((x: number) => number) => {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  const solve = (x: number): number => {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const e = sx(t) - x;
      if (Math.abs(e) < 1e-7) return t;
      const d = dx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    let lo = 0, hi = 1;
    t = x;
    for (let i = 0; i < 40 && lo < hi; i++) {
      const v = sx(t);
      if (Math.abs(v - x) < 1e-7) return t;
      if (x > v) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return t;
  };
  return (x: number) => {
    // 0~1 밖(앞 곡선이 넘친 진행도)은 끝 기울기로 잇는다 (Web Animations 규칙)
    if (x < 0) {
      const g = x1 > 0 ? y1 / x1 : !y1 && x2 > 0 ? y2 / x2 : 0;
      return g * x;
    }
    if (x > 1) {
      const g = x2 < 1 ? (y2 - 1) / (x2 - 1) : x2 === 1 && x1 < 1 ? (y1 - 1) / (x1 - 1) : 0;
      return 1 + g * (x - 1);
    }
    return sy(solve(x));
  };
};
const NAMED: Record<string, [number, number, number, number]> = {
  ease: [0.25, 0.1, 0.25, 1],
  'ease-in': [0.42, 0, 1, 1],
  'ease-out': [0, 0, 0.58, 1],
  'ease-in-out': [0.42, 0, 0.58, 1],
};
/** 곡선 글 → 함수. 계단(steps)은 표본 사이를 잇는다(옛 계단 키프레임은 곡선 위 표본) — linear. 모르는 꼴이면 null */
export const easingFn = (src: string | undefined): ((x: number) => number) | null => {
  const s = (src ?? 'linear').trim().toLowerCase();
  if (s === 'linear' || /^steps\(|^step-/.test(s)) return (x) => x;
  if (NAMED[s]) return bezier(...NAMED[s]);
  const m = /^cubic-bezier\(([^)]*)\)$/.exec(s);
  if (!m) return null;
  const v = m[1].split(',').map(Number);
  if (v.length !== 4 || v.some((n) => !Number.isFinite(n))) return null;
  return bezier(v[0], v[1], v[2], v[3]);
};

/** 키프레임 하나 (움직임 쪽만) */
export interface MotionFrame {
  offset?: number | null;
  easing?: string;
  transform?: string;
}

/**
 * 움직임 키프레임을 n+1개 표본 행렬로 (시각 i/n). 다룰 수 없는 꼴이면 null.
 * w · h: 요소 테두리 상자 (퍼센트 이동 기준). 방향 · 효과 곡선 · 키프레임 곡선 · 0~1 밖 외삽까지 Web Animations와 같다.
 */
export const sampleMotion = (kf: MotionFrame[], n: number, w: number, h: number, direction: PlaybackDirection = 'normal', easing = 'linear'): Mat[] | null => {
  if (kf.length < 1 || n < 1) return null;
  const lists = kf.map((f) => parseTransform(f.transform));
  if (lists.some((l) => l === null)) return null;
  const eases = kf.map((f) => easingFn(f.easing));
  const glob = easingFn(easing);
  if (!glob || eases.some((e) => !e)) return null;
  // 빠진 offset은 고르게 (처음 0 · 끝 1)
  const N = kf.length;
  const off = kf.map((f, i) => (typeof f.offset === 'number' ? f.offset : N === 1 ? 1 : i === 0 ? 0 : i === N - 1 ? 1 : NaN));
  for (let i = 1; i < N; i++)
    if (Number.isNaN(off[i])) {
      let j = i;
      while (Number.isNaN(off[j])) j++;
      for (let k = i; k < j; k++) off[k] = off[i - 1] + ((off[j] - off[i - 1]) * (k - i + 1)) / (j - i + 1);
    }
  // 처음 · 끝 키프레임이 빠지면 바탕 값과 섞어야 한다 — 그 꼴은 표본으로
  if (N < 2 || off[0] !== 0 || off[N - 1] !== 1) return null;
  for (let i = 1; i < N; i++) if (off[i] < off[i - 1]) return null;
  const segs: [Fn[], Fn[]][] = [];
  for (let i = 0; i < N - 1; i++) {
    const p = pair(lists[i]!, lists[i + 1]!);
    if (!p) return null;
    segs.push(p);
  }
  const out: Mat[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const dirT = direction === 'reverse' || direction === 'alternate-reverse' ? 1 - t : t;
    const p = glob!(dirT);
    // 구간: off[k] ≤ p < off[k+1] (같은 offset이 겹치면 뒤 구간), 0~1 밖은 처음 · 끝 구간을 늘린다
    let k = 0;
    if (p >= 1) {
      k = N - 2;
      while (k > 0 && off[k] === 1) k--;
    } else if (p > 0) while (k < N - 2 && off[k + 1] <= p) k++;
    const span = off[k + 1] - off[k];
    const local = span > 0 ? eases[k]!((p - off[k]) / span) : p >= off[k + 1] ? 1 : 0;
    const [a, b] = segs[k];
    out.push(toMatrix(a.map((f, j) => lerpFn(f, b[j], local)), w, h));
  }
  return out;
};
