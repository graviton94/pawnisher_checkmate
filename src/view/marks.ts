import type { Side } from '../engine';
import type { PixelPen } from './pixel';

/**
 * 판 위 표식 중 코드가 그때그때 찍는 것 (FX 랩에서 고른 그림, D-046·D-047·D-052·D-054·D-055).
 * 좌표는 월드 px, 도트 크기는 pen.dot (칸 = 20도트).
 */

/** 흐르는 화살표 + 도트 화살촉 (나이트는 ㄱ자). a·b = 칸 가운데 */
export const drawArrow = (pen: PixelPen, a: { x: number; y: number }, b: { x: number; y: number }, knight: boolean, color: number, ms: number, alpha = 1): void => {
  const d = pen.dot;
  const t = d * 20;
  const pts = [a];
  if (knight) pts.push(Math.abs(b.x - a.x) > t * 1.5 ? { x: b.x, y: a.y } : { x: a.x, y: b.y });
  const last = pts[pts.length - 1];
  const len = Math.hypot(b.x - last.x, b.y - last.y) || 1;
  const ux = (b.x - last.x) / len;
  const uy = (b.y - last.y) / len;
  const tip = { x: b.x - ux * t * 0.32, y: b.y - uy * t * 0.32 };
  pts.push(tip);
  pen.flow(pts, color, ms, 2, 0.35 * alpha, alpha);
  // 화살촉: 뒤로 갈수록 넓어지는 도트 줄
  for (let k = 0; k < 4; k++) {
    const bx = tip.x - ux * d * k;
    const by = tip.y - uy * d * k;
    for (let s = -k; s <= k; s++) pen.px(bx - uy * d * s, by + ux * d * s, color, alpha, 1);
  }
};

/** HP 게이지 색: 밝은 줄 · 그늘 줄 */
const GAUGE: Record<'a' | 'e' | 'lose' | 'empty', [number, number]> = {
  a: [0x38bdf8, 0x1e6e94],
  e: [0xe5262f, 0x7a1218],
  lose: [0xfacc15, 0xc89b3c],
  empty: [0x2f2e36, 0x16141c],
};
/** 잃을 HP 위를 흰 반짝임 한 칸이 오른쪽→왼쪽으로 훑는 주기 (ms) */
export const LOSE_SWEEP_MS = 1600;

/**
 * HP 게이지 14×4 도트 (D-054·D-055): 검정 테두리(모서리 비움) + 12×2 채움(밝은 줄 + 그늘 줄).
 * (x, y) = 게이지 왼쪽 위. 잃을 HP는 금색, ms를 주면 흰 반짝임이 훑는다.
 */
export const drawGauge = (pen: PixelPen, x: number, y: number, side: Side, hp: number, after: number, max: number, ms = -1): void => {
  const d = pen.dot;
  const cell = (i: number, j: number, c: number) => pen.px(x + i * d + d / 2, y + j * d + d / 2, c, 1, 1);
  for (let i = 1; i < 13; i++) {
    cell(i, 0, 0x0b0b0e);
    cell(i, 3, 0x0b0b0e);
  }
  for (const j of [1, 2]) {
    cell(0, j, 0x0b0b0e);
    cell(13, j, 0x0b0b0e);
  }
  const keep = Math.round((12 * Math.max(0, after)) / max);
  const cur = Math.round((12 * Math.max(0, hp)) / max);
  const sweep = ms < 0 ? -9 : Math.floor(cur - 1 - ((ms % LOSE_SWEEP_MS) / LOSE_SWEEP_MS) * (cur - keep + 2));
  for (let i = 0; i < 12; i++) {
    const lose = i >= keep && i < cur;
    const [top, low] = GAUGE[lose ? 'lose' : i < keep ? (side === 0 ? 'a' : 'e') : 'empty'];
    cell(1 + i, 1, lose && i === sweep ? 0xf4f1ea : top);
    cell(1 + i, 2, low);
  }
};

/** 갈 수 있는 칸 점과 같은 4×4 도트 방울 (색만 바꿔 적 위협 이동 칸에) — (cx, cy) = 칸 가운데 */
export const drawDropDot = (pen: PixelPen, cx: number, cy: number, color: number, hi = 0xf4f1ea): void => {
  const d = pen.dot;
  const rows = ['.cc.', 'cwcc', 'cccc', '.cc.'];
  rows.forEach((r, j) =>
    [...r].forEach((ch, i) => {
      if (ch !== '.') pen.px(cx + (i - 2) * d + d / 2, cy + (j - 2) * d + d / 2, ch === 'w' ? hi : color, 1, 1);
    }),
  );
};
