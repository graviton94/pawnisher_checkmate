/**
 * 비주얼 노벨 연출 층 (D-554, 소유자: 「장면 · 대사를 비주얼 노벨처럼 — 그림이 너무 정적이다」). 새 그림 없이(D-386)
 * 이미 있는 장면 그림 · 화면 부품만 쓴다. 이 파일은 데이터만 — 재생은 slice/vn.ts · opening.playCuts.
 *  - 서 있는 배우 (D-580 — D-572 「일러스트에 판 도트 말을 붙이지 않는다」): 그림이 있는 컷에는 절대 세우지 않는다 — 인물은 그림이 그림 화풍대로
 *    이미 그려 왔다. 화자는 명패(이름 · 그림에서 오린 얼굴)로 드러난다. 배우 길(72칸 도트 정수배 · 디더 그늘)은 그림 없는 컷이 VN_SCENE에서
 *    noCast: false로 따로 열 때만 남는다 — 지금 연 컷은 없다(먹 무대 D-579도 도트 말 없이 추상으로).
 *  - 장면 분위기: 컷(slug)마다 입자(증기 · 불똥 · 먼지 · 재) · 등잔 깜빡 · 켄 번스 방향 · 원근(입자 층이 카메라보다 빨리 흐름).
 *  - 줄 단위: script.ts의 Line.shot(카메라) · fx(흔들림 · 번쩍 · 경보)는 그대로, 여기서 더하는 것은 줄 번호별 덧연출(stage).
 * 종이왕은 K0 정본 도트만 (D-424 — 폰 + 옛 왕관 합성 금지).
 */
import type { PieceType } from '../engine';

/** 배우 도트: 기물 유형 · 진영 (public/pieces/l-<t><side>.png) */
export interface CastSprite { t: PieceType; side: 0 | 1 }

/**
 * 화자 → 서 있는 도트 (그림 없는 컷이 배우를 열 때만 — castOn). 여기 없는 이름은 컷신 faces(출하 분대원 { t, side })에서 찾고, 그래도 없으면 배우를 세우지 않는다(명패만).
 * 아홉째 폰은 종이 왕관을 접기 전이라 맨 폰(P0), 그 뒤는 종이왕(K0 정본). 반장 · 도금왕은 검은 세트의 킹 도트.
 */
export const VN_CAST: Record<string, CastSprite> = {
  종이왕: { t: 'K', side: 0 },
  '아홉째 폰': { t: 'P', side: 0 },
  '흰 퀸': { t: 'Q', side: 0 },
  '흰 룩': { t: 'R', side: 0 },
  박차: { t: 'N', side: 0 },
  도금왕: { t: 'K', side: 1 },
  '용해 주조기': { t: 'R', side: 1 },
};
/** 반장 이름(…반장)은 모두 검은 킹 도트 */
export const castOf = (who: string | undefined): CastSprite | undefined => (!who ? undefined : VN_CAST[who] ?? (/반장$/.test(who) ? { t: 'K', side: 1 } : undefined));

/** 장면 입자 (pxfx 도트 그대로 — 그라데이션 없음) */
export type VnAir = 'steam' | 'sparks' | 'dust' | 'ash' | 'embers' | 'none';
export interface VnScene {
  /** 떠다니는 입자 */
  air?: VnAir;
  /** 등잔 깜빡 (일부러 정지 동작 — 몇 초에 한 번 두 프레임 어두워짐) */
  lamp?: boolean;
  /** 켄 번스 방향 (초점 변화 부호, 생략하면 여유가 큰 쪽) */
  drift?: { x: number; y: number };
  /** 배우를 세우지 않는다 — 기본(VN_DEFAULT)이 true (D-580). false = 그림 없는 컷에서만 배우를 연다 (그림이 있으면 무시 — castOn) */
  noCast?: boolean;
}

/**
 * 컷(slug)별 분위기. 없는 컷은 VN_DEFAULT. 공장 바닥 = 증기 · 먼지, 용광로 · 주조 = 불똥 · 불씨, 끝 장면 = 재.
 * 원근: 입자 층은 켄 번스보다 1.6배 빨리 흐른다(slice/vn.ts) — 그림을 층으로 나누지 않고도 앞뒤가 생긴다.
 */
export const VN_SCENE: Record<string, VnScene> = {
  '쇳내 나는 요람': { air: 'steam', drift: { x: 0, y: 1 } },
  '태엽이 감기는 순간': { air: 'dust', lamp: true },
  '용광로의 침묵': { air: 'embers', drift: { x: 0, y: -1 } },
  '잘못 놓인 아홉 번째 폰': { air: 'dust' },
  '불량 딱지': { air: 'sparks', lamp: true },
  '금단의 소문': { air: 'dust', drift: { x: 0, y: -1 } },
  '상자 안의 다툼': { air: 'dust', lamp: true },
  '종이 왕관': { air: 'dust' },
  '부관 박차': { air: 'steam' },
  '검은 세트와 먼 왕좌': { air: 'steam', drift: { x: 0, y: -1 } },
  '용해 주조': { air: 'embers' },
  '금빛 거푸집': { air: 'embers', lamp: true },
  '새 도금왕의 왕좌': { air: 'sparks' },
  '상자째 용광로로': { air: 'embers' },
  '풀리는 태엽': { air: 'ash' },
  '왕관을 던지다': { air: 'sparks' },
  '톱니에 박힌 왕관': { air: 'sparks' },
  '멈춘 공장': { air: 'ash', drift: { x: 1, y: 0 } },
  '하얀 땅': { air: 'ash' },
  '첫걸음': { air: 'dust', drift: { x: 1, y: 0 } },
};
export const VN_DEFAULT: VnScene = { air: 'dust', noCast: true };
/**
 * 이 컷에 배우를 세우는가 (D-580 · D-572): 그림이 있으면 절대 아니다 — 판 도트 말을 일러스트 위에 겹치지 않는다.
 * 그림이 없어도 VN_SCENE이 noCast: false로 연 컷만 (끝 정적 · 먹 무대 · 자리 그림은 부르는 쪽이 따로 막는다).
 */
export const castOn = (slug: string | undefined, art: boolean): boolean => !art && (slug ? VN_SCENE[slug]?.noCast === false : false);

/** 서 있는 배우 수치 (기기 픽셀 · ms) */
export const VN_ACTOR = {
  /** 배우 키 = 장면 칸 높이의 이 비율 안의 가장 큰 72칸 정수배 */
  height: 0.62,
  /** 첫 배우 가운데 (장면 칸 폭 비율) — 우리 편 0.38 · 적 0.62: 띠 위 화자 명패(가장자리)와 덜 겹치는 안쪽, 서로 마주 본다 */
  center: 0.38,
  /** 같은 편 둘째 배우는 이만큼 바깥쪽 (칸 폭 비율) */
  step: 0.17,
  /** 72칸 도트 안 몸 가로 범위 (칸) — 서 있는 배우 중 가장 넓은 종이왕(K0) 7..62. 명패 · 다른 배우와 띄울 때 이 몸만 잰다 */
  body: [7, 62] as const,
  /** 몸과 명패 · 몸과 몸 사이 (72칸 도트 칸) */
  gap: 2,
  /** 들어옴 · 나감 (ms) · 들어오는 거리 (CSS px) */
  enter: 460,
  exit: 360,
  slide: 56,
  /** 말하지 않는 배우의 그늘: 어두운 판(같은 도트를 명도만 낮춘 그림)이 64단 디더로 덮인다 — 다 덮이면 단색 그늘(체크 무늬가 남지 않는다) · 바뀌는 시간 */
  dim: 64,
  dimMs: 240,
  /** 한 무대 최대 배우 */
  max: 3,
} as const;

/** 장면 입자 수치: 도트 크기(기기 픽셀) · 동시 수 · 속도(도트/초) */
export const VN_AIR = {
  dot: 3,
  count: { steam: 26, sparks: 18, dust: 22, ash: 28, embers: 22, none: 0 } as Record<VnAir, number>,
  /** 원근: 입자 층이 카메라 켄 번스보다 이 배수로 흐른다 */
  parallax: 1.6,
  /** 등잔 깜빡 간격 (ms, 이 사이 무작위) · 어두워지는 시간 */
  lampEvery: [2600, 5200] as const,
  lampMs: 70,
} as const;

/** 대사 기록 (백로그) 창 글 */
export const VN_TEXT = {
  log: '기록',
  logTitle: '지난 대사',
  close: '닫는다',
  /** 창에 보이는 마지막 줄 수 (스크롤 없이 M 창 세로 364 안 — game-ui-design 4.3) */
  logLines: 6,
} as const;

/**
 * 먹 무대 (D-579, 사장님 결정 「비주얼 일러스트 없이, 묘사 및 텍스트와 효과로만」): 그림 없는 컷(Cut.dark)의 도트 효과 수치.
 * 그림 · 기물 도트를 그리지 않는다 — 청록 작업등 빛줄기 · 붉은 경고등 · 컨베이어 띠 · 떨어지는 흰 빛 조각 · 부딪힘 먼지 · 칸 표시(작은 네모)만.
 * 칸 = 전환 막 칸과 같은 크기(기기 픽셀 round(6·DPR)), 빛은 3단 계단 + 4×4 베이어(그라데이션 없음). 재생은 slice/darkcut.ts.
 * 비트(Line.beat): rumble = 띠가 돌고 등이 켜짐 · drop = 집혀 오름 → 매달림 → 떨어짐 → 부딪힘 · count = 여덟 칸이 차례로 켜지고 아홉째가 깜빡 · hush = 빛이 좁아져 아홉째만 남음.
 */
export type DarkBeat = 'rumble' | 'drop' | 'count' | 'hush';
export const VN_DARK = {
  /** 한 칸 = 기기 픽셀 round(dot × DPR) — 전환 막(film.Wipe) 칸과 같은 굵기(장면 도트 × 2): 그림 없는 칸에서 표시가 작아 보이지 않게 */
  dot: 6,
  /** 등이 켜지는 시간 (ms) · 켜지다 한 번 꺼지는 깜빡(시작 ms, 길이 ms) */
  lightOn: 520,
  flicker: [180, 70] as const,
  /** 작업등 빛줄기: 위 끝 반폭 · 바닥 반폭(칸) · 좌우 흔들림(칸, 주기 ms) — 정수 칸씩만 옮겨 계단으로 쓸린다 */
  cone: { top: 3, bottom: 30, sway: 5, swayMs: 5200, hush: 0.22, hushMs: 900 },
  /** 붉은 경고등: 켜짐 · 꺼짐 (ms, 계단 깜빡) · 조용해지면(hush) 느리게 */
  lamp: { on: 620, off: 620, hushMul: 1.8 },
  /** 컨베이어 띠: 홈 간격(칸) · 한 칸 밀리는 간격(ms) · 덜컹(1칸 위아래, ms 간격) · 처음 화면 흔들림 두 번(ms) */
  belt: { groove: 6, stepMs: 90, jolt: 380, shakeAt: [0, 300] as const },
  /** drop: 집혀 오름(예비) → 매달려 흔들림 → 떨어짐(가속) → 부딪힘 hero 프레임 → 눌림 · 출렁 (ms) */
  drop: { lift: 380, carry: 1150, fall: 260, hero: 70, settle: 360, swayMs: 170 },
  /** 부딪힘: 쇳가루 · 먼지 수 · 빛 반지름(칸) */
  impact: { grit: 16, dust: 9, light: 16 },
  /** count: 여덟 칸이 하나씩 켜지는 간격 (ms) · 아홉째 깜빡 횟수 */
  count: { stepMs: 110, blinks: 2, blinkMs: 140 },
} as const;
