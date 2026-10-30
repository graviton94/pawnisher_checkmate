/**
 * 타이틀·메뉴·출하 화면 뒤의 공장 배경 + 인트로 (D-085). 도트 목업 — 나중에 사용자 에셋으로 갈아 끼운다.
 * 낮은 해상도(320×144) 캔버스에 직접 찍고 화면에 최근접 확대한다. 시계 문자판·톱니·컨베이어·용광로 불빛·증기.
 * 인트로: 정품 폰들이 컨베이어를 지나며 「규격」 도장을 받는다 → 아홉째 폰에서 도장이 빗나가고 붉은 사선이 화면을 벤다 → 로고.
 */

const W = 320;
const H = 144;
const COL = {
  bg0: '#0b0a0f',
  bg1: '#131118',
  wall: '#1a1820',
  wall2: '#211e29',
  gear: '#1d1b24',
  gearHi: '#2c2935',
  brass: '#c89b3c',
  brassLo: '#6b4c12',
  belt: '#24222b',
  beltHi: '#3a3744',
  roller: '#121116',
  red: '#e5262f',
  redLo: '#7a1218',
  steam: '#8a8794',
  white: '#f4f1ea',
  ink: '#16141c',
};

type Mode = 'intro' | 'title' | 'dim';

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

export class Backdrop {
  private cv: HTMLCanvasElement;
  private g: CanvasRenderingContext2D;
  private pawn = new Image();
  private t0 = performance.now();
  private raf = 0;
  private mode: Mode = 'title';
  /** 인트로 시작 시각 (ms, performance.now 기준) */
  private introAt = 0;
  private onIntroEnd: (() => void) | null = null;
  private embers: { x: number; y: number; v: number; life: number }[] = [];

  constructor(host: HTMLElement) {
    this.cv = document.createElement('canvas');
    this.cv.width = W;
    this.cv.height = H;
    this.cv.className = 'backdrop';
    this.cv.setAttribute('aria-hidden', 'true');
    host.prepend(this.cv);
    this.g = this.cv.getContext('2d')!;
    this.g.imageSmoothingEnabled = false;
    this.pawn.src = 'pieces/s-P0.png';
  }

  /** 보이기 · 모드 바꾸기 */
  show(mode: Mode): void {
    this.mode = mode;
    this.cv.hidden = false;
    this.cv.classList.toggle('dim', mode === 'dim');
    if (!this.raf) this.loop();
  }

  hide(): void {
    this.cv.hidden = true;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  /** 인트로를 재생한다. 끝나면(또는 건너뛰면) done */
  playIntro(done: () => void): void {
    this.onIntroEnd = done;
    this.introAt = performance.now();
    this.show('intro');
    if (reduced()) this.skipIntro();
  }

  /** 지금 인트로 몇 ms째인가 (인트로가 아니면 -1) */
  introTime(): number {
    return this.mode === 'intro' ? performance.now() - this.introAt : -1;
  }

  skipIntro(): void {
    if (this.mode !== 'intro') return;
    this.mode = 'title';
    const cb = this.onIntroEnd;
    this.onIntroEnd = null;
    cb?.();
  }

  private loop = (): void => {
    this.raf = requestAnimationFrame(this.loop);
    const now = performance.now();
    const t = (now - this.t0) / 1000;
    this.draw(t, now);
    if (this.mode === 'intro' && now - this.introAt > INTRO.logo) this.skipIntro();
  };

  // ---------- 그리기 ----------
  private draw(t: number, now: number): void {
    const g = this.g;
    const still = reduced();
    const tt = still ? 0 : t;
    // 벽: 아래로 갈수록 밝아지는 띠 (디더 2단)
    g.fillStyle = COL.bg0;
    g.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y++) {
      const band = y < 40 ? COL.bg0 : y < 80 ? COL.bg1 : COL.wall;
      g.fillStyle = band;
      if (y % 2 === 0 || y > 82) g.fillRect(0, y, W, 1);
    }
    // 고딕 아치 창 3개 (어두운 실루엣)
    for (const ax of [36, 110, 184]) this.arch(ax, 14, 30, 58);
    // 시계 문자판 (오른쪽 위) — 장미창
    this.clock(262, 40, 30, tt);
    // 큰 톱니 (왼쪽 아래, 가운데 뒤)
    this.gear(18, 70, 30, 12, tt * 0.25, COL.gear, COL.gearHi);
    this.gear(70, 58, 16, 9, -tt * 0.5, COL.gear, COL.gearHi);
    this.gear(212, 78, 22, 10, tt * 0.35, COL.gear, COL.gearHi);
    // 도장 프레스 (가운데 위)
    const intro = this.introTime();
    const press = this.pressY(intro, tt);
    this.stampPress(160, press);
    // 컨베이어 (아래 1/3)
    this.conveyor(tt, intro);
    // 용광로 불빛 + 불티 (왼쪽 아래)
    this.furnace(tt, still);
    // 증기 (톱니 사이)
    if (!still) this.steam(tt);
    // 인트로: 붉은 사선 · 화면 흔들림 · 페이드
    if (this.mode === 'intro') this.introFx(intro);
    if (this.mode === 'intro' && intro < 500) {
      g.fillStyle = `rgba(0,0,0,${1 - intro / 500})`;
      g.fillRect(0, 0, W, H);
    }
    void now;
  }

  private arch(x: number, y: number, w: number, h: number): void {
    const g = this.g;
    g.fillStyle = '#0f0e14';
    const r = w / 2;
    for (let yy = 0; yy < h; yy++) {
      let half = r;
      if (yy < r) half = Math.round(Math.sqrt(r * r - (r - yy) * (r - yy)));
      g.fillRect(x + r - half, y + yy, half * 2, 1);
    }
    // 창살
    g.fillStyle = COL.bg0;
    g.fillRect(x + r - 1, y + 4, 2, h - 4);
    g.fillRect(x + 2, y + h / 2, w - 4, 1);
  }

  private clock(cx: number, cy: number, r: number, t: number): void {
    const g = this.g;
    // 테두리 링
    for (let y = -r; y <= r; y++)
      for (let x = -r; x <= r; x++) {
        const d = Math.sqrt(x * x + y * y);
        if (d <= r && d > r - 3) {
          g.fillStyle = d > r - 1 ? COL.brassLo : '#3a2c12';
          g.fillRect(cx + x, cy + y, 1, 1);
        } else if (d <= r - 3) {
          g.fillStyle = (x + y) % 2 === 0 ? '#16141c' : '#18161f';
          g.fillRect(cx + x, cy + y, 1, 1);
        }
      }
    // 눈금 12개
    g.fillStyle = COL.brass;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.fillRect(Math.round(cx + Math.cos(a) * (r - 6)), Math.round(cy + Math.sin(a) * (r - 6)), i % 3 === 0 ? 2 : 1, i % 3 === 0 ? 2 : 1);
    }
    // 바늘 (분침 천천히, 시침 더 천천히)
    this.hand(cx, cy, r - 9, t * 0.2 - Math.PI / 2, COL.brass);
    this.hand(cx, cy, r - 15, t * 0.02 + 1, COL.brassLo);
    g.fillStyle = COL.red;
    g.fillRect(cx - 1, cy - 1, 2, 2);
  }

  private hand(cx: number, cy: number, len: number, a: number, c: string): void {
    const g = this.g;
    g.fillStyle = c;
    for (let i = 0; i < len; i++) g.fillRect(Math.round(cx + Math.cos(a) * i), Math.round(cy + Math.sin(a) * i), 1, 1);
  }

  private gear(cx: number, cy: number, r: number, teeth: number, a: number, c: string, hi: string): void {
    const g = this.g;
    for (let y = -r - 3; y <= r + 3; y++)
      for (let x = -r - 3; x <= r + 3; x++) {
        const d = Math.sqrt(x * x + y * y);
        const ang = Math.atan2(y, x) - a;
        const tooth = Math.cos(ang * teeth) > 0.35 ? 3 : 0;
        if (d <= r + tooth && d > r * 0.32) {
          g.fillStyle = d > r + tooth - 1 && y < 0 ? hi : c;
          g.fillRect(cx + x, cy + y, 1, 1);
        }
      }
    // 살 4개
    g.fillStyle = c;
    for (let k = 0; k < 4; k++) {
      const s = a + (k * Math.PI) / 2;
      for (let i = 0; i < r * 0.35; i++) g.fillRect(Math.round(cx + Math.cos(s) * i), Math.round(cy + Math.sin(s) * i), 2, 2);
    }
  }

  /** 도장 프레스 높이: 인트로 중엔 박자에 맞춰 내려찍고, 평소엔 느리게 */
  private pressY(intro: number, t: number): number {
    const top = 52;
    const hit = 74;
    if (intro >= 0) {
      if (intro < INTRO.pawnsFrom) return top;
      const k = ((intro - INTRO.pawnsFrom) % INTRO.beat) / INTRO.beat;
      // 모으기(천천히 올라감) → 쾅(빠르게) → 머묾
      return k < 0.7 ? top - 4 * (k / 0.7) : k < 0.8 ? top - 4 + (hit - top + 4) * ((k - 0.7) / 0.1) : hit;
    }
    const k = (t % 2.4) / 2.4;
    return k < 0.85 ? top - 4 * (k / 0.85) : top - 4 + (hit - top + 4) * Math.min(1, (k - 0.85) / 0.05);
  }

  private stampPress(cx: number, y: number): void {
    const g = this.g;
    g.fillStyle = COL.roller;
    g.fillRect(cx - 2, 0, 4, y - 8);
    g.fillStyle = COL.beltHi;
    g.fillRect(cx - 12, y - 10, 24, 6);
    g.fillStyle = COL.brassLo;
    g.fillRect(cx - 9, y - 4, 18, 4);
    g.fillStyle = COL.redLo;
    g.fillRect(cx - 8, y, 16, 1);
  }

  /** 컨베이어: 벨트 무늬가 흐르고 폰이 지나간다. 인트로 끝의 아홉째 폰은 도장 아래에 선다 */
  private conveyor(t: number, intro: number): void {
    const g = this.g;
    const y = 98;
    g.fillStyle = COL.roller;
    g.fillRect(0, y, W, 12);
    g.fillStyle = COL.belt;
    g.fillRect(0, y, W, 4);
    const shift = Math.floor(t * 18) % 8;
    g.fillStyle = COL.beltHi;
    for (let x = -8 + shift; x < W; x += 8) g.fillRect(x, y, 4, 1);
    for (let x = 6; x < W; x += 22) {
      g.fillStyle = COL.gearHi;
      g.fillRect(x, y + 6, 4, 4);
      g.fillStyle = COL.ink;
      g.fillRect(x + 1, y + 7, 2, 2);
    }
    // 다리
    g.fillStyle = '#0d0c11';
    for (let x = 20; x < W; x += 60) g.fillRect(x, y + 12, 4, H - y - 12);
    if (!this.pawn.complete) return;
    const size = 18;
    // 지나가는 폰들 (인트로 중엔 박자에 맞춰 8기 + 아홉째)
    if (intro >= 0) {
      const n = Math.max(0, Math.floor((intro - INTRO.pawnsFrom) / INTRO.beat));
      for (let i = 0; i < Math.min(n + 1, 9); i++) {
        const born = INTRO.pawnsFrom + i * INTRO.beat;
        const age = (intro - born) / INTRO.beat;
        const ninth = i === 8;
        // 도장 아래(160)까지 와서 멈췄다가 다음 박자에 지나간다
        let x = -20 + Math.min(age, 1) * 170;
        if (age > 1 && !ninth) x = 150 + (age - 1) * 170;
        if (ninth) x = -20 + Math.min(age, 1) * 170;
        if (x > W) continue;
        g.drawImage(this.pawn, Math.round(x), y - size + 1, size, size);
        // 정품 도장 자국 (지나간 폰 이마에 황동 점)
        if (age > 1 && !ninth) {
          g.fillStyle = COL.brass;
          g.fillRect(Math.round(x) + 8, y - size + 6, 2, 2);
        }
      }
      return;
    }
    // 평소: 폰이 천천히 흘러간다
    for (let i = 0; i < 4; i++) {
      const x = ((t * 14 + i * 90) % (W + 40)) - 20;
      g.drawImage(this.pawn, Math.round(x), y - size + 1, size, size);
    }
  }

  private furnace(t: number, still: boolean): void {
    const g = this.g;
    const flick = still ? 0.5 : 0.5 + 0.5 * Math.sin(t * 7) * Math.sin(t * 3.1);
    // 불빛 (왼쪽 아래 반원)
    for (let r = 26; r > 0; r -= 2) {
      g.fillStyle = r > 18 ? '#2a0a0d' : r > 10 ? COL.redLo : flick > 0.5 ? COL.red : '#c41f27';
      for (let y = -r; y <= 0; y++) {
        const half = Math.round(Math.sqrt(r * r - y * y));
        if ((y + r) % 2 === 0 || r <= 18) g.fillRect(-4 + 0, H + y, half, 1);
      }
    }
    if (still) return;
    if (Math.random() < 0.3) this.embers.push({ x: 4 + Math.random() * 18, y: H - 6, v: 0.2 + Math.random() * 0.4, life: 1 });
    g.fillStyle = '#facc15';
    this.embers = this.embers.filter((e) => {
      e.y -= e.v;
      e.x += Math.sin(e.y * 0.2) * 0.2;
      e.life -= 0.012;
      if (e.life > 0) g.fillRect(Math.round(e.x), Math.round(e.y), 1, 1);
      return e.life > 0;
    });
  }

  private steam(t: number): void {
    const g = this.g;
    for (let i = 0; i < 6; i++) {
      const k = (t * 0.3 + i / 6) % 1;
      const x = 96 + i * 7 + Math.sin(t + i) * 3;
      const y = 92 - k * 50;
      const r = 1 + Math.floor(k * 3);
      if (k > 0.85) continue; // 도트가 하나씩 꺼지듯 (반투명 없음)
      g.fillStyle = COL.steam;
      g.fillRect(Math.round(x), Math.round(y), r, r);
    }
  }

  private introFx(ms: number): void {
    const g = this.g;
    // 아홉째 폰이 도장 아래 섰을 때: 도장이 빗나가고 붉은 사선이 화면을 벤다
    if (ms > INTRO.slash) {
      const k = Math.min(1, (ms - INTRO.slash) / 160);
      g.fillStyle = COL.red;
      for (let i = 0; i < W * k; i++) {
        const x = i;
        const y = Math.round(H - 10 - (i / W) * (H - 20));
        g.fillRect(x, y, 2, 2);
        g.fillRect(x, y + 2, 1, 1);
      }
      if (ms < INTRO.slash + 90) {
        g.fillStyle = 'rgba(244,241,234,0.85)';
        g.fillRect(0, 0, W, H);
      }
    }
  }
}

/** 인트로 박자 (ms) — 폰 9기 × 박자 + 사선 + 로고 */
export const INTRO = {
  pawnsFrom: 600,
  beat: 420,
  get slash() {
    return this.pawnsFrom + 8 * this.beat + 520;
  },
  get logo() {
    return this.slash + 240;
  },
};
