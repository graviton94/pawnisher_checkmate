/**
 * 도트 부품 정본 (D-259 「주물 공방 문법」, docs/design-system.md).
 * 화면의 모든 물건은 이 재질 · 이 빛 공식으로만 찍는다 — 장치(판정기 · 봉인판 · 소품)와 판결 명패가 같은 손에서 나오게.
 *  - 재질: 철(구조) · 황동(손댈 것 · 보상) · 쇳물(위험 · 힘) · 종이(글 · 주인공) · 녹(쇠락 · 손해)
 *  - 빛 공식: 1도트 먹 테 → 왼위 가장자리 +2단 → 몸 → 오른아래 가장자리 −1단 → 바닥에 먹 그림자(오른아래 1~2도트, 반투명 없음)
 *  - 결과 알림은 오직 `verdict()` 하나: 철 테 + 황동(좋음) / 녹슨 쇠(나쁨) 판에 갈무리 글씨를 새긴다
 */

export type Ramp = readonly string[];
/** 재질 램프 (어두움 → 밝음, 7단) */
export const M = {
  iron: ['#14131a', '#1f1e27', '#2c2d38', '#41434f', '#5d606d', '#868a98', '#b9bdc8'],
  brass: ['#2b1a06', '#5a3a0e', '#8a5a14', '#b98424', '#d9a838', '#f4d27a', '#fff1c0'],
  molten: ['#3a0c06', '#7a1c08', '#c23a0c', '#ec6a1a', '#f8a03a', '#ffd27a', '#fff6d8'],
  paper: ['#3a3328', '#6e6452', '#a39a84', '#cfc6ae', '#e8e0cc', '#f4f1ea', '#ffffff'],
  rust: ['#24110b', '#4a2112', '#74361a', '#9a4c22', '#c06a30', '#e0904a', '#f4b47a'],
  crimson: ['#2a0608', '#5a0c12', '#9a141e', '#c81e28', '#e5262f', '#ff6b6b', '#ffc0c0'],
  teal: ['#06222a', '#0e4650', '#1e6e78', '#2e969c', '#46c4c8', '#8ee8ea', '#d8fafa'],
} as const;
/** 먹 (테 · 그림자) */
export const INK = '#0b0b0e';

type X = CanvasRenderingContext2D;
const f = (x: X, c: string, a: number, b: number, w: number, h: number) => { if (w > 0 && h > 0) { x.fillStyle = c; x.fillRect(Math.round(a), Math.round(b), Math.round(w), Math.round(h)); } };
export const fill = f;

/** 덩어리 하나: 먹 테 · 왼위 빛 · 오른아래 그늘 · (그림자) — 모든 물건의 기본 */
export const block = (x: X, a: number, b: number, w: number, h: number, r: Ramp, o: { mid?: number; shadow?: number; outline?: boolean } = {}) => {
  const m = o.mid ?? 3;
  if (o.shadow) f(x, INK, a + o.shadow, b + o.shadow, w + 1, h + 1);
  if (o.outline !== false) f(x, INK, a - 1, b - 1, w + 2, h + 2);
  f(x, r[m], a, b, w, h);
  f(x, r[Math.min(6, m + 2)], a, b, w, 1);
  f(x, r[Math.min(6, m + 1)], a, b + 1, 1, h - 1);
  f(x, r[Math.max(0, m - 1)], a, b + h - 1, w, 1);
  f(x, r[Math.max(0, m - 1)], a + w - 1, b + 1, 1, h - 1);
};

/** 3/4 시점 덩어리: 위 면(밝게) + 앞 면 — 기계 · 상자처럼 부피가 있는 물건 */
export const box3 = (x: X, a: number, b: number, w: number, h: number, top: number, r: Ramp, o: { shadow?: number } = {}) => {
  if (o.shadow) f(x, INK, a + o.shadow, b + o.shadow, w + 1, h + 1);
  f(x, INK, a - 1, b - 1, w + 2, h + 2);
  f(x, r[4], a, b, w, top);
  f(x, r[6], a, b, w, 1);
  f(x, r[2], a, b + top, w, 1);
  block(x, a, b + top + 1, w, h - top - 1, r, { outline: false });
};

/** 리벳 (3×3, 빛 왼위) */
export const rivet = (x: X, a: number, b: number, r: Ramp = M.iron) => { f(x, INK, a, b, 3, 3); f(x, r[5], a, b, 2, 2); f(x, r[6], a, b, 1, 1); f(x, r[2], a + 2, b + 2, 1, 1); };

/** 둥근 유리 등 (반지름 r): 꺼짐은 어두운 유리 + 반사 한 점, 켜짐은 램프 색 + 흰 심 */
export const lamp = (x: X, cx: number, cy: number, rad: number, on: Ramp | null) => {
  for (let yy = -rad - 1; yy <= rad + 1; yy++)
    for (let xx = -rad - 1; xx <= rad + 1; xx++) {
      const d = Math.hypot(xx, yy);
      if (d <= rad + 0.5) f(x, d > rad - 0.5 ? INK : on ? (d < rad * 0.45 ? on[6] : d < rad * 0.8 ? on[5] : on[4]) : d < rad * 0.6 ? '#2a2c36' : '#1f1e27', cx + xx, cy + yy, 1, 1);
    }
  f(x, '#ffffff', cx - Math.ceil(rad / 2), cy - Math.ceil(rad / 2), 1, 1);
};

/** 갈무리 글씨를 도트로 (알파 문턱 → 단색) · 먹 테 1도트 · 새김(아래 1도트 밝은 줄)
 *  px: 12(갈무리11 굵게) 배수만 — 캔버스 1도트 = 글씨 1px이므로 화면에서는 도트 배율만큼 커진다 */
export const pixelText = (x: X, text: string, cx: number, top: number, col: string, o: { px?: number; under?: string; outline?: string } = {}) => {
  const px = o.px ?? 12;
  const c = document.createElement('canvas');
  const w = Math.ceil(px * text.length * 1.1) + 4;
  c.width = w; c.height = px + 6;
  const g = c.getContext('2d')!;
  g.font = `700 ${px}px Galmuri11`;
  g.textBaseline = 'top';
  g.fillStyle = '#fff';
  const tw = Math.ceil(g.measureText(text).width);
  g.fillText(text, 2, 2);
  const id = g.getImageData(0, 0, w, c.height);
  const on = (i: number, j: number) => i >= 0 && j >= 0 && i < w && j < c.height && id.data[(j * w + i) * 4 + 3] > 110;
  const ox = Math.round(cx - tw / 2) - 2, oy = top - 2;
  if (o.outline) for (let j = 0; j < c.height; j++) for (let i = 0; i < w; i++) if (!on(i, j) && (on(i - 1, j) || on(i + 1, j) || on(i, j - 1) || on(i, j + 1))) f(x, o.outline, ox + i, oy + j, 1, 1);
  if (o.under) for (let j = 0; j < c.height; j++) for (let i = 0; i < w; i++) if (on(i, j) && !on(i, j + 1)) f(x, o.under, ox + i, oy + j + 1, 1, 1);
  for (let j = 0; j < c.height; j++) for (let i = 0; i < w; i++) if (on(i, j)) f(x, col, ox + i, oy + j, 1, 1);
  return tw;
};

/** 4×4 베이어 */
const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export const bay = (a: number, b: number) => BAY[((b & 3) << 2) | (a & 3)] / 16;

const calm = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
let fontReady: Promise<unknown> | null = null;
const fonts = () => (fontReady ??= document.fonts?.load('700 12px Galmuri11').catch(() => null) ?? Promise.resolve());

export type VerdictKind = 'good' | 'bad' | 'gold';
/**
 * 판결 명패 — 게임의 모든 결과 알림(사건 결과 · 판정 · 동전)은 이것 하나 (D-259).
 * 철 테(리벳 넷) 안에 황동 판(좋음) · 금 판(아주 좋음) · 녹슨 쇠 판(나쁨), 글씨는 새김(어두운 글 + 아래 밝은 줄).
 * 움직임(50ms 계단): 위에서 떨어짐(예비 — 한 칸 멈칫) → 쾅(2도트 파고듦 · 좋음이면 흰 한 장 · 먼지 튐) → 1도트 튀어 오름 → 섬. 남은 먼지는 디더로 꺼진다.
 * dot: 장치 층 2px (CLAUDE.md UI 크롬과 같은 도트). host 위쪽 가운데에 붙는다(top 지정 가능).
 */
export const verdict = async (host: HTMLElement, text: string, kind: VerdictKind, o: { dot?: number; top?: number; sub?: string } = {}): Promise<HTMLCanvasElement> => {
  await fonts();
  const dot = o.dot ?? 2;
  const probe = document.createElement('canvas').getContext('2d')!;
  probe.font = '700 12px Galmuri11';
  const tw = Math.ceil(probe.measureText(text).width);
  const sw = o.sub ? Math.ceil(probe.measureText(o.sub).width) : 0;
  const pw = Math.max(tw, sw) + 26, ph = o.sub ? 36 : 22;
  const W = pw + 24, H = ph + 30;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  cv.className = 'px-verdict';
  Object.assign(cv.style, { width: `${W * dot}px`, height: `${H * dot}px`, top: `${o.top ?? 6}px` });
  host.appendChild(cv);
  const x = cv.getContext('2d')!;
  const face: Ramp = kind === 'bad' ? M.iron : kind === 'gold' ? M.brass : M.brass;
  const ink = kind === 'bad' ? M.crimson[5] : M.brass[0];
  const under = kind === 'bad' ? M.crimson[1] : M.brass[6];
  const px0 = 12, py0 = 14;
  const plateAt = (dy: number, flash: boolean) => {
    const a = px0, b = py0 + dy;
    f(x, INK, a + 2, b + 2, pw + 1, ph + 1); // 그림자
    block(x, a, b, pw, ph, M.iron, { mid: 3 });
    // 판 (철 테 3도트 안)
    const fa = a + 3, fb = b + 3, fw = pw - 6, fh = ph - 6;
    f(x, INK, fa - 1, fb - 1, fw + 2, fh + 2);
    if (flash) f(x, '#ffffff', fa, fb, fw, fh);
    else {
      f(x, face[kind === 'bad' ? 2 : kind === 'gold' ? 5 : 4], fa, fb, fw, fh);
      f(x, face[kind === 'bad' ? 4 : 6], fa, fb, fw, 1);
      f(x, face[kind === 'bad' ? 1 : 3], fa, fb + fh - 1, fw, 1);
      // 나쁨: 녹 얼룩 (디더)
      if (kind === 'bad') for (let j = 0; j < fh; j++) for (let i = 0; i < fw; i++) if (bay(i, j) < 0.18 && ((i * 7 + j * 13) % 9 < 3 || i < 3 || i > fw - 4)) f(x, M.rust[3], fa + i, fb + j, 1, 1);
      pixelText(x, text, a + pw / 2, fb + (o.sub ? 3 : 2), ink, { under });
      if (o.sub) pixelText(x, o.sub, a + pw / 2, fb + 17, kind === 'bad' ? M.paper[4] : M.brass[1], {});
    }
    rivet(x, a + 1, b + 1); rivet(x, a + pw - 4, b + 1); rivet(x, a + 1, b + ph - 4); rivet(x, a + pw - 4, b + ph - 4);
  };
  const dust: { x: number; y: number; vx: number; vy: number; life: number }[] = [];
  const steps = calm() ? [{ dy: 0, flash: false }] : [
    { dy: -14, flash: false }, { dy: -14, flash: false }, { dy: -6, flash: false }, { dy: 2, flash: kind !== 'bad', hit: true }, { dy: 1, flash: false }, { dy: -1, flash: false }, { dy: 0, flash: false },
  ] as { dy: number; flash: boolean; hit?: boolean }[];
  for (let i = 0; i < steps.length + (calm() ? 0 : 10); i++) {
    const st = steps[Math.min(i, steps.length - 1)];
    x.clearRect(0, 0, W, H);
    if (st.hit && i < steps.length) {
      host.classList.remove('px-jolt'); void host.offsetWidth; host.classList.add('px-jolt');
      for (let k = 0; k < 14; k++) { const s = k % 2 ? 1 : -1; dust.push({ x: k % 2 ? px0 + pw + 1 : px0 - 1, y: py0 + ph + 1, vx: s * (1 + (k % 4)), vy: -(k % 3) - 0.5, life: 6 + (k % 4) }); }
      for (let k = 0; k < 6; k++) dust.push({ x: px0 + 6 + k * (pw - 12) / 5, y: py0 + ph + 2, vx: 0, vy: -0.5 - (k % 2), life: 4 + (k % 3) });
    }
    for (const d of dust) {
      if (d.life <= 0) continue;
      d.x += d.vx; d.y += d.vy; d.vy += 0.25; d.life--;
      // 꺼질 때는 디더 (살아 있는 만큼만 찍힌다)
      if (bay(Math.round(d.x), Math.round(d.y)) < Math.min(1, d.life / 4)) f(x, kind === 'bad' ? M.rust[4] : M.paper[3], d.x, d.y, d.life > 3 ? 2 : 1, d.life > 3 ? 2 : 1);
    }
    plateAt(st.dy, st.flash);
    await new Promise((r) => setTimeout(r, 50));
    if (!cv.isConnected) break;
  }
  return cv;
};
