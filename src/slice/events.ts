import type { PieceType } from '../engine';
import { josa } from '../data/josa';
import { Rng } from '../engine/rng';
import { cardFits, COMMANDS, gradeOf, isRefined, isRusted, REWARD_COMMANDS, refineOnce, rustOnce, SLICE, START_DECK, type CommandId } from './cards';
import type { Crew, QuirkId } from './crew';
import type { EffectTone } from './effect-text';
import { crewMaxHp } from './battle';
import type { SlicePartId } from './parts';

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
  /** 쥔 부품 (D-459 — 같은 부품을 두 번 주지 않게) */
  parts?: SlicePartId[];
}

export interface EventOutcome {
  /** 결과 서술 · 수치 한 줄 */
  text: string;
  /** 부품을 하나 고르게 한다 */
  partPick?: boolean;
  /** 부품을 높은 등급 쪽으로 (검문 · 반장과 같은 확률표) */
  elite?: boolean;
  /** 이 부품을 곧바로 준다 (D-459 — 대가가 붙은 부품을 거래로) */
  givePart?: SlicePartId;
  /** 새로 들어온 분대원 (이름 붙이기는 화면이) */
  recruit?: PieceType;
  /** 카드를 하나 고르게 한 뒤 counterweight()로 마무리한다 (D-247 저울추) */
  cardPick?: 'counterweight';
  /** 확률 선택이면 실제로 걸린 칸 (desc의 「n%: …」 순서, 0부터) — 화면이 룰렛을 그 칸에 세운다 (D-244) */
  slot?: number;
}

export interface SliceEventChoice {
  /** 선택지 이름 — 동사 하나(–다), 16자 이하 (D-395 · voice ⑧) */
  label: string;
  /** 결과 한 줄 — 명사구를 ` · `로, 28자 이하 (voice ⑦). 빈 글이면 떠나기(단추 줄 왼쪽 「떠난다」) */
  desc: string;
  /** 효과의 실제 득실. · 및 →로 나눈 순서. */
  tones?: readonly EffectTone[];
  /** 정보 단추 풀이 — 확률 세부 · 대상 · 용어 (합니다체 한 문장). 용어(생명 · 심장 톱니 …)는 화면이 KEYWORDS에서 더 붙인다 */
  info?: string;
  /** 고를 수 없으면 이유 */
  blocked?: (s: EventState) => string | null;
  /**
   * 고르며 알고 치르는 나사 (D-402) — 화면은 이 값만큼 나사 꼬리표 숫자를 굴려 내리고, 결과 FX에는 넣지 않는다.
   * 없으면 결과 줄 맨 앞 「나사 −N」을 읽는다. 확률로 잃거나 얻는 나사는 결과(FX)다.
   */
  pay?: (s: EventState) => number;
  /** 상태를 바꾸고 결과를 돌려준다 (s를 직접 고친다) */
  apply: (s: EventState, rng: Rng) => EventOutcome;
}

/** 고르며 알고 치르는 나사 (D-402): pay가 있으면 그 값, 없으면 결과 줄 맨 앞 「나사 −N」 */
export const choicePay = (c: SliceEventChoice, s: EventState): number => c.pay?.(s) ?? Number(c.desc.match(/^나사 −(\d+)/)?.[1] ?? 0);

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
// ---- 사건의 화폐 (D-459, 사용자: 「사건은 종류만 다양하지 대가 · 획득이 너무 평범하다」) ----
// 나사 · HP% 대신 빌드와 분대원의 정체성을 바꾸는 것: 기벽 갈아 끼우기 · 단련(영구 공격) · 대가 붙은 부품 · 덱 수술 · 심장 톱니
const GRADE_RANK: Record<string, number> = { common: 0, rare: 1, gold: 2 };
const nameOf = (u: Crew): string => u.name ?? NAMES[u.t];
/** 최다 처치 · 최다 출전 · 가장 덜 싸운 분대원 (킹 제외) */
const aceOf = (s: EventState) => [...nonKing(s)].sort((a, b) => (b.kills ?? 0) - (a.kills ?? 0))[0];
const veteranOf = (s: EventState) => [...nonKing(s)].sort((a, b) => (b.battles ?? 0) - (a.battles ?? 0))[0];
const greenOf = (s: EventState) => [...nonKing(s)].sort((a, b) => (a.kills ?? 0) - (b.kills ?? 0))[0];
/** 기벽을 갈아 끼운다 — HP는 같은 비율로 */
const setQuirk = (s: EventState, u: Crew, q: QuirkId): void => {
  const max0 = crewMaxHp(u);
  s.squad = s.squad.map((x) => (x === u ? { ...x, quirk: q, hp: Math.max(1, Math.round(((x.hp ?? max0) / max0) * crewMaxHp({ t: x.t, quirk: q }))) } : x));
};
/** 단련: 영구 공격 + */
const temper = (s: EventState, u: Crew, n: number): void => { s.squad = s.squad.map((x) => (x === u ? { ...x, temper: (x.temper ?? 0) + n } : x)); };
/** 심장 톱니를 깬다: 아직 성한 분대원 중 가장 HP가 많은 쪽 — 없으면 이름 없음 */
const crackOne = (s: EventState): string | null => {
  const u = [...nonKing(s)].filter((x) => !x.cracked).sort((a, b) => (b.hp ?? crewMaxHp(b)) - (a.hp ?? crewMaxHp(a)))[0];
  if (!u) return null;
  s.squad = s.squad.map((x) => (x === u ? { ...x, cracked: true } : x));
  return nameOf(u);
};
/** 덱에서 가장 귀한 카드 (녹슨 것 빼고, 등급 높은 순 — 같으면 앞의 것) */
const finestCard = (s: EventState): number => s.deck.map((id, k) => ({ id, k })).filter(({ id }) => !isRusted(id)).sort((a, b) => GRADE_RANK[gradeOf(b.id)] - GRADE_RANK[gradeOf(a.id)] || a.k - b.k)[0]?.k ?? -1;
/** 가장 약한 카드들의 자리: 녹슨 것 → 시작 카드 → 등급 낮은 순 */
const weakest = (s: EventState, n: number): number[] => s.deck.map((id, k) => ({ id, k, w: (isRusted(id) ? 0 : 10) + ((START_DECK as string[]).includes(id.replace(/[+~]$/, '')) ? 0 : 5) + GRADE_RANK[gradeOf(id)] })).sort((a, b) => a.w - b.w || a.k - b.k).slice(0, n).map((x) => x.k);
const startIdx = (s: EventState): number[] => s.deck.map((id, k) => ({ id, k })).filter(({ id }) => (START_DECK as string[]).includes(id.replace(/[+~]$/, ''))).map((x) => x.k);
const hasPart = (s: EventState, id: SlicePartId) => (s.parts ?? []).includes(id);
const leave = (text: string): SliceEventChoice => ({ label: text, desc: '', apply: () => ({ text: '당신은 말없이 발걸음을 돌린다.' }) });

/**
 * 사건 15종 (D-250, 사용자: 「사건도 게임으로 치면 스테이지 하나 — 지금은 보너스처럼 low risk low return, 쉬어 가는 것 같다. high risk high return으로」 ·
 * 「세부 설명이 너무 길다」). 판돈은 나사 절반 · 전부 · 분대원 · 카드 여러 장 단위로, 대가는 황금 쪽 부품 · 여러 장 다듬기 · 두 단계 같은 큰 것으로.
 * 글 예산 (D-395, 사건 창 `.win-scene`): 서술 두 문장 · 대사 한 마디 · 선택지 이름 ≤ 16자 + 결과 한 줄 ≤ 28자(확률이면 「n% 결과 · n% 결과」). 세부는 info로 — tests/event-text.test.ts.
 */
export const SLICE_EVENTS: Record<SliceEventId, SliceEventDef> = {
  tinker: {
    title: '떠돌이 땜장이',
    text: '외눈 렌즈를 낀 땜장이가 분대를 훑는다. “가장 오래 버틴 놈 하나. 그 축만 두껍게 해 주지.”',
    choices: [
      {
        label: '땜질을 맡긴다',
        desc: '나사 −40 · 최다 처치 분대원 생명 +1', tones: ['loss', 'gain'],
        blocked: (s) => (s.gold < 40 ? '나사 40 필요' : !nonKing(s).length ? '맡길 분대원 없음' : null),
        apply: (s) => {
          s.gold -= 40;
          const u = aceOf(s);
          u.doors = (u.doors ?? 0) + 1;
          return { text: `불꽃이 튄다. ${nameOf(u)}, 그 축이 두꺼워졌다. (생명 +1)` };
        },
      },
      {
        // D-459: 50% 생명 +2 · 50% 깨짐 → 에이스의 성격을 바꾼다 (유리 렌즈 — 공격 ×1.4 · HP −35%)
        label: '렌즈를 갈아 끼운다',
        desc: '에이스 기벽 → 공격 ×1.4 · HP −35%', tones: ['neutral', 'gain', 'loss'],
        info: '최다 처치 분대원의 기벽이 「유리 렌즈」로 바뀝니다. 원래 기벽은 사라집니다.',
        blocked: (s) => (!nonKing(s).length ? '맡길 분대원 없음' : aceOf(s).quirk === 'glass' ? '이미 유리 렌즈' : null),
        apply: (s) => {
          const u = aceOf(s);
          setQuirk(s, u, 'glass');
          return { text: `${nameOf(u)}의 눈에 얇은 유리알이 박힌다. (공격 ×1.4 · HP −35%)` };
        },
      },
      leave('지나가기'),
    ],
  },
  smith: {
    title: '떠돌이 정비 폰',
    text: '늙은 정비 폰이 렌치를 메고 수레에 기대앉았다. “나사 예순. 제일 오래 싸운 놈을 데려와.”',
    choices: [
      // D-459: 무작위 다듬기 2장 → 한 분대원을 영구히 단련 (공격 +6)
      { label: '렌치로 벼린다', desc: '나사 −60 · 최다 출전 분대원 공격 +6', tones: ['loss', 'gain'], info: '단련은 그 분대원에게 영구히 남습니다.', blocked: (s) => (s.gold < 60 ? '나사 60 필요' : !nonKing(s).length ? '맡길 분대원 없음' : null), apply: (s) => {
        s.gold -= 60;
        const u = veteranOf(s);
        temper(s, u, 6);
        return { text: `렌치가 ${nameOf(u)}의 관절을 하나씩 다시 조인다. (공격 +6)` };
      } },
      leave('지나가기'),
    ],
  },
  gambler: {
    title: '동전 나이트',
    text: '외알 안경의 나이트가 발굽 위로 동전을 굴린다. “앞면이면 내 걸 주지. 뒷면이면 하나를 걷어찬다.”',
    choices: [
      // D-459: 뒷면 HP −50% → 심장 톱니 깨짐 (영구 위험) · 앞면도 희귀 이상
      { label: '동전을 던지게 둔다', desc: '앞면 희귀 부품 · 뒷면 심장 톱니 깨짐', tones: ['gain', 'loss'], info: '앞면과 뒷면은 반반입니다. 톱니가 깨진 분대원이 다시 쓰러지면 폐기됩니다.', blocked: (s) => (nonKing(s).some((u) => !u.cracked) ? null : '걷어찰 분대원이 없음'), apply: (s, rng) => {
        if (rng.int(2) === 0) return { slot: 0, text: '앞면이다. 나이트가 혀를 차며, 마지못해 안장에서 부품을 꺼낸다.', partPick: true, elite: true };
        const who = crackOne(s);
        return { slot: 1, text: `뒷면. 발굽이 ${josa(who ?? '분대원', '을')} 걷어찬다. 심장 톱니 하나가 깨졌다.` };
      } },
      leave('거절하기'),
    ],
  },
  apprentice: {
    title: '견습 폰',
    text: '어린 폰이 제 몸보다 큰 망치를 쥐고 떤다. “낡은 명령서는 펴 드릴게요. 못 펴는 건… 버려야 해요.”',
    choices: [
      // D-459: 50% 다듬기 · 50% 무작위 2장 부서짐 → 확정 덱 수술 (가장 약한 2장을 덜어 내고 1장 다듬기)
      { label: '망치를 맡긴다', desc: '가장 약한 카드 2장 뺌 · 1장 다듬기', tones: ['gain', 'gain'], info: '녹슨 카드 → 시작 카드 → 낮은 등급 순으로 뺍니다.', blocked: (s) => (s.deck.length > 7 ? null : '덱이 너무 얇습니다'), apply: (s, rng) => {
        const gone = weakest(s, 2).sort((a, b) => b - a).map((k) => COMMANDS[s.deck.splice(k, 1)[0]].name);
        return { text: `${josa(gone.join(' · '), '이')} 망치 아래 접힌다. ${refineRandom(s, rng)}` };
      } },
      leave('거절하기'),
    ],
  },
  scout: {
    title: '다른 공장의 흑 비숍',
    text: '낯선 공장 도장을 단 흑 비숍이 분대를 훑어본다. “좋은 쇠로구려. 값은 세 배로 치르겠소.”',
    choices: [
      { label: '분대원을 판다', desc: '가장 비싼 분대원 → 나사 (값 ×3)', tones: ['loss', 'gain'], info: '폰 20 · 나이트와 비숍 40 · 룩 60 · 퀸 80의 세 배입니다.', blocked: (s) => (nonKing(s).length ? null : '팔 분대원이 없음'), apply: (s) => {
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
    text: '서류 더미 위에서 검수 저울이 잠들어 있다. 승인 도장이 손 닿는 곳에 놓여 있다.',
    choices: [
      { label: '서류를 바꿔친다', desc: '50% 폰 둘이 나이트로 · 50% 나사 절반 몰수', tones: ['gain', 'loss'], blocked: (s) => (s.squad.some((u) => u.t === 'P') ? null : '폰이 없음'), apply: (s, rng) => {
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
    text: '꺼지지 않은 공방 불빛이 당신을 부른다. 장인은 잠들었고 모루는 아직 뜨겁다.',
    choices: [
      { label: '모루를 두드린다', desc: '분대 전원 HP +30%', tones: ['gain'], apply: (s) => { hpRatio(s, 0.3); return { text: '쇳소리가 밤새 이어진다. 동이 틀 무렵, 분대가 다시 일어선다. (HP +30%)' }; } },
      // D-459: 50% 가득 · 50% −60% → 밤새 단련 (전원 공격 +2 영구 · HP −30%)
      { label: '밤새 단련한다', desc: '분대 전원 공격 +2 · 분대 전원 HP −30%', tones: ['gain', 'loss'], info: '단련은 분대원마다 영구히 남습니다.', apply: (s) => {
        s.squad = s.squad.map((x) => ({ ...x, temper: (x.temper ?? 0) + 2 }));
        hpRatio(s, -0.3);
        return { text: '모루 소리가 밤새 멎지 않는다. 동이 트자 분대의 주먹이 단단해져 있다. (공격 +2 · HP −30%)' };
      } },
      leave('지나가기'),
    ],
  },
  pact: {
    title: '쇳물 앞의 거래',
    text: '용광로가 가까워진다. 주인 없는 그림자가 쇳물 위에서 속삭인다. “하나를 바쳐라. 아니면 피로 서명해라.”',
    choices: [
      { label: '하나를 녹인다', desc: '분대원 하나 → 희귀 이상 부품', tones: ['loss', 'gain'], info: '폰과 킹은 바칠 수 없습니다.', blocked: (s) => (s.squad.some((u) => u.t !== 'K' && u.t !== 'P') ? null : '바칠 분대원이 없음'), apply: (s, rng) => {
        const u = pick(rng, s.squad.filter((x) => x.t !== 'K' && x.t !== 'P'))!;
        s.squad = s.squad.filter((x) => x !== u);
        return { text: `${josa(u.name, '이')} 쇳물 속으로 가라앉는다. 그림자가 무언가를 내민다.`, partPick: true, elite: true };
      } },
      // D-459: 대가가 붙은 부품을 거래로 — 피의 계약 (모든 공격 ×1.4 · 턴 끝 킹 HP −4)
      { label: '피로 서명한다', desc: '피의 계약 · 공격 ×1.4 · 킹 HP −4/턴', tones: ['neutral', 'gain', 'loss'], info: '부품 「피의 계약」을 받습니다. 부품 칸이 차 있으면 하나를 녹여야 합니다.', blocked: (s) => (hasPart(s, 'bloodPact') ? '이미 맺은 계약' : null), apply: () => ({ text: '킹이 붉은 종이에 서명한다. 쇳물이 한 번 끓어오른다.', givePart: 'bloodPact' }) },
      leave('거절하기'),
    ],
  },
  dipping: {
    title: '쇳물 담금질',
    text: '끓는 쇳물 위로 집게가 흔들린다. 담금질은 쇠를 벼리거나 삼킨다.',
    choices: [
      { label: '하나를 담근다', desc: '50% 한 단계 위 기물 · 50% 그 분대원 잃음', tones: ['gain', 'loss'], info: '폰은 나이트로 · 나이트와 비숍은 룩으로 · 룩은 퀸으로 오릅니다.', blocked: (s) => (s.squad.some((u) => UP[u.t]) ? null : '담글 분대원이 없음'), apply: (s, rng) => {
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
    text: '교환상의 손수레 위에서 나이트가 내려다본다. “폰 둘을 내놓아라. 이 기사를 주겠다.”',
    choices: [
      { label: '폰 둘을 건넨다', desc: '폰 둘 → 나이트 하나 · 도약 카드', tones: ['loss', 'gain', 'gain'], blocked: (s) => (s.squad.filter((u) => u.t === 'P').length >= 2 ? null : '폰 2기 필요'), apply: (s) => {
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
    text: '쇠사슬에 묶인 상자가 고철 사이에 있다. 각인 세 칸이 맞으면 봉인이 풀린다.',
    choices: [
      // D-459: 실패 HP −50% → 명령서 두 장이 녹슨다
      { label: '녹을 긁어낸다', desc: '50% 희귀 부품 · 50% 카드 2장 녹슮', tones: ['gain', 'loss'], info: '부품은 희귀 이상입니다. 어긋나면 명령서 두 장이 녹슬어 태엽이 1씩 더 듭니다.', apply: (s, rng) => {
        if (rng.int(2) === 0) return { slot: 0, text: '각인 셋이 맞물린다. 사슬이 풀리며, 봉인된 상자가 열린다.', partPick: true, elite: true };
        const hit: string[] = [];
        for (let n = 0; n < 2; n++) { const ks = s.deck.map((id, k) => [id, k] as const).filter(([id]) => !isRusted(id)); const o = pick(rng, ks); if (o) { s.deck[o[1]] = rustOnce(o[0]); hit.push(COMMANDS[o[0]].name); } }
        return { slot: 1, text: `각인이 어긋난다. ${hit.join(' · ') || '명령서'}에 녹이 슨다.` };
      } },
      leave('떠나기'),
    ],
  },
  brokenGacha: {
    // D-254: 뽑기 기계(나사를 넣는 슬롯) → 고장 난 조립 판정기 — 거는 것 없이, 기계가 분대의 힘을 끌어 쓴다
    title: '고장 난 조립 판정기',
    text: '쓰러진 판정기의 깔때기 셋이 덜컹인다. 세 칸이 맞으면 합격품이 나온다.',
    choices: [
      { label: '판정기를 돌린다', desc: '분대원 HP −35% · 부품 · 승급 · 감전', tones: ['loss', 'gain', 'gain', 'loss'], info: '40% 희귀 부품 · 25% 한 단계 위 기물 · 35% 감전(HP −30% 더)입니다.', apply: (s, rng) => {
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
      // D-459: 분대원 HP −70% → 심장 톱니 깨짐 (영구 위험)
      { label: '금고를 부순다', desc: '나사 +150 · 분대원 하나 심장 톱니 깨짐', tones: ['gain', 'loss'], info: '가장 성한 분대원이 손을 벱니다. 톱니가 깨진 분대원이 다시 쓰러지면 폐기됩니다.', blocked: (s) => (nonKing(s).some((u) => !u.cracked) ? null : '손을 댈 분대원이 없음'), apply: (s) => { s.gold += 150; const who = crackOne(s); return { text: `손잡이가 ${who}의 가슴을 긋는다. 나사가 쏟아진다. (나사 +150 · 심장 톱니 깨짐)` }; } },
      leave('떠나기'),
    ],
  },
  counterweight: {
    title: '비뚤어진 저울추',
    text: '검수대 저울 옆에 늙은 저울지기 폰이 웅크렸다. “한쪽을 가볍게 치면, 반대쪽은 무거워지는 법이지.”',
    choices: [
      { label: '카드 하나를 올린다', desc: '고른 카드 태엽 −1 · 다른 카드 하나 +1', tones: ['gain', 'loss'], info: '반대쪽 카드는 녹슬어 태엽이 1 더 듭니다.', blocked: (s) => (weighable(s).length ? null : '올릴 카드가 없습니다'), apply: () => ({ text: '저울지기가 빈 접시를 내민다.', cardPick: 'counterweight' }) },
      leave('지나가기'),
    ],
  },
  conveyor: {
    title: '거꾸로 도는 컨베이어',
    text: '컨베이어가 거꾸로 돈다. 레버 옆 낙서 「낡은 것이 귀한 것으로」.',
    choices: [
      // D-459: 무작위 2장 → 무작위 2장 → 시작 카드 3장을 희귀 이상 카드로 (나사 −50)
      { label: '시작 카드를 올린다', desc: '나사 −50 · 시작 카드 3장 → 희귀 3장', tones: ['loss', 'loss', 'gain'], info: '새 카드는 지금 분대가 쓸 수 있는 희귀 이상 카드입니다.', blocked: (s) => (s.gold < 50 ? '나사 50 필요' : startIdx(s).length < 3 ? '시작 카드가 셋보다 적음' : null), apply: (s, rng) => {
        s.gold -= 50;
        const pool = REWARD_COMMANDS.filter((id) => gradeOf(id) !== 'common' && cardFits(id, s.squad.map((u) => u.t)));
        const gone: string[] = [];
        const got: string[] = [];
        for (const k of startIdx(s).slice(0, 3)) {
          const nid = pick(rng, pool) ?? REWARD_COMMANDS[rng.int(REWARD_COMMANDS.length)];
          gone.push(COMMANDS[s.deck[k]].name);
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
    text: '기름통을 실은 수레 위에서 룩이 국자를 흔든다. “관절에 기름 한 국자. 값은 정해져 있다.”',
    choices: [
      { label: '기름을 붓는다', desc: '나사 −60 · 분대 전원 HP +40%', tones: ['loss', 'gain'], blocked: poor(60), apply: (s) => { s.gold -= 60; hpRatio(s, 0.4); return { text: '국자가 관절마다 기름을 붓는다. 삐걱이던 소리가, 하나씩 잦아든다. (HP +40%)' }; } },
      { label: '새 톱니를 끼운다', desc: '나사 −110 · 깨진 심장 톱니 수리', tones: ['loss', 'gain'], blocked: (s) => (s.gold < 110 ? '나사 110 필요' : !s.squad.some((u) => u.cracked) ? '깨진 심장 톱니 없음' : null), apply: (s) => { s.gold -= 110; const u = s.squad.find((x) => x.cracked)!; s.squad = s.squad.map((x) => (x === u ? { ...x, cracked: false } : x)); return { text: `기름 먹인 새 톱니가 ${u.name ?? NAMES[u.t]}의 가슴에 물린다. (심장 톱니 수리)` }; } },
      leave('지나가기'),
    ],
  },
  blueprint: {
    title: '떠도는 설계도',
    text: '날리던 설계도 한 장이 발치에 걸린다. 귀퉁이 글씨 「나사 70, 세 장을 고친다」.',
    choices: [
      { label: '설계도를 산다', desc: '나사 −70 · 무작위 카드 3장 다듬기', tones: ['loss', 'gain'], info: '다듬은 카드는 태엽이 1 덜 듭니다.', blocked: (s) => (s.gold < 70 ? '나사 70 필요' : refinable(s).length < 1 ? '다듬을 카드 없음' : null), apply: (s, rng) => { s.gold -= 70; return { text: `설계도의 선이 고쳐진다. ${refineRandom(s, rng)} · ${refineRandom(s, rng)} · ${refineRandom(s, rng)}` }; } },
      leave('지나가기'),
    ],
  },
  scrapTrade: {
    title: '고철 교환소',
    text: '철망 너머에서 폰 하나가 저울을 두드린다. “나사 백. 상자 하나. 고르는 건 너다.”',
    choices: [
      { label: '상자를 산다', desc: '나사 −100 · 부품 하나를 고른다', tones: ['loss', 'gain'], blocked: poor(100), apply: (s) => { s.gold -= 100; return { text: '철망 문이 열리고, 잊혀진 상자 하나가 밀려 나온다.', partPick: true }; } },
      leave('지나가기'),
    ],
  },
  // ---- 사건 2차 (D-287, 대과제 3-3): 거래 · 내기 · 덱 손질 · 분대 — 장면 그림은 발주서 V-19 ~ V-35 ----
  lostPawn: {
    title: '길 잃은 폰',
    text: '라인에서 떨어진 폰 하나가 길가에 서 있다. 출하표가 반쯤 찢겨 있다. “…출구가 어느 쪽이에요?”',
    choices: [
      { label: '데려간다', desc: '폰 하나가 분대에 든다', tones: ['gain'], blocked: full, apply: () => ({ text: '폰이 말없이, 당신의 줄 맨 끝에 선다.', recruit: 'P' }) },
      { label: '길을 알려 준다', desc: '나사 +25', tones: ['gain'], apply: (s) => { s.gold += 25; return { text: '폰이 주머니를 털어 나사를 내민다. 그리고 출구를 향해, 홀로 걸어간다. (나사 +25)' }; } },
      leave('지나가기'),
    ],
  },
  scrapHeap: {
    title: '고철 더미',
    text: '녹슨 고철이 산처럼 쌓여 있다. 그 아래에서 태엽 감기는 소리가 난다.',
    choices: [
      // D-459: 60% 나사 +70 → 60% 대가 붙은 부품 「과부하 태엽」(태엽 +1 · 손패 −1)
      { label: '더미를 파고든다', desc: '60% 과부하 태엽 · 40% 분대원 HP −40%', tones: ['gain', 'loss'], info: '과부하 태엽은 태엽 +1 · 손패 −1인 부품입니다. 이미 있으면 나사 +70입니다.', apply: (s, rng) => {
        if (rng.int(10) < 6) {
          if (hasPart(s, 'spare')) { s.gold += 70; return { slot: 0, text: '고철 틈에서 나사 주머니가 딸려 나온다. (나사 +70)' }; }
          return { slot: 0, text: '고철 틈에서 끝까지 감긴 태엽 하나가 딸려 나온다.', givePart: 'spare' };
        }
        const who = oneHurt(s, 0.4);
        return { slot: 1, text: `더미가 무너진다. ${josa(who, '이')} 깔린다. (HP −40%)` };
      } },
      leave('지나가기'),
    ],
  },
  rustBath: {
    title: '녹 벗기는 통',
    text: '시큼한 통 옆에서 비숍이 장갑을 낀다. “녹슨 명령서는 이리. 한 장에 나사 스물.”',
    choices: [
      { label: '녹슨 카드를 맡긴다', desc: '녹슨 카드 녹 벗기기 · 장당 나사 −20', tones: ['gain', 'loss'], info: '녹슨 카드는 태엽이 1 더 듭니다.', pay: (s) => 20 * Math.min(s.deck.filter(isRusted).length, Math.floor(s.gold / 20)), blocked: (s) => (!s.deck.some(isRusted) ? '녹슨 카드 없음' : s.gold < 20 ? '나사 20 필요' : null), apply: (s) => {
        const done: string[] = [];
        s.deck = s.deck.map((id) => { if (!isRusted(id) || s.gold < 20) return id; s.gold -= 20; done.push(COMMANDS[id].name); return refineOnce(id); });
        return { text: `통에서 꺼낸 명령서가 다시 빛난다. ${done.join(' · ')}` };
      } },
      { label: '통째로 담근다', desc: '50% 카드 2장 다듬기 · 50% 2장 녹슮', tones: ['gain', 'loss'], info: '녹슨 카드는 태엽이 1 더 듭니다.', apply: (s, rng) => {
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
    text: '연병장 한가운데 룩이 버티고 서 있다. “그 물렁한 태엽으로 다음 공정을 넘겠다고? 한 놈 보내라.”',
    choices: [
      { label: '버티는 법을 배운다', desc: '덜 싸운 분대원 생명 +1 · HP −40%', tones: ['gain', 'loss'], info: '가장 덜 싸운 분대원이 갑니다.', blocked: (s) => (nonKing(s).length ? null : '맡길 분대원 없음'), apply: (s) => {
        const u = greenOf(s);
        const max = crewMaxHp(u);
        s.squad = s.squad.map((x) => (x === u ? { ...x, doors: (x.doors ?? 0) + 1, hp: Math.max(1, Math.round((x.hp ?? max) - max * 0.4)) } : x));
        return { text: `${josa(nameOf(u), '이')} 비틀거리며 돌아온다. 눈빛이 달라졌다. (생명 +1 · HP −40%)` };
      } },
      // D-459: 단련 — 덜 싸운 분대원을 공격수로
      { label: '치는 법을 배운다', desc: '덜 싸운 분대원 공격 +5 · HP −40%', tones: ['gain', 'loss'], info: '가장 덜 싸운 분대원이 갑니다. 단련은 영구히 남습니다.', blocked: (s) => (nonKing(s).length ? null : '맡길 분대원 없음'), apply: (s) => {
        const u = greenOf(s);
        const max = crewMaxHp(u);
        s.squad = s.squad.map((x) => (x === u ? { ...x, temper: (x.temper ?? 0) + 5, hp: Math.max(1, Math.round((x.hp ?? max) - max * 0.4)) } : x));
        return { text: `${josa(nameOf(u), '이')} 주먹을 쥔 채 돌아온다. (공격 +5 · HP −40%)` };
      } },
      leave('거절하기'),
    ],
  },
  cardSharp: {
    title: '명령서 사기꾼',
    text: '뒤집힌 상자 위에서 흑 비숍이 명령서를 섞는다. “귀한 걸 파시오, 아니면 사시겠소? 내 소매엔 정품만 있소.”',
    choices: [
      // D-459: 무작위 1장 +45 · 무작위 1장 −55 → 가장 귀한 카드를 비싸게 · 황금 카드를 비싸게
      { label: '가장 귀한 것을 판다', desc: '가장 높은 등급 카드 → 나사 +120', tones: ['loss', 'gain'], blocked: (s) => (s.deck.length > 6 ? null : '덱이 너무 얇습니다'), apply: (s) => {
        const id = s.deck.splice(finestCard(s), 1)[0];
        s.gold += 120;
        return { text: `${josa(COMMANDS[id].name, '이')} 비숍의 소매 속으로 사라진다. (나사 +120)` };
      } },
      { label: '황금 카드를 산다', desc: '나사 −90 · 황금 카드 1장', tones: ['loss', 'gain'], info: '지금 분대가 쓸 수 있는 황금 카드입니다.', blocked: poor(90), apply: (s, rng) => {
        s.gold -= 90;
        const pool = REWARD_COMMANDS.filter((id) => gradeOf(id) === 'gold' && cardFits(id, s.squad.map((u) => u.t)));
        const id = pick(rng, pool) ?? REWARD_COMMANDS[rng.int(REWARD_COMMANDS.length)];
        s.deck.push(id);
        return { text: `비숍이 소매에서 금박 명령서를 꺼낸다. ${COMMANDS[id].name}.` };
      } },
      leave('지나가기'),
    ],
  },
  castMold: {
    title: '버려진 주물틀',
    text: '식은 주물틀 안쪽에 폰 모양이 새겨져 있다. 국자에는 쇳물이 조금 남았다.',
    choices: [
      { label: '쇳물을 붓는다', desc: '50% 폰 합류 · 50% 분대원 HP −45%', tones: ['gain', 'loss'], blocked: full, apply: (s, rng) => {
        if (rng.int(2) === 0) return { slot: 0, text: '틀이 갈라지고, 갓 굳은 폰 하나가 일어선다.', recruit: 'P' };
        const who = oneHurt(s, 0.45);
        return { slot: 1, text: `쇳물이 튄다. ${josa(who, '이')} 데인다. (HP −45%)` };
      } },
      leave('지나가기'),
    ],
  },
  crownAltar: {
    title: '녹슨 왕관 제단',
    text: '부서진 제단 위에 녹슨 왕관이 놓여 있다. 그 앞 접시에 나사가 수북하다.',
    choices: [
      { label: '나사를 전부 바친다', desc: '나사 전부 → 희귀 이상 부품', tones: ['loss', 'gain'], pay: (s) => s.gold, blocked: (s) => (s.gold < 80 ? '나사 80 이상 필요' : null), apply: (s) => { s.gold = 0; return { text: '왕관의 녹 아래에서 무언가 빛난다.', partPick: true, elite: true }; } },
      // D-459: 50% 나사 · 50% 둘 HP → 왕관을 써 본다 (킹 생명 +1 · 분대원 하나 심장 톱니 깨짐 — 바이블의 「왕관은 동료를 깎는다」)
      { label: '왕관을 써 본다', desc: '킹 생명 +1 · 분대원 하나 심장 톱니 깨짐', tones: ['gain', 'loss'], info: '왕관은 킹을 지키려 동료를 깎습니다. 톱니가 깨진 분대원은 다시 쓰러지면 폐기됩니다.', blocked: (s) => (!s.squad.some((u) => u.t === 'K') ? '킹이 없음' : nonKing(s).some((u) => !u.cracked) ? null : '깎일 분대원이 없음'), apply: (s) => {
        const k = s.squad.find((u) => u.t === 'K')!;
        s.squad = s.squad.map((x) => (x === k ? { ...x, doors: (x.doors ?? 0) + 1 } : x));
        const who = crackOne(s);
        return { text: `녹슨 왕관이 킹의 머리에 꼭 맞는다. 등 뒤에서 ${who}의 톱니가 깨진다. (킹 생명 +1)` };
      } },
      leave('지나가기'),
    ],
  },
  duelKnight: {
    title: '결투하는 나이트',
    text: '길 한가운데 나이트 하나가 창을 세운다. “너희 중 가장 센 놈. 한 판.”',
    choices: [
      { label: '결투를 받는다', desc: '60% 생명 +1 · 40% 심장 톱니 깨짐', tones: ['gain', 'loss'], info: '이기면 나사 +40도 받습니다. 가장 센 분대원이 나갑니다.', blocked: (s) => (nonKing(s).length ? null : '내보낼 분대원 없음'), apply: (s, rng) => {
        const u = [...nonKing(s)].sort((a, b) => SELL[b.t] - SELL[a.t])[0];
        if (rng.int(10) < 6) {
          s.gold += 40;
          s.squad = s.squad.map((x) => (x === u ? { ...x, doors: (x.doors ?? 0) + 1 } : x));
          return { slot: 0, text: `${josa(u.name ?? NAMES[u.t], '이')} 창을 쳐낸다. 나이트가 말에서 떨어진다. (생명 +1 · 나사 +40)` };
        }
        s.squad = s.squad.map((x) => (x === u ? { ...x, cracked: true } : x));
        return { slot: 1, text: `창끝이 ${u.name ?? NAMES[u.t]}의 가슴을 꿰뚫는다. 심장 톱니 하나가 깨진다. (다시 쓰러지면 폐기)` };
      } },
      leave('비켜 간다'),
    ],
  },
  bookCart: {
    title: '기보 수레',
    text: '낡은 기보를 실은 수레가 멈춘다. “한 권 나사 예순. 수읽기는 덤이다.”',
    choices: [
      { label: '기보를 산다', desc: '나사 −60 · 수읽기 카드 2장', tones: ['loss', 'gain'], blocked: poor(60), apply: (s, rng) => {
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
    text: '남의 공장 킹이 포장대 옆에서 졸고 있다. 왕관의 보석이 반짝이고 호위는 없다.',
    choices: [
      // D-459: 50% 나사 +110 → 50% 우리 킹 단련 (보석을 우리 왕관에)
      { label: '보석을 뽑는다', desc: '50% 킹 공격 +8 · 50% 둘 HP −35%', tones: ['gain', 'loss'], info: '보석은 우리 킹의 왕관에 박힙니다(영구). 나쁜 쪽이면 분대원 둘이 다칩니다.', apply: (s, rng) => {
        const k = s.squad.find((u) => u.t === 'K');
        if (rng.int(2) === 0 && k) { temper(s, k, 8); return { slot: 0, text: '보석이 소리 없이 빠진다. 우리 킹의 왕관에 박히자 붉게 빛난다. (킹 공격 +8)' }; }
        const who = someHurt(s, 2, 0.35);
        return { slot: 1, text: `킹의 눈이 번쩍 뜨인다. 홀이 휘둘린다. ${josa(who, '이')} 얻어맞는다. (HP −35%)` };
      } },
      leave('조용히 지나간다'),
    ],
  },
  echoWell: {
    title: '메아리 우물',
    text: '마른 우물 바닥에서 발소리가 늦게 돌아온다. 무엇을 던지면 그것만 돌아오지 않는다.',
    choices: [
      { label: '카드 한 장을 던진다', desc: '녹슨 카드 하나를 영영 뺀다', tones: ['gain'], info: '녹슨 카드가 없으면 무작위 카드를 뺍니다.', blocked: (s) => (s.deck.length > 6 ? null : '덱이 너무 얇습니다'), apply: (s, rng) => {
        const rusted = s.deck.map((id, k) => [id, k] as const).filter(([id]) => isRusted(id));
        const k = rusted.length ? rusted[rng.int(rusted.length)][1] : rng.int(s.deck.length);
        const id = s.deck.splice(k, 1)[0];
        return { text: `${josa(COMMANDS[id].name, '이')} 어둠 속으로 떨어진다. 메아리가 돌아오지 않는다.` };
      } },
      // D-459: 나사 도박 → 시작 카드 한 종류를 통째로 던진다 (덱 압축)
      { label: '이름을 외쳐 던진다', desc: '나사 −40 · 가장 흔한 시작 카드 모두 뺌', tones: ['loss', 'gain'], info: '덱에 가장 많은 시작 카드 한 종류를 전부 뺍니다.', blocked: (s) => (s.gold < 40 ? '나사 40 필요' : startIdx(s).length < 2 ? '뺄 시작 카드 없음' : s.deck.length < 8 ? '덱이 너무 얇습니다' : null), apply: (s) => {
        s.gold -= 40;
        const count: Record<string, number> = {};
        for (const k of startIdx(s)) { const b = s.deck[k].replace(/[+~]$/, ''); count[b] = (count[b] ?? 0) + 1; }
        const base = Object.entries(count).sort((a, b) => b[1] - a[1])[0][0];
        const n = s.deck.filter((id) => id.replace(/[+~]$/, '') === base).length;
        s.deck = s.deck.filter((id) => id.replace(/[+~]$/, '') !== base);
        return { text: `「${COMMANDS[base as CommandId].name}」을 외친다. ${n}장이 한꺼번에 떨어진다.` };
      } },
      leave('지나가기'),
    ],
  },
  copyPress: {
    title: '낡은 압인기',
    text: '명령서를 찍던 압인기가 멈춰 서 있다. 레버 옆 글씨 「가장 귀한 한 장을 넣으면 두 장」.',
    choices: [
      // D-459: 무작위 1장 복제 → 가장 귀한 카드 복제
      { label: '압인기를 돌린다', desc: '나사 −80 · 가장 귀한 카드 1장 복제', tones: ['loss', 'gain'], blocked: (s) => (s.gold < 80 ? '나사 80 필요' : finestCard(s) < 0 ? '찍을 카드 없음' : null), apply: (s) => {
        s.gold -= 80;
        const id = s.deck[finestCard(s)];
        s.deck.push(id);
        return { text: `압인기가 쿵 내려앉는다. ${josa(COMMANDS[id].name, '이')} 두 장이 된다.` };
      } },
      leave('지나가기'),
    ],
  },
  fieldMedic: {
    title: '순회 수리 비숍',
    text: '구급 가방을 멘 비숍이 깨진 톱니를 찾는다. “고쳐 주지. 대신 명령서 한 장이 녹슨다.”',
    choices: [
      { label: '수리를 맡긴다', desc: '심장 톱니 수리 · 카드 1장 녹슮', tones: ['gain', 'loss'], info: '녹슨 카드는 태엽이 1 더 듭니다.', blocked: (s) => (s.squad.some((u) => u.cracked) ? null : '깨진 심장 톱니 없음'), apply: (s, rng) => {
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
    text: '주인 없는 대장간의 모루가 식어 있다. 풀무를 밟으면 화로가 다시 붙는다.',
    choices: [
      // D-459: 다듬기 1장 → 무거운 받침으로 갈아 끼운다 (HP +30% · 공격 −20%) — 가장 다친 분대원이 단단해진다
      { label: '받침을 새로 붓는다', desc: '다친 분대원 → HP +30% · 공격 −20%', tones: ['neutral', 'gain', 'loss'], info: '가장 HP가 낮은 분대원의 기벽이 「무거운 받침」으로 바뀌고 HP가 가득 찹니다.', blocked: (s) => (nonKing(s).length ? null : '분대원 필요'), apply: (s) => {
        const u = [...nonKing(s)].sort((a, b) => (a.hp ?? crewMaxHp(a)) / crewMaxHp(a) - (b.hp ?? crewMaxHp(b)) / crewMaxHp(b))[0];
        s.squad = s.squad.map((x) => (x === u ? { ...x, quirk: 'heavy' as QuirkId, hp: crewMaxHp({ t: x.t, quirk: 'heavy' }) } : x));
        return { text: `${nameOf(u)}의 받침이 새 쇳물로 두꺼워진다. (HP +30% · 공격 −20%)` };
      } },
      leave('지나가기'),
    ],
  },
  tollGate: {
    title: '통행 문',
    text: '쇠창살 문 앞을 룩 둘이 막고 있다. 팻말 「통행세 나사 40」.',
    choices: [
      { label: '통행세를 낸다', desc: '나사 −40 · 분대 전원 HP +20%', tones: ['loss', 'gain'], blocked: poor(40), apply: (s) => { s.gold -= 40; hpRatio(s, 0.2); return { text: '룩들이 길을 비킨다. 초소의 난로가, 얼어붙은 분대를 녹인다. (HP +20%)' }; } },
      { label: '문을 부순다', desc: '60% 나사 +60 · 40% 분대원 HP −60%', tones: ['gain', 'loss'], apply: (s, rng) => {
        if (rng.int(10) < 6) { s.gold += 60; return { slot: 0, text: '창살이 휜다. 겁먹은 룩들이 달아나고, 버려진 상자만 남는다. (나사 +60)' }; }
        const who = oneHurt(s, 0.6);
        return { slot: 1, text: `룩이 버틴다. ${josa(who, '이')} 문짝에 부딪혀 나뒹군다. (HP −60%)` };
      } },
      leave('돌아간다'),
    ],
  },
  mirrorHall: {
    title: '거울 복도',
    text: '양쪽 벽이 모두 거울이다. 그림자 하나가 한 발 늦게 움직인다.',
    choices: [
      { label: '그림자를 붙잡는다', desc: '50% 같은 기물 합류 · 50% HP −50%', tones: ['gain', 'loss'], info: '나쁜 쪽이면 거울 앞의 분대원이 다칩니다.', blocked: (s) => (!nonKing(s).length ? '분대원 필요' : full(s)), apply: (s, rng) => {
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
    text: '라인의 사이렌이 울린다. “연장이다! 한 바퀴 더 돌면 수당이 두 배!”',
    choices: [
      { label: '연장을 뛴다', desc: '분대 전원 HP −20% · 나사 +90', tones: ['loss', 'gain'], apply: (s) => { hpRatio(s, -0.2); s.gold += 90; return { text: '라인이 밤새 돈다. 분대는 휘청이며, 두툼한 수당 봉투를 받아 든다. (HP −20% · 나사 +90)' }; } },
      { label: '쉬겠다고 한다', desc: '분대 전원 HP +15%', tones: ['gain'], apply: (s) => { hpRatio(s, 0.15); return { text: '감독이 혀를 찬다. 분대는 구석에 모여 눈을 붙인다. 사이렌 소리가, 멀어져 간다. (HP +15%)' }; } },
    ],
  },
};

export const SLICE_EVENT_IDS = Object.keys(SLICE_EVENTS) as SliceEventId[];
