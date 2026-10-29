import { defaultRules } from '../data/battle';
import { FORGE_GAIN, FORGE_MASTERY_SHIELD, FORGE_MAX } from '../data/forge';
import { PIECE_STATS } from '../data/pieces';
import type { BattleRules, BattleState, Loadout, Piece, PieceType, Side } from './types';

/** 덱 = 보유 기물 유형 목록 (GDD 6장 §6.1) */
export type Deck = PieceType[];

/** 보드 폭별 후열 기본 순서 (GDD 6장 §6.4). null = 한도 초과 기물용 추가 슬롯 */
const BACK_ROW: Record<number, (PieceType | null)[]> = {
  6: ['R', 'N', 'Q', 'K', 'B', 'R'],
  8: ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'],
  10: ['R', 'N', null, 'B', 'Q', 'K', 'B', null, 'N', 'R'],
};

export const FULL_DECK: Deck = ['K', 'Q', 'R', 'R', 'B', 'B', 'N', 'N', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'];

export interface BattleSetup {
  width: number;
  height: number;
  decks: [Deck, Deck];
  /** 생략하면 보드 크기별 기본 규칙 (data/battle.ts) */
  rules?: BattleRules;
  seed?: number;
  /** 진영별 인챈트·카드·대장간. 생략하면 없음 */
  loadouts?: [Loadout, Loadout];
}

export const EMPTY_LOADOUT: Loadout = { enchants: {}, cards: [], forge: {} };

/** 대장간 유형 강화를 기물에 반영한다. +5 완전 강화면 전투 시작 보호막 (GDD 6장 §6.5) */
const applyForge = (pieces: Piece[], loadout: Loadout): void => {
  for (const p of pieces) {
    const lv = Math.min(FORGE_MAX, loadout.forge[p.type] ?? 0);
    if (!lv) continue;
    const g = FORGE_GAIN[p.type];
    p.maxHp += g.hp * lv;
    p.hp = p.maxHp;
    p.atk += g.atk * lv;
    p.def += g.def * lv;
    if (lv >= FORGE_MAX) p.shield += Math.round(p.maxHp * FORGE_MASTERY_SHIELD);
  }
};

const makePiece = (id: number, type: PieceType, side: Side, x: number, y: number): Piece => {
  const st = PIECE_STATS[type];
  return { id, type, side, x, y, hp: st.hp, maxHp: st.hp, atk: st.atk, def: st.def, shield: 0, moved: false, buffAtkPct: 0, buffDef: 0, buffTurns: 0 };
};

/** 덱을 정통 체스 배치 규칙으로 자기 진영 끝 두 줄에 놓는다. */
const deploy = (width: number, height: number, deck: Deck, side: Side, nextId: () => number): Piece[] => {
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
  return out;
};

export const createBattle = ({ width, height, decks, rules, seed, loadouts }: BattleSetup): BattleState => {
  let id = 1;
  const nextId = () => id++;
  const lo: [Loadout, Loadout] = loadouts ?? [EMPTY_LOADOUT, EMPTY_LOADOUT];
  const mine = deploy(width, height, decks[0], 0, nextId);
  const theirs = deploy(width, height, decks[1], 1, nextId);
  applyForge(mine, lo[0]);
  applyForge(theirs, lo[1]);
  return {
    width,
    height,
    pieces: [...mine, ...theirs],
    turnSide: 0,
    turnNumber: 1,
    winner: null,
    seed: seed ?? 1,
    rules: rules ?? defaultRules(width, height),
    stronghold: null,
    strongholdsSpawned: 0,
    ring: 0,
    apBonus: [0, 0],
    lastStrike: ['none', 'none'],
    loadouts: lo,
    cards: [lo[0].cards.map((id) => ({ id, cooldown: 0, spent: false })), lo[1].cards.map((id) => ({ id, cooldown: 0, spent: false }))],
    apCarry: [0, 0],
  };
};
