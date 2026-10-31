import { CONTRACT_FX } from '../data/contracts';
import { LEGEND_FX } from '../data/legends';
import { DEFECT } from '../data/defects';
import { LANE_BLOCK, type FormationId } from '../data/formations';
import { defaultRules } from '../data/battle';
import { FORGE_GAIN, FORGE_MASTERY_SHIELD, FORGE_MAX } from '../data/forge';
import { PIECE_STATS } from '../data/pieces';
import { VARIANTS } from '../data/variants';
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
  // 결함 · 손상 (D-101): 그 유형 최대 HP가 깎인 채로 나온다
  for (const p of pieces) {
    const n = Math.min(DEFECT.damageMax, loadout.damage?.[p.type] ?? 0);
    if (!n) continue;
    p.maxHp = Math.max(1, Math.round(p.maxHp * (1 - DEFECT.damageCut * n)));
    p.hp = p.maxHp;
  }
};

/** 이형 거푸집을 입힌다: 표식 + 스탯 배율 (개량 뒤에 곱한다) */
const applyVariants = (pieces: Piece[], loadout: Loadout): void => {
  for (const p of pieces) {
    const id = loadout.variants?.[p.type];
    if (!id) continue;
    const v = VARIANTS[id];
    p.variant = id;
    if (v.hpMul) {
      p.maxHp = Math.max(1, Math.round(p.maxHp * v.hpMul));
      p.hp = p.maxHp;
    }
    if (v.atkMul) p.atk = Math.max(1, Math.round(p.atk * v.atkMul));
  }
};

const makePiece = (id: number, type: PieceType, side: Side, x: number, y: number): Piece => {
  const st = PIECE_STATS[type];
  return { id, type, side, x, y, hp: st.hp, maxHp: st.hp, atk: st.atk, def: st.def, shield: 0, moved: false, buffAtkPct: 0, buffDef: 0, buffTurns: 0 };
};

/** 덱을 정통 체스 배치 규칙으로 자기 진영 끝 두 줄에 놓는다. */
const deploy = (width: number, height: number, deck: Deck, side: Side, nextId: () => number, formation: FormationId = 'classic'): Piece[] => {
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

  // 3) 폰: 킹 앞 열부터 중앙에서 바깥쪽으로. 길 튼 진형이면 비숍·룩·퀸 앞을 마지막에 (D-102)
  const pawnOrder =
    formation === 'lanes'
      ? byNearness(kingX).sort((a, b) => (LANE_BLOCK[back[a] ?? 'empty'] ?? 1) - (LANE_BLOCK[back[b] ?? 'empty'] ?? 1))
      : byNearness(kingX);
  for (let i = 0; i < pawns; i++) {
    const fx = pawnOrder.find((x) => !front[x]);
    if (fx !== undefined) front[fx] = 'P';
    else {
      const bx = pawnOrder.find((x) => !back[x]);
      if (bx === undefined) throw new Error('덱이 보드에 다 들어가지 않는다');
      back[bx] = 'P';
    }
  }

  // 선봉 진형: 킹 말고 앞뒤를 바꾼다 (앞줄 = 기물, 뒷줄 = 폰)
  if (formation === 'vanguard') {
    for (let x = 0; x < width; x++) {
      if (back[x] === 'K') continue;
      [back[x], front[x]] = [front[x], back[x]];
    }
    // 킹 앞 폰도 뒷줄 빈칸으로 (앞줄은 기물만)
    for (let x = 0; x < width; x++) {
      if (front[x] !== 'P') continue;
      const bx = byNearness(x).find((c) => !back[c]);
      if (bx !== undefined) {
        back[bx] = 'P';
        front[x] = undefined;
      }
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
  const mine = deploy(width, height, decks[0], 0, nextId, lo[0].formation);
  const theirs = deploy(width, height, decks[1], 1, nextId, lo[1].formation);
  applyForge(mine, lo[0]);
  applyForge(theirs, lo[1]);
  applyVariants(mine, lo[0]);
  applyVariants(theirs, lo[1]);
  // 폭군 왕관 (에픽, D-112): 킹 ATK 두 배
  for (const [list, l] of [[mine, lo[0]], [theirs, lo[1]]] as const) if (l.legends?.includes('L05')) for (const p of list) if (p.type === 'K') p.atk *= LEGEND_FX.tyrantAtk;
  // 날림 공정 (계약, D-120): ATK +20%
  for (const [list, l] of [[mine, lo[0]], [theirs, lo[1]]] as const) if (l.contracts?.includes('K4')) for (const p of list) p.atk = Math.round(p.atk * CONTRACT_FX.atk);
  // 단독 출하 (에픽): 6기 이하로 시작했나
  const solo: [boolean, boolean] = [!!lo[0].legends?.includes('L07') && mine.length <= LEGEND_FX.soloMax, !!lo[1].legends?.includes('L07') && theirs.length <= LEGEND_FX.soloMax];
  return {
    ...(solo[0] || solo[1] ? { solo } : {}),
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
