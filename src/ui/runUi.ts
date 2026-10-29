import { TUNED } from '../data/aiWeights';
import { CARDS, CARD_SLOTS, type CardId } from '../data/cards';
import { ENCHANTS, ENCHANT_MAX_STACK, type EnchantId } from '../data/enchants';
import { FORGE_MAX } from '../data/forge';
import { PIECE_NAMES_KO } from '../data/pieces';
import { ACT_NAMES, ALTAR, FLOORS_PER_ACT, NODE_NAMES, SKIP_GOLD, TOTAL_FLOORS, actOf, inAct } from '../data/run';
import { ASCENSIONS, UNLOCK_DECKS, loadMeta, recordRunEnd, saveMeta, unlockedDecks } from '../run/meta';
import type { BattleController } from '../game/controller';
import type { BattleState, PieceType } from '../engine';
import { EVENTS } from '../run/events';
import { encounterBattle } from '../run/legion';
import {
  altarCanPick,
  altarGamble,
  altarPick,
  bossName,
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

const GLYPH: Record<PieceType, string> = { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙' };
const VS15 = '︎';
const ORDER: PieceType[] = ['K', 'Q', 'R', 'B', 'N', 'P'];

const enchantLine = (id: EnchantId, next: number) =>
  `<b>${ENCHANTS[id].name}</b><small>${ENCHANTS[id].target} · ${next}장째${next >= 3 ? ' ★' : ''}: ${ENCHANTS[id].levels[next - 1]}</small>`;
const cardLine = (id: CardId) => {
  const c = CARDS[id];
  const lim = c.limit.type === 'consume' ? '1회용' : c.limit.type === 'round' ? '라운드 1회' : `쿨타임 ${c.limit.turns}`;
  return `<b>${c.name}</b><small>${c.desc} · ${lim}${c.ap ? ` · AP ${c.ap}` : ''}</small>`;
};

/**
 * 등반(런) 화면들 — M5 그레이박스 목업 (디자인 없음, 사용자 결정).
 * 맵 · 보상 · 상점 · 대장간 · 크랙 제단 · 이벤트 · 결과. 전투는 기존 전투 화면을 쓴다.
 */
export class RunUi {
  private run: RunState | null = null;

  constructor(
    private hud: Hud,
    private c: BattleController,
  ) {}

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

  private status(run: RunState): string {
    const counts = ORDER.map((t) => [t, run.deck.filter((x) => x === t).length] as const).filter(([, n]) => n);
    const deck = counts.map(([t, n]) => `<span class="g">${GLYPH[t]}${VS15}</span>${n}`).join(' ');
    const forge = (Object.entries(run.loadout.forge) as [PieceType, number][]).filter(([, n]) => n).map(([t, n]) => `${PIECE_NAMES_KO[t]}+${n}`);
    const ench = (Object.entries(run.loadout.enchants) as [EnchantId, number][]).map(([id, n]) => `${ENCHANTS[id].name} ${n}${n >= 3 ? '★' : ''}`);
    const cards = run.loadout.cards.map((id) => CARDS[id].name);
    return `<div class="run-status">
      <div><b>Act ${actOf(Math.min(run.floor, TOTAL_FLOORS))} ${ACT_NAMES[actOf(Math.min(run.floor, TOTAL_FLOORS)) - 1]} · ${inAct(Math.min(run.floor, TOTAL_FLOORS))}층 / ${FLOORS_PER_ACT}</b> (전체 ${Math.min(run.floor, TOTAL_FLOORS)}/${TOTAL_FLOORS})${run.ascension ? ` · 승천 ${run.ascension}` : ''} · 골드 <b class="gold">${run.gold}</b> · 크랙 게이지 ${run.crackGauge}/${ALTAR.gaugeMax}</div>
      <div>덱 ${run.deck.length}기: ${deck}</div>
      ${forge.length ? `<div>대장간: ${forge.join(' · ')}</div>` : ''}
      <div>인챈트: ${ench.length ? ench.join(' · ') : '없음'}</div>
      <div>카드: ${cards.length ? cards.join(' · ') : '없음'}</div>
    </div>`;
  }

  // ---------- 메뉴 ----------
  private ascension = 0;

  private startNew(): void {
    const meta = loadMeta();
    this.run = newRun((Date.now() % 1_000_000_000) + 1, { ascension: Math.min(this.ascension, meta.ascension), extraDecks: unlockedDecks(meta) });
    this.save();
    this.show();
  }

  showMenu(): void {
    const saved = loadRun();
    const meta = loadMeta();
    this.ascension = Math.min(this.ascension, meta.ascension);
    const live = saved && saved.stage.at !== 'over';
    const asc = meta.ascension
      ? `<p class="sub">승천 단계</p><div class="chips">${ASCENSIONS.slice(0, meta.ascension + 1)
          .map((d, i) => `<button class="chip${i === this.ascension ? ' on' : ''}" type="button" data-asc="${i}"><b>승천 ${i}</b><small>${d}</small></button>`)
          .join('')}</div>`
      : '';
    const unlocks = UNLOCK_DECKS.map((u) => `${u.ok(meta) ? '✓' : '·'} ${u.name} (${u.need})`).join(' &nbsp; ');
    const panel = this.hud.openOverlay(`
      <h1>PAWNISHER : CHECKMATE</h1>
      <p>3 Act × 12층 = 36층 등반. 기록: ${meta.runs}회 · 최고 ${meta.bestFloor}층 · 완료 ${meta.clears}회</p>
      ${live ? `<button class="choice primary" type="button" data-continue>이어하기<small>${Math.min(saved!.floor, TOTAL_FLOORS)}층 · 골드 ${saved!.gold} · 덱 ${saved!.deck.length}기</small></button>` : ''}
      <button class="choice${live ? '' : ' primary'}" type="button" data-new>새 등반 시작${live ? '<small>진행 중인 등반은 지워집니다</small>' : ''}</button>
      ${asc}
      <p>시작 덱 해금: ${unlocks}</p>
      <button class="choice" type="button" data-test>단판 전투 (시험용)<small>시나리오·장비를 골라 한 판</small></button>`);
    this.wire(panel, {
      continue: () => {
        this.run = loadRun();
        this.show();
      },
      new: () => this.startNew(),
      asc: (el) => {
        this.ascension = Number(el.dataset.asc);
        this.showMenu();
      },
      test: () => this.hud.showStart(),
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

  private showMap(run: RunState): void {
    const act = actOf(run.floor);
    const rows = run.map
      .map((nodes, i) => ({ nodes, i }))
      .filter(({ i }) => actOf(i + 1) === act)
      .map(({ nodes, i }) => {
        const f = i + 1;
        const cur = f === run.floor;
        const chips = nodes
          .map((n, k) => {
            const label = n.kind === 'boss' ? `보스 · ${bossName(run, f)}` : n.kind === 'event' && n.event ? `이벤트 · ${EVENTS[n.event].title}` : NODE_NAMES[n.kind];
            const chosen = run.path[i] === k;
            return cur
              ? `<button class="chip node ${n.kind}" type="button" data-node="${k}"><b>${label}</b></button>`
              : `<span class="chip node ${n.kind}${chosen ? ' on' : ''}${f < run.floor && !chosen ? ' past' : ''}"><b>${label}</b></span>`;
          })
          .join('');
        return `<div class="floor${cur ? ' current' : ''}${f < run.floor ? ' done' : ''}"><span class="fl">${inAct(f)}</span><div class="nodes">${chips}</div></div>`;
      })
      .reverse()
      .join('');
    const panel = this.hud.openOverlay(`
      <h2>Act ${act} — ${ACT_NAMES[act - 1]}</h2>
      ${this.status(run)}
      <p class="sub">${inAct(run.floor)}층: 갈 곳을 고르세요</p>
      <div class="map">${rows}</div>
      <div class="row"><button class="choice" type="button" data-menu>메뉴</button><button class="choice" type="button" data-abandon>등반 포기</button></div>`);
    const cur = panel.querySelector('.floor.current');
    cur?.scrollIntoView({ block: 'center' });
    this.wire(panel, {
      node: (el) => this.act(enterNode(run, Number(el.dataset.node))),
      menu: () => this.showMenu(),
      abandon: () => {
        saveMeta(recordRunEnd(loadMeta(), run.floor, false, run.ascension ?? 0));
        clearRun();
        this.run = null;
        this.showMenu();
      },
    });
  }

  private startBattle(run: RunState): void {
    if (run.stage.at !== 'battle') return;
    const e = run.stage.encounter;
    const state: BattleState = run.stage.battle ?? encounterBattle(run.deck, run.loadout, e);
    this.hud.closeOverlay();
    this.c.onPlayerTurn = (s) => {
      recordBattle(run, s);
      this.save();
    };
    this.c.onBattleEnd = (s) => {
      finishBattle(run, s);
      this.save();
      window.setTimeout(() => this.show(), 600);
    };
    this.c.startState(state, e.tier, TUNED);
    this.hud.toast(`${run.floor}층 · ${e.name}`);
  }

  private showReward(run: RunState): void {
    if (run.stage.at !== 'reward') return;
    const st = run.stage;
    const ch = st.choices[0];
    let body = '';
    if (ch?.type === 'enchant') {
      body = `<p class="sub">인챈트 3지선다</p><div class="chips">${ch.options
        .map((id) => `<button class="chip" type="button" data-pick="${id}">${enchantLine(id, (run.loadout.enchants[id] ?? 0) + 1)}</button>`)
        .join('')}</div>`;
    } else if (ch?.type === 'card') {
      body = `<p class="sub">액티브 카드 3지선다</p><div class="chips">${ch.options.map((id) => `<button class="chip" type="button" data-pick="${id}">${cardLine(id)}</button>`).join('')}</div>`;
    }
    const panel = this.hud.openOverlay(`
      <h2>${st.title}</h2>
      ${st.lines.length ? `<p>${st.lines.join('<br>')}</p>` : ''}
      ${body}
      ${ch ? `<button class="choice" type="button" data-skip>건너뛰기 (골드 +${SKIP_GOLD})</button>` : '<button class="choice primary" type="button" data-next>계속</button>'}
      ${this.status(run)}`);
    this.wire(panel, {
      pick: (el) => {
        const id = el.dataset.pick!;
        this.act(takeChoice(run, id), () => this.discardPicker(run, ch!.type, (d) => this.act(takeChoice(run, id, d))));
      },
      skip: () => {
        skipChoice(run);
        this.act();
      },
      next: () => this.act(finishReward(run)),
    });
  }

  /** 슬롯이 가득 찼을 때 버릴 것을 고른다 */
  private discardPicker(run: RunState, type: 'enchant' | 'card', done: (discard: EnchantId | number) => void): void {
    const items =
      type === 'enchant'
        ? (Object.entries(run.loadout.enchants) as [EnchantId, number][]).map(([id, n]) => `<button class="chip" type="button" data-d="${id}"><b>${ENCHANTS[id].name}</b><small>${n}장 — 중첩째 사라집니다</small></button>`)
        : run.loadout.cards.map((id, i) => `<button class="chip" type="button" data-d="${i}">${cardLine(id)}</button>`);
    const panel = this.hud.openOverlay(`
      <h2>${type === 'enchant' ? '인챈트 슬롯이 가득 찼습니다' : `카드 슬롯(${CARD_SLOTS})이 가득 찼습니다`}</h2>
      <p>버릴 것을 고르세요.</p>
      <div class="chips">${items.join('')}</div>
      <button class="choice" type="button" data-cancel>취소</button>`);
    this.wire(panel, {
      d: (el) => done(type === 'enchant' ? (el.dataset.d as EnchantId) : Number(el.dataset.d)),
      cancel: () => this.show(),
    });
  }

  private showShop(run: RunState): void {
    if (run.stage.at !== 'shop') return;
    const s = run.stage.stock;
    const item = (attr: string, i: number, html: string, price: number, sold: boolean) =>
      `<button class="chip${sold ? ' past' : ''}" type="button" data-${attr}="${i}" ${sold ? 'disabled' : ''}>${html}<small class="price">${sold ? '판매됨' : `${price} 골드`}</small></button>`;
    const sellTypes = ORDER.filter((t) => t !== 'K' && run.deck.includes(t));
    const panel = this.hud.openOverlay(`
      <h2>상점</h2>
      ${this.status(run)}
      <p class="sub">기물</p><div class="chips">${s.pieces.map((p, i) => item('piece', i, `<b><span class="g">${GLYPH[p.item]}${VS15}</span> ${PIECE_NAMES_KO[p.item]}</b>`, p.price, p.sold)).join('')}</div>
      <p class="sub">액티브 카드</p><div class="chips">${s.cards.map((p, i) => item('card', i, cardLine(p.item), p.price, p.sold)).join('')}</div>
      <p class="sub">인챈트</p><div class="chips">${s.enchants.map((p, i) => item('ench', i, enchantLine(p.item, (run.loadout.enchants[p.item] ?? 0) + 1), p.price, p.sold)).join('')}</div>
      <p class="sub">판매</p><div class="chips">${sellTypes.map((t) => `<button class="chip" type="button" data-sell="${t}"><b><span class="g">${GLYPH[t]}${VS15}</span> ${PIECE_NAMES_KO[t]} 팔기</b><small class="price">+${sellPrice(t)} 골드</small></button>`).join('')}</div>
      <div class="row">
        <button class="choice" type="button" data-reroll>새로고침 (${s.rerollPrice} 골드)</button>
        <button class="choice primary" type="button" data-leave>떠나기</button>
      </div>`);
    this.wire(panel, {
      piece: (el) => this.act(buyPiece(run, Number(el.dataset.piece))),
      card: (el) => {
        const i = Number(el.dataset.card);
        this.act(buyCard(run, i), () => this.discardPicker(run, 'card', (d) => this.act(buyCard(run, i, d as number))));
      },
      ench: (el) => {
        const i = Number(el.dataset.ench);
        this.act(buyEnchant(run, i), () => this.discardPicker(run, 'enchant', (d) => this.act(buyEnchant(run, i, d as EnchantId))));
      },
      sell: (el) => this.act(sellPiece(run, el.dataset.sell as PieceType)),
      reroll: () => this.act(reroll(run)),
      leave: () => {
        leaveNode(run);
        this.act();
      },
    });
  }

  private showForge(run: RunState): void {
    const types = ORDER.filter((t) => run.deck.includes(t));
    const rows = types.map((t) => {
      const lv = run.loadout.forge[t] ?? 0;
      const cost = forgeCost(run, t);
      const n = run.deck.filter((x) => x === t).length;
      return `<button class="chip" type="button" data-up="${t}" ${cost === null ? 'disabled' : ''}><b><span class="g">${GLYPH[t]}${VS15}</span> ${PIECE_NAMES_KO[t]} ×${n} · +${lv}/${FORGE_MAX}</b><small class="price">${cost === null ? '완전 강화' : `+${lv + 1}: ${cost} 골드`}</small></button>`;
    });
    const panel = this.hud.openOverlay(`
      <h2>대장간</h2>
      <p>유형 단위 강화 — 그 유형의 모든 기물이 강해집니다. +5 완전 강화 시 전투 시작 보호막 20%.</p>
      ${this.status(run)}
      <div class="chips">${rows.join('')}</div>
      <button class="choice primary" type="button" data-leave>떠나기</button>`);
    this.wire(panel, {
      up: (el) => this.act(forgeUp(run, el.dataset.up as PieceType)),
      leave: () => {
        leaveNode(run);
        this.act();
      },
    });
  }

  private showAltar(run: RunState): void {
    if (run.stage.at !== 'altar') return;
    const r = run.stage.result;
    if (r?.kind === 'pick') {
      const all = (Object.keys(ENCHANTS) as EnchantId[]).filter((id) => (run.loadout.enchants[id] ?? 0) < ENCHANT_MAX_STACK);
      const panel = this.hud.openOverlay(`
        <h2>크랙 제단 — 게이지 해방</h2>
        <p>원하는 인챈트 1장을 확정으로 고릅니다 (★각성 포함).</p>
        <div class="chips">${all.map((id) => `<button class="chip" type="button" data-pick="${id}">${enchantLine(id, (run.loadout.enchants[id] ?? 0) + 1)}</button>`).join('')}</div>`);
      this.wire(panel, {
        pick: (el) => {
          const id = el.dataset.pick as EnchantId;
          this.act(altarPick(run, id), () => this.discardPicker(run, 'enchant', (d) => this.act(altarPick(run, id, d as EnchantId))));
        },
      });
      return;
    }
    const resultText =
      r?.kind === 'miss'
        ? `꽝 — 크랙 게이지 +1 (${run.crackGauge}/${ALTAR.gaugeMax})`
        : r?.kind === 'piece'
          ? r.piece
            ? `상위 기물 획득: ${PIECE_NAMES_KO[r.piece]}`
            : '기물이 나왔지만 덱에 자리가 없어 골드로 바뀌었다'
          : '';
    const canPick = altarCanPick(run);
    const panel = this.hud.openOverlay(`
      <h2>크랙 제단</h2>
      <p>${ALTAR.cost}골드를 바쳐 균열을 엽니다: 희귀 인챈트 3지선다 ${Math.round(ALTAR.odds.enchant * 100)}% · 상위 기물 ${Math.round(ALTAR.odds.piece * 100)}% · 꽝 ${Math.round((1 - ALTAR.odds.enchant - ALTAR.odds.piece) * 100)}%.
      꽝이 ${ALTAR.gaugeMax}번 쌓이면 다음 제단에서 원하는 인챈트를 확정으로 고릅니다.</p>
      ${this.status(run)}
      ${resultText ? `<p class="sub">${resultText}</p>` : ''}
      ${!r ? `<button class="choice primary" type="button" data-gamble>${canPick ? '게이지 해방 — 원하는 인챈트 고르기' : `균열을 연다 (${ALTAR.cost} 골드)`}</button>` : ''}
      <button class="choice" type="button" data-leave>떠나기</button>`);
    this.wire(panel, {
      gamble: () => this.act(altarGamble(run)),
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
    const panel = this.hud.openOverlay(`
      <h2>${ev.title}</h2>
      <p>${ev.text}</p>
      ${
        st.result
          ? `<p class="sub">${st.result}</p><button class="choice primary" type="button" data-leave>계속</button>`
          : `<div class="choices">${ev.choices
              .map((ch, i) => `<button class="choice" type="button" data-ev="${i}" ${eventChoiceAvailable(run, st.id, i) ? '' : 'disabled'}>${ch.label}${ch.desc ? `<small>${ch.desc}</small>` : ''}</button>`)
              .join('')}</div>`
      }
      ${this.status(run)}`);
    this.wire(panel, {
      ev: (el) => this.act(eventChoose(run, Number(el.dataset.ev))),
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
    saveMeta(meta);
    clearRun();
    const newly = UNLOCK_DECKS.filter((u) => u.ok(meta) && !u.ok(before)).map((u) => `시작 덱 해금: ${u.name}`);
    if (meta.ascension > before.ascension) newly.push(`승천 ${meta.ascension} 해금: ${ASCENSIONS[meta.ascension]}`);
    const panel = this.hud.openOverlay(`
      <h1>${won ? 'CHECKMATE' : 'DEFEAT'}</h1>
      <h2>${won ? '36층 — 균열의 왕을 쓰러뜨렸습니다' : `Act ${actOf(floor)} ${inAct(floor)}층에서 쓰러졌습니다`}</h2>
      ${newly.length ? `<p class="sub">${newly.join('<br>')}</p>` : ''}
      ${this.status(run)}
      <div class="row">
        <button class="choice" type="button" data-menu>메뉴</button>
        <button class="choice primary" type="button" data-new>새 등반</button>
      </div>`);
    this.run = null;
    this.wire(panel, {
      menu: () => this.showMenu(),
      new: () => this.startNew(),
    });
  }
}
