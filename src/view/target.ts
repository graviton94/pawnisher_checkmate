import { easeOutBack, type PixelPen } from './pixel';

/**
 * 톱니 과녁 (D-062): 태엽처럼 "철컥철컥" 도는 톱니 고리를 판 도트 격자에 그때그때 찍는다.
 * 그림을 돌리면 도트가 깨지므로, 톱니 위치(위상)만 돌려 고리를 다시 계산한다.
 * 0.32초마다 톱니 1/4칸씩 시계 방향으로 튕기듯(살짝 지나쳤다 제자리) 넘어간다.
 */

/** 톱니 과녁 색: 고리 · 안쪽 그늘 */
export const TARGET_COLORS = {
  ally: [0x38bdf8, 0x1e6e94],
  kill: [0xfacc15, 0x8c6239],
  enemy: [0xe5262f, 0x7a1218],
} as const;

/** 과녁 박자 (ms): 한 번 넘어가는 간격 · 넘어가는 순간의 길이 */
export const TARGET_TICK = { every: 320, snap: 80 };

const SIZE = 15;
const TEETH = 8;

/**
 * 과녁 한 장면: (cx, cy) = 칸 가운데(월드 px), ms = 흐름 시계 (멈춘 과녁은 0을 준다).
 * 고리 반지름 4.4~6.2도트, 톱니 8개(1.4도트), 안쪽 한 겹은 그늘 — tools/draw-board.py의 target()과 같은 모양.
 */
export const drawGearTarget = (pen: PixelPen, cx: number, cy: number, kind: keyof typeof TARGET_COLORS, ms: number): void => {
  const [main, shade] = TARGET_COLORS[kind];
  const n = Math.floor(ms / TARGET_TICK.every);
  const t = ms - n * TARGET_TICK.every;
  const step = n + (t < TARGET_TICK.snap ? easeOutBack(t / TARGET_TICK.snap) : 1);
  const phase = (step * 0.25) / TEETH; // 바퀴 단위 (시계 방향)
  const d = pen.dot;
  const x0 = Math.floor(cx / d) - (SIZE - 1) / 2;
  const y0 = Math.floor(cy / d) - (SIZE - 1) / 2;
  const c = (SIZE - 1) / 2;
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      const r = Math.hypot(x - c, y - c);
      let on = r >= 4.4 && r <= 6.2;
      if (r > 6.2 && r <= 7.6) {
        const k = ((((Math.atan2(y - c, x - c) / (2 * Math.PI) - phase) * TEETH) % 1) + 1) % 1;
        on = k < 0.28 || k > 0.72;
      }
      if (on) pen.px((x0 + x) * d + d / 2, (y0 + y) * d + d / 2, r < 5.1 ? shade : main);
    }
};
