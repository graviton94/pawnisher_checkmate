import { dailySeed, freshSeed, parseSeed, seedCode, todayKey } from '../run/seed';
import { runFeedback, vignette, type RunDelta } from './juice';
import { sfx } from '../audio/sfx';
import { TUNED } from '../data/aiWeights';
import { PIECE_NAMES_KO, PIECE_STATS } from '../data/pieces';
import { ACT_NAMES, DAILY, START_DECKS, BOSSES, FINAL_BOSS, FLOORS_PER_ACT, NODE_NAMES, SKIP_GOLD, THREATS, TOTAL_FLOORS, actOf, inAct, type NodeKind, type ThreatId } from '../data/run';
import { CARVES, CARVE_IDS, type CarveId } from '../data/carves';
import { PARTS, PART_IDS, PART_SLOTS, type PartId } from '../data/parts';
import { BOSS_TWIST, TWISTS } from '../data/twists';
import { PIECE_LORE, SET_LORE, TEXT } from '../data/text';
import { choose, dismissAll } from './motion';
import { coach, coachLines, markCoachSeen } from './coach';
import { COACH_TAUGHT } from '../data/coach';
import { portraitBig, speaker } from './portrait';
import { playCuts, promotionScene } from './cutscene';
import { ACT_ENTRY, AFTER_PROMOTION, BOSS_STORY, CUT_UI, DEFEAT, ENDING_A_MONO, GILDED, JOIN, OVER_STORY, PROLOGUE, RECORDS, RECRUIT, TAUNTS, TRUE_ENDING, promotionFor, type Cut } from '../data/story';
import { NPCS, type NpcId } from '../data/npcs';
import { playMusic } from '../audio/music';
import { logBattle, logOffer, logRun } from '../run/telemetry';
import { LESSONS } from '../data/onboarding';
import { RULEBOOK } from '../data/rulebook';
import { APP_VERSION } from '../data/version';
import { lessonBattle } from '../run/onboarding';
import { GRADE_NAME, type Grade } from '../data/grades';
import { ASCENSIONS, MAX_ASCENSION, UNLOCK_DECKS, absorbRun, loadMeta, recordRunEnd, saveMeta, unlockedDecks } from '../run/meta';
import { EVENT_IDS } from '../run/events';
import type { BattleController } from '../game/controller';
import type { BattleState, Deck, PieceType } from '../engine';
import type { Unit } from '../engine/setup';
import { EVENTS, type EventId } from '../run/events';
import { encounterBattle } from '../run/legion';
import {
  bossIdOf,
  bossName,
  bossOf,
  startDeckOptions,
  buyCarve,
  buyPart,
  buyPiece,
  clearRun,
  enterNode,
  eventChoiceAvailable,
  eventChoose,
  finishBattle,
  finishReward,
  forgeCarve,
  forgeUpgrade,
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
  UPGRADE,
  type Pair,
  type RunState,
} from '../run/run';
import type { Hud } from './hud';
import { pieceImg } from './sprites';
import { button, icon } from './chrome';
import { unlockAchievement } from '../platform';

const ORDER: PieceType[] = ['K', 'Q', 'R', 'B', 'N', 'P'];
/** 고르기 모션을 거는 버튼 (D-109). 고물상 진열(BUY)은 고른 것만 들리고 나머지는 남는다 */
const BUY_ATTRS = new Set(['piece', 'carve', 'part']);
const CHOOSE_ATTRS = new Set(['pick', 'deck', 'node', 'd', 'sell', 'unit', ...BUY_ATTRS]);

/** 공정 지도 노드 아이콘 (public/ui/icons) */
const NODE_ICON: Record<NodeKind, string> = { battle: 'sword', elite: 'skull', boss: 'crown', shop: 'screw', forge: 'anvil', event: 'question' };
/** 돌발마다 나오는 말하는 기물 (D-133 · D-134) — 없으면 아이콘 */
const EVENT_NPC: Partial<Record<EventId, NpcId>> = { smith: 'tinkerPawn', gambler: 'coinKnight', apprentice: 'apprentice', scout: 'blackBishop', napping: 'scale', nightShift: 'monoBishop' };
const EVENT_ICON: Record<EventId, string> = { smith: 'wrench', gambler: 'windkey', apprentice: 'wrench', scout: 'scale', napping: 'watch', nightShift: 'anvil', pact: 'flame', dipping: 'flame', swapDealer: 'swap', auction: 'bell', brokenGacha: 'lever', safe: 'crate' };
const BOSS_PIECE: Record<string, PieceType> = { knight: 'N', bishop: 'B', rook: 'R', pawn: 'P', variant: 'Q', affix: 'K' };

/** 연출 비교용 출하 상태 (D-104) */
interface RunSnap {
  gold: number;
  deck: number;
  carves: number;
  stage: string;
  /** 에픽 부품 수 */
  epic: number;
}
const snapOf = (run: RunState): RunSnap => ({
  gold: run.gold,
  deck: run.deck.length,
  carves: run.deck.filter((u) => u.carve).length,
  epic: run.parts.filter((id) => PARTS[id].grade === 'epic').length,
  stage: run.stage.at,
});

/** 시작 세트 이름 (해금 세트는 meta의 이름) */
const setName = (deck: Deck): string => {
  const types = deck.map((d) => (typeof d === 'string' ? d : d.t));
  const key = [...types].sort().join('');
  const u = UNLOCK_DECKS.find((x) => [...x.deck].map((d) => (typeof d === 'string' ? d : d.t)).sort().join('') === key);
  if (u) return u.name;
  return types.includes('N') ? '척후 세트' : types.includes('B') ? '견습 사제 세트' : '보병 세트';
};
const typesOf = (deck: Deck): PieceType[] => deck.map((d) => (typeof d === 'string' ? d : d.t));

/** 등급 딱지 (D-112): 색 + 글자 (색만으로 구분하지 않는다) */
const gradeChip = (g: Grade): string => `<i class="grade g-${g}">${GRADE_NAME[g]}</i>`;

/** 부품 카드 */
const partOffer = (id: PartId, tail = ''): string => {
  const p = PARTS[id];
  return `<span class="kind">${gradeChip(p.grade)} ${icon('wrench', 's')} 부품</span><b>${p.name}</b><p>${p.desc}</p><p class="dim-line">* ${p.lore}</p>${tail}`;
};
/** 각인 카드 */
const carveOffer = (id: CarveId): string => {
  const c = CARVES[id];
  return `<span class="kind">${icon('star', 's')} 각인</span><span class="carve-mark">${c.mark}</span><b>${c.name}</b><p>${c.desc}</p>`;
};
/** 양날 쌍 카드: 내 부품 + 적 강화 */
const pairOffer = (pair: Pair): string => partOffer(pair.part, `<p class="bad-line">대가: ${pair.threats.map((t: ThreatId) => THREATS[t].name).join(' · ')}</p>`);

const pieceOffer = (run: RunState, t: PieceType, recruit = false): string => {
  const n = run.deck.filter((u) => u.t === t).length;
  const tag = n ? `<i class="tag">보유 ${n}기</i>` : '<i class="tag cyan">새 유형</i>';
  const head = recruit ? `${icon('flag', 's')} ${TEXT.reward.recruit}` : `${icon('crate', 's')} 기물`;
  return `<span class="kind">${head} · 태엽 ${PIECE_STATS[t].ap}</span>${pieceImg(t, 0, 'large', 60)}<b>${PIECE_NAMES_KO[t]}</b><span class="tags">${tag}</span><p>${PIECE_LORE[t]}</p>`;
};

/** 군단 기물 한 칸 (기물 + 각인 글자) */
const unitChip = (u: Unit, i: number, attr: string, extra = ''): string =>
  `<button class="chip unit-chip" type="button" data-${attr}="${i}">${pieceImg(u.t, 0, 'small', 32)}<b>${PIECE_NAMES_KO[u.t]}</b><small>${u.carve ? `${CARVES[u.carve].mark} ${CARVES[u.carve].name}` : '각인 없음'}${extra}</small></button>`;

/**
 * 출하 화면들 (규격 2.0): 타이틀 · 메인 메뉴 · 시작 세트 · 공정 지도 · 보상 · 고물상 · 공방 · 돌발 · 결과.
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
    if (!this.run) return;
    saveRun(this.run);
    saveMeta(absorbRun(loadMeta(), this.run)); // 도감
  }

  /** 버튼 묶음 연결: data-* 속성 이름 → 처리 */
  private wire(panel: HTMLElement, handlers: Record<string, (el: HTMLElement) => void>): void {
    for (const [attr, fn] of Object.entries(handlers)) {
      panel.querySelectorAll<HTMLElement>(`[data-${attr}]`).forEach((el) =>
        el.addEventListener('click', () => {
          // 고르기 모션 (D-109): 고른 카드는 들리고, 나머지는 가라앉아 사라진 뒤 다음으로
          if (CHOOSE_ATTRS.has(attr) && el.matches('.offer, .node')) return choose(el, () => fn(el), !BUY_ATTRS.has(attr));
          if (attr === 'skip') return dismissAll(panel.querySelector('.offers'), () => fn(el));
          fn(el);
        }),
      );
    }
  }

  /** 조작 결과: 실패면 토스트, 성공이면 저장 후 다시 그림 */
  private act(err: string | void): void {
    if (err) this.hud.toast(err);
    this.save();
    this.show();
  }

  /** 위 상태 띠: 공정 · 층 · 나사 · 압력 · 군단 · 메뉴 */
  private bar(run: RunState, title?: string): string {
    const f = Math.min(run.floor, TOTAL_FLOORS);
    const counts = ORDER.map((t) => [t, run.deck.filter((u) => u.t === t).length] as const).filter(([, n]) => n);
    const army = counts.map(([t, n]) => `${pieceImg(t, 0, 'small', 24)}${n > 1 ? `<span class="n">${n}</span>` : ''}`).join('');
    return `<div class="bar">
      <span class="plate">${icon('anvil', 's')}${title ?? `${ACT_NAMES[actOf(f) - 1]} · ${inAct(f)}층`}</span>
      <span class="stat screw">${icon('screw', 's')}<b>${run.gold}</b></span>
      <span class="stat" title="부품">${icon('wrench', 's')}<b>${run.parts.length}/${PART_SLOTS}</b></span>
      ${run.ascension ? `<span class="stat">${icon('flame', 's')}압력 <b>${run.ascension}</b></span>` : ''}
      ${run.threats.length ? `<span class="stat bad" title="${run.threats.map((t) => THREATS[t].name).join(' · ')}">${icon('skull', 's')}적 강화 <b>${run.threats.length}</b></span>` : ''}
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

  /** 군단 보기 (모달): 기물 + 각인 · 부품 · 적 강화 */
  private showArmy(run: RunState): void {
    const units = run.deck
      .map((u, i) => [u, i] as const)
      .sort((a, b) => ORDER.indexOf(a[0].t) - ORDER.indexOf(b[0].t))
      .map(([u]) => `<div class="unit panel9">${pieceImg(u.t, 0, 'large', 48)}<b>${PIECE_NAMES_KO[u.t]}</b><small>${u.carve ? `${CARVES[u.carve].mark} ${CARVES[u.carve].name}` : '각인 없음'}</small></div>`);
    const panel = this.hud.openOverlay(`
      <h2>${icon('flag')} 군단 ${run.deck.length}기</h2>
      <div class="army-list">${units.join('')}</div>
      <p class="sub">부품 (${run.parts.length}/${PART_SLOTS})</p>${run.parts.map((id) => `<p class="legend-line">${gradeChip(PARTS[id].grade)} <b>${PARTS[id].name}</b> — ${PARTS[id].desc}</p>`).join('') || '<small class="lead">없음</small>'}
      ${run.threats.length ? `<p class="sub">적 강화 (양날 쌍의 대가)</p><div class="unlocks">${run.threats.map((t) => `<i class="tag red">${THREATS[t].name}</i>`).join('')}</div>` : ''}
      ${button('닫기', 'data-close', { tone: 'brass', cls: 'wide' })}`);
    panel.querySelector('[data-close]')!.addEventListener('click', () => this.hud.closeOverlay());
  }

  /** 군단 기물 고르기 (모달): 각인 새기기 · 팔기 · 다듬기 대상 */
  private pickUnit(run: RunState, title: string, lead: string, ok: (u: Unit) => boolean, done: (i: number) => void, extra?: (u: Unit) => string): void {
    const chips = run.deck.map((u, i) => (ok(u) ? unitChip(u, i, 'unit', extra ? extra(u) : '') : '')).join('');
    const panel = this.hud.openOverlay(`
      <h2>${title}</h2>
      <p>${lead}</p>
      <div class="chips">${chips || '<small class="lead">고를 기물이 없다.</small>'}</div>
      ${button('취소', 'data-cancel', { cls: 'wide' })}`);
    this.wire(panel, {
      unit: (b) => {
        this.hud.closeOverlay();
        done(Number(b.dataset.unit));
      },
      cancel: () => this.hud.closeOverlay(),
    });
  }

  /** 부품 칸이 가득 찼을 때 버릴 것을 고른다 (모달) */
  private discardPart(run: RunState, done: (i: number) => void): void {
    const panel = this.hud.openOverlay(`
      <h2>부품 칸(${PART_SLOTS})이 꽉 찼다</h2>
      <p>하나를 뜯어내야 새 것이 들어간다. 뜯은 건 돌아오지 않는다.</p>
      <div class="chips">${run.parts.map((id, i) => `<button class="chip" type="button" data-d="${i}"><b>${PARTS[id].name}</b><small>${GRADE_NAME[PARTS[id].grade]} · ${PARTS[id].desc}</small></button>`).join('')}</div>
      ${button('취소', 'data-cancel', { cls: 'wide' })}`);
    this.wire(panel, {
      d: (b) => {
        this.hud.closeOverlay();
        done(Number(b.dataset.d));
      },
      cancel: () => this.hud.closeOverlay(),
    });
  }

  /** 출하 중 메뉴 (모달): 계속 · 설정 · 메인 메뉴 · 출하 포기 */
  private showRunMenu(run: RunState): void {
    const panel = this.hud.openOverlay(`
      <h2>${TEXT.pause.title}</h2>
      <p class="seed">${TEXT.seed.label} <b>${seedCode(run.seed)}</b></p>
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
        saveMeta(recordRunEnd(loadMeta(), run.floor, false, run.ascension ?? 0, run));
        logRun(run, false, Date.now() - (run.startedAt ?? Date.now()));
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
        <span class="ver">${TEXT.tagline} · v${APP_VERSION}</span>`,
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
    playMusic('menu');
    this.hud.closeOverlay();
    const saved = loadRun();
    const meta = loadMeta();
    this.ascension = Math.min(this.ascension, meta.ascension);
    const live = saved && saved.stage.at !== 'over';
    const M = TEXT.menu;
    const asc = meta.ascension
      ? `<p class="sub">${icon('flame', 's')} ${M.pressure}</p><div class="asc-step"><button class="btn" type="button" data-asc="${this.ascension - 1}" aria-label="압력 내리기"${this.ascension <= 0 ? ' disabled' : ''}>◀</button><b>압력 ${this.ascension}<small> / ${meta.ascension}</small></b><button class="btn" type="button" data-asc="${this.ascension + 1}" aria-label="압력 올리기"${this.ascension >= meta.ascension ? ' disabled' : ''}>▶</button><p class="lead">${ASCENSIONS[this.ascension]}</p></div>`
      : '';
    const unlocks = UNLOCK_DECKS.map((u) => `<span class="unlock panel9${u.ok(meta) ? ' ok' : ''}">${typesOf(u.deck).map((t) => pieceImg(t, 0, 'small', 20)).join('')} ${u.name}${u.ok(meta) ? '' : ` · ${u.need}`}</span>`).join('');
    const el = this.hud.openScene(
      `<div class="left">
        ${live ? button(M.continue, 'data-continue', { tone: 'brass', icon: 'lever', small: `${ACT_NAMES[actOf(Math.min(saved!.floor, TOTAL_FLOORS)) - 1]} ${inAct(Math.min(saved!.floor, TOTAL_FLOORS))}층 · 나사 ${saved!.gold} · 군단 ${saved!.deck.length}기` }) : ''}
        ${button(M.newRun, 'data-new', { tone: live ? undefined : 'brass', icon: 'flag', small: live ? M.newRunWarn : undefined })}
        ${button(M.daily, 'data-daily', { icon: 'watch', small: meta.daily?.date === todayKey() ? M.dailyBest(meta.daily.floor, meta.daily.won) : M.dailyDesc })}
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
        <div class="row4">${button(M.codex, 'data-codex', { icon: 'crate' })}${button(M.rules, 'data-rules', { icon: 'card' })}${button(M.lessons, 'data-lessons', { icon: 'flag' })}<button class="btn" type="button" data-title-back>${icon('eye', 's')} ${M.quit}</button></div>
      </div>`,
      'menu',
    );
    this.wire(el, {
      continue: () => {
        this.run = loadRun();
        this.show();
      },
      new: () => this.startNew(),
      daily: () => this.startNew(dailySeed(), todayKey()),
      asc: (b) => {
        this.ascension = Number(b.dataset.asc);
        this.showMenu();
      },
      test: () => this.hud.showStart(),
      codex: () => this.showCodex(),
      rules: () => this.showRulebook(0),
      lessons: () => this.showOnboarding(0),
      settings: () => this.hud.showSettings(() => this.hud.closeOverlay()),
      'title-back': () => this.showTitle(false),
    });
  }

  /** 규칙서 (D-126): 왼쪽 목차 · 오른쪽 장 — 책자처럼 넘긴다 */
  private showRulebook(page: number): void {
    const p = RULEBOOK[page];
    const el = this.hud.openScene(
      `<div class="bar"><span class="plate">${icon('card', 's')}${TEXT.menu.rules}</span><span class="spacer"></span>${button(TEXT.codex.back, 'data-menu')}</div>
      <div class="rulebook">
        <nav class="rb-toc scroll-y">${RULEBOOK.map((r, i) => `<button class="rb-ch${i === page ? ' on' : ''}" type="button" data-rb="${i}">${icon(r.icon, 's')}<span>${r.title}</span></button>`).join('')}</nav>
        <article class="rb-page panel9 scroll-y"><h2>${icon(p.icon)} ${p.title} <small class="dim">${page + 1} / ${RULEBOOK.length}</small></h2>${p.body.map((b) => (b.startsWith('<ul>') ? b : `<p>${b}</p>`)).join('')}
          <div class="rb-nav">${page > 0 ? button(`◀ ${RULEBOOK[page - 1].title}`, `data-rb="${page - 1}"`) : '<span></span>'}${page < RULEBOOK.length - 1 ? button(`${RULEBOOK[page + 1].title} ▶`, `data-rb="${page + 1}"`, { tone: 'brass' }) : ''}</div>
        </article>
      </div>`,
      'rules',
    );
    this.wire(el, {
      menu: () => this.showMenu(),
      rb: (b) => this.showRulebook(Number(b.dataset.rb)),
    });
  }

  /** 처음 출하: 시험대를 먼저 권한다 (D-116) */
  private offerOnboarding(): void {
    const O = TEXT.onboarding;
    const panel = this.hud.openOverlay(`
      <h2>${icon('flag')} ${O.title}</h2>
      ${speaker('scale', O.offer)}
      <div class="row">${button(O.skip, 'data-skip')}${button(O.go, 'data-go', { tone: 'brass', icon: 'lever' })}</div>`);
    this.wire(panel, {
      go: () => this.showOnboarding(0),
      skip: () => {
        saveMeta({ ...loadMeta(), onboarded: true });
        this.startNew();
      },
    });
  }

  /** 온보딩 시험대 (D-116): 출하와 따로 세 판. 지면 그 판 다시, 이기면 다음 판, 끝나면 진짜 출하로 */
  showOnboarding(i: number): void {
    const l = LESSONS[i];
    if (!l) {
      saveMeta({ ...loadMeta(), onboarded: true });
      markCoachSeen(COACH_TAUGHT);
      this.hud.toast(TEXT.onboarding.done);
      return this.startNew();
    }
    this.run = null;
    playMusic('act1');
    this.hud.closeOverlay();
    this.hud.closeScene();
    this.hud.setGoal(`${l.title.replace('시험대 ', '')} · ${l.goal}`, TEXT.onboarding.title);
    this.c.onPlayerTurn = null;
    this.c.onBattleEnd = (s) => {
      this.hud.setGoal(null);
      const won = s.winner === 0;
      this.hud.toast(won ? TEXT.onboarding.pass : TEXT.onboarding.retry);
      window.setTimeout(() => this.showOnboarding(won ? i + 1 : i), 1400);
    };
    this.c.startState(lessonBattle(l), l.tier, TUNED);
    window.setTimeout(() => coachLines(l.lines), 400);
  }

  /** 도감 (D-108): 얻어 본 개조·도면, 만난 돌발, 해체한 반장, 시작 세트, 기록. 못 본 것은 ??? */
  private showCodex(): void {
    const meta = loadMeta();
    const C = TEXT.codex;
    const seen = meta.seen ?? { events: [] };
    const kills = meta.bossKills ?? [];
    type Entry = { known: boolean; name: string; info: string; img?: string; gold?: boolean; hint?: string };
    const section = (title: string, list: Entry[]) =>
      `<p class="sub">${title} <small class="dim">${list.filter((e) => e.known).length}/${list.length}</small></p><div class="codex-grid${title === C.sections.sets ? ' wide' : ''}">${list
        .map((e, i) => `<button class="cx${e.known ? '' : ' unknown'}${e.gold ? ' gold' : ''}" type="button" data-cx="${title}:${i}">${e.known && e.img ? e.img : ''}<span>${e.known ? e.name : (e.hint ?? C.unknown)}</span></button>`)
        .join('')}</div>`;
    const startSets: Entry[] = [
      ...START_DECKS.map((d) => ({ known: true, name: setName(d), info: SET_LORE[typesOf(d).sort().join('')] ?? '', img: typesOf(d).map((t) => pieceImg(t, 0, 'small', 16)).join('') })),
      ...UNLOCK_DECKS.map((u) => ({ known: u.ok(meta), name: u.name, info: u.ok(meta) ? (SET_LORE[typesOf(u.deck).sort().join('')] ?? '') : `* ${u.name}. 잠겨 있다 — ${u.need}`, hint: `잠김 · ${u.need}`, img: typesOf(u.deck).map((t) => pieceImg(t, 0, 'small', 16)).join('') })),
    ];
    const bosses: Entry[] = [...(Object.keys(BOSSES) as (keyof typeof BOSSES)[]).map((id) => ({ id, def: BOSSES[id] })), { id: 'final', def: FINAL_BOSS }].map(({ id, def }) => ({
      known: kills.includes(id),
      name: def.name,
      info: `${def.name} — ${def.title}. “${def.quote}” · 비틀기: ${TWISTS[BOSS_TWIST[id as keyof typeof BOSS_TWIST]].name} — ${TWISTS[BOSS_TWIST[id as keyof typeof BOSS_TWIST]].desc}`,
      img: pieceImg(BOSS_PIECE[id] ?? 'K', 1, 'small', 20),
      gold: id === 'final',
    }));
    const parts: Entry[] = PART_IDS.map((id) => ({
      known: (seen.parts ?? []).includes(id),
      name: PARTS[id].name,
      info: `${GRADE_NAME[PARTS[id].grade]} · ${PARTS[id].name} — ${PARTS[id].desc}`,
      img: gradeChip(PARTS[id].grade),
      gold: PARTS[id].grade === 'epic',
    }));
    const carves: Entry[] = CARVE_IDS.map((id) => ({ known: (seen.carves ?? []).includes(id), name: CARVES[id].name, info: `${CARVES[id].name} — ${CARVES[id].desc}`, img: `<span class="carve-mark small">${CARVES[id].mark}</span>` }));
    const events: Entry[] = EVENT_IDS.map((id) => ({ known: seen.events.includes(id), name: EVENTS[id].title, info: EVENTS[id].text, img: icon(EVENT_ICON[id], 's') }));
    const got = meta.story?.records ?? [];
    const records: Entry[] = RECORDS.map((r, i) => ({ known: got.includes(i), name: r.title, info: `${r.title} — ${r.text}`, hint: `잠김 · ${r.need}`, img: icon('card', 's') }));
    const all: Record<string, Entry[]> = { [C.sections.story]: records, [C.sections.sets]: startSets, [C.sections.bosses]: bosses, [C.sections.parts]: parts, [C.sections.carves]: carves, [C.sections.events]: events };
    const rec = [meta.runs, meta.clears, meta.bestFloor, meta.elites ?? 0, meta.ascension];
    const el = this.hud.openScene(
      `<div class="bar"><span class="plate">${icon('crate', 's')}${C.title}</span><span class="spacer"></span>${button(C.back, 'data-menu')}</div>
      <div class="codex scroll-y">
        <p class="lead">${C.lead}</p>
        <div style="display:flex;justify-content:flex-start;margin-bottom:6px">${meta.story?.prologue ? button(CUT_UI.prologueAgain, 'data-prologue', { icon: 'flag' }) : ''}</div>
        <div class="records">${rec.map((n, i) => `<div class="panel9"><span class="num">${n}</span><small>${C.records[i]}</small></div>`).join('')}</div>
        ${Object.entries(all).map(([t, list]) => section(t, list)).join('')}
      </div>`,
    );
    this.wire(el, {
      menu: () => this.showMenu(),
      prologue: () => playCuts(this.hud, PROLOGUE, () => this.showCodex()),
      cx: (b) => {
        const [t, i] = b.dataset.cx!.split(':');
        const e = all[t][Number(i)];
        this.hud.toast(e.known || t === C.sections.sets ? e.info : `* ${C.unknown}`);
      },
    });
  }

  /** 새 출하: 시작 세트 3지선다 */
  private startNew(fixed?: number, daily?: string): void {
    const meta = loadMeta();
    // 처음이면 시험대 먼저 권한다 (D-116) — 출하 자체는 매번 무작위
    if (fixed === undefined && !daily && !meta.onboarded && meta.runs === 0) return this.offerOnboarding();
    // 프롤로그 (D-135): 처음 출하 한 번 — 도감에서 다시 본다
    if (!meta.story?.prologue) {
      saveMeta({ ...meta, story: { ...meta.story, prologue: true } });
      return playCuts(this.hud, PROLOGUE, () => this.startNew(fixed, daily));
    }
    const seed = fixed ?? freshSeed();
    const decks = startDeckOptions(seed, unlockedDecks(meta));
    const el = this.hud.openScene(
      `<div class="bar"><span class="plate">${icon('flag', 's')}${TEXT.start.title}</span><span class="spacer"></span>${button(TEXT.start.back, 'data-menu')}</div>
      <p class="lead">${TEXT.start.lead}</p>
      <div class="seed-row"><span class="seed">${TEXT.seed.label} <b>${seedCode(seed)}</b></span><input id="seed-input" class="seed-input" maxlength="11" autocomplete="off" spellcheck="false" placeholder="${TEXT.seed.placeholder}" aria-label="${TEXT.seed.placeholder}">${button(TEXT.seed.apply, 'data-seed')}</div>
      <div class="stage"><div class="offers">${decks
        .map((d, i) => {
          const kinds = SET_LORE[typesOf(d).sort().join('')] ?? '';
          return `<button class="offer" type="button" data-deck="${i}"><span class="kind">시작 세트</span><b>${setName(d)}</b><span class="pieces">${typesOf(d).map((t) => pieceImg(t, 0, 'large', 56)).join('')}</span><p>${kinds}</p></button>`;
        })
        .join('')}</div></div>`,
    );
    coach('start');
    this.wire(el, {
      deck: (b) => {
        this.run = newRun(seed, { ascension: daily ? DAILY.ascension : Math.min(this.ascension, meta.ascension), extraDecks: unlockedDecks(meta), deck: decks[Number(b.dataset.deck)] });
        this.run.startedAt = Date.now();
        if (daily) this.run.daily = daily;
        this.gainRecords([0]);
        sfx('submit');
        this.save();
        this.show();
      },
      menu: () => this.showMenu(),
      seed: () => {
        const n = parseSeed((el.querySelector('#seed-input') as HTMLInputElement).value);
        if (n === null) return this.hud.toast(TEXT.seed.bad);
        this.startNew(n);
      },
    });
  }

  // ---------- 단계별 화면 ----------
  /** 화면을 그리고, 지난 화면 이후 바뀐 출하 상태로 쾌감·아픔 연출 (D-104) */
  show(): void {
    this.render();
    const run = this.run;
    if (!run) {
      this.snap = null;
      return;
    }
    const now = snapOf(run);
    const before = this.snap;
    this.snap = now;
    if (!before) return;
    const d: RunDelta = { gold: now.gold - before.gold, deck: now.deck - before.deck, awakened: Math.max(0, now.carves - before.carves), damaged: 0, sealed: 0, legend: Math.max(0, now.epic - before.epic) };
    runFeedback(document, d, before.gold);
    // 희귀가 걸린 고르기 화면: 반짝
    // 등급별 등장 소리 (D-113): 에픽은 내리꽂히는 순간 · 유니크는 뒤집힐 때
    if ((run.stage.at === 'reward' || run.stage.at === 'shop') && document.querySelector('.scene.enter .offer.g-epic')) {
      window.setTimeout(() => {
        sfx('jackpot');
        vignette('epic', 0.5);
      }, 700);
    } else if (run.stage.at === 'reward' && run.stage.choices.length && document.querySelector('.offer.g-unique')) sfx('rare');
  }

  /** 지난 화면의 출하 상태 (연출 비교용) */
  private snap: RunSnap | null = null;

  private render(): void {
    const run = this.run;
    if (!run) return this.showMenu();
    // 같은 화면 다시 그리기(고물상에서 사기 등)는 전환 연출 없이 (D-109)
    const st = run.stage;
    // 배경 음악 (D-123): 공정마다 · 반장 대국 · 도금왕
    const floor = Math.min(run.floor, TOTAL_FLOORS);
    const bossFight = st.at === 'battle' && st.encounter.kind === 'boss';
    playMusic(st.at === 'over' ? 'menu' : bossFight ? (floor === TOTAL_FLOORS ? 'final' : 'boss') : (['act1', 'act2', 'act3'] as const)[actOf(floor) - 1]);
    this.hud.sceneKey = `${st.at}:${run.floor}:${st.at === 'reward' ? st.choices.length : st.at === 'event' ? ('result' in st ? 1 : 0) : ''}`;
    switch (run.stage.at) {
      case 'map': {
        // 공정 진입 컷 (D-135): 출하마다 공정 첫 층에서 한 번
        const act = actOf(floor);
        const seenActs = (run.story ??= {}).acts ??= [];
        if (inAct(floor) === 1 && !seenActs.includes(act)) {
          seenActs.push(act);
          this.save();
          // D-137: 공정 진입 컷은 처음 한 번만 (출하마다 끼어들면 정신없다)
          if (!this.storyFirst('acts', act)) return this.showMap(run);
          return playCuts(this.hud, [ACT_ENTRY[act - 1]], () => {
            this.hud.sceneKey = `map:${run.floor}:`;
            this.showMap(run);
          });
        }
        return this.showMap(run);
      }
      case 'battle':
        return this.startBattle(run);
      case 'reward':
        return this.showReward(run);
      case 'shop':
        return this.showShop(run);
      case 'forge':
        return this.showForge(run);
      case 'event':
        return this.showEvent(run);
      case 'over':
        return this.showOver(run);
    }
  }

  /** 공정 지도: 1층 → 공정 끝 반장이 가로로 흐른다. 지금 층의 노드만 누를 수 있다 */
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
    const twist = TWISTS[BOSS_TWIST[bossIdOf(run, bossF)]];
    const bossPiece: PieceType = bossId ? BOSS_PIECE[bossId] : 'K';
    const el = this.hud.openScene(
      `${this.bar(run)}
      <div class="title-line"><h2>${ACT_NAMES[act - 1]}</h2><p>${inAct(run.floor)}층 · ${TEXT.map.choose}</p></div>
      <div class="stage">
        <div class="map-wrap grow scroll-x" data-scroll><div class="map"><svg class="links"></svg>${cols.join('')}</div></div>
        <div class="boss-card panel9" data-bossinfo role="button" tabindex="0">
          <span class="kind" style="font-size:12px;color:var(--crimson-soft)">${icon('crown', 's')} ${TEXT.map.bossAhead} · ${inAct(bossF)}층</span>
          <div class="portrait">${pieceImg(bossPiece, 1, 'large', 80)}</div>
          <b>${boss.name}</b>
          <small class="lead dim">${boss.role}</small>
          <p class="quote">“${boss.quote}”</p>
          <small class="lead weak">${icon('reticle', 's')} ${twist.name} — ${twist.desc}</small>
          <small class="lead dim">${boss.title}</small>
        </div>
      </div>
      <div class="map-legend">${(['battle', 'elite', 'shop', 'forge', 'event'] as NodeKind[]).map((k) => `<span>${icon(NODE_ICON[k], 's')}${NODE_NAMES[k]}</span>`).join('')}</div>`,
    );
    coach('map');
    this.wireBar(el, run);
    this.wire(el, {
      node: (b) => this.act(enterNode(run, Number(b.dataset.node))),
      // 반장 비틀기: 누르면 무엇을 준비하면 좋은지
      bossinfo: () => this.hud.toast(`${TEXT.map.prep} — ${twist.prep}`),
    });
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
    // 반장 소개 컷 (D-135): 그 층에서 처음 들어갈 때 한 번
    const intro = ((run.story ??= {}).intro ??= []);
    if (e.kind === 'boss' && !run.stage.battle && !intro.includes(run.floor) && this.storyFirst('bosses', run.floor === TOTAL_FLOORS ? 'final' : run.bosses[actOf(run.floor) - 1])) {
      intro.push(run.floor);
      this.save();
      return playCuts(this.hud, [this.bossIntroCut(run)], () => this.startBattle(run));
    }
    const state: BattleState = run.stage.battle ?? encounterBattle(run.deck, { parts: run.parts }, e);
    this.hud.closeOverlay();
    this.hud.closeScene();
    this.c.onPlayerTurn = (s) => {
      recordBattle(run, s);
      this.save();
    };
    const startedAt = Date.now();
    this.c.onBattleEnd = (s) => {
      logBattle(run, state, s, Date.now() - startedAt, e.kind, e.boss); // 출하 기록 (D-117)
      if (s.winner === 0 && e.kind === 'boss') unlockAchievement(`ACT${actOf(run.floor)}_CLEAR`);
      const floor = run.floor;
      const army = run.deck.length;
      finishBattle(run, s);
      this.save();
      window.setTimeout(() => this.afterBattle(run, e, s.winner === 0, floor, army), 600);
    };
    this.hud.setGoal(null);
    this.c.startState(state, e.tier, TUNED);
    // 대국 시작 (D-137): 한 줄씩 — 반장은 비틀기, 검문!은 이름 + 정예, 일반은 이름 + 비웃음
    const taunt = TAUNTS[(run.seed + run.floor) % TAUNTS.length];
    const lines: string[] = [];
    if (e.kind === 'boss' && e.twist) lines.push(`${TWISTS[e.twist].name} — ${TWISTS[e.twist].desc}`);
    else if (e.kind === 'elite') lines.push(`검문! ${e.name} — 왕관 표식은 정예 (HP 두 배)`);
    else lines.push(run.floor <= 2 ? '“움직인 놈만 쏜다. 붉은 과녁 칸으로 보내.”' : `${e.name} — ${taunt}`);
    lines.forEach((m) => this.hud.say(m));
    if (e.kind === 'elite') coach('elite');
    if (e.kind === 'boss') coach('boss');
  }

  private showReward(run: RunState): void {
    if (run.stage.at !== 'reward') return;
    const st = run.stage;
    const ch = st.choices[0];
    const R = TEXT.reward;
    let offers = '';
    let kind = '';
    let lead = '';
    if (ch?.type === 'mixed') {
      kind = '보상';
      offers = ch.options
        .map((o) => {
          const [k, v] = o.split(':');
          return k === 'piece' ? `<button class="offer" type="button" data-pick="${o}">${pieceOffer(run, v as PieceType)}</button>` : `<button class="offer g-rare" type="button" data-pick="${o}">${carveOffer(v as CarveId)}</button>`;
        })
        .join('');
    } else if (ch?.type === 'piece' || ch?.type === 'recruit') {
      kind = ch.type === 'recruit' ? R.recruit : R.piece;
      if (ch.type === 'recruit') lead = R.recruitLead;
      offers = ch.options.map((t) => `<button class="offer" type="button" data-pick="${t}">${pieceOffer(run, t, ch.type === 'recruit')}</button>`).join('');
    } else if (ch?.type === 'carve') {
      kind = '각인';
      offers = ch.options.map((id) => `<button class="offer g-rare" type="button" data-pick="${id}">${carveOffer(id)}</button>`).join('');
    } else if (ch?.type === 'part') {
      kind = '부품';
      offers = ch.options.map((id) => `<button class="offer g-${PARTS[id].grade}" type="button" data-pick="${id}">${partOffer(id)}</button>`).join('');
    } else if (ch?.type === 'pair') {
      kind = '양날 한 쌍';
      lead = TEXT.pair.lead;
      offers = ch.options.map((p, i) => `<button class="offer g-${PARTS[p.part].grade} pair" type="button" data-pick="${i}">${pairOffer(p)}</button>`).join('');
    }
    const lines = st.lines.map((l) => `<i class="tag">${l}</i>`).join('');
    const el = this.hud.openScene(
      `${this.bar(run)}
      <div class="title-line"><h2>${st.title}</h2>${lines}${ch && (ch.type === 'mixed' || ch.type === 'piece') ? speaker('scale', `“통과. ${kind} 하나.”`, 'calm') : lead ? `<p>${lead}</p>` : ''}</div>
      <div class="stage">${ch ? `<div class="offers">${offers}</div>` : '<div class="grow"></div>'}</div>
      <div class="row" style="display:flex;justify-content:flex-end;gap:8px;padding-bottom:8px">
        ${ch ? button(`${R.skip} (나사 +${SKIP_GOLD})`, 'data-skip') : button(R.next, 'data-next', { tone: 'brass', icon: 'lever' })}
      </div>`,
    );
    coach(ch?.type === 'pair' ? 'contract' : ch?.type === 'part' ? 'epic' : 'reward');
    this.wireBar(el, run);
    const take = (id: string, extra?: number) => {
      const err = takeChoice(run, id, extra);
      if (err === 'unit') {
        const carve = (id.includes(':') ? id.split(':')[1] : id) as CarveId;
        return this.pickUnit(run, `${CARVES[carve].mark} ${CARVES[carve].name}`, `${CARVES[carve].desc} * 새길 기물을 고른다. 있던 각인은 사라진다.`, (u) => u.t !== 'K', (i) => take(id, i));
      }
      if (err === 'full') return this.discardPart(run, (d) => take(id, d));
      this.act(err);
      if (err) return;
      // 합류 · 영입 한 줄 (D-135)
      const piece = ch?.type === 'mixed' && id.startsWith('piece:') ? id.split(':')[1] : ch?.type === 'piece' ? id : null;
      if (piece) {
        this.hud.say(JOIN[piece as Exclude<PieceType, 'K'>]);
        if (piece === 'Q') this.gainRecords([2]);
      } else if (ch?.type === 'recruit') this.hud.say(RECRUIT);
    };
    this.wire(el, {
      pick: (b) => {
        const id = b.dataset.pick!;
        if (ch) logOffer(run, ch.type, ch.type === 'pair' ? ch.options.map((p) => p.part) : (ch.options as string[]), id);
        sfx('land');
        take(id);
      },
      skip: () => {
        if (ch) logOffer(run, ch.type, ch.type === 'pair' ? ch.options.map((p) => p.part) : (ch.options as string[]), null);
        skipChoice(run);
        this.act();
      },
      next: () => this.act(finishReward(run)),
    });
  }

  private showShop(run: RunState): void {
    if (run.stage.at !== 'shop') return;
    const stock = run.stage.stock;
    const S = TEXT.shop;
    const poor = (price: number) => (run.gold < price ? ' poor' : '');
    const priceTag = (price: number, sold: boolean) => (sold ? `<span class="price sold">${S.sold}</span>` : `<span class="price">${icon('screw', 's')}${price}</span>`);
    const pieces = stock.pieces.map((it, i) => `<button class="offer${it.sold ? ' sold' : poor(it.price)}" type="button" data-piece="${i}" ${it.sold ? 'disabled' : ''}>${pieceOffer(run, it.item)}${priceTag(it.price, it.sold)}</button>`).join('');
    const carves = stock.carves.map((it, i) => `<button class="offer g-rare${it.sold ? ' sold' : poor(it.price)}" type="button" data-carve="${i}" ${it.sold ? 'disabled' : ''}>${carveOffer(it.item)}${priceTag(it.price, it.sold)}</button>`).join('');
    const parts = stock.parts.map((it, i) => `<button class="offer g-${PARTS[it.item].grade}${it.sold ? ' sold' : poor(it.price)}" type="button" data-part="${i}" ${it.sold ? 'disabled' : ''}>${partOffer(it.item)}${priceTag(it.price, it.sold)}</button>`).join('');
    const el = this.hud.openScene(
      `${this.bar(run)}
      <div class="title-line"><h2>${icon('screw')} ${S.title}</h2>${speaker('rustRook', `${S.say} <span class="tell">${S.lead}</span>`)}</div>
      <div class="stage scroll-x"><div class="offers shop">${parts}${carves}${pieces}</div></div>
      <div class="row" style="display:flex;justify-content:flex-end;gap:8px;padding-bottom:8px">
        ${button(S.sell, 'data-sell', { icon: 'scale' })}
        ${button(`${S.reroll} ${stock.rerollPrice}`, 'data-reroll', { icon: 'swap' })}
        ${button(S.leave, 'data-leave', { tone: 'brass', icon: 'lever' })}
      </div>`,
    );
    coach('shop');
    this.wireBar(el, run);
    const buyC = (i: number, unit?: number) => {
      const err = buyCarve(run, i, unit);
      if (err === 'unit') {
        const id = stock.carves[i].item;
        return this.pickUnit(run, `${CARVES[id].mark} ${CARVES[id].name}`, `${CARVES[id].desc} * 새길 기물을 고른다.`, (u) => u.t !== 'K', (k) => buyC(i, k));
      }
      if (!err) sfx('spend');
      this.act(err);
    };
    const buyP = (i: number, d?: number) => {
      const err = buyPart(run, i, d);
      if (err === 'full') return this.discardPart(run, (k) => buyP(i, k));
      if (!err) sfx('spend');
      this.act(err);
    };
    this.wire(el, {
      piece: (b) => {
        const err = buyPiece(run, Number(b.dataset.piece));
        if (!err) sfx('spend');
        this.act(err);
      },
      carve: (b) => buyC(Number(b.dataset.carve)),
      part: (b) => buyP(Number(b.dataset.part)),
      sell: () => this.pickUnit(run, `${icon('scale')} ${S.sell}`, '* 녹슨 룩이 기물을 저울에 올린다. 판 기물은 돌아오지 않는다.', (u) => u.t !== 'K', (i) => this.act(sellPiece(run, i)), (u) => ` · ${icon('screw', 's')}${sellPrice(u.t)}`),
      reroll: () => this.act(reroll(run)),
      leave: () => {
        leaveNode(run);
        this.act();
      },
    });
  }

  /** 공방: 각인 새기기(셋 중 하나) 또는 기물 다듬기(한 단계 위) — 둘 중 하나 */
  private showForge(run: RunState): void {
    if (run.stage.at !== 'forge') return;
    const st = run.stage;
    const F = TEXT.forge;
    const carves = st.carves.map((id, i) => `<button class="offer g-rare" type="button" data-carvepick="${i}" ${st.done ? 'disabled' : ''}>${carveOffer(id)}</button>`).join('');
    const upgradable = run.deck.some((u) => (UPGRADE[u.t] ?? []).length);
    const el = this.hud.openScene(
      `${this.bar(run)}
      <div class="title-line"><h2>${icon('anvil')} ${F.title}</h2>${speaker('monoBishop', st.done ? F.done : F.lead)}<small class="dim">${F.rule}</small></div>
      <div class="stage"><div class="offers">${carves}
        <button class="offer" type="button" data-upgrade ${st.done || !upgradable ? 'disabled' : ''}><span class="kind">${icon('anvil', 's')} ${F.upgrade}</span>${pieceImg('P', 0, 'large', 44)}<span class="arrow">→</span>${pieceImg('N', 0, 'large', 44)}<b>${F.upgrade}</b><p>${F.upgradeDesc}</p></button>
      </div></div>
      <div class="row" style="display:flex;justify-content:flex-end;gap:8px;padding-bottom:8px">${button(F.leave, 'data-leave', { tone: 'brass', icon: 'lever' })}</div>`,
    );
    coach('forge');
    this.wireBar(el, run);
    this.wire(el, {
      carvepick: (b) => {
        const i = Number(b.dataset.carvepick);
        const id = st.carves[i];
        this.pickUnit(run, `${CARVES[id].mark} ${CARVES[id].name}`, `${CARVES[id].desc} * 새길 기물을 고른다. 있던 각인은 사라진다.`, (u) => u.t !== 'K', (k) => {
          sfx('awaken');
          this.act(forgeCarve(run, i, k));
        });
      },
      upgrade: () =>
        this.pickUnit(run, F.upgrade, F.upgradeDesc, (u) => (UPGRADE[u.t] ?? []).length > 0, (k) => {
          const ups = UPGRADE[run.deck[k].t] ?? [];
          if (ups.length === 1) return this.act(forgeUpgrade(run, k, ups[0]));
          const panel = this.hud.openOverlay(`<h2>${F.upgrade}</h2><div class="chips">${ups.map((t) => `<button class="chip" type="button" data-to="${t}">${pieceImg(t, 0, 'small', 32)}<b>${PIECE_NAMES_KO[t]}</b></button>`).join('')}</div>${button('취소', 'data-cancel', { cls: 'wide' })}`);
          this.wire(panel, {
            to: (b) => {
              this.hud.closeOverlay();
              sfx('awaken');
              this.act(forgeUpgrade(run, k, b.dataset.to as PieceType));
            },
            cancel: () => this.hud.closeOverlay(),
          });
        }),
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
        <div class="art panel9">${EVENT_NPC[st.id] ? portraitBig(EVENT_NPC[st.id]!) : icon(EVENT_ICON[st.id], 'xl', 'var(--paper)')}<span class="caption">${EVENT_NPC[st.id] ? NPCS[EVENT_NPC[st.id]!].name : NODE_NAMES.event}</span></div>
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
    coach('event');
    this.wireBar(el, run);
    this.wire(el, {
      ev: (b) => this.act(eventChoose(run, Number(b.dataset.ev))),
      leave: () => {
        leaveNode(run);
        this.act();
      },
    });
  }

  /** 이야기 컷을 처음 보는가 (D-137): 처음이면 표시하고 true — 두 번째부터는 컷 없이 지나간다 */
  private storyFirst(key: 'acts' | 'bosses' | 'falls', id: number | string): boolean {
    const m = loadMeta();
    const list = (m.story?.[key] ?? []) as (number | string)[];
    if (list.includes(id)) return false;
    saveMeta({ ...m, story: { ...m.story, [key]: [...list, id] } });
    return true;
  }

  /** 검수 기록지 얻기 (D-135): 처음 얻으면 한 줄 알림 */
  private gainRecords(ids: number[]): void {
    const m = loadMeta();
    const have = m.story?.records ?? [];
    const fresh = ids.filter((i) => !have.includes(i));
    if (!fresh.length) return;
    saveMeta({ ...m, story: { ...m.story, records: [...have, ...fresh].sort((a, b) => a - b) } });
    fresh.forEach((i) => this.hud.say(`* 검수 기록지 — ${RECORDS[i].title}`));
  }

  /** 반장 · 도금왕 소개 컷 */
  private bossIntroCut(run: RunState): Cut {
    const boss = bossOf(run, run.floor);
    if (run.floor === TOTAL_FLOORS)
      return { bg: 'top', actors: [{ npc: 'gilded', x: 34, y: 50, size: 130, mood: 'narrow' }, { npc: 'ninth', x: 72, y: 60, size: 100, mood: 'look' }], lines: GILDED.intro, fx: 'gold' };
    const id = run.bosses[actOf(run.floor) - 1];
    const b = BOSS_STORY[id];
    return { bg: 'line', actors: [{ npc: b.npc, x: 34, y: 50, size: 130 }, { npc: 'ninth', x: 72, y: 62, size: 96, mood: 'look' }], lines: [{ kind: 'tell', text: b.belief }, { kind: 'say', who: boss.name, text: `「${boss.quote}」` }] };
  }

  /** 대국 뒤 (D-135): 반장 해체 컷 · 도금왕 최종장 · 패배 컷 → 다음 화면 */
  private afterBattle(run: RunState, e: { kind: string; boss?: string }, won: boolean, floor: number, army: number): void {
    if (!won) {
      if (run.stage.at !== 'over') return this.show();
      this.gainRecords([1]);
      return playCuts(this.hud, [DEFEAT], () => this.show());
    }
    if (e.kind !== 'boss') return this.show();
    if (floor === TOTAL_FLOORS) return this.finale(run, army);
    const id = run.bosses[actOf(floor) - 1];
    const b = BOSS_STORY[id];
    this.gainRecords([3 + (Object.keys(BOSS_STORY) as (keyof typeof BOSS_STORY)[]).indexOf(id)]);
    if (!this.storyFirst('falls', id)) return this.show();
    playCuts(this.hud, [{ bg: 'line', actors: [{ npc: b.npc, x: 34, y: 54, size: 120, mood: 'sleepy', dim: true }, { npc: 'ninth', x: 70, y: 58, size: 110, mood: 'calm' }], lines: [{ kind: 'tell', text: b.fall }, { kind: 'mono', text: b.reply }] }], () => this.show());
  }

  /** 최종장 (D-131): 도금왕 쓰러짐 → 울부짖음 → 승급 화면 → 엔딩 */
  private finale(run: RunState, army: number): void {
    const pressure = run.ascension ?? 0;
    const g = promotionFor(pressure);
    const gilded = (mood: 'narrow' | 'glare' | 'sleepy' | 'wide' | 'look' | 'calm', dim = false) => ({ npc: 'gilded' as const, x: 34, y: 52, size: 130, mood, dim });
    const fall: Cut[] = [
      { bg: 'top', actors: [gilded('sleepy'), { npc: 'ninth', x: 72, y: 60, size: 100, mood: 'calm' }], lines: GILDED.fall, fx: 'gold' },
      ...(army >= 14 ? [{ bg: 'box' as const, actors: [], lines: [{ kind: 'tell' as const, text: '* 아무도 등을 돌리지 않았다.' }] }] : []),
      { bg: 'top', actors: [gilded(g.mood), { npc: 'ninth', x: 72, y: 60, size: 100, mood: 'wide' }], lines: GILDED.howl, fx: 'shake' },
    ];
    this.gainRecords([9]);
    playCuts(this.hud, fall, () =>
      promotionScene(this.hud, pressure, (lay) => {
        (run.story ??= {}).ending = lay ? 'free' : 'promote';
        this.save();
        const m = loadMeta();
        saveMeta({ ...m, story: { ...m.story, promoted: (m.story?.promoted ?? 0) + (lay ? 0 : 1), freed: m.story?.freed || lay } });
        this.gainRecords(lay ? [11] : [10]);
        const after: Cut[] = lay
          ? TRUE_ENDING
          : [
              { bg: 'top', actors: [{ npc: 'ninth', x: 50, y: 58, size: 120, mood: 'sleepy' }], lines: pressure >= MAX_ASCENSION ? [ENDING_A_MONO] : [{ kind: 'tell', text: g.after }], fx: 'gold' },
              AFTER_PROMOTION,
            ];
        playCuts(this.hud, after, () => this.show());
      }),
    );
  }

  private showOver(run: RunState): void {
    const won = run.stage.at === 'over' && run.stage.won;
    const floor = Math.min(run.floor, TOTAL_FLOORS);
    const before = loadMeta();
    const meta = recordRunEnd(before, floor, won, run.ascension ?? 0, run);
    logRun(run, won, Date.now() - (run.startedAt ?? Date.now()));
    if (won) unlockAchievement(`ASCENSION_${run.ascension ?? 0}_CLEAR`);
    saveMeta(meta);
    clearRun();
    const newly = UNLOCK_DECKS.filter((u) => u.ok(meta) && !u.ok(before)).map((u) => `시작 세트 해금: ${u.name}`);
    if (meta.ascension > before.ascension) newly.push(`압력 ${meta.ascension} 해금: ${ASCENSIONS[meta.ascension]}`);
    const O = TEXT.over;
    const ench = run.parts.length;
    const ending = run.story?.ending;
    const winTitle = ending === 'free' ? OVER_STORY.freeTitle : O.win;
    const winTell = ending === 'free' ? OVER_STORY.freeTell : ending === 'promote' ? OVER_STORY.promoteTell : O.winTell;
    const el = this.hud.openScene(
      `<div class="stamp-big ${won ? 'good' : 'bad'}">${won ? winTitle : O.lose}</div>
      ${speaker('scale', `“${won ? (ending === 'free' ? OVER_STORY.freeSay : O.winSay) : O.loseSay}”`, ending === 'free' ? 'sleepy' : won ? 'calm' : 'glare')}
      <p class="tell">${won ? winTell : `${ACT_NAMES[actOf(floor) - 1]} ${inAct(floor)}층. ${O.loseTell}`}</p>
      <div class="records" style="width:min(520px,90vw)">
        <div class="panel9"><span class="num">${floor}</span><small>도달 층</small></div>
        <div class="panel9"><span class="num">${run.deck.length}</span><small>군단</small></div>
        <div class="panel9"><span class="num">${ench}</span><small>부품</small></div>
        <div class="panel9"><span class="num">${run.wins}</span><small>이긴 대국</small></div>
      </div>
      ${newly.length ? `<div class="unlocks">${newly.map((n) => `<i class="tag gold">${n}</i>`).join('')}</div>` : ''}
      <div style="display:flex;gap:8px;align-items:center"><span class="seed">${TEXT.seed.label} <b>${seedCode(run.seed)}</b></span>${button(O.menu, 'data-menu')}${button(TEXT.seed.again, 'data-same')}${button(O.again, 'data-new', { tone: 'brass', icon: 'flag' })}</div>`,
      'ending',
    );
    const same = run.seed;
    this.run = null;
    this.wire(el, {
      menu: () => this.showMenu(),
      new: () => this.startNew(),
      same: () => this.startNew(same),
    });
  }
}
