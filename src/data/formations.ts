/**
 * 진형 (D-102, 사용자: 매 판 배치는 과제를 떠넘기는 꼴) — 출하마다 하나 골라 두면 모든 대국에 자동으로 놓인다.
 * 군단 보기 창에서 언제든 바꾼다. 새 출하 기본 = 길 튼 진형. 적 군단은 정통 진형.
 */
export type FormationId = 'lanes' | 'classic' | 'vanguard';

export interface FormationDef {
  name: string;
  desc: string;
}

export const FORMATIONS: Record<FormationId, FormationDef> = {
  lanes: { name: '길 튼 진형', desc: '폰을 킹·나이트 앞으로 몬다. 비숍·룩·퀸 앞은 비워 둔다.' },
  classic: { name: '정통 진형', desc: '체스 그대로. 폰이 킹 앞부터 줄을 선다.' },
  vanguard: { name: '선봉 진형', desc: '킹 말고 전부 앞줄. 폰은 뒷줄에서 기다린다. 먼저 치고, 먼저 맞는다.' },
};

export const FORMATION_ORDER: FormationId[] = ['lanes', 'classic', 'vanguard'];
export const DEFAULT_FORMATION: FormationId = 'lanes';

/** 길 튼 진형에서 폰을 세우기 좋은 정도 (낮을수록 먼저): 앞이 막혀도 되는 기물 */
export const LANE_BLOCK: Record<string, number> = { K: 0, N: 0, P: 1, empty: 1, B: 3, Q: 3, R: 3 };
