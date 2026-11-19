/**
 * 공격 연출 박자와 고른 안 (GDD 12장 §12.3, D-035·D-036).
 * 그래픽 결정은 「그래픽 정본」 아티팩트(tools/artguide, D-220)에서 사용자가 보고 고른다. 고른 안을 여기 적으면 게임에 그대로 쓰인다.
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

/** 안 이름 (표시용) */
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
export const FX_SHAKE = { damage: 4, ratio: 0.35, ms: 160, intensity: 0.003, killIntensity: 0.005, vibrateHit: 25, vibrateKill: 45 };
/**
 * 공격 박자 예산 (D-538, 실제 걸리는 ms — PACE.fx · 템포 배율을 친 뒤): 공격 1회 ≤ 1초 (CLAUDE.md UI 원칙 6).
 * attack = 처치 없는 공격 연출 상한. 처치가 있으면 연출을 killFx로 줄이고, 무너짐(crumble)을 타격 순간부터 겹쳐
 * 예비 시작 → 무너짐 끝이 kill 안에 든다(넘친 무너짐은 다음 행동과 겹친다). 킹 마무리(D-180)는 대국을 끝내는 연출이라 따로.
 * 옛 타격 카메라(D-115 줌 · 당김 FX_CAMERA)는 소수 배율이라 뺐다.
 */
/** 흔들림 세기 = 기본 × (1 + 피해/최대 HP × k), 최대 maxMult 배 (옛 FX_CAMERA에서 남긴 몫) */
export const FX_SHAKE_SCALE = { shakeByRatio: 2.2, shakeMaxMult: 2.6 };
export const FX_BUDGET = { attack: 900, killFx: 640, crumble: 340, kill: 1000 };

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
  /** D-538: 처치 정지 200 → 110 (처치 1회 ≤ 1초 예산 안) */
  stop: { min: 70, max: 120, kill: 110, king: 120 },
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
  chain: { k: 0.3, max: 1.6 },
  /** 적 예고 과녁: 2배 크기 · −40°에서 떨어져 철컥 박힌다 */
  aim: { drop: 160, fromScale: 2, fromAngle: -40 },
  /** 원수 낙하: 그림자 · 낙하 · 판 물결 */
  drop: { shadow: 600, fall: 120, ripple: 900 },
} as const;

/**
 * 판 그리기 예산 (D-240, 사용자: 「게임이 죄다 버벅인다」 — 측정: CPU 4배 느린 폰에서 대국 화면 19fps, 판 캔버스가 비용의 거의 전부).
 * dprCap = 판을 그리는 해상도 상한 (폰 배율 3 → 1.5 · 4 → 2) · idleFps = 연출이 없을 때 판 프레임 상한 (연출 중에는 상한 없음).
 * D-525: 상한은 기기 배율을 정수로 나눌 수 있을 때만 쓴다 (캔버스 → 화면이 정수배 늘림이어야 도트가 고르다). dprMin = 나눠 쓸 배율의 하한 —
 * 2.625처럼 정수로 나눠 1.5 이상 · 2 이하가 안 나오는 소수 배율은 기기 배율 그대로 그린다 (1.3125배 늘림의 들쭉날쭉한 줄 · 흰 줄을 없앰).
 */
export const RENDER = { dprCap: 2, dprMin: 1.5, idleFps: 30 };

/**
 * 카드 사용 연출 박자 (D-553, ms · 1배속). 손패의 카드 표(아이콘 패)가 예비 동작(lead) → 대상까지 날고(fly) → 대상에서 계열 FX.
 * 쓰는 쪽 `src/slice/cardfx.ts`. 예비 + 비행 + 계열 FX가 0.8초 안 (D-180 박자), 대상 기물을 가리는 것은 칸 모서리 · 머리 위만.
 * clamp: 죔쇠가 모서리로 박히는 때 · rivet: 리벳 도장 · hold: 머묾 끝 · out: 디더 네 계단 퇴장 ·
 * drop: 기름 방울 하나 떨어지는 데 · gap: 방울 사이 · tick: 톱니 한 칸 도는 간격 · deal: 덱에서 손패로 한 장 · stagger: 장 사이 ·
 * flag: 지휘 깃발이 킹에서 그 기물까지 · num: 대상 위 숫자 머묾
 */
export const CARD_FX = { lead: 70, fly: 200, clamp: 150, rivet: 210, hold: 380, out: 100, drop: 120, gap: 70, tick: 80, deal: 240, stagger: 80, flag: 260, num: 560 } as const;
