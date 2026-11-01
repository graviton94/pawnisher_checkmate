import '../fonts.css';
import '../style.css';
import './slice.css';
import { sfx } from '../audio/sfx';
import { installPressFeedback } from '../ui/motion';
import { pieceImg } from '../ui/sprites';
import { BoardRenderer } from '../view/BoardRenderer';
import type { BoardModel } from '../game/controller';
import { PIECE_NAMES_KO } from '../data/pieces';
import { findPiece, samePos, type PieceType, type Pos } from '../engine';
import { AXIS_NAMES, BOSS, COMMANDS, KITS, RECRUITS, REWARD_COMMANDS, SLICE, START_DECK, START_SQUAD, type Axis, type CommandId } from './cards';
import { SLICE_PARTS, type SlicePartId } from './parts';
import { iconMask } from '../ui/chrome';
import { shapeHtml } from './shape';
import { CREW, LAST_WORDS, QUIRKS, crewLabel, makeCrew, type Crew, type LedgerEntry } from './crew';
import { REST, canPlay, crewMaxHp, fallenAfter, costOf, isInstant, cardMoves, cardPieces, chainMult, dangerSquares, endTurn, intentHits, liveIntents, newSliceBattle, overhaulSquad, playCard, previewPlay, restSquad, rewind, squadAfter, type SliceBattle, type Squad } from './battle';
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

/** 대국 넷 (D-144): 일반 · 일반 · 검문!(이기면 부품) · 반장. reward = 이기면 받는 것 */
/**
 * 대국 다섯 (D-150 첫 10분): 입문(4×4, 첫 승 1분) → 연마(5×5) → 주조 → 검문! → 반장.
 * reward = 이기면 받는 것: 영입(기물 + 그 카드) · 부품 상자(부품 + 맞물리는 카드 둘) · 카드 · 부품 · 끝.
 */
type Reward = 'recruit' | 'kit' | 'card' | 'part' | 'end';
const BATTLES: { enemy: PieceType[]; kingHp: number; title: string; tell: string; reward: Reward; boss?: boolean; w?: number; h?: number; place?: { side: 0 | 1; t: PieceType; x: number; y: number }[] }[] = [
  // 입문 판은 손으로 만든다: 적 폰을 킹 옆으로 비켜 두면 첫 카드(전진 · 사선)가 바로 친다
  { enemy: ['K', 'P'], kingHp: 0.35, w: 4, h: 4, place: [{ side: 1, t: 'P', x: 2, y: 3 }], title: '입문 — 시험대', tell: '* 카드 → 기물 → 붉은 과녁. 킹을 쓰러뜨리면 끝.', reward: 'recruit' },
  { enemy: ['K', 'P', 'P'], kingHp: 0.5, w: 5, h: 5, title: '1판 — 연마 공정', tell: '* 붉은 칸이 다음에 맞을 자리다. 비키거나 먼저 친다.', reward: 'kit' },
  { enemy: ['K', 'P', 'P', 'N'], kingHp: 0.6, title: '2판 — 주조 공정', tell: '* 부품이 달렸다. 조합을 터뜨린다.', reward: 'card' },
  { enemy: ['K', 'P', 'P', 'B', 'R'], kingHp: 0.7, title: '3판 — 검문!', tell: '* 룩이 섞였다. 이기면 부품 상자가 열린다.', reward: 'part' },
  { enemy: ['K', 'Q', 'P', 'P', 'N'], kingHp: 0.75, title: '4판 — 반장', tell: '* 반장이 철갑을 두른다. 몰아쳐야 뚫린다.', reward: 'end', boss: true },
];

/** 분대: 시리얼 · 이름 · 기벽이 붙은 기물 (D-153) */
const crewRng = new Rng((Date.now() ^ 0x51c3) & 0xffff);
let squad: Squad[] = [];
for (const t of START_SQUAD) squad.push(makeCrew(t, crewRng, squad.map((u) => u.name ?? '')));
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
        : `<b>${pieceImg(p.type, p.side, 'small', 24)} ${p.side === 0 ? '<span class="ally">아군</span>' : '<span class="enemy">적</span>'} ${PIECE_NAMES_KO[p.type]}</b><br>HP ${p.hp} / ${p.maxHp}${p.shield ? ` · 방열판 ${p.shield}` : ''} · ATK ${p.atk}`;
      el.hidden = false;
      el.style.left = `${Math.max(8, x - 80)}px`;
      el.style.top = `${Math.max(8, y - 90)}px`;
    },
    longPressEnd: () => ($('info').hidden = true),
  },
  (text) => toast(text),
);
installPressFeedback();

let toastTimer: number | undefined;
const toast = (msg: string, ms = 1800) => {
  const t = $('toast');
  t.textContent = msg;
  t.hidden = false;
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
    <span class="cost" aria-label="태엽 ${cost}">${cost}</span>${art}<span class="txt"><b>${c.name}<span class="chips">${axisChip(c.axis)}${axisChip(c.axis2)}</span></b><small>${c.desc}</small>${why}</span></button>`;
};

/** 카드 그림: 움직이는 카드는 행마 그림(갈 칸 · 칠 칸), 그 밖은 기물 그림 · 기호 */
const cardArt = (id: CommandId): string => {
  const c = COMMANDS[id];
  if (c.who === 'any') return `<span class="art any">${c.kind === 'spark' ? '✦' : '★'}</span>`;
  if (c.kind === 'move' || c.kind === 'march') return `<span class="art mvplate">${shapeHtml(c.who)}</span>`;
  return `<span class="art">${pieceImg(c.who, 0, 'large', 40)}</span>`;
};

/** 빌드 축 띠 */
const axisTag = (a?: Axis): string => (a ? ` <i class="axis ax-${a}">${AXIS_NAMES[a]}</i>` : '');
/** 손패용 짧은 축 띠: 한 글자 색 칩 (이름은 보상 화면 · 읽기용 라벨에) */
const axisChip = (a?: Axis): string => (a ? `<i class="axis mini ax-${a}" aria-label="${AXIS_NAMES[a]}">${AXIS_NAMES[a][0]}</i>` : '');

/** 부품 칩 (레일 · 고르기 화면) */
const partHtml = (id: SlicePartId, big = false): string => {
  const d = SLICE_PARTS[id];
  return big
    ? `<button type="button" class="part-card${d.axis ? ` ax-${d.axis}` : ''}" data-part="${id}"><i class="ico" style="${iconMask(d.icon)}"></i><b>${d.name}${axisTag(d.axis ?? undefined)}</b><small>${d.desc}</small></button>`
    : `<button type="button" class="part-chip" data-part-info="${id}" aria-label="${d.name}"><i class="ico" style="${iconMask(d.icon)}"></i></button>`;
};

/** 연출 직전 화면: 바뀌기 전 모습 그대로 (피해 숫자 · 이동이 제대로 보이게) */
const showBefore = (before: BattleState): void =>
  renderer.render({ state: before, virtual: before, plan: [], pending: null, pendingPos: null, selectedId: null, destinations: [], hitDests: [], preview: [], removed: [], threat: null, intent: null });

/** 이번 턴 준 피해 합계 (계기판 · 턴 합계) */
let turnDmg = 0;
const dealt = (events: BattleEvent[], side: 0 | 1, before: BattleState): number =>
  events.reduce((a, e) => (e.type === 'attack' ? a + e.hits.reduce((x, h) => x + (before.pieces.find((p) => p.id === h.targetId)?.side !== side ? h.damage : 0), 0) : a), 0);

const refresh = (): void => {
  renderer.render(model());
  $('turn-label').textContent = b.s.winner !== null ? '대국 끝' : enemyTurn ? '적 차례' : busy ? '움직이는 중' : `${b.turn}턴 · 내 차례`;
  $('turn-label').classList.toggle('enemy', enemyTurn);
  $('hand').innerHTML = `<p class="hand-head"><button type="button" class="deck-btn" data-deck>덱 ${deck.length}</button><button type="button" class="deck-btn" data-crew>분대 ${squad.length}</button> 뽑을 ${b.draw.length} · 버림 ${b.discard.length}</p>${b.hand.map(cardHtml).join('') || '<p class="empty">손패가 비었다. 턴을 끝낸다.</p>'}`;
  $('parts').innerHTML = parts.map((id) => partHtml(id)).join('') || '<span class="dim">부품 없음</span>';
  $('boss').hidden = !b.boss;
  if (b.boss) $('boss').innerHTML = `<b>반장 규칙</b><span>철갑 ${BOSS.plate} · ${BOSS.plateEvery}턴마다 다시</span><span${b.bombRow !== null ? ' class="hot"' : ''}>줄 폭격 −${BOSS.bombDamage} · ${b.bombRow !== null ? '턴 끝에 붉은 줄!' : `${BOSS.bombEvery}턴마다`}</span>`;
  $('vials').innerHTML = Array.from({ length: Math.max(b.apMax, b.ap) }, (_, i) => `<img class="${i < b.ap ? 'full' : 'spent'}" src="ui/hud/key-${i < b.ap ? 'full' : 'spent'}.png" alt="">`).join('');
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
  m.innerHTML = `<small>이번 턴</small><span class="dmg">−${turnDmg}</span><b>연쇄 ${b.kills} · ×${chainMult(b.kills, parts).toFixed(2)}</b>${b.overkill ? `<small>넘친 피해 ${b.overkill}</small>` : ''}`;
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
    if (!canPlay(b, i)) return toast(costOf(b, i) > b.ap ? `태엽이 모자라다. (${costOf(b, i)} 필요)` : c.kind === 'march' ? '앞으로 갈 폰이 없다.' : '낼 수 없다.');
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
  if (!canPlay(b, i) && b.s.pieces.every((p) => p.side !== 0 || costOf(b, i, p.id) > b.ap)) return toast(`태엽이 모자라다. (${c.cost} 필요)`);
  const pieces = cardPieces(b, i);
  if (!pieces.length) return toast(c.who === 'any' ? '움직일 기물이 없다.' : `${PIECE_NAMES_KO[c.who]}이(가) 없거나 갈 칸이 없다.`);
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
      if (ci === null) return toast(`${PIECE_NAMES_KO[p.type]}을(를) 움직일 카드가 없다.`);
      selCard = ci;
      selPiece = p.id;
    }
    sfx('lift');
    return refresh();
  }
  if (p && p.side === 1) {
    const it = liveIntents(b).find((x) => x.pieceId === p.id);
    toast(it ? `* 이번에 움직인다. 붉은 칸을 친다.` : '* 이번엔 움직이지 않는다.');
    return;
  }
  selCard = selPiece = null;
  refresh();
};

const run = async (i: number, pieceId?: number, to?: Pos): Promise<void> => {
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
  if (gain) {
    toast(`* 편자가 울린다. 태엽 +${gain}.`);
    window.setTimeout(() => sfx('coin', 9), 200);
  }
  if (b.s.winner !== null) return finish();
};
let prevKills = 0;

const onEnd = async (): Promise<void> => {
  if (busy || b.s.winner !== null) return;
  const r = endTurn(b);
  if (r === 'warn') {
    sfx('threat');
    toast('‘거기는 맞는다. 그래도?’ — 한 번 더 누르면 끝낸다.', 2600);
    $('btn-end').classList.add('warn');
    return;
  }
  $('btn-end').classList.remove('warn');
  selCard = selPiece = null;
  // 턴 합계 (Balatro식): 이번 턴 준 피해가 세어 올라간다
  if (turnDmg > 0) await renderer.summary(0, turnDmg, prevKills);
  turnDmg = 0;
  prevKills = 0;
  busy = true;
  enemyTurn = true;
  refresh();
  showBefore(r.before);
  await renderer.play(r.before, r.events);
  await deathRites();
  busy = false;
  enemyTurn = false;
  renderer.setup(b.s);
  refresh();
  if (b.s.winner !== null) return finish();
  sfx('submit');
};

// ---------- 흐름 ----------
const start = (i: number): void => {
  stage = i;
  const def = BATTLES[i];
  b = newSliceBattle(squad, def.enemy, deck, 100 + i * 17 + Math.floor(Math.random() * 1000), { enemyKingHp: def.kingHp, parts, boss: def.boss, width: def.w, height: def.h, place: def.place });
  selCard = selPiece = null;
  busy = false;
  turnDmg = 0;
  prevKills = 0;
  ritesDone = 0;
  closeOverlay();
  renderer.setup(b.s);
  refresh();
  window.setTimeout(() => toast(`${def.title} ${def.tell}`, 3000), 300);
  // 입문 첫 턴: 손패가 빛난다 (글 대신 빛나는 곳)
  $('hand').classList.toggle('hint', i === 0);
};

const openOverlay = (html: string): HTMLElement => {
  $('overlay-panel').innerHTML = html;
  $('overlay').hidden = false;
  return $('overlay-panel');
};
const closeOverlay = () => ($('overlay').hidden = true);

const finish = (): void => {
  const won = b.s.winner === 0;
  window.setTimeout(() => {
    if (!won) {
      const el = openOverlay(`<div class="stamp-big bad">불량 폐기</div><p>* 집게가 상자째 들어 올린다.</p><div class="row"><button class="btn brass" type="button" data-again>이 판 다시</button></div>`);
      el.querySelector('[data-again]')!.addEventListener('click', () => start(stage));
      return;
    }
    // 넘친 피해 10마다 나사 1 (오버킬 — 큰 숫자를 만들 이유, D-145)
    const overGold = Math.floor(b.overkill / 10);
    const earned = b.coins * SLICE.coinValue + overGold;
    gold += earned;
    const before = squad;
    const survived = squadAfter(b, squad);
    const fallenList = fallenAfter(b, before);
    const fallen: Crew[] = fallenList.map((f) => f.crew);
    // 폐기 원부: 영구 기록 (D-153)
    writeLedger(fallenList.map(({ crew, fall }) => ({ serial: crew.serial ?? '', name: crew.name ?? '', t: crew.t, quirk: crew.quirk, kills: crew.kills ?? 0, battles: crew.battles ?? 0, nick: crew.nick, cause: `${BATTLES[stage].title} ${fall.turn}턴 · ${fall.by}`, run: runId })));
    // 덤 나사 기벽
    const screwBonus = survived.filter((u) => u.quirk === 'screw').length * CREW.screwBonus;
    gold += screwBonus;
    // 판 사이 기본 회복: 남은 분대 최대 HP의 30%
    squad = restSquad(survived);
    // 유품 태엽이 먼저 (쓰러진 이름 하나마다 — 팔기 · 이식), 그다음 보상
    if (fallen.length) return heirloomStep(fallen, () => rewardFlow(earned, overGold, fallen));
    rewardFlow(earned, overGold, fallen);
  }, 700);
};

/** 보상 흐름 (유품 다음) */
const rewardFlow = (earned: number, overGold: number, fallen: Crew[]): void => {
  {
    const reward = BATTLES[stage].reward;
    const head = `<h2><span class="pass-tag">통과</span> ${BATTLES[stage].title} — 나사 +${earned}</h2>`;
    if (reward === 'recruit') return recruitPick(head, () => start(stage + 1));
    if (reward === 'kit') return kitPick(head, () => start(stage + 1));
    if (reward === 'part') return partPick(`<div class="stamp-big good">검문 통과</div><h2>부품 상자 — 나사 +${earned}</h2><p>* 검수관의 상자가 열린다. 부품 하나를 단다. 규칙이 바뀐다.</p>`, () => start(stage + 1));
    if (stage + 1 >= BATTLES.length) {
      openOverlay(`<div class="stamp-big good">통과</div><h2>수직 조각 끝</h2><p>* 남은 분대 ${squad.length}기 · 나사 ${gold} · 덱 ${deck.length}장.</p><p class="dim">손맛이 어땠는지 — 카드 · 붉은 칸 · 연쇄 · 되감기 — 한 줄씩 알려 주면 다음 조각에 반영한다.</p><div class="row"><button class="btn brass" type="button" data-restart>처음부터</button></div>`)
        .querySelector('[data-restart]')!
        .addEventListener('click', () => location.reload());
      return;
    }
    const rng = new Rng(Date.now() & 0xffff);
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
    for (const a of picks) {
      const pool = REWARD_COMMANDS.filter((id) => (COMMANDS[id].axis === a || COMMANDS[id].axis2 === a) && !offers.includes(id));
      if (pool.length) offers.push(pool[rng.int(pool.length)]);
    }
    const lost = BATTLES[stage].enemy.length;
    /** 보상 화면 (카드 빼기를 그만두면 다시 연다) */
    const showReward = (): void => {
      const el = openOverlay(`
        <h2>통과 — 나사 +${earned} <small class="dim">(남은 칸 ${b.coins} × ${SLICE.coinValue}${overGold ? ` + 넘친 피해 ${b.overkill} → ${overGold}` : ''})</small></h2>
        <p>* 쓰러진 흑 ${lost}기의 상자에서 명령 카드가 나온다. 하나를 덱에 넣는다.</p>
        <div class="reward-cards">${offers
          .map((id) => {
            const c = COMMANDS[id];
            const who = cardArt(id);
            return `<button type="button" class="cmd big t-${c.who}" data-pick="${id}"><span class="cost">${c.cost}</span>${who}<span class="txt"><b>${c.name}${axisTag(c.axis)}${axisTag(c.axis2)}</b><small>${c.desc}</small></span></button>`;
          })
          .join('')}</div>
        <p class="rest-line">* 쉬는 사이 기름칠 — 남은 분대 HP +${Math.round(REST.heal * 100)}%: ${squad.map((u) => `${u.name ?? PIECE_NAMES_KO[u.t]} ${u.hp}`).join(' · ')}${fallen.length ? ` · <span class="bad">쓰러짐: ${fallen.map((u) => u.name).join(' · ')}</span>` : ''}</p>
        <div class="row">
          <button class="btn" type="button" data-skip>건너뛰기</button>
          <button class="btn" type="button" data-remove>카드 빼기 (카드 대신)</button>
          <button class="btn cyan" type="button" data-overhaul>정비 — ${fallen.length ? `쓰러진 ${[...fallen].sort((a, c) => (COST_ORDER[c.t] ?? 0) - (COST_ORDER[a.t] ?? 0))[0].name}을(를) HP 50%로 되살리고 ` : ''}모두 HP +${Math.round(REST.overhaul * 100)}% (카드 대신)</button>
        </div>`);
      el.querySelectorAll<HTMLElement>('[data-pick]').forEach((btn) =>
        btn.addEventListener('click', () => {
          deck.push(btn.dataset.pick as CommandId);
          sfx('rare');
          btn.classList.add('picked');
          window.setTimeout(() => start(stage + 1), 380);
        }),
      );
      el.querySelector('[data-skip]')!.addEventListener('click', () => start(stage + 1));
      // 카드 빼기: 한 장 빼면 다음 판, 그만두면 보상 화면으로 돌아온다
      el.querySelector('[data-remove]')!.addEventListener('click', () =>
        deckView('remove', (removed) => (removed ? start(stage + 1) : showReward())),
      );
      el.querySelector('[data-overhaul]')!.addEventListener('click', () => {
        const o = overhaulSquad(squad, fallen);
        squad = o.squad;
        sfx('awaken');
        toast(o.revived ? `* ${o.revived.name}이(가) 다시 선다. 원부의 줄이 지워진다.` : '* 분대가 기름을 먹는다.');
        window.setTimeout(() => start(stage + 1), 500);
      });
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
      return `<button type="button" class="cmd deckcard t-${c.who}" data-rm="${id}" ${mode === 'view' ? 'tabindex="-1"' : ''}><span class="cost">${c.cost}</span>${cardArt(id)}<span class="txt"><b>${c.name}<span class="chips">${axisChip(c.axis)}${axisChip(c.axis2)}</span></b><small>${c.desc}</small></span><span class="cnt">×${counts.get(id)}</span></button>`;
    })
    .join('');
  const head = mode === 'view' ? `<h2>덱 ${deck.length}장</h2>` : `<h2>카드 빼기 — 한 장</h2><p>* 고물상 주인이 집게를 내민다. “하나 빼. 가벼워진다.”</p>`;
  const el = openOverlay(`${head}<div class="deck-grid${mode === 'remove' ? ' removing' : ''}">${cards}</div><div class="row">${mode === 'view' ? '<button class="btn brass" type="button" data-close-deck>닫기</button>' : '<button class="btn" type="button" data-cancel>그만두기</button>'}</div>`);
  if (mode === 'view') {
    el.querySelector('[data-close-deck]')!.addEventListener('click', closeOverlay);
    return;
  }
  el.querySelector('[data-cancel]')!.addEventListener('click', () => then?.(false));
  el.querySelectorAll<HTMLElement>('[data-rm]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const id = btn.dataset.rm as CommandId;
      deck.splice(deck.indexOf(id), 1);
      sfx('stamp');
      btn.classList.add('removed');
      toast(`* ${COMMANDS[id].name} 한 장이 집게에 들려 나간다.`);
      window.setTimeout(() => then?.(true), 520);
    }),
  );
};

// ---------- 애착 (D-153) ----------
const runId = new Date().toISOString().slice(0, 16).replace('T', ' ');
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
    fx.innerHTML = `<div><span class="dim">${c.serial}</span><b>${crewLabel(c)}</b><i>${LAST_WORDS[((c.serial ?? '').charCodeAt(3) + (c.kills ?? 0) + f.turn) % LAST_WORDS.length]}</i><small>* ${f.by}에게 쓰러졌다. 유품 태엽이 떨어진다.</small></div>`;
    document.body.appendChild(fx);
    sfx('loss');
    await new Promise((r) => window.setTimeout(r, 1200));
    fx.classList.add('out');
    window.setTimeout(() => fx.remove(), 400);
  }
};

/** 유품 태엽 (쓰러진 분대원 하나마다): 나사로 팔기 · 산 분대원에게 이식(기벽을 물려받는다) */
const heirloomStep = (fallen: Crew[], then: () => void): void => {
  const queue = fallen.filter((c) => c.t !== 'K');
  const next = (): void => {
    const c = queue.shift();
    if (!c) return then();
    const heirs = squad.filter((u) => u.t !== 'K');
    const q = c.quirk ? QUIRKS[c.quirk] : null;
    const el = openOverlay(`<h2>유품 태엽 — ${crewLabel(c)} <span class="dim">${c.serial}</span></h2>
      <p>* 처치 ${c.kills ?? 0} · 대국 ${c.battles ?? 0}. 가슴의 태엽만 남았다.${q ? ` 기벽 「${q.name}」.` : ''}</p>
      <div class="row heirs">
        <button class="btn" type="button" data-sell>팔기 — 나사 +${CREW.heirloomScrews}</button>
        ${heirs.map((u, k) => `<button class="btn cyan" type="button" data-heir="${k}">${u.name}에게 이식${q ? ` (기벽 → ${q.name})` : ''}</button>`).join('')}
      </div>`);
    el.querySelector('[data-sell]')!.addEventListener('click', () => {
      gold += CREW.heirloomScrews;
      sfx('coin');
      toast(`* 고물상이 태엽을 저울에 올린다. 나사 +${CREW.heirloomScrews}.`);
      window.setTimeout(next, 300);
    });
    el.querySelectorAll<HTMLElement>('[data-heir]').forEach((btn) =>
      btn.addEventListener('click', () => {
        const h = heirs[Number(btn.dataset.heir)];
        const i = squad.indexOf(h);
        squad[i] = { ...h, quirk: c.quirk ?? h.quirk, scars: [...(h.scars ?? []), `${c.name}의 태엽`] };
        squad[i].hp = Math.min(crewMaxHp(squad[i]), squad[i].hp ?? crewMaxHp(squad[i]));
        sfx('awaken');
        toast(`* ${h.name}의 가슴에 ${c.name}의 태엽이 들어간다.`);
        window.setTimeout(next, 300);
      }),
    );
  };
  next();
};

/** 분대 보기: 이름 · 시리얼 · 기벽 · 처치 · 흉터 · 이름 바꾸기 · 폐기 원부 */
const crewView = (): void => {
  const el = openOverlay(`<h2>분대 ${squad.length}</h2><div class="crew-grid">${squad
    .map((u, k) => {
      const q = u.quirk ? QUIRKS[u.quirk] : null;
      return `<div class="crew-card"><span class="rec-art">${pieceImg(u.t, 0, 'large', 40)}</span><div><b>${crewLabel(u)}</b> <span class="dim">${u.serial}</span><br><small>HP ${u.hp ?? crewMaxHp(u)} / ${crewMaxHp(u)} · 처치 ${u.kills ?? 0} · 대국 ${u.battles ?? 0}</small>${q ? `<br><small><span class="quirk">${q.name}</span> ${q.desc}</small>` : ''}${u.scars?.length ? `<br><small class="scar">${u.scars.join(' · ')}</small>` : ''}</div>${u.t !== 'K' ? `<button class="btn sm" type="button" data-rename="${k}">이름</button>` : ''}</div>`;
    })
    .join('')}</div><div class="row"><button class="btn" type="button" data-ledger>폐기 원부 ${readLedger().length}</button><button class="btn brass" type="button" data-close-crew>닫기</button></div>`);
  el.querySelector('[data-close-crew]')!.addEventListener('click', closeOverlay);
  el.querySelector('[data-ledger]')!.addEventListener('click', ledgerView);
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
const ledgerView = (): void => {
  const rows = readLedger();
  const el = openOverlay(`<h2>폐기 원부</h2><p>* 검수관의 장부. 지워지지 않는다.</p><div class="ledger">${
    rows.length
      ? rows.map((r) => `<div class="ledger-row">${pieceImg(r.t, 0, 'small', 22)} <b>${r.name}${r.nick ? ` 「${r.nick}」` : ''}</b> <span class="dim">${r.serial}</span> · 처치 ${r.kills} · 대국 ${r.battles}<br><small>${r.cause} · ${r.run}</small></div>`).join('')
      : '<p class="dim">아직 비어 있다.</p>'
  }</div><div class="row"><button class="btn brass" type="button" data-back>분대로</button></div>`);
  el.querySelector('[data-back]')!.addEventListener('click', crewView);
};

/** 영입 (입문 뒤): 기물 셋 중 하나 — 그 기물의 카드가 같이 들어온다 */
const recruitPick = (head: string, then: () => void): void => {
  const rng = new Rng((Date.now() ^ 0x3c1) & 0xffff);
  const pool = [...RECRUITS];
  const offers: typeof RECRUITS = [];
  while (offers.length < 3 && pool.length) offers.push(pool.splice(rng.int(pool.length), 1)[0]);
  // 셋이 서로 다른 이름 · 기벽
  const crews: Crew[] = [];
  for (const r of offers) crews.push(makeCrew(r.t, crewRng, [...squad, ...crews].map((u) => u.name ?? ''), crews.map((u) => u.quirk!).filter(Boolean)));
  const el = openOverlay(`${head}<p>* 출하 대기열에서 기물 셋이 고개를 든다. 검수관이 불량 사유를 읽는다. 하나를 분대에 넣는다.</p><div class="part-cards">${offers
    .map((r, k) => {
      const c = crews[k];
      const q = c.quirk ? QUIRKS[c.quirk] : null;
      return `<button type="button" class="part-card recruit" data-rec="${k}"><span class="rec-art">${pieceImg(r.t, 0, 'large', 56)}</span><b>${c.name} <span class="dim">${c.serial}</span></b>${q ? `<small class="quirk-line"><b>${q.name}</b> — “${q.reason}”<br>${q.desc}</small>` : ''}<span class="kit-cards">+ ${r.cards.map((id) => COMMANDS[id].name).join(' · ')}</span></button>`;
    })
    .join('')}</div>`);
  el.querySelectorAll<HTMLElement>('[data-rec]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const r = offers[Number(btn.dataset.rec)];
      squad.push(crews[Number(btn.dataset.rec)]);
      deck.push(...r.cards);
      sfx('rare');
      btn.classList.add('picked');
      toast(`* ${crews[Number(btn.dataset.rec)].name}이(가) 분대에 선다.`);
      window.setTimeout(then, 420);
    }),
  );
};

/** 부품 상자 (1판 뒤 — 첫 사기 조합 확정): 부품 + 맞물리는 카드 둘, 셋 중 하나 */
const kitPick = (head: string, then: () => void): void => {
  const rng = new Rng((Date.now() ^ 0x7a2) & 0xffff);
  const pool = KITS.filter((k) => !parts.includes(k.part) && (!k.needs || squad.some((u) => u.t === k.needs)));
  const offers: typeof KITS = [];
  while (offers.length < 3 && pool.length) offers.push(pool.splice(rng.int(pool.length), 1)[0]);
  const el = openOverlay(`${head}<p>* 검수관이 상자를 내민다. 부품 하나와 맞물리는 카드 둘. 하나를 고른다.</p><div class="part-cards">${offers
    .map((k, n) => {
      const d = SLICE_PARTS[k.part];
      return `<button type="button" class="part-card${d.axis ? ` ax-${d.axis}` : ''}" data-kit="${n}"><i class="ico" style="${iconMask(d.icon)}"></i><b>${d.name}${axisTag(d.axis ?? undefined)}</b><small>${d.desc}</small><span class="kit-cards">+ ${k.cards.map((id) => COMMANDS[id].name).join(' · ')}</span></button>`;
    })
    .join('')}</div>`);
  el.querySelectorAll<HTMLElement>('[data-kit]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const k = offers[Number(btn.dataset.kit)];
      parts.push(k.part);
      deck.push(...k.cards);
      sfx('rare');
      btn.classList.add('picked');
      window.setTimeout(then, 420);
    }),
  );
};

/** 부품 고르기 (검문! 통과): 셋 중 하나 */
const partPick = (head: string, then: () => void): void => {
  const rng = new Rng((Date.now() ^ 0x5bd1) & 0xffff);
  const pool = (Object.keys(SLICE_PARTS) as SlicePartId[]).filter((id) => !parts.includes(id));
  const offers: SlicePartId[] = [];
  while (offers.length < 3 && pool.length) offers.push(pool.splice(rng.int(pool.length), 1)[0]);
  const el = openOverlay(`${head}<div class="part-cards">${offers.map((id) => partHtml(id, true)).join('')}</div>`);
  el.querySelectorAll<HTMLElement>('[data-part]').forEach((btn) =>
    btn.addEventListener('click', () => {
      parts.push(btn.dataset.part as SlicePartId);
      sfx('rare');
      btn.classList.add('picked');
      window.setTimeout(then, 380);
    }),
  );
};

const help = (): void => {
  const el = openOverlay(`
    <h2>수직 조각 — 분대 + 명령 덱</h2>
    <ul class="help">
      <li><b>카드</b>를 누르고 → <b>기물</b>을 누르고 → <b>갈 칸</b>을 누른다. 기물을 먼저 눌러도 된다 (맞는 카드를 골라 준다).</li>
      <li>움직인 기물은 내려앉은 자리에서 <b>다음에 갈 수 있는 칸</b>을 친다. 과녁 = 친다 · 금 = 처치.</li>
      <li>카드의 작은 판: 가운데 흰 칸 = 이 기물 · <b style="color:#ff8a6a">붉은 칸</b> = 가서 치는 범위 · <b style="color:#4ec3d6">청록</b> = 이동만 · 줄 = 막힐 때까지 간다 (위쪽이 앞).</li>
      <li>카드 왼쪽 위 숫자 = <b>태엽</b>. 한 턴에 ${SLICE.ap}. 같은 기물을 여러 번 움직여도 된다.</li>
      <li>이번 턴에 처치할 때마다 <b>연쇄</b> 배수가 오른다 (×${chainMult(1).toFixed(2)} → ×${chainMult(2).toFixed(2)} …). 순서가 곧 화력.</li>
      <li><b>붉게 깜빡이는 칸</b> = 적이 예고한 칠 칸. 번호 = 이번에 움직일 적. 먼저 쓰러뜨리면 취소, 비키면 빗나간다, 길을 막으면 못 온다.</li>
      <li><b>나사 트랙</b>: 턴마다 한 칸씩 사라진다. 빨리 이길수록 많이 받는다.</li>
      <li><b>되감기</b>: 이번 턴 처음으로, 대국마다 한 번. 분대 HP는 다음 판으로 이어진다.</li>
      <li><b>넘친 피해</b>: 적 HP를 넘어선 피해 10마다 나사 1. 배수를 키울수록 번다.</li>
      <li><b>부품</b>: 규칙을 바꾸는 장치. 1판을 넘으면 부품 상자(카드 둘과 함께), 검문!을 넘으면 하나 더. 카드 띠(기병 · 보병 · 왕관 · 연쇄)와 맞추면 터진다.</li>
    </ul>
    <div class="row"><button class="btn brass" type="button" data-close>닫기</button></div>`);
  el.querySelector('[data-close]')!.addEventListener('click', () => {
    closeOverlay();
  });
};

$('hand').addEventListener('click', (e) => {
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

// 첫 화면 = 첫 판 (글 안내를 먼저 띄우지 않는다 — 조사 B: 30초 안 첫 타격). 규칙은 ? 버튼
start(0);
if (new URLSearchParams(location.search).has('debug')) Object.assign(window as object, { slice: () => b, sliceApi: { cardPieces, cardMoves, previewPlay, tap: (pos: Pos) => onTap(pos), start: (i: number) => start(i) } });
