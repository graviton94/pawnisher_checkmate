/**
 * 반장 등장 (D-249, 사용자: 「컷씬용을 따로 그릴 필요 없이 — 초상을 오른쪽 끝까지 붙이고, 이미지가 끝나 배경과 만나는 경계선은
 * 2막 보스 오른쪽 이펙트처럼 뭔가 이펙트를 넣거나, 도트를 서서히 제거하는 도트 그라데이션처럼」 · 「FX는 pixelfx 룰을 참고」).
 *  ① 위아래 검은 띠가 4계단으로 닫힌다 ② 흰 장 두 장(hero frame) ③ 초상이 오른쪽에서 물러섰다(예비) 꽂히고 흔들린다
 *  ④ 초상 왼쪽 가장자리는 그림 도트 단위 베이어 디더로 깎여 배경에 녹는다 ⑤ 그 경계선을 따라 반장마다 다른 FX
 *  ⑥ 이름이 내리꽂히고 칭호 · 서술 · 규칙이 한 자씩 ⑦ 누르거나 5초 뒤 띠가 닫혔다 걷힌다.
 */
import { bayer, FxCanvas, hex, Lights, P, PAL, Particles, Rng, WHITE } from '../view/pxfx';
import { typeIn } from './fx3';

export type BossKey = 'plate' | 'spawn' | 'thorns' | 'gilded';
export interface BossIntroOpts {
  rule: BossKey;
  art: string;
  act: string;
  name: string;
  title: string;
  narr: string;
  rules: string[];
  sfx?: (k: string) => void;
}

const LOOK: Record<BossKey, { accent: string; seam: number }> = {
  plate: { accent: '#ff8a2a', seam: 0 },
  spawn: { accent: '#5fd4d8', seam: 0 },
  thorns: { accent: '#e5262f', seam: 0 },
  gilded: { accent: '#f4c84a', seam: 0 },
};

/** 초상 왼쪽 band칸을 베이어 디더로 깎는다 (그림 도트 단위) */
const ditherEdge = (img: HTMLImageElement, band: number, src: CanvasImageSource = img): HTMLCanvasElement => {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const x = c.getContext('2d')!;
  x.drawImage(src, 0, 0, c.width, c.height);
  const d = x.getImageData(0, 0, c.width, c.height);
  for (let yy = 0; yy < c.height; yy++)
    for (let xx = 0; xx < Math.min(band, c.width); xx++) {
      // 왼쪽 끝일수록 많이 빠진다 (x/band가 베이어 문턱보다 작으면 지운다), 가장자리 몇 칸은 거의 다 빠짐
      const keep = xx / band;
      if (keep * keep <= bayer(xx, yy)) d.data[(yy * c.width + xx) * 4 + 3] = 0;
    }
  x.putImageData(d, 0, 0);
  return c;
};

export const bossIntro = (o: BossIntroOpts): Promise<void> =>
  new Promise((resolve) => {
    const look = LOOK[o.rule];
    const el = document.createElement('div');
    el.className = `bossfx b-${o.rule}`;
    el.style.setProperty('--accent', look.accent);
    el.innerHTML = `<div class="bf-port"></div><div class="bf-fx"></div><i class="bf-bar top"></i><i class="bf-bar bot"></i>
      <div class="bf-text"><p class="bf-act">${o.act}</p><h1 class="bf-name">${o.name}</h1><p class="bf-title"></p><p class="bf-narr"></p><ul class="bf-rules">${o.rules.map(() => '<li></li>').join('')}</ul></div>
      <p class="bf-skip">눌러서 계속</p>`;
    document.body.appendChild(el);
    const W = innerWidth, H = innerHeight;
    // 도트 FX 판 (1도트 = 3px, 화면 전체)
    const fx = new FxCanvas(Math.ceil(W / 3), Math.ceil(H / 3), 3);
    el.querySelector('.bf-fx')!.appendChild(fx.canvas);
    const R = new Rng(o.rule.length * 31 + 7);
    const ps = new Particles(R, () => Infinity, o.rule === 'spawn' ? [hex('#e8fbfc'), hex('#5fd4d8'), hex('#2e8a90')] : o.rule === 'thorns' ? [hex('#ffc4c4'), hex('#ff6b6b'), hex('#c42430')] : undefined);
    const lights = new Lights();
    const barH = Math.round(H * 0.16);
    // 초상: 화면 높이를 덮는 정수배, 오른쪽 끝에 붙인다
    const port = el.querySelector<HTMLElement>('.bf-port')!;
    let seamX = W * 0.45; // 경계선 (화면 px)
    let portW = 0;
    const img = new Image();
    let fallbackSrc: HTMLImageElement | null = null;
    img.onload = () => {
      // 띠 사이를 덮는 정수배, 다만 폭은 화면의 70%까지 (가로로 긴 2막 초상이 글씨를 덮지 않게)
      let k = Math.max(1, Math.ceil((H - barH * 2) / img.naturalHeight));
      while (k > 1 && img.naturalWidth * k > W * 0.7) k -= 1;
      // 위끝(왕관)을 띠 바로 아래에 — 몸 아래쪽이 아래 띠에 잘린다
      port.style.top = `${barH - Math.round(img.naturalHeight * k * 0.03)}px`;
      const band = Math.round(img.naturalWidth * 0.32);
      const cv = ditherEdge(img, band, fallbackSrc ?? img);
      cv.style.width = `${img.naturalWidth * k}px`;
      cv.style.height = `${img.naturalHeight * k}px`;
      port.appendChild(cv);
      portW = img.naturalWidth * k;
      seamX = W - portW + band * k * 0.45;
    };
    // 초상 그림이 아직 없으면 (도금왕 B-04 발주 전): 검은 킹 기물을 금칠해 크게 (72칸 그림 → 정수배)
    img.onerror = () => {
      const pc = new Image();
      pc.onload = () => {
        const c = document.createElement('canvas');
        c.width = 72; c.height = 72;
        const x = c.getContext('2d')!;
        x.imageSmoothingEnabled = false;
        x.drawImage(pc, 0, 0, 72, 72);
        const d = x.getImageData(0, 0, 72, 72);
        const gold = [[42, 26, 6], [90, 58, 12], [154, 106, 20], [212, 154, 34], [244, 200, 74], [255, 230, 138]];
        for (let i = 0; i < d.data.length; i += 4) {
          if (!d.data[i + 3]) continue;
          const l = (d.data[i] + d.data[i + 1] + d.data[i + 2]) / 3;
          if (l < 20 || l > 200) continue;
          const g = gold[Math.min(5, Math.floor((l / 140) * 6))];
          d.data[i] = g[0]; d.data[i + 1] = g[1]; d.data[i + 2] = g[2];
        }
        x.putImageData(d, 0, 0);
        const im2 = new Image();
        im2.onload = () => img.onload?.(new Event('load'));
        Object.defineProperty(img, 'naturalWidth', { value: 72 });
        Object.defineProperty(img, 'naturalHeight', { value: 72 });
        im2.src = c.toDataURL();
        fallbackSrc = im2;
      };
      pc.src = 'pieces/l-K1.png';
    };
    img.src = `scenes/${o.art}.png`;
    const accent = hex(look.accent);
    const T: number[] = [];
    const at = (ms: number, fn: () => void) => T.push(window.setTimeout(fn, ms));
    let done = false;
    const close = (): void => {
      if (done) return;
      done = true;
      T.forEach(clearTimeout);
      el.classList.add('out');
      window.setTimeout(() => { el.remove(); resolve(); }, 420);
    };
    // 시간표
    at(0, () => el.classList.add('bars'));
    at(260, () => { el.classList.add('flash'); o.sfx?.('boom'); });
    at(360, () => el.classList.add('port'));
    at(700, () => { el.classList.add('name'); o.sfx?.('stamp'); });
    at(1000, () => void typeIn(el.querySelector('.bf-title')!, o.title, 40, undefined, () => el.isConnected));
    // 문장마다 줄을 바꾼다 (사용자: 「반장 소개 문구 2문장 — 문장별로 엔터」)
    at(1500, () => void typeIn(el.querySelector('.bf-narr')!, o.narr.replace(/([.!?…])\s+/g, '$1\n'), 20, undefined, () => el.isConnected));
    o.rules.forEach((r, i) => at(2400 + i * 260, () => { const li = el.querySelectorAll('.bf-rules li')[i] as HTMLElement; li.textContent = r; li.classList.add('in'); }));
    at(1100, () => el.addEventListener('click', close));
    at(5600, close);
    // 경계선 FX (반장마다)
    let spawnAcc = 0;
    const seamY0 = barH / 3, seamY1 = (H - barH) / 3;
    void fx.run(
      6000,
      (dt, t) => {
        ps.update(dt);
        lights.update(dt);
        if (t < 0.36) return;
        const sx = seamX / 3;
        // 꽂히는 순간: 경계선을 따라 터짐 + 큰 빛
        if (t >= 0.62 && t - dt < 0.62) {
          lights.add(sx, (seamY0 + seamY1) / 2, 60, accent, 0.9, 0.6);
          for (let i = 0; i < 26; i++) { const y = R.range(seamY0, seamY1); ps.spawn(o.rule === 'thorns' ? P.SHARD : P.SPARK, sx + R.range(-2, 2), y, R.range(-120, -20), R.range(-60, 40), R.range(0.4, 0.9), o.rule === 'thorns' ? hex('#c42430') : accent, R.range(1, 2)); }
        }
        spawnAcc += dt * (o.rule === 'plate' ? 70 : o.rule === 'spawn' ? 40 : 30);
        for (; spawnAcc > 1; spawnAcc--) {
          const y = R.range(seamY0, seamY1), x = sx + R.range(-6, 4);
          if (o.rule === 'plate') {
            // 경계선이 타오른다: 불 덩어리가 오르며 식고 연기가 되며, 불씨가 흩날린다
            if (R.chance(0.55)) ps.spawn(P.FIRE, x, y, R.range(-8, 6), R.range(-30, -10), R.range(0.3, 0.6), 0, R.range(1.2, 2.6), 0, R.chance(0.25));
            else ps.spawn(P.EMBER, x, y, R.range(-30, 10), R.range(-50, -10), R.range(0.8, 1.6), WHITE, R.range(1, 2));
          } else if (o.rule === 'spawn') {
            // 청록 전기: 경계선 위로 짧은 줄기(MOTE)가 튀고, 별이 반짝인다
            if (R.chance(0.7)) ps.spawn(P.MOTE, x, y, R.range(-90, -30), R.range(-20, 20), R.range(0.2, 0.45), PAL.teal[5], R.range(0.6, 1.2));
            else ps.spawn(P.STAR, x, y, 0, 0, R.range(0.4, 0.8), PAL.teal[6], R.range(0.6, 1.8));
          } else {
            // 가시: 붉은 쇳조각이 떨어지고, 흰 역광 먼지가 떠오른다
            if (R.chance(0.35)) ps.spawn(P.SHARD, x, y, R.range(-50, -5), R.range(-30, 10), R.range(0.6, 1.2), R.chance(0.5) ? PAL.blood[5] : PAL.blood[3], R.range(1, 2));
            else ps.spawn(P.MOTE, x + R.range(-10, 10), y, R.range(-10, 6), R.range(-25, -8), R.range(0.6, 1.2), hex('#d8d4dc'), 0.6);
          }
        }
      },
      (t, p) => {
        // 흰 장 두 장 (hero frame)
        if (t >= 0.26 && t < 0.34) p.rect(0, 0, fx.w, fx.h, WHITE, t < 0.3 ? 1 : 0.5);
        const sx = seamX / 3;
        // 경계선 빛: 큰 옅은 웅덩이 + 줄 빛 (반장 색)
        if (t > 0.36 && portW) {
          const k = Math.min(1, (t - 0.36) * 3);
          for (let y = seamY0; y < seamY1; y += 8) p.glow(sx, y, o.rule === 'plate' ? 14 : 10, accent, 0.12 * k);
          if (o.rule === 'spawn') {
            // 경계선을 타고 오르내리는 전기 줄기 (지그재그 1칸 선, 80ms마다 모양이 바뀐다)
            const f = Math.floor(t * 12);
            let y = seamY0, x = sx;
            const r2 = new Rng(f + 3);
            p.fade = 1;
            while (y < seamY1) { const ny = y + r2.range(3, 7), nx = sx + r2.range(-4, 4); p.line(x, y, nx, ny, r2.chance(0.3) ? WHITE : PAL.teal[6]); p.glow(nx, ny, 4, PAL.teal[5], 0.25); x = nx; y = ny; }
          }
        }
        ps.draw(p, 'back');
        ps.draw(p, 'front');
        lights.draw(p);
      },
    );
  });
