import '../fonts.css';
import { josa } from '../data/josa';
import { BOSS_EPITHET, HUD_TEXT, KEYWORDS, LIFE_TEXT, type TermGate } from '../data/hud';
import '../style.css';
import './slice.css';
import { sfx } from '../audio/sfx';
import { installPressFeedback } from '../ui/motion';
import { PACE } from '../data/motion';
/** 동작 줄이기 */
const calmNow = (): boolean => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
import { dissolveAll, flyTo, installPressy, installUiSprites, mountPart, nope, screwBurst, shutter, sparksAt, titleFx } from './uifx';
import { installPixelAnimate, gradeReveal, buyFx, curtainRows, dealHand, discardHand, healFx, koBanner, modalIn, modalOut, pxOut, replay, shake, stampFx, sweep, tally, toastIn, toastOut, turnBanner, turnLabel, typeIn } from './fx3';
import { crestHtml, guide, playCuts, pressHtml, prologue } from './opening';
import { cardTags, partTags, STYLE_NAMES, tags3Html } from './tags';
import { descHtml, splitDesc } from './desc';
import { GUIDE_PAGES } from '../data/opening';
import { COACH_LINES, OPENING_TEXT } from '../data/opening';
import { ACT_ENTRY, BOSS_STORY, BOSS_TAUNTS, CROWN_OFF, DEFEAT, ENDING_A, GILDED_STORY, PROMOTE_TEXT, TESTIMONY, promotionCuts, shadowCut, trueEndingCuts, type StoryBoss } from '../data/script';
import { finaleScene } from './finale';
import { STARTER_CARDS, STARTER_PARTS, nextUnlocks, unlockCount } from '../data/unlocks';
import { creditsScene } from './credits';
import { pieceImg } from '../ui/sprites';
import { BoardRenderer } from '../view/BoardRenderer';
import type { BoardModel } from '../game/controller';
import { PIECE_NAMES_KO } from '../data/pieces';
import { findPiece, samePos, type PieceType, type Pos } from '../engine';
import { cardFits, gradeOf, rollGrade, GRADE, baseOf, isRefined, isRusted, rustOnce, refinedOf, refineOnce, ECON, AXIS_NAMES, BOSS, BOSS_NUM, BOSS_RULES, COMMANDS, FOE_TRAITS, LAB, TRAIT, FORGE, KITS, SHOP, RECRUITS, RECRUIT_ODDS, rollRecruit, REWARD_COMMANDS, SLICE, START_DECK, START_SQUAD, type Axis, type BossRule, type CommandId } from './cards';
import { CHARM_NUM, CHARMS, PART_GRADE, PART_NUM, partFits, SLICE_PARTS, type SlicePartId } from './parts';
import { iconMask } from '../ui/chrome';

/** 색이 든 16칸 도트 아이콘 (D-182): 단색 마스크 대신 그림 그대로, 계단 확대 */
/** 심장 톱니 두 칸 (D-219, 킹 제외): 성한 황동 · 깨진 검은 쇠. mending = 방금 끼운 칸이 떨어져 박힌다 */
const lifePips = (u: Crew, fx: 'mend' | 'break' | '' = ''): string =>
  u.t === 'K' ? '' : `<span class="lifes" role="img" aria-label="${LIFE_TEXT.name} ${u.cracked ? 1 : 2}/2"><i class="life"></i><i class="life${u.cracked ? ' off' : ''}${fx === 'mend' ? ' mending' : fx === 'break' && u.cracked ? ' breaking' : ''}"></i></span>`;
// 심장 톱니 그림은 public 경로라 문서 기준으로 푼다 (base './' — CSS 파일 안 상대 경로는 Vite가 묶으려 든다)
// (변수 속 url은 쓰이는 CSS 파일 기준으로 풀리므로 절대 주소로 넣는다)
document.documentElement.style.setProperty('--life-on', `url(${new URL('ui/icons16/life@16.png', document.baseURI).href})`);
document.documentElement.style.setProperty('--life-off', `url(${new URL('ui/icons16/life.crack@16.png', document.baseURI).href})`);
/** 방금 대국에서 심장 톱니가 깨진 분대원 (보상 화면에서 깨지는 연출) */
let justCracked: string[] = [];
const iconArt = (key: string): string => `background:url(ui/icons16/${key}.png) center/contain no-repeat;-webkit-mask:none;mask:none;image-rendering:pixelated`;
/** 16px 칸용 (D-290: 아이콘이 32도트가 되면 반으로 줄인 그림을 따로 쓴다 — 브라우저 축소는 바깥선을 끊는다) */
const iconArtSmall = (key: string): string => iconArt(`${key}@16`);
import { CREW, DEATHS, QUIRKS, crewLabel, makeCrew, type Crew, type LedgerEntry } from './crew';
import { CREW_VOICE, type CrewKind } from '../data/crew-voice';
import { ASC_NUM, ASCENSION, battleFor, buildRun, FINAL_BOSS, INTRO, MAP, NODE_DESC, NODE_ICONS, NODE_NAMES, type Act, type BattleDef, type MapNode } from './run';
import { counterweight, SLICE_EVENTS, SLICE_EVENT_IDS, weighable, type EventState, type SliceEventId } from './events';
import { EVENT_TALK, REFINE_TALK, type EventTalk } from '../data/event-talk';
import { runEventFx, type CardFx, type CrewFx } from './evstage';
import { EVENT_OUTCOME } from '../data/event-outcome';
import { bossIntro, type BossKey } from './bossintro';
import { addNemesis, betterHighlight, BETS, dir, DIRECTOR, isCloseCall, settleBet, TAUNTS, type BetKind, type Highlight, type Nemesis, type TauntCue } from './director';
import { bestAction } from './bot';
import { PLAYTEST_TEXT as PT, SURVEY } from '../data/playtest';
import { IMPACT } from '../data/fx';
import { warmup } from './warmup';
import { TUT } from '../data/tutorial';
import { runTutorial, type TutStep } from './tutorial';
import { telemetryAll, telemetryClear, telemetrySession, telemetryStore, track } from './telemetry';
import { clearSave, dailySeed, defaultStore, readMeta, readSave, recordRun, todayKey, writeMeta, writeSave, type RunSave } from './save';
import { depthAt, REST, intentPlan, chainAdd, foeDmg, promotedIn, clutchBoost, kingDoomed, sacrificeCandidates, sacrificeSwap, canPlay, crackOrScrap, mendSquad, crewMaxHp, fallenAfter, costOf, isInstant, cardMoves, cardPieces, chainMult, dangerSquares, endTurn, intentHits, liveIntents, newSliceBattle, overhaulSquad, playCard, previewPlay, restSquad, rewind, squadAfter, type SliceBattle, type Squad } from './battle';
import type { BattleState, BattleEvent } from '../engine';
import { shapeHtml } from './shape';
import { Rng } from '../engine/rng';

installPixelAnimate();

// 판 배치 시안 (D-198 7번): ?layout=b|c — 사용자가 고르면 기본으로 굳힌다
{
  const lay = new URLSearchParams(location.search).get('layout');
  // 기본 = 4안 (D-206, 사용자 결정): 판 무대 + 아래 부채꼴 손패 + 판 옆 적 초상. ?layout=a(예전) · b · c 는 비교용
  if (lay === 'b' || lay === 'c') document.body.classList.add(`lay-${lay}`);
  else if (lay !== 'a' && lay !== 'd' && lay !== 'e') {
    // 기본 = F안 탄창 (D-208, 사용자 결정): 왼쪽 = 손패를 탄약처럼 얇게 적재(누르면 그 탄만 펼쳐 상세), 오른쪽 = 직전 공격 계산 · 전투 기록.
    // 적의 수 · 반장 규칙은 판이 보여 주므로 레일에서 뺀다 (반장은 이름 한 줄 — 누르면 규칙)
    document.body.classList.add('lay-f');
    const log = document.createElement('div');
    log.id = 'blog';
    log.className = 'blog';
    document.getElementById('meter')!.before(log);
    // 덱 · 분대 · 버림 = 왼쪽 아래 고정 (탄창은 그 위에서 위아래로 밀린다) · 되감기 = 턴 옆 작은 단추
    const dr = document.createElement('div');
    dr.id = 'deckrow';
    dr.className = 'deckrow';
    document.getElementById('left')!.appendChild(dr);
    // 좌우 거울 배치 (D-210): 위 = 계기(태엽 ↔ 턴 · 속전) · 가운데 = 밀리는 칸(탄창 ↔ 반장 · 직전 공격 · 기록) · 아래 = 단추 줄(덱 ↔ ? · 되감기 · 턴 끝)
    const right = document.getElementById('right')!;
    const top = document.createElement('div');
    top.className = 'gtop';
    top.append(document.getElementById('turn-label')!, document.getElementById('coins')!);
    const mid = document.createElement('div');
    mid.className = 'rmid';
    mid.append(...(['boss', 'parts', 'blog'].map((id) => document.getElementById(id)!)));
    right.prepend(top);
    top.after(mid);
    const act = right.querySelector('.actions')!;
    act.prepend(document.getElementById('btn-rewind')!);
    // 도움말(지금 화면 · 용어 · 안내서)은 판 무대 오른쪽 위 — 자주 안 누르고 턴 끝과 멀어야 한다 (D-211)
    const help = document.getElementById('btn-help')!;
    help.classList.add('cog-help');
    help.innerHTML = '<i aria-hidden="true"></i>';
    document.getElementById('board')!.appendChild(help);
    right.querySelector('.rail-head')?.remove();
  } else if (lay === 'e') {
    // 기본 = E안 (D-207, 사용자: "좌우가 쓸데없는 정보나 텅 비어 있다"): 판은 화면 높이 꽉, 왼쪽 = 내 선택지(손패 2열 · 설명까지), 오른쪽 = 적의 수(예고 목록) · 연쇄 · 턴 끝
    document.body.classList.add('lay-e');
    const plan = document.createElement('div');
    plan.id = 'foeplan';
    plan.className = 'foeplan';
    document.querySelector('#right .rail-head')!.after(plan);
  } else if (lay === 'd') {
    document.body.classList.add('lay-d');
    // 배치 옮기기: 턴 · ? · 증기 · 반장 규칙 · 부품 → 왼쪽 기둥, 오른쪽 기둥 위에 적 초상
    const left = document.getElementById('left')!;
    const hand = document.getElementById('hand')!;
    const head = document.querySelector('#right .rail-head')!;
    for (const el of [head, document.getElementById('coins'), document.getElementById('boss'), document.getElementById('parts')]) if (el) left.insertBefore(el, hand);
    left.insertBefore(document.getElementById('vials')!, head.nextSibling);
    // 손패는 화면 아래 가운데 고정 — 기둥의 transform 안에 있으면 fixed가 기둥 기준이 되므로 body로 뺀다
    document.body.appendChild(hand);
    const pt = document.createElement('div');
    pt.id = 'portrait';
    pt.className = 'portrait';
    document.getElementById('right')!.prepend(pt);
  }
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
/** 이번 출하에 열려 있는 카드 · 부품 (D-284 해금) — 오늘의 출하 · 시험장은 전부 */
let openIds: Set<string> | null = null;
const isOpen = (id: string): boolean => !openIds || openIds.has(baseOf(id as CommandId)) || openIds.has(id);
/** 이번 출하에서 쓰러뜨린 반장 (도금왕의 비꼼 · 거울, 각본 §8.1 · §10.1) */
let runBosses: StoryBoss[] = [];
let daily: string | null = null;
/** 처음 출하인가 (D-232): 첫 판 안전망 · 첫 고물상 · 용어 단계 */
let firstShip = false;
/** 이번 출하에 들른 고물상 수 (첫 고물상 맞물림 부품, D-232) */
let shopsSeen = 0;
/** 고물상 다듬기 · 빼기를 이번 출하에 쓴 횟수 (D-247 — 쓸수록 값이 오른다) */
let svcUsed = { refine: 0, remove: 0 };
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
let tauntCount = 0;
let begSaid = false;
let betNow: { kind: BetKind; stake: number } | null = null;
let nemesisNow: Nemesis | null = null;
/** 사선 보상 등급 (보상 흐름에서 쓴다) */
let closeTier = 0;
/** 원수 목록 (출하를 넘어 남는다 — 기록에 저장) */
const nemeses = (): Nemesis[] => readMeta(store).nemeses ?? [];
const setNemeses = (list: Nemesis[]): void => writeMeta(store, { ...readMeta(store), nemeses: list });

/** 적 킹의 한 마디 (대국마다 한 줄까지, 확률로만 — 매 판 떠들지 않는다) */
/** 합류 대사 (D-324): 새 분대원이 제 성격대로 한마디 — 흰 기물 얼굴의 말풍선, 이름 아래 */
const crewSay = (t: PieceType, name: string): void => {
  const lines = CREW_VOICE[t as CrewKind]?.join;
  if (!lines) return void toast(`${josa(name, '이')} 분대에 합류했습니다.`);
  const line = lines[R.int(lines.length)];
  document.querySelector('.taunt.crew-say')?.remove();
  const el = document.createElement('div');
  el.className = 'taunt tq3 crew-say';
  el.innerHTML = `<i class="taunt-face"><img class="crew-face" src="ui/hud/crew-${t}.png" alt="" width="56" height="56" onerror="this.outerHTML=this.dataset.fb" data-fb='${pieceImg(t, 0, 'small', 40).replace(/'/g, '&#39;')}'></i><span class="tq-t"><b class="cs-name">${name} — 합류</b><b class="tq-ghost" aria-hidden="true">${line}</b><b class="tq-live"></b></span>`;
  document.body.appendChild(el);
  sfx('rare');
  window.setTimeout(() => void typeIn(el.querySelector<HTMLElement>('.tq-live')!, line, 30), 200);
  window.setTimeout(() => pxOut(el, () => el.remove()), 1200 + line.length * 55);
};
const taunt = (cue: TauntCue, force = false): void => {
  if (labMode) return;
  // 반장은 판에서 셋까지 말한다(규칙 발동 · 몰림 · 처치 — 상황마다 제 말, D-311), 보통 적 킹은 한 번
  if (b?.boss ? tauntCount >= 3 : tauntedNow) return;
  if (!force && R.next() > (b?.boss && cue !== 'cheese' && cue !== 'gloat' ? 0.6 : DIRECTOR.taunt)) return;
  // 「비겁하다」는 드물게 (테스터: 「그건 반칙 아닌가?」가 너무 자주 나왔다) — 보통 적 킹은 DIRECTOR.cheeseGap 대국에 한 번
  if (!force && cue === 'cheese' && !b?.boss) {
    if (battlesFought - lastCheese < DIRECTOR.cheeseGap) return;
    lastCheese = battlesFought;
  }
  tauntedNow = true;
  tauntCount += 1;
  const lines = (b?.boss && BOSS_TAUNTS[(b.bossRule ?? 'plate') as keyof typeof BOSS_TAUNTS]?.[cue]) || TAUNTS[cue]; // 반장마다 제 말 (D-310)
  const line = lines[R.int(lines.length)];
  const el = document.createElement('div');
  el.className = 'taunt tq3';
  // 말하는 왕의 얼굴 (2026-11-05): 반장이면 반장 초상화의 왕관 · 머리, 보통 대국은 검정 킹 — 같은 황동 틀
  const face = b?.boss ? `<i class="taunt-face tf-boss" style="background-image:url(ui/hud/avatar-${b.bossRule ?? 'plate'}.png)"></i>` : `<i class="taunt-face">${pieceImg('K', 1, 'small', 40)}</i>`;
  // 말풍선 너비는 처음부터 다 찍힌 글 기준 (테스터: 글자가 찍히는 동안 창이 좌우로 왔다 갔다 했다) — 보이지 않는 전문 위에 겹쳐 찍는다
  const words = line.split(' ');
  const last = words.pop() ?? '';
  const full = `${words.length ? `${words.join(' ')} ` : ''}<em>${last}</em>`;
  el.innerHTML = `${face}<span class="tq-t"><b class="tq-ghost" aria-hidden="true">${full}</b><b class="tq-live"></b></span>`;
  document.body.appendChild(el);
  // D-189: 말풍선이 튀어나오고 글자가 타자처럼 찍히다 마지막 낱말에서 떨린다
  window.setTimeout(() => void typeIn(el.querySelector<HTMLElement>('.tq-live')!, full, 40, () => shake(el, 1)), 200);
  window.setTimeout(() => pxOut(el, () => el.remove()), 2900);
};
/** 이번 출하에서 치른 대국 수 · 마지막으로 「비겁하다」를 들은 대국 */
let battlesFought = 0;
let lastCheese = -99;
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
/** 부적 (D-228): 부품 칸을 안 쓰는 개수 — 여벌 심장 톱니(1패 대신) · 역회전 톱니(되감기) */
let charms = { revive: 0, rewind: 0 };
/** 손패 화면을 잠시 붙잡는다 (턴 끝 버리기 연출 · 적 차례 동안) — null이면 지금 손패 */
let handView: CommandId[] | null = null;
/** 이번 대국 시작 때 되감기 수 (끝나면 쓴 만큼 역회전 톱니를 깬다) */
let rewindsAtStart = 0;
let stage = 0;
let b: SliceBattle;
let selCard: number | null = null;
/** 탄창(F안)에서 펼쳐 둔 탄 — 한 번 누르면 펼치고 펼친 탄을 한 번 더 누르면 쓴다 (D-209) */
let openCard: number | null = null;
let selPiece: number | null = null;
let busy = false;
/** 배율 표기: 큰 값은 줄여 레일 밖으로 넘치지 않게 (페르소나 테스트 m11) — ×1.25 · ×128 · ×5.6만 · ×3.2억 */
const fmtMult = (v: number): string =>
  v < 100 ? v.toFixed(2) : v < 10000 ? String(Math.round(v)) : v < 1e8 ? `${(v / 1e4).toFixed(1)}만` : `${(v / 1e8).toFixed(1)}억`;

/** 적이 두는 중 (레일 상태 표시) */
let enemyTurn = false;

/** 적 특성 한 줄 (길게 누르기, D-175) */
const foeTraitLine = (p: { side: number; type: PieceType }): string => foeTraitBase(p) + foeTraitExtra(p);
/** 적 특성 넷 (D-275) — 그 유형에 붙은 것만 */
const foeTraitExtra = (p: { side: number; type: PieceType }): string => {
  if (p.side !== 1) return '';
  const key = p.type === 'N' ? 'knightShoe' : p.type === 'B' ? 'bishopLens' : p.type === 'P' ? 'pawnDrill' : p.type === 'Q' ? 'queenCrown' : null;
  return key && (b.traits ?? []).includes(key) ? `<br><span class="enemy">${FOE_TRAITS[key].name}</span> ${FOE_TRAITS[key].line.split(' — ')[1]}` : '';
};
const foeTraitBase = (p: { side: number; type: PieceType }): string =>
  p.side !== 1 ? '' :
  p.type === 'K' && b.boss && b.bossRule === 'plate' ? `<br><span class="enemy">철갑 · 줄 폭격</span> 두 턴마다 철갑 ${BOSS.plate}을 다시 두르고 두 턴마다 한 줄에 ${foeDmg(BOSS.bombDamage, b)}` :
  p.type === 'K' && b.boss && b.bossRule === 'spawn' ? `<br><span class="enemy">조립</span> 두 턴마다 곁에 폰을 찍어 낸다 (셋까지)` :
  p.type === 'K' && b.boss && b.bossRule === 'inspect' ? `<br><span class="enemy">검수</span> 두 턴마다 가장 센 내 기물에 불량 도장 — 그 기물의 공격 ×${BOSS_NUM.stampMult}` :
  p.type === 'K' && b.boss && b.bossRule === 'magnet' ? `<br><span class="enemy">자석</span> 두 턴마다 가장 가까운 내 기물을 한 칸 끌어당긴다 (자석 표시)` :
  p.type === 'K' && b.boss && b.bossRule === 'alarm' ? `<br><span class="enemy">경보 ${b.alarm ?? 0}/${BOSS_NUM.alarmFull}</span> 눈금이 차면 그 적 차례 공격 ×${BOSS_NUM.alarmMult}` : p.type === 'P' && b.blastPawns ? `<br><span class="enemy">자폭</span> 쓰러지면 둘레 내 기물에 ${foeDmg(TRAIT.blast, b)}` : p.type === 'K' && b.boss && (b.bossRule === 'thorns' || b.bossRule === 'gilded') ? `<br><span class="enemy">되받아침</span> 치고 못 쓰러뜨리면 친 기물이 ${foeDmg(BOSS_NUM.thorns, b)}을 받는다` : '';

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
      // 손가락에 가리지 않게 누른 곳의 왼쪽 위에 (오른쪽 아래 모서리가 손끝 24px 위 · 왼쪽), 화면 밖이면 반대쪽으로 (D-245)
      const iw = el.offsetWidth;
      const ih = el.offsetHeight;
      const lx = x - iw - 16 >= 8 ? x - iw - 16 : Math.min(innerWidth - iw - 8, x + 24);
      const ty = y - ih - 24 >= 8 ? y - ih - 24 : Math.min(innerHeight - ih - 8, y + 32);
      el.style.left = `${Math.round(lx)}px`;
      el.style.top = `${Math.round(ty)}px`;
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
  // 읽을 시간 (D-263 — 사람이 못 읽을 만큼 빨리 넘어가지 않게): 글자당 70ms + 1.2초보다 짧게 두지 않는다
  ms = Math.max(ms, 1200 + msg.length * 70);
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
    fireRow: b.s.winner === null ? b.bombRow : null,
    intent: b.s.winner === null && !busy ? { state: b.s, plan: liveIntents(b), hits: intentHits(b) } : null,
  };
};

// ---------- 레일 ----------
const cardHtml = (id: CommandId, i: number): string => {
  if (document.body.classList.contains('lay-f')) return magHtml(id, i);
  const c = COMMANDS[id];
  // 실제 태엽: 행진 북 · 재도약이면 싸진다 (기물마다 다르면 가장 싼 값)
  const costs = isInstant(id) ? [costOf(b, i)] : b.s.pieces.filter((p) => p.side === 0 && (c.who === 'any' || c.who === p.type)).map((p) => costOf(b, i, p.id));
  const cost = costs.length ? Math.min(...costs) : c.cost;
  const ok = canPlay(b, i);
  const poor = !ok && cost > b.ap;
  const off = !ok || busy;
  const art = cardArt(id);
  const why = busy ? '' : poor ? `<em>태엽 ${cost} 필요</em>` : !ok ? `<em>${c.kind === 'march' ? '앞으로 갈 폰 없음' : c.kind === 'spend' ? '쌓인 연쇄 없음' : '움직일 기물 없음'}</em>` : '';
  // 부채꼴 (4안): 가운데에서 멀수록 기울고 내려간다
  const mid = (b.hand.length - 1) / 2;
  const fan = `--r:${((i - mid) * 5).toFixed(1)}deg;--fy:${Math.round(Math.abs(i - mid) ** 1.4 * 6)}px`;
  return `<button type="button" class="cmd t-${c.who}${selCard === i ? ' armed' : ''}${off ? ' off' : ''}${cost < c.cost ? ' cheap' : ''}" data-card="${i}" style="${fan}" ${off ? 'aria-disabled="true"' : ''}>${opTag(opOfCard(c)) ? `<span class="op-corner">${opTag(opOfCard(c))}</span>` : ''}
    ${keysHtml(cost, b.ap)}${art}<span class="txt"><b>${c.name}${handChips(id)}</b>${why || (c.desc ? `<small>${handDesc(c.desc)}</small>` : '')}${selCard === i ? `<span class="full">${c.desc || '움직여, 내려앉은 자리에서 공격한다.'}</span>` : ''}</span></button>`;
};

/**
 * 탄창의 탄 한 발 (D-209): 머리(비용 · 기물 · 이름) + 몸(펼쳤을 때만 — 효과 문장 · 행마 그림 · 각주).
 * 단순한 카드(기본 행마)는 문장 없이 행마 그림과 칭호만.
 */
const magHtml = (id: CommandId, i: number): string => {
  const c = COMMANDS[id];
  const costs = isInstant(id) ? [costOf(b, i)] : b.s.pieces.filter((p) => p.side === 0 && (c.who === 'any' || c.who === p.type)).map((p) => costOf(b, i, p.id));
  const cost = costs.length ? Math.min(...costs) : c.cost;
  const ok = canPlay(b, i);
  const poor = !ok && cost > b.ap;
  const off = !ok || busy;
  const why = busy ? '' : poor ? `태엽 ${cost} 필요` : !ok ? (c.kind === 'march' ? '앞으로 갈 폰 없음' : c.kind === 'spend' ? '쌓인 연쇄 없음' : '움직일 기물 없음') : '';
  const open = openCard === i || selCard === i;
  const shape = c.who !== 'any' && c.kind === 'move' ? `<span class="mg-shape">${shapeHtml(c.who, 7)}</span>` : '';
  const desc = c.desc ? `<p class="mg-desc">${descHtml(c.desc)}</p>` : '';
  // 기본 행마 카드: 머리 = 칭호(작은 개척자), 몸 = 실제로 하는 일(한 칸 나아가 대각선 앞을 벤다) — 사용자 지적 D-211
  const titled = !!c.title;
  const flv = c.flavor && !titled ? `<p class="mg-flv">${c.flavor}</p>` : '';
  // 움직이는 카드는 한 번 누르면 펼치며 바로 장전(기물 → 칸) — 즉시 카드만 한 번 더 눌러 쓴다 (D-212)
  const hint = off ? `<p class="mg-use">${why || '지금은 쓸 수 없음'}</p>` : isInstant(id) && selCard !== i ? '<p class="mg-use">눌러서 사용</p>' : '';
  return `<button type="button" class="cmd mag t-${c.who}${selCard === i ? ' armed' : ''}${open ? ' open' : ''}${off ? ' off' : ''}${cost < c.cost ? ' cheap' : ''}" data-card="${i}" ${off ? 'aria-disabled="true"' : ''} aria-expanded="${open}">
    <span class="mg-head">${keysHtml(cost, b.ap)}${cardArt(id)}<b>${titled ? c.title : c.name}</b>${handChips(id)}</span>${open ? `<span class="mg-body">${shape}<span class="mg-txt">${desc}${flv}${hint}</span></span>` : ''}</button>`;
};

/**
 * 카드 크게 보기 (D-166, 슬더스식): 손패를 길게 누르거나(터치) 마우스를 올리면 카드 모양으로 전체 효과.
 * 손패는 이름 · 비용 · 수치만 짧게, 자세한 문장 · 각주 · 띠 이름은 여기서.
 */
const peekHtml = (id: CommandId, cost: number): string => {
  const c = COMMANDS[id];
  return `<div class="peek-card t-${c.who}"><div class="pk-top">${keysHtml(cost)}<b>${c.name}</b></div><div class="pk-art">${c.who === 'any' ? `<span class="pk-any"><i class="ico16" style="${iconArt(`c.${baseOf(id)}`)}"></i></span>` : pieceImg(c.who, 0, 'large', 72)}</div><div class="pk-axes">${opTag(opOfCard(c))}${axisTag(seeAx(c.axis))}${axisTag(seeAx(c.axis2))}</div>${c.desc ? `<p class="pk-desc">${c.desc}</p>` : c.who !== 'any' ? `<div class="pk-shape">${shapeHtml(c.who, 9)}</div>` : ''}${c.flavor ? `<p class="pk-flv">${c.flavor}</p>` : ''}</div>`;
};
let peekEl: HTMLElement | null = null;
const showPeek = (cardEl: HTMLElement): void => {
  const i = Number(cardEl.dataset.card);
  const id = b.hand[i];
  if (!id) return;
  hidePeek();
  peekAt = { id, t: Date.now() };
  const r = cardEl.getBoundingClientRect();
  peekEl = document.createElement('div');
  peekEl.className = 'peek';
  peekEl.dataset.for = cardEl.dataset.card ?? '';
  peekEl.innerHTML = peekHtml(id, Number(cardEl.querySelector('.costgear')?.getAttribute('aria-label')?.replace(/\D/g, '') ?? COMMANDS[id].cost));
  peekEl.style.visibility = 'hidden';
  document.body.appendChild(peekEl);
  const h = peekEl.offsetHeight;
  if (document.body.classList.contains('lay-d')) {
    // 아래 부채꼴 손패: 크게 보기는 카드 위로 (판 가운데 위쪽)
    const w = peekEl.offsetWidth;
    peekEl.style.left = `${Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2))}px`;
    peekEl.style.top = `${Math.max(8, r.top - h - 10)}px`;
  } else {
    peekEl.style.left = `${r.right + 10}px`;
    peekEl.style.top = `${Math.max(8, Math.min(window.innerHeight - h - 8, r.top + r.height / 2 - h / 2))}px`;
  }
  // D-189: 도트가 아래에서 쓸어 올리며 드러내고 닫을 땐 위에서 쓸어 내린다
  sweep(peekEl, true);
};
/** 크게 보기를 연 카드 · 시각 (용어 툴팁 지표 ⑦ — 카드 설명을 몇 번 · 얼마나 오래 읽나) */
let peekAt: { id: string; t: number } | null = null;
const hidePeek = (): void => {
  const el = peekEl;
  peekEl = null;
  if (peekAt) {
    const ms = Date.now() - peekAt.t;
    if (ms > 300) track('tooltip_inspect', { term_id: `card:${peekAt.id}`, dwell_ms: ms, act: actI + 1 });
    peekAt = null;
  }
  if (el) sweep(el, false, () => el.remove(), 220);
};

/** 카드 그림: 움직이는 카드는 행마 그림(갈 칸 · 칠 칸), 그 밖은 기물 그림 · 기호 */
const cardArt = (id: CommandId): string => {
  const c = COMMANDS[id];
  // 기물 없는 카드: 카드마다 도트 아이콘 (D-182, public/ui/icons16/c.<id>.png)
  if (c.who === 'any') return `<span class="art any"><i class="ico16" style="${iconArt(`c.${baseOf(id)}`)}"></i></span>`;
  // 기물 아이콘 (D-162 — 행마 판보다 「누가 움직이나」가 먼저 읽힌다. 범위는 판 위 표시가 보여 준다)
  // 기물 그림은 72칸 캔버스 아래쪽에 서 있다(위 8줄은 왕관 자리) — 실제 몸통 가운데가 창 가운데에 오게 올린다 (2026-11-05, 사용자: 「아이템 가운데 정렬 — 일부는 바닥, 일부는 가운데」)
  const dy = Math.round((0.5 - (PIECE_ART_CENTER[c.who] ?? 0.5)) * 36); // 그림 36px 기준 (D-305)
  return `<span class="art" style="transform:translateY(${dy}px)">${pieceImg(c.who, 0, 'large', 44)}</span>`;
};
/** 기물 그림(l-*.png) 안 보이는 몸통의 세로 가운데 (0~1) — tools/pixel/maker.py가 바뀌면 다시 잰다 */
const PIECE_ART_CENTER: Record<string, number> = { P: 0.604, N: 0.569, B: 0.569, R: 0.625, Q: 0.576, K: 0.507 };

/**
 * 카드 비용 = 태엽 열쇠 개수 (D-161): 오른쪽 레일의 태엽과 같은 그림이라 「내 태엽 셋 중 둘」로 읽힌다.
 * have를 주면 지금 남은 태엽보다 많은 열쇠는 빈 열쇠로 (얼마나 모자란지 보인다). 0이면 빈 열쇠 + 0.
 */
const keysHtml = (n: number, have = Infinity): string =>
  `<span class="costgear${n > have ? ' short' : ''}" aria-label="태엽 ${n}"><img src="ui/board/badge-c${Math.max(0, Math.min(9, n))}.png" alt=""></span>`;

/** 손패용 짧은 설명 (D-163): 괄호 수치가 있으면 「문장 첫 마디 · 수치」, 없으면 문장 그대로. 전체 문장은 보상 · 덱 보기에 */
/** 손패 한 줄: 성능만 (D-336 — 조건 · 묘사는 펼쳤을 때) */
const handDesc = (d: string): string => splitDesc(d).fx || d;

/** 지금 분대로 쓸 수 있는 카드인가 (D-164): 그 기물이 분대에 있어야 보상 · 상자에 나온다. 폰 전용 즉시 카드(총진격 · 제물)도 폰이 있어야 */
const usable = (id: CommandId): boolean => {
  return cardFits(id, squad.map((u) => u.t));
};

/** 합(+) · 곱(×) 표지 (D-205): 카드 · 부품이 피해 식의 어느 쪽에 붙는지 — 최종 = (공격 + 합) × 곱 */
const opOfCard = (c: (typeof COMMANDS)[CommandId]): '+' | '×' | null => (c.add ? '+' : c.mult || c.multPerKill || c.rage ? '×' : null);
/**
 * 카드 설명 줄 나누기 (2026-11-05, 사용자: 「온점 단위는 엔터, 괄호는 한 줄 먹게, 최대 4줄」):
 * 문장(…다.)마다 한 줄, 괄호 묶음 (…)은 따로 한 줄. 줄 안에서는 수치가 끊기지 않게 낱말 단위로만 접힌다.
 */
/**
 * 도트 스크롤 막대 (2026-11-05): 휴대폰 브라우저는 스크롤 막대 꾸밈을 무시하고 숨긴다 → 우리 막대를 따로 그려 위치를 맞춘다.
 * 쇠 홈 + 황동 손잡이, 손잡이 위치 · 길이는 2px 단위(도트)로만 움직인다. 내용이 다 보이면 숨긴다.
 */
const pxRail = (sc: HTMLElement): void => {
  const box = sc.parentElement!;
  box.querySelector('.px-rail')?.remove();
  const rail = document.createElement('div');
  rail.className = 'px-rail';
  rail.innerHTML = '<i></i>';
  box.appendChild(rail);
  const thumb = rail.firstElementChild as HTMLElement;
  const snap = (n: number) => Math.round(n / 2) * 2;
  const upd = () => {
    const H = rail.clientHeight;
    const r = sc.clientHeight / Math.max(1, sc.scrollHeight);
    rail.hidden = sc.scrollHeight - sc.clientHeight < 12; // 여백 몇 px 넘치는 것은 스크롤이 아니다
    const th = snap(Math.max(28, H * r));
    const max = Math.max(1, sc.scrollHeight - sc.clientHeight);
    thumb.style.height = `${th}px`;
    thumb.style.transform = `translateY(${snap((sc.scrollTop / max) * (H - th))}px)`;
  };
  sc.addEventListener('scroll', upd, { passive: true });
  requestAnimationFrame(upd);
};
/** 설명 문단 (D-333): 묘사 · (기능) · 조건 — 모든 카드 · 부품 · 선택지가 같은 문법 */
const descLines = (text: string, flavor?: string): string => descHtml(text, flavor);
/** 가격표가 붙는 카드(고물상)는 성질 칩(+ · × · 축)을 가격 옆에 — 가격은 카드 한가운데, 칩은 그 오른쪽에 매달린다 */
const footed = (extra: string, attrs = ''): boolean => extra.includes('class="price') || attrs.includes('data-pick');
const cfFoot = (price: string, chips: string): string => `<span class="cf-foot">${price}${chips ? `<span class="cf-chips">${chips}</span>` : ''}</span>`;
const opTag = (op: '+' | '×' | null | undefined): string => (op ? `<i class="op op-${op === '+' ? 'add' : 'mul'}" aria-label="${op === '+' ? '합' : '곱'}">${op}</i>` : '');
/** 빌드 축 띠 */
const axisTag = (a?: Axis): string => (a ? ` <i class="axis ax-${a}">${AXIS_NAMES[a]}</i>` : '');
/** 카드의 부품 띠를 보여 주나 (D-233 3단계): 첫 출하에서는 내가 단 부품의 띠만 — 「이 카드가 내 부품과 맞물린다」만 읽히게. 둘째 출하부터 다섯 띠 모두 */
const seeAx = (a?: Axis): Axis | undefined => (!a || readMetaCached().runs >= 1 || parts.some((id) => SLICE_PARTS[id].axis === a) ? a : undefined);

/** 부품 칩 (레일 · 고르기 화면) */
/**
 * 카드 얼굴 (D-217 3): 보상 · 고물상이 모두 이것 — 등급 틀(일반 철 · 희귀 청강 · 황금 황동, 황금은 테를 도는 불빛) ·
 * 머리띠 이름 · 그림 창(체크무늬) · 성질 줄(+/× · 축) · 설명 · 등급 보석. attrs = data-* , extra = 가격표 등 꼬리.
 */
const cardFace = (id: CommandId, attrs: string, extra = '', cls = ''): string => {
  const c = COMMANDS[id];
  const g = gradeOf(id);
  // 세 칸 태그 (D-325): 누가 · 어떤 · 합/곱/규칙 — 모든 카드 같은 자리(그림 창 아래)
  return `<button type="button" class="cf cmd big t-${c.who} g-${g}${cls ? ` ${cls}` : ''}" data-grade="${g}" ${attrs}>${keysHtml(c.cost)}<b class="cf-name">${c.name}</b><span class="cf-win">${cardArt(id)}</span><span class="cf-type">${tags3Html(cardTags(id))}</span><small class="cf-desc">${descLines(c.desc || '')}</small>${c.flavor && !c.title ? `<i class="cf-flv">${c.flavor}</i>` : ''}<i class="cf-gem" aria-label="${GRADE.names[g]}"></i>${footed(extra, attrs) ? cfFoot(extra, '') : extra}</button>`;
};
/** 부품 얼굴 (D-217 3): 카드 얼굴과 같은 틀 · 같은 자리 */
const partFace = (id: SlicePartId, attrs: string, extra = '', cls = ''): string => {
  const d = SLICE_PARTS[id];
  const g = PART_GRADE[id] ?? 'common';
  return `<button type="button" class="cf part-card g-${g}${d.axis ? ` ax-${d.axis}` : ''}${cls ? ` ${cls}` : ''}" data-grade="${g}" ${attrs}><b class="cf-name">${d.name}</b><span class="cf-win"><i class="ico" style="${iconArt(d.icon)}"></i></span><span class="cf-type">${tags3Html(partTags(id))}</span><small class="cf-desc">${descLines(d.desc, d.flavor)}</small><i class="cf-gem" aria-label="${GRADE.names[g]}"></i>${footed(extra) ? cfFoot(extra, '') : extra}</button>`;
};

const partHtml = (id: SlicePartId, big = false): string => {
  const d = SLICE_PARTS[id];
  return big
    ? partFace(id, `data-part="${id}"`)
    : `<button type="button" class="part-chip${d.axis ? ` ax-${d.axis}` : ''}" data-part-info="${id}" aria-label="${d.name}"><i class="ico" style="${iconArt(d.icon)}"></i><span>${d.name}</span></button>`;
};

/** 연출 직전 화면: 바뀌기 전 모습 그대로 (피해 숫자 · 이동이 제대로 보이게) */
const showBefore = (before: BattleState): void =>
  renderer.render({ state: before, virtual: before, plan: [], pending: null, pendingPos: null, selectedId: null, destinations: [], hitDests: [], preview: [], removed: [], threat: null, intent: null });

/** 이번 턴 준 피해 합계 (계기판 · 턴 합계) */
let turnDmg = 0;
const dealt = (events: BattleEvent[], side: 0 | 1, before: BattleState): number =>
  events.reduce((a, e) => (e.type === 'attack' ? a + e.hits.reduce((x, h) => x + (before.pieces.find((p) => p.id === h.targetId)?.side !== side ? h.damage : 0), 0) : a), 0);

/**
 * 판 옆 적 초상 (4안, D-206): 반장이면 반장 그림(B-01~03), 원수가 섰으면 원수, 아니면 적 킹 — 이름 · HP.
 * 그림이 없으면 기물 도트. 같은 내용이면 다시 그리지 않는다(깜빡임 없이).
 */
/**
 * 전투 기록 (D-208, 사용자 결정): 오른쪽 레일 — 맨 위 「직전 공격」(공격력 · 합 · 곱 → 실제 피해), 아래 최근 수(이번 턴 · 지난 적 턴).
 * 적의 다음 수는 판 위 과녁 · 번호가 보여 주므로 여기서 다시 쓰지 않는다.
 */
type LogHit = { t: PieceType; side: 0 | 1; dmg: number; killed: boolean };
type LogRow = { turn: number; side: 0 | 1; by: PieceType | null; label?: string; hits: LogHit[]; base?: number; add?: number; mult?: number };
let blog: LogRow[] = [];
const logEvents = (events: BattleEvent[], before: BattleState, side: 0 | 1, turn: number): void => {
  const pc = (id: number) => before.pieces.find((p) => p.id === id);
  const hitsOf = (hs: { targetId: number; damage: number; killed: boolean }[]): LogHit[] =>
    hs.map((h) => ({ t: pc(h.targetId)?.type ?? 'P', side: (pc(h.targetId)?.side ?? 1) as 0 | 1, dmg: h.damage, killed: h.killed }));
  for (const e of events) {
    if (e.type === 'attack' && e.hits.length) {
      const a = pc(e.attackerId);
      blog.push({ turn, side, by: a?.type ?? null, base: a?.atk, add: e.add, mult: e.mult, hits: hitsOf(e.hits) });
    } else if (e.type === 'blast' && e.hits.length) blog.push({ turn, side, by: null, label: e.label, hits: hitsOf(e.hits) });
  }
  blog = blog.slice(-24);
};
const logHits = (hs: LogHit[]): string =>
  hs.map((h) => `<span class="bl-hit">${pieceImg(h.t, h.side, 'small', 20)}<em>${h.killed ? '☠' : `−${h.dmg}`}</em></span>`).join('');
const renderLog = (): void => {
  const el = document.getElementById('blog');
  if (!el) return;
  const mine = [...blog].reverse().find((r) => r.side === 0 && r.by);
  const sum = mine ? mine.hits.reduce((a, h) => a + h.dmg, 0) : 0;
  const last = mine
    ? `<div class="bl-last"><p class="bl-h">직전 공격</p><p class="bl-calc">${pieceImg(mine.by!, 0, 'small', 22)}<span class="bl-arrow">→</span>${mine.hits.map((h) => pieceImg(h.t, h.side, 'small', 22) + (h.killed ? '<em class="kill">☠</em>' : '')).join('')}<span class="bl-k">공격</span><span>${mine.base ?? '?'}</span>${mine.add ? `<em class="op-add">+${mine.add}</em>` : ''}${mine.mult && mine.mult > 1 ? `<em class="op-mul">×${fmtMult(mine.mult)}</em>` : ''}<span class="bl-eq">→ <b>${sum}</b></span></p></div>`
    : `<div class="bl-last none"><p class="bl-h">직전 공격</p><p class="bl-none">아직 공격하지 않았습니다.</p></div>`;
  let rows = '';
  let head = '';
  for (const r of [...blog].reverse().slice(0, 7)) {
    const h = `${r.turn}턴 · ${r.side ? '적' : '나'}`;
    if (h !== head) rows += `<p class="bl-turn${r.side ? ' foe' : ''}">${(head = h)}</p>`;
    rows += `<div class="bl-row${r.side ? ' foe' : ''}">${r.by ? pieceImg(r.by, r.side, 'small', 20) : `<span class="bl-lbl">${r.label ?? ''}</span>`}<span class="bl-arrow">→</span>${logHits(r.hits)}</div>`;
  }
  // 연쇄 계기판을 여기로 합친다 (F안): 이번 턴 합계 · 다음 공격에 붙을 합/곱
  const add = chainAdd(b.kills, parts);
  const mul = chainMult(b.kills, parts);
  const next = b.kills ? `<p class="bl-next">연쇄 ${b.kills} · 다음 공격 ${add ? `<em class="op-add">+${add}</em>` : ''}${mul > 1 ? `<em class="op-mul">×${fmtMult(mul)}</em>` : ''}</p>` : '';
  const tot = turnDmg ? `<p class="bl-tot">이번 턴 피해 <b>${turnDmg}</b></p>` : '';
  el.innerHTML = `${last.replace(/<\/div>$/, `${tot}${next}</div>`)}<div class="bl-list"><p class="bl-h">기록</p>${rows || '<p class="bl-none">첫 턴입니다.</p>'}</div>`;
};

/** 오른쪽 「적의 수」 (D-207): 턴을 끝내면 적이 둘 수 — 순번 · 누가 → 누구 · 피해(쓰러지면 ☠) */
const foePlan = (): void => {
  const el = document.getElementById('foeplan');
  if (!el) return;
  if (b.s.winner !== null || enemyTurn) return void (el.innerHTML = '');
  const rows: { by: PieceType | null; label?: string; hits: { t: PieceType; damage: number; killed: boolean }[]; move?: boolean }[] = intentPlan(b);
  // 치지 않고 다가오기만 하는 적도 한 줄 (예고 화살표와 같은 수)
  const hitters = new Set(rows.map((r) => r.by));
  for (const it of liveIntents(b)) {
    const p = b.s.pieces.find((q) => q.id === it.pieceId);
    if (p && !hitters.has(p.type)) rows.push({ by: p.type, hits: [], move: true });
  }
  const ico = (t: PieceType, side: 0 | 1) => pieceImg(t, side, 'small', 22);
  el.innerHTML = `<p class="fp-head">적의 수</p>${
    rows.length
      ? rows
          .slice(0, 5)
          .map((r, i) => `<div class="fp-row${r.hits.some((h) => h.killed) ? ' kill' : ''}"><b class="fp-n">${i + 1}</b>${r.by ? ico(r.by, 1) : `<span class="fp-rule">${r.label ?? ''}</span>`}<span class="fp-arrow">→</span>${r.move ? '<span class="fp-move">다가옴</span>' : r.hits.map((h) => `<span class="fp-hit">${ico(h.t, 0)}<em>${h.killed ? '☠' : `−${h.damage}`}</em></span>`).join('')}</div>`)
          .join('')
      : '<p class="fp-none">이번엔 움직이는 적이 없습니다.</p>'
  }`;
};
let portraitKey = '';
const portrait = (): void => {
  const el = document.getElementById('portrait');
  if (!el) return;
  const k = b.s.pieces.find((p) => p.side === 1 && p.type === 'K');
  const nem = b.nemesisId !== undefined ? b.s.pieces.find((p) => p.id === b.nemesisId) : undefined;
  const who = b.boss ? BOSS_RULES[b.bossRule].name : nem && nemesisNow ? `원수 「${nemesisNow.name}」` : '적 킹';
  const target = b.boss || !nem ? k : nem;
  const hp = target ? `${target.hp}${target.shield ? ` +${target.shield}` : ''} / ${target.maxHp}` : '쓰러짐';
  const art = b.boss ? `<img class="pt-art" src="scenes/${BOSS_ART[b.bossRule]}.png" alt="" onerror="this.remove()">` : '';
  const key = `${who}|${b.boss}|${target?.type}`;
  if (key !== portraitKey) {
    portraitKey = key;
    el.className = `portrait${b.boss ? ' boss' : ''}`;
    el.innerHTML = `<div class="pt-frame">${art}<span class="pt-piece">${pieceImg(target?.type ?? 'K', 1, 'large', 120)}</span></div><p class="pt-name">${who}</p><p class="pt-hp"></p>`;
  }
  const hpEl = el.querySelector('.pt-hp');
  if (hpEl) hpEl.textContent = `HP ${hp}`;
};

/**
 * 태엽 · 속전 계기 (D-209): 값이 바뀔 때만 다시 그린다 — 그래야 꺼지는 연출이 다음 새로 그리기에 끊기지 않는다.
 * 태엽: 열쇠 구멍마다 황동 열쇠. 쓰면 열쇠가 풀리며 거꾸로 돌고 빛이 꺼진다 · 감기면 앞으로 돌며 켜진다.
 * 속전: 진공관 줄. 턴이 지나면 끝의 관이 몇 번 깜빡이다 꺼진다.
 */
let apKey = '';
let apPrev: number | null = null;
let coinPrev: number | null = null;
/** 처치 환급 연출 (D-242): 카드를 내면 먼저 쓴 만큼 풀린 채로 보이다가, 처치 연출이 끝나면 돌아온 열쇠가 감긴다 */
let apHold: number | null = null;
const gauges = (): void => {
  const ap = apHold ?? b.ap;
  // 태엽 칸은 늘 상한(5)만큼 깔아 둔다 — 기본은 그중 apMax(3)가 켜진다 (D-212)
  const n = Math.max(SLICE.apCap, ap);
  const k = `${ap}/${n}/${b.apMax}`;
  if (k !== apKey) {
    const was = apPrev;
    apKey = k;
    apPrev = ap;
    $('vials').innerHTML = `<span class="lbl">태엽</span><span class="keys">${Array.from({ length: n }, (_, i) => {
      const on = i < ap;
      const fx = was === null || calmNow() ? '' : !on && i < was ? ' spend' : on && i >= was ? ' wind' : '';
      return `<i class="seg${on ? ' on' : ''}${i >= b.apMax ? ' bonus' : ''}${fx}" style="--k:${i}"><i class="key"></i></i>`;
    }).join('')}</span><b>${ap}/${b.apMax}</b>`;
  }
  if (coinPrev !== b.coins || !$('coins').childElementCount) {
    const was = coinPrev;
    coinPrev = b.coins;
    $('coins').innerHTML = `<span class="lbl">${HUD_TEXT.track} 보상</span><b title="이기면 받는 나사"><i class="scr"></i>+${Math.round(b.coins * SLICE.coinValue * (asc >= 8 ? ASC_NUM.coinMul : 1))}</b><span class="boiler" style="--n:${SLICE.coins}"><i class="lava" style="--c:${was !== null && was > b.coins && !calmNow() ? was : b.coins}"></i><i class="ticks"></i></span>`;
    // 쇳물이 한 칸 빠진다: 이전 높이로 그린 뒤 다음 장면에 새 높이로 — 2도트씩 끊겨 줄어든다
    if (was !== null && was > b.coins && !calmNow()) {
      const lava = $('coins').querySelector<HTMLElement>('.lava')!;
      lava.classList.add('drain');
      requestAnimationFrame(() => requestAnimationFrame(() => lava.style.setProperty('--c', String(b.coins))));
    }
  }
};

/**
 * 탄 펼치기 · 접기 (D-209): 톱니가 걸리듯 드르륵 — 높이가 네 칸으로 끊겨 열리고 닫히며 칸마다 딸깍.
 * 손패가 그대로일 때만 접히는 탄을 보여 준다(쓴 탄은 그냥 빠진다).
 */
let lastOpen: number | null = null;
const magAnim = (oldBody: HTMLElement | null, same: boolean): void => {
  const now = openCard ?? selCard;
  if (now === lastOpen) return;
  const prev = lastOpen;
  lastOpen = now;
  if (calmNow()) return;
  const tick = (k: number) => window.setTimeout(() => sfx('tap', 6 + k), k * 55);
  const el = now !== null ? $('hand').querySelector<HTMLElement>(`[data-card="${now}"] .mg-body`) : null;
  if (el) {
    const h = el.offsetHeight;
    el.animate([{ height: '0px', opacity: 0.4 }, { height: `${h}px`, opacity: 1 }], { duration: 220, easing: 'steps(4, end)' });
    for (let k = 0; k < 3; k++) tick(k);
  }
  const host = same && prev !== null && prev !== now ? $('hand').querySelector<HTMLElement>(`[data-card="${prev}"]`) : null;
  if (host && oldBody) {
    const ghost = oldBody.cloneNode(true) as HTMLElement;
    host.appendChild(ghost);
    const h = ghost.offsetHeight;
    ghost.animate([{ height: `${h}px` }, { height: '0px' }], { duration: 180, easing: 'steps(3, end)', fill: 'forwards' }).onfinish = () => ghost.remove();
  }
};

/**
 * 연출 전 판 붙잡기 (D-214): 엔진은 턴 끝에 적 수까지 한 번에 계산한다. 연출이 시작될 때까지 판은 그 전 모습을 보여 줘야
 * 「적이 이미 움직인 판 → 적 차례 띠 → 다시 움직임」이 되지 않는다 (사용자 지적).
 */
let holdView: BattleState | null = null;
const refresh = (): void => {
  hidePeek();
  if (holdView) showBefore(holdView);
  else renderer.render(model());
  turnLabel($('turn-label'), b.s.winner !== null ? '대국 끝' : enemyTurn ? '적 차례' : busy ? '움직이는 중' : document.body.matches('.lay-b, .lay-c, .lay-e, .lay-f') ? `${b.turn}턴` : `${b.turn}턴 · 내 차례`, enemyTurn);
  const deckRow = document.getElementById('deckrow');
  const head = `<p class="hand-head"><button type="button" class="deck-btn" data-deck>덱 ${deck.length}</button><button type="button" class="deck-btn" data-crew>분대 ${b.s.winner === null && !document.body.classList.contains('between') ? b.squadIds.filter((id) => b.s.pieces.some((p) => p.id === id)).length : squad.length}</button> 뽑을 ${b.draw.length} · 버림 ${b.discard.length + (b.played?.length ?? 0)}</p>`;
  if (deckRow) deckRow.innerHTML = `<p class="hand-head"><button type="button" class="btn deck-btn" data-deck>덱 ${deck.length}</button><button type="button" class="btn deck-btn" data-crew>분대 ${b.s.winner === null && !document.body.classList.contains('between') ? b.squadIds.filter((id) => b.s.pieces.some((p) => p.id === id)).length : squad.length}</button><span>버림 ${b.discard.length + (b.played?.length ?? 0)}</span></p>`;
  if (openCard !== null && openCard >= b.hand.length) openCard = null;
  const oldBody = $('hand').querySelector<HTMLElement>('.cmd.open .mg-body');
  const handLen0 = $('hand').querySelectorAll('[data-card]').length;
  $('hand').innerHTML = `${deckRow ? '' : head}${(handView ?? b.hand).map(cardHtml).join('') || (handView ? '' : '<p class="empty">‘손패가 없어.’</p>')}`;
  magAnim(oldBody, handLen0 === b.hand.length);
  $('parts').innerHTML = parts.map((id) => partHtml(id)).join('');
  portrait();
  foePlan();
  renderLog();
  // 새로 단 부품은 처음 보이는 순간 비틀려 들어와 철컥 잠긴다 (D-184)
  for (const id of newParts) mountPart($('parts').querySelector(`[data-part-info="${id}"]`));
  newParts.clear();
  $('parts').hidden = !parts.length;
  $('boss').hidden = !b.boss;
  if (b.boss) {
    const r = BOSS_RULES[b.bossRule];
    // 이 대국의 실제 피해 숫자로 (난이도 × 층별 성장, D-203)
    const lines = r.lines.map((l) => l.replace(/(줄 폭격 −)\d+/, `$1${foeDmg(BOSS.bombDamage, b)}`).replace(/(친 기물이 )\d+/, `$1${foeDmg(BOSS_NUM.thorns, b)}`));
    $('boss').innerHTML = `<b>${r.name}</b>${lines.map((l, k) => `<span${k === 1 && b.bombRow !== null ? ' class="hot"' : ''}>${k === 1 && b.bombRow !== null ? '턴 끝 — 불꽃 줄 폭격!' : l}</span>`).join('')}`;
  }
  // 태엽 게이지 (D-162): 손패 맨 위 한 줄 — 칸마다 열쇠, 쓴 칸은 빈 칸. 오른쪽 레일의 태엽은 없앴다
  gauges();
  ($('btn-rewind') as HTMLButtonElement).disabled = b.rewinds <= 0 || busy || b.s.winner !== null;
  $('btn-rewind').innerHTML = `<span class="rw-i"><i class="ico-rew" aria-hidden="true"></i></span> <span class="rw-t">되감기</span> <small>${b.rewinds}</small>`;
  ($('btn-end') as HTMLButtonElement).disabled = busy || b.s.winner !== null;
  meter();
  coach();
  syncTerms();
};

/**
 * 첫 대국 도움말 (D-192): 처음 출하하는 사람의 시험대 한 판에만 — 지금 할 일 한 줄(시스템 투)을 판 위에 띄운다.
 * 고를 카드 → 빛나는 기물 → 갈 칸 → 턴 끝. 그 판을 이기면 다시 나오지 않는다.
 */
let coachOn = false;
const coach = (): void => {
  let el = document.querySelector<HTMLElement>('.coach-line');
  const live = coachOn && !tutActive && cur === INTRO[0] && b.s.winner === null && !busy && !enemyTurn;
  $('btn-end').classList.toggle('coach-end', false);
  if (!live) return void (el && !el.classList.contains('pxout') && pxOut(el, () => el?.remove()));
  const canPlay = b.hand.some((_, i) => canPlay2(i));
  // 입문 두 턴 (D-232): 1턴 첫 처치 뒤 = 연쇄, 2턴부터 붉은 칸 위의 내 기물 = 빠지며 치기 (용어 없이 행동으로)
  const grazeNow = b.turn >= 2 && (b.graze ?? []).some((id) => b.s.pieces.some((p) => p.id === id));
  const key: keyof typeof COACH_LINES = !canPlay ? 'end' : selCard === null ? (grazeNow ? 'graze' : b.turn === 1 && b.kills === 1 ? 'chain' : 'card') : selPiece === null ? 'piece' : 'square';
  $('btn-end').classList.toggle('coach-end', key === 'end');
  $('hand').classList.toggle('hint', key === 'card');
  if (!el) {
    el = document.createElement('div');
    el.className = 'coach-line';
    document.body.appendChild(el);
  }
  if (el.dataset.k === key) return;
  el.dataset.k = key;
  // 부관 박차가 말한다 (D-242 화자 통일): 얼굴 + 이름 + 말
  el.innerHTML = `<span class="cl-face"><img src="ui/hud/adjutant.png" alt="" width="56" height="56"></span><span><b>${TUT.name}</b>${COACH_LINES[key].replace(/\n/g, '<br>')}</span>`;
  const r = $('board').getBoundingClientRect();
  el.style.left = `${r.left + r.width / 2}px`;
  // 두 줄이 되어도 판 아래쪽에 붙는다 (아래 기준)
  el.style.top = '';
  el.style.bottom = `${Math.max(8, innerHeight - r.bottom + 6)}px`;
  replay(el, 'in');
};
const canPlay2 = (i: number): boolean => canPlay(b, i);

// ---------- 플레이테스트 기록 (D-234) ----------
telemetryStore(store);
/** 앱을 켠 시각 (첫 10분 지표의 기준) · 출하를 시작한 시각 */
const bootAt = Date.now();
let runAt = Date.now();
/** 이번 대국의 예고 지표 (⑥) · 대국 시작 때 분대 HP */
let tg = { telegraph: 0, hit: 0, evade: 0, counter: 0 };
let hpAtStart = 0;
/** 출하가 실제로 시작됐나 (앱을 켤 때 뒤에 깔리는 판은 기록하지 않는다) */
let runLive = false;
/** 이번 출하에서 쓴 되감기 수 */
let rewindsUsedRun = 0;
// 앱을 내리거나 닫을 때 (③ 강제 종료 지점): 어디서 · 몇 턴째 · 출하 몇 분째
let hiddenAt = 0;
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && runLive) {
    hiddenAt = Date.now();
    track('session_exit', { ...where(), run_time_min: Math.round((Date.now() - runAt) / 6000) / 10, turn_num: b?.turn ?? 0, in_battle: !document.body.classList.contains('between'), exit_type: 'background' });
  } else if (hiddenAt) {
    track('session_resume', { away_sec: Math.round((Date.now() - hiddenAt) / 1000) });
    hiddenAt = 0;
  }
});
/** 첫 10분 단계 (①) — 처음 출하하는 사람만, 단계마다 한 번 */
const ftueDone = new Set<string>();
const ftue = (step: string, quit = false): void => {
  if (!firstShip || ftueDone.has(step)) return;
  ftueDone.add(step);
  track('ftue_step', { step_id: step, elapsed_sec: Math.round((Date.now() - bootAt) / 1000), is_quit: quit });
};
/** 고르기 기록 (⑤): 무엇이 나왔고 무엇을 골랐나 (null = 건너뜀) */
const draft = (kind: string, offered: string[], picked: string | null): void =>
  track('draft_choice', { kind, offered_ids: offered, picked_id: picked, is_skipped: picked === null, act: actI + 1, run: readMetaCached().runs + 1 });
/** 지금 어디인가 (기록 공통) */
const where = (): Record<string, unknown> => ({ act: actI + 1, node_idx: rowI, asc, run: readMetaCached().runs + 1, first: firstShip });

/**
 * 용어 단계 공개 (D-233, 보고서 3 템플릿 2): 사전에는 만난 용어만. 처음 만나는 순간 한 줄 알림 + ? 톱니에 NEW,
 * 사전을 열면 NEW가 지워진다. 첫 판 초반에 보이는 고유 용어는 태엽 · 연쇄 · 승격 (+ 화면에 늘 있는 속전 · 나사 · 지휘).
 */
let termsOn: Set<string> | null = null;
const gatesOn = new Set<TermGate>();
/** 이 때의 용어를 연다 (이미 열렸으면 아무것도 안 한다) */
const unlockTerms = (gate: TermGate, quiet = false): void => {
  if (labMode || gatesOn.has(gate)) return;
  const m = readMeta(store);
  termsOn ??= new Set(m.terms ?? []);
  const fresh = KEYWORDS.filter(([k, , g]) => g === gate && !termsOn!.has(k)).map(([k]) => k);
  gatesOn.add(gate);
  if (!fresh.length) return;
  fresh.forEach((k) => termsOn!.add(k));
  const isNew = gate === 'base' ? [] : fresh;
  writeMeta(store, { ...m, terms: [...termsOn], termsNew: [...new Set([...(m.termsNew ?? []), ...isNew])] });
  if (isNew.length) {
    $('btn-help').classList.add('has-new');
    track('term_unlock', { terms: isNew });
    if (!quiet && !tutActive && !INTRO.includes(cur)) window.setTimeout(() => toast(HUD_TEXT.newTerm(isNew.join(' · ')), 2600), 900);
  }
};
/** 지금 판 · 출하 상태에서 만난 것들을 연다 (refresh마다 — 이미 연 때는 바로 넘어간다) */
const syncTerms = (): void => {
  if (labMode || !b || !runLive) return;
  const meta = readMetaCached();
  const on = (g: TermGate, cond: boolean) => cond && !gatesOn.has(g) && unlockTerms(g);
  on('base', true);
  on('part', parts.length > 0);
  on('charm', charms.revive + charms.rewind > 0);
  on('shield', b.s.pieces.some((p) => p.shield > 0));
  on('door', (b.s.doorIds ?? []).length > 0);
  on('crack', squad.some((u) => u.cracked));
  on('reinforce', squad.some((u) => u.scars?.includes('보충병')));
  on('burn', (b.burned ?? []).length > 0);
  on('nemesis', b.nemesisId !== undefined);
  on('plate', b.boss && b.bossRule === 'plate');
  on('thorns', b.boss && (b.bossRule === 'thorns' || b.bossRule === 'gilded'));
  on('blast', b.blastPawns);
  on('stun', (b.staggered ?? []).length > 0);
  on('shock', (b.shocked ?? []).length > 0);
  on('graze', grazeNamed(meta));
  on('quirk', squad.some((u) => u.quirk));
  on('overkill', b.overkill > 0);
  // 수읽기 (D-281): 덱에 체스 수 카드가 들어오면
  on('tactic', deck.some((id) => COMMANDS[id]?.axis === 'tactic' || COMMANDS[id]?.axis2 === 'tactic'));
  on('spend', deck.some((id) => COMMANDS[id]?.kind === 'spend'));
};
/** 「회피 반격」이라는 이름은 둘째 출하 또는 2막부터 (첫 출하 1막은 「빠지며 쳤다」 연출로만) */
const grazeNamed = (meta = readMetaCached()): boolean => meta.runs >= 1 || actI >= 1;
let metaCache: { at: number; m: ReturnType<typeof readMeta> } | null = null;
/** 기록 읽기 (refresh마다 부르므로 1초 동안 재사용) */
const readMetaCached = (): ReturnType<typeof readMeta> => {
  const now = Date.now();
  if (!metaCache || now - metaCache.at > 1000) metaCache = { at: now, m: readMeta(store) };
  return metaCache.m;
};
/** 기벽은 셋째 출하부터 (D-233 4단계) — 그 전에는 뽑은 기벽을 떼어 낸다 (난수 순서는 그대로) */
const crewOf = (t: PieceType, avoid: Parameters<typeof makeCrew>[3] = []): Crew => {
  const c = makeCrew(t, R, squad.map((u) => u.name ?? ''), avoid);
  if (readMetaCached().runs < 2 && !daily) delete c.quirk;
  return c;
};

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
  // 합 · 곱 (D-205): 다음 공격에 붙는 것 — 「+16 ×2.25」
  const add = chainAdd(b.kills, parts);
  const mul = chainMult(b.kills, parts);
  m.innerHTML = `${b.kills ? `<span class="mult">${add ? `<em class="op-add">+${add}</em>` : ''}${mul > 1 ? `<em class="op-mul">×${fmtMult(mul)}</em>` : ''}</span><b>연쇄 ${b.kills}</b>` : ''}<span class="dmg">${HUD_TEXT.dmg} ${turnDmg}</span>`;
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
/** 길막기 딱지: 차지한 칸 위에 「막음!」 도장이 내리꽂히고 한 번 안내 */
let blockTold = false;
const blockPop = (pos: Pos): void => {
  const c = renderer.screenOf(pos);
  const el = document.createElement('div');
  el.className = 'block-pop';
  el.textContent = HUD_TEXT.blockPop;
  el.style.left = `${c.x}px`;
  el.style.top = `${c.y}px`;
  document.body.appendChild(el);
  sfx('stamp');
  window.setTimeout(() => pxOut(el, () => el.remove(), 220), 900);
  if (!blockTold) { blockTold = true; window.setTimeout(() => toast(HUD_TEXT.blockTip, 3000), 500); }
};
/** 즉시 카드 연출: 손패의 그 카드 복제가 움츠렸다(예비) 튀어 오르며 금빛 테로 터지고 도트로 흩어진다 */
const castFx = (src: HTMLElement | null): void => {
  if (!src || calmNow()) return;
  const r = src.getBoundingClientRect();
  const el = src.cloneNode(true) as HTMLElement;
  el.className = `${src.className} cast3`;
  el.removeAttribute('data-card');
  Object.assign(el.style, { position: 'fixed', left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`, margin: '0', zIndex: '60', pointerEvents: 'none' });
  document.body.appendChild(el);
  window.setTimeout(() => sparksAt(r.left + r.width / 2, r.top - 10, 12, 50), 220);
  window.setTimeout(() => pxOut(el, () => el.remove(), 220), 420);
};
const chainPop = (kills: number): void => {
  const el = document.createElement('div');
  el.className = `chainpop lv${Math.min(kills, 4)}`;
  const add = chainAdd(kills, parts);
  const mul = chainMult(kills, parts);
  el.innerHTML = `<small>연쇄 ${kills}</small>${mul > 1 ? `×${fmtMult(mul)}` : `+${add}`}${kills >= 3 ? '!' : ''}`;
  // 판 캔버스 위로 (body에 고정 배치, 판 한가운데)
  const r = $('board').getBoundingClientRect();
  el.style.left = `${r.left + r.width / 2}px`;
  el.style.top = `${r.top + r.height * 0.42}px`;
  document.body.appendChild(el);
  window.setTimeout(() => el.remove(), 900);
  if (kills >= 3) shake($('board'), 1);
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
      // 얻는 카드도 손맛 (테스터: 박자처럼 무언가를 얻는 카드에 아무 연출이 없었다): 카드가 움츠렸다 튀어 오르며 터지고 새로 뽑힌 카드는 덱에서 날아든다
      castFx(document.querySelector<HTMLElement>(`#hand [data-card="${i}"]`));
      const n0 = b.hand.length;
      playCard(b, i);
      selCard = selPiece = openCard = null;
      if (c.kind === 'spark') chainPop(b.kills);
      prevKills = b.kills;
      refresh();
      const gained = b.hand.length - (n0 - 1);
      if (gained > 0) {
        const cards = [...document.querySelectorAll<HTMLElement>('#hand [data-card]')].slice(-gained);
        cards.forEach((el, k) => { el.style.setProperty('--k', String(k)); replay(el, 'drawn3'); });
        window.setTimeout(() => sfx('tap', 4), 160);
      }
      return;
    }
    return void run(i);
  }
  if (!canPlay(b, i) && b.s.pieces.every((p) => p.side !== 0 || costOf(b, i, p.id) > b.ap)) return nope(document.querySelector(`[data-card="${i}"]`), $('vials')), toast('‘태엽이 모자라.’');
  const pieces = cardPieces(b, i);
  if (!pieces.length) return toast(c.who === 'any' ? '‘움직일 기물이 없어.’' : `‘${josa(PIECE_NAMES_KO[c.who], '이')} 없거나, 갈 칸이 없어.’`);
  sfx('lift');
  if (selCard === i) {
    selCard = selPiece = openCard = null;
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
      openCard = ci;
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
  selCard = selPiece = openCard = null;
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
  const ev0 = (b.evaded ?? []).length;
  // 길막기 (테스터: 「적이 갈 칸을 먼저 차지해 공격을 막는 것도 이 게임의 요소로 느껴지게」): 적이 가려던 칸을 우리 기물이 차지하면 알린다
  const aimed = b.s.rules.capture ? [] : liveIntents(b).map((it) => `${it.to.x},${it.to.y}`);
  const r = playCard(b, i, pieceId, to);
  if (typeof r === 'string') return toast(r);
  const mover = pieceId !== undefined ? findPiece(b.s, pieceId) : undefined;
  const blockedAt = mover && mover.side === 0 && aimed.includes(`${mover.x},${mover.y}`) ? { x: mover.x, y: mover.y } : null;
  playsMade += 1;
  if ((b.evaded ?? []).length > ev0) tg.evade += 1;
  if (b.grazedNow !== undefined) {
    b.grazedNow = undefined;
    tg.counter += 1;
    // 처치 알림(태엽 +1)이 곧바로 덮으니 그 뒤에 — 이 판의 배울 거리는 빠지며 치기
    window.setTimeout(() => toast(grazeNamed() ? HUD_TEXT.graze : HUD_TEXT.grazePlain, 2400), 650);
  }
  $('hand').classList.remove('hint');
  const gain = r.events.reduce((a, e) => (e.type === 'apGain' ? a + e.amount : a), 0);
  selCard = selPiece = openCard = null;
  busy = true;
  // 먼저 쓴 만큼 풀린다 (돌아올 태엽은 처치 연출 뒤에)
  apHold = gain ? b.ap - gain : null;
  refresh();
  showBefore(r.before);
  await renderer.play(r.before, r.events);
  if (b.boss) {
    // 반장 상황 대사 (D-311): 출하 · 도금왕 되받아침 → sig, 반장 킹이 3할 아래로 → beg (한 번)
    if (r.events.some((e) => e.type === 'blast' && e.fx === 'thorns')) taunt('sig');
    const ek = b.s.pieces.find((p) => p.side === 1 && p.type === 'K');
    if (ek && !begSaid && ek.hp <= ek.maxHp * 0.3) { begSaid = true; taunt('beg'); }
  }
  if (gain) {
    // 처치 → 돌아온 열쇠가 감기며 불꽃이 튄다
    apHold = null;
    gauges();
    $('vials').classList.remove('regain');
    void $('vials').offsetWidth;
    $('vials').classList.add('regain');
    $('vials').querySelectorAll<HTMLElement>('.seg.wind').forEach((el) => {
      const r2 = el.getBoundingClientRect();
      sparksAt(r2.left + r2.width / 2, r2.top + r2.height / 2, 8, 26);
    });
    sfx('coin', 9);
  }
  if (blockedAt && b.s.winner === null) blockPop(blockedAt);
  await deathRites();
  // 내 카드 연출 끝 → 다음 조작 사이 짧은 숨 (D-204)
  if (!calmNow()) await new Promise((res) => window.setTimeout(res, PACE.afterMine));
  busy = false;
  burnNote(burn0);
  turnDmg += dealt(r.events, 0, r.before);
  // 핀 (D-281): 묶인 적에게 경직 딱지
  renderer.setStaggered([...(b.staggered ?? []), ...(b.pinned ?? [])], b.shocked ?? []);
  renderer.setup(b.s);
  refresh();
  if (b.kills > prevKills) chainPop(b.kills);
  prevKills = b.kills;
  flashParts(firedParts(cardId, moverType, r.events, b.kills - k0));
  logEvents(r.events, r.before, 0, b.turn);
  renderLog();
  // 템포 가속: 연쇄가 쌓일수록 다음 연출이 빨라진다
  renderer.setTempo(1 + Math.min(b.kills, PACE.tempoKillsMax) * PACE.tempoPerKill);
  if (gain) {
    toast(`처치 — 태엽 +${gain}${parts.includes('horseshoe') && moverType === 'N' ? ` (${SLICE_PARTS.horseshoe.name})` : ''}`);
  }
  // 첫 승격 (D-244): 부관이 칭찬하며 승격 규칙을 알려 준다 — 출하를 통틀어 한 번
  const promo = r.events.find((e) => e.type === 'promote');
  if (promo && !tutDone('promote') && !tutActive && b.s.winner === null) {
    const pp = findPiece(b.s, (promo as { pieceId: number }).pieceId);
    await tutorial('promote', [{ text: TUT.promote, target: () => (pp ? tileRect(pp) : null) }]);
  }
  // 반장 2단계 (D-243): 쓰러진 반장이 다시 일어선다
  if (r.events.some((e) => e.type === 'respawn' && e.label === '반장 2단계')) {
    sfx('threat');
    const gilded = b.bossRule === 'gilded';
    await banner(gilded ? '도금왕이 일어선다' : '반장이 다시 일어선다', false);
    // 2단계 (각본 §8 · §9, D-276): 반장은 한 마디, 도금왕은 이번 출하에 쓰러뜨린 반장에게 한 말을 비꼰다
    if (gilded) await gildedPhase2();
    else toast(`${BOSS_RULES[b.bossRule].name} “${BOSS_STORY[b.bossRule as StoryBoss]?.phase2 ?? ''}” — 2단계: 호위를 부르며 다시 일어섰습니다.`, 4200);
    renderer.setup(b.s);
    refresh();
  }
  if (b.s.winner !== null) return finish();
};
let prevKills = 0;

const onEnd = (): Promise<void> => guarded(onEndInner);
const onEndInner = async (): Promise<void> => {
  if (busy || b.s.winner !== null) return;
  const burn0 = b.burned?.length ?? 0;
  const aimed0 = (b.aimed ?? []).length;
  const alarm0 = !!b.alarmAtk; // 경보가 이번에 막 찼는지 알아보려고 (D-311)
  const handBefore = [...b.hand];
  const r = endTurn(b);
  if (r === 'warn') {
    sfx('threat');
    toast('이대로 턴을 끝내면 킹이 피격당합니다. 한 번 더 누르면 끝냅니다.', 2600);
    $('btn-end').classList.add('warn');
    return;
  }
  $('btn-end').classList.remove('warn');
  // 예고 지표 (⑥): 내 기물을 겨눈 예고 수 · 실제로 맞은 내 기물 수
  tg.telegraph += aimed0;
  tg.hit += new Set(r.events.flatMap((e) => (e.type === 'attack' ? e.hits.filter((h) => h.damage > 0 && r.before.pieces.find((q) => q.id === h.targetId)?.side === 0).map((h) => h.targetId) : []))).size;
  if (b.turn === 2 && INTRO.includes(cur)) ftue('battle1_turn2');
  holdView = r.before;
  // 버리는 연출은 지금 손패로 (테스터: 다음 턴 손패가 들어갔다 빠지는 연출이 나왔다가 내 차례에 다시 나타났다)
  handView = handBefore;
  renderer.lastMovesClear();
  // 바로 잠근다 (페르소나 테스트 B1): 턴 합계 연출을 기다리는 사이 「턴 끝」 연타가 적 차례를 한 번 더 돌렸다
  busy = true;
  selCard = selPiece = openCard = null;
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
  handView = [];
  enemyTurn = true;
  refresh();
  showBefore(r.before);
  turnBanner($('board'), '적 차례', true);
  // 띠가 판 가운데를 지나는 동안 적 첫 수가 가려지지 않게 잠깐 기다린다 (띠는 0.9초에 빠지고 적은 겨눔부터 시작)
  await new Promise((res) => window.setTimeout(res, calmNow() ? 120 : PACE.enemyBannerHold));
  holdView = null;
  renderer.setTempo(PACE.enemyTempo);
  await renderer.play(r.before, r.events);
  renderer.setTempo(1);
  logEvents(r.events, r.before, 1, b.turn - 1);
  // 직전 적 수: 움직인 적 기물의 출발 · 도착 칸에 꺾쇠 (내 차례 동안 남는다)
  renderer.lastMovesSet(r.events.flatMap((e) => (e.type === 'move' && r.before.pieces.find((p) => p.id === e.pieceId)?.side === 1 ? [e.from, e.to] : [])));
  await deathRites();
  if (r.events.some((e) => e.type === 'respawn' && e.label?.startsWith('끝없는'))) flashParts(['assembly']);
  busy = false;
  enemyTurn = false;
  renderer.setStaggered(b.staggered ?? [], b.shocked ?? []);
  renderer.setBossMarks(b.stampId ?? null, b.pull?.id ?? null);
  renderer.setup(b.s);
  if (b.boss && b.s.winner === null) {
    // 반장 규칙이 막 발동했으면 그 말 (D-311): 줄 폭격 · 폰 찍기 · 불량 도장 · 끌어당김 예고 · 경보 가득
    const pawns = (s: typeof b.s) => s.pieces.filter((p) => p.side === 1 && p.type === 'P').length;
    const fired = r.events.some((e) => e.type === 'blast' && e.fx === 'row') || pawns(b.s) > pawns(r.before)
      || (b.bossRule === 'inspect' && b.stampId != null && (b.turn - 1) % BOSS_NUM.stampEvery === 0) || !!b.pull || (!!b.alarmAtk && !alarm0);
    if (fired) taunt('sig');
  }
  // 헛방 (D-229): 예고를 피해 빈 땅을 친 적은 경직 · 맞은 기물은 기어 쇼크 — 한 번 알린다
  if (b.s.winner === null && b.staggered?.length) toast(HUD_TEXT.whiff(b.staggered.length), 2600);
  else if (b.s.winner === null && b.shocked?.length) toast(HUD_TEXT.shock, 2400);
  if (b.s.winner === null && b.alarmAtk) turnBanner($('board'), HUD_TEXT.alarm, false, true);
  if (b.s.winner !== null) { handView = null; refresh(); return finish(); }
  refresh();
  // 적 차례 끝 → 내 차례 사이 숨 (D-204)
  await new Promise((res) => window.setTimeout(res, calmNow() ? 0 : PACE.turnHold));
  turnBanner($('board'), `${b.turn}턴 · 내 차례`, false);
  handView = null;
  refresh();
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
  const el = openOverlay(`<div class="stand nemesis"><p class="eyebrow">원수</p><h2>${pieceImg(n.t, 1, 'small', 30)} ${n.name}</h2><p class="line">${TAUNTS.meet[R.int(TAUNTS.meet.length)]}</p><p class="dim">쓰러뜨린 분대원: ${n.victims.join(' · ')} · ${n.rank}단계 (HP +${Math.round(n.rank * DIRECTOR.nemesisHp * 100)}%)<br>쓰러뜨리면 현상금 나사 ${dir.bounty(asc)}${asc <= DIRECTOR.heirloomUpTo && n.heir ? ` · ${josa(n.heir.name, '이')} 돌아온다` : ''}.</p><div class="row"><button class="btn brass" type="button" data-go>맞선다</button></div></div>`);
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
  const el = openOverlay(`<div class="stand"><p class="eyebrow">판돈</p><h2>${BETS[kind].label}</h2><dl class="terms"><dt>조건</dt><dd>${BETS[kind].cond}</dd><dt>보상</dt><dd>판돈으로 건 나사의 두 배 <b class="up">(+${DIRECTOR.betStake * 2})</b></dd><dt>실패 시</dt><dd>판돈으로 건 나사를 잃음 <b class="down">(−${DIRECTOR.betStake})</b></dd></dl><div class="row"><button class="btn" type="button" data-no>걸지 않는다</button><button class="btn brass" type="button" data-yes>나사 ${DIRECTOR.betStake}을 건다</button></div></div>`);
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
  battlesFought += 1;
  handView = null;
  closeOpening();
  // 진입 화면이 끝날 때까지 판을 가린다 (테스터: 대국을 누르면 판이 잠깐 보였다가 다시 로딩됐다)
  if (silent) document.body.classList.remove('between');
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
  tauntCount = 0;
  begSaid = false;
  betNow = null;
  blog = [];
  apKey = '';
  apPrev = coinPrev = null;
  b = newSliceBattle(squad, enemy, def.order ? arrange(def.order, def.deck ?? deck.filter(usable)) : deck.filter(usable), 100 + stage * 17 + R.int(1000), { ordered: !!def.order, enemyKingHp: def.kingHp, enemyHp: def.enemyHp, parts, refined, boss: def.boss, bossRule: def.bossRule, traits: def.traits, width: def.w, height: def.h, place: def.place, mercy, nemesis: nemesisNow ? { t: nemesisNow.t, rank: nemesisNow.rank } : undefined, depth: INTRO.includes(def) ? 0 : depthNow(), gold, rewindCharms: charms.rewind, shock: asc >= 2, guard: def.guard, atkMul: (asc >= 9 ? ASC_NUM.enemyAtk : 1) * (def.atk ?? 1), eliteOne: def.eliteOne });
  rewindsAtStart = b.rewinds;
  tg = { telegraph: 0, hit: 0, evade: 0, counter: 0 };
  hpAtStart = b.s.pieces.filter((p) => p.side === 0).reduce((a, p) => a + p.hp, 0);
  lossAsked = false;
  if (!labMode && runLive) {
    track('battle_start', { ...where(), enemy_id: def.title, enemy: def.enemy });
    if (INTRO.includes(def)) ftue('battle1_start');
    if (def.boss && actI === 0) ftue('act1_boss');
  }
  selCard = selPiece = openCard = null;
  busy = false;
  turnDmg = 0;
  prevKills = 0;
  ritesDone = 0;
  justCracked = [];
  $('hand').classList.remove('dealing');
  closeOverlay();
  renderer.setFoeTraits([...(b.blastPawns ? ['blast' as const] : []), ...(b.boss && (b.bossRule === 'thorns' || b.bossRule === 'gilded') ? ['thorns' as const] : [])]);
  renderer.setNemesis(b.nemesisId ?? null);
  renderer.setCracked(b.squadIds.filter((_, i) => squad[i]?.cracked));
  renderer.setBossFinish(!!def.boss);
  // 막별 판 색 · 직전 수는 새 대국에서 비운다 (2026-11-05)
  renderer.setAct(actI + 1);
  renderer.setFoeTone(def.boss ? 'boss' : def.reward === 'part' ? 'elite' : '', def.boss ? (def.bossRule ?? 'plate') : ''); // 반장마다 자기 판 · 기물 색 (D-309)
  if (def.boss) document.body.dataset.boss = def.bossRule ?? 'plate'; else delete document.body.dataset.boss;
  renderer.lastMovesClear();
  renderer.setStaggered([]);
  renderer.setBossMarks(b.stampId ?? null, b.pull?.id ?? null);
  renderer.setup(b.s);
  refresh();
  // 전환 화면 (D-165): 판이 바뀔 때마다 — 서술 한 줄 + 도움말, 눌러서 넘긴다. 판 위 규칙 한 줄은 그 뒤에
  if (!silent)
    void stageIntro(def).then(() => {
      document.body.classList.remove('between');
      refresh();
      const ready = battleIntro();
      // 반장을 처음 만나면 부관이 규칙을 짚는다 (테스터: 반장 첫 만남은 온보딩 팝업처럼 설명해야) — 반장마다 한 번
      if (def.boss && !labMode && !tutDone(`boss-${def.bossRule ?? 'plate'}`)) {
        const rule = def.bossRule ?? 'plate';
        const R0 = BOSS_RULES[rule];
        void ready.then(() => tutorial(`boss-${rule}`, [
          { text: TUT.boss.meet(R0.name), target: () => $('board').querySelector('canvas') ?? $('board') },
          { text: R0.tell.replace(/([.!?])\s+/g, '$1\n'), target: () => $('board').querySelector('canvas') ?? $('board') },
          { text: TUT.boss.badge, target: () => $('boss') },
        ]));
        return;
      }
      if (nemesisNow) return nemesisMeet(nemesisNow);
      const cracked = squad.filter((u) => u.cracked);
      toast(cracked.length ? `${def.tell} · ${LIFE_TEXT.warn(cracked.map((u) => u.name ?? PIECE_NAMES_KO[u.t]).join(' · '))}` : def.tell, 3600);
      maybeBet(def);
    });
  // 입문 첫 턴: 손패가 빛난다 (글 대신 빛나는 곳)
  coachOn = def === INTRO[0] && !readMeta(store).onboarded && !labMode;
  $('hand').classList.toggle('hint', coachOn);
};

/** 짜 둔 손패 순서 (입문 판): 적힌 순서대로 덱에서 한 장씩 꺼내 놓고 남은 카드는 뒤에 */
const arrange = (order: CommandId[], cards: CommandId[]): CommandId[] => {
  const rest = [...cards];
  const out: CommandId[] = [];
  for (const id of order) {
    const k = rest.indexOf(id);
    if (k >= 0) out.push(...rest.splice(k, 1));
  }
  return [...out, ...rest];
};

/** 판 세우기 (D-189): 칸이 대각선 물결로 깔리고 기물이 떨어져 박힌 뒤 손패가 한 장씩 들어온다 */
const battleIntro = (): Promise<void> => {
  // 판이 다 서기 전에는 누르지 못한다 (페르소나 테스트 m5)
  busy = true;
  refresh();
  window.setTimeout(() => dealHand($('hand')), 450);
  return renderer.boardIntro().finally(() => {
    busy = false;
    refresh();
  });
};

/**
 * 적 성장 깊이 (D-215): 대국 수 대신 출하 진행도 — 막 하나 = SLICE.depthPerAct. 지도가 길어져 대국이 늘어도 성장 곡선은 예전 길이 그대로.
 */
const depthNow = (): number => depthAt(actI, rowI / Math.max(1, acts[actI].rows.length));

/** 다음 노드로: 줄을 하나 넘기고 막이 끝나면 다음 막 (전환 화면), 3막 반장 뒤면 출하 완료 */
const advance = (): void => {
  rowI += 1;
  if (rowI >= acts[actI].rows.length) {
    actI += 1;
    rowI = 0;
    if (actI >= acts.length) return runEnd(true);
    const a = acts[actI];
    // 막이 바뀌면 분대가 쉰다 (반장 뒤 정비)
    squad = restSquad(squad, restHeal());
    { const m = mendSquad(squad); squad = m.squad; if (m.mended.length) window.setTimeout(() => toast(LIFE_TEXT.mended(m.mended.map((u) => u.name ?? '').join(' · ')), 3200), 1200); }
    void sceneIntro(actLabel(a.act), a.name, ACT_NARR[actI], `<i class="sf-ico" style="${iconMask('flag')}"></i>`, false, '', `act-${Math.min(3, actI + 1)}`, 'act').then(showMap);
    return;
  }
  showMap();
};
/** 층 진입 서술 (각본 §7, D-276) — 막 전환 화면 */
const ACT_NARR = ['', ACT_ENTRY[1], ACT_ENTRY[2], ACT_ENTRY[3]];
/** 막 이름표: 4막은 종막 (D-252) */
const actLabel = (n: number): string => (n === 4 ? '종막' : `${n}막`);

/** 노드에 들어간다 */
const enterNode = (n: MapNode): void => {
  if (n.battle) {
    // 저장이 먼저 (페르소나 테스트 M2): 대국을 세우며 R을 쓰므로, 세우기 전 상태를 남겨야 이어하기가 같은 대국을 다시 세운다
    saveRun('battle', picked[actI][rowI] ?? 0);
    return startBattle(n.battle);
  }
  if (n.kind === 'shop') return void sceneIntro(NODE_NAMES.shop, '고물 더미', '고물 더미 사이로 저울이 흔들린다. 나사 냄새가 난다.', `<i class="sf-ico" style="${iconArt('n.shop')}"></i>`, false, '', '', 'shop').then(shopScreen);
  if (n.kind === 'event') {
    if (!eventBag.length) eventBag = [...SLICE_EVENT_IDS];
    const id = eventBag.splice(R.int(eventBag.length), 1)[0];
    { const m = readMeta(store); writeMeta(store, { ...m, evRecent: [id, ...(m.evRecent ?? []).filter((x) => x !== id)].slice(0, EV_RECENT) }); }
    const ev = SLICE_EVENTS[id];
    return void sceneIntro(NODE_NAMES.event, ev.title, ev.text.split('.')[0] + '.', `<i class="sf-ico" style="${iconArt('n.event')}"></i>`, false, '', '', 'event').then(() => eventScreen(id));
  }
  if (n.kind === 'chest') {
    // 부품 상자 (D-215): 나사 한 줌 + 부품 하나 — 지도 가운데 층에 고정
    const screws = SLICE.chestGold[0] + R.int(SLICE.chestGold[1] - SLICE.chestGold[0] + 1);
    return void sceneIntro(NODE_NAMES.chest, '녹슨 자물쇠', '자물쇠가 삐걱이며 풀린다. 안에서 기름 냄새가 난다.', `<i class="sf-ico" style="${iconArt('n.chest')}"></i>`, false, '', '', 'chest').then(() => {
      gold += screws;
      // 부적 (D-228): 가끔 상자 바닥에 — 여벌 심장은 드물게
      const roll = R.next();
      const charm = roll < CHARM_NUM.chestRevive ? 'revive' : roll < CHARM_NUM.chestRevive + CHARM_NUM.chestRewind ? 'rewind' : null;
      if (charm) charms[charm] += 1;
      partPick(`<h2><span class="pass-tag">상자</span> 부품 하나 — 나사 +${screws}${charm ? ` · ${CHARMS[charm].name} +1` : ''}</h2><p>부품을 하나 고릅니다. 장착하면 규칙이 바뀝니다.</p>`, advance);
    });
  }
  forgeFinal = !!n.final;
  if (n.final) return void sceneIntro('종막', '최종 정비', '출하구 앞 마지막 화덕. 분대가 숨을 고른다.', `<i class="sf-ico" style="${iconArt('n.forge')}"></i>`, false, '', '', 'forge').then(forgeScreen);
  if (n.kind === 'forge') return void sceneIntro(NODE_NAMES.forge, '꺼지지 않은 화덕', '화덕이 당신을 부른다. 모루는 아직 뜨겁다.', `<i class="sf-ico" style="${iconArt('n.forge')}"></i>`, false, '', '', 'forge').then(forgeScreen);
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
  // 세로 자리는 노드의 칸(lane) — 입문 · 반장처럼 칸이 없으면 가운데
  const pos = (r: number, k: number) => {
    const lane = a.rows[r][k].lane;
    return { x: ((r + 0.5) / n) * 100, y: lane === undefined ? 50 : ((lane + 0.5) / MAP.lanes) * 100 };
  };
  const nextOf = (r: number, k: number): number[] => a.rows[r][k].to ?? a.rows[r + 1].map((_, i) => i);
  // 지금 갈 수 있는 곳 (슬더스식, D-215): 지난 줄에서 고른 노드와 이어진 노드만. 첫 줄은 전부
  const open = new Set(rowI === 0 ? row.map((_, i) => i) : nextOf(rowI - 1, picked[actI][rowI - 1] ?? 0));
  // 선: 지나온 길(금) · 지금 위치 → 다음 갈 곳들(밝게) · 그 뒤는 모두 이어진 흐린 선
  const lines: string[] = [];
  for (let r = 0; r < n - 1; r++)
    a.rows[r].forEach((_, k) =>
      nextOf(r, k).forEach((k2) => {
        const p1 = pos(r, k), p2 = pos(r + 1, k2);
        const walked = picked[actI][r] === k && picked[actI][r + 1] === k2;
        const live = r === rowI - 1 && picked[actI][r] === k && open.has(k2);
        const dead = r < rowI && picked[actI][r] !== k;
        if (dead) return;
        // 컨베이어 체인 (D-184): 검은 바깥 줄 + 고리 무늬. 지금 갈 수 있는 길은 돌아가고 고르면 나머지는 끊어진다
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
          const state = ri < rowI ? (picked[actI][ri] === k ? 'done' : 'skip') : ri === rowI ? (open.has(k) ? 'now' : 'skip') : 'later';
          return `<button type="button" class="mnd ${state} nd-${nd.kind}" style="left:${p.x}%;top:${p.y}%" ${state === 'now' ? `data-node="${k}"` : 'tabindex="-1"'} aria-label="${NODE_NAMES[nd.kind]}"><i style="${iconArt(NODE_ICONS[nd.kind])}"></i><span>${NODE_NAMES[nd.kind]}</span></button>`;
        })
        .join(''),
    )
    .join('');
  const el = document.createElement('div');
  el.className = 'mapfx';
  // 막 표지 (A-01~03)를 지도 바탕에 어둡게 깐다 — 그림이 없으면 지금 바탕 그대로
  // CSS 변수 안 url()은 스타일시트 기준으로 풀리므로 절대 주소로
  el.style.setProperty('--act', `url(${new URL(`scenes/act-${Math.min(3, actI + 1)}.png`, location.href).href})`);
  el.innerHTML = `<header><div><p class="sf-eyebrow">${actLabel(a.act)}</p><h2>${a.name}</h2></div><p class="res">나사 <b>${gold}</b> · 분대 <b>${squad.length}</b> · 덱 <b>${deck.length}</b>${parts.length ? ` · 부품 <b>${parts.length}</b>` : ''} <span class="charm-res" title="${CHARMS.revive.name} · ${CHARMS.rewind.name}"><i class="ico" style="${iconArtSmall(CHARMS.revive.icon)}"></i><b>${charms.revive}</b><i class="ico" style="${iconArtSmall(CHARMS.rewind.icon)}"></i><b>${charms.rewind}</b></span></p></header>
    <div class="map-body"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${lines.join('')}</svg>${nodes}</div>
    <footer class="map-info"><p class="hint">빛나는 곳을 고릅니다.</p><ul class="map-legend">${(['battle', 'check', 'event', 'chest', 'shop', 'forge', 'boss'] as const)
      .map((k) => `<li class="nd-${k}"><i class="ico" style="${iconArt(NODE_ICONS[k])}"></i>${NODE_NAMES[k]}</li>`)
      .join('')}</ul></footer>`;
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
      info.innerHTML = `<i class="ico nd-${nd.kind}" style="${iconArt(NODE_ICONS[nd.kind])}"></i><div class="txt"><b>${NODE_NAMES[nd.kind]}${nd.battle?.foe ? ` · ${nd.battle.foe}` : ''}</b><small>${NODE_DESC[nd.kind]}</small></div>${foes}<button class="btn brass" type="button" data-go>진입</button>`;
      info.querySelector('[data-go]')!.addEventListener('click', () => go(k));
    }),
  );
  // 부관 안내 (D-238): 첫 지도 — 지도 읽기 · 범례 · 첫 대국 고르기 · 「간다」
  if (!tutDone('map') && actI === 0) {
    const nowNodes = (): DOMRect | null => {
      const rs = [...el.querySelectorAll('.mnd.now')].map((n) => n.getBoundingClientRect());
      if (!rs.length) return null;
      const l = Math.min(...rs.map((r) => r.left));
      const t = Math.min(...rs.map((r) => r.top));
      return new DOMRect(l, t, Math.max(...rs.map((r) => r.right)) - l, Math.max(...rs.map((r) => r.bottom)) - t);
    };
    void tutorial('map', [
      { text: TUT.map.intro, target: () => el.querySelector('.map-body') },
      { text: TUT.map.legend, target: () => el.querySelector('.map-legend') },
      { text: TUT.map.pick, target: nowNodes, pad: 10, wait: () => !!el.querySelector('.mnd.chosen') },
      { text: TUT.map.go, target: () => info.querySelector('[data-go]'), wait: () => !el.isConnected || el.classList.contains('pxout') },
    ]);
  }
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
/** 다음 출하에서 뒤로 미룰 최근 사건 수 (15종 중) */
const EV_RECENT = 7;
/** 사건 화면 (R5-3, D-170): 서술 · 선택지(고를 수 없으면 이유) → 결과 한 줄 → 계속 (부품이면 고르기) */
/**
 * 사건 무대 (D-248, 사용자: 「선택지 → 해당 대화창에서 연출이 계속돼야지, 팝업 여러 개 휙휙 전환이 아니라」 · 슬더스식 흐름):
 * 한 창 안에서 ① 그림 + 서술 + NPC 첫마디 → ② 선택지 (한 번 누르면 NPC가 반응하고 한 번 더 누르면 확정, 오래 망설이면 NPC가 한마디)
 * → ③ 그 사건만의 장치가 그림 위에서 돈다 (evstage.ts — 동전 · 뽑기 바퀴 · 망치 · 담금질 …, 누르면 손맛) → ④ 결과 서술 + NPC 마무리
 * → ⑤ 사건마다 다른 나가기 버튼 (「동전 소리를 등진다」). 결과는 엔진이 먼저 정한다 — 화면은 보여 주기만 (UI 원칙 9).
 */
/**
 * 사건 선택지 설명 (테스터: 「문턱 +1이 뭔지도 모르는데」 · 「이 선택이 값어치가 있나 모르겠다」):
 * ' · '로 나뉜 조각마다 얻는 것(청록) · 잃는 것(붉은)을 칠하고 안에 든 용어는 아래에 한 줄 풀이를 붙인다.
 */
const evDesc = (desc: string): string => {
  const bad = /−|-\d|깨진다|잃|녹슨|빠진다|쓰러/;
  const good = /\+|되살|회복|얻/;
  const parts = desc.split(' · ').map((t) => `<span class="${bad.test(t) ? 'ev-bad' : good.test(t) ? 'ev-good' : 'ev-mid'}">${t}</span>`).join('<i class="ev-dot"> · </i>');
  const terms = KEYWORDS.filter(([name]) => name.length >= 2 && !/[+×]/.test(name) && desc.includes(name)).map(([name, text]) => `<span class="ev-term"><b>${name}</b> ${text.replace(/\n/g, ' ')}</span>`);
  return `<small class="ev-desc">${parts}</small>${terms.length ? `<small class="ev-terms">${terms.join('')}</small>` : ''}`;
};
const eventScreen = (id: (typeof SLICE_EVENT_IDS)[number]): void => {
  const ev = SLICE_EVENTS[id];
  const talk: EventTalk = EVENT_TALK[id] ?? { npc: ev.title, react: [], idle: [], win: '', bye: '', exit: '떠난다' };
  const st = (): EventState => ({ squad, deck, refined, gold });
  document.body.classList.add('between');
  placeBg('bg-event');
  const el = openOverlay(`<div class="ev-wrap ev-stage"><div class="ev-scene"><img src="scenes/${id}.png" alt=""><i style="${iconArt('n.event')}"></i></div><div class="ev-body"><h2>${ev.title}</h2><div class="ev-log" aria-live="polite"></div><div class="ev-choices" hidden>${ev.choices
    .map((c, k) => {
      const why = c.blocked?.(st()) ?? null;
      return `<button type="button" class="ev-choice${why ? ' off' : ''}" data-ev="${k}" ${why ? 'aria-disabled="true"' : ''}><b>${c.label}</b>${c.desc ? evDesc(c.desc) : ''}${why ? `<em>${why}</em>` : ''}<i class="ev-again">한 번 더 누르면 정한다</i></button>`;
    })
    .join('')}</div><div class="ev-exit" hidden></div><p class="dim ev-purse">나사 ${gold} · 분대 ${squad.length} · 덱 ${deck.length}</p></div></div>`);
  const scene = el.querySelector<HTMLElement>('.ev-scene')!;
  // 장면 그림이 아직 없는 사건은 공용 사건 배경 컷씬 (D-260)
  scene.querySelector('img')?.addEventListener('error', (e) => { (e.target as HTMLImageElement).src = 'scenes/bg-event.png'; }, { once: true });
  const logEl = el.querySelector<HTMLElement>('.ev-log')!;
  const choicesEl = el.querySelector<HTMLElement>('.ev-choices')!;
  const exitEl = el.querySelector<HTMLElement>('.ev-exit')!;
  const alive = () => logEl.isConnected;
  /**
   * 대화 한 줄: 서술(2인칭) · NPC(이름 + 말) — 세 줄까지만 남는다.
   * slot = 같은 자리를 다시 쓰는 줄 (테스터: 고를 때마다 아래로 줄이 늘어 창이 들썩였다 — 고른 단추가 바뀌면 그 줄에서 새로 찍힌다)
   */
  const say = async (kind: 'narr' | 'npc' | 'sum', text: string, who?: string, slot?: string): Promise<void> => {
    if (!text || !alive()) return;
    const old = slot ? logEl.querySelector<HTMLElement>(`[data-slot="${slot}"]`) : null;
    const line = old ?? document.createElement('p');
    line.className = `ev-line ${kind}`;
    if (slot) line.dataset.slot = slot;
    line.innerHTML = kind === 'npc' ? `<b>${who ?? talk.npc}</b><span></span>` : kind === 'sum' ? '<b>결과</b><span></span>' : '<span></span>';
    if (!old) logEl.appendChild(line);
    while (logEl.children.length > 3) logEl.firstElementChild!.remove();
    logEl.querySelectorAll('.ev-line').forEach((x, i, all) => x.classList.toggle('old', i < all.length - 1));
    replay(line, 'in');
    if (kind === 'npc') sfx('tap', 4);
    // 서술은 문장마다 줄을 바꾼다 (D-263): 「…부른다.⏎장인은 잠들었고 …」
    const shown = kind === 'narr' ? text.replace(/([.!?…])\s+(?=\S)/g, '$1\n') : text;
    await typeIn(line.querySelector('span')!, shown, kind === 'npc' ? 26 : 18, undefined, alive);
  };
  let busy = true;
  let idleN = 0;
  let lastAct = performance.now();
  const idle = window.setInterval(() => {
    if (!alive()) return window.clearInterval(idle);
    if (busy || performance.now() - lastAct < 7000 || idleN >= talk.idle.length) return;
    lastAct = performance.now();
    void say('npc', talk.idle[idleN++], undefined, 'react');
  }, 1000);
  const m = ev.text.match(/^(.*?)\s*(“[^”]+”)(.*)$/);
  const narr = m ? (m[1] + (m[3] ? ` ${m[3].trim()}` : '')).trim() : ev.text;
  void (async () => {
    await say('narr', narr);
    if (m) await say('npc', m[2]);
    choicesEl.hidden = false;
    replay(choicesEl, 'in');
    busy = false;
    lastAct = performance.now();
  })();
  /** ⑤ 나가기 */
  const showExit = (label: string, go: () => void): void => {
    exitEl.innerHTML = `<button class="btn brass" type="button">${label}</button>`;
    exitEl.hidden = false;
    replay(exitEl, 'in');
    exitEl.querySelector('button')!.addEventListener('click', () => { window.clearInterval(idle); go(); }, { once: true });
  };
  let picked = -1;
  el.querySelectorAll<HTMLElement>('[data-ev]').forEach((btn) =>
    btn.addEventListener('click', () => {
      if (busy) return;
      if (btn.classList.contains('off')) return toast('지금은 고를 수 없습니다.');
      const k = Number(btn.dataset.ev);
      lastAct = performance.now();
      // 첫 탭: 고르는 중 — NPC가 반응한다
      if (picked !== k) {
        picked = k;
        choicesEl.querySelectorAll('.ev-choice').forEach((x) => x.classList.toggle('chosen', x === btn));
        sfx('lift');
        void say('npc', talk.react[k] ?? talk.react[talk.react.length - 1] ?? '', undefined, 'react');
        return;
      }
      // 두 번째 탭: 정한다
      busy = true;
      sfx('stamp');
      const c = ev.choices[k];
      choicesEl.querySelectorAll<HTMLElement>('.ev-choice:not(.chosen)').forEach((x) => (x.style.visibility = 'hidden'));
      void (async () => {
        if (!c.desc) {
          choicesEl.hidden = true;
          await say('npc', talk.bye);
          return showExit(talk.exit, advance);
        }
        const before = { crew: squad.map((u) => ({ ...u })), deck: [...deck], gold };
        const s0 = st();
        const out = c.apply(s0, sub());
        // 저울추 (D-247): 같은 창 안에서 카드를 고른다
        if (out.cardPick === 'counterweight') {
          choicesEl.hidden = true;
          const rid = await new Promise<CommandId>((done) => {
            const ids = weighable(s0);
            const strip = document.createElement('div');
            strip.className = 'ev-cards';
            strip.innerHTML = ids.map((x) => `<button type="button" class="ev-card" data-cw="${x}">${keysHtml(COMMANDS[x].cost)}<b>${COMMANDS[x].name}</b><small>태엽 ${COMMANDS[x].cost} → <i>${COMMANDS[x].cost - 1}</i></small></button>`).join('');
            choicesEl.after(strip);
            replay(strip, 'in');
            strip.querySelectorAll<HTMLElement>('[data-cw]').forEach((cb) => cb.addEventListener('click', () => { strip.remove(); done(cb.dataset.cw as CommandId); }, { once: true }));
          });
          counterweight(s0, rid, sub());
          out.text = '';
        }
        squad = s0.squad;
        deck = s0.deck;
        refined.splice(0, refined.length, ...s0.refined);
        gold = s0.gold;
        if (out.recruit) squad.push(crewOf(out.recruit));
        // 바뀐 것 (D-260): 실제 카드 · 기물에 FX — 같은 바탕 카드끼리는 강화 · 녹, 나머지는 파괴 · 새 카드
        const minus = <T,>(a: T[], b: T[]) => { const r = [...b]; return a.filter((x) => { const i = r.indexOf(x); if (i < 0) return true; r.splice(i, 1); return false; }); };
        const outs = minus(before.deck, deck), ins = minus(deck, before.deck);
        const face = (cid: CommandId) => cardFace(cid, 'tabindex="-1" aria-hidden="true"');
        const cards: CardFx[] = [];
        for (const o of outs) {
          const k = ins.findIndex((x) => baseOf(x) === baseOf(o));
          if (k >= 0) { const n = ins.splice(k, 1)[0]; cards.push({ before: face(o), after: face(n), fx: isRusted(n) ? 'rust' : 'up' }); }
          else cards.push({ before: face(o), fx: 'break' });
        }
        for (const n of ins) cards.push({ after: face(n), fx: 'new' });
        const src = (t: PieceType) => `pieces/l-${t}0.png`;
        const crewFx: CrewFx[] = [];
        for (const u0 of before.crew) {
          const u1 = squad.find((x) => x.serial === u0.serial);
          const max = crewMaxHp(u0), hp0 = u0.hp ?? max;
          if (!u1) { crewFx.push({ src: src(u0.t), name: crewLabel(u0), hp0, hp1: 0, max, fx: 'die' }); continue; }
          const hp1 = u1.hp ?? crewMaxHp(u1);
          if (u1.t !== u0.t) crewFx.push({ src: src(u0.t), toSrc: src(u1.t), name: crewLabel(u1), hp0: Math.round((hp0 / max) * crewMaxHp(u1)), hp1, max: crewMaxHp(u1), fx: 'evolve' });
          else if ((u1.doors ?? 0) > (u0.doors ?? 0)) crewFx.push({ src: src(u1.t), name: crewLabel(u1), hp0, hp1, max, fx: 'up', tag: '문턱 +1' });
          else if (hp1 !== hp0) crewFx.push({ src: src(u1.t), name: crewLabel(u1), hp0, hp1, max, fx: 'hp' });
        }
        for (const u1 of squad) if (!before.crew.some((x) => x.serial === u1.serial)) crewFx.push({ src: src(u1.t), name: crewLabel(u1), hp0: u1.hp ?? crewMaxHp(u1), hp1: u1.hp ?? crewMaxHp(u1), max: crewMaxHp(u1), fx: 'new' });
        // 좋은 결과: 확률 선택은 첫 칸(판정기는 둘째 칸 「한 단계 위」도 좋음), 아니면 좋다
        const good = out.slot === undefined || out.slot === 0 || (id === 'brokenGacha' && out.slot === 1);
        choicesEl.hidden = true;
        // 확률 장치는 셋만 (D-260): 동전 · 칸 셋 · 긁는 칸 셋
        const chance: Parameters<typeof runEventFx>[1]['chance'] =
          id === 'gambler' ? { kind: 'coin', win: good }
          : id === 'brokenGacha' ? { kind: 'slots', win: good, items: out.slot === 0 ? ['gear-gold', 'gear-gold', 'gear-gold'] : out.slot === 1 ? ['crown-gold', 'crown-gold', 'crown-gold'] : ['gear-gold', 'gear-gold', 'gear-broken'] }
          : id === 'auction' ? { kind: 'scratch', win: good, items: good ? ['gear-gold', 'gear-gold', 'gear-gold'] : ['gear-gold', 'gear-gold', 'rust'] }
          : undefined;
        await runEventFx(el.querySelector<HTMLElement>('.ev-wrap')!, { id, good, chance, cards, crew: crewFx, tap: talk.tap });
        if (good) sfx(out.partPick ? 'rare' : 'coin'); else sfx('hurt');
        el.querySelector('.ev-purse')!.textContent = `나사 ${gold} · 분대 ${squad.length} · 덱 ${deck.length}`;
        // ③ 상황 + 대사 + 요약 (D-263): 무엇이 일어났는지는 서술 · 누가 무슨 말을 했는지는 대사 · 무엇이 바뀌었는지는 시스템 요약
        const oc = EVENT_OUTCOME[id]?.[`${k}:${out.slot ?? 0}`];
        if (oc) {
          await say('narr', oc.scene);
          if (oc.line) await say('npc', oc.line, oc.who);
        } else {
          if (out.text) await say('narr', out.text);
          await say('npc', good ? talk.win : talk.lose ?? talk.win);
        }
        const sum = evSummary(before, cards, out);
        if (sum) await say('sum', sum);
        showExit(out.partPick ? '부품을 고른다' : talk.exit, () => (out.partPick ? partPick(`<h2>${ev.title} — 부품 하나</h2>`, advance, !!out.elite) : advance()));
      })();
    }),
  );
};

/** 사건 결과 요약 한 줄 (D-263): 앞뒤 상태를 비교해 바뀐 것만 — 카드 · 분대원 · 나사 · 부품 */
const evSummary = (before: { crew: Crew[]; deck: CommandId[]; gold: number }, cards: CardFx[], out: { partPick?: boolean; elite?: boolean }): string => {
  const sum: string[] = [];
  const n = (fx: CardFx['fx']) => cards.filter((c) => c.fx === fx).length;
  if (n('up')) sum.push(`카드 다듬기 ×${n('up')} (태엽 −1)`);
  if (n('rust')) sum.push(`녹슨 카드 ×${n('rust')} (태엽 +1)`);
  if (n('break')) sum.push(`카드 부서짐 ×${n('break')}`);
  if (n('new')) sum.push(`새 카드 ×${n('new')}`);
  const pcts: { name: string; d: number }[] = [];
  for (const u0 of before.crew) {
    const u1 = squad.find((x) => x.serial === u0.serial);
    const name = crewLabel(u0);
    if (!u1) { sum.push(`${name} 잃음`); continue; }
    if (u1.t !== u0.t) sum.push(`${name} ${PIECE_NAMES_KO[u0.t]} → ${PIECE_NAMES_KO[u1.t]}`);
    if ((u1.doors ?? 0) > (u0.doors ?? 0)) sum.push(`${name} 문턱 +${(u1.doors ?? 0) - (u0.doors ?? 0)}`);
    if (u1.cracked && !u0.cracked) sum.push(`${name} 심장 톱니 금`);
    if (u1.t === u0.t) {
      const d = Math.round((((u1.hp ?? crewMaxHp(u1)) - (u0.hp ?? crewMaxHp(u0))) / crewMaxHp(u0)) * 100);
      if (d) pcts.push({ name, d });
    }
  }
  if (pcts.length) {
    if (pcts.length === before.crew.length && pcts.length > 1) {
      // 최대 HP에 막힌 분대원 때문에 조금씩 다르다 — 가장 크게 바뀐 값을 5% 단위로 (규칙 수치와 같게)
      const big = pcts.reduce((a, p) => (Math.abs(p.d) > Math.abs(a) ? p.d : a), 0);
      sum.push(`분대 전원 HP ${big > 0 ? '+' : '−'}${Math.round(Math.abs(big) / 5) * 5}%`);
    } else for (const p of pcts) sum.push(`${p.name} HP ${p.d > 0 ? '+' : '−'}${Math.abs(p.d)}%`);
  }
  for (const u1 of squad) if (!before.crew.some((x) => x.serial === u1.serial)) sum.push(`합류 · ${crewLabel(u1)} (${PIECE_NAMES_KO[u1.t]})`);
  if (gold !== before.gold) sum.push(`나사 ${gold > before.gold ? '+' : '−'}${Math.abs(gold - before.gold)}`);
  if (out.partPick) sum.push(out.elite ? '희귀 이상 부품 하나를 고른다' : '부품 하나를 고른다');
  return sum.join(' · ');
};

/** 고물상 (R5-2): 카드 4 · 부품 1 · 정비 · 카드 빼기. 여러 개 사도 된다, 떠나기로 끝 */
/** 지금 분대 · 덱의 축 · 부품 한 줄 (고물상 머리) */
const shopStatus = (): string => {
  const ax = new Map<Axis, number>();
  for (const id of deck) { const c = COMMANDS[id]; if (c?.axis) ax.set(c.axis, (ax.get(c.axis) ?? 0) + 1); }
  const pc = new Map<PieceType, number>();
  for (const u of squad) pc.set(u.t, (pc.get(u.t) ?? 0) + 1);
  const axLine = [...ax].sort((a, b) => b[1] - a[1]).map(([a, n]) => `<span class="axis ax-${a}">${AXIS_NAMES[a]} ${n}</span>`).join('');
  const pcLine = (['K', 'Q', 'R', 'B', 'N', 'P'] as PieceType[]).filter((t) => pc.get(t)).map((t) => `<span class="ssp">${pieceImg(t, 0, 'small', 18)}${pc.get(t)}</span>`).join('');
  const ptLine = parts.map((id) => `<i class="ico" title="${SLICE_PARTS[id].name}" style="${iconArt(SLICE_PARTS[id].icon)}"></i>`).join('');
  return `<div class="shop-status"><span class="ss-k">분대</span>${pcLine}<span class="ss-k">덱 ${deck.length}</span>${axLine}${ptLine ? `<span class="ss-k">부품</span>${ptLine}` : ''}</div>`;
};
/**
 * 물건 하나가 지금 덱과 얼마나 맞는지 — 그림을 가리지 않는 한 줄 (D-327, 사용자: 「~와 맞물림은 자리를 차지하고 직관적이지 않다 — 내 덱에 나이트 N장 · 연쇄 N장」).
 * 「덱 나이트 3 · 연쇄 4」 = 내 덱에서 같은 「누가」 카드 수 · 같은 「어떤」 카드 수. 그 기물이 분대에 없으면 붉은 「분대에 룩 없음」.
 */
const fitHint = (kind: 'card' | 'part', id: string): { text: string; tone: 'good' | 'bad' | 'mid' } | null => {
  const t = kind === 'card' ? cardTags(id as CommandId) : partTags(id as SlicePartId);
  if (t.who !== 'any' && t.who !== 'K' && !squad.some((u) => u.t === t.who)) return { text: `분대에 ${PIECE_NAMES_KO[t.who]} 없음`, tone: 'bad' };
  const dt = deck.map((d) => cardTags(d));
  const nWho = t.who === 'any' ? 0 : dt.filter((x) => x.who === t.who).length;
  const nSty = dt.filter((x) => x.style === t.style).length;
  const bits = [t.who !== 'any' ? `${PIECE_NAMES_KO[t.who]} 카드 <b>${nWho}</b>` : '', `${STYLE_NAMES[t.style]} <b>${nSty}</b>`].filter(Boolean);
  return { text: `내 덱 ${bits.join(' · ')}`, tone: nWho + nSty >= 4 ? 'good' : 'mid' };
};
const shopScreen = (): void => {
  // 장소 배경 (D-200): 녹슨 룩의 고물상 BG-01 — 창은 오른쪽
  document.body.classList.add('between');
  placeBg('bg-shop');
  const rng = sub();
  const pool = REWARD_COMMANDS.filter((id) => usable(id) && isOpen(id));
  const cards: CommandId[] = [];
  while (cards.length < SHOP.cards && pool.length) cards.push(pool.splice(rng.int(pool.length), 1)[0]);
  const partPool = (Object.keys(SLICE_PARTS) as SlicePartId[]).filter((id) => !parts.includes(id) && isOpen(id) && partFits(id, squad.map((u) => u.t), parts));
  // 첫 출하의 첫 고물상 (D-232, Balatro 첫 상점 보장): 쥔 핵심 부품과 같은 축의 보통 등급 부품을 꼭 하나 — 「맞물린다」를 처음 손에 쥐게
  const mineAx = parts.map((id) => SLICE_PARTS[id].axis).filter(Boolean);
  const fits = firstShip && shopsSeen === 0 ? partPool.filter((id) => mineAx.includes(SLICE_PARTS[id].axis) && (PART_GRADE[id] ?? 'common') === 'common') : [];
  const from = fits.length ? fits : partPool;
  const part = from.length ? from[rng.int(from.length)] : null;
  shopsSeen += 1;
  if (shopsSeen === 1) ftue('first_shop');
  const sold = new Set<string>();
  // 부적 (D-228): 카드처럼 가끔 진열대 한 칸에 — 나오면 카드 하나 자리를 차지한다 (사용자: 「드물게 등장하는 카드처럼」)
  const charmRoll = rng.next();
  const charmOffer = charmRoll < CHARM_NUM.shopReviveChance ? 'revive' : charmRoll < CHARM_NUM.shopReviveChance + CHARM_NUM.shopRewindChance ? 'rewind' : null;
  if (charmOffer) cards.pop();
  // 값은 등급으로 (D-217 3 — 슬더스식): 일반 · 희귀 · 황금
  // 아래 줄 서비스는 셋 중 둘만 (D-247) — 같은 고물상에서 다듬기 · 빼기 · 정비를 다 누리지 못한다
  const svcAll = ['heal', 'refine', 'remove'] as const;
  const svcShown = new Set<string>();
  while (svcShown.size < Math.min(ECON.shopSvc, svcAll.length)) svcShown.add(svcAll[rng.int(svcAll.length)]);
  const refinePrice = () => ascPrice(SHOP.refinePrice + ECON.svcStep * svcUsed.refine);
  const removePrice = () => ascPrice(SHOP.removePrice + ECON.svcStep * svcUsed.remove);
  const price = (id: CommandId) => ascPrice(SHOP.gradePrice[gradeOf(id)]);
  const partPrice = (id: SlicePartId) => ascPrice(SHOP.partGradePrice[PART_GRADE[id] ?? 'common']);
  const render = (): void => {
    const tag = (key: string, cost: number) => (sold.has(key) ? '<span class="price sold">팔림</span>' : `<span class="price ptag${gold < cost ? ' poor' : ''}"><i class="scr" role="img" aria-label="나사"></i>${cost}</span>`);
    const el = openOverlay(`<div class="shop-head"><h2>고물상 <span class="dim">— 나사 ${gold}</span></h2><button class="btn brass" type="button" data-leave>떠나기</button></div>
      <div class="shop-scrollbox"><div class="shop-scroll"><div class="shop-grid">
        ${cards.map((id) => cardFace(id, `data-buy="card:${id}"`, tag(id, price(id)), sold.has(id) ? 'sold' : '')).join('')}
        ${part ? partFace(part, `data-buy="part:${part}"`, tag('part', partPrice(part)), sold.has('part') ? 'sold' : '') : ''}
        ${charmOffer ? `<button type="button" class="cf part-card svc ${charmOffer === 'revive' ? 'g-gold' : 'g-rare'}${sold.has(charmOffer) ? ' sold' : ''}" data-buy="${charmOffer}"><b class="cf-name">${CHARMS[charmOffer].name}</b><span class="cf-win"><i class="ico" style="${iconArt(CHARMS[charmOffer].icon)}"></i></span><small class="cf-desc">${descLines(CHARMS[charmOffer].desc)}</small>${tag(charmOffer, ascPrice(charmOffer === 'revive' ? CHARM_NUM.shopRevivePrice : CHARM_NUM.shopRewindPrice))}</button>` : ''}
        ${svcShown.has('heal') ? `<button type="button" class="cf part-card svc g-common${sold.has('heal') ? ' sold' : ''}" data-buy="heal"><b class="cf-name">정비</b><span class="cf-win"><i class="ico" style="${iconArt('s.heal')}"></i></span><small class="cf-desc">${descLines(`삐걱이는 관절을 하나씩 조인다. (분대 전원 HP +${Math.round(SHOP.healPct * 100)}%)`)}</small>${tag('heal', ascPrice(SHOP.healPrice))}</button>` : ''}
        ${svcShown.has('refine') ? `<button type="button" class="cf part-card svc g-common${sold.has('refine') ? ' sold' : ''}" data-buy="refine"><b class="cf-name">다듬기</b><span class="cf-win"><i class="ico" style="${iconArt('s.refine')}"></i></span><small class="cf-desc">${descLines('거친 날을 고르게 깎는다. (카드 한 장 태엽 −1)')}</small>${tag('refine', refinePrice())}</button>` : ''}
        ${svcShown.has('remove') ? `<button type="button" class="cf part-card svc g-common${sold.has('remove') ? ' sold' : ''}" data-buy="remove"><b class="cf-name">카드 빼기</b><span class="cf-win"><i class="ico" style="${iconArt('s.remove')}"></i></span><small class="cf-desc">${descLines('쓸모없는 명령서를 찢어 버린다. (카드 한 장 제거 — 영구)')}</small>${tag('remove', removePrice())}</button>` : ''}
      </div></div></div>`);
    pxRail(el.querySelector<HTMLElement>('.shop-scroll')!);
    // 시너지 힌트 (테스터: 「내 덱 · 현황에 맞게 무엇을 골라야 할지 감이 안 온다 — 기병 시너지면 보유 나이트 n기 같은 힌트」)
    el.querySelector('.shop-head')!.insertAdjacentHTML('afterend', shopStatus());
    el.querySelectorAll<HTMLElement>('[data-buy^="card:"], [data-buy^="part:"]').forEach((btn) => {
      const [kind, id] = btn.dataset.buy!.split(':');
      const h = fitHint(kind as 'card' | 'part', id);
      if (h) (btn.querySelector('.cf-type') ?? btn).insertAdjacentHTML('afterend', `<small class="fit-line ${h.tone}">${h.text}</small>`);
    });
    el.querySelector('[data-leave]')!.addEventListener('click', advance);
    el.querySelectorAll<HTMLElement>('[data-buy]').forEach((btn) =>
      btn.addEventListener('click', () => {
        const [kind, id] = (btn.dataset.buy ?? '').split(':');
        const key = kind === 'card' ? id : kind;
        if (sold.has(key)) return;
        const cost = kind === 'card' ? price(id as CommandId) : kind === 'part' ? partPrice(id as SlicePartId) : kind === 'heal' ? ascPrice(SHOP.healPrice) : kind === 'refine' ? refinePrice() : kind === 'rewind' ? ascPrice(CHARM_NUM.shopRewindPrice) : kind === 'revive' ? ascPrice(CHARM_NUM.shopRevivePrice) : removePrice();
        if (gold < cost) return toast(`‘나사가 모자라.’ (${cost} 필요)`);
        const label = kind === 'card' ? `${josa(COMMANDS[id as CommandId].name, '을')} 산다 — 나사 ${cost}` : kind === 'part' ? `${josa(SLICE_PARTS[id as SlicePartId].name, '을')} 산다 — 나사 ${cost}` : kind === 'heal' ? `분대를 정비한다 — 나사 ${cost}` : kind === 'rewind' || kind === 'revive' ? `${josa(CHARMS[kind].name, '을')} 산다 — 나사 ${cost}` : `카드 한 장을 뺀다 — 나사 ${cost}`;
        choose(btn, label, () => {
          // 나사로 다듬기 (D-218 — 남는 나사를 쓸 곳 · 강화 경로): 고르면 값을 치르고 고물상으로 돌아온다
          if (kind === 'refine') return refineScreen(render, () => { gold -= cost; svcUsed.refine += 1; sold.add(key); render(); }, 'shop');
          if (kind === 'remove') {
            return deckView('remove', (removed) => {
              if (removed) {
                gold -= cost;
                svcUsed.remove += 1;
                sold.add(key);
              }
              render();
            });
          }
          // 부품 칸이 가득이면 녹일 것을 먼저 고른다 (D-247) — 두고 가면 값을 치르지 않는다
          if (kind === 'part') return gainPart(id as SlicePartId, (took) => { if (took) { gold -= cost; sold.add(key); sfx('coin'); } render(); });
          gold -= cost;
          sold.add(key);
          sfx('coin');
          if (kind === 'card') deck.push(id as CommandId);
          if (kind === 'rewind' || kind === 'revive') charms[kind] += 1;
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
/** 종막 최종 정비 (D-252): 선택지 셋 다 · 들어오면 분대 HP 가득 */
let forgeFinal = false;
/** 작업대 보강 (D-319): 분대원 하나 — 문턱 +FORGE.braceDoors (킹 제외) */
const braceScreen = (): void => {
  const list = squad.map((u, i) => ({ u, i })).filter(({ u }) => u.t !== 'K');
  const el = openOverlay(`<h2>보강 <span class="dim">— 축을 덧댈 분대원 하나</span></h2><div class="part-cards">${list.map(({ u, i }) => optFace({ name: u.name ?? PIECE_NAMES_KO[u.t], art: pieceImg(u.t, 0, 'large', 72), desc: `한 번 더 버틸 축을 덧댄다. (문턱 ${u.doors ?? 0} → ${(u.doors ?? 0) + FORGE.braceDoors})`, attrs: `data-brace="${i}"` })).join('')}</div>`);
  el.querySelectorAll<HTMLElement>('[data-brace]').forEach((btn) => btn.addEventListener('click', () => {
    const i = Number(btn.dataset.brace);
    squad[i] = { ...squad[i], doors: (squad[i].doors ?? 0) + FORGE.braceDoors };
    sfx('stamp');
    toast(`${squad[i].name ?? PIECE_NAMES_KO[squad[i].t]}의 축이 두꺼워졌다. (문턱 +${FORGE.braceDoors})`);
    window.setTimeout(advance, 600);
  }));
};
const forgeScreen = (): void => {
  // 장소 배경 (D-200): 외눈 정비공의 작업대 BG-02 — 정비공이 왼쪽, 창은 오른쪽
  document.body.classList.add('between');
  placeBg('bg-forge');
  // 작업대에 들르면 깨진 심장 톱니를 모두 새로 끼운다 (D-219 — 고르지 않아도 된다)
  const mend = mendSquad(squad);
  squad = mend.squad;
  // 셋 중 둘만 (D-247): 출하 씨앗으로 정해 이어하기에서도 같다
  const frng = sub();
  const hide = (['refine', 'remove', 'repair'] as const)[frng.int(3)];
  void hide;
  // 넷 다 보인다 (테스터: 「작업대가 할 수 있는 게 너무 적다」 — 예전엔 셋 중 둘). 고르는 건 여전히 하나
  const opt = (_k: 'refine' | 'remove' | 'repair' | 'brace', html: string) => html;
  if (forgeFinal) squad = squad.map((u) => ({ ...u, hp: crewMaxHp(u) }));
  // 최종 정비 (각본 S5): 외눈 정비공의 마지막 말
  if (forgeFinal) window.setTimeout(() => toast(GILDED_STORY.forge.map((l) => `${l.who} “${l.t}”`).join(' '), 4200), 600);
  const el = openOverlay(`<h2>${forgeFinal ? '최종 정비 <span class="dim">— 분대 HP 가득 · 하나를 더 고릅니다</span>' : '작업대 <span class="dim">— 하나를 고릅니다</span>'}</h2>${mend.mended.length ? `<p class="mend-line">${mend.mended.map((u) => `<span class="mend">${lifePips(u, 'mend')} ${u.name}</span>`).join(' ')} <span class="dim">${LIFE_TEXT.mended(mend.mended.map((u) => u.name ?? '').join(' · '))}</span></p>` : ''}
    <div class="part-cards">
      ${opt('refine', optFace({ name: '다듬기', art: `<i class="ico" style="${iconArt('s.refine')}"></i>`, desc: '거친 날을 고르게 깎는다. (카드 한 장 태엽 −1)', attrs: 'data-forge="refine"' }))}
      ${opt('remove', optFace({ name: '카드 빼기', art: `<i class="ico" style="${iconArt('s.remove')}"></i>`, desc: '쓸모없는 명령서를 찢어 버린다. (카드 한 장 제거 — 영구)', attrs: 'data-forge="remove"' }))}
      ${opt('repair', optFace({ name: '수리', art: `<i class="ico" style="${iconArt('s.repair')}"></i>`, desc: `삐걱이는 관절을 하나씩 조인다. (분대 전원 HP +${Math.round(FORGE.repairPct * 100)}%)`, attrs: 'data-forge="repair"' }))}
      ${squad.some((u) => u.t !== 'K') ? opt('brace', optFace({ name: '보강', art: `<i class="ico" style="${iconArt('shieldWall')}"></i>`, desc: `무너질 자리에 버팀목을 댄다. (분대원 하나 문턱 +${FORGE.braceDoors})`, attrs: 'data-forge="brace"', grade: 'rare' })) : ''}
    </div>`);
  el.querySelectorAll<HTMLElement>('[data-forge]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const k = btn.dataset.forge;
      const label = k === 'refine' ? '카드 하나를 다듬는다' : k === 'remove' ? '카드 한 장을 뺀다' : k === 'brace' ? '분대원 하나를 보강한다' : '분대를 수리한다';
      choose(btn, label, () => {
        if (k === 'brace') return braceScreen();
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
/** 다듬기 화면 — back = 그만두면 돌아갈 곳, done = 다듬은 뒤 (작업대: 다음 노드로 · 고물상: 값을 치르고 고물상으로, D-218) */
const refineScreen = (back: () => void = forgeScreen, done: () => void = advance, who: keyof typeof REFINE_TALK = 'forge'): void =>
  pickCardScreen('다듬기 <span class="dim">— 카드 하나</span>', `<span class="npc-line"><b>${REFINE_TALK[who].npc}</b> ${REFINE_TALK[who].line}</span>`, [...new Set(deck)].filter((id) => !isRefined(id) && COMMANDS[id].cost >= 1), (rid) => {
    deck[deck.indexOf(rid)] = refineOnce(rid);
    refined.push(rid);
    sfx('stamp');
    toast(`${COMMANDS[rid].name} 한 장 — 태엽 −1`);
    window.setTimeout(done, 300);
  }, back, '다듬는다');

/**
 * 카드 한 장 고르기 (다듬기 · 저울추): 보상 화면과 같은 카드 얼굴을 가로로, 카드 안 아래에 「태엽 2 → 1」 (D-245).
 * 두 단계 확인 (choose의 「다듬는다」 · 「올린다」).
 */
const pickCardScreen = (title: string, desc: string, ids: CommandId[], onPick: (id: CommandId) => void, back: () => void, verb = '저울에 올린다'): void => {
  const el = openOverlay(`<h2>${title}</h2><p>${desc}</p>${ids.length
    ? `<div class="shop-scrollbox"><div class="shop-scroll reward-scroll"><div class="reward-cards refine-cards">${ids
        .map((id) => cardFace(id, `data-ref="${id}"`, `<span class="refine-tag" aria-label="태엽 ${COMMANDS[id].cost}에서 ${COMMANDS[id].cost - 1}로">태엽 ${COMMANDS[id].cost} → <i>${COMMANDS[id].cost - 1}</i></span>`))
        .join('')}</div></div></div>`
    : '<p class="dim">고를 카드가 없습니다.</p>'}<div class="row"><button class="btn" type="button" data-back>그만두기</button></div>`);
  const rs = el.querySelector<HTMLElement>('.reward-scroll');
  if (rs) pxRail(rs);
  el.querySelector('[data-back]')!.addEventListener('click', back);
  el.querySelectorAll<HTMLElement>('[data-ref]').forEach((btn) =>
    btn.addEventListener('click', () => choose(btn, `${josa(COMMANDS[btn.dataset.ref as CommandId].name, '을')} ${verb}`, () => onPick(btn.dataset.ref as CommandId))),
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
/**
 * 진입 화면 (D-319 전면 리뉴얼, 테스터: 「대국 진입 꾸밈이 어색 · ×2가 사각형에 가려짐 · 진입마다 제각기의 연출」).
 * 작업대 판 위에 「이름표 → 무대 → 이름 도장 → 서술」. 무대는 진입마다 다르다:
 *   battle = 컨베이어에 적 기물이 하나씩 떨어져 박힌다 · check = 같은 줄을 붉은 렌즈가 훑고 「검문」 도장 · shop = 저울이 흔들리고 나사가 떨어진다
 *   event = 물음 카드가 뒤집힌다 · chest = 자물쇠가 떨다 튄다 · forge = 망치가 세 번 내리친다 · act = 막 표지 그림 위 깃발
 * 모든 움직임은 예비 동작 → 터짐 → 출렁임, 사라짐은 철문(shutter) — 페이드 없음 (D-216).
 */
type EntryKind = 'battle' | 'check' | 'shop' | 'event' | 'chest' | 'forge' | 'act';
const sceneIntro = (label: string, name: string, narr: string, art: string, boss = false, roster = '', bg = '', kind: EntryKind = 'act', foes: PieceType[] = []): Promise<void> =>
  new Promise((resolve) => {
    void boss;
    void roster;
    const el = document.createElement('div');
    el.className = `stagefx entry2 en-${kind}${bg ? ' has-bg' : ''}`;
    if (foes.length) el.style.setProperty('--scan-at', `${260 + foes.length * 110 + 340}ms`);
    if (bg) el.style.setProperty('--sf-bg', `url(${new URL(`scenes/${bg}.png`, location.href).href})`);
    const lineup = foes.length
      ? `<div class="en-line">${foes.map((t, i) => `<span class="en-pc" style="--i:${i}">${pieceImg(t, 1, 'small', 48)}</span>`).join('')}</div><i class="en-belt"></i>${kind === 'check' ? '<i class="en-scan"></i><b class="en-stamp">검문</b>' : ''}`
      : `<div class="en-prop">${art}</div>${kind === 'shop' ? Array.from({ length: 5 }, (_, i) => `<i class="en-screw" style="--i:${i}"></i>`).join('') : ''}`;
    el.innerHTML = `<div class="en-table"><p class="en-plate">${label}</p><div class="en-stage">${lineup}</div><h1 class="en-name">${name}</h1><p class="sf-narr en-narr"></p></div>
      <p class="sf-tip">${TIPS[Math.floor(Math.random() * TIPS.length)]}</p><p class="sf-skip">눌러서 계속</p>`;
    const T: number[] = [];
    const at = (ms: number, fn: () => void) => T.push(window.setTimeout(fn, ms));
    const hitAt = (sel: string, n: number, spread: number) => {
      const r = el.querySelector(sel)?.getBoundingClientRect();
      if (r) sparksAt(r.left + r.width / 2, r.bottom - 4, n, spread);
    };
    // 철문 전환 (D-184): 닫힌 사이에 장면을 세우고 문이 열리는 박자에 맞춰 연출을 시작한다
    void shutter(() => {
      document.body.appendChild(el);
      el.classList.add('run');
      // 기물이 떨어질 때마다 쿵 (대국 · 검문)
      foes.forEach((_, i) => at(260 + i * 110 + 150, () => { sfx('land'); if (i === foes.length - 1) shake(el.querySelector('.en-stage'), 1); }));
      const after = foes.length ? 260 + foes.length * 110 + 260 : 420;
      if (kind === 'check') { at(after + 80, () => sfx('threat')); at(after + 900, () => { sfx('stamp'); shake(el, 2); hitAt('.en-stamp', 10, 50); }); }
      if (kind === 'shop') [0, 1, 2, 3, 4].forEach((i) => at(520 + i * 120, () => sfx('coin' as never)));
      if (kind === 'chest') at(900, () => { sfx('rare'); shake(el, 2); hitAt('.en-prop', 14, 60); });
      if (kind === 'forge') [520, 900, 1280].forEach((ms) => at(ms, () => { sfx('stamp'); hitAt('.en-prop', 8, 46); shake(el.querySelector('.en-stage'), 1); }));
      if (kind === 'event') at(760, () => sfx('lift'));
      if (kind === 'act') at(380, () => { sfx('land'); hitAt('.en-prop', 8, 44); });
      // 이름 도장 → 서술
      at(after + (kind === 'check' ? 700 : 120), () => { sfx('stamp'); el.classList.add('named'); });
      at(after + (kind === 'check' ? 1000 : 420), () => void typeIn(el.querySelector<HTMLElement>('.en-narr')!, narr, 20));
    });
    let done = false;
    const close = () => {
      if (done) return;
      done = true;
      T.forEach(clearTimeout);
      // 글은 바로 걷는다 — 철문이 닫히는 동안 서술이 다음 판 위에 남아 겹쳐 보였다 (2026-11-06 APK 피드백)
      el.classList.add('closing');
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
    // 저절로 넘어가는 때 (D-263): 서술이 다 찍히고 읽을 시간(글자당 60ms, 최소 2.4초)을 준 뒤 — 누르면 언제든 넘어간다
    const lead = foes.length ? 260 + foes.length * 110 + 680 : 840;
    window.setTimeout(close, lead + (kind === 'check' ? 600 : 0) + narr.length * 20 + Math.max(2400, narr.length * 60));
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
  // 반장은 따로 (D-249): 오른쪽 끝 초상 · 디더 경계 · 경계선 FX
  if (def.boss) {
    const real = def.bossRule ?? 'plate';
    const rule = real as BossKey;
    return bossIntro({ rule, art: BOSS_ART[real], act: label, name: BOSS_RULES[real].name, title: BOSS_EPITHET[real], narr: def.narr, rules: BOSS_RULES[real].lines, sfx: (k) => sfx(k as never) });
  }
  // 적 줄: 킹은 맨 끝 (기물이 하나씩 떨어져 박힌다 — ×n 배지를 없앴다, 테스터: 사각형에 가려졌다)
  void roster;
  const line = [...def.enemy.filter((t) => t !== 'K'), ...def.enemy.filter((t) => t === 'K')];
  return sceneIntro(label, name, def.narr, art, false, '', '', def.reward === 'part' ? 'check' : 'battle', line);
};
/** 반장 규칙 → 초상 그림 파일 (public/scenes/) */
const BOSS_ART: Record<string, string> = { plate: 'boss-plate', spawn: 'boss-assembly', thorns: 'boss-thorns', gilded: 'boss-gilded', inspect: 'boss-inspector', magnet: 'boss-magnet', alarm: 'boss-alarm' };

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
  const quick = !btn.matches('[data-buy]') && !/뺀다|다듬는다|저울에 올린다|녹인다/.test(label);
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
  // 카드 · 부품 · 기물을 얻는 고르기는 크게 펼쳐 확인 · 취소 (테스터: 1초 뒤 저절로 덱에 들어가 너무 빨랐다 — 크게 보이고 묻는 게 낫다)
  if (btn.matches('.cf')) {
    panel.classList.remove('choosing');
    btn.classList.remove('chosen');
    bar.remove();
    const cf = document.createElement('div');
    cf.className = 'kit-confirm pick-confirm';
    const big = btn.cloneNode(true) as HTMLElement;
    big.removeAttribute('data-pick'); big.removeAttribute('data-part'); big.removeAttribute('data-recruit'); big.removeAttribute('data-rec');
    big.classList.remove('chosen', 'picked');
    cf.innerHTML = `<div class="kc-panel"><h2>${label.replace(/^‘|’$/g, '')}</h2><div class="kc-cards kc-one"></div><div class="row"><button class="btn" type="button" data-no>취소</button><button class="btn brass" type="button" data-yes>확인</button></div></div>`;
    cf.querySelector('.kc-cards')!.appendChild(big);
    document.body.appendChild(cf);
    replay(cf.querySelector('.kc-panel')!, 'in');
    cf.querySelector('[data-no]')!.addEventListener('click', () => (sfx('tap'), cf.remove()));
    cf.querySelector('[data-yes]')!.addEventListener('click', () => { cf.remove(); confirmChoice(btn, onConfirm); });
    return;
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
  // D-184: 안 고른 것은 아래부터 도트로 흩어지고 고른 카드 · 부품은 기울며 들렸다가 덱 · 부품 칸으로 빨려 든다
  const group = btn.parentElement ? [...btn.parentElement.children].filter((x): x is HTMLElement => x !== btn && x instanceof HTMLElement && (x.matches('.cmd, .part-card'))) : [];
  // 고물상은 하나를 사도 나머지 물건이 그대로 남는다 — 흩어지게 하지 않는다
  if (!btn.matches('[data-buy]')) dissolveAll(group);
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

/**
 * 수치 앞에서 줄이 끊기지 않게 (사용자: 「태엽(엔터)−1」 · 「HP(엔터)+25%」가 부자연스럽다, 2026-11-05):
 * 낱말과 뒤따르는 수치(+25% · −1 · ×2 · 1장) 사이 띄어쓰기를 줄바꿈 없는 칸으로 바꾼다. 창 안 글씨 노드에만.
 */
const keepNumbers = (root: HTMLElement): void => {
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    const t = n.nodeValue ?? '';
    if (/ (?=[+\-−×]?\d)/.test(t)) n.nodeValue = t.replace(/ (?=[+\-−×]?\d)/g, '\u00a0');
  }
};
const openOverlay = (html: string): HTMLElement => {
  const panel = $('overlay-panel');
  panel.innerHTML = html;
  keepNumbers(panel);
  const wasHidden = $('overlay').hidden || panel.classList.contains('m3out');
  $('overlay').hidden = false;
  // 떨어져 박혀 출렁 · 리벳 (D-189) — 이미 열린 창의 내용만 바뀔 때는 그대로
  if (wasHidden) modalIn($('overlay'), panel);
  // 도장은 내리꽂혀 잉크가 튄다
  panel.querySelectorAll<HTMLElement>('.stamp-big').forEach(stampFx);
  railify(panel);
  return panel;
};
/**
 * 고르기 줄 (D-322, 사용자: 「가로 슬라이드로, 카드 하나 · 선택지 하나를 자세하게 — 카드 · 선택지 디자인 통일」):
 * 보상 · 고물상 · 핵심 부품 · 부품 · 영입 · 작업대 · 다듬기의 카드 묶음을 모두 같은 「큰 카드 가로 줄」로 바꾼다.
 * 카드는 한 장씩 맞물려 멈추고(스냅), 넘칠 때만 ◀ ▶ 단추가 선다. 넘기면 줄이 살짝 밀렸다 돌아온다(계단, 페이드 없음).
 */
const railify = (root: HTMLElement): void => {
  root.querySelectorAll<HTMLElement>('.shop-grid, .reward-cards, .part-cards').forEach((rail) => {
    if (rail.classList.contains('crail')) return;
    rail.classList.add('crail');
    const wrap = document.createElement('div');
    wrap.className = 'rail-wrap';
    rail.before(wrap);
    wrap.innerHTML = `<button type="button" class="btn sq rail-arrow prev" aria-label="이전">◀</button><button type="button" class="btn sq rail-arrow next" aria-label="다음">▶</button>`;
    wrap.insertBefore(rail, wrap.lastElementChild);
    const step = (): number => { const c = rail.querySelector<HTMLElement>('.cf, .cmd, .part-card'); return c ? c.offsetWidth + 12 : 220; };
    const sync = (): void => {
      const over = rail.scrollWidth > rail.clientWidth + 4;
      wrap.classList.toggle('over', over);
      wrap.querySelector<HTMLButtonElement>('.prev')!.disabled = rail.scrollLeft <= 2;
      wrap.querySelector<HTMLButtonElement>('.next')!.disabled = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 2;
    };
    const go = (dir: number): void => {
      rail.scrollLeft += dir * step();
      sfx('tap');
      rail.classList.remove('nudge-l', 'nudge-r');
      void rail.offsetWidth;
      rail.classList.add(dir > 0 ? 'nudge-r' : 'nudge-l');
      sync();
    };
    wrap.querySelector('.prev')!.addEventListener('click', (e) => (e.stopPropagation(), go(-1)));
    wrap.querySelector('.next')!.addEventListener('click', (e) => (e.stopPropagation(), go(1)));
    rail.addEventListener('scroll', sync, { passive: true });
    window.setTimeout(sync, 0);
    window.setTimeout(sync, 400);
  });
};
/** 카드 모양 선택지 하나 (작업대 · 영입 · 보강 — 카드 · 부품과 같은 틀, D-322) */
const optFace = (o: { name: string; art: string; desc: string; attrs: string; grade?: 'common' | 'rare' | 'gold'; tag?: string }): string =>
  `<button type="button" class="cf part-card opt g-${o.grade ?? 'common'}" data-grade="${o.grade ?? 'common'}" ${o.attrs}><b class="cf-name">${o.name}</b><span class="cf-win">${o.art}</span>${o.tag ? `<span class="cf-type">${o.tag}</span>` : ''}<small class="cf-desc">${descLines(o.desc)}</small><i class="cf-gem"></i></button>`;
/** 창 닫기: 가로로 접혀 사라진다 (D-189). 접히는 사이 다시 열리면 취소된다 */
const closeOverlay = (): void => {
  if ($('overlay').hidden) return;
  modalOut($('overlay'), $('overlay-panel'), () => ($('overlay').hidden = true));
};

/** 쓰러진 킹의 서술 (되감기 장면 첫 줄) */
let kingFallNarr = '';
/** 이 대국에서 「되감겠습니까」를 물었나 (패배 직전 되감기 팝업, 보고서 3 지표 ④ 처방) */
let lossAsked = false;
/**
 * 대국 끝. 지는 순간 되감기가 남아 있으면 먼저 묻는다 (D-234 — 테이프를 아끼다 죽는 비율을 줄인다):
 * 「태엽을 감아 이번 턴 처음으로 되돌리시겠습니까?」 — 예 = 되감기, 아니오 = 패배 처리.
 */
const finish = (): void => {
  if (b.s.winner === 1 && b.rewinds > 0 && !labMode && !lossAsked) {
    lossAsked = true;
    document.body.classList.add('rev-freeze');
    window.setTimeout(() => lossRewindScene(), 260);
    return;
  }
  finishNow();
};
/**
 * 패배 직전 되감기 장면 (2026-11-05 사용자: 「턴 되감기처럼 강력하고 임팩트 있는 서사로」):
 * 판이 잿빛으로 멈추고 가운데 톱니가 거꾸로 돈다 → 서술이 한 자씩 찍히고 「거꾸로」에서 떨린다 → 각주 대사 → 동사 버튼 둘.
 * 거꾸로 감으면 큰 되감기 연출, 눈을 감으면 패배 처리.
 */
const lossRewindScene = (): void =>
  rewindScene(HUD_TEXT.lossRewind, () => (track('loss_rewind_prompt', { ...where(), taken: false, rewinds_left: b.rewinds }), finishNow()), () => {
    track('loss_rewind_prompt', { ...where(), taken: true, rewinds_left: b.rewinds });
    lossAsked = false;
    doRewind(true);
  });
/** 되감기 장면 하나 (패배 직전 · 버튼 둘 다): 판이 잿빛으로 멈추고 톱니가 거꾸로 — 서술 · 각주 · 동사 버튼 */
const rewindScene = (T: { narr: string; line?: string; sys: (n: number) => string; yes: string; no: string }, onNo: () => void, onYes: () => void, loss = true): void => {
  document.body.classList.add('rev-freeze');
  sfx(loss ? 'threat' : 'lift');
  const el = document.createElement('div');
  el.className = `revfx${loss ? ' loss' : ''}`;
  // 패배: 쓰러진 킹의 서술이 먼저(잿빛 글) — 톱니는 아직 멈춰 있다가, 다음 줄에서 거꾸로 맞물려 돈다
  const pre = loss ? kingFallNarr || DEATHS[0].narr : '';
  el.innerHTML = `${pre ? '<p class="rev-pre"></p>' : ''}<i class="rev-gear${pre ? ' still' : ''}" aria-hidden="true"></i><p class="rev-narr"></p>${T.line ? '<p class="rev-line"></p>' : ''}<p class="rev-sys"></p><div class="row" hidden><button class="btn" type="button" data-no>${T.no}</button><button class="btn brass rev-yes" type="button" data-yes>${T.yes}</button></div>`;
  document.body.appendChild(el);
  const show = (sel: string) => {
    const x = el.querySelector<HTMLElement>(sel)!;
    x.hidden = false;
    replay(x, 'in');
  };
  void (pre ? typeIn(el.querySelector<HTMLElement>('.rev-pre')!, pre, 30).then(() => new Promise((res) => window.setTimeout(res, 650))) : Promise.resolve())
    .then(() => {
      // 그때 — 톱니가 거꾸로 맞물린다: 멈춰 있던 톱니가 쿵 박히며 돈다
      const g = el.querySelector<HTMLElement>('.rev-gear')!;
      if (pre) {
        g.classList.remove('still');
        replay(g, 'in');
        sfx('awaken');
        shake(g, 2);
      }
      return typeIn(el.querySelector<HTMLElement>('.rev-narr')!, T.narr, loss ? 38 : 26, () => (shake(el.querySelector<HTMLElement>('.rev-narr')!, loss ? 2 : 1), sfx('stamp')));
    })
    // 각주 대사 · 시스템 줄도 한 자씩 (사용자 2026-11-05). 「역회전 톱니 N」은 <em>으로 한 번에 박히며 떨린다
    .then(() => new Promise((res) => window.setTimeout(res, 220)))
    .then(() => (T.line ? typeIn(el.querySelector<HTMLElement>('.rev-line')!, T.line, 34, () => shake(el.querySelector<HTMLElement>('.rev-line')!, 1)) : undefined))
    .then(() => new Promise((res) => window.setTimeout(res, 200)))
    .then(() => typeIn(el.querySelector<HTMLElement>('.rev-sys')!, T.sys(b.rewinds), 18, () => (shake(el.querySelector<HTMLElement>('.rev-sys em')!, 2), sfx('stamp'))))
    .then(() => show('.row'));
  const leave = (then: () => void): void => {
    el.querySelectorAll('button').forEach((x) => ((x as HTMLButtonElement).disabled = true));
    // 잿빛은 장면이 다 빠진 뒤에 걷는다 (초월이 바로 이어 받는다 — 사이에 빈 프레임이 없게)
    pxOut(el, () => (el.remove(), document.body.classList.remove('rev-freeze'), then()));
  };
  el.querySelector('[data-no]')!.addEventListener('click', () => (sfx('tap'), leave(onNo)));
  el.querySelector('[data-yes]')!.addEventListener('click', () => leave(onYes));
};
/** 손패 표지 (D-332 · UX 점검): 기본 이동 카드(돌격 · 이동)는 모두 같은 표지라 잡음 — 손패에서는 뺀다 */
const handChips = (id: CommandId): string => {
  const t = cardTags(id);
  return t.effect === 'rule' && t.word === '이동' && t.style === 'strike' ? '' : `<span class="chips">${tags3Html(t)}</span>`;
};
/** 반장 격파 컷 (각본 §8 · D-319 발주 14위 BF-01~06): 쓰러지는 모습 + 종이왕의 대꾸. 받은 그림이 있으면 그것, 없으면 초상 */
const bossFallCut = async (rule: StoryBoss): Promise<void> => {
  const st = BOSS_STORY[rule];
  const fallImg = await new Promise<string>((res) => { const im = new Image(); im.onload = () => res(`boss-fall-${rule}`); im.onerror = () => res(BOSS_ART[rule]); im.src = `scenes/boss-fall-${rule}.png`; });
  await playCuts([{ img: fallImg, bg: ['#16141c', '#0b0b0e'], glow: '#e5262f', art: [{ t: 'K', side: 1, x: 50, y: 58, h: 44, dim: true }], lines: [{ k: 'n', t: st.fall }, { k: 's', who: '종이왕', t: st.reply }] }]);
};
const finishNow = (): void => {
  const isWin = b.s.winner === 0;
  if (!labMode && runLive) {
    const hpEnd = b.s.pieces.filter((p) => p.side === 0).reduce((a, p) => a + Math.max(0, p.hp), 0);
    track('battle_result', { ...where(), enemy_id: cur.title, win: isWin, turns: b.turn, hp_lost: Math.max(0, hpAtStart - hpEnd), pieces_lost: b.falls.length, is_gameover: !isWin && charms.revive <= 0, rewinds_used: rewindsAtStart - b.rewinds });
    track('telegraph_resolution', { ...where(), telegraph_count: tg.telegraph, hit_count: tg.hit, pure_evade_count: tg.evade, counter_hit_count: tg.counter });
    if (isWin && INTRO.includes(cur)) ftue('battle1_win');
    if (isWin && cur.boss && actI === 0) ftue('act1_clear');
  }
  // 되감기 정산 (D-228): 테이프의 공짜 몫을 넘어 쓴 만큼 역회전 톱니가 깨진다
  if (!labMode) charms.rewind = Math.max(0, charms.rewind - Math.max(0, rewindsAtStart - b.rewinds - (b.rewindFree ?? 0)));
  if (isWin && coachOn) {
    coachOn = false;
    writeMeta(store, { ...readMeta(store), onboarded: true });
  }
  document.querySelector('.coach-line')?.remove();
  if (labMode) return labEnd(isWin);
  window.setTimeout(async () => {
    await banner(isWin ? (cur.boss ? '반장 격파' : '적 킹 격파') : '킹 파괴', isWin);
    // 반장 격파 (각본 §8, D-276): 쓰러지는 모습 + 종이왕이 건네는 말 — 도금왕은 엔딩 흐름에서
    if (isWin && cur.boss && cur.bossRule && cur.bossRule !== 'gilded' && BOSS_STORY[cur.bossRule as StoryBoss]) {
      runBosses = [...runBosses, cur.bossRule as StoryBoss];
      await bossFallCut(cur.bossRule as StoryBoss);
    }
    // 처치 장면이 다 끝난 뒤에 보상창 (페르소나 테스트 M4: 킹 분해 연출을 창이 1~2초 만에 덮었다)
    if (isWin && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) await new Promise((r) => window.setTimeout(r, cur.boss ? 900 : 600));
    if (!isWin) {
      lossesHere += 1;
      if (betNow) gold = Math.max(0, gold - betNow.stake);
      // 아까운 패배 (D-178): 적 킹이 거의 다 깎였으면 「한 수였습니다」 — 가까웠던 만큼 다시 누르게
      const ek = b.s.pieces.find((p) => p.side === 1 && p.type === 'K');
      const near = ek && ek.hp <= ek.maxHp * DIRECTOR.nearMiss ? `<p class="near">적 킹 HP ${ek.hp} 남았습니다. 한 수였습니다.</p>` : '';
      // 1패 = 출하 끝 (D-228). 여벌 심장 톱니가 있으면 하나 깨고 그 대국을 처음부터
      const spare = charms.revive > 0;
      // 불량 폐기 화면도 출하 중단 배경(E-02) 위에 (D-263 — 판 위에 뜨던 구식 창)
      document.body.classList.add('between');
      placeBg('end-fail');
      const el = openOverlay(`<div class="stamp-big bad">불량 폐기</div><p>${spare ? `킹이 쓰러졌습니다. ${CHARMS.revive.name}를 깨면 ${cur.title}부터 다시 둡니다. (남은 ${charms.revive})` : '킹이 쓰러졌습니다. 출하는 여기서 끝납니다.'}</p>${near}<div class="row">${spare ? '<button class="btn" type="button" data-quit>출하 종료</button><button class="btn brass" type="button" data-again>깨고 다시</button>' : '<button class="btn brass" type="button" data-quit>출하 종료</button>'}</div>`);
      el.querySelector('[data-again]')?.addEventListener('click', () => {
        charms.revive -= 1;
        startBattle(cur);
      });
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
    // 반장을 쓰러뜨리면 역회전 톱니 (D-228)
    if (cur.boss) {
      charms.rewind += CHARM_NUM.bossRewind;
      notes.push(`${CHARMS.rewind.name} +${CHARM_NUM.bossRewind}`);
    }
    const kingNow = b.s.pieces.find((p) => p.side === 0 && p.type === 'K');
    const kingMax = kingNow?.maxHp ?? 1;
    closeTier = 0;
    if (isCloseCall({ kingHp: kingNow?.hp ?? 0, kingMax, fell: crackOrScrap(fallenAfter(b, squad).map((f) => f.crew)).scrapped.length, clutched: clutchedNow }) && !closeActs.includes(actI) && dir.closeCall(asc) > 0) {
      closeActs.push(actI);
      closeTier = dir.closeCall(asc);
      if (closeTier === 1) gold += DIRECTOR.closeCallGold;
      notes.unshift(`사선을 넘었다 — ${closeTier === 3 ? '부품 하나 더' : closeTier === 2 ? '카드 넷 중 고르기' : `나사 +${DIRECTOR.closeCallGold}`}`);
    }
    if (notes.length) window.setTimeout(() => toast(notes.join(' · '), 3600), 300);
    // 넘친 피해 10마다 나사 1 (오버킬 — 큰 숫자를 만들 이유, D-145)
    const overGold = Math.floor(b.overkill / (parts.includes('scrapMagnet') ? PART_NUM.scrapPer : 10));
    const earned = Math.round(b.coins * SLICE.coinValue * (asc >= 8 ? ASC_NUM.coinMul : 1)) + overGold + (parts.includes('piggyGear') ? PART_NUM.piggy : 0);
    gold += earned;
    // 나사 받기 (D-184): 판 가운데서 도트 나사가 튀어 올라 나사 칸으로 빨려 든다
    { const r = $('board').getBoundingClientRect(); screwBurst({ x: r.left + r.width / 2, y: r.top + r.height / 2 }, $('coins'), Math.round(earned / 6)); }
    const before = squad;
    const survived = squadAfter(b, squad);
    // 목숨 둘 (D-219): 처음 쓰러진 분대원은 심장 톱니 하나가 깨진 채 돌아온다. 깨진 채 쓰러진 분대원만 폐기 (원수 · 원부 · 유품도 그쪽만)
    const allFallen = fallenAfter(b, before);
    const { back, scrapped } = crackOrScrap(allFallen.map((f) => f.crew));
    const fallenList = allFallen.filter((f) => scrapped.some((u) => u.serial === f.crew.serial));
    const fallen: Crew[] = fallenList.map((f) => f.crew);
    // 원수가 생긴다: 내 분대원을 쓰러뜨린 적 (킹 · 입문 판 제외)
    for (const { crew, fall } of fallenList) if (crew.t !== 'K' && fall.byType && fall.byType !== 'K' && !INTRO.includes(cur)) setNemeses(addNemesis(nemeses(), fall.byType, { t: crew.t, name: crew.name ?? PIECE_NAMES_KO[crew.t], serial: crew.serial }, R.int(1000)));
    // 폐기 원부: 영구 기록 (D-153)
    writeLedger(fallenList.map(({ crew, fall }) => ({ serial: crew.serial ?? '', name: crew.name ?? '', t: crew.t, quirk: crew.quirk, kills: crew.kills ?? 0, battles: crew.battles ?? 0, nick: crew.nick, cause: `${cur.title} ${fall.turn}턴 · ${fall.by}`, run: runId })));
    // 판 사이 기본 회복: 남은 분대 최대 HP의 30%
    {
      const rested = restSquad(survived, restHeal());
      // 원래 줄 순서대로 (돌아온 분대원은 HP 50%, 회복은 받지 않는다)
      squad = before.flatMap((u) => [...rested, ...back].filter((v) => v.serial === u.serial));
    }
    // 유품 태엽: 고르게 하지 않는다 — 자동으로 나사가 되고 한 줄만 (D-155, 관리 피로 제로)
    const heirs = fallen.filter((c) => c.t !== 'K');
    const after: string[] = [];
    justCracked = back.map((u) => u.serial ?? '');
    if (back.length) after.push(LIFE_TEXT.cracked(back.map((u) => u.name ?? PIECE_NAMES_KO[u.t]).join(' · ')));
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
      for (let k = 0; k < n; k++) squad.push({ ...crewOf('P'), scars: ['보충병'] });
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
      return partPick(`<h2><span class="pass-tag bad">사선</span> 겨우 넘었다 — 부품 하나 더</h2><p>잃은 것이 있는 대국이었습니다. 부품을 하나 더 고릅니다.</p>`, () => { won -= 1; rewardFlow(earned, overGold, fallen, reward !== 'part'); });
    }
    // 검문 · 반장 (D-216): 부품 → 새 분대원(상한 아래면 확정) → 카드
    if (reward === 'part' && !partDone)
      return partPick(`<h2><span class="pass-tag">${cur.boss ? '반장 격파' : '검문 통과'}</span> 부품 상자 — 나사 +${earned}</h2><p>부품을 하나 고릅니다. 장착하면 규칙이 바뀝니다.</p>`, () =>
        squad.length < SLICE.squadMax ? (won -= 1, recruitPick(`<h2>새 분대원</h2>`, () => rewardFlow(earned, overGold, fallen, true), true)) : rewardFlow(earned, overGold, fallen, true), true);
    if (reward === 'end') return void endingFlow();
    const rng = sub();
    // 축이 고루 나오게: 서로 다른 축 셋 (가진 부품의 축이 있으면 하나는 그 축)
    const axes: Axis[] = ['cav', 'inf', 'king', 'chain', 'push', 'tactic'];
    const mine = parts.map((id) => SLICE_PARTS[id].axis).filter((a): a is Axis => !!a);
    const picks: Axis[] = mine.length ? [mine[rng.int(mine.length)]] : [];
    while (picks.length < 3) {
      const a = axes[rng.int(axes.length)];
      if (!picks.includes(a)) picks.push(a);
    }
    // 같은 카드가 두 번 나오지 않게 (브릿지 카드는 두 축에 걸친다)
    const offers: CommandId[] = [];
    // 축에 쓸 수 있는 카드가 없으면 다른 축에서 채운다 (3장 유지)
    // 칸마다 등급을 먼저 뽑는다 (D-216) — 그 축에 그 등급이 없으면 아무 등급
    const elite = !!cur.boss || cur.reward === 'part' || partDone;
    for (const a of [...picks, ...axes.filter((x) => !picks.includes(x))]) {
      if (offers.length >= (closeTier === 2 ? 4 : 3) + (parts.includes('loupe') ? 1 : 0) - (asc >= 11 ? 3 - ASC_NUM.rewardChoices : 0)) break;
      const pool = REWARD_COMMANDS.filter((id) => (COMMANDS[id].axis === a || COMMANDS[id].axis2 === a) && !offers.includes(id) && usable(id) && isOpen(id));
      const g = rollGrade(rng.next(), elite ? GRADE.elite : GRADE.weights);
      const same = pool.filter((id) => gradeOf(id) === g);
      const from = same.length ? same : pool;
      if (from.length) offers.push(from[rng.int(from.length)]);
    }
    // 기물 수집 (D-216): 대국 보상에 가끔 새 분대원 한 명이 섞인다 — 카드 대신 고를 수 있다
    const recruitOffer = !elite && squad.length < SLICE.squadMax && rng.next() < SLICE.recruitChance ? rollRecruit(RECRUITS, rng.next()) : null;
    const recruitCrew = recruitOffer ? crewOf(recruitOffer.t) : null;
    /** 보상 화면 (카드 빼기를 그만두면 다시 연다) */
    const showReward = (): void => {
      const el = openOverlay(`
        <h2><span class="pass-tag">통과</span> ${cur.title} <span class="dim">— 나사 +${earned}</span></h2>
        <p>${recruitOffer ? '명령 카드나 새 분대원' : '명령 카드'} 하나를 고르거나, 아래 셋 중 하나를 고릅니다.</p>
        <div class="shop-scrollbox"><div class="shop-scroll reward-scroll"><div class="reward-cards">${offers
          .map((id) => {
            const c = COMMANDS[id];
            const who = cardArt(id);
            void c;
            void who;
            return cardFace(id, `data-pick="${id}"`);
          })
          .join('')}${recruitOffer && recruitCrew ? `<button type="button" class="cf part-card recruit g-${RECRUIT_ODDS[recruitOffer.t].grade}" data-recruit data-grade="${RECRUIT_ODDS[recruitOffer.t].grade}"><em class="rec-tag">새 분대원</em><b class="cf-name">${PIECE_NAMES_KO[recruitOffer.t]} · ${recruitCrew.name}</b><span class="cf-win"><span class="art" style="transform:translateY(${Math.round((0.5 - (PIECE_ART_CENTER[recruitOffer.t] ?? 0.5)) * 44)}px)">${pieceImg(recruitOffer.t, 0, 'large', 44)}</span></span><small class="cf-desc">${descLines(`${recruitOffer.line.replace(/\.?$/, '.')} (+ ${recruitOffer.cards.map((id) => COMMANDS[id].name).join(' · ')}${recruitCrew.quirk ? ` — 기벽: ${QUIRKS[recruitCrew.quirk].desc}` : ''})`)}</small><i class="cf-gem" aria-label="희귀"></i></button>` : ''}</div>
        <div class="squad-strip"><p class="ss-head">정비 완료 · 남은 분대 HP +${Math.round(REST.heal * 100)}%${fallen.length ? ` · <span class="bad">쓰러짐 ${fallen.length}</span>` : ''}</p>${squad.map((u) => { const mx = crewMaxHp(u); const k = Math.max(0, Math.min(1, (u.hp ?? mx) / mx)); return `<span class="ss-u${k < 0.35 ? ' low' : ''}">${pieceImg(u.t, 0, 'small', 24)}<span class="ss-t"><b>${u.name ?? PIECE_NAMES_KO[u.t]}</b><i class="ss-bar"><i style="width:${Math.round(k * 100)}%"></i></i></span><small>${u.hp ?? mx}/${mx}${lifePips(u, justCracked.includes(u.serial ?? '') ? 'break' : '')}</small></span>`; }).join('')}</div></div></div>
        <div class="row">
          <button class="btn" type="button" data-skip>건너뛰기</button>
          <button class="btn cyan" type="button" data-overhaul>정비 — ${fallen.length ? `쓰러진 ${josa([...fallen].sort((a, c) => (COST_ORDER[c.t] ?? 0) - (COST_ORDER[a.t] ?? 0))[0].name, '을')} HP 50%로 되살리고 ` : ''}모두 HP +${Math.round(REST.overhaul * 100)}%</button>
        </div>`);
      pxRail(el.querySelector<HTMLElement>('.reward-scroll')!);
      gradeReveal([...el.querySelectorAll<HTMLElement>('[data-grade]')]);
      el.querySelectorAll<HTMLElement>('[data-pick]').forEach((btn) =>
        btn.addEventListener('click', () =>
          choose(btn, `${josa(COMMANDS[btn.dataset.pick as CommandId].name, '을')} 덱에 넣는다`, () => {
            draft('card', [...offers, ...(recruitOffer ? [`crew:${recruitOffer.t}`] : [])], btn.dataset.pick!);
            deck.push(btn.dataset.pick as CommandId);
            advance();
          }),
        ),
      );
      const recBtn = el.querySelector<HTMLElement>('[data-recruit]');
      if (recBtn && recruitOffer && recruitCrew)
        recBtn.addEventListener('click', () =>
          choose(recBtn, `${josa(recruitCrew.name, '을')} 분대에 넣는다`, () => {
            draft('card', [...offers, `crew:${recruitOffer.t}`], `crew:${recruitOffer.t}`);
            squad.push(recruitCrew);
            deck.push(...recruitOffer.cards);
            crewSay(recruitCrew.t, crewLabel(recruitCrew));
            advance();
          }),
        );
      const skipBtn = el.querySelector<HTMLElement>('[data-skip]')!;
      skipBtn.addEventListener('click', () => choose(skipBtn, '아무것도 받지 않는다', () => (draft('card', offers, null), advance())));
      // 카드 빼기: 한 장 빼면 다음 판, 그만두면 보상 화면으로 돌아온다
      // 보상 화면의 카드 빼기는 뺐다 (D-247 — 대국마다 공짜로 뺄 수 있어 너무 잦았다). 빼기는 고물상(값이 오른다) · 작업대에서만
      const ohBtn = el.querySelector<HTMLElement>('[data-overhaul]')!;
      ohBtn.addEventListener('click', () =>
        choose(ohBtn, '카드 대신 분대를 정비한다', () => {
          draft('card', offers, 'overhaul');
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
 * 같은 카드는 한 칸에 ×개수로 묶고 축 순서로 늘어놓는다.
 */
const deckView = (mode: 'view' | 'remove', then?: (removed: boolean) => void): void => {
  const order: (Axis | undefined)[] = [undefined, 'cav', 'inf', 'king', 'chain', 'push'];
  const counts = new Map<CommandId, number>();
  for (const id of deck) counts.set(id, (counts.get(id) ?? 0) + 1);
  const ids = [...counts.keys()].sort((x, y) => order.indexOf(COMMANDS[x].axis) - order.indexOf(COMMANDS[y].axis) || COMMANDS[x].cost - COMMANDS[y].cost);
  const cards = ids
    .map((id) => {
      const c = COMMANDS[id];
      return `<button type="button" class="cmd deckcard t-${c.who}" data-rm="${id}" ${mode === 'view' ? 'tabindex="-1"' : ''}>${keysHtml(c.cost)}${cardArt(id)}<span class="txt"><b>${c.name}<span class="chips">${tags3Html(cardTags(id))}</span></b>${c.desc ? `<small>${c.desc}</small>` : ''}${c.flavor ? `<i class="flv">${c.flavor}</i>` : ''}</span><span class="cnt">×${counts.get(id)}</span>${usable(id) ? '' : '<em class="shelved">기물 없음 — 보관 중</em>'}</button>`;
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
    // 목숨 둘 (D-219): 성한 분대원이 처음 쓰러지면 폐기 의식 대신 짧은 「톱니가 깨진다」 — 판 가운데 톱니가 흔들리다 튕겨 나간다
    if (c.t !== 'K' && !c.cracked) {
      const fx = document.createElement('div');
      fx.className = 'crackfx';
      fx.innerHTML = `<div><span class="lifes big"><i class="life"></i><i class="life breaking"></i></span><p class="narr"></p><b>${crewLabel(c)}</b><small>${LIFE_TEXT.riteSys}</small></div>`;
      document.body.appendChild(fx);
      sfx('hurt');
      await new Promise((r) => window.setTimeout(r, 120));
      await typeIn(fx.querySelector<HTMLElement>('.narr')!, LIFE_TEXT.riteNarr, 14);
      await new Promise((r) => window.setTimeout(r, 650));
      pxOut(fx.querySelector<HTMLElement>(':scope > div'), undefined, 200);
      window.setTimeout(() => fx.remove(), 260);
      continue;
    }
    // 되감기가 남은 채 킹이 쓰러지면 따로 의식을 띄우지 않는다 — 되감기 장면이 이 서술로 시작해 끊김 없이 잇는다 (2026-11-05 사용자: 「태엽이 다 풀렸다 뒤 흐름이 부자연스럽다」)
    if (c.t === 'K' && b.s.winner === 1 && b.rewinds > 0 && !labMode && !lossAsked) {
      kingFallNarr = DEATHS[((c.serial ?? '').charCodeAt(3) + f.turn) % DEATHS.length].narr;
      // 부서지는 순간 그대로 잿빛으로 굳는다 — 장면까지 빈 박자가 없게
      document.body.classList.add('rev-freeze');
      sfx('loss');
      continue;
    }
    const fx = document.createElement('div');
    fx.className = 'deathfx dc3';
    // 킹(대장)은 「대장, 먼저 갑니다」를 말하지 않는다 (페르소나 테스트 c4) — 대장을 부르는 대사는 분대원에게만
    const pool = c.t === 'K' ? DEATHS.filter((x) => !x.line.includes('대장')) : DEATHS;
    const d0 = pool[((c.serial ?? '').charCodeAt(3) + (c.kills ?? 0) + f.turn) % pool.length];
    // 분대원은 제 성격대로 깨달음을 남기고 쓰러진다 (D-324) — 킹은 예전 대사
    const voice = c.t !== 'K' ? CREW_VOICE[c.t as CrewKind]?.fall : undefined;
    const d = voice ? { narr: d0.narr, line: voice[((c.serial ?? '').charCodeAt(2) + f.turn) % voice.length] } : d0;
    // 2인칭 서술 → 이름 → 각주 대사 → 시스템 한 줄 (D-158). D-189: 검은 막이 한 줄씩 계단으로 내려오고 서술이 한 자씩 찍힌다
    fx.innerHTML = `<div><p class="narr"></p><b>${crewLabel(c)}</b><i>${d.line}</i><small>${c.serial} · ${f.by}에게 파괴되었습니다.</small></div>`;
    curtainRows(fx);
    document.body.appendChild(fx);
    // 전체 화면 장면 (되감기 장면과 같은 문법): 판이 잿빛으로 멈춘다
    const froze = !document.body.classList.contains('rev-freeze');
    document.body.classList.add('rev-freeze');
    sfx('loss');
    // 빠르게 (D-191): 막 0.2초 → 서술 한 자 14ms → 이름 · 대사 · 시스템 줄 60ms 간격 → 0.45초 머묾 (약 1.2초)
    await new Promise((r) => window.setTimeout(r, 200));
    await typeIn(fx.querySelector<HTMLElement>('.narr')!, d.narr, 14);
    for (const x of fx.querySelectorAll('div > :not(.narr)')) {
      x.classList.add('in');
      await new Promise((r) => window.setTimeout(r, 60));
    }
    // 마지막 말을 읽을 시간 (글자당 45ms)
    await new Promise((r) => window.setTimeout(r, calmNow() ? 650 : 650 + d.line.length * 45));
    if (froze) document.body.classList.remove('rev-freeze');
    fx.classList.add('out');
    pxOut(fx.querySelector<HTMLElement>(':scope > div'), undefined, 200);
    window.setTimeout(() => fx.remove(), 330);
  }
};

/** 분대 보기: 이름 · 시리얼 · 기벽 · 처치 · 흉터 · 폐기 원부 (이름 바꾸기는 뺐다 — 사용자 D-263) */
const crewView = (): void => {
  const el = openOverlay(`<h2>분대 ${squad.length}</h2><div class="crew-list">${squad
    .map((u) => {
      const q = u.quirk ? QUIRKS[u.quirk] : null;
      return `<div class="crew-row">${pieceImg(u.t, 0, 'small', 26)}<div><b>${crewLabel(u)}</b> ${lifePips(u)} <span class="dim">${u.serial} · HP ${u.hp ?? crewMaxHp(u)}/${crewMaxHp(u)} · 처치 ${u.kills ?? 0}</span>${q ? `<br><span class="quirk">${q.name}</span> <small>${q.desc}</small>` : ''}${u.scars?.length ? ` <small class="scar">· ${u.scars.join(' · ')}</small>` : ''}</div></div>`;
    })
    .join('')}</div><div class="row"><button class="btn" type="button" data-ledger>도감 ${readLedger().length}</button><button class="btn brass" type="button" data-close-crew>닫기</button></div>`);
  el.querySelector('[data-close-crew]')!.addEventListener('click', closeOverlay);
  el.querySelector('[data-ledger]')!.addEventListener('click', () => ledgerView());
};

/** 도감 (옛 폐기 원부, D-288): 쓰러진 분대원의 영구 기록 */
const ledgerView = (back: () => void = crewView): void => {
  const rows = readLedger();
  const el = openOverlay(`<h2>도감</h2><p>쓰러진 분대원의 기록입니다. 지워지지 않습니다.</p><div class="ledger">${
    rows.length
      ? rows.map((r) => `<div class="ledger-row">${pieceImg(r.t, 0, 'small', 22)} <b>${r.name}${r.nick ? ` 「${r.nick}」` : ''}</b> <span class="dim">${r.serial}</span> · 처치 ${r.kills} · 대국 ${r.battles}<br><small>${r.cause} · ${r.run}</small></div>`).join('')
      : '<p class="dim">아직 기록이 없습니다.</p>'
  }</div><div class="row"><button class="btn brass" type="button" data-back>${back === crewView ? '분대로' : '닫기'}</button></div>`);
  el.querySelector('[data-back]')!.addEventListener('click', () => back());
};

/** 영입 (입문 뒤): 기물 셋 중 하나 — 그 기물의 카드가 같이 들어온다 */
const recruitPick = (head: string, then: () => void, _elite = false): void => {
  const rng = sub();
  const pool = [...RECRUITS];
  const offers: typeof RECRUITS = [];
  // 등급 무게대로 (D-319 — 퀸은 드물게)
  while (offers.length < 3 && pool.length) { const o = rollRecruit(pool, rng.next()); offers.push(pool.splice(pool.indexOf(o), 1)[0]); }
  // 셋이 서로 다른 이름 · 기벽
  const crews: Crew[] = [];
  for (const r of offers) {
    const c = makeCrew(r.t, R, [...squad, ...crews].map((u) => u.name ?? ''), crews.map((u) => u.quirk!).filter(Boolean));
    if (readMetaCached().runs < 2 && !daily) delete c.quirk;
    crews.push(c);
  }
  const el = openOverlay(`${head}<p>분대에 넣을 기물을 하나 고릅니다.</p><div class="part-cards">${offers
    .map((r, k) => {
      const c = crews[k];
      const q = c.quirk ? QUIRKS[c.quirk] : null;
      const g = RECRUIT_ODDS[r.t].grade;
      return optFace({ name: `${PIECE_NAMES_KO[r.t]} · ${c.name}`, art: pieceImg(r.t, 0, 'large', 72), desc: `${r.line.replace(/\.?$/, '.')} (+ ${r.cards.map((id) => COMMANDS[id].name).join(' · ')}${q ? ` — 기벽: ${q.desc}` : ''})`, attrs: `data-rec="${k}"`, grade: g, tag: `<i class="axis rec-g">${GRADE.names[g]} 기물</i>` }).replace('class="cf part-card opt', 'class="cf part-card opt recruit');
    })
    .join('')}</div>`);
  // 부관 안내 (D-238): 첫 영입은 무엇을 고르는지 짚는다
  if (!tutDone('recruit')) {
    const n0 = squad.length;
    void tutorial('recruit', [{ text: TUT.recruit, target: () => el.querySelector('.part-cards'), wait: () => squad.length > n0 }]);
  }
  gradeReveal([...el.querySelectorAll<HTMLElement>('[data-grade]')]);
  el.querySelectorAll<HTMLElement>('[data-rec]').forEach((btn) =>
    btn.addEventListener('click', () =>
      choose(btn, `${josa(crews[Number(btn.dataset.rec)].name, '을')} 분대에 넣는다`, () => {
        const r = offers[Number(btn.dataset.rec)];
        draft('recruit', offers.map((o) => `crew:${o.t}`), `crew:${r.t}`);
        ftue('first_pick');
        squad.push(crews[Number(btn.dataset.rec)]);
        deck.push(...r.cards);
        crewSay(crews[Number(btn.dataset.rec)].t, crewLabel(crews[Number(btn.dataset.rec)]));
        then();
      }),
    ),
  );
};

/** 부품 상자 (1판 뒤 — 첫 사기 조합 확정): 부품 + 맞물리는 카드 둘, 셋 중 하나 */
const kitPick = (head: string, then: () => void): void => {
  const rng = sub();
  const pool = KITS.filter((k) => !parts.includes(k.part) && (!k.needs || squad.some((u) => u.t === k.needs)) && k.cards.every(usable));
  // 빌드 확정 (D-230, 보고서 4 · 5 — Monster Train 챔피언 · Balatro 앤티 2 · StS 첫 정예): 두 번째 대국 뒤 「핵심 부품」 셋은 서로 다른 축에서 — 고르는 순간 이번 출하의 방향이 선다
  // 두 갈래 (사용자 결정 D-231): ① 큰 세 갈래 — 서로 다른 축 셋 ② 한 갈래의 세부 — 한 축 안의 셋. 세부는 그 축에 셋이 있을 때만
  const offers: typeof KITS = [];
  const axisOf = (k: (typeof KITS)[number]) => SLICE_PARTS[k.part].axis ?? 'none';
  const deepAxes = [...new Set(pool.map(axisOf))].filter((ax) => ax !== 'none' && pool.filter((k) => axisOf(k) === ax).length >= 3);
  const deep = deepAxes.length > 0 && rng.next() < SLICE.kitDeepChance ? deepAxes[rng.int(deepAxes.length)] : null;
  const src = deep ? pool.filter((k) => axisOf(k) === deep) : pool;
  while (offers.length < 3 && src.length) {
    const fresh = deep ? src : src.filter((k) => !offers.some((o) => axisOf(o) === axisOf(k)));
    const from = fresh.length ? fresh : src;
    const k = from[rng.int(from.length)];
    src.splice(src.indexOf(k), 1);
    offers.push(k);
  }
  // 카드 틀은 고물상 · 보상과 같다 (이름판 · 그림 창 · 문장 한 줄 · 칩은 아래 가운데)
  // 안내는 한 줄 (테스터: 두 줄로 어색하게 끊겼다)
  const el = openOverlay(`${head}<p class="one-line">${deep ? `${AXIS_NAMES[deep as Axis]}의 세부 갈래` : '큰 세 갈래'} — 부품 하나 + 맞물리는 카드 두 장</p><div class="shop-scrollbox"><div class="shop-scroll reward-scroll"><div class="reward-cards">${offers
    .map((k, n) => {
      const d = SLICE_PARTS[k.part];
      const g = PART_GRADE[k.part] ?? 'common';
      return `<button type="button" class="cf part-card g-${g}" data-kit="${n}" data-grade="${g}"><b class="cf-name">${d.name}</b><span class="cf-win"><i class="ico" style="${iconArt(d.icon)}"></i></span><span class="cf-type">${tags3Html(partTags(k.part))}</span><span class="fit-line kit-plus">+ ${k.cards.map((id) => COMMANDS[id].name).join(' · ')}</span><small class="cf-desc">${descLines(d.desc, d.flavor)}</small><i class="cf-gem" aria-label="${GRADE.names[g]}"></i></button>`;
    })
    .join('')}</div></div></div>`);
  if (!tutDone('kit')) void tutorial('kit', [{ text: TUT.kit, target: () => el.querySelector('.shop-scrollbox') }]);
  pxRail(el.querySelector<HTMLElement>('.reward-scroll')!);
  // 누르면 함께 오는 세 장(부품 + 카드 둘)을 크게 펼치고 묻는다 (테스터: 「이 조합으로 가시겠습니까?」)
  el.querySelectorAll<HTMLElement>('[data-kit]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const k = offers[Number(btn.dataset.kit)];
      sfx('lift');
      const cf = document.createElement('div');
      cf.className = 'kit-confirm';
      cf.innerHTML = `<div class="kc-panel"><h2>이 조합으로 가시겠습니까?</h2><div class="kc-cards">${partFace(k.part, 'data-k0')}<b class="kc-plus">+</b>${k.cards.map((id) => cardFace(id, '')).join('')}</div><div class="row"><button class="btn" type="button" data-no>다시 고른다</button><button class="btn brass" type="button" data-yes>이 조합으로</button></div></div>`;
      document.body.appendChild(cf);
      replay(cf.querySelector('.kc-panel')!, 'in');
      gradeReveal([...cf.querySelectorAll<HTMLElement>('[data-grade]')]);
      cf.querySelector('[data-no]')!.addEventListener('click', () => (sfx('tap'), cf.remove()));
      cf.querySelector('[data-yes]')!.addEventListener('click', () => {
        cf.remove();
        sfx('submit');
        draft('kit', offers.map((o) => o.part), k.part);
        ftue('kit_pick');
        parts.push(k.part);
        newParts.add(k.part);
        deck.push(...k.cards);
        then();
      });
    }),
  );
};

/**
 * 부품 칸 (D-247): 칸이 남으면 바로 단다. 가득 차 있으면 녹일 부품 하나를 고른다(나사 +meltBack) — 새 부품을 버려도 된다.
 * done(true) = 달았다 · done(false) = 새 부품을 버렸다
 */
const gainPart = (id: SlicePartId, done: (took: boolean) => void): void => {
  if (parts.length < ECON.partSlots) {
    parts.push(id);
    newParts.add(id);
    return done(true);
  }
  const el = openOverlay(`<h2><span class="pass-tag bad">칸 가득</span> 부품 칸 ${ECON.partSlots}개가 모두 찼습니다</h2><p>${josa(SLICE_PARTS[id].name, '을')} 달려면 하나를 녹여야 합니다. 녹인 부품은 나사 ${ECON.meltBack}이 됩니다.</p>
    <div class="part-cards melt-cards">${parts.map((pid) => partFace(pid, `data-melt="${pid}"`)).join('')}</div>
    <div class="row"><button class="btn" type="button" data-keep>${josa(SLICE_PARTS[id].name, '을')} 두고 간다</button></div>`);
  gradeReveal([...el.querySelectorAll<HTMLElement>('[data-grade]')]);
  el.querySelector('[data-keep]')!.addEventListener('click', () => done(false));
  el.querySelectorAll<HTMLElement>('[data-melt]').forEach((btn) =>
    btn.addEventListener('click', () =>
      choose(btn, `${josa(SLICE_PARTS[btn.dataset.melt as SlicePartId].name, '을')} 녹인다`, () => {
        parts[parts.indexOf(btn.dataset.melt as SlicePartId)] = id;
        newParts.add(id);
        gold += ECON.meltBack;
        sfx('stamp');
        toast(`${SLICE_PARTS[btn.dataset.melt as SlicePartId].name} — 녹였습니다. (나사 +${ECON.meltBack})`);
        done(true);
      }),
    ),
  );
};

/** 부품 고르기 (검문! 통과): 셋 중 하나 */
const partPick = (head: string, then: () => void, elite = false): void => {
  const rng = sub();
  const pool = (Object.keys(SLICE_PARTS) as SlicePartId[]).filter((id) => !parts.includes(id) && isOpen(id) && partFits(id, squad.map((u) => u.t), parts));
  const offers: SlicePartId[] = [];
  // 칸마다 등급을 먼저 뽑고 그 등급에서 하나 (없으면 아무 등급) — 검문 · 반장은 높은 등급이 잘 나온다 (D-216)
  while (offers.length < 3 && pool.length) {
    const g = rollGrade(rng.next(), elite ? GRADE.elite : GRADE.weights);
    const same = pool.filter((id) => (PART_GRADE[id] ?? 'common') === g);
    const pickFrom = same.length ? same : pool;
    const id = pickFrom[rng.int(pickFrom.length)];
    pool.splice(pool.indexOf(id), 1);
    offers.push(id);
  }
  const el = openOverlay(`${head}<div class="part-cards">${offers.map((id) => partHtml(id, true)).join('')}</div>`);
  gradeReveal([...el.querySelectorAll<HTMLElement>('[data-grade]')]);
  el.querySelectorAll<HTMLElement>('[data-part]').forEach((btn) =>
    btn.addEventListener('click', () =>
      choose(btn, `${josa(SLICE_PARTS[btn.dataset.part as SlicePartId].name, '을')} 단다`, () => {
        draft(elite ? 'part_elite' : 'part', offers, btn.dataset.part!);
        gainPart(btn.dataset.part as SlicePartId, () => then());
      }),
    ),
  );
};

/** 규칙 (D-195): 글 벽 대신 안내서 다섯 쪽(그림 한 줄 + 두세 줄) — 처음 화면의 안내서와 같은 것 */
/**
 * ? 버튼 (D-198, 사용자 승인 5번): 안내서 다섯 쪽 대신 지금 화면 한 장 + 용어 사전. ✕ · Esc · 바깥 탭으로 닫힌다.
 * 반장 판이면 그 반장 규칙을 맨 위에. 「안내서 전체」로 예전 다섯 쪽.
 */
// ---------- 시험판 도구 (D-234): 버그 제보 · 기록 보내기 · 설문 ----------
/** 지금 판 상태 (버그 재현용): 시드 · 위치 · 분대 · 덱 · 부품 · 판 위 기물 · 손패 · 예고 */
const stateDump = (): Record<string, unknown> => ({
  build: import.meta.env.MODE,
  ua: navigator.userAgent,
  seed: runSeed,
  ...where(),
  daily,
  gold,
  charms: { ...charms },
  deck: [...deck],
  parts: [...parts],
  squad: squad.map((u) => ({ t: u.t, name: u.name, hp: u.hp, quirk: u.quirk, cracked: u.cracked })),
  battle: b
    ? { title: cur.title, turn: b.turn, winner: b.s.winner, ap: b.ap, kills: b.kills, rewinds: b.rewinds, hand: [...b.hand], intents: b.intents, pieces: b.s.pieces.map((p) => ({ id: p.id, s: p.side, t: p.type, x: p.x, y: p.y, hp: p.hp, sh: p.shield })) }
    : null,
});
/** 버그 · 짜증 제보: 한 줄 + 지금 상태를 기록에 남긴다 (Monster Train F8 · 보고서 3 C-4) */
const bugReport = (): void => {
  const el = openOverlay(`<div class="pt-card"><h2>${PT.bugTitle}</h2><p class="dim">${PT.bugNote}</p><textarea class="pt-text" rows="3" maxlength="300" placeholder="${PT.bugHint}"></textarea><div class="row"><button class="btn" type="button" data-x>${PT.close}</button><button class="btn brass" type="button" data-send>${PT.send}</button></div></div>`);
  el.querySelector('[data-x]')!.addEventListener('click', closeOverlay);
  el.querySelector('[data-send]')!.addEventListener('click', () => {
    track('bug_report', { note: el.querySelector<HTMLTextAreaElement>('.pt-text')!.value.trim(), state: stateDump() });
    closeOverlay();
    toast(PT.bugSaved, 2600);
  });
};
/** 글을 클립보드로 (안 되면 글 상자를 골라 둔다) */
const copyText = async (text: string, box: HTMLTextAreaElement): Promise<void> => {
  try {
    await navigator.clipboard.writeText(text);
    toast(PT.copied, 2600);
  } catch {
    box.hidden = false;
    box.value = text;
    box.select();
    toast(PT.copyFail, 3200);
  }
};
/** 기록 보내기: 쌓인 기록(JSON)을 복사 · 파일로 · 지우기 */
const exportScreen = (back: () => void): void => {
  const all = telemetryAll();
  const payload = (): string => JSON.stringify({ v: 1, exported: new Date().toISOString(), session: telemetrySession(), meta: { runs: readMeta(store).runs, clears: readMeta(store).clears, ascOpen: readMeta(store).ascOpen }, events: telemetryAll() });
  const el = openOverlay(`<div class="pt-card"><h2>${PT.exportTitle}</h2><p>${PT.exportNote(all.length)}</p><textarea class="pt-text pt-dump" rows="4" readonly hidden></textarea><div class="row"><button class="btn" type="button" data-x>${PT.close}</button><button class="btn" type="button" data-clear>${PT.clear}</button><button class="btn" type="button" data-file>${PT.save}</button><button class="btn brass" type="button" data-copy>${PT.copy}</button></div></div>`);
  const box = el.querySelector<HTMLTextAreaElement>('.pt-dump')!;
  el.querySelector('[data-x]')!.addEventListener('click', back);
  el.querySelector('[data-copy]')!.addEventListener('click', () => void copyText(payload(), box));
  el.querySelector('[data-file]')!.addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([payload()], { type: 'application/json' }));
    a.download = `pawnisher-playtest-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '')}.json`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });
  el.querySelector('[data-clear]')!.addEventListener('click', () => {
    telemetryClear();
    toast(PT.cleared);
    exportScreen(back);
  });
};
/** 설문 (10문항, 한 쪽에 하나 — 가로 화면에 다 들어가게). 답은 기록 'survey'로 */
const surveyScreen = (i: number, ans: Record<string, unknown>, then: () => void): void => {
  const q = SURVEY[i];
  const cur0 = ans[q.id];
  const body =
    q.kind === 'scale'
      ? `<div class="pt-scale">${q.zero ? `<button type="button" class="btn${cur0 === 0 ? ' brass' : ''}" data-v="0">0</button>` : ''}${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="btn${cur0 === n ? ' brass' : ''}" data-v="${n}">${n}</button>`).join('')}</div><p class="pt-ends dim"><span>1 = ${q.lo}</span><span>5 = ${q.hi}</span></p>${q.zero ? `<p class="dim pt-zero">0 = ${q.zero}</p>` : ''}`
      : q.kind === 'text'
        ? `<textarea class="pt-text" rows="3" maxlength="300">${typeof cur0 === 'string' ? cur0 : ''}</textarea>`
        : `<div class="pt-opts">${q.opts.map((o, k) => `<button type="button" class="btn${(q.kind === 'many' ? ((cur0 as number[]) ?? []).includes(k) : cur0 === k) ? ' brass' : ''}" data-o="${k}">${o}</button>`).join('')}</div>`;
  const last = i === SURVEY.length - 1;
  const el = openOverlay(`<div class="pt-card"><p class="eyebrow">${PT.surveyTitle} ${i + 1} / ${SURVEY.length}</p><h2 class="pt-q">${q.q}</h2>${body}<div class="row"><button class="btn" type="button" data-prev>${i ? '이전' : PT.close}</button><button class="btn brass" type="button" data-next>${last ? '마치기' : '다음'}</button></div>${i === 0 ? `<p class="dim re-note">${PT.surveyNote}</p>` : ''}</div>`);
  el.querySelectorAll<HTMLElement>('[data-v]').forEach((btn) => btn.addEventListener('click', () => (sfx('tap'), (ans[q.id] = Number(btn.dataset.v)), surveyScreen(i, ans, then))));
  el.querySelectorAll<HTMLElement>('[data-o]').forEach((btn) =>
    btn.addEventListener('click', () => {
      sfx('tap');
      const k = Number(btn.dataset.o);
      if (q.kind === 'many') {
        const set = new Set((ans[q.id] as number[]) ?? []);
        if (set.has(k)) set.delete(k);
        else set.add(k);
        ans[q.id] = [...set].sort((a, c) => a - c);
      } else ans[q.id] = k;
      surveyScreen(i, ans, then);
    }),
  );
  const keepText = (): void => {
    const t = el.querySelector<HTMLTextAreaElement>('.pt-text');
    if (t) ans[q.id] = t.value.trim();
  };
  el.querySelector('[data-prev]')!.addEventListener('click', () => (keepText(), i ? surveyScreen(i - 1, ans, then) : then()));
  el.querySelector('[data-next]')!.addEventListener('click', () => {
    keepText();
    if (!last) return surveyScreen(i + 1, ans, then);
    // 여러 개 고르기는 고른 말 그대로 남긴다 (집계가 보기 쉽게)
    const out: Record<string, unknown> = {};
    for (const x of SURVEY) out[x.id] = x.kind === 'many' ? ((ans[x.id] as number[]) ?? []).map((k) => x.opts[k]) : x.kind === 'one' && typeof ans[x.id] === 'number' ? x.opts[ans[x.id] as number] : ans[x.id] ?? null;
    track('survey', { ...where(), answers: out });
    toast(PT.surveyDone, 2400);
    then();
  });
};

/** 용어 사전 (D-233): 열린 용어만 — 새로 열린 것은 NEW, 아직 못 만난 수는 한 줄로 */
const dictHtml = (): string => {
  const m = readMeta(store);
  const on = new Set(m.terms ?? []);
  const fresh = new Set(m.termsNew ?? []);
  const list = KEYWORDS.filter(([k, , g]) => g === 'base' || on.has(k));
  const left = KEYWORDS.length - list.length;
  return `<div class="hp-dict">${list.map(([k, v]) => `<div class="hd-term"><b>${k}${fresh.has(k) ? ' <i class="new-tag">NEW</i>' : ''}</b><span>${v}</span></div>`).join('')}</div>${left ? `<p class="dim hp-more">아직 만나지 않은 용어 ${left}개 — 나아가면 열립니다.</p>` : ''}`;
};
/**
 * ? 도움말 (D-263, 사용자: 「지금 화면 · 용어 · 안내서 전체는 가독성 최악 — 지금 화면은 안내서에 통합」):
 * 탭 셋 = 안내서(그림 + 핵심 행, 반장 대국이면 반장 쪽부터) · 용어 · 버그 · 짜증 제보.
 */
const helpTabs = (on: 'guide' | 'dict'): string =>
  `<div class="hp-tabs"><button class="btn${on === 'guide' ? ' brass' : ''}" type="button" data-tab="guide">${HUD_TEXT.helpTitle}</button><button class="btn${on === 'dict' ? ' brass' : ''}${(readMeta(store).termsNew ?? []).length ? ' has-new' : ''}" type="button" data-tab="dict">${HUD_TEXT.dictTitle}</button><button class="btn" type="button" data-tab="bug">${PT.bug}</button></div>`;
const help = (tab: 'now' | 'dict' = 'now'): void => {
  const opened = Date.now();
  let switched = false;
  const onTab = (t: string): void => {
    switched = true;
    helpSeen(tab, opened);
    if (t === 'dict') return help('dict');
    if (t === 'bug') return bugReport();
    if (t === 'guide') return help('now');
  };
  if (tab === 'now') {
    void guide(openOverlay, OPENING_TEXT.close, { start: b?.boss ? GUIDE_PAGES.length - 1 : 0, tabs: helpTabs('guide'), onTab }).then(() => { if (!switched) { closeOverlay(); helpSeen(tab, opened); } });
    return;
  }
  const el = openOverlay(`<div class="helpcard">${helpTabs('dict')}<button class="btn sq gd-x" type="button" data-x aria-label="${OPENING_TEXT.close}">✕</button><div class="hp-body">${dictHtml()}</div></div>`);
  const over = $('overlay');
  const close = (): void => (window.removeEventListener('keydown', onKey), over.removeEventListener('click', onOut), closeOverlay(), helpSeen(tab, opened));
  const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') close(); };
  const onOut = (e: MouseEvent): void => { if (e.target === over) close(); };
  window.addEventListener('keydown', onKey);
  window.setTimeout(() => over.addEventListener('click', onOut), 0);
  el.querySelector('[data-x]')!.addEventListener('click', () => (sfx('tap'), close()));
  el.querySelectorAll<HTMLElement>('[data-tab]').forEach((t) => t.addEventListener('click', () => { if (t.dataset.tab === 'dict') return; sfx('tap'); window.removeEventListener('keydown', onKey); over.removeEventListener('click', onOut); onTab(t.dataset.tab!); }));
};

/** 도움말을 닫았다: 사전을 봤으면 NEW를 지우고 얼마나 머물렀는지 기록 (용어 툴팁 지표 ⑦) */
const helpSeen = (tab: 'now' | 'dict', opened: number): void => {
  const m = readMeta(store);
  if (tab === 'dict') {
    track('tooltip_inspect', { term_id: 'dict', new_terms: m.termsNew ?? [], dwell_ms: Date.now() - opened });
    if ((m.termsNew ?? []).length) writeMeta(store, { ...m, termsNew: [] });
    $('btn-help').classList.remove('has-new');
  } else track('tooltip_inspect', { term_id: 'help', dwell_ms: Date.now() - opened });
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
  const i = Number(el.dataset.card);
  // 탄창 (D-209): 한 번 = 펼쳐 효과 보기, 펼친 탄 한 번 더 = 쓴다(장전). 장전된 탄을 또 누르면 내려놓고 접는다
  if (document.body.classList.contains('lay-f') && !busy) {
    if (selCard === i) {
      selCard = selPiece = openCard = null;
      return refresh();
    }
    // 즉시 카드(뽑기 · 점화 등)는 한 번에 쓰이면 되돌릴 수 없으니 먼저 펼쳐 보여 준다. 움직이는 카드는 바로 장전
    if (openCard !== i && (isInstant(b.hand[i]) || !canPlay(b, i))) {
      selCard = selPiece = null;
      openCard = i;
      return refresh();
    }
    openCard = i;
  }
  pickCard(i);
});
$('btn-end').addEventListener('click', () => void onEnd());
document.getElementById('deckrow')?.addEventListener('click', (e) => {
  if ((e.target as HTMLElement).closest('[data-deck]')) return deckView('view');
  if ((e.target as HTMLElement).closest('[data-crew]')) return crewView();
});
// 반장 칸 (D-208): 레일엔 이름 · 지금 일만 — 누르면 규칙 전체
$('boss').addEventListener('click', () => {
  if (!b.boss) return;
  const r = BOSS_RULES[b.bossRule];
  toast(`${r.name} — ${r.lines.map((l) => l.replace(/(줄 폭격 −)\d+/, `$1${foeDmg(BOSS.bombDamage, b)}`).replace(/(친 기물이 )\d+/, `$1${foeDmg(BOSS_NUM.thorns, b)}`)).join(' · ')}`, 3200);
});
$('parts').addEventListener('click', (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-part-info]');
  if (!el) return;
  // 카드 모양 팝업 (테스터: 맨 위 한 줄 알림이라 거의 안 보였다) — 누른 부품 아래에 실제 부품 카드, 아무 데나 누르면 닫힌다
  document.querySelector('.part-pop')?.remove();
  const r = el.getBoundingClientRect();
  const pop = document.createElement('div');
  pop.className = 'part-pop';
  pop.innerHTML = partFace(el.dataset.partInfo as SlicePartId, '');
  document.body.appendChild(pop);
  const w = pop.offsetWidth;
  const h = pop.offsetHeight;
  pop.style.left = `${Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2))}px`;
  pop.style.top = `${r.bottom + 8 + h > innerHeight ? Math.max(8, r.top - h - 8) : r.bottom + 8}px`;
  replay(pop, 'in');
  gradeReveal([...pop.querySelectorAll<HTMLElement>('[data-grade]')]);
  sfx('lift');
  window.setTimeout(() => document.addEventListener('pointerdown', () => pop.remove(), { once: true, capture: true }), 0);
});
$('btn-rewind').addEventListener('click', () => {
  if (busy || b.s.winner !== null) return;
  if (b.rewinds <= 0) return toast(`‘되감을 톱니가 없어.’ (${CHARMS.rewind.name}는 상자 · 고물상 · 반장에게서)`);
  // 확인 (D-209): 되돌릴 수 없는 결정은 한 번 묻는다
  rewindScene({ ...HUD_TEXT.rewindScene, line: HUD_TEXT.rewindLine }, () => undefined, () => doRewind(false), false);
});
/**
 * 되감기 둘 (2026-11-05 사용자: 「더 세게 나누자」):
 * - 턴 되감기 = 「◀◀ 역행」 — 청록 테이프가 거꾸로 감기는 0.8초. 가볍고 빠르다.
 * - 죽음 되감기 = 「초월」 — 흰 정지 프레임 → 거꾸로 폭주하는 톱니와 금빛 「초월」 → 흩어진 도트 조각이 킹 자리로 빨려 들고(예비 동작 → 돌진)
 *   빛기둥이 내리꽂히며 킹이 하늘에서 떨어져 박힌다(dropIn) → 2인칭 서술 한 줄. 약 3초.
 */
const doRewind = (death = false): void => {
  const r = rewind(b);
  if (typeof r === 'string') return toast(r);
  track('rewind_used', { ...where(), turn: b.turn, rewinds_left: r.rewinds, death });
  rewindsUsedRun += 1;
  blog = blog.filter((x) => !(x.side === 0 && x.turn === b.turn));
  busy = true;
  refresh();
  if (parts.includes('tape')) flashParts(['tape']);
  const swap = (): void => {
    b = r;
    turnDmg = 0;
    prevKills = b.kills;
    selCard = selPiece = openCard = null;
    renderer.setup(b.s);
    // 기물 그림은 refresh(render)에서 다시 세워진다 — 그래야 dropIn이 되살아난 킹을 찾는다
    refresh();
  };
  const done = (): void => {
    busy = false;
    refresh();
  };
  if (death) return void transcend(r, swap).then(done);
  const fx = document.createElement('div');
  fx.className = 'tapefx';
  fx.innerHTML = `<span>${HUD_TEXT.rewindScene.fx}</span>`;
  document.body.appendChild(fx);
  [0, 90, 180, 270].forEach((ms, k) => window.setTimeout(() => sfx('tap', 8 - k * 2), ms));
  window.setTimeout(() => (swap(), done(), sfx('awaken')), 420);
  window.setTimeout(() => fx.remove(), 800);
};

/** 죽음 되감기 「초월」 연출 (DOM 겹 + 판 dropIn). swap()에서 판이 되돌아가고 끝나면 풀린다 */
const transcend = async (back: SliceBattle, swap: () => void): Promise<void> => {
  const wait = (ms: number) => new Promise((res) => window.setTimeout(res, calmNow() ? Math.min(ms, 60) : ms));
  const king = back.s.pieces.find((p) => p.side === 0 && p.type === 'K');
  const at = king ? renderer.screenOf(king) : { x: innerWidth / 2, y: innerHeight / 2 };
  document.body.classList.add('rev-freeze');
  const el = document.createElement('div');
  el.className = 'transfx';
  el.innerHTML = `<i class="tf-flash"></i><i class="rev-gear fast"></i><b class="tf-word">${HUD_TEXT.lossRewind.fx}</b>`;
  el.style.setProperty('--tx', `${Math.round(at.x)}px`);
  el.style.setProperty('--ty', `${Math.round(at.y)}px`);
  document.body.appendChild(el);
  // ① 흰 정지 프레임 · 톱니 폭주 · 「초월」 도장
  sfx('stamp');
  await wait(420);
  // ② 작은 황동 톱니 파편이 소용돌이치며 킹 자리로 감겨 든다 (한 번 바깥으로 물러섰다가 — 예비 동작 → 돌진)
  for (let k = 0; k < 18; k++) {
    const sh = document.createElement('i');
    sh.className = 'tf-cog';
    sh.style.setProperty('--a', `${Math.round((k / 18) * 360)}deg`);
    sh.style.setProperty('--r', `${150 + ((k * 53) % 120)}px`);
    sh.style.setProperty('--d', `${(k % 6) * 45}ms`);
    sh.innerHTML = '<i></i>';
    el.appendChild(sh);
  }
  [0, 110, 220, 330, 440, 550].forEach((ms, k) => window.setTimeout(() => sfx('tap', 4 + k * 2), ms));
  await wait(980);
  // ③ 빛기둥이 내리꽂히고(도트 단면 8장) 판이 되돌아온다 — 잿빛이 풀리고 킹이 빛 속으로 떨어져 박히는 순간 톱니 고리 빛살이 터진다
  el.classList.add('land');
  const beam = document.createElement('i');
  beam.className = 'tf-beam';
  el.appendChild(beam);
  document.body.classList.remove('rev-freeze');
  swap();
  sfx('awaken');
  // 기다리지 않고 바로 — 되살아난 킹이 제자리에 한 번 보였다가 하늘로 튀는 프레임이 없게 (그리기와 같은 순서로 이어진다)
  const slam = IMPACT.drop.shadow + IMPACT.drop.fall;
  window.setTimeout(() => {
    const burst = document.createElement('i');
    burst.className = 'tf-burst';
    el.appendChild(burst);
    sfx('kill');
  }, calmNow() ? 0 : slam);
  if (king) await renderer.dropIn(king.id);
  // ④ 서술 한 줄
  const line = document.createElement('p');
  line.className = 'tf-wake';
  el.appendChild(line);
  await typeIn(line, HUD_TEXT.lossRewind.wake, 34);
  await wait(900);
  await new Promise<void>((res) => pxOut(el, () => (el.remove(), res())));
};
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
  blog = [];
  apKey = '';
  apPrev = coinPrev = null;
  b = newSliceBattle(squad, LAB.enemy, LAB.deck, 300 + labRounds[mode] * 31, { enemyKingHp: mode === 'A' ? LAB.kingHpA : undefined, lab: mode });
  selCard = selPiece = openCard = null;
  busy = false;
  turnDmg = 0;
  prevKills = 0;
  ritesDone = 0;
  $('hand').classList.remove('dealing');
  closeOverlay();
  renderer.setFoeTraits([]);
  renderer.setup(b.s);
  refresh();
  toast(mode === 'A' ? '처치하면 태엽이 1 회복됩니다. 턴은 처치로 늘립니다.' : '적 칸에 들어가면 잡습니다. 붉은 칸에 남은 기물은 잡힙니다.', 3600);
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
/** 고물상 값: 승급 4 이상 · 탐욕의 저울(대가 +25%)이면 오른다 */
const ascPrice = (n: number): number => Math.round(n * (asc >= 4 ? ASC_NUM.shopMul : 1) * (parts.includes('greed') ? PART_NUM.greedShop : 1));

/** 새 출하: 시드 · 승급 · 오늘의 출하. 분대 · 덱 · 부품 · 나사 · 지도를 처음으로 */
const newRun = (seed: number, level: number, day: string | null): void => {
  runSeed = seed;
  asc = level;
  runBosses = [];
  openIds = day ? null : new Set([...STARTER_CARDS, ...STARTER_PARTS, ...(readMeta(store).unlocked ?? [])]);
  daily = day;
  firstShip = readMeta(store).runs === 0 && !day;
  runAt = Date.now();
  runLive = true;
  rewindsUsedRun = 0;
  track('run_start', { seed, asc: level, daily: day, first: firstShip, run: readMeta(store).runs + 1 });
  acts = buildRun(seed, level, firstShip);
  shopsSeen = 0;
  svcUsed = { refine: 0, remove: 0 };
  R = new Rng(seed ^ 0x51c3);
  actI = 0;
  rowI = 0;
  won = 0;
  stage = 0;
  gold = 0;
  refined = [];
  parts = [];
  deck = [...START_DECK];
  // 승급 7 (조항 「불량 세트의 명령서에는 녹을 섞는다」): 시작 덱 한 장이 녹슨 카드
  if (level >= 7) deck[deck.length - 1] = rustOnce(deck[deck.length - 1]);
  picked = [[], [], []];
  // 최근 출하에서 만난 사건은 이번 가방에서 뺀다 (D-247, 사용자: 「랜덤 인카운터가 너무 동일하게 반복」) — 가방이 비면 다시 전부
  { const recent = readMeta(store).evRecent ?? []; eventBag = SLICE_EVENT_IDS.filter((x) => !recent.includes(x)); if (eventBag.length < 4) eventBag = [...SLICE_EVENT_IDS]; }
  runId = `${new Date().toISOString().slice(0, 16).replace('T', ' ')}${day ? ' · 오늘의 출하' : ''}${level ? ` · 승급 ${level}` : ''}`;
  squad = [];
  metaCache = null;
  for (const t of START_SQUAD) squad.push(crewOf(t));
  // 승급 10 (조항 「심장 톱니는 금 간 것으로」): 킹이 아닌 분대원 하나가 깨진 심장 톱니로 시작
  if (level >= 10) { const i = squad.findIndex((u) => u.t !== 'K'); if (i >= 0) squad[i] = { ...squad[i], cracked: true }; }
  clutchLeft = dir.clutch(level);
  sacLeft = dir.sacrifice(level);
  closeActs = [];
  highlight = null;
  charms = { revive: level <= CHARM_NUM.startReviveUpTo ? 1 : 0, rewind: CHARM_NUM.startRewind };
  lossesHere = 0;
  lossDef = null;
};

/** 지금 출하를 저장한다 (지도에 설 때 · 대국을 시작할 때) */
const saveRun = (at: 'map' | 'battle', node?: number): void =>
  writeSave(store, { v: 2, seed: runSeed, asc, daily, runId, actI, rowI, picked, squad, deck, parts, gold, won, stage, refined, eventBag, rng: R.state, at, node, clutchLeft, sacLeft, closeActs, highlight, charms, first: firstShip, svc: svcUsed, bosses: runBosses });

/** 저장한 출하를 되살린다 */
const loadRun = (sv: RunSave): void => {
  runSeed = sv.seed;
  asc = sv.asc;
  daily = sv.daily;
  openIds = sv.daily ? null : new Set([...STARTER_CARDS, ...STARTER_PARTS, ...(readMeta(store).unlocked ?? [])]);
  firstShip = !!sv.first;
  svcUsed = sv.svc ?? { refine: 0, remove: 0 };
  runBosses = (sv.bosses ?? []) as StoryBoss[];
  runLive = true;
  acts = buildRun(sv.seed, sv.asc, firstShip);
  R = new Rng(sv.rng);
  ({ runId, actI, rowI, picked, squad, deck, parts, gold, won, stage, refined, eventBag } = sv);
  // 옛 저장 (D-183 전 — 다듬기가 카드 종류 전부였다): 그 종류를 모두 「+」로 옮겨 그 판은 그대로 이어 간다
  if (refined.length && !deck.some(isRefined)) deck = deck.map((id) => (refined.includes(id) ? refinedOf(baseOf(id)) : id));
  clutchLeft = sv.clutchLeft ?? dir.clutch(sv.asc);
  sacLeft = sv.sacLeft ?? dir.sacrifice(sv.asc);
  closeActs = sv.closeActs ?? [];
  highlight = sv.highlight ?? null;
  // 부적 (D-228) 전 저장: 그때는 다시 하기가 무제한이었다 — 시작 몫을 그대로 준다
  charms = sv.charms ?? { revive: sv.asc <= CHARM_NUM.startReviveUpTo ? 1 : 0, rewind: CHARM_NUM.startRewind };
};

/** 출하 결과 (끝까지 갔거나 그만뒀을 때): 분대 · 기록 · 다시. 저장을 지우고 기록을 남긴다 (승급이 열린다) */
// ---------- 각본: 도금왕 · 승급 (docs/script.md §9 ~ §10, D-276) ----------
/** 도금왕 2단계: 비꼼 — 이번 출하에 쓰러뜨린 반장 하나(마지막 것)에게 한 말을 되돌려 준다 */
const gildedPhase2 = async (): Promise<void> => {
  const last = runBosses.at(-1);
  await playCuts([{ img: gildedArt(), bg: ['#2a1e08', '#0b0b0e'], glow: '#facc15', fx: 'gold', art: [{ t: 'K', side: 1, x: 50, y: 56, h: 46 }],
    lines: [{ k: 'n', t: '금칠이 갈라진 틈으로 쇳물빛이 샜다.' }, { k: 's', who: '도금왕', t: GILDED_STORY.phase2(asc) }, ...(last ? [{ k: 's' as const, who: '도금왕', t: BOSS_STORY[last].mock }] : []), { k: 's', who: '도금왕', t: GILDED_STORY.phase2End }] }]);
  // 승급 13 (각본 §2.5): 마지막 증언 → 싸움 중에 종이 왕관을 벗는다 — 여기부터 종이왕은 폰처럼 움직이고 친다
  if (asc >= 13) {
    await playCuts([CROWN_OFF]);
    const k = b.s.pieces.find((p) => p.side === 0 && p.type === 'K');
    if (k) k.asPawn = true;
    renderer.setup(b.s);
    refresh();
    toast(HUD_TEXT.pawnMode, 4200);
  }
};
/** 도금왕 초상 — 겹 단계 (B-04 · B-04a ~ d, 승급 0 ~ 2 · 3 ~ 5 · 6 ~ 8 · 9 ~ 12 · 13) */
const gildedArt = (): string => `boss-gilded${asc <= 2 ? '' : asc <= 5 ? '-1' : asc <= 8 ? '-2' : asc <= 12 ? '-3' : '-4'}`;
/** 승급 칸 (각본 S6): 앞선 종이왕의 증언 → 속말 → 「승급한다」 · 「내려놓는다」(승급 12까지는 떨리다 꺼진다) */
const promoteScreen = (): Promise<void> =>
  new Promise((done) => {
    const tm = TESTIMONY[Math.min(TESTIMONY.length - 1, asc)];
    const last = runBosses.at(-1);
    const el = openOverlay(`<div class="promo"><span class="promo-art"><img src="scenes/${gildedArt()}.png" alt="" onerror="if(!this.dataset.t){this.dataset.t='1';this.src='scenes/boss-gilded.png'}else{this.outerHTML=this.dataset.fb}" data-fb='${pieceImg('K', 1, 'large', 150).replace(/'/g, '&#39;')}'></span><div class="promo-body"><p class="eyebrow">승급 칸${asc ? ` · 승급 ${asc}` : ''}</p><p class="promo-say"><b>도금왕</b> “${tm.say}”</p>${asc === 6 && last ? `<p class="promo-say">“${BOSS_STORY[last].mock}”</p>` : ''}<p class="promo-mono">‘${tm.mono}’</p><div class="row"><button class="btn brass" type="button" data-promote>${PROMOTE_TEXT.promote}</button><button class="btn" type="button" data-lay>${PROMOTE_TEXT.lay}</button></div><p class="promo-stuck" hidden>${PROMOTE_TEXT.hint} ‘${PROMOTE_TEXT.stuck}’</p></div></div>`);
    const lay = el.querySelector<HTMLButtonElement>('[data-lay]')!;
    lay.addEventListener('click', () => {
      if (lay.disabled) return;
      sfx('threat');
      lay.classList.add('tremble');
      // 손이 떨어지지 않는다 — 승급이 오를수록 더 오래 버틴다 (D-131)
      window.setTimeout(() => {
        lay.classList.remove('tremble');
        lay.disabled = true;
        lay.classList.add('dead');
        el.querySelector<HTMLElement>('.promo-stuck')!.hidden = false;
      }, 300 + asc * 180);
    });
    el.querySelector('[data-promote]')!.addEventListener('click', () => {
      sfx('submit');
      closeOverlay();
      done();
    });
  });
/** 도금왕을 쓰러뜨린 뒤: 승급 칸 → 승급 7컷(조항 · 거울) → 결과 */
const endingFlow = async (): Promise<void> => {
  // 승급 13 최종장 (D-270 · D-277): 승급 화면 없이 판 위 연출 → 뒤(진 엔딩) · 앞(엔딩 A)
  if (asc >= 13) {
    const crew = squad.filter((u) => u.t !== 'K').map((u) => u.t);
    const pick = await finaleScene(crew);
    if (pick === 'front') await playCuts([ENDING_A]);
    else {
      await playCuts(trueEndingCuts(crew.slice(0, 6).map((t, k) => ({ t, side: 0 as const, x: 14 + k * 9, y: 66, h: 22 }))));
      writeMeta(store, { ...readMeta(store), trueEnd: true });
      // 크레딧 · 기록 사진 (각본 S11)
      await creditsScene(crew.slice(0, 8), `출하 ${readMeta(store).runs + 1}번째 · 승급 ${asc} · ${new Date().toISOString().slice(0, 10)}`);
    }
    return runEnd(true);
  }
  await promoteScreen();
  const crewName = squad.find((u) => u.t !== 'K')?.name ?? '분대원';
  const last = runBosses.at(-1);
  await playCuts(promotionCuts(asc, crewName, ASCENSION[Math.min(ASCENSION.length - 1, asc)].law, last ? BOSS_STORY[last].mirror : ''));
  runEnd(true);
};

/** 출하 끝 — 졌으면 용광로 컷(각본 §12)을 먼저 */
const runEnd = (cleared: boolean): void => {
  if (!cleared && !labMode) return void playCuts([DEFEAT]).then(() => runEndNow(false));
  runEndNow(cleared);
};
const runEndNow = (cleared: boolean): void => {
  // 지표 ③ · ④: 한 판 길이 · 끝난 자리 · 쓰지 않고 남긴 되감기 · 부적
  track('session_exit', { ...where(), run_time_min: Math.round((Date.now() - runAt) / 6000) / 10, turn_num: b?.turn ?? 0, exit_type: cleared ? 'clear' : 'gameover' });
  if (!cleared) track('gameover_inventory', { ...where(), rewinds_left: charms.rewind, revive_charm_left: charms.revive, total_rewinds_used: rewindsUsedRun, deck_size: deck.length, parts });
  if (!cleared) ftue('gameover', true);
  clearSave(store);
  document.body.classList.add('between');
  placeBg(cleared ? 'end-clear' : 'end-fail');
  const m0 = readMeta(store);
  const m = recordRun(m0, { cleared, act: actI + 1, won, asc, daily });
  // 해금 (D-284): 출하를 끝낼 때마다 몇 개씩 — 도달한 막 · 완주에 따라
  const fresh = daily ? [] : nextUnlocks(m.unlocked ?? [], unlockCount(Math.min(4, actI + 1), cleared));
  if (fresh.length) m.unlocked = [...(m.unlocked ?? []), ...fresh];
  writeMeta(store, m);
  const freshNames = fresh.map((id) => (id in SLICE_PARTS ? `부품 「${SLICE_PARTS[id as SlicePartId].name}」` : `카드 「${COMMANDS[id as CommandId]?.name ?? id}」`));
  const unlocked = m.ascOpen > m0.ascOpen;
  const fallenNow = readLedger().filter((r) => r.run === runId);
  const kills = squad.reduce((n, u) => n + (u.kills ?? 0), 0) + fallenNow.reduce((n, r) => n + r.kills, 0);
  // 결과 (D-195 정리): 머리 한 줄 · 집계 넷 · 분대 칩 한 줄 · (있으면) 묘수 · 승급 열림. 긴 문장 나열 대신
  const chip = (name: string, t: PieceType, bad = false) => `<span class="re-chip${bad ? ' bad' : ''}">${pieceImg(t, 0, 'small', 18)}${name}</span>`;
  const el = openOverlay(`<h2><span class="pass-tag${cleared ? '' : ' bad'}">${cleared ? '출하 완료' : '출하 중단'}</span> ${cleared ? '출하구를 지났습니다.' : `${actLabel(actI + 1)}에서 멈췄습니다.`}${daily || asc ? ` <span class="dim">${daily ? '오늘의 출하' : ''}${daily && asc ? ' · ' : ''}${asc ? `승급 ${asc}` : ''}</span>` : ''}</h2>
    <div class="tally"><div>이긴 대국 <b data-v="${won}">${won}</b></div><div>처치 <b data-v="${kills}">${kills}</b></div><div>나사 <b data-v="${gold}">${gold}</b></div><div>덱 <b data-v="${deck.length}">${deck.length}</b></div></div>
    <div class="re-row">${squad.map((u) => chip(u.name ?? PIECE_NAMES_KO[u.t], u.t)).join('')}${fallenNow.map((r) => chip(r.name, r.t, true)).join('')}</div>
    ${highlight ? `<p class="hl"><span class="pass-tag">묘수</span> ${highlight.where} ${highlight.turn}턴 — 처치 ${highlight.kills} · 피해 ${highlight.damage}</p>` : ''}
    ${freshNames.length ? `<p class="asc-open">새로 열렸습니다 — ${freshNames.join(' · ')}</p>` : ''}
    ${unlocked ? `<p class="asc-open">승급 ${m.ascOpen} 「${ASCENSION[m.ascOpen - 1].name}」이 열렸습니다. 규격판에 새 조항 — 「${ASCENSION[m.ascOpen - 1].law}」 (${ASCENSION[m.ascOpen - 1].desc})</p>` : ''}
    <div class="row"><button class="btn" type="button" data-survey>${PT.survey}</button><button class="btn" type="button" data-export>${PT.export}</button><button class="btn brass" type="button" data-restart>처음 화면</button></div>
    <p class="dim re-note">시험판입니다. 막힌 곳 · 좋았던 순간을 알려 주십시오.</p>`);
  el.querySelector('[data-restart]')!.addEventListener('click', () => (sessionStorage.setItem('op-menu', '1'), location.reload()));
  // 시험판 (D-234): 설문 · 기록 보내기 — 닫으면 이 결과 화면으로 돌아오지 않고 처음 화면으로
  const home = (): void => (sessionStorage.setItem('op-menu', '1'), location.reload());
  el.querySelector('[data-survey]')!.addEventListener('click', () => surveyScreen(0, {}, () => exportScreen(home)));
  el.querySelector('[data-export]')!.addEventListener('click', () => exportScreen(home));
  // 결과 집계 (D-189): 줄이 밀려 들어오고 숫자가 째깍 올라간 뒤 → 출하 도장
  tally(el.querySelector<HTMLElement>('.tally')!, el.querySelector<HTMLElement>('h2 .pass-tag'));
};

// ---------- 부관 안내 (D-238) ----------
/** 부관이 말하는 중 (코치 줄 · 새 용어 알림을 끈다) */
let tutActive = false;
/** 안내를 마친 부분: battle · recruit · map · kit */
const tutDone = (part: string): boolean => (readMeta(store).tut ?? []).includes(part) || !!labMode;
const tutMark = (part: string): void => {
  const m = readMeta(store);
  writeMeta(store, { ...m, tut: [...new Set([...(m.tut ?? []), part])] });
};
/** 안내 한 묶음 — 건너뛰면 남은 묶음도 모두 건너뛴 것으로 */
const tutorial = async (part: string, steps: TutStep[]): Promise<boolean> => {
  tutActive = true;
  document.querySelector('.coach-line')?.remove();
  const done = await runTutorial(steps, { pause: () => enemyTurn || document.body.classList.contains('rev-freeze') || (busy && !document.body.classList.contains('between')), name: TUT.name, skip: TUT.skip, next: TUT.next, face: '<img src="ui/hud/adjutant.png" alt="" width="56" height="56">', tick: () => sfx('tap', 3) });
  tutActive = false;
  tutMark(part);
  track('tutorial', { part, completed: done });
  if (!done) ['battle', 'recruit', 'map', 'kit'].forEach(tutMark);
  refresh();
  return done;
};
/** 판 칸 하나의 화면 사각형 */
const tileRect = (pos: { x: number; y: number }): DOMRect => {
  const a = renderer.screenOf(pos);
  const c = renderer.screenOf({ x: pos.x + 1, y: pos.y });
  const t = Math.abs(c.x - a.x) || 48;
  return new DOMRect(a.x - t / 2, a.y - t / 2, t, t);
};
const myPiece = (t: PieceType) => b.s.pieces.find((p) => p.side === 0 && p.type === t);
const cardEl = (id: CommandId) => document.querySelector(`#hand [data-card="${b.hand.indexOf(id)}"]`);
/** 첫 대국 안내: 판 · 예고 · 태엽 · 탄창 → 폰 · 비숍 연쇄 → 턴 끝 → (적 차례 뒤) 빠지며 치기 · 되감기 · 도움말 */
const battleTutorial = async (): Promise<void> => {
  // 판이 다 설 때까지 기다린다
  while (busy) await new Promise((r) => window.setTimeout(r, 120));
  const T = TUT.battle;
  // 기물은 수마다 새 객체로 바뀐다 — 자리는 늘 지금 판에서 id로 찾는다
  const pawnId = myPiece('P')?.id ?? -1;
  const knightId = myPiece('N')?.id ?? -1;
  const at = (id: number) => { const q = b.s.pieces.find((p) => p.id === id); return q ? tileRect(q) : null; };
  const ahead = (id: number) => { const q = b.s.pieces.find((p) => p.id === id); return q ? tileRect({ x: q.x, y: q.y + 1 }) : null; };
  const foeK = () => b.s.pieces.find((p) => p.side === 1 && p.type === 'K');
  const selCardEl = () => (selCard !== null ? document.querySelector(`#hand [data-card="${selCard}"]`) : null);
  const plays = () => playsMade;
  let p0 = 0;
  // 1턴 (테스터 피드백 B): 폰 처치 → 나이트 둘 짓밟기 → 칭찬 → 지휘로 연쇄 한 방 → 턴 끝 → 적이 친다
  const ok = await tutorial('battle-a', [
    { text: T.hello },
    { text: T.board, target: () => $('board').querySelector('canvas') ?? $('board') },
    { text: T.threat, target: () => $('board').querySelector('canvas') ?? $('board') },
    { text: T.gauge, target: () => $('vials') },
    { text: T.hand, target: () => $('hand') },
    { text: T.card1, target: () => cardEl('advance'), wait: () => selCard !== null && b.hand[selCard] === 'advance' },
    { text: T.piece1, target: () => at(pawnId), wait: () => selPiece === pawnId },
    // 고른 카드는 흐리지 않는다 (테스터: 과녁을 짚을 때 내가 고른 카드까지 흐려졌다)
    { text: T.marks, target: () => $('board').querySelector('canvas') ?? $('board'), peek: () => [selCardEl()] },
    { text: T.square1, target: () => tileRect({ x: 1, y: 2 }), peek: () => [selCardEl()], wait: () => b.kills >= 1 && !busy },
    { text: T.chain, target: () => $('vials') },
    { text: T.card2, target: () => cardEl('leap'), wait: () => selCard !== null && b.hand[selCard] === 'leap' },
    { text: T.piece2, target: () => at(knightId), peek: () => [selCardEl()], wait: () => selPiece === knightId },
    { text: T.square2, target: () => tileRect({ x: 2, y: 2 }), peek: () => [selCardEl()], wait: () => b.kills >= 3 && !busy },
    { text: T.praise, target: () => at(knightId) },
    { text: T.order, target: () => cardEl('order'), wait: () => selCard !== null && b.hand[selCard] === 'order' },
    { text: T.piece4, target: () => at(knightId), peek: () => [selCardEl()], wait: () => selPiece === knightId },
    { text: T.square4, target: () => tileRect({ x: 4, y: 3 }), peek: () => [selCardEl()], enter: () => (p0 = plays()), wait: () => plays() > p0 && !busy },
    { text: T.big, target: () => { const k = foeK(); return k ? tileRect(k) : null; } },
    { text: T.end, target: () => $('btn-end'), wait: () => b.turn >= 2 && !busy && !enemyTurn },
  ]);
  if (!ok || b.s.winner !== null) return;
  // 2턴: 맞은 기물 → 길막기 → 되감기 실습 → 퀸 승격 → 빠지며 치기
  const hurt = b.s.pieces.find((p) => p.side === 0 && p.hp < p.maxHp && p.type !== 'K');
  const steps: TutStep[] = [
    { text: T.hit, target: () => (hurt ? tileRect(hurt) : null) },
    { text: T.block, target: () => $('board').querySelector('canvas') ?? $('board') },
  ];
  if (b.s.pieces.some((p) => p.id === pawnId) && b.hand.filter((c) => c === 'advance').length >= 2 && b.rewinds > 0) {
    let rw0 = 0;
    steps.push(
      { text: T.promo, target: () => cardEl('advance'), wait: () => selCard !== null && b.hand[selCard] === 'advance' },
      { text: T.piece1, target: () => at(pawnId), peek: () => [selCardEl()], wait: () => selPiece === pawnId },
      { text: T.square1.replace('금빛 ', ''), target: () => ahead(pawnId), peek: () => [selCardEl()], enter: () => (p0 = plays()), wait: () => plays() > p0 && !busy },
      { text: T.rewind, target: () => $('btn-rewind'), enter: () => (rw0 = rewindsUsedRun), wait: () => rewindsUsedRun > rw0 && !busy },
      // 실습으로 쓴 톱니는 돌려준다 (입문 판에서 출하 자원을 깎지 않는다)
      { text: T.rewound, target: () => $('btn-rewind'), enter: () => { b.rewinds += 1; rewindsAtStart += 1; refresh(); } },
      { text: T.promo, target: () => cardEl('advance'), wait: () => selCard !== null && b.hand[selCard] === 'advance' },
      { text: T.piece1, target: () => at(pawnId), peek: () => [selCardEl()], wait: () => selPiece === pawnId },
      { text: T.square1.replace('금빛 ', ''), target: () => ahead(pawnId), peek: () => [selCardEl()], enter: () => (p0 = plays()), wait: () => plays() > p0 && !busy },
      { text: T.promo2, target: () => cardEl('advance'), wait: () => selCard !== null && b.hand[selCard] === 'advance' },
      { text: T.piece1, target: () => at(pawnId), peek: () => [selCardEl()], wait: () => selPiece === pawnId },
      { text: T.square1.replace('금빛 ', ''), target: () => ahead(pawnId), peek: () => [selCardEl()], enter: () => (p0 = plays()), wait: () => plays() > p0 && !busy },
      { text: TUT.promoteTut, target: () => at(pawnId), enter: () => tutMark('promote') },
    );
  }
  // 빠지며 치기: 적이 겨눈 우리 기물 하나를 골라 (나이트 → 대장 → 폰 → 퀸 순 — 붉은 칸 밖에서 칠 수 있는 것)
  const CARD_OF: Partial<Record<PieceType, CommandId>> = { N: 'leap', K: 'kingStep', P: 'advance' };
  steps.push({
    text: T.graze,
    target: () => { const g = b.s.pieces.find((p) => p.side === 0 && (b.graze ?? []).includes(p.id)); return g ? tileRect(g) : null; },
  });
  const grazeSteps = (): TutStep[] => {
    const pick = (['N', 'K', 'P', 'Q'] as PieceType[])
      .map((t) => myPiece(t))
      .filter((p): p is NonNullable<typeof p> => !!p && (b.graze ?? []).includes(p.id))
      .map((p) => ({ p, cid: [CARD_OF[p.type], 'order' as CommandId].find((c) => c && b.hand.includes(c)) }))
      .find((x) => x.cid && grazeSquareFor(b.hand.indexOf(x.cid), x.p.id));
    if (!pick) return [];
    const { p: gp, cid } = pick;
    return [
      { text: T.card3, target: () => cardEl(cid!), wait: () => selCard !== null && b.hand[selCard] === cid },
      { text: T.piece3, target: () => tileRect(gp), peek: () => [selCardEl()], wait: () => selPiece === gp.id },
      { text: T.square3, target: () => (selCard !== null ? grazeSquareFor(selCard, gp.id) : null) ?? $('board'), peek: () => [selCardEl()], enter: () => (p0 = plays()), wait: () => plays() > p0 && !busy },
    ];
  };
  const ok2 = await tutorial('battle-b', steps);
  if (!ok2 || b.s.winner !== null) return;
  // 승격 뒤의 판에서 빠지며 칠 수가 있으면 짚고 없으면 설명으로 끝
  const g = grazeSteps();
  await tutorial('battle', [...g, { text: T.help, target: () => $('btn-help') }, { text: T.free }]);
};
/** 이 카드로 빠지며 칠 수 있는 칸 (붉은 칸 밖 · 적을 친다) */
const grazeSquareFor = (ci: number, pieceId: number): DOMRect | null => {
  if (ci < 0) return null;
  const danger = b.grazeDanger ?? [];
  for (const to of cardMoves(b, ci, pieceId)) {
    if (danger.includes(`${to.x},${to.y}`)) continue;
    const r = previewPlay(b, ci, pieceId, to);
    if (r?.events.some((e) => e.type === 'attack' && e.hits.length)) return tileRect(to);
  }
  return null;
};
/** 이번 대국에서 낸 카드 수 (안내가 「한 수 두었다」를 안다) */
let playsMade = 0;

/** 첫 판으로 들어간다 (새 출하 · 오늘의 출하) */
const begin = async (seed: number, level: number, day: string | null): Promise<void> => {
  // 두 번째 출하부터 (각본 S1′): 포장대의 그림자 한 컷
  if (readMeta(store).runs >= 1 && !labMode) await playCuts([shadowCut(level)]);
  newRun(seed, level, day);
  saveRun('battle', 0);
  startBattle(INTRO[0], true);
  closeOverlay();
  closeOpening();
  sfx('submit');
  // 처음 온 사람 (D-238): 전환 카드 · 안내 알림 대신 판을 세우고 부관이 짚는다 — 글이 겹치지 않게 한 목소리만
  if (!tutDone('battle')) {
    // 판이 다 서고 한 박자 쉰 뒤에 부관이 말을 건다 (테스터: 컷신 → 온보딩이 숨 돌릴 틈 없이 붙었다)
    void battleIntro().then(() => new Promise((r) => window.setTimeout(r, 900))).then(() => void battleTutorial());
    return;
  }
  void stageIntro(INTRO[0]).then(() => {
    void battleIntro();
    toast(INTRO[0].tell, 3200);
  });
};

/**
 * 메인 오프닝 화면 (D-192): 게임 판 위에 겹친 창이 아니라 화면 전체를 쓰는 장면.
 * 베인 타이틀 문장 + 「화면을 눌러 시작」 → 처음이면 프롤로그 → 안내서 → 첫 대국(도움말),
 * 프롤로그를 본 사람은 누르면 메뉴(이어하기 · 출하 + 승급 · 오늘의 출하 / 안내서 · 도감 · 프롤로그). 시험장 · 기록 보내기는 ?debug에서만 (D-286).
 */
const opening = (): void => {
  document.querySelector('.opening')?.remove();
  const m0 = readMeta(store);
  const el = document.createElement('div');
  el.className = 'opening';
  el.innerHTML = `<div class="op-bg"><i class="op-fog"></i><i class="op-glow"></i></div><h1 class="sr-only">Pawnisher : Checkmate</h1>
    <div class="op-logo">${crestHtml()}<p class="op-tag">${OPENING_TEXT.tagline}</p></div>
    <p class="op-press">${pressHtml(OPENING_TEXT.press)}</p><nav class="op-menu" hidden></nav>`;
  document.body.appendChild(el);
  document.body.classList.add('cover-op');
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
    track('app_open', { first: !m0.prologue, runs: m0.runs, elapsed_sec: Math.round((Date.now() - bootAt) / 1000) });
    sfx('submit');
    el.classList.add('busy');
    if (!m0.prologue) return void firstRun();
    openMenu();
  });
  /** 처음 온 사람: 프롤로그 → 첫 대국 (도움말 켜짐). 안내서는 건너뛴다 — 판이 직접 가르친다 (D-232, 보고서 3: 60초 안에 첫 조작). 안내서는 메뉴 · ? 에 남는다 */
  const firstRun = async (): Promise<void> => {
    await prologue(false, () => {
      writeMeta(store, { ...readMeta(store), prologue: true });
      return begin((Date.now() ^ 0x2f17) & 0xffffff, 0, null);
    });
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
    const dev = new URLSearchParams(location.search).has('debug');
    nav.innerHTML = `${sv ? `<button class="btn brass op-main" type="button" data-cont><b>이어하기</b><small>${sv.daily ? '오늘의 출하 · ' : ''}${sv.asc ? `승급 ${sv.asc} · ` : ''}${sv.actI + 1}막 · 분대 ${sv.squad.length} · 나사 ${sv.gold}</small></button>` : ''}
      <div class="op-run"><button class="btn ${sv ? '' : 'brass'} op-main" type="button" data-go><b>${sv ? '새 출하' : '출하 시작'}</b>${m.ascOpen ? `<small data-asc-line>${ascLine()}</small>` : ''}</button>${m.ascOpen ? `<div class="op-asc"><button class="btn sq" type="button" data-asc="1" aria-label="승급 높이기">▲</button><b data-asc-n>${level}</b><button class="btn sq" type="button" data-asc="-1" aria-label="승급 낮추기">▼</button></div>` : ''}</div>
      <button class="btn op-main op-daily" type="button" data-daily><b>오늘의 출하${doneToday ? ' ✓' : ''}</b></button>
      <div class="op-sub"><button class="btn" type="button" data-guide>안내서</button><button class="btn" type="button" data-ledger>도감</button><button class="btn" type="button" data-prologue>프롤로그</button></div>
      ${dev ? `<div class="op-sub op-dev"><button class="btn" type="button" data-lab-open>시험장</button><button class="btn" type="button" data-export>${PT.export}</button></div>` : ''}`;
    nav.querySelectorAll<HTMLElement>('[data-asc]').forEach((btn) =>
      btn.addEventListener('click', () => {
        level = Math.max(0, Math.min(m.ascOpen, level + Number(btn.dataset.asc)));
        nav.querySelector('[data-asc-line]')!.textContent = ascLine();
        nav.querySelector('[data-asc-n]')!.textContent = String(level);
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
    nav.querySelector('[data-lab-open]')?.addEventListener('click', labPick);
    nav.querySelector('[data-guide]')!.addEventListener('click', () => void guide(openOverlay).then(closeOverlay));
    nav.querySelector('[data-prologue]')!.addEventListener('click', () => void prologue(true));
    nav.querySelector('[data-export]')?.addEventListener('click', () => exportScreen(closeOverlay));
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
  document.body.classList.remove('cover-op');
  if (!el) return;
  // 컷신이 위를 덮고 있으면 걷는 연출 없이 바로 (보이지 않는 연출에 힘을 쓰지 않는다)
  if (document.body.classList.contains('cover-pl')) return el.remove();
  pxOut(el, () => el.remove(), 300);
};

startBattle(INTRO[0], true);
const qs = new URLSearchParams(location.search);
// 워밍업 로딩 (D-239): 그림 · 글꼴을 미리 받는 동안 부팅 화면의 황동 막대가 찬다 → 다 되면 걷고 타이틀
const bootBar = document.querySelector<HTMLElement>('#boot .boot-bar b');
void warmup((k) => bootBar && bootBar.style.setProperty('--k', String(Math.floor(k * 12)))).then(() => {
  const boot = document.getElementById('boot');
  if (boot) pxOut(boot, () => boot.remove(), 240);
  if (qs.has('lab')) labPick();
  else if (!qs.has('debug') || qs.has('opening')) opening();
});
if (new URLSearchParams(location.search).has('debug')) Object.assign(window as object, { slice: () => b, sliceApi: { begin: (s = 1) => begin(s, 0, null), endFlow: (a = 0, bosses: StoryBoss[] = ['plate', 'magnet', 'alarm']) => { asc = a; runBosses = bosses; void endingFlow(); }, pro: () => prologue(), credits: () => { void creditsScene(['P', 'N', 'B', 'R'], '출하 14번째 · 승급 13 · 2026-11-06'); return 0; }, finalAt: (a = 13) => { asc = a; runBosses = ['inspect', 'magnet', 'thorns']; startBattle(FINAL_BOSS(a), true); }, phase2: (r?: StoryBoss) => { if (r) runBosses = [r]; void gildedPhase2(); return 0; }, fallCut: (r: StoryBoss) => { void bossFallCut(r); return 0; }, allFaces: () => { openOverlay(`<div class="shop-grid">${(Object.keys(COMMANDS) as CommandId[]).filter((id) => !/[+~]$/.test(id)).map((id) => cardFace(id, `data-face="${id}"`, '<span class="price ptag"><i class="scr"></i>45</span>').replace('</span><small class="cf-desc"', `</span>${((h) => (h ? `<small class="fit-line ${h.tone}">${h.text}</small>` : ''))(fitHint('card', id))}<small class="cf-desc"`)).join('')}${(Object.keys(SLICE_PARTS) as SlicePartId[]).map((id) => partFace(id, `data-face="${id}"`, '<span class="price ptag"><i class="scr"></i>45</span>').replace('</span><small class="cf-desc"', `</span>${((h) => (h ? `<small class="fit-line ${h.tone}">${h.text}</small>` : ''))(fitHint('part', id))}<small class="cf-desc"`)).join('')}</div>`); return 0; }, defeat: () => runEnd(false), shadow: (a = 3) => playCuts([shadowCut(a)]), trueEnd: () => playCuts(trueEndingCuts(['N', 'P', 'B'].map((t, k) => ({ t: t as PieceType, side: 0 as const, x: 14 + k * 9, y: 66, h: 22 })))), endA: () => playCuts([ENDING_A]), promoCut: () => playCuts(promotionCuts(3, "먼지투성이", "폰은 킹 자리에 설 수 없다.", "").slice(-1)), bossOf: (rule: BossRule, act: 1 | 2 | 3 = 1) => startBattle(battleFor(act, 'boss', new Rng(7), 0, rule), true), bossIntroOf: (rule: BossRule, act: 1 | 2 | 3 = 1) => startBattle(battleFor(act, 'boss', new Rng(7), 0, rule)), final: () => startBattle(FINAL_BOSS(0)), finalForge: () => { forgeFinal = true; forgeScreen(); }, boardFx: (k: 'row' | 'thorns' | 'stamp') => renderer.debugFx(k), cardPieces, cardMoves, previewPlay, parts: (ids?: SlicePartId[]) => (ids ? (parts = ids) : parts), partPick: () => partPick("<h2>부품 하나</h2>", () => showMap()), screenOf: (pos: Pos) => renderer.screenOf(pos), lab: (m: 'A' | 'B') => startLab(m), stand: () => { sacLeft = 1; clutchLeft = 1; return lastStand(true); }, taunt: (c: TauntCue) => { tauntedNow = false; taunt(c, true); }, bet: () => { gold = 60; maybeBet(cur, true); }, finish: () => finish(), meet: () => { const n = nemeses()[0]; if (n) nemesisMeet(n); }, startLive: (act: 1 | 2 | 3) => startBattle(battleFor(act, 'battle', new Rng(act * 7))), intro: (act: 1 | 2 | 3, kind: 'battle' | 'check' | 'boss') => startBattle(battleFor(act, kind, new Rng(act * 7))), redraw: () => { renderer.setup(b.s); refresh(); }, startAt: (act: 1 | 2 | 3, kind: 'battle' | 'check' | 'boss') => startBattle(battleFor(act, kind, new Rng(act * 7)), true), tap: (pos: Pos) => onTap(pos), start: (i: number) => startBattle(i < 1 ? INTRO[i] : battleFor(1, i >= 4 ? 'boss' : i === 3 ? 'check' : 'battle', new Rng(i))), map: (r = 2) => { rowI = r; showMap(); }, shop: () => shopScreen(), event: (id: string) => eventScreen(id as never), seed: (n: number) => (R = new Rng(n)), hurt: (k = 0.6) => squad.forEach((u) => (u.hp = Math.round(crewMaxHp(u) * k))), forge: () => forgeScreen(), say: (t: PieceType) => crewSay(t, '먼지투성이'), kit: () => kitPick('<h2>핵심 부품</h2>', () => showMap()), enter: (k: string) => enterNode({ kind: k } as MapNode), crack: (i: number) => { squad[i] = { ...squad[i], cracked: true }; }, crew: () => crewView(), squad: () => squad, nextAct: () => { rowI = acts[actI].rows.length - 1; advance(); }, act: (i: number) => { actI = i; rowI = 1; showMap(); }, setAct: (i: number) => (actI = i), botMove: async (style: 'naive' | 'greedy' = 'greedy') => { if (busy || b.s.winner !== null) return 'busy'; const m = bestAction(b, style); if (!m) { await onEnd(); if ($('btn-end').classList.contains('warn')) await onEnd(); return 'end'; } const c = COMMANDS[b.hand[m.i]]; if (m.pieceId === undefined) { pickCard(m.i); return c.name; } await run(m.i, m.pieceId, m.to); return c.name; }, gold: (n: number) => (gold = n), doom: () => { const k = b.s.pieces.find((p) => p.side === 0 && p.type === 'K')!; const sq = dangerSquares(b).find((d) => !b.s.pieces.some((p) => p.x === d.x && p.y === d.y)); if (sq) Object.assign(k, { x: sq.x, y: sq.y }); k.hp = 1; k.shield = 0; b.rewinds = Math.max(1, b.rewinds); b.snap = JSON.stringify({ ...b, snap: '' }); renderer.setup(b.s); refresh(); return !!sq; }, end: (c: boolean) => runEnd(c), die: () => { b.falls.push({ ...(b.falls[0] ?? {}), pieceId: b.squadIds[1], turn: b.turn, by: '적 룩' } as never); return deathRites(); } } });
