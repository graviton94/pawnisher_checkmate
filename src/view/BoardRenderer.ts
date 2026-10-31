import { vignette } from '../ui/juice';
import { TERRAIN } from '../data/terrain';
import { AFFIXES } from '../data/legions';
import { TACTICS } from '../data/tactics';
import { sfx } from '../audio/sfx';
import Phaser from 'phaser';
import type { BoardModel, BoardView, LogEntry } from '../game/controller';
import { STRONGHOLD } from '../data/battle';
import { CARDS } from '../data/cards';
import type { EnchantId } from '../data/enchants';
import { CRUMBLE_MS, MOVE_TOTAL, drawCrumble, drawLandPuff, moveMotion, fxPower, impactFeedback, playAttackFx, playHitSpark, type CrumbleCell, type Pose } from './attackFx';
import { drawArrow, drawDropDot, drawGauge } from './marks';
import { BOARD_DOTS, PixelPen } from './pixel';
import { POPUP_MS, buildPopupArt, drawPopup } from './popup';
import { TURN_SUMMARY } from '../data/fx';
import { drawGearTarget } from './target';

const REST_POSE: Pose = { dx: 0, dy: 0, sx: 1, sy: 1 };
import { findPiece, isFallen, isMove, moveTypes, standingOf, upcomingCollapse, type BattleEvent, type BattleState, type Piece, type PieceType, type Side, type Plan, type PlanStep, type Pos, type Standing } from '../engine';
import { VARIANTS } from '../data/variants';

/** 요충지 등급 색 — 플레이어의 형편 기준. 쉬울수록 밝은 금속 (GDD 5장 §5.4, 9장) */
export const GRADE: Record<Standing, { color: number; name: string }> = {
  leading: { color: 0x9aa3b5, name: '강철' },
  tier1: { color: 0xc89b3c, name: '황동' },
  tier2: { color: 0xe07b39, name: '구리' },
  tier3: { color: 0xfacc15, name: '황금' },
};


/** 기물 유형에 붙는 인챈트 — 그 기물 위에 표식으로 보인다 (GDD 9장: 인챈트는 유닛에 표시) */
const TYPE_ENCHANTS: Partial<Record<PieceType, EnchantId[]>> = { N: ['E01', 'E13'], B: ['E02', 'E14'], R: ['E03'], P: ['E04', 'E12'], K: ['E08'] };

/** 기물 텍스처 키 */
const pieceKey = (type: PieceType, side: Side) => `px-${type}-${side}`;

const C = {
  // 앱 아이콘 톤: 검정·차콜 체스판 + 붉은 사선
  light: 0x56545e,
  dark: 0x2f2e36,
  bg: 0x0b0b0e,
  cyan: 0x38bdf8,
  crimson: 0xe5262f,
  brass: 0xc89b3c,
  lose: 0xfde68a,
  ink: 0x16141c,
};

export interface BoardInput {
  tap(pos: Pos, touch: boolean): void;
  hover(pos: Pos | null): void;
  longPress(pos: Pos, clientX: number, clientY: number): void;
  longPressEnd(): void;
}

/**
 * 기기 종류별 타일 크기 (CSS px = dp). GDD 9장 §9.2: 모바일 약 48dp, PC는 화면 높이에 맞춘 크기.
 * 판 그림은 칸 = 20도트라, 기기 픽셀로 한 도트가 정수 px가 되게 올림한다 (도트 굵기가 고르게 — D-071).
 */
const tileSize = (dpr: number, cols: number, rows: number, viewW: number, viewH: number): number => {
  const want = window.matchMedia('(pointer: coarse)').matches ? 48 : window.innerHeight >= 1000 ? 96 : window.innerHeight >= 760 ? 72 : 56;
  // 판 전체가 한 화면에 들어오게 (D-074): 위 여백 0.65칸(배지) + 아래 0.25칸, 양옆 0.25칸
  const fit = Math.min(want, viewH / (rows + 0.9), viewW / (cols + 0.5));
  const dots = Math.max(5, Math.floor((fit * dpr) / BOARD_DOTS)); // 한 도트 = 기기 픽셀 정수 (내림 — 넘치지 않게)
  return (dots * BOARD_DOTS) / dpr;
};

/** 판 그림 (tools/draw-board.py · FX 랩에서 고른 것) — public/ui/board/ */
const BOARD_IMAGES = ['tile-light', 'tile-dark', 'crack', 'fallen', 'range', 'range-enemy', 'select', 'move-dot', 'target-enemy', 'kill', 'check', 'stronghold', 'stronghold-ally', 'stronghold-enemy', 'stronghold-flag', 'stronghold-ally-flag', 'stronghold-enemy-flag', 'variant-conveyor', 'variant-hammer', 'variant-mirror', 'variant-radiator', 'variant-boiler', 'variant-spring', 'variant-scope', 'variant-turret', 'variant-command', ...[1, 2, 3, 4, 5, 6, 7, 8, 9].flatMap((n) => [`badge-a${n}`, `badge-e${n}`])];
const boardKey = (name: string) => `ui-${name}`;
/** 주인공 킹 그림 (86×106 — 폰 86px 위에 왕관 20px) */

/** 예약 하나를 그릴 화살표 (이동·순간이동·캐슬링) */
const stepArrows = (s: BattleState, step: PlanStep): { piece: Piece; from: Pos; to: Pos; knight: boolean }[] => {
  const p = findPiece(s, step.pieceId);
  if (!p) return [];
  if (isMove(step) || step.kind === 'gate') return [{ piece: p, from: p, to: step.to, knight: step.kind !== 'gate' && p.type === 'N' && !p.fused }];
  if (step.kind === 'castle') {
    const q = findPiece(s, step.partnerId);
    return q ? [{ piece: p, from: p, to: q, knight: false }, { piece: q, from: q, to: p, knight: false }] : [];
  }
  if (step.kind === 'fuse') {
    const q = findPiece(s, step.partnerId);
    return q ? [{ piece: q, from: q, to: p, knight: false }] : [];
  }
  return [];
};

/** 예약 순번 배지를 붙일 칸 */
const stepBadge = (s: BattleState, virtual: BattleState, step: PlanStep): Pos => {
  if (isMove(step) || step.kind === 'gate') return step.to;
  if (step.kind === 'castle') return findPiece(s, step.partnerId) ?? findPiece(s, step.pieceId)!;
  return findPiece(virtual, step.pieceId) ?? findPiece(s, step.pieceId) ?? { x: 0, y: 0 };
};

interface PieceSprite {
  root: Phaser.GameObjects.Container;
  glyph: Phaser.GameObjects.Image;
  hp: Phaser.GameObjects.Graphics;
  piece: Piece;
}

/** 매 프레임 다시 찍는 판 표식 (흐르는 화살표 · 철컥 도는 과녁 · 위협 깜빡임 · 잃을 HP 반짝임) */
interface AnimMarks {
  arrows: { a: { x: number; y: number }; b: { x: number; y: number }; knight: boolean; color: number; alpha: number }[];
  gears: { x: number; y: number; kind: 'ally' | 'kill' }[];
  threat: { x: number; y: number }[];
  glints: { s: PieceSprite; hp: number; after: number }[];
}
const noMarks = (): AnimMarks => ({ arrows: [], gears: [], threat: [], glints: [] });

class BoardScene extends Phaser.Scene {
  input2!: BoardInput;
  tile = 48;
  dpr = 1;
  state!: BattleState;
  private tilesG!: Phaser.GameObjects.Graphics;
  private marksG!: Phaser.GameObjects.Graphics;
  private arrowsG!: Phaser.GameObjects.Graphics;
  private fxG!: Phaser.GameObjects.Graphics;
  /** 판 칸 그림 (기물 아래) · 요충지 깃발·눈금 (기물 위) */
  private tilesC!: Phaser.GameObjects.Container;
  private boardTopC!: Phaser.GameObjects.Container;
  /** 매 프레임 그리는 표식: 기물 아래(화살표·과녁·위협) / 기물 위(잃을 HP 반짝임) */
  private animG!: Phaser.GameObjects.Graphics;
  private animTopG!: Phaser.GameObjects.Graphics;
  private anim: AnimMarks = noMarks();
  /** 이번 실행에서 몇 번째 타격인지 — 효과음 음높이 (D-073) */
  private combo = 0;
  private dynamic: Phaser.GameObjects.GameObject[] = [];
  private sprites = new Map<number, PieceSprite>();
  ready!: () => void;
  announce: (text: string) => void = () => {};

  constructor() {
    super('board');
  }

  /** 사용자 제공 도트 기물 12종 (public/pieces/s-{유형}{진영}.png) */
  preload(): void {
    for (const type of ['P', 'N', 'B', 'R', 'Q', 'K'] as PieceType[])
      for (const side of [0, 1] as Side[]) this.load.image(pieceKey(type, side), `pieces/s-${type}${side}.png`);
    for (const n of BOARD_IMAGES) this.load.image(boardKey(n), `ui/board/${n}.png`);
    this.load.image(boardKey('skull'), 'ui/hud/skull-small.png');
    for (const a of [...Object.values(AFFIXES), ...Object.values(TERRAIN)]) if (!this.textures.exists(`icon-${a.icon}`)) this.load.image(`icon-${a.icon}`, `ui/icons/${a.icon}.png`);
  }

  create(): void {
    for (const type of ['P', 'N', 'B', 'R', 'Q', 'K'] as PieceType[])
      for (const side of [0, 1] as Side[]) this.textures.get(pieceKey(type, side)).setFilter(Phaser.Textures.FilterMode.NEAREST);
    for (const n of [...BOARD_IMAGES, 'skull']) this.textures.get(boardKey(n)).setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.cameras.main.setZoom(this.dpr);
    this.cameras.main.setBackgroundColor(C.bg);
    this.tilesG = this.add.graphics().setDepth(0.1);
    this.tilesC = this.add.container(0, 0).setDepth(0);
    this.marksG = this.add.graphics().setDepth(1);
    this.animG = this.add.graphics().setDepth(1.5);
    this.arrowsG = this.add.graphics().setDepth(1.6);
    this.boardTopC = this.add.container(0, 0).setDepth(4.5);
    this.animTopG = this.add.graphics().setDepth(4.6);
    this.fxG = this.add.graphics().setDepth(6);
    this.bindInput();
    this.scale.on('resize', (size: Phaser.Structs.Size) => {
      this.cameras.resize(size.width, size.height);
      this.fitCamera();
    });
    this.ready();
  }

  /** 매 프레임: 흐르는 화살표 · 철컥 도는 과녁 · 위협 깜빡임 · 잃을 HP 반짝임 */
  update(time: number): void {
    const g = this.animG;
    const top = this.animTopG;
    g.clear();
    top.clear();
    const t = this.tile;
    const pen = new PixelPen(g, t / BOARD_DOTS);
    const ms = this.calm ? 0 : time;
    if (this.anim.threat.length) {
      // 위협: 반투명 붉은 칸이 천천히 깜빡인다 (D-045)
      const a = 0.14 + 0.16 * (0.5 + 0.5 * Math.sin(time / 260));
      for (const w of this.anim.threat) g.fillStyle(C.crimson, a).fillRect(w.x, w.y, t, t);
    }
    for (const r of this.anim.gears) drawGearTarget(pen, r.x + t / 2 + pen.dot / 2, r.y + t / 2 + pen.dot / 2, r.kind, ms);
    for (const r of this.anim.arrows) drawArrow(pen, r.a, r.b, r.knight, r.color, ms, r.alpha);
    const tp = new PixelPen(top, t / BOARD_DOTS);
    for (const r of this.anim.glints) {
      if (!r.s.root.active) continue;
      drawGauge(tp, r.s.root.x + 3 * tp.dot, r.s.root.y + 16 * tp.dot, r.s.piece.side, r.hp, r.after, r.s.piece.maxHp, ms);
    }
  }

  // ---------- 좌표 ----------
  private world(pos: Pos): { x: number; y: number } {
    return { x: pos.x * this.tile, y: (this.state.height - 1 - pos.y) * this.tile };
  }
  private center(pos: Pos): { x: number; y: number } {
    const w = this.world(pos);
    return { x: w.x + this.tile / 2, y: w.y + this.tile / 2 };
  }
  private tileAt(wx: number, wy: number): Pos | null {
    const x = Math.floor(wx / this.tile);
    const y = this.state.height - 1 - Math.floor(wy / this.tile);
    return x >= 0 && y >= 0 && x < this.state.width && y < this.state.height ? { x, y } : null;
  }

  // ---------- 보드 ----------
  setupBoard(state: BattleState): void {
    this.state = state;
    this.tile = tileSize(this.dpr, state.width, state.height, this.scale.width / this.dpr, this.scale.height / this.dpr);
    this.drawTiles(state);
    this.fitCamera(true);
  }

  /** 판 칸 · 무너진 칸 · 붕락 균열 · 요충지 — 코드 도트 그림 (D-071, FX 랩에서 고른 것) */
  drawTiles(state: BattleState): void {
    const t = this.tile;
    const d = t / BOARD_DOTS;
    this.tilesG.clear();
    this.tilesC.removeAll(true);
    this.boardTopC.removeAll(true);
    const put = (c: Phaser.GameObjects.Container, name: string, x: number, y: number) =>
      c.add(this.add.image(x, y, boardKey(name)).setOrigin(0, 0).setDisplaySize(t, t));
    for (let y = 0; y < state.height; y++)
      for (let x = 0; x < state.width; x++) {
        const w = this.world({ x, y });
        put(this.tilesC, isFallen(state, x, y) ? 'fallen' : (x + y) % 2 === 0 ? 'tile-dark' : 'tile-light', w.x, w.y);
      }
    // 지형 (D-097): 칸 안쪽 색 테두리 + 가운데 흐린 아이콘 — 기물 아래에 깔린다
    for (const tr of state.terrain ?? []) {
      if (isFallen(state, tr.x, tr.y)) continue;
      const w = this.world(tr);
      const def = TERRAIN[tr.kind];
      const col = Phaser.Display.Color.HexStringToColor(def.color).color;
      const g = this.add.graphics();
      g.fillStyle(col, 0.16).fillRect(w.x + 2 * d, w.y + 2 * d, t - 4 * d, t - 4 * d);
      g.lineStyle(Math.max(1, d), col, 0.85).strokeRect(w.x + 2 * d, w.y + 2 * d, t - 4 * d, t - 4 * d);
      this.tilesC.add(g);
      this.tilesC.add(this.add.image(w.x + t / 2, w.y + t / 2, `icon-${def.icon}`).setDisplaySize(t * 0.42, t * 0.42).setTint(col).setAlpha(0.55));
    }
    // 다음 라운드에 무너질 칸 예고: 철판에 간 금 (D-045)
    for (const p of upcomingCollapse(state)) {
      const w = this.world(p);
      put(this.tilesC, 'crack', w.x, w.y);
    }
    // 요충지 (D-068·D-069): 점선 테두리는 기물 아래, 깃발·점거 눈금은 기물 위. 빈 = 흰, 내가 점거 = 청록, 적 = 진홍
    const sh = state.stronghold;
    if (sh) {
      const w = this.world(sh);
      const holder = sh.holderId !== null ? findPiece(state, sh.holderId) : undefined;
      const name = holder ? (holder.side === 0 ? 'stronghold-ally' : 'stronghold-enemy') : 'stronghold';
      put(this.tilesC, name, w.x, w.y);
      put(this.boardTopC, `${name}-flag`, w.x, w.y);
      if (holder) {
        // 점거 눈금: 버텨야 하는 상대 턴 수만큼, 칸 오른쪽 위 (아래는 HP 게이지 자리)
        const need = STRONGHOLD.terms[standingOf(state, holder.side)].hold;
        const g = this.add.graphics();
        const x0 = w.x + (19 - 3 * need) * d;
        g.fillStyle(0x0b0b0e, 1).fillRect(x0 - d, w.y + 2 * d, (3 * need + 1) * d, 4 * d);
        for (let i = 0; i < need; i++) g.fillStyle(i < sh.hold ? (holder.side === 0 ? C.cyan : C.crimson) : C.dark, 1).fillRect(x0 + i * 3 * d, w.y + 3 * d, 2 * d, 2 * d);
        this.boardTopC.add(g);
      }
    }
  }

  /** 카메라가 보는 월드 중심. 보드가 화면보다 작으면 가운데, 크면 보드 밖으로 나가지 않게 제한한다. */
  private camCenter = { x: 0, y: 0 };

  private fitCamera(toPlayerSide = false): void {
    if (!this.state) return;
    if (toPlayerSide) this.camCenter = { x: (this.state.width * this.tile) / 2, y: this.state.height * this.tile };
    this.moveCamera(this.camCenter.x, this.camCenter.y);
  }

  private moveCamera(cx: number, cy: number): void {
    const cam = this.cameras.main;
    const t = this.tile;
    const bw = this.state.width * t;
    const bh = this.state.height * t;
    const m = t * 0.25;
    const top = -m - t * 0.4;
    const viewW = cam.width / cam.zoom;
    const viewH = cam.height / cam.zoom;
    const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
    const x = bw + 2 * m <= viewW ? bw / 2 : clamp(cx, -m + viewW / 2, bw + m - viewW / 2);
    const y = bh + m - top <= viewH ? (top + bh + m) / 2 : clamp(cy, top + viewH / 2, bh + m - viewH / 2);
    this.camCenter = { x, y };
    cam.centerOn(x, y);
  }

  // ---------- 기물 ----------
  private makePiece(p: Piece, pos: Pos, alpha = 1): PieceSprite {
    const t = this.tile;
    const w = this.world(pos);
    const root = this.add.container(w.x, w.y).setDepth(2 + pos.y * -0.001 + 0.5);
    // 발밑 받침은 쓰지 않는다 (D-048) — 진영은 흰/검은 기물 + HP 게이지 색
    const base = this.add.graphics();
    const pen = new PixelPen(base, t / BOARD_DOTS);
    if (p.type === 'K' && this.state?.lastStrike?.[p.side] === 'ready') pen.ring(t / 2, t * 0.45, t * 0.44, C.brass, 1);
    const rings: Phaser.GameObjects.GameObject[] = [];
    // 체크: HP 1로 버틴 킹 — 다음에 맞으면 끝 (D-022). 위 가운데가 터진 붉은 톱니 고리
    if (p.type === 'K' && p.hp === 1 && this.state?.rules.checkmate) rings.push(this.add.image(t / 2, t / 2, boardKey('check')).setDisplaySize((t * 21) / 20, (t * 21) / 20));
    if (p.buffTurns > 0) base.fillStyle(C.brass, 1).fillTriangle(t * 0.86, t * 0.2, t * 0.78, t * 0.32, t * 0.94, t * 0.32);
    // 인챈트 표식: 왼쪽 위 황동 점 (장 수), ★ 각성
    const lo = this.state?.loadouts?.[p.side];
    const stacks = [...new Set(moveTypes(p).flatMap((ty) => TYPE_ENCHANTS[ty] ?? []))].map((e) => lo?.enchants[e] ?? 0);
    const marks: Phaser.GameObjects.GameObject[] = [];
    let my = t * 0.12;
    for (const n of stacks.filter((n) => n > 0)) {
      if (n >= 3) {
        base.fillStyle(C.brass, 1).fillCircle(t * 0.12, my, t * 0.075);
        base.fillStyle(C.ink, 1).fillCircle(t * 0.12, my, t * 0.03);
      } else for (let i = 0; i < n; i++) base.fillStyle(C.brass, 1).fillCircle(t * (0.1 + i * 0.1), my, t * 0.045);
      my += t * 0.14;
    }
    // 대장간 강화: 왼쪽 아래 +n
    const forge = lo?.forge[p.type] ?? 0;
    if (forge > 0) {
      marks.push(
        this.add
          .text(t * 0.04, t * 0.62, `+${forge}`, { fontFamily: 'Galmuri14, Galmuri11, sans-serif', fontStyle: '700', fontSize: `${Math.round(t * 0.22)}px`, color: '#E0A060', stroke: '#16141C', strokeThickness: 3 })
          .setResolution(this.dpr),
      );
    }
    // 합체: 오른쪽 위에 흡수한 유형 작은 글리프 · 폼 시프트: 바뀐 행마
    const extra = p.formAs ? [p.type] : (p.fused ?? []).filter((ty) => ty !== p.type);
    extra.forEach((ty, i) => {
      const img = this.add.image(t * 0.84, t * (0.16 + i * 0.24), pieceKey(ty, p.side)).setDisplaySize(t * 0.3, t * 0.3);
      if (p.formAs) img.setTint(0xc89b3c);
      marks.push(img);
    });
    // 이형 거푸집 (D-084): 오른쪽 위 7도트 황동 문양 — 길게 누르면 이름·효과
    if (p.variant && p.type === VARIANTS[p.variant].base && !p.fused && !p.formAs) {
      const d = t / BOARD_DOTS;
      marks.push(this.add.image(13 * d, d, boardKey(`variant-${p.variant}`)).setOrigin(0, 0).setDisplaySize(7 * d, 7 * d));
    }
    // 검문! 정예 접사 (D-096): 왼쪽 위 검은 딱지 + 접사 색 아이콘 — 늘 보이고, 길게 누르면 이름·효과
    if (p.affix) {
      const a = AFFIXES[p.affix];
      const size = t * 0.34;
      const tag = this.add.graphics();
      tag.fillStyle(0x16141c, 1).fillRect(t * 0.02, t * 0.02, size, size);
      tag.lineStyle(Math.max(1, t * 0.03), Phaser.Display.Color.HexStringToColor(a.color).color, 1).strokeRect(t * 0.02, t * 0.02, size, size);
      marks.push(tag, this.add.image(t * 0.02 + size / 2, t * 0.02 + size / 2, `icon-${a.icon}`).setDisplaySize(size * 0.72, size * 0.72).setTint(Phaser.Display.Color.HexStringToColor(a.color).color));
    }
    // 도트 기물 (머리 강조형 16×16) — 받침 위에 살짝 올려 그린다
    const glyph = this.add.image(t / 2, t * 0.43, pieceKey(p.formAs ?? p.type, p.side)).setDisplaySize(t * 0.82, t * 0.82);
    const hp = this.add.graphics();
    root.add([base, ...rings, glyph, ...marks, hp]);
    root.setAlpha(alpha);
    const sprite = { root, glyph, hp, piece: p };
    this.drawHp(sprite, p.hp, p.hp);
    return sprite;
  }

  /** HP 게이지 14×4 도트 (D-054): 남는 HP(진영 색) + 잃을 HP(금색, 반짝임은 update가) — GDD 9장 §9.5 */
  private drawHp(s: PieceSprite, hpNow: number, hpAfter: number): void {
    const pen = new PixelPen(s.hp, this.tile / BOARD_DOTS);
    const d = pen.dot;
    s.hp.clear();
    drawGauge(pen, 3 * d, 16 * d, s.piece.side, hpNow, hpAfter, s.piece.maxHp);
    // 보호막: 게이지 바로 위 흰 도트 줄
    if (s.piece.shield > 0) {
      const n = Math.max(1, Math.round(12 * Math.min(1, s.piece.shield / s.piece.maxHp)));
      for (let i = 0; i < n; i++) pen.px((4 + i) * d + d / 2, 15 * d + d / 2, 0xf4f1ea, 1, 1);
    }
    if (hpAfter < hpNow) this.anim.glints.push({ s, hp: hpNow, after: hpAfter });
  }

  private floatText(sp: PieceSprite, text: string, color: string): void {
    const t = this.tile;
    const o = this.add
      .text(sp.root.x + t / 2, sp.root.y + t * 0.1, text, { fontFamily: 'Galmuri11, sans-serif', fontStyle: '700', fontSize: `${Math.round(t * 0.3)}px`, color, stroke: '#16141C', strokeThickness: 4 })
      .setOrigin(0.5)
      .setDepth(8)
      .setResolution(this.dpr);
    this.tweens.add({ targets: o, y: o.y - t * 0.5, alpha: 0, duration: 650, onComplete: () => o.destroy() });
  }

  private clearDynamic(): void {
    for (const o of this.dynamic) o.destroy();
    this.dynamic = [];
    for (const s of this.sprites.values()) s.root.destroy();
    this.sprites.clear();
    this.marksG.clear();
    this.arrowsG.clear();
    this.fxG.clear();
    this.anim = noMarks();
  }

  /** 순번 배지 (톱니 토큰 + 도트 숫자, 11×11): 내 예약 = 청록, 적 = 진홍. 칸 왼쪽 위에 걸친다 */
  private badge(pos: Pos, n: number, alpha = 1, enemy = false): void {
    const t = this.tile;
    const d = t / BOARD_DOTS;
    const w = this.world(pos);
    const img = this.add
      .image(w.x - 2 * d, w.y - 3 * d, boardKey(`badge-${enemy ? 'e' : 'a'}${Math.min(9, n)}`))
      .setOrigin(0, 0)
      .setDisplaySize(11 * d, 11 * d)
      .setDepth(4)
      .setAlpha(alpha);
    this.dynamic.push(img);
  }

  /** 흐르는 화살표 예약 (update가 매 프레임 그린다) */
  private arrow(from: Pos, to: Pos, knight: boolean, color: number, alpha: number): void {
    this.anim.arrows.push({ a: this.center(from), b: this.center(to), knight, color, alpha });
  }

  render(m: BoardModel): void {
    this.clearDynamic();
    this.drawTiles(m.state);
    const t = this.tile;
    const full = m.pending ? [...m.plan, m.pending] : m.plan;

    // 미리보기 결과: 대상별 최종 HP, 공격 범위
    const hpAfter = new Map<number, number>();
    const killed = new Set<number>();
    const area = new Map<string, Pos>();
    const hitTiles = new Map<string, Pos>();
    for (const e of m.preview) {
      if (e.type !== 'attack') continue;
      for (const a of e.area) area.set(`${a.x},${a.y}`, a);
      for (const h of e.hits) {
        hpAfter.set(h.targetId, h.hpAfter);
        if (h.killed) killed.add(h.targetId);
      }
    }
    const shown = [...m.virtual.pieces, ...m.removed];
    for (const p of shown) if (hpAfter.has(p.id)) hitTiles.set(`${p.x},${p.y}`, p);
    // 아군이 선 칸은 공격 범위 표시에서 뺀다 (아군은 맞지 않는다)
    for (const p of m.virtual.pieces) if (p.side === m.state.turnSide) area.delete(`${p.x},${p.y}`);

    const d = t / BOARD_DOTS;
    const mine = m.state.turnSide === 0;
    const img = (name: string, x: number, y: number, size = t, depth = 1, alpha = 1) => {
      const o = this.add.image(x, y, boardKey(name)).setOrigin(0, 0).setDisplaySize(size, size).setDepth(depth).setAlpha(alpha);
      this.dynamic.push(o);
      return o;
    };

    // 공격 범위: 도트 테두리 + 옅은 채움 (내 공격 = 청록, 적 = 진홍 — D-047). 맞을 기물이 선 칸은 채움을 짙게
    for (const a of area.values()) {
      const w = this.world(a);
      const strong = hitTiles.has(`${a.x},${a.y}`);
      this.marksG.fillStyle(mine ? C.cyan : C.crimson, strong ? 0.22 : 0.12).fillRect(w.x, w.y, t, t);
      img(mine ? 'range' : 'range-enemy', w.x, w.y);
    }

    // 누른 적 기물의 다음 턴 위협: 칠 수 있는 칸(반투명 붉은 깜빡임)과 갈 수 있는 칸(붉은 방울)
    if (m.threat) {
      for (const a of m.threat.hits) this.anim.threat.push(this.world(a));
      const pen = new PixelPen(this.marksG, d);
      for (const p of m.threat.moves) {
        const c = this.center(p);
        drawDropDot(pen, c.x, c.y, C.crimson, 0xffb4b4);
      }
    }

    // 선택 기물(청록 모서리)과 갈 수 있는 칸(증기 방울) · 도착하면 치는 칸(철컥 도는 과녁, 처치면 금)
    if (m.selectedId !== null) {
      const sel = m.virtual.pieces.find((p) => p.id === m.selectedId);
      if (sel) {
        const w = this.world(sel);
        img('select', w.x, w.y, t, 1.7);
      }
      for (const p of m.destinations) {
        const w = this.world(p);
        const isPending = m.pendingPos && m.pendingPos.x === p.x && m.pendingPos.y === p.y;
        const hit = m.hitDests.find((h) => h.pos.x === p.x && h.pos.y === p.y);
        if (hit) {
          this.anim.gears.push({ x: w.x, y: w.y, kind: hit.kill ? 'kill' : 'ally' });
          if (hit.kill) img('skull', w.x + 7 * d, w.y + 7 * d, 7 * d, 1.7).setTint(0xfacc15);
        } else if (isPending) img('select', w.x, w.y, t, 1.7, 0.6);
        else img('move-dot', w.x + 8 * d, w.y + 8 * d, 4 * d);
      }
    }

    // 적 의도 예고: 지금 제출하면 적이 둘 수 (옅은 붉은 흐르는 화살표 + 붉은 순번). 맞을 내 기물은 아래 HP 게이지로 (D-081)
    // 한 번에 한 겹: 내 기물을 고르는 동안은 거의 숨긴다
    if (m.intent) {
      const faint = m.selectedId !== null ? 0.12 : 0.6;
      m.intent.plan.forEach((st, i) => {
        for (const a of stepArrows(m.intent!.state, st)) this.arrow(a.from, a.to, a.knight, C.crimson, faint);
        this.badge(stepBadge(m.intent!.state, m.intent!.state, st), i + 1, faint + 0.25, true);
      });
    }

    // 원래 자리 잔상 + 흐르는 화살표 + 순번
    full.forEach((mv, i) => {
      const isPending = m.pending !== null && i === full.length - 1;
      for (const a of stepArrows(m.state, mv)) {
        const ghost = this.makePiece(a.piece, a.from, 0.28);
        ghost.hp.setVisible(false);
        this.dynamic.push(ghost.root);
        this.arrow(a.from, a.to, a.knight, C.cyan, isPending ? 0.5 : 1);
      }
    });

    // 기물 (가상 보드 위치) + 이번 계획으로 처치될 기물 — 처치 X는 기물 위 레이어 (D-049)
    for (const p of shown) {
      const sprite = this.makePiece(p, p);
      const after = hpAfter.get(p.id);
      if (after !== undefined) this.drawHp(sprite, p.hp, after);
      if (killed.has(p.id)) {
        const w = this.world(p);
        img('kill', w.x + 13 * d, w.y + d, 7 * d, 5);
      }
      this.sprites.set(p.id, sprite);
    }

    // 적 의도로 맞을 내 기물: 과녁·숫자 대신 HP 게이지에 잃을 몫만. 숫자는 처치될 기물에만 금색 하나,
    // 적 기물을 누르고 있을 때(위협 보기)만 모든 피해 숫자 (D-081)
    if (m.intent && m.selectedId === null)
      for (const h of m.intent.hits) {
        const sp = this.sprites.get(h.pieceId);
        if (!sp) continue;
        this.drawHp(sp, sp.piece.hp, Math.max(0, Math.min(sp.piece.hp, sp.piece.hp + sp.piece.shield - h.damage)));
        if (!h.killed && !m.threat) continue;
        const w = this.world(h.pos);
        const g = this.add.graphics().setDepth(7);
        drawPopup(g, buildPopupArt(`-${h.damage}`, h.killed ? 0xfacc15 : 0xff6b6b), w.x + t * 0.72, w.y + t, d * 0.6, 400, 0);
        this.dynamic.push(g);
      }

    full.forEach((mv, i) => this.badge(stepBadge(m.state, m.virtual, mv), i + 1, m.pending !== null && i === full.length - 1 ? 0.55 : 1, !mine));
  }

  // ---------- 연출 ----------
  /** 동작 줄이기 설정이면 연출 시간을 30%로 줄이고 흔들림을 끈다 (CLAUDE.md UI/UX 원칙 6) */
  private readonly calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  private wait(ms: number): Promise<void> {
    return new Promise((r) => this.time.delayedCall(this.calm ? ms * 0.3 : ms, r));
  }
  private tween(cfg: Phaser.Types.Tweens.TweenBuilderConfig): Promise<void> {
    const duration = typeof cfg.duration === 'number' && this.calm ? cfg.duration * 0.3 : cfg.duration;
    return new Promise((r) => this.tweens.add({ ...cfg, duration, onComplete: () => r() }));
  }
  private shake(ms: number, intensity: number): void {
    if (!this.calm) this.cameras.main.shake(ms, intensity);
  }

  /** 연출 속도 배율 (동작 줄이기 = 약 3배 빠르게) */
  private get speed(): number {
    return this.calm ? 1 / 0.3 : this.slowFx ? 0.25 : 1;
  }
  /** QA용: 주소에 ?fxslow를 붙이면 공격 이펙트를 4배 느리게 (스크린샷 증거용) */
  private readonly slowFx = new URLSearchParams(window.location.search).has('fxslow');
  /** 이미 배율이 적용된 시간만큼 기다린다 */
  private after(ms: number): Promise<void> {
    return new Promise((r) => this.time.delayedCall(ms, r));
  }

  /** 기물 자세 적용: 받침 아래 중심을 기준으로 늘이고 눌러야 바닥에 붙어 보인다 */
  private applyPose(s: PieceSprite, baseX: number, baseY: number, p: Pose): void {
    const t = this.tile;
    s.root.setScale(p.sx, p.sy);
    s.root.x = baseX + p.dx * t + (t / 2) * (1 - p.sx);
    s.root.y = baseY + p.dy * t + t * 0.85 * (1 - p.sy);
  }

  /** 피격 한 건: 흰 점멸 · 스파크 · 큰 피해 숫자 · HP · 밀려남 */
  private applyHit(ts: PieceSprite, h: { targetId: number; hpAfter: number; killed?: boolean; pushedTo?: Pos }): void {
    const t = this.tile;
    ts.glyph.setTintFill(0xffffff);
    this.time.delayedCall(70, () => ts.glyph.clearTint());
    playHitSpark(this, ts.root.x + t / 2, ts.root.y + t * 0.45, t, ts.piece.side === 0 ? 1 : 0, this.speed);
    const dealt = ts.piece.hp - h.hpAfter;
    const before = ts.piece.hp;
    this.drawHp(ts, h.hpAfter, h.hpAfter);
    ts.piece = { ...ts.piece, hp: h.hpAfter };
    const d = t / BOARD_DOTS;
    const x0 = ts.root.x;
    const y0 = ts.root.y;
    // 잃은 HP 칸: 그 자리에서 하얗게 → 오른쪽 끝부터 파도처럼 솟아 도트로 흩어진다 (D-047·D-049)
    const was = Math.round((12 * Math.max(0, before)) / ts.piece.maxHp);
    const now = Math.round((12 * Math.max(0, h.hpAfter)) / ts.piece.maxHp);
    // 피해 숫자 (D-051·D-053): 도트 그림 숫자, 튀어나와 떠올랐다가 아래부터 지워진다. 처치 = 금, 내 기물 = 붉음
    const art = buildPopupArt(`-${dealt}`, h.killed ? 0xfacc15 : ts.piece.side === 0 ? 0xff6b6b : 0xf4f1ea);
    const g = this.add.graphics().setDepth(8);
    this.tweens.addCounter({
      from: 0,
      to: POPUP_MS.life,
      duration: POPUP_MS.life / this.speed,
      onUpdate: (tw) => {
        const ms = tw.getValue() ?? 0;
        g.clear();
        g.fillStyle(0xf4f1ea, 1);
        for (let i = now; i < was; i++) {
          const u = ms - (was - 1 - i) * 32;
          const cx = x0 + (4 + i) * d;
          const cy = y0 + 17 * d;
          if (u < 0) {
            g.fillRect(cx, cy, d, d * 2);
            continue;
          }
          const q = u / 420;
          if (q >= 1 || (q > 0.45 && Math.floor(u / 40) % 2)) continue;
          const rise = 1 - (1 - q) ** 3;
          const size = q > 0.75 ? d / 2 : d;
          g.fillRect(Math.round(cx + (i % 2 ? 1 : -1) * d * 0.6 * q), Math.round(cy - 9 * d * rise), size, size * 2);
        }
        drawPopup(g, art, x0 + t / 2, y0 + t * 0.3, d, ms, t * 0.35);
      },
      onComplete: () => g.destroy(),
    });
    if (h.pushedTo) {
      const w = this.world(h.pushedTo);
      this.tweens.add({ targets: ts.root, x: w.x, y: w.y, duration: 160, ease: 'Quad.easeOut' });
    }
  }

  /**
   * 턴 합계 (D-073, 발라트로식): 내 턴이면 판 가운데에 준 피해가 0부터 세어 올라가며 커졌다가 자리 잡고, 처치 수가 붙는다.
   * 적 턴이거나 작은 턴(처치 없음 · 피해 TURN_SUMMARY.bigDamage 미만)이면 위쪽에 작게.
   */
  async summary(side: Side, damage: number, kills: number): Promise<void> {
    const t = this.tile;
    const { x, y } = this.camCenter;
    const font = (px: number) => ({ fontFamily: 'Galmuri14, Galmuri11, sans-serif', fontStyle: '700', fontSize: `${Math.round(px)}px`, stroke: '#0B0B0E', strokeThickness: Math.max(4, px / 6) });
    if (side === 1 || (kills === 0 && damage < TURN_SUMMARY.bigDamage)) {
      // 적 턴, 또는 작은 내 턴: 위쪽에 작게 (판을 가리지 않고 기다림도 짧게)
      const text = side === 1 ? `잃음 −${damage}` : `피해 ${damage}`;
      const lost = this.add.text(x, y - t * 2.2, text, { ...font(t * 0.42), color: side === 1 ? '#FF6B6B' : '#7DD3FC' }).setOrigin(0.5).setDepth(10).setResolution(this.dpr);
      await this.tween({ targets: lost, y: lost.y - t * 0.3, alpha: { from: 1, to: 0 }, delay: 500, duration: 300 });
      lost.destroy();
      return;
    }
    const label = this.add.text(x, y - t * 0.75, '이번 턴 피해', { ...font(t * 0.3), color: '#F4F1EA' }).setOrigin(0.5).setDepth(10).setResolution(this.dpr);
    const num = this.add.text(x, y, '0', { ...font(t * 0.9), color: '#FACC15' }).setOrigin(0.5).setDepth(10).setResolution(this.dpr);
    const parts: Phaser.GameObjects.Text[] = [label, num];
    await new Promise<void>((done) =>
      this.tweens.addCounter({
        from: 0,
        to: damage,
        duration: Math.min(700, 250 + damage * 12) / this.speed,
        ease: 'Expo.easeOut',
        onUpdate: (tw) => {
          num.setText(String(Math.round(tw.getValue() ?? 0)));
          num.setScale(1 + 0.25 * (1 - tw.progress));
        },
        onComplete: () => done(),
      }),
    );
    num.setScale(1.35);
    this.tweens.add({ targets: num, scale: 1, duration: 220, ease: 'Back.easeOut' });
    if (kills > 0) parts.push(this.add.text(x, y + t * 0.75, `처치 ${kills}`, { ...font(t * 0.36), color: '#FACC15' }).setOrigin(0.5).setDepth(10).setResolution(this.dpr));
    await this.wait(450);
    await this.tween({ targets: parts, alpha: 0, duration: 200 });
    for (const o of parts) o.destroy();
  }

  /** 기록 줄 한 칸을 판 위에 1.4초 다시 보여 준다: 공격자 선택 모서리 + 대상으로 흐르는 화살표 + 대상 과녁 */
  flashLog(e: LogEntry): void {
    const t = this.tile;
    const d = t / BOARD_DOTS;
    const color = e.side === 0 ? C.cyan : C.crimson;
    const items: AnimMarks['arrows'] = e.targets.map((g) => ({ a: this.center(e.attacker.pos), b: this.center(g.pos), knight: false, color, alpha: 1 }));
    this.anim.arrows.push(...items);
    const w = this.world(e.attacker.pos);
    const objs: Phaser.GameObjects.Image[] = [this.add.image(w.x, w.y, boardKey('select')).setOrigin(0, 0).setDisplaySize(t, t).setDepth(4.4)];
    for (const g of e.targets) {
      const v = this.world(g.pos);
      objs.push(this.add.image(v.x + 2.5 * d, v.y + 2.5 * d, boardKey('target-enemy')).setOrigin(0, 0).setDisplaySize(15 * d, 15 * d).setDepth(4.4));
    }
    this.time.delayedCall(1400, () => {
      this.anim.arrows = this.anim.arrows.filter((a) => !items.includes(a));
      for (const o of objs) o.destroy();
    });
  }

  /** 기물 그림을 판 도트 격자로 뽑은 칸들 (기물 칸 왼쪽 위 기준, 도트 단위) — 바스라짐용, 그림마다 한 번 */
  private cellCache = new Map<string, { i: number; j: number; c: number }[]>();
  private pieceCells(key: string): { i: number; j: number; c: number }[] {
    const hit = this.cellCache.get(key);
    if (hit) return hit;
    const src = this.textures.get(key).getSourceImage() as HTMLImageElement;
    const N = 200; // 도트당 10px로 그려서 가운데를 읽는다
    const cv = document.createElement('canvas');
    cv.width = cv.height = N;
    const g = cv.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    const s = N * 0.82;
    g.drawImage(src, (N - s) / 2, N * 0.43 - s / 2, s, s);
    const a = g.getImageData(0, 0, N, N).data;
    const out: { i: number; j: number; c: number }[] = [];
    for (let j = 0; j < BOARD_DOTS; j++)
      for (let i = 0; i < BOARD_DOTS; i++) {
        const k = ((j * 10 + 5) * N + i * 10 + 5) * 4;
        if (a[k + 3] > 128) out.push({ i, j, c: (a[k] << 16) | (a[k + 1] << 8) | a[k + 2] });
      }
    this.cellCache.set(key, out);
    return out;
  }

  /** 처치된 기물이 재가 되어 무너진다 */
  private playCrumble(s: PieceSprite): Promise<void> {
    const d = this.tile / BOARD_DOTS;
    const cells: CrumbleCell[] = this.pieceCells(s.glyph.texture.key).map((c) => ({ x: s.root.x + c.i * d, y: s.root.y + c.j * d, c: c.c }));
    const g = this.add.graphics().setDepth(2.6);
    const pen = new PixelPen(g, d);
    const total = CRUMBLE_MS.cut + CRUMBLE_MS.life;
    return new Promise((done) =>
      this.tweens.addCounter({
        from: 0,
        to: total,
        duration: total / this.speed,
        onUpdate: (tw) => (g.clear(), drawCrumble(pen, cells, tw.getValue() ?? 0)),
        onComplete: () => (g.destroy(), done()),
      }),
    );
  }

  async showPlan(state: BattleState, plan: Plan): Promise<void> {
    this.anim.arrows = [];
    if (plan.length) sfx('threat');
    const before = this.dynamic.length;
    plan.forEach((mv, i) => {
      for (const a of stepArrows(state, mv)) this.arrow(a.from, a.to, a.knight, C.crimson, 0.9);
      this.badge(stepBadge(state, state, mv), i + 1, 1, true);
    });
    await this.wait(plan.length ? 900 : 400);
    this.anim.arrows = [];
    for (const o of this.dynamic.splice(before)) o.destroy();
  }

  async play(_before: BattleState, events: BattleEvent[]): Promise<void> {
    this.arrowsG.clear();
    this.marksG.clear();
    this.anim = noMarks();
    for (const o of this.dynamic) o.destroy();
    this.dynamic = [];
    this.combo = 0;
    const over = events.find((e) => e.type === 'gameOver') as Extract<BattleEvent, { type: 'gameOver' }> | undefined;
    if (over) this.time.delayedCall(200, () => sfx(over.winner === 0 ? 'win' : 'lose'));
    const t = this.tile;
    // 연출 중 보드 상태 (붕괴·요충지 변화 반영용)
    const cur: BattleState = { ...this.state, stronghold: this.state.stronghold ? { ...this.state.stronghold } : null };
    // 예약 순서대로 이동 → 공격 (GDD 1장 §1.5), 이어서 다음 턴 시작 이벤트
    let tacticStack = 0;
    for (const e of events) {
      if (e.type === 'collapse') {
        cur.fallen = [...(cur.fallen ?? []), ...e.tiles.map((p) => p.y * cur.width + p.x)];
        if (cur.stronghold && isFallen(cur, cur.stronghold.x, cur.stronghold.y)) cur.stronghold = null;
        this.announce('바닥이 꺼진다! 칸 한 쌍이 톱니 아래로');
        this.shake(300, 0.008);
        this.drawTiles(cur);
        await Promise.all(
          e.pushes.map((p) => {
            const sp = this.sprites.get(p.pieceId);
            if (!sp) return Promise.resolve();
            sp.piece = { ...sp.piece, hp: sp.piece.hp - p.damage };
            this.drawHp(sp, sp.piece.hp, sp.piece.hp);
            const w = this.world(p.to);
            return this.tween({ targets: sp.root, x: w.x, y: w.y, duration: 260, ease: 'Back.easeOut' });
          }),
        );
        await this.wait(250);
        continue;
      }
      if (e.type === 'suddenDeath') {
        this.announce('더 무너질 곳이 없다 — 과열이 킹을 짓누른다');
        this.shake(250, 0.006);
        for (const h of e.hits) {
          const sp = this.sprites.get(h.pieceId);
          if (!sp) continue;
          sp.piece = { ...sp.piece, hp: h.hpAfter };
          this.drawHp(sp, h.hpAfter, h.hpAfter);
          this.floatText(sp, `-${h.damage}`, '#FDE68A');
        }
        await this.wait(500);
        continue;
      }
      if (e.type === 'resign') {
        // 명예로운 항복 (D-077): 적 킹이 왕관을 내려놓고 재가 되어 물러난다
        this.announce(`${e.side === 1 ? '적' : '내'} 킹이 왕관을 내려놓는다 — 명예로운 항복`);
        const k = this.sprites.get(e.pieceId);
        if (k) {
          await this.tween({ targets: k.root, alpha: { from: 1, to: 0.6 }, duration: 300, yoyo: true });
          const ash = this.playCrumble(k);
          k.root.destroy();
          this.sprites.delete(e.pieceId);
          await ash;
        }
        continue;
      }
      if (e.type === 'stall') {
        this.announce(e.count >= e.need ? '정체 — 이제부터 바닥이 꺼진다' : `정체 ${e.count}/${e.need} — 이번 턴도 아무도 안 맞으면 바닥이 꺼진다`);
        continue;
      }
      if (e.type === 'strongholdSpawn') {
        cur.stronghold = { ...e.pos, holderId: null, hold: 0 };
        this.drawTiles(cur);
        const mine = e.standings[0];
        this.announce(`${GRADE[mine].name} 요충지 — 상대 턴 ${STRONGHOLD.terms[mine].hold}번 버티면 점령 · 받는 피해 −${Math.round(STRONGHOLD.terms[mine].cover * 100)}%`);
        await this.wait(500);
        continue;
      }
      if (e.type === 'strongholdCapture') {
        cur.stronghold = null;
        this.drawTiles(cur);
        this.announce(`${e.side === 0 ? '아군' : '적'} 요충지 점령 — Tier ${e.tier} 보상`);
        await this.wait(600);
        continue;
      }
      if (e.type === 'strongholdLost') {
        cur.stronghold = null;
        this.drawTiles(cur);
        continue;
      }
      if (e.type === 'awaken') {
        this.announce(`${e.side === 0 ? '내' : '적'} 킹 폭주 준비 — 폭주 1회`);
        const sp = this.sprites.get(e.pieceId);
        if (sp) await this.tween({ targets: sp.root, scale: { from: 1, to: 1.25 }, yoyo: true, duration: 220 });
        continue;
      }
      if (e.type === 'lastStrike') {
        this.announce('폭주!');
        continue;
      }
      if (e.type === 'move') {
        const s = this.sprites.get(e.pieceId);
        if (!s) continue;
        // 들기 → 지수형 이동 → 착지 출렁임 + 증기 먼지 (D-036)
        const w = this.world(e.to);
        const from = { x: s.root.x, y: s.root.y };
        const jump = s.piece.type === 'N' && !s.piece.fused;
        const g = this.add.graphics().setDepth(6.4);
        const pen = new PixelPen(g, t / BOARD_DOTS);
        let landed = false;
        sfx('lift');
        await new Promise<void>((done) =>
          this.tweens.addCounter({
            from: 0,
            to: MOVE_TOTAL,
            duration: MOVE_TOTAL / this.speed,
            onUpdate: (tw) => {
              const m = moveMotion(tw.getValue() ?? 0, jump);
              this.applyPose(s, from.x + (w.x - from.x) * m.p, from.y + (w.y - from.y) * m.p, m.pose);
              g.clear();
              if (m.landQ >= 0) {
                if (!landed) {
                  this.shake(60, 0.002);
                  sfx('land');
                }
                landed = true;
                drawLandPuff(pen, w.x + t / 2, w.y + t / 2, t, m.landQ);
              }
            },
            onComplete: () => {
              g.destroy();
              this.applyPose(s, w.x, w.y, REST_POSE);
              done();
            },
          }),
        );
        continue;
      }
      if (e.type === 'card') {
        this.announce(`${e.side === 0 ? '' : '적 · '}${CARDS[e.card].name}`);
        continue;
      }
      if (e.type === 'shield' || e.type === 'heal') {
        const sp = this.sprites.get(e.pieceId);
        if (!sp) continue;
        if (e.type === 'shield') sp.piece = { ...sp.piece, shield: sp.piece.shield + e.amount };
        else sp.piece = { ...sp.piece, hp: Math.min(sp.piece.maxHp, sp.piece.hp + e.amount) };
        this.drawHp(sp, sp.piece.hp, sp.piece.hp);
        this.floatText(sp, `+${e.amount}`, e.type === 'shield' ? '#E2E8F0' : '#86EFAC');
        await this.wait(160);
        continue;
      }
      if (e.type === 'fuse') {
        const a = this.sprites.get(e.pieceId);
        const b = this.sprites.get(e.partnerId);
        this.announce('결합!');
        if (a && b) {
          await this.tween({ targets: b.root, x: a.root.x, y: a.root.y, alpha: 0.2, duration: 260, ease: 'Quad.easeIn' });
          b.root.destroy();
          this.sprites.delete(e.partnerId);
          await this.tween({ targets: a.root, scale: { from: 1, to: 1.25 }, yoyo: true, duration: 200 });
        }
        continue;
      }
      if (e.type === 'promote') {
        const s = this.sprites.get(e.pieceId);
        if (s) {
          s.glyph.setTexture(pieceKey(e.to, s.piece.side));
          s.piece = { ...s.piece, type: e.to };
        }
        continue;
      }
      if (e.type === 'blast') {
        // 터짐 (D-106 보일러 폰): 그 칸에서 둘레로 — 맞은 기물마다 피격, 쓰러지면 재
        this.shake(220, 0.006);
        sfx('kill');
        for (const h of e.hits) {
          const sp = this.sprites.get(h.targetId);
          if (!sp) continue;
          this.applyHit(sp, h);
          this.floatText(sp, e.label, '#FDBA74');
          if (h.killed) {
            void this.playCrumble(sp);
            sp.root.destroy();
            this.sprites.delete(sp.piece.id);
          }
        }
        await this.wait(260);
        continue;
      }
      if (e.type === 'terrain') {
        // 지형 발동: 자석판에 붙잡힘 · 나사 줍기
        const sp = this.sprites.get(e.pieceId);
        const def = TERRAIN[e.terrain];
        if (sp) this.floatText(sp, e.gold ? `나사 +${e.gold}` : e.terrain === 'screws' ? '흩어졌다' : `${def.name}!`, def.color);
        cur.terrain = (cur.terrain ?? []).filter((x) => !(x.x === e.pos.x && x.y === e.pos.y));
        this.drawTiles(cur);
        await this.wait(220);
        continue;
      }
      if (e.type === 'affix') {
        // 정예 접사 발동: 이름이 떠오르고, 반동 스프링이면 쓰러뜨린 쪽이 맞는다
        const sp = this.sprites.get(e.pieceId);
        const a = AFFIXES[e.affix];
        if (sp) {
          this.floatText(sp, a.name, a.color);
          if (e.hit) {
            sfx('hit', this.combo++);
            this.applyHit(sp, e.hit);
            if (e.hit.killed) {
              await Promise.race([this.playCrumble(sp), this.after(260)]);
              sp.root.destroy();
              this.sprites.delete(sp.piece.id);
            }
          }
          await this.wait(260);
        }
        continue;
      }
      if (e.type === 'tactic') {
        // 전술 키워드 배너 (D-094): 친 기물 위에 이름이 튀어 오른다. 체크는 아래 안내가 맡는다
        const sp = this.sprites.get(e.pieceId);
        if (sp && e.tactic !== 'check') {
          const def = TACTICS[e.tactic];
          const stack = tacticStack++;
          const label = this.add
            .text(sp.root.x + t / 2, sp.root.y - t * (0.2 + stack * 0.32), def.name, { fontFamily: 'Galmuri14, Galmuri11, sans-serif', fontStyle: '700', fontSize: `${Math.round(t * 0.3)}px`, color: def.color, stroke: '#0B0B0E', strokeThickness: 5 })
            .setOrigin(0.5)
            .setDepth(10)
            .setScale(this.calm ? 1 : 0.4)
            .setResolution(this.dpr);
          if (!this.calm) this.tweens.add({ targets: label, scale: 1, duration: 160, ease: 'Back.easeOut' });
          this.tweens.add({ targets: label, y: label.y - t * 0.3, alpha: 0, delay: 520, duration: 360, ease: 'Quad.easeIn', onComplete: () => label.destroy() });
          await this.wait(180);
        }
        continue;
      }
      tacticStack = 0;
      if (e.type !== 'attack') continue;
      const atk = this.sprites.get(e.attackerId);
      if (!atk) continue;
      const order = this.add
        .text(atk.root.x + t * 0.5, atk.root.y - t * 0.12, `#${e.order + 1}`, { fontFamily: 'Galmuri14, Galmuri11, sans-serif', fontStyle: '700', fontSize: `${Math.round(t * 0.4)}px`, color: '#C89B3C', stroke: '#16141C', strokeThickness: 4 })
        .setOrigin(0.5)
        .setDepth(7)
        .setResolution(this.dpr);
      // 시너지 배율: 커질수록 크게 (발라트로식 숫자 폭발)
      if (e.mult) {
        const big = Math.min(1.8, 0.8 + (e.mult - 1) * 0.6);
        const m = this.add
          .text(atk.root.x + t / 2, atk.root.y - t * 0.35, `×${e.mult.toFixed(e.mult >= 10 ? 0 : 1)}`, { fontFamily: 'Galmuri14, Galmuri11, sans-serif', fontStyle: '700', fontSize: `${Math.round(t * 0.34 * big)}px`, color: e.mult >= 2 ? '#FACC15' : '#FDBA74', stroke: '#0B0B0E', strokeThickness: 4 })
          .setOrigin(0.5)
          .setDepth(9)
          .setResolution(this.dpr);
        this.tweens.add({ targets: m, y: m.y - t * 0.4, alpha: 0, scale: 1.3, duration: 900, onComplete: () => m.destroy() });
      }

      // 몸짓 → 기물별 공격 이펙트 (기물 중심에서 공격 범위로) → 이펙트가 닿는 순간 피격
      const kinds = atk.piece.fused?.length ? [...new Set(atk.piece.fused)] : [atk.piece.formAs ?? atk.piece.type];
      const tiles = e.area.map((a) => ({ key: `${a.x},${a.y}`, ...this.center(a) }));
      const base = { x: atk.root.x, y: atk.root.y };
      // 세기(피해·처치)가 클수록 뛰어올라 모았다가 터뜨린다 (D-064)
      const fx = playAttackFx(this, { kinds, side: atk.piece.side, origin: { x: base.x + t / 2, y: base.y + t / 2 }, tiles, tile: t, power: fxPower(e.hits) }, this.speed, (pose) =>
        this.applyPose(atk, base.x, base.y, pose),
      );
      const hitsDone = e.hits.map((h) => {
        const ts = this.sprites.get(h.targetId);
        if (!ts) return Promise.resolve();
        const key = `${Math.round(ts.root.x / t)},${this.state.height - 1 - Math.round(ts.root.y / t)}`;
        return this.after(fx.impact.get(key) ?? fx.duration * 0.6).then(() => {
          // 큰 피해·처치: 화면 흔들림 + 휴대폰 진동 (D-064)
          const fb = impactFeedback(h.damage, !!h.killed);
          if (fb) {
            this.shake(fb.ms, fb.intensity);
            if (!this.calm) navigator.vibrate?.(fb.vibrate);
          }
          sfx('hit', this.combo++);
          this.applyHit(ts, h);
          // 쾌감 · 아픔 (D-104): 내 기물이 맞으면 화면 가장자리가 붉게 (피해 비율만큼), 쓰러지면 둔탁한 소리.
          // 처치는 아주 짧게 멈췄다 간다 (히트스톱)
          if (ts.piece.side === 0 && h.damage > 0) {
            vignette('bad', Math.min(1, (h.damage / Math.max(1, ts.piece.maxHp)) * 2.2 + (h.killed ? 0.4 : 0)));
            if (h.killed) sfx('hurt');
          }
          if (h.killed && !this.calm) {
            this.tweens.timeScale = 0.08;
            window.setTimeout(() => (this.tweens.timeScale = 1), 90);
          }
        });
      });
      await Promise.all([...hitsDone, this.after(fx.duration)]);
      // 최후의 리벳: HP 1에서 버틴 기물 위에 접사 이름
      for (const h of e.hits.filter((x) => x.held)) {
        const sp = this.sprites.get(h.targetId);
        if (sp) this.floatText(sp, AFFIXES.lastRivet.name, AFFIXES.lastRivet.color);
      }
      // 비상 퓨즈 (D-105): 내 기물이 HP 1로 버틴다
      for (const h of e.hits.filter((x) => x.fuse)) {
        const sp = this.sprites.get(h.targetId);
        if (sp) this.floatText(sp, '비상 퓨즈', '#FDE68A');
      }
      const checked = e.hits.find((h) => h.checked);
      if (checked) sfx('check');
      if (checked) this.announce(`체크! ${this.sprites.get(checked.targetId)?.piece.side === 0 ? '내' : '적'} 킹이 HP 1로 버틴다 — 한 대면 끝`);

      // 처치: 위에서부터 한 줄씩 검은 재가 되어 기물 발밑에 쌓였다 꺼진다 (D-048·D-050·D-052)
      const deaths = e.hits.filter((h) => h.killed).map((h) => this.sprites.get(h.targetId)).filter((s): s is PieceSprite => !!s);
      if (deaths.length) {
        sfx('kill');
        const ashes = deaths.map((s) => this.playCrumble(s));
        for (const s of deaths) {
          s.root.destroy();
          this.sprites.delete(s.piece.id);
        }
        await Promise.race([Promise.all(ashes), this.after(260)]);
      }
      order.destroy();
      await this.wait(140);
    }
    if (events.some((e) => e.type === 'gameOver')) await this.wait(400);
  }

  // ---------- 입력 ----------
  private bindInput(): void {
    let down: { x: number; y: number; sx: number; sy: number; touch: boolean } | null = null;
    let dragging = false;
    let pressTimer: number | undefined;
    let pressed = false;

    const touchOf = (p: Phaser.Input.Pointer) => {
      const ev = p.event as PointerEvent | undefined;
      return ev && 'pointerType' in ev ? ev.pointerType !== 'mouse' : p.wasTouch;
    };
    const worldTile = (p: Phaser.Input.Pointer) => {
      const w = p.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
      return this.tileAt(w.x, w.y);
    };

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      down = { x: p.x, y: p.y, sx: this.camCenter.x, sy: this.camCenter.y, touch: touchOf(p) };
      dragging = false;
      pressed = false;
      const pos = worldTile(p);
      const ev = p.event as PointerEvent;
      window.clearTimeout(pressTimer);
      if (pos) {
        pressTimer = window.setTimeout(() => {
          pressed = true;
          this.input2.longPress(pos, ev.clientX, ev.clientY);
        }, 450);
      }
    });

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (down && p.isDown) {
        const dx = (p.x - down.x) / this.dpr;
        const dy = (p.y - down.y) / this.dpr;
        if (!dragging && Math.hypot(dx, dy) > 8) {
          dragging = true;
          window.clearTimeout(pressTimer);
        }
        if (dragging) this.moveCamera(down.sx - dx, down.sy - dy);
        return;
      }
      if (!touchOf(p)) this.input2.hover(worldTile(p));
    });

    const up = (p: Phaser.Input.Pointer) => {
      window.clearTimeout(pressTimer);
      if (!down) return;
      const wasTouch = down.touch;
      down = null;
      if (pressed) {
        this.input2.longPressEnd();
        return;
      }
      if (dragging) return;
      const pos = worldTile(p);
      if (pos) this.input2.tap(pos, wasTouch);
    };
    this.input.on('pointerup', up);
    this.input.on('pointerupoutside', () => {
      window.clearTimeout(pressTimer);
      if (pressed) this.input2.longPressEnd();
      down = null;
    });
    this.input.on('gameout', () => this.input2.hover(null));
  }
}

/** Phaser 게임을 감싸 컨트롤러가 쓰는 BoardView를 제공한다. */
export class BoardRenderer implements BoardView {
  private scene: BoardScene;
  private game: Phaser.Game;
  private whenReady: Promise<void>;

  constructor(private host: HTMLElement, input: BoardInput, announce: (text: string) => void = () => {}) {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.scene = new BoardScene();
    this.scene.announce = announce;
    this.scene.dpr = dpr;
    this.scene.input2 = input;
    // 보드 위 글자(피해 숫자·순번)가 대체 글꼴로 먼저 그려지지 않게 갈무리를 먼저 불러 둔다
    const fonts = Promise.all([document.fonts.load('12px Galmuri11'), document.fonts.load('700 12px Galmuri11'), document.fonts.load('15px Galmuri14')]).catch(() => undefined);
    this.whenReady = Promise.all([new Promise<void>((r) => (this.scene.ready = r)), fonts]).then(() => undefined);
    const { w, h } = this.size();
    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host,
      backgroundColor: '#110F15',
      scale: { mode: Phaser.Scale.NONE, width: w * dpr, height: h * dpr, zoom: 1 / dpr },
      scene: this.scene,
      banner: false,
      input: { activePointers: 2 },
    });
    window.addEventListener('resize', () => this.resize());
  }

  private size() {
    return { w: Math.max(1, this.host.clientWidth), h: Math.max(1, this.host.clientHeight) };
  }

  private resize(): void {
    const { w, h } = this.size();
    const dpr = this.scene.dpr;
    this.game.scale.resize(w * dpr, h * dpr);
  }

  setup(state: BattleState): void {
    void this.whenReady.then(() => this.scene.setupBoard(state));
  }

  render(model: BoardModel): void {
    void this.whenReady.then(() => {
      if (this.scene.state !== model.state && model.state.width !== this.scene.state?.width) this.scene.setupBoard(model.state);
      this.scene.state = model.state;
      this.scene.render(model);
    });
  }

  async play(before: BattleState, events: BattleEvent[]): Promise<void> {
    await this.whenReady;
    await this.scene.play(before, events);
  }

  async showPlan(state: BattleState, plan: Plan): Promise<void> {
    await this.whenReady;
    await this.scene.showPlan(state, plan);
  }

  async summary(side: Side, damage: number, kills: number): Promise<void> {
    await this.whenReady;
    await this.scene.summary(side, damage, kills);
  }

  flashLog(entry: LogEntry): void {
    void this.whenReady.then(() => this.scene.flashLog(entry));
  }
}
