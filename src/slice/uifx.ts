import { sfx } from '../audio/sfx';
import { arcFly } from './fx3';

/**
 * 비전투 UI 손맛 (D-184 — 타격감 연구소 2부를 본편으로). 모두 도트로만: 계단(steps) 움직임 · 도트 불똥 · 도트 스프라이트.
 * 화면은 이 함수들을 부를 뿐 게임 상태를 바꾸지 않는다 (CLAUDE.md UI 원칙 9).
 */

const calm = (): boolean => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** 글자 격자 → 도트 그림 data URL (scale = 한 칸 px) */
export const pixelSprite = (rows: string[], pal: Record<string, string>, scale = 2): string => {
  const c = document.createElement('canvas');
  c.width = rows[0].length * scale;
  c.height = rows.length * scale;
  const x = c.getContext('2d')!;
  rows.forEach((r, j) =>
    [...r].forEach((ch, i) => {
      if (!pal[ch]) return;
      x.fillStyle = pal[ch];
      x.fillRect(i * scale, j * scale, scale, scale);
    }),
  );
  return c.toDataURL();
};

const GOLDPAL = { K: '#0b0b0e', T: '#fff3b0', Y: '#facc15', A: '#9a6f14', U: '#c89b3c', G: '#56545e', L: '#8a8794', W: '#d6d3dc' };
/** 나사 머리 (십자 홈) */
let screwUrl = '';

/** CSS 변수로 쓰는 도트 그림들 (철문 판재 · 경고 줄무늬 · 손잡이 · 나사) — 시작할 때 한 번 */
export const installUiSprites = (): void => {
  screwUrl = pixelSprite(['...KKK...', '.KKTTYKK.', '.KTTKYYK.', 'KTTYKYYAK', 'KTKKKKKAK', 'KYYYKYAAK', '.KYYKYAK.', '.KKAAAKK.', '...KKK...'], GOLDPAL, 2);
  const root = document.documentElement.style;
  // 철문 판 (D-194: 사용자 "셔터가 너무 촘촘해" → 판 하나 40px, 리벳은 양끝에만)
  root.setProperty('--door', `url(${pixelSprite(['HHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH', 'LLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL', 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB', 'BRrBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBRrB', 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB', 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB', 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB', 'SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS', 'DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD', 'KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK'], { H: '#6b6876', L: '#4a4854', B: '#3a3843', R: '#8a8794', r: '#1c1b22', S: '#2c2a33', D: '#1c1b22', K: '#0b0b0e' }, 4)})`);
  root.setProperty('--hazard', `url(${pixelSprite(['YYYYKKKK', 'YYYKKKKY', 'YYKKKKYY', 'YKKKKYYY'], { Y: '#c89b3c', K: '#16141c' }, 2)})`);
  root.setProperty('--handle', `url(${pixelSprite(['.KKKKKKKKKKKKKK.', 'KAAAAAAAAAAAAAAK', 'KATTTTTTTTTTTTAK', 'KAAAAAAAAAAAAAAK', '.KKKKKKKKKKKKKK.'], { K: '#0b0b0e', A: '#7a5a12', T: '#c89b3c' }, 2)})`);
  root.setProperty('--screw', `url(${screwUrl})`);
  // 지도 메달 (도트 4단 명암 — 빛은 왼쪽 위, 그라데이션 없이) · 반장 메달(검붉은) · 톱니 고리
  const medal = (pal: Record<string, string>) => {
    const n = 19;
    const c = (n - 1) / 2;
    const rows: string[] = [];
    for (let j = 0; j < n; j++) {
      let r = '';
      for (let i = 0; i < n; i++) {
        const dx = i - c;
        const dy = j - c;
        const d = Math.hypot(dx, dy);
        if (d > c + 0.3) r += '.';
        else if (d > c - 0.9) r += 'K';
        else if (d > c - 2.4 && d < c - 1.4) r += 'A';
        else {
          const lit = (-dx - dy) / c + (d < c - 2.5 ? 0.2 : -0.6);
          r += lit > 0.9 ? 'T' : lit > 0.05 ? 'Y' : lit > -0.8 ? 'U' : 'A';
        }
      }
      rows.push(r);
    }
    return pixelSprite(rows, pal, 3);
  };
  root.setProperty('--medal', `url(${medal({ K: '#0b0b0e', T: '#8a7550', Y: '#5a4a2e', U: '#45391f', A: '#2a2218' })})`);
  root.setProperty('--medal-r', `url(${medal({ K: '#0b0b0e', T: '#8a3a3a', Y: '#6a2a2a', U: '#4a1c1c', A: '#2a1414' })})`);
  const N = 25;
  const C = (N - 1) / 2;
  const cog: string[] = [];
  for (let j = 0; j < N; j++) {
    let r = '';
    for (let i = 0; i < N; i++) {
      const dx = i - C;
      const dy = j - C;
      const d = Math.hypot(dx, dy);
      const a = (Math.atan2(dy, dx) + Math.PI * 2) % (Math.PI / 4);
      const tooth = a < Math.PI / 8;
      const outer = tooth ? C : C - 2;
      if (d > outer + 0.3 || d < C - 4.2) r += '.';
      else if (d > outer - 0.9 || d < C - 3.3) r += 'K';
      else r += tooth ? 'Y' : 'U';
    }
    cog.push(r);
  }
  root.setProperty('--cog', `url(${pixelSprite(cog, GOLDPAL, 3)})`);
};

const SPK = ['#ffffff', '#fff3b0', '#facc15', '#f59e0b'];
/** 도트 불똥 n개 (화면 좌표) */
export const sparksAt = (x: number, y: number, n = 6, dist = 30, colors = SPK): void => {
  if (calm()) return;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.5;
    const s = document.createElement('i');
    s.className = 'spk';
    s.style.left = `${x - 2}px`;
    s.style.top = `${y - 2}px`;
    s.style.background = colors[i % colors.length];
    s.style.setProperty('--x', `${Math.cos(a) * dist * (0.6 + Math.random() * 0.6)}px`);
    s.style.setProperty('--y', `${Math.sin(a) * dist * 0.7 * (0.6 + Math.random() * 0.6) + 10}px`);
    document.body.appendChild(s);
    window.setTimeout(() => s.remove(), 720);
  }
};
const centerOf = (el: Element) => {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height, top: r.top };
};

/** 황동 버튼 (연구소 「버튼」): 누르면 눌려 납작 → 떼면 튀어 오름 · 반짝 띠 · 불똥. 모든 .btn에 한 번 설치 */
export const installPressy = (): void => {
  let held: HTMLElement | null = null;
  document.addEventListener(
    'pointerdown',
    (e) => {
      const b = (e.target as Element | null)?.closest?.('.btn') as HTMLElement | null;
      if (!b || (b as HTMLButtonElement).disabled) return;
      b.classList.remove('up');
      b.classList.add('down');
      held = b;
    },
    { passive: true },
  );
  const release = (fire: boolean) => {
    const b = held;
    held = null;
    if (!b) return;
    b.classList.remove('down');
    if (!fire || calm()) return;
    void b.offsetWidth;
    b.classList.add('up');
    const c = centerOf(b);
    sparksAt(c.x, c.top, 5, 26);
    window.setTimeout(() => b.classList.remove('up'), 420);
  };
  document.addEventListener('pointerup', () => release(true), { passive: true });
  document.addEventListener('pointercancel', () => release(false), { passive: true });
};

/** 도트로 사라지기 (연구소 「보상 카드」): 아래 칸부터 떨어져 나가 작은 도트로 떠오른다 */
export const dissolveUp = (el: HTMLElement, ms = 520): void => {
  if (calm()) return void (el.style.visibility = 'hidden');
  const cols = 8;
  const rows = 11;
  const r = el.getBoundingClientRect();
  const bw = r.width / cols;
  const bh = r.height / rows;
  const th: number[] = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) th.push(((rows - 1 - j) / rows) * 0.8 + Math.random() * 0.2);
  const mask = document.createElement('canvas');
  mask.width = cols;
  mask.height = rows;
  const m = mask.getContext('2d')!;
  const gone = new Set<number>();
  const t0 = performance.now();
  const step = (now: number) => {
    const k = Math.min(1, (now - t0) / ms);
    m.clearRect(0, 0, cols, rows);
    m.fillStyle = '#000';
    th.forEach((v, idx) => {
      const i = idx % cols;
      const j = Math.floor(idx / cols);
      if (k < v) m.fillRect(i, j, 1, 1);
      else if (!gone.has(idx)) {
        gone.add(idx);
        if (idx % 2) return;
        const b = document.createElement('i');
        b.className = 'spk';
        b.style.background = ['#56545e', '#8a8794', '#45434f'][idx % 3];
        b.style.left = `${r.left + i * bw + bw / 2}px`;
        b.style.top = `${r.top + j * bh + bh / 2}px`;
        b.style.setProperty('--x', `${(Math.random() - 0.5) * 10}px`);
        b.style.setProperty('--y', `${-18 - Math.random() * 22}px`);
        b.style.setProperty('--d', '480ms');
        document.body.appendChild(b);
        window.setTimeout(() => b.remove(), 520);
      }
    });
    const url = `url(${mask.toDataURL()})`;
    el.style.setProperty('-webkit-mask-image', url);
    el.style.maskImage = url;
    el.style.setProperty('-webkit-mask-size', '100% 100%');
    el.style.maskSize = '100% 100%';
    if (k < 1) requestAnimationFrame(step);
    else el.style.visibility = 'hidden';
  };
  requestAnimationFrame(step);
};

/** 요소 복제가 기울며 들렸다가 목표 쪽으로 빨려 들어간다 (고른 카드 → 덱, 부품 → 부품 칸) */
export const flyTo = (el: HTMLElement, target: Element | { x: number; y: number }, ms = 520): Promise<void> =>
  new Promise((done) => {
    if (calm()) return done();
    const a = el.getBoundingClientRect();
    const to = 'getBoundingClientRect' in target ? centerOf(target) : target;
    const ghost = el.cloneNode(true) as HTMLElement;
    Object.assign(ghost.style, { position: 'fixed', left: `${a.left}px`, top: `${a.top}px`, width: `${a.width}px`, height: `${a.height}px`, margin: '0', zIndex: '90', pointerEvents: 'none' });
    ghost.classList.add('flyghost');
    document.body.appendChild(ghost);
    el.style.visibility = 'hidden';
    // 획득 비행 하나 (D-193): 카드도 나사 · 구매와 같은 호를 탄다
    arcFly(ghost, { x: a.left + a.width / 2, y: a.top + a.height / 2 }, to, { ms, end: 0.2, target: 'getBoundingClientRect' in target ? target : null, done });
  });

/** 나사 받기 (연구소 「나사」): 가운데서 도트 나사가 튀어 올랐다 돌며 흩어진 뒤 목표로 빨려 든다 */
export const screwBurst = (from: { x: number; y: number }, target: Element | null, n = 8): void => {
  if (calm() || !target || !screwUrl) return;
  const to = centerOf(target);
  const count = Math.max(3, Math.min(14, n));
  for (let i = 0; i < count; i++) {
    const s = document.createElement('i');
    s.className = 'screw';
    s.style.left = `${from.x}px`;
    s.style.top = `${from.y}px`;
    document.body.appendChild(s);
    const a = (i / count) * Math.PI * 2 + Math.random() * 0.4;
    const r = 40 + Math.random() * 40;
    const mx = Math.cos(a) * r;
    const my = Math.sin(a) * r * 0.7 - 30;
    s.animate(
      [
        { transform: 'translate(0,0) rotate(0) scale(.4)' },
        { transform: `translate(${mx}px,${my}px) rotate(${180 + i * 30}deg) scale(1.1)`, offset: 0.35, easing: 'cubic-bezier(.2,.8,.3,1)' },
        { transform: `translate(${mx}px,${my + 6}px) rotate(${260 + i * 30}deg) scale(1)`, offset: 0.5, easing: 'cubic-bezier(.1,.9,.2,1)' },
        { transform: `translate(${to.x - from.x}px,${to.y - from.y}px) rotate(${540 + i * 30}deg) scale(.6)` },
      ],
      { duration: 900 + i * 40, fill: 'forwards' },
    );
    window.setTimeout(() => {
      s.remove();
      if (i === count - 1) {
        sparksAt(to.x, to.y, 3, 16);
        target.classList.remove('punch');
        void (target as HTMLElement).offsetWidth;
        target.classList.add('punch');
      }
      if (i % 3 === 0) sfx('coin');
    }, 900 + i * 40);
  }
};

/**
 * 철문 전환 (연구소 「화면 전환」): 위아래 도트 철문이 가속하며 쾅 닫힘(0.3초) → 화면 흔들림 → mid() → 열림(0.42초).
 * 페이드 대신 쓰는 화면 바꿈. mid가 끝나야 열린다.
 */
export const shutter = async (mid: () => void | Promise<void>): Promise<void> => {
  if (calm()) return void (await mid());
  const wrap = document.createElement('div');
  wrap.className = 'shutterfx';
  wrap.innerHTML = '<div class="shut t close"></div><div class="shut b close"></div>';
  document.body.appendChild(wrap);
  sfx('lift');
  await new Promise((r) => window.setTimeout(r, 300));
  sfx('land');
  document.body.classList.remove('stage-shake');
  void document.body.offsetWidth;
  document.body.classList.add('stage-shake');
  await mid();
  await new Promise((r) => window.setTimeout(r, 120));
  wrap.querySelectorAll('.shut').forEach((d) => {
    d.classList.remove('close');
    d.classList.add('open');
  });
  await new Promise((r) => window.setTimeout(r, 420));
  wrap.remove();
  document.body.classList.remove('stage-shake');
};

/** 안 될 때 (연구소 「태엽 부족」): 카드가 좌우로 떨고 붉은 테, 빈 태엽 칸이 붉게 깜빡 */
export const nope = (el: Element | null, vials?: Element | null): void => {
  if (!el) return;
  el.classList.remove('nope');
  void (el as HTMLElement).offsetWidth;
  el.classList.add('nope');
  window.setTimeout(() => el.classList.remove('nope'), 400);
  vials?.querySelectorAll('.seg:not(.on)').forEach((v) => {
    v.classList.remove('apb');
    void (v as HTMLElement).offsetWidth;
    v.classList.add('apb');
  });
};

/** 부품 장착 (연구소 「부품 장착」): 새 부품 칩이 비틀려 들어와 철컥 잠기고 리벳 불똥 */
export const mountPart = (chip: Element | null): void => {
  if (!chip || calm()) return;
  chip.classList.remove('mount');
  void (chip as HTMLElement).offsetWidth;
  chip.classList.add('mount');
  window.setTimeout(() => {
    const c = centerOf(chip);
    sparksAt(c.x, c.y, 8, 26);
    sfx('stamp');
  }, 360);
};

/**
 * 메인 화면 「베인 타이틀 문장」 (D-188 · 연구소 24판): 실제 타이틀 로고의 왕관 쓴 폰이 내리꽂히고 → 붉은 가장자리 · 떨림 · 칼날 끝 빛 →
 * 굵은 도트 칼자국이 한 번에 그어짐(화면 반전 두 프레임 → 흰 섬광 · 큰 흔들림 · 줌 펀치 · 방사 속도선 · 핏방울) → 두 동강이 색 갈림과 튕겼다 출렁 →
 * 이름이 내리꽂힘 + 반짝 띠 → 대기 중 칼빛 · 반짝 띠 · 불씨. 요소가 화면에서 사라지면 대기 연출도 멈춘다.
 */
export const titleFx = async (root: HTMLElement | null): Promise<void> => {
  if (!root) return;
  const em = root.querySelector<HTMLElement>('.tfx-em')!;
  const word = root.querySelector<HTMLElement>('.tfx-word')!;
  const glint = root.querySelector<HTMLElement>('.tfx-glint')!;
  const vig = root.querySelector<HTMLElement>('.tfx-vig')!;
  const rays = root.querySelector<HTMLElement>('.tfx-rays')!;
  const flash = root.querySelector<HTMLElement>('.tfx-flash')!;
  const panel = root.closest<HTMLElement>('.panel, .opening, .prologue') ?? root;
  word.style.setProperty('--tlogo', `url(${new URL('ui/title-logo.png', document.baseURI).href})`);
  const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms));
  const re = (el: Element, cls: string) => { el.classList.remove(cls); void (el as HTMLElement).offsetWidth; el.classList.add(cls); };
  if (calm()) { em.className = 'tfx-em done'; word.classList.add('shown'); return; }
  // 칼자국 선 (문장 좌표): 오른위 A → 왼아래 B
  const A = { x: 152, y: 7.5 }, B = { x: 50, y: 114.7 };
  const ang = (Math.atan2(B.y - A.y, B.x - A.x) * 180) / Math.PI;
  const glintRun = (ms: number) => { glint.style.left = `${A.x}px`; glint.style.top = `${A.y}px`; glint.animate([{ transform: `translate(0,0) rotate(${ang}deg) scaleX(.3)`, opacity: 0 }, { opacity: 1, offset: 0.15 }, { transform: `translate(${B.x - A.x}px,${B.y - A.y}px) rotate(${ang}deg) scaleX(1.4)`, opacity: 0 }], { duration: ms, easing: 'cubic-bezier(.6,0,.4,1)' }); };
  const shake = (amp: number, ms: number) => panel.animate([{ transform: `translate(${-amp}px,${amp * 0.6}px)` }, { transform: `translate(${amp * 0.9}px,${-amp * 0.6}px)` }, { transform: `translate(${-amp * 0.6}px,${amp * 0.4}px)` }, { transform: `translate(${amp * 0.4}px,${-amp * 0.2}px)` }, { transform: 'none' }], { duration: ms, easing: 'cubic-bezier(.1,.9,.2,1)' });
  em.classList.add('run');
  sfx('lift');
  await wait(200);
  shake(4, 260);
  { const r = em.getBoundingClientRect(); sparksAt(r.left + r.width / 2, r.top + r.height * 0.9, 8, 40); sfx('land'); }
  await wait(180);
  em.classList.remove('run');
  em.classList.add('tremble');
  re(vig, 'on');
  glint.style.left = `${A.x}px`;
  glint.style.top = `${A.y}px`;
  glint.animate([{ transform: `rotate(${ang}deg) scale(.2)`, opacity: 0 }, { transform: `rotate(${ang}deg) scale(1.6, 3)`, opacity: 1 }], { duration: 120, fill: 'forwards' });
  await wait(120);
  // 베기
  em.classList.remove('tremble');
  em.classList.add('cut');
  glint.getAnimations().forEach((x) => x.cancel());
  glintRun(90);
  sfx('kill');
  root.classList.add('inv');
  window.setTimeout(() => { root.classList.remove('inv'); re(flash, 'on'); }, 60);
  shake(12, 480);
  re(root, 'punch');
  re(rays, 'on');
  (navigator as { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive !== false && navigator.vibrate?.(40);
  const er = em.getBoundingClientRect();
  for (let i = 0; i < 22; i++) {
    const t = 0.2 + Math.random() * 0.6;
    const x = er.left + A.x + (B.x - A.x) * t;
    const y = er.top + A.y + (B.y - A.y) * t;
    const side = Math.random() < 0.5 ? -1 : 1;
    const v = 30 + Math.random() * 70;
    const d = document.createElement('i');
    d.className = 'tfx-blood';
    d.style.left = `${x}px`;
    d.style.top = `${y}px`;
    if (i % 3 === 0) d.style.width = d.style.height = '3px';
    document.body.appendChild(d);
    d.animate([{ transform: 'translate(0,0)' }, { transform: `translate(${0.72 * side * v}px,${0.69 * side * v - 20}px)`, offset: 0.45 }, { transform: `translate(${0.72 * side * v * 1.3}px,${0.69 * side * v + 60}px)`, opacity: 0 }], { duration: 700 + Math.random() * 300, easing: 'cubic-bezier(.2,.8,.5,1)', fill: 'forwards' });
    window.setTimeout(() => d.remove(), 1050);
  }
  window.setTimeout(() => { em.classList.remove('cut'); em.classList.add('done'); }, 700);
  await wait(200);
  re(word, 'in');
  sfx('stamp');
  window.setTimeout(() => shake(5, 260), 160);
  window.setTimeout(() => re(word, 'shine'), 420);
  await wait(700);
  // 대기: 칼빛 · 반짝 띠 · 불씨 (타이틀이 닫히면 멈춘다)
  const idle = window.setInterval(() => { if (!root.isConnected) return void window.clearInterval(idle); glintRun(500); re(word, 'shine'); }, 2600);
  const emb = window.setInterval(() => {
    if (!root.isConnected) return void window.clearInterval(emb);
    const r = panel.getBoundingClientRect();
    const m = document.createElement('i');
    m.className = 'tfx-ember';
    m.style.left = `${r.left + 20 + Math.random() * (r.width - 40)}px`;
    m.style.top = `${r.bottom - 12}px`;
    document.body.appendChild(m);
    m.animate([{ transform: 'translate(0,0)', opacity: 1 }, { transform: `translate(${(Math.random() - 0.5) * 30}px,-${120 + Math.random() * 80}px)`, opacity: 0 }], { duration: 2200, easing: 'cubic-bezier(.2,.6,.4,1)', fill: 'forwards' });
    window.setTimeout(() => m.remove(), 2300);
  }, 300);
};
