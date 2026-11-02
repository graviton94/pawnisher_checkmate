/**
 * 공격 연출 박자와 고른 안 (GDD 12장 §12.3, D-035·D-036).
 * 그래픽 결정은 FX 랩 아티팩트(tools/fxlab)에서 사용자가 보고 고른다. 고른 안을 여기 적으면 게임에 그대로 쓰인다.
 * 곡선은 선형이 아니라 지수형: 모을 때는 천천히→빠르게(ease-in expo), 터질 때는 빠르게→천천히(ease-out expo).
 */

/** 이동 (ms, 1배속): 들기 → 지수형 이동 → 착지 출렁임 */
/** D-180: 들기 → 웅크림(예비 동작, 길게), 이동은 가속, 착지는 길게 출렁 */
export const MOVE_MS = { lift: 170, travel: 150, land: 230 };

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

/**
 * 타격감 연구실 확정안 (D-180, 아티팩트 https://claude.ai/artifact/MWkNrybMzHSEsvCUD5CKWd 6판).
 * 원리: 모으기는 길게 · 터짐은 한 박 · 정지는 분명히 · 여운은 길게. FX는 판 칸과 같은 도트(칸당 16)로만.
 */
export const IMPACT = {
  /** 이동: 웅크림(예비) → 가속 이동 → 착지 출렁 */
  move: { crouch: 170, travel: 150, land: 230 },
  /** 흰 그림자 잔상 셋: 경로 위치 · 투명도 · 크기 · 늘어짐 (오래된 것일수록 작고 옅고 길다) */
  ghosts: [
    { at: 0.38, alpha: 0.16, scale: 0.8, stretch: 1.22 },
    { at: 0.66, alpha: 0.3, scale: 0.88, stretch: 1.12 },
    { at: 0.86, alpha: 0.5, scale: 0.95, stretch: 1.05 },
  ],
  /** 맞은 쪽 찌그러짐 → 출렁 복귀 */
  squash: { sx: 1.16, sy: 0.84, ms: 420 },
  /** 정지 프레임 (ms): 타격(피해 비율로 70~120) · 처치 · 킹 처치 */
  stop: { min: 70, max: 120, kill: 200, king: 120 },
  /** 처치: 기물 그림 16조각 · 불씨 · 도트 고리 */
  shatter: { ms: 900, embers: 22, ringMs: 520 },
  /** 킹 마무리 (D-180): 멈춤 → 총알 시간(빛의 금) → 슬로 산산이 → 왕관. 반장이면 영화 띠 */
  finisher: { hold: 120, crack: 650, charge: 750, shatterMs: 1500, crownMs: 1100, bossBars: 24 },
  /** 처치 조각 수 (보로노이 — 그림을 들쭉날쭉하게 오린다, D-184) */
  shards: 14,
  /** 내 기물 피격 (연구소 「내가 맞을 때」): 붉은 실루엣 · 좌우 감쇠 떨림 */
  hurt: { flash: 90, tremble: 500, amp: 0.06 },
  /** 강타 (최대 HP의 heavyAt 이상): 붉은 컷 · 정지 두 배 · 반 칸 밀림 → 출렁 복귀 · 가장자리 맥 두 번 */
  heavy: { heavyAt: 0.4, cut: 60, knock: 0.25, knockMs: 140, back: 420 },
  /** 밀치기 충돌: 감속 미끄러짐 → 가로 납작 → 출렁 */
  push: { slide: 280, squash: 0.65, wobble: 550 },
  /** 연쇄 (같은 턴 처치마다): 정지가 길어진다 ×(1 + streak·k), 최대 max배 */
  chain: { k: 0.55, max: 2.4 },
  /** 적 예고 과녁: 2배 크기 · −40°에서 떨어져 철컥 박힌다 */
  aim: { drop: 160, fromScale: 2, fromAngle: -40 },
  /** 원수 낙하: 그림자 · 낙하 · 판 물결 */
  drop: { shadow: 600, fall: 120, ripple: 900 },
  /** 자원 희생: 웅크림 · 도약 · 킹 미끄러짐 */
  sacrifice: { crouch: 250, leap: 220 },
} as const;
