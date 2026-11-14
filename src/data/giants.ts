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
 * 거대 주물이 서는 곳 (GDD 21장 §3 — 검문 일부 · 반장 일부, 높은 왕관일수록 자주). level = 본편 왕관(0~3) · 도전 단계(4~).
 * [막 1~3] → 그 막에서 그 판에 세울 거대 주물 (없으면 null). 서는 만큼 같은 바탕 기물 하나(없으면 폰 둘)를 뺀다.
 */
export const GIANT_AT = {
  check: (act: number, level: number): GiantType | null => (act === 1 ? (level >= 2 ? 'P' : null) : act === 2 ? 'P' : level >= 3 ? 'Q' : 'R'),
  boss: (act: number, level: number): GiantType | null => (act === 2 && level >= 2 ? 'P' : act === 3 && level >= 2 ? 'R' : null),
  /** 도전 단계(4~)의 2막 이후 일반 대국에 설 확률 */
  battleOdds: 0.25,
  battleFrom: 4,
};
