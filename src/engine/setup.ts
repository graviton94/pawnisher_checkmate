import { defaultRules } from '../data/battle';
import { CARVE_FX, type CarveId } from '../data/carves';
import { PART_FX } from '../data/parts';
import { PIECE_STATS } from '../data/pieces';
import type { TwistId } from '../data/twists';
import type { BattleRules, BattleState, Loadout, Piece, PieceType, Side } from './types';

/** 군단의 기물 하나: 유형 + 각인 (+ 검문! 정예) */
export interface Unit {
  t: PieceType;
  carve?: CarveId;
  elite?: boolean;
}

/** 덱 = 보유 기물 목록. 유형만 적어도 된다 (각인 없음) */
export type Deck = (PieceType | Unit)[];

export const toUnits = (deck: Deck): Unit[] => deck.map((d) => (typeof d === 'string' ? { t: d } : d));

/** 보드 폭별 후열 기본 순서 (GDD 6장 §6.4). null = 한도 초과 기물용 추가 슬롯 */
const BACK_ROW: Record<number, (PieceType | null)[]> = {
  // 4 · 5: 수직 조각 입문 판 (D-150 — 첫 판은 작게, 첫 턴부터 교전)
  4: ['N', 'K', 'B', 'R'],
  5: ['R', 'N', 'K', 'B', 'Q'],
  6: ['R', 'N', 'Q', 'K', 'B', 'R'],
  8: ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'],
  10: ['R', 'N', null, 'B', 'Q', 'K', 'B', null, 'N', 'R'],
};

export const FULL_DECK: PieceType[] = ['K', 'Q', 'R', 'R', 'B', 'B', 'N', 'N', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'];

export interface BattleSetup {
  width: number;
  height: number;
  decks: [Deck, Deck];
  /** 생략하면 보드 크기별 기본 규칙 (data/battle.ts) */
  rules?: BattleRules;
  seed?: number;
  /** 진영별 부품. 생략하면 없음 */
  loadouts?: [Loadout, Loadout];
  /** 반장 비틀기 (적 진영) */
  twist?: TwistId;
  /** 적 기물 수치 배율 (층 · 압력 · 양날 쌍의 적 강화) */
  enemyScale?: Scale;
  /** 내 킹 최대 HP 배율 (압력) */
  myKingHp?: number;
}

export const EMPTY_LOADOUT: Loadout = { parts: [] };

/** 기물 하나를 만든다 (기본 수치) */
export const makePiece = (id: number, type: PieceType, side: Side, x: number, y: number): Piece => {
  const st = PIECE_STATS[type];
  return { id, type, side, x, y, hp: st.hp, maxHp: st.hp, atk: st.atk, def: st.def, shield: 0, moved: false };
};

/** 덱을 정통 체스 배치 규칙으로 자기 진영 끝 두 줄에 놓는다. */
const deploy = (width: number, height: number, units: Unit[], side: Side, nextId: () => number): Piece[] => {
  const deck = units.map((u) => u.t);
  const template = BACK_ROW[width];
  if (!template) throw new Error(`지원하지 않는 보드 폭: ${width}`);
  if (deck.filter((t) => t === 'K').length !== 1) throw new Error('덱에는 킹이 정확히 1기 있어야 한다');

  const backY = side === 0 ? 0 : height - 1;
  const frontY = side === 0 ? 1 : height - 2;
  const back: (PieceType | undefined)[] = new Array(width);
  const front: (PieceType | undefined)[] = new Array(width);

  const pawns = deck.filter((t) => t === 'P').length;
  const others: PieceType[] = deck.filter((t) => t !== 'P');
  const leftovers: PieceType[] = [];

  // 1) 기본 슬롯에 맞는 기물부터 놓는다
  const remaining = [...others];
  template.forEach((slot, x) => {
    if (!slot) return;
    const i = remaining.indexOf(slot);
    if (i >= 0) {
      back[x] = slot;
      remaining.splice(i, 1);
    }
  });
  leftovers.push(...remaining);

  const kingX = back.indexOf('K');
  const center = (width - 1) / 2;
  const byNearness = (origin: number) =>
    [...Array(width).keys()].sort((a, b) => Math.abs(a - origin) - Math.abs(b - origin) || Math.abs(a - center) - Math.abs(b - center) || a - b);

  // 2) 남은 비폰 기물: 같은 유형의 기본 슬롯에 가까운 후열 빈칸 → 없으면 전열
  for (const t of leftovers) {
    const home = template.indexOf(t);
    const order = byNearness(home >= 0 ? home : center);
    const bx = order.find((x) => !back[x]);
    if (bx !== undefined) back[bx] = t;
    else {
      const fx = order.find((x) => !front[x]);
      if (fx === undefined) throw new Error('덱이 보드에 다 들어가지 않는다');
      front[fx] = t;
    }
  }

  // 3) 폰: 킹 앞 열부터 중앙에서 바깥쪽으로
  const pawnOrder = byNearness(kingX);
  for (let i = 0; i < pawns; i++) {
    const fx = pawnOrder.find((x) => !front[x]);
    if (fx !== undefined) front[fx] = 'P';
    else {
      const bx = pawnOrder.find((x) => !back[x]);
      if (bx === undefined) throw new Error('덱이 보드에 다 들어가지 않는다');
      back[bx] = 'P';
    }
  }

  const out: Piece[] = [];
  back.forEach((t, x) => t && out.push(makePiece(nextId(), t, side, x, backY)));
  front.forEach((t, x) => t && out.push(makePiece(nextId(), t, side, x, frontY)));
  // 각인 · 정예: 같은 유형 안에서 덱 순서대로 붙인다 (킹에 가까운 기물부터)
  const pool = [...units];
  for (const p of [...out].sort((a, b) => Math.abs(a.x - kingX) - Math.abs(b.x - kingX) || a.id - b.id)) {
    const i = pool.findIndex((u) => u.t === p.type);
    if (i < 0) continue;
    const u = pool.splice(i, 1)[0];
    if (u.carve) p.carve = u.carve;
    if (u.elite) p.elite = true;
  }
  return out;
};

/** 수치 배율: 전체 + 유형별 */
export interface Scale {
  hp: number;
  atk: number;
  byType?: Partial<Record<PieceType, { hp?: number; atk?: number }>>;
}

/** 각인 · 정예 · 수치 배율 · 대국 시작 부품을 기물에 반영한다 */
const prepare = (list: Piece[], lo: Loadout, scale?: Scale): void => {
  const has = (id: Loadout['parts'][number]) => lo.parts.includes(id);
  for (const p of list) {
    if (scale) {
      const t = scale.byType?.[p.type];
      p.maxHp = Math.max(1, Math.round(p.maxHp * scale.hp * (t?.hp ?? 1)));
      p.atk = Math.max(1, Math.round(p.atk * scale.atk * (t?.atk ?? 1)));
    }
    if (p.carve === 'forged') {
      p.maxHp = Math.round(p.maxHp * CARVE_FX.forgedHp);
      p.atk = Math.round(p.atk * CARVE_FX.forgedAtk);
    }
    if (p.elite) p.maxHp *= 2;
    if (p.type === 'K' && has('tyrant')) p.atk *= PART_FX.tyrantAtk;
    if (p.type === 'K' && has('mobilize')) p.maxHp = Math.round(p.maxHp * PART_FX.mobilizeKingHp);
    if (p.type === 'R' && has('rivet')) p.shield += PART_FX.rivetShield;
    p.hp = p.maxHp;
  }
};

export const createBattle = ({ width, height, decks, rules, seed, loadouts, twist, enemyScale, myKingHp }: BattleSetup): BattleState => {
  let id = 1;
  const nextId = () => id++;
  const lo: [Loadout, Loadout] = loadouts ?? [EMPTY_LOADOUT, EMPTY_LOADOUT];
  const mine = deploy(width, height, toUnits(decks[0]), 0, nextId);
  const theirs = deploy(width, height, toUnits(decks[1]), 1, nextId);
  prepare(mine, lo[0], myKingHp ? { hp: 1, atk: 1, byType: { K: { hp: myKingHp } } } : undefined);
  prepare(theirs, lo[1], enemyScale);
  // 단독 출하 (에픽): 적은 군단으로 시작했나
  const solo: [boolean, boolean] = [lo[0].parts.includes('solo') && mine.length <= PART_FX.soloMax, lo[1].parts.includes('solo') && theirs.length <= PART_FX.soloMax];
  return {
    ...(solo[0] || solo[1] ? { solo } : {}),
    ...(twist ? { twist } : {}),
    width,
    height,
    pieces: [...mine, ...theirs],
    turnSide: 0,
    turnNumber: 1,
    winner: null,
    seed: seed ?? 1,
    rules: rules ?? defaultRules(width, height),
    ring: 0,
    apBonus: [0, 0],
    loadouts: [{ parts: [...lo[0].parts] }, { parts: [...lo[1].parts] }],
  };
};
