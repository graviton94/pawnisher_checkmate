import type { PieceType } from '../engine';
import { josa } from '../data/josa';
import { Rng } from '../engine/rng';
import { baseOf, COMMANDS, isRefined, refinedOf, type CommandId } from './cards';
import type { Crew } from './crew';
import { crewMaxHp } from './battle';

/**
 * 사건 (R5-3, D-170): 본편 돌발 12종(D-158 문체)을 시험판 체계(분대원 · 카드 · 부품 · 나사)로 옮겼다.
 * 효과는 순수 함수 — 화면은 결과 문구와 후속(부품 고르기)만 받는다. 무작위가 걸린 선택은 「?」(말투 원칙 11).
 */
export type SliceEventId = 'tinker' | 'smith' | 'gambler' | 'apprentice' | 'scout' | 'napping' | 'nightShift' | 'pact' | 'dipping' | 'swapDealer' | 'auction' | 'brokenGacha' | 'safe';

/** 사건이 바꿀 수 있는 출하 상태 */
export interface EventState {
  squad: Crew[];
  deck: CommandId[];
  refined: CommandId[];
  gold: number;
}

export interface EventOutcome {
  /** 결과 서술 · 수치 한 줄 */
  text: string;
  /** 부품을 하나 고르게 한다 */
  partPick?: boolean;
  /** 새로 들어온 분대원 (이름 붙이기는 화면이) */
  recruit?: PieceType;
  /** 확률 선택이면 실제로 걸린 칸 (desc의 「n%: …」 순서, 0부터) — 화면이 룰렛을 그 칸에 세운다 (D-244) */
  slot?: number;
}

export interface SliceEventChoice {
  label: string;
  desc: string;
  /** 고를 수 없으면 이유 */
  blocked?: (s: EventState) => string | null;
  /** 상태를 바꾸고 결과를 돌려준다 (s를 직접 고친다) */
  apply: (s: EventState, rng: Rng) => EventOutcome;
}

export interface SliceEventDef {
  title: string;
  text: string;
  choices: SliceEventChoice[];
}

/** 팔 때 값 (흑 비숍은 두 배로 치른다) */
const SELL: Record<PieceType, number> = { K: 0, P: 20, N: 40, B: 40, R: 60, Q: 80 };
/** 담금질 · 서류 바꿔치기: 한 단계 위 */
const UP: Partial<Record<PieceType, PieceType>> = { P: 'N', N: 'R', B: 'R', R: 'Q' };
const NAMES: Record<PieceType, string> = { K: '킹', Q: '퀸', R: '룩', B: '비숍', N: '나이트', P: '폰' };

const pick = <T>(rng: Rng, a: T[]): T | undefined => (a.length ? a[rng.int(a.length)] : undefined);
const nonKing = (s: EventState) => s.squad.filter((u) => u.t !== 'K');
const refinable = (s: EventState) => [...new Set(s.deck)].filter((id) => !isRefined(id) && COMMANDS[id].cost >= 1);
const refineRandom = (s: EventState, rng: Rng): string => {
  const id = pick(rng, refinable(s));
  if (!id) return '다듬을 카드가 없었다.';
  s.deck[s.deck.indexOf(id)] = refinedOf(baseOf(id));
  s.refined.push(id);
  return `${COMMANDS[id].name} 한 장 — 태엽 −1`;
};
const hpRatio = (s: EventState, pct: number) => {
  s.squad = s.squad.map((u) => {
    const max = crewMaxHp(u);
    const hp = u.hp ?? max;
    return { ...u, hp: Math.max(1, Math.min(max, Math.round(hp + max * pct))) };
  });
};
const poor = (n: number) => (s: EventState) => (s.gold < n ? `나사 ${n} 필요` : null);
const leave = (text: string): SliceEventChoice => ({ label: text, desc: '', apply: () => ({ text: '당신은 발걸음을 돌린다.' }) });

export const SLICE_EVENTS: Record<SliceEventId, SliceEventDef> = {
  tinker: {
    title: '떠돌이 땜장이',
    text: '외눈 렌즈를 낀 땜장이가 당신의 분대를 훑는다. “가장 오래 버틴 놈 하나. 그놈 축만 두껍게 해 주지.”',
    choices: [
      {
        label: '나사 30을 낼까?',
        desc: '처치가 가장 많은 분대원 한 명에게 영구 문턱 +1. (그 분대원만, 출하 내내)',
        blocked: (s) => (s.gold < 30 ? '나사 30 필요' : !nonKing(s).length ? '맡길 분대원 없음' : null),
        apply: (s) => {
          s.gold -= 30;
          const u = [...nonKing(s)].sort((a, b) => (b.kills ?? 0) - (a.kills ?? 0))[0];
          u.doors = (u.doors ?? 0) + 1;
          return { text: `불꽃이 튄다. ${u.name ?? NAMES[u.t]}, 그 축이 두꺼워졌다. (문턱 +1, 영구)` };
        },
      },
      leave('지나가기'),
    ],
  },
  smith: {
    title: '떠돌이 정비 폰',
    text: '공구 수레 곁에서 떠돌이 폰이 당신을 기다린다. 등에 진 렌치가 녹슨 빛을 낸다. “나사 25. 무엇을 다듬을지는 내가 정한다.”',
    choices: [
      { label: '나사 25를 맡길까?', desc: '무작위 카드 하나를 다듬습니다. (한 장 태엽 −1, 나사 −25)', blocked: poor(25), apply: (s, rng) => { s.gold -= 25; return { text: `렌치가 한 번 돈다. ${refineRandom(s, rng)}` }; } },
      leave('지나가기'),
    ],
  },
  gambler: {
    title: '동전 나이트',
    text: '외알 안경의 나이트가 발굽 위로 동전을 굴린다. 당신의 나사가 그 소리에 떨린다. “앞면이면 두 배. 뒷면이면 내 것.”',
    choices: [
      { label: '나사 30을 걸까?', desc: '50%: 나사 +30 · 50%: 나사 −30', blocked: poor(30), apply: (s, rng) => { const win = rng.int(2) === 0; s.gold += win ? 30 : -30; return { slot: win ? 0 : 1, text: win ? '앞면. 나이트가 혀를 찬다. (나사 +30)' : '뒷면. 나이트가 동전을 거둔다. (나사 −30)' }; } },
      leave('거절하기'),
    ],
  },
  apprentice: {
    title: '견습 폰',
    text: '어린 폰이 제 몸보다 큰 망치를 쥐고 떨고 있다. 당신은 그 손을 믿을 수 있는가.',
    choices: [
      { label: '망치를 맡길까?', desc: '50%: 무작위 카드 다듬기 · 50%: 무작위 카드 한 장이 부서진다', apply: (s, rng) => {
        if (rng.int(2) === 0) return { slot: 0, text: `망치가 정확히 떨어진다. ${refineRandom(s, rng)}` };
        const i = rng.int(s.deck.length);
        const [gone] = s.deck.splice(i, 1);
        return { slot: 1, text: `망치가 빗나간다. ${gone ? `${COMMANDS[gone].name} 한 장이 부서졌다.` : ''}` };
      } },
      leave('거절하기'),
    ],
  },
  scout: {
    title: '다른 공장의 흑 비숍',
    text: '낯선 공장의 도장을 단 흑 비숍이 당신의 분대를 훑는다. “좋은 쇠다. 값은 두 배로 치르지.”',
    choices: [
      { label: '팔기', desc: '킹을 뺀 가장 비싼 분대원 1기를 넘깁니다. (판매가 ×2)', blocked: (s) => (nonKing(s).length ? null : '팔 분대원이 없음'), apply: (s) => {
        const u = [...nonKing(s)].sort((a, b) => SELL[b.t] - SELL[a.t])[0];
        s.squad = s.squad.filter((x) => x !== u);
        const g = SELL[u.t] * 2;
        s.gold += g;
        return { text: `${josa(u.name, '이')} 낯선 상자에 실린다. 돌아보지 않는다. (나사 +${g})` };
      } },
      leave('거절하기'),
    ],
  },
  napping: {
    title: '조는 검수 저울',
    text: '서류 더미 위에서 검수 저울이 잠들어 있다. 승인 도장이 당신의 손이 닿는 곳에 놓여 있다.',
    choices: [
      { label: '서류를 바꿔칠까?', desc: '50%: 폰 하나가 나이트로 · 50%: 발각 (나사 −40)', blocked: (s) => (s.squad.some((u) => u.t === 'P') ? null : '폰이 없음'), apply: (s, rng) => {
        if (rng.int(2) === 0) {
          const u = pick(rng, s.squad.filter((x) => x.t === 'P'))!;
          s.squad = s.squad.map((x) => (x === u ? { ...x, t: 'N', hp: undefined } : x));
          return { slot: 0, text: `도장이 찍힌다. ${josa(u.name, '은')} 이제 나이트다.` };
        }
        s.gold = Math.max(0, s.gold - 40);
        return { slot: 1, text: '저울이 눈을 뜬다. 벌금이 매겨진다. (나사 −40)' };
      } },
      leave('지나가기'),
    ],
  },
  nightShift: {
    title: '야간 교대',
    text: '꺼지지 않은 공방의 불빛이 당신을 부른다. 장인은 잠들었고, 모루는 아직 뜨겁다.',
    choices: [
      { label: '두드리기', desc: '모루가 식기 전에 분대를 손봅니다. (분대 전원 HP +50%)', apply: (s) => { hpRatio(s, 0.5); return { text: '쇳소리가 밤새 이어진다. 분대가 다시 선다. (HP +50%)' }; } },
      leave('지나가기'),
    ],
  },
  pact: {
    title: '쇳물 앞의 거래',
    text: '당신은 용광로가 가까워지는 것을 느낀다. 주인 없는 그림자가 쇳물 위에서 속삭인다. “하나를 바쳐라. 대가는 치른다.”',
    choices: [
      { label: '하나를 녹일까?', desc: '킹 · 폰을 뺀 무작위 분대원 1기를 잃습니다. (부품 하나를 고른다)', blocked: (s) => (s.squad.some((u) => u.t !== 'K' && u.t !== 'P') ? null : '바칠 분대원이 없음'), apply: (s, rng) => {
        const u = pick(rng, s.squad.filter((x) => x.t !== 'K' && x.t !== 'P'))!;
        s.squad = s.squad.filter((x) => x !== u);
        return { text: `${josa(u.name, '이')} 쇳물 속으로 가라앉는다. 그림자가 무언가를 내민다.`, partPick: true };
      } },
      leave('거절하기'),
    ],
  },
  dipping: {
    title: '쇳물 담금질',
    text: '끓는 쇳물 위로 집게가 흔들린다. 담금질은 쇠를 벼리거나, 삼킨다.',
    choices: [
      { label: '하나를 담글까?', desc: '킹 · 퀸을 뺀 무작위 1기 — 50%: 한 단계 위 기물 · 50%: 소실', blocked: (s) => (s.squad.some((u) => UP[u.t]) ? null : '담글 분대원이 없음'), apply: (s, rng) => {
        const u = pick(rng, s.squad.filter((x) => UP[x.t]))!;
        if (rng.int(2) === 0) {
          const t = UP[u.t]!;
          s.squad = s.squad.map((x) => (x === u ? { ...x, t, hp: undefined } : x));
          return { slot: 0, text: `${josa(u.name, '이')} 붉게 달아올라 다시 선다. 이제 ${NAMES[t]}이다.` };
        }
        s.squad = s.squad.filter((x) => x !== u);
        return { slot: 1, text: `집게가 비어 올라온다. ${josa(u.name, '은')} 돌아오지 않았다.` };
      } },
      leave('거절하기'),
    ],
  },
  swapDealer: {
    title: '부품 교환상',
    text: '교환상의 손수레 위에서 나이트 하나가 당신을 내려다본다. “폰 둘을 내놓아라. 이 기사를 주겠다.”',
    choices: [
      { label: '건네기', desc: '폰 2기를 넘기고 나이트 1기를 받습니다. (도약 카드 +1)', blocked: (s) => (s.squad.filter((u) => u.t === 'P').length >= 2 ? null : '폰 2기 필요'), apply: (s) => {
        let n = 0;
        s.squad = s.squad.filter((u) => !(u.t === 'P' && n++ < 2));
        s.deck.push('leap');
        return { text: '폰 둘이 손수레에 오른다. 나이트가 내려선다.', recruit: 'N' };
      } },
      leave('거절하기'),
    ],
  },
  auction: {
    title: '고철 경매',
    text: '고철 더미 위에서 경매인이 망치를 든다. 봉인된 상자 속을 아는 자는 없다.',
    choices: [
      { label: '나사 60을 걸까?', desc: '50%: 부품 하나를 고른다 · 50%: 빈 상자', blocked: poor(60), apply: (s, rng) => { s.gold -= 60; return rng.int(2) === 0 ? { slot: 0, text: '상자가 열린다. 부품이 빛난다.', partPick: true } : { slot: 1, text: '상자는 비어 있다. 경매인이 웃지 않는다. (나사 −60)' }; } },
      leave('떠나기'),
    ],
  },
  brokenGacha: {
    title: '쓰러진 뽑기 기계',
    text: '쓰러진 뽑기 기계가 어둠 속에서 희미하게 깜빡인다. 레버는 아직 당신의 손을 기다린다.',
    choices: [
      { label: '나사 40을 넣을까?', desc: '45%: 부품 하나를 고른다 · 25%: 분대원 하나가 한 단계 위로 · 30%: 꽝', blocked: poor(40), apply: (s, rng) => {
        s.gold -= 40;
        const r = rng.int(100);
        if (r < 45) return { slot: 0, text: '기계가 덜컹이며 캡슐을 뱉는다.', partPick: true };
        if (r < 70) {
          const u = pick(rng, s.squad.filter((x) => UP[x.t]));
          if (u) {
            const t = UP[u.t]!;
            s.squad = s.squad.map((x) => (x === u ? { ...x, t, hp: undefined } : x));
            return { slot: 1, text: `불꽃이 튄다. ${josa(u.name, '은')} 이제 ${NAMES[t]}이다.` };
          }
        }
        return { slot: 2, text: '기계가 침묵한다. 나사는 돌아오지 않는다. (나사 −40)' };
      } },
      leave('지나가기'),
    ],
  },
  safe: {
    title: '녹슨 금고',
    text: '녹슨 금고 안에서 나사가 쏟아지는 소리가 난다. 손잡이에는 날이 서 있다.',
    choices: [
      { label: '부수기', desc: '나사 +70. 분대 전원 HP −25%.', apply: (s) => { s.gold += 70; hpRatio(s, -0.25); return { text: '손잡이가 손을 벤다. 나사가 쏟아진다. (나사 +70 · HP −25%)' }; } },
      leave('떠나기'),
    ],
  },
};

export const SLICE_EVENT_IDS = Object.keys(SLICE_EVENTS) as SliceEventId[];
