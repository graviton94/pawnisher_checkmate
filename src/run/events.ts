import type { PieceType } from '../engine/types';

/**
 * 이벤트 노드 (GDD 8장 §8.2). 선택지형 보상·대가. M5는 5종으로 시작한다.
 * 효과 처리는 run.ts의 applyEventChoice에서 한다.
 */
export type EventId = 'smith' | 'armory' | 'gambler' | 'pilgrim' | 'pact' | 'safe' | 'press' | 'forgery' | 'jam';

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
    text: '* 공구 수레 옆에 정비공이 서 있다. 렌치가 수레보다 크다. "거푸집 하나. 나사 25. 고르는 건 나다."',
    choices: [
      { label: '나사 25를 맡길까?', desc: '군단에 있는 유형 중 하나 (완성 거푸집 제외)' },
      { label: '지나간다', desc: '' },
    ],
  },
  armory: {
    title: '반품 창고',
    text: '* 반품 딱지가 붙은 상자들. 하나가 조금 움직였다. 기분 탓이다.',
    choices: [
      { label: '기물을 챙길까?', desc: '무작위 나이트 또는 비숍 1기 (군단 규격 안에서)' },
      { label: '천공 카드를 챙길까?', desc: '무작위 철 카드 1장 (빈 칸이 있을 때)' },
    ],
  },
  gambler: {
    title: '태엽 도박꾼',
    text: '* 태엽 감는 손이 동전을 굴린다. "앞면이면 두 배. 뒷면이면 내 거."',
    choices: [
      { label: '나사 30을 걸까?', desc: '50%: +30 / 50%: −30' },
      { label: '거절한다', desc: '' },
    ],
  },
  pilgrim: {
    title: '불량품 행렬',
    text: '* 불량 도장이 찍힌 기물들이 줄지어 간다. 모두 같은 쪽을 본다. 길잡이 하나를 보내 주면 사례를 하겠다고 한다.',
    choices: [
      { label: '폰 1기를 보낸다', desc: '폰 1기를 군단에서 빼고 나사 35' },
      { label: '거절한다', desc: '' },
    ],
  },
  pact: {
    title: '쇳물 앞의 거래',
    text: '* 용광로 앞에 그림자가 있다. 그림자의 주인은 없다. "하나 녹여라. 대가는 준다."',
    choices: [
      { label: '하나를 녹일까?', desc: '킹·폰을 뺀 무작위 기물 1기를 잃고 희귀 개조 3지선다' },
      { label: '거절한다', desc: '' },
    ],
  },
  // 대가·확률 손실 (D-101): 손상 = 그 유형 최대 HP −15% (공방에서 수리) · 봉인 = 다음 2대국 기물 하나가 상자에 남음
  safe: {
    title: '녹슨 금고',
    text: '* 녹슨 금고. 손잡이에 날이 서 있다. 안에서 나사 소리가 난다.',
    choices: [
      { label: '억지로 연다', desc: '나사 +70 · 무작위 유형 하나 손상' },
      { label: '두고 간다', desc: '' },
    ],
  },
  press: {
    title: '고장 난 프레스',
    text: '* 프레스가 혼자 쿵쿵거린다. 가끔은 제대로 찍는다. 가끔은.',
    choices: [
      { label: '거푸집을 넣어 볼까?', desc: '60%: 무작위 유형 개량 +1 / 40%: 그 유형 손상' },
      { label: '지나간다', desc: '' },
    ],
  },
  forgery: {
    title: '검수 누락',
    text: '* 검수표 한 장이 바닥에 떨어져 있다. 도장만 찍으면 된다. 아무도 안 본다. 아마.',
    choices: [
      { label: '도장을 찍는다', desc: '희귀 개조 3지선다 · 다음 2대국 기물 하나 봉인' },
      { label: '그냥 둔다', desc: '' },
    ],
  },
  jam: {
    title: '끼인 컨베이어',
    text: '* 컨베이어가 멈췄다. 상자 하나가 끼었다. 안에 당신 기물이 있다.',
    choices: [
      { label: '억지로 끌어낸다', desc: '그 유형 손상' },
      { label: '나사 40으로 기계를 세운다', desc: '나사 −40' },
      { label: '두고 간다', desc: '킹 말고 무작위 기물 1기를 잃는다' },
    ],
  },
};

export const EVENT_IDS = Object.keys(EVENTS) as EventId[];

/** 이벤트 조건 (불가능한 선택지는 화면에서 막는다) */
export const PACT_VICTIMS: PieceType[] = ['N', 'B', 'R', 'Q'];
