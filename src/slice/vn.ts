/**
 * 비주얼 노벨 연출 층 (D-554): 컷신 재생기(opening.playCuts)의 장면 칸 위에 서 있는 배우 · 장면 입자 · 등잔 깜빡 · 대사 기록.
 * 새 그림 없이(D-386) 기물 도트(public/pieces) · 장면 그림 · 키트 창만 쓴다. 데이터는 data/vn.ts.
 *  - 배우는 그림이 있는 컷에 서지 않는다 (D-580 · D-572 — 일러스트에 판 도트 말을 겹치지 않는다, data/vn.castOn). 그림 위 무대는 입자 · 등잔 · 켄 번스 · 명패만.
 *  - 배우 (그림 없는 컷이 연 때만): 72칸 도트의 정수배(그림 1도트 = 기기 픽셀 정수), 들어옴 · 나감 = 감속 곡선 + 64단 디더, 위치는 기기 픽셀 정수.
 *    말하는 배우는 밝게 + 1도트 뜀, 나머지는 50% 디더 그늘(투명도 아님). 놀 때는 1도트 숨 고르기(일부러 정지 동작).
 *  - 입자: 장면 도트(3 기기 픽셀) 낮은 해상도 캔버스 — 컷이 서 있는 동안만 프레임마다, 켄 번스보다 1.6배 흘러 원근이 생긴다.
 * 게임 상태는 건드리지 않는다 (UI 원칙 9). 움직임 줄이기면 배우는 바로 서고 입자 · 깜빡은 없다.
 */
import { calmMotion } from '../prefs/motion';
import { ditherTo, ease, snapDev, tween } from '../view/motion';
import { btnRowHtml } from './uikit';
import { VN_ACTOR, VN_AIR, VN_DEFAULT, VN_SCENE, VN_TEXT, type CastSprite, type VnAir, type VnScene } from '../data/vn';

const dpr = (): number => window.devicePixelRatio || 1;

interface Actor { key: string; el: HTMLElement; shade: HTMLImageElement; side: 'l' | 'r'; born: number; lit: boolean; foe: boolean; x: number }
/** 화자 명패 상자 (장면 칸 기준 CSS px) — 배우가 비켜 설 자리 */
export interface PlateBox { x: number; r: number; y: number; b: number }
interface Mote { x: number; y: number; vx: number; vy: number; life: number; max: number; col: number; big: boolean }

const AIR_COLORS: Record<VnAir, string[]> = {
  steam: ['#d6d3dc', '#8a8794', '#56545e'],
  sparks: ['#fff3b0', '#facc15', '#f59e0b'],
  dust: ['#8a8794', '#6b6876', '#c8b89a'],
  ash: ['#56545e', '#8a8794', '#3a3843'],
  embers: ['#ff8a2a', '#e5262f', '#facc15'],
  none: [],
};
const abgr = (hex: string): number => {
  const v = parseInt(hex.replace('#', ''), 16);
  return ((0xff << 24) | ((v & 0xff) << 16) | (v & 0xff00) | ((v >> 16) & 0xff)) >>> 0;
};

/**
 * 배우 몸 가운데 자리 (CSS px, 칸 기준)를 정한다 — 순수 계산 (tests/vn-layout.test.ts).
 * ideal = 편마다 바라는 가운데(우리 편 0.38 · 적 0.62에서 바깥으로 step씩), [lo, hi] = 명패를 비킨 몸 가운데의 허용 범위, d = 몸끼리 띄울 거리.
 * 바라는 자리에서 가장 덜 움직이게 왼쪽부터 밀고 오른쪽부터 당긴다. 범위가 좁으면 몸 사이를 줄여서라도(서로는 조금 겹쳐도) 명패와는 겹치지 않는다.
 */
export const fitSlots = (ideal: number[], lo: number, hi: number, d: number): number[] => {
  const n = ideal.length;
  if (!n) return [];
  if (hi < lo) return ideal.map(() => (lo + hi) / 2);
  const gap = n > 1 ? Math.min(d, (hi - lo) / (n - 1)) : d;
  const order = ideal.map((_v, i) => i).sort((a, b) => ideal[a] - ideal[b] || a - b);
  const x = order.map((i) => ideal[i]);
  for (let i = 0; i < n; i++) x[i] = Math.max(x[i], lo, i ? x[i - 1] + gap : -Infinity);
  for (let i = n - 1; i >= 0; i--) x[i] = Math.min(x[i], hi, i < n - 1 ? x[i + 1] - gap : Infinity);
  const out = new Array<number>(n);
  order.forEach((i, k) => (out[i] = x[k]));
  return out;
};

/** 장면 칸 하나의 비주얼 노벨 무대 */
export class VnStage {
  private layer: HTMLElement;
  private cv: HTMLCanvasElement;
  private g: CanvasRenderingContext2D;
  private lamp: HTMLElement;
  private actors: Actor[] = [];
  private motes: Mote[] = [];
  private air: VnAir = 'none';
  private scene: VnScene = VN_DEFAULT;
  private raf = 0;
  private lampT = 0;
  private img: ImageData | null = null;
  private cols = 0;
  private rows = 0;
  private pan0: { x: number; y: number } | null = null;
  private last = 0;
  /** 대사 기록 (백로그) */
  readonly log: { who?: string; k: string; t: string }[] = [];
  private born = 0;
  /**
   * plates = 이 컷에 나올 수 있는 화자 명패 상자들(칸 기준) — 배우는 그 가로 자리를 비켜 선다 (명패는 띠 위 칸 아래쪽에 겹쳐 선다).
   */
  constructor(private view: HTMLElement, private stageImg: () => HTMLImageElement | null, private plates: () => PlateBox[] = () => []) {
    view.insertAdjacentHTML('beforeend', '<div class="vn-air" aria-hidden="true"><canvas></canvas></div><div class="vn-cast" aria-hidden="true"></div><i class="vn-lamp" aria-hidden="true"></i>');
    this.layer = view.querySelector<HTMLElement>('.vn-cast')!;
    this.cv = view.querySelector<HTMLCanvasElement>('.vn-air canvas')!;
    this.g = this.cv.getContext('2d')!;
    this.lamp = view.querySelector<HTMLElement>('.vn-lamp')!;
  }
  /** 컷이 바뀔 때 (막이 닫힌 뒤): 배우를 걷고 그 컷의 분위기를 건다 */
  enter(slug: string | undefined, o: { noCast?: boolean } = {}): VnScene {
    this.clearCast();
    // 배우는 기본으로 없다 (VN_DEFAULT.noCast · D-580) — 부르는 쪽이 noCast: false를 넘길 때만(그림 없는 컷 · castOn)
    this.scene = { ...VN_DEFAULT, ...(slug ? VN_SCENE[slug] : {}), noCast: o.noCast ?? true };
    this.air = this.scene.air ?? 'none';
    this.motes = [];
    this.pan0 = null;
    this.lampT = performance.now() + this.lampGap();
    this.size();
    // 처음 입자는 화면에 고루 뿌려 둔다 (빈 하늘에서 하나씩 생기지 않게)
    for (let i = 0; i < VN_AIR.count[this.air]; i++) this.spawn(true);
    this.start();
    return this.scene;
  }
  private lampGap(): number { const [a, b] = VN_AIR.lampEvery; return a + Math.random() * (b - a); }
  private size(): void {
    const d = VN_AIR.dot;
    const cols = Math.max(1, Math.ceil((this.view.clientWidth * dpr()) / d));
    const rows = Math.max(1, Math.ceil((this.view.clientHeight * dpr()) / d));
    if (cols !== this.cols || rows !== this.rows) {
      this.cols = cols;
      this.rows = rows;
      this.cv.width = cols;
      this.cv.height = rows;
      this.img = this.g.createImageData(cols, rows);
    }
    this.cv.style.width = `${(cols * d) / dpr()}px`;
    this.cv.style.height = `${(rows * d) / dpr()}px`;
  }
  private spawn(anywhere = false): void {
    const a = this.air;
    const cols = AIR_COLORS[a];
    if (!cols.length) return;
    const R = Math.random;
    const W = this.cols, H = this.rows;
    // 종류마다 나는 자리 · 흐름 (도트/초)
    const m: Mote = { x: R() * W, y: anywhere ? R() * H : H + 2, vx: (R() - 0.5) * 4, vy: -(4 + R() * 6), life: 0, max: 3 + R() * 4, col: abgr(cols[Math.floor(R() * cols.length)]), big: R() < 0.2 };
    if (a === 'steam') { m.vy = -(3 + R() * 4); m.vx = 2 + R() * 3; m.big = R() < 0.5; }
    if (a === 'sparks') { m.y = anywhere ? R() * H : H * (0.4 + R() * 0.6); m.vy = -(14 + R() * 18); m.vx = (R() - 0.5) * 18; m.max = 0.6 + R() * 0.8; }
    if (a === 'embers') { m.vy = -(6 + R() * 10); m.vx = (R() - 0.5) * 6; m.max = 2 + R() * 3; }
    if (a === 'ash') { m.y = anywhere ? R() * H : -2; m.vy = 2 + R() * 4; m.vx = 1 + R() * 3; m.max = 6 + R() * 6; }
    if (a === 'dust') { m.vy = (R() - 0.6) * 2; m.vx = (R() - 0.3) * 3; m.max = 4 + R() * 5; }
    if (anywhere) m.life = R() * m.max * 0.8;
    this.motes.push(m);
  }
  private start(): void {
    if (this.raf || calmMotion()) return;
    this.last = performance.now();
    const step = (now: number): void => {
      if (!this.view.isConnected) return void (this.raf = 0);
      this.raf = requestAnimationFrame(step);
      if (document.hidden) return;
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      this.tick(dt, now);
    };
    this.raf = requestAnimationFrame(step);
  }
  /** 입자 한 프레임 + 등잔 깜빡 */
  private tick(dt: number, now: number): void {
    if (this.scene.lamp && now >= this.lampT) {
      this.lampT = now + this.lampGap();
      // 일부러 정지 동작: 두 프레임 어두워짐 → 밝아짐 → 한 번 더 (D-554 hold 예외)
      const L = this.lamp, ms = VN_AIR.lampMs;
      L.classList.add('on');
      window.setTimeout(() => L.classList.remove('on'), ms);
      window.setTimeout(() => L.classList.add('on'), ms * 2);
      window.setTimeout(() => L.classList.remove('on'), ms * 3);
    }
    if (!this.img || this.air === 'none') return;
    const want = VN_AIR.count[this.air];
    this.motes = this.motes.filter((m) => (m.life += dt) < m.max && m.y > -4 && m.y < this.rows + 4);
    while (this.motes.length < want) this.spawn();
    for (const m of this.motes) { m.x += m.vx * dt; m.y += m.vy * dt; if (this.air === 'sparks') m.vy += 30 * dt; }
    // 원근: 장면 그림의 켄 번스 이동 × 1.6만큼 입자 층을 민다 (정수 칸)
    const im = this.stageImg();
    let ox = 0, oy = 0;
    if (im) {
      const p = { x: parseFloat(im.style.left) || 0, y: parseFloat(im.style.top) || 0 };
      if (!this.pan0) this.pan0 = p;
      ox = Math.round(((p.x - this.pan0.x) * dpr() * (VN_AIR.parallax - 1)) / VN_AIR.dot);
      oy = Math.round(((p.y - this.pan0.y) * dpr() * (VN_AIR.parallax - 1)) / VN_AIR.dot);
    }
    const buf = new Uint32Array(this.img.data.buffer);
    buf.fill(0);
    const W = this.cols, H = this.rows;
    for (const m of this.motes) {
      // 수명 끝 30%는 칸을 띄엄띄엄 (디더로 사라짐 — 투명도 아님)
      const fade = m.life / m.max;
      if (fade > 0.7 && ((Math.floor(m.x) + Math.floor(m.y)) & 1) && fade > 0.85) continue;
      const x = ((Math.floor(m.x) + ox) % W + W) % W, y = Math.floor(m.y) + oy;
      if (y < 0 || y >= H) continue;
      buf[y * W + x] = m.col;
      if (m.big && x + 1 < W) buf[y * W + x + 1] = m.col;
      if (m.big && y + 1 < H) buf[(y + 1) * W + x] = m.col;
    }
    this.g.putImageData(this.img, 0, 0);
  }

  // ---------- 배우 ----------
  /** 배우 크기 (CSS px): 장면 칸 높이 × VN_ACTOR.height 안의 가장 큰 72칸 정수배 */
  private actorPx(): number {
    const k = Math.max(1, Math.floor((this.view.clientHeight * VN_ACTOR.height * dpr()) / 72));
    return (72 * k) / dpr();
  }
  /** 자리 (CSS px, 칸 왼쪽 기준 배우 왼쪽) */
  /** 배우 위 끝 (CSS px, 칸 기준): 발을 칸 바닥에 — 칸 높이가 반 픽셀이어도 배우는 기기 픽셀 정수 자리 */
  private footY(w: number): number {
    const r = dpr(), v = this.view.getBoundingClientRect();
    return (Math.floor((v.top + v.height) * r) - Math.round(w * r)) / r - v.top;
  }
  /**
   * 서 있는 배우 모두의 자리를 다시 잡는다: 편마다 먼저 온 배우가 안쪽, 나중 온 배우가 바깥쪽.
   * 화자 명패(띠 위 왼쪽 · 오른쪽 가장자리)와 몸이 겹치지 않게 그 사이 빈 폭 안으로 모은다 — 셋이 서도 바깥 배우가 명패 뒤에 숨지 않게.
   * 움직이는 배우는 감속 + 출렁(정수 기기 픽셀), 새 배우는 x만 정하고 들어옴 연출이 맡는다.
   */
  private layout(fresh?: Actor): void {
    const W = this.view.clientWidth, w = this.actorPx(), k = w / 72;
    const [b0, b1] = VN_ACTOR.body;
    const bw = (b1 - b0) * k, gap = VN_ACTOR.gap * k;
    // 명패 자리: 배우 키 높이 안으로 내려온 명패만 (띠가 위에 붙는 컷은 명패도 위라 비킬 것이 없다)
    const top = this.view.clientHeight - w;
    let lo = 0, hi = W;
    for (const p of this.plates()) {
      if (p.b <= top || p.r <= p.x) continue;
      if ((p.x + p.r) / 2 < W / 2) lo = Math.max(lo, p.r + gap);
      else hi = Math.min(hi, p.x - gap);
    }
    const rank = (a: Actor): number => this.actors.filter((x) => x.side === a.side && x.born < a.born).length;
    const ideal = this.actors.map((a) => W * (a.side === 'l' ? VN_ACTOR.center - rank(a) * VN_ACTOR.step : 1 - VN_ACTOR.center + rank(a) * VN_ACTOR.step));
    const cx = fitSlots(ideal, lo + bw / 2, hi - bw / 2, bw + gap);
    this.actors.forEach((a, i) => {
      // 몸 가운데 → 상자 왼쪽 (뒤집힌 배우는 몸도 거울)
      const mid = ((a.side === 'r' ? 72 - (b0 + b1) / 2 : (b0 + b1) / 2)) * k;
      const x = snapDev(cx[i] - mid);
      const from = a.x;
      a.x = x;
      if (a === fresh || from === x || Number.isNaN(from) || calmMotion()) return void (a.el.style.left = `${x}px`);
      void tween(VN_ACTOR.enter, (e) => (a.el.style.left = `${snapDev(from + (x - from) * e)}px`), (t) => ease.outBack(t, 1.2));
    });
  }
  /**
   * 말하는 배우를 세운다 · 밝힌다. sprite가 없으면(명패만인 화자) 모두 그늘로. side = 명패 편(우리 편 왼쪽 · 적 오른쪽).
   * 무대가 차면 가장 오래 말하지 않은 배우가 나간다.
   */
  speak(key: string | null, sprite: CastSprite | undefined, side: 'l' | 'r'): void {
    if (this.scene.noCast) return;
    let a = key ? this.actors.find((x) => x.key === key) : undefined;
    if (!a && key && sprite) a = this.add(key, sprite, side);
    for (const x of this.actors) this.light(x, x === a);
    if (a) {
      // 맨 뒤로 (가장 최근에 말함)
      this.actors = [...this.actors.filter((x) => x !== a), a];
      if (!calmMotion()) {
        const el = a.el.querySelector<HTMLElement>('.vn-body')!;
        const d = Math.max(1, Math.round(dpr() * 2)) / dpr();
        void tween(260, (_e, t) => (el.style.transform = `translate3d(0,${-snapDev(Math.sin(Math.PI * t) * d * 2)}px,0)`), (t) => t).then(() => (el.style.transform = ''));
      }
    }
  }
  /** 서술 · 독백: 모두 그늘 (독백의 주인이 서 있으면 그 배우만 밝게) */
  hush(key?: string): void {
    for (const x of this.actors) this.light(x, !!key && x.key === key);
  }
  private light(a: Actor, on: boolean): void {
    if (a.lit === on) return;
    a.lit = on;
    const dim = VN_ACTOR.dim / 64;
    void ditherTo(a.shade, on ? dim : 0, on ? 0 : dim, VN_ACTOR.dimMs, ease.out);
  }
  private add(key: string, sp: CastSprite, side: 'l' | 'r'): Actor {
    // 무대가 차면 오래된 배우부터 나간다
    while (this.actors.length >= VN_ACTOR.max) this.exit(this.actors[0], false);
    // 우리 편끼리 마주 볼 때(상자 안 다툼처럼): 왼쪽이 더 붐비면 빈 오른쪽에 세워 마주 보게 한다 (적은 늘 오른쪽)
    const count = (s: 'l' | 'r') => this.actors.filter((x) => x.side === s).length;
    if (side === 'l' && count('l') > count('r') && !this.actors.some((x) => x.foe)) side = 'r';
    const w = this.actorPx();
    const src = `pieces/l-${sp.t}${sp.side}.png`;
    const el = document.createElement('div');
    el.className = `vn-actor vn-${side}${side === 'r' ? ' flip' : ''}`;
    el.style.width = el.style.height = `${w}px`;
    el.innerHTML = `<div class="vn-body"><img src="${src}" alt=""><img class="vn-shade" src="${src}" alt=""></div>`;
    el.style.top = `${this.footY(w)}px`;
    this.layer.appendChild(el);
    const shade = el.querySelector<HTMLImageElement>('.vn-shade')!;
    void ditherTo(shade, 0, 0, 0);
    const a: Actor = { key, el, shade, side, born: this.born++, lit: false, foe: sp.side === 1, x: NaN };
    this.actors.push(a);
    this.layout(a);
    // 들어옴: 바깥쪽에서 감속 + 넘침(출렁) · 64단 디더로 나타남 — 위치는 기기 픽셀 정수
    const dir = side === 'l' ? -1 : 1;
    if (!calmMotion()) {
      el.style.transform = `translate3d(${dir * VN_ACTOR.slide}px,0,0)`;
      void ditherTo(el, 0, 1, VN_ACTOR.enter * 0.7, ease.out);
      void tween(VN_ACTOR.enter, (e) => (el.style.transform = `translate3d(${snapDev(dir * VN_ACTOR.slide * (1 - e))}px,0,0)`), (t) => ease.outBack(t, 1.2));
    }
    return a;
  }
  private exit(a: Actor, relayout = true): void {
    this.actors = this.actors.filter((x) => x !== a);
    if (relayout) this.layout();
    if (calmMotion()) return void a.el.remove();
    const dir = a.side === 'l' ? -1 : 1;
    void tween(VN_ACTOR.exit, (e) => (a.el.style.transform = `translate3d(${snapDev(dir * VN_ACTOR.slide * e)}px,0,0)`), ease.in);
    void ditherTo(a.el, 1, 0, VN_ACTOR.exit, ease.in).then(() => a.el.remove());
  }
  /** 배우를 모두 걷는다 (막이 닫힌 뒤라 바로) */
  clearCast(): void {
    this.actors.forEach((a) => a.el.remove());
    this.actors = [];
  }
  /** 배우를 모두 내보낸다 (컷이 끝날 때 — 보이는 퇴장) */
  exitAll(): void { [...this.actors].forEach((a) => this.exit(a, false)); }
  /** 창 크기가 바뀌면 */
  refit(): void {
    this.size();
    const w = this.actorPx();
    for (const a of this.actors) {
      a.el.style.width = a.el.style.height = `${w}px`;
      a.el.style.top = `${this.footY(w)}px`;
      a.x = NaN;
    }
    this.layout();
  }
  destroy(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.clearCast();
  }
}

/** 대사 기록 창 (글은 자막 띠와 같은 표기 — 따옴표는 cutFill이 이미 단다) (백로그 — game-ui-design 4.3 정보: M 592, 단추 하나, 뒤 막을 누르면 닫힘, 스크롤 없이 마지막 VN_TEXT.logLines 줄) */
export const logHtml = (log: VnStage['log']): string => {
  const rows = log.slice(-VN_TEXT.logLines).map((l) => `<p class="vl-row vl-${l.k}">${l.who ? `<b>${l.who}</b>` : ''}<span>${l.t}</span></p>`).join('');
  return `<div class="vn-log kit-sheet" role="dialog" aria-label="${VN_TEXT.logTitle}"><div class="win win-m"><div class="plate">${VN_TEXT.logTitle}</div><div class="inset vl-list">${rows}</div>${btnRowHtml({ back: { label: VN_TEXT.close, attrs: "data-x" } })}</div></div>`;
};
