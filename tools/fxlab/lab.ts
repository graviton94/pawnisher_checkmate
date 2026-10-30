/**
 * FX 랩: 게임과 같은 이펙트 코드(src/view/attackFx.ts)와 같은 엔진으로 공격 장면을 캔버스에 재생한다.
 * `node tools/fxlab/build.cjs <출력.html>`로 한 장짜리 HTML을 만든다.
 */
import { createBattle, EMPTY_LOADOUT, resolveTurn, type BattleEvent, type BattleState, type Piece, type PieceType, type Side } from '../../src/engine';
import { MOVE_TOTAL, buildAttackFx, drawHitSpark, drawLandPuff, drawShatter, moveMotion, type Pose } from '../../src/view/attackFx';
import { PixelPen } from '../../src/view/pixel';
import { FX_CHOICE, FX_VARIANT_NAMES, type KingFx, type QueenFx } from '../../src/data/fx';
import { CHANGELOG, DECISIONS, OPEN_QUESTIONS, PIECES, VERSION, type Status } from './decisions';

declare const SPRITES: Record<string, string>;

/** 엔진 좌표 (아군 아래쪽). 공격자 출발 → 도착, 상대 폰 자리 */
const CASES: Record<PieceType, { from: [number, number]; to: [number, number]; foes: [number, number][] }> = {
  P: { from: [3, 1], to: [3, 2], foes: [[2, 3], [4, 3]] },
  // 출발 칸도 L자 칸 중 하나라 비워 둔다 → 7칸에 번개
  N: { from: [1, 3], to: [3, 4], foes: [[2, 6], [4, 6], [5, 5], [5, 3], [4, 2], [2, 2], [1, 5]] },
  B: { from: [2, 0], to: [4, 2], foes: [[6, 4], [2, 4], [7, 5]] },
  R: { from: [0, 2], to: [3, 2], foes: [[3, 6], [6, 2]] },
  Q: { from: [3, 0], to: [3, 3], foes: [[3, 6], [6, 6], [0, 6], [6, 3]] },
  K: { from: [4, 0], to: [4, 1], foes: [[3, 2], [5, 2]] },
};

const T = 96; // 캔버스 내부 칸 크기 (도트 6px)
const N = 8;
const opt = { type: 'N' as PieceType, side: 0 as Side, speed: 1, loop: true, Q: FX_CHOICE.Q as QueenFx, K: FX_CHOICE.K as KingFx };

// ---------- 장면 만들기 (게임과 같은 엔진) ----------
interface Scene {
  start: BattleState;
  events: BattleEvent[];
  attackerId: number;
}
const mirror = (p: [number, number], side: Side): [number, number] => (side === 0 ? p : [p[0], N - 1 - p[1]]);

const makeScene = (type: PieceType, side: Side): Scene => {
  const c = CASES[type];
  const atkDeck = type === 'K' ? ['K', 'P'] : ['K', type];
  const foeDeck = ['K', ...c.foes.map(() => 'P')];
  const decks = (side === 0 ? [atkDeck, foeDeck] : [foeDeck, atkDeck]) as [PieceType[], PieceType[]];
  let s = createBattle({ width: N, height: N, decks, loadouts: [EMPTY_LOADOUT, EMPTY_LOADOUT] });
  s = structuredClone(s);
  const mine = s.pieces.filter((p) => p.side === side);
  const foes = s.pieces.filter((p) => p.side !== side);
  const actor = type === 'K' ? mine.find((p) => p.type === 'K')! : mine.find((p) => p.type === type)!;
  const place = (p: Piece, xy: [number, number]) => Object.assign(p, { x: xy[0], y: xy[1] });
  for (const p of mine) if (p !== actor) place(p, mirror([7, 0], side));
  place(actor, mirror(c.from, side));
  place(foes.find((p) => p.type === 'K')!, mirror([7, 7], side));
  foes.filter((p) => p.type !== 'K').forEach((p, i) => place(p, mirror(c.foes[i], side)));
  const to = mirror(c.to, side);
  if (side === 1) s = resolveTurn(s, []).state; // 아군이 먼저 쉬고 적이 둔다
  const start = structuredClone(s);
  const r = resolveTurn(s, [{ pieceId: actor.id, to: { x: to[0], y: to[1] } }]);
  return { start, events: r.events, attackerId: actor.id };
};

// ---------- 그림 ----------
const canvas = document.getElementById('stage') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
canvas.width = canvas.height = T * N;
ctx.imageSmoothingEnabled = false;

const sprites: Record<string, HTMLImageElement> = {};
const whites: Record<string, HTMLCanvasElement> = {};
for (const [k, url] of Object.entries(SPRITES)) {
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const x = c.getContext('2d')!;
    x.drawImage(img, 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = '#fff';
    x.fillRect(0, 0, c.width, c.height);
    whites[k] = c;
  };
  img.src = url;
  sprites[k] = img;
}

const hex = (c: number, a = 1) => `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},${a})`;
const pen = new PixelPen({ fillStyle: (c: number, a = 1) => (ctx.fillStyle = hex(c, a)), fillRect: (x: number, y: number, w: number, h: number) => ctx.fillRect(x, y, w, h) }, T / 16);
const px = (x: number, y: number) => ({ x: x * T, y: (N - 1 - y) * T });
const center = (x: number, y: number) => ({ x: x * T + T / 2, y: (N - 1 - y) * T + T / 2 });

const drawBoard = () => {
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const w = px(x, y);
      ctx.fillStyle = (x + y) % 2 === 0 ? '#2f2e36' : '#56545e';
      ctx.fillRect(w.x, w.y, T, T);
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(w.x, w.y, T, 4);
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(w.x, w.y + T - 4, T, 4);
    }
};

interface Live {
  p: Piece;
  x: number;
  y: number;
  hp: number;
  flashUntil: number;
  dead: boolean;
  pose: Pose;
}
const drawPiece = (l: Live, now: number) => {
  if (l.dead) return;
  const k = `${l.p.type}${l.p.side}`;
  const img = now < l.flashUntil ? whites[k] : sprites[k];
  if (!img) return;
  const s = T * 0.82;
  const { dx, dy, sx, sy } = l.pose;
  // 받침 아래 중심(0.85칸)을 기준으로 늘이고 누른다 — 게임과 같은 자세
  const ax = l.x + T / 2 + dx * T;
  const ay = l.y + T * 0.85 + dy * T;
  const w = s * sx;
  const h = s * sy;
  ctx.drawImage(img, ax - w / 2, ay - (T * 0.85 - T * 0.43 + s / 2) * sy, w, h);
  // 발밑 받침 (지금 게임과 같은 임시 모양)
  ctx.fillStyle = l.p.side === 0 ? '#38bdf8' : '#e5262f';
  ctx.fillRect(l.x + T * 0.22, l.y + T * 0.8, T * 0.56, 4);
  // HP 바
  const bw = T * 0.62;
  ctx.fillStyle = '#16141c';
  ctx.fillRect(l.x + (T - bw) / 2, l.y + T * 0.9, bw, 6);
  ctx.fillStyle = l.p.side === 0 ? '#38bdf8' : '#e5262f';
  ctx.fillRect(l.x + (T - bw) / 2, l.y + T * 0.9, (bw * Math.max(0, l.hp)) / l.p.maxHp, 6);
};

// ---------- 재생 ----------
interface Popup {
  x: number;
  y: number;
  text: string;
  color: string;
  at: number;
  size: number;
}
interface Burst {
  kind: 'spark' | 'shatter';
  x: number;
  y: number;
  side: Side;
  at: number;
}

let token = 0;
const play = () => {
  const my = ++token;
  const sc = makeScene(opt.type, opt.side);
  const lives = new Map<number, Live>();
  for (const p of sc.start.pieces) {
    const w = px(p.x, p.y);
    lives.set(p.id, { p, x: w.x, y: w.y, hp: p.hp, flashUntil: 0, dead: false, pose: { dx: 0, dy: 0, sx: 1, sy: 1 } });
  }
  const mv = sc.events.find((e) => e.type === 'move' && e.pieceId === sc.attackerId) as Extract<BattleEvent, { type: 'move' }>;
  const atk = sc.events.find((e) => e.type === 'attack' && e.attackerId === sc.attackerId) as Extract<BattleEvent, { type: 'attack' }> | undefined;
  const me = lives.get(sc.attackerId)!;
  const kinds: PieceType[] = [me.p.type];
  const from = px(mv.from.x, mv.from.y);
  const to = px(mv.to.x, mv.to.y);
  const o = center(mv.to.x, mv.to.y);
  const fx = atk
    ? buildAttackFx({ kinds, side: opt.side, origin: o, tiles: atk.area.map((a) => ({ key: `${a.x},${a.y}`, ...center(a.x, a.y) })), tile: T, variant: { Q: opt.Q, K: opt.K } })
    : null;
  const MOVE = MOVE_TOTAL;
  const FX0 = MOVE + 60;
  const popups: Popup[] = [];
  const bursts: Burst[] = [];
  // 피격 일정 (이펙트가 칸에 닿는 순간)
  const hits = (atk?.hits ?? []).map((h) => {
    const l = lives.get(h.targetId)!;
    const key = `${l.p.x},${l.p.y}`;
    return { h, l, at: FX0 + (fx?.impact.get(key) ?? 0), done: false };
  });
  const end = FX0 + (fx?.duration ?? 0) + 900;
  const t0 = performance.now();

  const frame = (now: number) => {
    if (my !== token) return;
    const ms = (now - t0) * opt.speed;
    // 이동(들기 → 지수형 이동 → 착지 출렁임) → 공격 자세 (게임과 같은 함수)
    const mm = moveMotion(Math.min(ms, MOVE), me.p.type === 'N');
    me.x = from.x + (to.x - from.x) * mm.p;
    me.y = from.y + (to.y - from.y) * mm.p;
    me.pose = ms < MOVE ? mm.pose : fx && ms < FX0 + fx.duration ? fx.actor(ms - FX0) : { dx: 0, dy: 0, sx: 1, sy: 1 };
    for (const x of hits)
      if (!x.done && ms >= x.at) {
        x.done = true;
        x.l.hp = x.h.hpAfter;
        x.l.flashUntil = now + 70 / opt.speed;
        const c = { x: x.l.x + T / 2, y: x.l.y + T * 0.45 };
        bursts.push({ kind: 'spark', x: c.x, y: c.y, side: (1 - x.l.p.side) as Side, at: ms });
        const dealt = x.l.p.hp - x.h.hpAfter;
        popups.push({
          x: c.x,
          y: x.l.y + T * 0.15,
          text: x.h.killed ? `-${dealt}☠` : `-${dealt}`,
          color: x.h.killed ? '#FACC15' : x.l.p.side === 0 ? '#FF6B6B' : '#FFFFFF',
          at: ms,
          size: Math.round(T * (0.4 + 0.25 * Math.min(1, dealt / x.l.p.maxHp))),
        });
        if (x.h.killed) {
          x.l.dead = true;
          bursts.push({ kind: 'shatter', x: c.x, y: c.y, side: x.l.p.side, at: ms });
        }
      }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBoard();
    // 이동 칸 표시
    ctx.strokeStyle = 'rgba(56,189,248,0.6)';
    ctx.lineWidth = 3;
    ctx.strokeRect(from.x + 3, from.y + 3, T - 6, T - 6);
    for (const l of lives.values()) drawPiece(l, now);
    if (mm.landQ >= 0 && ms < MOVE) drawLandPuff(pen, o.x, o.y, T, mm.landQ);
    if (fx && ms >= FX0) fx.draw(pen, ms - FX0);
    for (const b of bursts) {
      const len = b.kind === 'spark' ? 160 : 380;
      const q = (ms - b.at) / len;
      if (q >= 0 && q < 1) (b.kind === 'spark' ? drawHitSpark : drawShatter)(pen, b.x, b.y, T, b.side, q);
    }
    for (const p of popups) {
      const q = (ms - p.at) / 950;
      if (q < 0 || q >= 1) continue;
      const rise = 1 - (1 - Math.min(1, q * 3.5)) ** 3;
      const pop = 1 + 0.7 * 2 ** (-10 * Math.min(1, q * 3.5));
      ctx.globalAlpha = q < 0.68 ? 1 : 1 - (q - 0.68) / 0.32;
      ctx.font = `700 ${Math.round(p.size * pop)}px Galmuri11, monospace`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 8;
      ctx.strokeStyle = '#0b0b0e';
      ctx.strokeText(p.text, p.x, p.y - T * 0.35 * rise);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, p.y - T * 0.35 * rise);
      ctx.globalAlpha = 1;
    }
    if (ms < end) requestAnimationFrame(frame);
    else if (opt.loop) setTimeout(() => my === token && play(), 500);
  };
  requestAnimationFrame(frame);
};

// ---------- 화면 (조작 · 결정 목록) ----------
const STATUS: Record<Status, string> = { done: '확정', review: '보는 중', pick: '골라 주세요', wait: '에셋 대기' };
const chip = (s: Status) => `<span class="chip chip-${s}">${STATUS[s]}</span>`;
const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;

const renderPanel = () => {
  const d = PIECES[opt.type];
  const names: Record<string, string> | null = opt.type === 'Q' ? FX_VARIANT_NAMES.Q : opt.type === 'K' ? FX_VARIANT_NAMES.K : null;
  const cur = opt.type === 'Q' ? opt.Q : opt.K;
  const variant = names ? Object.entries(names).map(([v, n]) => `<button type="button" class="seg" data-v="${v}" aria-pressed="${cur === v}">${v} · ${n}</button>`).join('') : '';
  $('#detail').innerHTML = `
    <div class="detail-head"><h2>${d.name}</h2>${chip(d.status)}</div>
    ${variant ? `<div class="segs" role="group" aria-label="${d.name} 안">${variant}</div>` : ''}
    <p>${d.idea}</p>
    <dl><dt>박자</dt><dd>${d.beat}</dd>${d.changed ? `<dt>이번에 바뀐 점</dt><dd class="new">${d.changed}</dd>` : ''}</dl>`;
  document.querySelectorAll<HTMLButtonElement>('[data-v]').forEach((b) =>
    b.addEventListener('click', () => {
      if (opt.type === 'Q') opt.Q = b.dataset.v as QueenFx;
      else opt.K = b.dataset.v as KingFx;
      renderPanel();
      play();
    }),
  );
};

const init = () => {
  $('#ver').textContent = `v${VERSION.n} · ${VERSION.date}`;
  $('#tabs').innerHTML = (['P', 'N', 'B', 'R', 'Q', 'K'] as PieceType[])
    .map((k) => `<button type="button" class="tab" data-t="${k}" aria-pressed="${k === opt.type}"><span>${PIECES[k].name}</span>${PIECES[k].status === 'pick' ? '<i class="dot" aria-label="고를 것 있음"></i>' : PIECES[k].changed ? '<i class="dot dot-new" aria-label="바뀜"></i>' : ''}</button>`)
    .join('');
  document.querySelectorAll<HTMLButtonElement>('[data-t]').forEach((b) =>
    b.addEventListener('click', () => {
      opt.type = b.dataset.t as PieceType;
      document.querySelectorAll('[data-t]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      renderPanel();
      play();
    }),
  );
  const bindSeg = (attr: string, set: (v: string) => void) =>
    document.querySelectorAll<HTMLButtonElement>(`[${attr}]`).forEach((b) =>
      b.addEventListener('click', () => {
        set(b.getAttribute(attr)!);
        document.querySelectorAll(`[${attr}]`).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        play();
      }),
    );
  bindSeg('data-side', (v) => (opt.side = Number(v) as Side));
  bindSeg('data-speed', (v) => (opt.speed = Number(v)));
  $('#replay').addEventListener('click', play);
  ($('#loop') as HTMLInputElement).addEventListener('change', (e) => {
    opt.loop = (e.target as HTMLInputElement).checked;
    if (opt.loop) play();
  });
  $('#questions').innerHTML = OPEN_QUESTIONS.map((q) => `<li>${q}</li>`).join('');
  $('#decisions').innerHTML = DECISIONS.map((d) => `<tr><th scope="row">${d.item}</th><td>${d.rule}</td><td>${chip(d.status)}</td></tr>`).join('');
  $('#log').innerHTML = CHANGELOG.map((c) => `<li><b>v${c.v}</b> <span class="muted">${c.date}</span><ul>${c.items.map((i) => `<li>${i}</li>`).join('')}</ul></li>`).join('');
  renderPanel();
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    opt.loop = false;
    ($('#loop') as HTMLInputElement).checked = false;
  }
  void document.fonts.load('700 20px Galmuri11').finally(play);
};
init();
