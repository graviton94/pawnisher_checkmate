import type { PieceType } from '../engine';
import { josa } from '../data/josa';
import { Rng } from '../engine/rng';
import { COMMANDS, isRefined, isRusted, REWARD_COMMANDS, refineOnce, rustOnce, SLICE, type CommandId } from './cards';
import type { Crew } from './crew';
import { crewMaxHp } from './battle';

/**
 * 사건 (R5-3, D-170): 본편 돌발 12종(D-158 문체)을 시험판 체계(분대원 · 카드 · 부품 · 나사)로 옮겼다.
 * 효과는 순수 함수 — 화면은 결과 문구와 후속(부품 고르기)만 받는다. 무작위가 걸린 선택은 「?」(말투 원칙 11).
 */
export type SliceEventId = 'tinker' | 'smith' | 'gambler' | 'apprentice' | 'scout' | 'napping' | 'nightShift' | 'pact' | 'dipping' | 'swapDealer' | 'auction' | 'brokenGacha' | 'safe' | 'counterweight' | 'conveyor' | 'oilMerchant' | 'blueprint' | 'scrapTrade'
  // 사건 2차 (D-287)
  | 'lostPawn' | 'scrapHeap' | 'rustBath' | 'drillRook' | 'cardSharp' | 'castMold' | 'crownAltar' | 'duelKnight' | 'bookCart' | 'sleepingKing' | 'echoWell' | 'copyPress' | 'fieldMedic' | 'coldForge' | 'tollGate' | 'mirrorHall' | 'overtime';

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
 * 고른 카드 한 장은 한 번 다듬고 덱의 다른 카드 하나(고른 것 말고)가 녹슨다.
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
/**
 * 한 명이 치른다 (D-283, 사건 가치 진단 docs/reports/2026-11-06-event-value.md — 「분대 전체 HP 대가가 너무 비싸다」):
 * 가장 성한 분대원(킹 제외) 하나가 대가를 치른다 — HP는 1 아래로 내려가지 않는다. 그 분대원 이름을 돌려준다.
 */
const oneHurt = (s: EventState, pct: number): string => {
  const u = [...nonKing(s)].sort((a, b) => (b.hp ?? crewMaxHp(b)) / crewMaxHp(b) - (a.hp ?? crewMaxHp(a)) / crewMaxHp(a))[0];
  if (!u) { hpRatio(s, -pct / 2); return '분대'; }
  const max = crewMaxHp(u);
  s.squad = s.squad.map((x) => (x === u ? { ...x, hp: Math.max(1, Math.round((x.hp ?? max) - max * pct)) } : x));
  return u.name ?? NAMES[u.t];
};
/** 분대가 가득 찼으면 이유 (새 분대원이 드는 선택지) */
const full = (s: EventState): string | null => (s.squad.length >= SLICE.squadMax ? '분대가 가득 찼습니다' : null);
/** 분대원 n명이 각각 pct만큼 HP를 잃는다 (가장 성한 쪽부터 · 킹 제외) — 이름들을 돌려준다 */
const someHurt = (s: EventState, n: number, pct: number): string => Array.from({ length: n }, () => oneHurt(s, pct)).filter((x, i, a) => a.indexOf(x) === i).join(' · ');
const poor = (n: number) => (s: EventState) => (s.gold < n ? `나사 ${n} 필요` : null);
const leave = (text: string): SliceEventChoice => ({ label: text, desc: '', apply: () => ({ text: '당신은 말없이 발걸음을 돌린다.' }) });

/**
 * 사건 15종 (D-250, 사용자: 「사건도 게임으로 치면 스테이지 하나 — 지금은 보너스처럼 low risk low return, 쉬어 가는 것 같다. high risk high return으로」 ·
 * 「세부 설명이 너무 길다」). 판돈은 나사 절반 · 전부 · 분대원 · 카드 여러 장 단위로, 대가는 황금 쪽 부품 · 여러 장 다듬기 · 두 단계 같은 큰 것으로.
 * 설명(desc)은 한 줄: 확률이면 「n%: 결과 · n%: 결과」, 아니면 「무엇 → 무엇」.
 */
export const SLICE_EVENTS: Record<SliceEventId, SliceEventDef> = {
  tinker: {
    title: '떠돌이 땜장이',
    text: '외눈 렌즈를 낀 땜장이가 당신의 분대를 훑는다. “가장 오래 버틴 놈 하나. 그놈 축만 두껍게 해 주지.”',
    choices: [
      {
        label: '나사 40을 낼까?',
        desc: '최다 처치 분대원 · 생명 +1 (영구)',
        blocked: (s) => (s.gold < 40 ? '나사 40 필요' : !nonKing(s).length ? '맡길 분대원 없음' : null),
        apply: (s) => {
          s.gold -= 40;
          const u = [...nonKing(s)].sort((a, b) => (b.kills ?? 0) - (a.kills ?? 0))[0];
          u.doors = (u.doors ?? 0) + 1;
          return { text: `불꽃이 튄다. ${u.name ?? NAMES[u.t]}, 그 축이 두꺼워졌다. (생명 +1)` };
        },
      },
      {
        label: '축을 끝까지 조일까?',
        desc: '50%: 생명 +2 · 50%: 심장 톱니가 깨진다',
        blocked: (s) => (s.gold < 40 ? '나사 40 필요' : !nonKing(s).length ? '맡길 분대원 없음' : null),
        apply: (s, rng) => {
          s.gold -= 40;
          const u = [...nonKing(s)].sort((a, b) => (b.kills ?? 0) - (a.kills ?? 0))[0];
          if (rng.int(2) === 0) { u.doors = (u.doors ?? 0) + 2; return { slot: 0, text: `축이 끝까지 물린다. ${u.name ?? NAMES[u.t]}의 생명 +2.` }; }
          s.squad = s.squad.map((x) => (x === u ? { ...x, cracked: true } : x));
          return { slot: 1, text: `쩍. 축이 비명을 지르며 갈라진다. ${u.name ?? NAMES[u.t]}의 심장 톱니에 금이 갔다.` };
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
    text: '외알 안경의 나이트가 발굽 위로 동전을 굴린다. “동전이 정한다. 앞면이면 내 걸 주지. 뒷면이면 네 쪽 하나를 걷어찬다.”',
    choices: [
      // D-254: 코인토스는 두고 나사 내기(두 배 · 몰수)를 뺐다 — 결과는 부품 · 분대원 피해
      { label: '동전을 던지게 둘까?', desc: '앞면: 부품 하나 · 뒷면: 분대원 하나 HP −50%', blocked: (s) => (nonKing(s).length ? null : '분대원 필요'), apply: (s, rng) => {
        if (rng.int(2) === 0) return { slot: 0, text: '앞면이다. 나이트가 혀를 차며, 마지못해 안장에서 부품을 꺼낸다.', partPick: true };
        const u = pick(rng, nonKing(s))!;
        s.squad = s.squad.map((x) => (x === u ? { ...x, hp: Math.max(1, Math.round((x.hp ?? crewMaxHp(x)) - crewMaxHp(x) * 0.5)) } : x));
        return { slot: 1, text: `뒷면. 발굽이 ${josa(u.name, '을')} 걷어찬다. (HP −50%)` };
      } },
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
        return { slot: 1, text: `망치가 빗나간다. ${gone.length ? `${josa(gone.join(' · '), '이')} 부서졌다.` : ''}` };
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
          return { slot: 0, text: `도장이 두 번 찍힌다. ${josa(ps.map((u) => u.name).join(' · '), '은')} 이제 나이트다.` };
        }
        const fine = Math.floor(s.gold / 2);
        s.gold -= fine;
        return { slot: 1, text: `저울의 탐욕스러운 눈이 번쩍 뜨인다. 벌금이 매겨진다. (나사 −${fine})` };
      } },
      leave('지나가기'),
    ],
  },
  nightShift: {
    title: '야간 교대',
    text: '꺼지지 않은 공방의 불빛이 당신을 부른다. 장인은 잠들었고 모루는 아직 뜨겁다.',
    choices: [
      { label: '두드리기', desc: '분대 전원 HP +30%', apply: (s) => { hpRatio(s, 0.3); return { text: '쇳소리가 밤새 이어진다. 동이 틀 무렵, 분대가 다시 일어선다. (HP +30%)' }; } },
      { label: '불을 키울까?', desc: '50%: HP 가득 + 카드 1장 다듬기 · 50%: 분대원 하나 HP −60%', apply: (s, rng) => {
        if (rng.int(2) === 0) { hpRatio(s, 1); return { slot: 0, text: `불길이 쇠를 새로 벼린다. 분대가, 갓 부은 쇠처럼 선다. ${refineRandom(s, rng)}` }; }
        const who = oneHurt(s, 0.6);
        return { slot: 1, text: `불이 번진다. ${josa(who, '이')} 그을린 채 빠져나온다. (HP −60%)` };
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
        return { text: '폰 둘이 손수레에 오른다. 대가로, 수레 위의 나이트가 내려선다.', recruit: 'N' };
      } },
      leave('거절하기'),
    ],
  },
  auction: {
    // D-254: 고철 경매(돈을 걸고 상자를 사는 것)를 녹슨 봉인 상자로 — 거는 것 없이, 녹을 긁어 각인을 읽는다
    title: '녹슨 봉인 상자',
    text: '고철 더미 사이에 쇠사슬로 묶인 상자가 있다. 봉인판의 각인 세 칸이 녹에 덮여 있다. 각인이 맞으면 봉인이 풀린다.',
    choices: [
      { label: '녹을 긁어낼까?', desc: '50%: 희귀 이상 부품 · 50%: 녹 독 (분대원 하나 HP −50%)', apply: (s, rng) => {
        if (rng.int(2) === 0) return { slot: 0, text: '각인 셋이 맞물린다. 사슬이 풀리며, 봉인된 상자가 열린다.', partPick: true, elite: true };
        const who = oneHurt(s, 0.5);
        return { slot: 1, text: `각인이 어긋난다. 녹 가루가 ${who}의 이음새로 스민다. (HP −50%)` };
      } },
      leave('떠나기'),
    ],
  },
  brokenGacha: {
    // D-254: 뽑기 기계(나사를 넣는 슬롯) → 고장 난 조립 판정기 — 거는 것 없이, 기계가 분대의 힘을 끌어 쓴다
    title: '고장 난 조립 판정기',
    text: '쓰러진 판정기의 깔때기 셋이 덜컹인다. 손잡이에 손을 대면 기계가 힘을 빨아들인다. 세 칸이 맞으면 합격품이 나온다.',
    choices: [
      { label: '판정기를 돌릴까?', desc: '분대원 하나 HP −35% · 40%: 희귀 부품 · 25%: 승급 · 35%: 감전', apply: (s, rng) => {
        const who = oneHurt(s, 0.35);
        const r = rng.int(100);
        if (r < 40) return { slot: 0, text: '세 칸이 맞물린다. 판정기가 덜컹이며, 합격품을 뱉어 낸다.', partPick: true, elite: true };
        if (r < 65) {
          const u = pick(rng, s.squad.filter((x) => UP[x.t]));
          if (u) {
            const t = UP[u.t]!;
            s.squad = s.squad.map((x) => (x === u ? { ...x, t, hp: undefined } : x));
            return { slot: 1, text: `왕관 셋. 판정기가 ${josa(u.name, '을')} 끌어당겨 다시 찍어 낸다. 이제 ${NAMES[t]}이다.` };
          }
        }
        oneHurt(s, 0.3);
        return { slot: 2, text: `하자. 판정기가 불꽃을 토한다. ${josa(who, '이')} 한 번 더 감전된다. (HP −30% 더)` };
      } },
      leave('지나가기'),
    ],
  },
  safe: {
    title: '녹슨 금고',
    text: '녹슨 금고 안에서 나사가 쏟아지는 소리가 난다. 손잡이에는 날이 서 있다.',
    choices: [
      { label: '부수기', desc: '나사 +150 · 분대원 하나 HP −70%', apply: (s) => { s.gold += 150; const who = oneHurt(s, 0.7); return { text: `손잡이가 ${who}의 손을 벤다. 나사가 쏟아진다. (나사 +150 · HP −70%)` }; } },
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
        return { text: `${josa(gone.join(' · '), '이')} 실려 가고 ${josa(got.join(' · '), '이')} 실려 온다.` };
      } },
      leave('레버를 놓는다'),
    ],
  },
  // ---- 확정 거래 (D-283, 사건 가치 진단 — 「나사가 남는다, 확정 거래로 쓸 곳을」) ----
  oilMerchant: {
    title: '기름 장수',
    text: '기름통을 실은 손수레가 길을 막는다. 수레 위의 룩이 국자를 흔든다. “관절에 기름 한 국자. 값은 정해져 있다.”',
    choices: [
      { label: '나사 60을 낼까?', desc: '분대 전원 HP +40%', blocked: poor(60), apply: (s) => { s.gold -= 60; hpRatio(s, 0.4); return { text: '국자가 관절마다 기름을 붓는다. 삐걱이던 소리가, 하나씩 잦아든다. (HP +40%)' }; } },
      { label: '나사 110을 낼까?', desc: '깨진 심장 톱니 하나를 고친다', blocked: (s) => (s.gold < 110 ? '나사 110 필요' : !s.squad.some((u) => u.cracked) ? '깨진 심장 톱니 없음' : null), apply: (s) => { s.gold -= 110; const u = s.squad.find((x) => x.cracked)!; s.squad = s.squad.map((x) => (x === u ? { ...x, cracked: false } : x)); return { text: `기름 먹인 새 톱니가 ${u.name ?? NAMES[u.t]}의 가슴에 물린다. (심장 톱니 수리)` }; } },
      leave('지나가기'),
    ],
  },
  blueprint: {
    title: '떠도는 설계도',
    text: '바람에 날리던 설계도 한 장이 발치에 걸린다. 귀퉁이에 값이 적혀 있다. 「나사 70 — 세 장을 고쳐 그린다.」',
    choices: [
      { label: '나사 70을 낼까?', desc: '무작위 카드 3장 다듬기', blocked: (s) => (s.gold < 70 ? '나사 70 필요' : refinable(s).length < 1 ? '다듬을 카드 없음' : null), apply: (s, rng) => { s.gold -= 70; return { text: `설계도의 선이 고쳐진다. ${refineRandom(s, rng)} · ${refineRandom(s, rng)} · ${refineRandom(s, rng)}` }; } },
      leave('지나가기'),
    ],
  },
  scrapTrade: {
    title: '고철 교환소',
    text: '철망 너머에서 폰 하나가 저울을 두드린다. “나사 백. 부품 상자 하나. 고르는 건 너다.”',
    choices: [
      { label: '나사 100을 낼까?', desc: '부품 하나를 고른다', blocked: poor(100), apply: (s) => { s.gold -= 100; return { text: '철망 문이 열리고, 잊혀진 상자 하나가 밀려 나온다.', partPick: true }; } },
      leave('지나가기'),
    ],
  },
  // ---- 사건 2차 (D-287, 대과제 3-3): 거래 · 내기 · 덱 손질 · 분대 — 장면 그림은 발주서 V-19 ~ V-35 ----
  lostPawn: {
    title: '길 잃은 폰',
    text: '포장 라인에서 떨어져 나온 폰 하나가 길가에 서 있다. 등에 붙은 출하표가 반쯤 찢겨 있다. “…출구가 어느 쪽이에요?”',
    choices: [
      { label: '데려간다', desc: '폰 하나가 분대에 든다', blocked: full, apply: () => ({ text: '폰이 말없이, 당신의 줄 맨 끝에 선다.', recruit: 'P' }) },
      { label: '길을 알려 준다', desc: '나사 +25', apply: (s) => { s.gold += 25; return { text: '폰이 주머니를 털어 나사를 내민다. 그리고 출구를 향해, 홀로 걸어간다. (나사 +25)' }; } },
      leave('지나가기'),
    ],
  },
  scrapHeap: {
    title: '고철 더미',
    text: '녹슨 고철이 산처럼 쌓여 있다. 그 아래 어딘가에서 나사 구르는 소리가 난다. 더미가 삐걱인다.',
    choices: [
      { label: '파고들까?', desc: '60%: 나사 +70 · 40%: 분대원 하나 HP −40%', apply: (s, rng) => {
        if (rng.int(10) < 6) { s.gold += 70; return { slot: 0, text: '고철 틈으로 팔을 밀어 넣는다. 묵직한 나사 주머니가, 딸려 나온다. (나사 +70)' }; }
        const who = oneHurt(s, 0.4);
        return { slot: 1, text: `더미가 무너진다. ${josa(who, '이')} 깔린다. (HP −40%)` };
      } },
      leave('지나가기'),
    ],
  },
  rustBath: {
    title: '녹 벗기는 통',
    text: '시큼한 냄새가 나는 통 옆에서 비숍 하나가 장갑을 낀다. “녹슨 명령서는 이리. 한 장에 나사 스물.”',
    choices: [
      { label: '녹슨 카드를 맡긴다', desc: '녹슨 카드의 녹을 벗긴다 (장당 나사 20)', blocked: (s) => (!s.deck.some(isRusted) ? '녹슨 카드 없음' : s.gold < 20 ? '나사 20 필요' : null), apply: (s) => {
        const done: string[] = [];
        s.deck = s.deck.map((id) => { if (!isRusted(id) || s.gold < 20) return id; s.gold -= 20; done.push(COMMANDS[id].name); return refineOnce(id); });
        return { text: `통에서 꺼낸 명령서가 다시 빛난다. ${done.join(' · ')}` };
      } },
      { label: '통째로 담글까?', desc: '50%: 카드 2장 다듬기 · 50%: 카드 2장 녹슨다', apply: (s, rng) => {
        if (rng.int(2) === 0) return { slot: 0, text: `산이 군살만 벗겨 낸다. ${refineRandom(s, rng)} · ${refineRandom(s, rng)}` };
        const hit: string[] = [];
        for (let n = 0; n < 2; n++) { const k = rng.int(s.deck.length); if (!isRusted(s.deck[k])) { hit.push(COMMANDS[s.deck[k]].name); s.deck[k] = rustOnce(s.deck[k]); } }
        return { slot: 1, text: `산이 너무 진하다. ${hit.join(' · ') || '명령서'}에 녹이 슨다.` };
      } },
      leave('지나가기'),
    ],
  },
  drillRook: {
    title: '교관 룩',
    text: '연병장 한가운데 룩이 버티고 서 있다. “한 놈 보내라. 하루 만에 쇠로 만들어 주지. 살아남는다면.”',
    choices: [
      { label: '하나를 맡긴다', desc: '가장 덜 싸운 분대원 · 생명 +1 · 그 분대원 HP −40%', blocked: (s) => (nonKing(s).length ? null : '맡길 분대원 없음'), apply: (s) => {
        const u = [...nonKing(s)].sort((a, b) => (a.kills ?? 0) - (b.kills ?? 0))[0];
        const max = crewMaxHp(u);
        s.squad = s.squad.map((x) => (x === u ? { ...x, doors: (x.doors ?? 0) + 1, hp: Math.max(1, Math.round((x.hp ?? max) - max * 0.4)) } : x));
        return { text: `${josa(u.name ?? NAMES[u.t], '이')} 비틀거리며 돌아온다. 눈빛이 달라졌다. (생명 +1 · HP −40%)` };
      } },
      leave('거절하기'),
    ],
  },
  cardSharp: {
    title: '명령서 사기꾼',
    text: '뒤집힌 상자 위에서 흑 비숍이 명령서를 섞는다. “한 장 팔 테냐, 한 장 살 테냐.”',
    choices: [
      { label: '한 장 판다', desc: '무작위 카드 1장 → 나사 +45', blocked: (s) => (s.deck.length > 6 ? null : '덱이 너무 얇습니다'), apply: (s, rng) => {
        const id = s.deck.splice(rng.int(s.deck.length), 1)[0];
        s.gold += 45;
        return { text: `${josa(COMMANDS[id].name, '이')} 비숍의 소매 속으로 사라진다. (나사 +45)` };
      } },
      { label: '나사 55를 낼까?', desc: '새 카드 1장 (무엇일지는 모른다)', blocked: poor(55), apply: (s, rng) => {
        s.gold -= 55;
        const id = REWARD_COMMANDS[rng.int(REWARD_COMMANDS.length)];
        s.deck.push(id);
        return { text: `비숍이 한 장을 뒤집어 내민다. ${COMMANDS[id].name}.` };
      } },
      leave('지나가기'),
    ],
  },
  castMold: {
    title: '버려진 주물틀',
    text: '식은 주물틀이 열린 채 놓여 있다. 안쪽에 폰 모양이 새겨져 있다. 국자에는 쇳물이 조금 남았다.',
    choices: [
      { label: '쇳물을 부어 볼까?', desc: '50%: 폰 하나가 분대에 든다 · 50%: 분대원 하나 HP −45%', blocked: full, apply: (s, rng) => {
        if (rng.int(2) === 0) return { slot: 0, text: '틀이 갈라지고, 갓 굳은 폰 하나가 일어선다.', recruit: 'P' };
        const who = oneHurt(s, 0.45);
        return { slot: 1, text: `쇳물이 튄다. ${josa(who, '이')} 데인다. (HP −45%)` };
      } },
      leave('지나가기'),
    ],
  },
  crownAltar: {
    title: '녹슨 왕관 제단',
    text: '부서진 제단 위에 녹슨 왕관 하나가 놓여 있다. 그 앞 접시에 나사가 수북하다. 누군가 바치고 간 것이다.',
    choices: [
      { label: '가진 나사를 전부 바친다', desc: '나사 전부 → 희귀 이상 부품', blocked: (s) => (s.gold < 80 ? '나사 80 이상 필요' : null), apply: (s) => { s.gold = 0; return { text: '왕관의 녹이 갈라진다. 그 아래에서, 무언가가 빛을 발한다.', partPick: true, elite: true }; } },
      { label: '접시의 나사를 가져갈까?', desc: '50%: 나사 +80 · 50%: 분대원 둘 HP −30%', apply: (s, rng) => {
        if (rng.int(2) === 0) { s.gold += 80; return { slot: 0, text: '아무 일도, 일어나지 않는다. 접시만이 가벼워진다. (나사 +80)' }; }
        const who = someHurt(s, 2, 0.3);
        return { slot: 1, text: `제단이 무너져 내린다. ${josa(who, '이')} 파편에 긁힌다. (HP −30%)` };
      } },
      leave('지나가기'),
    ],
  },
  duelKnight: {
    title: '결투하는 나이트',
    text: '길 한가운데 나이트 하나가 창을 세운다. “너희 중 가장 센 놈. 한 판.”',
    choices: [
      { label: '결투를 받을까?', desc: '60%: 생명 +1 · 나사 +40 · 40%: 심장 톱니가 깨진다', blocked: (s) => (nonKing(s).length ? null : '내보낼 분대원 없음'), apply: (s, rng) => {
        const u = [...nonKing(s)].sort((a, b) => SELL[b.t] - SELL[a.t])[0];
        if (rng.int(10) < 6) {
          s.gold += 40;
          s.squad = s.squad.map((x) => (x === u ? { ...x, doors: (x.doors ?? 0) + 1 } : x));
          return { slot: 0, text: `${josa(u.name ?? NAMES[u.t], '이')} 창을 쳐낸다. 나이트가 말에서 떨어진다. (생명 +1 · 나사 +40)` };
        }
        s.squad = s.squad.map((x) => (x === u ? { ...x, cracked: true } : x));
        return { slot: 1, text: `창끝이 ${u.name ?? NAMES[u.t]}의 가슴을 꿰뚫는다. 심장 톱니에 금이 간다.` };
      } },
      leave('비켜 간다'),
    ],
  },
  bookCart: {
    title: '기보 수레',
    text: '낡은 기보를 실은 수레가 멈춘다. 책장 사이에 접힌 명령서가 끼워져 있다. “한 권 나사 예순. 수읽기는 덤이다.”',
    choices: [
      { label: '나사 60을 낼까?', desc: '수읽기 카드 2장', blocked: poor(60), apply: (s, rng) => {
        s.gold -= 60;
        const pool = REWARD_COMMANDS.filter((id) => COMMANDS[id].axis === 'tactic' || COMMANDS[id].axis2 === 'tactic');
        const got: string[] = [];
        for (let n = 0; n < 2 && pool.length; n++) { const id = pool[rng.int(pool.length)]; s.deck.push(id); got.push(COMMANDS[id].name); }
        return { text: `책장 사이에서 명령서 두 장이 떨어진다. ${got.join(' · ')}` };
      } },
      leave('지나가기'),
    ],
  },
  sleepingKing: {
    title: '조는 남의 킹',
    text: '다른 공장의 킹이 포장대 옆에서 졸고 있다. 왕관에 박힌 보석이 반짝인다. 호위는 보이지 않는다.',
    choices: [
      { label: '보석을 뽑을까?', desc: '50%: 나사 +110 · 50%: 분대원 둘 HP −35%', apply: (s, rng) => {
        if (rng.int(2) === 0) { s.gold += 110; return { slot: 0, text: '보석이 소리 없이 빠진다. 잠든 킹은, 깨어나지 않는다. (나사 +110)' }; }
        const who = someHurt(s, 2, 0.35);
        return { slot: 1, text: `킹의 눈이 번쩍 뜨인다. 홀이 휘둘린다. ${josa(who, '이')} 얻어맞는다. (HP −35%)` };
      } },
      leave('조용히 지나간다'),
    ],
  },
  echoWell: {
    title: '메아리 우물',
    text: '마른 우물 바닥에서 당신의 발소리가 늦게 돌아온다. 무엇을 던지면, 그것만 돌아오지 않는다.',
    choices: [
      { label: '카드 한 장을 던진다', desc: '녹슨 카드 하나 (없으면 무작위 카드) 영영 뺀다', blocked: (s) => (s.deck.length > 6 ? null : '덱이 너무 얇습니다'), apply: (s, rng) => {
        const rusted = s.deck.map((id, k) => [id, k] as const).filter(([id]) => isRusted(id));
        const k = rusted.length ? rusted[rng.int(rusted.length)][1] : rng.int(s.deck.length);
        const id = s.deck.splice(k, 1)[0];
        return { text: `${josa(COMMANDS[id].name, '이')} 어둠 속으로 떨어진다. 메아리가 돌아오지 않는다.` };
      } },
      { label: '나사 30을 던질까?', desc: '50%: 나사 +70 · 50%: 아무 일도 없다', blocked: poor(30), apply: (s, rng) => {
        s.gold -= 30;
        if (rng.int(2) === 0) { s.gold += 70; return { slot: 0, text: '나사 소리가 두 배가 되어 돌아온다. 우물 벽 틈에서, 나사가 쏟아진다. (나사 +40)' }; }
        return { slot: 1, text: '나사가 바닥에 닿는 소리조차, 들려오지 않는다. (나사 −30)' };
      } },
      leave('지나가기'),
    ],
  },
  copyPress: {
    title: '낡은 압인기',
    text: '명령서를 찍어 내던 압인기가 멈춰 서 있다. 레버 옆에 긁어 쓴 글씨가 있다. 「한 장 넣으면 두 장」.',
    choices: [
      { label: '나사 50을 낼까?', desc: '무작위 카드 1장 복제', blocked: poor(50), apply: (s, rng) => {
        s.gold -= 50;
        const ok = s.deck.filter((id) => !isRusted(id));
        const id = ok.length ? ok[rng.int(ok.length)] : s.deck[rng.int(s.deck.length)];
        s.deck.push(id);
        return { text: `압인기가 쿵 내려앉는다. ${josa(COMMANDS[id].name, '이')} 두 장이 된다.` };
      } },
      leave('지나가기'),
    ],
  },
  fieldMedic: {
    title: '순회 수리 비숍',
    text: '구급 가방을 멘 비숍이 깨진 톱니를 찾아 분대를 훑는다. “고쳐 주지. 대신 명령서 한 장이 녹슨다. 기름이 모자라거든.”',
    choices: [
      { label: '맡긴다', desc: '깨진 심장 톱니 하나 수리 · 무작위 카드 1장 녹슨다', blocked: (s) => (s.squad.some((u) => u.cracked) ? null : '깨진 심장 톱니 없음'), apply: (s, rng) => {
        const u = s.squad.find((x) => x.cracked)!;
        s.squad = s.squad.map((x) => (x === u ? { ...x, cracked: false } : x));
        const ks = s.deck.map((id, k) => [id, k] as const).filter(([id]) => !isRusted(id));
        const o = ks.length ? ks[rng.int(ks.length)] : null;
        if (o) s.deck[o[1]] = rustOnce(o[0]);
        return { text: `${u.name ?? NAMES[u.t]}의 가슴에서 새 톱니가 돈다.${o ? ` 대신 ${josa(COMMANDS[o[0]].name, '이')} 녹슨다.` : ''}` };
      } },
      leave('지나가기'),
    ],
  },
  coldForge: {
    title: '식은 대장간',
    text: '주인 없는 대장간. 모루는 식었지만 화로는 다시 지필 수 있다. 풀무가 무겁다.',
    choices: [
      { label: '풀무를 밟는다', desc: '카드 1장 다듬기 · 분대원 하나 HP −25%', blocked: (s) => (refinable(s).length ? null : '다듬을 카드 없음'), apply: (s, rng) => {
        const who = oneHurt(s, 0.25);
        return { text: `${josa(who, '이')} 풀무를 밟는다. 불이 붙는다. ${refineRandom(s, rng)}` };
      } },
      leave('지나가기'),
    ],
  },
  tollGate: {
    title: '통행 문',
    text: '쇠창살 문 앞에 룩 둘이 버티고 있다. 팻말이 걸려 있다. 「통행세 나사 40」. 문 옆 상자에서 나사 소리가 난다.',
    choices: [
      { label: '나사 40을 낸다', desc: '분대 전원 HP +20% (초소에서 쉰다)', blocked: poor(40), apply: (s) => { s.gold -= 40; hpRatio(s, 0.2); return { text: '룩들이 길을 비킨다. 초소의 난로가, 얼어붙은 분대를 녹인다. (HP +20%)' }; } },
      { label: '문을 부술까?', desc: '60%: 나사 +60 · 40%: 분대원 하나 HP −60%', apply: (s, rng) => {
        if (rng.int(10) < 6) { s.gold += 60; return { slot: 0, text: '창살이 휜다. 겁먹은 룩들이 달아나고, 버려진 상자만 남는다. (나사 +60)' }; }
        const who = oneHurt(s, 0.6);
        return { slot: 1, text: `룩이 버틴다. ${josa(who, '이')} 문짝에 부딪혀 나뒹군다. (HP −60%)` };
      } },
      leave('돌아간다'),
    ],
  },
  mirrorHall: {
    title: '거울 복도',
    text: '양쪽 벽이 모두 거울이다. 분대원 하나의 그림자가 거울 속에서 한 발 늦게 움직인다.',
    choices: [
      { label: '그림자를 붙잡을까?', desc: '50%: 같은 기물 하나가 분대에 든다 · 50%: 그 분대원 HP −50%', blocked: (s) => (!nonKing(s).length ? '분대원 필요' : full(s)), apply: (s, rng) => {
        const u = pick(rng, nonKing(s))!;
        if (rng.int(2) === 0) return { slot: 0, text: `거울 속 ${josa(u.name ?? NAMES[u.t], '이')} 걸어 나온다. 하나가 둘이 된다.`, recruit: u.t };
        const max = crewMaxHp(u);
        s.squad = s.squad.map((x) => (x === u ? { ...x, hp: Math.max(1, Math.round((x.hp ?? max) - max * 0.5)) } : x));
        return { slot: 1, text: `거울이 깨진다. 파편이 ${josa(u.name ?? NAMES[u.t], '을')} 벤다. (HP −50%)` };
      } },
      leave('눈을 돌린다'),
    ],
  },
  overtime: {
    title: '연장 근무',
    text: '라인의 사이렌이 울린다. 감독 룩이 소리친다. “연장이다! 한 바퀴 더 돌면 수당이 두 배!”',
    choices: [
      { label: '연장을 뛴다', desc: '분대 전원 HP −20% · 나사 +90', apply: (s) => { hpRatio(s, -0.2); s.gold += 90; return { text: '라인이 밤새 돈다. 분대는 휘청이며, 두툼한 수당 봉투를 받아 든다. (HP −20% · 나사 +90)' }; } },
      { label: '쉬겠다고 한다', desc: '분대 전원 HP +15%', apply: (s) => { hpRatio(s, 0.15); return { text: '감독이 혀를 찬다. 분대는 구석에 모여 눈을 붙인다. 사이렌 소리가, 멀어져 간다. (HP +15%)' }; } },
    ],
  },
};

export const SLICE_EVENT_IDS = Object.keys(SLICE_EVENTS) as SliceEventId[];
