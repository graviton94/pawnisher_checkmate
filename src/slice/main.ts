import '../fonts.css';
import { josa } from '../data/josa';
import { BATTLE_HELP, HUD_TEXT, KEYWORDS } from '../data/hud';
import '../style.css';
import './slice.css';
import { sfx } from '../audio/sfx';
import { installPressFeedback } from '../ui/motion';
import { dissolveUp, flyTo, installPressy, installUiSprites, mountPart, nope, screwBurst, shutter, sparksAt, titleFx } from './uifx';
import { buyFx, curtainRows, dealHand, discardHand, healFx, koBanner, modalIn, modalOut, pxOut, replay, shake, stampFx, sweep, tally, toastIn, toastOut, turnBanner, turnLabel, typeIn } from './fx3';
import { crestHtml, guide, prologue } from './opening';
import { COACH_LINES, OPENING_TEXT } from '../data/opening';
import { pieceImg } from '../ui/sprites';
import { BoardRenderer } from '../view/BoardRenderer';
import type { BoardModel } from '../game/controller';
import { PIECE_NAMES_KO } from '../data/pieces';
import { findPiece, samePos, type PieceType, type Pos } from '../engine';
import { baseOf, isRefined, refinedOf, AXIS_NAMES, BOSS_NUM, BOSS_RULES, COMMANDS, LAB, TRAIT, FORGE, KITS, SHOP, RECRUITS, REWARD_COMMANDS, SLICE, START_DECK, START_SQUAD, type Axis, type CommandId } from './cards';
import { PART_NUM, partFits, SLICE_PARTS, type SlicePartId } from './parts';
import { iconMask } from '../ui/chrome';

/** 색이 든 16칸 도트 아이콘 (D-182): 단색 마스크 대신 그림 그대로, 계단 확대 */
const iconArt = (key: string): string => `background:url(ui/icons16/${key}.png) center/contain no-repeat;-webkit-mask:none;mask:none;image-rendering:pixelated`;
import { CREW, DEATHS, QUIRKS, crewLabel, makeCrew, type Crew, type LedgerEntry } from './crew';
import { ASC_NUM, ASCENSION, battleFor, buildRun, INTRO, NODE_DESC, NODE_ICONS, NODE_NAMES, type Act, type BattleDef, type MapNode } from './run';
import { SLICE_EVENTS, SLICE_EVENT_IDS, type EventState, type SliceEventId } from './events';
import { addNemesis, betterHighlight, BETS, dir, DIRECTOR, isCloseCall, settleBet, TAUNTS, type BetKind, type Highlight, type Nemesis, type TauntCue } from './director';
import { clearSave, dailySeed, defaultStore, readMeta, readSave, recordRun, todayKey, writeMeta, writeSave, type RunSave } from './save';
import { REST, promotedIn, clutchBoost, kingDoomed, sacrificeCandidates, sacrificeSwap, canPlay, crewMaxHp, fallenAfter, costOf, isInstant, cardMoves, cardPieces, chainMult, dangerSquares, endTurn, intentHits, liveIntents, newSliceBattle, overhaulSquad, playCard, previewPlay, restSquad, rewind, squadAfter, type SliceBattle, type Squad } from './battle';
import type { BattleState, BattleEvent } from '../engine';
import { Rng } from '../engine/rng';

// 판 배치 시안 (D-198 7번): ?layout=b|c — 사용자가 고르면 기본으로 굳힌다
{
  const lay = new URLSearchParams(location.search).get('layout');
  if (lay === 'b' || lay === 'c') document.body.classList.add(`lay-${lay}`);
}

/**
 * 수직 조각 화면 (분대 + 명령 덱, D-142): 대국 두 판 + 카드 보상 한 번.
 * 순서: 카드를 누른다 → 기물을 누른다 → 갈 칸(과녁 = 친다 · 금 = 처치)을 누른다 → 바로 움직이고 친다.
 * 붉게 깜빡이는 칸 = 적이 예고한 칠 칸. 붉은 화살표 · 번호 = 이번에 움직일 적.
 */
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

/** 정비가 먼저 되살릴 기물 순서 (값이 큰 것부터) */
const COST_ORDER: Partial<Record<PieceType, number>> = { Q: 5, R: 4, B: 3, N: 3, P: 1 };

/** 출하 지도 (R5, D-168): 3막 × 갈림길 + 검문 + 반장. 1막 앞 두 판은 입문 · 연마 고정 */
let runSeed = (Date.now() ^ 0x2f17) & 0xffffff;
/** 승급 단계 (D-174) · 오늘의 출하 날짜 */
let asc = 0;
let daily: string | null = null;
let acts: Act[] = buildRun(runSeed);
/** 출하 난수: 분대 · 보상 · 사건 · 대국 시드가 모두 여기서 (같은 시드 = 같은 출하 — 오늘의 출하) */
let R = new Rng(runSeed ^ 0x51c3);
/** 하위 난수 하나 (화면마다 따로 쓰되 순서는 출하 난수가 정한다) */
const sub = (): Rng => new Rng(R.int(0x7fffffff));
const store = defaultStore();

// ---------- 심리 연출 상태 (D-178) ----------
/** 남은 마지막 한 수 · 자원 희생 (출하마다) */
let clutchLeft = 0;
let sacLeft = 0;
/** 사선 보상을 받은 막 (막마다 한 번) */
let closeActs: number[] = [];
/** 이번 출하 최고의 턴 */
let highlight: Highlight | null = null;
/** 같은 대국에서 진 횟수 (보이지 않는 손) · 그 대국 */
let lossesHere = 0;
let lossDef: BattleDef | null = null;
/** 이번 대국: 마지막 한 수를 썼나 · 도발을 했나 · 판돈 · 원수 */
let clutchedNow = false;
let tauntedNow = false;
let betNow: { kind: BetKind; stake: number } | null = null;
let nemesisNow: Nemesis | null = null;
/** 사선 보상 등급 (보상 흐름에서 쓴다) */
let closeTier = 0;
/** 원수 목록 (출하를 넘어 남는다 — 기록에 저장) */
const nemeses = (): Nemesis[] => readMeta(store).nemeses ?? [];
const setNemeses = (list: Nemesis[]): void => writeMeta(store, { ...readMeta(store), nemeses: list });

/** 적 킹의 한 마디 (대국마다 한 줄까지, 확률로만 — 매 판 떠들지 않는다) */
const taunt = (cue: TauntCue, force = false): void => {
  if (tauntedNow || labMode) return;
  if (!force && R.next() > DIRECTOR.taunt) return;
  tauntedNow = true;
  const lines = TAUNTS[cue];
  const line = lines[R.int(lines.length)];
  const el = document.createElement('div');
  el.className = 'taunt tq3';
  el.innerHTML = `${pieceImg('K', 1, 'small', 22)}<span></span>`;
  document.body.appendChild(el);
  // D-189: 말풍선이 튀어나오고 글자가 타자처럼 찍히다 마지막 낱말에서 떨린다
  const words = line.split(' ');
  const last = words.pop() ?? '';
  window.setTimeout(() => void typeIn(el.querySelector('span')!, `${words.length ? `${words.join(' ')} ` : ''}<em>${last}</em>`, 40, () => shake(el, 1)), 200);
  window.setTimeout(() => pxOut(el, () => el.remove()), 2900);
};
let actI = 0;
let rowI = 0;
/** 지금 치르는 대국 */
let cur: BattleDef = INTRO[0];
/** 이긴 대국 수 (결과 화면) */
let won = 0;
/** 다듬은 기록 (작업대 — 한 장씩 「+」 변형으로 바뀐다. 덱이 정본, 이 목록은 기록 · 옛 저장 옮기기용) */
let refined: CommandId[] = [];
/** 이번에 새로 단 부품 (다음에 부품 칸이 그려질 때 장착 연출) */
const newParts = new Set<SlicePartId>();

/** 분대: 시리얼 · 이름 · 기벽이 붙은 기물 (D-153) */
let squad: Squad[] = [];
for (const t of START_SQUAD) squad.push(makeCrew(t, R, squad.map((u) => u.name ?? '')));
let deck: CommandId[] = [...START_DECK];
/** 부품 (규칙을 깨는 유물, D-144) */
let parts: SlicePartId[] = [];
let gold = 0;
let stage = 0;
let b: SliceBattle;
let selCard: number | null = null;
let selPiece: number | null = null;
let busy = false;
/** 배율 표기: 큰 값은 줄여 레일 밖으로 넘치지 않게 (페르소나 테스트 m11) — ×1.25 · ×128 · ×5.6만 · ×3.2억 */
const fmtMult = (v: number): string =>
  v < 100 ? v.toFixed(2) : v < 10000 ? String(Math.round(v)) : v < 1e8 ? `${(v / 1e4).toFixed(1)}만` : `${(v / 1e8).toFixed(1)}억`;

/** 적이 두는 중 (레일 상태 표시) */
let enemyTurn = false;

/** 적 특성 한 줄 (길게 누르기, D-175) */
const foeTraitLine = (p: { side: number; type: PieceType }): string =>
  p.side !== 1 ? '' : p.type === 'P' && b.blastPawns ? `<br><span class="enemy">자폭</span> 쓰러지면 둘레 내 기물에 ${TRAIT.blast}` : p.type === 'K' && b.boss && b.bossRule === 'thorns' ? `<br><span class="enemy">되받아침</span> 치고 못 쓰러뜨리면 친 기물이 ${BOSS_NUM.thorns}을 받는다` : '';

const renderer = new BoardRenderer(
  $('board'),
  {
    tap: (pos) => void onTap(pos),
    hover: () => {},
    longPress: (pos, x, y) => {
      const p = b.s.pieces.find((q) => q.x === pos.x && q.y === pos.y);
      if (!p) return;
      const el = $('info');
      const ci = b.squadIds.indexOf(p.id);
      const c = ci >= 0 ? squad[ci] : null;
      el.innerHTML = c
        ? `<b>${pieceImg(p.type, 0, 'small', 24)} ${crewLabel(c)}</b> <span class="dim">${c.serial}</span><br>HP ${p.hp} / ${p.maxHp}${p.shield ? ` · 방열판 ${p.shield}` : ''} · 처치 ${(c.kills ?? 0) + Object.values(b.pk[p.id] ?? {}).reduce((a, n) => a + (n ?? 0), 0)}${c.quirk ? `<br><span class="quirk">${QUIRKS[c.quirk].name}</span> ${QUIRKS[c.quirk].desc}` : ''}${b.s.doorIds?.includes(p.id) ? '<br>문턱 남음' : ''}`
        : `<b>${pieceImg(p.type, p.side, 'small', 24)} ${p.side === 0 ? '<span class="ally">아군</span>' : '<span class="enemy">적</span>'} ${PIECE_NAMES_KO[p.type]}</b><br>HP ${p.hp} / ${p.maxHp}${p.shield ? ` · 방열판 ${p.shield}` : ''} · ATK ${p.atk}${foeTraitLine(p)}`;
      infoTok++;
      const fresh = el.hidden || el.dataset.pid !== String(p.id);
      el.dataset.pid = String(p.id);
      el.hidden = false;
      el.classList.remove('pxout');
      el.style.left = `${Math.max(8, x - 80)}px`;
      el.style.top = `${Math.max(8, y - 90)}px`;
      // 손끝 정보는 도트 쓸기로 (D-193) — 누르고 있는 동안 거듭 불려도 처음 한 번만
      if (fresh) sweep(el, true, undefined, 260);
    },
    longPressEnd: () => {
      const tok = ++infoTok;
      pxOut($('info'), () => tok === infoTok && ($('info').hidden = true));
    },
  },
  // 판 위 상황 알림 (붕락 · 과열 · 항복)은 띠로 (D-193 알림 위계 ① 상황)
  (text) => turnBanner($('board'), text, true, true),
);
installPressFeedback();
installUiSprites();
installPressy();

/** 길게 누르기 정보: 손을 뗀 뒤 지워지는 사이 다시 누르면 새 정보가 숨지 않게 */
let infoTok = 0;
let toastTimer: number | undefined;
const toast = (msg: string, ms = 1800) => {
  const t = $('toast');
  t.textContent = msg;
  toastIn(t);
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastOut(t), ms);
};

// ---------- 화면 모델 ----------
const destinations = (): Pos[] => (selCard !== null && selPiece !== null ? cardMoves(b, selCard, selPiece) : []);

const model = (): BoardModel => {
  const dests = destinations();
  const hitDests = selCard !== null && selPiece !== null
    ? dests.flatMap((to) => {
        const sim = previewPlay(b, selCard!, selPiece!, to);
        const hits = sim?.events.flatMap((e) => (e.type === 'attack' && e.attackerId === selPiece ? e.hits : [])) ?? [];
        // 밀치기 충돌 처치도 금색으로 (결과를 누르기 전에)
        const bump = sim?.events.some((e) => e.type === 'blast' && e.hits.some((h) => h.killed && b.s.pieces.find((p) => p.id === h.targetId)?.side === 1)) ?? false;
        return hits.length ? [{ pos: to, kill: hits.some((h) => h.killed) || bump }] : [];
      })
    : [];
  return {
    state: b.s,
    virtual: b.s,
    plan: [],
    pending: null,
    pendingPos: null,
    selectedId: selPiece,
    destinations: dests,
    hitDests,
    preview: [],
    removed: [],
    threat: b.s.winner === null && !busy ? { moves: [], hits: dangerSquares(b) } : null,
    intent: b.s.winner === null && !busy ? { state: b.s, plan: liveIntents(b), hits: intentHits(b) } : null,
  };
};

// ---------- 레일 ----------
const cardHtml = (id: CommandId, i: number): string => {
  const c = COMMANDS[id];
  // 실제 태엽: 행진 북 · 재도약이면 싸진다 (기물마다 다르면 가장 싼 값)
  const costs = isInstant(id) ? [costOf(b, i)] : b.s.pieces.filter((p) => p.side === 0 && (c.who === 'any' || c.who === p.type)).map((p) => costOf(b, i, p.id));
  const cost = costs.length ? Math.min(...costs) : c.cost;
  const ok = canPlay(b, i);
  const poor = !ok && cost > b.ap;
  const off = !ok || busy;
  const art = cardArt(id);
  const why = busy ? '' : poor ? `<em>태엽 ${cost} 필요</em>` : !ok ? `<em>${c.kind === 'march' ? '앞으로 갈 폰 없음' : '움직일 기물 없음'}</em>` : '';
  return `<button type="button" class="cmd t-${c.who}${selCard === i ? ' armed' : ''}${off ? ' off' : ''}${cost < c.cost ? ' cheap' : ''}" data-card="${i}" ${off ? 'aria-disabled="true"' : ''}>
    ${keysHtml(cost, b.ap)}${art}<span class="txt"><b>${c.name}<span class="chips">${axisChip(c.axis)}${axisChip(c.axis2)}</span></b>${why || (c.desc ? `<small>${handDesc(c.desc)}</small>` : '')}</span></button>`;
};

/**
 * 카드 크게 보기 (D-166, 슬더스식): 손패를 길게 누르거나(터치) 마우스를 올리면 카드 모양으로 전체 효과.
 * 손패는 이름 · 비용 · 수치만 짧게, 자세한 문장 · 각주 · 띠 이름은 여기서.
 */
const peekHtml = (id: CommandId, cost: number): string => {
  const c = COMMANDS[id];
  return `<div class="peek-card t-${c.who}"><div class="pk-top">${keysHtml(cost)}<b>${c.name}</b></div><div class="pk-art">${c.who === 'any' ? `<span class="pk-any"><i class="ico16" style="${iconArt(`c.${baseOf(id)}`)}"></i></span>` : pieceImg(c.who, 0, 'large', 72)}</div><div class="pk-axes">${axisTag(c.axis)}${axisTag(c.axis2)}</div><p class="pk-desc">${c.desc || '움직여, 내려앉은 자리에서 공격한다.'}</p>${c.flavor ? `<p class="pk-flv">${c.flavor}</p>` : ''}</div>`;
};
let peekEl: HTMLElement | null = null;
const showPeek = (cardEl: HTMLElement): void => {
  const i = Number(cardEl.dataset.card);
  const id = b.hand[i];
  if (!id) return;
  hidePeek();
  const r = cardEl.getBoundingClientRect();
  peekEl = document.createElement('div');
  peekEl.className = 'peek';
  peekEl.dataset.for = cardEl.dataset.card ?? '';
  peekEl.innerHTML = peekHtml(id, Number(cardEl.querySelector('.costgear')?.getAttribute('aria-label')?.replace(/\D/g, '') ?? COMMANDS[id].cost));
  peekEl.style.visibility = 'hidden';
  document.body.appendChild(peekEl);
  const h = peekEl.offsetHeight;
  peekEl.style.left = `${r.right + 10}px`;
  peekEl.style.top = `${Math.max(8, Math.min(window.innerHeight - h - 8, r.top + r.height / 2 - h / 2))}px`;
  // D-189: 도트가 아래에서 쓸어 올리며 드러내고, 닫을 땐 위에서 쓸어 내린다
  sweep(peekEl, true);
};
const hidePeek = (): void => {
  const el = peekEl;
  peekEl = null;
  if (el) sweep(el, false, () => el.remove(), 220);
};

/** 카드 그림: 움직이는 카드는 행마 그림(갈 칸 · 칠 칸), 그 밖은 기물 그림 · 기호 */
const cardArt = (id: CommandId): string => {
  const c = COMMANDS[id];
  // 기물 없는 카드: 카드마다 도트 아이콘 (D-182, public/ui/icons16/c.<id>.png)
  if (c.who === 'any') return `<span class="art any"><i class="ico16" style="${iconArt(`c.${baseOf(id)}`)}"></i></span>`;
  // 기물 아이콘 (D-162 — 행마 판보다 「누가 움직이나」가 먼저 읽힌다. 범위는 판 위 표시가 보여 준다)
  return `<span class="art">${pieceImg(c.who, 0, 'large', 44)}</span>`;
};

/**
 * 카드 비용 = 태엽 열쇠 개수 (D-161): 오른쪽 레일의 태엽과 같은 그림이라 「내 태엽 셋 중 둘」로 읽힌다.
 * have를 주면 지금 남은 태엽보다 많은 열쇠는 빈 열쇠로 (얼마나 모자란지 보인다). 0이면 빈 열쇠 + 0.
 */
const keysHtml = (n: number, have = Infinity): string =>
  `<span class="costgear${n > have ? ' short' : ''}" aria-label="태엽 ${n}"><img src="ui/board/badge-c${Math.max(0, Math.min(9, n))}.png" alt=""></span>`;

/** 손패용 짧은 설명 (D-163): 괄호 수치가 있으면 「문장 첫 마디 · 수치」, 없으면 문장 그대로. 전체 문장은 보상 · 덱 보기에 */
const handDesc = (d: string): string => {
  const m = d.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  return m ? `${m[2]}` : d;
};

/** 지금 분대로 쓸 수 있는 카드인가 (D-164): 그 기물이 분대에 있어야 보상 · 상자에 나온다. 폰 전용 즉시 카드(총진격 · 제물)도 폰이 있어야 */
const usable = (id: CommandId): boolean => {
  const c = COMMANDS[id];
  if (c.who !== 'any') return squad.some((u) => u.t === c.who);
  return true;
};

/** 빌드 축 띠 */
const axisTag = (a?: Axis): string => (a ? ` <i class="axis ax-${a}">${AXIS_NAMES[a]}</i>` : '');
/** 손패용 짧은 축 띠: 한 글자 색 칩 (이름은 보상 화면 · 읽기용 라벨에) */
const axisChip = (a?: Axis): string => (a ? `<i class="axis mini ax-${a}" aria-label="${AXIS_NAMES[a]}">${AXIS_NAMES[a][0]}</i>` : '');

/** 부품 칩 (레일 · 고르기 화면) */
const partHtml = (id: SlicePartId, big = false): string => {
  const d = SLICE_PARTS[id];
  return big
    ? `<button type="button" class="part-card${d.axis ? ` ax-${d.axis}` : ''}" data-part="${id}"><i class="ico" style="${iconArt(d.icon)}"></i><b>${d.name}${axisTag(d.axis ?? undefined)}</b><small>${d.desc}</small></button>`
    : `<button type="button" class="part-chip${d.axis ? ` ax-${d.axis}` : ''}" data-part-info="${id}" aria-label="${d.name}"><i class="ico" style="${iconArt(d.icon)}"></i><span>${d.name}</span></button>`;
};

/** 연출 직전 화면: 바뀌기 전 모습 그대로 (피해 숫자 · 이동이 제대로 보이게) */
const showBefore = (before: BattleState): void =>
  renderer.render({ state: before, virtual: before, plan: [], pending: null, pendingPos: null, selectedId: null, destinations: [], hitDests: [], preview: [], removed: [], threat: null, intent: null });

/** 이번 턴 준 피해 합계 (계기판 · 턴 합계) */
let turnDmg = 0;
const dealt = (events: BattleEvent[], side: 0 | 1, before: BattleState): number =>
  events.reduce((a, e) => (e.type === 'attack' ? a + e.hits.reduce((x, h) => x + (before.pieces.find((p) => p.id === h.targetId)?.side !== side ? h.damage : 0), 0) : a), 0);

const refresh = (): void => {
  hidePeek();
  renderer.render(model());
  turnLabel($('turn-label'), b.s.winner !== null ? '대국 끝' : enemyTurn ? '적 차례' : busy ? '움직이는 중' : document.body.matches('.lay-b, .lay-c') ? `${b.turn}턴` : `${b.turn}턴 · 내 차례`, enemyTurn);
  $('hand').innerHTML = `<p class="hand-head"><button type="button" class="deck-btn" data-deck>덱 ${deck.length}</button><button type="button" class="deck-btn" data-crew>분대 ${b.s.winner === null && !document.body.classList.contains('between') ? b.squadIds.filter((id) => b.s.pieces.some((p) => p.id === id)).length : squad.length}</button> 뽑을 ${b.draw.length} · 버림 ${b.discard.length + (b.played?.length ?? 0)}</p>${b.hand.map(cardHtml).join('') || '<p class="empty">‘손패가 없어.’</p>'}`;
  $('parts').innerHTML = parts.map((id) => partHtml(id)).join('');
  // 새로 단 부품은 처음 보이는 순간 비틀려 들어와 철컥 잠긴다 (D-184)
  for (const id of newParts) mountPart($('parts').querySelector(`[data-part-info="${id}"]`));
  newParts.clear();
  $('parts').hidden = !parts.length;
  $('boss').hidden = !b.boss;
  if (b.boss) {
    const r = BOSS_RULES[b.bossRule];
    $('boss').innerHTML = `<b>${r.name}</b>${r.lines.map((l, k) => `<span${k === 1 && b.bombRow !== null ? ' class="hot"' : ''}>${k === 1 && b.bombRow !== null ? '턴 끝에 붉은 줄!' : l}</span>`).join('')}`;
  }
  // 태엽 게이지 (D-162): 손패 맨 위 한 줄 — 칸마다 열쇠, 쓴 칸은 빈 칸. 오른쪽 레일의 태엽은 없앴다
  $('vials').innerHTML = `<span class="lbl">태엽</span>${Array.from({ length: Math.max(b.apMax, b.ap) }, (_, i) => `<i class="seg${i < b.ap ? ' on' : ''}${i >= b.apMax ? ' bonus' : ''}"><img src="ui/hud/key-${i < b.ap ? 'full' : 'spent'}.png" alt=""></i>`).join('')}<b>${b.ap}/${b.apMax}</b>`;
  $('coins').innerHTML = `<span class="lbl">${HUD_TEXT.track}</span>${Array.from({ length: SLICE.coins }, (_, i) => `<i class="coin${i < b.coins ? '' : ' gone'}"></i>`).join('')}<b title="이기면 받는 나사">+${b.coins * SLICE.coinValue}</b>`;
  ($('btn-rewind') as HTMLButtonElement).disabled = b.rewinds <= 0 || busy || b.s.winner !== null;
  $('btn-rewind').innerHTML = `◀◀ 되감기 <small>${b.rewinds}/${parts.includes('tape') ? 2 : 1}</small>`;
  ($('btn-end') as HTMLButtonElement).disabled = busy || b.s.winner !== null;
  meter();
  coach();
};

/**
 * 첫 대국 도움말 (D-192): 처음 출하하는 사람의 시험대 한 판에만 — 지금 할 일 한 줄(시스템 투)을 판 위에 띄운다.
 * 고를 카드 → 빛나는 기물 → 갈 칸 → 턴 끝. 그 판을 이기면 다시 나오지 않는다.
 */
let coachOn = false;
const coach = (): void => {
  let el = document.querySelector<HTMLElement>('.coach-line');
  const live = coachOn && cur === INTRO[0] && b.s.winner === null && !busy && !enemyTurn;
  $('btn-end').classList.toggle('coach-end', false);
  if (!live) return void (el && !el.classList.contains('pxout') && pxOut(el, () => el?.remove()));
  const canPlay = b.hand.some((_, i) => canPlay2(i));
  const key: keyof typeof COACH_LINES = !canPlay ? 'end' : selCard === null ? 'card' : selPiece === null ? 'piece' : 'square';
  $('btn-end').classList.toggle('coach-end', key === 'end');
  $('hand').classList.toggle('hint', key === 'card');
  if (!el) {
    el = document.createElement('div');
    el.className = 'coach-line';
    document.body.appendChild(el);
  }
  if (el.dataset.k === key) return;
  el.dataset.k = key;
  el.textContent = COACH_LINES[key];
  const r = $('board').getBoundingClientRect();
  el.style.left = `${r.left + r.width / 2}px`;
  el.style.top = `${r.bottom - 44}px`;
  replay(el, 'in');
};
const canPlay2 = (i: number): boolean => canPlay(b, i);

/** 연쇄 계기판 (Balatro식): 이번 턴 피해 합계와 배수 — 처치가 쌓일수록 크고 뜨겁게 */
const meter = (): void => {
  const m = $('meter');
  // 숫자 줄이기 (D-198, 사용자 승인 6번): 이번 턴에 무언가 했을 때만 — 넘친 피해는 대국 뒤 보상 머리로
  if (!turnDmg && !b.kills) {
    m.hidden = true;
    return;
  }
  m.hidden = false;
  m.className = `meter lv${Math.min(b.kills, 4)}`;
  // 대표 화면 (D-156): 배수가 주인공 — 크게, 연쇄가 쌓일수록 크고 뜨겁게
  m.innerHTML = `${b.kills ? `<span class="mult">×${fmtMult(chainMult(b.kills, parts))}</span><b>연쇄 ${b.kills}</b>` : ''}<span class="dmg">${HUD_TEXT.dmg} ${turnDmg}</span>`;
};

/** 이번 카드에서 발동한 부품 (칙령 트레이가 빛난다) */
const firedParts = (cardId: CommandId, mover: PieceType | undefined, events: BattleEvent[], newKills: number): SlicePartId[] => {
  const c = COMMANDS[cardId];
  const out: SlicePartId[] = [];
  const on = (id: SlicePartId, cond: boolean) => cond && parts.includes(id) && out.push(id);
  on('horseshoe', events.some((e) => e.type === 'apGain'));
  on('magnet', newKills > 0);
  on('coil', newKills > 0);
  on('echo', newKills > 0);
  on('drum', !!c && (c.who === 'P' || c.kind === 'march'));
  on('crown', mover === 'K' && events.some((e) => e.type === 'attack' && e.hits.length > 0));
  on('throne', mover === 'K' && events.some((e) => e.type === 'shield'));
  on('hammer', events.some((e) => e.type === 'blast' && e.label.includes('충돌')));
  on('anvilPlate', events.some((e) => e.type === 'blast' && e.label.includes('충돌')));
  on('chainShot', events.some((e) => e.type === 'blast' && e.label.includes('충돌') && e.hits.some((h) => h.killed)));
  on('lance', mover === 'N' && events.some((e) => e.type === 'attack' && e.hits.length > 0));
  on('spurs', c?.who === 'N');
  on('banner', mover === 'P' && events.some((e) => e.type === 'attack' && e.hits.length > 0));
  on('bloodPact', events.some((e) => e.type === 'attack' && e.hits.length > 0));
  on('conductor', newKills > 0);
  on('fuse', b.kills >= PART_NUM.fuseAt && newKills > 0);
  return out;
};

/** 칙령 트레이: 발동한 부품이 번쩍인다 */
const flashParts = (ids: SlicePartId[]): void => {
  for (const id of ids) {
    const el = $('parts').querySelector<HTMLElement>(`[data-part-info="${id}"]`);
    if (!el) continue;
    el.classList.remove('fire');
    void el.offsetWidth;
    el.classList.add('fire');
  }
  if (ids.length) sfx('coin');
};

/** 처치 순간 (연쇄): 판 한가운데 큰 글자 + 판 흔들림 + 음이 올라간다 */
const chainPop = (kills: number): void => {
  const el = document.createElement('div');
  el.className = `chainpop lv${Math.min(kills, 4)}`;
  el.innerHTML = `<small>연쇄 ${kills}</small>×${fmtMult(chainMult(kills, parts))}${kills >= 3 ? '!' : ''}`;
  // 판 캔버스 위로 (body에 고정 배치, 판 한가운데)
  const r = $('board').getBoundingClientRect();
  el.style.left = `${r.left + r.width / 2}px`;
  el.style.top = `${r.top + r.height * 0.42}px`;
  document.body.appendChild(el);
  window.setTimeout(() => el.remove(), 900);
  shake($('board'), kills >= 3 ? 3 : 2);
  sfx('kill', kills + 2);
  window.setTimeout(() => sfx('coin', kills + 4), 120);
};

// ---------- 조작 ----------
const pickCard = (i: number): void => {
  if (busy || b.s.winner !== null) return;
  const c = COMMANDS[b.hand[i]];
  if (!c) return;
  if (isInstant(b.hand[i])) {
    if (!canPlay(b, i) && costOf(b, i) > b.ap) nope(document.querySelector(`[data-card="${i}"]`), $('vials'));
    if (!canPlay(b, i)) return toast(costOf(b, i) > b.ap ? '‘태엽이 모자라.’' : c.kind === 'march' ? '‘앞으로 갈 폰이 없어.’' : '‘지금은 쓸 수 없어.’');
    if (c.kind === 'draw' || c.kind === 'spark') {
      sfx(c.kind === 'spark' ? 'coin' : 'tap', b.kills + 2);
      playCard(b, i);
      selCard = selPiece = null;
      if (c.kind === 'spark') chainPop(b.kills);
      prevKills = b.kills;
      return refresh();
    }
    return void run(i);
  }
  if (!canPlay(b, i) && b.s.pieces.every((p) => p.side !== 0 || costOf(b, i, p.id) > b.ap)) return nope(document.querySelector(`[data-card="${i}"]`), $('vials')), toast('‘태엽이 모자라.’');
  const pieces = cardPieces(b, i);
  if (!pieces.length) return toast(c.who === 'any' ? '‘움직일 기물이 없어.’' : `‘${josa(PIECE_NAMES_KO[c.who], '이')} 없거나, 갈 칸이 없어.’`);
  sfx('lift');
  if (selCard === i) {
    selCard = selPiece = null;
    return refresh();
  }
  selCard = i;
  selPiece = pieces.length === 1 ? pieces[0].id : selPiece !== null && pieces.some((p) => p.id === selPiece) ? selPiece : null;
  refresh();
};

/** 기물을 먼저 누르면 그 기물에 맞는 카드를 고른다 (전용 카드 → 아무나 카드 순, 싼 것부터) */
const autoCard = (pieceId: number): number | null => {
  const p = findPiece(b.s, pieceId)!;
  const cand = b.hand
    .map((id, i) => ({ id, i, c: COMMANDS[id] }))
    .filter(({ c, i }) => c.kind === 'move' && cardPieces(b, i).some((q) => q.id === p.id))
    .sort((x, y) => Number(x.c.who === 'any') - Number(y.c.who === 'any') || costOf(b, x.i, p.id) - costOf(b, y.i, p.id));
  return cand[0]?.i ?? null;
};

const onTap = async (pos: Pos): Promise<void> => {
  if (busy || b.s.winner !== null) return;
  const p = b.s.pieces.find((q) => q.x === pos.x && q.y === pos.y);
  // 갈 칸을 눌렀다 → 바로 실행
  if (selCard !== null && selPiece !== null && destinations().some((d) => samePos(d, pos))) return run(selCard, selPiece, pos);
  if (p && p.side === 0) {
    const c = selCard !== null ? COMMANDS[b.hand[selCard]] : null;
    // 방열판 · 땜질: 기물을 누르면 바로
    if (c && (c.kind === 'shield' || c.kind === 'repair') && cardPieces(b, selCard!).some((q) => q.id === p.id)) return run(selCard!, p.id);
    if (selCard !== null && cardPieces(b, selCard).some((q) => q.id === p.id)) selPiece = p.id;
    else {
      const ci = autoCard(p.id);
      if (ci === null) return toast(`‘${josa(PIECE_NAMES_KO[p.type], '을')} 움직일 카드가 없어.’`);
      selCard = ci;
      selPiece = p.id;
    }
    sfx('lift');
    return refresh();
  }
  if (p && p.side === 1) {
    const it = liveIntents(b).find((x) => x.pieceId === p.id);
    toast(it ? '다음 차례에 움직이는 적입니다. 붉은 칸을 공격합니다.' : '다음 차례에는 움직이지 않습니다.');
    return;
  }
  selCard = selPiece = null;
  refresh();
};

/** 쓰러진 분대원과 함께 카드가 탔으면 알린다 (D-198) — n0 = 그 조작 전 탄 카드 수 */
const burnNote = (n0: number): void => {
  const fresh = (b.burned ?? []).slice(n0);
  if (!fresh.length) return;
  const by = new Map<string, number>();
  for (const id of fresh) by.set(COMMANDS[id].who, (by.get(COMMANDS[id].who) ?? 0) + 1);
  const t = [...by.keys()][0] as PieceType;
  toast(`${josa(PIECE_NAMES_KO[t], '이')} 모두 쓰러져 ${PIECE_NAMES_KO[t]} 카드 ${fresh.length}장이 불탑니다. (이번 대국만)`, 3000);
  sfx('threat');
};

const run = (i: number, pieceId?: number, to?: Pos): Promise<void> => guarded(() => runInner(i, pieceId, to));
const runInner = async (i: number, pieceId?: number, to?: Pos): Promise<void> => {
  const cardId = b.hand[i];
  const moverType = pieceId !== undefined ? findPiece(b.s, pieceId)?.type : undefined;
  const k0 = b.kills;
  const burn0 = b.burned?.length ?? 0;
  const r = playCard(b, i, pieceId, to);
  if (typeof r === 'string') return toast(r);
  $('hand').classList.remove('hint');
  const gain = r.events.reduce((a, e) => (e.type === 'apGain' ? a + e.amount : a), 0);
  selCard = selPiece = null;
  busy = true;
  refresh();
  showBefore(r.before);
  await renderer.play(r.before, r.events);
  await deathRites();
  busy = false;
  burnNote(burn0);
  turnDmg += dealt(r.events, 0, r.before);
  renderer.setup(b.s);
  refresh();
  if (b.kills > prevKills) chainPop(b.kills);
  prevKills = b.kills;
  flashParts(firedParts(cardId, moverType, r.events, b.kills - k0));
  // 템포 가속: 연쇄가 쌓일수록 다음 연출이 빨라진다
  renderer.setTempo(1 + Math.min(b.kills, 4) * 0.15);
  if (gain) {
    toast(`${SLICE_PARTS.horseshoe.name} — 태엽 +${gain}`);
    window.setTimeout(() => sfx('coin', 9), 200);
  }
  if (b.s.winner !== null) return finish();
};
let prevKills = 0;

const onEnd = (): Promise<void> => guarded(onEndInner);
const onEndInner = async (): Promise<void> => {
  if (busy || b.s.winner !== null) return;
  const burn0 = b.burned?.length ?? 0;
  const r = endTurn(b);
  if (r === 'warn') {
    sfx('threat');
    toast('이대로 턴을 끝내면 킹이 피격당합니다. 한 번 더 누르면 끝냅니다.', 2600);
    $('btn-end').classList.add('warn');
    return;
  }
  $('btn-end').classList.remove('warn');
  // 바로 잠근다 (페르소나 테스트 B1): 턴 합계 연출을 기다리는 사이 「턴 끝」 연타가 적 차례를 한 번 더 돌렸다
  busy = true;
  selCard = selPiece = null;
  refresh();
  // 이번 출하 최고의 턴 (하이라이트, D-178) · 한 턴에 둘 이상 쓰러뜨리면 적 킹이 분해한다
  const hl = { where: cur.title, turn: b.turn - 1, kills: prevKills, damage: turnDmg };
  if (turnDmg > 0 && betterHighlight(highlight, hl)) highlight = hl;
  if (prevKills >= 2) taunt('cheese');
  // 턴 합계 (Balatro식): 이번 턴 준 피해가 세어 올라간다
  if (turnDmg > 0) await renderer.summary(0, turnDmg, prevKills);
  turnDmg = 0;
  prevKills = 0;
  renderer.setTempo(1);
  busy = true;
  await discardHand($('hand'));
  enemyTurn = true;
  refresh();
  showBefore(r.before);
  turnBanner($('board'), '적 차례', true);
  // 띠가 판 가운데를 지나는 동안 적 첫 수가 가려지지 않게 잠깐 기다린다 (띠는 0.9초에 빠지고 적은 겨눔부터 시작)
  await new Promise((res) => window.setTimeout(res, 350));
  await renderer.play(r.before, r.events);
  await deathRites();
  if (r.events.some((e) => e.type === 'respawn' && e.label?.startsWith('끝없는'))) flashParts(['assembly']);
  busy = false;
  enemyTurn = false;
  renderer.setup(b.s);
  refresh();
  if (b.s.winner !== null) return finish();
  turnBanner($('board'), `${b.turn}턴 · 내 차례`, false);
  dealHand($('hand'));
  burnNote(burn0);
  if (b.falls.some((f) => f.turn === b.turn - 1)) taunt('gloat');
  sfx('submit');
  await lastStand();
};

/**
 * 사선 (D-178): 이번 적 차례에 내 킹이 쓰러지게 생겼으면 — ⑥ 곁의 분대원이 대신 맞겠다고 나서거나(고른다),
 * ⑤ 시간이 멈추고 마지막 한 수(태엽 + 철벽)가 들어온다. 둘 다 출하마다 몇 번뿐, 승급이 오를수록 줄어든다.
 */
const lastStand = async (force = false): Promise<void> => {
  if (labMode || (!force && !kingDoomed(b))) return;
  const cands = sacrificeCandidates(b);
  if (sacLeft > 0 && cands.length) {
    const ci = b.squadIds.indexOf(cands[0]);
    const who = ci >= 0 ? squad[ci] : null;
    if (who) {
      const ok = await new Promise<boolean>((res) => {
        const el = openOverlay(`<div class="stand"><p class="eyebrow">사선</p><h2>${pieceImg(who.t, 0, 'small', 28)} ${crewLabel(who)}</h2><p class="line">“제가 맞겠습니다, 대장.”</p><p class="dim">받아들이면 킹과 자리를 바꿉니다. 이 분대원이 대신 맞습니다.</p><div class="row"><button class="btn" type="button" data-no>거절한다</button><button class="btn brass" type="button" data-yes>받아들인다</button></div></div>`);
        el.querySelector('[data-yes]')!.addEventListener('click', () => res(true));
        el.querySelector('[data-no]')!.addEventListener('click', () => res(false));
      });
      closeOverlay();
      if (ok) {
        sacLeft -= 1;
        // 몸을 던진다 (D-180): 웅크림 → 높은 호 → 킹 자리에 박힘, 킹은 뒤로
        const kingId = b.s.pieces.find((p) => p.side === 0 && p.type === 'K')?.id;
        if (kingId !== undefined) {
          busy = true;
          await renderer.swapLeap(cands[0], kingId);
          busy = false;
        }
        sacrificeSwap(b, cands[0]);
        sfx('stamp');
        renderer.setup(b.s);
        refresh();
        toast(`${josa(who.name, '이')} 킹 앞을 막아선다.`, 2600);
        if (!force && !kingDoomed(b)) return;
      }
    }
  }
  if (clutchLeft <= 0) return;
  clutchLeft -= 1;
  clutchedNow = true;
  // 마지막 한 수 = 상황이 바뀐다 → 띠 (D-193). 회색 막 + 서서히 대신
  turnBanner($('board'), `마지막 한 수 — 태엽 +${dir.clutchAp(asc)} · 철벽`, false, true);
  sfx('awaken');
  await new Promise((r) => window.setTimeout(r, 1000));
  clutchBoost(b, dir.clutchAp(asc));
  refresh();
};

/** 원수와 다시 만났다 (전환 화면 뒤): 이름 · 쓰러뜨린 분대원 · 단계 */
const nemesisMeet = (n: Nemesis): void => {
  const el = openOverlay(`<div class="stand nemesis"><p class="eyebrow">원수</p><h2>${pieceImg(n.t, 1, 'small', 30)} ${n.name}</h2><p class="line">${TAUNTS.meet[R.int(TAUNTS.meet.length)]}</p><p class="dim">쓰러뜨린 분대원: ${n.victims.join(' · ')} · ${n.rank}단계 (HP +${Math.round(n.rank * DIRECTOR.nemesisHp * 100)}%)<br>쓰러뜨리면 현상금 나사 ${dir.bounty(asc)}${asc <= DIRECTOR.heirloomUpTo && n.heir ? ` · ${josa(n.heir.name, '이')} 돌아온다` : ''}.</p><div class="row"><button class="btn brass" type="button" data-go>간다</button></div></div>`);
  sfx('threat');
  el.querySelector('[data-go]')!.addEventListener('click', async () => {
    closeOverlay();
    // 원수 낙하 (D-180): 그림자 → 낙하 → 판 물결
    if (b.nemesisId !== undefined) {
      busy = true;
      refresh();
      await renderer.dropIn(b.nemesisId);
      busy = false;
      refresh();
    }
    toast(cur.tell, 3200);
  });
};

/** 판돈 (D-178): 이따금, 대국 앞에서 나 자신에게 건다 — 걸지 않아도 된다 */
const maybeBet = (def: BattleDef, force = false): void => {
  if (!force && (labMode || INTRO.includes(def) || def.boss || gold < DIRECTOR.betStake || R.next() > DIRECTOR.betChance)) return;
  const kinds: BetKind[] = ['fast', 'clean'];
  const kind = kinds[R.int(kinds.length)];
  const el = openOverlay(`<div class="stand"><p class="eyebrow">판돈</p><h2>${BETS[kind].label}</h2><p class="dim">${BETS[kind].desc}. 못 이루면 건 나사를 잃습니다.</p><div class="row"><button class="btn" type="button" data-no>걸지 않는다</button><button class="btn brass" type="button" data-yes>나사 ${DIRECTOR.betStake}을 건다</button></div></div>`);
  el.querySelector('[data-no]')!.addEventListener('click', closeOverlay);
  el.querySelector('[data-yes]')!.addEventListener('click', () => {
    betNow = { kind, stake: DIRECTOR.betStake };
    sfx('rare');
    closeOverlay();
    toast(`판돈: ${BETS[kind].label}`, 2200);
    refresh();
  });
};

/** 연출 중 오류가 나도 조작이 잠기지 않게 (busy를 풀고 판을 다시 그린다) */
const guarded = async (fn: () => Promise<void>): Promise<void> => {
  try {
    await fn();
  } catch (err) {
    console.error(err);
    $('hand').classList.remove('dealing');
    busy = false;
    enemyTurn = false;
    renderer.setup(b.s);
    refresh();
    if (b.s.winner !== null) finish();
  }
};

// ---------- 흐름 ----------
/** 대국 시작 (지도에서 고른 판 · 다시 하기) */
const startBattle = (def: BattleDef, silent = false): void => {
  closeOpening();
  document.body.classList.remove('between');
  placeBg(null);
  cur = def;
  stage += 1;
  // 분대에 없는 기물의 카드는 이번 대국에 섞지 않는다 (덱에는 남는다 — 그 기물이 돌아오면 다시 나온다)
  // 보이지 않는 손 (D-178): 같은 대국을 거듭 지면 적이 가끔 가장 아픈 수를 건너뛴다 — 낮은 승급일수록
  if (lossDef !== def) {
    lossDef = def;
    lossesHere = 0;
  }
  const mercy = dir.mercy(asc, lossesHere);
  // 원수 (D-178): 입문 · 연마가 아니면 이따금 그 유형의 적으로 다시 선다
  nemesisNow = null;
  let enemy = def.enemy;
  const ns = nemeses();
  if (ns.length && !INTRO.includes(def) && R.next() < DIRECTOR.nemesisShow) {
    const n = ns.find((x) => enemy.includes(x.t)) ?? ns.find((x) => x.t !== 'K');
    if (n) {
      nemesisNow = n;
      if (!enemy.includes(n.t)) enemy = [...enemy, n.t];
    }
  }
  clutchedNow = false;
  tauntedNow = false;
  betNow = null;
  b = newSliceBattle(squad, enemy, deck.filter(usable), 100 + stage * 17 + R.int(1000), { enemyKingHp: def.kingHp, enemyHp: def.enemyHp, parts, refined, boss: def.boss, bossRule: def.bossRule, traits: def.traits, width: def.w, height: def.h, place: def.place, mercy, nemesis: nemesisNow ? { t: nemesisNow.t, rank: nemesisNow.rank } : undefined });
  selCard = selPiece = null;
  busy = false;
  turnDmg = 0;
  prevKills = 0;
  ritesDone = 0;
  $('hand').classList.remove('dealing');
  closeOverlay();
  renderer.setFoeTraits([...(b.blastPawns ? ['blast' as const] : []), ...(b.boss && b.bossRule === 'thorns' ? ['thorns' as const] : [])]);
  renderer.setNemesis(b.nemesisId ?? null);
  renderer.setBossFinish(!!def.boss);
  renderer.setup(b.s);
  refresh();
  // 전환 화면 (D-165): 판이 바뀔 때마다 — 서술 한 줄 + 도움말, 눌러서 넘긴다. 판 위 규칙 한 줄은 그 뒤에
  if (!silent)
    void stageIntro(def).then(() => {
      battleIntro();
      if (nemesisNow) return nemesisMeet(nemesisNow);
      toast(def.tell, 3200);
      maybeBet(def);
    });
  // 입문 첫 턴: 손패가 빛난다 (글 대신 빛나는 곳)
  coachOn = def === INTRO[0] && !readMeta(store).onboarded && !labMode;
  $('hand').classList.toggle('hint', coachOn);
};

/** 판 세우기 (D-189): 칸이 대각선 물결로 깔리고 기물이 떨어져 박힌 뒤 손패가 한 장씩 들어온다 */
const battleIntro = (): void => {
  // 판이 다 서기 전에는 누르지 못한다 (페르소나 테스트 m5)
  busy = true;
  refresh();
  void renderer.boardIntro().finally(() => {
    busy = false;
    refresh();
  });
  window.setTimeout(() => dealHand($('hand')), 450);
};

/** 다음 노드로: 줄을 하나 넘기고, 막이 끝나면 다음 막 (전환 화면), 3막 반장 뒤면 출하 완료 */
const advance = (): void => {
  rowI += 1;
  if (rowI >= acts[actI].rows.length) {
    actI += 1;
    rowI = 0;
    if (actI >= acts.length) return runEnd(true);
    const a = acts[actI];
    // 막이 바뀌면 분대가 쉰다 (반장 뒤 정비)
    squad = restSquad(squad, restHeal());
    void sceneIntro(`${a.act}막`, a.name, ACT_NARR[actI], `<i class="sf-ico" style="${iconMask('flag')}"></i>`).then(showMap);
    return;
  }
  showMap();
};
const ACT_NARR = ['', '컨베이어가 당신을 위층으로 끌어올린다. 나사 조이는 소리가 가까워진다.', '찬 바람이 분다. 출하구의 빛이 처음으로 보인다.'];

/** 노드에 들어간다 */
const enterNode = (n: MapNode): void => {
  if (n.battle) {
    // 저장이 먼저 (페르소나 테스트 M2): 대국을 세우며 R을 쓰므로, 세우기 전 상태를 남겨야 이어하기가 같은 대국을 다시 세운다
    saveRun('battle', picked[actI][rowI] ?? 0);
    return startBattle(n.battle);
  }
  if (n.kind === 'shop') return void sceneIntro(NODE_NAMES.shop, '고물 더미', '고물 더미 사이로 저울이 흔들린다. 나사 냄새가 난다.', `<i class="sf-ico" style="${iconArt('n.shop')}"></i>`).then(shopScreen);
  if (n.kind === 'event') {
    const id = eventBag.length ? eventBag.splice(R.int(eventBag.length), 1)[0] : SLICE_EVENT_IDS[0];
    const ev = SLICE_EVENTS[id];
    return void sceneIntro(NODE_NAMES.event, ev.title, ev.text.split('.')[0] + '.', `<i class="sf-ico" style="${iconArt('n.event')}"></i>`).then(() => eventScreen(id));
  }
  if (n.kind === 'forge') return void sceneIntro(NODE_NAMES.forge, '꺼지지 않은 화덕', '화덕이 당신을 부른다. 모루는 아직 뜨겁다.', `<i class="sf-ico" style="${iconArt('n.forge')}"></i>`).then(forgeScreen);
};

/**
 * 출하 지도 (D-169, 슬더스식 전체 화면): 막 전체가 왼쪽 → 오른쪽으로 펼쳐진다. 줄마다 노드(황동 메달), 지나온 길은 금빛 선,
 * 다음 갈 곳만 빛나고 누를 수 있다. 누르면 아래 정보 띠(이름 · 설명 · 적 구성) + 「간다」. 앞으로 남은 줄도 다 보인다(계획).
 * 고정 노드(입문 · 연마)는 지도 없이 바로.
 */
/** 지나온 길: 막마다 줄 → 고른 노드 번호 */
let picked: number[][] = [[], [], []];
const showMap = (): void => {
  const a = acts[actI];
  const row = a.rows[rowI];
  if (row.length === 1 && row[0].battle && INTRO.includes(row[0].battle)) {
    picked[actI][rowI] = 0;
    return enterNode(row[0]);
  }
  closeOverlay();
  closeOpening();
  document.body.classList.add('between');
  placeBg(null);
  document.querySelector('.mapfx')?.remove();
  saveRun('map');
  const n = a.rows.length;
  const pos = (r: number, k: number) => ({ x: ((r + 0.5) / n) * 100, y: ((k + 0.5) / a.rows[r].length) * 100 });
  // 선: 지나온 길(금) · 지금 위치 → 다음 갈 곳들(밝게) · 그 뒤는 모두 이어진 흐린 선
  const lines: string[] = [];
  for (let r = 0; r < n - 1; r++)
    a.rows[r].forEach((_, k) =>
      a.rows[r + 1].forEach((__, k2) => {
        const p1 = pos(r, k), p2 = pos(r + 1, k2);
        const walked = picked[actI][r] === k && picked[actI][r + 1] === k2;
        const live = r === rowI - 1 && picked[actI][r] === k;
        const dead = r < rowI && picked[actI][r] !== k;
        if (dead) return;
        // 컨베이어 체인 (D-184): 검은 바깥 줄 + 고리 무늬. 지금 갈 수 있는 길은 돌아가고, 고르면 나머지는 끊어진다
        const cls = walked ? 'walked' : live ? 'live' : 'far';
        const xy = `x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}"`;
        lines.push(`<line ${xy} class="ch-o"/><line ${xy} class="ch-i ${cls}"${live ? ` data-to="${k2}"` : ''}/>`);
      }),
    );
  const nodes = a.rows
    .map((r, ri) =>
      r
        .map((nd, k) => {
          const p = pos(ri, k);
          const state = ri < rowI ? (picked[actI][ri] === k ? 'done' : 'skip') : ri === rowI ? 'now' : 'later';
          return `<button type="button" class="mnd ${state} nd-${nd.kind}" style="left:${p.x}%;top:${p.y}%" ${state === 'now' ? `data-node="${k}"` : 'tabindex="-1"'} aria-label="${NODE_NAMES[nd.kind]}"><i style="${iconArt(NODE_ICONS[nd.kind])}"></i><span>${NODE_NAMES[nd.kind]}</span></button>`;
        })
        .join(''),
    )
    .join('');
  const el = document.createElement('div');
  el.className = 'mapfx';
  // 막 표지 (A-01~03)를 지도 바탕에 어둡게 깐다 — 그림이 없으면 지금 바탕 그대로
  // CSS 변수 안 url()은 스타일시트 기준으로 풀리므로 절대 주소로
  el.style.setProperty('--act', `url(${new URL(`scenes/act-${actI + 1}.png`, location.href).href})`);
  el.innerHTML = `<header><div><p class="sf-eyebrow">${a.act}막</p><h2>${a.name}</h2></div><p class="res">나사 <b>${gold}</b> · 분대 <b>${squad.length}</b> · 덱 <b>${deck.length}</b>${parts.length ? ` · 부품 <b>${parts.length}</b>` : ''}</p></header>
    <div class="map-body"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${lines.join('')}</svg>${nodes}</div>
    <footer class="map-info"><p class="hint">빛나는 곳 중 하나를 고릅니다.</p></footer>`;
  document.body.appendChild(el);
  sfx('lift');
  const info = el.querySelector<HTMLElement>('.map-info')!;
  el.querySelectorAll<HTMLElement>('[data-node]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const k = Number(btn.dataset.node);
      const nd = row[k];
      if (btn.classList.contains('chosen')) return go(k);
      el.querySelectorAll('.mnd.chosen').forEach((x) => x.classList.remove('chosen'));
      btn.classList.add('chosen');
      sfx('tap');
      el.querySelectorAll<SVGLineElement>('line[data-to]').forEach((ln) => {
        const me = Number(ln.dataset.to) === k;
        ln.classList.toggle('pick', me);
        ln.classList.toggle('snap', !me);
        ln.classList.toggle('live', me);
      });
      const foes = nd.battle ? `<span class="nd-foes">${nd.battle.enemy.map((t) => pieceImg(t, 1, 'small', 22)).join('')}</span>` : '';
      info.innerHTML = `<i class="ico nd-${nd.kind}" style="${iconArt(NODE_ICONS[nd.kind])}"></i><div class="txt"><b>${NODE_NAMES[nd.kind]}</b><small>${NODE_DESC[nd.kind]}</small></div>${foes}<button class="btn brass" type="button" data-go>간다</button>`;
      info.querySelector('[data-go]')!.addEventListener('click', () => go(k));
    }),
  );
  const go = (k: number): void => {
    picked[actI][rowI] = k;
    sfx('rare');
    pxOut(el, () => {
      el.remove();
      enterNode(row[k]);
    }, 300);
  };
};

/** 이번 출하에서 아직 안 나온 사건 (한 출하에 같은 사건 두 번 없음) */
let eventBag: SliceEventId[] = [...SLICE_EVENT_IDS];
/** 사건 화면 (R5-3, D-170): 서술 · 선택지(고를 수 없으면 이유) → 결과 한 줄 → 계속 (부품이면 고르기) */
const eventScreen = (id: (typeof SLICE_EVENT_IDS)[number]): void => {
  const ev = SLICE_EVENTS[id];
  const st = (): EventState => ({ squad, deck, refined, gold });
  // 장면 칸 (슬더스식 왼쪽 그림): public/scenes/<사건>.png가 오면 그 그림, 없으면 물음표 문양 (발주 docs/asset-order-scenes.md)
  const el = openOverlay(`<div class="ev-wrap"><div class="ev-scene"><img src="scenes/${id}.png" alt="" onerror="this.remove()"><i style="${iconArt('n.event')}"></i></div><div class="ev-body"><h2>${ev.title}</h2><p class="ev-text"></p><div class="ev-choices">${ev.choices
    .map((c, k) => {
      const why = c.blocked?.(st()) ?? null;
      return `<button type="button" class="ev-choice${why ? ' off' : ''}" data-ev="${k}" ${why ? 'aria-disabled="true"' : ''}><b>${c.label}</b>${c.desc ? `<small>${c.desc}</small>` : ''}${why ? `<em>${why}</em>` : ''}</button>`;
    })
    .join('')}</div><p class="dim">나사 ${gold} · 분대 ${squad.length} · 덱 ${deck.length}</p></div></div>`);
  // 서술은 타자로 (D-193 — 서술 = 타자, 시스템 글 = 즉시)
  const evText = el.querySelector<HTMLElement>('.ev-text')!;
  void typeIn(evText, ev.text, 18, undefined, () => evText.isConnected);
  el.querySelectorAll<HTMLElement>('[data-ev]').forEach((btn) =>
    btn.addEventListener('click', () => {
      if (btn.classList.contains('off')) return toast('지금은 고를 수 없습니다.');
      const c = ev.choices[Number(btn.dataset.ev)];
      choose(btn, c.label.replace(/\?$/, ''), () => {
        const s0 = st();
        const out = c.apply(s0, sub());
        squad = s0.squad;
        deck = s0.deck;
        refined.splice(0, refined.length, ...s0.refined);
        gold = s0.gold;
        if (out.recruit) squad.push(makeCrew(out.recruit, R, squad.map((u) => u.name ?? '')));
        sfx(out.partPick ? 'rare' : 'stamp');
        const res = openOverlay(`<h2>${ev.title}</h2><p class="ev-text">${out.text}</p><div class="row"><button class="btn brass" type="button" data-next>계속</button></div>`);
        res.querySelector('[data-next]')!.addEventListener('click', () => (out.partPick ? partPick(`<h2>${ev.title} — 부품 하나</h2>`, advance) : advance()));
      });
    }),
  );
};

/** 고물상 (R5-2): 카드 4 · 부품 1 · 정비 · 카드 빼기. 여러 개 사도 된다, 떠나기로 끝 */
const shopScreen = (): void => {
  // 장소 배경 (D-200): 녹슨 룩의 고물상 BG-01 — 창은 오른쪽
  document.body.classList.add('between');
  placeBg('bg-shop');
  const rng = sub();
  const pool = REWARD_COMMANDS.filter(usable);
  const cards: CommandId[] = [];
  while (cards.length < SHOP.cards && pool.length) cards.push(pool.splice(rng.int(pool.length), 1)[0]);
  const partPool = (Object.keys(SLICE_PARTS) as SlicePartId[]).filter((id) => !parts.includes(id) && partFits(id, squad.map((u) => u.t), parts));
  const part = partPool.length ? partPool[rng.int(partPool.length)] : null;
  const sold = new Set<string>();
  const price = (id: CommandId) => ascPrice(SHOP.cardPrice[Math.min(2, COMMANDS[id].cost)]);
  const render = (): void => {
    const tag = (key: string, cost: number) => (sold.has(key) ? '<span class="price sold">팔림</span>' : `<span class="price${gold < cost ? ' poor' : ''}"><i class="scr" role="img" aria-label="나사"></i>${cost}</span>`);
    const el = openOverlay(`<div class="shop-head"><h2>고물상 <span class="dim">— 나사 ${gold}</span></h2><button class="btn brass" type="button" data-leave>떠나기</button></div>
      <div class="shop-grid">
        ${cards.map((id) => { const c = COMMANDS[id]; return `<button type="button" class="cmd big t-${c.who}${sold.has(id) ? ' sold' : ''}" data-buy="card:${id}">${keysHtml(c.cost)}${cardArt(id)}<span class="txt"><b>${c.name}${axisTag(c.axis)}${axisTag(c.axis2)}</b>${c.desc ? `<small>${c.desc}</small>` : ''}</span>${tag(id, price(id))}</button>`; }).join('')}
        ${part ? `<button type="button" class="part-card${sold.has('part') ? ' sold' : ''}" data-buy="part:${part}"><i class="ico" style="${iconArt(SLICE_PARTS[part].icon)}"></i><b>${SLICE_PARTS[part].name}</b><small>${SLICE_PARTS[part].desc}</small>${tag('part', ascPrice(SHOP.partPrice))}</button>` : ''}
        <button type="button" class="part-card${sold.has('heal') ? ' sold' : ''}" data-buy="heal"><i class="ico" style="${iconArt('s.heal')}"></i><b>정비</b><small>분대 전원 HP +${Math.round(SHOP.healPct * 100)}%</small>${tag('heal', ascPrice(SHOP.healPrice))}</button>
        <button type="button" class="part-card${sold.has('remove') ? ' sold' : ''}" data-buy="remove"><i class="ico" style="${iconArt('s.remove')}"></i><b>카드 빼기</b><small>덱에서 카드 1장 영구 제거.</small>${tag('remove', ascPrice(SHOP.removePrice))}</button>
      </div>`);
    el.querySelector('[data-leave]')!.addEventListener('click', advance);
    el.querySelectorAll<HTMLElement>('[data-buy]').forEach((btn) =>
      btn.addEventListener('click', () => {
        const [kind, id] = (btn.dataset.buy ?? '').split(':');
        const key = kind === 'card' ? id : kind;
        if (sold.has(key)) return;
        const cost = kind === 'card' ? price(id as CommandId) : kind === 'part' ? ascPrice(SHOP.partPrice) : kind === 'heal' ? ascPrice(SHOP.healPrice) : ascPrice(SHOP.removePrice);
        if (gold < cost) return toast(`‘나사가 모자라.’ (${cost} 필요)`);
        const label = kind === 'card' ? `${josa(COMMANDS[id as CommandId].name, '을')} 산다 — 나사 ${cost}` : kind === 'part' ? `${josa(SLICE_PARTS[id as SlicePartId].name, '을')} 산다 — 나사 ${cost}` : kind === 'heal' ? `분대를 정비한다 — 나사 ${cost}` : `카드 한 장을 뺀다 — 나사 ${cost}`;
        choose(btn, label, () => {
          if (kind === 'remove') {
            return deckView('remove', (removed) => {
              if (removed) {
                gold -= cost;
                sold.add(key);
              }
              render();
            });
          }
          gold -= cost;
          sold.add(key);
          sfx('coin');
          if (kind === 'card') deck.push(id as CommandId);
          if (kind === 'part') (parts.push(id as SlicePartId), newParts.add(id as SlicePartId));
          if (kind === 'heal') squad = squad.map((u) => ({ ...u, hp: Math.min(crewMaxHp(u), (u.hp ?? crewMaxHp(u)) + Math.round(crewMaxHp(u) * SHOP.healPct)) }));
          render();
          // 구매 · 회복 (D-189): 나사가 날아와 꽂히고 물건이 튄다 / 정비는 초록 고리 · 십자 반짝이
          const got = $('overlay-panel').querySelector<HTMLElement>(`[data-buy="${btn.dataset.buy}"]`);
          if (kind === 'heal') healFx(got, `HP +${Math.round(SHOP.healPct * 100)}%`);
          else if (kind !== 'remove') buyFx(got, $('overlay-panel').querySelector('.shop-head .dim'));
        });
      }),
    );
  };
  render();
};

/** 작업대 (R5-2): 셋 중 하나 — 다듬기(한 장 태엽 −1) · 카드 빼기 · 수리(분대 전원 HP +40%) */
const forgeScreen = (): void => {
  const el = openOverlay(`<h2>작업대 <span class="dim">— 하나를 고릅니다</span></h2>
    <div class="part-cards">
      <button type="button" class="part-card" data-forge="refine"><i class="ico" style="${iconArt('s.refine')}"></i><b>다듬기</b><small>카드 한 장을 골라 태엽 −1.</small></button>
      <button type="button" class="part-card" data-forge="remove"><i class="ico" style="${iconArt('s.remove')}"></i><b>카드 빼기</b><small>덱에서 카드 1장 영구 제거.</small></button>
      <button type="button" class="part-card" data-forge="repair"><i class="ico" style="${iconArt('s.repair')}"></i><b>수리</b><small>분대 전원 HP +${Math.round(FORGE.repairPct * 100)}%</small></button>
    </div>`);
  el.querySelectorAll<HTMLElement>('[data-forge]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const k = btn.dataset.forge;
      const label = k === 'refine' ? '카드 하나를 다듬는다' : k === 'remove' ? '카드 한 장을 뺀다' : '분대를 수리한다';
      choose(btn, label, () => {
        if (k === 'remove') return deckView('remove', (removed) => (removed ? advance() : forgeScreen()));
        if (k === 'refine') return refineScreen();
        squad = squad.map((u) => ({ ...u, hp: Math.min(crewMaxHp(u), (u.hp ?? crewMaxHp(u)) + Math.round(crewMaxHp(u) * FORGE.repairPct)) }));
        sfx('awaken');
        healFx(btn, `HP +${Math.round(FORGE.repairPct * 100)}%`);
        toast(`분대 전원 HP +${Math.round(FORGE.repairPct * 100)}%`);
        window.setTimeout(advance, 750);
      });
    }),
  );
};

/** 다듬기: 태엽 1 이상이고 아직 다듬지 않은 카드 중 하나 */
const refineScreen = (): void => {
  const ids = [...new Set(deck)].filter((id) => !isRefined(id) && COMMANDS[id].cost >= 1);
  const el = openOverlay(`<h2>다듬기 — 카드 하나</h2><p>고른 카드 한 장이 「+」가 되어 태엽 −1이 됩니다. 같은 카드가 여러 장이면 한 장만.</p><div class="deck-grid removing">${ids
    .map((id) => { const c = COMMANDS[id]; return `<button type="button" class="cmd deckcard t-${c.who}" data-ref="${id}">${keysHtml(c.cost)}${cardArt(id)}<span class="txt"><b>${c.name}</b></span><span class="cnt">태엽 ${c.cost} → ${c.cost - 1}</span></button>`; })
    .join('') || '<p class="dim">다듬을 카드가 없습니다.</p>'}</div><div class="row"><button class="btn" type="button" data-back>그만두기</button></div>`);
  el.querySelector('[data-back]')!.addEventListener('click', forgeScreen);
  el.querySelectorAll<HTMLElement>('[data-ref]').forEach((btn) =>
    btn.addEventListener('click', () =>
      choose(btn, `${josa(COMMANDS[btn.dataset.ref as CommandId].name, '을')} 다듬는다`, () => {
        const rid = btn.dataset.ref as CommandId;
        deck[deck.indexOf(rid)] = refinedOf(baseOf(rid));
        refined.push(rid);
        sfx('stamp');
        toast(`${COMMANDS[btn.dataset.ref as CommandId].name} 한 장 — 태엽 −1`);
        window.setTimeout(advance, 300);
      }),
    ),
  );
};

/** 판 전환 도움말 (스카이림식 — 전환 화면 아래 한 줄) */
const TIPS = [
  '카드를 쓰기 전에 붉은 과녁과 금색 칸을 보십시오. 금색은 처치입니다.',
  '한 턴에 여럿을 처치할수록 연쇄 배율이 오릅니다. 순서가 곧 화력입니다.',
  '적의 공격은 미리 보입니다. 먼저 쓰러뜨리거나, 비키거나, 길을 막으십시오.',
  '되감기는 대국마다 한 번. 이번 턴을 처음으로 되돌립니다.',
  HUD_TEXT.trackHint,
  '쓰러진 분대원은 돌아오지 않습니다. 정비로 한 기를 되살릴 수 있습니다.',
  '부품은 같은 띠의 카드와 맞물립니다. 띠를 맞추면 배율이 폭발합니다.',
  '기물을 길게 누르면 이름 · 기벽 · 체력을 볼 수 있습니다.',
];

/**
 * 전환 화면 (D-165 → D-191 새 문법): 철문이 열리면 — 빛줄기 앞으로 적(또는 장소 문양)이 떨어져 박히고 → 명패 아래 이름이 내리꽂히고
 * (색 갈림) → 서술이 한 자씩 → 적 구성이 하나씩 튀어나온다. 눌러서 넘기거나 약 3.5초 뒤 저절로.
 */
const sceneIntro = (label: string, name: string, narr: string, art: string, boss = false, roster = ''): Promise<void> =>
  new Promise((resolve) => {
    const el = document.createElement('div');
    el.className = `stagefx enc${boss ? ' boss' : ''}`;
    el.innerHTML = `<div class="enc-rays"></div><div class="sf-art"><i class="enc-shadow"></i><div class="enc-piece">${art}</div></div>
      <div class="sf-text"><p class="sf-eyebrow enc-plate">${label}</p><h1>${name}</h1><p class="sf-narr"></p>${roster ? `<div class="enc-foes"><span>적</span>${roster}</div>` : ''}</div>
      <p class="sf-tip">${TIPS[Math.floor(Math.random() * TIPS.length)]}</p><p class="sf-skip">눌러서 계속</p>`;
    const T: number[] = [];
    const at = (ms: number, fn: () => void) => T.push(window.setTimeout(fn, ms));
    // 철문 전환 (D-184): 닫힌 사이에 장면을 세우고, 문이 열리는 박자에 맞춰 연출을 시작한다
    void shutter(() => {
      document.body.appendChild(el);
      el.classList.add('run');
      at(330, () => {
        const r = el.querySelector('.enc-piece')!.getBoundingClientRect();
        sparksAt(r.left + r.width / 2, r.bottom - 6, boss ? 14 : 8, boss ? 70 : 44);
        shake(el, boss ? 3 : 2);
        sfx(boss ? 'threat' : 'land');
      });
      at(560, () => sfx('stamp'));
      at(720, () => void typeIn(el.querySelector<HTMLElement>('.sf-narr')!, narr, 20));
    });
    let done = false;
    const close = () => {
      if (done) return;
      done = true;
      T.forEach(clearTimeout);
      // 닫힌 사이에 다음 화면을 세운다 (resolve → 부른 쪽이 곧바로 판 · 화면을 만든다)
      void shutter(() => {
        el.remove();
        // 입력 위생 (페르소나 테스트 m4): 전환 화면을 넘긴 탭이 곧바로 다음 화면의 물건을 고르지 않게 잠깐 막는다
        gateUntil = performance.now() + 350;
        resolve();
        return new Promise((r) => window.setTimeout(r, 80));
      });
    };
    window.setTimeout(() => el.addEventListener('click', close), 1000);
    window.setTimeout(close, boss ? 4400 : 3600);
  });
const stageIntro = (def: BattleDef): Promise<void> => {
  const [label, name] = def.title.split(' — ');
  const foe: PieceType = def.boss ? 'K' : def.enemy.find((t) => t !== 'K' && t !== 'P') ?? 'K';
  // 적 구성: 같은 유형은 묶어 ×n
  const counts = new Map<PieceType, number>();
  for (const t of def.enemy) counts.set(t, (counts.get(t) ?? 0) + 1);
  const roster = [...counts].map(([t, n], i) => `<b style="animation-delay:${900 + i * 90}ms">${pieceImg(t, 1, 'small', 28)}${n > 1 ? `<small>×${n}</small>` : ''}</b>`).join('');
  // 반장 초상 (B-01~03, 실제 유닛 = 검은 킹): 그림이 있으면 그것, 없으면 큰 도트 (img onerror가 도트로 되돌린다)
  const art = def.boss ? `<img class="enc-portrait" src="scenes/${BOSS_ART[def.bossRule ?? 'plate']}.png" alt="" onerror="this.outerHTML=this.dataset.fb" data-fb='${pieceImg(foe, 1, 'large', 220).replace(/'/g, '&#39;')}'>` : pieceImg(foe, 1, 'large', 220);
  return sceneIntro(label, name, def.narr, art, def.boss, roster);
};
/** 반장 규칙 → 초상 그림 파일 (public/scenes/) */
const BOSS_ART: Record<string, string> = { plate: 'boss-plate', spawn: 'boss-assembly', thorns: 'boss-thorns' };

/**
 * 장소 배경 (D-200): 판 사이 화면 뒤에 화면 전체 그림을 깐다 (받은 그림이 없으면 아무것도 안 깔린다).
 * reward = 정비 라인 BG-04 · end-fail / end-clear = 출하 끝 E-02 / E-01. null이면 걷는다.
 */
const placeBg = (name: string | null): void => {
  document.body.classList.toggle('placebg', !!name);
  if (name) {
    document.body.style.setProperty('--place', `url(${new URL(`scenes/${name}.png`, location.href).href})`);
    document.body.dataset.place = name;
  } else delete document.body.dataset.place;
};

/** 전환 화면 직후 이 시각까지 창 안 탭을 버린다 */
let gateUntil = 0;
document.addEventListener(
  'click',
  (e) => {
    if (performance.now() < gateUntil && (e.target as HTMLElement).closest?.('#overlay, .mapfx')) {
      e.stopPropagation();
      e.preventDefault();
    }
  },
  true,
);

/** 승패 띠 (대국이 끝난 순간 화면을 가로지른다) */
const banner = (text: string, good: boolean): Promise<void> => koBanner(text, good);

/**
 * 고르기 확인 (D-165): 첫 탭 = 고른다(들어 올리고 나머지는 어두워짐 + 아래 확인 띠), 같은 것을 다시 누르거나 「고르기」 = 확정.
 * 다른 것을 누르면 그쪽으로 바뀐다. 모든 보상 · 부품 · 영입 · 정비 · 건너뛰기가 이 두 단계를 지난다.
 */
const choose = (btn: HTMLElement, label: string, onConfirm: () => void): void => {
  const panel = $('overlay-panel');
  window.clearTimeout(quickTimer);
  if (btn.classList.contains('chosen')) return void confirmChoice(btn, onConfirm);
  // 한 번 탭 (D-198, 사용자 승인): 보상 · 영입 · 부품처럼 물릴 일이 적은 선택은 바로 고르고 잠깐 「되돌리기」만 남긴다.
  // 나사를 쓰는 고물상 구매 · 카드 빼기 · 다듬기는 지금처럼 두 단계
  const quick = !btn.matches('[data-buy]') && !/뺀다|다듬는다/.test(label);
  panel.querySelectorAll('.chosen').forEach((x) => x.classList.remove('chosen'));
  panel.classList.add('choosing');
  btn.classList.add('chosen');
  sfx('lift');
  let bar = panel.querySelector<HTMLElement>('.confirm-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.className = 'confirm-bar';
    panel.appendChild(bar);
  }
  bar.classList.toggle('quick', quick);
  bar.innerHTML = quick
    ? `<span>‘${label}’</span><i class="cb-fill" style="--ms:${QUICK_MS}ms"></i><button class="btn" type="button" data-unchoose>되돌리기</button>`
    : `<span>‘${label}’</span><button class="btn" type="button" data-unchoose>다시 보기</button><button class="btn brass" type="button" data-confirm>고르기</button>`;
  // 확인 띠가 고른 것을 가리지 않게 (페르소나 테스트 m2)
  btn.scrollIntoView({ block: 'nearest' });
  bar.querySelector('[data-unchoose]')!.addEventListener('click', () => {
    window.clearTimeout(quickTimer);
    btn.classList.remove('chosen');
    panel.classList.remove('choosing');
    bar!.remove();
  });
  bar.querySelector('[data-confirm]')?.addEventListener('click', () => confirmChoice(btn, onConfirm));
  if (quick) quickTimer = window.setTimeout(() => btn.isConnected && btn.classList.contains('chosen') && confirmChoice(btn, onConfirm), QUICK_MS);
};
/** 한 번 탭 고르기: 이 시간 안에 「되돌리기」를 누르지 않으면 확정 */
const QUICK_MS = 1100;
let quickTimer: number | undefined;
const confirmChoice = (btn: HTMLElement, onConfirm: () => void): void => {
  const panel = $('overlay-panel');
  if (panel.classList.contains('locked')) return;
  panel.classList.add('locked');
  btn.classList.add('picked');
  sfx('rare');
  // D-184: 안 고른 것은 아래부터 도트로 흩어지고, 고른 카드 · 부품은 기울며 들렸다가 덱 · 부품 칸으로 빨려 든다
  const group = btn.parentElement ? [...btn.parentElement.children].filter((x): x is HTMLElement => x !== btn && x instanceof HTMLElement && (x.matches('.cmd, .part-card'))) : [];
  // 고물상은 하나를 사도 나머지 물건이 그대로 남는다 — 흩어지게 하지 않는다
  if (!btn.matches('[data-buy]')) group.forEach((x) => dissolveUp(x));
  // 덱 · 부품 칸으로 날아가는 것은 실제로 손에 들어오는 카드 · 부품뿐 (정비 · 수리 · 카드 빼기 같은 일은 제자리에서 연출)
  const isPart = btn.matches('[data-part], [data-buy^="part:"]');
  const isCard = isPart || btn.matches('.cmd');
  const target = isPart ? $('parts') : document.querySelector('[data-deck]');
  if (isCard && target) void flyTo(btn, target);
  window.setTimeout(() => {
    panel.classList.remove('locked', 'choosing');
    onConfirm();
  }, isCard ? 640 : 450);
};

const openOverlay = (html: string): HTMLElement => {
  const panel = $('overlay-panel');
  panel.innerHTML = html;
  const wasHidden = $('overlay').hidden || panel.classList.contains('m3out');
  $('overlay').hidden = false;
  // 떨어져 박혀 출렁 · 리벳 (D-189) — 이미 열린 창의 내용만 바뀔 때는 그대로
  if (wasHidden) modalIn($('overlay'), panel);
  // 도장은 내리꽂혀 잉크가 튄다
  panel.querySelectorAll<HTMLElement>('.stamp-big').forEach(stampFx);
  return panel;
};
/** 창 닫기: 가로로 접혀 사라진다 (D-189). 접히는 사이 다시 열리면 취소된다 */
const closeOverlay = (): void => {
  if ($('overlay').hidden) return;
  modalOut($('overlay'), $('overlay-panel'), () => ($('overlay').hidden = true));
};

const finish = (): void => {
  const isWin = b.s.winner === 0;
  if (isWin && coachOn) {
    coachOn = false;
    writeMeta(store, { ...readMeta(store), onboarded: true });
  }
  document.querySelector('.coach-line')?.remove();
  if (labMode) return labEnd(isWin);
  window.setTimeout(async () => {
    await banner(isWin ? (cur.boss ? '반장 격파' : '적 킹 격파') : '킹 파괴', isWin);
    // 처치 장면이 다 끝난 뒤에 보상창 (페르소나 테스트 M4: 킹 분해 연출을 창이 1~2초 만에 덮었다)
    if (isWin && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) await new Promise((r) => window.setTimeout(r, cur.boss ? 900 : 600));
    if (!isWin) {
      lossesHere += 1;
      if (betNow) gold = Math.max(0, gold - betNow.stake);
      // 아까운 패배 (D-178): 적 킹이 거의 다 깎였으면 「한 수였습니다」 — 가까웠던 만큼 다시 누르게
      const ek = b.s.pieces.find((p) => p.side === 1 && p.type === 'K');
      const near = ek && ek.hp <= ek.maxHp * DIRECTOR.nearMiss ? `<p class="near">적 킹 HP ${ek.hp} 남았습니다. 한 수였습니다.</p>` : '';
      const el = openOverlay(`<div class="stamp-big bad">불량 폐기</div><p>킹이 쓰러졌습니다. ${cur.title}부터 다시 할 수 있습니다.</p>${near}<div class="row"><button class="btn" type="button" data-quit>출하 종료</button><button class="btn brass" type="button" data-again>다시 하기</button></div>`);
      el.querySelector('[data-again]')!.addEventListener('click', () => startBattle(cur));
      el.querySelector('[data-quit]')!.addEventListener('click', () => runEnd(false));
      return;
    }
    // 판 사이 (페르소나 테스트 M7): 보상 · 지도 · 장소 화면 뒤로 끝난 대국의 손패 · 숫자가 비치지 않게 판을 내린다
    document.body.classList.add('between');
    placeBg('bg-reward');
    // 판돈 정산 · 원수 처치 · 새 원수 · 사선 보상 (D-178)
    const notes: string[] = [];
    if (betNow) {
      const d = settleBet(betNow.kind, betNow.stake, { won: true, turns: b.turn, fell: b.falls.length });
      gold = Math.max(0, gold + d);
      notes.push(d > 0 ? `판돈 적중 — 나사 +${d}` : `판돈을 잃었다 — 나사 ${d}`);
    }
    if (nemesisNow && b.nemesisId !== undefined && !b.s.pieces.some((p) => p.id === b.nemesisId)) {
      const n = nemesisNow;
      gold += dir.bounty(asc);
      setNemeses(nemeses().filter((x) => x.name !== n.name));
      notes.push(`원수 「${n.name}」 처치 — 현상금 나사 +${dir.bounty(asc)}`);
      if (asc <= DIRECTOR.heirloomUpTo && n.heir && !squad.some((u) => u.serial && u.serial === n.heir!.serial)) {
        squad.push({ t: n.heir.t, name: n.heir.name, serial: n.heir.serial, kills: 0, battles: 0, scars: ['원수의 손에서 돌아옴'] });
        notes.push(`${josa(n.heir.name, '이')} 돌아왔다.`);
      }
    }
    const kingNow = b.s.pieces.find((p) => p.side === 0 && p.type === 'K');
    const kingMax = kingNow?.maxHp ?? 1;
    closeTier = 0;
    if (isCloseCall({ kingHp: kingNow?.hp ?? 0, kingMax, fell: b.falls.length, clutched: clutchedNow }) && !closeActs.includes(actI) && dir.closeCall(asc) > 0) {
      closeActs.push(actI);
      closeTier = dir.closeCall(asc);
      if (closeTier === 1) gold += DIRECTOR.closeCallGold;
      notes.unshift(`사선을 넘었다 — ${closeTier === 3 ? '부품 하나 더' : closeTier === 2 ? '카드 넷 중 고르기' : `나사 +${DIRECTOR.closeCallGold}`}`);
    }
    if (notes.length) window.setTimeout(() => toast(notes.join(' · '), 3600), 300);
    // 넘친 피해 10마다 나사 1 (오버킬 — 큰 숫자를 만들 이유, D-145)
    const overGold = Math.floor(b.overkill / 10);
    const earned = (b.coins * SLICE.coinValue + overGold) * (parts.includes('greed') ? PART_NUM.greedGold : 1);
    gold += earned;
    // 나사 받기 (D-184): 판 가운데서 도트 나사가 튀어 올라 나사 칸으로 빨려 든다
    { const r = $('board').getBoundingClientRect(); screwBurst({ x: r.left + r.width / 2, y: r.top + r.height / 2 }, $('coins'), Math.round(earned / 6)); }
    const before = squad;
    const survived = squadAfter(b, squad);
    const fallenList = fallenAfter(b, before);
    const fallen: Crew[] = fallenList.map((f) => f.crew);
    // 원수가 생긴다: 내 분대원을 쓰러뜨린 적 (킹 · 입문 판 제외)
    for (const { crew, fall } of fallenList) if (crew.t !== 'K' && fall.byType && fall.byType !== 'K' && !INTRO.includes(cur)) setNemeses(addNemesis(nemeses(), fall.byType, { t: crew.t, name: crew.name ?? PIECE_NAMES_KO[crew.t], serial: crew.serial }, R.int(1000)));
    // 폐기 원부: 영구 기록 (D-153)
    writeLedger(fallenList.map(({ crew, fall }) => ({ serial: crew.serial ?? '', name: crew.name ?? '', t: crew.t, quirk: crew.quirk, kills: crew.kills ?? 0, battles: crew.battles ?? 0, nick: crew.nick, cause: `${cur.title} ${fall.turn}턴 · ${fall.by}`, run: runId })));
    // 판 사이 기본 회복: 남은 분대 최대 HP의 30%
    squad = restSquad(survived, restHeal());
    // 유품 태엽: 고르게 하지 않는다 — 자동으로 나사가 되고 한 줄만 (D-155, 관리 피로 제로)
    const heirs = fallen.filter((c) => c.t !== 'K');
    const after: string[] = [];
    if (heirs.length) {
      gold += heirs.length * CREW.heirloomScrews;
      after.push(`유품 태엽 처분 (${heirs.map((c) => c.name).join(' · ')}) — 나사 +${heirs.length * CREW.heirloomScrews}`);
    }
    // 승격 도장 (D-198): 승격은 이 대국에서만 — 대신 나사로 보답한다
    const promo = promotedIn(b, before);
    if (promo) {
      gold += promo * SLICE.promoteBonus;
      after.push(`승격 도장 — 나사 +${promo * SLICE.promoteBonus} (승격은 이 대국에서만)`);
    }
    // 보충병 (D-198): 다 잃고 겨우 이겼어도 다음 판을 설 수 있게
    const men = squad.filter((u) => u.t !== 'K').length;
    if (!labMode && men < SLICE.reinforceMin) {
      const n = SLICE.reinforceMin - men;
      for (let k = 0; k < n; k++) squad.push({ ...makeCrew('P', R, squad.map((u) => u.name ?? '')), scars: ['보충병'] });
      const pawnCards = deck.filter((id) => COMMANDS[id].who === 'P').length;
      if (pawnCards < SLICE.reinforceCards) for (let k = pawnCards; k < SLICE.reinforceCards; k++) deck.push('advance');
      after.push(`보충병 폰 ${n}기가 분대에 들어옵니다.`);
    }
    if (after.length) window.setTimeout(() => toast(after.join(' · '), 3600), notes.length ? 3900 : 400);
    rewardFlow(earned, overGold, fallen);
  }, 700);
};

/** 보상 흐름 (유품 다음) */
const rewardFlow = (earned: number, overGold: number, fallen: Crew[], partDone = false): void => {
  {
    won += 1;
    const reward = cur.reward;
    const head = `<h2><span class="pass-tag">통과</span> ${cur.title} <span class="dim">— 나사 +${earned}${overGold ? ` (넘친 피해 +${overGold})` : ''}</span></h2>`;
    if (reward === 'recruit') return recruitPick(head, () => advance());
    if (reward === 'kit') return kitPick(head, () => advance());
    // 검문: 부품을 고른 뒤 카드 보상으로 (partDone — 다시 부품 화면으로 돌지 않게)
    // 사선 보상 3등급: 부품 하나 더 (검문 부품과 겹치지 않게 먼저)
    if (closeTier === 3 && !partDone) {
      closeTier = 0;
      return partPick(`<div class="stamp-big good">사선을 넘었다</div><h2>부품 하나 더</h2><p>겨우 넘은 대국입니다. 부품을 하나 고릅니다.</p>`, () => { won -= 1; rewardFlow(earned, overGold, fallen, reward !== 'part'); });
    }
    if (reward === 'part' && !partDone) return partPick(`<div class="stamp-big good">${cur.boss ? '반장 격파' : '검문 통과'}</div><h2>부품 상자 — 나사 +${earned}</h2><p>부품을 하나 고릅니다. 장착하면 규칙이 바뀝니다.</p>`, () => rewardFlow(earned, overGold, fallen, true));
    if (reward === 'end') return runEnd(true);
    const rng = sub();
    // 축이 고루 나오게: 서로 다른 축 셋 (가진 부품의 축이 있으면 하나는 그 축)
    const axes: Axis[] = ['cav', 'inf', 'king', 'chain', 'push'];
    const mine = parts.map((id) => SLICE_PARTS[id].axis).filter((a): a is Axis => !!a);
    const picks: Axis[] = mine.length ? [mine[rng.int(mine.length)]] : [];
    while (picks.length < 3) {
      const a = axes[rng.int(axes.length)];
      if (!picks.includes(a)) picks.push(a);
    }
    // 같은 카드가 두 번 나오지 않게 (브릿지 카드는 두 축에 걸친다)
    const offers: CommandId[] = [];
    // 축에 쓸 수 있는 카드가 없으면 다른 축에서 채운다 (3장 유지)
    for (const a of [...picks, ...axes.filter((x) => !picks.includes(x))]) {
      if (offers.length >= (closeTier === 2 ? 4 : 3)) break;
      const pool = REWARD_COMMANDS.filter((id) => (COMMANDS[id].axis === a || COMMANDS[id].axis2 === a) && !offers.includes(id) && usable(id));
      if (pool.length) offers.push(pool[rng.int(pool.length)]);
    }
    /** 보상 화면 (카드 빼기를 그만두면 다시 연다) */
    const showReward = (): void => {
      const el = openOverlay(`
        <h2><span class="pass-tag">통과</span> ${cur.title} <span class="dim">— 나사 +${earned}</span></h2>
        <p>명령 카드 하나를 덱에 넣거나, 아래 셋 중 하나를 고릅니다.</p>
        <div class="reward-cards">${offers
          .map((id) => {
            const c = COMMANDS[id];
            const who = cardArt(id);
            return `<button type="button" class="cmd big t-${c.who}" data-pick="${id}">${keysHtml(c.cost)}${who}<span class="txt"><b>${c.name}${axisTag(c.axis)}${axisTag(c.axis2)}</b>${c.desc ? `<small>${c.desc}</small>` : ''}${c.flavor ? `<i class="flv">${c.flavor}</i>` : ''}</span></button>`;
          })
          .join('')}</div>
        <p class="rest-line">정비 완료 — 남은 분대 HP +${Math.round(REST.heal * 100)}%: ${squad.map((u) => `${u.name ?? PIECE_NAMES_KO[u.t]} ${u.hp}`).join(' · ')}${fallen.length ? ` · <span class="bad">쓰러짐: ${fallen.map((u) => u.name).join(' · ')}</span>` : ''}</p>
        <div class="row">
          <button class="btn" type="button" data-skip>건너뛰기</button>
          <button class="btn" type="button" data-remove>카드 빼기</button>
          <button class="btn cyan" type="button" data-overhaul>정비 — ${fallen.length ? `쓰러진 ${josa([...fallen].sort((a, c) => (COST_ORDER[c.t] ?? 0) - (COST_ORDER[a.t] ?? 0))[0].name, '을')} HP 50%로 되살리고 ` : ''}모두 HP +${Math.round(REST.overhaul * 100)}%</button>
        </div>`);
      el.querySelectorAll<HTMLElement>('[data-pick]').forEach((btn) =>
        btn.addEventListener('click', () =>
          choose(btn, `${josa(COMMANDS[btn.dataset.pick as CommandId].name, '을')} 덱에 넣는다`, () => {
            deck.push(btn.dataset.pick as CommandId);
            advance();
          }),
        ),
      );
      const skipBtn = el.querySelector<HTMLElement>('[data-skip]')!;
      skipBtn.addEventListener('click', () => choose(skipBtn, '아무것도 받지 않는다', () => advance()));
      // 카드 빼기: 한 장 빼면 다음 판, 그만두면 보상 화면으로 돌아온다
      el.querySelector('[data-remove]')!.addEventListener('click', () =>
        deckView('remove', (removed) => (removed ? advance() : showReward())),
      );
      const ohBtn = el.querySelector<HTMLElement>('[data-overhaul]')!;
      ohBtn.addEventListener('click', () =>
        choose(ohBtn, '카드 대신 분대를 정비한다', () => {
          const o = overhaulSquad(squad, fallen);
          squad = o.squad;
          sfx('awaken');
          toast(o.revived ? `${josa(o.revived.name, '이')} 복귀했습니다.` : `분대 전원 HP +${Math.round(REST.overhaul * 100)}%`);
          window.setTimeout(() => advance(), 500);
        }),
      );
    };
    showReward();
  }
};

/**
 * 덱 보기 (view) · 카드 빼기 (remove — 보상 대신, 덱 압축: 쓸모없는 카드를 덜어 빌드를 선명하게).
 * 같은 카드는 한 칸에 ×개수로 묶고, 축 순서로 늘어놓는다.
 */
const deckView = (mode: 'view' | 'remove', then?: (removed: boolean) => void): void => {
  const order: (Axis | undefined)[] = [undefined, 'cav', 'inf', 'king', 'chain', 'push'];
  const counts = new Map<CommandId, number>();
  for (const id of deck) counts.set(id, (counts.get(id) ?? 0) + 1);
  const ids = [...counts.keys()].sort((x, y) => order.indexOf(COMMANDS[x].axis) - order.indexOf(COMMANDS[y].axis) || COMMANDS[x].cost - COMMANDS[y].cost);
  const cards = ids
    .map((id) => {
      const c = COMMANDS[id];
      return `<button type="button" class="cmd deckcard t-${c.who}" data-rm="${id}" ${mode === 'view' ? 'tabindex="-1"' : ''}>${keysHtml(c.cost)}${cardArt(id)}<span class="txt"><b>${c.name}<span class="chips">${axisChip(c.axis)}${axisChip(c.axis2)}</span></b>${c.desc ? `<small>${c.desc}</small>` : ''}${c.flavor ? `<i class="flv">${c.flavor}</i>` : ''}</span><span class="cnt">×${counts.get(id)}</span>${usable(id) ? '' : '<em class="shelved">기물 없음 — 보관 중</em>'}</button>`;
    })
    .join('');
  const head = mode === 'view' ? `<h2>덱 ${deck.length}장</h2>` : `<h2>카드 빼기 — 한 장</h2><p>덱에서 카드 한 장을 영구히 뺍니다.</p>`;
  const el = openOverlay(`${head}<div class="deck-grid${mode === 'remove' ? ' removing' : ''}">${cards}</div><div class="row">${mode === 'view' ? '<button class="btn brass" type="button" data-close-deck>닫기</button>' : '<button class="btn" type="button" data-cancel>그만두기</button>'}</div>`);
  if (mode === 'view') {
    el.querySelector('[data-close-deck]')!.addEventListener('click', closeOverlay);
    return;
  }
  el.querySelector('[data-cancel]')!.addEventListener('click', () => then?.(false));
  el.querySelectorAll<HTMLElement>('[data-rm]').forEach((btn) =>
    btn.addEventListener('click', () =>
      choose(btn, `${COMMANDS[btn.dataset.rm as CommandId].name} 한 장을 영구히 뺀다`, () => {
        const id = btn.dataset.rm as CommandId;
        deck.splice(deck.indexOf(id), 1);
        sfx('stamp');
        toast(`${COMMANDS[id].name} 한 장을 뺐습니다.`);
        then?.(true);
      }),
    ),
  );
};

// ---------- 애착 (D-153) ----------
let runId = new Date().toISOString().slice(0, 16).replace('T', ' ');
const LEDGER_KEY = 'pawnisher.slice.ledger';
const readLedger = (): LedgerEntry[] => {
  try {
    return JSON.parse(localStorage.getItem(LEDGER_KEY) ?? '[]') as LedgerEntry[];
  } catch {
    return memLedger;
  }
};
let memLedger: LedgerEntry[] = [];
const writeLedger = (add: LedgerEntry[]): void => {
  if (!add.length) return;
  memLedger = [...add, ...readLedger()].slice(0, 200);
  try {
    localStorage.setItem(LEDGER_KEY, JSON.stringify(memLedger));
  } catch {
    /* 저장 못 해도 이번 출하 동안은 기억한다 */
  }
};

/** 사망 의식 (1.2초, 조작을 막지 않는 겉막 — 레퍼런스 6권 원리 7 · 부록 B): 화면이 가라앉고 마지막 말 한 줄 */
let ritesDone = 0;
const deathRites = async (): Promise<void> => {
  const fresh = b.falls.slice(ritesDone);
  ritesDone = b.falls.length;
  for (const f of fresh) {
    const c = squad[b.squadIds.indexOf(f.pieceId)];
    if (!c) continue;
    const fx = document.createElement('div');
    fx.className = 'deathfx dc3';
    // 킹(대장)은 「대장, 먼저 갑니다」를 말하지 않는다 (페르소나 테스트 c4) — 대장을 부르는 대사는 분대원에게만
    const pool = c.t === 'K' ? DEATHS.filter((x) => !x.line.includes('대장')) : DEATHS;
    const d = pool[((c.serial ?? '').charCodeAt(3) + (c.kills ?? 0) + f.turn) % pool.length];
    // 2인칭 서술 → 이름 → 각주 대사 → 시스템 한 줄 (D-158). D-189: 검은 막이 한 줄씩 계단으로 내려오고 서술이 한 자씩 찍힌다
    fx.innerHTML = `<div><p class="narr"></p><b>${crewLabel(c)}</b><i>${d.line}</i><small>${c.serial} · ${f.by}에게 파괴되었습니다.</small></div>`;
    curtainRows(fx);
    document.body.appendChild(fx);
    sfx('loss');
    // 빠르게 (D-191): 막 0.2초 → 서술 한 자 14ms → 이름 · 대사 · 시스템 줄 60ms 간격 → 0.45초 머묾 (약 1.2초)
    await new Promise((r) => window.setTimeout(r, 200));
    await typeIn(fx.querySelector<HTMLElement>('.narr')!, d.narr, 14);
    for (const x of fx.querySelectorAll('div > :not(.narr)')) {
      x.classList.add('in');
      await new Promise((r) => window.setTimeout(r, 60));
    }
    await new Promise((r) => window.setTimeout(r, 450));
    fx.classList.add('out');
    pxOut(fx.querySelector<HTMLElement>(':scope > div'), undefined, 200);
    window.setTimeout(() => fx.remove(), 330);
  }
};

/** 분대 보기: 이름 · 시리얼 · 기벽 · 처치 · 흉터 · 이름 바꾸기 · 폐기 원부 */
const crewView = (): void => {
  const el = openOverlay(`<h2>분대 ${squad.length}</h2><div class="crew-list">${squad
    .map((u, k) => {
      const q = u.quirk ? QUIRKS[u.quirk] : null;
      return `<div class="crew-row">${pieceImg(u.t, 0, 'small', 26)}<div><b>${crewLabel(u)}</b> <span class="dim">${u.serial} · HP ${u.hp ?? crewMaxHp(u)}/${crewMaxHp(u)} · 처치 ${u.kills ?? 0}</span>${q ? `<br><span class="quirk">${q.name}</span> <small>${q.desc}</small>` : ''}${u.scars?.length ? ` <small class="scar">· ${u.scars.join(' · ')}</small>` : ''}</div>${u.t !== 'K' ? `<button class="btn sm" type="button" data-rename="${k}">이름</button>` : '<span></span>'}</div>`;
    })
    .join('')}</div><div class="row"><button class="btn" type="button" data-ledger>폐기 원부 ${readLedger().length}</button><button class="btn brass" type="button" data-close-crew>닫기</button></div>`);
  el.querySelector('[data-close-crew]')!.addEventListener('click', closeOverlay);
  el.querySelector('[data-ledger]')!.addEventListener('click', () => ledgerView());
  el.querySelectorAll<HTMLElement>('[data-rename]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const k = Number(btn.dataset.rename);
      const box = btn.parentElement!;
      box.insertAdjacentHTML('beforeend', `<form class="rename"><input maxlength="8" value="${squad[k].name ?? ''}" aria-label="새 이름"><button class="btn sm brass" type="submit">새기기</button></form>`);
      btn.remove();
      const form = box.querySelector('form')!;
      const input = form.querySelector('input')!;
      input.focus();
      input.select();
      form.addEventListener('submit', (ev) => {
        ev.preventDefault();
        const name = input.value.trim().slice(0, 8);
        if (name) squad[k] = { ...squad[k], name };
        sfx('stamp');
        crewView();
      });
    }),
  );
};

/** 폐기 원부: 쓰러진 분대원의 영구 기록 */
const ledgerView = (back: () => void = crewView): void => {
  const rows = readLedger();
  const el = openOverlay(`<h2>폐기 원부</h2><p>쓰러진 분대원의 기록입니다. 지워지지 않습니다.</p><div class="ledger">${
    rows.length
      ? rows.map((r) => `<div class="ledger-row">${pieceImg(r.t, 0, 'small', 22)} <b>${r.name}${r.nick ? ` 「${r.nick}」` : ''}</b> <span class="dim">${r.serial}</span> · 처치 ${r.kills} · 대국 ${r.battles}<br><small>${r.cause} · ${r.run}</small></div>`).join('')
      : '<p class="dim">아직 기록이 없습니다.</p>'
  }</div><div class="row"><button class="btn brass" type="button" data-back>${back === crewView ? '분대로' : '닫기'}</button></div>`);
  el.querySelector('[data-back]')!.addEventListener('click', () => back());
};

/** 영입 (입문 뒤): 기물 셋 중 하나 — 그 기물의 카드가 같이 들어온다 */
const recruitPick = (head: string, then: () => void): void => {
  const rng = sub();
  const pool = [...RECRUITS];
  const offers: typeof RECRUITS = [];
  while (offers.length < 3 && pool.length) offers.push(pool.splice(rng.int(pool.length), 1)[0]);
  // 셋이 서로 다른 이름 · 기벽
  const crews: Crew[] = [];
  for (const r of offers) crews.push(makeCrew(r.t, R, [...squad, ...crews].map((u) => u.name ?? ''), crews.map((u) => u.quirk!).filter(Boolean)));
  const el = openOverlay(`${head}<p>분대에 넣을 기물을 하나 고릅니다.</p><div class="part-cards">${offers
    .map((r, k) => {
      const c = crews[k];
      const q = c.quirk ? QUIRKS[c.quirk] : null;
      return `<button type="button" class="part-card recruit" data-rec="${k}"><span class="rec-art">${pieceImg(r.t, 0, 'large', 56)}</span><b>${c.name}</b>${q ? `<small class="quirk-line"><b>${q.name}</b><br>${q.desc}</small>` : ''}<span class="kit-cards">+ ${r.cards.map((id) => COMMANDS[id].name).join(' · ')}</span></button>`;
    })
    .join('')}</div>`);
  el.querySelectorAll<HTMLElement>('[data-rec]').forEach((btn) =>
    btn.addEventListener('click', () =>
      choose(btn, `${josa(crews[Number(btn.dataset.rec)].name, '을')} 분대에 넣는다`, () => {
        const r = offers[Number(btn.dataset.rec)];
        squad.push(crews[Number(btn.dataset.rec)]);
        deck.push(...r.cards);
        toast(`${josa(crews[Number(btn.dataset.rec)].name, '이')} 분대에 합류했습니다.`);
        then();
      }),
    ),
  );
};

/** 부품 상자 (1판 뒤 — 첫 사기 조합 확정): 부품 + 맞물리는 카드 둘, 셋 중 하나 */
const kitPick = (head: string, then: () => void): void => {
  const rng = sub();
  const pool = KITS.filter((k) => !parts.includes(k.part) && (!k.needs || squad.some((u) => u.t === k.needs)) && k.cards.every(usable));
  const offers: typeof KITS = [];
  while (offers.length < 3 && pool.length) offers.push(pool.splice(rng.int(pool.length), 1)[0]);
  const el = openOverlay(`${head}<p>부품 하나와 맞물리는 카드 두 장이 함께 들어옵니다. 하나를 고릅니다.</p><div class="part-cards">${offers
    .map((k, n) => {
      const d = SLICE_PARTS[k.part];
      return `<button type="button" class="part-card${d.axis ? ` ax-${d.axis}` : ''}" data-kit="${n}"><i class="ico" style="${iconArt(d.icon)}"></i><b>${d.name}${axisTag(d.axis ?? undefined)}</b><small>${d.desc}</small><span class="kit-cards">+ ${k.cards.map((id) => COMMANDS[id].name).join(' · ')}</span></button>`;
    })
    .join('')}</div>`);
  el.querySelectorAll<HTMLElement>('[data-kit]').forEach((btn) =>
    btn.addEventListener('click', () =>
      choose(btn, `${josa(SLICE_PARTS[offers[Number(btn.dataset.kit)].part].name, '을')} 단다`, () => {
        const k = offers[Number(btn.dataset.kit)];
        parts.push(k.part);
        newParts.add(k.part);
        deck.push(...k.cards);
        then();
      }),
    ),
  );
};

/** 부품 고르기 (검문! 통과): 셋 중 하나 */
const partPick = (head: string, then: () => void): void => {
  const rng = sub();
  const pool = (Object.keys(SLICE_PARTS) as SlicePartId[]).filter((id) => !parts.includes(id) && partFits(id, squad.map((u) => u.t), parts));
  const offers: SlicePartId[] = [];
  while (offers.length < 3 && pool.length) offers.push(pool.splice(rng.int(pool.length), 1)[0]);
  const el = openOverlay(`${head}<div class="part-cards">${offers.map((id) => partHtml(id, true)).join('')}</div>`);
  el.querySelectorAll<HTMLElement>('[data-part]').forEach((btn) =>
    btn.addEventListener('click', () =>
      choose(btn, `${josa(SLICE_PARTS[btn.dataset.part as SlicePartId].name, '을')} 단다`, () => {
        parts.push(btn.dataset.part as SlicePartId);
        newParts.add(btn.dataset.part as SlicePartId);
        then();
      }),
    ),
  );
};

/** 규칙 (D-195): 글 벽 대신 안내서 다섯 쪽(그림 한 줄 + 두세 줄) — 처음 화면의 안내서와 같은 것 */
/**
 * ? 버튼 (D-198, 사용자 승인 5번): 안내서 다섯 쪽 대신 지금 화면 한 장 + 용어 사전. ✕ · Esc · 바깥 탭으로 닫힌다.
 * 반장 판이면 그 반장 규칙을 맨 위에. 「안내서 전체」로 예전 다섯 쪽.
 */
const help = (tab: 'now' | 'dict' = 'now'): void => {
  const boss = b.boss ? BOSS_RULES[b.bossRule] : null;
  const body =
    tab === 'now'
      ? `${boss ? `<p class="hp-boss"><b>${boss.name}</b> ${boss.lines.join(' · ')}</p>` : ''}<ul class="hp-list">${BATTLE_HELP.map((l) => `<li>${l}</li>`).join('')}</ul>`
      : `<dl class="hp-dict">${KEYWORDS.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;
  const el = openOverlay(`<div class="helpcard"><button class="btn sq gd-x" type="button" data-x aria-label="${OPENING_TEXT.close}">✕</button>
    <div class="hp-tabs"><button class="btn${tab === 'now' ? ' brass' : ''}" type="button" data-tab="now">${HUD_TEXT.helpTitle}</button><button class="btn${tab === 'dict' ? ' brass' : ''}" type="button" data-tab="dict">${HUD_TEXT.dictTitle}</button><button class="btn" type="button" data-full>${HUD_TEXT.fullGuide}</button></div>
    <div class="hp-body">${body}</div></div>`);
  const over = $('overlay');
  const done = (): void => {
    window.removeEventListener('keydown', onKey);
    over.removeEventListener('click', onOut);
  };
  const close = (): void => (done(), closeOverlay());
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') close();
  };
  const onOut = (e: MouseEvent): void => {
    if (e.target === over) close();
  };
  window.addEventListener('keydown', onKey);
  window.setTimeout(() => over.addEventListener('click', onOut), 0);
  el.querySelector('[data-x]')!.addEventListener('click', () => (sfx('tap'), close()));
  el.querySelectorAll<HTMLElement>('[data-tab]').forEach((t) => t.addEventListener('click', () => (sfx('tap'), done(), help(t.dataset.tab as 'now' | 'dict'))));
  el.querySelector('[data-full]')!.addEventListener('click', () => (done(), void guide(openOverlay).then(closeOverlay)));
};

// 길게 누르기(터치 0.35초) · 마우스 올리기 = 크게 보기. 길게 누른 뒤 손을 떼면 고르지 않는다
let pressTimer: number | undefined;
let peeked = false;
$('hand').addEventListener('pointerdown', (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-card]');
  if (!el || e.pointerType === 'mouse') return;
  peeked = false;
  window.clearTimeout(pressTimer);
  pressTimer = window.setTimeout(() => {
    peeked = true;
    showPeek(el);
  }, 350);
});
const endPress = () => {
  window.clearTimeout(pressTimer);
  if (peeked) window.setTimeout(hidePeek, 60);
};
$('hand').addEventListener('pointerup', endPress);
$('hand').addEventListener('pointercancel', endPress);
/** 방금 고른 카드는 마우스가 다른 카드로 옮겨 갈 때까지 크게 보이지 않는다 (페르소나 테스트 M3: 확대창이 판 왼쪽을 덮은 채 칸을 골라야 했다) */
let peekMute: string | null = null;
$('hand').addEventListener('pointerover', (e) => {
  if (e.pointerType !== 'mouse') return;
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-card]');
  if (!el || el.dataset.card === peekMute) return;
  peekMute = null;
  if (peekEl && peekEl.dataset.for === el.dataset.card) return;
  showPeek(el);
});
$('hand').addEventListener('pointerleave', hidePeek);
$('hand').addEventListener('contextmenu', (e) => e.preventDefault());
$('hand').addEventListener('click', (e) => {
  if (peeked) {
    peeked = false;
    return;
  }
  if ((e.target as HTMLElement).closest('[data-deck]')) return deckView('view');
  if ((e.target as HTMLElement).closest('[data-crew]')) return crewView();
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-card]');
  if (!el) return;
  peekMute = el.dataset.card ?? null;
  hidePeek();
  pickCard(Number(el.dataset.card));
});
$('btn-end').addEventListener('click', () => void onEnd());
$('parts').addEventListener('click', (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-part-info]');
  if (!el) return;
  const d = SLICE_PARTS[el.dataset.partInfo as SlicePartId];
  toast(`${d.name} — ${d.desc}`, 2400);
});
$('btn-rewind').addEventListener('click', () => {
  const r = rewind(b);
  if (typeof r === 'string') return toast(r);
  // 되감기 연출: 테이프가 거꾸로 감기며 화면이 청록으로 번지고, 판이 이번 턴 처음으로 돌아간다
  busy = true;
  refresh();
  const fx = document.createElement('div');
  fx.className = 'tapefx';
  fx.innerHTML = '<span>◀◀ 되감기</span>';
  if (parts.includes('tape')) flashParts(['tape']);
  document.body.appendChild(fx);
  [0, 90, 180, 270].forEach((ms, k) => window.setTimeout(() => sfx('tap', 8 - k * 2), ms));
  window.setTimeout(() => {
    b = r;
    turnDmg = 0;
    prevKills = b.kills;
    selCard = selPiece = null;
    busy = false;
    renderer.setup(b.s);
    refresh();
    sfx('awaken');
  }, 420);
  window.setTimeout(() => fx.remove(), 800);
});
$('btn-help').addEventListener('click', () => help());

// ---------- 근간 시험장 (D-177) ----------
/** 시험장 모드: A = 지금 규칙 + 처치 환급, B = 진짜 잡기 + 잡기 환급. 같은 판 · 같은 적 · 같은 덱 */
let labMode: 'A' | 'B' | null = null;
const labRounds = { A: 0, B: 0 };
const labScore = { A: { w: 0, l: 0, turns: 0 }, B: { w: 0, l: 0, turns: 0 } };
const LAB_TEXT: Record<'A' | 'B', { name: string; how: string[] }> = {
  A: { name: '시험장 A — 지금 규칙 + 처치 환급', how: ['내려앉은 자리에서 공격합니다 (지금과 같은 체력 · 피해).', '태엽은 2. 처치하면 태엽 +1 (턴당 3까지).', '적은 예고한 대로 둡니다.'] },
  B: { name: '시험장 B — 진짜 잡기', how: ['체력이 없습니다. 적이 선 칸에 들어가면 잡습니다.', '붉은 칸에 선 내 기물은 적이 잡을 수 있습니다.', '태엽은 2. 잡으면 태엽 +1 (턴당 3까지). 적은 늘 지금 판을 보고 둡니다.'] },
};

/** 시험장 대국 시작 (같은 규칙끼리는 판 순서가 같다 — A와 B를 같은 씨앗으로 비교) */
const startLab = (mode: 'A' | 'B'): void => {
  labMode = mode;
  labRounds[mode] += 1;
  squad = LAB.squad.map((t) => ({ t, name: PIECE_NAMES_KO[t] }));
  cur = { enemy: LAB.enemy, kingHp: LAB.kingHpA, title: LAB_TEXT[mode].name, narr: '', tell: '', reward: 'end' };
  stage += 1;
  b = newSliceBattle(squad, LAB.enemy, LAB.deck, 300 + labRounds[mode] * 31, { enemyKingHp: mode === 'A' ? LAB.kingHpA : undefined, lab: mode });
  selCard = selPiece = null;
  busy = false;
  turnDmg = 0;
  prevKills = 0;
  ritesDone = 0;
  $('hand').classList.remove('dealing');
  closeOverlay();
  renderer.setFoeTraits([]);
  renderer.setup(b.s);
  refresh();
  toast(mode === 'A' ? '처치하면 태엽 +1 — 턴은 벌어서 늘린다.' : '적 칸에 들어가면 잡는다. 붉은 칸에 남은 기물은 잡힌다.', 3600);
};

/** 시험장 고르기 화면 */
const labPick = (): void => {
  const card = (m: 'A' | 'B') => `<button type="button" class="lab-card" data-lab="${m}"><b>${LAB_TEXT[m].name}</b><ul>${LAB_TEXT[m].how.map((h) => `<li>${h}</li>`).join('')}</ul><small>이김 ${labScore[m].w} · 짐 ${labScore[m].l}</small></button>`;
  const el = openOverlay(`<h2>근간 시험장</h2><p>같은 판 · 같은 적 · 같은 덱입니다. 둘 다 해 보고 어느 쪽이 손에 붙는지 알려 주십시오.</p><div class="lab-row">${card('A')}${card('B')}</div><div class="row"><button class="btn" type="button" data-lab-back>처음 화면</button></div>`);
  el.querySelectorAll<HTMLElement>('[data-lab]').forEach((btn) => btn.addEventListener('click', () => startLab(btn.dataset.lab as 'A' | 'B')));
  el.querySelector('[data-lab-back]')!.addEventListener('click', () => (sessionStorage.setItem('op-menu', '1'), location.assign(location.pathname)));
};

/** 시험장 대국 끝 */
const labEnd = (isWin: boolean): void => {
  const m = labMode!;
  labScore[m][isWin ? 'w' : 'l'] += 1;
  labScore[m].turns += b.turn;
  window.setTimeout(async () => {
    await banner(isWin ? '적 킹 격파' : '킹 파괴', isWin);
    const el = openOverlay(`<h2>${LAB_TEXT[m].name}</h2><p>${isWin ? '이겼습니다' : '졌습니다'} · ${b.turn}턴 · 남은 내 기물 ${b.s.pieces.filter((p) => p.side === 0).length} / ${LAB.squad.length}</p><p class="dim">이 규칙 — 이김 ${labScore[m].w} · 짐 ${labScore[m].l}</p><div class="row"><button class="btn" type="button" data-lab-pick>고르기 화면</button><button class="btn brass" type="button" data-lab-again>한 판 더</button></div>`);
    el.querySelector('[data-lab-pick]')!.addEventListener('click', labPick);
    el.querySelector('[data-lab-again]')!.addEventListener('click', () => startLab(m));
  }, 700);
};

// ---------- 저장 · 승급 · 오늘의 출하 (R6, D-174) ----------
/** 대국 사이 회복 (승급 3부터 절반) */
const restHeal = (): number => REST.heal * (asc >= 3 ? ASC_NUM.restMul : 1);
/** 고물상 값 (승급 4부터 비싸다) */
const ascPrice = (n: number): number => (asc >= 4 ? Math.round(n * ASC_NUM.shopMul) : n);

/** 새 출하: 시드 · 승급 · 오늘의 출하. 분대 · 덱 · 부품 · 나사 · 지도를 처음으로 */
const newRun = (seed: number, level: number, day: string | null): void => {
  runSeed = seed;
  asc = level;
  daily = day;
  acts = buildRun(seed, level);
  R = new Rng(seed ^ 0x51c3);
  actI = 0;
  rowI = 0;
  won = 0;
  stage = 0;
  gold = 0;
  refined = [];
  parts = [];
  deck = [...START_DECK];
  picked = [[], [], []];
  eventBag = [...SLICE_EVENT_IDS];
  runId = `${new Date().toISOString().slice(0, 16).replace('T', ' ')}${day ? ' · 오늘의 출하' : ''}${level ? ` · 승급 ${level}` : ''}`;
  squad = [];
  for (const t of START_SQUAD) squad.push(makeCrew(t, R, squad.map((u) => u.name ?? '')));
  clutchLeft = dir.clutch(level);
  sacLeft = dir.sacrifice(level);
  closeActs = [];
  highlight = null;
  lossesHere = 0;
  lossDef = null;
};

/** 지금 출하를 저장한다 (지도에 설 때 · 대국을 시작할 때) */
const saveRun = (at: 'map' | 'battle', node?: number): void =>
  writeSave(store, { v: 1, seed: runSeed, asc, daily, runId, actI, rowI, picked, squad, deck, parts, gold, won, stage, refined, eventBag, rng: R.state, at, node, clutchLeft, sacLeft, closeActs, highlight });

/** 저장한 출하를 되살린다 */
const loadRun = (sv: RunSave): void => {
  runSeed = sv.seed;
  asc = sv.asc;
  daily = sv.daily;
  acts = buildRun(sv.seed, sv.asc);
  R = new Rng(sv.rng);
  ({ runId, actI, rowI, picked, squad, deck, parts, gold, won, stage, refined, eventBag } = sv);
  // 옛 저장 (D-183 전 — 다듬기가 카드 종류 전부였다): 그 종류를 모두 「+」로 옮겨 그 판은 그대로 이어 간다
  if (refined.length && !deck.some(isRefined)) deck = deck.map((id) => (refined.includes(id) ? refinedOf(baseOf(id)) : id));
  clutchLeft = sv.clutchLeft ?? dir.clutch(sv.asc);
  sacLeft = sv.sacLeft ?? dir.sacrifice(sv.asc);
  closeActs = sv.closeActs ?? [];
  highlight = sv.highlight ?? null;
};

/** 출하 결과 (끝까지 갔거나 그만뒀을 때): 분대 · 기록 · 다시. 저장을 지우고 기록을 남긴다 (승급이 열린다) */
const runEnd = (cleared: boolean): void => {
  clearSave(store);
  document.body.classList.add('between');
  placeBg(cleared ? 'end-clear' : 'end-fail');
  const m0 = readMeta(store);
  const m = recordRun(m0, { cleared, act: actI + 1, won, asc, daily });
  writeMeta(store, m);
  const unlocked = m.ascOpen > m0.ascOpen;
  const fallenNow = readLedger().filter((r) => r.run === runId);
  const kills = squad.reduce((n, u) => n + (u.kills ?? 0), 0) + fallenNow.reduce((n, r) => n + r.kills, 0);
  // 결과 (D-195 정리): 머리 한 줄 · 집계 넷 · 분대 칩 한 줄 · (있으면) 묘수 · 승급 열림. 긴 문장 나열 대신
  const chip = (name: string, t: PieceType, bad = false) => `<span class="re-chip${bad ? ' bad' : ''}">${pieceImg(t, 0, 'small', 18)}${name}</span>`;
  const el = openOverlay(`<h2><span class="pass-tag${cleared ? '' : ' bad'}">${cleared ? '출하 완료' : '출하 중단'}</span> ${cleared ? '출하구를 지났습니다.' : `${actI + 1}막에서 멈췄습니다.`}${daily || asc ? ` <span class="dim">${daily ? '오늘의 출하' : ''}${daily && asc ? ' · ' : ''}${asc ? `승급 ${asc}` : ''}</span>` : ''}</h2>
    <div class="tally"><div>이긴 대국 <b data-v="${won}">${won}</b></div><div>처치 <b data-v="${kills}">${kills}</b></div><div>나사 <b data-v="${gold}">${gold}</b></div><div>덱 <b data-v="${deck.length}">${deck.length}</b></div></div>
    <div class="re-row">${squad.map((u) => chip(u.name ?? PIECE_NAMES_KO[u.t], u.t)).join('')}${fallenNow.map((r) => chip(r.name, r.t, true)).join('')}</div>
    ${highlight ? `<p class="hl"><span class="pass-tag">묘수</span> ${highlight.where} ${highlight.turn}턴 — 처치 ${highlight.kills} · 피해 ${highlight.damage}</p>` : ''}
    ${unlocked ? `<p class="asc-open">승급 ${m.ascOpen} 「${ASCENSION[m.ascOpen - 1].name}」이 열렸습니다. (${ASCENSION[m.ascOpen - 1].desc})</p>` : ''}
    <div class="row"><button class="btn brass" type="button" data-restart>처음 화면</button></div>
    <p class="dim re-note">시험판입니다. 막힌 곳 · 좋았던 순간을 알려 주십시오.</p>`);
  el.querySelector('[data-restart]')!.addEventListener('click', () => (sessionStorage.setItem('op-menu', '1'), location.reload()));
  // 결과 집계 (D-189): 줄이 밀려 들어오고 숫자가 째깍 올라간 뒤 → 출하 도장
  tally(el.querySelector<HTMLElement>('.tally')!, el.querySelector<HTMLElement>('h2 .pass-tag'));
};

/** 첫 판으로 들어간다 (새 출하 · 오늘의 출하) */
const begin = (seed: number, level: number, day: string | null): void => {
  newRun(seed, level, day);
  saveRun('battle', 0);
  startBattle(INTRO[0], true);
  closeOverlay();
  sfx('submit');
  void stageIntro(INTRO[0]).then(() => {
    battleIntro();
    toast(INTRO[0].tell, 3200);
  });
};

/**
 * 메인 오프닝 화면 (D-192): 게임 판 위에 겹친 창이 아니라 화면 전체를 쓰는 장면.
 * 베인 타이틀 문장 + 「화면을 눌러 시작」 → 처음이면 프롤로그 → 안내서 → 첫 대국(도움말),
 * 프롤로그를 본 사람은 누르면 메뉴(이어하기 · 출하 · 오늘의 출하 · 시험장 · 원부 · 안내서 · 프롤로그).
 */
const opening = (): void => {
  document.querySelector('.opening')?.remove();
  const m0 = readMeta(store);
  const el = document.createElement('div');
  el.className = 'opening';
  el.innerHTML = `<div class="op-bg"><i class="op-fog"></i><i class="op-glow"></i></div><h1 class="sr-only">Pawnisher : Checkmate</h1>
    <div class="op-logo">${crestHtml()}<p class="op-tag">${OPENING_TEXT.tagline}</p></div>
    <p class="op-press">${OPENING_TEXT.press}</p><nav class="op-menu" hidden></nav>`;
  document.body.appendChild(el);
  void (async () => {
    const im = new Image();
    im.onload = () => el.querySelector<HTMLElement>('.op-bg')!.style.setProperty('--img', `url(${im.src})`);
    im.src = 'scenes/prologue-00.png';
  })();
  void titleFx(el.querySelector<HTMLElement>('.tfx'));
  let stage: 'press' | 'menu' = 'press';
  el.addEventListener('click', () => {
    if (stage !== 'press') return;
    stage = 'menu';
    sfx('submit');
    el.classList.add('busy');
    if (!m0.prologue) return void firstRun();
    openMenu();
  });
  /** 처음 온 사람: 프롤로그 → 안내서 → 첫 대국 (도움말 켜짐) */
  const firstRun = async (): Promise<void> => {
    await prologue();
    writeMeta(store, { ...readMeta(store), prologue: true });
    await guide(openOverlay, OPENING_TEXT.toBattle);
    closeOverlay();
    begin((Date.now() ^ 0x2f17) & 0xffffff, 0, null);
  };
  const openMenu = (): void => {
    el.classList.add('menu');
    const nav = el.querySelector<HTMLElement>('.op-menu')!;
    nav.hidden = false;
    const sv = readSave(store);
    const m = readMeta(store);
    const today = todayKey();
    const doneToday = m.daily[today];
    let level = m.ascOpen;
    const ascLine = () => (level ? `승급 ${level} — ${ASCENSION[level - 1].name}` : '승급 없음');
    nav.innerHTML = `${sv ? `<button class="btn brass op-main" type="button" data-cont>이어하기<small>${sv.daily ? '오늘의 출하 · ' : ''}${sv.asc ? `승급 ${sv.asc} · ` : ''}${sv.actI + 1}막 · 분대 ${sv.squad.length} · 나사 ${sv.gold}</small></button>` : ''}
      <button class="btn ${sv ? '' : 'brass'} op-main" type="button" data-go>${sv ? '새 출하' : '출하 시작'}${m.ascOpen ? `<small data-asc-line>${ascLine()}</small>` : ''}</button>
      ${m.ascOpen ? `<div class="asc-pick"><button class="btn sq" type="button" data-asc="-1" aria-label="승급 낮추기">◀</button><span>승급</span><button class="btn sq" type="button" data-asc="1" aria-label="승급 높이기">▶</button></div>` : ''}
      <button class="btn cyan op-main" type="button" data-daily>오늘의 출하${doneToday ? ' ✓' : ''}<small>모두가 같은 지도 · 같은 분대</small></button>
      <div class="op-sub"><button class="btn" type="button" data-lab-open>시험장</button><button class="btn" type="button" data-ledger>원부</button><button class="btn" type="button" data-guide>안내서</button><button class="btn" type="button" data-prologue>프롤로그</button></div>
      <p class="op-rec">출하 ${m.runs} · 완주 ${m.clears}${m.bestAct ? ` · 최고 ${m.bestAct > 3 ? '완주' : `${m.bestAct}막`}` : ''}${doneToday ? ` · 오늘 ${doneToday.cleared ? '완주' : `${doneToday.act}막`}` : ''}</p>`;
    nav.querySelectorAll<HTMLElement>('[data-asc]').forEach((btn) =>
      btn.addEventListener('click', () => {
        level = Math.max(0, Math.min(m.ascOpen, level + Number(btn.dataset.asc)));
        nav.querySelector('[data-asc-line]')!.textContent = ascLine();
        sfx('tap');
      }),
    );
    nav.querySelector('[data-cont]')?.addEventListener('click', () => {
      loadRun(sv!);
      sfx('submit');
      if (sv!.at === 'battle') {
        const nd = acts[actI].rows[rowI][sv!.node ?? 0];
        if (nd?.battle) return startBattle(nd.battle);
      }
      showMap();
    });
    const seed = () => (Date.now() ^ 0x2f17) & 0xffffff;
    nav.querySelector('[data-go]')!.addEventListener('click', () => {
      if (!sv) return begin(seed(), level, null);
      const ok = openOverlay(`<h2>새 출하</h2><p>저장한 출하를 버리고 새로 시작합니다.</p><div class="row"><button class="btn" type="button" data-no>그만둔다</button><button class="btn brass" type="button" data-yes>새로 시작한다</button></div>`);
      ok.querySelector('[data-no]')!.addEventListener('click', closeOverlay);
      ok.querySelector('[data-yes]')!.addEventListener('click', () => begin(seed(), level, null));
    });
    nav.querySelector('[data-daily]')!.addEventListener('click', () => begin(dailySeed(today), 0, today));
    nav.querySelector('[data-ledger]')!.addEventListener('click', () => ledgerView(closeOverlay));
    nav.querySelector('[data-lab-open]')!.addEventListener('click', labPick);
    nav.querySelector('[data-guide]')!.addEventListener('click', () => void guide(openOverlay).then(closeOverlay));
    nav.querySelector('[data-prologue]')!.addEventListener('click', () => void prologue(true));
    replay(nav, 'in');
  };
  // 프롤로그를 본 사람이 출하를 끝내고 돌아오면(처음 화면) 바로 메뉴
  if (m0.prologue && sessionStorage.getItem('op-menu') === '1') {
    stage = 'menu';
    openMenu();
  }
};
/** 오프닝 화면을 걷는다 (대국 · 지도로 들어갈 때) */
const closeOpening = (): void => {
  const el = document.querySelector<HTMLElement>('.opening');
  if (!el) return;
  pxOut(el, () => el.remove(), 300);
};

startBattle(INTRO[0], true);
const qs = new URLSearchParams(location.search);
if (qs.has('lab')) labPick();
else if (!qs.has('debug')) opening();
if (new URLSearchParams(location.search).has('debug')) Object.assign(window as object, { slice: () => b, sliceApi: { cardPieces, cardMoves, previewPlay, lab: (m: 'A' | 'B') => startLab(m), stand: () => { sacLeft = 1; clutchLeft = 1; return lastStand(true); }, taunt: (c: TauntCue) => { tauntedNow = false; taunt(c, true); }, bet: () => { gold = 60; maybeBet(cur, true); }, finish: () => finish(), meet: () => { const n = nemeses()[0]; if (n) nemesisMeet(n); }, startLive: (act: 1 | 2 | 3) => startBattle(battleFor(act, 'battle', new Rng(act * 7))), intro: (act: 1 | 2 | 3, kind: 'battle' | 'check' | 'boss') => startBattle(battleFor(act, kind, new Rng(act * 7))), redraw: () => { renderer.setup(b.s); refresh(); }, startAt: (act: 1 | 2 | 3, kind: 'battle' | 'check' | 'boss') => startBattle(battleFor(act, kind, new Rng(act * 7)), true), tap: (pos: Pos) => onTap(pos), start: (i: number) => startBattle(i < 2 ? INTRO[i] : battleFor(1, i >= 4 ? 'boss' : i === 3 ? 'check' : 'battle', new Rng(i))), map: (r = 2) => { rowI = r; showMap(); }, shop: () => shopScreen(), event: (id: string) => eventScreen(id as never), forge: () => forgeScreen(), gold: (n: number) => (gold = n), end: (c: boolean) => runEnd(c), die: () => { b.falls.push({ ...(b.falls[0] ?? {}), pieceId: b.squadIds[1], turn: b.turn, by: '적 룩' } as never); return deathRites(); } } });
