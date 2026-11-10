/**
 * 도트 FX 엔진 (D-249, 사용자: 「pixelfx(patch-gg)의 FX 기법 · 디자인 룰을 참고해 봐」).
 * pixelfx · Sprite Fusion(Hugo Duprez, MIT)의 방법을 우리 코드로 다시 짰다 — 그 저장소의 코드를 들여오지 않았다 (docs/CREDITS.md).
 *
 * 규칙 (그 사람의 룰을 우리 말로):
 *  - 버퍼 둘: 색(불투명 칸 · 4×4 베이어 디더로만 옅어짐 · 진짜 반투명은 연기 · 김 · 먼지에만)과 빛(더하기, 맨 위).
 *  - 색은 램프의 단단한 단계(어두움 → 밝음, 그림자는 차갑고 밝은 쪽은 따뜻하게). 부드러움은 빛과 반투명 덩어리에만.
 *  - 면이 아니라 선과 빛: 1칸 테 · 고리 · 꼬리 · 불꽃, 흰 핵은 가장 뜨거운 곳에만.
 *  - 빛은 어디에나: 큰 옅은 웅덩이 + 작은 뜨거운 핵 + 불꽃마다 빛 + 충돌 순간 번쩍했다 꺼지는 Lights.
 *  - 진짜 움직임: 불꽃은 속도만큼 늘어나 떨어지고 튀고, 파편은 구르다 멈추고, 불은 식으며 연기가 되고, 연기는 부풀며 옅어진다.
 *  - 박자: 모으기 → 1~2장의 흰 장(hero frame) · 터짐 → 퍼짐 → 머묾(반짝임 · 불씨) → 긴 꺼짐. 빠르게 들어가 천천히 빠진다.
 *  - 결정론: Math.random 금지, 시드 Rng.
 */

/** 색 = ImageData 바이트 순서의 32비트 정수 (R, G, B, A) */
export type Col = number;
export const rgb = (r: number, g: number, b: number): Col => ((255 << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255)) >>> 0;
export const hex = (h: string | number): Col => {
  if (typeof h === 'number') return h;
  let s = h.replace('#', '');
  if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
  const v = parseInt(s.slice(0, 6), 16);
  return rgb((v >> 16) & 255, (v >> 8) & 255, v & 255);
};
const R8 = (c: Col) => c & 255;
const G8 = (c: Col) => (c >>> 8) & 255;
const B8 = (c: Col) => (c >>> 16) & 255;
export const mix = (a: Col, b: Col, t: number): Col => rgb(R8(a) + (R8(b) - R8(a)) * t, G8(a) + (G8(b) - G8(a)) * t, B8(a) + (B8(b) - B8(a)) * t);
export const scale = (c: Col, k: number): Col => rgb(Math.min(255, R8(c) * k), Math.min(255, G8(c) * k), Math.min(255, B8(c) * k));
export const ramp = (list: string[]): Col[] => list.map(hex);
/** 램프의 한 단계 (섞지 않는다 — 도트는 색을 고른다) */
export const at = (r: Col[], t: number): Col => r[Math.max(0, Math.min(r.length - 1, Math.floor(t * r.length)))];
export const WHITE = hex('#ffffff');

/** 우리 세계 램프 (어두움 → 밝음) */
export const PAL = {
  fire: ramp(['#1f0b10', '#4a1118', '#8c1d1c', '#cc3a1a', '#f2701f', '#ffae35', '#ffe27a', '#fff8d6']),
  ember: ramp(['#1a0a0e', '#3d1012', '#701a14', '#a8301a', '#e0561e', '#ff8a2a', '#ffc46a']),
  brass: ramp(['#1a1208', '#3a2a12', '#6a4a1c', '#a8792c', '#c89b3c', '#f4d27a', '#fff3c4']),
  gold: ramp(['#2a1a06', '#5a3a0c', '#9a6a14', '#d49a22', '#f4c84a', '#ffe68a', '#fffbe0']),
  steel: ramp(['#0e0d12', '#1b1a22', '#2a2c36', '#3d404c', '#5a5e6c', '#868a98', '#b8bcc8', '#e8eaf0']),
  rust: ramp(['#140a08', '#2e160e', '#4e2414', '#74361a', '#9a4c22', '#c06a30', '#e0904a']),
  teal: ramp(['#06100f', '#0d2224', '#143a3e', '#1e5a60', '#2e8a90', '#5fd4d8', '#b4f4f4', '#ffffff']),
  /** 조립 반장 기계 초록 (D-347 — 검수 반장 청록과 갈리게) */
  toxic: ramp(['#060f06', '#0e2410', '#16401a', '#1e5a24', '#3e8c3a', '#7fd45a', '#d4f7a8', '#ffffff']),
  blood: ramp(['#14060a', '#2e0a10', '#5a1018', '#8c1820', '#c42430', '#e5262f', '#ff6b6b', '#ffc4c4']),
  heal: ramp(['#06140c', '#0c2a18', '#14462a', '#1e6a40', '#2e9a5a', '#7ee0a1', '#d4ffe4']),
  smoke: ramp(['#0e0c12', '#1d1a22', '#2e2a35', '#433e4b', '#5c5664', '#7b7484', '#a39cab']),
  wood: ramp(['#140c06', '#2a180c', '#4a2c16', '#6e4a2a', '#8a6038', '#a87a48', '#c89a62']),
  paper: ramp(['#3a3428', '#6a6250', '#9a907a', '#c8bca2', '#e9e2d4', '#fffaf0']),
};
const FIRE_RAMP = ramp(['#ffffff', '#fff3a6', '#ffe26b', '#ffc23d', '#ff8a2a', '#f2561d', '#c9281f', '#8a1f17', '#4a1712']);
const SMOKE_RAMP = ramp(['#7b6f72', '#5d5660', '#433d48', '#2b2630', '#1a171e']);
const HOT = ramp(['#fff3a6', '#ffe26b', '#ff8a2a', '#f2561d']);

/** 시드 난수 (결정론) */
export class Rng {
  s: number;
  constructor(seed = 1) { this.s = (seed * 2654435761) >>> 0 || 1; }
  next(): number { let x = this.s; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; this.s = x >>> 0; return this.s / 4294967296; }
  range(a: number, b: number): number { return a + (b - a) * this.next(); }
  int(n: number): number { return Math.floor(this.next() * n); }
  chance(p: number): boolean { return this.next() < p; }
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
/** 베이어 생명 (x, y 칸) — 디더 퇴장 · 디더 경계에 쓴다 */
export const bayer = (x: number, y: number): number => BAYER[((y & 3) << 2) | (x & 3)];

/** 한 장: 색 버퍼 + 빛 버퍼 */
export class Frame {
  color: Uint32Array;
  light: Uint32Array;
  constructor(public w: number, public h: number) {
    this.color = new Uint32Array(w * h);
    this.light = new Uint32Array(w * h);
  }
  clear(): void { this.color.fill(0); this.light.fill(0); }
}

/** 붓 (칸 좌표, 1칸 = 1도트) */
export class Painter {
  fade = 1;
  constructor(public f: Frame) {}
  put(x: number, y: number, c: Col, a = 1): void {
    x = Math.floor(x); y = Math.floor(y);
    if (!c || x < 0 || y < 0 || x >= this.f.w || y >= this.f.h) return;
    a *= this.fade;
    if (a < 1 && a <= bayer(x, y)) return;
    this.f.color[y * this.f.w + x] = c;
  }
  /** 진짜 반투명 (연기 · 김 · 먼지) */
  blend(x: number, y: number, c: Col, a: number): void {
    x = Math.floor(x); y = Math.floor(y);
    a *= this.fade;
    if (!c || a <= 0.004 || x < 0 || y < 0 || x >= this.f.w || y >= this.f.h) return;
    const i = y * this.f.w + x, d = this.f.color[i], da = (d >>> 24) / 255, oa = a + da * (1 - a), k = a / oa;
    const ch = (s: number) => (((c >>> s) & 255) * k + ((d >>> s) & 255) * (1 - k)) & 255;
    this.f.color[i] = ((((oa * 255) & 255) << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)) >>> 0;
  }
  /** 빛 더하기 */
  add(x: number, y: number, c: Col, k = 1): void {
    x = Math.floor(x); y = Math.floor(y);
    k *= this.fade;
    if (k <= 0.004 || x < 0 || y < 0 || x >= this.f.w || y >= this.f.h) return;
    const i = y * this.f.w + x, d = this.f.light[i];
    const r = Math.min(255, (d & 255) + R8(c) * k) | 0, g = Math.min(255, ((d >>> 8) & 255) + G8(c) * k) | 0, b = Math.min(255, ((d >>> 16) & 255) + B8(c) * k) | 0;
    this.f.light[i] = ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
  }
  px(x: number, y: number, c: Col): void { this.put(x, y, c, 1); }
  dot(x: number, y: number, c: Col, a = 1): void { this.put(x, y, c, a); }
  rect(x: number, y: number, w: number, h: number, c: Col, a = 1): void { for (let j = Math.floor(y); j < y + h; j++) for (let i = Math.floor(x); i < x + w; i++) this.put(i, j, c, a); }
  circle(cx: number, cy: number, r: number, c: Col, a = 1): void {
    for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) { const dx = x + 0.5 - cx, dy = y + 0.5 - cy; if (dx * dx + dy * dy <= r * r) this.put(x, y, c, a); }
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, c: Col, a = 1): void {
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) { const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry; if (dx * dx + dy * dy <= 1) this.put(x, y, c, a); }
  }
  /** 반투명 원판 (연기 덩어리) */
  disc(cx: number, cy: number, r: number, c: Col, a: number): void {
    if (r < 0.6) return this.blend(cx, cy, c, a);
    for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) { const dx = x + 0.5 - cx, dy = y + 0.5 - cy; if (dx * dx + dy * dy <= r * r) this.blend(x, y, c, a); }
  }
  line(x0: number, y0: number, x1: number, y1: number, c: Col, a = 1): void {
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
    for (let i = 0; i <= n; i++) this.put(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, c, a);
  }
  /** 둥근 빛 웅덩이 (더하기, 가운데가 뜨겁다) */
  glow(x: number, y: number, r: number, c: Col, k = 0.5): void {
    if (r < 1 || k <= 0.004) return;
    for (let sy = Math.floor(y - r); sy <= y + r; sy++) for (let sx = Math.floor(x - r); sx <= x + r; sx++) {
      const dx = (sx + 0.5 - x) / r, dy = (sy + 0.5 - y) / r, d = dx * dx + dy * dy;
      if (d < 1) { const f = 1 - Math.sqrt(d); this.add(sx, sy, c, f * f * k); }
    }
  }
  glowLine(x0: number, y0: number, x1: number, y1: number, r: number, c: Col, k = 0.5): void {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / Math.max(1, r * 0.6)));
    for (let i = 0; i <= n; i++) this.glow(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, r, c, k / Math.sqrt(n + 1) * 1.6);
  }
  /** 별 반짝임: 십자 팔 + 흰 핵 + 빛 */
  sparkle(x: number, y: number, arm: number, c: Col, tip: Col, k = 0.6): void {
    for (let i = 1; i <= arm; i++) { const col = i === arm ? tip : c; this.px(x + i, y, col); this.px(x - i, y, col); this.px(x, y + i, col); this.px(x, y - i, col); }
    this.px(x, y, WHITE);
    this.glow(x, y, arm * 2 + 2, c, k);
  }
  /** 왼위 빛 · 오른아래 그림자 상자 (램프 r: 어두움→밝음) */
  block(x: number, y: number, w: number, h: number, r: Col[], ink: Col = OUTLINE): void {
    this.rect(x, y, w, h, ink);
    this.rect(x + 1, y + 1, w - 2, h - 2, r[Math.floor(r.length / 2)]);
    this.rect(x + 1, y + 1, w - 2, 1, r[r.length - 2]);
    this.rect(x + 1, y + 1, 1, h - 2, r[r.length - 2]);
    this.rect(x + 1, y + h - 2, w - 2, 1, r[1]);
    this.rect(x + w - 2, y + 2, 1, h - 3, r[1]);
  }
}
export const OUTLINE = hex('#0b0b0e');

/** 입자 종류 */
export const P = { SPARK: 0, EMBER: 1, SMOKE: 2, FIRE: 3, GRIT: 4, DUST: 5, STAR: 6, MOTE: 7, SHARD: 8 } as const;
type Kind = (typeof P)[keyof typeof P];
interface Part { k: Kind; x: number; y: number; vx: number; vy: number; life: number; max: number; col: Col; size: number; seed: number; delay: number; smokes: boolean; a: number; va: number; rest: boolean }

/** 입자 (불꽃 · 불씨 · 연기 · 불 · 부스러기 · 먼지 · 별 · 파편) */
export class Particles {
  list: Part[] = [];
  t = 0;
  sparks: Col[];
  constructor(public R: Rng, public ground: (x: number) => number = () => Infinity, sparks?: Col[]) { this.sparks = sparks ?? HOT; }
  spawn(k: Kind, x: number, y: number, vx: number, vy: number, life: number, col: Col = WHITE, size = 1, delay = 0, smokes = false): void {
    this.list.push({ k, x, y, vx, vy, life, max: life, col, size, seed: this.R.next() * 100, delay, smokes, a: this.R.range(0, 6.28), va: this.R.range(-12, 12), rest: false });
  }
  /** 사방 터짐 (불꽃) */
  burst(x: number, y: number, n: number, speed: [number, number], kind: Kind = P.SPARK, life: [number, number] = [0.25, 0.6], col: Col = WHITE, up = 0): void {
    for (let i = 0; i < n; i++) { const a = this.R.range(0, Math.PI * 2), sp = this.R.range(speed[0], speed[1]); this.spawn(kind, x, y, Math.cos(a) * sp, Math.sin(a) * sp - up, this.R.range(life[0], life[1]), col, this.R.range(0.8, 1.6)); }
  }
  update(dt: number): void {
    this.t += dt;
    const t = this.t, R = this.R;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      if (p.delay > 0) { p.delay -= dt; continue; }
      if ((p.life -= dt) <= 0) {
        if (p.k === P.FIRE && p.smokes) this.spawn(P.SMOKE, p.x, p.y, p.vx * 0.6, p.vy * 0.6 - 6, R.range(0.8, 1.4), 0, p.size * 0.8);
        this.list.splice(i, 1);
        continue;
      }
      const g = this.ground(p.x);
      switch (p.k) {
        case P.SPARK: {
          p.vy += 950 * 0.45 * dt; p.vx -= p.vx * 2.2 * dt; p.vy -= p.vy * 2.2 * dt;
          const ny = p.y + p.vy * dt; p.x += p.vx * dt;
          if (p.vy > 0 && p.y <= g && ny >= g) { p.vy = -p.vy * 0.45; p.vx *= 0.7; p.y = g - 0.25; } else p.y = ny;
          continue;
        }
        case P.GRIT: case P.SHARD: {
          if (p.rest) continue;
          p.vy += 950 * dt; p.vx -= p.vx * 0.8 * dt; p.a += p.va * dt;
          const ny = p.y + p.vy * dt; p.x += p.vx * dt;
          if (p.vy > 0 && p.y <= g && ny >= g) {
            p.y = g - 0.25;
            if (p.vy > 120 && R.chance(0.5)) { p.vy = -p.vy * 0.3; p.vx *= 0.5; p.va *= 0.5; } else { p.vx = p.vy = 0; p.rest = true; p.life = Math.min(p.life, 0.6); }
          } else p.y = ny;
          continue;
        }
        case P.FIRE: p.vy -= 95 * dt; p.vx += Math.sin(t * 17 + p.seed) * 30 * dt; p.vx -= p.vx * 5 * dt; p.vy -= p.vy * 3.2 * dt; break;
        case P.EMBER: p.vy += (-30 + Math.sin(t * 3 + p.seed) * 20) * dt; p.vx += Math.cos(t * 2.3 + p.seed) * 45 * dt; p.vx -= p.vx * 1.6 * dt; p.vy -= p.vy * 1.6 * dt; break;
        case P.SMOKE: p.vy -= 16 * dt; p.vx += Math.sin(t * 1.3 + p.seed) * 8 * dt; p.vx -= p.vx * 1.6 * dt; p.vy -= p.vy * 1.2 * dt; break;
        case P.MOTE: p.vx -= p.vx * 0.6 * dt; p.vy -= p.vy * 0.6 * dt; break;
        default: p.vx -= p.vx * 4 * dt; p.vy -= p.vy * 4 * dt + 5 * dt;
      }
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
  }
  /** layer: back = 연기 · 먼지 (뒤), front = 나머지 */
  draw(p: Painter, layer?: 'back' | 'front'): void {
    for (const q of this.list) {
      if (q.delay > 0) continue;
      const soft = q.k === P.SMOKE || q.k === P.DUST;
      if (layer && (soft ? 'back' : 'front') !== layer) continue;
      const k = q.life / q.max, x = q.x, y = q.y, sp = Math.hypot(q.vx, q.vy) || 1, ux = q.vx / sp, uy = q.vy / sp;
      switch (q.k) {
        case P.SPARK: {
          const S = this.sparks, head = k > 0.6 ? S[0] : k > 0.3 ? S[1] : S[2], len = Math.min(9, 1 + sp * 0.022);
          p.line(x - ux * len, y - uy * len, x - ux * len * 0.4, y - uy * len * 0.4, k > 0.5 ? head : S[S.length - 1]);
          p.line(x - ux * len * 0.45, y - uy * len * 0.45, x, y, head);
          p.glow(x, y, 3, head, 0.45 * k);
          break;
        }
        case P.MOTE: {
          const len = Math.min(12, 0.5 + sp * 0.026) * q.size, a = k < 0.35 ? k / 0.35 : 1;
          p.line(x - ux * len, y - uy * len, x, y, scale(q.col, 0.55), a);
          p.px(x, y, q.col);
          p.glow(x, y, 2.5 + q.size, q.col, 0.4 * k);
          break;
        }
        case P.EMBER: {
          const c = k > 0.6 ? this.sparks[0] : k > 0.3 ? this.sparks[1] : this.sparks[2];
          if (k < 0.25 && Math.sin(this.t * 40 + q.seed) < 0) break;
          p.px(x, y, c);
          if (q.size > 1.5) p.px(x, y + 1, this.sparks[this.sparks.length - 1]);
          p.glow(x, y, 3 + q.size, c, 0.35 * k);
          break;
        }
        case P.SMOKE: {
          const age = 1 - k, r = q.size * (0.65 + Math.min(1, age * 2.5) * 0.45 + age * 0.4);
          const a = Math.min(1, age * 12) * Math.min(1, k * 2.4) * 0.58;
          const c = q.col ? mix(q.col, at(SMOKE_RAMP, age), age) : at(SMOKE_RAMP, age * 1.05);
          p.disc(x, y, r, c, a * 0.45);
          p.disc(x + r * 0.05, y + r * 0.06, r * 0.74, c, a * 0.62);
          if (age < 0.5) p.disc(x - r * 0.22, y - r * 0.3, r * 0.5, mix(c, WHITE, 0.12), a * 0.4 * (1 - age * 2));
          break;
        }
        case P.DUST: p.disc(x, y, q.size * (0.6 + (1 - k) * 0.9), q.col, Math.pow(k, 1.3) * 0.7); break;
        case P.FIRE: {
          const age = 1 - k, heat = Math.min(0.999, Math.pow(age, 0.62) + (q.seed % 1) * 0.1), F = FIRE_RAMP, n = F.length;
          const idx = Math.min(n - 2, Math.floor(heat * (n - 1)));
          const r = q.size * (0.55 + 0.45 * Math.min(1, age * 7)) * (1 - age * 0.55), c = F[idx];
          if (idx >= n - 2) p.disc(x, y, r, c, Math.min(1, k * 3) * 0.85);
          else {
            p.circle(x, y, r, F[Math.min(n - 1, idx + 2)]);
            p.circle(x - r * 0.16, y - r * 0.22, r * 0.78, c);
            if (r > 1.6) p.circle(x, y - r * 0.9, r * 0.42, c);
            if (idx < 6) p.glow(x, y, r * 2.4 + 2, c, 0.18 * k);
          }
          break;
        }
        case P.GRIT: if (k > 0.25 || Math.sin(this.t * 30 + q.seed) > 0) { p.px(x, y, q.col); if (q.size >= 1.5) { p.px(x + 1, y, q.col); p.px(x, y + 1, scale(q.col, 0.75)); } } break;
        case P.SHARD: {
          // 회전하는 쇳조각: 길이 size*2, 밝은 면 · 어두운 면
          if (k < 0.3 && Math.sin(this.t * 30 + q.seed) < 0) break;
          const L = q.size * 1.6, cx = Math.cos(q.a) * L, cy = Math.sin(q.a) * L;
          p.line(x - cx, y - cy, x + cx, y + cy, q.col);
          p.px(x - cx, y - cy, scale(q.col, 1.4));
          break;
        }
        default: {
          const tw = 0.6 + 0.4 * Math.sin(this.t * (8 + (q.seed % 5)) + q.seed);
          if (q.size < 1.2) { if (tw * k > 0.25) p.px(x, y, tw > 0.8 ? WHITE : q.col); p.glow(x, y, 3, q.col, 0.4 * k * tw); }
          else p.sparkle(x, y, Math.max(1, Math.round(q.size * tw * Math.min(1, k * 3))), q.col, scale(q.col, 0.75), 0.5 * k * tw);
        }
      }
    }
  }
}

/** 번쩍했다 꺼지는 빛 (세기는 남은 목숨²) */
export class Lights {
  list: { x: number; y: number; r: number; c: Col; k: number; life: number; max: number }[] = [];
  add(x: number, y: number, r: number, c: Col, k: number, life: number): void { this.list.push({ x, y, r, c, k, life, max: life }); }
  update(dt: number): void { for (let i = this.list.length - 1; i >= 0; i--) if ((this.list[i].life -= dt) <= 0) this.list.splice(i, 1); }
  draw(p: Painter): void { for (const l of this.list) { const k = l.life / l.max; p.glow(l.x, l.y, l.r * (0.7 + 0.3 * k), l.c, l.k * k * k); } }
}

/** 색 위에 빛을 더해 ImageData로 (바탕은 투명 — 아래 그림이 비친다) */
export const composite = (f: Frame, out: Uint8ClampedArray, lightK = 1): void => {
  const n = f.w * f.h, C = f.color, L = f.light;
  for (let i = 0; i < n; i++) {
    const c = C[i], l = L[i] & 0xffffff, o = i * 4;
    let r = c & 255, g = (c >>> 8) & 255, b = (c >>> 16) & 255, a = c >>> 24;
    if (l) {
      const lr = (l & 255) * lightK, lg = ((l >>> 8) & 255) * lightK, lb = ((l >>> 16) & 255) * lightK;
      if (a < 255) {
        const pa = a / 255, na = Math.min(1, Math.max(pa, Math.max(lr, lg, lb) / 255));
        if (na > 0) { r = Math.min(255, (r * pa + lr) / na); g = Math.min(255, (g * pa + lg) / na); b = Math.min(255, (b * pa + lb) / na); a = na * 255; }
      } else { r = Math.min(255, r + lr); g = Math.min(255, g + lg); b = Math.min(255, b + lb); }
    }
    out[o] = r; out[o + 1] = g; out[o + 2] = b; out[o + 3] = a;
  }
};

/**
 * 캔버스 하나에 도트 FX를 돌리는 무대: 칸 해상도(w×h)로 그리고 CSS로 dot배 키운다 (image-rendering: pixelated).
 * run(ms, step) — step(t초, dt, painter)가 매 장을 그린다. 물리는 1/120초로 잘게, 그림은 rAF마다.
 */
export class FxCanvas {
  frame: Frame;
  painter: Painter;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  img: ImageData;
  constructor(public w: number, public h: number, public dot = 3) {
    this.frame = new Frame(w, h);
    this.painter = new Painter(this.frame);
    this.canvas = document.createElement('canvas');
    this.canvas.width = w;
    this.canvas.height = h;
    this.canvas.style.width = `${w * dot}px`;
    this.canvas.style.height = `${h * dot}px`;
    this.canvas.style.imageRendering = 'pixelated';
    this.ctx = this.canvas.getContext('2d')!;
    this.img = this.ctx.createImageData(w, h);
  }
  present(lightK = 1): void { composite(this.frame, this.img.data, lightK); this.ctx.putImageData(this.img, 0, 0); }
  /** ms 동안 돌린다. sim(dt)는 1/120초 단위로, draw(t)는 매 장. 캔버스가 문서에서 빠지면 멈춘다 */
  run(ms: number, sim: (dt: number, t: number) => void, draw: (t: number, p: Painter) => void): Promise<void> {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const total = reduce ? Math.min(ms, 500) / 1000 : ms / 1000;
    return new Promise((done) => {
      let t = 0;
      let last = performance.now();
      const tick = (now: number) => {
        if (!this.canvas.isConnected) return done();
        let dt = Math.min(0.1, (now - last) / 1000);
        last = now;
        while (dt > 0 && t < total) { const s = Math.min(1 / 120, dt, total - t); sim(s, t); t += s; dt -= s; }
        this.frame.clear();
        draw(t, this.painter);
        this.present();
        if (t < total) requestAnimationFrame(tick); else done();
      };
      requestAnimationFrame(tick);
    });
  }
}
