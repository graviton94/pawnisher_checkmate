/**
 * 반장 등장 (D-249, 사용자: 「컷씬용을 따로 그릴 필요 없이 — 초상을 오른쪽 끝까지 붙이고 이미지가 끝나 배경과 만나는 경계선은
 * 2막 보스 오른쪽 이펙트처럼 뭔가 이펙트를 넣거나, 도트를 서서히 제거하는 도트 그라데이션처럼」 · 「FX는 pixelfx 룰을 참고」).
 *  ① 위아래 검은 띠가 4계단으로 닫힌다 ② 흰 장 두 장(hero frame) ③ 초상이 오른쪽에서 물러섰다(예비) 꽂히고 흔들린다
 *  ④ 초상 왼쪽 가장자리는 그림 도트 단위 베이어 디더로 깎여 배경에 녹는다 ⑤ 그 경계선을 따라 반장마다 다른 FX
 *  ⑥ 이름이 내리꽂히고 칭호 · 규칙(UI-21 수배판, D-400) · 아래 자막 띠 두 줄이 한 자씩 ⑦ 누르거나 5초 뒤 띠가 닫혔다 걷힌다.
 * 글 크기 (D-397): 막 꼬리표 12 · 이름 36 갈무리11 굵게 · 칭호 24 · 규칙 12 굵게 · 자막 15. 자막 띠 · ▼는 모든 컷과 같은 자리(uikit.cutChromeHtml).
 */
import { FxCanvas, hex, Lights, OUTLINE, P, PAL, Particles, Rng, WHITE, type Col, type Painter } from '../view/pxfx';
import { BOSS_ENTRANCE, BOSS_LOOK } from '../data/boss-look';
import { typeIn } from './fx3';
import { impactFlash } from '../view/flash';
import { calmMotion, reduceFlash } from '../prefs/motion';
import { devPerCss, viewH, viewW } from '../view/vz';
import { cutChromeHtml, typeCutPages, type CutLine } from './uikit';

export type BossKey = 'plate' | 'spawn' | 'thorns' | 'gilded' | 'inspect' | 'magnet' | 'alarm';
export interface BossIntroOpts {
  rule: BossKey;
  art: string;
  act: string;
  name: string;
  title: string;
  /** 자막 띠 두 줄 (BOSS_CARD — 서술 + 대사) */
  lines: CutLine[];
  rules: string[];
  /** 수배판 수치 칸 (D-400 UI-21): 반장 HP · 공격 */
  stats?: { hp: number; atk: number };
  /** 2단계가 있는 반장 — 수배판 2상태(진홍 빛 줄 · 경고등) */
  phase2?: boolean;
  sfx?: (k: string) => void;
}

const LOOK = BOSS_LOOK;
const rgbOf = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
/** 반장 색의 어두운 단색 (뒤 판) — 그라데이션 없이 한 색 */
const darkOf = (h: string, k = 0.28): string => `rgb(${rgbOf(h).map((v) => Math.round(v * k)).join(',')})`;
/** 출렁 없는 지수형 곡선 (D-216): 터짐 = 빠르게→느리게, 모으기 = 느리게→빠르게 */
const easeOut = (x: number): number => 1 - (1 - Math.min(1, Math.max(0, x))) ** 3;
const easeIn = (x: number): number => Math.min(1, Math.max(0, x)) ** 3;
/** 단색 점 (D-675): 세기가 문턱을 넘으면 칠하고 아니면 비운다 — 투명도 디더 대신 길이로 줄어든다 */
const solid = (p: Painter, x: number, y: number, c: Col, a: number, th = 0.25): void => { if (a >= th) p.px(x, y, c); };
/** 1도트 고리 (렌즈 테) — 둘레를 정수 도트로 */
const ring = (p: Painter, cx: number, cy: number, r: number, c: Col, a = 1): void => {
  const n = Math.max(12, Math.round(r * 7));
  for (let i = 0; i < n; i++) p.put(Math.round(cx + Math.cos((i / n) * Math.PI * 2) * r), Math.round(cy + Math.sin((i / n) * Math.PI * 2) * r), c, a);
};
/** 쇳가루 한 알 (D-647 pull): 출발 자리 · 가운데로 가는 방향 · 출발/도착 거리 · 출발 시각 */
interface Filing { ux: number; uy: number; d0: number; df: number; t0: number; c: Col }

/**
 * 초상 왼쪽을 사선으로 자른다 (D-690 — D-675 디더 금지: 옛 베이어 디더 경계를 대신한다). 그림 도트 단위로:
 * 위쪽은 band칸 안쪽, 아래쪽은 0칸에서 잘리는 사선 — 그 선을 따라 먹 1도트 · 반장 색 2도트 테. 위 · 아래는 그대로(검은 막과 맞닿음).
 * 오른쪽은 화면 끝에 붙으므로 깎지 않는다 (D-563).
 */
const slantEdge = (img: HTMLImageElement, band: number, accent: [number, number, number], src: CanvasImageSource = img): HTMLCanvasElement => {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const x = c.getContext('2d')!;
  x.drawImage(src, 0, 0, c.width, c.height);
  const d = x.getImageData(0, 0, c.width, c.height);
  for (let yy = 0; yy < c.height; yy++) {
    const edge = Math.round(band * (1 - yy / Math.max(1, c.height - 1)));
    for (let xx = 0; xx < Math.min(c.width, edge + 3); xx++) {
      const i = (yy * c.width + xx) * 4;
      if (xx < edge) d.data[i + 3] = 0;
      else if (xx === edge) { d.data[i] = 11; d.data[i + 1] = 11; d.data[i + 2] = 14; d.data[i + 3] = 255; }
      else { d.data[i] = accent[0]; d.data[i + 1] = accent[1]; d.data[i + 2] = accent[2]; d.data[i + 3] = 255; }
    }
  }
  x.putImageData(d, 0, 0);
  return c;
};

export const bossIntro = (o: BossIntroOpts): Promise<void> =>
  new Promise((resolve) => {
    const look = LOOK[o.rule];
    const el = document.createElement('div');
    // 움직임 줄이기 (D-538): 초상 출렁 · 경계선 입자 · 꽂힘 빛을 끄고 정지 컷으로. 번쩍임 줄이기면 흰 디더 장을 뺀다
    const calm = calmMotion(), noFlash = reduceFlash();
    el.className = `bossfx kit b-${o.rule}${calm ? ' calm' : ''}`;
    el.style.setProperty('--accent', look.accent);
    el.style.setProperty('--slab', darkOf(look.accent));
    el.innerHTML = `<i class="bf-slab" aria-hidden="true"></i><div class="bf-port"></div><div class="bf-fx"></div><i class="bf-bar top"></i><div class="bf-haz p2-band" aria-hidden="true"><span>${o.act}</span></div>
      <div class="bf-text"><span class="ribbon r-crimson bf-act">반장</span><h1 class="bf-name">${o.name}</h1><p class="bf-title"></p><div class="boss-plate bf-board${o.phase2 ? ' p2' : ''}"><ul class="bf-rules">${o.rules.map(() => '<li></li>').join('')}</ul>${o.stats ? `<div class="bf-stats"><span class="bstat" aria-label="HP ${o.stats.hp}" style="--ic:url(${new URL('ui/icons16/heart@16.png', location.href).href})"><i></i>${o.stats.hp}</span><span class="bstat" aria-label="공격 ${o.stats.atk}" style="--ic:url(${new URL('ui/icons16/c.smash@16.png', location.href).href})"><i></i>${o.stats.atk}</span></div>` : ''}</div></div>
      ${cutChromeHtml()}`;
    const sub = el.querySelector<HTMLElement>('.cut-sub')!;
    sub.classList.add('typing');
    document.body.appendChild(el);
    // 판을 다 덮는 동안 판 그리기를 쉰다 (D-595 — 판 캔버스가 등장 연출과 GPU를 나눠 썼다)
    document.body.classList.add('cover-fx');
    // 화면 크기 · 기기 배율은 배치 px로 (웹 PC 정수 확대에서 innerWidth는 확대 뒤 값 — D-563)
    const W = viewW(), H = viewH(), dev = devPerCss();
    // 도트 FX 판 (1도트 = 기기 픽셀 정수, 약 3 CSS px, 화면 전체)
    const DOT = Math.max(1, Math.round(3 * dev)) / dev;
    const fx = new FxCanvas(Math.ceil(W / DOT), Math.ceil(H / DOT), DOT);
    el.querySelector('.bf-fx')!.appendChild(fx.canvas);
    const R = new Rng(o.rule.length * 31 + 7);
    const ent = look.entrance;
    const ramp = look.ramp?.map(hex);
    const ps = new Particles(R, () => Infinity, ramp);
    const lights = new Lights();
    const barH = Math.round(H * 0.16);
    const port = el.querySelector<HTMLElement>('.bf-port')!;
    let seamX = W * 0.45; // 경계선 (화면 px)
    let portW = 0;
    // 경계선 FX 세로 범위 (화면 px) — 초상이 서면 초상 위아래로 맞춘다
    let seamTop = barH, seamBot = H - barH;
    const img = new Image();
    let fallbackSrc: HTMLImageElement | null = null;
    // 초상 = 통째로 보이게 (D-563 사장님: 「너무 당겨 찍었다 — 몸이 보이게」): 위 띠 아래 남은 높이 안에 드는 가장 큰 기기 픽셀 정수배,
    // 폭은 화면 62%까지(왼쪽 이름 · 수배판 자리). 오른쪽 끝에 붙이고 남은 높이 가운데. 자르지 않는다.
    img.onload = () => {
      const nw = img.naturalWidth, nh = img.naturalHeight;
      // 폭 상한: 화면 62% · 그리고 왼쪽 이름 · 수배판 글 상자 오른쪽 끝까지(디더로 깎이는 왼쪽 띠 절반은 글 밑으로 겹쳐도 된다)
      const tb = el.querySelector<HTMLElement>('.bf-text');
      const textR = tb ? tb.offsetLeft + tb.offsetWidth : 0;
      const maxW = Math.min(W * 0.62, (W - textR - 8) / (1 - 0.22 * 0.5));
      // 경보 띠(D-690) 아래부터 — 띠가 초상 머리를 가리지 않게
      const hazH = el.querySelector<HTMLElement>('.bf-haz')?.offsetHeight ?? 0;
      const top0 = barH + hazH;
      const kd = Math.max(1, Math.min(Math.floor(((H - top0) * dev) / nh), Math.floor((maxW * dev) / nw)));
      const k = kd / dev;
      const pw = nw * k, ph = nh * k;
      const top = Math.round((top0 + (H - top0 - ph) / 2) * dev) / dev;
      Object.assign(port.style, { top: `${top}px`, width: `${pw}px`, height: `${ph}px`, overflow: 'hidden' });
      const band = Math.round(nw * 0.22);
      const cv = slantEdge(img, band, rgbOf(look.accent), fallbackSrc ?? img);
      Object.assign(cv.style, { position: 'absolute', left: '0px', top: '0px', width: `${pw}px`, height: `${ph}px` });
      port.appendChild(cv);
      portW = pw;
      seamX = W - pw + band * k * 0.5;
      // 뒤 판(반장 색 어두운 단색 사선 판)을 초상 사선에 맞춘다
      el.style.setProperty('--slab-w', `${Math.round(Math.min(W - textR + 24, pw + band * k * 0.6 + 120))}px`);
      seamTop = Math.max(barH, top + ph * 0.08);
      seamBot = Math.min(H, top + ph * 0.92);
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
      // 걷히기 시작할 때 판을 깨운다 (걷히는 동안 판이 보인다)
      document.body.classList.remove('cover-fx');
      window.setTimeout(() => { el.remove(); resolve(); }, 420);
    };
    // 시간표
    at(0, () => el.classList.add('bars'));
    at(260, () => o.sfx?.('boss'));
    at(360, () => { el.classList.add('port'); if (!noFlash && !calm) { const b = port.getBoundingClientRect(); void impactFlash({ x: b.width ? b.left + b.width / 2 : W * 0.72, y: b.height ? b.top + b.height / 2 : H * 0.55, r: H * 0.55, z: 1000 }); } });
    at(700, () => { el.classList.add('name'); o.sfx?.('stamp'); });
    at(1000, () => void typeIn(el.querySelector('.bf-title')!, o.title, 40, undefined, () => el.isConnected));
    // 자막 띠 두 줄 (D-397): 서술 한 줄 → 대사 한 줄, 다 찍히면 ▼
    at(1500, async () => {
      const box = el.querySelector<HTMLElement>('.cut-lines')!;
      // 긴 등장 대사는 쪽을 넘긴다 (D-451 바이블 — 띠 두 줄 · cutPages)
      await typeCutPages(box, o.lines, () => el.isConnected, (p, html) => typeIn(p, html, 24, undefined, () => el.isConnected));
      sub.classList.remove('typing');
    });
    o.rules.forEach((r, i) => at(2400 + i * 260, () => { const li = el.querySelectorAll('.bf-rules li')[i] as HTMLElement; li.textContent = r; li.classList.add('in'); }));
    at(1100, () => el.addEventListener('click', close));
    // 자막을 다 읽을 시간 (긴 대사는 쪽을 넘긴다): 1.5초 시작 + 글자당 24ms 찍기 + 쪽마다 쉼 + 다 읽고 2초
    at(Math.max(5600, 1500 + o.lines.reduce((a, l) => a + l.t.length * 64, 0) + 2000), close);
    // 경계선 FX (반장마다)
    let spawnAcc = 0;
    const seamY0 = (): number => seamTop / DOT, seamY1 = (): number => seamBot / DOT;
    const SC = BOSS_ENTRANCE.scan, PU = BOSS_ENTRANCE.pull, SI = BOSS_ENTRANCE.siren;
    /** 검수 렌즈 자리 (D-647 scan): 훑기마다 위→아래 · 아래→위 번갈아, 70%는 움직이고(빠르게→느리게) 나머지는 멈춰 도장 */
    const lensAt = (t: number): { x: number; y: number; r: number; ph: number } | null => {
      if (ent !== 'scan' || t < SC.start || !portW) return null;
      const u = (t - SC.start) / SC.period, n = Math.floor(u), ph = u - n, e = easeOut(ph / 0.7);
      const y0 = seamY0() + SC.lens, y1 = seamY1() - SC.lens;
      return { x: Math.round(seamX / DOT), y: Math.round(n % 2 === 0 ? y0 + (y1 - y0) * e : y1 - (y1 - y0) * e), r: SC.lens, ph };
    };
    /** 쇳가루 (D-647 pull): 물결마다 per알 — 시드 난수라 매번 같은 모양 */
    const filings: Filing[] = [];
    if (ent === 'pull') {
      const FR = new Rng(97);
      const cols = ramp ?? [WHITE, WHITE, WHITE];
      for (const w of PU.waves) for (let i = 0; i < PU.per; i++) {
        const a = FR.range(0, Math.PI * 2);
        filings.push({ ux: Math.cos(a), uy: Math.sin(a), d0: FR.range(PU.from[0], PU.from[1]), df: FR.range(PU.ring[0], PU.ring[1]), t0: w + FR.range(0, 0.22), c: FR.chance(0.3) ? cols[0] : cols[1] });
      }
    }
    /** 검수: 렌즈 고리 + 오른쪽으로 뻗는 주사선(멀수록 디더로 성기게) + 지나온 잔상 두 줄 + 멈출 때 불량 도장 ✕ */
    const drawScan = (p: Painter, t: number): void => {
      const l = lensAt(t);
      if (!l || !ramp) return;
      const down = Math.floor((t - SC.start) / SC.period) % 2 === 0, back = down ? -1 : 1, moving = l.ph < 0.7;
      for (let x = l.x + l.r + 1; x < l.x + l.r + SC.beam; x++) {
        const far = (x - l.x - l.r) / SC.beam;
        solid(p, x, l.y, ramp[0], 0.85 - far * 0.75);
        if (moving) { solid(p, x, l.y + back, ramp[1], 0.5 - far * 0.45); solid(p, x, l.y + back * 2, ramp[2], 0.3 - far * 0.28); }
      }
      p.glow(l.x, l.y, l.r + 4, ramp[1], 0.35);
      ring(p, l.x, l.y, l.r + 1, OUTLINE);
      ring(p, l.x, l.y, l.r, ramp[1]);
      ring(p, l.x, l.y, l.r - 1, ramp[2]);
      p.px(l.x - 2, l.y - 2, WHITE); p.px(l.x - 1, l.y - 2, ramp[0]); p.px(l.x - 2, l.y - 1, ramp[0]);
      for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) { p.px(l.x + dx * (l.r - 3), l.y + dy * (l.r - 3), ramp[2]); p.px(l.x + dx * (l.r - 4), l.y + dy * (l.r - 4), ramp[2]); }
      // 불량 도장: 멈추는 순간 찍히고(크게 한 장 → 제 크기) 머문 뒤 디더로 빠진다
      const st = l.ph - 0.7;
      if (st >= 0 && st < SC.stampHold + SC.stampOut) {
        const a = st < SC.stampHold ? 1 : 1 - (st - SC.stampHold) / SC.stampOut, big = st < 0.04 ? 1 : 0, n = 2 + big;
        const cx = l.x + l.r + 5, cy = l.y - l.r + 1;
        for (let i = -n; i <= n; i++) for (const [x, y] of [[cx + i, cy + i], [cx + i, cy - i]]) { solid(p, x + 1, y, OUTLINE, a); solid(p, x, y + 1, OUTLINE, a); }
        for (let i = -n; i <= n; i++) { solid(p, cx + i, cy + i, PAL.blood[5], a); solid(p, cx + i, cy - i, PAL.blood[5], a); }
      }
    };
    /** 자석: 쇳가루가 물러섰다(예비) 가운데로 빨려 들고(점점 빠르게) 붙어 1도트 튄다. 붙은 뭉치 위아래에 붉은 N · 푸른 S 극 빛 */
    const drawPull = (p: Painter, t: number, sx: number): void => {
      if (!ramp || !portW) return;
      // 뭉치 자리: 경계선 녹은 띠 왼쪽(어두운 바탕) — 띠 디더 위에서는 쇳가루가 묻힌다
      const cx = Math.round(sx) - PU.left, cy = Math.round((seamY0() + seamY1()) / 2);
      let landed = 0;
      for (const f of filings) {
        const s = t - f.t0;
        if (s < 0) continue;
        let d: number, len = 1;
        if (s < PU.wind) d = f.d0 + PU.back * easeOut(s / PU.wind);
        else if (s < PU.wind + PU.snap) { const e = easeIn((s - PU.wind) / PU.snap); d = f.d0 + PU.back - (f.d0 + PU.back - f.df) * e; len = e > 0.3 ? 3 : 2; }
        else { const b = s - PU.wind - PU.snap; d = b < 0.05 ? f.df - 1 : f.df; landed++; }
        const x = Math.round(cx + f.ux * d), y = Math.round(cy + f.uy * d);
        const x2 = Math.round(x + f.ux * len), y2 = Math.round(y + f.uy * len);
        p.line(x + 1, y + 1, x2 + 1, y2 + 1, OUTLINE);
        p.line(x, y, x2, y2, f.c);
      }
      if (landed) {
        const k = Math.min(1, landed / PU.per);
        p.glow(cx, cy - PU.ring[1] - 2, 6, PAL.blood[5], 0.4 * k);
        p.glow(cx, cy + PU.ring[1] + 2, 6, hex('#38bdf8'), 0.4 * k);
        p.px(cx, cy - PU.ring[1] - 2, PAL.blood[6]); p.px(cx, cy + PU.ring[1] + 2, hex('#bfefff'));
      }
    };
    /** 경보: 경계선 위 경광등이 돌며 마주 보는 빛살 두 줄기를 쓴다 — 반 바퀴마다 붉은 ↔ 호박 (광과민: 화면 전체 번쩍임 없음, 빛살은 디더 반투명) */
    const drawSiren = (p: Painter, t: number, sx: number): void => {
      if (!ramp || !portW || t < SI.start) return;
      const lx = Math.round(sx), ly = Math.round(seamY0() + SI.lampY);
      const turn = (t - SI.start) * SI.rps, th = turn * Math.PI * 2, amber = Math.floor(turn * 2) % 2 === 1;
      const c = amber ? ramp[1] : PAL.blood[5], hot = amber ? ramp[0] : PAL.blood[6];
      for (const base of [th, th + Math.PI]) {
        // 빛살이 화면 앞(아래)을 향할 때만 밝게 — 뒤로 돌면 등 안에 가려진다
        const face = Math.max(0, Math.sin(base)) * 0.6 + 0.4;
        for (let a = -SI.half; a <= SI.half; a += 0.02) {
          const ux = Math.cos(base + a), uy = Math.sin(base + a) * 0.55, edge = 1 - Math.abs(a) / SI.half;
          for (let r = 3; r < SI.len; r += 1) solid(p, lx + ux * r, ly + uy * r, c, (0.55 - (r / SI.len) * 0.5) * edge * face);
        }
      }
      // 등: 먹 테 · 갓(색) · 흰 심 · 아래 쇠 받침
      p.rect(lx - 3, ly - 3, 7, 6, OUTLINE);
      p.rect(lx - 2, ly - 2, 5, 4, c);
      p.px(lx - 1, ly - 1, hot); p.px(lx, ly - 1, WHITE);
      p.rect(lx - 4, ly + 3, 9, 2, OUTLINE);
      p.rect(lx - 3, ly + 3, 7, 1, PAL.steel[4]);
      p.glow(lx, ly, 9, c, 0.5);
    };
    void fx.run(
      6000,
      (dt, t) => {
        ps.update(dt);
        lights.update(dt);
        if (t < 0.36 || calm) return;
        const sx = seamX / DOT;
        // 꽂히는 순간: 경계선을 따라 터짐 + 큰 빛
        if (t >= 0.62 && t - dt < 0.62) {
          lights.add(sx, (seamY0() + seamY1()) / 2, 60, accent, 0.9, 0.6);
          for (let i = 0; i < 26; i++) { const y = R.range(seamY0(), seamY1()); ps.spawn(o.rule === 'thorns' ? P.SHARD : P.SPARK, sx + R.range(-2, 2), y, R.range(-120, -20), R.range(-60, 40), R.range(0.4, 0.9), o.rule === 'thorns' ? hex('#c42430') : accent, R.range(1, 2)); }
        }
        spawnAcc += dt * (ent === 'fire' ? 70 : ent === 'spark' ? 40 : ent === 'scan' || ent === 'siren' ? 14 : ent === 'pull' ? 10 : 30);
        for (; spawnAcc > 1; spawnAcc--) {
          const y = R.range(seamY0(), seamY1()), x = sx + R.range(-6, 4);
          if (ent === 'scan' || ent === 'pull' || ent === 'siren') {
            // 새 반장 셋 (D-647): 경계선 입자는 조금만 — 주인공은 아래 그리기의 렌즈 · 쇳가루 · 경광등
            if (ent === 'scan') { const l = lensAt(t); if (l) ps.spawn(P.MOTE, l.x + R.range(-l.r, l.r), l.y + R.range(-2, 2), R.range(-18, -4), R.range(-6, 6), R.range(0.4, 0.8), ramp![0], 0.6); }
            else if (ent === 'pull') ps.spawn(P.MOTE, x + R.range(-12, 4), y, R.range(-4, 4), R.range(-6, 6), R.range(0.5, 1), ramp![1], 0.6);
            else if (t >= SI.start) ps.spawn(P.SPARK, sx + R.range(-2, 2), seamY0() + SI.lampY + 2, R.range(-30, 30), R.range(-10, 20), R.range(0.25, 0.5), R.chance(0.5) ? ramp![1] : ramp![2], 1);
          } else if (o.rule === 'plate') {
            // 경계선이 타오른다: 불 덩어리가 오르며 식고 연기가 되며 불씨가 흩날린다
            if (R.chance(0.55)) ps.spawn(P.FIRE, x, y, R.range(-8, 6), R.range(-30, -10), R.range(0.3, 0.6), 0, R.range(1.2, 2.6), 0, R.chance(0.25));
            else ps.spawn(P.EMBER, x, y, R.range(-30, 10), R.range(-50, -10), R.range(0.8, 1.6), WHITE, R.range(1, 2));
          } else if (o.rule === 'spawn') {
            // 초록 전기 (D-347): 경계선 위로 짧은 줄기(MOTE)가 튀고 별이 반짝인다
            if (R.chance(0.7)) ps.spawn(P.MOTE, x, y, R.range(-90, -30), R.range(-20, 20), R.range(0.2, 0.45), PAL.toxic[5], R.range(0.6, 1.2));
            else ps.spawn(P.STAR, x, y, 0, 0, R.range(0.4, 0.8), PAL.toxic[6], R.range(0.6, 1.8));
          } else {
            // 가시: 붉은 쇳조각이 떨어지고 흰 역광 먼지가 떠오른다
            if (R.chance(0.35)) ps.spawn(P.SHARD, x, y, R.range(-50, -5), R.range(-30, 10), R.range(0.6, 1.2), R.chance(0.5) ? PAL.blood[5] : PAL.blood[3], R.range(1, 2));
            else ps.spawn(P.MOTE, x + R.range(-10, 10), y, R.range(-10, 6), R.range(-25, -8), R.range(0.6, 1.2), hex('#d8d4dc'), 0.6);
          }
        }
      },
      (t, p) => {
        // (D-595: 옛 「흰 장」은 t 0.26 ~ 0.32 = 6초 중 360ms 동안 화면 전체 50% 흰 체커였다 — 「약 60ms」라던 주석과 달리 눈부셨다.
        //  이제 초상이 꽂히는 순간 초상 둘레 원형 디더 번쩍 · 화면 3장 꺼짐(view/flash) — 아래 시간표 'port')
        if (calm) return;
        const sx = seamX / DOT;
        // 경계선 빛: 큰 옅은 웅덩이 + 줄 빛 (반장 색)
        if (t > 0.36 && portW) {
          // (D-690: 옛 「녹은 띠」 베이어 디더는 D-675로 걷었다 — 초상 사선 테가 경계를 맡는다)
          if (o.rule === 'spawn') {
            // 경계선을 타고 오르내리는 전기 줄기 (지그재그 1칸 선, 80ms마다 모양이 바뀐다)
            const f = Math.floor(t * 12);
            let y = seamY0(), x = sx;
            const r2 = new Rng(f + 3);
            p.fade = 1;
            while (y < seamY1()) { const ny = y + r2.range(3, 7), nx = sx + r2.range(-4, 4); p.line(x, y, nx, ny, r2.chance(0.3) ? WHITE : PAL.toxic[6]); p.glow(nx, ny, 4, PAL.toxic[5], 0.25); x = nx; y = ny; }
          }
          if (ent === 'scan') drawScan(p, t);
          else if (ent === 'pull') drawPull(p, t, sx);
          else if (ent === 'siren') drawSiren(p, t, sx);
        }
        ps.draw(p, 'back');
        ps.draw(p, 'front');
        lights.draw(p);
      },
    );
  });
