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
import { COMMANDS, REWARD_COMMANDS, SLICE, START_COMMANDS, type CommandId } from './cards';
import { REST, cardMoves, cardPieces, chainMult, dangerSquares, endTurn, intentHits, liveIntents, newSliceBattle, overhaulSquad, playCard, previewPlay, restSquad, rewind, squadAfter, type SliceBattle, type Squad } from './battle';
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

const BATTLES: { enemy: PieceType[]; kingHp: number; title: string; tell: string }[] = [
  { enemy: ['K', 'P', 'P', 'N'], kingHp: 0.6, title: '1판 — 주조 공정', tell: '* 흑 세트 셋. 붉은 칸이 다음에 맞을 자리다.' },
  { enemy: ['K', 'P', 'P', 'B', 'R'], kingHp: 0.65, title: '2판 — 검문!', tell: '* 룩이 섞였다. 곧은 줄을 조심한다.' },
];

let squad: Squad[] = [{ t: 'K' }, { t: 'P' }, { t: 'P' }, { t: 'N' }, { t: 'B' }];
let deck: CommandId[] = [...START_COMMANDS];
let gold = 0;
let stage = 0;
let b: SliceBattle;
let selCard: number | null = null;
let selPiece: number | null = null;
let busy = false;
/** 첫 안내를 닫았나 (닫은 뒤에 첫 판 한 줄) */
let helped = false;

const renderer = new BoardRenderer(
  $('board'),
  {
    tap: (pos) => void onTap(pos),
    hover: () => {},
    longPress: (pos, x, y) => {
      const p = b.s.pieces.find((q) => q.x === pos.x && q.y === pos.y);
      if (!p) return;
      const el = $('info');
      el.innerHTML = `<b>${pieceImg(p.type, p.side, 'small', 24)} ${p.side === 0 ? '<span class="ally">아군</span>' : '<span class="enemy">적</span>'} ${PIECE_NAMES_KO[p.type]}</b><br>HP ${p.hp} / ${p.maxHp}${p.shield ? ` · 방열판 ${p.shield}` : ''} · ATK ${p.atk}`;
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
        return hits.length ? [{ pos: to, kill: hits.some((h) => h.killed) }] : [];
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
  const pieces = cardPieces(b, i);
  const poor = c.cost > b.ap;
  const none = c.kind !== 'draw' && !pieces.length;
  const off = poor || none || busy || b.s.winner !== null;
  const art = c.who === 'any' ? '<span class="art any">★</span>' : `<span class="art">${pieceImg(c.who, 0, 'large', 40)}</span>`;
  const why = poor ? `<em>태엽 ${c.cost} 필요</em>` : none && !busy ? '<em>움직일 기물 없음</em>' : '';
  return `<button type="button" class="cmd t-${c.who}${selCard === i ? ' armed' : ''}${off ? ' off' : ''}" data-card="${i}" ${off ? 'aria-disabled="true"' : ''}>
    <span class="cost" aria-label="태엽 ${c.cost}">${c.cost}</span>${art}<span class="txt"><b>${c.name}</b><small>${c.desc}</small>${why}</span></button>`;
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
  $('turn-label').textContent = b.s.winner !== null ? '대국 끝' : busy ? '적 차례' : `${b.turn}턴 · 내 차례`;
  $('turn-label').classList.toggle('enemy', busy);
  $('hand').innerHTML = `<p class="hand-head">손패 ${b.hand.length} · 덱 ${b.draw.length} · 버림 ${b.discard.length}</p>${b.hand.map(cardHtml).join('') || '<p class="empty">손패가 비었다. 턴을 끝낸다.</p>'}`;
  $('vials').innerHTML = Array.from({ length: SLICE.ap }, (_, i) => `<img class="${i < b.ap ? 'full' : 'spent'}" src="ui/hud/key-${i < b.ap ? 'full' : 'spent'}.png" alt="">`).join('');
  $('coins').innerHTML = `<span class="lbl">나사</span>${Array.from({ length: SLICE.coins }, (_, i) => `<i class="coin${i < b.coins ? '' : ' gone'}"></i>`).join('')}<b>${b.coins * SLICE.coinValue}</b>`;
  ($('btn-rewind') as HTMLButtonElement).disabled = b.rewound || busy || b.s.winner !== null;
  $('btn-rewind').innerHTML = `◀◀ 되감기 <small>${b.rewound ? '0' : '1'}/1</small>`;
  ($('btn-end') as HTMLButtonElement).disabled = busy || b.s.winner !== null;
  meter();
};

/** 연쇄 계기판 (Balatro식): 이번 턴 피해 합계와 배수 — 처치가 쌓일수록 크고 뜨겁게 */
const meter = (): void => {
  const m = $('meter');
  if (!turnDmg && !b.kills) {
    m.hidden = true;
    return;
  }
  m.hidden = false;
  m.className = `meter lv${Math.min(b.kills, 4)}`;
  m.innerHTML = `<small>이번 턴</small><span class="dmg">−${turnDmg}</span><b>연쇄 ${b.kills} · ×${chainMult(b.kills).toFixed(2)}</b>`;
};

/** 처치 순간 (연쇄): 판 한가운데 큰 글자 + 판 흔들림 + 음이 올라간다 */
const chainPop = (kills: number): void => {
  const el = document.createElement('div');
  el.className = `chainpop lv${Math.min(kills, 4)}`;
  el.innerHTML = `<small>연쇄 ${kills}</small>×${chainMult(kills).toFixed(2)}${kills >= 3 ? '!' : ''}`;
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
  if (c.cost > b.ap) return toast(`태엽이 모자라다. (${c.cost} 필요)`);
  if (c.kind === 'draw') {
    sfx('tap');
    playCard(b, i);
    selCard = selPiece = null;
    return refresh();
  }
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
    .filter(({ c, i }) => c.kind === 'move' && c.cost <= b.ap && cardPieces(b, i).some((q) => q.id === p.id))
    .sort((x, y) => Number(x.c.who === 'any') - Number(y.c.who === 'any') || x.c.cost - y.c.cost);
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

const run = async (i: number, pieceId: number, to?: Pos): Promise<void> => {
  const r = playCard(b, i, pieceId, to);
  if (typeof r === 'string') return toast(r);
  selCard = selPiece = null;
  busy = true;
  refresh();
  showBefore(r.before);
  await renderer.play(r.before, r.events);
  busy = false;
  turnDmg += dealt(r.events, 0, r.before);
  renderer.setup(b.s);
  refresh();
  if (b.kills > prevKills) chainPop(b.kills);
  prevKills = b.kills;
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
  refresh();
  showBefore(r.before);
  await renderer.play(r.before, r.events);
  busy = false;
  renderer.setup(b.s);
  refresh();
  if (b.s.winner !== null) return finish();
  sfx('submit');
};

// ---------- 흐름 ----------
const start = (i: number): void => {
  stage = i;
  const def = BATTLES[i];
  b = newSliceBattle(squad, def.enemy, deck, 100 + i * 17 + Math.floor(Math.random() * 1000), { enemyKingHp: def.kingHp });
  selCard = selPiece = null;
  busy = false;
  turnDmg = 0;
  prevKills = 0;
  closeOverlay();
  renderer.setup(b.s);
  refresh();
  if (i > 0 || helped) window.setTimeout(() => toast(`${def.title} ${def.tell}`, 2600), 300);
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
    const earned = b.coins * SLICE.coinValue;
    gold += earned;
    const before = squad;
    const survived = squadAfter(b, squad);
    const fallen = before.map((u) => u.t);
    for (const u of survived) fallen.splice(fallen.indexOf(u.t), 1);
    // 판 사이 기본 회복: 남은 분대 최대 HP의 30%
    squad = restSquad(survived);
    if (stage + 1 >= BATTLES.length) {
      openOverlay(`<div class="stamp-big good">통과</div><h2>수직 조각 끝</h2><p>* 남은 분대 ${squad.length}기 · 나사 ${gold} · 덱 ${deck.length}장.</p><p class="dim">손맛이 어땠는지 — 카드 · 붉은 칸 · 연쇄 · 되감기 — 한 줄씩 알려 주면 다음 조각에 반영한다.</p><div class="row"><button class="btn brass" type="button" data-restart>처음부터</button></div>`)
        .querySelector('[data-restart]')!
        .addEventListener('click', () => location.reload());
      return;
    }
    const rng = new Rng(Date.now() & 0xffff);
    const pool = [...REWARD_COMMANDS];
    const offers: CommandId[] = [];
    while (offers.length < 3) offers.push(pool.splice(rng.int(pool.length), 1)[0]);
    const lost = BATTLES[stage].enemy.length;
    const el = openOverlay(`
      <h2>통과 — 나사 +${earned} <small class="dim">(남은 나사 칸 ${b.coins} × ${SLICE.coinValue})</small></h2>
      <p>* 쓰러진 흑 ${lost}기의 상자에서 명령 카드가 나온다. 하나를 덱에 넣는다.</p>
      <div class="reward-cards">${offers
        .map((id) => {
          const c = COMMANDS[id];
          const who = c.who === 'any' ? '<span class="who any">아무나</span>' : pieceImg(c.who, 0, 'small', 26);
          return `<button type="button" class="cmd big" data-pick="${id}"><span class="cost">${c.cost}</span>${who}<b>${c.name}</b><small>${c.desc}</small></button>`;
        })
        .join('')}</div>
      <p class="rest-line">* 쉬는 사이 기름칠 — 남은 분대 HP +${Math.round(REST.heal * 100)}%: ${squad.map((u) => `${PIECE_NAMES_KO[u.t]} ${u.hp}`).join(' · ')}${fallen.length ? ` · <span class="bad">쓰러짐: ${fallen.map((t) => PIECE_NAMES_KO[t]).join(' · ')}</span>` : ''}</p>
      <div class="row">
        <button class="btn" type="button" data-skip>건너뛰기</button>
        <button class="btn cyan" type="button" data-overhaul>정비 — ${fallen.length ? `쓰러진 ${PIECE_NAMES_KO[[...fallen].sort((a, c) => (COST_ORDER[c] ?? 0) - (COST_ORDER[a] ?? 0))[0]]}을 HP 50%로 되살리고 ` : ''}모두 HP +${Math.round(REST.overhaul * 100)}% (카드 대신)</button>
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
    el.querySelector('[data-overhaul]')!.addEventListener('click', () => {
      const o = overhaulSquad(squad, fallen);
      squad = o.squad;
      sfx('awaken');
      toast(o.revived ? `* ${PIECE_NAMES_KO[o.revived]}이(가) 다시 선다.` : '* 분대가 기름을 먹는다.');
      window.setTimeout(() => start(stage + 1), 500);
    });
  }, 700);
};

const help = (): void => {
  const el = openOverlay(`
    <h2>수직 조각 — 분대 + 명령 덱</h2>
    <ul class="help">
      <li><b>카드</b>를 누르고 → <b>기물</b>을 누르고 → <b>갈 칸</b>을 누른다. 기물을 먼저 눌러도 된다 (맞는 카드를 골라 준다).</li>
      <li>움직인 기물은 내려앉은 자리에서 <b>다음에 갈 수 있는 칸</b>을 친다. 과녁 = 친다 · 금 = 처치.</li>
      <li>카드 왼쪽 위 숫자 = <b>태엽</b>. 한 턴에 ${SLICE.ap}. 같은 기물을 여러 번 움직여도 된다.</li>
      <li>이번 턴에 처치할 때마다 <b>연쇄</b> 배수가 오른다 (×${chainMult(1).toFixed(2)} → ×${chainMult(2).toFixed(2)} …). 순서가 곧 화력.</li>
      <li><b>붉게 깜빡이는 칸</b> = 적이 예고한 칠 칸. 번호 = 이번에 움직일 적. 먼저 쓰러뜨리면 취소, 비키면 빗나간다, 길을 막으면 못 온다.</li>
      <li><b>나사 트랙</b>: 턴마다 한 칸씩 사라진다. 빨리 이길수록 많이 받는다.</li>
      <li><b>되감기</b>: 이번 턴 처음으로, 대국마다 한 번. 분대 HP는 다음 판으로 이어진다.</li>
    </ul>
    <div class="row"><button class="btn brass" type="button" data-close>닫기</button></div>`);
  el.querySelector('[data-close]')!.addEventListener('click', () => {
    closeOverlay();
    if (!helped) {
      helped = true;
      window.setTimeout(() => toast(`${BATTLES[stage].title} ${BATTLES[stage].tell}`, 2600), 200);
    }
  });
};

$('hand').addEventListener('click', (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-card]');
  if (el) pickCard(Number(el.dataset.card));
});
$('btn-end').addEventListener('click', () => void onEnd());
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

start(0);
help();
if (new URLSearchParams(location.search).has('debug')) Object.assign(window as object, { slice: () => b, sliceApi: { cardPieces, cardMoves, previewPlay, tap: (pos: Pos) => onTap(pos) } });
