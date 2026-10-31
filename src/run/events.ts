import type { PieceType } from '../engine/types';

/**
 * 이벤트 노드 (GDD 8장 §8.2). 선택지형 보상·대가. M5는 5종으로 시작한다.
 * 효과 처리는 run.ts의 applyEventChoice에서 한다.
 */
export type EventId = 'smith' | 'armory' | 'gambler' | 'pilgrim' | 'pact' | 'safe' | 'press' | 'forgery' | 'jam'
  | 'nightShift' | 'moldBin' | 'recheck' | 'dipping' | 'screwRain' | 'stampForge' | 'swapDealer' | 'oilLeak' | 'brokenGacha' | 'apprentice' | 'lostBox' | 'welding' | 'scout' | 'auction' | 'napping';

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
    text: '* 공구 수레 옆에 폰 하나가 서 있다. 등에 진 렌치가 몸보다 크다. "거푸집 하나. 나사 25. 고르는 건 나다."',
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
    title: '동전 나이트',
    text: '* 외알 안경을 낀 나이트가 발굽으로 동전을 굴린다. "앞면이면 두 배. 뒷면이면 내 거."',
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
  // ---- 볼륨 1 (D-105): 돌발 15종 — 대가 · 확률 · 이득을 하나씩 ----
  nightShift: {
    title: '야간 교대',
    text: '* 공방 불이 아직 켜져 있다. 외눈 비숍이 졸고 있다. 망치는 깨어 있다.',
    choices: [
      { label: '몰래 두드린다', desc: '무작위 유형 개량 +1 · 봉인 1대국' },
      { label: '지나간다', desc: '' },
    ],
  },
  moldBin: {
    title: '버려진 거푸집',
    text: '* 폐기함에 거푸집이 걸려 있다. 아직 따뜻하다.',
    choices: [
      { label: '거푸집을 챙길까?', desc: '60%: 이형 거푸집 / 40%: 무작위 유형 손상' },
      { label: '고철로 판다', desc: '나사 +30' },
    ],
  },
  recheck: {
    title: '재검사 창구',
    text: '* 「재검사」 창구. 줄이 없다. 이상할 만큼.',
    choices: [
      { label: '재검사를 받는다', desc: '나사 50 · 손상 전부 1단씩 수리' },
      { label: '지나간다', desc: '' },
    ],
  },
  dipping: {
    title: '쇳물 담금질',
    text: '* 쇳물 통 위에 집게가 걸려 있다. 담그면 단단해진다. 녹을 수도 있다.',
    choices: [
      { label: '하나를 담글까?', desc: '킹 말고 무작위 1기 — 50%: 한 단계 위 유형 / 50%: 녹아 사라짐' },
      { label: '거절한다', desc: '' },
    ],
  },
  screwRain: {
    title: '나사 비',
    text: '* 천장 배관이 터졌다. 나사가 비처럼 쏟아진다. 조금 아프다.',
    choices: [
      { label: '줍는다', desc: '나사 +25' },
      { label: '머리를 감싼다', desc: '' },
    ],
  },
  stampForge: {
    title: '굴러다니는 도장',
    text: '* 검수 도장 하나가 바닥에 굴러다닌다. 진짜처럼 보인다. 아마 진짜다.',
    choices: [
      { label: '찍는다', desc: '가진 개조 하나 한 단 ↑ · 봉인 2대국' },
      { label: '그냥 둔다', desc: '' },
    ],
  },
  swapDealer: {
    title: '부품 교환상',
    text: '* 손수레에 나이트 하나. "폰 둘. 나이트 하나. 손해는 아니지."',
    choices: [
      { label: '폰 둘을 건넨다', desc: '폰 −2 · 나이트 +1' },
      { label: '거절한다', desc: '' },
    ],
  },
  oilLeak: {
    title: '기름 누수',
    text: '* 바닥이 미끄럽다. 기름이 새고 있다. 누군가는 막아야 한다.',
    choices: [
      { label: '나사 20으로 막는다', desc: '나사 −20' },
      { label: '그냥 지나간다', desc: '무작위 유형 손상' },
    ],
  },
  brokenGacha: {
    title: '쓰러진 뽑기 기계',
    text: '* 뽑기 기계가 옆으로 누워 있다. 톱니가 반쯤 빠져나와 있다.',
    choices: [
      { label: '톱니를 돌린다', desc: '행운 톱니 +2' },
      { label: '뜯어서 판다', desc: '나사 +30 · 행운 톱니 0' },
    ],
  },
  apprentice: {
    title: '견습 폰',
    text: '* 작은 폰이 망치를 거꾸로 들고 있다. 본인은 모른다.',
    choices: [
      { label: '맡겨 볼까?', desc: '50%: 무작위 유형 개량 +1 / 50%: 개량 −1 (없으면 손상)' },
      { label: '거절한다', desc: '' },
    ],
  },
  lostBox: {
    title: '주인 없는 상자',
    text: '* 송장이 지워진 상자. 흔들면 무언가 덜그럭거린다.',
    choices: [
      { label: '연다', desc: '무작위 천공 카드 (칸이 차 있으면 나사 30)' },
      { label: '나사로 판다', desc: '나사 +30' },
    ],
  },
  welding: {
    title: '꺼지지 않은 용접기',
    text: '* 누군가 용접을 하다 자리를 비웠다. 불꽃이 아직 튄다.',
    choices: [
      { label: '용접해 볼까?', desc: '희귀 개조 3지선다 · 무작위 유형 손상 2단' },
      { label: '지나간다', desc: '' },
    ],
  },
  scout: {
    title: '다른 공장의 흑 비숍',
    text: '* 낯선 도장이 찍힌 흑 비숍. 눈이 돈을 센다. "좋은 부품이군. 두 배 주지."',
    choices: [
      { label: '하나를 판다', desc: '킹 말고 가장 비싼 기물 1기 · 판매가 ×2' },
      { label: '거절한다', desc: '' },
    ],
  },
  auction: {
    title: '고철 경매',
    text: '* 경매인이 목청을 높인다. 상자 안은 아무도 모른다. 경매인도.',
    choices: [
      { label: '나사 60을 걸까?', desc: '50%: 희귀 개조 3지선다 / 50%: 빈 상자' },
      { label: '구경만 한다', desc: '' },
    ],
  },
  napping: {
    title: '조는 검수 저울',
    text: '* 검수 저울이 서류 위에서 졸고 있다. 바늘이 꾸벅인다. 도장은 접시에 그대로 있다.',
    choices: [
      { label: '서류를 바꿔칠까?', desc: '50%: 상위 기물 1기 / 50%: 들킨다 — 봉인 2대국 · 나사 −20' },
      { label: '조용히 지나간다', desc: '' },
    ],
  },
};

export const EVENT_IDS = Object.keys(EVENTS) as EventId[];

/** 이벤트 조건 (불가능한 선택지는 화면에서 막는다) */
export const PACT_VICTIMS: PieceType[] = ['N', 'B', 'R', 'Q'];
