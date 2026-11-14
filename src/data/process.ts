import type { BossRule } from '../slice/cards';

/**
 * 공정 판 (D-486, GDD 21장 §5 — 사용자: 「공정 판은 주요 스테이지에서 기믹과 collaboration 먼저 하고, 고 승천에서 빈도 늘리면」).
 * 판 자체가 기계다. 모든 공정은 적 차례 안에서 일어난다(예고 · 미리보기와 실행이 같은 enemyPhase) — 피아를 가리지 않는다.
 * 칸 표시는 이미 있는 판 도트를 빌린다(variant-conveyor · hammer · radiator · crack · chip-magnet, tools/draw-board.py).
 */
export type ProcessId = 'conveyor' | 'press' | 'magnet' | 'furnace' | 'crack';
export interface ProcessDef { name: string; tell: string; when: string; effect: string; line: string }
/** 수치: 프레스 = pressEvery턴마다 예고 줄 · 피해(난이도 공격 배율을 곱한다) / 용광로 = 칸 수 · 서 있으면 피해 / 금 간 바닥 = 칸 수 · 몇 번 밟히면 구멍 */
export const PROC = { pressEvery: 2, pressDmg: 14, furnaceCells: 3, furnaceDmg: 8, crackCells: 4, crackSteps: 2 };
export const PROCESS: Record<ProcessId, ProcessDef> = {
  conveyor: { name: '컨베이어', tell: '컨베이어 — 적 차례가 끝날 때 가운데 줄의 기물이 모두 한 칸 흐릅니다.', when: '적 차례 끝, 화살표 줄', effect: '그 줄 기물 모두 한 칸 흐른다', line: '벨트는 멈추지 않는다.' },
  press: { name: '프레스', tell: `프레스 — ${PROC.pressEvery}턴마다 예고한 줄을 내리찍습니다. 적도 맞습니다.`, when: `${PROC.pressEvery}턴마다, 망치 표시 줄`, effect: '그 줄 모두 피해 (피아 무관)', line: '쿵. 그리고 또, 쿵.' },
  magnet: { name: '자석 레일', tell: '자석 레일 — 적 차례가 끝날 때 룩 · 킹이 가운데 기둥 쪽으로 한 칸 끌려갑니다.', when: '적 차례 끝, 룩 · 킹', effect: '레일 쪽으로 한 칸 (피아 무관)', line: '쇠는 쇠를 부른다.' },
  furnace: { name: '용광로', tell: `용광로 — 방열기 칸에 서서 적 차례를 맞으면 피해를 입습니다. 적도 마찬가지입니다.`, when: '적 차례 끝, 방열기 칸 위', effect: `피해 ${PROC.furnaceDmg} (피아 무관)`, line: '발밑이 녹는다.' },
  crack: { name: '금 간 바닥', tell: `금 간 바닥 — ${PROC.crackSteps}번 밟힌 칸은 꺼지고, 그 위 기물은 떨어집니다.`, when: '내 · 적 차례 끝마다, 금 간 칸 위', effect: `${PROC.crackSteps}번째에 꺼진다 (떨어지면 쓰러짐)`, line: '바닥이 비명을 지른다.' },
};
/** 반장과 짝 (주요 대국부터 — 반장 기믹과 함께). 철갑 반장(1막 첫 반장)은 깨끗한 판으로 둔다 */
export const PROCESS_BOSS: Partial<Record<BossRule, ProcessId>> = { spawn: 'conveyor', thorns: 'press', magnet: 'magnet', alarm: 'furnace', inspect: 'crack' };
/**
 * 어디에 나오나 (level = 본편 왕관 0~3 · 도전 4~): 반장 = 첫째 왕관부터 짝 공정, 검문 = 둘째 왕관부터(막 기준 하나),
 * 일반 대국 = 셋째 왕관부터 확률(왕관이 오를수록).
 */
export const PROCESS_AT = { checkFrom: 1, check: ['crack', 'conveyor', 'press'] as ProcessId[], battleFrom: 2, battleOdds: (level: number): number => (level >= 4 ? 0.4 : level === 3 ? 0.3 : 0.2) };
