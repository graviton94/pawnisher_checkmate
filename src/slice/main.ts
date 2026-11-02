import '../fonts.css';
import '../style.css';
import './slice.css';
import { sfx } from '../audio/sfx';
import { installPressFeedback } from '../ui/motion';
import { dissolveUp, flyTo, installPressy, installUiSprites, mountPart, nope, screwBurst, shutter } from './uifx';
import { pieceImg } from '../ui/sprites';
import { BoardRenderer } from '../view/BoardRenderer';
import type { BoardModel } from '../game/controller';
import { PIECE_NAMES_KO } from '../data/pieces';
import { findPiece, samePos, type PieceType, type Pos } from '../engine';
import { baseOf, isRefined, refinedOf, AXIS_NAMES, BOSS_NUM, BOSS_RULES, COMMANDS, LAB, TRAIT, FORGE, KITS, SHOP, RECRUITS, REWARD_COMMANDS, SLICE, START_DECK, START_SQUAD, type Axis, type CommandId } from './cards';
import { PART_NUM, SLICE_PARTS, type SlicePartId } from './parts';
import { iconMask } from '../ui/chrome';

/** 색이 든 16칸 도트 아이콘 (D-182): 단색 마스크 대신 그림 그대로, 계단 확대 */
const iconArt = (key: string): string => `background:url(ui/icons16/${key}.png) center/contain no-repeat;-webkit-mask:none;mask:none;image-rendering:pixelated`;
import { CREW, DEATHS, QUIRKS, crewLabel, makeCrew, type Crew, type LedgerEntry } from './crew';
import { ASC_NUM, ASCENSION, battleFor, buildRun, INTRO, NODE_DESC, NODE_ICONS, NODE_NAMES, type Act, type BattleDef, type MapNode } from './run';
import { SLICE_EVENTS, SLICE_EVENT_IDS, type EventState, type SliceEventId } from './events';
import { addNemesis, betterHighlight, BETS, dir, DIRECTOR, isCloseCall, settleBet, TAUNTS, type BetKind, type Highlight, type Nemesis, type TauntCue } from './director';
import { clearSave, dailySeed, defaultStore, readMeta, readSave, recordRun, todayKey, writeMeta, writeSave, type RunSave } from './save';
import { REST, clutchBoost, kingDoomed, sacrificeCandidates, sacrificeSwap, canPlay, crewMaxHp, fallenAfter, costOf, isInstant, cardMoves, cardPieces, chainMult, dangerSquares, endTurn, intentHits, liveIntents, newSliceBattle, overhaulSquad, playCard, previewPlay, restSquad, rewind, squadAfter, type SliceBattle, type Squad } from './battle';
import type { BattleState, BattleEvent } from '../engine';
import { Rng } from '../engine/rng';

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
  el.className = 'taunt';
  el.innerHTML = `${pieceImg('K', 1, 'small', 22)}<span>${line}</span>`;
  document.body.appendChild(el);
  window.setTimeout(() => el.classList.add('out'), 2600);
  window.setTimeout(() => el.remove(), 3100);
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
      el.hidden = false;
      el.style.left = `${Math.max(8, x - 80)}px`;
      el.style.top = `${Math.max(8, y - 90)}px`;
    },
    longPressEnd: () => ($('info').hidden = true),
  },
  (text) => toast(text),
);
installPressFeedback();
installUiSprites();
installPressy();

let toastTimer: number | undefined;
const toast = (msg: string, ms = 1800) => {
  const t = $('toast');
  t.textContent = msg;
  t.hidden = false;
  t.classList.remove('tin');
  void t.offsetWidth;
  t.classList.add('tin');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (t.hidden = true), ms);
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
  peekEl.innerHTML = peekHtml(id, Number(cardEl.querySelector('.costgear')?.getAttribute('aria-label')?.replace(/\D/g, '') ?? COMMANDS[id].cost));
  document.body.appendChild(peekEl);
  const h = peekEl.offsetHeight;
  peekEl.style.left = `${r.right + 10}px`;
  peekEl.style.top = `${Math.max(8, Math.min(window.innerHeight - h - 8, r.top + r.height / 2 - h / 2))}px`;
};
const hidePeek = (): void => {
  peekEl?.remove();
  peekEl = null;
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
  $('turn-label').textContent = b.s.winner !== null ? '대국 끝' : enemyTurn ? '적 차례' : busy ? '움직이는 중' : `${b.turn}턴 · 내 차례`;
  $('turn-label').classList.toggle('enemy', enemyTurn);
  $('hand').innerHTML = `<p class="hand-head"><button type="button" class="deck-btn" data-deck>덱 ${deck.length}</button><button type="button" class="deck-btn" data-crew>분대 ${squad.length}</button> 뽑을 ${b.draw.length} · 버림 ${b.discard.length}</p>${b.hand.map(cardHtml).join('') || '<p class="empty">‘손패가 없어.’</p>'}`;
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
  $('coins').innerHTML = `<span class="lbl">나사</span>${Array.from({ length: SLICE.coins }, (_, i) => `<i class="coin${i < b.coins ? '' : ' gone'}"></i>`).join('')}<b>${b.coins * SLICE.coinValue}</b>`;
  ($('btn-rewind') as HTMLButtonElement).disabled = b.rewinds <= 0 || busy || b.s.winner !== null;
  $('btn-rewind').innerHTML = `◀◀ 되감기 <small>${b.rewinds}/${parts.includes('tape') ? 2 : 1}</small>`;
  ($('btn-end') as HTMLButtonElement).disabled = busy || b.s.winner !== null;
  meter();
};

/** 연쇄 계기판 (Balatro식): 이번 턴 피해 합계와 배수 — 처치가 쌓일수록 크고 뜨겁게 */
const meter = (): void => {
  const m = $('meter');
  if (!turnDmg && !b.kills && !b.overkill) {
    m.hidden = true;
    return;
  }
  m.hidden = false;
  m.className = `meter lv${Math.min(b.kills, 4)}`;
  // 대표 화면 (D-156): 배수가 주인공 — 크게, 연쇄가 쌓일수록 크고 뜨겁게
  m.innerHTML = `<span class="mult">×${chainMult(b.kills, parts).toFixed(2)}</span><b>연쇄 ${b.kills}</b><span class="dmg">이번 턴 −${turnDmg}</span>${b.overkill ? `<small>넘친 피해 ${b.overkill}</small>` : ''}`;
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
  if (ids.length) sfx('stamp');
};

/** 처치 순간 (연쇄): 판 한가운데 큰 글자 + 판 흔들림 + 음이 올라간다 */
const chainPop = (kills: number): void => {
  const el = document.createElement('div');
  el.className = `chainpop lv${Math.min(kills, 4)}`;
  el.innerHTML = `<small>연쇄 ${kills}</small>×${chainMult(kills, parts).toFixed(2)}${kills >= 3 ? '!' : ''}`;
  // 판 캔버스 위로 (body에 고정 배치, 판 한가운데)
  const r = $('board').getBoundingClientRect();
  el.style.left = `${r.left + r.width / 2}px`;
  el.style.top = `${r.top + r.height * 0.42}px`;
  document.body.appendChild(el);
  window.setTimeout(() => el.remove(), 900);
  $('board').classList.remove('jolt');
  void $('board').offsetWidth;
  $('board').classList.add(`jolt`);
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
  if (!pieces.length) return toast(c.who === 'any' ? '‘움직일 기물이 없어.’' : `‘${PIECE_NAMES_KO[c.who]}이(가) 없거나, 갈 칸이 없어.’`);
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
      if (ci === null) return toast(`‘${PIECE_NAMES_KO[p.type]}을(를) 움직일 카드가 없어.’`);
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

const run = (i: number, pieceId?: number, to?: Pos): Promise<void> => guarded(() => runInner(i, pieceId, to));
const runInner = async (i: number, pieceId?: number, to?: Pos): Promise<void> => {
  const cardId = b.hand[i];
  const moverType = pieceId !== undefined ? findPiece(b.s, pieceId)?.type : undefined;
  const k0 = b.kills;
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
  const r = endTurn(b);
  if (r === 'warn') {
    sfx('threat');
    toast('이대로 턴을 끝내면 킹이 피격당합니다. 한 번 더 누르면 끝냅니다.', 2600);
    $('btn-end').classList.add('warn');
    return;
  }
  $('btn-end').classList.remove('warn');
  selCard = selPiece = null;
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
  enemyTurn = true;
  refresh();
  showBefore(r.before);
  await renderer.play(r.before, r.events);
  await deathRites();
  if (r.events.some((e) => e.type === 'respawn' && e.label?.startsWith('끝없는'))) flashParts(['assembly']);
  busy = false;
  enemyTurn = false;
  renderer.setup(b.s);
  refresh();
  if (b.s.winner !== null) return finish();
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
        toast(`${who.name}이(가) 킹 앞을 막아선다.`, 2600);
        if (!force && !kingDoomed(b)) return;
      }
    }
  }
  if (clutchLeft <= 0) return;
  clutchLeft -= 1;
  clutchedNow = true;
  const fx = document.createElement('div');
  fx.className = 'clutchfx';
  fx.innerHTML = `<p>태엽이 마지막으로 감긴다.</p><small>태엽 +${dir.clutchAp(asc)} · 손패에 철벽</small>`;
  document.body.appendChild(fx);
  sfx('awaken');
  await new Promise((r) => window.setTimeout(r, 1500));
  fx.classList.add('out');
  window.setTimeout(() => fx.remove(), 400);
  clutchBoost(b, dir.clutchAp(asc));
  refresh();
};

/** 원수와 다시 만났다 (전환 화면 뒤): 이름 · 쓰러뜨린 분대원 · 단계 */
const nemesisMeet = (n: Nemesis): void => {
  const el = openOverlay(`<div class="stand nemesis"><p class="eyebrow">원수</p><h2>${pieceImg(n.t, 1, 'small', 30)} ${n.name}</h2><p class="line">${TAUNTS.meet[R.int(TAUNTS.meet.length)]}</p><p class="dim">쓰러뜨린 분대원: ${n.victims.join(' · ')} · ${n.rank}단계 (HP +${Math.round(n.rank * DIRECTOR.nemesisHp * 100)}%)<br>쓰러뜨리면 현상금 나사 ${dir.bounty(asc)}${asc <= DIRECTOR.heirloomUpTo && n.heir ? ` · ${n.heir.name}이(가) 돌아온다` : ''}.</p><div class="row"><button class="btn brass" type="button" data-go>간다</button></div></div>`);
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
  closeOverlay();
  renderer.setFoeTraits([...(b.blastPawns ? ['blast' as const] : []), ...(b.boss && b.bossRule === 'thorns' ? ['thorns' as const] : [])]);
  renderer.setNemesis(b.nemesisId ?? null);
  renderer.setBossFinish(!!def.boss);
  renderer.setup(b.s);
  refresh();
  // 전환 화면 (D-165): 판이 바뀔 때마다 — 서술 한 줄 + 도움말, 눌러서 넘긴다. 판 위 규칙 한 줄은 그 뒤에
  if (!silent)
    void stageIntro(def).then(() => {
      if (nemesisNow) return nemesisMeet(nemesisNow);
      toast(def.tell, 3200);
      maybeBet(def);
    });
  // 입문 첫 턴: 손패가 빛난다 (글 대신 빛나는 곳)
  $('hand').classList.toggle('hint', def === INTRO[0]);
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
    startBattle(n.battle);
    return saveRun('battle', picked[actI][rowI] ?? 0);
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
    el.classList.add('out');
    window.setTimeout(() => {
      el.remove();
      enterNode(row[k]);
    }, 380);
  };
};

/** 이번 출하에서 아직 안 나온 사건 (한 출하에 같은 사건 두 번 없음) */
let eventBag: SliceEventId[] = [...SLICE_EVENT_IDS];
/** 사건 화면 (R5-3, D-170): 서술 · 선택지(고를 수 없으면 이유) → 결과 한 줄 → 계속 (부품이면 고르기) */
const eventScreen = (id: (typeof SLICE_EVENT_IDS)[number]): void => {
  const ev = SLICE_EVENTS[id];
  const st = (): EventState => ({ squad, deck, refined, gold });
  // 장면 칸 (슬더스식 왼쪽 그림): public/scenes/<사건>.png가 오면 그 그림, 없으면 물음표 문양 (발주 docs/asset-order-scenes.md)
  const el = openOverlay(`<div class="ev-wrap"><div class="ev-scene"><img src="scenes/${id}.png" alt="" onerror="this.remove()"><i style="${iconArt('n.event')}"></i></div><div class="ev-body"><h2>${ev.title}</h2><p class="ev-text">${ev.text}</p><div class="ev-choices">${ev.choices
    .map((c, k) => {
      const why = c.blocked?.(st()) ?? null;
      return `<button type="button" class="ev-choice${why ? ' off' : ''}" data-ev="${k}" ${why ? 'aria-disabled="true"' : ''}><b>${c.label}</b>${c.desc ? `<small>${c.desc}</small>` : ''}${why ? `<em>${why}</em>` : ''}</button>`;
    })
    .join('')}</div><p class="dim">나사 ${gold} · 분대 ${squad.length} · 덱 ${deck.length}</p></div></div>`);
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
  const rng = sub();
  const pool = REWARD_COMMANDS.filter(usable);
  const cards: CommandId[] = [];
  while (cards.length < SHOP.cards && pool.length) cards.push(pool.splice(rng.int(pool.length), 1)[0]);
  const partPool = (Object.keys(SLICE_PARTS) as SlicePartId[]).filter((id) => !parts.includes(id));
  const part = partPool.length ? partPool[rng.int(partPool.length)] : null;
  const sold = new Set<string>();
  const price = (id: CommandId) => ascPrice(SHOP.cardPrice[Math.min(2, COMMANDS[id].cost)]);
  const render = (): void => {
    const tag = (key: string, cost: number) => (sold.has(key) ? '<span class="price sold">팔림</span>' : `<span class="price${gold < cost ? ' poor' : ''}">나사 ${cost}</span>`);
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
        const label = kind === 'card' ? `${COMMANDS[id as CommandId].name}을(를) 산다 — 나사 ${cost}` : kind === 'part' ? `${SLICE_PARTS[id as SlicePartId].name}을(를) 산다 — 나사 ${cost}` : kind === 'heal' ? `분대를 정비한다 — 나사 ${cost}` : `카드 한 장을 뺀다 — 나사 ${cost}`;
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
        toast(`분대 전원 HP +${Math.round(FORGE.repairPct * 100)}%`);
        window.setTimeout(advance, 400);
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
      choose(btn, `${COMMANDS[btn.dataset.ref as CommandId].name}을(를) 다듬는다`, () => {
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
  '나사 트랙은 턴마다 줄어듭니다. 빨리 이길수록 많이 받습니다.',
  '쓰러진 분대원은 돌아오지 않습니다. 정비로 한 기를 되살릴 수 있습니다.',
  '부품은 같은 띠의 카드와 맞물립니다. 띠를 맞추면 배율이 폭발합니다.',
  '기물을 길게 누르면 이름 · 기벽 · 체력을 볼 수 있습니다.',
];

/** 전환 화면 (D-165): 큰 그림 + 이름 + 서술 한 줄 + 도움말. 눌러서 넘기거나 약 3초 뒤 저절로 */
const sceneIntro = (label: string, name: string, narr: string, art: string, boss = false): Promise<void> =>
  new Promise((resolve) => {
    const el = document.createElement('div');
    el.className = `stagefx instant${boss ? ' boss' : ''}`;
    el.innerHTML = `<div class="sf-art">${art}</div>
      <div class="sf-text"><p class="sf-eyebrow">${label}</p><h1>${name}</h1><p class="sf-narr">${narr}</p></div>
      <p class="sf-tip">${TIPS[Math.floor(Math.random() * TIPS.length)]}</p><p class="sf-skip">눌러서 계속</p>`;
    // 철문 전환 (D-184): 닫힌 사이에 장면을 세우고 열며 보여 준다 — 페이드 대신
    void shutter(() => {
      document.body.appendChild(el);
      sfx(boss ? 'threat' : 'stamp');
    });
    let done = false;
    const close = () => {
      if (done) return;
      done = true;
      // 닫힌 사이에 다음 화면을 세운다 (resolve → 부른 쪽이 곧바로 판 · 화면을 만든다)
      void shutter(() => {
        el.remove();
        resolve();
        return new Promise((r) => window.setTimeout(r, 80));
      });
    };
    window.setTimeout(() => el.addEventListener('click', close), 1000);
    window.setTimeout(close, boss ? 4200 : 3400);
  });
const stageIntro = (def: BattleDef): Promise<void> => {
  const [label, name] = def.title.split(' — ');
  const foe: PieceType = def.boss ? 'Q' : def.enemy.find((t) => t !== 'K' && t !== 'P') ?? 'K';
  return sceneIntro(label, name, def.narr, pieceImg(foe, 1, 'large', 220), def.boss);
};

/** 승패 띠 (대국이 끝난 순간 화면을 가로지른다) */
const banner = (text: string, good: boolean): Promise<void> =>
  new Promise((resolve) => {
    const el = document.createElement('div');
    el.className = `slashfx ${good ? 'good' : 'bad'}`;
    el.innerHTML = `<span>${text}</span>`;
    document.body.appendChild(el);
    sfx(good ? 'win' : 'lose');
    window.setTimeout(() => {
      el.remove();
      resolve();
    }, 1100);
  });

/**
 * 고르기 확인 (D-165): 첫 탭 = 고른다(들어 올리고 나머지는 어두워짐 + 아래 확인 띠), 같은 것을 다시 누르거나 「고르기」 = 확정.
 * 다른 것을 누르면 그쪽으로 바뀐다. 모든 보상 · 부품 · 영입 · 정비 · 건너뛰기가 이 두 단계를 지난다.
 */
const choose = (btn: HTMLElement, label: string, onConfirm: () => void): void => {
  const panel = $('overlay-panel');
  if (btn.classList.contains('chosen')) return void confirmChoice(btn, onConfirm);
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
  bar.innerHTML = `<span>‘${label}’</span><button class="btn" type="button" data-unchoose>다시 보기</button><button class="btn brass" type="button" data-confirm>고르기</button>`;
  bar.querySelector('[data-unchoose]')!.addEventListener('click', () => {
    btn.classList.remove('chosen');
    panel.classList.remove('choosing');
    bar!.remove();
  });
  bar.querySelector('[data-confirm]')!.addEventListener('click', () => confirmChoice(btn, onConfirm));
};
const confirmChoice = (btn: HTMLElement, onConfirm: () => void): void => {
  const panel = $('overlay-panel');
  if (panel.classList.contains('locked')) return;
  panel.classList.add('locked');
  btn.classList.add('picked');
  sfx('rare');
  // D-184: 안 고른 것은 아래부터 도트로 흩어지고, 고른 카드 · 부품은 기울며 들렸다가 덱 · 부품 칸으로 빨려 든다
  const group = btn.parentElement ? [...btn.parentElement.children].filter((x): x is HTMLElement => x !== btn && x instanceof HTMLElement && (x.matches('.cmd, .part-card'))) : [];
  group.forEach((x) => dissolveUp(x));
  const isCard = btn.matches('.cmd, .part-card');
  const target = btn.matches('.part-card') ? $('parts') : document.querySelector('[data-deck]');
  if (isCard && target) void flyTo(btn, target);
  window.setTimeout(() => {
    panel.classList.remove('locked', 'choosing');
    onConfirm();
  }, isCard ? 640 : 450);
};

const openOverlay = (html: string): HTMLElement => {
  const panel = $('overlay-panel');
  panel.innerHTML = html;
  const wasHidden = $('overlay').hidden;
  $('overlay').hidden = false;
  // 계단으로 떨어져 박힘 (D-184) — 이미 열린 창의 내용만 바뀔 때는 그대로
  if (wasHidden) {
    panel.classList.remove('pop');
    void panel.offsetWidth;
    panel.classList.add('pop');
  }
  return panel;
};
const closeOverlay = () => ($('overlay').hidden = true);

const finish = (): void => {
  const isWin = b.s.winner === 0;
  if (labMode) return labEnd(isWin);
  window.setTimeout(async () => {
    await banner(isWin ? (cur.boss ? '반장 격파' : '적 킹 격파') : '킹 파괴', isWin);
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
        notes.push(`${n.heir.name}이(가) 돌아왔다.`);
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
    if (heirs.length) {
      gold += heirs.length * CREW.heirloomScrews;
      window.setTimeout(() => toast(`유품 태엽 처분 (${heirs.map((c) => c.name).join(' · ')}) — 나사 +${heirs.length * CREW.heirloomScrews}`, 3000), 400);
    }
    rewardFlow(earned, overGold, fallen);
  }, 700);
};

/** 보상 흐름 (유품 다음) */
const rewardFlow = (earned: number, overGold: number, fallen: Crew[], partDone = false): void => {
  {
    won += 1;
    const reward = cur.reward;
    const head = `<h2><span class="pass-tag">통과</span> ${cur.title} — 나사 +${earned}</h2>`;
    if (reward === 'recruit') return recruitPick(head, () => advance());
    if (reward === 'kit') return kitPick(head, () => advance());
    // 검문: 부품을 고른 뒤 카드 보상으로 (partDone — 다시 부품 화면으로 돌지 않게)
    // 사선 보상 3등급: 부품 하나 더 (검문 부품과 겹치지 않게 먼저)
    if (closeTier === 3 && !partDone) {
      closeTier = 0;
      return partPick(`<div class="stamp-big good">사선을 넘었다</div><h2>부품 하나 더</h2><p>겨우 넘은 대국입니다. 부품을 하나 고릅니다.</p>`, () => { won -= 1; rewardFlow(earned, overGold, fallen, reward !== 'part'); });
    }
    if (reward === 'part' && !partDone) return partPick(`<div class="stamp-big good">검문 통과</div><h2>부품 상자 — 나사 +${earned}</h2><p>부품을 하나 고릅니다. 장착하면 규칙이 바뀝니다.</p>`, () => rewardFlow(earned, overGold, fallen, true));
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
        <h2>통과 — 나사 +${earned}</h2>
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
          <button class="btn cyan" type="button" data-overhaul>정비 — ${fallen.length ? `쓰러진 ${[...fallen].sort((a, c) => (COST_ORDER[c.t] ?? 0) - (COST_ORDER[a.t] ?? 0))[0].name}을(를) HP 50%로 되살리고 ` : ''}모두 HP +${Math.round(REST.overhaul * 100)}%</button>
        </div>`);
      el.querySelectorAll<HTMLElement>('[data-pick]').forEach((btn) =>
        btn.addEventListener('click', () =>
          choose(btn, `${COMMANDS[btn.dataset.pick as CommandId].name}을(를) 덱에 넣는다`, () => {
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
          toast(o.revived ? `${o.revived.name}이(가) 복귀했습니다.` : `분대 전원 HP +${Math.round(REST.overhaul * 100)}%`);
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
    fx.className = 'deathfx';
    const d = DEATHS[((c.serial ?? '').charCodeAt(3) + (c.kills ?? 0) + f.turn) % DEATHS.length];
    // 2인칭 서술 → 이름 → 각주 대사 → 시스템 한 줄 (D-158)
    fx.innerHTML = `<div><p class="narr">${d.narr}</p><b>${crewLabel(c)}</b><i>${d.line}</i><small>${c.serial} · ${f.by}에게 파괴되었습니다.</small></div>`;
    document.body.appendChild(fx);
    sfx('loss');
    await new Promise((r) => window.setTimeout(r, 1200));
    fx.classList.add('out');
    window.setTimeout(() => fx.remove(), 400);
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
  el.querySelector('[data-ledger]')!.addEventListener('click', () => ledgerView(title));
  el.querySelector('[data-lab-open]')!.addEventListener('click', labPick);
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
      return `<button type="button" class="part-card recruit" data-rec="${k}"><span class="rec-art">${pieceImg(r.t, 0, 'large', 56)}</span><b>${c.name} <span class="dim">${c.serial}</span></b>${q ? `<small class="quirk-line"><b>${q.name}</b><br>${q.desc}</small>` : ''}<span class="kit-cards">+ ${r.cards.map((id) => COMMANDS[id].name).join(' · ')}</span></button>`;
    })
    .join('')}</div>`);
  el.querySelectorAll<HTMLElement>('[data-rec]').forEach((btn) =>
    btn.addEventListener('click', () =>
      choose(btn, `${crews[Number(btn.dataset.rec)].name}을(를) 분대에 넣는다`, () => {
        const r = offers[Number(btn.dataset.rec)];
        squad.push(crews[Number(btn.dataset.rec)]);
        deck.push(...r.cards);
        toast(`${crews[Number(btn.dataset.rec)].name}이(가) 분대에 합류했습니다.`);
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
      choose(btn, `${SLICE_PARTS[offers[Number(btn.dataset.kit)].part].name}을(를) 단다`, () => {
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
  const pool = (Object.keys(SLICE_PARTS) as SlicePartId[]).filter((id) => !parts.includes(id));
  const offers: SlicePartId[] = [];
  while (offers.length < 3 && pool.length) offers.push(pool.splice(rng.int(pool.length), 1)[0]);
  const el = openOverlay(`${head}<div class="part-cards">${offers.map((id) => partHtml(id, true)).join('')}</div>`);
  el.querySelectorAll<HTMLElement>('[data-part]').forEach((btn) =>
    btn.addEventListener('click', () =>
      choose(btn, `${SLICE_PARTS[btn.dataset.part as SlicePartId].name}을(를) 단다`, () => {
        parts.push(btn.dataset.part as SlicePartId);
        newParts.add(btn.dataset.part as SlicePartId);
        then();
      }),
    ),
  );
};

const help = (): void => {
  const el = openOverlay(`
    <h2>수직 조각 — 분대 + 명령 덱</h2>
    <ul class="help">
      <li><b>카드</b> → <b>기물</b> → <b>갈 칸</b> 순서로 누릅니다. 기물을 먼저 누르면 맞는 카드가 골라집니다.</li>
      <li>움직인 기물은 내려앉은 자리에서 <b>다음에 갈 수 있는 칸</b>을 공격합니다. 과녁 = 공격 · 금색 = 처치.</li>
      <li>카드 왼쪽 숫자는 <b>태엽</b> 비용입니다. 한 턴에 ${SLICE.ap}. 같은 기물을 여러 번 움직일 수 있습니다.</li>
      <li>한 턴 안에서 처치할 때마다 <b>연쇄</b> 배율이 오릅니다 (×${chainMult(1).toFixed(2)} → ×${chainMult(2).toFixed(2)} …).</li>
      <li><b>붉은 칸</b>은 다음 차례에 상대가 공격할 수 있는 범위입니다. 번호는 움직일 순서입니다. 그 적을 먼저 쓰러뜨리거나, 비키거나, 길을 막으면 공격이 무산됩니다.</li>
      <li><b>나사 트랙</b>: 턴마다 한 칸씩 줄어듭니다. 빨리 이길수록 많이 받습니다.</li>
      <li><b>되감기</b>: 이번 턴을 처음으로 되돌립니다 (대국마다 1회). 분대 HP는 다음 판으로 이어집니다.</li>
      <li><b>넘친 피해</b>: 적 HP를 넘어선 피해 10마다 나사 1.</li>
      <li><b>부품</b>: 규칙을 바꾸는 장치입니다. 1판 뒤 부품 상자(카드 두 장 포함), 검문 뒤 하나 더. 같은 띠(기병 · 보병 · 왕관 · 연쇄 · 밀치기)의 카드와 맞물립니다.</li>
    </ul>
    <div class="row"><button class="btn brass" type="button" data-close>닫기</button></div>`);
  el.querySelector('[data-close]')!.addEventListener('click', () => {
    closeOverlay();
  });
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
$('hand').addEventListener('pointerover', (e) => {
  if (e.pointerType !== 'mouse') return;
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-card]');
  if (el) showPeek(el);
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
  if (el) pickCard(Number(el.dataset.card));
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
$('btn-help').addEventListener('click', help);

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
  el.querySelector('[data-lab-back]')!.addEventListener('click', () => location.assign(location.pathname));
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
  const m0 = readMeta(store);
  const m = recordRun(m0, { cleared, act: actI + 1, won, asc, daily });
  writeMeta(store, m);
  const unlocked = m.ascOpen > m0.ascOpen;
  const fallenNow = readLedger().filter((r) => r.run === runId);
  const best = [...squad].sort((x, y) => (y.kills ?? 0) - (x.kills ?? 0))[0];
  openOverlay(`<h2><span class="pass-tag${cleared ? '' : ' bad'}">${cleared ? '출하 완료' : '출하 중단'}</span> ${cleared ? '출하구를 지났습니다.' : `${actI + 1}막 · ${cur.title}에서 멈췄습니다.`}</h2>
    <p>${daily ? `오늘의 출하 ${daily} · ` : ''}${asc ? `승급 ${asc} · ` : ''}이긴 대국 ${won} · ${cleared ? '3막 완주' : `${actI + 1}막`} · 나사 ${gold} · 덱 ${deck.length}장 · 부품 ${parts.map((id) => SLICE_PARTS[id].name).join(' · ') || '없음'}</p>
    ${highlight ? `<p class="hl"><span class="pass-tag">이번 출하의 묘수</span> ${highlight.where} ${highlight.turn}턴 — 처치 ${highlight.kills} · 피해 ${highlight.damage}</p>` : ''}
    <p>살아남은 분대: ${squad.map((u) => `${crewLabel(u)} (처치 ${u.kills ?? 0})`).join(' · ')}</p>
    ${fallenNow.length ? `<p class="bad">쓰러진 분대원: ${fallenNow.map((r) => r.name).join(' · ')}</p>` : ''}
    ${best && (best.kills ?? 0) > 0 ? `<p class="flv">${crewLabel(best)} — 이번 출하의 선봉.</p>` : ''}
    ${unlocked ? `<p class="asc-open">승급 ${m.ascOpen} 「${ASCENSION[m.ascOpen - 1].name}」이 열렸습니다. (${ASCENSION[m.ascOpen - 1].desc})</p>` : ''}
    <p class="dim">시험판입니다. 막힌 곳 · 좋았던 순간 · 복잡했던 곳을 알려 주십시오.</p>
    <div class="row"><button class="btn brass" type="button" data-restart>처음 화면</button></div>`)
    .querySelector('[data-restart]')!
    .addEventListener('click', () => location.reload());
};

/** 첫 판으로 들어간다 (새 출하 · 오늘의 출하) */
const begin = (seed: number, level: number, day: string | null): void => {
  newRun(seed, level, day);
  startBattle(INTRO[0], true);
  saveRun('battle', 0);
  closeOverlay();
  sfx('submit');
  void stageIntro(INTRO[0]).then(() => toast(INTRO[0].tell, 3200));
};

/**
 * 시작 화면 (R6): 이어하기(저장이 있으면 맨 위) · 출하 시작(열린 승급을 고른다) · 오늘의 출하 · 규칙 · 원부.
 * 기록 한 줄: 출하 · 완주 · 가장 멀리 간 막.
 */
const title = (): void => {
  const sv = readSave(store);
  const m = readMeta(store);
  const today = todayKey();
  const doneToday = m.daily[today];
  let level = m.ascOpen;
  const ascLine = () => (level ? `승급 ${level} — ${ASCENSION.slice(0, level).map((a) => a.name).join(' · ')}` : '기본 — 승급 없음');
  const el = openOverlay(`<div class="title-card"><h1 class="sr-only">Pawnisher : Checkmate</h1>
    <div class="title-head"><img class="title-logo" src="ui/title-logo.png" alt="" width="177" height="146"><div class="title-side"><p class="flv">체스 규칙을 부수는 태엽 분대</p>
    <ul class="title-how"><li>카드를 고르고 기물을 움직이면, 내려앉은 자리에서 공격합니다.</li><li>붉은 칸은 다음 차례에 상대가 공격할 수 있는 범위입니다.</li><li>세 막을 지나 출하구에 닿으십시오.</li></ul></div></div>
    ${sv ? `<button class="btn brass wide" type="button" data-cont>이어하기 <small>${sv.daily ? '오늘의 출하 · ' : ''}${sv.asc ? `승급 ${sv.asc} · ` : ''}${sv.actI + 1}막 · 분대 ${sv.squad.length} · 나사 ${sv.gold}</small></button>` : ''}
    ${m.ascOpen ? `<div class="asc-pick"><button class="btn sq" type="button" data-asc="-1" aria-label="승급 낮추기">◀</button><span data-asc-line>${ascLine()}</span><button class="btn sq" type="button" data-asc="1" aria-label="승급 높이기">▶</button></div>` : ''}
    <div class="row"><button class="btn" type="button" data-rules>규칙</button><button class="btn" type="button" data-ledger>원부</button><button class="btn" type="button" data-lab-open>시험장</button><button class="btn cyan" type="button" data-daily>오늘의 출하${doneToday ? ' ✓' : ''}</button><button class="btn ${sv ? '' : 'brass'}" type="button" data-go>${sv ? '새 출하' : '출하 시작'}</button></div>
    <p class="dim rec">오늘의 출하 = 모두가 같은 지도 · 같은 분대${doneToday ? ' (기록은 첫 시도만)' : ''}<br>출하 ${m.runs} · 완주 ${m.clears}${m.bestAct ? ` · 최고 ${m.bestAct > 3 ? '완주' : `${m.bestAct}막`}` : ''}${doneToday ? ` · 오늘 ${doneToday.cleared ? '완주' : `${doneToday.act}막`}` : ''}</p></div>`);
  el.querySelectorAll<HTMLElement>('[data-asc]').forEach((btn) =>
    btn.addEventListener('click', () => {
      level = Math.max(0, Math.min(m.ascOpen, level + Number(btn.dataset.asc)));
      el.querySelector('[data-asc-line]')!.textContent = ascLine();
      sfx('tap');
    }),
  );
  el.querySelector('[data-cont]')?.addEventListener('click', () => {
    loadRun(sv!);
    closeOverlay();
    sfx('submit');
    if (sv!.at === 'battle') {
      const nd = acts[actI].rows[rowI][sv!.node ?? 0];
      if (nd?.battle) return startBattle(nd.battle);
    }
    showMap();
  });
  const goBtn = el.querySelector<HTMLElement>('[data-go]')!;
  goBtn.addEventListener('click', () => (sv ? choose(goBtn, '저장한 출하를 버리고 새로 시작한다', () => begin((Date.now() ^ 0x2f17) & 0xffffff, level, null)) : begin((Date.now() ^ 0x2f17) & 0xffffff, level, null)));
  const dBtn = el.querySelector<HTMLElement>('[data-daily]')!;
  dBtn.addEventListener('click', () =>
    choose(dBtn, sv ? '저장을 버리고 오늘의 출하에 나선다' : '오늘의 출하에 나선다', () => begin(dailySeed(today), 0, today)),
  );
  el.querySelector('[data-rules]')!.addEventListener('click', help);
  el.querySelector('[data-ledger]')!.addEventListener('click', () => ledgerView(title));
};

startBattle(INTRO[0], true);
const qs = new URLSearchParams(location.search);
if (qs.has('lab')) labPick();
else if (!qs.has('debug')) title();
if (new URLSearchParams(location.search).has('debug')) Object.assign(window as object, { slice: () => b, sliceApi: { cardPieces, cardMoves, previewPlay, lab: (m: 'A' | 'B') => startLab(m), stand: () => { sacLeft = 1; clutchLeft = 1; return lastStand(true); }, taunt: (c: TauntCue) => { tauntedNow = false; taunt(c, true); }, bet: () => { gold = 60; maybeBet(cur, true); }, finish: () => finish(), meet: () => { const n = nemeses()[0]; if (n) nemesisMeet(n); }, startLive: (act: 1 | 2 | 3) => startBattle(battleFor(act, 'battle', new Rng(act * 7))), redraw: () => { renderer.setup(b.s); refresh(); }, startAt: (act: 1 | 2 | 3, kind: 'battle' | 'check' | 'boss') => startBattle(battleFor(act, kind, new Rng(act * 7)), true), tap: (pos: Pos) => onTap(pos), start: (i: number) => startBattle(i < 2 ? INTRO[i] : battleFor(1, i >= 4 ? 'boss' : i === 3 ? 'check' : 'battle', new Rng(i))), map: (r = 2) => { rowI = r; showMap(); }, shop: () => shopScreen(), event: (id: string) => eventScreen(id as never), forge: () => forgeScreen(), gold: (n: number) => (gold = n) } });
