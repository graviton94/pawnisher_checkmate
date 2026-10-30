/**
 * 전술 키워드 · 주문서 (GDD 13장 P1, 11장 A1·C4 — D-094).
 * 키워드: 엔진이 공격마다 판정해 기록한다 (피해 공식은 바꾸지 않는다). 이름은 체스 규칙어 그대로.
 * 주문서: 판마다 하나 붙는 보너스 목표 (Into the Breach 보너스 목표). 킹 처치 = 승리는 그대로, "어떻게 이기느냐"를 묻는다.
 */
import type { PieceType } from '../engine/types';

export type TacticId = 'fork' | 'pierce' | 'discover' | 'breach' | 'chain' | 'check';

export interface TacticDef {
  name: string;
  /** public/ui/icons 이름 */
  icon: string;
  /** 배너·칩 색 (어두운 배경 대비 4.5:1 이상) */
  color: string;
  desc: string;
}

/** 판정 순서 = 칩 표시 순서 */
export const TACTICS: Record<TacticId, TacticDef> = {
  fork: { name: '포크', icon: 'fork', color: '#7DD3FC', desc: '한 번에 적 둘 이상을 친다. 폰만 둘은 포크가 아니다.' },
  pierce: { name: '관통', icon: 'pierce', color: '#FDBA74', desc: '사선이 첫 적을 꿰뚫고 뒤의 적까지 친다.' },
  discover: { name: '사선 개척', icon: 'eye', color: '#C4B5FD', desc: '앞 순번이 비켜 연 사선으로 친다.' },
  breach: { name: '돌파', icon: 'sword', color: '#FCA5A5', desc: '앞 순번이 처치해 비운 칸에 내려 친다.' },
  chain: { name: '연쇄', icon: 'chain', color: '#FACC15', desc: '한 턴에 셋째 처치.' },
  check: { name: '체크!', icon: 'crown', color: '#F87171', desc: '적 킹이 HP 1로 버틴다. 한 대면 끝.' },
};

/** 연쇄: 한 턴 처치 수 */
export const CHAIN_KILLS = 3;

export type OrderId = 'fork2' | 'pierce' | 'discover' | 'breach' | 'chain' | 'flawless' | 'ironKing' | 'pawnMate' | 'pawnWork';

export interface OrderDef {
  /** 주문서 한 줄 (지시문, ~할 것) */
  text: string;
  /** 키워드 주문이면 그 키워드와 필요 횟수 */
  tactic?: TacticId;
  count?: number;
  /** 완수 보상 (나사) 🔧 */
  gold: number;
  /** 이 주문을 낼 수 있는 군단 조건: 필요한 유형 중 하나라도 있어야 한다 */
  needs?: PieceType[];
  /** 더 이상 내지 않는 주문 (옛 저장 호환용으로만 남김) */
  retired?: boolean;
}

export const ORDERS: Record<OrderId, OrderDef> = {
  // D-099: 포크 2번은 완수 70%로 공짜에 가까웠다 → 3번
  fork2: { text: '포크 3번.', tactic: 'fork', count: 3, gold: 20 },
  pierce: { text: '관통 1번.', tactic: 'pierce', count: 1, gold: 25, needs: ['B', 'R', 'Q'] },
  discover: { text: '사선 개척 1번.', tactic: 'discover', count: 1, gold: 20, needs: ['B', 'R', 'Q'] },
  breach: { text: '돌파 1번.', tactic: 'breach', count: 1, gold: 30 },
  chain: { text: '한 턴에 셋을 처치할 것.', tactic: 'chain', count: 1, gold: 30 },
  flawless: { text: '기물을 하나도 잃지 말 것.', gold: 25 },
  ironKing: { text: '킹은 흠집 없이.', gold: 20 },
  // D-099: 시뮬 완수 1% — 폰으로 킹을 끝내는 판이 거의 없다 → 「폰으로 셋 처치」로 바꿈
  pawnMate: { text: '마지막 일격은 폰으로.', gold: 30, needs: ['P'], retired: true },
  // D-099: 셋 4% · 둘 3% — 폰이 마무리하는 판 자체가 드물다 → 내지 않는다
  pawnWork: { text: '폰으로 적 둘을 처치할 것.', gold: 25, needs: ['P'], retired: true },
};

/** 검문!·반장 대국은 주문 보상이 크다 */
export const ORDER_GOLD_MULT = { battle: 1, elite: 1.3, boss: 1.6 } as const;
