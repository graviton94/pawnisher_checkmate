import { sfx } from '../audio/sfx';
import { STALL } from '../data/battle';
import { BASE_AP, PIECE_NAMES_KO } from '../data/pieces';
import { pieceImg } from './sprites';
import { AI_STYLES, SCENARIOS, type BattleController, type HudView, type Scenario } from '../game/controller';
import { CARDS, CARD_SLOTS, type CardId } from '../data/cards';
import { ENCHANTS, ENCHANT_MAX_STACK, ENCHANT_SLOTS, type EnchantId } from '../data/enchants';
import { FORGE_MAX } from '../data/forge';
import { checkPlan, ench, findPiece, toSquare, type BattleState, type Loadout, type Piece, type PieceType, type PlanStep, type Side } from '../engine';


const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

/** 예약 목록 한 줄: 좌표 이동 또는 특수 행동 이름 (+붙인 카드) */
const describeStep = (s: BattleState, m: PlanStep): string => {
  const p = findPiece(s, m.pieceId);
  const from = p ? toSquare(p) : '?';
  const cardName = (idx?: number) => (idx !== undefined && s.cards[s.turnSide][idx] ? ` · ${CARDS[s.cards[s.turnSide][idx].id].name}` : '');
  switch (m.kind) {
    case undefined:
    case 'move':
      return `${from} → ${toSquare(m.to)}${cardName(m.card)}`;
    case 'stand':
      return `${from} 제자리 공격`;
    case 'castle':
      return `${from} ⇄ ${toSquare(findPiece(s, m.partnerId) ?? { x: 0, y: 0 })}${cardName(m.card)}`;
    case 'shield':
      return `${from} 보호막${cardName(m.card)}`;
    case 'gate':
      return `${from} ⇢ ${toSquare(m.to)}${cardName(m.card)}`;
    case 'promote':
      return `${from} 퀸 승급${cardName(m.card)}`;
    case 'fuse':
      return `${from} + ${toSquare(findPiece(s, m.partnerId) ?? { x: 0, y: 0 })} 합체${cardName(m.card)}`;
    case 'formShift':
      return `${from} ⇄ 폼 시프트${cardName(m.card)}`;
  }
};

export class Hud implements HudView {
  private c!: BattleController;
  private toastTimer: number | undefined;
  private lastScenario: Scenario = SCENARIOS[0];
  private lastTier = 1;
  private lastStyle = 'scenario';
  private loadout: Loadout = { enchants: {}, cards: [], forge: {} };
  /** 메인 메뉴로 (등반 화면이 설정) */
  onMenu: (() => void) | null = null;
  private enemyMirror = false;

  bind(c: BattleController): void {
    this.c = c;
    $('btn-undo').addEventListener('click', () => c.undo());
    $('btn-reset').addEventListener('click', () => c.reset());
    $('btn-submit').addEventListener('click', () => {
      if (c.phase === 'plan') sfx('submit');
      void c.submit();
    });
    $('queue').addEventListener('click', (e) => {
      const li = (e.target as HTMLElement).closest('[data-log]') as HTMLElement | null;
      if (li) c.showLog(Number(li.dataset.log));
    });
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
        if (c.phase === 'plan') sfx('submit');
        void c.submit();
      }
    });
    $('cards').addEventListener('click', (e) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-card]');
      if (!el) return;
      const v = el.dataset.card!;
      c.arm(v === 'fuse' ? { kind: 'fuse' } : { kind: 'card', card: Number(v) });
    });
  }

  /** 액티브 카드 4칸 (TCG 비율). 계획에서 이미 쓴 카드는 흐리게, 고른 카드는 황동 테두리. */
  private renderCards(c: BattleController): void {
    if (!c.state) return;
    const side = 0;
    const v = c.virtual;
    const slots: string[] = [];
    v.cards[side].forEach((slot, i) => {
      const def = CARDS[slot.id];
      const armed = c.mode?.kind === 'card' && c.mode.card === i;
      const lim = def.limit;
      const status = slot.spent
        ? lim.type === 'consume' ? '사용함' : '이번 라운드 사용함'
        : slot.cooldown > 0
          ? `쿨타임 ${slot.cooldown}`
          : lim.type === 'consume' ? '1회용' : lim.type === 'round' ? '라운드 1회' : `쿨타임 ${lim.turns}`;
      const off = slot.spent || slot.cooldown > 0 || c.phase !== 'plan';
      slots.push(
        `<button type="button" class="card ${slot.id[0] === 'C' ? 'consume' : ''}${armed ? ' armed' : ''}" data-card="${i}" ${off ? 'disabled' : ''}>
          <span class="card-name">${def.name}</span>
          <span class="card-desc">${def.desc}</span>
          <span class="card-tag">${def.ap ? `AP ${def.ap} · ` : ''}${status}</span>
        </button>`,
      );
    });
    if (c.canEnchantFuse) {
      const armed = c.mode?.kind === 'fuse';
      while (slots.length < CARD_SLOTS) slots.push('<div class="card-slot" aria-label="빈 카드 슬롯"></div>');
      slots.push(
        `<button type="button" class="card wide${armed ? ' armed' : ''}" data-card="fuse" ${c.phase !== 'plan' ? 'disabled' : ''}>
          <span class="card-name">합체 · ${ENCHANTS.E11.name}</span>
          <span class="card-tag">AP ${(c.state.loadouts[0].enchants.E11 ?? 0) >= 3 ? 0 : CARDS.C05.ap}</span>
        </button>`,
      );
    }
    while (slots.length < CARD_SLOTS) slots.push('<div class="card-slot" aria-label="빈 카드 슬롯"></div>');
    $('cards').innerHTML = slots.join('');
  }

  update(c: BattleController): void {
    this.renderCards(c);
    const label = $('turn-label');
    const mine = c.phase === 'plan';
    // 정체 압박 (D-072): 피해 없는 라운드가 이어지면 "정체 n/2" — 다 차면 판이 무너지기 시작한다
    const stall = c.state.stall?.count ?? 0;
    const stallTag = stall > 0 && c.phase !== 'over' ? ` · 정체 ${Math.min(stall, STALL.rounds)}/${STALL.rounds}` : '';
    label.textContent = (c.phase === 'over' ? '전투 종료' : mine ? `${Math.ceil(c.state.turnNumber / 2)}턴 · 내 차례` : c.state.turnSide === 1 ? '적 차례' : '실행 중') + stallTag;
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
        `<li class="${pending ? 'pending' : ''}"><span class="no">${i + 1}</span><span class="glyph">${pieceImg(p.type, p.side, 'small', 26)}</span><span>${describeStep(c.state, m)}</span></li>`,
      );
    });
    if (!rows.length && mine && c.log.length) {
      // 기록 줄 (D-073, 하스스톤식): 내 지난 턴 + 적 지난 턴 — 누르면 그 수를 판에 다시 보여 준다
      c.log.slice(-6).forEach((e, k) => {
        const i = c.log.length - Math.min(6, c.log.length) + k;
        const dmg = e.targets.reduce((a, t) => a + t.damage, 0);
        const kill = e.targets.some((t) => t.killed);
        const tg = e.targets.slice(0, 2).map((t) => pieceImg(t.type, t.side, 'small', 22)).join('') + (e.targets.length > 2 ? `<small>+${e.targets.length - 2}</small>` : '');
        rows.push(
          `<li class="log ${e.side === 0 ? 'mine' : 'enemy'}" data-log="${i}"><span class="who">${e.side === 0 ? '내' : '적'} #${e.order + 1}</span><span class="glyph">${pieceImg(e.attacker.type, e.attacker.side, 'small', 22)}</span><span class="to">→</span><span class="glyph">${tg}</span><span class="dmg${kill ? ' kill' : ''}">-${dmg}${kill ? '<i class="skull" aria-label="처치"></i>' : ''}</span></li>`,
        );
      });
    }
    if (!rows.length && mine) {
      const hint = ench(c.state, 0, 'E16')
        ? '<span style="color:#ff6b6b">붉은 화살표 = 지금 제출하면 적이 둘 수 (미래 예지)</span>'
        : '<span style="color:var(--muted)">적 기물을 누르면 위협 범위가 보입니다</span>';
      rows.push(`<li class="empty">기물을 눌러 이동을 예약하세요<br>${hint}</li>`);
    }
    q.innerHTML = rows.join('');

    // AP 진공관 (숫자 없이)
    const total = c.apTotal;
    const left = total - checkPlan(c.state, full).apUsed;
    // 기본 AP를 넘는 칸은 이번 턴 보너스(요충지 등) — 황동색
    $('vials').innerHTML = Array.from({ length: total }, (_, i) => `<div class="wing${i < left ? ' full' : ''}${i >= BASE_AP ? ' bonus' : ''}"></div>`).join('');

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
    const extra: string[] = [];
    if (p.fused) extra.push(`합체: ${p.fused.map((ty) => PIECE_NAMES_KO[ty]).join(' + ')}`);
    if (p.formAs) extra.push(`폼 시프트: ${PIECE_NAMES_KO[p.formAs]} 행마`);
    const forge = this.c.state?.loadouts?.[p.side]?.forge[p.type] ?? 0;
    if (forge) extra.push(`대장간 +${forge}`);
    const more = extra.length ? `<br>${extra.join('<br>')}` : '';
    const buff = p.buffTurns > 0 ? `<br>버프: ATK +${Math.round(p.buffAtkPct * 100)}% · DEF +${p.buffDef} (${p.buffTurns}턴)` : '';
    el.innerHTML = `<b>${pieceImg(p.type, p.side, 'small', 24)} ${side} ${PIECE_NAMES_KO[p.type]}</b><br>HP ${p.hp} / ${p.maxHp}${p.shield ? ` · 보호막 ${p.shield}` : ''}<br>ATK ${p.atk} · DEF ${p.def}${buff}${more}${p.type === 'K' && this.c.state?.rules.checkmate ? `<br>${p.hp === 1 ? '<span class="enemy">체크 — 다음에 맞으면 쓰러짐</span>' : '체크메이트: 한 턴에 HP 1 아래로 떨어지지 않음'}` : ''}`;
    el.hidden = false;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    el.style.left = `${Math.min(window.innerWidth - w - 8, Math.max(8, clientX - w / 2))}px`;
    el.style.top = `${Math.max(8, clientY - h - 24)}px`;
  }

  /** 요충지 길게 누르기: 등급 · 필요 턴 · 엄폐 */
  showStrongholdInfo(text: string, clientX: number, clientY: number): void {
    const el = $('info');
    el.innerHTML = text;
    el.hidden = false;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    el.style.left = `${Math.min(window.innerWidth - w - 8, Math.max(8, clientX - w / 2))}px`;
    el.style.top = `${Math.max(8, clientY - h - 24)}px`;
  }

  hideInfo(): void {
    $('info').hidden = true;
  }

  openOverlay(html: string): HTMLElement {
    const panel = $('overlay-panel');
    panel.innerHTML = html;
    $('overlay').hidden = false;
    return panel;
  }

  closeOverlay(): void {
    $('overlay').hidden = true;
  }

  private showEnchants(): void {
    const lo = this.c.state?.loadouts?.[0];
    const held = lo ? (Object.entries(lo.enchants) as [EnchantId, number][]).filter(([, n]) => n > 0) : [];
    const rows = held.map(([id, n]) => {
      const def = ENCHANTS[id];
      const lv = def.levels.map((d, i) => `<li class="${i < n ? 'on' : ''}">${i + 1}장 · ${d}</li>`).join('');
      return `<div class="ench"><b>${def.name}</b> <small>${def.target} · ${n}/${ENCHANT_MAX_STACK}${n >= 3 ? ' ★' : ''}</small><ul>${lv}</ul></div>`;
    });
    const forge = lo ? (Object.entries(lo.forge) as [PieceType, number][]).filter(([, n]) => n > 0) : [];
    const forgeLine = forge.length ? `<p>대장간: ${forge.map(([ty, n]) => `${PIECE_NAMES_KO[ty]} +${n}`).join(' · ')}</p>` : '';
    const panel = this.openOverlay(`
      <h2>인챈트</h2>
      ${rows.length ? rows.join('') : '<p>보유한 인챈트가 없습니다. 전투 선택 화면의 「장비」에서 시험용 인챈트를 고를 수 있습니다.</p>'}
      ${forgeLine}
      <button class="choice primary" type="button" data-close>닫기</button>`);
    panel.querySelector('[data-close]')!.addEventListener('click', () => this.closeOverlay());
  }

  /** 시험용 장비 편집 (M4): 인챈트 장 수 · 카드 4장 · 대장간 강화를 눌러서 바꾼다 */
  private showLoadout(): void {
    const lo = this.loadout;
    const enchCount = () => Object.values(lo.enchants).filter((n) => (n ?? 0) > 0).length;
    const draw = () => {
      const ench = (Object.keys(ENCHANTS) as EnchantId[])
        .map((id) => {
          const n = lo.enchants[id] ?? 0;
          return `<button class="chip${n ? ' on' : ''}" type="button" data-ench="${id}"><b>${ENCHANTS[id].name}</b><small>${ENCHANTS[id].target} · ${n ? `${n}장${n >= 3 ? ' ★' : ''}` : '없음'}</small></button>`;
        })
        .join('');
      const cards = (Object.keys(CARDS) as CardId[])
        .map((id) => `<button class="chip${lo.cards.includes(id) ? ' on' : ''}" type="button" data-cardpick="${id}"><b>${CARDS[id].name}</b><small>${CARDS[id].desc}</small></button>`)
        .join('');
      const forge = (['P', 'N', 'B', 'R', 'Q', 'K'] as PieceType[])
        .map((ty) => {
          const n = lo.forge[ty] ?? 0;
          return `<button class="chip small${n ? ' on' : ''}" type="button" data-forge="${ty}"><b>${PIECE_NAMES_KO[ty]}</b><small>+${n}</small></button>`;
        })
        .join('');
      const panel = this.openOverlay(`
        <h2>장비 (시험용)</h2>
        <p>누를 때마다 단계가 오릅니다. 인챈트 최대 ${ENCHANT_SLOTS}종 · 카드 ${CARD_SLOTS}장.</p>
        <p class="sub">인챈트 (${enchCount()}/${ENCHANT_SLOTS})</p><div class="chips">${ench}</div>
        <p class="sub">액티브 카드 (${lo.cards.length}/${CARD_SLOTS})</p><div class="chips">${cards}</div>
        <p class="sub">대장간</p><div class="chips">${forge}</div>
        <div class="row">
          <button class="choice" type="button" data-enemy aria-pressed="${this.enemyMirror}">적도 같은 장비</button>
          <button class="choice" type="button" data-clear>모두 비우기</button>
        </div>
        <button class="choice primary" type="button" data-done>완료</button>`);
      panel.querySelectorAll<HTMLElement>('[data-ench]').forEach((b) =>
        b.addEventListener('click', () => {
          const id = b.dataset.ench as EnchantId;
          const n = lo.enchants[id] ?? 0;
          if (!n && enchCount() >= ENCHANT_SLOTS) return this.toast(`인챈트는 ${ENCHANT_SLOTS}종까지`);
          const next = (n + 1) % (ENCHANT_MAX_STACK + 1);
          if (next) lo.enchants[id] = next;
          else delete lo.enchants[id];
          draw();
        }),
      );
      panel.querySelectorAll<HTMLElement>('[data-cardpick]').forEach((b) =>
        b.addEventListener('click', () => {
          const id = b.dataset.cardpick as CardId;
          if (lo.cards.includes(id)) lo.cards = lo.cards.filter((x) => x !== id);
          else if (lo.cards.length >= CARD_SLOTS) return this.toast(`카드는 ${CARD_SLOTS}장까지`);
          else lo.cards.push(id);
          draw();
        }),
      );
      panel.querySelectorAll<HTMLElement>('[data-forge]').forEach((b) =>
        b.addEventListener('click', () => {
          const ty = b.dataset.forge as PieceType;
          const next = ((lo.forge[ty] ?? 0) + 1) % (FORGE_MAX + 1);
          if (next) lo.forge[ty] = next;
          else delete lo.forge[ty];
          draw();
        }),
      );
      panel.querySelector('[data-enemy]')!.addEventListener('click', () => {
        this.enemyMirror = !this.enemyMirror;
        draw();
      });
      panel.querySelector('[data-clear]')!.addEventListener('click', () => {
        this.loadout = { enchants: {}, cards: [], forge: {} };
        this.showLoadout();
      });
      panel.querySelector('[data-done]')!.addEventListener('click', () => this.showStart());
    };
    draw();
  }

  private loadouts(): [Loadout, Loadout] {
    const copy = (l: Loadout): Loadout => ({ enchants: { ...l.enchants }, cards: [...l.cards], forge: { ...l.forge } });
    return [copy(this.loadout), this.enemyMirror ? copy(this.loadout) : { enchants: {}, cards: [], forge: {} }];
  }

  private loadoutSummary(): string {
    const lo = this.loadout;
    const e = (Object.entries(lo.enchants) as [EnchantId, number][]).map(([id, n]) => `${ENCHANTS[id].name} ${n}`);
    const c = lo.cards.map((id) => CARDS[id].name);
    const f = (Object.entries(lo.forge) as [PieceType, number][]).map(([ty, n]) => `${PIECE_NAMES_KO[ty]}+${n}`);
    const all = [...e, ...c, ...f];
    return all.length ? all.join(' · ') + (this.enemyMirror ? ' (적도 동일)' : '') : '없음';
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
      <p>그레이박스 단판 전투 (M4). 기물을 눌러 이동을 예약하고, 같은 칸을 한 번 더 누르면 확정됩니다. 예약한 순서대로 공격합니다. 왼쪽 카드를 누르면 카드 예약을 할 수 있습니다.</p>
      <div class="choices">${SCENARIOS.map(sc).join('')}</div>
      <p>적 AI</p>
      <div class="row">${[0, 1, 2].map(tier).join('')}</div>
      <div class="row">${AI_STYLES.map(style).join('')}</div>
      <button class="choice" type="button" data-loadout>장비 (시험용)<small>${this.loadoutSummary()}</small></button>
      <div class="row"><button class="choice" type="button" data-back>메뉴</button><button class="choice primary" type="button" data-go>전투 시작</button></div>`);
    panel.querySelector('[data-back]')!.addEventListener('click', () => this.onMenu?.());
    panel.querySelector('[data-loadout]')!.addEventListener('click', () => this.showLoadout());
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
      this.c.start(this.lastScenario, this.lastTier, weights, this.loadouts());
    });
  }

  showResult(winner: Side): void {
    const win = winner === 0;
    const panel = this.openOverlay(`
      <h1>${win ? 'CHECKMATE' : 'DEFEAT'}</h1>
      <h2>${win ? '승리 — 적 킹을 쓰러뜨렸습니다' : '패배 — 내 킹이 쓰러졌습니다'}</h2>
      <div class="row">
        <button class="choice" type="button" data-menu>메뉴</button>
        <button class="choice primary" type="button" data-again>다시 하기</button>
      </div>`);
    panel.querySelector('[data-menu]')!.addEventListener('click', () => (this.onMenu ? this.onMenu() : this.showStart()));
    panel.querySelector('[data-again]')!.addEventListener('click', () => {
      this.closeOverlay();
      const weights = AI_STYLES.find((s) => s.id === this.lastStyle)!.weights;
      this.c.start(this.lastScenario, this.lastTier, weights, this.loadouts());
    });
  }
}
