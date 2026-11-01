import type { PieceType } from '../engine/types';

/**
 * 돌발 (규격 2.0, GDD 14장 §3.5): 이야기와 맞는 열둘만. 효과는 나사 · 기물 · 각인 · 부품 넷으로만.
 * 효과 처리는 run.ts의 eventChoose에서 한다. 뽑기 기계는 돌발 하나(쓰러진 뽑기 기계)로 들어왔다.
 */
export type EventId = 'smith' | 'gambler' | 'apprentice' | 'scout' | 'napping' | 'nightShift' | 'pact' | 'dipping' | 'swapDealer' | 'auction' | 'brokenGacha' | 'safe';

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
    title: '떠돌이 정비 폰',
    text: '공구 수레 곁에서 떠돌이 폰이 당신을 기다린다. 등에 진 렌치가 녹슨 빛을 낸다. “나사 25. 무엇을 새길지는 내가 정한다.”',
    choices: [
      { label: '나사 25를 맡길까?', desc: '각인 없는 기물 하나에 무작위 각인을 새깁니다. (나사 −25)' },
      { label: '지나가기', desc: '' },
    ],
  },
  gambler: {
    title: '동전 나이트',
    text: '외알 안경의 나이트가 발굽 위로 동전을 굴린다. 당신의 나사가 그 소리에 떨린다. “앞면이면 두 배. 뒷면이면 내 것.”',
    choices: [
      { label: '나사 30을 걸까?', desc: '50%: 나사 +30 · 50%: 나사 −30' },
      { label: '거절하기', desc: '' },
    ],
  },
  apprentice: {
    title: '견습 폰',
    text: '어린 폰이 제 몸보다 큰 망치를 쥐고 떨고 있다. 당신은 그 손을 믿을 수 있는가.',
    choices: [
      { label: '망치를 맡길까?', desc: '50%: 무작위 기물에 각인 · 50%: 무작위 기물의 각인 삭제' },
      { label: '거절하기', desc: '' },
    ],
  },
  scout: {
    title: '다른 공장의 흑 비숍',
    text: '낯선 공장의 도장을 단 흑 비숍이 당신의 군단을 훑는다. “좋은 쇠다. 값은 두 배로 치르지.”',
    choices: [
      { label: '팔기', desc: '킹을 뺀 가장 비싼 기물 1기를 넘깁니다. (판매가 ×2)' },
      { label: '거절하기', desc: '' },
    ],
  },
  napping: {
    title: '조는 검수 저울',
    text: '서류 더미 위에서 검수 저울이 잠들어 있다. 승인 도장이 당신의 손이 닿는 곳에 놓여 있다.',
    choices: [
      { label: '서류를 바꿔칠까?', desc: '50%: 상위 기물 1기 · 50%: 발각 (나사 −40)' },
      { label: '지나가기', desc: '' },
    ],
  },
  nightShift: {
    title: '야간 교대',
    text: '꺼지지 않은 공방의 불빛이 당신을 부른다. 장인은 잠들었고, 모루는 아직 뜨겁다.',
    choices: [
      { label: '두드리기', desc: '무작위 기물 하나에 단조 각인을 새깁니다. 있던 각인은 사라집니다.' },
      { label: '지나가기', desc: '' },
    ],
  },
  pact: {
    title: '쇳물 앞의 거래',
    text: '당신은 용광로가 가까워지는 것을 느낀다. 주인 없는 그림자가 쇳물 위에서 속삭인다. “하나를 바쳐라. 대가는 치른다.”',
    choices: [
      { label: '하나를 녹일까?', desc: '킹 · 폰을 뺀 무작위 기물 1기를 잃습니다. (레어 이상 부품 3지선다)' },
      { label: '거절하기', desc: '' },
    ],
  },
  dipping: {
    title: '쇳물 담금질',
    text: '끓는 쇳물 위로 집게가 흔들린다. 담금질은 쇠를 벼리거나, 삼킨다.',
    choices: [
      { label: '하나를 담글까?', desc: '킹을 뺀 무작위 1기 — 50%: 한 단계 위 유형 · 50%: 소실' },
      { label: '거절하기', desc: '' },
    ],
  },
  swapDealer: {
    title: '부품 교환상',
    text: '교환상의 손수레 위에서 나이트 하나가 당신을 내려다본다. “폰 둘을 내놓아라. 이 기사를 주겠다.”',
    choices: [
      { label: '건네기', desc: '폰 2기를 넘기고 나이트 1기를 받습니다. (폰 −2 · 나이트 +1)' },
      { label: '거절하기', desc: '' },
    ],
  },
  auction: {
    title: '고철 경매',
    text: '고철 더미 위에서 경매인이 망치를 든다. 봉인된 상자 속을 아는 자는 없다.',
    choices: [
      { label: '나사 60을 걸까?', desc: '50%: 부품 3지선다 · 50%: 빈 상자' },
      { label: '떠나기', desc: '' },
    ],
  },
  brokenGacha: {
    title: '쓰러진 뽑기 기계',
    text: '쓰러진 뽑기 기계가 어둠 속에서 희미하게 깜빡인다. 레버는 아직 당신의 손을 기다린다.',
    choices: [
      { label: '나사 40을 넣을까?', desc: '45%: 부품 3지선다 · 25%: 상위 기물 · 30%: 꽝' },
      { label: '지나가기', desc: '' },
    ],
  },
  safe: {
    title: '녹슨 금고',
    text: '녹슨 금고 안에서 나사가 쏟아지는 소리가 난다. 손잡이에는 날이 서 있다.',
    choices: [
      { label: '부수기', desc: '나사 +70. 무작위 기물 하나의 각인이 지워집니다.' },
      { label: '떠나기', desc: '' },
    ],
  },
};

export const EVENT_IDS = Object.keys(EVENTS) as EventId[];

/** 녹일 수 있는 기물 (쇳물 앞의 거래) */
export const PACT_VICTIMS: PieceType[] = ['N', 'B', 'R', 'Q'];
