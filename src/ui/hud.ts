import { sfx } from '../audio/sfx';
import { STALL } from '../data/battle';
import { BASE_AP, PIECE_NAMES_KO } from '../data/pieces';
import { pieceImg } from './sprites';
import { AI_STYLES, SCENARIOS, type BattleController, type HudView, type Scenario } from '../game/controller';
import { CARVES } from '../data/carves';
import { PARTS, PART_IDS, PART_SLOTS, type PartId } from '../data/parts';
import { TWISTS } from '../data/twists';
import { GRADE_NAME } from '../data/grades';
import { checkPlan, findPiece, toSquare, type BattleState, type Loadout, type Piece, type PlanStep, type Side } from '../engine';
import { TEXT } from '../data/text';
import { Backdrop } from './backdrop';
import { coach, coachOn, resetCoach, setCoach } from './coach';
import { musicOn, setMusic } from '../audio/music';
import { exportLog, logSummary } from '../run/telemetry';
import { paintPortraits } from './portrait';
import { ghostOut, replay } from './motion';
import { MOTION, TOAST } from '../data/motion';
import { button, icon } from './chrome';
import { setSfx, sfxOn } from '../audio/sfx';


const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

/** 예약 목록 한 줄: 좌표 이동 */
const describeStep = (s: BattleState, m: PlanStep): string => {
  const p = findPiece(s, m.pieceId);
  return `${p ? toSquare(p) : '?'} → ${toSquare(m.to)}`;
};

export class Hud implements HudView {
  private c!: BattleController;
  private toastTimer: number | undefined;
  private lastScenario: Scenario = SCENARIOS[0];
  private lastTier = 1;
  private lastStyle = 'scenario';
  private loadout: Loadout = { parts: [] };
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
    $('btn-enchant').addEventListener('click', () => this.showParts());
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
  }

  /** 왼쪽 레일: 부품 이름표 (누르면 부품 목록) — 규격 2.0에는 카드가 없다 */
  private renderParts(c: BattleController): void {
    if (!c.state) return;
    const parts = c.state.loadouts[0].parts;
    $('cards').innerHTML = parts.map((id) => `<button type="button" class="card part g-${PARTS[id].grade}" data-part="${id}"><span class="card-name">${PARTS[id].name}</span><span class="card-desc">${PARTS[id].desc}</span></button>`).join('');
    $('cards').onclick = (e) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-part]');
      if (el) this.toast(`${PARTS[el.dataset.part as PartId].name} — ${PARTS[el.dataset.part as PartId].desc}`);
    };
  }

  /** 묘수풀이 목표 한 줄 (주문서 자리를 쓴다) */
  private goal: string | null = null;
  setGoal(text: string | null, label = '목표'): void {
    this.goal = text;
    this.goalLabel = label;
  }
  private goalLabel = '목표';

  /** 레일 한 줄: 주문서 · 진행 (완수 ✓ / 실패 줄 긋기) */
  private renderOrder(c: BattleController): void {
    const el = $('order');
    if (this.goal) {
      el.hidden = false;
      el.className = `order${c.state.winner === 0 ? ' done' : ''}`;
      el.innerHTML = `${icon('reticle', 's')}<span class="what"><b>${this.goalLabel}</b> ${this.goal}</span>`;
      return;
    }
    el.hidden = true;
  }

  update(c: BattleController): void {
    this.coachBattle(c);
    this.renderParts(c);
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
    const check = checkPlan(c.state, full);
    full.forEach((m, i) => {
      const p = findPiece(c.state, m.pieceId);
      if (!p) return;
      const pending = c.pending !== null && i === full.length - 1;
      rows.push(
        `<li class="${pending ? 'pending' : ''}"><span class="no">${i + 1}</span><span class="glyph">${pieceImg(p.type, p.side, 'small', 24)}</span><span>${describeStep(c.state, m)}</span></li>`,
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
      const hint = (c.state.rules.foresight ?? 0) > 0
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

  /** 첫 출하 안내 (D-116): 대국 상황마다 한 번씩 (본 것은 다시 안 나온다) */
  private coachBattle(c: BattleController): void {
    if (!c.state || c.phase !== 'plan') return;
    if (c.state.pieces.some((p) => p.type === 'K' && p.hp === 1) && c.state.rules.checkmate) return coach('check');
    if (c.plan.length >= 2) return coach('chain');
    if (c.plan.length >= 1) {
      coach('tape');
      return coach('ap');
    }
    if (c.selectedId !== null) return coach('targets');
    if (c.state.turnNumber >= 3) coach('intent');
    coach('select');
  }

  /** 조작에 대한 즉시 알림 (부족 · 불가 등): 지금 보이는 줄을 바로 바꾼다. 기다리던 줄은 그 뒤에 이어진다 */
  toast(msg: string): void {
    this.showToast(msg);
  }

  /** 자동 서술 한 줄 (대국 시작 · 합류 · 기록지 등): 줄을 서서 하나씩 — 앞 줄을 덮지 않는다 (D-137) */
  say(msg: string): void {
    if (this.toastQueue.includes(msg) || this.toastNow === msg) return;
    this.toastQueue.push(msg);
    if (this.toastQueue.length > TOAST.queueMax) this.toastQueue.shift();
    if (!this.toastNow) this.nextToast();
  }

  private toastQueue: string[] = [];
  private toastNow: string | null = null;

  private nextToast(): void {
    const m = this.toastQueue.shift();
    if (m) this.showToast(m);
  }

  private showToast(msg: string): void {
    const t = $('toast');
    t.textContent = msg;
    t.hidden = false;
    t.classList.remove('out');
    replay(t, 'in');
    this.toastNow = msg;
    window.clearTimeout(this.toastTimer);
    // 글이 길면 오래: 읽을 시간 (TOAST.base + 글자당 perChar, 상한 max)
    const hold = Math.min(TOAST.max, TOAST.base + msg.length * TOAST.perChar);
    this.toastTimer = window.setTimeout(() => {
      t.classList.add('out');
      this.toastTimer = window.setTimeout(() => {
        t.hidden = true;
        this.toastNow = null;
        this.nextToast();
      }, MOTION.toastOut);
    }, hold);
  }

  showInfo(p: Piece, clientX: number, clientY: number): void {
    const el = $('info');
    const side = p.side === 0 ? '<span class="ally">아군</span>' : '<span class="enemy">적</span>';
    const extra: string[] = [];
    if (p.carve) extra.push(`<span class="variant">${CARVES[p.carve].mark} ${CARVES[p.carve].name}</span><br><small>${CARVES[p.carve].desc}</small>`);
    if (p.elite) extra.push('<span class="enemy">정예 — HP 두 배</span>');
    const tw = this.c.state?.twist;
    if (tw && p.side === 1) extra.push(`<span class="weak">${TWISTS[tw].name}</span><br><small>${TWISTS[tw].desc}</small>`);
    const more = extra.length ? `<br>${extra.join('<br>')}` : '';
    el.innerHTML = `<b>${pieceImg(p.type, p.side, 'small', 24)} ${side} ${PIECE_NAMES_KO[p.type]}</b><br>HP ${p.hp} / ${p.maxHp}${p.shield ? ` · 방열판 ${p.shield}` : ''}<br>ATK ${p.atk} · DEF ${p.def}${more}${p.type === 'K' && this.c.state?.rules.checkmate ? `<br>${p.hp === 1 ? '<span class="enemy">체크 — 다음에 맞으면 쓰러짐</span>' : '체크 버팀: 한 턴에 HP 1 아래로 떨어지지 않음'}` : ''}`;
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
    paintPortraits(panel);
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
    paintPortraits(el); // 말하는 기물 초상화 (D-134)
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
        ${button('부품', 'data-ench', { icon: 'wrench', cls: 'wide' })}
        ${button(TEXT.menu.settings, 'data-settings', { icon: 'watch', cls: 'wide' })}
        ${button(P.toMenu, 'data-menu', { small: P.toMenuDesc, cls: 'wide' })}
      </div>`);
    panel.querySelector('[data-resume]')!.addEventListener('click', () => this.closeOverlay());
    panel.querySelector('[data-ench]')!.addEventListener('click', () => this.showParts());
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
      <div class="settings-grid">
        ${button(`${S.sfx}: ${sfxOn() ? S.on : S.off}`, 'data-sfx', { icon: 'bell', cls: 'wide' })}
        ${button(`${S.music}: ${musicOn() ? S.on : S.off}`, 'data-music', { icon: 'bell', cls: 'wide' })}
        ${button(`${S.coach}: ${coachOn() ? S.on : S.off}`, 'data-coach', { icon: 'question', cls: 'wide' })}
        ${button(S.coachReset, 'data-coachreset', { icon: 'swap', cls: 'wide' })}
        ${button(S.log, 'data-log', { icon: 'crate', cls: 'wide', small: S.logSmall(logSummary()) })}
        ${this.onIntro ? button(S.intro, 'data-intro', { icon: 'watch', cls: 'wide' }) : ''}
        ${button(S.close, 'data-close', { tone: 'brass', cls: 'wide' })}
      </div>`);
    panel.querySelector('[data-sfx]')!.addEventListener('click', () => {
      setSfx(!sfxOn());
      if (sfxOn()) sfx('submit');
      this.showSettings(back);
    });
    panel.querySelector('[data-music]')!.addEventListener('click', () => {
      setMusic(!musicOn());
      this.showSettings(back);
    });
    panel.querySelector('[data-coach]')!.addEventListener('click', () => {
      setCoach(!coachOn());
      this.showSettings(back);
    });
    panel.querySelector('[data-log]')!.addEventListener('click', async () => {
      const r = await exportLog();
      this.toast(r === 'file' ? S.logFile : r === 'clipboard' ? S.logClip : S.logFail);
    });
    panel.querySelector('[data-coachreset]')!.addEventListener('click', () => {
      resetCoach();
      this.toast(S.coachResetDone);
    });
    panel.querySelector('[data-intro]')?.addEventListener('click', () => {
      this.closeOverlay();
      this.onIntro?.();
    });
    panel.querySelector('[data-close]')!.addEventListener('click', back);
  }
  /** 인트로 다시 보기 (등반 화면이 설정) */
  onIntro: (() => void) | null = null;

  /** 부품 목록 (레일 버튼 · 일시 정지) */
  private showParts(): void {
    const parts = this.c.state?.loadouts?.[0].parts ?? [];
    const panel = this.openOverlay(`
      <h2>${icon('wrench')} 부품 (${parts.length}/${PART_SLOTS})</h2>
      ${parts.length ? parts.map((id) => `<p class="legend-line"><i class="grade g-${PARTS[id].grade}">${GRADE_NAME[PARTS[id].grade]}</i> <b>${PARTS[id].name}</b> — ${PARTS[id].desc}</p>`).join('') : '<p>아직 부품이 없다. 검문! · 반장 · 고물상에서 얻는다.</p>'}
      ${button('닫기', 'data-close', { tone: 'brass', cls: 'wide' })}`);
    panel.querySelector('[data-close]')!.addEventListener('click', () => this.closeOverlay());
  }

  /** 시험용 부품 편집 (연습판): 눌러서 넣고 뺀다 */
  private showLoadout(): void {
    const lo = this.loadout;
    const draw = () => {
      const chips = PART_IDS.map((id) => `<button class="chip${lo.parts.includes(id) ? ' on' : ''}" type="button" data-part="${id}"><b>${PARTS[id].name}</b><small>${GRADE_NAME[PARTS[id].grade]} · ${PARTS[id].desc}</small></button>`).join('');
      const panel = this.openOverlay(`
        <h2>부품 (연습판)</h2>
        <p>누르면 넣고 다시 누르면 뺀다. 최대 ${PART_SLOTS}개.</p>
        <div class="chips">${chips}</div>
        <div class="row">
          <button class="choice" type="button" data-enemy aria-pressed="${this.enemyMirror}">적도 같은 부품</button>
          <button class="choice" type="button" data-clear>모두 비우기</button>
        </div>
        <button class="choice primary" type="button" data-done>완료</button>`);
      panel.querySelectorAll<HTMLElement>('[data-part]').forEach((b) =>
        b.addEventListener('click', () => {
          const id = b.dataset.part as PartId;
          if (lo.parts.includes(id)) lo.parts = lo.parts.filter((x) => x !== id);
          else if (lo.parts.length >= PART_SLOTS) return this.toast(`부품은 ${PART_SLOTS}개까지`);
          else lo.parts.push(id);
          draw();
        }),
      );
      panel.querySelector('[data-enemy]')!.addEventListener('click', () => {
        this.enemyMirror = !this.enemyMirror;
        draw();
      });
      panel.querySelector('[data-clear]')!.addEventListener('click', () => {
        this.loadout = { parts: [] };
        this.showLoadout();
      });
      panel.querySelector('[data-done]')!.addEventListener('click', () => this.showStart());
    };
    draw();
  }

  private loadouts(): [Loadout, Loadout] {
    return [{ parts: [...this.loadout.parts] }, this.enemyMirror ? { parts: [...this.loadout.parts] } : { parts: [] }];
  }

  private loadoutSummary(): string {
    const all = this.loadout.parts.map((id) => PARTS[id].name);
    return all.length ? all.join(' · ') + (this.enemyMirror ? ' (적도 동일)' : '') : '없음';
  }

  /** 연습판: 단판 대국 고르기 (개발·시험용) */
  showStart(): void {
    const sc = (s: Scenario) =>
      `<button class="choice" type="button" data-sc="${s.id}" aria-pressed="${s.id === this.lastScenario.id}">${s.title}<small>${s.desc}</small></button>`;
    const tier = (n: number) => `<button class="choice" type="button" data-tier="${n}" aria-pressed="${n === this.lastTier}">${n + 1}단계</button>`;
    const style = (s: (typeof AI_STYLES)[number]) =>
      `<button class="choice" type="button" data-style="${s.id}" aria-pressed="${s.id === this.lastStyle}">${s.label}</button>`;
    const panel = this.openOverlay(`
      <h2>${icon('lever')} 연습판</h2>
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
      this.c.start(this.lastScenario, this.lastTier, weights, this.loadouts());
    });
  }

  showResult(winner: Side): void {
    const win = winner === 0;
    const panel = this.openOverlay(`
      <div class="stamp-big ${win ? 'good' : 'bad'}">${win ? 'CHECKMATE' : '불량 판정'}</div>
      <h2 class="say">“${win ? TEXT.over.winSay : TEXT.over.loseSay}”<small>— 검수 저울</small></h2>
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
