import { easeInCubic, type RectSink } from './pixel';

/**
 * 피해 숫자 팝업 (D-051): 숫자를 도트 그림으로 만들어 검정 테두리를 두른다 (처치 해골은 붙이지 않는다 — D-053, 처치는 금색으로).
 * 숫자는 갈무리11 굵게 12px(숫자 높이 10도트, 획 2도트)를 도트로 찍는다.
 * 사라질 때는 아래에서 위로 잘리는 선이 올라가며 도트가 파스스 지워진다.
 */

/** 팝업 도트 한 칸 (그림 안 좌표, 도트 단위) */
export interface PopupDot {
  x: number;
  y: number;
  c: number;
}

/** 팝업 도트 그림 (가운데 아래가 기준점) */
export interface PopupArt {
  dots: PopupDot[];
  w: number;
  h: number;
}

/** 숫자 글꼴: 이 크기에서 갈무리11 숫자가 도트 격자에 딱 맞는다 (높이 10도트) */
export const POPUP_FONT = '700 12px Galmuri11';
/** 팝업 박자 (ms): 전체 길이 · 지워지기 시작하는 때 · 지워지는 시간 */
export const POPUP_MS = { life: 950, fadeAt: 640, fade: 260 };

const INK = 0x0b0b0e;

/**
 * 글자를 도트 그림으로. 캔버스에 1px = 1도트로 그린 뒤 문턱값으로 자르고, 바깥에 8방향 1도트 검정 테두리를 두른다.
 */
export const buildPopupArt = (text: string, color: number): PopupArt => {
  const W = text.length * 9 + 16;
  const H = 14;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const g = cv.getContext('2d')!;
  g.font = POPUP_FONT;
  g.textBaseline = 'top';
  g.fillStyle = '#fff';
  g.fillText(text, 1, 1);
  const a = g.getImageData(0, 0, W, H).data;
  const grid = new Map<string, number>();
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (a[(y * W + x) * 4 + 3] > 128) {
        grid.set(`${x},${y}`, color);
      }
  // 8방향 1도트 검정 테두리
  const ring = new Set<string>();
  for (const k of grid.keys()) {
    const [x, y] = k.split(',').map(Number);
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const n = `${x + dx},${y + dy}`;
        if (!grid.has(n)) ring.add(n);
      }
  }
  for (const k of ring) grid.set(k, INK);
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const k of grid.keys()) {
    const [x, y] = k.split(',').map(Number);
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  const dots: PopupDot[] = [];
  for (const [k, c] of grid) {
    const [x, y] = k.split(',').map(Number);
    dots.push({ x: x - x0, y: y - y0, c });
  }
  return { dots, w: x1 - x0 + 1, h: y1 - y0 + 1 };
};

/**
 * 팝업 한 장면: (cx, by) = 가운데 아래 기준점(월드 px), dot = 도트 한 칸 크기, ms = 뜬 뒤 지난 시간.
 * 튀어나옴(크게 → 제자리, 지수형) → 떠오름 → 아래에서 위로 잘리는 선이 올라가며 도트가 지워진다.
 * 선 바로 위 한 줄은 체크무늬로 듬성듬성, 선을 지난 도트는 한 도트 위로 튀며 바로 꺼진다.
 */
export const drawPopup = (g: RectSink, art: PopupArt, cx: number, by: number, dot: number, ms: number, rise: number): void => {
  if (ms < 0 || ms >= POPUP_MS.life) return;
  const q = Math.min(1, ms / 330);
  const pop = 1 + 0.6 * 2 ** (-10 * q);
  const d = Math.round(dot * pop); // 도트는 늘 반듯한 정사각형
  const lift = rise * (1 - (1 - q) ** 3);
  const left = Math.round(cx - (art.w * d) / 2);
  const top = Math.round(by - lift - art.h * d);
  const f = Math.max(0, (ms - POPUP_MS.fadeAt) / POPUP_MS.fade);
  const cut = art.h * (1 - easeInCubic(Math.min(1, f))); // 이 줄보다 아래는 지워졌다
  for (const p of art.dots) {
    let y = p.y;
    if (f > 0) {
      if (p.y >= cut) {
        // 방금 지나간 줄만 한 도트 튀었다 꺼진다
        if (p.y >= cut + 1 || (p.x + p.y) % 2) continue;
        y -= 1;
      } else if (p.y >= cut - 1 && (p.x + p.y) % 2 === 0) continue; // 선 바로 위: 체크무늬로 듬성듬성
    }
    g.fillStyle(p.c, 1);
    g.fillRect(left + p.x * d, top + y * d, d, d);
  }
};
