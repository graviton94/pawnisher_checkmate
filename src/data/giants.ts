import type { PieceType } from '../engine/types';

/**
 * 거대 주물 (D-484, GDD 21장 §3) — 거푸집을 잘못 부어 규격의 두 배로 굳은 기물. 판의 2×2를 차지한다.
 * 네 부위가 각자 적 기물(HP 따로)이다 — 부위를 칠 때마다 연쇄가 쌓이고, 부서진 부위는 제 몫의 공격을 잃는다. 넷 다 부서지면 쓰러진다.
 * 부위는 혼자 움직이지 않는다: 턴 시작에 묶음째 걷고(stepEvery턴마다 한 칸), 칠 쪽을 골라 예고한 뒤 적 차례 끝에 내리찍는다.
 * hp · atk = 바탕 기물 수치에 곱하는 부위 하나의 배율 (막 · 깊이 배율은 다른 적과 같이 더 곱한다).
 * 받침 그림을 받기 전에는 바탕 기물 그림을 두 배로 키워 네 조각으로 나눠 그린다 (그림 발주 G-01~03, docs/asset-order-master.md §0-C).
 */
export type GiantType = 'P' | 'R' | 'Q';
export interface GiantDef { name: string; hp: number; atk: number; stepEvery: number; move: string; hit: string; line: string }
export const GIANTS: Record<GiantType, GiantDef> = {
  P: { name: '거대 폰', hp: 1.3, atk: 1, stepEvery: 1, move: '턴마다 한 칸 앞으로 밀고 온다', hit: '바로 앞 줄 네 칸을 내리찍는다', line: '쇳덩이가 걸어온다.' },
  R: { name: '거대 룩', hp: 1, atk: 0.9, stepEvery: 2, move: '두 턴마다 한 칸 다가온다', hit: '고른 쪽으로 두 줄을 쓸어 친다', line: '성벽이 통째로 움직인다.' },
  Q: { name: '거대 퀸', hp: 0.9, atk: 0.8, stepEvery: 1, move: '턴마다 한 칸 다가온다', hit: '여덟 방향 중 한쪽으로 세 줄을 쏜다', line: '왕관이 너무 무거워 고개를 숙였다.' },
};
export const isGiantType = (t: PieceType): t is GiantType => t === 'P' || t === 'R' || t === 'Q';

/**
 * 거대 주물이 서는 곳 (GDD 21장 §3 · §3-B 갈림길 2, D-513 사용자 결정 2026-11-16): **검문 정예 미니보스로만** 선다.
 * 반장 판은 반장 자신이 2×2 몸이라 거대 주물을 세우지 않고(한 판에 2×2 하나), 도전 일반 대국에도 세우지 않는다 → 2×2는 검문 · 반장 · 종막에만.
 * level = 본편 왕관(0~3) · 도전 단계(4~). [막 1~3] → 그 막 검문에 세울 거대 주물 (없으면 null). 서는 만큼 같은 바탕 기물 하나(없으면 폰 둘)를 뺀다.
 */
export const GIANT_AT = {
  check: (act: number, level: number): GiantType | null => (act === 1 ? (level >= 3 ? 'P' : null) : act === 2 ? 'P' : level >= 3 ? 'Q' : 'R'),
  /** 반장 판: 없음 (D-513 — 반장이 2×2 몸) */
  boss: (_act: number, _level: number): GiantType | null => null,
  /** 일반 대국: 없음 (D-513 — 옛 도전 단계 2막 이후 25%를 뺐다). 0이면 서지 않는다 */
  battleOdds: 0,
  battleFrom: 4,
};

/**
 * 2×2 특별 보스 (D-513, GDD 21장 §3-B — 사용자 결정 2026-11-16 추천안): 반장 여섯 · 도금왕이 판 위 2×2 한 몸으로 선다.
 * 네 칸 = 킹 하나(왼아래 칸이 본체 — HP · 방열판 · 체크 보호), 몸 칸에 닿은 피해는 본체로 한 번만.
 * 움직임 · 공격은 거대 주물(`giantTurn`)을 그대로: 내 차례 시작에 묶음째 여덟 방향 한 칸 → 한 변 네 칸 예고 → 적 차례 끝 내리찍기.
 * 2단계(격노)는 꺾인 두 변 일곱 칸 · 공격 ×bossPhase2Atk(slice/cards.ts SLICE). 수치는 모두 반장 킹의 것을 쓴다.
 */
export const BOSS_BODY = {
  /** 턴마다 한 칸 (2턴부터) */
  stepEvery: 1,
  /** 금 간 바닥이 몸 밑에서 꺼질 때 받는 피해 (떨어지지 않는다 — 난이도 공격 배율을 곱한다). 프레스 한 방과 같은 무게 */
  crackDmg: 14,
  move: '턴마다 묶음째 한 칸 다가온다',
  hit: '몸 한 변 네 칸을 내리찍는다',
  hitRage: '꺾인 두 변 일곱 칸을 내리찍는다',
  slam: (name: string): string => `${name} — 내리찍기`,
  /** 전용 그림(GB-01~07 · b)을 받기 전 판 위 딱지 (D-386: 반장 킹 그림을 2×2로 빌려 쓴다) */
  tempArt: '임시 — GB 대기',
};
