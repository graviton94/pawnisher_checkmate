import type { PieceType } from '../engine';
import { josa } from '../data/josa';
import { Rng } from '../engine/rng';
import { COMMANDS, isRefined, REWARD_COMMANDS, refineOnce, rustOnce, type CommandId } from './cards';
import type { Crew } from './crew';
import { crewMaxHp } from './battle';

/**
 * 사건 (R5-3, D-170): 본편 돌발 12종(D-158 문체)을 시험판 체계(분대원 · 카드 · 부품 · 나사)로 옮겼다.
 * 효과는 순수 함수 — 화면은 결과 문구와 후속(부품 고르기)만 받는다. 무작위가 걸린 선택은 「?」(말투 원칙 11).
 */
export type SliceEventId = 'tinker' | 'smith' | 'gambler' | 'apprentice' | 'scout' | 'napping' | 'nightShift' | 'pact' | 'dipping' | 'swapDealer' | 'auction' | 'brokenGacha' | 'safe' | 'counterweight' | 'conveyor';

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
  /** 부품을 높은 등급 쪽으로 (검문 · 반장과 같은 확률표) */
  elite?: boolean;
  /** 새로 들어온 분대원 (이름 붙이기는 화면이) */
  recruit?: PieceType;
  /** 카드를 하나 고르게 한 뒤 counterweight()로 마무리한다 (D-247 저울추) */
  cardPick?: 'counterweight';
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
  s.deck[s.deck.indexOf(id)] = refineOnce(id);
  s.refined.push(id);
  return `${COMMANDS[id].name} 한 장 — 태엽 −1`;
};
/** 저울추에 올릴 수 있는 카드: 태엽을 더 줄일 수 있는 것 (녹슨 것 포함) */
export const weighable = (s: EventState): CommandId[] => [...new Set(s.deck)].filter((id) => !isRefined(id) && COMMANDS[id].cost >= 1);
/**
 * 비뚤어진 저울추 (D-247, 사용자: 「고른 카드 비용 1 내리지만 무작위 카드 1장 비용 1 올리는 이벤트」):
 * 고른 카드 한 장은 한 번 다듬고, 덱의 다른 카드 하나(고른 것 말고)가 녹슨다.
 */
export const counterweight = (s: EventState, chosen: CommandId, rng: Rng): string => {
  const i = s.deck.indexOf(chosen);
  if (i < 0) return '추가 헛돈다.';
  s.deck[i] = refineOnce(chosen);
  s.refined.push(chosen);
  const others = s.deck.map((id, k) => [id, k] as const).filter(([id, k]) => k !== i && !id.endsWith('~'));
  const o = pick(rng, others);
  if (!o) return `${COMMANDS[chosen].name} — 태엽 −1. 반대쪽 접시는 비어 있었다.`;
  s.deck[o[1]] = rustOnce(o[0]);
  return `${COMMANDS[chosen].name} — 태엽 −1. 반대쪽 접시의 ${josa(COMMANDS[o[0]].name, '이')} 녹슨다. (태엽 +1)`;
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

/**
 * 사건 15종 (D-250, 사용자: 「사건도 게임으로 치면 스테이지 하나 — 지금은 보너스처럼 low risk low return, 쉬어 가는 것 같다. high risk high return으로」 ·
 * 「세부 설명이 너무 길다」). 판돈은 나사 절반 · 전부 · 분대원 · 카드 여러 장 단위로, 대가는 황금 쪽 부품 · 여러 장 다듬기 · 두 단계 같은 큰 것으로.
 * 설명(desc)은 한 줄: 확률이면 「n%: 결과 · n%: 결과」, 아니면 「무엇 → 무엇」.
 */
const half = (s: EventState) => Math.max(20, Math.floor(s.gold / 2));
export const SLICE_EVENTS: Record<SliceEventId, SliceEventDef> = {
  tinker: {
    title: '떠돌이 땜장이',
    text: '외눈 렌즈를 낀 땜장이가 당신의 분대를 훑는다. “가장 오래 버틴 놈 하나. 그놈 축만 두껍게 해 주지.”',
    choices: [
      {
        label: '나사 40을 낼까?',
        desc: '최다 처치 분대원 · 문턱 +1 (영구)',
        blocked: (s) => (s.gold < 40 ? '나사 40 필요' : !nonKing(s).length ? '맡길 분대원 없음' : null),
        apply: (s) => {
          s.gold -= 40;
          const u = [...nonKing(s)].sort((a, b) => (b.kills ?? 0) - (a.kills ?? 0))[0];
          u.doors = (u.doors ?? 0) + 1;
          return { text: `불꽃이 튄다. ${u.name ?? NAMES[u.t]}, 그 축이 두꺼워졌다. (문턱 +1)` };
        },
      },
      {
        label: '축을 끝까지 조일까?',
        desc: '50%: 문턱 +2 · 50%: 심장 톱니가 깨진다',
        blocked: (s) => (s.gold < 40 ? '나사 40 필요' : !nonKing(s).length ? '맡길 분대원 없음' : null),
        apply: (s, rng) => {
          s.gold -= 40;
          const u = [...nonKing(s)].sort((a, b) => (b.kills ?? 0) - (a.kills ?? 0))[0];
          if (rng.int(2) === 0) { u.doors = (u.doors ?? 0) + 2; return { slot: 0, text: `축이 끝까지 물린다. ${u.name ?? NAMES[u.t]} — 문턱 +2.` }; }
          s.squad = s.squad.map((x) => (x === u ? { ...x, cracked: true } : x));
          return { slot: 1, text: `쩍. 축이 버티지 못한다. ${u.name ?? NAMES[u.t]}의 심장 톱니에 금이 갔다.` };
        },
      },
      leave('지나가기'),
    ],
  },
  smith: {
    title: '떠돌이 정비 폰',
    text: '공구 수레 곁에서 떠돌이 폰이 당신을 기다린다. 등에 진 렌치가 녹슨 빛을 낸다. “나사 마흔. 무엇을 다듬을지는 내가 정한다.”',
    choices: [
      { label: '나사 40을 맡길까?', desc: '무작위 카드 2장 다듬기', blocked: poor(40), apply: (s, rng) => { s.gold -= 40; return { text: `렌치가 두 번 돈다. ${refineRandom(s, rng)} · ${refineRandom(s, rng)}` }; } },
      leave('지나가기'),
    ],
  },
  gambler: {
    title: '동전 나이트',
    text: '외알 안경의 나이트가 발굽 위로 동전을 굴린다. 당신의 나사가 그 소리에 떨린다. “앞면이면 두 배. 뒷면이면 내 것.”',
    choices: [
      { label: '나사 절반을 걸까?', desc: '50%: 건 만큼 더 · 50%: 잃는다', blocked: poor(20), apply: (s, rng) => { const bet = half(s); const win = rng.int(2) === 0; s.gold += win ? bet : -bet; return { slot: win ? 0 : 1, text: win ? `앞면. 나이트가 혀를 찬다. (나사 +${bet})` : `뒷면. 나이트가 동전을 거둔다. (나사 −${bet})` }; } },
      { label: '전부 걸까?', desc: '50%: 두 배 + 부품 하나 · 50%: 빈털터리', blocked: poor(20), apply: (s, rng) => { const bet = s.gold; const win = rng.int(2) === 0; s.gold = win ? bet * 2 : 0; return win ? { slot: 0, text: `앞면. 나이트가 외알 안경을 떨어뜨린다. (나사 +${bet})`, partPick: true } : { slot: 1, text: `뒷면. 나이트가 당신의 나사를 전부 쓸어 담는다. (나사 −${bet})` }; } },
      leave('거절하기'),
    ],
  },
  apprentice: {
    title: '견습 폰',
    text: '어린 폰이 제 몸보다 큰 망치를 쥐고 떨고 있다. 당신은 그 손을 믿을 수 있는가.',
    choices: [
      { label: '망치를 맡길까?', desc: '50%: 카드 2장 다듬기 · 50%: 카드 2장 부서짐', apply: (s, rng) => {
        if (rng.int(2) === 0) return { slot: 0, text: `망치가 정확히 떨어진다. ${refineRandom(s, rng)} · ${refineRandom(s, rng)}` };
        const gone: string[] = [];
        for (let n = 0; n < 2 && s.deck.length > 4; n++) gone.push(COMMANDS[s.deck.splice(rng.int(s.deck.length), 1)[0]].name);
        return { slot: 1, text: `망치가 빗나간다. ${gone.length ? `${gone.join(' · ')} — 부서졌다.` : ''}` };
      } },
      leave('거절하기'),
    ],
  },
  scout: {
    title: '다른 공장의 흑 비숍',
    text: '낯선 공장의 도장을 단 흑 비숍이 당신의 분대를 훑는다. “좋은 쇠다. 값은 세 배로 치르지.”',
    choices: [
      { label: '팔기', desc: '가장 비싼 분대원 → 나사 (값 ×3)', blocked: (s) => (nonKing(s).length ? null : '팔 분대원이 없음'), apply: (s) => {
        const u = [...nonKing(s)].sort((a, b) => SELL[b.t] - SELL[a.t])[0];
        s.squad = s.squad.filter((x) => x !== u);
        const g = SELL[u.t] * 3;
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
      { label: '서류를 바꿔칠까?', desc: '50%: 폰 둘이 나이트로 · 50%: 나사 절반 몰수', blocked: (s) => (s.squad.some((u) => u.t === 'P') ? null : '폰이 없음'), apply: (s, rng) => {
        if (rng.int(2) === 0) {
          const ps = s.squad.filter((x) => x.t === 'P').slice(0, 2);
          s.squad = s.squad.map((x) => (ps.includes(x) ? { ...x, t: 'N', hp: undefined } : x));
          return { slot: 0, text: `도장이 두 번 찍힌다. ${ps.map((u) => u.name).join(' · ')} — 이제 나이트다.` };
        }
        const fine = Math.floor(s.gold / 2);
        s.gold -= fine;
        return { slot: 1, text: `저울이 눈을 뜬다. 벌금이 매겨진다. (나사 −${fine})` };
      } },
      leave('지나가기'),
    ],
  },
  nightShift: {
    title: '야간 교대',
    text: '꺼지지 않은 공방의 불빛이 당신을 부른다. 장인은 잠들었고, 모루는 아직 뜨겁다.',
    choices: [
      { label: '두드리기', desc: '분대 전원 HP +30%', apply: (s) => { hpRatio(s, 0.3); return { text: '쇳소리가 밤새 이어진다. 분대가 다시 선다. (HP +30%)' }; } },
      { label: '불을 키울까?', desc: '50%: HP 가득 + 카드 1장 다듬기 · 50%: 분대 HP −30%', apply: (s, rng) => {
        if (rng.int(2) === 0) { hpRatio(s, 1); return { slot: 0, text: `불길이 쇠를 새로 벼린다. 분대가 새것처럼 선다. ${refineRandom(s, rng)}` }; }
        hpRatio(s, -0.3);
        return { slot: 1, text: '불이 번진다. 분대가 그을린 채 빠져나온다. (HP −30%)' };
      } },
      leave('지나가기'),
    ],
  },
  pact: {
    title: '쇳물 앞의 거래',
    text: '당신은 용광로가 가까워지는 것을 느낀다. 주인 없는 그림자가 쇳물 위에서 속삭인다. “하나를 바쳐라. 대가는 치른다.”',
    choices: [
      { label: '하나를 녹일까?', desc: '분대원 하나 → 희귀 이상 부품', blocked: (s) => (s.squad.some((u) => u.t !== 'K' && u.t !== 'P') ? null : '바칠 분대원이 없음'), apply: (s, rng) => {
        const u = pick(rng, s.squad.filter((x) => x.t !== 'K' && x.t !== 'P'))!;
        s.squad = s.squad.filter((x) => x !== u);
        return { text: `${josa(u.name, '이')} 쇳물 속으로 가라앉는다. 그림자가 무언가를 내민다.`, partPick: true, elite: true };
      } },
      leave('거절하기'),
    ],
  },
  dipping: {
    title: '쇳물 담금질',
    text: '끓는 쇳물 위로 집게가 흔들린다. 담금질은 쇠를 벼리거나, 삼킨다.',
    choices: [
      { label: '하나를 담글까?', desc: '50%: 한 단계 위 · 50%: 잃는다', blocked: (s) => (s.squad.some((u) => UP[u.t]) ? null : '담글 분대원이 없음'), apply: (s, rng) => {
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
      { label: '건네기', desc: '폰 둘 → 나이트 + 도약 카드', blocked: (s) => (s.squad.filter((u) => u.t === 'P').length >= 2 ? null : '폰 2기 필요'), apply: (s) => {
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
      { label: '나사 100을 걸까?', desc: '50%: 희귀 이상 부품 · 50%: 빈 상자', blocked: poor(100), apply: (s, rng) => { s.gold -= 100; return rng.int(2) === 0 ? { slot: 0, text: '상자가 열린다. 부품이 빛난다.', partPick: true, elite: true } : { slot: 1, text: '상자는 비어 있다. 경매인이 웃지 않는다. (나사 −100)' }; } },
      leave('떠나기'),
    ],
  },
  brokenGacha: {
    title: '쓰러진 뽑기 기계',
    text: '쓰러진 뽑기 기계가 어둠 속에서 희미하게 깜빡인다. 레버는 아직 당신의 손을 기다린다.',
    choices: [
      { label: '나사 60을 넣을까?', desc: '40%: 희귀 부품 · 25%: 승급 · 35%: 꽝 + 감전', blocked: poor(60), apply: (s, rng) => {
        s.gold -= 60;
        const r = rng.int(100);
        if (r < 40) return { slot: 0, text: '기계가 덜컹이며 캡슐을 뱉는다.', partPick: true, elite: true };
        if (r < 65) {
          const u = pick(rng, s.squad.filter((x) => UP[x.t]));
          if (u) {
            const t = UP[u.t]!;
            s.squad = s.squad.map((x) => (x === u ? { ...x, t, hp: undefined } : x));
            return { slot: 1, text: `불꽃이 튄다. ${josa(u.name, '은')} 이제 ${NAMES[t]}이다.` };
          }
        }
        hpRatio(s, -0.2);
        return { slot: 2, text: '기계가 침묵하다 불꽃을 토한다. (나사 −60 · HP −20%)' };
      } },
      leave('지나가기'),
    ],
  },
  safe: {
    title: '녹슨 금고',
    text: '녹슨 금고 안에서 나사가 쏟아지는 소리가 난다. 손잡이에는 날이 서 있다.',
    choices: [
      { label: '부수기', desc: '나사 +150 · 분대 HP −35%', apply: (s) => { s.gold += 150; hpRatio(s, -0.35); return { text: '손잡이가 손을 벤다. 나사가 쏟아진다. (나사 +150 · HP −35%)' }; } },
      leave('떠나기'),
    ],
  },
  counterweight: {
    title: '비뚤어진 저울추',
    text: '검수대 저울에 녹슨 추가 매달려 있다. 저울지기 폰이 속삭인다. “한쪽이 가벼워지면, 다른 쪽이 무거워지지.”',
    choices: [
      { label: '카드 하나를 올린다', desc: '고른 카드 태엽 −1 · 다른 카드 하나 +1', blocked: (s) => (weighable(s).length ? null : '올릴 카드가 없습니다'), apply: () => ({ text: '저울지기가 빈 접시를 내민다.', cardPick: 'counterweight' }) },
      leave('지나가기'),
    ],
  },
  conveyor: {
    title: '거꾸로 도는 컨베이어',
    text: '컨베이어가 거꾸로 돈다. 상자들이 당신 쪽으로 밀려온다. 레버 옆에 낙서가 있다. “넣은 만큼 바뀌어 나온다.”',
    choices: [
      { label: '카드 둘을 올린다', desc: '무작위 카드 2장 → 새 카드 2장', blocked: (s) => (s.deck.length >= 6 ? null : '덱이 너무 얇습니다'), apply: (s, rng) => {
        const gone: string[] = [];
        const got: string[] = [];
        for (let n = 0; n < 2; n++) {
          const k = rng.int(s.deck.length);
          gone.push(COMMANDS[s.deck[k]].name);
          const nid = REWARD_COMMANDS[rng.int(REWARD_COMMANDS.length)];
          s.deck[k] = nid;
          got.push(COMMANDS[nid].name);
        }
        return { text: `${josa(gone.join(' · '), '이')} 실려 가고, ${josa(got.join(' · '), '이')} 실려 온다.` };
      } },
      leave('레버를 놓는다'),
    ],
  },
};

export const SLICE_EVENT_IDS = Object.keys(SLICE_EVENTS) as SliceEventId[];
