import { PIECE_STATS } from '../data/pieces';
import { attackScan, buildGrid, chebyshev, cloneState, createBattle, damageOf, findPiece, forward, inBounds, kingOf, legalMoves, makePiece, samePos, simulate, type BattleEvent, type BattleState, type Piece, type PieceType, type Pos } from '../engine';
import { PART_NUM, type SlicePartId } from './parts';
import { CREW, QUIRKS, type Crew, type QuirkId } from './crew';
import { DIRECTOR } from './director';
import { Rng } from '../engine/rng';
import { baseOf, BOSS, BOSS_NUM, COMMANDS, LAB, PACE, PUSH, SLICE, TRAIT, type BossRule, type CommandId, type FoeTrait } from './cards';

/**
 * 수직 조각 대국 (분대 + 명령 덱, D-142). 화면과 무관한 순수 로직.
 * 내 차례: 손패 5장 · 태엽 3. 카드를 내면 바로 움직이고 친다 (연쇄 배수는 턴 안에서 이어진다).
 * 적 차례: 내 차례가 시작될 때 예고한 수(갈 칸 · 칠 칸)만 그대로 실행한다 — 예고는 거짓말을 하지 않는다.
 *   예고한 적이 쓰러졌으면 취소, 갈 칸이 막혔으면 취소, 칠 칸에서 비킨 기물은 맞지 않는다.
 */

/** 분대의 기물 하나: 유형 + 남은 HP (대국 사이에 이어진다) */
export type Squad = Crew;

/** 기벽을 반영한 최대 HP */
export const crewMaxHp = (u: { t: PieceType; quirk?: QuirkId }): number => Math.round(PIECE_STATS[u.t].hp * (u.quirk ? QUIRKS[u.quirk].hp ?? 1 : 1));

/** 이 대국에서 쓰러진 분대원 기록 (사망 의식 · 원부) */
export interface Fall {
  pieceId: number;
  by: string;
  turn: number;
  /** 쓰러뜨린 적 기물 (원수, D-178) */
  byType?: PieceType;
  byId?: number;
  /** 쓰러진 기물의 유형 · 카드를 이미 태웠는가 (D-198) */
  t?: PieceType;
  burned?: boolean;
}

/** 적의 예고 한 건 */
export interface Intent {
  pieceId: number;
  to: Pos;
}

export interface SliceBattle {
  s: BattleState;
  /**
   * 예고 읽기 보상 (D-229, 레퍼런스 보고서 제안 1 · 2 — Shogun Showdown · Into the Breach):
   * graze = 턴 시작에 적 예고 칸 위에 서 있던 내 기물 — 예고 밖으로 빠지며 치면 그 수 ×1.5 · 카드 +1 (기물마다 한 번)
   * aimed = 턴 시작에 내 기물을 겨눈 적 · staggered = 겨눴는데 빈 땅을 친 적(헛방) — 다음 적 차례에 못 움직이고 방열판을 잃는다
   */
  graze?: number[];
  /** 기어 쇼크 (D-229, 보고서 제안 4): 지난 적 차례에 예고 공격을 맞은 내 기물 — 이번 턴 그 기물의 공격 ×0.6 */
  shocked?: number[];
  /** 반장 2단계에 들어섰나 (D-243) */
  phase2?: boolean;
  /** 킹 호위 방열판 비율 (킹 최대 HP 대비, D-243) */
  guard?: number;
  /** 적 HP 배율 (층별 — 2단계 호위 폰에 쓴다) */
  foeHpK?: number;
  /** 기어 쇼크를 끈 대국 (D-233 — 승급 2부터 켜진다. 기본 난이도의 첫 판들은 패널티 없이 회피의 보상만) */
  noShock?: boolean;
  /** 순수 회피 (D-230, 보고서 2): 예고 칸에서 빈 칸으로 빠지기만 한 기물 — 이번 턴 다음 공격 ×1.4 */
  evaded?: number[];
  /** 경직 면역 (D-230): 방금 경직이 풀린 적은 한 차례 다시 경직되지 않는다 (무한 경직 방지) */
  stunImmune?: number[];
  grazeDanger?: string[];
  aimed?: number[];
  staggered?: number[];
  /** 탐욕의 저울: 모든 공격 합 (대국 시작에 쥔 나사로 정한다) */
  greedAdd?: number;
  draw: CommandId[];
  hand: CommandId[];
  discard: CommandId[];
  /** 이번 턴에 낸 카드 — 턴이 끝나야 버림 더미로 간다 (페르소나 테스트 B2: 0태엽 + 뽑기 카드가 같은 턴에 다시 섞여 끝없이 돌았다) */
  played?: CommandId[];
  /** 이 대국 적 공격 배율 (난이도 × 층별 성장, D-203) — 반장 규칙 · 특성 피해도 */
  atkK?: number;
  /** 쓰러진 분대원과 함께 탄 카드 (D-198) — 이번 대국에서만 빠진다 */
  burned?: CommandId[];
  ap: number;
  /** 이번 턴 처치 수 (연쇄) */
  kills: number;
  turn: number;
  intents: Intent[];
  /** 나사 트랙 */
  coins: number;
  /** 남은 되감기 (대국마다 한 번, 이중 테이프면 두 번) */
  rewinds: number;
  /** 방금 회피 반격한 기물 (화면 알림용) */
  grazedNow?: number;
  /** 이 대국의 공짜 되감기 (되감는 테이프) — 이것부터 쓰고 넘으면 역회전 톱니가 깨진다 */
  rewindFree?: number;
  /** 부품 (규칙을 깨는 유물, D-144) */
  parts: SlicePartId[];
  /** 이번 턴에 처치한 내 기물 (재도약) */
  killers: number[];
  /** 다듬은 카드 (태엽 −1) */
  refined: CommandId[];
  /** 이 대국에서 넘친 피해 합 (이기면 나사로) */
  overkill: number;
  /** 반장 판 (철갑 · 줄 폭격) */
  boss: boolean;
  /** 반장 규칙 (막마다) */
  bossRule: BossRule;
  /** 적 특성: 자폭 폰 */
  blastPawns: boolean;
  /** 이 대국의 적 특성 전부 (길게 누르기 설명용) */
  traits?: FoeTrait[];
  /** 다음 적 차례에 폭격할 줄 (y) — 예고 */
  bombRow: number | null;
  /** 묶인 적 — 핀 (D-281): 다음 적 차례에 못 움직인다 */
  pinned?: number[];
  /** 디스커버드 (D-281): 다음 공격 카드 한 장의 배율 */
  nextMult?: number;
  /** 검수 반장: 불량 도장이 찍힌 내 기물 (공격 ×0.5) */
  stampId?: number | null;
  /** 자석 반장: 이번 적 차례 끝에 끌려갈 내 기물과 칸 */
  pull?: { id: number; to: { x: number; y: number } } | null;
  /** 경보 반장: 경보 눈금 · 가득 찬 차례의 원래 공격 */
  alarm?: number;
  alarmAtk?: Record<number, number>;
  /** 턴마다 태엽 · 손패 (여분 태엽이면 +1 · −1) */
  apMax: number;
  handSize: number;
  /** 이번 턴 시작 모습 (되감기용) */
  snap: string;
  /** 분대 기물 id ↔ 분대 번호 */
  squadIds: number[];
  /** 입장 시 영구 분대 유형. 승격·임시 증원은 혼성 조건을 늘리지 않는다. */
  squadTypes?: Record<number, PieceType>;
  squadWins?: Record<number, number>;
  squadSerials?: Record<number, string>;
  /** FIFO 방열판 출처. by=null은 카드·자동 효과로 받은 판이다. */
  shieldSources?: Record<number, { by: number | null; left: number }[]>;
  protection?: Record<number, number>;
  /** 분대원 기벽 (기물 id → 기벽) */
  quirks: Record<number, QuirkId>;
  /** 이 대국 처치 수 (기물 id → 적 유형별) */
  pk: Record<number, Partial<Record<PieceType, number>>>;
  /** 이 대국에서 기물마다 실제로 줄인 적 HP (방열판·과잉 피해 제외) */
  pd?: Record<number, number>;
  /** 반장 킹을 쓰러뜨린 기물 */
  bossKiller: number | null;
  /** 이 대국에서 쓰러진 분대원 */
  falls: Fall[];
  /** 생명을 넘은 분대원 */
  doorUsed: number[];
  /** 턴에 한 번 효과 (풀린 브레이크) */
  once: string[];
  rng: number;
  /** 보이지 않는 손 (D-178): 적이 가장 아픈 수를 한 번 건너뛸 확률 — 화면에 드러내지 않는다 */
  mercy?: number;
  /** 원수가 선 적 기물 id (D-178) */
  nemesisId?: number;
  /** 근간 시험장 (D-177): 'A' 지금 규칙 + 환급 · 'B' 진짜 잡기 + 환급 */
  lab?: 'A' | 'B';
  /** 이번 턴 환급받은 태엽 */
  refunded?: number;
  /** 이번 턴에 더 얻은 태엽 · 더 뽑은 카드 (판 길이 제동 PACE) */
  apGained?: number;
  drawnExtra?: number;
  /** 자살 수 경고를 이미 보였나 (이번 턴) */
  warned: boolean;
}

const shuffle = <T>(rng: Rng, a: T[]): T[] => {
  const out = [...a];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

/** deal = 턴 시작 손패 (판 길이 제동의 뽑기 상한에 들지 않는다 — PACE.drawPerTurn) */
const drawCards = (b: SliceBattle, n: number, deal = false): void => {
  if (!deal && PACE.drawPerTurn) {
    n = Math.max(0, Math.min(n, PACE.drawPerTurn - (b.drawnExtra ?? 0)));
    b.drawnExtra = (b.drawnExtra ?? 0) + n;
  }
  const rng = new Rng(b.rng);
  for (let i = 0; i < n; i++) {
    if (!b.draw.length) {
      b.draw = shuffle(rng, b.discard);
      b.discard = [];
    }
    const c = b.draw.shift();
    if (c) b.hand.push(c);
  }
  b.rng = rng.state;
};

/** 연쇄 배수 (이번 턴 처치 수 기준) */
export const chainMult = (kills: number, parts: SlicePartId[] = []): number =>
  // 연쇄의 곱(×)은 폭주 코일이 있을 때만 (D-205) — 기본 연쇄는 합(+)이다 (chainAdd)
  parts.includes('coil') ? Math.min(PART_NUM.coilCap, Math.pow(PART_NUM.coilPerKill, kills)) : 1;

/** 연쇄의 합(+) (D-205): 이번 턴 처치마다 다음 공격 피해 +4 (전도 코일 +7), 상한 4처치. 코일이 있으면 곱으로 바뀌고 합은 없다 */
export const chainAdd = (kills: number, parts: SlicePartId[] = []): number =>
  parts.includes('coil') ? 0 : Math.min(kills, SLICE.chainCap) * (parts.includes('conductor') ? PART_NUM.conductorAdd : SLICE.chainAddPerKill);

/** 처치 k개가 올리는 연쇄 칸 (이중 톱니 · 연속 도약은 재발동 — 3단 성장의 셋째 단) */
const chainGain = (b: SliceBattle, k: number, perKill = 1): number => k * perKill * (has(b, 'echo') ? 2 : 1);

/** 넘친 피해 (적 HP를 넘어선 만큼) — 나사로 바꾼다 (Inscryption 오버킬) */
export const overkillOf = (before: BattleState, events: BattleEvent[]): number => {
  const hp = new Map(before.pieces.filter((p) => p.side === 1).map((p) => [p.id, p.hp]));
  let over = 0;
  for (const e of events) {
    if (e.type !== 'attack') continue;
    for (const h of e.hits) {
      const cur = hp.get(h.targetId);
      if (cur === undefined) continue;
      const through = h.damage - h.shieldAbsorbed;
      if (through > cur) over += through - cur;
      hp.set(h.targetId, Math.max(0, cur - through));
    }
  }
  return over;
};

const has = (b: SliceBattle, id: SlicePartId) => b.parts.includes(id);

/** 카드의 실제 태엽 (행진 북 · 재도약). pieceId를 주면 그 기물로 낼 때 */
export const costOf = (b: SliceBattle, i: number, pieceId?: number): number => {
  const c = COMMANDS[b.hand[i]];
  if (!c) return 99;
  if (c.freeIfKiller && pieceId !== undefined && b.killers.includes(pieceId)) return 0;
  const pawnCard = c.who === 'P' || c.kind === 'march';
  const knightCard = c.who === 'N';
  if (c.kind === 'swap' && has(b, 'gateHinge')) return 0;
  // 판 길이 제동 (D-449): 할인 부품은 턴마다 그 종류 첫 장에만 (등자로 나이트 카드가 모두 0태엽이 되어 턴이 끝나지 않았다)
  const off = (id: SlicePartId, on: boolean): number => (on && has(b, id) && !(PACE.discountOnce && b.once.includes(`off:${id}`)) ? 1 : 0);
  return Math.max(0, c.cost - off('drum', pawnCard) - off('spurs', knightCard) - off('lightCloak', c.who === 'Q'));
};

/** 킹 옆 빈 칸 (앞쪽부터) — 징집 · 조립 라인 */
const spawnPawn = (b: SliceBattle, label: string): BattleEvent | null => {
  const k = kingOf(b.s, 0);
  if (!k) return null;
  const f = forward(0);
  const cand: Pos[] = [];
  for (const dy of [f, 0, -f]) for (const dx of [0, -1, 1]) if (dx || dy) cand.push({ x: k.x + dx, y: k.y + dy });
  const spot = cand.find((q) => inBounds(b.s, q.x, q.y) && !b.s.pieces.some((p) => p.x === q.x && p.y === q.y));
  if (!spot) return null;
  const id = Math.max(...b.s.pieces.map((p) => p.id), ...b.squadIds, 0) + 1;
  b.s.pieces.push(makePiece(id, 'P', 0, spot.x, spot.y));
  return { type: 'respawn', pieceId: id, pos: spot, label };
};

export const newSliceBattle = (squad: Squad[], enemy: PieceType[], deck: CommandId[], seed: number, opts: { width?: number; height?: number; enemyKingHp?: number; parts?: SlicePartId[]; boss?: boolean; bossRule?: BossRule; /** 막별 적 특성 */ traits?: FoeTrait[]; /** 적 기물(킹 제외) HP 배율 — 막마다 */ enemyHp?: number; /** 다듬은 카드(작업대): 이 카드는 태엽 −1 */ refined?: CommandId[]; /** 손으로 만든 판: 기물을 이 칸으로 옮긴다 (유형 · 진영의 첫 기물) */ place?: { side: 0 | 1; t: PieceType; x: number; y: number }[]; /** 근간 시험장 (D-177) */ lab?: 'A' | 'B'; /** 보이지 않는 손 (D-178) */ mercy?: number; /** 원수 (D-178): 이 유형의 적 하나가 원수로 선다 */ nemesis?: { t: PieceType; rank: number }; /** 출하에서 몇 번째 대국인가 (층별 성장, D-203) */ depth?: number; /** 쥔 나사 (탐욕의 저울) */ gold?: number; /** 쓸 수 있는 역회전 톱니 (부적, D-228) */ rewindCharms?: number; /** 덱을 섞지 않고 적힌 순서대로 뽑는다 (입문 판 — 손패를 짜 둔다, D-232) */ ordered?: boolean; /** 기어 쇼크 (D-233: 승급 2부터 — false면 끈다) */ shock?: boolean; /** 킹 호위 방열판 비율 (D-243) */ guard?: number; /** 승급 9: 적 공격 배율 */ atkMul?: number; /** 승급 12: 가장 값진 적 하나가 정예 */ eliteOne?: boolean } = {}): SliceBattle => {
  const s = createBattle({ width: opts.width ?? 6, height: opts.height ?? 6, decks: [squad.map((u) => u.t), enemy], seed, rules: { collapseStart: null, collapseInterval: 1, checkmate: true, foresight: 1 } });
  // 분대 HP 이어 붙이기: 같은 유형 안에서 순서대로
  const used = new Set<number>();
  // 기록 유물 2차 (D-384): 분대 처치 1위 · 피해 1위 (0이면 없음, 같으면 앞사람)
  const topBy = (f: (u: Squad) => number): Squad | null => squad.reduce<Squad | null>((a, u) => (f(u) > (a ? f(a) : 0) ? u : a), null);
  const ace = topBy((u) => u.kills ?? 0);
  const heavy = topBy((u) => u.dmg ?? 0);
  const squadIds = squad.map((u) => {
    const p = s.pieces.find((q) => q.side === 0 && q.type === u.t && !used.has(q.id))!;
    used.add(p.id);
    // 기벽: 최대 HP · 방열판 · 공격 · 생명
    const q = u.quirk ? QUIRKS[u.quirk] : null;
    p.maxHp = crewMaxHp(u);
    p.hp = p.maxHp;
    if (q?.shield) p.shield += q.shield;
    if (q?.atk) p.atk = Math.round(p.atk * q.atk);
    // 기록 유물 (D-363): 누적 피해 · 처치 · 죽음 넘김이 대국 시작 때 힘이 된다
    const has0 = (id: SlicePartId) => (opts.parts ?? []).includes(id);
    if (has0('ledger')) p.atk += Math.min(PART_NUM.ledgerCap, Math.floor((u.dmg ?? 0) / PART_NUM.ledgerPer));
    if (has0('deathMark')) p.atk += Math.min(PART_NUM.deathMarkCap, PART_NUM.deathMarkAdd * (u.defied ?? 0));
    if (has0('veteran') && (u.kills ?? 0) >= PART_NUM.veteranAt) { p.atk += PART_NUM.veteranAtk; p.maxHp = Math.round(p.maxHp * PART_NUM.veteranHp); p.hp = p.maxHp; }
    if (has0('notches')) { p.maxHp += Math.min(PART_NUM.notchCap, PART_NUM.notchHp * (u.kills ?? 0)); p.hp = p.maxHp; }
    if (has0('cleanSheet') && (u.defied ?? 0) === 0 && (u.battles ?? 0) >= PART_NUM.cleanAt) { p.maxHp = Math.round(p.maxHp * PART_NUM.cleanHp); p.hp = p.maxHp; }
    if (has0('scarPlate')) p.shield += Math.min(PART_NUM.scarCap, PART_NUM.scarShield * (u.defied ?? 0));
    if (has0('sergeant')) p.atk += Math.min(PART_NUM.sergeantCap, Math.floor((u.battles ?? 0) / PART_NUM.sergeantPer));
    if (has0('heavyHand') && heavy === u) p.atk += PART_NUM.heavyAdd;
    if (has0('aceBadge') && ace === u) p.atk = Math.round(p.atk * PART_NUM.aceMult);
    if (u.hp !== undefined) p.hp = Math.max(1, Math.min(p.maxHp, u.hp));
    // 생명 (D-217): 기본 없음 — 기벽 + 그 분대원의 영구 생명 + 폰 전용 황금 부품 「작은 개척자의 맹세」
    const doors = (q?.doors ?? 0) + (u.doors ?? 0) + (p.type === 'P' && (opts.parts ?? []).includes('oath') ? 1 : 0);
    if (p.type !== 'K') for (let k = 0; k < doors; k++) (s.doorIds ??= []).push(p.id);
    return p.id;
  });
  const quirks: Record<number, QuirkId> = {};
  squad.forEach((u, i) => u.quirk && (quirks[squadIds[i]] = u.quirk));
  // 같은 유형이 여럿이면 적힌 순서대로 다음 기물 (D-232 — 입문 판의 폰 셋)
  const placed = new Set<number>();
  for (const q of opts.place ?? []) {
    const p = s.pieces.find((r) => r.side === q.side && r.type === q.t && !placed.has(r.id));
    if (!p) continue;
    placed.add(p.id);
    if (!s.pieces.some((r) => r.x === q.x && r.y === q.y)) Object.assign(p, { x: q.x, y: q.y });
  }
  if (opts.enemyHp && opts.enemyHp !== 1) for (const p of s.pieces) if (p.side === 1 && p.type !== 'K') p.maxHp = p.hp = Math.round(p.maxHp * opts.enemyHp);
  // 난이도 비율 (D-202): 모든 적 기물 HP(킹 제외 — 킹은 대국마다 따로) · 공격
  // 층별 성장 (D-203): 깊이(출하에서 몇 번째 대국인가)만큼 HP는 곱으로, 공격은 더하기로 — 킹 HP도 같은 곱
  const depth = opts.depth ?? 0;
  const hpK = SLICE.foeHp * (depth ? SLICE.foeHpStart * Math.pow(SLICE.foeHpGrow, depth) : 1);
  const atkK = SLICE.foeAtk * (1 + SLICE.foeAtkGrow * depth) * (opts.atkMul ?? 1);
  if (!opts.lab) for (const p of s.pieces) if (p.side === 1) {
    if (hpK !== 1) p.maxHp = p.hp = Math.max(1, Math.round(p.maxHp * hpK));
    if (atkK !== 1) p.atk = Math.max(1, Math.round(p.atk * atkK));
  }
  if (opts.eliteOne) {
    const e = s.pieces.filter((p) => p.side === 1 && p.type !== 'K').sort((x, y) => valueOf(y) - valueOf(x))[0];
    if (e) { e.elite = true; e.maxHp = e.hp = e.maxHp * 2; }
  }
  // 적 특성 넷 (D-275): 수치 하나씩
  const tr = opts.traits ?? [];
  for (const p of s.pieces) if (p.side === 1) {
    if (p.type === 'N' && tr.includes('knightShoe')) p.shield += TRAIT.knightShoe;
    if (p.type === 'B' && tr.includes('bishopLens')) p.atk = Math.round(p.atk * TRAIT.bishopLens);
    if (p.type === 'P' && tr.includes('pawnDrill')) p.atk = Math.round(p.atk * TRAIT.pawnDrill);
    if (p.type === 'Q' && tr.includes('queenCrown')) p.maxHp = p.hp = Math.round(p.maxHp * TRAIT.queenCrown);
  }
  if (opts.traits?.includes('rookPlate')) for (const p of s.pieces) if (p.side === 1 && p.type === 'R') p.shield += TRAIT.rookPlate;
  if (opts.enemyKingHp) {
    const k = kingOf(s, 1)!;
    k.maxHp = k.hp = Math.round(k.maxHp * opts.enemyKingHp);
  }
  const rng = new Rng(seed ^ 0x9e3779b9);
  const parts = opts.parts ?? [];
  const spare = (parts.includes('spare') ? 1 : 0) + (parts.includes('brittle') ? 1 : 0);
  const b: SliceBattle = { s, draw: opts.ordered ? [...deck] : shuffle(rng, deck), hand: [], discard: [], ap: SLICE.ap + spare, kills: 0, turn: 1, intents: [], coins: SLICE.coins, rewinds: (parts.includes('tape') ? 1 : 0) + (opts.rewindCharms ?? 0), rewindFree: parts.includes('tape') ? 1 : 0, parts, killers: [], refined: opts.refined ?? [], overkill: 0, boss: !!opts.boss, bossRule: opts.bossRule ?? 'plate', blastPawns: !!opts.traits?.includes('blastPawn'), traits: opts.traits ?? [], bombRow: null, apMax: SLICE.ap + spare, handSize: SLICE.hand - (parts.includes('spare') ? 1 : 0), snap: '', squadIds, quirks, pk: {}, pd: {}, bossKiller: null, falls: [], doorUsed: [], once: [], rng: rng.state, warned: false };
  b.squadTypes = Object.fromEntries(squadIds.map((id) => [id, findPiece(s, id)!.type]));
  b.squadWins = Object.fromEntries(squadIds.map((id, i) => [id, squad[i].wins ?? 0]));
  b.squadSerials = Object.fromEntries(squadIds.map((id, i) => [id, squad[i].serial ?? String(id).padStart(8, '0')]));
  // 시작 부품: 깨지는 유리 심장(분대 최대 HP −20%) · 탐욕의 저울(적 HP +20%) · 녹슨 홀(킹 방열판) · 막사의 종(폰 +1)
  if (has(b, 'brittle')) for (const p of s.pieces) if (p.side === 0) { p.maxHp = Math.round(p.maxHp * PART_NUM.brittleHp); p.hp = Math.min(p.hp, p.maxHp); }
  // 탐욕의 저울 (2026-11-05 개편): 쥔 나사 100마다 모든 공격 +3 (합) — 쌓이기만 하던 나사를 힘으로 (D-227)
  if (has(b, 'greed')) b.greedAdd = Math.floor((opts.gold ?? 0) / PART_NUM.greedPer) * PART_NUM.greedAdd;
  if (has(b, 'scepter')) { const k = kingOf(s, 0); if (k) k.shield += PART_NUM.scepterShield; }
  // 부품 확장 (D-282): 대국 시작에 붙는 것
  for (const p of s.pieces) if (p.side === 0) {
    if (p.type === 'R' && has(b, 'thickWall')) p.shield += PART_NUM.thickWall;
    if (p.type === 'N' && has(b, 'stirrup')) p.shield += PART_NUM.stirrup;
    if (p.type === 'P' && has(b, 'shieldWall')) p.shield += PART_NUM.shieldWall;
    if (p.type === 'R' && has(b, 'mortar')) { p.maxHp = Math.round(p.maxHp * PART_NUM.mortar); p.hp = Math.round(p.hp * PART_NUM.mortar); }
    if (p.type === 'K' && has(b, 'redLine')) p.hp = Math.max(1, Math.round(p.hp * (1 - PART_NUM.redLineCost)));
    if (p.type === 'P' && has(b, 'thickCast')) { p.maxHp = Math.round(p.maxHp * PART_NUM.thickCast); p.hp = Math.round(p.hp * PART_NUM.thickCast); }
  }
  if (has(b, 'firstSpring')) b.ap += PART_NUM.firstSpring;
  if (has(b, 'lightMag') && deck.length <= PART_NUM.lightMagAt) b.handSize += 1;
  if (has(b, 'barracks')) spawnPawn(b, '막사의 종 — 폰이 선다');
  if (opts.lab) {
    b.lab = opts.lab;
    // 손으로 둔 판: 같은 유형은 순서대로 그 칸에
    const used = new Set<number>();
    for (const [side, t, x, y] of LAB.layout) {
      const p = s.pieces.find((q) => q.side === side && q.type === t && !used.has(q.id));
      if (p) Object.assign(p, { x, y, moved: false });
      if (p) used.add(p.id);
    }
    b.refunded = 0;
    b.ap = b.apMax = LAB.ap;
    if (opts.lab === 'B') {
      // 진짜 잡기: 체력 · 방열판 · 생명 없음 — 잡히면 끝
      s.rules = { ...s.rules, capture: true, checkmate: false };
      for (const p of s.pieces) Object.assign(p, { hp: 1, maxHp: 1, shield: 0 });
      s.doorIds = [];
    }
  }
  if (opts.mercy) b.mercy = opts.mercy;
  if (opts.shock === false || has(b, 'coolant')) b.noShock = true;
  b.foeHpK = hpK;
  if (opts.guard) b.guard = opts.guard;
  guardUp(b);
  // 원수: 그 유형의 적 하나 (킹이 아니면 킹이 아닌 쪽부터) — 단계마다 HP +25%
  if (opts.nemesis) {
    const n = opts.nemesis;
    const p = s.pieces.find((q) => q.side === 1 && q.type === n.t);
    if (p) {
      p.maxHp = p.hp = Math.round(p.maxHp * (1 + n.rank * DIRECTOR.nemesisHp));
      b.nemesisId = p.id;
    }
  }
  b.atkK = atkK;
  drawCards(b, b.handSize + (has(b, 'stopwatch') ? PART_NUM.stopwatch : 0), true);
  bossTurnStart(b);
  b.intents = planFor(b);
  markTelegraph(b);
  b.snap = JSON.stringify(b);
  return b;
};

/** 출하 진행도 → 적 성장 깊이 (D-216 3): 막 ai(0~2)에서 frac(0~1)만큼 왔을 때 */
export const depthAt = (ai: number, frac: number): number => { const [d0, dl] = SLICE.depthActs[Math.min(ai, SLICE.depthActs.length - 1)]; return Math.round(d0 + dl * frac); };

/** 이 대국의 적 예고: 보이지 않는 손이 켜져 있으면 가끔 가장 아픈 수 하나를 건너뛴다 (예고 = 실행은 그대로) */
/** 반장 규칙 · 적 특성 피해에도 난이도 공격 배율을 곱한다 (D-202) */
export const foeDmg = (n: number, b?: { atkK?: number }): number => Math.max(1, Math.round(n * (b?.atkK ?? SLICE.foeAtk)));

const planFor = (b: SliceBattle): Intent[] => {
  if (!b.mercy) return planEnemy(b.s, false, b.turn, b.boss);
  const rng = new Rng(b.rng ^ 0x5eed);
  const skip = rng.next() < b.mercy;
  b.rng = (b.rng + 0x9e37) >>> 0;
  return planEnemy(b.s, skip, b.turn, b.boss);
};

// ---------- 적 예고 (단순한 AI — Into the Breach식: 수는 단순해도 다 보인다) ----------
const valueOf = (p: Piece) => (p.type === 'K' ? 300 : PIECE_STATS[p.type].value);

/**
 * 잡기 규칙(시험장 B)의 위협 칸: 이 진영이 다음 수에 잡으러 들어갈 수 있는 칸 전부 (폰은 대각 앞 두 칸).
 * 화면은 적의 이것을 붉은 칸으로 — 내 기물을 여기 두면 잡힐 수 있다 (체스 그대로).
 */
export const threatOf = (s0: BattleState, side: 0 | 1): Pos[] => {
  const s = { ...s0, turnSide: side };
  const grid = buildGrid(s);
  const out = new Map<string, Pos>();
  for (const p of s.pieces.filter((q) => q.side === side)) {
    if (p.type === 'P') {
      for (const dx of [-1, 1]) {
        const q = { x: p.x + dx, y: p.y + forward(side) };
        if (inBounds(s, q.x, q.y)) out.set(`${q.x},${q.y}`, q);
      }
      continue;
    }
    // 빈 칸 + 상대 기물 칸 (자기 편 칸은 빼고 — 지키기는 단순화)
    for (const q of legalMoves({ ...s, rules: { ...s.rules, capture: true } }, p, grid)) out.set(`${q.x},${q.y}`, q);
  }
  return [...out.values()];
};

/** 적 기물 하나의 가장 좋은 수 (내 기물을 가장 아프게 치는 칸, 칠 게 없으면 내 킹 쪽으로). 0점 이하면 null */
/**
 * 내 기물이 다음 차례에 칠 수 있는 칸 (움직인 뒤 공격 범위의 합). 적 AI가 맞을 자리를 꺼리는 데 쓴다 (D-201).
 */
export const playerReach = (s0: BattleState): Set<string> => {
  const s = { ...s0, turnSide: 0 as const };
  const grid = buildGrid(s);
  const out = new Set<string>();
  for (const p of s.pieces.filter((q) => q.side === 0)) {
    for (const to of [{ x: p.x, y: p.y }, ...legalMoves(s, p, grid)]) {
      for (const a of attackScan(s, { ...p, x: to.x, y: to.y }, grid).area) out.add(`${a.x},${a.y}`);
    }
  }
  return out;
};

/** 적 AI 선택 (D-201): reach = 내 기물이 칠 수 있는 칸 · boss = 반장 판(반장 킹도 1턴부터 나선다) */
export interface FoeOpts {
  reach?: Set<string>;
  boss?: boolean;
}

const bestFor = (s0: BattleState, p: Piece, taken: Set<string> = new Set(), turn = 0, o: FoeOpts = {}): { to: Pos; score: number } | null => {
  const s = { ...s0, turnSide: 1 as const };
  const grid = buildGrid(s);
  const myKing = kingOf(s, 0);
  let best: { to: Pos; score: number } | null = null;
  // 잡기 규칙(시험장 B): 내 기물이 선 칸에 들어가 잡는다. 잡을 게 없으면 다가가되, 내가 잡을 수 있는 칸은 꺼린다
  if (s.rules.capture) {
    const mine = threatOf(s, 0);
    for (const to of legalMoves(s, p, grid)) {
      if (taken.has(`${to.x},${to.y}`)) continue;
      const victim = s.pieces.find((q) => q.side === 0 && q.x === to.x && q.y === to.y);
      let score = victim ? valueOf(victim) + 20 : myKing && p.type !== 'K' ? (chebyshev(p, myKing) - chebyshev(to, myKing)) * 2 : 0;
      if (mine.some((m) => samePos(m, to))) score -= valueOf(p) * 0.5;
      if (!best || score > best.score) best = { to, score };
    }
    return best && best.score > 0 ? best : null;
  }
  for (const to of legalMoves(s, p, grid)) {
    if (taken.has(`${to.x},${to.y}`)) continue;
    const ghost = { ...p, x: to.x, y: to.y };
    let score = 0;
    for (const t of attackScan(s, ghost, grid).targets) {
      const dmg = damageOf(s, ghost, t);
      // 약한 기물을 노린다 (D-201): 남은 HP 대비 비율 — 거의 쓰러진 기물을 먼저 마무리한다
      score += dmg >= t.hp + t.shield ? valueOf(t) + dmg : (dmg / Math.max(1, t.hp + t.shield)) * valueOf(t) * SLICE.aiFinishWeight;
    }
    // 칠 게 없으면 내 킹에게 다가간다 (킹은 뒤에 남는다 — 단, 혼자 남았거나 판이 길어지면 킹도 나선다: 교착 압박 D-196 · 반장은 1턴부터 D-201)
    // 발악 (D-243, 사용자: 「지고 있으면 킹으로 발악해야지 — 동귀어진」): 호위가 거의 없거나 킹 HP가 절반 아래면 킹도 나선다
    const desperate = p.type === 'K' && (s.pieces.filter((q) => q.side === 1 && q.type !== 'K').length <= SLICE.desperate || p.hp < p.maxHp / 2);
    const kingMarch = p.type === 'K' && (o.boss || desperate || turn >= SLICE.kingMarchTurn);
    const approach = score === 0;
    // 다가가기 (D-214, 사용자: "1층 적이 아무것도 안 하는 게 부지기수"): 내 킹 또는 가장 가까운 내 기물 쪽으로 — 둘 중 더 줄어드는 쪽.
    // 거리가 줄지 않아도 내 진영 쪽으로 한 줄 나아가면 조금 쳐 준다 (나이트처럼 거리가 안 줄어 서 있던 기물)
    if (approach && myKing && (p.type !== 'K' || kingMarch)) {
      const near = (q: Pos) => Math.min(...s.pieces.filter((m) => m.side === 0).map((m) => chebyshev(q, m)));
      const gain = Math.max(chebyshev(p, myKing) - chebyshev(to, myKing), near(p) - near(to));
      score = gain * 2 + (to.y < p.y ? SLICE.aiAdvance : 0);
    }
    if (approach && p.type === 'K' && !kingMarch) continue;
    // 맞을 칸을 꺼린다 (D-201): 내 기물이 다음 차례에 칠 수 있는 칸이면 감점 — 공격이면 값의 일부, 다가가기면 같은 거리 중 안전한 칸을 고르게
    // 혼자 남은 킹은 겁내지 않는다 (D-214 — 맞을 칸 감점 −30 때문에 옆의 폰도 안 치고 매 턴 서 있었다)
    const alone = s.pieces.every((q) => q.side !== 1 || q.type === 'K');
    if (o.reach?.has(`${to.x},${to.y}`)) score -= approach ? SLICE.aiRiskStep : valueOf(p) * SLICE.aiRiskAttack + (p.type === 'K' && !alone && !desperate ? SLICE.aiRiskKing : 0);
    if (!best || score > best.score) best = { to, score };
  }
  return best && best.score > 0 ? best : null;
};

/** 적의 이번 수: 태엽 3 안에서, 내 기물을 가장 아프게 치는 칸부터. 칠 게 없으면 내 킹 쪽으로 */
export const planEnemy = (s0: BattleState, skipTop = false, turn = 0, boss = false): Intent[] => {
  const s = { ...s0, turnSide: 1 as const };
  const options: { pieceId: number; to: Pos; score: number; cost: number }[] = [];
  const o: FoeOpts = { reach: s.rules.capture ? undefined : playerReach(s), boss };
  for (const p of s.pieces.filter((q) => q.side === 1)) {
    const best = bestFor(s, p, undefined, turn, o);
    // 적도 플레이어와 같은 값표로 태엽을 쓴다 (D-202 — 예전엔 기물 고유 이동 값이라 적 퀸 4 > 태엽 3으로 영영 서 있었다)
    // 반장(적 킹)은 같은 태엽을 쓰되 먼저 고른다 (D-201 수정, 사용자: "매 턴 추가 행동은 사기 — 같은 자원을 공유하고 값을 높여라")
    if (best) options.push({ pieceId: p.id, to: best.to, score: boss && p.type === 'K' ? best.score * SLICE.bossPriority + SLICE.bossPriorityFlat : best.score, cost: SLICE.moveCost[p.type] });
  }
  options.sort((a, b) => b.score - a.score || a.pieceId - b.pieceId);
  if (skipTop && options.length > 1) options.shift();
  const out: Intent[] = [];
  let ap = SLICE.enemyAp;
  const taken = new Set<string>();
  for (const o of options) {
    if (o.cost > ap || taken.has(`${o.to.x},${o.to.y}`)) continue;
    ap -= o.cost;
    taken.add(`${o.to.x},${o.to.y}`);
    out.push({ pieceId: o.pieceId, to: o.to });
  }
  // 한 턴을 통째로 쉬지 않는다 (D-214): 겁나서 고른 게 없으면 위험을 무릅쓰고 가장 좋은 수 하나
  if (!out.length && o.reach) {
    const bold = s.pieces.filter((q) => q.side === 1).map((p) => ({ p, best: bestFor(s, p, undefined, turn, { boss }) })).filter((x) => x.best && SLICE.moveCost[x.p.type] <= SLICE.enemyAp).sort((x, y) => y.best!.score - x.best!.score)[0];
    if (bold) out.push({ pieceId: bold.p.id, to: bold.best!.to });
  }
  return out;
};

/** 지금 보드에서 예고가 칠 칸 (내 수로 막히면 바뀐다 — 화면은 늘 지금 기준) */
export const dangerSquares = (b: SliceBattle): Pos[] => {
  if (b.s.rules.capture) return threatOf(b.s, 1);
  const out = new Map<string, Pos>();
  if (b.bombRow !== null) for (let x = 0; x < b.s.width; x++) out.set(`${x},${b.bombRow}`, { x, y: b.bombRow });
  for (const it of liveIntents(b)) {
    const p = findPiece(b.s, it.pieceId)!;
    const ghostState = { ...b.s, pieces: b.s.pieces.filter((q) => q.id !== p.id) };
    for (const a of attackScan(ghostState, { ...p, x: it.to.x, y: it.to.y }).area) out.set(`${a.x},${a.y}`, a);
  }
  return [...out.values()];
};

/**
 * 지금 보드에서 적이 실제로 둘 수 (화면 예고 = 실행). 예고한 칸이 막혔으면 그 기물은 쉬지 않고
 * 지금 보드에서 다른 수를 고른다 (D-176 — 사용자: "차단했으면 다른 행동을 해야 하는데 그냥 쉰다").
 * 내가 피한 공격(칸은 열렸는데 칠 게 없음)은 그대로 헛친다 — 피하기는 보상이다.
 */
export const liveIntents = (b: SliceBattle): Intent[] => {
  // 잡기 규칙: 적은 늘 지금 보드를 보고 둔다 — 내 수마다 예고 화살표가 바로 바뀐다 (보이는 대로 일어난다)
  if (b.s.rules.capture) return planEnemy(b.s, false, b.turn);
  const s1 = { ...b.s, turnSide: 1 as const };
  const open = (it: Intent, p: Piece) => legalMoves(s1, p).some((q) => samePos(q, it.to));
  const keep = b.intents.filter((it) => {
    // 핀 (D-281): 묶인 적은 이번 적 차례에 움직이지 않는다 — 예고 화살표가 바로 사라진다
    if ((b.pinned ?? []).includes(it.pieceId)) return false;
    const p = findPiece(b.s, it.pieceId);
    return p && open(it, p);
  });
  const taken = new Set(keep.map((it) => `${it.to.x},${it.to.y}`));
  const out: Intent[] = [];
  for (const it of b.intents) {
    const p = findPiece(b.s, it.pieceId);
    if (!p || (b.pinned ?? []).includes(it.pieceId)) continue;
    if (open(it, p)) {
      out.push(it);
      continue;
    }
    // 실행(enemyPhase)과 같은 선택 기준 — 화면 예고 = 실행
    const alt = bestFor(b.s, p, taken, b.turn, { reach: playerReach(b.s), boss: b.boss });
    if (alt) {
      taken.add(`${alt.to.x},${alt.to.y}`);
      out.push({ pieceId: p.id, to: alt.to });
    }
  }
  // 대체 행동 (테스터: 「움직이려던 기물이 죽으면 아무것도 안 한다」): 계획한 기물이 쓰러져 남은 태엽으로
  // 아직 계획이 없는 적이 지금 보드에서 가장 좋은 수를 둔다 — 같은 기준(bestFor) · 같은 태엽 한도라 예고 = 실행 그대로
  let ap = SLICE.enemyAp - out.reduce((n, it) => n + SLICE.moveCost[findPiece(b.s, it.pieceId)!.type], 0);
  const lost = b.intents.some((it) => !findPiece(b.s, it.pieceId));
  if (lost && ap > 0) {
    const busy = new Set(out.map((it) => it.pieceId));
    const reach = playerReach(b.s);
    const spare = b.s.pieces
      .filter((q) => q.side === 1 && !busy.has(q.id) && !(b.pinned ?? []).includes(q.id) && !(b.staggered ?? []).includes(q.id))
      .map((q) => ({ q, best: bestFor(b.s, q, taken, b.turn, { reach, boss: b.boss }) }))
      .filter((x) => x.best)
      .sort((x, y) => y.best!.score - x.best!.score || x.q.id - y.q.id);
    for (const { q, best } of spare) {
      const cost = SLICE.moveCost[q.type];
      if (cost > ap || taken.has(`${best!.to.x},${best!.to.y}`)) continue;
      ap -= cost;
      taken.add(`${best!.to.x},${best!.to.y}`);
      out.push({ pieceId: q.id, to: best!.to });
    }
    // 한 턴을 통째로 쉬지 않는다 (planEnemy와 같은 D-214 규칙): 겁나서 고른 게 없으면 위험을 무릅쓰고 가장 좋은 수 하나
    if (!out.length) {
      const bold = b.s.pieces
        .filter((q) => q.side === 1 && SLICE.moveCost[q.type] <= SLICE.enemyAp && !(b.pinned ?? []).includes(q.id) && !(b.staggered ?? []).includes(q.id))
        .map((q) => ({ q, best: bestFor(b.s, q, taken, b.turn, { boss: b.boss }) }))
        .filter((x) => x.best)
        .sort((x, y) => y.best!.score - x.best!.score || x.q.id - y.q.id)[0];
      if (bold) out.push({ pieceId: bold.q.id, to: bold.best!.to });
    }
  }
  return out;
};

/** 예고대로 두면 맞을 내 기물 (화면 HP 깜빡임용) */
/**
 * 적 계획 목록 (D-207 — 화면 오른쪽 「적의 수」): 지금 턴을 끝내면 적이 둘 수를 순서대로 — 누가 · 누구를 · 얼마나.
 * 반장 규칙 · 특성(줄 폭격 · 자폭 · 되받아침)도 한 줄로. 실행과 같은 enemyPhase를 미리 돌려 본다.
 */
export const intentPlan = (b: SliceBattle): { by: PieceType | null; label?: string; hits: { t: PieceType; damage: number; killed: boolean }[] }[] => {
  const c = cloneBattle(b);
  const before = cloneState(c.s);
  const out: { by: PieceType | null; label?: string; hits: { t: PieceType; damage: number; killed: boolean }[] }[] = [];
  for (const e of enemyPhase(c).events) {
    if (e.type !== 'attack' && e.type !== 'blast') continue;
    const hits = e.hits.flatMap((h) => {
      const t = before.pieces.find((p) => p.id === h.targetId);
      return t && t.side === 0 ? [{ t: t.type, damage: h.damage, killed: h.killed }] : [];
    });
    if (!hits.length) continue;
    const by = e.type === 'attack' ? before.pieces.find((p) => p.id === e.attackerId)?.type ?? null : null;
    out.push({ by, label: e.type === 'blast' ? e.label : undefined, hits });
  }
  return out;
};

/** 적 의도 한 줄 (오른쪽 레일 목록, 패스 4 D-396 · UI-07 아이콘 여섯) */
export type IntentKind = 'attack' | 'approach' | 'guard' | 'blast' | 'shield' | 'rest';
export interface IntentRow {
  kind: IntentKind;
  /** 움직이는 적 (반장 규칙 · 폭발은 null) */
  pieceId: number | null;
  t: PieceType | null;
  /** 규칙 이름 (줄 폭격 · 자폭 등) */
  label?: string;
  /** 맞을 내 기물 (공격 · 폭발) */
  hits: { t: PieceType; damage: number; killed: boolean }[];
  /** 방열판 · 호위 양 */
  amount?: number;
}
/**
 * 적 의도 목록: 지금 턴을 끝내면 적이 할 일 — 실행과 같은 enemyPhase를 미리 돌린다(화면 = 실행).
 * 친다(attack) · 다가온다(approach, 치지 않고 움직이기만) · 폭발(blast, 규칙 · 특성) · 방열판(shield) · 호위(guard, 킹에 방열판) · 쉰다(rest, 기절 · 묶임).
 */
export const intentRows = (b: SliceBattle): IntentRow[] => {
  const c = cloneBattle(b);
  const before = cloneState(c.s);
  const pc = (id: number) => before.pieces.find((p) => p.id === id);
  const rows: IntentRow[] = [];
  const byPiece = new Map<number, IntentRow>();
  const mine = (hs: { targetId: number; damage: number; killed: boolean }[]) =>
    hs.flatMap((h) => {
      const t = pc(h.targetId);
      return t && t.side === 0 ? [{ t: t.type, damage: h.damage, killed: h.killed }] : [];
    });
  for (const e of enemyPhase(c).events) {
    if (e.type === 'attack') {
      const a = pc(e.attackerId);
      if (!a || a.side !== 1) continue;
      const hits = mine(e.hits);
      if (!hits.length) continue;
      const row = byPiece.get(a.id);
      if (row && (row.kind === 'attack' || row.kind === 'approach')) {
        row.kind = 'attack';
        row.hits.push(...hits);
      } else {
        const r: IntentRow = { kind: 'attack', pieceId: a.id, t: a.type, hits };
        byPiece.set(a.id, r);
        rows.push(r);
      }
    } else if (e.type === 'blast') {
      const hits = mine(e.hits);
      if (hits.length) rows.push({ kind: 'blast', pieceId: null, t: null, label: e.label, hits });
    } else if (e.type === 'move') {
      const a = pc(e.pieceId);
      if (!a || a.side !== 1 || byPiece.has(a.id)) continue;
      const r: IntentRow = { kind: 'approach', pieceId: a.id, t: a.type, hits: [] };
      byPiece.set(a.id, r);
      rows.push(r);
    } else if (e.type === 'shield') {
      const a = pc(e.pieceId);
      if (!a || a.side !== 1 || e.amount <= 0) continue;
      rows.push({ kind: a.type === 'K' ? 'guard' : 'shield', pieceId: a.id, t: a.type, hits: [], amount: e.amount });
    }
  }
  // 기절 · 묶임: 이번 적 차례에 움직이지 않는 적
  for (const id of [...(b.staggered ?? []), ...(b.pinned ?? [])]) {
    const p = findPiece(b.s, id);
    if (p && p.side === 1 && !byPiece.has(id) && !rows.some((r) => r.kind === 'rest' && r.pieceId === id)) rows.push({ kind: 'rest', pieceId: id, t: p.type, hits: [] });
  }
  return rows;
};

export const intentHits = (b: SliceBattle): { pieceId: number; pos: Pos; damage: number; killed: boolean }[] => {
  const after = enemyPhase(cloneBattle(b)).events;
  const dmg = new Map<number, { damage: number; killed: boolean }>();
  for (const e of after) {
    if (e.type !== 'attack' && e.type !== 'blast') continue;
    for (const h of e.hits) {
      const cur = dmg.get(h.targetId) ?? { damage: 0, killed: false };
      dmg.set(h.targetId, { damage: cur.damage + h.damage, killed: cur.killed || h.killed });
    }
  }
  return [...dmg.entries()].flatMap(([id, d]) => {
    const p = findPiece(b.s, id);
    return p && p.side === 0 ? [{ pieceId: id, pos: { x: p.x, y: p.y }, ...d }] : [];
  });
};

const cloneBattle = (b: SliceBattle): SliceBattle => JSON.parse(JSON.stringify(b)) as SliceBattle;

// ---------- 내 차례 ----------
/** 이 카드를 낼 수 있는 내 기물 */
export const cardPieces = (b: SliceBattle, i: number): Piece[] => {
  const c = COMMANDS[b.hand[i]];
  if (!c || b.s.winner !== null) return [];
  if (isInstant(b.hand[i])) return [];
  return b.s.pieces.filter((p) => p.side === 0 && (c.who === 'any' || c.who === p.type) && costOf(b, i, p.id) <= b.ap && (c.kind !== 'move' || legalMoves(b.s, p).length > 0) && !(c.who === 'any' && c.kind === 'move' && b.once.includes(`cmd:${p.id}`)));
};

/** 기물을 고르지 않고 바로 내는 카드 (재장전 · 불씨 · 행진 · 징집) */
export const isInstant = (id: CommandId): boolean => ['draw', 'spark', 'march', 'draft', 'gambit', 'spend', 'swap'].includes(COMMANDS[id].kind);

/** 캐슬링 (D-281): 내 킹과 가장 가까운 내 룩 */
const castlePair = (b: SliceBattle): [Piece, Piece] | null => {
  const k = kingOf(b.s, 0);
  const r = k && b.s.pieces.filter((p) => p.side === 0 && p.type === 'R').sort((x, y) => chebyshev(x, k) - chebyshev(y, k))[0];
  return k && r ? [k, r] : null;
};
/** 이 기물이 to에 내려앉으면 칠 수 있는 적 id (죔쇠 — 묶인 적을 치나) */
const targetsFrom = (s: BattleState, p: Piece, to: Pos): number[] => {
  const s2 = cloneState(s);
  const q = findPiece(s2, p.id)!;
  Object.assign(q, { x: to.x, y: to.y });
  return attackScan(s2, q).targets.filter((t) => t.side !== p.side).map((t) => t.id);
};
/** 포크 (D-281): 이 기물이 to에 내려앉으면 칠 수 있는 적 수 */
const forkTargets = (s: BattleState, p: Piece, to: Pos): number => {
  const s2 = cloneState(s);
  const q = findPiece(s2, p.id)!;
  Object.assign(q, { x: to.x, y: to.y });
  return attackScan(s2, q).targets.filter((t) => t.side !== p.side).length;
};

/** 이 카드를 지금 낼 수 있나 */
export const canPlay = (b: SliceBattle, i: number): boolean => {
  const c = COMMANDS[b.hand[i]];
  if (!c || b.s.winner !== null) return false;
  if (isInstant(b.hand[i])) return costOf(b, i) <= b.ap && (c.kind !== 'march' || marchPlan(b).length > 0) && (c.kind !== 'draft' || !!kingOf(b.s, 0)) && (c.kind !== 'gambit' || b.s.pieces.some((p) => p.side === 0 && p.type === 'P')) && (c.kind !== 'spend' || b.kills > 0) && (c.kind !== 'swap' || !!castlePair(b));
  return cardPieces(b, i).length > 0;
};

/** 행진: 폰마다 곧장 한 칸 앞 (앞의 폰부터, 막혔으면 제자리) */
const marchPlan = (b: SliceBattle, near?: Pos): { pieceId: number; to: Pos }[] => {
  const f = forward(0);
  const pawns = b.s.pieces.filter((p) => p.side === 0 && p.type === 'P' && (!near || chebyshev(p, near) === 1)).sort((x, y) => (x.y - y.y) * f * -1);
  return pawns.flatMap((p) => {
    const to = { x: p.x, y: p.y + f };
    return legalMoves(b.s, p).some((q) => samePos(q, to)) ? [{ pieceId: p.id, to }] : [];
  });
};


/** 이 수가 회피 반격인가: 턴 시작에 예고 칸 위에 있던 기물이 예고 밖 칸으로 (D-229) */
const grazeOn = (b: SliceBattle, pieceId: number, to?: Pos): boolean =>
  !!to && (b.graze ?? []).includes(pieceId) && !(b.grazeDanger ?? []).includes(`${to.x},${to.y}`);

/** 턴 시작 예고 기록 (D-229): 내 기물을 겨눈 적(헛방 판정) · 예고 칸 위의 내 기물(회피 반격 후보) */
const markTelegraph = (b: SliceBattle): void => {
  const danger = dangerSquares(b);
  b.grazeDanger = danger.map((d) => `${d.x},${d.y}`);
  b.graze = b.s.pieces.filter((p) => p.side === 0 && b.grazeDanger!.includes(`${p.x},${p.y}`)).map((p) => p.id);
  const c = cloneBattle(b);
  const before = cloneState(c.s);
  b.aimed = [...new Set(enemyPhase(c).events.flatMap((e) => (e.type === 'attack' && e.hits.some((h) => before.pieces.find((q) => q.id === h.targetId)?.side === 0) ? [e.attackerId] : [])))];
};

/** 수동 배치 시험의 첫 턴도 본편과 같은 예고·회피 계산을 사용한다. */
export const replanTelegraph = (b: SliceBattle): void => {
  b.intents = planFor(b);
  markTelegraph(b);
};

/** 이 카드 · 이 기물로 갈 수 있는 칸 */
export const cardMoves = (b: SliceBattle, i: number, pieceId: number): Pos[] => {
  const c = COMMANDS[b.hand[i]];
  const p = findPiece(b.s, pieceId);
  if (!c || c.kind !== 'move' || !p) return [];
  return legalMoves(b.s, p);
};

/** 출처별 방열판은 먼저 받은 것부터 소모한다. 자해·공성 소모는 보호 공적이 아니다. */
const consumePlate = (b: SliceBattle, id: number, amount: number, enemy: boolean): void => {
  const pool = b.shieldSources?.[id];
  if (!pool) return;
  for (const entry of pool) {
    const used = Math.min(entry.left, Math.max(0, amount));
    entry.left -= used; amount -= used;
    if (enemy && entry.by !== null && used) (b.protection ??= {})[entry.by] = (b.protection?.[entry.by] ?? 0) + used;
  }
  b.shieldSources![id] = pool.filter((entry) => entry.left > 0);
};
const syncPlate = (b: SliceBattle, p: Piece): void => {
  const pool = ((b.shieldSources ??= {})[p.id] ??= []);
  const known = pool.reduce((n, entry) => n + entry.left, 0);
  if (known > p.shield) consumePlate(b, p.id, known - p.shield, false);
  else if (known < p.shield) pool.push({ by: null, left: p.shield - known });
};
const plateEvents = (b: SliceBattle, before: BattleState, events: BattleEvent[], enemyBlast = false): void => {
  for (const e of events) {
    if (e.type !== 'attack' && e.type !== 'blast') continue;
    if (e.type === 'attack' && e.shieldSpent) consumePlate(b, e.attackerId, e.shieldSpent, false);
    const hostile = e.type === 'blast' ? enemyBlast : before.pieces.find((p) => p.id === e.attackerId)?.side === 1;
    for (const h of e.hits) if (before.pieces.find((p) => p.id === h.targetId)?.side === 0) consumePlate(b, h.targetId, h.shieldAbsorbed, hostile);
  }
};
const sharePlate = (b: SliceBattle, donor: Piece): BattleEvent[] => {
  if (!has(b, 'sharedPlate') || donor.type === 'K' || !b.squadIds.includes(donor.id)
    || (b.squadWins?.[donor.id] ?? 0) < PART_NUM.sharedWins || b.once.includes('sharedPlate')) return [];
  const target = b.s.pieces.filter((p) => p.id !== donor.id && p.side === 0 && p.hp > 0 && b.squadIds.includes(p.id)
    && Math.abs(p.x - donor.x) + Math.abs(p.y - donor.y) === 1)
    .sort((a, z) => a.hp / a.maxHp - z.hp / z.maxHp || (b.squadSerials?.[a.id] ?? String(a.id)).localeCompare(b.squadSerials?.[z.id] ?? String(z.id)))[0];
  if (!target) return [];
  syncPlate(b, target);
  target.shield += PART_NUM.sharedPlate;
  b.shieldSources![target.id].push({ by: donor.id, left: PART_NUM.sharedPlate });
  b.once.push('sharedPlate');
  return [{ type: 'shield', pieceId: target.id, amount: PART_NUM.sharedPlate }];
};

/** 두 선행 유형 뒤에 오는 세 번째 영구 유형의 첫 직접 타격. */
const sealReady = (b: SliceBattle, id: number): boolean => {
  const type = b.squadTypes?.[id];
  return has(b, 'relaySeal') && !!type && b.squadIds.includes(id) && !b.once.includes('relaySeal')
    && !b.once.includes(`relayType:${type}`) && b.once.filter((k) => k.startsWith('relayType:')).length >= 2;
};

/** 카드 한 장을 미리 실행해 본다 (화면 미리보기 · 실제 실행이 같은 식) */
export const previewPlay = (b: SliceBattle, i: number, pieceId: number, to?: Pos) => {
  const c = COMMANDS[b.hand[i]];
  const s = cloneState(b.s);
  const p = findPiece(s, pieceId);
  if (!c || !p) return null;
  if (c.kind === 'move' && to) {
    if (c.carve) p.carve = c.carve;
    const rage = c.rage ? Math.min(3, 1 + (2 * (p.maxHp - p.hp)) / p.maxHp) : 1;
    const crown = (p.type === 'K' && has(b, 'crown') ? PART_NUM.crownMult : 1) * (p.type === 'N' && has(b, 'lance') ? PART_NUM.lanceMult : 1) * (p.type === 'P' && has(b, 'banner') ? PART_NUM.bannerMult : 1) * (p.type === 'R' && has(b, 'rookBolt') ? PART_NUM.rookBoltMult : 1) * (p.type === 'B' && has(b, 'bishopLens') ? PART_NUM.lensMult : 1) * (has(b, 'bloodPact') ? PART_NUM.bloodMult : 1) * (has(b, 'lastBreath') && p.side === 0 && (b.s.doorIds ?? []).filter((x) => x === p.id).length === 1 ? PART_NUM.lastBreath : 1);
    const perKill = (c.multPerKill ? 1 + b.kills * c.multPerKill : 1) * (c.fork && forkTargets(b.s, p, to) >= 2 ? c.fork + (has(b, 'mirror') ? PART_NUM.mirror : 0) : 1) * (b.nextMult ?? 1)
      // 부품 확장 (D-282)
      * (has(b, 'vise') && (b.pinned ?? []).length && targetsFrom(b.s, p, to).some((id) => (b.pinned ?? []).includes(id)) ? PART_NUM.vise : 1)
      * (p.type === 'Q' && has(b, 'queenCrown') ? PART_NUM.queenCrown : 1)
      * (p.type === 'K' && has(b, 'lastAxle') && p.hp < p.maxHp * PART_NUM.lastAxleAt ? PART_NUM.lastAxle : 1)
      * (grazeOn(b, pieceId, to) && has(b, 'ventHole') ? PART_NUM.ventGraze / SLICE.grazeMult : 1)
      * (b.boss && has(b, 'bossBane') ? PART_NUM.bossBane : 1);
    const graze = (grazeOn(b, pieceId, to) ? SLICE.grazeMult : 1) * ((b.shocked ?? []).includes(pieceId) ? SLICE.shockMult : 1) * ((b.evaded ?? []).includes(pieceId) ? SLICE.evadeMult : 1) * (b.stampId === pieceId ? BOSS_NUM.stampMult : 1);
    const shieldStrike = p.type === 'R' && c.who === 'R' && COMMANDS[baseOf(b.hand[i])].cost >= 2 && has(b, 'siegeLatch') && !b.once.includes(`siegeLatch:${pieceId}`) ? PART_NUM.siegeLatch : 0;
    const sim = simulate(s, [{ pieceId, to }], { freeAp: true, shieldStrike, firstMult: sealReady(b, pieceId) ? PART_NUM.relaySeal : 1, mult: (c.mult ?? 1) * chainMult(b.kills, b.parts) * rage * crown * perKill * graze, add: (c.add ?? 0) + chainAdd(b.kills, b.parts) + (has(b, 'whetstone') ? PART_NUM.whetAdd : 0) + (p.type === 'P' && has(b, 'pawnPike') ? PART_NUM.pikeAdd : 0) + (p.type === 'P' && has(b, 'oath') ? PART_NUM.oathAdd : 0) + (b.greedAdd ?? 0)
      // 부품 확장 2차 (D-287)
      + (p.type === 'N' && has(b, 'jumpSpring') ? PART_NUM.jumpSpring : 0) + (p.type === 'B' && has(b, 'stainedGlass') ? PART_NUM.stainedGlass : 0) + (has(b, 'redLine') ? PART_NUM.redLine : 0)
      + (has(b, 'calipers') && targetsFrom(b.s, p, to).includes(kingOf(b.s, 1)?.id ?? -1) ? PART_NUM.calipers : 0) });
    if (!sim.ok) return null;
    if (c.push) applyPush(b, sim, pieceId);
    // 카드 각인은 이번 공격에만
    const after = findPiece(sim.state, pieceId);
    const orig = findPiece(b.s, pieceId);
    if (after) after.carve = orig?.carve;
    return sim;
  }
  return null;
};

/**
 * 카드를 낸다. 움직이는 카드는 pieceId · to, 방열판 · 땜질은 pieceId, 재장전은 없이.
 * 실행 사건을 돌려준다 (화면 연출용). 못 내면 이유 문자열.
 */
export const playCard = (b: SliceBattle, i: number, pieceId?: number, to?: Pos): { events: BattleEvent[]; before: BattleState } | string => {
  const id = b.hand[i];
  const c = COMMANDS[id];
  if (!c) return '없는 카드입니다.';
  const cost = costOf(b, i, pieceId);
  if (cost > b.ap) return '‘태엽이 모자라.’';
  const before = cloneState(b.s);
  // 이전 저장은 대국 시작 상태만 저장하므로 현재 영구 분대에서 안전하게 이관한다.
  b.squadTypes ??= Object.fromEntries(before.pieces.filter((p) => b.squadIds.includes(p.id)).map((p) => [p.id, p.type]));
  let events: BattleEvent[] = [];
  let gained = 0;
  if (c.kind === 'move') {
    if (pieceId === undefined || !to) return '기물과 칸을 선택하십시오.';
    const p = findPiece(b.s, pieceId);
    if (!p || p.side !== 0 || (c.who !== 'any' && c.who !== p.type)) return '이 카드로 움직일 수 없는 기물입니다.';
    // 지배 전략 정리 (D-201, K교수): 아무 기물 카드(지휘 등)로는 한 기물을 한 턴에 한 번만 — 센 기물 하나를 지휘로 거듭 굴리지 못하게
    if (c.who === 'any' && b.once.includes(`cmd:${p.id}`)) return '이번 턴에 이미 지휘한 기물입니다.';
    const grazed = grazeOn(b, pieceId, to);
    const sim = previewPlay(b, i, pieceId, to);
    if (!sim) return '갈 수 없는 칸입니다.';
    if (c.who === 'any') b.once.push(`cmd:${p.id}`);
    if (sim.events.some((e) => e.type === 'attack' && e.shieldSpent)) b.once.push(`siegeLatch:${pieceId}`);
    b.s = sim.state;
    // 순수 회피 보너스는 그 기물의 다음 공격 한 번에 쓰이고 사라진다
    const struck = sim.events.some((e) => (e.type === 'attack' || e.type === 'blast') && e.hits.some((h) => before.pieces.find((q) => q.id === h.targetId)?.side === 1 && h.damage > 0));
    if (struck) b.evaded = (b.evaded ?? []).filter((x) => x !== pieceId);
    // 수읽기 (D-281): 디스커버드 배율은 공격 한 번에 쓰이고 이 카드가 디스커버드면 다음 공격에 남긴다 · 핀은 친 적을 묶는다
    if (sealReady(b, pieceId) && sim.events.some((e) => e.type === 'attack' && e.attackerId === pieceId && e.hits.some((h) => !h.splash && h.damage > 0))) b.once.push('relaySeal');
    if (struck) b.nextMult = undefined;
    if (c.nextMult) b.nextMult = c.nextMult + (has(b, 'openGate') ? PART_NUM.openGate : 0);
    if (c.fork && has(b, 'forkGear') && forkTargets(before, p, to) >= 2) { gained += PART_NUM.forkGearAp; events.push({ type: 'apGain', side: 0, amount: PART_NUM.forkGearAp }); }
    if ((c.axis === 'tactic' || c.axis2 === 'tactic') && has(b, 'gameRecord') && !b.once.includes('gameRecord')) { b.once.push('gameRecord'); drawCards(b, 1); }
    if (c.stun) {
      const ids = sim.events.flatMap((e) => (e.type === 'attack' || e.type === 'blast' ? e.hits.filter((h) => !h.killed && before.pieces.find((q) => q.id === h.targetId)?.side === 1 && before.pieces.find((q) => q.id === h.targetId)?.type !== 'K').map((h) => h.targetId) : []));
      b.pinned = [...new Set([...(b.pinned ?? []), ...ids])];
      for (const id of ids) { const q = findPiece(b.s, id); if (q) q.shield = 0; }
      if (ids.length && has(b, 'pinNeedle') && !b.once.includes('pinNeedle')) { b.once.push('pinNeedle'); gained += 1; events.push({ type: 'apGain', side: 0, amount: 1 }); }
      if (ids.length && has(b, 'chainReel')) { const me = findPiece(b.s, pieceId); if (me) { me.shield += PART_NUM.chainReel; events.push({ type: 'shield', pieceId: me.id, amount: PART_NUM.chainReel }); } }
    }
    if (grazed) {
      // 회피 반격 (D-229): 예고 칸에서 빠져나온 수 — 배율은 위에서, 여기선 카드 +1 · 그 기물은 이번 턴 다시 못 받는다
      b.graze = (b.graze ?? []).filter((x) => x !== pieceId);
      drawCards(b, SLICE.grazeDraw);
      b.grazedNow = pieceId;
      // 순수 회피 (D-230): 아무도 못 치고 빈 칸으로 빠지기만 했으면 다음 공격 ×1.4로 남긴다 (회피 턴이 손해가 되지 않게)
      if (!struck) b.evaded = [...(b.evaded ?? []), pieceId];
    }
    events = [...sim.events, ...events];
    b.overkill += overkillOf(before, sim.events);
    let k = sim.removed.filter((q) => q.side === 1).length;
    b.kills += chainGain(b, k, c.chainPerKill);
    // 연쇄 사슬: 충돌로 쓰러뜨린 적마다 연쇄 +1
    if (has(b, 'chainShot')) b.kills += PART_NUM.chainShotGain * sim.events.filter((e) => e.type === 'blast').reduce((a, e) => a + (e.type === 'blast' ? e.hits.filter((h) => h.killed && before.pieces.find((q) => q.id === h.targetId)?.side === 1).length : 0), 0);
    // 반동 용수철 (D-287): 충돌로 쓰러뜨리면 태엽 +1 (턴에 한 번)
    if (has(b, 'recoilSpring') && !b.once.includes('recoilSpring') && sim.events.some((e) => e.type === 'blast' && e.hits.some((h) => h.killed && before.pieces.find((q) => q.id === h.targetId)?.side === 1))) { b.once.push('recoilSpring'); gained += 1; }
    // 둘레의 폰이 따라 전진한다 (기마 돌격 · 근위대)
    const landed = findPiece(b.s, pieceId);
    if (c.rally && landed && b.s.winner === null) {
      const plan = marchPlan(b, landed);
      const mid = cloneState(b.s);
      const s2 = plan.length ? simulate(b.s, plan, { freeAp: true, mult: chainMult(b.kills, b.parts), add: chainAdd(b.kills, b.parts) }) : null;
      if (s2 && s2.ok) {
        b.s = s2.state;
        events = [...events, ...s2.events];
        b.overkill += overkillOf(mid, s2.events);
        const k2 = s2.removed.filter((q) => q.side === 1).length;
        b.kills += chainGain(b, k2);
        k += k2;
      }
    }
    // 처치 환급 (D-203, 시험장 D-177에서 본편으로): 처치마다 태엽 +1, 턴당 상한까지 — 쌓인 연쇄를 실제로 쓸 수를 번다
    if (k > 0) {
      const g = Math.min(k, (b.lab ? LAB.refundCap : SLICE.refundCap) - (b.refunded ?? 0));
      if (g > 0) {
        b.refunded = (b.refunded ?? 0) + g;
        gained += g;
        events.push({ type: 'apGain', side: 0, amount: g });
      }
    }
    if (k > 0) {
      if (!b.killers.includes(pieceId)) b.killers.push(pieceId);
      // 편자: 나이트가 처치하면 태엽 +1 (처치마다)
      if (p.type === 'N' && has(b, 'horseshoe')) {
        gained += k;
        events.push({ type: 'apGain', side: 0, amount: k });
      }
      drawCards(b, (has(b, 'magnet') ? k : 0) + (c.drawOnKill ? c.drawOnKill * k : 0) + (p.type === 'B' && has(b, 'rosary') ? k : 0) + (p.type === 'K' && has(b, 'royalSeal') ? PART_NUM.royalSeal : 0));
      // 부품 확장 2차 (D-287): 기물별 처치 받침
      const once1 = (id: string): boolean => (b.once.includes(id) ? false : (b.once.push(id), true));
      if ((p.type === 'P' && has(b, 'whistle') && once1('whistle')) || (p.type === 'Q' && has(b, 'queenFan') && once1('queenFan'))) { gained += 1; events.push({ type: 'apGain', side: 0, amount: 1 }); }
      const me = findPiece(b.s, pieceId);
      const sh = me ? (me.type === 'N' && has(b, 'saddle') ? PART_NUM.saddle : 0) + (me.type === 'R' && has(b, 'rampart') ? PART_NUM.rampart : 0) : 0;
      if (me && sh) { me.shield += sh; events.push({ type: 'shield', pieceId: me.id, amount: sh }); }
    }
    // 금박 끝 줄 (D-282): 폰이 승격하면 카드 +2 · 태엽 +1
    if (has(b, 'goldRank') && events.some((e) => e.type === 'promote')) { drawCards(b, 2); gained += 1; events.push({ type: 'apGain', side: 0, amount: 1 }); }
    // 이동식 옥좌: 킹 카드를 내면 킹 방열판
    const pk = findPiece(b.s, pieceId);
    if (pk && pk.type === 'K' && has(b, 'throne')) {
      pk.shield += PART_NUM.throneShield;
      events.push({ type: 'shield', pieceId: pk.id, amount: PART_NUM.throneShield });
    }
  } else if (c.kind === 'march') {
    const plan = marchPlan(b);
    if (!plan.length) return '‘앞으로 갈 폰이 없어.’';
    const sim = simulate(b.s, plan, { freeAp: true, mult: (c.mult ?? 1) * chainMult(b.kills, b.parts), add: (c.add ?? 0) + chainAdd(b.kills, b.parts) });
    if (!sim.ok) return '‘앞으로 갈 폰이 없어.’';
    b.s = sim.state;
    events = sim.events;
    b.overkill += overkillOf(before, sim.events);
    b.kills += chainGain(b, sim.removed.filter((q) => q.side === 1).length);
    if (has(b, 'magnet')) drawCards(b, sim.removed.filter((q) => q.side === 1).length);
  } else if (c.kind === 'draft') {
    const e = spawnPawn(b, '땜질 보충병 — 폰이 선다');
    if (!e) return '킹 곁에 빈 칸이 없습니다.';
    events = [e];
  } else if (c.kind === 'gambit') {
    // 희생 수: 이번 대국만 선 폰(징집 · 조립 라인)부터, 그다음 HP가 낮은 폰
    const pawns = b.s.pieces.filter((p) => p.side === 0 && p.type === 'P').sort((x, y) => Number(b.squadIds.includes(x.id)) - Number(b.squadIds.includes(y.id)) || x.hp - y.hp);
    const v = pawns[0];
    if (!v) return '바칠 폰이 없습니다.';
    b.s.pieces = b.s.pieces.filter((p) => p.id !== v.id);
    events = [{ type: 'attack', order: 0, attackerId: v.id, area: [{ x: v.x, y: v.y }], hits: [{ targetId: v.id, damage: v.hp, shieldAbsorbed: 0, hpAfter: 0, killed: true }] }];
    b.kills += SLICE.gambitChain;
    drawCards(b, SLICE.gambitDraw);
    gained += 1;
  } else if (c.kind === 'swap') {
    // 캐슬링 (D-281): 킹과 가장 가까운 룩이 자리를 바꾸고 둘 다 방열판
    const pr = castlePair(b);
    if (!pr) return '킹과 룩이 모두 있어야 합니다.';
    const [k, r] = pr;
    const kp = { x: k.x, y: k.y };
    events = [{ type: 'move', order: 0, pieceId: k.id, from: kp, to: { x: r.x, y: r.y } }, { type: 'move', order: 1, pieceId: r.id, from: { x: r.x, y: r.y }, to: kp }];
    Object.assign(k, { x: r.x, y: r.y });
    Object.assign(r, kp);
    const sh = (c.amount ?? 0) * (has(b, 'gateHinge') ? 2 : 1);
    for (const p of [k, r]) { p.shield += sh; events.push({ type: 'shield', pieceId: p.id, amount: sh }); }
  } else if (c.kind === 'spark') {
    b.kills += 1;
    drawCards(b, 1);
  } else if (c.kind === 'shield' || c.kind === 'repair') {
    const p = pieceId !== undefined ? findPiece(b.s, pieceId) : undefined;
    if (!p || p.side !== 0) return '내 기물을 선택하십시오.';
    if (c.kind === 'shield') {
      p.shield += c.amount ?? 0;
      events = [{ type: 'shield', pieceId: p.id, amount: c.amount ?? 0 }];
      syncPlate(b, p);
      if ((c.amount ?? 0) > 0) events.push(...sharePlate(b, p));
    } else {
      const heal = Math.min(p.maxHp - p.hp, c.amount ?? 0);
      p.hp += heal;
      events = [{ type: 'heal', pieceId: p.id, amount: heal }];
    }
  } else if (c.kind === 'draw') {
    drawCards(b, c.amount ?? 0);
    gained += c.ap ?? 0;
  } else if (c.kind === 'spend') {
    // 연쇄 소모 (D-203): 쌓인 연쇄를 모두 비우고 그만큼 — 배율을 다음 공격 말고 다른 데에 쓴다
    const n = b.kills;
    if (n <= 0) return '‘쌓인 연쇄가 없어.’';
    b.kills = 0;
    b.killers = [];
    if (c.spend === 'shield') {
      const k = kingOf(b.s, 0);
      if (k) {
        k.shield += n * (c.amount ?? 0);
        events = [{ type: 'shield', pieceId: k.id, amount: n * (c.amount ?? 0) }];
      }
    } else if (c.spend === 'ap') {
      // 회수 (D-227 개편): 쌓인 연쇄를 태엽으로 — 카드 뽑기는 태엽이 모자라면 쓸모가 없었다
      gained += Math.min(SLICE.recallMax, n * (c.amount ?? 1));
    } else if (c.spend === 'draw') {
      drawCards(b, Math.min(SLICE.recallMax, n * (c.amount ?? 1)));
    } else if (c.spend === 'blast') {
      const dmg = n * (c.amount ?? 0);
      const hits = b.s.pieces.filter((p) => p.side === 1).map((p) => {
        const absorbed = Math.min(p.shield, dmg);
        p.shield -= absorbed;
        p.hp = Math.max(0, p.hp - (dmg - absorbed));
        return { targetId: p.id, damage: dmg, shieldAbsorbed: absorbed, hpAfter: p.hp, killed: p.hp <= 0 };
      });
      const kingDead = hits.some((h) => h.killed && findPiece(b.s, h.targetId)?.type === 'K');
      b.s.pieces = b.s.pieces.filter((p) => p.hp > 0);
      if (kingDead) b.s = { ...b.s, winner: 0 };
      const k = kingOf(b.s, 0);
      events = [{ type: 'blast', pos: k ? { x: k.x, y: k.y } : { x: 0, y: 0 }, label: '증기 폭발!', hits, fx: 'steam' }];
    }
  }
  // 셈 막대 (D-287): 연쇄가 4에 닿으면 카드 +2 (턴에 한 번)
  if (has(b, 'tally') && b.kills >= PART_NUM.tallyAt && !b.once.includes('tally')) { b.once.push('tally'); drawCards(b, PART_NUM.tallyDraw); }
  // 도화선: 이번 턴 연쇄가 3에 닿으면 한 장 (턴에 한 번)
  if (has(b, 'fuse') && b.kills >= PART_NUM.fuseAt && !b.once.includes('fuse')) {
    b.once.push('fuse');
    drawCards(b, 1);
    gained += 1;
  }
  // 직접 명령·행진·돌격에 참여한 영구 동료만 센다. 자동 반사(area 없음)는 제외.
  let relay = 0;
  if (has(b, 'relayGear') || has(b, 'relaySeal')) {
    for (const e of events) {
      if (e.type !== 'attack' || !e.area.length || !b.squadIds.includes(e.attackerId)) continue;
      const t = b.squadTypes[e.attackerId];
      if (t && e.hits.some((h) => h.damage > 0 && before.pieces.some((p) => p.id === h.targetId && p.side === 1))) {
        const key = `relayType:${t}`;
        if (!b.once.includes(key)) b.once.push(key);
      }
    }
    if (has(b, 'relayGear') && !b.once.includes('relayGear') && b.once.filter((x) => x.startsWith('relayType:')).length >= 2) {
      b.once.push('relayGear');
      relay = PART_NUM.relayGear;
      gained += relay;
    }
  }
  creditKills(b, before, events, c.kind === 'move' ? pieceId : undefined);
  plateEvents(b, before, events);
  for (const p of b.s.pieces) if (p.side === 0) syncPlate(b, p);
  events.push(...afterMyHits(b, before, events));
  // 판 길이 제동 (D-449): 한 턴에 더 얻는 태엽은 출처를 가리지 않고 합쳐서 상한까지
  if (PACE.apGainPerTurn) {
    gained = Math.max(0, Math.min(gained, PACE.apGainPerTurn - (b.apGained ?? 0)));
    b.apGained = (b.apGained ?? 0) + gained;
  }
  // 상한에서 사라진 환급을 얻은 것처럼 표시하지 않는다. 부품 발동 자체는 소모된다.
  const actualGain = Math.max(0, Math.min(gained, SLICE.apCap - (b.ap - cost)));
  const relayGain = Math.max(0, actualGain - (gained - relay));
  events = events.filter((e) => e.type !== 'apGain');
  if (actualGain > relayGain) events.push({ type: 'apGain', side: 0, amount: actualGain - relayGain });
  if (relay) events.push({ type: 'apGain', side: 0, amount: relayGain, source: 'relayGear' });
  b.ap = Math.min(SLICE.apCap, b.ap - cost + gained);
  // 할인 부품을 이번 턴에 썼다고 적는다 (PACE.discountOnce — costOf가 본다)
  if (PACE.discountOnce && c.cost > 0) {
    if ((c.who === 'P' || c.kind === 'march') && has(b, 'drum')) b.once.push('off:drum');
    if (c.who === 'N' && has(b, 'spurs')) b.once.push('off:spurs');
    if (c.who === 'Q' && has(b, 'lightCloak')) b.once.push('off:lightCloak');
  }
  // 뽑기로 손패가 늘었을 수 있다: 낸 카드는 그 자리에서 뺀다
  b.hand.splice(i, 1);
  (b.played ??= []).push(id);
  burnFallen(b);
  bossRise(b, before, events);
  return { events, before };
};

/**
 * 반장 2단계 (D-243, 사용자: 「반장이 1~2턴에 끝난다」): 반장 킹이 처음 쓰러지면 HP 일부로 다시 일어서고 곁에 호위 폰이 선다.
 * 두 번째로 쓰러져야 이긴다. 화면은 사건 'phase2'를 보고 띠를 띄운다.
 */
const bossRise = (b: SliceBattle, before: BattleState, events: BattleEvent[]): void => {
  if (!b.boss || b.phase2 || b.s.winner !== 0) return;
  const old = before.pieces.find((p) => p.side === 1 && p.type === 'K');
  if (!old) return;
  b.phase2 = true;
  const k = makePiece(old.id, 'K', 1, old.x, old.y);
  k.maxHp = old.maxHp;
  k.hp = Math.max(1, Math.round(old.maxHp * SLICE.bossPhase2Hp));
  k.atk = old.atk;
  b.s = { ...b.s, winner: null, pieces: [...b.s.pieces.filter((p) => p.id !== old.id), k] };
  // 호위 폰 둘 (빈 둘레 칸)
  const atkK = b.atkK ?? 1;
  let n = 0;
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [-1, -1], [1, -1], [0, 1]]) {
    if (n >= SLICE.bossPhase2Guards) break;
    const q = { x: k.x + dx, y: k.y + dy };
    if (!inBounds(b.s, q.x, q.y) || b.s.pieces.some((p) => p.x === q.x && p.y === q.y)) continue;
    const pawn = makePiece(Math.max(...b.s.pieces.map((p) => p.id), ...b.squadIds) + 1, 'P', 1, q.x, q.y);
    pawn.maxHp = pawn.hp = Math.round(pawn.maxHp * (b.foeHpK ?? 1));
    pawn.atk = Math.max(1, Math.round(pawn.atk * atkK));
    b.s.pieces.push(pawn);
    events.push({ type: 'respawn', pieceId: pawn.id, pos: q, label: '반장 호위' });
    n += 1;
  }
  events.push({ type: 'respawn', pieceId: k.id, pos: { x: k.x, y: k.y }, label: '반장 2단계' });
  b.intents = planFor(b);
  markTelegraph(b);
};

/** 킹 호위 방열판 (D-243): 적 킹은 호위(킹 아닌 적)가 남아 있는 동안 턴마다 방열판을 두른다 — 첫 턴에 킹부터 끝낼 수 없게 */
const guardUp = (b: SliceBattle): void => {
  if (!b.guard || b.boss) return;
  const k = kingOf(b.s, 1);
  if (!k || !b.s.pieces.some((p) => p.side === 1 && p.type !== 'K')) return;
  k.shield = Math.max(k.shield, Math.round(k.maxHp * b.guard));
};

/** 내 킹이 예고된 칸에 서 있나 (자살 수 경고) */
export const kingInDanger = (b: SliceBattle): boolean => {
  const k = kingOf(b.s, 0);
  return !!k && intentHits(b).some((h) => h.pieceId === k.id);
};

// ---------- 적 차례 ----------
/** 예고를 그대로 실행한다. 다음 내 차례를 준비하지는 않는다 */
/**
 * 밀치기 (D-154): 이 기물이 친 적(살아남은)을 친 방향으로 한 칸 민다.
 * 빈 칸이면 밀려난다(예고가 어긋날 수 있다). 벽 · 기물에 막히면 밀린 적과 부딪힌 기물이 둘 다 충돌 피해(적끼리면 오사).
 * 미리보기 · 실행이 같은 함수 (결과가 누르기 전에 보인다).
 */
const applyPush = (b: SliceBattle, sim: { state: BattleState; events: BattleEvent[]; removed: Piece[] }, pieceId: number): void => {
  const s = sim.state;
  const me = findPiece(s, pieceId);
  if (!me) return;
  const dmg = (PUSH.collide + (b.parts.includes('anvilPlate') ? PART_NUM.anvilPlate : 0)) * (b.parts.includes('hammer') ? PART_NUM.hammerMult : 1);
  const targets = sim.events.flatMap((e) => (e.type === 'attack' && e.attackerId === pieceId ? e.hits.filter((h) => !h.killed) : []));
  for (const h of targets) {
    const t = findPiece(s, h.targetId);
    if (!t || t.side === 0) continue;
    const dx = Math.sign(t.x - me.x), dy = Math.sign(t.y - me.y);
    const to = { x: t.x + dx, y: t.y + dy };
    const blocker = s.pieces.find((p) => p.x === to.x && p.y === to.y);
    if (inBounds(s, to.x, to.y) && !blocker) {
      sim.events.push({ type: 'move', order: 0, pieceId: t.id, from: { x: t.x, y: t.y }, to });
      t.x = to.x;
      t.y = to.y;
      continue;
    }
    // 충돌: 밀린 적 + 부딪힌 기물
    const hits = [t, ...(blocker ? [blocker] : [])].map((p) => {
      const absorbed = Math.min(p.shield, dmg);
      p.shield -= absorbed;
      p.hp = Math.max(0, p.hp - (dmg - absorbed));
      return { targetId: p.id, damage: dmg, shieldAbsorbed: absorbed, hpAfter: p.hp, killed: p.hp <= 0 };
    });
    sim.events.push({ type: 'blast', pos: { x: t.x, y: t.y }, label: blocker ? '충돌!' : '벽 충돌!', hits });
    for (const x of hits.filter((x) => x.killed)) {
      const dead = findPiece(s, x.targetId)!;
      sim.removed.push(dead);
      if (dead.type === 'K') s.winner = dead.side === 1 ? 0 : 1;
    }
    s.pieces = s.pieces.filter((p) => p.hp > 0);
  }
};

/**
 * 내 공격 뒤 반응 (R5-4): 출하 반장의 되받아치기(반장을 친 내 기물에 BOSS_NUM.thorns) · 자폭 폰(쓰러지면 둘레 내 기물에 8).
 * 미리보기에는 보이지 않는다 — 레일의 반장 규칙 · 대국 안내가 알려 준다.
 */
const afterMyHits = (b: SliceBattle, before: BattleState, events: BattleEvent[]): BattleEvent[] => {
  const out: BattleEvent[] = [];
  const hurt = (p: Piece, dmg: number) => {
    const absorbed = Math.min(p.shield, dmg);
    p.shield -= absorbed;
    p.hp = Math.max(0, p.hp - (dmg - absorbed));
    return { targetId: p.id, damage: dmg, shieldAbsorbed: absorbed, hpAfter: p.hp, killed: p.hp <= 0 };
  };
  const ek = before.pieces.find((p) => p.side === 1 && p.type === 'K');
  for (const e of events) {
    if (e.type !== 'attack') continue;
    if (b.boss && hasThorns(b) && ek && e.hits.some((h) => h.targetId === ek.id && !h.killed)) {
      const me = findPiece(b.s, e.attackerId);
      if (me && me.side === 0) out.push({ type: 'blast', pos: { x: me.x, y: me.y }, label: '되받아침!', hits: [hurt(me, foeDmg(BOSS_NUM.thorns, b))], fx: 'thorns', from: { x: ek.x, y: ek.y } });
    }
    if (b.blastPawns)
      for (const h of e.hits) {
        const dead = before.pieces.find((p) => p.id === h.targetId);
        if (!h.killed || !dead || dead.side !== 1 || dead.type !== 'P') continue;
        const hits = b.s.pieces.filter((p) => p.side === 0 && chebyshev(p, dead) === 1).map((p) => hurt(p, foeDmg(TRAIT.blast, b)));
        if (hits.length) out.push({ type: 'blast', pos: { x: dead.x, y: dead.y }, label: '자폭!', hits, fx: 'burst' });
      }
  }
  if (out.length) {
    const kingDead = out.some((e) => e.type === 'blast' && e.hits.some((h) => h.killed && findPiece(b.s, h.targetId)?.type === 'K'));
    for (const e of out) if (e.type === 'blast') afterEnemyHits(b, before, [e], e.label.startsWith('자폭') ? '자폭 폰' : '반장');
    b.s.pieces = b.s.pieces.filter((p) => p.hp > 0);
    if (kingDead) b.s = { ...b.s, winner: 1 };
  }
  return out;
};

/**
 * 내가 치면 돌아오는 피해 미리보기 (D-173): 출하 반장 되받아침 · 자폭 폰. previewPlay 결과로 계산만 한다 (상태는 안 바꾼다).
 * 화면은 과녁 칸에 붉은 숫자로 보여 준다 — 결과를 누르기 전에 (UI 원칙 1).
 */
export const backlashOf = (b: SliceBattle, sim: { state: BattleState; events: BattleEvent[] }): number => {
  let dmg = 0;
  const ek = b.s.pieces.find((p) => p.side === 1 && p.type === 'K');
  for (const e of sim.events) {
    if (e.type !== 'attack') continue;
    if (b.boss && hasThorns(b) && ek && e.hits.some((h) => h.targetId === ek.id && !h.killed)) dmg += foeDmg(BOSS_NUM.thorns, b);
    if (b.blastPawns)
      for (const h of e.hits) {
        const dead = b.s.pieces.find((p) => p.id === h.targetId);
        if (!h.killed || !dead || dead.side !== 1 || dead.type !== 'P') continue;
        dmg += foeDmg(TRAIT.blast, b) * sim.state.pieces.filter((p) => p.side === 0 && chebyshev(p, dead) === 1).length;
      }
  }
  return dmg;
};

/** 처치 기록 (분대원 처치 수 · 반장 처치) */
const creditKills = (b: SliceBattle, before: BattleState, events: BattleEvent[], mover?: number): void => {
  const hpLeft = new Map(before.pieces.map((p) => [p.id, p.hp]));
  const killed = new Set<number>();
  for (const e of events) {
    // 충돌 처치(밀치기)는 민 기물의 처치로 센다
    if (e.type !== 'attack' && !(e.type === 'blast' && mover !== undefined)) continue;
    const by = e.type === 'attack' ? e.attackerId : mover!;
    for (const h of e.hits) {
      const tgt = before.pieces.find((p) => p.id === h.targetId);
      if (tgt && tgt.side === 1) {
        const left = hpLeft.get(tgt.id) ?? 0;
        const actual = Math.max(0, left - h.hpAfter);
        hpLeft.set(tgt.id, Math.min(left, h.hpAfter));
        (b.pd ??= {})[by] = (b.pd?.[by] ?? 0) + actual;
      }
      if (!h.killed || killed.has(h.targetId)) continue;
      killed.add(h.targetId);
      const t = before.pieces.find((p) => p.id === h.targetId);
      if (!t || t.side !== 1) continue;
      const rec = (b.pk[by] ??= {});
      rec[t.type] = (rec[t.type] ?? 0) + 1;
      if (t.type === 'K' && b.boss) b.bossKiller = by;
    }
  }
};

/** 적 차례 뒤처리: 맞은 원한의 톱니 · 생명 · 쓰러진 분대원 기록 · 새는 보일러 터짐 */
const afterEnemyHits = (b: SliceBattle, before: BattleState, events: BattleEvent[], by: string): BattleEvent[] => {
  plateEvents(b, before, events, true);
  for (const p of b.s.pieces) if (p.side === 0) syncPlate(b, p);
  const extra: BattleEvent[] = [];
  for (const e of events) {
    if (e.type !== 'attack' && e.type !== 'blast') continue;
    const attacker = e.type === 'attack' ? before.pieces.find((p) => p.id === e.attackerId) : null;
    for (const h of e.hits) {
      if (!b.squadIds.includes(h.targetId)) continue;
      if (h.door) b.doorUsed.push(h.targetId);
      if (has(b, 'gilded') && h.damage > 0 && findPiece(before, h.targetId)?.type === 'K' && !b.once.includes('gilded')) b.once.push('gilded');
      if (h.killed && !b.falls.some((f) => f.pieceId === h.targetId)) {
        const dead = before.pieces.find((p) => p.id === h.targetId);
        b.falls.push({ pieceId: h.targetId, by: attacker ? `적 ${PIECE_LABEL[attacker.type]}` : by, turn: b.turn, t: dead?.type, ...(attacker && attacker.side === 1 ? { byType: attacker.type, byId: attacker.id } : {}) });
        if (dead && b.quirks[h.targetId] === 'boiler') {
          const hits = b.s.pieces.filter((p) => p.side === 1 && chebyshev(p, dead) === 1).map((p) => {
            const absorbed = Math.min(p.shield, CREW.boilerBlast);
            p.shield -= absorbed;
            p.hp = Math.max(0, p.hp - (CREW.boilerBlast - absorbed));
            return { targetId: p.id, damage: CREW.boilerBlast, shieldAbsorbed: absorbed, hpAfter: p.hp, killed: p.hp <= 0 };
          });
          const kingDead = hits.some((x) => x.killed && findPiece(b.s, x.targetId)?.type === 'K');
          b.s.pieces = b.s.pieces.filter((p) => p.hp > 0);
          if (kingDead) b.s = { ...b.s, winner: 0 };
          extra.push({ type: 'blast', pos: { x: dead.x, y: dead.y }, label: '보일러 폭발!', hits, fx: 'burst' });
        }
      }
    }
  }
  return extra;
};

const PIECE_LABEL: Record<PieceType, string> = { K: '킹', Q: '퀸', R: '룩', B: '비숍', N: '나이트', P: '폰' };

/** 되받아침이 켜진 반장 (출하 반장 · 도금왕) */
export const hasThorns = (b: SliceBattle): boolean => b.bossRule === 'thorns' || b.bossRule === 'gilded';

/** 반장 턴 시작: 철갑을 다시 두르고 폭격 줄을 예고한다 (내 기물 값이 가장 많이 모인 줄) */
const bossTurnStart = (b: SliceBattle): void => {
  if (!b.boss) return;
  const k = kingOf(b.s, 1);
  if (k && b.bossRule !== 'spawn' && b.bossRule !== 'magnet' && (b.turn - 1) % BOSS.plateEvery === 0) k.shield = Math.max(k.shield, BOSS.plate);
  b.bombRow = null;
  if (b.bossRule === 'inspect' || b.bossRule === 'magnet' || b.bossRule === 'alarm') return newBossTurn(b, k);
  // 조립 반장: 2턴마다 킹 곁에 폰 (셋까지)
  // 도금왕 (D-252): 세 반장을 다 쓴다 — 방열판(위) · 홀수 턴 폰 찍기 · 짝수 턴 줄 폭격 · 되받아침(아래 hasThorns)
  if (b.bossRule === 'spawn' || b.bossRule === 'gilded') {
    if (k && (b.turn - 1) % BOSS_NUM.spawnEvery === 0 && b.s.pieces.filter((p) => p.side === 1 && p.type === 'P').length < BOSS_NUM.spawnMax) {
      const spot = [[0, -1], [-1, 0], [1, 0], [-1, -1], [1, -1]].map(([dx, dy]) => ({ x: k.x + dx, y: k.y + dy })).find((q) => inBounds(b.s, q.x, q.y) && !b.s.pieces.some((p) => p.x === q.x && p.y === q.y));
      if (spot) b.s.pieces.push(makePiece(Math.max(...b.s.pieces.map((p) => p.id), ...b.squadIds) + 1, 'P', 1, spot.x, spot.y));
    }
    if (b.bossRule === 'spawn') return;
  }
  if (b.bossRule === 'thorns') return;
  // 1턴부터 (D-201): 반장 규칙이 첫 턴에 바로 보인다 — 예고(붉은 줄)는 그 턴 시작에 뜨고 턴 끝에 친다
  // 첫 폭격은 2턴 끝 (D-214, 사용자: "불길이 첫 턴부터 다 태우면 어떻게 이기나") — 1턴엔 출발 줄을 벗어날 틈을 준다
  if (b.turn < BOSS.bombFirst || (b.turn - BOSS.bombFirst) % BOSS.bombEvery !== 0) return;
  const rows = new Map<number, number>();
  for (const p of b.s.pieces) if (p.side === 0) rows.set(p.y, (rows.get(p.y) ?? 0) + valueOf(p));
  const best = [...rows.entries()].sort((x, y) => y[1] - x[1] || x[0] - y[0])[0];
  if (best) b.bombRow = best[0];
};

/** 새 반장 셋의 턴 시작 (D-274) — 검수: 불량 도장 · 자석: 끌어당길 기물 예고 · 경보: 눈금 +1, 가득 차면 이번 적 차례 공격 ×1.5 */
const newBossTurn = (b: SliceBattle, k: Piece | undefined): void => {
  const mine = b.s.pieces.filter((p) => p.side === 0 && p.type !== 'K');
  if (b.bossRule === 'inspect') {
    if ((b.turn - 1) % BOSS_NUM.stampEvery !== 0) return;
    b.stampId = [...mine].sort((x, y) => y.atk - x.atk || x.id - y.id)[0]?.id ?? null;
    return;
  }
  if (b.bossRule === 'magnet') {
    b.pull = null;
    if (!k || (b.turn - 1) % BOSS_NUM.magnetEvery !== 0) return;
    const cheb = (p: Piece) => Math.max(Math.abs(p.x - k.x), Math.abs(p.y - k.y));
    for (const p of [...mine].sort((x, y) => cheb(x) - cheb(y) || x.id - y.id)) {
      if (cheb(p) <= 1) continue;
      const to = { x: p.x + Math.sign(k.x - p.x), y: p.y + Math.sign(k.y - p.y) };
      if (inBounds(b.s, to.x, to.y) && !b.s.pieces.some((q) => q.x === to.x && q.y === to.y)) { b.pull = { id: p.id, to }; return; }
    }
    return;
  }
  // 경보
  b.alarm = (b.alarm ?? 0) + 1;
  if (b.alarm >= BOSS_NUM.alarmFull && !b.alarmAtk) {
    b.alarmAtk = {};
    for (const p of b.s.pieces) if (p.side === 1) { b.alarmAtk[p.id] = p.atk; p.atk = Math.max(1, Math.round(p.atk * BOSS_NUM.alarmMult)); }
  }
};

/** 새 반장 셋의 적 차례 끝 — 자석이 끌어당기고 경보가 울렸으면 공격을 되돌리고 눈금을 비운다 */
const newBossAfter = (b: SliceBattle): BattleEvent[] => {
  const out: BattleEvent[] = [];
  if (b.pull) {
    const p = findPiece(b.s, b.pull.id);
    const to = b.pull.to;
    if (p && p.side === 0 && Math.max(Math.abs(p.x - to.x), Math.abs(p.y - to.y)) === 1 && !b.s.pieces.some((q) => q.x === to.x && q.y === to.y)) {
      out.push({ type: 'move', order: 0, pieceId: p.id, from: { x: p.x, y: p.y }, to: { ...to } });
      Object.assign(p, { x: to.x, y: to.y });
    }
    b.pull = null;
  }
  if (b.alarmAtk) {
    for (const p of b.s.pieces) if (b.alarmAtk[p.id] !== undefined) p.atk = b.alarmAtk[p.id];
    b.alarmAtk = undefined;
    b.alarm = 0;
  }
  return out;
};

/** 줄 폭격 실행 */
const bombard = (b: SliceBattle): BattleEvent | null => {
  if (b.bombRow === null) return null;
  const row = b.bombRow;
  const hits = b.s.pieces.filter((p) => p.side === 0 && p.y === row).map((p) => {
    const bomb = foeDmg(BOSS.bombDamage, b);
    const absorbed = Math.min(p.shield, bomb);
    p.shield -= absorbed;
    p.hp = Math.max(0, p.hp - (bomb - absorbed));
    return { targetId: p.id, damage: bomb, shieldAbsorbed: absorbed, hpAfter: p.hp, killed: p.hp <= 0 };
  });
  const kingDead = hits.some((h) => h.killed && findPiece(b.s, h.targetId)?.type === 'K');
  b.s.pieces = b.s.pieces.filter((p) => p.hp > 0);
  if (kingDead) b.s = { ...b.s, winner: 1 };
  return { type: 'blast', pos: { x: Math.floor(b.s.width / 2), y: row }, label: '줄 폭격!', hits, fx: 'row' };
};

const enemyPhase = (b: SliceBattle): { events: BattleEvent[] } => {
  const events: BattleEvent[] = [];
  for (const it0 of liveIntents(b)) {
    if (b.s.winner !== null) break;
    const p = findPiece(b.s, it0.pieceId);
    if (!p) continue;
    const s1 = { ...b.s, turnSide: 1 as const };
    let it = it0;
    let sim = simulate(s1, [it], { freeAp: true });
    // 앞의 적이 움직이며 칸이 막혔으면 그 자리에서 다시 고른다 (쉬지 않는다)
    if (!sim.ok) {
      const alt = bestFor(b.s, p, undefined, b.turn, { reach: playerReach(b.s), boss: b.boss });
      if (!alt) continue;
      it = { pieceId: p.id, to: alt.to };
      sim = simulate(s1, [it], { freeAp: true });
      if (!sim.ok) continue;
    }
    const mid = b.s;
    b.s = { ...sim.state, turnSide: 0 };
    events.push(...sim.events);
    const extra = afterEnemyHits(b, mid, sim.events, '적');
    if (extra.length) {
      events.push(...extra);
      if (b.s.winner !== null) events.push({ type: 'gameOver', winner: b.s.winner });
    }
  }
  if (b.s.winner === null) {
    const pre = cloneState(b.s);
    const bomb = bombard(b);
    if (bomb) {
      events.push(bomb);
      events.push(...afterEnemyHits(b, pre, [bomb], '줄 폭격'));
      if (b.s.winner !== null) events.push({ type: 'gameOver', winner: b.s.winner });
    }
  }
  if (b.boss) events.push(...newBossAfter(b));
  return { events };
};

/**
 * 내 차례를 끝낸다: 남은 손패를 버리고 · 적이 예고대로 두고 · 나사 한 칸이 사라지고 · 새 손패와 새 예고.
 * 'warn' = 내 킹이 예고된 칸에 있다 (한 번 묻는다).
 */
export const endTurn = (b: SliceBattle, force = false): { events: BattleEvent[]; before: BattleState } | 'warn' => {
  if (!force && !b.warned && kingInDanger(b)) {
    b.warned = true;
    return 'warn';
  }
  const before = cloneState(b.s);
  b.discard.push(...(b.played ?? []), ...b.hand);
  b.played = [];
  b.hand = [];
  const { events } = enemyPhase(b);
  // 헛방 (D-229): 겨눴던 적이 빈 땅을 쳤으면 경직 — 다음 적 차례에 못 움직이고 방열판을 잃는다 (반장 킹은 방열판만)
  const hitters = new Set(events.flatMap((e) => (e.type === 'attack' && e.hits.some((h) => before.pieces.find((q) => q.id === h.targetId)?.side === 0) ? [e.attackerId] : [])));
  // 경직 면역: 지난번에 경직돼 한 차례 쉰 적은 이번에 다시 경직되지 않는다 (쉬고 → 움직이고 → 다시 경직 가능)
  const immune = b.stunImmune ?? [];
  const restedNow = b.staggered ?? [];
  b.staggered = (b.aimed ?? []).filter((id) => !hitters.has(id) && !!findPiece(b.s, id) && !immune.includes(id));
  // 핀 (D-281): 묶임은 방금 지난 적 차례 한 번으로 끝난다
  b.pinned = [];
  for (const id of b.staggered) { const p = findPiece(b.s, id)!; p.shield = 0; }
  // 기어 쇼크: 적 공격을 맞고 살아남은 내 기물은 다음 턴 공격이 약해진다 (예고를 무시한 값)
  b.stunImmune = [...restedNow];
  b.shocked = b.noShock ? [] : [...new Set(events.flatMap((e) => (e.type === 'attack' ? e.hits.filter((h) => h.damage > 0 && !h.killed && before.pieces.find((q) => q.id === h.targetId)?.side === 0).map((h) => h.targetId) : [])))];
  if (b.boss) b.staggered = b.staggered.filter((id) => findPiece(b.s, id)?.type !== 'K');
  burnFallen(b);
  b.coins = Math.max(0, b.coins - 1);
  // 피의 계약 (양날): 턴 끝마다 킹 HP −4 (쓰러지지는 않는다 — HP 1에서 멈춘다)
  if (b.s.winner === null && has(b, 'bloodPact')) {
    const k = kingOf(b.s, 0);
    if (k) {
      const dmg = Math.min(PART_NUM.bloodCost, k.hp - 1);
      if (dmg > 0) {
        k.hp -= dmg;
        events.push({ type: 'blast', pos: { x: k.x, y: k.y }, label: '피의 계약', hits: [{ targetId: k.id, damage: dmg, shieldAbsorbed: 0, hpAfter: k.hp, killed: false }] });
      }
    }
  }
  const gildedHit = b.once.includes('gilded');
  if (b.s.winner === null) {
    b.turn += 1;
    b.s = { ...b.s, turnNumber: b.s.turnNumber + 2, turnSide: 0 };
    // 도금 방패: 지난 적 차례에 킹이 맞았으면 태엽 +1
    // 무거운 플라이휠 (D-287): 남은 태엽 최대 2가 넘어간다
    b.ap = Math.min(SLICE.apCap, b.apMax + (gildedHit ? 1 : 0) + (has(b, 'flywheel') ? Math.min(PART_NUM.flywheel, Math.max(0, b.ap)) : 0));
    // 잔열 (D-282): 연쇄 절반이 남는다
    b.kills = has(b, 'afterheat') ? Math.floor(b.kills / 2) : 0;
    // 땜질 도구함 (D-282 → D-299): 킹을 뺀 가장 다친(잃은 HP가 큰) 내 기물 toolboxN개 HP +toolbox — 킹을 고치면 출하 목숨 보험이 되어 힘 값이 양과 무관하게 튀었다
    if (has(b, 'toolbox'))
      for (const w of b.s.pieces.filter((q) => q.side === 0 && q.type !== 'K' && q.hp < q.maxHp).sort((x, y) => (y.maxHp - y.hp) - (x.maxHp - x.hp) || x.id - y.id).slice(0, PART_NUM.toolboxN)) w.hp = Math.min(w.maxHp, w.hp + PART_NUM.toolbox);
    b.killers = [];
    b.once = [];
    b.refunded = 0;
    b.apGained = 0;
    b.drawnExtra = 0;
    b.warned = false;
    // 조립 라인: 폰이 적으면 킹 옆에 하나
    if (has(b, 'assembly') && b.s.pieces.filter((p) => p.side === 0 && p.type === 'P').length <= PART_NUM.assemblyBelow) {
      const e = spawnPawn(b, '끝없는 생산선 — 폰이 나온다');
      if (e) events.push(e);
    }
    // 기어 쇼크 (D-230, 보고서 2): 맞은 기물이 있으면 다음 턴 손패 −1 (턴에 최대 −1)
    b.evaded = [];
    drawCards(b, b.handSize - ((b.shocked ?? []).length ? SLICE.shockDraw : 0), true);
    bossTurnStart(b);
    guardUp(b);
    b.intents = planFor(b).filter((it) => !(b.staggered ?? []).includes(it.pieceId));
    markTelegraph(b);
    b.snap = JSON.stringify({ ...b, snap: '' });
  }
  return { events, before };
};

/** 이번 적 차례에 내 킹이 쓰러지나 (마지막 한 수 · 자원 희생 판정, D-178) */
export const kingDoomed = (b: SliceBattle): boolean => {
  const k = kingOf(b.s, 0);
  return !!k && b.s.winner === null && intentHits(b).some((h) => h.pieceId === k.id && h.killed);
};

/** 자원 희생 (D-178): 킹과 곁의 분대원이 자리를 바꾼다 — 그 분대원이 대신 맞는다. 바꿀 수 있는 분대원 id들 */
export const sacrificeCandidates = (b: SliceBattle): number[] => {
  const k = kingOf(b.s, 0);
  if (!k) return [];
  return b.s.pieces.filter((p) => p.side === 0 && p.id !== k.id && chebyshev(p, k) === 1).map((p) => p.id);
};
export const sacrificeSwap = (b: SliceBattle, crewId: number): boolean => {
  const k = kingOf(b.s, 0);
  const c = findPiece(b.s, crewId);
  if (!k || !c || chebyshev(k, c) !== 1) return false;
  const kx = k.x, ky = k.y;
  Object.assign(k, { x: c.x, y: c.y });
  Object.assign(c, { x: kx, y: ky });
  b.snap = JSON.stringify({ ...b, snap: '' });
  return true;
};

/** 마지막 한 수 (D-178): 태엽 +ap, 손패에 철벽 한 장 (이 대국 동안만 — 출하 덱에는 남지 않는다) */
export const clutchBoost = (b: SliceBattle, ap: number): void => {
  b.ap = Math.min(SLICE.apCap, b.ap + ap);
  b.hand.push('plate');
  b.snap = JSON.stringify({ ...b, snap: '' });
};

/** 되감기: 이번 턴 처음으로 (테이프의 공짜 1회 → 그다음 역회전 톱니 부적, D-228) */
export const rewind = (b: SliceBattle): SliceBattle | string => {
  if (b.rewinds <= 0) return '되감기를 모두 사용했습니다.';
  const back = JSON.parse(b.snap) as SliceBattle;
  back.rewinds = b.rewinds - 1;
  back.snap = b.snap;
  return back;
};

/** 대국이 끝난 뒤 분대: 살아남은 기물만 남기고 HP를 이어 간다 */
/**
 * 대국 뒤 분대: 살아남은 이만 · 승격은 그 대국에서만 (D-198 — 입문 판의 공짜 퀸이 출하 내내 남아 난이도를 무너뜨렸다).
 * 유형은 대국 전으로 돌아가고 HP는 원래 최대치 안으로.
 */
export const squadAfter = (b: SliceBattle, squad: Squad[]): Squad[] =>
  squad.flatMap((u, i) => {
    const p = findPiece(b.s, b.squadIds[i]);
    if (!p) return [];
    const hp = p.type === u.t ? p.hp : Math.min(p.hp, u.hp ?? p.hp);
    return [growCrew(b, u, b.squadIds[i], hp, u.t)];
  });

/** 이 대국에서 승격한 분대원 수 (승격 도장) */
export const promotedIn = (b: SliceBattle, squad: Squad[]): number =>
  squad.filter((u, i) => {
    const p = findPiece(b.s, b.squadIds[i]);
    return p && p.type !== u.t;
  }).length;

/**
 * 쓰러진 분대원의 전용 카드를 태운다 (D-198, 사용자: "해당 기물 전용 카드만 태우자 — 왕만 남아도 역전수를 낼 수 있게").
 * 같은 유형이 아직 판에 살아 있으면 남긴다. 「지휘」 같은 아무 기물 카드는 남는다. 이번 대국에서만 — 덱에는 그대로.
 */
export const burnFallen = (b: SliceBattle): { t: PieceType; ids: CommandId[] }[] => {
  const out: { t: PieceType; ids: CommandId[] }[] = [];
  for (const f of b.falls) {
    if (f.burned || !f.t) continue;
    f.burned = true;
    const t = f.t;
    if (t === 'K' || b.s.pieces.some((p) => p.side === 0 && p.type === t)) continue;
    const ids: CommandId[] = [];
    const keep = (pile: CommandId[]): CommandId[] =>
      pile.filter((id) => {
        if (COMMANDS[id].who !== t) return true;
        ids.push(id);
        return false;
      });
    b.hand = keep(b.hand);
    b.draw = keep(b.draw);
    b.discard = keep(b.discard);
    b.played = keep(b.played ?? []);
    if (ids.length) out.push({ t, ids });
  }
  b.burned = [...(b.burned ?? []), ...out.flatMap((x) => x.ids)];
  return out;
};

/** 대국 뒤 성장: 처치 · 대국 수 · 흉터 · 별명 (자동으로 붙는다 — 레퍼런스 6권 원리 3 · 5) */
export const growCrew = (b: SliceBattle, u: Squad, id: number, hp: number, t: PieceType = u.t): Squad => {
  const kills = Object.values(b.pk[id] ?? {}).reduce((a, n) => a + (n ?? 0), 0);
  const c: Squad = { ...u, t, hp, wins: (u.wins ?? 0) + (b.s.winner === 0 && hp > 0 ? 1 : 0), protectedDamage: (u.protectedDamage ?? 0) + (b.protection?.[id] ?? 0), kills: (u.kills ?? 0) + kills, battles: (u.battles ?? 0) + 1, dmg: (u.dmg ?? 0) + Math.round(b.pd?.[id] ?? 0), defied: (u.defied ?? 0) + b.doorUsed.filter((x) => x === id).length, scars: [...(u.scars ?? [])] };
  if (b.doorUsed.includes(id) && !c.scars!.includes('납땜 자국')) c.scars!.push('납땜 자국');
  if ((c.battles ?? 0) >= CREW.scarAfterBattles && !c.scars!.includes('용접 흉터')) c.scars!.push('용접 흉터');
  if (b.bossKiller === id) c.nick = '반장 사냥꾼';
  else if (!c.nick && (c.kills ?? 0) >= CREW.nickAfterKills) {
    const top = Object.entries(b.pk[id] ?? {}).sort((x, y) => (y[1] ?? 0) - (x[1] ?? 0))[0];
    c.nick = `${PIECE_LABEL[(top?.[0] as PieceType) ?? 'P']} 분쇄기`;
  }
  return c;
};

/** 이 대국에서 쓰러진 분대원 (원부 · 유품용) */
export const fallenAfter = (b: SliceBattle, squad: Squad[]): { crew: Squad; fall: Fall }[] =>
  squad.flatMap((u, i) => {
    const id = b.squadIds[i];
    if (findPiece(b.s, id)) return [];
    const fall = b.falls.find((f) => f.pieceId === id) ?? { pieceId: id, by: '알 수 없음', turn: b.turn };
    return [{ crew: growCrew(b, u, id, 0), fall }];
  });

/** 판 사이 회복 (사용자: 누적되면 너무 약해진다): 살아남은 분대는 최대 HP의 일부를 되찾는다 */
export const REST = { heal: 0.3, reviveHp: 0.5, overhaul: 0.25 };

/** 대국 사이 기본 회복 — 남은 기물 모두 최대 HP의 30% */
export const restSquad = (squad: Squad[], heal: number = REST.heal): Squad[] => squad.map((u) => ({ ...u, hp: Math.min(crewMaxHp(u), (u.hp ?? crewMaxHp(u)) + Math.round(crewMaxHp(u) * heal)) }));

/**
 * 목숨 둘 · 심장 톱니 (D-219, 다키스트 던전 2 · 와일드프로스트 · 인투 더 브리치 벤치마크): 분대원이 처음 쓰러지면 톱니 하나가 깨진 채
 * HP 50%로 돌아오고 깨진 채로 또 쓰러지면 폐기된다. 킹은 쓰러지면 대국이 끝나므로 해당 없음.
 */
export const crackOrScrap = (fallen: Squad[]): { back: Squad[]; scrapped: Squad[] } => {
  const back: Squad[] = [];
  const scrapped: Squad[] = [];
  for (const u of fallen) {
    // 킹이 이기는 수와 함께 쓰러졌으면(되받아침 · 자폭 · 피의 계약) HP 1로 버틴다 — 킹 없는 분대로 다음 대국이 깨지던 버그 (2026-11-05)
    if (u.t === 'K') back.push({ ...u, hp: 1 });
    else if (u.cracked) scrapped.push(u);
    else back.push({ ...u, cracked: true, hp: Math.round(crewMaxHp(u) * REST.reviveHp) });
  }
  return { back, scrapped };
};
/** 깨진 심장 톱니를 모두 새로 끼운다 (작업대 · 막이 바뀔 때) — 고친 분대원 */
export const mendSquad = (squad: Squad[]): { squad: Squad[]; mended: Squad[] } => {
  const mended = squad.filter((u) => u.cracked);
  return { squad: squad.map((u) => (u.cracked ? { ...u, cracked: false } : u)), mended };
};

/** 정비 (보상 대신 고를 수 있다): 쓰러진 기물 하나를 HP 50%로 되살리고 모두 25% 더 */
export const overhaulSquad = (squad: Squad[], fallen: Squad[]): { squad: Squad[]; revived?: Squad } => {
  const revived = [...fallen].sort((a, b) => PIECE_STATS[b.t].value - PIECE_STATS[a.t].value)[0];
  const healed = squad.map((u) => ({ ...u, hp: Math.min(crewMaxHp(u), (u.hp ?? crewMaxHp(u)) + Math.round(crewMaxHp(u) * REST.overhaul)) }));
  return revived ? { squad: [...healed, { ...revived, cracked: true, hp: Math.round(crewMaxHp(revived) * REST.reviveHp) }], revived } : { squad: healed };
};
