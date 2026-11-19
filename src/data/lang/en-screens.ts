import type { Loc } from '../locale';
import type { FIT_TEXT_KO, MAP_TEXT_KO, PILE_TEXT_KO, SAFETY_TEXT_KO, SCREEN_TEXT_KO, SERVICE_CARDS_KO, SET_TEXT_KO, SPEED_METER_KO } from '../hud';
import type { CAMPAIGN_TEXT_KO, CHAPTERS_KO } from '../campaign';
import type { EVENT_FX_KO, EVENT_HINT_KO, EVENT_SUM_KO, EVENT_UI_KO } from '../event-talk';
import type { PIECE_NAMES_KO } from '../pieces';
import type { PLAYTEST_TEXT_KO } from '../playtest';

/**
 * 영어 — UI 크롬 둘째 묶음 (D-671): 지도 · 보상 · 고물상 · 작업대 · 사건 창 크롬 · 안내서/용어집 라벨.
 * 낱말은 docs/loc/glossary.md 확정안(D-670)만 — 금지 대안은 tests/loc-glossary.test.ts가 막는다. 미국식 철자.
 * 이야기 · 사건 글 · 카드 · 부품 내용은 아직 한국어로 떨어진다(번역 착수 때).
 * 단추는 동사 하나(voice ⑧), 시스템 글은 평서문, 느낌표는 치명적인 순간과 ⑨ 표지에만. 글자 크기는 한국어 칸 그대로(D-213 · D-653) — 넘치면 낱말을 줄인다.
 */

export const PIECE_NAMES_EN: Loc<typeof PIECE_NAMES_KO> = { P: 'Pawn', N: 'Knight', B: 'Bishop', R: 'Rook', Q: 'Queen', K: 'King' };

export const MAP_TEXT_EN: Loc<typeof MAP_TEXT_KO> = {
  go: 'Enter',
  node: { battle: 'Match', shop: 'Scrap Dealer', forge: 'Workbench', event: 'Incident', check: 'Checkpoint', boss: 'Foreman', chest: 'Part Crate' },
  legend: { battle: 'Match', shop: 'Dealer', forge: 'Bench', event: 'Incident', check: 'Checkpoint', boss: 'Foreman', chest: 'Crate' },
  nodeDesc: {
    battle: 'Fight a match and earn a card.',
    shop: 'Spend screws on cards, parts and repairs.',
    forge: 'Hone or cut a card, or repair the squad.',
    event: 'No telling what waits inside.',
    check: 'A match against elites. Win to earn a part.',
    boss: 'The end of the line. The foreman waits.',
    chest: 'A locked crate. One part and some screws.',
  },
  acts: ['Casting Line', 'Assembly Line', 'Inspection Line', 'Shipping Gate'],
  actLabel: (n) => (n === 4 ? 'Final Act' : `Act ${n}`),
  form: (name) => `Variant ${name}`,
  stat: { squad: 'Squad', deck: 'Deck', parts: 'Parts', charm: 'Cogs' },
  foes: (n) => `Foes ×${n}`,
  reward: { card: 'Card reward', part: 'Part reward', kit: 'Part reward', recruit: 'Recruit' },
  trait: { blastPawn: 'Blast pawn', rookPlate: 'Shield rook', guard: 'Guard' },
  roster: {
    label: 'Squad status',
    brace: (left, max) => `Grit ${left}/${max}`,
    gear: 'Heart cog intact',
    gearCracked: 'Heart cog cracked',
    king: 'Heart of the squad · if it falls, all ends',
    noQuirk: 'No quirk',
    look: 'Inspect',
  },
};

export const PILE_TEXT_EN: Loc<typeof PILE_TEXT_KO> = {
  name: { deck: 'Deck', crew: 'Squad', discard: 'Discard' },
  aria: {
    deck: (n) => `View deck (${n} cards)`,
    crew: (n) => `View squad (${n})`,
    discard: (n) => `View discards (${n} cards)`,
  },
};

export const FIT_TEXT_EN: Loc<typeof FIT_TEXT_KO> = {
  none: (piece) => `No ${piece} in squad`,
  squad: (piece, n) => `Squad ${piece} <b>${n}</b>`,
  cards: (name, n) => `${name} cards <b>${n}</b>`,
};

export const SET_TEXT_EN: Loc<typeof SET_TEXT_KO> = { title: 'Starting Set', next: 'Other sets', prev: 'Base set' };

export const SCREEN_TEXT_EN: Loc<typeof SCREEN_TEXT_KO> = {
  partPages: 'Owned part pages', partPrev: 'Previous part', partNext: 'Next part',
  reward: 'Spoils', kit: 'Core Part', recruit: 'Recruit', newCrew: 'New Recruit', part: 'Part', partBox: 'Part Crate', partClose: 'Close Call',
  full: 'Slots full', shop: 'Scrap Dealer', forge: 'Workbench', forgeFinal: 'Final Upkeep', refine: 'Hone', brace: 'Brace', remove: 'Scrap a card', deck: 'Deck', crew: 'Squad',
  clear: 'Line Broken', clearWord: 'Passed!', fail: 'Scrapped', actClear: (act) => `${act} done`, actHeal: 'Tune-up', onward: 'Onward',
  pick: 'Choose', skip: 'Skip', stop: 'Stop', leave: 'Leave', buy: 'Buy', meltGo: 'Melt', keep: 'Keep', cut: 'Cut', refineGo: 'Hone', backExit: 'Press again to close the game.', soldWhy: 'Already bought.', shortWhy: (n) => `${n} screws short.`,
  forgeStatus: { refine: 'Cards to hone', deck: 'Deck', cards: '', hp: 'Squad HP', hurt: 'Hurt', noBrace: 'Without grit' },
  braceGo: 'Brace', repair: 'Repair', repairGo: 'Repair',
  braceInfo: (left, max, n) => `Grit ${left}/${max} → <b>${left + n}/${max + n}</b>`,
  repairDone: (name) => `${name}’s armor is hammered flat. (HP full)`, braceDone: (name, n) => `${name}’s axle thickens. (Grit +${n})`,
  close: 'Close', ledger: 'Ledger', overhaul: 'Tune up', note: 'Share result', home: 'Main menu',
  sold: 'Sold', newCrewTag: 'New recruit', bossTag: 'Foreman down', checkTag: 'Checkpoint passed', closeTag: 'One more part', fullHp: 'HP full', broad: 'Three main paths', withHint: 'Tap a stand to see the cards that come with it.', withHead: 'Cards included', deep: (ax) => `${ax} sub-paths`,
  shopHint: 'Tap an item to read about it here.', forgeHint: 'Choose one upkeep.', noCards: 'No cards to choose.',
  melt: (n) => `Melt for ${n} screws`, slots: (n) => `Part slots ${n}`, newPart: (name) => `New: ${name}`,
  clearLine: 'You passed the shipping gate.', failLine: (act) => `Stopped at ${act}.`, opened: 'Unlocked', daily: 'Daily Challenge',
  tally: ['Matches won', 'Kills', 'Screws', 'Deck'],
  price: (n) => `Screws ${n}`, charm: 'Charm', shortMono: (n) => `‘Not enough screws.’ (${n} needed)`,
  cardLine: (name) => `${name} — one copy to deck`, refined: (name) => `${name} — Wind −1`, copies: (n) => `Deck <b>${n}</b>`, apStep: (a, b) => `Wind ${a} → <b>${b}</b>`,
  gain: (n) => `Screws +${n}`, back: (name) => `${name} returns · `, healAll: (pct) => `Whole squad HP +${pct}%`, revived: (name) => `${name} is back.`,
  removed: (name) => `Removed one ${name}.`, cardsN: (n) => `${n} cards`, crewN: (n) => `${n} members`, meltDone: (name, n) => `${name} — melted. (Screws +${n})`,
  crewInfo: (w, p) => `Wins <b>${w}</b> · Guarded <b>${p}</b>`, wallet: (n) => `(purse ${n})`, allSquad: '(whole squad)', parts: 'Parts', nextAct: (label, name) => `Next · ${label} ${name}`, bossWord: 'Felled!',
};

/** 손질 카드 (Upkeep) — 이름은 용어집 §4 하위 낱말 그대로 */
export const SERVICE_CARDS_EN: Loc<typeof SERVICE_CARDS_KO> = {
  kind: 'Upkeep',
  heal: { name: 'Tune-up', desc: (pct) => `Oil the creaking joints. (HP +${pct}% — whole squad)` },
  repair: { name: 'Repair', desc: (pct) => `Hammer out the dents. (${pct >= 100 ? 'HP full' : `HP +${pct}%`} — one member)` },
  refine: { name: 'Hone', desc: () => 'Grind the edge smooth. (Wind −1 — one card)' },
  remove: { name: 'Scrap a card', desc: () => 'Tear up a worn order. (Removed for good — one card)' },
  brace: { name: 'Brace', desc: (n) => `Shrug off one more blow. (Grit +${n} · whole shipment — one member)` },
};

export const SPEED_METER_EN: Loc<typeof SPEED_METER_KO> = {
  label: 'Screws on a win',
  help: (left, per) => `Blitz — after the first turn, one tube goes dark at each turn’s end. Win to get ${left} tubes × ${per} screws.`,
};

export const SAFETY_TEXT_EN: Loc<typeof SAFETY_TEXT_KO> = {
  saveFail: 'Not enough storage. Progress was not saved.',
  newerSave: 'A save from a newer version exists. It is left untouched, and progress here will not be saved.',
  crashTitle: 'Something went wrong.',
  crashBody: 'Your progress remains at the last save.',
  crashAgain: 'The same problem happened again. Try again from the title screen.',
  toMap: 'To map',
  resume: 'Resume',
  home: 'Title',
};

/** 왕관 — 꼬리표 · 별칭 · 끝낸 뒤 부제 (용어집 §4). theme는 이야기 글이라 아직 한국어 */
export const CHAPTERS_EN: readonly Loc<(typeof CHAPTERS_KO)[number]>[] = [
  { label: 'First Crown', alias: 'Paper Crown', name: 'Ignorance and the First Betrayal' },
  { label: 'Second Crown', alias: 'Rusted Spring', name: 'The Pride That Swallowed Another’s Tragedy' },
  { label: 'Third Crown', alias: 'Golden Mercy', name: 'The Holiest Exploitation' },
  { label: 'Fourth Crown', alias: 'Hall of Mirrors', name: 'Seeing, and Release' },
];

export const CAMPAIGN_TEXT_EN: Loc<typeof CAMPAIGN_TEXT_KO> = {
  daily: 'Daily Challenge',
  challenge: (n) => `Challenge ${n}`,
  ending: { throne: 'Succession', depart: 'Crown Destroyed', challenge: 'Challenge Cleared', daily: 'Daily Cleared' },
};

export const EVENT_HINT_EN: Loc<typeof EVENT_HINT_KO> = { again: 'Tap again to choose', leave: 'Leave' };

export const EVENT_UI_EN: Loc<typeof EVENT_UI_KO> = {
  result: 'Result',
  purse: 'Screws',
  info: 'Effect',
  close: 'Close',
  next: 'Next',
  detailAria: 'Choice effect',
  closeAria: 'Close effect note',
  nextAria: 'Next note',
  infoAria: (label) => `${label}: effect`,
  raise: 'Offer',
  pick: 'Choose',
  leave: 'Leave',
  ap: (a, b) => `Wind ${a} → <b>${b}</b>`,
  cost: (n) => `Screws −${n}`,
};

export const EVENT_FX_EN: Loc<typeof EVENT_FX_KO> = {
  pop: {
    goldUp: (n = 0) => `Screws +${n}`,
    goldDown: (n = 0) => `Screws -${n}`,
    life: (n = 1) => `Grit +${n}`,
    crack: () => 'Cog cracked',
    evolve: () => 'Promoted',
    recruit: () => 'Joined',
    die: () => 'Scrapped',
    up: () => 'Wind -1',
    rust: () => 'Wind +1',
    break: () => 'Broken',
    new: () => 'New card',
    part: () => 'Part',
  },
};

export const EVENT_SUM_EN: Loc<typeof EVENT_SUM_KO> = {
  life: (name, n) => `${name} Grit +${n} (survives one killing blow · whole shipment)`,
  crack: (name) => `${name} heart cog cracked (scrapped if it falls again)`,
};

/** 안내서 탭의 「제보」 창 (시험판 기록 — 나머지 시험판 글은 개발용이라 한국어) */
export const PLAYTEST_EN: Loc<typeof PLAYTEST_TEXT_KO> = {
  bug: 'Bug',
  bugTitle: 'Report',
  bugNote: 'The current board (seed, deck, pieces, recent log) is attached. Write one line on what went wrong.',
  bugHint: 'e.g. My bishop hit the target but dealt no damage',
  bugSaved: 'Report saved to the log. Send it along with the log.',
  send: 'Save',
  close: 'Close',
};
