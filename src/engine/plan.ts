import { CHAIN, LAST_STRIKE_MULT } from '../data/battle';
import { CARDS, type CardUse } from '../data/cards';
import { MORE, SYNERGY, TACTIC_ENCHANT, tier } from '../data/enchants';
import { BASE_AP, PIECE_STATS } from '../data/pieces';
import { CHAIN_KILLS, type TacticId } from '../data/tactics';
import { VARIANTS } from '../data/variants';
import { AFFIX } from '../data/legions';
import { TERRAIN_FX } from '../data/terrain';
import { at, buildGrid, chebyshev, cloneState, findPiece, forward, inBounds, kingOf, lastRank, samePos, terrainAt } from './board';
import { attackScan, damageOf, ench, isStrikeMove, legalMoves, moveTypes, onEdge, variantOn } from './rules';
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
  const extra = piece.variant && variantOn(piece, piece.variant) ? (VARIANTS[piece.variant].apDelta ?? 0) : 0;
  const oiled = (piece.affix === 'oiled' ? 1 : 0) + (types.length === 1 && types[0] === 'Q' && ench(s, piece.side, 'E38') >= 2 ? 1 : 0); // 기름칠한 관절 (접사) · 퀸 왕관 톱니 2단
  return Math.max(0, Math.max(...types.map((t) => PIECE_STATS[t].ap)) + extra - oiled);
};

/**
 * 정통 체스 승급: 폰이 상대 끝줄에 닿으면 퀸. HP 비율은 유지한다 (GDD 2장 §2.6).
 * 붕괴로 끝줄이 무너졌으면 남은 보드의 끝(바로 앞 칸이 보드 밖)이 끝줄이다.
 */
export const applyPromotion = (s: BattleState, piece: Piece): boolean => {
  if (piece.type !== 'P' || piece.fused) return false;
  if (piece.y !== lastRank(s, piece.side) && inBounds(s, piece.x, piece.y + forward(piece.side))) return false;
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
  /** 이번 턴 공격한 아군 나이트 수 (기병 편대 E13) */
  knightAttacks: number;
  /** 지금 실행 중인 순번 */
  order: number;
  /** 이번 턴 처치로 빈 적 칸과 그 순번 (돌파 키워드) */
  vacated: { pos: Pos; order: number }[];
  chainDone: boolean;
  /** 키워드 연계 개조의 턴당 1회 태엽 (갈래 톱날 · 돌파 쐐기) */
  tacticAp: Set<string>;
}

/** 전술 키워드를 기록한다 (D-094): 사건 + 진영별 횟수 */
const tally = (s: BattleState, ctx: TurnCtx, pieceId: number, tactic: TacticId): void => {
  const rec = (s.record ??= [{ tactics: {} }, { tactics: {} }])[ctx.side];
  rec.tactics[tactic] = (rec.tactics[tactic] ?? 0) + 1;
  ctx.events.push({ type: 'tactic', side: ctx.side, order: ctx.order, pieceId, tactic });
};

interface AttackMods {
  mult: number;
  pierce: number;
  knockback: boolean;
  /** 맞은 적의 상하좌우에 주는 부가 피해 비율 */
  splash: number;
  /** 이번 명령에서 이동한 칸 수 · 폭주였나 · 제자리 공격(받아치기)이었나 (D-105 개조) */
  dist?: number;
  strike?: boolean;
  stand?: boolean;
}

/** 파괴된 기물을 치우고 처치 효과·승패·각성을 처리한다 */
const resolveDeaths = (s: BattleState, ctx: TurnCtx, killer: Piece | undefined): number => {
  const dead = s.pieces.filter((p) => p.hp <= 0);
  if (!dead.length) return 0;
  for (const p of dead) ctx.removed.push({ ...p });
  s.pieces = s.pieces.filter((p) => p.hp > 0);
  // 정예 접사 (D-096): 같은 틀 — 붙어 있던 아군이 쓰러지면 ATK 상승 · 반동 스프링 — 쓰러뜨린 기물이 되받는다
  for (const d of dead) {
    for (const a of s.pieces) {
      if (a.side === d.side && a.affix === 'mold' && chebyshev(a, d) === 1) {
        a.atk = Math.round(a.atk * AFFIX.moldAtk);
        ctx.events.push({ type: 'affix', pieceId: a.id, affix: 'mold' });
      }
    }
    if (d.affix === 'recoil' && killer && killer.side !== d.side && findPiece(s, killer.id)) {
      const hit = applyDamage(s, killer, Math.max(1, Math.round(d.atk * AFFIX.recoilRatio)), true);
      ctx.events.push({ type: 'affix', pieceId: killer.id, affix: 'recoil', hit });
    }
  }
  if (s.stronghold && s.stronghold.holderId !== null && !findPiece(s, s.stronghold.holderId)) {
    s.stronghold.holderId = null;
    s.stronghold.hold = 0;
  }
  const enemyKills = dead.filter((p) => p.side !== ctx.side).length;
  ctx.kills += enemyKills;
  for (const p of dead) if (p.side !== ctx.side) ctx.vacated.push({ pos: { x: p.x, y: p.y }, order: ctx.order });
  if (killer && dead.some((p) => p.type === 'K' && p.side !== killer.side)) {
    const rec = (s.record ??= [{ tactics: {} }, { tactics: {} }])[killer.side];
    rec.finisher = killer.type;
  }
  if (killer && enemyKills) {
    const rec = (s.record ??= [{ tactics: {} }, { tactics: {} }])[killer.side];
    rec.kills = (rec.kills ?? 0) + enemyKills;
  }
  if (killer && killer.type === 'P' && enemyKills) {
    const rec = (s.record ??= [{ tactics: {} }, { tactics: {} }])[killer.side];
    rec.pawnKills = (rec.pawnKills ?? 0) + enemyKills;
  }
  if (killer && !ctx.chainDone && ctx.kills >= CHAIN_KILLS) {
    ctx.chainDone = true;
    tally(s, ctx, killer.id, 'chain');
  }

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
  // 반동으로 쓰러진 기물 정리 (쓰러뜨린 쪽 기물)
  if (s.pieces.some((p) => p.hp <= 0)) resolveDeaths(s, ctx, undefined);
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
  // 근위 볼트 (접사): 자기 킹과 붙어 있으면 받는 피해 감소
  if (t.affix === 'guardBolt') {
    const k = kingOf(s, t.side);
    if (k && k.id !== t.id && chebyshev(k, t) === 1) damage = Math.max(1, Math.round(damage * AFFIX.guardCut));
  }
  // 지형 (D-097): 방호판 −20% · 조명 칸 +20% (자석 장화 2단이면 내 방호판 −40%)
  const ground = terrainAt(s, t.x, t.y);
  if (ground === 'shelter') damage = Math.max(1, Math.round(damage * (ench(s, t.side, 'E37') >= 2 ? MORE.shelterCut : TERRAIN_FX.shelterCut)));
  else if (ground === 'lit') damage = Math.round(damage * TERRAIN_FX.litMult);
  // 방어 개조 (D-105): 킹 철모 · 폰 방패 대열 · 충격 흡수 스프링
  const e39 = ench(s, t.side, 'E39');
  if (t.type === 'K' && e39) damage = Math.max(1, Math.round(damage * tier(MORE.E39, e39)));
  else if (e39 >= 3) {
    const k = kingOf(s, t.side);
    if (k && chebyshev(k, t) === 1) damage = Math.max(1, Math.round(damage * MORE.guardCut));
  }
  const e40 = ench(s, t.side, 'E40');
  if (t.type === 'P' && e40) {
    const mates = s.pieces.filter((p) => p.side === t.side && p.type === 'P' && p.hp > 0 && p.y === t.y && Math.abs(p.x - t.x) === 1).length;
    if (mates) damage = Math.max(1, Math.round(damage * Math.max(0.5, 1 - mates * tier(MORE.E40, e40))));
  }
  const e29 = ench(s, t.side, 'E29');
  if (e29) damage = Math.min(damage, Math.max(1, Math.ceil(t.maxHp * tier(MORE.E29, e29))));
  const shieldAbsorbed = Math.min(t.shield, damage);
  t.shield -= shieldAbsorbed;
  t.hp = Math.max(0, t.hp - (damage - shieldAbsorbed));
  // 체크메이트 (D-022): 이번 턴 보호받는 킹은 HP 1에서 버틴다 — 다음 상대 턴에 맞으면 끝
  const checked = t.hp <= 0 && t.type === 'K' && checkGuarded(s, t);
  if (checked) t.hp = 1;
  // 최후의 리벳 (접사): 다른 일반 기물이 남아 있으면 HP 1에서 버틴다
  const held = !checked && t.hp <= 0 && t.affix === 'lastRivet' && s.pieces.some((p) => p.side === t.side && p.id !== t.id && p.type !== 'K' && p.hp > 0);
  if (held) t.hp = 1;
  // 비상 퓨즈 (D-105): 대국마다 처음 쓰러지는 아군 n기는 HP 1로 버틴다 (킹 제외)
  const e31 = ench(s, t.side, 'E31');
  const fuse = !checked && !held && t.hp <= 0 && t.type !== 'K' && e31 > 0 && (s.fuseUsed?.[t.side] ?? 0) < tier(MORE.E31, e31);
  if (fuse) {
    t.hp = 1;
    const used = (s.fuseUsed ??= [0, 0]);
    used[t.side] += 1;
  }
  return { targetId: t.id, damage, shieldAbsorbed, hpAfter: t.hp, killed: t.hp <= 0, ...(splash ? { splash } : {}), ...(checked ? { checked } : {}), ...(held ? { held } : {}), ...(fuse ? { fuse } : {}) };
};

const SLIDERS: PieceType[] = ['B', 'R', 'Q'];

/** 키워드 연계 개조의 공격 뒤 효과 (D-095): 태엽 · 방열판 · 주변 타격 */
const tacticAfter = (s: BattleState, ctx: TurnCtx, attacker: Piece, hits: HitResult[], got: { fork: boolean; breach: boolean; mult: number }): void => {
  const side = attacker.side;
  const lv = (id: 'E17' | 'E19' | 'E20') => ench(s, side, id);
  const apOnce = (key: string) => {
    if (ctx.tacticAp.has(key)) return;
    ctx.tacticAp.add(key);
    s.apBonus[side] += 1;
    ctx.events.push({ type: 'apGain', side, amount: 1 });
  };
  if (got.fork && lv('E17') >= 2) apOnce('fork');
  if (got.breach && lv('E19') >= 2) apOnce('breach');
  // 주변 8칸 적에게 이 공격의 50% (돌파 쐐기 ★ · 비상 경보 ★)
  const ring = (cx: number, cy: number) => {
    const out: HitResult[] = [];
    for (const n of s.pieces.filter((p) => p.side !== side && p.hp > 0 && chebyshev(p, { x: cx, y: cy }) === 1)) {
      out.push(applyDamage(s, n, Math.max(1, Math.floor(damageOf(s, attacker, n, got.mult) * TACTIC_ENCHANT.extraHit)), true));
    }
    if (out.length) ctx.events.push({ type: 'attack', order: ctx.order, attackerId: attacker.id, area: [], hits: out });
  };
  if (got.breach && lv('E19') >= 3) ring(attacker.x, attacker.y);
  const checked = hits.find((h) => h.checked);
  if (checked && lv('E20') >= 1) {
    attacker.shield += TACTIC_ENCHANT.checkShield;
    ctx.events.push({ type: 'shield', pieceId: attacker.id, amount: TACTIC_ENCHANT.checkShield });
  }
  if (checked && lv('E20') >= 3) {
    const k = findPiece(s, checked.targetId);
    if (k) ring(k.x, k.y);
  }
};

/** 내려앉은 칸의 지형 (D-097): 자석판은 붙잡고 사라지고, 나사 더미는 내 기물이 주우면 나사 · 적이 밟으면 흩어진다 */
const landOn = (s: BattleState, ctx: TurnCtx, piece: Piece): void => {
  const i = s.terrain?.findIndex((t) => t.x === piece.x && t.y === piece.y) ?? -1;
  if (i < 0) return;
  const tile = s.terrain![i];
  const pos = { x: tile.x, y: tile.y };
  if (tile.kind === 'magnet' && ench(s, piece.side, 'E37') >= 1) return; // 자석 장화: 안 붙잡힌다
  if (tile.kind === 'magnet') {
    piece.stuckTurn = s.turnNumber + 2;
    s.terrain!.splice(i, 1);
    ctx.events.push({ type: 'terrain', pieceId: piece.id, terrain: 'magnet', pos });
  } else if (tile.kind === 'screws') {
    s.terrain!.splice(i, 1);
    const gold = piece.side === 0 ? TERRAIN_FX.screwsGold : 0;
    if (gold) {
      const rec = (s.record ??= [{ tactics: {} }, { tactics: {} }])[0];
      rec.gold = (rec.gold ?? 0) + gold;
    }
    ctx.events.push({ type: 'terrain', pieceId: piece.id, terrain: 'screws', pos, ...(gold ? { gold } : {}) });
  }
};

/** 착지한 기물의 공격 한 번 (GDD 3장 §3.1). 파괴된 기물은 즉시 제거한다. 처치 수를 돌려준다. */
const performAttack = (s: BattleState, attacker: Piece, order: number, ctx: TurnCtx, mods: AttackMods): number => {
  const grid = buildGrid(s);
  const { targets, area, pierced } = attackScan(s, attacker, grid, { pierce: mods.pierce });
  let mult = mods.mult;

  // 발판 (지형): 여기서 치면 피해 +30% (자석 장화 ★: +60%)
  const under = terrainAt(s, attacker.x, attacker.y);
  if (under === 'platform') mult *= ench(s, attacker.side, 'E37') >= 3 ? MORE.platformMult : TERRAIN_FX.platformMult;
  // 볼륨 1 개조 (D-105): 공격하는 쪽 배율
  const lvM = (id: 'E21' | 'E22' | 'E23' | 'E24' | 'E27' | 'E38' | 'E43' | 'E44' | 'E45') => ench(s, attacker.side, id);
  if (under && lvM('E21')) mult *= tier(MORE.E21, lvM('E21'));
  if (mods.stand && lvM('E22')) mult *= tier(MORE.E22, lvM('E22'));
  if (ctx.order === 0 && lvM('E23')) mult *= tier(MORE.E23, lvM('E23'));
  if (ctx.order >= 2 && lvM('E24')) mult *= tier(MORE.E24, lvM('E24'));
  if (mods.dist && lvM('E27')) mult *= 1 + mods.dist * tier(MORE.E27, lvM('E27'));
  if (attacker.type === 'Q' && !attacker.fused && lvM('E38')) mult *= tier(MORE.E38, lvM('E38'));
  if (attacker.type === 'R' && !attacker.fused && (mods.dist ?? 0) >= 3 && lvM('E43')) mult *= tier(MORE.E43, lvM('E43'));
  if (mods.strike && lvM('E44')) mult *= tier(MORE.E44, lvM('E44'));
  if (attacker.fused && lvM('E45')) mult *= tier(MORE.E45, lvM('E45'));
  // 곱연산 시너지 (D-026): 같은 유형 수 · 앞선 공격 · 처치 연쇄에 비례
  const types = moveTypes(attacker);
  const lv = (id: 'E12' | 'E13' | 'E14' | 'E15') => ench(s, attacker.side, id);
  const own = (t: PieceType) => s.pieces.filter((p) => p.side === attacker.side && p.hp > 0 && p.type === t).length;
  if (lv('E12') && types.includes('P')) mult *= 1 + own('P') * SYNERGY.E12[lv('E12') - 1];
  if (lv('E13') && types.includes('N')) mult *= 1 + ctx.knightAttacks * SYNERGY.E13[lv('E13') - 1];
  if (lv('E14') && types.includes('B')) mult *= 1 + Math.max(0, own('B') - (attacker.type === 'B' ? 1 : 0)) * SYNERGY.E14[lv('E14') - 1];
  if (lv('E15') && ctx.kills > 0) mult *= SYNERGY.E15[lv('E15') - 1] ** ctx.kills;
  // 연쇄 보너스 (D-077): 이번 턴 앞 순번 처치 수만큼 (모두에게, 연쇄 처형 인챈트와 따로 곱)
  if (ctx.kills > 0) mult *= 1 + Math.min(ctx.kills, CHAIN.cap) * CHAIN.perKill;
  if (types.includes('N')) ctx.knightAttacks += 1;

  // 사선 개척: 이번 턴 비켜 준 아군 덕에 열린 사선으로 친다 (키워드 · 전술적 사선 개척 E09 보너스)
  const e09 = ench(s, attacker.side, 'E09');
  const opened =
    moveTypes(attacker).some((t) => SLIDERS.includes(t)) &&
    [...ctx.startPos.entries()].some(([id, pos]) => id !== attacker.id && ctx.acted.has(id) && area.some((a) => samePos(a, pos)) && !at(s, grid, pos.x, pos.y));
  if (e09 >= 1 && opened) mult *= e09 >= 2 ? 1.6 : 1.3;
  // 돌파: 앞 순번이 처치해 비운 칸에 내려앉아 친다
  const breach = ctx.vacated.some((v) => v.order < ctx.order && samePos(v.pos, attacker));
  // 키워드 연계 개조 (D-095): 공격 전에 알 수 있는 수에 배율
  const lvT = (id: 'E17' | 'E18' | 'E19' | 'E20') => ench(s, attacker.side, id);
  const live = targets.filter((t) => t.hp > 0);
  // 포크 (D-099): 둘 이상 — 폰만 둘은 아니다 (시뮬에서 대국당 3.7회로 너무 흔했다)
  const forking = live.length >= 2 && live.some((t) => t.type !== 'P');
  if (forking && lvT('E17') >= 1) mult *= 1 + live.length * TACTIC_ENCHANT.forkPerTarget;
  if (breach && lvT('E19') >= 1) mult *= TACTIC_ENCHANT.breachMult;

  const hits: HitResult[] = [];
  const counters: { by: number; hit: HitResult }[] = [];
  const primary = new Set(targets.map((t) => t.id));
  for (const t of targets) {
    if (t.hp <= 0) continue;
    let dmg = damageOf(s, attacker, t, mult);
    if (e09 >= 3 && (ctx.hitCount.get(t.id) ?? 0) >= 1) dmg *= 2;
    if (pierced.has(t.id) && lvT('E18') >= 2) dmg = Math.round(dmg * TACTIC_ENCHANT.pierceMult);
    if (t.type === 'K' && lvT('E20') >= 2) dmg = Math.round(dmg * TACTIC_ENCHANT.kingMult);
    // 볼륨 1 개조 (D-105): 대상에 따라 — 킹 사냥 · 처형 날 · 정밀 렌즈
    const e25 = ench(s, attacker.side, 'E25');
    if (t.type === 'K' && e25) dmg = Math.round(dmg * tier(MORE.E25, e25));
    const e26 = ench(s, attacker.side, 'E26');
    if (e26 && t.hp <= t.maxHp * MORE.woundedAt) dmg = Math.round(dmg * tier(MORE.E26, e26));
    if (e26 >= 3 && t.type !== 'K' && t.hp <= t.maxHp * MORE.executeAt) dmg = Math.max(dmg, t.hp + t.shield);
    const e42 = ench(s, attacker.side, 'E42');
    if (e42 && attacker.type === 'B' && !attacker.fused && chebyshev(attacker, t) >= 2) dmg = Math.round(dmg * tier(MORE.E42, e42));
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
    // 반격 톱니 (D-105): 맞은 쪽이 받은 피해 일부를 되돌린다
    const e30 = ench(s, victim.side, 'E30');
    if (e30 && hit.damage > 0 && victim.hp > 0 && attacker.hp > 0) counters.push({ by: victim.id, hit: applyDamage(s, attacker, Math.max(1, Math.round(hit.damage * tier(MORE.E30, e30))), true) });
    // 갈래 톱날 ★: 포크로 맞힌 적마다 한 번 더
    if (forking && lvT('E17') >= 3 && victim.hp > 0) hits.push(applyDamage(s, victim, Math.max(1, Math.floor(dmg * TACTIC_ENCHANT.extraHit)), true));

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
  ctx.events.push({ type: 'attack', order, attackerId: attacker.id, area, hits, ...(mult > 1.05 ? { mult: Math.round(mult * 100) / 100 } : {}) });
  // 반격 톱니: 맞은 기물이 공격자를 친다 (화면에는 맞은 쪽의 공격으로)
  for (const c of counters) ctx.events.push({ type: 'attack', order, attackerId: c.by, area: [], hits: [c.hit] });
  // 착지 충격판 (D-105): 나이트가 이동해 치면 내려앉은 칸 주변 적에게
  const e41 = ench(s, attacker.side, 'E41');
  if (e41 && attacker.type === 'N' && !attacker.fused && mods.dist && attacker.hp > 0) {
    const ring = s.pieces.filter((p) => p.side !== attacker.side && p.hp > 0 && chebyshev(p, attacker) === 1);
    const shock = ring.map((n) => applyDamage(s, n, Math.max(1, Math.floor(damageOf(s, attacker, n, mult) * tier(MORE.E41, e41))), true));
    if (shock.length) ctx.events.push({ type: 'attack', order, attackerId: attacker.id, area: [], hits: shock });
  }
  // 전술 키워드 (D-094): 피해 공식은 그대로, 이름만 붙인다
  const direct = hits.filter((h) => !h.splash);
  if (direct.length) {
    if (forking && new Set(direct.map((h) => h.targetId)).size >= 2) tally(s, ctx, attacker.id, 'fork');
    if (direct.some((h) => pierced.has(h.targetId))) tally(s, ctx, attacker.id, 'pierce');
    if (opened) tally(s, ctx, attacker.id, 'discover');
    if (breach) tally(s, ctx, attacker.id, 'breach');
  }
  if (hits.some((h) => h.checked)) tally(s, ctx, attacker.id, 'check');
  tacticAfter(s, ctx, attacker, hits, { fork: direct.length > 0 && forking, breach: direct.length > 0 && breach, mult });
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
/**
 * 폰 받아치기 (D-102): 대각선 공격 칸에 적이 있는 폰은 움직이지 않고 그 자리에서 친다 (태엽 1).
 * "움직인 기물만 공격"의 폰 예외 — 2칸 전진한 폰 옆으로 먼저 들어온 적을 받아칠 수 있게 (먼저 들어온 쪽이 무조건 지던 문제).
 */
export const pawnCounter = (s: BattleState, piece: Piece): boolean =>
  piece.type === 'P' && !piece.fused && !piece.formAs && attackScan(s, piece).targets.some((t) => t.hp > 0);

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
    knightAttacks: 0,
    order: 0,
    vacated: [],
    chainDone: false,
    tacticAp: new Set(),
  };
  let apUsed = 0;
  let prevKilled = false;
  /** 바로 앞 명령이 이동이었으면 그 기물의 유형 (컨베이어 폰) */
  let prevMoveType: PieceType | null = null;
  const fail = (reason: string): Simulation => ({ ok: false, reason, state: s, events: ctx.events, apUsed, removed: ctx.removed });
  const own = (id: number) => {
    const p = findPiece(s, id);
    return p && p.side === side ? p : undefined;
  };

  for (let order = 0; order < plan.length; order++) {
    const step = plan[order];
    ctx.order = order;
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
    let moveType: PieceType | null = null;
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
        // 컨베이어 폰 (이형): 바로 앞 명령도 폰 이동이면 태엽 0
        if (variantOn(piece, 'conveyor') && prevMoveType === 'P') cost = 0;
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
        moveType = piece.type;
        applyMove(s, piece, step.to);
        piece.movedTurn = s.turnNumber;
        updateHolder(s, piece);
        landOn(s, ctx, piece);
        ctx.events.push({ type: 'move', order, pieceId: piece.id, from, to: { ...step.to } });
        if (piece.type !== before) ctx.events.push({ type: 'promote', pieceId: piece.id, from: before, to: piece.type });
        mods.dist = chebyshev(from, step.to);
        if (strike) {
          mods.strike = true;
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
        if (cardId === 'A04' || variantOn(piece, 'hammer')) mods.knockback = true;
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
        if (!pawnCounter(s, piece) && (ench(s, side, 'E04') < 2 || !pawnBlocked(s, piece))) return fail('제자리 공격 불가');
        cost = ench(s, side, 'E04') >= 3 || ench(s, side, 'E22') >= 2 ? 0 : 1;
        if (apUsed + cost > availableAp(s)) return fail('AP 부족');
        mods.stand = true;
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
    prevMoveType = moveType;
    if (s.winner !== null) continue;

    // 퀸 왕관 톱니 ★ (D-105): 퀸이 이동해 치면 두 번
    if (ench(s, side, 'E38') >= 3 && mods.dist && piece.type === 'Q' && !piece.fused) repeats += 1;
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
    // 받침 스프링 ★ · 선봉 리벳 ★ (D-105): 처치하면 그 턴 태엽 +1 (턴당 1회)
    const apOnce = (key: string) => {
      if (ctx.tacticAp.has(key)) return;
      ctx.tacticAp.add(key);
      s.apBonus[side] += 1;
      ctx.events.push({ type: 'apGain', side, amount: 1 });
    };
    if (killed && mods.stand && ench(s, side, 'E22') >= 3) apOnce('counter');
    if (killed && order === 0 && ench(s, side, 'E23') >= 3) apOnce('first');
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
