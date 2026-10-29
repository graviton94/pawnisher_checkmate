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
}

/** 전투별 규칙 설정 (스테이지 데이터로 정한다) */
export interface BattleRules {
  /** 요충지를 생성하는 라운드 (플레이어 턴 시작 직전). 빈 배열이면 요충지 없음 (GDD 5장) */
  strongholdRounds: number[];
  /** 붕괴하는 대성당 시작 라운드. null이면 붕괴 없음 (D-014) */
  collapseStart: number | null;
  /** 붕괴 간격 (라운드) */
  collapseInterval: number;
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
  /** 무너진 테두리 줄 수. 유효 보드 = [ring, width−1−ring] × [ring, height−1−ring] */
  ring: number;
  /** 이번 턴에만 쓰는 추가 AP (진영별) */
  apBonus: [number, number];
  lastStrike: [LastStrike, LastStrike];
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
  | { type: 'attack'; order: number; attackerId: number; area: Pos[]; hits: HitResult[] }
  | { type: 'gameOver'; winner: Side }
  | { type: 'lastStrike'; pieceId: number }
  | { type: 'awaken'; side: Side; pieceId: number }
  | { type: 'strongholdSpawn'; pos: Pos; standings: [Standing, Standing] }
  | { type: 'strongholdCapture'; side: Side; pieceId: number; tier: 1 | 2 | 3; behind: boolean }
  | { type: 'strongholdLost' }
  | { type: 'collapse'; ring: number; pushes: { pieceId: number; from: Pos; to: Pos; damage: number }[] };

export const otherSide = (side: Side): Side => (side === 0 ? 1 : 0);
