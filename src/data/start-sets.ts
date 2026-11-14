import type { PieceType } from '../engine/types';
import type { CommandId } from '../slice/cards';
import type { SlicePartId } from '../slice/parts';

/**
 * 시작 세트 (D-485, GDD 21장 §4 — 사용자: 「시작덱 선택도 첫 3개는 기본으로 주고, 해금요소로 선택지 추가」).
 * 출하를 시작할 때 고른다. 처음 셋은 기본, 나머지는 왕관을 깨면 열린다(unlock = meta.unlocked 키).
 * rows = 고르기 받침의 세 줄(D-422 문법: 누가 / 무엇을 / : 비틀린 규칙). 오늘의 도전 · 첫 출하는 표준 세트로 고정.
 */
export type StartSetId = 'standard' | 'cavalry' | 'infantry' | 'hybrid' | 'scrap' | 'scatter';
export interface StartSet {
  name: string;
  /** 시작 분대 (잡종 세트의 이형 분대원은 form으로 따로) */
  squad: PieceType[];
  deck: CommandId[];
  /** 달고 시작하는 부품 */
  part?: SlicePartId;
  /** 시작 부품 상자에서 무작위로 몇 개 (고철 세트) */
  randomParts?: number;
  /** 해금된 이형 하나가 분대에 (잡종 세트) */
  form?: boolean;
  /** 대국마다 내 기물의 시작 자리가 섞인다 (무작위 배치 세트) */
  scatter?: boolean;
  /** 막사의 호출 (D-466 → 2026-11-14 사용자 결정 #15: 보병 세트 전용) — 우리 폰이 없고 손에 폰 카드가 있으면 턴 시작에 킹 곁에 임시 폰 */
  pawnCall?: boolean;
  /** 되감기 부적 더 (무작위 배치 세트의 보상) */
  rewind?: number;
  unlock?: string;
  /** 잠겼을 때 받침 아래 한 줄 */
  lockText?: string;
  rows: [string, string, string];
  line: string;
}
export const START_SETS: Record<StartSetId, StartSet> = {
  standard: { name: '표준 세트', squad: ['K', 'P', 'N'], deck: ['advance', 'advance', 'advance', 'advance', 'leap', 'leap', 'kingStep', 'order'], rows: ['킹 · 폰 · 나이트', '전진 넷 · 도약 둘', ': 찍어 낸 그대로'], line: '규격대로.' },
  cavalry: { name: '기마 세트', squad: ['K', 'N', 'N'], deck: ['leap', 'leap', 'leap', 'leap', 'rebound', 'kingStep', 'order'], rows: ['킹 · 나이트 둘', '나이트 카드 다섯', ': 폰 없이 7장'], line: '발굽 소리가 먼저 닿는다.' },
  infantry: { name: '보병 세트', squad: ['K', 'P', 'P', 'P'], deck: ['advance', 'advance', 'advance', 'advance', 'advance', 'march', 'kingStep', 'order'], part: 'barracks', pawnCall: true, rows: ['킹 · 폰 셋', '전진 다섯 · 총진격', ': 막사의 종 부품'], line: '줄을 맞춰, 앞으로.' },
  hybrid: { name: '잡종 세트', squad: ['K', 'P'], deck: ['advance', 'advance', 'kingStep', 'order'], form: true, unlock: 'set:hybrid', lockText: '첫째 왕관을 깨면 열립니다', rows: ['킹 · 폰 · 이형', '덱이 얇다 (6장)', ': 해금한 이형 하나'], line: '규격 밖도 분대다.' },
  scrap: { name: '고철 세트', squad: ['K', 'P', 'N'], deck: ['advance', 'advance', 'advance', 'leap', 'kingStep', 'order'], randomParts: 2, unlock: 'set:scrap', lockText: '둘째 왕관을 깨면 열립니다', rows: ['킹 · 폰 · 나이트', '덱 6장', ': 부품 둘을 쥐고'], line: '주워 온 것으로 싸운다.' },
  scatter: { name: '무작위 배치 세트', squad: ['K', 'P', 'N'], deck: ['advance', 'advance', 'advance', 'advance', 'leap', 'leap', 'kingStep', 'order'], scatter: true, rewind: 1, unlock: 'set:scatter', lockText: '셋째 왕관을 깨면 열립니다', rows: ['킹 · 폰 · 나이트', '되감기 부적 +1', ': 자리가 섞인다'], line: '컨베이어가 아무렇게나 내려놓았다.' },
};
export const START_SET_IDS = Object.keys(START_SETS) as StartSetId[];
/** 왕관(본편 장 0~2)을 깨면 열리는 세트 */
export const SET_UNLOCK_AT: Record<number, string> = { 0: 'set:hybrid', 1: 'set:scrap', 2: 'set:scatter' };
/** 이 세트를 쓸 수 있나 */
export const setOpen = (id: StartSetId, unlocked: readonly string[]): boolean => !START_SETS[id].unlock || unlocked.includes(START_SETS[id].unlock!);
