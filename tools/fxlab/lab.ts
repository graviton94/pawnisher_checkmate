/**
 * FX 랩: 게임과 같은 이펙트 코드(src/view/attackFx.ts)와 같은 엔진으로 공격 장면을 캔버스에 재생한다.
 * `node tools/fxlab/build.cjs <출력.html>`로 한 장짜리 HTML을 만든다.
 */
import { createBattle, EMPTY_LOADOUT, legalMoves, resolveTurn, type BattleEvent, type BattleState, type Piece, type PieceType, type Side } from '../../src/engine';
import { buildPopupArt, drawPopup, type PopupArt } from '../../src/view/popup';
import { CRUMBLE_MS, MOVE_TOTAL, buildAttackFx, drawCrumble, drawHitSpark, drawLandPuff, moveMotion, type CrumbleCell, type Pose } from '../../src/view/attackFx';
import { BOARD_DOTS, PixelPen } from '../../src/view/pixel';
import { FX_CHOICE, FX_VARIANT_NAMES, type KingFx, type QueenFx } from '../../src/data/fx';
import { CHANGELOG, DECISIONS, OPEN_QUESTIONS, PIECES, VERSION, type Status } from './decisions';

declare const SPRITES: Record<string, string>;
declare const GALLERY: { dir: string; name: string; key: string; w: number; h: number }[];

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
      // 색 규칙 (D-047): 내 공격 = 청록, 적 공격 = 진홍
      ctx.fillStyle = opt.side === 0 ? 'rgba(56,189,248,0.12)' : 'rgba(229,38,47,0.12)';
      ctx.fillRect(w.x, w.y, T, T);
      const im = sprites[opt.side === 0 ? 'range' : 'range-enemy'];
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

/** 도트 화살표: 흐르는 2도트 길(끝 쪽으로 토막이 흘러감) + 도트 화살촉. 나이트는 ㄱ자 */
const arrow = (a: { x: number; y: number }, b: { x: number; y: number }, knight: boolean, color = 0x38bdf8, ms = performance.now()) => {
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
  pen.flow(pts, color, ms);
  // 화살촉: 뒤로 갈수록 넓어지는 도트 줄
  for (let k = 0; k < 4; k++) {
    const bx = tip.x - ux * D * k;
    const by = tip.y - uy * D * k;
    for (let s2 = -k; s2 <= k; s2++) pen.px(bx - uy * D * s2, by + ux * D * s2, color, 1, 1);
  }
  pen.px(A.x, A.y, 0xbfefff, 1, 2);
};

/** 기물 그림을 판 도트 격자(D px)로 뽑는다 — 바스라짐용 (drawPiece와 같은 자리·크기) */
const cellsOf = (l: { p: Piece; x: number; y: number }, img: HTMLImageElement | undefined = sprites[`${l.p.type}${l.p.side}`], size = T, step = D): CrumbleCell[] => {
  if (!img?.complete) return [];
  const off = document.createElement('canvas');
  off.width = off.height = size;
  const o = off.getContext('2d')!;
  o.imageSmoothingEnabled = false;
  const s = size * 0.82;
  o.drawImage(img, (size - s) / 2, size * 0.43 - s / 2, s, s);
  const data = o.getImageData(0, 0, size, size).data;
  const cells: CrumbleCell[] = [];
  for (let y = 0; y < size; y += step)
    for (let x = 0; x < size; x += step) {
      const k = ((y + Math.floor(step / 2)) * size + x + Math.floor(step / 2)) * 4;
      if (data[k + 3] > 128) cells.push({ x: l.x + x, y: l.y + y, c: (data[k] << 16) | (data[k + 1] << 8) | data[k + 2] });
    }
  return cells;
};

/** 흰색 도트 그림에 색을 입힌 사본 (캐시) */
const tintCache = new Map<string, HTMLCanvasElement>();
const tinted = (key: string, color: string): HTMLCanvasElement | null => {
  const id = `${key}|${color}`;
  const hit = tintCache.get(id);
  if (hit) return hit;
  const im = sprites[key];
  if (!im?.complete) return null;
  const c = document.createElement('canvas');
  c.width = im.naturalWidth;
  c.height = im.naturalHeight;
  const x = c.getContext('2d')!;
  x.drawImage(im, 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = color;
  x.fillRect(0, 0, c.width, c.height);
  tintCache.set(id, c);
  return c;
};

// ---------- 재생 ----------
interface Popup {
  x: number;
  y: number;
  art: PopupArt;
  at: number;
}
interface Burst {
  kind: 'spark';
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
  const chips: { x: number; y: number; at: number; i: number }[] = [];
  const crumbles: { cells: CrumbleCell[]; at: number }[] = [];
  const dests = legalMoves(sc.start, sc.start.pieces.find((p) => p.id === sc.attackerId)!).filter((d) => d.x !== mv.to.x || d.y !== mv.to.y);
  const kills = (atk?.hits ?? []).some((h) => h.killed);
  /** 계획 화면: 선택 모서리 · 갈 수 있는 칸 점 · 화살표 · 착지 칸 과녁 · 순번 배지 · 처치 표시 */
  const drawPlan = () => {
    blit('select', from.x, from.y);
    for (const d of dests) {
      const w = px(d.x, d.y);
      blit('move-dot', w.x + 8 * D, w.y + 8 * D);
    }
    arrow(mv.from, mv.to, me.p.type === 'N', opt.side === 0 ? 0x38bdf8 : 0xe5262f);
    blit(kills ? 'target-kill' : opt.side === 0 ? 'target' : 'target-enemy', to.x + 3 * D, to.y + 3 * D);
    blit(opt.side === 0 ? 'badge-a1' : 'badge-e1', to.x - 2 * D, to.y - 3 * D);
  };
  /** 처치될 기물 X: 기물 위 레이어 (기물을 그린 뒤에) */
  const drawKillMarks = () => {
    for (const h of atk?.hits ?? []) {
      if (!h.killed) continue;
      const l = lives.get(h.targetId)!;
      blit('kill', l.x + 13 * D, l.y + D);
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
        // 잃은 HP: 게이지에서 떨어져 나간 칸들이 하얗게 → 파도처럼 하나씩 솟아오르며 도트로 흩어진다
        const before = Math.round((12 * Math.max(0, x.l.hp)) / x.l.p.maxHp);
        const after = Math.round((12 * Math.max(0, x.h.hpAfter)) / x.l.p.maxHp);
        for (let i = after; i < before; i++) chips.push({ x: x.l.x + (4 + i) * D, y: x.l.y + 18 * D, at: ms + (before - 1 - i) * 32, i }); // 오른쪽 끝부터
        x.l.hp = x.h.hpAfter;
        x.l.flashUntil = now + 70 / opt.speed;
        const c = { x: x.l.x + T / 2, y: x.l.y + T * 0.45 };
        bursts.push({ kind: 'spark', x: c.x, y: c.y, side: (1 - x.l.p.side) as Side, at: ms });
        const dealt = x.l.p.hp - x.h.hpAfter;
        popups.push({
          x: c.x,
          y: x.l.y + T * 0.3,
          art: buildPopupArt(`-${dealt}`, x.h.killed ? 0xfacc15 : x.l.p.side === 0 ? 0xff6b6b : 0xf4f1ea, !!x.h.killed),
          at: ms,
        });
        if (x.h.killed) {
          x.l.dead = true;
          wrecks.push({ x: x.l.x, y: x.l.y });
          crumbles.push({ cells: cellsOf(x.l), at: ms });
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
    if (ms < 0 && opt.board !== 'flat') drawKillMarks();
    if (mm.landQ >= 0 && ms < MOVE) drawLandPuff(pen, o.x, o.y, T, mm.landQ);
    if (fx && ms >= FX0) fx.draw(pen, ms - FX0);
    for (const b of bursts) {
      const len = 160;
      const q = (ms - b.at) / len;
      if (q >= 0 && q < 1) drawHitSpark(pen, b.x, b.y, T, b.side, q);
    }
    for (const cr of crumbles) {
      if (ms - cr.at < CRUMBLE_MS.cut + CRUMBLE_MS.life) drawCrumble(pen, cr.cells, ms - cr.at);
    }
    for (const c of chips) {
      const t = ms - c.at;
      if (t > 420) continue;
      ctx.fillStyle = '#f4f1ea';
      if (t < 0) {
        ctx.fillRect(c.x, c.y, D, D); // 아직 떠나기 전: 그 자리에서 하얗게
        continue;
      }
      const q = t / 420;
      if (q > 0.45 && Math.floor(t / 40) % 2) continue; // 도트처럼 깜빡이며 사라짐
      const rise = 1 - (1 - q) ** 3;
      const size = q > 0.75 ? D / 2 : D;
      ctx.fillRect(Math.round(c.x + (c.i % 2 ? 1 : -1) * D * 0.6 * q), Math.round(c.y - 9 * D * rise), size, size);
    }
    for (const p of popups) drawPopup(pen.g, p.art, p.x, p.y, D, ms - p.at, T * 0.35);
    if (ms < end) requestAnimationFrame(frame);
    else if (opt.loop) setTimeout(() => my === token && play(), 500);
  };
  requestAnimationFrame(frame);
};

// ---------- 에셋 목록 ----------
const KO: Record<string, string> = {
  'tile-light': '밝은 칸', 'tile-dark': '어두운 칸', 's0-tile-light': '제미나이 밝은 칸', 's0-tile-dark': '제미나이 어두운 칸', fallen: '무너진 칸 (제미나이)',
  crack: '붕락 균열', range: '내 공격 범위', 'range-enemy': '적 공격 범위', 'base-ally': '아군 발밑', 'base-enemy': '적 발밑', select: '선택',
  'move-dot': '갈 수 있는 칸', target: '내 과녁', 'target-enemy': '적 과녁', 'target-kill': '처치 과녁', kill: '처치될 기물', check: '체크 고리', wreck: '잔해',
  'vent-closed': '분출구 닫힘', 'vent-opening': '분출구 열림 중', 'vent-open': '분출구 열림', 'vent-steam': '분출 증기',
  'props/scrap': '고철 더미', 'props/lift': '승강판', 'props/shield': '방열 철판', 'props/trap': '톱니 덫', 'props/screwbox': '나사 상자',
  'hud/paper-crown': '종이 왕관', 'hud/skull-small': '처치 해골', 'hud/key-full': '태엽 (남음)', 'hud/key-spent': '태엽 (씀)', 'hud/key-bonus': '태엽 (보너스)', 'hud/pip': '점령 눈금',
  'frames/panel': '패널', 'frames/button': '버튼', 'frames/button-pressed': '버튼 눌림', 'frames/card-iron': '철 카드', 'frames/card-paper': '종이 카드', 'frames/slot': '빈 슬롯',
  'icons/sword': '칼날', 'icons/pierce': '관통', 'icons/fork': '포크', 'icons/wave': '충격파', 'icons/flame': '열기', 'icons/shield': '방패', 'icons/bricks': '성벽',
  'icons/chain': '사슬', 'icons/oil': '기름 방울', 'icons/skull': '해골', 'icons/horseshoe': '편자', 'icons/portal': '소용돌이 문', 'icons/swap': '맞바꿈',
  'icons/flag': '깃발', 'icons/claw': '집게', 'icons/windkey': '태엽 열쇠', 'icons/watch': '회중시계', 'icons/bell': '종', 'icons/crown': '왕관',
  'icons/star': '별', 'icons/eye': '렌즈 눈', 'icons/scale': '저울', 'icons/reticle': '과녁', 'icons/card': '천공 카드', 'icons/anvil': '모루 (공방)',
  'icons/screw': '나사 (고물상)', 'icons/question': '물음표 (사건)', 'icons/crate': '부품 상자', 'icons/wrench': '렌치 (정비소)', 'icons/lever': '레버 (운명 기관)',
};
const GROUPS: [string, string, string][] = [
  ['pieces', '기물 (사용자 도트)', '판 위 모든 그림의 크기 기준'],
  ['board', '판 칸 · 판 위 표식', '칸 = 20×20 도트. 숫자 배지는 1~9 중 일부만 표시'],
  ['code', '코드로 찍는 요소', '그 자리에서 계산해 찍는 것 — 움직임 포함'],
  ['props', '지형 소품', '기물과 같은 검정 + 흰 테두리'],
  ['hud', '주인공 · 태엽 · 눈금', '종이 왕관은 내 킹(아홉째 폰) 머리에 얹는다'],
  ['frames', 'UI 프레임', '회색 4단계 — 쓰임에 따라 코드가 색을 입힌다 (9-slice)'],
  ['icons', '아이콘 문양 30종', '흰색 한 가지 — 쓰임에 따라 코드가 색을 입힌다'],
];
const S = 4; // 목록 확대 배율

const renderGallery = () => {
  const box = document.getElementById('gallery')!;
  const item = (label: string, w: number, h: number, inner: string) => `<div class="g-item">${inner}<b>${label}</b><span>${w}×${h}</span></div>`;
  const parts: string[] = [];
  for (const [g, title, note] of GROUPS) {
    let items = '';
    if (g === 'pieces') {
      for (const t of ['P', 'N', 'B', 'R', 'Q', 'K']) for (const sd of [0, 1]) items += item(`${t}${sd === 0 ? ' 아군' : ' 적'}`, 16, 16, `<img src="${SPRITES[`${t}${sd}`]}" width="${16 * S}" height="${16 * S}" alt="">`);
    } else if (g === 'code') {
      items += item('HP 게이지 (잃는 순간)', 14, 3, '<canvas data-live="hp" width="112" height="72"></canvas>');
      items += item('화살표 (흐름 · 직선·대각·나이트)', 60, 20, '<canvas data-live="arrows" width="240" height="80"></canvas>');
      items += item('종이 왕관 킹 (조합)', 20, 24, '<canvas data-live="king" width="80" height="96"></canvas>');
      items += item('적 위협 (깜빡임)', 20, 20, '<canvas data-live="threat" width="80" height="80"></canvas>');
      items += item('처치 (재가 되어 발밑에)', 20, 20, '<canvas data-live="death" width="80" height="120"></canvas>');
      items += item('피해 숫자 · 처치 (아래부터 지워짐)', 7, 10, '<canvas data-live="pop" width="200" height="120"></canvas>');
    } else {
      for (const e of GALLERY.filter((x) => x.dir === g)) {
        if (/^badge-[ae][2-8]$/.test(e.name)) continue;
        const { w, h } = e;
        const label = KO[e.key] ?? (e.name.startsWith('badge-a') ? `내 순번 ${e.name.slice(-1)}` : e.name.startsWith('badge-e') ? `적 순번 ${e.name.slice(-1)}` : e.name);
        items += item(label, w, h, `<img src="${SPRITES[e.key]}" width="${w * S}" height="${h * S}" alt="">`);
      }
    }
    parts.push(`<div class="g-group"><h4>${title}</h4><p>${note}</p><div class="g-items">${items}</div></div>`);
  }
  box.innerHTML = parts.join('');
  // 움직이는 견본
  const cv = (k: string) => box.querySelector<HTMLCanvasElement>(`[data-live="${k}"]`)!;
  const hpC = cv('hp').getContext('2d')!;
  const arC = cv('arrows').getContext('2d')!;
  const kgC = cv('king').getContext('2d')!;
  const thC = cv('threat').getContext('2d')!;
  const dtC = cv('death').getContext('2d')!;
  const ppC = cv('pop').getContext('2d')!;
  const ppSink = { fillStyle: (c: number, a = 1) => (ppC.fillStyle = hex(c, a)), fillRect: (x: number, y: number, w: number, h: number) => ppC.fillRect(x, y, w, h) };
  let ppArts: PopupArt[] = [];
  const dtPen = new PixelPen({ fillStyle: (c: number, a = 1) => (dtC.fillStyle = hex(c, a)), fillRect: (x: number, y: number, w: number, h: number) => dtC.fillRect(x, y, w, h) }, S);
  let dtCells: CrumbleCell[] = [];
  for (const c of [hpC, arC, kgC, thC]) c.imageSmoothingEnabled = false;
  const tile = (c: CanvasRenderingContext2D, dark: boolean, x: number, y: number) => {
    const im = sprites[dark ? 'tile-dark' : 'tile-light'];
    if (im?.complete) c.drawImage(im, x, y, 20 * S, 20 * S);
  };
  const loop = (now: number) => {
    // HP: 12칸 중 5칸을 잃는 장면을 1.6초마다
    const t = now % 1600;
    hpC.clearRect(0, 0, 112, 72);
    const cell = (i: number, j: number, col: string) => {
      hpC.fillStyle = col;
      hpC.fillRect(8 + i * S * 1.5, 48 + j * S * 1.5, S * 1.5, S * 1.5);
    };
    const lost = t > 300;
    for (let i = 0; i < 14; i++) for (let j = 0; j < 3; j++) cell(i, j, '#16141c');
    cell(0, 1, '#8a8794');
    cell(13, 1, '#8a8794');
    for (let i = 0; i < 12; i++) cell(1 + i, 1, i < 7 || !lost ? '#e5262f' : '#2f2e36');
    for (let i = 7; i < 12 && lost; i++) {
      const u = t - 300 - (11 - i) * 32; // 오른쪽 끝부터
      hpC.fillStyle = '#f4f1ea';
      if (u < 0) {
        cell(1 + i, 1, '#f4f1ea');
        continue;
      }
      const q = u / 420;
      if (q >= 1 || (q > 0.45 && Math.floor(u / 40) % 2)) continue;
      const rise = 1 - (1 - q) ** 3;
      const sz = q > 0.75 ? S * 0.75 : S * 1.5;
      hpC.fillRect(8 + (1 + i) * S * 1.5 + (i % 2 ? 1 : -1) * 3 * q, 48 + S * 1.5 - 40 * rise, sz, sz);
    }
    // 화살표
    arC.clearRect(0, 0, 240, 80);
    tile(arC, false, 0, 0);
    tile(arC, true, 80, 0);
    tile(arC, false, 160, 0);
    const ap = new PixelPen({ fillStyle: (c: number, a = 1) => (arC.fillStyle = hex(c, a)), fillRect: (x: number, y: number, w: number, h: number) => arC.fillRect(x, y, w, h) }, S);
    ap.flow([{ x: 8, y: 40 }, { x: 64, y: 40 }], 0x38bdf8, now);
    ap.flow([{ x: 88, y: 72 }, { x: 144, y: 16 }], 0x38bdf8, now);
    ap.flow([{ x: 176, y: 72 }, { x: 176, y: 24 }, { x: 228, y: 24 }], 0xe5262f, now);
    // 종이 왕관 킹: 사용자 폰 + 왕관
    kgC.clearRect(0, 0, 80, 96);
    const pawn = sprites.P0;
    const crown = sprites['hud/paper-crown'];
    if (pawn?.complete) kgC.drawImage(pawn, 8, 28, 64, 64);
    if (crown?.complete) kgC.drawImage(crown, 40 - (crown.naturalWidth * S) / 2 + 2, 10, crown.naturalWidth * S, crown.naturalHeight * S);
    // 위협 깜빡임
    thC.clearRect(0, 0, 80, 80);
    tile(thC, true, 0, 0);
    thC.fillStyle = `rgba(229,38,47,${(0.14 + 0.16 * (0.5 + 0.5 * Math.sin(now / 260))).toFixed(3)})`;
    thC.fillRect(0, 0, 80, 80);
    // 처치 견본: 적 폰이 1.4초마다 바스라진다
    if (!dtCells.length) dtCells = cellsOf({ p: { type: 'P', side: 1 } as Piece, x: 0, y: 30 }, sprites.P1, 80, S);
    dtC.clearRect(0, 0, 80, 120);
    tile(dtC, false, 0, 30);
    const dt = (now % 1400) - 300;
    if (dt < 0) for (const c of dtCells) dtPen.px(c.x + 2, c.y + 2, c.c, 1);
    else drawCrumble(dtPen, dtCells, dt);
    // 피해 숫자 견본: 적 피격(흰) · 내 기물 피격(붉음) · 처치(금 + 해골)를 번갈아
    if (!ppArts.length && document.fonts.check('700 12px Galmuri11')) ppArts = [buildPopupArt('-3', 0xf4f1ea, false), buildPopupArt('-2', 0xff6b6b, false), buildPopupArt('-5', 0xfacc15, true)];
    ppC.clearRect(0, 0, 200, 120);
    if (ppArts.length) drawPopup(ppSink, ppArts[Math.floor(now / 1300) % 3], 100, 100, S, (now % 1300) - 150, 30);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
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
  renderGallery();
  renderPanel();
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    opt.loop = false;
    ($('#loop') as HTMLInputElement).checked = false;
  }
  void document.fonts.load('700 20px Galmuri11').finally(play);
};
init();
