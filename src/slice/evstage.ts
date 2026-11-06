/**
 * 사건 무대 연출 (D-248): 사건 그림 위에 도트 캔버스를 덮고, 사건마다 다른 장치(동전 · 뽑기 바퀴 · 망치 · 담금질 · 금고 …)를 돌린다.
 * 결과는 엔진(events.ts)이 이미 정했다 — 여기서는 보여 주기만 한다. 누르기(tap)는 손맛용: 결과를 바꾸지 않는다.
 * D-216: 1도트 = 3px 단색 칸 · 검은 선 · 계단 프레임(83ms). 페이드 · 그라데이션 · 선형 슬라이드 없음, 사라짐은 체크 디더.
 */
import type { PieceType } from '../engine';

const D = 3;
const STEP = 83;
const INK = '#0b0b0e';
const GOLD = ['#f4d27a', '#fff3c4', '#c89b3c'];
const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const q = (v: number) => Math.max(0, Math.min(1, v));
const st = (v: number, n: number) => Math.floor(q(v) * n) / n;
const outE = (v: number) => 1 - Math.pow(1 - q(v), 3);
const inE = (v: number) => Math.pow(q(v), 3);
const rnd = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const calm = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** 사건이 바꾼 것 (화면이 앞뒤 상태를 비교해 만든다) */
export interface EvDiff {
  gone: PieceType[];
  changed: { from: PieceType; to: PieceType }[];
  added: PieceType[];
  cardsOut: string[];
  cardsIn: string[];
  gold: number;
  hp: number;
}
export interface EvFxCtx {
  id: string;
  good: boolean;
  diff: EvDiff;
  tap?: string;
}

const pieceImgs = new Map<string, HTMLImageElement>();
const pieceImg = (t: PieceType, side: 0 | 1): HTMLImageElement => {
  const k = `${t}${side}`;
  let i = pieceImgs.get(k);
  if (!i) { i = new Image(); i.src = `pieces/l-${k}.png`; pieceImgs.set(k, i); }
  return i;
};
(['K', 'Q', 'R', 'B', 'N', 'P'] as PieceType[]).forEach((t) => { pieceImg(t, 0); pieceImg(t, 1); });

/** 도트 무대 하나 (사건 그림 칸 위) */
class Stage {
  c: HTMLCanvasElement;
  x: CanvasRenderingContext2D;
  W: number;
  H: number;
  w: number;
  h: number;
  shake = 0;
  constructor(public host: HTMLElement) {
    const r = host.getBoundingClientRect();
    this.W = Math.round(r.width);
    this.H = Math.round(r.height);
    this.w = Math.floor(this.W / D);
    this.h = Math.floor(this.H / D);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.c = document.createElement('canvas');
    this.c.className = 'ev-fx';
    this.c.width = this.W * dpr;
    this.c.height = this.H * dpr;
    host.appendChild(this.c);
    this.x = this.c.getContext('2d')!;
    this.x.scale(dpr, dpr);
    this.x.imageSmoothingEnabled = false;
  }
  clear() { this.x.setTransform(this.x.getTransform().a, 0, 0, this.x.getTransform().d, 0, 0); this.x.clearRect(0, 0, this.W, this.H); if (this.shake) this.x.translate(this.shake * D, 0); }
  R(x: number, y: number, w: number, h: number, col: string) { this.x.fillStyle = col; this.x.fillRect(Math.round(x) * D, Math.round(y) * D, Math.round(w) * D, Math.round(h) * D); }
  box(x: number, y: number, w: number, h: number, fill: string, light?: string, dark?: string) {
    this.R(x, y, w, h, INK); this.R(x + 1, y + 1, w - 2, h - 2, fill);
    if (light) { this.R(x + 1, y + 1, w - 2, 1, light); this.R(x + 1, y + 1, 1, h - 2, light); }
    if (dark) { this.R(x + 1, y + h - 2, w - 2, 1, dark); this.R(x + w - 2, y + 1, 1, h - 2, dark); }
  }
  disc(cx: number, cy: number, rx: number, ry: number, col: string) {
    for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) if ((x * x) / (rx * rx + 0.5) + (y * y) / (ry * ry + 0.5) <= 1) this.R(cx + x, cy + y, 1, 1, col);
  }
  dither(k: number, col: string, x0 = 0, y0 = 0, w = this.w, h = this.h) {
    if (k <= 0) return;
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (BAY[(((y % 4) + 4) % 4) * 4 + (((x % 4) + 4) % 4)] / 16 < k) this.R(x, y, 1, 1, col);
  }
  /** 사방으로 튀었다 떨어지는 불꽃 (감속 → 낙하) */
  sparks(cx: number, cy: number, t: number, t0: number, n = 16, cols = GOLD, spread = 26) {
    if (t < t0 || t > t0 + 800) return;
    for (let i = 0; i < n; i++) {
      const k = outE((t - t0) / 500); const a = rnd(i + n) * Math.PI * 2; const r = 6 + rnd(i) * spread;
      this.R(cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k * 0.8 + inE((t - t0 - 300) / 400) * 12, i % 3 ? 1 : 2, 1, cols[i % cols.length]);
    }
  }
  /** 기물 그림 (72칸 = 72px, 도트 좌표 기준 발밑 가운데) */
  piece(t: PieceType, side: 0 | 1, cx: number, foot: number, size = 72) {
    const i = pieceImg(t, side);
    if (i.complete) this.x.drawImage(i, Math.round(cx * D - size / 2), Math.round(foot * D - size), size, size);
  }
  text(s: string, x: number, y: number, px = 12, col = '#f4f1ea', align: CanvasTextAlign = 'center') {
    this.x.font = `700 ${px}px Galmuri11, sans-serif`;
    this.x.textAlign = align;
    this.x.fillStyle = INK; this.x.fillText(s, x * D + 2, y * D + 2);
    this.x.fillStyle = col; this.x.fillText(s, x * D, y * D);
  }
  /** 카드 한 장 (22×30 도트) — 이름 · 다듬음(+) · 녹(−) · 금 */
  card(x: number, y: number, name: string, o: { plus?: boolean; rust?: boolean; crack?: number; back?: boolean; width?: number } = {}) {
    const w = o.width ?? 22;
    if (o.back) { this.box(x + (22 - w) / 2, y, w, 30, '#3a2a1a', '#5a4028', '#22180e'); if (w > 8) this.R(x + 9, y + 12, 4, 6, '#c89b3c'); return; }
    this.box(x + (22 - w) / 2, y, w, 30, o.rust ? '#4a3020' : '#2a2832', o.rust ? '#6e4a2a' : '#3d3a48', '#1b1922');
    if (w < 14) return;
    this.R(x + 3, y + 8, 16, 12, '#14121a');
    this.R(x + 9, y + 11, 4, 5, '#e9e2d4'); this.R(x + 8, y + 16, 6, 2, '#e9e2d4');
    if (o.rust) this.dither(0.35, '#ae5d2f', x + 1, y + 1, 20, 28);
    if (o.crack) for (let i = 0; i < Math.round(30 * o.crack); i++) this.R(x + 11 + Math.round(Math.sin(i * 1.7) * 2), y + i, 1, 1, INK);
    this.text(name.length > 5 ? name.slice(0, 5) : name, x + 11, y + 6, 12, o.plus ? '#7ee0a1' : o.rust ? '#ff9a8a' : '#f4f1ea');
    if (o.plus) { this.R(x + 17, y + 23, 4, 1, '#7ee0a1'); this.R(x + 18, y + 22, 1, 3, '#7ee0a1'); }
  }
  /** t(ms)를 83ms 계단으로 넘기며 그린다 */
  play(ms: number, draw: (t: number) => void): Promise<void> {
    const dur = calm() ? Math.min(ms, 400) : ms;
    return new Promise((done) => {
      const t0 = performance.now();
      let last = -1;
      const tick = (now: number) => {
        if (!this.c.isConnected) return done();
        const raw = Math.min(dur, now - t0);
        const f = Math.floor(raw / STEP);
        if (f !== last || raw >= dur) { last = f; this.clear(); draw((raw >= dur ? dur : f * STEP) * (ms / dur)); }
        if (raw < dur) requestAnimationFrame(tick); else done();
      };
      requestAnimationFrame(tick);
    });
  }
  /** 손짓: 장면 위 한 줄이 깜빡이고, 장면을 누르면 다음 (6초 뒤 저절로) */
  tap(label?: string, idle?: (t: number) => void): Promise<void> {
    if (!label || calm()) return Promise.resolve();
    return new Promise((done) => {
      const p = document.createElement('button');
      p.type = 'button';
      p.className = 'ev-tap';
      p.textContent = `▼ ${label}`;
      this.host.appendChild(p);
      let over = false;
      const end = () => { if (over) return; over = true; p.remove(); this.host.removeEventListener('pointerdown', end); done(); };
      this.host.addEventListener('pointerdown', end);
      const t0 = performance.now();
      const loop = (now: number) => { if (over || !this.c.isConnected) return; if (idle) { this.clear(); idle(Math.floor((now - t0) / STEP) * STEP); } if (now - t0 > 6000) return end(); requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
    });
  }
  jolt(t: number, t0: number, ms = 160, amp = 2) { this.shake = t >= t0 && t < t0 + ms ? (Math.floor(t / 41) % 2 ? amp : -amp) : 0; }
}

// ── 공용 소품 ──
const coin = (s: Stage, cx: number, cy: number, w: number, face: 'front' | 'back') => {
  // 반지름 12도트 (넓어진 장면에서도 주인공이 되게)
  const r = 12;
  const ww = Math.round((w / 8) * r);
  s.disc(cx, cy, ww + 1, r + 1, INK);
  if (ww <= 1) return s.R(cx, cy - r, 2, r * 2 + 1, '#f4d27a');
  s.disc(cx, cy, ww, r, face === 'front' ? '#f4d27a' : '#c89b3c');
  s.disc(cx - 1, cy - 1, Math.max(1, ww - 3), r - 3, face === 'front' ? '#facc15' : '#a8792c');
  if (ww >= 9 && face === 'front') { s.R(cx - 3, cy - 6, 6, 3, INK); s.R(cx - 5, cy - 3, 5, 6, INK); s.R(cx, cy - 3, 3, 9, INK); s.R(cx + 1, cy - 5, 1, 1, '#fff3c4'); }
  if (ww >= 9 && face === 'back') { s.R(cx - 5, cy - 5, 10, 10, INK); s.R(cx - 3, cy - 3, 6, 6, '#c89b3c'); s.R(cx - 1, cy - 1, 2, 2, INK); }
};
const hammer = (s: Stage, x: number, y: number, ang: number, L = 22) => {
  for (let i = 0; i < L; i++) s.R(x + Math.round(Math.cos(ang) * i), y - Math.round(Math.sin(ang) * i), 2, 2, '#6e4a2a');
  const hx = x + Math.round(Math.cos(ang) * L), hy = y - Math.round(Math.sin(ang) * L);
  s.box(hx - 5, hy - 4, 10, 8, '#6a6e7c', '#9a9eac', '#383c48');
};
const screws = (s: Stage, cx: number, cy: number, t: number, t0: number, n: number, up = true) => {
  if (t < t0) return;
  for (let i = 0; i < n; i++) {
    const k = outE((t - t0 - i * 40) / 500); if (k <= 0) continue;
    const a = (up ? -Math.PI / 2 : Math.PI / 2) + (rnd(i) - 0.5) * 2.2;
    const x = cx + Math.cos(a) * 28 * k, y = cy + Math.sin(a) * 20 * k + inE((t - t0 - 300) / 500) * 26;
    s.R(x, y, 3, 2, '#c8c2b0'); s.R(x + 1, y + 2, 1, 2, '#8a8794');
  }
};
const floor = (s: Stage) => { s.R(0, s.h - 10, s.w, 10, '#1d1a14'); s.R(0, s.h - 10, s.w, 1, INK); };
/** 바닥 띠 (장면 그림을 덜 가리게 아래만) */
const dim = (s: Stage, k = 0.55) => s.dither(k, INK);

type Fx = (s: Stage, c: EvFxCtx) => Promise<void>;
const firstCrew = (c: EvFxCtx): PieceType => c.diff.gone[0] ?? c.diff.changed[0]?.from ?? 'P';

const FX: Record<string, Fx> = {
  /** 동전 나이트: 튕긴다 → 5장 회전 → 떨어져 찌그러짐 → 앞/뒤 → 나사가 튀거나 빨려 감 */
  async gambler(s, c) {
    const cx = s.w / 2, g = s.h - 24;
    await s.tap(c.tap, (t) => { dim(s); coin(s, cx, g + (Math.floor(t / 400) % 2), 8, 'front'); });
    const face = c.good ? 'front' : 'back';
    await s.play(2200, (t) => {
      dim(s);
      let y = g, w = 8, f: 'front' | 'back' = 'front';
      if (t < 1100) { const k = t / 1100; y = g - Math.round(Math.sin(k * Math.PI) * (s.h - 30)); w = [8, 6, 1, 6, 8][Math.floor(t / 70) % 5]; f = Math.floor(t / 140) % 2 ? 'back' : 'front'; }
      else if (t < 1180) { w = 10; y = g + 1; f = face; } else { f = face; y = t < 1260 ? g - 2 : g; }
      s.R(cx - 10, g + 14, 20, 2, '#0e0c08');
      coin(s, cx, y, w, f);
      s.jolt(t, 1100, 120, 1);
      if (c.good) { s.sparks(cx, g, t, 1300); screws(s, cx, g, t, 1300, 6); }
      else if (t > 1300) for (let i = 0; i < 5; i++) { const k = inE((t - 1300 - i * 60) / 500); s.R(cx + (i - 2) * 6 + k * (s.w / 2), g - 6 - k * 10, 3, 2, '#c8c2b0'); }
      if (t > 1300) s.text(c.good ? '앞면!' : '뒷면', cx, 14, 24, c.good ? '#f4d27a' : '#ff9a8a');
    });
  },
  /** 견습 폰: 망치가 비틀대며 오름(누르면 내리침) → 성공 = 「+」 불꽃 / 실패 = 금 가고 갈라짐 */
  async apprentice(s, c) {
    const cx = s.w / 2 - 11, cy = s.h / 2 - 12;
    const anvil = () => { s.R(cx - 8, cy + 30, 38, 6, '#383c48'); s.R(cx - 4, cy + 36, 30, 8, '#2a2c36'); s.R(cx - 8, cy + 30, 38, 1, '#6a6e7c'); };
    const name = c.diff.cardsIn[0] ?? c.diff.cardsOut[0] ?? '카드';
    await s.tap(c.tap, (t) => { dim(s); anvil(); s.card(cx, cy, name.replace(/\+$/, '')); hammer(s, cx + 34, cy + 22, 0.9 + st(t / 1200, 6) * 0.6 + (Math.floor(t / 160) % 2 ? 0.1 : -0.1)); });
    await s.play(1800, (t) => {
      dim(s); anvil();
      const ang = t < 100 ? 1.5 - st(t / 100, 2) * 1.4 : 0.1;
      const k = !c.good && t > 120 ? st((t - 120) / 500, 5) : 0;
      if (k) { const d = Math.round(k * 8); s.card(cx - d, cy + Math.round(inE((t - 120) / 800) * 20), name, { crack: 1 }); s.dither(k * 0.9, '#14121a', cx - d - 2, cy - 2, 26, 40); s.card(cx + d, cy + Math.round(inE((t - 120) / 700) * 24), name, { crack: 1 }); s.dither(k * 0.9, '#14121a', cx + d - 2, cy - 2, 26, 40); }
      else s.card(cx, cy, c.good && t > 120 ? `${name.replace(/\+$/, '')}` : name.replace(/\+$/, ''), { plus: c.good && t > 120 });
      hammer(s, cx + 34, cy + 22, ang);
      s.jolt(t, 100, 160, 2);
      if (c.good) s.sparks(cx + 11, cy + 14, t, 100, 20); else s.sparks(cx + 11, cy + 14, t, 100, 12, ['#6a6e7c', '#a8a2b0', '#383c48']);
      if (t > 300) s.text(c.good ? '태엽 −1' : '부서졌다', s.w / 2, 14, 24, c.good ? '#7ee0a1' : '#ff9a8a');
    });
  },
  /** 쓰러진 뽑기 기계: 레버 → 세 바퀴(누를 때마다 하나씩 선다) → 캡슐이 떨어져 두 쪽으로 */
  async brokenGacha(s, c) {
    const mx = Math.round(s.w / 2 - 26), my = 8;
    const sym = ['part', 'up', 'miss'] as const;
    const pick = c.diff.changed.length ? 'up' : c.good ? 'part' : 'miss';
    const symDraw = (kind: (typeof sym)[number], x: number, y: number) => {
      s.box(x, y, 12, 12, '#1b1922');
      if (kind === 'part') { s.disc(x + 6, y + 6, 3, 3, '#c89b3c'); s.R(x + 5, y + 1, 2, 10, '#c89b3c'); s.R(x + 1, y + 5, 10, 2, '#c89b3c'); }
      if (kind === 'up') for (let i = 0; i < 4; i++) s.R(x + 6 - i, y + 2 + i, 1 + i * 2, 1, '#38bdf8');
      if (kind === 'miss') for (let i = 0; i < 8; i++) { s.R(x + 2 + i, y + 2 + i, 1, 1, '#e5262f'); s.R(x + 9 - i, y + 2 + i, 1, 1, '#e5262f'); }
    };
    const body = (lever: number) => { s.box(mx, my, 52, 60, '#7a2a20', '#a8442e', '#4a1a14'); s.box(mx + 4, my + 6, 44, 18, '#14121a'); s.R(mx + 18, my + 40, 16, 14, INK); s.R(mx + 54, my + 16 + lever, 2, 14, INK); s.disc(mx + 55, my + 14 + lever, 2, 2, '#e5262f'); };
    const stops = [false, false, false];
    const reels = (t: number) => sym.forEach((_, r) => { const x = mx + 7 + r * 14; if (stops[r]) symDraw(pick, x, my + 9); else { symDraw(sym[(Math.floor(t / 60) + r) % 3], x, my + 9 + ((Math.floor(t / 60) % 2) ? -2 : 2)); s.dither(0.4, INK, x, my + 7, 12, 16); } });
    await s.play(400, (t) => { dim(s); body(st(t / 400, 3) * 8); reels(t); });
    for (let r = 0; r < 3; r++) { await s.tap(c.tap && `${c.tap} (${r + 1}/3)`, (t) => { dim(s); body(0); reels(t); }); stops[r] = true; await s.play(200, (t) => { dim(s); body(0); reels(t); s.jolt(t, 0, 80, 1); }); }
    await s.play(1600, (t) => {
      dim(s); body(0); reels(t);
      const cy = t < 300 ? my + 46 + st(t / 300, 3) * 14 : my + 62;
      const open = t > 500 ? st((t - 500) / 160, 2) * 6 : 0;
      s.disc(mx + 26 - open, cy, 5, 5, INK); s.disc(mx + 26 - open, cy, 4, 4, '#38bdf8'); s.disc(mx + 26 + open, cy, 5, 5, INK); s.disc(mx + 26 + open, cy, 4, 4, '#f4f1ea');
      if (open && pick !== 'miss') symDraw(pick, mx + 20, cy - 16 - st((t - 500) / 200, 3) * 4);
      if (pick !== 'miss') s.sparks(mx + 26, cy - 8, t, 560, 18); else s.sparks(mx + 26, cy - 4, t, 560, 8, ['#5a5462', '#383c48']);
      if (t > 700) s.text(pick === 'part' ? '부품!' : pick === 'up' ? '승급!' : '꽝', s.w / 2, s.h - 4, 24, pick === 'miss' ? '#ff9a8a' : '#f4d27a');
    });
  },
  /** 고철 경매: 호가가 오르고 망치 세 번(누를 때마다) → 낙찰 → 상자가 열려 빛나거나 먼지 */
  async auction(s, c) {
    const cx = s.w / 2;
    const podium = () => { s.box(cx - 24, s.h - 30, 48, 22, '#3a2a1a', '#5a4028', '#22180e'); s.R(cx - 24, s.h - 24, 48, 2, '#c89b3c'); };
    for (const [i, w] of ['하나', '둘', '낙찰!'].entries()) {
      await s.tap(c.tap && `${c.tap} (${i + 1}/3)`, (t) => { dim(s); podium(); hammer(s, cx + 22, s.h - 30, 1.2 + (Math.floor(t / 200) % 2 ? 0.1 : 0)); s.text(`호가 ${60}`, cx, 12, 24, '#f4d27a'); });
      await s.play(320, (t) => { dim(s); podium(); hammer(s, cx + 22, s.h - 30, t < 80 ? 1.3 - st(t / 80, 2) * 1.2 : 0.1); s.jolt(t, 80, 120, i === 2 ? 2 : 1); s.text(w, cx, 12 + 8, i === 2 ? 24 : 12, i === 2 ? '#e5262f' : '#f4f1ea'); s.sparks(cx + 2, s.h - 30, t, 80, 8); });
    }
    await s.play(1400, (t) => {
      dim(s); const x = cx - 14, y = s.h / 2 - 8;
      s.box(x, y, 28, 18, '#6e4a2a', '#8a6038', '#4a3018'); s.R(x, y + 6, 28, 2, '#c89b3c');
      const lid = t < 300 ? (Math.floor(t / 80) % 2 ? -1 : 0) : -6 - st((t - 300) / 200, 2) * 6;
      s.box(x - 2, y - 6 + lid, 32, 7, '#7a5430', '#9a6a3a', '#4a3018');
      if (t > 360) { if (c.good) { s.sparks(cx, y - 4, t, 360, 22); s.disc(cx, y - 8 - st((t - 360) / 300, 3) * 6, 4, 4, '#c89b3c'); } else for (let i = 0; i < 10; i++) { const k = outE((t - 360) / 600); s.R(cx + (rnd(i) - 0.5) * 30 * k, y - 4 - rnd(i + 3) * 14 * k, 2, 2, '#5a5462'); } }
      if (t > 600) s.text(c.good ? '부품이 빛난다' : '빈 상자', cx, 12, 24, c.good ? '#f4d27a' : '#ff9a8a');
    });
  },
  /** 쇳물 담금질: 사슬이 계단으로 내려가 잠김(거품 · 김) → 누르면 끌어올림 → 달아오른 새 기물 | 빈 사슬 */
  async dipping(s, c) {
    const cx = s.w / 2, pool = s.h - 22;
    const from = c.diff.changed[0]?.from ?? c.diff.gone[0] ?? 'P';
    const to = c.diff.changed[0]?.to;
    const crucible = (t: number) => { s.box(cx - 30, pool, 60, 20, '#2a1d1c', '#442b2b', '#1a0f0c'); s.R(cx - 27, pool + 2, 54, 4, '#ff8a3a'); s.R(cx - 27, pool + 2, 54, 1, '#ffb35a'); for (let i = 0; i < 4; i++) { const f = Math.floor(t / 120) + i * 3; if (rnd(f) > 0.5) s.disc(cx - 22 + rnd(f + 1) * 44, pool + 3, 1, 1, '#ffb35a'); } };
    const chain = (len: number) => { for (let y = 0; y < len; y += 3) s.R(cx, y, 1, 2, '#6a6e7c'); };
    await s.play(900, (t) => { dim(s); crucible(t); const y = 18 + st(t / 900, 6) * (pool - 18); chain(y - 22); s.piece(from, 0, cx, y + 4); s.R(cx - 30, pool + 2, 60, 18, '#2a1d1c'); crucible(t); });
    await s.tap(c.tap, (t) => { dim(s); chain(pool - 18); crucible(t); for (let i = 0; i < 6; i++) { const ph = (t + i * 90) % 600; s.R(cx - 14 + rnd(i) * 28, pool - ph / 30, 2, 2, ph < 300 ? '#a8a2b0' : '#5a5462'); } });
    await s.play(1400, (t) => {
      dim(s); const y = pool - st(t / 500, 5) * (pool - 30); chain(y - 22);
      if (c.good && to) { const glow = t > 500 && t < 1100 && Math.floor(t / 83) % 2; s.piece(to, 0, cx, y + 4); if (glow) s.dither(0.3, '#ff8a3a', cx - 12, y - 20, 24, 24); s.sparks(cx, y - 8, t, 500, 18, ['#ffb35a', '#ff8a3a', '#fff3c4']); }
      else if (t > 500) for (let i = 0; i < 4; i++) s.R(cx - 1, y + 2 + ((t / 40 + i * 6) % 20), 2, 2, '#ff8a3a');
      crucible(t);
      if (t > 600) s.text(c.good ? '다시 선다' : '삼켜졌다', cx, 12, 24, c.good ? '#f4d27a' : '#ff9a8a');
    });
  },
  /** 조는 검수 저울: Z가 오르는 동안 누르면 도장 → 승인(폰이 나이트로) | 저울 눈이 붉게 뜸 · 나사가 빨려 감 */
  async napping(s, c) {
    const cx = s.w / 2;
    const scale = (eye: boolean) => { s.R(cx - 2, 16, 4, 30, '#6a6e7c'); s.R(cx - 26, 16, 52, 2, '#9a9eac'); s.R(cx - 28, 28, 16, 2, '#9a9eac'); s.R(cx + 12, 28, 16, 2, '#9a9eac'); s.box(cx - 8, 46, 16, 8, '#383c48'); s.R(cx - 4, 10, 8, 6, eye ? '#e5262f' : '#383c48'); if (!eye) s.R(cx - 3, 13, 6, 1, INK); };
    const paper = (stamp: number) => { s.box(cx - 30, s.h - 26, 26, 18, '#e9e2d4', '#fff', '#b8ae9c'); for (let i = 0; i < 3; i++) s.R(cx - 26, s.h - 22 + i * 4, 16, 1, '#8a8794'); if (stamp) { s.R(cx - 24, s.h - 20, 14, 8, '#e5262f'); s.R(cx - 22, s.h - 18, 10, 4, '#e9e2d4'); } };
    const zs = (t: number) => { for (let i = 0; i < 3; i++) { const ph = ((t + i * 400) % 1200) / 1200; s.text('Z', cx + 10 + ph * 14, 10 - ph * 6 + 4, 12, '#a8a2b0', 'left'); } };
    await s.tap(c.tap, (t) => { dim(s); scale(false); paper(0); zs(t); s.box(cx - 22, s.h - 44 - (Math.floor(t / 300) % 2) * 2, 10, 12, '#7a1e22', '#a8282e'); });
    await s.play(1800, (t) => {
      dim(s); const eye = !c.good && t > 300; scale(eye); paper(t > 120 ? 1 : 0);
      s.box(cx - 22, s.h - 44 + st(t / 120, 2) * 16, 10, 12, '#7a1e22', '#a8282e');
      s.jolt(t, 120, 120, 1);
      if (c.good) { if (t > 400) { s.piece(t < 900 && Math.floor(t / 83) % 2 ? 'P' : 'N', 0, cx + 26, s.h - 6); s.sparks(cx + 26, s.h - 20, t, 900, 14); } s.text('승인', cx, s.h - 2, 12, '#f4d27a'); }
      else { s.jolt(t, 300, 300, 2); if (t > 300) s.text('!', cx, 8, 24, '#e5262f'); for (let i = 0; i < 6; i++) { const k = inE((t - 500 - i * 50) / 500); if (k > 0) s.R(cx + 24 - k * 24, s.h - 14 - k * 30, 3, 2, '#c8c2b0'); } }
    });
  },
  /** 녹슨 금고: 다섯 번 내리친다(금이 자람 · 흔들림) → 열리며 나사가 쏟아지고 붉은 베임 */
  async safe(s, c) {
    const cx = s.w / 2, cy = s.h / 2;
    const safeDraw = (cracks: number, open = 0) => { s.box(cx - 22, cy - 18, 44, 36, '#5a4a3a', '#7a6650', '#3a2e22'); s.dither(0.3, '#ae5d2f', cx - 21, cy - 17, 42, 34); s.disc(cx + 8, cy, 5, 5, '#383c48'); s.R(cx + 7, cy - 4, 2, 8, '#9a9eac'); for (let i = 0; i < cracks * 6; i++) s.R(cx - 10 + Math.round(Math.sin(i * 1.3) * 3), cy - 16 + i, 1, 1, INK); if (open) { s.R(cx - 21, cy - 17, 42, 34, '#14121a'); for (let i = 0; i < 40; i++) s.R(cx - 18 + (i % 10) * 4 - (Math.floor(i / 10) % 2) * 2, cy + 12 - Math.floor(i / 10) * 3, 3, 2, i % 3 ? '#c8c2b0' : '#f4d27a'); s.box(cx - 22 - open * 20, cy - 18, 8, 36, '#5a4a3a', '#7a6650'); } };
    for (let n = 0; n < 5; n++) {
      await s.tap(c.tap && `${c.tap} (${n + 1}/5)`, (t) => { dim(s); safeDraw(n); hammer(s, cx - 34, cy + 16, 1.2 + (Math.floor(t / 200) % 2 ? 0.1 : 0)); });
      await s.play(200, (t) => { dim(s); safeDraw(n + 1); hammer(s, cx - 34, cy + 16, t < 60 ? 1.2 - st(t / 60, 2) * 1 : 0.2); s.jolt(t, 60, 120, 1 + Math.floor(n / 2)); s.sparks(cx - 18, cy, t, 60, 6, ['#ffb35a', '#9a9eac']); });
    }
    await s.play(1600, (t) => {
      dim(s); safeDraw(5, st(t / 200, 2)); s.jolt(t, 0, 200, 3);
      screws(s, cx, cy, t, 200, 14);
      if (t > 600 && t < 900) for (let i = 0; i < 20; i++) s.R(cx - 30 + i * 3, cy + 10 - i, 2, 1, '#e5262f');
      if (t > 600) { s.text(`나사 +${c.diff.gold}`, cx, 12, 24, '#f4d27a'); s.text('HP −25%', cx, s.h - 2, 12, '#ff9a8a'); }
    });
  },
  /** 땜장이: 세 번 땜질(누를 때마다 불꽃) → 문턱 톱니 하나가 박힌다 */
  async tinker(s, c) {
    const cx = s.w / 2, foot = s.h - 12;
    const t0 = c.diff.changed[0]?.to ?? 'P';
    for (let n = 0; n < 3; n++) {
      await s.tap(c.tap && `${c.tap} (${n + 1}/3)`, () => { dim(s); s.piece(t0, 0, cx, foot); });
      await s.play(300, (t) => { dim(s); s.piece(t0, 0, cx, foot); s.sparks(cx, foot - 4, t, 0, 14, ['#ffb35a', '#fff3c4', '#38bdf8']); s.jolt(t, 0, 80, 1); });
    }
    await s.play(1200, (t) => { dim(s); s.piece(t0, 0, cx, foot); const y = 10 + st(t / 300, 3) * (foot - 40); s.disc(cx + 16, y, 5, 5, INK); s.disc(cx + 16, y, 4, 4, '#c89b3c'); s.R(cx + 15, y - 1, 2, 2, INK); s.sparks(cx + 16, y, t, 300, 14); if (t > 400) s.text('문턱 +1', cx, 12, 24, '#f4d27a'); });
  },
  /** 정비 폰: 카드가 뒤집혀 돌고 렌치가 돈다 → 「+」 */
  async smith(s, c) {
    const cx = Math.round(s.w / 2 - 11), cy = Math.round(s.h / 2 - 15);
    const name = (c.diff.cardsIn[0] ?? '카드').replace(/\+$/, '');
    await s.play(2000, (t) => {
      dim(s);
      const f = Math.floor(t / 83);
      if (t < 900) s.card(cx, cy, name, { back: f % 6 < 3, width: [22, 14, 4, 4, 14, 22][f % 6] });
      else s.card(cx, cy, name, { plus: true });
      const a = t / 150; for (let i = 0; i < 4; i++) s.R(cx + 11 + Math.cos(a + i * 1.57) * 18, cy + 15 + Math.sin(a + i * 1.57) * 18, 2, 2, '#9a9eac');
      s.sparks(cx + 11, cy + 15, t, 900, 18);
      if (t > 1000) s.text('태엽 −1', s.w / 2, 12, 24, '#7ee0a1');
    });
  },
  /** 흑 비숍: 분대원이 계단으로 걸어가 상자에 실린다 → 뚜껑이 닫히고 나사가 날아온다 */
  async scout(s, c) {
    const t0 = firstCrew(c), foot = s.h - 12;
    await s.play(2200, (t) => {
      dim(s); floor(s);
      const x = 18 + st(t / 1200, 8) * (s.w - 46);
      s.box(s.w - 30, foot - 22, 26, 22, '#2a1d1c', '#442b2b', '#14121a'); s.R(s.w - 22, foot - 14, 10, 6, '#e5262f');
      if (t < 1300) s.piece(t0, 0, x, foot - (Math.floor(t / 166) % 2));
      if (t > 1300) s.box(s.w - 32, foot - 26 + (t < 1400 ? -4 : 0), 30, 6, '#3a2a28', '#5a4038');
      s.jolt(t, 1400, 120, 1);
      screws(s, s.w - 17, foot - 26, t, 1500, 10);
      if (t > 1500) s.text(`나사 +${c.diff.gold}`, s.w / 2, 12, 24, '#f4d27a');
    });
  },
  /** 야간 교대: 모루 위에서 세 번 쾅(누를 때마다) → 분대 머리 위로 초록 + */
  async nightShift(s, c) {
    const cx = s.w / 2, ay = s.h - 26;
    const anvil = () => { s.R(cx - 18, ay, 36, 6, '#383c48'); s.R(cx - 12, ay + 6, 24, 10, '#2a2c36'); s.R(cx - 18, ay, 36, 1, '#ff8a3a'); };
    for (let n = 0; n < 3; n++) {
      await s.tap(c.tap && `${c.tap} (${n + 1}/3)`, (t) => { dim(s); anvil(); hammer(s, cx + 16, ay - 2, 1.3 + (Math.floor(t / 200) % 2 ? 0.1 : 0)); });
      await s.play(260, (t) => { dim(s); anvil(); hammer(s, cx + 16, ay - 2, t < 70 ? 1.3 - st(t / 70, 2) * 1.2 : 0.1); s.jolt(t, 70, 100, 1); s.sparks(cx, ay - 2, t, 70, 14, ['#ffb35a', '#ff8a3a', '#fff3c4']); });
    }
    await s.play(1200, (t) => { dim(s); anvil(); for (let i = 0; i < 4; i++) { const k = st((t - i * 80) / 400, 4); const x = 14 + i * ((s.w - 28) / 3); s.R(x - 1, 20 - k * 8, 3, 7, '#7ee0a1'); s.R(x - 3, 22 - k * 8, 7, 3, '#7ee0a1'); } if (t > 300) s.text('HP +50%', cx, s.h - 2, 12, '#7ee0a1'); });
  },
  /** 쇳물 앞의 거래: 분대원이 쇳물에 계단으로 가라앉음 → 그림자 손이 빛나는 부품을 내민다 */
  async pact(s, c) {
    const t0 = firstCrew(c), cx = s.w / 2, pool = s.h - 20;
    await s.play(2400, (t) => {
      dim(s, 0.65);
      s.R(0, pool, s.w, 20, '#5a1c10'); s.R(0, pool, s.w, 2, '#ff8a3a'); s.dither(0.3, '#ae5d2f', 0, pool + 2, s.w, 18);
      if (t < 1100) { s.piece(t0, 0, cx, pool + st(t / 1100, 6) * 24); s.R(0, pool + 2, s.w, 18, '#5a1c10'); s.R(0, pool, s.w, 2, '#ff8a3a'); }
      for (let i = 0; i < 6; i++) { const f = Math.floor(t / 120) + i * 5; if (rnd(f) > 0.4) s.disc(cx - 20 + rnd(f + 1) * 40, pool + 1, 1, 1, '#ffb35a'); }
      if (t > 1300) { const k = st((t - 1300) / 400, 4); const y = pool - k * 26; s.R(cx - 2, y, 4, pool - y, '#14121a'); s.R(cx - 5, y - 3, 10, 4, '#14121a'); s.disc(cx, y - 7, 4, 4, '#c89b3c'); if (Math.floor(t / 83) % 2) s.disc(cx, y - 7, 2, 2, '#fff3c4'); s.sparks(cx, y - 7, t, 1700, 16); }
      if (t > 1800) s.text('부품 하나', cx, 12, 24, '#f4d27a');
    });
  },
  /** 부품 교환상: 폰 둘이 손수레에 올라 실려 가고, 나이트가 뛰어내린다 */
  async swapDealer(s) {
    const foot = s.h - 12, cart = s.w - 34;
    await s.play(2400, (t) => {
      dim(s); floor(s);
      s.box(cart, foot - 12, 30, 10, '#6e4a2a', '#8a6038', '#4a3018'); s.disc(cart + 6, foot - 1, 3, 3, INK); s.disc(cart + 24, foot - 1, 3, 3, INK);
      [0, 1].forEach((i) => { const k = st((t - i * 300) / 800, 6); const x = 16 + i * 14 + k * (cart + 8 - 16 - i * 14); if (t < 1300 + i * 100) s.piece('P', 0, x, foot - 12 * (k >= 1 ? 1 : 0) - (Math.floor(t / 166 + i) % 2)); });
      if (t > 1400) { const k = st((t - 1400) / 400, 4); s.piece('N', 0, cart + 15 - k * 40, foot - 12 + k * 12 - Math.round(Math.sin(k * Math.PI) * 14)); s.jolt(t, 1800, 100, 1); if (t > 1800) for (let i = 0; i < 6; i++) { const kk = outE((t - 1800) / 400); s.R(cart - 25 + (i - 2.5) * 6 * kk, foot - 2 - kk * 3, 2, 2, '#5a5462'); } }
      if (t > 1900) s.text('나이트 +1', s.w / 2, 12, 24, '#f4d27a');
    });
  },
  /** 저울추: 고른 카드가 왼쪽 접시에 떨어지고 저울이 기운다 → 오른쪽 카드가 녹슨다 */
  async counterweight(s, c) {
    const cx = s.w / 2;
    const name = (c.diff.cardsIn.find((n) => n.endsWith('+')) ?? c.diff.cardsIn[0] ?? '카드').replace(/[+−]$/, '');
    const rust = (c.diff.cardsIn.find((n) => n.endsWith('−')) ?? '').replace(/[+−]$/, '');
    await s.play(2600, (t) => {
      dim(s);
      const tilt = t < 700 ? 0 : st((t - 700) / 300, 3) * 8;
      s.R(cx - 1, 14, 2, s.h - 20, '#6a6e7c'); s.box(cx - 8, s.h - 8, 16, 6, '#383c48');
      for (let i = -24; i <= 24; i++) s.R(cx + i, 14 + Math.round((i / 24) * -tilt * 0.6), 1, 1, '#9a9eac');
      const ly = 34 + tilt * 0.6, ry = 34 - tilt * 0.6;
      s.R(cx - 34, ly + 30, 22, 2, '#9a9eac'); s.R(cx + 12, ry + 30, 22, 2, '#9a9eac');
      const drop = t < 600 ? -30 + st(t / 600, 4) * 30 : 0;
      s.card(cx - 34, ly + drop, name, { plus: t > 700 });
      if (rust) s.card(cx + 12, ry, rust, { rust: t > 1200 });
      s.jolt(t, 700, 120, 1);
      if (t > 1200 && t < 1700) s.dither(st((t - 1200) / 500, 4) * 0.5, '#ae5d2f', cx + 12, ry, 22, 30);
      if (t > 900) s.text('태엽 −1', cx - 23, 10, 12, '#7ee0a1');
      if (t > 1400 && rust) s.text('태엽 +1', cx + 23, 10, 12, '#ff9a8a');
    });
  },
  /** 거꾸로 도는 컨베이어: 카드 둘이 왼쪽으로 실려 가고, 새 카드 둘이 오른쪽에서 들어온다 */
  async conveyor(s, c) {
    const belt = s.h - 18;
    await s.play(2600, (t) => {
      dim(s);
      s.R(0, belt, s.w, 6, '#2a2c36'); for (let x = -(Math.floor(t / 83) % 6); x < s.w; x += 6) s.R(x, belt + 2, 3, 2, '#5a5462');
      c.diff.cardsOut.slice(0, 2).forEach((n, i) => { const x = s.w / 2 - 26 + i * 28 - st(t / 1200, 10) * (s.w / 2 + 30); s.card(x, belt - 31, n); });
      c.diff.cardsIn.slice(0, 2).forEach((n, i) => { const x = s.w + 4 + i * 28 - st((t - 900) / 1200, 10) * (s.w / 2 + 30); if (t > 900) s.card(x, belt - 31, n); });
      if (t > 2100) { s.sparks(s.w / 2, belt - 16, t, 2100, 16); s.text('바뀌어 나왔다', s.w / 2, 12, 24, '#f4d27a'); }
    });
  },
};

/**
 * 사건 장치를 돌린다. 장면 칸(host)에 캔버스를 덮고, 끝나면 마지막 장을 남긴 채 돌아온다 (그림이 바뀐 채로 남는다).
 * 결과가 좋으면 장면 테가 금빛, 나쁘면 붉게 (CSS 클래스).
 */
export const runEventFx = async (host: HTMLElement, c: EvFxCtx): Promise<void> => {
  host.querySelector('.ev-fx')?.remove();
  const fx = FX[c.id];
  if (!fx) return;
  const s = new Stage(host);
  host.classList.add('fx-on');
  await fx(s, c);
  s.shake = 0;
  host.classList.add(c.good ? 'fx-good' : 'fx-bad');
};
