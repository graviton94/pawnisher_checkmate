/**
 * 카드 · 부품 세 갈래 태그 (D-325, 사용자: 「누가 쓰는지 · 어떤 수인지 · 합이냐 곱이냐 — 모든 카드 · 유물에 같은 세 칸」).
 *   누가  = 폰 · 나이트 · 비숍 · 룩 · 퀸 · 킹 · 공용
 *   어떤  = 연쇄(처치를 이어 간다) · 밀치기(밀어 부딪친다) · 수읽기(핀 · 포크 · 체크 같은 체스 수) · 방어(막고 고친다) · 돌격(한 방 치고 들어간다) · 운영(태엽 · 카드 · 나사를 불린다)
 *   효과  = 합(+ 공격에 더한다) · 곱(× 배율) · 그 밖은 하는 일 한 낱말(태엽 · 카드 · 방열 · 회복 · 핀 · 증원 · 충돌 · 이동 …) — D-327: 「규칙」이 154장 중 92장이라 정보가 없었다
 * 예전 「축」(기병 · 보병 · 왕관 · 연쇄 · 밀치기 · 수읽기)은 맞물림 계산에만 남고, 화면에는 이 세 칸만 보인다.
 * 기병 · 보병 · 왕관 축은 「누가」(나이트 · 폰 · 킹)로 옮겨 간다.
 */
import type { PieceType } from '../engine';
import { COMMANDS, type Axis, type CommandId } from './cards';
import { PART_OP, SLICE_PARTS, type SlicePartId } from './parts';

export type Who = PieceType | 'any';
export type Style = 'chain' | 'push' | 'tactic' | 'guard' | 'strike' | 'tempo';
export type Effect = '+' | '×' | 'rule';

export const WHO_NAMES: Record<Who, string> = { P: '폰', N: '나이트', B: '비숍', R: '룩', Q: '퀸', K: '킹', any: '공용' };
export const STYLE_NAMES: Record<Style, string> = { chain: '연쇄', push: '밀치기', tactic: '수읽기', guard: '방어', strike: '돌격', tempo: '운영' };
export const EFFECT_NAMES: Record<Effect, string> = { '+': '합', '×': '곱', rule: '규칙' };

const AXIS_WHO: Partial<Record<Axis, PieceType>> = { cav: 'N', inf: 'P', king: 'K' };
const AXIS_STYLE: Partial<Record<Axis, Style>> = { chain: 'chain', push: 'push', tactic: 'tactic' };
const PIECE_WORD: [RegExp, PieceType][] = [[/폰/, 'P'], [/나이트|기사/, 'N'], [/비숍|사제/, 'B'], [/룩|성벽/, 'R'], [/퀸|여왕/, 'Q'], [/킹|왕/, 'K']];

/** 글에서 「어떤」을 고른다 (축이 연쇄 · 밀치기 · 수읽기가 아닐 때) */
const styleFromText = (t: string): Style =>
  /핀|포크|체크|스큐어|묶|디스커버드|캐슬링|앙파상|수읽기/.test(t) ? 'tactic'
  : /밀|충돌|부딪/.test(t) ? 'push'
  : /공격 [×+]|피해 [×+]|배율/.test(t) ? 'strike'
  : /처치|연쇄/.test(t) ? 'chain'
  : /방열판|HP|문턱|회복|땜질|쇼크|곁에 폰/.test(t) ? 'guard'
  : /태엽|카드|나사|손패|되감기|값/.test(t) ? 'tempo'
  : 'strike';

/** 글에서 합 · 곱을 읽는다 (수치 필드에 없는 배율 — 포크 · 핀 · 디스커버드 ×1.5 같은 것) */
const effectFromText = (t: string): Effect => (/×\s?\d/.test(t) ? '×' : /\(\+\d|공격 \+\d|피해 \+\d/.test(t) ? '+' : 'rule');

/** 합 · 곱이 아닐 때 하는 일 한 낱말 (D-327) */
const wordFromText = (t: string): string =>
  /핀|묶/.test(t) ? '핀' : /포크|두 적/.test(t) ? '포크' : /체크/.test(t) ? '체크' : /캐슬링|자리를 바꾼/.test(t) ? '교대'
  : /곁에 폰|폰 \+1|폰 하나$|폰 하나 |보충/.test(t) ? '증원' : /곁의 폰/.test(t) ? '진격' : /밀|충돌|부딪/.test(t) ? '충돌' : /방열판/.test(t) ? '방열' : /HP|땜질|회복|고친/.test(t) ? '회복'
  : /손패|카드 \+|카드 \d장|카드를/.test(t) ? '카드' : /태엽/.test(t) ? '태엽' : /나사|값/.test(t) ? '나사' : /되감기/.test(t) ? '되감기' : /쇼크/.test(t) ? '면역'
  : /연쇄/.test(t) ? '연쇄' : /전진|진격|앞으로/.test(t) ? '진격' : '이동';
const KIND_WORD: Record<string, string> = { shield: '방열', repair: '회복', draw: '카드', spark: '점화', spend: '방출', draft: '증원', swap: '교대', march: '진격', gambit: '제물' };

/** 카드의 세 칸 */
export const cardTags = (id: CommandId): { who: Who; style: Style; effect: Effect; word: string } => {
  const c = COMMANDS[id];
  const ax = [c.axis, c.axis2].find((a) => a && AXIS_STYLE[a]);
  const style: Style = ax ? AXIS_STYLE[ax]! : c.rage ? 'strike' : c.kind === 'shield' || c.kind === 'repair' || c.kind === 'draft' ? 'guard' : c.kind === 'spark' || c.kind === 'spend' ? 'chain' : c.kind === 'draw' ? 'tempo' : styleFromText(c.desc ?? '');
  const effect: Effect = c.add ? '+' : c.mult || c.multPerKill || c.rage ? '×' : effectFromText(c.desc ?? '');
  const w = effect === 'rule' ? KIND_WORD[c.kind] ?? wordFromText(c.desc ?? '') : '';
  // 「어떤」과 같은 낱말이면 겹치지 않게 (연쇄 · 연쇄 → 연쇄 · 증폭)
  return { who: c.who as Who, style, effect, word: w === STYLE_NAMES[style] ? '증폭' : w };
};

/** 부품의 세 칸 */
export const partTags = (id: SlicePartId): { who: Who; style: Style; effect: Effect; word: string } => {
  const d = SLICE_PARTS[id];
  const fromAxis = d.axis ? AXIS_WHO[d.axis] : undefined;
  // 글에 가장 먼저 나오는 기물 이름 (「적 킹」은 대상이라 빼고) → 없으면 축의 기물 → 없으면 공용. 「모든 · 분대 · 전원」이면 공용
  const text = d.desc.replace(/적 킹|킹은 빼고|킹 곁에/g, '').split('대가:')[0];
  const hits = PIECE_WORD.map(([re, t]) => ({ t, i: text.search(re) })).filter((h) => h.i >= 0).sort((x, y) => x.i - y.i);
  const who: Who = /모든|분대|전원/.test(text) ? 'any' : hits[0]?.t ?? fromAxis ?? 'any';
  const style: Style = d.axis && AXIS_STYLE[d.axis] ? AXIS_STYLE[d.axis]! : styleFromText(d.desc);
  const op = PART_OP[id];
  const effect = op ?? effectFromText(d.desc);
  const w = effect === 'rule' ? wordFromText(text) : '';
  return { who, style, effect, word: w === STYLE_NAMES[style] ? '증폭' : w };
};

/** 세 칸 칩 HTML (카드 얼굴 · 부품 얼굴 · 확인 창이 같이 쓴다) */
export const tags3Html = (t: { who: Who; style: Style; effect: Effect; word?: string }): string =>
  `<span class="t3"><i class="t3-who">${WHO_NAMES[t.who]}</i><i class="t3-sty sty-${t.style}">${STYLE_NAMES[t.style]}</i><i class="t3-fx fx-${t.effect === '+' ? 'add' : t.effect === '×' ? 'mul' : 'rule'}">${t.effect === 'rule' ? t.word || '규칙' : t.effect}</i></span>`;
