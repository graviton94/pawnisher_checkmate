/** 판 칸 하나의 도트 수 — 기물·판 칸·이펙트가 모두 같은 격자 (발주서 v2, D-042) */
export const BOARD_DOTS = 20;
/** 흐르는 화살표에서 밝은 토막이 한 칸 나아가는 시간 (ms) */
export const FLOW_STEP_MS = 70;

/**
 * 도트 펜: 모든 도형을 "도트" 격자(칸 = 20도트)에 맞춰 사각 점으로 찍는다.
 * 매끈한 벡터 도형이 도트 기물과 어울리지 않는 문제(사용자 피드백)를 코드 이펙트 쪽에서 막는다.
 */
/** 사각형만 칠할 수 있으면 된다 — Phaser Graphics, 캔버스 어댑터 모두 */
export interface RectSink {
  fillStyle(color: number, alpha?: number): unknown;
  fillRect(x: number, y: number, w: number, h: number): unknown;
}

export class PixelPen {
  constructor(
    public g: RectSink,
    /** 도트 한 칸의 화면 크기 (월드 px) */
    public dot: number,
  ) {}

  private cell(v: number): number {
    return Math.floor(v / this.dot);
  }

  /** 월드 좌표가 속한 도트 칸 하나 (size = 도트 수) */
  px(x: number, y: number, color: number, alpha = 1, size = 1): void {
    const d = this.dot;
    const cx = this.cell(x) - Math.floor((size - 1) / 2);
    const cy = this.cell(y) - Math.floor((size - 1) / 2);
    this.g.fillStyle(color, alpha);
    this.g.fillRect(cx * d, cy * d, d * size, d * size);
  }

  /**
   * 흐르는 도트 길 (D-052): 꺾은선 pts를 따라 흐린 바탕 줄 위로 밝은 도트 토막(3칸 켜짐 · 2칸 꺼짐)이
   * 끝 쪽으로 흘러간다 — 화살표가 "이쪽으로 간다"를 움직임으로 말한다. ms = 흐름 시계, 한 칸 지나는 데 FLOW_STEP_MS.
   */
  flow(pts: { x: number; y: number }[], color: number, ms: number, thick = 2, trackAlpha = 0.35): void {
    const d = this.dot;
    const cells: [number, number][] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / (d / 2)));
      for (let k = 0; k <= n; k++) {
        const c: [number, number] = [this.cell(a.x + ((b.x - a.x) * k) / n), this.cell(a.y + ((b.y - a.y) * k) / n)];
        const last = cells[cells.length - 1];
        if (!last || last[0] !== c[0] || last[1] !== c[1]) cells.push(c);
      }
    }
    const off = Math.floor((thick - 1) / 2);
    const phase = Math.floor(ms / FLOW_STEP_MS);
    this.g.fillStyle(color, trackAlpha);
    for (const [x, y] of cells) this.g.fillRect((x - off) * d, (y - off) * d, d * thick, d * thick);
    this.g.fillStyle(color, 1);
    cells.forEach(([x, y], i) => {
      if ((((i - phase) % 5) + 5) % 5 < 3) this.g.fillRect((x - off) * d, (y - off) * d, d * thick, d * thick);
    });
  }

  /** 도트 직선 (브레젠험) */
  line(x0: number, y0: number, x1: number, y1: number, color: number, alpha = 1, thick = 1, dashed = false): void {
    let ax = this.cell(x0);
    let ay = this.cell(y0);
    const bx = this.cell(x1);
    const by = this.cell(y1);
    const dx = Math.abs(bx - ax);
    const dy = -Math.abs(by - ay);
    const sx = ax < bx ? 1 : -1;
    const sy = ay < by ? 1 : -1;
    let err = dx + dy;
    const d = this.dot;
    const off = Math.floor((thick - 1) / 2);
    this.g.fillStyle(color, alpha);
    for (let i = 0; i < 400; i++) {
      if (!dashed || i % 2 === 0) this.g.fillRect((ax - off) * d, (ay - off) * d, d * thick, d * thick);
      if (ax === bx && ay === by) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        ax += sx;
      }
      if (e2 <= dx) {
        err += dx;
        ay += sy;
      }
    }
  }

  /** 도트 원 테두리 */
  ring(cx: number, cy: number, r: number, color: number, alpha = 1): void {
    const n = Math.max(8, Math.round((2 * Math.PI * r) / this.dot));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      this.px(cx + Math.cos(a) * r, cy + Math.sin(a) * r, color, alpha);
    }
  }

  /** 꽉 찬 도트 원 */
  disc(cx: number, cy: number, r: number, color: number, alpha = 1): void {
    const d = this.dot;
    const rc = Math.ceil(r / d);
    const c0x = this.cell(cx);
    const c0y = this.cell(cy);
    this.g.fillStyle(color, alpha);
    for (let y = -rc; y <= rc; y++)
      for (let x = -rc; x <= rc; x++) if ((x * d) ** 2 + (y * d) ** 2 <= r * r) this.g.fillRect((c0x + x) * d, (c0y + y) * d, d, d);
  }

  /** 도트 사각 테두리 (중심·반지름) */
  square(cx: number, cy: number, r: number, color: number, alpha = 1): void {
    this.line(cx - r, cy - r, cx + r, cy - r, color, alpha);
    this.line(cx + r, cy - r, cx + r, cy + r, color, alpha);
    this.line(cx + r, cy + r, cx - r, cy + r, color, alpha);
    this.line(cx - r, cy + r, cx - r, cy - r, color, alpha);
  }
}

/** 0~1 사이로 자른 구간 진행도 */
export const span = (p: number, a: number, b: number): number => Math.min(1, Math.max(0, (p - a) / (b - a)));
export const easeOut = (p: number): number => 1 - (1 - p) * (1 - p);

// 지수·로그형 곡선 — 선형 움직임 대신 "모았다가 터지는" 쾌감 (사용자 피드백, D-036)
export const easeOutCubic = (p: number): number => 1 - (1 - p) ** 3;
export const easeInCubic = (p: number): number => p * p * p;
export const easeInExpo = (p: number): number => (p <= 0 ? 0 : 2 ** (10 * p - 10));
export const easeOutExpo = (p: number): number => (p >= 1 ? 1 : 1 - 2 ** (-10 * p));
export const easeInOutExpo = (p: number): number => (p <= 0 ? 0 : p >= 1 ? 1 : p < 0.5 ? 2 ** (20 * p - 10) / 2 : (2 - 2 ** (-20 * p + 10)) / 2);
/** 살짝 넘쳤다 돌아오는 곡선 (착지 출렁임) */
export const easeOutBack = (p: number, c = 1.9): number => 1 + (c + 1) * (p - 1) ** 3 + c * (p - 1) ** 2;
