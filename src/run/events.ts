import type { PieceType } from '../engine/types';

/**
 * 이벤트 노드 (GDD 8장 §8.2). 선택지형 보상·대가. M5는 5종으로 시작한다.
 * 효과 처리는 run.ts의 applyEventChoice에서 한다.
 */
export type EventId = 'smith' | 'armory' | 'gambler' | 'pilgrim' | 'pact';

export interface EventChoice {
  label: string;
  desc: string;
}

export interface EventDef {
  title: string;
  text: string;
  choices: EventChoice[];
}

export const EVENTS: Record<EventId, EventDef> = {
  smith: {
    title: '떠돌이 대장장이',
    text: '수레를 끄는 대장장이가 망치를 들어 보인다. "한 유형만, 싸게 해 주지."',
    choices: [
      { label: '25골드 — 무작위 유형 +1 강화', desc: '덱에 있는 유형 중 하나 (상한 미만)' },
      { label: '지나간다', desc: '' },
    ],
  },
  armory: {
    title: '버려진 무기고',
    text: '무너진 무기고에 아직 쓸 만한 것이 남아 있다.',
    choices: [
      { label: '기물을 챙긴다', desc: '무작위 나이트 또는 비숍 1기 (덱 한도 안에서)' },
      { label: '카드를 챙긴다', desc: '무작위 지속형 카드 1장 (빈 슬롯이 있을 때)' },
    ],
  },
  gambler: {
    title: '태엽 도박꾼',
    text: '"동전 한 번이면 돼. 앞면이면 두 배, 뒷면이면 내 거."',
    choices: [
      { label: '30골드를 건다', desc: '50%: +30 / 50%: −30' },
      { label: '거절한다', desc: '' },
    ],
  },
  pilgrim: {
    title: '순례자의 행렬',
    text: '순례자들이 길잡이를 구한다. 한 명을 보내면 사례를 하겠다고 한다.',
    choices: [
      { label: '폰 1기를 보낸다', desc: '폰 1기를 덱에서 빼고 35골드' },
      { label: '거절한다', desc: '' },
    ],
  },
  pact: {
    title: '균열의 계약',
    text: '바닥의 균열에서 목소리가 들린다. "가장 소중한 것을 내놓아라."',
    choices: [
      { label: '계약한다', desc: '킹·폰을 뺀 무작위 기물 1기를 잃고 희귀 인챈트 3지선다' },
      { label: '거절한다', desc: '' },
    ],
  },
};

export const EVENT_IDS = Object.keys(EVENTS) as EventId[];

/** 이벤트 조건 (불가능한 선택지는 화면에서 막는다) */
export const PACT_VICTIMS: PieceType[] = ['N', 'B', 'R', 'Q'];
