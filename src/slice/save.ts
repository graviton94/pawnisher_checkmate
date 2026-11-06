import type { CommandId } from './cards';
import type { Crew } from './crew';
import type { SliceEventId } from './events';
import type { SlicePartId } from './parts';
import { ASC_MAX } from './run';
import type { Highlight, Nemesis } from './director';

/**
 * 저장 · 이어하기 · 기록 (R6, D-174). 화면과 무관한 순수 로직 — 저장소는 주입한다 (테스트는 메모리).
 * 저장 시점: 지도에 설 때 · 대국을 시작할 때. 대국 중간에 나가면 그 대국 처음부터 이어 간다.
 */
export interface RunSave {
  /** 2 = 슬더스식 지도 (D-215) — 1은 예전 갈림길 지도라 버린다 */
  v: 2;
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
  /** 심리 연출 (D-178): 남은 마지막 한 수 · 자원 희생, 사선 보상을 받은 막, 이번 출하 최고의 턴 */
  clutchLeft?: number;
  sacLeft?: number;
  closeActs?: number[];
  highlight?: Highlight | null;
  /** 부적 (D-228): 여벌 심장 톱니 · 역회전 톱니 개수 */
  charms?: { revive: number; rewind: number };
  /** 처음 출하 (D-232): 1막 반장 HP −35% · 첫 고물상 맞물림 부품 */
  first?: boolean;
  /** 고물상 다듬기 · 빼기 쓴 횟수 (D-247 — 값이 오른다) */
  svc?: { refine: number; remove: number };
  /** 이번 출하에서 쓰러뜨린 반장 (각본 — 도금왕의 비꼼 · 거울, D-276) */
  bosses?: string[];
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
  /** 원수 (D-178): 출하를 넘어 남는다 */
  nemeses: Nemesis[];
  /** 프롤로그를 끝까지 봤다 (D-192 — 다음부터 화면을 누르면 메뉴) */
  prologue?: boolean;
  /** 첫 대국 도움말을 마쳤다 (D-192) */
  onboarded?: boolean;
  /** 부관 안내를 마친 부분 (D-238): battle · recruit · map · kit */
  tut?: string[];
  /** 열린 용어 · 아직 안 읽은 새 용어 (D-233 단계 공개) */
  terms?: string[];
  termsNew?: string[];
  /** 최근 출하들에서 만난 사건 (D-247 — 다음 출하에서는 뒤로 미룬다) */
  evRecent?: string[];
  /** 진 엔딩을 봤다 (승급 13 · 뒤로 한 발, D-277) */
  trueEnd?: boolean;
  /** 해금된 카드 · 부품 (D-284) — 처음 풀 밖의 것만 */
  unlocked?: string[];
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
    return s && s.v === 2 && Array.isArray(s.squad) && s.squad.length ? s : null;
  }, null);
export const clearSave = (st: Store): void => safe(() => st.removeItem(SAVE_KEY), undefined);

export const emptyMeta = (): Meta => ({ runs: 0, clears: 0, ascOpen: 0, bestAct: 0, daily: {}, nemeses: [] });
export const readMeta = (st: Store): Meta => safe(() => ({ ...emptyMeta(), ...(JSON.parse(st.getItem(META_KEY) ?? '{}') as Partial<Meta>) }), emptyMeta());

/** 출하가 끝났을 때 기록을 더한다. 승급 n을 끝내면 n+1이 열린다 (오늘의 출하는 승급을 열지 않는다) */
export const recordRun = (m: Meta, r: { cleared: boolean; act: number; won: number; asc: number; daily: string | null }): Meta => {
  const out: Meta = { ...m, daily: { ...m.daily }, nemeses: [...(m.nemeses ?? [])] };
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
