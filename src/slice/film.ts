/**
 * 영화 문법 (D-504, 후기 #31 · #1 · #22 → D-554 매끈한 도트 움직임): 컷신 재생기(opening.playCuts)가 쓰는 부품 — 레터박스 · 카메라 이동 · 켄 번스 ·
 * 장면 전환(디더 · 조리개 · 쇳물 · 백지 · 암전) · 장 제목 카드 · 화자 명패.
 * 새 그림 없이 받은 장면 그림만 쓴다: 확대는 기기 픽셀 정수 배율(늘리거나 찌그러뜨리지 않는다, D-386),
 * 움직임은 화면 프레임마다 예비 → 터짐 → 출렁 곡선 · 위치는 기기 픽셀 정수(D-554), 사라짐 · 나타남은 64단 베이어 디더(투명도 보간 없음, D-216).
 * 게임 상태는 건드리지 않는다 (UI 원칙 9).
 */
import { calmMotion } from '../prefs/motion';
import { bayer8, ditherTo, ease, tween } from '../view/motion';
import { FILM_MOTION } from '../data/motion';
import { pieceImg } from '../ui/sprites';
import type { Face, Shot, TitleCard, Trans } from '../data/script';
import { portraitImg } from '../data/portraits';

const calm = (): boolean => calmMotion();
const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));
const dpr = (): number => window.devicePixelRatio || 1;

/** 컷신 박자 (D-504 → D-554: 카메라 · 전환 시간은 data/motion.FILM_MOTION — 옛 90ms 계단 카메라는 지웠다) */
export const FILM = {
  /** 확대 한 칸 = 기본 배율의 10%를 기기 픽셀 정수로 반올림(최소 1) — z3이 1.3 ~ 1.6배 */
  zoomStep: 0.1,
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

/** 장면 그림 하나의 카메라 — 지금 초점 · 확대를 기억하고 다음 샷으로 옮긴다 */
export class Camera {
  private cur: Shot = { x: 0.5, y: 0.5, z: 0 };
  private token = 0;
  private last = '';
  constructor(private img: HTMLImageElement) {}
  private frame(s: Shot): Frame | null {
    const box = this.img.parentElement;
    if (!box || !this.img.naturalWidth || !box.clientWidth) return null;
    const { naturalWidth: sw, naturalHeight: sh } = this.img;
    const n0 = baseScale(sw, sh, box.clientWidth, box.clientHeight);
    return frameAt(sw, sh, box.clientWidth, box.clientHeight, zoomScale(n0, s.z ?? 0), s.x, s.y);
  }
  /** 바뀐 프레임만 쓴다 (같은 정수 위치면 다시 그리지 않는다 — D-533) */
  private put(f: Frame | null): void {
    if (!f) return;
    const k = `${f.x},${f.y},${f.w}`;
    if (k === this.last) return;
    this.last = k;
    place(this.img, f);
  }
  /** 바로 놓기 (컷이 바뀔 때 · 줄인 움직임) */
  set(s: Shot): void {
    this.token++;
    this.cur = { ...s, z: s.z ?? 0 };
    this.put(this.frame(this.cur));
  }
  /** 다시 맞춤 (창 크기가 바뀌면) */
  refit(): void { this.last = ''; this.set(this.cur); }
  /** 지금 초점 (켄 번스가 밀어 둔 자리 포함) */
  get shot(): Shot { return { ...this.cur }; }
  /**
   * 샷 이동 (D-554): 화면 프레임마다 예비 → 터짐 → 출렁 곡선(ease.abs)으로 초점을 옮기고 위치는 기기 픽셀 정수.
   * 배율이 바뀌면(정수만) 옛 배율 그림을 겹쳐 두고 64단 디더로 걷는다 — 배율이 한 프레임에 튀지 않는다.
   */
  async move(s: Shot): Promise<void> {
    const to = { ...s, z: s.z ?? 0 };
    const from = { ...this.cur };
    if (calm() || (Math.abs(from.x - to.x) < 0.005 && Math.abs(from.y - to.y) < 0.005 && from.z === to.z)) return this.set(to);
    const my = ++this.token;
    const box = this.img.parentElement!;
    const span = Math.hypot(to.x - from.x, to.y - from.y) + Math.abs((to.z ?? 0) - (from.z ?? 0)) * 0.25;
    const M = FILM_MOTION.cam;
    const ms = Math.min(M.max, M.base + span * M.perSpan);
    let ghost: HTMLImageElement | null = null;
    if (from.z !== to.z) {
      // 옛 배율 그대로 겹친 그림 — 새 배율 그림 위에서 디더로 걷힌다
      ghost = this.img.cloneNode() as HTMLImageElement;
      ghost.removeAttribute('data-film');
      ghost.classList.add('cam-ghost');
      box.appendChild(ghost);
      const g = ghost;
      void ditherTo(g, 1, 0, ms * 0.8, ease.inOut).then(() => g.remove());
    }
    const z = to.z;
    await tween(ms, (e) => {
      const f = { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, z };
      this.cur = f;
      this.put(this.frame(f));
    }, (t) => ease.abs(t, 0.06, 0.04), () => my === this.token);
    if (my === this.token) this.set(to);
    else ghost?.remove();
  }
  /**
   * 켄 번스 (D-554): 한 줄이 서 있는 동안 천천히 민다 — 정수 기기 픽셀, 느린 곡선. 다음 move · set이 오면 그 자리에서 멈춘다.
   * dir = 미는 방향(그림 안 초점 변화, 생략하면 여유가 가장 큰 쪽). 그림이 칸보다 크지 않은 축은 움직이지 않는다.
   */
  async drift(dir?: { x: number; y: number }): Promise<void> {
    if (calm()) return;
    const box = this.img.parentElement;
    const f = this.frame(this.cur);
    if (!box || !f) return;
    const roomX = f.w - box.clientWidth, roomY = f.h - box.clientHeight;
    if (roomX < 2 && roomY < 2) return;
    const D = FILM_MOTION.drift;
    // 미는 거리 (CSS px)
    const px = (D.speed * D.max) / 1000 / dpr();
    let dx = 0, dy = 0;
    if (dir && (dir.x || dir.y)) { dx = dir.x; dy = dir.y; }
    else if (roomX >= roomY) dx = -f.x > roomX / 2 ? -1 : 1;
    else dy = -f.y > roomY / 2 ? -1 : 1;
    const len = Math.hypot(dx, dy) || 1;
    const from = { ...this.cur };
    const to = { x: from.x + ((dx / len) * px) / f.w, y: from.y + ((dy / len) * px) / f.h, z: from.z };
    const my = ++this.token;
    await tween(D.max, (e) => {
      const s = { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, z: from.z };
      this.cur = s;
      this.put(this.frame(s));
    }, ease.inOut, () => my === this.token);
  }
  /** 켄 번스를 그 자리에서 멈춘다 */
  stop(): void { this.token++; }
}

/** 전환 모양 (D-554): 칸마다 「덮인 깊이」 v(칸 단위, 0보다 크면 덮임) — 앞날은 베이어로 EDGE칸에 걸쳐 녹인다 */
type Shape = (x: number, y: number, t: number, cols: number, rows: number, fx: number, fy: number, R: number) => number;
const EDGE = 3;
const SHAPES: Partial<Record<Trans, Shape>> = {
  iris: (x, y, t, _c, _r, fx, fy, R) => Math.hypot(x + 0.5 - fx, y + 0.5 - fy) - R * (1 - t),
  shutter: (_x, y, t, _c, rows) => t * (rows / 2 + EDGE) - Math.min(y + 0.5, rows - y - 0.5),
  diag: (x, y, t, cols, rows) => t * (cols + rows + EDGE * 2) - (x + y) - EDGE,
  blinds: (_x, y, t) => t * (8 + EDGE) - (y % 8) - EDGE / 2,
  page: (x, _y, t, cols) => t * (cols + 8) - (cols - x) - 4,
};
/** #rrggbb → ImageData 한 칸 (little-endian ABGR) */
const rgba = (hex: string): number => {
  const v = parseInt(hex.replace('#', ''), 16);
  return ((0xff << 24) | ((v & 0xff) << 16) | (v & 0xff00) | ((v >> 16) & 0xff)) >>> 0;
};

/**
 * 장면 전환 (D-504 → D-554): 장면 칸 위 도트 칸 캔버스. close = 덮기(끝나면 꽉 찬 채 남는다) → 부른 쪽이 그림을 바꾸고 → open = 걷기(지운다).
 * 프레임마다 그린다(옛 48ms 네 · 여섯 장 → 화면 주기 그대로), 덮인 정도는 곡선을 따른다. 칸 = 장면 도트 × 2, 앞날은 8×8 베이어로 녹인다.
 * dither = 8×8 베이어 먹 64단 · iris = 초점으로 닫히는 조리개 · melt = 아래에서 쇳물(진홍 앞날) · white = 종이 백지 디더 · black = 암전 ·
 * shutter = 위아래 철문 날 · diag = 사선 쓸기 · blinds = 블라인드 줄 · page = 오른쪽에서 넘기는 종이 쪽(접힘 앞날) · cut = 바로.
 */
export class Wipe {
  private c: HTMLCanvasElement;
  private x: CanvasRenderingContext2D;
  private cols = 0;
  private rows = 0;
  private cell = 6;
  private img: ImageData | null = null;
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
    const cols = Math.max(1, Math.ceil(this.host.clientWidth / this.cell));
    const rows = Math.max(1, Math.ceil(this.host.clientHeight / this.cell));
    if (cols !== this.cols || rows !== this.rows || !this.img) {
      this.cols = cols;
      this.rows = rows;
      this.c.width = cols;
      this.c.height = rows;
      this.img = this.x.createImageData(cols, rows);
    }
    this.c.style.width = `${this.cols * this.cell}px`;
    this.c.style.height = `${this.rows * this.cell}px`;
    this.x.imageSmoothingEnabled = false;
  }
  /** 칸마다 색 (0 = 빈 칸) — ImageData 한 번에 */
  private paint(fill: (cx: number, cy: number) => number): void {
    if (!this.img) return;
    const buf = new Uint32Array(this.img.data.buffer);
    for (let y = 0, i = 0; y < this.rows; y++) for (let x = 0; x < this.cols; x++, i++) buf[i] = fill(x, y);
    this.x.putImageData(this.img, 0, 0);
  }
  /** 꽉 채운 채 (전환 사이 · 암전 · 끝 정적) */
  full(color = this.color): void {
    this.size();
    this.color = color;
    this.c.hidden = false;
    const ink = rgba(color);
    this.paint(() => ink);
  }
  clear(): void { this.c.hidden = true; this.x.clearRect(0, 0, this.cols, this.rows); }
  /** 덮인 정도 t(0 빈 → 1 꽉) 한 장 */
  private draw(kind: Trans, t: number, at: Shot): void {
    const ink = rgba(this.color);
    const cols = this.cols, rows = this.rows;
    if (t >= 1) return this.paint(() => ink);
    if (kind === 'melt') {
      const red = rgba('#e5262f'), dark = rgba('#7a1218');
      const front = t * (rows + 6);
      return this.paint((x, y) => {
        const d = front - (rows - y) + (bayer8(x, y) / 64 - 0.5) * 4;
        return d < 0 ? 0 : d < 2 ? red : d < 4 ? dark : ink;
      });
    }
    const shape = SHAPES[kind];
    if (!shape) {
      // 디더 (white · black 포함): 8×8 베이어 64단
      const lv = t * 64;
      return this.paint((x, y) => (bayer8(x, y) < lv ? ink : 0));
    }
    const fx = at.x * cols, fy = at.y * rows;
    const R = Math.hypot(Math.max(fx, cols - fx), Math.max(fy, rows - fy)) + EDGE;
    const paper = rgba('#f1ede4'), fold = rgba('#b9b2a2');
    this.paint((x, y) => {
      const v = shape(x, y, t, cols, rows, fx, fy, R);
      if (kind === 'page' && v > -1 && v < 1.5) return v < 0.5 ? fold : paper;
      return v > (bayer8(x, y) / 64 - 0.5) * EDGE ? ink : 0;
    });
  }
  /** 한 방향: 덮인 정도를 a → b로 ms 동안 곡선 따라 (화면 프레임마다, 그림이 바뀔 때만 그린다) */
  private async run(kind: Trans, a: number, b: number, ms: number, curve: (t: number) => number, at: Shot): Promise<void> {
    let last = -1;
    const plain = !SHAPES[kind] && kind !== 'melt';
    await tween(ms, (e) => {
      const t = a + (b - a) * e;
      const key = plain ? Math.round(t * 64) : Math.round(t * 1000);
      if (key === last) return;
      last = key;
      this.draw(kind, t, at);
    }, curve);
  }
  async close(kind: Trans, at: Shot = { x: 0.5, y: 0.5 }, color = '#0b0b0e'): Promise<void> {
    this.size();
    this.color = kind === 'white' ? '#f1ede4' : color;
    this.c.hidden = false;
    if (calm() || kind === 'cut') return this.full(this.color);
    await this.run(kind, 0, 1, kind === 'black' ? FILM_MOTION.wipe.close * 1.4 : FILM_MOTION.wipe.close, ease.in, at);
    this.full(this.color);
  }
  async open(kind: Trans, at: Shot = { x: 0.5, y: 0.5 }): Promise<void> {
    if (calm() || kind === 'cut') return this.clear();
    this.size();
    await this.run(kind === 'melt' || kind === 'white' || kind === 'black' ? 'dither' : kind, 1, 0, FILM_MOTION.wipe.open, ease.out, at);
    this.clear();
  }
}

/**
 * 장 제목 카드 (D-504 → D-510 ED-01): 먹 바탕 위 왕관 문장(몇째 왕관 장일 때 — crown-emblem-1~4) · 꼬리표(12 굵게) ·
 * 제목 명판(받은 title-card 9-slice — 옛 구분 줄 자리) 안의 제목(36, 좁으면 24) · 부제(15). 계단으로 차례로 서고 누르거나 머문 뒤 디더로 걷힌다
 */
export const titleCardHtml = (t: TitleCard): string =>
  `<div class="film-title tone-${t.tone ?? 'brass'}" role="status">${t.crown ? `<i class="ft-crown c${Math.max(1, Math.min(4, t.crown))}" aria-hidden="true"></i>` : ''}<p class="ft-kick">${t.kicker}</p><h2 class="ft-name">${t.title}</h2>${t.sub ? `<p class="ft-sub">${t.sub}</p>` : ''}</div>`;
export const showTitle = async (host: HTMLElement, t: TitleCard, skip: Promise<unknown>): Promise<void> => {
  host.querySelector('.film-title')?.remove();
  host.insertAdjacentHTML('beforeend', titleCardHtml(t));
  const el = host.querySelector<HTMLElement>('.film-title')!;
  // 카드가 서 있는 동안 빈 자막 띠는 걷는다 (빈 띠가 비어 보이지 않게)
  const root = host.closest<HTMLElement>('.prologue');
  root?.classList.add('titling');
  el.classList.add('in');
  await Promise.race([wait(calm() ? 1400 : FILM.titleHold), skip]);
  // 걷힘: 64단 디더 (D-554 — 옛 네 장 220ms)
  if (!calm()) await ditherTo(el, 1, 0, FILM_MOTION.title.out, ease.in);
  el.remove();
  root?.classList.remove('titling');
};

/** 화자 명패 (D-504 · #22): 초상 액자(DL-02 portrait-*) 안에 화자 얼굴 + 이름표(name-*). 우리 편 = 띠 왼쪽 · 적 · 도금왕 = 오른쪽 · NPC = 종이 꼬리표 */
export type PlateSide = 'ally' | 'foe' | 'gilded' | 'npc';
export const faceHtml = (f: Face | undefined): string => {
  if (!f) return '';
  if ('art' in f) return f.zoom
    ? `<i class="cw-crop" style="background-image:url('scenes/${f.art}.png');background-size:auto ${f.zoom}%;background-position:${f.at ?? '50% 50%'}"></i>`
    : `<img src="scenes/${f.art}.png" alt="" style="object-position:${f.at ?? '50% 24%'}">`;
  if ('portrait' in f) return portraitImg(f.portrait, pieceImg('K', 0, 'large', 72));
  return pieceImg(f.t, f.side, 'large', 72);
};
/** who가 비면 이름표 없이 얼굴만 (종이왕 속마음 — 독백은 이름표를 달지 않는다, voice.md ③) */
export const plateHtml = (who: string, side: PlateSide, face?: Face): string =>
  `<div class="cut-who cw-${side}${face ? '' : ' no-face'}${who ? '' : ' cw-mono'}" aria-hidden="true">${face ? `<span class="cw-face">${faceHtml(face)}</span>` : ''}${who ? `<b class="cw-name">${who}</b>` : ''}</div>`;
