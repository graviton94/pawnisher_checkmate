import type { CardId } from '../data/cards';
import type { EnchantId } from '../data/enchants';
import type { VariantId } from '../data/variants';

/** 0 = 플레이어(보드 아래), 1 = 적(보드 위). 엔진은 두 진영을 같은 규칙으로 다룬다. */
export type Side = 0 | 1;

/** 진영의 형편: 우세·동률 / 열세 단계 (GDD 5장) */
export type Standing = 'leading' | 'tier1' | 'tier2' | 'tier3';

export type PieceType = 'P' | 'N' | 'B' | 'R' | 'Q' | 'K';

export interface Pos {
  x: number;
  y: number;
}

export interface Piece {
  id: number;
  type: PieceType;
  side: Side;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  shield: number;
  /** 이번 라운드에 한 번이라도 이동했는가 (폰 첫 이동 2칸 판정용) */
  moved: boolean;
  /** 일시 버프 (요충지 Tier 2 등): ATK 배율 가산, DEF 가산, 남은 자기 턴 수 */
  buffAtkPct: number;
  buffDef: number;
  buffTurns: number;
  /** 합체 기물이면 구성 유형들 (행마·공격 범위를 모두 가진다, GDD 7장 §7.4) */
  fused?: PieceType[];
  /** 이번 턴만 다른 유형처럼 움직이고 공격한다 (기어 폼 시프트) */
  formAs?: PieceType | null;
  /** 이형 거푸집 (GDD 13장 P2) — 기물의 원래 유형일 때만 효과가 있다 (승급하면 꺼진다) */
  variant?: VariantId;
  /** 마지막으로 이동한 턴 번호 (방열 룩) */
  movedTurn?: number;
}

/** 진영의 전투 장비: 인챈트 중첩, 액티브 카드, 대장간 유형 강화 (GDD 6·7장) */
export interface Loadout {
  enchants: Partial<Record<EnchantId, number>>;
  cards: CardId[];
  forge: Partial<Record<PieceType, number>>;
  /** 이형 거푸집: 유형마다 하나 (GDD 13장 P2) */
  variants?: Partial<Record<PieceType, VariantId>>;
}

export interface CardSlot {
  id: CardId;
  /** 남은 쿨타임 (자기 턴 수) */
  cooldown: number;
  /** 이번 라운드에 이미 썼거나(라운드당 1회) 소멸한 카드 */
  spent: boolean;
}

/** 전투별 규칙 설정 (스테이지 데이터로 정한다) */
export interface BattleRules {
  /** 요충지를 생성하는 라운드 (플레이어 턴 시작 직전). 빈 배열이면 요충지 없음 (GDD 5장) */
  strongholdRounds: number[];
  /** 붕괴하는 대성당 시작 라운드. null이면 붕괴 없음 (D-014) */
  collapseStart: number | null;
  /** 붕괴 간격 (라운드) */
  collapseInterval: number;
  /** 체크메이트: 턴 시작 때 HP가 2 이상인 킹은 그 턴에 HP 1 아래로 떨어지지 않는다 (D-022) */
  checkmate?: boolean;
  /** 적 다음 수 미리보기 기본 제공 수 (D-076): 낮은 승천에서 1 — 미래 예지(E16)와 큰 쪽을 쓴다 */
  foresight?: number;
}

export interface Stronghold {
  x: number;
  y: number;
  /** 지금 올라서 있는 기물 */
  holderId: number | null;
  /** 유지 카운트 (2가 되면 점령) */
  hold: number;
}

/** 최후의 일격 상태 (D-015) */
export type LastStrike = 'none' | 'ready' | 'used';

export interface BattleState {
  width: number;
  height: number;
  /** 살아 있는 기물만 담는다 */
  pieces: Piece[];
  /** 지금 차례인 진영 */
  turnSide: Side;
  /** 지금까지 시작된 턴 수 (양 진영 합산, 1부터). 라운드 = ceil(turnNumber / 2) */
  turnNumber: number;
  winner: Side | null;
  /** 전투 시드 — 요충지 위치 등 무작위 결정에 쓴다 */
  seed: number;
  rules: BattleRules;
  stronghold: Stronghold | null;
  strongholdsSpawned: number;
  /** 정체 압박 (F1, D-072): 피해 없이 지난 라운드 수 · 이번 라운드에 피해가 났는가. 옛 저장에는 없다 */
  stall?: { count: number; dealt: boolean };
  /** 무너진 테두리 줄 수. 유효 보드 = [ring, width−1−ring] × [ring, height−1−ring] */
  /** 완전히 무너진 테두리 줄 수 (표시용) */
  ring: number;
  /** 무너진 칸 (y × width + x). 한 쌍씩 무너진다 (D-014 개정) */
  fallen?: number[];
  /** 이번 턴에만 쓰는 추가 AP (진영별) */
  apBonus: [number, number];
  lastStrike: [LastStrike, LastStrike];
  loadouts: [Loadout, Loadout];
  cards: [CardSlot[], CardSlot[]];
  /** 다음 턴으로 넘어가는 AP (축전기 이월, 연쇄 지휘 보너스) */
  apCarry: [number, number];
  /** 이번 턴 체크메이트 보호를 받는 킹 id (시뮬레이션 중에만 쓴다) */
  checkGuard?: number[];
}

/**
 * 계획 단계의 예약 한 건. 배열 순서가 곧 순번(#1, #2, …)이다.
 * 기본은 이동이고, 카드·인챈트로 생기는 특수 행동은 kind로 구분한다.
 * card = 내 카드 슬롯 번호.
 */
export interface PlannedMove {
  kind?: 'move';
  pieceId: number;
  to: Pos;
  /** 이 이동에 붙인 카드 (A01·A03·A04·C01·C03·C06) */
  card?: number;
}

export type SpecialStep =
  /** 정면이 막힌 폰의 제자리 공격 (E04 2장) */
  | { kind: 'stand'; pieceId: number }
  /** 캐슬링 스왑 (A02): 두 기물 위치 교환 후 둘 다 공격 */
  | { kind: 'castle'; pieceId: number; partnerId: number; card: number }
  /** 강철 바리케이드 (A06): 대상에 보호막 */
  | { kind: 'shield'; pieceId: number; card: number }
  /** 차원 도약문 (C02) */
  | { kind: 'gate'; pieceId: number; to: Pos; card: number }
  /** 비상의 대관식 (C04) */
  | { kind: 'promote'; pieceId: number; card: number }
  /** 합체 (C05 또는 E11): pieceId 자리에 합체, partner는 흡수된다 */
  | { kind: 'fuse'; pieceId: number; partnerId: number; card?: number }
  /** 기어 폼 시프트 (A05): pieceId(나이트) ↔ partnerId(비숍) */
  | { kind: 'formShift'; pieceId: number; partnerId: number; card: number };

export type PlanStep = PlannedMove | SpecialStep;

export type Plan = PlanStep[];

export const isMove = (step: PlanStep): step is PlannedMove => step.kind === undefined || step.kind === 'move';

export interface HitResult {
  targetId: number;
  damage: number;
  shieldAbsorbed: number;
  hpAfter: number;
  killed: boolean;
  /** 번개·연쇄·돌진 등 부가 피해 */
  splash?: boolean;
  /** 넉백으로 밀려난 위치 */
  pushedTo?: Pos;
  /** 체크메이트 규칙으로 킹이 HP 1에서 버텼다 (체크) */
  checked?: boolean;
}

export type BattleEvent =
  | { type: 'move'; order: number; pieceId: number; from: Pos; to: Pos }
  | { type: 'promote'; pieceId: number; from: PieceType; to: PieceType }
  | { type: 'attack'; order: number; attackerId: number; area: Pos[]; hits: HitResult[]; /** 피해 배율 (1.05 초과일 때만, 화면 표시용) */ mult?: number }
  | { type: 'gameOver'; winner: Side }
  | { type: 'lastStrike'; pieceId: number }
  /** 명예로운 항복: 그 진영 킹이 왕관을 내려놓았다 (D-077) */
  | { type: 'resign'; side: Side; pieceId: number }
  | { type: 'awaken'; side: Side; pieceId: number }
  | { type: 'strongholdSpawn'; pos: Pos; standings: [Standing, Standing] }
  /** 정체 압박: 피해 없는 라운드가 count번 이어졌다 (need번이면 붕괴 시작) */
  | { type: 'stall'; count: number; need: number }
  | { type: 'strongholdCapture'; side: Side; pieceId: number; tier: 1 | 2 | 3; behind: boolean }
  | { type: 'strongholdLost' }
  | { type: 'collapse'; ring: number; tiles: Pos[]; pushes: { pieceId: number; from: Pos; to: Pos; damage: number }[] }
  /** 더 무너질 곳이 없을 때 킹이 받는 피해 */
  | { type: 'suddenDeath'; hits: { pieceId: number; damage: number; hpAfter: number }[] }
  | { type: 'card'; side: Side; card: CardId; pieceId: number }
  | { type: 'shield'; pieceId: number; amount: number }
  | { type: 'fuse'; pieceId: number; partnerId: number; types: PieceType[] }
  | { type: 'heal'; pieceId: number; amount: number }
  | { type: 'apGain'; side: Side; amount: number };

export const otherSide = (side: Side): Side => (side === 0 ? 1 : 0);
