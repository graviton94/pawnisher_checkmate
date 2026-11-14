import type { PieceType } from '../engine';
import { CREW } from './crew';
import { FOE_KING_LINES, type FoeCue } from '../data/battle-voice';

/**
 * 심리 연출 감독 (D-178). 사용자 원칙: 유저는 ① 똑똑해 보이고 싶지만 복잡한 건 싫고 ② 이기면 내 실력, 지면 게임 탓
 * ③ 치사해도 이기는 게 중요 ④ 사선을 넘은 승리엔 걸맞은 보상. 단 "모든 판에서 작동하는 무자극 보상"이 되면 안 된다 —
 * 큰 도움 · 보상은 낮은 승급에서 자동으로, 승급이 오를수록 줄인다. 이 파일은 순수 로직 + 수치 (화면과 무관).
 */

/** 승급 단계별 (0 ~ 5) 도움 크기 — 아래로 갈수록 줄어든다 */
export const DIRECTOR = {
  /** ⑤ 마지막 한 수: 한 출하에 몇 번 (킹이 이번 적 차례에 쓰러지게 생기면 자동) */
  clutch: [2, 1, 1, 1, 0, 0],
  /** 마지막 한 수가 주는 태엽 */
  clutchAp: [2, 2, 1, 1, 1, 0],
  /** ⑥ 자원 희생 제안: 한 출하에 몇 번 */
  sacrifice: [1, 1, 1, 1, 0, 0],
  /** ③ 보이지 않는 손: 같은 대국을 몇 번 지면 켜지나 (Infinity = 없음) · 적이 가장 아픈 수를 한 번 건너뛸 확률 */
  mercyAfter: [1, 1, 2, 2, 3, Infinity],
  mercy: [0.5, 0.4, 0.3, 0.25, 0.15, 0],
  /** ④ 사선 보상: 등급 (0 없음 · 1 나사 · 2 카드 넷 · 3 부품 하나 더) — 막마다 한 번까지 */
  closeCall: [3, 3, 2, 2, 1, 0],
  closeCallGold: 40,
  /** 사선 판정: 킹 HP 비율 이하 · 분대원 쓰러짐 · 마지막 한 수 사용 */
  closeKingHp: 0.15,
  /** ① 원수 현상금 (나사) · 유품 회수(폐기 인물은 되살리지 않음)이 되는 승급 상한 */
  bounty: [90, 75, 60, 50, 40, 30],
  heirloomUpTo: 2,
  /** 원수가 다음 대국에 나타날 확률 (같은 출하) · 원수 강화 (HP 배율, 단계마다) */
  nemesisShow: 0.5,
  nemesisHp: 0.25,
  nemesisMax: 3,
  /** ② 도발: 대국마다 한 줄까지, 이 확률로만 (매 판 떠들지 않는다) */
  taunt: 0.45,
  /** 보통 적 킹의 「비겁하다」 도발 간격 (대국 수, 테스터: 너무 자주) */
  cheeseGap: 4,
  /**
   * ⑦ 판돈 (피드백 #12 · D-503 — 밸런스 방향 승인): 1막 둘째 대국부터 보통 대국 · 검문 앞에서 25%.
   * 판돈 = 쥔 나사의 25%(20 ~ 60). 조건은 성공 ≈ 50%이고 속전 보상(빨리 이김)과 겹치지 않게 —
   * 「킹이 한 번도 맞지 않는다」(등반 보통 봇 45% · 두뇌 봇 68%) · 「한 턴에 둘 처치」(1막 62 · 59%) / 2막부터 「셋」(보통 30~49 · 두뇌 26~39%).
   * 옛 「4턴 안 승리」(속전과 같은 축) · 「분대원 전원 생존」은 뺐다. `npx jiti tools/wager-rates.ts`로 다시 잰다.
   */
  betChance: 0.25,
  betShare: 0.25,
  betMin: 20,
  betMax: 60,
  /** 1막에서 이 번째 대국(입문 · 반장 빼고)부터 */
  betFromFight: 2,
  /** 「한 턴에 n기 처치」의 n — 막마다 (1막 · 2막 · 3막) */
  betKills: [2, 3, 3],
  /** ④ 아까운 패배: 적 킹 HP 비율이 이 아래면 「한 수였습니다」 */
  nearMiss: 0.25,
} as const;

const at = <T>(list: readonly T[], asc: number): T => list[Math.max(0, Math.min(list.length - 1, asc))];

/** 이 승급의 값 */
export const dir = {
  clutch: (asc: number) => at(DIRECTOR.clutch, asc),
  clutchAp: (asc: number) => at(DIRECTOR.clutchAp, asc),
  sacrifice: (asc: number) => at(DIRECTOR.sacrifice, asc),
  closeCall: (asc: number) => at(DIRECTOR.closeCall, asc),
  bounty: (asc: number) => at(DIRECTOR.bounty, asc),
  /** 같은 대국에서 진 횟수 → 보이지 않는 손 세기 (0 = 없음) */
  mercy: (asc: number, losses: number) => (losses >= at(DIRECTOR.mercyAfter, asc) ? at(DIRECTOR.mercy, asc) : 0),
};

/** 사선을 넘었나 (승리한 대국) */
/** 사선 (D-244, 사용자: 「동료 한 번 쓰러진 것만으로 계속 나오면 너무 흔하다」): fell = 이번 대국에서 폐기된(심장 톱니 둘 다 깨진) 분대원 수 */
export const isCloseCall = (r: { kingHp: number; kingMax: number; fell: number; clutched: boolean }): boolean =>
  r.clutched || r.fell > 0 || r.kingHp <= r.kingMax * DIRECTOR.closeKingHp;

// ---------- ① 원수 ----------
/** 원수: 내 분대원을 쓰러뜨린 적 기물. 이름 · 흉터 · 단계를 얻고 다시 나타난다 */
export interface Nemesis {
  t: PieceType;
  name: string;
  /** 단계 (1 ~ nemesisMax): 다시 이길 때마다 오른다 */
  rank: number;
  /** 쓰러뜨린 분대원 이름들 */
  victims: string[];
  /** 마지막으로 쓰러뜨린 분대원 (유품 반환 대상) */
  heir?: { t: PieceType; name: string; serial?: string };
}

/** 원수 이름: 쓰러뜨린 분대원 이름에서 (다키스트 던전식 칭호) */
const TITLES: Partial<Record<PieceType, string[]>> = {
  P: ['녹 먹는 졸개', '뒤꿈치 무는 자'],
  N: ['못 뽑는 자', '검은 송곳니'],
  B: ['그을린 사제', '비스듬한 칼날'],
  R: ['철문 짓밟는 자', '녹슨 성벽'],
  Q: ['검은 과부', '태엽 먹는 여왕'],
  K: ['검은 왕관'],
};
export const nemesisName = (t: PieceType, victim: string, seed: number): string => {
  const pool = TITLES[t] ?? ['검은 그림자'];
  return `「${victim}」을 부순 ${pool[seed % pool.length]}`;
};

/** 분대원을 쓰러뜨린 적을 원수 목록에 올린다 (같은 유형이 이미 있으면 그 원수가 한 단계 오른다) */
export const addNemesis = (list: Nemesis[], t: PieceType, victim: { t: PieceType; name: string; serial?: string }, seed: number): Nemesis[] => {
  const out = list.map((n) => ({ ...n, victims: [...n.victims] }));
  const same = out.find((n) => n.t === t);
  if (same) {
    same.rank = Math.min(DIRECTOR.nemesisMax, same.rank + 1);
    same.victims.push(victim.name);
    same.heir = victim;
    return out;
  }
  out.push({ t, name: nemesisName(t, victim.name, seed), rank: 1, victims: [victim.name], heir: victim });
  return out.slice(-DIRECTOR.nemesisMax);
};

// ---------- ② 도발 (적 킹의 말 — 대국마다 한 줄까지) ----------
/** 적이 말하는 순간 · 보통 적 킹의 말 — 정본은 data/battle-voice.ts (P-B D-490: 다섯 상황 → 아홉 상황, 상황마다 셋 안팎) */
export type TauntCue = FoeCue;
export const TAUNTS: Record<TauntCue, string[]> = FOE_KING_LINES;

// ---------- ⑦ 판돈 ----------
export type BetKind = 'unhit' | 'kills';
/** 건 판돈 하나: 갈래 · 건 나사 · 「한 턴에 n기」의 n */
export interface Bet { kind: BetKind; stake: number; need: number }
/** label: 창 머리 한 줄 · cond: 조건 한 줄 (D-263 — 조건 · 보상 · 실패 시를 줄마다 나눠 보여 준다) */
export const betText = (bet: Pick<Bet, 'kind' | 'need'>): { label: string; cond: string } =>
  bet.kind === 'unhit'
    ? { label: '킹을 지켜 낸다', cond: '킹이 한 번도 맞지 않고 승리' }
    : { label: `한 턴에 ${bet.need}기를 쓰러뜨린다`, cond: `한 턴에 ${bet.need}기 처치하고 승리` };
/** 판돈 = 쥔 나사의 25% (20 ~ 60) — 나사가 20보다 적으면 0 (제안하지 않는다) */
export const betStake = (gold: number): number => (gold < DIRECTOR.betMin ? 0 : Math.max(DIRECTOR.betMin, Math.min(DIRECTOR.betMax, Math.round(gold * DIRECTOR.betShare))));
/**
 * 이 대국 앞에서 판돈을 제안하나 (순수 — 화면은 이것만 부른다).
 * act = 1 ~ 3, fight = 그 막에서 이 대국이 몇 번째 싸움인가(입문 빼고, 1부터), roll · pick = 0 ~ 1 난수.
 */
export const betOffer = (o: { act: number; fight: number; boss: boolean; gold: number; roll: number; pick: number }): Bet | null => {
  if (o.boss || o.act < 1 || o.act > 3 || (o.act === 1 && o.fight < DIRECTOR.betFromFight) || o.roll >= DIRECTOR.betChance) return null;
  const stake = betStake(o.gold);
  if (!stake) return null;
  return { kind: o.pick < 0.5 ? 'unhit' : 'kills', stake, need: DIRECTOR.betKills[Math.min(DIRECTOR.betKills.length - 1, o.act - 1)] };
};
/** 대국 중 판돈 상태: 깨졌나(되돌릴 수 없음) · 이미 이뤘나 */
export const betProgress = (bet: Bet, r: { kingHit: boolean; bestTurnKills: number }): { broken: boolean; done: boolean } =>
  bet.kind === 'unhit' ? { broken: r.kingHit, done: false } : { broken: false, done: r.bestTurnKills >= bet.need };
/** 판돈 정산: 이기고 조건을 이뤘으면 +건 나사 (총 두 배), 아니면 건 나사를 잃는다 */
export const settleBet = (bet: Bet, r: { won: boolean; kingHit: boolean; bestTurnKills: number }): number => {
  const ok = r.won && (bet.kind === 'unhit' ? !r.kingHit : r.bestTurnKills >= bet.need);
  return ok ? bet.stake : -bet.stake;
};

// ---------- ⑧ 출하 하이라이트 ----------
export interface Highlight {
  where: string;
  turn: number;
  kills: number;
  damage: number;
}
/** 더 멋진 턴인가 (처치 수 우선, 같으면 피해) */
export const betterHighlight = (a: Highlight | null, b: Highlight): boolean => !a || b.kills > a.kills || (b.kills === a.kills && b.damage > a.damage);

/** 폐기 이력을 유지하고 유품의 기존 나사 가치만 돌려준다 (D-425). */
export const recoverHeirloom = (n: Nemesis, asc: number): number => n.heir && asc <= DIRECTOR.heirloomUpTo ? CREW.heirloomScrews : 0;
