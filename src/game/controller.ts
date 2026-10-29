import { AGGRESSIVE, BALANCED, DEFENSIVE, type Weights } from '../ai/evaluate';
import { AI_TIERS, choosePlan } from '../ai/search';
import {
  addToPlan,
  availableAp,
  checkPlan,
  createBattle,
  moveCost,
  plannableMoves,
  resolveTurn,
  samePos,
  undoLast,
  type BattleEvent,
  type BattleState,
  type Deck,
  type Plan,
  type PlannedMove,
  type Pos,
  type Side,
} from '../engine';

export interface Scenario {
  id: string;
  title: string;
  desc: string;
  width: number;
  height: number;
  decks: [Deck, Deck];
  weights: Weights;
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'trainA',
    title: '온보딩 A · 6×6',
    desc: '폰 3 + 킹 vs 폰 2 + 킹. 폰의 대각선 공격과 킹의 위험·보상.',
    width: 6,
    height: 6,
    decks: [['K', 'P', 'P', 'P'], ['K', 'P', 'P']],
    weights: AGGRESSIVE,
  },
  {
    id: 'trainB',
    title: '온보딩 B · 6×6',
    desc: '폰 2 + 나이트 + 킹 vs 폰 2 + 비숍 + 킹. 길을 열고 뒤에서 치는 순차 공격.',
    width: 6,
    height: 6,
    decks: [['K', 'P', 'P', 'N'], ['K', 'P', 'P', 'B']],
    weights: AGGRESSIVE,
  },
  {
    id: 'full',
    title: '정규 교전 · 8×8',
    desc: '정통 체스 16기 대 16기.',
    width: 8,
    height: 8,
    decks: [
      ['K', 'Q', 'R', 'R', 'B', 'B', 'N', 'N', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
      ['K', 'Q', 'R', 'R', 'B', 'B', 'N', 'N', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
    ],
    weights: BALANCED,
  },
];

export const AI_STYLES: { id: string; label: string; weights: Weights | null }[] = [
  { id: 'scenario', label: '기본', weights: null },
  { id: 'aggressive', label: '공격형', weights: AGGRESSIVE },
  { id: 'defensive', label: '수비형', weights: DEFENSIVE },
];

export type Phase = 'idle' | 'plan' | 'busy' | 'over';

/** 보드 렌더러에 넘기는 화면 모델 */
export interface BoardModel {
  state: BattleState;
  /** 계획(+미확정 미리보기)을 반영한 가상 보드 — 기물은 이 위치에 그린다 */
  virtual: BattleState;
  plan: Plan;
  pending: PlannedMove | null;
  selectedId: number | null;
  destinations: Pos[];
  /** 미리보기 결과 */
  preview: BattleEvent[];
}

export interface BoardView {
  setup(state: BattleState): void;
  render(model: BoardModel): void;
  /** 실행 연출. 끝나면 resolve. */
  play(before: BattleState, events: BattleEvent[]): Promise<void>;
  /** 적 계획을 잠깐 보여 준다 */
  showPlan(state: BattleState, plan: Plan): Promise<void>;
}

export interface HudView {
  update(c: BattleController): void;
  toast(msg: string): void;
  showResult(winner: Side): void;
}

export class BattleController {
  state!: BattleState;
  plan: Plan = [];
  pending: PlannedMove | null = null;
  selectedId: number | null = null;
  phase: Phase = 'idle';
  aiTier = 1;
  enemyWeights: Weights = BALANCED;

  constructor(private view: BoardView, private hud: HudView) {}

  start(sc: Scenario, aiTier: number, weights: Weights | null): void {
    this.state = createBattle({ width: sc.width, height: sc.height, decks: sc.decks });
    this.aiTier = aiTier;
    this.enemyWeights = weights ?? sc.weights;
    this.plan = [];
    this.pending = null;
    this.selectedId = null;
    this.phase = 'plan';
    this.view.setup(this.state);
    this.refresh();
  }

  get apTotal(): number {
    return availableAp(this.state);
  }

  get apUsed(): number {
    return checkPlan(this.state, this.plan).apUsed;
  }

  /** 미확정 미리보기까지 포함한 계획 */
  private get fullPlan(): Plan {
    return this.pending ? [...this.plan, this.pending] : this.plan;
  }

  model(): BoardModel {
    const full = this.fullPlan;
    const check = checkPlan(this.state, full);
    const preview = check.ok && full.length ? resolveTurn(this.state, full).events : [];
    return {
      state: this.state,
      virtual: check.virtual,
      plan: this.plan,
      pending: this.pending,
      selectedId: this.selectedId,
      destinations: this.selectedId !== null ? plannableMoves(this.state, this.plan, this.selectedId) : [],
      preview,
    };
  }

  private refresh(): void {
    this.view.render(this.model());
    this.hud.update(this);
  }

  /** 계획 중인 가상 보드 기준으로 그 칸의 기물 */
  private pieceAtVirtual(pos: Pos) {
    const v = checkPlan(this.state, this.plan).virtual;
    return v.pieces.find((p) => p.x === pos.x && p.y === pos.y);
  }

  /** 칸을 눌렀다. touch = 투탭(미리보기 → 확정), mouse = 클릭 즉시 확정 (GDD 9장 §9.6) */
  tap(pos: Pos, touch: boolean): void {
    if (this.phase !== 'plan') return;

    if (this.selectedId !== null) {
      const dests = plannableMoves(this.state, this.plan, this.selectedId);
      if (dests.some((d) => samePos(d, pos))) {
        const move = { pieceId: this.selectedId, to: pos };
        if (!touch || (this.pending && samePos(this.pending.to, pos))) this.confirm(move);
        else this.pending = move;
        this.refresh();
        return;
      }
    }

    const p = this.pieceAtVirtual(pos);
    this.pending = null;
    if (p && p.side === this.state.turnSide && !this.plan.some((m) => m.pieceId === p.id)) {
      if (this.selectedId === p.id) {
        this.selectedId = null;
      } else {
        this.selectedId = p.id;
        const left = this.apTotal - this.apUsed;
        if (moveCost(p) > left) this.hud.toast(`AP가 부족합니다 (필요 ${moveCost(p)})`);
        else if (!plannableMoves(this.state, this.plan, p.id).length) this.hud.toast('갈 수 있는 칸이 없습니다');
      }
    } else {
      this.selectedId = null;
    }
    this.refresh();
  }

  /** 마우스 호버 미리보기 */
  hover(pos: Pos | null): void {
    if (this.phase !== 'plan' || this.selectedId === null) return;
    const dests = plannableMoves(this.state, this.plan, this.selectedId);
    const next = pos && dests.some((d) => samePos(d, pos)) ? { pieceId: this.selectedId, to: pos } : null;
    if ((next?.to.x ?? -1) === (this.pending?.to.x ?? -1) && (next?.to.y ?? -1) === (this.pending?.to.y ?? -1)) return;
    this.pending = next;
    this.refresh();
  }

  private confirm(move: PlannedMove): void {
    const next = addToPlan(this.state, this.plan, move);
    if (next) this.plan = next;
    this.pending = null;
    this.selectedId = null;
  }

  /** 디버그: 플레이어 차례를 AI가 대신 예약한다 (?debug) */
  autoPlan(): void {
    if (this.phase !== 'plan') return;
    this.pending = null;
    this.selectedId = null;
    this.plan = choosePlan(this.state, { tier: AI_TIERS[1], weights: AGGRESSIVE });
    this.refresh();
  }

  undo(): void {
    if (this.phase !== 'plan') return;
    this.pending = null;
    this.selectedId = null;
    this.plan = undoLast(this.plan);
    this.refresh();
  }

  reset(): void {
    if (this.phase !== 'plan') return;
    this.pending = null;
    this.selectedId = null;
    this.plan = [];
    this.refresh();
  }

  private isOver(): boolean {
    return this.phase === 'over';
  }

  /** 길게 누르기 정보용: 지금 화면(가상 보드)에서 그 칸의 기물 */
  pieceInfo(pos: Pos) {
    return this.state ? this.pieceAtVirtual(pos) : undefined;
  }

  async submit(): Promise<void> {
    if (this.phase !== 'plan') return;
    this.pending = null;
    this.selectedId = null;
    await this.runTurn(this.plan);
    if (this.isOver()) return;
    await this.enemyTurn();
  }

  private async runTurn(plan: Plan): Promise<void> {
    this.phase = 'busy';
    const before = this.state;
    const { state, events } = resolveTurn(before, plan);
    this.plan = [];
    this.view.render({ ...this.model(), state: before, virtual: before, plan: [], preview: [], destinations: [] });
    this.hud.update(this);
    await this.view.play(before, events);
    this.state = state;
    this.view.setup(this.state);
    if (state.winner !== null) {
      this.phase = 'over';
      this.refresh();
      this.hud.showResult(state.winner);
      return;
    }
    this.refresh();
  }

  private async enemyTurn(): Promise<void> {
    this.phase = 'busy';
    this.hud.update(this);
    // 화면이 먼저 그려지도록 한 프레임 양보한 뒤 생각한다
    await new Promise((r) => setTimeout(r, 30));
    const plan = choosePlan(this.state, { tier: AI_TIERS[this.aiTier], weights: this.enemyWeights });
    await this.view.showPlan(this.state, plan);
    await this.runTurn(plan);
    if (!this.isOver()) {
      this.phase = 'plan';
      this.refresh();
    }
  }
}
