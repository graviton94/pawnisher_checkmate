import { sfx } from '../audio/sfx';

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
  root.setProperty('--door', `url(${pixelSprite(['HHHHHHHHHHHHHHHHHHHHHHHH', 'LBBBBBBBBBBBBBBBBBBBBBBB', 'BBRBBBBBBBBBBBBBBBBBBBBB', 'BRrBBBBBBBBBBBBBBBBBBBBB', 'BBBBBBBBBBBBBBBBBBBBBBBB', 'SSSSSSSSSSSSSSSSSSSSSSSS', 'DDDDDDDDDDDDDDDDDDDDDDDD', 'KKKKKKKKKKKKKKKKKKKKKKKK'], { H: '#6b6876', L: '#4a4854', B: '#3a3843', R: '#8a8794', r: '#1c1b22', S: '#2c2a33', D: '#1c1b22', K: '#0b0b0e' }, 2)})`);
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
export const flyTo = (el: HTMLElement, target: Element | { x: number; y: number }, ms = 620): Promise<void> =>
  new Promise((done) => {
    if (calm()) return done();
    const a = el.getBoundingClientRect();
    const to = 'getBoundingClientRect' in target ? centerOf(target) : target;
    const ghost = el.cloneNode(true) as HTMLElement;
    Object.assign(ghost.style, { position: 'fixed', left: `${a.left}px`, top: `${a.top}px`, width: `${a.width}px`, height: `${a.height}px`, margin: '0', zIndex: '90', pointerEvents: 'none' });
    ghost.classList.add('flyghost');
    document.body.appendChild(ghost);
    el.style.visibility = 'hidden';
    const dx = to.x - (a.left + a.width / 2);
    const dy = to.y - (a.top + a.height / 2);
    ghost.animate(
      [
        { transform: 'translate(0,-14px) rotate(-3deg) scale(1.08)' },
        { transform: 'translate(0,-24px) rotate(4deg) scale(1.16)', offset: 0.25 },
        { transform: `translate(${dx}px,${dy}px) rotate(18deg) scale(0.16)`, opacity: 0.3 },
      ],
      { duration: ms, easing: 'cubic-bezier(.6,-.4,.8,.4)', fill: 'forwards' },
    );
    window.setTimeout(() => {
      ghost.remove();
      sparksAt(to.x, to.y, 6, 22);
      done();
    }, ms);
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
        { transform: `translate(${mx}px,${my + 6}px) rotate(${260 + i * 30}deg) scale(1)`, offset: 0.5, easing: 'cubic-bezier(.6,0,.9,.3)' },
        { transform: `translate(${to.x - from.x}px,${to.y - from.y}px) rotate(${540 + i * 30}deg) scale(.6)` },
      ],
      { duration: 900 + i * 40, fill: 'forwards' },
    );
    window.setTimeout(() => {
      s.remove();
      if (i === count - 1) {
        sparksAt(to.x, to.y, 6, 20);
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
