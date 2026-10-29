import { LAST_STRIKE_MULT } from '../data/battle';
import { CARDS, type CardUse } from '../data/cards';
import { BASE_AP, PIECE_STATS } from '../data/pieces';
import { at, buildGrid, chebyshev, cloneState, findPiece, forward, inBounds, kingOf, lastRank, samePos } from './board';
import { attackScan, damageOf, ench, isStrikeMove, legalMoves, moveTypes, onEdge } from './rules';
import {
  isMove,
  otherSide,
  type BattleEvent,
  type BattleState,
  type HitResult,
  type Piece,
  type PieceType,
  type Plan,
  type PlannedMove,
  type PlanStep,
  type Pos,
  type Side,
} from './types';

/** 이번 턴 가용 AP = 기본 + 이번 턴 보너스(요충지·이월 등) + 마공학 축전기 (E06 1장 +1, ★ +1) */
export const availableAp = (s: BattleState): number => {
  const side = s.turnSide;
  const e06 = ench(s, side, 'E06');
  return BASE_AP + s.apBonus[side] + (e06 >= 1 ? 1 : 0) + (e06 >= 3 ? 1 : 0);
};

/** 기물의 기본 이동 AP. 합체·폼 시프트면 가진 유형 중 가장 비싼 값, 태엽 행군(E04 ★)이면 폰은 0 */
export const moveCost = (s: BattleState, piece: Piece): number => {
  const types = moveTypes(piece);
  if (types.length === 1 && types[0] === 'P' && ench(s, piece.side, 'E04') >= 3) return 0;
  return Math.max(...types.map((t) => PIECE_STATS[t].ap));
};

/** 정통 체스 승급: 폰이 상대 끝줄에 닿으면 퀸. HP 비율은 유지한다 (GDD 2장 §2.6). */
export const applyPromotion = (s: BattleState, piece: Piece): boolean => {
  if (piece.type !== 'P' || piece.fused || piece.y !== lastRank(s, piece.side)) return false;
  transform(piece, 'Q');
  return true;
};

/** 기물을 다른 유형으로 바꾼다. HP 비율은 유지한다. */
const transform = (piece: Piece, to: PieceType): void => {
  const st = PIECE_STATS[to];
  const ratio = piece.hp / piece.maxHp;
  piece.type = to;
  piece.maxHp = st.hp;
  piece.hp = Math.max(1, Math.round(st.hp * ratio));
  piece.atk = st.atk;
  piece.def = st.def;
};

/** 기물 하나를 옮긴다 (승급 포함). 상태를 직접 바꾼다. */
export const applyMove = (s: BattleState, piece: Piece, to: Pos): void => {
  piece.x = to.x;
  piece.y = to.y;
  piece.moved = true;
  applyPromotion(s, piece);
};

/** 진영에 킹만 남았으면 최후의 일격을 준비시킨다 (D-015) */
export const checkAwaken = (s: BattleState, events: BattleEvent[]): void => {
  for (const side of [0, 1] as const) {
    if (s.lastStrike[side] !== 'none') continue;
    const mine = s.pieces.filter((p) => p.side === side);
    if (mine.length === 1 && mine[0].type === 'K') {
      s.lastStrike[side] = 'ready';
      events.push({ type: 'awaken', side, pieceId: mine[0].id });
    }
  }
};

/** 요충지에 올라섰거나 떠났을 때 점령 상태를 갱신한다 (GDD 5장 §5.4) */
const updateHolder = (s: BattleState, piece: Piece): void => {
  const sh = s.stronghold;
  if (!sh) return;
  if (piece.x === sh.x && piece.y === sh.y) {
    sh.holderId = piece.id;
    sh.hold = 0;
  } else if (sh.holderId === piece.id) {
    sh.holderId = null;
    sh.hold = 0;
  }
};

/** 이번 턴 진행 중 상태 (시뮬레이션 내부) */
interface TurnCtx {
  side: Side;
  events: BattleEvent[];
  removed: Piece[];
  /** 대상별 이번 턴 피격 횟수 (합동 십자포화) */
  hitCount: Map<number, number>;
  /** 턴 시작 시 아군 위치 (전술적 사선 개척) */
  startPos: Map<number, Pos>;
  acted: Set<number>;
  kills: number;
  knightApGiven: boolean;
}

interface AttackMods {
  mult: number;
  pierce: number;
  knockback: boolean;
  /** 맞은 적의 상하좌우에 주는 부가 피해 비율 */
  splash: number;
}

/** 파괴된 기물을 치우고 처치 효과·승패·각성을 처리한다 */
const resolveDeaths = (s: BattleState, ctx: TurnCtx, killer: Piece | undefined): number => {
  const dead = s.pieces.filter((p) => p.hp <= 0);
  if (!dead.length) return 0;
  for (const p of dead) ctx.removed.push({ ...p });
  s.pieces = s.pieces.filter((p) => p.hp > 0);
  if (s.stronghold && s.stronghold.holderId !== null && !findPiece(s, s.stronghold.holderId)) {
    s.stronghold.holderId = null;
    s.stronghold.hold = 0;
  }
  const enemyKills = dead.filter((p) => p.side !== ctx.side).length;
  ctx.kills += enemyKills;

  if (killer && enemyKills && findPiece(s, killer.id)) {
    const side = killer.side;
    // 피의 진군 (E07)
    const e07 = ench(s, side, 'E07');
    if (e07 >= 1) {
      const heal = Math.round(killer.maxHp * 0.25);
      killer.hp = Math.min(killer.maxHp, killer.hp + heal);
      ctx.events.push({ type: 'heal', pieceId: killer.id, amount: heal });
    }
    if (e07 >= 2) for (const p of s.pieces) if (p.side === side) p.hp = Math.min(p.maxHp, p.hp + 10);
    if (e07 >= 3 && !killer.fused && !killer.formAs) {
      const up: Partial<Record<PieceType, PieceType>> = { P: 'N', N: 'R', B: 'Q' };
      const to = up[killer.type];
      if (to) {
        const from = killer.type;
        transform(killer, to);
        ctx.events.push({ type: 'promote', pieceId: killer.id, from, to });
      }
    }
    // 기병대 돌격 교리 1장: 나이트가 처치하면 그 턴 AP +1 (턴당 1회)
    if (ench(s, side, 'E01') >= 1 && !ctx.knightApGiven && moveTypes(killer).includes('N')) {
      ctx.knightApGiven = true;
      s.apBonus[side] += 1;
      ctx.events.push({ type: 'apGain', side, amount: 1 });
    }
  }

  const winner = !kingOf(s, otherSide(s.turnSide)) ? s.turnSide : !kingOf(s, s.turnSide) ? otherSide(s.turnSide) : null;
  if (winner !== null) {
    s.winner = winner;
    ctx.events.push({ type: 'gameOver', winner });
    return enemyKills;
  }
  checkAwaken(s, ctx.events);
  return enemyKills;
};

/** 대상에 피해를 준다. 근위대 결속 ★이면 킹 피해를 붙어 있는 아군이 대신 받는다. */
/**
 * 체크메이트 보호: 공격받는 쪽 킹이 이번 턴 시작 때 HP 2 이상이었는가.
 * 시뮬레이션 시작 시 s.checkGuard에 기록한다.
 */
const checkGuarded = (s: BattleState, king: Piece): boolean => !!s.rules.checkmate && !!s.checkGuard?.includes(king.id);

const applyDamage = (s: BattleState, target: Piece, damage: number, splash = false): HitResult => {
  let t = target;
  if (t.type === 'K' && ench(s, t.side, 'E08') >= 3) {
    const guard = s.pieces
      .filter((p) => p.side === t.side && p.id !== t.id && p.hp > 0 && chebyshev(p, t) === 1)
      .sort((a, b) => b.hp - a.hp || a.id - b.id)[0];
    if (guard) t = guard;
  }
  const shieldAbsorbed = Math.min(t.shield, damage);
  t.shield -= shieldAbsorbed;
  t.hp = Math.max(0, t.hp - (damage - shieldAbsorbed));
  // 체크메이트 (D-022): 이번 턴 보호받는 킹은 HP 1에서 버틴다 — 다음 상대 턴에 맞으면 끝
  const checked = t.hp <= 0 && t.type === 'K' && checkGuarded(s, t);
  if (checked) t.hp = 1;
  return { targetId: t.id, damage, shieldAbsorbed, hpAfter: t.hp, killed: t.hp <= 0, ...(splash ? { splash } : {}), ...(checked ? { checked } : {}) };
};

const SLIDERS: PieceType[] = ['B', 'R', 'Q'];

/** 착지한 기물의 공격 한 번 (GDD 3장 §3.1). 파괴된 기물은 즉시 제거한다. 처치 수를 돌려준다. */
const performAttack = (s: BattleState, attacker: Piece, order: number, ctx: TurnCtx, mods: AttackMods): number => {
  const grid = buildGrid(s);
  const { targets, area } = attackScan(s, attacker, grid, { pierce: mods.pierce });
  let mult = mods.mult;

  // 전술적 사선 개척 (E09): 이번 턴 비켜 준 아군 덕에 열린 사선으로 치면 보너스
  const e09 = ench(s, attacker.side, 'E09');
  if (e09 >= 1 && moveTypes(attacker).some((t) => SLIDERS.includes(t))) {
    const opened = [...ctx.startPos.entries()].some(
      ([id, pos]) => id !== attacker.id && ctx.acted.has(id) && area.some((a) => samePos(a, pos)) && !at(s, grid, pos.x, pos.y),
    );
    if (opened) mult *= e09 >= 2 ? 1.6 : 1.3;
  }

  const hits: HitResult[] = [];
  const primary = new Set(targets.map((t) => t.id));
  for (const t of targets) {
    if (t.hp <= 0) continue;
    let dmg = damageOf(s, attacker, t, mult);
    if (e09 >= 3 && (ctx.hitCount.get(t.id) ?? 0) >= 1) dmg *= 2;
    const origin = { x: t.x, y: t.y };
    const hit = applyDamage(s, t, dmg);
    ctx.hitCount.set(t.id, (ctx.hitCount.get(t.id) ?? 0) + 1);

    // 증기 충격파 (A04): 공격 방향으로 1칸 밀어냄
    const victim = findPiece(s, hit.targetId)!;
    if (mods.knockback && victim.hp > 0) {
      const dx = Math.sign(victim.x - attacker.x);
      const dy = Math.sign(victim.y - attacker.y);
      const to = { x: victim.x + dx, y: victim.y + dy };
      if (inBounds(s, to.x, to.y) && !at(s, buildGrid(s), to.x, to.y)) {
        victim.x = to.x;
        victim.y = to.y;
        updateHolder(s, victim);
        hit.pushedTo = to;
      }
    }
    hits.push(hit);

    // 번개·연쇄 (E01 2장·★, C03): 맞은 적의 상하좌우 적에게 부가 피해
    if (mods.splash > 0) {
      for (const d of [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }]) {
        const n = s.pieces.find((p) => p.x === origin.x + d.x && p.y === origin.y + d.y && p.side !== attacker.side && p.hp > 0);
        if (!n || primary.has(n.id)) continue;
        hits.push(applyDamage(s, n, Math.max(1, Math.floor(dmg * mods.splash)), true));
        ctx.hitCount.set(n.id, (ctx.hitCount.get(n.id) ?? 0) + 1);
      }
    }
  }
  ctx.events.push({ type: 'attack', order, attackerId: attacker.id, area, hits });
  return resolveDeaths(s, ctx, attacker);
};

export interface Simulation {
  ok: boolean;
  reason?: string;
  /** 계획을 끝까지 실행한 보드 (차례는 아직 넘기지 않음) */
  state: BattleState;
  events: BattleEvent[];
  apUsed: number;
  /** 이번 턴에 파괴된 기물 (파괴 시점의 위치) */
  removed: Piece[];
}

/** 이 예약에 쓸 카드 슬롯 (없으면 null). 잘못된 카드면 이유 문자열. */
const cardFor = (s: BattleState, side: Side, step: PlanStep, use: CardUse): number | null | string => {
  const idx = 'card' in step ? step.card : undefined;
  if (idx === undefined) return null;
  const slot = s.cards[side][idx];
  if (!slot) return '없는 카드';
  if (slot.spent || slot.cooldown > 0) return '쓸 수 없는 카드';
  if (CARDS[slot.id].use !== use) return '맞지 않는 카드';
  return idx;
};

/** 카드를 사용 처리한다 (라운드당 1회·소멸 → spent, 쿨타임 → cooldown) */
const spendCard = (s: BattleState, side: Side, idx: number, pieceId: number, events: BattleEvent[]) => {
  const slot = s.cards[side][idx];
  const lim = CARDS[slot.id].limit;
  if (lim.type === 'cooldown') slot.cooldown = lim.turns + 1;
  else slot.spent = true;
  events.push({ type: 'card', side, card: slot.id, pieceId });
};

/** 처형자의 진격(C06) 대상인가: HP 30% 이하 적 일반 기물 */
const executable = (p: Piece | undefined, side: Side): p is Piece => !!p && p.side !== side && p.type !== 'K' && p.hp <= p.maxHp * 0.3;

/** 이 이동 예약이 갈 수 있는 칸인가 (처형자의 진격이면 대상 적 칸 포함) */
const moveReachable = (s: BattleState, piece: Piece, to: Pos, execute: boolean): boolean => {
  if (!execute) return legalMoves(s, piece).some((p) => samePos(p, to));
  const victim = s.pieces.find((p) => p.x === to.x && p.y === to.y);
  if (!executable(victim, piece.side)) return false;
  const without = { ...s, pieces: s.pieces.filter((p) => p !== victim) };
  return legalMoves(without, piece).some((p) => samePos(p, to));
};

const ownHalf = (s: BattleState, side: Side, y: number) => (side === 0 ? y < s.height / 2 : y >= s.height / 2);

/** 정면이 막혀 이동할 수 없는 폰인가 (E04 2장 제자리 공격 조건) */
export const pawnBlocked = (s: BattleState, piece: Piece): boolean =>
  piece.type === 'P' && !piece.fused && !piece.formAs && !legalMoves(s, piece).some((p) => p.x === piece.x && p.y === piece.y + forward(piece.side));

/** 합체 가능한 조합인가 (카드면 킹 외 아무 조합, 인챈트면 E11 단계별 해금) */
export const canFuse = (s: BattleState, a: Piece, b: Piece, withCard: boolean): boolean => {
  if (a.side !== b.side || a.id === b.id || a.type === 'K' || b.type === 'K' || a.fused || b.fused) return false;
  if (chebyshev(a, b) !== 1) return false;
  if (withCard) return true;
  const lv = ench(s, a.side, 'E11');
  const pair = [a.type, b.type].sort().join('');
  return (lv >= 1 && pair === 'BN') || (lv >= 2 && pair === 'NR');
};

/**
 * 계획을 예약 순서대로 실행한다: #1 이동 → #1 공격 → #2 이동 → #2 공격 … (GDD 1장 §1.5).
 * 계획 검증, 미리보기, 실제 실행이 모두 이 함수 하나를 쓴다. 입력 상태는 바꾸지 않는다.
 */
export const simulate = (input: BattleState, plan: Plan): Simulation => {
  const s = cloneState(input);
  const side = input.turnSide;
  s.checkGuard = s.pieces.filter((p) => p.type === 'K' && p.side !== side && p.hp > 1).map((p) => p.id);
  const ctx: TurnCtx = {
    side,
    events: [],
    removed: [],
    hitCount: new Map(),
    startPos: new Map(s.pieces.filter((p) => p.side === side).map((p) => [p.id, { x: p.x, y: p.y }])),
    acted: new Set(),
    kills: 0,
    knightApGiven: false,
  };
  let apUsed = 0;
  let prevKilled = false;
  const fail = (reason: string): Simulation => ({ ok: false, reason, state: s, events: ctx.events, apUsed, removed: ctx.removed });
  const own = (id: number) => {
    const p = findPiece(s, id);
    return p && p.side === side ? p : undefined;
  };

  for (let order = 0; order < plan.length; order++) {
    const step = plan[order];
    if (s.winner !== null) return fail('전투 종료');
    const piece = own(step.pieceId);
    if (!piece) return fail('없는 기물');
    const acting = step.kind !== 'shield' && step.kind !== 'formShift';
    if (acting && ctx.acted.has(piece.id)) return fail('이미 행동한 기물');

    // 기본 배율: 연쇄 지휘 체계 1장 (앞 순번이 처치했으면 +30%)
    const baseMult = ench(s, side, 'E05') >= 1 && prevKilled ? 1.3 : 1;
    const mods: AttackMods = { mult: baseMult, pierce: 0, knockback: false, splash: 0 };
    if (moveTypes(piece).includes('N')) {
      const e01 = ench(s, side, 'E01');
      if (e01 >= 2) mods.splash = e01 >= 3 ? 1 : 0.5;
    }
    let attackers: Piece[] = [];
    let repeats = 1;
    let cost = 0;
    let cardIdx: number | null = null;

    switch (step.kind) {
      case undefined:
      case 'move': {
        const c = cardFor(s, side, step, 'attach');
        if (typeof c === 'string') return fail(c);
        cardIdx = c;
        const cardId = c !== null ? s.cards[side][c].id : null;
        const execute = cardId === 'C06';
        if (!moveReachable(s, piece, step.to, execute)) return fail('갈 수 없는 칸');
        cost = moveCost(s, piece);
        if (ench(s, side, 'E10') >= 2 && onEdge(s, piece) && onEdge(s, step.to)) cost -= 1;
        if (cardId === 'A01') cost -= 1;
        cost = Math.max(0, cost);
        if (apUsed + cost > availableAp(s)) return fail('AP 부족');

        if (execute) {
          const victim = s.pieces.find((p) => p.x === step.to.x && p.y === step.to.y)!;
          const hit = applyDamage(s, victim, victim.hp + victim.shield);
          ctx.events.push({ type: 'attack', order, attackerId: piece.id, area: [{ ...step.to }], hits: [hit] });
          resolveDeaths(s, ctx, piece);
          if (s.winner !== null) break;
        }
        const from = { x: piece.x, y: piece.y };
        const before = piece.type;
        const strike = isStrikeMove(s, piece, step.to);
        applyMove(s, piece, step.to);
        updateHolder(s, piece);
        ctx.events.push({ type: 'move', order, pieceId: piece.id, from, to: { ...step.to } });
        if (piece.type !== before) ctx.events.push({ type: 'promote', pieceId: piece.id, from: before, to: piece.type });
        if (strike) {
          s.lastStrike[side] = 'used';
          ctx.events.push({ type: 'lastStrike', pieceId: piece.id });
          mods.mult *= LAST_STRIKE_MULT;
        }
        // 증기 기관 장갑 (E03)
        if (moveTypes(piece).includes('R')) {
          const e03 = ench(s, side, 'E03');
          const dist = chebyshev(from, step.to);
          if (e03 >= 1) {
            piece.shield += dist * 3;
            ctx.events.push({ type: 'shield', pieceId: piece.id, amount: dist * 3 });
          }
          if (e03 >= 3) {
            // 폭주 기관차: 지나온 칸 옆의 적에게 돌진 피해
            const dx = Math.sign(step.to.x - from.x);
            const dy = Math.sign(step.to.y - from.y);
            const rams: HitResult[] = [];
            for (let i = 1; i <= dist; i++) {
              const cx = from.x + dx * i;
              const cy = from.y + dy * i;
              for (const d of [{ x: dy, y: dx }, { x: -dy, y: -dx }]) {
                const e = s.pieces.find((p) => p.x === cx + d.x && p.y === cy + d.y && p.side !== side && p.hp > 0);
                if (e) rams.push(applyDamage(s, e, Math.max(1, Math.floor(piece.atk * 0.5) - e.def), true));
              }
            }
            if (rams.length) {
              ctx.events.push({ type: 'attack', order, attackerId: piece.id, area: [], hits: rams });
              resolveDeaths(s, ctx, piece);
            }
          }
        }
        if (cardId === 'A03') mods.pierce = 1;
        if (cardId === 'A04') mods.knockback = true;
        if (cardId === 'C01') repeats += 1;
        if (cardId === 'C03') {
          mods.mult *= 1.8;
          mods.splash = Math.max(mods.splash, 0.5);
        }
        attackers = [piece];
        ctx.acted.add(piece.id);
        break;
      }
      case 'stand': {
        if (ench(s, side, 'E04') < 2 || !pawnBlocked(s, piece)) return fail('제자리 공격 불가');
        cost = ench(s, side, 'E04') >= 3 ? 0 : 1;
        if (apUsed + cost > availableAp(s)) return fail('AP 부족');
        attackers = [piece];
        ctx.acted.add(piece.id);
        break;
      }
      case 'castle': {
        const c = cardFor(s, side, step, 'castle');
        if (c === null || typeof c === 'string') return fail(typeof c === 'string' ? c : '카드 필요');
        cardIdx = c;
        const partner = own(step.partnerId);
        if (!partner || ctx.acted.has(partner.id) || partner.id === piece.id) return fail('교환 대상 없음');
        if (piece.x !== partner.x && piece.y !== partner.y) return fail('같은 행/열이 아님');
        cost = CARDS.A02.ap;
        if (apUsed + cost > availableAp(s)) return fail('AP 부족');
        const a = { x: piece.x, y: piece.y };
        const b = { x: partner.x, y: partner.y };
        piece.x = b.x;
        piece.y = b.y;
        partner.x = a.x;
        partner.y = a.y;
        piece.moved = partner.moved = true;
        updateHolder(s, piece);
        updateHolder(s, partner);
        ctx.events.push({ type: 'move', order, pieceId: piece.id, from: a, to: b });
        ctx.events.push({ type: 'move', order, pieceId: partner.id, from: b, to: a });
        attackers = [piece, partner];
        ctx.acted.add(piece.id);
        ctx.acted.add(partner.id);
        break;
      }
      case 'shield': {
        const c = cardFor(s, side, step, 'shield');
        if (c === null || typeof c === 'string') return fail(typeof c === 'string' ? c : '카드 필요');
        cardIdx = c;
        piece.shield += 25;
        ctx.events.push({ type: 'shield', pieceId: piece.id, amount: 25 });
        break;
      }
      case 'gate': {
        const c = cardFor(s, side, step, 'gate');
        if (c === null || typeof c === 'string') return fail(typeof c === 'string' ? c : '카드 필요');
        cardIdx = c;
        if (!inBounds(s, step.to.x, step.to.y) || at(s, buildGrid(s), step.to.x, step.to.y) || !ownHalf(s, side, step.to.y)) {
          return fail('도약할 수 없는 칸');
        }
        cost = moveCost(s, piece);
        if (apUsed + cost > availableAp(s)) return fail('AP 부족');
        const from = { x: piece.x, y: piece.y };
        applyMove(s, piece, step.to);
        updateHolder(s, piece);
        ctx.events.push({ type: 'move', order, pieceId: piece.id, from, to: { ...step.to } });
        attackers = [piece];
        ctx.acted.add(piece.id);
        break;
      }
      case 'promote': {
        const c = cardFor(s, side, step, 'promote');
        if (c === null || typeof c === 'string') return fail(typeof c === 'string' ? c : '카드 필요');
        if (piece.type !== 'P' || piece.fused) return fail('폰이 아님');
        cardIdx = c;
        transform(piece, 'Q');
        ctx.events.push({ type: 'promote', pieceId: piece.id, from: 'P', to: 'Q' });
        attackers = [piece];
        ctx.acted.add(piece.id);
        break;
      }
      case 'fuse': {
        const c = step.card !== undefined ? cardFor(s, side, step, 'fuse') : null;
        if (typeof c === 'string') return fail(c);
        cardIdx = c;
        const partner = own(step.partnerId);
        if (!partner || ctx.acted.has(partner.id) || !canFuse(s, piece, partner, c !== null)) return fail('합체 불가');
        cost = ench(s, side, 'E11') >= 3 ? 0 : CARDS.C05.ap;
        if (apUsed + cost > availableAp(s)) return fail('AP 부족');
        const types = [...new Set([...moveTypes(piece), ...moveTypes(partner)])];
        const main = PIECE_STATS[partner.type].value > PIECE_STATS[piece.type].value ? partner.type : piece.type;
        piece.type = main;
        piece.fused = types;
        piece.formAs = null;
        piece.hp += partner.hp;
        piece.maxHp += partner.maxHp;
        piece.atk = Math.max(piece.atk, partner.atk);
        piece.def = Math.max(piece.def, partner.def);
        piece.shield += partner.shield;
        piece.moved = true;
        s.pieces = s.pieces.filter((p) => p.id !== partner.id);
        if (s.stronghold?.holderId === partner.id) {
          s.stronghold.holderId = null;
          s.stronghold.hold = 0;
        }
        ctx.events.push({ type: 'fuse', pieceId: piece.id, partnerId: partner.id, types });
        if (ench(s, side, 'E11') >= 3) repeats += 1;
        attackers = [piece];
        ctx.acted.add(piece.id);
        ctx.acted.add(partner.id);
        break;
      }
      case 'formShift': {
        const c = cardFor(s, side, step, 'formShift');
        if (c === null || typeof c === 'string') return fail(typeof c === 'string' ? c : '카드 필요');
        const partner = own(step.partnerId);
        if (piece.type !== 'N' || piece.fused || !partner || partner.type !== 'B' || partner.fused) return fail('나이트와 비숍이 필요');
        cardIdx = c;
        piece.formAs = 'B';
        partner.formAs = 'N';
        break;
      }
    }

    if (cardIdx !== null) spendCard(s, side, cardIdx, piece.id, ctx.events);
    apUsed += cost;
    if (s.winner !== null) continue;

    // 그랜드 피날레 (E05 ★): 두 기 이상 예약했을 때 마지막 순번의 공격 2회
    if (ench(s, side, 'E05') >= 3 && plan.length >= 2 && order === plan.length - 1) repeats += 1;

    let killed = 0;
    for (const a of attackers) {
      for (let r = 0; r < repeats && s.winner === null; r++) {
        if (!findPiece(s, a.id)) break;
        killed += performAttack(s, a, order, ctx, mods);
      }
    }
    prevKilled = killed > 0;
  }

  // 연쇄 지휘 체계 2장: 한 턴에 3기 이상 처치하면 다음 턴 AP +1
  if (ench(s, side, 'E05') >= 2 && ctx.kills >= 3) s.apCarry[side] += 1;
  return { ok: true, state: s, events: ctx.events, apUsed, removed: ctx.removed };
};

export interface PlanCheck {
  ok: boolean;
  reason?: string;
  /** 예약을 차례로(이동과 공격 모두) 반영한 가상 보드 (GDD 1장 §1.4) */
  virtual: BattleState;
  apUsed: number;
  removed: Piece[];
  events: BattleEvent[];
}

export const checkPlan = (s: BattleState, plan: Plan): PlanCheck => {
  const sim = simulate(s, plan);
  return { ok: sim.ok, reason: sim.reason, virtual: sim.state, apUsed: sim.apUsed, removed: sim.removed, events: sim.events };
};

/** 이미 이번 계획에서 행동한 기물인가 */
export const actedInPlan = (plan: Plan, pieceId: number): boolean =>
  plan.some((st) => {
    if (st.kind === 'shield' || st.kind === 'formShift') return false;
    if (st.pieceId === pieceId) return true;
    return (st.kind === 'castle' || st.kind === 'fuse') && st.partnerId === pieceId;
  });

/**
 * 현재 계획에 이어 이 기물이 예약할 수 있는 칸 (붙일 카드 포함).
 * 이미 행동했거나 AP가 모자라면 빈 배열.
 */
export const plannableMoves = (s: BattleState, plan: Plan, pieceId: number, card?: number): Pos[] => {
  const check = checkPlan(s, plan);
  if (!check.ok || check.virtual.winner !== null || actedInPlan(plan, pieceId)) return [];
  const piece = findPiece(check.virtual, pieceId);
  if (!piece || piece.side !== s.turnSide) return [];
  const v = check.virtual;
  const cands = [...legalMoves(v, piece, buildGrid(v))];
  if (card !== undefined && v.cards[s.turnSide][card]?.id === 'C06') {
    for (const e of v.pieces) if (executable(e, piece.side) && moveReachable(v, piece, e, true)) cands.push({ x: e.x, y: e.y });
  }
  return cands.filter((to) => simulate(s, [...plan, { pieceId, to, card } as PlannedMove]).ok);
};

export const addToPlan = (s: BattleState, plan: Plan, step: PlanStep): Plan | null => {
  const next = [...plan, step];
  return checkPlan(s, next).ok ? next : null;
};

/** 마지막 예약 되돌리기 */
export const undoLast = (plan: Plan): Plan => plan.slice(0, -1);

/** 이동 예약만 골라낸다 (화면 표시용) */
export const moveSteps = (plan: Plan): PlannedMove[] => plan.filter(isMove);
