import type { PieceType } from '../engine/types';

/**
 * 이형 거푸집 (GDD 13장 P2, D-083·D-084): 기존 6종 기물의 변이 진화. 규격을 벗어난 거푸집으로 찍은 기물.
 * 체스 변형을 빌리지 않고 우리 규칙(명령 순서 · 착지 공격 · 태엽 · 방열판)을 하나씩 비튼다. 강점마다 대가가 있다.
 * 거푸집 단위라 그 유형의 기물 전체가 바뀐다 (6장 유형 단위 원칙). 덱 한도·가치·거푸집 개량은 그대로.
 */
export type VariantId = 'conveyor' | 'hammer' | 'mirror' | 'radiator' | 'boiler' | 'spring' | 'scope' | 'turret' | 'command';

export interface VariantDef {
  /** 바뀌는 기물 유형 */
  base: PieceType;
  name: string;
  /** 강점 (화면 설명) */
  gain: string;
  /** 대가 (화면 설명) */
  cost: string;
  /** 스탯 배율 (기본 스탯·개량 뒤에 곱한다) */
  hpMul?: number;
  atkMul?: number;
  /** 이동 태엽 가감 */
  apDelta?: number;
}

export const VARIANTS: Record<VariantId, VariantDef> = {
  conveyor: {
    base: 'P',
    name: '컨베이어 폰',
    gain: '명령 테이프에서 바로 앞 명령이 폰이면 태엽 0으로 움직인다 — 폰을 줄줄이 이어 밀어붙인다',
    cost: '첫 이동 2칸 전진을 못 한다',
  },
  hammer: {
    base: 'N',
    name: '쇠망치 나이트',
    gain: '착지 공격에 맞은 적을 1칸 튕겨 낸다 — 뒤 순번의 사선에 적을 몰아넣는다',
    cost: 'ATK −15%',
    atkMul: 0.85,
  },
  mirror: {
    base: 'B',
    name: '반사경 비숍',
    gain: '사선이 판 가장자리에 닿으면 한 번 꺾여 이어진다 — 숨은 킹을 벽에 튕겨 맞힌다',
    cost: 'ATK −20%',
    atkMul: 0.8,
  },
  radiator: {
    base: 'R',
    name: '방열 룩',
    gain: '지난 자기 턴에 움직이지 않았으면, 턴 시작마다 상하좌우 아군에 방열판 +8',
    cost: '이동 태엽 +1',
    apDelta: 1,
  },
  // ---- 이형 2차 (D-106): 공방 +3에서 유형마다 둘 중 하나를 고른다 ----
  boiler: {
    base: 'P',
    name: '보일러 폰',
    gain: '쓰러지면 터져 주변 8칸 적에게 그 폰 ATK만큼 피해 — 적이 함부로 못 친다',
    cost: '최대 HP −30%',
    hpMul: 0.7,
  },
  spring: {
    base: 'N',
    name: '용수철 나이트',
    gain: '한 턴에 두 번 움직여 친다 — 두 번째 명령은 태엽 +1',
    cost: 'ATK −10%',
    atkMul: 0.9,
  },
  scope: {
    base: 'B',
    name: '조준경 비숍',
    gain: '맞힌 적에 조준 — 이번 턴 뒤 순번 공격이 그 적에게 +50%',
    cost: '자기 피해 −40%',
    atkMul: 0.6,
  },
  turret: {
    base: 'R',
    name: '포탑 룩',
    gain: '움직이지 않고 그 자리에서 친다 (태엽 2) — "움직인 기물만 공격"을 깬다',
    cost: '이동 태엽 +1',
    apDelta: 1,
  },
  command: {
    base: 'Q',
    name: '지휘 퀸',
    gain: '이동해 친 뒤 바로 다음 명령은 태엽 0',
    cost: '이동 태엽 +1',
    apDelta: 1,
  },
};

/** 이형 2차 수치 (D-106) 🔧 */
export const VARIANT2 = {
  /** 보일러 폰: 터질 때 주변 피해 = ATK × */
  boilerRatio: 1,
  /** 용수철 나이트: 두 번째 명령 태엽 가산 */
  springExtra: 1,
  /** 조준경 비숍: 조준된 적이 받는 피해 × */
  scopeMult: 1.5,
  /** 포탑 룩: 제자리 공격 태엽 */
  turretAp: 2,
} as const;

/** 방열 룩이 주는 방열판 */
export const RADIATOR_SHIELD = 8;

/** 유형별로 고를 수 있는 이형 (지금 들어간 것만) */
export const variantsFor = (t: PieceType): VariantId[] => (Object.keys(VARIANTS) as VariantId[]).filter((id) => VARIANTS[id].base === t);

/** 공방에서 이형 거푸집으로 바꿀 수 있는 개량 단계 (13장 P2: +3 분기) */
export const VARIANT_FORGE_LEVEL = 3;
