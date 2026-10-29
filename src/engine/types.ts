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
  shield: number;
  /** 이번 라운드에 한 번이라도 이동했는가 (폰 첫 이동 2칸 판정용) */
  moved: boolean;
}

export interface BattleState {
  width: number;
  height: number;
  /** 살아 있는 기물만 담는다 */
  pieces: Piece[];
  /** 지금 차례인 진영 */
  turnSide: Side;
  /** 지금까지 시작된 턴 수 (양 진영 합산, 1부터) */
  turnNumber: number;
  winner: Side | null;
}

/** 계획 단계의 이동 예약 한 건. 배열 순서가 곧 순번(#1, #2, …)이다. */
export interface PlannedMove {
  pieceId: number;
  to: Pos;
}

export type Plan = PlannedMove[];

export interface HitResult {
  targetId: number;
  damage: number;
  shieldAbsorbed: number;
  hpAfter: number;
  killed: boolean;
}

export type BattleEvent =
  | { type: 'move'; order: number; pieceId: number; from: Pos; to: Pos }
  | { type: 'promote'; pieceId: number; from: PieceType; to: PieceType }
  | { type: 'attack'; order: number; attackerId: number; hits: HitResult[] }
  | { type: 'gameOver'; winner: Side };

export const otherSide = (side: Side): Side => (side === 0 ? 1 : 0);
