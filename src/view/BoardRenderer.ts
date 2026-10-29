import Phaser from 'phaser';
import type { BoardModel, BoardView } from '../game/controller';
import { STRONGHOLD } from '../data/battle';
import { CARDS } from '../data/cards';
import type { EnchantId } from '../data/enchants';
import { findPiece, isMove, moveTypes, standingOf, type BattleEvent, type BattleState, type Piece, type PieceType, type Plan, type PlanStep, type Pos, type Standing } from '../engine';

/** 요충지 등급 색 — 플레이어의 형편 기준. 쉬울수록 밝은 금속 (GDD 5장 §5.4, 9장) */
export const GRADE: Record<Standing, { color: number; name: string }> = {
  leading: { color: 0x9aa3b5, name: '강철' },
  tier1: { color: 0xc89b3c, name: '황동' },
  tier2: { color: 0xe07b39, name: '구리' },
  tier3: { color: 0xfacc15, name: '황금' },
};

/** 플레이스홀더 기물 글리프. 도트 스프라이트는 M6에서 교체한다. */
const GLYPH: Record<0 | 1, Record<PieceType, string>> = {
  0: { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙' },
  1: { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟' },
};
const VS15 = '︎';
/** 기물 유형에 붙는 인챈트 — 그 기물 위에 표식으로 보인다 (GDD 9장: 인챈트는 유닛에 표시) */
const TYPE_ENCHANTS: Partial<Record<PieceType, EnchantId>> = { N: 'E01', B: 'E02', R: 'E03', P: 'E04', K: 'E08' };
const GLYPH_FONT = "'Segoe UI Symbol', 'Noto Sans Symbols 2', 'DejaVu Sans', 'Apple Symbols', serif";

const C = {
  light: 0xd8cfc2,
  dark: 0x3a3542,
  bg: 0x110f15,
  cyan: 0x38bdf8,
  crimson: 0xf43f5e,
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

/** 기기 종류별 타일 크기 (CSS px = dp). GDD 9장 §9.2: 모바일 약 48dp(128 기기px), PC는 화면 높이에 맞춘 정수배 */
const tileSize = (): number => {
  if (window.matchMedia('(pointer: coarse)').matches) return 48;
  const h = window.innerHeight;
  return h >= 1000 ? 96 : h >= 760 ? 72 : 56;
};

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
  glyph: Phaser.GameObjects.Text;
  hp: Phaser.GameObjects.Graphics;
  piece: Piece;
}

class BoardScene extends Phaser.Scene {
  input2!: BoardInput;
  tile = 48;
  dpr = 1;
  state!: BattleState;
  private tilesG!: Phaser.GameObjects.Graphics;
  private marksG!: Phaser.GameObjects.Graphics;
  private arrowsG!: Phaser.GameObjects.Graphics;
  private fxG!: Phaser.GameObjects.Graphics;
  private dynamic: Phaser.GameObjects.GameObject[] = [];
  private sprites = new Map<number, PieceSprite>();
  ready!: () => void;
  announce: (text: string) => void = () => {};

  constructor() {
    super('board');
  }

  create(): void {
    this.cameras.main.setZoom(this.dpr);
    this.cameras.main.setBackgroundColor(C.bg);
    this.tilesG = this.add.graphics().setDepth(0);
    this.marksG = this.add.graphics().setDepth(1);
    this.arrowsG = this.add.graphics().setDepth(3);
    this.fxG = this.add.graphics().setDepth(6);
    this.bindInput();
    this.scale.on('resize', (size: Phaser.Structs.Size) => {
      this.cameras.resize(size.width, size.height);
      this.fitCamera();
    });
    this.ready();
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
    this.tile = tileSize();
    this.drawTiles(state);
    this.fitCamera(true);
  }

  /** 타일 · 무너진 테두리 · 요충지 */
  drawTiles(state: BattleState): void {
    const t = this.tile;
    const g = this.tilesG;
    g.clear();
    for (let y = 0; y < state.height; y++) {
      for (let x = 0; x < state.width; x++) {
        const w = this.world({ x, y });
        const fallen = x < state.ring || y < state.ring || x >= state.width - state.ring || y >= state.height - state.ring;
        if (fallen) {
          g.fillStyle(0x0b0a0e, 1).fillRect(w.x, w.y, t, t);
          g.lineStyle(1, C.crimson, 0.35).lineBetween(w.x + t * 0.2, w.y + t * 0.3, w.x + t * 0.55, w.y + t * 0.6).lineBetween(w.x + t * 0.55, w.y + t * 0.6, w.x + t * 0.8, w.y + t * 0.45);
        } else {
          g.fillStyle((x + y) % 2 === 0 ? C.dark : C.light, 1).fillRect(w.x, w.y, t, t);
        }
      }
    }
    const sh = state.stronghold;
    if (sh) {
      const w = this.world(sh);
      const c = { x: w.x + t / 2, y: w.y + t / 2 };
      // 색 = 플레이어 기준 등급. 점은 지금 보유 진영(없으면 플레이어)이 버텨야 하는 상대 턴 수
      const grade = GRADE[standingOf(state, 0)].color;
      const holder = sh.holderId !== null ? findPiece(state, sh.holderId) : undefined;
      const need = STRONGHOLD.terms[standingOf(state, holder ? holder.side : 0)].hold;
      g.fillStyle(grade, 0.28).fillRect(w.x, w.y, t, t);
      g.lineStyle(Math.max(2, t * 0.06), grade, 1).strokeRect(w.x + 2, w.y + 2, t - 4, t - 4);
      // 톱니 모양 링
      g.lineStyle(Math.max(2, t * 0.05), grade, 0.9).strokeCircle(c.x, c.y, t * 0.3);
      for (let i = 0; i < 8; i++) {
        const a = (Math.PI / 4) * i;
        g.lineBetween(c.x + Math.cos(a) * t * 0.3, c.y + Math.sin(a) * t * 0.3, c.x + Math.cos(a) * t * 0.4, c.y + Math.sin(a) * t * 0.4);
      }
      // 유지 진행 / 필요 턴
      const step = t * 0.2;
      const x0 = w.x + t / 2 - ((need - 1) * step) / 2;
      for (let i = 0; i < need; i++) {
        const filled = i < sh.hold;
        g.fillStyle(filled ? grade : C.ink, 1).fillCircle(x0 + i * step, w.y + t * 0.12, t * 0.06);
        g.lineStyle(1, grade, 1).strokeCircle(x0 + i * step, w.y + t * 0.12, t * 0.06);
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
    const base = this.add.graphics();
    if (p.side === 0) {
      base.lineStyle(Math.max(2, t * 0.045), C.cyan, 1).strokeEllipse(t / 2, t * 0.8, t * 0.62, t * 0.2);
    } else {
      const s = t * 0.13;
      base.lineStyle(Math.max(2, t * 0.045), C.crimson, 1);
      base.strokePoints([{ x: t / 2, y: t * 0.8 - s }, { x: t / 2 + s, y: t * 0.8 }, { x: t / 2, y: t * 0.8 + s }, { x: t / 2 - s, y: t * 0.8 }], true);
    }
    if (p.type === 'K' && this.state?.lastStrike?.[p.side] === 'ready') {
      base.lineStyle(Math.max(2, t * 0.05), C.brass, 1).strokeCircle(t / 2, t * 0.45, t * 0.44);
    }
    // 체크: HP 1로 버틴 킹 — 다음에 맞으면 끝 (D-022)
    if (p.type === 'K' && p.hp === 1 && this.state?.rules.checkmate) {
      base.lineStyle(Math.max(2, t * 0.05), C.crimson, 1).strokeCircle(t / 2, t * 0.45, t * 0.47);
    }
    if (p.buffTurns > 0) base.fillStyle(C.brass, 1).fillTriangle(t * 0.86, t * 0.2, t * 0.78, t * 0.32, t * 0.94, t * 0.32);
    // 인챈트 표식: 왼쪽 위 황동 점 (장 수), ★ 각성
    const lo = this.state?.loadouts?.[p.side];
    const stacks = [...new Set(moveTypes(p).map((ty) => TYPE_ENCHANTS[ty]).filter((e): e is EnchantId => !!e))].map((e) => lo?.enchants[e] ?? 0);
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
          .text(t * 0.04, t * 0.62, `+${forge}`, { fontFamily: 'Cinzel, serif', fontStyle: '700', fontSize: `${Math.round(t * 0.22)}px`, color: '#E0A060', stroke: '#16141C', strokeThickness: 3 })
          .setResolution(this.dpr),
      );
    }
    // 합체: 오른쪽 위에 흡수한 유형 작은 글리프 · 폼 시프트: 바뀐 행마
    const extra = p.formAs ? [p.type] : (p.fused ?? []).filter((ty) => ty !== p.type);
    extra.forEach((ty, i) => {
      marks.push(
        this.add
          .text(t * 0.84, t * (0.14 + i * 0.22), GLYPH[p.side][ty] + VS15, {
            fontFamily: GLYPH_FONT,
            fontSize: `${Math.round(t * 0.26)}px`,
            color: p.formAs ? '#C89B3C' : p.side === 0 ? '#F4F7FB' : '#120F17',
            stroke: p.side === 0 ? '#1E3A8A' : '#F43F5E',
            strokeThickness: 2,
          })
          .setOrigin(0.5)
          .setResolution(this.dpr),
      );
    });
    const glyph = this.add
      .text(t / 2, t * 0.42, GLYPH[p.side][p.formAs ?? p.type] + VS15, {
        fontFamily: GLYPH_FONT,
        fontSize: `${Math.round(t * 0.78)}px`,
        color: p.side === 0 ? '#F4F7FB' : '#120F17',
        stroke: p.side === 0 ? '#1E3A8A' : '#F43F5E',
        strokeThickness: Math.max(2, Math.round(t * 0.05)),
      })
      .setOrigin(0.5)
      .setResolution(this.dpr);
    const hp = this.add.graphics();
    root.add([base, glyph, ...marks, hp]);
    root.setAlpha(alpha);
    const sprite = { root, glyph, hp, piece: p };
    this.drawHp(sprite, p.hp, p.hp);
    return sprite;
  }

  /** HP 바: 남는 HP(진영 색) + 잃을 HP(노랑) — GDD 9장 §9.5 */
  private drawHp(s: PieceSprite, hpNow: number, hpAfter: number): void {
    const t = this.tile;
    const bw = t * 0.62;
    const bh = Math.max(3, Math.round(t * 0.08));
    const x = (t - bw) / 2;
    const y = t * 0.92;
    const keep = Math.max(0, hpAfter) / s.piece.maxHp;
    const lose = Math.max(0, hpNow - Math.max(0, hpAfter)) / s.piece.maxHp;
    s.hp.clear();
    s.hp.fillStyle(C.ink, 1).fillRect(x, y, bw, bh);
    s.hp.fillStyle(s.piece.side === 0 ? C.cyan : C.crimson, 1).fillRect(x, y, bw * keep, bh);
    if (lose > 0) s.hp.fillStyle(C.lose, 1).fillRect(x + bw * keep, y, bw * lose, bh);
    // 보호막: HP 바 위 강철색 띠
    if (s.piece.shield > 0) s.hp.fillStyle(0xe2e8f0, 1).fillRect(x, y - bh - 1, bw * Math.min(1, s.piece.shield / s.piece.maxHp), bh - 1);
  }

  private floatText(sp: PieceSprite, text: string, color: string): void {
    const t = this.tile;
    const o = this.add
      .text(sp.root.x + t / 2, sp.root.y + t * 0.1, text, { fontFamily: 'Noto Sans KR, sans-serif', fontStyle: '700', fontSize: `${Math.round(t * 0.3)}px`, color, stroke: '#16141C', strokeThickness: 4 })
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
  }

  private badge(pos: Pos, n: number, alpha = 1, color = C.brass): void {
    const t = this.tile;
    const w = this.world(pos);
    const r = Math.max(10, t * 0.21);
    const g = this.add.graphics().setDepth(4).setAlpha(alpha);
    g.fillStyle(color, 1).fillCircle(w.x + r * 0.7, w.y - r * 0.2, r).lineStyle(1.5, C.ink, 1).strokeCircle(w.x + r * 0.7, w.y - r * 0.2, r);
    const txt = this.add
      .text(w.x + r * 0.7, w.y - r * 0.2, String(n), { fontFamily: 'Cinzel, serif', fontStyle: '700', fontSize: `${Math.round(r * 1.1)}px`, color: '#16141C' })
      .setOrigin(0.5)
      .setDepth(4)
      .setAlpha(alpha)
      .setResolution(this.dpr);
    this.dynamic.push(g, txt);
  }

  private arrow(from: Pos, to: Pos, knight: boolean, color: number, alpha: number): void {
    const a = this.center(from);
    const b = this.center(to);
    const g = this.arrowsG;
    const w = Math.max(3, this.tile * 0.08);
    g.lineStyle(w, color, alpha);
    const pts: { x: number; y: number }[] = [a];
    if (knight) {
      const dx = Math.abs(to.x - from.x);
      pts.push(dx > 1 ? { x: b.x, y: a.y } : { x: a.x, y: b.y });
    }
    // 끝을 조금 줄여 기물을 가리지 않게 한다
    const last = pts[pts.length - 1];
    const len = Math.hypot(b.x - last.x, b.y - last.y) || 1;
    const shrink = this.tile * 0.28;
    const end = { x: b.x - ((b.x - last.x) / len) * shrink, y: b.y - ((b.y - last.y) / len) * shrink };
    pts.push(end);
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (const p of pts.slice(1)) g.lineTo(p.x, p.y);
    g.strokePath();
    const ang = Math.atan2(end.y - last.y, end.x - last.x);
    const hs = this.tile * 0.16;
    g.fillStyle(color, alpha).fillTriangle(
      end.x + Math.cos(ang) * hs, end.y + Math.sin(ang) * hs,
      end.x + Math.cos(ang + 2.4) * hs, end.y + Math.sin(ang + 2.4) * hs,
      end.x + Math.cos(ang - 2.4) * hs, end.y + Math.sin(ang - 2.4) * hs,
    );
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

    // 공격 범위 · 대상 칸
    for (const a of area.values()) {
      const w = this.world(a);
      const strong = hitTiles.has(`${a.x},${a.y}`);
      this.marksG.fillStyle(C.crimson, strong ? 0.32 : 0.13).fillRect(w.x + 2, w.y + 2, t - 4, t - 4);
      this.marksG.lineStyle(strong ? 2 : 1, C.crimson, strong ? 1 : 0.6).strokeRect(w.x + 2, w.y + 2, t - 4, t - 4);
    }

    // 선택 기물과 갈 수 있는 칸
    if (m.selectedId !== null) {
      const sel = m.virtual.pieces.find((p) => p.id === m.selectedId);
      if (sel) {
        const w = this.world(sel);
        this.marksG.lineStyle(3, C.cyan, 1).strokeRect(w.x + 1.5, w.y + 1.5, t - 3, t - 3);
      }
      for (const d of m.destinations) {
        const c = this.center(d);
        const isPending = m.pendingPos && m.pendingPos.x === d.x && m.pendingPos.y === d.y;
        if (isPending) this.marksG.lineStyle(3, C.cyan, 1).strokeCircle(c.x, c.y, t * 0.36);
        else this.marksG.fillStyle(C.cyan, 0.85).fillCircle(c.x, c.y, t * 0.12);
      }
    }

    // 원래 자리 잔상 + 화살표 + 순번
    full.forEach((mv, i) => {
      const isPending = m.pending !== null && i === full.length - 1;
      for (const a of stepArrows(m.state, mv)) {
        const ghost = this.makePiece(a.piece, a.from, 0.28);
        ghost.hp.setVisible(false);
        this.dynamic.push(ghost.root);
        this.arrow(a.from, a.to, a.knight, C.cyan, isPending ? 0.5 : 1);
      }
    });

    // 기물 (가상 보드 위치) + 이번 계획으로 파괴될 기물 (파괴 시점 위치)
    for (const p of shown) {
      const sprite = this.makePiece(p, p);
      const after = hpAfter.get(p.id);
      if (after !== undefined) this.drawHp(sprite, p.hp, after);
      if (killed.has(p.id)) {
        const x = this.add.graphics().setDepth(5);
        const w = this.world(p);
        const r = t * 0.17;
        const cx = w.x + t * 0.78;
        const cy = w.y + t * 0.24;
        x.fillStyle(0x120f17, 1).fillCircle(cx, cy, r).lineStyle(2, C.crimson, 1).strokeCircle(cx, cy, r);
        x.lineStyle(2, C.crimson, 1).lineBetween(cx - r * 0.45, cy - r * 0.45, cx + r * 0.45, cy + r * 0.45).lineBetween(cx + r * 0.45, cy - r * 0.45, cx - r * 0.45, cy + r * 0.45);
        this.dynamic.push(x);
      }
      this.sprites.set(p.id, sprite);
    }

    full.forEach((mv, i) => this.badge(stepBadge(m.state, m.virtual, mv), i + 1, m.pending !== null && i === full.length - 1 ? 0.55 : 1));
  }

  // ---------- 연출 ----------
  private wait(ms: number): Promise<void> {
    return new Promise((r) => this.time.delayedCall(ms, r));
  }
  private tween(cfg: Phaser.Types.Tweens.TweenBuilderConfig): Promise<void> {
    return new Promise((r) => this.tweens.add({ ...cfg, onComplete: () => r() }));
  }

  async showPlan(state: BattleState, plan: Plan): Promise<void> {
    this.arrowsG.clear();
    plan.forEach((mv, i) => {
      for (const a of stepArrows(state, mv)) this.arrow(a.from, a.to, a.knight, C.crimson, 0.9);
      this.badge(stepBadge(state, state, mv), i + 1, 1, C.crimson);
    });
    await this.wait(plan.length ? 900 : 400);
    this.arrowsG.clear();
  }

  async play(_before: BattleState, events: BattleEvent[]): Promise<void> {
    this.arrowsG.clear();
    this.marksG.clear();
    for (const o of this.dynamic) o.destroy();
    this.dynamic = [];
    const t = this.tile;
    // 연출 중 보드 상태 (붕괴·요충지 변화 반영용)
    const cur: BattleState = { ...this.state, stronghold: this.state.stronghold ? { ...this.state.stronghold } : null };
    // 예약 순서대로 이동 → 공격 (GDD 1장 §1.5), 이어서 다음 턴 시작 이벤트
    for (const e of events) {
      if (e.type === 'collapse') {
        cur.ring = e.ring;
        if (cur.stronghold && (cur.stronghold.x < e.ring || cur.stronghold.y < e.ring || cur.stronghold.x >= cur.width - e.ring || cur.stronghold.y >= cur.height - e.ring)) cur.stronghold = null;
        this.announce('대성당이 무너집니다 — 테두리 붕괴');
        this.cameras.main.shake(300, 0.008);
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
        this.announce(`${e.side === 0 ? '내' : '적'} 킹 각성 — 최후의 일격 1회`);
        const sp = this.sprites.get(e.pieceId);
        if (sp) await this.tween({ targets: sp.root, scale: { from: 1, to: 1.25 }, yoyo: true, duration: 220 });
        continue;
      }
      if (e.type === 'lastStrike') {
        this.announce('최후의 일격!');
        continue;
      }
      if (e.type === 'move') {
        const s = this.sprites.get(e.pieceId);
        if (!s) continue;
        const w = this.world(e.to);
        await this.tween({ targets: s.root, x: w.x, y: w.y, duration: 220, ease: 'Quad.easeIn' });
        this.cameras.main.shake(60, 0.002);
        await this.wait(70);
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
        this.announce('합체!');
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
        if (s) s.glyph.setText(GLYPH[s.piece.side][e.to] + VS15);
        continue;
      }
      if (e.type !== 'attack') continue;
      const atk = this.sprites.get(e.attackerId);
      if (!atk) continue;
      const order = this.add
        .text(atk.root.x + t * 0.5, atk.root.y - t * 0.12, `#${e.order + 1}`, { fontFamily: 'Cinzel, serif', fontStyle: '700', fontSize: `${Math.round(t * 0.3)}px`, color: '#C89B3C', stroke: '#16141C', strokeThickness: 3 })
        .setOrigin(0.5)
        .setDepth(7)
        .setResolution(this.dpr);
      await this.tween({ targets: atk.root, scale: { from: 1, to: 1.12 }, yoyo: true, duration: 110 });

      this.fxG.clear();
      for (const a of e.area) {
        const w = this.world(a);
        this.fxG.fillStyle(C.crimson, 0.22).fillRect(w.x, w.y, t, t);
      }
      for (const h of e.hits) {
        const ts = this.sprites.get(h.targetId);
        if (!ts) continue;
        this.fxG.lineStyle(Math.max(2, t * 0.06), C.crimson, 0.9).lineBetween(atk.root.x + t / 2, atk.root.y + t / 2, ts.root.x + t / 2, ts.root.y + t / 2);
      }
      await this.wait(90);

      // 피격: 흰 점멸 · 히트스톱 · 흔들림 · 피해 숫자
      for (const h of e.hits) {
        const ts = this.sprites.get(h.targetId);
        if (!ts) continue;
        ts.glyph.setTintFill(0xffffff);
        const dealt = ts.piece.hp - h.hpAfter;
        this.drawHp(ts, h.hpAfter, h.hpAfter);
        ts.piece = { ...ts.piece, hp: h.hpAfter };
        const dmg = this.add
          .text(ts.root.x + t / 2, ts.root.y + t * 0.1, `-${dealt}`, { fontFamily: 'Noto Sans KR, sans-serif', fontStyle: '700', fontSize: `${Math.round(t * 0.34)}px`, color: '#FDE68A', stroke: '#16141C', strokeThickness: 4 })
          .setOrigin(0.5)
          .setDepth(8)
          .setResolution(this.dpr);
        this.tweens.add({ targets: dmg, y: dmg.y - t * 0.5, alpha: 0, duration: 650, onComplete: () => dmg.destroy() });
        if (h.pushedTo) {
          const w = this.world(h.pushedTo);
          this.tweens.add({ targets: ts.root, x: w.x, y: w.y, duration: 160, ease: 'Quad.easeOut' });
        }
      }
      if (e.hits.length) this.cameras.main.shake(90, 0.005);
      const checked = e.hits.find((h) => h.checked);
      if (checked) this.announce(`체크! ${this.sprites.get(checked.targetId)?.piece.side === 0 ? '내' : '적'} 킹이 HP 1로 버팁니다 — 다음 공격이면 끝`);
      await this.wait(60);
      for (const h of e.hits) this.sprites.get(h.targetId)?.glyph.clearTint();
      this.fxG.clear();

      const deaths = e.hits.filter((h) => h.killed).map((h) => this.sprites.get(h.targetId)).filter((s): s is PieceSprite => !!s);
      if (deaths.length) {
        await Promise.all(deaths.map((s) => this.tween({ targets: s.root, alpha: 0, scale: 0.5, duration: 220 })));
        for (const s of deaths) {
          s.root.destroy();
          this.sprites.delete(s.piece.id);
        }
      }
      order.destroy();
      await this.wait(240);
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
    this.whenReady = new Promise((r) => (this.scene.ready = r));
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
}
