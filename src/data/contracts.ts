/**
 * 계약 부품 (D-120, 제안서 P1 2.4 · StS 보스 유물): 강한 이득 + 규칙 제약 하나.
 * 반장을 해체하면 둘 중 하나를 고르거나 건너뛴다. 에픽(순수 이득)과 달리 "내 빌드가 무엇을 감당하나"를 묻는다.
 */
export type ContractId = 'K1' | 'K2' | 'K3' | 'K4' | 'K5' | 'K6';

export const CONTRACTS: Record<ContractId, { name: string; gain: string; cost: string }> = {
  K1: { name: '과급기', gain: '턴마다 태엽 +1', cost: '공방에서 개량할 수 없다' },
  K2: { name: '검사 면제 도장', gain: '개조 칸 +1 (7칸)', cost: '적 다음 수 감청이 꺼진다' },
  K3: { name: '야간 근무', gain: '대국 나사 +40%', cost: '내 킹 최대 HP −20%' },
  K4: { name: '날림 공정', gain: '내 기물 ATK +20%', cost: '내 기물이 받는 피해 +15%' },
  K5: { name: '부품 밀수', gain: '고물상 값 −25%', cost: '대국 개조 3지선다가 둘만 나온다' },
  K6: { name: '예비 부품 선반', gain: '천공 카드 칸 +1 (5칸)', cost: '대국 나사 −20%' },
};

export const CONTRACT_FX = { ap: 1, gold: 1.4, kingHp: 0.8, atk: 1.2, taken: 1.15, shop: 0.75, shelfGold: 0.8 };
/** 반장 해체 상자에 몇 개를 보여 주나 */
export const CONTRACT_OPTIONS = 2;
