/**
 * 사건 미니게임 (D-253 → D-256 → D-259 「주물 공방 문법」 리뉴얼).
 * 심의(D-254): 카지노 · 도박 기구의 모습과 내기가 없다 — 공장의 검사 기계와 녹슨 봉인 상자.
 * 결과는 엔진이 이미 정했다 — 떨어질 부품, 녹 아래 각인을 결과에 맞춰 깔 뿐이다 (UI 원칙 9).
 * 그림은 모두 `view/pxkit`의 재질 · 빛 공식(먹 테 · 왼위 빛 · 오른아래 그늘 · 먹 그림자)으로 찍고, 결과 알림은 판결 명패 하나.
 * 층: 장면(도트 캔버스, 1도트 = 3px) · 빛(pxfx) · 장치(판결 명패, 1도트 = 2px).
 */
import { sfx } from '../audio/sfx';
import { block, box3, fill, INK, lamp, M, rivet, bay, verdict, type Ramp } from '../view/pxkit';
import { FxCanvas, hex, Lights, P, Particles, Rng, WHITE } from '../view/pxfx';

const D = 3;
const calm = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const imgs = new Map<string, HTMLImageElement>();
/** 32칸 기호 (ICON-01을 우리 도트로, D-255) */
export const icon = (n: string): HTMLImageElement => {
  let i = imgs.get(n);
  if (!i) { i = new Image(); i.src = `ui/props/ic32-${n}.png`; imgs.set(n, i); }
  return i;
};
['gear', 'gear-gold', 'gear-broken', 'crown-gold', 'rust', 'seal-corner'].forEach(icon);
const WOOD: Ramp = ['#1a0f08', '#331d10', '#4f2f18', '#6e4422', '#8e5c2e', '#b07a42', '#d4a064'];

/** 오버레이 뼈대: 철판 패널(UI 크롬) 안에 황동 명패 머리 + 도트 장면 + 빛 층 */
const shell = (host: HTMLElement, w: number, h: number, cls: string, title: string) => {
  const el = document.createElement('div');
  el.className = `mg ${cls}`;
  const box = document.createElement('div');
  box.className = 'mg-box panel9';
  const cap = document.createElement('p');
  cap.className = 'mg-cap plate';
  cap.textContent = title;
  const stage = document.createElement('div');
  stage.className = 'mg-stage';
  stage.style.width = `${w * D}px`;
  stage.style.height = `${h * D}px`;
  const art = document.createElement('canvas');
  art.width = w; art.height = h;
  Object.assign(art.style, { width: `${w * D}px`, height: `${h * D}px` });
  const fx = new FxCanvas(w, h, D);
  fx.canvas.classList.add('mg-fx');
  stage.append(art, fx.canvas);
  const hint = document.createElement('p');
  hint.className = 'mg-hint';
  box.append(cap, stage, hint);
  el.appendChild(box);
  host.appendChild(el);
  const x = art.getContext('2d')!;
  x.imageSmoothingEnabled = false;
  const R = new Rng(w * 7 + h + title.length);
  const ps = new Particles(R, () => h - 3);
  const lights = new Lights();
  return { el, cap, hint, stage, x, fx, R, ps, lights };
};

/** 프레임 돌리기 — tick(dt, t)가 false를 돌려주면 끝 */
const loopUntil = (el: HTMLElement, tick: (dt: number, t: number) => boolean): Promise<void> =>
  new Promise((done) => {
    let last = performance.now(), t = 0;
    const f = (now: number) => {
      if (!el.isConnected) return done();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now; t += dt;
      if (!tick(dt, t)) return done();
      requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  });
const closeOut = (el: HTMLElement): Promise<void> => new Promise((r) => { el.classList.add('out'); window.setTimeout(() => { el.remove(); r(); }, 300); });
const shakeOf = (t: number, amp: number) => (amp > 0.2 ? Math.round(amp * (Math.floor(t * 30) % 2 ? 1 : -1)) : 0);

/** 계단 빛살 (4장 회전, 반투명 없음 — 빛 층에 더한다) */
const rays = (fx: FxCanvas, cx: number, cy: number, len: number, t: number, col: number, n = 8) => {
  const ph = (Math.floor(t * 8) % 4) / 4;
  for (let k = 0; k < n; k++) {
    const a = ((k + ph) / n) * Math.PI * 2;
    for (let r = 6; r < len; r += 2) fx.painter.add(cx + Math.cos(a) * r, cy + Math.sin(a) * r, col, 0.35 * (1 - r / len));
  }
};

/**
 * 고장 난 조립 판정기 — 결과: 'part'(금 톱니 셋 = 희귀 부품) · 'up'(금 왕관 셋 = 승급) · 'miss'(톱니 둘 + 금 간 톱니 = 불량).
 * 3/4 시점 쇠 몸통 · 위에 황동 깔때기 · 앞에 유리 검사 창 셋 · 왼쪽 압력계 · 오른쪽 판정 경광등 · 옆 조작함의 붉은 버섯 단추.
 * 단추 → 몸통이 떨고 압력계 바늘이 오른다 → 창마다 부품이 떨어져 받침에 박힘(쿵 · 불꽃 · 창 아래 등) →
 * 앞 둘이 같으면 셋째 깔때기 목이 길게 덜컹 · 바늘이 붉은 칸에서 떤다(애태움) → 경광등 회전 빛살 + 판결 명패.
 * 합격 = 초록 등 · 부품이 금빛으로 들림, 불량 = 셋째 창 유리가 금 가고 불꽃 · 연기.
 */
export const assemblyJudge = async (host: HTMLElement, result: 'part' | 'up' | 'miss', label: { title: string; win: string; lose: string }, still?: (art: HTMLCanvasElement) => void): Promise<void> => {
  const W = 176, H = 104;
  const { el, cap, hint, stage, x, fx, R, ps, lights } = shell(still ? document.createElement('div') : host, W, H, 'mg-judge', label.title);
  const items = result === 'part' ? ['gear-gold', 'gear-gold', 'gear-gold'] : result === 'up' ? ['crown-gold', 'crown-gold', 'crown-gold'] : ['gear-gold', 'gear-gold', 'gear-broken'];
  const ok = result !== 'miss';
  // 배치 (도트)
  const bx = 12, by = 28, bw = 126, bh = 66; // 몸통
  const win = (i: number) => ({ x: bx + 34 + i * 30, y: by + 14, w: 26, h: 34 });
  const gauge = { x: bx + 16, y: by + 26 };
  const beacon = { x: bx + bw - 10, y: by - 10 };
  const btn = { x: 150, y: 56 };
  let phase: 'idle' | 'run' | 'judge' = 'idle';
  const drop = items.map(() => ({ y: 0, vy: 0, on: false, landed: false, rattle: 0 }));
  let shake = 0, needle = 0.08, needleTo = 0.08, press = 0, tJudge = 0, crack = 0;
  const draw = (t: number) => {
    x.clearRect(0, 0, W, H);
    const s = shakeOf(t, shake);
    // 바닥: 철 격자 + 경고 띠
    fill(x, M.iron[1], 0, H - 8, W, 8);
    for (let a = 0; a < W; a += 4) fill(x, M.iron[0], a, H - 7, 1, 7);
    fill(x, M.iron[3], 0, H - 8, W, 1);
    for (let a = 0; a < W; a++) if (((a >> 2) & 1) === 0) fill(x, M.brass[4], a, H - 10, 1, 2); else fill(x, INK, a, H - 10, 1, 2);
    x.save(); x.translate(s, 0);
    // 김 관 (왼쪽 벽에서 몸통으로)
    fill(x, INK, 0, by + 8, bx + 1, 7); fill(x, M.iron[3], 0, by + 9, bx, 5); fill(x, M.iron[5], 0, by + 9, bx, 1); fill(x, M.iron[1], 0, by + 13, bx, 1);
    fill(x, INK, 4, by + 6, 4, 11); fill(x, M.brass[4], 5, by + 7, 2, 9);
    // 몸통 (3/4: 위 면 6도트)
    box3(x, bx, by, bw, bh, 6, M.iron, { shadow: 2 });
    for (let a = bx + 30; a < bx + bw - 4; a += 30) fill(x, M.iron[2], a, by + 8, 1, bh - 10);
    for (const [a, b] of [[bx + 2, by + 8], [bx + bw - 5, by + 8], [bx + 2, by + bh - 5], [bx + bw - 5, by + bh - 5]]) rivet(x, a, b);
    // 황동 띠
    block(x, bx + 1, by + bh - 14, bw - 2, 4, M.brass, { outline: false });
    // 깔때기 (황동, 위 면에 박힘) + 목 셋
    const hx = bx + 30, hw = 92;
    for (let k = 0; k < 16; k++) {
      const inset = Math.floor(k * 0.9);
      const y = by - 16 + k;
      fill(x, INK, hx + inset - 1, y, hw - inset * 2 + 2, 1);
      fill(x, k < 2 ? M.brass[6] : k < 5 ? M.brass[5] : M.brass[4], hx + inset, y, hw - inset * 2, 1);
      fill(x, M.brass[2], hx + hw - inset - 3, y, 3, 1);
      fill(x, M.brass[6], hx + inset, y, 1, 1);
    }
    fill(x, INK, hx - 1, by - 17, hw + 2, 1);
    // 깔때기 안 부품 무더기 (흔들림)
    for (let k = 0; k < 9; k++) { const jx = phase === 'run' ? (Math.floor(t * 20 + k) % 2) : 0; fill(x, k % 3 ? M.iron[4] : M.brass[5], hx + 10 + k * 8 + jx, by - 19 + (k % 2), 5, 3); fill(x, INK, hx + 10 + k * 8 + jx, by - 16 + (k % 2), 5, 1); }
    for (let i = 0; i < 3; i++) {
      const w0 = win(i), r = drop[i].rattle > 0 ? (Math.floor(t * 40) % 2 ? 1 : -1) : 0;
      fill(x, INK, w0.x + 8 + r, by - 1, 10, 8); fill(x, M.brass[3], w0.x + 9 + r, by - 1, 8, 7); fill(x, M.brass[5], w0.x + 9 + r, by - 1, 1, 7);
    }
    // 검사 창 셋: 황동 테 → 어두운 안 → 받침 → 부품 → 유리 반사
    for (let i = 0; i < 3; i++) {
      const w0 = win(i), d = drop[i];
      block(x, w0.x - 3, w0.y - 3, w0.w + 6, w0.h + 6, M.brass, { mid: 3 });
      fill(x, INK, w0.x - 1, w0.y - 1, w0.w + 2, w0.h + 2);
      fill(x, M.iron[1], w0.x, w0.y, w0.w, w0.h);
      fill(x, M.iron[0], w0.x, w0.y, w0.w, 3);
      // 받침
      fill(x, INK, w0.x + 2, w0.y + w0.h - 5, w0.w - 4, 4); fill(x, M.iron[4], w0.x + 3, w0.y + w0.h - 5, w0.w - 6, 2);
      if (d.on) {
        const im = icon(items[i]);
        const lift = phase === 'judge' && ok ? Math.min(4, Math.floor((t - tJudge - 0.3) * 12)) : 0;
        if (im.complete) {
          x.save(); x.beginPath(); x.rect(w0.x, w0.y, w0.w, w0.h); x.clip();
          x.drawImage(im, w0.x + (w0.w - 32) / 2, Math.round(d.y - Math.max(0, lift)));
          x.restore();
        }
      }
      // 유리: 대각 반사 두 줄 (디더) + 금(불량)
      for (let k = 0; k < w0.h; k++) { const a = w0.x + 3 + k - 4; if (a >= w0.x && a < w0.x + w0.w && bay(a, w0.y + k) < 0.5) fill(x, M.iron[6], a, w0.y + k, 1, 1); const b2 = a + 4; if (b2 >= w0.x && b2 < w0.x + w0.w && bay(b2, w0.y + k) < 0.25) fill(x, M.iron[5], b2, w0.y + k, 1, 1); }
      if (i === 2 && crack > 0) { const cx = w0.x + 15, cy = w0.y + 12; for (const [dx, dy] of [[1, -1], [-1, -1], [1, 1], [-1, 1], [0, 1]]) for (let r = 0; r < Math.min(12, crack * 14); r++) fill(x, M.iron[6], cx + dx * r + (r % 3 === 2 ? dy : 0), cy + dy * r * 0.8, 1, 1); }
      // 창 아래 등
      const lit = d.landed ? (phase === 'judge' ? (ok || i < 2 ? (ok ? M.teal : M.brass) : M.crimson) : M.paper) : null;
      lamp(x, w0.x + w0.w / 2, w0.y + w0.h + 8, 2, lit);
    }
    // 압력계 (바늘이 결과를 애태운다)
    lamp(x, gauge.x, gauge.y, 9, M.paper);
    for (let k = 0; k < 5; k++) { const a = Math.PI * (0.8 + k * 0.35); fill(x, k === 4 ? M.crimson[4] : INK, gauge.x + Math.cos(a) * 7, gauge.y + Math.sin(a) * 7, 1, 1); }
    for (let k = 7; k <= 8; k++) for (let a = 1.95; a <= 2.25; a += 0.05) fill(x, M.crimson[4], gauge.x + Math.cos(Math.PI * a) * k, gauge.y + Math.sin(Math.PI * a) * k, 1, 1);
    const na = Math.PI * (0.8 + needle * 1.4);
    for (let r = 0; r < 7; r++) fill(x, M.crimson[2], gauge.x + Math.round(Math.cos(na) * r), gauge.y + Math.round(Math.sin(na) * r), 1, 1);
    fill(x, INK, gauge.x - 1, gauge.y - 1, 2, 2);
    // 판정 경광등 (기둥 + 유리 돔)
    fill(x, INK, beacon.x - 2, beacon.y + 4, 5, by - beacon.y - 3); fill(x, M.iron[4], beacon.x - 1, beacon.y + 4, 3, by - beacon.y - 4);
    const lc = phase === 'judge' && Math.floor((t - tJudge) * 6) % 2 === 0 ? (ok ? M.teal : M.crimson) : null;
    lamp(x, beacon.x, beacon.y, 6, lc);
    fill(x, INK, beacon.x - 7, beacon.y + 5, 15, 3); fill(x, M.brass[4], beacon.x - 6, beacon.y + 5, 13, 2);
    x.restore();
    // 조작함 + 붉은 버섯 단추 (흔들리지 않는다 — 손이 닿는 것)
    box3(x, btn.x - 10, btn.y - 4, 22, 34, 5, M.iron, { shadow: 2 });
    rivet(x, btn.x - 8, btn.y + 24); rivet(x, btn.x + 7, btn.y + 24);
    const bp = press > 0 ? 2 : 0;
    fill(x, INK, btn.x - 6, btn.y + 4 + bp, 14, 8 - bp); fill(x, M.crimson[3], btn.x - 5, btn.y + 4 + bp, 12, 6 - bp); fill(x, M.crimson[5], btn.x - 5, btn.y + 4 + bp, 12, 1); fill(x, M.crimson[6], btn.x - 4, btn.y + 5 + bp, 2, 1); fill(x, M.crimson[1], btn.x - 5, btn.y + 9, 12, 1);
    fill(x, INK, btn.x - 2, btn.y + 12, 6, 6); fill(x, M.iron[4], btn.x - 1, btn.y + 12, 4, 5);
    if (phase === 'idle' && Math.floor(t * 3) % 2 === 0) { const c = M.brass[5]; fill(x, c, btn.x - 9, btn.y + 1, 20, 1); fill(x, c, btn.x - 9, btn.y + 20, 20, 1); fill(x, c, btn.x - 9, btn.y + 1, 1, 20); fill(x, c, btn.x + 10, btn.y + 1, 1, 20); }
  };
  if (still) { draw(0); return still(x.canvas); }
  hint.textContent = '▼ 붉은 단추를 누른다';
  const run = () => {
    if (phase !== 'idle') return;
    phase = 'run';
    hint.textContent = '';
    sfx('stamp');
    press = 0.18; shake = 1.4; needleTo = 0.45;
    for (let i = 0; i < 6; i++) ps.spawn(P.SMOKE, 6, by + 4, R.range(-6, 10), R.range(-40, -20), R.range(0.8, 1.3), hex('#a39cab'), R.range(3, 5), i * 0.05);
    const fall = (i: number) => { drop[i].rattle = 0; drop[i].on = true; drop[i].y = win(i).y - 32; drop[i].vy = 30; };
    const st = (i: number, ms: number) => window.setTimeout(() => { drop[i].rattle = 0.35; window.setTimeout(() => fall(i), 350); }, ms);
    st(0, 450); st(1, 1100);
    const tense = items[0] === items[1];
    window.setTimeout(() => { if (tense) { hint.textContent = '…!'; sfx('threat'); drop[2].rattle = 1.6; needleTo = 0.95; } }, 1800);
    window.setTimeout(() => fall(2), tense ? 3300 : 2000);
  };
  stage.addEventListener('pointerdown', run);
  hint.addEventListener('click', run);
  const auto = window.setTimeout(run, 6000);
  if (calm()) run();
  let plaqued = false;
  await loopUntil(el, (dt, t) => {
    shake = Math.max(0, shake - dt * 4);
    press = Math.max(0, press - dt);
    needle += (needleTo - needle) * Math.min(1, dt * 6) + (phase === 'run' && needleTo > 0.9 ? (Math.floor(t * 30) % 2 ? 0.02 : -0.02) : 0);
    for (let i = 0; i < 3; i++) {
      const d = drop[i], w0 = win(i);
      if (d.rattle > 0) { d.rattle -= dt; if (R.chance(dt * 24)) ps.spawn(P.GRIT, w0.x + 13 + R.range(-4, 4), by, R.range(-20, 20), R.range(-30, -5), 0.4, hex(M.iron[5]), 1); }
      if (!d.on || d.landed) continue;
      d.vy += 900 * dt; d.y += d.vy * dt;
      const rest = w0.y + w0.h - 5 - 31;
      if (d.y >= rest) {
        d.y = rest; d.landed = true;
        shake = 1.2; sfx('land');
        ps.burst(w0.x + 13, w0.y + w0.h - 5, 10, [50, 130], P.SPARK, [0.15, 0.35], WHITE, 50);
        lights.add(w0.x + 13, w0.y + w0.h - 8, 16, hex(M.paper[5]), 0.7, 0.3);
      }
    }
    if (phase === 'run' && drop.every((d) => d.landed)) {
      phase = 'judge'; tJudge = t; needleTo = ok ? 0.2 : 1.05;
      cap.classList.add(ok ? 'good' : 'bad');
      if (ok) {
        sfx('jackpot');
        lights.add(W / 2, by + 30, 80, hex(M.brass[5]), 1, 1.2);
        for (let i = 0; i < 3; i++) for (let k = 0; k < 8; k++) ps.spawn(P.MOTE, win(i).x + 13 + R.range(-8, 8), win(i).y + 20, R.range(-8, 8), R.range(-80, -40), R.range(0.5, 1), hex(M.brass[6]), 1, k * 0.04);
      } else {
        sfx('hurt');
        shake = 2.4; crack = 0.01;
        const w2 = win(2);
        ps.burst(w2.x + 13, w2.y + 14, 26, [80, 200], P.SPARK, [0.25, 0.6], WHITE, 60);
        for (let k = 0; k < 12; k++) ps.spawn(P.SMOKE, w2.x + 13 + R.range(-8, 8), w2.y, R.range(-15, 15), R.range(-50, -20), R.range(1, 1.8), 0, R.range(4, 7), k * 0.03);
        lights.add(w2.x + 13, w2.y + 14, 40, hex(M.crimson[4]), 0.9, 0.6);
      }
    }
    if (crack > 0) crack = Math.min(1, crack + dt * 4);
    if (phase === 'judge' && !plaqued && t - tJudge > 0.25) { plaqued = true; void verdict(stage, ok ? '합격' : '불량', ok ? 'good' : 'bad', { sub: ok ? label.win : label.lose, top: 4 }); }
    fx.frame.clear();
    ps.update(dt); lights.update(dt);
    draw(t);
    if (phase === 'judge') rays(fx, beacon.x, beacon.y, 40, t - tJudge, hex(ok ? M.teal[5] : M.crimson[5]));
    ps.draw(fx.painter, 'back'); ps.draw(fx.painter, 'front'); lights.draw(fx.painter);
    if (phase === 'judge' && t - tJudge < 0.06 && ok) fx.painter.rect(0, 0, W, H, WHITE, 0.6);
    fx.present();
    return !(phase === 'judge' && t - tJudge > (calm() ? 0.6 : 2.6));
  });
  window.clearTimeout(auto);
  await closeOut(el);
};

/**
 * 녹슨 봉인 상자 — 3/4 시점 나무 상자(쇠띠 · 리벳), 뚜껑을 감은 사슬 둘, 가운데 황동 자물쇠, 앞의 봉인판에 각인 칸 셋.
 * 칸을 덮은 녹을 손가락으로 긁으면(5도트 붓) 녹 부스러기가 떨어지고, 절반 넘게 긁히면 남은 녹이 계단 디더로 떨어진다.
 * 맞으면: 각인이 금빛으로 깜빡 → 자물쇠 고리가 튀어 오르고 떨어짐 → 사슬이 미끄러져 내려감 → 뚜껑 틈으로 계단 빛살 + 판결 명패.
 * 어긋나면(셋째 칸 = 녹 덩어리): 자물쇠가 덜컹하고 버팀 → 녹 가루 구름 + 판결 명패.
 */
export const sealScrape = async (host: HTMLElement, under: [string, string, string], win: boolean, label: { title: string; win: string; lose: string }, still?: (art: HTMLCanvasElement) => void): Promise<void> => {
  const W = 176, H = 104;
  const { el, cap, hint, stage, x, fx, R, ps, lights } = shell(still ? document.createElement('div') : host, W, H, 'mg-seal', label.title);
  // 배치
  const cx0 = 18, cy0 = 28, cw = 140, chh = 66; // 상자 (위 면 8)
  const plate = { x: cx0 + 12, y: cy0 + 22, w: cw - 24, h: 40 };
  const slots = [0, 1, 2].map((i) => ({ x: plate.x + 4 + i * 38, y: plate.y + 3, w: 34, h: 34, rust: new Uint8Array(34 * 34).fill(1), open: false }));
  const hash = (a: number, b: number, k: number) => { const v = Math.sin(a * 127.1 + b * 311.7 + k * 74.7) * 43758.5453; return v - Math.floor(v); };
  const noise = (a: number, b: number, k: number) => {
    const ia = Math.floor(a), ib = Math.floor(b), fa = a - ia, fb = b - ib;
    const sa = fa * fa * (3 - 2 * fa), sb = fb * fb * (3 - 2 * fb);
    const l = hash(ia, ib, k) + (hash(ia + 1, ib, k) - hash(ia, ib, k)) * sa, r2 = hash(ia, ib + 1, k) + (hash(ia + 1, ib + 1, k) - hash(ia, ib + 1, k)) * sa;
    return l + (r2 - l) * sb;
  };
  const RUST = M.rust;
  const rustCol = slots.map((sl, si) => Array.from({ length: sl.w * sl.h }, (_, k) => {
    const xx = k % sl.w, yy = Math.floor(k / sl.w);
    const n = noise(xx / 7, yy / 7, si) * 0.65 + noise(xx / 3, yy / 3, si + 9) * 0.35;
    const t = n * 5 + 0.8;
    const lo = Math.floor(t), fr = t - lo;
    const v = Math.max(1, Math.min(5, fr > 0.35 && fr < 0.65 ? lo + (bay(xx, yy) < (fr - 0.35) / 0.3 ? 1 : 0) : Math.round(t)));
    const edge = xx < 2 || yy < 2 || xx > sl.w - 3 || yy > sl.h - 3 ? 1 : 0;
    return hash(xx, yy, si + 3) > 0.97 ? RUST[6] : RUST[v - edge];
  }));
  let tt = 0, done2 = false, tDone = 0, idleT = 0;
  let shackle = 0, lockFall = 0, chainDrop = 0, lidOpen = 0, lockJolt = 0;
  const chain = (a: number, b0: number, len: number, dy: number) => {
    for (let k = 0; k < len; k += 4) {
      const y = b0 + k + dy;
      if (y > H - 10) continue;
      if ((k / 4) % 2 === 0) { fill(x, INK, a - 2, y - 1, 6, 6); fill(x, M.iron[4], a - 1, y, 4, 4); fill(x, M.iron[1], a, y + 1, 2, 2); fill(x, M.iron[6], a - 1, y, 1, 1); }
      else { fill(x, INK, a, y - 1, 2, 6); fill(x, M.iron[5], a, y, 1, 4); }
    }
  };
  const draw = () => {
    x.clearRect(0, 0, W, H);
    const s = shakeOf(tt, lockJolt);
    fill(x, M.iron[1], 0, H - 8, W, 8); fill(x, M.iron[3], 0, H - 8, W, 1);
    for (let a = 2; a < W; a += 6) if (bay(a, 3) < 0.5) fill(x, M.iron[2], a, H - 5, 2, 1);
    // 뚜껑 틈 빛 (열리면)
    // 상자 몸통: 나무 판자 + 쇠띠
    box3(x, cx0, cy0 + 8, cw, chh - 8, 4, WOOD, { shadow: 3 });
    for (let yy = cy0 + 14; yy < cy0 + chh; yy += 7) fill(x, WOOD[1], cx0 + 1, yy, cw - 2, 1);
    for (const a of [cx0 + 6, cx0 + cw - 12]) { block(x, a, cy0 + 9, 6, chh - 10, M.iron, { mid: 3, outline: true }); rivet(x, a + 1, cy0 + 16); rivet(x, a + 1, cy0 + chh - 8); }
    // 뚜껑 (열리면 들린다)
    const ly = cy0 - Math.round(lidOpen * 6);
    if (lidOpen > 0) { fill(x, M.brass[6], cx0 + 2, ly + 13, cw - 4, Math.round(lidOpen * 6) + 1); }
    box3(x, cx0 - 2, ly, cw + 4, 13, 7, WOOD, {});
    for (const a of [cx0 + 5, cx0 + cw - 13]) { fill(x, INK, a - 1, ly - 1, 10, 15); fill(x, M.iron[4], a, ly, 8, 13); fill(x, M.iron[6], a, ly, 8, 1); }
    // 봉인판 (철, 네 모서리 쇠)
    block(x, plate.x, plate.y, plate.w, plate.h, M.iron, { mid: 3, shadow: 1 });
    for (let yy = plate.y + 2; yy < plate.y + plate.h - 2; yy++) for (let xx = plate.x + 2; xx < plate.x + plate.w - 2; xx++) if (bay(xx, yy) < 0.1 && (xx * 7 + yy * 3) % 11 < 3) fill(x, RUST[3], xx, yy, 1, 1);
    for (const [a, b] of [[plate.x + 1, plate.y + 1], [plate.x + plate.w - 4, plate.y + 1], [plate.x + 1, plate.y + plate.h - 4], [plate.x + plate.w - 4, plate.y + plate.h - 4]]) rivet(x, a, b);
    for (const [si, sl] of slots.entries()) {
      fill(x, INK, sl.x - 1, sl.y - 1, sl.w + 2, sl.h + 2);
      fill(x, M.iron[1], sl.x, sl.y, sl.w, sl.h); fill(x, M.iron[0], sl.x, sl.y, sl.w, 2); fill(x, M.iron[0], sl.x, sl.y, 2, sl.h); fill(x, M.iron[4], sl.x, sl.y + sl.h - 1, sl.w, 1);
      const im = icon(under[si]);
      if (im.complete) x.drawImage(im, sl.x + 1, sl.y + 1);
      for (let k = 0; k < sl.rust.length; k++) if (sl.rust[k]) fill(x, rustCol[si][k], sl.x + (k % sl.w), sl.y + Math.floor(k / sl.w), 1, 1);
      if (done2) { const c = win ? (Math.floor(tt * 10) % 2 ? M.brass[6] : M.brass[4]) : RUST[3]; fill(x, c, sl.x - 2, sl.y - 2, sl.w + 4, 1); fill(x, c, sl.x - 2, sl.y + sl.h + 1, sl.w + 4, 1); fill(x, c, sl.x - 2, sl.y - 2, 1, sl.h + 4); fill(x, c, sl.x + sl.w + 1, sl.y - 2, 1, sl.h + 4); }
    }
    // 사슬 둘 (뚜껑 위로 감김 → 풀리면 미끄러져 떨어진다)
    const cd = Math.round(chainDrop * chainDrop * 50);
    chain(cx0 + 30, ly - 6, 30, cd); chain(cx0 + cw - 30, ly - 6, 30, cd);
    if (!chainDrop) { fill(x, INK, cx0 + 28, ly - 7, cw - 56, 4); fill(x, M.iron[4], cx0 + 29, ly - 6, cw - 58, 2); fill(x, M.iron[6], cx0 + 29, ly - 6, cw - 58, 1); }
    // 자물쇠 (황동, 가운데 위) — 고리가 튀어 오르고, 몸이 떨어진다
    const lx = cx0 + cw / 2 - 7 + s, lyy = ly - 2 + Math.round(lockFall * lockFall * 60);
    if (lyy < H) {
      const sh = Math.round(shackle * 4);
      for (let k = 0; k < 9; k++) { const yy = lyy - 7 - sh + (k < 2 || k > 6 ? 2 : 0); fill(x, INK, lx + 2 + k, yy - 1, 1, 3); }
      fill(x, INK, lx + 2, lyy - 6 - sh, 2, 7 + sh); fill(x, M.iron[5], lx + 3, lyy - 5 - sh, 1, 6 + sh);
      fill(x, INK, lx + 10, lyy - 6 - sh, 2, sh ? 5 : 7); fill(x, M.iron[5], lx + 10, lyy - 5 - sh, 1, sh ? 4 : 6);
      fill(x, INK, lx + 2, lyy - 7 - sh, 10, 2); fill(x, M.iron[5], lx + 3, lyy - 7 - sh, 8, 1);
      block(x, lx, lyy, 14, 12, M.brass, { mid: 4, shadow: 1 });
      fill(x, INK, lx + 6, lyy + 4, 2, 5); fill(x, INK, lx + 5, lyy + 4, 4, 2);
    }
  };
  let down = false;
  const scrape = (cx: number, cy: number) => {
    const r = stage.getBoundingClientRect();
    const px = ((cx - r.left) / r.width) * W, py = ((cy - r.top) / r.height) * H;
    idleT = 0;
    for (const sl of slots) {
      if (sl.open || px < sl.x - 3 || px > sl.x + sl.w + 3 || py < sl.y - 3 || py > sl.y + sl.h + 3) continue;
      let n = 0;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        if (Math.abs(dx) + Math.abs(dy) > 3) continue;
        const xx = Math.floor(px - sl.x + dx), yy = Math.floor(py - sl.y + dy);
        if (xx < 0 || yy < 0 || xx >= sl.w || yy >= sl.h || !sl.rust[yy * sl.w + xx]) continue;
        sl.rust[yy * sl.w + xx] = 0; n++;
      }
      if (n) {
        if (R.chance(0.7)) ps.spawn(P.GRIT, px, py, R.range(-30, 30), R.range(-40, 10), R.range(0.6, 1.1), hex(RUST[R.int(4) + 2]), R.chance(0.3) ? 2 : 1);
        if (R.chance(0.12)) ps.spawn(P.DUST, px, py, R.range(-10, 10), R.range(-14, -4), 0.6, hex(RUST[3]), 2);
        if (R.chance(0.15)) sfx('tap');
      }
      if (sl.rust.reduce((a, v) => a + v, 0) / sl.rust.length < 0.45) reveal(sl);
    }
  };
  const reveal = (sl: (typeof slots)[number]) => {
    if (sl.open) return;
    sl.open = true;
    [0.75, 0.5, 0.25, 0].forEach((k, i) => window.setTimeout(() => { for (let yy = 0; yy < sl.h; yy++) for (let xx = 0; xx < sl.w; xx++) if (bay(xx, yy) >= k) sl.rust[yy * sl.w + xx] = 0; }, i * 60));
    sfx('stamp');
    for (let k = 0; k < 12; k++) ps.spawn(P.GRIT, sl.x + R.range(0, sl.w), sl.y + R.range(0, sl.h), R.range(-40, 40), R.range(-60, 0), R.range(0.8, 1.3), hex(RUST[R.int(4) + 2]), 1);
    lockJolt = 1;
    if (slots.every((s2) => s2.open)) window.setTimeout(finish, 450);
  };
  const anim = (ms: number, fn: (k: number) => void) => new Promise<void>((res) => { const t0 = performance.now(); const f = () => { const k = Math.min(1, (performance.now() - t0) / ms); fn(k); if (k < 1 && el.isConnected) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
  const finish = async () => {
    if (done2) return;
    done2 = true; tDone = tt;
    hint.textContent = '';
    cap.classList.add(win ? 'good' : 'bad');
    if (win) {
      sfx('jackpot');
      lights.add(W / 2, plate.y + 20, 60, hex(M.brass[5]), 0.9, 0.8);
      await anim(200, (k) => (shackle = Math.round(k * 3) / 3));
      sfx('stamp');
      for (let i = 0; i < 10; i++) ps.spawn(P.SHARD, cx0 + cw / 2, cy0 - 6, R.range(-80, 80), R.range(-120, -40), R.range(0.8, 1.3), hex(M.iron[i % 2 ? 4 : 6]), R.range(1, 2));
      void anim(500, (k) => (lockFall = k));
      await anim(500, (k) => (chainDrop = k));
      lights.add(W / 2, cy0 + 10, 90, hex(M.brass[6]), 1, 1.4);
      void verdict(stage, '봉인 해제', 'gold', { sub: label.win, top: 4 });
      await anim(300, (k) => (lidOpen = Math.round(k * 3) / 3));
      ps.burst(W / 2, cy0 + 8, 24, [70, 170], P.STAR, [0.5, 1], hex(M.brass[6]));
    } else {
      sfx('hurt');
      lockJolt = 2.4;
      for (let k = 0; k < 24; k++) ps.spawn(P.SMOKE, plate.x + R.range(0, plate.w), plate.y + R.range(0, plate.h), R.range(-30, 30), R.range(-40, -10), R.range(1, 2), hex(RUST[3]), R.range(4, 8), k * 0.02);
      lights.add(W / 2, plate.y + 20, 50, hex(RUST[4]), 0.6, 0.6);
      void verdict(stage, '녹 독', 'bad', { sub: label.lose, top: 4 });
    }
  };
  if (still) { draw(); return still(x.canvas); }
  hint.textContent = '▼ 손가락으로 녹을 긁는다';
  stage.addEventListener('pointerdown', (e) => { down = true; stage.setPointerCapture(e.pointerId); scrape(e.clientX, e.clientY); });
  stage.addEventListener('pointermove', (e) => { if (down) scrape(e.clientX, e.clientY); });
  stage.addEventListener('pointerup', () => (down = false));
  hint.addEventListener('click', () => { if (idleT > 8) slots.forEach((sl, i) => window.setTimeout(() => reveal(sl), i * 300)); });
  if (calm()) slots.forEach(reveal);
  await loopUntil(el, (dt) => {
    tt += dt; idleT += dt;
    lockJolt = Math.max(0, lockJolt - dt * 5);
    if (idleT > 8 && !done2) hint.textContent = '▼ 다 긁기 (누르기)';
    // 아직 안 긁은 칸 위에 반짝 (어디를 긁을지)
    if (!done2 && Math.floor(tt * 2) % 3 === 0) { const sl = slots.find((s2) => !s2.open); if (sl && R.chance(dt * 4)) ps.spawn(P.STAR, sl.x + R.range(4, sl.w - 4), sl.y + R.range(4, sl.h - 4), 0, 0, 0.4, hex(M.brass[6]), 1.5); }
    fx.frame.clear();
    ps.update(dt); lights.update(dt);
    draw();
    if (done2 && win && lidOpen > 0) rays(fx, W / 2, cy0 + 10, 60, tt, hex(M.brass[6]), 10);
    ps.draw(fx.painter, 'back'); ps.draw(fx.painter, 'front'); lights.draw(fx.painter);
    if (done2 && win && tt - tDone > 0.9 && tt - tDone < 0.96) fx.painter.rect(0, 0, W, H, WHITE, 0.6);
    fx.present();
    return !(done2 && tt - tDone > (calm() ? 0.6 : 3));
  });
  await closeOut(el);
};
