import { CHAIN } from '../data/battle';
import { CARVE_FX } from '../data/carves';
import { PART_FX } from '../data/parts';
import { BASE_AP, PIECE_STATS } from '../data/pieces';
import { TWIST_FX } from '../data/twists';
import { buildGrid, chebyshev, cloneState, findPiece, forward, inBounds, kingOf, lastRank, samePos } from './board';
import { attackScan, damageOf, legalMoves, part, takenMult, twistOn } from './rules';
import { otherSide, type BattleEvent, type BattleState, type HitResult, type Piece, type PieceType, type Plan, type PlannedMove, type PlanStep, type Pos, type Side } from './types';

/** 이번 턴 가용 태엽 = 기본 5 + 이번 턴 보너스 + 축전기 · 총동원령 */
export const availableAp = (s: BattleState): number => {
  const side = s.turnSide;
  return BASE_AP + s.apBonus[side] + (part(s, side, 'capacitor') ? 1 : 0) + (part(s, side, 'mobilize') ? PART_FX.mobilizeAp : 0);
};

/** 기물의 이동 태엽: 기본값 − 태엽 각인 − 편자 질주(반장 나이트) */
export const moveCost = (s: BattleState, piece: Piece): number => {
  let c = PIECE_STATS[piece.type].ap;
  if (piece.carve === 'haste') c -= CARVE_FX.haste;
  if (piece.type === 'N' && twistOn(s, piece, 'horseshoe')) c -= 1;
  return Math.max(0, c);
};

/** 기물을 다른 유형으로 바꾼다. HP 비율은 유지한다 */
const transform = (piece: Piece, to: PieceType): void => {
  const st = PIECE_STATS[to];
  const ratio = piece.hp / piece.maxHp;
  const forged = piece.carve === 'forged';
  piece.type = to;
  piece.maxHp = Math.round(st.hp * (forged ? CARVE_FX.forgedHp : 1));
  piece.hp = Math.max(1, Math.round(piece.maxHp * ratio));
  piece.atk = Math.round(st.atk * (forged ? CARVE_FX.forgedAtk : 1));
  piece.def = st.def;
};

/** 정통 체스 승급: 폰이 상대 끝줄(무너졌으면 남은 끝)에 닿으면 퀸 */
export const applyPromotion = (s: BattleState, piece: Piece): boolean => {
  if (piece.type !== 'P') return false;
  if (piece.y !== lastRank(s, piece.side) && inBounds(s, piece.x, piece.y + forward(piece.side))) return false;
  transform(piece, 'Q');
  return true;
};

export const applyMove = (s: BattleState, piece: Piece, to: Pos): void => {
  piece.x = to.x;
  piece.y = to.y;
  piece.moved = true;
  applyPromotion(s, piece);
};

/** 이번 턴 진행 중 상태 (시뮬레이션 내부) */
interface TurnCtx {
  side: Side;
  events: BattleEvent[];
  removed: Piece[];
  acted: Set<number>;
  /** 이번 턴 처치 수 (연쇄 보너스) */
  kills: number;
  order: number;
  /** 턴당 한 번 효과 (기병 박차) · 여왕 거푸집 횟수 */
  once: Set<string>;
  queenAp: number;
}

const gainAp = (s: BattleState, ctx: TurnCtx, n: number) => {
  s.apBonus[ctx.side] += n;
  ctx.events.push({ type: 'apGain', side: ctx.side, amount: n });
};

/** 체크 보호: 공격받는 쪽 킹이 이번 턴 시작 때 HP 2 이상이었는가 */
const checkGuarded = (s: BattleState, king: Piece): boolean => s.rules.checkmate && !!s.checkGuard?.includes(king.id);

/** 피해를 준다 (방열판 먼저). 체크 · 비상 퓨즈로 버틸 수 있다 */
const applyDamage = (s: BattleState, t: Piece, damage: number, splash = false): HitResult => {
  const shieldAbsorbed = Math.min(t.shield, damage);
  t.shield -= shieldAbsorbed;
  t.hp = Math.max(0, t.hp - (damage - shieldAbsorbed));
  const checked = t.hp <= 0 && t.type === 'K' && checkGuarded(s, t);
  if (checked) t.hp = 1;
  const fuse = !checked && t.hp <= 0 && t.type !== 'K' && part(s, t.side, 'fuse') && !s.fuseUsed?.[t.side];
  if (fuse) {
    t.hp = 1;
    (s.fuseUsed ??= [false, false])[t.side] = true;
  }
  const door = !checked && !fuse && t.hp <= 0 && !!s.doorIds?.includes(t.id);
  if (door) {
    t.hp = 1;
    // 한 번만 지운다 (생명 두 번인 기물은 id가 두 번 들어 있다)
    s.doorIds = [...s.doorIds!];
    s.doorIds.splice(s.doorIds.indexOf(t.id), 1);
  }
  return { targetId: t.id, damage, shieldAbsorbed, hpAfter: t.hp, killed: t.hp <= 0, ...(splash ? { splash } : {}), ...(checked ? { checked } : {}), ...(fuse ? { fuse } : {}), ...(door ? { door } : {}) };
};

/** 튐 (각인 · 번개 편자): 그 칸 주변 적에게 dmg × ratio */
const splashAround = (s: BattleState, attacker: Piece, center: Pos, dirs: Pos[], dmg: number, ratio: number, skip: Set<number>): HitResult[] => {
  const out: HitResult[] = [];
  for (const d of dirs) {
    const n = s.pieces.find((p) => p.x === center.x + d.x && p.y === center.y + d.y && p.side !== attacker.side && p.hp > 0);
    if (!n || skip.has(n.id)) continue;
    skip.add(n.id);
    out.push(applyDamage(s, n, Math.max(1, Math.round(dmg * ratio * takenMult(s, attacker, n))), true));
  }
  return out;
};
const ORTHO: Pos[] = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
const DIAG: Pos[] = [{ x: 1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: -1, y: -1 }];

/** 양산 라인 비틀기: 쓰러진 적 폰이 맨 뒷줄 빈칸에 다시 선다 */
const respawnPawn = (s: BattleState, dead: Piece, ctx: TurnCtx): void => {
  if ((s.respawns ?? 0) >= TWIST_FX.lineMax) return;
  const y = s.height - 1;
  const grid = buildGrid(s);
  const xs = [...Array(s.width).keys()].sort((a, b) => Math.abs(a - dead.x) - Math.abs(b - dead.x));
  const x = xs.find((cx) => inBounds(s, cx, y) && !grid[y * s.width + cx]);
  if (x === undefined) return;
  const st = PIECE_STATS.P;
  const id = Math.max(...s.pieces.map((p) => p.id), ...ctx.removed.map((p) => p.id)) + 1;
  s.pieces.push({ id, type: 'P', side: 1, x, y, hp: st.hp, maxHp: st.hp, atk: st.atk, def: st.def, shield: 0, moved: false });
  s.respawns = (s.respawns ?? 0) + 1;
  ctx.events.push({ type: 'respawn', pieceId: id, pos: { x, y } });
};

/** 쓰러진 기물을 치우고 처치 효과 · 승패를 처리한다. 적 처치 수를 돌려준다 */
const resolveDeaths = (s: BattleState, ctx: TurnCtx, killer: Piece | undefined, depth = 0): number => {
  const dead = s.pieces.filter((p) => p.hp <= 0);
  if (!dead.length) return 0;
  for (const p of dead) ctx.removed.push({ ...p });
  s.pieces = s.pieces.filter((p) => p.hp > 0);
  for (const d of dead) {
    // 도미노 공장 (에픽): 쓰러진 적의 상하좌우 적에게 — 한 번만 (연쇄 없음)
    if (depth === 0 && part(s, otherSide(d.side), 'domino')) {
      const hits = s.pieces
        .filter((p) => p.side === d.side && p.hp > 0 && Math.abs(p.x - d.x) + Math.abs(p.y - d.y) === 1)
        .map((p) => applyDamage(s, p, Math.max(1, Math.round(d.maxHp * PART_FX.domino)), true));
      if (hits.length) ctx.events.push({ type: 'blast', pos: { x: d.x, y: d.y }, label: '도미노', hits });
    }
    if (d.type === 'P' && twistOn(s, d, 'line')) respawnPawn(s, d, ctx);
  }
  const enemyKills = dead.filter((p) => p.side !== ctx.side).length;
  ctx.kills += enemyKills;
  if (killer) {
    const rec = (s.record ??= [{}, {}])[killer.side];
    if (dead.some((p) => p.type === 'K' && p.side !== killer.side)) rec.finisher = killer.type;
    if (enemyKills) rec.kills = (rec.kills ?? 0) + enemyKills;
  }
  if (killer && enemyKills && findPiece(s, killer.id)) {
    const side = killer.side;
    if (part(s, side, 'blood')) {
      const heal = Math.min(killer.maxHp - killer.hp, Math.round(killer.maxHp * PART_FX.blood));
      if (heal > 0) {
        killer.hp += heal;
        ctx.events.push({ type: 'heal', pieceId: killer.id, amount: heal });
      }
    }
    if (killer.type === 'P' && part(s, side, 'promo')) {
      transform(killer, 'N');
      ctx.events.push({ type: 'promote', pieceId: killer.id, from: 'P', to: 'N' });
    }
    if (killer.type === 'K' && part(s, side, 'tyrant')) {
      for (const p of s.pieces) if (p.side === side) p.shield += PART_FX.tyrantShield;
      ctx.events.push({ type: 'shield', pieceId: killer.id, amount: PART_FX.tyrantShield });
    }
    if (killer.type === 'N' && part(s, side, 'spur') && !ctx.once.has('spur')) {
      ctx.once.add('spur');
      gainAp(s, ctx, 1);
    }
  }
  const winner = !kingOf(s, otherSide(s.turnSide)) ? s.turnSide : !kingOf(s, s.turnSide) ? otherSide(s.turnSide) : null;
  if (winner !== null) {
    s.winner = winner;
    ctx.events.push({ type: 'gameOver', winner });
    return enemyKills;
  }
  // 도미노 · 반격으로 쓰러진 기물 정리
  if (s.pieces.some((p) => p.hp <= 0)) resolveDeaths(s, ctx, undefined, depth + 1);
  return enemyKills;
};

/** 착지한 기물의 공격 한 번 (GDD 3장 §3.1). 처치 수를 돌려준다 */
const performAttack = (s: BattleState, attacker: Piece, ctx: TurnCtx, baseMult: number, add = 0, shieldStrike = 0): number => {
  const { targets, area } = attackScan(s, attacker);
  let mult = baseMult;
  // 연쇄 보너스 (D-077): 이번 턴 앞 순번 처치 수만큼
  if (ctx.kills > 0) mult *= 1 + Math.min(ctx.kills, CHAIN.cap) * CHAIN.perKill;
  const side = attacker.side;
  const hits: HitResult[] = [];
  const counters: { by: number; hit: HitResult }[] = [];
  const skip = new Set(targets.map((t) => t.id));
  const land = { x: attacker.x, y: attacker.y };
  let landDmg = 0;
  let shieldSpent = 0;
  for (const t of targets) {
    if (t.hp <= 0) continue;
    // 방열판은 첫 직접 대상에만 합산한다. 튐·관통 뒷 대상의 기반 피해는 원래 값이다.
    const spent = !hits.length ? Math.min(attacker.shield, Math.max(0, shieldStrike)) : 0;
    attacker.shield -= spent;
    shieldSpent += spent;
    let splashDmg = damageOf(s, attacker, t, mult, add);
    let dmg = spent ? damageOf(s, attacker, t, mult, add + spent) : splashDmg;
    if (part(s, side, 'blade') && t.hp <= t.maxHp * PART_FX.bladeAt) dmg = Math.round(dmg * PART_FX.blade);
    if (t.type === 'K' && part(s, side, 'hunter')) dmg = Math.round(dmg * PART_FX.hunter);
    if (part(s, side, 'blade') && t.hp <= t.maxHp * PART_FX.bladeAt) splashDmg = Math.round(splashDmg * PART_FX.blade);
    if (t.type === 'K' && part(s, side, 'hunter')) splashDmg = Math.round(splashDmg * PART_FX.hunter);
    landDmg = Math.max(landDmg, splashDmg);
    const origin = { x: t.x, y: t.y };
    const hit = applyDamage(s, t, dmg);
    hits.push(hit);
    // 반격 톱니: 맞고 살아남으면 일부를 되돌린다
    if (part(s, t.side, 'counterCog') && hit.damage > 0 && t.hp > 0 && attacker.hp > 0) counters.push({ by: t.id, hit: applyDamage(s, attacker, Math.max(1, Math.round(hit.damage * PART_FX.counter)), true) });
    // 번개 편자: 나이트가 맞힌 적의 상하좌우로
    if (attacker.type === 'N' && part(s, side, 'bolt')) hits.push(...splashAround(s, attacker, origin, ORTHO, splashDmg, PART_FX.bolt, skip));
  }
  // 튐 각인: 착지 칸 주변으로 (이 공격에서 가장 큰 피해 기준)
  if (landDmg > 0 && attacker.carve === 'cross') hits.push(...splashAround(s, attacker, land, ORTHO, landDmg, CARVE_FX.splash, skip));
  if (landDmg > 0 && attacker.carve === 'diag') hits.push(...splashAround(s, attacker, land, DIAG, landDmg, CARVE_FX.splash, skip));
  ctx.events.push({ type: 'attack', order: ctx.order, attackerId: attacker.id, area, hits, ...(shieldSpent ? { shieldSpent } : {}), ...(mult > 1.05 ? { mult: Math.round(mult * 100) / 100 } : {}), ...(add > 0 ? { add } : {}) });
  // 양산 명령서: 폰이 치면 그 적에 붙어 있는 다른 아군 폰도 50%로
  if (attacker.type === 'P' && part(s, side, 'phalanx')) {
    for (const h of hits.filter((x) => !x.splash)) {
      const t = findPiece(s, h.targetId);
      if (!t || t.hp <= 0) continue;
      for (const mate of s.pieces.filter((p) => p.side === side && p.type === 'P' && p.id !== attacker.id && p.hp > 0 && chebyshev(p, t) === 1)) {
        if (t.hp <= 0) break;
        const hit = applyDamage(s, t, Math.max(1, Math.round(damageOf(s, mate, t, mult) * PART_FX.phalanx)), true);
        ctx.events.push({ type: 'attack', order: ctx.order, attackerId: mate.id, area: [{ x: t.x, y: t.y }], hits: [hit] });
      }
    }
  }
  for (const c of counters) ctx.events.push({ type: 'attack', order: ctx.order, attackerId: c.by, area: [], hits: [c.hit] });
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

/** 이 진영의 한 턴 명령 상한 (서류 검문) */
const orderCap = (s: BattleState, side: Side): number => (side === 0 && s.twist === 'papers' ? TWIST_FX.papersMax : Infinity);

/**
 * 계획을 예약 순서대로 실행한다: #1 이동 → #1 공격 → #2 이동 → #2 공격 … (GDD 1장 §1.5).
 * 계획 검증, 미리보기, AI, 실제 실행이 모두 이 함수 하나를 쓴다. 입력 상태는 바꾸지 않는다.
 */
export interface SimOptions {
  /** 이번 턴 앞서 처치한 수 (명령 카드가 한 장씩 실행될 때 연쇄 보너스를 이어 간다) */
  kills?: number;
  /** 이 계획 전체에 곱할 공격 배율 (카드 효과 — ×) */
  mult?: number;
  /** 공격력에 먼저 더하는 피해 (합 — +, D-205). 최종 = (공격 + 합) × 곱 */
  add?: number;
  /** 첫 직접 대상에 방열판을 이만큼까지 소모해 합산한다. 빈 공격에는 소모하지 않는다. */
  shieldStrike?: number;
  /** 태엽 검사를 건너뛴다 (카드가 태엽을 따로 셀 때) */
  freeAp?: boolean;
}

export const simulate = (input: BattleState, plan: Plan, opts: SimOptions = {}): Simulation => {
  const s = cloneState(input);
  const side = input.turnSide;
  s.checkGuard = s.pieces.filter((p) => p.type === 'K' && p.side !== side && p.hp > 1).map((p) => p.id);
  s.relaunch = [];
  const ctx: TurnCtx = { side, events: [], removed: [], acted: new Set(), kills: opts.kills ?? 0, order: 0, once: new Set(), queenAp: 0 };
  let apUsed = 0;
  let prevKilled = false;
  const fail = (reason: string): Simulation => ({ ok: false, reason, state: s, events: ctx.events, apUsed, removed: ctx.removed });
  if (plan.length > orderCap(s, side)) return fail('명령이 너무 많다');

  for (let order = 0; order < plan.length; order++) {
    const step = plan[order];
    ctx.order = order;
    if (s.winner !== null) return fail('대국 종료');
    const piece = findPiece(s, step.pieceId);
    if (!piece || piece.side !== side) return fail('없는 기물');
    if (ctx.acted.has(piece.id)) return fail('이미 움직인 기물');
    if (!legalMoves(s, piece).some((p) => samePos(p, step.to))) return fail('갈 수 없는 칸');
    const cost = moveCost(s, piece);
    if (!opts.freeAp && apUsed + cost > availableAp(s)) return fail('태엽 부족');
    apUsed += cost;

    const from = { x: piece.x, y: piece.y };
    const before = piece.type;
    // 잡기 규칙(시험장 B, D-177): 적이 선 칸에 들어가면 그 적을 잡는다 (체력과 무관하게 한 번에)
    let captured = 0;
    if (s.rules.capture) {
      const victim = s.pieces.find((p) => p.x === step.to.x && p.y === step.to.y && p.side !== side);
      if (victim) {
        const hit = applyDamage(s, victim, victim.hp + victim.shield);
        if (victim.hp > 0) victim.hp = 0;
        ctx.events.push({ type: 'attack', order, attackerId: piece.id, area: [{ ...step.to }], hits: [{ ...hit, hpAfter: 0, killed: true }] });
        captured = resolveDeaths(s, ctx, piece);
        if (victim.type === 'K') s.winner = side;
      }
    }
    applyMove(s, piece, step.to);
    ctx.events.push({ type: 'move', order, pieceId: piece.id, from, to: { ...step.to } });
    if (piece.type !== before) ctx.events.push({ type: 'promote', pieceId: piece.id, from: before, to: piece.type });
    ctx.acted.add(piece.id);
    if (s.rules.capture) {
      prevKilled = captured > 0;
      continue;
    }

    // 이번 명령의 배율: 선봉 톱니 · 마무리 망치 · 연쇄 지휘
    let mult = opts.mult ?? 1;
    if (order === 0 && part(s, side, 'firstCog')) mult *= PART_FX.firstCog;
    if (order >= PART_FX.lastFrom && part(s, side, 'lastHammer')) mult *= PART_FX.lastHammer;
    if (prevKilled && part(s, side, 'command')) mult *= PART_FX.command;
    const killed = performAttack(s, piece, ctx, mult, opts.add ?? 0, opts.shieldStrike ?? 0);
    prevKilled = killed > 0;
    if (s.winner !== null) continue;

    // 무한 궤도: 나이트가 처치하면 한 번 더 움직일 수 있다 (기물마다 턴당 한 번)
    if (killed && piece.type === 'N' && part(s, side, 'tread') && findPiece(s, piece.id) && !s.relaunch.includes(piece.id)) {
      s.relaunch.push(piece.id);
      ctx.acted.delete(piece.id);
    }
    // 여왕 거푸집: 퀸이 처치할 때마다 태엽 +1 (턴당 두 번)
    if (killed && piece.type === 'Q' && part(s, side, 'queenMold')) {
      const n = Math.min(killed, PART_FX.queenApCap - ctx.queenAp);
      if (n > 0) {
        ctx.queenAp += n;
        gainAp(s, ctx, n);
      }
    }
  }
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

/** 이미 이번 계획에서 움직인 기물인가 (무한 궤도로 다시 움직일 수 있게 된 나이트는 아니다) */
export const actedInPlan = (plan: Plan, pieceId: number, s?: BattleState): boolean => {
  const n = plan.filter((st) => st.pieceId === pieceId).length;
  if (!n) return false;
  return !(s?.relaunch?.includes(pieceId) && n < 2);
};

/** 현재 계획에 이어 이 기물이 예약할 수 있는 칸. 이미 움직였거나 태엽이 모자라면 빈 배열 */
export const plannableMoves = (s: BattleState, plan: Plan, pieceId: number): Pos[] => {
  const check = checkPlan(s, plan);
  if (!check.ok || check.virtual.winner !== null || actedInPlan(plan, pieceId, check.virtual)) return [];
  const piece = findPiece(check.virtual, pieceId);
  if (!piece || piece.side !== s.turnSide) return [];
  return legalMoves(check.virtual, piece, buildGrid(check.virtual)).filter((to) => simulate(s, [...plan, { pieceId, to }]).ok);
};

export const addToPlan = (s: BattleState, plan: Plan, step: PlanStep): Plan | null => {
  const next = [...plan, step];
  return checkPlan(s, next).ok ? next : null;
};

/** 마지막 예약 되돌리기 */
export const undoLast = (plan: Plan): Plan => plan.slice(0, -1);

/** 이동 예약 (2.0에서는 계획 전부) */
export const moveSteps = (plan: Plan): PlannedMove[] => plan;
