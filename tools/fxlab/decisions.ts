/**
 * FX 랩에 보여 줄 그래픽 결정 목록. 사용자 피드백이 오면 여기만 고치고 `node tools/fxlab/build.cjs`로 다시 만든다.
 * status: done = 확정 · review = 보는 중 · pick = 골라 주세요 · wait = 에셋 대기
 */
import type { PieceType } from '../../src/engine/types';

export type Status = 'done' | 'review' | 'pick' | 'wait';

export const VERSION = { n: 2, date: '2026-10-30' };

export const PIECES: Record<PieceType, { name: string; status: Status; idea: string; beat: string; changed?: string }> = {
  P: { name: '폰', status: 'review', idea: '앞쪽 대각선 두 칸을 가르는 초승달 칼날. 칼끝이 가장 밝고 꼬리로 갈수록 굵고 어두워진다.', beat: '0.20초 · 0.11초에 타격' },
  N: {
    name: '나이트',
    status: 'review',
    idea: '피스톤이 방전을 모은 뒤, 11시 방향 칸부터 시계 방향으로 L자 8칸에 번개가 차례로 내리꽂힌다.',
    beat: '번개 간격 0.038초 · 전체 0.45초',
    changed: '궤적 선 → 하늘에서 떨어지는 번개 (요청 반영)',
  },
  B: {
    name: '비숍',
    status: 'review',
    idea: '빛 알갱이가 몸으로 응축 → 사거리 전체에 한 번에 굵은 광선(7도트) → 빠르게 가늘어지며 사그라든다. 몸에서 뻗어 나가는 시간 없이 빛의 속도로.',
    beat: '응축 0.16초 · 사그라듦 0.19초',
    changed: '뻗어 나가는 광선 → 한 번에 터지는 섬광 (요청 반영)',
  },
  R: { name: '룩', status: 'review', idea: '들었다 쿵 내려찍고, 십자 방향으로 한 칸씩 폭발이 이어진다.', beat: '칸당 0.06초' },
  Q: {
    name: '퀸',
    status: 'pick',
    idea: 'A 8방향 섬광: 톱니 고리가 돌며 응축 → 8방향 광선이 한 번에. / B 십자 연쇄 + 대각 섬광: 룩의 십자 폭발과 비숍의 대각 섬광을 동시에 — "룩 + 비숍"이 눈에 보인다.',
    beat: 'A 0.33초 · B 사거리에 따라 0.3~0.55초',
    changed: '새 안 2개',
  },
  K: {
    name: '킹',
    status: 'pick',
    idea: 'A 사각 충격파: 쿵 → 주변 8칸으로 사각 고리. / B 종소리 파동: 왕관이 번쩍 → 둥근 종소리 파동 두 겹 → 이웃 칸마다 "땡". P-8과 장미시계탑의 종 모티프.',
    beat: '0.22초',
    changed: '새 안 B (기본으로 넣어 둠)',
  },
};

export const OPEN_QUESTIONS: string[] = ['퀸: A 8방향 섬광 / B 십자 연쇄 + 대각 섬광 중 고르기', '킹: A 사각 충격파 / B 종소리 파동 중 고르기', '나이트 번개 간격과 비숍 섬광 굵기가 괜찮은지'];

export const DECISIONS: { item: string; rule: string; status: Status }[] = [
  { item: '진영 색', rule: '아군 = 흰 백자 + 황동 스파크 · 적 = 붉은 과열광. 내 조작(선택·이동)은 청록', status: 'done' },
  { item: '도트 격자', rule: '모든 이펙트를 칸당 16도트 격자에 찍는다. 매끈한 선·원 금지', status: 'done' },
  { item: '박자', rule: '공격 1회 0.6초 이하. 이펙트가 칸에 닿는 순간 그 칸이 맞는다', status: 'done' },
  { item: '피해 숫자', rule: '피해가 클수록 크게 (칸의 40~65%). 내 기물이 맞으면 붉게, 처치는 금색 ☠', status: 'review' },
  { item: '처치', rule: '기물이 톱니·스프링 파편으로 부서져 아래로 떨어진다', status: 'review' },
  { item: '피격', rule: '흰 점멸 0.07초 + 8방향 스파크', status: 'review' },
  { item: '화살표·HP 바·발밑 받침·과녁', rule: '나노바나나 발주 시트 A1~A3로 교체 예정', status: 'wait' },
  { item: '이펙트 스프라이트', rule: '발주 시트 E가 오면 같은 박자에 그림만 갈아 끼운다', status: 'wait' },
  { item: '태엽 (AP)', rule: '날개 → 태엽 감개 3종 (발주 시트 I)', status: 'wait' },
];

export const CHANGELOG: { v: number; date: string; items: string[] }[] = [
  {
    v: 2,
    date: '2026-10-30',
    items: ['나이트: 11시 방향부터 시계 방향 번개 8줄기', '비숍: 응축 → 전체 사거리 한 번에 굵게 → 사그라듦', '퀸·킹: 안 A/B 추가', 'FX 랩 개설 — 게임과 같은 이펙트 코드로 재생'],
  },
  { v: 1, date: '2026-10-30', items: ['기물별 공격 이펙트 첫 판 (폰 칼날 · 나이트 L 궤적 · 비숍 뻗는 광선 · 룩 십자 연쇄 · 킹 사각 충격파)'] },
];
