/**
 * 판 위 도트 FX 층 (D-249, 사용자: 「반장 연출 · fx가 허접하다」): Phaser 판 위에 pxfx 캔버스 하나를 덮는다 (누르기는 아래로 통과).
 *  - 반장 판 공기: 철갑 = 판 아래에서 불씨가 오르고 가장자리가 달아오름 / 조립 = 청록 훑는 줄 · 리벳 불꽃 / 출하 = 흰 역광 먼지 · 붉은 반짝
 *  - 기믹 순간: 줄 폭격 = 칸마다 불기둥이 솟고 연기 · 불씨 · 흰 장 / 되받아침 = 붉은 쇳조각이 친 기물로 날아가 박힘 / 찍어 내기 = 쾅 먼지 · 불꽃
 * 판이 안 보이면(body.between) 쉰다.
 */
import { FxCanvas, hex, Lights, P, PAL, Particles, Rng, WHITE, bayer } from './pxfx';
import type { Pos } from '../engine';

const D = 3;

export class BoardFx {
  fx: FxCanvas | null = null;
  R = new Rng(17);
  ps: Particles;
  lights = new Lights();
  rule = '';
  t = 0;
  private stopLoop = false;
  private flash = 0;
  private acc = 0;
  constructor(private host: HTMLElement, private screenOf: (p: Pos) => { x: number; y: number }) {
    this.ps = new Particles(this.R, () => Infinity);
  }
  /** 칸 → 이 층의 도트 좌표 (칸 가운데) */
  private dot(p: Pos): { x: number; y: number } {
    const s = this.screenOf(p);
    const r = this.host.getBoundingClientRect();
    return { x: (s.x - r.left) / D, y: (s.y - r.top) / D };
  }
  private tileDots(): number {
    const a = this.screenOf({ x: 0, y: 0 }), b = this.screenOf({ x: 1, y: 0 });
    return Math.abs(b.x - a.x) / D || 10;
  }
  /** 층을 세운다 (판이 세워질 때마다) — rule: '' = 반장 아님 */
  setup(rule: string): void {
    this.rule = rule;
    const r = this.host.getBoundingClientRect();
    const w = Math.ceil(r.width / D), h = Math.ceil(r.height / D);
    if (!this.fx || this.fx.w !== w || this.fx.h !== h) {
      this.fx?.canvas.remove();
      this.fx = new FxCanvas(w, h, D);
      Object.assign(this.fx.canvas.style, { position: 'absolute', left: '0', top: '0', pointerEvents: 'none', zIndex: '5' });
      this.host.appendChild(this.fx.canvas);
    }
    this.ps = new Particles(this.R, () => Infinity, rule === 'gilded' ? [hex('#fffbe0'), hex('#f4c84a'), hex('#9a6a14')] : rule === 'spawn' ? [hex('#efffdc'), hex('#7fd45a'), hex('#3e8c3a')] : rule === 'thorns' ? [hex('#ffc4c4'), hex('#ff6b6b'), hex('#c42430')] : undefined);
    this.start();
  }
  private running = false;
  private start(): void {
    if (this.running || !this.fx) return;
    this.running = true;
    this.stopLoop = false;
    let last = performance.now();
    const tick = (now: number) => {
      if (this.stopLoop || !this.fx) { this.running = false; return; }
      const between = document.body.classList.contains('between');
      let dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!between) {
        while (dt > 0) { const s = Math.min(1 / 60, dt); this.sim(s); dt -= s; }
        this.draw();
      }
      // 반장 판이 아니고 입자도 없으면 쉰다 (다음 기믹이 깨운다)
      if (!this.rule && !this.ps.list.length && !this.lights.list.length && this.flash <= 0) { this.fx.frame.clear(); this.fx.present(); this.running = false; return; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  /** 판 경계 (도트) */
  private bounds(w: number, h: number): { x0: number; y0: number; x1: number; y1: number } {
    const a = this.dot({ x: 0, y: 0 }), b = this.dot({ x: w - 1, y: h - 1 }), half = this.tileDots() / 2;
    return { x0: Math.min(a.x, b.x) - half, x1: Math.max(a.x, b.x) + half, y0: Math.min(a.y, b.y) - half, y1: Math.max(a.y, b.y) + half };
  }
  boardSize = { w: 6, h: 6 };
  private sim(dt: number): void {
    this.t += dt;
    this.ps.update(dt);
    this.lights.update(dt);
    this.flash -= dt;
    if (!this.rule || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const B = this.bounds(this.boardSize.w, this.boardSize.h), R = this.R;
    this.acc += dt * (this.rule === 'plate' ? 9 : this.rule === 'spawn' ? 4 : this.rule === 'gilded' ? 7 : this.rule === 'alarm' ? 3 : 5);
    for (; this.acc > 1; this.acc--) {
      if (this.rule === 'plate') {
        // 판 아래 가장자리에서 불씨가 오른다
        this.ps.spawn(P.EMBER, R.range(B.x0, B.x1), B.y1 + R.range(-2, 4), R.range(-10, 10), R.range(-30, -12), R.range(1.2, 2.4), WHITE, R.range(1, 1.8));
      } else if (this.rule === 'spawn') {
        // 리벳에서 청록 불꽃이 튄다
        const x = R.range(B.x0, B.x1), y = R.range(B.y0, B.y1);
        this.ps.spawn(P.SPARK, x, y, R.range(-40, 40), R.range(-60, -10), R.range(0.2, 0.4), WHITE, 1);
      } else if (this.rule === 'gilded') {
        // 금가루가 위에서 천천히 내려앉고, 가끔 금빛이 반짝인다
        if (R.chance(0.7)) this.ps.spawn(P.MOTE, R.range(B.x0, B.x1), B.y0 - 4, R.range(-4, 4), R.range(6, 14), R.range(2, 3.4), hex('#f4c84a'), 0.5);
        else this.ps.spawn(P.STAR, R.range(B.x0, B.x1), R.range(B.y0, B.y1), 0, 0, R.range(0.5, 0.9), hex('#ffe68a'), R.range(0.8, 1.8));
      } else if (this.rule === 'inspect') {
        // 검사등 먼지: 찬 청록 티끌이 천천히 내려앉는다 (D-309)
        this.ps.spawn(P.MOTE, R.range(B.x0, B.x1), B.y0 - 2, R.range(-3, 3), R.range(5, 10), R.range(2, 3), hex('#9ee8f0'), 0.5);
      } else if (this.rule === 'magnet') {
        // 쇳가루: 보라 티끌이 판 가운데로 끌려간다 (D-309)
        const x = R.chance(0.5) ? B.x0 - 2 : B.x1 + 2, y = R.range(B.y0, B.y1), cx = (B.x0 + B.x1) / 2, cy = (B.y0 + B.y1) / 2;
        this.ps.spawn(P.MOTE, x, y, (cx - x) * 0.35, (cy - y) * 0.35, R.range(1.6, 2.6), hex('#d08af0'), 0.5);
      } else if (this.rule === 'alarm') {
        // 경보: 붉은 불티가 가장자리에서 튄다 (D-309)
        this.ps.spawn(P.SPARK, R.chance(0.5) ? B.x0 : B.x1, R.range(B.y0, B.y1), R.range(-30, 30), R.range(-50, -10), R.range(0.2, 0.4), hex('#ff6b6b'), 1);
      } else {
        // 흰 역광 먼지가 천천히 떠오른다
        this.ps.spawn(P.MOTE, R.range(B.x0, B.x1), R.range(B.y0, B.y1), R.range(-4, 4), R.range(-12, -4), R.range(1.2, 2.2), hex('#d8d4dc'), 0.5);
      }
    }
  }
  private draw(): void {
    const fx = this.fx!;
    fx.frame.clear();
    const p = fx.painter;
    const B = this.bounds(this.boardSize.w, this.boardSize.h);
    if (this.rule === 'plate') {
      // 아래 가장자리가 달아오른다 (빛만, 칸은 덮지 않는다)
      for (let x = B.x0; x < B.x1; x += 6) p.glow(x, B.y1 + 2, 10, PAL.fire[4], 0.1 + 0.04 * Math.sin(this.t * 3 + x));
    } else if (this.rule === 'spawn') {
      // 3.6초마다 초록 줄이 판을 위에서 아래로 훑는다 (4도트 계단, D-347)
      const ph = (this.t % 3.6) / 1.2;
      if (ph < 1) {
        const y = B.y0 + Math.floor((ph * (B.y1 - B.y0)) / 2) * 2;
        p.line(B.x0, y, B.x1, y, PAL.toxic[6], 0.8);
        for (let x = B.x0; x < B.x1; x++) if (bayer(Math.floor(x), Math.floor(y) + 1) < 0.35) p.px(x, y + 1, PAL.toxic[4]);
        p.glowLine(B.x0, y, B.x1, y, 4, PAL.toxic[5], 0.35);
      }
    } else if (this.rule === 'alarm') {
      // 경고등 박자: 1.2초마다 판 테두리가 두 번 붉게 깜빡인다 (계단 — 켜짐/꺼짐만)
      const k = (this.t % 1.2) / 1.2;
      if (k < 0.08 || (k > 0.16 && k < 0.24)) for (const [x0, y0, x1, y1] of [[B.x0, B.y0, B.x1, B.y0], [B.x0, B.y1, B.x1, B.y1], [B.x0, B.y0, B.x0, B.y1], [B.x1, B.y0, B.x1, B.y1]]) p.glowLine(x0, y0, x1, y1, 4, PAL.blood[6], 0.3);
    } else if (this.rule === 'inspect') {
      // 검사등: 4.8초마다 흰 청록 사각 테가 칸 하나를 훑고 지나간다
      const ph = (this.t % 4.8) / 1.6;
      if (ph < 1) { const td = this.tileDots(); const x = B.x0 + Math.floor(ph * ((B.x1 - B.x0) / td)) * td; p.line(x, B.y0, x, B.y1, PAL.teal[6], 0.5); }
    } else if (this.rule === 'thorns') {
      // 네 모서리에 붉은 반짝 (차례로)
      const corners = [[B.x0, B.y0], [B.x1, B.y0], [B.x1, B.y1], [B.x0, B.y1]];
      const i = Math.floor(this.t * 0.8) % 4, k = (this.t * 0.8) % 1;
      if (k < 0.3) p.sparkle(corners[i][0], corners[i][1], 2 + (k < 0.15 ? 1 : 0), PAL.blood[5], PAL.blood[3], 0.4);
    }
    this.ps.draw(p, 'back');
    this.ps.draw(p, 'front');
    this.lights.draw(p);
    if (this.flash > 0) p.rect(0, 0, fx.w, fx.h, WHITE, Math.min(0.8, this.flash * 10));
    fx.present();
  }
  private wake(): void { this.start(); }

  /** 줄 폭격: 칸마다 차례로 불기둥이 솟고, 흰 장 한 장, 연기 · 불씨가 남는다 */
  async rowBomb(row: number, width: number): Promise<void> {
    this.wake();
    const td = this.tileDots();
    for (let x = 0; x < width; x++) {
      const c = this.dot({ x, y: row });
      window.setTimeout(() => {
        for (let i = 0; i < 18; i++) this.ps.spawn(P.FIRE, c.x + this.R.range(-td / 2.5, td / 2.5), c.y + td / 2 - 1, this.R.range(-6, 6), this.R.range(-220, -90), this.R.range(0.35, 0.7), 0, this.R.range(2, 3.6), 0, this.R.chance(0.45));
        for (let i = 0; i < 4; i++) this.ps.spawn(P.EMBER, c.x, c.y, this.R.range(-30, 30), this.R.range(-90, -40), this.R.range(0.8, 1.4), WHITE, 1.5);
        this.lights.add(c.x, c.y, td * 1.4, PAL.fire[5], 0.8, 0.5);
      }, x * 55);
    }
    window.setTimeout(() => (this.flash = 0.06), width * 55);
    await new Promise((r) => window.setTimeout(r, width * 55 + 200));
  }
  /** 되받아침: 반장에게서 붉은 쇳조각이 친 기물로 날아가 박힌다 */
  async thorns(from: Pos, to: Pos): Promise<void> {
    this.wake();
    const a = this.dot(from), b = this.dot(to);
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
    for (let i = 0; i < 26; i++) {
      const sp = this.R.range(160, 260);
      this.ps.spawn(i % 3 ? P.MOTE : P.SHARD, a.x + this.R.range(-3, 3), a.y + this.R.range(-3, 3), (dx / d) * sp + this.R.range(-30, 30), (dy / d) * sp + this.R.range(-30, 30), d / sp, i % 2 ? PAL.blood[5] : PAL.blood[6], this.R.range(1.4, 2.2), i * 0.01);
    }
    // 반장 쪽에서 가시가 돋는 빛
    this.lights.add(a.x, a.y, 20, PAL.blood[5], 0.9, 0.4);
    window.setTimeout(() => { this.ps.burst(b.x, b.y, 12, [60, 160], P.SPARK, [0.2, 0.45], WHITE, 30); this.lights.add(b.x, b.y, 18, PAL.blood[5], 0.9, 0.4); }, 220);
    await new Promise((r) => window.setTimeout(r, 360));
  }
  /** 찍어 내기: 쾅 — 먼지 고리 · 청록 불꽃 · 빛 */
  stamp(at: Pos): void {
    this.wake();
    const c = this.dot(at), td = this.tileDots();
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; this.ps.spawn(P.DUST, c.x + Math.cos(a) * 3, c.y + td / 3, Math.cos(a) * 80, Math.sin(a) * 26 - 6, 0.8, PAL.smoke[5], 4.5); }
    this.ps.burst(c.x, c.y, 22, [80, 220], P.SPARK, [0.25, 0.6], WHITE, 50);
    const tone = this.rule === 'spawn' ? PAL.toxic : PAL.teal;
    for (let i = 0; i < 8; i++) this.ps.spawn(P.STAR, c.x + this.R.range(-td / 2, td / 2), c.y + this.R.range(-td / 2, td / 3), 0, 0, this.R.range(0.4, 0.8), tone[6], this.R.range(1.2, 2.4), this.R.range(0, 0.2));
    this.lights.add(c.x, c.y, td, tone[5], 0.9, 0.5);
    this.flash = 0.05;
  }
}
