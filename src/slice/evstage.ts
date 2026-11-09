/**
 * 사건 무대 (D-260, 사용자: 「컷씬 활용, 요소는 단순화 — 대사 + 실제 카드 · 덱 · 기물 이미지만. 사건 전용 소품은 다 빼라」).
 * 장면 = 받은 사건 그림(컷씬) 그대로. 그 위에 올리는 것은 셋뿐이다:
 *  ① 확률 장치 — 사각 칸만: 동전(던지기) · 칸 셋(기호가 하나씩 떨어짐) · 칸 셋(녹을 긁음). 기계 · 상자 · 소품은 없다.
 *  ② 카드 — 실제 카드 얼굴에 FX: 강화(번쩍 → 다듬은 카드로 바뀜 · 초록 불꽃) · 녹(잿빛으로 계단 변색) · 파괴(잿빛 → 금 → 조각 · 디더 퇴장) · 새 카드(디더 등장)
 *  ③ 기물 — 실제 기물 그림 + 아래 HP 바: 전투처럼 HP가 줄거나(흰 잔상 → 계단으로 줄어듦 · 붉은 번쩍) 차오름(초록) · 진화(흰 번쩍 → 새 기물) · 썰림(베기 선 → 두 쪽 → 잿빛 · 디더 퇴장)
 * 결과는 엔진(events.ts)이 이미 정했다 — 보여 주기만 한다 (UI 원칙 9).
 */
import { sfx } from '../audio/sfx';
import { FxCanvas, hex, Lights, P, Particles, PAL, Rng, WHITE } from '../view/pxfx';

const D = 3;
const calm = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, calm() ? Math.min(ms, 80) : ms));

/** 카드 하나의 변화 — before/after는 카드 얼굴 HTML */
export interface CardFx { before?: string; after?: string; fx: 'up' | 'rust' | 'break' | 'new' }
/** 분대원 하나의 변화 — src는 기물 그림 */
export interface CrewFx { src: string; toSrc?: string; name: string; hp0: number; hp1: number; max: number; fx: 'hp' | 'up' | 'evolve' | 'die' | 'new'; tag?: string }
export interface EvFxCtx {
  id: string;
  good: boolean;
  /** 확률 장치: 동전 · 칸 셋(떨어짐) · 칸 셋(긁기) — items는 ICON-01 기호 이름 */
  chance?: { kind: 'coin' | 'slots' | 'scratch'; items?: [string, string, string]; win: boolean };
  cards: CardFx[];
  crew: CrewFx[];
  tap?: string;
}

const imgs = new Map<string, HTMLImageElement>();
const img = (src: string): HTMLImageElement => {
  let i = imgs.get(src);
  if (!i) { i = new Image(); i.src = src; imgs.set(src, i); }
  return i;
};
for (let i = 0; i < 12; i++) img(`ui/props/flip-${i}.png`);
['gear-gold', 'crown-gold', 'gear-broken', 'rust'].forEach((n) => img(`ui/props/ic32-${n}.png`));

/** 장면 위 도트 층 하나 (입자 · 빛 + 그림 캔버스) — 장면 칸 안쪽을 그대로 덮는다 */
class Layer {
  fx: FxCanvas;
  art: HTMLCanvasElement;
  x: CanvasRenderingContext2D;
  ps: Particles;
  lights = new Lights();
  w: number;
  h: number;
  R: Rng;
  private on = true;
  constructor(public host: HTMLElement, seed: number) {
    this.w = Math.floor(host.clientWidth / D);
    this.h = Math.floor(host.clientHeight / D);
    this.art = document.createElement('canvas');
    this.art.width = this.w; this.art.height = this.h;
    this.art.className = 'ev-fx';
    this.x = this.art.getContext('2d')!;
    this.x.imageSmoothingEnabled = false;
    this.fx = new FxCanvas(this.w, this.h, D);
    this.fx.canvas.className = 'ev-fx ev-fx-top';
    host.append(this.art, this.fx.canvas);
    this.R = new Rng(seed);
    this.ps = new Particles(this.R, () => this.h + 40);
    let last = performance.now();
    const tick = (now: number) => {
      if (!this.on || !host.isConnected) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      this.ps.update(dt); this.lights.update(dt);
      this.fx.frame.clear();
      this.ps.draw(this.fx.painter, 'back'); this.ps.draw(this.fx.painter, 'front'); this.lights.draw(this.fx.painter);
      this.fx.present();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  /** 화면 좌표(요소) → 도트 좌표 */
  at(el: Element): { x: number; y: number; w: number; h: number } {
    const a = this.host.getBoundingClientRect(), b = el.getBoundingClientRect();
    const k = this.art.getBoundingClientRect().width / this.w || D;
    return { x: (b.left - a.left - this.host.clientLeft) / k, y: (b.top - a.top - this.host.clientTop) / k, w: b.width / k, h: b.height / k };
  }
  stop() { this.on = false; }
}

/** 손짓 테이프 (종이) — 무엇을 할지 말한다 */
const tape = (host: HTMLElement, label: string): HTMLButtonElement => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'ev-tap';
  b.textContent = `▼ ${label}`;
  host.appendChild(b);
  return b;
};

// ── ① 확률 장치 ──

/** 동전 던지기: 장면 위로 튕겨 올라 세로축 12장 회전 → 떨어져 튕기며 결과 면 */
const coinToss = async (L: Layer, c: EvFxCtx): Promise<void> => {
  const { x } = L;
  const cx = Math.round(L.w / 2) - 20, rest = L.h - 44, peak = 8;
  const end = c.chance!.win ? 0 : 6;
  const draw = (f: number, y: number, xo = 0) => {
    x.clearRect(0, 0, L.w, L.h);
    const sh = Math.max(4, 12 - Math.round((rest - y) / 6));
    x.fillStyle = '#0b0b0e'; // 그림자 (반투명 대신 디더 점)
    for (let a = -sh; a <= sh; a++) for (let b = -1; b <= 1; b++) if ((a + b) % 2 === 0) x.fillRect(cx + 20 + a + xo, rest + 33 + b, 1, 1);
    const im = img(`ui/props/flip-${f}.png`);
    if (im.complete) x.drawImage(im, cx + xo, Math.round(y));
  };
  draw(0, rest);
  await wait(450); // 자동으로 튕긴다 (D-260)
  const t0 = performance.now(), T = calm() ? 0.2 : 1.6;
  await new Promise<void>((done) => {
    const step = () => {
      if (!L.host.isConnected) return done();
      const t = (performance.now() - t0) / 1000;
      let y = rest, f = 0;
      if (t < 0.1) y = rest + 2;
      else if (t < 1.15) { const k = (t - 0.1) / 1.05; y = rest + (peak - rest) * (1 - Math.pow(2 * k - 1, 2)); f = (end - Math.ceil((1.15 - t) * 22) + 120) % 12; }
      else if (t < 1.3) { f = (end + 1) % 12; y = rest - Math.sin(((t - 1.15) / 0.15) * Math.PI) * 4; }
      else { f = end; y = rest; }
      draw(f, y);
      if (t > 0.6 && t < 0.62) L.ps.spawn(P.STAR, cx + 20, peak + 8, 0, 0, 0.4, hex(PAL.gold[5]), 2.4);
      if (t >= T) {
        for (let i = 0; i < 6; i++) L.ps.spawn(P.DUST, cx + 20 + L.R.range(-10, 10), rest + 32, L.R.range(-30, 30), L.R.range(-10, -2), 0.6, hex('#5a5e6c'), 2);
        if (c.chance!.win) { L.ps.burst(cx + 20, rest + 14, 18, [50, 140], P.STAR, [0.5, 1], PAL.gold[5]); L.lights.add(cx + 20, rest + 14, 34, PAL.gold[5], 1, 0.7); }
        return done();
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  await wait(700);
};

const SL = 36, GAP = 6;
const slotBox = (L: Layer, i: number) => ({ x: Math.round(L.w / 2 - (SL * 3 + GAP * 2) / 2) + i * (SL + GAP), y: Math.round(L.h / 2 - SL / 2) });
/** 움푹한 칸 하나 (먹 테 · 안쪽 그늘 위왼 · 빛 아래오른) + 테 색 */
const drawSlot = (x: CanvasRenderingContext2D, a: number, b: number, edge: string | null) => {
  x.fillStyle = '#0b0b0e'; x.fillRect(a - 2, b - 2, SL + 4, SL + 4);
  x.fillStyle = edge ?? '#41434f'; x.fillRect(a - 1, b - 1, SL + 2, SL + 2);
  x.fillStyle = '#16141c'; x.fillRect(a, b, SL, SL);
  x.fillStyle = '#0b0b0e'; x.fillRect(a, b, SL, 2); x.fillRect(a, b, 2, SL);
  x.fillStyle = '#2c2d38'; x.fillRect(a, b + SL - 1, SL, 1); x.fillRect(a + SL - 1, b, 1, SL);
};

/** 칸 셋 — 기호가 하나씩 떨어져 박힌다. 앞 둘이 같으면 셋째 칸 테가 오래 깜빡이며 애태운다 */
const slotsDrop = async (L: Layer, c: EvFxCtx): Promise<void> => {
  const res = c.chance!.items!;
  // 여는 순서대로 결과 기호가 들어간다 (마지막에 연 칸이 판가름)
  const items: string[] = ['', '', ''];
  const state = res.map(() => ({ y: -40, vy: 0, on: false, landed: false }));
  let blink = -1, edge: (string | null)[] = [null, null, null], over = false;
  const draw = (t: number) => {
    L.x.clearRect(0, 0, L.w, L.h);
    for (let i = 0; i < 3; i++) {
      const b = slotBox(L, i);
      const e = blink === i && Math.floor(t * 12) % 2 ? '#f4d27a' : edge[i];
      drawSlot(L.x, b.x, b.y, e);
      const s = state[i];
      if (s.on) {
        L.x.save(); L.x.beginPath(); L.x.rect(b.x, b.y, SL, SL); L.x.clip();
        const im = img(`ui/props/ic32-${items[i]}.png`);
        if (im.complete) L.x.drawImage(im, b.x + 2, Math.round(b.y + 2 + s.y));
        L.x.restore();
      }
    }
  };
  draw(0);
  const t0 = performance.now();
  const loop = () => new Promise<void>((done) => {
    let last = performance.now();
    const f = (now: number) => {
      if (!L.host.isConnected) return done();
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      for (let i = 0; i < 3; i++) {
        const s = state[i], b = slotBox(L, i);
        if (!s.on || s.landed) continue;
        s.vy += 700 * dt; s.y += s.vy * dt;
        if (s.y >= 0) { s.y = 0; s.landed = true; L.ps.burst(b.x + SL / 2, b.y + SL - 2, 8, [30, 90], P.SPARK, [0.15, 0.3], WHITE, 30); L.lights.add(b.x + SL / 2, b.y + SL / 2, 14, hex('#f4f1ea'), 0.5, 0.25); }
      }
      draw((now - t0) / 1000);
      if (over) return done();
      requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  });
  const run = loop();
  const drop = (i: number) => { state[i].on = true; state[i].y = -SL; state[i].vy = 40; };
  // 칸을 하나씩 눌러 연다 (사용자 D-260): 앞 둘이 같으면 남은 칸이 깜빡이며 애태우고 누르면 한참 덜컹인 뒤 떨어진다
  let last = 2;
  await new Promise<void>((allOpen) => {
    const hint = tape(L.host, c.tap ?? '칸을 하나씩 누른다');
    let n = 0, busy = false;
    const open = async (i: number) => {
      if (busy || state[i].on || items[i]) return;
      busy = true;
      items[i] = res[n++];
      if (n === 3 && res[0] === res[1] && !calm()) { blink = i; sfx('threat'); await wait(1300); blink = -1; }
      drop(i); sfx('tap');
      await wait(380);
      busy = false;
      if (n === 2 && res[0] === res[1]) blink = [0, 1, 2].find((k) => !items[k]) ?? -1;
      if (n === 3) { last = i; hint.remove(); L.host.removeEventListener('pointerdown', on); allOpen(); }
    };
    const on = (e: PointerEvent) => {
      const r = L.art.getBoundingClientRect();
      const px = ((e.clientX - r.left) / r.width) * L.w, py = ((e.clientY - r.top) / r.height) * L.h;
      for (let i = 0; i < 3; i++) { const b = slotBox(L, i); if (px >= b.x - 4 && px <= b.x + SL + 4 && py >= b.y - 4 && py <= b.y + SL + 4) void open(i); }
    };
    L.host.addEventListener('pointerdown', on);
    hint.addEventListener('click', () => void open([0, 1, 2].find((k) => !items[k]) ?? 0));
    if (calm()) { void open(0); void open(1); void open(2); }
  });
  await wait(450);
  const win = c.chance!.win;
  edge = win ? ['#f4d27a', '#f4d27a', '#f4d27a'] : [0, 1, 2].map((k) => (k === last ? '#e5262f' : '#41434f'));
  if (win) for (let i = 0; i < 3; i++) { const b = slotBox(L, i); L.ps.burst(b.x + SL / 2, b.y + SL / 2, 10, [40, 120], P.STAR, [0.5, 0.9], PAL.gold[5]); L.lights.add(b.x + SL / 2, b.y + SL / 2, 24, PAL.gold[5], 0.9, 0.6); }
  else { const b = slotBox(L, last); L.ps.burst(b.x + SL / 2, b.y + SL / 2, 18, [60, 160], P.SPARK, [0.2, 0.5], WHITE, 40); for (let k = 0; k < 8; k++) L.ps.spawn(P.SMOKE, b.x + SL / 2 + L.R.range(-8, 8), b.y, L.R.range(-10, 10), L.R.range(-40, -15), L.R.range(0.8, 1.4), 0, L.R.range(3, 5), k * 0.04); }
  await wait(1100);
  over = true;
  await run;
};

/** 칸 셋 — 녹이 덮고 있다, 손가락으로 긁는다. 반 넘게 긁히면 남은 녹이 계단 디더로 떨어진다 */
const scratch = async (L: Layer, c: EvFxCtx): Promise<void> => {
  const items = c.chance!.items!;
  const RUST = ['#24110b', '#4a2112', '#74361a', '#9a4c22', '#c06a30', '#e0904a', '#f4b47a'];
  const hash = (a: number, b: number, k: number) => { const v = Math.sin(a * 127.1 + b * 311.7 + k * 74.7) * 43758.5453; return v - Math.floor(v); };
  const cover = [0, 1, 2].map((si) => Array.from({ length: SL * SL }, (_, k) => {
    const xx = k % SL, yy = Math.floor(k / SL);
    const n = (Math.sin(xx * 0.45 + si * 3) + Math.cos(yy * 0.4 - si) + Math.sin((xx + yy) * 0.2 + si)) / 3;
    const v = Math.max(1, Math.min(5, Math.round(3 + n * 2 + (hash(xx, yy, si) - 0.5) * 1.2)));
    return RUST[v];
  }));
  const rust = [0, 1, 2].map(() => new Uint8Array(SL * SL).fill(1));
  const open = [false, false, false];
  let edge: (string | null)[] = [null, null, null], done2 = false;
  const draw = () => {
    L.x.clearRect(0, 0, L.w, L.h);
    for (let i = 0; i < 3; i++) {
      const b = slotBox(L, i);
      drawSlot(L.x, b.x, b.y, edge[i]);
      const im = img(`ui/props/ic32-${items[i]}.png`);
      if (im.complete) L.x.drawImage(im, b.x + 2, b.y + 2);
      for (let k = 0; k < SL * SL; k++) if (rust[i][k]) { L.x.fillStyle = cover[i][k]; L.x.fillRect(b.x + (k % SL), b.y + Math.floor(k / SL), 1, 1); }
    }
  };
  draw();
  const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  return new Promise<void>((resolve) => {
    const hint = tape(L.host, c.tap ?? '녹을 긁어낸다');
    const finish = async () => {
      if (done2) return; done2 = true;
      hint.remove();
      const win = c.chance!.win;
      edge = win ? ['#f4d27a', '#f4d27a', '#f4d27a'] : ['#41434f', '#41434f', '#e5262f'];
      draw();
      if (win) for (let i = 0; i < 3; i++) { const b = slotBox(L, i); L.ps.burst(b.x + SL / 2, b.y + SL / 2, 10, [40, 120], P.STAR, [0.5, 0.9], PAL.gold[5]); L.lights.add(b.x + SL / 2, b.y + SL / 2, 24, PAL.gold[5], 0.9, 0.6); }
      else { const b = slotBox(L, 2); for (let k = 0; k < 14; k++) L.ps.spawn(P.SMOKE, b.x + SL / 2 + L.R.range(-12, 12), b.y + L.R.range(0, SL), L.R.range(-20, 20), L.R.range(-30, -8), L.R.range(1, 1.6), hex(RUST[3]), L.R.range(3, 6), k * 0.03); }
      await wait(1300);
      L.host.style.touchAction = '';
      resolve();
    };
    const reveal = (i: number) => {
      if (open[i]) return;
      open[i] = true;
      [0.75, 0.5, 0.25, 0].forEach((k, n) => window.setTimeout(() => { for (let q = 0; q < SL * SL; q++) if (BAY[((Math.floor(q / SL) & 3) << 2) | ((q % SL) & 3)] / 16 >= k) rust[i][q] = 0; draw(); }, n * 60));
      if (open.every(Boolean)) window.setTimeout(finish, 450);
    };
    let down = false, lastP: [number, number] | null = null;
    /** 한 점 긁기 (반지름 3도트 붓) */
    const dab = (px: number, py: number) => {
      for (let i = 0; i < 3; i++) {
        const b = slotBox(L, i);
        if (open[i] || px < b.x - 4 || px > b.x + SL + 4 || py < b.y - 4 || py > b.y + SL + 4) continue;
        let n = 0;
        for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
          if (dx * dx + dy * dy > 10) continue;
          const xx = Math.floor(px - b.x + dx), yy = Math.floor(py - b.y + dy);
          if (xx < 0 || yy < 0 || xx >= SL || yy >= SL || !rust[i][yy * SL + xx]) continue;
          rust[i][yy * SL + xx] = 0; n++;
        }
        if (n && L.R.chance(0.35)) L.ps.spawn(P.GRIT, px, py, L.R.range(-30, 30), L.R.range(-40, 10), L.R.range(0.6, 1.1), hex(RUST[L.R.int(4) + 2]), L.R.chance(0.3) ? 2 : 1);
        if (rust[i].reduce((a, v) => a + v, 0) / (SL * SL) < 0.45) reveal(i);
      }
    };
    /** 손가락이 지나간 선 전체를 긁는다 (이벤트 사이를 2도트 간격으로 메움) */
    const scrape = (ex: number, ey: number) => {
      const r = L.art.getBoundingClientRect();
      const px = ((ex - r.left) / r.width) * L.w, py = ((ey - r.top) / r.height) * L.h;
      const [ax, ay] = lastP ?? [px, py];
      const n = Math.max(1, Math.ceil(Math.hypot(px - ax, py - ay) / 2));
      for (let k = 1; k <= n; k++) dab(ax + ((px - ax) * k) / n, ay + ((py - ay) * k) / n);
      lastP = [px, py];
      draw();
    };
    // 끌기를 브라우저가 스크롤로 가로채지 않게 (가로채면 pointercancel로 긁기가 끊긴다)
    L.host.style.touchAction = 'none';
    L.host.addEventListener('pointerdown', (e) => { e.preventDefault(); down = true; lastP = null; L.host.setPointerCapture?.(e.pointerId); scrape(e.clientX, e.clientY); });
    L.host.addEventListener('pointermove', (e) => { if (down) scrape(e.clientX, e.clientY); });
    L.host.addEventListener('pointerup', () => { down = false; lastP = null; });
    hint.addEventListener('click', () => reveal([0, 1, 2].find((i) => !open[i]) ?? 0));
    if (calm()) [0, 1, 2].forEach(reveal);
  });
};

// ── ② 카드 · ③ 기물 ──

/** 결과 줄: 장면 위 디더 띠 안에 실제 카드 · 기물을 세우고 하나씩 FX */
const showResults = async (L: Layer, c: EvFxCtx): Promise<void> => {
  const cards = c.cards.slice(0, 3), crew = c.crew.slice(0, 4);
  if (!cards.length && !crew.length) return;
  const row = document.createElement('div');
  row.className = 'ev-res';
  L.host.appendChild(row);
  const items: { el: HTMLElement; run: () => Promise<void> }[] = [];
  for (const cd of cards) {
    const el = document.createElement('div');
    el.className = `er-card reward-cards fx-${cd.fx}`; // 보상 화면과 같은 카드 얼굴 크기
    el.innerHTML = cd.fx === 'new' ? cd.after ?? '' : cd.before ?? cd.after ?? '';
    row.appendChild(el);
    items.push({ el, run: () => cardFx(L, el, cd) });
  }
  for (const cr of crew) {
    const el = document.createElement('div');
    el.className = `er-crew fx-${cr.fx}`;
    const pct = (v: number) => `${Math.max(0, Math.min(100, Math.round((v / cr.max) * 100)))}%`;
    el.innerHTML = `<div class="er-pc"><img src="${cr.src}" alt=""></div><div class="er-hp"><i class="er-ghost" style="width:${pct(cr.hp0)}"></i><i class="er-fill" style="width:${pct(cr.hp0)}"></i></div><b class="er-name">${cr.name}</b>${cr.tag ? `<small class="er-tag" hidden>${cr.tag}</small>` : ''}`;
    row.appendChild(el);
    items.push({ el, run: () => crewFx(L, el, cr, pct) });
  }
  row.classList.add('in');
  await wait(380);
  for (const it of items) { await it.run(); await wait(140); }
  await wait(500);
};

/** 계단 클래스 바꾸기 (애니메이션은 CSS steps) */
const cls = async (el: HTMLElement, name: string, ms: number) => { el.classList.add(name); await wait(ms); };

const cardFx = async (L: Layer, el: HTMLElement, cd: CardFx): Promise<void> => {
  const r = () => L.at(el);
  if (cd.fx === 'new') {
    await cls(el, 'appear', 320);
    const b = r(); L.ps.burst(b.x + b.w / 2, b.y + b.h / 2, 14, [40, 120], P.STAR, [0.4, 0.8], PAL.gold[5]);
    return;
  }
  await cls(el, 'pre', 300); // 예비: 떨림
  if (cd.fx === 'up') {
    await cls(el, 'flash', 120);
    el.innerHTML = cd.after ?? el.innerHTML;
    el.classList.remove('pre', 'flash');
    const b = r();
    L.ps.burst(b.x + b.w / 2, b.y + b.h / 2, 22, [50, 150], P.SPARK, [0.3, 0.6], PAL.heal[5], 40);
    for (let i = 0; i < 10; i++) L.ps.spawn(P.MOTE, b.x + L.R.range(4, b.w - 4), b.y + b.h - 6, L.R.range(-6, 6), L.R.range(-70, -30), L.R.range(0.5, 0.9), PAL.heal[6], 1, i * 0.04);
    L.lights.add(b.x + b.w / 2, b.y + b.h / 2, 40, PAL.heal[5], 0.9, 0.5);
    await cls(el, 'upped', 500);
  } else if (cd.fx === 'rust') {
    el.classList.remove('pre');
    await cls(el, 'rusting', 480); // 잿빛 · 녹빛으로 3계단
    el.innerHTML = cd.after ?? el.innerHTML;
    const b = r();
    for (let i = 0; i < 16; i++) L.ps.spawn(P.GRIT, b.x + L.R.range(4, b.w - 4), b.y + L.R.range(4, b.h - 4), L.R.range(-10, 10), L.R.range(0, 30), L.R.range(0.6, 1.1), hex(['#74361a', '#9a4c22', '#c06a30'][i % 3]), 1);
  } else {
    el.classList.remove('pre');
    await cls(el, 'greying', 360);
    await cls(el, 'cracked', 220);
    const b = r();
    for (let i = 0; i < 20; i++) L.ps.spawn(P.SHARD, b.x + L.R.range(4, b.w - 4), b.y + L.R.range(4, b.h - 4), L.R.range(-90, 90), L.R.range(-120, -30), L.R.range(0.8, 1.4), hex(i % 2 ? '#868a98' : '#b9bdc8'), L.R.range(1, 2));
    await cls(el, 'gone', 340); // 디더 퇴장
  }
};

const crewFx = async (L: Layer, el: HTMLElement, cr: CrewFx, pct: (v: number) => string): Promise<void> => {
  const pc = el.querySelector<HTMLElement>('.er-pc')!;
  const fill = el.querySelector<HTMLElement>('.er-fill')!, ghost = el.querySelector<HTMLElement>('.er-ghost')!;
  const r = () => L.at(pc);
  if (cr.fx === 'new') { await cls(el, 'appear', 320); const b = r(); L.ps.burst(b.x + b.w / 2, b.y + b.h / 2, 14, [40, 120], P.STAR, [0.4, 0.8], PAL.gold[5]); return; }
  if (cr.fx === 'hp' || (cr.hp1 !== cr.hp0 && cr.fx !== 'die')) {
    const hurt = cr.hp1 < cr.hp0;
    if (hurt) {
      await cls(pc, 'hit', 160); pc.classList.remove('hit');
      const b = r(); L.ps.burst(b.x + b.w / 2, b.y + b.h * 0.45, 12, [40, 120], P.SPARK, [0.2, 0.4], hex('#e5262f'), 20);
      // 전투와 같은 HP 바: 채움이 먼저 줄고 흰 잔상이 계단으로 따라 내려온다
      fill.style.width = pct(cr.hp1);
      await wait(260);
      ghost.classList.add('drain'); ghost.style.width = pct(cr.hp1);
    } else {
      ghost.style.width = pct(cr.hp1);
      fill.classList.add('grow'); fill.style.width = pct(cr.hp1);
      const b = r();
      for (let i = 0; i < 10; i++) L.ps.spawn(P.MOTE, b.x + L.R.range(4, b.w - 4), b.y + b.h - 4, L.R.range(-5, 5), L.R.range(-60, -25), L.R.range(0.5, 0.9), PAL.heal[6], 1, i * 0.05);
      await cls(pc, 'heal', 360);
    }
    await wait(300);
  }
  if (cr.fx === 'up') {
    await cls(pc, 'flash', 140); pc.classList.remove('flash');
    const b = r(); L.ps.burst(b.x + b.w / 2, b.y + b.h / 2, 16, [40, 120], P.STAR, [0.4, 0.8], PAL.gold[5]); L.lights.add(b.x + b.w / 2, b.y + b.h / 2, 30, PAL.gold[5], 0.8, 0.5);
    el.querySelector<HTMLElement>('.er-tag')?.removeAttribute('hidden');
  }
  if (cr.fx === 'evolve') {
    await cls(pc, 'pre', 320); pc.classList.remove('pre');
    await cls(pc, 'flash', 140);
    pc.querySelector('img')!.src = cr.toSrc ?? cr.src;
    pc.classList.remove('flash');
    const b = r();
    L.ps.burst(b.x + b.w / 2, b.y + b.h / 2, 24, [60, 170], P.STAR, [0.5, 1], PAL.gold[5]);
    L.lights.add(b.x + b.w / 2, b.y + b.h / 2, 46, PAL.gold[5], 1, 0.7);
    await cls(pc, 'land', 360);
  }
  if (cr.fx === 'die') {
    await cls(pc, 'pre', 300); pc.classList.remove('pre');
    // 베기: 대각선 흰 선이 그어지고 기물이 두 쪽으로 갈라져 잿빛이 된다
    const src = pc.querySelector('img')!.src;
    pc.innerHTML = `<i class="er-cut a" style="background-image:url(${src})"></i><i class="er-cut b" style="background-image:url(${src})"></i><i class="er-slash"></i>`;
    const b = r();
    L.ps.burst(b.x + b.w / 2, b.y + b.h / 2, 16, [60, 160], P.SPARK, [0.2, 0.45], WHITE, 30);
    fill.style.width = '0%';
    await cls(pc, 'split', 520);
    ghost.classList.add('drain'); ghost.style.width = '0%';
    await cls(el, 'gone', 360);
  }
};

/**
 * 사건 연출 (D-260 흐름, 사용자): 선택지를 고르면 사건 창 위에 **오버레이**가 덮이고 연출이 돈다
 * (동전은 저절로, 칸 셋은 하나씩 눌러 · 긁어 연다) → 결과(카드 · 기물 FX) + [확인] → 누르면 디더로 걷히고 대화창으로 돌아간다.
 * wrap = 사건 창(.ev-wrap). 대화창에 장면 그림(컷씬)은 그대로 남는다.
 */
export const runEventFx = async (wrap: HTMLElement, c: EvFxCtx): Promise<void> => {
  wrap.querySelectorAll('.ev-ov').forEach((x) => x.remove());
  const ov = document.createElement('div');
  ov.className = 'ev-ov';
  ov.innerHTML = '<div class="ev-ov-stage"></div><div class="ev-ov-foot"><button type="button" class="btn brass ev-ov-ok" hidden>확인</button></div>';
  wrap.appendChild(ov);
  const host = ov.querySelector<HTMLElement>('.ev-ov-stage')!;
  await wait(260);
  const L = new Layer(host, c.id.length * 97 + (c.good ? 1 : 2));
  if (c.chance?.kind === 'coin') await coinToss(L, c);
  else if (c.chance?.kind === 'slots') await slotsDrop(L, c);
  else if (c.chance?.kind === 'scratch') await scratch(L, c);
  // 결과 줄이 있으면 확률 장치는 걷고 없으면(부품을 고르는 결과 등) 마지막 장을 남긴다
  if (c.chance && (c.cards.length || c.crew.length)) L.x.clearRect(0, 0, L.w, L.h);
  await showResults(L, c);
  const ok = ov.querySelector<HTMLButtonElement>('.ev-ov-ok')!;
  ok.hidden = false;
  ok.classList.add('in');
  await new Promise<void>((r) => ok.addEventListener('click', () => r(), { once: true }));
  sfx('tap');
  ov.classList.add('out');
  await wait(320);
  L.stop();
  ov.remove();
};
