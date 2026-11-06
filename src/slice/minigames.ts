/**
 * 사건 미니게임 (D-253, 사용자: 「확률이 걸린 이벤트는 정적이면 안 된다 — 슬롯머신은 3구 777처럼, 상자는 복권 긁듯이, 슬더스처럼 연출」).
 * 둘 다 사건 창 전체를 덮는 오버레이. 그림판(도트 캔버스, 1도트 = 3px) + FX 층(pxfx: 불꽃 · 동전 · 은박 부스러기 · 빛).
 * 결과는 엔진이 이미 정했다 — 바퀴가 설 칸, 복권 밑 그림을 결과에 맞춰 깔 뿐이다 (UI 원칙 9).
 */
import { sfx } from '../audio/sfx';
import { bayer, FxCanvas, hex, Lights, P, PAL, Particles, Rng, WHITE } from '../view/pxfx';

const D = 3;
const calm = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const imgs = new Map<string, HTMLImageElement>();
const img = (n: string): HTMLImageElement => {
  let i = imgs.get(n);
  if (!i) { i = new Image(); i.src = `ui/props/${n}.png`; imgs.set(n, i); }
  return i;
};
const SYMS = ['seven', 'gear', 'crown', 'screw', 'broken'] as const;
type Sym = (typeof SYMS)[number];
SYMS.forEach((s) => img(`reel-${s}`));

/** 오버레이 뼈대: 그림판 캔버스 + FX 캔버스 + 글 칸 */
const shell = (host: HTMLElement, w: number, h: number, cls: string) => {
  const el = document.createElement('div');
  el.className = `mg ${cls}`;
  host.appendChild(el);
  const art = document.createElement('canvas');
  art.width = w; art.height = h;
  Object.assign(art.style, { width: `${w * D}px`, height: `${h * D}px`, imageRendering: 'pixelated' });
  const fx = new FxCanvas(w, h, D);
  fx.canvas.classList.add('mg-fx');
  const stage = document.createElement('div');
  stage.className = 'mg-stage';
  stage.style.width = `${w * D}px`;
  stage.style.height = `${h * D}px`;
  stage.append(art, fx.canvas);
  el.appendChild(stage);
  const x = art.getContext('2d')!;
  x.imageSmoothingEnabled = false;
  const R = new Rng(w * 7 + h);
  const ps = new Particles(R, () => h - 4);
  const lights = new Lights();
  return { el, stage, art, x, fx, R, ps, lights };
};

/** 칸 채우기 (그림판, 도트 좌표) */
const fill = (x: CanvasRenderingContext2D, c: string, a: number, b: number, w: number, h: number) => { x.fillStyle = c; x.fillRect(a, b, w, h); };
const G = ['#5a3a0c', '#9a6a14', '#d49a22', '#f4c84a', '#ffe68a', '#fffbe0'];
const OL = '#1a1014';

/**
 * 3구 슬롯 — 결과: 'seven'(잭팟 = 희귀 부품) · 'crown'(승급) · 'miss'(꽝 — 7 · 7 · 나사로 애태운다).
 * 레버를 당기면(누르면) 손잡이가 내려가고 세 바퀴가 돈다 → 왼쪽부터 하나씩 넘쳤다 되돌아오며 선다 → 앞 둘이 같으면 마지막 바퀴가 길게 애태운다
 * → 잭팟: 줄이 번쩍 · 전구가 모두 깜빡 · 나사 소나기 / 꽝: 붉은 줄 · 연기.
 */
export const slotMachine = (host: HTMLElement, result: 'seven' | 'crown' | 'miss', label: { title: string; win: string; lose: string }): Promise<void> =>
  new Promise((done) => {
    const W = 150, H = 104;
    const { el, stage, x, fx, R, ps, lights } = shell(host, W, H, 'mg-slot');
    const cap = document.createElement('p');
    cap.className = 'mg-cap';
    cap.textContent = label.title;
    el.prepend(cap);
    const hint = document.createElement('button');
    hint.type = 'button';
    hint.className = 'mg-go';
    hint.textContent = '▼ 레버를 당긴다';
    el.appendChild(hint);
    // 바퀴 띠 (12칸) — 같은 그림이 고르게 섞인다
    const strip: Sym[] = ['seven', 'gear', 'screw', 'crown', 'broken', 'gear', 'screw', 'seven', 'broken', 'crown', 'screw', 'gear'];
    const target: Sym[] = result === 'seven' ? ['seven', 'seven', 'seven'] : result === 'crown' ? ['crown', 'crown', 'crown'] : ['seven', 'seven', 'screw'];
    const STEP = 18; // 그림 16 + 틈 2
    const L = strip.length * STEP;
    const bx = 15, by = 14, bw = 104, bh = 82; // 몸통
    const reelX = (r: number) => bx + 10 + r * 30;
    const reelY = by + 18, reelH = 52; // 창: 3칸이 보인다 (가운데가 맞는 줄)
    const off = [0, 0, 0];
    const speed = [0, 0, 0];
    const stopAt = [Infinity, Infinity, Infinity];
    const settled = [false, false, false];
    const finalOff = target.map((s, r) => { const i = strip.indexOf(s, r * 3 % strip.length) >= 0 ? strip.indexOf(s, (r * 3) % strip.length) : strip.indexOf(s); return ((i * STEP - (reelH / 2 - 8)) % L + L) % L; });
    let lever = 0; // 0 위 · 1 아래
    let phase: 'idle' | 'spin' | 'done' = 'idle';
    let t = 0, tEnd = 0, flash = 0;
    const bulbs = (on: (i: number) => boolean) => { for (let i = 0; i < 11; i++) { const lx = bx + 6 + i * 9; fill(x, OL, lx - 1, by + 4, 4, 4); fill(x, on(i) ? '#fffbe0' : '#7a5a1c', lx, by + 5, 2, 2); if (on(i)) fx.painter.glow(lx + 1, by + 6, 5, hex('#ffe68a'), 0.5); } };
    const drawArt = () => {
      x.clearRect(0, 0, W, H);
      // 몸통: 테 · 황동 단계 · 왼위 빛 · 오른쪽 그림자
      fill(x, OL, bx - 1, by - 1, bw + 2, bh + 2);
      fill(x, G[2], bx, by, bw, bh);
      fill(x, G[3], bx, by, bw, 2); fill(x, G[3], bx, by, 2, bh);
      fill(x, G[1], bx + bw - 3, by + 2, 3, bh - 2); fill(x, G[1], bx, by + bh - 3, bw, 3);
      // 간판 띠 (붉은 천) + 전구
      fill(x, OL, bx + 3, by + 2, bw - 6, 11); fill(x, '#8c1820', bx + 4, by + 3, bw - 8, 9); fill(x, '#c42430', bx + 4, by + 3, bw - 8, 2);
      bulbs((i) => (phase === 'done' && result !== 'miss' ? Math.floor(t * 10) % 2 === 0 : phase === 'spin' ? (i + Math.floor(t * 14)) % 3 === 0 : (i + Math.floor(t * 4)) % 4 === 0));
      // 바퀴 창
      fill(x, OL, bx + 7, reelY - 3, 90, reelH + 6);
      for (let r = 0; r < 3; r++) {
        const rx = reelX(r);
        fill(x, '#e9e2d4', rx, reelY, 24, reelH);
        x.save();
        x.beginPath(); x.rect(rx, reelY, 24, reelH); x.clip();
        const o = off[r];
        const first = Math.floor(o / STEP) - 1;
        for (let k = first; k < first + 5; k++) {
          const s = strip[((k % strip.length) + strip.length) % strip.length];
          const yy = reelY + k * STEP - o;
          const fast = speed[r] > 250;
          const im = img(`reel-${s}`);
          if (im.complete) {
            if (fast) { x.globalAlpha = 1; x.drawImage(im, rx + 4, Math.round(yy - 3)); x.drawImage(im, rx + 4, Math.round(yy + 3)); }
            else x.drawImage(im, rx + 4, Math.round(yy));
          }
        }
        // 위아래 그늘 (원통): 두 줄 어둡게 (디더)
        for (let yy = 0; yy < 6; yy++) for (let xx = 0; xx < 24; xx++) if (bayer(xx, yy) < (6 - yy) / 7) { fill(x, '#8a8270', rx + xx, reelY + yy, 1, 1); fill(x, '#8a8270', rx + xx, reelY + reelH - 1 - yy, 1, 1); }
        x.restore();
        fill(x, OL, rx + 24, reelY, 2, reelH);
      }
      // 맞는 줄 (가운데) 화살촉
      const ly = reelY + reelH / 2;
      const hot = phase === 'done' ? (result === 'miss' ? '#e5262f' : flash > 0 && Math.floor(t * 12) % 2 ? '#fffbe0' : '#f4c84a') : '#f4c84a';
      fill(x, hot, bx + 3, ly - 2, 3, 4); fill(x, hot, bx + bw - 6, ly - 2, 3, 4);
      if (phase === 'done') fill(x, hot, bx + 9, ly, 86, 1);
      // 버튼 · 배출구
      for (let r = 0; r < 3; r++) { fill(x, OL, reelX(r) + 6, by + 74, 12, 6); fill(x, '#c42430', reelX(r) + 7, by + 75, 10, 4); fill(x, '#ff6b6b', reelX(r) + 7, by + 75, 10, 1); }
      // 다리
      fill(x, OL, bx + 4, by + bh, 12, 6); fill(x, G[1], bx + 5, by + bh, 10, 5);
      fill(x, OL, bx + bw - 16, by + bh, 12, 6); fill(x, G[1], bx + bw - 15, by + bh, 10, 5);
      // 레버: 위 → 아래 (계단 3장)
      const lx = bx + bw + 3;
      const ly0 = by + 12 + Math.round(lever * 26);
      fill(x, OL, lx - 1, by + 36, 6, 10); fill(x, '#5a5e6c', lx, by + 37, 4, 8);
      const top = Math.min(ly0, by + 40), bot = Math.max(ly0, by + 40);
      fill(x, OL, lx, top, 4, bot - top + 1); fill(x, '#b8bcc8', lx + 1, top, 2, bot - top);
      fill(x, OL, lx - 2, ly0 - 5, 8, 8); fill(x, '#c42430', lx - 1, ly0 - 4, 6, 6); fill(x, '#ff6b6b', lx - 1, ly0 - 4, 3, 2);
    };
    let last = performance.now();
    const loop = (now: number) => {
      if (!el.isConnected) return done();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;
      fx.frame.clear();
      if (phase === 'spin') {
        for (let r = 0; r < 3; r++) {
          if (settled[r]) continue;
          if (t < stopAt[r]) { speed[r] = Math.min(520, speed[r] + 1600 * dt); off[r] = (off[r] + speed[r] * dt) % L; continue; }
          // 서기: 목표 칸까지 감속 → 4도트 넘쳤다 되돌아옴
          const want = finalOff[r];
          const dist = ((want - off[r]) % L + L) % L;
          const v = Math.max(60, Math.min(speed[r], dist * 6));
          if (dist > 1 && dist > v * dt) { speed[r] = v; const prev = Math.floor((off[r] + 8) / STEP); off[r] = (off[r] + v * dt) % L; if (Math.floor((off[r] + 8) / STEP) !== prev) sfx('tap'); }
          else {
            off[r] = want; speed[r] = 0; settled[r] = true;
            sfx('land');
            ps.burst(reelX(r) + 12, reelY + reelH / 2, 8, [40, 120], P.SPARK, [0.15, 0.35]);
            // 앞 둘이 같으면 마지막 바퀴를 길게 애태운다
            if (r === 1 && target[0] === target[1]) { stopAt[2] = t + 1.4; cap.textContent = '…!'; }
          }
        }
        // 서 있는 바퀴는 출렁 한 번
        if (settled.every(Boolean)) {
          phase = 'done';
          tEnd = t;
          flash = 1.2;
          cap.textContent = result === 'miss' ? label.lose : label.win;
          cap.classList.add(result === 'miss' ? 'bad' : 'good');
          if (result === 'miss') {
            sfx('hurt');
            for (let i = 0; i < 10; i++) ps.spawn(P.SMOKE, bx + 20 + R.range(0, 64), by + 2, R.range(-20, 20), R.range(-40, -15), R.range(0.8, 1.6), 0, R.range(3, 6));
          } else {
            sfx('jackpot');
            lights.add(bx + bw / 2, reelY + reelH / 2, 70, hex(result === 'seven' ? '#ffe68a' : '#7fe6ea'), 1, 1.2);
            // 나사 · 동전 소나기 (배출구에서 튀어 바닥에서 튄다)
            for (let i = 0; i < 40; i++) ps.spawn(P.GRIT, bx + bw / 2 + R.range(-6, 6), by + 70, R.range(-90, 90), R.range(-260, -120), R.range(1.4, 2.4), i % 3 ? hex('#f4c84a') : hex('#d8dce4'), 2, i * 0.02);
            for (let i = 0; i < 14; i++) ps.spawn(P.STAR, R.range(10, W - 10), R.range(6, H - 20), 0, 0, R.range(0.5, 1), hex('#ffe68a'), R.range(1.2, 2.6), R.range(0, 0.6));
          }
        }
      }
      if (phase === 'done') flash -= dt;
      ps.update(dt); lights.update(dt);
      drawArt();
      ps.draw(fx.painter, 'back'); ps.draw(fx.painter, 'front'); lights.draw(fx.painter);
      if (phase === 'done' && t - tEnd < 0.06 && result !== 'miss') fx.painter.rect(0, 0, W, H, WHITE, 0.8);
      fx.present();
      if (phase === 'done' && t - tEnd > (calm() ? 0.4 : 2.2)) { el.classList.add('out'); window.setTimeout(() => { el.remove(); done(); }, 300); return; }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    const pull = () => {
      if (phase !== 'idle') return;
      hint.remove();
      sfx('lift');
      // 레버: 3계단 내려갔다 2계단 올라온다
      [0.34, 0.67, 1].forEach((v, i) => window.setTimeout(() => (lever = v), i * 60));
      [0.5, 0].forEach((v, i) => window.setTimeout(() => (lever = v), 300 + i * 80));
      window.setTimeout(() => { phase = 'spin'; stopAt[0] = t + 1.0; stopAt[1] = t + 1.5; stopAt[2] = t + 2.0; sfx('stamp'); }, 200);
      if (calm()) { phase = 'spin'; stopAt[0] = stopAt[1] = stopAt[2] = 0; }
    };
    hint.addEventListener('click', pull);
    stage.addEventListener('pointerdown', pull);
    window.setTimeout(pull, 7000);
  });

/**
 * 복권 긁기 — 은박 세 칸을 손가락으로 긁어 낸다(4도트 붓, 긁힌 자리에서 은박 부스러기가 떨어진다).
 * 칸이 절반 넘게 긁히면 남은 은박이 디더로 걷힌다. 셋이 다 열리면: 셋이 같으면 당첨(금 테 번쩍 · 별), 아니면 꽝(붉은 도장).
 * 8초 동안 안 긁으면 「다 긁기」가 나온다.
 */
export const scratchCard = (host: HTMLElement, under: [string, string, string], win: boolean, label: { title: string; win: string; lose: string }): Promise<void> =>
  new Promise((done) => {
    const W = 150, H = 86;
    const { el, stage, x, fx, R, ps, lights } = shell(host, W, H, 'mg-scratch');
    const cap = document.createElement('p');
    cap.className = 'mg-cap';
    cap.textContent = label.title;
    el.prepend(cap);
    const tx = 8, ty = 6, tw = 134, th = 74;
    const panels = [0, 1, 2].map((i) => ({ x: tx + 12 + i * 40, y: ty + 24, w: 30, h: 30, foil: new Uint8Array(30 * 30).fill(1), open: false }));
    const drawTicket = () => {
      x.clearRect(0, 0, W, H);
      // 종이 표: 테 · 크림 종이 · 톱니 가장자리 · 황동 머리띠
      fill(x, OL, tx - 1, ty - 1, tw + 2, th + 2);
      fill(x, '#e9e2d4', tx, ty, tw, th);
      fill(x, '#fffaf0', tx, ty, tw, 2);
      fill(x, '#c8bca2', tx, ty + th - 2, tw, 2);
      for (let i = 0; i < tw; i += 4) { fill(x, OL, tx + i, ty + th, 2, 1); fill(x, OL, tx + i, ty - 1, 2, 1); }
      fill(x, G[2], tx + 2, ty + 3, tw - 4, 14); fill(x, G[3], tx + 2, ty + 3, tw - 4, 2); fill(x, G[1], tx + 2, ty + 15, tw - 4, 2);
      // 칸: 밑그림 → 은박
      for (const pn of panels) {
        fill(x, OL, pn.x - 1, pn.y - 1, pn.w + 2, pn.h + 2);
        fill(x, '#fffaf0', pn.x, pn.y, pn.w, pn.h);
        const sym = under[panels.indexOf(pn)];
        const im = img(`reel-${sym}`);
        if (im.complete) x.drawImage(im, pn.x + 7, pn.y + 7);
        for (let yy = 0; yy < pn.h; yy++) for (let xx = 0; xx < pn.w; xx++) {
          if (!pn.foil[yy * pn.w + xx]) continue;
          const stripe = (xx + yy) % 6 < 2;
          fill(x, stripe ? '#b8bcc8' : bayer(xx, yy) < 0.3 ? '#e8eaf0' : '#868a98', pn.x + xx, pn.y + yy, 1, 1);
        }
      }
      if (done2) { const c = win ? (Math.floor(tt * 10) % 2 ? '#fffbe0' : '#f4c84a') : '#e5262f'; for (const pn of panels) { fill(x, c, pn.x - 2, pn.y - 2, pn.w + 4, 1); fill(x, c, pn.x - 2, pn.y + pn.h + 1, pn.w + 4, 1); fill(x, c, pn.x - 2, pn.y - 2, 1, pn.h + 4); fill(x, c, pn.x + pn.w + 1, pn.y - 2, 1, pn.h + 4); } }
    };
    let tt = 0, done2 = false, tDone = 0, idleT = 0;
    // 긁기: 화면 좌표 → 도트
    let down = false;
    const scratch = (cx: number, cy: number) => {
      const r = stage.getBoundingClientRect();
      const px = ((cx - r.left) / r.width) * W, py = ((cy - r.top) / r.height) * H;
      idleT = 0;
      for (const pn of panels) {
        if (pn.open || px < pn.x - 3 || px > pn.x + pn.w + 3 || py < pn.y - 3 || py > pn.y + pn.h + 3) continue;
        let n = 0;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
          const xx = Math.floor(px - pn.x + dx), yy = Math.floor(py - pn.y + dy);
          if (xx < 0 || yy < 0 || xx >= pn.w || yy >= pn.h || !pn.foil[yy * pn.w + xx]) continue;
          pn.foil[yy * pn.w + xx] = 0; n++;
        }
        if (n) {
          if (R.chance(0.5)) ps.spawn(P.GRIT, px, py, R.range(-30, 30), R.range(-40, 10), R.range(0.6, 1), R.chance(0.5) ? hex('#b8bcc8') : hex('#e8eaf0'), 1);
          if (R.chance(0.15)) sfx('tap');
        }
        const left = pn.foil.reduce((a, v) => a + v, 0) / pn.foil.length;
        if (left < 0.45) reveal(pn);
      }
    };
    const reveal = (pn: (typeof panels)[number]) => {
      if (pn.open) return;
      pn.open = true;
      // 남은 은박을 계단 디더로 걷는다 (4장)
      [0.75, 0.5, 0.25, 0].forEach((k, i) => window.setTimeout(() => { for (let yy = 0; yy < pn.h; yy++) for (let xx = 0; xx < pn.w; xx++) if (bayer(xx, yy) >= k) pn.foil[yy * pn.w + xx] = 0; }, i * 60));
      sfx('stamp');
      ps.burst(pn.x + pn.w / 2, pn.y + pn.h / 2, 10, [40, 110], P.STAR, [0.3, 0.6], hex('#e8eaf0'));
      if (panels.every((p) => p.open)) window.setTimeout(finish, 420);
    };
    const finish = () => {
      if (done2) return;
      done2 = true; tDone = tt;
      cap.textContent = win ? label.win : label.lose;
      cap.classList.add(win ? 'good' : 'bad');
      all.remove();
      if (win) {
        sfx('jackpot');
        lights.add(W / 2, ty + 40, 80, hex('#ffe68a'), 1, 1.2);
        for (let i = 0; i < 24; i++) ps.spawn(P.STAR, R.range(tx, tx + tw), R.range(ty, ty + th), 0, 0, R.range(0.5, 1.1), hex('#ffe68a'), R.range(1.2, 2.6), R.range(0, 0.5));
        ps.burst(W / 2, ty + 40, 30, [80, 200], P.SPARK, [0.3, 0.7], WHITE, 40);
      } else {
        sfx('hurt');
        stamp.hidden = false;
      }
    };
    // 머리띠 글 (선명한 층)
    const head = document.createElement('b');
    head.className = 'mg-ticket-head';
    head.textContent = '봉인 상자 복권 · No. 0100';
    stage.appendChild(head);
    const stamp = document.createElement('b');
    stamp.className = 'mg-stamp';
    stamp.textContent = '꽝';
    stamp.hidden = true;
    stage.appendChild(stamp);
    const all = document.createElement('button');
    all.type = 'button';
    all.className = 'mg-go';
    all.textContent = '▼ 손가락으로 긁는다';
    el.appendChild(all);
    all.addEventListener('click', () => panels.forEach((p, i) => window.setTimeout(() => reveal(p), i * 260)));
    stage.addEventListener('pointerdown', (e) => { down = true; stage.setPointerCapture(e.pointerId); scratch(e.clientX, e.clientY); });
    stage.addEventListener('pointermove', (e) => { if (down) scratch(e.clientX, e.clientY); });
    stage.addEventListener('pointerup', () => (down = false));
    if (calm()) panels.forEach(reveal);
    let last = performance.now();
    const loop = (now: number) => {
      if (!el.isConnected) return done();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      tt += dt; idleT += dt;
      if (idleT > 8 && !done2) all.textContent = '▼ 다 긁기';
      fx.frame.clear();
      ps.update(dt); lights.update(dt);
      drawTicket();
      ps.draw(fx.painter, 'front'); lights.draw(fx.painter);
      fx.present();
      if (done2 && tt - tDone > (calm() ? 0.4 : 2)) { el.classList.add('out'); window.setTimeout(() => { el.remove(); done(); }, 300); return; }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    void PAL;
  });
