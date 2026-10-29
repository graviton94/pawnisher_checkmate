import Phaser from 'phaser';
import type { BoardModel, BoardView } from '../game/controller';
import type { BattleEvent, BattleState, Piece, PieceType, Plan, Pos } from '../engine';

/** 플레이스홀더 기물 글리프. 도트 스프라이트는 M6에서 교체한다. */
const GLYPH: Record<0 | 1, Record<PieceType, string>> = {
  0: { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙' },
  1: { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟' },
};
const VS15 = '︎';
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
    const t = this.tile;
    this.tilesG.clear();
    for (let y = 0; y < state.height; y++) {
      for (let x = 0; x < state.width; x++) {
        const w = this.world({ x, y });
        this.tilesG.fillStyle((x + y) % 2 === 0 ? C.dark : C.light, 1).fillRect(w.x, w.y, t, t);
      }
    }
    this.fitCamera(true);
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
    const glyph = this.add
      .text(t / 2, t * 0.42, GLYPH[p.side][p.type] + VS15, {
        fontFamily: GLYPH_FONT,
        fontSize: `${Math.round(t * 0.78)}px`,
        color: p.side === 0 ? '#F4F7FB' : '#120F17',
        stroke: p.side === 0 ? '#1E3A8A' : '#F43F5E',
        strokeThickness: Math.max(2, Math.round(t * 0.05)),
      })
      .setOrigin(0.5)
      .setResolution(this.dpr);
    const hp = this.add.graphics();
    root.add([base, glyph, hp]);
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
        const isPending = m.pending && m.pending.to.x === d.x && m.pending.to.y === d.y;
        if (isPending) this.marksG.lineStyle(3, C.cyan, 1).strokeCircle(c.x, c.y, t * 0.36);
        else this.marksG.fillStyle(C.cyan, 0.85).fillCircle(c.x, c.y, t * 0.12);
      }
    }

    // 원래 자리 잔상 + 화살표 + 순번
    full.forEach((mv, i) => {
      const orig = m.state.pieces.find((p) => p.id === mv.pieceId)!;
      const ghost = this.makePiece(orig, orig, 0.28);
      ghost.hp.setVisible(false);
      this.dynamic.push(ghost.root);
      const isPending = m.pending !== null && i === full.length - 1;
      this.arrow(orig, mv.to, orig.type === 'N', C.cyan, isPending ? 0.5 : 1);
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

    full.forEach((mv, i) => this.badge(mv.to, i + 1, m.pending !== null && i === full.length - 1 ? 0.55 : 1));
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
      const orig = state.pieces.find((p) => p.id === mv.pieceId)!;
      this.arrow(orig, mv.to, orig.type === 'N', C.crimson, 0.9);
      this.badge(mv.to, i + 1, 1, C.crimson);
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
    // 예약 순서대로 이동 → 공격 (GDD 1장 §1.5)
    for (const e of events) {
      if (e.type === 'move') {
        const s = this.sprites.get(e.pieceId);
        if (!s) continue;
        const w = this.world(e.to);
        await this.tween({ targets: s.root, x: w.x, y: w.y, duration: 220, ease: 'Quad.easeIn' });
        this.cameras.main.shake(60, 0.002);
        await this.wait(70);
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
      }
      if (e.hits.length) this.cameras.main.shake(90, 0.005);
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

  constructor(private host: HTMLElement, input: BoardInput) {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.scene = new BoardScene();
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
