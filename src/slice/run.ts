import type { PieceType } from '../engine';
import { Rng } from '../engine/rng';
import { BOSS_RULES, type BossRule } from './cards';

/**
 * 출하 지도 (R5-1, D-168): 3막 × (갈림길 4 + 검문 + 반장). 갈림길마다 다음 갈 곳 2~3개 중 하나를 고른다.
 * 1막 앞 두 판(입문 · 연마)은 고정 — 첫 10분(D-150). 화면과 무관한 순수 로직.
 */
export type NodeKind = 'battle' | 'shop' | 'forge' | 'event' | 'check' | 'boss' | 'chest';
export type Reward = 'recruit' | 'kit' | 'card' | 'part' | 'end';

export interface BattleDef {
  enemy: PieceType[];
  kingHp: number;
  /** 적 기물 HP 배율 (막마다) */
  enemyHp?: number;
  /** 「1막 · 대국」 — 화면은 ' — '로 나눠 쓴다 */
  title: string;
  /** 전환 화면 서술 한 줄 */
  narr: string;
  /** 플레이 화면 첫 안내 (규칙 한 줄) */
  tell: string;
  reward: Reward;
  boss?: boolean;
  bossRule?: BossRule;
  /** 막별 적 특성 */
  traits?: ('blastPawn' | 'rookPlate')[];
  w?: number;
  h?: number;
  place?: { side: 0 | 1; t: PieceType; x: number; y: number }[];
}

export interface MapNode {
  kind: NodeKind;
  /** 대국 노드면 그 판 */
  battle?: BattleDef;
  /** 지도 세로 칸 (0 ~ MAP.lanes−1). 없으면 가운데 (입문 · 반장) */
  lane?: number;
  /** 다음 줄에서 이어진 노드 번호 (슬더스식 길, D-215). 없으면 다음 줄 전부 */
  to?: number[];
}

export interface Act {
  act: 1 | 2 | 3;
  name: string;
  /** 갈림길 줄: 줄마다 고를 수 있는 노드 (고정 노드는 하나) */
  rows: MapNode[][];
}

export const NODE_NAMES: Record<NodeKind, string> = { battle: '대국', shop: '고물상', forge: '작업대', event: '사건', check: '검문', boss: '반장', chest: '부품 상자' };
/** 지도 노드 도트 아이콘 키 (public/ui/icons16, D-182) */
export const NODE_ICONS: Record<NodeKind, string> = { battle: 'n.battle', shop: 'n.shop', forge: 'n.forge', event: 'n.event', check: 'n.check', boss: 'n.boss', chest: 'n.chest' };
/** 갈림길 카드의 짧은 설명 (시스템 투) */
export const NODE_DESC: Record<NodeKind, string> = {
  battle: '대국을 치르고 카드를 얻습니다.',
  shop: '나사로 카드 · 부품 · 정비를 삽니다.',
  forge: '카드 하나를 다듬거나, 빼거나, 분대를 수리합니다.',
  event: '무엇이 기다리는지 알 수 없습니다.',
  check: '정예와의 대국. 이기면 부품을 얻습니다.',
  boss: '막의 끝. 반장이 기다린다.',
  chest: '잠긴 상자. 부품 하나와 나사가 들어 있습니다.',
};

/**
 * 지도 (D-215, 사용자: "뭘 골라도 다음 선택지가 다 열린다 — 슬더스식으로, 길이도 늘려라"):
 * 막마다 층 floors[막]개 × 세로 lanes칸. 길 paths갈래가 아래층에서 위층으로 한 칸씩(−1 · 0 · +1) 올라가며, 길끼리 엇갈리지 않는다.
 * 고른 노드에서 이어진 노드로만 간다. 첫 층은 대국, 가운데 층은 부품 상자, 반장 앞 층은 작업대(쉼터) 고정.
 * 종류 가중치 · 첫 등장 층은 weights · from. 상점 · 작업대 · 검문은 같은 길에서 연달아 나오지 않는다.
 */
export const MAP = {
  lanes: 4,
  paths: 5,
  floors: [8, 10, 10],
  weights: { battle: 44, event: 22, check: 13, shop: 9, forge: 12 } as Record<'battle' | 'event' | 'check' | 'shop' | 'forge', number>,
  from: { battle: 0, event: 1, check: 3, shop: 2, forge: 3 } as Record<'battle' | 'event' | 'check' | 'shop' | 'forge', number>,
  /** 막마다 상점 · 작업대 · 검문 최대 수 (고정 층 제외) */
  max: { shop: 2, forge: 2, check: 3 } as Record<string, number>,
};

const ACT_NAMES = ['주조 층', '조립 층', '출하 층'] as const;

/**
 * 승급 (R6, D-174): 출하를 끝내면 다음 단계가 열린다. 단계는 쌓인다 (승급 3 = 1 + 2 + 3).
 * 수치는 구조용 — 조정은 R7 (D-080). 화면은 이름 + 한 줄.
 */
export const ASCENSION: { name: string; desc: string }[] = [
  { name: '날 선 쇠', desc: '적 기물 HP +10%' },
  { name: '굳은 검수', desc: '검문 · 반장의 킹 HP +10%' },
  { name: '짧은 휴식', desc: '대국 사이 회복이 절반으로' },
  { name: '비싼 고물', desc: '고물상 값 +25%' },
  { name: '불어난 무리', desc: '대국마다 적 폰 하나 더' },
];
export const ASC_NUM = { enemyHp: 1.1, eliteKing: 0.1, restMul: 0.5, shopMul: 1.25 };
export const ASC_MAX = ASCENSION.length;
/** 막마다 적 HP 배율 · 적 킹 HP (구조용 — 난이도 조정은 R7, D-080) */
const ACT_SCALE = [
  // 적 HP의 막별 계단은 층별 성장 곡선(FOE.hpGrow^깊이, D-203)으로 옮겼다 — 여기는 킹 HP만
  { hp: 1, king: 0.6 },
  { hp: 1, king: 0.75 },
  { hp: 1, king: 0.9 },
];
const NORMAL: PieceType[][][] = [
  [['K', 'P', 'P', 'N'], ['K', 'P', 'P', 'B'], ['K', 'P', 'N', 'B']],
  [['K', 'P', 'P', 'N', 'B'], ['K', 'P', 'R', 'N'], ['K', 'P', 'P', 'B', 'B']],
  [['K', 'P', 'N', 'B', 'R'], ['K', 'P', 'P', 'R', 'R'], ['K', 'Q', 'P', 'P']],
];
const CHECK: PieceType[][] = [['K', 'P', 'P', 'B', 'R'], ['K', 'P', 'N', 'R', 'R'], ['K', 'Q', 'R', 'N', 'P']];
// 1막 반장: 퀸 → 룩 (D-214 — 1막 대국 넷에서 반장 판 퀸 포함 다섯으로 뛰던 계단을 낮춘다)
const BOSS: PieceType[][] = [['K', 'R', 'P', 'P', 'N'], ['K', 'Q', 'R', 'P', 'P', 'N'], ['K', 'Q', 'R', 'R', 'B', 'N']];

const NARR_BATTLE = [
  ['쇳물이 바닥을 흐른다. 당신의 발밑이 달아오른다.', '거푸집이 식어 간다. 그 안에서 무언가 움직인다.', '불똥이 튄다. 검은 기물들이 고개를 든다.'],
  ['나사가 조여지는 소리가 멎지 않는다.', '조립대 위에서 팔 없는 기물이 당신을 노려본다.', '컨베이어가 덜컹이며 검은 무리를 실어 온다.'],
  ['포장 상자 사이로 찬 바람이 분다. 출하가 가깝다.', '도장 찍힌 기물들이 줄지어 서 있다. 하나도 웃지 않는다.', '출하구의 빛이 보인다. 그 앞을 검은 것이 막는다.'],
];
const NARR_CHECK = ['검수관의 저울이 기울어 있다. 이 문을 지난 자는 많지 않다.', '두 번째 검문. 저울 위에 당신의 이름이 적혀 있다.', '마지막 검문. 저울은 이미 당신을 재고 있다.'];
const NARR_BOSS = ['철갑을 두른 반장이 기다린다. 발밑 한 줄이 벌겋게 달아오른다.', '조립 반장이 당신의 부품을 하나하나 센다. 집게 끝에서 검은 폰이 찍혀 나온다.', '출하 반장. 이 문 너머는 바깥이다. 갑옷의 가시가 당신을 겨눈다.'];
const BOSS_RULE: BossRule[] = ['plate', 'spawn', 'thorns'];
const TRAITS: ('blastPawn' | 'rookPlate')[][] = [[], ['blastPawn'], ['blastPawn', 'rookPlate']];
const TRAIT_TELL = ['', ' 불꽃 표시가 붙은 폰은 쓰러지면 둘레 한 칸을 터뜨립니다.', ' 불꽃 표시 폰은 쓰러지면 터지고, 룩은 방패를 두릅니다.'];

/** 1막 앞 두 판 (첫 10분 — D-150) */
export const INTRO: BattleDef[] = [
  { enemy: ['K', 'P'], kingHp: 0.35, w: 4, h: 4, place: [{ side: 1, t: 'P', x: 2, y: 3 }], title: '입문 — 시험대', narr: '흰 기물들이 처음으로 눈을 뜬다. 검은 것이 앞을 막는다.', tell: '카드를 고르고 기물을 움직여, 적 킹을 쓰러뜨리십시오.', reward: 'recruit' },
  { enemy: ['K', 'P', 'P'], kingHp: 0.5, w: 5, h: 5, title: '1판 — 연마 공정', narr: '숫돌 위로 불꽃이 튄다. 무딘 것은 이곳을 넘지 못한다.', tell: '붉은 칸은 적이 다음 차례에 칠 자리입니다.', reward: 'kit' },
];

/** 대국 하나 만들기 */
export const battleFor = (act: 1 | 2 | 3, kind: 'battle' | 'check' | 'boss', rng: Rng, asc = 0): BattleDef => {
  const d = battleBase(act, kind, rng);
  if (asc >= 1) d.enemyHp = (d.enemyHp ?? 1) * ASC_NUM.enemyHp;
  if (asc >= 2 && kind !== 'battle') d.kingHp += ASC_NUM.eliteKing;
  if (asc >= 5) d.enemy = [...d.enemy, 'P'];
  return d;
};

const battleBase = (act: 1 | 2 | 3, kind: 'battle' | 'check' | 'boss', rng: Rng): BattleDef => {
  const a = act - 1;
  const sc = ACT_SCALE[a];
  const label = `${act}막`;
  if (kind === 'boss')
    return { enemy: BOSS[a], kingHp: sc.king + 0.1, enemyHp: sc.hp, title: `${label} — ${BOSS_RULES[BOSS_RULE[a]].name}`, narr: NARR_BOSS[a], tell: BOSS_RULES[BOSS_RULE[a]].tell, reward: act === 3 ? 'end' : 'part', boss: true, bossRule: BOSS_RULE[a], traits: TRAITS[a] };
  if (kind === 'check') return { enemy: CHECK[a], kingHp: sc.king + 0.05, enemyHp: sc.hp, title: `${label} — 검문`, narr: NARR_CHECK[a], tell: '이기면 부품을 하나 더 받습니다.' + TRAIT_TELL[a], reward: 'part', traits: TRAITS[a] };
  const pool = NORMAL[a];
  return { enemy: pool[rng.int(pool.length)], kingHp: sc.king, enemyHp: sc.hp, title: `${label} — 대국`, narr: NARR_BATTLE[a][rng.int(NARR_BATTLE[a].length)], tell: (a === 0 ? '부품과 맞물리는 카드를 함께 쓰면 배율이 오릅니다.' : '') + TRAIT_TELL[a].trim(), reward: 'card', traits: TRAITS[a] };
};


/** 출하 전체 (3막). 1막은 입문 · 연마 고정 뒤 갈림길 3줄, 2 · 3막은 갈림길 4줄. 끝에 검문 · 반장. 같은 시드 = 같은 지도 (오늘의 출하) */
export const buildRun = (seed: number, asc = 0): Act[] => {
  const rng = new Rng(seed);
  return ([1, 2, 3] as const).map((act) => {
    const rows: MapNode[][] = [];
    if (act === 1) INTRO.forEach((battle) => rows.push([{ kind: 'battle', battle }]));
    rows.push(...buildGraph(act, rng, asc));
    rows.push([{ kind: 'boss', battle: battleFor(act, 'boss', rng, asc) }]);
    return { act, name: ACT_NAMES[act - 1], rows };
  });
};

/** 막 하나의 길 그래프 (D-215) — 층마다 노드 줄. 마지막 층은 반장으로 이어진다(to 없음 = 다음 줄 전부) */
export const buildGraph = (act: 1 | 2 | 3, rng: Rng, asc = 0): MapNode[][] => {
  const F = MAP.floors[act - 1];
  const L = MAP.lanes;
  const lanes: Set<number>[] = Array.from({ length: F }, () => new Set());
  const edges: [number, number, number][] = [];
  const crosses = (f: number, a: number, b: number) => edges.some(([ff, c, d]) => ff === f && ((a < c && b > d) || (a > c && b < d)));
  for (let p = 0; p < MAP.paths; p++) {
    // 첫 두 길은 서로 다른 쪽에서 출발 — 처음부터 갈림길이 보이게
    let lane = p === 0 ? rng.int(2) : p === 1 ? L - 1 - rng.int(2) : rng.int(L);
    for (let f = 0; f < F; f++) {
      lanes[f].add(lane);
      if (f === F - 1) break;
      const opts = [lane - 1, lane, lane + 1].filter((x) => x >= 0 && x < L && !crosses(f, lane, x));
      const nx = opts.length ? opts[rng.int(opts.length)] : lane;
      if (!edges.some(([ff, a, b]) => ff === f && a === lane && b === nx)) edges.push([f, lane, nx]);
      lane = nx;
    }
  }
  const rows: MapNode[][] = lanes.map((set) => [...set].sort((a, b) => a - b).map((lane) => ({ kind: 'battle' as NodeKind, lane, to: [] as number[] })));
  for (const [f, a, b] of edges) {
    const from = rows[f].find((n) => n.lane === a)!;
    const k = rows[f + 1].findIndex((n) => n.lane === b);
    if (!from.to!.includes(k)) from.to!.push(k);
  }
  rows.forEach((r) => r.forEach((n) => n.to!.sort((x, y) => x - y)));
  rows[F - 1].forEach((n) => delete n.to);
  // 종류: 아래층부터 — 부모와 같은 상점 · 작업대 · 검문은 피한다
  const chestAt = Math.round(F / 2);
  const count: Record<string, number> = {};
  const parents = (f: number, k: number) => (f ? rows[f - 1].filter((n) => n.to?.includes(k) ?? true) : []);
  for (let f = 0; f < F; f++)
    rows[f].forEach((n, k) => {
      if (f === 0) n.kind = 'battle';
      else if (f === F - 1) n.kind = 'forge';
      else if (f === chestAt) n.kind = 'chest';
      else {
        const ps = parents(f, k).map((q) => q.kind);
        const pool = (Object.keys(MAP.weights) as (keyof typeof MAP.weights)[]).filter(
          (kd) => f >= MAP.from[kd] && (count[kd] ?? 0) < (MAP.max[kd] ?? 99) && !(kd !== 'battle' && kd !== 'event' && ps.includes(kd)) && !(kd === 'forge' && f === F - 2),
        );
        let r = rng.int(pool.reduce((a, kd) => a + MAP.weights[kd], 0));
        n.kind = pool.find((kd) => (r -= MAP.weights[kd]) < 0) ?? 'battle';
      }
      count[n.kind] = (count[n.kind] ?? 0) + 1;
    });
  // 검문은 막마다 하나는 있게
  if (!count.check) {
    const cand = rows.slice(3, F - 1).flat().filter((n) => n.kind === 'battle');
    if (cand.length) cand[rng.int(cand.length)].kind = 'check';
  }
  for (const n of rows.flat()) if (n.kind === 'battle' || n.kind === 'check') n.battle = battleFor(act, n.kind, rng, asc);
  return rows;
};
