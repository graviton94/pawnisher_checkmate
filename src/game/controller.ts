import { AGGRESSIVE, DEFENSIVE, type Weights } from '../ai/evaluate';
import { AI_TIERS, choosePlan } from '../ai/search';
import { TUNED } from '../data/aiWeights';
import { CARDS } from '../data/cards';
import {
  addToPlan,
  availableAp,
  checkPlan,
  createBattle,
  moveCost,
  plannableMoves,
  resolveTurn,
  samePos,
  legalMoves,
  attackArea,
  specialSteps,
  undoLast,
  EMPTY_LOADOUT,
  ench,
  findPiece,
  type Loadout,
  type PlanStep,
  type BattleEvent,
  type BattleState,
  type Deck,
  type Piece,
  type Plan,
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
    desc: '폰 3 + 킹 vs 폰 2 + 킹. 4라운드부터 대성당이 무너집니다.',
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
    desc: '정통 체스 16기 대 16기. 3·6·9라운드에 요충지, 15라운드부터 붕괴.',
    width: 8,
    height: 8,
    decks: [
      ['K', 'Q', 'R', 'R', 'B', 'B', 'N', 'N', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
      ['K', 'Q', 'R', 'R', 'B', 'B', 'N', 'N', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
    ],
    weights: TUNED,
  },
];

export const AI_STYLES: { id: string; label: string; weights: Weights | null }[] = [
  { id: 'scenario', label: '기본', weights: null },
  { id: 'aggressive', label: '공격형', weights: AGGRESSIVE },
  { id: 'defensive', label: '수비형', weights: DEFENSIVE },
];

export type Phase = 'idle' | 'plan' | 'busy' | 'over';

/** 카드 모드: 왼쪽 카드를 눌러 고른 상태. fuse = 인챈트(E11) 합체 (카드 없음) */
export type Mode = { kind: 'card'; card: number } | { kind: 'fuse' } | null;

/** 선택 기물에서 고를 수 있는 다음 예약 하나와, 그 예약을 고르려고 누를 칸 */
export interface StepOption {
  step: PlanStep;
  pos: Pos;
}

/** 보드 렌더러에 넘기는 화면 모델 */
export interface BoardModel {
  state: BattleState;
  /** 계획(+미확정 미리보기)을 반영한 가상 보드 — 기물은 이 위치에 그린다 */
  virtual: BattleState;
  plan: Plan;
  pending: PlanStep | null;
  /** 미확정 예약을 고른 칸 */
  pendingPos: Pos | null;
  selectedId: number | null;
  destinations: Pos[];
  /** 갈 수 있는 칸 중 도착하면 적을 치는 칸 (kill = 처치까지) — 누르기 전에 결과가 보이게 */
  hitDests: { pos: Pos; kill: boolean }[];
  /** 미리보기 결과 */
  preview: BattleEvent[];
  /** 미리보기에서 파괴되는 기물 (파괴 시점 위치) — 보드에서 사라지기 전 모습으로 X 표시와 함께 그린다 */
  removed: Piece[];
  /** 누른 적 기물이 다음 턴에 갈 수 있는 칸과 칠 수 있는 칸 */
  threat: { moves: Pos[]; hits: Pos[] } | null;
  /** 적 의도: 지금 예약대로 제출하면 적이 둘 수와 내 기물이 받을 피해 */
  intent: Intent | null;
}

export interface Intent {
  /** 내 턴이 끝난 뒤(적 차례 시작) 보드 */
  state: BattleState;
  plan: Plan;
  hits: { pieceId: number; pos: Pos; damage: number; killed: boolean }[];
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

const sameStep = (a: PlanStep | null, b: PlanStep | null) => JSON.stringify(a) === JSON.stringify(b);

export class BattleController {
  state!: BattleState;
  plan: Plan = [];
  pending: PlanStep | null = null;
  pendingPos: Pos | null = null;
  selectedId: number | null = null;
  /** 위협 범위를 보고 있는 적 기물 */
  inspectId: number | null = null;
  mode: Mode = null;
  phase: Phase = 'idle';
  aiTier = 1;
  enemyWeights: Weights = TUNED;

  /** 런 전투용 훅: 내 차례가 시작될 때마다(자동 저장), 전투가 끝났을 때 */
  onPlayerTurn: ((s: BattleState) => void) | null = null;
  onBattleEnd: ((s: BattleState) => void) | null = null;

  constructor(private view: BoardView, private hud: HudView) {}

  /** 이미 만든 전투 상태로 시작한다 (런 전투·이어하기) */
  startState(state: BattleState, aiTier: number, weights: Weights): void {
    this.state = state;
    this.aiTier = aiTier;
    this.enemyWeights = weights;
    this.plan = [];
    this.clearPick();
    this.phase = 'plan';
    this.view.setup(this.state);
    this.refresh();
  }

  start(sc: Scenario, aiTier: number, weights: Weights | null, loadouts: [Loadout, Loadout] = [EMPTY_LOADOUT, EMPTY_LOADOUT]): void {
    this.onPlayerTurn = null;
    this.onBattleEnd = null;
    this.state = createBattle({ width: sc.width, height: sc.height, decks: sc.decks, loadouts });
    this.aiTier = aiTier;
    this.enemyWeights = weights ?? sc.weights;
    this.plan = [];
    this.clearPick();
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

  /** 지금까지 예약을 반영한 가상 보드 (카드 사용 상태 포함) */
  get virtual(): BattleState {
    return checkPlan(this.state, this.plan).virtual;
  }

  private clearPick(): void {
    this.inspectId = null;
    this.pending = null;
    this.pendingPos = null;
    this.selectedId = null;
    this.mode = null;
  }

  /** 미확정 미리보기까지 포함한 계획 */
  private get fullPlan(): Plan {
    return this.pending ? [...this.plan, this.pending] : this.plan;
  }

  /** 지금 모드에서 이 카드 슬롯이 붙는 attach 카드인가 */
  private get attachCard(): number | undefined {
    const m = this.mode;
    if (m?.kind !== 'card') return undefined;
    return CARDS[this.state.cards[this.state.turnSide][m.card].id].use === 'attach' ? m.card : undefined;
  }

  /** 모드의 특수 예약 후보 전부 (attach 카드·일반 모드면 제자리 공격만) */
  private specials(): PlanStep[] {
    const m = this.mode;
    const all = specialSteps(this.state, this.plan, Infinity);
    if (!m) return all.filter((st) => st.kind === 'stand');
    if (m.kind === 'fuse') return all.filter((st) => st.kind === 'fuse' && st.card === undefined);
    return all.filter((st) => 'card' in st && st.card === m.card);
  }

  /** 선택 기물의 다음 예약 후보 (GDD 1장 §1.4, 7장 카드 사용) */
  options(): StepOption[] {
    const sel = this.selectedId;
    if (sel === null) return [];
    const v = this.virtual;
    const posOf = (id: number) => findPiece(v, id) ?? { x: -1, y: -1 };
    const out: StepOption[] = [];
    const card = this.attachCard;
    if (!this.mode || card !== undefined) {
      for (const to of plannableMoves(this.state, this.plan, sel, card)) out.push({ step: card !== undefined ? { pieceId: sel, to, card } : { pieceId: sel, to }, pos: to });
      if (card !== undefined) return out;
    }
    for (const st of this.specials()) {
      switch (st.kind) {
        case 'stand':
        case 'shield':
        case 'promote':
          if (st.pieceId === sel) out.push({ step: st, pos: posOf(sel) });
          break;
        case 'gate':
          if (st.pieceId === sel) out.push({ step: st, pos: st.to });
          break;
        case 'fuse':
          if (st.pieceId === sel) out.push({ step: st, pos: posOf(st.partnerId) });
          break;
        case 'castle':
        case 'formShift':
          if (st.pieceId === sel) out.push({ step: st, pos: posOf(st.partnerId) });
          else if (st.partnerId === sel) out.push({ step: st, pos: posOf(st.pieceId) });
          break;
      }
    }
    return out;
  }

  model(): BoardModel {
    const full = this.fullPlan;
    const check = checkPlan(this.state, full);
    return {
      state: this.state,
      virtual: check.virtual,
      plan: this.plan,
      pending: this.pending,
      pendingPos: this.pendingPos,
      selectedId: this.selectedId,
      destinations: this.options().map((o) => o.pos),
      hitDests: this.hitDests(),
      preview: check.ok ? check.events : [],
      removed: check.ok ? check.removed : [],
      threat: this.threatOf(),
      intent: this.intent(),
    };
  }

  private intentCache: { key: string; value: Intent | null } | null = null;

  /**
   * 적 의도 예고 (Into the Breach·슬서식): AI는 결정적이라, 지금 예약대로 제출하면 적이 둘 수를 정확히 계산해 보여 준다.
   * 확정된 예약이 바뀔 때만 다시 계산한다.
   */
  private intent(): Intent | null {
    if (this.phase !== 'plan' || !this.state || this.state.winner !== null) return null;
    const key = `${this.state.turnNumber}|${JSON.stringify(this.plan)}`;
    if (this.intentCache?.key === key) return this.intentCache.value;
    let value: Intent | null = null;
    const mine = resolveTurn(this.state, this.plan);
    if (mine.state.winner === null) {
      const next = mine.state;
      const plan = choosePlan(next, { tier: AI_TIERS[this.aiTier], weights: this.enemyWeights });
      const after = resolveTurn(next, plan);
      const dmg = new Map<number, { damage: number; killed: boolean }>();
      for (const e of after.events) {
        if (e.type !== 'attack') continue;
        for (const h of e.hits) {
          const cur = dmg.get(h.targetId) ?? { damage: 0, killed: false };
          dmg.set(h.targetId, { damage: cur.damage + h.damage, killed: cur.killed || h.killed });
        }
      }
      const hits = [...dmg.entries()].flatMap(([id, d]) => {
        const p = findPiece(next, id);
        return p && p.side === this.state.turnSide ? [{ pieceId: id, pos: { x: p.x, y: p.y }, ...d }] : [];
      });
      value = { state: next, plan, hits };
    }
    this.intentCache = { key, value };
    return value;
  }

  /** 선택 기물의 각 후보를 실행해 보고, 그 순번 공격이 적을 맞히는 칸만 고른다 */
  private hitDests(): { pos: Pos; kill: boolean }[] {
    if (this.selectedId === null) return [];
    const order = this.plan.length;
    const out: { pos: Pos; kill: boolean }[] = [];
    for (const o of this.options()) {
      const sim = checkPlan(this.state, [...this.plan, o.step]);
      if (!sim.ok) continue;
      const hits = sim.events.flatMap((e) => (e.type === 'attack' && e.order === order ? e.hits : []));
      if (hits.length) out.push({ pos: o.pos, kill: hits.some((h) => h.killed) });
    }
    return out;
  }

  /** 적 기물의 다음 턴 위협: 이동할 수 있는 칸과, 그 칸들에서 칠 수 있는 칸 전부 */
  private threatOf(): { moves: Pos[]; hits: Pos[] } | null {
    if (this.inspectId === null) return null;
    const v = this.virtual;
    const p = findPiece(v, this.inspectId);
    if (!p || p.side === v.turnSide) return null;
    const enemyView = { ...v, turnSide: p.side };
    const moves = legalMoves(enemyView, p);
    const hits = new Map<string, Pos>();
    for (const to of moves) for (const a of attackArea(enemyView, { ...p, x: to.x, y: to.y })) hits.set(`${a.x},${a.y}`, a);
    return { moves, hits: [...hits.values()] };
  }

  private refresh(): void {
    this.view.render(this.model());
    this.hud.update(this);
  }

  /** 계획 중인 가상 보드 기준으로 그 칸의 기물 */
  private pieceAtVirtual(pos: Pos) {
    return this.virtual.pieces.find((p) => p.x === pos.x && p.y === pos.y);
  }

  /** 카드(또는 인챈트 합체)를 고른다. 같은 것을 다시 누르면 해제. */
  arm(mode: Mode): void {
    if (this.phase !== 'plan') return;
    const same = JSON.stringify(mode) === JSON.stringify(this.mode);
    this.pending = null;
    this.pendingPos = null;
    this.selectedId = null;
    this.mode = same ? null : mode;
    if (this.mode) {
      const anchors = this.anchorIds();
      if (this.attachCard === undefined && !anchors.size) {
        this.hud.toast('지금은 쓸 수 있는 대상이 없습니다');
        this.mode = null;
      } else if (this.mode.kind === 'card') {
        this.hud.toast(CARDS[this.state.cards[this.state.turnSide][this.mode.card].id].desc);
      } else this.hud.toast('합체할 두 기물을 차례로 누르세요');
    }
    this.refresh();
  }

  /** 지금 모드에서 고를 수 있는 기물 */
  private anchorIds(): Set<number> {
    const ids = new Set<number>();
    for (const st of this.specials()) {
      ids.add(st.pieceId);
      if (st.kind === 'castle' || st.kind === 'formShift') ids.add(st.partnerId);
    }
    return ids;
  }

  /** 칸을 눌렀다. 갈 수 있는 칸이면 바로 예약 (마우스는 호버로 미리보기) */
  tap(pos: Pos, _touch: boolean): void {
    if (this.phase !== 'plan') return;

    if (this.selectedId !== null) {
      const opts = this.options().filter((o) => samePos(o.pos, pos));
      if (opts.length) {
        // 같은 칸에 후보가 여럿이면(예: 캐슬링 방향) 첫 후보
        // 한 번 누르면 바로 예약된다 (모바일 투탭 미리보기는 예약이 조용히 사라지는 문제가 있어 없앴다 — 잘못 누르면 되돌리기)
        const step = opts.find((o) => sameStep(o.step, this.pending))?.step ?? opts[0].step;
        this.confirm(step);
        this.refresh();
        return;
      }
    }

    const p = this.pieceAtVirtual(pos);
    this.pending = null;
    this.pendingPos = null;
    const mine = p && p.side === this.state.turnSide;
    // 적 기물을 누르면 다음 턴 위협 범위를 보여 준다 (다시 누르면 끈다)
    if (p && !mine) {
      this.inspectId = this.inspectId === p.id ? null : p.id;
      this.selectedId = null;
      this.refresh();
      return;
    }
    this.inspectId = null;
    if (mine && this.selectedId === p.id) {
      this.selectedId = null;
    } else if (mine && this.mode && this.attachCard === undefined) {
      // 카드 모드: 그 카드를 쓸 수 있는 기물만 고른다 (보호막·폼 시프트는 이미 행동한 기물도 가능)
      if (this.anchorIds().has(p.id)) this.selectedId = p.id;
      else {
        this.selectedId = null;
        this.hud.toast('이 기물에는 쓸 수 없습니다');
      }
    } else if (mine && !this.plan.some((st) => 'pieceId' in st && st.pieceId === p.id && st.kind !== 'shield' && st.kind !== 'formShift')) {
      this.selectedId = p.id;
      const left = this.apTotal - this.apUsed;
      if (moveCost(this.virtual, p) > left && !this.options().length) this.hud.toast(`AP가 부족합니다 (필요 ${moveCost(this.virtual, p)})`);
      else if (!this.options().length) this.hud.toast('갈 수 있는 칸이 없습니다');
    } else {
      this.selectedId = null;
    }
    this.refresh();
  }

  /** 마우스 호버 미리보기 */
  hover(pos: Pos | null): void {
    if (this.phase !== 'plan' || this.selectedId === null) return;
    const opt = pos ? this.options().find((o) => samePos(o.pos, pos)) : undefined;
    const next = opt?.step ?? null;
    if (sameStep(next, this.pending)) return;
    this.pending = next;
    this.pendingPos = opt?.pos ?? null;
    this.refresh();
  }

  private confirm(step: PlanStep): void {
    const next = addToPlan(this.state, this.plan, step);
    if (next) this.plan = next;
    this.clearPick();
  }

  /** 인챈트 합체(E11)를 쓸 수 있는가 — 카드 레일에 합체 버튼을 띄운다 */
  get canEnchantFuse(): boolean {
    return !!this.state && ench(this.state, 0, 'E11') >= 1;
  }

  /** 디버그: 플레이어 차례를 AI가 대신 예약한다 (?debug) */
  autoPlan(): void {
    if (this.phase !== 'plan') return;
    this.clearPick();
    this.plan = choosePlan(this.state, { tier: AI_TIERS[1], weights: AGGRESSIVE });
    this.refresh();
  }

  undo(): void {
    if (this.phase !== 'plan') return;
    this.clearPick();
    this.plan = undoLast(this.plan);
    this.refresh();
  }

  reset(): void {
    if (this.phase !== 'plan') return;
    this.clearPick();
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
    this.clearPick();
    await this.runTurn(this.plan);
    if (this.isOver()) return;
    await this.enemyTurn();
  }

  private async runTurn(plan: Plan): Promise<void> {
    this.phase = 'busy';
    const before = this.state;
    const { state, events } = resolveTurn(before, plan);
    this.plan = [];
    this.view.render({ ...this.model(), state: before, virtual: before, plan: [], preview: [], removed: [], destinations: [], hitDests: [], threat: null, intent: null });
    this.hud.update(this);
    await this.view.play(before, events);
    this.state = state;
    this.view.setup(this.state);
    if (state.winner !== null) {
      this.phase = 'over';
      this.refresh();
      if (this.onBattleEnd) this.onBattleEnd(state);
      else this.hud.showResult(state.winner);
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
      this.onPlayerTurn?.(this.state);
      this.refresh();
    }
  }
}
