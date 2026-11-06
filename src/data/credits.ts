/**
 * 크레딧 (각본 S11, D-279) — 진 엔딩 뒤 한 장씩. 출처는 docs/CREDITS.md와 같다.
 * 사람 이름은 제작자가 직접 채운다 (지금은 역할만).
 */
export const CREDITS: { role: string; names: string[] }[] = [
  { role: '기획 · 디렉션 · 세계관 · 시험', names: ['제작자'] },
  { role: '설계 · 구현 · 글 · 도트', names: ['Claude (Anthropic)'] },
  { role: '글꼴', names: ['갈무리 (Galmuri) — Lee Minseo · SIL OFL 1.1'] },
  { role: '아이콘 (도트로 다시 그림)', names: ['game-icons.net — Lorc, Delapouite 외 · CC BY 3.0', 'Tabler Icons — Paweł Kuna · MIT'] },
  { role: '도트 FX 기법 참고', names: ['pixelfx · Sprite Fusion pixel art VFX — Patch · Hugo Duprez · MIT'] },
];
export const CREDIT_TEXT = {
  title: 'Pawnisher : Checkmate',
  thanks: '끝까지 함께 걸어 준 당신에게.',
  photo: '기록 사진',
  /** 기록지 12 (각본 §15) */
  record: '「접힌 종이 왕관」 — 접은 자국이 열세 겹이다.',
  /** 메인 화면 — 진 엔딩을 본 뒤 로고 아래 */
  crownNote: '접힌 종이 왕관',
};
