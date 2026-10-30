import type Phaser from 'phaser';

/**
 * 도트 펜: 모든 도형을 "도트" 격자(타일 = 16도트)에 맞춰 사각 점으로 찍는다.
 * 매끈한 벡터 도형이 도트 기물과 어울리지 않는 문제(사용자 피드백)를 코드 이펙트 쪽에서 막는다.
 */
export class PixelPen {
  constructor(
    public g: Phaser.GameObjects.Graphics,
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
    this.g.fillStyle(color, alpha).fillRect(cx * d, cy * d, d * size, d * size);
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
