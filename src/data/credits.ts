/**
 * 크레딧 (각본 S11, D-279 → D-286) — 모든 출하 완료 뒤.
 * 사용자 결정 D-286: 크레딧은 두 줄뿐이다. 글꼴 · 아이콘 같은 출처는 스튜디오 페이지(docs/CREDITS.md)와
 * 설정 → 제작 쪽의 라이선스 고지(src/data/licenses.ts, D-530 — 배포물에 전문 동봉)에 둔다.
 */
export const STUDIO_URL = 'https://graviton94.github.io/';
export const CREDITS: { role: string; names: string[] }[] = [
  { role: 'Made by', names: ['당신의 하루 스튜디오'] },
  { role: 'Coworked by', names: ['Claude'] },
];
export const CREDIT_TEXT = {
  title: 'Pawnisher : Checkmate',
  /** 기록지 12 (각본 §15) */
  record: '왕관은 종이인 채로 남았다.',
};
