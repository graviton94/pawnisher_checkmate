import type { CommandId } from './cards';
import type { Crew } from './crew';
import type { SliceEventId } from './events';
import type { SlicePartId } from './parts';
import { ASC_MAX } from './run';

/**
 * 저장 · 이어하기 · 기록 (R6, D-174). 화면과 무관한 순수 로직 — 저장소는 주입한다 (테스트는 메모리).
 * 저장 시점: 지도에 설 때 · 대국을 시작할 때. 대국 중간에 나가면 그 대국 처음부터 이어 간다.
 */
export interface RunSave {
  v: 1;
  seed: number;
  asc: number;
  /** 오늘의 출하 (날짜 시드) — 기록에만 따로 남는다 */
  daily: string | null;
  runId: string;
  actI: number;
  rowI: number;
  picked: number[][];
  squad: Crew[];
  deck: CommandId[];
  parts: SlicePartId[];
  gold: number;
  won: number;
  stage: number;
  refined: CommandId[];
  eventBag: SliceEventId[];
  /** 출하 난수 상태 (보상 · 사건 · 대국 시드가 같은 순서로 이어지게) */
  rng: number;
  /** 'map' = 지도에서, 'battle' = 그 줄의 node번째 대국 처음부터 */
  at: 'map' | 'battle';
  node?: number;
}

/** 쌓이는 기록 (출하를 넘어 남는다) */
export interface Meta {
  runs: number;
  clears: number;
  /** 열린 승급 단계 (0 = 기본만) */
  ascOpen: number;
  /** 가장 멀리 간 막 */
  bestAct: number;
  /** 오늘의 출하: 날짜 → 결과 (첫 시도만 남긴다) */
  daily: Record<string, { cleared: boolean; act: number; won: number }>;
}

export interface Store {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

export const SAVE_KEY = 'pawnisher.slice.save';
export const META_KEY = 'pawnisher.slice.meta';

/** 저장소를 못 쓰는 환경(사생활 보호 창 등)에서도 이번 실행 동안은 기억한다 */
const memory = (): Store => {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
};
const mem = memory();
export const defaultStore = (): Store => {
  try {
    const t = '__pc';
    localStorage.setItem(t, t);
    localStorage.removeItem(t);
    return localStorage;
  } catch {
    return mem;
  }
};

const safe = <T>(fn: () => T, fallback: T): T => {
  try {
    return fn();
  } catch {
    return fallback;
  }
};

export const writeSave = (st: Store, s: RunSave): void => safe(() => st.setItem(SAVE_KEY, JSON.stringify(s)), undefined);
export const readSave = (st: Store): RunSave | null =>
  safe(() => {
    const raw = st.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as RunSave;
    return s && s.v === 1 && Array.isArray(s.squad) && s.squad.length ? s : null;
  }, null);
export const clearSave = (st: Store): void => safe(() => st.removeItem(SAVE_KEY), undefined);

export const emptyMeta = (): Meta => ({ runs: 0, clears: 0, ascOpen: 0, bestAct: 0, daily: {} });
export const readMeta = (st: Store): Meta => safe(() => ({ ...emptyMeta(), ...(JSON.parse(st.getItem(META_KEY) ?? '{}') as Partial<Meta>) }), emptyMeta());

/** 출하가 끝났을 때 기록을 더한다. 승급 n을 끝내면 n+1이 열린다 (오늘의 출하는 승급을 열지 않는다) */
export const recordRun = (m: Meta, r: { cleared: boolean; act: number; won: number; asc: number; daily: string | null }): Meta => {
  const out: Meta = { ...m, daily: { ...m.daily } };
  out.runs += 1;
  if (r.cleared) out.clears += 1;
  out.bestAct = Math.max(out.bestAct, r.cleared ? 4 : r.act);
  if (r.cleared && !r.daily && r.asc >= out.ascOpen) out.ascOpen = Math.min(ASC_MAX, r.asc + 1);
  if (r.daily && !out.daily[r.daily]) out.daily[r.daily] = { cleared: r.cleared, act: r.act, won: r.won };
  return out;
};
export const writeMeta = (st: Store, m: Meta): void => safe(() => st.setItem(META_KEY, JSON.stringify(m)), undefined);

/** 오늘 날짜 (지역 시각) 「2026-11-02」 */
export const todayKey = (d = new Date()): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
/** 날짜 → 시드 (모두가 같은 지도 · 같은 분대 · 같은 보상 순서) */
export const dailySeed = (key: string): number => {
  let h = 2166136261;
  for (const ch of key) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h & 0xffffff;
};
