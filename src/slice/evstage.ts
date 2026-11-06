/**
 * 사건 무대 연출 (D-248 → D-249): 사건 그림 위에 도트 FX 층(pxfx — 색 + 빛 두 버퍼, 입자 · 빛 · 디더)과 선명한 층(기물 · 글씨)을 덮고,
 * 사건마다 다른 장치를 돌린다. 장치는 단계 램프 음영(왼위 빛 · 오른아래 그림자) + 1칸 검은 테, 효과는 불꽃 · 불 · 연기 · 파편 · 플레어 빛.
 * 결과는 엔진(events.ts)이 이미 정했다 — 보여 주기만 한다. 누르기(tap)는 손맛용.
 */
import type { PieceType } from '../engine';
import { assemblyJudge, sealScrape } from './minigames';
import { bay, block, fill as pf, INK as PINK, M, rivet, verdict, type VerdictKind } from '../view/pxkit';
import { at, bayer, FxCanvas, hex, Lights, mix, OUTLINE, P, PAL, Painter, Particles, Rng, scale, WHITE, type Col } from '../view/pxfx';

const D = 3;
const INK = OUTLINE;
const q = (v: number) => Math.max(0, Math.min(1, v));
const outE = (v: number) => 1 - Math.pow(1 - q(v), 3);
const inE = (v: number) => Math.pow(q(v), 3);
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

/** 소품 도트 에셋 (tools/pixel/props.py → public/ui/props/) */
const propImgs = new Map<string, HTMLImageElement>();
const propImg = (n: string): HTMLImageElement => {
  let i = propImgs.get(n);
  if (!i) { i = new Image(); i.src = `ui/props/${n}.png`; propImgs.set(n, i); }
  return i;
};
/** 동전 회전 12장 (D-257, tools/pixel/coinflip.py): 세로축 30°마다 — 0 앞면 · 3 옆면 · 6 뒷면 · 9 옆면 */
const COIN_N = 12;
for (let i = 0; i < COIN_N; i++) propImg(`flip-${i}`);
const pieceImgs = new Map<string, HTMLImageElement>();
const pieceImg = (t: PieceType, side: 0 | 1): HTMLImageElement => {
  const k = `${t}${side}`;
  let i = pieceImgs.get(k);
  if (!i) { i = new Image(); i.src = `pieces/l-${k}.png`; pieceImgs.set(k, i); }
  return i;
};
(['K', 'Q', 'R', 'B', 'N', 'P'] as PieceType[]).forEach((t) => { pieceImg(t, 0); pieceImg(t, 1); });

/** 선명한 층에 올릴 것 (매 장 다시 그린다) */
interface HiItem { sprite?: { n: string; x: number; y: number; k: number; flip?: boolean }; piece?: { t: PieceType; x: number; foot: number; size?: number; clip?: number }; text?: { s: string; x: number; y: number; px: number; col: string } }

/** 무대: 도트 FX 층 + 선명한 층 + 공용 입자 · 빛 */
class Stage {
  fx: FxCanvas;
  hi: HTMLCanvasElement;
  hx: CanvasRenderingContext2D;
  w: number;
  h: number;
  floor: number;
  R: Rng;
  ps: Particles;
  lights: Lights;
  shake = 0;
  items: HiItem[] = [];
  private shown = false;
  constructor(public host: HTMLElement, seed: number) {
    // 테(9-slice 패널) 안쪽만 — 캔버스는 안쪽 칸을 채운다
    const r = { width: host.clientWidth, height: host.clientHeight };
    this.w = Math.floor(r.width / D);
    this.h = Math.floor(r.height / D);
    this.floor = this.h - 8;
    this.fx = new FxCanvas(this.w, this.h, D);
    this.fx.canvas.className = 'ev-fx';
    host.appendChild(this.fx.canvas);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.hi = document.createElement('canvas');
    this.hi.className = 'ev-fx ev-hi';
    this.hi.width = Math.round(r.width * dpr);
    this.hi.height = Math.round(r.height * dpr);
    host.appendChild(this.hi);
    this.hx = this.hi.getContext('2d')!;
    this.hx.scale(dpr, dpr);
    this.hx.imageSmoothingEnabled = false;
    this.R = new Rng(seed);
    this.ps = new Particles(this.R, () => this.floor);
    this.lights = new Lights();
  }
  /** 선명한 층: 기물 · 글씨 */
  /** clip: 이 도트 줄 아래는 그리지 않는다 (쇳물에 잠김) */
  piece(t: PieceType, x: number, foot: number, size = 72, clip?: number) { this.items.push({ piece: { t, x, foot, size, clip } }); }
  text(s: string, x: number, y: number, px = 24, col = '#f4f1ea') { this.items.push({ text: { s, x, y, px, col } }); }
  /** 소품 에셋 (1도트 = 3px, 왼위 모서리 도트 좌표) */
  sprite(n: string, x: number, y: number, k = 1, flip = false) { this.items.push({ sprite: { n, x, y, k, flip } }); }
  private paintHi() {
    const x = this.hx;
    x.clearRect(0, 0, this.w * D, this.h * D);
    for (const it of this.items) {
      if (it.sprite) {
        const i = propImg(it.sprite.n), sp = it.sprite;
        if (i.complete) {
          const w = i.naturalWidth * D * sp.k, h = i.naturalHeight * D * sp.k, ax = Math.round((sp.x + this.shake) * D), ay = Math.round(sp.y * D);
          if (sp.flip) { x.save(); x.translate(ax + w, ay); x.scale(-1, 1); x.drawImage(i, 0, 0, w, h); x.restore(); } else x.drawImage(i, ax, ay, w, h);
        }
      }
      if (it.piece) {
        const i = pieceImg(it.piece.t, 0), sz = it.piece.size ?? 72, top = Math.round(it.piece.foot * D - sz);
        const vis = it.piece.clip === undefined ? sz : Math.max(0, Math.min(sz, it.piece.clip * D - top));
        if (i.complete && vis > 0) x.drawImage(i, 0, 0, i.naturalWidth, (i.naturalHeight * vis) / sz, Math.round(it.piece.x * D - sz / 2 + this.shake * D), top, sz, vis);
      }
      if (it.text) {
        x.font = `700 ${it.text.px}px Galmuri11, sans-serif`;
        x.textAlign = 'center';
        x.fillStyle = '#0b0b0e';
        x.fillText(it.text.s, it.text.x * D + 3 + this.shake * D, it.text.y * D + 3);
        x.fillStyle = it.text.col;
        x.fillText(it.text.s, it.text.x * D + this.shake * D, it.text.y * D);
      }
    }
    this.items = [];
  }
  /** ms 동안: draw(t초, painter)로 도트 층을, 그 안에서 piece/text로 선명한 층을 */
  play(ms: number, draw: (t: number, p: Painter) => void, sim?: (dt: number, t: number) => void): Promise<void> {
    return this.fx.run(
      ms,
      (dt, t) => { this.ps.update(dt); this.lights.update(dt); sim?.(dt, t); },
      (t, p) => {
        // 흔들림: 도트 층은 칸 단위로 통째로 민다
        draw(t, p);
        this.ps.draw(p, 'back');
        this.ps.draw(p, 'front');
        this.lights.draw(p);
        if (this.shake) { const f = this.fx.frame; const s = Math.round(this.shake); const c = f.color.slice(), l = f.light.slice(); f.color.fill(0); f.light.fill(0); for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) { const nx = x + s; if (nx >= 0 && nx < f.w) { f.color[y * f.w + nx] = c[y * f.w + x]; f.light[y * f.w + nx] = l[y * f.w + x]; } } }
        this.paintHi();
      },
    );
  }
  /** 손짓: 장면 위 한 줄이 깜빡이고 장면을 누르면 다음 (6초 뒤 저절로). idle이 그동안 그린다 */
  tap(label: string | undefined, idle: (t: number, p: Painter) => void): Promise<void> {
    if (!label || calm()) return Promise.resolve();
    return new Promise((done) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ev-tap';
      b.textContent = `▼ ${label}`;
      this.host.appendChild(b);
      let over = false;
      const end = () => { if (over) return; over = true; b.remove(); this.host.removeEventListener('pointerdown', end); };
      this.host.addEventListener('pointerdown', end);
      const loop = (): void => { void this.play(250, idle).then(() => { if (over || !this.host.isConnected) return done(); loop(); }); };
      loop();
      window.setTimeout(end, 6000);
    });
  }
  /** 결과 알림 (D-259): 판결 명패 하나 — t가 t0를 넘는 첫 장에 한 번만 떨어진다 */
  verdictAt(t: number, t0: number, text: string, kind: VerdictKind, sub?: string) {
    if (this.shown || t < t0) return;
    this.shown = true;
    void verdict(this.host, text, kind, { sub, top: 4 });
  }
  jolt(t: number, t0: number, ms = 0.16, amp = 2) { this.shake = t >= t0 && t < t0 + ms ? (Math.floor(t * 24) % 2 ? amp : -amp) : 0; }
  /** 장면 그림을 디더로 어둡게 (장치가 주인공이 되게) */
  dim(p: Painter, k = 0.74) { p.rect(0, 0, this.w, this.h, hex('#0b0b0e'), k); }
  /** 바닥 띠 + 빛 웅덩이 자리 */
  ground(p: Painter, r: Col[] = PAL.steel) { p.rect(0, this.floor, this.w, this.h - this.floor, r[1]); p.rect(0, this.floor, this.w, 1, r[3]); for (let x = 0; x < this.w; x += 2) if (bayer(x, this.floor + 2) < 0.5) p.px(x, this.floor + 2, r[2]); }
}

// ── 소품 (도트 · 램프 음영) ──

/** 망치 (자루 나무 · 머리 쇠) */
const hammer = (p: Painter, x: number, y: number, ang: number, L = 22) => {
  const W = PAL.wood, S = PAL.steel;
  for (let i = 0; i < L; i++) { const px = x + Math.cos(ang) * i, py = y - Math.sin(ang) * i; p.rect(px - 1, py - 1, 3, 3, INK); }
  for (let i = 0; i < L; i++) { const px = x + Math.cos(ang) * i, py = y - Math.sin(ang) * i; p.px(px, py, W[4]); p.px(px + 1, py, W[2]); }
  const hx = x + Math.cos(ang) * L, hy = y - Math.sin(ang) * L;
  const nx = Math.cos(ang + Math.PI / 2), ny = -Math.sin(ang + Math.PI / 2);
  for (let k = -6; k <= 6; k++) for (let j = -3; j <= 3; j++) { const px = hx + nx * k + Math.cos(ang) * j, py = hy + ny * k - Math.sin(ang) * j; p.px(px, py, Math.abs(k) === 6 || Math.abs(j) === 3 ? INK : j < -1 ? S[6] : j > 1 ? S[2] : S[4]); }
};

/** 모루 (뜨거운 윗면 선택) */
const anvil = (p: Painter, cx: number, top: number, hot = 0) => {
  const S = PAL.steel;
  p.rect(cx - 20, top, 40, 7, INK); p.rect(cx - 19, top + 1, 38, 5, S[4]); p.rect(cx - 19, top + 1, 38, 1, S[6]); p.rect(cx - 19, top + 5, 38, 1, S[2]);
  p.rect(cx - 26, top + 1, 7, 4, INK); p.rect(cx - 25, top + 2, 6, 2, S[4]); // 뿔
  p.rect(cx - 10, top + 7, 20, 8, INK); p.rect(cx - 9, top + 7, 18, 7, S[3]); p.rect(cx - 9, top + 7, 2, 7, S[5]);
  p.rect(cx - 15, top + 15, 30, 4, INK); p.rect(cx - 14, top + 15, 28, 3, S[3]); p.rect(cx - 14, top + 15, 28, 1, S[5]);
  if (hot > 0) { p.rect(cx - 19, top + 1, 38, 1, at(PAL.fire, 0.6 + hot * 0.35)); p.glow(cx, top, 22, PAL.fire[5], 0.25 * hot); }
};

/** 카드 (22×30): 등급 철 틀 · 그림 창 · 다듬음(+) 초록 테 · 녹 · 금 */
const card = (p: Painter, x: number, y: number, o: { plus?: boolean; rust?: boolean; crack?: number; back?: boolean; w?: number } = {}) => {
  const w = Math.max(2, Math.round(o.w ?? 22));
  const x0 = Math.round(x + (22 - w) / 2);
  const S = o.back ? PAL.wood : o.rust ? PAL.rust : PAL.steel;
  p.rect(x0, y, w, 30, INK);
  p.rect(x0 + 1, y + 1, w - 2, 28, S[3]);
  p.rect(x0 + 1, y + 1, w - 2, 1, S[5]);
  p.rect(x0 + 1, y + 1, 1, 28, S[5]);
  p.rect(x0 + 1, y + 28, w - 2, 1, S[1]);
  if (o.back) { if (w > 10) { p.rect(x0 + w / 2 - 3, y + 11, 6, 8, PAL.brass[3]); p.rect(x0 + w / 2 - 2, y + 12, 4, 6, PAL.brass[5]); } return; }
  if (w < 14) return;
  p.rect(x0 + 3, y + 7, w - 6, 13, INK);
  p.rect(x0 + 4, y + 8, w - 8, 11, PAL.steel[1]);
  for (let yy = y + 8; yy < y + 19; yy++) for (let xx = x0 + 4; xx < x0 + w - 4; xx++) if (((xx >> 1) + (yy >> 1)) % 2) p.px(xx, yy, PAL.steel[2]);
  if (o.rust) for (let i = 0; i < 40; i++) { const xx = x0 + 1 + ((i * 7) % (w - 2)), yy = y + 1 + ((i * 13) % 28); if (bayer(xx, yy) < 0.5) p.px(xx, yy, PAL.rust[(i % 3) + 3]); }
  if (o.plus) { p.rect(x0, y, w, 1, PAL.heal[5]); p.rect(x0, y + 29, w, 1, PAL.heal[5]); p.rect(x0, y, 1, 30, PAL.heal[5]); p.rect(x0 + w - 1, y, 1, 30, PAL.heal[5]); p.rect(x0 + w - 7, y + 22, 5, 1, PAL.heal[6]); p.rect(x0 + w - 5, y + 20, 1, 5, PAL.heal[6]); p.glow(x0 + w - 5, y + 22, 6, PAL.heal[5], 0.4); }
  if (o.crack) for (let i = 0; i < Math.round(30 * o.crack); i++) p.px(x0 + w / 2 + Math.round(Math.sin(i * 1.7) * 2), y + i, INK);
};
/** 카드 이름 (선명한 층) */
const cardName = (s: Stage, x: number, y: number, name: string, col = '#f4f1ea') => s.text(name.length > 4 ? name.slice(0, 4) : name, x + 11, y + 6, 12, col);

/** 나사 한 줌 터짐 (바닥에 튀는 쇠 부스러기 + 별) */
const screwBurst = (s: Stage, x: number, y: number, n = 14, up = 160) => {
  for (let i = 0; i < n; i++) s.ps.spawn(P.GRIT, x + s.R.range(-3, 3), y, s.R.range(-70, 70), s.R.range(-up, -up * 0.4), s.R.range(1.2, 2), i % 3 ? PAL.steel[6] : PAL.gold[5], 2);
  for (let i = 0; i < 6; i++) s.ps.spawn(P.STAR, x + s.R.range(-14, 14), y + s.R.range(-16, 2), 0, 0, s.R.range(0.5, 0.9), PAL.gold[5], s.R.range(1, 2.4), s.R.range(0, 0.3));
};
/** 쾅: 흰 장 · 불꽃 · 빛 · 먼지 */
const impact = (s: Stage, x: number, y: number, col: Col = PAL.fire[6], n = 18) => {
  s.ps.burst(x, y, n, [60, 220], P.SPARK, [0.25, 0.6], WHITE, 60);
  s.lights.add(x, y, 26, col, 0.9, 0.35);
  for (let i = 0; i < 5; i++) s.ps.spawn(P.DUST, x + s.R.range(-8, 8), y, s.R.range(-30, 30), s.R.range(-12, -2), s.R.range(0.4, 0.8), PAL.smoke[3], s.R.range(2, 4));
};
const hero = (p: Painter, s: Stage, t: number, t0: number) => { if (t >= t0 && t < t0 + 0.06) p.rect(0, 0, s.w, s.h, WHITE, 0.85); };

type Fx = (s: Stage, c: EvFxCtx) => Promise<void>;
const firstCrew = (c: EvFxCtx): PieceType => c.diff.gone[0] ?? c.diff.changed[0]?.from ?? 'P';

const FX: Record<string, Fx> = {
  /** 동전 나이트 (D-251 회전 묘사): 엄지에 눌림 → 튕겨 오르며 8장 회전(정면 → 테 두께 타원 → 줄무늬 옆면 → 어두운 뒷면) · 꼭대기 반짝
   *  → 떨어져 튕기며 앞/뒤에 선다 · 먼지 → 앞면: 나사 분수 · 빛 / 뒷면: 빛을 잃고 미끄러져 간다 */
  async gambler(s, c) {
    const cx = s.w / 2, g = s.floor - 36;
    await s.tap(c.tap, (t, p) => { s.dim(p); s.ground(p, PAL.wood); p.glow(cx, g + 18, 26, PAL.gold[4], 0.18); s.sprite('flip-0', cx - 20, g + (Math.floor(t * 4) % 2)); if (Math.floor(t * 3) % 3 === 0) p.sparkle(cx - 4, g + 3, 2, PAL.gold[5], PAL.gold[3]); });
    const peak = 22; // 장면 위 끝에 잘리지 않게 (D-257)
    const endFrame = c.good ? 0 : 6;
    await s.play(
      2600,
      (t, p) => {
        s.dim(p); s.ground(p, PAL.wood);
        let y = g, f = 0, x = cx;
        if (t < 0.12) y = g + 2;
        else if (t < 1.25) { const k = (t - 0.12) / 1.13; y = g + (peak - g) * (1 - Math.pow(2 * k - 1, 2)); f = (endFrame - Math.ceil((1.25 - t) * 22) + COIN_N * 40) % COIN_N; } // 거꾸로 세어 착지 순간에 결과 면이 된다
        else if (t < 1.4) { f = (endFrame + 1) % COIN_N; y = g - Math.sin(((t - 1.25) / 0.15) * Math.PI) * 4; }
        else { f = endFrame; y = g; }
        if (!c.good && t > 1.7) x = cx + inE((t - 1.7) / 0.8) * 46;
        const sh = Math.max(3, 9 - (g - y) / 6);
        p.ellipse(cx, s.floor + 1, sh, 1.5, PAL.wood[1]);
        p.glow(x, y + 18, 24, PAL.gold[4], c.good || t < 1.4 ? 0.22 : 0.08);
        s.sprite(`flip-${f}`, x - 20, y);
        if (t > 0.62 && t < 0.78) p.sparkle(cx + 12, peak + 6, 4, PAL.gold[5], PAL.gold[3]);
        s.jolt(t, 1.25, 0.1, 1);
        hero(p, s, t, 1.4);
        s.verdictAt(t, 1.42, c.good ? '앞면' : '뒷면', c.good ? 'good' : 'bad', c.good ? '부품 하나' : '분대원 HP −50%');
      },
      (dt, t) => {
        if (t > 1.25 && t - dt <= 1.25) for (let i = 0; i < 6; i++) s.ps.spawn(P.DUST, cx + s.R.range(-10, 10), s.floor, s.R.range(-40, 40), s.R.range(-10, -2), 0.6, PAL.wood[3], 3);
        if (c.good && t > 1.42 && t - dt <= 1.42) { s.ps.burst(cx, g + 16, 18, [60, 150], P.STAR, [0.5, 1], PAL.gold[5]); s.lights.add(cx, g + 18, 44, PAL.gold[5], 1, 0.8); }
        if (!c.good && t > 1.7 && t - dt <= 1.7) for (let i = 0; i < 6; i++) s.ps.spawn(P.GRIT, cx + s.R.range(-6, 6), s.floor - 2, s.R.range(20, 90), s.R.range(-50, -10), 0.6, PAL.wood[4], 1);
      },
    );
  },

  /** 견습 폰: 망치가 비틀대며 오름 → (누르면) 쾅: 흰 장 · 불꽃 · 성공 = 카드에 초록 「+」 · 금빛 반짝 / 실패 = 금 → 쇳조각으로 흩어짐 */
  async apprentice(s, c) {
    const cx = s.w / 2, top = s.floor - 19, cardX = cx - 11, cardY = top - 31;
    const name = (c.diff.cardsIn[0] ?? c.diff.cardsOut[0] ?? '카드').replace(/[+−]$/, '');
    await s.tap(c.tap, (t, p) => { s.dim(p); s.ground(p); anvil(p, cx, top); card(p, cardX, cardY); cardName(s, cardX, cardY, name); hammer(p, cx + 28, top - 4, 1.1 + Math.min(0.5, t * 0.4) + (Math.floor(t * 6) % 2 ? 0.08 : -0.08)); });
    await s.play(
      2000,
      (t, p) => {
        s.dim(p); s.ground(p); anvil(p, cx, top, t > 0.1 && t < 0.8 ? 1 - (t - 0.1) / 0.7 : 0);
        const ang = t < 0.1 ? 1.5 - (t / 0.1) * 1.4 : 0.1;
        if (c.good || t < 0.12) { card(p, cardX, cardY, { plus: c.good && t > 0.12 }); cardName(s, cardX, cardY, name, c.good && t > 0.12 ? '#7ee0a1' : '#f4f1ea'); }
        else if (t < 0.4) { card(p, cardX, cardY, { crack: Math.min(1, (t - 0.12) / 0.2) }); cardName(s, cardX, cardY, name); }
        hammer(p, cx + 28, top - 4, ang);
        s.jolt(t, 0.1, 0.16, 2);
        hero(p, s, t, 0.1);
        if (c.good && t > 0.2) p.sparkle(cardX + 18, cardY + 4, 3 + (Math.floor(t * 8) % 2), PAL.heal[5], PAL.heal[3]);
        s.verdictAt(t, 0.3, c.good ? '벼려졌다' : '부서졌다', c.good ? 'good' : 'bad', c.good ? '카드 둘 태엽 −1' : '카드 둘을 잃었다');
      },
      (dt, t) => {
        if (t > 0.1 && t - dt <= 0.1) impact(s, cx, top, PAL.fire[6], 22);
        if (!c.good && t > 0.4 && t - dt <= 0.4) for (let i = 0; i < 18; i++) s.ps.spawn(P.SHARD, cardX + 11 + s.R.range(-8, 8), cardY + s.R.range(0, 28), s.R.range(-90, 90), s.R.range(-140, -40), s.R.range(1, 1.6), i % 2 ? PAL.steel[4] : PAL.steel[6], s.R.range(1, 2));
      },
    );
  },

  /** 고장 난 조립 판정기 (D-256): 사건 창 전체를 덮는 공장 기계 — 깔때기 셋에서 부품이 떨어져 받침에 박힌다.
   *  금 톱니 셋 = 희귀 부품 · 금 왕관 셋 = 승급 · 톱니 둘 + 금 간 톱니 = 불량(감전) */
  async brokenGacha(s, c) {
    const pick = c.diff.changed.length ? 'up' : c.good ? 'part' : 'miss';
    await assemblyJudge(s.host.closest('.ev-wrap') as HTMLElement ?? s.host, pick, { title: '조립 판정기', win: pick === 'part' ? '금 톱니 셋 · 희귀 부품' : '금 왕관 셋 · 승급', lose: '금 간 톱니 · 감전' });
  },

  /** 녹슨 봉인 상자 (D-256): 봉인판의 각인 칸 셋을 덮은 녹을 손가락으로 긁는다 — 금 톱니 셋이면 봉인이 풀린다, 아니면 녹 독 */
  async auction(s, c) {
    await sealScrape(s.host.closest('.ev-wrap') as HTMLElement ?? s.host, c.good ? ['gear-gold', 'gear-gold', 'gear-gold'] : ['gear-gold', 'gear-gold', 'rust'], c.good, { title: '녹슨 봉인 상자', win: '희귀 부품', lose: '분대 HP −20%' });
  },

  /** 쇳물 담금질: 도가니(불 · 불씨 · 빛) 위로 사슬이 계단으로 내려가 잠김(김이 솟음) → 끌어올림: 달아오른 새 기물(번쩍) / 빈 갈고리에서 쇳물이 떨어짐 */
  async dipping(s, c) {
    const cx = s.w / 2, pool = s.floor - 12;
    const from = firstCrew(c), to = c.diff.changed[0]?.to;
    const crucible = (p: Painter) => {
      const S = PAL.steel;
      p.rect(cx - 30, pool, 60, 14, INK); p.rect(cx - 29, pool + 1, 58, 12, S[2]); p.rect(cx - 29, pool + 1, 58, 1, S[4]); p.rect(cx - 29, pool + 1, 2, 12, S[3]);
      p.rect(cx - 27, pool, 54, 3, PAL.fire[5]); p.rect(cx - 27, pool, 54, 1, PAL.fire[7]);
      for (let x = cx - 26; x < cx + 26; x += 1) if (bayer(x, pool + 2) < 0.4) p.px(x, pool + 2, PAL.fire[4]);
      p.glow(cx, pool, 30, PAL.fire[5], 0.35);
    };
    const chain = (p: Painter, len: number) => { for (let y = 0; y < len; y += 4) { p.rect(cx - 1, y, 3, 4, INK); p.px(cx, y + 1, PAL.steel[5]); p.px(cx, y + 2, PAL.steel[3]); } };
    let feed = 0;
    const simPool = (dt: number) => { feed += dt * 30; for (; feed > 1; feed--) { if (s.R.chance(0.7)) s.ps.spawn(P.FIRE, cx + s.R.range(-24, 24), pool, s.R.range(-5, 5), s.R.range(-25, -8), s.R.range(0.2, 0.45), 0, s.R.range(1, 2), 0, s.R.chance(0.15)); else s.ps.spawn(P.EMBER, cx + s.R.range(-24, 24), pool, s.R.range(-10, 10), s.R.range(-50, -20), s.R.range(0.6, 1.2), WHITE, 1); } };
    const footY = (y: number) => y;
    await s.play(1000, (t, p) => { s.dim(p, 0.8); const y = 26 + Math.floor(Math.min(1, t / 0.9) * 6) / 6 * (pool + 6 - 26); chain(p, y - 22); s.piece(from, cx, footY(y), 72, pool + 1); crucible(p); }, (dt) => simPool(dt));
    await s.tap(c.tap, (_t, p) => { s.dim(p, 0.8); chain(p, pool - 16); crucible(p); });
    await s.play(
      1600,
      (t, p) => {
        s.dim(p, 0.8);
        const y = pool + 6 - Math.floor(Math.min(1, t / 0.5) * 5) / 5 * (pool + 6 - 30);
        chain(p, y - 22);
        if (c.good && to) { s.piece(to, cx, y, 72, pool + 1); if (t > 0.5 && t < 1.2 && Math.floor(t * 12) % 2) p.glow(cx, y - 12, 18, PAL.fire[6], 0.5); }
        else if (t > 0.5) for (let i = 0; i < 3; i++) { const dy = ((t * 40 + i * 9) % 20); p.rect(cx, y + dy, 1, 2, PAL.fire[5]); }
        crucible(p);
        s.verdictAt(t, 0.6, c.good ? '다시 선다' : '삼켜졌다', c.good ? 'gold' : 'bad', c.good ? '한 단계 위로' : '분대원을 잃었다');
      },
      (dt, t) => {
        simPool(dt);
        if (t < 0.5) for (let i = 0; i < 2; i++) s.ps.spawn(P.SMOKE, cx + s.R.range(-10, 10), pool - 2, s.R.range(-10, 10), s.R.range(-40, -20), s.R.range(0.6, 1), hex('#8a8494'), s.R.range(2, 4));
        if (c.good && t > 0.5 && t - dt <= 0.5) { s.lights.add(cx, 30, 30, PAL.fire[6], 1, 0.6); s.ps.burst(cx, 24, 18, [40, 140], P.SPARK, [0.3, 0.7], WHITE, 40); }
      },
    );
  },

  /** 조는 검수 저울: 저울 · 서류 · Z가 떠오름 → (누르면) 붉은 도장 쾅 · 잉크 튐: 승인(폰 → 나이트, 금빛) / 저울 눈이 붉게 뜨며 「!」 · 나사가 빨려 감 */
  async napping(s, c) {
    const cx = s.w / 2, B = PAL.brass;
    const scaleArt = (p: Painter, eye: boolean, t: number) => {
      p.rect(cx - 2, 14, 4, s.floor - 14, INK); p.rect(cx - 1, 14, 2, s.floor - 14, B[4]);
      p.rect(cx - 28, 14, 56, 3, INK); p.rect(cx - 27, 15, 54, 1, B[5]);
      for (const sx of [-1, 1]) { const x = cx + sx * 20; p.line(x - 6, 30, x, 16, B[3]); p.line(x + 6, 30, x, 16, B[3]); p.rect(x - 9, 30, 18, 3, INK); p.rect(x - 8, 30, 16, 1, B[5]); }
      p.rect(cx - 10, s.floor - 6, 20, 6, INK); p.rect(cx - 9, s.floor - 5, 18, 4, B[3]); p.rect(cx - 9, s.floor - 5, 18, 1, B[5]);
      // 눈
      p.rect(cx - 5, 7, 10, 7, INK); p.rect(cx - 4, 8, 8, 5, eye ? PAL.blood[5] : B[3]);
      if (eye) { p.rect(cx - 1, 9, 2, 3, INK); p.glow(cx, 10, 10, PAL.blood[5], 0.6); } else p.rect(cx - 3, 10, 6, 1, INK);
      if (!eye) for (let i = 0; i < 3; i++) { const ph = ((t * 0.8 + i / 3) % 1); s.text('Z', cx + 8 + ph * 12, 8 - ph * 6, 12, '#a8a2b0'); }
    };
    const paper = (p: Painter, stamped: boolean) => { const x = cx - 34, y = s.floor - 18; p.rect(x, y, 22, 17, INK); p.rect(x + 1, y + 1, 20, 15, PAL.paper[4]); p.rect(x + 1, y + 1, 20, 1, PAL.paper[5]); for (let i = 0; i < 3; i++) p.rect(x + 4, y + 4 + i * 4, 12, 1, PAL.paper[2]); if (stamped) { p.rect(x + 5, y + 5, 12, 8, PAL.blood[5]); p.rect(x + 7, y + 7, 8, 4, PAL.paper[4]); p.rect(x + 9, y + 8, 4, 2, PAL.blood[5]); } };
    const stamp = (p: Painter, y: number) => { const x = cx - 30; p.rect(x, y, 14, 10, INK); p.rect(x + 1, y + 1, 12, 8, PAL.wood[4]); p.rect(x + 1, y + 1, 12, 1, PAL.wood[6]); p.rect(x + 4, y - 6, 6, 7, INK); p.rect(x + 5, y - 5, 4, 6, PAL.wood[3]); p.rect(x, y + 9, 14, 2, PAL.blood[5]); };
    await s.tap(c.tap, (t, p) => { s.dim(p); s.ground(p, PAL.wood); scaleArt(p, false, t); paper(p, false); stamp(p, s.floor - 36 - (Math.floor(t * 3) % 2) * 2); });
    await s.play(
      2000,
      (t, p) => {
        s.dim(p); s.ground(p, PAL.wood);
        const eye = !c.good && t > 0.35;
        scaleArt(p, eye, t); paper(p, t > 0.08);
        stamp(p, s.floor - 36 + Math.min(1, t / 0.08) * 16 - (t > 0.25 ? Math.min(1, (t - 0.25) / 0.2) * 16 : 0));
        s.jolt(t, 0.08, 0.1, 1);
        if (c.good && t > 0.5) { s.piece(t < 0.9 && Math.floor(t * 12) % 2 ? 'P' : 'N', cx + 30, s.floor); s.verdictAt(t, 0.5, '승인', 'gold', '폰 둘 → 나이트'); }
        if (eye) { s.jolt(t, 0.35, 0.3, 2); s.verdictAt(t, 0.45, '들켰다', 'bad', '나사를 빼앗겼다'); }
      },
      (dt, t) => {
        if (t > 0.08 && t - dt <= 0.08) for (let i = 0; i < 10; i++) s.ps.spawn(P.GRIT, cx - 23 + s.R.range(-6, 6), s.floor - 14, s.R.range(-60, 60), s.R.range(-90, -30), 0.8, PAL.blood[5], 1);
        if (c.good && t > 0.5 && t - dt <= 0.5) { s.lights.add(cx + 30, s.floor - 12, 26, PAL.gold[5], 0.9, 0.6); s.ps.burst(cx + 30, s.floor - 14, 12, [40, 110], P.STAR, [0.4, 0.8], PAL.gold[5]); }
        if (!c.good && t > 0.5) if (s.R.chance(dt * 30)) s.ps.spawn(P.GRIT, cx + 30 + s.R.range(-4, 4), s.floor - 4, s.R.range(-120, -60), s.R.range(-60, -20), 0.6, PAL.steel[6], 2);
      },
    );
  },

  /** 녹슨 금고: 다섯 번 내리침(금이 자라고 불꽃 · 흔들림 점점 크게) → 문이 계단으로 열리며 금빛이 새고 나사가 쏟아져 바닥에서 튄다 · 붉은 베임 */
  async safe(s, c) {
    const cx = s.w / 2, cy = s.floor - 20, R = PAL.rust;
    const box = (p: Painter, cracks: number, open: number) => {
      p.rect(cx - 22, cy - 18, 44, 38, INK); p.rect(cx - 21, cy - 17, 42, 36, R[3]); p.rect(cx - 21, cy - 17, 42, 2, R[5]); p.rect(cx - 21, cy - 17, 2, 36, R[4]); p.rect(cx + 19, cy - 15, 2, 34, R[1]); p.rect(cx - 21, cy + 17, 42, 2, R[1]);
      for (let i = 0; i < 60; i++) { const x = cx - 20 + ((i * 7) % 40), y = cy - 16 + ((i * 11) % 34); if (bayer(x, y) < 0.3) p.px(x, y, R[(i % 2) + 1]); }
      for (const [x, y] of [[-18, -14], [16, -14], [-18, 15], [16, 15]]) { p.px(cx + x, cy + y, R[6]); p.px(cx + x + 1, cy + y + 1, R[1]); }
      if (open > 0) {
        p.rect(cx - 19, cy - 15, 38, 32, PAL.steel[0]);
        // 나사 · 동전 더미 (가운데가 높은 언덕, 칸마다 너트 · 동전이 섞인다)
        for (let i = 0; i < 70; i++) {
          const col = i % 14, row = (i / 14) | 0, x = cx - 17 + col * 2.6 + (row % 2) * 1.3, hill = 3 + Math.round(Math.sin((col / 13) * Math.PI) * 4);
          if (row > hill) continue;
          const y = cy + 15 - row * 2.4;
          if ((i * 7) % 5 === 0) { p.circle(x + 1, y, 1.6, PAL.gold[3]); p.px(x + 0.5, y - 0.5, PAL.gold[6]); }
          else { p.rect(x, y - 1, 3, 2, PAL.steel[3]); p.px(x, y - 1, PAL.steel[6]); p.px(x + 1, y, INK); }
        }
        p.glow(cx, cy, 26, PAL.gold[5], 0.5 * open);
        // 문: 왼쪽 경첩으로 열리며 폭이 계단으로 줄고(옆모습), 안쪽 면 · 볼트가 보인다
        const dw = Math.max(3, Math.round(40 * (1 - open)));
        const dx = cx - 22 - dw;
        p.rect(dx, cy - 18, dw + 1, 38, INK); p.rect(dx + 1, cy - 17, dw - 1, 36, R[2]); p.rect(dx + 1, cy - 17, 1, 36, R[4]);
        for (let yy = cy - 12; yy < cy + 16; yy += 7) p.rect(dx + Math.max(1, dw - 3), yy, 2, 3, PAL.steel[5]);
      } else {
        p.circle(cx + 8, cy, 6, INK); p.circle(cx + 8, cy, 5, PAL.steel[3]); p.circle(cx + 7, cy - 1, 3, PAL.steel[5]); p.px(cx + 8, cy, INK);
        for (let i = 0; i < 4; i++) p.line(cx + 8, cy, cx + 8 + Math.cos(i * 1.57 + 0.4) * 5, cy + Math.sin(i * 1.57 + 0.4) * 5, PAL.steel[2]);
        p.rect(cx - 14, cy - 3, 10, 6, INK); p.rect(cx - 13, cy - 2, 8, 4, PAL.steel[4]); p.rect(cx - 13, cy - 2, 8, 1, PAL.steel[6]);
      }
      for (let i = 0; i < cracks * 7; i++) p.px(cx - 6 + Math.round(Math.sin(i * 1.3) * 3), cy - 16 + i, INK);
    };
    for (let n = 0; n < 5; n++) {
      await s.tap(c.tap && `${c.tap} (${n + 1}/5)`, (t, p) => { s.dim(p); s.ground(p); box(p, n, 0); hammer(p, cx - 40, cy + 14, 1.15 + (Math.floor(t * 5) % 2 ? 0.1 : 0)); });
      await s.play(260, (t, p) => { s.dim(p); s.ground(p); box(p, n + 1, 0); hammer(p, cx - 40, cy + 14, t < 0.06 ? 1.2 - (t / 0.06) * 1.0 : 0.2); s.jolt(t, 0.06, 0.12, 1 + Math.floor(n / 2)); if (n === 4) hero(p, s, t, 0.06); }, (dt, t) => { if (t > 0.06 && t - dt <= 0.06) impact(s, cx - 20, cy, PAL.fire[6], 8 + n * 3); });
    }
    await s.play(
      2000,
      (t, p) => {
        s.dim(p); s.ground(p); box(p, 5, Math.min(1, t / 0.25));
        s.jolt(t, 0, 0.2, 3);
        if (t > 0.6 && t < 0.85) for (let i = 0; i < 26; i++) { p.px(cx - 36 + i * 3, cy + 18 - i * 1.4, PAL.blood[6]); p.px(cx - 35 + i * 3, cy + 18 - i * 1.4, PAL.blood[4]); }
        s.verdictAt(t, 0.6, `나사 +${c.diff.gold}`, 'good', '분대 HP −25%');
      },
      (dt, t) => { if (t > 0.25 && t - dt <= 0.25) { screwBurst(s, cx, cy, 26, 200); s.lights.add(cx, cy, 40, PAL.gold[5], 1, 0.7); } },
    );
  },

  /** 땜장이: 세 번 땜질(누를 때마다 · 청백 불꽃 · 빛) → 금빛 문턱 톱니가 내려와 박힌다 */
  async tinker(s, c) {
    const cx = s.w / 2, foot = s.floor;
    const who = c.diff.changed[0]?.to ?? 'P';
    const weld = () => { s.ps.burst(cx + 4, foot - 10, 16, [60, 200], P.SPARK, [0.2, 0.5], WHITE, 50); s.lights.add(cx + 4, foot - 10, 22, hex('#b4e4ff'), 1, 0.25); };
    for (let n = 0; n < 3; n++) {
      await s.tap(c.tap && `${c.tap} (${n + 1}/3)`, (_t, p) => { s.dim(p); s.ground(p); s.piece(who, cx, foot); });
      await s.play(320, (t, p) => { s.dim(p); s.ground(p); s.piece(who, cx, foot); if (t < 0.08) p.rect(0, 0, s.w, s.h, hex('#d8f0ff'), 0.4); s.jolt(t, 0, 0.08, 1); }, (dt, t) => { if (t - dt <= 0) weld(); });
    }
    await s.play(1500, (t, p) => {
      s.dim(p); s.ground(p); s.piece(who, cx, foot);
      const y = 8 + outE(t / 0.35) * (foot - 40);
      p.circle(cx + 16, y, 6, INK); p.circle(cx + 16, y, 5, PAL.brass[3]); p.circle(cx + 15, y - 1, 3.5, PAL.brass[5]); p.circle(cx + 16, y, 1.5, INK);
      for (let a = 0; a < 8; a++) p.px(cx + 16 + Math.cos(a * 0.785) * 6.5, y + Math.sin(a * 0.785) * 6.5, PAL.brass[4]);
      p.glow(cx + 16, y, 12, PAL.gold[5], 0.4);
      hero(p, s, t, 0.35);
      s.verdictAt(t, 0.4, '문턱 +1', 'good');
    }, (dt, t) => { if (t > 0.35 && t - dt <= 0.35) { s.ps.burst(cx + 16, foot - 32, 14, [40, 120], P.STAR, [0.4, 0.8], PAL.gold[5]); s.lights.add(cx + 16, foot - 32, 26, PAL.gold[5], 0.9, 0.5); } });
  },

  /** 정비 폰: 카드가 뒤집혀 돌고(폭 계단) 렌치 불꽃이 둘레를 돈다 → 초록 「+」 · 반짝 */
  async smith(s, c) {
    const cx = s.w / 2, x = Math.round(cx - 11), y = Math.round(s.h / 2 - 17);
    const name = (c.diff.cardsIn[0] ?? '카드').replace(/[+−]$/, '');
    await s.play(2200, (t, p) => {
      s.dim(p);
      const f = Math.floor(t * 12);
      if (t < 1) card(p, x, y, { back: f % 6 < 3, w: [22, 14, 4, 4, 14, 22][f % 6] });
      else { card(p, x, y, { plus: true }); cardName(s, x, y, name, '#7ee0a1'); }
      const a = t * 7; for (let i = 0; i < 3; i++) { const px = cx + Math.cos(a + i * 2.09) * 20, py = y + 15 + Math.sin(a + i * 2.09) * 20; p.px(px, py, WHITE); p.glow(px, py, 4, PAL.brass[5], 0.5); }
      hero(p, s, t, 1);
      s.verdictAt(t, 1.05, '태엽 −1', 'good');
    }, (dt, t) => { if (s.R.chance(dt * 30)) { const a = t * 7; s.ps.spawn(P.SPARK, cx + Math.cos(a) * 20, y + 15 + Math.sin(a) * 20, s.R.range(-40, 40), s.R.range(-60, 0), 0.3); } if (t > 1 && t - dt <= 1) { s.ps.burst(cx, y + 15, 14, [40, 120], P.STAR, [0.4, 0.8], PAL.heal[5]); s.lights.add(cx, y + 15, 30, PAL.heal[5], 0.9, 0.5); } });
  },

  /** 흑 비숍: 분대원이 한 걸음씩 상자로 걸어가 실린다 → 뚜껑 쾅 · 먼지 → 나사가 날아와 쌓인다 */
  async scout(s, c) {
    const who = firstCrew(c), foot = s.floor, bx = s.w - 34;
    const crate = (p: Painter, lid: number) => { const S = PAL.steel; p.rect(bx, foot - 22, 28, 22, INK); p.rect(bx + 1, foot - 21, 26, 21, S[2]); p.rect(bx + 1, foot - 21, 26, 1, S[4]); p.rect(bx + 1, foot - 21, 1, 21, S[3]); p.rect(bx + 8, foot - 15, 12, 8, PAL.blood[4]); p.rect(bx + 10, foot - 13, 8, 4, PAL.blood[2]); p.rect(bx - 1, foot - 26 + lid, 30, 5, INK); p.rect(bx, foot - 25 + lid, 28, 3, S[3]); p.rect(bx, foot - 25 + lid, 28, 1, S[5]); };
    await s.play(2600, (t, p) => {
      s.dim(p); s.ground(p);
      const steps = Math.min(8, Math.floor(t / 0.16));
      const x = 16 + (steps / 8) * (bx + 14 - 16);
      crate(p, t < 1.4 ? -8 : t < 1.5 ? -3 : 0);
      if (t < 1.35) s.piece(who, x, foot - (steps % 2));
      s.jolt(t, 1.5, 0.12, 1);
      s.verdictAt(t, 1.7, `나사 +${c.diff.gold}`, 'good');
    }, (dt, t) => {
      if (t > 1.5 && t - dt <= 1.5) for (let i = 0; i < 8; i++) s.ps.spawn(P.DUST, bx + 14 + s.R.range(-14, 14), foot - 2, s.R.range(-40, 40), s.R.range(-12, -2), 0.7, PAL.smoke[4], 3);
      if (t > 1.7 && t - dt <= 1.7) { screwBurst(s, bx + 14, foot - 26, 20, 180); s.lights.add(bx + 14, foot - 20, 30, PAL.gold[5], 0.8, 0.5); }
    });
  },

  /** 야간 교대: 달아오른 모루를 세 번(누를 때마다 · 불꽃 · 빛) → 분대 머리 위로 초록 + 가 떠오른다 */
  async nightShift(s) {
    const cx = s.w / 2, top = s.floor - 19;
    for (let n = 0; n < 3; n++) {
      await s.tap('눌러서 두드린다' + ` (${n + 1}/3)`, (t, p) => { s.dim(p); s.ground(p); anvil(p, cx, top, 0.6); hammer(p, cx + 22, top - 2, 1.2 + (Math.floor(t * 5) % 2 ? 0.1 : 0)); });
      await s.play(300, (t, p) => { s.dim(p); s.ground(p); anvil(p, cx, top, 1); hammer(p, cx + 22, top - 2, t < 0.06 ? 1.3 - (t / 0.06) * 1.2 : 0.1); s.jolt(t, 0.06, 0.1, 1); }, (dt, t) => { if (t > 0.06 && t - dt <= 0.06) impact(s, cx, top, PAL.fire[6], 20); });
    }
    await s.play(1600, (t, p) => { s.dim(p); s.ground(p); anvil(p, cx, top, Math.max(0, 1 - t)); s.verdictAt(t, 0.3, '분대 HP +50%', 'good'); }, (dt) => { if (s.R.chance(dt * 40)) { const x = s.R.range(10, s.w - 10); s.ps.spawn(P.MOTE, x, s.floor - 4, 0, s.R.range(-40, -20), s.R.range(0.6, 1.2), PAL.heal[5], 1); if (s.R.chance(0.3)) s.ps.spawn(P.STAR, x, s.floor - 20 - s.R.range(0, 20), 0, 0, 0.6, PAL.heal[5], 2); } });
  },

  /** 쇳물 앞의 거래: 쇳물 웅덩이(불 · 불씨 · 빛)에 분대원이 계단으로 가라앉고 불이 확 솟는다 → 그림자 손이 빛나는 부품을 내민다 */
  async pact(s, c) {
    const who = firstCrew(c), cx = s.w / 2, pool = s.floor - 6;
    let feed = 0;
    const sim = (dt: number) => { feed += dt * 36; for (; feed > 1; feed--) { if (s.R.chance(0.7)) s.ps.spawn(P.FIRE, s.R.range(4, s.w - 4), pool, s.R.range(-5, 5), s.R.range(-25, -8), s.R.range(0.2, 0.5), 0, s.R.range(1, 2.2), 0, s.R.chance(0.2)); else s.ps.spawn(P.EMBER, s.R.range(4, s.w - 4), pool, s.R.range(-10, 10), s.R.range(-50, -20), s.R.range(0.6, 1.4), WHITE, 1); } };
    const lava = (p: Painter) => { p.rect(0, pool, s.w, s.h - pool, PAL.fire[2]); p.rect(0, pool, s.w, 1, PAL.fire[6]); p.rect(0, pool + 1, s.w, 1, PAL.fire[5]); for (let x = 0; x < s.w; x++) for (let y = pool + 2; y < s.h; y++) if (bayer(x, y) < 0.25) p.px(x, y, PAL.fire[4]); p.glow(cx, pool, 50, PAL.fire[4], 0.3); };
    await s.play(2800, (t, p) => {
      s.dim(p, 0.8); lava(p);
      if (t < 1.1) { const y = pool + Math.floor(Math.min(1, t / 1.1) * 6) / 6 * 26; s.piece(who, cx, y, 72, pool + 1); }
      if (t > 1.4) {
        const k = Math.min(1, (t - 1.4) / 0.4), y = pool - Math.floor(k * 4) / 4 * 26;
        p.rect(cx - 3, y, 6, pool - y, PAL.smoke[0]); p.rect(cx - 7, y - 4, 14, 5, PAL.smoke[0]); for (let i = 0; i < 4; i++) p.rect(cx - 7 + i * 4, y - 7, 2, 4, PAL.smoke[0]);
        p.circle(cx, y - 12, 5, INK); p.circle(cx, y - 12, 4, PAL.brass[4]); p.circle(cx - 1, y - 13, 2.5, PAL.brass[6]); p.px(cx, y - 12, INK);
        p.glow(cx, y - 12, 16, PAL.gold[5], 0.5);
      }
      s.verdictAt(t, 1.9, '부품 하나', 'gold');
    }, (dt, t) => {
      sim(dt);
      if (t > 1.1 && t - dt <= 1.1) { for (let i = 0; i < 20; i++) s.ps.spawn(P.FIRE, cx + s.R.range(-8, 8), pool, s.R.range(-20, 20), s.R.range(-90, -40), s.R.range(0.3, 0.7), 0, s.R.range(2, 3.5), 0, true); s.lights.add(cx, pool - 10, 40, PAL.fire[5], 1, 0.6); }
      if (t > 1.8 && t - dt <= 1.8) { s.ps.burst(cx, pool - 38, 14, [30, 100], P.STAR, [0.4, 0.9], PAL.gold[5]); s.lights.add(cx, pool - 38, 30, PAL.gold[5], 1, 0.6); }
    });
  },

  /** 부품 교환상: 폰 둘이 한 걸음씩 손수레에 올라타고 → 나이트가 뛰어내려 착지 먼지 */
  async swapDealer(s) {
    const foot = s.floor, cart = s.w - 38;
    const cartArt = (p: Painter) => { const W = PAL.wood; p.rect(cart, foot - 14, 32, 9, INK); p.rect(cart + 1, foot - 13, 30, 7, W[3]); p.rect(cart + 1, foot - 13, 30, 1, W[5]); for (const wx of [6, 25]) { p.circle(cart + wx, foot - 3, 4, INK); p.circle(cart + wx, foot - 3, 3, PAL.steel[3]); p.px(cart + wx, foot - 3, INK); } };
    await s.play(2600, (t, p) => {
      s.dim(p); s.ground(p); cartArt(p);
      [0, 1].forEach((i) => { const k = Math.min(1, Math.max(0, (t - i * 0.3) / 0.9)); const st = Math.floor(k * 7) / 7; const x = 14 + i * 14 + st * (cart + 10 + i * 10 - 14 - i * 14); if (t < 1.4 + i * 0.1) s.piece('P', x, foot - (k >= 1 ? 13 : Math.floor(t * 6 + i) % 2)); });
      if (t > 1.5) { const k = Math.min(1, (t - 1.5) / 0.45); const x = cart + 16 - k * 42, y = foot - 13 + k * 13 - Math.round(Math.sin(k * Math.PI) * 18); s.piece('N', x, y); }
      s.jolt(t, 1.95, 0.1, 1);
      s.verdictAt(t, 2, '나이트 +1', 'gold');
    }, (dt, t) => { if (t > 1.95 && t - dt <= 1.95) for (let i = 0; i < 8; i++) s.ps.spawn(P.DUST, cart - 26 + s.R.range(-10, 10), foot - 1, s.R.range(-40, 40), s.R.range(-12, -2), 0.7, PAL.smoke[4], 3); });
  },

  /** 저울추: 고른 카드가 왼쪽 접시에 떨어져 저울이 계단으로 기울고 → 오른쪽 카드에 녹이 번지며 녹 부스러기가 떨어진다 */
  async counterweight(s, c) {
    const cx = s.w / 2, B = PAL.brass;
    const name = (c.diff.cardsIn.find((n) => n.endsWith('+')) ?? c.diff.cardsIn[0] ?? '카드').replace(/[+−]$/, '');
    const rust = (c.diff.cardsIn.find((n) => n.endsWith('−')) ?? '').replace(/[+−]$/, '');
    await s.play(2800, (t, p) => {
      s.dim(p);
      const tilt = t < 0.6 ? 0 : Math.floor(Math.min(1, (t - 0.6) / 0.3) * 3) / 3 * 7;
      p.rect(cx - 2, 12, 4, s.floor - 12, INK); p.rect(cx - 1, 12, 2, s.floor - 12, B[4]); p.rect(cx - 10, s.floor - 4, 20, 4, INK); p.rect(cx - 9, s.floor - 3, 18, 2, B[3]);
      for (let i = -30; i <= 30; i++) { const y = 12 + Math.round((-i / 30) * tilt); p.px(cx + i, y, INK); p.px(cx + i, y + 1, B[5]); p.px(cx + i, y + 2, INK); }
      const ly = 46 + tilt, ry = 46 - tilt;
      for (const [x, y] of [[cx - 30, ly], [cx + 30, ry]]) { p.line(x - 12, y, x, y - 32, B[3]); p.line(x + 12, y, x, y - 32, B[3]); p.rect(x - 14, y, 28, 3, INK); p.rect(x - 13, y, 26, 1, B[5]); }
      const drop = t < 0.55 ? -40 + outE(t / 0.55) * 40 : 0;
      card(p, cx - 41, ly - 30 + drop, { plus: t > 0.65 }); cardName(s, cx - 41, ly - 30 + drop, name, t > 0.65 ? '#7ee0a1' : '#f4f1ea');
      if (rust) { card(p, cx + 19, ry - 30, { rust: t > 1.1 }); cardName(s, cx + 19, ry - 30, rust, t > 1.1 ? '#ff9a8a' : '#f4f1ea'); if (t > 1 && t < 1.6) p.rect(cx + 19, ry - 30, 22, 30, PAL.rust[5], (t - 1) / 0.6 * 0.5); }
      s.jolt(t, 0.55, 0.1, 1);
      s.verdictAt(t, 1.3, '태엽 −1', 'good', rust ? '다른 한 장 태엽 +1' : undefined);
      
    }, (dt, t) => {
      if (t > 0.55 && t - dt <= 0.55) { s.ps.burst(cx - 30, ly0(), 10, [30, 90], P.SPARK, [0.2, 0.4]); }
      if (t > 1.1 && t < 2) if (s.R.chance(dt * 30)) s.ps.spawn(P.GRIT, cx + 30 + s.R.range(-10, 10), 36, s.R.range(-10, 10), 0, 1, PAL.rust[s.R.int(3) + 3], 1);
    });
    function ly0() { return 46; }
  },

  /** 거꾸로 도는 컨베이어: 굴대가 돌고 카드 둘이 왼쪽으로 실려 나가고, 김 사이로 새 카드 둘이 들어와 반짝 */
  async conveyor(s, c) {
    const belt = s.floor - 6;
    const beltArt = (p: Painter, t: number) => { const S = PAL.steel; p.rect(0, belt, s.w, 7, INK); p.rect(0, belt + 1, s.w, 5, S[2]); for (let x = -((t * 40) | 0) % 6; x < s.w; x += 6) { p.rect(x, belt + 1, 3, 1, S[4]); } for (let x = 6; x < s.w; x += 18) { p.circle(x, belt + 3.5, 2.5, S[1]); p.px(x - 1, belt + 2, S[5]); } };
    await s.play(2800, (t, p) => {
      s.dim(p); beltArt(p, t);
      c.diff.cardsOut.slice(0, 2).forEach((n, i) => { const x = s.w / 2 - 26 + i * 28 - Math.min(1, t / 1.2) * (s.w / 2 + 34); card(p, x, belt - 31); cardName(s, x, belt - 31, n.replace(/[+−]$/, '')); });
      c.diff.cardsIn.slice(0, 2).forEach((n, i) => { if (t < 0.9) return; const x = s.w + 4 + i * 28 - Math.min(1, (t - 0.9) / 1.2) * (s.w / 2 + 30); card(p, x, belt - 31); cardName(s, x, belt - 31, n.replace(/[+−]$/, '')); });
      s.verdictAt(t, 2.1, '바뀌어 나왔다', 'good');
    }, (dt, t) => {
      if (s.R.chance(dt * 6)) s.ps.spawn(P.SMOKE, s.R.range(0, s.w), belt - 2, s.R.range(-8, 8), s.R.range(-20, -8), s.R.range(0.8, 1.4), hex('#8a8494'), s.R.range(2, 4));
      if (t > 2.1 && t - dt <= 2.1) { s.ps.burst(s.w / 2, belt - 16, 14, [40, 120], P.STAR, [0.4, 0.8], PAL.gold[5]); s.lights.add(s.w / 2, belt - 16, 30, PAL.gold[5], 0.8, 0.5); }
    });
  },
};

/**
 * 사건 장치를 돌린다. 장면 칸(host)에 두 층을 덮고, 끝나면 마지막 장을 남긴 채 돌아온다.
 * 결과가 좋으면 장면 테가 금빛, 나쁘면 붉게 (CSS 클래스).
 */
export const runEventFx = async (host: HTMLElement, c: EvFxCtx): Promise<void> => {
  host.querySelectorAll('.ev-fx').forEach((x) => x.remove());
  const fx = FX[c.id];
  if (!fx) return;
  const s = new Stage(host, c.id.length * 97 + (c.good ? 1 : 2));
  host.classList.add('fx-on');
  await fx(s, c);
  s.shake = 0;
  host.classList.add(c.good ? 'fx-good' : 'fx-bad');
};

/** 그림이 아직 없는 사건의 장면 기호 (ICON-01, 장면 그림 V-09~16이 오면 그것으로 바뀐다) */
const STILL_ICON: Record<string, string> = { smith: 'bolt', swapDealer: 'medal-knight', safe: 'seal-slot', counterweight: 'tower', conveyor: 'gear' };
/**
 * 장면 그림이 없을 때의 정지 장면 (D-259): 같은 문법으로 찍은 공장 벽(철판 · 이음매 · 리벳 · 관) + 매달린 등의 계단 빛 웅덩이 + 장치.
 * 판정기 · 봉인 상자는 미니게임과 같은 그림의 멈춘 장, 나머지는 철 표지판에 그 사건의 기호.
 */
export const sceneStill = (scene: HTMLElement, id: string): void => {
  const r = { width: scene.clientWidth, height: scene.clientHeight };
  // 장치(176도트)가 3px로는 장면 칸에 안 들어가면 정지 장면 전체를 2px 도트로 (줄여서 도트를 깨지 않는다)
  const dd = id === 'brokenGacha' || id === 'auction' ? 2 : D;
  const w = Math.max(60, Math.floor(r.width / dd)), h = Math.max(45, Math.floor(r.height / dd));
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  cv.className = 'ev-still';
  const x = cv.getContext('2d')!;
  // 벽: 철판 줄 · 세로 이음매 · 리벳
  pf(x, M.iron[1], 0, 0, w, h);
  for (let a = 0; a < w; a += 24) { pf(x, M.iron[0], a, 0, 1, h); pf(x, M.iron[2], a + 1, 0, 1, h); for (let b = 6; b < h - 10; b += 16) rivet(x, a + 3, b); }
  pf(x, PINK, 0, 8, w, 6); pf(x, M.iron[3], 0, 9, w, 4); pf(x, M.iron[5], 0, 9, w, 1); // 관
  // 매달린 등 + 계단 빛 웅덩이 (디더 띠 셋)
  const lx = Math.round(w / 2);
  pf(x, PINK, lx, 0, 1, 16); pf(x, PINK, lx - 5, 16, 11, 5); pf(x, M.brass[4], lx - 4, 16, 9, 3); pf(x, M.molten[6], lx - 2, 19, 5, 2);
  for (let b = 21; b < h - 8; b++) for (let a = 0; a < w; a++) {
    const d = Math.abs(a - lx) / ((b - 18) * 0.7 + 4);
    if (d < 1) { const k = d < 0.4 ? 0.5 : d < 0.7 ? 0.3 : 0.14; if (bay(a, b) < k) pf(x, M.iron[3], a, b, 1, 1); }
  }
  // 바닥
  pf(x, M.iron[0], 0, h - 8, w, 8); pf(x, M.iron[3], 0, h - 8, w, 1);
  for (let a = 1; a < w; a += 4) if (bay(a, 2) < 0.5) pf(x, M.iron[2], a, h - 5, 2, 1);
  const put = (art: HTMLCanvasElement) => {
    // 장치는 1도트 그대로 가운데 아래에 (넘치면 양옆이 잘린다 — 줄이지 않는다)
    x.imageSmoothingEnabled = false;
    x.drawImage(art, Math.round((w - art.width) / 2), h - art.height);
  };
  const label = { title: '', win: '', lose: '' };
  if (id === 'brokenGacha') void assemblyJudge(scene, 'part', label, put);
  else if (id === 'auction') void sealScrape(scene, ['gear-gold', 'gear-gold', 'gear-gold'], true, label, put);
  else {
    const ic = new Image();
    ic.onload = () => {
      const sw = 44, sh = 40, sx = Math.round((w - sw) / 2), sy = h - 8 - sh - 6;
      pf(x, PINK, sx + sw / 2 - 12, sy - 14, 1, 14); pf(x, PINK, sx + sw / 2 + 11, sy - 14, 1, 14); // 매단 줄
      block(x, sx, sy, sw, sh, M.iron, { mid: 3, shadow: 2 });
      for (const [a, b] of [[sx + 1, sy + 1], [sx + sw - 4, sy + 1], [sx + 1, sy + sh - 4], [sx + sw - 4, sy + sh - 4]]) rivet(x, a, b);
      x.drawImage(ic, sx + (sw - 32) / 2, sy + (sh - 32) / 2);
    };
    ic.src = `ui/props/ic32-${STILL_ICON[id] ?? 'gear'}.png`;
  }
  scene.querySelector('i')?.remove();
  scene.prepend(cv);
};

void mix; void scale;
