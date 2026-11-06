import type { CarveId } from '../data/carves';
import type { PartId } from '../data/parts';
import type { TwistId } from '../data/twists';

/**
 * 규격 2.0 엔진 타입 (GDD 14장, D-138): 기물 · 태엽 · 순차 예약 · 이동한 기물만 공격 · 킹의 죽음 = 승패.
 * 성장은 기물마다 각인 하나(carve)와 진영의 부품(parts)뿐. 적은 수치로만 강해지고, 반장은 비틀기(twist) 하나.
 */

/** 0 = 플레이어(보드 아래), 1 = 적(보드 위). 엔진은 두 진영을 같은 규칙으로 다룬다. */
export type Side = 0 | 1;

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
  /** 방열판: 피해를 먼저 받는다 */
  shield: number;
  /** 한 번이라도 이동했는가 (폰 첫 이동 2칸 판정용) */
  moved: boolean;
  /** 각인 (Pawnbarian 토큰식): 기물마다 하나 */
  carve?: CarveId;
  /** 검문! 정예 (HP ×2, 표식 하나) */
  elite?: boolean;
  /** 폰처럼 움직이고 친다 (승급 13 최종장 — 종이 왕관을 벗은 아홉째, D-277) */
  asPawn?: boolean;
}

/** 진영의 장비: 부품 (유물) */
export interface Loadout {
  parts: PartId[];
}

/** 대국 규칙 (층 데이터로 정한다) */
export interface BattleRules {
  /** 무너지는 판이 시작하는 라운드 (정체가 이어지면 앞당겨진다) */
  collapseStart: number | null;
  collapseInterval: number;
  /** 체크: 턴 시작 때 HP 2 이상인 킹은 그 턴에 HP 1 아래로 떨어지지 않는다 (D-022) */
  checkmate: boolean;
  /** 적 다음 수 미리보기 기본 제공 수 (D-076) */
  foresight: number;
  /** 한 턴 명령 상한 (검문 반장의 「서류 검문」) — 없으면 제한 없음 */
  maxOrders?: number;
  /** 시험장 B (D-177): 진짜 체스 잡기 — 적 칸에 들어가 잡는다, 착지 공격 없음 */
  capture?: boolean;
}

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
  seed: number;
  rules: BattleRules;
  /** 정체 압박 (D-072): 피해 없이 지난 라운드 수 · 이번 라운드에 피해가 났는가 */
  stall?: { count: number; dealt: boolean };
  /** 완전히 무너진 테두리 줄 수 (표시용) */
  ring: number;
  /** 무너진 칸 (y × width + x) */
  fallen?: number[];
  /** 이번 턴에만 쓰는 추가 태엽 (진영별) */
  apBonus: [number, number];
  loadouts: [Loadout, Loadout];
  /** 반장 비틀기 (적 진영에 걸린다) */
  twist?: TwistId;
  /** 양산 라인 비틀기: 다시 선 폰 수 */
  respawns?: number;
  /** 단독 출하 부품: 진영별로 켜졌나 */
  solo?: [boolean, boolean];
  /** 무한 궤도 부품: 이번 턴 한 번 더 움직일 수 있게 된 기물 (계획 미리보기용) */
  relaunch?: number[];
  /** 이번 턴 체크 보호를 받는 킹 id (시뮬레이션 중에만 쓴다) */
  checkGuard?: number[];
  /** 비상 퓨즈 부품을 쓴 진영 */
  fuseUsed?: [boolean, boolean];
  /** 죽음의 문턱이 남은 기물 (HP 0이 되면 한 번 HP 1로 버틴다 — 수직 조각 애착, D-153) */
  doorIds?: number[];
  /** 진영별 대국 기록 (결정타 · 처치 수) */
  record?: [BattleRecord, BattleRecord];
}

export interface BattleRecord {
  /** 상대 킹을 쓰러뜨린 기물의 유형 */
  finisher?: PieceType;
  /** 처치한 적 수 */
  kills?: number;
}

/** 계획 단계의 예약 한 건 (배열 순서가 곧 순번 #1, #2, …). 2.0에는 이동 하나뿐이다. */
export interface PlannedMove {
  kind?: 'move';
  pieceId: number;
  to: Pos;
}

export type PlanStep = PlannedMove;
export type Plan = PlanStep[];

export const isMove = (_step: PlanStep): _step is PlannedMove => true;

export interface HitResult {
  targetId: number;
  damage: number;
  shieldAbsorbed: number;
  hpAfter: number;
  killed: boolean;
  /** 튐 · 도미노 등 부가 피해 */
  splash?: boolean;
  /** 체크 규칙으로 킹이 HP 1에서 버텼다 */
  checked?: boolean;
  /** 비상 퓨즈 부품으로 HP 1에서 버텼다 */
  fuse?: boolean;
  /** 죽음의 문턱으로 HP 1에서 버텼다 */
  door?: boolean;
}

export type BattleEvent =
  | { type: 'move'; order: number; pieceId: number; from: Pos; to: Pos }
  | { type: 'promote'; pieceId: number; from: PieceType; to: PieceType }
  | { type: 'attack'; order: number; attackerId: number; area: Pos[]; hits: HitResult[]; /** 피해 배율 (1.05 초과일 때만, 화면 표시용) */ mult?: number; /** 더한 피해 (합, D-205 — 화면 표시용) */ add?: number }
  | { type: 'gameOver'; winner: Side }
  /** 명예로운 항복: 그 진영 킹이 왕관을 내려놓았다 (D-077) */
  | { type: 'resign'; side: Side; pieceId: number }
  /** 정체 압박: 피해 없는 라운드가 count번 이어졌다 (need번이면 붕괴 시작) */
  | { type: 'stall'; count: number; need: number }
  | { type: 'collapse'; ring: number; tiles: Pos[]; pushes: { pieceId: number; from: Pos; to: Pos; damage: number }[] }
  /** 더 무너질 곳이 없을 때 킹이 받는 피해 */
  | { type: 'suddenDeath'; hits: { pieceId: number; damage: number; hpAfter: number }[] }
  | { type: 'shield'; pieceId: number; amount: number }
  | { type: 'heal'; pieceId: number; amount: number }
  | { type: 'apGain'; side: Side; amount: number }
  /** 터짐 (도미노 부품 등): 그 칸에서 주변으로 */
  | { type: 'blast'; pos: Pos; label: string; hits: HitResult[]; /** 특수 기믹 연출 (D-203): 줄 폭격 · 되받아침 · 자폭 · 증기 폭발 — 일반 공격과 다른 모양 */ fx?: 'row' | 'thorns' | 'burst' | 'steam'; /** 되받아침: 반장 칸 */ from?: Pos }
  /** 양산 라인 비틀기: 쓰러진 폰이 뒷줄에 다시 섰다 */
  | { type: 'respawn'; pieceId: number; pos: Pos; /** 화면 안내 (없으면 양산 라인) */ label?: string };

export const otherSide = (side: Side): Side => (side === 0 ? 1 : 0);
