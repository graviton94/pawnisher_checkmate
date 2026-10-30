import type { Deck } from '../engine/setup';

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
}

/** 승천 단계별 제약 (누적). 0 = 기본 */
export const ASCENSIONS = [
  '기본 압력',
  '시험용 흑 세트 +1기',
  '대국 보상 나사 −15%',
  '정밀 검수 개조 +1 · 정밀 검수 솜씨 최고 · 테이프 감청(적 다음 수) 없음',
  '적 킹 약화 보정 축소 (+10%p)',
  '반장 거푸집 전 유형 +1',
];
export const MAX_ASCENSION = ASCENSIONS.length - 1;

/** 해금되는 시작 덱 후보 (기본 3종은 run.ts의 START_DECKS) */
export const UNLOCK_DECKS: { id: string; name: string; deck: Deck; need: string; ok: (m: MetaState) => boolean }[] = [
  { id: 'cavalry', name: '기병 세트', deck: ['K', 'N', 'N'], need: '조립 공정 도달', ok: (m) => m.bestFloor >= 13 },
  { id: 'clergy', name: '사제 세트', deck: ['K', 'B', 'B'], need: '검수 공정 도달', ok: (m) => m.bestFloor >= 25 },
  { id: 'tower', name: '성채 세트', deck: ['K', 'R', 'P'], need: '출하 완료', ok: (m) => m.clears >= 1 },
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

/** 런이 끝났을 때 기록한다. 이번 런 승천 단계에서 클리어하면 다음 단계가 열린다. */
export const recordRunEnd = (m: MetaState, floor: number, won: boolean, ascension: number): MetaState => ({
  ...m,
  runs: m.runs + 1,
  clears: m.clears + (won ? 1 : 0),
  bestFloor: Math.max(m.bestFloor, floor),
  ascension: won && ascension >= m.ascension ? Math.min(MAX_ASCENSION, ascension + 1) : m.ascension,
});

/** 이 메타 상태에서 런 시작 덱 후보에 추가되는 덱들 */
export const unlockedDecks = (m: MetaState): Deck[] => UNLOCK_DECKS.filter((u) => u.ok(m)).map((u) => u.deck);
