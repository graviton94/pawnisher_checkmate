import { sfx } from '../audio/sfx';
import { TUNED } from '../data/aiWeights';
import { CARDS, CARD_SLOTS, type CardId } from '../data/cards';
import { ENCHANTS, ENCHANT_MAX_STACK, type EnchantId } from '../data/enchants';
import { FORGE_MAX } from '../data/forge';
import { PIECE_NAMES_KO, PIECE_STATS } from '../data/pieces';
import { ACT_NAMES, ALTAR, FLOORS_PER_ACT, NODE_NAMES, SKIP_GOLD, TOTAL_FLOORS, actOf, inAct, type NodeKind } from '../data/run';
import { TEXT } from '../data/text';
import { ASCENSIONS, UNLOCK_DECKS, loadMeta, recordRunEnd, saveMeta, unlockedDecks } from '../run/meta';
import type { BattleController } from '../game/controller';
import type { BattleState, Deck, PieceType } from '../engine';
import { EVENTS, type EventId } from '../run/events';
import { encounterBattle } from '../run/legion';
import {
  altarCanPick,
  altarGamble,
  altarPick,
  bossName,
  bossOf,
  ENCHANT_TYPE,
  startDeckOptions,
  buyCard,
  buyEnchant,
  buyPiece,
  clearRun,
  enterNode,
  eventChoiceAvailable,
  eventChoose,
  finishBattle,
  finishReward,
  forgeCost,
  forgeUp,
  forgeVariant,
  forgeVariantOptions,
  leaveNode,
  loadRun,
  newRun,
  recordBattle,
  reroll,
  saveRun,
  sellPiece,
  sellPrice,
  skipChoice,
  takeChoice,
  type RunState,
} from '../run/run';
import type { Hud } from './hud';
import { pieceImg } from './sprites';
import { button, icon, pips, screws } from './chrome';
import { unlockAchievement } from '../platform';
import { VARIANTS, VARIANT_FORGE_LEVEL, type VariantId } from '../data/variants';

const ORDER: PieceType[] = ['K', 'Q', 'R', 'B', 'N', 'P'];

/** 공정 지도 노드 아이콘 (public/ui/icons) */
const NODE_ICON: Record<NodeKind, string> = { battle: 'sword', elite: 'skull', boss: 'crown', shop: 'screw', forge: 'anvil', altar: 'lever', event: 'question' };
const EVENT_ICON: Record<EventId, string> = { smith: 'wrench', armory: 'crate', gambler: 'windkey', pilgrim: 'flag', pact: 'flame' };
const BOSS_PIECE: Record<string, PieceType> = { knight: 'N', bishop: 'B', rook: 'R' };

/** 기물 한 줄 설명 (보상·고물상) */
const PIECE_DESC: Record<PieceType, string> = {
  P: '싸고 많다. 끝줄에 닿으면 퀸',
  N: 'L자로 뛰어넘어 L자로 친다',
  B: '대각선 먼 거리를 친다',
  R: '직선 먼 거리, 튼튼하다',
  Q: '가장 강하다',
  K: '',
};

/** 시작 세트 이름 (해금 세트는 meta의 이름) */
const setName = (deck: Deck): string => {
  const key = [...deck].sort().join('');
  const u = UNLOCK_DECKS.find((x) => [...x.deck].sort().join('') === key);
  if (u) return u.name;
  return deck.includes('N') ? '척후 세트' : deck.includes('B') ? '견습 사제 세트' : '보병 세트';
};

/** 개조 고르기 카드 내용: 대상 · 몇 단째 · 효과 · 시너지 태그 */
const enchantOffer = (id: EnchantId, next: number, run: RunState | null): string => {
  const def = ENCHANTS[id];
  const tags: string[] = [];
  const t = ENCHANT_TYPE[id];
  if (run && t) {
    const n = run.deck.filter((x) => x === t).length;
    tags.push(n ? `<i class="tag">내 ${PIECE_NAMES_KO[t]} ${n}기</i>` : `<i class="tag red">${PIECE_NAMES_KO[t]} 없음</i>`);
  }
  if (next === 2) tags.push('<i class="tag">★까지 1단</i>');
  if (next === 3) tags.push('<i class="tag gold">★ 걸작!</i>');
  return `<span class="kind">${icon('wrench', 's')} 개조 · ${def.target}</span><b>${def.name}</b><span class="tags">${tags.join('')}</span><p>${next}단: ${def.levels[next - 1]}</p>`;
};

const cardOffer = (id: CardId): string => {
  const c = CARDS[id];
  const l = c.limit;
  const paper = l.type === 'consume';
  const lim = l.type === 'consume' ? '한 번 쓰면 탄다' : l.type === 'round' ? '대국당 1회' : `냉각 ${l.turns}턴`;
  return `<span class="kind">${icon('card', 's')} ${paper ? '종이 카드' : '철 카드'}</span><b>${c.name}</b><p>${c.desc}</p><span class="tags"><i class="tag${paper ? ' gold' : ''}">${lim}</i>${c.ap ? `<i class="tag">태엽 ${c.ap}</i>` : ''}</span>`;
};

const pieceOffer = (run: RunState, t: PieceType): string => {
  const n = run.deck.filter((x) => x === t).length;
  const forge = run.loadout.forge[t] ?? 0;
  const v = run.loadout.variants?.[t];
  const tags = [n ? `<i class="tag">보유 ${n}기</i>` : '<i class="tag cyan">새 유형</i>', forge ? `<i class="tag">개량 +${forge}</i>` : '', v ? `<i class="tag gold">${VARIANTS[v].name}</i>` : ''].join('');
  return `<span class="kind">${icon('crate', 's')} 기물 · 태엽 ${PIECE_STATS[t].ap}</span>${pieceImg(t, 0, 'large', 84)}<b>${v ? VARIANTS[v].name : PIECE_NAMES_KO[t]}</b><span class="tags">${tags}</span><p>${PIECE_DESC[t]}</p>`;
};

/**
 * 출하(런) 화면들 (D-085 화면 디자인): 타이틀 · 메인 메뉴 · 시작 세트 · 공정 지도 · 보상 · 고물상 · 공방 · 뽑기 기계 · 돌발 · 결과.
 * 모두 공장 배경 위 전체 화면 장면. 대국은 전투 화면을 쓴다.
 */
export class RunUi {
  private run: RunState | null = null;

  constructor(
    private hud: Hud,
    private c: BattleController,
  ) {
    hud.onIntro = () => this.showTitle(true);
  }

  // ---------- 공통 ----------
  private save(): void {
    if (this.run) saveRun(this.run);
  }

  /** 버튼 묶음 연결: data-* 속성 이름 → 처리 */
  private wire(panel: HTMLElement, handlers: Record<string, (el: HTMLElement) => void>): void {
    for (const [attr, fn] of Object.entries(handlers)) {
      panel.querySelectorAll<HTMLElement>(`[data-${attr}]`).forEach((el) => el.addEventListener('click', () => fn(el)));
    }
  }

  /** 조작 결과: 실패면 토스트, 성공이면 저장 후 다시 그림 */
  private act(err: string | void, onFull?: () => void): void {
    if (err === 'full' && onFull) return onFull();
    if (err) this.hud.toast(err);
    this.save();
    this.show();
  }

  /** 위 상태 띠: 공정 · 층 · 나사 · 행운 톱니 · 압력 · 군단 · 메뉴 */
  private bar(run: RunState, title?: string): string {
    const f = Math.min(run.floor, TOTAL_FLOORS);
    const counts = ORDER.map((t) => [t, run.deck.filter((x) => x === t).length] as const).filter(([, n]) => n);
    const army = counts.map(([t, n]) => `${pieceImg(t, 0, 'small', 24)}${n > 1 ? `<span class="n">${n}</span>` : ''}`).join('');
    return `<div class="bar">
      <span class="plate">${icon('anvil', 's')}${title ?? `${ACT_NAMES[actOf(f) - 1]} · ${inAct(f)}층`}</span>
      <span class="stat screw">${icon('screw', 's')}<b>${run.gold}</b></span>
      <span class="stat" title="행운 톱니">${icon('windkey', 's')}${pips(run.crackGauge, ALTAR.gaugeMax)}</span>
      ${run.ascension ? `<span class="stat">${icon('flame', 's')}압력 <b>${run.ascension}</b></span>` : ''}
      <span class="spacer"></span>
      <button class="btn army" type="button" data-army aria-label="군단 보기">${army}</button>
      <button class="btn sq" type="button" data-runmenu aria-label="메뉴">${icon('watch')}</button>
    </div>`;
  }

  /** 상태 띠 버튼 연결 (군단 · 메뉴) */
  private wireBar(el: HTMLElement, run: RunState): void {
    this.wire(el, {
      army: () => this.showArmy(run),
      runmenu: () => this.showRunMenu(run),
    });
  }

  /** 군단 보기 (모달): 기물 · 개량 · 이형 · 개조 · 천공 카드 */
  private showArmy(run: RunState): void {
    const units = ORDER.filter((t) => run.deck.includes(t)).map((t) => {
      const n = run.deck.filter((x) => x === t).length;
      const v = run.loadout.variants?.[t];
      const f = run.loadout.forge[t] ?? 0;
      return `<div class="unit panel9">${pieceImg(t, 0, 'large', 56)}<b>${v ? VARIANTS[v].name : PIECE_NAMES_KO[t]} ×${n}</b><small>${f ? `개량 +${f}` : '개량 없음'}</small></div>`;
    });
    const ench = (Object.entries(run.loadout.enchants) as [EnchantId, number][]).map(([id, n]) => `<i class="tag${n >= 3 ? ' gold' : ''}">${ENCHANTS[id].name} ${n}단${n >= 3 ? '★' : ''}</i>`);
    const cards = run.loadout.cards.map((id) => `<i class="tag${CARDS[id].limit.type === 'consume' ? ' gold' : ''}">${CARDS[id].name}</i>`);
    const panel = this.hud.openOverlay(`
      <h2>${icon('flag')} 군단 ${run.deck.length}기</h2>
      <div class="army-list">${units.join('')}</div>
      <p class="sub">개조 (${ench.length}/6)</p><div class="unlocks">${ench.join('') || '<small class="lead">없음</small>'}</div>
      <p class="sub">천공 카드 (${cards.length}/${CARD_SLOTS})</p><div class="unlocks">${cards.join('') || '<small class="lead">없음</small>'}</div>
      ${button('닫기', 'data-close', { tone: 'brass', cls: 'wide' })}`);
    panel.querySelector('[data-close]')!.addEventListener('click', () => this.hud.closeOverlay());
  }

  /** 출하 중 메뉴 (모달): 계속 · 설정 · 메인 메뉴 · 출하 포기 */
  private showRunMenu(run: RunState): void {
    const panel = this.hud.openOverlay(`
      <h2>${TEXT.pause.title}</h2>
      <div class="col">
        ${button(TEXT.pause.resume, 'data-close', { tone: 'brass', cls: 'wide' })}
        ${button(TEXT.menu.settings, 'data-settings', { icon: 'watch', cls: 'wide' })}
        ${button(TEXT.pause.toMenu, 'data-menu', { cls: 'wide' })}
        ${button(TEXT.map.abandon, 'data-abandon', { tone: 'crimson', small: TEXT.map.abandonDesc, cls: 'wide' })}
      </div>`);
    this.wire(panel, {
      close: () => this.hud.closeOverlay(),
      settings: () => this.hud.showSettings(() => this.showRunMenu(run)),
      menu: () => this.showMenu(),
      abandon: () => {
        saveMeta(recordRunEnd(loadMeta(), run.floor, false, run.ascension ?? 0));
        clearRun();
        this.run = null;
        this.showMenu();
      },
    });
  }

  // ---------- 타이틀 · 메뉴 ----------
  /** 타이틀: 인트로(컨베이어 · 도장 · 붉은 사선) → 로고 → 화면을 누르면 메뉴 */
  showTitle(intro = true): void {
    const draw = () => {
      const el = this.hud.openScene(
        `<img class="logo in" src="./logo.png" alt="Pawnisher : Checkmate">
        <p class="press">${TEXT.pressStart}</p>
        <span class="ver">${TEXT.tagline}</span>`,
        'title-screen',
        'title',
      );
      el.setAttribute('data-title', '');
      el.onclick = () => {
        el.onclick = null;
        sfx('submit');
        this.showMenu();
      };
    };
    if (!intro) return draw();
    const el = this.hud.openScene(`<button class="btn skip" type="button" data-skip>${TEXT.skip}</button>`, 'title-screen', 'title');
    el.setAttribute('data-title', '');
    const finish = () => draw();
    el.onclick = () => this.hud.backdrop.skipIntro();
    this.hud.backdrop.playIntro(finish);
  }

  private ascension = 0;

  showMenu(): void {
    this.hud.closeOverlay();
    const saved = loadRun();
    const meta = loadMeta();
    this.ascension = Math.min(this.ascension, meta.ascension);
    const live = saved && saved.stage.at !== 'over';
    const M = TEXT.menu;
    const asc = meta.ascension
      ? `<p class="sub">${icon('flame', 's')} ${M.pressure}</p><div class="unlocks">${ASCENSIONS.slice(0, meta.ascension + 1)
          .map((d, i) => `<button class="btn${i === this.ascension ? ' cyan' : ''}" type="button" data-asc="${i}" title="${d}">압력 ${i}</button>`)
          .join('')}</div><p class="lead">${ASCENSIONS[this.ascension]}</p>`
      : '';
    const unlocks = UNLOCK_DECKS.map((u) => `<span class="unlock panel9${u.ok(meta) ? ' ok' : ''}">${u.deck.map((t) => pieceImg(t, 0, 'small', 20)).join('')} ${u.name}${u.ok(meta) ? '' : ` · ${u.need}`}</span>`).join('');
    const el = this.hud.openScene(
      `<div class="left">
        <img class="logo" src="./logo.png" alt="Pawnisher : Checkmate">
        ${live ? button(M.continue, 'data-continue', { tone: 'brass', icon: 'lever', small: `${ACT_NAMES[actOf(Math.min(saved!.floor, TOTAL_FLOORS)) - 1]} ${inAct(Math.min(saved!.floor, TOTAL_FLOORS))}층 · 나사 ${saved!.gold} · 군단 ${saved!.deck.length}기` }) : ''}
        ${button(M.newRun, 'data-new', { tone: live ? undefined : 'brass', icon: 'flag', small: live ? M.newRunWarn : undefined })}
        ${button(M.trial, 'data-test', { icon: 'sword', small: M.trialDesc })}
        ${button(M.settings, 'data-settings', { icon: 'watch' })}
      </div>
      <div class="right">
        <div class="records">
          <div class="panel9"><span class="num">${meta.runs}</span><small>${M.records[0]}</small></div>
          <div class="panel9"><span class="num">${meta.bestFloor}</span><small>${M.records[1]} (층)</small></div>
          <div class="panel9"><span class="num">${meta.clears}</span><small>${M.records[2]}</small></div>
        </div>
        ${asc}
        <p class="sub">${icon('crate', 's')} ${M.unlocks}</p>
        <div class="unlocks">${unlocks}</div>
        <button class="btn" type="button" data-title-back>${icon('eye', 's')} ${M.quit}</button>
      </div>`,
      'menu',
    );
    this.wire(el, {
      continue: () => {
        this.run = loadRun();
        this.show();
      },
      new: () => this.startNew(),
      asc: (b) => {
        this.ascension = Number(b.dataset.asc);
        this.showMenu();
      },
      test: () => this.hud.showStart(),
      settings: () => this.hud.showSettings(() => this.hud.closeOverlay()),
      'title-back': () => this.showTitle(false),
    });
  }

  /** 새 출하: 시작 세트 3지선다 */
  private startNew(): void {
    const meta = loadMeta();
    const seed = (Date.now() % 1_000_000_000) + 1;
    const decks = startDeckOptions(seed, unlockedDecks(meta));
    const desc: Record<string, string> = { N: '나이트 — L자로 뛰어넘어 친다', B: '비숍 — 대각선 먼 거리', R: '룩 — 직선 먼 거리, 튼튼함', P: '폰 — 싸고 많다, 끝줄에서 퀸' };
    const el = this.hud.openScene(
      `<div class="bar"><span class="plate">${icon('flag', 's')}${TEXT.start.title}</span><span class="spacer"></span>${button(TEXT.start.back, 'data-menu')}</div>
      <p class="lead">${TEXT.start.lead}</p>
      <div class="stage"><div class="offers">${decks
        .map((d, i) => {
          const kinds = [...new Set(d.filter((t) => t !== 'K'))].map((t) => desc[t]).join('<br>');
          return `<button class="offer" type="button" data-deck="${i}"><span class="kind">시작 세트</span><b>${setName(d)}</b><span>${d.map((t) => pieceImg(t, 0, 'large', 64)).join('')}</span><p>${kinds}</p></button>`;
        })
        .join('')}</div></div>`,
    );
    this.wire(el, {
      deck: (b) => {
        this.run = newRun(seed, { ascension: Math.min(this.ascension, meta.ascension), extraDecks: unlockedDecks(meta), deck: decks[Number(b.dataset.deck)] });
        sfx('submit');
        this.save();
        this.show();
      },
      menu: () => this.showMenu(),
    });
  }

  // ---------- 단계별 화면 ----------
  show(): void {
    const run = this.run;
    if (!run) return this.showMenu();
    switch (run.stage.at) {
      case 'map':
        return this.showMap(run);
      case 'battle':
        return this.startBattle(run);
      case 'reward':
        return this.showReward(run);
      case 'shop':
        return this.showShop(run);
      case 'forge':
        return this.showForge(run);
      case 'altar':
        return this.showAltar(run);
      case 'event':
        return this.showEvent(run);
      case 'over':
        return this.showOver(run);
    }
  }

  /** 공정 지도: 1층 → 12층(반장)이 가로로 흐른다. 지금 층의 노드만 누를 수 있다 */
  private showMap(run: RunState): void {
    const act = actOf(run.floor);
    const first = (act - 1) * FLOORS_PER_ACT;
    const cols = run.map.slice(first, first + FLOORS_PER_ACT).map((nodes, k) => {
      const i = first + k;
      const f = i + 1;
      const cur = f === run.floor;
      const btns = nodes
        .map((n, j) => {
          const chosen = run.path[i] === j;
          const label = NODE_NAMES[n.kind];
          const state = cur ? 'open' : f < run.floor ? (chosen ? 'chosen past' : 'past') : 'future';
          const ic = n.kind === 'event' && n.event && f <= run.floor ? EVENT_ICON[n.event] : NODE_ICON[n.kind];
          const title = n.kind === 'boss' ? `${NODE_NAMES.boss} · ${bossName(run, f)}` : n.kind === 'event' && n.event ? `${NODE_NAMES.event} · ${EVENTS[n.event].title}` : NODE_NAMES[n.kind];
          return `<button class="node ${n.kind} ${state}" type="button" ${cur ? `data-node="${j}"` : 'disabled'} data-f="${f}" data-j="${j}" aria-label="${title}" title="${title}">${icon(ic)}<span>${label}</span></button>`;
        })
        .join('');
      return `<div class="floor-col${cur ? ' current' : ''}" data-col="${f}"><span class="fl">${inAct(f)}층</span>${btns}</div>`;
    });
    const bossF = act * FLOORS_PER_ACT;
    const bossId = act < 3 ? run.bosses[act - 1] : null;
    const boss = bossOf(run, bossF);
    const bossPiece: PieceType = bossId ? BOSS_PIECE[bossId] : 'Q';
    const el = this.hud.openScene(
      `${this.bar(run)}
      <div class="title-line"><h2>${ACT_NAMES[act - 1]}</h2><p>${inAct(run.floor)}층 · ${TEXT.map.choose}</p></div>
      <div class="stage">
        <div class="map-wrap grow scroll-x" data-scroll><div class="map"><svg class="links"></svg>${cols.join('')}</div></div>
        <div class="boss-card panel9">
          <span class="kind" style="font-size:12px;color:var(--crimson-soft)">${icon('crown', 's')} ${TEXT.map.bossAhead} · ${inAct(bossF)}층</span>
          <div class="portrait">${pieceImg(bossPiece, 1, 'large', 80)}</div>
          <b>${boss.name}</b>
          <p class="quote">“${boss.quote}”</p>
          <small class="lead">${boss.role}</small>
          <small class="lead dim">${boss.title}</small>
        </div>
      </div>
      <div class="map-legend">${(['battle', 'elite', 'shop', 'forge', 'altar', 'event'] as NodeKind[]).map((k) => `<span>${icon(NODE_ICON[k], 's')}${NODE_NAMES[k]}</span>`).join('')}</div>`,
    );
    this.wireBar(el, run);
    this.wire(el, { node: (b) => this.act(enterNode(run, Number(b.dataset.node))) });
    requestAnimationFrame(() => {
      const wrap = el.querySelector<HTMLElement>('[data-scroll]')!;
      const cur = el.querySelector<HTMLElement>('.floor-col.current');
      if (cur) wrap.scrollLeft = Math.max(0, cur.offsetLeft - wrap.clientWidth / 2 + cur.offsetWidth / 2);
      this.drawLinks(el, run, first);
    });
  }

  /** 지도 연결선: 지나온 길(황동) · 지금 고를 수 있는 길(점선) · 앞으로(옅은 회색) */
  private drawLinks(el: HTMLElement, run: RunState, first: number): void {
    const map = el.querySelector<HTMLElement>('.map')!;
    const svg = el.querySelector<SVGSVGElement>('svg.links')!;
    svg.setAttribute('width', String(map.scrollWidth));
    svg.setAttribute('height', String(map.clientHeight));
    const base = map.getBoundingClientRect();
    const at = (f: number, j: number) => {
      const n = el.querySelector<HTMLElement>(`[data-f="${f}"][data-j="${j}"]`);
      if (!n) return null;
      const r = n.getBoundingClientRect();
      return { x: r.left - base.left + r.width / 2, y: r.top - base.top + r.height / 2 };
    };
    const lines: string[] = [];
    const line = (a: { x: number; y: number } | null, b: { x: number; y: number } | null, style: string) => {
      if (a && b) lines.push(`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" ${style} shape-rendering="crispEdges"/>`);
    };
    for (let k = 0; k < FLOORS_PER_ACT - 1; k++) {
      const f = first + k + 1;
      const nodes = run.map[f - 1] ?? [];
      const next = run.map[f] ?? [];
      if (f < run.floor) {
        const a = run.path[f - 1];
        if (f + 1 < run.floor) line(at(f, a), at(f + 1, run.path[f]), 'stroke="#c89b3c" stroke-width="4" stroke-dasharray="4 4"');
        else next.forEach((_, j) => line(at(f, a), at(f + 1, j), 'stroke="#e8c060" stroke-width="3" stroke-dasharray="2 6"'));
      } else nodes.forEach((_, i) => next.forEach((__, j) => line(at(f, i), at(f + 1, j), 'stroke="#3a3542" stroke-width="2" stroke-dasharray="2 6"')));
    }
    svg.innerHTML = lines.join('');
  }

  private startBattle(run: RunState): void {
    if (run.stage.at !== 'battle') return;
    const e = run.stage.encounter;
    const state: BattleState = run.stage.battle ?? encounterBattle(run.deck, run.loadout, e);
    this.hud.closeOverlay();
    this.hud.closeScene();
    this.c.onPlayerTurn = (s) => {
      recordBattle(run, s);
      this.save();
    };
    this.c.onBattleEnd = (s) => {
      if (s.winner === 0 && e.kind === 'boss') unlockAchievement(`ACT${actOf(run.floor)}_CLEAR`);
      finishBattle(run, s);
      this.save();
      window.setTimeout(() => this.show(), 600);
    };
    this.c.startState(state, e.tier, TUNED);
    // 대국 시작 한 줄: 반장은 자기 대사, 검문!은 경고, 그 밖엔 공정과 군단 이름
    const opening =
      e.kind === 'boss' ? `${bossName(run, run.floor)} — “${bossOf(run, run.floor).quote}”` : e.kind === 'elite' ? `검문! ${e.name}` : run.floor <= 2 ? '“움직인 놈만 쏜다. 붉은 과녁 칸으로 보내.”' : `${inAct(run.floor)}층 · ${e.name}`;
    this.hud.toast(opening);
  }

  private showReward(run: RunState): void {
    if (run.stage.at !== 'reward') return;
    const st = run.stage;
    const ch = st.choices[0];
    const R = TEXT.reward;
    let offers = '';
    let kind = '';
    if (ch?.type === 'piece') {
      kind = R.piece;
      offers = ch.options.map((t) => `<button class="offer" type="button" data-pick="${t}">${pieceOffer(run, t)}</button>`).join('');
    } else if (ch?.type === 'enchant') {
      kind = R.enchant;
      offers = ch.options
        .map((id) => {
          const next = (run.loadout.enchants[id] ?? 0) + 1;
          return `<button class="offer${next >= 3 ? ' rare' : ''}" type="button" data-pick="${id}">${enchantOffer(id, next, run)}</button>`;
        })
        .join('');
    } else if (ch?.type === 'card') {
      kind = R.card;
      offers = ch.options.map((id) => `<button class="offer${CARDS[id].limit.type === 'consume' ? ' rare' : ''}" type="button" data-pick="${id}">${cardOffer(id)}</button>`).join('');
    }
    const lines = st.lines.map((l) => `<i class="tag">${l}</i>`).join('');
    const el = this.hud.openScene(
      `${this.bar(run)}
      <div class="title-line"><h2>${st.title}</h2>${ch ? `<p>검수관이 서류를 넘긴다. “통과. …아직은. ${kind}, 하나만.”</p>` : ''}</div>
      ${lines ? `<div class="unlocks">${lines}</div>` : ''}
      <div class="stage">${ch ? `<div class="offers">${offers}</div>` : '<div class="grow"></div>'}</div>
      <div class="row" style="display:flex;justify-content:flex-end;gap:8px;padding-bottom:8px">
        ${ch ? button(`${R.skip} (나사 +${SKIP_GOLD})`, 'data-skip') : button(R.next, 'data-next', { tone: 'brass', icon: 'lever' })}
      </div>`,
    );
    this.wireBar(el, run);
    this.wire(el, {
      pick: (b) => {
        const id = b.dataset.pick!;
        sfx('land');
        this.act(takeChoice(run, id), () => this.discardPicker(run, ch!.type as 'enchant' | 'card', (d) => this.act(takeChoice(run, id, d))));
      },
      skip: () => {
        skipChoice(run);
        this.act();
      },
      next: () => this.act(finishReward(run)),
    });
  }

  /** 칸이 가득 찼을 때 버릴 것을 고른다 (모달) */
  private discardPicker(run: RunState, type: 'enchant' | 'card', done: (discard: EnchantId | number) => void): void {
    const items =
      type === 'enchant'
        ? (Object.entries(run.loadout.enchants) as [EnchantId, number][]).map(([id, n]) => `<button class="chip" type="button" data-d="${id}"><b>${ENCHANTS[id].name}</b><small>${n}단 — 단째 사라진다</small></button>`)
        : run.loadout.cards.map((id, i) => `<button class="chip" type="button" data-d="${i}"><b>${CARDS[id].name}</b><small>${CARDS[id].desc}</small></button>`);
    const panel = this.hud.openOverlay(`
      <h2>${type === 'enchant' ? '개조 칸이 꽉 찼다' : `천공 카드 칸(${CARD_SLOTS})이 꽉 찼다`}</h2>
      <p>하나를 뜯어내야 새 것이 들어간다. 뜯은 건 돌아오지 않는다.</p>
      <div class="chips">${items.join('')}</div>
      ${button('취소', 'data-cancel', { cls: 'wide' })}`);
    this.wire(panel, {
      d: (b) => done(type === 'enchant' ? (b.dataset.d as EnchantId) : Number(b.dataset.d)),
      cancel: () => this.show(),
    });
  }

  private showShop(run: RunState): void {
    if (run.stage.at !== 'shop') return;
    const s = run.stage.stock;
    const S = TEXT.shop;
    const item = (attr: string, i: number, html: string, price: number, sold: boolean, rare = false) =>
      `<button class="offer${rare ? ' rare' : ''}${!sold && run.gold < price ? ' poor' : ''}" style="flex:0 0 150px" type="button" data-${attr}="${i}" ${sold ? 'disabled' : ''}>${html}<span class="price">${sold ? S.sold : `${icon('screw', 's')}${price}`}</span></button>`;
    const goods = [
      ...s.pieces.map((p, i) => item('piece', i, pieceOffer(run, p.item), p.price, p.sold)),
      ...s.enchants.map((p, i) => {
        const next = (run.loadout.enchants[p.item] ?? 0) + 1;
        return item('ench', i, enchantOffer(p.item, next, run), p.price, p.sold, next >= 3);
      }),
      ...s.cards.map((p, i) => item('card', i, cardOffer(p.item), p.price, p.sold, CARDS[p.item].limit.type === 'consume')),
    ];
    const el = this.hud.openScene(
      `${this.bar(run)}
      <div class="title-line"><h2>${icon('screw')} ${S.title}</h2><p>${S.lead}</p></div>
      <div class="stage">
        <div class="offers scroll-x grow">${goods.join('')}</div>
        <div class="col" style="width:170px;flex:none;justify-content:flex-end">
          ${button(S.sell, 'data-sellmenu', { icon: 'scale', cls: 'wide' })}
          ${button(S.reroll, 'data-reroll', { icon: 'swap', small: `나사 ${s.rerollPrice}`, cls: `wide${run.gold < s.rerollPrice ? ' poor' : ''}` })}
          ${button(S.leave, 'data-leave', { tone: 'brass', icon: 'lever', cls: 'wide' })}
        </div>
      </div>`,
    );
    this.wireBar(el, run);
    this.wire(el, {
      piece: (b) => this.act(buyPiece(run, Number(b.dataset.piece))),
      card: (b) => {
        const i = Number(b.dataset.card);
        this.act(buyCard(run, i), () => this.discardPicker(run, 'card', (d) => this.act(buyCard(run, i, d as number))));
      },
      ench: (b) => {
        const i = Number(b.dataset.ench);
        this.act(buyEnchant(run, i), () => this.discardPicker(run, 'enchant', (d) => this.act(buyEnchant(run, i, d as EnchantId))));
      },
      sellmenu: () => this.showSell(run),
      reroll: () => this.act(reroll(run)),
      leave: () => {
        leaveNode(run);
        this.act();
      },
    });
  }

  /** 고물상 팔기 (모달) */
  private showSell(run: RunState): void {
    const types = ORDER.filter((t) => t !== 'K' && run.deck.includes(t));
    const panel = this.hud.openOverlay(`
      <h2>${icon('scale')} ${TEXT.shop.sell}</h2>
      <p>“팔면 끝이야. 울면서 돌려 달래도 안 돼, 종이 왕관.”</p>
      <div class="chips">${types.map((t) => `<button class="chip" type="button" data-sell="${t}"><b>${pieceImg(t, 0, 'small', 24)} ${PIECE_NAMES_KO[t]} ×${run.deck.filter((x) => x === t).length}</b><small>1기 팔기 · 나사 +${sellPrice(t)}</small></button>`).join('')}</div>
      ${button('닫기', 'data-close', { tone: 'brass', cls: 'wide' })}`);
    this.wire(panel, {
      sell: (b) => {
        const err = sellPiece(run, b.dataset.sell as PieceType);
        if (err) this.hud.toast(err);
        this.save();
        this.showShop(run);
        this.showSell(run);
      },
      close: () => this.hud.closeOverlay(),
    });
  }

  private showForge(run: RunState): void {
    const F = TEXT.forge;
    const types = ORDER.filter((t) => run.deck.includes(t));
    const cards = types.map((t) => {
      const lv = run.loadout.forge[t] ?? 0;
      const cost = forgeCost(run, t);
      const n = run.deck.filter((x) => x === t).length;
      const v = run.loadout.variants?.[t];
      const opts = forgeVariantOptions(run, t);
      const lvPips = Array.from({ length: FORGE_MAX }, (_, i) => `<i class="${i < lv ? 'on' : ''}${i === VARIANT_FORGE_LEVEL - 1 ? ' v' : ''}"></i>`).join('');
      return `<div class="forge-card panel9">
        ${pieceImg(t, 0, 'large', 72)}
        <b>${PIECE_NAMES_KO[t]} ×${n}</b>
        <span class="vname">${v ? `이형 · ${VARIANTS[v].name}` : lv >= VARIANT_FORGE_LEVEL ? '' : `+${VARIANT_FORGE_LEVEL} 이형 가능`}</span>
        <span class="lv">${lvPips}</span>
        ${cost === null ? `<span class="tag gold">완성 거푸집</span>` : `<button class="btn${run.gold >= cost ? ' brass' : ' poor'}" type="button" data-up="${t}">+${lv + 1} ${screws(cost)}</button>`}
        ${opts.length ? opts.map((id) => `<button class="btn cyan" type="button" data-variant="${t}:${id}">이형 → ${VARIANTS[id].name}</button>`).join('') : '<span class="slot-v"></span>'}
      </div>`;
    });
    const el = this.hud.openScene(
      `${this.bar(run)}
      <div class="title-line"><h2>${icon('anvil')} ${F.title}</h2><p>${F.lead} ${F.variantLead}</p></div>
      <div class="stage"><div class="forge-row">${cards.join('')}</div></div>
      <div style="display:flex;justify-content:flex-end;padding-bottom:8px">${button(F.leave, 'data-leave', { tone: 'brass', icon: 'lever' })}</div>`,
    );
    this.wireBar(el, run);
    this.wire(el, {
      up: (b) => {
        sfx('hit', 3);
        this.act(forgeUp(run, b.dataset.up as PieceType));
      },
      variant: (b) => {
        const [t, id] = b.dataset.variant!.split(':') as [PieceType, VariantId];
        this.confirmVariant(run, t, id);
      },
      leave: () => {
        leaveNode(run);
        this.act();
      },
    });
  }

  /** 이형 거푸집 확인 (모달): 강점 · 대가 · 되돌릴 수 없음 */
  private confirmVariant(run: RunState, t: PieceType, id: VariantId): void {
    const v = VARIANTS[id];
    const panel = this.hud.openOverlay(`
      <h2>${icon('anvil')} 이형 거푸집 — ${v.name}</h2>
      <p>“${PIECE_NAMES_KO[t]} 거푸집을 통째로 뜯는다. 무르기 없다.”</p>
      <div class="panel9"><p><b style="color:var(--cyan)">강점</b> ${v.gain}</p><p><b style="color:var(--crimson-soft)">대가</b> ${v.cost}</p></div>
      <div class="row">${button('그만두기', 'data-no')}${button('바꾼다', 'data-yes', { tone: 'brass' })}</div>`);
    this.wire(panel, {
      no: () => this.hud.closeOverlay(),
      yes: () => {
        sfx('kill');
        this.act(forgeVariant(run, t, id));
      },
    });
  }

  private showAltar(run: RunState): void {
    if (run.stage.at !== 'altar') return;
    const A = TEXT.altar;
    const r = run.stage.result;
    if (r?.kind === 'pick') {
      const all = (Object.keys(ENCHANTS) as EnchantId[]).filter((id) => (run.loadout.enchants[id] ?? 0) < ENCHANT_MAX_STACK);
      const el = this.hud.openScene(
        `${this.bar(run)}
        <div class="title-line"><h2>${icon('lever')} 행운 톱니 해방</h2><p>행운 톱니가 다 찼다. “원하는 걸 골라. 이번엔 꽝 없어.”</p></div>
        <div class="stage"><div class="offers scroll-x grow">${all
          .map((id) => {
            const next = (run.loadout.enchants[id] ?? 0) + 1;
            return `<button class="offer${next >= 3 ? ' rare' : ''}" style="flex:0 0 170px" type="button" data-pick="${id}">${enchantOffer(id, next, run)}</button>`;
          })
          .join('')}</div></div>`,
      );
      this.wireBar(el, run);
      this.wire(el, {
        pick: (b) => {
          const id = b.dataset.pick as EnchantId;
          this.act(altarPick(run, id), () => this.discardPicker(run, 'enchant', (d) => this.act(altarPick(run, id, d as EnchantId))));
        },
      });
      return;
    }
    const odds = [ALTAR.odds.enchant, ALTAR.odds.piece, ALTAR.odds.variant, 1 - ALTAR.odds.enchant - ALTAR.odds.piece - ALTAR.odds.variant];
    const result =
      r?.kind === 'miss'
        ? `<span class="result-stamp bad">꽝</span><p class="lead">기계가 나사를 삼키고 트림을 한다. 행운 톱니가 한 칸 돈다 (${run.crackGauge}/${ALTAR.gaugeMax}) — 다음엔 될 것 같지 않아?</p>`
        : r?.kind === 'variant'
          ? `<span class="result-stamp good">드르르륵— 쾅! 이형 거푸집!</span><p class="lead"><b>${VARIANTS[r.variant].name}</b> · ${VARIANTS[r.variant].gain}</p>`
          : r?.kind === 'piece'
            ? r.piece
              ? `<span class="result-stamp cyan">상위 기물</span><p class="lead">${pieceImg(r.piece, 0, 'large', 40)} ${PIECE_NAMES_KO[r.piece]}가 굴러 나와 군단 뒤에 줄을 선다</p>`
              : `<span class="result-stamp cyan">상위 기물</span><p class="lead">자리가 없다. 고물상이 냉큼 나사로 바꿔 갔다</p>`
            : '';
    const canPick = altarCanPick(run);
    const el = this.hud.openScene(
      `${this.bar(run)}
      <div class="stage">
        <div class="art panel9">${icon('lever', 'xl', '#c4b5fd')}<span class="caption">${pips(run.crackGauge, ALTAR.gaugeMax)} 행운 톱니</span></div>
        <div class="col grow">
          <div class="title-line"><h2>${A.title}</h2><p>${A.lead}</p></div>
          <div class="odds panel9">${A.outcomes.map((o, i) => `<div><span style="width:120px">${o}</span><span class="bar-in"><i style="width:${Math.round(odds[i] * 100)}%"></i></span><span>${Math.round(odds[i] * 100)}%</span></div>`).join('')}</div>
          ${result}
          <div style="display:flex;gap:8px;margin-top:auto">
            ${!r ? button(canPick ? A.release : `${A.pull}`, 'data-gamble', { tone: 'brass', icon: 'lever', small: canPick ? undefined : `나사 ${ALTAR.cost}`, cls: !canPick && run.gold < ALTAR.cost ? 'poor' : undefined }) : ''}
            ${button(A.leave, 'data-leave', { tone: r ? 'brass' : undefined })}
          </div>
        </div>
      </div>`,
    );
    this.wireBar(el, run);
    this.wire(el, {
      gamble: () => {
        sfx('submit');
        this.act(altarGamble(run));
      },
      leave: () => {
        leaveNode(run);
        this.act();
      },
    });
  }

  private showEvent(run: RunState): void {
    if (run.stage.at !== 'event') return;
    const st = run.stage;
    const ev = EVENTS[st.id];
    const el = this.hud.openScene(
      `${this.bar(run)}
      <div class="stage">
        <div class="art panel9">${icon(EVENT_ICON[st.id], 'xl', 'var(--paper)')}<span class="caption">${NODE_NAMES.event}</span></div>
        <div class="col grow">
          <div class="title-line"><h2>${ev.title}</h2></div>
          <p class="lead" style="font-size:15px">${ev.text}</p>
          ${
            st.result
              ? `<span class="result-stamp cyan">결과</span><p class="lead">${st.result}</p><div style="margin-top:auto">${button('계속', 'data-leave', { tone: 'brass', icon: 'lever' })}</div>`
              : `<div class="choices" style="margin-top:auto">${ev.choices
                  .map((ch, i) => button(ch.label, `data-ev="${i}"`, { small: ch.desc || undefined, cls: 'wide', disabled: !eventChoiceAvailable(run, st.id, i), tone: i === 0 ? 'brass' : undefined }))
                  .join('')}</div>`
          }
        </div>
      </div>`,
    );
    this.wireBar(el, run);
    this.wire(el, {
      ev: (b) => this.act(eventChoose(run, Number(b.dataset.ev))),
      leave: () => {
        leaveNode(run);
        this.act();
      },
    });
  }

  private showOver(run: RunState): void {
    const won = run.stage.at === 'over' && run.stage.won;
    const floor = Math.min(run.floor, TOTAL_FLOORS);
    const before = loadMeta();
    const meta = recordRunEnd(before, floor, won, run.ascension ?? 0);
    if (won) unlockAchievement(`ASCENSION_${run.ascension ?? 0}_CLEAR`);
    saveMeta(meta);
    clearRun();
    const newly = UNLOCK_DECKS.filter((u) => u.ok(meta) && !u.ok(before)).map((u) => `시작 세트 해금: ${u.name}`);
    if (meta.ascension > before.ascension) newly.push(`압력 ${meta.ascension} 해금: ${ASCENSIONS[meta.ascension]}`);
    const O = TEXT.over;
    const ench = Object.keys(run.loadout.enchants).length;
    const el = this.hud.openScene(
      `<div class="stamp-big ${won ? 'good' : 'bad'}">${won ? O.win : O.lose}</div>
      <h2 class="say">“${won ? O.winSay : O.loseSay}”<small>— 검수관</small></h2>
      <p class="tell">${won ? O.winTell : `${ACT_NAMES[actOf(floor) - 1]} ${inAct(floor)}층. ${O.loseTell}`}</p>
      <div class="records" style="width:min(520px,90vw)">
        <div class="panel9"><span class="num">${floor}</span><small>도달 층</small></div>
        <div class="panel9"><span class="num">${run.deck.length}</span><small>군단</small></div>
        <div class="panel9"><span class="num">${ench}</span><small>개조</small></div>
        <div class="panel9"><span class="num">${run.wins}</span><small>이긴 대국</small></div>
      </div>
      ${newly.length ? `<div class="unlocks">${newly.map((n) => `<i class="tag gold">${n}</i>`).join('')}</div>` : ''}
      <div style="display:flex;gap:8px">${button(O.menu, 'data-menu')}${button(O.again, 'data-new', { tone: 'brass', icon: 'flag' })}</div>`,
      'ending',
    );
    this.run = null;
    this.wire(el, {
      menu: () => this.showMenu(),
      new: () => this.startNew(),
    });
  }
}
