import { EYES, NPCS, type Mood, type NpcId } from '../data/npcs';

/**
 * 임시 초상화 (D-134): 64×64 도트 캔버스에 기물 도트 + 코드로 찍은 큰 눈 · 소품. 가끔 눈을 깜빡인다.
 * 화면은 <canvas data-npc data-mood>만 두고, 그린 뒤 paintPortraits(root)를 부른다.
 */
const G = 64;
const cache = new Map<string, HTMLImageElement>();
const img = (src: string): Promise<HTMLImageElement> =>
  new Promise((ok) => {
    const hit = cache.get(src);
    if (hit?.complete) return ok(hit);
    const i = hit ?? new Image();
    i.onload = () => ok(i);
    if (!hit) {
      i.src = src;
      cache.set(src, i);
    }
  });

const disc = (c: CanvasRenderingContext2D, cx: number, cy: number, r: number, fill: string) => {
  c.fillStyle = fill;
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) c.fillRect(cx + x, cy + y, 1, 1);
};

/** 눈 하나: 검정 테두리 · 흰자 · 눈동자(연기에 따라) · 눈꺼풀 */
const eye = (c: CanvasRenderingContext2D, cx: number, cy: number, r: number, mood: Mood, blink: boolean, side: 'l' | 'r') => {
  disc(c, cx, cy, r + 1, '#0b0b0e');
  disc(c, cx, cy, r, '#f4f1ea');
  if (blink) {
    c.fillStyle = '#0b0b0e';
    c.fillRect(cx - r, cy, r * 2 + 1, 1);
    return;
  }
  const p = mood === 'wide' ? 1 : 2;
  const dx = mood === 'look' ? Math.round(r * 0.45) : mood === 'glare' ? (side === 'l' ? 1 : -1) : 0;
  const dy = mood === 'sleepy' ? Math.round(r * 0.35) : 0;
  c.fillStyle = '#0b0b0e';
  c.fillRect(cx + dx - p, cy + dy - p + 1, p * 2, p * 2);
  // 눈꺼풀: 가늘게 · 졸림 · 흘김 (기울어진 꺼풀)
  const lid = mood === 'narrow' ? 0.45 : mood === 'sleepy' ? 0.6 : 0;
  c.fillStyle = '#2a2731';
  if (lid) c.fillRect(cx - r, cy - r, r * 2 + 1, Math.round(r * 2 * lid));
  if (mood === 'glare')
    for (let i = 0; i <= r * 2; i++) {
      const h = Math.round((side === 'l' ? i : r * 2 - i) * 0.45);
      c.fillRect(cx - r + i, cy - r, 1, h);
    }
};

/** 검수 저울 몸: 황동 기둥 · 가로대 · 접시 둘 (접시마다 눈 하나) */
const drawScale = (c: CanvasRenderingContext2D, mood: Mood, blink: boolean) => {
  c.fillStyle = '#0b0b0e';
  c.fillRect(29, 18, 6, 44);
  c.fillRect(8, 16, 48, 5);
  c.fillRect(20, 56, 24, 6);
  c.fillStyle = '#c89b3c';
  c.fillRect(30, 19, 4, 42);
  c.fillRect(9, 17, 46, 3);
  c.fillRect(21, 57, 22, 4);
  for (const x of [14, 50]) {
    c.fillStyle = '#0b0b0e';
    c.fillRect(x - 9, 36, 19, 4);
    c.fillStyle = '#e0b85a';
    c.fillRect(x - 8, 37, 17, 2);
  }
  eye(c, 14, 29, 6, mood, blink, 'l');
  eye(c, 50, 29, 6, mood, blink, 'r');
};

const drawProps = (c: CanvasRenderingContext2D, props: string[], e: { lx: number; rx: number; y: number; r: number }) => {
  for (const p of props) {
    if (p === 'rust') {
      c.fillStyle = '#9a4f22';
      for (const [x, y] of [[18, 36], [22, 44], [44, 40], [40, 50], [16, 52], [47, 30], [26, 56]]) c.fillRect(x, y, 2, 2);
      c.clearRect(12, 12, 8, 6); // 깨진 성가퀴
    } else if (p === 'tag') {
      c.fillStyle = '#0b0b0e';
      c.fillRect(48, 34, 12, 9);
      c.fillStyle = '#f1e2b4';
      c.fillRect(49, 35, 10, 7);
      c.fillStyle = '#c89b3c';
      c.fillRect(46, 33, 3, 1);
      c.fillRect(51, 37, 6, 1);
      c.fillRect(51, 39, 4, 1);
    } else if (p === 'monocle') {
      c.fillStyle = '#c89b3c';
      for (let a = 0; a < 64; a++) {
        const t = (a / 64) * Math.PI * 2;
        c.fillRect(Math.round(e.rx + Math.cos(t) * (e.r + 2)), Math.round(e.y + Math.sin(t) * (e.r + 2)), 1, 1);
      }
      c.fillRect(e.rx + e.r + 1, e.y + 2, 1, 14);
    } else if (p === 'wrench') {
      c.fillStyle = '#0b0b0e';
      c.fillRect(46, 30, 5, 30);
      c.fillRect(43, 26, 11, 6);
      c.fillStyle = '#9aa3ad';
      c.fillRect(47, 31, 3, 28);
      c.fillRect(44, 27, 9, 4);
      c.clearRect(47, 26, 3, 3);
    } else if (p === 'coin') {
      disc(c, 50, 54, 5, '#0b0b0e');
      disc(c, 50, 54, 4, '#facc15');
      c.fillStyle = '#b8860b';
      c.fillRect(49, 52, 2, 4);
    } else if (p === 'hammer') {
      c.fillStyle = '#0b0b0e';
      c.fillRect(50, 26, 4, 30);
      c.fillRect(45, 52, 14, 9);
      c.fillStyle = '#8a6a3a';
      c.fillRect(51, 27, 2, 28);
      c.fillStyle = '#9aa3ad';
      c.fillRect(46, 53, 12, 7);
    } else if (p === 'stamp') {
      c.fillStyle = '#0b0b0e';
      c.fillRect(24, 40, 16, 10);
      c.fillStyle = '#d64545';
      c.fillRect(25, 41, 14, 8);
      c.fillStyle = '#0b0b0e';
      c.fillRect(28, 44, 8, 2);
    } else if (p === 'paperCrown') {
      // 너무 큰 종이 왕관: 눈 위까지 내려온다
      const y = e.y - e.r - 6;
      c.fillStyle = '#0b0b0e';
      c.fillRect(13, y - 1, 38, 12);
      c.fillStyle = '#efe2c0';
      c.fillRect(14, y + 2, 36, 8);
      for (const x of [14, 23, 32, 41]) {
        c.fillStyle = '#0b0b0e';
        c.fillRect(x + 2, y - 6, 6, 7);
        c.fillStyle = '#efe2c0';
        c.fillRect(x + 3, y - 5, 4, 7);
      }
      c.fillStyle = '#c9b48a';
      c.fillRect(14, y + 8, 36, 2);
    }
  }
};

const draw = async (cv: HTMLCanvasElement, blink = false): Promise<void> => {
  const id = cv.dataset.npc as NpcId;
  const def = NPCS[id];
  if (!def) return;
  const mood = (cv.dataset.mood as Mood) || def.mood;
  const c = cv.getContext('2d')!;
  c.imageSmoothingEnabled = false;
  c.clearRect(0, 0, G, G);
  if (def.body === 'scale') return drawScale(c, mood, blink);
  const { piece, side, scale = 1 } = def.body;
  const im = await img(`pieces/l-${piece}${side}.png`);
  const s = Math.round(G * scale);
  const off = G - s;
  c.drawImage(im, Math.round(off / 2), off, s, s);
  const e = EYES[piece];
  const k = (v: number) => Math.round(off / 2 + v * scale);
  const ey = { lx: k(e.lx), rx: k(e.rx), y: off + Math.round(e.y * scale), r: Math.max(4, Math.round(e.r * scale)) };
  const props = def.props.filter((p) => p !== 'paperCrown');
  drawProps(c, props, ey);
  const big = def.props.includes('monocle');
  eye(c, ey.lx, ey.y, ey.r, mood, blink, 'l');
  eye(c, ey.rx, ey.y, big ? ey.r + 1 : ey.r, mood, blink, 'r');
  if (def.props.includes('monocle')) drawProps(c, ['monocle'], { ...ey, r: ey.r + 1 });
  if (def.props.includes('paperCrown')) drawProps(c, ['paperCrown'], ey);
};

const calm = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
let blinker: number | undefined;

/** root 안의 초상화를 모두 그린다 · 가끔 하나씩 깜빡인다 */
export const paintPortraits = (root: ParentNode = document): void => {
  const all = [...root.querySelectorAll<HTMLCanvasElement>('canvas[data-npc]')];
  for (const cv of all) {
    cv.width = G;
    cv.height = G;
    void draw(cv);
  }
  window.clearInterval(blinker);
  if (!all.length || calm()) return;
  blinker = window.setInterval(() => {
    const live = all.filter((x) => x.isConnected);
    if (!live.length) return window.clearInterval(blinker);
    const cv = live[Math.floor(Math.random() * live.length)];
    void draw(cv, true).then(() => window.setTimeout(() => void draw(cv), 130));
  }, 2600);
};

/** 말하는 이 한 줄: 초상화 · 이름 · 대사 */
export const speaker = (id: NpcId, line: string, mood?: Mood): string =>
  `<div class="speaker"><canvas class="portrait" data-npc="${id}"${mood ? ` data-mood="${mood}"` : ''} aria-hidden="true"></canvas><div class="speech"><b>${NPCS[id].name}</b><p>${line}</p></div></div>`;

/** 큰 초상화 (돌발 그림 자리) */
export const portraitBig = (id: NpcId, mood?: Mood): string => `<canvas class="portrait big" data-npc="${id}"${mood ? ` data-mood="${mood}"` : ''} aria-label="${NPCS[id].name}"></canvas>`;
