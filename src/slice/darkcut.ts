/**
 * 먹 무대 (D-579, 사장님 결정 「비주얼 일러스트 없이, 묘사 및 텍스트와 효과로만」): 그림이 없는 컷(Cut.dark)의 장면 칸.
 * 그림 · 기물 도트를 올리지 않는다 — 도트 FX 엔진(view/pxfx)의 칸 위에 빛 · 띠 · 작은 네모 표시만 찍어 글의 박자를 받친다.
 *  - 바탕: 먹. 청록 작업등 빛줄기(3단 계단 + 4×4 베이어 — 그라데이션 없음), 오른쪽 위 붉은 경고등(계단 깜빡 + 계단 빛 웅덩이).
 *  - 컨베이어 띠: 홈이 정수 칸씩 밀리고, 멈춘 뒤에도 1칸 덜컹 — 처음 들어올 때 화면을 계단 흔들림 두 번.
 *  - 줄 비트(Line.beat · data/vn.VN_DARK): rumble · drop · count · hush. 위치는 모두 정수 칸(= 기기 픽셀 정수), 화면 프레임마다.
 * 움직임 줄이기면 비트마다 끝 상태 한 장만 그린다 (흔들림 · 번쩍 · 입자 없음). 게임 상태는 건드리지 않는다 (UI 원칙 9).
 */
import { calmMotion } from '../prefs/motion';
import { lessFlash } from '../prefs/fx';
import { sfx } from '../audio/sfx';
import { ease } from '../view/motion';
import { bayer, FxCanvas, Lights, OUTLINE, P, PAL, Particles, Rng, WHITE } from '../view/pxfx';
import { VN_DARK, type DarkBeat } from '../data/vn';
import { shake } from './fx3';

const dpr = (): number => window.devicePixelRatio || 1;
const ORDER: DarkBeat[] = ['rumble', 'drop', 'count', 'hush'];
const T = PAL.teal, S = PAL.steel, W8 = PAL.paper, B = PAL.blood;
/** 빛줄기 계단: 0 = 먹, 1~3 = 청록 세 단 (빛 공식 3단계) */
const CONE = [OUTLINE, T[1], T[2], T[3]];
const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

/** 한 컷의 먹 무대 */
export class DarkStage {
  private fx: FxCanvas | null = null;
  private raf = 0;
  private born = performance.now();
  /** 비트가 걸린 시각 (performance.now) */
  private at: Partial<Record<DarkBeat, number>> = {};
  private parts = new Particles(new Rng(579));
  private lights = new Lights();
  private hit = false;
  private last = 0;
  private jolt = 0;
  constructor(private host: HTMLElement, private shakeEl: HTMLElement) {
    this.size();
    this.start();
  }
  /** 칸 크기 = 전환 막 칸 (기기 픽셀 정수) */
  private size(): void {
    const cell = Math.max(2, Math.round(VN_DARK.dot * dpr()));
    const cols = Math.max(40, Math.ceil((this.host.clientWidth * dpr()) / cell));
    const rows = Math.max(24, Math.ceil((this.host.clientHeight * dpr()) / cell));
    if (this.fx && this.fx.w === cols && this.fx.h === rows) return;
    this.fx?.canvas.remove();
    this.fx = new FxCanvas(cols, rows, cell / dpr());
    this.fx.canvas.className = 'pl-dark-cv';
    this.host.appendChild(this.fx.canvas);
    this.parts = new Particles(new Rng(579), () => this.floor());
  }
  refit(): void { this.size(); this.draw(performance.now()); }
  /** 줄 비트를 건다 — 앞 비트가 덜 끝났으면 끝 상태로 건너뛴다 */
  beat(b: DarkBeat): void {
    if (this.at[b] !== undefined) return;
    const now = performance.now();
    // 앞 비트를 건너뛰고 왔으면 그 비트도 「이미 끝남」으로 적는다
    for (const k of ORDER.slice(0, ORDER.indexOf(b))) this.at[k] ??= -1e9;
    this.at[b] = now;
    if (calmMotion()) return this.draw(now);
    if (b === 'rumble') VN_DARK.belt.shakeAt.forEach((ms) => window.setTimeout(() => this.alive() && shake(this.shakeEl, 1), ms));
  }
  private alive(): boolean { return this.host.isConnected && !!this.fx; }
  private start(): void {
    if (calmMotion()) return this.draw(performance.now());
    this.last = performance.now();
    const step = (now: number): void => {
      if (!this.alive()) return void (this.raf = 0);
      this.raf = requestAnimationFrame(step);
      if (document.hidden) return;
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      for (let s = dt; s > 0; s -= 1 / 120) { const d = Math.min(1 / 120, s); this.parts.update(d); this.lights.update(d); }
      this.draw(now);
    };
    this.raf = requestAnimationFrame(step);
  }
  destroy(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.fx?.canvas.remove();
    this.fx = null;
  }

  // ---------- 자리 (칸) ----------
  private get W(): number { return this.fx!.w; }
  private get H(): number { return this.fx!.h; }
  /** 띠 윗줄 */
  private floor(): number { return this.H - 6; }
  private cx(): number { return Math.floor(this.W / 2); }
  /** 비트가 걸린 뒤 지난 ms (안 걸렸으면 -1, 건너뛰었으면 아주 큼) */
  private since(b: DarkBeat, now: number): number {
    const t = this.at[b];
    if (t === undefined) return -1;
    if (calmMotion()) return 1e9;
    // 다음 비트가 걸렸으면 이 비트는 끝까지 간 셈
    const nxt = ORDER.slice(ORDER.indexOf(b) + 1).some((k) => this.at[k] !== undefined);
    return nxt && b !== 'rumble' ? 1e9 : now - t;
  }

  // ---------- 한 장 ----------
  private draw(now: number): void {
    const fx = this.fx;
    if (!fx) return;
    const f = fx.frame, p = fx.painter, W = this.W, H = this.H, fl = this.floor(), cx = this.cx();
    const calm = calmMotion();
    const tR = this.since('rumble', now), tD = this.since('drop', now), tC = this.since('count', now), tH = this.since('hush', now);
    const t = (now - this.born) / 1000;
    f.clear();

    // 1 · 등 켜짐 (rumble): 0 → 1, 켜지다 한 번 꺼짐 — 디더 단계는 빛줄기 계단이 받는다
    let on = tR < 0 ? 0 : clamp01(tR / VN_DARK.lightOn);
    const [fa, fb] = VN_DARK.flicker;
    if (tR >= fa && tR < fa + fb) on = 0;
    // 2 · 빛줄기 폭 · 자리: 정수 칸씩 흔들리고(계단 쓸림), hush면 아홉째 자리로 좁아진다
    const C = VN_DARK.cone;
    const hush = tH < 0 ? 0 : ease.inOut(clamp01(tH / C.hushMs));
    const mul = 1 - (1 - C.hush) * hush;
    const sway = calm ? 0 : Math.round(Math.sin((t * 1000 * Math.PI * 2) / C.swayMs) * C.sway * (1 - hush));
    const ax = cx + sway;
    const half = (y: number): number => (C.top + ((C.bottom - C.top) * Math.max(0, y)) / fl) * mul;
    const ring = (x: number, y: number): number => {
      if (on <= 0) return 0;
      const v = on * (1 - Math.abs(x + 0.5 - ax) / Math.max(0.5, half(y)));
      return v <= 0 ? 0 : Math.min(3, Math.floor(v * 3 + bayer(x, y)));
    };
    const lit = (x: number, y: number): boolean => ring(x, y) >= 2;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) f.color[y * W + x] = CONE[y <= fl + 2 ? ring(x, y) : 0];

    // 3 · 컨베이어 띠 (rumble에 상자가 들어와 멈춤 — 예비 → 터짐 → 출렁) · 멈춘 뒤 1칸 덜컹
    const slide = Math.round(W * 0.62);
    const bo = tR < 0 ? slide : Math.round(slide * (1 - ease.abs(clamp01(tR / 1400), 0.04, 0.03)));
    if (!calm && tR >= 1400 && tR < 1400 + 40 && !this.jolt) { this.jolt = 1; shake(this.shakeEl, 1); }
    const bump = calm || tH >= 0 || tR < 0 ? 0 : Math.floor(now / VN_DARK.belt.jolt) % 2;
    const G = VN_DARK.belt.groove;
    for (let x = 0; x < W; x++) {
      const groove = ((x + bo) % G + G) % G === 0;
      const l = lit(x, fl);
      p.px(x, fl - bump, l ? T[4] : S[3]);
      p.px(x, fl + 1, groove ? S[1] : l ? S[4] : S[2]);
      p.px(x, fl + 2, groove ? S[0] : S[1]);
      p.px(x, fl + 3, ((x + bo) % 12 + 12) % 12 < 2 ? S[2] : OUTLINE);
    }

    // 4 · 작은 네모 (기물 그림이 아니라 자리 표시 — 3×4 칸 + 먹 테): 빛 안이면 밝은 종이 셋 단, 밖이면 어두운 셋 단
    const block = (x: number, y: number, w = 3, h = 4, flash = false): void => {
      const l = lit(x + 1, y + 1);
      const c = flash ? [WHITE, WHITE, WHITE] : l ? [W8[2], W8[4], W8[5]] : [W8[0], W8[1], W8[2]];
      p.rect(x - 1, y - 1, w + 2, h + 2, OUTLINE);
      p.rect(x, y, w, h, c[1]);
      p.rect(x, y, w, 1, c[2]);
      p.rect(x, y, 1, h, c[2]);
      p.rect(x + w - 1, y + 1, 1, h - 1, c[0]);
    };
    // 상자 자리: 가운데 킹 칸(빈 꺾쇠) + 양옆 넷씩 여덟 칸
    const gx = cx + bo, top = fl - 5;
    const kx = gx - 3;
    const counted = tC < 0 ? 0 : Math.min(8, Math.floor(tC / VN_DARK.count.stepMs) + 1);
    const pipX = (k: number): number => gx + (k < 4 ? -(10 + (3 - k) * 7) : 10 + (k - 4) * 7) - 1;
    for (let k = 0; k < 8; k++) {
      const x = pipX(k);
      block(x, top + 1, 3, 4, !calm && tC >= 0 && Math.floor(tC / VN_DARK.count.stepMs) === k);
      // 센 칸: 발밑에 청록 눈금 한 줄
      if (k < counted) p.rect(x, fl + 1, 3, 1, lit(x + 1, top) ? T[5] : T[3]);
    }
    // 킹 칸: 먹 테 꺾쇠 (위가 열린 칸) — 빛을 받으면 쇠 밝은 단
    const kc = lit(kx + 3, top) ? S[5] : S[2];
    p.rect(kx - 1, top - 2, 1, 7, kc);
    p.rect(kx + 7, top - 2, 1, 7, kc);
    p.rect(kx - 1, top + 5, 9, 1, kc);
    p.rect(kx, top + 4, 7, 1, OUTLINE);

    // 5 · 아홉째: drop 전엔 띠 왼쪽에서 굴러다니고(1칸 흔들), 집혀 오름 → 매달려 옮겨짐 → 떨어짐 → 킹 칸에 눌림
    const D = VN_DARK.drop;
    const x0 = gx - 52;
    const restY = top + 1;
    const hang = 4;
    const tFall = D.lift + D.carry, tHit = tFall + D.fall;
    let mx = x0 + (calm || tR < 0 || tR < 1400 ? 0 : Math.floor(now / 300) % 2), my = restY, mw = 3, mh = 4, cable = false, trail = 0;
    if (tD >= 0) {
      if (tD < D.lift) {
        // 예비(1칸 눌림) → 빠르게 위로
        const e = ease.abs(tD / D.lift, 0.12, 0.04);
        my = Math.round(restY + (hang - restY) * e);
        cable = true;
      } else if (tD < tFall) {
        const e = ease.inOut((tD - D.lift) / D.carry);
        mx = Math.round(x0 + (kx + 2 - x0) * e) + (e >= 1 ? 0 : Math.floor(tD / D.swayMs) % 2);
        my = hang;
        cable = true;
      } else if (tD < tHit) {
        const u = (tD - tFall) / D.fall;
        mx = kx + 2;
        my = Math.round(hang + (restY - hang) * ease.in(u));
        trail = Math.round(2 + u * 10);
      } else {
        mx = kx + 2;
        const s = tD - tHit;
        // 눌림 → 늘어남 → 섬 (정지 동작 세 장)
        if (s < D.hero + 60) { mw = 5; mh = 3; mx -= 1; my = restY + 1; } else if (s < D.hero + 60 + D.settle / 2) { mh = 5; my = restY - 1; }
      }
    } else if (tC >= 0 || tH >= 0) { mx = kx + 2; }
    if (tD >= tHit && !this.hit) this.impact(kx + 3, fl - 1, tD - tHit < 200);
    // 매단 줄: 위 끝에서 1칸 쇠줄 + 양옆 집게 끝 두 칸 (선 · 빛만)
    if (cable) {
      p.line(mx + 1, 0, mx + 1, my - 2, lit(mx + 1, my) ? S[5] : S[3]);
      p.px(mx - 1, my - 1, S[5]);
      p.px(mx + 3, my - 1, S[5]);
    }
    // 떨어지는 꼬리: 위로 갈수록 성긴 디더 (투명도 아님 — 칸을 고른다)
    for (let i = 1; i <= trail; i++) p.rect(mx, my - i, 3, 1, W8[3], 1 - i / (trail + 1));
    const blink = tC >= VN_DARK.count.stepMs * 8 && tC < VN_DARK.count.stepMs * 8 + VN_DARK.count.blinkMs * VN_DARK.count.blinks * 2;
    const blinkOn = blink && Math.floor((tC - VN_DARK.count.stepMs * 8) / VN_DARK.count.blinkMs) % 2 === 0;
    if (blinkOn) p.rect(mx - 2, my - 2, mw + 4, mh + 4, T[6]);
    block(mx, my, mw, mh);
    // 다 센 뒤 아홉째 발밑에도 눈금 — 단, 다른 빛(금 아님 · 차가운 흰 청록)
    if (counted >= 8 && tC >= VN_DARK.count.stepMs * 8) p.rect(mx, fl + 1, 3, 1, T[6]);

    // 6 · 붉은 경고등 (오른쪽 위): 계단 깜빡 + 켜진 동안 계단 빛 웅덩이
    const L = VN_DARK.lamp, slow = hush > 0 ? L.hushMul : 1;
    const lampOn = calm || Math.floor(now / ((L.on + L.off) * slow / 2)) % 2 === 0;
    const lx = W - 14, ly = 4;
    p.rect(lx - 1, ly - 1, 6, 4, OUTLINE);
    p.rect(lx, ly, 4, 2, lampOn ? B[5] : B[2]);
    if (lampOn) p.px(lx, ly, B[7]);
    p.rect(lx - 1, ly + 3, 6, 1, S[2]);
    if (lampOn) p.glow(lx + 2, ly + 1, 11, B[4], 0.55);

    // 7 · 부딪힘 입자 · 빛
    this.parts.draw(p, 'back');
    this.parts.draw(p, 'front');
    this.lights.draw(p);
    fx.present();
  }
  /** 킹 칸에 눌림: hero 한 장(흰 테) · 쇳가루 · 먼지 · 차가운 빛 · 도장 흔들림 + 소리 — 건너뛰어 왔으면 조용히 선다 */
  private impact(x: number, y: number, live: boolean): void {
    this.hit = true;
    if (!live || calmMotion()) return;
    const I = VN_DARK.impact, p = this.parts;
    sfx('stamp');
    shake(this.shakeEl, 3);
    if (!lessFlash()) this.lights.add(x, y - 2, I.light, T[6], 1.2, 0.32);
    p.burst(x, y - 1, I.grit, [40, 120], P.GRIT, [0.4, 0.9], S[5], 60);
    for (let i = 0; i < I.dust; i++) p.spawn(P.DUST, x + p.R.range(-6, 6), y - p.R.range(0, 2), p.R.range(-14, 14), p.R.range(-10, -2), p.R.range(0.5, 0.9), W8[1], p.R.range(1.2, 2.2));
    p.burst(x, y - 3, 6, [30, 70], P.SPARK, [0.15, 0.3], WHITE, 30);
  }
}
