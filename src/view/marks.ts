import type { Side } from '../engine';
import type { PixelPen } from './pixel';
import { cbAid } from '../prefs/fx';

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

/** 잃을 HP 위 흰 반짝임이 지금 서 있는 속 칸 (-9 = 없음) — 같은 값이면 게이지 그림도 같다 (D-533 프레임 건너뛰기) */
export const gaugeSweep = (hp: number, after: number, max: number, ms: number, n = 12): number => {
  if (ms < 0) return -9;
  const keep = Math.round((n * Math.max(0, after)) / max);
  const cur = Math.round((n * Math.max(0, hp)) / max);
  return Math.floor(cur - 1 - ((ms % LOSE_SWEEP_MS) / LOSE_SWEEP_MS) * (cur - keep + 2));
};

/**
 * HP 게이지 14×4 도트 (D-054·D-055): 검정 테두리(모서리 비움) + 12×2 채움(밝은 줄 + 그늘 줄).
 * (x, y) = 게이지 왼쪽 위. 잃을 HP는 금색, ms를 주면 흰 반짝임이 훑는다.
 */
/** n = 속 칸 수 (기본 12 — 2×2 보스는 넓게, D-513) · rows = 채움 줄 수 (기본 2 — 적 기물은 4, D-624: 위 절반 밝은 줄 · 아래 절반 그늘 줄) */
export const drawGauge = (pen: PixelPen, x: number, y: number, side: Side, hp: number, after: number, max: number, ms = -1, n = 12, rows = 2): void => {
  const d = pen.dot;
  const cell = (i: number, j: number, c: number) => pen.px(x + i * d + d / 2, y + j * d + d / 2, c, 1, 1);
  for (let i = 1; i < n + 1; i++) {
    cell(i, 0, 0x0b0b0e);
    cell(i, rows + 1, 0x0b0b0e);
  }
  for (let j = 1; j <= rows; j++) {
    cell(0, j, 0x0b0b0e);
    cell(n + 1, j, 0x0b0b0e);
  }
  const keep = Math.round((n * Math.max(0, after)) / max);
  const cur = Math.round((n * Math.max(0, hp)) / max);
  const sweep = gaugeSweep(hp, after, max, ms, n);
  for (let i = 0; i < n; i++) {
    const lose = i >= keep && i < cur;
    const kind = lose ? 'lose' : i < keep ? (side === 0 ? 'a' : 'e') : 'empty';
    const [top, low] = GAUGE[kind];
    // 색 보조 (D-539): 적 게이지는 밝은 줄 · 그늘 줄을 한 칸씩 엇갈려 체크 무늬 — 우리 편(줄무늬 없음)과 색 없이도 갈린다
    const chk = kind === 'e' && cbAid() && i % 2 === 1;
    for (let j = 1; j <= rows; j++) {
      const upper = j <= rows / 2;
      cell(1 + i, j, upper && lose && i === sweep ? 0xf4f1ea : upper !== chk ? top : low);
    }
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

/**
 * 색 보조 빗금 (D-539): 칸(t = 20도트) 위에 오른쪽 아래로 내려가는 1도트 사선을 4도트마다 — 적 위협 · 적 공격 범위 칸을
 * 붉은색 없이도 알아보게(색약). 새 그림 없이 판 표식 문법(코드로 찍는 도트, D-044)으로만. (x, y) = 칸 왼쪽 위
 */
export const drawHatch = (pen: PixelPen, x: number, y: number, color = 0x0b0b0e, alpha = 0.55): void => {
  const d = pen.dot;
  for (let j = 0; j < 20; j++) for (let i = 0; i < 20; i++) if ((i - j + 40) % 4 === 0) pen.px(x + i * d + d / 2, y + j * d + d / 2, color, alpha, 1);
};
