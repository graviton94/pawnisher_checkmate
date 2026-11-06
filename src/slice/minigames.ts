/**
 * 사건 미니게임 (D-253 → D-256). 사건 창 전체를 덮는 오버레이: 그림판(도트 캔버스, 1도트 = 3px) + FX 층(pxfx).
 * 심의(D-254): 카지노 · 도박 기구의 모습(슬롯 · 7 · 잭팟 · 레버 · 복권 · 꽝 도장)과 거는 것(내기)이 없다 — 공장의 기계와 녹슨 봉인.
 * 결과는 엔진이 이미 정했다 — 떨어질 부품, 녹 아래 각인을 결과에 맞춰 깔 뿐이다 (UI 원칙 9).
 * 기호는 받은 ICON-01 시트를 우리 도트로 다시 찍은 32칸 그림 (`ui/props/ic32-*.png`, D-255).
 */
import { sfx } from '../audio/sfx';
import { bayer, FxCanvas, hex, Lights, P, Particles, Rng, WHITE } from '../view/pxfx';

const D = 3;
const calm = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const imgs = new Map<string, HTMLImageElement>();
/** 32칸 기호 */
export const icon = (n: string): HTMLImageElement => {
  let i = imgs.get(n);
  if (!i) { i = new Image(); i.src = `ui/props/ic32-${n}.png`; imgs.set(n, i); }
  return i;
};
['gear', 'bolt', 'spring', 'key', 'lens', 'tower', 'gear-gold', 'medal-knight', 'medal-pawn', 'crown-paper', 'crown-gold', 'valve', 'gear-broken', 'rust', 'reject', 'chain-broken', 'screw-broken', 'stove', 'coin-front', 'coin-tilt', 'coin-edge', 'coin-back', 'seal-slot', 'seal-corner'].forEach(icon);

const OL = '#16141c';
const S = ['#1b1a22', '#2a2c36', '#3d404c', '#5a5e6c', '#868a98', '#b8bcc8', '#e8eaf0'];
const RUST = ['#2e160e', '#4e2414', '#74361a', '#9a4c22', '#c06a30', '#e0904a'];
const fill = (x: CanvasRenderingContext2D, c: string, a: number, b: number, w: number, h: number) => { x.fillStyle = c; x.fillRect(Math.round(a), Math.round(b), Math.round(w), Math.round(h)); };
/** 리벳 박힌 철판 (왼위 빛 · 오른아래 그림자 · 1칸 테) */
const plate = (x: CanvasRenderingContext2D, a: number, b: number, w: number, h: number, mid = S[3]) => {
  fill(x, OL, a - 1, b - 1, w + 2, h + 2);
  fill(x, mid, a, b, w, h);
  fill(x, S[5], a, b, w, 1); fill(x, S[4], a, b + 1, w, 1); fill(x, S[5], a, b, 1, h);
  fill(x, S[1], a, b + h - 1, w, 1); fill(x, S[2], a + w - 1, b, 1, h);
};
const rivet = (x: CanvasRenderingContext2D, a: number, b: number) => { fill(x, OL, a, b, 3, 3); fill(x, S[5], a, b, 2, 2); fill(x, S[2], a + 2, b + 2, 1, 1); };

/** 오버레이 뼈대 */
const shell = (host: HTMLElement, w: number, h: number, cls: string, title: string) => {
  const el = document.createElement('div');
  el.className = `mg ${cls}`;
  const cap = document.createElement('p');
  cap.className = 'mg-cap';
  cap.textContent = title;
  el.appendChild(cap);
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
  el.appendChild(stage);
  host.appendChild(el);
  const x = art.getContext('2d')!;
  x.imageSmoothingEnabled = false;
  const R = new Rng(w * 7 + h + title.length);
  const ps = new Particles(R, () => h - 3);
  const lights = new Lights();
  const go = document.createElement('button');
  go.type = 'button';
  go.className = 'mg-go';
  el.appendChild(go);
  const stamp = document.createElement('b');
  stamp.className = 'mg-stamp';
  stamp.hidden = true;
  stage.appendChild(stamp);
  return { el, cap, stage, x, fx, R, ps, lights, go, stamp };
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

/**
 * 고장 난 조립 판정기 — 결과: 'part'(금 톱니 셋 = 희귀 부품) · 'up'(금 왕관 셋 = 승급) · 'miss'(톱니 둘 + 금 간 톱니 = 불량).
 * 판정 단추를 누르면 기계가 떨며 김을 뿜고, 깔때기 셋에서 부품이 하나씩 굴러떨어져 받침에 박힌다(쿵 · 불꽃 · 받침 아래 등이 켜짐).
 * 앞 둘이 같으면 셋째 깔때기가 덜컹거리며 애태운다(「…!」). 셋이 같으면 초록 판정등 · 「합격」 · 부품이 금빛으로 솟는다,
 * 아니면 붉은 판정등 · 「불량」 · 불꽃과 연기.
 */
export const assemblyJudge = async (host: HTMLElement, result: 'part' | 'up' | 'miss', label: { title: string; win: string; lose: string }): Promise<void> => {
  const W = 170, H = 100;
  const { el, cap, stage, x, fx, R, ps, lights, go, stamp } = shell(host, W, H, 'mg-judge', label.title);
  const items = result === 'part' ? ['gear-gold', 'gear-gold', 'gear-gold'] : result === 'up' ? ['crown-gold', 'crown-gold', 'crown-gold'] : ['gear', 'gear', 'gear-broken'];
  const cx = (i: number) => 32 + i * 42; // 깔때기 · 받침 가운데
  const cupY = 70;
  // 상태
  let phase: 'idle' | 'run' | 'judge' = 'idle';
  const drop = items.map(() => ({ y: -40, vy: 0, on: false, landed: false, rattle: 0, t0: Infinity }));
  let shake = 0, lamp: 'off' | 'ok' | 'ng' = 'off', btn = 0, tJudge = 0;
  const draw = (t: number) => {
    x.clearRect(0, 0, W, H);
    const sx = Math.round(shake * (Math.floor(t * 30) % 2 ? 1 : -1));
    x.save(); x.translate(sx, 0);
    // 뒤판 (어두운 쇠 · 세로 이음매 · 아래 경고 줄무늬)
    fill(x, S[1], 12, 12, W - 42, H - 16);
    for (let a = 12; a < W - 30; a += 21) fill(x, S[0], a, 12, 1, H - 16);
    for (let a = 12; a < W - 30; a++) for (let b = H - 12; b < H - 4; b++) fill(x, ((a + b) >> 2) % 2 ? '#c8a02c' : OL, a, b, 1, 1);
    // 기둥 · 들보
    plate(x, 6, 4, 6, H - 8, S[2]); plate(x, W - 30, 4, 6, H - 8, S[2]);
    plate(x, 6, 4, W - 30, 8, S[3]);
    for (let i = 0; i < 9; i++) rivet(x, 10 + i * 15, 6);
    // 판정등 (가운데 위)
    const lc = lamp === 'ok' ? '#7ee0a1' : lamp === 'ng' ? '#e5262f' : '#3d404c';
    fill(x, OL, W / 2 - 18, 13, 22, 9); fill(x, lc, W / 2 - 17, 14, 20, 7); fill(x, lamp === 'off' ? S[4] : '#fffbe0', W / 2 - 16, 15, 6, 2);
    if (lamp !== 'off' && Math.floor(t * 8) % 2 === 0) fx.painter.glow(W / 2 - 7, 17, 22, hex(lc), 0.6);
    // 깔때기 셋 (사다리꼴 쇠, 리벳) — 덜컹이면 흔들린다
    for (let i = 0; i < 3; i++) {
      const r = drop[i].rattle > 0 ? (Math.floor(t * 40) % 2 ? 1 : -1) : 0;
      const a = cx(i) + r;
      for (let k = 0; k < 14; k++) { const hw = 15 - Math.floor(k * 0.6); fill(x, OL, a - hw - 1, 22 + k, hw * 2 + 2, 1); fill(x, k < 2 ? S[5] : S[3], a - hw, 22 + k, hw * 2, 1); fill(x, S[2], a + hw - 2, 22 + k, 2, 1); }
      fill(x, OL, a - 6, 36, 12, 4); fill(x, S[1], a - 5, 36, 10, 3);
      rivet(x, a - 11, 24); rivet(x, a + 8, 24);
    }
    // 받침 셋 (황동 요람) + 받침 아래 등
    for (let i = 0; i < 3; i++) {
      const a = cx(i);
      fill(x, OL, a - 18, cupY + 14, 36, 8); fill(x, '#a8792c', a - 17, cupY + 15, 34, 6); fill(x, '#f4c84a', a - 17, cupY + 15, 34, 1); fill(x, '#6a4a1c', a - 17, cupY + 20, 34, 1);
      const on = drop[i].landed;
      fill(x, OL, a - 3, cupY + 23, 6, 4); fill(x, on ? (lamp === 'ng' && i === 2 ? '#e5262f' : '#fffbe0') : '#3d404c', a - 2, cupY + 24, 4, 2);
    }
    // 떨어지는 부품 (깔때기 입 아래부터 보인다)
    for (let i = 0; i < 3; i++) {
      const d = drop[i];
      if (!d.on) continue;
      const im = icon(items[i]);
      const lift = phase === 'judge' && lamp === 'ok' ? Math.min(14, (t - tJudge - 0.4) * 30) : 0;
      if (im.complete) x.drawImage(im, cx(i) - 16, Math.round(d.y - Math.max(0, lift)));
    }
    // 판정 단추 (오른쪽 기둥) — 누르기 전에는 깜빡이는 테
    fill(x, OL, W - 27, 46, 22, 22); fill(x, S[2], W - 26, 47, 20, 20);
    if (phase === 'idle' && Math.floor(t * 3) % 2 === 0) { fill(x, '#f4d27a', W - 28, 45, 24, 1); fill(x, '#f4d27a', W - 28, 68, 24, 1); fill(x, '#f4d27a', W - 28, 45, 1, 24); fill(x, '#f4d27a', W - 5, 45, 1, 24); }
    fill(x, OL, W - 23, 50 + btn * 2, 14, 12 - btn * 2); fill(x, '#c42430', W - 22, 51 + btn * 2, 12, 10 - btn * 2); fill(x, '#ff6b6b', W - 22, 51 + btn * 2, 12, 2);
    // 바닥
    fill(x, S[1], 0, H - 4, W, 4); fill(x, S[3], 0, H - 4, W, 1);
    x.restore();
  };
  // 단추는 그림 속 붉은 단추 하나 — 아래 버튼 줄은 쓰지 않는다 (판이 화면에 다 들어오게)
  go.remove();
  cap.textContent = '▼ 붉은 단추를 누른다';
  const run = () => {
    if (phase !== 'idle') return;
    phase = 'run';
    cap.textContent = label.title;
    sfx('stamp');
    btn = 1; window.setTimeout(() => (btn = 0), 160);
    shake = 1.5;
    for (let i = 0; i < 8; i++) ps.spawn(P.SMOKE, W - 16 + R.range(-4, 4), 44, R.range(-20, 10), R.range(-40, -20), R.range(0.8, 1.4), hex('#a39cab'), R.range(3, 5));
    const st0 = (i: number, ms: number) => window.setTimeout(() => { drop[i].rattle = 0.35; window.setTimeout(() => { drop[i].rattle = 0; drop[i].on = true; drop[i].y = 26; drop[i].vy = 40; }, 350); }, ms);
    st0(0, 500); st0(1, 1200);
    // 셋째: 앞 둘이 같으면 길게 덜컹 (애태움)
    const tense = items[0] === items[1];
    window.setTimeout(() => { if (tense) { cap.textContent = '…!'; sfx('threat'); drop[2].rattle = 1.6; } }, 1900);
    window.setTimeout(() => { drop[2].rattle = 0; drop[2].on = true; drop[2].y = 26; drop[2].vy = 40; }, tense ? 3400 : 2100);
  };
  go.addEventListener('click', run);
  stage.addEventListener('pointerdown', run);
  const auto = window.setTimeout(run, 6000);
  if (calm()) run();
  await loopUntil(el, (dt, t) => {
    shake = Math.max(0, shake - dt * 4);
    for (let i = 0; i < 3; i++) {
      const d = drop[i];
      if (d.rattle > 0) { d.rattle -= dt; if (R.chance(dt * 20)) ps.spawn(P.GRIT, cx(i) + R.range(-8, 8), 38, R.range(-20, 20), R.range(-10, 20), 0.5, hex('#868a98'), 1); }
      if (!d.on || d.landed) continue;
      d.vy += 900 * dt; d.y += d.vy * dt;
      if (d.y >= cupY - 18) {
        d.y = cupY - 18; d.landed = true;
        shake = 1.2; sfx('land');
        ps.burst(cx(i), cupY + 12, 12, [60, 150], P.SPARK, [0.2, 0.45], WHITE, 40);
        lights.add(cx(i), cupY + 10, 20, hex('#ffe68a'), 0.8, 0.4);
        for (let k = 0; k < 4; k++) ps.spawn(P.DUST, cx(i) + R.range(-12, 12), cupY + 14, R.range(-30, 30), R.range(-12, -2), 0.5, hex('#5a5e6c'), 3);
      }
    }
    if (phase === 'run' && drop.every((d) => d.landed)) {
      phase = 'judge'; tJudge = t;
      const ok = result !== 'miss';
      lamp = ok ? 'ok' : 'ng';
      cap.textContent = ok ? label.win : label.lose;
      cap.classList.add(ok ? 'good' : 'bad');
      stamp.textContent = ok ? '합격' : '불량';
      stamp.classList.toggle('ok', ok);
      stamp.hidden = false;
      if (ok) {
        sfx('jackpot');
        lights.add(W / 2, cupY, 80, hex(result === 'up' ? '#ffe68a' : '#f4c84a'), 1, 1.2);
        for (let i = 0; i < 3; i++) for (let k = 0; k < 8; k++) ps.spawn(P.MOTE, cx(i) + R.range(-10, 10), cupY, R.range(-10, 10), R.range(-90, -40), R.range(0.5, 1), hex('#ffe68a'), 1, k * 0.04);
        ps.burst(W / 2, cupY - 10, 20, [60, 160], P.STAR, [0.5, 1], hex('#ffe68a'));
      } else {
        sfx('hurt');
        shake = 2.5;
        ps.burst(cx(2), cupY - 2, 26, [80, 220], P.SPARK, [0.25, 0.6], WHITE, 60);
        for (let k = 0; k < 12; k++) ps.spawn(P.SMOKE, cx(2) + R.range(-10, 10), cupY - 6, R.range(-20, 20), R.range(-50, -20), R.range(1, 1.8), 0, R.range(4, 7), k * 0.03);
        lights.add(cx(2), cupY, 40, hex('#e5262f'), 0.9, 0.6);
      }
    }
    fx.frame.clear();
    ps.update(dt); lights.update(dt);
    draw(t);
    ps.draw(fx.painter, 'back'); ps.draw(fx.painter, 'front'); lights.draw(fx.painter);
    if (phase === 'judge' && t - tJudge < 0.06 && result !== 'miss') fx.painter.rect(0, 0, W, H, WHITE, 0.8);
    fx.present();
    return !(phase === 'judge' && t - tJudge > (calm() ? 0.5 : 2.4));
  });
  window.clearTimeout(auto);
  await closeOut(el);
};

/**
 * 녹슨 봉인판 — 쇠사슬에 묶인 상자의 봉인판, 각인 칸 셋이 녹에 덮여 있다. 손가락으로 긁으면(5도트 붓) 녹 부스러기가 떨어지고 각인이 드러난다.
 * 칸이 절반 넘게 긁히면 남은 녹이 계단 디더로 떨어진다. 셋이 다 드러나면: 각인이 맞으면 판이 금빛으로 빛나고 사슬이 끊어진다(봉인 해제),
 * 어긋나면 녹 가루 구름이 터진다. 8초 동안 안 긁으면 「다 긁기」.
 */
export const sealScrape = async (host: HTMLElement, under: [string, string, string], win: boolean, label: { title: string; win: string; lose: string }): Promise<void> => {
  const W = 170, H = 84;
  const { el, cap, stage, x, fx, R, ps, lights, go, stamp } = shell(host, W, H, 'mg-seal', label.title);
  const corner = new Image();
  corner.src = 'ui/props/ic-seal-corner.png'; // 24칸 모서리 쇠 (ICON-01)
  const px0 = 12, py0 = 6, pw = 146, ph = 72;
  const slots = [0, 1, 2].map((i) => ({ x: px0 + 13 + i * 44, y: py0 + 18, w: 36, h: 36, rust: new Uint8Array(36 * 36).fill(1), open: false }));
  // 녹 무늬 (칸마다 고정): 6칸 격자 값 노이즈를 이어 붙인 얼룩 + 점 녹 · 구멍 — 고른 두 단계 사이만 베이어 디더
  const hash = (a: number, b: number, k: number) => { const v = Math.sin(a * 127.1 + b * 311.7 + k * 74.7) * 43758.5453; return v - Math.floor(v); };
  const noise = (a: number, b: number, k: number) => {
    const ia = Math.floor(a), ib = Math.floor(b), fa = a - ia, fb = b - ib;
    const sa = fa * fa * (3 - 2 * fa), sb = fb * fb * (3 - 2 * fb);
    const l = hash(ia, ib, k) + (hash(ia + 1, ib, k) - hash(ia, ib, k)) * sa, r2 = hash(ia, ib + 1, k) + (hash(ia + 1, ib + 1, k) - hash(ia, ib + 1, k)) * sa;
    return l + (r2 - l) * sb;
  };
  const rustCol = slots.map((sl, si) => Array.from({ length: sl.w * sl.h }, (_, k) => {
    const xx = k % sl.w, yy = Math.floor(k / sl.w);
    const n = noise(xx / 7, yy / 7, si) * 0.65 + noise(xx / 3, yy / 3, si + 9) * 0.35;
    const t = n * (RUST.length - 1) + 0.6;
    const lo = Math.floor(t), fr = t - lo;
    const v = Math.max(0, Math.min(RUST.length - 1, fr > 0.35 && fr < 0.65 ? lo + (bayer(xx, yy) < (fr - 0.35) / 0.3 ? 1 : 0) : Math.round(t)));
    // 테두리 쪽은 한 단계 어둡게(칸 안으로 움푹), 드문 밝은 점 녹
    const edge = xx < 2 || yy < 2 || xx > sl.w - 3 || yy > sl.h - 3 ? 1 : 0;
    return hash(xx, yy, si + 3) > 0.97 ? RUST[5] : RUST[Math.max(0, v - edge)];
  }));
  let tt = 0, done2 = false, tDone = 0, idleT = 0, chainCut = 0;
  const draw = () => {
    x.clearRect(0, 0, W, H);
    // 쇠사슬 (판 뒤로 가로질러) — 풀리면 끊어져 떨어진다
    const drawChain = (y: number, cut: number) => { for (let a = 0; a < W; a += 8) { if (cut && Math.abs(a - W / 2) < 10) continue; const dy = cut ? Math.round(cut * cut * (Math.abs(a - W / 2) < W / 4 ? 30 : 12)) : 0; fill(x, OL, a, y + dy, 7, 5); fill(x, S[4], a + 1, y + 1 + dy, 5, 3); fill(x, S[1], a + 2, y + 2 + dy, 3, 1); } };
    // 판: 녹슨 쇠 + 네 모서리 쇠 조각(받은 그림)
    plate(x, px0, py0, pw, ph, S[3]);
    for (let yy = py0 + 2; yy < py0 + ph - 2; yy++) for (let xx = px0 + 2; xx < px0 + pw - 2; xx++) if (bayer(xx, yy) < 0.12 && (xx * 7 + yy * 3) % 11 < 3) fill(x, RUST[2], xx, yy, 1, 1);
    if (corner.complete) {
      const put = (a: number, b: number, sx: number, sy: number) => { x.save(); x.translate(a, b); x.scale(sx, sy); x.drawImage(corner, 0, 0); x.restore(); };
      put(px0 - 2, py0 + ph + 2, 1, -1); put(px0 + pw + 2, py0 + ph + 2, -1, -1); put(px0 - 2, py0 - 2, 1, 1); put(px0 + pw + 2, py0 - 2, -1, 1);
    }
    drawChain(py0 + 6, chainCut);
    drawChain(py0 + ph - 10, chainCut);
    // 각인 칸: 움푹(안쪽 그늘) → 각인 → 녹
    for (const [si, sl] of slots.entries()) {
      fill(x, OL, sl.x - 1, sl.y - 1, sl.w + 2, sl.h + 2);
      fill(x, S[1], sl.x, sl.y, sl.w, sl.h); fill(x, S[0], sl.x, sl.y, sl.w, 2); fill(x, S[0], sl.x, sl.y, 2, sl.h);
      const im = icon(under[si]);
      if (im.complete) x.drawImage(im, sl.x + 2, sl.y + 2);
      for (let k = 0; k < sl.rust.length; k++) if (sl.rust[k]) fill(x, rustCol[si][k], sl.x + (k % sl.w), sl.y + Math.floor(k / sl.w), 1, 1);
      if (done2) { const c = win ? (Math.floor(tt * 10) % 2 ? '#fffbe0' : '#f4c84a') : '#9a4c22'; fill(x, c, sl.x - 2, sl.y - 2, sl.w + 4, 1); fill(x, c, sl.x - 2, sl.y + sl.h + 1, sl.w + 4, 1); fill(x, c, sl.x - 2, sl.y - 2, 1, sl.h + 4); fill(x, c, sl.x + sl.w + 1, sl.y - 2, 1, sl.h + 4); }
    }
  };
  let down = false;
  const scrape = (cx0: number, cy0: number) => {
    const r = stage.getBoundingClientRect();
    const px = ((cx0 - r.left) / r.width) * W, py = ((cy0 - r.top) / r.height) * H;
    idleT = 0;
    for (const sl of slots) {
      if (sl.open || px < sl.x - 3 || px > sl.x + sl.w + 3 || py < sl.y - 3 || py > sl.y + sl.h + 3) continue;
      let n = 0;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const xx = Math.floor(px - sl.x + dx), yy = Math.floor(py - sl.y + dy);
        if (xx < 0 || yy < 0 || xx >= sl.w || yy >= sl.h || !sl.rust[yy * sl.w + xx]) continue;
        sl.rust[yy * sl.w + xx] = 0; n++;
      }
      if (n) {
        if (R.chance(0.6)) ps.spawn(P.GRIT, px, py, R.range(-30, 30), R.range(-40, 10), R.range(0.6, 1.1), hex(RUST[R.int(4) + 1]), R.chance(0.3) ? 2 : 1);
        if (R.chance(0.12)) ps.spawn(P.DUST, px, py, R.range(-10, 10), R.range(-14, -4), 0.6, hex(RUST[3]), 2);
        if (R.chance(0.15)) sfx('tap');
      }
      if (sl.rust.reduce((a, v) => a + v, 0) / sl.rust.length < 0.45) reveal(sl);
    }
  };
  const reveal = (sl: (typeof slots)[number]) => {
    if (sl.open) return;
    sl.open = true;
    [0.75, 0.5, 0.25, 0].forEach((k, i) => window.setTimeout(() => { for (let yy = 0; yy < sl.h; yy++) for (let xx = 0; xx < sl.w; xx++) if (bayer(xx, yy) >= k) sl.rust[yy * sl.w + xx] = 0; }, i * 60));
    sfx('stamp');
    for (let k = 0; k < 12; k++) ps.spawn(P.GRIT, sl.x + R.range(0, sl.w), sl.y + R.range(0, sl.h), R.range(-40, 40), R.range(-60, 0), R.range(0.8, 1.3), hex(RUST[R.int(4) + 1]), 1);
    if (slots.every((s2) => s2.open)) window.setTimeout(finish, 450);
  };
  const finish = () => {
    if (done2) return;
    done2 = true; tDone = tt;
    go.remove();
    cap.textContent = win ? label.win : label.lose;
    cap.classList.add(win ? 'good' : 'bad');
    if (win) {
      sfx('jackpot');
      stamp.textContent = '봉인 해제'; stamp.classList.add('ok'); stamp.hidden = false;
      lights.add(W / 2, H / 2, 90, hex('#ffe68a'), 1, 1.3);
      for (let i = 0; i < 20; i++) ps.spawn(P.SHARD, W / 2 + R.range(-12, 12), py0 + 8, R.range(-120, 120), R.range(-160, -40), R.range(1, 1.6), hex(S[i % 2 ? 4 : 5]), R.range(1.5, 2.5));
      ps.burst(W / 2, H / 2, 24, [70, 180], P.STAR, [0.5, 1], hex('#ffe68a'));
      const t0 = performance.now();
      const cut = () => { chainCut = Math.min(1, (performance.now() - t0) / 500); if (chainCut < 1) requestAnimationFrame(cut); };
      requestAnimationFrame(cut);
    } else {
      sfx('hurt');
      for (let k = 0; k < 22; k++) ps.spawn(P.SMOKE, W / 2 + R.range(-50, 50), H / 2 + R.range(-10, 10), R.range(-30, 30), R.range(-40, -10), R.range(1, 2), hex(RUST[3]), R.range(4, 8), k * 0.02);
      lights.add(W / 2, H / 2, 50, hex('#9a4c22'), 0.6, 0.6);
    }
  };
  go.textContent = '▼ 손가락으로 녹을 긁는다';
  go.addEventListener('click', () => slots.forEach((sl, i) => window.setTimeout(() => reveal(sl), i * 300)));
  stage.addEventListener('pointerdown', (e) => { down = true; stage.setPointerCapture(e.pointerId); scrape(e.clientX, e.clientY); });
  stage.addEventListener('pointermove', (e) => { if (down) scrape(e.clientX, e.clientY); });
  stage.addEventListener('pointerup', () => (down = false));
  if (calm()) slots.forEach(reveal);
  await loopUntil(el, (dt) => {
    tt += dt; idleT += dt;
    if (idleT > 8 && !done2) go.textContent = '▼ 다 긁기';
    fx.frame.clear();
    ps.update(dt); lights.update(dt);
    draw();
    ps.draw(fx.painter, 'back'); ps.draw(fx.painter, 'front'); lights.draw(fx.painter);
    if (done2 && win && tt - tDone < 0.06) fx.painter.rect(0, 0, W, H, WHITE, 0.8);
    fx.present();
    return !(done2 && tt - tDone > (calm() ? 0.5 : 2.2));
  });
  await closeOut(el);
};
