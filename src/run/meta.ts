import type { Deck } from '../engine/setup';
import { FLOORS_PER_ACT, TOTAL_FLOORS } from '../data/run';
import type { RunState } from './run';

/**
 * 메타 진행 (GDD 8장 §8.7): 영구 스탯 강화 없이 콘텐츠 해금 + 승천 난이도.
 * 기기 하나에 저장한다 (클라우드 저장은 M9 스팀 단계).
 */

export interface MetaState {
  version: 1;
  runs: number;
  clears: number;
  bestFloor: number;
  /** 고를 수 있는 가장 높은 승천 단계 (클리어할 때마다 +1) */
  ascension: number;
  /** 이긴 검문! 누계 (D-108) */
  elites?: number;
  /** 푼 묘수 누계 */
  puzzles?: number;
  /** 쓰러뜨린 반장 (BossId · 'final') */
  bossKills?: string[];
  /** 도감 (D-108): 한 번이라도 얻은 개조 · 도면, 들어가 본 돌발 */
  seen?: { enchants: string[]; variants: string[]; events: string[]; cards?: string[]; legends?: string[] };
  /** 온보딩 시험대를 마쳤거나 건너뛰었나 (D-116) */
  onboarded?: boolean;
  /** 오늘의 출하 최고 기록 (D-122): 날짜 · 도달 층 · 완주 */
  daily?: { date: string; floor: number; won: boolean };
}

export { ASCENSIONS, MAX_ASCENSION } from '../data/ascension';
import { MAX_ASCENSION } from '../data/ascension';

/** 해금되는 시작 덱 후보 (기본 3종은 run.ts의 START_DECKS) */
export const UNLOCK_DECKS: { id: string; name: string; deck: Deck; need: string; ok: (m: MetaState) => boolean }[] = [
  { id: 'cavalry', name: '기병 세트', deck: ['K', 'N', 'N'], need: '조립 공정 도달', ok: (m) => m.bestFloor >= FLOORS_PER_ACT + 1 },
  { id: 'clergy', name: '사제 세트', deck: ['K', 'B', 'B'], need: '검수 공정 도달', ok: (m) => m.bestFloor >= 2 * FLOORS_PER_ACT + 1 },
  { id: 'tower', name: '성채 세트', deck: ['K', 'R', 'P'], need: '출하 완료', ok: (m) => m.clears >= 1 },
  // 볼륨 3 (D-108)
  { id: 'battalion', name: '폰 대대 세트', deck: ['K', 'P', 'P', 'P', 'P', 'P'], need: '폰 반장 해체', ok: (m) => (m.bossKills ?? []).includes('pawn') },
  { id: 'elite', name: '정예 세트', deck: ['K', 'N', 'B'], need: '검문! 15번 통과', ok: (m) => (m.elites ?? 0) >= 15 },
  { id: 'command', name: '지휘 세트', deck: ['K', 'Q'], need: '압력 6 개방', ok: (m) => m.ascension >= 6 },
];

const KEY = 'pawnisher.meta.v1';
const empty = (): MetaState => ({ version: 1, runs: 0, clears: 0, bestFloor: 0, ascension: 0 });

export const loadMeta = (): MetaState => {
  try {
    const raw = localStorage.getItem(KEY);
    const m = raw ? (JSON.parse(raw) as MetaState) : null;
    return m?.version === 1 ? m : empty();
  } catch {
    return empty();
  }
};

export const saveMeta = (m: MetaState): void => {
  try {
    localStorage.setItem(KEY, JSON.stringify(m));
  } catch {
    /* 무시 */
  }
};

/** 이 출하에서 지나온 층의 노드 (진 층은 빼고) */
const passed = (run: RunState) => run.path.flatMap((i, f) => (f + 1 < run.floor ? [run.map[f]?.[i]] : [])).filter((n) => !!n);

/** 이 출하가 쓰러뜨린 반장 */
export const bossKillsOf = (run: RunState): string[] => [
  ...run.bosses.filter((_, a) => run.floor > (a + 1) * FLOORS_PER_ACT),
  ...(run.floor > TOTAL_FLOORS ? ['final'] : []),
];

const union = (a: string[] = [], b: string[]) => [...new Set([...a, ...b])];

/** 도감에 이 출하에서 본 것을 더한다 (저장할 때마다 불러도 같다) */
export const absorbRun = (m: MetaState, run: RunState): MetaState => {
  const seen = m.seen ?? { enchants: [], variants: [], events: [] };
  return {
    ...m,
    bossKills: union(m.bossKills, bossKillsOf(run)),
    seen: {
      enchants: union(seen.enchants, Object.keys(run.loadout.enchants)),
      variants: union(seen.variants, [...(run.blueprints ?? []), ...Object.values(run.loadout.variants ?? {})]),
      events: union(seen.events, passed(run).flatMap((n) => (n.event ? [n.event] : []))),
      cards: union(seen.cards, run.loadout.cards),
      legends: union(seen.legends, run.loadout.legends ?? []),
    },
  };
};

/** 런이 끝났을 때 기록한다. 이번 런 승천 단계에서 클리어하면 다음 단계가 열린다. run을 주면 누계·도감도 더한다. */
export const recordRunEnd = (m: MetaState, floor: number, won: boolean, ascension: number, run?: RunState): MetaState => ({
  ...(run ? absorbRun(m, run) : m),
  ...(run ? { elites: (m.elites ?? 0) + passed(run).filter((n) => n.kind === 'elite').length, puzzles: (m.puzzles ?? 0) + (run.solved ?? 0) } : {}),
  ...(run?.daily && (m.daily?.date !== run.daily || floor > m.daily.floor || (won && !m.daily.won)) ? { daily: { date: run.daily, floor, won } } : {}),
  runs: m.runs + 1,
  clears: m.clears + (won ? 1 : 0),
  bestFloor: Math.max(m.bestFloor, floor),
  ascension: won && ascension >= m.ascension ? Math.min(MAX_ASCENSION, ascension + 1) : m.ascension,
});

/** 이 메타 상태에서 런 시작 덱 후보에 추가되는 덱들 */
export const unlockedDecks = (m: MetaState): Deck[] => UNLOCK_DECKS.filter((u) => u.ok(m)).map((u) => u.deck);
