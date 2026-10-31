/**
 * 공격 연출 박자와 고른 안 (GDD 12장 §12.3, D-035·D-036).
 * 그래픽 결정은 FX 랩 아티팩트(tools/fxlab)에서 사용자가 보고 고른다. 고른 안을 여기 적으면 게임에 그대로 쓰인다.
 * 곡선은 선형이 아니라 지수형: 모을 때는 천천히→빠르게(ease-in expo), 터질 때는 빠르게→천천히(ease-out expo).
 */

/** 이동 (ms, 1배속): 들기 → 지수형 이동 → 착지 출렁임 */
export const MOVE_MS = { lift: 80, travel: 230, land: 130 };

/** 공격 박자 (ms, 1배속). 1회 ≤ 1초 (D-036, 속도 옵션으로 줄인다) */
export const FX_MS = {
  /** 폰: 뒤로 당겼다(예비 동작) → 칼날 */
  pawn: { wind: 190, slash: 230, impact: 70 },
  /** 나이트: 앞발 들고 방전 모으기 → 내려찍기 → 11시부터 시계 방향 번개 (각 번개: 계단식 선도 → 귀환 섬광 → 깜빡임) */
  knight: { wind: 230, slam: 60, gap: 50, leader: 70, stroke: 30, tail: 190 },
  /** 비숍: 떠오르며 응축 (느리게→빠르게) → 사거리 전체 한 번에 굵게 → 사그라듦 */
  bishop: { charge: 380, fade: 240 },
  /** 룩: 높이 들고 → 멈칫 → 내리꽂기 → 십자 연쇄 */
  rook: { lift: 200, hang: 50, slam: 60, first: 40, step: 70, burst: 180 },
  /** 퀸 C 회전 광선: 떠올라 톱니 고리 → 등대처럼 한 바퀴 휩쓸기 */
  queenSweep: { wind: 260, sweep: 480, fade: 90 },
  /** 퀸 D 톱날 부메랑: 톱날을 돌려 띄우고 → 8방향으로 던짐 → 끝에서 돌다가 → 되돌아옴 */
  queenSaw: { wind: 240, out: 210, spin: 60, back: 190 },
  /** 퀸 A 8방향 섬광 (비교용) */
  queen: { charge: 300, fade: 220 },
  /** 킹: 홀을 치켜들고 → 내려침 → 파동 */
  king: { wind: 200, slam: 60, wave: 240 },
  splash: { burst: 170 },
};

export type QueenFx = 'A' | 'C' | 'D';
export type KingFx = 'A' | 'B';

/** 퀸·킹 안 — 사용자 결정 (D-038): 퀸 D 톱날 부메랑, 킹 B 종소리 파동 */
export const FX_CHOICE: { Q: QueenFx; K: KingFx } = { Q: 'D', K: 'B' };

/** 안 이름 (FX 랩 표시용) */
export const FX_VARIANT_NAMES: { Q: Record<QueenFx, string>; K: Record<KingFx, string> } = {
  Q: { C: '회전 광선 (등대)', D: '톱날 부메랑', A: '8방향 섬광 (이전 안)' },
  K: { B: '종소리 파동', A: '사각 충격파' },
};

/**
 * 공격 세기 연출 (D-064): 피해가 크고 처치가 많을수록 기물이 뛰어올라 더 오래 모았다가 내려찍으며 터뜨린다.
 * 세기(0~1) = 준 피해 합 × perDamage + 처치 수 × perKill. 모으는 시간은 공격 1회 1초 상한 안에서만 늘린다 (D-036).
 */
export const FX_POWER = {
  perDamage: 0.08,
  perKill: 0.3,
  /** 세기 1일 때 더 모으는 시간 (ms) */
  charge: 280,
  /** 세기 1일 때 뛰어오르는 높이 (칸) */
  leap: 0.32,
  /** 내려찍는 시간 (ms) — 원래 공격이 시작되는 순간에 땅에 닿는다 */
  release: 90,
  /** 공격 1회 상한 (ms) */
  maxTotal: 1000,
};

/** 화면 흔들림·진동 (D-064): 한 번에 damage 이상 맞히거나 처치하면. intensity는 화면 크기 대비 비율 (Phaser 카메라와 같은 뜻) */
export const FX_SHAKE = { damage: 4, ms: 160, intensity: 0.005, killIntensity: 0.009, vibrateHit: 25, vibrateKill: 45 };
/**
 * 타격 카메라 (D-115): 공격이 닿은 거리만큼 — 붙어서 치면 그쪽으로 당겨 들어가고(줌 인), 멀리 닿으면 물러나 판을 보여 준다(줌 아웃).
 * 큰 피해(대상 최대 HP 대비)는 흔들림을 키우고, 처치는 한 번 더 툭 당긴다. 배율은 기본 줌(DPR) 대비.
 */
export const FX_CAMERA = {
  /** 닿은 거리(칸, 체비셰프) → 줌 배율: 1칸 · 2칸 · 3칸 이상 */
  near: 1.1,
  mid: 1.04,
  far: 0.92,
  /** 줌 인 때 공격 지점 쪽으로 끌려가는 비율 (0 = 그대로, 1 = 지점 한가운데) */
  pull: 0.3,
  inMs: 200,
  outMs: 320,
  /** 처치: 짧게 한 번 더 당긴다 */
  killPunch: 0.035,
  killPunchMs: 90,
  /** 흔들림 세기 = 기본 × (1 + 피해/최대 HP × k), 최대 maxMult 배 */
  shakeByRatio: 2.2,
  shakeMaxMult: 2.6,
};

/** 턴 합계 (D-073·D-074): 처치가 있거나 준 피해가 bigDamage 이상인 "큰 턴"만 판 가운데 크게, 나머지는 위쪽에 작게 */
export const TURN_SUMMARY = { bigDamage: 40 };
