import { sfx } from '../audio/sfx';
import { STALL } from '../data/battle';
import { BASE_AP, PIECE_NAMES_KO } from '../data/pieces';
import { pieceImg } from './sprites';
import { AI_STYLES, SCENARIOS, type BattleController, type HudView, type Scenario } from '../game/controller';
import { CARDS, CARD_SLOTS, type CardId } from '../data/cards';
import { ENCHANTS, ENCHANT_MAX_STACK, ENCHANT_SLOTS, type EnchantId } from '../data/enchants';
import { FORGE_MAX } from '../data/forge';
import { checkPlan, ench, findPiece, toSquare, type BattleState, type Loadout, type Piece, type PieceType, type PlanStep, type Side } from '../engine';
import { VARIANTS } from '../data/variants';
import { TEXT } from '../data/text';
import { NODE_NAMES } from '../data/run';
import { AFFIXES } from '../data/legions';
import { pop, stamp } from './juice';
import { ORDERS, TACTICS, type OrderId, type TacticId } from '../data/tactics';
import { orderProgress } from '../run/orders';
import { Backdrop } from './backdrop';
import { LEGENDS } from '../data/legends';
import { CARD_GRADE } from '../data/grades';
import { ghostOut, replay } from './motion';
import { MOTION } from '../data/motion';
import { button, icon } from './chrome';
import { setSfx, sfxOn } from '../audio/sfx';


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
      return `${from} 방열판${cardName(m.card)}`;
    case 'gate':
      return `${from} ⇢ ${toSquare(m.to)}${cardName(m.card)}`;
    case 'promote':
      return `${from} 퀸 승급${cardName(m.card)}`;
    case 'fuse':
      return `${from} + ${toSquare(findPiece(s, m.partnerId) ?? { x: 0, y: 0 })} 결합${cardName(m.card)}`;
    case 'formShift':
      return `${from} ⇄ 거푸집 교환${cardName(m.card)}`;
  }
};

/** 전술 키워드 칩: 이름까지(명령 테이프) 또는 아이콘만(기록 줄) */
const tacticChips = (list: TacticId[], named: boolean): string => {
  const uniq = [...new Set(list)];
  if (!uniq.length) return '';
  return `<span class="chips">${uniq
    .map((t) => `<span class="tac" style="color:${TACTICS[t].color}" title="${TACTICS[t].name} — ${TACTICS[t].desc}">${icon(TACTICS[t].icon, 's')}${named ? TACTICS[t].name : ''}</span>`)
    .join('')}</span>`;
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
  /** 타이틀·메뉴·출하 화면 뒤 공장 배경 */
  readonly backdrop = new Backdrop(document.body);

  bind(c: BattleController): void {
    this.c = c;
    $('btn-pause').addEventListener('click', () => this.showPause());
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
      // 카드 설명은 패널에 다 못 싣는다 — 고를 때 안내로 (D-075)
      const slot = v === 'fuse' ? null : c.virtual.cards[0][Number(v)];
      if (slot && c.mode) this.toast(`${CARDS[slot.id].name} — ${CARDS[slot.id].desc}`);
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
        ? lim.type === 'consume' ? '탔음' : '이번 대국 씀'
        : slot.cooldown > 0
          ? `냉각 ${slot.cooldown}`
          : lim.type === 'consume' ? '종이 · 한 번' : lim.type === 'round' ? '대국당 1회' : `냉각 ${lim.turns}턴`;
      const off = slot.spent || slot.cooldown > 0 || c.phase !== 'plan';
      slots.push(
        `<button type="button" class="card ${lim.type === 'consume' ? 'consume' : ''} g-${CARD_GRADE[slot.id]}${armed ? ' armed' : ''}" data-card="${i}" ${off ? 'disabled' : ''}>
          <span class="card-name">${def.name}</span>
          <span class="card-desc">${def.desc}</span>
          <span class="card-tag">${def.ap ? `태엽 ${def.ap} · ` : ''}${status}</span>
        </button>`,
      );
    });
    if (c.canEnchantFuse) {
      const armed = c.mode?.kind === 'fuse';
      slots.push(
        `<button type="button" class="card wide${armed ? ' armed' : ''}" data-card="fuse" ${c.phase !== 'plan' ? 'disabled' : ''}>
          <span class="card-name">결합 · ${ENCHANTS.E11.name}</span>
          <span class="card-tag">태엽 ${(c.state.loadouts[0].enchants.E11 ?? 0) >= 3 ? 0 : CARDS.C05.ap}</span>
        </button>`,
      );
    }
    // 빈 슬롯은 그리지 않는다 (오른쪽 패널 공간 절약, D-075)
    $('cards').innerHTML = slots.join('');
  }

  /** 이 대국의 주문서 (출하 대국만, 시운전은 없음) — D-094 */
  private order: { id: OrderId; deck: PieceType[] } | null = null;

  setOrder(order: { id: OrderId; deck: PieceType[] } | null): void {
    this.order = order;
    this.orderDone = false;
  }
  private orderDone = false;

  /** 묘수풀이 목표 한 줄 (주문서 자리를 쓴다) */
  private goal: string | null = null;
  setGoal(text: string | null): void {
    this.goal = text;
  }

  /** 레일 한 줄: 주문서 · 진행 (완수 ✓ / 실패 줄 긋기) */
  private renderOrder(c: BattleController): void {
    const el = $('order');
    if (this.goal) {
      el.hidden = false;
      el.className = `order${c.state.winner === 0 ? ' done' : ''}`;
      el.innerHTML = `${icon('reticle', 's')}<span class="what"><b>${NODE_NAMES.puzzle}</b> ${this.goal}</span>`;
      return;
    }
    el.hidden = !this.order;
    if (!this.order) return;
    const def = ORDERS[this.order.id];
    const pr = orderProgress(this.order.id, c.state, this.order.deck);
    // 완수하는 순간 (D-104): 줄이 금빛으로 튀고 도장
    if (pr.done && !this.orderDone) {
      this.orderDone = true;
      window.setTimeout(() => {
        stamp('완수', 'good');
        sfx('coin');
        pop($('order'), 'good');
      }, 200);
    } else if (!pr.done) this.orderDone = false;
    el.className = `order${pr.done ? ' done' : pr.failed ? ' failed' : ''}`;
    const mark = def.tactic ? icon(TACTICS[def.tactic].icon, 's', TACTICS[def.tactic].color) : icon('flag', 's');
    el.innerHTML = `${mark}<span class="what"><b>${TEXT.battle.order}</b> ${def.text}</span>${pr.done ? icon('star', 's') : pr.count ? `<span class="count">${pr.count}</span>` : ''}`;
    el.setAttribute('aria-label', `${TEXT.battle.order}: ${def.text}${pr.done ? ' 완수' : pr.failed ? ' 실패' : ''}`);
  }

  update(c: BattleController): void {
    this.renderCards(c);
    this.renderOrder(c);
    const label = $('turn-label');
    const mine = c.phase === 'plan';
    // 정체 압박 (D-072): 피해 없는 라운드가 이어지면 "정체 n/2" — 다 차면 판이 무너지기 시작한다
    const stall = c.state.stall?.count ?? 0;
    const stallTag = stall > 0 && c.phase !== 'over' ? ` · ${TEXT.battle.stall} ${Math.min(stall, STALL.rounds)}/${STALL.rounds}` : '';
    const B = TEXT.battle;
    label.textContent = (c.phase === 'over' ? B.over : mine ? `${Math.ceil(c.state.turnNumber / 2)}턴 · ${B.mine}` : c.state.turnSide === 1 ? B.enemy : B.running) + stallTag;
    label.classList.toggle('enemy', !mine && c.phase !== 'over');

    // 예약 목록 (순번 · 기물 · 좌표 이동)
    const q = $('queue');
    const rows: string[] = [];
    const full = c.pending ? [...c.plan, c.pending] : c.plan;
    // 미리보기 키워드 칩 (D-094): 이 순서로 두면 무슨 수가 나는지 누르기 전에 보인다
    const check = checkPlan(c.state, full);
    const chipsAt = (i: number) => tacticChips(check.events.flatMap((e) => (e.type === 'tactic' && e.order === i && e.side === c.state.turnSide ? [e.tactic] : [])), true);
    full.forEach((m, i) => {
      const p = findPiece(c.state, m.pieceId);
      if (!p) return;
      const pending = c.pending !== null && i === full.length - 1;
      rows.push(
        `<li class="${pending ? 'pending' : ''}"><span class="no">${i + 1}</span><span class="glyph">${pieceImg(p.type, p.side, 'small', 24)}</span><span>${describeStep(c.state, m)}</span>${chipsAt(i)}</li>`,
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
          `<li class="log ${e.side === 0 ? 'mine' : 'enemy'}" data-log="${i}"><span class="who">${e.side === 0 ? '내' : '적'} #${e.order + 1}</span><span class="glyph">${pieceImg(e.attacker.type, e.attacker.side, 'small', 22)}</span><span class="to">→</span><span class="glyph">${tg}</span>${tacticChips(e.tactics, false)}<span class="dmg${kill ? ' kill' : ''}">-${dmg}${kill ? '<i class="skull" aria-label="처치"></i>' : ''}</span></li>`,
        );
      });
    }
    if (!rows.length && mine) {
      const hint = ench(c.state, 0, 'E16') || (c.state.rules.foresight ?? 0) > 0
        ? `<span class="hint">${TEXT.battle.hintIntent}</span>`
        : `<span class="hint muted">${TEXT.battle.hintThreat}</span>`;
      rows.push(`<li class="empty">${TEXT.battle.hintPlan}<br>${hint}</li>`);
    }
    q.innerHTML = rows.join('');

    // 태엽 (숫자 없이): 남음 = 감긴 태엽, 씀 = 풀린 태엽, 기본을 넘는 칸 = 이번 턴 보너스(요충지 등)
    const total = c.apTotal;
    const left = total - check.apUsed;
    $('vials').innerHTML = Array.from({ length: total }, (_, i) => {
      const k = i >= left ? 'spent' : i >= BASE_AP ? 'bonus' : 'full';
      return `<img class="${k}" src="ui/hud/key-${k}.png" alt="">`;
    }).join('');
    $('vials').setAttribute('aria-label', `남은 태엽 ${left} / ${total}`);

    ($('btn-undo') as HTMLButtonElement).disabled = !mine || !c.plan.length;
    ($('btn-reset') as HTMLButtonElement).disabled = !mine || !c.plan.length;
    ($('btn-submit') as HTMLButtonElement).disabled = !mine;
  }

  toast(msg: string): void {
    const t = $('toast');
    t.textContent = msg;
    t.hidden = false;
    t.classList.remove('out');
    replay(t, 'in');
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      t.classList.add('out');
      this.toastTimer = window.setTimeout(() => (t.hidden = true), MOTION.toastOut);
    }, 1600);
  }

  showInfo(p: Piece, clientX: number, clientY: number): void {
    const el = $('info');
    const side = p.side === 0 ? '<span class="ally">아군</span>' : '<span class="enemy">적</span>';
    const extra: string[] = [];
    if (p.fused) extra.push(`결합: ${p.fused.map((ty) => PIECE_NAMES_KO[ty]).join(' + ')}`);
    if (p.formAs) extra.push(`거푸집 교환: ${PIECE_NAMES_KO[p.formAs]} 행마`);
    if (p.variant && p.type === VARIANTS[p.variant].base) extra.push(`<span class="variant">이형 · ${VARIANTS[p.variant].name}</span><br><small>${VARIANTS[p.variant].gain} (${VARIANTS[p.variant].cost})</small>`);
    if (p.stuckTurn !== undefined && p.stuckTurn >= (this.c.state?.turnNumber ?? 0)) extra.push('<span class="enemy">자석판에 붙잡혔다 — 다음 자기 턴에 못 움직인다</span>');
    if (p.type === 'P' && !p.fused) extra.push(`<small>${TEXT.battle.counter}</small>`);
    if (p.affix) extra.push(`<span class="enemy">${AFFIXES[p.affix].name}</span><br><small>${AFFIXES[p.affix].desc}</small>`);
    const forge = this.c.state?.loadouts?.[p.side]?.forge[p.type] ?? 0;
    if (forge) extra.push(`거푸집 개량 +${forge}`);
    const more = extra.length ? `<br>${extra.join('<br>')}` : '';
    const buff = p.buffTurns > 0 ? `<br>요충지 가호: ATK +${Math.round(p.buffAtkPct * 100)}% · DEF +${p.buffDef} (${p.buffTurns}턴)` : '';
    const name = p.variant && p.type === VARIANTS[p.variant].base ? VARIANTS[p.variant].name : PIECE_NAMES_KO[p.type];
    el.innerHTML = `<b>${pieceImg(p.type, p.side, 'small', 24)} ${side} ${name}</b><br>HP ${p.hp} / ${p.maxHp}${p.shield ? ` · 방열판 ${p.shield}` : ''}<br>ATK ${p.atk} · DEF ${p.def}${buff}${more}${p.type === 'K' && this.c.state?.rules.checkmate ? `<br>${p.hp === 1 ? '<span class="enemy">체크 — 다음에 맞으면 쓰러짐</span>' : '안전 밸브: 한 턴에 HP 1 아래로 떨어지지 않음'}` : ''}`;
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

  /** 모달 열기: 처음 열 때만 튀어나온다 (열린 채 내용만 바뀌면 그대로) */
  openOverlay(html: string): HTMLElement {
    const panel = $('overlay-panel');
    const wasOpen = !$('overlay').hidden;
    panel.innerHTML = html;
    $('overlay').hidden = false;
    if (!wasOpen) replay($('overlay'), 'in');
    return panel;
  }

  closeOverlay(): void {
    const o = $('overlay');
    if (o.hidden) return;
    ghostOut(o, 'out', MOTION.overlayOut);
    o.hidden = true;
  }

  /** 다음 openScene의 화면 이름. 같은 이름이면 다시 그리기로 보고 전환 연출을 하지 않는다 (D-109) */
  sceneKey: string | undefined;

  /** 전체 화면 장면 (타이틀·메뉴·출하 화면): 공장 배경 위에 그린다 */
  openScene(html: string, cls = '', backdrop: 'title' | 'dim' = 'dim'): HTMLElement {
    const el = $('scene');
    const key = this.sceneKey ?? `${cls}|${/class="plate">([^<]*<[^>]*>)?([^<]*)/.exec(html)?.[2] ?? ''}`;
    this.sceneKey = undefined;
    const same = !el.hidden && el.dataset.key === key;
    // 화면 전환: 옛 화면은 흐려지며 위로 빠지고, 새 화면은 아래에서 떠오른다. 카드는 하나씩 들어온다
    if (!same) ghostOut(el, 'out', MOTION.sceneOut);
    el.className = `scene ${same ? 'refresh' : 'enter'} ${cls}`;
    el.dataset.key = key;
    el.innerHTML = html;
    el.hidden = false;
    this.closeOverlay();
    if (backdrop === 'title' && this.backdrop.introTime() >= 0) {
      // 인트로가 돌고 있으면 그대로 둔다
    } else this.backdrop.show(backdrop);
    return el;
  }

  /** 장면을 닫고 전투 화면으로 */
  closeScene(): void {
    ghostOut($('scene'), 'out', MOTION.sceneOut);
    $('scene').hidden = true;
    delete $('scene').dataset.key;
    this.backdrop.hide();
  }

  /** 일시 정지 (전투 중): 계속 · 개조 보기 · 설정 · 메인 메뉴로 */
  private showPause(): void {
    const P = TEXT.pause;
    const panel = this.openOverlay(`
      <h2>${P.title}</h2>
      <div class="col">
        ${button(P.resume, 'data-resume', { tone: 'brass', cls: 'wide' })}
        ${button(P.enchants, 'data-ench', { icon: 'wrench', cls: 'wide' })}
        ${button(TEXT.menu.settings, 'data-settings', { icon: 'watch', cls: 'wide' })}
        ${button(P.toMenu, 'data-menu', { small: P.toMenuDesc, cls: 'wide' })}
      </div>`);
    panel.querySelector('[data-resume]')!.addEventListener('click', () => this.closeOverlay());
    panel.querySelector('[data-ench]')!.addEventListener('click', () => this.showEnchants());
    panel.querySelector('[data-settings]')!.addEventListener('click', () => this.showSettings(() => this.showPause()));
    panel.querySelector('[data-menu]')!.addEventListener('click', () => {
      this.closeOverlay();
      this.onMenu?.();
    });
  }

  /** 설정: 효과음 · 인트로 다시 보기 */
  showSettings(back: () => void): void {
    const S = TEXT.settings;
    const panel = this.openOverlay(`
      <h2>${S.title}</h2>
      <div class="col">
        ${button(`${S.sfx}: ${sfxOn() ? S.on : S.off}`, 'data-sfx', { icon: 'bell', cls: 'wide' })}
        ${this.onIntro ? button(S.intro, 'data-intro', { icon: 'watch', cls: 'wide' }) : ''}
        ${button(S.close, 'data-close', { tone: 'brass', cls: 'wide' })}
      </div>`);
    panel.querySelector('[data-sfx]')!.addEventListener('click', () => {
      setSfx(!sfxOn());
      if (sfxOn()) sfx('submit');
      this.showSettings(back);
    });
    panel.querySelector('[data-intro]')?.addEventListener('click', () => {
      this.closeOverlay();
      this.onIntro?.();
    });
    panel.querySelector('[data-close]')!.addEventListener('click', back);
  }
  /** 인트로 다시 보기 (등반 화면이 설정) */
  onIntro: (() => void) | null = null;

  private showEnchants(): void {
    const lo = this.c.state?.loadouts?.[0];
    const held = lo ? (Object.entries(lo.enchants) as [EnchantId, number][]).filter(([, n]) => n > 0) : [];
    const rows = held.map(([id, n]) => {
      const def = ENCHANTS[id];
      const lv = def.levels.map((d, i) => `<li class="${i < n ? 'on' : ''}">${i + 1}단 · ${d}</li>`).join('');
      return `<div class="ench panel9"><b>${def.name}</b> <small>${def.target} · ${n}/${ENCHANT_MAX_STACK}단${n >= 3 ? ' ★걸작' : ''}</small><ul>${lv}</ul></div>`;
    });
    const forge = lo ? (Object.entries(lo.forge) as [PieceType, number][]).filter(([, n]) => n > 0) : [];
    const forgeLine = forge.length ? `<p>거푸집 개량: ${forge.map(([ty, n]) => `${PIECE_NAMES_KO[ty]} +${n}`).join(' · ')}</p>` : '';
    const variants = lo?.variants ? Object.values(lo.variants).map((id) => VARIANTS[id].name) : [];
    const panel = this.openOverlay(`
      <h2>${icon('wrench')} 개조</h2>
      ${(lo?.legends ?? []).map((id) => `<p class="legend-line"><i class="grade g-epic">${LEGENDS[id].name}</i> ${LEGENDS[id].desc}</p>`).join('')}
      ${rows.length ? rows.join('') : '<p>아직 달린 개조가 없다. 대국을 이기면 3지선다로 얻는다.</p>'}
      ${forgeLine}
      ${variants.length ? `<p>이형 거푸집: ${variants.join(' · ')}</p>` : ''}
      ${button('닫기', 'data-close', { tone: 'brass', cls: 'wide' })}`);
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
          return `<button class="chip${n ? ' on' : ''}" type="button" data-ench="${id}"><b>${ENCHANTS[id].name}</b><small>${ENCHANTS[id].target} · ${n ? `${n}단${n >= 3 ? ' ★' : ''}` : '없음'}</small></button>`;
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
        <h2>장비 (시운전)</h2>
        <p>누를 때마다 단계가 오른다. 개조 최대 ${ENCHANT_SLOTS}종 · 천공 카드 ${CARD_SLOTS}장.</p>
        <p class="sub">개조 (${enchCount()}/${ENCHANT_SLOTS})</p><div class="chips">${ench}</div>
        <p class="sub">천공 카드 (${lo.cards.length}/${CARD_SLOTS})</p><div class="chips">${cards}</div>
        <p class="sub">거푸집 개량</p><div class="chips">${forge}</div>
        <div class="row">
          <button class="choice" type="button" data-enemy aria-pressed="${this.enemyMirror}">적도 같은 장비</button>
          <button class="choice" type="button" data-clear>모두 비우기</button>
        </div>
        <button class="choice primary" type="button" data-done>완료</button>`);
      panel.querySelectorAll<HTMLElement>('[data-ench]').forEach((b) =>
        b.addEventListener('click', () => {
          const id = b.dataset.ench as EnchantId;
          const n = lo.enchants[id] ?? 0;
          if (!n && enchCount() >= ENCHANT_SLOTS) return this.toast(`개조는 ${ENCHANT_SLOTS}종까지`);
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
          else if (lo.cards.length >= CARD_SLOTS) return this.toast(`천공 카드는 ${CARD_SLOTS}장까지`);
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

  /** 시운전: 단판 대국 고르기 (개발·시험용) */
  showStart(): void {
    const sc = (s: Scenario) =>
      `<button class="choice" type="button" data-sc="${s.id}" aria-pressed="${s.id === this.lastScenario.id}">${s.title}<small>${s.desc}</small></button>`;
    const tier = (n: number) => `<button class="choice" type="button" data-tier="${n}" aria-pressed="${n === this.lastTier}">${n + 1}단계</button>`;
    const style = (s: (typeof AI_STYLES)[number]) =>
      `<button class="choice" type="button" data-style="${s.id}" aria-pressed="${s.id === this.lastStyle}">${s.label}</button>`;
    const panel = this.openOverlay(`
      <h2>${icon('lever')} 시운전</h2>
      <p>단판 대국. 기물을 눌러 명령을 새기고, 같은 칸을 한 번 더 누르면 확정. 새긴 순서대로 공격한다.</p>
      <div class="choices">${SCENARIOS.map(sc).join('')}</div>
      <p class="sub">시험용 흑 세트의 솜씨</p>
      <div class="row">${[0, 1, 2].map(tier).join('')}</div>
      <div class="row">${AI_STYLES.map(style).join('')}</div>
      <button class="choice" type="button" data-loadout>장비<small>${this.loadoutSummary()}</small></button>
      <div class="row"><button class="choice" type="button" data-back>메뉴</button><button class="choice primary" type="button" data-go>대국 시작</button></div>`);
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
      this.closeScene();
      const weights = AI_STYLES.find((s) => s.id === this.lastStyle)!.weights;
      this.order = null;
      this.c.start(this.lastScenario, this.lastTier, weights, this.loadouts());
    });
  }

  showResult(winner: Side): void {
    const win = winner === 0;
    const panel = this.openOverlay(`
      <div class="stamp-big ${win ? 'good' : 'bad'}">${win ? 'CHECKMATE' : '불량 판정'}</div>
      <h2 class="say">“${win ? TEXT.over.winSay : TEXT.over.loseSay}”<small>— 검수관</small></h2>
      <div class="row">
        <button class="choice" type="button" data-menu>메뉴</button>
        <button class="choice primary" type="button" data-again>다시 하기</button>
      </div>`);
    panel.querySelector('[data-menu]')!.addEventListener('click', () => (this.onMenu ? this.onMenu() : this.showStart()));
    panel.querySelector('[data-again]')!.addEventListener('click', () => {
      this.closeOverlay();
      const weights = AI_STYLES.find((s) => s.id === this.lastStyle)!.weights;
      this.order = null;
      this.c.start(this.lastScenario, this.lastTier, weights, this.loadouts());
    });
  }
}
