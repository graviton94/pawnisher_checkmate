/**
 * 맞은 곳 번쩍임 (D-595 — 화면 전체 흰 · 금 디더 막을 대신). 사용자 실기기: 「화면 번쩍임이 그래픽 수준이 떨어진다」.
 * 옛 번쩍임은 화면 전체를 75% 흰 체커로 덮고 220 ~ 400ms 동안 SVG 가면을 16번 바꿨다 — 눈부시고, 바꿀 때마다 화면 전체를 다시
 * 칠해 느린 폰에서 프레임이 빠졌다. 이제 맞은 곳 둘레만 원형 디더(8×8 베이어, 칸 = 게임 도트)로 켜고 **화면 프레임 수**로
 * 꺼진다(기본 3장: 50% → 약 22% → 약 6%). 캔버스는 칸 해상도(작다)로 그리고 CSS로 정수배 늘린다 — 칠할 곳이 작고 일정하다.
 * 그라데이션 · 투명도 보간 없음(D-216): 칸은 켜지거나 꺼질 뿐. 번쩍임 줄이기 · 움직임 줄이기면 그리지 않는다.
 */
import { reduceFlash } from '../prefs/motion';
import { FLASH } from '../data/motion';
import { bayer8, dotCss, snapDev } from './motion';

export interface FlashOpts {
  /** 가운데 (화면 CSS px) */
  x: number;
  y: number;
  /** 반지름 (CSS px) — 없으면 화면 짧은 변 × FLASH.radius */
  r?: number;
  /** 색 (#rrggbb) */
  color?: string;
  /** 가운데 덮는 비율 0~1 (FLASH.peak 상한) */
  peak?: number;
  /** 꺼지는 데 걸리는 화면 프레임 수 */
  frames?: number;
  /** 겹 순서 */
  z?: number;
}

const rgba = (hex: string): number => {
  const v = parseInt(hex.replace('#', ''), 16);
  // ImageData Uint32는 작은 쪽부터 R G B A
  return ((255 << 24) | ((v & 0xff) << 16) | (v & 0xff00) | ((v >> 16) & 0xff)) >>> 0;
};

/** 원형 디더 번쩍임 한 번 — 다 꺼지면 Promise가 풀린다 */
export const impactFlash = (o: FlashOpts): Promise<void> =>
  new Promise((done) => {
    if (reduceFlash() || typeof document === 'undefined') return done();
    const vw = window.innerWidth, vh = window.innerHeight;
    const dot = dotCss();
    const r = o.r ?? Math.min(vw, vh) * FLASH.radius;
    const R = Math.max(2, Math.ceil(r / dot));
    const n = 2 * R + 1;
    // 칸 격자를 화면 격자에 맞춘다 (번쩍임마다 베이어 무늬가 같은 자리 — 다른 디더 막과 어긋나지 않게)
    const gx = Math.round(o.x / dot) - R, gy = Math.round(o.y / dot) - R;
    const c = document.createElement('canvas');
    c.width = n;
    c.height = n;
    c.className = 'fx-flash';
    c.setAttribute('aria-hidden', 'true');
    Object.assign(c.style, {
      position: 'fixed', left: `${snapDev(gx * dot)}px`, top: `${snapDev(gy * dot)}px`, width: `${n * dot}px`, height: `${n * dot}px`,
      zIndex: String(o.z ?? 118), pointerEvents: 'none', imageRendering: 'pixelated', contain: 'strict',
    });
    const g = c.getContext('2d');
    if (!g) return done();
    const img = g.createImageData(n, n);
    const px = new Uint32Array(img.data.buffer);
    const col = rgba(o.color ?? '#ffffff');
    const peak = Math.min(FLASH.peak, o.peak ?? FLASH.peak);
    const frames = Math.max(1, o.frames ?? FLASH.frames);
    // 칸마다 거리 감쇠 (1 - d²) 를 한 번만
    const fall = new Float32Array(n * n);
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const dx = (x - R) / R, dy = (y - R) / R;
        fall[y * n + x] = Math.max(0, 1 - (dx * dx + dy * dy));
      }
    const draw = (k: number): void => {
      // 꺼짐 곡선: 1 → 0 (감속 — 첫 장이 가장 밝고 빨리 줄어든다)
      const lv = peak * Math.pow(1 - k / frames, 2) * 64;
      px.fill(0);
      for (let y = 0; y < n; y++)
        for (let x = 0; x < n; x++) {
          const i = y * n + x;
          if (bayer8(gx + x, gy + y) < lv * fall[i]) px[i] = col;
        }
      g.putImageData(img, 0, 0);
    };
    draw(0);
    document.body.appendChild(c);
    let k = 0;
    const step = (): void => {
      k += 1;
      if (k >= frames || !c.isConnected) {
        c.remove();
        return done();
      }
      draw(k);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });

/** 요소 가운데에서 번쩍 (카드 · 도장 · 초상) */
export const flashAt = (el: Element | null, o: Omit<FlashOpts, 'x' | 'y'> = {}): Promise<void> => {
  if (!el) return Promise.resolve();
  const b = el.getBoundingClientRect();
  return impactFlash({ x: b.left + b.width / 2, y: b.top + b.height / 2, ...o });
};
