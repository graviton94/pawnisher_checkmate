/**
 * 카드 F 가족 글 칸 비율 (D-585 — tools/pixel/card_f_import.py가 받은 틀을 재어 쓴다. 손으로 고치지 않는다).
 * name = 이름 글 칸 폭 · tag = 꼬리표 칸 폭 · row = 설명 한 행 폭 (카드 폭 비율) · descH = 설명 칸 높이 (카드 높이 비율) — 등급 가운데 가장 작은 값.
 */
export const CARD_FRAME_FRAC = {
  cmd: { name: 0.48810, tag: 0.75000, row: 0.69048, descH: 0.29365 },
  part: { name: 0.63095, tag: 0.50000, row: 0.61905, descH: 0.30952 },
  svc: { name: 0.59524, tag: 0.58333, row: 0.64286, descH: 0.31746 },
  crew: { name: 0.71429, tag: 1.00000, row: 0.63095, descH: 0.27778 },
  set: { name: 0.64286, tag: 0.58333, row: 0.63095, descH: 0.28571 },
} as const;
