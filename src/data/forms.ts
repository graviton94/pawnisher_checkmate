import type { FormId, PieceType } from '../engine/types';

/**
 * 이형 기물 (D-481, GDD 21장 §1) — 공장이 규격 밖으로 부은 체스 기물(페어리 체스).
 * 적으로 먼저 나오고(chapter = 처음 나오는 왕관, 0 = 첫째), 그 왕관을 깨면 분대 영입이 열린다.
 * base = 바탕 체스 기물(카드 · 부품 · 그림이 이것을 따른다). hp · atk = 바탕 수치 배율.
 * 2026-11-14 사용자 결정: 대주교 HP 1.2 → 1.0, 총독 HP 1.25 → 1.05 · 공격 1.05 → 1.0 (셋째 · 넷째 왕관 꺾임 — 행마가 이미 바탕보다 넓다).
 * rule = 길게 누르기 · 등장 안내의 세 줄(D-422: [이름] / 조건·행동 / : 효과).
 */
export interface FormDef { name: string; base: PieceType; chapter: number; hp: number; atk: number; badge: string; move: string; hit: string; line: string }
export const FORMS: Record<FormId, FormDef> = {
  cannon: { name: '대포', base: 'R', chapter: 0, hp: 1, atk: 1.1, badge: '포', move: '룩처럼 곧게 미끄러진다', hit: '딱 한 기물을 넘어 그 뒤 첫 적', line: '포신이 식을 틈이 없다.' },
  camel: { name: '낙타', base: 'N', chapter: 0, hp: 1, atk: 1, badge: '낙', move: '3칸 · 1칸으로 멀리 뛴다', hit: '뛰는 자리의 여덟 칸', line: '멀리서, 등 뒤로.' },
  hopper: { name: '메뚜기', base: 'Q', chapter: 1, hp: 0.8, atk: 0.9, badge: '뜀', move: '처음 만난 기물 바로 뒤로 뛴다', hit: '내린 자리 둘레 여덟 칸', line: '촘촘할수록 위험하다.' },
  archbishop: { name: '대주교', base: 'B', chapter: 2, hp: 1, atk: 1, badge: '주', move: '비숍 + 나이트', hit: '사선 첫 적 + 나이트 칸', line: '빛과 발굽이 함께 내린다.' },
  chancellor: { name: '총독', base: 'R', chapter: 3, hp: 1.05, atk: 1, badge: '독', move: '룩 + 나이트', hit: '곧은 줄 첫 적 + 나이트 칸', line: '성벽이 말을 탔다.' },
};
export const FORM_IDS = Object.keys(FORMS) as FormId[];
/** 이 왕관(본편 장 0~3)까지 나오는 이형 — 도전 모드(장 4 이상)는 전부 */
export const formsUpTo = (chapter: number): FormId[] => FORM_IDS.filter((f) => FORMS[f].chapter <= chapter);
/** 해금 키 (meta.unlocked) */
export const formKey = (f: FormId): string => `form:${f}`;
