/**
 * 영화 문법 (D-503, 후기 #31 · #1 · #22): 컷신 재생기(opening.playCuts)가 쓰는 부품 — 레터박스 · 카메라 계단 이동 ·
 * 장면 전환(디더 · 조리개 · 쇳물 · 백지 · 암전) · 장 제목 카드 · 화자 명패.
 * 새 그림 없이 받은 장면 그림만 쓴다: 확대는 기기 픽셀 정수 배율(늘리거나 찌그러뜨리지 않는다, D-386),
 * 움직임은 예비 → 터짐 → 출렁 계단(D-216 — 선형 이동 · 투명도 보간 없음), 사라짐 · 나타남은 도트 칸 단위.
 * 게임 상태는 건드리지 않는다 (UI 원칙 9).
 */
import { bayer } from '../view/pxfx';
import { pieceImg } from '../ui/sprites';
import type { Face, Shot, TitleCard, Trans } from '../data/script';

const calm = (): boolean => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));
const dpr = (): number => window.devicePixelRatio || 1;

/** 카메라 계단 박자 (D-503): 프레임 무게 — 예비(반대로 조금) → 터짐(빠르게 대부분) → 넘침 → 출렁 → 멈춤. 프레임마다 FILM.camStep ms */
export const FILM = {
  camKeys: [-0.08, 0.42, 0.84, 1.06, 0.98, 1] as const,
  camStep: 70,
  /** 확대 한 칸 = 기본 배율의 10%를 기기 픽셀 정수로 반올림(최소 1) — z3이 1.3 ~ 1.6배 */
  zoomStep: 0.1,
  /** 전환 프레임 간격 (ms) · 칸 크기(장면 도트 배수) */
  wipeStep: 48,
  /** 장 제목 카드 머묾 (누르면 바로) */
  titleHold: 2600,
  /** 찍는 속도 (ms/자): 서술 · 대사 · 독백 — #2 「빠르고 정신없다」 30 → 40 */
  type: { n: 40, s: 34, m: 46 } as const,
};

/** 그림 한 장의 카메라 배치: 기기 픽셀 정수 배율 n(그림 1도트 = n 기기 픽셀)과 초점 → 칸 안 자리 */
export interface Frame { n: number; x: number; y: number; w: number; h: number }
/** 기본 배율 = 칸을 덮는 가장 작은 정수 배율 (uikit.coverArt · view/cover.fitCover와 같은 셈) */
export const baseScale = (sw: number, sh: number, bw: number, bh: number, r = dpr()): number => Math.ceil(Math.max(bw / sw, bh / sh) * r);
/** 확대 z칸의 배율 */
export const zoomScale = (n0: number, z = 0): number => n0 + Math.round(z) * Math.max(1, Math.round(n0 * FILM.zoomStep));
/** 초점(0~1)을 칸 가운데에 두되 그림 밖이 비치지 않게 — 위치는 기기 픽셀에 맞춘다 */
export const frameAt = (sw: number, sh: number, bw: number, bh: number, n: number, fx: number, fy: number, r = dpr()): Frame => {
  const w = (sw * n) / r, h = (sh * n) / r;
  const snap = (v: number) => Math.round(v * r) / r;
  const x = snap(Math.min(0, Math.max(bw - w, bw / 2 - Math.max(0, Math.min(1, fx)) * w)));
  const y = snap(Math.min(0, Math.max(bh - h, bh / 2 - Math.max(0, Math.min(1, fy)) * h)));
  return { n, x, y, w, h };
};
const place = (img: HTMLImageElement, f: Frame): void => {
  img.style.width = `${f.w}px`;
  img.style.height = `${f.h}px`;
  img.style.left = `${f.x}px`;
  img.style.top = `${f.y}px`;
};

/** 장면 그림 하나의 카메라 — 지금 초점 · 확대를 기억하고 다음 샷으로 계단 이동 */
export class Camera {
  private cur: Shot = { x: 0.5, y: 0.5, z: 0 };
  private token = 0;
  constructor(private img: HTMLImageElement) {}
  private frame(s: Shot): Frame | null {
    const box = this.img.parentElement;
    if (!box || !this.img.naturalWidth || !box.clientWidth) return null;
    const { naturalWidth: sw, naturalHeight: sh } = this.img;
    const n0 = baseScale(sw, sh, box.clientWidth, box.clientHeight);
    return frameAt(sw, sh, box.clientWidth, box.clientHeight, zoomScale(n0, s.z ?? 0), s.x, s.y);
  }
  /** 바로 놓기 (컷이 바뀔 때 · 줄인 움직임) */
  set(s: Shot): void {
    this.token++;
    this.cur = { ...s, z: s.z ?? 0 };
    const f = this.frame(this.cur);
    if (f) place(this.img, f);
  }
  /** 다시 맞춤 (창 크기가 바뀌면) */
  refit(): void { this.set(this.cur); }
  /** 샷 이동: 초점 · 배율을 FILM.camKeys 계단으로 — 배율은 정수만 지난다 */
  async move(s: Shot): Promise<void> {
    const to = { ...s, z: s.z ?? 0 };
    const from = this.cur;
    if (calm() || (Math.abs(from.x - to.x) < 0.01 && Math.abs(from.y - to.y) < 0.01 && from.z === to.z)) return this.set(to);
    const my = ++this.token;
    for (const k of FILM.camKeys) {
      if (my !== this.token) return;
      // 배율은 넘치지 않는다(예비 · 넘침은 초점에만) — 정수 칸만 지나게
      const kz = Math.max(0, Math.min(1, k));
      const f = this.frame({ x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k, z: Math.round(from.z! + (to.z - from.z!) * kz) });
      if (f) place(this.img, f);
      await wait(FILM.camStep);
    }
    if (my === this.token) this.set(to);
  }
}

/**
 * 장면 전환 (D-503): 장면 칸 위 도트 칸 캔버스. close = 덮기(끝나면 꽉 찬 채 남는다) → 부른 쪽이 그림을 바꾸고 → open = 걷기(지운다).
 * dither = 4×4 베이어 먹 · iris = 초점을 향해 닫히는 도트 조리개 · melt = 아래에서 쇳물(진홍 앞날)이 차오름 · white = 종이 백지 디더 · black = 암전 · cut = 바로.
 */
export class Wipe {
  private c: HTMLCanvasElement;
  private x: CanvasRenderingContext2D;
  private cols = 0;
  private rows = 0;
  private cell = 6;
  color = '#0b0b0e';
  constructor(private host: HTMLElement) {
    this.c = document.createElement('canvas');
    this.c.className = 'film-wipe';
    this.x = this.c.getContext('2d')!;
    host.appendChild(this.c);
  }
  private size(): void {
    const r = dpr();
    // 칸 = 장면 도트(3 기기 픽셀 안팎) × 2 — 기기 픽셀 정수
    this.cell = Math.max(2, Math.round(3 * r) * 2) / r;
    this.cols = Math.ceil(this.host.clientWidth / this.cell);
    this.rows = Math.ceil(this.host.clientHeight / this.cell);
    this.c.width = this.cols;
    this.c.height = this.rows;
    this.c.style.width = `${this.cols * this.cell}px`;
    this.c.style.height = `${this.rows * this.cell}px`;
    this.x.imageSmoothingEnabled = false;
  }
  private paint(fill: (cx: number, cy: number) => string | null): void {
    const g = this.x;
    g.clearRect(0, 0, this.cols, this.rows);
    for (let y = 0; y < this.rows; y++)
      for (let x = 0; x < this.cols; x++) {
        const col = fill(x, y);
        if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); }
      }
  }
  /** 꽉 채운 채 (전환 사이 · 암전 · 끝 정적) */
  full(color = this.color): void {
    this.size();
    this.color = color;
    this.c.hidden = false;
    this.paint(() => color);
  }
  clear(): void { this.c.hidden = true; this.x.clearRect(0, 0, this.cols, this.rows); }
  /** 한 쪽 방향 전환 프레임들 — t는 0(빈) → 1(꽉) */
  private async run(kind: Trans, ts: number[], at: Shot): Promise<void> {
    const ink = this.color;
    const fx = at.x * this.cols, fy = at.y * this.rows;
    const R = Math.hypot(Math.max(fx, this.cols - fx), Math.max(fy, this.rows - fy)) + 1;
    for (const t of ts) {
      if (kind === 'iris') this.paint((x, y) => (Math.hypot(x + 0.5 - fx, y + 0.5 - fy) > R * (1 - t) ? ink : null));
      else if (kind === 'melt') {
        const front = t * (this.rows + 6);
        this.paint((x, y) => {
          const d = front - (this.rows - y) + (bayer(x, y) - 0.5) * 4;
          return d < 0 ? null : d < 2 && t < 1 ? '#e5262f' : d < 4 && t < 1 ? '#7a1218' : ink;
        });
      } else this.paint((x, y) => (bayer(x, y) < t ? ink : null));
      await wait(FILM.wipeStep);
    }
  }
  async close(kind: Trans, at: Shot = { x: 0.5, y: 0.5 }, color = '#0b0b0e'): Promise<void> {
    this.size();
    this.color = kind === 'white' ? '#f1ede4' : color;
    this.c.hidden = false;
    if (calm() || kind === 'cut' || kind === 'black') return this.full(this.color);
    if (kind === 'iris') return this.run('iris', [0.25, 0.48, 0.66, 0.8, 0.9, 1], at);
    if (kind === 'melt') return this.run('melt', [0.18, 0.36, 0.55, 0.74, 0.9, 1], at);
    return this.run('dither', [0.26, 0.51, 0.76, 1.01], at);
  }
  async open(kind: Trans, at: Shot = { x: 0.5, y: 0.5 }): Promise<void> {
    if (calm() || kind === 'cut') return this.clear();
    if (kind === 'iris') await this.run('iris', [0.9, 0.78, 0.6, 0.38, 0.14], at);
    else await this.run('dither', [0.76, 0.51, 0.26], at);
    this.clear();
  }
}

/** 장 제목 카드 (D-503): 먹 바탕 위 꼬리표(12 굵게) · 철 구분 줄(빌린 divider) · 제목(36, 좁으면 24) · 부제(15). 계단으로 차례로 서고 누르거나 머문 뒤 디더로 걷힌다 */
export const titleCardHtml = (t: TitleCard): string =>
  `<div class="film-title tone-${t.tone ?? 'brass'}" role="status"><p class="ft-kick">${t.kicker}</p><i class="ft-rule" aria-hidden="true"></i><h2 class="ft-name">${t.title}</h2>${t.sub ? `<p class="ft-sub">${t.sub}</p>` : ''}</div>`;
export const showTitle = async (host: HTMLElement, t: TitleCard, skip: Promise<unknown>): Promise<void> => {
  host.querySelector('.film-title')?.remove();
  host.insertAdjacentHTML('beforeend', titleCardHtml(t));
  const el = host.querySelector<HTMLElement>('.film-title')!;
  // 카드가 서 있는 동안 빈 자막 띠는 걷는다 (빈 띠가 비어 보이지 않게)
  const root = host.closest<HTMLElement>('.prologue');
  root?.classList.add('titling');
  el.classList.add('in');
  await Promise.race([wait(calm() ? 1400 : FILM.titleHold), skip]);
  el.classList.add('out');
  await wait(calm() ? 0 : 220);
  el.remove();
  root?.classList.remove('titling');
};

/** 화자 명패 (D-503 · #22): 초상 액자(DL-02 portrait-*) 안에 화자 얼굴 + 이름표(name-*). 우리 편 = 띠 왼쪽 · 적 · 도금왕 = 오른쪽 · NPC = 종이 꼬리표 */
export type PlateSide = 'ally' | 'foe' | 'gilded' | 'npc';
export const faceHtml = (f: Face | undefined): string => {
  if (!f) return '';
  if ('art' in f) return `<img src="scenes/${f.art}.png" alt="" style="object-position:${f.at ?? '50% 24%'}">`;
  return pieceImg(f.t, f.side, 'large', 72);
};
export const plateHtml = (who: string, side: PlateSide, face?: Face): string =>
  `<div class="cut-who cw-${side}${face ? '' : ' no-face'}" aria-hidden="true">${face ? `<span class="cw-face">${faceHtml(face)}</span>` : ''}<b class="cw-name">${who}</b></div>`;
