import { BASE_AP, PIECE_NAMES_KO } from '../data/pieces';
import { AI_STYLES, SCENARIOS, type BattleController, type HudView, type Scenario } from '../game/controller';
import { checkPlan, findPiece, toSquare, type Piece, type PieceType, type Side } from '../engine';

const GLYPH: Record<0 | 1, Record<PieceType, string>> = {
  0: { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙' },
  1: { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟' },
};
const VS15 = '︎';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

export class Hud implements HudView {
  private c!: BattleController;
  private toastTimer: number | undefined;
  private lastScenario: Scenario = SCENARIOS[0];
  private lastTier = 1;
  private lastStyle = 'scenario';

  bind(c: BattleController): void {
    this.c = c;
    $('btn-undo').addEventListener('click', () => c.undo());
    $('btn-reset').addEventListener('click', () => c.reset());
    $('btn-submit').addEventListener('click', () => void c.submit());
    $('btn-enchant').addEventListener('click', () => this.showEnchants());
    $('overlay').addEventListener('click', (e) => {
      if (e.target === $('overlay') && c.phase !== 'idle' && c.phase !== 'over') this.closeOverlay();
    });
    window.addEventListener('keydown', (e) => {
      if (!$('overlay').hidden) return;
      if (e.key === 'z' || e.key === 'Z') c.undo();
      else if (e.key === 'r' || e.key === 'R') c.reset();
      else if (e.key === ' ') {
        e.preventDefault();
        void c.submit();
      }
    });
    this.renderCards();
  }

  /** 액티브 카드 4칸 — 카드 시스템은 M4. 지금은 빈 슬롯만 둔다. */
  private renderCards(): void {
    $('cards').innerHTML = Array.from({ length: 4 }, () => '<div class="card-slot">액티브 카드<br>(M4)</div>').join('');
  }

  update(c: BattleController): void {
    const label = $('turn-label');
    const mine = c.phase === 'plan';
    label.textContent = c.phase === 'over' ? '전투 종료' : mine ? `${Math.ceil(c.state.turnNumber / 2)}턴 · 내 차례` : c.state.turnSide === 1 ? '적 차례' : '실행 중';
    label.classList.toggle('enemy', !mine && c.phase !== 'over');

    // 예약 목록 (순번 · 기물 · 좌표 이동)
    const q = $('queue');
    const rows: string[] = [];
    const full = c.pending ? [...c.plan, c.pending] : c.plan;
    full.forEach((m, i) => {
      const p = findPiece(c.state, m.pieceId);
      if (!p) return;
      const pending = c.pending !== null && i === full.length - 1;
      rows.push(
        `<li class="${pending ? 'pending' : ''}"><span class="no">${i + 1}</span><span class="glyph">${GLYPH[p.side][p.type]}${VS15}</span><span>${toSquare(p)} → ${toSquare(m.to)}</span></li>`,
      );
    });
    if (!rows.length && mine) rows.push('<li class="empty">기물을 눌러 이동을 예약하세요</li>');
    q.innerHTML = rows.join('');

    // AP 진공관 (숫자 없이)
    const total = c.apTotal;
    const left = total - checkPlan(c.state, full).apUsed;
    // 기본 AP를 넘는 칸은 이번 턴 보너스(요충지 등) — 황동색
    $('vials').innerHTML = Array.from({ length: total }, (_, i) => `<div class="vial${i < left ? ' full' : ''}${i >= BASE_AP ? ' bonus' : ''}"></div>`).join('');

    ($('btn-undo') as HTMLButtonElement).disabled = !mine || !c.plan.length;
    ($('btn-reset') as HTMLButtonElement).disabled = !mine || !c.plan.length;
    ($('btn-submit') as HTMLButtonElement).disabled = !mine;
  }

  toast(msg: string): void {
    const t = $('toast');
    t.textContent = msg;
    t.hidden = false;
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => (t.hidden = true), 1600);
  }

  showInfo(p: Piece, clientX: number, clientY: number): void {
    const el = $('info');
    const side = p.side === 0 ? '<span class="ally">아군</span>' : '<span class="enemy">적</span>';
    const buff = p.buffTurns > 0 ? `<br>버프: ATK +${Math.round(p.buffAtkPct * 100)}% · DEF +${p.buffDef} (${p.buffTurns}턴)` : '';
    el.innerHTML = `<b><span class="g">${GLYPH[p.side][p.type]}${VS15}</span> ${side} ${PIECE_NAMES_KO[p.type]}</b><br>HP ${p.hp} / ${p.maxHp}${p.shield ? ` · 보호막 ${p.shield}` : ''}<br>ATK ${p.atk} · DEF ${p.def}${buff}`;
    el.hidden = false;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    el.style.left = `${Math.min(window.innerWidth - w - 8, Math.max(8, clientX - w / 2))}px`;
    el.style.top = `${Math.max(8, clientY - h - 24)}px`;
  }

  hideInfo(): void {
    $('info').hidden = true;
  }

  private openOverlay(html: string): HTMLElement {
    const panel = $('overlay-panel');
    panel.innerHTML = html;
    $('overlay').hidden = false;
    return panel;
  }

  private closeOverlay(): void {
    $('overlay').hidden = true;
  }

  private showEnchants(): void {
    const panel = this.openOverlay(`
      <h2>인챈트</h2>
      <p>보유한 인챈트가 없습니다. 인챈트는 M4(성장 시스템)에서 추가됩니다.</p>
      <button class="choice primary" type="button" data-close>닫기</button>`);
    panel.querySelector('[data-close]')!.addEventListener('click', () => this.closeOverlay());
  }

  /** 전투 선택 화면 (그레이박스 테스트용) */
  showStart(): void {
    const sc = (s: Scenario) =>
      `<button class="choice" type="button" data-sc="${s.id}" aria-pressed="${s.id === this.lastScenario.id}">${s.title}<small>${s.desc}</small></button>`;
    const tier = (n: number) => `<button class="choice" type="button" data-tier="${n}" aria-pressed="${n === this.lastTier}">${n + 1}단계</button>`;
    const style = (s: (typeof AI_STYLES)[number]) =>
      `<button class="choice" type="button" data-style="${s.id}" aria-pressed="${s.id === this.lastStyle}">${s.label}</button>`;
    const panel = this.openOverlay(`
      <h1>PAWNISHER : CHECKMATE</h1>
      <p>그레이박스 단판 전투 (M2). 기물을 눌러 이동을 예약하고, 같은 칸을 한 번 더 누르면 확정됩니다. 예약한 순서대로 공격합니다.</p>
      <div class="choices">${SCENARIOS.map(sc).join('')}</div>
      <p>적 AI</p>
      <div class="row">${[0, 1, 2].map(tier).join('')}</div>
      <div class="row">${AI_STYLES.map(style).join('')}</div>
      <button class="choice primary" type="button" data-go>전투 시작</button>`);
    const press = (attr: string, value: string) =>
      panel.querySelectorAll(`[${attr}]`).forEach((b) => b.setAttribute('aria-pressed', String(b.getAttribute(attr) === value)));
    panel.querySelectorAll<HTMLElement>('[data-sc]').forEach((b) =>
      b.addEventListener('click', () => {
        this.lastScenario = SCENARIOS.find((s) => s.id === b.dataset.sc)!;
        press('data-sc', b.dataset.sc!);
      }),
    );
    panel.querySelectorAll<HTMLElement>('[data-tier]').forEach((b) =>
      b.addEventListener('click', () => {
        this.lastTier = Number(b.dataset.tier);
        press('data-tier', b.dataset.tier!);
      }),
    );
    panel.querySelectorAll<HTMLElement>('[data-style]').forEach((b) =>
      b.addEventListener('click', () => {
        this.lastStyle = b.dataset.style!;
        press('data-style', b.dataset.style!);
      }),
    );
    panel.querySelector('[data-go]')!.addEventListener('click', () => {
      this.closeOverlay();
      const weights = AI_STYLES.find((s) => s.id === this.lastStyle)!.weights;
      this.c.start(this.lastScenario, this.lastTier, weights);
    });
  }

  showResult(winner: Side): void {
    const win = winner === 0;
    const panel = this.openOverlay(`
      <h1>${win ? 'CHECKMATE' : 'DEFEAT'}</h1>
      <h2>${win ? '승리 — 적 킹을 쓰러뜨렸습니다' : '패배 — 내 킹이 쓰러졌습니다'}</h2>
      <div class="row">
        <button class="choice" type="button" data-menu>전투 선택</button>
        <button class="choice primary" type="button" data-again>다시 하기</button>
      </div>`);
    panel.querySelector('[data-menu]')!.addEventListener('click', () => this.showStart());
    panel.querySelector('[data-again]')!.addEventListener('click', () => {
      this.closeOverlay();
      const weights = AI_STYLES.find((s) => s.id === this.lastStyle)!.weights;
      this.c.start(this.lastScenario, this.lastTier, weights);
    });
  }
}
