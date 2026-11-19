import type { PieceType } from '../engine';
import { CREW } from './crew';
import { nemesisAllowed } from '../data/ease';
import { FOE_KING_LINES, type FoeCue } from '../data/battle-voice';

/**
 * 심리 연출 감독 (D-178). 사용자 원칙: 유저는 ① 똑똑해 보이고 싶지만 복잡한 건 싫고 ② 이기면 내 실력, 지면 게임 탓
 * ③ 치사해도 이기는 게 중요 ④ 사선을 넘은 승리엔 걸맞은 보상. 단 "모든 판에서 작동하는 무자극 보상"이 되면 안 된다 —
 * 큰 도움 · 보상은 낮은 승급에서 자동으로, 승급이 오를수록 줄인다. 이 파일은 순수 로직 + 수치 (화면과 무관).
 *
 * D-601 (출시 전 결정 보고 2가 — 장치 줄이기): 보이지 않는 손(숨은 자비 — 「숨은 무작위 없음」과 어긋남) · 판돈 ·
 * 마지막 한 수 · 자원 희생(사선 자리 바꾸기)을 뺐다. 목숨 장치는 버팀 · 심장 톱니 · 되감기 셋뿐이다.
 */

/** 승급 단계별 (0 ~ 5) 도움 크기 — 아래로 갈수록 줄어든다 */
export const DIRECTOR = {
  /** ④ 사선 보상: 등급 (0 없음 · 1 나사 · 2 카드 넷 · 3 부품 하나 더) — 막마다 한 번까지 */
  // D-542: [3,3,2,2,1,0] → [2,1,1,1,0,0] — 사선 보상이 출하마다 부품 하나를 더 주던 것을 줄인다
  closeCall: [2, 1, 1, 1, 0, 0],
  closeCallGold: 40,
  /** 사선 판정: 킹 HP 비율 이하 · 분대원 쓰러짐 */
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
  /** ④ 아까운 패배: 적 킹 HP 비율이 이 아래면 「한 수였습니다」 */
  nearMiss: 0.25,
} as const;

const at = <T>(list: readonly T[], asc: number): T => list[Math.max(0, Math.min(list.length - 1, asc))];

/** 이 승급의 값 */
export const dir = {
  closeCall: (asc: number) => at(DIRECTOR.closeCall, asc),
  bounty: (asc: number) => at(DIRECTOR.bounty, asc),
};

/** 사선을 넘었나 (승리한 대국) */
/** 사선 (D-244, 사용자: 「동료 한 번 쓰러진 것만으로 계속 나오면 너무 흔하다」): fell = 이번 대국에서 폐기된(심장 톱니 둘 다 깨진) 분대원 수 */
export const isCloseCall = (r: { kingHp: number; kingMax: number; fell: number }): boolean =>
  r.fell > 0 || r.kingHp <= r.kingMax * DIRECTOR.closeKingHp;

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

/**
 * 이번 대국에 설 원수 (D-600): 그 승급 · 막에 원수가 설 수 있고(첫째 · 둘째 왕관은 2막부터), **편성에 이미 있는 유형만** —
 * 원수는 그 기물을 세게 할 뿐 기물을 더하지 않는다(옛: 편성에 없으면 퀸 · 룩을 하나 더 세웠다). 없으면 null.
 */
export const pickNemesis = (list: readonly Nemesis[], enemy: readonly PieceType[], asc: number, act: number): Nemesis | null =>
  nemesisAllowed(asc, act) ? list.find((n) => enemy.includes(n.t)) ?? null : null;

// ---------- ② 도발 (적 킹의 말 — 대국마다 한 줄까지) ----------
/** 적이 말하는 순간 · 보통 적 킹의 말 — 정본은 data/battle-voice.ts (P-B D-490: 다섯 상황 → 아홉 상황, 상황마다 셋 안팎) */
export type TauntCue = FoeCue;
export const TAUNTS: Record<TauntCue, string[]> = FOE_KING_LINES;

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

/**
 * 오늘의 도전은 누구에게나 같은 출하 (2026-11-16 완주 점검): 사람마다 다른 기록(원수 · 최근 사건)을 출하에 끼우지 않는다.
 * 예전에는 원수가 있는 사람만 대국마다 출하 난수를 한 번 더 뽑아 보상 · 사건 순서가 갈렸고, 최근 사건이 가방에서 빠졌다.
 */
export const runNemeses = (list: Nemesis[], daily: string | null): Nemesis[] => (daily ? [] : list);
/** 이번 출하의 사건 가방: 최근 출하에서 만난 사건은 뒤로 (D-247) — 오늘의 도전은 늘 전부. 너무 적게 남으면 전부 */
export const eventBagFor = <T extends string>(all: readonly T[], recent: readonly string[], daily: string | null, min = 4): T[] => {
  if (daily) return [...all];
  const bag = all.filter((x) => !recent.includes(x));
  return bag.length < min ? [...all] : bag;
};
