/**
 * 반장 내리찍기 · 2단계 판 표지 (D-690, 사용자: 「공격 이펙트 FX 좆구리고 · 1페이즈 2페이즈 제대로 구분 안 되고」).
 * 판 위 도트 층(boardfx.ts)이 프레임마다 부른다 — 1도트 = 3 CSS px, 위치는 프레임마다 정수 도트(D-595),
 * 단색 · 검은 선 · 단단한 그림자만: 디더 · 투명도 보간 · 그라데이션 없음(D-216 · D-675). 사라짐은 줄 단위로 잘려 나간다(계단).
 *
 * 반장마다 내리찍기 모양이 다르다 (박자 = BOSS_STRIKE: 예비 → 터짐 → 출렁):
 *  철갑 plate   = 갑판 내리찍기: 쇠 판이 칸 위로 들렸다(예비) 2프레임에 꽂히고 달아오른 테 · 쇳조각
 *  조립 spawn   = 조립 팔: 반장 몸에서 관절 팔이 뻗어 집게로 칸을 문다 · 초록 리벳 불꽃
 *  출하 thorns  = 컨베이어 상자: 나무 상자가 칸 단위 계단으로 실려 와 떨어져 부서진다
 *  검수 inspect = 렌즈 광선: 반장 렌즈에서 굵은 광선이 칸을 차례로 긋고 칸마다 불량 ✕ 도장
 *  자석 magnet  = 자력 끌림: 칸 둘레 N(붉음) · S(푸름) 테가 안으로 좁혀 들고 쇳가루가 빨려 든다
 *  경보 alarm   = 경보 파동: 반장에게서 붉은 ↔ 호박 사각 고리가 칸 단위로 퍼지고 칸이 줄무늬로 번쩍
 *  도금왕 gilded = 금박 붕괴: 금괴가 떨어져 칸 위에서 금 가며 무너지고 금 조각이 튄다
 */
import { hex, OUTLINE, PAL, WHITE, type Col, type Painter } from './pxfx';

export type StrikeRule = 'plate' | 'spawn' | 'thorns' | 'inspect' | 'magnet' | 'alarm' | 'gilded';
/** 칸 하나 (도트 좌표: 가운데 cx · cy, 칸 폭 td) */
export interface StrikeCell { cx: number; cy: number }
export interface StrikeShape { rule: StrikeRule; from: { x: number; y: number }; cells: StrikeCell[]; td: number; rage: boolean }

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));
const easeOut = (x: number): number => 1 - (1 - clamp01(x)) ** 3;
const easeIn = (x: number): number => clamp01(x) ** 3;
/** 박자 구간: 예비 [0, WIND) · 터짐 [WIND, HIT) · 출렁/정리 [HIT, 1] */
export const WIND = 0.38, HIT = 0.5;
/** 칸마다 엇박 (앞 칸부터 차례로) — 전체 길이의 비율 */
const STAG = 0.05;
const R = Math.round;

/** 테 두른 단색 상자 (왼위 빛 · 오른아래 그늘 — 빛 공식) */
const box = (p: Painter, x: number, y: number, w: number, h: number, base: Col, hi: Col, lo: Col): void => {
  x = R(x); y = R(y); w = R(w); h = R(h);
  if (w < 3 || h < 3) return;
  p.rect(x + 1, y + 1, w, h, OUTLINE); // 단단한 그림자 1도트
  p.rect(x, y, w, h, OUTLINE);
  p.rect(x + 1, y + 1, w - 2, h - 2, base);
  p.rect(x + 1, y + 1, w - 2, 1, hi);
  p.rect(x + 1, y + 1, 1, h - 2, hi);
  p.rect(x + 1, y + h - 2, w - 2, 1, lo);
  p.rect(x + w - 2, y + 2, 1, h - 3, lo);
};
/** 굵은 선 (먹 테 + 속 색) */
const bar = (p: Painter, x0: number, y0: number, x1: number, y1: number, c: Col, thick = 2): void => {
  for (let o = -1; o <= thick; o++) p.line(R(x0) + o, R(y0) + 1, R(x1) + o, R(y1) + 1, OUTLINE);
  for (let o = 0; o < thick; o++) p.line(R(x0) + o, R(y0), R(x1) + o, R(y1), c);
};
/** 칸 테 (두께 th) */
const frame = (p: Painter, cx: number, cy: number, half: number, c: Col, th = 1): void => {
  const x = R(cx - half), y = R(cy - half), s = R(half * 2);
  p.rect(x, y, s, th, c); p.rect(x, y + s - th, s, th, c); p.rect(x, y, th, s, c); p.rect(x + s - th, y, th, s, c);
};
/** ✕ 도장 (먹 테) */
const cross = (p: Painter, cx: number, cy: number, n: number, c: Col): void => {
  cx = R(cx); cy = R(cy);
  for (let i = -n; i <= n; i++) for (const [x, y] of [[cx + i, cy + i], [cx + i, cy - i]]) { p.px(x + 1, y, OUTLINE); p.px(x, y + 1, OUTLINE); p.px(x + 1, y + 1, OUTLINE); }
  for (let i = -n; i <= n; i++) { p.px(cx + i, cy + i, c); p.px(cx + i, cy - i, c); }
};

/** 칸 i의 지역 박자 (0~1) — 앞 칸부터 엇박 */
const local = (k: number, i: number, n: number): number => clamp01((k - i * STAG) / Math.max(0.3, 1 - (n - 1) * STAG));

/**
 * 내리찍기 한 장 (k = 0~1 진행). 터지는 순간(HIT 넘을 때)의 불똥 · 흔들림은 boardfx가 따로 낸다(burst 콜백).
 */
export const drawStrike = (p: Painter, s: StrikeShape, k: number): void => {
  const { td, cells, from } = s;
  const half = Math.floor(td / 2) - 1;
  const hot = s.rage ? PAL.blood : null;
  cells.forEach((c, i) => {
    const q = local(k, i, cells.length);
    if (q <= 0) return;
    // 정리 구간: 위에서부터 줄째 잘려 나간다 (디더 · 투명도 없이 계단으로) — cut = 남은 아래 비율
    const cut = q < 0.8 ? 1 : 1 - (q - 0.8) / 0.2;
    const clipTop = R(c.cy - half + (1 - cut) * half * 2);
    const keep = (y: number): boolean => y >= clipTop;
    const P = new Proxy(p, { get: (t, key) => (key === 'put' ? (x: number, y: number, col: Col, a?: number) => keep(Math.floor(y)) && t.put(x, y, col, a) : (t as never)[key]) }) as Painter;
    switch (s.rule) {
      case 'plate': {
        // 쇠 판: 예비 = 칸 위 0.6td → 0.9td로 천천히 들림, 터짐 = 2프레임 만에 꽂힘, 출렁 = 1도트 튀었다 앉음
        const lift = q < WIND ? 0.6 + 0.3 * easeIn(q / WIND) : q < HIT ? 0.9 * (1 - easeIn((q - WIND) / (HIT - WIND))) : q < 0.58 ? -1 / td : 0;
        const y = c.cy - half - lift * td;
        const w = half * 2 + (q >= HIT && q < 0.56 ? 2 : 0);
        box(P, c.cx - w / 2, y, w, half * 2, PAL.steel[4], PAL.steel[6], PAL.steel[2]);
        // 리벳 넷
        for (const [dx, dy] of [[2, 2], [w - 3, 2], [2, half * 2 - 3], [w - 3, half * 2 - 3]]) P.px(R(c.cx - w / 2 + dx), R(y + dy), PAL.steel[7]);
        if (q >= HIT) frame(P, c.cx, c.cy, half + 1, (hot ?? PAL.fire)[q < 0.62 ? 6 : 4], q < 0.62 ? 2 : 1);
        break;
      }
      case 'spawn': {
        // 조립 팔: 어깨(반장) → 팔꿈치 → 집게. 예비 = 팔이 뒤로 접힘, 터짐 = 쭉 뻗음(빠르게→느리게), 출렁 = 집게가 1도트 물고 흔들림 · 되감김
        const reach = q < WIND ? -0.15 * easeOut(q / WIND) : q < HIT ? -0.15 + 1.15 * easeOut((q - WIND) / (HIT - WIND)) : q < 0.8 ? 1 : 1 - easeIn((q - 0.8) / 0.2);
        const tx = from.x + (c.cx - from.x) * reach, ty = from.y + (c.cy - from.y) * reach;
        const ex = (from.x + tx) / 2 + (ty - from.y) * 0.25, ey = (from.y + ty) / 2 - Math.abs(tx - from.x) * 0.25 - 2;
        const col = hot ? hot[5] : PAL.toxic[5];
        bar(P, from.x, from.y, ex, ey, PAL.steel[5], 2);
        bar(P, ex, ey, tx, ty, PAL.steel[6], 2);
        box(P, ex - 2, ey - 2, 5, 5, col, PAL.toxic[6], PAL.toxic[3]);
        // 집게: 벌렸다(예비 · 뻗는 중) 문다(터짐 뒤)
        const open = q < HIT ? 3 : q < 0.56 ? 1 : 0;
        bar(P, tx - 2 - open, ty - 3, tx - 1, ty + 2, PAL.steel[7], 1);
        bar(P, tx + 2 + open, ty - 3, tx + 1, ty + 2, PAL.steel[7], 1);
        if (q >= HIT && q < 0.8) frame(P, c.cx, c.cy, half, col, q < 0.6 ? 2 : 1);
        break;
      }
      case 'thorns': {
        // 컨베이어 상자: 반장 쪽에서 칸을 향해 칸 단위 계단(4도트씩)으로 실려 오다 떨어져 부서진다
        const lane = q < HIT ? easeOut(q / HIT) : 1;
        const stepPx = 4, d = Math.hypot(c.cx - from.x, c.cy - from.y) || 1;
        const along = Math.floor((lane * d) / stepPx) * stepPx;
        const bx = from.x + ((c.cx - from.x) / d) * along, by = from.y + ((c.cy - from.y) / d) * along;
        const sz = Math.max(6, R(td * 0.62));
        if (q < 0.6) {
          const drop = q >= HIT ? R(((q - HIT) / 0.1) * 2) : 0;
          box(P, bx - sz / 2, by - sz / 2 - 2 + drop, sz, sz, PAL.wood[4], PAL.wood[6], PAL.wood[2]);
          P.line(R(bx - sz / 2 + 1), R(by - sz / 2 - 1 + drop), R(bx + sz / 2 - 2), R(by + sz / 2 - 4 + drop), PAL.wood[2]);
          // 운반 줄 (롤러 눈금이 칸 단위로 흐른다)
          for (let t = 0; t < along; t += stepPx * 2) P.px(R(from.x + ((c.cx - from.x) / d) * t), R(from.y + ((c.cy - from.y) / d) * t) + R(sz / 2), PAL.steel[5]);
        } else {
          // 부서진 판자 넷이 칸 둘레로 벌어져 눕는다
          const o = R(easeOut((q - 0.6) / 0.2) * half);
          for (const [dx, dy, w, h] of [[-o - 3, -2, 6, 2], [o - 2, -3, 6, 2], [-2, o - 1, 2, 5], [-1, -o - 4, 2, 5]]) box(P, c.cx + dx, c.cy + dy, w + 1, h + 1, PAL.wood[4], PAL.wood[5], PAL.wood[2]);
          frame(P, c.cx, c.cy, half, (hot ?? PAL.blood)[5], 1);
        }
        break;
      }
      case 'inspect': {
        // 렌즈 광선: 반장 렌즈(고리) → 칸까지 3도트 굵기 광선이 그어진다, 칸에 닿으면 테 · ✕ 도장
        const draw = q < WIND ? 0 : q < HIT ? easeOut((q - WIND) / (HIT - WIND)) : q < 0.8 ? 1 : 0;
        const col = hot ? hot[6] : PAL.teal[6], core = WHITE;
        if (q < 0.8) {
          // 렌즈 (예비 = 테가 1 → 4도트로 커짐)
          const r = q < WIND ? 1 + R(3 * easeOut(q / WIND)) : 4;
          P.rect(R(from.x - r - 1), R(from.y - r - 1), r * 2 + 3, r * 2 + 3, OUTLINE);
          P.rect(R(from.x - r), R(from.y - r), r * 2 + 1, r * 2 + 1, col);
          P.rect(R(from.x - r + 1), R(from.y - r + 1), r * 2 - 1, r * 2 - 1, PAL.teal[3]);
          P.px(R(from.x - r + 1), R(from.y - r + 1), core);
        }
        if (draw > 0) {
          const tx = from.x + (c.cx - from.x) * draw, ty = from.y + (c.cy - from.y) * draw;
          bar(P, from.x, from.y, tx, ty, col, 3);
          P.line(R(from.x) + 1, R(from.y), R(tx) + 1, R(ty), core);
        }
        if (q >= HIT) {
          frame(P, c.cx, c.cy, half, col, 1);
          cross(P, c.cx, c.cy, q < 0.56 ? 4 : 3, (hot ?? PAL.blood)[5]);
        }
        break;
      }
      case 'magnet': {
        // 자력: 칸 둘레 사각 테 셋이 바깥(1.4td)에서 안으로 좁혀 든다(점점 빠르게) — 위아래 반은 N 붉음 · S 푸름. 터지면 칸 테가 철컥
        const shrink = q < HIT ? easeIn(q / HIT) : 1;
        const N = (hot ?? PAL.blood)[5], S = hex('#38bdf8');
        for (let j = 0; j < 3; j++) {
          const r = R(half + (td * 0.7 - j * 3) * (1 - shrink));
          if (q >= HIT && j > 0) continue;
          const x = R(c.cx - r), y = R(c.cy - r), w = r * 2;
          P.rect(x, y, w, 1, N); P.rect(x, y, 1, r, N); P.rect(x + w - 1, y, 1, r, N);
          P.rect(x, y + w - 1, w, 1, S); P.rect(x, y + r, 1, r, S); P.rect(x + w - 1, y + r, 1, r, S);
        }
        if (q >= HIT && q < 0.8) frame(P, c.cx, c.cy, half - 1, PAL.steel[7], q < 0.58 ? 2 : 1);
        break;
      }
      case 'alarm': {
        // 경보 파동: 반장에게서 사각 고리가 칸 단위로 퍼진다(칸 하나씩 뛰어 — 계단), 반 박자마다 붉음 ↔ 호박. 칸은 줄무늬로 번쩍
        const ringN = Math.floor(clamp01(q / HIT) * 6);
        if (q < HIT && i === 0) {
          for (let j = 1; j <= ringN; j++) {
            const r = R(j * td * 0.6), c2 = j % 2 ? PAL.blood[5] : hex('#facc15');
            frame(P, from.x, from.y, r, OUTLINE, 3);
            frame(P, from.x, from.y, r - 1, c2, 2);
          }
        }
        if (q >= HIT && q < 0.8) {
          const on = Math.floor((q - HIT) / 0.05) % 2 === 0;
          const x0 = R(c.cx - half), y0 = R(c.cy - half), w = half * 2;
          for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) if (x === 0 || y === 0 || x === w - 1 || y === w - 1 || ((x + y + (on ? 0 : 3)) % 6 < 2 && (x < 3 || y < 3 || x > w - 4 || y > w - 4))) P.px(x0 + x, y0 + y, on ? PAL.blood[5] : hex('#facc15'));
        }
        break;
      }
      case 'gilded': {
        // 금박 붕괴: 금괴가 위에서 떨어져(점점 빠르게) 칸에 박히고, 금이 가며 아래로 두 단 무너진다
        const fall = q < HIT ? easeIn(q / HIT) : 1;
        const y = c.cy - half - (1 - fall) * td * 1.4;
        if (q < 0.6) box(P, c.cx - half, y, half * 2, R(half * 1.2), PAL.gold[4], PAL.gold[6], PAL.gold[2]);
        else {
          const sink = R(easeOut((q - 0.6) / 0.2) * 3);
          box(P, c.cx - half, y + sink, half, R(half * 1.2) - sink, PAL.gold[4], PAL.gold[5], PAL.gold[2]);
          box(P, c.cx, y + sink * 2, half, R(half * 1.2) - sink * 2, PAL.gold[3], PAL.gold[5], PAL.gold[1]);
          P.line(R(c.cx), R(y), R(c.cx) - 2, R(y + half), OUTLINE);
        }
        if (q >= HIT) frame(P, c.cx, c.cy, half, (hot ?? PAL.gold)[5], q < 0.58 ? 2 : 1);
        break;
      }
    }
  });
};

/** 터지는 순간 불똥 색 (반장마다) */
export const strikeSpark = (rule: StrikeRule, rage: boolean): Col =>
  rage ? PAL.blood[6] : rule === 'spawn' ? PAL.toxic[6] : rule === 'inspect' ? PAL.teal[6] : rule === 'magnet' ? hex('#b89cf0') : rule === 'alarm' ? hex('#facc15') : rule === 'gilded' ? PAL.gold[5] : rule === 'thorns' ? PAL.wood[6] : PAL.fire[6];

/**
 * 2단계 판 표지 (D-690 — 지속): 판 둘레 진홍 · 먹 사선 경고 띠(120ms마다 1도트 흐름), 반장 몸 둘레 진홍 꺾쇠(240ms마다 1도트 숨쉼),
 * 2단계 예고 칸 = 안으로 물리는 진홍 꺾쇠 (1단계의 빗금 예고와 다른 모양). 칸 속은 덮지 않는다 — 기물 · 과녁 대비 유지.
 */
export const drawRage = (p: Painter, t: number, B: { x0: number; y0: number; x1: number; y1: number }, boss: { x0: number; y0: number; x1: number; y1: number } | null, aim: StrikeCell[], td: number, still: boolean): void => {
  const f = still ? 0 : Math.floor(t / 0.12);
  // 판 둘레 띠: 판 칸 바깥 3도트 (캔버스 밖이면 잘린다)
  const x0 = R(B.x0) - 4, y0 = R(B.y0) - 4, x1 = R(B.x1) + 3, y1 = R(B.y1) + 3;
  const stripe = (x: number, y: number): void => p.px(x, y, (x + y + f) % 6 < 3 ? PAL.blood[4] : OUTLINE);
  for (let x = x0; x <= x1; x++) for (let d = 0; d < 3; d++) { stripe(x, y0 + d); stripe(x, y1 - d); }
  for (let y = y0; y <= y1; y++) for (let d = 0; d < 3; d++) { stripe(x0 + d, y); stripe(x1 - d, y); }
  p.rect(x0 + 3, y0 + 3, x1 - x0 - 5, 1, OUTLINE); p.rect(x0 + 3, y1 - 3, x1 - x0 - 5, 1, OUTLINE);
  p.rect(x0 + 3, y0 + 3, 1, y1 - y0 - 5, OUTLINE); p.rect(x1 - 3, y0 + 3, 1, y1 - y0 - 5, OUTLINE);
  // 반장 꺾쇠
  if (boss) {
    const o = still ? 1 : Math.floor(t / 0.24) % 2, L = 5;
    const bx0 = R(boss.x0) - 1 - o, by0 = R(boss.y0) - 1 - o, bx1 = R(boss.x1) + o, by1 = R(boss.y1) + o;
    for (const [cx, cy, sx, sy] of [[bx0, by0, 1, 1], [bx1, by0, -1, 1], [bx0, by1, 1, -1], [bx1, by1, -1, -1]] as const) {
      for (let i = 0; i < L; i++) for (let w = 0; w < 2; w++) { p.px(cx + sx * i, cy + sy * w, PAL.blood[5]); p.px(cx + sx * w, cy + sy * i, PAL.blood[5]); }
      p.px(cx + sx * L, cy, OUTLINE); p.px(cx, cy + sy * L, OUTLINE);
    }
  }
  // 2단계 예고 칸: 꺾쇠가 바깥 → 안으로 세 계단 물렸다 풀린다
  const bite = still ? 1 : [0, 1, 2, 1][Math.floor(t / 0.16) % 4];
  const half = Math.floor(td / 2) - 1;
  for (const c of aim) {
    const x0c = R(c.cx - half) + bite, y0c = R(c.cy - half) + bite, x1c = R(c.cx + half) - 1 - bite, y1c = R(c.cy + half) - 1 - bite, L = 3;
    for (const [cx, cy, sx, sy] of [[x0c, y0c, 1, 1], [x1c, y0c, -1, 1], [x0c, y1c, 1, -1], [x1c, y1c, -1, -1]] as const)
      for (let i = 0; i <= L; i++) { p.px(cx + sx * i, cy, PAL.blood[6]); p.px(cx, cy + sy * i, PAL.blood[6]); p.px(cx + sx * i, cy + sy, OUTLINE); p.px(cx + sx, cy + sy * i, OUTLINE); }
  }
};
