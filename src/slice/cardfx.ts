/**
 * 카드 사용 연출 (D-553, 사용자: 「점화 등 스킬 사용 시 흰 배경이 생겼다 사라짐 — 액티브 카드 효과 전체 개선」).
 *
 * 화면 전체를 덮는 투명 캔버스 하나(기기 px 1:1)에 도트를 찍는다. 연출이 없으면 숨기고 그리기를 멈춘다(유휴 비용 0, D-533).
 * 도트 하나 = 판 칸의 1/20(판 그림과 같은 도트), 위치는 기기 정수 px로 — 60fps로 한 px씩 움직여 매끈하되 도트는 깨지지 않는다.
 * 투명도 보간 · 그라데이션 없이: 나타남은 계단, 사라짐은 4×4 베이어 디더 네 계단 (D-216 · D-538). 화면 전체 번쩍임 없음.
 * 재질은 D-259 다섯 가지 — 철(죔쇠) · 황동(리벳 · 톱니 · 깃대) · 쇳물(불씨) · 종이(카드 뒷면) · 녹(먼지).
 *
 * 계열: 카드 표 비행(손패 → 대상) · 죔쇠(방열판) · 기름 방울 + 톱니(수리) · 불씨(연쇄) · 태엽 용수철(태엽) · 덱 → 손패 카드 ·
 * 지휘 깃발(킹 → 그 기물) · 쇳물 덩이(쇳물 서약) · 깨짐(제물). 게임 상태는 읽지도 바꾸지도 않는다 — 화면 좌표만 받는다.
 */
import { calmMotion } from '../prefs/motion';
import { CARD_FX } from '../data/fx';

/** 화면(CSS px) 위 점 */
export interface Pt { x: number; y: number }

type Ctx = CanvasRenderingContext2D;
interface Fx { t0: number; dur: number; draw: (g: Ctx, t: number) => void; done?: () => void; name?: string }
/** QA 박자 기록 (D-538과 같은 길): 창에 `__fxlog` 배열이 있을 때만 [이름, ms] */
const trace = (k: string, ms: number): void => void (window as { __fxlog?: unknown[] }).__fxlog?.push([k, Math.round(ms), '']);

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
/** 디더 남김: 보이는 정도 v(0~1)에서 이 도트가 남나 */
const keep = (ix: number, iy: number, v: number): boolean => v >= 1 || BAYER[((iy & 3) << 2) | (ix & 3)] < v * 16;
/** 퇴장 계단: 0~1 → 1 · 0.75 · 0.5 · 0.25 (네 계단) */
const stepOut = (k: number): number => (k <= 0 ? 1 : k >= 1 ? 0 : 1 - (Math.floor(k * 4) + 1) / 4);
/** 느리게 → 빠르게 (예비 · 날아듦) */
const accel = (k: number): number => k * k * k;
/** 빠르게 → 느리게 (터짐 뒤 가라앉음) */
const decel = (k: number): number => 1 - (1 - k) ** 3;
/** 비행 곡선: 처음 절반은 가속, 나머지는 감속 (도착이 느려지며 내려앉는다) */
const glide = (k: number): number => (k < 0.5 ? 2 * k * k : 1 - 2 * (1 - k) ** 2);

/** 재질 팔레트 (D-259) */
const COL: Record<string, string> = {
  k: '#0b0b0e', // 먹 바깥선
  h: '#b8bcc6', // 철 빛
  m: '#6b6f7a', // 철 몸
  d: '#3c3f48', // 철 그늘
  B: '#f4d27a', // 황동 빛
  b: '#c89b3c', // 황동 몸
  e: '#7a5a1c', // 황동 그늘
  o: '#c8841c', // 기름
  O: '#ffe08a', // 기름 빛
  r: '#c42430', // 진홍 천
  R: '#ff6b6b', // 진홍 빛
  y: '#ffd64a', // 쇳물 빛
  f: '#ff9f40', // 쇳물
  F: '#e0622a', // 쇳물 그늘
  p: '#e8dcc0', // 종이
  P: '#b9a888', // 종이 그늘
  g: '#86efac', // 회복 숫자
  s: '#e2e8f0', // 방열판 숫자
  u: '#8a4a2a', // 녹
};

/** 도트 그림 (글자 = COL 열쇠, 빈칸 = 없음) */
type Spr = string[];
const CLAMP: Spr = ['kkkkkkk', 'khhhhhk', 'khmmmdk', 'khmkkkk', 'khmk', 'khdk', 'kkkk'];
const RIVET: Spr = [' kk ', 'kBbk', 'kbek', ' kk '];
const DROP: Spr = [' kk ', 'kOOk', 'kOok', 'kook', 'kook', ' kk '];
const BACK: Spr = ['kkkkkkkk', 'kbbbbbbk', 'kbppppbk', 'kbpPPpbk', 'kbpbbpbk', 'kbpPPpbk', 'kbppppbk', 'kbpPPpbk', 'kbppppbk', 'kbbbbbbk', 'kkkkkkkk'];
const FLAG: Spr = ['kk', 'kBkkkk', 'kbrRRrkk', 'kbrRrrrrk', 'kbrrrrkk', 'kbkkkk', 'kbk', 'kbk', 'kbk', 'kbk', 'kek', 'kkk'];
const FLAG2: Spr = ['kk', 'kBkkk', 'kbRRrkkk', 'kbrRrrrrk', 'kbrrrkkk', 'kbkkk', 'kbk', 'kbk', 'kbk', 'kbk', 'kek', 'kkk'];
const BLOB: Spr = [' kkk ', 'kyffk', 'kyfFk', 'kffFk', ' kkk '];
/** 3×5 숫자 · 기호 (갈무리와 같은 각진 도트) */
const GLYPH: Record<string, Spr> = {
  '0': ['###', '# #', '# #', '# #', '###'], '1': [' # ', '## ', ' # ', ' # ', '###'], '2': ['###', '  #', '###', '#  ', '###'], '3': ['###', '  #', ' ##', '  #', '###'],
  '4': ['# #', '# #', '###', '  #', '  #'], '5': ['###', '#  ', '###', '  #', '###'], '6': ['###', '#  ', '###', '# #', '###'], '7': ['###', '  #', '  #', ' # ', ' # '],
  '8': ['###', '# #', '###', '# #', '###'], '9': ['###', '# #', '###', '  #', '###'], '+': ['   ', ' # ', '###', ' # ', '   '], '×': ['   ', '# #', ' # ', '# #', '   '],
};

/** 톱니 두 자세 (22.5° 차이) — 한 칸씩 「딸깍」 돈다 */
const gear = (phase: number): Spr => {
  const n = 11, c = 5, rows: string[] = [];
  const at = (x: number, y: number): string => {
    const dx = x - c, dy = y - c, r = Math.hypot(dx, dy);
    if (r < 1.3) return 'k';
    if (r <= 3.2) return r <= 2.2 && dx + dy < 0 ? 'B' : r > 2.6 && dx + dy > 0 ? 'e' : 'b';
    if (r <= 4.8) {
      const a = ((Math.atan2(dy, dx) * 180) / Math.PI + 360 + phase) % 45;
      return a < 13 || a > 32 ? 'b' : '';
    }
    return '';
  };
  for (let y = 0; y < n; y++) {
    let s = '';
    for (let x = 0; x < n; x++) s += at(x, y) || ' ';
    rows.push(s);
  }
  // 바깥선: 빈 칸 중 칠한 칸 곁
  return rows.map((row, y) => [...row].map((ch, x) => (ch !== ' ' ? ch : [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b2]) => (rows[y + b2]?.[x + a] ?? ' ') !== ' ') ? 'k' : ' ')).join(''));
};
const GEAR = [gear(0), gear(22.5)];

class Layer {
  cv: HTMLCanvasElement | null = null;
  g: Ctx | null = null;
  dpr = 1;
  list: Fx[] = [];
  running = false;
  private ensure(): Ctx | null {
    if (typeof document === 'undefined') return null;
    const dpr = window.devicePixelRatio || 1;
    const w = Math.round(window.innerWidth * dpr), h = Math.round(window.innerHeight * dpr);
    if (!this.cv) {
      this.cv = document.createElement('canvas');
      this.cv.className = 'cardfx';
      this.cv.setAttribute('aria-hidden', 'true');
      document.body.appendChild(this.cv);
      this.g = this.cv.getContext('2d');
    }
    if (this.cv.width !== w || this.cv.height !== h || this.dpr !== dpr) {
      this.dpr = dpr;
      this.cv.width = w;
      this.cv.height = h;
      // 캔버스 1px = 기기 1px (CSS 크기를 기기 px에서 거꾸로 — 소수 배율에서도 도트가 번지지 않는다)
      Object.assign(this.cv.style, { width: `${w / dpr}px`, height: `${h / dpr}px` });
    }
    if (!this.cv.isConnected) document.body.appendChild(this.cv);
    this.cv.hidden = false;
    if (this.g) this.g.imageSmoothingEnabled = false;
    return this.g;
  }
  add(fx: Omit<Fx, 't0'>): void {
    if (!this.ensure()) return void fx.done?.();
    this.list.push({ ...fx, t0: performance.now() });
    // 탭이 숨으면 rAF가 멈춘다 — 기다리는 쪽이 갇히지 않게 시간으로도 끝낸다
    if (fx.done) window.setTimeout(() => { const i = this.list.findIndex((f) => f.done === fx.done); if (i >= 0) { this.list.splice(i, 1); fx.done?.(); } }, fx.dur + 400);
    if (!this.running) {
      this.running = true;
      requestAnimationFrame((n) => this.tick(n));
    }
  }
  private tick(now: number): void {
    const g = this.g, cv = this.cv;
    if (!g || !cv) return void (this.running = false);
    g.clearRect(0, 0, cv.width, cv.height);
    const live: Fx[] = [];
    for (const f of this.list) {
      const t = now - f.t0;
      if (t >= f.dur) { if (f.name) trace(`card.${f.name}`, t); f.done?.(); continue; }
      f.draw(g, Math.max(0, t));
      live.push(f);
    }
    this.list = live;
    if (!live.length) {
      this.running = false;
      cv.hidden = true;
      return;
    }
    requestAnimationFrame((n) => this.tick(n));
  }
}
const layer = new Layer();

/** 도트 크기(기기 px): 판 칸의 1/20 — 판 그림과 같은 도트 (최소 2) */
let dotPx = 4;
/** 판 칸 크기(CSS px)를 알려 준다 — 판이 세워지거나 크기가 바뀔 때 */
export const setCell = (cellCss: number): void => {
  dotPx = Math.max(2, Math.round((cellCss * (window.devicePixelRatio || 1)) / 20));
};
const dev = (v: number): number => Math.round(v * layer.dpr);

/** 그림 한 장: (x, y) = 왼쪽 위 기기 px, u = 도트 크기, v = 보이는 정도(디더), flip = 좌우 · 상하 뒤집기 */
const spr = (g: Ctx, s: Spr, x: number, y: number, u: number, v = 1, fx = false, fy = false, tint?: string): void => {
  const h = s.length;
  const sw = fx ? sprW(s) : 0;
  for (let j = 0; j < h; j++) {
    const row = s[fy ? h - 1 - j : j];
    const w = row.length;
    for (let i = 0; i < w; i++) {
      const ch = row[i];
      if (ch === ' ') continue;
      const ix = fx ? sw - 1 - i : i;
      if (!keep(ix, j, v)) continue;
      g.fillStyle = tint && ch !== 'k' ? tint : COL[ch] ?? COL.k;
      g.fillRect(x + ix * u, y + j * u, u, u);
    }
  }
};
const sprW = (s: Spr): number => s.reduce((a, r) => Math.max(a, r.length), 0);

/** 숫자 쪽지: 대상 위에 「+15」 — 계단으로 2도트 떠올라 머물다 디더로 꺼진다 */
const numAt = (g: Ctx, text: string, cx: number, cy: number, t: number, col: string): void => {
  const u = Math.max(2, dotPx);
  const chars = [...text].filter((c) => GLYPH[c]);
  const w = chars.length * 4 - 1;
  const rise = Math.min(2, Math.floor(t / 60));
  const v = t < CARD_FX.num - CARD_FX.out ? 1 : stepOut((t - (CARD_FX.num - CARD_FX.out)) / CARD_FX.out);
  const x0 = dev(cx) - Math.round((w * u) / 2), y0 = dev(cy) - rise * u - 6 * u;
  chars.forEach((c, k) => {
    const gl = GLYPH[c];
    // 바깥선 먼저 (1도트 테)
    for (let j = 0; j < 5; j++)
      for (let i = 0; i < 3; i++)
        if (gl[j][i] === '#')
          for (const [a, b2] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1]]) if (keep(i + a, j + b2, v)) { g.fillStyle = COL.k; g.fillRect(x0 + (k * 4 + i + a) * u, y0 + (j + b2) * u, u, u); }
    for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) if (gl[j][i] === '#' && keep(i, j, v)) { g.fillStyle = col; g.fillRect(x0 + (k * 4 + i) * u, y0 + j * u, u, u); }
  });
};
/** 숫자만 띄운다 (태엽 · 연쇄 · 카드 장수처럼 판 밖 대상) */
export const number = (at: Pt, text: string, col: 'gold' | 'heal' | 'plate' | 'ember' = 'gold'): void => {
  const c = { gold: COL.B, heal: COL.g, plate: COL.s, ember: COL.f }[col];
  layer.add({ dur: calmMotion() ? 500 : CARD_FX.num, draw: (g, t) => numAt(g, text, at.x, at.y, calmMotion() ? 120 : t, c) });
};

// ---------- 카드 표 비행 ----------
const icons = new Map<string, HTMLImageElement>();
const iconOf = (src: string | null): HTMLImageElement | null => {
  if (!src) return null;
  let im = icons.get(src);
  if (!im) {
    im = new Image();
    im.src = src;
    icons.set(src, im);
  }
  return im.complete && im.naturalWidth ? im : null;
};
/** 그림 주소를 미리 받아 둔다 (첫 비행에서 빈 패가 되지 않게) */
export const preloadIcon = (src: string): void => void iconOf(src);

/**
 * 카드 표 비행: 손패 자리(from)에서 아이콘 패가 한 도트 움츠렸다(예비) 2도트 튀고 → 호를 그리며 대상(to)으로 가속해 날아든다.
 * 지난 자리에 황동 불똥 꼬리, 도착하면 디더로 꺼진다. 도착 순간에 풀리는 약속을 준다 (움직임 줄이기면 곧바로).
 */
export const fly = (from: Pt, to: Pt, iconSrc: string | null, trail: 'brass' | 'ember' = 'brass'): Promise<void> => {
  if (calmMotion()) return Promise.resolve();
  return new Promise((done) => {
    const { lead, fly: ms } = CARD_FX;
    const u = dotPx;
    const S = 16;
    const dist = Math.hypot(to.x - from.x, to.y - from.y);
    const arc = Math.min(dist * 0.22, 60);
    const past: { x: number; y: number }[] = [];
    let arrived = false;
    const tc = trail === 'ember' ? [COL.y, COL.f, COL.F] : [COL.B, COL.b, COL.e];
    layer.add({
      name: 'fly',
      dur: lead + ms + CARD_FX.out,
      draw: (g, t) => {
        let x = from.x, y = from.y, v = 1;
        if (t < lead) {
          // 예비: 1도트 움츠림 → 2도트 튐 (계단)
          y += (t < lead / 2 ? 1 : -2) * (u / layer.dpr);
        } else if (t < lead + ms) {
          const k = (t - lead) / ms;
          const e = glide(k);
          x = from.x + (to.x - from.x) * e;
          y = from.y + (to.y - from.y) * e - arc * 4 * e * (1 - e) - 2 * (u / layer.dpr) * (1 - e);
          past.push({ x, y });
        } else {
          x = to.x; y = to.y;
          v = stepOut((t - lead - ms) / CARD_FX.out);
          if (!arrived) { arrived = true; done(); }
        }
        // 꼬리: 지난 자리 다섯 곳에 2×2 도트 — 오래될수록 디더로 성기게
        const tail = past.slice(-6, -1);
        tail.forEach((p, i) => {
          const age = (tail.length - i) / (tail.length + 1);
          const px = dev(p.x), py = dev(p.y);
          for (let a = 0; a < 2; a++) for (let b2 = 0; b2 < 2; b2++) if (keep(a + i, b2, 1 - age)) { g.fillStyle = tc[Math.min(2, Math.floor(age * 3))]; g.fillRect(px + (a - 1) * u, py + (b2 - 1) * u, u, u); }
        });
        // 패: 아이콘(16도트) — 없으면 카드 뒷면
        const im = iconOf(iconSrc);
        const x0 = dev(x) - (S * u) / 2, y0 = dev(y) - (S * u) / 2;
        if (im && v >= 1) g.drawImage(im, x0, y0, S * u, S * u);
        else if (im) {
          // 디더 퇴장: 4×4 체크 칸을 걷어 낸다(그림을 도트 단위로 덮어 지움)
          g.drawImage(im, x0, y0, S * u, S * u);
          for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) if (!keep(i, j, v)) g.clearRect(x0 + i * u, y0 + j * u, u, u);
        } else spr(g, BACK, dev(x) - 4 * u, dev(y) - 5 * u, u, v);
      },
      done: () => { if (!arrived) done(); },
    });
  });
};

// ---------- 대상 계열 ----------
/** 칸 정보: 가운데(CSS px)와 한 변(CSS px) */
export interface Cell { c: Pt; size: number }

/**
 * 방열판: 철 죔쇠 넷이 칸 바깥에서 한 도트 물러섰다가(예비) 모서리로 쾅 박히고(1도트 넘침 → 제자리) 황동 리벳이 도장처럼 찍힌다.
 * 칸 모서리만 덮어 기물은 가리지 않는다. 숫자는 판(floatText)이 띄운다.
 */
export const plate = (cell: Cell, delay = 0): void => {
  const u = dotPx, calm = calmMotion();
  const { clamp: inMs, rivet, hold, out } = CARD_FX;
  const W = sprW(CLAMP);
  layer.add({
    name: 'plate',
    dur: delay + (calm ? 420 : hold + out),
    draw: (g, t0) => {
      const t = t0 - delay;
      if (t < 0) return;
      // 바깥으로 물러난 도트 수: 예비 5→6, 박힘 6→-1(가속), 넘침 -1→0
      const off = calm ? 0 : t < 60 ? 5 + Math.floor(t / 30) : t < inMs ? Math.round(6 - 7 * accel((t - 60) / (inMs - 60))) : t < inMs + 40 ? -1 : 0;
      const v = calm ? 1 : t < hold ? 1 : stepOut((t - hold) / out);
      const half = 10 * u;
      const cx = dev(cell.c.x), cy = dev(cell.c.y);
      const d = off * u;
      spr(g, CLAMP, cx - half - d, cy - half - d, u, v);
      spr(g, CLAMP, cx + half + d - W * u, cy - half - d, u, v, true);
      spr(g, CLAMP, cx - half - d, cy + half + d - W * u, u, v, false, true);
      spr(g, CLAMP, cx + half + d - W * u, cy + half + d - W * u, u, v, true, true);
      if (calm || t >= rivet) {
        const pts = [[cx - half + 2 * u, cy - half + 2 * u], [cx + half - 6 * u, cy - half + 2 * u], [cx - half + 2 * u, cy + half - 6 * u], [cx + half - 6 * u, cy + half - 6 * u]];
        // 리벳 도장: 한 프레임 크게(3도트 테) → 제 크기
        const ring = !calm && t < rivet + 50;
        for (const [x, y] of pts) {
          spr(g, RIVET, x, y, u, v);
          if (ring) {
            g.fillStyle = COL.B;
            g.fillRect(x - u, y - u, 6 * u, u); g.fillRect(x - u, y + 4 * u, 6 * u, u); g.fillRect(x - u, y, u, 4 * u); g.fillRect(x + 4 * u, y, u, 4 * u);
          }
        }
      }
    },
  });
};

/**
 * 수리: 머리 위에서 기름 방울 셋이 차례로 떨어져(가속) 기물 어깨에 닿으면 1도트 튀고, 칸 오른쪽 위 황동 톱니가 한 칸씩 딸깍 돈다.
 */
export const oil = (cell: Cell, delay = 0): void => {
  const u = dotPx, calm = calmMotion();
  const { drop, gap, tick, hold, out } = CARD_FX;
  const n = 3;
  const end = drop + gap * (n - 1);
  layer.add({
    name: 'oil',
    dur: delay + (calm ? 420 : Math.max(hold, end + tick * 3) + out),
    draw: (g, t0) => {
      const t = t0 - delay;
      if (t < 0) return;
      const fin = Math.max(hold, end + tick * 3);
      const v = calm ? 1 : t < fin ? 1 : stepOut((t - fin) / out);
      const cx = dev(cell.c.x), cy = dev(cell.c.y);
      const top = cy - 16 * u, land = cy - 13 * u + 4 * u;
      if (!calm)
        for (let i = 0; i < n; i++) {
          const k = (t - i * gap) / drop;
          if (k < 0) continue;
          const x = cx - 2 * u + (i - 1) * 3 * u;
          if (k < 1) spr(g, DROP, x, Math.round(top + (land - top) * accel(k)), u);
          else if (k < 1.6) {
            // 튐: 양옆 1도트씩
            g.fillStyle = COL.o;
            g.fillRect(x - u, land + 5 * u, u, u); g.fillRect(x + 4 * u, land + 5 * u, u, u);
          }
        }
      // 톱니: 오른쪽 위 모서리, 방울이 닿을 때마다 22.5°
      const ticks = calm ? 0 : Math.min(3, Math.max(0, Math.floor((t - drop) / tick) + 1));
      // 칸 오른쪽 위 모서리에 반쯤 걸쳐 — 기물 머리를 덮지 않는다
      spr(g, GEAR[ticks % 2], cx + 10 * u - 6 * u, cy - 10 * u - 5 * u, u, v);
    },
  });
};

/**
 * 칼날 세례 (넓은 범위): 맞을 칸마다 쇳조각 셋이 위에서 떨어져(가속) 기물 어깨에 박히고 불똥 두 점 — 칸마다 차례로(stagger).
 * landAt = 첫 칸에 닿는 때(ms, 판의 착지에 맞춘다).
 */
export const shards = (cells: Cell[], landAt: number, stagger = 60): void => {
  if (calmMotion() || !cells.length) return;
  const u = dotPx;
  const fall = 180;
  const SHARD: Spr = [' k ', 'kbk', 'khk', 'khk', 'kmk', 'kmk', 'kdk', ' k '];
  cells.forEach((cell, n) => {
    const hit = landAt + n * stagger;
    layer.add({
      name: n ? undefined : 'shards',
      dur: hit + 200,
      draw: (g, t) => {
        const cx = dev(cell.c.x), cy = dev(cell.c.y);
        for (let i = 0; i < 3; i++) {
          const k = (t - (hit - fall) - i * 30) / fall;
          if (k < 0) continue;
          const x = cx - u + (i - 1) * 5 * u;
          const land = cy - 7 * u + (i === 1 ? -2 * u : 0);
          if (k < 1) spr(g, SHARD, x, Math.round(land - 18 * u * (1 - accel(k))) - 7 * u, u);
          else {
            const s = (k - 1) * fall;
            const v = s < 80 ? 1 : stepOut((s - 80) / 100);
            spr(g, SHARD.slice(0, 5), x, land - 5 * u, u, v);
            if (s < 60) { g.fillStyle = COL.y; g.fillRect(x - 2 * u, land - u, u, u); g.fillRect(x + 4 * u, land - 2 * u, u, u); g.fillRect(x + u, land + u, u, u); }
          }
        }
      },
    });
  });
};

/** 불씨 터짐: 대상 둘레로 쇳물 도트 여덟이 튀어 나가며 식는다 (연쇄 · 제물 · 쇳물) */
export const embers = (at: Pt, hot: 'ember' | 'blood' = 'ember', delay = 0): void => {
  if (calmMotion()) return;
  const u = dotPx;
  const pal = hot === 'blood' ? [COL.R, COL.r, COL.u] : [COL.y, COL.f, COL.F];
  layer.add({
    dur: delay + 320,
    draw: (g, t0) => {
      const t = t0 - delay;
      if (t < 0) return;
      const k = t / 320;
      const r = Math.round(2 + 7 * decel(k));
      const cx = dev(at.x), cy = dev(at.y);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + 0.2;
        const x = cx + Math.round(Math.cos(a) * r) * u, y = cy + Math.round(Math.sin(a) * r + k * k * 3) * u;
        if (!keep(i, i >> 1, 1 - k)) continue;
        g.fillStyle = pal[Math.min(2, Math.floor(k * 3))];
        g.fillRect(x, y, u, u);
        if (k < 0.4) g.fillRect(x - Math.round(Math.cos(a)) * u, y - Math.round(Math.sin(a)) * u, u, u);
      }
      // 가운데 불씨 1프레임 → 2×2 → 사라짐
      if (k < 0.25) { g.fillStyle = pal[0]; g.fillRect(cx - u, cy - u, 2 * u, 2 * u); }
    },
  });
};

/** 태엽 용수철: 계기 위에서 황동 용수철이 눌렸다(예비) 튀어 늘어나고 출렁이며 제 길이로 */
export const spring = (at: Pt): void => {
  if (calmMotion()) return;
  const u = dotPx;
  const dur = 460;
  layer.add({
    dur,
    draw: (g, t) => {
      const k = t / dur;
      // 길이(도트): 8 → 5(눌림) → 12(튐) → 7 → 8
      const h = k < 0.2 ? 8 - Math.round(15 * k) : k < 0.4 ? 5 + Math.round(35 * (k - 0.2)) : k < 0.6 ? 12 - Math.round(25 * (k - 0.4)) : 7 + (k > 0.7 ? 1 : 0);
      const v = k < 0.75 ? 1 : stepOut((k - 0.75) / 0.25);
      const x0 = dev(at.x) - 3 * u, yb = dev(at.y);
      for (let y = 0; y < h; y++) {
        const ph = (y / h) * 6;
        const x = Math.round((ph % 2 < 1 ? ph % 1 : 1 - (ph % 1)) * 4);
        if (!keep(x, y, v)) continue;
        g.fillStyle = COL.k; g.fillRect(x0 + (x - 1) * u, yb - (y + 1) * u, 3 * u, u);
        g.fillStyle = y % 2 ? COL.b : COL.B; g.fillRect(x0 + x * u, yb - (y + 1) * u, u, u);
      }
    },
  });
};

/**
 * 덱 → 손패: 카드 뒷면(종이 · 황동 테)이 덱 칩에서 한 장씩 호를 그리며 새 카드 자리로 날아가고, 닿으면 그 카드가 보인다.
 * cards = 새로 들어온 손패 요소들 (도착 전까지 숨겨 둔다), clip = 보이는 손패 칸.
 */
export const deal = (deck: Pt, cards: HTMLElement[], clip?: DOMRect): void => {
  if (calmMotion() || !cards.length) return;
  const u = dotPx;
  cards.forEach((el, n) => {
    el.style.visibility = 'hidden';
    const r = el.getBoundingClientRect();
    // 손패가 넘쳐 아래로 밀린 카드는 보이는 손패 칸 아래 끝(「▼ N장 더」 띠 쪽)으로 들어간다
    const to = { x: r.left + Math.min(40, r.width / 2), y: clip ? Math.min(r.top + r.height / 2, clip.bottom - 8) : r.top + r.height / 2 };
    const delay = n * CARD_FX.stagger;
    const ms = CARD_FX.deal;
    const show = () => {
      el.style.visibility = '';
      el.classList.remove('land3');
      void el.offsetWidth;
      el.classList.add('land3');
    };
    layer.add({
      dur: delay + ms,
      draw: (g, t0) => {
        const t = t0 - delay;
        if (t < 0) return;
        const k = t / ms;
        const e = glide(k);
        const x = deck.x + (to.x - deck.x) * e, y = deck.y + (to.y - deck.y) * e - 40 * 4 * e * (1 - e);
        spr(g, BACK, dev(x) - 4 * u, dev(y) - 5 * u, u);
      },
      done: show,
    });
  });
};

/** 버림 더미로: 다 쓴 카드 표가 버림 칩으로 작게 떨어진다 (뒷면 · 짧게) */
export const discard = (from: Pt, pile: Pt): void => {
  if (calmMotion()) return;
  const u = dotPx;
  const ms = 260;
  layer.add({
    dur: ms,
    draw: (g, t) => {
      const k = t / ms;
      const e = accel(k);
      const x = from.x + (pile.x - from.x) * e, y = from.y + (pile.y - from.y) * e - 30 * 4 * k * (1 - k);
      spr(g, BACK, dev(x) - 4 * u, dev(y) - 5 * u, u, k < 0.75 ? 1 : stepOut((k - 0.75) / 0.25));
    },
  });
};

/**
 * 지휘: 킹 머리 위에서 진홍 깃발이 들려(예비) 명령받은 기물 쪽으로 날아가 칸 왼쪽 위에 꽂히고(1도트 박힘 → 제자리) 두 번 펄럭인다.
 * 도착 순간에 풀리는 약속 — 기물이 그다음 움직인다.
 */
export const flag = (king: Cell, to: Cell): Promise<void> => {
  if (calmMotion()) return Promise.resolve();
  return new Promise((done) => {
    const u = dotPx;
    const { lead, flag: ms, out } = CARD_FX;
    const stay = 220;
    let arrived = false;
    const H = FLAG.length;
    layer.add({
      name: 'flag',
      dur: lead + ms + stay + out,
      draw: (g, t) => {
        const fromX = dev(king.c.x) - 2 * u, fromY = dev(king.c.y) - 10 * u - H * u;
        const toX = dev(to.c.x) - 10 * u, toY = dev(to.c.y) - 10 * u - H * u + 3 * u;
        let x = fromX, y = fromY, v = 1, sp = FLAG;
        if (t < lead) y -= (t < lead / 2 ? -1 : 2) * u;
        else if (t < lead + ms) {
          const k = (t - lead) / ms;
          const e = glide(k);
          x = Math.round(fromX + (toX - fromX) * e);
          y = Math.round(fromY + (toY - fromY) * e - Math.min(60 * layer.dpr, Math.abs(toX - fromX) * 0.3) * 4 * e * (1 - e));
          sp = Math.floor(t / 60) % 2 ? FLAG2 : FLAG;
        } else {
          const s = t - lead - ms;
          if (!arrived) { arrived = true; done(); }
          x = toX; y = toY + (s < 40 ? u : 0);
          sp = Math.floor(s / 90) % 2 ? FLAG2 : FLAG;
          if (s > stay) v = stepOut((s - stay) / out);
        }
        spr(g, sp, x, y, u, v);
      },
      done: () => { if (!arrived) done(); },
    });
  });
};

/** 쇳물 덩이: 녹인 분대원 자리에서 쇳물이 솟아 적 킹으로 떨어진다 (쇳물 서약) — 도착에 풀린다 */
export const molten = (from: Pt, to: Pt): Promise<void> => {
  if (calmMotion()) return Promise.resolve();
  return new Promise((done) => {
    const u = dotPx;
    const ms = 320;
    let arrived = false;
    const past: Pt[] = [];
    layer.add({
      dur: ms + 20,
      draw: (g, t) => {
        const k = Math.min(1, t / ms);
        const e = accel(k) * 0.6 + k * 0.4;
        const x = from.x + (to.x - from.x) * e, y = from.y + (to.y - from.y) * e - Math.min(120, Math.abs(to.x - from.x) * 0.4 + 40) * 4 * e * (1 - e);
        past.push({ x, y });
        past.slice(-5, -1).forEach((p, i) => { g.fillStyle = [COL.F, COL.F, COL.f, COL.y][i] ?? COL.F; g.fillRect(dev(p.x) - u, dev(p.y) - u + i * 0, 2 * u, 2 * u); });
        spr(g, BLOB, dev(x) - 2 * u, dev(y) - 2 * u, u);
        if (k >= 1 && !arrived) { arrived = true; done(); }
      },
      done: () => { if (!arrived) done(); },
    });
  });
};

/** 연출 층을 지운다 (대국을 떠날 때) */
export const clearCardFx = (): void => {
  for (const f of layer.list.splice(0)) f.done?.();
};
