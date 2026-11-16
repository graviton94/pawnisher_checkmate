import type { CommandId } from './cards';
import type { Crew } from './crew';
import type { SliceEventId } from './events';
import type { SlicePartId } from './parts';
import { ASC_MAX } from './run';
import { CAMPAIGN_VERSION, CHALLENGE_START, STORY_COUNT, type RunMode, type StoryChapter, type EndingKind, type CrownRecord, type StoryPromise } from '../data/campaign';
import { UNLOCK_ORDER } from '../data/unlocks';
import { FORM_IDS, FORMS, formKey } from '../data/forms';
import { SET_UNLOCK_AT, type StartSetId } from '../data/start-sets';
import type { Bet, Highlight, Nemesis } from './director';
import type { SliceBattle } from './battle';

/**
 * 저장 · 이어하기 · 기록 (R6, D-174). 화면과 무관한 순수 로직 — 저장소는 주입한다 (테스트는 메모리).
 * 저장 시점: 지도에 설 때 · 대국을 시작할 때 · 대국을 이긴 직후(보상 전, D-488) · 대국 중 턴이 끝날 때와 앱을 내리거나 닫을 때(D-529).
 * 대국 중간에 나가면 저장한 그 순간의 판(`fight`)부터, 이긴 뒤 보상 전에 나가면 보상 화면부터 이어 간다.
 * 안전망 (D-529): 본 키 + 마지막 좋은 사본(`.bak`). 본 키가 깨졌으면 원본을 `.corrupt`에 남기고 사본으로 되돌린다 · 판 번호 + 이관 사슬.
 */
export interface RunSave {
  /** 저장 판 번호 (SAVE_VERSION). 1 = 예전 갈림길 지도라 버린다 · 2 = 슬더스식 지도 (D-215) · 3 = 대국 중 저장 (D-529) */
  v: number;
  seed: number;
  asc: number;
  mode?: RunMode;
  chapter?: StoryChapter;
  promise?: StoryPromise;
  storyBeats?: number[];
  /** 오늘의 출하 (날짜 시드) — 기록에만 따로 남는다 */
  daily: string | null;
  runId: string;
  /** 시작 세트 (D-485) — 무작위 배치처럼 출하 내내 이어지는 규칙 */
  startSet?: StartSetId;
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
  /** 'map' = 지도에서, 'battle' = 그 줄의 node번째 대국 처음부터, 'reward' = 그 대국을 이긴 뒤 보상 화면부터 (D-488) */
  at: 'map' | 'battle' | 'reward';
  node?: number;
  /** 이긴 대국의 남은 보상 (at = 'reward'): 정산(나사 · 분대 · 부적)은 이미 끝났고 고르기만 남았다 */
  pending?: PendingReward;
  /**
   * 대국 중 저장 (at = 'battle', D-529): 그 순간의 판 상태 그대로. 바깥 rng · stage는 대국을 세우기 **전** 값이라
   * 이 칸이 없거나 깨졌으면 예전처럼 그 대국 처음부터 다시 세운다.
   */
  fight?: FightSave;
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
  /** 첫 상점 보조 공급을 출하마다 한 번만 적용한다. */
  shopsSeen?: number;
  /** 이번 출하에서 쓰러뜨린 반장 (각본 — 도금왕의 비꼼 · 거울, D-276) */
  bosses?: string[];
  /** 이번 막 시작 때의 값 (D-402 막 장부 = 지금 − 이것) — kb · db = 분대원 일련번호 → 처치 · 피해 */
  actSnap?: ActSnap;
}

/**
 * 대국 중 저장 (D-529): 엔진 상태(SliceBattle — 순수 데이터 · 시드 난수)만 남기고 화면은 남기지 않는다.
 * rng · stage = 저장 순간의 출하 난수 · 대국 번호. 판 밖에서 이 대국에 걸린 것(판돈 · 마지막 한 수 · 예고 지표)도 같이.
 */
export interface FightSave {
  b: SliceBattle;
  rng: number;
  stage: number;
  bet?: Bet | null;
  clutched?: boolean;
  phaseWarned?: boolean;
  tg?: { telegraph: number; hit: number; evade: number; counter: number };
}

/** 이긴 대국 뒤 아직 고르지 않은 보상 (D-488 — 보상 전에 앱이 닫혀도 대국을 다시 굴리지 않는다) */
export interface PendingReward { earned: number; overGold: number; fallen: Crew[]; closeTier: number }

/**
 * 이어하기 자리 (D-488): 'reward'는 남은 보상이 있어야만 — 옛 저장 · 깨진 저장은 예전처럼 대국 처음부터 · 지도.
 */
export const resumeAt = (s: Pick<RunSave, 'at' | 'pending'>): 'map' | 'battle' | 'reward' =>
  s.at === 'reward' ? (s.pending && Number.isFinite(s.pending.earned) && Array.isArray(s.pending.fallen) ? 'reward' : 'battle') : s.at === 'battle' ? 'battle' : 'map';

/**
 * 저장한 덱을 그대로 되살린다 (#20 · D-488). 예전에는 「다듬은 기록(refined)이 있는데 덱에 「+」 카드가 없으면 그 종류를 모두 「+」로」
 * 옮기는 옛 저장 이관(D-183 전)이 있었다 — 다듬은 카드가 녹 · 빼기로 사라진 뒤 앱을 다시 열면 남은 같은 카드가 전부 「+」가 되어
 * 다듬기 목록에서 사라졌다. 저장 판 2(D-215)는 모두 D-183 뒤라 이관할 저장이 없다.
 */
export const restoreDeck = (s: Pick<RunSave, 'deck'>): CommandId[] => [...s.deck];

/** 막 시작 때의 값 (D-402 막 장부) */
export interface ActSnap { won: number; kills: number; gold: number; deck: number; kb: Record<string, number>; db: Record<string, number> }

/** 쌓이는 기록 (출하를 넘어 남는다) */
export interface Meta {
  /** 기록 판 번호 (META_VERSION, D-529) */
  mv?: number;
  campaignVersion?: number;
  storyCleared?: number;
  challengeOpen?: number;
  crownedKings?: CrownRecord[];
  challengeRecords?: Record<string, { attempts: number; clears: number }>;
  storyAttempts?: number[];
  legacyStory?: { ascOpen: number; trueEnd: boolean };
  runs: number;
  clears: number;
  /** 옛 호출/저장 호환용. 새 UI는 storyCleared·challengeOpen을 사용한다. */
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
  /** 새 본편 셋째 장에서 함께 출하를 골랐다 (D-425) */
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

/** 마지막 좋은 사본 · 깨진 원본 보관 키 꼬리 (D-529) */
export const BAK = '.bak';
export const CORRUPT = '.corrupt';

/**
 * 쓰기 실패 대응 (D-529): evict = 저장소가 가득 찼을 때 먼저 비울 것(플레이테스트 기록), warn = 그래도 못 썼을 때 알림.
 * 화면 쪽(main)이 꽂는다 — 저장 로직은 화면을 모른다.
 */
let guard: { evict?: () => void; warn?: () => void } = {};
export const setSaveGuard = (g: { evict?: () => void; warn?: () => void }): void => {
  guard = g;
};

/** 키 하나에 쓴다 — 실패하면(가득 참 등) 기록을 먼저 비우고 한 번 더. 성공하면 true */
const put = (st: Store, k: string, v: string): boolean => {
  try {
    st.setItem(k, v);
    return true;
  } catch {
    /* 가득 찼다 — 기록부터 비운다 */
  }
  safe(() => guard.evict?.(), undefined);
  try {
    st.setItem(k, v);
    return true;
  } catch {
    return false;
  }
};
const get = (st: Store, k: string): string | null => safe(() => st.getItem(k), null);

/**
 * 안전하게 읽는다 (D-529): 본 키가 해석 · 검사를 통과하면 그것. 깨졌으면 원본을 `.corrupt`에 남기고
 * 마지막 좋은 사본(`.bak`)이 있으면 그것으로 본 키를 되돌린다. 둘 다 없으면 null.
 */
const readSafe = <T>(st: Store, key: string, parse: (raw: string) => T | null): T | null => {
  const raw = get(st, key);
  if (raw === null) return null;
  const ok = safe(() => parse(raw), null);
  if (ok !== null) return ok;
  if (get(st, key + CORRUPT) !== raw) put(st, key + CORRUPT, raw);
  const bak = get(st, key + BAK);
  const back = bak === null ? null : safe(() => parse(bak), null);
  if (back === null) return null;
  put(st, key, bak!);
  return back;
};

/**
 * 안전하게 쓴다 (D-529): 지금 본 키가 좋은 값이면 그것을 `.bak`(마지막 좋은 사본)으로 옮기고, 깨진 값이면
 * 원본을 `.corrupt`에 남긴 뒤에만 덮어쓴다(남기지 못하면 덮어쓰지 않는다). 실패하면 알리고 false.
 */
const writeSafe = (st: Store, key: string, value: string, valid: (raw: string) => boolean): boolean => {
  const cur = get(st, key);
  if (cur !== null && cur !== value) {
    if (safe(() => valid(cur), false)) put(st, key + BAK, cur);
    else if (get(st, key + CORRUPT) !== cur && !put(st, key + CORRUPT, cur)) {
      safe(() => guard.warn?.(), undefined);
      return false;
    }
  }
  if (put(st, key, value)) return true;
  safe(() => guard.warn?.(), undefined);
  return false;
};

/** 지금 저장 판 번호 (D-529) */
export const SAVE_VERSION = 3;
/**
 * 저장 이관 사슬 (D-529): 판 n → n+1 한 걸음씩. null = 버린다. 새 판을 만들면 여기에 한 걸음을 더하고 시험을 붙인다.
 */
export const SAVE_STEPS: Record<number, (s: Record<string, unknown>) => Record<string, unknown> | null> = {
  // 1 → 버림: 예전 갈림길 지도 (D-215) — 지금 지도로 옮길 수 없다
  1: () => null,
  // 2 → 3: 대국 중 저장(fight) 칸이 생겼다 — 옛 저장에는 없으니 그대로 (대국 처음부터 이어 간다)
  2: (s) => ({ ...s, v: 3 }),
};
/** 저장 하나를 지금 판으로 옮긴다 (판 번호가 없거나 · 사슬에 없거나 · 더 새 판이면 null) */
export const migrateSave = (raw: unknown): Record<string, unknown> | null => {
  let s = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null;
  while (s && typeof s.v === 'number' && s.v < SAVE_VERSION) {
    const step = SAVE_STEPS[s.v];
    s = step ? step(s) : null;
  }
  return s && s.v === SAVE_VERSION ? s : null;
};
/** 대국 중 저장이 엔진 상태로 쓸 만한가 (모자라면 그 칸만 버리고 대국 처음부터) */
const fightOk = (f: unknown): f is FightSave => {
  const x = f as FightSave | undefined;
  return !!x && typeof x === 'object' && !!x.b && typeof x.b === 'object' && Array.isArray(x.b.s?.pieces) && Array.isArray(x.b.hand) && Array.isArray(x.b.draw) && typeof x.b.snap === 'string' && Number.isInteger(x.b.turn) && Number.isFinite(x.rng) && Number.isFinite(x.stage);
};
/** 저장 글 하나를 해석 · 이관 · 검사한다 (못 쓰면 null) */
const parseSave = (raw: string): RunSave | null => {
  const s = migrateSave(JSON.parse(raw)) as RunSave | null;
  if (!s || !Array.isArray(s.squad) || !s.squad.length || !Number.isInteger(s.asc) || s.asc < 0 || s.asc > ASC_MAX) return null;
  if (s.mode && !['story', 'challenge', 'daily'].includes(s.mode)) return null;
  if (s.mode === 'story' && (s.chapter === undefined || ![0, 1, 2, 3].includes(s.chapter) || s.asc !== s.chapter)) return null;
  if (s.fight !== undefined && (s.at !== 'battle' || !fightOk(s.fight))) delete s.fight;
  return s;
};

/** 출하를 저장한다 (판 번호는 늘 지금 것으로). 못 쓰면 false — 화면은 guard.warn으로 한 줄 알린다 */
export const writeSave = (st: Store, s: RunSave): boolean => writeSafe(st, SAVE_KEY, JSON.stringify({ ...s, v: SAVE_VERSION }), (raw) => parseSave(raw) !== null);
/** 저장한 출하 (없거나 못 쓰면 null — 깨진 본 키는 `.corrupt`에 남기고 마지막 좋은 사본으로) */
export const readSave = (st: Store): RunSave | null => readSafe(st, SAVE_KEY, parseSave);
/** 출하 저장을 지운다 (사본까지 — 끝난 출하가 사본에서 되살아나지 않게) */
export const clearSave = (st: Store): void => {
  safe(() => st.removeItem(SAVE_KEY), undefined);
  safe(() => st.removeItem(SAVE_KEY + BAK), undefined);
};

/** 기록 판 번호 (D-529) — 0 = 판 번호가 없던 옛 기록 */
export const META_VERSION = 1;
/** 기록 이관 사슬 (D-529): 판 n → n+1. 지금은 번호만 붙인다 — 다음 판부터 여기에 걸음을 더한다 */
export const META_STEPS: Record<number, (m: Record<string, unknown>) => Record<string, unknown>> = {
  0: (m) => ({ ...m, mv: 1 }),
};
/** 기록 하나를 지금 판으로 옮긴다 (더 새 판이면 null — 읽지 못한 기록을 덮어쓰지 않게) */
export const migrateMeta = (raw: unknown): Record<string, unknown> | null => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  let m = raw as Record<string, unknown>;
  let v = typeof m.mv === 'number' ? m.mv : 0;
  while (v < META_VERSION) {
    const step = META_STEPS[v];
    if (!step) return null;
    m = step(m);
    v = typeof m.mv === 'number' ? m.mv : v + 1;
  }
  return v === META_VERSION ? m : null;
};
const parseMeta = (raw: string): Partial<Meta> | null => migrateMeta(JSON.parse(raw)) as Partial<Meta> | null;

export const emptyMeta = (): Meta => ({ mv: META_VERSION, runs: 0, clears: 0, ascOpen: 0, bestAct: 0, daily: {}, nemeses: [], campaignVersion: CAMPAIGN_VERSION, storyCleared: 0, challengeOpen: CHALLENGE_START, crownedKings: [], trueEnd: false, challengeRecords: {}, storyAttempts: [0, 0, 0] });
/** 옛 13단의 통계·해금·진행 중 출하는 보존하되 새 본편을 보았다고 간주하지 않는다. */
export const readMeta = (st: Store): Meta => safe(() => {
  // 깨진 기록은 `.corrupt`에 남기고 마지막 좋은 사본으로 (D-529 — 예전에는 빈 기록으로 읽고 다음 쓰기에 덮어써 진행이 모두 사라졌다)
  const raw: Partial<Meta> = readSafe(st, META_KEY, parseMeta) ?? {};
  const m = { ...emptyMeta(), ...raw };
  if (raw.campaignVersion !== CAMPAIGN_VERSION) {
    m.legacyStory = { ascOpen: raw.ascOpen ?? 0, trueEnd: !!raw.trueEnd };
    m.campaignVersion = CAMPAIGN_VERSION;
    m.storyCleared = 0;
    m.trueEnd = false;
    m.challengeOpen = Math.max(CHALLENGE_START, Math.min(ASC_MAX, raw.ascOpen ?? 0));
    m.crownedKings = [];
    // 빈 저장소에는 불필요한 과거 기록을 만들지 않는다.
    if (!get(st, META_KEY)) delete m.legacyStory;
  }
  m.storyCleared = Math.max(0, Math.min(STORY_COUNT, Math.floor(Number(m.storyCleared) || 0)));
  m.challengeOpen = Math.max(CHALLENGE_START, Math.min(ASC_MAX, Math.floor(Number(m.challengeOpen) || CHALLENGE_START)));
  return m;
}, emptyMeta());

/** 출하가 끝났을 때 기록을 더한다. 승급 n을 끝내면 n+1이 열린다 (오늘의 출하는 승급을 열지 않는다) */
export const recordRun = (m: Meta, r: { cleared: boolean; act: number; won: number; asc: number; daily: string | null; mode?: RunMode; chapter?: StoryChapter; ending?: EndingKind; crown?: CrownRecord }): Meta => {
  const out: Meta = { ...m, daily: { ...m.daily }, nemeses: [...(m.nemeses ?? [])] };
  if (!r.daily && r.mode === 'challenge') {
    const old = m.challengeRecords?.[r.asc] ?? { attempts: 0, clears: 0 };
    out.challengeRecords = { ...(m.challengeRecords ?? {}), [r.asc]: { attempts: old.attempts + 1, clears: old.clears + Number(r.cleared) } };
  }
  if (!r.daily && r.mode === 'story') {
    out.storyAttempts = [...(m.storyAttempts ?? [])];
    while (out.storyAttempts.length < STORY_COUNT) out.storyAttempts.push(0);
    out.storyAttempts[r.chapter ?? 0] += 1;
  }
  out.runs += 1;
  if (r.cleared) out.clears += 1;
  out.bestAct = Math.max(out.bestAct, r.cleared ? 4 : r.act);
  if (r.cleared && !r.daily) {
    if (r.mode === 'story') {
      const chapter = r.chapter ?? 0;
      // 재관람이나 조작된 미래 장이 순차 진행을 건너뛰지 않는다.
      const legal = chapter < STORY_COUNT - 1 ? r.ending === 'throne' : r.ending === 'throne' || r.ending === 'depart';
      if (legal && chapter === (out.storyCleared ?? 0)) {
        out.storyCleared = Math.min(STORY_COUNT, chapter + 1);
        // 이형 기물 해금 (D-481): 이 왕관에서 적으로 처음 나온 이형이 분대로 들어온다
        out.unlocked = [...new Set([...(out.unlocked ?? []), ...FORM_IDS.filter((f) => FORMS[f].chapter === chapter).map(formKey), ...(SET_UNLOCK_AT[chapter] ? [SET_UNLOCK_AT[chapter]] : [])])]; // 시작 세트 해금 (D-485)
        if (r.ending === 'throne' && r.crown) out.crownedKings = [...(out.crownedKings ?? []), r.crown];
      }
      if ((out.storyCleared ?? 0) >= STORY_COUNT && chapter === STORY_COUNT - 1 && r.ending === 'depart') out.trueEnd = true;
      if ((out.storyCleared ?? 0) >= STORY_COUNT) out.unlocked = [...new Set([...(out.unlocked ?? []), ...UNLOCK_ORDER, ...FORM_IDS.map(formKey), ...Object.values(SET_UNLOCK_AT)])];
    } else if (r.mode === 'challenge') {
      if ((out.storyCleared ?? 0) >= STORY_COUNT && r.asc === (out.challengeOpen ?? CHALLENGE_START)) out.challengeOpen = Math.min(ASC_MAX, r.asc + 1);
    } else if (!r.mode && r.asc >= out.ascOpen) out.ascOpen = Math.min(ASC_MAX, r.asc + 1); // 옛 호출 호환
  }
  if (r.daily && !out.daily[r.daily]) out.daily[r.daily] = { cleared: r.cleared, act: r.act, won: r.won };
  return out;
};
/** 기록을 쓴다 (마지막 좋은 사본을 남기고). 못 쓰면 false */
export const writeMeta = (st: Store, m: Meta): boolean => writeSafe(st, META_KEY, JSON.stringify({ ...m, mv: META_VERSION }), (raw) => parseMeta(raw) !== null);

/** 오늘 날짜 (지역 시각) 「2026-11-02」 */
export const todayKey = (d = new Date()): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
/** 날짜 → 시드 (모두가 같은 지도 · 같은 분대 · 같은 보상 순서) */
export const dailySeed = (key: string): number => {
  let h = 2166136261;
  for (const ch of key) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h & 0xffffff;
};
