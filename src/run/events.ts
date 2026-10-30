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
    title: '떠돌이 정비공',
    text: '공구 수레를 끄는 정비공이 렌치를 들어 보인다. "거푸집 하나만, 싸게 고쳐 주지."',
    choices: [
      { label: '나사 25 — 어느 거푸집이 걸릴지, 맡겨 볼까?', desc: '군단에 있는 유형 중 하나 (완성 거푸집 제외)' },
      { label: '지나간다', desc: '' },
    ],
  },
  armory: {
    title: '반품 창고',
    text: '반품 딱지가 붙은 상자들. 아직 쓸 만한 것이 섞여 있다.',
    choices: [
      { label: '기물을 챙겨 볼까?', desc: '무작위 나이트 또는 비숍 1기 (군단 규격 안에서)' },
      { label: '천공 카드를 챙겨 볼까?', desc: '무작위 철 카드 1장 (빈 칸이 있을 때)' },
    ],
  },
  gambler: {
    title: '태엽 도박꾼',
    text: '"동전 한 번이면 돼. 앞면이면 두 배, 뒷면이면 내 거."',
    choices: [
      { label: '앞면에 나사 30개, 걸어 볼까?', desc: '50%: +30 / 50%: −30' },
      { label: '거절한다', desc: '' },
    ],
  },
  pilgrim: {
    title: '불량품 행렬',
    text: '불량 도장이 찍힌 기물들이 줄지어 간다. 길잡이 하나를 보내 주면 사례를 하겠다고 한다.',
    choices: [
      { label: '폰 1기를 보낸다', desc: '폰 1기를 군단에서 빼고 나사 35' },
      { label: '거절한다', desc: '' },
    ],
  },
  pact: {
    title: '쇳물 앞의 거래',
    text: '용광로 앞, 쇳물빛에 그림자가 말한다. "가장 아끼는 부품을 녹여라. 대가는 주지."',
    choices: [
      { label: '가장 아끼는 걸, 녹여 볼까?', desc: '킹·폰을 뺀 무작위 기물 1기를 잃고 희귀 개조 3지선다' },
      { label: '거절한다', desc: '' },
    ],
  },
};

export const EVENT_IDS = Object.keys(EVENTS) as EventId[];

/** 이벤트 조건 (불가능한 선택지는 화면에서 막는다) */
export const PACT_VICTIMS: PieceType[] = ['N', 'B', 'R', 'Q'];
