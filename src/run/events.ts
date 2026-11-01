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
    text: '* 공구 수레 옆에 폰 하나가 서 있다. 등에 진 렌치가 몸보다 크다. “각인 하나. 나사 25. 고르는 건 나다.”',
    choices: [
      { label: '나사 25를 맡길까?', desc: '각인 없는 기물 하나에 무작위 각인' },
      { label: '지나간다', desc: '' },
    ],
  },
  gambler: {
    title: '동전 나이트',
    text: '* 외알 안경을 낀 나이트가 발굽으로 동전을 굴린다. “앞면이면 두 배. 뒷면이면 내 거.”',
    choices: [
      { label: '나사 30을 걸까?', desc: '50%: +30 / 50%: −30' },
      { label: '거절한다', desc: '' },
    ],
  },
  apprentice: {
    title: '견습 폰',
    text: '* 작은 폰이 망치를 거꾸로 들고 있다. 본인은 모른다.',
    choices: [
      { label: '맡겨 볼까?', desc: '50%: 무작위 기물에 각인 / 50%: 무작위 기물의 각인이 지워진다' },
      { label: '거절한다', desc: '' },
    ],
  },
  scout: {
    title: '다른 공장의 흑 비숍',
    text: '* 낯선 도장이 찍힌 흑 비숍. 눈이 돈을 센다. “좋은 부품이군. 두 배 주지.”',
    choices: [
      { label: '하나를 판다', desc: '킹 말고 가장 비싼 기물 1기 · 판매가 ×2' },
      { label: '거절한다', desc: '' },
    ],
  },
  napping: {
    title: '조는 검수 저울',
    text: '* 검수 저울이 서류 위에서 졸고 있다. 바늘이 꾸벅인다. 도장은 접시에 그대로 있다.',
    choices: [
      { label: '서류를 바꿔칠까?', desc: '50%: 상위 기물 1기 / 50%: 들킨다 — 나사 −40' },
      { label: '조용히 지나간다', desc: '' },
    ],
  },
  nightShift: {
    title: '야간 교대',
    text: '* 공방 불이 아직 켜져 있다. 외눈 비숍이 졸고 있다. 망치는 깨어 있다.',
    choices: [
      { label: '몰래 두드린다', desc: '무작위 기물 하나에 단조 각인 (있던 각인은 사라진다)' },
      { label: '지나간다', desc: '' },
    ],
  },
  pact: {
    title: '쇳물 앞의 거래',
    text: '* 용광로 앞에 그림자가 있다. 그림자의 주인은 없다. “하나 녹여라. 대가는 준다.”',
    choices: [
      { label: '하나를 녹일까?', desc: '킹 · 폰을 뺀 무작위 기물 1기를 잃고 레어 이상 부품 3지선다' },
      { label: '거절한다', desc: '' },
    ],
  },
  dipping: {
    title: '쇳물 담금질',
    text: '* 쇳물 통 위에 집게가 걸려 있다. 담그면 단단해진다. 녹을 수도 있다.',
    choices: [
      { label: '하나를 담글까?', desc: '킹 말고 무작위 1기 — 50%: 한 단계 위 유형 / 50%: 녹아 사라진다' },
      { label: '거절한다', desc: '' },
    ],
  },
  swapDealer: {
    title: '부품 교환상',
    text: '* 손수레에 나이트 하나. “폰 둘. 나이트 하나. 손해는 아니지.”',
    choices: [
      { label: '폰 둘을 건넨다', desc: '폰 −2 · 나이트 +1' },
      { label: '거절한다', desc: '' },
    ],
  },
  auction: {
    title: '고철 경매',
    text: '* 경매인이 목청을 높인다. 상자 안은 아무도 모른다. 경매인도.',
    choices: [
      { label: '나사 60을 걸까?', desc: '50%: 부품 3지선다 / 50%: 빈 상자' },
      { label: '구경만 한다', desc: '' },
    ],
  },
  brokenGacha: {
    title: '쓰러진 뽑기 기계',
    text: '* 뽑기 기계가 옆으로 누워 있다. 레버는 아직 돈다.',
    choices: [
      { label: '나사 40을 넣을까?', desc: '45%: 부품 3지선다 · 25%: 상위 기물 · 30%: 꽝' },
      { label: '지나간다', desc: '' },
    ],
  },
  safe: {
    title: '녹슨 금고',
    text: '* 녹슨 금고. 손잡이에 날이 서 있다. 안에서 나사 소리가 난다.',
    choices: [
      { label: '억지로 연다', desc: '나사 +70 · 무작위 기물 하나의 각인이 지워진다' },
      { label: '두고 간다', desc: '' },
    ],
  },
};

export const EVENT_IDS = Object.keys(EVENTS) as EventId[];

/** 녹일 수 있는 기물 (쇳물 앞의 거래) */
export const PACT_VICTIMS: PieceType[] = ['N', 'B', 'R', 'Q'];
