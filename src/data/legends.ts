import type { PieceType } from '../engine/types';

/**
 * 에픽 부품 (D-112): 하나만 얻어도 "이번 출하는 이걸로 간다"가 되는 규칙 바꾸기.
 * 단계(1·2·★) 없이 한 번에 완성. 에픽 슬롯 2칸 (개조 6칸과 따로). 얻는 곳은 data/grades.ts LEGEND_CHANCE.
 */
export type LegendId = 'L01' | 'L02' | 'L03' | 'L04' | 'L05' | 'L06' | 'L07' | 'L08' | 'L09' | 'L10';

export interface LegendDef {
  name: string;
  /** 컨셉 (화면 한 줄) */
  concept: string;
  desc: string;
  /** 이 부품이 밀어 주는 기물 (3지선다에서 군단에 그 유형이 많으면 더 잘 나온다) */
  type?: PieceType;
}

export const LEGENDS: Record<LegendId, LegendDef> = {
  L01: { name: '무한 궤도', concept: '기병 돌격', type: 'N', desc: '나이트가 적을 쓰러뜨리면 그 나이트가 이번 턴 한 번 더 움직인다 (기물마다 턴당 1번)' },
  L02: { name: '프리즘 코어', concept: '사선 관통', type: 'B', desc: '비숍 공격이 사선 위의 적을 끝까지 꿰뚫는다' },
  L03: { name: '레일 캐논', concept: '고정 포대', type: 'R', desc: '룩이 움직이지 않고 제자리에서 칠 수 있다 (태엽 1). 제자리 공격은 직선 끝까지 꿰뚫고 피해 +20%' },
  L04: { name: '여왕 거푸집', concept: '퀸 폭주', type: 'Q', desc: '퀸이 적을 쓰러뜨릴 때마다 그 턴 태엽 +1 (턴당 3번까지)' },
  L05: { name: '폭군 왕관', concept: '킹 전투', type: 'K', desc: '킹 ATK 두 배. 킹이 적을 쓰러뜨리면 아군 전체 방열판 +10' },
  L06: { name: '도미노 공장', concept: '연쇄 폭발', desc: '적이 쓰러지면 그 상하좌우의 적에게 쓰러진 기물 최대 HP 25% 피해 (연쇄된다)' },
  L07: { name: '단독 출하', concept: '소수 정예', desc: '대국을 6기 이하로 시작하면 주는 피해 +40% · 받는 피해 −25%' },
  L08: { name: '조폐 프레스', concept: '나사 경제', desc: '대국 나사 ×1.6 · 고물상 값 −20%' },
  L09: { name: '양산 명령서', concept: '폰 대대', type: 'P', desc: '폰이 공격하면 그 적과 붙어 있는 다른 아군 폰들도 같은 적을 50%로 친다' },
  L10: { name: '합체 공정', concept: '결합 군단', desc: '붙어 있는 두 기물(킹 제외)을 카드 없이 태엽 0으로 결합. 결합 기물 피해 +50%' },
};

/** 에픽 부품 수치 (D-112) */
export const LEGEND_FX = {
  railStandAp: 1,
  railMult: 1.2,
  queenApCap: 3,
  tyrantAtk: 2,
  tyrantShield: 10,
  dominoRatio: 0.25,
  dominoDepth: 4,
  soloMax: 6,
  soloDeal: 1.4,
  soloTake: 0.75,
  goldMult: 1.6,
  goldShop: 0.8,
  phalanxRatio: 0.5,
  fusionMult: 1.5,
};
