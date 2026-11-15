import type { PieceType } from '../engine/types';
import { PRELOAD } from './preload-list';
import { josa } from './josa';

/**
 * 거대 주물 (D-484, GDD 21장 §3) — 거푸집을 잘못 부어 규격의 두 배로 굳은 기물. 판의 2×2를 차지한다.
 * 네 부위가 각자 적 기물(HP 따로)이다 — 부위를 칠 때마다 연쇄가 쌓이고, 부서진 부위는 제 몫의 공격을 잃는다. 넷 다 부서지면 쓰러진다.
 * 부위는 혼자 움직이지 않는다: 턴 시작에 묶음째 걷고(stepEvery턴마다 한 칸), 칠 쪽을 골라 예고한 뒤 적 차례 끝에 내리찍는다.
 * hp · atk = 바탕 기물 수치에 곱하는 부위 하나의 배율 (막 · 깊이 배율은 다른 적과 같이 더 곱한다).
 * 받침 그림을 받기 전에는 바탕 기물 그림을 두 배로 키워 네 조각으로 나눠 그린다 (그림 발주 G-01~03, docs/asset-order-master.md §0-C).
 */
export type GiantType = 'P' | 'R' | 'Q';
export interface GiantDef { name: string; hp: number; atk: number; stepEvery: number; move: string; hit: string; line: string }
export const GIANTS: Record<GiantType, GiantDef> = {
  P: { name: '거대 폰', hp: 1.3, atk: 1, stepEvery: 1, move: '턴마다 한 칸 앞으로 밀고 온다', hit: '바로 앞 줄 네 칸을 내리찍는다', line: '쇳덩이가 걸어온다.' },
  R: { name: '거대 룩', hp: 1, atk: 0.9, stepEvery: 2, move: '두 턴마다 한 칸 다가온다', hit: '고른 쪽으로 두 줄을 쓸어 친다', line: '성벽이 통째로 움직인다.' },
  Q: { name: '거대 퀸', hp: 0.9, atk: 0.8, stepEvery: 1, move: '턴마다 한 칸 다가온다', hit: '여덟 방향 중 한쪽으로 세 줄을 쏜다', line: '왕관이 너무 무거워 고개를 숙였다.' },
};
export const isGiantType = (t: PieceType): t is GiantType => t === 'P' || t === 'R' || t === 'Q';

/**
 * 거대 주물이 서는 곳 (GDD 21장 §3 · §3-B 갈림길 2, D-513 사용자 결정 2026-11-16): **검문 정예 미니보스로만** 선다.
 * 반장 판은 반장 자신이 2×2 몸이라 거대 주물을 세우지 않고(한 판에 2×2 하나), 도전 일반 대국에도 세우지 않는다 → 2×2는 검문 · 반장 · 종막에만.
 * level = 본편 왕관(0~3) · 도전 단계(4~). [막 1~3] → 그 막 검문에 세울 거대 주물 (없으면 null). 서는 만큼 같은 바탕 기물 하나(없으면 폰 둘)를 뺀다.
 */
export const GIANT_AT = {
  check: (act: number, level: number): GiantType | null => (act === 1 ? (level >= 3 ? 'P' : null) : act === 2 ? 'P' : level >= 3 ? 'Q' : 'R'),
  /** 반장 판: 없음 (D-513 — 반장이 2×2 몸) */
  boss: (_act: number, _level: number): GiantType | null => null,
  /** 일반 대국: 없음 (D-513 — 옛 도전 단계 2막 이후 25%를 뺐다). 0이면 서지 않는다 */
  battleOdds: 0,
  battleFrom: 4,
};

/**
 * 2×2 특별 보스 (D-513, GDD 21장 §3-B — 사용자 결정 2026-11-16 추천안): 반장 여섯 · 도금왕이 판 위 2×2 한 몸으로 선다.
 * 네 칸 = 킹 하나(왼아래 칸이 본체 — HP · 방열판 · 체크 보호), 몸 칸에 닿은 피해는 본체로 한 번만.
 * 움직임 · 공격은 거대 주물(`giantTurn`)을 그대로: 내 차례 시작에 묶음째 여덟 방향 한 칸 → 한 변 네 칸 예고 → 적 차례 끝 내리찍기.
 * 2단계(격노)는 꺾인 두 변 일곱 칸 · 공격 ×bossPhase2Atk(slice/cards.ts SLICE). 수치는 모두 반장 킹의 것을 쓴다.
 */
export const BOSS_BODY = {
  /** 턴마다 한 칸 (2턴부터) */
  stepEvery: 1,
  /** 금 간 바닥이 몸 밑에서 꺼질 때 받는 피해 (떨어지지 않는다 — 난이도 공격 배율을 곱한다). 프레스 한 방과 같은 무게 */
  crackDmg: 14,
  move: '턴마다 묶음째 한 칸 다가온다',
  hit: '몸 한 변 네 칸을 내리찍는다',
  hitRage: '꺾인 두 변 일곱 칸을 내리찍는다',
  slam: (name: string): string => `${name} — 내리찍기`,
  /** 전용 그림(GB-01~07 · b)을 받기 전 판 위 딱지 (D-386: 반장 킹 그림을 2×2로 빌려 쓴다) */
  tempArt: '임시 — GB 대기',
  /** 판 위에는 짧게 (2×2 귀퉁이 딱지) */
  tempChip: '임시',
};

/**
 * 2×2 보스 전용 그림 파일 (발주 GB-01~07 · b 「넣을 곳」과 같은 이름): `pieces64.txt` `[K:boss-<반장> 1]` · `[K:boss-<반장>-p2 1]`
 * → `python3 -I tools/pixel/maker.py export` → `public/pieces/s-boss-<반장>1.png` · `s-boss-<반장>-p2-1.png` (144칸 캔버스).
 */
export const BOSS_ART_RULES = ['plate', 'inspect', 'spawn', 'magnet', 'thorns', 'alarm', 'gilded'] as const;
export const bossArtFile = (rule: string, rage: boolean): string => `pieces/s-boss-${rule}${rage ? '-p2-' : ''}1.png`;
/** 그 반장의 그림(격노면 b, 없으면 1단계)을 아직 받지 않아 반장 킹 그림을 빌리는 중인가 — 받은 파일은 preload 목록(tools/gen-preload.cjs)에 오른다 */
export const bossArtTemp = (rule: string, rage = false): boolean => !PRELOAD.includes(bossArtFile(rule, rage)) && !PRELOAD.includes(bossArtFile(rule, false));

/**
 * 레이드 반장 (D-518, GDD 21장 §3-C — 사용자 방향 2026-11-16: 「2×2라 쉬워진 만큼 레이드처럼 · 때리는 맛 · 패링 · 회피하며 공격」).
 * 새 규칙은 최소로 — 기존 예고 칸 · 방열판 · 헛방 경직 · 경직 면역을 2×2에 잇는다.
 * - 패턴: 반장마다 기본 「내리찍기」 + 색깔 패턴 하나를 턴마다 번갈아 예고(도금왕은 셋). 격노(2단계)는 「꺾어 찍기」(ㄱ자 일곱 칸) + 색깔 패턴.
 * - 패링(막기): 그 타격을 방열판으로 다 받아낸 내 기물이 있으면 → 경직: 다음 내 차례에 걷지도 치지도 못하고 철갑을 잃고 받는 피해 ×parryWeak.
 * - 회피(헛방): 턴 시작에 예고 칸에 있던 내 기물이 모두 빠져 빈 땅을 치면 → 철갑을 잃는다(whiffWeak > 1이면 약점까지) (기존 헛방 「반장은 방열판만」을 2×2에 잇는다).
 * - 실패: 막지도 피하지도 못하면 패턴 피해(반장 킹 공격 × dmg) 그대로 — 내리찍기는 한 방이 무겁다.
 * - 경직은 연달아 걸리지 않는다(D-230 경직 면역): 경직이 풀린 바로 다음 타격은 막아도 경직이 없다(약점만).
 * 거대 주물(검문 정예)도 같은 패링 · 경직을 받는다. 이형 기물은 헛치면 기절에 더해 약점.
 */
export type RaidPattern = 'slam' | 'sweep' | 'charge' | 'corner';
export const RAID = {
  /** 반장마다 턴마다 번갈아 쓰는 패턴 (1단계) — 첫째가 1턴 */
  patterns: {
    plate: ['slam', 'sweep'], inspect: ['slam', 'charge'], spawn: ['slam', 'sweep'], magnet: ['slam', 'charge'],
    thorns: ['slam', 'charge'], alarm: ['slam', 'sweep'], gilded: ['slam', 'sweep', 'charge'],
  } as Record<string, RaidPattern[]>,
  /** 격노(2단계): 꺾어 찍기 + 색깔 패턴 */
  rage: {
    plate: ['corner', 'sweep'], inspect: ['corner', 'charge'], spawn: ['corner', 'sweep'], magnet: ['corner', 'charge'],
    thorns: ['corner', 'charge'], alarm: ['corner', 'sweep'], gilded: ['corner', 'sweep', 'charge'],
  } as Record<string, RaidPattern[]>,
  /** 패턴 피해 배율 (반장 킹 공격 × 이것) — 좁고 무거운 내리찍기 · 넓고 가벼운 쓸기 · 앞 기물이 막아 주는 돌진 */
  dmg: { slam: 1.5, sweep: 0.9, charge: 1.3, corner: 1.1 } as Record<RaidPattern, number>,
  /** 2×2 넓은 과녁만큼 반장 킹 HP (네 칸 어디든 킹 — 피격 면적이 넷) */
  hp: 1.5,
  /** 패링 → 경직 창: 받는 피해 배율 */
  parryWeak: 1.6,
  /** 회피(헛방) → 약점 창: 받는 피해 배율 — D-518 측정: 1.25면 보통 봇이 거의 매 턴 피해 반장이 도로 쉬워졌다(77%) → 1(철갑 벗김만, 작은 보상) */
  whiffWeak: 1,
  /** 이형 기물이 헛치면 기절에 더해 약점 (하이 리스크 하이 리턴) */
  formWeak: 1.4,
  /** 거대 주물 부위를 부수면 카드 + */
  breakDraw: 1,
  names: { slam: '내리찍기', sweep: '쓸기', charge: '돌진', corner: '꺾어 찍기' } as Record<RaidPattern, string>,
  /** 길게 누르기 효과 줄 (D-422 · D-515 — 한 행) */
  hits: { slam: '한 변 네 칸', sweep: '앞 한 줄 끝까지', charge: '몸 폭 두 줄 · 첫 기물까지', corner: '꺾인 두 변 일곱 칸' } as Record<RaidPattern, string>,
};
/** 레이드 표지 · 안내 (docs/voice.md ⑨ 표지 · ① 시스템 투) */
export const RAID_TEXT = {
  /** 띠 (⑨ 상태 — 명사구 + 덧말) */
  parry: (name: string): string => `패링! ${name} 경직 — 받는 피해 ×${RAID.parryWeak}`,
  parryImmune: (name: string): string => `막음 — ${josa(name, '이')} 버틴다`,
  whiff: (name: string): string => `헛방 — ${name} 철갑이 벗겨진다`,
  /** 몸 위 짧은 글 (⑨ 터짐) */
  stunTag: '경직!',
  weakTag: '약점!',
  whiffTag: '헛방!',
  holdTag: '막음!',
  /** 판 위 딱지 글자 (약점 창 — 경직은 별 딱지) */
  weakChip: '약',
  /** 토스트 (① 시스템 투) */
  stunToast: (name: string): string => `${josa(name, '이')} 경직되었습니다. 이번 턴은 움직이지 않고, 받는 피해가 ×${RAID.parryWeak}입니다.`,
  whiffToast: (name: string): string => `${name}의 철갑이 벗겨졌습니다.`,
};

/** 이번 턴 반장 패턴 (rule = 반장 규칙, rage = 2단계) — 턴마다 번갈아 */
export const raidPattern = (rule: string, rage: boolean, turn: number): RaidPattern => {
  const list = (rage ? RAID.rage : RAID.patterns)[rule] ?? (rage ? ['corner'] : ['slam']);
  return list[(Math.max(1, turn) - 1) % list.length];
};
