import { calmMotion, reduceFlash } from '../prefs/motion';
import { vignette } from '../ui/juice';
import { cbAid, shakeMul } from '../prefs/fx';
import { BEAT, PACE } from '../data/motion';
import { CARVES } from '../data/carves';
import { FORMS, FORM_IDS } from '../data/forms';
import { BOSS_ART_RULES, BOSS_BODY, bossArtFile, GIANT_ART_SPAN, RAID_TEXT } from '../data/giants';
import { PRELOAD } from '../data/preload-list';
import { sfx, sfxFor } from '../audio/sfx';
import Phaser from 'phaser';
import type { BoardModel, BoardView, LogEntry } from '../game/controller';
import { CRUMBLE_MS, MOVE_TOTAL, drawCrumble, drawLandPuff, moveMotion, fxPower, impactFeedback, playAttackFx, type CrumbleCell, type Pose } from './attackFx';
import { drawArrow, drawDropDot, drawGauge, drawHatch, gaugeSweep } from './marks';
import { BOARD_DOTS, FLOW_STEP_MS, PixelPen } from './pixel';
import { displayPreset } from '../data/display';
import { POPUP_MS, buildPopupArt, drawPopup } from './popup';
import { BoardFx } from './boardfx';
import { IMPACT, MOVE_MS, RENDER, TURN_SUMMARY } from '../data/fx';
import { coolRamp, drawCharge, drawCrown, drawEmbers, drawRing, drawSlamDust, drawSpark, drawTakeoffDust, rippleOffset } from './impact';
import { TARGET_TICK, drawGearTarget } from './target';
import { boardInset } from './boardInset';
import { hostCenter, sceneLive } from './lazyBoard';

const REST_POSE: Pose = { dx: 0, dy: 0, sx: 1, sy: 1 };
import { findPiece, isFallen, upcomingCollapse, type BattleEvent, type BattleState, type Piece, type PieceType, type FormId, type Side, type Plan, type PlanStep, type Pos } from '../engine';

/** 판 위 글씨 크기 (D-213): 갈무리11 굵게의 격자(12px) 배수로만 — 크기마다 다른 서체처럼 보이지 않게 */
const gpx = (px: number): number => Math.max(12, Math.round(px / 12) * 12);



/** 기물 텍스처 키 */
const pieceKey = (type: PieceType, side: Side) => `px-${type}-${side}`;
/**
 * 발주 이형 · 거대 주물 그림 (2026-11-14 P-01~05 · G-01~03, tools/pixel/piece_import.py → maker.py export).
 * 이형 = `pieces/s-<이형><진영>.png`(72칸 캔버스), 거대 = `pieces/s-giant<유형>1.png`(D-527 재발주본 · D-528: 122칸 캔버스 = 보통 기물 72칸 × 1.7 —
 * 판에서 GIANT_ART_SPAN(122/72)칸 폭 · 2×2 가로 가운데 · 받침 바닥은 기준선, 그림 한가운데가 네 부위 경계).
 */
const formKey = (form: FormId, side: Side) => `px-${form}-${side}`;
const giantKey = (type: PieceType) => `px-giant${type}-1`;
const GIANT_ART: PieceType[] = ['P', 'R', 'Q'];
/**
 * 2×2 특별 보스 그림 (D-513 · 발주 GB-01~07 · b): `pieces64.txt` `[K:boss-<반장> 1]` · `[K:boss-<반장>-p2 1]` → maker.py export →
 * `pieces/s-boss-<반장>1.png` · `s-boss-<반장>-p2-1.png` (144칸 캔버스). 받은 파일만 부른다(preload 목록에 있는 것) — 없으면 반장 킹 그림을 2×2로 빌린다.
 */
const bossArtKey = (rule: string, rage: boolean) => `px-boss-${rule}${rage ? '-p2' : ''}-1`;

/** 판 커서 (D-533): 키보드 초점 테와 같은 금(--t-gold) · 계단 박자 */
const CURSOR_GOLD = 0xf4d27a;
const CURSOR_BEAT_MS = 480;

/**
 * 위협 칸 깜빡임 (D-045 · D-533 보탬): 붉은 칸 투명도를 계단 네 단으로만 바꾼다 (D-216 — 투명도 보간 금지).
 * 한 장 136ms × 12장 = 1.63초 한 바퀴 (옛 사인 주기 2π·260ms와 같다) — 사인을 12장으로 찍어 4단으로 반올림한 순서.
 * 단이 바뀌는 장에서만 판을 다시 그린다 (D-533). 움직임 줄이기면 가운데 단에 멈춘다.
 */
const THREAT_STEP_MS = 136;
const THREAT_SEQ = [2, 2, 3, 3, 3, 2, 2, 1, 0, 0, 0, 1] as const;
const THREAT_ALPHA = [0.14, 0.19, 0.25, 0.3] as const;
const THREAT_CALM_ALPHA = 0.22;
/** 지금 위협 칸 단 (-1 = 움직임 줄이기 · 멈춤) */
const threatLevel = (time: number, calm: boolean): number => (calm ? -1 : THREAT_SEQ[Math.floor(time / THREAT_STEP_MS) % THREAT_SEQ.length]);

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

/** QA 박자 기록 (D-538): 창에 `__fxlog` 배열이 있을 때만 [이름, ms] — 녹화 도구가 공격 · 처치 길이를 잰다 */
const fxTrace = (k: string, ms: number, note = ''): void => void (window as { __fxlog?: unknown[] }).__fxlog?.push([k, Math.round(ms), note]);
/** QA 전투 박자 기록 (D-620): 창에 `__pace` 배열이 있을 때만 [벽시계 ms, 사건, 진영, 기물] — tools/qa/battle-pace.cjs가 수 하나 · 적 수 하나의 길이를 잰다 */
const paceTrace = (k: string, side = -1, id = -1): void => void (window as { __pace?: unknown[] }).__pace?.push([Math.round(performance.now()), k, side, id]);

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
/** 정수배 기물 크기를 쓰는 하한 — 예전 크기의 이 비율 이상일 때만 (D-538) */
const PIECE_SNAP_MIN = 0.85;
/**
 * 기물 바닥 기준선 (D-525): 체력바 윗줄 = 칸 위에서 16도트. 모든 기물 그림(보통 72칸 · 2×2 반장 · 거대 주물 144칸)은
 * 그림의 바닥(흰 테 바깥 끝 — 그림마다 아래 투명 줄을 잰다)을 이 줄에 맞대고, 체력바(4도트)가 바로 아래에 붙는다.
 * 예전에는 그림 아래 끝을 칸의 84%(16.8도트)에 두어 흰 테 위쪽 0.2도트가 바 윗줄 위로 삐져나와 「흰 줄」로 보였다.
 */
const GAUGE_ROW = 16;
/**
 * 거대 주물 부위 바 (D-532): 2×2 아래 기준선 밑 한 줄(2×2 반장 게이지와 같은 3~36도트 폭)을 반으로 — 왼쪽 반 = 왼쪽 부위 둘 · 오른쪽 반 = 오른쪽 부위 둘,
 * 반마다 바깥 칸 = 위 부위 · 안쪽 칸 = 아래 부위(가운데 겹 먹 줄이 왼 · 오 경계). 칸 하나 = 채움 7도트. 길게 누르기 정보의 부위 표와 같은 순서.
 */
const GIANT_SLOT_N = 7;
const GIANT_SLOTS: [0 | 1, 0 | 1][] = [[0, 1], [0, 0], [1, 0], [1, 1]];
/** 부위 칸의 왼쪽 먹 테 열 (2×2 왼끝 기준 도트) */
const giantSlotX = (dx: 0 | 1, dy: 0 | 1): number => (dx === 0 ? (dy === 1 ? 3 : 11) : dy === 0 ? 20 : 28);
/** 기물 게이지 자리 (그 기물 칸 왼위 기준 도트) · 채움 칸 수 — 보통 14×4 · 2×2 반장 한 줄 · 거대 주물 부위 칸 */
const gaugeSpot = (p: Piece): { x: number; y: number; n: number } => {
  if (p.giant?.boss) return { x: 3, y: GAUGE_ROW, n: 2 * BOARD_DOTS - 8 };
  if (p.giant) return { x: (p.giant.dx === 0 ? 0 : -BOARD_DOTS) + giantSlotX(p.giant.dx, p.giant.dy), y: (p.giant.dy === 1 ? BOARD_DOTS : 0) + GAUGE_ROW, n: GIANT_SLOT_N };
  return { x: 3, y: GAUGE_ROW, n: 12 };
};
/** 거대 주물 바 먹 테 (반 둘, 바깥 모서리는 보통 게이지처럼 깎는다) — (x, y) = 2×2 왼끝 · 바 윗줄 */
const drawGiantFrame = (pen: PixelPen, x: number, y: number): void => {
  const d = pen.dot;
  const px = (i: number, j: number) => pen.px(x + i * d + d / 2, y + j * d + d / 2, 0x0b0b0e, 1, 1);
  for (const a of [3, 20]) {
    for (let i = a + 1; i < a + 16; i++) { px(i, 0); px(i, 3); }
    for (const c of [a, a + 8, a + 16]) { px(c, 1); px(c, 2); }
  }
};
/** 판 열 위 · 아래 자리 (boardInset.ts — Phaser 없이 본편 HUD가 먼저 정할 수 있게 따로 둔다) */
export { setBoardTopInset } from './boardInset';
/**
 * 판을 그리는 배율 (D-240 상한 → D-525 정수 늘림): 캔버스 한 픽셀이 기기 픽셀 정수 개로 늘어나야 도트 · 바 · 테 줄이 고르다.
 * 기기 배율이 상한(RENDER.dprCap)을 넘으면 기기 배율을 정수로 나눈 값 중 상한 이하 · 하한(RENDER.dprMin) 이상을 쓰고,
 * 그런 값이 없으면(2.625 같은 소수 배율) 기기 배율 그대로 그린다 — 예전에는 2로 그려 1.3125배로 늘리느라 줄이 한 픽셀씩 들쭉날쭉했다.
 */
const renderScale = (dpr: number): number => {
  // 측정 손잡이 (D-595, 개발 빌드만): ?boardscale=<나눌 정수> — 판 채우기 비용 비교용(2 = 기기 배율 절반 · ×2 정수 늘림). 출시 빌드에는 없다
  if (import.meta.env.MODE !== 'release' && typeof location !== 'undefined') {
    const m = Number(new URLSearchParams(location.search).get('boardscale'));
    if (m >= 1 && m <= 4) return dpr / Math.round(m);
  }
  if (dpr <= RENDER.dprCap) return dpr;
  for (let m = 2; dpr / m >= RENDER.dprMin; m++) if (dpr / m <= RENDER.dprCap) return dpr / m;
  return dpr;
};
const tileSize = (dpr: number, cols: number, rows: number, viewW: number, viewH: number): number => {
  // D-429: 네 대표 규격으로 크기를 정한다. PC/태블릿을 폰의 54px 상한으로 제한하지 않는다.
  const want = displayPreset(window.innerWidth, window.innerHeight).tile;
  // 판 전체가 한 화면에 들어오게 (D-074): 위 여백 0.65칸(배지) + 아래 0.25칸, 양옆 0.25칸
  // 판 배치 시안 C (D-198): 위아래 여백을 줄여 판을 키운다
  const vPad = document.body.matches('.lay-f') ? 0.45 : 0.9;
  // 양옆 여백: 본편은 판 옆이 레일(안쪽 여백이 있다)이라 0칸 (667 폭에서도 칸 50 — 터치 48 하한, D-396)
  const hPad = document.body.matches('.lay-f') ? 0 : 0.5;
  const fit = Math.min(want, (viewH - boardInset.top - boardInset.bottom) / (rows + vPad), viewW / (cols + hPad));
  // 한 도트 = 기기 픽셀 정수 (내림 — 넘치지 않게). 예전 하한 5도트는 DPR 2 아래 기기 · PC에서 판을 화면 밖으로 밀었다
  const dots = Math.max(1, Math.floor((fit * dpr) / BOARD_DOTS));
  return (dots * BOARD_DOTS) / dpr;
};
/** PC(마우스 · 호버) 본편 배치인가 — 웹 PC(CSS 정수 확대)와 일렉트론(배율 확대) 모두 */
const pcBoard = (): boolean => document.body.matches('.lay-f') && !!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;
/** PC 판 위아래 여유 (칸) — 위 · 아래 각 0.05칸 (D-563) */
const PC_VPAD = 0.1;
/**
 * PC 정수 기물 칸 (D-563): 칸 = 그림 픽셀 80j(= 20도트 × 4j)일 때 기물 72칸 그림이 정확히 j배(72j, 칸의 90%)가 된다.
 * PC는 판 위아래 여유를 칸 0.1로 줄여 이런 칸 중 가장 큰 것을 찾는다 — 1920×1080에서 6줄 판이 기기 120 → 160px(기물 ×2)로 한 단 커진다.
 * 들어가는 j가 없으면 0. 호출하는 쪽은 보통 칸(tileSize)과 큰 쪽을 쓴다 — 넓은 판이 예전보다 작아지지 않는다.
 */
const pcIntTile = (dpr: number, cols: number, rows: number, viewW: number, viewH: number): number => {
  if (!pcBoard()) return 0;
  const fit = Math.min((viewH - boardInset.top - boardInset.bottom) / (rows + PC_VPAD), viewW / cols);
  const j = Math.floor((fit * dpr) / (BOARD_DOTS * 4));
  return j >= 1 ? (j * BOARD_DOTS * 4) / dpr : 0;
};

/** 판 그림 (tools/draw-board.py · FX 랩에서 고른 것) — public/ui/board/ */
/**
 * 공정 판 칸 그림 (PB-01 D-521 · 판 색 맞춤 D-522, tools/pixel/proc_tiles_import.py): 판 색마다 한 장(proc-sheet<판>.png),
 * 20도트 칸 14열 × 2줄(위 밝은 칸 · 아래 어두운 칸). 열 순서 = 이 목록 = 도구의 G['tiles'] 순서
 */
const PROC_TILES = ['conveyor0', 'conveyor1', 'conveyor2', 'conveyor3', 'press-warn', 'press-hit', 'press-dent', 'magnet-rail', 'magnet-post', 'furnace', 'furnace-hot', 'crack1', 'crack2', 'crack3'];
/** 판 칸 접미사(drawTiles와 같다) — 공정 칸 장 이름도 같은 접미사: '' 기본 · -a1~3 막 · -b<반장 규칙> */
const PROC_SHEETS = ['', '-a1', '-a2', '-a3', '-bplate', '-bspawn', '-bthorns', '-bgilded', '-binspect', '-bmagnet', '-balarm'];
const procSheetKey = (suf: string) => `ui-proc-sheet${suf}`;
/** 공정 칸 이름(proc-<이름>) · 밝기 → 장 안 프레임 번호 */
const procFrame = (name: string, dark: boolean) => PROC_TILES.indexOf(name.replace(/^proc-/, '')) + (dark ? PROC_TILES.length : 0);
/** 컨베이어 흐름 한 프레임 (ms) — 4프레임 계단 애니(D-216: 선형 이동 대신 steps) */
const CONVEYOR_FRAME_MS = 180;
const BOARD_IMAGES = ['tile-light', 'tile-dark', 'tile-light-a1', 'tile-dark-a1', 'tile-light-a2', 'tile-dark-a2', 'tile-light-a3', 'tile-dark-a3', 'tile-light-bplate', 'tile-dark-bplate', 'tile-light-bspawn', 'tile-dark-bspawn', 'tile-light-bthorns', 'tile-dark-bthorns', 'tile-light-bgilded', 'tile-dark-bgilded', 'tile-light-binspect', 'tile-dark-binspect', 'tile-light-bmagnet', 'tile-dark-bmagnet', 'tile-light-balarm', 'tile-dark-balarm', 'last-move', 'chip-flame', 'chip-claw', 'chip-crown', 'chip-skull', 'chip-stun', 'chip-shock', 'chip-stamp', 'chip-magnet', 'chip-weak', 'crack', 'fallen', 'range', 'range-enemy', 'select', 'cond', 'move-dot', 'target-enemy', 'kill', 'check', 'stronghold', 'stronghold-ally', 'stronghold-enemy', 'stronghold-flag', 'stronghold-ally-flag', 'stronghold-enemy-flag', 'variant-conveyor', 'variant-hammer', 'variant-mirror', 'variant-radiator', 'variant-boiler', 'variant-spring', 'variant-scope', 'variant-turret', 'variant-command', ...[1, 2, 3, 4, 5, 6, 7, 8, 9].flatMap((n) => [`badge-a${n}`, `badge-e${n}`])];
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
  /** 마지막으로 그린 게이지 [지금, 잃은 뒤] — 거대 주물 형제 부위가 부서지면 이 값으로 다시 그린다 (D-532) */
  hpDrawn?: [number, number];
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
  /** PC 정수 기물 칸으로 판을 키웠다 — 카메라 여유를 줄인다 (D-563) */
  private tightPad = false;
  dpr = 1;
  /** 판 밖을 투명하게 (D-640 — 본편 전투 바탕) */
  clearBg = false;
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
  /** 판에 서 있는 거대 주물 부위 칸 (`거대id:dx dy`, D-532) — 부서진 칸은 바에서 빈 칸으로 */
  private giantLive = new Set<string>();
  ready!: () => void;
  announce: (text: string) => void = () => {};

  constructor() {
    super('board');
  }

  /** 사용자 제공 도트 기물 12종 (public/pieces/s-{유형}{진영}.png) */
  /** 적 특성 표식 (자폭 폰 · 가시 반격 반장) — 대국마다 setFoeTraits로 */
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
  /** 조건이 켜진 내 기물 (D-592) — 발치 램프 · render가 모델에서 받는다 */
  condIds: number[] = [];
  /** 지난 그리기의 조건 표시 (D-592) — 새로 켜진 것만 계단 팝, 꺼진 것은 2단 디더 퇴장 */
  private condSeen = new Map<string, { x: number; y: number; size: number; key: string }[]>();
  private condNow = new Map<string, { x: number; y: number; size: number; key: string }[]>();
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
    for (const f of FORM_IDS) for (const side of [0, 1] as Side[]) this.load.image(formKey(f, side), `pieces/s-${f}${side}.png`);
    for (const type of GIANT_ART) this.load.image(giantKey(type), `pieces/s-giant${type}1.png`);
    for (const r of BOSS_ART_RULES) for (const rage of [false, true]) if (PRELOAD.includes(bossArtFile(r, rage))) this.load.image(bossArtKey(r, rage), bossArtFile(r, rage));
    for (const n of BOARD_IMAGES) this.load.image(boardKey(n), `ui/board/${n}.png`);
    for (const suf of PROC_SHEETS) this.load.spritesheet(procSheetKey(suf), `ui/board/proc-sheet${suf}.png`, { frameWidth: 20, frameHeight: 20 });
    this.load.image(boardKey('skull'), 'ui/hud/skull-small.png');
    // 조건 램프 (D-592): 부품 상태 표지 ready.png를 그대로 빌린다 — 새 그림 없음
    this.load.image(boardKey('lamp'), 'ui/part-state/ready.png');
    if (!this.textures.exists('icon-shield16')) this.load.image('icon-shield16', 'ui/icons16/intent-shield.png');
    for (const name of ['reticle', 'star', 'crown', 'flame', 'claw', 'skull']) if (!this.textures.exists(`icon-${name}`)) this.load.image(`icon-${name}`, `ui/icons/${name}.png`);
  }

  /**
   * 색 바꾼 그림 키 — 없으면 지금 만든다 (D-593: 처음 쓸 때 한 장씩). 바탕 그림이 없으면 바탕 키 그대로.
   * 깨진 심장 톱니 기물 (D-219): 내 기물 그림에서 검은 외곽선 · 바깥 흰 테는 두고 속 칠 색만 팔레트로 한 단계씩 어둡게.
   * 정예 · 반장 색도 같은 방식 — 색을 1:1로 바꿀 뿐이라 도트가 그대로 남는다 (그라데이션 · 반투명 없음). 명도 차이라 색약에도 보인다.
   */
  private toned(base: string, suffix: string, tone: Record<number, number>): string {
    this.makeToneFrom(base, suffix, tone);
    const key = `${base}-${suffix}`;
    return this.textures.exists(key) ? key : base;
  }
  /** 텍스처 `base`의 색을 표에 따라 1:1로 바꾼 새 그림 `<base>-<suffix>` (이형 · 거대 그림도 같은 규칙) */
  private makeToneFrom(base: string, suffix: string, tone: Record<number, number>): void {
    const CRACK_TONE = tone;
    const key = `${base}-${suffix}`;
    if (this.textures.exists(key) || !this.textures.exists(base)) return;
    const src = this.textures.get(base).getSourceImage() as HTMLImageElement;
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
  /** 그림 아래 투명 줄 비율 (D-525) — 받침 바닥(흰 테 바깥 끝)을 기준선에 맞대려고 그림마다 한 번 잰다 */
  private footPads = new Map<string, number>();
  private footPad(key: string): number {
    const hit = this.footPads.get(key);
    if (hit !== undefined) return hit;
    let pad = 0;
    const src = this.textures.get(key).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
    const w = src.width, h = src.height;
    const ctx = w && h ? Object.assign(document.createElement('canvas'), { width: w, height: h }).getContext('2d', { willReadFrequently: true }) : null;
    if (ctx) {
      ctx.drawImage(src, 0, 0);
      const a = ctx.getImageData(0, 0, w, h).data;
      let y = h - 1;
      const filled = (row: number) => { for (let x = 0; x < w; x++) if (a[(row * w + x) * 4 + 3] > 0) return true; return false; };
      while (y > 0 && !filled(y)) y--;
      pad = (h - 1 - y) / h;
    }
    this.footPads.set(key, pad);
    return pad;
  }
  /**
   * 기물 그림 자리 (D-525): 한 변 = 칸 span개 × PIECE_SIZE, 크기 · 위치를 캔버스 픽셀 정수로 맞추고
   * 그림의 받침 바닥을 체력바 윗줄(칸 위에서 GAUGE_ROW도트)에 맞댄다(틈 없이 — 1픽셀 못 되게 바 밑으로 들어가는 쪽으로 올림).
   * 반환: 한 변 · 그림 가운데 y (아래 칸 왼위 기준, 월드 단위)
   */
  private pieceBox(key: string, span = 1): { size: number; cy: number } {
    const r = this.dpr;
    const tc = Math.round(this.tile * r); // 칸 = 20 × 도트(정수 캔버스 픽셀)
    // D-538 도트 밀도 (리드 결정 2026-11-17): 그림 도트 수(텍스처 2텍셀 = 1도트 — 72 · 거대 122 · 2×2 반장 144)의 정수배 중
    // 예전 크기(칸 × PIECE_SIZE × span, 짝수)에 드는 가장 큰 것이 예전 크기의 85% 이상이면 그것(1도트 = 캔버스 정수 픽셀),
    // 아니면 예전 크기 그대로(최근접) — 사용자가 맞춘 기물 · 거대 · 반장 크기를 줄이지 않는다.
    // 915×412 · DPR 2.625(칸 120)는 정수배 72가 예전 110의 65%라 예전 그대로, 칸 80(DPR 1 · 2)은 72가 74의 97%라 정수배.
    const prev = 2 * Math.round((PIECE_SIZE * tc) / 2); // 짝수 — 칸 가운데에 서도 왼 끝이 정수
    const snapped = Math.floor(prev / 72 + 1e-6) * 72;
    const one = snapped >= PIECE_SNAP_MIN * prev ? snapped : prev;
    // D-562 외곽 굵기 통일: 2×2 반장(144칸 · span 2) · 거대 주물(122칸 · span 122/72)은 보통 기물 크기(one)에 span을 곱한 짝수 —
    // 도트 한 칸의 화면 px가 보통 기물과 같아(±0.5px/그림) 먹 테 4도트 · 흰 테 3도트가 같은 장치 px 굵기로 찍힌다.
    // (예전에는 span마다 따로 반올림 · 따로 정수배를 골라 915에서 보통 110px/72 · 반장 222px/144 · 거대 188px/122 — 도트 크기가 1% 어긋났다)
    const sc = span === 1 ? one : 2 * Math.round((one * span) / 2);
    const bottom = Math.ceil((GAUGE_ROW * tc) / BOARD_DOTS + this.footPad(key) * sc);
    return { size: sc / r, cy: (bottom - sc / 2) / r };
  }
  /** 기물의 바탕 그림 키 — 발주 이형 · 거대 그림이 있으면 그것, 없으면 바탕 기물 (P-01~05 · G-01~03) */
  private artKey(type: PieceType, side: Side, art?: { form?: FormId; giant?: boolean }): string {
    if (art?.giant && side === 1 && this.textures.exists(giantKey(type))) return giantKey(type);
    if (art?.form && this.textures.exists(formKey(art.form, side))) return formKey(art.form, side);
    return pieceKey(type, side);
  }
  /** 이 기물이 쓸 그림 (깨진 내 기물이면 어두운 속 칠 · 적 계급이면 그 색) */
  private glyphKey(id: number, type: PieceType, side: Side, art?: { form?: FormId; giant?: boolean }): string {
    const base = this.artKey(type, side, art);
    if (side === 1 && this.foeTone && FOE_TONE[this.foeTone]) return this.toned(base, this.foeTone, FOE_TONE[this.foeTone]);
    return side === 0 && this.crackedIds.includes(id) ? this.toned(base, 'crack', CRACK_TONE) : base;
  }

  create(): void {
    for (const type of ['P', 'N', 'B', 'R', 'Q', 'K'] as PieceType[])
      for (const side of [0, 1] as Side[]) this.textures.get(pieceKey(type, side)).setFilter(Phaser.Textures.FilterMode.NEAREST);
    for (const n of [...BOARD_IMAGES, 'skull']) this.textures.get(boardKey(n)).setFilter(Phaser.Textures.FilterMode.NEAREST);
    if (this.textures.exists('icon-shield16')) this.textures.get('icon-shield16').setFilter(Phaser.Textures.FilterMode.NEAREST);
    for (const suf of PROC_SHEETS) this.textures.get(procSheetKey(suf)).setFilter(Phaser.Textures.FilterMode.NEAREST);
    // 컨베이어 벨트 흐름 (PB-01 D-521): 4프레임을 계단으로 넘긴다
    if (!this.calm)
      this.conveyorEv = this.time.addEvent({
        delay: CONVEYOR_FRAME_MS,
        loop: true,
        callback: () => {
          if (!this.conveyorTiles.length) return;
          this.conveyorFrame = (this.conveyorFrame + 1) % 4;
          for (const c of this.conveyorTiles) if (c.im.active) c.im.setFrame(procFrame(`conveyor${this.conveyorFrame}`, c.dark));
          this.poke();
        },
      });
    // 색 바꾼 그림(깨짐 · 정예 · 반장 색)은 처음 쓸 때 만든다 (D-593 — 예전엔 여기서 백 장 남짓을 한꺼번에 만들어 ×4 감속 기준 1.2초를 막았다)
    for (const r of BOSS_ART_RULES)
      for (const rage of [false, true])
        if (this.textures.exists(bossArtKey(r, rage))) this.textures.get(bossArtKey(r, rage)).setFilter(Phaser.Textures.FilterMode.NEAREST);
    const arts = [...FORM_IDS.flatMap((f) => [formKey(f, 0), formKey(f, 1)]), ...GIANT_ART.map(giantKey)].filter((k) => this.textures.exists(k));
    for (const k of arts) this.textures.get(k).setFilter(Phaser.Textures.FilterMode.NEAREST);
    // 카메라 스크롤을 월드 정수로 내리는 roundPixels(pixelArt 기본)는 소수 줌(2.625)에서 칸 모서리를 픽셀 사이로 민다 — 끄고 moveCamera가 캔버스 픽셀에 맞춘다 (D-525)
    this.cameras.main.setRoundPixels(false);
    this.cameras.main.setZoom(this.dpr);
    // D-640: 본편(#board data-clear)은 판 밖을 비워 #app 뒤 막별 전투 바탕이 보이게 한다. 2.0은 그대로 먹색
    this.cameras.main.setBackgroundColor(this.clearBg ? 'rgba(0,0,0,0)' : C.bg);
    this.tilesG = this.add.graphics().setDepth(0.1);
    this.tilesC = this.add.container(0, 0).setDepth(0);
    this.marksG = this.add.graphics().setDepth(1);
    this.animG = this.add.graphics().setDepth(1.5);
    this.arrowsG = this.add.graphics().setDepth(3.9); // 기물 위 · 순번 배지 아래 (D-245: 예고선이 기물 발밑에 깔려 끊겨 보였다)
    this.boardTopC = this.add.container(0, 0).setDepth(4.5);
    this.animTopG = this.add.graphics().setDepth(4.6);
    this.fxG = this.add.graphics().setDepth(6);
    this.cursorG = this.add.graphics().setDepth(4.55); // 판 커서 (D-533): 기물 위 · 기물 위 표식(4.6) 아래
    this.bindInput();
    this.scale.on('resize', (size: Phaser.Structs.Size) => {
      this.poke();
      this.cameras.resize(size.width, size.height);
      this.fitCamera();
    });
    this.ready();
  }

  // ---------- 프레임 비용 (D-533) ----------
  /** 이 프레임 뒤로 몇 프레임은 꼭 그린다 (바깥에서 판을 바꿨다) */
  dirtyFrames = 3;
  /** 마지막으로 그린 움직이는 표식의 박자 열쇠 (같으면 같은 그림) */
  private animDrawn = '';
  private animSeen: unknown[] = [];
  private pens: { tile: number; g: PixelPen; top: PixelPen } | null = null;
  private conveyorEv: Phaser.Time.TimerEvent | null = null;
  /** 판 커서 (D-533): 키보드 · 패드로 고르는 칸 묶음 (null = 숨김) */
  private cursorG!: Phaser.GameObjects.Graphics;
  private cursor: { x: number; y: number; w: number; h: number } | null = null;
  private cursorDrawn = '';
  /** 바깥에서 판을 바꿨다 — 다음 몇 프레임은 그린다 */
  poke(): void {
    this.dirtyFrames = 3;
  }
  setCursor(r: { x: number; y: number; w: number; h: number } | null): void {
    this.cursor = r;
    this.poke();
  }
  /** 커서 박자: 0.48초마다 테가 한 도트 안으로 들어갔다 나온다 (계단 두 장 — 투명도 깜빡임 없음). 움직임 줄이기면 멈춤 */
  private cursorKey(now: number): string {
    const c = this.cursor;
    if (!c || !this.state) return '';
    return `${c.x},${c.y},${c.w},${c.h},${this.tile},${this.state.height},${this.calm ? 0 : Math.floor(now / CURSOR_BEAT_MS) % 2}`;
  }
  /** 커서 테: 금 2도트 단색 + 그 안쪽 먹 1도트 (밝은 칸 위에서도 테가 칸과 갈린다) — 칸 묶음 전체를 두른다 */
  private drawCursor(now: number): void {
    const key = this.cursorKey(now);
    if (key === this.cursorDrawn) return;
    this.cursorDrawn = key;
    const g = this.cursorG;
    g.clear();
    const c = this.cursor;
    if (!c) return;
    const d = this.tile / BOARD_DOTS;
    const w = this.world({ x: c.x, y: c.y + c.h - 1 });
    const inset = key.endsWith(',1') ? d : 0;
    const x0 = w.x + inset, y0 = w.y + inset, W = c.w * this.tile - inset * 2, H = c.h * this.tile - inset * 2;
    const ring = (x: number, y: number, ww: number, hh: number, k: number, color: number) => {
      g.fillStyle(color, 1);
      g.fillRect(x, y, ww, k).fillRect(x, y + hh - k, ww, k).fillRect(x, y + k, k, hh - 2 * k).fillRect(x + ww - k, y + k, k, hh - 2 * k);
    };
    ring(x0 + 2 * d, y0 + 2 * d, W - 4 * d, H - 4 * d, d, C.ink);
    ring(x0, y0, W, H, 2 * d, CURSOR_GOLD);
  }
  /**
   * 판이 가만히 있나 — 그렇다면 이번 프레임은 통째로 건너뛴다 (Phaser가 같은 그림을 다시 그리지 않게, 배터리).
   * 움직이는 표식 · 트윈 · 타이머 · 카메라 효과 · 바깥 변경 직후 · 커서 박자가 바뀌는 순간에는 그린다.
   */
  quiet(now: number): boolean {
    if (this.dirtyFrames > 0 || !this.state || this.animKey(now) !== this.animDrawn) return false;
    if ((this.tweens as unknown as { tweens: unknown[] }).tweens.length) return false;
    const clock = this.time as unknown as { _active: Phaser.Time.TimerEvent[]; _pendingInsertion: unknown[] };
    // 컨베이어 판은 벨트 박자가 Phaser 시계로 가므로 건너뛰지 않는다 (시계가 멈추면 벨트도 멈춘다)
    if (clock._pendingInsertion.length || clock._active.some((e) => e !== this.conveyorEv || this.conveyorTiles.length > 0)) return false;
    const cam = this.cameras.main;
    if (cam.panEffect.isRunning || cam.zoomEffect.isRunning || cam.shakeEffect.isRunning || cam.flashEffect.isRunning || cam.fadeEffect.isRunning || cam.rotateToEffect.isRunning) return false;
    return this.cursorKey(now) === this.cursorDrawn;
  }

  /**
   * 움직이는 표식의 박자 열쇠: 이 값이 같으면 그림이 도트 하나까지 같다 — 화살표 흐름(70ms 계단, 5박 주기) · 과녁(320ms 박, 넘어가는 80ms만 매 프레임) ·
   * 불길(120ms) · HP 반짝임(칸 단위) · 위협 깜빡임(136ms 계단 네 단, D-533). 움직임 줄이기면 모두 멈춘 그림이다.
   */
  private animKey(time: number): string {
    const A = this.anim;
    const ms = this.calm ? 0 : time;
    let k = '';
    if (A.threat.length) k += `t${threatLevel(time, this.calm)}${cbAid() ? "c" : ""}`;
    if (A.fire.length) k += `f${Math.floor(ms / 120)}`;
    if (A.arrows.length) k += `a${Math.floor(ms / FLOW_STEP_MS) % 5}`;
    if (A.gears.length) {
      const n = Math.floor(ms / TARGET_TICK.every);
      k += ms - n * TARGET_TICK.every < TARGET_TICK.snap ? `g${ms}` : `g${n % 4}`;
    }
    for (const r of A.glints) k += `l${gaugeSweep(r.hp, r.after, r.s.piece.maxHp, ms, gaugeSpot(r.s.piece).n)}`;
    return k;
  }

  /** 매 프레임: 흐르는 화살표 · 철컥 도는 과녁 · 위협 깜빡임 · 잃을 HP 반짝임 — 그림이 안 바뀌는 프레임은 다시 그리지 않는다 (D-533) */
  update(time: number): void {
    if (this.dirtyFrames > 0) this.dirtyFrames -= 1;
    this.drawCursor(time);
    const A = this.anim;
    const calm = this.calm;
    // 목록이 바뀌었거나(바깥 변경) · HP 반짝임이 붙은 기물이 움직였거나 · 박자 열쇠가 바뀌었을 때만 다시 그린다
    const seen: unknown[] = [A, A.threat, A.fire, A.gears, A.arrows, A.glints, A.threat.length, A.fire.length, A.gears.length, A.arrows.length, A.glints.length, this.tile, calm];
    for (const r of A.glints) seen.push(r.s.root.active, r.s.root.x, r.s.root.y);
    const key = this.animKey(time);
    const same = key === this.animDrawn && seen.length === this.animSeen.length && seen.every((v, i) => v === this.animSeen[i]);
    if (same) return;
    this.animDrawn = key;
    this.animSeen = seen;
    const g = this.animG;
    const top = this.animTopG;
    g.clear();
    top.clear();
    const t = this.tile;
    // 도트 펜은 칸 크기가 바뀔 때만 새로 (프레임마다 만들지 않는다)
    if (!this.pens || this.pens.tile !== t) this.pens = { tile: t, g: new PixelPen(g, t / BOARD_DOTS), top: new PixelPen(top, t / BOARD_DOTS) };
    const pen = this.pens.g;
    const ms = calm ? 0 : time;
    if (this.anim.threat.length) {
      // 위협: 반투명 붉은 칸이 계단 네 단으로 깜빡인다 (D-045 · D-216 계단 — D-533)
      const lv = threatLevel(time, calm);
      const a = lv < 0 ? THREAT_CALM_ALPHA : THREAT_ALPHA[lv];
      for (const w of this.anim.threat) g.fillStyle(C.crimson, a).fillRect(w.x, w.y, t, t);
      // 색 보조 (D-539): 깜빡이는 붉은 칸에 먹 빗금 — 깜빡임과 상관없이 늘 같은 무늬
      if (cbAid()) for (const w of this.anim.threat) drawHatch(pen, w.x, w.y);
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
    const tp = this.pens.top;
    for (const r of this.anim.glints) {
      if (!r.s.root.active) continue;
      const g = gaugeSpot(r.s.piece);
      drawGauge(tp, r.s.root.x + g.x * tp.dot, r.s.root.y + g.y * tp.dot, r.s.piece.side, r.hp, r.after, r.s.piece.maxHp, ms, g.n);
    }
  }

  /**
   * 특수 기믹 연출 (D-203, 사용자: "그 특성이 확실히 드러나야 하고 일반 공격과 다른 형식"). 도트 칸 단위 · 계단 페이드.
   * row: 한 줄을 왼쪽부터 불길이 훑고 지나간다 · thorns: 반장에서 친 기물까지 가시 줄 · burst: 터진 칸 둘레 3×3이 두 번 번쩍 · steam: 맞은 적마다 김이 솟는다
   */
  private async gimmickFx(kind: 'row' | 'thorns' | 'burst' | 'steam' | 'slam', pos: Pos, from: Pos | undefined, ids: number[], cells: Pos[] = []): Promise<void> {
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
    if (kind === 'slam') {
      // 거대 주물 내리찍기 (D-484): 예고 칸이 앞에서부터 계단으로 쾅 — 쇳물 주황 판 + 노란 속 + 큰 흔들림
      sfx('crit');
      cells.forEach((q, i) => {
        cell(q, 0xe8783c, 0.8, i * 40, 220);
        cell(q, 0xfacc15, 0.6, i * 40 + 40, 120, t * 0.28);
      });
      await this.wait(cells.length * 40 + 160);
      this.shakeLv(2);
    } else if (kind === 'row' && this.fxHook) {
      sfx('threat');
      await this.fxHook.rowBomb(pos.y, this.state.width);
    } else if (kind === 'thorns' && from && this.fxHook) {
      sfx('parry');
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
      sfx('parry');
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
    // 새 판의 첫 그리기에 붙어 있는 딱지는 튀어나오지 않는다 (D-538)
    this.chipSeen.clear();
    this.chipArm = this.renderSeq + 2;
    const vw = this.scale.width / this.dpr, vh = this.scale.height / this.dpr;
    const base = tileSize(this.dpr, state.width, state.height, vw, vh);
    const pc = pcIntTile(this.dpr, state.width, state.height, vw, vh);
    // PC 정수 기물 칸이 더 크면 그것 — 판 둘레 여유도 PC 몫으로 줄인다 (D-563)
    this.tightPad = pc > base;
    this.tile = Math.max(base, pc);
    this.drawTiles(state);
    this.fitCamera(true);
  }

  /** 그리기 차례 번호 · 딱지별 마지막으로 보인 차례 (D-538 상태 딱지 도장) */
  private renderSeq = 0;
  private chipSeen = new Map<string, number>();
  private chipArm = 0;
  /**
   * 상태 딱지가 새로 붙는 순간 (D-538, D-193 「도장」 박자): 계단 3장으로 크게 찍혔다 제자리 + 도장 소리.
   * 이미 붙어 있던 딱지(직전 그리기에도 있던 것)는 그대로 둔다. 움직임 줄이기면 소리만.
   */
  private chipPop(im: Phaser.GameObjects.Image, name: string, id: number): void {
    const key = `${id}:${name}`;
    const prev = this.chipSeen.get(key);
    this.chipSeen.set(key, this.renderSeq);
    if ((prev !== undefined && prev >= this.renderSeq - 1) || this.renderSeq < this.chipArm) return;
    sfx('stamp');
    if (this.calm) return;
    // 예비(두 배로 들림) → 찍힘(제 크기, 1도트 아래로 눌림) → 출렁(제자리). 배율은 정수배만 지난다
    const sx = im.scaleX, sy = im.scaleY, y0 = im.y, d = this.tile / BOARD_DOTS;
    im.setScale(sx * 2, sy * 2);
    this.time.delayedCall(70, () => im.active && im.setScale(sx, sy).setY(y0 + d));
    this.time.delayedCall(150, () => im.active && im.setY(y0));
  }

  /**
   * 조건 표시 하나 (D-592 — 황동 모서리 · 램프): 이번 그리기에 적어 두고, 지난 그리기에 없던 것이면 계단 3프레임 팝 + 황동 번쩍 한 번(D-216 · D-180).
   * 움직임 줄이기면 바로 켠다. 배율은 정수배만 지난다(×2 → ×1).
   */
  private condMark(key: string, im: Phaser.GameObjects.Image, ox = 0, oy = 0): void {
    const list = this.condNow.get(key) ?? [];
    list.push({ x: im.x + ox, y: im.y + oy, size: im.displayWidth, key: im.texture.key });
    this.condNow.set(key, list);
    if (this.condSeen.has(key) || this.calm) return;
    const sx = im.scaleX, sy = im.scaleY, x0 = im.x, y0 = im.y, d = this.tile / BOARD_DOTS, w = im.displayWidth;
    // 1프레임: 두 배로 들림 + 밝은 황동 번쩍 (원점 0,0 — 가운데 기준으로 들리게 자리도 옮긴다)
    im.setScale(sx * 2, sy * 2).setPosition(x0 - w / 2, y0 - w / 2).setTintFill(0xffe9a8);
    this.time.delayedCall(50, () => im.active && im.setScale(sx, sy).setPosition(x0, y0 + d).clearTint());
    this.time.delayedCall(100, () => im.active && im.setPosition(x0, y0));
  }
  /** 그리기 끝: 꺼진 조건 표시는 2단 도트 디더로 퇴장 (반 칸 체크 무늬로 비운 뒤 사라짐 — 단순 페이드 없음, D-216) */
  private condFlush(): void {
    const gone = [...this.condSeen.entries()].filter(([k]) => !this.condNow.has(k));
    this.condSeen = this.condNow;
    this.condNow = new Map();
    if (this.calm) return;
    const d = this.tile / BOARD_DOTS;
    for (const [, list] of gone)
      for (const m of list) {
        const im = this.add.image(m.x, m.y, m.key).setOrigin(0, 0).setDisplaySize(m.size, m.size).setDepth(1.75);
        const g = this.make.graphics({}, false);
        g.fillStyle(0xffffff);
        for (let y = 0; y < m.size; y += d) for (let x = 0; x < m.size; x += d) if (((x + y) / d) % 2 < 1) g.fillRect(m.x + x, m.y + y, d, d);
        this.time.delayedCall(50, () => im.active && im.setMask(g.createGeometryMask()));
        this.time.delayedCall(100, () => { im.destroy(); g.destroy(); });
      }
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
    // 공정 판 (D-486 · PB-01 D-521): 공정 칸 그림이 판 칸을 통째로 대신한다(칸 짝 테 포함). 옛 빌린 도트 표시는 테 + 왼쪽 아래 아이콘으로 남겨 둔다
    const dot = t / 20;
    // 공정 칸 테는 판 색에 맞춘 장을 고른다 (D-522) — 장이 없는 새 판 색이면 기본 판 장
    const procSuf = this.bossRule ? `-b${this.bossRule}` : this.act ? `-a${this.act}` : '';
    const procKey = procSheetKey(this.textures.exists(procSheetKey(procSuf)) ? procSuf : '');
    this.conveyorTiles = [];
    for (const pt of this.procTiles) {
      if (isFallen(state, pt.pos.x, pt.pos.y)) continue;
      const w = this.world(pt.pos);
      if (pt.icon.startsWith('proc-')) {
        const dark = (pt.pos.x + pt.pos.y) % 2 === 0;
        const base = pt.anim ? 'proc-conveyor' : pt.icon;
        const name = pt.anim ? `${base}${this.conveyorFrame}` : base;
        const im = this.add.image(w.x + t / 2, w.y + t / 2, procKey, procFrame(name, dark)).setDisplaySize(t, t).setFlipX(!!pt.flipX);
        this.tilesC.add(im);
        if (pt.anim) this.conveyorTiles.push({ im, dark });
        continue;
      }
      const g = this.add.graphics();
      g.lineStyle(dot * 2, pt.frame, 1).strokeRect(w.x + dot * 2, w.y + dot * 2, t - dot * 4, t - dot * 4);
      this.tilesC.add(g);
      if (pt.icon === 'crack') put(this.tilesC, 'crack', w.x, w.y);
      else if (pt.icon) {
        const size = pt.icon === 'chip-magnet' ? dot * 8 : dot * 7;
        const im = this.add.image(w.x + dot * 2 + size / 2, w.y + t - dot * 2 - size / 2, boardKey(pt.icon)).setDisplaySize(size, size).setFlipX(!!pt.flipX);
        this.tilesC.add(im);
      }
    }
    // 다음 라운드에 무너질 칸 예고: 철판에 간 금 (D-045)
    for (const p of upcomingCollapse(state)) {
      const w = this.world(p);
      put(this.tilesC, 'crack', w.x, w.y);
    }
  }

  /** 카메라가 보는 월드 중심. 보드가 화면보다 작으면 가운데, 크면 보드 밖으로 나가지 않게 제한한다. */
  private camCenter = { x: 0, y: 0 };
  /** 공정 판 칸 (D-486) — render가 모델에서 받는다 */
  private procTiles: NonNullable<BoardModel['proc']> = [];
  /** 컨베이어 칸 그림 · 지금 프레임 (PB-01 4프레임, 동작 줄이기면 0에 멈춘다) */
  private conveyorTiles: { im: Phaser.GameObjects.Image; dark: boolean }[] = [];
  private conveyorFrame = 0;

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
    // 판 둘레 여유 (아래 · 양옆 m, 위 m + 배지 자리) — PC 정수 칸이면 위 · 아래 칸 0.05씩 (D-563, pcIntTile과 같은 셈)
    const m = t * (this.tightPad ? PC_VPAD / 2 : 0.25);
    const top = -m - (this.tightPad ? 0 : t * 0.4);
    const viewW = cam.width / cam.zoom;
    const viewH = cam.height / cam.zoom;
    const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
    const x = bw + 2 * m <= viewW ? bw / 2 : clamp(cx, -m + viewW / 2, bw + m - viewW / 2);
    // 판이 다 들어오면 칸 격자를 위(상태 띠) · 아래(부관 안내) 자리를 뺀 나머지의 가운데에 — 아래 끝이 화면 밖으로 나가지 않게
    const mid = bh / 2 - (boardInset.top - boardInset.bottom) / 2;
    const y = bh + m - top <= viewH ? Math.max(Math.min(mid, viewH / 2 - boardInset.top), bh + m - viewH / 2) : clamp(cy, top + viewH / 2, bh + m - viewH / 2);
    // 캔버스 픽셀 정수에 맞춘다 (D-525): 칸 모서리가 픽셀 사이에 걸리면 바 · 테 줄이 한 픽셀씩 들쭉날쭉해진다.
    // Phaser 카메라: 캔버스 x = floor(폭/2 + 0.5) + 줌 × (월드 x − 가운데 x) — 가운데 × 줌이 정수면 칸 모서리가 정수 픽셀 (카메라 roundPixels는 끈다 · create)
    const z = this.dpr;
    this.camCenter = { x: Math.round(x * z) / z, y: Math.round(y * z) / z };
    cam.centerOn(this.camCenter.x, this.camCenter.y);
  }

  /** 판에서 기물 그림을 뗀다 — 거대 주물 부위면 바의 그 칸을 비우고 남은 형제 부위 바를 다시 그린다 (D-532) */
  private dropSprite(id: number): void {
    const sp = this.sprites.get(id);
    this.sprites.delete(id);
    const gi = sp?.piece.giant;
    if (!gi || gi.boss) return;
    this.giantLive.delete(`${gi.id}:${gi.dx}${gi.dy}`);
    for (const o of this.sprites.values()) {
      if (o.piece.giant?.id === gi.id && !o.piece.giant.boss && o.root.active) this.drawHp(o, o.hpDrawn?.[0] ?? o.piece.hp, o.hpDrawn?.[1] ?? o.piece.hp);
    }
  }

  // ---------- 기물 ----------
  private makePiece(p: Piece, pos: Pos, alpha = 1): PieceSprite {
    const t = this.tile;
    const w = this.world(pos);
    // 위 줄(판 y가 큰 쪽)이 아래 줄 위에 (D-525): 아래 칸 기물의 머리(종이 왕관 끝)가 윗칸 체력바 아랫줄을 덮어 바 밑에 흰 줄이 서던 것을 막는다
    const root = this.add.container(w.x, w.y).setDepth(2 + pos.y * 0.001 + 0.5);
    // 2×2 보스 몸 칸 (D-513): 그림 · 게이지는 본체(왼아래 칸)가 2×2로 한 장 — 몸 칸은 빈 자리표(움직임 사건만 받는다)
    if (p.body !== undefined) {
      const glyph = this.add.image(t / 2, t / 2, pieceKey('K', 1)).setVisible(false);
      const hp = this.add.graphics();
      root.add([glyph, hp]);
      return { root, glyph, hp, piece: p };
    }
    const boss = !!p.giant?.boss;
    /** 2×2 보스는 위 칸까지 — 칸 위 끝 표식(딱지 · 체크 고리)을 한 칸 올린다 */
    const oy = boss ? -t : 0;
    // 발밑 받침은 쓰지 않는다 (D-048) — 진영은 흰/검은 기물 + HP 게이지 색
    const base = this.add.graphics();
    const rings: Phaser.GameObjects.GameObject[] = [];
    // 체크: HP 1로 버틴 킹 — 다음에 맞으면 끝 (D-022). 위 가운데가 터진 붉은 톱니 고리
    if (p.type === 'K' && p.hp === 1 && this.state?.rules.checkmate) rings.push(boss ? this.add.image(t, 0, boardKey('check')).setDisplaySize((t * 42) / 20, (t * 42) / 20) : this.add.image(t / 2, t / 2, boardKey('check')).setDisplaySize((t * 21) / 20, (t * 21) / 20));
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
    // 이형 (D-481): 전용 그림(P-01~05)이 있으면 그 그림만. 그림 파일이 없을 때만 대비 딱지(검은 딱지 + 황동 글자) — 각인이 있으면 왼쪽 아래
    if (p.form && !this.textures.exists(formKey(p.form, p.side))) {
      const size = t * 0.34;
      const y0 = p.carve ? t - size - t * 0.14 : t * 0.02;
      const tag = this.add.graphics();
      tag.fillStyle(0x16141c, 1).fillRect(t * 0.02, y0, size, size);
      tag.lineStyle(Math.max(1, t * 0.03), C.brass, 1).strokeRect(t * 0.02, y0, size, size);
      marks.push(
        tag,
        this.add
          .text(t * 0.02 + size / 2, y0 + size / 2, FORMS[p.form].badge, { fontFamily: 'Galmuri11, sans-serif', fontStyle: '700', fontSize: `${gpx(size * 0.62)}px`, color: '#E8C060' })
          .setOrigin(0.5)
          .setResolution(this.dpr),
      );
    }
    // 정예 (검문!): 오른쪽 위 진홍 왕관 딱지 — HP 두 배
    // 딱지 (2026-11-05 도트 명패, tools/pixel/board_chips.py): 정예 = 왕관 · 자폭 폰 = 불꽃 · 되받아치는 반장 킹 = 발톱 — 오른쪽 위,
    // 원수 = 해골 — 왼쪽 위. 치기 전에 "이 기물은 물어뜯는다"가 보인다 (D-175 · D-178)
    // 딱지 크기 (D-538): 16도트 딱지 1도트 = 캔버스 정수 픽셀(칸의 약 36%에 가까운 정수배) · 자리도 캔버스 픽셀에 맞춘다
    const snap = (v: number) => Math.round(v * this.dpr) / this.dpr;
    const chipSize = (Math.max(1, Math.round((t * 0.36 * this.dpr) / 16)) * 16) / this.dpr;
    const chipAt = (name: string, left: boolean) => {
      const size = chipSize;
      const x = left ? t * 0.02 + size / 2 : (boss ? 2 * t : t) - t * 0.02 - size / 2;
      const im = this.add.image(snap(x - size / 2) + size / 2, snap(oy + t * 0.02 + (boss ? t * 0.2 : 0)) + size / 2, boardKey(`chip-${name}`)).setDisplaySize(size, size);
      marks.push(im);
      this.chipPop(im, name, p.id);
    };
    const trait = p.side === 1 ? (p.type === 'P' && !p.giant && this.foeTraits.includes('blast') ? 'flame' : p.type === 'K' && this.foeTraits.includes('thorns') ? 'claw' : null) : null;
    if (p.side === 0 && this.shockedIds.includes(p.id)) chipAt('shock', false);
    if (this.staggeredIds.includes(p.id)) chipAt('stun', false);
    else if (p.elite) chipAt('crown', false);
    else if (trait) chipAt(trait, false);
    if (p.id === this.nemesisId && p.side === 1) chipAt('skull', true);
    // 약점 창 (D-518 레이드 — 패링 · 헛방 · 헛친 이형): 왼쪽 아래 금 간 방패 딱지 (받은 RD-01 → ui/board/chip-weak.png, D-527) — 다른 딱지와 같은 크기 · 정수 자리.
    // 2×2 보스는 2×2 왼쪽 위(별 딱지와 같은 높이)
    if (p.weak && p.weak > 1) {
      const size = chipSize;
      // 거대 주물 부위 (D-532): 부위 바 4칸 중 제 칸 바로 위 — 바를 가리지 않고 어느 부위가 약점인지 바와 짝지어 읽힌다
      const gs = p.giant && !boss ? gaugeSpot(p) : null;
      const d = t / BOARD_DOTS;
      const x0 = snap(gs ? (gs.x + 1 + GIANT_SLOT_N / 2) * d - size / 2 : t * 0.04), y0 = snap(gs ? gs.y * d - size - d : boss ? oy + t * 0.22 : t - size - t * 0.04);
      const wk = this.add.image(x0 + size / 2, y0 + size / 2, boardKey('chip-weak')).setDisplaySize(size, size);
      marks.push(wk);
      this.chipPop(wk, 'weak', p.id);
    }
    if (p.side === 0 && p.id === this.stampId) chipAt('stamp', true);
    else if (p.side === 0 && p.id === this.pullId) chipAt('magnet', true);
    // 조건 램프 (D-592): 처치 기물 태엽 0 · 마지막 숨 · 마지막 축이 켜진 내 기물 — 왼쪽 아래(HP 줄 위), 딱지와 같은 정수 크기
    else if (p.side === 0 && this.condIds.includes(p.id) && !(p.weak && p.weak > 1)) {
      const size = chipSize;
      const lamp = this.add.image(snap(t * 0.02), snap(t - size - t * 0.16), boardKey('lamp')).setOrigin(0, 0).setDisplaySize(size, size);
      marks.push(lamp);
      this.condMark(`piece:${p.id}`, lamp, w.x, w.y);
    }
    // 도트 기물 (머리 강조형 16×16) — 받침 위에 살짝 올려 그린다
    const glyph = this.add.image(t / 2, 0, this.glyphKey(p.id, p.asPawn ? 'P' : p.type, p.side, { form: p.asPawn ? undefined : p.form, giant: !!p.giant }));
    if (!p.giant) {
      const box = this.pieceBox(glyph.texture.key);
      glyph.setDisplaySize(box.size, box.size).setY(box.cy);
    }
    // 거대 주물 (D-484): 그림 하나를 2×2 칸에 펴고 네 조각으로 — 부위마다 제 칸의 4분의 1만 보인다(부서지면 그 조각이 무너진다).
    // 화면 위쪽 = 판 y가 큰 쪽(dy 1). 전용 그림(G-01~03, 144칸 캔버스)은 한가운데가 부위 경계, 없으면 바탕 기물 그림을 두 배로
    if (boss) {
      // 2×2 보스 (D-513): 본체 칸에서 2×2 한 장 — 전용 그림(GB, 144칸 캔버스)이 있으면 그것(격노면 b), 없으면 반장 킹 그림(72칸)을 같은 배율 두 배로 빌린다
      const key = bossArtKey(this.bossRule, !!p.giant!.rage);
      const real = this.textures.exists(key) || this.textures.exists(bossArtKey(this.bossRule, false));
      if (real) {
        const art = this.textures.exists(key) ? key : bossArtKey(this.bossRule, false);
        // 졸개와 같은 반장 색 (D-524) — 판의 색 갈래(foeTone)가 있으면 그 색으로 바꾼 그림
        const tone = `boss-${this.bossRule}`;
        glyph.setTexture(this.foeTone === tone && FOE_TONE[tone] ? this.toned(art, tone, FOE_TONE[tone]) : art);
      }
      // 바닥 기준선 (D-525): 2×2 몸의 받침 바닥이 아래 칸 줄 보통 기물 받침 바닥과 같은 높이 — 격노 그림도 같은 자로 잰다
      const box = this.pieceBox(glyph.texture.key, 2);
      glyph.setDisplaySize(box.size, box.size).setPosition(t, box.cy);
      if (!real) {
        // 「임시」 딱지 (D-386: 받기 전에는 빌린 그림이라고 판 위에 밝힌다 — 길게 누르면 「임시 — GB 대기」) — 2×2 왼아래 귀퉁이, 받침을 가리지 않게
        const lbl = this.add.text(0, 0, BOSS_BODY.tempChip, { fontFamily: 'Galmuri11, sans-serif', fontStyle: '700', fontSize: '12px', color: '#0B0B0E' }).setOrigin(0.5).setResolution(this.dpr);
        const d = t / BOARD_DOTS;
        const bw = Math.ceil((lbl.width + 4 * d) / d) * d, bh = Math.ceil((lbl.height + d) / d) * d;
        const bx = Math.round(2 * d), by = Math.round(t - bh - d);
        const tag = this.add.graphics();
        tag.fillStyle(0x0b0b0e, 1).fillRect(bx - d, by - d, bw + 2 * d, bh + 2 * d);
        tag.fillStyle(0xc89b3c, 1).fillRect(bx, by, bw, bh);
        lbl.setPosition(bx + bw / 2, by + bh / 2 + d / 2);
        marks.push(tag, lbl);
      }
    } else if (p.giant) {
      const left = p.giant.dx === 0, top = p.giant.dy === 1;
      const fw = glyph.frame.width, fh = glyph.frame.height;
      // 거대 주물 (D-525 → D-528): 보통 기물 배율 약 1.7배(GIANT_ART_SPAN = 122/72) · 2×2 가로 가운데 · 받침 바닥을 아래 칸 기준선에 — 위 부위는 한 칸 위 칸에서 같은 그림을 자른다
      const box = this.pieceBox(glyph.texture.key, GIANT_ART_SPAN);
      glyph.setDisplaySize(box.size, box.size).setPosition(left ? t : 0, top ? box.cy + t : box.cy);
      glyph.setCrop(left ? 0 : fw / 2, top ? 0 : fh / 2, fw / 2, fh / 2);
    }
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
    if (s.piece.body !== undefined) return; // 2×2 보스 몸 칸: 게이지는 본체 하나 (D-513)
    // 2×2 보스 (D-513 → D-525): 게이지 하나를 2×2 아래 끝(보통 기물과 같은 기준선 바로 아래)에 2칸 폭으로 — 거대 주물(부위 게이지 넷)과 한눈에 갈린다
    if (s.piece.giant?.boss) {
      const gy = GAUGE_ROW;
      drawGauge(pen, 3 * d, gy * d, s.piece.side, hpNow, hpAfter, s.piece.maxHp, -1, 2 * BOARD_DOTS - 8);
      if (s.piece.shield > 0) {
        const n = Math.max(1, Math.round((2 * BOARD_DOTS - 8) * Math.min(1, s.piece.shield / s.piece.maxHp)));
        for (let i = 0; i < n; i++) pen.px((4 + i) * d + d / 2, (gy - 1) * d + d / 2, 0xf4f1ea, 1, 1);
      }
      if (hpAfter < hpNow) this.anim.glints.push({ s, hp: hpNow, after: hpAfter });
      return;
    }
    s.hpDrawn = [hpNow, hpAfter];
    const g = gaugeSpot(s.piece);
    // 거대 주물 부위 (D-484 → D-532): 2×2 그림 아래 기준선 밑 한 줄 4칸 분할 바 — 부위마다 제 칸만 채우고, 부서진 부위 칸은 빈 칸으로 남는다.
    // 테(먹)는 살아 있는 부위가 모두 같은 자리에 같은 색으로 그려 겹쳐도 같다
    if (s.piece.giant) {
      const gi = s.piece.giant;
      const ox = gi.dx === 0 ? 0 : -BOARD_DOTS, oy = gi.dy === 1 ? BOARD_DOTS : 0;
      drawGiantFrame(pen, ox * d, (oy + GAUGE_ROW) * d);
      for (const [dx, dy] of GIANT_SLOTS) {
        if ((dx !== gi.dx || dy !== gi.dy) && !this.giantLive.has(`${gi.id}:${dx}${dy}`))
          drawGauge(pen, (ox + giantSlotX(dx, dy)) * d, (oy + GAUGE_ROW) * d, s.piece.side, 0, 0, 1, -1, GIANT_SLOT_N);
      }
    }
    drawGauge(pen, g.x * d, g.y * d, s.piece.side, hpNow, hpAfter, s.piece.maxHp, -1, g.n);
    // 보호막: 게이지 바로 위 흰 도트 줄
    if (s.piece.shield > 0) {
      const n = Math.max(1, Math.round(g.n * Math.min(1, s.piece.shield / s.piece.maxHp)));
      for (let i = 0; i < n; i++) pen.px((g.x + 1 + i) * d + d / 2, (g.y - 1) * d + d / 2, 0xf4f1ea, 1, 1);
    }
    if (hpAfter < hpNow) this.anim.glints.push({ s, hp: hpNow, after: hpAfter });
  }

  /**
   * 판 위 글 표지(배수 「×N」 · 합 「+N」)의 등장 · 퇴장 (D-538, D-216): 튀어나옴(계단 셋: 작게 → 크게 → 제자리, 떠오름) → 머묾
   * → 아래부터 네 계단으로 잘려 사라진다. 투명도 보간 · 선형 이동 없음. 모두 600ms 안.
   */
  private popText(o: Phaser.GameObjects.Text, rise: number, hold = 330): void {
    const y0 = o.y;
    const end = () => o.active && o.destroy();
    if (this.calm) return void this.time.delayedCall(hold + 200, end);
    o.setScale(0.6);
    this.time.delayedCall(50, () => o.active && o.setScale(1.25).setY(y0 - rise * 0.7));
    this.time.delayedCall(110, () => o.active && o.setScale(1).setY(y0 - rise));
    const w = o.width, h = o.height;
    for (let i = 1; i <= 4; i++) this.time.delayedCall(110 + hold + i * 40, () => (i === 4 ? end() : o.active && o.setCrop(0, 0, w, h * (1 - i / 4))));
  }

  /**
   * 떠오르는 숫자 자리 (D-538): 기물 얼굴을 덮지 않게 칸 위 끝(2×2 반장은 2×2 위 끝)에 바닥을 대고 조금만 떠오른다.
   * 반환 = 가운데 아래 기준점 (월드)
   */
  private popAt(sp: PieceSprite): { x: number; y: number } {
    const t = this.tile;
    const boss = !!sp.piece.giant?.boss;
    return { x: sp.root.x + (boss ? t : t / 2), y: sp.root.y - (boss ? t : 0) + t * 0.1 };
  }
  /** 막힘 표지: 받은 방패 아이콘(ui/icons16/intent-shield, 15×19도트)을 기기 정수배로 — 찍힘(계단) → 머묾 → 계단 접힘 */
  private blockedMark(x: number, y: number): void {
    if (!this.textures.exists('icon-shield16')) return;
    const r = this.dpr;
    const k = Math.max(1, Math.round((this.tile * 0.4 * r) / 19));
    const w = (15 * k) / r, h = (19 * k) / r;
    const im = this.add.image(Math.round((x - w / 2) * r) / r, Math.round((y - h) * r) / r, 'icon-shield16').setOrigin(0, 0).setDisplaySize(w, h).setDepth(8.1);
    if (this.calm) return void this.time.delayedCall(POPUP_MS.life, () => im.destroy());
    this.tweens.chain({ targets: im, tweens: [
      { y: im.y - (2 * k) / r, duration: 80, ease: 'Stepped', easeParams: [1] },
      { y: im.y, duration: 80, ease: 'Stepped', easeParams: [1] },
      { scaleY: 0, delay: POPUP_MS.fadeAt, duration: POPUP_MS.fade, ease: 'Stepped', easeParams: [4] },
    ], onComplete: () => im.destroy() });
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
      const at = this.popAt(sp);
      this.tweens.addCounter({ from: 0, to: POPUP_MS.life, duration: POPUP_MS.life, onUpdate: (tw) => { g.clear(); drawPopup(g, art, at.x, at.y, d, tw.getValue() ?? 0, t * 0.2, this.dpr); }, onComplete: () => g.destroy() });
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
      // D-538: 투명도 보간 없이 — 차례가 되면 계단으로 나타나(위에서) 떨어져 박힌다
      im.setVisible(false).setY(y0 - t * 0.4);
      this.time.delayedCall((x + yTop) * 32, () => im.active && im.setVisible(true));
      this.tweens.add({ targets: im, y: y0, delay: (x + yTop) * 32, duration: 300, ease: 'Back.easeOut' });
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
    // D-538: 0 → 1 투명도 보간 대신 차례가 되면 바로 보인다(크게 · 기울어) → 떨어져 박힌다
    img.setOrigin(0.5).setPosition(x + w / 2, y + h / 2).setAngle(A.fromAngle).setDisplaySize(w * A.fromScale, h * A.fromScale).setVisible(false);
    this.time.delayedCall(i * 90, () => img.active && img.setVisible(true));
    this.tweens.add({ targets: img, angle: 0, displayWidth: w, displayHeight: h, delay: i * 90, duration: A.drop, ease: 'Back.easeOut', onComplete: () => sfx('land') });
  }

  /** 흐르는 화살표 예약 (update가 매 프레임 그린다) */
  private arrow(from: Pos, to: Pos, knight: boolean, color: number, alpha: number): void {
    this.anim.arrows.push({ a: this.center(from), b: this.center(to), knight, color, alpha });
  }

  render(m: BoardModel): void {
    this.renderSeq++;
    this.clearDynamic();
    this.condIds = m.condIds ?? [];
    this.procTiles = m.proc ?? [];
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
    this.giantLive = new Set(shown.filter((p) => p.giant && !p.giant.boss).map((p) => `${p.giant!.id}:${p.giant!.dx}${p.giant!.dy}`));
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
      // 색 보조 (D-539): 적 범위만 빗금 — 내 범위(청록)는 맨 칸이라 무늬로 갈린다
      if (!mine && cbAid()) drawHatch(new PixelPen(this.marksG, d), w.x, w.y, 0x0b0b0e, strong ? 0.6 : 0.45);
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
          // 조건 칸 (D-592): 황동 L자 모서리(select 재칠 cond.png) + 오른쪽 위 램프 — 과녁 · 금색 처치를 가리지 않는 모서리 자리
          if (hit.cond) {
            const key = `cell:${p.x},${p.y}`;
            this.condMark(key, img('cond', w.x, w.y, t, 1.72));
            this.condMark(key, img('lamp', w.x + 12 * d, w.y, 8 * d, 1.74));
          }
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
      // 같은 적의 두 번째 행동(2026-11-14)은 첫 행동이 닿은 칸에서 화살표를 잇는다
      const at = new Map<number, Pos>();
      m.intent.plan.forEach((st, i) => {
        for (const a of stepArrows(m.intent!.state, st)) this.arrow(at.get(st.pieceId) ?? a.from, a.to, a.knight, C.crimson, faint);
        at.set(st.pieceId, st.to);
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
    this.condFlush();
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
  private get calm(): boolean { return calmMotion(); }
  private wait(ms: number): Promise<void> {
    return new Promise((r) => this.time.delayedCall(this.calm ? ms * 0.3 : ms, r));
  }
  private tween(cfg: Phaser.Types.Tweens.TweenBuilderConfig): Promise<void> {
    const duration = typeof cfg.duration === 'number' && this.calm ? cfg.duration * 0.3 : cfg.duration;
    return new Promise((r) => this.tweens.add({ ...cfg, duration, onComplete: () => r() }));
  }
  /** 타격 카메라의 지금 목표 줌 */

  /*
   * 타격 카메라 (D-115) 줌 · 당김은 D-538에서 뺐다: 소수 배율 줌(1.1 · 1.18 · 1.25, Sine 보간)이 판 도트 크기를 매 프레임 바꿨다.
   * 정수 배율로 맞추면 판(20도트)과 기물(72도트)이 함께 정수가 되는 배율이 2배뿐이라, 예비 → 터짐 → 출렁은 기물 몸짓 · 정지 · 흔들림이 맡는다.
   */

  /** 판 가장자리 진홍 테 (2도트) 한 장 — ms 뒤 사라진다 */
  private edgeCut(ms: number): void {
    const t = this.tile, d = t / BOARD_DOTS;
    const bw = this.state.width * t, bh = this.state.height * t;
    const g = this.add.graphics().setDepth(9);
    g.fillStyle(0xb3121c, 1);
    g.fillRect(-2 * d, -2 * d, bw + 4 * d, 2 * d).fillRect(-2 * d, bh, bw + 4 * d, 2 * d).fillRect(-2 * d, 0, 2 * d, bh).fillRect(bw, 0, 2 * d, bh);
    this.time.delayedCall(ms, () => g.destroy());
  }

  private shake(ms: number, intensity: number): void {
    // 설정 › 화면 흔들림 (D-539)
    const k = intensity * shakeMul();
    if (!this.calm && k > 0) this.cameras.main.shake(ms, k);
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
  /** 이동 한 번(들기 → 착지)의 지금 길이 ms — 판 밖 카드 FX가 착지에 맞춘다 (D-553) */
  get moveMsNow(): number {
    return MOVE_TOTAL / this.speed;
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
      // D-538: 화면 전체 카메라 번쩍(투명도 보간) 대신 판 가장자리 진홍 테 한 장(계단) — 번쩍임 줄이기면 없다
      if (!reduceFlash()) this.edgeCut(IMPACT.heavy.cut);
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
    // 막힘(피해 0, D-538): 「-0」 숫자 대신 받은 방패 아이콘(intent-shield) — 원칙 4 (숫자만으로 구분하지 않는다)
    const at = this.popAt(ts);
    if (dealt <= 0 && !h.killed) this.blockedMark(at.x, at.y);
    const art = buildPopupArt(dealt <= 0 && !h.killed ? '' : `-${dealt}`, h.killed ? 0xfacc15 : ts.piece.side === 0 ? 0xff6b6b : 0xf4f1ea);
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
        drawPopup(g, art, at.x, at.y, d, ms, t * 0.2, this.dpr);
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
  private shatterPiece(s: PieceSprite, slow = 1, power = 1, o: { hot?: boolean; cool?: boolean } = {}, wallMs?: number): Promise<void> {
    const t = this.tile;
    const key = s.glyph.texture.key;
    const box = this.pieceBox(key);
    const size = box.size;
    const gx = s.root.x + t / 2;
    const gy = s.root.y + box.cy;
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
    const total = wallMs ?? (IMPACT.shatter.ms * slow) / this.speed;
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
            // 조각은 투명해지지 않고 제 차례(조각마다 다른 때)에 하나씩 꺼진다 — 도트 디더 퇴장의 조각판 (D-538)
            f.img.setRotation(f.r * e).setVisible(k < 0.6 + 0.4 * hashN(f.v * 13 + f.r * 7));
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
          // 점멸 세기는 4계단 (D-538 — 연속 투명도 대신)
          glow.setAlpha(Math.round((k > 0.88 ? (k - 0.88) / 0.12 : on ? 0.18 + 0.5 * k : 0) * 4) / 4);
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
    this.dropSprite(s.piece.id);
    await Promise.all([s0, crown]);
    this.time.delayedCall(900 / this.speed, () => crownG.destroy());
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

  /**
   * 턴 합계 (D-073, 발라트로식): 내 턴이면 판 가운데에 준 피해가 0부터 세어 올라가며 커졌다가 자리 잡고, 처치 수가 붙는다.
   * 적 턴이거나 작은 턴(처치 없음 · 피해 TURN_SUMMARY.bigDamage 미만)이면 위쪽에 작게.
   */
  async summary(side: Side, damage: number, kills: number): Promise<void> {
    const t = this.tile;
    const { x, y } = this.camCenter;
    if (side === 1 || (kills === 0 && damage < TURN_SUMMARY.bigDamage)) {
      // 적 턴, 또는 작은 내 턴: 위쪽에 작게 (판을 가리지 않고 기다림도 짧게)
      const text = side === 1 ? `잃음 −${damage}` : `피해 ${damage}`;
      const lost = this.crispText(x, y - t * 2.2, text, t * 0.42, side === 1 ? '#FF6B6B' : '#7DD3FC');
      // 결과 = 내리꽂힘 → 머묾 → 계단으로 접힘 (D-193)
      lost.setScale(lost.base * 2);
      await this.tween({ targets: lost.obj, scale: lost.base, duration: 260, ease: 'Back.easeOut' });
      await this.tween({ targets: lost.obj, scaleY: 0, delay: 380, duration: 200, ease: 'Stepped', easeParams: [4] });
      lost.obj.destroy();
      return;
    }
    const label = this.crispText(x, y - t * 0.75, '이번 턴 피해', t * 0.3, '#F4F1EA');
    const num = this.crispText(x, y, '0', t * 0.9, '#FACC15');
    const parts: Phaser.GameObjects.Text[] = [label.obj, num.obj];
    await new Promise<void>((done) =>
      this.tweens.addCounter({
        from: 0,
        to: damage,
        duration: Math.min(700, 250 + damage * 12) / this.speed,
        ease: 'Expo.easeOut',
        onUpdate: (tw) => {
          num.setText(String(Math.round(tw.getValue() ?? 0)));
          num.setScale(num.base * (1 + 0.25 * (1 - tw.progress)));
        },
        onComplete: () => done(),
      }),
    );
    num.setScale(num.base * 1.35);
    // 출렁임이 끝나면 정확히 기본 배율(글 텍스처 1픽셀 = 캔버스 1픽셀)로 돌려 놓는다 — Back 보간이 1 언저리 소수에서 멈추지 않게
    this.tweens.add({ targets: num.obj, scale: num.base, duration: 220, ease: 'Back.easeOut', onComplete: () => num.setScale(num.base) });
    // 처치 줄은 큰 숫자(0.9칸) 먹 테와 닿지 않게 0.85칸 아래 (예전 0.75칸은 숫자 아래 테에 붙었다)
    if (kills > 0) parts.push(this.crispText(x, y + t * 0.85, `처치 ${kills}`, t * 0.36, '#FACC15').obj);
    await this.wait(450 + this.summaryHold);
    await this.tween({ targets: parts, scaleY: 0, duration: 200, ease: 'Stepped', easeParams: [4] });
    for (const o of parts) o.destroy();
  }
  /** 디버그 (스토어 스크린샷 tools/qa/store-shots.cjs): 턴 합계가 자리 잡은 뒤 접히기 전에 더 머무는 ms */
  summaryHold = 0;

  /**
   * 판 위 큰 글 (턴 합계, D-073) — 갈무리 도트 한 칸이 캔버스 픽셀 정수 개가 되게 찍는다.
   * 예전에는 글자 크기를 월드 px(12 배수)로 두고 해상도를 판 배율(this.dpr)로 줬다: 일렉트론 2.0984 · 1.3989 같은 소수 배율에서는
   * 도트 한 칸이 2.1 · 1.4 캔버스 픽셀이 되어 획 굵기가 들쭉날쭉하고, 글 텍스처 폭이 올림되어 가장 가까운 픽셀로 늘려 그리며(pixelArt) 줄이 빠졌다.
   * 이제 캔버스 픽셀 단위 글 크기 = 12 × k (k = 월드 크기 × 배율 ÷ 12 반올림, 판 위 글 규칙 D-213의 12 배수)로 해상도 1에 찍고 1/배율로 줄여 놓는다 —
   * 정수 배율(웹 폰 2 · 3/2)에서는 예전과 같은 크기, 소수 배율에서는 가장 가까운 정수 도트 크기. 왼쪽 위 모서리도 캔버스 픽셀 정수에 맞춘다.
   * 돌려주는 base = 기본 배율(1/배율) — 키우고 줄이는 연출은 이 값에 곱한다.
   */
  private crispText(x: number, y: number, text: string, worldPx: number, color: string): { obj: Phaser.GameObjects.Text; base: number; setText: (s: string) => void; setScale: (s: number) => void } {
    const r = this.dpr;
    // 판 위 글 하한 12px(D-213)보다 작아지지 않게: 1.4배에서 12px → 도트 1칸이면 8.6px로 줄었다
    const k = Math.max(1, Math.ceil(r - 1e-6), Math.round((gpx(worldPx) * r) / 12));
    // 먹 테: 예전 굵기(월드 max(4, 크기/6))를 캔버스 픽셀로 옮겨 도트 2칸 단위로 — 캔버스 테는 획 가운데에 걸려 바깥으로 절반(도트 정수)이 나온다
    const stroke = Math.max(2 * k, Math.round((Math.max(4, worldPx / 6) * r) / (2 * k)) * 2 * k);
    const base = 1 / r;
    const obj = this.add
      .text(x, y, text, { fontFamily: 'Galmuri11, sans-serif', fontStyle: '700', fontSize: `${12 * k}px`, color, stroke: '#0B0B0E', strokeThickness: stroke })
      .setOrigin(0.5)
      .setDepth(10)
      .setResolution(1)
      .setScale(base);
    // 가운데 맞춤 글의 왼쪽 위가 캔버스 픽셀 사이에 걸리지 않게 (카메라 가운데 × 줌은 정수 — moveCamera)
    const snap = (): void => {
      obj.setPosition((Math.round(x * r - obj.width / 2) + obj.width / 2) / r, (Math.round(y * r - obj.height / 2) + obj.height / 2) / r);
    };
    snap();
    return {
      obj,
      base,
      setText: (s: string) => { if (obj.text !== s) { obj.setText(s); snap(); } },
      setScale: (s: number) => { obj.setScale(s); },
    };
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
    const box = this.pieceBox(key);
    const s = (N * box.size) / this.tile;
    g.drawImage(src, (N - s) / 2, (N * box.cy) / this.tile - s / 2, s, s);
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
    paceTrace('play');
    for (const e of events) {
      if (e.type === 'move' || e.type === 'attack') {
        const id = e.type === 'move' ? e.pieceId : e.attackerId;
        paceTrace(e.type, this.sprites.get(id)?.piece.side ?? -1, id);
      } else paceTrace(e.type);
      if (e.type === 'collapse') {
        cur.fallen = [...(cur.fallen ?? []), ...e.tiles.map((p) => p.y * cur.width + p.x)];
        this.announce('바닥이 꺼진다 — 칸 한 쌍이 톱니 아래로');
        this.shakeLv(2);
        this.drawTiles(cur);
        if (e.pushes.length) sfx('push');
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
          // D-538: 투명도 왕복 대신 두 번 계단 끄덕임(1도트 내려앉음)
          const ky = k.root.y, dd = t / BOARD_DOTS;
          for (const dy of [dd, 0, dd, 0]) { k.root.setY(ky + dy); await this.wait(150); }
          const ash = this.playCrumble(k);
          k.root.destroy();
          this.dropSprite(e.pieceId);
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
        const ghosts = this.calm ? [] : IMPACT.ghosts.map(() => this.add.image(0, 0, this.artKey(s.piece.type, s.piece.side, { form: s.piece.form })).setTintFill(0xffffff).setDepth(2.4).setVisible(false));
        const trail: { x: number; y: number }[] = [];
        let landAt = -1;
        await new Promise<void>((done) =>
          this.tweens.addCounter({
            from: 0,
            to: MOVE_TOTAL,
            // 박자 예산 (D-620): 이동 한 번 ≤ BEAT.move — 웅크림 → 가속 → 착지 출렁 비율은 그대로
            duration: Math.min(MOVE_TOTAL / this.speed, BEAT[s.piece.side === 1 ? 'foe' : 'mine'].move),
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
              // D-538: 잔상은 불투명 단색(흰 실루엣) — 착지 뒤 오래된 것부터 하나씩 계단으로 꺼진다(투명도 보간 없음)
              const gone = landAt < 0 ? 0 : Math.floor((ms - landAt) / 60) + 1;
              if (trail.length > 1)
                IMPACT.ghosts.forEach((gh, i) => {
                  const p0 = trail[Math.floor(gh.at * (trail.length - 1))];
                  const size = s.glyph.displayHeight * gh.scale;
                  ghosts[i]?.setVisible(i >= gone && i > 0).setPosition(p0.x + t / 2, p0.y + s.glyph.y).setDisplaySize(size * gh.stretch, size / gh.stretch);
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
          sfxFor('boardPromote');
        }
        continue;
      }
      if (e.type === 'blast') {
        // 특수 기믹은 일반 공격과 다른 모양으로 먼저 (D-203): 줄 폭격 = 불길이 줄을 훑는다 · 가시 반격 = 가시가 친 기물로 · 자폭 = 둘레 3×3 고리 · 증기 폭발 = 적마다 김
        if (e.fx) await this.gimmickFx(e.fx, e.pos, e.from, e.hits.map((h) => h.targetId), e.cells);
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
            this.dropSprite(sp.piece.id);
          }
        }
        await this.wait(260);
        continue;
      }
      if (e.type === 'mark') {
        // 적 편성 특성 (D-483): 띠 안내 + 그 기물들 위에 짧은 글 (수리 · 방진은 뒤따르는 heal · shield가 숫자를 띄운다)
        this.announce(e.label);
        // 받아치기 → 경직 · 헛방 (D-540 소리)
        if (e.tag === RAID_TEXT.stunTag) (sfx('parry'), this.time.delayedCall(200, () => sfx('stun')));
        else if (e.tag === RAID_TEXT.whiffTag) sfx('stun');
        for (const id of e.tag ? e.pieceIds : []) { const sp = this.sprites.get(id); if (sp) this.floatText(sp, e.tag, '#FCA5A5'); }
        await this.wait(e.tag ? 260 : 120);
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
      const beat = BEAT[atk.piece.side === 1 ? 'foe' : 'mine'];
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
        this.popText(m, t * 0.3);
      }
      // 합(+): 먼저 더해지는 피해를 청록으로, 곱(×) 왼쪽에 (D-205) — 「+12 ×1.5」 순서 = 식의 순서
      if (e.add) {
        const a = this.add
          .text(atk.root.x + t / 2 - (e.mult ? t * 0.55 : 0), atk.root.y - t * 0.35, `+${e.add}`, { fontFamily: 'Galmuri11, sans-serif', fontStyle: '700', fontSize: `${gpx(t * 0.32)}px`, color: '#7FDCEA', stroke: '#0B0B0E', strokeThickness: 4 })
          .setOrigin(0.5)
          .setDepth(9)
          .setResolution(this.dpr);
        this.popText(a, t * 0.3);
      }

      // 몸짓 → 기물별 공격 이펙트 (기물 중심에서 공격 범위로) → 이펙트가 닿는 순간 피격
      const kinds = [atk.piece.type];
      const tiles = e.area.map((a) => ({ key: `${a.x},${a.y}`, ...this.center(a) }));
      const base = { x: atk.root.x, y: atk.root.y };
      // 세기(피해·처치)가 클수록 뛰어올라 모았다가 터뜨린다 (D-064)
      // 박자 예산 (D-538 → D-620): 공격 1회 ≤ BEAT.attack, 처치가 있으면 공격 연출을 BEAT.killFx로 줄이고 무너짐을 타격 순간부터 겹쳐 흘린다
      const killing = e.hits.some((h) => h.killed && this.sprites.get(h.targetId)?.piece.type !== 'K');
      const fx = playAttackFx(this, { kinds, side: atk.piece.side, origin: { x: base.x + t / 2, y: base.y + t / 2 }, tiles, tile: t, power: fxPower(e.hits) }, this.speed, (pose) =>
        this.applyPose(atk, base.x, base.y, pose),
      killing ? beat.killFx : beat.attack);
      const t0 = this.time.now;
      const early: Promise<void>[] = [];
      fxTrace('attack', 0, killing ? 'kill' : 'hit');
      const hitsDone = e.hits.map((h) => {
        const ts = this.sprites.get(h.targetId);
        if (!ts) return Promise.resolve();
        const key = `${Math.round(ts.root.x / t)},${this.state.height - 1 - Math.round(ts.root.y / t)}`;
        return this.after(fx.impact.get(key) ?? fx.duration * 0.6).then(() => {
          // 큰 피해·처치: 화면 흔들림 + 휴대폰 진동 (D-064)
          const fb = impactFeedback(h.damage, !!h.killed, ts.piece.maxHp);
          // 흔들림은 처치에만, 휴대폰 진동은 킹이 쓰러질 때만 (2026-11-06 — 맞을 때마다 흔들리고 떨려서 정신없었다)
          if (fb && h.killed) {
            this.shakeLv(shakeLvOf(fb.intensity));
            if (!this.calm && ts.piece.type === 'K') (navigator as { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive !== false && navigator.vibrate?.(fb.vibrate);
          }
          // 타격 소리 (D-540): 내 킹이 맞으면 킹 피격 · 한 대에 HP 절반 넘게 깎이거나 배율이 붙으면 모루 일격 · 그 밖은 가벼운 쇠 소리
          const heavy = h.damage >= ts.piece.maxHp * 0.5 || (e.mult ?? 1) > 1.05;
          sfx(ts.piece.side === 0 && ts.piece.type === 'K' && h.damage > 0 ? 'kinghit' : heavy ? 'crit' : 'hit', this.combo++);
          // 방열판이 다 깨지는 순간 (D-630): 판이 피해를 받아 0이 되면 쇠 날개 꺾임 + 김
          if (h.shieldAbsorbed > 0 && ts.piece.shield > 0) {
            const left = Math.max(0, ts.piece.shield - h.shieldAbsorbed);
            ts.piece = { ...ts.piece, shield: left };
            if (left === 0) sfxFor('ventBreak');
          }
          this.applyHit(ts, h);
          // 쾌감 · 아픔 (D-104): 내 기물이 맞으면 화면 가장자리가 붉게 (피해 비율만큼), 쓰러지면 둔탁한 소리.
          // 처치는 아주 짧게 멈췄다 간다 (히트스톱)
          if (ts.piece.side === 0 && h.damage > 0) {
            vignette('bad', Math.min(1, (h.damage / Math.max(1, ts.piece.maxHp)) * 2.2 + (h.killed ? 0.4 : 0)));
            if (h.killed) sfx('hurt');
          }
          // 처치 (D-538): 무너짐을 타격 순간부터 — 다음 공격 · 입력과 겹쳐 흘러도 된다. 킹은 마무리 연출이 따로 맡는다
          if (h.killed && ts.piece.type !== 'K' && ts.root.active) {
            early.push(this.shatterPiece(ts, 1, 1, {}, beat.crumble));
            ts.root.destroy();
            this.dropSprite(ts.piece.id);
          }
        });
      });
      await Promise.all([...hitsDone, this.after(fx.duration)]);
      // 비상 퓨즈 (D-105): 내 기물이 HP 1로 버틴다
      for (const h of e.hits.filter((x) => x.fuse)) {
        const sp = this.sprites.get(h.targetId);
        if (sp) this.floatText(sp, '비상 퓨즈', '#FDE68A');
      }
      // 버팀 (옛 죽음의 생명, D-153): 이름 붙은 기물이 HP 1로 버틴다
      for (const h of e.hits.filter((x) => x.door)) {
        const sp = this.sprites.get(h.targetId);
        if (sp) this.floatText(sp, '버팀!', '#FCA5A5');
      }
      const checked = e.hits.find((h) => h.checked);
      if (checked) sfx('check');
      if (checked) this.announce(`체크! ${this.sprites.get(checked.targetId)?.piece.side === 0 ? '내' : '적'} 킹이 HP 1로 버틴다 — 한 대면 끝`);

      // 처치: 위에서부터 한 줄씩 검은 재가 되어 기물 발밑에 쌓였다 꺼진다 (D-048·D-050·D-052)
      const deaths = e.hits.filter((h) => h.killed).map((h) => this.sprites.get(h.targetId)).filter((s): s is PieceSprite => !!s);
      if (deaths.length || early.length) {
        sfx('kill');
        // 킹 마무리 (D-180 → D-184): 적 킹은 금빛, 내 킹은 은빛으로 같은 문법 — 응축 → 폭발 → 왕관
        const king = deaths.find((s) => s.piece.type === 'K');
        const rest = deaths.filter((s) => s !== king);
        const ashes = [...early, ...rest.filter((s) => s.root.active).map((s) => this.shatterPiece(s, 1, 1, {}, beat.crumble))];
        for (const s of rest) {
          if (!s.root.active) continue;
          s.root.destroy();
          this.dropSprite(s.piece.id);
        }
        if (king) await this.finisher(king, king.piece.side === 0);
        // 처치 1회 ≤ BEAT.kill (예비 시작부터, D-620): 남은 무너짐은 다음 행동과 겹친다
        else await Promise.race([Promise.all(ashes), this.after(Math.max(0, beat.kill - (this.time.now - t0)))]);
        void Promise.all(ashes).then(() => fxTrace('crumbleEnd', this.time.now - t0));
      }
      fxTrace('attackEnd', this.time.now - t0);
      order.destroy();
      // 공격과 공격 사이 숨 (D-204)
      await this.wait(PACE.hitGap / this.tempo);
    }
    if (events.some((e) => e.type === 'gameOver')) await this.wait(400);
    paceTrace('playEnd');
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
      this.poke();
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
        if (dragging) (this.moveCamera(down.sx - dx, down.sy - dy), this.poke());
        return;
      }
      if (!touchOf(p)) this.input2.hover(worldTile(p));
    });

    const up = (p: Phaser.Input.Pointer) => {
      this.poke();
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
    const dpr = renderScale(window.devicePixelRatio || 1);
    this.scene = new BoardScene();
    this.boardFx = new BoardFx(host, (p) => this.screenOf(p));
    this.scene.fxHook = this.boardFx;
    this.scene.announce = announce;
    this.scene.dpr = dpr;
    this.scene.clearBg = 'clear' in host.dataset;
    this.scene.input2 = input;
    // 보드 위 글자(피해 숫자·순번)가 대체 글꼴로 먼저 그려지지 않게 갈무리를 먼저 불러 둔다
    const fonts = Promise.all([document.fonts.load('12px Galmuri11'), document.fonts.load('700 12px Galmuri11'), document.fonts.load('15px Galmuri14')]).catch(() => undefined);
    this.whenReady = Promise.all([new Promise<void>((r) => (this.scene.ready = r)), fonts]).then(() => undefined);
    const { w, h } = this.size(dpr);
    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host,
      backgroundColor: '#110F15',
      transparent: this.scene.clearBg,
      scale: { mode: Phaser.Scale.NONE, width: w * dpr, height: h * dpr, zoom: 1 / dpr },
      scene: this.scene,
      banner: false,
      input: { activePointers: 2 },
      fps: { limit: RENDER.idleFps },
      // 줄여 그린 캔버스를 화면 크기로 늘릴 때 도트가 번지지 않게
      pixelArt: true,
      // 판은 소리를 내지 않는다 (효과음 · 음악은 src/audio) — Phaser가 쓰지 않는 AudioContext를 깨워 두지 않게 (코드 리뷰 7)
      audio: { noAudio: true },
    });
    this.game.canvas.style.imageRendering = 'pixelated';
    this.center(w, h);
    window.addEventListener('resize', () => this.resize());
    // 판이 안 보이는 화면(지도 · 고물상 · 보상 · 사건)에서는 판 그리기를 멈춘다 (D-240)
    new MutationObserver(() => this.sleepIfHidden()).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    const ov = document.getElementById('overlay');
    if (ov) new MutationObserver(() => this.sleepIfHidden()).observe(ov, { attributes: true, attributeFilter: ['hidden'] });
    this.game.canvas.addEventListener('webglcontextrestored', () => this.scene.poke());
    this.installQuiet();
    // 타이틀 · 컷신이 덮은 뒤에 만들어져도 처음부터 잠든다 (클래스가 다시 바뀔 때까지 기다리지 않게)
    void this.whenReady.then(() => this.sleepIfHidden());
  }

  /** 끝나지 않은 판 연출 (공개 함수가 돌려준 Promise) — 이 동안은 프레임을 건너뛰지 않는다 */
  private inflight = 0;
  /**
   * 가만히 있는 판은 다시 그리지 않는다 (D-533 — 배터리): 공개 함수를 부를 때마다 판을 「바뀜」으로 표시하고,
   * 돌려준 Promise가 끝날 때까지는 매 프레임 그린다. 그 밖에 판이 조용하면(BoardScene.quiet) 그 프레임의 Phaser 한 걸음을 통째로 건너뛴다 —
   * 캔버스는 마지막 그림을 그대로 보인다.
   */
  private installQuiet(): void {
    const proto = BoardRenderer.prototype as unknown as Record<string, unknown>;
    const skip = new Set(['constructor', 'size', 'resize', 'center', 'fpsLimit', 'sleepIfHidden', 'heat', 'screenOf', 'installQuiet', 'settled']);
    const self = this as unknown as Record<string, unknown>;
    for (const k of Object.getOwnPropertyNames(proto)) {
      const f = Object.getOwnPropertyDescriptor(proto, k)?.value as ((...a: unknown[]) => unknown) | undefined;
      if (skip.has(k) || typeof f !== 'function') continue;
      self[k] = (...a: unknown[]): unknown => {
        this.scene.poke();
        const r = f.apply(this, a);
        if (r instanceof Promise) {
          this.inflight += 1;
          // 창이 판을 덮어 잠든 동안 판 연출이 시작되면 깨운다 (끝나면 다시 잔다 — D-595)
          this.sleepIfHidden();
          const done = (): void => {
            this.inflight -= 1;
            this.scene.poke();
            this.sleepIfHidden();
          };
          r.then(done, done);
        }
        // whenReady 뒤에 미뤄 그리는 함수(render · setup …)도 그린 다음 프레임을 놓치지 않게
        void this.whenReady.then(() => this.scene.poke());
        return r;
      };
    }
    void this.whenReady.then(() => {
      const loop = this.game.loop as unknown as { callback: (time: number, delta: number) => void };
      const step = loop.callback;
      loop.callback = (time, delta) => {
        if (this.inflight === 0 && this.scene.quiet(time)) return;
        step(time, delta);
      };
    });
  }

  private hot = 0;
  /** 연출 중에는 60fps, 가만히 있을 때는 RENDER.idleFps (D-240 — 깜빡임 · 도는 과녁은 계단 박자라 30이면 충분) */
  private heat<T>(job: Promise<T>): Promise<T> {
    this.hot += 1;
    this.fpsLimit(0);
    this.sleepIfHidden();
    return job.finally(() => {
      this.hot = Math.max(0, this.hot - 1);
      if (!this.hot) this.fpsLimit(RENDER.idleFps);
      this.sleepIfHidden();
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
    // 창(#overlay — 보상 · 부품 고르기 · 덱 · 설정 …)이 판을 덮고 판 연출이 없으면 그리기를 멈춘다 (D-595: 측정 — 창 뒤에서 판이
    // 초당 7~13장을 다시 그려 GPU를 차지했고, 창 안 카드 띠 · 드러내기가 5fps로 떨어졌다. 판은 마지막 그림을 그대로 보인다)
    const ov = document.getElementById('overlay');
    const covered = ((!!ov && !ov.hidden) || cl.contains('cover-fx')) && this.inflight === 0 && this.hot === 0;
    const hidden = cl.contains('between') || cl.contains('cover-op') || cl.contains('cover-pl') || covered;
    if (hidden && loop.running) loop.sleep();
    else if (!hidden && !loop.running) (loop.wake(), this.scene.poke());
  }

  /** 판 캔버스 CSS 크기 — 그리는 배율을 곱해 캔버스 픽셀이 정수가 되는 가장 큰 정수 (D-525: 소수 픽셀 캔버스는 브라우저가 한 줄씩 늘려 이음매를 만든다) */
  private size(dpr = this.scene.dpr) {
    const fit = (v: number) => {
      const top = Math.max(1, Math.floor(v));
      for (let c = top; c > top - 64 && c > 0; c--) if (Math.abs(c * dpr - Math.round(c * dpr)) < 1e-6) return c;
      return top;
    };
    return { w: fit(this.host.clientWidth), h: fit(this.host.clientHeight) };
  }

  private resize(): void {
    this.scene.poke();
    const { w, h } = this.size();
    const dpr = this.scene.dpr;
    this.game.scale.resize(w * dpr, h * dpr);
    this.center(w, h);
  }
  /** 정수로 깎은 만큼(몇 px) 캔버스를 판 자리 가운데로 */
  private center(w: number, h: number): void {
    this.game.canvas.style.marginLeft = `${Math.floor((this.host.clientWidth - w) / 2)}px`;
    this.game.canvas.style.marginTop = `${Math.floor((this.host.clientHeight - h) / 2)}px`;
  }

  /** 적 특성 표식 (자폭 폰 · 가시 반격 반장, D-175) — setup 전에 */
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
  /** 판이 다 섰나 (장면 부팅 · 그림 · 글꼴) — 부팅 화면이 이것을 기다린 뒤 걷힌다 (D-593) */
  settled(): Promise<void> {
    return this.whenReady;
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
  setup(state: BattleState): void {
    void this.whenReady.then(() => {
      this.scene.setupBoard(state);
      // 판 위 도트 FX 층 (D-249): 반장 판이면 공기 FX, 기믹 순간 연출은 언제나
      this.boardFx.boardSize = { w: state.width, h: state.height };
      requestAnimationFrame(() => this.boardFx.setup(this.scene.bossRule));
    });
  }
  /** 판 커서 테 (D-533, 키보드 · 패드) — 칸 묶음(엔진 좌표, 왼아래 칸 + 폭 · 높이) 또는 null = 숨김 */
  setCursor(r: { x: number; y: number; w: number; h: number } | null): void {
    void this.whenReady.then(() => this.scene.setCursor(r));
  }
  /** 디버그: 판 위 기믹 연출을 바로 터뜨린다 */
  debugFx(k: 'row' | 'thorns' | 'stamp'): void {
    if (k === 'row') void this.boardFx.rowBomb(2, this.scene.state.width);
    else if (k === 'thorns') void this.boardFx.thorns({ x: 3, y: 5 }, { x: 1, y: 1 });
    else this.boardFx.stamp({ x: 3, y: 3 });
  }
  /** 이동 한 번(들기 → 착지)의 지금 길이 ms (D-553 카드 FX 박자) */
  moveMs(): number {
    return this.scene.moveMsNow;
  }
  /** 디버그 (스토어 스크린샷): 턴 합계가 자리 잡은 채 접히기 전에 더 머물 ms (0 = 보통) */
  debugSummaryHold(ms: number): void {
    this.scene.summaryHold = ms;
  }
  /** 디버그 (글자 잉크 점검 tools/qa/text-audit.cjs, D-558): 판 위 보이는 글마다 Phaser가 잰 글 텍스처 여백 */
  debugTexts(): { text: string; font: string; ascent: number; descent: number; padTop: number; padBottom: number; x: number; y: number }[] {
    const out: ReturnType<BoardRenderer['debugTexts']> = [];
    const walk = (list: Phaser.GameObjects.GameObject[]): void => {
      for (const o of list) {
        if (o instanceof Phaser.GameObjects.Container) { if (o.visible) walk(o.list); continue; }
        if (!(o instanceof Phaser.GameObjects.Text) || !o.visible || !o.text.trim()) continue;
        const m = o.style.getTextMetrics();
        out.push({ text: o.text, font: (o.style as unknown as { _font: string })._font, ascent: m.ascent, descent: m.descent, padTop: o.padding.top ?? 0, padBottom: o.padding.bottom ?? 0, x: o.x, y: o.y });
      }
    };
    walk(this.scene.children.list);
    return out;
  }
  /** 판 칸 하나의 화면 가운데 (CSS px) — 판 밖 DOM 연출(초월 등)이 그 칸을 겨눈다 */
  screenOf(pos: Pos): { x: number; y: number } {
    const sc = this.scene;
    // 장면이 아직 서지 않았으면 (Phaser 부팅 · 첫 render 전 — 판을 막 불러온 직후의 바크 · 엿보기) 판 자리 가운데로 어림한다
    if (!sceneLive(sc as unknown as Parameters<typeof sceneLive>[0])) return hostCenter(this.host);
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
