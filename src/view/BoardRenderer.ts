import { vignette } from '../ui/juice';
import { PACE } from '../data/motion';
import { CARVES } from '../data/carves';
import { sfx } from '../audio/sfx';
import Phaser from 'phaser';
import type { BoardModel, BoardView, LogEntry } from '../game/controller';
import { CRUMBLE_MS, MOVE_TOTAL, drawCrumble, drawLandPuff, moveMotion, fxPower, impactFeedback, playAttackFx, type CrumbleCell, type Pose } from './attackFx';
import { drawArrow, drawDropDot, drawGauge } from './marks';
import { BOARD_DOTS, PixelPen } from './pixel';
import { displayPreset } from '../data/display';
import { POPUP_MS, buildPopupArt, drawPopup } from './popup';
import { BoardFx } from './boardfx';
import { FX_CAMERA, IMPACT, MOVE_MS, RENDER, TURN_SUMMARY } from '../data/fx';
import { coolRamp, drawCharge, drawCrown, drawEmbers, drawRing, drawSlamDust, drawSpark, drawTakeoffDust, rippleOffset } from './impact';
import { drawGearTarget } from './target';

const REST_POSE: Pose = { dx: 0, dy: 0, sx: 1, sy: 1 };
import { findPiece, isFallen, upcomingCollapse, type BattleEvent, type BattleState, type Piece, type PieceType, type Side, type Plan, type PlanStep, type Pos } from '../engine';

/** 판 위 글씨 크기 (D-213): 갈무리11 굵게의 격자(12px) 배수로만 — 크기마다 다른 서체처럼 보이지 않게 */
const gpx = (px: number): number => Math.max(12, Math.round(px / 12) * 12);



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
/**
 * 판 위 투명도만 바꾸는 트윈은 4단 계단으로 (D-216 6 — 단순 페이드 금지). 움직임과 함께 가는 투명도는 움직임 곡선을 따른다.
 */
{
  const proto = Phaser.Tweens.TweenManager.prototype as unknown as { add: (cfg: Record<string, unknown>) => unknown };
  const orig = proto.add;
  const MOTION = ['x', 'y', 'scale', 'scaleX', 'scaleY', 'angle', 'rotation', 'displayWidth', 'displayHeight'];
  proto.add = function (this: unknown, cfg: Record<string, unknown>) {
    if (cfg && typeof cfg === 'object' && 'alpha' in cfg && !MOTION.some((k) => k in cfg) && !('ease' in cfg && cfg.ease === 'Stepped')) cfg = { ...cfg, ease: 'Stepped', easeParams: [4] };
    return orig.call(this, cfg);
  };
}

/** 터치 기기 칸 최대 크기 (CSS px) */
/** 깨진 심장 톱니 속 칠 (D-219): 흰 기물 팔레트 → 한 단계 어두운 쇠 색. 외곽선 #0b0b0e · 바깥 흰 테 #f4f1ea는 그대로 */
/**
 * 정예(검문) · 반장 적 기물 속 칠 (2026-11-05, 체스 레퍼런스 기물 100스타일 학습: 같은 실루엣에 속 색만 바꿔 계급을 말한다).
 * 검정 기물의 속 칠 5단계만 1:1로 바꾼다 — 외곽선 · 흰 테는 그대로라 진영(명도)은 그대로 읽힌다.
 */
const FOE_TONE: Record<string, Record<number, number>> = {
  // 반장별 (D-249 — 반장 초상화에서 뽑은 색): 철갑 = 쇠녹 · 쇳물 / 조립 = 청강 · 청록 / 출하 = 총신쇠 · 핏빛
  'boss-plate': { 0x6e717e: 0xe0904a, 0x484a55: 0x8c4a2a, 0x32343d: 0x5e2e1c, 0x26272e: 0x401e14, 0x1c1d22: 0x28120c },
  'boss-spawn': { 0x6e717e: 0x9fe07a, 0x484a55: 0x3e7a34, 0x32343d: 0x2a5424, 0x26272e: 0x1c3a1a, 0x1c1d22: 0x102210 }, // D-347: 청록 → 기계 초록 (검수 반장과 갈리게)
  'boss-gilded': { 0x6e717e: 0xf4c84a, 0x484a55: 0xa8741c, 0x32343d: 0x6e4a12, 0x26272e: 0x46300c, 0x1c1d22: 0x241806 },
  'boss-thorns': { 0x6e717e: 0xe8e4ec, 0x484a55: 0x6a6e7c, 0x32343d: 0x44474f, 0x26272e: 0x2a2c36, 0x1c1d22: 0x1a1a22 }, // 은빛 역광 (경보 빨강과 같은 막에서 갈리게, D-309)
  // 새 반장 셋 (D-309): 검수 = 찬 청강 / 자석 = 보라 / 경보 = 붉은 쇠
  'boss-inspect': { 0x6e717e: 0x9ee8f0, 0x484a55: 0x3e6e7c, 0x32343d: 0x2a4c58, 0x26272e: 0x1c363e, 0x1c1d22: 0x101e24 },
  'boss-magnet': { 0x6e717e: 0xd08af0, 0x484a55: 0x6e3a8c, 0x32343d: 0x4e2866, 0x26272e: 0x381c4c, 0x1c1d22: 0x221030 },
  'boss-alarm': { 0x6e717e: 0xff6b6b, 0x484a55: 0x8c2a30, 0x32343d: 0x5e1c20, 0x26272e: 0x401418, 0x1c1d22: 0x280c0e },
  elite: { 0x6e717e: 0xa65a5e, 0x484a55: 0x74303a, 0x32343d: 0x56202a, 0x26272e: 0x40161e, 0x1c1d22: 0x2a0e13 }, // 검붉은 쇠
  boss: { 0x6e717e: 0xc89b3c, 0x484a55: 0x6e4a8c, 0x32343d: 0x4e3266, 0x26272e: 0x38224c, 0x1c1d22: 0x241634 }, // 불길한 보라 + 금빛 반짝
};
const CRACK_TONE: Record<number, number> = { 0xffffff: 0x9a97a0, 0xf1eeec: 0x8a8790, 0xe2ded6: 0x7a7780, 0xc5c3c3: 0x5f5d66, 0x858488: 0x45434b, 0x3a393e: 0x2a2930 };
/**
 * 기물 그림 크기 (2026-11-05): 기물 PNG는 72칸 캔버스(64칸 몸 + 위 8줄 — 주인공 종이 왕관 자리)다.
 * 몸 64칸이 예전처럼 칸의 82%를 차지하도록 그림 전체를 72/64배로 키우고, 바닥(칸의 84%)에 맞춘다.
 */
const PIECE_SIZE = 0.82 * (72 / 64);
const PIECE_Y = 0.84 - PIECE_SIZE / 2;
/** 판 위 상태 띠 자리 (CSS px, 위에서) — 이만큼 비우고 판을 그 아래 가운데에 (총괄 리뷰 3.9 · D-396). 2.0 화면은 0 */
let boardTopInset = 0;
/** 판 열 위쪽을 상태 띠 자리로 비운다 (본편 전투 HUD가 부른다) */
export const setBoardTopInset = (px: number): void => {
  boardTopInset = px;
};
const tileSize = (dpr: number, cols: number, rows: number, viewW: number, viewH: number): number => {
  // D-429: 네 대표 규격으로 크기를 정한다. PC/태블릿을 폰의 54px 상한으로 제한하지 않는다.
  const want = displayPreset(window.innerWidth, window.innerHeight).tile;
  // 판 전체가 한 화면에 들어오게 (D-074): 위 여백 0.65칸(배지) + 아래 0.25칸, 양옆 0.25칸
  // 판 배치 시안 C (D-198): 위아래 여백을 줄여 판을 키운다
  const vPad = document.body.matches('.lay-f') ? 0.45 : 0.9;
  // 양옆 여백: 본편은 판 옆이 레일(안쪽 여백이 있다)이라 0칸 (667 폭에서도 칸 50 — 터치 48 하한, D-396)
  const hPad = document.body.matches('.lay-f') ? 0 : 0.5;
  const fit = Math.min(want, (viewH - boardTopInset) / (rows + vPad), viewW / (cols + hPad));
  // 한 도트 = 기기 픽셀 정수 (내림 — 넘치지 않게). 예전 하한 5도트는 DPR 2 아래 기기 · PC에서 판을 화면 밖으로 밀었다
  const dots = Math.max(1, Math.floor((fit * dpr) / BOARD_DOTS));
  return (dots * BOARD_DOTS) / dpr;
};

/** 판 그림 (tools/draw-board.py · FX 랩에서 고른 것) — public/ui/board/ */
const BOARD_IMAGES = ['tile-light', 'tile-dark', 'tile-light-a1', 'tile-dark-a1', 'tile-light-a2', 'tile-dark-a2', 'tile-light-a3', 'tile-dark-a3', 'tile-light-bplate', 'tile-dark-bplate', 'tile-light-bspawn', 'tile-dark-bspawn', 'tile-light-bthorns', 'tile-dark-bthorns', 'tile-light-bgilded', 'tile-dark-bgilded', 'tile-light-binspect', 'tile-dark-binspect', 'tile-light-bmagnet', 'tile-dark-bmagnet', 'tile-light-balarm', 'tile-dark-balarm', 'last-move', 'chip-flame', 'chip-claw', 'chip-crown', 'chip-skull', 'chip-stun', 'chip-shock', 'chip-stamp', 'chip-magnet', 'crack', 'fallen', 'range', 'range-enemy', 'select', 'move-dot', 'target-enemy', 'kill', 'check', 'stronghold', 'stronghold-ally', 'stronghold-enemy', 'stronghold-flag', 'stronghold-ally-flag', 'stronghold-enemy-flag', 'variant-conveyor', 'variant-hammer', 'variant-mirror', 'variant-radiator', 'variant-boiler', 'variant-spring', 'variant-scope', 'variant-turret', 'variant-command', ...[1, 2, 3, 4, 5, 6, 7, 8, 9].flatMap((n) => [`badge-a${n}`, `badge-e${n}`])];
const boardKey = (name: string) => `ui-${name}`;
/** 주인공 킹 그림 (86×106 — 폰 86px 위에 왕관 20px) */

/** 예약 하나를 그릴 화살표 */
const stepArrows = (s: BattleState, step: PlanStep): { piece: Piece; from: Pos; to: Pos; knight: boolean }[] => {
  const p = findPiece(s, step.pieceId);
  return p ? [{ piece: p, from: p, to: step.to, knight: p.type === 'N' }] : [];
};

/** 예약 순번 배지를 붙일 칸 */
const stepBadge = (_s: BattleState, _virtual: BattleState, step: PlanStep): Pos => step.to;

/** 결정론 잡음 (파편 방향) */
const hashN = (n: number): number => {
  const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};
const easeOutElastic = (x: number): number => (x <= 0 ? 0 : x >= 1 ? 1 : 2 ** (-10 * x) * Math.sin((x * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1);
/** 영화 띠 (반장 마무리): 위아래 검은 띠가 닫힌다. 돌려주는 함수를 부르면 열린다 */
const letterbox = (h: number): (() => void) => {
  const bars = ['top', 'bottom'].map((side) => {
    const el = document.createElement('div');
    el.className = `lbox ${side}`;
    el.style.height = `${h}px`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('on'));
    return el;
  });
  return () => {
    for (const el of bars) el.classList.remove('on');
    window.setTimeout(() => bars.forEach((el) => el.remove()), 500);
  };
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
  /** 줄 폭격 예고 칸 (불길이 일렁인다, D-203) */
  fire: { x: number; y: number }[];
  glints: { s: PieceSprite; hp: number; after: number }[];
}
const noMarks = (): AnimMarks => ({ arrows: [], gears: [], threat: [], fire: [], glints: [] });

/** 흔들림 세 단계 (D-193) */
/** 흔들림 세 단계 (D-214: 사용자 "너무 잦고 크다" — 세기 · 길이를 절반 가까이로) */
/** 화면 흔들림 세기 (2026-11-06 사용자: 「진동이 너무 잦아 정신없다」 — 세기를 절반 남짓으로, 1단은 거의 안 느껴질 만큼) */
const SHAKE_LV = { 1: [110, 0.001], 2: [180, 0.0022], 3: [260, 0.0038] } as const;
const shakeLvOf = (k: number): 1 | 2 | 3 => (k < 0.007 ? 1 : k < 0.011 ? 2 : 3);

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
  /** 적 특성 표식 (자폭 폰 · 되받아침 반장) — 대국마다 setFoeTraits로 */
  private foeTraits: ('blast' | 'thorns')[] = [];
  setFoeTraits(list: ('blast' | 'thorns')[]): void {
    this.foeTraits = list;
  }
  /** 원수 (D-178): 이 기물 왼쪽 위에 진홍 해골 딱지 */
  nemesisId: number | null = null;
  /** 심장 톱니가 깨진 내 기물 (D-219): 외곽선은 그대로, 속 칠만 어둡게 — 판에 딱지를 더하지 않는다 (사용자: "보드가 더럽다") */
  crackedIds: number[] = [];
  /** 경직된 적 (헛방, D-229) — 오른쪽 위 별 딱지 */
  staggeredIds: number[] = [];
  /** 기어 쇼크를 먹은 내 기물 (D-229) — 오른쪽 위 번개 딱지 */
  shockedIds: number[] = [];
  /** 새 반장 표식 (D-274): 불량 도장 · 끌려갈 기물 — 내 기물 왼쪽 위 */
  stampId: number | null = null;
  pullId: number | null = null;
  /** 적 계급 색: '' 보통 · elite 검문 · boss 반장 */
  foeTone: string = '';
  /** 반장 판 (D-249): plate · spawn · thorns — 전용 칸 · 기물 색 */
  bossRule = '';
  /** 판 위 도트 FX 층 (D-249) */
  fxHook?: BoardFx;
  /** 막 번호 (1~3) — 막마다 판 색조가 다르다 (0이면 기본 철판) */
  act = 0;
  /** 직전 적 수: 출발 · 도착 칸에 모서리 꺾쇠 */
  lastMoves: Pos[] = [];

  preload(): void {
    for (const type of ['P', 'N', 'B', 'R', 'Q', 'K'] as PieceType[])
      for (const side of [0, 1] as Side[]) this.load.image(pieceKey(type, side), `pieces/s-${type}${side}.png`);
    for (const n of BOARD_IMAGES) this.load.image(boardKey(n), `ui/board/${n}.png`);
    this.load.image(boardKey('skull'), 'ui/hud/skull-small.png');
    for (const name of ['reticle', 'star', 'crown', 'flame', 'claw', 'skull']) if (!this.textures.exists(`icon-${name}`)) this.load.image(`icon-${name}`, `ui/icons/${name}.png`);
  }

  /**
   * 깨진 심장 톱니 기물 (D-219): 내 기물 그림에서 검은 외곽선 · 바깥 흰 테는 두고 속 칠 색만 팔레트로 한 단계씩 어둡게 바꾼 텍스처.
   * 색을 1:1로 바꿀 뿐이라 도트가 그대로 남는다 (그라데이션 · 반투명 없음). 명도 차이라 색약에도 보인다.
   */
  private makeCrackedTexture(type: PieceType): void {
    this.makeToneTexture(type, 0, 'crack', CRACK_TONE);
  }
  /** 기물 그림의 색을 표에 따라 1:1로 바꾼 새 그림 `<기물키>-<suffix>` */
  private makeToneTexture(type: PieceType, side: Side, suffix: string, tone: Record<number, number>): void {
    const CRACK_TONE = tone;
    const key = `${pieceKey(type, side)}-${suffix}`;
    if (this.textures.exists(key)) return;
    const src = this.textures.get(pieceKey(type, side)).getSourceImage() as HTMLImageElement;
    const tex = this.textures.createCanvas(key, src.width, src.height);
    if (!tex) return;
    const ctx = tex.getContext();
    ctx.drawImage(src, 0, 0);
    const img = ctx.getImageData(0, 0, src.width, src.height);
    const px = img.data;
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] === 0) continue;
      const to = CRACK_TONE[(px[i] << 16) | (px[i + 1] << 8) | px[i + 2]];
      if (to === undefined) continue;
      px[i] = (to >> 16) & 255;
      px[i + 1] = (to >> 8) & 255;
      px[i + 2] = to & 255;
    }
    ctx.putImageData(img, 0, 0);
    tex.refresh();
    tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
  }
  /** 이 기물이 쓸 그림 (깨진 내 기물이면 어두운 속 칠) */
  private glyphKey(id: number, type: PieceType, side: Side): string {
    if (side === 1 && this.foeTone && this.textures.exists(`${pieceKey(type, 1)}-${this.foeTone}`)) return `${pieceKey(type, 1)}-${this.foeTone}`;
    return side === 0 && this.crackedIds.includes(id) && this.textures.exists(`${pieceKey(type, 0)}-crack`) ? `${pieceKey(type, 0)}-crack` : pieceKey(type, side);
  }

  create(): void {
    for (const type of ['P', 'N', 'B', 'R', 'Q', 'K'] as PieceType[])
      for (const side of [0, 1] as Side[]) this.textures.get(pieceKey(type, side)).setFilter(Phaser.Textures.FilterMode.NEAREST);
    for (const n of [...BOARD_IMAGES, 'skull']) this.textures.get(boardKey(n)).setFilter(Phaser.Textures.FilterMode.NEAREST);
    for (const type of ['P', 'N', 'B', 'R', 'Q', 'K'] as PieceType[]) {
      this.makeCrackedTexture(type);
      this.makeToneTexture(type, 1, 'elite', FOE_TONE.elite);
      this.makeToneTexture(type, 1, 'boss', FOE_TONE.boss);
      for (const k of ['boss-plate', 'boss-spawn', 'boss-thorns', 'boss-gilded', 'boss-inspect', 'boss-magnet', 'boss-alarm']) this.makeToneTexture(type, 1, k, FOE_TONE[k]);
    }
    this.cameras.main.setZoom(this.dpr);
    this.camZoom = this.dpr;
    this.cameras.main.setBackgroundColor(C.bg);
    this.tilesG = this.add.graphics().setDepth(0.1);
    this.tilesC = this.add.container(0, 0).setDepth(0);
    this.marksG = this.add.graphics().setDepth(1);
    this.animG = this.add.graphics().setDepth(1.5);
    this.arrowsG = this.add.graphics().setDepth(3.9); // 기물 위 · 순번 배지 아래 (D-245: 예고선이 기물 발밑에 깔려 끊겨 보였다)
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
    if (this.anim.fire.length) {
      // 줄 폭격 예고: 칸 아래에서 도트 불꽃 혀가 일렁인다 — 일반 위협(붉은 깜빡임)과 다른 모양
      const d = t / BOARD_DOTS;
      // 도트 불꽃 (테스터: 빨강 · 노랑 막대가 피아노 건반 같았다): 칸 아래에서 혀 모양 불길 — 겉 붉은 쇳물 → 주황 → 노란 심,
      // 2도트 기둥마다 높이가 다르고 8박자 계단으로 일렁인다 (부드러운 보간 없음)
      const fr = Math.floor(ms / 120);
      const hash = (a: number, b: number) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
      const cols = Math.floor(BOARD_DOTS / 2);
      this.anim.fire.forEach((w, i) => {
        g.fillStyle(0x7a1c08, 0.22).fillRect(w.x, w.y + t * 0.5, t, t * 0.5);
        for (let c = 0; c < cols; c++) {
          // 가운데가 높은 혀 모양 + 기둥마다 흔들림
          const mid = 1 - Math.abs((c + 0.5) / cols - 0.5) * 1.6;
          const n = hash(i * 13 + c, fr + c * 0.37 + (c % 3));
          const hd = Math.max(2, Math.round(BOARD_DOTS * (0.22 + 0.58 * mid * (0.55 + 0.45 * n))));
          const x = w.x + c * 2 * d;
          const base = w.y + t;
          g.fillStyle(0xc23a0c, 1).fillRect(x, base - hd * d, d * 2, hd * d);
          const h2 = Math.round(hd * 0.68);
          g.fillStyle(0xf8a03a, 1).fillRect(x, base - h2 * d, d * 2, h2 * d);
          const h3 = Math.round(hd * 0.36);
          if (h3 > 0) g.fillStyle(0xffd27a, 1).fillRect(x, base - h3 * d, d * 2, h3 * d);
          // 끝에서 튀는 불씨 한 점 (가끔)
          if (n > 0.82) g.fillStyle(0xffd27a, 1).fillRect(x + (fr % 2) * d, base - (hd + 2) * d, d, d);
        }
      });
    }
    for (const r of this.anim.gears) drawGearTarget(pen, r.x + t / 2 + pen.dot / 2, r.y + t / 2 + pen.dot / 2, r.kind, ms);
    for (const r of this.anim.arrows) drawArrow(pen, r.a, r.b, r.knight, r.color, ms, r.alpha);
    const tp = new PixelPen(top, t / BOARD_DOTS);
    for (const r of this.anim.glints) {
      if (!r.s.root.active) continue;
      drawGauge(tp, r.s.root.x + 3 * tp.dot, r.s.root.y + 16 * tp.dot, r.s.piece.side, r.hp, r.after, r.s.piece.maxHp, ms);
    }
  }

  /**
   * 특수 기믹 연출 (D-203, 사용자: "그 특성이 확실히 드러나야 하고 일반 공격과 다른 형식"). 도트 칸 단위 · 계단 페이드.
   * row: 한 줄을 왼쪽부터 불길이 훑고 지나간다 · thorns: 반장에서 친 기물까지 가시 줄 · burst: 터진 칸 둘레 3×3이 두 번 번쩍 · steam: 맞은 적마다 김이 솟는다
   */
  private async gimmickFx(kind: 'row' | 'thorns' | 'burst' | 'steam', pos: Pos, from: Pos | undefined, ids: number[]): Promise<void> {
    if (this.calm || !this.state) return;
    const t = this.tile;
    const objs: Phaser.GameObjects.GameObject[] = [];
    const cell = (q: Pos, color: number, alpha: number, delay: number, life = 260, inset = 0) => {
      if (q.x < 0 || q.y < 0 || q.x >= this.state.width || q.y >= this.state.height) return;
      const w = this.world(q);
      const r = this.add.rectangle(w.x + inset, w.y + inset, t - inset * 2, t - inset * 2, color, alpha).setOrigin(0, 0).setDepth(8).setAlpha(0);
      objs.push(r);
      this.tweens.add({ targets: r, alpha: { from: 0, to: alpha }, delay, duration: 60, ease: 'Stepped', easeParams: [2] });
      this.tweens.add({ targets: r, alpha: 0, delay: delay + life, duration: 160, ease: 'Stepped', easeParams: [3] });
    };
    if (kind === 'row' && this.fxHook) {
      sfx('threat');
      await this.fxHook.rowBomb(pos.y, this.state.width);
    } else if (kind === 'thorns' && from && this.fxHook) {
      sfx('threat');
      await this.fxHook.thorns(from, pos);
      const sp = [...this.sprites.values()].find((v) => v.piece.x === pos.x && v.piece.y === pos.y);
      if (sp) this.tweens.add({ targets: sp.root, x: sp.root.x + t * 0.08, duration: 40, yoyo: true, repeat: 3 });
    } else if (kind === 'row') {
      sfx('threat');
      for (let x = 0; x < this.state.width; x++) {
        cell({ x, y: pos.y }, 0xe8783c, 0.75, x * 55, 240);
        cell({ x, y: pos.y }, 0xfacc15, 0.6, x * 55 + 40, 120, t * 0.28);
      }
      await this.wait(this.state.width * 55 + 160);
    } else if (kind === 'burst') {
      for (const [dx, dy] of [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]) cell({ x: pos.x + dx, y: pos.y + dy }, 0xe8783c, 0.55, 0, 120);
      cell(pos, 0xfff3b0, 0.9, 0, 100);
      for (const [dx, dy] of [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]) cell({ x: pos.x + dx, y: pos.y + dy }, 0xfacc15, 0.45, 200, 100, t * 0.2);
      await this.wait(320);
    } else if (kind === 'thorns' && from) {
      sfx('threat');
      const a = this.center(from);
      const b = this.center(pos);
      const n = Math.max(3, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / (t * 0.35)));
      const g = this.add.graphics().setDepth(9);
      objs.push(g);
      for (let i = 1; i <= n; i++) {
        const k = i / n;
        const x = a.x + (b.x - a.x) * k;
        const y = a.y + (b.y - a.y) * k;
        const sz = t * 0.14;
        this.time.delayedCall(i * 28, () => {
          if (!g.active) return;
          g.fillStyle(0x0b0b0e, 1).fillTriangle(x - sz - 2, y + sz + 2, x + sz + 2, y + sz + 2, x, y - sz * 1.6 - 2);
          g.fillStyle(0xe5262f, 1).fillTriangle(x - sz, y + sz, x + sz, y + sz, x, y - sz * 1.6);
        });
      }
      const sp = [...this.sprites.values()].find((v) => v.piece.x === pos.x && v.piece.y === pos.y);
      if (sp) this.tweens.add({ targets: sp.root, x: sp.root.x + t * 0.08, duration: 40, yoyo: true, repeat: 3, delay: n * 28 });
      await this.wait(n * 28 + 220);
    } else if (kind === 'steam') {
      for (const id of ids) {
        const sp = this.sprites.get(id);
        if (!sp) continue;
        for (let i = 0; i < 4; i++) {
          const puff = this.add.rectangle(sp.root.x + t * (0.2 + 0.2 * i), sp.root.y + t * 0.6, t * 0.18, t * 0.18, 0xcfe3ea, 0.8).setDepth(9);
          objs.push(puff);
          this.tweens.add({ targets: puff, y: puff.y - t * 0.7, alpha: 0, delay: i * 50, duration: 420, ease: 'Stepped', easeParams: [5] });
        }
      }
      await this.wait(300);
    }
    this.time.delayedCall(600, () => objs.forEach((o) => o.active && o.destroy()));
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

  /** 판 칸 · 무너진 칸 · 붕락 균열 — 코드 도트 그림 (D-071, FX 랩에서 고른 것) */
  drawTiles(state: BattleState): void {
    const t = this.tile;
    this.tilesG.clear();
    this.tilesC.removeAll(true);
    this.boardTopC.removeAll(true);
    const put = (c: Phaser.GameObjects.Container, name: string, x: number, y: number) =>
      c.add(this.add.image(x, y, boardKey(name)).setOrigin(0, 0).setDisplaySize(t, t));
    for (let y = 0; y < state.height; y++)
      for (let x = 0; x < state.width; x++) {
        const w = this.world({ x, y });
        const suf = this.bossRule ? `-b${this.bossRule}` : this.act ? `-a${this.act}` : '';
        put(this.tilesC, isFallen(state, x, y) ? 'fallen' : (x + y) % 2 === 0 ? `tile-dark${suf}` : `tile-light${suf}`, w.x, w.y);
      }
    for (const p of this.lastMoves) {
      const w = this.world(p);
      put(this.tilesC, 'last-move', w.x, w.y);
    }
    // 다음 라운드에 무너질 칸 예고: 철판에 간 금 (D-045)
    for (const p of upcomingCollapse(state)) {
      const w = this.world(p);
      put(this.tilesC, 'crack', w.x, w.y);
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
    // 판이 다 들어오면 위 상태 띠 자리(boardTopInset)를 뺀 나머지의 가운데 — 아래 끝이 화면 밖으로 나가지 않게
    const y = bh + m - top <= viewH ? Math.max((top + bh + m) / 2 - boardTopInset / 2, bh + m - viewH / 2) : clamp(cy, top + viewH / 2, bh + m - viewH / 2);
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
    const rings: Phaser.GameObjects.GameObject[] = [];
    // 체크: HP 1로 버틴 킹 — 다음에 맞으면 끝 (D-022). 위 가운데가 터진 붉은 톱니 고리
    if (p.type === 'K' && p.hp === 1 && this.state?.rules.checkmate) rings.push(this.add.image(t / 2, t / 2, boardKey('check')).setDisplaySize((t * 21) / 20, (t * 21) / 20));
    const marks: Phaser.GameObjects.GameObject[] = [];
    // 각인 (규격 2.0): 왼쪽 위 검은 딱지 + 황동 글자 하나 — 길게 누르면 이름 · 효과
    if (p.carve) {
      const size = t * 0.34;
      const tag = this.add.graphics();
      tag.fillStyle(0x16141c, 1).fillRect(t * 0.02, t * 0.02, size, size);
      tag.lineStyle(Math.max(1, t * 0.03), C.brass, 1).strokeRect(t * 0.02, t * 0.02, size, size);
      marks.push(
        tag,
        this.add
          .text(t * 0.02 + size / 2, t * 0.02 + size / 2, CARVES[p.carve].mark, { fontFamily: 'Galmuri11, sans-serif', fontStyle: '700', fontSize: `${gpx(size * 0.7)}px`, color: '#E8C060' })
          .setOrigin(0.5)
          .setResolution(this.dpr),
      );
    }
    // 정예 (검문!): 오른쪽 위 진홍 왕관 딱지 — HP 두 배
    // 딱지 (2026-11-05 도트 명패, tools/pixel/board_chips.py): 정예 = 왕관 · 자폭 폰 = 불꽃 · 되받아치는 반장 킹 = 발톱 — 오른쪽 위,
    // 원수 = 해골 — 왼쪽 위. 치기 전에 "이 기물은 물어뜯는다"가 보인다 (D-175 · D-178)
    const chipAt = (name: string, left: boolean) => {
      const size = Math.round(t * 0.36);
      const x = left ? t * 0.02 + size / 2 : t - t * 0.02 - size / 2;
      marks.push(this.add.image(Math.round(x), Math.round(t * 0.02 + size / 2), boardKey(`chip-${name}`)).setDisplaySize(size, size));
    };
    const trait = p.side === 1 ? (p.type === 'P' && this.foeTraits.includes('blast') ? 'flame' : p.type === 'K' && this.foeTraits.includes('thorns') ? 'claw' : null) : null;
    if (p.side === 0 && this.shockedIds.includes(p.id)) chipAt('shock', false);
    if (this.staggeredIds.includes(p.id)) chipAt('stun', false);
    else if (p.elite) chipAt('crown', false);
    else if (trait) chipAt(trait, false);
    if (p.id === this.nemesisId && p.side === 1) chipAt('skull', true);
    if (p.side === 0 && p.id === this.stampId) chipAt('stamp', true);
    else if (p.side === 0 && p.id === this.pullId) chipAt('magnet', true);
    // 도트 기물 (머리 강조형 16×16) — 받침 위에 살짝 올려 그린다
    const glyph = this.add.image(t / 2, t * PIECE_Y, this.glyphKey(p.id, p.asPawn ? 'P' : p.type, p.side)).setDisplaySize(t * PIECE_SIZE, t * PIECE_SIZE);
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

  /**
   * 떠오르는 숫자 · 낱말 (D-193 숫자 통일): 숫자는 모두 타격과 같은 도트 숫자 — 내가 맞음 진홍 · 적이 맞음 흰 · 회복 초록 · 방열판 은빛.
   * 「생명!」 같은 낱말은 딱지(검은 테 + 색 판)로 튀어나와 머문 뒤 계단으로 접힌다.
   */
  private floatText(sp: PieceSprite, text: string, color: string): void {
    const t = this.tile;
    const d = t / BOARD_DOTS;
    if (/^[+−-]\d+$/.test(text)) {
      const heal = text.startsWith('+');
      const c = heal ? (color.toUpperCase() === '#E2E8F0' ? 0xe2e8f0 : 0x86efac) : sp.piece.side === 0 ? 0xff6b6b : 0xf4f1ea;
      const art = buildPopupArt(text.replace('−', '-'), c);
      const g = this.add.graphics().setDepth(8);
      const x0 = sp.root.x;
      const y0 = sp.root.y;
      this.tweens.addCounter({ from: 0, to: POPUP_MS.life, duration: POPUP_MS.life, onUpdate: (tw) => { g.clear(); drawPopup(g, art, x0 + t / 2, y0 + t * 0.3, d, tw.getValue() ?? 0, t * 0.35); }, onComplete: () => g.destroy() });
      return;
    }
    const lbl = this.add
      .text(0, 0, text, { fontFamily: 'Galmuri11, sans-serif', fontStyle: '700', fontSize: `${gpx(t * 0.24)}px`, color: '#16141C' })
      .setOrigin(0.5)
      .setResolution(this.dpr);
    const padX = t * 0.1;
    const padY = t * 0.04;
    const bw = lbl.width + padX * 2;
    const bh = lbl.height + padY * 2;
    const bg = this.add.graphics();
    bg.fillStyle(0x0b0b0e, 1).fillRect(-bw / 2 - 2, -bh / 2 - 2, bw + 4, bh + 4);
    bg.fillStyle(Phaser.Display.Color.HexStringToColor(color).color, 1).fillRect(-bw / 2, -bh / 2, bw, bh);
    const o = this.add.container(sp.root.x + t / 2, sp.root.y + t * 0.05, [bg, lbl]).setDepth(8);
    if (this.calm) return void this.time.delayedCall(700, () => o.destroy());
    o.setScale(0.3);
    this.tweens.chain({
      targets: o,
      tweens: [
        { y: o.y - t * 0.3, scale: 1.15, duration: 200, ease: 'Back.easeOut' },
        { scale: 1, duration: 120, ease: 'Quad.easeOut' },
        { y: o.y - t * 0.38, duration: 380, ease: 'Sine.easeOut' },
        // 도트 퇴장: 계단 넷으로 접힌다 (투명 페이드 없이)
        { scaleY: 0, duration: 200, ease: 'Stepped', easeParams: [4] },
      ],
      onComplete: () => o.destroy(),
    });
  }

  /** 판 세우기 (D-189): 칸이 왼위에서 대각선 물결로 떨어져 깔리고 → 기물이 위에서 떨어져 박혀 납작 · 마지막에 한 번 흔들림 */
  async boardIntro(): Promise<void> {
    if (this.calm || !this.state) return;
    const t = this.tile;
    const tiles = this.tilesC.list as Phaser.GameObjects.Image[];
    const H = this.state.height;
    for (const im of tiles) {
      const x = Math.round(im.x / t);
      const yTop = Math.round(im.y / t);
      const y0 = im.y;
      im.setAlpha(0).setY(y0 - t * 0.4);
      this.tweens.add({ targets: im, y: y0, alpha: 1, delay: (x + yTop) * 32, duration: 300, ease: 'Back.easeOut' });
    }
    const spr = [...this.sprites.values()];
    const base = (this.state.width + H) * 32 + 80;
    spr.forEach((sp) => {
      sp.root.setAlpha(0);
    });
    // 기물이 박히기 전에 의도 화살표 · 예측 숫자가 먼저 보이지 않게 (페르소나 테스트 m5) — 끝나면 한 번에 켠다
    const marks: { setAlpha(a: number): unknown }[] = [this.marksG, this.arrowsG, ...(this.dynamic as unknown as { setAlpha(a: number): unknown }[]).filter((o) => typeof (o as { setAlpha?: unknown }).setAlpha === 'function')];
    marks.forEach((o) => o.setAlpha(0));
    await new Promise<void>((r) => this.time.delayedCall(base, () => r()));
    await Promise.all(
      spr.map(async (sp, i) => {
        if (!sp.root.active) return;
        const y0 = sp.root.y;
        await new Promise<void>((r) => this.time.delayedCall(i * 55, () => r()));
        if (!sp.root.active) return;
        sp.root.setAlpha(1).setY(y0 - t * 1.6);
        await this.tween({ targets: sp.root, y: y0, duration: 200, ease: 'Quad.easeIn' });
        if (!sp.root.active) return;
        const g = sp.glyph;
        const sx = g.scaleX;
        const sy = g.scaleY;
        const gy = g.y;
        const h = g.displayHeight;
        // 납작 → 출렁 (발끝을 바닥에 둔 채)
        g.setScale(sx * 1.25, sy * 0.72).setY(gy + h * 0.14);
        this.tweens.add({ targets: g, scaleX: sx, scaleY: sy, y: gy, duration: 260, ease: 'Back.easeOut' });
      }),
    );
    this.shakeLv(1);
    marks.forEach((o) => o.setAlpha(1));
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
  private badge(pos: Pos, n: number, alpha = 1, enemy = false): Phaser.GameObjects.Image {
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
    return img;
  }

  /** 적 예고가 바뀐 순간만 과녁이 떨어져 철컥 박힌다 (D-184, 연구소 「적 예고」) */
  private aimSig = '';
  private dropAim(img: Phaser.GameObjects.Image, i: number): void {
    if (this.calm) return;
    const A = IMPACT.aim;
    const w = img.displayWidth;
    const h = img.displayHeight;
    const x = img.x;
    const y = img.y;
    img.setOrigin(0.5).setPosition(x + w / 2, y + h / 2).setAngle(A.fromAngle).setDisplaySize(w * A.fromScale, h * A.fromScale).setAlpha(0);
    this.tweens.add({ targets: img, angle: 0, displayWidth: w, displayHeight: h, alpha: img.alpha || 1, delay: i * 90, duration: A.drop, ease: 'Back.easeOut', onComplete: () => sfx('land') });
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
    if (m.fireRow !== undefined && m.fireRow !== null) for (let x = 0; x < m.state.width; x++) this.anim.fire.push(this.world({ x, y: m.fireRow }));
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
          if (hit.kill) img('kill', w.x + 7 * d, w.y + 7 * d, 7 * d, 1.7).setTintFill(0xfacc15);
        } else if (isPending) img('select', w.x, w.y, t, 1.7, 0.6);
        else img('move-dot', w.x + 8 * d, w.y + 8 * d, 4 * d);
      }
    }

    // 적 의도 예고: 지금 제출하면 적이 둘 수 (옅은 붉은 흐르는 화살표 + 붉은 순번). 맞을 내 기물은 아래 HP 게이지로 (D-081)
    // 한 번에 한 겹: 내 기물을 고르는 동안은 거의 숨긴다
    const aimSig = m.intent ? JSON.stringify(m.intent.plan) : '';
    const newAim = aimSig !== '' && aimSig !== this.aimSig;
    this.aimSig = aimSig;
    if (m.intent) {
      const faint = m.selectedId !== null ? 0.12 : 0.6;
      m.intent.plan.forEach((st, i) => {
        for (const a of stepArrows(m.intent!.state, st)) this.arrow(a.from, a.to, a.knight, C.crimson, faint);
        const bimg = this.badge(stepBadge(m.intent!.state, m.intent!.state, st), i + 1, faint + 0.25, true);
        if (newAim) this.dropAim(bimg, i);
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
        this.dmgTag(h.pos, h.damage, h.killed);
      }

    full.forEach((mv, i) => this.badge(stepBadge(m.state, m.virtual, mv), i + 1, m.pending !== null && i === full.length - 1 ? 0.55 : 1, !mine));
  }

  /**
   * 피해 예측 꼬리표 (총괄 리뷰 2-2 · D-396): 칸 위 테에 걸친 진홍 꼬리표(12px 굵게) — 기물 얼굴을 가리지 않는다.
   * 칸 오른쪽 위에 두며, 쓰러질 내 기물에는 짙은 붉은 바탕과 기존 X 표식을 쓴다.
   */
  private dmgTag(pos: Pos, damage: number, killed: boolean): void {
    const t = this.tile;
    const d = t / BOARD_DOTS;
    const w = this.world(pos);
    const txt = this.add
      .text(0, 0, killed ? `${damage}` : `-${damage}`, { fontFamily: 'Galmuri11, sans-serif', fontStyle: '700', fontSize: '12px', color: killed ? '#F1EDE4' : '#0B0B0E' })
      .setOrigin(0.5)
      .setResolution(this.dpr);
    const iconSize = killed ? 5 * d : 0;
    const iconGap = killed ? d : 0;
    const bw = Math.ceil((txt.width + iconSize + iconGap + 4 * d) / d) * d;
    const bh = Math.ceil((txt.height + 1 * d) / d) * d;
    const x = Math.round(w.x + t - bw - d);
    const y = Math.round(w.y - bh / 2);
    const g = this.add.graphics();
    g.fillStyle(0x0b0b0e, 1).fillRect(x - d, y - d, bw + 2 * d, bh + 2 * d);
    g.fillStyle(killed ? 0x7a1218 : 0xe5262f, 1).fillRect(x, y, bw, bh);
    g.fillStyle(killed ? 0xc94850 : 0xff6b6b, 1).fillRect(x, y, bw, d);
    txt.setPosition(x + (bw + iconSize + iconGap) / 2, y + bh / 2 + d / 2);
    const icon = killed ? this.add.image(x + 2 * d + iconSize / 2, y + bh / 2, boardKey('kill')).setDisplaySize(iconSize, iconSize).setTintFill(0xf1ede4) : null;
    const c = this.add.container(0, 0, icon ? [g, icon, txt] : [g, txt]).setDepth(7);
    this.dynamic.push(c);
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
  /** 타격 카메라의 지금 목표 줌 */
  private camZoom = 1;

  /**
   * 타격 카메라 (D-115): 공격이 닿은 가장 먼 적까지의 거리로 줌을 정한다.
   * 1칸 = 그쪽으로 당겨 들어감 · 2칸 = 살짝 · 3칸 이상 = 물러나 판 전체를. 동작 줄이기면 안 한다.
   */
  private camPunch(atk: PieceSprite, hits: { targetId: number; splash?: boolean }[]): void {
    if (this.calm) return;
    const t = this.tile;
    const cell = (sp: PieceSprite) => ({ x: Math.round(sp.root.x / t), y: Math.round(sp.root.y / t) });
    const a = cell(atk);
    const targets = hits.filter((h) => !h.splash).map((h) => this.sprites.get(h.targetId)).filter((s): s is PieceSprite => !!s);
    if (!targets.length) return;
    const reach = Math.max(...targets.map((sp) => Math.max(Math.abs(cell(sp).x - a.x), Math.abs(cell(sp).y - a.y))));
    const C = FX_CAMERA;
    const k = reach <= 1 ? C.near : reach === 2 ? C.mid : C.far;
    const cam = this.cameras.main;
    this.camZoom = this.dpr * k;
    cam.zoomTo(this.camZoom, C.inMs / this.speed, 'Cubic.easeOut', true);
    if (k > 1) {
      // 공격자와 맞는 쪽 사이로 끌려 들어간다
      const fx = (atk.root.x + targets.reduce((s, sp) => s + sp.root.x, 0) / targets.length) / 2 + t / 2;
      const fy = (atk.root.y + targets.reduce((s, sp) => s + sp.root.y, 0) / targets.length) / 2 + t / 2;
      cam.pan(this.camCenter.x + (fx - this.camCenter.x) * C.pull, this.camCenter.y + (fy - this.camCenter.y) * C.pull, C.inMs / this.speed, 'Cubic.easeOut', true);
    }
  }

  /** 처치 순간: 한 번 더 툭 당겼다 놓는다 */
  private camKill(): void {
    if (this.calm) return;
    const cam = this.cameras.main;
    // 늘 지금 목표 줌 기준으로 (처치가 여러 번이어도 쌓이지 않게)
    cam.zoomTo(this.camZoom * (1 + FX_CAMERA.killPunch), FX_CAMERA.killPunchMs / this.speed, 'Quad.easeOut', true);
    window.setTimeout(() => cam.zoomTo(this.camZoom, FX_CAMERA.killPunchMs / this.speed, 'Quad.easeIn', true), FX_CAMERA.killPunchMs / this.speed);
  }

  /** 공격이 끝나면 원래 자리로 */
  private camRelease(): void {
    if (this.calm) return;
    const cam = this.cameras.main;
    this.camZoom = this.dpr;
    cam.zoomTo(this.dpr, FX_CAMERA.outMs / this.speed, 'Sine.easeInOut', true);
    cam.pan(this.camCenter.x, this.camCenter.y, FX_CAMERA.outMs / this.speed, 'Sine.easeInOut', true);
  }

  private shake(ms: number, intensity: number): void {
    if (!this.calm) this.cameras.main.shake(ms, intensity);
  }
  /** 흔들림 세 단계 (D-193, 판 밖 shake(1|2|3)와 같은 박자): 약 260ms · 중 360ms · 강 480ms */
  private shakeLv(lv: 1 | 2 | 3): void {
    const [ms, k] = SHAKE_LV[lv];
    this.shake(ms, k);
  }

  /** 연출 속도 배율 (동작 줄이기 = 약 3배 빠르게) */
  private get speed(): number {
    return (this.calm ? 1 / 0.3 : this.slowFx ? 0.25 : PACE.fx) * this.tempo;
  }
  /** 템포 가속 (연쇄가 쌓일수록 연출이 빨라진다 — 레퍼런스 5권 원리 10, D-156). 1 = 기본 */
  tempo = 1;
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
    const mine = ts.piece.side === 0;
    // 내 기물은 붉은 실루엣 (연구소 「내가 맞을 때」), 적은 흰 섬광
    ts.glyph.setTintFill(mine ? 0xff4b4b : 0xffffff);
    this.time.delayedCall(mine ? IMPACT.hurt.flash : 70, () => ts.glyph.clearTint());
    // 타격 불꽃 (D-180): 흰 심 → 금 가시 → 떨어지는 팔 → 불똥 (도트 별)
    {
      const sg = this.add.graphics().setDepth(7.5);
      const spen = new PixelPen(sg, t / BOARD_DOTS);
      const sx = ts.root.x + t / 2;
      const sy = ts.root.y + t * 0.45;
      this.tweens.addCounter({ from: 0, to: 1, duration: (h.killed ? 420 : 320) / this.speed, onUpdate: (tw) => (sg.clear(), drawSpark(spen, sx, sy, t * (h.killed ? 0.6 : 0.45), tw.getValue() ?? 0)), onComplete: () => sg.destroy() });
    }
    const dealt = ts.piece.hp - h.hpAfter;
    const before = ts.piece.hp;
    // 히트스톱 (D-142): 맞은 몫만큼 화면이 잠깐 멈춘다 — 킹 처치는 길게
    if (!this.calm) {
      const S = IMPACT.stop;
      // 연쇄 (D-184): 같은 턴 처치가 이어질수록 정지가 길어진다 · 강타는 두 배
      const chainMul = Math.min(IMPACT.chain.max, 1 + IMPACT.chain.k * this.killStreak);
      const heavyHit = !h.killed && dealt / ts.piece.maxHp >= IMPACT.heavy.heavyAt;
      const stop = h.killed ? (ts.piece.type === 'K' ? S.king : S.kill * chainMul) : Math.min(S.max, S.min + (dealt / ts.piece.maxHp) * (S.max - S.min) * 2) * (heavyHit ? 2 : 1);
      this.tweens.timeScale = 0.05;
      window.setTimeout(() => (this.tweens.timeScale = 1), stop);
    }
    if (h.killed) this.killStreak++;
    // 강타 (D-184): 붉은 컷 한 프레임 · 가장자리 붉은 맥 두 번
    if (!this.calm && !h.killed && dealt / ts.piece.maxHp >= IMPACT.heavy.heavyAt) {
      this.cameras.main.flash(IMPACT.heavy.cut, 170, 20, 30);
      if (mine) window.setTimeout(() => vignette('bad', 0.8), 360);
    }
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
      // 밀치기 (D-184): 감속하며 미끄러져 → 멈추는 순간 가로로 납작 → 출렁 · 양옆 먼지
      const w = this.world(h.pushedTo);
      const P = IMPACT.push;
      void this.tween({ targets: ts.root, x: w.x, y: w.y, duration: P.slide / this.speed, ease: 'Cubic.easeOut' }).then(() => {
        if (!ts.root.active || this.calm) return;
        const dg = this.add.graphics().setDepth(6.4);
        const dpen = new PixelPen(dg, t / BOARD_DOTS);
        this.tweens.addCounter({ from: 0, to: 1, duration: P.wobble / this.speed, onUpdate: (tw) => { if (!ts.root.active) return; const k = tw.getValue() ?? 0; const a = 1 - easeOutElastic(k); this.applyPose(ts, w.x, w.y, { dx: 0, dy: 0, sx: 1 - (1 - P.squash) * a, sy: 1 + (1 - P.squash) * 0.6 * a }); dg.clear(); drawSlamDust(dpen, w.x + t / 2, w.y + t * 0.9, k); }, onComplete: () => dg.destroy() });
      });
    } else if (!h.killed && !this.calm && dealt / ts.piece.maxHp >= IMPACT.heavy.heavyAt) {
      // 강타: 반 칸 밀렸다(내 기물은 아래로, 적은 위로) 출렁 복귀
      const H = IMPACT.heavy;
      const bx = ts.root.x;
      const by = ts.root.y;
      const dir = mine ? 1 : -1;
      this.tweens.addCounter({ from: 0, to: 1, duration: (H.knockMs + H.back) / this.speed, onUpdate: (tw) => { if (!ts.root.active) return; const ms = (tw.getValue() ?? 0) * (H.knockMs + H.back); const out = ms < H.knockMs ? 1 - (1 - ms / H.knockMs) ** 3 : 1 - easeOutElastic((ms - H.knockMs) / H.back); this.applyPose(ts, bx, by + dir * t * H.knock * out, { dx: 0, dy: 0, sx: 1 + 0.12 * out, sy: 1 - 0.12 * out }); } });
    } else if (!h.killed && !this.calm) {
      // 찌그러짐 → 출렁 복귀 (D-180)
      const Q = IMPACT.squash;
      const bx = ts.root.x - (t / 2) * (1 - ts.root.scaleX);
      const by = ts.root.y - t * 0.85 * (1 - ts.root.scaleY);
      this.tweens.addCounter({ from: 0, to: 1, duration: Q.ms / this.speed, onUpdate: (tw) => { if (!ts.root.active) return; const a = 1 - easeOutElastic(tw.getValue() ?? 0); const k = tw.getValue() ?? 0; const tr = mine ? Math.sin(k * 40) * t * IMPACT.hurt.amp * (1 - k) : 0; this.applyPose(ts, bx + tr, by, { dx: 0, dy: 0, sx: 1 + (Q.sx - 1) * a, sy: 1 - (1 - Q.sy) * a }); } });
    }
  }

  /** 보로노이 조각 (D-184): 기물 그림을 씨앗 n개로 나눠 들쭉날쭉한 조각 텍스처로 오린다 (텍스처마다 한 번) */
  private shardCache = new Map<string, { key: string; cx: number; cy: number; size: number }[]>();
  private shardsOf(key: string, n: number): { key: string; cx: number; cy: number; size: number }[] {
    const hit = this.shardCache.get(key);
    if (hit) return hit;
    const src = this.textures.get(key).getSourceImage() as HTMLImageElement;
    const W = src.width;
    const H = src.height;
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const cx0 = cv.getContext('2d')!;
    cx0.drawImage(src, 0, 0);
    const data = cx0.getImageData(0, 0, W, H).data;
    let x0 = W, x1 = 0, y0 = H, y1 = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (data[(y * W + x) * 4 + 3] > 0) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const seeds = Array.from({ length: n }, (_, i) => [x0 + hashN(5 + i * 3) * (x1 - x0), y0 + hashN(5 + i * 7 + 1) * (y1 - y0)]);
    const groups: number[][] = seeds.map(() => []);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        if (data[(y * W + x) * 4 + 3] === 0) continue;
        let best = 0, bd = 1e9;
        seeds.forEach(([a2, b2], i) => { const dd = (a2 - x) ** 2 + (b2 - y) ** 2 * 0.8; if (dd < bd) { bd = dd; best = i; } });
        groups[best].push(y * W + x);
      }
    const out = groups
      .filter((gr) => gr.length > 6)
      .map((gr, gi) => {
        const c = document.createElement('canvas');
        c.width = W;
        c.height = H;
        const cx = c.getContext('2d')!;
        const img = cx.createImageData(W, H);
        let sx = 0, sy = 0;
        for (const idx of gr) { for (let k = 0; k < 4; k++) img.data[idx * 4 + k] = data[idx * 4 + k]; sx += idx % W; sy += Math.floor(idx / W); }
        cx.putImageData(img, 0, 0);
        const tk = `${key}#shard${gi}`;
        if (!this.textures.exists(tk)) this.textures.addCanvas(tk, c);
        return { key: tk, cx: sx / gr.length / W, cy: sy / gr.length / H, size: gr.length };
      });
    this.shardCache.set(key, out);
    return out;
  }

  /**
   * 처치 (D-180 → D-184): 기물 그림이 들쭉날쭉한 보로노이 조각으로 부서져 돌며 날아가고, 불씨가 식으며 흩어지고, 도트 고리가 번진다.
   * slow = 슬로 배율 (킹 마무리), power = 날아가는 힘, hot = 하얗게 달군 조각으로 시작, cool = 은빛 불씨 (내 킹)
   */
  private shatterPiece(s: PieceSprite, slow = 1, power = 1, o: { hot?: boolean; cool?: boolean } = {}): Promise<void> {
    const t = this.tile;
    const key = s.glyph.texture.key;
    const size = t * PIECE_SIZE;
    const gx = s.root.x + t / 2;
    const gy = s.root.y + t * PIECE_Y;
    const frags: { img: Phaser.GameObjects.Image; x: number; y: number; a: number; v: number; r: number }[] = [];
    this.shardsOf(key, IMPACT.shards).forEach((sh, id) => {
      const x = gx - size / 2 + sh.cx * size;
      const y = gy - size / 2 + sh.cy * size;
      const img = this.add.image(x, y, sh.key).setDepth(6.6).setDisplaySize(size, size).setOrigin(sh.cx, sh.cy);
      if (o.hot) img.setTintFill(0xffffff);
      const a = Math.atan2(y - gy - 4, x - gx) + (hashN(31 + id) - 0.5) * 0.8;
      frags.push({ img, x, y, a, v: (t * 0.6 + hashN(31 + id * 3) * t * 1.1) * power * (sh.size < 600 ? 1.3 : 1), r: (hashN(31 + id * 7) - 0.5) * 5 });
    });
    const g = this.add.graphics().setDepth(6.7);
    const pen = new PixelPen(g, t / BOARD_DOTS);
    const total = (IMPACT.shatter.ms * slow) / this.speed;
    const seed = (s.piece.id * 17) % 97;
    return new Promise((done) =>
      this.tweens.addCounter({
        from: 0,
        to: 1,
        duration: total,
        onUpdate: (tw) => {
          const k = tw.getValue() ?? 0;
          const e = 1 - (1 - k) ** 2.2;
          for (const f of frags) {
            f.img.setPosition(f.x + Math.cos(f.a) * f.v * e, f.y + Math.sin(f.a) * f.v * e * 0.8 + t * 1.4 * k * k * power);
            f.img.setRotation(f.r * e).setAlpha(1 - Math.max(0, (k - 0.6) / 0.4));
            if (o.hot && k > 0.22) f.img.clearTint();
          }
          g.clear();
          drawEmbers(pen, gx, gy, k, seed, IMPACT.shatter.embers, power, o.cool ? coolRamp : undefined);
          const rk = Math.min(1, k * (IMPACT.shatter.ms / IMPACT.shatter.ringMs));
          drawRing(pen, gx, gy + t * 0.1, t * 0.15 + t * 1.1 * (1 - (1 - rk) ** 3), o.cool ? 0xcbd5e1 : 0xfacc15, 1 - rk);
        },
        onComplete: () => {
          for (const f of frags) f.img.destroy();
          g.destroy();
          done();
        },
      }),
    );
  }

  /** 같은 턴 처치 수 (연쇄 정지가 길어진다, D-184) */
  private killStreak = 0;

  /** 반장 판이면 킹 마무리에 영화 띠 (D-180) */
  bossFinish = false;

  /**
   * 킹 마무리 (D-180 → D-184, 연구소 18 · 19판): 멈춤 → 총알 시간 — 몸이 점점 빨라지는 점멸로 번쩍이고, 빛 도트가 가슴으로 빨려 들며
   * 심이 커지고, 끝에 하얗게 달아오른다 → 하얀 조각으로 터진다(보로노이) → 왕관이 솟았다 떨어져 두 번 튄다. 반장이면 영화 띠.
   * mine = 내 킹 (같은 문법, 은빛 · 흔들림 2/3 — 덜 아프게)
   */
  private async finisher(s: PieceSprite, mine = false): Promise<void> {
    const t = this.tile;
    const F = IMPACT.finisher;
    const pal = mine ? [0xffffff, 0xcbd5e1, 0x64748b] : [0xffffff, 0xfff3b0, 0xfacc15];
    const bars = (this.bossFinish || mine) && !this.calm ? letterbox(F.bossBars) : null;
    await this.after(F.hold / this.speed);
    const d = t / BOARD_DOTS;
    const g = this.add.graphics().setDepth(6.9);
    const pen = new PixelPen(g, d);
    if (!this.calm) this.cameras.main.zoomTo(this.dpr * (mine ? 1.18 : 1.25), F.charge / this.speed, 'Sine.easeInOut', true);
    if (!this.calm) this.cameras.main.pan(s.root.x + t / 2, s.root.y + t / 2, F.charge / this.speed, 'Sine.easeInOut', true);
    const x0 = s.root.x;
    // 몸 위에 겹친 흰 실루엣 (점멸 · 달아오름)
    const glow = this.add.image(s.glyph.x, s.glyph.y, s.glyph.texture.key).setDisplaySize(s.glyph.displayWidth, s.glyph.displayHeight).setTintFill(pal[0]).setAlpha(0);
    s.root.add(glow);
    const cx = s.root.x + t / 2;
    const cy = s.root.y + t * 0.45;
    await new Promise<void>((done) =>
      this.tweens.addCounter({
        from: 0,
        to: 1,
        duration: F.charge / this.speed,
        onUpdate: (tw) => {
          const k = tw.getValue() ?? 0;
          const on = ((k * k * 7) % 1) < 0.45;
          glow.setAlpha(k > 0.88 ? (k - 0.88) / 0.12 : on ? 0.18 + 0.5 * k : 0);
          g.clear();
          drawCharge(pen, s.root.x + t / 2, cy, t * 0.9, k, s.piece.id * 7 + 3, pal, on);
          if (!this.calm) s.root.x = x0 + (Math.random() - 0.5) * d * (0.4 + (mine ? 1.0 : 1.6) * k);
        },
        onComplete: () => (g.destroy(), (s.root.x = x0), done()),
      }),
    );
    sfx('kill');
    this.shakeLv(mine ? 2 : 3);
    const gx = cx;
    const gy = s.root.y + t * 0.3;
    const floor = s.root.y + t * 0.85;
    const crownG = this.add.graphics().setDepth(6.8);
    const cpen = new PixelPen(crownG, d);
    const crown = new Promise<void>((done) =>
      this.tweens.addCounter({
        from: 0,
        to: 1,
        duration: F.crownMs / this.speed,
        onUpdate: (tw) => {
          const k = tw.getValue() ?? 0;
          crownG.clear();
          if (k < 0.25) drawSpark(cpen, gx, cy, t * 0.7, k / 0.25);
          let x = gx + t * 0.7 * (1 - (1 - Math.min(1, k / 0.72)) ** 3);
          let y: number;
          if (k < 0.72) {
            const q = k / 0.72;
            y = gy + (floor - gy) * q - 4 * t * 1.1 * q * (1 - q);
            for (let i = 1; i <= 5; i++) cpen.px(x - i * d * 0.6, y + i * d * 0.8 * (q < 0.5 ? 1 : -1), 0xf59e0b, 1 - i / 6);
          } else {
            const b = (k - 0.72) / 0.28;
            x = gx + t * 0.7 + t * 0.15 * b;
            y = floor - (b < 0.6 ? t * 0.35 * Math.sin((Math.PI * b) / 0.6) : t * 0.1 * Math.sin((Math.PI * (b - 0.6)) / 0.4));
          }
          drawCrown(cpen, x, y);
        },
        onComplete: () => done(),
      }),
    );
    const s0 = this.shatterPiece(s, F.shatterMs / IMPACT.shatter.ms, 1.3, { hot: true, cool: mine });
    s.root.destroy();
    this.sprites.delete(s.piece.id);
    await Promise.all([s0, crown]);
    this.time.delayedCall(900 / this.speed, () => crownG.destroy());
    this.camRelease();
    bars?.();
  }

  /**
   * 원수 낙하 (D-180): 바닥 그림자가 먼저 커지고 → 위에서 떨어져 → 판이 물결친다 (꺼진 칸 · 들썩이는 둘레) + 먼지.
   */
  async dropIn(pieceId: number): Promise<void> {
    const s = this.sprites.get(pieceId);
    if (!s || this.calm) return;
    const t = this.tile;
    const D = IMPACT.drop;
    const d = t / BOARD_DOTS;
    const by = s.root.y;
    const bx = s.root.x;
    s.root.y = by - t * 3.2;
    const g = this.add.graphics().setDepth(1.9);
    const pen = new PixelPen(g, d);
    await new Promise<void>((done) =>
      this.tweens.addCounter({
        from: 0,
        to: 1,
        duration: D.shadow,
        onUpdate: (tw) => {
          const k = (tw.getValue() ?? 0) ** 3;
          g.clear();
          const rx = t * 0.42 * k;
          const ry = t * 0.12 * k;
          for (let yy = -ry; yy <= ry; yy += d) for (let xx = -rx; xx <= rx; xx += d) if ((xx * xx) / (rx * rx + 1) + (yy * yy) / (ry * ry + 1) <= 1) pen.px(bx + t / 2 + xx, by + t * 0.86 + yy, 0x000000, 0.25 + 0.5 * k);
        },
        onComplete: () => done(),
      }),
    );
    await this.tween({ targets: s.root, y: by, duration: D.fall, ease: 'Quad.easeIn' });
    g.clear();
    this.shakeLv(3);
    sfx('kill');
    const cell = { x: Math.round(bx / t), y: Math.round(by / t) };
    const tiles = this.tilesC.list as Phaser.GameObjects.Image[];
    const bases = tiles.map((im) => im.y);
    await new Promise<void>((done) =>
      this.tweens.addCounter({
        from: 0,
        to: D.ripple,
        duration: D.ripple,
        onUpdate: (tw) => {
          const ms = tw.getValue() ?? 0;
          tiles.forEach((im, i) => {
            const dist = Math.hypot(Math.round(im.x / t) - cell.x, Math.round(bases[i] / t) - cell.y);
            im.y = bases[i] + rippleOffset(dist, ms, t);
          });
          const a = 1 - easeOutElastic(Math.min(1, ms / 600));
          this.applyPose(s, bx, by, { dx: 0, dy: 0, sx: 1 + 0.45 * a, sy: 1 - 0.45 * a });
          g.clear();
          drawSlamDust(pen, bx + t / 2, by + t * 0.9, ms / D.ripple);
        },
        onComplete: () => {
          tiles.forEach((im, i) => (im.y = bases[i]));
          this.applyPose(s, bx, by, REST_POSE);
          g.destroy();
          done();
        },
      }),
    );
  }

  /** 자원 희생 (D-180): 분대원이 웅크렸다 높은 호로 킹 자리에 박히고, 킹은 뒤로 미끄러진다 */
  async swapLeap(crewId: number, kingId: number): Promise<void> {
    const c = this.sprites.get(crewId);
    const k = this.sprites.get(kingId);
    if (!c || !k) return;
    const S = IMPACT.sacrifice;
    const t = this.tile;
    const cx = c.root.x;
    const cy = c.root.y;
    const kx = k.root.x;
    const ky = k.root.y;
    await new Promise<void>((done) => this.tweens.addCounter({ from: 0, to: 1, duration: S.crouch / this.speed, onUpdate: (tw) => { const e = tw.getValue() ?? 0; this.applyPose(c, cx, cy, { dx: 0, dy: 0, sx: 1 + 0.16 * e, sy: 1 - 0.26 * e }); }, onComplete: () => done() }));
    this.tweens.add({ targets: k.root, x: cx, y: cy, duration: (S.leap * 1.4) / this.speed, ease: 'Cubic.easeOut' });
    await new Promise<void>((done) =>
      this.tweens.addCounter({
        from: 0,
        to: 1,
        duration: S.leap / this.speed,
        onUpdate: (tw) => {
          const q = (tw.getValue() ?? 0) ** 2;
          this.applyPose(c, cx + (kx - cx) * q, cy + (ky - cy) * q - Math.sin(Math.PI * q) * t, { dx: 0, dy: 0, sx: 0.9, sy: 1.12 });
        },
        onComplete: () => done(),
      }),
    );
    this.shakeLv(1);
    sfx('land');
    await new Promise<void>((done) => this.tweens.addCounter({ from: 0, to: 1, duration: 330 / this.speed, onUpdate: (tw) => { const a = 1 - easeOutElastic(tw.getValue() ?? 0); this.applyPose(c, kx, ky, { dx: 0, dy: 0, sx: 1 + 0.28 * a, sy: 1 - 0.28 * a }); }, onComplete: () => done() }));
  }

  /**
   * 턴 합계 (D-073, 발라트로식): 내 턴이면 판 가운데에 준 피해가 0부터 세어 올라가며 커졌다가 자리 잡고, 처치 수가 붙는다.
   * 적 턴이거나 작은 턴(처치 없음 · 피해 TURN_SUMMARY.bigDamage 미만)이면 위쪽에 작게.
   */
  async summary(side: Side, damage: number, kills: number): Promise<void> {
    const t = this.tile;
    const { x, y } = this.camCenter;
    const font = (px: number) => ({ fontFamily: 'Galmuri11, sans-serif', fontStyle: '700', fontSize: `${gpx(px)}px`, stroke: '#0B0B0E', strokeThickness: Math.max(4, px / 6) });
    if (side === 1 || (kills === 0 && damage < TURN_SUMMARY.bigDamage)) {
      // 적 턴, 또는 작은 내 턴: 위쪽에 작게 (판을 가리지 않고 기다림도 짧게)
      const text = side === 1 ? `잃음 −${damage}` : `피해 ${damage}`;
      const lost = this.add.text(x, y - t * 2.2, text, { ...font(t * 0.42), color: side === 1 ? '#FF6B6B' : '#7DD3FC' }).setOrigin(0.5).setDepth(10).setResolution(this.dpr);
      // 결과 = 내리꽂힘 → 머묾 → 계단으로 접힘 (D-193)
      lost.setScale(2);
      await this.tween({ targets: lost, scale: 1, duration: 260, ease: 'Back.easeOut' });
      await this.tween({ targets: lost, scaleY: 0, delay: 380, duration: 200, ease: 'Stepped', easeParams: [4] });
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
    await this.tween({ targets: parts, scaleY: 0, duration: 200, ease: 'Stepped', easeParams: [4] });
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
    const s = N * PIECE_SIZE;
    g.drawImage(src, (N - s) / 2, N * PIECE_Y - s / 2, s, s);
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
    const cur: BattleState = { ...this.state };
    // 예약 순서대로 이동 → 공격 (GDD 1장 §1.5), 이어서 다음 턴 시작 이벤트
    this.killStreak = 0;
    // 우리 게임은 무조건 한 명씩 차례대로 (D-217, 사용자 결정 — D-216 5의 겹쳐 움직이기는 되돌림)
    for (const e of events) {
      if (e.type === 'collapse') {
        cur.fallen = [...(cur.fallen ?? []), ...e.tiles.map((p) => p.y * cur.width + p.x)];
        this.announce('바닥이 꺼진다 — 칸 한 쌍이 톱니 아래로');
        this.shakeLv(2);
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
        this.shakeLv(1);
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
      if (e.type === 'move') {
        const s = this.sprites.get(e.pieceId);
        if (!s) continue;
        // 들기 → 지수형 이동 → 착지 출렁임 + 증기 먼지 (D-036)
        const w = this.world(e.to);
        const from = { x: s.root.x, y: s.root.y };
        const jump = s.piece.type === 'N';
        const g = this.add.graphics().setDepth(6.4);
        const pen = new PixelPen(g, t / BOARD_DOTS);
        let landed = false;
        sfx('lift');
        // 흰 그림자 잔상 셋 (D-180): 지나온 길 위, 지금 자리 가까이 몰리고 오래된 것일수록 작고 옅고 길다
        const ghosts = this.calm ? [] : IMPACT.ghosts.map(() => this.add.image(0, 0, pieceKey(s.piece.type, s.piece.side)).setTintFill(0xffffff).setDepth(2.4).setVisible(false));
        const trail: { x: number; y: number }[] = [];
        let landAt = -1;
        await new Promise<void>((done) =>
          this.tweens.addCounter({
            from: 0,
            to: MOVE_TOTAL,
            duration: MOVE_TOTAL / this.speed,
            onUpdate: (tw) => {
              const ms = tw.getValue() ?? 0;
              const m = moveMotion(ms, jump);
              this.applyPose(s, from.x + (w.x - from.x) * m.p, from.y + (w.y - from.y) * m.p, m.pose);
              g.clear();
              // 출발 먼지 · 잔상
              const dk = (ms - MOVE_MS.lift) / 420;
              if (dk > 0) drawTakeoffDust(pen, from.x + t / 2, from.y + t * 0.85, dk);
              if (ms >= MOVE_MS.lift && m.landQ < 0) trail.push({ x: s.root.x, y: s.root.y });
              if (m.landQ >= 0 && landAt < 0) landAt = ms;
              const fade = landAt < 0 ? 1 : Math.max(0, 1 - (ms - landAt) / 200);
              if (trail.length > 1)
                IMPACT.ghosts.forEach((gh, i) => {
                  const p0 = trail[Math.floor(gh.at * (trail.length - 1))];
                  const size = t * PIECE_SIZE * gh.scale;
                  ghosts[i]?.setVisible(fade > 0).setPosition(p0.x + t / 2, p0.y + t * PIECE_Y).setDisplaySize(size * gh.stretch, size / gh.stretch).setAlpha(gh.alpha * fade);
                });
              if (m.landQ >= 0) {
                if (!landed) {
                  sfx('land');
                }
                landed = true;
                drawLandPuff(pen, w.x + t / 2, w.y + t / 2, t, m.landQ);
              }
            },
            onComplete: () => {
              g.destroy();
              for (const gh of ghosts) gh.destroy();
              this.applyPose(s, w.x, w.y, REST_POSE);
              done();
            },
          }),
        );
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
      if (e.type === 'promote') {
        const s = this.sprites.get(e.pieceId);
        if (s) {
          s.glyph.setTexture(this.glyphKey(s.piece.id, e.to, s.piece.side));
          s.piece = { ...s.piece, type: e.to };
        }
        continue;
      }
      if (e.type === 'blast') {
        // 특수 기믹은 일반 공격과 다른 모양으로 먼저 (D-203): 줄 폭격 = 불길이 줄을 훑는다 · 되받아침 = 가시가 친 기물로 · 자폭 = 둘레 3×3 고리 · 증기 폭발 = 적마다 김
        if (e.fx) await this.gimmickFx(e.fx, e.pos, e.from, e.hits.map((h) => h.targetId));
        // 터짐 (D-106 보일러 폰): 그 칸에서 둘레로 — 맞은 기물마다 피격, 쓰러지면 재
        this.shakeLv(e.fx === 'row' || e.fx === 'burst' ? 2 : 1);
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
      if (e.type === 'respawn') {
        // 찍어 내기 · 반장 2단계 (D-249): 그 칸에 쾅 — 먼지 고리 · 불꽃 · 빛
        if (e.pos && this.fxHook) this.fxHook.stamp(e.pos);
        // 양산 라인 (폰 반장 비틀기): 쓰러진 폰이 뒷줄에 다시 선다
        this.announce(e.label ?? '양산 라인 — 폰이 다시 선다');
        await this.wait(200);
        continue;
      }
      if (e.type !== 'attack') continue;
      const atk = this.sprites.get(e.attackerId);
      if (!atk) continue;
      // 적 공격 직전 한 박자 — 누가 칠지 눈이 따라갈 틈 (D-204)
      if (atk.piece.side === 1) await this.wait(PACE.enemyLead);
      const order = this.add
        .text(atk.root.x + t * 0.5, atk.root.y - t * 0.12, `#${e.order + 1}`, { fontFamily: 'Galmuri11, sans-serif', fontStyle: '700', fontSize: `${gpx(t * 0.4)}px`, color: '#C89B3C', stroke: '#16141C', strokeThickness: 4 })
        .setOrigin(0.5)
        .setDepth(7)
        .setResolution(this.dpr);
      // 시너지 배율: 커질수록 크게 (발라트로식 숫자 폭발)
      if (e.mult) {
        const big = Math.min(1.8, 0.8 + (e.mult - 1) * 0.6);
        const m = this.add
          .text(atk.root.x + t / 2, atk.root.y - t * 0.35, `×${e.mult.toFixed(e.mult >= 10 ? 0 : 1)}`, { fontFamily: 'Galmuri11, sans-serif', fontStyle: '700', fontSize: `${gpx(t * 0.34 * big)}px`, color: e.mult >= 2 ? '#FACC15' : '#FDBA74', stroke: '#0B0B0E', strokeThickness: 4 })
          .setOrigin(0.5)
          .setDepth(9)
          .setResolution(this.dpr);
        this.tweens.add({ targets: m, y: m.y - t * 0.4, alpha: 0, scale: 1.3, duration: 900, onComplete: () => m.destroy() });
      }
      // 합(+): 먼저 더해지는 피해를 청록으로, 곱(×) 왼쪽에 (D-205) — 「+12 ×1.5」 순서 = 식의 순서
      if (e.add) {
        const a = this.add
          .text(atk.root.x + t / 2 - (e.mult ? t * 0.55 : 0), atk.root.y - t * 0.35, `+${e.add}`, { fontFamily: 'Galmuri11, sans-serif', fontStyle: '700', fontSize: `${gpx(t * 0.32)}px`, color: '#7FDCEA', stroke: '#0B0B0E', strokeThickness: 4 })
          .setOrigin(0.5)
          .setDepth(9)
          .setResolution(this.dpr);
        this.tweens.add({ targets: a, y: a.y - t * 0.4, alpha: 0, duration: 900, onComplete: () => a.destroy() });
      }

      // 몸짓 → 기물별 공격 이펙트 (기물 중심에서 공격 범위로) → 이펙트가 닿는 순간 피격
      const kinds = [atk.piece.type];
      const tiles = e.area.map((a) => ({ key: `${a.x},${a.y}`, ...this.center(a) }));
      const base = { x: atk.root.x, y: atk.root.y };
      // 세기(피해·처치)가 클수록 뛰어올라 모았다가 터뜨린다 (D-064)
      // 타격 카메라 (D-115): 닿은 거리만큼 당기거나 물러난다
      this.camPunch(atk, e.hits);
      const fx = playAttackFx(this, { kinds, side: atk.piece.side, origin: { x: base.x + t / 2, y: base.y + t / 2 }, tiles, tile: t, power: fxPower(e.hits) }, this.speed, (pose) =>
        this.applyPose(atk, base.x, base.y, pose),
      );
      const hitsDone = e.hits.map((h) => {
        const ts = this.sprites.get(h.targetId);
        if (!ts) return Promise.resolve();
        const key = `${Math.round(ts.root.x / t)},${this.state.height - 1 - Math.round(ts.root.y / t)}`;
        return this.after(fx.impact.get(key) ?? fx.duration * 0.6).then(() => {
          // 큰 피해·처치: 화면 흔들림 + 휴대폰 진동 (D-064)
          const fb = impactFeedback(h.damage, !!h.killed, ts.piece.maxHp);
          if (h.killed) this.camKill();
          // 흔들림은 처치에만, 휴대폰 진동은 킹이 쓰러질 때만 (2026-11-06 — 맞을 때마다 흔들리고 떨려서 정신없었다)
          if (fb && h.killed) {
            this.shakeLv(shakeLvOf(fb.intensity));
            if (!this.calm && ts.piece.type === 'K') (navigator as { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive !== false && navigator.vibrate?.(fb.vibrate);
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
      this.camRelease();
      // 비상 퓨즈 (D-105): 내 기물이 HP 1로 버틴다
      for (const h of e.hits.filter((x) => x.fuse)) {
        const sp = this.sprites.get(h.targetId);
        if (sp) this.floatText(sp, '비상 퓨즈', '#FDE68A');
      }
      // 죽음의 생명 (D-153): 이름 붙은 기물이 HP 1로 버틴다
      for (const h of e.hits.filter((x) => x.door)) {
        const sp = this.sprites.get(h.targetId);
        if (sp) this.floatText(sp, '생명!', '#FCA5A5');
      }
      const checked = e.hits.find((h) => h.checked);
      if (checked) sfx('check');
      if (checked) this.announce(`체크! ${this.sprites.get(checked.targetId)?.piece.side === 0 ? '내' : '적'} 킹이 HP 1로 버틴다 — 한 대면 끝`);

      // 처치: 위에서부터 한 줄씩 검은 재가 되어 기물 발밑에 쌓였다 꺼진다 (D-048·D-050·D-052)
      const deaths = e.hits.filter((h) => h.killed).map((h) => this.sprites.get(h.targetId)).filter((s): s is PieceSprite => !!s);
      if (deaths.length) {
        sfx('kill');
        // 킹 마무리 (D-180 → D-184): 적 킹은 금빛, 내 킹은 은빛으로 같은 문법 — 응축 → 폭발 → 왕관
        const king = deaths.find((s) => s.piece.type === 'K');
        const rest = deaths.filter((s) => s !== king);
        const ashes = rest.map((s) => this.shatterPiece(s));
        for (const s of rest) {
          s.root.destroy();
          this.sprites.delete(s.piece.id);
        }
        if (king) await this.finisher(king, king.piece.side === 0);
        await Promise.race([Promise.all(ashes), this.after(420)]);
      }
      order.destroy();
      // 공격과 공격 사이 숨 (D-204)
      await this.wait(PACE.hitGap / this.tempo);
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
      // 터치에서는 p.event가 TouchEvent라 clientX가 없다 → 캔버스 좌표를 화면 좌표로 바꿔 넘긴다 (D-245)
      const cr = this.game.canvas.getBoundingClientRect();
      const cx = cr.left + (p.x / this.scale.width) * cr.width;
      const cy = cr.top + (p.y / this.scale.height) * cr.height;
      window.clearTimeout(pressTimer);
      if (pos) {
        pressTimer = window.setTimeout(() => {
          pressed = true;
          this.input2.longPress(pos, cx, cy);
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
  private boardFx: BoardFx;
  private game: Phaser.Game;
  private whenReady: Promise<void>;

  constructor(private host: HTMLElement, input: BoardInput, announce: (text: string) => void = () => {}) {
    // 그리는 해상도 상한 (D-240): 폰 배율 2.6~3 그대로 그리면 판 하나가 프레임을 다 먹었다 (CPU 4배 느린 측정에서 19fps → 2배 상한으로 32fps, 아래 프레임 상한과 함께)
    const dpr = Math.min(window.devicePixelRatio || 1, RENDER.dprCap);
    this.scene = new BoardScene();
    this.boardFx = new BoardFx(host, (p) => this.screenOf(p));
    this.scene.fxHook = this.boardFx;
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
      fps: { limit: RENDER.idleFps },
      // 줄여 그린 캔버스를 화면 크기로 늘릴 때 도트가 번지지 않게
      pixelArt: true,
    });
    this.game.canvas.style.imageRendering = 'pixelated';
    window.addEventListener('resize', () => this.resize());
    // 판이 안 보이는 화면(지도 · 고물상 · 보상 · 사건)에서는 판 그리기를 멈춘다 (D-240)
    new MutationObserver(() => this.sleepIfHidden()).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  private hot = 0;
  /** 연출 중에는 60fps, 가만히 있을 때는 RENDER.idleFps (D-240 — 깜빡임 · 도는 과녁은 계단 박자라 30이면 충분) */
  private heat<T>(job: Promise<T>): Promise<T> {
    this.hot += 1;
    this.fpsLimit(0);
    return job.finally(() => {
      this.hot = Math.max(0, this.hot - 1);
      if (!this.hot) this.fpsLimit(RENDER.idleFps);
    });
  }
  private fpsLimit(n: number): void {
    const loop = this.game?.loop as unknown as { fpsLimit: number; hasFpsLimit: boolean; _limitRate: number } | undefined;
    if (!loop) return;
    loop.fpsLimit = n;
    loop.hasFpsLimit = n > 0;
    loop._limitRate = n > 0 ? 1000 / n : 0;
  }
  private sleepIfHidden(): void {
    const loop = this.game?.loop;
    if (!loop) return;
    // 타이틀 · 컷신이 화면을 덮은 동안에도 멈춘다 (테스터: 타이틀 뒤에서 판이 돌아 로고 연출이 버벅였다)
    const cl = document.body.classList;
    const hidden = cl.contains('between') || cl.contains('cover-op') || cl.contains('cover-pl');
    if (hidden && loop.running) loop.sleep();
    else if (!hidden && !loop.running) loop.wake();
  }

  private size() {
    return { w: Math.max(1, this.host.clientWidth), h: Math.max(1, this.host.clientHeight) };
  }

  private resize(): void {
    const { w, h } = this.size();
    const dpr = this.scene.dpr;
    this.game.scale.resize(w * dpr, h * dpr);
  }

  /** 적 특성 표식 (자폭 폰 · 되받아침 반장, D-175) — setup 전에 */
  setFoeTraits(list: ('blast' | 'thorns')[]): void {
    this.scene.setFoeTraits(list);
  }
  /** 원수 표식 (D-178) — setup 전에 */
  setNemesis(id: number | null): void {
    this.scene.nemesisId = id;
  }
  /** 경직된 적 표시 (헛방) — setup 전에 */
  setStaggered(ids: number[], shocked: number[] = []): void {
    this.scene.staggeredIds = ids;
    this.scene.shockedIds = shocked;
  }
  /** 새 반장 표식 (D-274): 불량 도장 찍힌 기물 · 자석에 끌려갈 기물 — setup 전에 */
  setBossMarks(stampId: number | null, pullId: number | null): void {
    this.scene.stampId = stampId;
    this.scene.pullId = pullId;
  }
  /** 적 계급 색 (검문 = 검붉은 쇠, 반장 = 보라) — setup 전에 */
  setFoeTone(t: '' | 'elite' | 'boss', bossRule = ''): void {
    this.scene.foeTone = t === 'boss' && bossRule ? `boss-${bossRule}` : t;
    this.scene.bossRule = t === 'boss' ? bossRule : '';
  }
  /** 막별 판 색 (1~3) — setup 전에 */
  setAct(act: number): void {
    this.scene.act = act;
  }
  /** 직전 적 수 표시 (출발 · 도착 칸) — 바꾸면 판을 다시 그린다 */
  lastMovesSet(cells: Pos[]): void {
    this.scene.lastMoves = cells;
  }
  /** 직전 수 지우기 (내 턴 끝 · 새 대국) — 다음 setup/drawTiles에 반영 */
  lastMovesClear(): void {
    this.scene.lastMoves = [];
  }
  /** 깨진 심장 톱니 표식 (D-219) — setup 전에 */
  setCracked(ids: number[]): void {
    this.scene.crackedIds = ids;
  }
  /** 같은 턴 처치 수 (연쇄 정지가 길어진다, D-184) */
  /** 반장 판이면 킹 마무리에 영화 띠 (D-180) */
  setBossFinish(on: boolean): void {
    this.scene.bossFinish = on;
  }
  /** 판 세우기 (D-189) */
  async boardIntro(): Promise<void> {
    await this.whenReady;
    await this.heat(this.scene.boardIntro());
  }
  /** 원수 낙하 (D-180) */
  async dropIn(pieceId: number): Promise<void> {
    await this.whenReady;
    await this.heat(this.scene.dropIn(pieceId));
  }
  /** 자원 희생 도약 (D-180) */
  async swapLeap(crewId: number, kingId: number): Promise<void> {
    await this.whenReady;
    await this.heat(this.scene.swapLeap(crewId, kingId));
  }
  setup(state: BattleState): void {
    void this.whenReady.then(() => {
      this.scene.setupBoard(state);
      // 판 위 도트 FX 층 (D-249): 반장 판이면 공기 FX, 기믹 순간 연출은 언제나
      this.boardFx.boardSize = { w: state.width, h: state.height };
      requestAnimationFrame(() => this.boardFx.setup(this.scene.bossRule));
    });
  }
  /** 디버그: 판 위 기믹 연출을 바로 터뜨린다 */
  debugFx(k: 'row' | 'thorns' | 'stamp'): void {
    if (k === 'row') void this.boardFx.rowBomb(2, this.scene.state.width);
    else if (k === 'thorns') void this.boardFx.thorns({ x: 3, y: 5 }, { x: 1, y: 1 });
    else this.boardFx.stamp({ x: 3, y: 3 });
  }
  /** 판 칸 하나의 화면 가운데 (CSS px) — 판 밖 DOM 연출(초월 등)이 그 칸을 겨눈다 */
  screenOf(pos: Pos): { x: number; y: number } {
    const sc = this.scene;
    const cam = sc.cameras.main;
    const t = sc.tile;
    const wx = pos.x * t + t / 2;
    const wy = (sc.state.height - 1 - pos.y) * t + t / 2;
    const cv = this.game.canvas;
    const r = cv.getBoundingClientRect();
    const k = r.width / cv.width;
    return { x: r.left + (wx - cam.worldView.x) * cam.zoom * k, y: r.top + (wy - cam.worldView.y) * cam.zoom * k };
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
    await this.heat(this.scene.play(before, events));
  }

  async showPlan(state: BattleState, plan: Plan): Promise<void> {
    await this.whenReady;
    await this.scene.showPlan(state, plan);
  }

  /** 템포 가속: 연쇄가 쌓일수록 연출이 빨라진다 (D-156) */
  setTempo(t: number): void {
    this.scene.tempo = t;
  }

  async summary(side: Side, damage: number, kills: number): Promise<void> {
    await this.whenReady;
    await this.heat(this.scene.summary(side, damage, kills));
  }

  flashLog(entry: LogEntry): void {
    void this.whenReady.then(() => this.scene.flashLog(entry));
  }
}
