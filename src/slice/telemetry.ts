/**
 * 플레이테스트 기록 (D-234, 보고서 3 템플릿 3-B — 7대 지표).
 * 서버 없이 기기 안(localStorage)에만 쌓고 테스터가 「기록 보내기」로 JSON을 복사 · 저장해 넘긴다.
 * 사건 이름은 보고서의 로그 이벤트 그대로: ftue_step · battle_result · session_exit · gameover_inventory · draft_choice · telegraph_resolution · tooltip_inspect.
 * 게임 상태를 바꾸지 않는다 (엔진 결정론과 무관 — 시각 · 저장소만 쓴다). 집계: `node tools/playtest-report.cjs <파일...>`
 */

export const TELEMETRY_KEY = 'pawnisher.telemetry';
/** 한 기기에 남기는 사건 수 상한 (오래된 것부터 버린다) — 한 판 ≈ 200~400건 */
export const TELEMETRY_MAX = 4000;

export interface TelemetryEvent {
  /** 사건 이름 */
  e: string;
  /** 기록 시각 (ms, 기기 시계) */
  t: number;
  /** 세션 (앱을 켤 때마다 새로) */
  sid: string;
  [k: string]: unknown;
}

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const sid = `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
let store: Store | null = null;
let buf: TelemetryEvent[] | null = null;

/** 저장소 정하기 (테스트는 가짜 저장소) */
export const telemetryStore = (s: Store | null): void => {
  store = s;
  buf = null;
};

const load = (): TelemetryEvent[] => {
  if (buf) return buf;
  try {
    buf = JSON.parse(store?.getItem(TELEMETRY_KEY) ?? '[]') as TelemetryEvent[];
    if (!Array.isArray(buf)) buf = [];
  } catch {
    buf = [];
  }
  return buf;
};

/** 사건 하나를 남긴다 (실패해도 게임은 그대로) */
export const track = (e: string, data: Record<string, unknown> = {}): void => {
  const list = load();
  list.push({ e, t: Date.now(), sid, ...data });
  if (list.length > TELEMETRY_MAX) list.splice(0, list.length - TELEMETRY_MAX);
  try {
    store?.setItem(TELEMETRY_KEY, JSON.stringify(list));
  } catch {
    /* 저장소가 가득 차면 버린다 */
  }
};

/** 쌓인 기록 전체 */
export const telemetryAll = (): TelemetryEvent[] => [...load()];

/** 기록 지우기 (보낸 뒤) */
export const telemetryClear = (): void => {
  buf = [];
  try {
    store?.removeItem(TELEMETRY_KEY);
  } catch {
    /* 무시 */
  }
};

/** 이번 세션 이름 */
export const telemetrySession = (): string => sid;
