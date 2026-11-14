import '../fonts.css';
import { GIANTS, type GiantType } from '../data/giants';
import { PROCESS } from '../data/process';
import { processTiles } from './process';
import { SET_TEXT, SPEED_METER } from '../data/hud';
import { bossAbilityText, enemyAbilityText, formAbilityText, giantAbilityText, markAbilityText, partAbilityText, partSummaryText } from '../data/ability-text';
import { FORM_IDS, FORMS, formKey } from '../data/forms';
import { abilityHtml, bindAbilities, partCardRuleHtml } from './ability';
import { claimOnce } from './once';
import { BUILD_TRIAL, BUILD_TEXT, type BuildTrialId, type BuildTrialCase } from '../data/build-trial';
import { createBuildAct, createBuildTrial } from './build-trial';
import { josa } from '../data/josa';
import { STALL_PRESS } from '../data/battle';
import { BOSS_EPITHET, BOSS_PHASE_TEXT, HUD_TEXT, MAP_TEXT, KEYWORDS, LIFE_TEXT, SCREEN_TEXT, SERVICE_CARDS, type TermGate } from '../data/hud';
import '../style.css';
import './slice.css';
import './card-layout.css';
// 키트(하나의 체계)는 마지막 — 옛 선택자보다 뒤 (D-391)
import './kit.css';
import './voice.css';
import './hud-rarity.css';
import { cardOffers, chooseBuildPart, firstShopParts, kitOffers } from './build-offers';
import { partStatuses, PART_STATE_LABEL, type PartStatus } from './part-state';
import { BAND_ZONE, band, dismissWin, bindPick, bindWinHost, btnHtml, btnRowHtml, clearPeeks, closeWin, coverArt, cutChromeHtml, typeCutPages, dropWinDismiss, fitSlots, infoPeek, openWin, pickScreen, placeScreen, setBandAnchor, slotsHtml, stateBand, type CutLine, type PickItem, type WinBtn } from './uikit';
import { sfx } from '../audio/sfx';
import { installPressFeedback } from '../ui/motion';
import { PACE } from '../data/motion';
/** 동작 줄이기 */
const calmNow = (): boolean => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
import { installPressy, installUiSprites, mountPart, nope, screwBurst, shutter, sparksAt, titleFx } from './uifx';
import { arcFly, flashScreen, shakeEl, installPixelAnimate, gradeReveal, buyFx, curtainRows, dealHand, discardHand, healFx, koBanner, modalIn, modalOut, pxOut, replay, rollNumber, shake, stampFx, sweep, tally, turnLabel, typeIn, typeSkip } from './fx3';
import { crestHtml, guide, playCuts, pressHtml, prologue } from './opening';
import { markTip, showTip, tipDue } from './loadtip';
import { cardTags, partTags, STYLE_NAMES, tags3Html } from './tags';
import { bodyHtml, bottomLines, descHtml, lineHtml, splitDesc, splitTwo } from './desc';
import { GUIDE_PAGES } from '../data/opening';
import { COACH_LINES, OPENING_TEXT } from '../data/opening';
import { ACT_CARD, BOSS_CARD, BOSS_STORY, BOSS_TAUNTS, DEFEAT, ENDING_A, GILDED_STORY, oneLine, promotionCuts, shadowCut, stageProg, trueEndingCuts, type StoryBoss } from '../data/script';
import { STARTER_CARDS, STARTER_PARTS, nextUnlocks, unlockCount } from '../data/unlocks';
import { START_SET_IDS, START_SETS, setOpen, type StartSetId } from '../data/start-sets';
import { creditsScene } from './credits';
import { companionScene } from '../data/companion-scenes';
import { CHAPTERS, CHALLENGE_START, STORY_COUNT, STORY_LAW, chapterLabel, runLabel, runIdentity, endingLabel, type RunMode, type StoryChapter, type EndingKind, type StoryPromise } from '../data/campaign';
import { promotionScene } from './promotion';
import { effectHtml, effectNumbers } from './effect-text';
import { pieceImg } from '../ui/sprites';
import { BoardRenderer, setBoardTopInset } from '../view/BoardRenderer';
import type { BoardModel } from '../game/controller';
import { PIECE_NAMES_KO, PIECE_STATS } from '../data/pieces';
import { findPiece, samePos, type FormId, type PieceType, type Pos } from '../engine';
import { cardFits, gradeOf, rollGrade, GRADE, baseOf, isRefined, isRusted, rustOnce, refineOnce, ECON, partSlotsAt, AXIS_NAMES, BOSS_NUM, BOSS_RULES, COMMANDS, FOE_MARKS, FOE_TRAITS, LAB, FORGE, KITS, SHOP, RECRUITS, RECRUIT_ODDS, rollRecruit, REWARD_COMMANDS, SLICE, START_DECK, START_SQUAD, type Axis, type BossRule, type CommandId } from './cards';
import { CHARM_NUM, CHARMS, PART_GRADE, PART_NUM, partFits, SLICE_PARTS, type SlicePartId } from './parts';

/** 색이 든 16칸 도트 아이콘 (D-182): 단색 마스크 대신 그림 그대로, 계단 확대 */
// 심장 톱니 그림은 public 경로라 문서 기준으로 푼다 (base './' — CSS 파일 안 상대 경로는 Vite가 묶으려 든다)
// (변수 속 url은 쓰이는 CSS 파일 기준으로 풀리므로 절대 주소로 넣는다)
document.documentElement.style.setProperty('--life-on', `url(${new URL('ui/icons16/life@16.png', document.baseURI).href})`);
document.documentElement.style.setProperty('--life-off', `url(${new URL('ui/icons16/life.crack@16.png', document.baseURI).href})`);
const iconArt = (key: string): string => `background:url(ui/icons16/${key}.png) center/contain no-repeat;-webkit-mask:none;mask:none;image-rendering:pixelated`;
/** 16px 칸용 (D-290: 아이콘이 32도트가 되면 반으로 줄인 그림을 따로 쓴다 — 브라우저 축소는 바깥선을 끊는다) */
const iconArtSmall = (key: string): string => iconArt(`${key}@16`);
import { CREW, DEATHS, QUIRKS, SCAR_DESC, crewLabel, makeCrew, type Crew, type LedgerEntry } from './crew';
import { CREW_VOICE, type CrewKind } from '../data/crew-voice';
import { CREW_BARK, WAGER_TEXT, EVENT_PONDER, FOE_PIECE_BARK, PAPER_KING_NAME, VOICE_TIMING, type FoePieceCue } from '../data/battle-voice';
import { p2Clear, p2Rise, p2Warn } from './phase2fx';
import { bark, clearVoices, installTouchMemory, isMono, mono, placeSub, setSubAnchor, subClass, subHtml, subtitle, type BarkAt, type VoiceSide } from './voice';
import { ASC_NUM, ASC_OMEN, ASCENSION, actOmen, battleFor, buildRun, DRILLS, ftueRetry, FINAL_BOSS, INTRO, MAP, NODE_DESC, NODE_ICONS, NODE_NAMES, type Act, type BattleDef, type MapNode } from './run';
import { choicePay, counterweight, SLICE_EVENTS, SLICE_EVENT_IDS, weighable, type EventState, type SliceEventChoice, type SliceEventId } from './events';
import { EVENT_BEAT, EVENT_FOCUS, EVENT_HINT, EVENT_SUM, EVENT_TALK, REFINE_TALK, type EventTalk } from '../data/event-talk';
import { runEventFx, type CardFx, type CrewFx } from './evstage';
import { clearScreen, type ClearMember } from './actclear';
import { EVENT_OUTCOME } from '../data/event-outcome';
import { bossIntro, type BossKey } from './bossintro';
import { recoverHeirloom, addNemesis, betterHighlight, BETS, dir, DIRECTOR, isCloseCall, settleBet, TAUNTS, type BetKind, type Highlight, type Nemesis, type TauntCue } from './director';
import { bestAction } from './bot';
import { PLAYTEST_TEXT as PT, SURVEY } from '../data/playtest';
import { IMPACT } from '../data/fx';
import { warmup } from './warmup';
import { TUT } from '../data/tutorial';
import { runTutorial, type TutStep } from './tutorial';
import { telemetryAll, telemetryClear, telemetrySession, telemetryStore, track as trackEvent } from './telemetry';
import { clearSave, dailySeed, defaultStore, readMeta, readSave, recordRun, todayKey, writeMeta, writeSave, type ActSnap, type PendingReward, type RunSave, restoreDeck, resumeAt } from './save';
import { BOSS_RISE_LABEL, stallInfo, braceLeft, livesMax, refillBrace, livesOf, rewindCost, growCrew, depthAt, REST, intentRows, type IntentKind, type IntentRow, chainAdd, foeDmg, promotedIn, clutchBoost, kingDoomed, sacrificeCandidates, sacrificeSwap, canPlay, crackOrScrap, mendSquad, crewMaxHp, fallenAfter, costOf, isInstant, cardMoves, cardPieces, chainMult, dangerSquares, endTurn, intentHits, liveIntents, newSliceBattle, overhaulSquad, playCard, previewPlay, restSquad, rewind, squadAfter, type SliceBattle, type Squad } from './battle';
import type { BattleState, BattleEvent } from '../engine';
import { shapeHtml } from './shape';
import { Rng } from '../engine/rng';

installPixelAnimate();

// 전투 HUD 구역 (D-208 F안 → 패스 4 D-396, 총괄 리뷰 3.9): 왼쪽 = 태엽 · 손패 · 덱 줄 / 가운데 = 상태 띠 + 판 / 오른쪽 = 턴 · 속전 · 적 의도 목록 · 되감기 + 턴 끝.
// 예전 비교 배치(?layout=a ~ e)는 지웠다 — 하나만 남긴다.
{
  document.body.classList.add('lay-f');
  // 판 열 위 48px = 상태 띠 자리 (토스트 · 턴 띠 · 경고가 판을 덮지 않는다)
  // 판 아래도 같은 높이를 비워 판을 세로 가운데에 (부관 안내 띠 자리 — 1.1.1 테스터: 판이 아래로 치우침)
  setBoardTopInset(BAND_ZONE, BAND_ZONE);
  const dr = document.createElement('div');
  dr.id = 'deckrow';
  dr.className = 'deckrow';
  document.getElementById('left')!.appendChild(dr);
  const right = document.getElementById('right')!;
  const top = document.createElement('div');
  top.className = 'gtop';
  top.append(document.getElementById('turn-label')!, document.getElementById('coins')!);
  // 가운데 움푹 칸: 머리(적의 수 · ? 48) → 반장 규칙 칩 → 적 의도 목록 → 연쇄 → 부품
  const mid = document.createElement('div');
  mid.className = 'rmid';
  const head = document.createElement('div');
  head.className = 'r-head';
  head.innerHTML = `<span class="r-lbl">${HUD_TEXT.intentHead}</span>`;
  head.appendChild(document.getElementById('btn-help')!);
  const intents = document.createElement('button');
  intents.type = 'button';
  intents.id = 'intents';
  intents.className = 'intents';
  intents.setAttribute('aria-label', HUD_TEXT.logOpen);
  const chain = document.createElement('p');
  chain.id = 'chain-now';
  chain.className = 'chain-now';
  chain.hidden = true;
  // 판돈 칩 (#12 · D-490): 걸었으면 반장 칩 자리 곁에 — 조건 · 진행이 대국 내내 보인다
  const betChip = document.createElement('div');
  betChip.id = 'bet-chip';
  betChip.className = 'bet-chip';
  betChip.hidden = true;
  mid.append(head, document.getElementById('boss')!, betChip, intents, chain, document.getElementById('parts')!);
  right.prepend(top);
  top.after(mid);
  right.querySelector('.rail-head')?.remove();
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
let runMode: RunMode = 'story';
let storyChapter: StoryChapter = 0;
let storyPromise: StoryPromise | undefined;
let storyBeats: number[] = [];
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

/** 판 칸 격자의 화면 사각형 (바크 · 자막 띠 자리) */
const gridRect = (): DOMRect | null => {
  if (!b || !$('board').offsetWidth) return null;
  const a = renderer.screenOf({ x: 0, y: 0 });
  const z = renderer.screenOf({ x: b.s.width - 1, y: b.s.height - 1 });
  const half = Math.abs(z.x - a.x) / Math.max(1, b.s.width - 1) / 2;
  return new DOMRect(a.x - half, z.y - half, z.x - a.x + half * 2, a.y - z.y + half * 2);
};
/** 기물 머리 위 바크 자리 (기물이 판에 없으면 null) */
const barkAtPiece = (id: number | undefined): BarkAt | null => {
  const p = id === undefined ? undefined : b?.s.pieces.find((q) => q.id === id && q.hp > 0);
  if (!p || document.body.classList.contains('between') || !$('overlay').hidden) return null;
  const c = renderer.screenOf(p);
  const g = gridRect();
  return { x: c.x, y: c.y, half: g ? g.width / b.s.width / 2 : 24 };
};
/** 이번 출하에서 이미 한 말 (같은 줄이 되풀이되지 않게 — 다 쓰면 다시 섞는다) */
const saidLines = new Set<string>();
const pickLine = (lines: string[]): string => {
  const fresh = lines.filter((l) => !saidLines.has(l));
  const pool = fresh.length ? fresh : lines;
  const line = pool[R.int(pool.length)];
  saidLines.add(line);
  return line;
};
/** 이번 대국에서 적 킹이 이미 한 상황 (상황마다 한 번) */
let cuesSaid = new Set<TauntCue>();
/** 합류 대사 (D-324): 새 분대원이 제 성격대로 한마디 — 판 위면 그 기물 머리 위 바크, 판 밖(보상 화면)이면 아래 자막 띠 (P-B D-490) */
const crewSay = (t: PieceType, name: string): void => {
  const lines = CREW_VOICE[t as CrewKind]?.join;
  if (!lines) return void toast(`${josa(name, '이')} 분대에 합류했습니다.`);
  const line = lines[R.int(lines.length)];
  sfx('rare');
  void subtitle({ face: `<img src="ui/hud/crew-${t}.png" alt="" onerror="this.outerHTML=this.dataset.fb" data-fb='${pieceImg(t, 0, 'small', 40).replace(/'/g, '&#39;')}'>`, who: `${name} — 합류`, side: 'ally', text: line });
};
/** 적 킹 · 반장 이름 · 편 (바크 이름표) */
const foeVoice = (): { name: string; side: VoiceSide; face: string } => (b?.boss ? { name: BOSS_RULES[b.bossRule].name, side: b.bossRule === 'gilded' ? 'gilded' : 'foe', face: `<img src="ui/hud/avatar-${b.bossRule ?? 'plate'}.png" alt="">` } : { name: '적 킹', side: 'foe', face: pieceImg('K', 1, 'small', 40) });
/**
 * 적 킹의 한 마디 (P-B D-490): 말하는 왕의 머리 위 바크. 보통 적 킹은 상황마다 한 번 · 대국마다 VOICE_TIMING.kingCap까지,
 * 반장은 셋까지(D-311 — 반장 말이 없는 상황은 건너뛴다). 확률로만 — 매 판 떠들지 않는다.
 */
const taunt = (cue: TauntCue, force = false): void => {
  if (labMode || !b || coachOn) return;
  if (b.boss ? tauntCount >= 3 : tauntCount >= VOICE_TIMING.kingCap) return;
  if (!force && cuesSaid.has(cue)) return;
  if (!force && R.next() > (b.boss && cue !== 'cheese' && cue !== 'gloat' ? 0.6 : DIRECTOR.taunt)) return;
  // 「비겁하다」는 드물게 (테스터: 「그건 반칙 아닌가?」가 너무 자주 나왔다) — 보통 적 킹은 DIRECTOR.cheeseGap 대국에 한 번
  if (!force && cue === 'cheese' && !b.boss) {
    if (battlesFought - lastCheese < DIRECTOR.cheeseGap) return;
    lastCheese = battlesFought;
  }
  const lines = b.boss ? (BOSS_TAUNTS as Partial<Record<string, Partial<Record<TauntCue, string[]>>>>)[b.bossRule ?? 'plate']?.[cue] ?? (b.bossRule ? undefined : TAUNTS[cue]) : TAUNTS[cue]; // 반장마다 제 말 (D-310)
  if (!lines?.length) return;
  const king = b.s.pieces.find((p) => p.side === 1 && p.type === 'K');
  const v = foeVoice();
  if (!bark({ at: () => barkAtPiece(king?.id), side: v.side, name: v.name, face: v.face, text: pickLine(lines), prio: 2, force })) return;
  tauntedNow = true;
  tauntCount += 1;
  cuesSaid.add(cue);
};
/** 적 기물 한 마디 (칭호 말버릇) — 확률로만, 적 킹 말보다 낮다 */
const foePieceSay = (cue: FoePieceCue, id?: number): void => {
  if (labMode || !b || coachOn || R.next() > VOICE_TIMING.pieceChance) return;
  const p = id !== undefined ? b.s.pieces.find((q) => q.id === id && q.hp > 0 && q.side === 1) : b.s.pieces.filter((q) => q.side === 1 && q.type !== 'K' && q.hp > 0)[0];
  const lines = p && p.type !== 'K' ? FOE_PIECE_BARK[p.type as CrewKind]?.[cue] : undefined;
  if (!p || !lines?.length) return;
  bark({ at: () => barkAtPiece(p.id), side: 'foe', name: `적 ${PIECE_NAMES_KO[p.type]}`, face: pieceImg(p.type, 1, 'small', 40), text: pickLine(lines), prio: 1 });
};
/** 우리 분대원 한 마디 (처치 · 맞음) — 확률로만 */
const crewBark = (cue: 'kill' | 'hurt', id: number): void => {
  if (labMode || !b || coachOn || R.next() > VOICE_TIMING.pieceChance) return;
  const p = b.s.pieces.find((q) => q.id === id && q.side === 0 && q.hp > 0);
  const lines = p && p.type !== 'K' ? CREW_BARK[p.type as CrewKind]?.[cue] : undefined;
  if (!p || !lines?.length) return;
  const u = squad[b.squadIds.indexOf(p.id)];
  bark({ at: () => barkAtPiece(p.id), side: 'ally', name: u?.name ?? PIECE_NAMES_KO[p.type], face: pieceImg(p.type, 0, 'small', 40), text: pickLine(lines), prio: 1 });
};
/** 반장 · 도금왕의 이야기 한 줄 — 판 아래 자막 띠 + 초상 (2단계 · 이야기 순간) */
const foeStory = (line: string): Promise<void> => {
  const v = foeVoice();
  return subtitle({ face: v.face, who: v.name, side: v.side, text: line });
};
/** 이번 출하에서 치른 대국 수 · 마지막으로 「비겁하다」를 들은 대국 */
let battlesFought = 0;
let lastCheese = -99;
let actI = 0;
let rowI = 0;
/** 지금 치르는 대국 */
let cur: BattleDef = INTRO[0];
/** 이번 출하의 시작 세트 (D-485) */
let startSet: StartSetId = 'standard';
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
/** 이번 출하에서 쇳물 서약으로 녹인 동료 (D-465 — 결말이 부른다) */
let meltedRun: string[] = [];
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
/** 장면·팝업 뒤의 Phaser 입력이 전투 정보를 다시 열지 않게 한다. */
const battleInputActive = (): boolean => !busy && !enemyTurn && $('overlay').hidden && !document.body.classList.contains('between') && !document.body.classList.contains('cover-pl') && !$('board').closest('[inert]') && !document.querySelector('.bossfx,.clr');

const renderer = new BoardRenderer(
  $('board'),
  {
    tap: (pos) => void onTap(pos),
    hover: () => {},
    longPress: (pos) => { if (battleInputActive() && !movePeek(pos)) pieceInfo(pos); },
    // 손을 떼도 엿보기는 남는다 — 아무 데나 누르면 닫힌다 (보고서 3.8 `.peek`)
    longPressEnd: () => undefined,
  },
  // 판 위 상황 알림 (붕락 · 과열 · 항복)은 상태 띠로 (D-193 알림 위계 ① 상황 · D-396 한 자리)
  (text) => band(text, 'crimson'),
);
/** 판 칸 바깥 폭 (판 왼쪽 끝 · 오른쪽 끝에서 화면 끝까지) — 엿보기가 판 칸을 덮지 않게 */
const offBoardW = (side: 'left' | 'right'): number => {
  const a = renderer.screenOf({ x: 0, y: 0 });
  const z = renderer.screenOf({ x: b.s.width - 1, y: 0 });
  const half = (z.x - a.x) / Math.max(1, b.s.width - 1) / 2;
  return side === 'left' ? a.x - half - 8 : innerWidth - (z.x + half) - 8;
};
/** 선택한 수의 실제 계산을 복제 상태에서 보여 준다. 길게 누른 손을 떼어도 실행하지 않는다. */
const movePeek = (pos: Pos): boolean => {
  if (busy || selCard === null || selPiece === null || !destinations().some((p) => samePos(p, pos))) return false;
  const back = JSON.parse(JSON.stringify(b)) as SliceBattle;
  const result = playCard(back, selCard, selPiece, pos);
  if (typeof result === 'string') return false;
  const me = findPiece(b.s, selPiece)!;
  const after = findPiece(back.s, selPiece);
  const hits = result.events.flatMap((e) => e.type === 'attack' && e.attackerId === selPiece ? e.hits : []).filter((h) => b.s.pieces.some((p) => p.id === h.targetId && p.side === 1));
  const side = offBoardW('right') >= offBoardW('left') ? 'right' : 'left';
  const shown = hits.length > 2 ? 1 : 2;
  const damage = hits.slice(0, shown).map((h) => `<p>적 ${PIECE_NAMES_KO[findPiece(b.s, h.targetId)!.type]} · 피해 ${h.damage} · HP ${findPiece(back.s, h.targetId)?.hp ?? 0}</p>`).join('');
  infoPeek({ cls: 'move-preview', key: `move:${selCard}:${selPiece}:${pos.x}:${pos.y}`, side, maxW: Math.max(148, Math.floor(offBoardW(side))), head: `<p class="lead">${BUILD_TEXT.preview}</p>`, body: `<p>태엽 ${b.ap} → ${back.ap}</p><p>방열판 ${me.shield} → ${after?.shield ?? 0}</p>${damage || '<p>공격 대상 없음</p>'}${hits.length > 2 ? `<p>그 밖에 ${hits.length - shown}기 피격</p>` : ''}` });
  return true;
};
/**
 * 기물 정보 엿보기 (길게 누름, 패스 4 D-396): 비모달 S 창 — 내 편이면 분대원 카드를 왼쪽 레일 위에, 적이면 이름 · 수치 · 특성을 오른쪽 레일 위에.
 * 원본 능력치 판 네 칸을 S 정보판으로 표시한다. 아무 데나 누르면 닫힌다.
 * (?debug sliceApi.peekAt(pos)가 같은 길로 연다 — Phaser 길게 누름은 자동 조작이 닿지 않는다)
 */
const pieceInfo = (pos: Pos): void => {
  if (!battleInputActive()) return;
  const p = b.s.pieces.find((q) => q.x === pos.x && q.y === pos.y);
  if (!p) return;
  const ci = b.squadIds.indexOf(p.id);
  const c = ci >= 0 ? squad[ci] : null;
  const key = `piece:${b.turn}:${b.bossRule}:${b.alarm ?? 0}:${p.id}:${p.hp}:${p.shield}:${p.atk}:${p.def}`;
  if (c) {
    const el = infoPeek({ key, side: 'left', bare: true, head: '', body: crewInfoCard(c, { atk: p.atk, hp: p.hp, max: p.maxHp, shield: p.shield, lives: (b.s.doorIds ?? []).filter((x) => x === p.id).length, kills: Object.values(b.pk[p.id] ?? {}).reduce((a, n) => a + (n ?? 0), 0), dmg: b.pd?.[p.id] ?? 0 }) });
    el.querySelectorAll<HTMLElement>('.cf').forEach(fitCardDesc);
    return;
  }
  const side = p.side === 0 ? 'left' : 'right';
  const maxW = offBoardW(side);
  const expanded = maxW < 352;
  // 이형 (D-481): 행마 · 공격 규칙을 맨 앞 장으로 — 적으로 처음 만날 때 여기서 배운다
  const abilities = [...(p.giant ? giantAbilityText(p.type as GiantType) : []), ...(p.form ? [formAbilityText(p.form)] : []), ...(p.side !== 1 ? [] : p.type === 'K' && b.boss ? bossAbilityText(b.bossRule, b.alarm, (n) => foeDmg(n, b)) : [...enemyAbilityText(p.type, b.traits ?? [], (n) => foeDmg(n, b)), ...(b.marks ?? []).map(markAbilityText)])];
  const hpPct = Math.max(0, Math.min(100, Math.round(p.hp / p.maxHp * 100)));
  const el = infoPeek({
    cls: `unit-peek${expanded ? ' unit-peek-expanded' : ''}${p.side === 0 ? ' unit-ally' : ''}`,
    key,
    side,
    maxW: expanded ? 352 : Math.min(352, maxW),
    head: `<div class="${expanded ? 'unit-portrait' : 'frame-portrait'}">${pieceImg(p.type, p.side, 'small', 48, p.giant ? 'giant' : p.form)}</div><div class="unit-ident"><span>${p.side === 1 ? '적 기물' : '지원 기물'}${p.form ? ` · 이형(${PIECE_NAMES_KO[p.type]} 카드)` : ''}${p.elite ? ' · 정예' : ''}${p.side === 1 ? ` · ${((k) => (k >= 0 ? `${k + 1}번째로 움직임` : '대기'))(liveIntents(b).findIndex((it) => it.pieceId === p.id))}` : ''}</span><p class="lead">${p.giant ? GIANTS[p.type as GiantType].name : p.form ? FORMS[p.form].name : PIECE_NAMES_KO[p.type]}</p></div>`,
    body: `<div class="unit-stats"><div class="unit-life inset"><div class="unit-life-line"><span>체력</span><strong>${p.hp}<small> / ${p.maxHp}</small></strong></div><div class="unit-hp-track"><div class="er-hp"><i class="er-fill" style="width:${hpPct}%"></i></div></div></div><div class="unit-shield inset"><span>방열판</span><strong>${p.shield}</strong></div><div class="unit-attack inset"><span>공격력</span><strong>${p.atk}</strong></div><div class="unit-defense inset"><span>방어력</span><strong>${p.def}</strong></div></div>${abilities.length ? `<div class="unit-traits">${abilityHtml(abilities)}</div>` : ''}`,
  });
  bindAbilities(el, abilities);
};
installPressFeedback();
installUiSprites();
installPressy();
// 키트 창은 #overlay에 뜬다 — 등장 m3in · 퇴장 디더는 openOverlay · closeOverlay 그대로 (D-391)
bindWinHost({ open: (html, cls) => openOverlay(html, cls), close: () => closeOverlay() });
// 상태 띠 자리 (보고서 3.8): 전투 HUD가 보이면 판 열 맨 위 48px, 그 밖(창 · 장소 · 지도)은 화면 위 가운데
setBandAnchor(() => (document.body.classList.contains('between') || !$('overlay').hidden || !$('board').offsetWidth ? null : $('board').getBoundingClientRect()));
// 자막 띠 자리 (P-B D-490): 전투 중이면 판 열(가로 = 판 칸 격자 · 세로 = 판 열 위아래 예약 자리), 그 밖은 화면 아래 가운데
setSubAnchor(() => {
  if (document.body.classList.contains('between') || !$('board').offsetWidth || !b) return null;
  // 판 열 전체 폭 (레일 · 턴 끝 단추를 덮지 않게 — 667 폭에서는 줄이 늘어 띠가 세로로 큰다)
  return $('board').getBoundingClientRect();
});
installTouchMemory();
/**
 * 부품 견본 (?debug sliceApi.kitSheet(쪽)): 받은 부품을 키트 클래스로 한 화면에 — 915×412 촬영 검수용 (D-391 패스 0).
 * 1쪽 = 단추 4재질 × 보통/눌림/꺼짐 · 선택지 4상태 · 꼬리표 · 지갑 · 정보 · 구분 줄 · 움푹 칸, 2쪽 = 액자 · 받침 · 토스트 · 띠 · 종이.
 */
const kitSheet = (page = 1): number => {
  document.querySelector('.kit-sheet')?.remove();
  const el = document.createElement('div');
  el.className = 'kit kit-sheet';
  const kinds: WinBtn['kind'][] = ['brass', 'iron', 'crimson', 'teal'];
  el.innerHTML =
    page === 1
      ? `<div class="ks-grid">${kinds.map((k) => `<div class="ks-row"><span class="note">${k}</span>${btnHtml({ label: '고른다', kind: k })}<button type="button" class="btn k-${k} down">눌림</button>${btnHtml({ label: '꺼짐', kind: k, disabled: true })}</div>`).join('')}</div>
        <div class="ks-col"><button type="button" class="choice"><span class="choice-name">보통 선택지</span><span class="choice-res">결과 한 줄 <span class="up">+20</span></span></button><button type="button" class="choice down"><span class="choice-name">눌림</span><span class="choice-res">1도트 아래</span></button><button type="button" class="choice is-sel"><span class="choice-name">고름</span><span class="choice-res">청록 테</span><i class="btn-info" role="button"></i></button><button type="button" class="choice" disabled><span class="choice-name">꺼짐</span><span class="choice-res">나사 40 필요</span></button></div>
        <div class="ks-col"><div class="ks-row"><span class="tag">나사 45</span><span class="tag tag-crimson">실패 시 −10</span></div><div class="ks-row"><span class="wallet">150</span><i class="btn-info" role="button"></i></div><div class="divider"></div><div class="inset"><p>움푹 칸 — 대사 · 목록 · 입력.</p></div><div class="ks-row"><div class="plate">명패 열두 자</div></div></div>`
      : `<div class="ks-row"><div class="frame-portrait"><img src="scenes/boss-gilded.png" alt=""></div><div class="frame-portrait f96"><img src="scenes/boss-gilded.png" alt=""></div><div class="frame-portrait f64">${pieceImg('N', 0, 'large', 32)}</div><div class="frame-scene" style="width:352px;height:264px"><img class="fs-plate" src="${new URL('../assets/ui/chrome/v2/scene-frame-plate.png', import.meta.url).href}" alt=""><img src="scenes/bg-forge.png" alt=""></div><div class="card-slot is-sel"></div></div>
        <div class="ks-row"><span class="state-band k-toast">${pieceImg('P', 0, 'small', 24)}<span>토스트 한 줄 스무 자 안</span></span></div>`;
  el.addEventListener('click', () => el.remove());
  document.body.appendChild(el);
  return 0;
};

/**
 * 짧은 상태 한 줄 (D-385 · D-396): 상태 띠 한 자리에 줄 선다 — 턴 띠 · 경고와 겹치지 않는다.
 * 읽을 시간: 글자당 70ms + 1.2초보다 짧게 두지 않는다 (D-263).
 */
const toast = (msg: string, ms = 1800): void => (isMono(msg) ? mono(msg) : stateBand(msg, 'toast', { ms: Math.max(ms, 1200 + msg.length * 70) }));

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
    proc: processTiles(b),
    intent: b.s.winner === null && !busy ? { state: b.s, plan: liveIntents(b), hits: intentHits(b) } : null,
  };
};

// ---------- 레일 ----------
/**
 * 손패 한 장 = 선택지 판 한 줄 (D-209 탄창 → 패스 4 D-396 키트): 황동 탭 = 태엽 비용 · 그림 · 이름 · 효과 한 줄(12px).
 * 누르면 펼쳐 전체 문장 · 행마 그림 · 각주 (펼친 판 한 번 더 = 쓴다). 못 쓰면 효과 줄 자리에 이유.
 */
const cardHtml = (id: CommandId, i: number): string => {
  const c = COMMANDS[id];
  const costs = isInstant(id) ? [costOf(b, i)] : b.s.pieces.filter((p) => p.side === 0 && (c.who === 'any' || c.who === p.type)).map((p) => costOf(b, i, p.id));
  const cost = costs.length ? Math.min(...costs) : c.cost;
  const ok = canPlay(b, i);
  const poor = !ok && cost > b.ap;
  const off = !ok || busy;
  const why = busy ? '' : poor ? `태엽 ${cost} 필요` : !ok ? (c.kind === 'march' ? '앞으로 갈 폰 없음' : c.kind === 'spend' ? '쌓인 연쇄 없음' : c.kind === 'draft' ? '킹 곁에 빈 칸 없음' : c.kind === 'gambit' ? '바칠 폰 없음' : c.kind === 'swap' ? '캐슬링할 룩 없음' : '움직일 기물 없음') : '';
  const open = openCard === i || selCard === i;
  const shape = c.who !== 'any' && c.kind === 'move' ? `<span class="hc-shape">${shapeHtml(c.who, 7)}</span>` : '';
  const desc = c.desc ? `<p class="hc-desc">${descHtml(c.desc)}</p>` : '';
  // 기본 행마 카드: 머리 = 칭호(작은 개척자), 몸 = 실제로 하는 일 — 사용자 지적 D-211
  const titled = !!c.title;
  const flv = c.flavor && !titled ? `<p class="hc-flv">${c.flavor}</p>` : '';
  const hint = off ? `<p class="hc-use">${why || '지금은 쓸 수 없음'}</p>` : isInstant(id) && selCard !== i ? '<p class="hc-use">한 번 더 누르면 사용</p>' : '';
  // 효과 한 줄 (보고서 2-2 「손패에 효과 글」): 성능 문장의 첫 마디만 — 전체는 펼침 · 크게 보기에
  const fx = why || (c.desc ? handFx(c.desc) : '');
  return `<button type="button" class="hc t-${c.who}${selCard === i ? ' armed' : ''}${open ? ' open' : ''}${off ? ' off' : ''}${cost < c.cost ? ' cheap' : ''}" data-card="${i}" ${off ? 'aria-disabled="true"' : ''} aria-expanded="${open}">
    <span class="hc-head">${keysHtml(cost, b.ap)}${cardArt(id)}<span class="hc-t"><b>${titled ? c.title : c.name}</b>${fx ? `<small class="hc-fx">${fx}</small>` : ''}</span></span>${open ? `<span class="hc-body">${shape}<span class="hc-txt">${desc}${flv}${hint}</span></span>` : ''}</button>`;
};

/**
 * 카드 크게 보기 (D-166, 슬더스식): 손패를 길게 누르거나(터치) 마우스를 올리면 카드 모양으로 전체 효과.
 * 손패는 이름 · 비용 · 수치만 짧게, 자세한 문장 · 각주 · 띠 이름은 여기서.
 */
/** 손패 크게 보기 (D-379, 사용자: 「전투 손패는 기본 유지, 설명 팝업은 지금 카드로」): 정본 카드 그대로 — 지금 비용만 톱니에 */
const peekHtml = (id: CommandId, cost: number): string =>
  cardFace(id, 'tabindex="-1"').replace(/(<b class="cf-cost[^"]*" aria-label="태엽 )\d+(">)\d+(<\/b>)/, `$1${cost}$2${cost}$3`);
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
  // 손패 레일 오른쪽 옆, 세로는 그 카드 가운데 (판 왼쪽 빈칸 위 — 보고서 2-2 카드 크게 보기 A−)
  peekEl.style.left = `${Math.round(r.right + 8)}px`;
  peekEl.style.top = `${Math.round(Math.max(8, Math.min(window.innerHeight - h - 8, r.top + r.height / 2 - h / 2)))}px`;
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

/** 손패 효과 한 줄 (D-336 성능만 → D-396 첫 마디만): 「피해 ×1.6 · 대각선 절반 피해」 → 「피해 ×1.6」. 전체는 펼침 · 크게 보기에 */
const handFx = (d: string): string => (splitDesc(d).fx || d).split(' · ')[0];

/** 지금 분대로 쓸 수 있는 카드인가 (D-164): 그 기물이 분대에 있어야 보상 · 상자에 나온다. 폰 전용 즉시 카드(총진격 · 제물)도 폰이 있어야 */
const usable = (id: CommandId): boolean => {
  return cardFits(id, squad.map((u) => u.t));
};

/**
 * 카드 설명 줄 나누기 (2026-11-05, 사용자: 「온점 단위는 엔터, 괄호는 한 줄 먹게, 최대 4줄」):
 * 문장(…다.)마다 한 줄, 괄호 묶음 (…)은 따로 한 줄. 줄 안에서는 수치가 끊기지 않게 낱말 단위로만 접힌다.
 */
/** 설명 문단 (D-333): 묘사 · (기능) · 조건 — 모든 카드 · 부품 · 선택지가 같은 문법 */
const descLines = (text: string, flavor?: string): string => descHtml(text, flavor);
/** 가격표가 붙는 카드(고물상)는 성질 칩(+ · × · 축)을 가격 옆에 — 가격은 카드 한가운데, 칩은 그 오른쪽에 매달린다 */
const footed = (extra: string, attrs = ''): boolean => extra.includes('class="price') || attrs.includes('data-pick');
const cfFoot = (price: string, chips: string): string => `<span class="cf-foot">${price}${chips ? `<span class="cf-chips">${chips}</span>` : ''}</span>`;

/** 부품 칩 (레일 · 고르기 화면) */
/**
 * 카드 얼굴 (D-217 3): 보상 · 고물상이 모두 이것 — 등급 틀(일반 철 · 희귀 청강 · 황금 황동, 황금은 테를 도는 불빛) ·
 * 머리띠 이름 · 그림 창(체크무늬) · 성질 줄(+/× · 축) · 설명 · 등급 보석. attrs = data-* , extra = 가격표 등 꼬리.
 */
const cardFace = (id: CommandId, attrs: string, extra = '', cls = ''): string => {
  const c = COMMANDS[id];
  const g = gradeOf(id);
  // 세 칸 태그 (D-325): 누가 · 어떤 · 합/곱/규칙 — 모든 카드 같은 자리(그림 창 아래)
  // D-367 카드 틀: 비용 = 톱니 메달 숫자 · 그림 = 분대원 초상(공용은 아이콘) · 종류 판 = 누가 · 어떤 · 합/곱
  const art = c.who === 'any' ? cardArt(id) : `<img class="cf-face" src="ui/hud/crew-${c.who}.png" alt="">`;
  return `<button type="button" class="cf cmd big t-${c.who} g-${g}${c.axis ? ` ax-${c.axis}` : ''}${cls ? ` ${cls}` : ''}" data-grade="${g}" ${attrs}><b class="cf-cost${c.cost === 1 ? ' c1' : ''}" aria-label="태엽 ${c.cost}">${c.cost}</b><b class="cf-name">${c.name}</b><span class="cf-win">${art}</span><span class="cf-type">${tags3Html(cardTags(id))}</span><small class="cf-desc">${descLines(c.desc || '')}</small><i class="cf-gem" aria-label="${GRADE.names[g]}"></i>${footed(extra, attrs) ? cfFoot(extra, '') : extra}</button>`;
};
/**
 * 분대원 카드 (D-362, 사용자: 「기물도 하나하나의 카드가 되는 거지」): 카드 · 부품과 같은 틀 —
 * 이름(별칭) · 그림 창(기물) · 태그(기물 · 버팀 · 심장 톱니) · HP 막대. 사건 결과 오버레이가 카드와 같은 연출을 건다.
 */
const crewFace = (u: Crew, hp: number, max: number, src?: string): string => crewCard(u, { hp, max }, src);
/**
 * 분대원 정보 카드 (D-363, 사용자: 「판에서 꾹 눌렀을 때도 저 초상 — 전투력 · 처치 이력 · 누적 피해까지」).
 * 카드와 같은 틀에 기록 칸을 더한다: 공격 · HP · 버팀 / 처치 · 누적 피해 · 죽음 넘김 · 대국 / 기벽 · 흉터.
 * live = 지금 대국의 기물(공격 · HP · 방열판 · 남은 버팀 · 이번 대국 처치/피해).
 */
const crewInfoCard = (u: Crew, live?: { atk: number; hp: number; max: number; shield: number; lives: number; kills: number; dmg: number }): string => crewCard(u, live ?? { hp: u.hp ?? crewMaxHp(u), max: crewMaxHp(u) }, undefined, 'crew-info');
/**
 * 분대원 카드 (D-367 틀 · D-363 기록): 리본 이름 · 초상 창 · 공격 마름모 · HP 압력계 · 버팀 하트(초상 오른쪽 위) · 두루마리에 기록과 특성.
 * 사건 결과 오버레이 · 판 길게 누름 · 분대 화면이 모두 이 카드.
 */
const crewCard = (u: Crew, o: { hp: number; max: number; atk?: number; shield?: number; lives?: number; kills?: number; dmg?: number; say?: string }, src?: string, cls = ''): string => {
  const g = u.form ? 'gold' : RECRUIT_ODDS[u.t]?.grade ?? 'common';
  const q = u.quirk ? QUIRKS[u.quirk] : null;
  // 이형 분대원: 전용 초상(PT-08)을 받기 전까지 발주 기물 그림(P-01~05) — 바탕 기물 초상으로는 이형이 안 보인다
  const art = src ?? (u.form ? `pieces/l-${u.form}0.png` : `ui/hud/crew-${u.t}.png`);
  const atk = o.atk ?? Math.round(PIECE_STATS[u.t].atk * (q?.atk ?? 1) * (u.form ? FORMS[u.form].atk : 1)) + (u.temper ?? 0);
  // 버팀 (#24 · D-488 → 2026-11-14 옛 생명): 대국과 같은 계산 하나 — 맹세(폰 +1) · 킹 버팀까지. 자리 = 다 찬 수, 켜진 하트 = 남은 수(대국 중이면 o.lives) — 쓴 것은 깨진 하트
  const total = livesMax(u, parts);
  const lives = o.lives ?? livesOf(u, parts);
  const pct = `${Math.max(0, Math.min(100, Math.round((o.hp / o.max) * 100)))}%`;
  const kills = (u.kills ?? 0) + (o.kills ?? 0), dmg = (u.dmg ?? 0) + Math.round(o.dmg ?? 0);
  // 버팀 자리 (D-377 → D-488): 하트 수 = 실제 버팀 수 (예전엔 늘 둘 이상이라 생명 0이 「빈 하트 둘」로 읽혔다). 대국 중 쓴 것만 깨진 하트
  const hearts = Array.from({ length: Math.max(total, lives) }, (_, k) => `<i class="cb-life${k < lives ? '' : ' off'}"></i>`).join('');
  // 본문 (D-377): 위 칸 = 기록(이름 · 숫자) 또는 첫마디 2줄 · 아래 칸 = 특성 이름 / 효과 · 효과 (또는 조건 / 효과) 한 줄씩
  const top = o.say ? splitTwo(o.say).map((x) => lineHtml(x)) : [`<span class="cs-st"><span><i>처치</i>${kills}</span><span><i>피해</i>${dmg}</span><span><i title="버팀을 써서 죽음을 넘긴 횟수">넘김</i>${u.defied ?? 0}</span></span>`];
  // 이형 분대원 (D-481): 이름 · 움직임 · 공격 — 행마가 다르니 무엇보다 먼저
  const bot = u.form
    ? [lineHtml(`이형 · ${FORMS[u.form].name}`, 'name'), lineHtml(FORMS[u.form].move, 'if'), lineHtml(FORMS[u.form].hit, 'say')]
    : q
    ? [lineHtml(q.name, 'name'), ...bottomLines('', q.desc).slice(0, 2).map((l) => lineHtml(l.t, l.k === 'fx' ? 'say' : 'if'))]
    : u.t === 'K'
      ? [lineHtml('분대의 심장', 'name'), lineHtml('쓰러지면 끝')]
      : u.scars?.length
        ? [lineHtml(`흉터 · ${u.scars[0]}`, 'name'), ...splitTwo(SCAR_DESC[u.scars[0]] ?? '').map((x) => lineHtml(x))]
        : [];
  return `<div class="cf crew-card g-${g}${cls ? ` ${cls}` : ''}" data-grade="${g}" aria-hidden="true"><b class="cf-name">${u.name ?? '이름 없음'}</b>`
    + `<span class="cf-win"><span class="er-pc"><img src="${art}" alt=""></span></span>`
    + `<b class="cb cb-atk${atk >= 100 ? ' n3' : ''}">${atk}</b><b class="cb cb-hp${Math.round(o.hp) >= 100 ? ' n3' : ''}"><span class="er-hpn">${Math.round(o.hp)}</span></b><span class="cb-lives">${hearts}</span>`
    + `<span class="cb-bar"><span class="er-hp"><i class="er-ghost" style="width:${pct}"></i><i class="er-fill" style="width:${pct}"></i></span></span>`
    + `<small class="cf-desc">${bodyHtml(top, bot)}`
    + `</small><i class="cf-gem"></i></div>`;
};
/** 영입 카드 (D-375): 분대원 카드 그대로 — 두루마리엔 첫마디 · 기벽. 함께 오는 카드는 받침 아래 줄(withCards) */
const recruitFace = (u: Crew, line: string): string => crewCard(u, { hp: crewMaxHp(u), max: crewMaxHp(u), say: line.replace(/\.?$/, '.') });
/** 받침 아래 줄: 함께 오는 카드 이름 (12px) */
/** 함께 오는 카드 한 장의 요지 — 설명 끝 괄호 수치(「(킹 방열판 +22)」), 없으면 설명 전체 (1.1.1 테스터: 함께 오는 카드 설명이 전혀 없다) */
const cardGist = (id: CommandId): string => {
  const d = COMMANDS[id].desc;
  const m = d.match(/\(([^()]+)\)\s*$/);
  return `<b>${COMMANDS[id].name}</b> ${m ? m[1] : d}`;
};
const withCards = (ids: CommandId[], lead = ''): string => `<span>${lead ? `<b class="good">${lead}</b> ` : ''}+ ${ids.map((id) => `<b>${COMMANDS[id].name}</b>`).join(' · ')}</span>`;
/** 받침 아래 줄: 덱 맞물림 (fitHint) */
const fitInfo = (kind: 'card' | 'part', id: string): string => {
  const h = fitHint(kind, id);
  // 좁은 받침에서는 가운뎃점에서만 줄을 바꾼다 (「덱 나이트 2」 · 「연쇄 0」이 끊기지 않게)
  return h ? `<span class="${h.tone}">${h.text.split(' · ').map((x) => x.replace(/ /g, '&nbsp;')).join(' · ')}</span>` : '';
};
/** 손질 카드 갈래 (D-399) */
type SvcKey = 'heal' | 'repair' | 'refine' | 'remove' | 'brace';
/**
 * 손질 카드 얼굴 (D-399): 고물상 · 작업대의 서비스도 카드와 같은 크기 · 같은 틀 — 상아 틀(svc-ivory) · 이름 리본 · 아이콘 창 ·
 * 「손질」 띠 · 두루마리(묘사 / 대상 / 효과). n = 수치(정비 · 수리 %, 보강 버팀). 명령 카드와 색 갈래로 구별한다.
 */
const svcFace = (k: SvcKey, n = 0): string => {
  const d = SERVICE_CARDS[k];
  return `<div class="cf part-card svc svc-card" data-grade="common"><b class="cf-name">${d.name}</b><span class="cf-win"><i class="ico" style="${iconArt(d.icon)}"></i></span><span class="cf-type"><span class="t3"><i>${SERVICE_CARDS.kind}</i></span></span><small class="cf-desc">${descLines(d.desc(n))}</small></div>`;
};
/** 손질 카드 풀이 한 줄 (단추 줄 가운데, ⑦ 결과 요약): 「정비 — 분대 전원 HP +25%」 */
const svcLine = (k: SvcKey, n = 0): string => {
  const d = splitDesc(SERVICE_CARDS[k].desc(n));
  return `${SERVICE_CARDS[k].name} — ${[d.cond, d.fx].filter(Boolean).join(' ')}`;
};
/** 부품 얼굴 (D-217 3): 카드 얼굴과 같은 틀 · 같은 자리 */
const partFace = (id: SlicePartId, attrs: string, extra = '', cls = ''): string => {
  const d = SLICE_PARTS[id];
  const g = PART_GRADE[id] ?? 'common';
  return `<button type="button" class="cf part-card g-${g}${d.axis ? ` ax-${d.axis}` : ''}${cls ? ` ${cls}` : ''}" data-grade="${g}" aria-label="${d.name}" title="${d.name}" data-part-id="${id}" ${attrs}><b class="cf-name">${d.shortName ?? d.name}</b><span class="cf-win"><i class="ico" style="${iconArt(d.icon)}"></i></span><span class="cf-type">${tags3Html(partTags(id))}</span><small class="cf-desc">${partCardRuleHtml(id)}</small><i class="cf-gem" aria-label="${GRADE.names[g]}"></i>${footed(extra) ? cfFoot(extra, '') : extra}</button>`;
};

const partHtml = (id: SlicePartId, big = false, status?: PartStatus): string => {
  const d = SLICE_PARTS[id];
  const state = status ? `<img class="part-state" src="ui/part-state/${status.state}.png" alt="${PART_STATE_LABEL[status.state]}" data-part-state="${status.state}">` : '';
  return big
    ? partFace(id, `data-part="${id}"`)
    : `<button type="button" class="part-chip${d.axis ? ` ax-${d.axis}` : ''}" data-part-info="${id}" aria-label="${d.name}${status ? ` · ${PART_STATE_LABEL[status.state]} · ${status.detail}` : ''}"><i class="ico" style="${iconArt(d.icon)}"></i><span>${d.name}</span>${state}</button>`;
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
/** 기록 엿보기 (적의 수 목록을 누르면, 보고서 3.9): 최근 수 일곱 줄 — 턴 · 누가 → 누구 −피해 */
const logPeek = (): void => {
  let rows = '';
  let head = '';
  for (const r of [...blog].reverse().slice(0, 7)) {
    const h = `${r.turn}턴 · ${r.side ? '적' : '나'}`;
    if (h !== head) rows += `<p class="log-turn">${(head = h)}</p>`;
    rows += `<div class="log-row${r.side ? ' foe' : ''}">${r.by ? pieceImg(r.by, r.side, 'small', 20) : `<span>${r.label ?? ''}</span>`}<span>→</span>${r.hits.map((h) => `${pieceImg(h.t, h.side, 'small', 20)}<em>${h.killed ? '×' : `−${h.dmg}`}</em>`).join('')}</div>`;
  }
  infoPeek({ key: `log:${blog.length}`, side: 'right', maxW: offBoardW('right'), head: `<p class="lead">${HUD_TEXT.logTitle}</p>`, body: rows || `<p class="note">${HUD_TEXT.logNone}</p>` });
};

/** 교착 압박 띠 (2026-11-14): 압박이 켜지는 턴 · 지금 턴을 끝내면 적 킹이 녹을 때 — 시스템 투 + 회중시계 아이콘 */
const stallBand = (): void => {
  const st = stallInfo(b);
  if (st.state === 'off') return;
  stateBand(st.state === 'on' ? HUD_TEXT.stallOn(st.dmg) : HUD_TEXT.stallWarn(STALL_PRESS.quiet), 'crimson', { urgent: true, ms: 2600, icon: '<img src="ui/icons16/stopwatch@16.png" alt="" style="width:calc(var(--px1) * 16);height:calc(var(--px1) * 16)">' });
};
/** 적 의도 아이콘 (UI-07, 받은 16칸 도트 — 아이콘 층 --px1 정수배) */
const INTENT_ICON: Record<IntentKind, [number, number]> = { attack: [15, 21], approach: [16, 21], guard: [19, 22], blast: [19, 21], shield: [15, 19], rest: [20, 20] };
const intentIco = (k: IntentKind): string => `<img class="it-ico" src="ui/icons16/intent-${k}.png" alt="" style="width:calc(var(--px1) * ${INTENT_ICON[k][0]});height:calc(var(--px1) * ${INTENT_ICON[k][1]})">`;
/**
 * 적 의도 목록 (오른쪽 레일, 보고서 3.9 · ITB): 턴을 끝내면 적이 할 일 — 적 그림 · 의도 아이콘 · 대상 · 값. 최대 5줄.
 * 판 위 번호 · 화살표와 같은 계산(enemyPhase 미리 돌리기)이라 화면 = 실행.
 */
let intentKey = '';
const intentList = (): void => {
  const el = document.getElementById('intents');
  if (!el) return;
  const live = b.s.winner === null && !enemyTurn && !busy;
  const rows = live ? intentRows(b) : [];
  const W = HUD_TEXT.intentWord;
  const res = (r: IntentRow): string => {
    if (r.kind === 'attack' || r.kind === 'blast')
      return `${r.label ? `<span class="it-w">${r.label}</span>` : ''}${r.hits.slice(0, 2).map((h) => `${pieceImg(h.t, h.side ?? 0, 'small', 24)}<em${h.killed ? ' class="kill"' : ''}>${h.killed ? '×' : `−${h.damage}`}</em>`).join('')}${r.hits.length > 2 ? `<span class="it-w">+${r.hits.length - 2}</span>` : ''}`;
    if (r.kind === 'guard' || r.kind === 'shield') return `<span class="it-g">${W[r.kind]} +${r.amount ?? 0}</span>`;
    return `<span class="it-w">${W[r.kind]}</span>`;
  };
  // 판 위 붉은 번호 딱지와 같은 번호를 줄 앞에 (1.1.1 테스터: 적 머리 위 숫자 설명이 어디에도 없다)
  const order = live ? liveIntents(b).map((st) => st.pieceId) : [];
  const num = (r: IntentRow): string => {
    const k = r.pieceId === null ? -1 : order.indexOf(r.pieceId);
    return k >= 0 ? `<img class="it-n" src="ui/board/badge-e${Math.min(9, k + 1)}.png" alt="${k + 1}번">` : '';
  };
  const html = !live
    ? ''
    : rows.length
      ? rows
          .slice(0, 5)
          .map((r) => `<span class="it-row k-${r.kind}"><span class="who">${r.t ? pieceImg(r.t, 1, 'small', 24) : ''}${num(r)}</span>${intentIco(r.kind)}<span class="it-res">${res(r)}</span></span>`)
          .join('') + (rows.length > 5 ? `<span class="it-more">${HUD_TEXT.intentMore(rows.length - 5)}</span>` : '')
      : `<span class="it-none">${HUD_TEXT.intentNone}</span>`;
  if (html === intentKey) return;
  intentKey = html;
  el.innerHTML = html;
};
/** 연쇄 줄 (레일): 이번 턴 처치가 쌓였을 때만 — 다음 공격에 붙는 합 · 곱 */
const chainLine = (): void => {
  const el = document.getElementById('chain-now');
  if (!el) return;
  el.hidden = !b.kills || b.s.winner !== null;
  if (!b.kills) return;
  const add = chainAdd(b.kills, parts);
  const mul = chainMult(b.kills, parts);
  el.innerHTML = HUD_TEXT.chainNow(b.kills, `${add ? `<em>+${add}</em>` : ''}${mul > 1 ? `<em>×${fmtMult(mul)}</em>` : ''}`);
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
    // 속전 계기 (HB-02 · 피드백 8): 받은 하우징 안 진공관 여섯 — 남은 턴만큼 켜짐 · 흐림 · 꺼짐, 보상 나사는 고정 숫자 창 안에만
    const reward = Math.round(b.coins * SLICE.coinValue * (asc >= 8 ? ASC_NUM.coinMul : 1));
    const tubes = Array.from({ length: SPEED_METER.tubes }, (_, i) => {
      const st = speedTube(b.coins, i);
      const fx = was !== null && was > b.coins && !calmNow() && speedTube(was, i) !== st ? ' out' : '';
      return `<i class="tube t-${st}${fx}" style="--k:${i}"></i>`;
    }).join('');
    $('coins').innerHTML = `<span class="lbl">${HUD_TEXT.track}<span class="lbl-x"> 보상</span><i class="coin-key" aria-hidden="true"></i></span><span class="speed" title="${SPEED_METER.label}">${tubes}<b class="win" aria-label="${SPEED_METER.label} ${reward}">${reward}</b></span>`;
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
  const el = now !== null ? $('hand').querySelector<HTMLElement>(`[data-card="${now}"] .hc-body`) : null;
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
  turnLabel($('turn-label'), b.s.winner !== null ? '대국 끝' : enemyTurn ? '적 차례' : busy ? '움직이는 중' : HUD_TEXT.turnHeat(b.turn, b.s.heat ?? 1), enemyTurn);
  const alive = b.s.winner === null && !document.body.classList.contains('between') ? b.squadIds.filter((id) => b.s.pieces.some((p) => p.id === id)).length : squad.length;
  $('deckrow').innerHTML = `<button type="button" class="btn k-iron" data-deck>덱 ${deck.length}</button><button type="button" class="btn k-iron" data-crew>분대 ${alive}</button><span class="pile">버림 ${b.discard.length + (b.played?.length ?? 0)}</span>`;
  if (openCard !== null && openCard >= b.hand.length) openCard = null;
  const oldBody = $('hand').querySelector<HTMLElement>('.hc.open .hc-body');
  const handLen0 = $('hand').querySelectorAll('[data-card]').length;
  $('hand').innerHTML = (handView ?? b.hand).map(cardHtml).join('') || (handView ? '' : '<p class="empty">‘손패가 없어.’</p>');
  magAnim(oldBody, handLen0 === b.hand.length);
  const statuses = !busy && !enemyTurn && !document.body.classList.contains('between') ? partStatuses(b) : {};
  $('parts').innerHTML = parts.map((id) => partHtml(id, false, statuses[id])).join('');
  intentList();
  betChip();
  chainLine();
  // 새로 단 부품은 처음 보이는 순간 비틀려 들어와 철컥 잠긴다 (D-184)
  for (const id of newParts) mountPart($('parts').querySelector(`[data-part-info="${id}"]`));
  newParts.clear();
  $('parts').hidden = !parts.length;
  // 반장 규칙 칩 (보고서 2-2): 진홍 단추에 반장 이름 — 누르면 규칙 S 창
  $('boss').hidden = !b.boss;
  if (b.boss) $('boss').textContent = BOSS_RULES[b.bossRule].name;
  // 태엽 게이지 (D-162): 손패 맨 위 한 줄 — 칸마다 열쇠, 쓴 칸은 빈 칸. 오른쪽 레일의 태엽은 없앴다
  gauges();
  ($('btn-rewind') as HTMLButtonElement).disabled = b.rewinds <= 0 || busy || b.s.winner !== null;
  $('btn-rewind').innerHTML = `<i class="ico-rew" aria-hidden="true"></i><small>${b.rewinds}</small>`;
  ($('btn-end') as HTMLButtonElement).disabled = busy || b.s.winner !== null;
  coach();
  syncTerms();
};

/**
 * 첫 대국 도움말 (D-192): 처음 출하하는 사람의 시험대 한 판에만 — 지금 할 일 한 줄(시스템 투)을 판 위에 띄운다.
 * 고를 카드 → 빛나는 기물 → 갈 칸 → 턴 끝. 그 판을 이기면 다시 나오지 않는다.
 */
let coachOn = false;
const coach = (): void => {
  let el = document.querySelector<HTMLElement>('.coach-band');
  const live = coachOn && !tutActive && cur === INTRO[0] && b.s.winner === null && !busy && !enemyTurn && document.body.classList.contains('between') === false;
  $('btn-end').classList.toggle('coach-end', false);
  if (!live) return void (el && !el.classList.contains('pxout') && pxOut(el, () => el?.remove()));
  const canPlay = b.hand.some((_, i) => canPlay2(i));
  // 입문 두 턴 (D-232): 1턴 첫 처치 뒤 = 연쇄, 2턴부터 붉은 칸 위의 내 기물 = 빠지며 치기 (용어 없이 행동으로)
  const grazeNow = b.turn >= 2 && (b.graze ?? []).some((id) => b.s.pieces.some((p) => p.id === id));
  // 카드를 고르기 전 한 줄은 턴마다 다르다: 1턴 = 목표 · 2턴 = 적 번호 딱지 · 그 뒤 = 카드 (1.1.1 테스터: 첫 판 설명이 너무 적다)
  const idle: keyof typeof COACH_LINES = grazeNow ? 'graze' : b.turn === 1 && b.kills === 1 ? 'chain' : b.turn === 1 ? 'card' : b.turn === 2 ? 'intent' : 'cardAgain';
  const key: keyof typeof COACH_LINES = !canPlay ? 'end' : selCard === null ? idle : selPiece === null ? 'piece' : 'square';
  $('btn-end').classList.toggle('coach-end', key === 'end');
  $('hand').classList.toggle('hint', key === 'card' || key === 'cardAgain');
  if (!el) {
    // 부관 박차가 말한다 (D-242 화자 통일) — 판 아래 안내 띠 (1.1.1 테스터: 레일 속 말풍선이 어색하다 → 판 아래 토스트 자리)
    // P-B D-490: 이야기 · 부관 갈래 = 판 아래 자막 띠 (초상 액자 + 이름 + 줄) — 컷신 · 튜토리얼과 같은 자리 · 꼴
    el = document.createElement('div');
    el.className = `${subClass('ally')} coach-band`;
    el.setAttribute('role', 'status');
    el.innerHTML = subHtml({ face: '<img src="ui/hud/adjutant.png" alt="">', who: TUT.name, side: 'ally' });
    document.body.appendChild(el);
  }
  if (el.dataset.k === key) return void placeSub(el);
  el.dataset.k = key;
  el.querySelector('.vs-line')!.innerHTML = COACH_LINES[key].replace(/\n/g, '<br>');
  placeSub(el);
  replay(el, 'k-in');
};
const canPlay2 = (i: number): boolean => canPlay(b, i);

// ---------- 플레이테스트 기록 (D-234) ----------
telemetryStore(store);
/** 시험장은 본편 분석 기록도 남기지 않는다. */
const track = (...args: Parameters<typeof trackEvent>): void => { if (!labMode) trackEvent(...args); };
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
/**
 * 안드로이드 뒤로 가기 키 (D-477, MainActivity가 부른다): 닫을 수 있는 창이 열려 있으면 닫고("handled"),
 * 아니면 「한 번 더 누르면 닫습니다」 — 2초 안에 한 번 더 누를 때만 "exit"(앱 종료). 실수로 대국을 날리지 않게.
 */
/** 두 번 눌러 닫기 간격 */
const BACK_EXIT_MS = 2000;
let backAt = 0;
(window as unknown as { __hwBack: () => string }).__hwBack = (): string => {
  if (dismissWin()) return 'handled';
  if (Date.now() - backAt < BACK_EXIT_MS) return 'exit';
  backAt = Date.now();
  stateBand(SCREEN_TEXT.backExit, 'toast', { ms: BACK_EXIT_MS });
  return 'handled';
};
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
const where = (): Record<string, unknown> => ({ act: actI + 1, node_idx: rowI, asc, mode: runMode, chapter: storyChapter, run: readMetaCached().runs + 1, first: firstShip });

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
    void quiet; // 새 용어 알림은 ? 의 NEW 표시로만 (D-385 — 상단 알림은 상태만)
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
  on('call', !!b.pawnCalled);
  on('stall', b.turn >= STALL_PRESS.from);
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

/** 이번 카드에서 발동한 부품 (칙령 트레이가 빛난다) */
const firedParts = (cardId: CommandId, mover: PieceType | undefined, events: BattleEvent[], newKills: number): SlicePartId[] => {
  const c = COMMANDS[cardId];
  const out: SlicePartId[] = [];
  const on = (id: SlicePartId, cond: boolean) => cond && parts.includes(id) && out.push(id);
  on('horseshoe', mover === 'N' && newKills > 0);
  on('relayGear', events.some((e) => e.type === 'apGain' && e.source === 'relayGear'));
  on('siegeLatch', events.some((e) => e.type === 'attack' && !!e.shieldSpent));
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
/** 태엽을 돌려주는 부품 (턴에 한 번 표시가 b.once에 남는 것) */
const AP_PARTS: SlicePartId[] = ['horseshoe', 'whistle', 'queenFan', 'recoilSpring', 'pinNeedle'];
/**
 * 태엽 원천 FX (#29 · D-490): 돌아온 태엽마다 「원천 아이콘 + +1」 조각이 원천(처치한 적 칸 · 부품 칸)에서 태엽 계기로
 * 예비 → 터짐 → 출렁 호를 타고 날아든다(fx3.arcFly). 처치 환급 = 열쇠 아이콘이 쓰러진 적 칸에서, 부품 = 그 부품 그림이 부품 칸에서.
 * 원천을 다 가리지 못한 나머지(가르는 부품 · 금박 등)는 열쇠로. 실제로 들어온 양(gain)만큼만 — 상한에 막힌 것은 날리지 않는다.
 */
const apSources = (gain: number, before: typeof b.s, once0: string[], refunded0: number, relay: number): void => {
  const to = $('vials').getBoundingClientRect();
  const toPt = { x: to.left + to.width * 0.7, y: to.top + to.height / 2 };
  const partAt = (id: string) => {
    const el = $('parts').querySelector<HTMLElement>(`[data-part-info="${id}"]`);
    const q = el?.getBoundingClientRect();
    return q && q.width ? { x: q.left + q.width / 2, y: q.top + q.height / 2 } : toPt;
  };
  const tokens: { icon: string; from: { x: number; y: number }; n: number }[] = [];
  // 처치 환급: 쓰러진 적 칸에서
  const killed = before.pieces.filter((p) => p.side === 1 && !b.s.pieces.some((q) => q.id === p.id));
  const refund = (b.refunded ?? 0) - refunded0;
  for (let k = 0; k < refund; k++) {
    const p = killed[k] ?? killed[0];
    tokens.push({ icon: 'ui/icons16/hud.key.full@16.png', from: p ? renderer.screenOf(p) : toPt, n: 1 });
  }
  for (const id of AP_PARTS) if (b.once.includes(id) && !once0.includes(id)) tokens.push({ icon: `ui/icons16/${id}@16.png`, from: partAt(id), n: 1 });
  if (relay) tokens.push({ icon: 'ui/icons16/relayGear@16.png', from: partAt('relayGear'), n: relay });
  // 실제로 들어온 만큼만 (상한에 막힌 몫은 버린다) · 남는 몫은 열쇠 하나로
  let left = gain;
  const out: typeof tokens = [];
  for (const t of tokens) {
    if (left <= 0) break;
    const n = Math.min(t.n, left);
    out.push({ ...t, n });
    left -= n;
  }
  if (left > 0) out.push({ icon: 'ui/icons16/hud.key.full@16.png', from: toPt, n: left });
  out.forEach((t, i) => {
    const el = document.createElement('div');
    el.className = 'ap-fly';
    el.innerHTML = `<img src="${t.icon}" alt="">태엽 +${t.n}`;
    document.body.appendChild(el);
    el.style.left = `${Math.round(t.from.x - el.offsetWidth / 2)}px`;
    el.style.top = `${Math.round(t.from.y - el.offsetHeight / 2)}px`;
    arcFly(el, t.from, toPt, { delay: i * 140, ms: 620, end: 0.8, target: $('vials') });
  });
  // 부품이 준 몫이면 그 부품 칸도 번쩍 (원천이 어디인지 — 기존 flashParts)
  flashParts(out.filter((t) => t.icon.includes('icons16/') && !t.icon.includes('hud.key')).map((t) => (t.icon.match(/icons16\/(\w+)@/)?.[1] ?? '') as SlicePartId).filter(Boolean));
};
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
  void blockTold; // 길막기는 판 위 「막음!」으로만 (D-385)
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
  if (!battleInputActive() || b.s.winner !== null) return;
  const p = b.s.pieces.find((q) => q.x === pos.x && q.y === pos.y);
  // 갈 칸을 눌렀다 → 바로 실행
  if (selCard !== null && selPiece !== null && destinations().some((d) => samePos(d, pos))) return run(selCard, selPiece, pos);
  if (p && p.side === 1) return pieceInfo(pos);
  if (p && p.side === 0) {
    const c = selCard !== null ? COMMANDS[b.hand[selCard]] : null;
    // 방열판 · 땜질: 기물을 누르면 바로
    if (c && (c.kind === 'shield' || c.kind === 'repair' || c.kind === 'melt') && cardPieces(b, selCard!).some((q) => q.id === p.id)) return run(selCard!, p.id);
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
  toast(`${PIECE_NAMES_KO[t]} 카드 ${fresh.length}장이 불탄다`, 2200);
  sfx('threat');
};

const run = (i: number, pieceId?: number, to?: Pos): Promise<void> => guarded(() => runInner(i, pieceId, to));
const runInner = async (i: number, pieceId?: number, to?: Pos): Promise<void> => {
  const cardId = b.hand[i];
  const moverType = pieceId !== undefined ? findPiece(b.s, pieceId)?.type : undefined;
  const seal0 = b.once.includes('relaySeal');
  // #29 태엽 원천: 이번 수에서 무엇이 태엽을 돌려줬는지 (부품 턴 한 번 표시 · 처치 환급 수) — 화면 표시만
  const once0 = [...b.once];
  const refunded0 = b.refunded ?? 0;
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
  if (b.boss && r.events.some((e) => e.type === 'blast' && e.fx === 'thorns')) taunt('sig');
  // 판 위 목소리 (P-B D-490): 적 킹이 3할 아래 → beg · 킹이 맞음 → danger · 처음 맞음 → firstHit · 하나 잃음 → lost(적 킹 또는 곁의 적 기물) · 우리 처치 → 분대원 한마디
  {
    const ek = b.s.pieces.find((p) => p.side === 1 && p.type === 'K');
    const hitFoe = (id: number) => r.events.some((e) => (e.type === 'attack' || e.type === 'blast') && e.hits.some((h) => h.targetId === id && h.damage > 0));
    const lostN = r.before.pieces.filter((p) => p.side === 1 && !b.s.pieces.some((q) => q.id === p.id)).length;
    const anyHit = r.events.some((e) => (e.type === 'attack' || e.type === 'blast') && e.hits.some((h) => h.damage > 0 && r.before.pieces.find((q) => q.id === h.targetId)?.side === 1));
    if (ek && !begSaid && ek.hp <= ek.maxHp * 0.3) { begSaid = true; taunt('beg', !b.boss); }
    else if (ek && hitFoe(ek.id)) taunt('danger');
    else if (lostN === 1) { crewBark('kill', pieceId ?? -1); if (!tauntedNow) taunt('lost'); foePieceSay('lost'); }
    else if (anyHit && !cuesSaid.has('firstHit')) taunt('firstHit');
  }
  const relayEvent = r.events.find((e) => e.type === 'apGain' && e.source === 'relayGear');
  const latchEvent = r.events.find((e) => e.type === 'attack' && e.shieldSpent);
  // 맞물린 톱니 — 토스트 대신 부품 칸에서 열쇠가 계기로 날아든다 (#29)
  if (latchEvent?.type === 'attack') toast(BUILD_TEXT.latch(latchEvent.shieldSpent!));
  if (!seal0 && b.once.includes('relaySeal')) toast(BUILD_TEXT.seal);
  if (gain) apSources(gain, r.before, once0, refunded0, relayEvent?.type === 'apGain' ? relayEvent.amount : 0);
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
  // 템포 가속: 연쇄가 쌓일수록 다음 연출이 빨라진다
  renderer.setTempo(1 + Math.min(b.kills, PACE.tempoKillsMax) * PACE.tempoPerKill);
  // 첫 승격 (D-244): 부관이 칭찬하며 승격 규칙을 알려 준다 — 출하를 통틀어 한 번
  const promo = r.events.find((e) => e.type === 'promote');
  if (promo && !tutDone('promote') && !tutActive && b.s.winner === null) {
    const pp = findPiece(b.s, (promo as { pieceId: number }).pieceId);
    await tutorial('promote', [{ text: TUT.promote, target: () => (pp ? tileRect(pp) : null) }]);
  }
  // 반장 2단계 예고 (D-383): 1단계 반장 HP가 낮아지면 한 번 — 「한 번 더 일어선다」
  if (b.boss && !b.phase2 && !phaseWarned && asc <= BOSS_PHASE_TEXT.upTo && b.s.winner === null) {
    const ek = b.s.pieces.find((p) => p.side === 1 && p.type === 'K');
    // #21 · D-490: 토스트 대신 판 위를 경보 띠가 가로지른다 (받은 CI-01 경보 띠 3프레임)
    if (ek && ek.hp <= ek.maxHp * BOSS_PHASE_TEXT.lowAt) { phaseWarned = true; sfx('threat'); p2Warn(BOSS_PHASE_TEXT.low, gridRect()); }
  }
  // 반장 2단계 (D-243): 쓰러진 반장이 다시 일어선다
  if (r.events.some((e) => e.type === 'respawn' && e.label === BOSS_RISE_LABEL)) {
    sfx('threat');
    const gilded = b.bossRule === 'gilded';
    // #21 · D-490: 패배 띠(koBanner lose) 대신 2단계 컷인 — 레터박스 · 진홍 번쩍 · 반장 그림 띠 + 사선 베기 · 「격노」 경보 띠
    await p2Rise({ art: gilded ? gildedArt() : BOSS_ART[b.bossRule] ?? 'boss-plate', word: gilded ? '도금왕이 격노해 일어선다' : '반장이 격노해 일어선다' });
    // 2단계 (각본 §8 · §9, D-276): 반장은 한 마디, 도금왕은 이번 출하에 쓰러뜨린 반장에게 한 말을 비꼰다
    if (gilded) await gildedPhase2();
    // D-474: 반장 2단계 대사(각본 데이터에만 있던 줄)를 격노하는 순간에 한 마디
    else { const p2 = (BOSS_STORY as Partial<Record<string, { phase2: string }>>)[b.bossRule]?.phase2; if (p2 && !labMode) await foeStory(p2.replace(/^“|”$/g, '')); }
    // 띠가 「반장이 다시 일어선다」를 말한다 — 상단 알림은 따로 띄우지 않는다 (D-385)
    renderer.setup(b.s);
    refresh();
  }
  if (b.s.winner !== null) return finish();
};
/** 속전 진공관 하나의 상태 (HB-02): 관마다 남은 턴의 몫으로 켜짐 · 흐림 · 꺼짐, 마지막 몇 턴은 남은 관이 깜빡 */
const speedTube = (coins: number, i: number): 'lit' | 'dim' | 'flick' | 'dead' => {
  const per = SLICE.coins / SPEED_METER.tubes;
  const share = (coins - i * per) / per;
  if (share <= 0) return 'dead';
  if (coins <= SPEED_METER.urgentTurns) return 'flick';
  return share >= SPEED_METER.litAt ? 'lit' : 'dim';
};
let prevKills = 0;

/** 턴 끝 경고 상태 (보고서 2-2): 황동 → 진홍 단추 — 다음 누름이 그대로 턴을 끝낸다 */
const endWarn = (on: boolean): void => {
  const el = $('btn-end');
  // HB-01: 단추는 그대로 황동 — 테 바깥 띠만 경고 맥동 세 프레임을 돈다(hud-rarity.css). 단추가 사라지거나 색째 바뀌지 않는다
  el.classList.toggle('warn', on);
};
const onEnd = (): Promise<void> => guarded(onEndInner);
const onEndInner = async (): Promise<void> => {
  if (busy || b.s.winner !== null) return;
  const burn0 = b.burned?.length ?? 0;
  const aimed0 = (b.aimed ?? []).length;
  const alarm0 = !!b.alarmAtk; // 경보가 이번에 막 찼는지 알아보려고 (D-311)
  const handBefore = [...b.hand];
  const r = endTurn(b);
  if (r === 'warn') {
    // 확인 창 없음 (보고서 2-2 · ITB): 상태 띠 한 줄 + 턴 끝이 진홍으로 — 한 번 더 누르면 그대로 끝
    sfx('threat');
    stateBand(HUD_TEXT.warnEnd, 'crimson', { urgent: true, ms: 2400 });
    endWarn(true);
    return;
  }
  endWarn(false);
  // 예고 지표 (⑥): 내 기물을 겨눈 예고 수 · 실제로 맞은 내 기물 수
  tg.telegraph += aimed0;
  tg.hit += new Set(r.events.flatMap((e) => (e.type === 'attack' ? e.hits.filter((h) => h.damage > 0 && r.before.pieces.find((q) => q.id === h.targetId)?.side === 0).map((h) => h.targetId) : []))).size;
  if (b.turn === 2 && cur.drill) ftue(`drill_${cur.drill}_turn2`); // 시험대 B: 적 차례를 한 번 지켜봤다 (옛 battle1_turn2)
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
  band('적 차례', 'crimson');
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
  if (b.s.winner === null && b.alarmAtk) band(HUD_TEXT.alarm, 'crimson');
  if (b.s.winner !== null) { handView = null; refresh(); return finish(); }
  refresh();
  // 적 차례 끝 → 내 차례 사이 숨 (D-204)
  await new Promise((res) => window.setTimeout(res, calmNow() ? 0 : PACE.turnHold));
  band(HUD_TEXT.heatBand(b.turn, b.s.heat ?? 1), 'brass');
  stallBand();
  handView = null;
  refresh();
  dealHand($('hand'));
  burnNote(burn0);
  if (b.falls.some((f) => f.turn === b.turn - 1)) {
    // 쓰러뜨린 적 기물이 먼저 말하고, 아니면 적 킹 (P-B D-490)
    const killer = r.events.find((e) => e.type === 'attack' && e.hits.some((h) => h.killed && r.before.pieces.find((q) => q.id === h.targetId)?.side === 0));
    if (killer?.type === 'attack' && r.before.pieces.find((q) => q.id === killer.attackerId)?.type !== 'K') foePieceSay('gloat', killer.attackerId);
    taunt('gloat');
  } else {
    const hurt = r.events.find((e) => e.type === 'attack' && e.hits.some((h) => h.damage > 0 && !h.killed && r.before.pieces.find((q) => q.id === h.targetId)?.side === 0));
    const who = hurt?.type === 'attack' ? hurt.hits.find((h) => r.before.pieces.find((q) => q.id === h.targetId)?.side === 0)?.targetId : undefined;
    if (who !== undefined) crewBark('hurt', who);
  }
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
        // M 창 (D-391): 명패 「사선」 · 머리 줄 = 분대원 · 대사 · 규칙 한 줄 · [거절한다 | 받아들인다]
        const el = openWin({
          size: 'm',
          title: '사선',
          head: `${pieceImg(who.t, 0, 'small', 48, who.form)}<p class="lead">${crewLabel(who)}</p>`,
          body: `<p class="say"><span class="who">${who.name ?? PIECE_NAMES_KO[who.t]}</span>“제가 맞겠습니다, 대장.”</p><p>받아들이면 킹과 자리를 바꿉니다. 이 분대원이 대신 맞습니다.</p>`,
          back: { label: '거절한다', attrs: 'data-no' },
          go: { label: '받아들인다', attrs: 'data-yes' },
        });
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
  band(`마지막 한 수 · 태엽 +${dir.clutchAp(asc)}`, 'brass');
  sfx('awaken');
  await new Promise((r) => window.setTimeout(r, 1000));
  clutchBoost(b, dir.clutchAp(asc));
  refresh();
};

/** 원수와 다시 만났다 (전환 화면 뒤): 이름 · 쓰러뜨린 분대원 · 단계 */
const nemesisMeet = (n: Nemesis): void => {
  // M 창 (D-391): 명패 「원수」 · 머리 줄 = 원수 이름 + 단계 꼬리표 · 대사 · 조건 꼬리표 줄 · [맞선다]
  const el = openWin({
    size: 'm',
    title: '원수',
    // 말하는 이 = 초상 액자 (보고서 2-2 원수 — 말풍선 문법과 같은 부품)
    head: `<div class="frame-portrait f64">${pieceImg(n.t, 1, 'small', 32)}</div><p class="lead down">${n.name}</p><span class="ribbon r-crimson push">${n.rank}단계 · HP +${Math.round(n.rank * DIRECTOR.nemesisHp * 100)}%</span>`,
    body: `<p class="say"><span class="who">${n.name}</span>${TAUNTS.meet[R.int(TAUNTS.meet.length)]}</p><div class="terms"><span class="ribbon r-crimson">쓰러뜨림</span><p>${n.victims.join(' · ')}</p><span class="ribbon">현상금</span><p>나사 ${dir.bounty(asc)}${asc <= DIRECTOR.heirloomUpTo && n.heir ? ` · ${n.heir.name}의 유품` : ''}</p></div>`,
    go: { label: '맞선다', attrs: 'data-go' },
  });
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
  });
};

/** 판돈 (D-178): 이따금, 대국 앞에서 나 자신에게 건다 — 걸지 않아도 된다 */
const maybeBet = (def: BattleDef, force = false): void => {
  if (!force && (labMode || INTRO.includes(def) || def.boss || gold < DIRECTOR.betStake || R.next() > DIRECTOR.betChance)) return;
  const kinds: BetKind[] = ['fast', 'clean'];
  const kind = kinds[R.int(kinds.length)];
  // M 창 (D-391 → #12 · D-490): 명패 「판돈」 · 판돈 칸(움푹 칸)에 나사 동전 셋 — D-260 「확률 = 동전 · 사각 칸」 문법 ·
  // 조건 · 보상 · 실패 시 줄 · 독백 · [걸지 않는다 | 건다]. 걸면 동전이 칸에 떨어져 박히고(계단) 창이 닫힌다. 그림 = 「임시 — WG-01 · WG-02 대기」(지금 나사 아이콘)
  const coin = '<img src="ui/icons16/hud.screw.png" alt="">';
  const el = openWin({
    size: 'm',
    title: WAGER_TEXT.title,
    head: `<p class="lead">${BETS[kind].label}</p><span class="tag push">판돈 나사 ${DIRECTOR.betStake}</span>`,
    body: `<div class="inset bet-slot" aria-hidden="true">${coin}${coin}${coin}</div><div class="terms"><span class="ribbon">조건</span><p>${BETS[kind].cond}</p><span class="ribbon">보상</span><p>건 나사의 두 배 <span class="up">(+${DIRECTOR.betStake * 2})</span></p><span class="ribbon r-crimson">실패 시</span><p>건 나사를 잃는다 <span class="down">(−${DIRECTOR.betStake})</span></p></div><p class="mono">${WAGER_TEXT.mono}</p>`,
    back: { label: '걸지 않는다', attrs: 'data-no' },
    go: { label: '건다', attrs: 'data-yes' },
    dismiss: closeWin,
  });
  el.querySelector('[data-no]')!.addEventListener('click', closeWin);
  el.querySelector<HTMLButtonElement>('[data-yes]')!.addEventListener('click', (e) => {
    (e.currentTarget as HTMLButtonElement).disabled = true;
    betNow = { kind, stake: DIRECTOR.betStake };
    sfx('coin');
    el.querySelectorAll('.bet-slot > img').forEach((c) => replay(c, 'drop'));
    window.setTimeout(() => {
      sfx('rare');
      closeOverlay();
      refresh();
      const chip = $('bet-chip');
      if (!chip.hidden) replay(chip, 'k-in');
    }, window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : 520);
  });
};
/** 판돈 칩 상태: 조건이 아직 살아 있나 (대국 중 표시용 — 정산은 settleBet) */
const betState = (): { ok: boolean; prog: string } | null => {
  if (!betNow) return null;
  if (betNow.kind === 'fast') {
    const left = DIRECTOR.betTurns - b.turn + 1;
    return { ok: left > 0, prog: left > 0 ? WAGER_TEXT.turnsLeft(left) : WAGER_TEXT.broken };
  }
  const all = b.squadIds.length;
  const alive = all - b.falls.length;
  return { ok: b.falls.length === 0, prog: b.falls.length === 0 ? WAGER_TEXT.crewAlive(alive, all) : WAGER_TEXT.broken };
};
let betBroke = false;
/** 판돈 칩 그리기 (refresh마다) — 조건이 깨지는 순간 칩이 금 가며 흔들리고 시스템 띠 「판돈 실패」 */
const betChip = (): void => {
  const chip = $('bet-chip');
  const st = betState();
  chip.hidden = !st || document.body.classList.contains('between');
  if (!st || !betNow) return void (betBroke = false);
  chip.innerHTML = `<span class="tag"><img src="ui/icons16/hud.screw@16.png" alt="">${WAGER_TEXT.chip} ${betNow.stake}</span><span class="bc-cond">${BETS[betNow.kind].cond}</span><span class="bc-prog">${st.prog}</span>`;
  chip.classList.toggle('broken', !st.ok);
  chip.classList.remove('hit');
  if (!st.ok && !betBroke) {
    betBroke = true;
    replay(chip, 'k-crack');
    sfx('threat');
    stateBand(WAGER_TEXT.fail, 'crimson', { urgent: true, ms: 1800 });
  }
};
/** 판돈 정산 순간 (대국 끝, 격파 띠 뒤): 적중 = 칩에서 나사가 쏟아짐 + 황동 표지 · 실패 = 칩 금 + 진홍 표지. 계산은 그대로 settleBet */
const betResolve = async (won: boolean): Promise<void> => {
  if (!betNow) return;
  const chip = $('bet-chip');
  const d = settleBet(betNow.kind, betNow.stake, { won, turns: b.turn, fell: b.falls.length });
  const r = chip.getBoundingClientRect();
  chip.hidden = false;
  chip.classList.toggle('hit', d > 0);
  chip.classList.toggle('broken', d <= 0);
  chip.querySelector('.bc-prog')!.textContent = d > 0 ? `+${d}` : `−${betNow.stake}`;
  if (d > 0) {
    sfx('coin', 9);
    screwBurst({ x: r.left + r.width / 2, y: r.top + r.height / 2 }, chip, Math.round(d / 5));
    stateBand(WAGER_TEXT.hit(d), 'brass', { urgent: true, ms: 1800 });
  } else {
    replay(chip, 'k-crack');
    sfx('threat');
    stateBand(WAGER_TEXT.lost(betNow.stake), 'crimson', { urgent: true, ms: 1800 });
  }
  if (!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) await new Promise((res) => window.setTimeout(res, 1400));
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
/** 반장 2단계 예고를 이번 대국에 이미 했나 (D-383) */
let phaseWarned = false;
const startBattle = (def: BattleDef, silent = false): void => {
  clearPeeks();
  phaseWarned = false;
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
  // 다시 볼 판(D-468, 시드가 박힌 판)은 실험실 판과 똑같아야 한다 — 보이지 않는 손 · 원수를 끼우지 않는다
  const mercy = def.seed === undefined ? dir.mercy(asc, lossesHere) : 0;
  // 원수 (D-178): 입문 · 연마가 아니면 이따금 그 유형의 적으로 다시 선다
  nemesisNow = null;
  let enemy = def.enemy;
  const ns = nemeses();
  if (ns.length && def.seed === undefined && !INTRO.includes(def) && !def.drill && R.next() < DIRECTOR.nemesisShow) {
    const n = ns.find((x) => enemy.includes(x.t)) ?? ns.find((x) => x.t !== 'K');
    if (n) {
      nemesisNow = n;
      if (!enemy.includes(n.t)) enemy = [...enemy, n.t];
    }
  }
  clutchedNow = false;
  tauntedNow = false;
  tauntCount = 0;
  cuesSaid = new Set();
  begSaid = false;
  clearVoices();
  p2Clear();
  betNow = null;
  blog = [];
  apKey = '';
  apPrev = coinPrev = null;
  // 시작 세트 (D-485): 표준이 아니면 입문 판의 짜 둔 손패 · 자리를 쓰지 않는다(그 손패는 폰 · 나이트 분대 몫) — 적 자리 · 킹 자리만
  const dd: BattleDef = INTRO.includes(def) && startSet !== 'standard' ? { ...def, order: undefined, deck: undefined, place: def.place?.filter((q) => q.side === 1 || q.t === 'K') } : def;
  const bSeed = def.seed ?? 100 + stage * 17 + R.int(1000);
  b = newSliceBattle(squad, enemy, dd.order ? arrange(dd.order, dd.deck ?? deck.filter(usable)) : deck.filter(usable), bSeed, { pawnCall: !!START_SETS[startSet].pawnCall, scatter: START_SETS[startSet].scatter && def.seed === undefined ? bSeed : undefined, ordered: !!dd.order, enemyKingHp: def.kingHp, enemyHp: def.enemyHp, parts, refined, boss: def.boss, bossRule: def.bossRule, traits: def.traits, width: def.w, height: def.h, place: dd.place, mercy, nemesis: nemesisNow ? { t: nemesisNow.t, rank: nemesisNow.rank } : undefined, depth: def.depth ?? (INTRO.includes(def) || def.drill ? 0 : depthNow()), gold, rewindCharms: charms.rewind, shock: asc >= 2, guard: def.guard, atkMul: (asc >= 9 ? ASC_NUM.enemyAtk : 1) * (def.atk ?? 1), eliteOne: def.eliteOne, forms: def.forms, marks: def.marks, giants: def.giants, process: def.process, flatHeat: def.flat, calm: def.calm, script: def.script });
  rewindsAtStart = b.rewinds;
  tg = { telegraph: 0, hit: 0, evade: 0, counter: 0 };
  hpAtStart = b.s.pieces.filter((p) => p.side === 0).reduce((a, p) => a + p.hp, 0);
  lossAsked = false;
  if (!labMode && runLive) {
    track('battle_start', { ...where(), enemy_id: def.title, enemy: def.enemy });
    // 첫 10분 (P-C D-502): battle1_start = 처음 판에 손대는 순간(시험대 A) · 시험대마다 drill_x_start · 출하 지도의 첫 대국 = first_real_battle
    if (def.drill) ftue('battle1_start');
    ftue(def.drill ? `drill_${def.drill}_start` : 'first_real_battle');
    if (def.boss && actI === 0) ftue('act1_boss');
  }
  selCard = selPiece = openCard = null;
  busy = false;
  turnDmg = 0;
  prevKills = 0;
  ritesDone = 0;
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
  // 입문 시험대 A · B는 그 판의 생각에 필요한 HUD만 (kit.css body[data-drill]) — C(첫 대국)는 전부
  if (def.drill && def.drill !== 'c') document.body.dataset.drill = def.drill;
  else delete document.body.dataset.drill;
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
          // 2단계 예고 (D-383): 낮은 승급에서는 처음 만날 때 부관이 짚는다
          ...(asc <= BOSS_PHASE_TEXT.upTo ? [{ text: BOSS_PHASE_TEXT.start.replace(/([.!?])\s+/g, '$1\n'), target: () => $('boss') }] : []),
        ]));
        return;
      }
      // 첫 실전 대국 (P-C D-502): 입문 시험대는 피해 100%였다 — 배치 턴 · 공정 열기를 그것이 적용되는 판에서 한 줄로
      if (firstShip && !def.drill && !tutDone('heat') && !labMode) {
        void ready.then(() => tutorial('heat', [{ text: TUT.heat, target: () => $('turn-label') }]));
        return;
      }
      if (nemesisNow) return nemesisMeet(nemesisNow);
      const cracked = squad.filter((u) => u.cracked);
      // 상단 알림은 상태만 (D-385, 사용자: 「위에서 내려오는 설명은 읽히지도 않는다 — 태엽 부족 같은 상태만」): 판 규칙 · 적 특성은 진입 창과 길게 누르기에서
      if (cracked.length) toast(LIFE_TEXT.warn(cracked.map((u) => u.name ?? PIECE_NAMES_KO[u.t]).join(' · ')), 2600);
      maybeBet(def);
      // 대국 시작 한마디 (P-B D-490): 판돈 창이 없을 때만 — 적 킹이 먼저, 아니면 적 기물 하나
      void ready.then(() => window.setTimeout(() => { if ($('overlay').hidden && !busy) { taunt('start'); if (!tauntedNow) foePieceSay('start'); } }, 500));
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
    // 막 장부 (D-402): 막 반장을 쓰러뜨리면 그 막 쪽에 「반장 격파」 → 다음 막 예고(수치) → 그다음 막 카드(서사만)
    if (!actClearShown) {
      actClearShown = true;
      // 보상 창을 먼저 닫는다 (기록-1): 막 장부 아래에 고르기 창이 산 채로 남아 다시 눌리면 같은 카드가 또 들어가고 노드를 건너뛰었다
      closeOverlay();
      actI -= 1;
      rowI = acts[actI].rows.length - 1;
      return void actClear().then(() => { advance(); actClearShown = false; });
    }
    const a = acts[actI];
    // 막이 바뀌면 분대가 쉰다 (반장 뒤 정비) — 쓴 버팀도 이때만 다시 찬다 (2026-11-14)
    squad = refillBrace(restSquad(squad, REST.actHeal));
    { const m = mendSquad(squad); squad = m.squad; if (m.mended.length) window.setTimeout(() => toast(LIFE_TEXT.mended(m.mended.map((u) => u.name ?? '').join(' · ')), 3200), 1200); }
    closeOverlay();
    void actCard(actLabel(a.act), a.name, ACT_NARR[actI], actI === 2 ? 'chained-door' : `act-${Math.min(4, actI + 1)}`).then(() => {
      showMap();
      // 막을 넘으면 부품 칸 +1 (D-384)
      if (actI > 0 && partSlotsAt(actI) > partSlotsAt(actI - 1)) toast(`부품 칸이 하나 늘었습니다. (부품 칸 ${partSlotsAt(actI)})`, 2600);
    });
    return;
  }
  showMap();
};
/** 막 장부: 막이 바뀌는 순간 한 번만 */
let actClearShown = false;
/** 이번 막 시작 때의 값 (막 장부 = 지금 − 이것) — 저장에 같이 남는다 */
let actSnap: ActSnap = { won: 0, kills: 0, gold: 0, deck: START_DECK.length, kb: {}, db: {} };
const killsNow = (): number => squad.reduce((n, u) => n + (u.kills ?? 0), 0) + readLedger().filter((r) => r.run === runId).reduce((n, r) => n + r.kills, 0);
const snapNow = (): ActSnap => ({ won, kills: killsNow(), gold, deck: deck.length, kb: Object.fromEntries(squad.map((u) => [u.serial ?? '', u.kills ?? 0])), db: Object.fromEntries(squad.map((u) => [u.serial ?? '', u.dmg ?? 0])) });
/** 으뜸 (처치가 가장 많은 분대원, 같으면 피해) — since가 있으면 그 뒤로 센 값 */
const mvpOf = (list: { name: string; t: PieceType; kills: number; dmg: number }[]): ClearMember | undefined => {
  const best = list.reduce<(typeof list)[number] | undefined>((b, m) => (!b || m.kills > b.kills || (m.kills === b.kills && m.dmg > b.dmg) ? m : b), undefined);
  return best && best.kills > 0 ? { name: best.name, pc: pieceImg(best.t, 0, 'small', 24), kills: best.kills, dmg: best.dmg } : undefined;
};
/** 쪽 띠 칸 넷: 1막 · 2막 · 3막 · 종막 — 쓰러뜨린 반장(runBosses)만큼 찍힌다, 종막은 도금왕 */
const clearTabs = (upTo: number, gilded = false): { label: string; boss?: string }[] =>
  [0, 1, 2, 3].map((i) => ({ label: actLabel(i + 1), boss: i < 3 ? (i < upTo ? BOSS_STORY[runBosses[i] ?? 'plate'].name : undefined) : gilded ? '도금왕' : undefined }));
/**
 * 막 장부 (D-402, 사용자 결정 end2-a): 쓰러진 반장 그림에 「반장 격파」 · 이번 막 장부(대국 · 처치 · 나사 · 덱 · 부품) · 이번 막 으뜸 ·
 * 다음 막 예고(카드 말투 한 문장 + 수치) → 「나아간다」. 다음 막 카드는 서사만.
 */
const actClear = async (): Promise<void> => {
  const s0 = actSnap;
  const boss = runBosses[actI] ?? runBosses.at(-1) ?? 'plate';
  const mvp = mvpOf(squad.filter((u) => u.t !== 'K').map((u) => ({ name: u.name ?? PIECE_NAMES_KO[u.t], t: u.t, kills: (u.kills ?? 0) - (s0.kb[u.serial ?? ''] ?? 0), dmg: (u.dmg ?? 0) - (s0.db[u.serial ?? ''] ?? 0) })));
  const [line, num] = actOmen(actI + 1);
  const nextName = acts[actI + 1]?.name ?? '';
  await clearScreen({
    mode: 'act',
    title: SCREEN_TEXT.actClear(actLabel(actI + 1)),
    tag: `<span class="ribbon">${acts[actI].name}</span>`,
    tabs: clearTabs(actI + 1),
    rows: [
      { k: SCREEN_TEXT.tally[0], v: won - s0.won },
      { k: SCREEN_TEXT.tally[1], v: Math.max(0, killsNow() - s0.kills) },
      { k: SCREEN_TEXT.tally[2], v: Math.max(0, gold - s0.gold), unit: `(지갑 ${gold})` },
      { k: SCREEN_TEXT.tally[3], v: deck.length, unit: deck.length - s0.deck > 0 ? `(+${deck.length - s0.deck})` : '' },
      { k: '부품', v: `${parts.length}/${partSlotsAt(actI)}` },
      { k: SCREEN_TEXT.actHeal, v: `HP +${Math.round(REST.actHeal * 100)}%`, unit: '(분대 전원)' },
    ],
    mvp,
    opens: [],
    next: { head: `다음 · ${actLabel(actI + 2)} ${nextName}`, line, num },
    art: `boss-fall-${boss}`,
    focus: [0.5, 0.45],
    stampTag: SCREEN_TEXT.bossTag,
    stampWord: '격파!',
    go: SCREEN_TEXT.onward,
  });
  if (runMode === 'story' && !storyBeats.includes(actI)) {
    const beat = companionScene(actI, storyCompany().alive, storyPromise, storyChapter);
    storyPromise = beat.promise;
    storyBeats.push(actI);
    await playCuts(beat.cuts);
  }
  actSnap = snapNow();
};
/** 층 진입 서술 (각본 §7, D-276) — 막 전환 화면 */
const ACT_NARR = ['', ACT_CARD[1], ACT_CARD[2], ACT_CARD[3]];
/** 막 이름표: 4막은 종막 (D-252) */
const actLabel = (n: number): string => (n === 4 ? '종막' : `${n}막`);

/** 노드에 들어간다 */
const enterNode = (n: MapNode): void => {
  if (n.battle) {
    // 저장이 먼저 (페르소나 테스트 M2): 대국을 세우며 R을 쓰므로, 세우기 전 상태를 남겨야 이어하기가 같은 대국을 다시 세운다
    saveRun('battle', picked[actI][rowI] ?? 0);
    return startBattle(n.battle);
  }
  // 장소 진입은 모달 없이 철문 전환만 (D-388) — 화면 자체가 장소를 말한다
  if (n.kind === 'shop') return void shutter(shopScreen);
  if (n.kind === 'event') {
    if (!eventBag.length) eventBag = [...SLICE_EVENT_IDS];
    const id = eventBag.splice(R.int(eventBag.length), 1)[0];
    { const m = readMeta(store); writeMeta(store, { ...m, evRecent: [id, ...(m.evRecent ?? []).filter((x) => x !== id)].slice(0, EV_RECENT) }); }

    return void shutter(() => eventScreen(id));
  }
  if (n.kind === 'chest') {
    // 부품 상자 (D-215): 나사 한 줌 + 부품 하나 — 지도 가운데 층에 고정
    const screws = SLICE.chestGold[0] + R.int(SLICE.chestGold[1] - SLICE.chestGold[0] + 1);
    return void shutter(() => {
      gold += screws;
      // 부적 (D-228): 가끔 상자 바닥에 — 여벌 심장은 드물게
      const roll = R.next();
      const charm = roll < CHARM_NUM.chestRevive ? 'revive' : roll < CHARM_NUM.chestRevive + CHARM_NUM.chestRewind ? 'rewind' : null;
      if (charm) charms[charm] += 1;
      partPick(SCREEN_TEXT.partBox, advance, false, `<span class="tag">나사 +${screws}</span>${charm ? `<span class="tag">${CHARMS[charm].name} +1</span>` : ''}`);
    });
  }
  forgeFinal = !!n.final;
  if (n.final) return void shutter(forgeScreen);
  if (n.kind === 'forge') return void shutter(forgeScreen);
};

/**
 * 출하 지도 (D-169, 슬더스식 전체 화면): 막 전체가 왼쪽 → 오른쪽으로 펼쳐진다. 줄마다 노드(황동 메달), 지나온 길은 금빛 선.
 * 패스 5 (D-397, 보고서 2026-11-09f 2-1): 바닥은 불투명(막 그림 덮기 + 2×2 먹 디더 — 뒤 전투가 비치지 않는다) ·
 * 머리 줄 = 막 꼬리표 + 이름 24 · 오른쪽 지갑(나사) + 꼬리표(분대 · 덱 · 부품 · 부적) ·
 * 갈 수 있는 곳은 멈춘 황동 톱니 테, 고른 하나만 돈다 · 아래 미리보기 띠 `.peek-bar`(움푹 칸 — 범례만이면 낮은 띠, 고르면 높은 띠 · D-401) = 아이콘 · 이름 24 · 꼬리표 ≤ 3 · 적 명단 · 황동 「진입」 112×48.
 * 아무것도 고르지 않았을 때 그 띠는 안내 한 줄 + 범례. 고정 노드(입문 · 연마)는 지도 없이 바로.
 */
/** 지나온 길: 막마다 줄 → 고른 노드 번호 */
let picked: number[][] = [[], [], [], []];
const showMap = (): void => {
  const a = acts[actI];
  // 4막(종막 · 출하구)도 지나온 길 칸이 있어야 한다 — 예전 저장(세 칸)으로 이어해도 (4막 진입 시 지도가 안 뜨던 버그)
  while (picked.length < acts.length) picked.push([]);
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
  el.className = 'mapfx kit';
  // 막 표지 (A-01~03)를 지도 바탕에 어둡게 깐다 — 그림이 없으면 지금 바탕 그대로
  // CSS 변수 안 url()은 스타일시트 기준으로 풀리므로 절대 주소로
  el.style.setProperty('--act', `url(${new URL(`scenes/act-${Math.min(4, actI + 1)}.png`, location.href).href})`);
  // 범례 한 줄 (D-400, 사용자: 「범례가 두 줄로 접힌다 · 『빛나는 곳을 고릅니다』는 필요 없다」)
  const legend = `<ul class="map-legend">${(['battle', 'check', 'event', 'chest', 'shop', 'forge', 'boss'] as const)
    .map((k) => `<li><i class="ico" style="${iconArtSmall(NODE_ICONS[k])}"></i>${NODE_NAMES[k]}</li>`)
    .join('')}</ul>`;
  // 수치는 긴 명판 하나 (D-398, 사용자: 「꼬리표마다 배경이 따로라 읽기 어렵다」) — 이름 12 · 값 15, 부적 둘은 아이콘 + 값. UI-22 수치 명판 · 칸 사이 홈 (D-399)
  const stat = (k: keyof typeof MAP_TEXT.stat, v: string): string => `<span class="sp-i"><small>${MAP_TEXT.stat[k]}</small><b>${v}</b></span><i class="sp-sep"></i>`;
  const charm = `<span class="sp-i" title="${CHARMS.revive.name} · ${CHARMS.rewind.name}"><small>${MAP_TEXT.stat.charm}</small>${(['revive', 'rewind'] as const).map((c) => `<i class="ico" style="${iconArtSmall(CHARMS[c].icon)}"></i><b>${charms[c]}</b>`).join('')}</span>`;
  el.innerHTML = `<header class="map-head"><span class="ribbon">${runMode === 'story' ? CHAPTERS[storyChapter].label : runLabel(runMode, asc)} · ${actLabel(a.act)}</span><h2>${a.name}</h2><div class="map-res"><span class="wallet">${gold}</span><div class="stat-plate">${stat('squad', `${squad.length}`)}${stat('deck', `${deck.length}`)}${stat('parts', `${parts.length}/${partSlotsAt(actI)}`)}${charm}</div></div></header>
    <div class="map-body"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${lines.join('')}</svg>${nodes}</div>
    <footer class="inset peek-bar">${legend}</footer>`;
  document.body.appendChild(el);
  sfx('lift');
  const info = el.querySelector<HTMLElement>('.peek-bar')!;
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
      // 노드 미리보기 (D-388 — 진입 창 대신, 발라트로 블라인드 · ITB 임무 미리보기처럼 누르기 전에) · D-397 키트 부품:
      // 아이콘 · 이름 24 · 꼬리표 ≤ 3(적 수 · 보상 · 특성) · 적 명단 · 황동 「진입」. 장소 노드는 꼬리표 대신 한 줄 설명
      const def = nd.battle;
      const cnt = new Map<PieceType, number>();
      for (const t of def?.enemy ?? []) cnt.set(t, (cnt.get(t) ?? 0) + 1);
      const foes = def ? `<span class="pb-foes">${[...cnt].map(([t, n]) => `<span class="pb-foe">${pieceImg(t, 1, 'small', 24)}${n > 1 ? `<i>×${n}</i>` : ''}</span>`).join('')}</span>` : '';
      const tags = def
        ? [`<span class="ribbon r-crimson">${MAP_TEXT.foes(def.enemy.length)}</span>`, ...(MAP_TEXT.reward[def.reward] ? [`<span class="ribbon">${MAP_TEXT.reward[def.reward]}</span>`] : []), ...[...(def.giants ?? []).map((g) => GIANTS[g].name), ...(def.process ? [PROCESS[def.process].name] : []), ...(def.marks ?? []).map((m) => FOE_MARKS[m].name), ...(def.forms ?? []).map((f) => `이형 ${FORMS[f].name}`), ...[...(def.traits ?? []), ...(/호위/.test(def.tell ?? '') ? ['guard'] : [])].map((t) => MAP_TEXT.trait[t] ?? FOE_TRAITS[t as keyof typeof FOE_TRAITS]?.name)].filter(Boolean).slice(0, 1).map((t) => `<span class="ribbon">${t}</span>`)].slice(0, 3).join('')
        : '';
      const name = `${NODE_NAMES[nd.kind]}${def?.foe ? ` · ${def.foe}` : def?.boss && def.bossRule ? ` · ${BOSS_RULES[def.bossRule].name}` : ''}`;
      // 낮은 범례 띠 → 높은 미리보기 띠는 처음 고를 때 한 번만 계단으로 자란다 (D-401)
      info.classList.add('open');
      info.innerHTML = `<i class="ico pb-ico" style="${iconArt(NODE_ICONS[nd.kind])}"></i><div class="pb-txt"><b class="pb-name">${name}</b>${def ? `<span class="pb-tags">${tags}</span>` : `<span class="pb-desc">${NODE_DESC[nd.kind]}</span>`}</div>${foes}<button class="btn k-brass pb-go" type="button" data-go>${MAP_TEXT.go}</button>`;
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
/** 장면 액자 위 황동 명패 조각 (UI-04 scene-frame-plate, D-391 다듬기) */
const SCENE_PLATE = new URL('../assets/ui/chrome/v2/scene-frame-plate.png', import.meta.url).href;
/** 정보 단추가 넘겨 보이는 쪽: 풀이(info) → 결과 줄에 든 용어(KEYWORDS, 기본 용어 나사 · 태엽 빼고) 하나씩. 왼쪽 효과 쪽지에서 넘김 */
const evPages = (c: SliceEventChoice): { who: string; text: string }[] => [
  ...(c.info ? [{ who: '풀이', text: c.info }] : []),
  ...KEYWORDS.filter(([name, , gate]) => gate !== 'base' && name.length >= 2 && !/[+×]/.test(name) && c.desc.includes(name)).map(([name, text]) => ({ who: name, text })),
];
/** 고르며 알고 치르는 나사 (D-402) — 결과 FX가 아니라 나사 꼬리표 숫자가 굴러 내려간다 */
const evPay = choicePay;
/**
 * 사건 창 (D-395 → D-402, 보고서 2026-11-09f 3.7 `.win-scene` — 흐름은 D-248 · D-260 · D-263 그대로).
 * 읽는 길은 Z (D-402, 사용자: 「단추가 왼쪽 아래라 부자연스럽다 — 눈은 오른쪽 아래에서 끝난다」):
 * 왼쪽 = 액자(받은 그림을 비율 그대로 덮고 초점 EVENT_FOCUS) + 그림 아래 서술 띠(먹 띠, 문장마다 줄바꿈) ·
 * 오른쪽 = 대사 칸(이름 한 줄 + 두 줄) → 선택지 판 ≤ 2(이름 + 결과 한 줄 · 세부는 정보 단추 → 왼쪽 효과 쪽지) →
 * 단추 줄 = 오른쪽 아래 끝에 단추 하나만(사용자: 고르는 동안 「무시하고 떠난다」 철 — 떠날 수 없는 사건이면 비움, 결과 뒤 「떠난다」 황동) ·
 * 위 테 = 명패(사건 이름) · 오른쪽 위 나사 꼬리표.
 * 판을 누르면 고름(판 -sel + NPC 반응 + 나사 꼬리표에 「나사 50 → 10」 + 단추 줄에 「한 번 더 누르면 고릅니다」), 같은 판을 다시 누르면 정함 — 예비 「고른다」 단추는 없다.
 * 정하면: 알고 치른 나사는 꼬리표 숫자가 계단으로 굴러 내려간다(결과 FX로 보이지 않는다) →
 * 1박 = 창을 덮는 결과 장면에 확률 장치 · 실제 카드 · 기물 · 지갑 위 FX만(바뀐 것이 없으면 건너뜀, 내용만큼 머물고 누르면 넘어감) →
 * 2박 = 선택지 자리에 결과 쪽지(무슨 일 ⑤ + 바뀐 것 ⑦) · 대사 칸에 NPC 마무리 · 오른쪽 아래 「떠난다」(부품이면 「고른다」).
 * 결과는 엔진(events.ts)이 먼저 정한다 — 화면은 보여 주기만 (UI 원칙 9). 고를 때까지 막을 눌러도 닫히지 않는다.
 */
const eventScreen = (id: (typeof SLICE_EVENT_IDS)[number]): void => {
  const ev = SLICE_EVENTS[id];
  const talk: EventTalk = EVENT_TALK[id] ?? { npc: ev.title, react: [], idle: [], win: '', bye: '', exit: '떠난다' };
  const st = (): EventState => ({ squad, deck, refined, gold, parts, charms });
  document.body.classList.add('between');
  placeBg('bg-event');
  const [fx, fy] = EVENT_FOCUS[id] ?? [0.5, 0.5];
  const leaveK = ev.choices.findIndex((c) => !c.desc);
  const choices = ev.choices
    .map((c, k) => {
      if (!c.desc) return '';
      const why = c.blocked?.(st()) ?? null;
      const info = !why && evPages(c).length ? `<button type="button" class="btn-info" aria-label="${c.label} 효과 설명" aria-expanded="false" data-info="${k}"></button>` : '';
      const pay = choicePay(c, st());
      // 확률 줄에 빠진 확정 비용도 고르기 전에 보인다. 이미 적힌 고정 비용은 중복하지 않는다.
      const cost = !why && pay > 0 && !/^나사 −\d/.test(c.desc) ? `<span class="choice-cost">${effectHtml(`나사 −${pay}`, ['loss'])}</span>` : '';
      return `<div class="ws-option${info ? ' has-info' : ''}"><button type="button" class="choice" data-slot="${k}"${why ? ' disabled' : ''}><span class="choice-head"><span class="choice-name">${c.label}</span>${cost}</span><span class="choice-res">${why ? effectNumbers(why) : effectHtml(c.desc, c.tones)}</span></button>${info}</div>`;
    })
    .join('');
  const el = openWin({
    size: 'l',
    cls: 'win-scene',
    title: ev.title,
    body: `<div class="ws-left"><div class="ws-art frame-scene"><div class="ws-pic"><img src="scenes/${id}.png" alt="" data-cover data-fx="${fx}" data-fy="${fy}"></div><img class="fs-plate" src="${SCENE_PLATE}" alt=""><div class="ws-cap"><p class="ws-narr" aria-live="polite"></p></div><section class="ws-detail" aria-label="선택 효과 설명" hidden><header><b class="ws-detail-title"></b><button type="button" class="ws-detail-close" aria-label="효과 설명 닫기">닫기</button></header><p class="ws-detail-text"></p><footer><span class="ws-detail-count"></span><button type="button" class="ws-detail-next">다음 설명</button></footer></section></div></div>
      <div class="ws-work"><div class="inset ws-say is-empty"><span class="who"></span><span class="ws-line"></span></div><div class="ws-choices">${choices}</div><div class="ws-sum slip" hidden><b class="ws-sum-h">결과</b><span class="ws-sum-n"></span><span class="ws-sum-i"></span></div>${btnRowHtml({ mid: EVENT_HINT.again, go: leaveK >= 0 ? { label: EVENT_HINT.leave, attrs: 'data-leave', kind: 'iron' } : undefined })}</div>
      <span class="tag ws-purse">나사 <b>${gold}</b></span>`,
  });
  // 같은 패널을 재사용해도 앞 사건의 결과/연출 상태를 다음 사건에 물려주지 않는다.
  el.classList.remove('ws-done', 'ws-beat', 'locked');
  const art = el.querySelector<HTMLImageElement>('.ws-pic > img[data-cover]')!;
  // 장면 그림이 없는 사건은 공용 사건 배경 (D-260)
  art.addEventListener('error', () => (art.src = 'scenes/bg-event.png'), { once: true });
  const fit = (): void => void (art.complete && coverArt(art));
  art.addEventListener('load', fit);
  fit();
  requestAnimationFrame(fit);
  void document.fonts?.ready.then(fit);
  const narrEl = el.querySelector<HTMLElement>('.ws-narr')!;
  const sayEl = el.querySelector<HTMLElement>('.ws-say')!;
  const choicesEl = el.querySelector<HTMLElement>('.ws-choices')!;
  const sumEl = el.querySelector<HTMLElement>('.ws-sum')!;
  const purse = el.querySelector<HTMLElement>('.ws-purse')!;
  const hint = el.querySelector<HTMLElement>('.ws-work > .btn-row > .mid')!;
  const leaveBtn = el.querySelector<HTMLButtonElement>('[data-leave]');
  hint.hidden = true;
  const alive = () => narrEl.isConnected;
  /** 서술(2인칭, 문장마다 줄바꿈 D-263) · NPC 대사(이름표 + 큰따옴표) · 독백(‘ ’, 이름표 없이) — 자리는 하나씩, 새 줄이 옛 줄을 갈아 쓴다 */
  const say = async (kind: 'narr' | 'npc', text: string, who?: string): Promise<void> => {
    if (!text || !alive()) return;
    // 괄호로 쓴 물건 「대사」는 묘사(⑤)다 — 이름표 없이 서술 띠로 (한 덩이 = 한 목소리)
    if (kind === 'npc' && /^\(.*\)$/.test(text)) return say('narr', text.slice(1, -1));
    if (kind === 'narr') {
      replay(narrEl, 'in');
      return typeIn(narrEl, text.replace(/([.!?…])\s+(?=\S)/g, '$1\n'), 22, undefined, alive);
    }
    const name = text.startsWith('‘') && !who ? '' : who ?? talk.npc;
    sayEl.classList.remove('is-empty', 'is-info');
    // 종이왕 독백 (#16 · P-B D-490): 말하는 NPC가 없는 사건은 종이왕 얼굴 + 이름표 — 오른쪽 위 칸이 비지 않는다
    const king = name === PAPER_KING_NAME;
    sayEl.classList.toggle('is-king', king);
    sayEl.querySelector('.who')!.textContent = name;
    sayEl.querySelector('.ws-face')?.remove();
    if (king) sayEl.insertAdjacentHTML('afterbegin', '<img class="ws-face" src="ui/hud/crew-K.png" alt="">');
    replay(sayEl, 'in');
    sfx('tap', 4);
    // 타자기 (D-403): 한 자 30ms · 문장 부호에서 쉼 · 누르면 바로 끝까지 (줄인 움직임이면 한 번에)
    await typeIn(sayEl.querySelector<HTMLElement>('.ws-line')!, text, 30, undefined, alive);
  };
  // 찍는 중인 줄을 누르면 바로 끝까지 — 대사 칸 · 서술 띠 · 결과 쪽지 글
  sayEl.addEventListener('click', () => typeSkip(sayEl.querySelector<HTMLElement>('.ws-line')!));
  el.querySelector<HTMLElement>('.ws-cap')!.addEventListener('click', () => typeSkip(narrEl));
  sumEl.addEventListener('click', () => typeSkip(sumEl.querySelector<HTMLElement>('.ws-sum-n')!));
  let busy = true;
  let idleN = 0;
  let lastAct = performance.now();
  const m = ev.text.match(/^(.*?)\s*(“[^”]+”)(.*)$/);
  // 말 없는 사건 (#16): 종이왕의 망설임 — 첫 줄은 서술 뒤 바로, 둘째 줄은 망설일 때 (그다음 사건의 묘사 idle)
  const ponder = !m && !talk.hi ? EVENT_PONDER[id] ?? [] : [];
  const idleLines: [string, string | undefined][] = [...ponder.slice(1).map((l): [string, string] => [l, PAPER_KING_NAME]), ...talk.idle.map((l): [string, undefined] => [l, undefined])];
  const idle = window.setInterval(() => {
    if (!alive()) return window.clearInterval(idle);
    if (busy || performance.now() - lastAct < 7000 || idleN >= idleLines.length) return;
    lastAct = performance.now();
    const [line, who] = idleLines[idleN++];
    void say('npc', line, who);
  }, 1000);
  const narr = m ? (m[1] + (m[3] ? ` ${m[3].trim()}` : '')).trim() : ev.text;
  el.classList.add('locked');
  void (async () => {
    await say('narr', narr);
    // 소개 대사: 사건 글 속 “ ” — 없으면 NPC의 첫 마디(hi)
    if (m) await say('npc', m[2]);
    else if (talk.hi) await say('npc', talk.hi);
    else if (ponder[0]) await say('npc', ponder[0], PAPER_KING_NAME);
    el.classList.remove('locked');
    busy = false;
    lastAct = performance.now();
  })();
  // 효과 설명은 왼쪽 장면에 붙인 별도 쪽지다. NPC 대사·타자기·선택 상태는 건드리지 않는다.
  const detail = el.querySelector<HTMLElement>('.ws-detail')!;
  let infoAt = { k: -1, i: 0 };
  const hideInfo = (): void => {
    detail.hidden = true;
    el.querySelectorAll('[data-info]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
    infoAt = { k: -1, i: 0 };
  };
  const showInfo = (k: number, i = 0): void => {
    const pages = evPages(ev.choices[k]);
    if (!pages.length) return;
    infoAt = { k, i: i % pages.length };
    const page = pages[infoAt.i];
    detail.querySelector('.ws-detail-title')!.textContent = ev.choices[k].label;
    detail.querySelector('.ws-detail-text')!.innerHTML = effectNumbers(page.text);
    detail.querySelector('.ws-detail-count')!.textContent = `${page.who === '풀이' ? '효과' : page.who} · ${infoAt.i + 1} / ${pages.length}`;
    detail.querySelector<HTMLButtonElement>('.ws-detail-next')!.hidden = pages.length < 2;
    el.querySelectorAll<HTMLElement>('[data-info]').forEach((b) => b.setAttribute('aria-expanded', String(Number(b.dataset.info) === k)));
    detail.hidden = false;
    replay(detail, 'in');
    lastAct = performance.now();
    sfx('tap', 3);
  };
  detail.querySelector('.ws-detail-close')!.addEventListener('click', hideInfo);
  detail.querySelector('.ws-detail-next')!.addEventListener('click', () => showInfo(infoAt.k, infoAt.i + 1));
  el.querySelectorAll<HTMLElement>('[data-info]').forEach((b) => b.addEventListener('click', () => {
    const k = Number(b.dataset.info);
    if (infoAt.k === k) hideInfo(); else showInfo(k);
  }));
  /** 결과 뒤 단추 줄 (D-402): 오른쪽 아래 끝에 황동 하나만 — 「무시하고 떠난다」 · 안내는 걷는다 */
  const finalGo = (label: string, go: () => void): void => {
    leaveBtn?.remove();
    hint.hidden = true;
    const row = el.querySelector<HTMLElement>('.ws-work > .btn-row')!;
    row.insertAdjacentHTML('beforeend', btnHtml({ label, attrs: 'data-final' }, 'go'));
    const g = row.lastElementChild as HTMLButtonElement;
    replay(g, 'up');
    g.addEventListener('click', () => (window.clearInterval(idle), go()), { once: true });
  };
  leaveBtn?.addEventListener('click', () => {
    if (busy) return;
    busy = true;
    el.classList.add('locked');
    window.clearInterval(idle);
    sfx('tap');
    choicesEl.hidden = true;
    hint.hidden = true;
    leaveBtn.disabled = true;
    void say('npc', talk.bye).then(() => alive() && window.setTimeout(advance, calmMs(700)));
  });
  const purseHtml = (v: number, to?: number): string => `나사 <b>${v}</b>${to === undefined || to === v ? '' : ` → <b class="${to < v ? 'loss' : ''}">${to}</b>`}`;
  bindPick(el, {
    onSelect: (key) => {
      hideInfo();
      const k = Number(key);
      lastAct = performance.now();
      sfx('lift');
      // 고르면 결과를 미리 (D-402): 판 강조(sel) · 나사 꼬리표에 알고 치를 값 「나사 50 → 10」 · 단추 줄에 「한 번 더 누르면 고릅니다」
      if (hint.hidden) { hint.hidden = false; replay(hint, 'in'); }
      const pay = Math.min(gold, evPay(ev.choices[k], st()));
      purse.innerHTML = purseHtml(gold, gold - pay);
      void say('npc', talk.react[k] ?? talk.react[talk.react.length - 1] ?? '');
    },
    onPick: (key) => {
      if (busy) return;
      busy = true;
      hideInfo();
      // 고른 뒤에는 판을 더 누를 수 없다 (창 전체를 막으면 결과 장면의 장치도 막힌다)
      choicesEl.inert = true;
      sfx('stamp');
      const k = Number(key);
      const c = ev.choices[k];
      if (leaveBtn) leaveBtn.hidden = true;
      hint.hidden = true;
      void (async () => {
        // 알고 치른 나사 (D-402, 사용자: 「고르며 알고 낸 나사까지 지갑 FX로 보일 필요는 없다」): 꼬리표 숫자만 계단으로 굴러 내려간다
        const pay = Math.min(gold, evPay(c, st()));
        purse.innerHTML = purseHtml(gold);
        if (pay) await rollNumber(purse.querySelector('b')!, gold, gold - pay, purse);
        // 쪽지(⑦)의 바뀐 것에는 치른 나사도 적는다 — 무엇이 바뀌었나의 기록
        const before = { crew: squad.map((u) => ({ ...u })), deck: [...deck], gold, charms: { ...charms }, parts: [...parts] };
        const s0 = st();
        const out = c.apply(s0, sub());
        // 저울추 (D-247): 같은 창 안에서 실제 카드를 고른다
        if (out.cardPick === 'counterweight') {
          const rid = await evCardPick(el, weighable(s0), talk.react[k] ?? '');
          counterweight(s0, rid, sub());
          out.text = '';
        }
        squad = s0.squad;
        deck = s0.deck;
        refined.splice(0, refined.length, ...s0.refined);
        gold = s0.gold;
        if (out.recruit) squad.push({ ...crewOf(out.recruit), ...(out.recruitQuirk ? { quirk: out.recruitQuirk } : {}) });
        // 바뀐 것 (D-260): 실제 카드 · 기물에 FX — 같은 바탕 카드끼리는 강화 · 녹, 나머지는 파괴 · 새 카드
        const minus = <T,>(a: T[], b: T[]) => { const r = [...b]; return a.filter((x) => { const i = r.indexOf(x); if (i < 0) return true; r.splice(i, 1); return false; }); };
        const outs = minus(before.deck, deck), ins = minus(deck, before.deck);
        const face = (cid: CommandId) => cardFace(cid, 'tabindex="-1" aria-hidden="true"');
        const cards: CardFx[] = [];
        for (const o of outs) {
          const j = ins.findIndex((x) => baseOf(x) === baseOf(o));
          if (j >= 0) { const n = ins.splice(j, 1)[0]; cards.push({ before: face(o), after: face(n), fx: isRusted(n) ? 'rust' : 'up' }); }
          else cards.push({ before: face(o), fx: 'break' });
        }
        for (const n of ins) cards.push({ after: face(n), fx: 'new' });
        const src = (t: PieceType) => `pieces/l-${t}0.png`;
        const crewFx: CrewFx[] = [];
        for (const u0 of before.crew) {
          const u1 = squad.find((x) => x.serial === u0.serial);
          const max = crewMaxHp(u0), hp0 = u0.hp ?? max;
          if (!u1) { crewFx.push({ src: src(u0.t), name: crewLabel(u0), hp0, hp1: 0, max, fx: 'die', card: crewFace(u0, hp0, max) }); continue; }
          const hp1 = u1.hp ?? crewMaxHp(u1);
          if (u1.t !== u0.t) crewFx.push({ src: src(u0.t), toSrc: src(u1.t), name: crewLabel(u1), hp0: Math.round((hp0 / max) * crewMaxHp(u1)), hp1, max: crewMaxHp(u1), fx: 'evolve', card: crewFace(u0, hp0, max), cardAfter: crewFace(u1, hp1, crewMaxHp(u1)) });
          else if (u1.quirk !== u0.quirk || (u1.temper ?? 0) !== (u0.temper ?? 0)) crewFx.push({ src: src(u1.t), name: crewLabel(u1), hp0: Math.round((hp0 / max) * crewMaxHp(u1)), hp1, max: crewMaxHp(u1), fx: 'up', tag: u1.quirk !== u0.quirk && u1.quirk ? QUIRKS[u1.quirk].name : `공격 ${(u1.temper ?? 0) >= (u0.temper ?? 0) ? '+' : '−'}${Math.abs((u1.temper ?? 0) - (u0.temper ?? 0))}`, card: crewFace(u0, hp0, max), cardAfter: crewFace(u1, hp1, crewMaxHp(u1)) });
          else if ((u1.doors ?? 0) > (u0.doors ?? 0)) crewFx.push({ src: src(u1.t), name: crewLabel(u1), hp0, hp1, max, fx: 'up', tag: `버팀 +${(u1.doors ?? 0) - (u0.doors ?? 0)}`, card: crewFace(u0, hp0, max), cardAfter: crewFace(u1, hp1, max) });
          else if (hp1 !== hp0 || (u1.cracked && !u0.cracked)) crewFx.push({ src: src(u1.t), name: crewLabel(u1), hp0, hp1, max, fx: u1.cracked && !u0.cracked ? 'crack' : 'hp', card: crewFace(u0, hp0, max), cardAfter: crewFace(u1, hp1, max) });
        }
        for (const u1 of squad) if (!before.crew.some((x) => x.serial === u1.serial)) crewFx.push({ src: src(u1.t), name: crewLabel(u1), hp0: u1.hp ?? crewMaxHp(u1), hp1: u1.hp ?? crewMaxHp(u1), max: crewMaxHp(u1), fx: 'new', card: crewFace(u1, u1.hp ?? crewMaxHp(u1), crewMaxHp(u1)) });
        // 좋은 결과: 확률 선택은 첫 칸(판정기는 둘째 칸 「한 단계 위」도 좋음), 아니면 좋다
        const good = out.slot === undefined || out.slot === 0 || (id === 'brokenGacha' && out.slot === 1);
        // 확률 장치는 셋만 (D-260): 동전 · 칸 셋 · 긁는 칸 셋
        const chance: Parameters<typeof runEventFx>[1]['chance'] =
          id === 'gambler' ? { kind: 'coin', win: good }
          : id === 'brokenGacha' ? { kind: 'slots', win: good, items: out.slot === 0 ? ['gear-gold', 'gear-gold', 'gear-gold'] : out.slot === 1 ? ['crown-gold', 'crown-gold', 'crown-gold'] : ['gear-gold', 'gear-gold', 'gear-broken'] }
          : id === 'auction' ? { kind: 'scratch', win: good, items: good ? ['gear-gold', 'gear-gold', 'gear-gold'] : ['gear-gold', 'gear-gold', 'rust'] }
          : undefined;
        const after = (): void => (out.givePart ? gainPart(out.givePart, () => advance()) : out.partPick ? partPick(SCREEN_TEXT.part, advance, !!out.elite, `<span class="ribbon">${ev.title}</span>`) : advance());
        // 1박 (D-402): 결과로 바뀐 것만(알고 치른 나사는 뺀다) — 없으면 건너뛰고 바로 쪽지
        const outGold = gold - (before.gold - pay);
        const things = cards.length + crewFx.length + (outGold ? 1 : 0) + (out.partPick ? 1 : 0);
        if (things || chance) {
          el.classList.add('ws-beat');
          await runEventFx(el, { id, good, chance, cards, crew: crewFx, tap: talk.tap, scene: art.currentSrc || art.src, focus: [fx, fy], gold: outGold, part: !!out.partPick, purse, goldAfter: gold, hold: EVENT_BEAT.hold + EVENT_BEAT.perThing * Math.max(0, things - 1) });
          if (!alive()) return;
          el.classList.remove('ws-beat');
        }
        // 2박 = 결과 쪽지(UI-25): 클립 아래 「결과」 → 무슨 일이 있었나(⑤ 두 줄) → 바뀐 것(⑦) · 대사 칸에 NPC 마무리 · 오른쪽 아래 「떠난다」
        const oc = EVENT_OUTCOME[id]?.[`${k}:${out.slot ?? 0}`];
        const sum = evSummary(before, cards, out);
        purse.innerHTML = purseHtml(gold);
        choicesEl.hidden = true;
        el.classList.add('ws-done');
        const items = sumEl.querySelector<HTMLElement>('.ws-sum-i')!;
        items.innerHTML = sum ? effectHtml(sum) : '';
        items.hidden = !sum;
        sumEl.hidden = false;
        replay(sumEl, 'in');
        if (good) sfx(out.partPick ? 'rare' : 'coin'); else sfx('hurt');
        const scene = (oc?.scene ?? out.text ?? '').replace(/^\((.*)\)$/, '$1');
        await typeIn(sumEl.querySelector<HTMLElement>('.ws-sum-n')!, scene.replace(/([.!?…])\s+(?=\S)/g, '$1\n'), 18, undefined, alive);
        await say('npc', oc?.line ?? (good ? talk.win : talk.lose ?? talk.win), oc?.who);
        finalGo(out.partPick ? '고른다' : '떠난다', after);
      })();
    },
  });
};
/** 줄인 움직임이면 기다림도 줄인다 */
const calmMs = (ms: number): number => (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? Math.min(ms, 120) : ms);
/**
 * 저울추 카드 고르기 (D-247 → D-395): 사건 창 안을 덮는 받침 없는 카드 줄(실제 카드 얼굴, 고르기 규칙 bindPick) + [올린다 황동].
 * 카드 아래 한 줄 = 태엽 n → n−1.
 */
const evCardPick = (panel: HTMLElement, ids: CommandId[], line: string): Promise<CommandId> =>
  new Promise((done) => {
    const ov = document.createElement('div');
    ov.className = 'ev-ov ev-cw';
    ov.innerHTML = `${line ? `<p class="ev-ov-say">${line}</p>` : ''}${slotsHtml(ids.map((x) => ({ key: x, html: cardFace(x, 'tabindex="-1" aria-hidden="true"'), info: `태엽 ${COMMANDS[x].cost} → <b>${COMMANDS[x].cost - 1}</b>` })), true)}${btnRowHtml({ go: { label: '올린다', attrs: 'data-pick' } })}`;
    panel.appendChild(ov);
    replay(ov, 'in');
    const row = ov.querySelector<HTMLElement>('.scr-items')!;
    const fitNow = (): void => fitSlots(row);
    fitNow();
    requestAnimationFrame(fitNow);
    bindPick(ov, { onSelect: () => sfx('lift'), onPick: (k) => { ov.classList.add('locked'); sfx('stamp'); pxOut(ov, () => ov.remove(), 240); done(k as CommandId); } });
  });

/** 사건 결과 요약 한 줄 (D-263): 앞뒤 상태를 비교해 바뀐 것만 — 카드 · 분대원 · 나사 · 부품 */
const evSummary = (before: { crew: Crew[]; deck: CommandId[]; gold: number; charms?: { revive: number; rewind: number }; parts?: SlicePartId[] }, cards: CardFx[], out: { partPick?: boolean; elite?: boolean; givePart?: SlicePartId }): string => {
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
    if (!u1) { sum.push(`${name} 폐기 (분대에서 빠짐)`); continue; }
    if (u1.t !== u0.t) sum.push(`${name} ${PIECE_NAMES_KO[u0.t]} → ${PIECE_NAMES_KO[u1.t]}`);
    if ((u1.doors ?? 0) > (u0.doors ?? 0)) sum.push(EVENT_SUM.life(name, (u1.doors ?? 0) - (u0.doors ?? 0)));
    if (u1.cracked && !u0.cracked) sum.push(EVENT_SUM.crack(name));
    if (u1.quirk !== u0.quirk && u1.quirk) sum.push(`${name} 기벽 → ${QUIRKS[u1.quirk].name} (${QUIRKS[u1.quirk].desc})`);
    if ((u1.temper ?? 0) !== (u0.temper ?? 0)) sum.push(`${name} 단련 · 공격 ${(u1.temper ?? 0) > (u0.temper ?? 0) ? '+' : '−'}${Math.abs((u1.temper ?? 0) - (u0.temper ?? 0))}`);
    // 기벽이 바뀐 HP 변화는 기벽 줄이 이미 말한다 (D-459)
    if (u1.t === u0.t && u1.quirk === u0.quirk) {
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
  // 녹인 부품 (D-464 교환소): 잃은 것이 먼저, 손실 색으로
  for (const id of before.parts ?? []) if (!parts.includes(id)) sum.push(`${SLICE_PARTS[id].name} 녹아 사라짐`);
  if (out.partPick) sum.push(out.elite ? '희귀 이상 부품 하나를 고른다' : '부품 하나를 고른다');
  if (out.givePart) sum.push(`부품 · ${SLICE_PARTS[out.givePart].name} (${SLICE_PARTS[out.givePart].desc})`);
  // 부적 · 녹인 부품 (D-464)
  if (before.charms && charms.rewind !== before.charms.rewind) sum.push(`${CHARMS.rewind.name} ${charms.rewind > before.charms.rewind ? '+' : '−'}${Math.abs(charms.rewind - before.charms.rewind)}`);
  if (before.charms && charms.revive !== before.charms.revive) sum.push(`${CHARMS.revive.name} ${charms.revive > before.charms.revive ? '+' : '−'}${Math.abs(charms.revive - before.charms.revive)}`);
  return sum.join(' · ');
};

/** 고물상 (R5-2 → D-394): 카드 4칸(부적이 나오면 한 칸) · 오른쪽 열 부품 · 서비스 둘. 여러 개 사도 된다, 떠난다로 끝 */
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
  // D-367: 카드 틀 그림 창 안 한 줄 — 「덱 [기물 그림] n · 돌격 n」
  // D-375: 그림 대신 기물 이름 — 「덱 폰 3 · 돌격 8」 (갈래 이름과 같은 글 문법)
  const bits = [t.who !== 'any' ? `${PIECE_NAMES_KO[t.who]} <b>${nWho}</b>` : '', `${STYLE_NAMES[t.style]} <b>${nSty}</b>`].filter(Boolean);
  return { text: `덱 ${bits.join(' · ')}`, tone: nWho + nSty >= 4 ? 'good' : 'mid' };
};
const shopScreen = (): void => {
  // 장소 배경 (D-200): 녹슨 룩의 고물상 BG-01 — 그림은 화면 바탕, 앞에 진열대 (D-394 .scr-place 바탕형)
  document.body.classList.add('between');
  placeBg('bg-shop');
  const rng = sub();
  const pool = REWARD_COMMANDS.filter((id) => usable(id) && isOpen(id));
  const cards: CommandId[] = [];
  while (cards.length < SHOP.cards && pool.length) cards.push(pool.splice(rng.int(pool.length), 1)[0]);
  const partPool = (Object.keys(SLICE_PARTS) as SlicePartId[]).filter((id) => !parts.includes(id) && isOpen(id) && partFits(id, squad.map((u) => u.t), parts, squad));
  // D-431: 매 출하 첫 상점의 일반 보조품. 혼성의 null 축도 실제 기능군으로 연결한다.
  const from = firstShopParts(partPool, parts, shopsSeen);
  const part = from.length ? from[rng.int(from.length)] : null;
  shopsSeen += 1;
  if (shopsSeen === 1) ftue('first_shop');
  const sold = new Set<string>();
  // 부적 (D-228): 카드처럼 가끔 진열대 한 칸에 — 나오면 카드 하나 자리를 차지한다 (사용자: 「드물게 등장하는 카드처럼」)
  const charmRoll = rng.next();
  const charmOffer = charmRoll < CHARM_NUM.shopReviveChance ? 'revive' : charmRoll < CHARM_NUM.shopReviveChance + CHARM_NUM.shopRewindChance ? 'rewind' : null;
  if (charmOffer) cards.pop();
  // 값은 등급으로 (D-217 3 — 슬더스식): 일반 · 희귀 · 황금
  // 서비스는 셋 중 둘만 (D-247) — 같은 고물상에서 다듬기 · 빼기 · 정비를 다 누리지 못한다
  const svcAll = ['heal', 'refine', 'remove'] as const;
  const svcShown = new Set<string>();
  while (svcShown.size < Math.min(ECON.shopSvc, svcAll.length)) svcShown.add(svcAll[rng.int(svcAll.length)]);
  const refinePrice = () => ascPrice(SHOP.refinePrice + ECON.svcStep * svcUsed.refine);
  const removePrice = () => ascPrice(SHOP.removePrice + ECON.svcStep * svcUsed.remove);
  const price = (id: CommandId) => ascPrice(SHOP.gradePrice[gradeOf(id)]);
  const partPrice = (id: SlicePartId) => ascPrice(SHOP.partGradePrice[PART_GRADE[id] ?? 'common']);
  const healPct = Math.round(SHOP.healPct * 100);
  /** 열쇠 = card:id · part:id · heal · refine · remove · rewind · revive */
  const keyOf = (k: string): string => (k.startsWith('card:') ? k.slice(5) : k.startsWith('part:') ? 'part' : k);
  const costOf = (k: string): number => {
    const [kind, id] = k.split(':');
    return kind === 'card' ? price(id as CommandId) : kind === 'part' ? partPrice(id as SlicePartId) : kind === 'heal' ? ascPrice(SHOP.healPrice) : kind === 'refine' ? refinePrice() : kind === 'rewind' ? ascPrice(CHARM_NUM.shopRewindPrice) : kind === 'revive' ? ascPrice(CHARM_NUM.shopRevivePrice) : removePrice();
  };
  /** 고른 물건 풀이 (단추 줄 가운데, 12px 두 줄까지) */
  const detail = (k: string): string => {
    const [kind, id] = k.split(':');
    if (kind === 'card') return `${COMMANDS[id as CommandId].name} — 덱에 한 장`;
    if (kind === 'part') return `${SLICE_PARTS[id as SlicePartId].name} — ${SLICE_PARTS[id as SlicePartId].desc}`;
    if (kind === 'rewind' || kind === 'revive') return `${CHARMS[kind].name} — 부적`;
    return svcLine(kind as SvcKey, healPct);
  };
  /**
   * 진열대 (D-399): 카드 · 부품 · 부적 · 손질(상아 카드)이 모두 같은 크기 카드로 한 줄 — 넘치면 가로로 민다.
   * 가격 꼬리표는 카드 오른쪽 위 모서리(모자라면 · 팔림 = 진홍), 카드 아래 한 줄은 덱 맞물림.
   */
  const render = (): void => {
    const tag = (k: string): string => (sold.has(keyOf(k)) ? `<span class="tag tag-crimson">${SCREEN_TEXT.sold}</span>` : `<span class="tag${gold < costOf(k) ? ' tag-crimson' : ''}">나사 ${costOf(k)}</span>`);
    const items: PickItem[] = cards.map((id) => ({ key: `card:${id}`, html: cardFace(id, '') + tag(`card:${id}`), info: fitInfo('card', id), off: sold.has(id) }));
    if (part) items.push({ key: `part:${part}`, html: partFace(part, '') + tag(`part:${part}`), info: fitInfo('part', part), off: sold.has('part') });
    if (charmOffer)
      items.push({ key: charmOffer, html: `<div class="cf part-card svc ${charmOffer === 'revive' ? 'g-gold' : 'g-rare'}"><b class="cf-name">${CHARMS[charmOffer].name}</b><span class="cf-win"><i class="ico" style="${iconArt(CHARMS[charmOffer].icon)}"></i></span><span class="cf-type"><span class="t3"><i>부적</i></span></span><small class="cf-desc">${descLines(CHARMS[charmOffer].desc)}</small></div>${tag(charmOffer)}`, info: '', off: sold.has(charmOffer) });
    for (const k of svcAll) if (svcShown.has(k)) items.push({ key: k, html: svcFace(k, healPct) + tag(k), info: '', off: sold.has(k) });
    const el = placeScreen({
      art: 'bg-shop',
      focus: [0.72, 0.45],
      backdrop: true,
      title: SCREEN_TEXT.shop,
      wallet: gold,
      cls: 'scr-shop',
      body: slotsHtml(items, true),
      back: { label: SCREEN_TEXT.leave, attrs: 'data-leave' },
      go: { label: SCREEN_TEXT.buy, attrs: 'data-pick' },
      mid: `<p class="note shop-say">${SCREEN_TEXT.shopHint}</p>`,
    });
    el.querySelector('[data-leave]')!.addEventListener('click', advance);
    const say = el.querySelector<HTMLElement>('.shop-say')!;
    const go = el.querySelector<HTMLButtonElement>('[data-pick]')!;
    bindPick(el, {
      onSelect: (k) => {
        sfx('lift');
        say.textContent = detail(k);
        go.disabled = sold.has(keyOf(k)) || gold < costOf(k);
      },
      onPick: (k, btn) => {
        const [kind, id] = k.split(':');
        const key = keyOf(k);
        if (sold.has(key)) return;
        const cost = costOf(k);
        if (gold < cost) return void (nope(btn), toast(`‘나사가 모자라.’ (${cost} 필요)`));
        // 나사로 다듬기 (D-218): 고르면 값을 치르고 고물상으로 돌아온다 · 빼기 · 부품 칸 가득은 그쪽 화면에서 정한 뒤 값을 치른다
        if (kind === 'refine') return refineScreen(render, () => { gold -= cost; svcUsed.refine += 1; sold.add(key); render(); }, 'shop');
        if (kind === 'remove') return deckView('remove', (removed) => { if (removed) { gold -= cost; svcUsed.remove += 1; sold.add(key); } render(); });
        if (kind === 'part') return takeFx(btn, () => gainPart(id as SlicePartId, (took) => { if (took) { gold -= cost; sold.add(key); sfx('coin'); } render(); }), true);
        takeFx(btn, () => {
          gold -= cost;
          sold.add(key);
          sfx('coin');
          if (kind === 'card') deck.push(id as CommandId);
          if (kind === 'rewind' || kind === 'revive') charms[kind] += 1;
          if (kind === 'heal') squad = squad.map((u) => ({ ...u, hp: Math.min(crewMaxHp(u), (u.hp ?? crewMaxHp(u)) + Math.round(crewMaxHp(u) * SHOP.healPct)) }));
          const left = $('overlay-panel').querySelector<HTMLElement>('.scr-items')?.scrollLeft ?? 0;
          render();
          // 다시 그려도 레일 자리를 지킨다
          const row = $('overlay-panel').querySelector<HTMLElement>('.scr-items');
          if (row) requestAnimationFrame(() => (row.scrollLeft = left));
          // 구매 · 회복 (D-189): 나사가 날아와 꽂히고 물건이 튄다 / 정비는 초록 고리 · 십자 반짝이
          const got = $('overlay-panel').querySelector<HTMLElement>(`[data-slot="${k}"]`);
          if (kind === 'heal') healFx(got, `HP +${healPct}%`);
          else buyFx(got, $('overlay-panel').querySelector('[data-wallet]'));
        }, true);
      },
    });
  };
  render();
};

/** 작업대 (R5-2): 넷 중 하나 — 다듬기(한 장 태엽 −1) · 카드 빼기 · 수리(분대 전원 HP +40%) · 보강 */
/** 종막 최종 정비 (D-252): 들어오면 분대 HP 가득 */
let forgeFinal = false;
/** 작업대 보강 (D-319): 분대원 하나 — 버팀 +FORGE.braceDoors (최대치 · 남은 수 둘 다, 킹 제외) */
const braceScreen = (): void => {
  const list = squad.map((u, i) => ({ u, i })).filter(({ u }) => u.t !== 'K');
  pickScreen({
    title: SCREEN_TEXT.brace,
    items: list.map(({ u, i }) => ({ key: String(i), html: crewCard(u, { hp: u.hp ?? crewMaxHp(u), max: crewMaxHp(u) }), info: `<span>버팀 ${braceLeft(u)} → <b>${braceLeft(u) + FORGE.braceDoors}</b></span>` })),
    skip: { label: SCREEN_TEXT.stop, attrs: 'data-back' },
    go: { label: SCREEN_TEXT.braceGo },
    onSelect: () => sfx('lift'),
    onPick: (k, slot) =>
      takeFx(slot, () => {
        const i = Number(k);
        squad[i] = { ...squad[i], doors: (squad[i].doors ?? 0) + FORGE.braceDoors };
        sfx('stamp');
        toast(`${squad[i].name ?? PIECE_NAMES_KO[squad[i].t]}의 축이 두꺼워졌다. (버팀 +${FORGE.braceDoors})`);
        window.setTimeout(advance, 300);
      }),
  }).querySelector('[data-back]')!.addEventListener('click', forgeScreen);
};
const forgeScreen = (): void => {
  // 장소 (D-200 · D-394): 외눈 정비공의 작업대 BG-02 — 왼쪽 그림(정비공 초점) · 오른쪽 선택지 판 넷
  document.body.classList.add('between');
  placeBg('bg-forge');
  // 작업대에 들르면 깨진 심장 톱니를 모두 새로 끼운다 (D-219 — 고르지 않아도 된다)
  const mend = mendSquad(squad);
  squad = mend.squad;
  if (mend.mended.length) window.setTimeout(() => toast(LIFE_TEXT.mended(mend.mended.map((u) => u.name ?? '').join(' · ')), 2600), 500);
  // 출하 씨앗을 한 번 굴린다 (예전 「셋 중 둘」 — 이어하기에서 같은 씨앗 흐름을 지킨다)
  sub().int(3);
  if (forgeFinal) squad = squad.map((u) => ({ ...u, hp: crewMaxHp(u) }));
  // 최종 정비 (각본 S5): 외눈 정비공의 마지막 말
  if (forgeFinal) window.setTimeout(() => toast(GILDED_STORY.forge.map((l) => `${l.who} “${l.t}”`).join(' '), 4200), 600);
  // 손질 카드 넷 (D-399): 고물상과 같은 상아 카드 한 줄 — 바탕은 정비공 그림(덮기 + 디더), 넘치면 가로로 민다
  const repairPct = Math.round(FORGE.repairPct * 100);
  const keys: SvcKey[] = ['refine', 'remove', 'repair', ...(squad.some((u) => u.t !== 'K') ? (['brace'] as const) : [])];
  const items: PickItem[] = keys.map((k) => ({ key: k, html: svcFace(k, k === 'repair' ? repairPct : k === 'brace' ? FORGE.braceDoors : 0), info: forgeStatus(k) }));
  const el = placeScreen({
    art: 'bg-forge',
    focus: [0.22, 0.4],
    backdrop: true,
    title: forgeFinal ? SCREEN_TEXT.forgeFinal : SCREEN_TEXT.forge,
    tag: forgeFinal ? `<span class="tag">${SCREEN_TEXT.fullHp}</span>` : '',
    cls: 'scr-forge',
    body: slotsHtml(items, true),
    back: { label: SCREEN_TEXT.leave, attrs: 'data-leave' },
    go: { label: SCREEN_TEXT.pick, attrs: 'data-pick' },
    mid: `<p class="note shop-say">${SCREEN_TEXT.forgeHint}</p>`,
  });
  el.querySelector('[data-leave]')!.addEventListener('click', advance);
  const say = el.querySelector<HTMLElement>('.shop-say')!;
  bindPick(el, {
    onSelect: (k) => {
      sfx('lift');
      say.textContent = svcLine(k as SvcKey, k === 'repair' ? repairPct : FORGE.braceDoors);
    },
    onPick: (k, btn) => {
      if (k === 'brace') return braceScreen();
      if (k === 'remove') return deckView('remove', (removed) => (removed ? advance() : forgeScreen()));
      if (k === 'refine') return refineScreen();
      squad = squad.map((u) => ({ ...u, hp: Math.min(crewMaxHp(u), (u.hp ?? crewMaxHp(u)) + Math.round(crewMaxHp(u) * FORGE.repairPct)) }));
      sfx('awaken');
      healFx(btn, `HP +${repairPct}%`);
      toast(`분대 전원 HP +${repairPct}%`);
      takeFx(btn, () => window.setTimeout(advance, 300));
    },
  });
};

/**
 * 작업대 손질 카드 아래 내 현황 (D-471, 사용자 지적 「고르기 전에 각 카드에 맞는 내 현황」): 다듬을 카드 수 · 덱 장수 · 분대 HP · 가장 적은 버팀.
 * 좋음/나쁨은 색 + 글로 (UI 원칙 4).
 */
const refinable = (): CommandId[] => [...new Set(deck)].filter((id) => !isRefined(id) && COMMANDS[id].cost >= 1);
const forgeStatus = (k: SvcKey): string => {
  const T = SCREEN_TEXT.forgeStatus;
  if (k === 'refine') { const n = refinable().length; return `<span class="${n ? 'mid' : 'bad'}">${T.refine} <b>${n}</b>${T.cards}</span>`; }
  if (k === 'remove') return `<span class="mid">${T.deck} <b>${deck.length}</b>${T.cards}</span>`;
  if (k === 'repair') {
    const max = squad.reduce((a, u) => a + crewMaxHp(u), 0), hp = squad.reduce((a, u) => a + Math.min(crewMaxHp(u), u.hp ?? crewMaxHp(u)), 0);
    const pct = Math.round((hp / Math.max(1, max)) * 100), hurt = squad.filter((u) => (u.hp ?? crewMaxHp(u)) < crewMaxHp(u)).length;
    return `<span class="${pct < 50 ? 'bad' : pct < 85 ? 'mid' : 'good'}">${T.hp} <b>${pct}%</b> · ${T.hurt} <b>${hurt}</b></span>`;
  }
  if (k === 'brace') { const crew = squad.filter((u) => u.t !== 'K'); const low = Math.min(...crew.map((u) => braceLeft(u))); return `<span class="${low ? 'mid' : 'bad'}">${T.doors} <b>${low}</b></span>`; }
  return '';
};

/** 다듬기 화면 — back = 그만두면 돌아갈 곳, done = 다듬은 뒤 (작업대: 다음 노드로 · 고물상: 값을 치르고 고물상으로, D-218) */
const refineScreen = (back: () => void = forgeScreen, done: () => void = advance, who: keyof typeof REFINE_TALK = 'forge'): void =>
  pickCardScreen(SCREEN_TEXT.refine, `<span class="who">${REFINE_TALK[who].npc}</span>${REFINE_TALK[who].line}`, refinable(), (rid) => {
    deck[deck.indexOf(rid)] = refineOnce(rid);
    refined.push(rid);
    sfx('stamp');
    toast(`${COMMANDS[rid].name} 한 장 — 태엽 −1`);
    window.setTimeout(done, 300);
  }, back, SCREEN_TEXT.refineGo);

/** 덱에 같은 카드가 몇 장 · 쓸 기물이 없으면 그것부터 (D-471) */
const copiesInfo = (id: CommandId): string => {
  const who = COMMANDS[id].who;
  if (who && who !== 'K' && who !== 'any' && !squad.some((u) => u.t === who)) return `<span class="bad">분대에 ${PIECE_NAMES_KO[who]} 없음</span>`;
  return `<span class="mid">덱 <b>${deck.filter((d) => d === id).length}</b>장</span>`;
};
/**
 * 카드 한 장 고르기 (다듬기): 고르기 화면(.scr-pick) — 받침 아래 「태엽 2 → 1」 (D-245 → D-394). 확인 창 없음.
 */
const pickCardScreen = (title: string, say: string, ids: CommandId[], onPick: (id: CommandId) => void, back: () => void, verb: string): void => {
  pickScreen({
    title,
    say: ids.length ? `<span class="say">${say}</span>` : SCREEN_TEXT.noCards,
    // D-471: 다듬기 전에 그 카드의 내 현황 — 덱에 몇 장 · 쓸 기물이 분대에 있는가
    items: ids.map((id) => ({ key: id, html: cardFace(id, ''), info: `<span>태엽 ${COMMANDS[id].cost} → <b>${COMMANDS[id].cost - 1}</b></span> ${copiesInfo(id)}` })),
    skip: { label: SCREEN_TEXT.stop, attrs: 'data-back' },
    go: { label: verb },
    onSelect: () => sfx('lift'),
    // 다듬기는 화면 하나에 한 장 (#20): 잠금이 풀린 뒤 다음 화면이 뜨기 전 다시 누르면 같은 종류 두 장이 다 다듬어졌다
    onPick: (id, slot) => { if (!$('overlay-panel').classList.contains('locked') && claimScreen(screenKey())) takeFx(slot, () => onPick(id as CommandId), true); },
  }).querySelector('[data-back]')!.addEventListener('click', back);
};

/**
 * 막 소개 타이틀 카드 (D-388 · D-389 · D-397, 보고서 2026-11-09f 2-1 · 3.10): 팝업이 아니라 영화식 —
 * 막 그림이 위를 채우고(비율 그대로 기기 픽셀 정수배로 덮기, coverArt) 아래 먹 바닥에 막 꼬리표 → 막 이름 36 → 자막 띠 두 줄(서술 + 독백) · ▼.
 * 철문 전환으로 열고 닫는다. 누르면 넘어가고, 다 찍힌 뒤 읽을 시간(글자당 60ms, 최소 2.4초)이 지나면 저절로 (D-263).
 */
const actCard = (label: string, name: string, narr: string, art: string): Promise<void> =>
  new Promise((resolve) => {
    const el = document.createElement('div');
    el.className = 'actcard kit';
    // 받을 그림이 아직 없으면 그 막의 기본 그림 (D-451: 3막 「안쪽에서 잠긴 문」 발주 중)
    el.innerHTML = `<div class="ac-art"><img src="scenes/${art}.png" alt="" data-cover data-fx="0.5" data-fy="0.42" onerror="this.onerror=null;this.src='scenes/act-${Math.min(4, actI + 1)}.png'"></div><div class="ac-floor"><span class="ribbon">${label}</span><h1 class="ac-name">${name}</h1></div>${cutChromeHtml()}`;
    const sub = el.querySelector<HTMLElement>('.cut-sub')!;
    sub.classList.add('typing');
    const lines: CutLine[] = narr.split('\n').filter(Boolean).map((t) => (/^‘.*’$/.test(t) ? { k: 'm', t: t.slice(1, -1) } : { k: 'n', t }));
    const img = el.querySelector<HTMLImageElement>('.ac-art > img')!;
    const fit = (): void => void (img.complete && coverArt(img));
    img.addEventListener('load', fit);
    const T: number[] = [];
    void shutter(() => {
      document.body.appendChild(el);
      fit();
      requestAnimationFrame(fit);
      el.classList.add('run');
      T.push(window.setTimeout(() => { sfx('stamp'); el.classList.add('named'); }, 260));
      T.push(window.setTimeout(async () => {
        const box = el.querySelector<HTMLElement>('.cut-lines')!;
        await typeCutPages(box, lines, () => !done, (p, html) => typeIn(p, html, 24, undefined, () => !done));
        sub.classList.remove('typing');
      }, 520));
    });
    let done = false;
    const close = (): void => {
      if (done) return;
      done = true;
      T.forEach(clearTimeout);
      void shutter(async () => {
        el.remove();
        // 막 넘김 = 로딩 (P-C D-502, 후기 #5): 닫힌 철문 위에 안내서 한 쪽
        if (!labMode) await showTip('act');
        // 입력 위생 (페르소나 테스트 m4): 넘긴 탭이 곧바로 다음 화면의 물건을 고르지 않게 잠깐 막는다
        gateUntil = performance.now() + 350;
        resolve();
        return new Promise((r) => window.setTimeout(r, 80));
      });
    };
    window.setTimeout(() => el.addEventListener('click', close), 800);
    window.setTimeout(close, 520 + narr.length * 24 + Math.max(2400, narr.length * 70));
  });
/** 대국 들어가기: 반장 = 등장 컷(bossintro) · 그 밖 = 철문 전환 뒤 판 위 띠 한 번 (D-388) */
const stageIntro = (def: BattleDef): Promise<void> => {
  const [label, name] = def.title.split(' — ');
  // 반장은 따로 (D-249): 오른쪽 끝 초상 · 디더 경계 · 경계선 FX
  if (def.boss) {
    const real = def.bossRule ?? 'plate';
    const rule = real as BossKey;
    // 수배판 (D-400 UI-21): HP · 공격 수치 칸, 2단계가 있으면(승급 ≤ upTo) 진홍 빛 줄 상태
    const ek = b.s.pieces.find((p) => p.side === 1 && p.type === 'K');
    const two = asc <= BOSS_PHASE_TEXT.upTo;
    return bossIntro({ stats: ek ? { hp: ek.maxHp, atk: ek.atk } : undefined, phase2: two, rule, art: real === 'gilded' ? gildedArt() : BOSS_ART[real], act: label, name: BOSS_RULES[real].name, title: BOSS_EPITHET[real], lines: BOSS_CARD[real === 'gilded' ? (runMode === 'story' && storyChapter > 0 ? 'gilded+' : 'gilded') : (real as StoryBoss)], rules: two ? [...BOSS_RULES[real].lines, BOSS_PHASE_TEXT.rule] : BOSS_RULES[real].lines, sfx: (k) => sfx(k as never) });
  }
  // 대국 · 검문은 진입 창(모달)을 띄우지 않는다 (D-388, 사용자: 「배경에 기물 얹는 진입 창 자체가 최악」 · /game-ui-design 0장: 행동이 없는 정보 = 모달 금지).
  // 정보(적 명단 · 규칙 · 보상)는 지도에서 노드를 고를 때 미리 보여 주고, 들어갈 때는 철문 전환 뒤 판 위 띠 한 번만 (⑨ 표지).
  // 대국 이름 띠 다음에 배치 턴 띠 (D-454 — 첫 턴은 서로 피해 25%)
  // 로딩 쪽지 (P-C D-502, 후기 #5): 철문이 닫힌 사이 안내서 한 쪽 — 안 본 쪽이 남았으면 늘, 다 봤으면 몇 번에 한 번
  return shutter(async () => { if (!labMode && tipDue('battle')) await showTip('battle'); }).then(() => void window.setTimeout(() => { band(name ? `${label} · ${name}` : label, 'brass'); band(HUD_TEXT.heatBand(1, b.s.heat ?? 1), 'brass'); }, 120));
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

/** 지금 창의 뿌리 (화면이 새로 그려지면 바뀐다) — 고르기 확정을 한 번만 받는 열쇠 (once.ts) */
const screenKey = (): Element | null => $('overlay-panel').firstElementChild;
const claimScreen = claimOnce();
/** 건너뛰기 단추도 화면 하나에 한 번 */
const onceSkip = (fn: () => void) => (): void => { if (claimScreen(screenKey())) fn(); };

/** 승패 띠 (대국이 끝난 순간 화면을 가로지른다) */
const banner = (text: string, good: boolean): Promise<void> => koBanner(text, good);

/**
 * 고르기 확정 연출 (D-184 · D-394 — 확인 창을 없앴다, 고르기는 같은 받침을 두 번 누르거나 황동 단추):
 * 안 고른 카드는 아래부터 도트로 흩어지고, 고른 카드 · 부품은 덱 · 부품 칸으로 빨려 든다. keep = 고물상 · 다듬기(나머지는 그대로).
 * 확정 중에는 화면을 잠가 두 번 확정되지 않게 한다.
 */
const takeFx = (slot: HTMLElement, then: () => void, keep = false): void => {
  const panel = $('overlay-panel');
  if (panel.classList.contains('locked')) return;
  // 확정은 화면 하나에 한 번 (기록-1): 잠금이 풀린 뒤 남은 창을 다시 눌러도 두 번 들어가지 않는다. keep(고물상 · 다듬기)은 여러 번 산다
  if (!keep && !claimScreen(screenKey())) return;
  panel.classList.add('locked');
  sfx('rare');
  const face = slot.matches('.cf') ? slot : slot.querySelector<HTMLElement>(':scope > .cf');
  // 1.1.1 테스터: 고른 카드가 창에 가려진 레일로 작게 날아가고, 나머지는 검은 덩어리로 무너지며 받침 아래 줄만 남아 어색했다 →
  // 고르지 않은 받침은 받침 아래 줄까지 통째로 도트 디더 퇴장, 고른 것은 제자리에서 들렸다 눌리며(예비 → 터짐 → 출렁) 불똥.
  if (!keep) {
    const hide = (x: HTMLElement): void => pxOut(x, () => (x.style.visibility = 'hidden'), 240);
    const items = [...panel.querySelectorAll<HTMLElement>('.pick-item')];
    const pool = items.length ? items : [...panel.querySelectorAll<HTMLElement>('[data-slot]')];
    pool.filter((x) => !face || !x.contains(face)).forEach(hide);
    pool.find((x) => face && x.contains(face))?.querySelectorAll<HTMLElement>('.slot-info').forEach(hide);
  }
  if (face) {
    replay(face, 'taken');
    const r = face.getBoundingClientRect();
    window.setTimeout(() => sparksAt(r.left + r.width / 2, r.top + r.height / 2, 14, 60), 160);
  }
  window.setTimeout(() => {
    panel.classList.remove('locked');
    then();
  }, 620);
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
/** 창 틀 클래스 (키트 창 → 옛 창으로 바뀔 때 걷어 낸다) */
let panelCls: string[] = [];
const openOverlay = (html: string, cls = ''): HTMLElement => {
  clearPeeks();
  const panel = $('overlay-panel');
  // 키트 창(openWin)이 아니면 막 · Esc 닫기와 틀 클래스를 걷는다 (D-391)
  if (!cls) dropWinDismiss();
  panel.classList.remove(...panelCls);
  panelCls = cls.split(' ').filter(Boolean);
  panel.classList.add(...panelCls);
  panel.innerHTML = html;
  keepNumbers(panel);
  const wasHidden = $('overlay').hidden || panel.classList.contains('m3out');
  $('overlay').hidden = false;
  // 떨어져 박혀 출렁 · 리벳 (D-189) — 이미 열린 창의 내용만 바뀔 때는 그대로
  if (wasHidden) modalIn($('overlay'), panel);
  // 도장은 내리꽂혀 잉크가 튄다
  panel.querySelectorAll<HTMLElement>('.stamp-big').forEach(stampFx);
  return panel;
};
/**
 * 카드 본문 줄 검사 (D-377 → D-488): 글자를 줄이지 않는다(D-422) — 줄은 데이터 단계에서 한 행 폭(ROW_PX)으로 접혀 온다(`wrapRows`).
 * 그래도 넘치는 줄은 `data-over`로 표시만 한다 (화면 검사가 잡는다 — tools 스캔 · 테스트). 카드 폭이 바뀌면 다시 잰다.
 */
const fitLines = (d: HTMLElement): void => {
  d.querySelectorAll<HTMLElement>('.ln').forEach((ln) => {
    ln.classList.remove('s10', 'tight');
    ln.style.transform = '';
    ln.toggleAttribute('data-over', ln.scrollWidth > ln.clientWidth + 1);
  });
};
const lineWatch = new ResizeObserver((es) => es.forEach((e) => fitLines(e.target as HTMLElement)));
const fitCardDesc = (card: HTMLElement): void => {
  const d = card.querySelector<HTMLElement>('.cf-desc');
  if (!d || !card.offsetParent) return;
  card.dataset.fit = '1';
  fitLines(d);
  lineWatch.observe(d);
};
const fitAll = (): void => {
  document.querySelectorAll<HTMLElement>('.cf:not([data-fit])').forEach(fitCardDesc);
};
new MutationObserver(() => requestAnimationFrame(fitAll)).observe(document.body, { childList: true, subtree: true });
// 글꼴이 늦게 오면 잰 높이가 틀린다 — 다 온 뒤 한 번 더
void document.fonts?.ready.then(() => document.querySelectorAll<HTMLElement>('.cf[data-fit]').forEach(fitCardDesc));
/** 디버그: 보상에 새 분대원을 꼭 섞는다 (화면 점검용) */
let debugRecruit = false;
/** 창 닫기: 가로로 접혀 사라진다 (D-189). 접히는 사이 다시 열리면 취소된다 */
const closeOverlay = (): void => {
  clearPeeks();
  dropWinDismiss();
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
/** 반장 격파 컷 (바이블 BOS-격파 · D-451 불살): 쓰러짐 · 살려 두고 지나감(서술) → 반장의 저주 섞인 예언 → 종이왕의 대답 → 승천 · 몇 번째 반장인가에 따른 속마음(STG-PROG). 받은 그림이 있으면 그것, 없으면 초상 */
const bossFallCut = async (rule: StoryBoss): Promise<void> => {
  const st = BOSS_STORY[rule];
  const fallImg = await new Promise<string>((res) => { const im = new Image(); im.onload = () => res(`boss-fall-${rule}`); im.onerror = () => res(BOSS_ART[rule]); im.src = `scenes/boss-fall-${rule}.png`; });
  if (runMode !== 'story') return;
  await playCuts([{ img: fallImg, bg: ['#16141c', '#0b0b0e'], glow: '#e5262f', art: [{ t: 'K', side: 1, x: 50, y: 58, h: 44, dim: true }], lines: [...st.fall.split('\n').map((t) => ({ k: 'n' as const, t })), { k: 's' as const, who: st.name, t: st.temptation }, { k: 's' as const, who: '종이왕', t: st.reply }, { k: 'm' as const, t: stageProg(runBosses.length, storyChapter) }] }]);
};
const finishNow = (): void => {
  // 연습 시험대 A · B는 출하 밖 — 정산 · 보상 · 기록 없이 (대본이 다음 판으로 넘긴다)
  if (cur.drill && !INTRO.includes(cur)) return;
  const isWin = b.s.winner === 0;
  if (!labMode && runLive) {
    const hpEnd = b.s.pieces.filter((p) => p.side === 0).reduce((a, p) => a + Math.max(0, p.hp), 0);
    track('battle_result', { ...where(), enemy_id: cur.title, win: isWin, turns: b.turn, hp_lost: Math.max(0, hpAtStart - hpEnd), pieces_lost: b.falls.length, is_gameover: !isWin && charms.revive <= 0, rewinds_used: rewindsAtStart - b.rewinds });
    track('telegraph_resolution', { ...where(), telegraph_count: tg.telegraph, hit_count: tg.hit, pure_evade_count: tg.evade, counter_hit_count: tg.counter });
    if (isWin && INTRO.includes(cur)) ftue('battle1_win');
    if (isWin && cur.boss && actI === 0) ftue('act1_clear');
  }
  // 되감기 정산 (D-228): 테이프의 공짜 몫을 넘어 쓴 만큼 역회전 톱니가 깨진다
  if (!labMode) charms.rewind = Math.max(0, charms.rewind - rewindCost(rewindsAtStart, b.rewinds, b.rewindFree ?? 0));
  if (isWin && coachOn) {
    coachOn = false;
    writeMeta(store, { ...readMeta(store), onboarded: true });
  }
  document.querySelector('.coach-band')?.remove();
  if (buildTrialId) return buildTrialEnd(isWin);
  if (labMode) return labEnd(isWin);
  window.setTimeout(async () => {
    await banner(isWin ? (cur.boss ? '반장 격파' : '적 킹 격파') : '킹 파괴', isWin);
    await betResolve(isWin);
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
      const near = ek && ek.hp <= ek.maxHp * DIRECTOR.nearMiss ? `<p class="mono">‘적 킹 HP ${ek.hp}. 한 수였어.’</p>` : '';
      // 1패 = 출하 끝 (D-228). 여벌 심장 톱니가 있으면 하나 깨고 그 대국을 처음부터
      const spare = charms.revive > 0;
      // 하자 폐기 화면도 출하 중단 배경(E-02) 위에 (D-263 — 판 위에 뜨던 구식 창)
      document.body.classList.add('between');
      placeBg('end-fail');
      // M 창 (D-391): 명패 「하자 폐기」 · 남은 부적 꼬리표 · 규칙 한 줄 · 독백 · [끝낸다 | 다시 둔다] — 결정 대기라 막을 눌러도 안 닫힘
      const el = openWin({
        size: 'm',
        title: '하자 폐기',
        head: spare ? `<span class="tag tag-crimson">${CHARMS.revive.name} ${charms.revive}</span>` : undefined,
        body: `<p>${spare ? `킹이 쓰러졌습니다. ${CHARMS.revive.name}를 깨면 ${cur.title}부터 다시 둡니다.` : '킹이 쓰러졌습니다. 출하는 여기서 끝납니다.'}</p>${near}`,
        back: spare ? { label: '끝낸다', attrs: 'data-quit' } : undefined,
        go: spare ? { label: '다시 둔다', attrs: 'data-again' } : { label: '끝낸다', attrs: 'data-quit' },
      });
      el.querySelector('[data-again]')?.addEventListener('click', () => {
        charms.revive -= 1;
        startBattle(ftueRetry(cur)); // 첫 출하 1막 반장이면 이제야 안전망 (2026-11-14)
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
      notes.push(d > 0 ? WAGER_TEXT.hit(d) : WAGER_TEXT.lost(-d));
    }
    if (nemesisNow && b.nemesisId !== undefined && !b.s.pieces.some((p) => p.id === b.nemesisId)) {
      const n = nemesisNow;
      gold += dir.bounty(asc);
      setNemeses(nemeses().filter((x) => x.name !== n.name));
      notes.push(`원수 「${n.name}」 처치 — 현상금 나사 +${dir.bounty(asc)}`);
      const relic = recoverHeirloom(n, asc);
      if (relic) {
        gold += relic;
        notes.push(`${n.heir!.name}의 유품 회수 — 나사 +${relic}`);
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
    // 쇳물 서약 (D-465): 녹여 바친 동료 이름을 결말까지 들고 간다
    for (const f of allFallen) if (f.fall.by === '쇳물 서약') meltedRun.push(crewLabel(f.crew));
    const { back, scrapped } = crackOrScrap(allFallen.map((f) => f.crew));
    const fallenList = allFallen.filter((f) => scrapped.some((u) => u.serial === f.crew.serial));
    const fallen: Crew[] = fallenList.map((f) => f.crew);
    // 원수가 생긴다: 내 분대원을 쓰러뜨린 적 (킹 · 입문 판 제외)
    for (const { crew, fall } of fallenList) if (crew.t !== 'K' && fall.byType && fall.byType !== 'K' && !INTRO.includes(cur)) setNemeses(addNemesis(nemeses(), fall.byType, { t: crew.t, name: crew.name ?? PIECE_NAMES_KO[crew.t], serial: crew.serial }, R.int(1000)));
    // 폐기 원부: 영구 기록 (D-153)
    writeLedger(fallenList.map(({ crew, fall }) => ({ serial: crew.serial ?? '', name: crew.name ?? '', t: crew.t, quirk: crew.quirk, kills: crew.kills ?? 0, battles: crew.battles ?? 0, dmg: crew.dmg ?? 0, wins: crew.wins ?? 0, protectedDamage: crew.protectedDamage ?? 0, defied: crew.defied ?? 0, nick: crew.nick, cause: `${cur.title} ${fall.turn}턴 · ${fall.by}`, run: runId })));
    // 판 사이 기본 회복: 남은 분대 최대 HP의 30%
    {
      const rested = restSquad(survived, restHeal());
      // 원래 줄 순서대로 (돌아온 분대원은 HP 50%, 회복은 받지 않는다)
      squad = before.flatMap((u) => [...rested, ...back].filter((v) => v.serial === u.serial));
    }
    // 유품 태엽: 고르게 하지 않는다 — 자동으로 나사가 되고 한 줄만 (D-155, 관리 피로 제로)
    const heirs = fallen.filter((c) => c.t !== 'K');
    const after: string[] = [];
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
    // 이긴 대국을 저장한다 (D-488, 밸런스 점검 P0-2): 보상 전에 앱이 닫혀도 이어하기는 이 보상 화면부터 — 대국을 다시 굴리지 않는다
    if (runLive) saveRun('reward', picked[actI]?.[rowI] ?? 0, { earned, overGold, fallen, closeTier });
    rewardFlow(earned, overGold, fallen);
  }, 700);
};

/** 이어하기 — 이긴 대국의 남은 보상 화면 (D-488). 판은 내리고 보상 바탕 위에서 고르기만 */
const resumeReward = (def: BattleDef, p: PendingReward): void => {
  cur = def;
  closeTier = p.closeTier;
  document.body.classList.add('between');
  placeBg('bg-reward');
  rewardFlow(p.earned, p.overGold, p.fallen);
};

/** 보상 흐름 (유품 다음) */
const rewardFlow = (earned: number, overGold: number, fallen: Crew[], partDone = false): void => {
  {
    won += 1;
    const reward = cur.reward;
    // 머리 꼬리표 (D-394): 수치는 명패가 아니라 꼬리표로
    const goldTag = `<span class="tag">나사 +${earned}</span>`;
    if (reward === 'recruit') return recruitPick(SCREEN_TEXT.recruit, () => advance(), goldTag);
    if (reward === 'kit') return kitPick(SCREEN_TEXT.kit, () => advance(), goldTag);
    // 검문: 부품을 고른 뒤 카드 보상으로 (partDone — 다시 부품 화면으로 돌지 않게)
    // 사선 보상 3등급: 부품 하나 더 (검문 부품과 겹치지 않게 먼저)
    if (closeTier === 3 && !partDone) {
      closeTier = 0;
      return partPick(SCREEN_TEXT.partClose, () => { won -= 1; rewardFlow(earned, overGold, fallen, reward !== 'part'); }, false, `<span class="ribbon r-crimson">${SCREEN_TEXT.closeTag}</span>`);
    }
    // 검문 · 반장 (D-216): 부품 → 새 분대원(상한 아래면 확정) → 카드
    if (reward === 'part' && !partDone)
      return partPick(SCREEN_TEXT.partBox, () =>
        squad.length < SLICE.squadMax ? (won -= 1, recruitPick(SCREEN_TEXT.newCrew, () => rewardFlow(earned, overGold, fallen, true))) : rewardFlow(earned, overGold, fallen, true), true, `<span class="ribbon">${cur.boss ? SCREEN_TEXT.bossTag : SCREEN_TEXT.checkTag}</span>${goldTag}`);
    if (reward === 'end') return void endingFlow();
    const rng = sub();
    // 카드 보상 (2026-11-14): 칸마다 등급을 뽑고 그 등급의 열린 카드 전체에서 고르게 — 축은 겹치지 않게 · 첫 칸은 가진 부품의 축 · 공용 이동 카드는 덜
    const elite = !!cur.boss || cur.reward === 'part' || partDone;
    const offers = cardOffers(REWARD_COMMANDS.filter((id) => usable(id) && isOpen(id)), (closeTier === 2 ? 4 : 3) + (parts.includes('loupe') ? 1 : 0) - (asc >= 11 ? 3 - ASC_NUM.rewardChoices : 0), { elite, ownAxes: parts.map((id) => SLICE_PARTS[id].axis).filter((a): a is Axis => !!a), parts, rng });
    // 기물 수집 (D-216): 대국 보상에 가끔 새 분대원 한 명이 섞인다 — 카드 대신 고를 수 있다
    const recruitOffer = !elite && squad.length < SLICE.squadMax && (rng.next() < SLICE.recruitChance || debugRecruit) ? rollRecruit(RECRUITS, rng.next()) : null;
    const recruitCrew = recruitOffer ? crewOf(recruitOffer.t) : null;
    /** 보상 화면 (카드 빼기를 그만두면 다시 연다) */
    const showReward = (): void => {
      // 고르기 화면 (D-394 .scr-pick): 명패 「전리품」 + 나사 꼬리표 · 카드 받침 줄 · [건너뛴다 | 고른다]. 정비는 머리 줄 왼쪽 청록 단추(카드 대신 고르는 것)
      const pct = Math.round(REST.overhaul * 100);
      const back1 = fallen.length ? [...fallen].sort((a, c) => (COST_ORDER[c.t] ?? 0) - (COST_ORDER[a.t] ?? 0))[0] : null;
      const items: PickItem[] = offers.map((id) => ({ key: `card:${id}`, html: cardFace(id, ''), info: fitInfo('card', id) }));
      if (recruitOffer && recruitCrew) items.push({ key: 'crew', html: recruitFace(recruitCrew, recruitOffer.line), info: withCards(recruitOffer.cards, SCREEN_TEXT.newCrewTag) });
      const el = pickScreen({
        title: SCREEN_TEXT.reward,
        tag: goldTag,
        lead: `<button type="button" class="btn k-teal" data-slot="overhaul">${SCREEN_TEXT.overhaul}</button><span class="note">${back1 ? `${back1.name} 복귀 · ` : ''}HP +${pct}%</span>`,
        items,
        skip: { label: SCREEN_TEXT.skip, attrs: 'data-skip' },
        onSelect: () => sfx('lift'),
        onPick: (key, slot) =>
          takeFx(slot, () => {
            const all = [...offers, ...(recruitOffer ? [`crew:${recruitOffer.t}`] : [])];
            if (key === 'overhaul') {
              draft('overhaul', offers, 'overhaul');
              const o = overhaulSquad(squad, fallen);
              squad = o.squad;
              sfx('awaken');
              toast(o.revived ? `${josa(o.revived.name, '이')} 복귀했습니다.` : `분대 전원 HP +${pct}%`);
              return void window.setTimeout(() => advance(), 300);
            }
            if (key === 'crew' && recruitOffer && recruitCrew) {
              draft('card', all, `crew:${recruitOffer.t}`);
              squad.push(recruitCrew);
              deck.push(...recruitOffer.cards);
              crewSay(recruitCrew.t, crewLabel(recruitCrew));
              return advance();
            }
            const id = key.slice(5) as CommandId;
            draft('card', all, id);
            deck.push(id);
            advance();
          }),
      });
      gradeReveal([...el.querySelectorAll<HTMLElement>('[data-grade]')]);
      // 카드 빼기는 보상에서 뺐다 (D-247) — 고물상 · 작업대에서만
      el.querySelector('[data-skip]')!.addEventListener('click', onceSkip(() => (draft('card', offers, null), advance())));
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
  // 덱 보기 · 카드 빼기 (D-394 → D-399): 창 안 격자는 667×375에서 카드가 104px로 줄어 글이 깨졌다 —
  // 고르기 화면과 같은 카드 레일(정본 168 · 하한 150, 넘치면 가로로 민다) · 장수는 카드 위 꼬리표 「×3」 · 전체 장수는 명패 옆 꼬리표
  const items: PickItem[] = ids.map((id) => ({ key: id, html: `${cardFace(id, 'tabindex="-1"')}${(counts.get(id) ?? 1) > 1 ? `<span class="badge-n">×${counts.get(id)}</span>` : ''}` }));
  const count = `<span class="badge-n">${deck.length}장</span>`;
  if (mode === 'view') {
    const el = pickScreen({ title: SCREEN_TEXT.deck, tag: count, items: [], body: slotsHtml(items, true), cls: 'scr-deck', skip: { label: SCREEN_TEXT.close, attrs: 'data-x' }, go: null, onPick: () => {} });
    el.querySelector('[data-x]')!.addEventListener('click', closeWin);
    return;
  }
  // 카드 빼기: 고름 = 청록 테 · 진행 = 진홍 「뺀다」(되돌릴 수 없는 손해 — 철 「그만둔다」와 짝)
  const el = pickScreen({
    title: SCREEN_TEXT.remove,
    tag: count,
    items: [],
    body: slotsHtml(items, true),
    cls: 'scr-deck',
    skip: { label: SCREEN_TEXT.stop, attrs: 'data-back' },
    go: { label: SCREEN_TEXT.cut, kind: 'crimson' },
    onSelect: () => sfx('lift'),
    onPick: (id) => {
      deck.splice(deck.indexOf(id as CommandId), 1);
      sfx('stamp');
      toast(`${COMMANDS[id as CommandId].name} 한 장을 뺐습니다.`);
      then?.(true);
    },
  });
  el.querySelector('[data-back]')!.addEventListener('click', () => then?.(false));
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
/** 쓰러짐 의식의 초상 (D-472): 분대원 얼굴 56px을 정수 2배로 — 없으면 큰 기물 그림 */
const riteFace = (t: PieceType): string => `<span class="dr-face"><img src="ui/hud/crew-${t}.png" alt="" width="112" height="112" onerror="this.outerHTML=this.dataset.fb" data-fb='${pieceImg(t, 0, 'large', 108).replace(/'/g, '&#39;')}'></span>`;
const deathRites = async (): Promise<void> => {
  const fresh = b.falls.slice(ritesDone);
  ritesDone = b.falls.length;
  for (const f of fresh) {
    const c = squad[b.squadIds.indexOf(f.pieceId)];
    if (!c) continue;
    // 목숨 둘 (D-219): 성한 분대원이 처음 쓰러지면 폐기 의식 대신 짧은 「톱니가 깨진다」 — 판 가운데 톱니가 흔들리다 튕겨 나간다
    const melted = (b.melted ?? []).includes(f.pieceId);
    if (c.t !== 'K' && !c.cracked && !melted) {
      const fx = document.createElement('div');
      fx.className = 'crackfx';
      fx.innerHTML = `<div><span class="dr-row">${riteFace(c.t)}<span class="lifes big"><i class="life"></i><i class="life breaking"></i></span></span><p class="narr"></p><b>${crewLabel(c)}</b><small>${LIFE_TEXT.riteSys}</small></div>`;
      document.body.appendChild(fx);
      sfx('hurt');
      // D-472: 맞은 순간 — 초상이 움찔하고 판이 흔들린다
      flashScreen(0.35);
      shake($('board'), 2);
      shakeEl(fx.querySelector<HTMLElement>('.dr-face'), 5, 300);
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
    const d = melted ? { narr: LIFE_TEXT.meltNarr, line: voice ? voice[((c.serial ?? '').charCodeAt(2) + f.turn) % voice.length] : d0.line } : voice ? { narr: d0.narr, line: voice[((c.serial ?? '').charCodeAt(2) + f.turn) % voice.length] } : d0;
    // 2인칭 서술 → 이름 → 각주 대사 → 시스템 한 줄 (D-158). D-189: 검은 막이 한 줄씩 계단으로 내려오고 서술이 한 자씩 찍힌다
    // D-472 (사용자: 「동료 죽을 때 너무 밋밋함」): 검은 막 위 철 액자 속 초상 → 서술 → 「폐기」 도장이 내리찍힘 → 초상이 잿빛으로 굳고 도트로 부서진다
    fx.innerHTML = `<div><span class="dr-frame">${riteFace(c.t)}<b class="dr-stamp${melted ? ' melt' : ''}">${melted ? LIFE_TEXT.stampMelt : LIFE_TEXT.stampScrap}</b></span><p class="narr"></p><b>${crewLabel(c)}</b><i>${d.line}</i><small>${melted ? LIFE_TEXT.meltSys(c.serial ?? '') : `${c.serial} · ${f.by}에게 파괴되었습니다.`}</small></div>`;
    curtainRows(fx);
    document.body.appendChild(fx);
    // 전체 화면 장면 (되감기 장면과 같은 문법): 판이 잿빛으로 멈춘다
    const froze = !document.body.classList.contains('rev-freeze');
    document.body.classList.add('rev-freeze');
    sfx('loss');
    // 빠르게 (D-191): 막 0.2초 → 서술 한 자 14ms → 이름 · 대사 · 시스템 줄 60ms 간격 → 0.45초 머묾 (약 1.2초)
    await new Promise((r) => window.setTimeout(r, 200));
    const frame = fx.querySelector<HTMLElement>('.dr-frame')!, face = frame.querySelector<HTMLElement>('.dr-face')!;
    frame.classList.add('in');
    // 초상 뒤로 붉은 띠가 화면 끝까지 (막 위 · 글 아래 층)
    const band = document.createElement('i');
    band.className = 'dr-band';
    const placeBand = (): void => { const fr = frame.getBoundingClientRect(); band.style.top = `${Math.round(fr.top + fr.height / 2)}px`; };
    placeBand();
    // 서술이 찍히며 글 덩어리가 자라면 액자가 올라간다 — 띠도 따라간다
    new ResizeObserver(placeBand).observe(fx.querySelector<HTMLElement>(':scope > div')!);
    fx.insertBefore(band, fx.querySelector(':scope > div'));
    band.classList.add('in');
    shakeEl(face, 6, 320);
    await typeIn(fx.querySelector<HTMLElement>('.narr')!, d.narr, 14);
    // 도장: 크게 내려와 박히고(예비 → 터짐 → 출렁) 화면이 번쩍 · 흔들림 · 잉크 튐 — 초상은 그 순간 잿빛
    const stamp = frame.querySelector<HTMLElement>('.dr-stamp')!;
    stampFx(stamp);
    window.setTimeout(() => { face.classList.add('ash'); shake(fx.querySelector<HTMLElement>(':scope > div'), 3); }, 150);
    await new Promise((r) => window.setTimeout(r, calmNow() ? 0 : 420));
    for (const x of fx.querySelectorAll('div > :not(.narr):not(.dr-frame)')) {
      x.classList.add('in');
      await new Promise((r) => window.setTimeout(r, 60));
    }
    pxOut(face, () => (face.style.visibility = 'hidden'), 520);
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
  // 분대 (D-394 → D-399): 카드를 줄이지 않는다 — 고르기 화면과 같은 카드 레일(168 · 하한 150) · 명패 옆 인원 꼬리표 · [닫는다 | 도감]
  const el = pickScreen({
    title: SCREEN_TEXT.crew,
    tag: `<span class="badge-n">${squad.length}명</span>`,
    items: [],
    body: slotsHtml(squad.map((u, i) => ({ key: String(i), html: crewCard(u, { hp: u.hp ?? crewMaxHp(u), max: crewMaxHp(u) }), info: `${u.nick ? `<span>「${u.nick}」</span>` : ''}<span>생존 승리 <b>${u.wins ?? 0}</b> · 보호 <b>${u.protectedDamage ?? 0}</b></span>` })), true),
    cls: 'scr-crew',
    skip: { label: SCREEN_TEXT.close, attrs: 'data-x' },
    go: { label: SCREEN_TEXT.ledger, kind: 'iron', attrs: 'data-ledger' },
    onPick: () => {},
  });
  const led = el.querySelector<HTMLButtonElement>('[data-ledger]')!;
  led.disabled = false;
  el.querySelector('[data-x]')!.addEventListener('click', closeWin);
  led.addEventListener('click', () => ledgerView());
  // 카드를 눌러도 도감 단추는 그대로 (고르기 규칙이 진행 단추를 끄지 않게)
  el.querySelectorAll('[data-slot]').forEach((x) => x.addEventListener('click', () => (led.disabled = false)));
};

/** 도감 (옛 폐기 원부, D-288): 쓰러진 분대원의 영구 기록 */
const ledgerView = (back: () => void = crewView): void => {
  const rows = readLedger();
  // L 목록 창 (D-391): 명패 「도감」 · 머리 줄 = 안내 12 + 기록 수 꼬리표 · 움푹 칸 하나(안에서만 스크롤) · [돌아간다/닫는다]
  const el = openWin({
    size: 'l',
    title: '도감',
    head: `<p class="note">쓰러진 분대원의 기록입니다. 지워지지 않습니다.</p><span class="badge-n push">기록 ${rows.length}</span>`,
    body: rows.length
      ? `<div class="inset scroll">${rows.map((r) => `<div class="lg-row">${pieceImg(r.t, 0, 'small', 48)}<p class="lg-name">${r.name}${r.nick ? ` 「${r.nick}」` : ''} · ${r.serial} · 처치 ${r.kills} · 대국 ${r.battles}</p><p class="lg-cause">${r.cause} · ${r.run}</p></div>`).join('')}</div>`
      : `<p class="mono empty-line">‘아직 아무도 잃지 않았어.’</p>`,
    back: { label: back === crewView ? '돌아간다' : '닫는다', attrs: 'data-back' },
    dismiss: () => back(),
  });
  el.querySelector('[data-back]')!.addEventListener('click', () => back());
};

/** 영입 (입문 뒤): 기물 셋 중 하나 — 그 기물의 카드가 같이 들어온다 */
const recruitPick = (title: string, then: () => void, tag = ''): void => {
  const rng = sub();
  // 이형 분대원 (D-481): 그 왕관을 깨서 연 이형이 영입 칸에 섞인다(오늘의 도전 제외) — 바탕 기물의 카드가 함께 온다
  const openForms = daily ? [] : FORM_IDS.filter((f) => (readMetaCached().unlocked ?? []).includes(formKey(f)));
  const pool: { t: PieceType; cards: CommandId[]; line: string; form?: FormId }[] = [...RECRUITS, ...openForms.map((f) => ({ t: FORMS[f].base, cards: RECRUITS.find((r) => r.t === FORMS[f].base)?.cards ?? [], line: FORMS[f].line, form: f }))];
  const offers: typeof pool = [];
  // 등급 무게대로 (D-319 — 퀸은 드물게)
  while (offers.length < 3 && pool.length) { const o = rollRecruit(pool, rng.next()); offers.push(pool.splice(pool.indexOf(o), 1)[0]); }
  // 셋이 서로 다른 이름 · 기벽
  const crews: Crew[] = [];
  for (const r of offers) {
    const c = makeCrew(r.t, R, [...squad, ...crews].map((u) => u.name ?? ''), crews.map((u) => u.quirk!).filter(Boolean));
    if (readMetaCached().runs < 2 && !daily) delete c.quirk;
    if (r.form) { c.form = r.form; delete c.quirk; }
    crews.push(c);
  }
  let picked = false;
  // 고르기 화면 (D-394): 분대원 카드 셋 · 받침 아래 함께 오는 카드 · [건너뛴다 | 고른다]
  const el = pickScreen({
    title,
    tag,
    items: offers.map((r, k) => ({ key: String(k), html: recruitFace(crews[k], r.line), info: withCards(r.cards) })),
    skip: { label: SCREEN_TEXT.skip, attrs: 'data-skip' },
    onSelect: () => sfx('lift'),
    onPick: (key, slot) =>
      takeFx(slot, () => {
        const k = Number(key);
        const r = offers[k];
        picked = true;
        draft('recruit', offers.map((o) => `crew:${o.form ?? o.t}`), `crew:${r.form ?? r.t}`);
        ftue('first_pick');
        squad.push(crews[k]);
        deck.push(...r.cards);
        crewSay(crews[k].t, crewLabel(crews[k]));
        then();
      }),
  });
  el.querySelector('[data-skip]')!.addEventListener('click', onceSkip(() => {
    picked = true;
    draft('recruit', offers.map((o) => `crew:${o.form ?? o.t}`), null);
    then();
  }));
  // 부관 안내 (D-238): 첫 영입은 무엇을 고르는지 짚는다
  if (!tutDone('recruit')) void tutorial('recruit', [{ text: TUT.recruit, target: () => el.querySelector('.scr-items'), wait: () => picked }]);
  gradeReveal([...el.querySelectorAll<HTMLElement>('[data-grade]')]);
};

/** 부품 상자 (1판 뒤 — 첫 사기 조합 확정): 부품 + 맞물리는 카드 둘, 셋 중 하나 */
const kitPick = (title: string, then: () => void, tag = ''): void => {
  const rng = sub();
  const pool = KITS.filter((k) => (PART_GRADE[k.part] ?? 'common') !== 'gold' && !parts.includes(k.part) && (!k.needs || squad.some((u) => u.t === k.needs)) && k.cards.every(usable));
  // 빌드 확정 (D-230, 보고서 4 · 5 — Monster Train 챔피언 · Balatro 앤티 2 · StS 첫 정예): 두 번째 대국 뒤 「핵심 부품」 셋은 서로 다른 축에서 — 고르는 순간 이번 출하의 방향이 선다
  // 두 갈래 (사용자 결정 D-231): ① 큰 세 갈래 — 서로 다른 축 셋 ② 한 갈래의 세부 — 한 축 안의 셋. 세부는 그 축에 셋이 있을 때만
  const { offers, deep } = kitOffers(pool, rng);
  // 고르기 화면 (D-394 — 「이 조합으로 가시겠습니까?」 확인 창을 없앴다): 부품 받침 셋 · 받침 아래 함께 오는 카드 두 장 · 같은 받침을 다시 누르면 확정
  const el = pickScreen({
    title,
    tag: `<span class="ribbon">${deep ? SCREEN_TEXT.deep(AXIS_NAMES[deep as Axis]) : SCREEN_TEXT.broad}</span>${tag}`,
    items: offers.map((k, n) => ({ key: String(n), html: partFace(k.part, ''), info: withCards(k.cards) })),
    skip: { label: SCREEN_TEXT.skip, attrs: 'data-skip' },
    mid: `<p class="with-cards note">${SCREEN_TEXT.withHint}</p>`,
    onSelect: (key) => {
      sfx('lift');
      const m = el.querySelector<HTMLElement>('.with-cards');
      if (m) m.innerHTML = `<span class="lbl">${SCREEN_TEXT.withHead}</span> ${offers[Number(key)].cards.map(cardGist).join(' / ')}`;
    },
    onPick: (key, slot) =>
      takeFx(slot, () => {
        const k = offers[Number(key)];
        sfx('submit');
        draft('kit', offers.map((o) => o.part), k.part);
        ftue('kit_pick');
        parts.push(k.part);
        newParts.add(k.part);
        deck.push(...k.cards);
        then();
      }),
  });
  el.querySelector('[data-skip]')!.addEventListener('click', onceSkip(() => (draft('kit', offers.map((o) => o.part), null), then())));
  if (!tutDone('kit')) void tutorial('kit', [{ text: TUT.kit, target: () => el.querySelector('.scr-items') }]);
  gradeReveal([...el.querySelectorAll<HTMLElement>('[data-grade]')]);
};

/**
 * 부품 칸 (D-247): 칸이 남으면 바로 단다. 가득 차 있으면 녹일 부품 하나를 고른다(나사 +meltBack) — 새 부품을 버려도 된다.
 * done(true) = 달았다 · done(false) = 새 부품을 버렸다
 */
const gainPart = (id: SlicePartId, done: (took: boolean) => void): void => {
  if (parts.length < partSlotsAt(actI)) {
    parts.push(id);
    newParts.add(id);
    return done(true);
  }
  // 네 개씩 두 페이지. 글씨/선택지 높이는 보유 개수와 무관하게 유지한다.
  let page = 0, choosing = false;
  const pageSize = 4, pages = Math.ceil(parts.length / pageSize);
  const draw = (): void => {
    const visible = parts.slice(page * pageSize, (page + 1) * pageSize);
    const el = pickScreen({
      title: SCREEN_TEXT.full,
      cls: 'part-replace-screen',
      lead: `<span class="ribbon r-crimson">${SCREEN_TEXT.slots(partSlotsAt(actI))}</span>`,
      tag: `<span class="ribbon">${SCREEN_TEXT.newPart(SLICE_PARTS[id].name)}</span>`,
      items: [],
      body: `<div class="choice-grid part-replace-grid">${visible.map((pid) => {
        const a = partSummaryText(pid), d = SLICE_PARTS[pid];
        return `<button type="button" class="choice part-replace" data-slot="${pid}" aria-pressed="false"><i class="ico" style="${iconArt(d.icon)}"></i><span class="part-replace-rule"><b>${d.shortName ?? a.name}</b><span>${a.description}</span><strong>: ${a.effect}</strong></span></button>`;
      }).join('')}</div><p class="scr-say note">${SCREEN_TEXT.melt(ECON.meltBack)}</p>`,
      mid: `<nav class="part-pages" aria-label="${SCREEN_TEXT.partPages}">${btnHtml({ label: '‹', attrs: `data-part-page="-1" aria-label="${SCREEN_TEXT.partPrev}"`, kind: 'iron', disabled: page === 0 })}<span aria-live="polite">${page + 1} / ${pages}</span>${btnHtml({ label: '›', attrs: `data-part-page="1" aria-label="${SCREEN_TEXT.partNext}"`, kind: 'iron', disabled: page + 1 === pages })}</nav>`,
      skip: { label: SCREEN_TEXT.keep, attrs: 'data-skip' },
      go: { label: SCREEN_TEXT.meltGo, kind: 'crimson' },
      onSelect: () => sfx('lift'),
      onPick: (pid, slot) => {
        if (choosing) return;
        choosing = true;
        takeFx(slot, () => {
          parts[parts.indexOf(pid as SlicePartId)] = id;
          newParts.add(id);
          gold += ECON.meltBack;
          sfx('stamp');
          toast(`${SLICE_PARTS[pid as SlicePartId].name} — 녹였습니다. (나사 +${ECON.meltBack})`);
          done(true);
        });
      },
    });
    el.querySelectorAll<HTMLButtonElement>('[data-part-page]').forEach((button) => button.addEventListener('click', () => {
      if (choosing) return;
      page = Math.max(0, Math.min(pages - 1, page + Number(button.dataset.partPage)));
      draw(); // 새 DOM의 고르기 바인딩은 선택 없음/진행 꺼짐으로 시작한다.
      el.querySelector<HTMLButtonElement>(`[data-part-page="${page ? -1 : 1}"]`)?.focus({ preventScroll: true });
    }));
    el.querySelector('[data-skip]')!.addEventListener('click', () => { if (!choosing) done(false); });
  };
  draw();
};

/** 부품 고르기 (검문! 통과): 셋 중 하나 */
const partPick = (title: string, then: () => void, elite = false, tag = ''): void => {
  const rng = sub();
  const pool = (Object.keys(SLICE_PARTS) as SlicePartId[]).filter((id) => !parts.includes(id) && isOpen(id) && partFits(id, squad.map((u) => u.t), parts, squad));
  const offers: SlicePartId[] = [];
  // 칸마다 등급을 먼저 뽑고 그 등급에서 하나 (없으면 아무 등급) — 검문 · 반장은 높은 등급이 잘 나온다 (D-216)
  while (offers.length < 3 && pool.length) {
    const g = rollGrade(rng.next(), elite ? GRADE.elite : GRADE.weights);
    const same = pool.filter((id) => (PART_GRADE[id] ?? 'common') === g);
    const pickFrom = same.length ? same : pool;
    const id = chooseBuildPart(pickFrom, parts, rng, offers.length === 0 && same.length > 0);
    pool.splice(pool.indexOf(id), 1);
    offers.push(id);
  }
  // 고르기 화면 (D-394): 부품 받침 셋 · 받침 아래 덱 맞물림 · [건너뛴다 | 고른다]
  const el = pickScreen({
    title,
    tag,
    items: offers.map((id) => ({ key: id, html: partFace(id, ''), info: fitInfo('part', id) })),
    skip: { label: SCREEN_TEXT.skip, attrs: 'data-skip' },
    onSelect: () => sfx('lift'),
    onPick: (id, slot) =>
      takeFx(slot, () => {
        draft(elite ? 'part_elite' : 'part', offers, id);
        gainPart(id as SlicePartId, () => then());
      }),
  });
  el.querySelector('[data-skip]')!.addEventListener('click', onceSkip(() => (draft(elite ? 'part_elite' : 'part', offers, null), then())));
  gradeReveal([...el.querySelectorAll<HTMLElement>('[data-grade]')]);
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
  // M 입력 창 (D-391): 명패 「제보」 · 안내 · 움푹 칸 입력 하나 · [닫는다 | 남긴다]
  const el = openWin({
    size: 'm',
    title: PT.bugTitle,
    body: `<p>${PT.bugNote}</p><textarea class="inset pt-text" rows="3" maxlength="300" placeholder="${PT.bugHint}"></textarea>`,
    back: { label: PT.close, attrs: 'data-x' },
    go: { label: PT.send, attrs: 'data-send' },
    dismiss: closeWin,
  });
  el.querySelector('[data-x]')!.addEventListener('click', closeWin);
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
  const payload = (): string => JSON.stringify({ v: 1, exported: new Date().toISOString(), session: telemetrySession(), meta: { runs: readMeta(store).runs, clears: readMeta(store).clears, ascOpen: readMeta(store).ascOpen, storyCleared: readMeta(store).storyCleared, challengeOpen: readMeta(store).challengeOpen, challengeRecords: readMeta(store).challengeRecords }, events: telemetryAll() });
  // M 창 (D-391): 명패 「시험판 기록」 · 건수 꼬리표 · 안내 · 보조 단추 무리(저장 · 지우기) · [닫는다 | 복사한다]
  const el = openWin({
    size: 'm',
    title: PT.exportTitle,
    head: `<span class="badge-n">${PT.exportCount(all.length)}</span>`,
    body: `<p>${PT.exportNote}</p><div class="btn-set">${btnHtml({ label: PT.save, attrs: 'data-file' })}${btnHtml({ label: PT.clear, attrs: 'data-clear', kind: 'crimson' })}</div><textarea class="inset pt-text pt-dump" rows="3" readonly hidden></textarea>`,
    back: { label: PT.close, attrs: 'data-x' },
    go: { label: PT.copy, attrs: 'data-copy' },
    dismiss: back,
  });
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
      ? `<div class="stack"><div class="scale">${(q.zero ? [0, 1, 2, 3, 4, 5] : [1, 2, 3, 4, 5]).map((n) => btnHtml({ label: String(n), attrs: `data-v="${n}"`, kind: cur0 === n ? 'teal' : 'iron' })).join('')}</div><div class="scale-ends"><span class="note">1 = ${q.lo}</span>${q.zero ? `<span class="note">0 = ${q.zero}</span>` : ''}<span class="note">5 = ${q.hi}</span></div></div>`
      : q.kind === 'text'
        ? `<textarea class="inset pt-text" rows="3" maxlength="300">${typeof cur0 === 'string' ? cur0 : ''}</textarea>`
        : `<div class="btn-set" style="--cols:${q.kind === 'many' ? 5 : 2}">${q.opts.map((o, k) => btnHtml({ label: o, attrs: `data-o="${k}"`, kind: (q.kind === 'many' ? ((cur0 as number[]) ?? []).includes(k) : cur0 === k) ? 'teal' : 'iron' })).join('')}</div>`;
  const last = i === SURVEY.length - 1;
  // L 창 (D-391): 명패 「설문」 · 머리 줄 = 쪽 꼬리표 + 물음 · 답(고른 것 = 청록) · [돌아간다 | 넘긴다]
  const el = openWin({
    size: 'l',
    title: PT.surveyTitle,
    head: `<span class="badge-n">${i + 1} / ${SURVEY.length}</span><p>${q.q}</p>`,
    body: `${body}${i === 0 ? `<p class="note">${PT.surveyNote}</p>` : ''}`,
    back: { label: i ? PT.prev : PT.close, attrs: 'data-prev' },
    go: { label: last ? PT.done : PT.next, attrs: 'data-next' },
  });
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
  return `<div class="dict">${list.map(([k, v]) => `<div class="term"><b>${k}${fresh.has(k) ? ' <i class="new-tag">NEW</i>' : ''}</b><span>${v}</span></div>`).join('')}</div>${left ? `<p class="note">아직 만나지 않은 용어 ${left}개 — 나아가면 열립니다.</p>` : ''}`;
};
/**
 * ? 도움말 (D-263, 사용자: 「지금 화면 · 용어 · 안내서 전체는 가독성 최악 — 지금 화면은 안내서에 통합」):
 * 탭 셋 = 안내서(그림 + 핵심 행, 반장 대국이면 반장 쪽부터) · 용어 · 버그 · 짜증 제보.
 */
/** 도움말 탭 줄 (창 머리 줄 안) — 지금 탭 = 눌린 철, 황동은 단추 줄 하나만 (D-391) */
const helpTabs = (on: 'guide' | 'dict'): string => {
  // 탭 (UI-05 · D-394): 고른 탭 = 황동 · 나머지 = 철, 아래 변이 열려 바로 아래 칸과 붙는다
  const tab = (k: string, label: string, cls = ''): string => `<button type="button" class="tab${cls}" data-tab="${k}" role="tab" aria-selected="${on === k}">${label}</button>`;
  return `<div class="tabs" role="tablist">${tab('guide', HUD_TEXT.helpTitle)}${tab('dict', HUD_TEXT.dictTitle, (readMeta(store).termsNew ?? []).length ? ' has-new' : '')}${tab('bug', PT.bug)}</div>`;
};
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
    void guide(openWin, OPENING_TEXT.close, { start: b?.boss ? GUIDE_PAGES.length - 1 : 0, tabs: helpTabs('guide'), onTab }).then(() => { if (!switched) { closeWin(); helpSeen(tab, opened); } });
    return;
  }
  // 용어 = 안내서와 같은 L 창 (탭을 눌러도 창 폭이 튀지 않는다) · 움푹 칸 하나 안에서만 스크롤
  const close = (): void => (closeWin(), helpSeen(tab, opened));
  const el = openWin({ size: 'l', title: OPENING_TEXT.helpTitle, head: helpTabs('dict'), body: `<div class="inset scroll">${dictHtml()}</div>`, back: { label: OPENING_TEXT.close, attrs: 'data-x' }, dismiss: close });
  el.querySelector('[data-x]')!.addEventListener('click', () => (sfx('tap'), close()));
  el.querySelectorAll<HTMLElement>('[data-tab]').forEach((t) => t.addEventListener('click', () => { if (t.dataset.tab === 'dict') return; sfx('tap'); onTab(t.dataset.tab!); }));
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
// 적의 수 목록을 누르면 지난 기록 엿보기 (보고서 3.9 — 로그는 레일에서 빼고 여기로)
$('intents').addEventListener('click', () => logPeek());
document.getElementById('deckrow')?.addEventListener('click', (e) => {
  if ((e.target as HTMLElement).closest('[data-deck]')) return deckView('view');
  if ((e.target as HTMLElement).closest('[data-crew]')) return crewView();
});
// 반장 칸 (D-208): 레일엔 이름 · 지금 일만 — 누르면 규칙 전체
$('boss').addEventListener('click', () => {
  if (!b.boss) return;
  const r = BOSS_RULES[b.bossRule];
  const abilities = bossAbilityText(b.bossRule, b.alarm, (n) => foeDmg(n, b));
  const el = openWin({
    size: 's', title: r.name, body: abilityHtml(abilities),
    back: { label: '닫는다', attrs: 'data-x' }, dismiss: closeWin,
  });
  el.querySelector('[data-x]')!.addEventListener('click', closeWin);
  bindAbilities(el, abilities);
});
$('parts').addEventListener('click', (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-part-info]');
  if (!el) return;
  const id = el.dataset.partInfo as SlicePartId;
  const abilities = partAbilityText(id);
  const status = !busy && !enemyTurn && !document.body.classList.contains('between') ? partStatuses(b)[id] : undefined;
  const head = status ? `<div class="part-state-line"><img src="ui/part-state/${status.state}.png" alt=""><b>${PART_STATE_LABEL[status.state]}</b><span>${status.detail}</span></div>` : '';
  const peek = infoPeek({ cls: 'part-detail peek-expanded', key: `part:${id}`, side: 'left', maxW: 352, head, body: abilityHtml(abilities) });
  bindAbilities(peek, abilities);
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
let buildTrialId: BuildTrialId | null = null;
let buildActStep = -1;
const labRounds = { A: 0, B: 0 };
const labScore = { A: { w: 0, l: 0, turns: 0 }, B: { w: 0, l: 0, turns: 0 } };
const LAB_TEXT: Record<'A' | 'B', { name: string; how: string[] }> = {
  A: { name: '시험장 A — 지금 규칙 + 처치 환급', how: ['내려앉은 자리에서 공격합니다 (지금과 같은 체력 · 피해).', '태엽은 2. 처치하면 태엽 +1 (턴당 3까지).', '적은 예고한 대로 둡니다.'] },
  B: { name: '시험장 B — 진짜 잡기', how: ['체력이 없습니다. 적이 선 칸에 들어가면 잡습니다.', '붉은 칸에 선 내 기물은 적이 잡을 수 있습니다.', '태엽은 2. 잡으면 태엽 +1 (턴당 3까지). 적은 늘 지금 판을 보고 둡니다.'] },
};

/** 시험장 대국 시작 (같은 규칙끼리는 판 순서가 같다 — A와 B를 같은 씨앗으로 비교) */
const startLab = (mode: 'A' | 'B'): void => {
  buildTrialId = null;
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

/** 전체 견본은 본편과 같은 카드 받침·글 배율을 사용한다. */
const allFaces = (onlyParts?: SlicePartId[]): void => {
  const items: PickItem[] = [
    ...(onlyParts ? [] : (Object.keys(COMMANDS) as CommandId[]).filter((id) => !/[+~]$/.test(id)).map((id) => ({ key: `card:${id}`, html: cardFace(id, '') }))),
    ...(onlyParts ?? Object.keys(SLICE_PARTS) as SlicePartId[]).map((id) => ({ key: `part:${id}`, html: partFace(id, '') })),
  ];
  const el = pickScreen({ title: '카드 견본', items, skip: { label: '닫는다', attrs: 'data-x' }, onPick: () => {} });
  el.querySelector('[data-x]')!.addEventListener('click', closeWin);
};

/** 같은 판의 세 운영. 기존 보상 선택 창 부품을 재사용한다. */
const buildPick = (): void => {
  const choices = (Object.keys(BUILD_TRIAL) as BuildTrialId[]).map((id) => `<button class="choice build-option" type="button" data-build="${id}"><i class="ico" style="${iconArt(SLICE_PARTS[BUILD_TRIAL[id].part].icon)}"></i><span><span class="choice-name">${BUILD_TRIAL[id].name}</span><span class="choice-res">${BUILD_TRIAL[id].question}</span></span></button>`).join('');
  const el = openWin({ size: 'm', title: '빌드 시험', body: `<p class="note">같은 분대·같은 판. 본편 저장은 유지합니다.</p><div class="build-options">${choices}</div>`, back: { label: '돌아간다', attrs: 'data-build-back' } });
  el.querySelectorAll<HTMLElement>('[data-build]').forEach((btn) => btn.addEventListener('click', () => startBuildTrial(btn.dataset.build as BuildTrialId)));
  el.querySelector('[data-build-back]')!.addEventListener('click', () => { sessionStorage.setItem('op-menu', '1'); location.assign(location.pathname); });
};
/** 본편과 같은 전투 규칙으로만 비교한다. 기존 A/B 시험장의 규칙 변형은 사용하지 않는다. */
const startBuildTrial = (id: BuildTrialId, condition: BuildTrialCase = 'ready'): void => {
  buildActStep = -1;
  const trial = createBuildTrial(id, condition);
  buildTrialId = id;
  labMode = 'A'; // 저장·메타 진행·내러티브 개입을 막는 기존 시험장 경계만 재사용.
  document.body.classList.remove('between');
  document.querySelector('.mapfx')?.remove();
  runLive = false;
  asc = 0; actI = 0; gold = 0; refined = []; daily = null;
  b = trial.b; squad = trial.squad; deck = trial.deck; parts = trial.parts;
  cur = { enemy: ['K', 'P', 'P', 'R'], kingHp: 1, title: `${BUILD_TRIAL[id].name} 시험`, narr: '', tell: '', reward: 'end' };
  blog = []; apKey = ''; apPrev = coinPrev = apHold = null;
  selCard = selPiece = openCard = null;
  busy = false; coachOn = false; turnDmg = 0; prevKills = 0; ritesDone = 0;
  document.querySelector('.coach-band')?.remove();
  closeOverlay(); closeOpening();
  $('hand').classList.remove('dealing');
  renderer.setFoeTraits([]); renderer.setNemesis(null); renderer.setBossFinish(false); renderer.setAct(1); renderer.setFoeTone('', ''); renderer.lastMovesClear();
  renderer.setup(b.s); refresh();
  toast(BUILD_TEXT.previewHint, 3600);
};

/** 비교 결과에서 첫막으로 이어간다. 승패·분대 손실은 본편 기록에 넣지 않는다. */
const buildTrialEnd = (win: boolean): void => {
  const id = buildTrialId!;
  const complete = buildActStep === 2 && win;
  const step = buildActStep;
  const summary = `${win ? '승리' : '패배'} · ${b.turn}턴 · 생존 ${b.s.pieces.filter((p) => p.side === 0).length} / ${squad.length}`;
  const next = (): void => {
    if (step >= 0 && win && !complete) {
      squad = squad.flatMap((u, i) => { const p = findPiece(b.s, b.squadIds[i]); return p ? [growCrew(b, u, p.id, p.hp, p.type)] : []; });
    }
    const n = step >= 0 && win && !complete ? step + 1 : 0;
    const trial = createBuildAct(id, n, n ? squad : undefined);
    buildActStep = n;
    b = trial.b; squad = trial.squad; deck = trial.deck; parts = trial.parts; cur = trial.def;
    blog = []; apKey = ''; apPrev = coinPrev = apHold = null;
    selCard = selPiece = openCard = null; busy = false; turnDmg = 0; prevKills = 0; ritesDone = 0;
    closeOverlay(); renderer.setBossFinish(!!cur.boss); renderer.setFoeTone(cur.boss ? 'boss' : '', cur.bossRule ?? '');
    renderer.lastMovesClear(); renderer.setFoeTraits([]); renderer.setup(b.s); refresh();
    toast(`첫막 시험 ${n + 1} / 3 · ${cur.title}`);
  };
  const el = openWin({ size: 'm', title: complete ? '첫막 시험 완료' : '빌드 시험 결과', body: `<p>${summary}</p><p>첫막 고정 동선: 일반전 → 정예전 → 반장</p>`, back: { label: '빌드 고르기', attrs: 'data-build-pick' }, go: { label: step < 0 || !win || complete ? '첫막을 간다' : '계속 간다', attrs: 'data-build-next' } });
  el.querySelector('[data-build-pick]')!.addEventListener('click', buildPick);
  el.querySelector('[data-build-next]')!.addEventListener('click', next);
};

/** 시험장 고르기 화면 */
const labPick = (): void => {
  // L 창 (D-391, 개발용): 명패 「근간 시험장」 · 두 규칙 = 움푹 칸 단추 둘 · [돌아간다]
  const card = (m: 'A' | 'B') => `<button type="button" class="inset lab-pick" data-lab="${m}"><span class="lg-name">${LAB_TEXT[m].name} · 이김 ${labScore[m].w} · 짐 ${labScore[m].l}</span>${LAB_TEXT[m].how.map((h) => `<span>${h}</span>`).join('')}</button>`;
  const el = openWin({ size: 'l', title: '근간 시험장', body: `<p>같은 판 · 같은 적 · 같은 덱입니다. 둘 다 해 보고 어느 쪽이 손에 붙는지 알려 주십시오.</p><div class="lab-row">${card('A')}${card('B')}</div>`, back: { label: '돌아간다', attrs: 'data-lab-back' } });
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
    const el = openWin({ size: 'm', title: `시험장 ${m}`, head: `<span class="tag">이김 ${labScore[m].w} · 짐 ${labScore[m].l}</span>`, body: `<p>${isWin ? '이겼습니다' : '졌습니다'} · ${b.turn}턴 · 남은 내 기물 ${b.s.pieces.filter((p) => p.side === 0).length} / ${LAB.squad.length}</p>`, back: { label: '돌아간다', attrs: 'data-lab-pick' }, go: { label: '다시 둔다', attrs: 'data-lab-again' } });
    el.querySelector('[data-lab-pick]')!.addEventListener('click', labPick);
    el.querySelector('[data-lab-again]')!.addEventListener('click', () => startLab(m));
  }, 700);
};

// ---------- 저장 · 승급 · 오늘의 출하 (R6, D-174) ----------
/** 대국 사이 회복 (난이도 3부터 기본 회복의 30%) */
const restHeal = (): number => REST.heal * (asc >= 3 ? ASC_NUM.restMul : 1);
/** 고물상 값 (승급 4부터 비싸다) */
/** 고물상 값: 승급 4 이상 · 탐욕의 저울(대가 +25%)이면 오른다 */
const ascPrice = (n: number): number => Math.round(n * (asc >= 4 ? ASC_NUM.shopMul : 1) * (parts.includes('greed') ? PART_NUM.greedShop : 1));

/** 새 출하: 시드 · 승급 · 오늘의 출하. 분대 · 덱 · 부품 · 나사 · 지도를 처음으로 */
const newRun = (seed: number, level: number, day: string | null, mode: RunMode = day ? 'daily' : 'story', set: StartSetId = 'standard'): void => {
  startSet = day ? 'standard' : set;
  runMode = day ? 'daily' : mode;
  storyChapter = Math.max(0, Math.min(STORY_COUNT - 1, level)) as StoryChapter;
  storyPromise = undefined;
  storyBeats = [];
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
  meltedRun = [];
  R = new Rng(seed ^ 0x51c3);
  actI = 0;
  rowI = 0;
  won = 0;
  stage = 0;
  gold = 0;
  refined = [];
  parts = [];
  deck = [...START_SETS[startSet].deck];
  // 승급 7 (조항 「하자 세트의 명령서에는 녹을 섞는다」): 시작 덱 한 장이 녹슨 카드
  if (level >= 7) deck[deck.length - 1] = rustOnce(deck[deck.length - 1]);
  picked = [[], [], [], []];
  actSnap = { won: 0, kills: 0, gold: 0, deck: deck.length, kb: {}, db: {} };
  // 최근 출하에서 만난 사건은 이번 가방에서 뺀다 (D-247, 사용자: 「랜덤 인카운터가 너무 동일하게 반복」) — 가방이 비면 다시 전부
  { const recent = readMeta(store).evRecent ?? []; eventBag = SLICE_EVENT_IDS.filter((x) => !recent.includes(x)); if (eventBag.length < 4) eventBag = [...SLICE_EVENT_IDS]; }
  runId = runIdentity(runMode, level, seed);
  squad = [];
  metaCache = null;
  for (const t of START_SETS[startSet].squad) squad.push(crewOf(t));
  applyStartSet(seed);
  const leader = squad.find((u) => u.t === 'K'); if (leader) leader.name = '종이왕';
  const deputy = squad.find((u) => u.t === 'N'); if (deputy && runMode === 'story' && storyChapter === 0) { deputy.name = '박차'; deputy.scars = [...(deputy.scars ?? []), '주조 흠집']; }
  // 승급 10 (조항 「심장 톱니는 금 간 것으로」): 킹이 아닌 분대원 하나가 깨진 심장 톱니로 시작
  if (level >= 10) { const i = squad.findIndex((u) => u.t !== 'K'); if (i >= 0) squad[i] = { ...squad[i], cracked: true }; }
  clutchLeft = dir.clutch(level);
  sacLeft = dir.sacrifice(level);
  closeActs = [];
  highlight = null;
  charms = { revive: level <= CHARM_NUM.startReviveUpTo ? 1 : 0, rewind: CHARM_NUM.startRewind + (START_SETS[startSet].rewind ?? 0) };
  lossesHere = 0;
  lossDef = null;
};

/**
 * 시작 세트 (D-485): 세트의 분대 · 덱은 newRun이 깔고, 여기서는 덧붙는 것 — 이형 분대원(잡종) · 시작 부품(보병 · 고철) · 되감기 부적(무작위 배치).
 * 지도 rng(R)를 건드리지 않게 시드에서 따로 뽑는다.
 */
const applyStartSet = (seed: number): void => {
  const set = START_SETS[startSet];
  const rng = new Rng(seed ^ 0x5e75e7);
  if (set.form) {
    const open = FORM_IDS.filter((f) => (readMeta(store).unlocked ?? []).includes(formKey(f)));
    const f = open.length ? open[rng.int(open.length)] : null;
    if (f) {
      const c = crewOf(FORMS[f].base);
      c.form = f;
      delete c.quirk;
      squad.push(c);
      const card = RECRUITS.find((r) => r.t === FORMS[f].base)?.cards[0];
      if (card) deck.push(card, card);
    } else squad.push(crewOf('N')); // 이형이 없으면(옛 저장 · 조작) 나이트로
  }
  if (set.part) parts.push(set.part);
  for (let k = 0; k < (set.randomParts ?? 0); k++) {
    const pool = (STARTER_PARTS as SlicePartId[]).filter((id) => SLICE_PARTS[id] && (PART_GRADE[id] ?? 'common') !== 'gold' && !parts.includes(id) && partFits(id, squad.map((u) => u.t), parts, squad));
    if (pool.length) parts.push(pool[rng.int(pool.length)]);
  }
};

/** 지금 출하를 저장한다 (지도에 설 때 · 대국을 시작할 때) */
const saveRun = (at: 'map' | 'battle' | 'reward', node?: number, pending?: PendingReward): void =>
  writeSave(store, { v: 2, seed: runSeed, startSet, asc, mode: runMode, chapter: storyChapter, promise: storyPromise, storyBeats, daily, runId, actI, rowI, picked, squad, deck, parts, gold, won, stage, refined, eventBag, rng: R.state, at, node, pending, clutchLeft, sacLeft, closeActs, highlight, charms, first: firstShip, shopsSeen, svc: svcUsed, bosses: runBosses, actSnap });

/** 저장한 출하를 되살린다 */
const loadRun = (sv: RunSave): void => {
  runSeed = sv.seed;
  startSet = sv.startSet ?? 'standard';
  runMode = sv.mode ?? (sv.daily ? 'daily' : 'challenge');
  storyChapter = sv.chapter ?? 0;
  storyPromise = sv.promise;
  storyBeats = sv.storyBeats ?? [];
  asc = sv.asc;
  daily = sv.daily;
  openIds = sv.daily ? null : new Set([...STARTER_CARDS, ...STARTER_PARTS, ...(readMeta(store).unlocked ?? [])]);
  firstShip = !!sv.first;
  shopsSeen = sv.shopsSeen ?? 0;
  svcUsed = sv.svc ?? { refine: 0, remove: 0 };
  runBosses = (sv.bosses ?? []) as StoryBoss[];
  runLive = true;
  acts = buildRun(sv.seed, sv.asc, firstShip);
  R = new Rng(sv.rng);
  ({ runId, actI, rowI, picked, squad, deck, parts, gold, won, stage, refined, eventBag } = sv);
  while (picked.length < 4) picked.push([]); // 예전 저장은 세 막 몫만 — 종막 몫을 채운다
  // 덱은 저장 그대로 (#20 · D-488 — 옛 「+」 이관이 다듬은 카드가 사라진 뒤 남은 같은 카드를 모두 「+」로 바꿨다)
  deck = restoreDeck(sv);
  clutchLeft = sv.clutchLeft ?? dir.clutch(sv.asc);
  sacLeft = sv.sacLeft ?? dir.sacrifice(sv.asc);
  closeActs = sv.closeActs ?? [];
  highlight = sv.highlight ?? null;
  // 부적 (D-228) 전 저장: 그때는 다시 하기가 무제한이었다 — 시작 몫을 그대로 준다
  charms = sv.charms ?? { revive: sv.asc <= CHARM_NUM.startReviveUpTo ? 1 : 0, rewind: CHARM_NUM.startRewind };
  // 막 장부 (D-402) 전 저장: 이번 막 시작 값을 모르니 지금 값에서 센다
  actSnap = sv.actSnap ?? snapNow();
};

/** 출하 결과 (끝까지 갔거나 그만뒀을 때): 분대 · 기록 · 다시. 저장을 지우고 기록을 남긴다 (승급이 열린다) */
// ---------- 각본: 도금왕 · 승급 (docs/script.md §9 ~ §10, D-276) ----------
/** 도금왕 2단계: 비꼼 — 이번 출하에 쓰러뜨린 반장 하나(마지막 것)에게 한 말을 되돌려 준다 */
const storyCompany = () => ({
  alive: squad.filter((u) => u.t !== 'K').map((u) => ({ name: crewLabel(u), serial: u.serial, t: u.t })),
  promised: storyPromise ? { name: storyPromise.name, alive: squad.some((u) => u.serial === storyPromise!.serial) } : undefined,
  melted: meltedRun,
});
const gildedPhase2 = async (): Promise<void> => {
  if (runMode !== 'story') return;
  const last = runBosses.at(-1);
  await playCuts([{ img: gildedArt(), bg: ['#2a1e08', '#0b0b0e'], glow: '#facc15', art: [],
    lines: [...GILDED_STORY.phase2(storyChapter).split('\n'), ...(last ? BOSS_STORY[last].mock.split('\n') : []), GILDED_STORY.phase2End].map((t) => ({ k: 's' as const, who: '도금왕', t })) }]);
};
const gildedArt = (): string => `boss-gilded${runMode === 'story' ? storyChapter ? `-${storyChapter}` : '' : asc <= 5 ? '-1' : asc <= 8 ? '-2' : '-3'}`;
const promoteScreen = (): Promise<'throne' | 'depart'> => {
  closeWin();
  const company = storyCompany();
  return promotionScene({ chapter: storyChapter, art: 'gilded-fallen', companion: company.alive[0]?.name, promisedLost: company.promised && !company.promised.alive ? company.promised.name : undefined });
};
let endKind: EndingKind = 'throne';
const endingFlow = async (): Promise<void> => {
  if (runMode !== 'story') {
    endKind = runMode;
    return runEnd(true);
  }
  endKind = await promoteScreen();
  const company = storyCompany();
  if (endKind === 'depart') {
    await playCuts(trueEndingCuts(company.alive.map((u, i) => ({ t: u.t, side: 0, x: 18 + i * 8, y: 55, h: 20 })), company));
  } else {
    await playCuts(promotionCuts(storyChapter, company.alive[0]?.name ?? '', ASCENSION[STORY_LAW[storyChapter]].law, runBosses.length ? oneLine(BOSS_STORY[runBosses.at(-1)!].mirror) : '', company));
  }
  runEnd(true);
};

/** 출하 끝 — 졌으면 용광로 컷(각본 §12)을 먼저 */
const runEnd = (cleared: boolean): void => {
  if (!cleared && !labMode) return void playCuts([DEFEAT]).then(() => runEndNow(false));
  runEndNow(cleared);
};
const runEndNow = (cleared: boolean): void => {
  // D-477 (베타 점검): 도전 · 오늘의 도전은 마지막 보상 화면(사선 부품 · 칸 가득)이 열린 채 크레딧이 그 아래로 깔렸다 — 먼저 닫는다
  closeWin();
  closeOverlay();
  // 지표 ③ · ④: 한 판 길이 · 끝난 자리 · 쓰지 않고 남긴 되감기 · 부적
  track('session_exit', { ...where(), run_time_min: Math.round((Date.now() - runAt) / 6000) / 10, turn_num: b?.turn ?? 0, exit_type: cleared ? 'clear' : 'gameover' });
  if (!cleared) track('gameover_inventory', { ...where(), rewinds_left: charms.rewind, revive_charm_left: charms.revive, total_rewinds_used: rewindsUsedRun, deck_size: deck.length, parts });
  if (!cleared) ftue('gameover', true);
  clearSave(store);
  document.body.classList.add('between');
  placeBg(cleared ? 'end-clear' : 'end-fail');
  const m0 = readMeta(store);
  const m = recordRun(m0, { cleared, act: actI + 1, won, asc, daily, mode: runMode, chapter: storyChapter, ending: endKind, crown: { chapter: storyChapter, runId, law: ASCENSION[STORY_LAW[storyChapter]].law, companions: squad.filter((u) => u.t !== 'K').map(crewLabel) } });
  // 해금 (D-284): 출하를 끝낼 때마다 몇 개씩 — 도달한 막 · 완주에 따라
  const earned = daily ? [] : nextUnlocks(m.unlocked ?? [], unlockCount(Math.min(4, actI + 1), cleared));
  if (earned.length) m.unlocked = [...(m.unlocked ?? []), ...earned];
  const fresh = (m.unlocked ?? []).filter((id) => !(m0.unlocked ?? []).includes(id));
  writeMeta(store, m);
  const freshNames = fresh.map((id) => (id in SLICE_PARTS ? SLICE_PARTS[id as SlicePartId].name : COMMANDS[id as CommandId]?.name ?? id));
  const unlocked = (m.challengeOpen ?? CHALLENGE_START) > (m0.challengeOpen ?? CHALLENGE_START);
  const nextChapter = (m.storyCleared ?? 0) > (m0.storyCleared ?? 0);
  const fallenNow = readLedger().filter((r) => r.run === runId);
  const kills = squad.reduce((n, u) => n + (u.kills ?? 0), 0) + fallenNow.reduce((n, r) => n + r.kills, 0);
  // 결과 장면 (D-394 .scr-place): 왼쪽 결과 그림 40% · 오른쪽 명패 → 한 줄 → 수치 넷(30px) → 분대 칩 → 구분 줄 → 새로 열림 꼬리표 · [결과 공유하기 | 메인 화면으로]
  const chip = (name: string, t: PieceType, bad = false) => `<span class="re-chip${bad ? ' bad' : ''}">${pieceImg(t, 0, 'small', 24)}${name}</span>`;
  const opens = [...(freshNames.length > 10 ? ['기본 카드·부품 모두 해금'] : freshNames.slice(0, 3)), ...(nextChapter ? [(m.storyCleared ?? 0) < STORY_COUNT ? chapterLabel(m.storyCleared!) : '도전 모드 해금'] : []), ...(unlocked ? [runLabel('challenge', m.challengeOpen!)] : [])];
  const nums = [won, kills, gold, deck.length];
  // 출하 끝 (D-424): 크레딧(동료 이름 → 제작진) 마지막 장 = 출하 끝 장부 — 막 장부 넷을 모은 장부 + 「정품 판정」 도장 ·
  // 어느 엔딩이었나 꼬리표 · 다음 출하(승급) 예고 · [결과 공유하기 | 메인 화면으로]. 따로 서는 결과 화면은 없다 — 진 출하는 아래 결과 장면 그대로
  if (cleared) {
    const storyNext = (m.storyCleared ?? 0) < STORY_COUNT;
    const nextAsc = Math.max(0, Math.min(ASC_OMEN.length - 1, (storyNext ? m.storyCleared ?? 0 : m.challengeOpen ?? CHALLENGE_START) - 1));
    const nextPreview = storyNext ? { head: `다음 · ${chapterLabel(m.storyCleared ?? 0)}`, line: (m.storyCleared ?? 0) === 0 ? '새 폰과 분대가 함께 나갈 길을 찾습니다.' : ASC_OMEN[nextAsc][0], num: (m.storyCleared ?? 0) === 0 ? `본편 1 / ${STORY_COUNT}` : ASC_OMEN[nextAsc][1] } : runMode === 'challenge' && asc === ASCENSION.length ? { head: '최고 난이도 완료', line: '모든 도전 난이도를 완료했습니다.', num: '본편과 도전 기록은 따로 남습니다.' } : { head: `도전 모드 · 난이도 ${(m.challengeOpen ?? CHALLENGE_START) - CHALLENGE_START + 1}`, line: ASC_OMEN[nextAsc][0], num: ASC_OMEN[nextAsc][1] };
    const mvp = mvpOf([...squad.filter((u) => u.t !== 'K').map((u) => ({ name: u.name ?? PIECE_NAMES_KO[u.t], t: u.t, kills: u.kills ?? 0, dmg: u.dmg ?? 0 })), ...fallenNow.map((r) => ({ name: r.name, t: r.t, kills: r.kills, dmg: 0 }))]);
    const home = (): void => (sessionStorage.setItem('op-menu', '1'), location.reload());
    const kind = endKind;
    endKind = 'throne';
    const ledger = (): Promise<unknown> => clearScreen({
      mode: 'run',
      inCredits: true,
      title: endingLabel(kind),
      tag: `<span class="ribbon${kind === 'throne' ? ' r-crimson' : ''}">${daily ?? runLabel(runMode, asc, storyChapter)}</span>`,
      tabs: clearTabs(3, true),
      rows: [
        { k: SCREEN_TEXT.tally[0], v: won },
        { k: SCREEN_TEXT.tally[1], v: kills },
        { k: SCREEN_TEXT.tally[2], v: gold },
        { k: SCREEN_TEXT.tally[3], v: deck.length, unit: '장' },
        { k: '부품', v: parts.map((p) => SLICE_PARTS[p].name).slice(0, 3).join(' · ') || '없음' },
      ],
      mvp,
      opens,
      next: nextPreview,
      art: 'end-clear',
      focus: [0.27, 0.62],
      stampTag: SCREEN_TEXT.clear,
      stampWord: SCREEN_TEXT.clearWord,
      back: SCREEN_TEXT.note,
      go: SCREEN_TEXT.home,
    }).then((r) => (r === 'go' ? home() : surveyScreen(0, {}, () => exportScreen(home))));
    const crew = [...squad.filter((u) => u.t !== 'K').map((u) => ({ t: u.t, name: crewLabel(u) })), ...fallenNow.map((r) => ({ t: r.t, name: r.name, fallen: true }))];
    // 크레딧 머리 줄 = 출하 몇 번째 · 날짜 (승급 · 엔딩 이름은 닫는 장 꼬리표에만)
    void creditsScene(crew, `완주 ${m.clears}회 · ${new Date().toISOString().slice(0, 10)}`, { record: kind === 'depart', ending: endingLabel(kind), close: ledger });
    return;
  }
  const el = placeScreen({
    art: cleared ? 'end-clear' : 'end-fail',
    focus: cleared ? [0.27, 0.62] : [0.33, 0.72],
    title: cleared ? SCREEN_TEXT.clear : SCREEN_TEXT.fail,
    tag: `${daily ? `<span class="ribbon">${SCREEN_TEXT.daily}</span>` : ''}${`<span class="ribbon r-crimson">${runLabel(runMode, asc, storyChapter)}</span>`}`,
    cls: 'scr-result',
    body: `<p>${cleared ? SCREEN_TEXT.clearLine : SCREEN_TEXT.failLine(actLabel(actI + 1))}</p>
      <div class="tally slip">${SCREEN_TEXT.tally.map((k, i) => `<div><b data-v="${nums[i]}">${nums[i]}</b><span>${k}</span></div>`).join('')}</div>
      <div class="re-row">${squad.map((u) => chip(u.name ?? PIECE_NAMES_KO[u.t], u.t)).join('')}${fallenNow.map((r) => chip(r.name, r.t, true)).join('')}</div>
      ${opens.length || highlight ? '<hr class="divider">' : ''}
      ${opens.length ? `<div class="re-open"><span class="note">${SCREEN_TEXT.opened}</span>${opens.map((n) => `<span class="ribbon">${n}</span>`).join('')}</div>` : ''}
      ${highlight ? `<p class="note">묘수 — ${highlight.where} ${highlight.turn}턴 · 처치 ${highlight.kills} · 피해 ${highlight.damage}</p>` : unlocked ? `<p class="note">「${ASCENSION[m.ascOpen - 1].law}」</p>` : ''}`,
    back: { label: SCREEN_TEXT.note, attrs: 'data-survey' },
    go: { label: SCREEN_TEXT.home, attrs: 'data-restart' },
  });
  // 시험판 (D-234): 결과 공유하기 = 설문 → 기록 보내기 — 닫으면 이 결과 화면으로 돌아오지 않고 처음 화면으로
  const home = (): void => (sessionStorage.setItem('op-menu', '1'), location.reload());
  el.querySelector('[data-restart]')!.addEventListener('click', home);
  el.querySelector('[data-survey]')!.addEventListener('click', () => surveyScreen(0, {}, () => exportScreen(home)));
  // 결과 집계 (D-189): 줄이 밀려 들어오고 숫자가 째깍 올라간다
  tally(el.querySelector<HTMLElement>('.tally')!);
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
  document.querySelector('.coach-band')?.remove();
  const done = await runTutorial(steps, { pause: () => enemyTurn || document.body.classList.contains('rev-freeze') || (busy && !document.body.classList.contains('between')), name: TUT.name, skip: TUT.skip, skipAgain: TUT.skipAgain, next: TUT.next, face: '<img src="ui/hud/adjutant.png" alt="" width="56" height="56">', tick: () => sfx('tap', 3) });
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
/** 판 전체 (짚을 곳이 판일 때) */
const boardEl = (): Element => $('board').querySelector('canvas') ?? $('board');
/** 이 id의 기물 칸 (기물은 수마다 새 객체 — 자리는 늘 지금 판에서 id로 찾는다) */
const pieceAt = (id: number): DOMRect | null => { const q = b.s.pieces.find((p) => p.id === id); return q ? tileRect(q) : null; };
const selCardEl = (): Element | null => (selCard !== null ? document.querySelector(`#hand [data-card="${selCard}"]`) : null);
const pickedCard = (id: CommandId) => (): boolean => selCard !== null && b.hand[selCard] === id;
const wait = (ms: number): Promise<void> => new Promise((r) => window.setTimeout(r, ms));
/** 칸 여럿을 감싸는 사각형 (부관 띠가 그 칸들을 덜 가리는 쪽에 선다) */
const tilesRect = (ps: Pos[]): DOMRect | null => {
  const rs = ps.map(tileRect);
  if (!rs.length) return null;
  const x0 = Math.min(...rs.map((q) => q.left)), y0 = Math.min(...rs.map((q) => q.top));
  return new DOMRect(x0, y0, Math.max(...rs.map((q) => q.right)) - x0, Math.max(...rs.map((q) => q.bottom)) - y0);
};

/**
 * 시험대 A 「치는 칸」 (P-C D-502): 폰 → (1,2)에 내려앉아 대각선 앞 (2,3) 폰 처치 · 나이트 → (2,2)에 내려앉아 L자로 (4,3) 폰 처치.
 * 적은 움직이지 않는다. 손패 · 판만 보인다. 수 둘 다 금빛 과녁(처치) — 「쳤는데 안 아프다」가 없다.
 */
const drillA = (): Promise<boolean> => {
  const T = TUT.drillA;
  const pawnId = myPiece('P')?.id ?? -1;
  const knightId = myPiece('N')?.id ?? -1;
  return tutorial('drill-a', [
    { text: T.hello, target: boardEl },
    { text: T.card, target: () => cardEl('advance'), wait: pickedCard('advance') },
    { text: T.piece, target: () => pieceAt(pawnId), peek: () => [selCardEl()], wait: () => selPiece === pawnId },
    { text: T.marks, target: () => tilesRect([{ x: 1, y: 2 }, { x: 1, y: 3 }]), peek: () => [selCardEl()] },
    { text: T.shape, target: () => tileRect({ x: 1, y: 2 }), peek: () => [selCardEl(), tileRect({ x: 2, y: 3 })] },
    { text: T.go, target: () => tileRect({ x: 1, y: 2 }), peek: () => [selCardEl()], wait: () => b.kills >= 1 && !busy },
    { text: T.still, target: () => pieceAt(knightId) },
    { text: T.card2, target: () => cardEl('leap'), wait: pickedCard('leap') },
    { text: T.piece2, target: () => pieceAt(knightId), peek: () => [selCardEl()], wait: () => selPiece === knightId },
    { text: T.shape2, target: () => (selCard !== null ? tilesRect(cardMoves(b, selCard, knightId)) : boardEl()), peek: () => [selCardEl()] },
    { text: T.go2, target: () => tileRect({ x: 2, y: 2 }), peek: () => [selCardEl(), tileRect({ x: 4, y: 3 })], wait: () => b.kills >= 2 && !busy },
    { text: T.done },
  ]);
};

/**
 * 시험대 B 「예고와 막기」 (P-C D-502): 적의 첫 수는 짜 두었다(run.ts DRILLS[1].script) — ① 적 폰이 내 폰을, ② 적 폰이 내 킹을 겨눈다.
 * 폰은 붉은 칸에서 빠지며 ①을 친다(×1.5 · 파란 과녁) · 나이트는 ②가 내려앉을 칸을 먼저 차지한다(막기) · 태엽 하나가 남아 지휘(2)는 못 낸다 →
 * 턴 끝 → 두 공격 모두 헛방. 태엽 · 적의 수 · 턴 끝이 이 판에서 처음 열린다.
 */
const drillB = (): Promise<boolean> => {
  const T = TUT.drillB;
  const pawnId = myPiece('P')?.id ?? -1;
  const knightId = myPiece('N')?.id ?? -1;
  const land = { x: 4, y: 1 };
  let p0 = 0;
  return tutorial('drill-b', [
    { text: T.hello, target: boardEl },
    { text: T.red, target: () => tilesRect((b.grazeDanger ?? []).map((k) => { const [x, y] = k.split(',').map(Number); return { x, y }; })) ?? boardEl() },
    { text: T.list, target: () => $('intents') },
    { text: T.card, target: () => cardEl('advance'), peek: () => [pieceAt(pawnId)], wait: pickedCard('advance') },
    { text: T.piece, target: () => pieceAt(pawnId), peek: () => [selCardEl()], wait: () => selPiece === pawnId },
    { text: T.blue, target: () => tileRect({ x: 1, y: 2 }), peek: () => [selCardEl(), tileRect({ x: 2, y: 3 })] },
    { text: T.go, target: () => tileRect({ x: 1, y: 2 }), peek: () => [selCardEl()], enter: () => (p0 = playsMade), wait: () => playsMade > p0 && !busy },
    { text: T.king, target: () => cardEl('leap'), peek: () => [tileRect(land)], wait: pickedCard('leap') },
    { text: T.piece2, target: () => pieceAt(knightId), peek: () => [selCardEl(), tileRect(land)], wait: () => selPiece === knightId },
    { text: T.block, target: () => tileRect(land), peek: () => [selCardEl()], enter: () => (p0 = playsMade), wait: () => playsMade > p0 && !busy },
    { text: T.ap, target: () => $('vials') },
    { text: T.short, target: () => cardEl('order'), peek: () => [$('vials')] },
    { text: T.end, target: () => $('btn-end'), wait: () => b.turn >= 2 && !busy && !enemyTurn },
    { text: T.miss, target: boardEl },
    { text: T.done },
  ]);
};

/**
 * 시험대 C 「킹 잡기」 = 출하 첫 대국 (P-C D-502): 나이트가 적 킹을 친다 → 체크(HP 1로 버팀) → 한 대 더라는 것을 짚고,
 * 마무리 전에 되감기 실습(톱니는 돌려준다 — D-488) → 직접 체크 · 마무리. 이 묶음이 끝나면 입문 안내 「battle」을 마친 것으로 적는다.
 */
const drillC = (): Promise<boolean> => {
  const T = TUT.drillC;
  const knightId = myPiece('N')?.id ?? -1;
  const foeK = (): DOMRect | null => { const k = b.s.pieces.find((p) => p.side === 1 && p.type === 'K'); return k ? tileRect(k) : null; };
  let p0 = 0;
  let rw0 = 0;
  return tutorial('battle', [
    { text: T.hello, target: foeK },
    { text: T.card, target: () => cardEl('leap'), peek: () => [foeK()], wait: pickedCard('leap') },
    { text: T.piece, target: () => pieceAt(knightId), peek: () => [selCardEl()], wait: () => selPiece === knightId },
    { text: T.go, target: () => tileRect({ x: 4, y: 2 }), peek: () => [selCardEl(), foeK()], enter: () => (p0 = playsMade), wait: () => playsMade > p0 && !busy },
    { text: T.check, target: foeK },
    { text: T.again, target: foeK },
    { text: T.rewind, target: () => $('btn-rewind'), enter: () => (rw0 = rewindsUsedRun), wait: () => rewindsUsedRun > rw0 && !busy },
    // 실습으로 쓴 톱니는 돌려준다. 시작 수(rewindsAtStart)는 그대로 — 둘 다 올리면 대국 끝 정산이 하나를 깎았다 (#4 · D-488)
    { text: T.rewound, target: () => $('btn-rewind'), enter: () => { b.rewinds += 1; refresh(); } },
    { text: T.free, target: boardEl },
  ]);
};

/** 입문 시험대 사이 안내서 한 쪽 (P-C D-502, 후기 #5) — 다음 시험대 번호 k */
const guideOne = (title: string, k: number): Promise<void> => {
  const i = GUIDE_PAGES.findIndex((g) => g.title === title);
  if (i < 0) return Promise.resolve();
  markTip(i);
  return guide(openWin, TUT.guideGo, { only: [i], mid: TUT.guideMid(k) }).then(() => closeWin());
};

/**
 * 처음 출하하는 사람의 입문 (P-C D-502, 후기 #4 · #5 — D-238 · D-454의 한 판 안내를 대신한다):
 * 안내서 「목표」 → 시험대 A 「치는 칸」 → 안내서 「카드 → 기물 → 칸」 → 시험대 B 「예고와 막기」 → 안내서 「적의 예고」 → 시험대 C 「킹 잡기」(첫 대국 · 영입 보상).
 * 판마다 생각 하나 · 그 생각에 필요한 HUD만. 어디서든 [건너뛴다]를 누르면 남은 안내 없이 C로.
 */
const onboarding = async (): Promise<void> => {
  const drill = async (k: number, run: () => Promise<boolean>): Promise<boolean> => {
    if (cur !== DRILLS[k]) startBattle(DRILLS[k], true);
    if (k === 0) await guideOne('목표', 1);
    // 판이 서는 동안 부관은 기다린다(tutorial의 pause = busy) — 판이 다 선 순간 바로 이어 받아, 대본 밖의 수가 끼어들 틈이 없다
    void battleIntro();
    await wait(250);
    const ok = await run();
    if (ok) ftue(`drill_${DRILLS[k].drill}_done`);
    return ok;
  };
  let ok = await drill(0, drillA);
  if (ok) {
    await guideOne('카드 → 기물 → 칸', 2);
    ok = await drill(1, drillB);
  }
  if (ok) await guideOne('적의 예고', 3);
  startBattle(INTRO[0], true);
  const intro = battleIntro();
  if (!ok) return;
  await wait(250);
  await drillC();
  await intro;
};
/** 이번 대국에서 낸 카드 수 (안내가 「한 수 두었다」를 안다) */
let playsMade = 0;

/** 첫 판으로 들어간다 (새 출하 · 오늘의 출하) */
const begin = async (seed: number, level: number, day: string | null, mode: RunMode = day ? 'daily' : 'story', set?: StartSetId): Promise<void> => {
  // 시작 세트 (D-485): 첫 출하 · 오늘의 도전 · 시험장은 표준 세트로 바로
  const pick = set ?? (day || labMode || readMeta(store).runs === 0 || !tutDone('battle') ? 'standard' : await setPick()); // 입문 안내가 남은 사람은 짜 둔 손패가 필요하다
  // 두 번째 출하부터 (각본 S1′): 포장대의 그림자 한 컷
  newRun(seed, level, day, mode, pick);
  if (mode === 'story' && !day && readMeta(store).runs >= 1 && !labMode) { const meta = readMeta(store); await playCuts([shadowCut(storyChapter, meta.crownedKings?.find((k) => k.chapter === storyChapter - 1)?.law, (meta.storyAttempts?.[storyChapter] ?? 0) > 0)]); }
  saveRun('battle', 0);
  // 처음 온 사람 (D-238 → P-C D-502): 전환 카드 · 안내 알림 대신 작은 시험대 셋 — 글이 겹치지 않게 한 목소리만
  const first = !tutDone('battle');
  startBattle(first ? DRILLS[0] : INTRO[0], true);
  closeOverlay();
  closeOpening();
  sfx('submit');
  if (first) return void onboarding();
  void stageIntro(INTRO[0]).then(() => {
    void battleIntro();
  });
};

/**
 * 시작 세트 고르기 (D-485, GDD 21장 §4): 「하나 고르기」 화면 그대로 — 받침 = 세트(분대 기물 그림 · 세 줄), 받침 아래 = 한 줄 말.
 * 한 쪽에 셋: 기본 셋 → 해금 셋(잠긴 세트는 꺼진 받침 + 여는 조건). 같은 받침을 다시 누르면 확정.
 */
const setPick = (): Promise<StartSetId> => new Promise((done) => {
  const unlocked = readMeta(store).unlocked ?? [];
  const pages = [START_SET_IDS.slice(0, 3), START_SET_IDS.slice(3)];
  let page = 0;
  const face = (id: StartSetId): string => {
    const st = START_SETS[id];
    const open = setOpen(id, unlocked);
    // 같은 기물은 한 번 + ×수 (지도 미리보기 적 명단과 같은 꼴) — 창이 좁아 넷을 나란히 두면 잘린다
    const cnt = new Map<PieceType, number>();
    for (const t of st.squad) cnt.set(t, (cnt.get(t) ?? 0) + 1);
    const pcs = [...cnt].map(([t, n]) => `<span class="ss-pc">${pieceImg(t, 0, 'small', 24)}${n > 1 ? `<i>×${n}</i>` : ''}</span>`).join('') + (st.form ? `<i class="ss-form">${SET_TEXT.formMark}</i>` : '');
    return `<button type="button" class="cf part-card start-set g-${open ? (st.unlock ? 'rare' : 'common') : 'common'}" data-grade="${st.unlock ? 'rare' : 'common'}" aria-label="${st.name}"${open ? '' : ' disabled'}><b class="cf-name">${st.name}</b><span class="cf-win ss-pcs">${pcs}</span><small class="cf-desc"><span class="part-rule-lines">${st.rows.map((t, k) => lineHtml(t, k === 2 ? 'say' : k === 0 ? 'name' : 'if')).join('')}</span></small><i class="cf-gem"></i></button>`;
  };
  const draw = (): void => {
    const ids = pages[page];
    const el = pickScreen({
      title: SET_TEXT.title,
      tag: `<span class="ribbon">${SET_TEXT.page(page + 1, pages.length)}</span>`,
      items: ids.map((id) => ({ key: id, html: face(id), off: !setOpen(id, unlocked), info: setOpen(id, unlocked) ? `<span>${START_SETS[id].line}</span>` : `<span class="bad">${START_SETS[id].lockText}</span>` })),
      skip: { label: page ? SET_TEXT.prev : SET_TEXT.next, attrs: 'data-page' },
      onSelect: () => sfx('lift'),
      onPick: (key, slot) => {
        if (!setOpen(key as StartSetId, unlocked)) return;
        takeFx(slot, () => { sfx('submit'); track('start_set', { set: key }); closeOverlay(); done(key as StartSetId); });
      },
    });
    el.querySelector('[data-page]')?.addEventListener('click', () => { page = 1 - page; sfx('tap'); draw(); });
  };
  draw();
});

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
    const sv = readSave(store), meta = readMeta(store), today = todayKey();
    let mode: 'story' | 'challenge' = (meta.storyCleared ?? 0) >= STORY_COUNT ? 'challenge' : 'story';
    let chapter = Math.min(STORY_COUNT - 1, meta.storyCleared ?? 0);
    let challenge = meta.challengeOpen ?? CHALLENGE_START;
    const seed = () => (Date.now() ^ 0x2f17) & 0xffffff;
    const launch = (dailyRun = false): void => {
      const go = () => begin(dailyRun ? dailySeed(today) : seed(), dailyRun ? 0 : mode === 'story' ? chapter : challenge, dailyRun ? today : null, dailyRun ? 'daily' : mode);
      if (!sv) return void go();
      const ok = openWin({ size: 's', title: '새 출하', body: '<p>저장한 출하를 버리고 새로 시작합니다.</p>', back: { label: '그만둔다', attrs: 'data-no' }, go: { label: '시작한다', attrs: 'data-yes', kind: 'crimson' }, dismiss: closeWin });
      ok.querySelector('[data-no]')!.addEventListener('click', closeWin);
      ok.querySelector('[data-yes]')!.addEventListener('click', () => void go());
    };
    const draw = (): void => {
      const level = mode === 'story' ? chapter : challenge;
      const dev = new URLSearchParams(location.search).has('debug');
      const openChallenge = (meta.storyCleared ?? 0) >= STORY_COUNT;
      nav.innerHTML = `<div class="op-modes"><button type="button" class="btn k-${mode === 'story' ? 'brass' : 'iron'}" data-mode="story" aria-pressed="${mode === 'story'}">본편</button><button type="button" class="btn k-${mode === 'challenge' ? 'brass' : 'iron'}" data-mode="challenge" aria-pressed="${mode === 'challenge'}"${openChallenge ? '' : ' disabled aria-label="본편 3장을 완료하면 도전 모드가 열립니다"'}>도전${openChallenge ? '' : ' · 잠김'}</button></div>
        ${sv ? `<button class="btn op-main" type="button" data-cont><b>이어하기</b><small>${runLabel(sv.mode ?? (sv.daily ? 'daily' : 'challenge'), sv.asc, sv.chapter ?? 0)} · ${actLabel(sv.actI + 1)}</small></button>` : ''}
        <div class="op-run"><button class="btn brass op-main" type="button" data-go><b>${mode === 'story' ? '본편 시작' : '도전 시작'}</b><small>${mode === 'story' ? CHAPTERS[chapter].name : runLabel(mode, level)}</small></button><button type="button" class="btn k-iron op-level" data-level-pick aria-label="${mode === 'story' ? '본편 장 선택' : '도전 난이도 선택'}">${mode === 'story' ? `${chapter + 1}장` : `난이도 ${challenge - CHALLENGE_START + 1}`} ▾</button></div>
        <button class="btn op-main op-daily" type="button" data-daily><b>오늘의 도전</b><small>${meta.daily[today] ? '기록 완료 · 다시 도전' : today}</small></button>
        <div class="op-tools"><button class="btn op-minor" type="button" data-guide>안내서</button><button class="btn op-minor" type="button" data-ledger>도감</button><button class="btn op-minor" type="button" data-prologue>프롤로그</button></div>
        ${dev ? `<div class="op-sub op-dev"><button class="btn" type="button" data-lab-open>시험장</button><button class="btn" type="button" data-build-open>빌드 시험</button></div>` : ''}`;
      nav.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((button) => button.addEventListener('click', () => { mode = button.dataset.mode as typeof mode; draw(); nav.querySelector<HTMLButtonElement>(`[data-mode="${mode}"]`)?.focus(); }));
      nav.querySelector('[data-level-pick]')!.addEventListener('click', () => {
        if (mode === 'story') {
          const panel = openWin({ size: 'm', title: '왕관 선택', body: `<div class="stack">${CHAPTERS.map((ch, i) => `<button type="button" class="choice" data-chapter="${i}"${i > (meta.storyCleared ?? 0) ? ' disabled' : ''}><span class="choice-name">${ch.label} · ${ch.name}</span><span class="choice-res">${i < (meta.storyCleared ?? 0) ? '다시 도전' : i === (meta.storyCleared ?? 0) ? '새 폰과 새 분대의 이야기' : '이전 장을 완료하면 열립니다'}</span></button>`).join('')}</div>`, back: { label: '닫는다', attrs: 'data-x' }, dismiss: closeWin });
          panel.querySelector('[data-x]')!.addEventListener('click', closeWin);
          panel.querySelectorAll<HTMLButtonElement>('[data-chapter]').forEach((b) => b.addEventListener('click', () => { chapter = Number(b.dataset.chapter); closeWin(); draw(); }));
        } else {
          let pick = challenge;
          const panel = openWin({ size: 'm', title: '난이도 선택', body: `<p class="lead" data-difficulty></p><p data-difficulty-desc></p><p class="note" data-difficulty-record></p><div class="btn-set">${btnHtml({ label: '이전', attrs: 'data-prev' })}${btnHtml({ label: '다음', attrs: 'data-next' })}</div>`, back: { label: '돌아간다', attrs: 'data-x' }, go: { label: '고른다', attrs: 'data-set' }, dismiss: closeWin });
          const paint = () => {
            panel.querySelector('[data-difficulty]')!.textContent = runLabel('challenge', pick);
            panel.querySelector('[data-difficulty-desc]')!.textContent = `${ASCENSION[pick - 1].name} · ${ASCENSION[pick - 1].desc} (이전 규정 유지)`;
            const rec = meta.challengeRecords?.[pick];
            panel.querySelector('[data-difficulty-record]')!.textContent = rec ? `${rec.attempts}회 도전 · ${rec.clears}회 완주` : '아직 도전하지 않았습니다.';
            panel.querySelector<HTMLButtonElement>('[data-prev]')!.disabled = pick <= CHALLENGE_START;
            panel.querySelector<HTMLButtonElement>('[data-next]')!.disabled = pick >= (meta.challengeOpen ?? CHALLENGE_START);
          };
          panel.querySelector('[data-prev]')!.addEventListener('click', () => { pick--; paint(); });
          panel.querySelector('[data-next]')!.addEventListener('click', () => { pick++; paint(); });
          panel.querySelector('[data-x]')!.addEventListener('click', closeWin);
          panel.querySelector('[data-set]')!.addEventListener('click', () => { challenge = pick; closeWin(); draw(); });
          paint();
        }
      });
      nav.querySelector('[data-go]')!.addEventListener('click', () => launch());
      nav.querySelector('[data-daily]')!.addEventListener('click', () => launch(true));
      nav.querySelector('[data-cont]')?.addEventListener('click', () => {
        loadRun(sv!); closeOpening(); sfx('submit');
        const at = resumeAt(sv!);
        const nd = at === 'map' ? undefined : acts[actI].rows[rowI]?.[sv!.node ?? 0];
        // 이긴 대국의 보상부터 (D-488): 정산은 끝났다 — 같은 난수 자리에서 같은 보상을 다시 연다
        if (at === 'reward' && nd?.battle) return resumeReward(nd.battle, sv!.pending!);
        if (nd?.battle) return startBattle(nd.battle);
        showMap();
      });
      nav.querySelector('[data-ledger]')!.addEventListener('click', () => ledgerView(closeWin));
      nav.querySelector('[data-guide]')!.addEventListener('click', () => void guide(openWin).then(closeWin));
      nav.querySelector('[data-prologue]')!.addEventListener('click', () => void prologue(true));
      nav.querySelector('[data-lab-open]')?.addEventListener('click', labPick);
      nav.querySelector('[data-build-open]')?.addEventListener('click', buildPick);
    };
    draw(); replay(nav, 'in');
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
  if (qs.has('builds')) buildPick();
  else if (qs.has('lab')) labPick();
  else if (!qs.has('debug') || qs.has('opening')) opening();
});
if (new URLSearchParams(location.search).has('debug')) Object.assign(window as object, { slice: () => b, sliceApi: { setPick: () => setPick(), progress: () => readMeta(store), context: () => ({ mode: runMode, chapter: storyChapter, asc, runId, promise: storyPromise, beats: storyBeats }), campaign: (a: number, mode: RunMode = 'story') => { newRun(171 + a, a, null, mode); return 0; }, challengeEnd: (a = CHALLENGE_START) => { runMode = 'challenge'; asc = a; void endingFlow(); }, buildPick, buildTrial: startBuildTrial, movePeek, kitSheet, peekAt: (pos: Pos) => pieceInfo(pos), logPeek: () => logPeek(), stateBand: (t: string, k: 'toast' | 'brass' | 'crimson' = 'toast') => stateBand(t, k), coachNow: () => { coachOn = true; cur = INTRO[0]; refresh(); }, tutNow: () => void onboarding(), drill: (i: number) => startBattle(i < DRILLS.length ? DRILLS[i] : INTRO[0], true), tipNow: (k: 'battle' | 'act' = 'battle') => showTip(k), warnNow: async () => { endWarn(false); return onEnd(); }, revive: (n = 1) => (charms.revive = n), nemesisOf: () => nemesisMeet({ t: 'R', name: '녹슨 집행자', rank: 2, victims: ['먼지투성이', '구부러진 못'], heir: { t: 'N', name: '구부러진 못' } }), win: (size: 's' | 'm' | 'l' = 'm') => openWin({ size, title: '창 견본', head: '<span class="tag">꼬리표</span>', body: '<p>본문 15px 한 줄.</p><p class="note">보조 12px.</p>', back: { label: '닫는다', attrs: 'data-x' }, go: { label: '고른다' }, dismiss: closeWin }), ledger: () => ledgerView(closeWin), help: (t: 'now' | 'dict' = 'now') => help(t), bug: () => bugReport(), exportScr: () => exportScreen(closeWin), survey: (i = 0) => surveyScreen(i, {}, closeWin), promote: (a = 2) => { runMode = 'story'; storyChapter = Math.min(STORY_COUNT - 1, Math.max(0, a)) as StoryChapter; asc = storyChapter; runBosses = ['plate']; void promoteScreen(); }, guideMenu: () => void guide(openWin).then(closeWin), labPick: () => labPick(), begin: (s = 1, level = 0, mode: RunMode = 'story', day: string | null = null, set?: StartSetId) => begin(s, level, day, mode, set), endFlow: (a = 0, bosses: StoryBoss[] = ['plate', 'magnet', 'alarm']) => { runMode = 'story'; storyChapter = Math.min(STORY_COUNT - 1, Math.max(0, a)) as StoryChapter; asc = storyChapter; runBosses = bosses; void endingFlow(); }, pro: () => prologue(), credits: (count = 4, record = false) => { void creditsScene(Array.from({ length: count }, (_, i) => ({ t: (['P', 'N', 'B', 'R'] as PieceType[])[i % 4], name: `먼지투성이 ${i + 1}`, fallen: i % 2 === 1 })), '출하 14번째 · 2026-11-11', { record }); return 0; }, finalAt: (a = 13) => { asc = a; runBosses = ['inspect', 'magnet', 'thorns']; startBattle(FINAL_BOSS(a), true); }, phase2: (r?: StoryBoss) => { if (r) runBosses = [r]; void gildedPhase2(); return 0; }, fallCut: (r: StoryBoss) => { void bossFallCut(r); return 0; }, allFaces, defeat: () => runEnd(false), shadow: (a = 1) => playCuts([shadowCut(a)]), artScene: (img: string) => playCuts([{ img, bg: ['#0b0b0e', '#0b0b0e'], art: [], lines: [{ k: 'n', t: '장면 검수' }], cam: 'still' }]), meltNames: (n: string[]) => (meltedRun = n), replay: (code: string) => { const r = JSON.parse(decodeURIComponent(escape(atob(code)))) as { squad: Squad[]; deck: CommandId[]; parts: SlicePartId[]; refined: CommandId[]; asc: number; def: BattleDef; gold: number }; squad = r.squad; deck = r.deck; parts = r.parts; refined.splice(0, refined.length, ...r.refined); asc = r.asc; gold = r.gold; startBattle(r.def, true); return r.def.title; }, trueEnd: () => playCuts(trueEndingCuts(storyCompany().alive.map((u, k) => ({ t: u.t, side: 0 as const, x: 14 + k * 9, y: 56, h: 22 })), storyCompany())), endA: () => playCuts([ENDING_A]), promoCut: () => playCuts(promotionCuts(storyChapter, storyCompany().alive[0]?.name ?? '', ASCENSION[STORY_LAW[storyChapter]].law, BOSS_STORY.plate.mirror, storyCompany())), bossOf: (rule: BossRule, act: 1 | 2 | 3 = 1) => startBattle(battleFor(act, 'boss', new Rng(7), 0, rule), true), bossIntroOf: (rule: BossRule, act: 1 | 2 | 3 = 1) => startBattle(battleFor(act, 'boss', new Rng(7), 0, rule)), final: () => startBattle(FINAL_BOSS(0)), finalForge: () => { forgeFinal = true; forgeScreen(); }, boardFx: (k: 'row' | 'thorns' | 'stamp') => renderer.debugFx(k), cardPieces, cardMoves, previewPlay, parts: (ids?: SlicePartId[]) => (ids ? (parts = ids) : parts), partPick: () => partPick(SCREEN_TEXT.part, () => showMap()), deckView: (m: 'view' | 'remove' = 'view') => deckView(m, () => showMap()), refine: () => refineScreen(forgeScreen, () => showMap()), brace: () => braceScreen(), full: (ids?: SlicePartId[]) => { const all = Object.keys(SLICE_PARTS) as SlicePartId[]; parts = (ids ?? all).slice(0, partSlotsAt(actI)); gainPart(all.find((id) => !parts.includes(id))!, () => labMode ? closeOverlay() : showMap()); }, reward: () => { cur = { ...cur, reward: 'card' } as BattleDef; rewardFlow(40, 0, []); }, recruitAt: () => recruitPick(SCREEN_TEXT.newCrew, () => showMap(), '<span class="tag">나사 +40</span>'), screenOf: (pos: Pos) => renderer.screenOf(pos), lab: (m: 'A' | 'B') => startLab(m), stand: () => { sacLeft = 1; clutchLeft = 1; return lastStand(true); }, taunt: (c: TauntCue) => { tauntedNow = false; tauntCount = 0; taunt(c, true); }, monoNow: (t: string) => mono(t), betSet: (k: BetKind = 'fast') => { betNow = { kind: k, stake: DIRECTOR.betStake }; refresh(); }, betBreak: () => { b.turn = DIRECTOR.betTurns + 1; refresh(); }, betEnd: (won: boolean) => betResolve(won), apFx: () => apSources(2, (() => { const s0 = JSON.parse(JSON.stringify(b.s)) as typeof b.s; s0.pieces.push({ ...b.s.pieces.find((p) => p.side === 1 && p.type !== 'K')!, id: 999 }); return s0; })(), [], (b.refunded = (b.refunded ?? 0) + 1) - 1, 1), p2Warn: () => p2Warn(BOSS_PHASE_TEXT.low, gridRect()), p2Rise: async (r = 'plate') => { await p2Rise({ art: BOSS_ART[r], word: '반장이 격노해 일어선다' }); const p2 = (BOSS_STORY as Partial<Record<string, { phase2: string }>>)[r]?.phase2; if (p2) await foeStory(p2); }, allyBark: () => { const p = b.s.pieces.find((q) => q.side === 0 && q.type !== 'K'); if (p) bark({ at: () => barkAtPiece(p.id), side: 'ally', name: squad[b.squadIds.indexOf(p.id)]?.name ?? PIECE_NAMES_KO[p.type], face: pieceImg(p.type, 0, 'small', 40), text: CREW_BARK[p.type as CrewKind].kill[0], prio: 1, force: true }); }, foeBark: (cue: FoePieceCue = 'gloat') => { const p = b.s.pieces.find((q) => q.side === 1 && q.type !== 'K'); if (p) bark({ at: () => barkAtPiece(p.id), side: 'foe', name: `적 ${PIECE_NAMES_KO[p.type]}`, face: pieceImg(p.type, 1, 'small', 40), text: FOE_PIECE_BARK[p.type as CrewKind][cue][0], prio: 1, force: true }); }, bet: () => { gold = 60; maybeBet(cur, true); }, finish: () => finish(), meet: () => { const n = nemeses()[0]; if (n) nemesisMeet(n); }, startLive: (act: 1 | 2 | 3) => startBattle(battleFor(act, 'battle', new Rng(act * 7))), intro: (act: 1 | 2 | 3, kind: 'battle' | 'check' | 'boss') => startBattle(battleFor(act, kind, new Rng(act * 7))), redraw: () => { renderer.setup(b.s); refresh(); }, startAt: (act: 1 | 2 | 3, kind: 'battle' | 'check' | 'boss') => startBattle(battleFor(act, kind, new Rng(act * 7)), true), tap: (pos: Pos) => onTap(pos), start: (i: number) => startBattle(i < 1 ? INTRO[i] : battleFor(1, i >= 4 ? 'boss' : i === 3 ? 'check' : 'battle', new Rng(i))), map: (r = 2) => { rowI = r; showMap(); }, shop: () => shopScreen(), eventIds: SLICE_EVENT_IDS, event: (id: string) => eventScreen(id as never), seed: (n: number) => (R = new Rng(n)), hurt: (k = 0.6) => squad.forEach((u) => (u.hp = Math.round(crewMaxHp(u) * k))), forge: () => forgeScreen(), say: (t: PieceType) => crewSay(t, '먼지투성이'), kit: () => kitPick(SCREEN_TEXT.kit, () => showMap()), recruit: () => recruitPick(SCREEN_TEXT.recruit, () => showMap()), forceRecruit: () => (debugRecruit = true), enter: (k: string) => enterNode({ kind: k } as MapNode), crack: (i: number) => { squad[i] = { ...squad[i], cracked: true }; }, crew: () => crewView(), squad: () => squad, nextAct: () => { rowI = acts[actI].rows.length - 1; advance(); }, act: (i: number) => { actI = i; rowI = 1; showMap(); }, setAct: (i: number) => (actI = i), lastRow: () => (rowI = acts[actI].rows.length - 1), botMove: async (style: 'naive' | 'greedy' = 'greedy') => { if (busy || b.s.winner !== null) return 'busy'; const m = bestAction(b, style); if (!m) { await onEnd(); if ($('btn-end').classList.contains('warn')) await onEnd(); return 'end'; } const c = COMMANDS[b.hand[m.i]]; if (m.pieceId === undefined) { pickCard(m.i); return c.name; } await run(m.i, m.pieceId, m.to); return c.name; }, gold: (n: number) => (gold = n), doom: () => { const k = b.s.pieces.find((p) => p.side === 0 && p.type === 'K')!; const sq = dangerSquares(b).find((d) => !b.s.pieces.some((p) => p.x === d.x && p.y === d.y)); if (sq) Object.assign(k, { x: sq.x, y: sq.y }); k.hp = 1; k.shield = 0; b.rewinds = Math.max(1, b.rewinds); b.snap = JSON.stringify({ ...b, snap: '' }); renderer.setup(b.s); refresh(); return !!sq; }, end: (c: boolean) => runEnd(c), endNow: (c: boolean) => runEndNow(c), richRun: () => { if (squad.length < 5) squad.push(crewOf('B'), crewOf('R')); won = 14; gold = 212; deck.push(...(Object.keys(COMMANDS) as CommandId[]).filter((id) => !/[+~]$/.test(id)).slice(0, 10)); runBosses = ['plate', 'magnet', 'alarm']; parts = (Object.keys(SLICE_PARTS) as SlicePartId[]).slice(0, 3); const ks = [12, 7, 5, 9, 3], ds = [340, 188, 152, 260, 71]; squad.filter((u) => u.t !== 'K').forEach((u, i) => { u.kills = ks[i % 5]; u.dmg = ds[i % 5]; u.battles = 14; }); actSnap = { won: 9, kills: 20, gold: 140, deck: deck.length - 4, kb: Object.fromEntries(squad.map((u, i) => [u.serial ?? '', Math.max(0, (u.kills ?? 0) - [3, 6, 2, 4, 1][i % 5])])), db: {} }; return squad.length; }, die: () => { b.falls.push({ ...(b.falls[0] ?? {}), pieceId: b.squadIds[1], turn: b.turn, by: '적 룩' } as never); return deathRites(); } } });
