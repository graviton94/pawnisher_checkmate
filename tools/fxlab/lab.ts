/**
 * FX 랩: 게임과 같은 이펙트 코드(src/view/attackFx.ts)와 같은 엔진으로 공격 장면을 캔버스에 재생한다.
 * `node tools/fxlab/build.cjs <출력.html>`로 한 장짜리 HTML을 만든다.
 */
import { createBattle, EMPTY_LOADOUT, legalMoves, resolveTurn, type BattleEvent, type BattleState, type Piece, type PieceType, type Side } from '../../src/engine';
import { MOVE_TOTAL, buildAttackFx, drawHitSpark, drawLandPuff, drawShatter, moveMotion, type Pose } from '../../src/view/attackFx';
import { BOARD_DOTS, PixelPen } from '../../src/view/pixel';
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

type Board = 'flat' | 's0' | 'dot';
const T = 100; // 캔버스 내부 칸 크기 (판 칸 20도트 × 5px — 정수배라야 도트가 고르다)
const N = 8;
const opt = { board: 'dot' as Board, type: 'N' as PieceType, side: 0 as Side, speed: 1, loop: true, Q: FX_CHOICE.Q as QueenFx, K: FX_CHOICE.K as KingFx };

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
const pen = new PixelPen({ fillStyle: (c: number, a = 1) => (ctx.fillStyle = hex(c, a)), fillRect: (x: number, y: number, w: number, h: number) => ctx.fillRect(x, y, w, h) }, T / BOARD_DOTS);
const px = (x: number, y: number) => ({ x: x * T, y: (N - 1 - y) * T });
const center = (x: number, y: number) => ({ x: x * T + T / 2, y: (N - 1 - y) * T + T / 2 });

/** 판 위 덧그림 시연 자리 (어느 장면의 공격 범위와도 겹치지 않는 칸) */
const DEMO = { fallen: [7, 3], crack: [0, 5], hatch: [[5, 7], [6, 7]] } as const;

const drawBoard = () => {
  const img = (k: string) => (sprites[k]?.complete ? sprites[k] : null);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const w = px(x, y);
      const dark = (x + y) % 2 === 0;
      const tile = opt.board === 'dot' ? img(dark ? 'tile-dark' : 'tile-light') : opt.board === 's0' ? img(dark ? 's0-tile-dark' : 's0-tile-light') : null;
      if (tile) ctx.drawImage(tile, w.x, w.y, T, T);
      else {
        ctx.fillStyle = dark ? '#2f2e36' : '#56545e';
        ctx.fillRect(w.x, w.y, T, T);
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(w.x, w.y, T, 4);
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fillRect(w.x, w.y + T - 4, T, 4);
      }
    }
  if (opt.board === 'flat') return;
  const at = (k: string, x: number, y: number, a = 1) => {
    const im = img(k);
    if (!im) return;
    const w = px(x, y);
    ctx.globalAlpha = a;
    ctx.drawImage(im, w.x, w.y, T, T);
    ctx.globalAlpha = 1;
  };
  at('fallen', DEMO.fallen[0], DEMO.fallen[1]);
  at('crack', DEMO.crack[0], DEMO.crack[1]);
  // 위협: 반투명 붉은 칸이 천천히 깜빡인다 (빗금 대신, 사용자 피드백)
  const pulse = 0.14 + 0.16 * (0.5 + 0.5 * Math.sin(performance.now() / 260));
  for (const [x, y] of DEMO.hatch) {
    const w = px(x, y);
    ctx.fillStyle = `rgba(229,38,47,${pulse.toFixed(3)})`;
    ctx.fillRect(w.x, w.y, T, T);
  }
};

/** 계획 화면의 공격 범위 (실행 전 잠깐 보여 준다): 지금 = 붉은 반투명 사각형, 새 그림 = 도트 테두리 + 옅은 채움 */
const drawRange = (area: { x: number; y: number }[]) => {
  for (const a of area) {
    const w = px(a.x, a.y);
    if (opt.board === 'flat') {
      ctx.fillStyle = 'rgba(229,38,47,0.22)';
      ctx.fillRect(w.x + 2, w.y + 2, T - 4, T - 4);
      ctx.strokeStyle = 'rgba(229,38,47,0.9)';
      ctx.lineWidth = 2;
      ctx.strokeRect(w.x + 2, w.y + 2, T - 4, T - 4);
    } else {
      ctx.fillStyle = 'rgba(229,38,47,0.12)';
      ctx.fillRect(w.x, w.y, T, T);
      const im = sprites.range;
      if (im?.complete) ctx.drawImage(im, w.x, w.y, T, T);
    }
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
const D = T / 20; // 판 도트 1개 (px)
/** 도트 그림을 판 도트 격자에 맞춰 그린다 (dx·dy = 칸 안 도트 좌표) */
const blit = (k: string, x: number, y: number, a = 1) => {
  const im = sprites[k];
  if (!im?.complete) return;
  ctx.globalAlpha = a;
  ctx.drawImage(im, x, y, im.width * D, im.height * D);
  ctx.globalAlpha = 1;
};
/** HP 게이지 14×3 도트: 먹색 관 + 리벳 끝 + 진영 색 채움, 잃을 HP는 금색 (코드 도트) */
const gauge = (x: number, y: number, side: Side, hp: number, after: number, max: number) => {
  const cell = (i: number, j: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(x + i * D, y + j * D, D, D);
  };
  for (let i = 0; i < 14; i++) for (let j = 0; j < 3; j++) cell(i, j, '#16141c');
  cell(0, 1, '#8a8794');
  cell(13, 1, '#8a8794');
  const keep = Math.round((12 * Math.max(0, after)) / max);
  const now = Math.round((12 * Math.max(0, hp)) / max);
  for (let i = 0; i < 12; i++) cell(1 + i, 1, i < keep ? (side === 0 ? '#38bdf8' : '#e5262f') : i < now ? '#facc15' : '#2f2e36');
};

const drawPiece = (l: Live, now: number, hpAfter?: number) => {
  if (l.dead) return;
  const k = `${l.p.type}${l.p.side}`;
  const img = now < l.flashUntil ? whites[k] : sprites[k];
  if (!img) return;
  const pixel = opt.board !== 'flat';
  if (pixel) blit(l.p.side === 0 ? 'base-ally' : 'base-enemy', l.x + 3 * D, l.y + 12 * D);
  const s = T * 0.82;
  const { dx, dy, sx, sy } = l.pose;
  // 받침 아래 중심(0.85칸)을 기준으로 늘이고 누른다 — 게임과 같은 자세
  const ax = l.x + T / 2 + dx * T;
  const ay = l.y + T * 0.85 + dy * T;
  const w = s * sx;
  const h = s * sy;
  ctx.drawImage(img, ax - w / 2, ay - (T * 0.85 - T * 0.43 + s / 2) * sy, w, h);
  if (pixel) {
    gauge(l.x + 3 * D, l.y + 17 * D, l.p.side, l.hp, hpAfter ?? l.hp, l.p.maxHp);
    return;
  }
  // (지금) 발밑 받침
  ctx.fillStyle = l.p.side === 0 ? '#38bdf8' : '#e5262f';
  ctx.fillRect(l.x + T * 0.22, l.y + T * 0.8, T * 0.56, 4);
  // (지금) HP 바
  const bw = T * 0.62;
  ctx.fillStyle = '#16141c';
  ctx.fillRect(l.x + (T - bw) / 2, l.y + T * 0.9, bw, 6);
  ctx.fillStyle = l.p.side === 0 ? '#38bdf8' : '#e5262f';
  ctx.fillRect(l.x + (T - bw) / 2, l.y + T * 0.9, (bw * Math.max(0, l.hp)) / l.p.maxHp, 6);
};

/** 도트 화살표: 2도트 청록 선 + 도트 화살촉. 나이트는 ㄱ자 */
const arrow = (a: { x: number; y: number }, b: { x: number; y: number }, knight: boolean) => {
  const A = center(a.x, a.y);
  const B = center(b.x, b.y);
  const pts = [A];
  if (knight) pts.push(Math.abs(b.x - a.x) > 1 ? { x: B.x, y: A.y } : { x: A.x, y: B.y });
  const last = pts[pts.length - 1];
  const len = Math.hypot(B.x - last.x, B.y - last.y) || 1;
  const ux = (B.x - last.x) / len;
  const uy = (B.y - last.y) / len;
  const tip = { x: B.x - ux * T * 0.32, y: B.y - uy * T * 0.32 };
  pts.push(tip);
  for (let i = 0; i < pts.length - 1; i++) pen.line(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y, 0x38bdf8, 1, 2);
  // 화살촉: 뒤로 갈수록 넓어지는 도트 줄
  for (let k = 0; k < 4; k++) {
    const bx = tip.x - ux * D * k;
    const by = tip.y - uy * D * k;
    for (let s2 = -k; s2 <= k; s2++) pen.px(bx - uy * D * s2, by + ux * D * s2, 0x38bdf8, 1, 1);
  }
  pen.px(A.x, A.y, 0xbfefff, 1, 2);
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
  const PRE = 1100; // 계획 화면처럼 공격 범위·화살표·예상 피해를 먼저 보여 준다
  const preview = new Map((atk?.hits ?? []).map((h) => [h.targetId, h.hpAfter]));
  const wrecks: { x: number; y: number }[] = [];
  const dests = legalMoves(sc.start, sc.start.pieces.find((p) => p.id === sc.attackerId)!).filter((d) => d.x !== mv.to.x || d.y !== mv.to.y);
  const kills = (atk?.hits ?? []).some((h) => h.killed);
  /** 계획 화면: 선택 모서리 · 갈 수 있는 칸 점 · 화살표 · 착지 칸 과녁 · 순번 배지 · 처치 표시 */
  const drawPlan = () => {
    blit('select', from.x, from.y);
    for (const d of dests) {
      const w = px(d.x, d.y);
      blit('move-dot', w.x + 8 * D, w.y + 8 * D);
    }
    arrow(mv.from, mv.to, me.p.type === 'N');
    blit(kills ? 'target-kill' : 'target', to.x + 3 * D, to.y + 3 * D);
    blit('badge-a1', to.x - 2 * D, to.y - 3 * D);
    for (const h of atk?.hits ?? []) {
      if (!h.killed) continue;
      const l = lives.get(h.targetId)!;
      blit('kill', l.x + 13 * D, l.y);
    }
  };
  const end = FX0 + (fx?.duration ?? 0) + 900;
  const t0 = performance.now();

  const frame = (now: number) => {
    if (my !== token) return;
    const ms = (now - t0) * opt.speed - PRE;
    // 이동(들기 → 지수형 이동 → 착지 출렁임) → 공격 자세 (게임과 같은 함수)
    const mm = moveMotion(Math.max(0, Math.min(ms, MOVE)), me.p.type === 'N');
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
          wrecks.push({ x: x.l.x, y: x.l.y });
          bursts.push({ kind: 'shatter', x: c.x, y: c.y, side: x.l.p.side, at: ms });
        }
      }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBoard();
    // 이동 칸 표시
    ctx.strokeStyle = 'rgba(56,189,248,0.6)';
    ctx.lineWidth = 3;
    ctx.strokeRect(from.x + 3, from.y + 3, T - 6, T - 6);
    if (ms < 0 && atk) drawRange(atk.area);
    if (ms < 0 && opt.board !== 'flat') drawPlan();
    for (const w of wrecks) blit('wreck', w.x + 5 * D, w.y + 14 * D);
    for (const l of lives.values()) drawPiece(l, now, ms < 0 ? preview.get(l.p.id) : undefined);
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
  bindSeg('data-board', (v) => (opt.board = v as Board));
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
