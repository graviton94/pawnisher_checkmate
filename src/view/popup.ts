import { DMG_NUM } from '../data/fx';
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
/** D-538: 머묾을 줄였다 (950 → 640ms) — 숫자가 다음 타격 · 기물을 오래 덮지 않게 */
export const POPUP_MS = { life: 640, fadeAt: 400, fade: 200 };

const INK = 0x0b0b0e;

/** 피해 숫자 글꼴 (D-624): 피해가 클수록 큰 갈무리(9 → 11 굵게 → 14). 처치는 가운데 단계 이상 */
export const dmgFont = (damage: number, killed = false): string => {
  let f: string = DMG_NUM.tiers[0].font;
  for (const t of DMG_NUM.tiers) if (damage >= t.min) f = t.font;
  return killed && damage < DMG_NUM.tiers[1].min ? DMG_NUM.tiers[1].font : f;
};

/**
 * 글자를 도트 그림으로. 캔버스에 1px = 1도트로 그린 뒤 문턱값으로 자르고, 바깥에 8방향 1도트 검정 테두리를 두른다.
 */
/** 만든 그림 보관 (D-680): 같은 글 · 색 · 글꼴은 다시 찍지 않는다 — 타격마다 캔버스를 새로 만들고 읽던 것이 끊김의 주범이었다 */
const artCache = new Map<string, PopupArt>();
/** 글자 찍는 캔버스 하나 (읽기 전용 CPU 캔버스 — 가속 캔버스의 getImageData는 GPU를 기다려 한 프레임이 수백 ms 멈춘다) */
let inkCv: HTMLCanvasElement | null = null;
let inkG: CanvasRenderingContext2D | null = null;

export const buildPopupArt = (text: string, color: number, font = POPUP_FONT): PopupArt => {
  const ck = `${font}|${color}|${text}`;
  const hit = artCache.get(ck);
  if (hit) return hit;
  const art = inkPopupArt(text, color, font);
  // 글꼴이 아직 안 받혔으면 대신 글꼴로 찍힌 것 — 보관하지 않는다
  if (document.fonts?.check?.(font, text) === false) return art;
  if (artCache.size > 160) artCache.delete(artCache.keys().next().value as string);
  artCache.set(ck, art);
  return art;
};

const inkPopupArt = (text: string, color: number, font: string): PopupArt => {
  const H = 20;
  inkCv ??= document.createElement('canvas');
  inkG ??= inkCv.getContext('2d', { willReadFrequently: true })!;
  const cv = inkCv;
  // 폭은 실제 글자 폭으로 (한글 낱말 「생명 +1」도 잘리지 않게 — D-398)
  inkG.font = font;
  const W = Math.max(text.length * 9, Math.ceil(inkG.measureText(text).width)) + 16;
  if (cv.width < W) cv.width = W;
  cv.height = H; // 높이를 다시 정하면 캔버스가 비워지고 상태가 처음으로 돌아간다
  const g = inkG;
  g.clearRect(0, 0, cv.width, H);
  g.font = font;
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
 * 선을 지난 줄은 한 도트 위로 튀며 바로 꺼진다 (D-675: 옛 선 위 체크무늬 줄을 뺐다).
 */
export const drawPopup = (g: RectSink, art: PopupArt, cx: number, by: number, dot: number, ms: number, rise: number, px = 1): void => {
  if (ms < 0 || ms >= POPUP_MS.life) return;
  const q = Math.min(1, ms / 330);
  const pop = 1 + 0.6 * 2 ** (-10 * q);
  // 도트는 늘 반듯한 정사각형 · 캔버스 정수 픽셀 (px = 월드 1단위의 캔버스 픽셀 수, D-538)
  const snap = (v: number) => Math.round(v * px) / px;
  const d = Math.max(1, Math.round(dot * pop * px)) / px;
  const lift = rise * (1 - (1 - q) ** 3);
  const left = snap(cx - (art.w * d) / 2);
  const top = snap(by - lift - art.h * d);
  const f = Math.max(0, (ms - POPUP_MS.fadeAt) / POPUP_MS.fade);
  const cut = art.h * (1 - easeInCubic(Math.min(1, f))); // 이 줄보다 아래는 지워졌다
  for (const p of art.dots) {
    let y = p.y;
    if (f > 0) {
      if (p.y >= cut) {
        // 방금 지나간 줄만 한 도트 튀었다 꺼진다
        if (p.y >= cut + 1) continue;
        y -= 1;
      }
    }
    g.fillStyle(p.c, 1);
    g.fillRect(left + p.x * d, top + y * d, d, d);
  }
};
